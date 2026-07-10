import { AlertCircle, CalendarDays, CheckCircle2, Copy, Download, LogOut, MessageCircle, Search, XCircle } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  bookingConfig,
  createIcsEvent,
  formatDateOnlyInZone,
  formatDateTimeInZone,
} from "../config/booking";
import { PageTransition } from "../components/voyd/PageTransition";
import {
  AdminSession,
  clearAdminSession,
  parseSessionFromUrlHash,
  readAdminSession,
  saveAdminSession,
  verifyAdminSession,
} from "../lib/adminSession";

type BookingStatus = "new" | "confirmed" | "completed" | "cancelled" | "no_show";

type BookingRecord = {
  id: string;
  booking_reference: string;
  starts_at: string;
  ends_at: string;
  voyd_timezone: string;
  client_timezone: string;
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
  status: BookingStatus;
  admin_notes: string | null;
  source_page: string | null;
  referrer: string | null;
  created_at: string;
  updated_at: string;
};

type BlockRecord = {
  id: string;
  starts_at: string;
  reason: string | null;
  created_at: string;
};

type RangeFilter = "today" | "upcoming" | "past" | "cancelled" | "all";

function whatsappUrl(phone: string) {
  const digits = phone.replace(/[^0-9]/g, "");
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
  const navigate = useNavigate();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [blocks, setBlocks] = useState<BlockRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("upcoming");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [blockDate, setBlockDate] = useState("");
  const [blockSlot, setBlockSlot] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    const hashSession = parseSessionFromUrlHash();
    const existing = hashSession || readAdminSession();
    if (!existing) {
      setAuthChecked(true);
      navigate("/admin/login", { replace: true });
      return;
    }
    verifyAdminSession(existing)
      .then((email) => {
        const verified = { ...existing, email };
        saveAdminSession(verified);
        setSession(verified);
        setAuthChecked(true);
      })
      .catch(() => {
        saveAdminSession(null);
        setAuthChecked(true);
        navigate("/admin/login", { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const loadBookings = async (accessToken: string) => {
    setLoading(true);
    setActionError("");
    try {
      const response = await fetch("/api/admin/bookings", { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not load admin bookings.");
      setBookings(data.bookings || []);
      setBlocks(data.blocks || []);
      setNotesDraft(Object.fromEntries((data.bookings || []).map((booking: BookingRecord) => [booking.id, booking.admin_notes || ""])));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not load admin bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.accessToken) loadBookings(session.accessToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  const logout = () => {
    clearAdminSession();
    setSession(null);
    setBookings([]);
    setBlocks([]);
    navigate("/admin/login", { replace: true });
  };

  const todayKey = formatDateOnlyInZone(new Date(), bookingConfig.timezone);
  const now = Date.now();

  const stats = useMemo(
    () => ({
      today: bookings.filter((b) => formatDateOnlyInZone(b.starts_at, bookingConfig.timezone) === todayKey && b.status !== "cancelled").length,
      upcoming: bookings.filter((b) => new Date(b.starts_at).getTime() >= now && !["cancelled", "completed", "no_show"].includes(b.status)).length,
      past: bookings.filter((b) => new Date(b.starts_at).getTime() < now && b.status !== "cancelled").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    }),
    [bookings, todayKey, now],
  );

  const rangeFiltered = useMemo(() => {
    return bookings.filter((booking) => {
      const startMs = new Date(booking.starts_at).getTime();
      const isToday = formatDateOnlyInZone(booking.starts_at, bookingConfig.timezone) === todayKey;
      switch (rangeFilter) {
        case "today":
          return isToday && booking.status !== "cancelled";
        case "upcoming":
          return startMs >= now && !["cancelled", "completed", "no_show"].includes(booking.status);
        case "past":
          return startMs < now && booking.status !== "cancelled";
        case "cancelled":
          return booking.status === "cancelled";
        default:
          return true;
      }
    });
  }, [bookings, rangeFilter, todayKey, now]);

  const visibleBookings = useMemo(() => {
    const needle = query.toLowerCase();
    return rangeFiltered.filter((booking) => {
      const statusMatch = statusFilter === "all" || booking.status === statusFilter;
      const textMatch =
        !needle ||
        [booking.booking_reference, booking.full_name, booking.company, booking.selected_product, booking.work_email, booking.phone_or_whatsapp, booking.meeting_topic]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      return statusMatch && textMatch;
    });
  }, [rangeFiltered, query, statusFilter]);

  const groupedByDate = useMemo(() => {
    return visibleBookings.reduce<Record<string, BookingRecord[]>>((groups, booking) => {
      const key = formatDateOnlyInZone(booking.starts_at, bookingConfig.timezone);
      groups[key] = groups[key] || [];
      groups[key].push(booking);
      return groups;
    }, {});
  }, [visibleBookings]);

  const updateBooking = async (id: string, payload: Record<string, string>) => {
    if (!session?.accessToken) return;
    setLoading(true);
    setActionError("");
    try {
      const response = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ id, ...payload }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not update this booking.");
      await loadBookings(session.accessToken);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update this booking.");
    } finally {
      setLoading(false);
    }
  };

  const createBlock = async (event: FormEvent) => {
    event.preventDefault();
    if (!session?.accessToken || !blockDate) return;
    setLoading(true);
    setActionError("");
    try {
      const response = await fetch("/api/admin/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ dateKey: blockDate, slotTime: blockSlot, reason: blockReason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not block this availability.");
      setBlockDate("");
      setBlockSlot("");
      setBlockReason("");
      await loadBookings(session.accessToken);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not block this availability.");
    } finally {
      setLoading(false);
    }
  };

  const deleteBlock = async (id: string) => {
    if (!session?.accessToken) return;
    setLoading(true);
    setActionError("");
    try {
      const response = await fetch("/api/admin/blocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not unblock this availability.");
      await loadBookings(session.accessToken);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not unblock this availability.");
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked || !session) {
    return (
      <PageTransition>
        <main className="page admin-page">
          <section className="page-hero">
            <p className="eyebrow">Private Admin</p>
            <h1>Checking admin session...</h1>
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
            Log out
          </button>
        </section>

        <section className="section admin-dashboard">
          <div className="admin-metrics">
            <article>
              <small>Today&apos;s bookings</small>
              <strong>{stats.today}</strong>
            </article>
            <article>
              <small>Upcoming bookings</small>
              <strong>{stats.upcoming}</strong>
            </article>
            <article>
              <small>Past bookings</small>
              <strong>{stats.past}</strong>
            </article>
            <article>
              <small>Cancelled bookings</small>
              <strong>{stats.cancelled}</strong>
            </article>
          </div>

          <div className="admin-range-tabs">
            {(["today", "upcoming", "past", "cancelled", "all"] as RangeFilter[]).map((range) => (
              <button key={range} type="button" className={rangeFilter === range ? "is-active" : ""} onClick={() => setRangeFilter(range)}>
                {range === "all" ? "All" : range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
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
              <button className={view === "list" ? "is-active" : ""} type="button" onClick={() => setView("list")}>
                List
              </button>
              <button className={view === "calendar" ? "is-active" : ""} type="button" onClick={() => setView("calendar")}>
                Calendar
              </button>
            </div>
          </div>

          {actionError ? (
            <div className="form-state error">
              <AlertCircle size={16} />
              {actionError}
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
              {!Object.keys(groupedByDate).length ? <p>No bookings in this range.</p> : null}
            </div>
          ) : (
            <div className="admin-booking-list">
              {visibleBookings.map((booking) => (
                <article className="admin-booking-card" key={booking.id}>
                  <div className="admin-booking-head">
                    <div>
                      <small>{booking.booking_reference}</small>
                      <h2>{booking.full_name}</h2>
                      <p>
                        {booking.company} - {booking.selected_product}
                      </p>
                    </div>
                    <span className={`admin-status admin-status-${booking.status}`}>{booking.status}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Email</dt>
                      <dd>
                        <a href={`mailto:${booking.work_email}`}>{booking.work_email}</a>
                      </dd>
                    </div>
                    <div>
                      <dt>WhatsApp</dt>
                      <dd>
                        <a href={whatsappUrl(booking.phone_or_whatsapp)} target="_blank" rel="noreferrer">
                          {booking.phone_or_whatsapp}
                        </a>
                      </dd>
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
                      <dt>Europe/Berlin time</dt>
                      <dd>{formatDateTimeInZone(booking.starts_at, bookingConfig.timezone)}</dd>
                    </div>
                    <div>
                      <dt>Client local time</dt>
                      <dd>{formatDateTimeInZone(booking.starts_at, booking.client_timezone)}</dd>
                    </div>
                    <div>
                      <dt>Client timezone</dt>
                      <dd>{booking.client_timezone}</dd>
                    </div>
                    <div>
                      <dt>Source page</dt>
                      <dd>{booking.source_page || "-"}</dd>
                    </div>
                  </dl>
                  <div className="admin-actions">
                    <button type="button" onClick={() => updateBooking(booking.id, { action: "status", status: "confirmed" })}>
                      <CheckCircle2 size={14} /> Confirm
                    </button>
                    <button type="button" onClick={() => updateBooking(booking.id, { action: "status", status: "completed" })}>
                      Mark completed
                    </button>
                    <button type="button" onClick={() => updateBooking(booking.id, { action: "status", status: "no_show" })}>
                      Mark no-show
                    </button>
                    <button type="button" onClick={() => updateBooking(booking.id, { action: "status", status: "cancelled" })}>
                      <XCircle size={14} /> Cancel
                    </button>
                    {booking.status === "cancelled" ? (
                      <button type="button" onClick={() => updateBooking(booking.id, { action: "status", status: "new" })}>
                        Reopen cancelled slot
                      </button>
                    ) : null}
                    <button type="button" onClick={() => navigator.clipboard.writeText(booking.work_email)}>
                      <Copy size={14} /> Copy email
                    </button>
                    <a href={whatsappUrl(booking.phone_or_whatsapp)} target="_blank" rel="noreferrer">
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                    <button type="button" onClick={() => downloadIcs(booking)}>
                      <Download size={14} /> ICS
                    </button>
                  </div>
                  <div className="admin-notes">
                    <textarea
                      value={notesDraft[booking.id] || ""}
                      onChange={(event) => setNotesDraft({ ...notesDraft, [booking.id]: event.target.value })}
                      placeholder="Private admin notes"
                    />
                    <button type="button" onClick={() => updateBooking(booking.id, { action: "notes", adminNotes: notesDraft[booking.id] || "" })}>
                      Save notes
                    </button>
                  </div>
                </article>
              ))}
              {!visibleBookings.length ? <p>No bookings match this view.</p> : null}
            </div>
          )}

          <section className="admin-availability">
            <div>
              <h2>Availability management</h2>
              <p>Blocked slots are stored in Supabase and removed from public availability immediately.</p>
            </div>
            <form onSubmit={createBlock}>
              <label>
                Date
                <input value={blockDate} onChange={(event) => setBlockDate(event.target.value)} type="date" required />
              </label>
              <label>
                Slot
                <select value={blockSlot} onChange={(event) => setBlockSlot(event.target.value)}>
                  <option value="">Full date (both slots)</option>
                  <option value="10:00">10:00 Europe/Berlin only</option>
                  <option value="22:00">22:00 Europe/Berlin only</option>
                </select>
              </label>
              <label>
                Reason
                <input value={blockReason} onChange={(event) => setBlockReason(event.target.value)} placeholder="Travel, holiday, internal workshop..." />
              </label>
              <button type="submit" disabled={loading}>
                Block availability
              </button>
            </form>
            <div className="block-list">
              {blocks.map((block) => (
                <p key={block.id}>
                  <span>{formatDateTimeInZone(block.starts_at, bookingConfig.timezone)}</span>
                  <strong>{block.reason || "Blocked"}</strong>
                  <button type="button" onClick={() => deleteBlock(block.id)}>
                    Unblock slot
                  </button>
                </p>
              ))}
              {!blocks.length ? <p>No manual blocks right now.</p> : null}
            </div>
          </section>
        </section>
      </main>
    </PageTransition>
  );
}
