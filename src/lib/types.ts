export type Channel = "email" | "phone" | "sms";
export type Provider = "resend" | "twilio" | "demo" | "tel";

export const FUNNEL_STAGES = [
  {
    id: "message_sent",
    label: "First message sent",
    short: "Sent",
    description: "Outbound first touch landed",
  },
  {
    id: "opened",
    label: "Opened / read",
    short: "Opened",
    description: "Message opened and read",
  },
  {
    id: "clicked",
    label: "Clicked to website",
    short: "Clicked",
    description: "Prospect clicked through",
  },
  {
    id: "responded",
    label: "Responded back",
    short: "Replied",
    description: "Prospect replied to us",
  },
  {
    id: "meeting_scheduled",
    label: "Meeting scheduled",
    short: "Meeting",
    description: "Call or meeting booked",
  },
  {
    id: "relationship",
    label: "Relationship established",
    short: "Relationship",
    description: "Ongoing working relationship",
  },
  {
    id: "project_requested",
    label: "Projects requested",
    short: "Requested",
    description: "Project ask received",
  },
  {
    id: "project_quoted",
    label: "Project quoted",
    short: "Quoted",
    description: "Quote delivered",
  },
  {
    id: "project_closed",
    label: "Project closed",
    short: "Closed",
    description: "Won / closed project",
  },
] as const;

export type FunnelStageId = (typeof FUNNEL_STAGES)[number]["id"];

export type Icp = {
  id: string;
  slug: string;
  name: string;
  description?: string;
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
  /** Apollo-enriched headcount */
  employee_count: number | null;
  icp_slugs: string[];
  /** Furthest market-funnel stage reached */
  funnel_stage: FunnelStageId | null;
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

export type DisasterEventType =
  | "earthquake"
  | "flood"
  | "fire"
  | "tsunami"
  | "storm"
  | "other";

export type DisasterEvent = {
  id: string;
  type: DisasterEventType;
  title: string;
  location: string;
  lat: number;
  lng: number;
  severity: number; // 0-10 scale for marker size
  magnitude?: number;
  source: string;
  url?: string;
  occurred_at: string;
  summary?: string;
};

export type LocalDb = {
  icps: Icp[];
  customers: Customer[];
  outreach_events: OutreachEvent[];
  email_tracking: EmailTracking[];
};
