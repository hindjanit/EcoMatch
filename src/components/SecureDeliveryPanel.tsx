"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { trustFetch, trustPost } from "@/lib/trust/client";
import { Truck, ShieldCheck, RefreshCw, ExternalLink, PackageCheck, AlertCircle } from "lucide-react";
import { generateQrSvg } from "@/lib/trust/qr";
import DeliveryEstimatePreview from "@/components/DeliveryEstimatePreview";

type Evidence = {
  id: string;
  stage: string;
  photos: string[];
  video_path: string;
  review_status: string;
  ai_result: unknown;
  created_at: string;
};

type DeliveryInfo = {
  pickup?: { address: string };
  dropoff?: { address: string };
  provider?: string;
  provider_booking_id?: string;
  provider_status?: string;
  shiprocket_order_id?: string;
  shiprocket_shipment_id?: string;
  awb_code?: string;
  courier_name?: string;
  tracking_status?: string;
  tracking_url?: string;
  tracking_payload?: any;
  carrier_cost_paise?: number;
  service_margin_paise?: number;
  customer_delivery_paise?: number;
  last_tracking_sync_at?: string;
};

type Data = {
  deal: {
    id: string;
    buyer_id: string;
    seller_id: string;
    status: string;
    secure_state: string | null;
    secure_version: number;
    secure_demo: boolean;
  };
  delivery: DeliveryInfo | null;
  quote: {
    product_paise: number;
    delivery_paise: number;
    service_paise: number;
    total_paise: number;
    deposit_paise: number;
    distance_km: number;
    expires_at: string;
    courierName?: string;
    is_demo?: boolean;
  } | null;
  payments: { id: string; payer_id: string; kind: string; status: string; amount_paise: number }[];
  deposit: { status: string; amount_paise: number; deducted_paise: number } | null;
  evidence: Evidence[];
  timeline: { id: string; event_type: string; created_at: string }[];
};

const rupees = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format((n || 0) / 100);

const button =
  "min-h-12 rounded-xl bg-lime-300 px-4 py-3 text-sm font-bold text-[#062016] disabled:opacity-40 hover:bg-lime-200 transition";

export default function SecureDeliveryPanel({
  dealId,
  userId,
  admin = false,
  onModeChange,
}: {
  dealId: string;
  userId: string;
  admin?: boolean;
  onModeChange?: (secure: boolean) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [weight, setWeight] = useState("1.0");
  const [lengthVal, setLengthVal] = useState("20");
  const [breadthVal, setBreadthVal] = useState("15");
  const [heightVal, setHeightVal] = useState("10");
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [token, setToken] = useState<{ url: string; otp: string; expiresAt: string } | null>(null);
  const [reason, setReason] = useState("Wrong Product");
  const [description, setDescription] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [refund, setRefund] = useState("");
  const [deduction, setDeduction] = useState("");
  const [showDispute, setShowDispute] = useState(false);

  const load = useCallback(async () => {
    try {
      const d: Data = await trustFetch(`/api/trust/deals/${dealId}`);
      setData(d);
      setError("");
      onModeChange?.(!!d.deal.secure_state);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delivery unavailable");
    }
  }, [dealId, onModeChange]);

  useEffect(() => {
    let active = true;
    trustFetch(`/api/trust/deals/${dealId}`)
      .then((d: unknown) => {
        if (!active) return;
        const dataObj = d as Data;
        setData(dataObj);
        setError("");
        onModeChange?.(!!dataObj.deal.secure_state);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Delivery unavailable");
      });
    return () => {
      active = false;
    };
  }, [dealId, onModeChange]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      const result = await trustPost(`/api/trust/deals/${dealId}`, {
        action,
        version: data.deal.secure_version,
        key: crypto.randomUUID(),
        ...extra,
      });
      if (action === "issue_token") setToken(result);
      else setNotice("Update saved.");
      await load();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function upload(stage: string) {
    if (photos.length < 3 || photos.length > 5 || !video) {
      setError("Choose 3–5 photos and one short video.");
      return;
    }
    if ([...photos, video].reduce((n, f) => n + f.size, 0) > 18000000) {
      setError("Keep all evidence under 18 MB.");
      return;
    }
    setBusy(true);
    try {
      const paths = [];
      for (const file of [...photos, video]) {
        const signed = await trustPost("/api/trust/media", { dealId, stage, mimeType: file.type });
        const { error } = await createClient()
          .storage.from("exchange-evidence")
          .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
        if (error) throw error;
        paths.push(signed.path);
      }
      await act("evidence", { stage, photos: paths.slice(0, -1), videoPath: paths.at(-1) });
      setPhotos([]);
      setVideo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function savedLocation() {
    const {
      data: { user },
    } = await createClient().auth.getUser();
    if (!user) return;
    const { data: p } = await createClient()
      .from("profiles")
      .select("location_name,latitude,longitude")
      .eq("id", user.id)
      .single();
    if (p) {
      setAddress(p.location_name || "");
      setLat(String(p.latitude ?? ""));
      setLng(String(p.longitude ?? ""));
    }
  }

  async function view(path: string) {
    try {
      const r = await trustPost("/api/trust/media", { operation: "read", dealId, path });
      window.open(r.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evidence unavailable");
    }
  }

  const state = data?.deal.secure_state,
    buyer = data?.deal.buyer_id === userId,
    seller = data?.deal.seller_id === userId;
  const journey = [
    ["Offer accepted", "accepted"],
    ["Route & payment", "DELIVERY_QUOTED"],
    ["Pickup evidence", "PICKUP_VERIFIED"],
    ["Safe handover", "BUYER_CONFIRMATION_PENDING"],
    ["Ledger complete", "COMPLETED"],
  ];
  const stage =
    state === "RETURN_DELIVERED" && seller
      ? "return"
      : state === "DISPUTED"
      ? "dispute"
      : seller && ["PICKUP_EVIDENCE_PENDING", "PICKUP_REVIEW_REQUIRED"].includes(state || "")
      ? "pickup"
      : buyer && ["DELIVERY_EVIDENCE_PENDING", "DELIVERY_REVIEW_REQUIRED"].includes(state || "")
      ? "delivery"
      : null;
  const advance: Record<string, string> = {
    LOGISTICS_BOOKED: "DRIVER_ASSIGNED",
    PICKUP_COMPLETED: "IN_TRANSIT",
    IN_TRANSIT: "DELIVERY_EVIDENCE_PENDING",
  };
  const returnAdvance: Record<string, string> = {
    RETURN_REQUESTED: "RETURN_BOOKING",
    RETURN_BOOKING: "RETURN_PICKUP",
    RETURN_PICKUP: "RETURN_IN_TRANSIT",
    RETURN_IN_TRANSIT: "RETURN_DELIVERED",
  };

  const delivery = data?.delivery;

  return (
    <section className="my-8 rounded-3xl border border-emerald-300/30 bg-[#062016] p-5 text-white sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-widest text-lime-300">SAFE EXCHANGE PROTOCOL</p>
          <h2 className="mt-2 flex items-center gap-3 text-2xl font-bold">
            <Truck />
            EcoMatch Secure Delivery
          </h2>
          <p className="mt-1 text-xs text-white/70">
            Powered by Shiprocket · End-to-end escrow hold & authenticated handover
          </p>
        </div>
        <button
          aria-label="Refresh delivery"
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/5 hover:bg-white/10"
          onClick={() => void load()}
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      <div className="my-5 grid gap-2 sm:grid-cols-5">
        {journey.map(([label, key], index) => {
          const active =
            state === key ||
            (!state && index === 0) ||
            ([
              "FULFILMENT_SELECTED",
              "SELLER_DEPOSIT_PENDING",
              "BUYER_PAYMENT_PENDING",
              "DRIVER_ASSIGNED",
              "PICKUP_COMPLETED",
              "PICKUP_EVIDENCE_PENDING",
              "PICKUP_REVIEW_REQUIRED",
              "IN_TRANSIT",
              "DELIVERY_EVIDENCE_PENDING",
              "DELIVERY_REVIEW_REQUIRED",
              "PAYMENT_RELEASE_PENDING",
            ].includes(state || "") &&
              index > 0);
          return (
            <div
              key={key}
              className={`rounded-xl border p-3 text-xs ${
                active ? "border-lime-300/60 bg-lime-300/10 text-lime-100" : "border-white/10 text-white/45"
              }`}
            >
              <strong>0{index + 1}</strong>
              <p className="mt-1 font-semibold">{label}</p>
            </div>
          );
        })}
      </div>

      <details onToggle={(e) => setPreviewOpen(e.currentTarget.open)} className="my-5 rounded-2xl border border-lime-300/30 p-4">
        <summary className="min-h-12 cursor-pointer py-3 font-bold text-lime-300">
          Plan delivery and review checkout
        </summary>
        <p className="mb-4 text-sm text-slate-300">
          The buyer chooses a destination; seller pickup and agreed item value are securely sourced from the deal.
        </p>
        {previewOpen && <DeliveryEstimatePreview dealId={dealId} />}
      </details>

      {error && (
        <p role="alert" className="my-4 rounded-xl bg-amber-100 p-4 text-amber-950 font-medium">
          {!data
            ? "Live delivery booking is currently unavailable. You can still explore the estimate and payment preview above. No payment or booking will be made."
            : error}
        </p>
      )}
      {notice && <p role="status" className="my-3 text-lime-200 font-semibold">{notice}</p>}

      {!data && (
        <a href="#self-pickup" className="inline-flex min-h-12 items-center rounded-xl border border-white/30 px-4 py-3">
          Meet Seller / Self Pickup
        </a>
      )}

      {!state && data && (
        <>
          <p className="my-4">How would you like to receive this product?</p>
          <div className="flex flex-wrap gap-3">
            <button className={button} disabled={busy || !buyer || data?.deal.status !== "accepted"} onClick={() => void act("select_delivery")}>
              EcoMatch Secure Delivery
            </button>
            <a href="#self-pickup" className="min-h-12 rounded-xl border border-white/30 px-4 py-3">
              Meet Seller / Self Pickup
            </a>
          </div>
          <p className="mt-3 text-sm text-white/60">
            Secure Delivery becomes available to the buyer after the seller accepts the deal. Both participants confirm their addresses privately.
          </p>
        </>
      )}

      {state && data && (
        <>
          <div className="my-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-4 py-1.5 text-sm font-bold text-emerald-300">
              {state.replaceAll("_", " ")}
            </span>
            {data.deal.secure_demo && (
              <strong className="rounded-full bg-amber-200 px-4 py-1.5 text-xs text-amber-950">
                SHOWCASE MODE · Simulated carrier & escrow
              </strong>
            )}
            {delivery?.awb_code && (
              <span className="rounded-full bg-sky-500/20 border border-sky-400/30 px-4 py-1.5 text-xs font-mono text-sky-200">
                AWB: {delivery.awb_code}
              </span>
            )}
          </div>

          {/* REAL SHIPROCKET LIVE TRACKING SECTION */}
          {delivery?.awb_code && (
            <div className="my-5 rounded-2xl border border-sky-400/30 bg-[#071a24] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-6 w-6 text-sky-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Live Carrier Tracking</h3>
                    <p className="text-xs text-sky-200">Carrier: {delivery.courier_name || "Shiprocket Express Partner"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {delivery.tracking_url && (
                    <a
                      href={delivery.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500/20"
                    >
                      <span>Public Tracking</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button
                    disabled={busy}
                    onClick={() => void act("refresh_tracking")}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-sky-400 px-3 py-1.5 text-xs font-bold text-[#021824] hover:bg-sky-300 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
                    <span>Refresh Tracking</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3 border-t border-white/10 pt-3 text-xs">
                <div>
                  <span className="text-white/60">Status:</span>
                  <p className="font-bold text-sky-300">{delivery.tracking_status || "Awaiting Carrier Pickup"}</p>
                </div>
                <div>
                  <span className="text-white/60">Order ID:</span>
                  <p className="font-mono">{delivery.shiprocket_order_id || "EcoMatch Order"}</p>
                </div>
                <div>
                  <span className="text-white/60">Last Synced:</span>
                  <p>{delivery.last_tracking_sync_at ? new Date(delivery.last_tracking_sync_at).toLocaleTimeString() : "Just now"}</p>
                </div>
              </div>
            </div>
          )}

          {["FULFILMENT_SELECTED", "DELIVERY_QUOTED"].includes(state) && !admin && (
            <div className="my-5 space-y-3 rounded-2xl bg-white/5 p-4">
              <h3 className="font-bold">Confirm your {seller ? "pickup" : "delivery"} location</h3>
              <p className="text-sm text-white/70">
                Exact addresses are visible only to this transaction and authorised administrators. Please ensure a 6-digit Indian PIN code is included.
              </p>
              <label className="block">
                Complete address (with 6-digit PIN code)
                <input
                  value={address}
                  placeholder="Plot 42, Okhla Phase 3, New Delhi, 110020"
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 min-h-12 w-full rounded-lg bg-white p-3 text-black"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  Latitude
                  <input
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    type="number"
                    step="any"
                    className="mt-1 min-h-12 w-full rounded-lg bg-white p-3 text-black"
                  />
                </label>
                <label>
                  Longitude
                  <input
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    type="number"
                    step="any"
                    className="mt-1 min-h-12 w-full rounded-lg bg-white p-3 text-black"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className={button} onClick={() => void savedLocation()}>
                  Use saved location
                </button>
                <button
                  className={button}
                  onClick={() =>
                    navigator.geolocation.getCurrentPosition(
                      (p) => {
                        setLat(String(p.coords.latitude));
                        setLng(String(p.coords.longitude));
                      },
                      () => setError("Location permission was not granted. Enter coordinates manually.")
                    )
                  }
                >
                  Use my current location
                </button>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void act("address", { location: { address, latitude: lat, longitude: lng } })}
                >
                  Confirm address
                </button>
              </div>
            </div>
          )}

          <div className="my-4 grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="font-semibold text-lime-300">Pickup Address:</span>
              <p className="mt-1 text-white/80">{data.delivery?.pickup?.address || "Awaiting seller confirmation"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="font-semibold text-lime-300">Delivery Address:</span>
              <p className="mt-1 text-white/80">{data.delivery?.dropoff?.address || "Awaiting buyer confirmation"}</p>
            </div>
          </div>

          {buyer && ["FULFILMENT_SELECTED", "DELIVERY_QUOTED"].includes(state) && (
            <button className={button} disabled={busy} onClick={() => void act("quote")}>
              Get Live Courier Quote (Shiprocket)
            </button>
          )}

          {data.quote && (
            <div className="my-5 rounded-2xl bg-white/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Transparent Delivery Breakdown</h3>
                {data.quote.courierName && (
                  <span className="rounded-full bg-lime-400/20 px-3 py-1 text-xs font-bold text-lime-300">
                    Courier: {data.quote.courierName}
                  </span>
                )}
              </div>
              {[
                ["Material Value", data.quote.product_paise],
                ["Actual Courier/Logistics Charge", data.quote.delivery_paise],
                ["EcoMatch 10% Delivery Service Fee", data.quote.service_paise],
                ["Total Payable by Buyer", data.quote.total_paise],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between gap-3 border-b border-white/10 py-2">
                  <span>{label}</span>
                  <strong>{rupees(Number(value))}</strong>
                </div>
              ))}
              <p className="mt-4">
                Refundable Seller Security Deposit: <strong>{rupees(data.quote.deposit_paise)}</strong>
              </p>
              <p className="text-xs text-white/70">
                Held separately in escrow to guarantee delivery integrity. Refunded upon verified delivery completion.
              </p>
            </div>
          )}

          {/* PACKAGE WEIGHT & DIMENSIONS INPUT FOR SELLER BOOKING */}
          {seller && state === "PICKUP_VERIFIED" && (
            <div className="my-5 rounded-2xl border border-emerald-400/30 bg-[#072418] p-5">
              <h3 className="font-bold text-white mb-2">Confirm Package Dimensions & Weight for Courier</h3>
              <p className="text-xs text-white/70 mb-4">
                Shiprocket calculates volumetric freight based on these confirmed measurements.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <label className="text-xs">
                  Weight (kg)
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-white p-2.5 text-black font-semibold text-sm"
                  />
                </label>
                <label className="text-xs">
                  Length (cm)
                  <input
                    type="number"
                    min="5"
                    value={lengthVal}
                    onChange={(e) => setLengthVal(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-white p-2.5 text-black font-semibold text-sm"
                  />
                </label>
                <label className="text-xs">
                  Breadth (cm)
                  <input
                    type="number"
                    min="5"
                    value={breadthVal}
                    onChange={(e) => setBreadthVal(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-white p-2.5 text-black font-semibold text-sm"
                  />
                </label>
                <label className="text-xs">
                  Height (cm)
                  <input
                    type="number"
                    min="5"
                    value={heightVal}
                    onChange={(e) => setHeightVal(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-white p-2.5 text-black font-semibold text-sm"
                  />
                </label>
              </div>
              <button
                className={button}
                disabled={busy}
                onClick={() =>
                  void act("book", {
                    weight: Number(weight),
                    length: Number(lengthVal),
                    breadth: Number(breadthVal),
                    height: Number(heightVal),
                  })
                }
              >
                Create Shiprocket Order & Generate AWB
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {buyer && state === "DELIVERY_QUOTED" && (
              <button className={button} disabled={busy} onClick={() => void act("buyer_order")}>
                Confirm Delivery & Lock Payment
              </button>
            )}
            {seller && state === "SELLER_DEPOSIT_PENDING" && !data.payments.some((p) => p.kind === "deposit") && (
              <button className={button} disabled={busy} onClick={() => void act("deposit_order")}>
                Confirm Refundable Security Deposit
              </button>
            )}
            {data.deal.secure_demo && data.payments.some((p) => p.payer_id === userId && p.status === "PENDING") && (
              <button className={button} disabled={busy} onClick={() => void act("demo_pay")}>
                Mark Showcase Payment Confirmed
              </button>
            )}
            {data.deal.secure_demo && advance[state] && (
              <button className={button} disabled={busy} onClick={() => void act("demo_tracking", { state: advance[state] })}>
                Advance showcase tracking: {advance[state].replaceAll("_", " ")}
              </button>
            )}
            {((seller && state === "DRIVER_ASSIGNED") || (buyer && state === "BUYER_CONFIRMATION_PENDING")) && (
              <button className={button} disabled={busy} onClick={() => void act("issue_token", { purpose: seller ? "pickup" : "delivery" })}>
                Create Handover Link & OTP
              </button>
            )}
            {buyer && state === "BUYER_CONFIRMATION_PENDING" && (
              <button className={button} disabled={busy} onClick={() => void act("buyer_confirm")}>
                Confirm Item Received
              </button>
            )}
            {state === "PAYMENT_RELEASE_PENDING" && (
              <button className={button} disabled={busy} onClick={() => void act("settle")}>
                Complete Settlement & Transfer Ledger Ownership
              </button>
            )}
            {!admin && !["COMPLETED", "RETURNED", "CANCELLED", "EXPIRED", "DISPUTED"].includes(state) && (
              <button className="min-h-12 rounded-xl border border-amber-300 px-4 text-sm font-semibold" onClick={() => setShowDispute(!showDispute)}>
                Report a Problem
              </button>
            )}
            {["FULFILMENT_SELECTED", "DELIVERY_QUOTED", "BUYER_PAYMENT_PENDING"].includes(state) && (
              <button className="min-h-12 px-3 underline text-sm" disabled={busy} onClick={() => void act("cancel")}>
                Cancel Unpaid Delivery
              </button>
            )}
          </div>

          {token && (
            <div className="my-5 rounded-2xl bg-lime-100 p-5 text-black">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div
                  className="shrink-0 overflow-hidden rounded-xl bg-white p-2 shadow"
                  dangerouslySetInnerHTML={{
                    __html: generateQrSvg(
                      typeof window === "undefined" ? token.url : `${window.location.origin}${token.url}`,
                      160
                    ),
                  }}
                />
                <div className="space-y-1">
                  <p className="font-semibold">Scan QR or share link with the delivery partner:</p>
                  <a className="break-all text-xs font-mono underline" href={token.url} target="_blank" rel="noreferrer">
                    {typeof window === "undefined" ? "" : window.location.origin}
                    {token.url}
                  </a>
                  <p className="mt-2 text-3xl font-black tracking-widest text-[#062016]">OTP: {token.otp}</p>
                  <p className="text-xs text-black/70">
                    Expires {new Date(token.expiresAt).toLocaleTimeString()}. Creating a new code revokes the previous unused code.
                  </p>
                </div>
              </div>
            </div>
          )}

          {showDispute && (
            <div className="my-5 space-y-3">
              <label>
                Problem
                <select className="min-h-12 w-full rounded-xl bg-white p-3 text-black" value={reason} onChange={(e) => setReason(e.target.value)}>
                  {["Wrong Product", "Damaged Product", "Different From Listing", "Missing Parts", "Quantity Mismatch", "Other"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <textarea
                aria-label="Describe the problem"
                className="w-full rounded-xl bg-white p-3 text-black"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the problem (at least 10 characters)"
              />
              <button
                className={button}
                disabled={busy || description.length < 10}
                onClick={() =>
                  void act("dispute", { reason, description }).then(() => setShowDispute(false))
                }
              >
                Open dispute & freeze settlement
              </button>
            </div>
          )}

          {stage && (
            <div className="my-5 space-y-3 rounded-2xl border border-white/20 p-5">
              <h3 className="font-bold">{stage.toUpperCase()} Evidence Verification</h3>
              <p className="text-sm">
                Upload 3–5 clear photos showing every side, condition, packaging and identifying marks, plus a short video. Maximum 18 MB combined. Evidence is private.
              </p>
              <label className="block">
                Photos
                <input
                  className="block min-h-12 w-full py-3"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setPhotos(Array.from(e.target.files || []))}
                />
              </label>
              <label className="block">
                Video
                <input
                  className="block min-h-12 w-full py-3"
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={(e) => setVideo(e.target.files?.[0] || null)}
                />
              </label>
              <button className={button} disabled={busy} onClick={() => void upload(stage)}>
                {busy ? "Uploading & AI Verifying…" : "Submit Evidence for AI Verification"}
              </button>
            </div>
          )}

          {admin && (
            <div className="my-5 space-y-3 rounded-2xl bg-white/10 p-5">
              <h3 className="font-bold text-lg">Admin Logistics Control</h3>
              <textarea
                aria-label="Review reason"
                placeholder="Specific review reason (minimum 10 characters)"
                className="w-full rounded-xl bg-white p-3 text-black"
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void act("admin_retry_booking")}
                >
                  Retry Shiprocket Booking
                </button>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void act("admin_refresh_tracking")}
                >
                  Sync Carrier Tracking
                </button>
                <button
                  className="min-h-12 rounded-xl border border-rose-400 bg-rose-500/20 px-4 py-2 text-rose-200 text-sm font-bold"
                  disabled={busy}
                  onClick={() => void act("admin_cancel_shipment")}
                >
                  Cancel Shipment
                </button>
              </div>

              {data.evidence
                .filter((e) => e.review_status !== "VERIFIED" && e.stage !== "dispute")
                .map((e) => (
                  <button
                    key={e.id}
                    disabled={busy || reviewReason.length < 10}
                    className={button}
                    onClick={() => void act("review_evidence", { evidenceId: e.id, reason: reviewReason })}
                  >
                    Approve reviewed {e.stage} evidence
                  </button>
                ))}
              {state === "DISPUTED" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      Buyer refund (₹)
                      <input
                        type="number"
                        value={refund}
                        onChange={(e) => setRefund(e.target.value)}
                        className="min-h-12 w-full bg-white p-3 text-black"
                      />
                    </label>
                    <label>
                      Deposit deduction (₹)
                      <input
                        type="number"
                        value={deduction}
                        onChange={(e) => setDeduction(e.target.value)}
                        className="min-h-12 w-full bg-white p-3 text-black"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {["request_evidence", "reject_claim", "return"].map((outcome) => (
                      <button
                        key={outcome}
                        className={button}
                        disabled={busy || reviewReason.length < 10}
                        onClick={() =>
                          void act("resolve_dispute", {
                            outcome,
                            reason: reviewReason,
                            buyerRefundPaise: Math.round(Number(refund) * 100),
                            depositDeductionPaise: Math.round(Number(deduction) * 100),
                          })
                        }
                      >
                        {outcome.replaceAll("_", " ")}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {data.deal.secure_demo && returnAdvance[state] && (
                <button className={button} disabled={busy} onClick={() => void act("return_progress", { state: returnAdvance[state] })}>
                  DEMO return: {returnAdvance[state]}
                </button>
              )}
              {state === "RETURN_VERIFIED" && (
                <button className={button} disabled={busy} onClick={() => void act("return_settle")}>
                  Settle Reviewed Refunds
                </button>
              )}
            </div>
          )}

          <details className="my-5">
            <summary className="min-h-12 cursor-pointer py-3 font-bold">Evidence & Payment Records</summary>
            {data.payments.map((p) => (
              <p key={p.id} className="text-sm">
                {p.kind}: {rupees(p.amount_paise)} · {p.status}
              </p>
            ))}
            {data.deposit && (
              <p className="text-sm">
                Security deposit: {data.deposit.status} · Deduction {rupees(data.deposit.deducted_paise)}
              </p>
            )}
            {data.evidence.map((e) => (
              <article key={e.id} className="my-3 rounded-xl bg-white/5 p-4">
                <p>
                  <ShieldCheck className="inline h-4 text-emerald-400" /> {e.stage} · {e.review_status}
                </p>
                <p className="my-2 text-sm break-words">{JSON.stringify(e.ai_result)}</p>
                <div className="flex flex-wrap gap-2">
                  {[...e.photos, e.video_path].map((p, i) => (
                    <button key={p} className="min-h-12 rounded-lg border border-white/20 px-3 text-xs" onClick={() => void view(p)}>
                      {i === e.photos.length ? "Video" : `Photo ${i + 1}`}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </details>

          <details>
            <summary className="min-h-12 cursor-pointer py-3 font-bold">Delivery Audit Timeline</summary>
            {data.timeline.map((t) => (
              <p key={t.id} className="my-2 text-sm">
                {new Date(t.created_at).toLocaleString()} · {t.event_type.replaceAll("_", " ")}
              </p>
            ))}
          </details>
        </>
      )}
    </section>
  );
}
