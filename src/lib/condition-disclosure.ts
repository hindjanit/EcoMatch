export const USAGE_BANDS = [["never", "Never used"], ["lt_1_month", "<1 month"], ["1_6_months", "1–6 months"], ["6_12_months", "6–12 months"], ["1_2_years", "1–2 years"], ["2_5_years", "2–5 years"], ["5_plus", "5+ years"]] as const;
export type DefectSeverity = "minor" | "moderate" | "major" | "critical";
export type DeclaredDefect = { key: string; label: string; severity: DefectSeverity };
export type Disclosure = { usageBand: string; usageMonths?: number | null; knownIssueStatus: "yes" | "no" | "not_sure"; defects: DeclaredDefect[]; otherDetails?: string | null; refurbished: string; repaired: string; repairDetails?: string | null };
const common = [{ key: "other", label: "Other issue / additional details", severity: "minor" as const }];
const byCategory: Record<string, DeclaredDefect[]> = {
  Electronics: [{ key: "battery", label: "Battery issue", severity: "moderate" }, { key: "charging", label: "Charging issue", severity: "moderate" }, { key: "connectivity", label: "Connectivity issue", severity: "moderate" }],
  "Mobile Phones": [{ key: "display", label: "Display or touch issue", severity: "major" }, { key: "battery", label: "Battery degradation", severity: "moderate" }, { key: "charging", label: "Charging issue", severity: "moderate" }, { key: "camera", label: "Camera issue", severity: "moderate" }, { key: "speaker", label: "Speaker or microphone issue", severity: "moderate" }, { key: "buttons", label: "Buttons issue", severity: "minor" }],
  "Computers & Accessories": [{ key: "battery", label: "Battery issue", severity: "moderate" }, { key: "display", label: "Display issue", severity: "major" }, { key: "keyboard", label: "Keyboard or trackpad issue", severity: "moderate" }, { key: "ports", label: "Port or charging issue", severity: "moderate" }, { key: "overheating", label: "Overheating", severity: "major" }],
  "Furniture & Home": [{ key: "leakage", label: "Leakage", severity: "major" }, { key: "crack", label: "Crack or structural damage", severity: "major" }, { key: "lid_seal", label: "Damaged lid or seal", severity: "moderate" }, { key: "staining", label: "Internal staining", severity: "minor" }, { key: "corrosion", label: "Rust or corrosion", severity: "moderate" }, { key: "odour", label: "Contamination or odour", severity: "major" }],
  "Machinery & Equipment": [{ key: "mechanical", label: "Mechanical defect", severity: "major" }, { key: "electrical", label: "Electrical defect", severity: "major" }, { key: "missing_parts", label: "Missing parts", severity: "major" }, { key: "safety", label: "Safety-related issue", severity: "critical" }],
};
export function questionsForCategory(category: string) { return [...(byCategory[category] || []), ...common]; }
export function assessDisclosure(aiVisual: string | null | undefined, disclosure: Disclosure) {
  const ranks: DefectSeverity[] = ["minor", "moderate", "major", "critical"];
  const maximum = disclosure.defects.reduce<DefectSeverity | null>((current, defect) => !current || ranks.indexOf(defect.severity) > ranks.indexOf(current) ? defect.severity : current, null);
  const ai = aiVisual && ["New", "Like New", "Good", "Fair", "Poor", "Damaged"].includes(aiVisual) ? aiVisual : null;
  const overallCondition = maximum === "critical" || maximum === "major" ? "Damaged" : maximum === "moderate" || disclosure.knownIssueStatus !== "no" || disclosure.repaired === "yes" ? "Fair" : ai || (disclosure.usageBand === "never" ? "New" : "Good");
  const reusePotential = maximum === "critical" ? "Recycle Recommended" : maximum === "major" || maximum === "moderate" ? "Repair Required" : disclosure.knownIssueStatus === "not_sure" ? "Medium" : "High";
  const reason = `${ai ? `Visual assessment: ${ai}.` : "Visual assessment unavailable."} ${disclosure.defects.length ? `Seller declared: ${disclosure.defects.map((d) => d.label).join(", ")}.` : "Seller declared no specific defect."}`;
  return { overallCondition, reusePotential, reason };
}

export type DisclosureMismatch = { code: "VISIBLE_DAMAGE_NOT_DISCLOSED" | "AI_SELLER_CONDITION_CONFLICT" | "DISCLOSURE_MISSING" | "DISCLOSURE_INCOMPLETE"; reason: string };
export function detectDisclosureMismatch(aiVisual: string | null | undefined, aiReason: string | null | undefined, disclosure: { known_issue_status?: string; defects?: DeclaredDefect[]; seller_attested_at?: string | null } | null): DisclosureMismatch[] {
  if (!disclosure) return [{ code: "DISCLOSURE_MISSING", reason: "Seller condition disclosure is not available for this older listing." }];
  const issues = disclosure.defects || [];
  if (!disclosure.seller_attested_at || !disclosure.known_issue_status) return [{ code: "DISCLOSURE_INCOMPLETE", reason: "Seller condition disclosure is incomplete." }];
  const visibleDamage = /visible\s+(crack|damage|break)|crack|severe damage/i.test(aiReason || "") || ["Poor", "Damaged"].includes(aiVisual || "");
  if (visibleDamage && disclosure.known_issue_status === "no" && issues.length === 0) return [{ code: aiVisual === "Poor" || aiVisual === "Damaged" ? "AI_SELLER_CONDITION_CONFLICT" : "VISIBLE_DAMAGE_NOT_DISCLOSED", reason: "AI visual evidence indicates visible damage while the seller declared no known defects." }];
  return [];
}
