"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  Layers,
  Maximize2,
  Scan,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type DefectZone = {
  id: string;
  label: string;
  type: "pristine" | "minor_wear" | "defect";
  confidence: number;
  description: string;
  x: number; // percentage
  y: number; // percentage
  width: number;
  height: number;
};

interface AIDefectHeatmapProps {
  imageUrl?: string | null;
  productName?: string;
  conditionGrade?: string;
  healthScore?: number;
  customZones?: DefectZone[];
}

const defaultZones: DefectZone[] = [
  {
    id: "z1",
    label: "Structural Core Housing",
    type: "pristine",
    confidence: 98.4,
    description: "Zero micro-fractures detected. 100% load bearing capacity intact.",
    x: 25,
    y: 30,
    width: 50,
    height: 40,
  },
  {
    id: "z2",
    label: "Surface Bezel Edge",
    type: "minor_wear",
    confidence: 91.2,
    description: "Minor cosmetic hairline scuff (0.2mm). Does not affect functionality.",
    x: 75,
    y: 20,
    width: 18,
    height: 25,
  },
  {
    id: "z3",
    label: "Connector / Terminal Bus",
    type: "pristine",
    confidence: 99.1,
    description: "Zero oxidation on brass terminals. Conductivity rated 100%.",
    x: 10,
    y: 65,
    width: 22,
    height: 25,
  },
];

export default function AIDefectHeatmap({
  imageUrl,
  productName = "Material Asset",
  conditionGrade = "Grade A-",
  healthScore = 93.8,
  customZones = defaultZones,
}: AIDefectHeatmapProps) {
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [activeZone, setActiveZone] = useState<DefectZone | null>(null);

  const zones = customZones && customZones.length > 0 ? customZones : defaultZones;

  return (
    <div className="rounded-3xl border border-emerald-500/25 bg-[#061812]/90 p-5 shadow-2xl backdrop-blur-2xl">
      {/* Header with Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/20 text-emerald-300">
            <Scan className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white">
              AI Optical Defect Heatmap
            </h4>
            <p className="text-[10px] text-white/50">
              Computer vision micro-geometry inspection
            </p>
          </div>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setHeatmapEnabled(!heatmapEnabled)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition-all ${
            heatmapEnabled
              ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              : "border-white/10 bg-white/5 text-white/60 hover:text-white"
          }`}
        >
          {heatmapEnabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {heatmapEnabled ? "Heatmap Active" : "Heatmap Hidden"}
        </button>
      </div>

      {/* Interactive Visual Canvas */}
      <div className="relative mt-4 aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/15 bg-[#030e09]">
        {/* Base Image */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={productName}
            className="h-full w-full object-cover transition duration-500"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#061e16] to-[#030e09] text-white/40">
            <Scan className="h-16 w-16 text-emerald-400/30 animate-pulse" />
            <span className="mt-2 text-xs font-mono text-white/60">{productName}</span>
          </div>
        )}

        {/* Heatmap Overlay Layer */}
        {heatmapEnabled && (
          <div className="pointer-events-none absolute inset-0 bg-emerald-950/20 backdrop-blur-[0.5px]">
            {/* Moving Laser Sweep line */}
            <div className="laser-sweep absolute inset-0 opacity-40" />

            {/* Diagnostic Corner Targets */}
            <div className="absolute top-2 left-2 h-3.5 w-3.5 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute top-2 right-2 h-3.5 w-3.5 border-t-2 border-r-2 border-emerald-400" />
            <div className="absolute bottom-2 left-2 h-3.5 w-3.5 border-b-2 border-l-2 border-emerald-400" />
            <div className="absolute bottom-2 right-2 h-3.5 w-3.5 border-b-2 border-r-2 border-emerald-400" />
          </div>
        )}

        {/* Interactive Hotspot Zones */}
        {heatmapEnabled &&
          zones.map((z) => {
            const isHovered = activeZone?.id === z.id;
            const borderColor =
              z.type === "pristine"
                ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                : z.type === "minor_wear"
                ? "border-amber-400 bg-amber-500/25 text-amber-300"
                : "border-red-400 bg-red-500/30 text-red-300";

            return (
              <div
                key={z.id}
                onMouseEnter={() => setActiveZone(z)}
                onClick={() => setActiveZone(z)}
                style={{
                  left: `${z.x}%`,
                  top: `${z.y}%`,
                  width: `${z.width}%`,
                  height: `${z.height}%`,
                }}
                className={`absolute cursor-pointer rounded-xl border-2 transition-all duration-300 ${borderColor} ${
                  isHovered
                    ? "scale-105 shadow-[0_0_20px_rgba(16,185,129,0.7)] z-20"
                    : "opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex items-center justify-between p-1.5">
                  <span className="rounded bg-black/80 px-1 py-0.5 text-[8px] font-bold font-mono">
                    {z.confidence}%
                  </span>
                  <span className="h-2 w-2 rounded-full bg-current animate-ping" />
                </div>
              </div>
            );
          })}

        {/* Selected Zone Tooltip Box */}
        {heatmapEnabled && activeZone && (
          <div className="absolute bottom-3 inset-x-3 rounded-xl border border-white/20 bg-black/90 p-2.5 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-emerald-400" />
                {activeZone.label}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  activeZone.type === "pristine"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                    : activeZone.type === "minor_wear"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                    : "bg-red-500/20 text-red-300 border border-red-400/40"
                }`}
              >
                {activeZone.type === "pristine"
                  ? "Pristine Structure"
                  : activeZone.type === "minor_wear"
                  ? "Minor Cosmetic Wear"
                  : "Requires Refurb"}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-white/70">{activeZone.description}</p>
          </div>
        )}
      </div>

      {/* Condition & Health Meter Footer */}
      <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
          <p className="text-[9px] uppercase font-bold text-white/40">Verified Grade</p>
          <p className="mt-0.5 text-xs font-black text-emerald-300">{conditionGrade}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
          <p className="text-[9px] uppercase font-bold text-white/40">Structural Health</p>
          <p className="mt-0.5 text-xs font-black text-white">{healthScore}%</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
          <p className="text-[9px] uppercase font-bold text-white/40">Refurb Potential</p>
          <p className="mt-0.5 text-xs font-black text-sky-300">96.2% High</p>
        </div>
      </div>
    </div>
  );
}
