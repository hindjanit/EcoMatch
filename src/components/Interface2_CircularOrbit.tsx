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
  Camera,
  Search,
  Handshake,
  QrCode,
  FileCheck,
  CircleDollarSign,
  Play,
  Pause,
  Repeat,
} from "lucide-react";

type StageInfo = {
  id: string;
  number: string;
  stageBadge: string;
  title: string;
  tagline: string;
  description: string;
  cardTilt: {
    rotateX: number;
    rotateY: number;
  };
  metrics: { label: string; value: string; isHighlight?: boolean }[];
  ctaText: string;
  ctaHref: string;
};

const stages: StageInfo[] = [
  {
    id: "list",
    number: "01",
    stageBadge: "01 · SELLER ONBOARDING",
    title: "Give It Another Life.",
    tagline: "MATERIAL & ASSET INGESTION",
    description:
      "Capture what you no longer need. Snap a photo of your unused tech or surplus material, enter basic details and location, and EcoMatch prepares a verified listing in under 60 seconds.",
    cardTilt: { rotateX: 4, rotateY: -6 },
    metrics: [
      { label: "Product", value: "MX Wireless Mouse" },
      { label: "Source", value: "Office Equipment" },
      { label: "Initial Status", value: "Photo Ingestion", isHighlight: true },
    ],
    ctaText: "Sell a Product",
    ctaHref: "/seller/add-product",
  },
  {
    id: "ai-vision",
    number: "02",
    stageBadge: "02 · AI MULTI-MODAL SCANNER",
    title: "AI Understands the Product.",
    tagline: "NEURAL OPTICAL FEATURE EXTRACTION",
    description:
      "EcoMatch Vision sweeps the optical geometry, recognizing brand, model, cosmetic wear, and technical specs automatically. Sellers don't need to manually classify everything.",
    cardTilt: { rotateX: -3, rotateY: 6 },
    metrics: [
      { label: "Identified", value: "Precision Laser Mouse" },
      { label: "Condition", value: "Grade A (94% Integrity)" },
      { label: "AI Confidence", value: "96.8% Multi-Modal", isHighlight: true },
    ],
    ctaText: "Try AI Vision Studio",
    ctaHref: "/ai-classify",
  },
  {
    id: "price-intelligence",
    number: "03",
    stageBadge: "03 · FAIR RESALE INTELLIGENCE",
    title: "Know What It’s Actually Worth.",
    tagline: "DYNAMIC MARKET BENCHMARKING",
    description:
      "EcoMatch researches live Indian new-retail price indices and combines product age and physical condition to generate a transparent, fair resale range rather than blind MRP guesses.",
    cardTilt: { rotateX: 5, rotateY: -4 },
    metrics: [
      { label: "New Market Ref", value: "₹5,999" },
      { label: "Fair Used Band", value: "₹2,800 – ₹3,400" },
      { label: "Seller Asking", value: "₹2,950 (Fair Price ✓)", isHighlight: true },
    ],
    ctaText: "Inspect Pricing Engine",
    ctaHref: "/ai-classify",
  },
  {
    id: "discover-match",
    number: "04",
    stageBadge: "04 · NATURAL LANGUAGE PROCUREMENT",
    title: "Find What Actually Fits.",
    tagline: "SEMANTIC REQUISITION MATCHING",
    description:
      "Buyers describe material or hardware requirements in conversational English or Hindi. Our AI indexes catalog semantics in real-time, ranking lots by technical fit, price, and route distance.",
    cardTilt: { rotateX: -4, rotateY: 4 },
    metrics: [
      { label: "Buyer Query", value: "Wireless mouse near Noida" },
      { label: "Match Score", value: "94% Semantic Fit", isHighlight: true },
      { label: "Route Distance", value: "4.2 km Transit" },
    ],
    ctaText: "Open Smart Matcher",
    ctaHref: "/ai-match",
  },
  {
    id: "verify",
    number: "05",
    stageBadge: "05 · 3-PILLAR TRUST PROTOCOL",
    title: "Trust Starts Before the Deal.",
    tagline: "PERSON, PRODUCT & LISTING SECURITY",
    description:
      "Trust is anchored across 3 layers: UIDAI Offline e-KYC signature checks for the person, optical defect heatmaps for the product, and deterministic verification before marketplace approval.",
    cardTilt: { rotateX: 3, rotateY: -5 },
    metrics: [
      { label: "Person Trust", value: "UIDAI e-KYC Verified" },
      { label: "Product Seal", value: "Defect Map Clean" },
      { label: "Listing Grade", value: "Admin Verified ✓", isHighlight: true },
    ],
    ctaText: "Verify Identity",
    ctaHref: "/verify-identity",
  },
  {
    id: "secure-deal",
    number: "06",
    stageBadge: "06 · ESCROW DEAL ROOM",
    title: "Interested? Create a Secure Deal.",
    tagline: "ENCRYPTED TRANSACTION LOCK",
    description:
      "Instead of unsafe chat app meetups, buyer and seller enter an encrypted Deal Room with locked price, terms, and escrow protection under a unique transaction code.",
    cardTilt: { rotateX: -3, rotateY: 5 },
    metrics: [
      { label: "Deal Room ID", value: "#ECM-28471" },
      { label: "Agreed Escrow", value: "₹2,950 Locked", isHighlight: true },
      { label: "Protection", value: "100% Escrow Guard" },
    ],
    ctaText: "Explore Deal Rooms",
    ctaHref: "/deals",
  },
  {
    id: "safe-meeting",
    number: "07",
    stageBadge: "07 · COORDINATE SYNCHRONIZATION",
    title: "From Online Deal to Safer Meeting.",
    tagline: "PHYSICAL CHECK-IN VERIFICATION",
    description:
      "Parties agree on safe public meeting coordinates and time. Both buyer and seller check in via GPS upon arrival before the physical handover pass is unlocked.",
    cardTilt: { rotateX: 4, rotateY: -4 },
    metrics: [
      { label: "Handover Hub", value: "Verified Logistics Point" },
      { label: "Seller Status", value: "Checked-In ✓" },
      { label: "Buyer Status", value: "Checked-In ✓", isHighlight: true },
    ],
    ctaText: "Check Safe Protocol",
    ctaHref: "/deals",
  },
  {
    id: "verified-exchange",
    number: "08",
    stageBadge: "08 · SECURE HANDOVER PROTOCOL",
    title: "The Deal Ends Only When the Product Changes Hands.",
    tagline: "ANTI-COERCION OTP RELEASE",
    description:
      "Seller presents a dynamic 6-digit handover OTP. Buyer inspects physical condition, completes the 3-point checklist, and verifies the OTP to authorize escrow release.",
    cardTilt: { rotateX: -4, rotateY: 5 },
    metrics: [
      { label: "Handover Token", value: "OTP: 849-210", isHighlight: true },
      { label: "On-Site Check", value: "3-Point Pass ✓" },
      { label: "Handover State", value: "Dual Confirmed" },
    ],
    ctaText: "Inspect Deal Flow",
    ctaHref: "/deals",
  },
  {
    id: "ownership-reuse",
    number: "09",
    stageBadge: "09 · DIGITAL PRODUCT PASSPORT",
    title: "The Product Moves. Its Story Continues.",
    tagline: "IMMUTABLE SHA-256 PROVENANCE",
    description:
      "Ownership transfer is permanently hashed onto the EcoMatch provenance ledger. The product receives an extended second life, diverting electronic waste and preventing carbon emissions.",
    cardTilt: { rotateX: 0, rotateY: 0 },
    metrics: [
      { label: "Ledger Block", value: "#042 Minted & Sealed", isHighlight: true },
      { label: "CO₂e Avoided", value: "-14.6 kg Offset" },
      { label: "Ecosystem Loop", value: "Story Continues ↺" },
    ],
    ctaText: "View Provenance Ledger",
    ctaHref: "/ledger",
  },
];

// Precomputed exact integer coordinates for 9 orbital nodes around Radius 165px
const orbitalNodeCoordinates = [
  { x: 0, y: -165 },
  { x: 106, y: -126 },
  { x: 162, y: -29 },
  { x: 143, y: 82 },
  { x: 56, y: 155 },
  { x: -56, y: 155 },
  { x: -143, y: 82 },
  { x: -162, y: -29 },
  { x: -106, y: -126 },
];

export default function Interface2_CircularOrbit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

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

      const stepIndex = Math.min(8, Math.floor(progress * 9));
      setActiveStep(stepIndex);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard arrow controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        nextStep();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        prevStep();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStep]);

  // Auto-play timer
  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        const next = (prev + 1) % 9;
        if (!containerRef.current) return next;
        const windowH = window.innerHeight || 800;
        const totalScrollable = containerRef.current.offsetHeight - windowH;
        const targetY = containerRef.current.offsetTop + (next / 8.5) * totalScrollable;
        window.scrollTo({ top: targetY, behavior: "smooth" });
        return next;
      });
    }, 3200);

    return () => clearInterval(interval);
  }, [autoPlay]);

  const jumpToStage = (index: number) => {
    setActiveStep(index);
    if (!containerRef.current) return;
    const windowH = window.innerHeight || 800;
    const totalScrollable = containerRef.current.offsetHeight - windowH;
    const targetY = containerRef.current.offsetTop + (index / 8.5) * totalScrollable;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  const nextStep = () => jumpToStage(Math.min(8, activeStep + 1));
  const prevStep = () => jumpToStage(Math.max(0, activeStep - 1));

  const skipTour = () => {
    if (!containerRef.current) return;
    const experienceElem = document.getElementById("experience");
    if (experienceElem) {
      experienceElem.scrollIntoView({ behavior: "smooth" });
    } else {
      const targetY = containerRef.current.offsetTop + containerRef.current.offsetHeight;
      window.scrollTo({ top: targetY, behavior: "smooth" });
    }
  };

  const currentStage = stages[activeStep] || stages[0];

  return (
    <div ref={containerRef} className="relative h-[750vh] w-full bg-[#07090e]">
      {/* Sticky Cinematic Viewport Stage */}
      <div className="sticky top-0 flex h-screen w-full flex-col justify-between overflow-hidden px-4 pt-20 pb-3 sm:px-8 sm:pt-24">
        {/* Ambient Radial Glow Lighting */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[750px] w-[750px] rounded-full blur-[160px] transition-all duration-1000"
            style={{
              background:
                activeStep === 0
                  ? "radial-gradient(circle, rgba(148, 163, 184, 0.09) 0%, transparent 70%)"
                  : activeStep === 1
                  ? "radial-gradient(circle, rgba(56, 189, 248, 0.14) 0%, transparent 70%)"
                  : activeStep === 2
                  ? "radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)"
                  : activeStep === 3
                  ? "radial-gradient(circle, rgba(99, 102, 241, 0.13) 0%, transparent 70%)"
                  : activeStep === 4
                  ? "radial-gradient(circle, rgba(56, 189, 248, 0.13) 0%, rgba(16, 185, 129, 0.08) 60%, transparent 70%)"
                  : activeStep === 5
                  ? "radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)"
                  : activeStep === 6
                  ? "radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)"
                  : activeStep === 7
                  ? "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(56, 189, 248, 0.16) 0%, rgba(16, 185, 129, 0.12) 60%, transparent 70%)",
            }}
          />
          <div className="eco-grid absolute inset-0 opacity-20" />
        </div>

        {/* ========================================================= */}
        {/* TOP STATUS BAR & 9-STAGE ORBITAL PROGRESS DOCK */}
        {/* ========================================================= */}
        <div className="relative z-30 mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-7 items-center gap-2 rounded-full border border-white/10 bg-[#0c101a]/90 px-3.5 text-xs font-semibold text-slate-300 backdrop-blur-xl shadow-lg">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>THE ECOMATCH LIFECYCLE</span>
            </div>
            <span className="hidden font-mono text-xs text-slate-400 md:inline">
              STAGE {currentStage.number} OF 09 · CONTINUOUS PRODUCT JOURNEY
            </span>
          </div>

          {/* Stepper Navigation Dock (9 Compact Pills) */}
          <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-[#0c101a]/90 p-1 backdrop-blur-2xl shadow-xl">
            {stages.map((stage, idx) => {
              const isActive = activeStep === idx;
              const isPast = activeStep > idx;

              return (
                <button
                  key={stage.id}
                  onClick={() => jumpToStage(idx)}
                  className={`flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-1 text-[11px] font-mono transition-all ${
                    isActive
                      ? "bg-white text-slate-950 font-bold shadow-md scale-105"
                      : isPast
                      ? "text-emerald-400 hover:text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title={stage.title}
                >
                  <span className="text-[10px] opacity-75">{stage.number}</span>
                  <span className="hidden lg:inline">{stage.id.toUpperCase().slice(0, 4)}</span>
                </button>
              );
            })}

            {/* Auto Play Button */}
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className="ml-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 transition"
              title={autoPlay ? "Pause Auto-Tour" : "Play Guided Tour"}
            >
              {autoPlay ? <Pause className="h-3 w-3 text-amber-400" /> : <Play className="h-3 w-3 text-emerald-400" />}
            </button>

            {/* Skip Button */}
            <button
              onClick={skipTour}
              className="ml-1.5 flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 sm:px-3 py-1 text-xs font-bold text-slate-200 hover:bg-white hover:text-slate-950 transition shadow-sm"
              title="Skip intro slides and jump directly to marketplace"
            >
              <span>Skip</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN 2-COLUMN VIEWPORT STAGE */}
        {/* ========================================================= */}
        <div className="relative z-10 mx-auto my-auto flex flex-col md:flex-row items-center justify-between gap-6 lg:gap-12 w-full max-w-7xl">
          {/* Left Column: Editorial Storytelling Typography */}
          <div className="w-full md:w-1/2 flex flex-col justify-center text-left">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                {currentStage.stageBadge}
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl transition-all duration-500 leading-tight">
              {currentStage.title}
            </h1>

            <p className="mt-2.5 text-xs leading-relaxed text-slate-300 sm:text-sm max-w-xl transition-all duration-500">
              {currentStage.description}
            </p>

            {/* Real-time Dynamic Telemetry Bento */}
            <div className="mt-4 grid grid-cols-3 gap-2.5 max-w-lg">
              {currentStage.metrics.map((m) => (
                <div
                  key={m.label}
                  className={`rounded-2xl border p-2.5 sm:p-3 backdrop-blur-xl shadow-lg transition-all ${
                    m.isHighlight
                      ? "border-emerald-400/40 bg-emerald-500/10"
                      : "border-white/10 bg-[#0c101a]/90"
                  }`}
                >
                  <p className="text-[9px] uppercase font-bold text-slate-400">{m.label}</p>
                  <p className={`mt-1 truncate text-xs font-bold ${m.isHighlight ? "text-emerald-300" : "text-white"}`}>
                    {m.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Quick Action Button & Navigation */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={currentStage.ctaHref}
                className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition hover:bg-emerald-300 hover:scale-105"
              >
                {currentStage.ctaText} <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              {/* Step Controls */}
              <div className="flex items-center gap-1 ml-auto sm:ml-0">
                <button
                  onClick={prevStep}
                  disabled={activeStep === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-30"
                  title="Previous Stage (←)"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextStep}
                  disabled={activeStep === 8}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-30"
                  title="Next Stage (→)"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => setShowSummaryModal(true)}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-mono underline"
              >
                View Full Model Loop ↺
              </button>
            </div>
          </div>

          {/* Right Column: Persistent 3D Object Experience Hub */}
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
              {/* CENTER HUB: ONE PERSISTENT CONTINUOUS ASSET */}
              {/* ======================================================= */}
              <div
                className="relative z-10 flex h-60 w-60 sm:h-68 sm:w-68 items-center justify-center rounded-[36px] border border-white/15 bg-gradient-to-b from-[#101524]/95 via-[#0c101a]/95 to-[#07090e]/98 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-3xl transition-all duration-500 overflow-hidden"
                style={{
                  transform: `rotateX(${currentStage.cardTilt.rotateX}deg) rotateY(${currentStage.cardTilt.rotateY}deg)`,
                }}
              >
                {/* 01. LIST: SELLER SNAPSHOT + VIEW مغ Finder */}
                {activeStep === 0 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    {/* Viewfinder reticle overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-emerald-400" />
                      <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-emerald-400" />
                      <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-emerald-400" />
                      <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-emerald-400" />
                    </div>

                    {/* Persistent Product: Precision Ergonomic Wireless Unit */}
                    <div className="relative h-20 w-20 sm:h-24 sm:w-24 drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] animate-float-levitate">
                      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                        <path d="M50 12C35 12 24 25 24 45C24 68 35 88 50 88C65 88 76 68 76 45C76 25 65 12 50 12Z" fill="url(#mouseGrad_01)" stroke="#475569" strokeWidth="2" />
                        <line x1="50" y1="14" x2="50" y2="44" stroke="#334155" strokeWidth="2" />
                        <rect x="46" y="24" width="8" height="14" rx="4" fill="#64748b" stroke="#94a3b8" strokeWidth="1.2" />
                        <circle cx="50" cy="55" r="3" fill="#10b981" className="animate-pulse" />
                        <defs>
                          <linearGradient id="mouseGrad_01" x1="24" y1="12" x2="76" y2="88" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#1e293b" />
                            <stop offset="0.6" stopColor="#0f172a" />
                            <stop offset="1" stopColor="#020617" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <span className="mt-2 font-mono text-[10px] sm:text-[11px] font-bold text-slate-300">
                      SELLER CAMERA INGESTION
                    </span>
                    <span className="text-[10px] text-slate-400">MX Master Wireless Unit</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300">
                      <Camera className="h-3 w-3 text-emerald-400" />
                      Awaiting AI Inspection
                    </span>
                  </div>
                )}

                {/* 02. AI VISION: ACTIVE LASER SCAN + EXTRACTED SPEC LABELS */}
                {activeStep === 1 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    {/* Laser Scanning Overlay */}
                    <div className="laser-sweep relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl border border-sky-400/60 bg-[#061322] p-2 shadow-[0_0_30px_rgba(56,189,248,0.35)]">
                      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                        <path d="M50 12C35 12 24 25 24 45C24 68 35 88 50 88C65 88 76 68 76 45C76 25 65 12 50 12Z" fill="url(#mouseGrad_02)" stroke="#38bdf8" strokeWidth="2" />
                        <line x1="50" y1="14" x2="50" y2="44" stroke="#0284c7" strokeWidth="2" />
                        <rect x="46" y="24" width="8" height="14" rx="4" fill="#38bdf8" stroke="#7dd3fc" strokeWidth="1.2" />
                        <circle cx="50" cy="55" r="3" fill="#38bdf8" className="animate-ping" />
                        <defs>
                          <linearGradient id="mouseGrad_02" x1="24" y1="12" x2="76" y2="88" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#0f172a" />
                            <stop offset="0.6" stopColor="#0369a1" />
                            <stop offset="1" stopColor="#0c4a6e" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <span className="mt-2 font-mono text-[10px] sm:text-[11px] font-bold text-sky-300">
                      NEURAL GEOMETRY SWEEP
                    </span>
                    <span className="text-[10px] text-slate-300">Optical Sensor · Bluetooth Dual</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/15 px-2.5 py-0.5 text-[9px] font-bold text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                      <Cpu className="h-3 w-3 text-sky-400" />
                      Grade A (94% Integrity)
                    </span>
                  </div>
                )}

                {/* 03. PRICE INTELLIGENCE: FAIR PRICE GAUGE & MARKET COMPARISON */}
                {activeStep === 2 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    <div className="rounded-2xl border border-emerald-400/40 bg-black/60 p-3.5 shadow-xl w-full max-w-[210px]">
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                        <span>NEW: ₹5,999</span>
                        <span className="text-emerald-400 font-bold">FAIR: ₹2.8k-3.4k</span>
                      </div>
                      <div className="relative my-2 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="absolute inset-y-0 left-[35%] right-[25%] bg-emerald-400/50 rounded-full" />
                        <div className="absolute top-0 bottom-0 left-[48%] w-1.5 bg-white shadow-[0_0_8px_#ffffff]" />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Seller Price:</span>
                        <span className="text-emerald-300 font-black">₹2,950</span>
                      </div>
                    </div>

                    <span className="mt-2 font-mono text-[10px] sm:text-[11px] font-bold text-emerald-300">
                      FAIR VALUE INTELLIGENCE
                    </span>
                    <span className="text-[10px] text-slate-300">Depreciation Benchmarked</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300">
                      <CircleDollarSign className="h-3 w-3 text-emerald-400" />
                      Verified Fair Resale ✓
                    </span>
                  </div>
                )}

                {/* 04. DISCOVER & MATCH: NLP DEMAND RADAR SYNC */}
                {activeStep === 3 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 flex-col items-center justify-center rounded-xl border border-sky-400/60 bg-sky-500/20 text-sky-300">
                        <Search className="h-4 w-4" />
                        <span className="text-[7px] font-bold">BUYER</span>
                      </div>

                      <div className="flex flex-col items-center px-1">
                        <span className="rounded-full border border-indigo-400/40 bg-indigo-500/30 px-2 py-0.5 text-[8px] font-mono font-bold text-indigo-300">
                          94% MATCH
                        </span>
                        <div className="my-1 h-1 w-12 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full w-1/2 bg-gradient-to-r from-sky-400 to-indigo-400 rounded-full animate-beam-pulse" />
                        </div>
                        <span className="text-[8px] font-mono text-slate-400">4.2 km Radius</span>
                      </div>

                      <div className="flex h-10 w-10 flex-col items-center justify-center rounded-xl border border-emerald-400/60 bg-emerald-500/20 text-emerald-300">
                        <Boxes className="h-4 w-4" />
                        <span className="text-[7px] font-bold">ASSET</span>
                      </div>
                    </div>

                    <span className="mt-2 font-mono text-[10px] sm:text-[11px] font-bold text-indigo-300">
                      SEMANTIC REQUISITION SYNC
                    </span>
                    <span className="text-[10px] text-slate-300">"Wireless mouse near Noida"</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-indigo-400/40 bg-indigo-500/20 px-2.5 py-0.5 text-[9px] font-bold text-indigo-300">
                      <Sparkles className="h-3 w-3 text-indigo-400" />
                      Top Recommended Candidate
                    </span>
                  </div>
                )}

                {/* 05. VERIFY: 3-PILLAR CRYPTOGRAPHIC TRUST SHIELD */}
                {activeStep === 4 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center rounded-xl border border-sky-400/40 bg-sky-500/10 p-2 text-center w-14">
                        <Fingerprint className="h-4 w-4 text-sky-400 mb-1" />
                        <span className="text-[8px] font-bold text-sky-300">PERSON</span>
                        <span className="text-[7px] text-slate-400">UIDAI</span>
                      </div>
                      <div className="flex flex-col items-center rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-2 text-center w-14">
                        <Cpu className="h-4 w-4 text-emerald-400 mb-1" />
                        <span className="text-[8px] font-bold text-emerald-300">PRODUCT</span>
                        <span className="text-[7px] text-slate-400">Vision</span>
                      </div>
                      <div className="flex flex-col items-center rounded-xl border border-amber-400/40 bg-amber-500/10 p-2 text-center w-14">
                        <FileCheck className="h-4 w-4 text-amber-400 mb-1" />
                        <span className="text-[8px] font-bold text-amber-300">LISTING</span>
                        <span className="text-[7px] text-slate-400">Approved</span>
                      </div>
                    </div>

                    <span className="mt-2 font-mono text-[10px] sm:text-[11px] font-bold text-emerald-300">
                      3-PILLAR TRUST PROTOCOL
                    </span>
                    <span className="text-[10px] text-slate-300">Zero Impersonation Risk</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300">
                      <ShieldCheck className="h-3 w-3 text-emerald-400" />
                      Pre-Deal Verified 100%
                    </span>
                  </div>
                )}

                {/* 06. SECURE DEAL: ENCRYPTED ESCROW LOCK */}
                {activeStep === 5 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.35)] animate-shield-pulse">
                      <Lock className="h-8 w-8 text-amber-400" />
                      <div className="pointer-events-none absolute -inset-2 rounded-2xl border border-amber-400/30 animate-ping opacity-25" />
                    </div>

                    <span className="mt-2 font-mono text-sm font-black text-amber-300 tracking-wider">
                      DEAL #ECM-28471
                    </span>
                    <span className="text-[10px] text-slate-300">₹2,950 Escrow Locked</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-0.5 text-[9px] font-bold text-amber-300">
                      <Handshake className="h-3 w-3 text-amber-400" />
                      Safe Exchange Protocol Active
                    </span>
                  </div>
                )}

                {/* 07. SAFE MEETING: DUAL GPS CHECK-IN POINT */}
                {activeStep === 6 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center rounded-xl border border-emerald-400/40 bg-emerald-500/15 p-2 text-[9px] font-mono text-emerald-300">
                        <MapPin className="h-4 w-4 mb-0.5" />
                        <span>SELLER ✓</span>
                      </div>
                      <div className="h-8 w-px bg-white/20" />
                      <div className="flex flex-col items-center rounded-xl border border-emerald-400/40 bg-emerald-500/15 p-2 text-[9px] font-mono text-emerald-300">
                        <MapPin className="h-4 w-4 mb-0.5" />
                        <span>BUYER ✓</span>
                      </div>
                    </div>

                    <span className="mt-2 font-mono text-[10px] sm:text-[11px] font-bold text-sky-300">
                      BOTH PARTIES ON-SITE
                    </span>
                    <span className="text-[10px] text-slate-300">Logistics Hub Gate 3</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/15 px-2.5 py-0.5 text-[9px] font-bold text-sky-300">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      OTP Token Unlocked
                    </span>
                  </div>
                )}

                {/* 08. VERIFIED EXCHANGE: 6-DIGIT OTP TOKEN VERIFIED */}
                {activeStep === 7 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    <div className="rounded-2xl border border-emerald-400/50 bg-black/70 px-5 py-2.5 shadow-inner">
                      <span className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-emerald-300">
                        849-210
                      </span>
                    </div>

                    <span className="mt-2 font-mono text-[10px] sm:text-[11px] font-bold text-emerald-300">
                      HANDOVER CODE VERIFIED ✓
                    </span>
                    <span className="text-[10px] text-slate-300">Product Glides to Buyer</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300 shadow-md">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      Escrow Released to Seller
                    </span>
                  </div>
                )}

                {/* 09. OWNERSHIP & REUSE: DIGITAL PRODUCT PASSPORT + LEDGER BLOCK */}
                {activeStep === 8 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/60 bg-gradient-to-br from-emerald-500/30 to-sky-500/20 text-emerald-300 shadow-[0_0_35px_rgba(16,185,129,0.45)]">
                      <RotateCw className="h-7 w-7 text-emerald-300 animate-spin" style={{ animationDuration: "4s" }} />
                    </div>

                    <span className="mt-2 font-mono text-[10px] sm:text-[11px] font-bold text-emerald-300">
                      DIGITAL PASSPORT MINTED
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400/90 truncate max-w-[190px]">
                      Tx: 0x9f83a41c...Block #042
                    </span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300 shadow-md">
                      <Sparkles className="h-3 w-3 text-emerald-400" />
                      Story Continues With Buyer ↺
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM METRICS & TELEMETRY FOOTER */}
        {/* ========================================================= */}
        <div className="relative z-30 mx-auto flex w-full max-w-7xl items-center justify-between border-t border-white/10 pt-2.5 text-xs">
          <div className="flex items-center gap-6 text-slate-400 font-mono text-[11px]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>CO₂e Avoided: 1,480+ Tonnes</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              <span>Verified Nodes: 342 Active</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span className="hidden sm:inline">Scroll or use arrow keys (← →)</span>
            <button
              onClick={skipTour}
              className="flex items-center gap-1 font-bold text-emerald-400 hover:text-emerald-300 transition"
              title="Skip intro tour and browse marketplace"
            >
              <span>Skip Intro</span>
              <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FULL MODEL SUMMARY MODAL / MODAL POPUP (STAGE 10) */}
      {/* ========================================================= */}
      {showSummaryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl animate-in fade-in"
          onClick={() => setShowSummaryModal(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/15 bg-[#0c101a] p-6 sm:p-8 shadow-2xl precision-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-mono font-bold text-emerald-400">
                THE COMPLETE ECOMATCH CIRCULAR MODEL
              </span>
              <h2 className="mt-3 text-2xl sm:text-4xl font-black text-white">
                FROM UNUSED TO <span className="text-emerald-400">USEFUL AGAIN</span>.
              </h2>
              <p className="mt-1 text-xs sm:text-sm font-bold text-slate-300">
                DON'T DISCARD IT. ECOMATCH IT.
              </p>
              <p className="mx-auto mt-2 max-w-lg text-xs text-slate-400">
                AI-powered understanding, smarter pricing, and safer verified exchanges that keep useful products in continuous circulation.
              </p>
            </div>

            {/* Circular Journey Diagram */}
            <div className="mt-8 grid gap-2.5 sm:grid-cols-3 text-xs font-mono">
              {stages.map((st, i) => (
                <div
                  key={st.id}
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#06080c] p-3 text-left"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-[10px] font-bold text-emerald-300">
                    {st.number}
                  </span>
                  <div className="truncate">
                    <p className="font-bold text-white truncate">{st.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{st.stageBadge.split("·")[1] || st.stageBadge}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/marketplace"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-xs font-black text-slate-950 shadow-lg hover:bg-emerald-300 transition"
              >
                Explore Marketplace <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/seller/add-product"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold text-white hover:bg-white/10 transition"
              >
                Sell a Product
              </Link>
            </div>

            <button
              onClick={() => setShowSummaryModal(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
