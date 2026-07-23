# GTM Outbound Prospecting Dashboard

Next.js + Supabase-ready workspace for CSLB contractor outbound GTM.

## What’s included

- **Customers** — filter by ICP, expand each account for Email / Phone / Text tools
- **Tools by ICP** — same tools, filtered by segment and channel readiness
- **Tools** — aggregate stats (# emails, calls, texts, opens, clicks)
- **Apollo enrichment** — simulated for the hackathon demo (deterministic emails, titles, domains, LinkedIn). Swap in a real Apollo API key later.
- **Send + log** — every action writes an outreach event. Resend / Twilio send when configured; otherwise demo mode logs the activity.

### ICPs seeded from `CSLB Contractor List.xlsx`

| ICP | Source sheet |
| --- | --- |
| B-2 Residential Remodeling | `B-2 Residential Remodeling` |
| C-6 Cabinet and Millwork | `C-6 Cabinet and Millwork` |
| NorCal | `Apollo for NorCal` |

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
