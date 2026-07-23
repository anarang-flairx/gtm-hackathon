import { getLocalDb } from "@/lib/local-db";
import { createServiceSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  FUNNEL_STAGES,
  type Customer,
  type FunnelStageId,
  type Icp,
  type OutreachEvent,
  type EmailTracking,
} from "@/lib/types";

export async function listIcps(): Promise<Icp[]> {
  if (isSupabaseConfigured()) {
    const sb = createServiceSupabaseClient();
    if (sb) {
      const { data, error } = await sb.from("icps").select("*").order("name");
      if (!error && data?.length) return data as Icp[];
    }
  }
  const db = await getLocalDb();
  return db.icps;
}

export async function listCustomers(opts?: {
  icpSlug?: string | null;
  q?: string | null;
  limit?: number;
}): Promise<Customer[]> {
  const limit = opts?.limit ?? 200;
  const q = (opts?.q || "").trim().toLowerCase();

  const db = await getLocalDb();
  let rows = db.customers;
  if (opts?.icpSlug) {
    rows = rows.filter((c) => c.icp_slugs.includes(opts.icpSlug!));
  }
  if (q) {
    rows = rows.filter((c) => {
      const hay = [
        c.business_name,
        c.city,
        c.county,
        c.email,
        c.license_number,
        c.classification,
        c.business_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }
  return rows.slice(0, limit);
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const db = await getLocalDb();
  return db.customers.find((c) => c.id === id) ?? null;
}

export async function listOutreachEvents(opts?: {
  customerId?: string;
  limit?: number;
}): Promise<OutreachEvent[]> {
  const db = await getLocalDb();
  let rows = db.outreach_events;
  if (opts?.customerId) {
    rows = rows.filter((e) => e.customer_id === opts.customerId);
  }
  return rows.slice(0, opts?.limit ?? 500);
}

function emptyFunnelCounts(): Record<FunnelStageId, number> {
  return Object.fromEntries(
    FUNNEL_STAGES.map((s) => [s.id, 0]),
  ) as Record<FunnelStageId, number>;
}

function stageIndex(id: FunnelStageId | null) {
  if (!id) return -1;
  return FUNNEL_STAGES.findIndex((s) => s.id === id);
}

/** Count customers who have reached at least this stage */
function cumulativeFunnel(customers: Customer[]) {
  const reached = emptyFunnelCounts();
  for (const c of customers) {
    const idx = stageIndex(c.funnel_stage);
    if (idx < 0) continue;
    for (let i = 0; i <= idx; i++) {
      reached[FUNNEL_STAGES[i].id] += 1;
    }
  }
  return reached;
}

export async function getStats() {
  const db = await getLocalDb();
  const events = db.outreach_events;
  const tracking = db.email_tracking;
  const customers = db.customers;

  const byChannel = {
    email: events.filter((e) => e.channel === "email").length,
    phone: events.filter((e) => e.channel === "phone").length,
    sms: events.filter((e) => e.channel === "sms").length,
  };

  const opens = tracking.filter((t) => t.opened_at).length;
  const clicks = tracking.reduce((sum, t) => sum + t.click_count, 0);

  const messengers = new Set(
    events
      .filter((e) => e.channel === "email" || e.channel === "sms")
      .map((e) => e.customer_id),
  );

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const count = events.filter((e) => e.created_at.slice(0, 10) === key).length;
    return { date: key, count };
  });

  const customerMap = new Map(customers.map((c) => [c.id, c]));

  type IcpMetrics = {
    customers: number;
    email: number;
    phone: number;
    sms: number;
    messengers: number;
    messagesSent: number;
    funnel: Record<FunnelStageId, number>;
    funnelExact: Record<FunnelStageId, number>;
  };

  const byIcp: Record<string, IcpMetrics> = {};
  for (const icp of db.icps) {
    const icpCustomers = customers.filter((c) => c.icp_slugs.includes(icp.slug));
    const icpCustomerIds = new Set(icpCustomers.map((c) => c.id));
    const icpEvents = events.filter((e) => icpCustomerIds.has(e.customer_id));
    const msgEvents = icpEvents.filter(
      (e) => e.channel === "email" || e.channel === "sms",
    );
    const exact = emptyFunnelCounts();
    for (const c of icpCustomers) {
      if (c.funnel_stage) exact[c.funnel_stage] += 1;
    }

    byIcp[icp.slug] = {
      customers: icpCustomers.length,
      email: icpEvents.filter((e) => e.channel === "email").length,
      phone: icpEvents.filter((e) => e.channel === "phone").length,
      sms: icpEvents.filter((e) => e.channel === "sms").length,
      messengers: new Set(msgEvents.map((e) => e.customer_id)).size,
      messagesSent: msgEvents.length,
      funnel: cumulativeFunnel(icpCustomers),
      funnelExact: exact,
    };
  }

  const overallFunnel = cumulativeFunnel(customers);
  const overallExact = emptyFunnelCounts();
  for (const c of customers) {
    if (c.funnel_stage) overallExact[c.funnel_stage] += 1;
  }

  const statusBreakdown: Record<string, number> = {};
  for (const e of events) {
    statusBreakdown[e.status] = (statusBreakdown[e.status] || 0) + 1;
  }

  return {
    totals: {
      customers: customers.length,
      emails: byChannel.email,
      calls: byChannel.phone,
      texts: byChannel.sms,
      opens,
      clicks,
      messengers: messengers.size,
      messagesSent:
        events.filter((e) => e.channel === "email" || e.channel === "sms")
          .length,
    },
    byChannel,
    byIcp,
    funnel: overallFunnel,
    funnelExact: overallExact,
    last7,
    statusBreakdown,
    recent: events.slice(0, 20),
    trackingSample: tracking.slice(0, 20) as EmailTracking[],
    customerMapSize: customerMap.size,
  };
}
