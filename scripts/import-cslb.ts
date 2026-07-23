import { createHash } from "crypto";
import path from "path";
import * as XLSX from "xlsx";
import {
  icpSlugForEmployeeCount,
  mockApolloEnrichment,
  writeSeedFile,
} from "../src/lib/local-db";
import type { Customer, FunnelStageId, Icp } from "../src/lib/types";
import { FUNNEL_STAGES } from "../src/lib/types";

const XLSX_PATH =
  process.env.CSLB_XLSX_PATH ||
  path.join(process.env.HOME || "", "Desktop", "CSLB Contractor List.xlsx");

/** ICPs = Apollo employee-count bands */
const ICPS: Icp[] = [
  {
    id: "11111111-1111-1111-1111-111111111301",
    slug: "employees-0-5",
    name: "0–5 employees",
    description: "Micro shops — 0 to 5 employees (Apollo headcount)",
  },
  {
    id: "11111111-1111-1111-1111-111111111302",
    slug: "employees-5-15",
    name: "5–15 employees",
    description: "Small crews — more than 5 and up to 15 employees",
  },
  {
    id: "11111111-1111-1111-1111-111111111303",
    slug: "employees-16-plus",
    name: "16+ employees",
    description: "Growing contractors — 16 or more employees",
  },
];

function stableId(key: string) {
  const h = createHash("sha1").update(key).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

type RawRow = Record<string, unknown>;

function rowFields(row: RawRow) {
  return {
    license: str(row.LicenseNumber ?? row.license_number),
    businessName:
      str(row.BusinessName ?? row.business_name) || "Unknown Contractor",
    city: str(row.City ?? row.city),
    zip: str(row.Zip ?? row.zip),
    county: str(row.County ?? row.county),
    phone: str(row.PhoneNumber ?? row.phone_cslb),
    address: str(row.Address),
    state: str(row.State) || "CA",
    businessType: str(row.BusinessType),
    classification: str(row.Classification),
    status: str(row.Status),
  };
}

function nameKey(name: string, city?: string | null, zip?: string | null) {
  return `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}|${(city || "").toLowerCase()}|${zip || ""}`;
}

function sheetToRows(wb: XLSX.WorkBook, name: string): RawRow[] {
  const sheet = wb.Sheets[name];
  if (!sheet) {
    console.warn(`Missing sheet: ${name}`);
    return [];
  }
  return XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null });
}

function assignFunnelStage(seed: string): FunnelStageId | null {
  const n = parseInt(
    createHash("sha1").update(seed).digest("hex").slice(0, 8),
    16,
  );
  if (n % 100 < 35) return null;
  const weights = [28, 18, 14, 12, 9, 7, 5, 4, 3];
  const roll =
    parseInt(
      createHash("sha1").update(seed + ":funnel").digest("hex").slice(0, 4),
      16,
    ) % 100;
  let acc = 0;
  for (let i = 0; i < FUNNEL_STAGES.length; i++) {
    acc += weights[i];
    if (roll < acc) return FUNNEL_STAGES[i].id;
  }
  return FUNNEL_STAGES[0].id;
}

async function main() {
  console.log(`Reading ${XLSX_PATH}`);
  const wb = XLSX.readFile(XLSX_PATH, {
    cellDates: false,
    sheets: ["B-2 Residential Remodeling", "C-6 Cabinet and Millwork"],
  });

  const byLicense = new Map<string, Customer>();
  const byName = new Map<string, Customer>();
  const customers: Customer[] = [];

  function upsert(row: RawRow) {
    const f = rowFields(row);
    if (!f.businessName) return;

    let existing: Customer | undefined;
    if (f.license && byLicense.has(f.license)) {
      existing = byLicense.get(f.license);
    } else {
      existing = byName.get(nameKey(f.businessName, f.city, f.zip));
    }

    if (existing) {
      existing.license_number = existing.license_number || f.license;
      existing.address = existing.address || f.address;
      existing.phone_cslb = existing.phone_cslb || f.phone;
      existing.business_type = existing.business_type || f.businessType;
      existing.classification = existing.classification || f.classification;
      existing.status = existing.status || f.status;
      existing.county = existing.county || f.county;
      existing.zip = existing.zip || f.zip;
      existing.state = existing.state || f.state;
      return;
    }

    const id = stableId(
      f.license
        ? `lic:${f.license}`
        : `name:${f.businessName}|${f.city}|${f.zip ?? ""}`,
    );

    const customer: Customer = {
      id,
      license_number: f.license,
      business_name: f.businessName,
      address: f.address,
      city: f.city,
      state: f.state,
      zip: f.zip,
      county: f.county,
      phone_cslb: f.phone,
      business_type: f.businessType,
      classification: f.classification,
      status: f.status,
      email: null,
      email_status: null,
      phone_mobile: null,
      linkedin_url: null,
      title: null,
      company_domain: null,
      enriched_at: null,
      enrichment_source: null,
      employee_count: null,
      icp_slugs: [],
      funnel_stage: null,
    };

    customers.push(customer);
    if (customer.license_number) {
      byLicense.set(customer.license_number, customer);
    }
    byName.set(
      nameKey(customer.business_name, customer.city, customer.zip),
      customer,
    );
  }

  for (const row of sheetToRows(wb, "B-2 Residential Remodeling")) {
    upsert(row);
  }
  for (const row of sheetToRows(wb, "C-6 Cabinet and Millwork")) {
    upsert(row);
  }

  for (const c of customers) {
    const enriched = mockApolloEnrichment({
      businessName: c.business_name,
      city: c.city,
      phone: c.phone_cslb,
      licenseNumber: c.license_number,
    });
    Object.assign(c, enriched);
    const count = c.employee_count ?? 1;
    c.icp_slugs = [icpSlugForEmployeeCount(count)];
    c.funnel_stage = assignFunnelStage(c.id);
  }

  await writeSeedFile({ icps: ICPS, customers });

  const counts = {
    total: customers.length,
    emp0to5: customers.filter((c) => c.icp_slugs.includes("employees-0-5"))
      .length,
    emp5to15: customers.filter((c) => c.icp_slugs.includes("employees-5-15"))
      .length,
    emp16plus: customers.filter((c) =>
      c.icp_slugs.includes("employees-16-plus"),
    ).length,
    withEmail: customers.filter((c) => c.email).length,
    inFunnel: customers.filter((c) => c.funnel_stage).length,
  };
  console.log("Import complete (employee-band ICPs):", counts);
  console.log("Wrote data/customers.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
