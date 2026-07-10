export const bookingConfig = Object.freeze({
  timezone: "Europe/Berlin",
  workingDays: [1, 2, 3, 4, 5, 6],
  dailySlots: ["10:00", "22:00"],
  durationMinutes: 45,
  bookingWindowDays: 30,
  minimumNoticeHours: 6,
});

export const bookingOwnerEmail = "voyd.contact1@gmail.com";
export const bookingWhatsappNumber = "+49 176 86606120";
export const bookingWhatsappUrl = "https://wa.me/4917686606120";
export const bookingStatuses = ["new", "confirmed", "completed", "cancelled", "no_show"];

const datePartFormatterCache = new Map();

function getFormatter(timeZone, options) {
  const key = `${timeZone}-${JSON.stringify(options)}`;
  const cached = datePartFormatterCache.get(key);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, ...options });
  datePartFormatterCache.set(key, formatter);
  return formatter;
}

export function getVisitorTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function getPartsInTimeZone(date, timeZone) {
  return Object.fromEntries(
    getFormatter(timeZone, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
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

export function dateKeyInTimeZone(date, timeZone) {
  const parts = getPartsInTimeZone(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addDaysToDateKey(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return date.toISOString().slice(0, 10);
}

export function weekdayFromDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
}

export function dateKeyIsWorkingDay(dateKey) {
  return bookingConfig.workingDays.includes(weekdayFromDateKey(dateKey));
}

function getOffsetMs(date, timeZone) {
  const parts = getPartsInTimeZone(date, timeZone);
  const zonedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return zonedAsUtc - date.getTime();
}

export function zonedTimeToUtc(dateKey, time, timeZone = bookingConfig.timezone) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const firstOffset = getOffsetMs(utcGuess, timeZone);
  let utcDate = new Date(utcGuess.getTime() - firstOffset);
  const secondOffset = getOffsetMs(utcDate, timeZone);
  if (secondOffset !== firstOffset) {
    utcDate = new Date(utcGuess.getTime() - secondOffset);
  }
  return utcDate;
}

export function slotId(dateKey, slotTime) {
  return `${dateKey}T${slotTime}`;
}

export function formatDateTimeInZone(isoOrDate, timeZone, options = {}) {
  const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    ...options,
  }).format(date);
}

export function formatDateOnlyInZone(isoOrDate, timeZone) {
  const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatTimeOnlyInZone(isoOrDate, timeZone) {
  const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function buildSlotDisplay(startsAtIso, visitorTimeZone) {
  return {
    visitorDate: formatDateOnlyInZone(startsAtIso, visitorTimeZone),
    visitorTime: formatTimeOnlyInZone(startsAtIso, visitorTimeZone),
    visitorDateTime: formatDateTimeInZone(startsAtIso, visitorTimeZone),
    berlinDate: formatDateOnlyInZone(startsAtIso, bookingConfig.timezone),
    berlinTime: formatTimeOnlyInZone(startsAtIso, bookingConfig.timezone),
    berlinDateTime: formatDateTimeInZone(startsAtIso, bookingConfig.timezone),
  };
}

export function createBookingReference(date = new Date()) {
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `VOYD-${stamp}-${random}`;
}

export function createIcsEvent({ reference, fullName, email, selectedProduct, meetingTopic, startsAtIso, durationMinutes = bookingConfig.durationMinutes }) {
  const start = new Date(startsAtIso);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dtStart = start.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dtEnd = end.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const uid = `${reference || `voyd-${Date.now()}`}@voyd.ai`;
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
    `DESCRIPTION:${meetingTopic || "VOYD discovery call"}\\nReference: ${reference || "pending"}\\nContact: ${fullName} <${email}>`,
    "LOCATION:Video call",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
