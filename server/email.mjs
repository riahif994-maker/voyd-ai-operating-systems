import { Buffer } from "node:buffer";
import { ApiError, PUBLIC_UNAVAILABLE_MESSAGE, escapeHtml } from "./http.mjs";
import { bookingConfig, bookingOwnerEmail, buildSlotDisplay } from "../src/config/booking-runtime.mjs";

export function hasResendConfig() {
  return Boolean(process.env.RESEND_API_KEY && process.env.VOYD_FROM_EMAIL);
}

function fromAddress() {
  return process.env.VOYD_FROM_EMAIL;
}

async function sendResendEmail({ to, subject, html, attachments }) {
  if (!hasResendConfig()) {
    throw new ApiError(503, PUBLIC_UNAVAILABLE_MESSAGE, "email_unavailable");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromAddress(), to, subject, html, attachments }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[VOYD resend error]", { status: response.status, message: data?.message });
    throw new ApiError(503, PUBLIC_UNAVAILABLE_MESSAGE, "email_delivery_failed");
  }
  return { id: data.id };
}

function brandedEmail(title, intro, bodyHtml) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#05060a;color:#f7f8fb;padding:28px">
      <div style="max-width:760px;margin:0 auto;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:#0a0d14;overflow:hidden">
        <div style="padding:22px;border-bottom:1px solid rgba(255,255,255,.12)">
          <div style="font-size:13px;letter-spacing:.16em;color:#00e5ff;font-weight:800">VOYD</div>
          <h1 style="margin:10px 0 0;font-size:26px">${escapeHtml(title)}</h1>
        </div>
        <div style="padding:22px;color:#c2cad8;line-height:1.65">
          <p>${escapeHtml(intro)}</p>
          ${bodyHtml}
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

function phoneToWhatsappUrl(phone = "") {
  const digits = String(phone).replace(/[^0-9]/g, "");
  return digits ? `https://wa.me/${digits}` : "https://wa.me/4917686606120";
}

function icsAttachment(icsContent) {
  return [{ filename: "voyd-discovery.ics", content: Buffer.from(icsContent).toString("base64") }];
}

export async function sendOwnerBookingNotification(booking, meta, icsContent) {
  const display = buildSlotDisplay(booking.starts_at, booking.client_timezone);
  const adminUrl = `${(process.env.VOYD_PUBLIC_URL || "http://127.0.0.1:5173").replace(/\/$/, "")}/admin/bookings`;
  const subject = `New VOYD Booking - ${booking.selected_product} - ${display.berlinDate} at ${display.berlinTime}`;
  const html = brandedEmail(
    "New VOYD discovery call request",
    "A client reserved a VOYD discovery call slot. The full booking context is below.",
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
      "Client local date and time": display.clientDateTime,
      "Europe/Berlin date and time": display.berlinDateTime,
      "Client timezone": booking.client_timezone,
      "UTC timestamp": booking.starts_at,
      Duration: `${bookingConfig.durationMinutes} minutes`,
      "Source page": meta.sourcePage,
      Referrer: meta.referrer,
      "Submission timestamp": meta.timestamp,
      "Private admin booking link": { html: `<a style="color:#00e5ff" href="${escapeHtml(adminUrl)}">${escapeHtml(adminUrl)}</a>` },
    }),
  );
  return sendResendEmail({
    to: process.env.VOYD_LEADS_EMAIL || bookingOwnerEmail,
    subject,
    html,
    attachments: icsAttachment(icsContent),
  });
}

export async function sendClientBookingConfirmation(booking, icsContent) {
  const display = buildSlotDisplay(booking.starts_at, booking.client_timezone);
  const subject = `Your VOYD discovery call is confirmed - ${display.berlinDate}`;
  const html = brandedEmail(
    "Booking confirmed",
    `Hi ${booking.full_name}, your VOYD discovery call is reserved. VOYD will confirm using your preferred contact method (${booking.preferred_contact_method}).`,
    rows({
      "Booking reference": booking.booking_reference,
      "Selected product": booking.selected_product,
      "Meeting topic": booking.meeting_topic,
      "Your local date and time": display.clientDateTime,
      "Your timezone": booking.client_timezone,
      "Europe/Berlin date and time": display.berlinDateTime,
      Duration: `${bookingConfig.durationMinutes} minutes`,
      "VOYD email": { html: `<a style="color:#00e5ff" href="mailto:${escapeHtml(bookingOwnerEmail)}">${escapeHtml(bookingOwnerEmail)}</a>` },
      "VOYD WhatsApp": { html: `<a style="color:#00e5ff" href="https://wa.me/4917686606120">+49 176 86606120</a>` },
    }),
  );
  return sendResendEmail({
    to: booking.work_email,
    subject,
    html,
    attachments: icsAttachment(icsContent),
  });
}
