import { NextResponse } from "next/server";
import { buildConditionFactors, calculateFairPrice, type HardDeduction } from "@/lib/fair-price";
import { deriveAuthoritativeCondition, type TrustedVisionAssessment } from "@/lib/condition-authority";
import { actor, HttpError } from "@/lib/trust/server";

export const runtime = "nodejs";

type ShoppingResult = {
  title?: string;
  link?: string;
  source?: string;
  price?: string;
  extracted_price?: number;
  old_price?: string;
  extracted_old_price?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function getAgeFactor(category: string, monthsUsed: number) {
  const months = Math.max(0, monthsUsed || 0);
  const fast = ["Mobile Phones", "Electronics", "Computers & Accessories"];
  const medium = ["Home Appliances", "Vehicles & Auto Parts", "Sports & Fitness"];
  const annualRate = fast.includes(category) ? 0.28 : medium.includes(category) ? 0.2 : 0.14;
  return clamp(Math.pow(1 - annualRate, months / 12), 0.28, 1);
}

function getConditionFactor(condition: string) {
  const factors: Record<string, number> = {
    New: 0.95,
    "Like New": 0.85,
    Good: 0.72,
    Used: 0.58,
    "For Parts / Repair": 0.3,
  };
  return factors[condition] ?? 0.65;
}

function calculateVerdict(
  sellerPrice: number,
  fairMin: number,
  fairMax: number,
  newReferencePrice: number,
  condition: string
) {
  if (condition !== "New" && sellerPrice >= newReferencePrice * 0.95) {
    return "Overpriced Buy New Instead";
  }
  if (sellerPrice < fairMin * 0.88) return "Great Deal";
  if (sellerPrice < fairMin) return "Good Deal";
  if (sellerPrice <= fairMax) return "Fair Price";
  if (sellerPrice <= fairMax * 1.15) return "Slightly Overpriced";
  return "Overpriced";
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function importantTokens(value: string) {
  const stop = new Set([
    "wireless", "computer", "mouse", "keyboard", "headphone", "headphones",
    "smartphone", "phone", "laptop", "new", "india", "with", "for", "and",
    "the", "a", "an", "product", "accessory", "accessories",
  ]);

  return normalize(value)
    .split(" ")
    .filter((token) => token.length >= 2 && !stop.has(token));
}

function modelLikeTokens(value: string) {
  return importantTokens(value).filter((token) => /[a-z]+\d+|\d+[a-z]+|\d{2,}/i.test(token));
}

function matchScore(requested: string, resultTitle: string) {
  const requestTokens = importantTokens(requested);
  const result = normalize(resultTitle);
  if (requestTokens.length === 0) return 0;

  const matched = requestTokens.filter((token) => result.includes(token));
  let score = matched.length / requestTokens.length;

  const models = modelLikeTokens(requested);
  if (models.length > 0) {
    const modelMatches = models.filter((token) => result.includes(token));
    if (modelMatches.length === models.length) score += 0.45;
    else if (modelMatches.length === 0) score -= 0.5;
  }

  return score;
}

function parsePriceText(value?: string) {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

export async function POST(request: Request) {
  try {
    const { db, user } = await actor(request);
    const body = await request.json();

    const title = String(body.title || "").trim();
    const category = String(body.category || "Other").trim();
    const productType = String(body.productType || "").trim();
    const brand = String(body.brand || "Unknown").trim();
    const condition = String(body.condition || "Used").trim();
    const specifications = String(body.specifications || "").trim();
    const sellerPrice = Number(body.sellerPrice || 0);
    const purchasePrice = Number(body.purchasePrice || 0);
    const ageProvided = body.monthsUsed !== null && body.monthsUsed !== undefined && body.monthsUsed !== "";
    const monthsUsed = Math.max(0, Number(ageProvided ? body.monthsUsed : 0));
    const disclosure = body.disclosure && typeof body.disclosure === "object" ? body.disclosure : null;
    const disclosureSummary = disclosure ? JSON.stringify(disclosure).slice(0, 2000) : "No seller disclosure provided.";

    if (!title && !productType) {
      return NextResponse.json(
        { error: "Add or AI-detect the exact product before checking its price." },
        { status: 400 }
      );
    }

    if (!sellerPrice || sellerPrice <= 0) {
      return NextResponse.json(
        { error: "Enter the seller asking price first." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const serpApiKey = process.env.SERPAPI_KEY;

    const identity = [brand !== "Unknown" ? brand : "", title, productType, specifications]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    let onlineSnippets: string[] = [];
    let onlinePrices: number[] = [];

    // Step 1: Optional live Google Shopping lookup via SerpApi if configured
    if (serpApiKey) {
      try {
        const query = `${identity} new price India`;
        const url = new URL("https://serpapi.com/search.json");
        url.searchParams.set("engine", "google_shopping");
        url.searchParams.set("q", query);
        url.searchParams.set("gl", "in");
        url.searchParams.set("hl", "en");
        url.searchParams.set("currency", "INR");
        url.searchParams.set("api_key", serpApiKey);

        const searchResponse = await fetch(url.toString(), { cache: "no-store" });
        const searchRaw = await searchResponse.json().catch(() => null);

        if (searchResponse.ok && searchRaw && !searchRaw.error) {
          const shoppingResults = (Array.isArray(searchRaw?.shopping_results)
            ? searchRaw.shopping_results
            : []) as ShoppingResult[];

          onlineSnippets = shoppingResults.slice(0, 6).map(
            (item) => `${item.source || "Online Store"}: "${item.title}" - ₹${item.extracted_price || item.price}`
          );
          onlinePrices = shoppingResults
            .filter((item) => matchScore(identity, item.title || "") >= 0.55)
            .map((item) => Number(item.extracted_price || parsePriceText(item.price)))
            .filter((price) => Number.isFinite(price) && price > 0);
        }
      } catch (err) {
        console.warn("SerpApi price lookup skipped/failed:", err);
      }
    }

    // The valuation itself is deterministic. External research can establish a
    // reference price, but it never supplies the depreciation, condition or
    // demand result. Without a current reference, an explicit seller reference
    // is labelled as such rather than represented as current market data.
    const referencePrice = onlinePrices.length ? median(onlinePrices) : purchasePrice > 0 ? purchasePrice : null;
    const referenceSource = onlinePrices.length ? "current_market" : purchasePrice > 0 ? "seller_reference" : undefined;
    const defects = Array.isArray((disclosure as { defects?: { key?: string; severity?: string }[] } | null)?.defects)
      ? (disclosure as { defects: { key?: string; severity?: string }[] }).defects
      : [];
    const observations = Array.isArray(body.visionObservations) ? body.visionObservations.filter((value: unknown): value is string => typeof value === "string").slice(0, 20) : [];
    const assessmentId = typeof body.assessmentId === "string" ? body.assessmentId : null;
    let authoritative = null as ReturnType<typeof deriveAuthoritativeCondition> | null;
    if (assessmentId) {
      const { data: record, error } = await db.from("vision_condition_assessments").select("id,seller_id,assessment,clarification_questions").eq("id", assessmentId).eq("seller_id", user.id).single();
      if (error || !record) throw new HttpError(403, "Vision assessment is not available for this seller.");
      authoritative = deriveAuthoritativeCondition({ id: record.id, sellerId: record.seller_id, assessment: record.assessment, questions: record.clarification_questions } as TrustedVisionAssessment, body.clarificationAnswers);
    }
    // Legacy listings retain the text-only path. New Phase 25 assessments are
    // read from server persistence; a browser assessment payload is ignored.
    const structuredFactors = authoritative ? authoritative.factors.map((factor) => ({ factor: factor.dimension as "cosmetic" | "structural" | "functional" | "technical" | "completeness", value: factor.factor, source: "vision+seller" as const, evidence: factor.evidence })) : [];
    const conditionEvidence = buildConditionFactors({ category, productType: productType || title, observations, knownIssueStatus: (disclosure as { knownIssueStatus?: string } | null)?.knownIssueStatus, defects });
    const conditionFactors = structuredFactors.length ? structuredFactors : conditionEvidence.factors;
    const hardDeductions = Array.isArray(body.hardDeductions)
      ? body.hardDeductions.filter((entry: unknown): entry is HardDeduction => Boolean(entry && typeof entry === "object" && typeof (entry as HardDeduction).id === "string" && typeof (entry as HardDeduction).amount === "number" && typeof (entry as HardDeduction).reason === "string"))
      : [];
    const valuation = calculateFairPrice({ referencePrice, category, productType: productType || title, ageMonths: ageProvided ? monthsUsed : null, conditionFactors, hardDeductions, demandMultiplier: 1, referenceSource });
    if (!valuation.available) {
      return NextResponse.json({ error: valuation.reason }, { status: 422 });
    }
    const deterministicFairMin = valuation.low;
    const deterministicFairMax = valuation.high;
    return NextResponse.json({ analysis: {
      referencePrice: valuation.referencePrice, marketLow: onlinePrices.length ? Math.min(...onlinePrices) : null, marketHigh: onlinePrices.length ? Math.max(...onlinePrices) : null,
      marketPriceFound: onlinePrices.length > 0, usedOnlineResearch: onlinePrices.length > 0,
      pricingMethod: `Universal Valuation Engine · ${valuation.policy.depreciationModel === "reducing_balance" ? "reducing-balance" : "linear residual-floor"} depreciation`,
      productMatched: title, matchQuality: onlinePrices.length ? "Matched current retail references" : "Seller-provided reference", fairMin: deterministicFairMin, fairMax: deterministicFairMax, sellerPrice: Math.round(sellerPrice),
      verdict: valuation.confidenceLabel === "Low" ? "Asking price compared with estimated range — low confidence" : calculateVerdict(sellerPrice, deterministicFairMin, deterministicFairMax, valuation.referencePrice, condition), confidence: valuation.confidence,
      valuationConfidence: valuation.confidenceLabel, valuationProfile: valuation.valuationProfile, profileReason: valuation.profileReason, policy: valuation.policy, basePrice: valuation.basePrice, residualFloor: valuation.residualFloor, conditionFactors: valuation.factors, unknownConditionDimensions: authoritative ? Object.entries(authoritative.assessment.conditionDimensions).filter(([, value]) => value.status === "unknown").map(([dimension]) => dimension) : conditionEvidence.unknownDimensions, conditionAdjustedValue: valuation.conditionAdjustedValue, ageKnown: valuation.ageKnown, ageFactor: Number((valuation.basePrice / valuation.referencePrice).toFixed(3)), conditionFactor: valuation.conditionMultiplier,
      hardDeductions: valuation.hardDeductionTotal, demandMultiplier: valuation.demandMultiplier, demandExplanation: valuation.demandExplanation,
      reason: `Reference ₹${valuation.referencePrice}; age-adjusted base ₹${valuation.basePrice}; condition factor ×${valuation.conditionMultiplier}; hard deductions -₹${valuation.hardDeductionTotal}; demand ×${valuation.demandMultiplier}. Recommended range ₹${deterministicFairMin}–₹${deterministicFairMax}.`,
      researchSummary: valuation.demandExplanation, sources: [], priceSamples: onlinePrices, purchasePrice: purchasePrice || null,
    } });

    // Step 2: Use Gemini AI to determine exact Current Indian Online New Retail Price & Fair Resale Range
    if (apiKey) {
      try {
        const prompt = `You are EcoMatch AI Price Intelligence Engine for the Indian circular resale marketplace.

Product Name / Title: "${title}"
Category: "${category}"
Product Type / Material: "${productType}"
Brand: "${brand}"
Condition: "${condition}"
Specifications: "${specifications || "Standard"}"
Seller Asking Resale Price: ₹${sellerPrice}
Seller Past Offline Purchase Price: ${purchasePrice > 0 ? `₹${purchasePrice}` : "Not specified"}
Months Used: ${monthsUsed}
Seller condition disclosure (first-party data): ${disclosureSummary}

${onlineSnippets.length > 0 ? `Current Live Online Shopping references:\n${onlineSnippets.join("\n")}\n` : ""}

CRITICAL PRICING RULES:
1. ALWAYS base the reference price on the CURRENT BRAND NEW ONLINE SELLING PRICE in India (e.g. on Amazon.in, Flipkart, Croma, Reliance Digital, Brand Store).
2. DO NOT use the seller's past offline purchase price or printed MRP as the market baseline if the product currently sells for less online (e.g. if an item has MRP ₹1,799 and seller bought it offline for ₹1,000, but online new price is ₹599-₹650, the current new reference price is ₹599-₹650).
3. Calculate fair secondary resale range (fairMin, fairMax) strictly by depreciating the CURRENT ONLINE NEW PRICE for ${monthsUsed} months of use and ${condition} condition.
3a. Account for seller-declared defects, severity, refurbishment and repair history. Do not claim a defect is visually verified and do not invent a reference market price.
4. Compare the seller asking price (₹${sellerPrice}) with the fair resale range and current new price to determine the verdict:
   - "Great Deal": significantly below fair value (attractive buy)
   - "Good Deal": below fair value
   - "Fair Price": within fair resale range
   - "Slightly Overpriced": above fair resale range
   - "Overpriced": far above fair resale range
   - "Overpriced Buy New Instead": asking price is close to or higher than buying brand new online!
5. Return ONLY valid JSON with no markdown formatting in this exact format:
{
  "referencePrice": 600,
  "marketLow": 550,
  "marketHigh": 650,
  "fairMin": 250,
  "fairMax": 350,
  "verdict": "Fair Price",
  "confidence": 92,
  "reason": "Current brand new online retail price in India (Amazon/Flipkart) is approx ₹600. Factoring ${monthsUsed} months of use in ${condition} condition, the fair circular resale value is ₹250 – ₹350. The seller's previous offline purchase price (₹${purchasePrice || "MRP"}) is discounted in favor of real online new market rates.",
  "sources": [
    {"title": "Amazon.in / Flipkart Online New Benchmark", "url": "https://www.amazon.in"}
  ]
}
`;

        const model = process.env.GEMINI_TRUST_MODEL || "gemini-3.5-flash-lite";
        if (!/^[a-zA-Z0-9.-]+$/.test(model)) throw new Error("Invalid trust model configuration");
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey!)}`,
          {
            method: "POST",
            signal: AbortSignal.timeout(8000),
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey!,
            },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 260,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (geminiResponse.ok) {
          const raw = await geminiResponse.json();
          const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
          const parsed = JSON.parse(clean);

          if (parsed && typeof parsed.referencePrice === "number" && typeof parsed.fairMin === "number") {
            const ageFactor = getAgeFactor(category, monthsUsed);
            const conditionFactor = getConditionFactor(condition);

            return NextResponse.json({
              analysis: {
                referencePrice: Math.round(parsed.referencePrice),
                marketLow: Math.round(parsed.marketLow || parsed.referencePrice * 0.9),
                marketHigh: Math.round(parsed.marketHigh || parsed.referencePrice * 1.1),
                marketPriceFound: true,
                usedOnlineResearch: true,
                pricingMethod: "Current Indian Online Retail Benchmark (Amazon/Flipkart) + AI Depreciation",
                productMatched: title,
                matchQuality: "High Confidence Online Benchmark",
                fairMin: Math.round(parsed.fairMin),
                fairMax: Math.round(parsed.fairMax),
                sellerPrice: Math.round(sellerPrice),
                verdict: parsed.verdict || calculateVerdict(sellerPrice, parsed.fairMin, parsed.fairMax, parsed.referencePrice, condition),
                confidence: Math.max(75, Math.min(98, Math.round(Number(parsed.confidence) || 90))),
                ageFactor: Number(ageFactor.toFixed(3)),
                conditionFactor,
                reason: parsed.reason,
                researchSummary: `Benchmarked against current Indian online new price of ₹${Math.round(parsed.referencePrice).toLocaleString("en-IN")}. Seller's past purchase price is not used.`,
                sources: Array.isArray(parsed.sources) ? parsed.sources : [],
                priceSamples: [Math.round(parsed.referencePrice)],
                purchasePrice: purchasePrice || null,
              },
            });
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini price intelligence error, falling back to math model:", geminiErr);
      }
    }

    // Step 3: Never invent a market reference from the seller's asking price.
    // A seller-provided purchase value is an explicit base, not a claimed current market price.
    if (!purchasePrice || purchasePrice <= 0) {
      return NextResponse.json({ analysis: { referencePrice: null, marketLow: null, marketHigh: null, marketPriceFound: false, usedOnlineResearch: false, pricingMethod: "Fair price unavailable — market reference could not be established", productMatched: title, matchQuality: "No trustworthy reference", fairMin: null, fairMax: null, sellerPrice: Math.round(sellerPrice), verdict: "Reference required", confidence: 0, ageFactor: null, conditionFactor: null, reason: "A market-based fair price needs a genuine reference price or source. Seller condition factors are recorded but no rupee estimate was fabricated.", researchSummary: "No market reference available.", sources: [], priceSamples: [], purchasePrice: null } });
    }
    const estimatedNew = purchasePrice;

    const ageFactor = getAgeFactor(category, monthsUsed);
    const conditionFactor = getConditionFactor(condition);
    const defectSeverities = Array.isArray((disclosure as { defects?: { severity?: string }[] } | null)?.defects) ? (disclosure as { defects: { severity?: string }[] }).defects.map((d) => d.severity) : [];
    const conditionAdjustment = defectSeverities.includes("critical") ? 0.45 : defectSeverities.includes("major") ? 0.62 : defectSeverities.includes("moderate") ? 0.78 : defectSeverities.includes("minor") ? 0.9 : 1;
    const repairAdjustment = (disclosure as { repaired?: string } | null)?.repaired === "yes" ? 0.92 : 1;

    let fairMid = estimatedNew * ageFactor * conditionFactor * conditionAdjustment * repairAdjustment;
    if (condition !== "New") {
      fairMid = Math.min(fairMid, estimatedNew * 0.82);
    }

    const fairMin = Math.max(1, Math.round(fairMid * 0.9));
    let fairMax = Math.max(fairMin, Math.round(fairMid * 1.1));
    if (condition !== "New") {
      fairMax = Math.min(fairMax, Math.round(estimatedNew * 0.85));
    }

    const verdict = calculateVerdict(
      sellerPrice,
      fairMin,
      fairMax,
      estimatedNew,
      condition
    );

    return NextResponse.json({
      analysis: {
        referencePrice: Math.round(estimatedNew),
        marketLow: Math.round(fairMin * 0.95),
        marketHigh: Math.round(fairMax * 1.05),
        marketPriceFound: false,
        usedOnlineResearch: false,
        pricingMethod: "EcoMatch condition-adjusted estimate from seller-provided base value (not a market reference)",
        productMatched: title,
        matchQuality: "Statistical",
        fairMin,
        fairMax,
        sellerPrice: Math.round(sellerPrice),
        verdict,
        confidence: 82,
        ageFactor: Number(ageFactor.toFixed(3)),
        conditionFactor,
        reason: `EcoMatch condition-adjusted estimate from the seller-provided base value of ₹${Math.round(estimatedNew).toLocaleString("en-IN")}, factored for ${monthsUsed} months use and ${condition} condition. This is not a current market reference.`,
        researchSummary: "No current market benchmark was established.",
        sources: [],
        priceSamples: [Math.round(estimatedNew)],
        purchasePrice: purchasePrice || null,
      },
    });
  } catch (error) {
    console.error("EcoMatch Price Intelligence error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Price intelligence failed.",
      },
      { status: 500 }
    );
  }
}
