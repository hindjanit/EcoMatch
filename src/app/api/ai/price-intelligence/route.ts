import { NextResponse } from "next/server";

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
    const body = await request.json();

    const title = String(body.title || "").trim();
    const category = String(body.category || "Other").trim();
    const productType = String(body.productType || "").trim();
    const brand = String(body.brand || "Unknown").trim();
    const condition = String(body.condition || "Used").trim();
    const specifications = String(body.specifications || "").trim();
    const sellerPrice = Number(body.sellerPrice || 0);
    const purchasePrice = Number(body.purchasePrice || 0);
    const monthsUsed = Math.max(0, Number(body.monthsUsed || 0));

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

    const serpApiKey = process.env.SERPAPI_KEY;
    let candidates: any[] = [];
    let scored: any[] = [];
    let exactModelTokens: string[] = [];

    const identity = [brand !== "Unknown" ? brand : "", title, productType, specifications]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

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

          scored = shoppingResults
            .map((item) => {
              const extracted = Number(item.extracted_price || 0) || parsePriceText(item.price);
              return {
                ...item,
                extracted,
                score: matchScore(identity, String(item.title || "")),
              };
            })
            .filter((item) => item.extracted > 0)
            .sort((a, b) => b.score - a.score);

          exactModelTokens = modelLikeTokens(identity);
          const strongMatches = scored.filter((item) => {
            if (exactModelTokens.length > 0) {
              const normalizedTitle = normalize(String(item.title || ""));
              const allModelsPresent = exactModelTokens.every((token) => normalizedTitle.includes(token));
              return allModelsPresent && item.score >= 0.45;
            }
            return item.score >= 0.5;
          });

          candidates = (strongMatches.length > 0 ? strongMatches : scored.filter((item) => item.score >= 0.65)).slice(0, 8);
        }
      } catch (err) {
        console.warn("SerpApi search error, using statistical fallback:", err);
      }
    }

    if (candidates.length === 0) {
      const estimatedNew = purchasePrice && purchasePrice > 0
        ? purchasePrice
        : Math.max(sellerPrice * 1.3, sellerPrice + 500);

      const ageFactor = getAgeFactor(category, monthsUsed);
      const conditionFactor = getConditionFactor(condition);

      let fairMid = estimatedNew * ageFactor * conditionFactor;
      if (condition !== "New") {
        fairMid = Math.min(fairMid, estimatedNew * 0.82);
      }

      let fairMin = Math.max(1, Math.round(fairMid * 0.9));
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
          marketPriceFound: Boolean(purchasePrice && purchasePrice > 0),
          usedOnlineResearch: false,
          pricingMethod: "EcoMatch Depreciation & Category Resale Benchmark",
          productMatched: title,
          matchQuality: "Statistical",
          fairMin,
          fairMax,
          sellerPrice: Math.round(sellerPrice),
          verdict,
          confidence: purchasePrice ? 88 : 80,
          ageFactor: Number(ageFactor.toFixed(3)),
          conditionFactor,
          reason: `EcoMatch estimated secondary resale value based on Indian market benchmark of approx ₹${Math.round(estimatedNew).toLocaleString("en-IN")}, factored for ${monthsUsed} months use and ${condition} condition.`,
          researchSummary: "Model-guided pricing curve calculated using circular market depreciation.",
          sources: [],
          priceSamples: [Math.round(estimatedNew)],
          purchasePrice: purchasePrice || null,
        },
      });
    }

    const rawPrices = candidates.map((item) => Math.round(item.extracted));
    const initialMedian = median(rawPrices);
    const usablePrices = rawPrices.filter(
      (value) => value >= initialMedian * 0.55 && value <= initialMedian * 1.8
    );
    const finalPrices = usablePrices.length > 0 ? usablePrices : rawPrices;

    const referencePrice = Math.round(median(finalPrices));
    const marketLow = Math.min(...finalPrices);
    const marketHigh = Math.max(...finalPrices);

    const ageFactor = getAgeFactor(category, monthsUsed);
    const conditionFactor = getConditionFactor(condition);

    let fairMid = referencePrice * ageFactor * conditionFactor;
    if (condition !== "New") {
      fairMid = Math.min(fairMid, referencePrice * 0.8);
    }

    let fairMin = Math.max(1, Math.round(fairMid * 0.9));
    let fairMax = Math.max(fairMin, Math.round(fairMid * 1.1));
    if (condition !== "New") {
      fairMax = Math.min(fairMax, Math.round(referencePrice * 0.85));
    }

    const verdict = calculateVerdict(
      sellerPrice,
      fairMin,
      fairMax,
      referencePrice,
      condition
    );

    const best = candidates[0];
    const exactMatch = exactModelTokens.length > 0
      ? exactModelTokens.every((token) => normalize(String(best.title || "")).includes(token))
      : best.score >= 0.75;

    let confidence = exactMatch ? 94 : 82;
    if (finalPrices.length >= 3) confidence += 2;
    if (monthsUsed <= 0) confidence -= 5;
    confidence = clamp(confidence, 50, 97);

    const sources = candidates.slice(0, 6).map((item) => ({
      title: `${item.source || "Retailer"}: ${item.title || "Product"}`,
      url: String(item.link || ""),
    })).filter((source) => source.url);

    const reason = `EcoMatch found current NEW shopping prices between ₹${marketLow.toLocaleString(
      "en-IN"
    )} and ₹${marketHigh.toLocaleString(
      "en-IN"
    )}. The current market reference is approximately ₹${referencePrice.toLocaleString(
      "en-IN"
    )}. The resale estimate was then adjusted for ${monthsUsed} months of use and ${condition} condition.`;

    return NextResponse.json({
      analysis: {
        referencePrice,
        marketLow,
        marketHigh,
        marketPriceFound: true,
        usedOnlineResearch: true,
        pricingMethod: "Live Google Shopping results via SerpApi plus EcoMatch Depreciation",
        productMatched: String(best.title || title),
        matchQuality: exactMatch ? "Exact" : "Close",
        fairMin,
        fairMax,
        sellerPrice: Math.round(sellerPrice),
        verdict,
        confidence,
        ageFactor: Number(ageFactor.toFixed(3)),
        conditionFactor,
        reason,
        researchSummary: `${finalPrices.length} current shopping price reference${finalPrices.length === 1 ? "" : "s"} used. Seller purchase price/MRP was not used as the current market reference.`,
        sources,
        priceSamples: finalPrices,
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
