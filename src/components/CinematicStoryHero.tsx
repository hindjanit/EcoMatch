"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  Cpu,
  ArrowRight,
  Boxes,
  Zap,
  CheckCircle2,
  Lock,
  QrCode,
  Layers,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  Activity,
  Maximize2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function CinematicStoryHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowH = window.innerHeight || 800;
      const totalScrollable = containerRef.current.offsetHeight - windowH;
      if (totalScrollable <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.max(0, Math.min(1, currentScroll / totalScrollable));
      setScrollProgress(progress);

      // Determine active story stage (0 to 5)
      if (progress < 0.16) setActiveStep(0);
      else if (progress < 0.35) setActiveStep(1);
      else if (progress < 0.54) setActiveStep(2);
      else if (progress < 0.72) setActiveStep(3);
      else if (progress < 0.88) setActiveStep(4);
      else setActiveStep(5);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Jump to specific story step
  const jumpToStep = (stepIndex: number) => {
    setActiveStep(stepIndex);
    if (!containerRef.current) return;
    const windowH = window.innerHeight || 800;
    const totalScrollable = containerRef.current.offsetHeight - windowH;
    const targetScrollRatio = [0.05, 0.25, 0.45, 0.63, 0.8, 0.96][stepIndex];
    const targetY = containerRef.current.offsetTop + targetScrollRatio * totalScrollable;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  const nextStep = () => {
    const target = Math.min(5, activeStep + 1);
    jumpToStep(target);
  };

  const prevStep = () => {
    const target = Math.max(0, activeStep - 1);
    jumpToStep(target);
  };

  return (
    <div ref={containerRef} className="relative h-[420vh] w-full bg-[#06080d]">
      {/* Sticky Presentation Viewport */}
      <div className="sticky top-0 flex h-screen w-full flex-col justify-between overflow-hidden px-4 pt-20 pb-6 sm:px-8 sm:pt-24">
        {/* Subtle Ambient Background Mesh */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full blur-[140px] transition-all duration-700"
            style={{
              background:
                activeStep === 0
                  ? "radial-gradient(circle, rgba(148, 163, 184, 0.05) 0%, transparent 70%)"
                  : activeStep === 1
                  ? "radial-gradient(circle, rgba(56, 189, 248, 0.09) 0%, transparent 70%)"
                  : activeStep === 2
                  ? "radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(56, 189, 248, 0.04) 50%, transparent 70%)"
                  : activeStep === 3
                  ? "radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)"
                  : activeStep === 4
                  ? "radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, rgba(16, 185, 129, 0.05) 60%, transparent 70%)"
                  : "radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, rgba(99, 102, 241, 0.08) 50%, transparent 70%)",
            }}
          />
          <div className="eco-grid absolute inset-0 opacity-20" />
        </div>

        {/* Top Story Header & Navigation Timeline */}
        <div className="relative z-20 mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-7 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[11px] font-semibold text-slate-300 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>THE CIRCULAR TRANSFORMATION</span>
            </div>
            <span className="hidden font-mono text-xs text-slate-500 sm:inline">
              STAGE 0{activeStep + 1} / 06
            </span>
          </div>

          {/* Interactive Stepper Pills */}
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#0c1018]/80 p-1 backdrop-blur-2xl shadow-xl">
            {[
              "01 Decommission",
              "02 AI Scan",
              "03 Telemetry",
              "04 Asset Listing",
              "05 Buyer Sync",
              "06 Ledger Proof",
            ].map((label, idx) => (
              <button
                key={label}
                onClick={() => jumpToStep(idx)}
                className={`rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-medium transition-all ${
                  activeStep === idx
                    ? "bg-white text-slate-950 font-bold shadow-md scale-105"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {label.split(" ")[1]}
              </button>
            ))}
          </div>
        </div>

        {/* Central Cinematic Canvas Stage */}
        <div className="relative z-10 mx-auto flex h-[50vh] w-full max-w-5xl items-center justify-center sm:h-[55vh]">
          {/* Left / Right Interactive Quick Navigation Controls */}
          <button
            onClick={prevStep}
            disabled={activeStep === 0}
            className="absolute -left-2 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur-xl transition hover:bg-white/15 hover:text-white disabled:opacity-20 sm:-left-6"
            title="Previous Stage"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={nextStep}
            disabled={activeStep === 5}
            className="absolute -right-2 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur-xl transition hover:bg-white/15 hover:text-white disabled:opacity-20 sm:-right-6"
            title="Next Stage"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* ========================================================= */}
          {/* STAGE 1: Discarded Industrial Component */}
          {/* ========================================================= */}
          <div
            className="absolute flex flex-col items-center justify-center transition-all duration-700 ease-out"
            style={{
              opacity: activeStep <= 2 ? 1 : Math.max(0, 1 - (scrollProgress - 0.54) * 8),
              transform: `scale(${
                activeStep === 0
                  ? 1
                  : activeStep === 1
                  ? 1.05
                  : activeStep === 2
                  ? 1.08
                  : 0.95
              }) translateY(${activeStep >= 3 ? "-20px" : "0px"})`,
              pointerEvents: activeStep <= 2 ? "auto" : "none",
            }}
          >
            {/* 3D Realistic Industrial Asset Hologram Container */}
            <div className="relative flex h-60 w-60 items-center justify-center rounded-[36px] border border-white/10 bg-gradient-to-b from-[#101522]/90 to-[#090d16]/95 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-3xl sm:h-68 sm:w-68">
              {/* Product Visual */}
              <div className="relative flex flex-col items-center">
                {/* SVG/Vector Precision High-Tech Servo Module */}
                <div className="relative h-24 w-24 drop-shadow-[0_15px_25px_rgba(0,0,0,0.7)] sm:h-28 sm:w-28">
                  <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-full w-full"
                  >
                    <rect
                      x="18"
                      y="25"
                      width="64"
                      height="50"
                      rx="8"
                      fill="url(#metalGrad)"
                      stroke="#475569"
                      strokeWidth="1.5"
                    />
                    <line x1="26" y1="35" x2="74" y2="35" stroke="#334155" strokeWidth="2" />
                    <line x1="26" y1="43" x2="74" y2="43" stroke="#334155" strokeWidth="2" />
                    <line x1="26" y1="51" x2="74" y2="51" stroke="#334155" strokeWidth="2" />
                    <line x1="26" y1="59" x2="74" y2="59" stroke="#334155" strokeWidth="2" />
                    <line x1="26" y1="67" x2="74" y2="67" stroke="#334155" strokeWidth="2" />
                    <circle
                      cx="50"
                      cy="20"
                      r="10"
                      fill="#64748b"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                    />
                    <circle cx="50" cy="20" r="4" fill="#0f172a" />
                    <rect x="47" y="6" width="6" height="10" rx="1" fill="#f59e0b" />
                    <circle
                      cx="30"
                      cy="30"
                      r="2"
                      fill={activeStep >= 1 ? "#38bdf8" : "#ef4444"}
                      className={activeStep >= 1 ? "animate-pulse" : ""}
                    />
                    <defs>
                      <linearGradient id="metalGrad" x1="18" y1="25" x2="82" y2="75" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#1e293b" />
                        <stop offset="0.5" stopColor="#334155" />
                        <stop offset="1" stopColor="#0f172a" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                <span className="mt-2 font-mono text-[10px] sm:text-[11px] font-semibold tracking-wider text-slate-400">
                  SURPLUS ASSET #EM-809
                </span>
                <span className="text-[10px] text-slate-500">
                  Industrial High-Torque Servo
                </span>
              </div>

              {/* STAGE 2: Laser Scanning Beam & Particle HUD */}
              {activeStep >= 1 && (
                <>
                  <div className="laser-sweep pointer-events-none absolute inset-0 rounded-[36px] border border-sky-400/40" />

                  {/* Diagnostic Corner Reticles */}
                  <div className="absolute top-3 left-3 h-3 w-3 border-t-2 border-l-2 border-sky-400" />
                  <div className="absolute top-3 right-3 h-3 w-3 border-t-2 border-r-2 border-sky-400" />
                  <div className="absolute bottom-3 left-3 h-3 w-3 border-b-2 border-l-2 border-sky-400" />
                  <div className="absolute bottom-3 right-3 h-3 w-3 border-b-2 border-r-2 border-sky-400" />

                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-sky-400/40 bg-[#061220] px-3 py-0.5 text-[10px] font-bold text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.4)]">
                    <Activity className="h-3 w-3 animate-spin" />
                    AI SPECTRAL ANALYSIS
                  </div>
                </>
              )}
            </div>

            {/* STAGE 3: Floating Telemetry Labels */}
            {activeStep >= 2 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="absolute -top-4 -left-32 hidden rounded-2xl border border-white/10 bg-[#090d16]/90 p-2.5 shadow-2xl backdrop-blur-xl transition-all duration-500 sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    <p className="text-[9px] uppercase font-bold text-slate-400">Material Core</p>
                  </div>
                  <p className="mt-0.5 text-[11px] font-bold text-white">6061-T6 Aircraft Alloy + Cu</p>
                </div>

                <div className="absolute -top-4 -right-32 hidden rounded-2xl border border-white/10 bg-[#090d16]/90 p-2.5 shadow-2xl backdrop-blur-xl transition-all duration-500 sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <p className="text-[9px] uppercase font-bold text-slate-400">Condition Grade</p>
                  </div>
                  <p className="mt-0.5 text-[11px] font-bold text-emerald-300">Grade A- · 91% Efficiency</p>
                </div>

                <div className="absolute -bottom-4 -left-32 hidden rounded-2xl border border-white/10 bg-[#090d16]/90 p-2.5 shadow-2xl backdrop-blur-xl transition-all duration-500 sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <p className="text-[9px] uppercase font-bold text-slate-400">Carbon Diverted</p>
                  </div>
                  <p className="mt-0.5 text-[11px] font-bold text-white">-42.8 kg CO₂e Offset</p>
                </div>

                <div className="absolute -bottom-4 -right-32 hidden rounded-2xl border border-white/10 bg-[#090d16]/90 p-2.5 shadow-2xl backdrop-blur-xl transition-all duration-500 sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    <p className="text-[9px] uppercase font-bold text-slate-400">AI Valuation</p>
                  </div>
                  <p className="mt-0.5 text-[11px] font-bold text-white">₹14,200 · 98.4% Match</p>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* STAGE 4: Metamorphosis to Polished Marketplace Card */}
          {/* ========================================================= */}
          <div
            className="absolute transition-all duration-700 ease-out"
            style={{
              opacity: activeStep === 3 ? 1 : activeStep > 3 ? Math.max(0, 1 - (scrollProgress - 0.72) * 6) : 0,
              transform: `scale(${activeStep === 3 ? 1 : 0.95}) translateY(${activeStep === 3 ? "0px" : "15px"})`,
              pointerEvents: activeStep === 3 ? "auto" : "none",
            }}
          >
            <div className="w-[320px] rounded-3xl border border-white/15 bg-[#0b0f19]/95 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-3xl sm:w-[380px]">
              <div className="flex items-center justify-between">
                <span className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-300">
                  Industrial Robotics
                </span>
                <span className="flex items-center gap-1 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  UIDAI Verified Seller
                </span>
              </div>

              <div className="mt-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-[#07090e] p-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 border border-white/10">
                  <Boxes className="h-6 w-6 text-sky-400" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Precision Servo Motor Lot</h4>
                  <p className="text-[11px] text-slate-400">Lot: 4 Units · 6061 Alloy</p>
                  <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">Grade A- Tested</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Fair Market Valuation</p>
                  <p className="text-lg sm:text-xl font-black text-white">₹14,200 <span className="text-xs font-normal text-slate-400 line-through">₹38,000</span></p>
                </div>

                <Link
                  href="/marketplace"
                  className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-black text-slate-950 shadow-md transition hover:bg-slate-200"
                >
                  Enter Deal Room <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* STAGE 5: Buyer-Seller Neural Connection Sync */}
          {/* ========================================================= */}
          <div
            className="absolute transition-all duration-700 ease-out"
            style={{
              opacity: activeStep === 4 ? 1 : 0,
              transform: `scale(${activeStep === 4 ? 1 : 0.95})`,
              pointerEvents: activeStep === 4 ? "auto" : "none",
            }}
          >
            <div className="flex w-[320px] flex-col gap-4 sm:w-[440px]">
              <div className="flex items-center justify-between">
                {/* Seller Node */}
                <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-[#0c101a]/90 p-3 text-center shadow-xl backdrop-blur-xl">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 font-bold text-xs">
                    SEL
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-white">Bangalore Fab</p>
                  <p className="text-[9px] text-slate-400">Surplus Supplier</p>
                </div>

                {/* Live Neural Match Beam */}
                <div className="flex flex-1 flex-col items-center px-3">
                  <span className="rounded-full border border-sky-400/40 bg-sky-500/15 px-2.5 py-0.5 text-[9px] font-bold text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                    96% NLP Match
                  </span>
                  <div className="mt-2 h-0.5 w-full bg-gradient-to-r from-sky-400 via-emerald-400 to-indigo-400" />
                  <span className="mt-1 text-[9px] text-slate-400">12.4 km Proximity</span>
                </div>

                {/* Buyer Node */}
                <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-[#0c101a]/90 p-3 text-center shadow-xl backdrop-blur-xl">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                    BUY
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-white">GreenTech Labs</p>
                  <p className="text-[9px] text-slate-400">Procurement</p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/25 bg-[#061912]/80 p-3 text-center shadow-xl backdrop-blur-xl">
                <p className="text-xs font-bold text-emerald-300">
                  ⚡ Automatic Requirement Handshake Initiated
                </p>
                <p className="mt-0.5 text-[10px] text-white/60">
                  Instant escrow price lock at ₹14,200 with OTP verified safe exchange.
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* STAGE 6: QR Pass & Digital Blockchain Ledger Proof */}
          {/* ========================================================= */}
          <div
            className="absolute transition-all duration-700 ease-out"
            style={{
              opacity: activeStep === 5 ? 1 : 0,
              transform: `scale(${activeStep === 5 ? 1 : 0.95})`,
              pointerEvents: activeStep === 5 ? "auto" : "none",
            }}
          >
            <div className="w-[320px] rounded-3xl border border-white/15 bg-[#090d16]/95 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-3xl sm:w-[400px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Exchange Confirmed</h4>
                    <p className="text-[10px] text-slate-400">Physical Handover Verified</p>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-xs font-black text-emerald-300">
                  OTP: 782-901
                </div>
              </div>

              {/* SHA-256 Ledger Minting */}
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#05070c] p-3 font-mono">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">LEDGER BLOCK #042</span>
                  <span className="text-emerald-400 font-bold">IMMUTABLE</span>
                </div>
                <p className="mt-1 truncate text-[9px] text-slate-500">
                  TxHash: 0x9f83a41c28b7e0d319a2b5439c81e9f4028...
                </p>
                <div className="mt-2 flex items-center gap-2 text-[9px] text-slate-400 border-t border-white/10 pt-2">
                  <Lock className="h-3 w-3 text-sky-400" />
                  <span>Ownership Transferred to GreenTech Labs</span>
                </div>
              </div>

              <Link
                href="/ledger"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-2.5 text-xs font-black text-slate-950 shadow-lg transition hover:bg-slate-200"
              >
                Inspect Public Block Ledger <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Headline & Story Narrative Box */}
        <div className="relative z-20 mx-auto w-full max-w-4xl text-center">
          <h2 className="text-xl font-black tracking-tight text-white sm:text-3xl transition-all duration-500">
            {activeStep === 0 && (
              <>
                Every surplus asset holds{" "}
                <span className="bg-gradient-to-r from-slate-200 via-white to-slate-400 bg-clip-text text-transparent">
                  hidden circular life.
                </span>
              </>
            )}
            {activeStep === 1 && (
              <>
                EcoMatch Vision{" "}
                <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
                  inspects & decodes
                </span>{" "}
                the material.
              </>
            )}
            {activeStep === 2 && (
              <>
                Real-time circular telemetry &{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  fair market intelligence.
                </span>
              </>
            )}
            {activeStep === 3 && (
              <>
                Metamorphosis into a{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
                  verified marketplace asset.
                </span>
              </>
            )}
            {activeStep === 4 && (
              <>
                Connecting supply to verified demand with{" "}
                <span className="bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">
                  zero friction.
                </span>
              </>
            )}
            {activeStep === 5 && (
              <>
                Cryptographic handover &{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
                  tamper-proof ledger trace.
                </span>
              </>
            )}
          </h2>

          <p className="mx-auto mt-1.5 max-w-xl text-xs text-slate-400 leading-relaxed transition-all duration-500">
            {activeStep === 0 &&
              "Discarded electronics, excess industrial metals, and surplus stock are rescued from scrap value through AI classification."}
            {activeStep === 1 &&
              "Optical computer vision identifies component alloy composition, operational tolerances, and structural integrity."}
            {activeStep === 2 &&
              "Instant valuation calculated using real-world commodity benchmarks, age depreciation algorithms, and CO₂ offset models."}
            {activeStep === 3 &&
              "Published securely with cryptographic seller verification passport, eliminating listing risk and transaction fraud."}
            {activeStep === 4 &&
              "Smart NLP matching automatically links enterprise buyers looking for circular inputs within optimal GPS radius."}
            {activeStep === 5 &&
              "Physical transfer confirmed through one-time digital pass and permanently recorded on the immutable SHA-256 ledger."}
          </p>

          {/* Scroll Down Prompt */}
          <div className="mt-3 flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-400">
            <span>Scroll or click buttons to navigate transformation</span>
            <ChevronDown className="h-3.5 w-3.5 animate-bounce text-sky-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
