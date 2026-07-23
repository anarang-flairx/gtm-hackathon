import { createHash } from "crypto";
import path from "path";
import * as XLSX from "xlsx";
import { mockApolloEnrichment, writeSeedFile } from "../src/lib/local-db";
import type { Customer, Icp } from "../src/lib/types";

const XLSX_PATH =
  process.env.CSLB_XLSX_PATH ||
  path.join(
    process.env.HOME || "",
    "Desktop",
    "CSLB Contractor List.xlsx",
  );

const ICPS: Icp[] = [
  {
    id: "11111111-1111-1111-1111-111111111101",
    slug: "b2-residential",
    name: "B-2 Residential Remodeling",
  },
  {
    id: "11111111-1111-1111-1111-111111111102",
    slug: "c6-cabinet",
    name: "C-6 Cabinet and Millwork",
  },
  {
    id: "11111111-1111-1111-1111-111111111103",
    slug: "norcal",
    name: "NorCal",
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

function rowToCustomer(
  row: RawRow,
  icpSlug: string,
  existing?: Customer,
): Customer {
  const license = str(row.LicenseNumber ?? row.license_number);
  const businessName =
    str(row.BusinessName ?? row.business_name) || "Unknown Contractor";
  const city = str(row.City ?? row.city);
  const phone = str(row.PhoneNumber ?? row.phone_cslb);
  const id =
    existing?.id ||
    stableId(
      license
        ? `lic:${license}`
        : `name:${businessName}|${city}|${str(row.Zip) ?? ""}`,
    );

  const base: Customer = existing ?? {
    id,
    license_number: license,
    business_name: businessName,
    address: str(row.Address),
    city,
    state: str(row.State) || "CA",
    zip: str(row.Zip),
    county: str(row.County),
    phone_cslb: phone,
    business_type: str(row.BusinessType),
    classification: str(row.Classification),
    status: str(row.Status),
    email: null,
    email_status: null,
    phone_mobile: null,
    linkedin_url: null,
    title: null,
    company_domain: null,
    enriched_at: null,
    enrichment_source: null,
    icp_slugs: [],
  };

  // Prefer richer CSLB fields when merging NorCal onto existing
  if (!existing) {
    // first write
  } else {
    base.license_number = base.license_number || license;
    base.address = base.address || str(row.Address);
    base.phone_cslb = base.phone_cslb || phone;
    base.business_type = base.business_type || str(row.BusinessType);
    base.classification = base.classification || str(row.Classification);
    base.status = base.status || str(row.Status);
    base.county = base.county || str(row.County);
    base.zip = base.zip || str(row.Zip);
    base.state = base.state || str(row.State) || "CA";
  }

  if (!base.icp_slugs.includes(icpSlug)) {
    base.icp_slugs = [...base.icp_slugs, icpSlug];
  }

  return base;
}

function sheetToRows(wb: XLSX.WorkBook, name: string): RawRow[] {
  const sheet = wb.Sheets[name];
  if (!sheet) {
    console.warn(`Missing sheet: ${name}`);
    return [];
  }
  return XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null });
}

function nameKey(name: string, city?: string | null, zip?: string | null) {
  return `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}|${(city || "").toLowerCase()}|${zip || ""}`;
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

  function upsert(row: RawRow, icpSlug: string, norcalLite = false) {
    const license = str(row.LicenseNumber);
    const businessName = str(row.BusinessName);
    if (!businessName) return;

    let existing: Customer | undefined;
    if (license && byLicense.has(license)) {
      existing = byLicense.get(license);
    } else {
      const key = nameKey(businessName, str(row.City), str(row.Zip));
      existing = byName.get(key);
    }

    const customer = rowToCustomer(row, icpSlug, existing);
    if (!existing) {
      customers.push(customer);
      if (customer.license_number) {
        byLicense.set(customer.license_number, customer);
      }
      byName.set(
        nameKey(customer.business_name, customer.city, customer.zip),
        customer,
      );
    }

    // For NorCal lite rows without license, still attach ICP
    if (norcalLite && existing) {
      if (!existing.icp_slugs.includes(icpSlug)) {
        existing.icp_slugs.push(icpSlug);
      }
    }
  }

  for (const row of sheetToRows(wb, "B-2 Residential Remodeling")) {
    upsert(row, "b2-residential");
  }
  for (const row of sheetToRows(wb, "C-6 Cabinet and Millwork")) {
    upsert(row, "c6-cabinet");
  }

  // NorCal: match onto richer rows when possible
  for (const row of sheetToRows(wb, "Apollo for NorCal")) {
    const businessName = str(row.BusinessName);
    if (!businessName) continue;
    const key = nameKey(businessName, str(row.City), str(row.Zip));
    const existing = byName.get(key);
    if (existing) {
      if (!existing.icp_slugs.includes("norcal")) {
        existing.icp_slugs.push("norcal");
      }
    } else {
      upsert(row, "norcal", true);
    }
  }

  // Apply mock Apollo enrichment
  for (const c of customers) {
    const enriched = mockApolloEnrichment({
      businessName: c.business_name,
      city: c.city,
      phone: c.phone_cslb,
      licenseNumber: c.license_number,
    });
    Object.assign(c, enriched);
  }

  await writeSeedFile({ icps: ICPS, customers });

  const counts = {
    total: customers.length,
    b2: customers.filter((c) => c.icp_slugs.includes("b2-residential")).length,
    c6: customers.filter((c) => c.icp_slugs.includes("c6-cabinet")).length,
    norcal: customers.filter((c) => c.icp_slugs.includes("norcal")).length,
    withEmail: customers.filter((c) => c.email).length,
  };
  console.log("Import complete:", counts);
  console.log("Wrote data/customers.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
