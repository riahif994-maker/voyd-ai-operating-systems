import { bookingOwnerEmail } from "../config/booking";

export type AdminSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  email?: string;
};

const sessionKey = "voyd-admin-session";
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export function isSupabaseAuthConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function readAdminSession(): AdminSession | null {
  const raw = localStorage.getItem(sessionKey);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AdminSession;
    if (!session.accessToken) return null;
    if (session.expiresAt && session.expiresAt * 1000 < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function saveAdminSession(session: AdminSession | null) {
  if (!session) {
    localStorage.removeItem(sessionKey);
    return;
  }
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

export function parseSessionFromUrlHash(): AdminSession | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  if (!accessToken) return null;
  const refreshToken = hash.get("refresh_token") || undefined;
  const expiresAt = Number(hash.get("expires_at") || 0) || undefined;
  window.history.replaceState(null, "", window.location.pathname);
  return { accessToken, refreshToken, expiresAt };
}

export async function requestAdminMagicLink(email: string, redirectTo: string) {
  if (!isSupabaseAuthConfigured()) {
    throw new Error("Admin login is not configured yet.");
  }
  const response = await fetch(`${supabaseUrl}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: supabaseAnonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, options: { emailRedirectTo: redirectTo } }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.msg || data.error_description || "Could not send the login link. Please try again.");
  }
}

export async function verifyAdminSession(session: AdminSession): Promise<string> {
  if (!isSupabaseAuthConfigured()) {
    throw new Error("Admin login is not configured yet.");
  }
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${session.accessToken}` },
  });
  const user = await response.json().catch(() => ({}));
  if (!response.ok || !user.email) {
    throw new Error("Your admin session expired. Please request a new login link.");
  }
  if (String(user.email).toLowerCase() !== bookingOwnerEmail) {
    throw new Error("This admin dashboard is restricted to the VOYD owner.");
  }
  return user.email;
}

export function clearAdminSession() {
  saveAdminSession(null);
}
