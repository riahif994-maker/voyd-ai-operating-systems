import { AlertCircle, CalendarClock, CheckCircle2, Download, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { products } from "../data/voyd";
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
  available: boolean;
  message?: string;
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

function downloadTextFile(content: string, filename: string) {
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

async function fetchAvailability(visitorTimeZone: string) {
  const response = await fetch(`/api/booking?visitorTimeZone=${encodeURIComponent(visitorTimeZone)}`);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    return {
      ok: true,
      available: false,
      message: "Booking is temporarily unavailable.",
      timezone: bookingConfig.timezone,
      visitorTimeZone,
      durationMinutes: bookingConfig.durationMinutes,
      dates: [],
    } satisfies AvailabilityResponse;
  }
  return data as AvailabilityResponse;
}

async function submitBookingRequest(payload: unknown) {
  const response = await fetch("/api/booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error("Booking could not be completed. Please try again.");
  }
  return data as { booking: BookingSuccess; ics: string; message: string };
}

function getProductFromQuery(value: string | null) {
  if (!value) return "";
  const normalized = value.toLowerCase();
  return products.find((product) => product.id === normalized || product.name.toLowerCase() === normalized)?.name || "";
}

export default function ContactSalesPage() {
  const [searchParams] = useSearchParams();
  const visitorTimeZone = useMemo(getVisitorTimeZone, []);
  const [booking, setBooking] = useState<BookingForm>(initialBooking);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [successBooking, setSuccessBooking] = useState<BookingSuccess | null>(null);
  const [successIcs, setSuccessIcs] = useState("");

  const productOptions = useMemo(() => ["Operating System", ...products.map((product) => product.name)], []);
  const selectedDate = availability?.dates.find((date) => date.dateKey === booking.dateKey);
  const selectedSlot = selectedDate?.slots.find((slot) => slot.slotTime === booking.slotTime);
  const bookingUnavailable = !availabilityLoading && availability?.available === false;

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
    setAvailabilityLoading(true);
    const data = await fetchAvailability(visitorTimeZone);
    setAvailability(data);
    setAvailabilityLoading(false);
  };

  useEffect(() => {
    refreshAvailability();
  }, []);

  useEffect(() => {
    const selectedProduct = getProductFromQuery(searchParams.get("product"));
    if (!selectedProduct) return;
    setBooking((current) => ({ ...current, selectedProduct }));
  }, [searchParams]);

  const validateBooking = () => {
    if (!booking.dateKey) return "Please choose an available date.";
    if (!booking.slotTime || !selectedSlot) return "Please choose an available time.";
    if (selectedSlot.status !== "available") return "This time was just booked. Please choose another available time.";
    if (!booking.fullName.trim()) return "Please enter your full name.";
    if (!emailIsValid(booking.workEmail)) return "Please enter a valid work email.";
    if (!booking.phoneOrWhatsapp.trim()) return "Please enter your phone or WhatsApp number.";
    if (!booking.company.trim()) return "Please enter your company.";
    if (!booking.businessType || !booking.companySize || !booking.selectedProduct) return "Please complete the business details.";
    if (!booking.meetingTopic.trim()) return "Please enter a meeting topic.";
    if (!booking.preferredContactMethod) return "Please choose Email or WhatsApp.";
    if (!booking.consent) return "Please accept contact consent before submitting.";
    return "";
  };

  const submitBooking = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateBooking();
    if (validation) {
      setSubmitStatus("error");
      setSubmitMessage(validation);
      if (validation.includes("just booked")) refreshAvailability();
      return;
    }

    setSubmitStatus("submitting");
    setSubmitMessage("");
    try {
      const result = await submitBookingRequest({
        ...booking,
        visitorTimeZone,
        ...buildMeta(),
      });
      setSuccessBooking(result.booking);
      setSuccessIcs(result.ics);
      setSubmitStatus("idle");
      setSubmitMessage("");
      await refreshAvailability();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Booking could not be completed. Please try again.";
      setSubmitStatus("error");
      setSubmitMessage(message.includes("just booked") ? message : "Booking could not be completed. Please try again.");
      await refreshAvailability();
    }
  };

  const canContinueFromDetails =
    Boolean(booking.fullName) &&
    emailIsValid(booking.workEmail) &&
    Boolean(booking.phoneOrWhatsapp) &&
    Boolean(booking.company) &&
    Boolean(booking.businessType) &&
    Boolean(booking.companySize) &&
    Boolean(booking.selectedProduct) &&
    Boolean(booking.meetingTopic);

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
        <section className="page-hero single-booking-hero">
          <p className="eyebrow">Book Discovery Call</p>
          <h1>Reserve a VOYD discovery call.</h1>
          <p>
            Choose a date, select one official VOYD time, enter your business details, choose how VOYD should confirm,
            and review the request before submitting.
          </p>
          <div className="contact-hero-actions">
            <a className="whatsapp-button" href={bookingWhatsappUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={18} />
              Chat on WhatsApp
            </a>
            <a className="email-button" href={`mailto:${bookingOwnerEmail}`}>
              <Mail size={18} />
              {bookingOwnerEmail}
            </a>
          </div>
        </section>

        <section className="section single-booking-section">
          <Reveal>
            <div className="contact-card booking-card single-booking-card">
              <div className="calendar-placeholder">
                <CalendarClock size={22} />
                <strong>45-minute VOYD discovery call</strong>
                <p>Official availability: Monday through Saturday at 10:00 and 22:00 Europe/Berlin.</p>
                <small>Your timezone: {visitorTimeZone}</small>
              </div>

              {availabilityLoading ? (
                <div className="booking-unavailable-card">
                  <CalendarClock size={24} />
                  <strong>Checking availability.</strong>
                  <p>VOYD is preparing the current booking calendar.</p>
                </div>
              ) : null}

              {bookingUnavailable ? (
                <div className="booking-unavailable-card">
                  <AlertCircle size={24} />
                  <strong>Booking is temporarily unavailable.</strong>
                  <p>Please contact VOYD directly by email or WhatsApp.</p>
                  <div className="contact-hero-actions">
                    <a className="whatsapp-button" href={bookingWhatsappUrl} target="_blank" rel="noreferrer">
                      <MessageCircle size={16} />
                      Chat on WhatsApp
                    </a>
                    <a className="email-button" href={`mailto:${bookingOwnerEmail}`}>
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
                    <strong>Booking request received</strong>
                    <p>Your selected time has been reserved. VOYD will confirm the call using your preferred contact method.</p>
                    <p>Our team usually replies within one business day.</p>
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
                </div>
              ) : null}

              {!availabilityLoading && !bookingUnavailable && !successBooking ? (
                <form className="booking-form single-booking-form" onSubmit={submitBooking} noValidate>
                  <input
                    className="hp-field"
                    tabIndex={-1}
                    autoComplete="off"
                    value={booking.honeypot}
                    onChange={(event) => setBooking({ ...booking, honeypot: event.target.value })}
                    aria-hidden="true"
                  />
                  <div className="booking-stepper" aria-label="Booking steps">
                    {["Date", "Time", "Business details", "Communication", "Review"].map((label, index) => (
                      <button
                        key={label}
                        type="button"
                        className={step === index + 1 ? "is-active" : step > index + 1 ? "is-complete" : ""}
                        onClick={() => setStep(index + 1)}
                      >
                        <span>{index + 1}</span>
                        {label}
                      </button>
                    ))}
                  </div>

                  {step === 1 ? (
                    <div className="booking-step-panel">
                      <strong>Date</strong>
                      <div className="date-grid">
                        {(availability?.dates || []).map((date) => (
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
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="booking-step-panel">
                      <strong>Time</strong>
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
                          <strong>Choose a date first</strong>
                          <small>Then select one of the two official VOYD times.</small>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="booking-step-panel">
                      <strong>Business details</strong>
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
                      <button className="download-ics" type="button" disabled={!canContinueFromDetails} onClick={() => setStep(4)}>
                        Continue
                      </button>
                    </div>
                  ) : null}

                  {step === 4 ? (
                    <div className="booking-step-panel">
                      <strong>Communication method</strong>
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
                      <strong>Review</strong>
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
                      <Button type="submit" icon={false}>{submitStatus === "submitting" ? "Submitting..." : "Submit booking request"}</Button>
                    </div>
                  ) : null}

                  {submitStatus === "error" ? (
                    <div className="form-state error">
                      <AlertCircle size={16} />
                      {submitMessage}
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
