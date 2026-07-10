// The server imports the shared runtime directly. React imports this typed wrapper.
// @ts-expect-error The adjacent .mjs file is the runtime source of truth.
import * as runtime from "./booking-runtime.mjs";

export const bookingConfig = runtime.bookingConfig as Readonly<{
  timezone: "Europe/Berlin";
  workingDays: number[];
  dailySlots: string[];
  durationMinutes: number;
  bookingWindowDays: number;
  minimumNoticeHours: number;
}>;

export const bookingOwnerEmail = runtime.bookingOwnerEmail as "voyd.contact1@gmail.com";
export const bookingWhatsappNumber = runtime.bookingWhatsappNumber as "+49 176 86606120";
export const bookingWhatsappUrl = runtime.bookingWhatsappUrl as "https://wa.me/4917686606120";

export const getVisitorTimeZone = runtime.getVisitorTimeZone as () => string;
export const formatDateOnlyInZone = runtime.formatDateOnlyInZone as (isoOrDate: string | Date, timeZone: string) => string;
export const formatDateTimeInZone = runtime.formatDateTimeInZone as (isoOrDate: string | Date, timeZone: string, options?: Intl.DateTimeFormatOptions) => string;
export const createIcsEvent = runtime.createIcsEvent as (input: {
  reference?: string;
  fullName: string;
  email: string;
  selectedProduct: string;
  meetingTopic: string;
  startsAtIso: string;
  durationMinutes?: number;
}) => string;
