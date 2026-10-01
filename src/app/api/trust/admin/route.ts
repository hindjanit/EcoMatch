import { actor, bodyJson, check, fail, rateLimit } from "@/lib/trust/server";
import { deliveryAction } from "@/lib/trust/delivery";
import { isShiprocketConfigured, getShiprocketBaseUrl } from "@/lib/shiprocket/client";
import { detectDisclosureMismatch } from "@/lib/condition-disclosure";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { db } = await actor(request, true);
    const results = await Promise.all([
      db
        .from("products")
        .select(
          "id,title,seller_id,status,safety_score,approval_method,auto_approved,manual_review_required,moderation_decision,moderation_risk_level,moderation_confidence,created_at,ai_visual_condition,ai_condition_confidence,ai_condition_reason,listing_ai_reviews(*),product_images(image_url,verification_status),product_condition_disclosures(*)"
        )
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("communication_risk_events")
        .select("*,calls(product_id,caller_id,receiver_id,started_at)")
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("deal_requests")
        .select(
          "id,deal_code,secure_state,secure_version,secure_demo,buyer_id,seller_id,created_at,product_id,agreed_price"
        )
        .eq("fulfilment_mode", "secure_delivery")
        .order("created_at", { ascending: false })
        .limit(100),
      db.from("call_recordings").select("*").order("created_at", { ascending: false }).limit(100),
      db.from("trust_audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      db
        .from("profiles")
        .select("id,full_name,verification_method,verification_status,identity_presence_status,verified_at,account_type,business_name,trade_name,gstin,business_verification_status,gst_verified_at,gst_verification_method")
        .order("verified_at", { ascending: false, nullsFirst: false })
        .limit(100),
      db
        .from("call_transcripts")
        .select("id,call_id,text,start_time,attribution_verified")
        .order("created_at", { ascending: false })
        .limit(500),
      db
        .from("deliveries")
        .select(
          "id,deal_id,provider,provider_booking_id,shiprocket_order_id,shiprocket_shipment_id,awb_code,courier_name,tracking_status,tracking_url,carrier_cost_paise,service_margin_paise,customer_delivery_paise,pickup,dropoff,last_tracking_sync_at,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    results.forEach((r) => check(r.error));

    return Response.json({
      listings: (results[0].data || []).map((listing) => {
        const disclosure = Array.isArray(listing.product_condition_disclosures) ? listing.product_condition_disclosures[0] : listing.product_condition_disclosures;
        return { ...listing, disclosure_mismatches: detectDisclosureMismatch(listing.ai_visual_condition, listing.ai_condition_reason, disclosure) };
      }),
      risks: results[1].data,
      deliveries: results[2].data,
      recordings: results[3].data,
      audit: results[4].data,
      identities: results[5].data,
      transcripts: results[6].data,
      shipments: results[7].data,
      logisticsConfig: {
        shiprocketConfigured: isShiprocketConfigured(),
        baseUrl: getShiprocketBaseUrl(),
        activeProvider: process.env.LOGISTICS_PROVIDER || "mock",
        demoMode: process.env.ECOMATCH_DEMO_MODE === "true",
      },
    });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    const { db, user, authDb } = await actor(request, true);
    await rateLimit(db, `admin:${user.id}`, 30);
    const b = await bodyJson(request);

    // Non-destructive Shiprocket connectivity test
    if (b.action === "test_shiprocket_connectivity") {
      const { checkShiprocketConnectivity } = await import("@/lib/shiprocket/client");
      const pickupPin = String(b.pickupPin || "110020");
      const deliveryPin = String(b.deliveryPin || "110001");
      const result = await checkShiprocketConnectivity(pickupPin, deliveryPin);
      return Response.json(result);
    }

    // Logistics action forwarding
    if (String(b.action || "").startsWith("admin_")) {
      const dealId = String(b.dealId || b.id || "");
      if (!dealId) throw new Error("dealId required for logistics admin action");
      return Response.json(
        await deliveryAction(db, dealId, user.id, true, {
          action: b.action,
          key: crypto.randomUUID(),
          version: Number(b.version ?? 0),
          ...b,
        })
      );
    }

    if (b.action === "attribute") {
      const { error } = await db.rpc("trust_attribute_call", {
        p_actor: user.id,
        p_event: String(b.id),
        p_attribution: b.attribution,
        p_reason: b.reason,
      });
      check(error);
      return Response.json({ ok: true });
    }

    if (["verify_business", "reject_business", "review_business"].includes(String(b.action))) {
      const { error } = await authDb.rpc("trust_admin_business_review", {
        p_user: String(b.id),
        p_action: String(b.action).replace("_business", ""),
        p_legal_name: typeof b.businessName === "string" ? b.businessName : null,
        p_trade_name: typeof b.tradeName === "string" ? b.tradeName : null,
      });
      check(error);
      return Response.json({ ok: true });
    }

    if (b.action === "review_communication") {
      const { error } = await db.rpc("trust_admin_review_communication_event", {
        p_actor: user.id,
        p_event: String(b.id),
        p_status: String(b.status),
        p_reason: String(b.reason || "Admin reviewed communication safety event."),
      });
      check(error);
      return Response.json({ ok: true });
    }

    if (b.action === "resolve_dispute") {
      const { error } = await db.rpc("trust_admin_resolve_dispute", {
        p_actor: user.id,
        p_dispute: String(b.id),
        p_resolution: String(b.resolution),
        p_reason: String(b.reason || ""),
      });
      check(error);
      return Response.json({ ok: true });
    }

    const { error } = await db.rpc("trust_admin_action", {
      p_actor: user.id,
      p_action: b.action,
      p_id: String(b.id),
      p_reason: b.reason,
    });
    check(error);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
