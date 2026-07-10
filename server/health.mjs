import { hasSupabaseConfig, serviceKeyKind, supabaseConfig, supabaseRest } from "./supabase.mjs";
import { hasResendConfig, resendMode } from "./email.mjs";

async function tableReachable(path) {
  try {
    await supabaseRest(path);
    return true;
  } catch {
    return false;
  }
}

export async function bookingHealth() {
  const config = supabaseConfig();
  const supabaseConfigured = hasSupabaseConfig();
  const [bookingsTableReachable, blockedSlotsTableReachable] = supabaseConfigured
    ? await Promise.all([
        tableReachable("bookings?select=id&limit=1"),
        tableReachable("blocked_booking_slots?select=id&limit=1"),
      ])
    : [false, false];
  const supabaseReachable = bookingsTableReachable && blockedSlotsTableReachable;
  const senderConfigured = Boolean(process.env.VOYD_FROM_EMAIL);
  const resendConfigured = hasResendConfig();

  return {
    ok: supabaseConfigured && supabaseReachable,
    supabaseConfigured,
    supabaseReachable,
    bookingsTableReachable,
    blockedSlotsTableReachable,
    supabaseKeyFormat: serviceKeyKind(config.serviceKey),
    resendConfigured,
    resendMode: resendMode(),
    senderConfigured,
  };
}
