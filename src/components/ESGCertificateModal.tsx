"use client";

import { Leaf, Printer, X, Info, Recycle, TrendingDown } from "lucide-react";

interface ESGCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  productTitle?: string;
  materialType?: string;
  quantity?: number | string;
  quantityUnit?: string;
  buyerName?: string;
  sellerName?: string;
  co2OffsetKg?: number;
  dealId?: string;
  blockNumber?: string | number;
}

export default function ESGCertificateModal({
  isOpen,
  onClose,
  productTitle = "Circular material lot",
  materialType = "Reusable material",
  quantity = "—",
  quantityUnit = "kg",
  buyerName,
  sellerName,
  co2OffsetKg = 0,
  dealId,
}: ESGCertificateModalProps) {
  if (!isOpen) return null;

  const generatedDate = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const safeCo2 = Number.isFinite(Number(co2OffsetKg)) ? Math.max(0, Number(co2OffsetKg)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md">
      <div className="relative my-8 w-full max-w-2xl rounded-[32px] border border-emerald-500/30 bg-[#061811] p-6 text-white shadow-[0_30px_90px_rgba(0,0,0,0.9)] sm:p-8">
        <button onClick={onClose} aria-label="Close impact preview" className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>

        <div className="rounded-2xl border border-emerald-400/35 bg-gradient-to-b from-[#082218] via-[#051710] to-[#020b08] p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/50 bg-emerald-500/20 text-emerald-400">
              <Leaf className="h-6 w-6" />
            </div>
            <span className="mt-3 font-mono text-[10px] font-bold tracking-widest text-emerald-400 uppercase">EcoMatch circularity planning tool</span>
            <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Indicative Circularity Impact Preview</h2>
            <p className="mt-2 max-w-lg text-xs leading-5 text-white/60">
              A non-statutory estimate based on the listing or deal inputs shown in EcoMatch. It is not a CPCB/EPR credit, carbon offset, ESG assurance, or regulatory certificate.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5 rounded-2xl border border-white/10 bg-black/40 p-4 text-xs sm:grid-cols-4">
            <div><p className="text-[9px] font-bold uppercase text-white/40">Generated</p><p className="mt-0.5 font-bold text-white">{generatedDate}</p></div>
            <div><p className="text-[9px] font-bold uppercase text-white/40">Material</p><p className="mt-0.5 truncate font-bold text-emerald-300">{materialType}</p></div>
            <div><p className="text-[9px] font-bold uppercase text-white/40">Quantity basis</p><p className="mt-0.5 font-mono font-bold text-sky-300">{quantity} {quantityUnit}</p></div>
            <div><p className="text-[9px] font-bold uppercase text-white/40">Deal reference</p><p className="mt-0.5 truncate font-mono font-bold text-white">{dealId || "Preview only"}</p></div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <TrendingDown className="mx-auto h-5 w-5 text-emerald-300" />
              <p className="mt-2 text-[9px] font-bold uppercase text-emerald-400">Indicative CO₂e avoidance</p>
              <p className="mt-1 text-xl font-black text-white">{safeCo2.toFixed(1)} kg</p>
              <p className="text-[9px] text-white/50">Planning estimate, not a certified carbon offset</p>
            </div>
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-center">
              <Recycle className="mx-auto h-5 w-5 text-sky-300" />
              <p className="mt-2 text-[9px] font-bold uppercase text-sky-400">Reuse basis</p>
              <p className="mt-1 text-xl font-black text-white">{quantity} {quantityUnit}</p>
              <p className="text-[9px] text-white/50">Material proposed for reuse through this listing/deal</p>
            </div>
          </div>

          <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-xs">
            <div className="flex items-center justify-between gap-4 text-white/70"><span>Material / asset:</span><span className="text-right font-bold text-emerald-300">{productTitle}</span></div>
            {sellerName && <div className="flex items-center justify-between gap-4 text-white/70"><span>Seller:</span><span className="text-right font-bold text-white">{sellerName}</span></div>}
            {buyerName && <div className="flex items-center justify-between gap-4 text-white/70"><span>Buyer:</span><span className="text-right font-bold text-white">{buyerName}</span></div>}
          </div>

          <div className="mt-5 flex gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-[11px] leading-5 text-amber-100">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>For a completed EcoMatch transaction, use the deal-linked Circularity Impact Certificate generated from the server-verified ownership event. This preview alone is not compliance evidence.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-white/45">Indicative preview • verify regulatory claims independently</span>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-5 py-2 text-xs font-black text-slate-950 hover:bg-emerald-300">
            <Printer className="h-3.5 w-3.5" /> Print / Save Preview
          </button>
        </div>
      </div>
    </div>
  );
}
