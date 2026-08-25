export type ProductRiskInput = {
  askingPrice: number;
  referencePrice?: number | null;
  fairMin?: number | null;
  fairMax?: number | null;
  priceConfidence?: number | null;
  visionConfidence?: number | null;
  visibleIssues?: string[];
};

export function calculateProductRisk(input: ProductRiskInput) {
  let score = 0;
  const reasons: string[] = [];

  const asking = Number(input.askingPrice || 0);
  const reference = Number(input.referencePrice || 0);
  const fairMin = Number(input.fairMin || 0);
  const fairMax = Number(input.fairMax || 0);

  if (reference > 0 && asking > 0) {
    const ratio = asking / reference;
    if (ratio < 0.35) {
      score += 70;
      reasons.push(`Price is about ${Math.round((1 - ratio) * 100)}% below the current reference price.`);
    } else if (ratio < 0.5) {
      score += 45;
      reasons.push("Price is unusually low compared with the current reference price.");
    } else if (ratio > 1.6) {
      score += 40;
      reasons.push("Asking price is unusually high compared with the current reference price.");
    } else if (ratio > 1.3) {
      score += 22;
      reasons.push("Asking price is above the expected market range.");
    }
  }

  if (fairMin > 0 && asking < fairMin * 0.65) {
    score += 25;
    reasons.push("Seller price is far below EcoMatch AI's fair resale range.");
  }

  if (fairMax > 0 && asking > fairMax * 1.35) {
    score += 25;
    reasons.push("Seller price is far above EcoMatch AI's fair resale range.");
  }

  if ((input.visionConfidence ?? 100) < 55) {
    score += 18;
    reasons.push("AI product classification confidence is low.");
  }

  if ((input.priceConfidence ?? 100) < 45 && reference > 0) {
    score += 10;
    reasons.push("Online price matching confidence is low; manual review is recommended.");
  }

  if ((input.visibleIssues || []).length >= 4) {
    score += 8;
    reasons.push("Multiple visible condition issues were detected in the image.");
  }

  score = Math.min(100, score);

  const bucket = score >= 65 ? "likely_scam" : score >= 25 ? "review" : "normal";
  return { score, bucket, reasons: reasons.slice(0, 5) };
}
