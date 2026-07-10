import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bookingOwnerEmail } from "../config/booking";
import { Button } from "../components/voyd/Button";
import { PageTransition } from "../components/voyd/PageTransition";
import { Reveal } from "../components/voyd/Reveal";
import {
  isSupabaseAuthConfigured,
  parseSessionFromUrlHash,
  readAdminSession,
  requestAdminMagicLink,
  saveAdminSession,
  verifyAdminSession,
} from "../lib/adminSession";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>(bookingOwnerEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const configured = isSupabaseAuthConfigured();

  useEffect(() => {
    const hashSession = parseSessionFromUrlHash();
    const existing = hashSession || readAdminSession();
    if (!existing) return;
    verifyAdminSession(existing)
      .then((verifiedEmail) => {
        saveAdminSession({ ...existing, email: verifiedEmail });
        navigate("/admin/bookings", { replace: true });
      })
      .catch(() => {
        saveAdminSession(null);
      });
  }, [navigate]);

  const sendMagicLink = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (email.trim().toLowerCase() !== bookingOwnerEmail) {
      setError("Only the VOYD owner email is allowed.");
      return;
    }
    setLoading(true);
    try {
      await requestAdminMagicLink(email.trim(), `${window.location.origin}/admin/bookings`);
      setMessage("Secure login link sent. Open it from the VOYD owner inbox.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send the login link.");
    } finally {
      setLoading(false);
    }
  };

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
            <form className="contact-card admin-auth-card" onSubmit={sendMagicLink}>
              <ShieldCheck size={24} />
              <strong>Admin login</strong>
              <p>Request a secure Supabase Auth login link. Access is verified again by the VOYD backend on every request.</p>
              <label>
                Owner email
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
              </label>
              <Button type="submit" icon={false}>
                {loading ? "Sending..." : "Send secure login link"}
              </Button>
              {!configured ? (
                <div className="form-state error">
                  <AlertCircle size={16} />
                  Admin login is not configured yet.
                </div>
              ) : null}
              {message ? (
                <div className="form-state success">
                  <CheckCircle2 size={16} />
                  {message}
                </div>
              ) : null}
              {error ? (
                <div className="form-state error">
                  <AlertCircle size={16} />
                  {error}
                </div>
              ) : null}
            </form>
          </Reveal>
        </section>
      </main>
    </PageTransition>
  );
}
