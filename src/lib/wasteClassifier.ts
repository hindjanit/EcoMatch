export type WasteClassification = {
  category: string;
  materialType: string;
  reuseRoute: string;
  confidence: number;
  reason: string;
};

const rules = [
  { category: "Metals", materialType: "Metal waste", words: ["aluminium", "aluminum", "steel", "iron", "copper", "brass", "metal", "sheet", "rod", "scrap"], reuseRoute: "Reuse as fabrication stock or send to a verified metal recycler." },
  { category: "Plastic", materialType: "Plastic waste", words: ["plastic", "pet", "hdpe", "ldpe", "pvc", "polymer", "bottle", "container"], reuseRoute: "Sort by polymer type, reuse where possible, or route to plastic recycling." },
  { category: "Wood", materialType: "Wood waste", words: ["wood", "timber", "plywood", "pallet", "board", "mDF", "sawdust"], reuseRoute: "Reuse for pallets, furniture, boards or secondary wood products." },
  { category: "Electrical Materials", materialType: "Electrical / e-waste", words: ["wire", "cable", "circuit", "electrical", "electronic", "motor", "battery", "pcb", "transformer"], reuseRoute: "Test for reuse first; otherwise route through an authorised e-waste channel." },
  { category: "Construction Materials", materialType: "Construction waste", words: ["brick", "cement", "concrete", "tile", "glass", "sand", "construction", "pipe"], reuseRoute: "Reuse in construction or segregate for construction-and-demolition recovery." },
  { category: "Packaging Materials", materialType: "Packaging waste", words: ["carton", "cardboard", "box", "packaging", "crate", "wrap", "paper"], reuseRoute: "Reuse for secondary packaging or send clean material to recycling." },
  { category: "Machinery & Equipment", materialType: "Industrial equipment", words: ["machine", "machinery", "equipment", "pump", "compressor", "gear", "tool"], reuseRoute: "Inspect, refurbish and resell usable equipment before material recovery." },
];

export function classifyWaste(input: string): WasteClassification {
  const text = input.toLowerCase();
  let best = rules[0];
  let bestScore = 0;

  for (const rule of rules) {
    const score = rule.words.reduce((sum, word) => sum + (text.includes(word.toLowerCase()) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }

  if (bestScore === 0) {
    return {
      category: "Other",
      materialType: "Unclassified reusable material",
      reuseRoute: "Send for manual verification so the material can be placed in the safest reuse or recycling stream.",
      confidence: 58,
      reason: "No strong material keyword was detected, so EcoMatch recommends manual verification.",
    };
  }

  return {
    category: best.category,
    materialType: best.materialType,
    reuseRoute: best.reuseRoute,
    confidence: Math.min(96, 68 + bestScore * 8),
    reason: `Detected ${bestScore} material indicator${bestScore === 1 ? "" : "s"} that match the ${best.category} category.`,
  };
}
