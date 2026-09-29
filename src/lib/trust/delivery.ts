import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { priceQuote, securityDeposit } from "./domain";
import { compareEvidence, sha256 } from "./ai";
import {
  deliveryConfig,
  logisticsProvider,
  paymentProvider,
  type Location,
  type Quote,
} from "./providers";
import { check, HttpError, serviceDb } from "./server";

export async function deliveryRecord(
  db: ReturnType<typeof serviceDb>,
  id: string,
  userId: string,
  admin = false
) {
  const { data: deal, error } = await db.from("deal_requests").select("*").eq("id", id).single();
  check(error);
  if (!deal || (![deal.buyer_id, deal.seller_id].includes(userId) && !admin))
    throw new HttpError(403, "Deal access denied");

  const queries = await Promise.all([
    db.from("deliveries").select("*").eq("deal_id", id).maybeSingle(),
    db.from("payments").select("*").eq("deal_id", id),
    db.from("seller_security_deposits").select("*").eq("deal_id", id).maybeSingle(),
    db.from("exchange_evidence").select("*").eq("deal_id", id).order("created_at"),
    db.from("deal_audit_logs").select("*").eq("deal_id", id).order("created_at"),
    db.from("deal_disputes").select("*").eq("deal_id", id).order("created_at"),
    db.from("delivery_returns").select("*").eq("deal_id", id).maybeSingle(),
    db.from("products").select("title, category, specifications").eq("id", deal.product_id).maybeSingle(),
  ]);
  queries.forEach((q) => check(q.error));
  const [delivery, payments, deposit, evidence, timeline, disputes, returns, product] = queries.map(
    (q) => q.data
  );
  const quoteId = delivery && !Array.isArray(delivery) ? delivery.quote_id : null;
  const { data: quote, error: qe } = quoteId
    ? await db.from("delivery_quotes").select("*").eq("id", quoteId).single()
    : { data: null, error: null };
  check(qe);

  return { deal, delivery, payments, deposit, evidence, timeline, disputes, returns, quote, product };
}

export function parseLocation(input: unknown): Location {
  if (!input || typeof input !== "object") throw new HttpError(400, "Location required");
  const l = input as Record<string, unknown>,
    latitude = Number(l.latitude),
    longitude = Number(l.longitude),
    address = String(l.address || "").trim(),
    pincode = l.pincode ? String(l.pincode).trim() : undefined;
  if (
    l.latitude === null ||
    l.latitude === "" ||
    l.longitude === null ||
    l.longitude === "" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    address.length < 5 ||
    address.length > 500
  )
    throw new HttpError(400, "Enter a complete address and valid coordinates");
  return { latitude, longitude, address, pincode };
}

export async function deliveryAction(
  db: ReturnType<typeof serviceDb>,
  id: string,
  userId: string,
  isAdmin: boolean,
  b: Record<string, unknown>
) {
  const { data: deal, error } = await db.from("deal_requests").select("*").eq("id", id).single();
  check(error);
  if (!deal || (![deal.buyer_id, deal.seller_id].includes(userId) && !isAdmin))
    throw new HttpError(403, "Deal access denied");

  const action = String(b.action || ""),
    key = String(b.key || ""),
    version = Number(b.version);
  if (!Number.isSafeInteger(version) || key.length < 8 || key.length > 120)
    throw new HttpError(400, "Version and idempotency key required");

  const rpc = async (command: string, payload: Record<string, unknown> = {}) => {
    const { data, error: e } = await db.rpc("trust_delivery_action", {
      p_deal: id,
      p_actor: userId,
      p_action: command,
      p_expected: version,
      p_key: key,
      p_data: payload,
    });
    check(e);
    return data;
  };

  const adminActions = [
    "review_evidence",
    "resolve_dispute",
    "return_progress",
    "return_settle",
    "admin_retry_booking",
    "admin_refresh_tracking",
    "admin_cancel_shipment",
  ];
  if (adminActions.includes(action) && !isAdmin) throw new HttpError(403, "Admin access required");

  if (action === "select_delivery") {
    logisticsProvider();
    paymentProvider();
    return rpc(action, { isDemo: deliveryConfig().demo });
  }

  if (action === "address") return rpc(action, { location: parseLocation(b.location) });
  if (action === "cancel" || action === "expire") return rpc(action);

  const { data: v, error: ve } = await db.from("deliveries").select("*").eq("deal_id", id).single();
  check(ve);
  const { data: q, error: qe } = v?.quote_id
    ? await db.from("delivery_quotes").select("*").eq("id", v.quote_id).single()
    : { data: null, error: null };
  check(qe);

  if (action === "quote") {
    if (userId !== deal.buyer_id) throw new HttpError(403, "Buyer creates the quote");
    const config = deliveryConfig();
    const providerInstance = logisticsProvider();
    const quote = await providerInstance.getQuote(parseLocation(v.pickup), parseLocation(v.dropoff));
    const pricing = priceQuote(Math.round(Number(deal.agreed_price) * 100), quote.basePaise, config.markup);

    return rpc(action, {
      ...quote,
      ...pricing,
      depositPaise: securityDeposit(quote.basePaise, config.minimum, config.buffer),
      provider: quote.isDemo ? "mock" : "shiprocket",
      carrierCostPaise: quote.basePaise,
      serviceMarginPaise: pricing.servicePaise,
      customerDeliveryPaise: pricing.deliveryPaise + pricing.servicePaise,
      courierName: quote.courierName,
      courierCompanyId: quote.courierCompanyId,
    });
  }

  if (action === "buyer_order" || action === "deposit_order") {
    if (userId !== (action === "buyer_order" ? deal.buyer_id : deal.seller_id))
      throw new HttpError(403, "Only the payer can create this order");
    if (!q) throw new HttpError(409, "Create a quote first");
    const order = await paymentProvider().createOrder(
      action === "buyer_order" ? q.total_paise : q.deposit_paise,
      `${id}-${action}`
    );
    if (order.isDemo !== deal.secure_demo) throw new HttpError(409, "Payment mode mismatch");
    return rpc(action, { orderId: order.id, provider: order.isDemo ? "mock" : process.env.PAYMENT_PROVIDER });
  }

  if (action === "demo_pay") {
    if (!deliveryConfig().demo || !deal.secure_demo)
      throw new HttpError(403, "Demo actions are disabled for this transaction");
    const { data: pay, error: pe } = await db
      .from("payments")
      .select("*")
      .eq("deal_id", id)
      .eq("payer_id", userId)
      .eq("status", "PENDING")
      .single();
    check(pe);
    if (!pay?.is_demo || pay.provider !== "mock")
      throw new HttpError(403, "Only your pending simulated payment can be confirmed");
    return rpc("payment_verified", {
      orderId: pay.provider_order_id,
      amountPaise: pay.amount_paise,
      currency: "INR",
      isDemo: true,
    });
  }

  if (action === "evidence") {
    const stage = String(b.stage || "");
    if (!["pickup", "delivery", "dispute", "return"].includes(stage))
      throw new HttpError(400, "Invalid evidence stage");
    const photos = Array.isArray(b.photos) ? b.photos.map(String) : [],
      videoPath = String(b.videoPath || "");
    if (photos.length < 3 || photos.length > 5 || new Set([...photos, videoPath]).size !== photos.length + 1)
      throw new HttpError(400, "Upload three to five distinct photos and a video");
    const files = [];
    let total = 0;
    for (const path of [...photos, videoPath]) {
      if (!path.startsWith(`${id}/${userId}/${stage}/`) || path.includes(".."))
        throw new HttpError(403, "Evidence ownership mismatch");
      const { data, error: e } = await db.storage.from("exchange-evidence").download(path);
      check(e);
      if (!data) throw new Error("Evidence upload is missing");
      total += data.size;
      if (total > 18_000_000) throw new HttpError(413, "Keep evidence under 18 MB total");
      if (!(path === videoPath ? /^video\/(webm|mp4)$/ : /^image\/(jpeg|png|webp)$/).test(data.type))
        throw new Error("Unsupported evidence format");
      files.push({ bytes: Buffer.from(await data.arrayBuffer()), mimeType: data.type });
    }
    const review =
      stage === "dispute" || stage === "return"
        ? { analysis: { uncertain: true, differences: ["Admin review required"] }, reviewStatus: "REVIEW_REQUIRED" }
        : await compareEvidence(db, deal.product_id, files, stage, id);
    return rpc(action, {
      stage,
      photos,
      videoPath,
      hash: sha256(files.map((f) => sha256(f.bytes)).join("|")),
      ...review,
    });
  }

  if (action === "book" || action === "admin_retry_booking") {
    if (!isAdmin && (userId !== deal.seller_id || deal.secure_state !== "PICKUP_VERIFIED" || !q))
      throw new HttpError(409, "Verified seller pickup required");

    // Check if real shipment was already booked to enforce idempotency
    if (v.shiprocket_order_id || v.awb_code) {
      return { ok: true, message: "Shipment already booked", awb: v.awb_code };
    }

    // Fetch product and participant details for authentic shipment creation
    const { data: product } = await db.from("products").select("*").eq("id", deal.product_id).single();
    const { data: seller } = await db.from("profiles").select("*").eq("id", deal.seller_id).single();
    const { data: buyer } = await db.from("profiles").select("*").eq("id", deal.buyer_id).single();

    const providerInstance = logisticsProvider();

    // Call booking
    const booking = await providerInstance.createDelivery(
      {
        id: q.provider_quote_id,
        basePaise: q.delivery_paise,
        distanceKm: q.distance_km,
        expiresAt: q.expires_at,
        isDemo: q.is_demo,
        courierCompanyId: q.courier_company_id,
        courierName: q.courier_name,
      },
      id,
      {
        dealId: id,
        productTitle: product?.title || "Circular Materials Lot",
        quantity: Number(product?.quantity || 1),
        pricePaise: Math.round(Number(deal.agreed_price) * 100),
        weightKg: Number(b.weight || 1.0),
        dimensions: {
          length: Number(b.length || 20),
          breadth: Number(b.breadth || 15),
          height: Number(b.height || 10),
        },
        seller: {
          name: seller?.full_name || "EcoMatch Seller",
          phone: seller?.phone || "9876543210",
          email: seller?.email || "seller@ecomatch.internal",
          address: v.pickup?.address || "Pickup Warehouse",
        },
        buyer: {
          name: buyer?.full_name || "EcoMatch Buyer",
          phone: buyer?.phone || "9876543211",
          email: buyer?.email || "buyer@ecomatch.internal",
          address: v.dropoff?.address || "Dropoff Destination",
        },
      }
    );

    // Update real carrier columns in deliveries table
    await db
      .from("deliveries")
      .update({
        provider: q.is_demo ? "mock" : "shiprocket",
        provider_booking_id: booking.id,
        shiprocket_order_id: booking.id,
        shiprocket_shipment_id: booking.shipmentId ? String(booking.shipmentId) : null,
        awb_code: booking.awbCode || null,
        courier_name: booking.courierName || null,
        tracking_url: booking.trackingUrl,
        tracking_status: booking.status,
        last_tracking_sync_at: new Date().toISOString(),
      })
      .eq("id", v.id);

    return rpc("book", { bookingId: booking.id, provider: q.is_demo ? "mock" : "shiprocket" });
  }

  // Refresh tracking status live from Shiprocket
  if (action === "refresh_tracking" || action === "admin_refresh_tracking") {
    if (!v.awb_code) {
      throw new HttpError(400, "AWB not yet assigned for this delivery.");
    }
    const providerInstance = logisticsProvider();
    const tracking = await providerInstance.getTracking(v.provider_booking_id || id, v.awb_code);

    await db
      .from("deliveries")
      .update({
        tracking_status: tracking.status,
        tracking_payload: tracking.rawTracking || {},
        last_tracking_sync_at: new Date().toISOString(),
      })
      .eq("id", v.id);

    return { ok: true, status: tracking.status, trackingUrl: tracking.trackingUrl, raw: tracking.rawTracking };
  }

  if (action === "admin_cancel_shipment") {
    if (v.shiprocket_order_id) {
      const providerInstance = logisticsProvider();
      await providerInstance.cancelDelivery(v.shiprocket_order_id);
    }
    await db
      .from("deliveries")
      .update({
        tracking_status: "CANCELLED",
        last_tracking_sync_at: new Date().toISOString(),
      })
      .eq("id", v.id);

    return { ok: true, message: "Shipment cancelled." };
  }

  if (action === "demo_tracking") {
    if (!deliveryConfig().demo || !deal.secure_demo) throw new HttpError(403, "Simulation disabled");
    return rpc("tracking", { state: String(b.state || "") });
  }

  if (action === "issue_token") {
    const token = randomBytes(32).toString("base64url"),
      otp = String(randomInt(100000, 1000000)),
      purpose = String(b.purpose);
    const { data: expiresAt, error: e } = await db.rpc("trust_issue_delivery_token", {
      p_deal: id,
      p_actor: userId,
      p_purpose: purpose,
      p_token: token,
      p_otp: otp,
    });
    check(e);
    return { token, otp, expiresAt, url: `/delivery/verify#${token}` };
  }

  if (action === "buyer_confirm") return rpc(action);

  if (action === "settle") {
    if (deal.secure_state !== "PAYMENT_RELEASE_PENDING" || deal.is_disputed)
      throw new HttpError(409, "Payout is frozen or not ready");
    const { data: payments, error: pe } = await db.from("payments").select("*").eq("deal_id", id);
    check(pe);
    const buyer = payments?.find((p) => p.kind === "buyer"),
      deposit = payments?.find((p) => p.kind === "deposit");
    if (!buyer || !deposit || !q) throw new Error("Held payments missing");
    const provider = paymentProvider();
    const release = await provider.releasePayment(buyer.provider_order_id, q.product_paise, `${id}-release`);
    const refund = await provider.refundPayment(deposit.provider_order_id, deposit.amount_paise, `${id}-deposit-refund`);
    if (release.status !== "RELEASED" || refund.status !== "REFUNDED")
      throw new HttpError(409, "Provider settlement remains pending");
    return rpc(action, { releaseReference: release.id, refundReference: refund.id });
  }

  if (action === "dispute") {
    const reasons = ["Wrong Product", "Damaged Product", "Different From Listing", "Missing Parts", "Quantity Mismatch", "Other"];
    if (!reasons.includes(String(b.reason)) || String(b.description || "").length < 10)
      throw new HttpError(400, "Choose a reason and describe the problem");
    return rpc(action, { reason: b.reason, description: String(b.description).slice(0, 3000) });
  }

  if (action === "review_evidence") return rpc(action, { evidenceId: b.evidenceId, reason: b.reason });
  if (action === "resolve_dispute")
    return rpc(action, {
      outcome: b.outcome,
      reason: b.reason,
      buyerRefundPaise: b.buyerRefundPaise,
      depositDeductionPaise: b.depositDeductionPaise,
    });
  if (action === "return_progress") {
    if (!deliveryConfig().demo || !deal.secure_demo)
      throw new HttpError(503, "Production return booking requires the logistics adapter");
    return rpc(action, { state: b.state });
  }

  if (action === "return_settle") {
    if (deal.secure_state !== "RETURN_VERIFIED") throw new HttpError(409, "Verify the returned product first");
    const { data: r, error: re } = await db.from("delivery_returns").select("*").eq("deal_id", id).single();
    check(re);
    const { data: p, error: pe } = await db.from("payments").select("*").eq("deal_id", id);
    check(pe);
    const buyer = p?.find((x) => x.kind === "buyer"),
      deposit = p?.find((x) => x.kind === "deposit");
    if (!buyer || !deposit) throw new Error("Payments missing");
    const provider = paymentProvider(),
      a = await provider.refundPayment(buyer.provider_order_id, r.buyer_refund_paise, `${id}-return-buyer`),
      c = await provider.refundPayment(deposit.provider_order_id, deposit.amount_paise - r.deposit_deduction_paise, `${id}-return-deposit`);
    if (a.status !== "REFUNDED" || c.status !== "REFUNDED") throw new Error("Refund is still pending");
    return rpc(action, { refundReference: `${a.id};${c.id}` });
  }

  throw new HttpError(400, "Unknown delivery action");
}
