"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  Camera,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  TrendingUp,
  MapPin,
  QrCode,
  Lock,
  Leaf,
  Boxes,
  Handshake,
  User,
  Mouse,
  Smartphone,
  ChevronRight,
  RefreshCw,
  Play,
  Pause,
  Award,
} from "lucide-react";

type StoryStage = {
  id: number;
  key: string;
  title: string;
  badge: string;
  description: string;
  metricLabel: string;
  metricValue: string;
};

const stages: StoryStage[] = [
  {
    id: 1,
    key: "listed",
    title: "1. LISTED",
    badge: "Seller Capture",
    description: "A seller photographs their unused product at home or office. EcoMatch begins the circular ingestion lifecycle.",
    metricLabel: "Initial Status",
    metricValue: "Raw Photographic Ingestion",
  },
  {
    id: 2,
    key: "understood",
    title: "2. AI UNDERSTOOD",
    badge: "Neural Vision",
    description: "EcoMatch Vision sweeps the optical geometry, recognizing material specs, cosmetic condition, and structural wear.",
    metricLabel: "Identified Health",
    metricValue: "94.2% Structural Integrity",
  },
  {
    id: 3,
    key: "price_checked",
    title: "3. PRICE CHECKED",
    badge: "Fair Value Intelligence",
    description: "Online secondary market signals are benchmarked against raw scrap baselines to calculate a transparent fair resale range.",
    metricLabel: "Fair Resale Range",
    metricValue: "₹1,350 — ₹1,650 (Fair)",
  },
  {
    id: 4,
    key: "verified",
    title: "4. VERIFIED",
    badge: "Cryptographic Trust",
    description: "A cryptographic proof shield forms around the product listing, backed by UIDAI offline KYC and serial number validation.",
    metricLabel: "Trust Grade",
    metricValue: "Verified Authenticity (Tier-1)",
  },
  {
    id: 5,
    key: "secure_deal",
    title: "5. SECURE DEAL",
    badge: "Deal Room & Escrow",
    description: "A nearby buyer discovers the listing and agrees to purchase through EcoMatch's protected negotiation deal room.",
    metricLabel: "Agreed Price",
    metricValue: "₹1,450 · Escrow Locked",
  },
  {
    id: 6,
    key: "safe_exchange",
    title: "6. SAFE EXCHANGE",
    badge: "Meeting & Handover",
    description: "Buyer and seller meet at a verified public coordinate. A 6-digit dynamic OTP and QR scan validates physical handover.",
    metricLabel: "Exchange Verification",
    metricValue: "OTP: 849-210 · Handover Confirmed",
  },
  {
    id: 7,
    key: "new_owner",
    title: "7. NEW OWNER",
    badge: "Ownership Transferred",
    description: "The product smoothly transfers to its new owner. The circular ring turns green and an immutable SHA-256 block is minted.",
    metricLabel: "Circular Result",
    metricValue: "Not discarded. Rediscovered.",
  },
];

export default function OneProductSecureJourney() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const [selectedProductType, setSelectedProductType] = useState<"mouse" | "phone">("mouse");
  const [autoPlay, setAutoPlay] = useState(false);

  // Scroll listener to calculate normalized scroll progress (0.0 to 1.0)
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScrollable = rect.height - windowHeight;

      if (totalScrollable <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.max(0, Math.min(1, currentScroll / totalScrollable));
      setScrollProgress(progress);

      const stage = Math.min(6, Math.floor(progress * 7));
      setActiveStageIdx(stage);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-play feature for automated showcase
  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      setActiveStageIdx((prev) => {
        const next = (prev + 1) % 7;
        setScrollProgress(next / 6);
        return next;
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [autoPlay]);

  const currentStage = stages[activeStageIdx];

  // Product photo URLs
  const productImages = {
    mouse: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=700&auto=format&fit=crop&q=80",
    phone: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=700&auto=format&fit=crop&q=80",
  };

  const currentImg = productImages[selectedProductType];

  return (
    <div
      ref={containerRef}
      className="relative min-h-[420vh] w-full bg-gradient-to-b from-[#FAF8F5] via-[#F4F0E8] to-[#EBE4D8] text-[#14221C]"
    >
      {/* Sticky Fullscreen Storytelling Viewport */}
      <div className="sticky top-0 flex h-screen w-full flex-col justify-between overflow-hidden px-4 py-6 sm:px-8 lg:px-12">
        {/* Background Ambient Radial Glows (Forest Emerald & Sage) */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[550px] w-[550px] rounded-full transition-all duration-1000 ${
              activeStageIdx === 6
                ? "bg-[#0E6E4D]/25 blur-[160px]"
                : activeStageIdx >= 3
                ? "bg-[#7B998B]/20 blur-[140px]"
                : "bg-[#7B998B]/15 blur-[120px]"
            }`}
          />
          <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#064430_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        {/* ========================================================= */}
        {/* TOP HEADER & STAGE STEPPER RAIL */}
        {/* ========================================================= */}
        <div className="relative z-30 flex flex-wrap items-center justify-between gap-4 border-b border-[#7B998B]/20 pb-3 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#064430] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#064430]">
                CINEMATIC CIRCULAR JOURNEY
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#064430] tracking-tight">
              One Product. <span className="text-[#0E6E4D]">One Secure Journey.</span>
            </h2>
          </div>

          {/* Stepper Dots Navigation (Clickable) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {stages.map((stage, idx) => {
              const isActive = activeStageIdx === idx;
              const isPast = activeStageIdx > idx;
              return (
                <button
                  key={stage.id}
                  onClick={() => {
                    setActiveStageIdx(idx);
                    setScrollProgress(idx / 6);
                  }}
                  className={`group relative flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-black transition-all ${
                    isActive
                      ? "bg-[#064430] text-[#FAF8F5] shadow-md scale-105"
                      : isPast
                      ? "bg-[#D8E3DC] text-[#064430]"
                      : "bg-[#FAF8F5]/80 text-[#7B998B] hover:bg-[#FAF8F5]"
                  }`}
                >
                  <span>0{stage.id}</span>
                  <span className="hidden md:inline">{stage.key.toUpperCase()}</span>
                </button>
              );
            })}

            {/* Auto-Play Showcase Toggle */}
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className="ml-2 flex h-7 items-center gap-1 rounded-full border border-[#7B998B]/30 bg-[#FAF8F5] px-2.5 text-[10px] font-bold text-[#064430] shadow-sm hover:bg-white transition"
              title="Auto Play Showcase"
            >
              {autoPlay ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              <span className="hidden sm:inline">{autoPlay ? "Pause" : "Play"}</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CENTER STAGE: PERSISTENT FLOATING 3D PRODUCT */}
        {/* ========================================================= */}
        <div className="relative z-20 mx-auto my-auto flex h-[420px] sm:h-[480px] w-full max-w-5xl items-center justify-center [perspective:1400px]">
          {/* Circular Economy Guidance Ring (Turns Green at Stage 7) */}
          <div
            className={`absolute h-[320px] w-[320px] sm:h-[420px] sm:w-[420px] rounded-full border-2 transition-all duration-1000 ${
              activeStageIdx === 6
                ? "border-[#0E6E4D] shadow-[0_0_80px_rgba(14,110,77,0.4)] scale-110"
                : "border-[#7B998B]/20 border-dashed animate-spin"
            }`}
            style={{ animationDuration: "70s" }}
          />

          {/* ======================================================= */}
          {/* THE PERSISTENT FLOATING PRODUCT (TRANSFORMS BY STAGE) */}
          {/* ======================================================= */}
          <div
            className={`relative flex flex-col items-center justify-center transition-all duration-700 ${
              activeStageIdx === 0
                ? "scale-95 translate-y-0"
                : activeStageIdx === 1
                ? "scale-105 -translate-y-3"
                : activeStageIdx === 2
                ? "scale-100 -translate-x-12"
                : activeStageIdx === 3
                ? "scale-105 translate-y-0"
                : activeStageIdx === 4
                ? "scale-95 translate-y-0"
                : activeStageIdx === 5
                ? "scale-100 translate-y-1"
                : "scale-110 translate-x-16"
            }`}
          >
            {/* Ground Shadow */}
            <div className="absolute -bottom-8 h-10 w-52 rounded-full bg-[#064430]/15 blur-xl transition-all duration-700" />

            {/* Product Card Container */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-[#FFFDF9] bg-white/95 p-3.5 shadow-[0_25px_60px_rgba(6,68,48,0.15)] backdrop-blur-xl transition-all duration-700">
              <img
                src={currentImg}
                alt="Persistent Lifecycle Object"
                className="h-48 w-48 sm:h-60 sm:w-60 rounded-2xl object-cover transition-all duration-700"
              />

              {/* ===================================================== */}
              {/* STAGE 1 OVERLAY: Camera Viewfinder */}
              {/* ===================================================== */}
              {activeStageIdx === 0 && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-4">
                  <div className="flex w-full justify-between">
                    <span className="h-4 w-4 border-t-2 border-l-2 border-[#064430]" />
                    <span className="h-4 w-4 border-t-2 border-r-2 border-[#064430]" />
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-md">
                    <Camera className="h-3 w-3 text-[#D8E3DC]" /> Ingestion Snap
                  </div>
                  <div className="flex w-full justify-between">
                    <span className="h-4 w-4 border-b-2 border-l-2 border-[#064430]" />
                    <span className="h-4 w-4 border-b-2 border-r-2 border-[#064430]" />
                  </div>
                </div>
              )}

              {/* ===================================================== */}
              {/* STAGE 2 OVERLAY: Emerald Scanning Beam & Tracking Dots */}
              {/* ===================================================== */}
              {activeStageIdx === 1 && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                  <div className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#0E6E4D] to-transparent shadow-[0_0_15px_rgba(14,110,77,1)] animate-vision-scanline" />
                  <div className="absolute top-1/4 left-1/3 flex h-4 w-4 items-center justify-center">
                    <span className="absolute h-full w-full rounded-full bg-[#0E6E4D] opacity-60 animate-ping" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#064430]" />
                  </div>
                  <div className="absolute bottom-1/3 right-1/4 flex h-4 w-4 items-center justify-center">
                    <span className="absolute h-full w-full rounded-full bg-[#0E6E4D] opacity-60 animate-ping" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#064430]" />
                  </div>
                </div>
              )}

              {/* ===================================================== */}
              {/* STAGE 4 OVERLAY: Cryptographic Verification Shield */}
              {/* ===================================================== */}
              {activeStageIdx === 3 && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[#064430]/10 backdrop-blur-[1px] rounded-2xl animate-in fade-in zoom-in-95">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#064430] text-[#FAF8F5] shadow-xl">
                    <ShieldCheck className="h-8 w-8 text-[#D8E3DC]" />
                  </div>
                  <span className="mt-2 rounded-md bg-[#064430] px-2 py-0.5 text-[9px] font-black uppercase text-[#FAF8F5]">
                    KYC Verified
                  </span>
                </div>
              )}

              {/* ===================================================== */}
              {/* STAGE 6 OVERLAY: Dynamic OTP / QR Scan */}
              {/* ===================================================== */}
              {activeStageIdx === 5 && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl p-3 text-center text-white animate-in fade-in">
                  <QrCode className="h-10 w-10 text-[#D8E3DC]" />
                  <p className="mt-1 font-mono text-sm font-black tracking-widest text-[#FAF8F5]">
                    OTP: 849-210
                  </p>
                  <span className="rounded bg-[#0E6E4D] px-2 py-0.5 text-[9px] font-bold text-white">
                    ✓ Handover Confirmed
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================= */}
          {/* FLOATING CONTEXTUAL CARDS (EMERGING AT EACH STAGE) */}
          {/* ======================================================= */}

          {/* Stage 2 Floating Labels */}
          {activeStageIdx === 1 && (
            <div className="absolute right-4 sm:right-16 top-1/4 z-30 flex flex-col gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-1.5 rounded-xl border border-[#7B998B]/20 bg-[#FFFDF9]/95 px-3 py-1.5 text-xs font-bold text-[#064430] shadow-md">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#0E6E4D]" />
                <span>Product Identified</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-[#7B998B]/20 bg-[#FFFDF9]/95 px-3 py-1.5 text-xs font-bold text-[#064430] shadow-md">
                <Layers className="h-3.5 w-3.5 text-[#7B998B]" />
                <span>Category Detected</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-[#7B998B]/20 bg-[#FFFDF9]/95 px-3 py-1.5 text-xs font-bold text-[#064430] shadow-md">
                <Cpu className="h-3.5 w-3.5 text-[#0E6E4D]" />
                <span>Condition Analyzed</span>
              </div>
            </div>
          )}

          {/* Stage 3 Fair Resale Range Card */}
          {activeStageIdx === 2 && (
            <div className="absolute right-2 sm:right-12 z-30 w-56 rounded-2xl border border-[#7B998B]/25 bg-[#FFFDF9]/95 p-4 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-right-4">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#7B998B]">
                Price Intelligence
              </span>
              <p className="mt-0.5 text-xs font-bold text-[#064430]">Fair Resale Range</p>
              <p className="mt-1 font-mono text-xl font-black text-[#0E6E4D]">₹1,350 — ₹1,650</p>
              <div className="mt-2 border-t border-[#7B998B]/15 pt-2 text-[10px] text-[#5D7B6D]">
                <span>New Market: ₹2,499</span> · <span className="line-through text-slate-400">Scrap: ₹150</span>
              </div>
            </div>
          )}

          {/* Stage 5 Secure Deal Room Connection Nodes */}
          {activeStageIdx === 4 && (
            <div className="absolute inset-x-4 z-30 flex items-center justify-between animate-in fade-in zoom-in-95">
              {/* Seller Node */}
              <div className="flex flex-col items-center rounded-2xl border border-[#7B998B]/20 bg-[#FFFDF9]/95 p-3 shadow-lg">
                <User className="h-5 w-5 text-[#064430]" />
                <span className="mt-1 text-[10px] font-black text-[#064430]">Seller Node</span>
                <span className="text-[9px] text-[#7B998B]">Verified Origin</span>
              </div>

              {/* Central Escrow Capsule */}
              <div className="flex items-center gap-1.5 rounded-full border border-[#064430]/30 bg-[#064430] px-3.5 py-1.5 text-xs font-bold text-[#FAF8F5] shadow-lg">
                <Lock className="h-3.5 w-3.5 text-[#D8E3DC]" />
                <span>EcoMatch Protected Deal</span>
              </div>

              {/* Buyer Node */}
              <div className="flex flex-col items-center rounded-2xl border border-[#7B998B]/20 bg-[#FFFDF9]/95 p-3 shadow-lg">
                <User className="h-5 w-5 text-[#0E6E4D]" />
                <span className="mt-1 text-[10px] font-black text-[#064430]">Buyer Node</span>
                <span className="text-[9px] text-[#7B998B]">Secondary User</span>
              </div>
            </div>
          )}

          {/* Stage 7 Concluding Climax: New Owner & Ledger */}
          {activeStageIdx === 6 && (
            <div className="absolute left-4 sm:left-12 z-30 max-w-xs rounded-2xl border border-[#0E6E4D]/40 bg-[#FFFDF9]/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-left-4">
              <span className="rounded-full bg-[#0E6E4D] px-2 py-0.5 text-[9px] font-black uppercase text-[#FAF8F5]">
                LEDGER BLOCK #89,420
              </span>
              <h4 className="mt-2 text-base font-black text-[#064430]">
                Ownership Transferred
              </h4>
              <p className="mt-1 text-xs text-[#5D7B6D] leading-relaxed">
                Physical handover verified with cryptographic SHA-256 stamp. 100% landfill diversion accomplished.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#0E6E4D]">
                <Leaf className="h-4 w-4" /> Avoided 4.2 kg CO₂e
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* BOTTOM METRICS BANNER & NARRATIVE CAPTION */}
        {/* ========================================================= */}
        <div className="relative z-30 mx-auto max-w-3xl border-t border-[#7B998B]/20 pt-4 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-[#7B998B]/20 bg-[#FFFDF9]/90 p-4 shadow-lg backdrop-blur-md">
            <div className="text-left">
              <span className="rounded-md bg-[#D8E3DC] px-2 py-0.5 text-[10px] font-bold text-[#064430]">
                STAGE 0{currentStage.id}: {currentStage.badge}
              </span>
              <h3 className="mt-1 text-sm sm:text-base font-black text-[#064430]">
                {currentStage.title}
              </h3>
              <p className="text-xs text-[#5D7B6D] max-w-lg mt-0.5">
                {currentStage.description}
              </p>
            </div>

            <div className="rounded-xl border border-[#7B998B]/20 bg-[#FAF8F5] p-2.5 text-right min-w-[170px]">
              <span className="text-[9px] font-bold uppercase text-[#7B998B]">
                {currentStage.metricLabel}
              </span>
              <p className="text-xs sm:text-sm font-black text-[#064430] font-mono mt-0.5">
                {currentStage.metricValue}
              </p>
            </div>
          </div>

          {/* Final Grand Conclusion Text at Stage 7 */}
          {activeStageIdx === 6 && (
            <div className="mt-3 animate-in fade-in duration-700">
              <p className="text-lg sm:text-2xl font-black text-[#064430] tracking-tight">
                “Not discarded. <span className="text-[#0E6E4D]">Rediscovered.</span>”
              </p>
              <p className="text-xs text-[#5D7B6D] font-medium">
                One person&apos;s unused product became another person&apos;s resource.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
