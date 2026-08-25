"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import Interface2_CircularOrbit from "@/components/Interface2_CircularOrbit";
// Saved presets library:
// - Interface 1: import Interface1_CinematicStory from "@/components/Interface1_CinematicStory";
// - Interface 2 (Final Active): import Interface2_CircularOrbit from "@/components/Interface2_CircularOrbit";
// - Interface 3: import Interface3_DigitalTwin from "@/components/Interface3_DigitalTwin";
// - Interface 4: import Interface4_LifecycleStory from "@/components/Interface4_LifecycleStory";
// - Interface 5: import Interface5_CinematicHero from "@/components/Interface5_CinematicHero";
// - Interface 6: import Interface6_SustainableHero from "@/components/Interface6_SustainableHero";
// - Interface 7: import Interface7_OneProductJourney from "@/components/Interface7_OneProductJourney";
// - Interface 8: import Interface8_ObjectToAsset from "@/components/Interface8_ObjectToAsset";
import { CATEGORY_CARDS } from "@/lib/catalog";
import {
  Sparkles,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  Boxes,
  Zap,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Globe,
  Database,
  RotateCw,
} from "lucide-react";

const categories = CATEGORY_CARDS;

export default function Home() {
  const router = useRouter();

  return (
    <main className="eco-page min-h-screen text-white relative pb-20">
      <Navbar />

      {/* ========================================================= */}
      {/* 1. CONTINUOUS 3D CIRCULAR ORBIT JOURNEY (INTERFACE 2)     */}
      {/* ========================================================= */}
      <Interface2_CircularOrbit />

      {/* ========================================================= */}
      {/* 2. CONTINUOUS VALUE STREAM: VERIFIED CATEGORIES           */}
      {/* ========================================================= */}
      <section id="experience" className="relative px-4 py-28 sm:px-6 lg:px-8 border-t border-white/10 bg-[#06080d]">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-sky-300">
                ACTIVE CIRCULAR STREAMS
              </span>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl text-white">
                From excess stock to high-value industrial input.
              </h2>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                EcoMatch bridges decommissioned enterprise supply with verified secondary procurement.
              </p>
            </div>

            <Link
              href="/marketplace"
              className="flex items-center gap-2 text-xs font-bold text-sky-400 hover:text-sky-300 transition group"
            >
              Explore Full Marketplace Catalog
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.name}
                href="/marketplace"
                className="card-3d group relative flex min-h-52 flex-col justify-between rounded-3xl border border-white/10 bg-[#0c101a]/70 p-6 shadow-xl backdrop-blur-xl transition duration-300 hover:border-sky-400/40 hover:bg-[#0f1422]"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
                    {category.icon}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-sky-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-sky-300 transition-colors">
                    {category.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{category.detail}</p>
                  <span className="mt-3 inline-block text-[11px] font-bold text-sky-400 opacity-80 group-hover:opacity-100">
                    Browse verified lots →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. VERIFICATION & ARCHITECTURE BENTO                      */}
      {/* ========================================================= */}
      <section className="relative px-4 py-28 sm:px-6 lg:px-8 border-t border-white/10 bg-[#05070a]">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-emerald-400">
              ZERO-FRAUD INFRASTRUCTURE
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl text-white">
              Deterministic verification for high-value B2B circular deals.
            </h2>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Every exchange is governed by cryptographic identity checks, multi-modal vision analysis, and escrow lock.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f1d]/80 p-8 shadow-2xl backdrop-blur-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/10 text-sky-400">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-black text-white">Multi-Modal Vision Engine</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Gemini Vision analyzes photographic input, grading cosmetic wear, structural flaws, and material density with confidence scoring.
              </p>
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-500/5 p-3 text-xs text-sky-300 font-mono">
                <Sparkles className="h-4 w-4" />
                <span>94.8% Identification Precision</span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f1d]/80 p-8 shadow-2xl backdrop-blur-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-black text-white">UIDAI e-KYC & Escrow</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Aadhaar QR cryptographic verification + locked escrow deals ensure zero phantom buyers or dishonest scrap deliveries.
              </p>
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-xs text-emerald-300 font-mono">
                <CheckCircle2 className="h-4 w-4" />
                <span>Deterministic Identity Match</span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f1d]/80 p-8 shadow-2xl backdrop-blur-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-500/10 text-indigo-400">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-black text-white">Cryptographic Ledger</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                SHA-256 hash chains immortalize physical handover coordinates, timestamps, and transfer records for ESG audit readiness.
              </p>
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-3 text-xs text-indigo-300 font-mono">
                <Activity className="h-4 w-4" />
                <span>Immutable Block Proofs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </main>
  );
}
