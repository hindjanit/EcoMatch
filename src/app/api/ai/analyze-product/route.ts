import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
  "Used",
  "For Parts / Repair",
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
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API key is not configured. Add GEMINI_API_KEY to .env.local and restart the server.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image");
    const sellerText = String(formData.get("sellerText") || "");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Please upload a product image first." },
        { status: 400 }
      );
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "The selected file must be an image." },
        { status: 400 }
      );
    }

    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be 5MB or smaller." },
        { status: 400 }
      );
    }

    const imageBytes = Buffer.from(await image.arrayBuffer());
    const imageBase64 = imageBytes.toString("base64");

    const prompt = `
You are EcoMatch Vision, a product understanding assistant for a sustainable resale and reuse marketplace in India.

Analyze the uploaded product photo carefully. Use the optional seller text only as supporting context; do not blindly trust it if the image disagrees.

Return ONLY valid JSON and no markdown.

Allowed categories:
${allowedCategories.join(", ")}

Allowed conditions:
${allowedConditions.join(", ")}

Required JSON shape:
{
  "productName": "short recognizable product name",
  "category": "exactly one allowed category",
  "productType": "specific product type or main material",
  "brand": "brand if visually identifiable, otherwise Unknown",
  "condition": "exactly one allowed condition",
  "conditionConfidence": 0,
  "classificationConfidence": 0,
  "visibleIssues": ["only clearly visible issues; empty array if none"],
  "suggestedTitle": "concise marketplace title without inventing model details",
  "suggestedDescription": "2 to 3 sentence factual listing description based on what is visible and seller context",
  "suggestedSpecifications": ["short factual specification or visible attribute"],
  "reusePotential": "High or Medium or Low",
  "notes": "brief uncertainty note; mention if model number, age, internal condition or authenticity cannot be confirmed from image"
}

Rules:
- Never invent exact model number, storage, RAM, year, purchase date, battery health, internal functionality, authenticity, ownership, or dimensions unless clearly visible or provided in seller text.
- Condition is only a visual estimate. If the photo is insufficient, choose the closest allowed condition conservatively and explain uncertainty in notes.
- classificationConfidence and conditionConfidence must be integer percentages from 0 to 100.
- suggestedSpecifications should contain no more than 6 items.
- Keep output suitable for a resale listing.

Seller context:
${sellerText || "No seller text provided."}
`;

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
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
                    mimeType: image.type,
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const raw = await geminiResponse.json();

    if (!geminiResponse.ok) {
      const message =
        raw?.error?.message ||
        "Gemini could not analyze the image. Please try again.";

      return NextResponse.json({ error: message }, { status: geminiResponse.status });
    }

    const responseText = raw?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("")
      .trim();

    if (!responseText) {
      return NextResponse.json(
        { error: "AI returned an empty response. Please try another image." },
        { status: 502 }
      );
    }

    let analysis;

    try {
      analysis = JSON.parse(cleanJson(responseText));
    } catch {
      return NextResponse.json(
        { error: "AI response could not be parsed. Please try again." },
        { status: 502 }
      );
    }

    if (!allowedCategories.includes(analysis.category)) {
      analysis.category = "Other";
    }

    if (!allowedConditions.includes(analysis.condition)) {
      analysis.condition = "Used";
    }

    analysis.classificationConfidence = Math.max(
      0,
      Math.min(100, Math.round(Number(analysis.classificationConfidence) || 0))
    );

    analysis.conditionConfidence = Math.max(
      0,
      Math.min(100, Math.round(Number(analysis.conditionConfidence) || 0))
    );

    analysis.visibleIssues = Array.isArray(analysis.visibleIssues)
      ? analysis.visibleIssues.slice(0, 6).map(String)
      : [];

    analysis.suggestedSpecifications = Array.isArray(
      analysis.suggestedSpecifications
    )
      ? analysis.suggestedSpecifications.slice(0, 6).map(String)
      : [];

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("EcoMatch Vision API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while analyzing the product image.",
      },
      { status: 500 }
    );
  }
}
