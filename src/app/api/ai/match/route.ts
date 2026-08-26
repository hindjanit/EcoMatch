import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProductInput = {
  id: string;
  title: string;
  category: string;
  material?: string;
  price: number;
  quantity?: number;
  quantity_unit?: string;
  condition?: string;
  description?: string | null;
  specifications?: string | null;
};

const stopWords = new Set([
  "i", "me", "my", "need", "want", "looking", "for", "a", "an", "the", "and", "or", "with", "of", "in", "to", "under", "within", "around", "near", "please", "product", "material", "required", "requirement",
  "chahiye", "chahia", "mujhe", "merako", "mera", "meri", "mere", "ka", "ki", "ke", "hai", "hain", "se", "liye", "konsa", "kaunsa", "best", "hoga", "hona", "banwana", "apne", "ghar", "toh", "tha", "kar", "do"
]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[^\p{L}\p{N}\s.x-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(input: string) {
  return normalizeText(input)
    .split(" ")
    .filter((word) => word.length >= 2 && !stopWords.has(word) && !/^\d+$/.test(word));
}

function fallbackMatch(query: string, products: ProductInput[]) {
  const keywords = extractKeywords(query);
  if (!keywords.length) return [];

  const scored = products
    .map((product) => {
      let score = 0;
      const matchedTerms: string[] = [];
      const titleNorm = normalizeText(product.title || "");
      const matNorm = normalizeText(product.material || "");
      const catNorm = normalizeText(product.category || "");
      const descNorm = normalizeText(product.description || "");

      keywords.forEach((kw) => {
        if (titleNorm.includes(kw)) {
          score += 40;
          matchedTerms.push(kw);
        } else if (matNorm.includes(kw)) {
          score += 35;
          matchedTerms.push(kw);
        } else if (catNorm.includes(kw)) {
          score += 25;
          matchedTerms.push(kw);
        } else if (descNorm.includes(kw)) {
          score += 15;
          matchedTerms.push(kw);
        }
      });

      const normalizedScore = Math.min(99, Math.max(0, score));
      return {
        id: product.id,
        matchScore: normalizedScore,
        matchReason: `Matched keywords in listing title and material specifications.`,
        matchedTerms: [...new Set(matchedTerms)],
      };
    })
    .filter((p) => p.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);

  return scored;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = String(body?.query || "").trim();
    const products = (Array.isArray(body?.products) ? body.products : []) as ProductInput[];

    if (!query || products.length === 0) {
      return NextResponse.json({ matches: [], summary: "" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const matches = fallbackMatch(query, products);
      return NextResponse.json({ matches, summary: "Ranked via EcoMatch Requisition NLP." });
    }

    // Prepare a compact list of candidate products for Gemini prompt
    const candidates = products.slice(0, 30).map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      material: p.material || "N/A",
      price: p.price,
      quantity: `${p.quantity || 1} ${p.quantity_unit || "units"}`,
      condition: p.condition || "Used",
      description: (p.description || "").slice(0, 140),
    }));

    const prompt = `You are EcoMatch AI Requisition Matcher, an intelligent procurement engine for sustainable reuse and circular material trading in India.

User Requisition Query (may be in English, Hindi, or Hinglish, with budget, quantity, material type, or intended usage):
"${query}"

Available Marketplace Products:
${JSON.stringify(candidates, null, 2)}

Instructions:
1. Understand the buyer's intent, budget constraints, material needs, and volume requirements.
2. Evaluate each product and determine if it is relevant. Ignore completely irrelevant products.
3. For matching products, assign a matchScore from 40 to 99 (90+ for exact match, 70-89 for strong match, 40-69 for partial/substitute match).
4. Provide a concise, helpful 1-sentence matchReason in English explaining why this product satisfies the buyer's prompt (mentioning budget/quantity/material fit).
5. Provide 2 to 4 short matchedTerms/tags (e.g. ["Exact Material", "Under Budget", "Sufficient Qty", "Bangalore Available"]).
6. Return ONLY valid JSON in this structure with NO markdown backticks:
{
  "matches": [
    {
      "id": "product_id_here",
      "matchScore": 95,
      "matchReason": "Exact aluminium lot with 200kg available at ₹1,200 (well within your budget).",
      "matchedTerms": ["Aluminium", "Under Budget", "200kg Lot"]
    }
  ],
  "summary": "Brief 1-sentence summary of matched stock found."
}
`;

    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          signal: AbortSignal.timeout(8000),
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 600,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!geminiResponse.ok) {
        const fallback = fallbackMatch(query, products);
        return NextResponse.json({ matches: fallback, summary: "Ranked via EcoMatch Requisition NLP." });
      }

      const raw = await geminiResponse.json();
      const responseText = raw?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("")
        .trim();

      if (!responseText) {
        const fallback = fallbackMatch(query, products);
        return NextResponse.json({ matches: fallback, summary: "Ranked via EcoMatch Requisition NLP." });
      }

      let parsed;
      try {
        const clean = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        const fallback = fallbackMatch(query, products);
        return NextResponse.json({ matches: fallback, summary: "Ranked via EcoMatch Requisition NLP." });
      }

      const validMatches = Array.isArray(parsed.matches)
        ? parsed.matches
            .filter((m: any) => m && m.id && typeof m.matchScore === "number")
            .sort((a: any, b: any) => b.matchScore - a.matchScore)
        : [];

      if (validMatches.length === 0) {
        const fallback = fallbackMatch(query, products);
        return NextResponse.json({ matches: fallback, summary: "No high-confidence AI matches found. Showing best keyword approximations." });
      }

      return NextResponse.json({
        matches: validMatches,
        summary: parsed.summary || `Found ${validMatches.length} AI-verified matching lots.`,
        poweredBy: "Gemini 3.6 Flash",
      });
    } catch (err) {
      console.warn("Gemini AI Match error, using fallback:", err);
      const fallback = fallbackMatch(query, products);
      return NextResponse.json({ matches: fallback, summary: "Ranked via EcoMatch Requisition NLP." });
    }
  } catch (error) {
    console.error("AI match route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI Match failed." },
      { status: 500 }
    );
  }
}
