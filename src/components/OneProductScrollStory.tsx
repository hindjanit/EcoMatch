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
  PlusCircle,
  Scan,
  Tag,
} from "lucide-react";

type StoryMilestone = {
  id: number;
  stageNumber: string;
  title: string;
  badge: string;
  shortDesc: string;
};

const milestones: StoryMilestone[] = [
  {
    id: 0,
    stageNumber: "01",
    title: "1. PHOTO UPLOAD",
    badge: "Seller Capture",
    shortDesc: "A seller captures and uploads a real photo of their unused product.",
  },
  {
    id: 1,
    stageNumber: "02",
    title: "2. AI UNDERSTOOD",
    badge: "Vision AI Inspection",
    shortDesc: "EcoMatch Vision analyzes the product and reveals 3 floating detection labels.",
  },
  {
    id: 2,
    stageNumber: "03",
    title: "3. PRICE CHECKED",
    badge: "Market Intelligence",
    shortDesc: "Market signals are analyzed to calculate a transparent Fair Resale Range.",
  },
  {
    id: 3,
    stageNumber: "04",
    title: "4. VERIFIED",
    badge: "Green Verification Shield",
    shortDesc: "A protective cryptographic verification shield forms around the product.",
  },
  {
    id: 4,
    stageNumber: "05",
    title: "5. SECURE DEAL",
    badge: "Buyer & Seller Connected",
    shortDesc: "Buyer and seller nodes connect through EcoMatch protected escrow.",
  },
  {
    id: 5,
    stageNumber: "06",
    title: "6. SAFE EXCHANGE",
    badge: "Meeting & OTP Handover",
    shortDesc: "Meeting check-in verified with secure OTP / QR confirmation code.",
  },
  {
    id: 6,
    stageNumber: "07",
    title: "7. NEW OWNER & GREEN RING",
    badge: "Circular Transfer",
    shortDesc: "Product transfers to buyer, ledger record is minted, and circular ring turns green.",
  },
];

export default function OneProductScrollStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeStage, setActiveStage] = useState(0);
  const [selectedItem, setSelectedItem] = useState<"mouse" | "phone">("mouse");
  const [autoPlay, setAutoPlay] = useState(false);

  // High-res clean transparent product imagery
  const productPhotos = {
    mouse: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80",
    phone: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80",
  };

  const currentProductPhoto = productPhotos[selectedItem];
  const currentProductName = selectedItem === "mouse" ? "HP Wireless Precision Mouse" : "Flagship OLED Smartphone";

  // Scroll listener for sticky scroll progression (0.0 to 1.0)
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

      const stageIdx = Math.min(6, Math.floor(progress * 7));
      setActiveStage(stageIdx);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-play presentation loop
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setActiveStage((prev) => {
        const next = (prev + 1) % 7;
        setScrollProgress(next / 6);
        return next;
      });
    }, 2900);

    return () => clearInterval(timer);
  }, [autoPlay]);

  const currentMilestone = milestones[activeStage];

  return (
    <div
      ref={containerRef}
      className="relative min-h-[440vh] w-full bg-gradient-to-b from-[#F6F4EC] via-[#EDE8DE] to-[#E3DCD0] text-[#17332C] selection:bg-[#79B89A] selection:text-[#16352D]"
    >
      {/* Sticky Fullscreen Storytelling Viewport */}
      <div className="sticky top-0 flex h-screen w-full flex-col justify-between overflow-hidden px-4 py-5 sm:px-8 lg:px-12">
        {/* Soft Ambient Radial Lights (Forest Emerald & Soft Mint) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full transition-all duration-1000 ${
              activeStage === 6
                ? "bg-[#145A45]/30 blur-[160px]"
                : activeStage >= 3
                ? "bg-[#79B89A]/20 blur-[140px]"
                : "bg-[#DDEFE6]/40 blur-[130px]"
            }`}
          />
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#145A45_1px,transparent_1px)] [background-size:22px_22px]" />
        </div>

        {/* ========================================================= */}
        {/* TOP BAR: BRAND HEADER & CLICKABLE STAGE STEPPER           */}
        {/* ========================================================= */}
        <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[#79B89A]/25 pb-3 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#145A45] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#145A45]">
                CINEMATIC 3D LIFECYCLE STORY
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-[#16352D]">
              One Product. <span className="text-[#145A45]">One Secure Journey.</span>
            </h1>
          </div>

          {/* Stepper Dots (01 to 07) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {milestones.map((m, idx) => {
              const isActive = activeStage === idx;
              const isPast = activeStage > idx;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveStage(idx);
                    setScrollProgress(idx / 6);
                  }}
                  className={`group relative flex h-7 items-center gap-1 rounded-full px-2.5 text-[10px] font-black transition-all ${
                    isActive
                      ? "bg-[#145A45] text-[#FFFFFF] shadow-md scale-105"
                      : isPast
                      ? "bg-[#DDEFE6] text-[#145A45]"
                      : "bg-[#FFFFFF]/80 text-[#79B89A] hover:bg-[#FFFFFF]"
                  }`}
                  title={m.title}
                >
                  <span>{m.stageNumber}</span>
                  <span className="hidden lg:inline">{m.badge.split(" ")[0]}</span>
                </button>
              );
            })}

            {/* Auto Play Toggle */}
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className="ml-2 flex h-7 items-center gap-1 rounded-full border border-[#79B89A]/30 bg-[#FFFFFF] px-2.5 text-[10px] font-bold text-[#145A45] shadow-sm hover:bg-[#F6F4EC] transition"
            >
              {autoPlay ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              <span className="hidden sm:inline">{autoPlay ? "Pause" : "Auto"}</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CENTER STAGE: PERSISTENT FLOATING 3D PRODUCT OBJECT       */}
        {/* ========================================================= */}
        <div className="relative z-20 mx-auto my-auto flex h-[400px] sm:h-[460px] w-full max-w-5xl items-center justify-center [perspective:1400px]">
          {/* ======================================================= */}
          {/* THE CIRCULAR ECONOMY RING (TURNS RADIANT GREEN AT STAGE 7) */}
          {/* ======================================================= */}
          <div
            className={`absolute h-[340px] w-[340px] sm:h-[430px] sm:w-[430px] rounded-full border-2 transition-all duration-1000 ${
              activeStage === 6
                ? "border-[#145A45] border-solid shadow-[0_0_90px_rgba(20,90,69,0.45)] scale-110"
                : "border-[#79B89A]/25 border-dashed animate-spin"
            }`}
            style={{ animationDuration: "70s" }}
          />

          {/* ======================================================= */}
          {/* THE PERSISTENT FLOATING REUSABLE PRODUCT                */}
          {/* ======================================================= */}
          <div
            className={`relative flex flex-col items-center justify-center transition-all duration-700 ${
              activeStage === 0
                ? "scale-95 translate-y-0"
                : activeStage === 1
                ? "scale-105 -translate-y-2"
                : activeStage === 2
                ? "scale-100 -translate-x-10"
                : activeStage === 3
                ? "scale-105 translate-y-0"
                : activeStage === 4
                ? "scale-95 translate-y-0"
                : activeStage === 5
                ? "scale-100 translate-y-1"
                : "scale-110 translate-x-14"
            }`}
          >
            {/* Ground Shadow underneath the floating product */}
            <div className="absolute -bottom-8 h-10 w-52 rounded-full bg-[#16352D]/15 blur-xl transition-all duration-700" />

            {/* Product Card / Frame */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-[#FFFFFF] bg-white p-3.5 shadow-[0_25px_60px_rgba(20,90,69,0.14)] backdrop-blur-xl transition-all duration-700">
              <img
                src={currentProductPhoto}
                alt="Persistent Reusable Product"
                className="h-48 w-48 sm:h-60 sm:w-60 rounded-2xl object-cover transition-all duration-700"
              />

              {/* --------------------------------------------------- */}
              {/* STAGE 1: SELLER PHOTO UPLOAD VIEWFINDER OVERLAY     */}
              {/* --------------------------------------------------- */}
              {activeStage === 0 && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-4 animate-in fade-in duration-300">
                  <div className="flex w-full justify-between">
                    <span className="h-4 w-4 border-t-2 border-l-2 border-[#145A45]" />
                    <span className="h-4 w-4 border-t-2 border-r-2 border-[#145A45]" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-[#16352D]/80 px-3 py-1 text-[10px] font-bold text-[#FFFFFF] shadow-md backdrop-blur-md">
                    <Camera className="h-3.5 w-3.5 text-[#69D3B0]" /> Photo Ingested
                  </div>
                  <div className="flex w-full justify-between">
                    <span className="h-4 w-4 border-b-2 border-l-2 border-[#145A45]" />
                    <span className="h-4 w-4 border-b-2 border-r-2 border-[#145A45]" />
                  </div>
                </div>
              )}

              {/* --------------------------------------------------- */}
              {/* STAGE 2: EMERALD AI SCANNING BEAM & TRACKING DOTS   */}
              {/* --------------------------------------------------- */}
              {activeStage === 1 && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                  {/* Vertical Emerald Laser Scanline */}
                  <div className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#69D3B0] to-transparent shadow-[0_0_15px_rgba(105,211,176,1)] animate-vision-scanline" />
                  {/* CV Tracking Crosshairs */}
                  <div className="absolute top-[26%] left-[30%] flex h-5 w-5 items-center justify-center">
                    <span className="absolute h-full w-full rounded-full bg-[#145A45] opacity-75 animate-ping" />
                    <span className="h-2 w-2 rounded-full bg-[#145A45]" />
                  </div>
                  <div className="absolute bottom-[30%] right-[28%] flex h-5 w-5 items-center justify-center">
                    <span className="absolute h-full w-full rounded-full bg-[#145A45] opacity-75 animate-ping" />
                    <span className="h-2 w-2 rounded-full bg-[#145A45]" />
                  </div>
                </div>
              )}

              {/* --------------------------------------------------- */}
              {/* STAGE 4: GREEN VERIFICATION SHIELD                  */}
              {/* --------------------------------------------------- */}
              {activeStage === 3 && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[#145A45]/15 backdrop-blur-[2px] rounded-2xl animate-in fade-in zoom-in-95 duration-500">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#145A45] text-[#FFFFFF] shadow-2xl">
                    <ShieldCheck className="h-10 w-10 text-[#69D3B0]" />
                  </div>
                  <span className="mt-2 rounded-lg bg-[#145A45] px-3 py-0.5 text-[10px] font-black uppercase text-[#FFFFFF] shadow-md">
                    ✓ Verified Listing
                  </span>
                </div>
              )}

              {/* --------------------------------------------------- */}
              {/* STAGE 6: DYNAMIC OTP & QR CONFIRMATION              */}
              {/* --------------------------------------------------- */}
              {activeStage === 5 && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[#16352D]/85 backdrop-blur-sm rounded-2xl p-3 text-center text-[#FAF8F5] animate-in fade-in duration-300">
                  <QrCode className="h-11 w-11 text-[#69D3B0]" />
                  <p className="mt-1 font-mono text-sm font-black tracking-widest text-[#FFFFFF]">
                    OTP: 849-210
                  </p>
                  <span className="rounded-md bg-[#145A45] px-2 py-0.5 text-[9px] font-bold text-[#DDEFE6]">
                    ✓ QR Confirmed
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================= */}
          {/* FLOATING CONTEXTUAL CARDS AT EACH STAGE                 */}
          {/* ======================================================= */}

          {/* Stage 2: The 3 Floating Labels */}
          {activeStage === 1 && (
            <div className="absolute right-2 sm:right-12 top-1/4 z-30 flex flex-col gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-2 rounded-xl border border-[#79B89A]/30 bg-[#FFFFFF]/95 px-3.5 py-2 text-xs font-bold text-[#145A45] shadow-md backdrop-blur-md">
                <Tag className="h-3.5 w-3.5 text-[#145A45]" />
                <span>Product Identified</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#79B89A]/30 bg-[#FFFFFF]/95 px-3.5 py-2 text-xs font-bold text-[#145A45] shadow-md backdrop-blur-md">
                <Layers className="h-3.5 w-3.5 text-[#79B89A]" />
                <span>Category Detected</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#79B89A]/30 bg-[#FFFFFF]/95 px-3.5 py-2 text-xs font-bold text-[#145A45] shadow-md backdrop-blur-md">
                <Cpu className="h-3.5 w-3.5 text-[#69D3B0]" />
                <span>Condition Analyzed</span>
              </div>
            </div>
          )}

          {/* Stage 3: Fair Resale Range Card */}
          {activeStage === 2 && (
            <div className="absolute right-2 sm:right-8 z-30 w-60 rounded-3xl border border-[#79B89A]/35 bg-[#FFFFFF]/95 p-5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-500">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#79B89A]">
                PRICE INTELLIGENCE
              </span>
              <h4 className="text-sm font-black text-[#16352D] mt-0.5">Fair Resale Range</h4>
              <p className="mt-1 font-mono text-2xl font-black text-[#145A45]">₹1,350 — ₹1,650</p>
              <div className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-[#17332C]/70">
                <p>Asking Price: <strong className="text-[#145A45]">₹1,450 (Fair Price ✓)</strong></p>
                <p className="text-[9px] text-[#79B89A] mt-0.5">Market Demand: High</p>
              </div>
            </div>
          )}

          {/* Stage 5: Buyer and Seller Nodes Connected via EcoMatch */}
          {activeStage === 4 && (
            <div className="absolute inset-x-2 sm:inset-x-8 z-30 flex items-center justify-between animate-in fade-in zoom-in-95 duration-500">
              <div className="flex flex-col items-center rounded-2xl border border-[#79B89A]/30 bg-[#FFFFFF]/95 p-3.5 shadow-lg min-w-[120px]">
                <User className="h-5 w-5 text-[#145A45]" />
                <span className="mt-1 text-[11px] font-black text-[#16352D]">Seller Node</span>
                <span className="text-[9px] text-[#79B89A]">Verified Origin</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-[#145A45] bg-[#145A45] px-4 py-2 text-xs font-bold text-[#FFFFFF] shadow-xl">
                <Lock className="h-3.5 w-3.5 text-[#69D3B0]" />
                <span>EcoMatch Protected Deal</span>
              </div>

              <div className="flex flex-col items-center rounded-2xl border border-[#79B89A]/30 bg-[#FFFFFF]/95 p-3.5 shadow-lg min-w-[120px]">
                <User className="h-5 w-5 text-[#145A45]" />
                <span className="mt-1 text-[11px] font-black text-[#16352D]">Buyer Node</span>
                <span className="text-[9px] text-[#79B89A]">Verified Recipient</span>
              </div>
            </div>
          )}

          {/* Stage 7: Concluding Ownership Record */}
          {activeStage === 6 && (
            <div className="absolute left-2 sm:left-10 z-30 max-w-xs rounded-3xl border-2 border-[#145A45]/40 bg-[#FFFFFF]/95 p-5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-left-4 duration-500">
              <span className="rounded-full bg-[#145A45] px-2.5 py-0.5 text-[9px] font-black uppercase text-[#FFFFFF]">
                BLOCK #89,420 MINTED
              </span>
              <h4 className="mt-2 text-base font-black text-[#16352D]">
                Ownership Transferred ✓
              </h4>
              <p className="mt-1 text-xs text-[#17332C]/80 leading-relaxed">
                Physical exchange verified. Product successfully given a second life.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#145A45]">
                <Leaf className="h-4 w-4" /> 100% Landfill Diversion
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* BOTTOM NARRATIVE BANNER & STAGE MILESTONE DETAILS         */}
        {/* ========================================================= */}
        <div className="relative z-30 mx-auto max-w-3xl border-t border-[#79B89A]/20 pt-4 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-[#79B89A]/25 bg-[#FFFFFF]/90 p-4 shadow-lg backdrop-blur-md">
            <div className="text-left">
              <span className="rounded-md bg-[#DDEFE6] px-2.5 py-0.5 text-[10px] font-black text-[#145A45]">
                STAGE {currentMilestone.stageNumber}: {currentMilestone.badge}
              </span>
              <h3 className="mt-1 text-sm sm:text-base font-black text-[#16352D]">
                {currentMilestone.title}
              </h3>
              <p className="text-xs text-[#17332C]/75 max-w-lg mt-0.5">
                {currentMilestone.shortDesc}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/marketplace"
                className="rounded-xl bg-[#145A45] px-4 py-2.5 text-xs font-bold text-[#FFFFFF] shadow-sm hover:bg-[#16352D] transition"
              >
                Explore Marketplace
              </Link>
            </div>
          </div>

          {/* Final Grand Climax Message at Stage 7 */}
          {activeStage === 6 && (
            <div className="mt-4 animate-in fade-in zoom-in-95 duration-700">
              <p className="text-2xl sm:text-4xl font-black text-[#16352D] tracking-tight">
                “Not discarded. <span className="text-[#145A45]">Rediscovered.</span>”
              </p>
              <p className="text-xs text-[#17332C]/70 mt-1 font-medium">
                One person&apos;s unused product became another person&apos;s resource.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
