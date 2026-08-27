"use client";

import { ShieldCheck, ShieldAlert, Award, CheckCircle2, MapPin, Navigation, ExternalLink } from "lucide-react";

type TrustBadgeProps = {
  sellerName?: string | null;
  verificationStatus?: string | null;
  trustScore?: number | null;
  showDetails?: boolean;
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
};

export default function TrustBadge({
  sellerName,
  verificationStatus,
  trustScore = 75,
  showDetails = true,
  locationName,
  latitude,
  longitude,
  distanceKm,
}: TrustBadgeProps) {
  const isVerified = verificationStatus === "verified";
  const score = trustScore || (isVerified ? 85 : 50);

  const mapQuery = latitude && longitude
    ? `${latitude},${longitude}`
    : locationName
    ? locationName
    : null;

  const googleMapsUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : null;

  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-[#062016] to-[#03140e] p-5 shadow-xl backdrop-blur-xl space-y-4">
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 shrink-0">
          <span className="text-xs font-semibold text-emerald-400/80 uppercase tracking-wider">
            Trust
          </span>
          <span className="text-lg font-black text-emerald-300">
            {score}/100
          </span>
        </div>
      </div>

      {/* Seller Location & Distance Bar */}
      {(locationName || distanceKm !== undefined && distanceKm !== null) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs">
          <div className="flex items-center gap-2 text-white/70">
            <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-[260px]">
              {locationName || "Verified Seller Location"}
            </span>
            {distanceKm !== undefined && distanceKm !== null && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 shrink-0">
                📍 {distanceKm < 1 ? "< 1 km away" : `${distanceKm.toFixed(1)} km away`}
              </span>
            )}
          </div>

          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-300 hover:bg-sky-500/20 transition"
            >
              <Navigation className="h-3 w-3" /> View on Map <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      )}

      {showDetails && (
        <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-[11px] text-white/60">
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
