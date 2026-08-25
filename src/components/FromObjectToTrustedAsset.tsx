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
  Laptop,
  Armchair,
  Package,
  PlusCircle,
  Scan,
  Tag,
  AlertTriangle,
  FileText,
  Activity,
  Globe,
  Database,
  ArrowUpRight,
  Play,
  Pause,
  RefreshCw,
  Clock,
  ShieldAlert,
} from "lucide-react";

type Chapter = {
  id: number;
  number: string;
  name: string;
  headline: string;
  subhead: string;
  badge: string;
};

const chapters: Chapter[] = [
  {
    id: 0,
    number: "01",
    name: "Capture",
    badge: "CHAPTER 01 · REAL INGESTION",
    headline: "Every second life starts with a product.",
    subhead: "A seller captures an actual unused product photograph. EcoMatch initializes its live Digital Twin.",
  },
  {
    id: 1,
    number: "02",
    name: "Understand",
    badge: "CHAPTER 02 · ECOMATCH VISION",
    headline: "First, EcoMatch understands it.",
    subhead: "Neural Vision scans physical geometry, extracting structured specs, condition grading, and integrity scores.",
  },
  {
    id: 2,
    number: "03",
    name: "Value",
    badge: "CHAPTER 03 · PRICE INTELLIGENCE",
    headline: "Then, EcoMatch understands its value.",
    subhead: "Online secondary market signals benchmark current demand instead of trusting old MRP or purchase prices.",
  },
  {
    id: 3,
    number: "04",
    name: "Trust",
    badge: "CHAPTER 04 · PROTECTED DEAL ROOM",
    headline: "Understanding the product is not enough.",
    subhead: "Connecting unknown users directly carries risk. EcoMatch attaches a cryptographic Secure Deal ID.",
  },
  {
    id: 4,
    number: "05",
    name: "Meet",
    badge: "CHAPTER 05 · SAFE MEETING PROTOCOL",
    headline: "Online agreement becomes verified physical meeting.",
    subhead: "Verified public checkpoint coordinates with dual participant check-ins ensure physical safety.",
  },
  {
    id: 5,
    number: "06",
    name: "Exchange",
    badge: "CHAPTER 06 · DUAL HANDSHAKE OTP/QR",
    headline: "The deal completes only when the exchange does.",
    subhead: "Dynamic one-time tokens and dual confirmations ensure the product transfers only upon physical inspection.",
  },
  {
    id: 6,
    number: "07",
    name: "Ownership",
    badge: "CHAPTER 07 · DIGITAL PRODUCT PASSPORT",
    headline: "The product changes hands. Its history doesn't disappear.",
    subhead: "The Digital Twin seals into a tamper-proof Digital Product Passport with immutable SHA-256 provenance.",
  },
  {
    id: 7,
    number: "08",
    name: "Reuse",
    badge: "CHAPTER 08 · CIRCULAR ECOSYSTEM",
    headline: "Ownership changes. Value stays in motion.",
    subhead: "This single transaction joins thousands of active circular streams, diverting tons of waste from landfills.",
  },
];

export default function FromObjectToTrustedAsset() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<"mouse" | "phone">("mouse");

  const productImages = {
    mouse: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80",
    phone: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80",
  };

  const currentPhoto = productImages[selectedProductType];
  const currentItemName = selectedProductType === "mouse" ? "HP Wireless Precision Mouse" : "Flagship OLED Smartphone";

  // Scroll listener for sticky scroll progress (0.0 to 1.0)
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

      const chapterIdx = Math.min(7, Math.floor(progress * 8));
      setActiveChapterIdx(chapterIdx);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-play feature
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setActiveChapterIdx((prev) => {
        const next = (prev + 1) % 8;
        setScrollProgress(next / 7);
        return next;
      });
    }, 3200);

    return () => clearInterval(timer);
  }, [autoPlay]);

  const activeChapter = chapters[activeChapterIdx];

  return (
    <div
      ref={containerRef}
      className="relative min-h-[520vh] w-full bg-[#07090e] text-slate-100 selection:bg-sky-500 selection:text-slate-950 font-sans"
    >
      {/* Background Deep Navy Ambient Light Grid */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#38bdf8_1px,transparent_1px),linear-gradient(to_bottom,#38bdf8_1px,transparent_1px)] bg-[size:4rem_4rem] z-0" />

      {/* Sticky Fullscreen Experience Viewport */}
      <div className="sticky top-0 flex h-screen w-full flex-col justify-between overflow-hidden px-4 py-4 sm:px-8 lg:px-12 z-10">
        {/* Soft Ambient Radial Lighting */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full transition-all duration-1000 ${
              activeChapterIdx === 7
                ? "bg-emerald-500/15 blur-[160px]"
                : activeChapterIdx >= 4
                ? "bg-sky-500/15 blur-[150px]"
                : "bg-indigo-500/10 blur-[130px]"
            }`}
          />
        </div>

        {/* ========================================================= */}
        {/* TOP BAR: BRAND TITLE & PERSISTENT CHAPTER ORBIT SYSTEM    */}
        {/* ========================================================= */}
        <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-sky-400 animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">
                CINEMATIC LIFECYCLE STORY
              </span>
            </div>
            <h1 className="text-base sm:text-xl font-black text-white tracking-tight">
              FROM OBJECT TO <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">TRUSTED ASSET</span>
            </h1>
          </div>

          {/* 8-Chapter Stepper Rail (Clickable Navigation) */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {chapters.map((ch, idx) => {
              const isActive = activeChapterIdx === idx;
              const isPast = activeChapterIdx > idx;
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveChapterIdx(idx);
                    setScrollProgress(idx / 7);
                  }}
                  className={`group relative flex h-7 items-center gap-1 rounded-xl px-2.5 text-[10px] font-bold transition-all ${
                    isActive
                      ? "border border-sky-400/50 bg-sky-500/20 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.25)] scale-105"
                      : isPast
                      ? "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                  }`}
                  title={`${ch.number} ${ch.name}`}
                >
                  <span className="font-mono">{ch.number}</span>
                  <span className="hidden md:inline">{ch.name}</span>
                </button>
              );
            })}

            {/* Auto Play Showcase Button */}
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className="ml-2 flex h-7 items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 text-[10px] font-bold text-slate-300 hover:bg-white/10 transition"
              title="Auto Play Experience"
            >
              {autoPlay ? <Pause className="h-3 w-3 text-sky-400" /> : <Play className="h-3 w-3 text-sky-400" />}
              <span className="hidden sm:inline">{autoPlay ? "Pause" : "Auto"}</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN STAGE: PHYSICAL PRODUCT + PROGRESSIVE DIGITAL TWIN   */}
        {/* ========================================================= */}
        <div className="relative z-20 mx-auto my-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-12">
          
          {/* ======================================================= */}
          {/* LEFT: THE PERSISTENT PHYSICAL REUSABLE PRODUCT OBJECT    */}
          {/* ======================================================= */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center [perspective:1400px]">
            <div className="relative flex h-[300px] sm:h-[360px] w-full max-w-[360px] flex-col items-center justify-center">
              
              {/* Circular Guidance Orbit (Turns Emerald at Chapter 8) */}
              <div
                className={`absolute h-[280px] w-[280px] sm:h-[340px] sm:w-[340px] rounded-full border transition-all duration-1000 ${
                  activeChapterIdx === 7
                    ? "border-emerald-400/80 shadow-[0_0_70px_rgba(52,211,153,0.3)] scale-110"
                    : activeChapterIdx >= 3
                    ? "border-sky-400/30 border-dashed animate-spin"
                    : "border-white/10"
                }`}
                style={{ animationDuration: "60s" }}
              />

              {/* Physical Product Floating Chassis */}
              <div
                className={`relative flex flex-col items-center justify-center transition-all duration-700 ${
                  activeChapterIdx === 0
                    ? "scale-95 translate-y-0"
                    : activeChapterIdx === 1
                    ? "scale-105 -translate-y-2"
                    : activeChapterIdx === 2
                    ? "scale-100 -translate-x-4"
                    : activeChapterIdx === 3
                    ? "scale-105 translate-y-0"
                    : activeChapterIdx === 4
                    ? "scale-100 translate-y-1"
                    : activeChapterIdx === 5
                    ? "scale-100 translate-y-1"
                    : activeChapterIdx === 6
                    ? "scale-105 translate-x-6"
                    : "scale-110 translate-y-0"
                }`}
              >
                {/* Physical Object Card */}
                <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0c101a]/90 p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl transition-all duration-700">
                  <img
                    src={currentPhoto}
                    alt="Physical Product"
                    className="h-44 w-44 sm:h-56 sm:w-56 rounded-2xl object-cover"
                  />

                  {/* CHAPTER 1 OVERLAY: Camera Capture Brackets */}
                  {activeChapterIdx === 0 && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-4 animate-in fade-in duration-300">
                      <div className="flex w-full justify-between">
                        <span className="h-4 w-4 border-t-2 border-l-2 border-sky-400" />
                        <span className="h-4 w-4 border-t-2 border-r-2 border-sky-400" />
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full bg-[#080c14]/85 px-3 py-1 text-[10px] font-bold text-sky-300 border border-sky-400/30 backdrop-blur-md">
                        <Camera className="h-3 w-3 text-sky-400" /> Photo Ingested
                      </div>
                      <div className="flex w-full justify-between">
                        <span className="h-4 w-4 border-b-2 border-l-2 border-sky-400" />
                        <span className="h-4 w-4 border-b-2 border-r-2 border-sky-400" />
                      </div>
                    </div>
                  )}

                  {/* CHAPTER 2 OVERLAY: AI Vision Laser Scanline & Crosshairs */}
                  {activeChapterIdx === 1 && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                      <div className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_15px_rgba(56,189,248,1)] animate-vision-scanline" />
                      <div className="absolute top-[26%] left-[30%] flex h-5 w-5 items-center justify-center">
                        <span className="absolute h-full w-full rounded-full bg-sky-400 opacity-75 animate-ping" />
                        <span className="h-2 w-2 rounded-full bg-sky-400" />
                      </div>
                      <div className="absolute bottom-[30%] right-[28%] flex h-5 w-5 items-center justify-center">
                        <span className="absolute h-full w-full rounded-full bg-sky-400 opacity-75 animate-ping" />
                        <span className="h-2 w-2 rounded-full bg-sky-400" />
                      </div>
                    </div>
                  )}

                  {/* CHAPTER 4 OVERLAY: Cryptographic Verification Shield */}
                  {activeChapterIdx === 3 && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-sky-500/10 backdrop-blur-[2px] rounded-2xl animate-in fade-in zoom-in-95 duration-500">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500 text-slate-950 shadow-2xl">
                        <ShieldCheck className="h-9 w-9 text-slate-950" />
                      </div>
                      <span className="mt-2 rounded-lg bg-sky-500 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-950 shadow-md">
                        ✓ Verified Listing
                      </span>
                    </div>
                  )}

                  {/* CHAPTER 6 OVERLAY: Dynamic OTP / QR Handover */}
                  {activeChapterIdx === 5 && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[#080c14]/90 backdrop-blur-md rounded-2xl p-3 text-center text-white animate-in fade-in duration-300">
                      <QrCode className="h-10 w-10 text-sky-400" />
                      <p className="mt-1 font-mono text-sm font-black tracking-widest text-sky-300">
                        OTP: 849-210
                      </p>
                      <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[9px] font-bold text-sky-300 border border-sky-400/30">
                        ✓ Exchange Confirmed
                      </span>
                    </div>
                  )}
                </div>

                <span className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Physical Reusable Object
                </span>
              </div>
            </div>
          </div>

          {/* ======================================================= */}
          {/* RIGHT: THE LIVE EVOLVING DIGITAL TWIN CARD              */}
          {/* ======================================================= */}
          <div className="lg:col-span-6">
            <div className="relative rounded-3xl border border-sky-400/30 bg-[#0c1424]/85 p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(56,189,248,0.2)] backdrop-blur-2xl transition-all duration-700">
              
              {/* Digital Twin Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">
                      {activeChapterIdx >= 6 ? "DIGITAL PRODUCT PASSPORT" : "LIVE DIGITAL TWIN"}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                    {activeChapterIdx === 0
                      ? "UNKNOWN PRODUCT"
                      : activeChapterIdx === 1
                      ? "HP Wireless Mouse (Vision Initialized)"
                      : currentItemName}
                  </h3>
                </div>

                <span className={`rounded-xl px-2.5 py-1 text-[10px] font-mono font-bold uppercase transition-colors ${
                  activeChapterIdx === 0
                    ? "border border-amber-400/30 bg-amber-500/10 text-amber-300"
                    : activeChapterIdx >= 6
                    ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                    : "border border-sky-400/40 bg-sky-500/20 text-sky-300"
                }`}>
                  {activeChapterIdx === 0
                    ? "UNIDENTIFIED"
                    : activeChapterIdx === 1
                    ? "AI PARSED"
                    : activeChapterIdx === 2
                    ? "VALUED"
                    : activeChapterIdx === 3
                    ? "VERIFIED"
                    : activeChapterIdx === 4
                    ? "MATCHED"
                    : activeChapterIdx === 5
                    ? "EXCHANGED"
                    : "TRUSTED ASSET ✓"}
                </span>
              </div>

              {/* Progressive Field Table */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                
                {/* Category Field */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Category</span>
                  <p className="font-bold text-white mt-0.5">
                    {activeChapterIdx >= 1 ? "Computers & Peripherals" : "—"}
                  </p>
                </div>

                {/* Condition Field */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Condition</span>
                  <p className="font-bold text-white mt-0.5">
                    {activeChapterIdx >= 1 ? "Good (Grade A · 94% Intact)" : "—"}
                  </p>
                </div>

                {/* Market Value Field */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Market Value</span>
                  <p className="font-mono font-bold text-sky-300 mt-0.5">
                    {activeChapterIdx >= 2 ? "₹1,350 — ₹1,650 (Fair Range)" : "—"}
                  </p>
                </div>

                {/* Verification Field */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Verification</span>
                  <p className="font-bold text-white mt-0.5">
                    {activeChapterIdx >= 3 ? "UIDAI KYC Authenticated ✓" : "—"}
                  </p>
                </div>

                {/* Deal ID Field */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Deal Status</span>
                  <p className="font-bold text-white mt-0.5">
                    {activeChapterIdx >= 4 ? "Deal ID: ECM-98214-SAFE" : "—"}
                  </p>
                </div>

                {/* Handover & Ownership Field */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Ownership</span>
                  <p className={`font-bold mt-0.5 ${activeChapterIdx >= 6 ? "text-emerald-300" : "text-white"}`}>
                    {activeChapterIdx >= 6 ? "Transferred (Block #89,420)" : activeChapterIdx >= 5 ? "Handover Confirmed" : "—"}
                  </p>
                </div>
              </div>

              {/* Contextual Transformation Ribbon */}
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px]">
                <span className="text-slate-400">
                  {activeChapterIdx === 0
                    ? "Status: Analysis required before listing."
                    : activeChapterIdx === 1
                    ? "EcoMatch Vision: Converting photo into structured attributes."
                    : activeChapterIdx === 2
                    ? "EcoMatch Price Intelligence: Live market signals benchmarked."
                    : activeChapterIdx === 3
                    ? "Trust Layer: Protected transaction pathway unlocked."
                    : activeChapterIdx === 4
                    ? "Meeting Protocol: Public coordinate check-in confirmed."
                    : activeChapterIdx === 5
                    ? "Handover Security: Dual confirmation verified."
                    : activeChapterIdx === 6
                    ? "Digital Passport: Provenance sealed into permanent ledger."
                    : "Circular Result: Kept in motion. 0% Landfill."}
                </span>

                <span className="font-mono text-sky-400 font-bold">
                  {activeChapterIdx + 1}/8 Stages
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM NARRATIVE BANNER & MILESTONE TELEMETRY             */}
        {/* ========================================================= */}
        <div className="relative z-30 mx-auto max-w-4xl border-t border-white/10 pt-3 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0c101a]/90 p-4 shadow-xl backdrop-blur-xl">
            <div className="text-left">
              <span className="rounded-md border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-300">
                {activeChapter.badge}
              </span>
              <h4 className="mt-1 text-sm sm:text-base font-black text-white">
                {activeChapter.headline}
              </h4>
              <p className="text-xs text-slate-400 max-w-xl mt-0.5 leading-relaxed">
                {activeChapter.subhead}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/marketplace"
                className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-sky-400 transition"
              >
                Explore Marketplace
              </Link>
            </div>
          </div>

          {/* Final Grand Conclusion Climax at Chapter 8 */}
          {activeChapterIdx === 7 && (
            <div className="mt-3 animate-in fade-in zoom-in-95 duration-700">
              <p className="text-xl sm:text-3xl font-black text-white tracking-tight">
                “FROM AN UNUSED PRODUCT TO A <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">TRUSTED REUSABLE ASSET.</span>”
              </p>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                AI understands the product. EcoMatch secures the exchange. Ownership keeps moving.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
