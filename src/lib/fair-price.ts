export type ValuationProfile = "FAST_OBSOLESCENCE" | "DURABLE_UTILITY";
export type ConditionDimension = "cosmetic" | "structural" | "functional" | "technical" | "completeness";
export type DepreciationModel = "reducing_balance" | "linear_residual";
export type ValuationPolicy = { profile: ValuationProfile; depreciationModel: DepreciationModel; annualRate?: number; usefulLifeYears?: number; residualFloorPercent: number; applicableConditionDimensions: ConditionDimension[]; assumption: string };
export type ConditionFactor = { factor: ConditionDimension; value: number; source: "vision" | "seller" | "vision+seller"; evidence: string[]; defectKey?: string };
export type HardDeduction = { id: string; amount: number; reason: string; defectKey?: string };

const fastCategories = new Set(["Mobile Phones", "Electronics", "Computers & Accessories"]);
const fastTypes = /smartphone|mobile|iphone|android|laptop|notebook|computer|tablet|smartwatch|camera/;
const FAST: ValuationPolicy = { profile: "FAST_OBSOLESCENCE", depreciationModel: "reducing_balance", annualRate: .25, residualFloorPercent: .2, applicableConditionDimensions: ["cosmetic", "functional", "technical", "completeness"], assumption: "EcoMatch assumption: 25% reducing-balance annual depreciation with a 20% residual floor." };
const DURABLE: ValuationPolicy = { profile: "DURABLE_UTILITY", depreciationModel: "linear_residual", usefulLifeYears: 5, residualFloorPercent: .2, applicableConditionDimensions: ["cosmetic", "structural", "functional"], assumption: "EcoMatch assumption: 5-year linear depreciation with a 20% residual floor." };
const norm = (value: unknown) => typeof value === "string" ? value.toLowerCase() : "";

export function determineValuationProfile(input: { category?: string; productType?: string; material?: string; attributes?: string[] }) {
  const evidence = [input.category, input.productType, input.material, ...(input.attributes || [])].map(norm).join(" ");
  if (fastCategories.has(input.category || "") || fastTypes.test(evidence)) return { policy: FAST, profileReason: "Product attributes indicate technology/model obsolescence can affect value even when physically usable.", profileConfidence: "high" as const };
  const unknown = /unknown|unrecognised|unrecognized/.test(evidence);
  const book = /book|textbook|novel|ncert/.test(evidence);
  const furniture = /chair|table|desk|furniture|wood/.test(evidence);
  const policy = book ? { ...DURABLE, applicableConditionDimensions: ["cosmetic", "structural", "completeness"] as ConditionDimension[] } : furniture ? { ...DURABLE, applicableConditionDimensions: ["cosmetic", "structural"] as ConditionDimension[] } : DURABLE;
  return { policy, profileReason: unknown ? "Unknown product type; durable utility is the conservative default and lowers confidence." : "Reusable product attributes indicate long-term durable utility rather than rapid model obsolescence.", profileConfidence: unknown ? "low" as const : "medium" as const };
}
export function valuationPolicy(category: string, productType = "") { return determineValuationProfile({ category, productType }).policy; }
export function clampDemand(value?: number) { return Math.max(.8, Math.min(1.3, Number.isFinite(value) ? Number(value) : 1)); }

const severity = (value: string) => /crack|broken|large dent|deformation|leak|failure|dead|missing/.test(value) ? .8 : /dent|chip|scratch|paint wear|smudge|wear/.test(value) ? .92 : 1;
export function buildConditionFactors(input: { category?: string; productType?: string; material?: string; observations?: string[]; knownIssueStatus?: string; defects?: { key?: string; label?: string; severity?: string }[] }) {
  const profile = determineValuationProfile(input), observations = [...new Set((input.observations || []).map(norm).filter(Boolean))], factors: ConditionFactor[] = [];
  const add = (factor: ConditionDimension, evidence: string[], source: ConditionFactor["source"], defectKey?: string) => { if (profile.policy.applicableConditionDimensions.includes(factor) && evidence.length && !factors.some((item) => item.factor === factor)) factors.push({ factor, value: Math.min(...evidence.map(severity)), source, evidence, defectKey }); };
  add("cosmetic", observations.filter((x) => /scratch|paint|smudge|scuff|cosmetic|wear/.test(x)), "vision");
  add("structural", observations.filter((x) => /dent|deformation|crack|bent|split|structural/.test(x)), "vision");
  add("functional", observations.filter((x) => /leak|not work|failure|motor|mechanism/.test(x)), "vision");
  add("technical", observations.filter((x) => /battery|screen crack|display|processor|camera failure|technical/.test(x)), "vision");
  add("completeness", observations.filter((x) => /missing|without charger|no charger|accessory/.test(x)), "vision");
  for (const defect of input.defects || []) { const evidence = norm(`${defect.label || ""} ${defect.key || ""} ${defect.severity || ""}`); const dimension: ConditionDimension = /charger|accessory|missing|part/.test(evidence) ? "completeness" : /battery|screen|technical/.test(evidence) ? "technical" : /leak|functional|motor/.test(evidence) ? "functional" : /dent|crack|structural/.test(evidence) ? "structural" : "cosmetic"; add(dimension, [evidence], "seller", defect.key); }
  if (input.knownIssueStatus === "no" && profile.policy.applicableConditionDimensions.includes("functional") && !factors.some((factor) => factor.factor === "functional")) factors.push({ factor: "functional", value: 1, source: "seller", evidence: ["Seller confirmed no known functional issue"] });
  return { ...profile, factors, unknownDimensions: profile.policy.applicableConditionDimensions.filter((dimension) => !factors.some((factor) => factor.factor === dimension)) };
}

export function calculateFairPrice(input: { referencePrice: number | null | undefined; category: string; productType?: string; material?: string; ageMonths?: number | null; conditionFactors?: ConditionFactor[]; hardDeductions?: HardDeduction[]; demandMultiplier?: number; referenceSource?: "current_market" | "seller_reference" }) {
  const reference = Number(input.referencePrice); if (!Number.isFinite(reference) || reference <= 0) return { available: false as const, reason: "A trustworthy current reference price or seller-provided verifiable reference is required before EcoMatch can calculate a fair value." };
  const profile = determineValuationProfile(input), ageKnown = Number.isFinite(input.ageMonths) && Number(input.ageMonths) >= 0, ageYears = ageKnown ? Number(input.ageMonths) / 12 : 0, { policy } = profile, residualFloor = reference * policy.residualFloorPercent;
  const base = policy.depreciationModel === "reducing_balance" ? Math.max(residualFloor, reference * Math.pow(1 - (policy.annualRate || 0), ageYears)) : Math.max(residualFloor, reference - ((reference - residualFloor) / (policy.usefulLifeYears || 1)) * ageYears);
  const factors = (input.conditionFactors || []).filter((factor) => Number.isFinite(factor.value) && factor.value > 0 && factor.value <= 1), conditionMultiplier = factors.reduce((value, factor) => value * factor.value, 1), factorDefects = new Set(factors.map((factor) => factor.defectKey).filter(Boolean)), seen = new Set<string>();
  const deductions = (input.hardDeductions || []).filter((deduction) => Number.isFinite(deduction.amount) && deduction.amount > 0 && !seen.has(deduction.id) && !(deduction.defectKey && factorDefects.has(deduction.defectKey)) && (seen.add(deduction.id), true));
  const hardDeductionTotal = deductions.reduce((total, deduction) => total + deduction.amount, 0), conditionAdjustedValue = base * conditionMultiplier, demandMultiplier = clampDemand(input.demandMultiplier), midpoint = Math.max(0, (conditionAdjustedValue - hardDeductionTotal) * demandMultiplier);
  const confidence = Math.max(0, Math.min(95, (input.referenceSource === "current_market" ? 35 : 15) + (ageKnown ? 20 : 0) + (profile.profileConfidence === "high" ? 15 : profile.profileConfidence === "medium" ? 10 : 5) + Math.min(20, factors.length * 6) + 5));
  const confidenceLabel = confidence >= 75 ? "High" : confidence >= 50 ? "Medium" : "Low", rangeVariance = confidenceLabel === "High" ? .05 : confidenceLabel === "Medium" ? .1 : .15;
  return { available: true as const, policy, valuationProfile: policy.profile, profileReason: profile.profileReason, referencePrice: Math.round(reference), ageYears, ageKnown, residualFloor: Math.round(residualFloor), basePrice: Math.round(base), factors, conditionMultiplier: Number(conditionMultiplier.toFixed(4)), conditionAdjustedValue: Math.round(conditionAdjustedValue), deductions, hardDeductionTotal: Math.round(hardDeductionTotal), demandMultiplier, demandExplanation: "Neutral demand — insufficient marketplace evidence for adjustment.", midpoint: Math.round(midpoint), low: Math.round(midpoint * (1 - rangeVariance)), high: Math.round(midpoint * (1 + rangeVariance)), confidence, confidenceLabel, rangeVariance };
}
