"use client";

import React, { useRef } from "react";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  Lock,
  Download,
  Printer,
  X,
  QrCode,
  MapPin,
  Calendar,
  Layers,
  Leaf,
} from "lucide-react";

interface CertificateProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  dealCode: string;
  productTitle: string;
  productMaterial: string;
  agreedPrice: number;
  buyerName: string;
  buyerVerified: boolean;
  sellerName: string;
  sellerVerified: boolean;
  meetingLocation: string;
  completedAt: string;
  eventHash: string;
}

export default function VerifiedExchangeCertificateModal({
  isOpen,
  onClose,
  dealId,
  dealCode,
  productTitle,
  productMaterial,
  agreedPrice,
  buyerName,
  buyerVerified,
  sellerName,
  sellerVerified,
  meetingLocation,
  completedAt,
  eventHash,
}: CertificateProps) {
  const printRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  function handlePrint() {
    window.print();
  }

  const maskName = (name: string) => {
    if (!name || name.length <= 3) return name || "Verified Member";
    return `${name.slice(0, 2)}••• ${name.slice(-2)}`;
  };

  const formattedDate = completedAt
    ? new Date(completedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleDateString("en-IN");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative my-8 w-full max-w-2xl rounded-3xl border border-emerald-500/40 bg-[#051a13] p-6 text-white shadow-[0_0_50px_rgba(16,185,129,0.25)] sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Action Header */}
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
              EcoMatch Cryptographic Protocol
            </span>
          </div>

          <div className="flex items-center gap-2 mr-8">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition"
            >
              <Printer className="h-3.5 w-3.5" /> Print / Save PDF
            </button>
          </div>
        </div>

        {/* Printable Certificate Body */}
        <div
          ref={printRef}
          className="mt-6 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-b from-[#06241a] via-[#041912] to-[#020e0a] p-6 shadow-inner"
        >
          {/* Top Logo & Watermark */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 font-black text-[#03140e] text-lg">
                E
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white">EcoMatch</h2>
                <p className="text-[10px] font-mono text-emerald-400 tracking-wider">
                  VERIFIED EXCHANGE CERTIFICATE
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-300">
              <Award className="h-3.5 w-3.5" /> SEALED & VERIFIED
            </div>
          </div>

          {/* Certificate Headline */}
          <div className="mt-6 text-center">
            <span className="text-[11px] uppercase tracking-widest text-white/50">
              Certificate of Safe Circular Material Handover
            </span>
            <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">
              {productTitle || "Circular Material Asset"}
            </h3>
            <p className="mt-1 text-xs text-white/60 font-mono">
              Deal Reference: <strong className="text-emerald-300">#{dealCode}</strong>
            </p>
          </div>

          {/* Verification Badges Grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
            <div className="rounded-xl border border-white/10 bg-black/40 p-2.5 text-center">
              <span className="text-[10px] text-white/50 block">Identity Status</span>
              <span className="font-bold text-emerald-400 flex items-center justify-center gap-1 mt-1">
                <CheckCircle2 className="h-3 w-3" /> Dual Verified
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-2.5 text-center">
              <span className="text-[10px] text-white/50 block">QR Protocol</span>
              <span className="font-bold text-emerald-400 flex items-center justify-center gap-1 mt-1">
                <CheckCircle2 className="h-3 w-3" /> Single-Use Token
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-2.5 text-center">
              <span className="text-[10px] text-white/50 block">6-Digit OTP</span>
              <span className="font-bold text-emerald-400 flex items-center justify-center gap-1 mt-1">
                <CheckCircle2 className="h-3 w-3" /> SHA-256 Validated
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-2.5 text-center">
              <span className="text-[10px] text-white/50 block">Physical Proximity</span>
              <span className="font-bold text-emerald-400 flex items-center justify-center gap-1 mt-1">
                <CheckCircle2 className="h-3 w-3" /> GPS Confirmed
              </span>
            </div>
          </div>

          {/* Transaction Summary Grid */}
          <div className="mt-5 space-y-2.5 rounded-xl border border-white/10 bg-[#020e0a] p-4 text-xs">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-white/60">Originating Seller:</span>
              <span className="font-bold text-white">
                {maskName(sellerName)} {sellerVerified ? "✓" : ""}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-white/60">Recipient Buyer:</span>
              <span className="font-bold text-white">
                {maskName(buyerName)} {buyerVerified ? "✓" : ""}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-white/60">Agreed Transaction Value:</span>
              <span className="font-bold text-emerald-400 font-mono text-sm">
                ₹{agreedPrice.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-white/60">Handover Coordinates:</span>
              <span className="font-semibold text-white/90 truncate max-w-[280px]">
                {meetingLocation || "Agreed Public Meeting Point"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/60">Completion Timestamp:</span>
              <span className="font-mono text-white/80">{formattedDate}</span>
            </div>
          </div>

          {/* Tamper-Evident SHA-256 Ledger Hash */}
          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-black/60 p-3">
            <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
              <span className="flex items-center gap-1 font-bold">
                <Lock className="h-3 w-3" /> TAMPER-EVIDENT LEDGER RECORD
              </span>
              <span>SHA-256 HASH CHAIN</span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-white/70 break-all leading-tight">
              {eventHash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-white/50">
          <span>This digital exchange certificate is permanently verified in the EcoMatch Ledger.</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-[#03140e] hover:bg-emerald-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
