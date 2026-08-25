"use client";

import { Sparkles, TrendingDown, TrendingUp, CheckCircle, AlertTriangle } from "lucide-react";

type PriceGaugeProps = {
  price: number;
  fairMin?: number | null;
  fairMax?: number | null;
  referencePrice?: number | null;
  verdict?: string | null;
  confidence?: number | null;
  reason?: string | null;
};

export default function PriceGauge({
  price,
  fairMin,
  fairMax,
  referencePrice,
  verdict,
  confidence,
  reason,
}: PriceGaugeProps) {
  if (!fairMin && !fairMax && !referencePrice && !verdict) {
    return null;
  }

  const min = fairMin || (referencePrice ? Math.round(referencePrice * 0.7) : Math.round(price * 0.8));
  const max = fairMax || (referencePrice ? Math.round(referencePrice * 1.1) : Math.round(price * 1.2));
  const mid = referencePrice || Math.round((min + max) / 2);

  const isBelowMarket = price < mid;
  const savingsPct = isBelowMarket && mid > 0 ? Math.round(((mid - price) / mid) * 100) : 0;

  return (
    <div className="rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-[#06241a] via-[#051c14] to-[#03120c] p-6 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">AI Price Intelligence</h4>
            <p className="text-[11px] text-white/50">Market valuation based on material specs & condition</p>
          </div>
        </div>
        {confidence && (
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
            {confidence}% Confidence
          </span>
        )}
      </div>

      {/* Price Comparison Meter */}
      <div className="mt-6 space-y-3">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-white/60">Fair Range: ₹{min.toLocaleString("en-IN")} — ₹{max.toLocaleString("en-IN")}</span>
          <span className="font-bold text-emerald-400">Ref: ₹{mid.toLocaleString("en-IN")}</span>
        </div>

        {/* Dynamic Range Bar */}
        <div className="relative h-3 w-full rounded-full bg-white/10 p-0.5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 via-teal-400/50 to-amber-500/40 rounded-full" />
          {/* Market Target Notch */}
          <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white/80 shadow-md" title="Market Reference" />
        </div>

        {/* Verdict Badge */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 p-3">
          <div className="flex items-center gap-2">
            {isBelowMarket ? (
              <TrendingDown className="h-5 w-5 text-emerald-400" />
            ) : (
              <TrendingUp className="h-5 w-5 text-amber-400" />
            )}
            <div>
              <p className="text-xs font-bold text-white">
                {verdict || (isBelowMarket ? "Great Deal" : "Fair Value")}
              </p>
              {savingsPct > 0 && (
                <p className="text-[11px] text-emerald-400">
                  Estimated {savingsPct}% savings compared to new material
                </p>
              )}
            </div>
          </div>
          <span className="rounded-lg bg-emerald-500/20 px-2 py-1 text-[11px] font-bold text-emerald-300">
            ₹{price.toLocaleString("en-IN")}
          </span>
        </div>

        {reason && (
          <p className="mt-2 text-xs leading-relaxed text-white/60 italic">
            "{reason}"
          </p>
        )}
      </div>
    </div>
  );
}
