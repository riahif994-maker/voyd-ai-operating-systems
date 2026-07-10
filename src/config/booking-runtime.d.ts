export const bookingConfig: Readonly<{
  timezone: "Europe/Berlin";
  workingDays: number[];
  dailySlots: string[];
  durationMinutes: number;
  bookingWindowDays: number;
  minimumNoticeHours: number;
}>;

export const bookingOwnerEmail: "voyd.contact1@gmail.com";
export const bookingWhatsappNumber: "+49 176 86606120";
export const bookingWhatsappUrl: "https://wa.me/4917686606120";
export const bookingStatuses: string[];

export function getVisitorTimeZone(): string;
export function getPartsInTimeZone(date: Date, timeZone: string): Record<string, string>;
export function dateKeyInTimeZone(date: Date, timeZone: string): string;
export function addDaysToDateKey(dateKey: string, days: number): string;
export function weekdayFromDateKey(dateKey: string): number;
export function dateKeyIsWorkingDay(dateKey: string): boolean;
export function zonedTimeToUtc(dateKey: string, time: string, timeZone?: string): Date;
export function slotId(dateKey: string, slotTime: string): string;
export function formatDateTimeInZone(isoOrDate: string | Date, timeZone: string, options?: Intl.DateTimeFormatOptions): string;
export function formatDateOnlyInZone(isoOrDate: string | Date, timeZone: string): string;
export function formatTimeOnlyInZone(isoOrDate: string | Date, timeZone: string): string;
export function buildSlotDisplay(startsAtIso: string, visitorTimeZone: string): {
  visitorDate: string;
  visitorTime: string;
  visitorDateTime: string;
  berlinDate: string;
  berlinTime: string;
  berlinDateTime: string;
};
export function createBookingReference(date?: Date): string;
export function createIcsEvent(input: {
  reference?: string;
  fullName: string;
  email: string;
  selectedProduct: string;
  meetingTopic: string;
  startsAtIso: string;
  durationMinutes?: number;
}): string;
