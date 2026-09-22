import { NextResponse } from "next/server";

export const runtime = "nodejs";

export type RFQItem = {
  id: string;
  buyer_id: string;
  buyer_name?: string;
  material_type: string;
  target_quantity: number;
  quantity_unit: string;
  target_price_per_unit?: number;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "IMMEDIATE";
  location_city: string;
  location_state: string;
  cluster_radius_km: number;
  description?: string;
  status: "OPEN" | "IN_NEGOTIATION" | "FULFILLED" | "CLOSED";
  created_at: string;
};

// Seed sample RFQs for immediate demonstration of hyperlocal scrap requisition
const SAMPLE_RFQS: RFQItem[] = [
  {
    id: "rfq-demo-1",
    buyer_id: "buyer-delhi-recycler",
    buyer_name: "Apex Polymer Reclaimers",
    material_type: "HDPE Drum Flakes (Washed & Dried)",
    target_quantity: 15,
    quantity_unit: "MT",
    target_price_per_unit: 48,
    urgency: "IMMEDIATE",
    location_city: "Okhla Industrial Area, New Delhi",
    location_state: "Delhi",
    cluster_radius_km: 75,
    description: "Urgent monthly requirement for clean, unprinted blue HDPE blow-mould drum flakes. Moisture < 1%. Immediate ex-factory payment via escrow.",
    status: "OPEN",
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "rfq-demo-2",
    buyer_id: "buyer-kanpur-metal",
    buyer_name: "Ganga Alloys & Casting",
    material_type: "Copper Wire Scrap (Millberry 99.9%)",
    target_quantity: 5,
    quantity_unit: "MT",
    target_price_per_unit: 720,
    urgency: "HIGH",
    location_city: "Kanpur",
    location_state: "Uttar Pradesh",
    cluster_radius_km: 150,
    description: "Looking for bright bare copper scrap wire, minimum 99% purity. Seller must provide weighbridge slip.",
    status: "OPEN",
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    id: "rfq-demo-3",
    buyer_id: "buyer-bhiwandi-corrugated",
    buyer_name: "EcoKraft Packaging Ltd",
    material_type: "Baled OCC Corrugated Cardboard (Grade 11)",
    target_quantity: 40,
    quantity_unit: "MT",
    target_price_per_unit: 14.5,
    urgency: "MEDIUM",
    location_city: "Bhiwandi / Mumbai Cluster",
    location_state: "Maharashtra",
    cluster_radius_km: 60,
    description: "Baled clean carton boxes, sorted without wax coating. Require 2 truckloads delivered to plant.",
    status: "OPEN",
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.toLowerCase();
  const material = searchParams.get("material")?.toLowerCase();

  let filtered = [...SAMPLE_RFQS];

  if (city) {
    filtered = filtered.filter(
      (r) =>
        r.location_city.toLowerCase().includes(city) ||
        r.location_state.toLowerCase().includes(city)
    );
  }

  if (material) {
    filtered = filtered.filter((r) =>
      r.material_type.toLowerCase().includes(material)
    );
  }

  return NextResponse.json({ success: true, rfqs: filtered });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newRfq: RFQItem = {
      id: `rfq-${Date.now()}`,
      buyer_id: body.buyer_id || "anonymous-buyer",
      buyer_name: body.buyer_name || "Verified Bulk Buyer",
      material_type: body.material_type,
      target_quantity: Number(body.target_quantity) || 1,
      quantity_unit: body.quantity_unit || "MT",
      target_price_per_unit: body.target_price_per_unit ? Number(body.target_price_per_unit) : undefined,
      urgency: body.urgency || "MEDIUM",
      location_city: body.location_city || "Delhi NCR",
      location_state: body.location_state || "Delhi",
      cluster_radius_km: Number(body.cluster_radius_km) || 50,
      description: body.description || "",
      status: "OPEN",
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, rfq: newRfq });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
