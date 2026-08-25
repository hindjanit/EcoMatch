"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  CheckCircle2,
  Camera,
  Upload,
  ArrowRight,
  PlusCircle,
  RefreshCw,
  Cpu,
  Layers,
  Tag,
  ShieldCheck,
  Leaf,
  Scan,
  Mouse,
  Laptop,
  Smartphone,
  Boxes,
  X,
  SlidersHorizontal,
} from "lucide-react";

type ProductPreset = {
  id: string;
  name: string;
  category: string;
  condition: string;
  conditionGrade: string;
  confidence: number;
  reusePotential: "High" | "Medium" | "Low";
  fairPrice: number;
  specs: string[];
  description: string;
  icon: any;
  photoUrl: string;
  trackingPoints: { x: number; y: number; label: string; conf: number }[];
};

const productPresets: ProductPreset[] = [
  {
    id: "mouse",
    name: "HP Wireless Mouse",
    category: "Electronics",
    condition: "Good",
    conditionGrade: "Grade A (94% Intact)",
    confidence: 94,
    reusePotential: "High",
    fairPrice: 1450,
    specs: ["2.4GHz Wireless USB Nano", "1600 DPI Optical Sensor", "Ergonomic Matte Finish"],
    description: "Original HP Wireless Mouse with intact optical sensor, smooth tactile scroll wheel, and clean battery contacts.",
    icon: Mouse,
    photoUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80",
    trackingPoints: [
      { x: 30, y: 25, label: "Left / Right Actuator", conf: 0.96 },
      { x: 50, y: 35, label: "Tactile Scroll Wheel", conf: 0.98 },
      { x: 52, y: 70, label: "Ergonomic Palm Chassis", conf: 0.94 },
      { x: 75, y: 55, label: "Optical Glider Base", conf: 0.91 },
    ],
  },
  {
    id: "laptop",
    name: "Apple MacBook Air M2",
    category: "Computers & Accessories",
    condition: "Like New",
    conditionGrade: "Grade A+ (98% Intact)",
    confidence: 97,
    reusePotential: "High",
    fairPrice: 62000,
    specs: ["Apple M2 8-Core CPU", "13.6-inch Liquid Retina", "Anodized Aluminum Chassis"],
    description: "MacBook Air in pristine cosmetic condition. Zero keyboard shine, intact display hinges, and certified battery health.",
    icon: Laptop,
    photoUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
    trackingPoints: [
      { x: 50, y: 22, label: "Retina Display Panel", conf: 0.99 },
      { x: 48, y: 58, label: "Backlit Magic Keyboard", conf: 0.96 },
      { x: 50, y: 82, label: "Force Touch Trackpad", conf: 0.98 },
      { x: 18, y: 65, label: "MagSafe 3 Port", conf: 0.94 },
    ],
  },
  {
    id: "phone",
    name: "Google Pixel 8 Pro",
    category: "Mobile Phones",
    condition: "Good",
    conditionGrade: "Grade A- (92% Intact)",
    confidence: 95,
    reusePotential: "High",
    fairPrice: 38500,
    specs: ["Tensor G3 Processor", "6.7\" Super Actua OLED", "Triple Camera Bar"],
    description: "Pixel 8 Pro with clean camera bar, intact OLED display with zero dead pixels, tested USB-C fast charging.",
    icon: Smartphone,
    photoUrl: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80",
    trackingPoints: [
      { x: 50, y: 28, label: "Camera Visor Module", conf: 0.98 },
      { x: 50, y: 60, label: "Matte Glass Backing", conf: 0.93 },
      { x: 80, y: 45, label: "Polished Aluminum Frame", conf: 0.95 },
    ],
  },
  {
    id: "servo",
    name: "Industrial Brushless Servo Motor",
    category: "Machinery & Equipment",
    condition: "Used",
    conditionGrade: "Grade B+ (Refurb Ready)",
    confidence: 91,
    reusePotential: "High",
    fairPrice: 18400,
    specs: ["3-Phase 400V AC", "High-Torque Stator", "6061-T6 Aluminum Housing"],
    description: "Industrial servo unit decommissioned from CNC automation facility. Intact rotor bearing and copper winding insulation.",
    icon: Boxes,
    photoUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
    trackingPoints: [
      { x: 45, y: 30, label: "Precision Shaft Rotor", conf: 0.97 },
      { x: 50, y: 65, label: "Stator Cooling Ribs", conf: 0.92 },
      { x: 75, y: 45, label: "Encoder Terminal Block", conf: 0.89 },
    ],
  },
];

export default function EcoMatchVisionStudio() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activePreset, setActivePreset] = useState<ProductPreset>(productPresets[0]);
  const [customImage, setCustomImage] = useState<string | null>(null);

  // Animation Sequence States
  const [analysisPhase, setAnalysisPhase] = useState<
    "idle" | "dimming" | "scanning" | "tracking" | "revealing_cards" | "populating" | "completed"
  >("idle");

  const [revealedCards, setRevealedCards] = useState<number>(0);
  const [populatedFields, setPopulatedFields] = useState<string[]>([]);
  const [beamPosition, setBeamPosition] = useState<number>(0);

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomImage(url);
      resetAnalysis();
    }
  };

  const resetAnalysis = () => {
    setAnalysisPhase("idle");
    setRevealedCards(0);
    setPopulatedFields([]);
    setBeamPosition(0);
  };

  const startVisionAnalysis = () => {
    resetAnalysis();

    // Stage 1: Dim surrounding UI
    setAnalysisPhase("dimming");

    // Stage 2: Scanning Beam
    setTimeout(() => {
      setAnalysisPhase("scanning");
    }, 450);

    // Stage 3: Computer Vision Tracking Points
    setTimeout(() => {
      setAnalysisPhase("tracking");
    }, 1800);

    // Stage 4: Generate floating info cards one by one
    setTimeout(() => {
      setAnalysisPhase("revealing_cards");
      setRevealedCards(1); // Card 1: Product Name
    }, 2400);

    setTimeout(() => {
      setRevealedCards(2); // Card 2: Category
    }, 2800);

    setTimeout(() => {
      setRevealedCards(3); // Card 3: Condition
    }, 3200);

    setTimeout(() => {
      setRevealedCards(4); // Card 4: Confidence
    }, 3600);

    setTimeout(() => {
      setRevealedCards(5); // Card 5: Reuse Potential
    }, 4000);

    // Stage 5: Smoothly populate listing fields
    setTimeout(() => {
      setAnalysisPhase("populating");
      setPopulatedFields(["title"]);
    }, 4500);

    setTimeout(() => {
      setPopulatedFields(["title", "category"]);
    }, 4800);

    setTimeout(() => {
      setPopulatedFields(["title", "category", "condition", "price"]);
    }, 5100);

    setTimeout(() => {
      setPopulatedFields(["title", "category", "condition", "price", "specs", "description"]);
      setAnalysisPhase("completed");
    }, 5500);
  };

  const handleApplyToSellerListing = () => {
    try {
      sessionStorage.setItem(
        "ecomatch_prefill_product",
        JSON.stringify({
          title: activePreset.name,
          category: activePreset.category,
          material: activePreset.specs[2] || activePreset.category,
          condition: activePreset.condition,
          price: activePreset.fairPrice,
          description: activePreset.description,
          specifications: activePreset.specs.join("\n"),
          quantity: 1,
          quantityUnit: "piece",
          confidence: activePreset.confidence,
          imagePreview: customImage || activePreset.photoUrl,
        })
      );
    } catch (e) {
      console.error(e);
    }

    router.push("/seller/add-product?prefill=true");
  };

  const isDimmed = analysisPhase !== "idle" && analysisPhase !== "completed";

  return (
    <div className="relative w-full rounded-3xl border border-[#7B998B]/25 bg-gradient-to-b from-[#FAF8F5] via-[#F4F0E8] to-[#EAE5DA] p-6 sm:p-8 lg:p-10 shadow-[0_25px_60px_rgba(6,68,48,0.08)] text-[#14221C] overflow-hidden">
      {/* Background Ambient Radial Soft Sage & Forest Emerald Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-[#7B998B]/20 blur-[130px]" />
        <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-[#064430]/10 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#064430_1px,transparent_1px)] [background-size:20px_20px]" />
      </div>

      {/* Top Controls Bar */}
      <div
        className={`relative z-20 flex flex-wrap items-center justify-between gap-4 border-b border-[#7B998B]/20 pb-5 transition-opacity duration-700 ${
          isDimmed ? "opacity-30" : "opacity-100"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#064430] text-[#FAF8F5] shadow-md">
            <Scan className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-[#064430]">
                EcoMatch Vision Studio
              </h3>
              <span className="rounded-full bg-[#D8E3DC] px-2 py-0.5 text-[10px] font-bold text-[#064430]">
                Neural Vision Engine
              </span>
            </div>
            <p className="text-xs text-[#5D7B6D] font-medium">
              Physical condition detection & instant circular listing generation
            </p>
          </div>
        </div>

        {/* Preset Selector Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 mr-1">Sample Assets:</span>
          {productPresets.map((preset) => {
            const Icon = preset.icon;
            const isSelected = activePreset.id === preset.id && !customImage;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setActivePreset(preset);
                  setCustomImage(null);
                  resetAnalysis();
                }}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "border-emerald-700 bg-emerald-700 text-white shadow-sm scale-105"
                    : "border-emerald-900/15 bg-white/80 text-slate-700 hover:border-emerald-500 hover:bg-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{preset.name.split(" ")[0]}</span>
              </button>
            );
          })}

          {/* Custom Photo Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border border-dashed border-emerald-900/25 bg-white/90 px-3 py-1.5 text-xs font-bold text-emerald-900 hover:border-emerald-700 hover:bg-emerald-50 transition"
          >
            <Camera className="h-3.5 w-3.5 text-emerald-700" />
            <span>Upload Custom Photo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCustomUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN INTERACTIVE ANALYSIS STAGE */}
      {/* ========================================================= */}
      <div className="relative z-10 mt-8 grid gap-8 lg:grid-cols-12 items-center">
        {/* LEFT COLUMN: FLOATING PRODUCT PLATFORM & COMPUTER VISION OVERLAYS */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="relative flex h-[340px] sm:h-[390px] w-full max-w-[420px] flex-col items-center justify-center">
            {/* The Floating Product Container */}
            <div
              className={`relative z-20 flex flex-col items-center justify-center transition-all duration-700 ${
                analysisPhase === "dimming" || analysisPhase === "scanning"
                  ? "scale-[1.03] -translate-y-3"
                  : "hover:-translate-y-1"
              }`}
            >
              {/* Ceramic Shadow underneath floating product */}
              <div className="absolute -bottom-8 h-10 w-48 rounded-full bg-emerald-950/15 blur-xl transition-all duration-500" />

              {/* Product Frame Floating Object */}
              <div className="relative overflow-hidden rounded-3xl border-2 border-white/80 bg-white/95 p-3 shadow-[0_20px_50px_rgba(4,38,26,0.12)] backdrop-blur-xl">
                <img
                  src={customImage || activePreset.photoUrl}
                  alt={activePreset.name}
                  className="h-56 w-56 sm:h-64 sm:w-64 rounded-2xl object-cover"
                />

                {/* ===================================================== */}
                {/* 1. THIN EMERALD SCANNING BEAM (TOP TO BOTTOM) */}
                {/* ===================================================== */}
                {(analysisPhase === "scanning" || analysisPhase === "tracking") && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                    <div className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(16,185,129,1)] animate-vision-scanline" />
                    <div className="absolute inset-0 bg-emerald-400/5 animate-pulse" />
                  </div>
                )}

                {/* ===================================================== */}
                {/* 2. COMPUTER VISION TRACKING POINTS & BOUNDING TARGETS */}
                {/* ===================================================== */}
                {(analysisPhase === "tracking" ||
                  analysisPhase === "revealing_cards" ||
                  analysisPhase === "populating" ||
                  analysisPhase === "completed") && (
                  <div className="pointer-events-none absolute inset-0 p-3">
                    {activePreset.trackingPoints.map((point, idx) => (
                      <div
                        key={idx}
                        style={{ top: `${point.y}%`, left: `${point.x}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in-75 duration-300"
                      >
                        {/* Target Crosshair */}
                        <div className="relative flex h-6 w-6 items-center justify-center">
                          <span className="absolute h-full w-full rounded-full border border-emerald-500 opacity-60 animate-ping" />
                          <span className="h-2 w-2 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,1)]" />
                          {/* Corner bounding marks */}
                          <span className="absolute -top-1 -left-1 h-2 w-2 border-t-2 border-l-2 border-emerald-600" />
                          <span className="absolute -bottom-1 -right-1 h-2 w-2 border-b-2 border-r-2 border-emerald-600" />
                        </div>

                        {/* Tracking Label Tag */}
                        <div className="mt-1 whitespace-nowrap rounded-md border border-emerald-900/10 bg-white/95 px-2 py-0.5 text-[9px] font-bold text-[#04261a] shadow-sm backdrop-blur-md">
                          {point.label} <span className="text-emerald-700 font-mono">({point.conf * 100}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Clean Analysis Platform Disk (Ceramic Ground Plane) */}
            <div className="absolute bottom-2 z-10 flex h-24 w-80 sm:w-96 flex-col items-center justify-center rounded-[100%] border border-emerald-900/15 bg-gradient-to-b from-white/90 via-emerald-50/50 to-emerald-100/40 shadow-[0_15px_35px_rgba(4,38,26,0.06)] backdrop-blur-md">
              <div className="h-16 w-64 rounded-[100%] border border-dashed border-emerald-700/25 animate-spin" style={{ animationDuration: "60s" }} />
            </div>

            {/* Floating Action Trigger Button */}
            <div className="absolute -bottom-4 z-30">
              {analysisPhase === "idle" ? (
                <button
                  onClick={startVisionAnalysis}
                  className="group flex items-center gap-2 rounded-2xl bg-[#04261a] px-6 py-3 text-xs font-bold text-white shadow-[0_10px_30px_rgba(4,38,26,0.25)] transition-all hover:bg-[#063b28] hover:scale-105 active:scale-95"
                >
                  <Sparkles className="h-4 w-4 text-emerald-300 transition group-hover:rotate-12" />
                  <span>Analyze with Vision AI</span>
                </button>
              ) : analysisPhase === "completed" ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-2xl border border-emerald-700/30 bg-emerald-100 px-4 py-2 text-xs font-black text-emerald-900 shadow-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    AI Suggestions Ready ✓
                  </span>
                  <button
                    onClick={startVisionAnalysis}
                    className="flex items-center gap-1 rounded-2xl border border-emerald-900/15 bg-white/90 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white shadow-sm"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Re-scan
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-700/40 bg-white/95 px-5 py-2.5 text-xs font-bold text-[#04261a] shadow-lg backdrop-blur-md">
                  <RefreshCw className="h-4 w-4 animate-spin text-emerald-700" />
                  <span>
                    {analysisPhase === "dimming" && "Calibrating Optical Plane..."}
                    {analysisPhase === "scanning" && "Vertical Laser Scanline..."}
                    {analysisPhase === "tracking" && "Extracting Structural Points..."}
                    {analysisPhase === "revealing_cards" && "Synthesizing Neural Attributes..."}
                    {analysisPhase === "populating" && "Populating Marketplace Schema..."}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Floating Generated Attribute Cards (One-by-One Reveal) */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 max-w-md min-h-[60px]">
            {revealedCards >= 1 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-emerald-900/10 bg-white/90 px-3 py-1.5 text-xs font-bold text-[#04261a] shadow-sm animate-in fade-in zoom-in-90 slide-in-from-bottom-2 duration-300">
                <Tag className="h-3.5 w-3.5 text-emerald-700" />
                <span>{activePreset.name}</span>
              </div>
            )}

            {revealedCards >= 2 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-emerald-900/10 bg-white/90 px-3 py-1.5 text-xs font-bold text-teal-900 shadow-sm animate-in fade-in zoom-in-90 slide-in-from-bottom-2 duration-300">
                <Layers className="h-3.5 w-3.5 text-teal-700" />
                <span>{activePreset.category}</span>
              </div>
            )}

            {revealedCards >= 3 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-emerald-900/10 bg-white/90 px-3 py-1.5 text-xs font-bold text-emerald-900 shadow-sm animate-in fade-in zoom-in-90 slide-in-from-bottom-2 duration-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                <span>Condition: {activePreset.condition}</span>
              </div>
            )}

            {revealedCards >= 4 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-emerald-900/10 bg-white/90 px-3 py-1.5 text-xs font-bold text-[#04261a] shadow-sm animate-in fade-in zoom-in-90 slide-in-from-bottom-2 duration-300">
                <Cpu className="h-3.5 w-3.5 text-emerald-600" />
                <span>Product Confidence: {activePreset.confidence}%</span>
              </div>
            )}

            {revealedCards >= 5 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-emerald-900/10 bg-emerald-100/90 px-3 py-1.5 text-xs font-bold text-emerald-900 shadow-sm animate-in fade-in zoom-in-90 slide-in-from-bottom-2 duration-300">
                <Leaf className="h-3.5 w-3.5 text-emerald-700" />
                <span>Reuse Potential: {activePreset.reusePotential}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AUTO-POPULATING PRODUCT LISTING FIELDS */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-3xl border border-emerald-900/10 bg-white/85 p-6 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  MARKETPLACE SCHEMA POPULATOR
                </span>
                <h4 className="text-sm sm:text-base font-black text-[#04261a]">
                  Auto-Populated Listing Schema
                </h4>
              </div>
              {analysisPhase === "completed" && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                  Ready to List ✓
                </span>
              )}
            </div>

            {/* Field 1: Title */}
            <div className="mt-4 space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-500">
                Product Title
              </label>
              <div
                className={`rounded-xl border p-2.5 text-xs font-bold transition-all duration-500 ${
                  populatedFields.includes("title")
                    ? "border-emerald-600 bg-emerald-50/70 text-[#04261a] shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                {populatedFields.includes("title")
                  ? activePreset.name
                  : "Awaiting Vision AI analysis..."}
              </div>
            </div>

            {/* Field 2 & 3: Category & Condition */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-500">Category</label>
                <div
                  className={`rounded-xl border p-2.5 text-xs font-bold transition-all duration-500 ${
                    populatedFields.includes("category")
                      ? "border-emerald-600 bg-emerald-50/70 text-[#04261a]"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  {populatedFields.includes("category")
                    ? activePreset.category
                    : "Auto-detected"}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-500">Condition</label>
                <div
                  className={`rounded-xl border p-2.5 text-xs font-bold transition-all duration-500 ${
                    populatedFields.includes("condition")
                      ? "border-emerald-600 bg-emerald-50/70 text-emerald-900"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  {populatedFields.includes("condition")
                    ? `${activePreset.condition} (${activePreset.conditionGrade})`
                    : "Auto-graded"}
                </div>
              </div>
            </div>

            {/* Field 4: Suggested Price */}
            <div className="mt-3 space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-500">
                Fair Market Resale Valuation
              </label>
              <div
                className={`rounded-xl border p-2.5 text-xs font-bold font-mono transition-all duration-500 ${
                  populatedFields.includes("price")
                    ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 text-sm font-black"
                    : "border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                {populatedFields.includes("price")
                  ? `₹${activePreset.fairPrice.toLocaleString("en-IN")}`
                  : "Calculating..."}
              </div>
            </div>

            {/* Field 5: Visible Specifications */}
            <div className="mt-3 space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-500">
                Detected Optical Specifications
              </label>
              <div
                className={`min-h-[46px] rounded-xl border p-2 text-xs transition-all duration-500 ${
                  populatedFields.includes("specs")
                    ? "border-emerald-600 bg-emerald-50/70 text-[#04261a]"
                    : "border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                {populatedFields.includes("specs") ? (
                  <div className="flex flex-wrap gap-1.5">
                    {activePreset.specs.map((spec, idx) => (
                      <span
                        key={idx}
                        className="rounded-md border border-emerald-700/20 bg-white px-2 py-0.5 text-[10px] font-bold text-[#04261a]"
                      >
                        ✓ {spec}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 text-[11px]">Features will appear here</span>
                )}
              </div>
            </div>

            {/* Field 6: AI Listing Description */}
            <div className="mt-3 space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-500">
                Verified Listing Description
              </label>
              <div
                className={`min-h-[50px] rounded-xl border p-2.5 text-xs leading-relaxed transition-all duration-500 ${
                  populatedFields.includes("description")
                    ? "border-emerald-600 bg-emerald-50/70 text-slate-700"
                    : "border-slate-200 bg-slate-50 text-slate-400 text-[11px]"
                }`}
              >
                {populatedFields.includes("description")
                  ? activePreset.description
                  : "2 to 3 sentence description generated from optical analysis..."}
              </div>
            </div>

            {/* Direct Action Button */}
            <div className="mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={handleApplyToSellerListing}
                disabled={analysisPhase !== "completed"}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-black transition-all ${
                  analysisPhase === "completed"
                    ? "bg-[#04261a] text-white shadow-[0_10px_30px_rgba(4,38,26,0.25)] hover:bg-[#063b28] hover:scale-[1.02] active:scale-95"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <PlusCircle className="h-4 w-4" />
                <span>List this Product in Marketplace with AI Details →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
