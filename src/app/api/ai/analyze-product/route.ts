import { NextResponse } from "next/server";
import { validateCategory, VISION_CATEGORIES } from "@/lib/vision-category";
import { generateClarificationQuestions, normaliseVisionCondition } from "@/lib/condition-assessment";
import { actor, fail } from "@/lib/trust/server";

export const runtime = "nodejs";

function visionFailure(code: string, message: string, status: number, details: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[Vision AI] ${JSON.stringify({ stage: typeof details.stage === "string" ? details.stage : "FAILURE", code, httpStatus: status, errorName: typeof details.errorType === "string" ? details.errorType : null, errorMessage: typeof details.errorMessage === "string" ? details.errorMessage : null, upstreamStatus: typeof details.upstreamStatus === "number" ? details.upstreamStatus : null, upstreamCode: typeof details.upstreamCode === "string" ? details.upstreamCode : null })}`);
  }
  return NextResponse.json({ error: message, code }, { status });
}

const allowedConditions = [
  "New",
  "Like New",
  "Good",
  "Fair",
  "Poor",
  "Damaged",
  "Unknown",
];

function cleanJson(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  return trimmed;
}

function devVisionLog(stage: string, details: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === "production") return;
  const entry = {
    stage,
    errorName: typeof details.errorName === "string" ? details.errorName : null,
    errorMessage: typeof details.errorMessage === "string" ? details.errorMessage : null,
    errorCode: typeof details.errorCode === "string" ? details.errorCode : null,
    httpStatus: typeof details.httpStatus === "number" ? details.httpStatus : null,
    finishReason: typeof details.finishReason === "string" ? details.finishReason : null,
    responseTextLength: typeof details.responseTextLength === "number" ? details.responseTextLength : null,
    responsePreview: typeof details.responsePreview === "string" ? details.responsePreview.slice(0, 500) : null,
    jsonParsed: typeof details.jsonParsed === "boolean" ? details.jsonParsed : null,
    topLevelKeys: Array.isArray(details.topLevelKeys) ? details.topLevelKeys.map(String) : [],
    productType: typeof details.productType === "string" ? details.productType : null,
    material: typeof details.material === "string" ? details.material : null,
    observationCount: typeof details.observationCount === "number" ? details.observationCount : null,
    dimensionKeys: Array.isArray(details.dimensionKeys) ? details.dimensionKeys.map(String) : [],
    dimensionStatuses: details.dimensionStatuses && typeof details.dimensionStatuses === "object" ? details.dimensionStatuses : {},
    severityValues: Array.isArray(details.severityValues) ? details.severityValues.map((value) => value === null ? null : String(value)) : [],
    questionCount: typeof details.questionCount === "number" ? details.questionCount : null,
    missingFields: Array.isArray(details.missingFields) ? details.missingFields.map(String) : [],
    invalidFields: Array.isArray(details.invalidFields) ? details.invalidFields.map(String) : [],
  };
  console.error(`[Vision Phase25] ${JSON.stringify(entry)}`);
}

function phase25ContractDiagnostics(analysis: Record<string, unknown>) {
  const missingFields = ["productType", "material", "visibleObservations", "conditionDimensions"].filter((field) => analysis[field] === undefined || analysis[field] === null || analysis[field] === "");
  const dimensions = analysis.conditionDimensions && typeof analysis.conditionDimensions === "object" ? analysis.conditionDimensions as Record<string, unknown> : {};
  const dimensionKeys = Object.keys(dimensions);
  return { missingFields, dimensionKeys, productType: analysis.productType || null, material: analysis.material || null, visibleObservationsCount: Array.isArray(analysis.visibleObservations) ? analysis.visibleObservations.length : null };
}

export async function POST(request: Request) {
  try {
    const { db, user } = await actor(request);
    const formData = await request.formData();
    const image = formData.get("image");
    const sellerText = String(formData.get("sellerText") || "");

    if (!(image instanceof File)) {
      return visionFailure("VISION_IMAGE_INVALID", "Please upload a product image first.", 400, { stage: "input_validation", imagePayloadCreated: false });
    }

    if (!image.type.startsWith("image/")) {
      return visionFailure("VISION_IMAGE_INVALID", "The selected file must be an image.", 400, { stage: "input_validation", imagePayloadCreated: false });
    }

    if (image.size > 5 * 1024 * 1024) {
      return visionFailure("VISION_IMAGE_INVALID", "Image must be 5MB or smaller.", 400, { stage: "input_validation", imageMime: image.type, imagePayloadCreated: false });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return visionFailure("VISION_API_KEY_MISSING", "Vision AI is temporarily unavailable.", 503, { stage: "configuration" });

    const imageBytes = Buffer.from(await image.arrayBuffer());
    const imageBase64 = imageBytes.toString("base64");

    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
    const mimeType = validMimes.includes(image.type)
      ? image.type
      : image.name.toLowerCase().endsWith(".png")
      ? "image/png"
      : "image/jpeg";

    const prompt = `
You are EcoMatch Vision AI, an expert product understanding assistant for a sustainable resale, reuse, and circular materials marketplace in India.

Analyze the uploaded product photo carefully. Inspect the object's physical form, branding, logos, labels, materials, and ports.

Guidelines for Identification:
1. If the photo shows a computer peripheral (e.g. mouse, keyboard, headphones, monitor), identify it accurately. If an HP, Dell, Logitech, Lenovo, or Apple logo/text is visible, include the brand name and exact product type (e.g. "HP Wireless Mouse", "Logitech Wireless Keyboard").
2. Identify the specific product type and visible material. A deterministic EcoMatch layer will assign the final category; do not guess an unrelated category.
3. Independently estimate only the VISIBLE condition: New, Like New, Good, Fair, Poor, Damaged, or Unknown. Inspect scratches, dents, cracks, stains, discoloration, rust/corrosion, missing or broken parts, wear, and packaging/seals. Never infer internal functionality from a photo. Use Unknown when visible evidence is insufficient.
4. Keep every text field concise: title up to 80 characters, description up to 240 characters, reason/notes up to 180 characters, specifications up to 4 short items, and at most 4 visible observations. Do not repeat evidence across fields.
5. Return every one of the five condition dimensions. Use "unknown" where a static image cannot establish a condition and "not_applicable" only where the dimension is irrelevant. Never infer leakage, internal functionality, battery health, or seal performance from a static image.

Return ONLY valid JSON and no markdown backticks.

Allowed final EcoMatch categories:
${VISION_CATEGORIES.join(", ")}

Allowed conditions:
${allowedConditions.join(", ")}

Required JSON shape:
{
  "productName": "short recognizable product name (e.g. HP Wireless Mouse)",
  "category": "best provisional category from the allowed list",
  "productType": "specific product type (e.g. Wireless Optical Mouse)",
  "material": "visible material such as stainless steel, PET plastic, copper, wood, or Unknown",
  "brand": "HP or Logitech or Dell or brand if visible, otherwise Unknown",
  "condition": "New | Like New | Good | Fair | Poor | Damaged | Unknown",
  "conditionConfidence": 0.90,
  "conditionReason": "Visible evidence supporting the condition, or why it is Unknown",
  "visibleObservations": [{ "type": "scratch", "description": "Light surface scratches on the side", "dimension": "cosmetic", "severity": "minor", "confidence": 0.85 }],
  "conditionDimensions": {
    "cosmetic": { "status": "minor", "confidence": 0.85 },
    "structural": { "status": "unknown" },
    "functional": { "status": "unknown" },
    "technical": { "status": "not_applicable" },
    "completeness": { "status": "unknown" }
  },
  "estimatedWeightKg": 0.35,
  "weightConfidence": 0.72,
  "weightBasis": "Visible form factor and typical construction; estimate only",
  "classificationConfidence": 95,
  "visibleIssues": ["only clearly visible issues like scuffs/scratches; empty array if clean"],
  "suggestedTitle": "HP Wireless Optical Mouse (Black)",
  "suggestedDescription": "Pre-owned HP wireless optical mouse in good condition. Features smooth optical tracking and responsive click buttons, ready for circular reuse.",
  "suggestedSpecifications": ["HP 2.4GHz Wireless", "Optical Sensor Tracking", "Standard Battery Slot", "Compact Ergonomic Shape"],
  "reusePotential": "High",
  "notes": "Visual condition inspected. Optical sensor and casing clean."
}

Seller context:
${sellerText || "No seller text provided."}
`;

    try {
      // Preserve the last known working classifier model when Vercel has no
      // explicit override. This is a provider default, never an analysis fallback.
      const model = process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash-lite";
      if (!/^[a-zA-Z0-9.-]+$/.test(model)) return visionFailure("VISION_MODEL_INVALID", "Vision AI is temporarily unavailable.", 503, { stage: "configuration", model });
      devVisionLog("GEMINI_REQUEST_START", {});
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const geminiResponse = await fetch(endpoint, {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                productName: { type: "STRING" }, category: { type: "STRING" }, productType: { type: "STRING" }, material: { type: "STRING" }, brand: { type: "STRING" }, condition: { type: "STRING" }, conditionConfidence: { type: "NUMBER" }, conditionReason: { type: "STRING" }, estimatedWeightKg: { type: "NUMBER" }, weightConfidence: { type: "NUMBER" }, weightBasis: { type: "STRING" }, classificationConfidence: { type: "NUMBER" }, visibleIssues: { type: "ARRAY", items: { type: "STRING" } }, suggestedTitle: { type: "STRING" }, suggestedDescription: { type: "STRING" }, suggestedSpecifications: { type: "ARRAY", items: { type: "STRING" } }, reusePotential: { type: "STRING" }, notes: { type: "STRING" },
                visibleObservations: { type: "ARRAY", items: { type: "OBJECT", properties: { type: { type: "STRING" }, description: { type: "STRING" }, dimension: { type: "STRING", enum: ["cosmetic", "structural", "functional", "technical", "completeness"] }, severity: { type: "STRING", enum: ["excellent", "minor", "moderate", "major", "severe"] }, confidence: { type: "NUMBER" } }, required: ["type", "description", "dimension", "severity", "confidence"] } },
                conditionDimensions: { type: "OBJECT", properties: Object.fromEntries(["cosmetic", "structural", "functional", "technical", "completeness"].map((dimension) => [dimension, { type: "OBJECT", properties: { status: { type: "STRING", enum: ["excellent", "minor", "moderate", "major", "severe", "unknown", "not_applicable"] }, confidence: { type: "NUMBER" } }, required: ["status"] }])) },
              },
              required: ["productName", "productType", "material", "condition", "conditionConfidence", "conditionReason", "visibleObservations", "conditionDimensions"],
            },
          },
        }),
      });
      devVisionLog("GEMINI_HTTP_RESPONSE", { httpStatus: geminiResponse.status });

      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json().catch(() => null);
        const upstreamCode = typeof errorData?.error?.status === "string" ? errorData.error.status : "UNKNOWN";
        const code = geminiResponse.status === 404 ? "VISION_MODEL_NOT_FOUND" : geminiResponse.status === 401 || geminiResponse.status === 403 ? "VISION_AUTH_FAILED" : geminiResponse.status === 429 ? "VISION_RATE_LIMITED" : "VISION_UPSTREAM_ERROR";
        const message = code === "VISION_RATE_LIMITED" ? "Vision AI is temporarily busy. Please try again." : "Vision AI is temporarily unavailable.";
        return visionFailure(code, message, geminiResponse.status === 429 ? 429 : 502, { stage: "gemini_request", configuredModel: model, upstreamStatus: geminiResponse.status, upstreamCode, modelAccessible: geminiResponse.status === 404 ? false : "unknown", generateContentSupported: geminiResponse.status === 404 ? false : "unknown", imageMime: mimeType, imagePayloadCreated: true });
      }

      const raw = await geminiResponse.json();
      const responseText = raw?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("")
        .trim();
      devVisionLog("GEMINI_TEXT_EXTRACTED", { finishReason: typeof raw?.candidates?.[0]?.finishReason === "string" ? raw.candidates[0].finishReason : null, responseTextLength: typeof responseText === "string" ? responseText.length : null, responsePreview: typeof responseText === "string" ? responseText : null, topLevelKeys: raw && typeof raw === "object" ? Object.keys(raw) : [] });

      if (raw?.candidates?.[0]?.finishReason === "MAX_TOKENS") {
        devVisionLog("GEMINI_TEXT_EXTRACTED", { errorName: "VisionResponseTruncated", errorMessage: "Gemini stopped at MAX_TOKENS; truncated JSON was rejected.", finishReason: "MAX_TOKENS", responseTextLength: responseText.length, responsePreview: responseText, jsonParsed: false, topLevelKeys: raw && typeof raw === "object" ? Object.keys(raw) : [] });
        return visionFailure("VISION_RESPONSE_TRUNCATED", "Vision AI needs a moment to complete its assessment. Please retry.", 502, { stage: "response_truncated", model, imageMime: mimeType, imagePayloadCreated: true });
      }

      if (!responseText) {
        devVisionLog("JSON_PARSE", { errorName: "VisionResponseError", errorMessage: "Gemini candidate contained no text", jsonParsed: false, finishReason: typeof raw?.candidates?.[0]?.finishReason === "string" ? raw.candidates[0].finishReason : null, topLevelKeys: raw && typeof raw === "object" ? Object.keys(raw) : [] });
        return visionFailure("VISION_RESPONSE_INVALID", "Vision AI returned an unusable assessment. Try another clear product photo.", 502, { stage: "response_empty", model, imageMime: mimeType, imagePayloadCreated: true });
      }

      let analysis;
      try {
        analysis = JSON.parse(cleanJson(responseText));
        devVisionLog("JSON_PARSE", { jsonParsed: true, topLevelKeys: analysis && typeof analysis === "object" ? Object.keys(analysis) : [] });
      } catch (error) {
        devVisionLog("JSON_PARSE", { errorName: error instanceof Error ? error.name : "UnknownError", errorMessage: error instanceof Error ? error.message : String(error), responseTextLength: responseText.length, responsePreview: responseText, jsonParsed: false, topLevelKeys: raw && typeof raw === "object" ? Object.keys(raw) : [] });
        return visionFailure("VISION_RESPONSE_INVALID", "Vision AI returned an unusable assessment. Try another clear product photo.", 502, { stage: "response_parse", model, imageMime: mimeType, imagePayloadCreated: true });
      }

      const diagnostics = phase25ContractDiagnostics(analysis as Record<string, unknown>);
      if (diagnostics.missingFields.length) {
        devVisionLog("CONTRACT_VALIDATION", { errorName: "VisionContractError", errorMessage: "Required Phase25 contract fields missing", jsonParsed: true, topLevelKeys: Object.keys(analysis), productType: typeof diagnostics.productType === "string" ? diagnostics.productType : null, material: typeof diagnostics.material === "string" ? diagnostics.material : null, observationCount: diagnostics.visibleObservationsCount, dimensionKeys: diagnostics.dimensionKeys, missingFields: diagnostics.missingFields, invalidFields: [] });
        return visionFailure("VISION_RESPONSE_INVALID", "Vision AI returned an unusable assessment. Try another clear product photo.", 502, { stage: "phase25_contract", model, imageMime: mimeType, imagePayloadCreated: true });
      }
      devVisionLog("CONTRACT_VALIDATION", { jsonParsed: true, topLevelKeys: Object.keys(analysis), productType: typeof diagnostics.productType === "string" ? diagnostics.productType : null, material: typeof diagnostics.material === "string" ? diagnostics.material : null, observationCount: diagnostics.visibleObservationsCount, dimensionKeys: diagnostics.dimensionKeys, severityValues: Array.isArray(analysis.visibleObservations) ? analysis.visibleObservations.map((entry: unknown) => entry && typeof entry === "object" ? (entry as Record<string, unknown>).severity || null : null) : [], missingFields: [], invalidFields: [] });

      const category = validateCategory({ productType: analysis.productType || analysis.productName, material: analysis.material, aiCategory: analysis.category, observations: [analysis.conditionReason, ...(Array.isArray(analysis.visibleIssues) ? analysis.visibleIssues : [])] });
      analysis.aiCategory = analysis.category;
      analysis.category = category.category;
      analysis.categoryConfidence = category.categoryConfidence;
      analysis.categoryNeedsReview = category.categoryNeedsReview;

      if (!allowedConditions.includes(analysis.condition)) analysis.condition = "Unknown";
      analysis.visualCondition = analysis.condition;

      analysis.classificationConfidence = Math.max(
        0,
        Math.min(100, Math.round(Number(analysis.classificationConfidence) || 0))
      );

      analysis.conditionConfidence = Math.max(
        0,
        Math.min(100, Math.round(Number(analysis.conditionConfidence) || 0))
      );
      analysis.conditionReason = typeof analysis.conditionReason === "string" ? analysis.conditionReason.slice(0, 500) : "Visible condition could not be determined.";
      const estimatedWeightKg = Number(analysis.estimatedWeightKg);
      analysis.estimatedWeightKg = Number.isFinite(estimatedWeightKg) && estimatedWeightKg > 0 && estimatedWeightKg <= 100000 ? Math.round(estimatedWeightKg * 1000) / 1000 : null;
      analysis.weightConfidence = Math.max(0, Math.min(1, Number(analysis.weightConfidence) || 0));
      analysis.weightBasis = typeof analysis.weightBasis === "string" ? analysis.weightBasis.slice(0, 500) : "No reliable visual weight estimate.";

      analysis.visibleIssues = Array.isArray(analysis.visibleIssues)
        ? analysis.visibleIssues.slice(0, 6).map(String)
        : [];

      // Vision evidence is constrained to what a photo can support. This
      // normalizer deliberately preserves unknowns rather than inventing a
      // functional or technical defect from a static image.
      const conditionAssessment = normaliseVisionCondition({
        visibleObservations: analysis.visibleObservations,
        conditionDimensions: analysis.conditionDimensions,
      });
      analysis.conditionAssessment = conditionAssessment;
      analysis.conditionConfidence = conditionAssessment.conditionConfidence;
      analysis.clarificationQuestions = generateClarificationQuestions(
        String(analysis.productType || analysis.productName || ""),
        String(analysis.material || ""),
        conditionAssessment.conditionDimensions,
      );
      devVisionLog("NORMALIZATION", { dimensionKeys: Object.keys(conditionAssessment.conditionDimensions), dimensionStatuses: Object.fromEntries(Object.entries(conditionAssessment.conditionDimensions).map(([key, value]) => [key, value.status])), questionCount: analysis.clarificationQuestions.length });
      devVisionLog("ASSESSMENT_READY", { productType: typeof analysis.productType === "string" ? analysis.productType : null, material: typeof analysis.material === "string" ? analysis.material : null, observationCount: conditionAssessment.visibleObservations.length, dimensionKeys: Object.keys(conditionAssessment.conditionDimensions), dimensionStatuses: Object.fromEntries(Object.entries(conditionAssessment.conditionDimensions).map(([key, value]) => [key, value.status])), questionCount: analysis.clarificationQuestions.length });
      devVisionLog("PERSISTENCE_START", {});
      const { data: storedAssessment, error: storageError } = await db
        .from("vision_condition_assessments")
        .insert({ seller_id: user.id, assessment: conditionAssessment, clarification_questions: analysis.clarificationQuestions, vision_model: model })
        .select("id")
        .single();
      if (storageError || !storedAssessment) {
        devVisionLog("PERSISTENCE_RESULT", { errorCode: typeof storageError?.code === "string" ? storageError.code : null, errorMessage: typeof storageError?.message === "string" ? storageError.message : "Assessment insert returned no record" });
        return visionFailure("VISION_ASSESSMENT_PERSIST_FAILED", "Vision analysis could not be saved securely. Please try again.", 503, { stage: "assessment_persist", configuredModel: model });
      }
      analysis.assessmentId = storedAssessment.id;
      devVisionLog("PERSISTENCE_RESULT", {});

      analysis.suggestedSpecifications = Array.isArray(
        analysis.suggestedSpecifications
      )
        ? analysis.suggestedSpecifications.slice(0, 6).map(String)
        : [];

      return NextResponse.json({ analysis });
    } catch (error) {
      const timeout = error instanceof Error && error.name === "TimeoutError";
      return visionFailure(timeout ? "VISION_TIMEOUT" : "VISION_UPSTREAM_ERROR", timeout ? "Vision AI timed out. Please try again." : "Vision AI is temporarily unavailable.", 502, { stage: "request_exception", configuredModel: process.env.GEMINI_VISION_MODEL || null, modelAccessible: "unknown", generateContentSupported: "unknown", imageMime: mimeType, imagePayloadCreated: true, errorType: error instanceof Error ? error.name : "unknown" });
    }
  } catch (error) {
    if (error instanceof Error && ("status" in error)) return fail(error);
    return visionFailure("VISION_REQUEST_INVALID", "We couldn't read that product image. Please try another image.", 400, {
      stage: "request_parsing",
      errorType: error instanceof Error ? error.name : "unknown",
      imagePayloadCreated: false,
    });
  }
}
