-- GTM outbound prospecting schema
create extension if not exists "pgcrypto";

create table if not exists public.icps (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  license_number text,
  business_name text not null,
  address text,
  city text,
  state text,
  zip text,
  county text,
  phone_cslb text,
  business_type text,
  classification text,
  status text,
  -- Mock Apollo enrichment
  email text,
  email_status text,
  phone_mobile text,
  linkedin_url text,
  title text,
  company_domain text,
  enriched_at timestamptz,
  enrichment_source text default 'apollo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customers_license_number_uidx
  on public.customers (license_number)
  where license_number is not null;

create index if not exists customers_business_name_idx
  on public.customers (business_name);

create table if not exists public.customer_icps (
  customer_id uuid not null references public.customers (id) on delete cascade,
  icp_id uuid not null references public.icps (id) on delete cascade,
  primary key (customer_id, icp_id)
);

create table if not exists public.outreach_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  channel text not null check (channel in ('email', 'phone', 'sms')),
  direction text not null default 'outbound',
  status text not null,
  subject text,
  body text,
  to_address text,
  provider text not null check (provider in ('resend', 'twilio', 'demo', 'tel')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists outreach_events_customer_id_idx
  on public.outreach_events (customer_id);

create index if not exists outreach_events_channel_idx
  on public.outreach_events (channel);

create index if not exists outreach_events_created_at_idx
  on public.outreach_events (created_at desc);

create table if not exists public.email_tracking (
  id uuid primary key default gen_random_uuid(),
  outreach_event_id uuid not null references public.outreach_events (id) on delete cascade,
  token text not null unique,
  opened_at timestamptz,
  clicked_at timestamptz,
  click_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Hackathon demo: open read/write for anon (no multi-user auth in v1)
alter table public.icps enable row level security;
alter table public.customers enable row level security;
alter table public.customer_icps enable row level security;
alter table public.outreach_events enable row level security;
alter table public.email_tracking enable row level security;

create policy "icps_all" on public.icps for all using (true) with check (true);
create policy "customers_all" on public.customers for all using (true) with check (true);
create policy "customer_icps_all" on public.customer_icps for all using (true) with check (true);
create policy "outreach_events_all" on public.outreach_events for all using (true) with check (true);
create policy "email_tracking_all" on public.email_tracking for all using (true) with check (true);
