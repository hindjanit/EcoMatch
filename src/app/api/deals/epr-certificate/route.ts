import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

// Emission factors based on CPCB / IPCC LCA circular recovery data (kg CO2e saved per kg recycled)
const MATERIAL_SAVINGS_MAP: Record<
  string,
  { co2PerKg: number; waterLitersPerKg: number; eprCategory: string }
> = {
  Plastics: { co2PerKg: 1.85, waterLitersPerKg: 28, eprCategory: "Category I & II: Rigid & Flexible Plastic" },
  Metals: { co2PerKg: 4.2, waterLitersPerKg: 45, eprCategory: "Non-Ferrous & Ferrous Circular Metallics" },
  "E-Waste": { co2PerKg: 3.6, waterLitersPerKg: 62, eprCategory: "Schedule I: E-Waste Management Rules 2022" },
  Paper: { co2PerKg: 0.95, waterLitersPerKg: 30, eprCategory: "Cellulose & Pulp Circular Fiber" },
  Textiles: { co2PerKg: 2.1, waterLitersPerKg: 85, eprCategory: "Post-Industrial Synthetic & Cotton Fiber" },
  Glass: { co2PerKg: 0.45, waterLitersPerKg: 12, eprCategory: "Inert Cullet Glass Recovery" },
  Rubber: { co2PerKg: 1.6, waterLitersPerKg: 20, eprCategory: "Crumb Rubber & Elastomer Reclaim" },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      dealId,
      productId,
      buyerId,
      sellerId,
      buyerName = "Authorized Buyer",
      sellerName = "Authorized Seller",
      category = "Plastics",
      materialTitle = "Recycled Material Lot",
      quantityKg = 1000,
    } = body;

    const safeQty = Math.max(1, Number(quantityKg) || 1000);
    const benchmark = MATERIAL_SAVINGS_MAP[category] || MATERIAL_SAVINGS_MAP["Plastics"];

    const carbonSavedKg = Number((safeQty * benchmark.co2PerKg).toFixed(1));
    const waterSavedLiters = Number((safeQty * benchmark.waterLitersPerKg).toFixed(0));
    const wasteDivertedKg = safeQty;

    const certificateNo = `EPR-${category.slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const hashPayload = `${certificateNo}|${dealId}|${safeQty}|${carbonSavedKg}|${sellerId}|${buyerId}|${Date.now()}`;
    const verificationHash = crypto.createHash("sha256").update(hashPayload).digest("hex");

    const certificate = {
      certificate_no: certificateNo,
      deal_id: dealId,
      product_id: productId,
      buyer_id: buyerId,
      seller_id: sellerId,
      buyer_name: buyerName,
      seller_name: sellerName,
      material_title: materialTitle,
      material_category: category,
      quantity_kg: safeQty,
      carbon_saved_kg: carbonSavedKg,
      waste_diverted_kg: wasteDivertedKg,
      water_saved_liters: waterSavedLiters,
      epr_category: benchmark.eprCategory,
      compliance_standard: "Plastic/E-Waste Management Rules & CPCB Circular Mandate",
      verification_hash: verificationHash,
      issued_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      certificate,
    });
  } catch (err: any) {
    console.error("EPR Certificate generation error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
