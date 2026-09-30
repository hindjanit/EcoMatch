export const CONDITION_DIMENSIONS = ["cosmetic", "structural", "functional", "technical", "completeness"] as const;
export const CONDITION_SEVERITIES = ["excellent", "minor", "moderate", "major", "severe", "unknown", "not_applicable"] as const;
export type ConditionDimension = typeof CONDITION_DIMENSIONS[number];
export type ConditionSeverity = typeof CONDITION_SEVERITIES[number];
export type ConditionSource = "vision" | "seller" | "vision+seller";
export type ConditionObservation = { type: string; description: string; dimension: ConditionDimension; severity: ConditionSeverity; confidence: number };
export type ConditionDimensionResult = { status: ConditionSeverity; confidence?: number; source?: ConditionSource; evidence?: string[] };
export type ConditionAssessment = { visibleObservations: ConditionObservation[]; conditionDimensions: Record<ConditionDimension, ConditionDimensionResult>; conditionConfidence: number; hasConflict: boolean; needsReview: boolean };
export type ClarificationQuestion = { id: string; dimension: ConditionDimension; prompt: string; options: Array<"yes" | "no" | "not_sure">; normalAnswer: "yes" | "no"; defectAnswer: "yes" | "no"; defectSeverity: Exclude<ConditionSeverity, "unknown" | "not_applicable"> };

export const SEVERITY_FACTORS: Record<Exclude<ConditionSeverity, "unknown" | "not_applicable">, number> = { excellent: 1, minor: .95, moderate: .85, major: .7, severe: .5 };
const normalise = (value: unknown) => typeof value === "string" ? value.toLowerCase().trim().replace(/[\s\-/]+/g, "_") : "";
const safeSeverity = (value: unknown): ConditionSeverity => {
  const normalized = normalise(value);
  if (CONDITION_SEVERITIES.includes(normalized as ConditionSeverity)) return normalized as ConditionSeverity;
  if (["n_a", "na", "not_applicable"].includes(normalized)) return "not_applicable";
  if (["minor_wear", "minor_damage"].includes(normalized)) return "minor";
  if (["moderate_wear", "moderate_damage"].includes(normalized)) return "moderate";
  if (["major_wear", "major_damage"].includes(normalized)) return "major";
  if (["severe_wear", "severe_damage"].includes(normalized)) return "severe";
  return "unknown";
};
const safeDimension = (value: unknown): ConditionDimension | null => CONDITION_DIMENSIONS.includes(normalise(value) as ConditionDimension) ? normalise(value) as ConditionDimension : null;
const confidence = (value: unknown) => Math.max(0, Math.min(1, Number(value) || 0));

export function normaliseVisionCondition(input: unknown): ConditionAssessment {
  const raw = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const rawObservations = Array.isArray(raw.visibleObservations) ? raw.visibleObservations : [];
  const visibleObservations = rawObservations.flatMap((entry): ConditionObservation[] => {
    const item = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    const dimension = safeDimension(item.dimension);
    const description = typeof item.description === "string" ? item.description.slice(0, 400) : "";
    if (!dimension || !description) return [];
    const severity = safeSeverity(item.severity);
    if (severity === "unknown" || severity === "not_applicable") return [];
    return [{ type: typeof item.type === "string" ? item.type.slice(0, 80) : "visible_observation", description, dimension, severity, confidence: confidence(item.confidence) }];
  }).slice(0, 12);
  const sourceDimensions = raw.conditionDimensions && typeof raw.conditionDimensions === "object" ? raw.conditionDimensions as Record<string, unknown> : {};
  const conditionDimensions = Object.fromEntries(CONDITION_DIMENSIONS.map((dimension) => {
    const value = sourceDimensions[dimension] && typeof sourceDimensions[dimension] === "object" ? sourceDimensions[dimension] as Record<string, unknown> : {};
    const strongest = visibleObservations.filter((x) => x.dimension === dimension).sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];
    const status = strongest?.severity || safeSeverity(value.status);
    const submittedSource = value.source === "seller" || value.source === "vision+seller" ? value.source : "vision";
    const submittedEvidence = Array.isArray(value.evidence) ? value.evidence.filter((entry): entry is string => typeof entry === "string").slice(0, 4) : [];
    return [dimension, { status, confidence: strongest?.confidence ?? confidence(value.confidence), source: strongest ? "vision" as const : submittedSource, evidence: strongest ? [strongest.description] : submittedEvidence }];
  })) as Record<ConditionDimension, ConditionDimensionResult>;
  const assessment = { visibleObservations, conditionDimensions, conditionConfidence: 0, hasConflict: false, needsReview: false };
  return { ...assessment, conditionConfidence: calculateConditionConfidence(assessment) };
}

function severityRank(value: ConditionSeverity) { return ["not_applicable", "unknown", "excellent", "minor", "moderate", "major", "severe"].indexOf(value); }

export function generateClarificationQuestions(productType: string, material = "", dimensions?: Record<ConditionDimension, ConditionDimensionResult>): ClarificationQuestion[] {
  const text = `${productType} ${material}`.toLowerCase();
  const status = (dimension: ConditionDimension) => dimensions?.[dimension]?.status || "unknown";
  const questions: ClarificationQuestion[] = [];
  const add = (question: ClarificationQuestion) => { if (status(question.dimension) === "unknown" && !questions.some((item) => item.id === question.id) && questions.length < 4) questions.push(question); };
  if (/bottle|flask|thermos|container/.test(text)) { add({ id: "leakage", dimension: "functional", prompt: "Does the item leak during normal use?", options: ["no", "yes", "not_sure"], normalAnswer: "no", defectAnswer: "yes", defectSeverity: "major" }); add({ id: "seal", dimension: "functional", prompt: "Does the cap close and seal properly?", options: ["yes", "no", "not_sure"], normalAnswer: "yes", defectAnswer: "no", defectSeverity: "moderate" }); }
  else if (/fan/.test(text)) { add({ id: "motor", dimension: "functional", prompt: "Does the fan motor run normally?", options: ["yes", "no", "not_sure"], normalAnswer: "yes", defectAnswer: "no", defectSeverity: "major" }); add({ id: "noise", dimension: "functional", prompt: "Does it make unusual noise while operating?", options: ["no", "yes", "not_sure"], normalAnswer: "no", defectAnswer: "yes", defectSeverity: "moderate" }); }
  else if (/chair|table|stool|furniture/.test(text)) add({ id: "stability", dimension: "structural", prompt: "Does it wobble during normal use?", options: ["no", "yes", "not_sure"], normalAnswer: "no", defectAnswer: "yes", defectSeverity: "major" });
  else if (/laptop|notebook/.test(text)) { add({ id: "powers_on", dimension: "functional", prompt: "Does the laptop power on normally?", options: ["yes", "no", "not_sure"], normalAnswer: "yes", defectAnswer: "no", defectSeverity: "major" }); add({ id: "battery", dimension: "technical", prompt: "Is the battery working normally?", options: ["yes", "no", "not_sure"], normalAnswer: "yes", defectAnswer: "no", defectSeverity: "moderate" }); add({ id: "charger", dimension: "completeness", prompt: "Is the charger included?", options: ["yes", "no", "not_sure"], normalAnswer: "yes", defectAnswer: "no", defectSeverity: "moderate" }); }
  else if (/book|textbook|novel/.test(text)) add({ id: "missing_pages", dimension: "completeness", prompt: "Are any pages missing?", options: ["no", "yes", "not_sure"], normalAnswer: "no", defectAnswer: "yes", defectSeverity: "major" });
  return questions;
}

export function applySellerClarifications(assessment: ConditionAssessment, questions: ClarificationQuestion[], answers: Record<string, string>): ConditionAssessment {
  const conditionDimensions = structuredClone(assessment.conditionDimensions);
  let hasConflict = assessment.hasConflict;
  for (const question of questions) {
    const answer = answers[question.id];
    if (!question.options.includes(answer as "yes" | "no" | "not_sure")) continue;
    const existing = conditionDimensions[question.dimension];
    if (answer === "not_sure") continue;
    const sellerStatus: ConditionSeverity = answer === question.normalAnswer ? "excellent" : question.defectSeverity;
    if (existing.status !== "unknown" && existing.status !== "not_applicable" && sellerStatus === "excellent" && severityRank(existing.status) >= severityRank("moderate")) hasConflict = true;
    if (existing.status === "unknown" || existing.status === "not_applicable" || severityRank(sellerStatus) > severityRank(existing.status)) conditionDimensions[question.dimension] = { status: sellerStatus, confidence: .8, source: "seller", evidence: [`Seller answer: ${question.id}=${answer}`] };
  }
  const result = { ...assessment, conditionDimensions, hasConflict, needsReview: assessment.needsReview || hasConflict };
  return { ...result, conditionConfidence: calculateConditionConfidence(result) };
}

export function calculateConditionConfidence(assessment: Pick<ConditionAssessment, "conditionDimensions" | "hasConflict">) {
  const relevant = CONDITION_DIMENSIONS.filter((dimension) => assessment.conditionDimensions[dimension].status !== "not_applicable");
  const verified = relevant.filter((dimension) => !["unknown"].includes(assessment.conditionDimensions[dimension].status));
  const signal = verified.reduce((sum, dimension) => sum + (assessment.conditionDimensions[dimension].confidence || 0), 0) / Math.max(verified.length, 1);
  const unresolved = relevant.length - verified.length;
  return Math.round(Math.max(0, Math.min(100, (signal * 65) + (verified.length / Math.max(relevant.length, 1) * 35) - unresolved * 8 - (assessment.hasConflict ? 20 : 0))));
}

export function factorsFromAssessment(assessment: ConditionAssessment) {
  return CONDITION_DIMENSIONS.flatMap((dimension) => {
    const value = assessment.conditionDimensions[dimension];
    const factor = SEVERITY_FACTORS[value.status as keyof typeof SEVERITY_FACTORS];
    return factor === undefined ? [] : [{ factor: dimension, value: factor, source: value.source || "vision", evidence: value.evidence || [] }];
  });
}
