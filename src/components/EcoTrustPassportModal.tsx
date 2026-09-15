"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  Lock,
  User,
  Boxes,
  Handshake,
  AlertTriangle,
  HelpCircle,
  X,
  TrendingUp,
  FileCheck,
} from "lucide-react";

interface EcoTrustPassportProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  isIdentityVerified: boolean;
  livenessPassed: boolean;
  completedDealsCount: number;
  activeListingsCount: number;
  disputeCount?: number;
  accountAgeDays?: number;
}

export default function EcoTrustPassportModal({
  isOpen,
  onClose,
  userName,
  isIdentityVerified,
  livenessPassed,
  completedDealsCount = 0,
  activeListingsCount = 0,
  disputeCount = 0,
  accountAgeDays = 30,
}: EcoTrustPassportProps) {
  const [showFormula, setShowFormula] = useState(false);

  if (!isOpen) return null;

  // DETERMINISTIC SCORING FORMULA (Transparent & Explainable)
  // 1. Identity Verification & Presence Check: 40 pts
  // 2. Successful Completed Deals: up to 30 pts (6 pts per completed deal, max 30)
  // 3. Marketplace Activity / Verified Listings: up to 15 pts (3 pts per listing, max 15)
  // 4. Clean Record / Zero Disputes: 15 pts (penalized by 10 pts per unresolved dispute)

  const identityPts = isIdentityVerified ? 40 : 10;
  const dealsPts = Math.min(30, completedDealsCount * 6);
  const listingsPts = Math.min(15, activeListingsCount * 3);
  const disputePenalty = Math.min(15, disputeCount * 10);
  const cleanRecordPts = Math.max(0, 15 - disputePenalty);

  const trustScore = Math.min(100, Math.max(10, identityPts + dealsPts + listingsPts + cleanRecordPts));

  const trustTier =
    trustScore >= 85
      ? { label: "Highly Trusted Partner", color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-400/40" }
      : trustScore >= 60
      ? { label: "Verified Member", color: "text-sky-300", bg: "bg-sky-500/20 border-sky-400/40" }
      : { label: "Emerging Member", color: "text-amber-300", bg: "bg-amber-500/20 border-amber-400/40" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-emerald-500/30 bg-[#051c14] p-6 text-white shadow-2xl sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/20 text-emerald-400">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-black">EcoTrust Passport</h3>
            <p className="text-xs text-white/60">
              Deterministic, transparent trust evaluation for circular commerce.
            </p>
          </div>
        </div>

        {/* Big Trust Score Gauge */}
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#06291d] to-[#03130d] p-5 text-center shadow-inner">
          <span className="text-xs uppercase tracking-widest text-white/50">Overall EcoTrust Score</span>
          <div className="mt-2 flex items-baseline justify-center gap-1">
            <span className="font-mono text-5xl font-black text-emerald-400">{trustScore}</span>
            <span className="text-xl text-white/40">/ 100</span>
          </div>

          <div className="mt-3 flex items-center justify-center">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${trustTier.bg} ${trustTier.color}`}>
              ✓ {trustTier.label}
            </span>
          </div>
        </div>

        {/* Passport Pillars Breakdown */}
        <div className="mt-5 space-y-2.5 text-xs">
          {/* 1. Identity */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#020e0a] p-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className={`h-4 w-4 ${isIdentityVerified ? "text-emerald-400" : "text-white/40"}`} />
              <div>
                <span className="font-bold text-white">Identity Verification</span>
                <p className="text-[10px] text-white/50">Offline UIDAI Signature + Live Presence</p>
              </div>
            </div>
            <span className="font-mono font-bold text-emerald-300">
              {identityPts} / 40 pts
            </span>
          </div>

          {/* 2. Deals */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#020e0a] p-3">
            <div className="flex items-center gap-2.5">
              <Handshake className="h-4 w-4 text-sky-400" />
              <div>
                <span className="font-bold text-white">Completed Safe Deals</span>
                <p className="text-[10px] text-white/50">{completedDealsCount} verified physical handovers</p>
              </div>
            </div>
            <span className="font-mono font-bold text-sky-300">
              {dealsPts} / 30 pts
            </span>
          </div>

          {/* 3. Listings */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#020e0a] p-3">
            <div className="flex items-center gap-2.5">
              <Boxes className="h-4 w-4 text-purple-400" />
              <div>
                <span className="font-bold text-white">Active Listings</span>
                <p className="text-[10px] text-white/50">{activeListingsCount} audited catalog materials</p>
              </div>
            </div>
            <span className="font-mono font-bold text-purple-300">
              {listingsPts} / 15 pts
            </span>
          </div>

          {/* 4. Disputes */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#020e0a] p-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-amber-400" />
              <div>
                <span className="font-bold text-white">Dispute Integrity</span>
                <p className="text-[10px] text-white/50">{disputeCount === 0 ? "Zero disputed transactions" : `${disputeCount} active dispute`}</p>
              </div>
            </div>
            <span className="font-mono font-bold text-amber-300">
              {cleanRecordPts} / 15 pts
            </span>
          </div>
        </div>

        {/* Explainable Formula Toggle */}
        <div className="mt-4 border-t border-white/10 pt-3">
          <button
            onClick={() => setShowFormula(!showFormula)}
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>How is this score calculated?</span>
          </button>

          {showFormula && (
            <div className="mt-2 rounded-xl bg-black/50 p-3 text-[11px] text-white/70 space-y-1 font-mono animate-in fade-in duration-150">
              <p>Score = Identity (40) + Safe Deals (up to 30) + Listings (up to 15) + Clean Record (15 - Disputes*10).</p>
              <p className="text-white/40 text-[10px]">
                Deterministic mathematical scoring. No sensitive biometric or protected attributes are factored into score calculation.
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-emerald-400 px-5 py-2 text-xs font-black text-[#03140e] hover:bg-emerald-300"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
