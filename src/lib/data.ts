import { getLocalDb } from "@/lib/local-db";
import { createServiceSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { Customer, Icp, OutreachEvent, EmailTracking } from "@/lib/types";

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

  if (isSupabaseConfigured()) {
    const sb = createServiceSupabaseClient();
    if (sb) {
      // Fallback to local if supabase empty — hackathon local-first
    }
  }

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

export async function getStats() {
  const db = await getLocalDb();
  const events = db.outreach_events;
  const tracking = db.email_tracking;

  const byChannel = {
    email: events.filter((e) => e.channel === "email").length,
    phone: events.filter((e) => e.channel === "phone").length,
    sms: events.filter((e) => e.channel === "sms").length,
  };

  const opens = tracking.filter((t) => t.opened_at).length;
  const clicks = tracking.reduce((sum, t) => sum + t.click_count, 0);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const count = events.filter((e) => e.created_at.slice(0, 10) === key).length;
    return { date: key, count };
  });

  const byIcp: Record<string, { email: number; phone: number; sms: number }> =
    {};
  for (const icp of db.icps) {
    byIcp[icp.slug] = { email: 0, phone: 0, sms: 0 };
  }
  const customerMap = new Map(db.customers.map((c) => [c.id, c]));
  for (const e of events) {
    const c = customerMap.get(e.customer_id);
    if (!c) continue;
    for (const slug of c.icp_slugs) {
      if (!byIcp[slug]) byIcp[slug] = { email: 0, phone: 0, sms: 0 };
      byIcp[slug][e.channel] += 1;
    }
  }

  const statusBreakdown: Record<string, number> = {};
  for (const e of events) {
    statusBreakdown[e.status] = (statusBreakdown[e.status] || 0) + 1;
  }

  return {
    totals: {
      customers: db.customers.length,
      emails: byChannel.email,
      calls: byChannel.phone,
      texts: byChannel.sms,
      opens,
      clicks,
    },
    byChannel,
    byIcp,
    last7,
    statusBreakdown,
    recent: events.slice(0, 20),
    trackingSample: tracking.slice(0, 20) as EmailTracking[],
  };
}
