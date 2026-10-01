import crypto from "crypto";
import { bodyJson, fail, HttpError, actor, rateLimit } from "@/lib/trust/server";

export const runtime = "nodejs";

// Indicative circularity-impact factors (kg CO2e / litres water saved per kg recovered).
// These are presentation estimates, not statutory EPR credits.
const MATERIAL_SAVINGS_MAP: Record<
  string,
  { co2PerKg: number; waterLitersPerKg: number; eprCategory: string }
> = {
  Plastics: { co2PerKg: 1.85, waterLitersPerKg: 28, eprCategory: "Plastic circular recovery" },
  Metals: { co2PerKg: 4.2, waterLitersPerKg: 45, eprCategory: "Metal circular recovery" },
  "E-Waste": { co2PerKg: 3.6, waterLitersPerKg: 62, eprCategory: "Electronic material recovery" },
  Paper: { co2PerKg: 0.95, waterLitersPerKg: 30, eprCategory: "Paper/fibre circular recovery" },
  Textiles: { co2PerKg: 2.1, waterLitersPerKg: 85, eprCategory: "Textile circular recovery" },
  Glass: { co2PerKg: 0.45, waterLitersPerKg: 12, eprCategory: "Glass circular recovery" },
  Rubber: { co2PerKg: 1.6, waterLitersPerKg: 20, eprCategory: "Rubber circular recovery" },
  Other: { co2PerKg: 0.5, waterLitersPerKg: 10, eprCategory: "General circular material recovery" },
};

function weightFromListing(product: Record<string, unknown>) {
  const confirmed = Number(product.seller_confirmed_weight_kg);
  if (Number.isFinite(confirmed) && confirmed > 0) return confirmed;

  const estimated = Number(product.ai_estimated_weight_kg);
  if (Number.isFinite(estimated) && estimated > 0) return estimated;

  const quantity = Number(product.quantity);
  const unit = String(product.quantity_unit || "").toLowerCase().trim();
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const factors: Record<string, number> = {
    kg: 1,
    kilogram: 1,
    kilograms: 1,
    g: 0.001,
    gram: 0.001,
    grams: 0.001,
    tonne: 1000,
    tonnes: 1000,
    ton: 1000,
    tons: 1000,
    mt: 1000,
  };
  const factor = factors[unit];
  return factor ? quantity * factor : null;
}

function materialBenchmark(category: string, material: string) {
  const combined = `${category} ${material}`.toLowerCase();
  if (/plastic|polymer|pet|hdpe|ldpe|pvc/.test(combined)) return MATERIAL_SAVINGS_MAP.Plastics;
  if (/metal|steel|iron|aluminium|aluminum|copper|brass/.test(combined)) return MATERIAL_SAVINGS_MAP.Metals;
  if (/e[- ]?waste|electronic|electrical/.test(combined)) return MATERIAL_SAVINGS_MAP["E-Waste"];
  if (/paper|cardboard|pulp/.test(combined)) return MATERIAL_SAVINGS_MAP.Paper;
  if (/textile|fabric|cotton|polyester/.test(combined)) return MATERIAL_SAVINGS_MAP.Textiles;
  if (/glass/.test(combined)) return MATERIAL_SAVINGS_MAP.Glass;
  if (/rubber|tyre|tire/.test(combined)) return MATERIAL_SAVINGS_MAP.Rubber;
  return MATERIAL_SAVINGS_MAP.Other;
}

export async function POST(request: Request) {
  try {
    const { db, user, profile } = await actor(request);
    await rateLimit(db, `epr-certificate:${user.id}`, 10);
    const body = await bodyJson(request, 2048);
    const dealId = String(body.dealId || "").trim();
    if (!dealId) throw new HttpError(400, "Deal ID is required");

    const { data: deal, error: dealError } = await db
      .from("deal_requests")
      .select("id,product_id,buyer_id,seller_id,status,completed_at")
      .eq("id", dealId)
      .maybeSingle();
    if (dealError) throw new Error(dealError.message);
    if (!deal) throw new HttpError(404, "Deal not found");
    if (profile.role !== "admin" && deal.buyer_id !== user.id && deal.seller_id !== user.id) {
      throw new HttpError(403, "This certificate is only available to deal participants");
    }
    if (deal.status !== "completed" || !deal.completed_at) {
      throw new HttpError(409, "The exchange must be completed before a certificate can be generated");
    }

    const [productResult, profilesResult, ownershipResult] = await Promise.all([
      db
        .from("products")
        .select("id,title,category,material,quantity,quantity_unit,ai_estimated_weight_kg,seller_confirmed_weight_kg")
        .eq("id", deal.product_id)
        .maybeSingle(),
      db.from("profiles").select("id,full_name").in("id", [deal.buyer_id, deal.seller_id]),
      db.from("ownership_events").select("id,event_hash").eq("deal_id", deal.id).maybeSingle(),
    ]);
    if (productResult.error) throw new Error(productResult.error.message);
    if (profilesResult.error) throw new Error(profilesResult.error.message);
    if (ownershipResult.error) throw new Error(ownershipResult.error.message);
    if (!productResult.data) throw new HttpError(409, "Product record is unavailable");
    if (!ownershipResult.data) throw new HttpError(409, "Verified ownership transfer record is missing");

    const product = productResult.data as Record<string, unknown>;
    const quantityKg = weightFromListing(product);
    if (!quantityKg || !Number.isFinite(quantityKg) || quantityKg <= 0) {
      throw new HttpError(409, "Confirm the product weight before generating the circularity certificate");
    }

    const profiles = (profilesResult.data || []) as { id: string; full_name: string | null }[];
    const buyerName = profiles.find((p) => p.id === deal.buyer_id)?.full_name || "Buyer";
    const sellerName = profiles.find((p) => p.id === deal.seller_id)?.full_name || "Seller";
    const category = String(product.category || "Other");
    const material = String(product.material || "");
    const benchmark = materialBenchmark(category, material);
    const safeQty = Number(quantityKg.toFixed(3));
    const carbonSavedKg = Number((safeQty * benchmark.co2PerKg).toFixed(1));
    const waterSavedLiters = Number((safeQty * benchmark.waterLitersPerKg).toFixed(0));
    // Derive a stable certificate identity from the immutable completed deal.
    // Re-opening the certificate must not manufacture a different certificate.
    const issuedAt = new Date(deal.completed_at).toISOString();
    const certificateNo = `ECO-${category.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "MAT"}-${deal.id.replace(/-/g, "").slice(0, 12).toUpperCase()}`;
    const hashPayload = [certificateNo, deal.id, deal.product_id, safeQty, carbonSavedKg, deal.seller_id, deal.buyer_id, ownershipResult.data.event_hash, issuedAt].join("|");
    const verificationHash = crypto.createHash("sha256").update(hashPayload).digest("hex");

    return Response.json({
      success: true,
      certificate: {
        certificate_no: certificateNo,
        deal_id: deal.id,
        product_id: deal.product_id,
        buyer_id: deal.buyer_id,
        seller_id: deal.seller_id,
        buyer_name: buyerName,
        seller_name: sellerName,
        material_title: String(product.title || "Circular Material Lot"),
        material_category: category,
        quantity_kg: safeQty,
        carbon_saved_kg: carbonSavedKg,
        waste_diverted_kg: safeQty,
        water_saved_liters: waterSavedLiters,
        epr_category: benchmark.eprCategory,
        compliance_standard: "EcoMatch circularity impact estimate — not a statutory CPCB/EPR credit certificate",
        verification_hash: verificationHash,
        ownership_event_hash: ownershipResult.data.event_hash,
        issued_at: issuedAt,
      },
    });
  } catch (error) {
    return fail(error);
  }
}
