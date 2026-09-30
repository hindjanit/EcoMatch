export type DepreciationModel = "reducing_balance" | "linear_residual";
export type ValuationPolicy = { depreciationModel: DepreciationModel; annualRate?: number; usefulLifeYears?: number; residualFloorPercent: number };
export type ConditionFactor = { factor: string; value: number; source: string; defectKey?: string };
export type HardDeduction = { id: string; amount: number; reason: string; defectKey?: string };

const FAST = new Set(["Mobile Phones", "Electronics", "Computers & Accessories"]);
const DURABLE = new Set(["Metals", "Wood", "Construction Materials", "Furniture & Home", "Industrial Goods"]);

export function valuationPolicy(category: string, productType = ""): ValuationPolicy {
  const type = productType.toLowerCase();
  if (FAST.has(category) || /phone|laptop|computer|tablet|camera/.test(type)) return { depreciationModel: "reducing_balance", annualRate: 0.28, residualFloorPercent: 0.2 };
  if (DURABLE.has(category) || /chair|table|book|machine|tool/.test(type)) return { depreciationModel: "linear_residual", usefulLifeYears: 10, residualFloorPercent: 0.2 };
  return { depreciationModel: "linear_residual", usefulLifeYears: 7, residualFloorPercent: 0.15 };
}

export function clampDemand(value?: number) { return Math.max(0.8, Math.min(1.3, Number.isFinite(value) ? Number(value) : 1)); }

export function calculateFairPrice(input: {
  referencePrice: number | null | undefined;
  category: string;
  productType?: string;
  ageMonths?: number;
  conditionFactors?: ConditionFactor[];
  hardDeductions?: HardDeduction[];
  demandMultiplier?: number;
  referenceSource?: string;
}) {
  const reference = Number(input.referencePrice);
  if (!Number.isFinite(reference) || reference <= 0) return { available: false as const, reason: "A trustworthy current reference price or seller-provided reference is required before EcoMatch can calculate a fair value." };
  const policy = valuationPolicy(input.category, input.productType);
  const ageYears = Math.max(0, Number(input.ageMonths || 0) / 12);
  const residualFloor = reference * policy.residualFloorPercent;
  const base = policy.depreciationModel === "reducing_balance"
    ? Math.max(residualFloor, reference * Math.pow(1 - (policy.annualRate || 0), ageYears))
    : Math.max(residualFloor, reference - ((reference - residualFloor) / (policy.usefulLifeYears || 1)) * ageYears);
  const factors = (input.conditionFactors || []).filter((factor) => Number.isFinite(factor.value) && factor.value > 0 && factor.value <= 1);
  const factorValue = factors.reduce((value, factor) => value * factor.value, 1);
  const factorDefects = new Set(factors.map((factor) => factor.defectKey).filter(Boolean));
  const usedDeductions = new Set<string>();
  const deductions = (input.hardDeductions || []).filter((deduction) => {
    if (!Number.isFinite(deduction.amount) || deduction.amount <= 0 || usedDeductions.has(deduction.id)) return false;
    // A defect may be either a percentage factor or a monetary repair cost, never both.
    if (deduction.defectKey && factorDefects.has(deduction.defectKey)) return false;
    usedDeductions.add(deduction.id);
    return true;
  });
  const hardDeductionTotal = deductions.reduce((total, deduction) => total + deduction.amount, 0);
  const afterConditions = base * factorValue;
  const beforeDemand = Math.max(0, afterConditions - hardDeductionTotal);
  const demandMultiplier = clampDemand(input.demandMultiplier);
  const midpoint = Math.max(0, beforeDemand * demandMultiplier);
  const confidence = input.referenceSource === "current_market" ? factors.length >= 2 ? "High" : "Medium" : "Low";
  const variance = confidence === "High" ? 0.05 : confidence === "Medium" ? 0.1 : 0.15;
  return {
    available: true as const,
    policy,
    referencePrice: Math.round(reference),
    basePrice: Math.round(base),
    conditionFactor: Number(factorValue.toFixed(4)),
    conditionAdjustment: Math.round(afterConditions - base),
    factors,
    deductions,
    hardDeductionTotal: Math.round(hardDeductionTotal),
    demandMultiplier,
    demandExplanation: demandMultiplier === 1 ? "Neutral demand — insufficient marketplace evidence for adjustment." : "Demand adjustment is based on documented internal marketplace evidence.",
    midpoint: Math.round(midpoint),
    low: Math.round(midpoint * (1 - variance)),
    high: Math.round(midpoint * (1 + variance)),
    confidence,
  };
}
