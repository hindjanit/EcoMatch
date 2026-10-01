"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { trustFetch, trustPost } from "@/lib/trust/client";
import SecureDeliveryPanel from "@/components/SecureDeliveryPanel";
import { ExternalLink } from "lucide-react";

type Review = {
  score: number;
  risk_level: string;
  recommendation: string;
  reasons: string[];
  checks: Record<string, { status: string; reason: string }>;
  created_at: string;
};

type Listing = {
  id: string;
  title: string;
  seller_id: string;
  status: string;
  safety_score: number | null;
  approval_method: string | null;
  auto_approved?: boolean;
  manual_review_required?: boolean;
  moderation_decision?: string;
  moderation_risk_level?: string;
  moderation_confidence?: number;
  created_at: string;
  listing_ai_reviews: Review[];
  product_images?: { image_url: string; verification_status: string }[];
  ai_visual_condition?: string | null;
  ai_condition_confidence?: number | null;
  ai_condition_reason?: string | null;
  product_condition_disclosures?: { usage_band: string; usage_months?: number | null; known_issue_status: string; defects: { label?: string; severity?: string }[]; refurbished: string; repaired: string; repair_details?: string | null; other_details?: string | null; seller_attested_at?: string | null; disclosure_version?: number; overall_condition?: string | null; reuse_potential?: string | null }[];
  disclosure_mismatches?: { code: string; reason: string }[];
};

type Risk = {
  attribution?: string;
  attributed_by?: string;
  attributed_at?: string;
  attribution_reason?: string;
  id: string;
  call_id: string;
  reported_user_id: string | null;
  risk_type: string;
  confidence: string;
  snippet_excerpt: string;
  review_status: string;
  action_taken: string;
  created_at: string;
  analysis: unknown;
};

type Recording = {
  id: string;
  call_id: string;
  uploaded_by: string;
  status: string;
  error: string | null;
};

type Audit = {
  id: string;
  actor_id: string;
  action: string;
  entity_id: string;
  details: unknown;
  created_at: string;
};

type Shipment = {
  id: string;
  deal_id: string;
  provider: string;
  provider_booking_id: string | null;
  shiprocket_order_id: string | null;
  shiprocket_shipment_id: string | null;
  awb_code: string | null;
  courier_name: string | null;
  tracking_status: string | null;
  tracking_url: string | null;
  carrier_cost_paise: number;
  service_margin_paise: number;
  customer_delivery_paise: number;
  pickup: { address?: string } | null;
  dropoff: { address?: string } | null;
  last_tracking_sync_at: string | null;
  created_at: string;
};

type LogisticsConfig = {
  shiprocketConfigured: boolean;
  baseUrl: string;
  activeProvider: string;
  demoMode: boolean;
};

type Data = {
  identities: {
    id: string;
    full_name: string;
    verification_method: string;
    verification_status: string;
    identity_presence_status: string;
    verified_at: string;
    account_type?: string;
    business_name?: string | null;
    trade_name?: string | null;
    gstin?: string | null;
    business_verification_status?: string | null;
    gst_verified_at?: string | null;
    gst_verification_method?: string | null;
  }[];
  transcripts: {
    id: string;
    call_id: string;
    text: string;
    start_time: number;
    attribution_verified: boolean;
  }[];
  listings: Listing[];
  risks: Risk[];
  deliveries: {
    id: string;
    deal_code: string;
    secure_state: string;
    secure_demo: boolean;
  }[];
  recordings: Recording[];
  audit: Audit[];
  shipments?: Shipment[];
  logisticsConfig?: LogisticsConfig;
};

export default function TrustCenter() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Listings");
  const [filter, setFilter] = useState("All");
  const [logisticsFilter, setLogisticsFilter] = useState("All");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await trustFetch("/api/trust/admin"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review unavailable");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function action(id: string, actionName: string, attribution?: string) {
    setBusy(true);
    try {
      const defaultReason =
        actionName === "approve"
          ? "Admin manually approved after listing and image review."
          : actionName === "reject"
          ? "Admin rejected the listing after moderation review."
          : actionName === "changes"
          ? "Admin requested listing changes after moderation review."
          : "Admin action completed after reviewing the available evidence.";
      await trustPost("/api/trust/admin", {
        id,
        action: actionName,
        reason: reason.trim() || defaultReason,
        attribution,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusy(false);
    }
  }

  async function runSafetyAnalysis(productId: string) {
    setBusy(true);
    try {
      await trustPost("/api/trust/listings", { productId });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Safety analysis could not be started");
    } finally {
      setBusy(false);
    }
  }

  async function logisticsAction(dealId: string, actionName: string) {
    setBusy(true);
    try {
      await trustPost("/api/trust/admin", { dealId, action: actionName, reason });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Logistics action failed");
    } finally {
      setBusy(false);
    }
  }

  async function recording(r: Recording) {
    try {
      const result = await trustPost("/api/trust/media", {
        operation: "read",
        callId: r.call_id,
        recordingId: r.id,
      });
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recording unavailable");
    }
  }

  const btn =
    "min-h-12 rounded-xl bg-lime-300 px-4 py-3 text-sm font-bold text-[#062016] disabled:opacity-40 hover:bg-lime-200 transition";

  return (
    <main className="min-h-screen bg-[#062016] px-5 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <a className="inline-block min-h-12 underline text-sm text-lime-300" href="/admin">
          ← Back to primary admin dashboard
        </a>
        <p className="text-xs tracking-widest text-lime-300">ECOMATCH · TRUST & OPERATIONS CENTER</p>
        <h1 className="my-4 text-4xl font-black">AI Safe Verification & Shiprocket Logistics</h1>
        <p className="max-w-2xl text-white/70 text-sm">
          Deterministic AI auto-approvals, live carrier shipments, call anti-circumvention audits, and
          cryptographic provenance.
        </p>

        {/* LOGISTICS CONFIG BADGE & NON-DESTRUCTIVE TEST */}
        {data?.logisticsConfig && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/40 p-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-emerald-300">Logistics Status:</span>
              <span
                className={`rounded-full px-2.5 py-1 font-bold ${
                  data.logisticsConfig.shiprocketConfigured
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                }`}
              >
                {data.logisticsConfig.shiprocketConfigured
                  ? "Shiprocket API Configured"
                  : "Demo / Simulation Mode"}
              </span>
              <span className="text-white/60">Base URL: {data.logisticsConfig.baseUrl}</span>
              <span className="text-white/60">Provider: {data.logisticsConfig.activeProvider}</span>
            </div>
            <button
              className="rounded-xl border border-sky-400/40 bg-sky-500/10 px-3 py-1.5 font-bold text-sky-300 hover:bg-sky-500/20 disabled:opacity-50"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const testRes = await trustPost("/api/trust/admin", {
                    action: "test_shiprocket_connectivity",
                    pickupPin: "110020",
                    deliveryPin: "110001",
                  });
                  alert(
                    testRes.connected
                      ? `✓ Shiprocket Test Passed:\n- Authenticated: YES\n- Live Rate Check: ${testRes.ratesAvailable ? `₹${testRes.sampleRateRupees} via ${testRes.sampleCarrier}` : "No couriers available"}\n(No order or AWB created)`
                      : `✗ Shiprocket Connectivity Test Failed: ${testRes.message}`
                  );
                } catch (e) {
                  alert(e instanceof Error ? e.message : "Test failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Test Live Connection (Non-destructive)
            </button>
          </div>
        )}

        <nav className="my-6 flex flex-wrap gap-2">
          {["Listings", "Logistics", "Call safety", "Deliveries", "Identity", "Business", "Audit"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={t === tab ? btn : "min-h-12 rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold"}
            >
              {t}
            </button>
          ))}
          <button className="min-h-12 px-4 underline text-sm text-lime-300" onClick={() => void load()}>
            Refresh All
          </button>
        </nav>

        {error && <p role="alert" className="my-4 rounded-xl bg-amber-100 p-4 text-amber-950 font-bold">{error}</p>}

        {["Listings", "Call safety", "Logistics"].includes(tab) && (
          <label className="block max-w-2xl mb-5">
            <span className="text-xs font-bold text-lime-300">Reason for Moderation / Logistics Action:</span>
            <textarea
              className="mt-1 w-full rounded-xl bg-white p-3 text-black text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Specific evidence and operational justification (at least 10 characters)"
            />
          </label>
        )}

        {/* TAB 1: LISTINGS AUTO APPROVAL & MODERATION */}
        {tab === "Listings" && (
          <>
            <div className="mb-5 flex flex-wrap gap-2">
              {["All", "Auto Approved", "Manual Review", "High Risk", "Rejected"].map((f) => (
                <button
                  key={f}
                  className={`min-h-10 rounded-full border px-4 text-xs font-bold ${
                    filter === f ? "border-lime-300 bg-lime-300/10 text-lime-300" : "border-white/20 text-white/70"
                  }`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {data?.listings
                .filter((p) => {
                  if (filter === "All") return true;
                  if (filter === "Auto Approved") return p.approval_method === "ai_auto" || p.auto_approved;
                  if (filter === "Manual Review")
                    return ["pending", "pending_review", "changes_requested"].includes(p.status) && !p.auto_approved;
                  if (filter === "High Risk")
                    return (
                      p.moderation_risk_level === "HIGH" ||
                      p.listing_ai_reviews.some((r) => r.risk_level === "HIGH")
                    );
                  if (filter === "Rejected") return p.status === "rejected";
                  return true;
                })
                .map((p) => {
                  const review = [...p.listing_ai_reviews].sort((a, b) =>
                    b.created_at.localeCompare(a.created_at)
                  )[0];
                  return (
                    <article key={p.id} className="rounded-2xl border border-white/20 bg-white/5 p-5">
                      {p.product_images?.[0]?.image_url ? (
                        <img className="mb-4 h-40 w-full rounded-xl border border-white/10 object-cover" src={p.product_images[0].image_url} alt={`Listing image for ${p.title}`} />
                      ) : (
                        <div className="mb-4 flex h-40 items-center justify-center rounded-xl border border-dashed border-white/20 text-xs text-white/50">No listing image available</div>
                      )}
                      <div className="flex items-center justify-between">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            p.approval_method === "ai_auto" || p.auto_approved
                              ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                              : p.status === "approved"
                              ? "bg-sky-400/20 text-sky-300 border border-sky-400/30"
                              : p.status === "rejected"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                              : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                          }`}
                        >
                          {p.approval_method === "ai_auto" || p.auto_approved
                            ? "✓ AI AUTO APPROVED"
                            : p.approval_method === "admin"
                            ? "ADMIN APPROVED"
                            : p.status.toUpperCase().replaceAll("_", " ")}
                        </span>
                        {p.moderation_confidence && (
                          <span className="text-xs text-white/60">
                            Confidence: {Math.round(p.moderation_confidence * 100)}%
                          </span>
                        )}
                      </div>

                      <h2 className="mt-3 text-xl font-bold">{p.title}</h2>
                      <p className="my-2 text-xs text-white/60 break-all">
                        Seller ID: {p.seller_id} · Listed {new Date(p.created_at).toLocaleString()}
                      </p>

                      <div className="my-3 rounded-xl bg-black/30 p-3 text-sm">
                        <div className="flex justify-between">
                          <span>EcoMatch Safety Score:</span>
                          <strong className="text-lime-300">{p.safety_score ?? "Awaiting analysis"}/100</strong>
                        </div>
                        {p.moderation_risk_level && (
                          <div className="flex justify-between mt-1 text-xs">
                            <span>Risk Level:</span>
                            <strong className={p.moderation_risk_level === "HIGH" ? "text-rose-400" : "text-emerald-300"}>
                              {p.moderation_risk_level}
                            </strong>
                          </div>
                        )}
                      </div>

                      {(() => { const d = p.product_condition_disclosures?.[0]; return <div className="my-3 rounded-xl border border-sky-400/25 bg-sky-950/20 p-3 text-xs text-white/80"><p className="font-bold text-sky-300">AI OBSERVATION</p><p>Visual condition: {p.ai_visual_condition || "Unavailable"} {p.ai_condition_confidence != null ? `(${Math.round(p.ai_condition_confidence * 100)}%)` : ""}</p><p>{p.ai_condition_reason || "No AI visual reason available."}</p><p className="mt-2 font-bold text-emerald-300">SELLER DECLARATION</p>{d ? <><p>Usage: {d.usage_months ? `${d.usage_months} months` : d.usage_band} · Known defects: {d.known_issue_status}</p><p>Defects: {d.defects?.length ? d.defects.map((x) => `${x.label || "issue"} (${x.severity || "unspecified"})`).join(", ") : "None declared"}</p><p>Refurbished: {d.refurbished} · Repaired: {d.repaired}</p><p>{d.repair_details || d.other_details || "No additional seller notes."}</p><p>Attested: {d.seller_attested_at ? new Date(d.seller_attested_at).toLocaleString() : "Not attested"} · v{d.disclosure_version || 1}</p><p className="mt-2 font-bold text-lime-300">SYSTEM ASSESSMENT</p><p>Overall: {d.overall_condition || "Not assessed"} · Reuse: {d.reuse_potential || "Not assessed"}</p></> : <p>Seller condition disclosure not available for this older listing.</p>}{p.disclosure_mismatches?.length ? <p className="mt-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-2 font-semibold text-amber-200">Potential disclosure mismatch — manual review recommended. {p.disclosure_mismatches.map((m) => m.code).join(", ")}</p> : null}</div>; })()}

                      {review && (
                        <div className="my-3 text-xs text-white/80">
                          <p className="font-semibold text-lime-200">
                            {review.risk_level} Risk · Recommendation: {review.recommendation}
                          </p>
                          {review.reasons.length > 0 && (
                            <ul className="my-2 list-disc pl-4 space-y-1">
                              {review.reasons.slice(0, 4).map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          )}
                          <details className="mt-2">
                            <summary className="cursor-pointer font-bold text-lime-300 py-1">
                              Inspect granular safety checks
                            </summary>
                            <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
                              {Object.entries(review.checks).map(([k, c]) => (
                                <p key={k} className="text-xs">
                                  <strong>{k}</strong>:{" "}
                                  <span className={c.status === "pass" ? "text-emerald-300" : "text-amber-300"}>
                                    {c.status}
                                  </span>{" "}
                                  — {c.reason}
                                </p>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                        <Link className="min-h-10 inline-flex items-center text-xs underline text-sky-300" href={`/product/${p.id}`}>
                          View Public Product
                        </Link>
                        {["approve", "reject", "changes"].map((a) => (
                          <button
                            key={a}
                            className={btn}
                            disabled={busy || ["sold", "reserved"].includes(p.status)}
                            onClick={() => void action(p.id, a)}
                          >
                            {a === "changes" ? (p.status === "approved" ? "Unpublish & Send to Review" : "Request Changes") : a === "approve" ? "Approve" : "Reject"}
                          </button>
                        ))}
                        {!review && (
                          <button
                            className="min-h-12 rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 text-sm font-bold text-sky-200 transition hover:bg-sky-500/20 disabled:opacity-40"
                            disabled={busy || !["pending", "pending_review", "changes_requested"].includes(p.status)}
                            onClick={() => void runSafetyAnalysis(p.id)}
                          >
                            Run safety analysis
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
            </div>
          </>
        )}

        {/* TAB 2: SHIPROCKET & CARRIER LOGISTICS OPERATIONS */}
        {tab === "Logistics" && (
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              {["All", "Pending Booking", "AWB Assigned", "In Transit", "Delivered", "Cancelled"].map((f) => (
                <button
                  key={f}
                  className={`min-h-10 rounded-full border px-4 text-xs font-bold ${
                    logisticsFilter === f ? "border-sky-300 bg-sky-300/10 text-sky-300" : "border-white/20 text-white/70"
                  }`}
                  onClick={() => setLogisticsFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {data?.shipments
                ?.filter((s) => {
                  if (logisticsFilter === "All") return true;
                  if (logisticsFilter === "Pending Booking") return !s.awb_code && s.provider === "shiprocket";
                  if (logisticsFilter === "AWB Assigned") return s.awb_code && s.tracking_status !== "DELIVERED";
                  if (logisticsFilter === "In Transit") return s.tracking_status === "IN_TRANSIT";
                  if (logisticsFilter === "Delivered") return s.tracking_status === "DELIVERED";
                  if (logisticsFilter === "Cancelled") return s.tracking_status === "CANCELLED";
                  return true;
                })
                .map((s) => (
                  <article key={s.id} className="rounded-2xl border border-sky-400/25 bg-[#061824] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="rounded-full bg-sky-500/20 border border-sky-400/30 px-3 py-1 text-xs font-bold text-sky-300">
                          {s.provider === "shiprocket" ? "🚀 Shiprocket Live" : "Demo Simulation"}
                        </span>
                        <h3 className="mt-2 text-lg font-bold text-white">Deal ID: {s.deal_id}</h3>
                        <p className="text-xs text-white/60">
                          Created {new Date(s.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {s.tracking_url && (
                          <a
                            href={s.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-300 hover:bg-sky-500/20"
                          >
                            <span>Public Tracking</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          className={btn}
                          disabled={busy}
                          onClick={() => void logisticsAction(s.deal_id, "admin_refresh_tracking")}
                        >
                          Refresh Tracking
                        </button>
                        <button
                          className="min-h-12 rounded-xl border border-white/20 bg-white/5 px-4 text-xs font-bold hover:bg-white/10"
                          disabled={busy}
                          onClick={() => void logisticsAction(s.deal_id, "admin_retry_booking")}
                        >
                          Retry Booking
                        </button>
                        <button
                          className="min-h-12 rounded-xl border border-rose-400/30 bg-rose-500/20 px-4 text-xs font-bold text-rose-300 hover:bg-rose-500/30"
                          disabled={busy}
                          onClick={() => void logisticsAction(s.deal_id, "admin_cancel_shipment")}
                        >
                          Cancel Shipment
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-4 border-t border-white/10 pt-3 text-xs">
                      <div>
                        <span className="text-white/60">AWB Code:</span>
                        <p className="font-mono font-bold text-sky-300">{s.awb_code || "Awaiting Assignment"}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Courier:</span>
                        <p className="font-semibold">{s.courier_name || "Shiprocket Partner"}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Carrier Charge:</span>
                        <p className="font-semibold">₹{(s.carrier_cost_paise || 0) / 100}</p>
                      </div>
                      <div>
                        <span className="text-white/60">EcoMatch Margin (10%):</span>
                        <p className="font-semibold text-lime-300">₹{(s.service_margin_paise || 0) / 100}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-white/70">
                      <p>
                        <strong>Pickup:</strong> {s.pickup?.address || "Address pending"}
                      </p>
                      <p>
                        <strong>Dropoff:</strong> {s.dropoff?.address || "Address pending"}
                      </p>
                    </div>
                  </article>
                ))}
              {(!data?.shipments || data.shipments.length === 0) && (
                <p className="text-white/60 py-6">No logistics shipments booked yet.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CALL SAFETY */}
        {tab === "Call safety" && (
          <>
            <div className="space-y-5">
              {data?.risks.map((r) => (
                <article key={r.id} className="rounded-2xl border border-amber-300/30 p-5">
                  <h2 className="font-bold">
                    {r.risk_type} · {r.confidence}
                  </h2>
                  <p className="my-2">{r.snippet_excerpt}</p>
                  <p className="text-sm">
                    Call {r.call_id} · User {r.reported_user_id || "Identity unverified — review required"}
                  </p>
                  <p className="my-2 text-xs">
                    {new Date(r.created_at).toLocaleString()} · {r.review_status} · {r.action_taken}
                  </p>
                  <details>
                    <summary className="min-h-12 py-3 cursor-pointer">Analysis evidence</summary>
                    <pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(r.analysis, null, 2)}</pre>
                  </details>
                  <details>
                    <summary className="min-h-12 py-3 cursor-pointer">Call transcript & recordings</summary>
                    {data.transcripts
                      .filter((t) => t.call_id === r.call_id)
                      .map((t) => (
                        <p className="my-2 text-sm" key={t.id}>
                          {t.start_time}s · {t.text} ({t.attribution_verified ? "verified speaker" : "speaker unverified"})
                        </p>
                      ))}
                    {data.recordings
                      .filter((v) => v.call_id === r.call_id)
                      .map((v) => (
                        <button key={v.id} className={btn} onClick={() => void recording(v)}>
                          Play private recording
                        </button>
                      ))}
                  </details>
                  <div className="my-4 rounded-xl border border-white/20 p-4">
                    <p className="mb-3 font-bold">Attribute violation after reviewing evidence</p>
                    <p className="mb-3 text-xs">
                      {r.attribution || "Not attributed"} · Reviewer {r.attributed_by || "—"} · {r.attributed_at || "—"}
                    </p>
                    <p className="mb-3 text-sm">{r.attribution_reason}</p>
                    <div className="flex flex-wrap gap-2">
                      {["buyer", "seller", "unable_to_determine"].map((a) => (
                        <button
                          key={a}
                          className={btn}
                          disabled={busy || reason.trim().length < 10}
                          onClick={() => void action(r.id, "attribute", a)}
                        >
                          {a.replaceAll("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["block", "restore", "warn", "dismiss"].map((a) => (
                      <button
                        key={a}
                        className={btn}
                        disabled={busy || reason.length < 10 || (!r.reported_user_id && a !== "dismiss")}
                        onClick={() => void action(r.id, a)}
                      >
                        {a === "block" ? "Keep blocked" : a === "restore" ? "Restore account" : a === "warn" ? "Warn user" : "Dismiss flag"}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <h2 className="my-6 text-2xl font-bold">Private recordings</h2>
            {data?.recordings.map((r) => (
              <div key={r.id} className="my-3 flex flex-wrap items-center gap-3 rounded-xl bg-white/5 p-3">
                <span className="break-all text-sm">
                  Call {r.call_id} · {r.status}
                  {r.error && ` · ${r.error}`}
                </span>
                <button className={btn} onClick={() => void recording(r)}>
                  Play with 60-second access link
                </button>
              </div>
            ))}
          </>
        )}

        {/* TAB 4: DELIVERIES PANEL */}
        {tab === "Deliveries" && (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              {data?.deliveries.map((d) => (
                <button
                  className="min-h-20 rounded-2xl border border-white/20 p-4 text-left hover:bg-white/5"
                  key={d.id}
                  onClick={() => setSelected(d.id)}
                >
                  <strong>{d.deal_code}</strong>
                  <p className="text-xs mt-1 text-white/70">{d.secure_state.replaceAll("_", " ")}</p>
                  {d.secure_demo && <span className="text-amber-200 text-xs font-bold">DEMO</span>}
                </button>
              ))}
            </div>
            {selected && <SecureDeliveryPanel key={selected} dealId={selected} userId="" admin />}
          </>
        )}

        {/* TAB 5: IDENTITY */}
        {tab === "Identity" && (
          <section>
            <h2 className="my-4 text-2xl font-bold">IDENTITY VERIFICATION</h2>
            {data?.identities.map((p) => (
              <article key={p.id} className="my-3 rounded-xl border border-white/20 p-5">
                <h3 className="font-bold">{p.full_name || "EcoMatch member"}</h3>
                <p>
                  Method:{" "}
                  {p.verification_method === "demo_identity_liveness"
                    ? "Demo Identity"
                    : p.verification_method?.includes("ekyc")
                    ? "UIDAI Offline e-KYC"
                    : p.verification_method || "None"}
                </p>
                <p>Status: {p.verification_status === "verified_demo" ? "DEMO VERIFIED · synthetic identity" : p.verification_status}</p>
                <p>Presence: {p.identity_presence_status || "Not recorded"}</p>
                <p>Verified at: {p.verified_at ? new Date(p.verified_at).toLocaleString() : "—"}</p>
              </article>
            ))}
          </section>
        )}

        {tab === "Business" && (
          <section>
            <h2 className="my-4 text-2xl font-bold">BUSINESS / GST REVIEWS</h2>
            <p className="mb-4 text-sm text-white/60">Only an authorised manual official lookup may mark a business as GST verified.</p>
            {data?.identities.filter((p) => p.account_type === "business" || p.business_verification_status === "pending").map((p) => (
              <article key={p.id} className="my-3 rounded-xl border border-sky-300/30 bg-sky-950/20 p-5">
                <h3 className="font-bold">{p.business_name || p.full_name || "Business account"}</h3>
                <p className="text-sm">GSTIN: {p.gstin || "Not submitted"} · Trade name: {p.trade_name || "—"}</p>
                <p className="text-sm">Status: {p.business_verification_status || "unverified"} · Method: {p.gst_verification_method || "—"}</p>
                <p className="text-sm">Submitted/verified: {p.gst_verified_at ? new Date(p.gst_verified_at).toLocaleString() : "—"}</p>
                <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void action(p.id, "verify_business")} className="min-h-12 rounded-lg bg-emerald-400 px-3 text-xs font-bold text-slate-950">Mark verified</button><button onClick={() => void action(p.id, "review_business")} className="min-h-12 rounded-lg border border-amber-300/40 px-3 text-xs font-bold text-amber-200">Needs review</button><button onClick={() => void action(p.id, "reject_business")} className="min-h-12 rounded-lg border border-rose-300/40 px-3 text-xs font-bold text-rose-200">Reject</button></div>
              </article>
            ))}
          </section>
        )}

        {/* TAB 6: AUDIT */}
        {tab === "Audit" &&
          data?.audit.map((a) => (
            <article key={a.id} className="my-3 rounded-xl bg-white/5 p-4">
              <p>
                {a.action} · {new Date(a.created_at).toLocaleString()}
              </p>
              <p className="break-all text-xs text-white/60">
                Actor {a.actor_id || "Server"} · {a.entity_id}
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-bold text-lime-300 py-1">Details</summary>
                <pre className="whitespace-pre-wrap break-all text-xs mt-2 bg-black/40 p-3 rounded-lg">
                  {JSON.stringify(a.details, null, 2)}
                </pre>
              </details>
            </article>
          ))}
      </div>
    </main>
  );
}
