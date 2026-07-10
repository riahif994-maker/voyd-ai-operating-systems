import { AlertCircle, CalendarDays, CheckCircle2, Copy, Download, LogOut, Mail, MessageCircle, Search, ShieldCheck, XCircle } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { bookingConfig, bookingOwnerEmail, createIcsEvent, formatDateOnlyInZone, formatDateTimeInZone } from "../config/booking";
import { Button } from "../components/voyd/Button";
import { PageTransition } from "../components/voyd/PageTransition";
import { Reveal } from "../components/voyd/Reveal";

type AdminSession = {
  accessToken: string;
  expiresAt?: number;
  email?: string;
};

type BookingRecord = {
  id: string;
  booking_reference: string;
  starts_at: string;
  ends_at: string;
  voyd_timezone: string;
  visitor_timezone: string;
  full_name: string;
  work_email: string;
  phone_or_whatsapp: string;
  company: string;
  business_type: string;
  company_size: string;
  selected_product: string;
  meeting_topic: string;
  preferred_contact_method: string;
  additional_message: string | null;
  status: "new" | "confirmed" | "completed" | "cancelled" | "no_show";
  source_page: string | null;
  referrer: string | null;
  private_notes: string | null;
  created_at: string;
  updated_at: string;
};

type BlockRecord = {
  id: string;
  block_type: "date" | "slot";
  block_date: string;
  slot_time: string | null;
  reason: string | null;
  created_by: string | null;
};

const sessionKey = "voyd-admin-session";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

function readStoredSession(): AdminSession | null {
  const raw = localStorage.getItem(sessionKey);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AdminSession;
    if (!session.accessToken) return null;
    if (session.expiresAt && session.expiresAt * 1000 < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

function parseHashSession(): AdminSession | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  if (!accessToken) return null;
  const expiresAt = Number(hash.get("expires_at") || 0) || undefined;
  window.history.replaceState(null, "", window.location.pathname);
  return { accessToken, expiresAt };
}

function saveSession(session: AdminSession | null) {
  if (!session) {
    localStorage.removeItem(sessionKey);
    return;
  }
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "https://wa.me/4917686606120";
}

function downloadIcs(booking: BookingRecord) {
  const ics = createIcsEvent({
    reference: booking.booking_reference,
    fullName: booking.full_name,
    email: booking.work_email,
    selectedProduct: booking.selected_product,
    meetingTopic: booking.meeting_topic,
    startsAtIso: booking.starts_at,
  });
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${booking.booking_reference}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminBookingsPage() {
  const [session, setSession] = useState<AdminSession | null>(() => parseHashSession() || readStoredSession());
  const [email, setEmail] = useState<string>(bookingOwnerEmail);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [blocks, setBlocks] = useState<BlockRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [blockDate, setBlockDate] = useState("");
  const [blockSlot, setBlockSlot] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const configured = Boolean(supabaseUrl && supabaseAnonKey);

  const authorized = session?.email === bookingOwnerEmail;
  const todayKey = formatDateOnlyInZone(new Date(), bookingConfig.timezone);

  const visibleBookings = useMemo(() => {
    const needle = query.toLowerCase();
    return bookings.filter((booking) => {
      const statusMatch = statusFilter === "all" || booking.status === statusFilter;
      const textMatch =
        !needle ||
        [booking.booking_reference, booking.full_name, booking.company, booking.selected_product, booking.work_email, booking.phone_or_whatsapp, booking.meeting_topic]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      return statusMatch && textMatch;
    });
  }, [bookings, query, statusFilter]);

  const groupedByDate = useMemo(() => {
    return visibleBookings.reduce<Record<string, BookingRecord[]>>((groups, booking) => {
      const key = formatDateOnlyInZone(booking.starts_at, bookingConfig.timezone);
      groups[key] = groups[key] || [];
      groups[key].push(booking);
      return groups;
    }, {});
  }, [visibleBookings]);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      today: bookings.filter((booking) => formatDateOnlyInZone(booking.starts_at, bookingConfig.timezone) === todayKey && booking.status !== "cancelled").length,
      upcoming: bookings.filter((booking) => new Date(booking.starts_at).getTime() >= now && !["cancelled", "completed", "no_show"].includes(booking.status)).length,
      past: bookings.filter((booking) => new Date(booking.starts_at).getTime() < now && booking.status !== "cancelled").length,
      cancelled: bookings.filter((booking) => booking.status === "cancelled").length,
    };
  }, [bookings, todayKey]);

  const verifySession = async (current: AdminSession) => {
    if (!configured) return;
    setLoading(true);
    setAuthError("");
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${current.accessToken}`,
        },
      });
      const user = await response.json().catch(() => ({}));
      if (!response.ok || !user.email) throw new Error("Admin session expired. Please request a new login link.");
      if (user.email !== bookingOwnerEmail) throw new Error("This admin dashboard is restricted to the VOYD owner.");
      const verifiedSession = { ...current, email: user.email };
      setSession(verifiedSession);
      saveSession(verifiedSession);
    } catch (error) {
      setSession(null);
      saveSession(null);
      setAuthError(error instanceof Error ? error.message : "Could not verify admin session.");
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    if (!session?.accessToken || !authorized) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/bookings", {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not load admin bookings.");
      setBookings(data.bookings || []);
      setBlocks(data.blocks || []);
      setNotesDraft(
        Object.fromEntries((data.bookings || []).map((booking: BookingRecord) => [booking.id, booking.private_notes || ""])),
      );
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not load admin bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.accessToken && !session.email) verifySession(session);
  }, [session?.accessToken, session?.email]);

  useEffect(() => {
    if (authorized) loadBookings();
  }, [authorized]);

  const requestMagicLink = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");
    if (email !== bookingOwnerEmail) {
      setAuthError("Only the VOYD owner email is allowed.");
      return;
    }
    if (!configured) {
      setAuthError("Supabase public auth variables are missing.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/otp`, {
        method: "POST",
        headers: {
          apikey: supabaseAnonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          options: { emailRedirectTo: `${window.location.origin}/admin/bookings` },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.msg || data.error_description || "Could not send login link.");
      setAuthMessage("Secure login link sent. Open it from the VOYD owner inbox.");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not send login link.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setSession(null);
    saveSession(null);
    setBookings([]);
    setBlocks([]);
  };

  const updateBooking = async (id: string, payload: Record<string, string>) => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(payload.action === "notes" ? { id, action: "notes", privateNotes: payload.privateNotes } : { id, action: "status", status: payload.status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update booking.");
      await loadBookings();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not update booking.");
    } finally {
      setLoading(false);
    }
  };

  const createBlock = async (event: FormEvent) => {
    event.preventDefault();
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/blocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ blockDate, slotTime: blockSlot, reason: blockReason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not block availability.");
      setBlockDate("");
      setBlockSlot("");
      setBlockReason("");
      await loadBookings();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not block availability.");
    } finally {
      setLoading(false);
    }
  };

  const deleteBlock = async (id: string) => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/blocks", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not unblock availability.");
      await loadBookings();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not unblock availability.");
    } finally {
      setLoading(false);
    }
  };

  if (!configured || !authorized) {
    return (
      <PageTransition>
        <main className="page admin-page">
          <section className="page-hero">
            <p className="eyebrow">Private Admin</p>
            <h1>VOYD booking dashboard requires secure owner authentication.</h1>
            <p>Only {bookingOwnerEmail} can access bookings, availability blocks, notes, and booking actions.</p>
          </section>
          <section className="section admin-auth-shell">
            <Reveal>
              <form className="contact-card admin-auth-card" onSubmit={requestMagicLink}>
                <ShieldCheck size={24} />
                <strong>Admin login</strong>
                <p>Request a Supabase Auth magic link. Access is checked again by the VOYD backend before bookings are returned.</p>
                <label>
                  Owner email
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
                </label>
                <Button type="submit" icon={false}>{loading ? "Sending..." : "Send secure login link"}</Button>
                {!configured ? (
                  <div className="form-state error">
                    <AlertCircle size={16} />
                    Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.
                  </div>
                ) : null}
                {authMessage ? (
                  <div className="form-state success">
                    <CheckCircle2 size={16} />
                    {authMessage}
                  </div>
                ) : null}
                {authError ? (
                  <div className="form-state error">
                    <AlertCircle size={16} />
                    {authError}
                  </div>
                ) : null}
              </form>
            </Reveal>
          </section>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="page admin-page">
        <section className="page-hero admin-hero">
          <p className="eyebrow">Private Admin</p>
          <h1>VOYD bookings control room.</h1>
          <p>Manage discovery calls, availability blocks, client context, statuses, notes, and calendar exports.</p>
          <button className="download-ics" type="button" onClick={logout}>
            <LogOut size={15} />
            Logout
          </button>
        </section>

        <section className="section admin-dashboard">
          <div className="admin-metrics">
            <article>
              <small>Today&apos;s calls</small>
              <strong>{stats.today}</strong>
            </article>
            <article>
              <small>Upcoming calls</small>
              <strong>{stats.upcoming}</strong>
            </article>
            <article>
              <small>Past calls</small>
              <strong>{stats.past}</strong>
            </article>
            <article>
              <small>Cancelled calls</small>
              <strong>{stats.cancelled}</strong>
            </article>
          </div>

          <div className="admin-toolbar">
            <label>
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients, company, product..." />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No-show</option>
            </select>
            <div>
              <button className={view === "list" ? "is-active" : ""} type="button" onClick={() => setView("list")}>List</button>
              <button className={view === "calendar" ? "is-active" : ""} type="button" onClick={() => setView("calendar")}>Calendar</button>
            </div>
          </div>

          {authError ? (
            <div className="form-state error">
              <AlertCircle size={16} />
              {authError}
            </div>
          ) : null}

          {view === "calendar" ? (
            <div className="admin-calendar-view">
              {Object.entries(groupedByDate).map(([date, items]) => (
                <article key={date}>
                  <div>
                    <CalendarDays size={16} />
                    <strong>{date}</strong>
                    <span>{items.length} calls</span>
                  </div>
                  {items.map((booking) => (
                    <p key={booking.id}>
                      <span>{formatDateTimeInZone(booking.starts_at, bookingConfig.timezone)}</span>
                      <strong>{booking.company}</strong>
                      <em>{booking.status}</em>
                    </p>
                  ))}
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-booking-list">
              {visibleBookings.map((booking) => (
                <article className="admin-booking-card" key={booking.id}>
                  <div className="admin-booking-head">
                    <div>
                      <small>{booking.booking_reference}</small>
                      <h2>{booking.full_name}</h2>
                      <p>{booking.company} · {booking.selected_product}</p>
                    </div>
                    <span className={`admin-status admin-status-${booking.status}`}>{booking.status}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Email</dt>
                      <dd><a href={`mailto:${booking.work_email}`}>{booking.work_email}</a></dd>
                    </div>
                    <div>
                      <dt>WhatsApp</dt>
                      <dd><a href={whatsappUrl(booking.phone_or_whatsapp)} target="_blank" rel="noreferrer">{booking.phone_or_whatsapp}</a></dd>
                    </div>
                    <div>
                      <dt>Preferred contact</dt>
                      <dd>{booking.preferred_contact_method}</dd>
                    </div>
                    <div>
                      <dt>Meeting topic</dt>
                      <dd>{booking.meeting_topic}</dd>
                    </div>
                    <div>
                      <dt>Europe/Berlin</dt>
                      <dd>{formatDateTimeInZone(booking.starts_at, bookingConfig.timezone)}</dd>
                    </div>
                    <div>
                      <dt>Visitor local</dt>
                      <dd>{formatDateTimeInZone(booking.starts_at, booking.visitor_timezone)}</dd>
                    </div>
                    <div>
                      <dt>Visitor timezone</dt>
                      <dd>{booking.visitor_timezone}</dd>
                    </div>
                    <div>
                      <dt>Notes</dt>
                      <dd>{booking.private_notes || "No private notes yet."}</dd>
                    </div>
                  </dl>
                  <div className="admin-actions">
                    <button type="button" onClick={() => updateBooking(booking.id, { action: "status", status: "confirmed" })}><CheckCircle2 size={14} /> Confirm</button>
                    <button type="button" onClick={() => updateBooking(booking.id, { action: "status", status: "completed" })}>Completed</button>
                    <button type="button" onClick={() => updateBooking(booking.id, { action: "status", status: "no_show" })}>No-show</button>
                    <button type="button" onClick={() => updateBooking(booking.id, { action: "status", status: "cancelled" })}><XCircle size={14} /> Cancel</button>
                    {booking.status === "cancelled" ? (
                      <button type="button" onClick={() => updateBooking(booking.id, { action: "status", status: "new" })}>Reopen slot</button>
                    ) : null}
                    <button type="button" onClick={() => navigator.clipboard.writeText(booking.work_email)}><Copy size={14} /> Copy email</button>
                    <a href={whatsappUrl(booking.phone_or_whatsapp)} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>
                    <button type="button" onClick={() => downloadIcs(booking)}><Download size={14} /> ICS</button>
                  </div>
                  <div className="admin-notes">
                    <textarea value={notesDraft[booking.id] || ""} onChange={(event) => setNotesDraft({ ...notesDraft, [booking.id]: event.target.value })} placeholder="Private owner notes" />
                    <button type="button" onClick={() => updateBooking(booking.id, { action: "notes", privateNotes: notesDraft[booking.id] || "" })}>Save notes</button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <section className="admin-availability">
            <div>
              <h2>Availability management</h2>
              <p>Blocked dates and slots are stored in Supabase and removed from public availability.</p>
            </div>
            <form onSubmit={createBlock}>
              <label>
                Date
                <input value={blockDate} onChange={(event) => setBlockDate(event.target.value)} type="date" />
              </label>
              <label>
                Slot
                <select value={blockSlot} onChange={(event) => setBlockSlot(event.target.value)}>
                  <option value="">Full date</option>
                  <option value="10:00">10:00 Europe/Berlin only</option>
                  <option value="22:00">22:00 Europe/Berlin only</option>
                </select>
              </label>
              <label>
                Reason
                <input value={blockReason} onChange={(event) => setBlockReason(event.target.value)} placeholder="Travel, holiday, internal workshop..." />
              </label>
              <button type="submit" disabled={loading}>Block availability</button>
            </form>
            <div className="block-list">
              {blocks.map((block) => (
                <p key={block.id}>
                  <span>{block.block_date}</span>
                  <strong>{block.block_type === "date" ? "Full date" : `${block.slot_time} slot`}</strong>
                  <em>{block.reason || "No reason"}</em>
                  <button type="button" onClick={() => deleteBlock(block.id)}>Unblock</button>
                </p>
              ))}
            </div>
          </section>
        </section>
      </main>
    </PageTransition>
  );
}
