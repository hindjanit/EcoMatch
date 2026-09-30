import { NextResponse } from "next/server";

export const runtime = "nodejs";

function visionFailure(code: string, message: string, status: number, details: Record<string, unknown> = {}) {
  console.error("[Vision AI]", { code, apiKeyPresent: Boolean(process.env.GEMINI_API_KEY), ...details });
  return NextResponse.json({ error: message, code }, { status });
}

const allowedCategories = [
  "Mobile Phones",
  "Electronics",
  "Computers & Accessories",
  "Home Appliances",
  "Furniture & Home",
  "Vehicles & Auto Parts",
  "Fashion & Accessories",
  "Books & Education",
  "Sports & Fitness",
  "Toys & Kids",
  "Industrial & Business",
  "Construction Materials",
  "Metals",
  "Plastic",
  "Wood",
  "Electrical Materials",
  "Machinery & Equipment",
  "Packaging Materials",
  "Industrial Goods",
  "Other",
];

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

export async function POST(request: Request) {
  try {
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
2. Category must be chosen from Allowed categories (e.g. "Computers & Accessories" for mice/keyboards/laptops, "Mobile Phones" for phones, "Electronics" for gadgets, "Metals" for metal lots).
3. Independently estimate only the VISIBLE condition: New, Like New, Good, Fair, Poor, Damaged, or Unknown. Inspect scratches, dents, cracks, stains, discoloration, rust/corrosion, missing or broken parts, wear, and packaging/seals. Never infer internal functionality from a photo. Use Unknown when visible evidence is insufficient.
4. Produce a crisp marketplace title (e.g. "HP Wireless Optical Mouse"), product type ("Wireless Mouse"), detailed 2-sentence description, and 3-5 bullet specifications (e.g. ["2.4GHz Wireless Dongle / Bluetooth", "Optical Sensor Tracking", "Ergonomic Grip", "Buttons & Scroll Wheel Intact"]).

Return ONLY valid JSON and no markdown backticks.

Allowed categories:
${allowedCategories.join(", ")}

Allowed conditions:
${allowedConditions.join(", ")}

Required JSON shape:
{
  "productName": "short recognizable product name (e.g. HP Wireless Mouse)",
  "category": "exactly one allowed category (e.g. Computers & Accessories)",
  "productType": "specific product type (e.g. Wireless Optical Mouse)",
  "brand": "HP or Logitech or Dell or brand if visible, otherwise Unknown",
  "condition": "New | Like New | Good | Fair | Poor | Damaged | Unknown",
  "conditionConfidence": 0.90,
  "conditionReason": "Visible evidence supporting the condition, or why it is Unknown",
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
      const model = process.env.GEMINI_VISION_MODEL;
      if (!model) return visionFailure("VISION_MODEL_NOT_CONFIGURED", "Vision AI is temporarily unavailable.", 503, { stage: "configuration", configuredModel: null, modelAccessible: "unknown", generateContentSupported: "unknown" });
      if (!/^[a-zA-Z0-9.-]+$/.test(model)) return visionFailure("VISION_MODEL_INVALID", "Vision AI is temporarily unavailable.", 503, { stage: "configuration", model });
      console.info("[Vision AI]", { stage: "request_start", configuredModel: model, apiKeyPresent: true, modelAccessible: "unknown", generateContentSupported: "unknown", imageMime: mimeType, imagePayloadCreated: true });
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
            maxOutputTokens: 350,
            responseMimeType: "application/json",
          },
        }),
      });

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

      if (!responseText) {
        return visionFailure("VISION_RESPONSE_INVALID", "Vision AI returned an unusable assessment. Try another clear product photo.", 502, { stage: "response_empty", model, imageMime: mimeType, imagePayloadCreated: true });
      }

      let analysis;
      try {
        analysis = JSON.parse(cleanJson(responseText));
      } catch {
        return visionFailure("VISION_RESPONSE_INVALID", "Vision AI returned an unusable assessment. Try another clear product photo.", 502, { stage: "response_parse", model, imageMime: mimeType, imagePayloadCreated: true });
      }

      if (!allowedCategories.includes(analysis.category)) {
        analysis.category = "Other";
      }

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

      analysis.suggestedSpecifications = Array.isArray(
        analysis.suggestedSpecifications
      )
        ? analysis.suggestedSpecifications.slice(0, 6).map(String)
        : [];

      console.info("[Vision AI]", { stage: "response_success", configuredModel: model, apiKeyPresent: true, modelAccessible: true, generateContentSupported: true, imageMime: mimeType, imagePayloadCreated: true });
      return NextResponse.json({ analysis });
    } catch (error) {
      const timeout = error instanceof Error && error.name === "TimeoutError";
      return visionFailure(timeout ? "VISION_TIMEOUT" : "VISION_UPSTREAM_ERROR", timeout ? "Vision AI timed out. Please try again." : "Vision AI is temporarily unavailable.", 502, { stage: "request_exception", configuredModel: process.env.GEMINI_VISION_MODEL || null, modelAccessible: "unknown", generateContentSupported: "unknown", imageMime: mimeType, imagePayloadCreated: true, errorType: error instanceof Error ? error.name : "unknown" });
    }
  } catch (error) {
    return visionFailure("VISION_REQUEST_INVALID", "We couldn't read that product image. Please try another image.", 400, {
      stage: "request_parsing",
      errorType: error instanceof Error ? error.name : "unknown",
      imagePayloadCreated: false,
    });
  }
}
