import { existsSync, readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import {
  addDaysToDateKey,
  bookingConfig,
  bookingOwnerEmail,
  bookingWhatsappNumber,
  buildSlotDisplay,
  createBookingReference,
  createIcsEvent,
  dateKeyInTimeZone,
  dateKeyIsWorkingDay,
  slotId,
  zonedTimeToUtc,
} from "../src/config/booking-runtime.mjs";

const activeStatuses = ["new", "confirmed"];
const rateLimitWindowMs = 60_000;
const rateLimitMax = 18;
const rateBuckets = new Map();
const unavailableMessage = "Booking is temporarily unavailable.";

export function loadDotEnv() {
  if (!existsSync(".env")) return;
  const lines = readFileSync(".env", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = valueParts.join("=").replace(/^"|"$/g, "");
    }
  }
}

loadDotEnv();

class ApiError extends Error {
  constructor(statusCode, message, code = "booking_error") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function getHeader(headers, name) {
  if (!headers) return "";
  const lowerName = name.toLowerCase();
  if (typeof headers.get === "function") return headers.get(name) || "";
  return headers[name] || headers[lowerName] || "";
}

function getAllowedOrigin(origin = "") {
  const configured = [process.env.VOYD_ALLOWED_ORIGIN, process.env.VOYD_PUBLIC_URL]
    .filter(Boolean)
    .map((value) => String(value).replace(/\/$/, ""));
  const allowed = new Set(["http://127.0.0.1:5173", "http://localhost:5173", ...configured]);
  const normalizedOrigin = String(origin || "").replace(/\/$/, "");
  if (normalizedOrigin && allowed.has(normalizedOrigin)) return normalizedOrigin;
  return configured[0] || "http://127.0.0.1:5173";
}

function response(status, body, origin) {
  return {
    status,
    body,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": getAllowedOrigin(origin),
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Vary": "Origin",
    },
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripControl(value = "") {
  return String(value).replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

function limitString(value, max, label) {
  const cleaned = stripControl(value);
  if (cleaned.length > max) throw new ApiError(400, `${label} is too long.`, "invalid_length");
  return cleaned;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

async function parseBody(input) {
  if (!input) return {};
  if (typeof input === "object" && !Buffer.isBuffer(input)) return input;
  const raw = Buffer.isBuffer(input) ? input.toString("utf8") : String(input);
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Please refresh the page and try again.", "invalid_json");
  }
}

function checkRateLimit(ip, route) {
  const key = `${ip || "unknown"}:${route}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + rateLimitWindowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + rateLimitWindowMs;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (bucket.count > rateLimitMax) {
    throw new ApiError(429, "Too many booking attempts. Please wait a minute and try again.", "rate_limited");
  }
}

function supabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

function hasProductionBookingConfig() {
  const config = supabaseConfig();
  return Boolean(config.url && config.serviceKey && process.env.RESEND_API_KEY);
}

function ensureProductionBookingConfig() {
  if (!hasProductionBookingConfig()) {
    throw new ApiError(503, unavailableMessage, "booking_unavailable");
  }
}

async function supabaseRest(path, options = {}) {
  const { url, serviceKey } = supabaseConfig();
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 409 || data?.code === "23505") {
      throw new ApiError(409, "This time was just booked. Please choose another available time.", "slot_conflict");
    }
    throw new ApiError(503, unavailableMessage, "storage_unavailable");
  }
  return data;
}

function phoneToWhatsappUrl(phone = "") {
  const digits = String(phone).replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "https://wa.me/4917686606120";
}

function brandedEmail(title, intro, body) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#05060a;color:#f7f8fb;padding:28px">
      <div style="max-width:760px;margin:0 auto;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:#0a0d14;overflow:hidden">
        <div style="padding:22px;border-bottom:1px solid rgba(255,255,255,.12)">
          <div style="font-size:13px;letter-spacing:.16em;color:#00e5ff;font-weight:800">VOYD</div>
          <h1 style="margin:10px 0 0;font-size:26px">${escapeHtml(title)}</h1>
        </div>
        <div style="padding:22px;color:#c2cad8;line-height:1.65">
          <p>${escapeHtml(intro)}</p>
          ${body}
        </div>
      </div>
    </div>`;
}

function rows(payload) {
  return `<table style="width:100%;border-collapse:collapse">${Object.entries(payload)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => {
      const renderedValue = typeof value === "object" && value && "html" in value ? value.html : `<strong>${escapeHtml(value)}</strong>`;
      return `<tr><td style="width:220px;padding:7px 10px;color:#7c8799">${escapeHtml(key)}</td><td style="padding:7px 10px">${renderedValue}</td></tr>`;
    })
    .join("")}</table>`;
}

async function sendOwnerBookingEmail(booking, slot, meta, ics) {
  const display = buildSlotDisplay(slot.startsAt, booking.visitor_timezone);
  const subject = `New VOYD Call - ${booking.selected_product} - ${display.berlinDate} at ${display.berlinTime}`;
  const html = brandedEmail(
    "New VOYD discovery call request",
    "A visitor reserved a VOYD discovery call slot. The full booking context is below.",
    rows({
      "Booking reference": booking.booking_reference,
      "Full name": booking.full_name,
      "Work email": { html: `<a style="color:#00e5ff" href="mailto:${escapeHtml(booking.work_email)}">${escapeHtml(booking.work_email)}</a>` },
      "WhatsApp": { html: `<a style="color:#00e5ff" href="${escapeHtml(phoneToWhatsappUrl(booking.phone_or_whatsapp))}">${escapeHtml(booking.phone_or_whatsapp)}</a>` },
      Company: booking.company,
      "Business type": booking.business_type,
      "Company size": booking.company_size,
      "Selected product": booking.selected_product,
      "Meeting topic": booking.meeting_topic,
      "Preferred contact method": booking.preferred_contact_method,
      "Additional message": booking.additional_message,
      "Europe/Berlin time": display.berlinDateTime,
      "Visitor local time": display.visitorDateTime,
      "Visitor timezone": booking.visitor_timezone,
      "UTC timestamp": booking.starts_at,
      Duration: `${bookingConfig.durationMinutes} minutes`,
      "Source page": meta.sourcePage,
      Referrer: meta.referrer,
      "Submission timestamp": meta.timestamp,
    }),
  );

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.VOYD_FROM_EMAIL || `VOYD <${bookingOwnerEmail}>`,
      to: process.env.VOYD_LEADS_EMAIL || bookingOwnerEmail,
      subject,
      html,
      attachments: [{ filename: "voyd-discovery.ics", content: Buffer.from(ics).toString("base64") }],
    }),
  });
  if (!resendResponse.ok) {
    throw new ApiError(503, unavailableMessage, "notification_unavailable");
  }
}

function generateAvailabilitySkeleton(visitorTimeZone, now = new Date()) {
  const startDateKey = dateKeyInTimeZone(now, bookingConfig.timezone);
  const minimumStart = new Date(now.getTime() + bookingConfig.minimumNoticeHours * 60 * 60 * 1000);
  const dates = [];
  for (let offset = 0; offset < bookingConfig.bookingWindowDays; offset += 1) {
    const dateKey = addDaysToDateKey(startDateKey, offset);
    if (!dateKeyIsWorkingDay(dateKey)) continue;
    const slots = bookingConfig.dailySlots
      .map((slotTime) => {
        const start = zonedTimeToUtc(dateKey, slotTime, bookingConfig.timezone);
        const end = new Date(start.getTime() + bookingConfig.durationMinutes * 60 * 1000);
        if (start.getTime() <= minimumStart.getTime()) return null;
        const display = buildSlotDisplay(start.toISOString(), visitorTimeZone);
        return {
          id: slotId(dateKey, slotTime),
          dateKey,
          slotTime,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          status: "available",
          visitor: {
            timezone: visitorTimeZone,
            date: display.visitorDate,
            time: display.visitorTime,
            dateTime: display.visitorDateTime,
          },
          berlin: {
            timezone: bookingConfig.timezone,
            date: display.berlinDate,
            time: display.berlinTime,
            dateTime: display.berlinDateTime,
          },
        };
      })
      .filter(Boolean);
    if (!slots.length) continue;
    dates.push({
      dateKey,
      berlinDate: slots[0].berlin.date,
      visitorDate: [...new Set(slots.map((slot) => slot.visitor.date))].join(" / "),
      fullyBooked: false,
      remainingSlots: slots.length,
      slots,
    });
  }
  return dates;
}

function validateVisitorTimezone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}

async function getAvailability(visitorTimeZone = "UTC") {
  const timezone = validateVisitorTimezone(visitorTimeZone);
  if (!hasProductionBookingConfig()) {
    return {
      ok: true,
      available: false,
      message: unavailableMessage,
      timezone: bookingConfig.timezone,
      visitorTimeZone: timezone,
      durationMinutes: bookingConfig.durationMinutes,
      dates: [],
    };
  }

  const dates = generateAvailabilitySkeleton(timezone);
  const firstSlot = dates[0]?.slots[0];
  const lastDate = dates[dates.length - 1];
  const lastSlot = lastDate?.slots[lastDate.slots.length - 1];
  if (!firstSlot || !lastSlot) {
    return {
      ok: true,
      available: true,
      timezone: bookingConfig.timezone,
      visitorTimeZone: timezone,
      durationMinutes: bookingConfig.durationMinutes,
      dates: [],
    };
  }

  const from = encodeURIComponent(firstSlot.startsAt);
  const to = encodeURIComponent(lastSlot.endsAt);
  const dateFrom = encodeURIComponent(dates[0].dateKey);
  const dateTo = encodeURIComponent(lastDate.dateKey);
  const bookingFilter = `bookings?select=id,booking_reference,starts_at,status&starts_at=gte.${from}&starts_at=lte.${to}&status=in.(${activeStatuses.join(",")})`;
  const blockFilter = `booking_availability_blocks?select=*&block_date=gte.${dateFrom}&block_date=lte.${dateTo}`;
  const [bookings, blocks] = await Promise.all([supabaseRest(bookingFilter), supabaseRest(blockFilter)]);
  const bookedTimes = new Set((bookings || []).map((booking) => new Date(booking.starts_at).getTime()));

  const hydratedDates = dates.map((date) => {
    const dateBlocked = (blocks || []).some((block) => block.block_type === "date" && block.block_date === date.dateKey);
    const slots = date.slots.map((slot) => {
      const slotBlocked =
        dateBlocked ||
        (blocks || []).some((block) => block.block_type === "slot" && block.block_date === date.dateKey && block.slot_time === slot.slotTime);
      const booked = bookedTimes.has(new Date(slot.startsAt).getTime());
      const status = booked ? "booked" : slotBlocked ? "blocked" : "available";
      return { ...slot, status };
    });
    const remainingSlots = slots.filter((slot) => slot.status === "available").length;
    return { ...date, slots, remainingSlots, fullyBooked: remainingSlots === 0 };
  });

  return {
    ok: true,
    available: true,
    timezone: bookingConfig.timezone,
    visitorTimeZone: timezone,
    durationMinutes: bookingConfig.durationMinutes,
    generatedAt: new Date().toISOString(),
    dates: hydratedDates,
  };
}

function normalizeBookingPayload(payload) {
  if (payload.honeypot) throw new ApiError(400, "Please refresh the page and try again.", "spam_protection");
  if (!payload.consent) throw new ApiError(400, "Please accept contact consent before submitting.", "consent_required");
  const normalized = {
    fullName: limitString(payload.fullName, 120, "Full name"),
    workEmail: limitString(payload.workEmail, 160, "Work email"),
    phoneOrWhatsapp: limitString(payload.phoneOrWhatsapp, 80, "Phone or WhatsApp"),
    company: limitString(payload.company, 140, "Company"),
    businessType: limitString(payload.businessType, 90, "Business type"),
    companySize: limitString(payload.companySize, 40, "Company size"),
    selectedProduct: limitString(payload.selectedProduct, 120, "Selected product"),
    meetingTopic: limitString(payload.meetingTopic, 180, "Meeting topic"),
    preferredContactMethod: limitString(payload.preferredContactMethod, 20, "Preferred contact method"),
    additionalMessage: limitString(payload.additionalMessage || "", 1200, "Additional message"),
    dateKey: limitString(payload.dateKey, 20, "Selected date"),
    slotTime: limitString(payload.slotTime, 12, "Selected time"),
    visitorTimeZone: validateVisitorTimezone(limitString(payload.visitorTimeZone || "UTC", 80, "Visitor timezone")),
    sourcePage: limitString(payload.sourcePage || "", 300, "Source page"),
    referrer: limitString(payload.referrer || "", 300, "Referrer"),
  };
  const required = [
    ["fullName", "Full name"],
    ["workEmail", "Work email"],
    ["phoneOrWhatsapp", "Phone or WhatsApp"],
    ["company", "Company"],
    ["businessType", "Business type"],
    ["companySize", "Company size"],
    ["selectedProduct", "Selected product"],
    ["meetingTopic", "Meeting topic"],
    ["preferredContactMethod", "Preferred contact method"],
    ["dateKey", "Selected date"],
    ["slotTime", "Selected time"],
  ];
  const missing = required.filter(([key]) => !normalized[key]).map(([, label]) => label);
  if (missing.length) throw new ApiError(400, `Please complete: ${missing.join(", ")}.`, "missing_fields");
  if (!validateEmail(normalized.workEmail)) throw new ApiError(400, "Please enter a valid work email.", "invalid_email");
  if (!["Email", "WhatsApp"].includes(normalized.preferredContactMethod)) {
    throw new ApiError(400, "Choose Email or WhatsApp as your preferred communication method.", "invalid_contact_method");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.dateKey)) throw new ApiError(400, "Please choose an available date.", "invalid_date");
  if (!dateKeyIsWorkingDay(normalized.dateKey)) throw new ApiError(400, "Please choose a Monday through Saturday slot.", "unavailable_date");
  if (!bookingConfig.dailySlots.includes(normalized.slotTime)) {
    throw new ApiError(400, "Please choose one of the available VOYD times.", "invalid_slot");
  }
  return normalized;
}

async function ensureSlotAvailable(normalized) {
  const availability = await getAvailability(normalized.visitorTimeZone);
  if (!availability.available) throw new ApiError(503, unavailableMessage, "booking_unavailable");
  const slot = availability.dates
    .flatMap((date) => date.slots)
    .find((item) => item.dateKey === normalized.dateKey && item.slotTime === normalized.slotTime);
  if (!slot || slot.status !== "available") {
    throw new ApiError(409, "This time was just booked. Please choose another available time.", "slot_conflict");
  }
  return slot;
}

async function insertBooking(normalized, slot, meta) {
  const record = {
    booking_reference: createBookingReference(),
    starts_at: slot.startsAt,
    ends_at: slot.endsAt,
    voyd_timezone: bookingConfig.timezone,
    visitor_timezone: normalized.visitorTimeZone,
    full_name: normalized.fullName,
    work_email: normalized.workEmail,
    phone_or_whatsapp: normalized.phoneOrWhatsapp,
    company: normalized.company,
    business_type: normalized.businessType,
    company_size: normalized.companySize,
    selected_product: normalized.selectedProduct,
    meeting_topic: normalized.meetingTopic,
    preferred_contact_method: normalized.preferredContactMethod,
    additional_message: normalized.additionalMessage,
    status: "new",
    source_page: meta.sourcePage,
    referrer: meta.referrer,
  };
  const result = await supabaseRest("bookings?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(record),
  });
  return result?.[0];
}

async function cancelBookingAfterNotificationFailure(bookingId) {
  if (!bookingId) return;
  await supabaseRest(`bookings?id=eq.${encodeURIComponent(bookingId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "cancelled",
      private_notes: `Owner notification failed at ${new Date().toISOString()}.`,
      updated_at: new Date().toISOString(),
    }),
  }).catch(() => null);
}

async function submitBooking(payload, meta) {
  const normalized = normalizeBookingPayload(payload);
  ensureProductionBookingConfig();
  const slot = await ensureSlotAvailable(normalized);
  const booking = await insertBooking(normalized, slot, meta);
  const ics = createIcsEvent({
    reference: booking.booking_reference,
    fullName: booking.full_name,
    email: booking.work_email,
    selectedProduct: booking.selected_product,
    meetingTopic: booking.meeting_topic,
    startsAtIso: booking.starts_at,
  });
  try {
    await sendOwnerBookingEmail(booking, slot, meta, ics);
  } catch (error) {
    await cancelBookingAfterNotificationFailure(booking.id);
    throw error;
  }

  const display = buildSlotDisplay(booking.starts_at, booking.visitor_timezone);
  return {
    ok: true,
    booking: {
      bookingReference: booking.booking_reference,
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      selectedProduct: booking.selected_product,
      preferredContactMethod: booking.preferred_contact_method,
      visitorTimezone: booking.visitor_timezone,
      visitorDate: display.visitorDate,
      visitorTime: display.visitorTime,
      berlinDateTime: display.berlinDateTime,
      durationMinutes: bookingConfig.durationMinutes,
    },
    ics,
    message: "Your selected time has been reserved. VOYD will confirm the call using your preferred contact method.",
  };
}

function requestMeta(payload = {}) {
  return {
    timestamp: new Date().toISOString(),
    sourcePage: limitString(payload.sourcePage || "", 300, "Source page"),
    browserLanguage: limitString(payload.browserLanguage || "", 80, "Browser language"),
    referrer: limitString(payload.referrer || "", 300, "Referrer"),
  };
}

export async function handleVoydApi({ method, url, headers, body, ip = "" }) {
  const origin = getHeader(headers, "origin");
  try {
    const requestUrl = new URL(url || "/", "http://127.0.0.1");
    const pathname = requestUrl.pathname;
    if (method === "OPTIONS") return response(200, { ok: true }, origin);
    if (pathname !== "/api/booking") return response(404, { ok: false, error: "Not found" }, origin);
    checkRateLimit(ip, pathname);

    if (method === "GET") {
      const visitorTimeZone = requestUrl.searchParams.get("visitorTimeZone") || "UTC";
      return response(200, await getAvailability(visitorTimeZone), origin);
    }

    if (method === "POST") {
      const payload = await parseBody(body);
      return response(200, await submitBooking(payload, requestMeta(payload)), origin);
    }

    return response(405, { ok: false, error: "Method not allowed" }, origin);
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) console.error("[VOYD booking error]", { code: error.code, status });
    return response(status, { ok: false, error: error.message || unavailableMessage, code: error.code || "booking_error" }, origin);
  }
}
