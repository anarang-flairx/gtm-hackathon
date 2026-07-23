# GTM Outbound Prospecting Dashboard

Next.js + Supabase-ready workspace for CSLB contractor outbound GTM.

## What’s included

- **Customers** — filter by ICP, expand each account for Email / Phone / Text tools
- **Tools by ICP** — same tools, filtered by segment and channel readiness
- **Tools** — aggregate stats (# emails, calls, texts, opens, clicks)
- **Apollo enrichment** — simulated for the hackathon demo (deterministic emails, titles, domains, LinkedIn). Swap in a real Apollo API key later.
- **Send + log** — every action writes an outreach event. Resend / Twilio send when configured; otherwise demo mode logs the activity.

### ICPs seeded (very small / Sole Owner only)

| ICP | Filter |
| --- | --- |
| Micro Sole Owner Remodelers | Sole Owner + B-2 sheet |
| Micro Sole Owner Millwork | Sole Owner + C-6 sheet |
| Micro Sole Owner NorCal | Sole Owner in NorCal counties / Apollo NorCal list |

### Market funnel (Tools tab)

Messages sent → people messaged → opened → clicked → responded → meeting → relationship → project requested → quoted → closed — shown overall and **by ICP**.

### Disaster map (`/map`)

Live US hazard radar from **USGS** earthquakes + **NWS** alerts (flood / fire / tsunami / storm). Epicenter rings scale with severity; hover shows location + event type.


## Quick start

```bash
npm install
npm run import:cslb          # reads ~/Desktop/CSLB Contractor List.xlsx
npm run seed:demo            # optional sample outreach stats
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` → `.env.local` for integrations:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional remote Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Seed / admin writes |
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` | Real email send |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | Real SMS |

Without Supabase credentials the app runs on local JSON under `data/` (customers + outreach events).

## Supabase schema

Apply [`supabase/migrations/20260723000000_init.sql`](supabase/migrations/20260723000000_init.sql) in the Supabase SQL editor (or CLI) when you connect a project.

## Apollo (demo → real)

Today enrichment is applied in `scripts/import-cslb.ts` via `mockApolloEnrichment()`. To use a live Apollo key later:

1. Add `APOLLO_API_KEY` to `.env.local`
2. Replace the mock helper with Apollo people/org enrichment calls
3. Re-run `npm run import:cslb`

## Scripts

- `npm run import:cslb` — Excel → `data/customers.json` + mock Apollo fields
- `npm run seed:demo` — sample outreach events for the Tools tab
- `npm run dev` / `npm run build`

## Note on data

The full statewide `CSLBMasterLicenseData` sheet is intentionally not imported (too large for v1). Only the ICP slices above are loaded.
