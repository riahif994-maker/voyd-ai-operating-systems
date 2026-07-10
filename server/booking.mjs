import {
  ApiError,
  limitString,
  validateEmail,
  validatePhone,
} from "./http.mjs";
import { supabaseRest } from "./supabase.mjs";
import { findAvailableSlot, normalizeClientTimeZone } from "./availability.mjs";
import { sendClientBookingConfirmation, sendOwnerBookingNotification } from "./email.mjs";
import {
  bookingConfig,
  buildSlotDisplay,
  createBookingReference,
  createIcsEvent,
  dateKeyIsWorkingDay,
} from "../src/config/booking-runtime.mjs";

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
    clientTimezone: normalizeClientTimeZone(limitString(payload.clientTimezone || "UTC", 80, "Client timezone")),
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
  if (!validatePhone(normalized.phoneOrWhatsapp)) throw new ApiError(400, "Please enter a valid phone or WhatsApp number.", "invalid_phone");
  if (!["Email", "WhatsApp"].includes(normalized.preferredContactMethod)) {
    throw new ApiError(400, "Choose Email or WhatsApp as your preferred communication method.", "invalid_contact_method");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.dateKey)) throw new ApiError(400, "Please choose an available date.", "invalid_date");
  if (!dateKeyIsWorkingDay(normalized.dateKey)) throw new ApiError(400, "Please choose a Monday through Saturday date.", "unavailable_date");
  if (!bookingConfig.dailySlots.includes(normalized.slotTime)) {
    throw new ApiError(400, "Please choose one of the available VOYD times.", "invalid_slot");
  }

  return normalized;
}

async function insertBooking(normalized, slot, meta) {
  const record = {
    booking_reference: createBookingReference(),
    starts_at: slot.startsAt,
    ends_at: slot.endsAt,
    voyd_timezone: bookingConfig.timezone,
    client_timezone: normalized.clientTimezone,
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

async function cancelBookingAfterOwnerNotificationFailure(bookingId) {
  if (!bookingId) return;
  await supabaseRest(`bookings?id=eq.${encodeURIComponent(bookingId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "cancelled",
      admin_notes: `Automatic cancellation: owner notification failed at ${new Date().toISOString()}.`,
      updated_at: new Date().toISOString(),
    }),
  }).catch((error) => console.error("[VOYD rollback error]", error));
}

function requestMeta(payload = {}) {
  return {
    timestamp: new Date().toISOString(),
    sourcePage: limitString(payload.sourcePage || "", 300, "Source page"),
    browserLanguage: limitString(payload.browserLanguage || "", 80, "Browser language"),
    referrer: limitString(payload.referrer || "", 300, "Referrer"),
  };
}

export async function submitBooking(payload) {
  const meta = requestMeta(payload);
  const normalized = normalizeBookingPayload(payload);
  const slot = await findAvailableSlot(normalized.dateKey, normalized.slotTime, normalized.clientTimezone);
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
    await sendOwnerBookingNotification(booking, meta, ics);
  } catch (error) {
    await cancelBookingAfterOwnerNotificationFailure(booking.id);
    throw error;
  }

  let clientConfirmationEmailSent = false;
  try {
    await sendClientBookingConfirmation(booking, ics);
    clientConfirmationEmailSent = true;
  } catch (error) {
    console.warn("[VOYD client confirmation email failed]", { bookingId: booking.id, code: error.code });
  }

  const display = buildSlotDisplay(booking.starts_at, booking.client_timezone);
  return {
    ok: true,
    clientConfirmationEmailSent,
    booking: {
      bookingReference: booking.booking_reference,
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      selectedProduct: booking.selected_product,
      preferredContactMethod: booking.preferred_contact_method,
      clientTimezone: booking.client_timezone,
      clientDate: display.clientDate,
      clientTime: display.clientTime,
      clientDateTime: display.clientDateTime,
      berlinDateTime: display.berlinDateTime,
      durationMinutes: bookingConfig.durationMinutes,
    },
    ics,
    message: "Your meeting time is reserved. VOYD will confirm the call using your preferred contact method.",
  };
}
