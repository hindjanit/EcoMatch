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
  RefreshCw,
  Fingerprint,
} from "lucide-react";

type StageInfo = {
  id: string;
  number: string;
  title: string;
  tagline: string;
  description: string;
  cardTilt: {
    rotateX: number;
    rotateY: number;
  };
  metrics: { label: string; value: string }[];
};

const stages: StageInfo[] = [
  {
    id: "seller",
    number: "01",
    title: "Seller Ingestion",
    tagline: "SURPLUS ASSET ONBOARDING",
    description:
      "Enterprise suppliers and manufacturers list excess materials, precision components, and decommissioned assets with GPS metadata and technical specifications.",
    cardTilt: { rotateX: 4, rotateY: -6 },
    metrics: [
      { label: "Asset Type", value: "6061-T6 Servo Unit" },
      { label: "Status", value: "Decommissioned" },
      { label: "Assumed Value", value: "₹0 / Discard" },
    ],
  },
  {
    id: "verification",
    number: "02",
    title: "AI Optical Verification",
    tagline: "SPECTRAL RECOGNITION & TRUST",
    description:
      "EcoMatch Vision inspects material alloy purity, surface degradation, and operational tolerances, assigning an immutable trust rating and UIDAI verification passport.",
    cardTilt: { rotateX: -3, rotateY: 6 },
    metrics: [
      { label: "AI Confidence", value: "98.4%" },
      { label: "Physical Grade", value: "Grade A- (91%)" },
      { label: "Valuation", value: "₹14,200" },
    ],
  },
  {
    id: "matching",
    number: "03",
    title: "Smart Requisition Match",
    tagline: "NLP DEMAND SYNCHRONIZATION",
    description:
      "Natural-language requisition queries from verified industrial buyers are mapped against supply nodes in real-time, calculating route proximity and compatibility.",
    cardTilt: { rotateX: 5, rotateY: -4 },
    metrics: [
      { label: "Requirement Fit", value: "96% Match" },
      { label: "Buyer Entity", value: "GreenTech Labs" },
      { label: "Route Transit", value: "12.4 km Route" },
    ],
  },
  {
    id: "exchange",
    number: "04",
    title: "Secure Escrow Exchange",
    tagline: "SAFE PROTOCOL & OTP HANDOVER",
    description:
      "Both parties coordinate safe physical inspection points. Handover is protected by digital Apple Wallet-style pass and instantaneous cryptographic OTP release.",
    cardTilt: { rotateX: -4, rotateY: 5 },
    metrics: [
      { label: "Escrow Status", value: "Protected 100%" },
      { label: "Handover Token", value: "OTP: 782-901" },
      { label: "Meeting Point", value: "Verified Logistics Hub" },
    ],
  },
  {
    id: "transfer",
    number: "05",
    title: "Ownership Transfer",
    tagline: "SHA-256 IMMUTABLE LEDGER",
    description:
      "Exchange confirmation immediately mints an encrypted transaction block into the public distributed ledger, transferring asset ownership and provenance history.",
    cardTilt: { rotateX: 3, rotateY: -5 },
    metrics: [
      { label: "Ledger Block", value: "#042 Minted" },
      { label: "Cryptographic Hash", value: "0x9f83...4028" },
      { label: "Chain Status", value: "Synced & Sealed" },
    ],
  },
  {
    id: "reuse",
    number: "06",
    title: "Circular Deployment",
    tagline: "ZERO-LANDFILL CYCLE CLOSED",
    description:
      "The asset re-enters active industrial production with quantified lifecycle carbon offset metrics, closing the circular loop back to zero waste.",
    cardTilt: { rotateX: 0, rotateY: 0 },
    metrics: [
      { label: "CO₂e Avoided", value: "-42.8 kg Offset" },
      { label: "Landfill Waste", value: "0% (Diverted)" },
      { label: "Loop Status", value: "Cycle Complete" },
    ],
  },
];

// Precomputed exact integer coordinates for 6 orbital nodes (Radius 165px)
const orbitalNodeCoordinates = [
  { x: 165, y: 0 },
  { x: 82, y: 143 },
  { x: -82, y: 143 },
  { x: -165, y: 0 },
  { x: -82, y: -143 },
  { x: 82, y: -143 },
];

export default function Interface2_CircularOrbit() {
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

  const currentStage = stages[activeStep] || stages[0];

  return (
    <div ref={containerRef} className="relative h-[550vh] w-full bg-[#07090e]">
      {/* Sticky Cinematic Viewport Stage */}
      <div className="sticky top-0 flex h-screen w-full flex-col justify-between overflow-hidden px-4 pt-24 pb-4 sm:px-8 sm:pt-28">
        {/* Subtle Ambient Radial Lighting */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[750px] w-[750px] rounded-full blur-[160px] transition-all duration-1000"
            style={{
              background:
                activeStep === 0
                  ? "radial-gradient(circle, rgba(148, 163, 184, 0.08) 0%, transparent 70%)"
                  : activeStep === 1
                  ? "radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)"
                  : activeStep === 2
                  ? "radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)"
                  : activeStep === 3
                  ? "radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)"
                  : activeStep === 4
                  ? "radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(56, 189, 248, 0.14) 0%, rgba(16, 185, 129, 0.08) 60%, transparent 70%)",
            }}
          />
          <div className="eco-grid absolute inset-0 opacity-20" />
        </div>

        {/* ========================================================= */}
        {/* TOP STATUS BAR & ORBITAL STEPPER */}
        {/* ========================================================= */}
        <div className="relative z-30 mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-2.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-7 items-center gap-2 rounded-full border border-white/10 bg-[#0c101a]/90 px-3.5 text-xs font-semibold text-slate-300 backdrop-blur-xl shadow-lg">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>CIRCULAR ENGINE LOOP</span>
            </div>
            <span className="hidden font-mono text-xs text-slate-500 md:inline">
              STAGE {currentStage.number} OF 06 · CONTINUOUS LIFECYCLE
            </span>
          </div>

          {/* Interactive Stepper Navigation Dock */}
          <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-[#0c101a]/90 p-1.5 backdrop-blur-2xl shadow-xl">
            {stages.map((stage, idx) => (
              <button
                key={stage.id}
                onClick={() => jumpToStage(idx)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1 text-xs transition-all ${
                  activeStep === idx
                    ? "bg-white text-slate-950 font-bold shadow-md scale-105"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span className="font-mono text-[10px] opacity-60">{stage.number}</span>
                <span className="hidden sm:inline">{stage.title.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN 2-COLUMN VIEWPORT STAGE (ALWAYS SIDE-BY-SIDE ON TABLETS & DESKTOPS) */}
        {/* ========================================================= */}
        <div className="relative z-10 mx-auto my-auto flex flex-col md:flex-row items-center justify-between gap-6 lg:gap-12 w-full max-w-7xl">
          {/* Left Column: Editorial Storytelling Typography */}
          <div className="w-full md:w-1/2 flex flex-col justify-center text-left">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-widest text-emerald-400">
                {currentStage.tagline}
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl transition-all duration-500 leading-tight">
              {currentStage.title}
            </h1>

            <p className="mt-3 text-xs leading-relaxed text-slate-300 sm:text-sm max-w-xl transition-all duration-500">
              {currentStage.description}
            </p>

            {/* Real-time Dynamic Telemetry Bento */}
            <div className="mt-5 grid grid-cols-3 gap-2.5 max-w-lg">
              {currentStage.metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl border border-white/10 bg-[#0c101a]/90 p-2.5 sm:p-3 backdrop-blur-xl shadow-lg"
                >
                  <p className="text-[9px] uppercase font-bold text-slate-500">{m.label}</p>
                  <p className="mt-1 truncate text-xs font-bold text-white">{m.value}</p>
                </div>
              ))}
            </div>

            {/* Quick Action Buttons & Navigation */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {activeStep === 0 && (
                <Link
                  href="/seller/add-product"
                  className="flex items-center gap-2 rounded-xl bg-white px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-black text-slate-950 shadow-md transition hover:bg-slate-200 hover:scale-105"
                >
                  List Asset Now <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              {activeStep === 1 && (
                <Link
                  href="/ai-classify"
                  className="flex items-center gap-2 rounded-xl bg-white px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-black text-slate-950 shadow-md transition hover:bg-slate-200 hover:scale-105"
                >
                  Try AI Scanner <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              {activeStep === 2 && (
                <Link
                  href="/ai-match"
                  className="flex items-center gap-2 rounded-xl bg-white px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-black text-slate-950 shadow-md transition hover:bg-slate-200 hover:scale-105"
                >
                  Open Smart Matcher <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              {activeStep >= 3 && (
                <Link
                  href="/marketplace"
                  className="flex items-center gap-2 rounded-xl bg-white px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-black text-slate-950 shadow-md transition hover:bg-slate-200 hover:scale-105"
                >
                  Explore Marketplace <ArrowRight className="h-3.5 w-3.5" />
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
                {mounted ? Math.round(scrollProgress * 100) : 0}% Orbit
              </span>
            </div>
          </div>

          {/* Right Column: 3D Orbit Ring & Rich Animated Floating Asset (ALWAYS VISIBLE) */}
          <div className="w-full md:w-1/2 flex items-center justify-center [perspective:1400px]">
            <div className="relative flex h-[310px] w-[310px] sm:h-[360px] lg:h-[400px] sm:w-[360px] lg:w-[400px] items-center justify-center scale-90 sm:scale-100">
              {/* Concentric Orbital Rings */}
              <div className="absolute inset-0 rounded-full border border-white/10 shadow-[0_0_50px_rgba(56,189,248,0.05)]" />
              <div
                className="absolute inset-3 rounded-full border border-dashed border-sky-400/25 transition-transform duration-700"
                style={{ transform: `rotate(${mounted ? scrollProgress * 360 : 0}deg)` }}
              />
              <div className="absolute inset-12 rounded-full border border-emerald-400/15" />

              {/* Orbiting Milestone Nodes around the perimeter */}
              {stages.map((st, i) => {
                const pos = orbitalNodeCoordinates[i] || { x: 0, y: 0 };
                const isSelected = activeStep === i;

                return (
                  <div
                    key={st.id}
                    className="absolute flex items-center justify-center transition-all duration-500"
                    style={{
                      transform: `translate3d(${pos.x}px, ${pos.y}px, 0px)`,
                    }}
                  >
                    <button
                      onClick={() => jumpToStage(i)}
                      className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border text-[10px] font-mono font-bold transition-all ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.7)] scale-125 z-20"
                          : "border-white/15 bg-[#0c101a] text-slate-400 hover:border-white/30 hover:text-white"
                      }`}
                      title={st.title}
                    >
                      {st.number}
                    </button>
                  </div>
                );
              })}

              {/* ======================================================= */}
              {/* CENTER DISPLAY HUB: FLOATING REALISTIC ANIMATED ASSET */}
              {/* ======================================================= */}
              <div
                className="relative z-10 flex h-60 w-60 sm:h-68 sm:w-68 items-center justify-center rounded-[36px] border border-white/15 bg-gradient-to-b from-[#101524]/95 via-[#0c101a]/95 to-[#07090e]/98 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-3xl transition-all duration-500 overflow-hidden"
                style={{
                  transform: `rotateX(${currentStage.cardTilt.rotateX}deg) rotateY(${currentStage.cardTilt.rotateY}deg)`,
                }}
              >
                {/* 1. SELLER INGESTION: FLOATING LEVITATING SERVO + RADAR SCAN */}
                {activeStep === 0 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    {/* Rotating Radar Beacon in Background */}
                    <div className="pointer-events-none absolute h-36 w-36 rounded-full border border-sky-400/20 animate-radar-sweep">
                      <div className="h-1/2 w-1/2 rounded-tl-full bg-gradient-to-br from-sky-400/20 to-transparent" />
                    </div>

                    {/* Levitating Industrial Asset */}
                    <div className="relative h-24 w-24 sm:h-28 sm:w-28 drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] animate-float-levitate">
                      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                        <rect x="18" y="25" width="64" height="50" rx="8" fill="url(#metalGrad1_lock)" stroke="#475569" strokeWidth="1.5" />
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
                          <linearGradient id="metalGrad1_lock" x1="18" y1="25" x2="82" y2="75" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#1e293b" />
                            <stop offset="0.5" stopColor="#334155" />
                            <stop offset="1" stopColor="#0f172a" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <span className="mt-2 font-mono text-[10px] sm:text-[11px] font-bold text-slate-300">
                      SURPLUS ASSET #EM-809
                    </span>
                    <span className="text-[10px] text-slate-400">Industrial Servo Motor</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[9px] font-bold text-slate-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                      Awaiting Circular Intake
                    </span>
                  </div>
                )}

                {/* 2. AI OPTICAL SCANNING: ACTIVE LASER SWEEP + SPECTRAL RETICLES */}
                {activeStep === 1 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    <div className="laser-sweep relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-2xl border border-sky-400/60 bg-[#061322] p-2 shadow-[0_0_30px_rgba(56,189,248,0.35)]">
                      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-18 w-18 sm:h-20 sm:w-20">
                        <rect x="18" y="25" width="64" height="50" rx="8" fill="url(#metalGrad2_lock)" stroke="#38bdf8" strokeWidth="1.5" />
                        <line x1="26" y1="35" x2="74" y2="35" stroke="#0284c7" strokeWidth="2" />
                        <line x1="26" y1="43" x2="74" y2="43" stroke="#0284c7" strokeWidth="2" />
                        <line x1="26" y1="51" x2="74" y2="51" stroke="#0284c7" strokeWidth="2" />
                        <line x1="26" y1="59" x2="74" y2="59" stroke="#0284c7" strokeWidth="2" />
                        <circle cx="50" cy="20" r="10" fill="#38bdf8" stroke="#7dd3fc" strokeWidth="1.5" />
                        <rect x="47" y="6" width="6" height="10" rx="1" fill="#38bdf8" />
                        <circle cx="30" cy="30" r="2.5" fill="#38bdf8" className="animate-ping" />
                        <defs>
                          <linearGradient id="metalGrad2_lock" x1="18" y1="25" x2="82" y2="75" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#0f172a" />
                            <stop offset="0.5" stopColor="#0369a1" />
                            <stop offset="1" stopColor="#0c4a6e" />
                          </linearGradient>
                        </defs>
                      </svg>

                      {/* Moving Diagnostic Corner Reticles */}
                      <div className="absolute top-1 left-1 h-3 w-3 border-t-2 border-l-2 border-sky-400 animate-pulse" />
                      <div className="absolute top-1 right-1 h-3 w-3 border-t-2 border-r-2 border-sky-400 animate-pulse" />
                      <div className="absolute bottom-1 left-1 h-3 w-3 border-b-2 border-l-2 border-sky-400 animate-pulse" />
                      <div className="absolute bottom-1 right-1 h-3 w-3 border-b-2 border-r-2 border-sky-400 animate-pulse" />
                    </div>

                    <span className="mt-2 font-mono text-[10px] sm:text-[11px] font-bold text-sky-300">
                      SPECTRAL AI SCANNING
                    </span>
                    <span className="text-[10px] text-slate-300">6061-T6 Aircraft Alloy · Cu Cores</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/15 px-2.5 py-0.5 text-[9px] font-bold text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                      <Activity className="h-3 w-3 animate-spin text-sky-400" />
                      Grade A- (91% Verified)
                    </span>
                  </div>
                )}

                {/* 3. SMART REQUIREMENT MATCHING: MOVING ENERGY PARTICLE BEAM */}
                {activeStep === 2 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    <div className="flex items-center gap-3">
                      {/* Supplier Node with Pulse Ring */}
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
                        <span className="text-[8px] font-mono text-slate-400">12.4 km Transit</span>
                      </div>

                      {/* Buyer Node with Pulse Ring */}
                      <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 flex-col items-center justify-center rounded-2xl border border-emerald-400/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                        </span>
                        <Cpu className="h-5 w-5 sm:h-6 sm:w-6" />
                        <span className="text-[7px] sm:text-[8px] font-bold mt-0.5">BUYER</span>
                      </div>
                    </div>

                    <span className="mt-2 font-mono text-[10px] sm:text-[11px] font-bold text-indigo-300">
                      NEURAL REQUIREMENT SYNC
                    </span>
                    <span className="text-[10px] text-slate-300">GreenTech Labs ↔ Bangalore Fab</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-indigo-400/40 bg-indigo-500/20 px-2.5 py-0.5 text-[9px] font-bold text-indigo-300">
                      <Zap className="h-3 w-3 text-indigo-400 animate-bounce" />
                      ₹14,200 Locked Escrow
                    </span>
                  </div>
                )}

                {/* 4. SECURE ESCROW: BREATHING SHIELD & GLOWING OTP TOKEN */}
                {activeStep === 3 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    {/* Pulsing Safe Escrow Shield */}
                    <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl border border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.35)] animate-shield-pulse">
                      <Lock className="h-8 w-8 sm:h-10 sm:w-10 text-amber-400" />
                      <div className="pointer-events-none absolute -inset-2 rounded-2xl border border-amber-400/30 animate-ping opacity-25" />
                    </div>

                    <span className="mt-2 font-mono text-sm sm:text-base font-black text-amber-300 tracking-wider">
                      OTP: 782-901
                    </span>
                    <span className="text-[10px] text-slate-300">Digital Handover Pass</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-0.5 text-[9px] font-bold text-amber-300 shadow-md">
                      <Fingerprint className="h-3 w-3 text-amber-400 animate-pulse" />
                      UIDAI Cryptographic Seal
                    </span>
                  </div>
                )}

                {/* 5. SHA-256 OWNERSHIP TRANSFER: STREAMING HASH & BLOCK CHAIN */}
                {activeStep === 4 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    {/* Glowing Minting Block */}
                    <div className="relative flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-2xl border border-emerald-500/50 bg-emerald-500/20 text-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.35)]">
                      <Zap className="h-8 w-8 sm:h-9 sm:w-9 text-emerald-400 animate-pulse" />
                      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                    </div>

                    <span className="mt-2 font-mono text-[10px] sm:text-[11px] font-bold text-emerald-300">
                      BLOCK #042 MINTED
                    </span>
                    {/* Streaming Hash Animation */}
                    <span className="text-[9px] font-mono text-emerald-400/90 truncate max-w-[190px] animate-hash-stream">
                      Tx: 0x9f83a41c28b7e0d319...
                    </span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      Ownership Sealed to Buyer
                    </span>
                  </div>
                )}

                {/* 6. CIRCULAR DEPLOYMENT: FAST ROTATING TURBINE VORTEX */}
                {activeStep === 5 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    {/* Double Vortex Rings */}
                    <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl border border-emerald-400/60 bg-gradient-to-br from-emerald-500/30 to-sky-500/20 text-emerald-300 shadow-[0_0_40px_rgba(16,185,129,0.45)]">
                      <RotateCw className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-300 animate-spin" style={{ animationDuration: "3s" }} />
                      <RefreshCw className="absolute h-12 w-12 sm:h-14 sm:w-14 text-sky-400/40 animate-spin" style={{ animationDuration: "6s", animationDirection: "reverse" }} />
                    </div>

                    <span className="mt-2 font-mono text-[10px] sm:text-[11px] font-bold text-emerald-300">
                      ACTIVE INDUSTRIAL ROTATION
                    </span>
                    <span className="text-[10px] text-slate-300">-42.8 kg CO₂e Diverted</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300 shadow-md">
                      <Sparkles className="h-3 w-3 text-emerald-400 animate-spin" style={{ animationDuration: "4s" }} />
                      Zero-Waste Loop Complete 100%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM STATUS METRICS */}
        {/* ========================================================= */}
        <div className="relative z-30 mx-auto flex w-full max-w-7xl items-center justify-between border-t border-white/10 pt-3 text-xs">
          <div className="flex items-center gap-6 text-slate-400 font-mono text-[11px]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>CO₂e Saved: 1,480+ Tonnes</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              <span>Active Verified Nodes: 342</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>Scroll or use arrows to traverse circular lifecycle</span>
            <ChevronDown className="h-3.5 w-3.5 animate-bounce text-emerald-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
