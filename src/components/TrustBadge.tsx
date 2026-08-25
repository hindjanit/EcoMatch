"use client";

import { ShieldCheck, ShieldAlert, Award, CheckCircle2 } from "lucide-react";

type TrustBadgeProps = {
  sellerName?: string | null;
  verificationStatus?: string | null;
  trustScore?: number | null;
  showDetails?: boolean;
};

export default function TrustBadge({
  sellerName,
  verificationStatus,
  trustScore = 75,
  showDetails = true,
}: TrustBadgeProps) {
  const isVerified = verificationStatus === "verified";
  const score = trustScore || (isVerified ? 85 : 50);

  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-[#062016] to-[#03140e] p-5 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            {isVerified ? (
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            ) : (
              <ShieldAlert className="h-6 w-6 text-amber-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-white">
                {sellerName || "EcoMatch Member"}
              </h4>
              {isVerified && (
                <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  UIDAI VERIFIED
                </span>
              )}
            </div>
            <p className="text-xs text-white/50">
              {isVerified
                ? "Identity & Cryptographic Proof Validated"
                : "Standard Marketplace Account"}
            </p>
          </div>
        </div>

        {/* Circular / Pill Trust Score */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2">
          <span className="text-xs font-semibold text-emerald-400/80 uppercase tracking-wider">
            Trust
          </span>
          <span className="text-lg font-black text-emerald-300">
            {score}/100
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-[11px] text-white/60">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Escrow OTP Enabled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-emerald-400" />
            <span>Safe Meeting Protocol</span>
          </div>
        </div>
      )}
    </div>
  );
}
