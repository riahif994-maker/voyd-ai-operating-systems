export const PUBLIC_UNAVAILABLE_MESSAGE = "Online request handling is not active.";
export const PUBLIC_SLOT_CONFLICT_MESSAGE = "This time was just booked. Please choose another available time.";
export const PUBLIC_NETWORK_FAILURE_MESSAGE = "We could not complete your booking. Please try again.";

export class ApiError extends Error {
  constructor(statusCode, publicMessage, code = "api_error") {
    super(publicMessage);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function getHeader(headers, name) {
  if (!headers) return "";
  const lowerName = name.toLowerCase();
  if (typeof headers.get === "function") return headers.get(name) || "";
  return headers[name] || headers[lowerName] || "";
}

function allowedOrigins() {
  const configured = [process.env.VOYD_ALLOWED_ORIGIN, process.env.VOYD_PUBLIC_URL]
    .filter(Boolean)
    .map((value) => String(value).replace(/\/$/, ""));
  return { configured, all: new Set(["http://127.0.0.1:5173", "http://localhost:5173", ...configured]) };
}

export function resolveOrigin(origin = "") {
  const { configured, all } = allowedOrigins();
  const normalized = String(origin || "").replace(/\/$/, "");
  if (normalized && all.has(normalized)) return normalized;
  return configured[0] || "http://127.0.0.1:5173";
}

export function jsonResponse(status, body, origin, extraHeaders = {}) {
  return {
    status,
    body,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": resolveOrigin(origin),
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Vary": "Origin",
      ...extraHeaders,
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

function isControlCharCode(code) {
  return code <= 31 || code === 127;
}

export function stripControl(value = "") {
  let result = "";
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    if (!isControlCharCode(text.charCodeAt(i))) result += text[i];
  }
  return result.trim();
}

export function limitString(value, max, label) {
  const cleaned = stripControl(value);
  if (cleaned.length > max) throw new ApiError(400, `${label} is too long.`, "invalid_length");
  return cleaned;
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

export function validatePhone(phone) {
  const digits = String(phone || "").replace(/[^0-9]/g, "");
  return digits.length >= 6;
}

export function maskEmail(email = "") {
  const [name, domain] = String(email).split("@");
  if (!domain) return "***";
  return `${name.slice(0, 2)}***@${domain}`;
}

export async function parseJsonBody(input) {
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

const rateLimitWindowMs = 60000;
const rateLimitMax = 20;
const rateBuckets = new Map();

export function checkRateLimit(ip, route) {
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

export function requestIp(req) {
  return req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
}

export function applyResult(res, result) {
  for (const [key, value] of Object.entries(result.headers)) res.setHeader(key, value);
  res.status(result.status).json(result.body);
}

export async function handleApi(methodHandlers, req, res) {
  const origin = getHeader(req.headers, "origin");
  try {
    if (req.method === "OPTIONS") {
      applyResult(res, jsonResponse(200, { ok: true }, origin));
      return;
    }
    const handler = methodHandlers[req.method];
    if (!handler) {
      applyResult(res, jsonResponse(405, { ok: false, error: "Method not allowed", code: "method_not_allowed" }, origin));
      return;
    }
    checkRateLimit(requestIp(req), req.url || req.method);
    const body = await handler(req, origin);
    applyResult(res, jsonResponse(200, body, origin));
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) console.error("[VOYD API error]", error);
    const safeMessage = status >= 500 ? PUBLIC_UNAVAILABLE_MESSAGE : error.message || PUBLIC_NETWORK_FAILURE_MESSAGE;
    applyResult(res, jsonResponse(status, { ok: false, error: safeMessage, code: error.code || "api_error" }, origin));
  }
}
