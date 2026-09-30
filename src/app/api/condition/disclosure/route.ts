import { NextResponse } from "next/server";
import { actor, bodyJson, fail, HttpError } from "@/lib/trust/server";
import { deriveAuthoritativeCondition, type TrustedVisionAssessment } from "@/lib/condition-authority";

export const runtime = "nodejs";
const text = (value: unknown, limit = 2000) => typeof value === "string" ? value.slice(0, limit) : null;

export async function POST(request: Request) {
  try {
    const { db, user } = await actor(request);
    const body = await bodyJson(request);
    const productId = Number(body.productId);
    if (!Number.isInteger(productId) || productId <= 0) throw new HttpError(400, "Invalid product.");
    const { data: product, error: productError } = await db.from("products").select("id,seller_id").eq("id", productId).single();
    if (productError || !product || product.seller_id !== user.id) throw new HttpError(403, "You can only save condition details for your own listing.");
    const assessmentId = text(body.assessmentId, 80);
    let authoritative: ReturnType<typeof deriveAuthoritativeCondition> | null = null;
    if (assessmentId) {
      const { data: record, error } = await db.from("vision_condition_assessments").select("id,seller_id,assessment,clarification_questions").eq("id", assessmentId).eq("seller_id", user.id).single();
      if (error || !record) throw new HttpError(403, "Vision assessment is not available for this seller.");
      authoritative = deriveAuthoritativeCondition({ id: record.id, sellerId: record.seller_id, assessment: record.assessment, questions: record.clarification_questions } as TrustedVisionAssessment, body.answers);
    }
    const usageBand = ["never", "lt_1_month", "1_6_months", "6_12_months", "1_2_years", "2_5_years", "5_plus"].includes(String(body.usageBand)) ? String(body.usageBand) : "never";
    const knownIssueStatus = ["yes", "no", "not_sure"].includes(String(body.knownIssueStatus)) ? String(body.knownIssueStatus) : "not_sure";
    const disclosure = {
      product_id: productId, seller_id: user.id, usage_band: usageBand, usage_months: Number.isInteger(body.usageMonths) && Number(body.usageMonths) >= 0 ? Number(body.usageMonths) : null,
      known_issue_status: knownIssueStatus, defects: Array.isArray(body.defects) ? body.defects.slice(0, 12) : [], other_details: text(body.otherDetails),
      refurbished: ["yes", "no", "unknown", "not_applicable"].includes(String(body.refurbished)) ? String(body.refurbished) : "not_applicable", repaired: ["yes", "no", "unknown"].includes(String(body.repaired)) ? String(body.repaired) : "unknown", repair_details: text(body.repairDetails),
      seller_attested_at: new Date().toISOString(), disclosure_version: 1,
      vision_assessment_id: assessmentId, seller_clarification_answers: authoritative?.answers || {}, system_condition_assessment: authoritative?.assessment || null,
      system_condition_factors: authoritative?.factors || [], condition_evidence_provenance: authoritative?.provenance || [], system_condition_factor: authoritative?.conditionFactor ?? null,
      condition_confidence: authoritative?.assessment.conditionConfidence ?? null, condition_needs_review: authoritative?.assessment.needsReview ?? false,
    };
    const { error } = await db.from("product_condition_disclosures").upsert(disclosure, { onConflict: "product_id" });
    if (error) throw new HttpError(503, "Could not save condition assessment.");
    return NextResponse.json({ ok: true, conditionFactor: authoritative?.conditionFactor ?? null, needsReview: authoritative?.assessment.needsReview ?? false });
  } catch (error) { return fail(error); }
}
