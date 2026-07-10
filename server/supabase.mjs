import { ApiError, PUBLIC_SLOT_CONFLICT_MESSAGE, PUBLIC_UNAVAILABLE_MESSAGE } from "./http.mjs";
import { bookingOwnerEmail } from "../src/config/booking-runtime.mjs";

export function supabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || "",
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

export async function supabaseRest(path, options = {}) {
  ensureSupabaseConfig();
  const { url, serviceKey } = supabaseConfig();
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
    if (response.status === 409 || data?.code === "23505") {
      throw new ApiError(409, PUBLIC_SLOT_CONFLICT_MESSAGE, "slot_conflict");
    }
    console.error("[VOYD supabase error]", { path, status: response.status, message: data?.message || data?.hint });
    throw new ApiError(503, PUBLIC_UNAVAILABLE_MESSAGE, "storage_unavailable");
  }
  return data;
}

export async function verifyAdminToken(authorizationHeader) {
  ensureSupabaseConfig();
  const { url, serviceKey } = supabaseConfig();
  const token = String(authorizationHeader || "").replace(/^Bearer\s+/i, "");
  if (!token) throw new ApiError(401, "Admin authentication is required.", "admin_auth_required");
  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, {
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
