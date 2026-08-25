"use client";

import Link from "next/link";
import { Sparkles, ShieldCheck, Activity, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative mt-20 border-t border-[#7B998B]/20 bg-[#031c13] text-[#9CB4A7] overflow-hidden">
      {/* Top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#7B998B]/50 to-transparent shadow-[0_0_15px_rgba(123,153,139,0.5)]" />

      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Col 1: Brand & Status */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#7B998B]/40 bg-[#064430] text-lg font-bold text-[#FAF8F5]">
                ♻
              </span>
              <span className="text-xl font-black text-[#FAF8F5]">
                Eco<span className="text-[#9CB4A7]">Match</span>
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-[#9CB4A7]">
              Next-generation circular economy marketplace where organizations exchange surplus materials powered by AI waste classification and cryptographic ownership records.
            </p>

            {/* Live System Status Badges */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 rounded-lg border border-[#7B998B]/30 bg-[#064430]/40 px-2.5 py-1 text-[11px] text-[#D8E3DC]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7B998B] opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0E6E4D]"></span>
                </span>
                <span>AI Vision Engine: <strong>Online</strong></span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-[#7B998B]/30 bg-[#064430]/40 px-2.5 py-1 text-[11px] text-[#D8E3DC]">
                <ShieldCheck className="h-3 w-3 text-[#7B998B]" />
                <span>SHA-256 Ledger: <strong>Synced</strong></span>
              </div>
            </div>
          </div>

          {/* Col 2: Marketplace */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Marketplace
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link href="/marketplace" className="transition hover:text-white">
                  Browse Listings
                </Link>
              </li>
              <li>
                <Link href="/seller/add-product" className="transition hover:text-white">
                  List Reusable Material
                </Link>
              </li>
              <li>
                <Link href="/deals" className="transition hover:text-white">
                  Safe Deal Rooms
                </Link>
              </li>
              <li>
                <Link href="/offers" className="transition hover:text-white">
                  Offer Tracker
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Intelligence & Trust */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Intelligence & Trust
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link href="/ai-classify" className="flex items-center gap-1 transition hover:text-white">
                  <Sparkles className="h-3 w-3 text-emerald-400" /> AI Waste Classifier
                </Link>
              </li>
              <li>
                <Link href="/ai-match" className="flex items-center gap-1 transition hover:text-white">
                  <Sparkles className="h-3 w-3 text-emerald-400" /> AI Requirement Match
                </Link>
              </li>
              <li>
                <Link href="/ledger" className="flex items-center gap-1 transition hover:text-white">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" /> Ownership Ledger
                </Link>
              </li>
              <li>
                <Link href="/verify-identity" className="transition hover:text-white">
                  UIDAI e-KYC Verification
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Problem Statement & Creator */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Creator & Impact
            </h4>
            <p className="mt-4 text-xs leading-relaxed text-white/70">
              Architected & Developed with passion by <strong className="text-emerald-400 font-bold text-sm">Janit</strong> for transparent, verifiable circular material exchange.
            </p>
            <div className="mt-4 flex gap-3">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-emerald-400">
                <Activity className="h-4 w-4" />
              </div>
              <div className="text-[11px] text-white/60">
                <p className="font-semibold text-white">Carbon Offset Engine</p>
                <p>Tracking CO2 & Landfill Savings</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} EcoMatch. Developed by <strong className="text-emerald-400 font-semibold">Janit</strong>.</p>
          <div className="flex items-center gap-4">
            <span className="text-emerald-400/90 font-mono text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              Lead Architect: Janit
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
