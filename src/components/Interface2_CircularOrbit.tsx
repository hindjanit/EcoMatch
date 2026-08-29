"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  Cpu,
  Search,
  Lock,
  RotateCw,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  MapPin,
  Sparkles,
  ShieldCheck,
  Pause,
  Play,
  Boxes,
} from "lucide-react";

type FlowStage = {
  id: "list" | "analyse" | "match" | "deal" | "reuse";
  number: string;
  shortLabel: string;
  badge: string;
  title: string;
  tagline: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  accent: "emerald" | "sky" | "amber";
  statusText: string;
};

const STAGES: FlowStage[] = [
  {
    id: "list",
    number: "01",
    shortLabel: "LIST",
    badge: "01 · MATERIAL INGESTION",
    title: "Give it another life.",
    tagline: "SELLER CAPTURE IN SECONDS",
    description:
      "Turn unused materials and decommissioned stock into verified opportunities in minutes.",
    ctaText: "Sell a Product",
    ctaHref: "/seller/add-product",
    accent: "emerald",
    statusText: "Ready for AI analysis",
  },
  {
    id: "analyse",
    number: "02",
    shortLabel: "AI ANALYSE",
    badge: "02 · AI MULTI-MODAL SCANNER",
    title: "AI understands the product.",
    tagline: "OPTICAL INSPECTION & VALUATION",
    description:
      "Multi-modal vision scans cosmetic wear, structural grade, and fair market value automatically.",
    ctaText: "Try AI Vision",
    ctaHref: "/ai-classify",
    accent: "sky",
    statusText: "Grade A · ₹2,800 – ₹3,400",
  },
  {
    id: "match",
    number: "03",
    shortLabel: "MATCH",
    badge: "03 · SMART DEMAND MATCHING",
    title: "Find the right buyer.",
    tagline: "NATURAL LANGUAGE PROCUREMENT",
    description:
      "Smart demand matcher pairs verified lots with procurement requirements within optimal transit distance.",
    ctaText: "Explore Smart Match",
    ctaHref: "/ai-match",
    accent: "sky",
    statusText: "94% Match · 4.2 km away",
  },
  {
    id: "deal",
    number: "04",
    shortLabel: "SECURE DEAL",
    badge: "04 · ESCROW DEAL ROOM",
    title: "Deal with more confidence.",
    tagline: "LOCKED ESCROW PROTECTION",
    description:
      "Locked price agreements, verified identities, and escrow protection in encrypted Deal Rooms.",
    ctaText: "Explore Deals",
    ctaHref: "/deals",
    accent: "amber",
    statusText: "Buyer ✓ · Seller ✓ · Locked",
  },
  {
    id: "reuse",
    number: "05",
    shortLabel: "REUSE",
    badge: "05 · CIRCULAR REUSE & PROVENANCE",
    title: "A new owner. A second life.",
    tagline: "DIGITAL PRODUCT PASSPORT",
    description:
      "Safe physical exchange completed, digital provenance sealed, and material recirculated into production.",
    ctaText: "View Ledger",
    ctaHref: "/ledger",
    accent: "emerald",
    statusText: "Ownership Updated ✓ ↻",
  },
];

// Detailed 9-stage model breakdown for the full lifecycle modal
const FULL_LIFECYCLE_STEPS = [
  {
    stage: "01",
    title: "Seller Material Ingestion",
    category: "01 · LIST",
    desc: "Snap a photo of surplus hardware or scrap. Basic specs and GPS coordinates are stored in under 60 seconds.",
    icon: Camera,
  },
  {
    stage: "02",
    title: "AI Multi-Modal Scanner",
    category: "02 · ANALYSE",
    desc: "Gemini Vision sweeps optical geometry, identifying material density, wear grade, and cosmetic condition.",
    icon: Cpu,
  },
  {
    stage: "03",
    title: "Fair Resale Pricing Intelligence",
    category: "02 · ANALYSE",
    desc: "Dynamic benchmarking against Indian market retail indices to compute a fair, transparent price band.",
    icon: Sparkles,
  },
  {
    stage: "04",
    title: "Natural-Language Matcher",
    category: "03 · MATCH",
    desc: "Buyers query needs in conversational English or Hindi; our semantic engine ranks nearby available lots.",
    icon: Search,
  },
  {
    stage: "05",
    title: "3-Pillar Trust Verification",
    category: "03 · MATCH",
    desc: "UIDAI Offline e-KYC signature checks for the person, optical grading for the product, and admin review.",
    icon: ShieldCheck,
  },
  {
    stage: "06",
    title: "Escrow Deal Rooms",
    category: "04 · SECURE DEAL",
    desc: "Encrypted Deal Room with agreed milestone terms, secure chat, and 100% escrow protection under #ECM code.",
    icon: Lock,
  },
  {
    stage: "07",
    title: "Coordinate Synchronization",
    category: "04 · SECURE DEAL",
    desc: "Dual GPS check-in at verified public handover hubs before releasing the physical exchange pass.",
    icon: MapPin,
  },
  {
    stage: "08",
    title: "Anti-Coercion OTP Handover",
    category: "05 · REUSE",
    desc: "Buyer completes 3-point on-site physical inspection and verifies dynamic 6-digit OTP to authorize release.",
    icon: CheckCircle2,
  },
  {
    stage: "09",
    title: "Immutable Provenance Ledger",
    category: "05 · REUSE",
    desc: "Ownership transfer permanently hashed into SHA-256 blockchain ledger block, recording CO₂e offset.",
    icon: RotateCw,
  },
];

export default function Interface2_CircularOrbit() {
  const [activeStep, setActiveStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showLifecycleModal, setShowLifecycleModal] = useState(false);

  // Swipe detection refs
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Auto-play timer (advances every 4.5 seconds unless user interacted)
  useEffect(() => {
    if (!autoPlay) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STAGES.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [autoPlay]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        nextStep();
      } else if (e.key === "ArrowLeft") {
        prevStep();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStep]);

  const selectStage = (index: number) => {
    setActiveStep(index);
    setAutoPlay(false);
    setHasInteracted(true);
  };

  const nextStep = () => {
    setActiveStep((prev) => (prev + 1) % STAGES.length);
    setAutoPlay(false);
    setHasInteracted(true);
  };

  const prevStep = () => {
    setActiveStep((prev) => (prev - 1 + STAGES.length) % STAGES.length);
    setAutoPlay(false);
    setHasInteracted(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        nextStep();
      } else {
        prevStep();
      }
    }
  };

  const currentStage = STAGES[activeStep] || STAGES[0];

  return (
    <section className="relative w-full bg-[#07090e] border-b border-white/10 overflow-hidden min-h-[580px] lg:min-h-[620px] flex flex-col justify-between pt-24 pb-8 sm:pt-28 sm:pb-10">
      {/* Ambient Dynamic Radial Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[550px] w-[550px] sm:h-[700px] sm:w-[700px] rounded-full blur-[140px] transition-all duration-700 opacity-60"
          style={{
            background:
              activeStep === 0
                ? "radial-gradient(circle, rgba(16, 185, 129, 0.14) 0%, transparent 70%)"
                : activeStep === 1
                ? "radial-gradient(circle, rgba(56, 189, 248, 0.16) 0%, transparent 70%)"
                : activeStep === 2
                ? "radial-gradient(circle, rgba(56, 189, 248, 0.14) 0%, rgba(99, 102, 241, 0.08) 60%, transparent 70%)"
                : activeStep === 3
                ? "radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(56, 189, 248, 0.10) 60%, transparent 70%)",
          }}
        />
        <div className="eco-grid absolute inset-0 opacity-20" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col justify-between h-full gap-6 lg:gap-8">
        {/* ========================================================================= */}
        {/* TOP BAR: BADGE & STAGE NAVIGATION DOCK */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 text-xs font-bold text-emerald-300 backdrop-blur-xl shadow-lg">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>THE ECOMATCH LIFECYCLE</span>
            </div>
            <span className="hidden md:inline-block font-mono text-xs text-slate-400">
              Interactive Product Flow · {currentStage.number}/05
            </span>
          </div>

          {/* Desktop Connected Progress Navigation */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0c101a]/90 p-1 backdrop-blur-2xl shadow-xl">
            {STAGES.map((st, idx) => {
              const isCurrent = activeStep === idx;
              const isPast = activeStep > idx;

              return (
                <div key={st.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => selectStage(idx)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-mono font-bold transition-all ${
                      isCurrent
                        ? "bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-105"
                        : isPast
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                    aria-label={`Go to stage ${st.number}: ${st.shortLabel}`}
                  >
                    <span>{st.number}</span>
                    <span>{st.shortLabel}</span>
                    {isPast && <CheckCircle2 className="h-3 w-3 text-emerald-400 ml-0.5" />}
                  </button>

                  {idx < STAGES.length - 1 && (
                    <div
                      className={`mx-1 h-0.5 w-3 lg:w-5 rounded-full transition-colors ${
                        idx < activeStep ? "bg-emerald-400/80" : "bg-white/15"
                      }`}
                    />
                  )}
                </div>
              );
            })}

            {/* Subtle Autoplay Toggle */}
            <button
              type="button"
              onClick={() => {
                setAutoPlay(!autoPlay);
                setHasInteracted(true);
              }}
              className="ml-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition"
              title={autoPlay ? "Pause Auto-Flow" : "Play Auto-Flow"}
              aria-label={autoPlay ? "Pause auto play" : "Start auto play"}
            >
              {autoPlay ? (
                <Pause className="h-3 w-3 text-amber-400" />
              ) : (
                <Play className="h-3 w-3 text-emerald-400" />
              )}
            </button>
          </div>

          {/* Mobile Connected Stage Indicator (< 640px) */}
          <div className="flex sm:hidden items-center justify-between w-full bg-[#0c101a]/80 border border-white/10 rounded-2xl p-2">
            <div className="flex items-center gap-1.5">
              {STAGES.map((st, idx) => {
                const isCurrent = activeStep === idx;
                const isPast = activeStep > idx;

                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => selectStage(idx)}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-mono font-bold transition-all ${
                      isCurrent
                        ? "bg-emerald-400 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-110"
                        : isPast
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-white/5 text-slate-400 hover:text-white"
                    }`}
                    aria-label={`Stage ${st.number}`}
                  >
                    {isPast ? "✓" : st.number}
                  </button>
                );
              })}
            </div>

            <span className="font-mono text-xs font-bold text-emerald-400 tracking-wider pr-1">
              {currentStage.number} · {currentStage.shortLabel}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN 2-COLUMN HERO VIEWPORT */}
        {/* ========================================================================= */}
        <div className="grid gap-8 lg:grid-cols-12 items-center my-auto">
          {/* Left Column: Stage Editorial & Contextual CTA (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col justify-center text-left">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                {currentStage.badge}
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight transition-all duration-300">
              {currentStage.title}
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base max-w-lg transition-all duration-300">
              {currentStage.description}
            </p>

            {/* Interactive Flow CTAs & Stage Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={currentStage.ctaHref}
                className="flex items-center gap-2 rounded-2xl bg-emerald-400 px-5 sm:px-6 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all hover:bg-emerald-300 hover:scale-105 active:scale-95"
              >
                <span>{currentStage.ctaText}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              {/* Prev / Next Step Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#0c101a] text-slate-300 hover:bg-white/10 hover:text-white transition active:scale-95 shadow-md"
                  title="Previous Stage (←)"
                  aria-label="Previous stage"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={nextStep}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#0c101a] text-slate-300 hover:bg-white/10 hover:text-white transition active:scale-95 shadow-md"
                  title="Next Stage (→)"
                  aria-label="Next stage"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Small Full Lifecycle Modal Link */}
              <button
                type="button"
                onClick={() => setShowLifecycleModal(true)}
                className="text-xs text-sky-400 hover:text-sky-300 font-mono underline transition ml-auto sm:ml-2"
              >
                View complete lifecycle ↺
              </button>
            </div>

            {/* Mobile swipe helper hint (fades after first interaction) */}
            {!hasInteracted && (
              <p className="mt-3 text-[11px] font-mono text-slate-500 flex items-center gap-1 sm:hidden">
                <span>Swipe left / right to explore stages</span>
                <ArrowRight className="h-3 w-3 animate-pulse text-emerald-400" />
              </p>
            )}
          </div>

          {/* Right Column: Premium "Product Journey Card" (7 cols on lg) */}
          <div
            className="lg:col-span-7 flex items-center justify-center w-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="relative w-full max-w-[480px] lg:max-w-[540px] rounded-3xl border border-white/15 bg-gradient-to-b from-[#101524]/95 via-[#0c101a]/95 to-[#07090e]/98 p-5 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-3xl transition-all duration-500 overflow-hidden">
              {/* Card Header: Product Identifier & Stage Status */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-emerald-400">
                    <Boxes className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-none">
                      Anodized Aluminium Alloy Lot
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5 text-sky-400" />
                      Sector 62, Noida · Lot #ECM-AL704
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-mono font-bold border transition-colors ${
                    activeStep === 0
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : activeStep === 1
                      ? "border-sky-500/30 bg-sky-500/10 text-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.2)]"
                      : activeStep === 2
                      ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                      : activeStep === 3
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  }`}
                >
                  {currentStage.statusText}
                </span>
              </div>

              {/* =================================================================== */}
              {/* CENTRAL PERSISTENT PRODUCT OBJECT & DYNAMIC STAGE TRANSFORMATION */}
              {/* =================================================================== */}
              <div className="relative my-4 sm:my-6 flex min-h-[210px] sm:min-h-[230px] items-center justify-center rounded-2xl border border-white/10 bg-[#040810]/70 p-4 overflow-hidden">
                {/* --------------------------------------------------------------- */}
                {/* STAGE 01: LIST (Raw Listing + Camera Viewfinder) */}
                {/* --------------------------------------------------------------- */}
                {activeStep === 0 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    {/* Viewfinder corner indicators */}
                    <div className="absolute inset-2 pointer-events-none">
                      <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-emerald-400" />
                      <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-emerald-400" />
                      <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-emerald-400" />
                      <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-emerald-400" />
                    </div>

                    {/* Central Product Asset Illustration */}
                    <div className="relative h-20 w-20 sm:h-24 sm:w-24 drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] animate-float-levitate">
                      <svg
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-full w-full"
                      >
                        <rect
                          x="18"
                          y="22"
                          width="64"
                          height="56"
                          rx="12"
                          fill="url(#alloyGrad_01)"
                          stroke="#64748b"
                          strokeWidth="2"
                        />
                        <line x1="28" y1="36" x2="72" y2="36" stroke="#475569" strokeWidth="2" />
                        <line x1="28" y1="50" x2="72" y2="50" stroke="#475569" strokeWidth="2" />
                        <line x1="28" y1="64" x2="52" y2="64" stroke="#475569" strokeWidth="2" />
                        <circle cx="68" cy="64" r="4" fill="#10b981" className="animate-pulse" />
                        <defs>
                          <linearGradient
                            id="alloyGrad_01"
                            x1="18"
                            y1="22"
                            x2="82"
                            y2="78"
                            gradientUnits="userSpaceOnUse"
                          >
                            <stop stopColor="#334155" />
                            <stop offset="0.6" stopColor="#1e293b" />
                            <stop offset="1" stopColor="#0f172a" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <span className="mt-3 font-mono text-xs font-bold text-slate-200">
                      Seller Camera Ingestion
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Photo captured · Location tag verified
                    </span>
                  </div>
                )}

                {/* --------------------------------------------------------------- */}
                {/* STAGE 02: AI ANALYSE (Laser Sweep + Optical Extraction Chips) */}
                {/* --------------------------------------------------------------- */}
                {activeStep === 1 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    {/* Laser Sweep Scan Area */}
                    <div className="laser-sweep relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl border border-sky-400/60 bg-[#061424] p-2 shadow-[0_0_35px_rgba(56,189,248,0.35)]">
                      <svg
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-full w-full"
                      >
                        <rect
                          x="18"
                          y="22"
                          width="64"
                          height="56"
                          rx="12"
                          fill="url(#alloyGrad_02)"
                          stroke="#38bdf8"
                          strokeWidth="2"
                        />
                        <line x1="28" y1="36" x2="72" y2="36" stroke="#0284c7" strokeWidth="2" />
                        <line x1="28" y1="50" x2="72" y2="50" stroke="#0284c7" strokeWidth="2" />
                        <circle cx="68" cy="64" r="4" fill="#38bdf8" className="animate-ping" />
                        <defs>
                          <linearGradient
                            id="alloyGrad_02"
                            x1="18"
                            y1="22"
                            x2="82"
                            y2="78"
                            gradientUnits="userSpaceOnUse"
                          >
                            <stop stopColor="#0f172a" />
                            <stop offset="0.6" stopColor="#0369a1" />
                            <stop offset="1" stopColor="#0c4a6e" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    {/* AI Extraction Chips */}
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 max-w-sm">
                      <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-300">
                        Aluminium Alloy 6061
                      </span>
                      <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                        Grade A (Good Condition)
                      </span>
                      <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-300">
                        Fair: ₹2,800 – ₹3,400
                      </span>
                    </div>
                  </div>
                )}

                {/* --------------------------------------------------------------- */}
                {/* STAGE 03: MATCH (Product ➔ AI Match ➔ Verified Buyer) */}
                {/* --------------------------------------------------------------- */}
                {activeStep === 2 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    <div className="flex items-center justify-center gap-2 sm:gap-3 w-full">
                      {/* Product Lot Card */}
                      <div className="flex flex-col items-center rounded-2xl border border-sky-500/40 bg-sky-500/10 p-2.5 sm:p-3 w-28 sm:w-32 shadow-lg">
                        <Boxes className="h-5 w-5 text-sky-400 mb-1" />
                        <span className="text-[10px] font-bold text-white truncate">Aluminium Lot</span>
                        <span className="text-[9px] font-mono text-slate-400">Seller #S-910</span>
                      </div>

                      {/* Animated Match Beam */}
                      <div className="flex flex-col items-center px-1">
                        <span className="rounded-full border border-sky-400/50 bg-sky-400/20 px-2 py-0.5 text-[9px] font-mono font-black text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.4)]">
                          94% MATCH
                        </span>
                        <div className="my-1 h-1 w-12 sm:w-16 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full w-1/2 bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full animate-beam-pulse" />
                        </div>
                        <span className="text-[8px] font-mono text-slate-400">4.2 km Radius</span>
                      </div>

                      {/* Buyer Requisition Card */}
                      <div className="flex flex-col items-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-2.5 sm:p-3 w-28 sm:w-32 shadow-lg">
                        <Search className="h-5 w-5 text-emerald-400 mb-1" />
                        <span className="text-[10px] font-bold text-white truncate">CNC Workshop</span>
                        <span className="text-[9px] font-mono text-emerald-300">Buyer Verified ✓</span>
                      </div>
                    </div>

                    <span className="mt-3 font-mono text-xs font-bold text-sky-300">
                      PRODUCT ➔ SMART MATCH ➔ BUYER
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Query: "Anodized aluminium scrap in Noida"
                    </span>
                  </div>
                )}

                {/* --------------------------------------------------------------- */}
                {/* STAGE 04: SECURE DEAL (Escrow Lock + Dual Verified Identities) */}
                {/* --------------------------------------------------------------- */}
                {activeStep === 3 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.35)] animate-shield-pulse">
                      <Lock className="h-7 w-7 text-amber-400" />
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-black text-amber-300">
                        DEAL #ECM-28471
                      </span>
                      <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                        ₹2,950 ESCROW
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-300">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Seller Verified
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Buyer Verified
                      </span>
                    </div>
                  </div>
                )}

                {/* --------------------------------------------------------------- */}
                {/* STAGE 05: REUSE (Circular Lifecycle + Provenance Sealed) */}
                {/* --------------------------------------------------------------- */}
                {activeStep === 4 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/60 bg-gradient-to-br from-emerald-500/30 to-sky-500/20 text-emerald-300 shadow-[0_0_35px_rgba(16,185,129,0.45)]">
                      <RotateCw
                        className="h-7 w-7 text-emerald-300 animate-spin"
                        style={{ animationDuration: "4s" }}
                      />
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                        Exchange Confirmed ✓
                      </span>
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                        Ownership Transferred ✓
                      </span>
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                        Product Reused ↻
                      </span>
                    </div>

                    <span className="mt-2 font-mono text-[10px] text-emerald-400/90">
                      Ledger Block #042 Sealed · -14.6 kg CO₂e Offset
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer: Live Milestone Indicator */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span className="font-mono text-[11px]">
                  Milestone {currentStage.number} of 05
                </span>
                <span className="text-[11px] font-bold text-emerald-400">
                  {activeStep === 4 ? "Full Loop Complete ↺" : "Next Milestone →"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM METRICS & SUSTAINABILITY IMPACT STRIP */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400 font-mono gap-2">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>CO₂e Avoided: 1,480+ Tonnes</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              <span>Verified Nodes: 342 Active</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">Use arrows (← →) or click milestones</span>
            <a
              href="#experience"
              className="flex items-center gap-1 font-bold text-emerald-400 hover:text-emerald-300 transition"
            >
              <span>Explore Marketplace</span>
              <ArrowDownIcon className="h-3.5 w-3.5 animate-bounce" />
            </a>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COMPLETE 9-STAGE LIFECYCLE BREAKDOWN MODAL */}
      {/* ========================================================================= */}
      {showLifecycleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl animate-in fade-in"
          onClick={() => setShowLifecycleModal(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/15 bg-[#0c101a] p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-mono font-bold text-emerald-400">
                COMPLETE ECOMATCH ARCHITECTURE
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-black text-white">
                From Unused to <span className="text-emerald-400">Useful Again</span>
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-xs text-slate-400">
                The full 9-step cryptographic, optical, and escrow protocol that governs every
                exchange.
              </p>
            </div>

            {/* 9 Steps Grid */}
            <div className="mt-6 grid gap-3 sm:grid-cols-3 text-xs">
              {FULL_LIFECYCLE_STEPS.map((step) => {
                const IconComp = step.icon;
                return (
                  <div
                    key={step.stage}
                    className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#06080c] p-3.5 text-left hover:border-emerald-500/30 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                          {step.stage}
                        </span>
                        <IconComp className="h-4 w-4 text-slate-400" />
                      </div>
                      <h4 className="mt-2 text-xs font-bold text-white">{step.title}</h4>
                      <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{step.desc}</p>
                    </div>
                    <span className="mt-3 font-mono text-[9px] text-emerald-400/80">
                      {step.category}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/marketplace"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-2.5 text-xs font-black text-slate-950 shadow-lg hover:bg-emerald-300 transition"
              >
                Browse Marketplace <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setShowLifecycleModal(false)}
                className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition"
              >
                Close Lifecycle Map
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowLifecycleModal(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ArrowDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}
