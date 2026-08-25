"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Cpu,
  ArrowRight,
  Boxes,
  Zap,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  Activity,
  ChevronDown,
  RotateCw,
  Sparkles,
  Layers,
  Award,
  Globe,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Scan,
  Maximize2,
  CircleDollarSign,
  QrCode,
  Fingerprint,
} from "lucide-react";

type StoryStage = {
  id: string;
  step: string;
  headline: string;
  tagline: string;
  narrative: string;
  telemetry: { label: string; value: string }[];
  ambientGlow: string;
};

const stages: StoryStage[] = [
  {
    id: "discarded",
    step: "01",
    headline: "Every discarded asset holds hidden circular value.",
    tagline: "STAGE 01 · DECOMMISSIONED REALITY",
    narrative:
      "A decommissioned industrial precision servo unit sits idle as surplus scrap. Assumed value: ₹0. EcoMatch begins the resurrection protocol.",
    telemetry: [
      { label: "Asset State", value: "Decommissioned Surplus" },
      { label: "Original Scrap Base", value: "₹0 (Assumed Waste)" },
      { label: "Intake Protocol", value: "Awaiting AI Vision" },
    ],
    ambientGlow: "radial-gradient(circle, rgba(148, 163, 184, 0.08) 0%, transparent 70%)",
  },
  {
    id: "scanning",
    step: "02",
    headline: "EcoMatch Vision inspects & decodes the asset.",
    tagline: "STAGE 02 · OPTICAL SPECTRAL SCAN",
    narrative:
      "Computer vision laser sweep tracks structural tolerances, surface degradation, and micro-geometry with LiDAR point cloud accuracy.",
    telemetry: [
      { label: "Laser Tracking", value: "LiDAR 0.1mm Precision" },
      { label: "Surface Integrity", value: "94.2% Intact" },
      { label: "Alloy Detection", value: "6061-T6 Aircraft Grade" },
    ],
    ambientGlow: "radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)",
  },
  {
    id: "telemetry",
    step: "03",
    headline: "Real-time circular telemetry & fair market pricing.",
    tagline: "STAGE 03 · CIRCULAR TELEMETRY DECODED",
    narrative:
      "Instant valuation calculated using real-world commodity benchmarks, material purity models, and verified carbon offset factors.",
    telemetry: [
      { label: "Condition Rating", value: "Grade A- (91% Efficiency)" },
      { label: "Carbon Diverted", value: "-42.8 kg CO₂e Offset" },
      { label: "AI Valuation", value: "₹14,200 (Fair Resale)" },
    ],
    ambientGlow: "radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)",
  },
  {
    id: "marketplace-card",
    step: "04",
    headline: "Metamorphosis into a verified marketplace asset.",
    tagline: "STAGE 04 · ASSET CARD TRANSFORMATION",
    narrative:
      "The raw asset smoothly locks into a high-contrast EcoMatch verified product card with UIDAI cryptographic passport and instant deal room entry.",
    telemetry: [
      { label: "Trust Passport", value: "UIDAI e-KYC Verified" },
      { label: "Target Listing Price", value: "₹14,200 (vs ₹38,000 New)" },
      { label: "Escrow Protection", value: "100% Protected" },
    ],
    ambientGlow: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)",
  },
  {
    id: "buyer-sync",
    step: "05",
    headline: "Connecting verified supply to enterprise demand.",
    tagline: "STAGE 05 · NEURAL REQUIREMENT SYNC",
    narrative:
      "Autonomous NLP matching pairs the seller (Bangalore Fab) with an enterprise buyer (GreenTech Labs) searching within a 12.4 km transit radius.",
    telemetry: [
      { label: "Requisition Match", value: "96% NLP Fit" },
      { label: "Transit Route", value: "12.4 km Proximity" },
      { label: "Settlement Status", value: "Deal Room Active" },
    ],
    ambientGlow: "radial-gradient(circle, rgba(99, 102, 241, 0.14) 0%, transparent 70%)",
  },
  {
    id: "ledger-exchange",
    step: "06",
    headline: "Cryptographic handover & immutable ledger proof.",
    tagline: "STAGE 06 · DIGITAL LEDGER SEAL",
    narrative:
      "Physical handover is authenticated via one-time digital pass (OTP: 782-901) and permanently recorded on the immutable SHA-256 block ledger.",
    telemetry: [
      { label: "Handover Token", value: "OTP: 782-901 Verified" },
      { label: "Ledger Block", value: "Block #042 Minted" },
      { label: "Loop Status", value: "Zero Landfill Waste" },
    ],
    ambientGlow: "radial-gradient(circle, rgba(16, 185, 129, 0.16) 0%, rgba(56, 189, 248, 0.1) 60%, transparent 70%)",
  },
];

export default function CinematicCircularHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowH = window.innerHeight || 800;
      const totalScrollable = containerRef.current.offsetHeight - windowH;
      if (totalScrollable <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.max(0, Math.min(1, currentScroll / totalScrollable));
      setScrollProgress(progress);

      const stepIndex = Math.min(5, Math.floor(progress * 6));
      setActiveStep(stepIndex);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const jumpToStage = (index: number) => {
    setActiveStep(index);
    if (!containerRef.current) return;
    const windowH = window.innerHeight || 800;
    const totalScrollable = containerRef.current.offsetHeight - windowH;
    const targetY = containerRef.current.offsetTop + (index / 5.5) * totalScrollable;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  const nextStep = () => jumpToStage(Math.min(5, activeStep + 1));
  const prevStep = () => jumpToStage(Math.max(0, activeStep - 1));

  const current = stages[activeStep] || stages[0];

  return (
    <div ref={containerRef} className="relative h-[600vh] w-full bg-[#06080d]">
      {/* Sticky Cinematic Viewport Canvas */}
      <div className="sticky top-0 flex h-screen w-full flex-col justify-between overflow-hidden px-4 pt-24 pb-4 sm:px-8 sm:pt-28">
        {/* Dynamic Stage Ambient Lighting */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[750px] w-[750px] rounded-full blur-[160px] transition-all duration-1000"
            style={{ background: current.ambientGlow }}
          />
          <div className="eco-grid absolute inset-0 opacity-20" />
        </div>

        {/* ========================================================= */}
        {/* TOP STATUS BAR & 6-STAGE STEPPER */}
        {/* ========================================================= */}
        <div className="relative z-30 mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-2.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-7 items-center gap-2 rounded-full border border-white/10 bg-[#0c101a]/90 px-3.5 text-xs font-semibold text-slate-300 backdrop-blur-xl shadow-lg">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>THE CIRCULAR TRANSFORMATION</span>
            </div>
            <span className="hidden font-mono text-xs text-slate-500 md:inline">
              STAGE {current.step} / 06 · METAMORPHOSIS
            </span>
          </div>

          {/* Interactive Stepper Navigation Dock */}
          <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-[#0c101a]/90 p-1.5 backdrop-blur-2xl shadow-xl">
            {[
              "01 Decommission",
              "02 AI Scan",
              "03 Telemetry",
              "04 Asset Card",
              "05 Buyer Sync",
              "06 Ledger Proof",
            ].map((label, idx) => (
              <button
                key={label}
                onClick={() => jumpToStage(idx)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1 text-xs transition-all ${
                  activeStep === idx
                    ? "bg-white text-slate-950 font-bold shadow-md scale-105"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span className="font-mono text-[10px] opacity-70">{label.split(" ")[0]}</span>
                <span className="hidden sm:inline">{label.split(" ")[1]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN 2-COLUMN VIEWPORT: EDITORIAL NARRATIVE + MORPHING ASSET */}
        {/* ========================================================= */}
        <div className="relative z-10 mx-auto my-auto flex flex-col md:flex-row items-center justify-between gap-6 lg:gap-12 w-full max-w-7xl">
          {/* Left Column: Editorial Spatial Typography */}
          <div className="w-full md:w-1/2 flex flex-col justify-center text-left">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-widest text-emerald-400">
                {current.tagline}
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl transition-all duration-500 leading-tight">
              {current.headline}
            </h1>

            <p className="mt-3 text-xs leading-relaxed text-slate-300 sm:text-sm max-w-xl transition-all duration-500">
              {current.narrative}
            </p>

            {/* Real-time Telemetry Bento */}
            <div className="mt-5 grid grid-cols-3 gap-2.5 max-w-lg">
              {current.telemetry.map((t) => (
                <div
                  key={t.label}
                  className="rounded-2xl border border-white/10 bg-[#0c101a]/90 p-2.5 sm:p-3 backdrop-blur-xl shadow-lg"
                >
                  <p className="text-[9px] uppercase font-bold text-slate-500">{t.label}</p>
                  <p className="mt-1 truncate text-xs font-bold text-white">{t.value}</p>
                </div>
              ))}
            </div>

            {/* Quick Action Buttons & Navigation */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {activeStep <= 1 && (
                <Link
                  href="/seller/add-product"
                  className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black text-slate-950 shadow-md transition hover:bg-slate-200 hover:scale-105"
                >
                  List Surplus Lot <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              {activeStep === 2 && (
                <Link
                  href="/ai-classify"
                  className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black text-slate-950 shadow-md transition hover:bg-slate-200 hover:scale-105"
                >
                  Try AI Scanner <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              {activeStep >= 3 && (
                <Link
                  href="/marketplace"
                  className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black text-slate-950 shadow-md transition hover:bg-slate-200 hover:scale-105"
                >
                  Enter Deal Room <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}

              {/* Stage Step Controls */}
              <div className="flex items-center gap-1 ml-auto sm:ml-0">
                <button
                  onClick={prevStep}
                  disabled={activeStep === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-30"
                  title="Previous Stage"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextStep}
                  disabled={activeStep === 5}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-30"
                  title="Next Stage"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <span className="text-[11px] text-slate-500 font-mono">
                {mounted ? Math.round(scrollProgress * 100) : 0}% Transformation
              </span>
            </div>
          </div>

          {/* Right Column: 3D METAMORPHOSIS CANVAS */}
          <div className="w-full md:w-1/2 flex items-center justify-center [perspective:1400px]">
            <div className="relative flex h-[340px] w-[340px] sm:h-[390px] lg:h-[440px] sm:w-[390px] lg:w-[440px] items-center justify-center">
              {/* Concentric Ambient Calibration Halo */}
              <div className="absolute inset-0 rounded-full border border-white/10 shadow-[0_0_50px_rgba(56,189,248,0.05)]" />
              <div
                className="absolute inset-4 rounded-full border border-dashed border-sky-400/25 transition-transform duration-700"
                style={{ transform: `rotate(${mounted ? scrollProgress * 360 : 0}deg)` }}
              />

              {/* ======================================================= */}
              {/* CENTER MORPHING TRANSFORMATION HUB */}
              {/* ======================================================= */}
              <div className="relative z-10 flex h-72 w-72 sm:h-80 sm:w-80 items-center justify-center rounded-[38px] border border-white/15 bg-gradient-to-b from-[#101524]/95 via-[#0c101a]/95 to-[#07090e]/98 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-3xl overflow-hidden transition-all duration-700">
                {/* --------------------------------------------------- */}
                {/* STAGE 1: REAL DISCARDED INDUSTRIAL SERVO ASSET */}
                {/* --------------------------------------------------- */}
                {activeStep === 0 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 w-full">
                    {/* Realistic Levitating Industrial Asset */}
                    <div className="relative h-28 w-28 drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)] animate-float-levitate">
                      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                        <rect x="18" y="25" width="64" height="50" rx="8" fill="url(#metalGradHero1)" stroke="#475569" strokeWidth="1.5" />
                        <line x1="26" y1="35" x2="74" y2="35" stroke="#334155" strokeWidth="2" />
                        <line x1="26" y1="43" x2="74" y2="43" stroke="#334155" strokeWidth="2" />
                        <line x1="26" y1="51" x2="74" y2="51" stroke="#334155" strokeWidth="2" />
                        <line x1="26" y1="59" x2="74" y2="59" stroke="#334155" strokeWidth="2" />
                        <line x1="26" y1="67" x2="74" y2="67" stroke="#334155" strokeWidth="2" />
                        <circle cx="50" cy="20" r="10" fill="#64748b" stroke="#94a3b8" strokeWidth="1.5" />
                        <circle cx="50" cy="20" r="4" fill="#0f172a" />
                        <rect x="47" y="6" width="6" height="10" rx="1" fill="#f59e0b" />
                        <circle cx="30" cy="30" r="2.5" fill="#ef4444" className="animate-ping" />
                        <defs>
                          <linearGradient id="metalGradHero1" x1="18" y1="25" x2="82" y2="75" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#1e293b" />
                            <stop offset="0.5" stopColor="#334155" />
                            <stop offset="1" stopColor="#0f172a" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <span className="mt-3 font-mono text-[11px] font-bold text-slate-300">
                      SURPLUS ASSET #EM-809
                    </span>
                    <span className="text-[10px] text-slate-400">Industrial High-Torque Servo</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[9px] font-bold text-slate-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping" />
                      Decommissioned Surplus · ₹0 Value
                    </span>
                  </div>
                )}

                {/* --------------------------------------------------- */}
                {/* STAGE 2: AI OPTICAL LASER SCANNING LINES */}
                {/* --------------------------------------------------- */}
                {activeStep === 1 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 w-full">
                    {/* Laser Sweep Container */}
                    <div className="laser-sweep relative flex h-28 w-28 items-center justify-center rounded-2xl border border-sky-400/60 bg-[#061424] p-2 shadow-[0_0_35px_rgba(56,189,248,0.35)]">
                      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-20 w-20">
                        <rect x="18" y="25" width="64" height="50" rx="8" fill="url(#metalGradHero2)" stroke="#38bdf8" strokeWidth="1.5" />
                        <line x1="26" y1="35" x2="74" y2="35" stroke="#0284c7" strokeWidth="2" />
                        <line x1="26" y1="43" x2="74" y2="43" stroke="#0284c7" strokeWidth="2" />
                        <line x1="26" y1="51" x2="74" y2="51" stroke="#0284c7" strokeWidth="2" />
                        <line x1="26" y1="59" x2="74" y2="59" stroke="#0284c7" strokeWidth="2" />
                        <circle cx="50" cy="20" r="10" fill="#38bdf8" stroke="#7dd3fc" strokeWidth="1.5" />
                        <circle cx="30" cy="30" r="2.5" fill="#38bdf8" className="animate-ping" />
                        <defs>
                          <linearGradient id="metalGradHero2" x1="18" y1="25" x2="82" y2="75" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#0f172a" />
                            <stop offset="0.5" stopColor="#0369a1" />
                            <stop offset="1" stopColor="#0c4a6e" />
                          </linearGradient>
                        </defs>
                      </svg>

                      {/* Optical Target Reticles */}
                      <div className="absolute top-1 left-1 h-3 w-3 border-t-2 border-l-2 border-sky-400" />
                      <div className="absolute top-1 right-1 h-3 w-3 border-t-2 border-r-2 border-sky-400" />
                      <div className="absolute bottom-1 left-1 h-3 w-3 border-b-2 border-l-2 border-sky-400" />
                      <div className="absolute bottom-1 right-1 h-3 w-3 border-b-2 border-r-2 border-sky-400" />
                    </div>

                    <span className="mt-3 font-mono text-[11px] font-bold text-sky-300">
                      AI SPECTRAL ANALYSIS ACTIVE
                    </span>
                    <span className="text-[10px] text-slate-300">6061-T6 Aircraft Alloy · Cu Cores</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/15 px-2.5 py-0.5 text-[9px] font-bold text-sky-300">
                      <Activity className="h-3 w-3 animate-spin text-sky-400" />
                      LiDAR Point Cloud 99.1% Verified
                    </span>
                  </div>
                )}

                {/* --------------------------------------------------- */}
                {/* STAGE 3: FLOATING ANALYSIS LABELS (TELEMETRY) */}
                {/* --------------------------------------------------- */}
                {activeStep === 2 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 w-full">
                    {/* Asset with 3D Spatial Pins */}
                    <div className="relative flex h-28 w-28 items-center justify-center rounded-2xl border border-emerald-400/50 bg-[#061812] p-2 shadow-[0_0_40px_rgba(16,185,129,0.35)]">
                      <Boxes className="h-12 w-12 text-emerald-400 animate-pulse" />

                      {/* Floating Callout Pin 1 */}
                      <div className="absolute -top-3 -left-3 rounded-xl border border-emerald-400/40 bg-[#061a14] px-2 py-0.5 text-[8px] font-bold text-emerald-300 shadow-md">
                        Grade A- (91%)
                      </div>

                      {/* Floating Callout Pin 2 */}
                      <div className="absolute -bottom-3 -right-3 rounded-xl border border-emerald-400/40 bg-[#061a14] px-2 py-0.5 text-[8px] font-bold text-emerald-300 shadow-md">
                        ₹14,200 Valuation
                      </div>
                    </div>

                    <span className="mt-3 font-mono text-[11px] font-bold text-emerald-300">
                      CIRCULAR TELEMETRY DECODED
                    </span>
                    <span className="text-[10px] text-slate-300">-42.8 kg CO₂e Carbon Offset Factor</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300">
                      <Sparkles className="h-3 w-3 text-emerald-400" />
                      98.4% AI Match Confidence
                    </span>
                  </div>
                )}

                {/* --------------------------------------------------- */}
                {/* STAGE 4: POLISHED MARKETPLACE PRODUCT CARD */}
                {/* --------------------------------------------------- */}
                {activeStep === 3 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 w-full">
                    {/* Polished Asset Card */}
                    <div className="w-full max-w-[240px] rounded-2xl border border-white/20 bg-[#0d1527]/95 p-3 text-left shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold text-emerald-300">
                          Industrial Robotics
                        </span>
                        <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-400">
                          <ShieldCheck className="h-3 w-3" />
                          UIDAI e-KYC
                        </span>
                      </div>

                      <p className="mt-2 text-[11px] font-bold text-white">Precision Servo Motor Lot</p>
                      <p className="text-[9px] text-slate-400">Lot: 4 Units · 6061 Alloy · Tested</p>

                      <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5">
                        <div>
                          <span className="text-[8px] text-slate-400 uppercase font-bold block">Market Value</span>
                          <span className="text-xs font-black text-white font-mono">₹14,200</span>
                        </div>
                        <span className="rounded-md bg-white px-2.5 py-1 text-[9px] font-bold text-slate-950 shadow-md">
                          Deal Room →
                        </span>
                      </div>
                    </div>

                    <span className="mt-2.5 font-mono text-[11px] font-bold text-emerald-300">
                      VERIFIED MARKETPLACE LISTING
                    </span>
                    <span className="text-[10px] text-slate-300">100% Escrow Protection Active</span>
                  </div>
                )}

                {/* --------------------------------------------------- */}
                {/* STAGE 5: BUYER-SELLER CONNECTION SYNC */}
                {/* --------------------------------------------------- */}
                {activeStep === 4 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 w-full">
                    <div className="flex items-center gap-3">
                      {/* Supplier Node */}
                      <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 flex-col items-center justify-center rounded-2xl border border-sky-400/60 bg-sky-500/20 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-sky-500" />
                        </span>
                        <Boxes className="h-5 w-5 sm:h-6 sm:w-6" />
                        <span className="text-[7px] sm:text-[8px] font-bold mt-0.5">SUPPLIER</span>
                      </div>

                      {/* Moving Particle Beam Wire */}
                      <div className="relative flex flex-col items-center overflow-hidden py-1 px-1">
                        <span className="rounded-full border border-indigo-400/40 bg-indigo-500/30 px-2 py-0.5 text-[8px] font-bold text-indigo-300 shadow-lg">
                          96% FIT
                        </span>
                        <div className="relative my-1 h-1 w-12 sm:w-16 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full w-1/2 bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400 rounded-full animate-beam-pulse" />
                        </div>
                        <span className="text-[8px] font-mono text-slate-400">12.4 km Route</span>
                      </div>

                      {/* Buyer Node */}
                      <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 flex-col items-center justify-center rounded-2xl border border-emerald-400/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                        </span>
                        <Cpu className="h-5 w-5 sm:h-6 sm:w-6" />
                        <span className="text-[7px] sm:text-[8px] font-bold mt-0.5">BUYER</span>
                      </div>
                    </div>

                    <span className="mt-2 font-mono text-[11px] font-bold text-indigo-300">
                      NEURAL REQUISITION SYNC
                    </span>
                    <span className="text-[10px] text-slate-300">Bangalore Fab ↔ GreenTech Labs</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-indigo-400/40 bg-indigo-500/20 px-2.5 py-0.5 text-[9px] font-bold text-indigo-300">
                      <Zap className="h-3 w-3 text-indigo-400 animate-bounce" />
                      ₹14,200 Instant Price Lock
                    </span>
                  </div>
                )}

                {/* --------------------------------------------------- */}
                {/* STAGE 6: SECURE EXCHANGE & DIGITAL LEDGER MINTING */}
                {/* --------------------------------------------------- */}
                {activeStep === 5 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 w-full">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_40px_rgba(16,185,129,0.45)]">
                      <CheckCircle2 className="h-9 w-9 text-emerald-400 animate-bounce" />
                    </div>

                    <span className="mt-2 font-mono text-sm font-black text-emerald-300 tracking-wider">
                      OTP: 782-901 CONFIRMED
                    </span>
                    <span className="text-[10px] text-slate-300">Ownership Transferred to Buyer</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300 shadow-md">
                      <Lock className="h-3 w-3 text-sky-400" />
                      SHA-256 Block #042 Minted
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM STATUS BAR */}
        {/* ========================================================= */}
        <div className="relative z-30 mx-auto flex w-full max-w-7xl items-center justify-between border-t border-white/10 pt-3 text-xs">
          <div className="flex items-center gap-6 text-slate-400 font-mono text-[11px]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Diverted Landfill Waste: 100%</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              <span>Verified Circular Route: Active</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>Scroll or use arrows to traverse the transformation</span>
            <ChevronDown className="h-3.5 w-3.5 animate-bounce text-emerald-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
