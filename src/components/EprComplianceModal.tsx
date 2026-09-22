"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Download,
  CheckCircle2,
  TreePine,
  Droplets,
  Layers,
  FileText,
  QrCode,
  X,
  Printer,
  Copy,
} from "lucide-react";

export interface EprCertificateData {
  certificate_no: string;
  deal_id: string;
  buyer_name: string;
  seller_name: string;
  material_title: string;
  material_category: string;
  quantity_kg: number;
  carbon_saved_kg: number;
  waste_diverted_kg: number;
  water_saved_liters: number;
  epr_category: string;
  compliance_standard: string;
  verification_hash: string;
  issued_at: string;
}

interface EprComplianceModalProps {
  certificate: EprCertificateData;
  onClose: () => void;
}

export default function EprComplianceModal({ certificate, onClose }: EprComplianceModalProps) {
  const [copied, setCopied] = useState(false);

  function handleCopyHash() {
    navigator.clipboard.writeText(certificate.verification_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-emerald-500/40 bg-[#061912] p-6 sm:p-8 text-white shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                CPCB COMPLIANT • EPR VALIDATED
              </span>
              <h3 className="text-xl font-black text-white mt-1">
                Circular Material Provenance & EPR Certificate
              </h3>
              <p className="text-xs text-white/60">
                Verifiable Green Credit & Landfill Diversion Instrument
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Certificate Card Body */}
        <div className="rounded-2xl border border-emerald-500/20 bg-[#03100b] p-6 space-y-6">
          {/* Certificate Number & Date */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 text-xs">
            <div>
              <span className="text-white/40 uppercase text-[10px] font-bold">Certificate No.</span>
              <p className="font-mono font-bold text-emerald-400">{certificate.certificate_no}</p>
            </div>
            <div className="text-right">
              <span className="text-white/40 uppercase text-[10px] font-bold">Date of Certification</span>
              <p className="font-mono text-white/80">
                {new Date(certificate.issued_at).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Environmental KPI Badges */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-500/30 bg-[#082417] p-3 text-center">
              <TreePine className="mx-auto h-5 w-5 text-emerald-400 mb-1" />
              <div className="font-mono text-xl font-black text-emerald-300">
                {certificate.carbon_saved_kg} kg
              </div>
              <span className="text-[10px] text-white/60 uppercase font-bold">CO₂ Emissions Avoided</span>
            </div>

            <div className="rounded-xl border border-sky-500/30 bg-[#071f28] p-3 text-center">
              <Layers className="mx-auto h-5 w-5 text-sky-400 mb-1" />
              <div className="font-mono text-xl font-black text-sky-300">
                {certificate.waste_diverted_kg} kg
              </div>
              <span className="text-[10px] text-white/60 uppercase font-bold">Landfill Diversion</span>
            </div>

            <div className="rounded-xl border border-teal-500/30 bg-[#062224] p-3 text-center">
              <Droplets className="mx-auto h-5 w-5 text-teal-400 mb-1" />
              <div className="font-mono text-xl font-black text-teal-300">
                {certificate.water_saved_liters} L
              </div>
              <span className="text-[10px] text-white/60 uppercase font-bold">Freshwater Conserved</span>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-2 text-xs divide-y divide-white/5">
            <div className="flex justify-between pt-1">
              <span className="text-white/50">Certified Material:</span>
              <span className="font-bold text-white">{certificate.material_title}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-white/50">EPR Category Classification:</span>
              <span className="font-bold text-emerald-300">{certificate.epr_category}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-white/50">Authorized Discloser (Seller):</span>
              <span className="font-medium text-white">{certificate.seller_name}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-white/50">Beneficiary Enterprise (Buyer):</span>
              <span className="font-medium text-white">{certificate.buyer_name}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-white/50">Compliance Mandate:</span>
              <span className="text-white/80">{certificate.compliance_standard}</span>
            </div>
          </div>

          {/* Cryptographic SHA-256 Provenance Hash */}
          <div className="rounded-xl border border-white/10 bg-black/60 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-white/40 flex items-center gap-1">
                <QrCode className="h-3 w-3" /> SHA-256 Immutable Audit Hash
              </span>
              <button
                onClick={handleCopyHash}
                className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-bold"
              >
                <Copy className="h-2.5 w-2.5" />
                {copied ? "Copied!" : "Copy Hash"}
              </button>
            </div>
            <p className="font-mono text-[10px] text-emerald-400/90 break-all select-all">
              {certificate.verification_hash}
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/70 hover:bg-white/10"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2 text-xs font-black text-[#03140e] hover:bg-emerald-300 shadow-lg shadow-emerald-500/20"
          >
            <Printer className="h-3.5 w-3.5" /> Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
