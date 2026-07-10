# VOYD AI Operating Systems

Public website and interactive product experience for VOYD.

## Run locally

```bash
npm install
npm run dev
```

For the contact and booking API:

```bash
cp .env.example .env
npm run api
```

Or run both in separate terminals:

```bash
npm run dev
npm run api
```

## Production booking setup

The frontend submits Contact Sales and Booking requests to:

- `POST /api/contact`
- `GET /api/availability`
- `POST /api/booking`
- `GET /api/admin/bookings`
- `PATCH /api/admin/bookings`
- `POST /api/admin/blocks`
- `DELETE /api/admin/blocks`

The booking system uses the official VOYD schedule in `src/config/booking-runtime.mjs`:

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
2. Run `supabase/migrations/20260710153000_voyd_booking_system.sql`.
3. In Authentication, enable email magic links.
4. Add the production site URL to allowed redirect URLs.
5. Ensure the only admin owner email is `voyd.contact1@gmail.com`.

The admin route is `/admin/bookings`. It is not linked in public navigation. The owner requests a magic link, opens it from the owner inbox, and the backend verifies the Supabase session email before returning booking data.

## Resend setup

1. Create a Resend API key.
2. Verify the sender domain or sender email used by `VOYD_FROM_EMAIL`.
3. Add `RESEND_API_KEY` and `VOYD_FROM_EMAIL` to Vercel environment variables.

Booking success is only returned after server-side validation, Supabase insertion, and owner notification acceptance.

## Build

```bash
npm run build
```

## Product experience

The VOYD product workspaces use seeded local data and persist demo changes in `localStorage`.
Each workspace supports search, filters, pagination, create/edit/delete, status updates,
CSV export, reset demo data, domain-specific charts, and a deterministic AI simulation.
