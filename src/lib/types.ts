export type Channel = "email" | "phone" | "sms";
export type Provider = "resend" | "twilio" | "demo" | "tel";

export type Icp = {
  id: string;
  slug: string;
  name: string;
};

export type Customer = {
  id: string;
  license_number: string | null;
  business_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  phone_cslb: string | null;
  business_type: string | null;
  classification: string | null;
  status: string | null;
  email: string | null;
  email_status: string | null;
  phone_mobile: string | null;
  linkedin_url: string | null;
  title: string | null;
  company_domain: string | null;
  enriched_at: string | null;
  enrichment_source: string | null;
  icp_slugs: string[];
};

export type OutreachEvent = {
  id: string;
  customer_id: string;
  channel: Channel;
  direction: "outbound";
  status: string;
  subject: string | null;
  body: string | null;
  to_address: string | null;
  provider: Provider;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type EmailTracking = {
  id: string;
  outreach_event_id: string;
  token: string;
  opened_at: string | null;
  clicked_at: string | null;
  click_count: number;
  created_at: string;
};

export type LocalDb = {
  icps: Icp[];
  customers: Customer[];
  outreach_events: OutreachEvent[];
  email_tracking: EmailTracking[];
};
