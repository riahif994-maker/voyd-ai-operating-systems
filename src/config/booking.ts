// The server and Vercel functions import the runtime module directly (plain JS, zero build step).
// This file only adds types for React/TypeScript call sites - it holds no configuration values of its own.
// @ts-expect-error The adjacent .mjs file is the single source of truth for booking configuration.
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
export const bookingInquiryEmailUrl = runtime.bookingInquiryEmailUrl as "mailto:voyd.contact1@gmail.com?subject=VOYD%20Project%20Inquiry";
export const bookingStatuses = runtime.bookingStatuses as readonly ["new", "confirmed", "completed", "cancelled", "no_show"];

export const getClientTimeZone = runtime.getClientTimeZone as () => string;
export const isValidTimeZone = runtime.isValidTimeZone as (timeZone: string) => boolean;
export const formatDateOnlyInZone = runtime.formatDateOnlyInZone as (isoOrDate: string | Date, timeZone: string) => string;
export const formatTimeOnlyInZone = runtime.formatTimeOnlyInZone as (isoOrDate: string | Date, timeZone: string) => string;
export const formatDateTimeInZone = runtime.formatDateTimeInZone as (isoOrDate: string | Date, timeZone: string, options?: Intl.DateTimeFormatOptions) => string;
export const buildSlotDisplay = runtime.buildSlotDisplay as (startsAtIso: string, clientTimeZone: string) => {
  clientDate: string;
  clientTime: string;
  clientDateTime: string;
  berlinDate: string;
  berlinTime: string;
  berlinDateTime: string;
};
export const createIcsEvent = runtime.createIcsEvent as (input: {
  reference?: string;
  fullName: string;
  email: string;
  selectedProduct: string;
  meetingTopic: string;
  startsAtIso: string;
  durationMinutes?: number;
}) => string;
export const googleCalendarUrl = runtime.googleCalendarUrl as (input: {
  startsAtIso: string;
  durationMinutes?: number;
  selectedProduct: string;
  meetingTopic: string;
  reference?: string;
}) => string;
