import { ApiError } from "./http.mjs";
import { hasSupabaseConfig, supabaseRest } from "./supabase.mjs";
import {
  addDaysToDateKey,
  bookingConfig,
  buildSlotDisplay,
  dateKeyInTimeZone,
  dateKeyIsWorkingDay,
  isValidTimeZone,
  slotId,
  zonedTimeToUtc,
} from "../src/config/booking-runtime.mjs";

const activeStatuses = ["new", "confirmed"];

export function normalizeClientTimeZone(timeZone) {
  return timeZone && isValidTimeZone(timeZone) ? timeZone : "UTC";
}

function generateAvailabilitySkeleton(clientTimeZone, now = new Date()) {
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
        const display = buildSlotDisplay(start.toISOString(), clientTimeZone);
        return {
          id: slotId(dateKey, slotTime),
          dateKey,
          slotTime,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          status: "available",
          client: {
            timezone: clientTimeZone,
            date: display.clientDate,
            time: display.clientTime,
            dateTime: display.clientDateTime,
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
    dates.push({
      dateKey,
      berlinDate: slots[0].berlin.date,
      clientDate: [...new Set(slots.map((slot) => slot.client.date))].join(" / "),
      fullyBooked: false,
      remainingSlots: slots.length,
      slots,
    });
  }
  return dates;
}

export async function getAvailability(rawClientTimeZone = "UTC") {
  const clientTimeZone = normalizeClientTimeZone(rawClientTimeZone);
  if (!hasSupabaseConfig()) {
    return {
      ok: true,
      available: false,
      message: "Online booking is temporarily unavailable. Please contact VOYD by WhatsApp or email.",
      voydTimezone: bookingConfig.timezone,
      clientTimeZone,
      durationMinutes: bookingConfig.durationMinutes,
      dates: [],
    };
  }

  const dates = generateAvailabilitySkeleton(clientTimeZone);
  const firstSlot = dates[0]?.slots[0];
  const lastDate = dates[dates.length - 1];
  const lastSlot = lastDate?.slots[lastDate.slots.length - 1];
  if (!firstSlot || !lastSlot) {
    return {
      ok: true,
      available: true,
      voydTimezone: bookingConfig.timezone,
      clientTimeZone,
      durationMinutes: bookingConfig.durationMinutes,
      generatedAt: new Date().toISOString(),
      dates: [],
    };
  }

  const from = encodeURIComponent(firstSlot.startsAt);
  const to = encodeURIComponent(lastSlot.endsAt);
  const bookingFilter = `bookings?select=starts_at,status&starts_at=gte.${from}&starts_at=lte.${to}&status=in.(${activeStatuses.join(",")})`;
  const blockFilter = `blocked_booking_slots?select=starts_at&starts_at=gte.${from}&starts_at=lte.${to}`;
  const [bookings, blocks] = await Promise.all([supabaseRest(bookingFilter), supabaseRest(blockFilter)]);
  const bookedTimes = new Set((bookings || []).map((booking) => new Date(booking.starts_at).getTime()));
  const blockedTimes = new Set((blocks || []).map((block) => new Date(block.starts_at).getTime()));

  const hydratedDates = dates.map((date) => {
    const slots = date.slots.map((slot) => {
      const startMs = new Date(slot.startsAt).getTime();
      const status = bookedTimes.has(startMs) ? "booked" : blockedTimes.has(startMs) ? "blocked" : "available";
      return { ...slot, status };
    });
    const remainingSlots = slots.filter((slot) => slot.status === "available").length;
    return { ...date, slots, remainingSlots, fullyBooked: remainingSlots === 0 };
  });

  return {
    ok: true,
    available: true,
    voydTimezone: bookingConfig.timezone,
    clientTimeZone,
    durationMinutes: bookingConfig.durationMinutes,
    generatedAt: new Date().toISOString(),
    dates: hydratedDates,
  };
}

export async function findAvailableSlot(dateKey, slotTime, clientTimeZone) {
  const availability = await getAvailability(clientTimeZone);
  if (!availability.available) {
    throw new ApiError(503, "Online booking is temporarily unavailable. Please contact VOYD by WhatsApp or email.", "booking_unavailable");
  }
  const slot = availability.dates.flatMap((date) => date.slots).find((item) => item.dateKey === dateKey && item.slotTime === slotTime);
  if (!slot) throw new ApiError(400, "Please choose an available date and time.", "invalid_or_past_slot");
  if (slot.status !== "available") {
    throw new ApiError(409, "This time was just booked. Please choose another available time.", "slot_conflict");
  }
  return slot;
}
