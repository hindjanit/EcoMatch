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
  Camera,
  Scan,
  Maximize2,
  CircleDollarSign,
  QrCode,
  Fingerprint,
  HeartHandshake,
  Headphones,
  Music,
  Clock,
  Sparkle,
} from "lucide-react";

type StoryScene = {
  id: string;
  step: string;
  headline: string;
  tagline: string;
  narrative: string;
  telemetry: { label: string; value: string }[];
  ambientGlow: string;
  ctaText: string;
  ctaLink: string;
};

const scenes: StoryScene[] = [
  {
    id: "origin-idle",
    step: "01",
    headline: "Someone doesn't need this anymore.",
    tagline: "SCENE 01 · THE IDLE ASSET",
    narrative:
      "Sitting on a shelf in a Bangalore apartment. In pristine cosmetic and acoustic condition, but forgotten for 8 months.",
    telemetry: [
      { label: "Origin Location", value: "Bangalore Home" },
      { label: "Idle Duration", value: "240 Days Forgotten" },
      { label: "Sitting Value", value: "₹0 (Locked Potential)" },
    ],
    ambientGlow: "radial-gradient(circle, rgba(148, 163, 184, 0.07) 0%, transparent 70%)",
    ctaText: "Discover How It Re-enters the Loop",
    ctaLink: "#story",
  },
  {
    id: "photo-capture",
    step: "02",
    headline: "A single photo initiates the circle.",
    tagline: "SCENE 02 · 2-SECOND CAPTURE",
    narrative:
      "The owner snaps a quick photo with their smartphone. No lengthy questionnaires, no manual spec lookup.",
    telemetry: [
      { label: "Capture Time", value: "1.8 Seconds" },
      { label: "Optical Resolution", value: "4K HDR Ingestion" },
      { label: "Sensor Alignment", value: "Auto-Framed" },
    ],
    ambientGlow: "radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)",
    ctaText: "Try AI Camera Capture",
    ctaLink: "/seller/add-product",
  },
  {
    id: "vision-identify",
    step: "03",
    headline: "EcoMatch Vision understands what it is.",
    tagline: "SCENE 03 · OPTICAL RECOGNITION",
    narrative:
      "Computer vision identifies the exact model, acoustic drivers, structural alloy chassis, and manufacturer technical specifications.",
    telemetry: [
      { label: "Detected Model", value: "Studio Pro-90 Headphone" },
      { label: "Driver Spec", value: "50mm Neodymium Planar" },
      { label: "Material Composition", value: "Aluminum + Leatherette" },
    ],
    ambientGlow: "radial-gradient(circle, rgba(129, 140, 248, 0.14) 0%, transparent 70%)",
    ctaText: "Launch Vision Classifier",
    ctaLink: "/ai-classify",
  },
  {
    id: "condition-grade",
    step: "04",
    headline: "Assessing physical & acoustic condition.",
    tagline: "SCENE 04 · PRECISION HEALTH AUDIT",
    narrative:
      "EcoMatch inspects headband tension, driver impedance, and surface wear, scoring an authentic Grade A rating.",
    telemetry: [
      { label: "Cosmetic Rating", value: "96.4% Flawless" },
      { label: "Acoustic Health", value: "0.02% THD (Factory Spec)" },
      { label: "Condition Score", value: "Grade A (Excellent)" },
    ],
    ambientGlow: "radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)",
    ctaText: "Inspect Quality Standards",
    ctaLink: "/verify-identity",
  },
  {
    id: "price-intel",
    step: "05",
    headline: "Calculating the fair resale benchmark.",
    tagline: "SCENE 05 · AI COMMODITY BENCHMARKING",
    narrative:
      "Discarding it would yield ₹300 scrap. AI evaluates secondary demand and recommends a fair circular market price of ₹14,800.",
    telemetry: [
      { label: "Original OEM New", value: "₹32,000" },
      { label: "Scrap Baseline", value: "₹300 (Avoided)" },
      { label: "Fair Circular Resale", value: "₹14,800 (49x Uplift)" },
    ],
    ambientGlow: "radial-gradient(circle, rgba(245, 158, 11, 0.13) 0%, transparent 70%)",
    ctaText: "Explore Price Intelligence",
    ctaLink: "/marketplace",
  },
  {
    id: "marketplace-published",
    step: "06",
    headline: "Published live with cryptographic trust.",
    tagline: "SCENE 06 · ZERO-FRAUD DISCOVERY",
    narrative:
      "The listing goes live instantly, backed by the seller's UIDAI verified identity passport and 100% escrow protection.",
    telemetry: [
      { label: "Listing ID", value: "#EM-Audio-4029" },
      { label: "Seller Trust Passport", value: "UIDAI e-KYC Verified" },
      { label: "Buyer Protection", value: "Full Escrow Guarantee" },
    ],
    ambientGlow: "radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)",
    ctaText: "Browse Live Marketplace",
    ctaLink: "/marketplace",
  },
  {
    id: "buyer-discovery",
    step: "07",
    headline: "Discovered by someone 6.4 km away.",
    tagline: "SCENE 07 · NEURAL PROXIMITY MATCH",
    narrative:
      "An audio producer at an Indiranagar sound studio searching for studio monitoring headphones receives an instant 98.2% smart match.",
    telemetry: [
      { label: "Buyer Entity", value: "Ananya Sound Lab" },
      { label: "Transit Distance", value: "6.4 km Local Route" },
      { label: "Requisition Fit", value: "98.2% Match" },
    ],
    ambientGlow: "radial-gradient(circle, rgba(99, 102, 241, 0.14) 0%, transparent 70%)",
    ctaText: "Test NLP Smart Matcher",
    ctaLink: "/ai-match",
  },
  {
    id: "deal-room-negotiate",
    step: "08",
    headline: "Transparent, real-time negotiation.",
    tagline: "SCENE 08 · THE DEAL ROOM",
    narrative:
      "The buyer makes an offer of ₹14,200. The seller counters with ₹14,500. Both agree within 4 minutes and funds lock safely into escrow.",
    telemetry: [
      { label: "Initial Offer", value: "₹14,200" },
      { label: "Agreed Settlement", value: "₹14,500" },
      { label: "Escrow Status", value: "Locked & Protected" },
    ],
    ambientGlow: "radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)",
    ctaText: "View Open Deals",
    ctaLink: "/deals",
  },
  {
    id: "secure-handover",
    step: "09",
    headline: "Physical inspection & OTP verification.",
    tagline: "SCENE 09 · SECURE HANDOVER",
    narrative:
      "Both meet at a verified transit point. The buyer tests the headphones, scans the digital QR pass, and verifies the 6-digit OTP.",
    telemetry: [
      { label: "Handover Token", value: "OTP: 832-190" },
      { label: "Physical Inspection", value: "Passed & Verified" },
      { label: "Ownership Proof", value: "SHA-256 Block #094" },
    ],
    ambientGlow: "radial-gradient(circle, rgba(16, 185, 129, 0.14) 0%, transparent 70%)",
    ctaText: "Inspect Public Ledger",
    ctaLink: "/ledger",
  },
  {
    id: "new-life",
    step: "10",
    headline: "One person's unused product became another person's resource.",
    tagline: "SCENE 10 · THE CIRCULAR LOOP COMPLETE",
    narrative:
      "Now actively powering daily commercial music production in Indiranagar. 28.6 kg CO₂e avoided. 100% diverted from waste.",
    telemetry: [
      { label: "Current Status", value: "Active Studio Production" },
      { label: "Carbon Diverted", value: "-28.6 kg CO₂e Offset" },
      { label: "Extended Lifespan", value: "+5 Years Useful Life" },
    ],
    ambientGlow: "radial-gradient(circle, rgba(16, 185, 129, 0.16) 0%, rgba(56, 189, 248, 0.1) 60%, transparent 70%)",
    ctaText: "Start Your Circular Journey",
    ctaLink: "/marketplace",
  },
];

export default function ProductLifecycleStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeScene, setActiveScene] = useState(0);

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

      const sceneIndex = Math.min(9, Math.floor(progress * 10));
      setActiveScene(sceneIndex);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const jumpToScene = (index: number) => {
    setActiveScene(index);
    if (!containerRef.current) return;
    const windowH = window.innerHeight || 800;
    const totalScrollable = containerRef.current.offsetHeight - windowH;
    const targetY = containerRef.current.offsetTop + (index / 9.5) * totalScrollable;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  const nextScene = () => jumpToScene(Math.min(9, activeScene + 1));
  const prevScene = () => jumpToScene(Math.max(0, activeScene - 1));

  const current = scenes[activeScene] || scenes[0];

  return (
    <div ref={containerRef} className="relative h-[850vh] w-full bg-[#06080d]">
      {/* Sticky Presentation Canvas */}
      <div className="sticky top-0 flex h-screen w-full flex-col justify-between overflow-hidden px-4 pt-24 pb-4 sm:px-8 sm:pt-28">
        {/* Dynamic Scene Ambient Lighting */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[750px] w-[750px] rounded-full blur-[160px] transition-all duration-1000"
            style={{ background: current.ambientGlow }}
          />
          <div className="eco-grid absolute inset-0 opacity-20" />
        </div>

        {/* ========================================================= */}
        {/* TOP STATUS BAR & 10-STEP STORY TIMELINE */}
        {/* ========================================================= */}
        <div className="relative z-30 mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-2.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-7 items-center gap-2 rounded-full border border-white/10 bg-[#0c101a]/90 px-3.5 text-xs font-semibold text-slate-300 backdrop-blur-xl shadow-lg">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>THE LIFECYCLE STORY</span>
            </div>
            <span className="hidden font-mono text-xs text-slate-500 md:inline">
              SCENE {current.step} / 10 · ONE PERSISTENT PRODUCT
            </span>
          </div>

          {/* Interactive Stepper Navigation Dock */}
          <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-[#0c101a]/90 p-1.5 backdrop-blur-2xl shadow-xl">
            {scenes.map((scene, idx) => (
              <button
                key={scene.id}
                onClick={() => jumpToScene(idx)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-all ${
                  activeScene === idx
                    ? "bg-white text-slate-950 font-bold shadow-md scale-105"
                    : "text-slate-400 hover:text-white"
                }`}
                title={scene.headline}
              >
                <span className="font-mono text-[10px] opacity-70">{scene.step}</span>
                <span className="hidden lg:inline">{scene.id.split("-")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN 2-COLUMN VIEWPORT: EDITORIAL NARRATIVE + PERSISTENT PRODUCT */}
        {/* ========================================================= */}
        <div className="relative z-10 mx-auto my-auto flex flex-col md:flex-row items-center justify-between gap-6 lg:gap-12 w-full max-w-7xl">
          {/* Left Column: Storytelling Typography & Emotional Narrative */}
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

            {/* Dynamic Telemetry Bento */}
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

            {/* Stage Action CTA & Navigation */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={current.ctaLink}
                className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black text-slate-950 shadow-md transition hover:bg-slate-200 hover:scale-105"
              >
                {current.ctaText} <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              {/* Step Navigation Controls */}
              <div className="flex items-center gap-1 ml-auto sm:ml-0">
                <button
                  onClick={prevScene}
                  disabled={activeScene === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-30"
                  title="Previous Scene"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextScene}
                  disabled={activeScene === 9}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-30"
                  title="Next Scene"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <span className="text-[11px] text-slate-500 font-mono">
                {mounted ? Math.round(scrollProgress * 100) : 0}% Story Complete
              </span>
            </div>
          </div>

          {/* Right Column: THE PERSISTENT PRODUCT & ENVIRONMENT TRANSFORMATIONS */}
          <div className="w-full md:w-1/2 flex items-center justify-center [perspective:1400px]">
            <div className="relative flex h-[340px] w-[340px] sm:h-[390px] lg:h-[440px] sm:w-[390px] lg:w-[440px] items-center justify-center">
              {/* Concentric Ambient Aura */}
              <div className="absolute inset-0 rounded-full border border-white/10 shadow-[0_0_50px_rgba(56,189,248,0.05)]" />
              <div
                className="absolute inset-4 rounded-full border border-dashed border-sky-400/25 transition-transform duration-700"
                style={{ transform: `rotate(${mounted ? scrollProgress * 360 : 0}deg)` }}
              />

              {/* ======================================================= */}
              {/* CENTER PERSISTENT PRODUCT CONTAINER */}
              {/* ======================================================= */}
              <div className="relative z-10 flex h-72 w-72 sm:h-80 sm:w-80 items-center justify-center rounded-[38px] border border-white/15 bg-gradient-to-b from-[#101524]/95 via-[#0c101a]/95 to-[#07090e]/98 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-3xl overflow-hidden transition-all duration-700">
                {/* --------------------------------------------------- */}
                {/* PERSISTENT PRODUCT VISUAL: STUDIO PRO HEADPHONES */}
                {/* --------------------------------------------------- */}
                <div className="relative flex flex-col items-center text-center w-full">
                  {/* Floating Product SVG with Environmental Overlays */}
                  <div className="relative h-32 w-32 drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)] animate-float-levitate">
                    {/* Viewfinder Overlay during Scene 2 (Camera) */}
                    {activeScene === 1 && (
                      <div className="pointer-events-none absolute -inset-3 rounded-2xl border-2 border-dashed border-sky-400 animate-pulse">
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-slate-950 px-2 py-0.5 text-[8px] font-bold rounded-full">
                          4K CAPTURE
                        </span>
                      </div>
                    )}

                    {/* Laser Scanning Line during Scene 3 (Vision) */}
                    {activeScene === 2 && (
                      <div className="laser-sweep pointer-events-none absolute -inset-2 rounded-2xl border border-sky-400/50" />
                    )}

                    {/* Quality Health Reticles during Scene 4 (Grading) */}
                    {activeScene === 3 && (
                      <>
                        <div className="absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-emerald-400 animate-ping" />
                        <div className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-emerald-400 animate-ping" />
                      </>
                    )}

                    {/* Sound Waves & Creative Aura during Scene 10 (New Life) */}
                    {activeScene === 9 && (
                      <div className="pointer-events-none absolute -inset-4 rounded-full border border-emerald-400/40 animate-ping opacity-30" />
                    )}

                    {/* SVG Vector Studio Headphones */}
                    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                      {/* Headband Arc */}
                      <path
                        d="M20 70C20 40 40 20 60 20C80 20 100 40 100 70"
                        stroke={activeScene >= 2 ? "#38bdf8" : "#94a3b8"}
                        strokeWidth="5"
                        strokeLinecap="round"
                      />
                      {/* Cushion Band */}
                      <path
                        d="M32 40C40 30 50 26 60 26C70 26 80 30 88 40"
                        stroke={activeScene === 9 ? "#10b981" : "#475569"}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      {/* Left Ear Cup */}
                      <rect
                        x="12"
                        y="62"
                        width="16"
                        height="32"
                        rx="8"
                        fill="url(#cupGrad)"
                        stroke={activeScene >= 2 ? "#38bdf8" : "#64748b"}
                        strokeWidth="1.5"
                      />
                      <circle cx="20" cy="78" r="4" fill={activeScene === 9 ? "#10b981" : "#1e293b"} />
                      {/* Right Ear Cup */}
                      <rect
                        x="92"
                        y="62"
                        width="16"
                        height="32"
                        rx="8"
                        fill="url(#cupGrad)"
                        stroke={activeScene >= 2 ? "#38bdf8" : "#64748b"}
                        strokeWidth="1.5"
                      />
                      <circle cx="100" cy="78" r="4" fill={activeScene === 9 ? "#10b981" : "#1e293b"} />
                      <defs>
                        <linearGradient id="cupGrad" x1="12" y1="62" x2="28" y2="94" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#334155" />
                          <stop offset="0.5" stopColor="#1e293b" />
                          <stop offset="1" stopColor="#0f172a" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  {/* ------------------------------------------------- */}
                  {/* DYNAMIC SCENE METADATA BADGES BELOW PRODUCT */}
                  {/* ------------------------------------------------- */}
                  <span className="mt-3 font-mono text-[11px] font-bold text-white">
                    {activeScene === 0 && "STUDIO PRO-90 · UNUSED IN DRAWER"}
                    {activeScene === 1 && "CAPTURING OPTICAL GEOMETRY"}
                    {activeScene === 2 && "MODEL & SERIAl IDENTIFIED"}
                    {activeScene === 3 && "GRADE A · 96.4% HEALTH AUDIT"}
                    {activeScene === 4 && "AI RESALE TARGET: ₹14,800"}
                    {activeScene === 5 && "LIVE VERIFIED MARKETPLACE LISTING"}
                    {activeScene === 6 && "BUYER MATCH: ANANYA SOUND LAB"}
                    {activeScene === 7 && "DEAL ROOM SETTLEMENT: ₹14,500"}
                    {activeScene === 8 && "SAFE HANDOVER · OTP: 832-190"}
                    {activeScene === 9 && "ACTIVE IN NEW CREATIVE STUDIO"}
                  </span>

                  <span className="mt-0.5 text-[10px] text-slate-400">
                    {activeScene === 0 && "Idle for 8 Months · Value: ₹0 sitting idle"}
                    {activeScene === 1 && "4K HDR Ingestion in 1.8 Seconds"}
                    {activeScene === 2 && "50mm Neodymium Planar Drivers Detected"}
                    {activeScene === 3 && "Acoustic Distortion < 0.02% THD"}
                    {activeScene === 4 && "49x Value Uplift over ₹300 Scrap Value"}
                    {activeScene === 5 && "Backed by UIDAI Cryptographic e-KYC"}
                    {activeScene === 6 && "6.4 km Proximity Route Transit"}
                    {activeScene === 7 && "100% Escrow Protection Sealed"}
                    {activeScene === 8 && "Confirmed at Verified Logistics Hub"}
                    {activeScene === 9 && "-28.6 kg CO₂e Avoided · 100% Diverted"}
                  </span>

                  {/* Stage Context Pills */}
                  <div className="mt-2">
                    {activeScene === 0 && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[9px] font-bold text-slate-400">
                        Awaiting Awakening
                      </span>
                    )}
                    {activeScene === 1 && (
                      <span className="flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/15 px-2.5 py-0.5 text-[9px] font-bold text-sky-300">
                        <Camera className="h-3 w-3 animate-spin" /> Ingestion Active
                      </span>
                    )}
                    {activeScene === 2 && (
                      <span className="flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/15 px-2.5 py-0.5 text-[9px] font-bold text-sky-300">
                        <Scan className="h-3 w-3" /> Spectral Recognition
                      </span>
                    )}
                    {activeScene === 3 && (
                      <span className="flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300">
                        <Sparkles className="h-3 w-3" /> Grade A Certified
                      </span>
                    )}
                    {activeScene === 4 && (
                      <span className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 text-[9px] font-bold text-amber-300">
                        <CircleDollarSign className="h-3 w-3" /> Fair Resale ₹14.8k
                      </span>
                    )}
                    {activeScene === 5 && (
                      <span className="flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/15 px-2.5 py-0.5 text-[9px] font-bold text-sky-300">
                        <ShieldCheck className="h-3 w-3" /> UIDAI Verified Listing
                      </span>
                    )}
                    {activeScene === 6 && (
                      <span className="flex items-center gap-1 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-2.5 py-0.5 text-[9px] font-bold text-indigo-300">
                        <MapPin className="h-3 w-3" /> 6.4 km Transit Route
                      </span>
                    )}
                    {activeScene === 7 && (
                      <span className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 text-[9px] font-bold text-amber-300">
                        <HeartHandshake className="h-3 w-3" /> Offer Accepted ₹14,500
                      </span>
                    )}
                    {activeScene === 8 && (
                      <span className="flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300">
                        <Lock className="h-3 w-3" /> OTP 832-190 Verified
                      </span>
                    )}
                    {activeScene === 9 && (
                      <span className="flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-500/25 px-3 py-1 text-[10px] font-bold text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse">
                        <Music className="h-3 w-3" /> In Commercial Production
                      </span>
                    )}
                  </div>
                </div>
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
              <span>Real-World Lifecycle Trace: Active</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>Scroll or use arrows to follow the full circular story</span>
            <ChevronDown className="h-3.5 w-3.5 animate-bounce text-emerald-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
