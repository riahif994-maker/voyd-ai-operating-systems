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

## Email setup

The frontend submits Contact Sales and Booking requests to:

- `POST /api/contact`
- `POST /api/booking`

The API sends:

1. A detailed lead or booking notification email to `VOYD_LEADS_EMAIL`
2. A branded confirmation email to the prospect
3. A calendar-compatible `.ics` attachment for bookings

Required environment variables:

```bash
VOYD_LEADS_EMAIL=sales@voyd.ai
VOYD_FROM_EMAIL=VOYD <sales@voyd.ai>
RESEND_API_KEY=your_resend_api_key
```

When credentials are missing, the API returns an honest development fallback:
`delivered: false`, logs a masked local summary, and does not pretend an email was sent.

## Build

```bash
npm run build
```

## Product experience

The VOYD product workspaces use seeded local data and persist demo changes in `localStorage`.
Each workspace supports search, filters, pagination, create/edit/delete, status updates,
CSV export, reset demo data, domain-specific charts, and a deterministic AI simulation.
