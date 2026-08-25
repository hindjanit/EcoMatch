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
  Sparkles,
  Layers,
  Award,
  Globe,
  Leaf,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Smartphone,
  Laptop,
  Mouse,
  Armchair,
  Package,
  CircleDollarSign,
  PlusCircle,
} from "lucide-react";

type OrbitingProduct = {
  id: string;
  name: string;
  category: string;
  price: string;
  co2Saved: string;
  condition: string;
  angle: number; // initial angle degrees
  icon: any;
  color: string;
};

const reusableProducts: OrbitingProduct[] = [
  {
    id: "phone",
    name: "Flagship OLED Smartphone",
    category: "Consumer Tech",
    price: "₹24,500",
    co2Saved: "18.4 kg CO₂e",
    condition: "Grade A",
    angle: 0,
    icon: Smartphone,
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "laptop",
    name: "Aluminum Ultrabook 14\"",
    category: "Refurbished IT",
    price: "₹42,000",
    co2Saved: "34.8 kg CO₂e",
    condition: "Grade A-",
    angle: 45,
    icon: Laptop,
    color: "from-sky-500 to-indigo-600",
  },
  {
    id: "mouse",
    name: "Wireless Precision Mouse",
    category: "Peripherals",
    price: "₹1,850",
    co2Saved: "4.2 kg CO₂e",
    condition: "Like New",
    angle: 90,
    icon: Mouse,
    color: "from-emerald-600 to-green-700",
  },
  {
    id: "chair",
    name: "Ergonomic Mesh Task Chair",
    category: "Office Asset",
    price: "₹6,200",
    co2Saved: "22.5 kg CO₂e",
    condition: "Grade A",
    angle: 135,
    icon: Armchair,
    color: "from-teal-600 to-emerald-700",
  },
  {
    id: "metal",
    name: "6061-T6 Aluminum Sheets",
    category: "Raw Material",
    price: "₹14,200",
    co2Saved: "58.0 kg CO₂e",
    condition: "Surplus Lot",
    angle: 180,
    icon: Layers,
    color: "from-slate-600 to-emerald-700",
  },
  {
    id: "package",
    name: "Eco-Corrugated Packaging",
    category: "Circular Supplies",
    price: "₹850",
    co2Saved: "8.1 kg CO₂e",
    condition: "Batch 50x",
    angle: 225,
    icon: Package,
    color: "from-amber-600 to-emerald-600",
  },
  {
    id: "electronic",
    name: "Precision Micro-Controller",
    category: "Components",
    price: "₹3,400",
    co2Saved: "12.6 kg CO₂e",
    condition: "Tested Specs",
    angle: 270,
    icon: Cpu,
    color: "from-indigo-500 to-emerald-600",
  },
  {
    id: "servo",
    name: "High-Torque Servo Motor",
    category: "Industrial Surplus",
    price: "₹18,900",
    co2Saved: "42.8 kg CO₂e",
    condition: "Refurb Ready",
    angle: 315,
    icon: Boxes,
    color: "from-emerald-700 to-teal-800",
  },
];

export default function SustainableHeroEcosystem() {
  const [mounted, setMounted] = useState(false);
  const [hoveredProduct, setHoveredProduct] = useState<OrbitingProduct | null>(null);
  const [rotationOffset, setRotationOffset] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    // Continuous slow orbit rotation (fintech/sustainability pace)
    let animationFrameId: number;
    let lastTime = performance.now();

    const animateOrbit = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      setRotationOffset((prev) => (prev + delta * 0.008) % 360);
      animationFrameId = requestAnimationFrame(animateOrbit);
    };

    animationFrameId = requestAnimationFrame(animateOrbit);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x: x * 14, y: y * -14 });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-[92vh] w-full overflow-hidden bg-gradient-to-b from-[#FAF8F5] via-[#F4F0E8] to-[#EAE5DA] pt-28 pb-16 text-[#14221C] transition-colors"
    >
      {/* Subtle Ambient Radial Lighting (Forest Emerald & Sage on Warm Ivory) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[650px] w-[650px] rounded-full bg-[#7B998B]/20 blur-[150px]" />
        <div className="absolute bottom-10 left-10 h-72 w-72 rounded-full bg-[#064430]/10 blur-[100px]" />
        <div className="absolute top-1/3 right-10 h-80 w-80 rounded-full bg-[#7B998B]/15 blur-[120px]" />
        {/* Subtle coordinate grid */}
        <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#064430_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Trust Capsule */}
        <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-[#7B998B]/30 bg-[#FFFDF9]/90 px-4 py-1.5 shadow-[0_4px_20px_rgba(6,68,48,0.06)] backdrop-blur-xl transition hover:scale-105">
          <span className="flex h-2 w-2 rounded-full bg-[#0E6E4D] animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#064430]">
            CIRCULAR ECONOMY MARKETPLACE
          </span>
          <span className="hidden sm:inline text-xs text-[#7B998B]">·</span>
          <span className="hidden sm:inline text-xs font-semibold text-[#5D7B6D]">
            Zero-Waste Physical Handover
          </span>
        </div>

        {/* Editorial Headline & Subtitle */}
        <div className="mx-auto mt-6 max-w-3xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-[#04261a] sm:text-6xl lg:text-7xl leading-[1.08]">
            Give Products a{" "}
            <span className="bg-gradient-to-r from-[#064430] via-[#0E6E4D] to-[#5D7B6D] bg-clip-text text-transparent">
              Second Life.
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#4E6B5D] sm:text-base md:text-lg font-medium">
            AI-powered discovery. Verified deals. Secure exchanges. Traceable ownership.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/marketplace"
              className="group flex items-center gap-2.5 rounded-2xl bg-[#064430] px-7 py-3.5 text-sm font-bold text-[#FAF8F5] shadow-[0_10px_30px_rgba(6,68,48,0.25)] transition-all hover:bg-[#032419] hover:shadow-[0_15px_40px_rgba(6,68,48,0.35)] hover:scale-105 active:scale-95"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1 text-[#D8E3DC]" />
            </Link>

            <Link
              href="/seller/add-product"
              className="flex items-center gap-2 rounded-2xl border border-[#7B998B]/30 bg-[#FFFDF9]/90 px-6 py-3.5 text-sm font-bold text-[#064430] shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-xl transition hover:bg-white hover:shadow-[0_10px_30px_rgba(6,68,48,0.1)] hover:scale-105"
            >
              <PlusCircle className="h-4 w-4 text-[#0E6E4D]" />
              <span>Sell a Product</span>
            </Link>
          </div>
        </div>

        {/* ========================================================= */}
        {/* INTERACTIVE 3D CIRCULAR ECOSYSTEM STAGE (SELLER ➔ CORE ➔ BUYER) */}
        {/* ========================================================= */}
        <div
          className="relative mx-auto mt-12 flex h-[380px] sm:h-[430px] lg:h-[480px] w-full max-w-5xl items-center justify-center [perspective:1400px]"
          style={{
            transform: `rotateX(${mousePos.y}deg) rotateY(${mousePos.x}deg)`,
            transition: "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        >
          {/* ======================================================= */}
          {/* 1. SELLER NODE (LEFT) */}
          {/* ======================================================= */}
          <div className="absolute left-2 sm:left-6 lg:left-12 z-20 hidden md:flex flex-col items-center">
            <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 flex-col items-center justify-center rounded-2xl border border-emerald-800/20 bg-white/90 p-2 shadow-[0_15px_35px_rgba(4,38,26,0.08)] backdrop-blur-xl">
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-600" />
              </span>
              <Boxes className="h-6 w-6 text-[#04261a]" />
              <span className="text-[9px] font-black uppercase text-emerald-800 mt-1">SELLER</span>
            </div>
            <span className="mt-2 text-[10px] font-bold text-slate-500 font-mono">Surplus Ingestion</span>
          </div>

          {/* Left-to-Center Connecting Stream Arc */}
          <div className="absolute left-16 sm:left-24 lg:left-32 right-1/2 h-[2px] hidden md:block bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-600 opacity-60">
            <div className="h-full w-1/3 bg-emerald-600 rounded-full animate-beam-pulse" />
          </div>

          {/* ======================================================= */}
          {/* 2. BUYER NODE (RIGHT) */}
          {/* ======================================================= */}
          <div className="absolute right-2 sm:right-6 lg:right-12 z-20 hidden md:flex flex-col items-center">
            <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 flex-col items-center justify-center rounded-2xl border border-emerald-800/20 bg-white/90 p-2 shadow-[0_15px_35px_rgba(4,38,26,0.08)] backdrop-blur-xl">
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-teal-600" />
              </span>
              <Cpu className="h-6 w-6 text-[#04261a]" />
              <span className="text-[9px] font-black uppercase text-teal-800 mt-1">BUYER</span>
            </div>
            <span className="mt-2 text-[10px] font-bold text-slate-500 font-mono">Verified Second Life</span>
          </div>

          {/* Center-to-Right Connecting Stream Arc */}
          <div className="absolute left-1/2 right-16 sm:right-24 lg:right-32 h-[2px] hidden md:block bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-400 opacity-60">
            <div className="h-full w-1/3 bg-teal-600 rounded-full animate-beam-pulse" />
          </div>

          {/* ======================================================= */}
          {/* 3. CENTER GLOWING ECOMATCH ECOSYSTEM / CORE */}
          {/* ======================================================= */}
          <div className="relative flex h-60 w-60 sm:h-72 sm:w-72 lg:h-80 lg:w-80 items-center justify-center">
            {/* Concentric Orbital Guidance Rings */}
            <div className="absolute inset-0 rounded-full border border-emerald-800/10 shadow-[0_0_60px_rgba(16,185,129,0.1)]" />
            <div className="absolute inset-6 rounded-full border border-dashed border-emerald-700/20 animate-spin" style={{ animationDuration: "50s" }} />
            <div className="absolute inset-16 rounded-full border border-emerald-600/25" />

            {/* Glowing Radiant Core Orb */}
            <div className="relative z-10 flex h-36 w-36 sm:h-44 sm:w-44 flex-col items-center justify-center rounded-full border-2 border-emerald-500/40 bg-gradient-to-br from-[#063b28] via-[#04261a] to-[#02170f] p-4 text-center text-white shadow-[0_20px_60px_rgba(4,38,26,0.35),inset_0_2px_10px_rgba(110,231,183,0.3)] backdrop-blur-2xl">
              <div className="relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-300 text-slate-950 shadow-md">
                <Leaf className="h-6 w-6 sm:h-7 sm:w-7 text-[#04261a]" />
              </div>
              <span className="mt-2 text-xs sm:text-sm font-black tracking-tight text-white">
                Eco<span className="text-emerald-300">Match</span>
              </span>
              <span className="text-[9px] font-mono font-bold text-emerald-300/90 tracking-wider">
                CIRCULAR HUB
              </span>
            </div>

            {/* Orbiting 8 Reusable Products */}
            {reusableProducts.map((prod, idx) => {
              const currentAngle = (prod.angle + rotationOffset) * (Math.PI / 180);
              // Radius 130px on small, 160px on medium, 180px on large
              const radius = 150;
              const x = Math.cos(currentAngle) * radius;
              const y = Math.sin(currentAngle) * radius;
              const Icon = prod.icon;
              const isHovered = hoveredProduct?.id === prod.id;

              return (
                <div
                  key={prod.id}
                  onMouseEnter={() => setHoveredProduct(prod)}
                  onMouseLeave={() => setHoveredProduct(null)}
                  style={{
                    transform: `translate3d(${x}px, ${y}px, 0px)`,
                    transition: isHovered ? "transform 0.2s" : "none",
                  }}
                  className="absolute z-20 flex cursor-pointer items-center justify-center"
                >
                  {/* Floating Product Bubble */}
                  <div
                    className={`relative flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-2xl border bg-white shadow-lg transition-all duration-300 ${
                      isHovered
                        ? "border-emerald-600 scale-125 shadow-[0_10px_30px_rgba(16,185,129,0.35)] z-30"
                        : "border-emerald-900/15 hover:border-emerald-500 hover:scale-110"
                    }`}
                  >
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-[#04261a]" />
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                  </div>

                  {/* Hover Telemetry Card */}
                  {isHovered && (
                    <div className="absolute top-14 -left-16 z-40 w-44 rounded-2xl border border-emerald-900/15 bg-white/95 p-3 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95">
                      <p className="text-[9px] uppercase font-bold text-emerald-800">{prod.category}</p>
                      <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px]">
                        <span className="font-mono font-bold text-[#04261a]">{prod.price}</span>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">
                          {prod.condition}
                        </span>
                      </div>
                      <p className="mt-1 text-[9px] font-semibold text-teal-700">🌱 {prod.co2Saved}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM METRICS STRIP (SUSTAINABILITY TELEMETRY) */}
        {/* ========================================================= */}
        <div className="mx-auto mt-4 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-emerald-900/10 bg-white/70 p-3.5 text-center shadow-sm backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">CO₂e Offset</p>
            <p className="mt-1 text-lg sm:text-xl font-black text-[#04261a]">1,480+ T</p>
            <p className="text-[10px] text-emerald-700 font-medium">Lifecycle Diverted</p>
          </div>

          <div className="rounded-2xl border border-emerald-900/10 bg-white/70 p-3.5 text-center shadow-sm backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Landfill Diverted</p>
            <p className="mt-1 text-lg sm:text-xl font-black text-[#04261a]">100%</p>
            <p className="text-[10px] text-emerald-700 font-medium">Zero Waste Goal</p>
          </div>

          <div className="rounded-2xl border border-emerald-900/10 bg-white/70 p-3.5 text-center shadow-sm backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Verified Lots</p>
            <p className="mt-1 text-lg sm:text-xl font-black text-[#04261a]">3,420+</p>
            <p className="text-[10px] text-emerald-700 font-medium">UIDAI Authenticated</p>
          </div>

          <div className="rounded-2xl border border-emerald-900/10 bg-white/70 p-3.5 text-center shadow-sm backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Handover Trust</p>
            <p className="mt-1 text-lg sm:text-xl font-black text-[#04261a]">100%</p>
            <p className="text-[10px] text-emerald-700 font-medium">Escrow Protected</p>
          </div>
        </div>
      </div>
    </section>
  );
}
