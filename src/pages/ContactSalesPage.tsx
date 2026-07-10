import { AlertCircle, CalendarClock, CheckCircle2, Clock3, Download, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { contactSignals, products } from "../data/voyd";
import { Button } from "../components/voyd/Button";
import { PageTransition } from "../components/voyd/PageTransition";
import { Reveal } from "../components/voyd/Reveal";
import {
  bookingConfig,
  bookingOwnerEmail,
  bookingWhatsappNumber,
  bookingWhatsappUrl,
  createIcsEvent,
  getVisitorTimeZone,
} from "../config/booking";

type SubmitState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

type LeadForm = {
  fullName: string;
  email: string;
  company: string;
  phone: string;
  businessType: string;
  companySize: string;
  selectedProduct: string;
  budgetRange: string;
  preferredContact: string;
  message: string;
  consent: boolean;
  honeypot: string;
};

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

type AvailabilitySlot = {
  id: string;
  dateKey: string;
  slotTime: string;
  startsAt: string;
  endsAt: string;
  status: "available" | "booked" | "blocked";
  visitor: {
    timezone: string;
    date: string;
    time: string;
    dateTime: string;
  };
  berlin: {
    timezone: string;
    date: string;
    time: string;
    dateTime: string;
  };
};

type AvailabilityDate = {
  dateKey: string;
  berlinDate: string;
  visitorDate: string;
  fullyBooked: boolean;
  remainingSlots: number;
  slots: AvailabilitySlot[];
};

type AvailabilityResponse = {
  ok: boolean;
  configured: boolean;
  timezone: string;
  visitorTimeZone: string;
  durationMinutes: number;
  dates: AvailabilityDate[];
};

type BookingSuccess = {
  bookingReference: string;
  selectedProduct: string;
  visitorDate: string;
  visitorTime: string;
  berlinDateTime: string;
  durationMinutes: number;
  preferredContactMethod: string;
  startsAt: string;
};

const contactEmail = bookingOwnerEmail;
const whatsappNumber = bookingWhatsappNumber;
const whatsappUrl = bookingWhatsappUrl;
const replyExpectation = "Our team usually replies within one business day.";

const initialLead: LeadForm = {
  fullName: "",
  email: "",
  company: "",
  phone: "",
  businessType: "",
  companySize: "",
  selectedProduct: "Operating System",
  budgetRange: "",
  preferredContact: "",
  message: "",
  consent: false,
  honeypot: "",
};

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

function emailIsValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildMeta() {
  return {
    sourcePage: window.location.href,
    browserLanguage: navigator.language,
    referrer: document.referrer,
  };
}

function downloadTextFile(content: string, filename: string, type = "text/calendar;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function submitJson<T>(endpoint: string, payload: unknown) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data as T;
}

async function fetchAvailability(visitorTimeZone: string) {
  const response = await fetch(`/api/availability?visitorTimeZone=${encodeURIComponent(visitorTimeZone)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not load availability.");
  return data as AvailabilityResponse;
}

function getProductFromQuery(value: string | null) {
  if (!value) return "";
  const normalized = value.toLowerCase();
  return products.find((product) => product.id === normalized || product.name.toLowerCase() === normalized)?.name || "";
}

export default function ContactSalesPage() {
  const [searchParams] = useSearchParams();
  const visitorTimeZone = useMemo(getVisitorTimeZone, []);
  const [lead, setLead] = useState<LeadForm>(initialLead);
  const [booking, setBooking] = useState<BookingForm>(initialBooking);
  const [leadState, setLeadState] = useState<SubmitState>({ status: "idle", message: "" });
  const [bookingState, setBookingState] = useState<SubmitState>({ status: "idle", message: "" });
  const [availabilityState, setAvailabilityState] = useState<SubmitState>({ status: "loading", message: "Loading availability..." });
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [step, setStep] = useState(1);
  const [successBooking, setSuccessBooking] = useState<BookingSuccess | null>(null);
  const [successIcs, setSuccessIcs] = useState("");

  const productOptions = useMemo(() => ["Operating System", ...products.map((product) => product.name)], []);
  const selectedDate = availability?.dates.find((date) => date.dateKey === booking.dateKey);
  const selectedSlot = selectedDate?.slots.find((slot) => slot.slotTime === booking.slotTime);
  const availableDates = availability?.dates || [];

  const summaryMessage = useMemo(() => {
    return [
      "VOYD Discovery Call Request",
      "",
      `Name: ${booking.fullName || "-"}`,
      `Work email: ${booking.workEmail || "-"}`,
      `Phone / WhatsApp: ${booking.phoneOrWhatsapp || "-"}`,
      `Company: ${booking.company || "-"}`,
      `Business type: ${booking.businessType || "-"}`,
      `Company size: ${booking.companySize || "-"}`,
      `Selected product: ${booking.selectedProduct || "-"}`,
      `Meeting topic: ${booking.meetingTopic || "-"}`,
      `Preferred contact method: ${booking.preferredContactMethod || "-"}`,
      `Requested date: ${selectedSlot?.visitor.date || "-"}`,
      `Visitor local time: ${selectedSlot?.visitor.time || "-"}`,
      `Europe/Berlin time: ${selectedSlot?.berlin.dateTime || "-"}`,
      `Meeting duration: ${bookingConfig.durationMinutes} minutes`,
      `Visitor timezone: ${visitorTimeZone}`,
      `Additional message: ${booking.additionalMessage || "-"}`,
    ].join("\n");
  }, [booking, selectedSlot, visitorTimeZone]);

  const refreshAvailability = async () => {
    setAvailabilityState({ status: "loading", message: "Loading availability..." });
    try {
      const data = await fetchAvailability(visitorTimeZone);
      setAvailability(data);
      setAvailabilityState({
        status: "success",
        message: data.configured ? "Live availability loaded." : "Live database configuration is missing. Booking submission will be disabled.",
      });
    } catch (error) {
      setAvailabilityState({ status: "error", message: error instanceof Error ? error.message : "Could not load availability." });
    }
  };

  useEffect(() => {
    refreshAvailability();
  }, []);

  useEffect(() => {
    const selectedProduct = getProductFromQuery(searchParams.get("product"));
    if (!selectedProduct) return;
    setLead((current) => ({ ...current, selectedProduct }));
    setBooking((current) => ({ ...current, selectedProduct }));
  }, [searchParams]);

  const submitLead = async (event: FormEvent) => {
    event.preventDefault();
    if (!lead.fullName.trim() || !lead.company.trim() || !lead.message.trim()) {
      setLeadState({ status: "error", message: "Please complete your name, company, and message." });
      return;
    }
    if (!emailIsValid(lead.email)) {
      setLeadState({ status: "error", message: "Please enter a valid work email." });
      return;
    }
    if (!lead.businessType || !lead.companySize || !lead.budgetRange || !lead.preferredContact) {
      setLeadState({ status: "error", message: "Please select business type, company size, budget, and contact method." });
      return;
    }
    if (!lead.consent) {
      setLeadState({ status: "error", message: "Consent is required before submitting." });
      return;
    }

    setLeadState({ status: "loading", message: "Sending request..." });
    try {
      const result = await submitJson<{ message?: string }>("/api/contact", { ...lead, ...buildMeta() });
      setLeadState({ status: "success", message: result.message || `Request sent. ${replyExpectation}` });
      setLead(initialLead);
    } catch (error) {
      setLeadState({ status: "error", message: error instanceof Error ? error.message : "Could not submit request." });
    }
  };

  const validateBooking = () => {
    if (!booking.dateKey) return "Please choose an available date.";
    if (!booking.slotTime || !selectedSlot) return "Please choose one available VOYD time.";
    if (selectedSlot.status !== "available") return "This time was just booked. Please choose another available time.";
    if (!booking.fullName.trim() || !booking.company.trim() || !booking.meetingTopic.trim()) {
      return "Please complete your name, company, and meeting topic.";
    }
    if (!emailIsValid(booking.workEmail)) return "Please enter a valid work email.";
    if (!booking.phoneOrWhatsapp.trim()) return "Please enter a phone or WhatsApp number.";
    if (!booking.businessType || !booking.companySize || !booking.selectedProduct) return "Please complete the business details.";
    if (!booking.preferredContactMethod) return "Please choose Email or WhatsApp as the preferred contact method.";
    if (!booking.consent) return "Consent is required before submitting.";
    return "";
  };

  const submitBooking = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateBooking();
    if (validation) {
      setBookingState({ status: "error", message: validation });
      if (validation.includes("just booked")) refreshAvailability();
      return;
    }

    setBookingState({ status: "loading", message: "Submitting booking request..." });
    try {
      const result = await submitJson<{
        booking: BookingSuccess;
        ics: string;
        message: string;
      }>("/api/booking", {
        ...booking,
        visitorTimeZone,
        ...buildMeta(),
      });
      setSuccessBooking(result.booking);
      setSuccessIcs(result.ics);
      setBookingState({ status: "success", message: result.message });
      await refreshAvailability();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not submit booking.";
      setBookingState({ status: "error", message });
      if (message.includes("just booked") || message.includes("available")) refreshAvailability();
    }
  };

  const goToStep = (nextStep: number) => {
    setBookingState({ status: "idle", message: "" });
    setStep(nextStep);
  };

  const canContinueFromDetails =
    booking.fullName &&
    emailIsValid(booking.workEmail) &&
    booking.phoneOrWhatsapp &&
    booking.company &&
    booking.businessType &&
    booking.companySize &&
    booking.selectedProduct &&
    booking.meetingTopic;

  const successIcsForDownload =
    successIcs ||
    (successBooking
      ? createIcsEvent({
          reference: successBooking.bookingReference,
          fullName: booking.fullName,
          email: booking.workEmail,
          selectedProduct: successBooking.selectedProduct,
          meetingTopic: booking.meetingTopic,
          startsAtIso: successBooking.startsAt,
        })
      : "");

  return (
    <PageTransition>
      <main className="page contact-page">
        <section className="page-hero">
          <p className="eyebrow">Contact Sales</p>
          <h1>Bring VOYD a messy workflow. Leave with an operating system plan.</h1>
          <p>
            Submit a qualified request or reserve a real 45-minute VOYD discovery call. Availability follows the
            official Europe/Berlin schedule and converts every slot into your local timezone.
          </p>
          <div className="contact-hero-actions">
            <a className="whatsapp-button" href={whatsappUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={18} />
              Chat on WhatsApp
            </a>
            <a className="email-button" href={`mailto:${contactEmail}`}>
              <Mail size={18} />
              {contactEmail}
            </a>
          </div>
          <p className="contact-response-note">{replyExpectation}</p>
        </section>

        <section className="contact-layout productized-contact">
          <Reveal>
            <form className="sales-form" onSubmit={submitLead} noValidate>
              <input
                className="hp-field"
                tabIndex={-1}
                autoComplete="off"
                value={lead.honeypot}
                onChange={(event) => setLead({ ...lead, honeypot: event.target.value })}
                aria-hidden="true"
              />
              <div>
                <label>
                  Full name
                  <input value={lead.fullName} onChange={(event) => setLead({ ...lead, fullName: event.target.value })} placeholder="Alex Morgan" />
                </label>
                <label>
                  Work email
                  <input value={lead.email} onChange={(event) => setLead({ ...lead, email: event.target.value })} placeholder="alex@company.com" type="email" />
                </label>
              </div>
              <div>
                <label>
                  Company
                  <input value={lead.company} onChange={(event) => setLead({ ...lead, company: event.target.value })} placeholder="Company name" />
                </label>
                <label>
                  Phone optional
                  <input value={lead.phone} onChange={(event) => setLead({ ...lead, phone: event.target.value })} placeholder="+49 ..." />
                </label>
              </div>
              <div>
                <label>
                  Business type
                  <select value={lead.businessType} onChange={(event) => setLead({ ...lead, businessType: event.target.value })}>
                    <option value="">Select type</option>
                    <option>Restaurant / hospitality</option>
                    <option>Clinic / healthcare</option>
                    <option>Retail / commerce</option>
                    <option>Fitness / wellness</option>
                    <option>Professional services</option>
                    <option>Internal operations</option>
                  </select>
                </label>
                <label>
                  Company size
                  <select value={lead.companySize} onChange={(event) => setLead({ ...lead, companySize: event.target.value })}>
                    <option value="">Select size</option>
                    <option>1-10</option>
                    <option>11-50</option>
                    <option>51-200</option>
                    <option>201-1000</option>
                    <option>1000+</option>
                  </select>
                </label>
              </div>
              <div>
                <label>
                  Selected product
                  <select value={lead.selectedProduct} onChange={(event) => setLead({ ...lead, selectedProduct: event.target.value })}>
                    {productOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Budget range
                  <select value={lead.budgetRange} onChange={(event) => setLead({ ...lead, budgetRange: event.target.value })}>
                    <option value="">Select range</option>
                    <option>Under EUR 5k</option>
                    <option>EUR 5k-15k</option>
                    <option>EUR 15k-50k</option>
                    <option>EUR 50k+</option>
                    <option>Not sure yet</option>
                  </select>
                </label>
              </div>
              <label>
                Preferred contact method
                <select value={lead.preferredContact} onChange={(event) => setLead({ ...lead, preferredContact: event.target.value })}>
                  <option value="">Select method</option>
                  <option>Email</option>
                  <option>WhatsApp</option>
                </select>
              </label>
              <label>
                Message
                <textarea value={lead.message} onChange={(event) => setLead({ ...lead, message: event.target.value })} placeholder="Describe the workflow, software problem, users, and desired outcome." />
              </label>
              <label className="consent-row">
                <input type="checkbox" checked={lead.consent} onChange={(event) => setLead({ ...lead, consent: event.target.checked })} />
                I agree to be contacted by VOYD about this request.
              </label>
              <Button type="submit" icon={false}>Send request</Button>
              {leadState.status !== "idle" ? (
                <div className={`form-state ${leadState.status}`}>
                  {leadState.status === "success" ? <CheckCircle2 size={16} /> : null}
                  {leadState.status === "error" ? <AlertCircle size={16} /> : null}
                  {leadState.message}
                </div>
              ) : null}
            </form>
          </Reveal>

          <Reveal delay={0.1}>
            <aside className="contact-card booking-card production-booking-card">
              <div className="calendar-placeholder">
                <CalendarClock size={22} />
                <strong>Book a 45-minute VOYD discovery call</strong>
                <p>Official VOYD availability: Monday through Saturday at 10:00 and 22:00 Europe/Berlin.</p>
                <small>Your timezone: {visitorTimeZone}</small>
              </div>

              {successBooking ? (
                <div className="booking-success-screen">
                  <CheckCircle2 size={28} />
                  <div>
                    <strong>Booking request received</strong>
                    <p>Your selected time has been reserved. VOYD will confirm the call using your preferred contact method.</p>
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
                      <dt>Your date</dt>
                      <dd>{successBooking.visitorDate}</dd>
                    </div>
                    <div>
                      <dt>Your time</dt>
                      <dd>{successBooking.visitorTime}</dd>
                    </div>
                    <div>
                      <dt>Europe/Berlin</dt>
                      <dd>{successBooking.berlinDateTime}</dd>
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
                  <button className="download-ics" type="button" onClick={() => downloadTextFile(successIcsForDownload, "voyd-discovery.ics")}>
                    <Download size={15} />
                    Download calendar event
                  </button>
                  <a className="whatsapp-button" href={whatsappUrl} target="_blank" rel="noreferrer">
                    <MessageCircle size={16} />
                    Contact VOYD on WhatsApp
                  </a>
                  <a className="email-button" href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Additional information for ${successBooking.bookingReference}`)}`}>
                    <Mail size={16} />
                    Send additional information by email
                  </a>
                </div>
              ) : (
                <form className="booking-form production-booking-form" onSubmit={submitBooking} noValidate>
                  <input
                    className="hp-field"
                    tabIndex={-1}
                    autoComplete="off"
                    value={booking.honeypot}
                    onChange={(event) => setBooking({ ...booking, honeypot: event.target.value })}
                    aria-hidden="true"
                  />
                  <div className="booking-stepper" aria-label="Booking steps">
                    {["Date", "Time", "Details", "Contact", "Review"].map((label, index) => (
                      <button
                        key={label}
                        type="button"
                        className={step === index + 1 ? "is-active" : step > index + 1 ? "is-complete" : ""}
                        onClick={() => goToStep(index + 1)}
                      >
                        <span>{index + 1}</span>
                        {label}
                      </button>
                    ))}
                  </div>

                  {availabilityState.status !== "idle" ? (
                    <div className={`form-state ${availabilityState.status}`}>
                      {availabilityState.status === "success" ? <CheckCircle2 size={16} /> : null}
                      {availabilityState.status === "error" ? <AlertCircle size={16} /> : null}
                      {availabilityState.status === "loading" ? <Clock3 size={16} /> : null}
                      {availabilityState.message}
                    </div>
                  ) : null}

                  {step === 1 ? (
                    <div className="booking-step-panel">
                      <strong>Step 1: Choose date</strong>
                      <div className="date-grid">
                        {availableDates.map((date) => (
                          <button
                            key={date.dateKey}
                            type="button"
                            disabled={date.fullyBooked}
                            className={booking.dateKey === date.dateKey ? "is-selected" : ""}
                            onClick={() => {
                              setBooking({ ...booking, dateKey: date.dateKey, slotTime: "" });
                              setStep(2);
                            }}
                          >
                            <span>{date.visitorDate}</span>
                            <small>{date.berlinDate} Berlin</small>
                            <em>{date.fullyBooked ? "Fully booked" : `${date.remainingSlots} available`}</em>
                          </button>
                        ))}
                      </div>
                      <button className="download-ics" type="button" onClick={refreshAvailability}>Refresh availability</button>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="booking-step-panel">
                      <strong>Step 2: Choose time</strong>
                      {selectedDate ? (
                        <div className="slot-grid production-slot-grid" role="list" aria-label="Available discovery slots">
                          {selectedDate.slots.map((slot) => (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={slot.status !== "available"}
                              className={booking.slotTime === slot.slotTime ? "is-selected" : ""}
                              onClick={() => {
                                setBooking({ ...booking, slotTime: slot.slotTime });
                                setStep(3);
                              }}
                            >
                              <strong>{slot.visitor.time}</strong>
                              <span>Your local time</span>
                              <small>{slot.berlin.time} - Europe/Berlin</small>
                              <em>{slot.status === "available" ? `${bookingConfig.durationMinutes} min` : slot.status}</em>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state compact-empty">
                          <span />
                          <strong>No date selected</strong>
                          <small>Choose a date first to see the two official VOYD times.</small>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="booking-step-panel">
                      <strong>Step 3: Enter business and contact details</strong>
                      <label>
                        Full name
                        <input value={booking.fullName} onChange={(event) => setBooking({ ...booking, fullName: event.target.value })} placeholder="Alex Morgan" />
                      </label>
                      <label>
                        Work email
                        <input value={booking.workEmail} onChange={(event) => setBooking({ ...booking, workEmail: event.target.value })} type="email" placeholder="alex@company.com" />
                      </label>
                      <label>
                        Phone or WhatsApp
                        <input value={booking.phoneOrWhatsapp} onChange={(event) => setBooking({ ...booking, phoneOrWhatsapp: event.target.value })} placeholder="+49 ..." />
                      </label>
                      <label>
                        Company
                        <input value={booking.company} onChange={(event) => setBooking({ ...booking, company: event.target.value })} placeholder="Company name" />
                      </label>
                      <label>
                        Business type
                        <select value={booking.businessType} onChange={(event) => setBooking({ ...booking, businessType: event.target.value })}>
                          <option value="">Select type</option>
                          <option>Restaurant / hospitality</option>
                          <option>Clinic / healthcare</option>
                          <option>Retail / commerce</option>
                          <option>Fitness / wellness</option>
                          <option>Professional services</option>
                          <option>Internal operations</option>
                        </select>
                      </label>
                      <label>
                        Company size
                        <select value={booking.companySize} onChange={(event) => setBooking({ ...booking, companySize: event.target.value })}>
                          <option value="">Select size</option>
                          <option>1-10</option>
                          <option>11-50</option>
                          <option>51-200</option>
                          <option>201-1000</option>
                          <option>1000+</option>
                        </select>
                      </label>
                      <label>
                        Selected VOYD product
                        <select value={booking.selectedProduct} onChange={(event) => setBooking({ ...booking, selectedProduct: event.target.value })}>
                          {productOptions.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Meeting topic
                        <input value={booking.meetingTopic} onChange={(event) => setBooking({ ...booking, meetingTopic: event.target.value })} />
                      </label>
                      <button className="download-ics" type="button" disabled={!canContinueFromDetails} onClick={() => goToStep(4)}>
                        Continue to contact method
                      </button>
                    </div>
                  ) : null}

                  {step === 4 ? (
                    <div className="booking-step-panel">
                      <strong>Step 4: Choose preferred communication method</strong>
                      <div className="contact-method-grid">
                        {(["Email", "WhatsApp"] as const).map((method) => (
                          <button
                            key={method}
                            type="button"
                            className={booking.preferredContactMethod === method ? "is-selected" : ""}
                            onClick={() => {
                              setBooking({ ...booking, preferredContactMethod: method });
                              setStep(5);
                            }}
                          >
                            {method === "Email" ? <Mail size={17} /> : <MessageCircle size={17} />}
                            <span>{method}</span>
                            <small>VOYD will use this method to confirm the call.</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {step === 5 ? (
                    <div className="booking-step-panel">
                      <strong>Step 5: Review and submit</strong>
                      <textarea className="summary-message" value={summaryMessage} readOnly aria-label="Booking summary message" />
                      <label>
                        Optional additional message
                        <textarea
                          value={booking.additionalMessage}
                          onChange={(event) => setBooking({ ...booking, additionalMessage: event.target.value })}
                          placeholder="Add context, goals, constraints, or team details."
                        />
                      </label>
                      <label className="consent-row">
                        <input type="checkbox" checked={booking.consent} onChange={(event) => setBooking({ ...booking, consent: event.target.checked })} />
                        I agree to be contacted by VOYD about this booking request.
                      </label>
                      <div className="secure-booking-note">
                        <ShieldCheck size={16} />
                        <span>The booking is submitted through the VOYD backend. WhatsApp is only your preferred confirmation method.</span>
                      </div>
                      <Button type="submit" icon={false}>Submit booking request</Button>
                    </div>
                  ) : null}

                  {bookingState.status !== "idle" ? (
                    <div className={`form-state ${bookingState.status}`}>
                      {bookingState.status === "success" ? <CheckCircle2 size={16} /> : null}
                      {bookingState.status === "error" ? <AlertCircle size={16} /> : null}
                      {bookingState.status === "loading" ? <Clock3 size={16} /> : null}
                      {bookingState.message}
                    </div>
                  ) : null}
                </form>
              )}

              <div className="contact-links">
                <a href={`mailto:${contactEmail}`}>
                  <Mail size={16} />
                  {contactEmail}
                </a>
                <a className="whatsapp-link" href={whatsappUrl} target="_blank" rel="noreferrer">
                  <MessageCircle size={16} />
                  Chat on WhatsApp
                </a>
                <span>{whatsappNumber}</span>
              </div>
              <div className="signal-list">
                <strong>Useful context</strong>
                {contactSignals.map((signal) => (
                  <span key={signal}>{signal}</span>
                ))}
              </div>
            </aside>
          </Reveal>
        </section>
      </main>
    </PageTransition>
  );
}
