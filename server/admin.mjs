import { ApiError, limitString } from "./http.mjs";
import { supabaseRest } from "./supabase.mjs";
import { bookingConfig, bookingStatuses, dateKeyIsWorkingDay, zonedTimeToUtc } from "../src/config/booking-runtime.mjs";

const activeStatuses = ["new", "confirmed"];

export async function listAdminBookings() {
  const [bookings, blocks] = await Promise.all([
    supabaseRest("bookings?select=*&order=starts_at.asc"),
    supabaseRest("blocked_booking_slots?select=*&order=starts_at.asc"),
  ]);
  return { ok: true, bookings: bookings || [], blocks: blocks || [] };
}

async function assertSlotIsFree(startsAtIso, excludeBookingId) {
  const from = encodeURIComponent(startsAtIso);
  const bookingFilter = `bookings?select=id&starts_at=eq.${from}&status=in.(${activeStatuses.join(",")})`;
  const blockFilter = `blocked_booking_slots?select=id&starts_at=eq.${from}`;
  const [conflictingBookings, conflictingBlocks] = await Promise.all([supabaseRest(bookingFilter), supabaseRest(blockFilter)]);
  const otherBookings = (conflictingBookings || []).filter((row) => row.id !== excludeBookingId);
  if (otherBookings.length || (conflictingBlocks || []).length) {
    throw new ApiError(409, "This time is no longer available.", "slot_conflict");
  }
}

export async function updateAdminBooking(payload) {
  const id = limitString(payload.id, 80, "Booking id");
  const action = limitString(payload.action, 40, "Action");
  if (!id) throw new ApiError(400, "Booking id is required.", "missing_booking_id");

  if (action === "status") {
    const status = limitString(payload.status, 20, "Status");
    if (!bookingStatuses.includes(status)) throw new ApiError(400, "Invalid booking status.", "invalid_status");

    if (status === "new" || status === "confirmed") {
      const existing = await supabaseRest(`bookings?select=starts_at,status&id=eq.${encodeURIComponent(id)}`);
      const current = existing?.[0];
      if (current && current.status === "cancelled") {
        await assertSlotIsFree(current.starts_at, id);
      }
    }

    const updated = await supabaseRest(`bookings?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
    });
    return { ok: true, booking: updated?.[0] };
  }

  if (action === "notes") {
    const adminNotes = limitString(payload.adminNotes || "", 1800, "Admin notes");
    const updated = await supabaseRest(`bookings?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ admin_notes: adminNotes, updated_at: new Date().toISOString() }),
    });
    return { ok: true, booking: updated?.[0] };
  }

  throw new ApiError(400, "Unsupported admin action.", "invalid_admin_action");
}

function slotsForBlockRequest(dateKey, slotTime) {
  if (slotTime) return [slotTime];
  return [...bookingConfig.dailySlots];
}

export async function createAdminBlock(payload) {
  const dateKey = limitString(payload.dateKey, 20, "Block date");
  const slotTime = limitString(payload.slotTime || "", 12, "Slot time");
  const reason = limitString(payload.reason || "", 400, "Block reason");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new ApiError(400, "Block date is invalid.", "invalid_date");
  if (!dateKeyIsWorkingDay(dateKey)) throw new ApiError(400, "Only Monday through Saturday can be blocked.", "invalid_block_date");
  if (slotTime && !bookingConfig.dailySlots.includes(slotTime)) {
    throw new ApiError(400, "Blocked slot must be 10:00 or 22:00 Europe/Berlin.", "invalid_block_slot");
  }

  const records = slotsForBlockRequest(dateKey, slotTime).map((time) => ({
    starts_at: zonedTimeToUtc(dateKey, time, bookingConfig.timezone).toISOString(),
    reason: reason || null,
  }));

  const inserted = await supabaseRest("blocked_booking_slots?on_conflict=starts_at&select=*", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify(records),
  });
  return { ok: true, blocks: inserted || [] };
}

export async function deleteAdminBlock(payload) {
  const id = limitString(payload.id || "", 80, "Block id");
  if (!id) throw new ApiError(400, "Block id is required.", "missing_block_id");
  await supabaseRest(`blocked_booking_slots?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  return { ok: true };
}
