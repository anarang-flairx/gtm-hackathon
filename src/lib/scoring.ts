import { FUNNEL_STAGES, type Customer, type FunnelStageId } from "@/lib/types";

export type ScoreBreakdown = {
  contactability: number;
  completeness: number;
  licenseQuality: number;
  icpFit: number;
  funnelMomentum: number;
};

export type ProspectScore = {
  total: number;
  grade: "A" | "B" | "C" | "D" | "F";
  label: string;
  breakdown: ScoreBreakdown;
  reasons: string[];
};

const FUNNEL_POINTS: Record<FunnelStageId, number> = {
  message_sent: 2,
  opened: 4,
  clicked: 6,
  responded: 9,
  meeting_scheduled: 11,
  relationship: 12,
  project_requested: 13,
  project_quoted: 14,
  project_closed: 15,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function gradeFor(total: number): ProspectScore["grade"] {
  if (total >= 85) return "A";
  if (total >= 70) return "B";
  if (total >= 55) return "C";
  if (total >= 40) return "D";
  return "F";
}

function labelFor(grade: ProspectScore["grade"]) {
  switch (grade) {
    case "A":
      return "Hot";
    case "B":
      return "Strong";
    case "C":
      return "Warm";
    case "D":
      return "Cool";
    default:
      return "Cold";
  }
}

/**
 * Rank prospects 0–100 from available CSLB + Apollo + funnel fields.
 * Higher = better outbound priority.
 */
export function scoreProspect(customer: Customer): ProspectScore {
  const reasons: string[] = [];

  // Contactability (max 30)
  let contactability = 0;
  if (customer.email) {
    contactability += 10;
    reasons.push("Has email");
    if (customer.email_status === "verified") {
      contactability += 8;
      reasons.push("Verified email");
    } else if (customer.email_status === "guessed") {
      contactability += 4;
    }
  }
  if (customer.phone_mobile || customer.phone_cslb) {
    contactability += 8;
    reasons.push("Has phone");
  }
  if (customer.phone_mobile && customer.phone_cslb) {
    contactability += 2;
  }
  if (customer.linkedin_url) {
    contactability += 2;
  }
  contactability = clamp(contactability, 0, 30);

  // Completeness (max 20)
  let completeness = 0;
  if (customer.address) completeness += 4;
  if (customer.city && customer.zip) completeness += 3;
  if (customer.county) completeness += 2;
  if (customer.classification) completeness += 3;
  if (customer.company_domain) completeness += 3;
  if (customer.title) completeness += 3;
  if (customer.employee_count != null) completeness += 2;
  completeness = clamp(completeness, 0, 20);

  // License / status quality (max 15)
  let licenseQuality = 0;
  if (customer.license_number) {
    licenseQuality += 6;
    reasons.push("Licensed");
  }
  const status = (customer.status || "").toUpperCase();
  if (status.includes("CLEAR")) {
    licenseQuality += 7;
    reasons.push("Clear license status");
  } else if (status) {
    licenseQuality += 2;
  }
  if (customer.business_type) licenseQuality += 2;
  licenseQuality = clamp(licenseQuality, 0, 15);

  // ICP / firmographic fit (max 20) — prefer smaller crews for this GTM motion
  let icpFit = 0;
  const employees = customer.employee_count;
  if (employees != null) {
    if (employees <= 5) {
      icpFit += 14;
      reasons.push("Micro crew (0–5)");
    } else if (employees <= 15) {
      icpFit += 11;
      reasons.push("Small crew (5–15)");
    } else if (employees <= 40) {
      icpFit += 7;
    } else {
      icpFit += 3;
    }
  }
  const bt = (customer.business_type || "").toLowerCase();
  if (bt.includes("sole")) {
    icpFit += 4;
    reasons.push("Sole owner");
  } else if (bt.includes("partnership")) {
    icpFit += 2;
  }
  if (customer.icp_slugs.length > 1) {
    icpFit += 2;
  }
  icpFit = clamp(icpFit, 0, 20);

  // Funnel momentum (max 15)
  let funnelMomentum = 0;
  if (customer.funnel_stage) {
    funnelMomentum = FUNNEL_POINTS[customer.funnel_stage] ?? 0;
    const stageLabel =
      FUNNEL_STAGES.find((s) => s.id === customer.funnel_stage)?.short ||
      customer.funnel_stage;
    reasons.push(`Funnel: ${stageLabel}`);
  }
  funnelMomentum = clamp(funnelMomentum, 0, 15);

  const total = clamp(
    contactability + completeness + licenseQuality + icpFit + funnelMomentum,
    0,
    100,
  );
  const grade = gradeFor(total);

  return {
    total,
    grade,
    label: labelFor(grade),
    breakdown: {
      contactability,
      completeness,
      licenseQuality,
      icpFit,
      funnelMomentum,
    },
    reasons: reasons.slice(0, 5),
  };
}

export function rankCustomers(customers: Customer[]): Array<
  Customer & { score: ProspectScore }
> {
  return customers
    .map((c) => ({ ...c, score: scoreProspect(c) }))
    .sort((a, b) => b.score.total - a.score.total || a.business_name.localeCompare(b.business_name));
}

export function scoreTone(grade: ProspectScore["grade"]) {
  switch (grade) {
    case "A":
      return { bg: "rgba(15,107,76,0.14)", fg: "#0f6b4c" };
    case "B":
      return { bg: "rgba(22,101,52,0.12)", fg: "#166534" };
    case "C":
      return { bg: "rgba(196,92,38,0.12)", fg: "#c45c26" };
    case "D":
      return { bg: "rgba(92,107,99,0.12)", fg: "#5c6b63" };
    default:
      return { bg: "rgba(20,34,28,0.08)", fg: "#14221c" };
  }
}
