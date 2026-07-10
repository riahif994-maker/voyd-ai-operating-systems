import { ApiError, PUBLIC_SLOT_CONFLICT_MESSAGE, PUBLIC_UNAVAILABLE_MESSAGE } from "./http.mjs";
import { bookingOwnerEmail } from "../src/config/booking-runtime.mjs";

export function normalizeSupabaseUrl(rawUrl = "") {
  return String(rawUrl || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "");
}

export function supabaseConfig() {
  return {
    url: normalizeSupabaseUrl(process.env.SUPABASE_URL || ""),
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

export function hasSupabaseConfig() {
  const config = supabaseConfig();
  return Boolean(config.url && config.serviceKey);
}

export function ensureSupabaseConfig() {
  if (!hasSupabaseConfig()) {
    throw new ApiError(503, PUBLIC_UNAVAILABLE_MESSAGE, "booking_unavailable");
  }
}

export function isOpaqueSupabaseKey(key = "") {
  return /^sb_(secret|publishable)_/.test(String(key));
}

export function serviceKeyKind(key = "") {
  if (!key) return "missing";
  if (key.startsWith("sb_secret_")) return "opaque_secret";
  if (key.startsWith("sb_publishable_")) return "opaque_publishable";
  if (key.split(".").length === 3) return "legacy_jwt";
  return "unrecognized";
}

export function serviceKeyHeaders(serviceKey, extra = {}) {
  const headers = { apikey: serviceKey, "Content-Type": "application/json", ...extra };
  if (!isOpaqueSupabaseKey(serviceKey)) {
    headers.Authorization = `Bearer ${serviceKey}`;
  }
  return headers;
}

function safeSupabaseError(data) {
  return data?.message || data?.hint || data?.code || "supabase_request_failed";
}

export async function supabaseRest(path, options = {}) {
  ensureSupabaseConfig();
  const { url, serviceKey } = supabaseConfig();
  const endpoint = `${url}/rest/v1/${String(path).replace(/^\/+/, "")}`;
  const response = await fetch(endpoint, {
    ...options,
    headers: serviceKeyHeaders(serviceKey, options.headers || {}),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: "Non-JSON Supabase response" };
  }

  if (!response.ok) {
    if (response.status === 409 || data?.code === "23505") {
      throw new ApiError(409, PUBLIC_SLOT_CONFLICT_MESSAGE, "slot_conflict");
    }
    console.error("[VOYD supabase error]", {
      endpoint: path,
      status: response.status,
      message: safeSupabaseError(data),
      keyKind: serviceKeyKind(serviceKey),
    });
    throw new ApiError(503, PUBLIC_UNAVAILABLE_MESSAGE, "storage_unavailable");
  }
  return data;
}

export async function verifyAdminToken(authorizationHeader) {
  ensureSupabaseConfig();
  const { url, serviceKey } = supabaseConfig();
  const token = String(authorizationHeader || "").replace(/^Bearer\s+/i, "");
  if (!token) throw new ApiError(401, "Admin authentication is required.", "admin_auth_required");
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${token}`,
    },
  });
  const user = await response.json().catch(() => ({}));
  if (!response.ok || !user.email) {
    throw new ApiError(401, "Admin session is invalid or expired. Please log in again.", "admin_auth_invalid");
  }
  if (String(user.email).toLowerCase() !== bookingOwnerEmail) {
    throw new ApiError(403, "This admin area is restricted to the VOYD owner.", "admin_forbidden");
  }
  return user;
}
