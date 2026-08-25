"use client";

import { useEffect, useRef, useState, useMemo } from "react";
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
  CircleDollarSign,
  PlusCircle,
  Search,
  SlidersHorizontal,
  ChevronRight,
  RefreshCw,
  Play,
  Pause,
  Award,
  Globe,
  Tag,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  Scan,
} from "lucide-react";

// ============================================================================
// COLOR SYSTEM DEFINITIONS (Exact Specification)
// ============================================================================
// Forest Emerald: #145A45
// Deep Forest:   #16352D
// Sage Green:    #79B89A
// Soft Mint:     #DDEFE6
// Warm Ivory:    #F6F4EC
// Pure White:    #FFFFFF
// Dark Text:     #17332C
// Soft Mint Glow: #69D3B0
// Muted Champagne: #C7A85A
// ============================================================================

type OrbitProduct = {
  id: string;
  name: string;
  category: string;
  price: string;
  co2: string;
  icon: any;
  angle: number;
  image: string;
};

const orbitProducts: OrbitProduct[] = [
  {
    id: "mouse",
    name: "HP Wireless Precision Mouse",
    category: "Electronics",
    price: "₹1,450",
    co2: "-4.2 kg CO₂e",
    icon: Mouse,
    angle: 0,
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "phone",
    name: "Flagship OLED Smartphone",
    category: "Mobile Phones",
    price: "₹24,500",
    co2: "-18.4 kg CO₂e",
    icon: Smartphone,
    angle: 45,
    image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "laptop",
    name: "Aluminum Ultrabook 14\"",
    category: "Computers",
    price: "₹42,000",
    co2: "-34.8 kg CO₂e",
    icon: Laptop,
    angle: 90,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "chair",
    name: "Ergonomic Task Chair",
    category: "Furniture",
    price: "₹6,200",
    co2: "-22.5 kg CO₂e",
    icon: Armchair,
    angle: 135,
    image: "https://images.unsplash.com/photo-1580481077197-0f8d95190987?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "package",
    name: "Recycled Corrugated Mailers",
    category: "Packaging",
    price: "₹850",
    co2: "-8.1 kg CO₂e",
    icon: Package,
    angle: 180,
    image: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "metal",
    name: "6061-T6 Aluminum Sheets",
    category: "Metals",
    price: "₹14,200",
    co2: "-58.0 kg CO₂e",
    icon: Layers,
    angle: 225,
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "pcb",
    name: "Precision Micro-Controller",
    category: "Components",
    price: "₹3,400",
    co2: "-12.6 kg CO₂e",
    icon: Cpu,
    angle: 270,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "servo",
    name: "High-Torque Servo Motor",
    category: "Machinery",
    price: "₹18,900",
    co2: "-42.8 kg CO₂e",
    icon: Boxes,
    angle: 315,
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
  },
];

const sampleMarketplaceCards = [
  {
    id: "p1",
    title: "HP Wireless Precision Mouse (Nano USB)",
    category: "Electronics",
    price: "₹1,450",
    condition: "Good",
    location: "Indiranagar, Bangalore",
    co2: "4.2 kg",
    badges: ["AI Analyzed", "Verified", "Fair Price"],
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "p2",
    title: "Apple MacBook Air M2 13.6\" 256GB",
    category: "Computers",
    price: "₹62,000",
    condition: "Like New",
    location: "Koramangala, Bangalore",
    co2: "34.8 kg",
    badges: ["AI Analyzed", "Secure Deal", "Verified"],
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "p3",
    title: "Ergonomic Mesh Task Office Chair",
    category: "Furniture",
    price: "₹5,800",
    condition: "Grade A",
    location: "Whitefield, Bangalore",
    co2: "22.5 kg",
    badges: ["Verified", "Fair Price"],
    image: "https://images.unsplash.com/photo-1580481077197-0f8d95190987?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "p4",
    title: "6061-T6 Aircraft Aluminum Sheet Offcuts (50kg)",
    category: "Metals",
    price: "₹12,400",
    condition: "Surplus Lot",
    location: "Peenya Industrial Area",
    co2: "58.0 kg",
    badges: ["AI Analyzed", "Verified", "Secure Deal"],
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80",
  },
];

export default function Cinematic3DEcoMatchStory() {
  const [mounted, setMounted] = useState(false);
  const [orbitAngle, setOrbitAngle] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Story Progression State (0 to 6)
  const [storyStage, setStoryStage] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [cardRevealCount, setCardRevealCount] = useState(5);
  const [securityShieldLevel, setSecurityShieldLevel] = useState(7);
  const [exchangeVerified, setExchangeVerified] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(orbitProducts[0]);
  const [marketSearchQuery, setMarketSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);

    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      setOrbitAngle((prev) => (prev + delta * 0.007) % 360);
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 12;
    const y = (e.clientY / window.innerHeight - 0.5) * -12;
    setMousePos({ x, y });
  };

  const handleTriggerScan = () => {
    setIsScanning(true);
    setCardRevealCount(0);
    setTimeout(() => setCardRevealCount(1), 400);
    setTimeout(() => setCardRevealCount(2), 800);
    setTimeout(() => setCardRevealCount(3), 1200);
    setTimeout(() => setCardRevealCount(4), 1600);
    setTimeout(() => {
      setCardRevealCount(5);
      setIsScanning(false);
    }, 2000);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-full overflow-hidden bg-[#F6F4EC] text-[#17332C] transition-colors selection:bg-[#79B89A] selection:text-[#16352D]"
    >
      {/* Background Subtle Coordinate Dot Grid */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] bg-[radial-gradient(#145A45_1px,transparent_1px)] [background-size:24px_24px] z-0" />

      {/* =================================================================== */}
      {/* SECTION 1 — CINEMATIC 3D HERO (DON'T DISCARD IT. ECOMATCH IT.)      */}
      {/* =================================================================== */}
      <section className="relative min-h-[95vh] w-full flex flex-col justify-between pt-32 pb-12 px-4 sm:px-6 lg:px-8 z-10">
        {/* Soft Ambient Radial Light (Forest Emerald & Soft Mint) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-gradient-to-br from-[#79B89A]/20 via-[#DDEFE6]/30 to-transparent blur-[160px]" />
          <div className="absolute top-1/3 right-10 h-80 w-80 rounded-full bg-[#145A45]/10 blur-[130px]" />
          <div className="absolute bottom-10 left-10 h-72 w-72 rounded-full bg-[#79B89A]/15 blur-[110px]" />
        </div>

        {/* Top Trust Capsule */}
        <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-[#79B89A]/35 bg-[#FFFFFF]/90 px-4 py-1.5 shadow-[0_4px_20px_rgba(20,90,69,0.06)] backdrop-blur-xl transition hover:scale-105">
          <span className="flex h-2 w-2 rounded-full bg-[#145A45] animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wider text-[#145A45]">
            CIRCULAR RESALE & REUSE ECOSYSTEM
          </span>
          <span className="hidden sm:inline text-xs text-[#79B89A]">·</span>
          <span className="hidden sm:inline text-xs font-semibold text-[#16352D]">
            Useful products deserve another life.
          </span>
        </div>

        {/* Grand Headline & Supporting Copy */}
        <div className="mx-auto mt-6 max-w-4xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-[#16352D] sm:text-6xl lg:text-7xl leading-[1.05]">
            DON’T DISCARD IT. <br />
            <span className="bg-gradient-to-r from-[#145A45] via-[#16352D] to-[#69D3B0] bg-clip-text text-transparent">
              ECOMATCH IT.
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#17332C]/80 sm:text-base md:text-lg font-medium">
            AI-powered discovery, smarter pricing and secure exchanges that give useful products another life.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/marketplace"
              className="group flex items-center gap-2.5 rounded-2xl bg-[#145A45] px-8 py-4 text-sm font-bold text-[#FFFFFF] shadow-[0_12px_35px_rgba(20,90,69,0.25)] transition-all hover:bg-[#16352D] hover:shadow-[0_18px_45px_rgba(22,53,45,0.35)] hover:scale-105 active:scale-95"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1 text-[#DDEFE6]" />
            </Link>

            <Link
              href="/seller/add-product"
              className="flex items-center gap-2 rounded-2xl border border-[#79B89A]/30 bg-[#FFFFFF]/90 px-7 py-4 text-sm font-bold text-[#145A45] shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-xl transition hover:bg-[#FFFFFF] hover:shadow-[0_10px_30px_rgba(20,90,69,0.1)] hover:scale-105"
            >
              <PlusCircle className="h-4 w-4 text-[#145A45]" />
              <span>Sell Something</span>
            </Link>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3D FLOATING CIRCULAR ECOSYSTEM (8 ORBITING REUSABLE PRODUCTS)     */}
        {/* ================================================================= */}
        <div
          className="relative mx-auto mt-10 flex h-[360px] sm:h-[420px] lg:h-[460px] w-full max-w-5xl items-center justify-center [perspective:1400px]"
          style={{
            transform: `rotateX(${mousePos.y}deg) rotateY(${mousePos.x}deg)`,
            transition: "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        >
          {/* Orbital Concentric Guidance Rings */}
          <div className="absolute inset-4 rounded-full border border-[#79B89A]/20 shadow-[0_0_60px_rgba(121,184,154,0.12)]" />
          <div
            className="absolute inset-12 rounded-full border border-dashed border-[#145A45]/25 animate-spin"
            style={{ animationDuration: "65s" }}
          />
          <div className="absolute inset-24 rounded-full border border-[#79B89A]/30" />

          {/* Central Glowing EcoMatch Core */}
          <div className="relative z-10 flex h-36 w-36 sm:h-44 sm:w-44 flex-col items-center justify-center rounded-full border-2 border-[#69D3B0]/40 bg-gradient-to-br from-[#145A45] via-[#16352D] to-[#0A261E] p-4 text-center text-[#FFFFFF] shadow-[0_20px_60px_rgba(20,90,69,0.35),inset_0_2px_10px_rgba(105,211,176,0.3)] backdrop-blur-2xl">
            <div className="relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#69D3B0] to-[#79B89A] text-[#16352D] shadow-md">
              <Leaf className="h-6 w-6 sm:h-7 sm:w-7 text-[#16352D]" />
            </div>
            <span className="mt-2 text-xs sm:text-sm font-black tracking-tight text-[#FFFFFF]">
              Eco<span className="text-[#69D3B0]">Match</span>
            </span>
            <span className="text-[9px] font-mono font-bold text-[#DDEFE6] tracking-wider">
              CIRCULAR HUB
            </span>
          </div>

          {/* 8 Floating Orbiting Products */}
          {orbitProducts.map((prod) => {
            const currentAngle = (prod.angle + orbitAngle) * (Math.PI / 180);
            const radius = 155;
            const x = Math.cos(currentAngle) * radius;
            const y = Math.sin(currentAngle) * radius;
            const Icon = prod.icon;
            const isProtagonist = prod.id === selectedProduct.id;

            return (
              <div
                key={prod.id}
                onClick={() => setSelectedProduct(prod)}
                style={{
                  transform: `translate3d(${x}px, ${y}px, 0px)`,
                }}
                className="absolute z-20 flex cursor-pointer items-center justify-center group"
                title={`${prod.name} (Click to make journey protagonist)`}
              >
                <div
                  className={`relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border bg-[#FFFFFF] shadow-lg transition-all duration-300 ${
                    isProtagonist
                      ? "border-[#145A45] scale-125 shadow-[0_12px_30px_rgba(20,90,69,0.35)] ring-2 ring-[#69D3B0]"
                      : "border-[#79B89A]/30 hover:border-[#145A45] hover:scale-110"
                  }`}
                >
                  <Icon className="h-6 w-6 text-[#145A45]" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#69D3B0] opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#145A45]" />
                  </span>
                </div>

                {/* Hover Popover */}
                <div className="absolute top-14 -left-16 z-40 hidden w-44 rounded-2xl border border-[#79B89A]/30 bg-[#FFFFFF]/95 p-3 shadow-2xl backdrop-blur-2xl group-hover:block animate-in fade-in zoom-in-95">
                  <p className="text-[9px] uppercase font-bold text-[#145A45]">{prod.category}</p>
                  <p className="text-xs font-bold text-[#16352D] truncate">{prod.name}</p>
                  <div className="mt-1.5 flex items-center justify-between border-t border-slate-100 pt-1 text-[10px]">
                    <span className="font-mono font-bold text-[#145A45]">{prod.price}</span>
                    <span className="font-bold text-[#79B89A]">{prod.co2}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Small Trust Strip Below Hero */}
        <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 rounded-2xl border border-[#79B89A]/20 bg-[#FFFFFF]/70 px-6 py-3 shadow-sm backdrop-blur-md text-xs font-bold text-[#16352D]">
          <span className="flex items-center gap-1.5 text-[#145A45]">
            <Sparkles className="h-3.5 w-3.5" /> AI Analyzed
          </span>
          <span className="flex items-center gap-1.5 text-[#16352D]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#79B89A]" /> Verified Listings
          </span>
          <span className="flex items-center gap-1.5 text-[#145A45]">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure Exchange
          </span>
          <span className="flex items-center gap-1.5 text-[#16352D]">
            <ArrowUpRight className="h-3.5 w-3.5 text-[#79B89A]" /> Traceable Ownership
          </span>
        </div>
      </section>

      {/* =================================================================== */}
      {/* HERO ➔ SCROLL TRANSITION BANNER                                      */}
      {/* =================================================================== */}
      <section className="relative px-4 py-8 text-center border-t border-[#79B89A]/20 bg-gradient-to-b from-[#F6F4EC] to-[#EDE7D9]">
        <div className="mx-auto max-w-2xl">
          <span className="rounded-full bg-[#DDEFE6] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#145A45]">
            FOCUSING ON LIFECYCLE PROTAGONIST
          </span>
          <h3 className="mt-2 text-lg sm:text-xl font-bold text-[#16352D]">
            Follow the journey of: <strong className="text-[#145A45]">{selectedProduct.name}</strong>
          </h3>
          <p className="text-xs text-[#17332C]/70 mt-1">
            As you scroll, this single product travels through AI scanning, fair valuation, verification, safe deal, exchange, and new ownership.
          </p>
        </div>
      </section>

      {/* =================================================================== */}
      {/* SECTION 2 — AI VISION SCAN                                          */}
      {/* =================================================================== */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8 border-t border-[#79B89A]/20 bg-[#FAF8F5]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <span className="rounded-full bg-[#DDEFE6] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#145A45]">
              STAGE 02 · NEURAL VISION
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black text-[#16352D] tracking-tight">
              EcoMatch understands what you’re selling.
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-[#17332C]/80 leading-relaxed">
              Capture the product. EcoMatch Vision identifies it, understands its category and estimates its visible condition.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-12 items-center">
            {/* Left: Central Floating Product with Emerald Scanline */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center">
              <div className="relative flex h-[340px] w-full max-w-[380px] flex-col items-center justify-center">
                {/* Floating Product Card */}
                <div className="relative overflow-hidden rounded-3xl border-2 border-[#FFFFFF] bg-white p-3 shadow-[0_20px_50px_rgba(20,90,69,0.15)]">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="h-56 w-56 sm:h-64 sm:w-64 rounded-2xl object-cover"
                  />

                  {/* Emerald Scanning Beam */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                    <div className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#69D3B0] to-transparent shadow-[0_0_15px_rgba(105,211,176,1)] animate-vision-scanline" />
                  </div>

                  {/* CV Optical Tracking Points */}
                  <div className="pointer-events-none absolute inset-0 p-3">
                    <div className="absolute top-[28%] left-[32%] flex h-5 w-5 items-center justify-center">
                      <span className="absolute h-full w-full rounded-full bg-[#145A45] opacity-75 animate-ping" />
                      <span className="h-2 w-2 rounded-full bg-[#145A45]" />
                      <span className="absolute -top-1 -left-1 h-2 w-2 border-t-2 border-l-2 border-[#145A45]" />
                      <span className="absolute -bottom-1 -right-1 h-2 w-2 border-b-2 border-r-2 border-[#145A45]" />
                    </div>
                    <div className="absolute bottom-[35%] right-[28%] flex h-5 w-5 items-center justify-center">
                      <span className="absolute h-full w-full rounded-full bg-[#145A45] opacity-75 animate-ping" />
                      <span className="h-2 w-2 rounded-full bg-[#145A45]" />
                      <span className="absolute -top-1 -left-1 h-2 w-2 border-t-2 border-l-2 border-[#145A45]" />
                      <span className="absolute -bottom-1 -right-1 h-2 w-2 border-b-2 border-r-2 border-[#145A45]" />
                    </div>
                  </div>
                </div>

                {/* Ground Plane Disk */}
                <div className="absolute -bottom-2 z-0 h-16 w-64 rounded-[100%] border border-[#79B89A]/30 bg-[#EDE7D9]/60 blur-[1px]" />
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleTriggerScan}
                  className="flex items-center gap-1.5 rounded-xl bg-[#145A45] px-4 py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#16352D] transition shadow-md"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Re-trigger Scan
                </button>
                <Link
                  href="/ai-classify"
                  className="flex items-center gap-1.5 rounded-xl border border-[#79B89A]/30 bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#145A45] hover:bg-[#F6F4EC] transition shadow-sm"
                >
                  See EcoMatch Vision →
                </Link>
              </div>
            </div>

            {/* Right: Floating Information Cards (One-by-One) */}
            <div className="lg:col-span-6 space-y-3">
              {cardRevealCount >= 1 && (
                <div className="rounded-2xl border border-[#79B89A]/30 bg-[#FFFFFF] p-4 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#79B89A]">Product Identified</span>
                  <h4 className="text-base font-black text-[#16352D] mt-0.5">{selectedProduct.name}</h4>
                </div>
              )}

              {cardRevealCount >= 2 && (
                <div className="rounded-2xl border border-[#79B89A]/30 bg-[#FFFFFF] p-4 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#79B89A]">Category</span>
                  <h4 className="text-base font-black text-[#145A45] mt-0.5">{selectedProduct.category}</h4>
                </div>
              )}

              {cardRevealCount >= 3 && (
                <div className="rounded-2xl border border-[#79B89A]/30 bg-[#FFFFFF] p-4 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#79B89A]">Condition</span>
                  <h4 className="text-base font-black text-[#16352D] mt-0.5">Good (Grade A, 94% Structural Integrity)</h4>
                </div>
              )}

              {cardRevealCount >= 4 && (
                <div className="rounded-2xl border border-[#79B89A]/30 bg-[#FFFFFF] p-4 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#79B89A]">AI Confidence</span>
                  <h4 className="text-base font-black text-[#145A45] font-mono mt-0.5">94% Optical Match</h4>
                </div>
              )}

              {cardRevealCount >= 5 && (
                <div className="rounded-2xl border border-[#69D3B0]/50 bg-[#DDEFE6]/80 p-4 shadow-md animate-in fade-in slide-in-from-right-4 duration-300">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#145A45]">Reuse Potential</span>
                  <h4 className="text-base font-black text-[#145A45] mt-0.5">High · Immediate Secondary Usability</h4>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* SECTION 3 — PRICE INTELLIGENCE                                      */}
      {/* =================================================================== */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8 border-t border-[#79B89A]/20 bg-[#F6F4EC]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <span className="rounded-full bg-[#DDEFE6] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#145A45]">
              STAGE 03 · VALUATION ALGORITHM
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black text-[#16352D] tracking-tight">
              Know its value before you sell it.
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-[#17332C]/80 leading-relaxed">
              EcoMatch does not blindly trust historical MRP or purchase price. It benchmarks current online market signals against raw scrap baselines.
            </p>
          </div>

          {/* Market Signals Floating into Price Intelligence Engine */}
          <div className="mt-12 grid gap-8 lg:grid-cols-12 items-center">
            {/* Left: Stream of online market signals */}
            <div className="lg:col-span-5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#145A45]">
                1. Live Secondary Market Signals
              </span>
              <div className="flex gap-2.5">
                <span className="rounded-xl border border-[#79B89A]/30 bg-white px-3.5 py-2 text-xs font-bold font-mono text-slate-700 shadow-sm">
                  ₹549 (Flipkart Refurb)
                </span>
                <span className="rounded-xl border border-[#79B89A]/30 bg-white px-3.5 py-2 text-xs font-bold font-mono text-slate-700 shadow-sm">
                  ₹599 (Amazon Renewed)
                </span>
                <span className="rounded-xl border border-[#79B89A]/30 bg-white px-3.5 py-2 text-xs font-bold font-mono text-slate-700 shadow-sm">
                  ₹629 (Croma Store)
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-[#79B89A]/25 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-bold text-[#145A45] uppercase">Formula Engine</p>
                <p className="mt-1 font-mono text-xs font-bold text-[#16352D]">
                  CURRENT MARKET + PRODUCT AGE + CONDITION → FAIR RESALE RANGE
                </p>
              </div>
            </div>

            {/* Right: Premium Fair Resale Range Card & Value Meter */}
            <div className="lg:col-span-7 rounded-3xl border border-[#79B89A]/30 bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#79B89A]">
                    VALUATION CARD (DEMO VALUES)
                  </span>
                  <h4 className="text-lg font-black text-[#16352D]">Fair Resale Range</h4>
                </div>
                <span className="rounded-full bg-[#DDEFE6] px-3 py-1 text-xs font-bold text-[#145A45]">
                  ✓ Verified Range
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#79B89A]/20 bg-[#FAF8F5] p-4">
                  <span className="text-[10px] font-bold uppercase text-[#79B89A]">Fair Market Range</span>
                  <p className="text-2xl sm:text-3xl font-black font-mono text-[#145A45] mt-1">
                    ₹350 — ₹450
                  </p>
                </div>

                <div className="rounded-2xl border border-[#79B89A]/20 bg-[#FAF8F5] p-4">
                  <span className="text-[10px] font-bold uppercase text-[#79B89A]">Seller Asking Price</span>
                  <p className="text-2xl sm:text-3xl font-black font-mono text-[#16352D] mt-1">
                    ₹399 <span className="text-xs font-bold text-[#145A45]">(Fair Price ✓)</span>
                  </p>
                </div>
              </div>

              {/* Horizontal Value Meter */}
              <div className="pt-2">
                <div className="flex justify-between text-xs font-bold text-[#16352D]">
                  <span>Scrap Baseline: ₹80</span>
                  <span className="text-[#145A45]">Fair Resale: ₹399</span>
                  <span>New Retail: ₹799</span>
                </div>
                <div className="mt-2 h-3 w-full rounded-full bg-[#EDE7D9] overflow-hidden p-0.5">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#79B89A] via-[#145A45] to-[#69D3B0] w-3/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* SECTION 4 — MARKETPLACE TRANSITION                                  */}
      {/* =================================================================== */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8 border-t border-[#79B89A]/20 bg-[#FAF8F5]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <span className="rounded-full bg-[#DDEFE6] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#145A45]">
              STAGE 04 · MARKETPLACE INTEGRATION
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black text-[#16352D] tracking-tight">
              Someone already has what you need.
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-[#17332C]/80">
              The analyzed product seamlessly enters the verified circular marketplace.
            </p>
          </div>

          {/* Large Search Input */}
          <div className="mt-8 mx-auto max-w-2xl">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-[#79B89A]" />
              <input
                type="text"
                value={marketSearchQuery}
                onChange={(e) => setMarketSearchQuery(e.target.value)}
                placeholder="Search electronics, furniture, metals, machinery..."
                className="w-full rounded-2xl border border-[#79B89A]/40 bg-white py-4 pl-12 pr-4 text-sm font-semibold text-[#16352D] shadow-md placeholder:text-slate-400 focus:border-[#145A45] focus:outline-none"
              />
            </div>

            {/* Category Chips */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {["Electronics", "Furniture", "Metals", "Machinery", "Construction", "Packaging", "Industrial Goods"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setMarketSearchQuery(cat)}
                  className="rounded-xl border border-[#79B89A]/25 bg-white px-3 py-1 text-xs font-bold text-[#16352D] hover:bg-[#DDEFE6] transition"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Marketplace Cards with Subtle 3D Depth */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {sampleMarketplaceCards.map((card) => (
              <div
                key={card.id}
                className="group rounded-3xl border border-[#79B89A]/25 bg-white p-4 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 hover:border-[#145A45]"
              >
                <div className="relative overflow-hidden rounded-2xl h-44 w-full bg-slate-100">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {card.badges.map((b, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-[#16352D]/85 backdrop-blur-md px-2 py-0.5 text-[9px] font-black uppercase text-[#FAF8F5]"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#79B89A]">{card.category}</span>
                  <h4 className="text-sm font-bold text-[#16352D] truncate">{card.title}</h4>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="font-mono text-base font-black text-[#145A45]">{card.price}</span>
                    <span className="text-[10px] font-bold text-[#79B89A]">🌱 -{card.co2}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* SECTION 5 & 6 — THE ECOSYSTEM JOURNEY & SECURE DEAL                */}
      {/* =================================================================== */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8 bg-gradient-to-b from-[#16352D] to-[#0D221D] text-[#FAF8F5]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <span className="rounded-full bg-[#145A45] px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-[#DDEFE6]">
              STAGE 05 · SECURE DEAL ROOM
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black text-[#FAF8F5] tracking-tight">
              Buying used shouldn’t mean buying uncertain.
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-[#DDEFE6]/80">
              Buyer and seller connect through EcoMatch protected escrow instead of blind risky handovers.
            </p>
          </div>

          {/* 3-Node Connected Flow: SELLER ← PRODUCT → BUYER */}
          <div className="mt-14 flex flex-col md:flex-row items-center justify-between gap-6 rounded-3xl border border-[#79B89A]/30 bg-[#145A45]/30 p-8 backdrop-blur-xl">
            {/* Seller Node */}
            <div className="flex flex-col items-center text-center p-4 rounded-2xl border border-[#79B89A]/25 bg-[#16352D]/80 min-w-[170px]">
              <div className="h-12 w-12 rounded-2xl bg-[#145A45] flex items-center justify-center text-[#FAF8F5] shadow-md">
                <User className="h-6 w-6" />
              </div>
              <span className="mt-2 text-sm font-black text-[#FAF8F5]">Seller (Verified)</span>
              <span className="text-[10px] text-[#79B89A]">KYC Proof Synced</span>
            </div>

            {/* Central Product Protected by Security Shield */}
            <div className="relative flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-[#69D3B0] bg-[#16352D] shadow-[0_0_40px_rgba(105,211,176,0.2)]">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="h-32 w-32 rounded-2xl object-cover"
              />
              <span className="mt-2 text-xs font-black text-[#FAF8F5]">{selectedProduct.name}</span>
              <span className="rounded bg-[#145A45] px-2 py-0.5 text-[9px] font-bold text-[#DDEFE6] mt-1">
                Escrow Protected: {selectedProduct.price}
              </span>
            </div>

            {/* Buyer Node */}
            <div className="flex flex-col items-center text-center p-4 rounded-2xl border border-[#79B89A]/25 bg-[#16352D]/80 min-w-[170px]">
              <div className="h-12 w-12 rounded-2xl bg-[#79B89A] flex items-center justify-center text-[#16352D] shadow-md">
                <User className="h-6 w-6" />
              </div>
              <span className="mt-2 text-sm font-black text-[#FAF8F5]">Buyer (Verified)</span>
              <span className="text-[10px] text-[#79B89A]">Deposit Funded</span>
            </div>
          </div>

          {/* Sequential 7 Security Checklist Pins */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[
              "Product Verified ✓",
              "Secure Deal Created ✓",
              "Meeting Agreed ✓",
              "Buyer Checked In ✓",
              "Seller Checked In ✓",
              "Secure Exchange ✓",
              "Ownership Ready ✓",
            ].map((check, i) => (
              <div
                key={i}
                className="rounded-xl border border-[#79B89A]/30 bg-[#145A45]/40 p-2.5 text-center text-[10px] font-bold text-[#DDEFE6] shadow-sm"
              >
                {check}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* SECTION 7 & 8 — SAFE PHYSICAL EXCHANGE & SECURE HANDOVER           */}
      {/* =================================================================== */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8 border-t border-[#79B89A]/20 bg-[#F6F4EC]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <span className="rounded-full bg-[#DDEFE6] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#145A45]">
              STAGE 06 · MEETING & VERIFIED HANDOVER
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black text-[#16352D] tracking-tight">
              Safe Physical Handover Protocol.
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-[#17332C]/80">
              Meeting coordinates verified. Dynamic OTP and QR confirmation ensures money and ownership only transfer upon physical inspection.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2 items-center">
            {/* Left: Meeting Coordinate Card & Proximity Radar */}
            <div className="rounded-3xl border border-[#79B89A]/30 bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#145A45]">
                  Meeting Coordinate
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#145A45]">
                  <MapPin className="h-3.5 w-3.5" /> Indiranagar Tech Square
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span>Date: <strong>Today</strong></span>
                <span>Time: <strong>4:30 PM</strong></span>
                <span className="rounded bg-[#DDEFE6] px-2 py-0.5 font-bold text-[#145A45]">Public Hub</span>
              </div>

              <div className="rounded-2xl border border-[#79B89A]/20 bg-[#FAF8F5] p-4 text-center space-y-2">
                <div className="flex justify-center gap-4 text-xs font-bold">
                  <span className="text-[#145A45]">Buyer Checked In ✓</span>
                  <span className="text-[#145A45]">Seller Checked In ✓</span>
                </div>
                <p className="text-xs font-black text-[#16352D]">
                  Both Participants Present → Secure Exchange Unlocked
                </p>
              </div>
            </div>

            {/* Right: Dynamic OTP Token Card */}
            <div className="rounded-3xl border-2 border-[#145A45] bg-[#16352D] p-6 text-center text-[#FAF8F5] shadow-2xl space-y-4">
              <div className="flex justify-center">
                <QrCode className="h-14 w-14 text-[#69D3B0]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#79B89A]">
                  ONE-TIME EXCHANGE TOKEN
                </span>
                <p className="font-mono text-3xl sm:text-4xl font-black text-[#FAF8F5] tracking-widest mt-1">
                  849-210
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2 text-xs font-bold">
                <span className="rounded bg-[#145A45] px-3 py-1 text-[#DDEFE6]">Seller: Product Handed Over ✓</span>
                <span className="rounded bg-[#145A45] px-3 py-1 text-[#DDEFE6]">Buyer: Product Received ✓</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* SECTION 9 — OWNERSHIP TRANSFER (DIGITAL PRODUCT PASSPORT)           */}
      {/* =================================================================== */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8 border-t border-[#79B89A]/20 bg-[#FAF8F5]">
        <div className="mx-auto max-w-4xl">
          <div className="text-center max-w-2xl mx-auto">
            <span className="rounded-full bg-[#DDEFE6] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#145A45]">
              STAGE 07 · DIGITAL PRODUCT PASSPORT
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black text-[#16352D] tracking-tight">
              Ownership Transferred ✓
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#17332C]/80">
              A traceable record of every verified exchange.
            </p>
          </div>

          {/* Premium Digital Product Passport Card */}
          <div className="mt-10 rounded-3xl border-2 border-[#79B89A]/40 bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#145A45]">
                  DIGITAL PASSPORT · CERTIFIED CIRCULAR ASSET
                </span>
                <h3 className="text-xl font-black text-[#16352D] mt-0.5">{selectedProduct.name}</h3>
              </div>
              <span className="rounded-full bg-[#145A45] px-3 py-1 text-xs font-bold text-[#FFFFFF]">
                BLOCK #89,420 MINTED
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="rounded-xl bg-[#FAF8F5] p-3">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Previous Owner</span>
                <p className="font-bold text-[#16352D] mt-0.5">Janit (Verified)</p>
              </div>
              <div className="rounded-xl bg-[#FAF8F5] p-3">
                <span className="text-[10px] text-slate-500 uppercase font-bold">New Owner</span>
                <p className="font-bold text-[#145A45] mt-0.5">Recipient Tech Lab</p>
              </div>
              <div className="rounded-xl bg-[#FAF8F5] p-3">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Exchange Code</span>
                <p className="font-mono font-bold text-[#16352D] mt-0.5">ECM-849-PASS</p>
              </div>
              <div className="rounded-xl bg-[#FAF8F5] p-3">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Carbon Diverted</span>
                <p className="font-bold text-[#145A45] mt-0.5">{selectedProduct.co2}</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-[#145A45]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#145A45]" /> Cryptographic SHA-256 Ledger Seal
              </span>
              <span className="text-slate-500">100% Landfill Diversion Achieved</span>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* SECTION 10 — CIRCULAR IMPACT & FULL CIRCLE ENDING                   */}
      {/* =================================================================== */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8 border-t border-[#79B89A]/20 bg-gradient-to-b from-[#F6F4EC] to-[#EDE7D9] text-center">
        <div className="mx-auto max-w-5xl">
          <span className="rounded-full bg-[#DDEFE6] px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-[#145A45]">
            CIRCULAR IMPACT & TELEMETRY
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-6xl font-black text-[#16352D] tracking-tight">
            Nothing wasted. <br />
            <span className="text-[#145A45]">More value kept in motion.</span>
          </h2>

          {/* Impact Bento Cards */}
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-3xl border border-[#79B89A]/30 bg-white p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-500">Products Reused</span>
              <p className="text-2xl sm:text-3xl font-black text-[#145A45] mt-1">3,420+</p>
              <p className="text-[10px] text-[#79B89A] mt-0.5">Active in Economy</p>
            </div>

            <div className="rounded-3xl border border-[#79B89A]/30 bg-white p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-500">Value Recovered</span>
              <p className="text-2xl sm:text-3xl font-black text-[#16352D] mt-1">₹4.8 Cr+</p>
              <p className="text-[10px] text-[#79B89A] mt-0.5">Capital Preserved</p>
            </div>

            <div className="rounded-3xl border border-[#79B89A]/30 bg-white p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-500">Waste Diverted</span>
              <p className="text-2xl sm:text-3xl font-black text-[#145A45] mt-1">1,480 T</p>
              <p className="text-[10px] text-[#79B89A] mt-0.5">Avoided Landfill</p>
            </div>

            <div className="rounded-3xl border border-[#79B89A]/30 bg-white p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-500">Secure Exchanges</span>
              <p className="text-2xl sm:text-3xl font-black text-[#16352D] mt-1">100%</p>
              <p className="text-[10px] text-[#79B89A] mt-0.5">Escrow & OTP Verified</p>
            </div>
          </div>

          {/* =============================================================== */}
          {/* FINAL CTA — FULL CIRCLE                                          */}
          {/* =============================================================== */}
          <div className="mt-20 rounded-3xl border-2 border-[#145A45] bg-[#16352D] p-8 sm:p-14 text-center text-[#FAF8F5] shadow-2xl space-y-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#79B89A]">
              FULL CIRCLE CLOSURE
            </p>
            <h3 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              DON’T DISCARD IT. <br />
              <span className="text-[#69D3B0]">ECOMATCH IT.</span>
            </h3>
            <p className="mx-auto max-w-xl text-sm sm:text-base text-[#DDEFE6]">
              Sell what you no longer need. Find what someone else already has.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/marketplace"
                className="rounded-2xl bg-[#69D3B0] px-8 py-4 text-sm font-black text-[#16352D] shadow-xl hover:bg-[#DDEFE6] transition hover:scale-105"
              >
                Explore EcoMatch
              </Link>
              <Link
                href="/seller/add-product"
                className="rounded-2xl border border-[#79B89A] bg-transparent px-8 py-4 text-sm font-bold text-[#FAF8F5] hover:bg-[#145A45] transition hover:scale-105"
              >
                List a Product
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
