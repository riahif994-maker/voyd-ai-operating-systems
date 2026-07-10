# VOYD AI Operating Systems

Public website and interactive product experience for VOYD.

## Run locally

```bash
npm install
npm run dev
```

## Contact Sales booking request

The `/contact-sales` page is a frontend-only booking-request composer. It does not call a booking API, write to a database, or send email from the server.

The visitor:

- chooses a future Monday-Saturday VOYD date
- chooses `10:00` or `22:00` Europe/Berlin
- enters their details
- reviews the prepared request message
- opens Email or WhatsApp with the request prefilled
- manually presses Send

VOYD confirms the selected time manually.

The booking system uses the official VOYD schedule in `src/config/booking-runtime.mjs`
(the single source of truth for the schedule - do not duplicate these values elsewhere):

- Timezone: `Europe/Berlin`
- Working days: Monday through Saturday
- Daily slots: `10:00` and `22:00`
- Duration: `45` minutes
- Booking window: `30` days

The public booking-request composer requires no environment variables, no database,
and no email provider configuration.

Production contact destinations:

- Email: `voyd.contact1@gmail.com`
- WhatsApp Business: `+49 176 86606120`
- WhatsApp chat: `https://wa.me/4917686606120`

## Vercel deployment

1. Import the repository into Vercel.
2. Add only the environment variables needed for the features you intentionally enable.
3. `vercel.json` rewrites unmatched paths to `index.html` so React Router routes
   (e.g. `/pricing`, `/admin/bookings`) work on a hard refresh or direct link.

## Build

```bash
npm run build
```

## Product experience

The VOYD product workspaces use seeded local data and persist demo changes in `localStorage`.
Each workspace supports search, filters, pagination, create/edit/delete, status updates,
CSV export, reset demo data, domain-specific charts, and a deterministic AI simulation.
