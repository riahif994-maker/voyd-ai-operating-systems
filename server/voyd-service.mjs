import { existsSync, readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import {
  addDaysToDateKey,
  bookingConfig,
  bookingOwnerEmail,
  bookingStatuses,
  bookingWhatsappNumber,
  buildSlotDisplay,
  createBookingReference,
  createIcsEvent,
  dateKeyInTimeZone,
  dateKeyIsWorkingDay,
  formatDateOnlyInZone,
  formatTimeOnlyInZone,
  slotId,
  zonedTimeToUtc,
} from "../src/config/booking-runtime.mjs";

const activeStatuses = ["new", "confirmed"];
const contactReplyExpectation = "Our team usually replies within one business day.";
const rateLimitWindowMs = 60_000;
const rateLimitMax = 18;
const rateBuckets = new Map();

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
  constructor(statusCode, message, code = "api_error") {
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
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Vary": "Origin",
    },
  };
}

export function escapeHtml(value = "") {
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

function maskEmail(email = "") {
  const [name, domain] = String(email).split("@");
  if (!domain) return email;
  return `${name.slice(0, 2)}***@${domain}`;
}

function phoneToWhatsappUrl(phone = "") {
  const digits = String(phone).replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "https://wa.me/4917686606120";
}

async function parseBody(input) {
  if (!input) return {};
  if (typeof input === "object" && !Buffer.isBuffer(input)) return input;
  const raw = Buffer.isBuffer(input) ? input.toString("utf8") : String(input);
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.", "invalid_json");
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
    throw new ApiError(429, "Too many requests. Please wait a minute and try again.", "rate_limited");
  }
}

function supabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
  };
}

function hasSupabaseConfig() {
  const config = supabaseConfig();
  return Boolean(config.url && config.serviceKey);
}

function ensureSupabaseConfig() {
  if (!hasSupabaseConfig()) {
    throw new ApiError(503, "Booking database is not configured.", "missing_database_configuration");
  }
}

async function supabaseRest(path, options = {}) {
  const { url, serviceKey } = supabaseConfig();
  ensureSupabaseConfig();
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.hint || `Supabase request failed with ${response.status}`;
    if (response.status === 409 || data?.code === "23505") {
      throw new ApiError(409, "This time was just booked. Please choose another available time.", "slot_conflict");
    }
    throw new ApiError(response.status, message, "database_failure");
  }
  return data;
}

async function verifyAdmin(headers) {
  const { url, serviceKey, anonKey } = supabaseConfig();
  ensureSupabaseConfig();
  const token = getHeader(headers, "authorization").replace(/^Bearer\s+/i, "");
  if (!token) throw new ApiError(401, "Admin authentication is required.", "admin_auth_required");
  const authResponse = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: anonKey || serviceKey,
      Authorization: `Bearer ${token}`,
    },
  });
  const user = await authResponse.json().catch(() => ({}));
  if (!authResponse.ok || !user.email) {
    throw new ApiError(401, "Admin session is invalid or expired.", "admin_auth_invalid");
  }
  if (String(user.email).toLowerCase() !== bookingOwnerEmail) {
    throw new ApiError(403, "This admin area is restricted to the VOYD owner.", "admin_forbidden");
  }
  return user;
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

async function sendResendEmail(email) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.VOYD_FROM_EMAIL || `VOYD <${bookingOwnerEmail}>`;
  if (!apiKey) {
    throw new ApiError(503, "Email provider is not configured.", "missing_email_configuration");
  }

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, ...email }),
  });
  const data = await resendResponse.json().catch(() => ({}));
  if (!resendResponse.ok) {
    throw new ApiError(502, data?.message || `Resend failed with ${resendResponse.status}`, "email_provider_failure");
  }
  return { delivered: true, id: data.id };
}

function safeLog(type, payload, meta) {
  console.info(`[VOYD ${type}]`, {
    fullName: payload.fullName,
    email: maskEmail(payload.workEmail || payload.email),
    company: payload.company,
    selectedProduct: payload.selectedProduct,
    timestamp: meta.timestamp,
    sourcePage: meta.sourcePage,
  });
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
          booked: false,
          blocked: false,
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
    const visitorDates = [...new Set(slots.map((slot) => slot.visitor.date))];
    dates.push({
      dateKey,
      berlinDate: slots[0].berlin.date,
      visitorDate: visitorDates.join(" / "),
      fullyBooked: false,
      remainingSlots: slots.length,
      slots,
    });
  }
  return dates;
}

async function queryBookingState(dates) {
  if (!hasSupabaseConfig() || !dates.length) {
    return { bookings: [], blocks: [], configured: false };
  }
  const firstSlot = dates[0].slots[0];
  const lastDate = dates[dates.length - 1];
  const lastSlot = lastDate.slots[lastDate.slots.length - 1];
  const from = encodeURIComponent(firstSlot.startsAt);
  const to = encodeURIComponent(lastSlot.endsAt);
  const dateFrom = encodeURIComponent(dates[0].dateKey);
  const dateTo = encodeURIComponent(lastDate.dateKey);
  const bookingFilter = `bookings?select=id,booking_reference,starts_at,status&starts_at=gte.${from}&starts_at=lte.${to}&status=in.(${activeStatuses.join(",")})`;
  const blockFilter = `booking_availability_blocks?select=*&block_date=gte.${dateFrom}&block_date=lte.${dateTo}`;
  const [bookings, blocks] = await Promise.all([supabaseRest(bookingFilter), supabaseRest(blockFilter)]);
  return { bookings: bookings || [], blocks: blocks || [], configured: true };
}

export async function getAvailability(visitorTimeZone = "UTC") {
  let timezone = visitorTimeZone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    timezone = "UTC";
  }
  const dates = generateAvailabilitySkeleton(timezone);
  const state = await queryBookingState(dates);
  const bookedTimes = new Set(state.bookings.map((booking) => new Date(booking.starts_at).getTime()));
  const blocks = state.blocks || [];
  const hydratedDates = dates.map((date) => {
    const dateBlocked = blocks.some((block) => block.block_type === "date" && block.block_date === date.dateKey);
    const slots = date.slots.map((slot) => {
      const slotBlocked =
        dateBlocked ||
        blocks.some((block) => block.block_type === "slot" && block.block_date === date.dateKey && block.slot_time === slot.slotTime);
      const booked = bookedTimes.has(new Date(slot.startsAt).getTime());
      const status = booked ? "booked" : slotBlocked ? "blocked" : "available";
      return { ...slot, status, booked, blocked: slotBlocked };
    });
    const remainingSlots = slots.filter((slot) => slot.status === "available").length;
    return {
      ...date,
      slots,
      remainingSlots,
      fullyBooked: remainingSlots === 0,
    };
  });
  return {
    ok: true,
    configured: state.configured,
    timezone: bookingConfig.timezone,
    visitorTimeZone: timezone,
    durationMinutes: bookingConfig.durationMinutes,
    minimumNoticeHours: bookingConfig.minimumNoticeHours,
    generatedAt: new Date().toISOString(),
    dates: hydratedDates,
  };
}

function validateVisitorTimezone(timeZone) {
  const fallback = "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return fallback;
  }
}

function normalizeBookingPayload(payload) {
  if (payload.honeypot) throw new ApiError(400, "Spam protection triggered.", "spam_protection");
  if (!payload.consent) throw new ApiError(400, "Consent is required before submitting.", "consent_required");
  const normalized = {
    fullName: limitString(payload.fullName, 120, "Full name"),
    workEmail: limitString(payload.workEmail || payload.email, 160, "Work email"),
    phoneOrWhatsapp: limitString(payload.phoneOrWhatsapp || payload.phone, 80, "Phone or WhatsApp"),
    company: limitString(payload.company, 140, "Company"),
    businessType: limitString(payload.businessType, 90, "Business type"),
    companySize: limitString(payload.companySize, 40, "Company size"),
    selectedProduct: limitString(payload.selectedProduct, 120, "Selected product"),
    meetingTopic: limitString(payload.meetingTopic, 180, "Meeting topic"),
    preferredContactMethod: limitString(payload.preferredContactMethod || payload.preferredContact, 20, "Preferred contact method"),
    additionalMessage: limitString(payload.additionalMessage || "", 1200, "Additional message"),
    dateKey: limitString(payload.dateKey, 20, "Selected date"),
    slotTime: limitString(payload.slotTime, 12, "Selected time"),
    visitorTimeZone: validateVisitorTimezone(limitString(payload.visitorTimeZone || payload.timeZone || "UTC", 80, "Visitor timezone")),
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
  if (missing.length) throw new ApiError(400, `Missing booking fields: ${missing.join(", ")}`, "missing_fields");
  if (!validateEmail(normalized.workEmail)) throw new ApiError(400, "Enter a valid work email.", "invalid_email");
  if (!["Email", "WhatsApp"].includes(normalized.preferredContactMethod)) {
    throw new ApiError(400, "Preferred contact method must be Email or WhatsApp.", "invalid_contact_method");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.dateKey)) throw new ApiError(400, "Selected date is invalid.", "invalid_date");
  if (!dateKeyIsWorkingDay(normalized.dateKey)) throw new ApiError(400, "Sunday is unavailable. Please choose Monday through Saturday.", "sunday_unavailable");
  if (!bookingConfig.dailySlots.includes(normalized.slotTime)) {
    throw new ApiError(400, "Selected time is not an official VOYD slot.", "invalid_slot");
  }
  return normalized;
}

async function ensureSlotAvailable(normalized) {
  const availability = await getAvailability(normalized.visitorTimeZone);
  const slot = availability.dates.flatMap((date) => date.slots).find((item) => item.dateKey === normalized.dateKey && item.slotTime === normalized.slotTime);
  if (!slot) throw new ApiError(400, "Selected slot is no longer available.", "invalid_or_past_slot");
  if (slot.status !== "available") {
    throw new ApiError(409, "This time was just booked. Please choose another available time.", "slot_conflict");
  }
  return slot;
}

async function insertBooking(normalized, slot, meta) {
  const reference = createBookingReference();
  const record = {
    booking_reference: reference,
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
  return result?.[0] || { ...record, id: "", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
}

async function updateBookingRecord(id, patch) {
  return supabaseRest(`bookings?id=eq.${encodeURIComponent(id)}&select=*`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

function bookingNotificationEmail(booking, slot, meta) {
  const display = buildSlotDisplay(slot.startsAt, booking.visitor_timezone);
  const adminUrl = `${(process.env.VOYD_PUBLIC_URL || "http://127.0.0.1:5173").replace(/\/$/, "")}/admin/bookings`;
  const subject = `New VOYD Call \u2014 ${booking.selected_product} \u2014 ${display.berlinDate} at ${display.berlinTime}`;
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
      "Private admin booking page": { html: `<a style="color:#00e5ff" href="${escapeHtml(adminUrl)}">${escapeHtml(adminUrl)}</a>` },
    }),
  );
  return { subject, html };
}

export async function submitBooking(payload, meta) {
  const normalized = normalizeBookingPayload(payload);
  ensureSupabaseConfig();
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
    const notification = bookingNotificationEmail(booking, slot, meta);
    await sendResendEmail({
      to: bookingOwnerEmail,
      subject: notification.subject,
      html: notification.html,
      attachments: [{ filename: "voyd-discovery.ics", content: Buffer.from(ics).toString("base64") }],
    });
  } catch (error) {
    await updateBookingRecord(booking.id, {
      status: "cancelled",
      private_notes: `Automatic cancellation: owner notification failed at ${new Date().toISOString()}.`,
    }).catch(() => null);
    throw error;
  }
  safeLog("booking-confirmed", { ...normalized, workEmail: normalized.workEmail }, meta);
  const display = buildSlotDisplay(booking.starts_at, booking.visitor_timezone);
  return {
    ok: true,
    delivered: true,
    booking: {
      id: booking.id,
      bookingReference: booking.booking_reference,
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      selectedProduct: booking.selected_product,
      preferredContactMethod: booking.preferred_contact_method,
      visitorTimezone: booking.visitor_timezone,
      visitorDate: display.visitorDate,
      visitorTime: display.visitorTime,
      berlinDateTime: display.berlinDateTime,
      berlinDate: display.berlinDate,
      berlinTime: display.berlinTime,
      durationMinutes: bookingConfig.durationMinutes,
    },
    ics,
    message: "Your selected time has been reserved. VOYD will confirm the call using your preferred contact method.",
  };
}

function validateLead(payload) {
  const lead = {
    fullName: limitString(payload.fullName, 120, "Full name"),
    email: limitString(payload.email, 160, "Work email"),
    company: limitString(payload.company, 140, "Company"),
    phone: limitString(payload.phone || "", 80, "Phone"),
    businessType: limitString(payload.businessType, 90, "Business type"),
    companySize: limitString(payload.companySize, 40, "Company size"),
    selectedProduct: limitString(payload.selectedProduct, 120, "Selected product"),
    budgetRange: limitString(payload.budgetRange, 60, "Budget range"),
    preferredContact: limitString(payload.preferredContact, 20, "Preferred contact method"),
    message: limitString(payload.message, 1200, "Message"),
  };
  const required = ["fullName", "email", "company", "businessType", "companySize", "selectedProduct", "budgetRange", "preferredContact", "message"];
  const missing = required.filter((field) => !lead[field]);
  if (missing.length) throw new ApiError(400, `Missing required fields: ${missing.join(", ")}`, "missing_fields");
  if (!validateEmail(lead.email)) throw new ApiError(400, "Enter a valid work email.", "invalid_email");
  if (!payload.consent) throw new ApiError(400, "Consent is required before submitting.", "consent_required");
  if (payload.honeypot) throw new ApiError(400, "Spam protection triggered.", "spam_protection");
  return lead;
}

async function submitLead(payload, meta) {
  const lead = validateLead(payload);
  const ownerBody = brandedEmail(
    "New VOYD sales lead",
    "A prospect submitted the Contact Sales form.",
    rows({ ...lead, "Source page": meta.sourcePage, Referrer: meta.referrer, "Submission timestamp": meta.timestamp }),
  );
  await sendResendEmail({
    to: bookingOwnerEmail,
    subject: `VOYD lead: ${lead.company} - ${lead.selectedProduct}`,
    html: ownerBody,
  });
  safeLog("lead-confirmed", { ...lead, workEmail: lead.email }, meta);
  return {
    ok: true,
    delivered: true,
    message: `Request sent. ${contactReplyExpectation}`,
  };
}

async function listAdminBookings(headers) {
  await verifyAdmin(headers);
  const [bookings, blocks] = await Promise.all([
    supabaseRest("bookings?select=*&order=starts_at.asc"),
    supabaseRest("booking_availability_blocks?select=*&order=block_date.asc,slot_time.asc"),
  ]);
  return { ok: true, bookings: bookings || [], blocks: blocks || [], owner: bookingOwnerEmail };
}

async function updateAdminBooking(headers, payload) {
  await verifyAdmin(headers);
  const id = limitString(payload.id, 80, "Booking id");
  const action = limitString(payload.action, 40, "Action");
  if (!id) throw new ApiError(400, "Booking id is required.", "missing_booking_id");
  if (action === "status") {
    const status = limitString(payload.status, 20, "Status");
    if (!bookingStatuses.includes(status)) throw new ApiError(400, "Invalid booking status.", "invalid_status");
    const updated = await updateBookingRecord(id, { status });
    return { ok: true, booking: updated?.[0] };
  }
  if (action === "notes") {
    const notes = limitString(payload.privateNotes || "", 1800, "Private notes");
    const updated = await updateBookingRecord(id, { private_notes: notes });
    return { ok: true, booking: updated?.[0] };
  }
  throw new ApiError(400, "Unsupported admin action.", "invalid_admin_action");
}

function validateBlockPayload(payload) {
  const blockDate = limitString(payload.blockDate, 20, "Block date");
  const slotTime = limitString(payload.slotTime || "", 12, "Slot time");
  const reason = limitString(payload.reason || "", 400, "Block reason");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(blockDate)) throw new ApiError(400, "Block date is invalid.", "invalid_date");
  if (!dateKeyIsWorkingDay(blockDate)) throw new ApiError(400, "Only Monday through Saturday can be blocked.", "invalid_block_date");
  if (slotTime && !bookingConfig.dailySlots.includes(slotTime)) throw new ApiError(400, "Blocked slot must be 10:00 or 22:00 Berlin time.", "invalid_block_slot");
  return { blockDate, slotTime, reason };
}

async function createAdminBlock(headers, payload) {
  const user = await verifyAdmin(headers);
  const block = validateBlockPayload(payload);
  const record = {
    block_type: block.slotTime ? "slot" : "date",
    block_date: block.blockDate,
    slot_time: block.slotTime || null,
    reason: block.reason,
    created_by: user.email,
  };
  const inserted = await supabaseRest("booking_availability_blocks?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(record),
  });
  return { ok: true, block: inserted?.[0] };
}

async function deleteAdminBlock(headers, payload) {
  await verifyAdmin(headers);
  const id = limitString(payload.id, 80, "Block id");
  if (!id) throw new ApiError(400, "Block id is required.", "missing_block_id");
  await supabaseRest(`booking_availability_blocks?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  return { ok: true };
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
    checkRateLimit(ip, pathname);

    if (method === "GET" && pathname === "/api/availability") {
      const visitorTimeZone = requestUrl.searchParams.get("visitorTimeZone") || "UTC";
      return response(200, await getAvailability(visitorTimeZone), origin);
    }

    const payload = await parseBody(body);
    const meta = requestMeta(payload);

    if (method === "POST" && pathname === "/api/contact") {
      return response(200, await submitLead(payload, meta), origin);
    }

    if (method === "POST" && pathname === "/api/booking") {
      return response(200, await submitBooking(payload, meta), origin);
    }

    if (method === "GET" && pathname === "/api/admin/bookings") {
      return response(200, await listAdminBookings(headers), origin);
    }

    if (method === "PATCH" && pathname === "/api/admin/bookings") {
      return response(200, await updateAdminBooking(headers, payload), origin);
    }

    if (method === "POST" && pathname === "/api/admin/blocks") {
      return response(200, await createAdminBlock(headers, payload), origin);
    }

    if (method === "DELETE" && pathname === "/api/admin/blocks") {
      return response(200, await deleteAdminBlock(headers, payload), origin);
    }

    return response(404, { ok: false, error: "Not found" }, origin);
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) console.error("[VOYD API error]", error);
    return response(status, { ok: false, error: error.message || "VOYD API failed to process the request.", code: error.code || "api_error" }, origin);
  }
}
