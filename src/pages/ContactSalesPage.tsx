import { AlertCircle, CalendarPlus, CheckCircle2, Download, Home, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { products } from "../data/voyd";
import { Button } from "../components/voyd/Button";
import { PageTransition } from "../components/voyd/PageTransition";
import { Reveal } from "../components/voyd/Reveal";
import {
  bookingConfig,
  bookingInquiryEmailUrl,
  bookingOwnerEmail,
  bookingWhatsappUrl,
  getClientTimeZone,
  googleCalendarUrl,
} from "../config/booking";

type BookingForm = {
  fullName: string;
  workEmail: string;
  phoneOrWhatsapp: string;
  company: string;
  businessType: string;
  companySize: string;
  selectedProduct: string;
  meetingTopic: string;
  preferredContactMethod: "Email" | "WhatsApp" | "";
  additionalMessage: string;
  dateKey: string;
  slotTime: string;
  consent: boolean;
  honeypot: string;
};

type SlotStatus = "available" | "booked" | "blocked";

type AvailabilitySlot = {
  id: string;
  dateKey: string;
  slotTime: string;
  startsAt: string;
  endsAt: string;
  status: SlotStatus;
  client: { timezone: string; date: string; time: string; dateTime: string };
  berlin: { timezone: string; date: string; time: string; dateTime: string };
};

type AvailabilityDate = {
  dateKey: string;
  berlinDate: string;
  clientDate: string;
  fullyBooked: boolean;
  remainingSlots: number;
  slots: AvailabilitySlot[];
};

type AvailabilityResponse = {
  ok: boolean;
  available: boolean;
  message?: string;
  voydTimezone: string;
  clientTimeZone: string;
  durationMinutes: number;
  dates: AvailabilityDate[];
};

type BookingSuccess = {
  bookingReference: string;
  startsAt: string;
  endsAt: string;
  selectedProduct: string;
  preferredContactMethod: string;
  clientTimezone: string;
  clientDate: string;
  clientTime: string;
  clientDateTime: string;
  berlinDateTime: string;
  durationMinutes: number;
};

const stepLabels = ["Date", "Time", "Your details", "Contact preference", "Review"];

const initialBooking: BookingForm = {
  fullName: "",
  workEmail: "",
  phoneOrWhatsapp: "",
  company: "",
  businessType: "",
  companySize: "",
  selectedProduct: "Operating System",
  meetingTopic: "VOYD discovery call",
  preferredContactMethod: "",
  additionalMessage: "",
  dateKey: "",
  slotTime: "",
  consent: false,
  honeypot: "",
};

const unavailableMessage = "Online booking is temporarily unavailable. Please contact VOYD by WhatsApp or email.";
const networkFailureMessage = "We could not complete your booking. Please try again.";

function emailIsValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function phoneIsValid(phone: string) {
  return phone.replace(/[^0-9]/g, "").length >= 6;
}

function buildMeta() {
  return {
    sourcePage: window.location.href,
    browserLanguage: navigator.language,
    referrer: document.referrer,
  };
}

function downloadIcsFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function fetchAvailability(clientTimeZone: string): Promise<AvailabilityResponse> {
  try {
    const response = await fetch(`/api/availability?clientTimeZone=${encodeURIComponent(clientTimeZone)}`);
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) throw new Error("unavailable");
    return data as AvailabilityResponse;
  } catch {
    return {
      ok: true,
      available: false,
      message: unavailableMessage,
      voydTimezone: bookingConfig.timezone,
      clientTimeZone,
      durationMinutes: bookingConfig.durationMinutes,
      dates: [],
    };
  }
}

async function submitBookingRequest(payload: unknown) {
  const response = await fetch("/api/booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    const message = typeof data?.error === "string" ? data.error : networkFailureMessage;
    throw new Error(message);
  }
  return data as {
    booking: BookingSuccess;
    ics: string;
    message: string;
    ownerNotificationSent: boolean;
    clientConfirmationSent: boolean;
    clientConfirmationEmailSent: boolean;
  };
}

function getProductFromQuery(value: string | null) {
  if (!value) return "";
  const normalized = value.toLowerCase();
  return products.find((product) => product.id === normalized || product.name.toLowerCase() === normalized)?.name || "";
}

export default function ContactSalesPage() {
  const [searchParams] = useSearchParams();
  const clientTimeZone = useMemo(getClientTimeZone, []);
  const [booking, setBooking] = useState<BookingForm>(initialBooking);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successBooking, setSuccessBooking] = useState<BookingSuccess | null>(null);
  const [successIcs, setSuccessIcs] = useState("");
  const [ownerNotificationSent, setOwnerNotificationSent] = useState(true);
  const [clientConfirmationEmailSent, setClientConfirmationEmailSent] = useState(false);
  const submitLock = useRef(false);

  const productOptions = useMemo(() => ["Operating System", ...products.map((product) => product.name)], []);
  const selectedDate = availability?.dates.find((date) => date.dateKey === booking.dateKey);
  const selectedSlot = selectedDate?.slots.find((slot) => slot.slotTime === booking.slotTime);
  const bookingUnavailable = !availabilityLoading && availability?.available === false;

  const refreshAvailability = async () => {
    setAvailabilityLoading(true);
    const data = await fetchAvailability(clientTimeZone);
    setAvailability(data);
    setAvailabilityLoading(false);
  };

  useEffect(() => {
    refreshAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const selectedProduct = getProductFromQuery(searchParams.get("product"));
    if (!selectedProduct) return;
    setBooking((current) => ({ ...current, selectedProduct }));
  }, [searchParams]);

  useEffect(() => {
    if (step === 2 && selectedDate && selectedDate.remainingSlots === 0) {
      setStep(1);
    }
  }, [step, selectedDate]);

  const goToStep = (nextStep: number) => {
    setSubmitError("");
    setStep(nextStep);
  };

  const validateDetails = () => {
    const errors: Record<string, string> = {};
    if (!booking.fullName.trim()) errors.fullName = "Please enter your full name.";
    if (!emailIsValid(booking.workEmail)) errors.workEmail = "Please enter a valid work email.";
    if (!phoneIsValid(booking.phoneOrWhatsapp)) errors.phoneOrWhatsapp = "Please enter a valid phone or WhatsApp number.";
    if (!booking.company.trim()) errors.company = "Please enter your company.";
    if (!booking.businessType) errors.businessType = "Please select a business type.";
    if (!booking.companySize) errors.companySize = "Please select a company size.";
    if (!booking.meetingTopic.trim()) errors.meetingTopic = "Please enter a meeting topic.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateBooking = (patch: Partial<BookingForm>) => {
    setBooking((current) => ({ ...current, ...patch }));
    setFieldErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key];
      return next;
    });
  };

  const submitBooking = async (event: FormEvent) => {
    event.preventDefault();
    if (submitLock.current || submitting) return;
    if (!booking.dateKey || !booking.slotTime || !selectedSlot || selectedSlot.status !== "available") {
      setSubmitError("This time was just booked. Please choose another available time.");
      goToStep(2);
      await refreshAvailability();
      return;
    }
    if (!booking.consent) {
      setSubmitError("Please accept contact consent before submitting.");
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await submitBookingRequest({
        ...booking,
        clientTimezone: clientTimeZone,
        ...buildMeta(),
      });
      setSuccessBooking(result.booking);
      setSuccessIcs(result.ics);
      setOwnerNotificationSent(result.ownerNotificationSent);
      setClientConfirmationEmailSent(result.clientConfirmationSent || result.clientConfirmationEmailSent);
      await refreshAvailability();
    } catch (error) {
      const message = error instanceof Error ? error.message : networkFailureMessage;
      setSubmitError(message);
      if (message.includes("just booked")) {
        goToStep(2);
        await refreshAvailability();
      }
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  };

  const successGoogleCalendarUrl = successBooking
    ? googleCalendarUrl({
        startsAtIso: successBooking.startsAt,
        durationMinutes: successBooking.durationMinutes,
        selectedProduct: successBooking.selectedProduct,
        meetingTopic: booking.meetingTopic,
        reference: successBooking.bookingReference,
      })
    : "";

  return (
    <PageTransition>
      <main className="page contact-page">
        <section className="page-hero single-booking-hero">
          <p className="eyebrow">Book Discovery Call</p>
          <h1>Book a 45-minute discovery call.</h1>
          <p>
            Choose a date, select one official VOYD time, enter your business details, choose how VOYD should confirm,
            and review everything before you submit.
          </p>
          <div className="contact-hero-actions">
            <a className="whatsapp-button" href={bookingWhatsappUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={18} />
              Chat directly on WhatsApp
            </a>
            <a className="email-button" href={bookingInquiryEmailUrl}>
              <Mail size={18} />
              Send a general email
            </a>
          </div>
        </section>

        <section className="section single-booking-section">
          <Reveal>
            <div className="contact-card booking-card single-booking-card">
              <div className="calendar-placeholder">
                <strong>45-minute VOYD discovery call</strong>
                <p>Official availability: Monday through Saturday at 10:00 and 22:00 Europe/Berlin.</p>
                <small>Your timezone: {clientTimeZone}</small>
              </div>

              {availabilityLoading ? (
                <div className="booking-unavailable-card">
                  <strong>Checking availability.</strong>
                  <p>VOYD is preparing the current booking calendar.</p>
                </div>
              ) : null}

              {bookingUnavailable ? (
                <div className="booking-unavailable-card">
                  <AlertCircle size={24} />
                  <strong>{availability?.message || unavailableMessage}</strong>
                  <div className="contact-hero-actions">
                    <a className="whatsapp-button" href={bookingWhatsappUrl} target="_blank" rel="noreferrer">
                      <MessageCircle size={16} />
                      Chat on WhatsApp
                    </a>
                    <a className="email-button" href={bookingInquiryEmailUrl}>
                      <Mail size={16} />
                      Email VOYD
                    </a>
                  </div>
                </div>
              ) : null}

              {successBooking ? (
                <div className="booking-success-screen">
                  <CheckCircle2 size={28} />
                  <div>
                    <strong>Booking confirmed</strong>
                    <p>Your meeting time is reserved. VOYD will confirm the call using your preferred contact method.</p>
                    {!ownerNotificationSent ? <p>Email notification is being retried by VOYD.</p> : null}
                    {clientConfirmationEmailSent ? <p>A confirmation email with the calendar invite is on its way to you.</p> : null}
                  </div>
                  <dl>
                    <div>
                      <dt>Booking reference</dt>
                      <dd>{successBooking.bookingReference}</dd>
                    </div>
                    <div>
                      <dt>Selected product</dt>
                      <dd>{successBooking.selectedProduct}</dd>
                    </div>
                    <div>
                      <dt>Meeting date</dt>
                      <dd>{successBooking.clientDate}</dd>
                    </div>
                    <div>
                      <dt>Your local time</dt>
                      <dd>{successBooking.clientTime}</dd>
                    </div>
                    <div>
                      <dt>Europe/Berlin time</dt>
                      <dd>{successBooking.berlinDateTime}</dd>
                    </div>
                    <div>
                      <dt>Your timezone</dt>
                      <dd>{successBooking.clientTimezone}</dd>
                    </div>
                    <div>
                      <dt>Duration</dt>
                      <dd>{successBooking.durationMinutes} minutes</dd>
                    </div>
                    <div>
                      <dt>Preferred contact</dt>
                      <dd>{successBooking.preferredContactMethod}</dd>
                    </div>
                  </dl>
                  <div className="success-actions">
                    <button className="download-ics" type="button" onClick={() => downloadIcsFile(successIcs, "voyd-discovery.ics")}>
                      <Download size={15} />
                      Download calendar event
                    </button>
                    <a className="download-ics" href={successGoogleCalendarUrl} target="_blank" rel="noreferrer">
                      <CalendarPlus size={15} />
                      Add to calendar
                    </a>
                    <a className="whatsapp-button" href={bookingWhatsappUrl} target="_blank" rel="noreferrer">
                      <MessageCircle size={16} />
                      Contact VOYD on WhatsApp
                    </a>
                    <a
                      className="email-button"
                      href={`mailto:${bookingOwnerEmail}?subject=${encodeURIComponent(`Additional information for ${successBooking.bookingReference}`)}`}
                    >
                      <Mail size={16} />
                      Send additional information by email
                    </a>
                    <a className="email-button" href="/">
                      <Home size={16} />
                      Return to homepage
                    </a>
                  </div>
                </div>
              ) : null}

              {!availabilityLoading && !bookingUnavailable && !successBooking ? (
                <form className="booking-form single-booking-form" onSubmit={submitBooking} noValidate>
                  <input
                    className="hp-field"
                    tabIndex={-1}
                    autoComplete="off"
                    value={booking.honeypot}
                    onChange={(event) => updateBooking({ honeypot: event.target.value })}
                    aria-hidden="true"
                  />
                  <div className="booking-stepper" aria-label="Booking steps">
                    {stepLabels.map((label, index) => (
                      <button
                        key={label}
                        type="button"
                        disabled={index + 1 > step}
                        className={step === index + 1 ? "is-active" : step > index + 1 ? "is-complete" : ""}
                        onClick={() => {
                          if (index + 1 <= step) goToStep(index + 1);
                        }}
                      >
                        <span>{index + 1}</span>
                        {label}
                      </button>
                    ))}
                  </div>

                  {step === 1 ? (
                    <div className="booking-step-panel">
                      <strong>Step 1: Choose date</strong>
                      <div className="date-grid">
                        {(availability?.dates || []).map((date) => (
                          <button
                            key={date.dateKey}
                            type="button"
                            disabled={date.fullyBooked}
                            className={booking.dateKey === date.dateKey ? "is-selected" : ""}
                            onClick={() => {
                              updateBooking({ dateKey: date.dateKey, slotTime: "" });
                              goToStep(2);
                            }}
                          >
                            <span>{date.clientDate}</span>
                            <small>{date.berlinDate} Berlin</small>
                            <em>{date.fullyBooked ? "Fully booked" : `${date.remainingSlots} available`}</em>
                          </button>
                        ))}
                        {!availability?.dates.length ? (
                          <div className="empty-state compact-empty">
                            <span />
                            <strong>No dates available right now.</strong>
                            <small>Please contact VOYD directly by WhatsApp or email.</small>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="booking-step-panel">
                      <strong>Step 2: Choose time</strong>
                      {selectedDate ? (
                        <>
                          {selectedDate.remainingSlots === 1 ? <p className="slot-remaining-note">1 time remaining</p> : null}
                          <div className="slot-grid production-slot-grid" role="list" aria-label="Available discovery slots">
                            {selectedDate.slots.map((slot) => (
                              <button
                                key={slot.id}
                                type="button"
                                disabled={slot.status !== "available"}
                                className={booking.slotTime === slot.slotTime ? "is-selected" : ""}
                                onClick={() => {
                                  updateBooking({ slotTime: slot.slotTime });
                                  goToStep(3);
                                }}
                              >
                                <strong>{slot.client.time}</strong>
                                <span>Your local time</span>
                                <small>{slot.berlin.time} - Europe/Berlin</small>
                                <em>{slot.status === "available" ? `${bookingConfig.durationMinutes} min` : slot.status}</em>
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="empty-state compact-empty">
                          <span />
                          <strong>Choose a date first</strong>
                          <small>Then select one of the two official VOYD times.</small>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="booking-step-panel">
                      <strong>Step 3: Your details</strong>
                      <label>
                        Full name
                        <input value={booking.fullName} onChange={(event) => updateBooking({ fullName: event.target.value })} placeholder="Alex Morgan" />
                        {fieldErrors.fullName ? <small className="field-error">{fieldErrors.fullName}</small> : null}
                      </label>
                      <label>
                        Work email
                        <input value={booking.workEmail} onChange={(event) => updateBooking({ workEmail: event.target.value })} type="email" placeholder="alex@company.com" />
                        {fieldErrors.workEmail ? <small className="field-error">{fieldErrors.workEmail}</small> : null}
                      </label>
                      <label>
                        Phone or WhatsApp
                        <input value={booking.phoneOrWhatsapp} onChange={(event) => updateBooking({ phoneOrWhatsapp: event.target.value })} placeholder="+49 ..." />
                        {fieldErrors.phoneOrWhatsapp ? <small className="field-error">{fieldErrors.phoneOrWhatsapp}</small> : null}
                      </label>
                      <label>
                        Company
                        <input value={booking.company} onChange={(event) => updateBooking({ company: event.target.value })} placeholder="Company name" />
                        {fieldErrors.company ? <small className="field-error">{fieldErrors.company}</small> : null}
                      </label>
                      <label>
                        Business type
                        <select value={booking.businessType} onChange={(event) => updateBooking({ businessType: event.target.value })}>
                          <option value="">Select type</option>
                          <option>Restaurant / hospitality</option>
                          <option>Clinic / healthcare</option>
                          <option>Retail / commerce</option>
                          <option>Fitness / wellness</option>
                          <option>Professional services</option>
                          <option>Internal operations</option>
                        </select>
                        {fieldErrors.businessType ? <small className="field-error">{fieldErrors.businessType}</small> : null}
                      </label>
                      <label>
                        Company size
                        <select value={booking.companySize} onChange={(event) => updateBooking({ companySize: event.target.value })}>
                          <option value="">Select size</option>
                          <option>1-10</option>
                          <option>11-50</option>
                          <option>51-200</option>
                          <option>201-1000</option>
                          <option>1000+</option>
                        </select>
                        {fieldErrors.companySize ? <small className="field-error">{fieldErrors.companySize}</small> : null}
                      </label>
                      <label>
                        Selected VOYD product
                        <select value={booking.selectedProduct} onChange={(event) => updateBooking({ selectedProduct: event.target.value })}>
                          {productOptions.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Meeting topic
                        <input value={booking.meetingTopic} onChange={(event) => updateBooking({ meetingTopic: event.target.value })} />
                        {fieldErrors.meetingTopic ? <small className="field-error">{fieldErrors.meetingTopic}</small> : null}
                      </label>
                      <button
                        className="download-ics"
                        type="button"
                        onClick={() => {
                          if (validateDetails()) goToStep(4);
                        }}
                      >
                        Continue
                      </button>
                    </div>
                  ) : null}

                  {step === 4 ? (
                    <div className="booking-step-panel">
                      <strong>Step 4: Contact preference</strong>
                      <div className="contact-method-grid">
                        {(["Email", "WhatsApp"] as const).map((method) => (
                          <button
                            key={method}
                            type="button"
                            className={booking.preferredContactMethod === method ? "is-selected" : ""}
                            onClick={() => {
                              updateBooking({ preferredContactMethod: method });
                              goToStep(5);
                            }}
                          >
                            {method === "Email" ? <Mail size={17} /> : <MessageCircle size={17} />}
                            <span>{method}</span>
                            <small>{method === "Email" ? "VOYD will reply to your work email." : "VOYD will reply to your WhatsApp number."}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {step === 5 ? (
                    <div className="booking-step-panel">
                      <strong>Step 5: Review and confirm</strong>
                      <dl className="review-summary">
                        <div>
                          <dt>Full name</dt>
                          <dd>{booking.fullName}</dd>
                        </div>
                        <div>
                          <dt>Company</dt>
                          <dd>{booking.company}</dd>
                        </div>
                        <div>
                          <dt>Work email</dt>
                          <dd>{booking.workEmail}</dd>
                        </div>
                        <div>
                          <dt>Phone / WhatsApp</dt>
                          <dd>{booking.phoneOrWhatsapp}</dd>
                        </div>
                        <div>
                          <dt>Selected product</dt>
                          <dd>{booking.selectedProduct}</dd>
                        </div>
                        <div>
                          <dt>Meeting topic</dt>
                          <dd>{booking.meetingTopic}</dd>
                        </div>
                        <div>
                          <dt>Date</dt>
                          <dd>{selectedSlot?.client.date || "-"}</dd>
                        </div>
                        <div>
                          <dt>Your local time</dt>
                          <dd>{selectedSlot?.client.time || "-"}</dd>
                        </div>
                        <div>
                          <dt>Europe/Berlin time</dt>
                          <dd>{selectedSlot?.berlin.dateTime || "-"}</dd>
                        </div>
                        <div>
                          <dt>Your timezone</dt>
                          <dd>{clientTimeZone}</dd>
                        </div>
                        <div>
                          <dt>Duration</dt>
                          <dd>{bookingConfig.durationMinutes} minutes</dd>
                        </div>
                        <div>
                          <dt>Preferred contact</dt>
                          <dd>{booking.preferredContactMethod || "-"}</dd>
                        </div>
                      </dl>
                      <label>
                        Optional additional message
                        <textarea
                          value={booking.additionalMessage}
                          onChange={(event) => updateBooking({ additionalMessage: event.target.value })}
                          placeholder="Add context, goals, constraints, or team details."
                        />
                      </label>
                      <label className="consent-row">
                        <input type="checkbox" checked={booking.consent} onChange={(event) => updateBooking({ consent: event.target.checked })} />
                        I agree to be contacted by VOYD about this booking request.
                      </label>
                      <div className="secure-booking-note">
                        <ShieldCheck size={16} />
                        <span>The booking is submitted through the VOYD backend. WhatsApp is only your preferred confirmation method.</span>
                      </div>
                      <Button type="submit" icon={false} disabled={submitting}>
                        {submitting ? "Confirming booking..." : "Confirm booking"}
                      </Button>
                    </div>
                  ) : null}

                  {submitError ? (
                    <div className="form-state error">
                      <AlertCircle size={16} />
                      {submitError}
                    </div>
                  ) : null}
                </form>
              ) : null}
            </div>
          </Reveal>
        </section>
      </main>
    </PageTransition>
  );
}
