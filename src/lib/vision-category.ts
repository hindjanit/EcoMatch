export const VISION_CATEGORIES = ["Mobile Phones", "Metals", "Plastic", "Wood", "Industrial Goods", "Electrical Materials", "Machinery & Equipment", "Construction Materials", "Packaging Materials", "Other"] as const;
export type VisionCategory = (typeof VISION_CATEGORIES)[number];
export type CategoryValidation = { category: VisionCategory; categoryConfidence: number; categoryNeedsReview: boolean; overridden: boolean };

const text = (...parts: unknown[]) => parts.filter((part) => typeof part === "string").join(" ").toLowerCase();
const has = (value: string, pattern: RegExp) => pattern.test(value);

export function validateCategory(input: { productType?: string; material?: string; aiCategory?: string; observations?: string[] | string }): CategoryValidation {
  const evidence = text(input.productType, input.material, Array.isArray(input.observations) ? input.observations.join(" ") : input.observations);
  let category: VisionCategory = "Other";
  if (has(evidence, /\b(cardboard|carton|packaging|packing|corrugated|box)\b/)) category = "Packaging Materials";
  else if (has(evidence, /\b(bricks?|tiles?|cement|concrete|paver|plaster|construction)\b/)) category = "Construction Materials";
  else if (has(evidence, /\b(motor|pump|generator|compressor|industrial machine|machinery|lathe)\b/)) category = "Machinery & Equipment";
  else if (has(evidence, /\b(copper\s+(electrical\s+)?wire|electrical cable|power cable|switch|socket|circuit breaker|conduit|electrical component)\b/)) category = "Electrical Materials";
  // Give phones their dedicated marketplace category before considering their
  // visible casing material. Require a specific phone signal; generic terms
  // such as "device" or "metal" are never enough.
  else if (has(evidence, /\b(smartphone|mobile phone|cell(?:ular)? phone|iphone|android phone)\b/)) category = "Mobile Phones";
  else if (has(evidence, /\b(tablet|laptop|computer|monitor|television|tv set|camera|headphones?|earphones?|charger|battery|pcb|motherboard)\b/)) category = "Electrical Materials";
  else if (has(evidence, /\b(plastic|hdpe|pet\b|pvc|polypropylene|polyethylene)\b/)) category = "Plastic";
  else if (has(evidence, /\b(wood|wooden|timber|plywood|bamboo)\b/)) category = "Wood";
  else if (has(evidence, /\b(stainless steel|steel|aluminium|aluminum|metal|iron|brass|copper|water bottle|bottle)\b/)) category = "Metals";
  else if (has(evidence, /\b(tool|fixture|industrial|commercial equipment|surplus)\b/)) category = "Industrial Goods";
  const aiCategory = VISION_CATEGORIES.includes(input.aiCategory as VisionCategory) ? input.aiCategory as VisionCategory : "Other";
  const confident = category !== "Other";
  return { category, categoryConfidence: confident ? (aiCategory === category ? 94 : 88) : 0, categoryNeedsReview: !confident, overridden: aiCategory !== category };
}
