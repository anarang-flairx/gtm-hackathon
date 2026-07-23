import { createHash, randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type {
  Customer,
  EmailTracking,
  Icp,
  LocalDb,
  OutreachEvent,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "local-db.json");
const EVENTS_PATH = path.join(DATA_DIR, "outreach-events.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readSeedCustomers(): Promise<{
  icps: Icp[];
  customers: Customer[];
}> {
  const raw = await fs.readFile(path.join(DATA_DIR, "customers.json"), "utf8");
  return JSON.parse(raw) as { icps: Icp[]; customers: Customer[] };
}

async function readEventsFile(): Promise<{
  outreach_events: OutreachEvent[];
  email_tracking: EmailTracking[];
}> {
  try {
    const raw = await fs.readFile(EVENTS_PATH, "utf8");
    return JSON.parse(raw) as {
      outreach_events: OutreachEvent[];
      email_tracking: EmailTracking[];
    };
  } catch {
    return { outreach_events: [], email_tracking: [] };
  }
}

async function writeEventsFile(data: {
  outreach_events: OutreachEvent[];
  email_tracking: EmailTracking[];
}) {
  await ensureDataDir();
  await fs.writeFile(EVENTS_PATH, JSON.stringify(data, null, 2));
}

export async function getLocalDb(): Promise<LocalDb> {
  const seed = await readSeedCustomers();
  const events = await readEventsFile();
  return {
    icps: seed.icps,
    customers: seed.customers,
    outreach_events: events.outreach_events,
    email_tracking: events.email_tracking,
  };
}

export async function appendOutreachEvent(
  event: Omit<OutreachEvent, "id" | "created_at"> & {
    id?: string;
    created_at?: string;
  },
  tracking?: { token: string },
): Promise<{ event: OutreachEvent; tracking?: EmailTracking }> {
  const store = await readEventsFile();
  const fullEvent: OutreachEvent = {
    id: event.id ?? randomUUID(),
    created_at: event.created_at ?? new Date().toISOString(),
    customer_id: event.customer_id,
    channel: event.channel,
    direction: event.direction,
    status: event.status,
    subject: event.subject,
    body: event.body,
    to_address: event.to_address,
    provider: event.provider,
    metadata: event.metadata,
  };
  store.outreach_events.unshift(fullEvent);

  let fullTracking: EmailTracking | undefined;
  if (tracking) {
    fullTracking = {
      id: randomUUID(),
      outreach_event_id: fullEvent.id,
      token: tracking.token,
      opened_at: null,
      clicked_at: null,
      click_count: 0,
      created_at: new Date().toISOString(),
    };
    store.email_tracking.push(fullTracking);
  }

  await writeEventsFile(store);
  return { event: fullEvent, tracking: fullTracking };
}

export async function recordEmailClick(token: string) {
  const store = await readEventsFile();
  const row = store.email_tracking.find((t) => t.token === token);
  if (!row) return null;
  row.click_count += 1;
  row.clicked_at = row.clicked_at ?? new Date().toISOString();
  await writeEventsFile(store);
  return row;
}

export async function recordEmailOpen(token: string) {
  const store = await readEventsFile();
  const row = store.email_tracking.find((t) => t.token === token);
  if (!row) return null;
  row.opened_at = row.opened_at ?? new Date().toISOString();
  await writeEventsFile(store);
  return row;
}

export function slugifyBusiness(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
}

export function mockApolloEnrichment(input: {
  businessName: string;
  city: string | null;
  phone: string | null;
  licenseNumber: string | null;
}) {
  const slug = slugifyBusiness(input.businessName) || "contractor";
  const hash = createHash("sha1")
    .update(`${input.licenseNumber ?? ""}|${input.businessName}`)
    .digest("hex");
  const n = parseInt(hash.slice(0, 8), 16);
  const titles = [
    "Owner",
    "President",
    "General Manager",
    "Principal",
    "Operations Lead",
  ];
  const statuses = ["verified", "guessed", "unavailable"] as const;
  const emailStatus = statuses[n % 3];
  const domain = `${slug || "build"}.com`;
  const email =
    emailStatus === "unavailable"
      ? null
      : `${["info", "contact", "hello", "office"][n % 4]}@${domain}`;

  const mobile =
    input.phone && n % 5 !== 0
      ? input.phone
      : n % 7 === 0
        ? null
        : `(${200 + (n % 700)}) ${100 + (n % 800)}-${1000 + (n % 9000)}`;

  // Deterministic Apollo-style headcount across ICP bands
  const band = n % 100;
  let employee_count: number;
  if (band < 45) {
    employee_count = 1 + (n % 5); // 1–5
  } else if (band < 80) {
    employee_count = 6 + (n % 10); // 6–15
  } else {
    employee_count = 16 + (n % 85); // 16–100
  }

  return {
    email,
    email_status: emailStatus,
    phone_mobile: mobile,
    linkedin_url: `https://www.linkedin.com/company/${slug || "contractor"}`,
    title: titles[n % titles.length],
    company_domain: domain,
    employee_count,
    enriched_at: new Date().toISOString(),
    enrichment_source: "apollo" as const,
  };
}

export function icpSlugForEmployeeCount(count: number): string {
  if (count <= 5) return "employees-0-5";
  if (count <= 15) return "employees-5-15";
  return "employees-16-plus";
}

export async function writeSeedFile(payload: {
  icps: Icp[];
  customers: Customer[];
}) {
  await ensureDataDir();
  await fs.writeFile(
    path.join(DATA_DIR, "customers.json"),
    JSON.stringify(payload, null, 2),
  );
  // Keep a compact copy pointer for local mode
  await fs.writeFile(
    DB_PATH,
    JSON.stringify(
      { note: "Canonical seed is customers.json; events in outreach-events.json" },
      null,
      2,
    ),
  );
}
