import { AlertCircle, CheckCircle2, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { products } from "../data/voyd";
import { Button } from "../components/voyd/Button";
import { PageTransition } from "../components/voyd/PageTransition";
import { Reveal } from "../components/voyd/Reveal";
import {
  addDaysToDateKey,
  bookingConfig,
  bookingInquiryEmailUrl,
  bookingOwnerEmail,
  bookingWhatsappNumber,
  bookingWhatsappUrl,
  buildSlotDisplay,
  dateKeyInTimeZone,
  dateKeyIsWorkingDay,
  formatDateOnlyInZone,
  getClientTimeZone,
  zonedTimeToUtc,
} from "../config/booking";

type ContactMethod = "Email" | "WhatsApp";

type BookingForm = {
  fullName: string;
  workEmail: string;
  phoneOrWhatsapp: string;
  company: string;
  businessType: string;
  companySize: string;
  selectedProduct: string;
  meetingTopic: string;
  preferredContactMethod: ContactMethod | "";
  additionalMessage: string;
  dateKey: string;
  slotTime: string;
  consent: boolean;
};

type RequestDate = {
  dateKey: string;
  berlinDate: string;
  disabled: boolean;
  reason: string;
};

type RequestSlot = {
  id: string;
  dateKey: string;
  slotTime: string;
  startsAt: string;
  client: {
    date: string;
    time: string;
    dateTime: string;
    timezone: string;
  };
  berlin: {
    date: string;
    time: string;
    dateTime: string;
    timezone: string;
  };
};

const storageKey = "voyd-booking-request-composer";
const stepLabels = ["Date", "Time", "Your details", "Contact preference", "Review"];

const emptyBooking: BookingForm = {
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
};

function emailIsValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function phoneIsValid(phone: string) {
  return phone.replace(/[^0-9]/g, "").length >= 6;
}

function getProductFromQuery(value: string | null) {
  if (!value) return "";
  const normalized = value.toLowerCase();
  return products.find((product) => product.id === normalized || product.name.toLowerCase() === normalized)?.name || "";
}

function readStoredState(productFromQuery: string) {
  if (typeof window === "undefined") return { booking: { ...emptyBooking, selectedProduct: productFromQuery || emptyBooking.selectedProduct }, step: 1, notice: "" };
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(storageKey) || "{}") as {
      booking?: Partial<BookingForm>;
      step?: number;
      notice?: string;
    };
    const booking = {
      ...emptyBooking,
      ...(parsed.booking || {}),
      selectedProduct: productFromQuery || parsed.booking?.selectedProduct || emptyBooking.selectedProduct,
    };
    return {
      booking,
      step: parsed.step && parsed.step >= 1 && parsed.step <= 5 ? parsed.step : 1,
      notice: parsed.notice || "",
    };
  } catch {
    return { booking: { ...emptyBooking, selectedProduct: productFromQuery || emptyBooking.selectedProduct }, step: 1, notice: "" };
  }
}

function buildRequestDates(now: Date): RequestDate[] {
  const todayKey = dateKeyInTimeZone(now, bookingConfig.timezone);
  return Array.from({ length: bookingConfig.bookingWindowDays }, (_, index) => {
    const dateKey = addDaysToDateKey(todayKey, index + 1);
    const previewStart = zonedTimeToUtc(dateKey, bookingConfig.dailySlots[0], bookingConfig.timezone);
    const isWorkingDay = dateKeyIsWorkingDay(dateKey);
    return {
      dateKey,
      berlinDate: formatDateOnlyInZone(previewStart, bookingConfig.timezone),
      disabled: !isWorkingDay,
      reason: isWorkingDay ? "Request date" : "Sunday unavailable",
    };
  });
}

function buildRequestSlots(dateKey: string, clientTimeZone: string): RequestSlot[] {
  if (!dateKey || !dateKeyIsWorkingDay(dateKey)) return [];
  return bookingConfig.dailySlots.map((slotTime) => {
    const startsAt = zonedTimeToUtc(dateKey, slotTime, bookingConfig.timezone).toISOString();
    const display = buildSlotDisplay(startsAt, clientTimeZone);
    return {
      id: `${dateKey}-${slotTime}`,
      dateKey,
      slotTime,
      startsAt,
      client: {
        date: display.clientDate,
        time: display.clientTime,
        dateTime: display.clientDateTime,
        timezone: clientTimeZone,
      },
      berlin: {
        date: display.berlinDate,
        time: display.berlinTime,
        dateTime: display.berlinDateTime,
        timezone: bookingConfig.timezone,
      },
    };
  });
}

function buildRequestMessage(booking: BookingForm, slot: RequestSlot | undefined, clientTimeZone: string) {
  return [
    "VOYD Discovery Call Request",
    "",
    `Name: ${booking.fullName}`,
    `Work email: ${booking.workEmail}`,
    `Phone / WhatsApp: ${booking.phoneOrWhatsapp}`,
    `Company: ${booking.company}`,
    `Business type: ${booking.businessType}`,
    `Company size: ${booking.companySize}`,
    `Selected product: ${booking.selectedProduct}`,
    `Meeting topic: ${booking.meetingTopic}`,
    `Preferred contact method: ${booking.preferredContactMethod}`,
    `Requested date: ${slot?.client.date || ""}`,
    `Client local time: ${slot?.client.time || ""}`,
    `Europe/Berlin time: ${slot?.berlin.dateTime || ""}`,
    `Meeting duration: ${bookingConfig.durationMinutes} minutes`,
    `Client timezone: ${clientTimeZone}`,
    `Additional message: ${booking.additionalMessage}`,
    "",
    "Please confirm whether this time is available.",
  ].join("\n");
}

function buildEmailSubject(booking: BookingForm, slot: RequestSlot | undefined) {
  return `VOYD Call Request — ${booking.selectedProduct} — ${slot?.client.date || ""} ${slot?.client.time || ""}`;
}

export default function ContactSalesPage() {
  const [searchParams] = useSearchParams();
  const productFromQuery = getProductFromQuery(searchParams.get("product"));
  const initialState = useMemo(() => readStoredState(productFromQuery), []);
  const clientTimeZone = useMemo(getClientTimeZone, []);
  const [booking, setBooking] = useState<BookingForm>(initialState.booking);
  const [step, setStep] = useState(initialState.step);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [openedNotice, setOpenedNotice] = useState(initialState.notice);

  const productOptions = useMemo(() => ["Operating System", ...products.map((product) => product.name)], []);
  const requestDates = useMemo(() => buildRequestDates(new Date()), []);
  const selectedDate = requestDates.find((date) => date.dateKey === booking.dateKey);
  const requestSlots = useMemo(() => buildRequestSlots(booking.dateKey, clientTimeZone), [booking.dateKey, clientTimeZone]);
  const selectedSlot = requestSlots.find((slot) => slot.slotTime === booking.slotTime);
  const preparedMessage = useMemo(() => buildRequestMessage(booking, selectedSlot, clientTimeZone), [booking, selectedSlot, clientTimeZone]);
  const emailSubject = useMemo(() => buildEmailSubject(booking, selectedSlot), [booking, selectedSlot]);

  useEffect(() => {
    if (!productFromQuery) return;
    setBooking((current) => ({ ...current, selectedProduct: productFromQuery }));
  }, [productFromQuery]);

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, JSON.stringify({ booking, step, notice: openedNotice }));
  }, [booking, step, openedNotice]);

  const goToStep = (nextStep: number) => {
    setSubmitError("");
    setStep(nextStep);
  };

  const updateBooking = (patch: Partial<BookingForm>) => {
    setBooking((current) => ({ ...current, ...patch }));
    setOpenedNotice("");
    setFieldErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key];
      return next;
    });
  };

  const validateDetails = () => {
    const errors: Record<string, string> = {};
    if (!booking.fullName.trim()) errors.fullName = "Please enter your full name.";
    if (!emailIsValid(booking.workEmail)) errors.workEmail = "Please enter a valid work email.";
    if (!phoneIsValid(booking.phoneOrWhatsapp)) errors.phoneOrWhatsapp = "Please enter a valid phone or WhatsApp number.";
    if (!booking.company.trim()) errors.company = "Please enter your company.";
    if (!booking.businessType) errors.businessType = "Please select a business type.";
    if (!booking.companySize) errors.companySize = "Please select a company size.";
    if (!booking.selectedProduct) errors.selectedProduct = "Please select a VOYD product.";
    if (!booking.meetingTopic.trim()) errors.meetingTopic = "Please enter a meeting topic.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateRequest = (method: ContactMethod) => {
    if (!booking.dateKey || selectedDate?.disabled) {
      setSubmitError("Please choose a future Monday through Saturday date.");
      setStep(1);
      return false;
    }
    if (!booking.slotTime || !selectedSlot) {
      setSubmitError("Please choose one of the two VOYD times.");
      setStep(2);
      return false;
    }
    if (!validateDetails()) {
      setSubmitError("Please complete your details before sending the request.");
      setStep(3);
      return false;
    }
    if (!method) {
      setSubmitError("Please choose Email or WhatsApp.");
      setStep(4);
      return false;
    }
    if (!booking.consent) {
      setSubmitError("Please accept contact consent before sending the request.");
      return false;
    }
    return true;
  };

  const openComposer = (method: ContactMethod) => {
    const requestBooking = { ...booking, preferredContactMethod: method };
    setBooking(requestBooking);
    if (!validateRequest(method)) return;

    const message = buildRequestMessage(requestBooking, selectedSlot, clientTimeZone);
    const subject = buildEmailSubject(requestBooking, selectedSlot);

    if (method === "Email") {
      const href = `mailto:${bookingOwnerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      const notice = "Your email application opened with the completed request. Please press Send to share it with VOYD.";
      window.sessionStorage.setItem(storageKey, JSON.stringify({ booking: requestBooking, step, notice }));
      setOpenedNotice(notice);
      window.location.href = href;
      return;
    }

    const href = `${bookingWhatsappUrl}?text=${encodeURIComponent(message)}`;
    const notice = "WhatsApp opened with the completed request. Please press Send to share it with VOYD.";
    window.sessionStorage.setItem(storageKey, JSON.stringify({ booking: requestBooking, step, notice }));
    setOpenedNotice(notice);
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <PageTransition>
      <main className="page contact-page">
        <section className="page-hero single-booking-hero">
          <p className="eyebrow">Book Discovery Call</p>
          <h1>Send a VOYD booking request.</h1>
          <p>
            Choose a future VOYD time, review the prepared request, then open Email or WhatsApp and manually press Send.
            VOYD will confirm the selected time.
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
                <p>Official request times: Monday through Saturday at 10:00 and 22:00 Europe/Berlin.</p>
                <small>Your timezone: {clientTimeZone}</small>
              </div>

              <form className="booking-form single-booking-form" onSubmit={(event) => event.preventDefault()} noValidate>
                <div className="booking-stepper" aria-label="Booking request steps">
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
                      {requestDates.map((date) => (
                        <button
                          key={date.dateKey}
                          type="button"
                          disabled={date.disabled}
                          className={booking.dateKey === date.dateKey ? "is-selected" : ""}
                          onClick={() => {
                            updateBooking({ dateKey: date.dateKey, slotTime: "" });
                            goToStep(2);
                          }}
                        >
                          <span>{date.berlinDate}</span>
                          <small>Europe/Berlin date</small>
                          <em>{date.reason}</em>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="booking-step-panel">
                    <strong>Step 2: Choose time</strong>
                    {selectedDate && !selectedDate.disabled ? (
                      <div className="slot-grid production-slot-grid" role="list" aria-label="VOYD request times">
                        {requestSlots.map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            className={booking.slotTime === slot.slotTime ? "is-selected" : ""}
                            onClick={() => {
                              updateBooking({ slotTime: slot.slotTime });
                              goToStep(3);
                            }}
                          >
                            <strong>{slot.client.time}</strong>
                            <span>Your local time</span>
                            <small>{slot.berlin.time} - Europe/Berlin</small>
                            <em>{bookingConfig.durationMinutes} minutes</em>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state compact-empty">
                        <span />
                        <strong>Choose a Monday through Saturday date first</strong>
                        <small>Then select 10:00 or 22:00 Europe/Berlin.</small>
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
                      {fieldErrors.selectedProduct ? <small className="field-error">{fieldErrors.selectedProduct}</small> : null}
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
                          <small>{method === "Email" ? "VOYD will reply to the work email." : "VOYD will reply to the provided WhatsApp number."}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {step === 5 ? (
                  <div className="booking-step-panel">
                    <strong>Step 5: Review and send booking request</strong>
                    <dl className="review-summary">
                      <div>
                        <dt>Name</dt>
                        <dd>{booking.fullName}</dd>
                      </div>
                      <div>
                        <dt>Company</dt>
                        <dd>{booking.company}</dd>
                      </div>
                      <div>
                        <dt>Selected product</dt>
                        <dd>{booking.selectedProduct}</dd>
                      </div>
                      <div>
                        <dt>Date</dt>
                        <dd>{selectedSlot?.client.date || "-"}</dd>
                      </div>
                      <div>
                        <dt>Client local time</dt>
                        <dd>{selectedSlot?.client.time || "-"}</dd>
                      </div>
                      <div>
                        <dt>Europe/Berlin time</dt>
                        <dd>{selectedSlot?.berlin.dateTime || "-"}</dd>
                      </div>
                      <div>
                        <dt>Duration</dt>
                        <dd>{bookingConfig.durationMinutes} minutes</dd>
                      </div>
                      <div>
                        <dt>Chosen method</dt>
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
                    <label>
                      Prepared request message
                      <textarea className="summary-message" value={preparedMessage} readOnly aria-label="Prepared booking request message" />
                    </label>
                    <label className="consent-row">
                      <input type="checkbox" checked={booking.consent} onChange={(event) => updateBooking({ consent: event.target.checked })} />
                      I agree to be contacted by VOYD about this booking request.
                    </label>
                    <div className="secure-booking-note">
                      <ShieldCheck size={16} />
                      <span>No meeting is confirmed automatically. VOYD will confirm the selected time after receiving your request.</span>
                    </div>
                    <div className="success-actions">
                      <Button type="button" icon={false} variant={booking.preferredContactMethod === "Email" ? "primary" : "secondary"} onClick={() => openComposer("Email")}>
                        Continue to Email
                      </Button>
                      <Button type="button" icon={false} variant={booking.preferredContactMethod === "WhatsApp" ? "primary" : "secondary"} onClick={() => openComposer("WhatsApp")}>
                        Continue to WhatsApp
                      </Button>
                    </div>
                    <small>Recipient: {booking.preferredContactMethod === "WhatsApp" ? bookingWhatsappNumber : bookingOwnerEmail}</small>
                  </div>
                ) : null}

                {openedNotice ? (
                  <div className="form-state">
                    <CheckCircle2 size={16} />
                    {openedNotice}
                  </div>
                ) : null}

                {submitError ? (
                  <div className="form-state error">
                    <AlertCircle size={16} />
                    {submitError}
                  </div>
                ) : null}
              </form>
            </div>
          </Reveal>
        </section>
      </main>
    </PageTransition>
  );
}
