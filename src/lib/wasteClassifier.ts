export type WasteClassification = {
  category: string;
  materialType: string;
  reuseRoute: string;
  confidence: number;
  reason: string;
};

const rules = [
  { category: "Mobile Phones", materialType: "Mobile phone / handheld device", words: ["iphone", "smartphone", "mobile", "android", "oneplus", "galaxy", "pixel", "redmi", "realme", "vivo", "oppo"], reuseRoute: "Test functionality, securely erase personal data, then resell, refurbish or route to authorised e-waste recovery." },
  { category: "Computers & Accessories", materialType: "Computer / accessory", words: ["laptop", "desktop", "computer", "monitor", "keyboard", "mouse", "gpu", "processor", "ram", "ssd", "printer"], reuseRoute: "Reuse or refurbish working equipment; securely erase storage devices before resale or recycling." },
  { category: "Electronics", materialType: "Consumer electronics", words: ["television", "tv", "camera", "speaker", "headphone", "earphone", "smartwatch", "console", "playstation", "xbox"], reuseRoute: "Prioritise resale or repair when functional; otherwise route to authorised e-waste recovery." },
  { category: "Home Appliances", materialType: "Home appliance", words: ["refrigerator", "fridge", "washing machine", "microwave", "air conditioner", "cooler", "fan", "mixer", "grinder", "geyser", "vacuum"], reuseRoute: "Inspect and refurbish before resale; route non-repairable electrical parts through authorised channels." },
  { category: "Furniture & Home", materialType: "Furniture / household item", words: ["sofa", "chair", "table", "bed", "mattress", "wardrobe", "cupboard", "desk", "furniture", "decor", "carpet"], reuseRoute: "Clean, repair and reuse locally to extend product life and avoid bulky waste." },
  { category: "Vehicles & Auto Parts", materialType: "Vehicle / auto part", words: ["bike", "motorcycle", "scooter", "car", "vehicle", "tyre", "tire", "alloy", "helmet", "spare part"], reuseRoute: "Verify ownership and condition before resale; reusable parts can be recovered before recycling." },
  { category: "Fashion & Accessories", materialType: "Fashion / wearable item", words: ["shirt", "tshirt", "jeans", "jacket", "shoe", "sneaker", "dress", "clothes", "clothing", "bag"], reuseRoute: "Clean and reuse, donate or resell wearable items before textile recycling." },
  { category: "Books & Education", materialType: "Book / educational item", words: ["book", "textbook", "novel", "notes", "study material", "stationery", "calculator"], reuseRoute: "Resell, donate or exchange educational products to extend their useful life." },
  { category: "Sports & Fitness", materialType: "Sports / fitness item", words: ["dumbbell", "treadmill", "cricket", "football", "badminton", "gym", "fitness", "sports"], reuseRoute: "Inspect for safe reuse and resell or donate functional equipment." },
  { category: "Toys & Kids", materialType: "Toy / kids product", words: ["toy", "lego", "stroller", "baby", "kids", "child", "game set"], reuseRoute: "Clean, safety-check and reuse or donate suitable products." },
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
      materialType: "Unclassified reusable product or material",
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
