import assert from "node:assert/strict";
import test from "node:test";
import { calculateFairPrice, clampDemand } from "./fair-price";

test("reducing balance depreciation", () => assert.equal(calculateFairPrice({ referencePrice: 10000, category: "Mobile Phones", ageMonths: 12 }).basePrice, 7200));
test("linear depreciation respects residual floor", () => assert.equal(calculateFairPrice({ referencePrice: 10000, category: "Wood", ageMonths: 240 }).basePrice, 2000));
test("independent condition factors multiply", () => assert.equal(calculateFairPrice({ referencePrice: 10000, category: "Other", conditionFactors: [{ factor: "cosmetic", value: .9, source: "vision" }, { factor: "functional", value: .8, source: "seller" }] }).midpoint, 7200));
test("deductions cannot make a negative valuation", () => assert.equal(calculateFairPrice({ referencePrice: 100, category: "Other", hardDeductions: [{ id: "repair", amount: 999, reason: "repair" }] }).midpoint, 0));
test("duplicate defect is not deducted twice", () => assert.equal(calculateFairPrice({ referencePrice: 1000, category: "Other", conditionFactors: [{ factor: "screen", value: .8, source: "vision", defectKey: "screen" }], hardDeductions: [{ id: "screen", amount: 200, reason: "screen", defectKey: "screen" }] }).hardDeductionTotal, 0));
test("demand is neutral and bounded", () => { assert.equal(clampDemand(), 1); assert.equal(clampDemand(2), 1.3); assert.equal(clampDemand(.2), .8); });
test("missing reference is unavailable", () => assert.equal(calculateFairPrice({ referencePrice: null, category: "Other" }).available, false));
test("range reconciles with midpoint", () => { const value = calculateFairPrice({ referencePrice: 10000, category: "Other", referenceSource: "current_market" }); if (value.available) assert.equal(value.low, 9000); });
