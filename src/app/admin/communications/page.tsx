"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import {
  ShieldAlert,
  ShieldCheck,
  Phone,
  PhoneCall,
  PhoneOff,
  AlertTriangle,
  Flag,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  User,
  Boxes,
  Loader2,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";

type CallRecord = {
  id: string;
  caller_id: string;
  receiver_id: string;
  duration_seconds: number;
  status: string;
  risk_status: string;
  created_at: string;
  product?: { title: string } | null;
};

type RiskEvent = {
  id: string;
  actor_id: string;
  risk_type: string;
  risk_score: number;
  confidence: string;
  snippet_excerpt: string;
  review_status: string;
  is_demo: boolean;
  created_at: string;
};

type UserReport = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
};

type DisputeRecord = {
  id: string;
  deal_id: string;
  raised_by: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
};

export default function AdminCommunicationsPage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"calls" | "ai_flags" | "reports" | "disputes">("ai_flags");
  const [loading, setLoading] = useState(true);

  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      const [callsRes, riskRes, reportsRes, disputesRes] = await Promise.all([
        supabase.from("calls").select("*").order("created_at", { ascending: false }).limit(40),
        supabase.from("communication_risk_events").select("*").order("created_at", { ascending: false }).limit(40),
        supabase.from("communication_reports").select("*").order("created_at", { ascending: false }).limit(40),
        supabase.from("deal_disputes").select("*").order("created_at", { ascending: false }).limit(40),
      ]);

      setCalls((callsRes.data || []) as CallRecord[]);
      setRiskEvents((riskRes.data || []) as RiskEvent[]);
      setReports((reportsRes.data || []) as UserReport[]);
      setDisputes((disputesRes.data || []) as DisputeRecord[]);
    } catch (e) {
      console.warn("Load admin comms error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateRiskStatus(id: string, newStatus: "REVIEWED" | "FALSE_POSITIVE") {
    setActionLoading(id);
    try {
      await supabase.from("communication_risk_events").update({ review_status: newStatus }).eq("id", id);
      setRiskEvents((prev) => prev.map((item) => (item.id === id ? { ...item, review_status: newStatus } : item)));
    } catch (e) {
      console.error("Update risk status error:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResolveDispute(disputeId: string, resolution: "RESOLVED_COMPLETED" | "DISMISSED") {
    setActionLoading(disputeId);
    try {
      await supabase.from("deal_disputes").update({ status: resolution, resolved_at: new Date().toISOString() }).eq("id", disputeId);
      setDisputes((prev) => prev.map((item) => (item.id === disputeId ? { ...item, status: resolution } : item)));
    } catch (e) {
      console.error("Resolve dispute error:", e);
    } finally {
      setActionLoading(null);
    }
  }

  // Calculate Metrics
  const callsToday = calls.filter((c) => {
    const d = new Date(c.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const missedCalls = calls.filter((c) => c.status === "MISSED").length;
  const highRiskFlags = riskEvents.filter((r) => r.risk_score >= 85).length;
  const pendingReviews = riskEvents.filter((r) => r.review_status === "PENDING").length;

  return (
    <main className="eco-page min-h-screen text-white pb-24">
      <Navbar />

      <div className="relative mx-auto max-w-7xl px-4 pt-28 sm:px-6 lg:px-8">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Link href="/admin" className="hover:text-emerald-400">
              Admin
            </Link>
            <span>/</span>
            <span className="text-emerald-400">Communication Safety Center</span>
          </div>

          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70 hover:bg-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Return to Main Admin
          </Link>
        </div>

        {/* Title */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
                SAFETY & ANTI-CIRCUMVENTION
              </span>
              <span className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                PRIVACY PRESERVED
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Communication Safety Center</h1>
            <p className="mt-1 text-xs text-white/60">
              Audit call metadata, off-platform diversion attempts, disputes, and incident reports.
            </p>
          </div>

          <button
            onClick={loadData}
            className="self-start md:self-auto flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-[#03140e] hover:bg-emerald-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Data
          </button>
        </div>

        {/* KPI Dashboard Cards */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-[#062016] p-4">
            <span className="text-xs text-white/60">Calls Today</span>
            <div className="mt-1 font-mono text-3xl font-black text-emerald-400">{callsToday}</div>
          </div>

          <div className="rounded-2xl border border-sky-500/30 bg-[#061d24] p-4">
            <span className="text-xs text-white/60">Missed Calls</span>
            <div className="mt-1 font-mono text-3xl font-black text-sky-400">{missedCalls}</div>
          </div>

          <div className="rounded-2xl border border-red-500/30 bg-[#240a0c] p-4">
            <span className="text-xs text-white/60">High-Risk Flags</span>
            <div className="mt-1 font-mono text-3xl font-black text-red-400">{highRiskFlags}</div>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-[#221606] p-4">
            <span className="text-xs text-white/60">Pending Reviews</span>
            <div className="mt-1 font-mono text-3xl font-black text-amber-400">{pendingReviews}</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 flex gap-2 border-b border-white/10 pb-3">
          {[
            { key: "ai_flags", label: "AI Safety Flags", count: riskEvents.length },
            { key: "calls", label: "Call Activity", count: calls.length },
            { key: "reports", label: "User Reports", count: reports.length },
            { key: "disputes", label: "Deal Disputes", count: disputes.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === tab.key
                  ? "bg-emerald-400 text-[#03140e] shadow-lg shadow-emerald-500/20"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              <span className="rounded-full bg-black/30 px-1.5 py-0.2 text-[10px] font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* TAB 1: AI SAFETY FLAGS & RISK EVENTS */}
        {activeTab === "ai_flags" && (
          <div className="mt-6 space-y-4">
            {riskEvents.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-xs text-white/50">
                No communication risk alerts logged.
              </div>
            ) : (
              riskEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="rounded-2xl border border-red-500/30 bg-[#081812] p-5 shadow-xl space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-red-300">
                        {evt.risk_type}
                      </span>
                      {evt.is_demo && (
                        <span className="rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                          [DEMO EVENT]
                        </span>
                      )}
                      <span className="text-xs text-white/60">
                        Risk Score: <strong className="text-red-400">{evt.risk_score}/100</strong>
                      </span>
                    </div>

                    <span className="text-[11px] text-white/40 font-mono">
                      {new Date(evt.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>

                  {evt.snippet_excerpt && (
                    <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs font-mono text-white/80">
                      "{evt.snippet_excerpt}"
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-white/5 pt-2 text-xs">
                    <div>
                      Status:{" "}
                      <strong
                        className={
                          evt.review_status === "PENDING"
                            ? "text-amber-300"
                            : evt.review_status === "REVIEWED"
                            ? "text-emerald-400"
                            : "text-white/40"
                        }
                      >
                        {evt.review_status}
                      </strong>
                    </div>

                    {evt.review_status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateRiskStatus(evt.id, "REVIEWED")}
                          disabled={actionLoading === evt.id}
                          className="rounded-lg bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30"
                        >
                          Mark Reviewed
                        </button>
                        <button
                          onClick={() => handleUpdateRiskStatus(evt.id, "FALSE_POSITIVE")}
                          disabled={actionLoading === evt.id}
                          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold text-white/60 hover:bg-white/10"
                        >
                          False Positive
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: CALL ACTIVITY */}
        {activeTab === "calls" && (
          <div className="mt-6 space-y-3">
            {calls.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-xs text-white/50">
                No voice call sessions recorded yet.
              </div>
            ) : (
              calls.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#061e16] p-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                      <PhoneCall className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Call #{c.id.slice(0, 8)}</span>
                        <span
                          className={`rounded-full px-2 py-0.2 text-[9px] font-bold uppercase ${
                            c.status === "ENDED"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : c.status === "MISSED"
                              ? "bg-sky-500/20 text-sky-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50">
                        Duration: {Math.floor(c.duration_seconds / 60)}m {c.duration_seconds % 60}s ·{" "}
                        {new Date(c.created_at).toLocaleTimeString("en-IN")}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                      {c.risk_status} RISK
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: USER REPORTS */}
        {activeTab === "reports" && (
          <div className="mt-6 space-y-3">
            {reports.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-xs text-white/50">
                No user communication reports submitted.
              </div>
            ) : (
              reports.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-amber-500/30 bg-[#161206] p-5 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Flag className="h-4 w-4" /> {r.reason}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono">
                      {new Date(r.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                  {r.description && <p className="text-white/80 italic">"{r.description}"</p>}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: DISPUTES MANAGEMENT */}
        {activeTab === "disputes" && (
          <div className="mt-6 space-y-3">
            {disputes.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-xs text-white/50">
                No deal disputes currently open.
              </div>
            ) : (
              disputes.map((d) => (
                <div
                  key={d.id}
                  className="rounded-2xl border border-red-500/40 bg-[#180c0d] p-5 text-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-red-400" /> {d.reason}
                    </span>
                    <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-[10px] font-bold text-red-400">
                      {d.status}
                    </span>
                  </div>

                  {d.description && <p className="text-white/80">{d.description}</p>}

                  {d.status === "OPEN" && (
                    <div className="flex gap-2 pt-2 border-t border-white/10">
                      <button
                        onClick={() => handleResolveDispute(d.id, "RESOLVED_COMPLETED")}
                        disabled={actionLoading === d.id}
                        className="rounded-lg bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30"
                      >
                        Authorize Handover Completion
                      </button>
                      <button
                        onClick={() => handleResolveDispute(d.id, "DISMISSED")}
                        disabled={actionLoading === d.id}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold text-white/60 hover:bg-white/10"
                      >
                        Dismiss Dispute
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Footer />
      <MobileBottomNav />
    </main>
  );
}
