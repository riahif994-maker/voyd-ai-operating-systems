# VOYD AI Operating Systems

Public website and interactive product experience for VOYD.

## Run locally

```bash
npm install
npm run dev
```

For the booking API:

```bash
cp .env.example .env
npm run api
```

Or run both in separate terminals:

```bash
npm run dev
npm run api
```

`npm run api` is a local-dev-only convenience server. It is not required in production -
Vercel runs the files in `api/` directly as native serverless functions.

## Production booking setup

The booking wizard on `/contact-sales` is the only booking entry point on the site. It talks to:

- `GET /api/availability` - public availability for the next 30 days
- `POST /api/booking` - reservation submission

The private admin dashboard (`/admin/login`, `/admin/bookings`) talks to:

- `GET /api/admin/bookings` - list bookings and blocked slots
- `PATCH /api/admin/bookings` - update status or admin notes
- `POST /api/admin/blocks` - block a date or a single slot
- `DELETE /api/admin/blocks` - unblock a slot

All four admin requests require a Supabase Auth bearer token for `voyd.contact1@gmail.com`;
every other email is rejected server-side even with a valid Supabase session.

The booking system uses the official VOYD schedule in `src/config/booking-runtime.mjs`
(the single source of truth for the schedule - do not duplicate these values elsewhere):

- Timezone: `Europe/Berlin`
- Working days: Monday through Saturday
- Daily slots: `10:00` and `22:00`
- Duration: `45` minutes
- Booking window: `30` days
- Minimum notice: `6` hours

Required environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server_only_service_role_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=public_anon_key
VOYD_LEADS_EMAIL=voyd.contact1@gmail.com
VOYD_FROM_EMAIL=VOYD <voyd.contact1@gmail.com>
RESEND_API_KEY=your_resend_api_key
VOYD_PUBLIC_URL=https://your-voyd-domain.com
VOYD_TIMEZONE=Europe/Berlin
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` with `VITE_` prefixes.

Production contact destinations:

- Email: `voyd.contact1@gmail.com`
- WhatsApp Business: `+49 176 86606120`
- WhatsApp chat: `https://wa.me/4917686606120`

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/create_booking_system.sql` in the Supabase SQL editor.
3. In Authentication, enable Email (magic link / OTP) sign-in.
4. Add your production site URL (and `/admin/bookings`) to the allowed redirect URLs.
5. Only `voyd.contact1@gmail.com` should ever request an admin login link - the backend
   independently rejects any other authenticated email on every admin API call.

## Admin login

1. Visit `/admin/login` (not linked from public navigation or the footer).
2. Enter `voyd.contact1@gmail.com` and request a secure login link.
3. Open the link from that inbox - it redirects to `/admin/bookings` with a Supabase session.
4. The dashboard verifies the session against Supabase Auth and the backend re-verifies the
   same token (and owner email) on every request. Anyone without a valid session is redirected
   back to `/admin/login`.

## Resend setup

1. Create a Resend API key.
2. Verify the sender domain used by `VOYD_FROM_EMAIL` to enable client confirmation emails
   (without a verified domain, Resend can only deliver to the account owner, so only the owner
   notification will send reliably).
3. Add `RESEND_API_KEY` and `VOYD_FROM_EMAIL` to Vercel environment variables.

Booking success is only returned after server-side validation, Supabase insertion, and owner
notification acceptance. If the owner notification fails, the booking is cancelled and the slot
is released automatically. The client confirmation email is best-effort: if it fails, the
booking still succeeds and the API response reports `clientConfirmationEmailSent: false`.

## Vercel deployment

1. Import the repository into Vercel - the Vite frontend and the `api/` functions deploy together
   from a single project, no separate backend to host.
2. Add all environment variables from `.env.example` in the Vercel project settings.
3. `vercel.json` rewrites unmatched paths to `index.html` so React Router routes
   (e.g. `/pricing`, `/admin/bookings`) work on a hard refresh or direct link.
4. `npm run api` / a standalone Node server is never required in production.

## Build

```bash
npm run build
```

## Product experience

The VOYD product workspaces use seeded local data and persist demo changes in `localStorage`.
Each workspace supports search, filters, pagination, create/edit/delete, status updates,
CSV export, reset demo data, domain-specific charts, and a deterministic AI simulation.
