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
  Binary,
  Compass,
  CircleDollarSign,
  QrCode,
  Fingerprint,
} from "lucide-react";

type DigitalTwinStage = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  narrative: string;
  telemetry: { label: string; value: string; unit?: string }[];
};

const stages: DigitalTwinStage[] = [
  {
    id: "physical-product",
    number: "01",
    title: "Physical Surplus Product",
    subtitle: "SURFACE DISCOVERY & INGESTION",
    narrative:
      "A real-world decommissioned asset enters the circular pipeline. High-precision hardware and excess materials are rescued from scrap value.",
    telemetry: [
      { label: "Asset Code", value: "EM-Twin-901" },
      { label: "Visual State", value: "Decommissioned" },
      { label: "Base Scrap Baseline", value: "₹1,200 (Scrap Value)" },
    ],
  },
  {
    id: "vision-scan",
    number: "02",
    title: "Computer Vision Inspection",
    subtitle: "NEURAL BOUNDING & EDGE TELEMETRY",
    narrative:
      "EcoMatch Vision projects optical calibration grids across the surface, calculating micro-tolerances, physical wear, and dimensional integrity.",
    telemetry: [
      { label: "Bounding Box", value: "312 × 220 × 42 mm" },
      { label: "Surface Integrity", value: "94.2% Intact" },
      { label: "LiDAR Confidence", value: "99.1% High Match" },
    ],
  },
  {
    id: "wireframe-twin",
    number: "03",
    title: "Digital Twin Generation",
    subtitle: "CAD WIREFRAME & SCHEMATIC LAYER",
    narrative:
      "The physical product transitions into a living CAD digital twin. Internal schematic layers and component breakdown are exposed in real time.",
    telemetry: [
      { label: "CAD Nodes", value: "1,420 Structural Vertices" },
      { label: "Alloy Purity", value: "6061-T6 Aircraft Grade" },
      { label: "Modular Refurb Fit", value: "Tier 1 Qualified" },
    ],
  },
  {
    id: "material-analysis",
    number: "04",
    title: "Material & Condition Telemetry",
    subtitle: "CIRCULAR ATTRIBUTES DECODED",
    narrative:
      "Detected material properties, structural alloy composition, and reuse pathways are pinned as spatial metadata callouts.",
    telemetry: [
      { label: "Core Material", value: "Anodized Aluminum + Cu" },
      { label: "Grade Rating", value: "Grade A (Refurb Ready)" },
      { label: "CO₂e Avoidance", value: "-38.4 kg Diverted" },
    ],
  },
  {
    id: "price-intelligence",
    number: "05",
    title: "AI Price Intelligence Radar",
    subtitle: "DYNAMIC COMMODITY BENCHMARKING",
    narrative:
      "Real-time secondary market algorithms evaluate replacement retail cost, depreciation curves, and recommend fair market transaction pricing.",
    telemetry: [
      { label: "Original OEM New", value: "₹48,000 (New Retail)" },
      { label: "Fair Circular Resale", value: "₹18,500 – ₹21,000" },
      { label: "Optimal Seller Ask", value: "₹19,800 Target" },
    ],
  },
  {
    id: "verified-listing",
    number: "06",
    title: "Verified Marketplace Asset",
    subtitle: "UIDAI TRUST PASSPORT ATTACHED",
    narrative:
      "The digital twin solidifies into an enterprise marketplace asset card, cryptographically verified with seller e-KYC signature.",
    telemetry: [
      { label: "Listing Protocol", value: "UIDAI e-KYC Verified" },
      { label: "Escrow Protection", value: "100% Protected" },
      { label: "Deal Room Status", value: "Ready for Negotiation" },
    ],
  },
  {
    id: "buyer-sync",
    number: "07",
    title: "Buyer Sync & Handover",
    subtitle: "NEURAL REQUISITION & OTP ESCROW",
    narrative:
      "Matched automatically with an enterprise buyer within optimal GPS route. Physical handover finalized via OTP with SHA-256 ledger block creation.",
    telemetry: [
      { label: "Matched Buyer", value: "GreenTech Labs (8.6 km)" },
      { label: "Handover Token", value: "OTP: 941-208" },
      { label: "Ledger Block", value: "Block #089 Signed" },
    ],
  },
];

export default function DigitalTwinExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeStage, setActiveStage] = useState(0);

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

      const stageIndex = Math.min(6, Math.floor(progress * 7));
      setActiveStage(stageIndex);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const jumpToStage = (index: number) => {
    setActiveStage(index);
    if (!containerRef.current) return;
    const windowH = window.innerHeight || 800;
    const totalScrollable = containerRef.current.offsetHeight - windowH;
    const targetY = containerRef.current.offsetTop + (index / 6.5) * totalScrollable;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  const nextStage = () => jumpToStage(Math.min(6, activeStage + 1));
  const prevStage = () => jumpToStage(Math.max(0, activeStage - 1));

  const current = stages[activeStage] || stages[0];

  return (
    <div ref={containerRef} className="relative h-[650vh] w-full bg-[#06080d]">
      {/* Sticky Cinematic Viewport Canvas */}
      <div className="sticky top-0 flex h-screen w-full flex-col justify-between overflow-hidden px-4 pt-24 pb-4 sm:px-8 sm:pt-28">
        {/* Subtle Ambient Radial Glow */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full blur-[160px] transition-all duration-1000"
            style={{
              background:
                activeStage === 0
                  ? "radial-gradient(circle, rgba(148, 163, 184, 0.08) 0%, transparent 70%)"
                  : activeStage === 1
                  ? "radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)"
                  : activeStage === 2
                  ? "radial-gradient(circle, rgba(129, 140, 248, 0.14) 0%, transparent 70%)"
                  : activeStage === 3
                  ? "radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)"
                  : activeStage === 4
                  ? "radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)"
                  : activeStage === 5
                  ? "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(56, 189, 248, 0.14) 0%, rgba(16, 185, 129, 0.09) 60%, transparent 70%)",
            }}
          />
          <div className="eco-grid absolute inset-0 opacity-20" />
        </div>

        {/* ========================================================= */}
        {/* TOP STATUS BAR & 7-STAGE DIGITAL TWIN STEPPER */}
        {/* ========================================================= */}
        <div className="relative z-30 mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-2.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-7 items-center gap-2 rounded-full border border-white/10 bg-[#0c101a]/90 px-3.5 text-xs font-semibold text-slate-300 backdrop-blur-xl shadow-lg">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              <span>AI PRODUCT DIGITAL TWIN</span>
            </div>
            <span className="hidden font-mono text-xs text-slate-500 md:inline">
              STAGE {current.number} / 07 · SPATIAL INTELLIGENCE
            </span>
          </div>

          {/* Stepper Navigation Dock */}
          <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-[#0c101a]/90 p-1.5 backdrop-blur-2xl shadow-xl">
            {stages.map((stage, idx) => (
              <button
                key={stage.id}
                onClick={() => jumpToStage(idx)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1 text-xs transition-all ${
                  activeStage === idx
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
        {/* MAIN 2-COLUMN VIEWPORT: EDITORIAL TEXT + 3D DIGITAL TWIN */}
        {/* ========================================================= */}
        <div className="relative z-10 mx-auto my-auto flex flex-col md:flex-row items-center justify-between gap-6 lg:gap-12 w-full max-w-7xl">
          {/* Left Column: Editorial Spatial Typography */}
          <div className="w-full md:w-1/2 flex flex-col justify-center text-left">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-widest text-sky-400">
                {current.subtitle}
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl transition-all duration-500 leading-tight">
              {current.title}
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

            {/* Stage Actions */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {activeStage <= 2 && (
                <Link
                  href="/ai-classify"
                  className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black text-slate-950 shadow-md transition hover:bg-slate-200 hover:scale-105"
                >
                  Launch Vision Scanner <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              {activeStage === 3 || activeStage === 4 ? (
                <Link
                  href="/marketplace"
                  className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black text-slate-950 shadow-md transition hover:bg-slate-200 hover:scale-105"
                >
                  View Market Benchmarks <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
              {activeStage >= 5 && (
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
                  onClick={prevStage}
                  disabled={activeStage === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-30"
                  title="Previous Stage"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextStage}
                  disabled={activeStage === 6}
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

          {/* Right Column: High-Precision 3D Digital Twin Stage */}
          <div className="w-full md:w-1/2 flex items-center justify-center [perspective:1400px]">
            <div className="relative flex h-[340px] w-[340px] sm:h-[390px] lg:h-[430px] sm:w-[390px] lg:w-[430px] items-center justify-center">
              {/* Outer Precision Calibration Halo */}
              <div className="absolute inset-0 rounded-full border border-white/10 shadow-[0_0_50px_rgba(56,189,248,0.05)]" />
              <div
                className="absolute inset-4 rounded-full border border-dashed border-sky-400/25 transition-transform duration-700"
                style={{ transform: `rotate(${mounted ? scrollProgress * 360 : 0}deg)` }}
              />

              {/* ======================================================= */}
              {/* 3D DIGITAL TWIN CORE CONTAINER */}
              {/* ======================================================= */}
              <div className="relative z-10 flex h-72 w-72 sm:h-80 sm:w-80 items-center justify-center rounded-[38px] border border-white/15 bg-gradient-to-b from-[#101524]/95 via-[#0c101a]/95 to-[#07090e]/98 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-3xl overflow-hidden transition-all duration-700">
                {/* --------------------------------------------------- */}
                {/* STAGE 1: REAL PRODUCT (HIGH-END ALUMINUM CHASSIS) */}
                {/* --------------------------------------------------- */}
                {activeStage === 0 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 w-full">
                    {/* Realistic Precision Asset Vector */}
                    <div className="relative h-32 w-32 drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)] animate-float-levitate">
                      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                        {/* Precision Aluminum Housing */}
                        <rect x="15" y="30" width="90" height="60" rx="10" fill="url(#chassisGrad1)" stroke="#475569" strokeWidth="1.5" />
                        {/* Core Processor Socket / Heat Diffuser */}
                        <rect x="35" y="45" width="50" height="30" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                        <circle cx="60" cy="60" r="8" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
                        {/* Brass Bus Terminals */}
                        <rect x="25" y="35" width="8" height="4" rx="1" fill="#f59e0b" />
                        <rect x="87" y="35" width="8" height="4" rx="1" fill="#f59e0b" />
                        <rect x="25" y="81" width="8" height="4" rx="1" fill="#f59e0b" />
                        <rect x="87" y="81" width="8" height="4" rx="1" fill="#f59e0b" />
                        {/* Laser Engraved Asset Label */}
                        <line x1="38" y1="52" x2="82" y2="52" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4" />
                        <line x1="38" y1="68" x2="82" y2="68" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4" />
                        <circle cx="100" cy="38" r="2.5" fill="#ef4444" className="animate-ping" />
                        <defs>
                          <linearGradient id="chassisGrad1" x1="15" y1="30" x2="105" y2="90" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#334155" />
                            <stop offset="0.5" stopColor="#1e293b" />
                            <stop offset="1" stopColor="#0f172a" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <span className="mt-3 font-mono text-[11px] font-bold text-slate-300">
                      PHYSICAL ASSET: CHASSIS-M3
                    </span>
                    <span className="text-[10px] text-slate-400">Precision Anodized Aluminum Housing</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[9px] font-bold text-slate-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" />
                      Decommissioned Surplus · ₹1,200 Scrap
                    </span>
                  </div>
                )}

                {/* --------------------------------------------------- */}
                {/* STAGE 2: COMPUTER VISION BOUNDING BOX & SCAN */}
                {/* --------------------------------------------------- */}
                {activeStage === 1 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 w-full">
                    {/* Bounding Box HUD Container */}
                    <div className="laser-sweep relative flex h-32 w-32 items-center justify-center rounded-2xl border border-sky-400/60 bg-[#061424] p-2 shadow-[0_0_35px_rgba(56,189,248,0.3)]">
                      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-24 w-24">
                        <rect x="15" y="30" width="90" height="60" rx="8" fill="url(#chassisGrad2)" stroke="#38bdf8" strokeWidth="1.5" />
                        <rect x="35" y="45" width="50" height="30" rx="4" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1" />
                        <circle cx="60" cy="60" r="8" fill="#0284c7" stroke="#7dd3fc" strokeWidth="1.5" />
                        <circle cx="100" cy="38" r="3" fill="#38bdf8" className="animate-ping" />
                        <defs>
                          <linearGradient id="chassisGrad2" x1="15" y1="30" x2="105" y2="90" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#0f172a" />
                            <stop offset="0.5" stopColor="#0369a1" />
                            <stop offset="1" stopColor="#082f49" />
                          </linearGradient>
                        </defs>
                      </svg>

                      {/* Optical Corner Target Reticles */}
                      <div className="absolute -top-1.5 -left-1.5 h-3.5 w-3.5 border-t-2 border-l-2 border-sky-400" />
                      <div className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 border-t-2 border-r-2 border-sky-400" />
                      <div className="absolute -bottom-1.5 -left-1.5 h-3.5 w-3.5 border-b-2 border-l-2 border-sky-400" />
                      <div className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 border-b-2 border-r-2 border-sky-400" />

                      {/* Vector Coordinates Badge */}
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-sky-400/50 bg-[#061220] px-2.5 py-0.5 text-[9px] font-mono font-bold text-sky-300">
                        [X: 312 · Y: 220 · Z: 42]
                      </span>
                    </div>

                    <span className="mt-3 font-mono text-[11px] font-bold text-sky-300">
                      CV BOUNDING BOX DETECTED
                    </span>
                    <span className="text-[10px] text-slate-300">LiDAR Point Cloud: 99.1% Confidence</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/15 px-2.5 py-0.5 text-[9px] font-bold text-sky-300">
                      <Activity className="h-3 w-3 animate-spin text-sky-400" />
                      Scanning Geometry & Micro-wear
                    </span>
                  </div>
                )}

                {/* --------------------------------------------------- */}
                {/* STAGE 3: SEMI-TRANSPARENT DIGITAL TWIN / WIREFRAME */}
                {/* --------------------------------------------------- */}
                {activeStage === 2 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 w-full">
                    {/* CAD Wireframe Mesh Hologram */}
                    <div className="relative flex h-32 w-32 items-center justify-center rounded-2xl border border-indigo-400/50 bg-[#0b1022] p-2 shadow-[0_0_40px_rgba(99,102,241,0.35)] animate-float-levitate">
                      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-28 w-28">
                        {/* Wireframe Grid Matrix */}
                        <rect x="15" y="30" width="90" height="60" rx="8" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3 3" fill="rgba(99,102,241,0.06)" />
                        <line x1="15" y1="50" x2="105" y2="50" stroke="#818cf8" strokeWidth="0.8" strokeDasharray="2 2" />
                        <line x1="15" y1="70" x2="105" y2="70" stroke="#818cf8" strokeWidth="0.8" strokeDasharray="2 2" />
                        <line x1="45" y1="30" x2="45" y2="90" stroke="#818cf8" strokeWidth="0.8" strokeDasharray="2 2" />
                        <line x1="75" y1="30" x2="75" y2="90" stroke="#818cf8" strokeWidth="0.8" strokeDasharray="2 2" />
                        {/* Internal Schematic Component Nodes */}
                        <circle cx="45" cy="50" r="3" fill="#38bdf8" />
                        <circle cx="75" cy="50" r="3" fill="#38bdf8" />
                        <circle cx="45" cy="70" r="3" fill="#38bdf8" />
                        <circle cx="75" cy="70" r="3" fill="#38bdf8" />
                        <circle cx="60" cy="60" r="8" stroke="#a5b4fc" strokeWidth="1.5" fill="rgba(165,180,252,0.15)" />
                      </svg>

                      {/* Schematic Vertex Count */}
                      <span className="absolute -bottom-2.5 rounded-full border border-indigo-400/40 bg-[#080d1f] px-2 py-0.5 font-mono text-[8px] font-bold text-indigo-300">
                        1,420 CAD NODES
                      </span>
                    </div>

                    <span className="mt-3 font-mono text-[11px] font-bold text-indigo-300">
                      DIGITAL TWIN MESH GENERATED
                    </span>
                    <span className="text-[10px] text-slate-300">Internal Schematic Layer Verified</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-indigo-400/40 bg-indigo-500/20 px-2.5 py-0.5 text-[9px] font-bold text-indigo-300">
                      <Binary className="h-3 w-3 text-indigo-400" />
                      Parametric Refurb Model Live
                    </span>
                  </div>
                )}

                {/* --------------------------------------------------- */}
                {/* STAGE 4: HIGHLIGHT DETECTED MATERIAL & CONDITION */}
                {/* --------------------------------------------------- */}
                {activeStage === 3 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 w-full">
                    {/* Exploded Callout Asset */}
                    <div className="relative flex h-32 w-32 items-center justify-center rounded-2xl border border-emerald-400/50 bg-[#071612] p-2 shadow-[0_0_40px_rgba(16,185,129,0.35)]">
                      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-24 w-24">
                        <rect x="15" y="30" width="90" height="60" rx="8" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
                        <rect x="35" y="45" width="50" height="30" rx="4" fill="#065f46" stroke="#34d399" strokeWidth="1" />
                        <circle cx="60" cy="60" r="8" fill="#10b981" stroke="#6ee7b7" strokeWidth="1.5" />
                      </svg>

                      {/* Spatial Callout Pin 1: Material */}
                      <div className="absolute -top-3 -left-3 rounded-xl border border-emerald-400/40 bg-[#061812] px-2 py-0.5 text-[8px] font-bold text-emerald-300 shadow-md">
                        6061-T6 Alloy
                      </div>

                      {/* Spatial Callout Pin 2: Grade */}
                      <div className="absolute -bottom-3 -right-3 rounded-xl border border-emerald-400/40 bg-[#061812] px-2 py-0.5 text-[8px] font-bold text-emerald-300 shadow-md">
                        Grade A (94%)
                      </div>
                    </div>

                    <span className="mt-3 font-mono text-[11px] font-bold text-emerald-300">
                      CIRCULAR TELEMETRY DECODED
                    </span>
                    <span className="text-[10px] text-slate-300">99.2% Recoverable Aluminum Core</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300">
                      <Sparkles className="h-3 w-3 text-emerald-400" />
                      -38.4 kg CO₂e Offset Factor
                    </span>
                  </div>
                )}

                {/* --------------------------------------------------- */}
                {/* STAGE 5: LIVE PRICE INTELLIGENCE RADAR */}
                {/* --------------------------------------------------- */}
                {activeStage === 4 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 w-full">
                    {/* Price Benchmark Gauge */}
                    <div className="relative flex h-28 w-full max-w-[240px] flex-col justify-center rounded-2xl border border-amber-500/40 bg-[#141007] p-3 shadow-[0_0_35px_rgba(245,158,11,0.25)]">
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                        <span>OEM NEW</span>
                        <span className="text-amber-400 font-bold">FAIR RESALE</span>
                      </div>

                      {/* Live Gradient Spectrum Bar */}
                      <div className="my-2 h-2.5 w-full rounded-full bg-slate-800 p-0.5">
                        <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400" />
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <span className="line-through text-slate-500">₹48,000</span>
                        <span className="font-mono text-xs font-black text-amber-300">₹19,800 TARGET</span>
                      </div>
                    </div>

                    <span className="mt-2.5 font-mono text-[11px] font-bold text-amber-300">
                      AI PRICE INTELLIGENCE RADAR
                    </span>
                    <span className="text-[10px] text-slate-300">16.5x Uplift over ₹1,200 Scrap Value</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[9px] font-bold text-amber-300">
                      <CircleDollarSign className="h-3 w-3 text-amber-400" />
                      Recommended Resale Band: ₹18.5k – ₹21k
                    </span>
                  </div>
                )}

                {/* --------------------------------------------------- */}
                {/* STAGE 6: VERIFIED MARKETPLACE ASSET CARD */}
                {/* --------------------------------------------------- */}
                {activeStage === 5 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 w-full">
                    {/* Polished Listing Card */}
                    <div className="w-full max-w-[240px] rounded-2xl border border-white/20 bg-[#0d1527]/90 p-3 text-left shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold text-emerald-300">
                          Verified Lot
                        </span>
                        <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-400">
                          <ShieldCheck className="h-3 w-3" />
                          UIDAI e-KYC
                        </span>
                      </div>

                      <p className="mt-2 text-[11px] font-bold text-white">Chassis-M3 Alloy Assembly</p>
                      <p className="text-[9px] text-slate-400">Grade A Refurb · Tested Specs</p>

                      <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5">
                        <span className="text-xs font-black text-white font-mono">₹19,800</span>
                        <span className="rounded-md bg-white px-2 py-0.5 text-[9px] font-bold text-slate-950">
                          Deal Room →
                        </span>
                      </div>
                    </div>

                    <span className="mt-2.5 font-mono text-[11px] font-bold text-emerald-300">
                      VERIFIED MARKETPLACE LISTING
                    </span>
                    <span className="text-[10px] text-slate-300">Fraud-Proof Cryptographic Passport</span>
                  </div>
                )}

                {/* --------------------------------------------------- */}
                {/* STAGE 7: BUYER MATCHING & SECURE EXCHANGE */}
                {/* --------------------------------------------------- */}
                {activeStage === 6 && (
                  <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 w-full">
                    {/* Exchange Confirmation Badge */}
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_40px_rgba(16,185,129,0.45)]">
                      <CheckCircle2 className="h-9 w-9 text-emerald-400 animate-bounce" />
                    </div>

                    <span className="mt-2 font-mono text-sm font-black text-emerald-300 tracking-wider">
                      OTP: 941-208 VERIFIED
                    </span>
                    <span className="text-[10px] text-slate-300">GreenTech Labs (8.6 km Transit)</span>
                    <span className="mt-1.5 flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300 shadow-md">
                      <Lock className="h-3 w-3 text-sky-400" />
                      SHA-256 Block #089 Minted
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
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              <span>AI Digital Twin Resolution: 0.1 mm</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>CO₂e Avoided per Lot: 38.4 kg</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>Scroll or use arrows to traverse the 7-stage Digital Twin lifecycle</span>
            <ChevronDown className="h-3.5 w-3.5 animate-bounce text-sky-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
