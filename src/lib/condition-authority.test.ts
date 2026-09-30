import assert from "node:assert/strict";
import test from "node:test";
import { deriveAuthoritativeCondition } from "./condition-authority";
import { generateClarificationQuestions, normaliseVisionCondition } from "./condition-assessment";
const assessment = normaliseVisionCondition({ visibleObservations: [{ type: "paint_loss", description: "Visible coating loss", dimension: "cosmetic", severity: "major", confidence: .9 }], conditionDimensions: { functional: { status: "unknown" } } });
const trusted = { id: "00000000-0000-4000-8000-000000000001", sellerId: "seller-a", assessment, questions: generateClarificationQuestions("stainless steel bottle", "steel", assessment.conditionDimensions) };
test("authority ignores browser supplied severity, factors, confidence and C_total", () => { const result = deriveAuthoritativeCondition(trusted, { leakage: "no", cosmetic: "excellent", factor: 1, conditionFactor: 1, visionConfidence: 100, visibleObservations: [], source: "SELLER_DECLARED" }); assert.equal(result.assessment.conditionDimensions.cosmetic.status, "major"); assert.equal(result.conditionFactor, .7); assert.equal(result.factors[0].source, "SYSTEM_DERIVED"); });
test("authority rejects invalid question answers", () => assert.throws(() => deriveAuthoritativeCondition(trusted, { leakage: "excellent" }), /Invalid seller clarification/));
test("authority ignores answers for another product question", () => { const result = deriveAuthoritativeCondition(trusted, { laptop_battery: "yes" }); assert.deepEqual(result.answers, {}); assert.equal(result.assessment.conditionDimensions.functional.status, "unknown"); });
