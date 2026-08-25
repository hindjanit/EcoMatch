"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  ShieldCheck,
  Tag,
  Boxes,
  ArrowUpRight,
  Sparkles,
  Zap,
} from "lucide-react";

export type ProductCardData = {
  id: string | number;
  seller_id?: string;
  title: string;
  category: string;
  material: string;
  description?: string | null;
  price: number;
  is_negotiable?: boolean;
  condition: string;
  quantity?: number;
  quantity_unit?: string;
  status?: string;
  created_at?: string;
};

type ProductCardProps = {
  product: ProductCardData;
  imageUrl?: string | null;
  distanceKm?: number | null;
  locationName?: string | null;
  isVerifiedSeller?: boolean;
  trustScore?: number | null;
};

const categoryGradients: Record<string, string> = {
  Metals: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  Plastics: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25",
  Electronics: "bg-indigo-500/10 text-indigo-300 border-indigo-500/25",
  Textiles: "bg-pink-500/10 text-pink-300 border-pink-500/25",
  Paper: "bg-yellow-500/10 text-yellow-300 border-yellow-500/25",
  Industrial: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
  Glass: "bg-teal-500/10 text-teal-300 border-teal-500/25",
  Automotive: "bg-rose-500/10 text-rose-300 border-rose-500/25",
};

export default function ProductCard({
  product,
  imageUrl,
  distanceKm,
  locationName,
  isVerifiedSeller,
  trustScore,
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  const categoryStyle =
    categoryGradients[product.category] ||
    "bg-sky-500/10 text-sky-300 border-sky-500/25";

  return (
    <div className="card-3d-wrap group relative">
      <div className="card-3d relative flex flex-col justify-between rounded-3xl border border-white/10 bg-[#0c101a]/85 p-4 shadow-[0_15px_35px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl transition-all duration-300 hover:border-sky-400/40 hover:bg-[#0f1523]/95">
        {/* Top Badges Floating Over Image */}
        <div>
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#07090e]">
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={product.title}
                onError={() => setImageError(true)}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#0c121e] to-[#06080e] p-4 text-center">
                <Boxes className="h-10 w-10 text-sky-400/40" />
                <span className="mt-2 text-xs font-semibold text-slate-400">
                  {product.material || product.category}
                </span>
              </div>
            )}

            {/* Category Tag */}
            <div className="absolute top-3 left-3">
              <span
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] font-bold shadow-lg backdrop-blur-md ${categoryStyle}`}
              >
                <Tag className="h-3 w-3" />
                {product.category}
              </span>
            </div>

            {/* Trust & Verification Badges */}
            <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
              {isVerifiedSeller && (
                <span className="flex items-center gap-1 rounded-xl border border-emerald-400/30 bg-[#08120e]/90 px-2 py-1 text-[10px] font-bold text-emerald-300 shadow-lg backdrop-blur-md">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  Verified
                </span>
              )}
              {trustScore && trustScore >= 70 && (
                <span className="rounded-xl border border-sky-400/30 bg-sky-500/20 px-2 py-0.5 text-[9px] font-bold text-sky-300 backdrop-blur-md">
                  Trust {trustScore}%
                </span>
              )}
            </div>

            {/* Distance Tag if Available */}
            {distanceKm !== null && distanceKm !== undefined && (
              <div className="absolute bottom-3 left-3">
                <span className="flex items-center gap-1 rounded-xl border border-white/15 bg-black/75 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md">
                  <MapPin className="h-3 w-3 text-sky-400" />
                  {distanceKm.toFixed(1)} km away
                </span>
              </div>
            )}

            {/* Condition Tag */}
            <div className="absolute bottom-3 right-3">
              <span className="rounded-xl border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md">
                {product.condition}
              </span>
            </div>
          </div>

          {/* Product Meta Details */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-sky-400">
                {product.material}
              </span>
              {locationName && (
                <span className="truncate text-[11px] text-slate-400">
                  📍 {locationName}
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-white transition line-clamp-1 group-hover:text-sky-300">
              {product.title}
            </h3>

            {product.description && (
              <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
                {product.description}
              </p>
            )}
          </div>
        </div>

        {/* Price & Action Section */}
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Lot Price
                </span>
                {product.is_negotiable && (
                  <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-bold text-amber-300">
                    Negotiable
                  </span>
                )}
              </div>
              <p className="text-xl font-black tracking-tight text-white">
                ₹{Number(product.price).toLocaleString("en-IN")}
                {product.quantity && (
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    / {product.quantity} {product.quantity_unit || "units"}
                  </span>
                )}
              </p>
            </div>

            <Link
              href={`/product/${product.id}`}
              className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-950 shadow-md transition-all hover:bg-slate-200 hover:scale-105"
            >
              Deal Room
              <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
