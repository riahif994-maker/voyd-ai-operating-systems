import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { Buffer } from "node:buffer";

const port = Number(process.env.VOYD_API_PORT || 8787);
const productionContactEmail = "voyd.contact1@gmail.com";
const replyExpectation = "Our team usually replies within one business day.";

function loadDotEnv() {
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

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.VOYD_ALLOWED_ORIGIN || "http://127.0.0.1:5173",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  });
  res.end(JSON.stringify(body));
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function maskEmail(email = "") {
  const [name, domain] = String(email).split("@");
  if (!domain) return email;
  return `${name.slice(0, 2)}***@${domain}`;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function leadRows(payload) {
  return Object.entries(payload)
    .filter(([key]) => !["honeypot", "consent"].includes(key))
    .map(([key, value]) => `<tr><td style="padding:6px 10px;color:#687083">${escapeHtml(key)}</td><td style="padding:6px 10px"><strong>${escapeHtml(value)}</strong></td></tr>`)
    .join("");
}

function brandedEmail(title, intro, body) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#05060a;color:#f7f8fb;padding:28px">
      <div style="max-width:680px;margin:0 auto;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:#0a0d14;overflow:hidden">
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

function createIcs({ fullName, email, selectedProduct, meetingTopic, slotIso }) {
  const start = new Date(slotIso);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dtStart = start.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dtEnd = end.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const uid = `voyd-${Date.now()}@voyd.ai`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VOYD//Discovery Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:VOYD discovery call - ${selectedProduct}`,
    `DESCRIPTION:${meetingTopic || "VOYD operating system discovery"}\\nContact: ${fullName} <${email}>`,
    "LOCATION:Video call",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

async function sendResendEmail(email) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.VOYD_FROM_EMAIL || `VOYD <${productionContactEmail}>`;
  if (!apiKey) {
    return { delivered: false, reason: "missing_credentials" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, ...email }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Resend failed with ${response.status}`);
  }
  return { delivered: true, id: data.id };
}

async function sendLeadEmails(payload, meta) {
  const leadDestination = productionContactEmail;
  const ownerBody = brandedEmail(
    "New VOYD sales lead",
    "A prospect submitted the Contact Sales form.",
    `<table style="width:100%;border-collapse:collapse">${leadRows({ ...payload, ...meta })}</table>`,
  );
  const prospectBody = brandedEmail(
    "Thanks for contacting VOYD",
    `Thanks ${payload.fullName}. We received your request for ${payload.selectedProduct}.`,
    `<p>${replyExpectation}</p><p>VOYD will review your business type, selected product, budget range, and message before replying with next steps.</p><p>Contact: ${productionContactEmail}</p><p>WhatsApp Business: +49 176 86606120</p>`,
  );

  const owner = await sendResendEmail({
    to: leadDestination,
    subject: `VOYD lead: ${payload.company} - ${payload.selectedProduct}`,
    html: ownerBody,
  });

  const prospect = await sendResendEmail({
    to: payload.email,
    subject: `VOYD received your ${payload.selectedProduct} request`,
    html: prospectBody,
  });

  return { owner, prospect };
}

async function sendBookingEmails(payload, meta, ics) {
  const leadDestination = productionContactEmail;
  const ownerBody = brandedEmail(
    "New VOYD booking request",
    "A prospect selected a discovery slot.",
    `<table style="width:100%;border-collapse:collapse">${leadRows({ ...payload, ...meta })}</table>`,
  );
  const prospectBody = brandedEmail(
    "Your VOYD discovery slot is selected",
    `Thanks ${payload.fullName}. We received your booking request for ${payload.selectedProduct}.`,
    `<p>Selected slot: ${escapeHtml(payload.slotLabel)}</p><p>Topic: ${escapeHtml(payload.meetingTopic)}</p><p>A calendar event is attached when email delivery is configured.</p>`,
  );

  const attachment = {
    filename: "voyd-discovery.ics",
    content: Buffer.from(ics).toString("base64"),
  };

  const owner = await sendResendEmail({
    to: leadDestination,
    subject: `VOYD booking: ${payload.company} - ${payload.selectedProduct}`,
    html: ownerBody,
    attachments: [attachment],
  });

  const prospect = await sendResendEmail({
    to: payload.email,
    subject: `VOYD discovery booking - ${payload.selectedProduct}`,
    html: prospectBody,
    attachments: [attachment],
  });

  return { owner, prospect };
}

function validateLead(payload) {
  const required = ["fullName", "email", "company", "businessType", "companySize", "selectedProduct", "budgetRange", "preferredContact", "message"];
  const missing = required.filter((field) => !String(payload[field] || "").trim());
  if (missing.length) return `Missing required fields: ${missing.join(", ")}`;
  if (!validateEmail(payload.email)) return "Enter a valid work email.";
  if (!payload.consent) return "Consent is required before submitting.";
  if (payload.honeypot) return "Spam protection triggered.";
  return "";
}

function getTimePartsInZone(date, timeZone) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
}

function validateBooking(payload) {
  const required = ["fullName", "email", "company", "selectedProduct", "meetingTopic", "slotIso", "slotLabel"];
  const missing = required.filter((field) => !String(payload[field] || "").trim());
  if (missing.length) return `Missing booking fields: ${missing.join(", ")}`;
  if (!validateEmail(payload.email)) return "Enter a valid booking email.";
  const slot = new Date(payload.slotIso);
  if (Number.isNaN(slot.getTime())) return "Selected booking slot is invalid.";
  if (slot.getTime() <= Date.now()) return "Selected booking slot is in the past.";

  const timeZone = payload.timeZone || "UTC";
  let parts;
  try {
    parts = getTimePartsInZone(slot, timeZone);
  } catch {
    return "Selected timezone is invalid.";
  }
  if (["Sat", "Sun"].includes(parts.weekday)) return "Please select a weekday slot.";
  if (!["00", "30"].includes(parts.minute) || parts.second !== "00") {
    return "Booking slots must start on a 30-minute boundary.";
  }
  return "";
}

function safeLog(type, payload, meta) {
  console.info(`[VOYD ${type} fallback]`, {
    fullName: payload.fullName,
    email: maskEmail(payload.email),
    company: payload.company,
    selectedProduct: payload.selectedProduct,
    timestamp: meta.timestamp,
    sourcePage: meta.sourcePage,
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return json(res, 200, { ok: true });
  }

  if (req.method !== "POST" || !["/api/contact", "/api/booking"].includes(req.url || "")) {
    return json(res, 404, { ok: false, error: "Not found" });
  }

  try {
    const payload = await readBody(req);
    const meta = {
      timestamp: new Date().toISOString(),
      sourcePage: payload.sourcePage || "",
      browserLanguage: payload.browserLanguage || "",
      referrer: payload.referrer || "",
    };

    const validationError = req.url === "/api/contact" ? validateLead(payload) : validateBooking(payload);
    if (validationError) {
      return json(res, 400, { ok: false, error: validationError });
    }

    if (!process.env.RESEND_API_KEY) {
      safeLog(req.url === "/api/contact" ? "lead" : "booking", payload, meta);
      const ics = req.url === "/api/booking" ? createIcs(payload) : undefined;
      return json(res, 202, {
        ok: true,
        delivered: false,
        mode: "development",
        message: "Email credentials are not configured. Payload was accepted for local testing and logged safely.",
        ics,
      });
    }

    const result =
      req.url === "/api/contact"
        ? await sendLeadEmails(payload, meta)
        : await sendBookingEmails(payload, meta, createIcs(payload));

    return json(res, 200, { ok: true, delivered: true, result });
  } catch (error) {
    console.error("[VOYD API error]", error);
    if (error.statusCode === 400) {
      return json(res, 400, { ok: false, error: error.message });
    }
    return json(res, 500, { ok: false, error: "VOYD API failed to process the request." });
  }
});

server.listen(port, () => {
  console.info(`VOYD API server listening on http://127.0.0.1:${port}`);
});
