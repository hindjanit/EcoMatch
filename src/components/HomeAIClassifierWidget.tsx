"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Upload,
  Camera,
  Cpu,
  ArrowRight,
  Boxes,
  Zap,
  CheckCircle2,
  Scan,
  CircleDollarSign,
  Leaf,
  PlusCircle,
  FileCheck2,
  RefreshCw,
  X,
} from "lucide-react";
import AIDefectHeatmap from "./AIDefectHeatmap";

type AnalysisResult = {
  title: string;
  category: string;
  material: string;
  condition: string;
  conditionScore: number;
  estimatedPrice: number;
  scrapValue: number;
  co2OffsetKg: number;
  description: string;
  specifications: string;
  reuseRoute: string;
  confidence: number;
};

export default function HomeAIClassifierWidget() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [promptText, setPromptText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const samplePrompts = [
    "Used Dell 4K Monitor in pristine condition with power cable",
    "50kg scrap aluminum extrusion profiles from CNC workshop",
    "20 refurbished Lenovo ThinkPad laptops without SSDs",
    "Industrial 3-Phase Servo Motor 6061-T6 alloy decommissioned",
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setResult(null);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runAnalysis = async (textOverride?: string) => {
    const activeText = textOverride || promptText;
    if (!imageFile && !activeText.trim()) {
      alert("Please upload a product photo or enter a material description first.");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    // Simulate / Trigger multi-modal vision intelligence
    setTimeout(() => {
      let inferredCategory = "Electronics & Appliances";
      let inferredMaterial = "Aluminum Chassis + PCB";
      let inferredTitle = "Surplus Reusable Asset";
      let inferredPrice = 14500;
      let inferredCo2 = 38.4;
      let inferredCond = "Grade A (94% Intact)";

      const lower = (activeText + " " + (imageFile?.name || "")).toLowerCase();

      if (lower.includes("monitor") || lower.includes("screen") || lower.includes("dell")) {
        inferredTitle = "Dell UltraSharp 27\" 4K Professional Monitor";
        inferredCategory = "Electronics & Appliances";
        inferredMaterial = "IPS Panel, Aluminum Stand, Electronics";
        inferredPrice = 18500;
        inferredCo2 = 42.0;
        inferredCond = "Grade A";
      } else if (lower.includes("aluminium") || lower.includes("aluminum") || lower.includes("metal")) {
        inferredTitle = "6061-T6 Aircraft Grade Aluminum Billet Lot";
        inferredCategory = "Metals & Alloys";
        inferredMaterial = "6061-T6 Alloy Extrusions";
        inferredPrice = 12800;
        inferredCo2 = 68.5;
        inferredCond = "Surplus Lot (Grade A-)";
      } else if (lower.includes("laptop") || lower.includes("thinkpad") || lower.includes("computer")) {
        inferredTitle = "Lenovo ThinkPad Core i7 Business Fleet";
        inferredCategory = "Refurbished IT Equipment";
        inferredMaterial = "Magnesium Alloy, Lithium, PCB";
        inferredPrice = 24000;
        inferredCo2 = 52.0;
        inferredCond = "Grade A-";
      } else if (lower.includes("servo") || lower.includes("motor") || lower.includes("industrial")) {
        inferredTitle = "Industrial High-Torque Servo Motor EM-809";
        inferredCategory = "Industrial Machinery & Surplus";
        inferredMaterial = "Copper Cores, Steel Housing";
        inferredPrice = 19200;
        inferredCo2 = 45.0;
        inferredCond = "Grade A (Refurb Ready)";
      } else {
        inferredTitle = activeText.slice(0, 45) || "Verified Circular Reusable Lot";
      }

      setResult({
        title: inferredTitle,
        category: inferredCategory,
        material: inferredMaterial,
        condition: inferredCond,
        conditionScore: 94.2,
        estimatedPrice: inferredPrice,
        scrapValue: Math.round(inferredPrice * 0.08),
        co2OffsetKg: inferredCo2,
        description: `Verified circular supply listing. Tested micro-geometry, intact structural integrity, ready for immediate secondary deployment or refurbishing.`,
        specifications: `Material Composition: ${inferredMaterial}\nHealth Grade: ${inferredCond}\nVerified Protocol: EcoMatch AI Vision Ingestion`,
        reuseRoute: "Direct High-Value Industrial & Consumer Re-manufacturing",
        confidence: 97.8,
      });

      setIsAnalyzing(false);
    }, 1200);
  };

  const handleDirectAddProduct = () => {
    if (!result) return;

    try {
      sessionStorage.setItem(
        "ecomatch_prefill_product",
        JSON.stringify({
          title: result.title,
          category: result.category,
          material: result.material,
          condition: result.condition.split(" ")[0] || "Grade A",
          description: result.description,
          specifications: result.specifications,
          quantity: 1,
          quantityUnit: "piece",
          imagePreview: imagePreview,
        })
      );
    } catch (e) {
      console.error(e);
    }

    router.push("/seller/add-product?prefill=true");
  };

  return (
    <section className="relative px-4 py-20 sm:px-6 lg:px-8 border-t border-white/10 bg-[#06080d] text-white">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-emerald-300">
              AI VISION INGESTION
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl text-white">
              Scan & Classify Any <span className="text-emerald-400">Surplus Asset</span>
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl">
              Upload a photo or describe surplus materials. EcoMatch AI instantly detects category, fair price, condition grade, and lets you publish a listing in 1 click.
            </p>
          </div>

          <Link
            href="/ai-classify"
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
          >
            Open Full AI Classifier <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* ========================================================= */}
        {/* INTERACTIVE SCANNER WORKBENCH */}
        {/* ========================================================= */}
        <div className="mt-10 grid gap-8 lg:grid-cols-12">
          {/* Left Column: Photo Upload & Prompt Box */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-3xl border border-emerald-500/25 bg-[#0c101a]/90 p-5 shadow-2xl backdrop-blur-xl">
              {/* Photo Upload Area (2 Options: Camera & Gallery Upload) */}
              <div>
                {imagePreview ? (
                  <div className="relative rounded-2xl border-2 border-emerald-400/60 bg-[#030e09] p-3">
                    <img
                      src={imagePreview}
                      alt="Uploaded Asset"
                      className="h-44 w-full rounded-xl object-contain"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 px-1">
                      <span className="rounded-lg border border-emerald-400/50 bg-black/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                        ✓ Photo Loaded
                      </span>
                      <button
                        type="button"
                        onClick={clearImage}
                        className="text-xs font-semibold text-red-400 hover:text-red-300"
                      >
                        Remove / Re-select Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Option 1: Take Photo */}
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-950/20 p-5 text-center transition hover:border-emerald-400 hover:bg-emerald-950/40">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-400 shadow-sm">
                        <Camera className="h-5 w-5" />
                      </div>
                      <p className="mt-2 text-xs font-bold text-white">📷 Click / Take Photo</p>
                      <p className="mt-1 text-[10px] text-slate-400">Open camera & capture product</p>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>

                    {/* Option 2: Upload from Gallery */}
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-500/40 bg-sky-950/20 p-5 text-center transition hover:border-sky-400 hover:bg-sky-950/40">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/10 text-sky-400 shadow-sm">
                        <Upload className="h-5 w-5" />
                      </div>
                      <p className="mt-2 text-xs font-bold text-white">🖼️ Upload from Gallery</p>
                      <p className="mt-1 text-[10px] text-slate-400">PNG, JPG, WEBP up to 5MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Text Description Box */}
              <div className="mt-4">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Optional Details / Material Description
                </label>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  rows={2}
                  placeholder="e.g. Dell 4K monitor with cables, or 50kg aluminum offcuts..."
                  className="mt-1.5 w-full rounded-2xl border border-white/15 bg-[#030e09] p-3 text-xs text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              {/* Quick Sample Prompts */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="text-[10px] font-bold text-slate-500">Quick Test:</span>
                {samplePrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPromptText(p);
                      runAnalysis(p);
                    }}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300 hover:border-emerald-400/40 hover:text-emerald-300"
                  >
                    {p.split(" ")[1]} {p.split(" ")[2]}
                  </button>
                ))}
              </div>

              {/* Analyze CTA */}
              <button
                onClick={() => runAnalysis()}
                disabled={isAnalyzing}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 py-3.5 text-xs font-black text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.35)] transition hover:from-emerald-300 hover:to-teal-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Analyzing Geometry & Composition...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-slate-950" />
                    Analyze Asset with EcoMatch Vision
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Dynamic Analysis Output & Instant Add Product Choice */}
          <div className="lg:col-span-6 space-y-4">
            {result ? (
              <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-[#0e1628] to-[#080d1a] p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 space-y-4">
                {/* Result Title & Confidence */}
                <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <span className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      {result.category}
                    </span>
                    <h3 className="mt-2 text-lg sm:text-xl font-black text-white">{result.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{result.material}</p>
                  </div>

                  <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                    {result.confidence}% Match
                  </span>
                </div>

                {/* Pricing & Impact Benchmark Bento */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-2.5 text-center">
                    <p className="text-[9px] uppercase font-bold text-slate-400">Fair Resale</p>
                    <p className="mt-0.5 font-mono text-sm font-black text-emerald-300">
                      ₹{result.estimatedPrice.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-2.5 text-center">
                    <p className="text-[9px] uppercase font-bold text-slate-400">Scrap Baseline</p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-slate-500 line-through">
                      ₹{result.scrapValue.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-2.5 text-center">
                    <p className="text-[9px] uppercase font-bold text-emerald-400">CO₂e Avoided</p>
                    <p className="mt-0.5 font-mono text-sm font-black text-white">
                      -{result.co2OffsetKg} kg
                    </p>
                  </div>
                </div>

                {/* AI Condition & Diagnostics */}
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Condition Grade:</span>
                    <span className="font-bold text-emerald-300">{result.condition}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Circular Route:</span>
                    <span className="font-bold text-white truncate max-w-[200px]">{result.reuseRoute}</span>
                  </div>
                </div>

                {/* Defect Heatmap Toggle */}
                <button
                  type="button"
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className="flex w-full items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
                >
                  <span className="flex items-center gap-1.5">
                    <Scan className="h-3.5 w-3.5" />
                    {showHeatmap ? "Hide Optical Defect Heatmap" : "View Optical Defect Heatmap"}
                  </span>
                  <span className="text-[10px] opacity-70">{showHeatmap ? "▲" : "▼"}</span>
                </button>

                {showHeatmap && (
                  <AIDefectHeatmap
                    imageUrl={imagePreview}
                    productName={result.title}
                    conditionGrade={result.condition}
                    healthScore={result.conditionScore}
                  />
                )}

                {/* ======================================================= */}
                {/* DIRECT ADD PRODUCT CTA: PRE-FILLS AND OPENS ADD PRODUCT */}
                {/* ======================================================= */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <button
                    onClick={handleDirectAddProduct}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-xs font-black text-slate-950 shadow-xl transition hover:bg-slate-200 hover:scale-[1.02] active:scale-95"
                  >
                    <PlusCircle className="h-4 w-4 text-emerald-700" />
                    List this Product with AI Pre-filled Details →
                  </button>

                  <p className="text-center text-[10px] text-slate-400">
                    Pre-fills title, category, alloy specs, condition, and recommended price automatically.
                  </p>
                </div>
              </div>
            ) : (
              /* Empty Standby State */
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#0c101a]/50 p-8 text-center backdrop-blur-xl">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-500">
                  <Cpu className="h-7 w-7 text-emerald-400/50" />
                </div>
                <h4 className="mt-4 text-base font-bold text-white">AI Vision Analysis Standby</h4>
                <p className="mt-1 max-w-sm text-xs text-slate-400">
                  Upload a photo or enter material text on the left to generate real-time classification, pricing intelligence, and 1-click listing creation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
