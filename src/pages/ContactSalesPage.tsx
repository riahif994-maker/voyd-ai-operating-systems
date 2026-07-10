import { CalendarClock, CheckCircle2, Code2, Download, Mail, Send } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { contactSignals, products } from "../data/voyd";
import { Button } from "../components/voyd/Button";
import { PageTransition } from "../components/voyd/PageTransition";
import { Reveal } from "../components/voyd/Reveal";

type SubmitState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
  delivered?: boolean;
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
  email: string;
  company: string;
  selectedProduct: string;
  meetingTopic: string;
  slotIso: string;
  slotLabel: string;
};

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
  email: "",
  company: "",
  selectedProduct: "Operating System",
  meetingTopic: "VOYD operating system discovery",
  slotIso: "",
  slotLabel: "",
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

function generateSlots() {
  const slots: Array<{ iso: string; label: string; day: string }> = [];
  const now = new Date();
  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  for (let offset = 1; slots.length < 18 && offset < 21; offset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    const day = date.getDay();
    if (day === 0 || day === 6) continue;

    for (const hour of [9, 9.5, 10, 10.5, 11, 14, 14.5, 15, 15.5, 16]) {
      const slot = new Date(date);
      slot.setHours(Math.floor(hour), hour % 1 ? 30 : 0, 0, 0);
      if (slot.getTime() <= Date.now()) continue;
      slots.push({
        iso: slot.toISOString(),
        label: formatter.format(slot),
        day: slot.toLocaleDateString(undefined, { weekday: "long" }),
      });
      if (slots.length >= 18) break;
    }
  }
  return slots;
}

function downloadIcs(ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "voyd-discovery.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function submitJson(endpoint: string, payload: unknown) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data as { delivered?: boolean; message?: string; ics?: string };
}

export default function ContactSalesPage() {
  const [lead, setLead] = useState<LeadForm>(initialLead);
  const [booking, setBooking] = useState<BookingForm>(initialBooking);
  const [leadState, setLeadState] = useState<SubmitState>({ status: "idle", message: "" });
  const [bookingState, setBookingState] = useState<SubmitState>({ status: "idle", message: "" });
  const [fallbackIcs, setFallbackIcs] = useState("");
  const slots = useMemo(generateSlots, []);
  const visitorTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);

  const productOptions = useMemo(() => ["Operating System", ...products.map((product) => product.name)], []);

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
      const result = await submitJson("/api/contact", { ...lead, ...buildMeta() });
      setLeadState({
        status: "success",
        delivered: result.delivered,
        message: result.delivered
          ? "Request sent. VOYD will reply within one business day."
          : result.message || "Local testing mode: request accepted, but email credentials are not configured.",
      });
      if (result.delivered) setLead(initialLead);
    } catch (error) {
      setLeadState({ status: "error", message: error instanceof Error ? error.message : "Could not submit request." });
    }
  };

  const submitBooking = async (event: FormEvent) => {
    event.preventDefault();
    if (!booking.fullName.trim() || !booking.company.trim() || !booking.meetingTopic.trim()) {
      setBookingState({ status: "error", message: "Please complete contact details and meeting topic." });
      return;
    }
    if (!emailIsValid(booking.email)) {
      setBookingState({ status: "error", message: "Please enter a valid booking email." });
      return;
    }
    if (!booking.slotIso) {
      setBookingState({ status: "error", message: "Please select a weekday 30-minute slot." });
      return;
    }

    setBookingState({ status: "loading", message: "Confirming booking..." });
    try {
      const result = await submitJson("/api/booking", { ...booking, timeZone: visitorTimeZone, ...buildMeta() });
      if (result.ics) setFallbackIcs(result.ics);
      setBookingState({
        status: "success",
        delivered: result.delivered,
        message: result.delivered
          ? "Booking request sent with calendar attachment."
          : result.message || "Local testing mode: booking accepted, but email credentials are not configured.",
      });
    } catch (error) {
      setBookingState({ status: "error", message: error instanceof Error ? error.message : "Could not submit booking." });
    }
  };

  return (
    <PageTransition>
      <main className="page contact-page">
        <section className="page-hero">
          <p className="eyebrow">Contact Sales</p>
          <h1>Bring VOYD a messy workflow. Leave with an operating system plan.</h1>
          <p>
            Submit a qualified request or book a discovery slot. Email delivery is handled server-side when credentials
            are configured; local development clearly reports fallback mode.
          </p>
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
                    <option>Under €5k</option>
                    <option>€5k-€15k</option>
                    <option>€15k-€50k</option>
                    <option>€50k+</option>
                    <option>Not sure yet</option>
                  </select>
                </label>
              </div>
              <label>
                Preferred contact method
                <select value={lead.preferredContact} onChange={(event) => setLead({ ...lead, preferredContact: event.target.value })}>
                  <option value="">Select method</option>
                  <option>Email</option>
                  <option>Phone</option>
                  <option>Video call</option>
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
                  {leadState.message}
                </div>
              ) : null}
            </form>
          </Reveal>

          <Reveal delay={0.1}>
            <aside className="contact-card booking-card">
              <div className="calendar-placeholder">
                <CalendarClock size={22} />
                <strong>Native discovery booking</strong>
                <p>Weekday 30-minute slots are generated in your local timezone and past dates are blocked.</p>
                <small>Timezone: {visitorTimeZone}</small>
              </div>
              <form className="booking-form" onSubmit={submitBooking}>
                <label>
                  Full name
                  <input value={booking.fullName} onChange={(event) => setBooking({ ...booking, fullName: event.target.value })} placeholder="Alex Morgan" />
                </label>
                <label>
                  Email
                  <input value={booking.email} onChange={(event) => setBooking({ ...booking, email: event.target.value })} type="email" placeholder="alex@company.com" />
                </label>
                <label>
                  Company
                  <input value={booking.company} onChange={(event) => setBooking({ ...booking, company: event.target.value })} placeholder="Company name" />
                </label>
                <label>
                  Product
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
                <div className="slot-grid" role="list" aria-label="Available discovery slots">
                  {slots.slice(0, 9).map((slot) => (
                    <button
                      className={booking.slotIso === slot.iso ? "is-selected" : ""}
                      key={slot.iso}
                      type="button"
                      onClick={() => setBooking({ ...booking, slotIso: slot.iso, slotLabel: slot.label })}
                    >
                      <small>{slot.day}</small>
                      {slot.label}
                    </button>
                  ))}
                </div>
                <Button type="submit" icon={false}>Confirm booking request</Button>
                {fallbackIcs ? (
                  <button className="download-ics" type="button" onClick={() => downloadIcs(fallbackIcs)}>
                    <Download size={15} />
                    Download calendar event
                  </button>
                ) : null}
                {bookingState.status !== "idle" ? (
                  <div className={`form-state ${bookingState.status}`}>
                    {bookingState.status === "success" ? <CheckCircle2 size={16} /> : null}
                    {bookingState.message}
                  </div>
                ) : null}
              </form>
              <div className="contact-links">
                <a href="mailto:sales@voyd.ai">
                  <Mail size={16} />
                  sales@voyd.ai
                </a>
                <a href="https://github.com/riahif994-maker">
                  <Code2 size={16} />
                  GitHub
                </a>
                <a href="https://www.linkedin.com">
                  <Send size={16} />
                  LinkedIn
                </a>
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
