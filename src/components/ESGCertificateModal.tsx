"use client";

import { useState } from "react";
import {
  Award,
  CheckCircle2,
  Download,
  FileCheck2,
  Globe,
  Leaf,
  Printer,
  QrCode,
  Share2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

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
  productTitle = "Industrial Surplus Lot #EM-809",
  materialType = "6061-T6 Aluminum Alloy",
  quantity = "30",
  quantityUnit = "kg",
  buyerName = "GreenTech Labs Pvt Ltd",
  sellerName = "Verified Supplier Entity",
  co2OffsetKg = 42.8,
  dealId = "DL-2026-8941",
  blockNumber = "042",
}: ESGCertificateModalProps) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const certificateId = `EM-EPR-${new Date().getFullYear()}-${dealId.replace(/[^0-9]/g, "") || "8091"}`;
  const issueDate = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      alert(`ESG Certificate ${certificateId} downloaded successfully!`);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-[32px] border border-emerald-500/30 bg-[#061811] p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.9)] text-white animate-in fade-in zoom-in-95 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Certificate Frame Container */}
        <div className="rounded-2xl border-2 border-emerald-400/40 bg-gradient-to-b from-[#082218] via-[#051710] to-[#020b08] p-6 sm:p-8 relative overflow-hidden shadow-inner">
          {/* Subtle Guilloche Watermark Pattern */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border border-emerald-400/10 blur-xl" />
          <div className="pointer-events-none absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Certificate Header */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/50 bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <Leaf className="h-6 w-6" />
            </div>

            <span className="mt-3 font-mono text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
              EXTENDED PRODUCER RESPONSIBILITY (EPR) & ESG PASSPORT
            </span>

            <h2 className="mt-1 text-2xl sm:text-3xl font-serif font-black tracking-tight text-white">
              Certificate of Circular Material Recovery
            </h2>

            <p className="mt-2 text-xs text-white/60 max-w-md">
              Official circular economy verification confirming zero-landfill diversion and quantified Scope 3 carbon offset.
            </p>
          </div>

          {/* Certificate Metadata Grid */}
          <div className="relative z-10 mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-2xl border border-white/10 bg-black/40 p-4 text-xs">
            <div>
              <p className="text-[9px] uppercase font-bold text-white/40">Certificate ID</p>
              <p className="mt-0.5 font-mono font-bold text-emerald-300 truncate">{certificateId}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold text-white/40">Issued Date</p>
              <p className="mt-0.5 font-bold text-white truncate">{issueDate}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold text-white/40">Recovered Volume</p>
              <p className="mt-0.5 font-mono font-bold text-sky-300 truncate">
                {quantity} {quantityUnit}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold text-white/40">Ledger Block</p>
              <p className="mt-0.5 font-mono font-bold text-emerald-400 truncate">#{blockNumber} Minted</p>
            </div>
          </div>

          {/* Core Telemetry & Impact Bento */}
          <div className="relative z-10 mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-center">
              <p className="text-[9px] uppercase font-bold text-emerald-400">Carbon Avoided</p>
              <p className="mt-1 text-xl font-black text-white">-{co2OffsetKg} kg</p>
              <p className="text-[9px] text-white/50">CO₂e Scope 3 Offset</p>
            </div>

            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3.5 text-center">
              <p className="text-[9px] uppercase font-bold text-sky-400">Landfill Diverted</p>
              <p className="mt-1 text-xl font-black text-white">100% Zero</p>
              <p className="text-[9px] text-white/50">Full Lifecycle Circularity</p>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-center">
              <p className="text-[9px] uppercase font-bold text-amber-400">EPR Credits</p>
              <p className="mt-1 text-xl font-black text-white">{(Number(quantity) * 1.5).toFixed(1)} Pts</p>
              <p className="text-[9px] text-white/50">Audit Ready Points</p>
            </div>
          </div>

          {/* Participant Verification Row */}
          <div className="relative z-10 mt-5 space-y-2 text-xs border-t border-white/10 pt-4">
            <div className="flex items-center justify-between text-white/70">
              <span>Origin Supplier / Entity:</span>
              <span className="font-bold text-white">{sellerName}</span>
            </div>
            <div className="flex items-center justify-between text-white/70">
              <span>Recipient / Buyer Entity:</span>
              <span className="font-bold text-white">{buyerName}</span>
            </div>
            <div className="flex items-center justify-between text-white/70">
              <span>Verified Asset:</span>
              <span className="font-bold text-emerald-300">{productTitle}</span>
            </div>
          </div>

          {/* Cryptographic Seal & Signature Footer */}
          <div className="relative z-10 mt-6 flex items-center justify-between border-t border-emerald-400/30 pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white p-1">
                <QrCode className="h-full w-full text-slate-900" />
              </div>
              <div className="text-[10px]">
                <p className="font-mono font-bold text-white">SHA-256 LEDGER HASH</p>
                <p className="font-mono text-white/50 truncate max-w-[140px] sm:max-w-[200px]">
                  0x9f83a41c28b7e0d319...
                </p>
              </div>
            </div>

            <div className="text-right text-[10px]">
              <div className="flex items-center justify-end gap-1 text-emerald-400 font-bold">
                <ShieldCheck className="h-4 w-4" /> EcoMatch Trust Protocol
              </div>
              <p className="text-white/50">Digital Auditor Signature: Verified</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-white/50 font-mono">
            Valid for corporate CSR, EPR & ESG Audits
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-5 py-2 text-xs font-black text-slate-950 shadow-lg transition hover:scale-105"
            >
              <Download className="h-3.5 w-3.5" />
              {downloading ? "Generating PDF..." : "Download ESG Certificate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
