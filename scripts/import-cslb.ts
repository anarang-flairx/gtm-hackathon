import { createHash } from "crypto";
import path from "path";
import * as XLSX from "xlsx";
import { mockApolloEnrichment, writeSeedFile } from "../src/lib/local-db";
import type { Customer, FunnelStageId, Icp } from "../src/lib/types";
import { FUNNEL_STAGES } from "../src/lib/types";

const XLSX_PATH =
  process.env.CSLB_XLSX_PATH ||
  path.join(process.env.HOME || "", "Desktop", "CSLB Contractor List.xlsx");

/** Very small contractors only — Sole Owner ICPs */
const ICPS: Icp[] = [
  {
    id: "11111111-1111-1111-1111-111111111201",
    slug: "micro-remodel",
    name: "Micro Sole Owner Remodelers",
    description: "Sole Owner B-2 residential remodelers — very small shops",
  },
  {
    id: "11111111-1111-1111-1111-111111111202",
    slug: "micro-cabinet",
    name: "Micro Sole Owner Millwork",
    description: "Sole Owner C-6 cabinet / millwork — very small shops",
  },
  {
    id: "11111111-1111-1111-1111-111111111203",
    slug: "micro-norcal",
    name: "Micro Sole Owner NorCal",
    description: "Sole Owner contractors in NorCal counties — very small shops",
  },
];

const NORCAL_COUNTIES = new Set(
  [
    "Alameda",
    "Contra Costa",
    "Marin",
    "Napa",
    "San Francisco",
    "San Mateo",
    "Santa Clara",
    "Solano",
    "Sonoma",
    "Sacramento",
    "Yolo",
    "Santa Cruz",
    "Monterey",
    "San Benito",
    "Mendocino",
    "Lake",
  ].map((c) => c.toLowerCase()),
);

function stableId(key: string) {
  const h = createHash("sha1").update(key).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function isSoleOwner(businessType: string | null) {
  if (!businessType) return false;
  const t = businessType.toLowerCase();
  return t.includes("sole") || t === "individual" || t.includes("sole proprietor");
}

function hasClass(classification: string | null, code: string) {
  if (!classification) return false;
  const normalized = classification.toUpperCase().replace(/\s+/g, "");
  const target = code.toUpperCase().replace(/\s+/g, "");
  return normalized.split("|").some((part) => part.includes(target));
}

type RawRow = Record<string, unknown>;

function rowFields(row: RawRow) {
  return {
    license: str(row.LicenseNumber ?? row.license_number),
    businessName: str(row.BusinessName ?? row.business_name) || "Unknown Contractor",
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
  const n = parseInt(createHash("sha1").update(seed).digest("hex").slice(0, 8), 16);
  // ~35% not yet touched; rest spread across funnel with falloff
  if (n % 100 < 35) return null;
  const weights = [28, 18, 14, 12, 9, 7, 5, 4, 3]; // sum 100 of remaining distribution
  let roll = n % 100;
  // remap using hash
  roll = parseInt(createHash("sha1").update(seed + ":funnel").digest("hex").slice(0, 4), 16) % 100;
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
    sheets: [
      "B-2 Residential Remodeling",
      "C-6 Cabinet and Millwork",
      "Apollo for NorCal",
    ],
  });

  const byLicense = new Map<string, Customer>();
  const byName = new Map<string, Customer>();
  const customers: Customer[] = [];

  function ensureCustomer(row: RawRow): Customer | null {
    const f = rowFields(row);
    if (!isSoleOwner(f.businessType) && f.businessType !== null) {
      // NorCal lite rows may lack business type — allow if later matched
    }
    // Require Sole Owner when business type is present
    if (f.businessType && !isSoleOwner(f.businessType)) return null;

    let existing: Customer | undefined;
    if (f.license && byLicense.has(f.license)) existing = byLicense.get(f.license);
    else existing = byName.get(nameKey(f.businessName, f.city, f.zip));

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
      return existing;
    }

    // Skip creating if we know it's not sole owner
    if (f.businessType && !isSoleOwner(f.businessType)) return null;
    // Skip creating NorCal-name-only rows without sole-owner confirmation
    if (!f.businessType) return null;

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
      icp_slugs: [],
      funnel_stage: null,
    };

    customers.push(customer);
    if (customer.license_number) byLicense.set(customer.license_number, customer);
    byName.set(nameKey(customer.business_name, customer.city, customer.zip), customer);
    return customer;
  }

  function addIcp(c: Customer, slug: string) {
    if (!c.icp_slugs.includes(slug)) c.icp_slugs.push(slug);
  }

  // B-2 sole owners → micro-remodel
  for (const row of sheetToRows(wb, "B-2 Residential Remodeling")) {
    const f = rowFields(row);
    if (!isSoleOwner(f.businessType)) continue;
    if (!hasClass(f.classification, "B-2") && !hasClass(f.classification, "B2")) {
      // sheet is already B-2 focused; still include
    }
    const c = ensureCustomer(row);
    if (c) addIcp(c, "micro-remodel");
  }

  // C-6 sole owners → micro-cabinet
  for (const row of sheetToRows(wb, "C-6 Cabinet and Millwork")) {
    const f = rowFields(row);
    if (!isSoleOwner(f.businessType)) continue;
    const c = ensureCustomer(row);
    if (c) addIcp(c, "micro-cabinet");
  }

  // Build NorCal name set from Apollo sheet, then tag sole owners in those areas
  const norcalNames = new Set<string>();
  for (const row of sheetToRows(wb, "Apollo for NorCal")) {
    const f = rowFields(row);
    norcalNames.add(nameKey(f.businessName, f.city, f.zip));
    norcalNames.add(nameKey(f.businessName, f.city, null));
  }

  for (const c of customers) {
    const inApolloList =
      norcalNames.has(nameKey(c.business_name, c.city, c.zip)) ||
      norcalNames.has(nameKey(c.business_name, c.city, null));
    const inNorCalCounty =
      !!c.county && NORCAL_COUNTIES.has(c.county.toLowerCase());
    if (inApolloList || inNorCalCounty) {
      if (isSoleOwner(c.business_type)) addIcp(c, "micro-norcal");
    }
  }

  // Keep only customers that landed in at least one ICP
  const kept = customers.filter((c) => c.icp_slugs.length > 0);

  for (const c of kept) {
    const enriched = mockApolloEnrichment({
      businessName: c.business_name,
      city: c.city,
      phone: c.phone_cslb,
      licenseNumber: c.license_number,
    });
    Object.assign(c, enriched);
    c.funnel_stage = assignFunnelStage(c.id);
  }

  await writeSeedFile({ icps: ICPS, customers: kept });

  const counts = {
    total: kept.length,
    microRemodel: kept.filter((c) => c.icp_slugs.includes("micro-remodel")).length,
    microCabinet: kept.filter((c) => c.icp_slugs.includes("micro-cabinet")).length,
    microNorcal: kept.filter((c) => c.icp_slugs.includes("micro-norcal")).length,
    withEmail: kept.filter((c) => c.email).length,
    inFunnel: kept.filter((c) => c.funnel_stage).length,
  };
  console.log("Import complete (Sole Owner / micro ICPs only):", counts);
  console.log("Wrote data/customers.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
