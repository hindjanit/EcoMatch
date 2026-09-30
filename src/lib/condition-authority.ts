import { applySellerClarifications, factorsFromAssessment, type ClarificationQuestion, type ConditionAssessment } from "./condition-assessment";

export type TrustedVisionAssessment = { id: string; sellerId: string; assessment: ConditionAssessment; questions: ClarificationQuestion[] };
export type SystemConditionFactor = { dimension: string; severity: string; factor: number; source: "SYSTEM_DERIVED"; derivedFrom: string[]; evidence: string[] };

export function deriveAuthoritativeCondition(trusted: TrustedVisionAssessment, answers: unknown) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) throw new Error("Invalid seller clarification answers.");
  const input = answers as Record<string, unknown>;
  const validated: Record<string, string> = {};
  for (const question of trusted.questions) {
    const answer = input[question.id];
    if (answer === undefined) continue;
    if (typeof answer !== "string" || !question.options.includes(answer as "yes" | "no" | "not_sure")) throw new Error("Invalid seller clarification answer.");
    validated[question.id] = answer;
  }
  // Unknown fields are intentionally ignored. A browser cannot invent a new
  // dimension, severity, source, confidence or multiplier through this path.
  const assessment = applySellerClarifications(trusted.assessment, trusted.questions, validated);
  const factors: SystemConditionFactor[] = factorsFromAssessment(assessment).map((factor) => ({
    dimension: factor.factor,
    severity: assessment.conditionDimensions[factor.factor].status,
    factor: factor.value,
    source: "SYSTEM_DERIVED",
    derivedFrom: assessment.conditionDimensions[factor.factor].source === "seller" ? ["SELLER_DECLARED"] : ["VISION_VERIFIED"],
    evidence: factor.evidence,
  }));
  const provenance: Array<Record<string, unknown>> = Object.entries(assessment.conditionDimensions).flatMap(([dimension, value]) => {
    if (value.status === "unknown" || value.status === "not_applicable") return [];
    return [{ dimension, severity: value.status, source: value.source === "seller" ? "SELLER_DECLARED" : "VISION_VERIFIED", evidence: value.evidence || [] }];
  });
  provenance.push(...Object.entries(validated).map(([question, answer]) => ({ question, answer, source: "SELLER_DECLARED", evidence: [`Seller clarification: ${question}=${answer}`] })));
  return { assessment, answers: validated, factors, provenance, conditionFactor: Number(factors.reduce((total, factor) => total * factor.factor, 1).toFixed(4)) };
}
