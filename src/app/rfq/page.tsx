"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import {
  FileText,
  MapPin,
  Clock,
  Filter,
  Search,
  PlusCircle,
  Truck,
  ShieldCheck,
  Send,
  Loader2,
  Boxes,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

type RFQItem = {
  id: string;
  buyer_id: string;
  buyer_name?: string;
  material_type: string;
  target_quantity: number;
  quantity_unit: string;
  target_price_per_unit?: number;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "IMMEDIATE";
  location_city: string;
  location_state: string;
  cluster_radius_km: number;
  description?: string;
  status: "OPEN" | "IN_NEGOTIATION" | "FULFILLED" | "CLOSED";
  created_at: string;
};

export default function BuyerRfqBoardPage() {
  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Post new RFQ modal state
  const [showPostModal, setShowPostModal] = useState(false);
  const [materialType, setMaterialType] = useState("");
  const [targetQuantity, setTargetQuantity] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("MT");
  const [targetPrice, setTargetPrice] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [radius, setRadius] = useState("50");
  const [urgency, setUrgency] = useState<"LOW" | "MEDIUM" | "HIGH" | "IMMEDIATE">("HIGH");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  useEffect(() => {
    fetchRfqs();
  }, [cityFilter]);

  async function fetchRfqs() {
    setLoading(true);
    try {
      const url = cityFilter
        ? `/api/rfq?city=${encodeURIComponent(cityFilter)}`
        : `/api/rfq`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRfqs(data.rfqs || []);
      }
    } catch (e) {
      console.warn("Failed to fetch RFQs:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRfq(e: React.FormEvent) {
    e.preventDefault();
    if (!materialType || !targetQuantity || !city) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material_type: materialType,
          target_quantity: Number(targetQuantity),
          quantity_unit: quantityUnit,
          target_price_per_unit: targetPrice ? Number(targetPrice) : undefined,
          urgency,
          location_city: city,
          location_state: state || "India",
          cluster_radius_km: Number(radius),
          description,
        }),
      });

      const data = await res.json();
      if (data.success && data.rfq) {
        setRfqs((prev) => [data.rfq, ...prev]);
        setPostSuccess(true);
        setTimeout(() => {
          setPostSuccess(false);
          setShowPostModal(false);
          // reset fields
          setMaterialType("");
          setTargetQuantity("");
          setTargetPrice("");
          setCity("");
          setDescription("");
        }, 1500);
      }
    } catch (err) {
      alert("Failed to post RFQ.");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredRfqs = rfqs.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.material_type.toLowerCase().includes(q) ||
      r.location_city.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  return (
    <main className="eco-page min-h-screen text-white pb-24">
      <Navbar />

      <div className="relative mx-auto max-w-7xl px-4 pt-28 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                POINT 6: HYPERLOCAL LIQUIDITY
              </span>
              <span className="rounded-md border border-sky-500/40 bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-bold text-sky-300">
                INDUSTRIAL SOURCING
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Buyer Requisition & <span className="text-emerald-400">RFQ Board</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-white/60">
              Bulk buyers post real-time scrap demands. Suppliers respond with verified supply lots within their regional cluster.
            </p>
          </div>

          <button
            onClick={() => setShowPostModal(true)}
            className="self-start md:self-auto flex items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-xs font-black text-[#03140e] hover:bg-emerald-300 shadow-xl shadow-emerald-500/20 transition"
          >
            <PlusCircle className="h-4 w-4" /> Post New Material Requisition
          </button>
        </div>

        {/* Hyperlocal Regional Clusters & Filters */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-white/50 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" /> Regional Clusters:
            </span>
            {[
              { label: "All India", value: "" },
              { label: "Delhi NCR Cluster", value: "Delhi" },
              { label: "Kanpur / UP Central", value: "Kanpur" },
              { label: "Mumbai / Bhiwandi Cluster", value: "Mumbai" },
              { label: "Gujarat Industrial Belt", value: "Gujarat" },
            ].map((cluster) => (
              <button
                key={cluster.value}
                onClick={() => setCityFilter(cluster.value)}
                className={`rounded-xl px-3 py-1.5 font-bold transition ${
                  cityFilter === cluster.value
                    ? "bg-emerald-400 text-[#03140e]"
                    : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {cluster.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
            <input
              type="text"
              placeholder="Search grade or material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:outline-none"
            />
          </div>
        </div>

        {/* RFQ Cards Grid */}
        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 text-emerald-400 animate-spin" />
              <p className="mt-3 text-sm font-bold text-white/80">Scanning hyperlocal requisition board...</p>
            </div>
          ) : filteredRfqs.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
              <Boxes className="mx-auto h-10 w-10 text-white/30" />
              <h3 className="mt-3 text-base font-bold text-white">No active RFQs in this cluster</h3>
              <p className="mt-1 text-xs text-white/50">
                Be the first to post a bulk purchase requirement or choose another regional cluster.
              </p>
            </div>
          ) : (
            filteredRfqs.map((rfq) => (
              <div
                key={rfq.id}
                className="rounded-3xl border border-white/10 bg-[#07131b] p-6 shadow-xl hover:border-emerald-500/40 transition flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                      TARGET: {rfq.target_quantity} {rfq.quantity_unit}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                        rfq.urgency === "IMMEDIATE"
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : rfq.urgency === "HIGH"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                      }`}
                    >
                      {rfq.urgency} URGENCY
                    </span>
                    <span className="text-[11px] text-white/40 flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      {new Date(rfq.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white">{rfq.material_type}</h3>
                  {rfq.description && (
                    <p className="text-xs text-white/70 line-clamp-2">{rfq.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-white/50">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                      {rfq.location_city}, {rfq.location_state} (within {rfq.cluster_radius_km} km)
                    </span>
                    {rfq.buyer_name && (
                      <span className="flex items-center gap-1 font-medium text-white/80">
                        <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                        {rfq.buyer_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Action / Target Rate */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-white/40">Expected Rate</span>
                    <div className="font-mono text-xl font-black text-emerald-400">
                      {rfq.target_price_per_unit ? `₹${rfq.target_price_per_unit}/${rfq.quantity_unit}` : "Open for Quotes"}
                    </div>
                  </div>

                  <Link
                    href={`/marketplace?search=${encodeURIComponent(rfq.material_type)}`}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-400/20 border border-emerald-400/40 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-400/30 transition"
                  >
                    <span>Submit Supply Offer</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Post RFQ Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#07151e] p-6 sm:p-8 text-white shadow-2xl space-y-4">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" /> Post Circular Requisition (RFQ)
            </h2>
            <p className="text-xs text-white/60">
              Broadcast your scrap/material demand to regional aggregators and recycling plants.
            </p>

            {postSuccess ? (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/20 p-6 text-center text-emerald-300">
                <ShieldCheck className="mx-auto h-8 w-8 mb-2" />
                <h4 className="font-bold text-base">Requisition Published Successfully!</h4>
                <p className="text-xs text-emerald-200/80 mt-1">
                  Nearby suppliers within your cluster radius will be notified.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateRfq} className="space-y-3 text-xs">
                <div>
                  <label className="block text-white/70 mb-1 font-bold">Material / Grade Specification *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Clean Washed PET Flakes / Copper Wire Scrap Grade 1"
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/70 mb-1 font-bold">Required Quantity *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 10"
                      value={targetQuantity}
                      onChange={(e) => setTargetQuantity(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 mb-1 font-bold">Unit</label>
                    <select
                      value={quantityUnit}
                      onChange={(e) => setQuantityUnit(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#091d29] p-2.5 text-white focus:border-emerald-400 focus:outline-none"
                    >
                      <option value="MT">MT (Metric Tons)</option>
                      <option value="Kg">Kg (Kilograms)</option>
                      <option value="Bales">Bales</option>
                      <option value="Pieces">Pieces</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/70 mb-1 font-bold">Target Price / Unit (₹ optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 52"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 mb-1 font-bold">Urgency</label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value as any)}
                      className="w-full rounded-xl border border-white/10 bg-[#091d29] p-2.5 text-white focus:border-emerald-400 focus:outline-none"
                    >
                      <option value="IMMEDIATE">🚨 Immediate (Within 48h)</option>
                      <option value="HIGH">⚡ High (Within 1 week)</option>
                      <option value="MEDIUM">Regular Supply (Monthly)</option>
                      <option value="LOW">Low / Inquiring</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/70 mb-1 font-bold">Delivery City / Industrial Hub *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Okhla, New Delhi"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 mb-1 font-bold">Cluster Radius</label>
                    <select
                      value={radius}
                      onChange={(e) => setRadius(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#091d29] p-2.5 text-white focus:border-emerald-400 focus:outline-none"
                    >
                      <option value="30">Within 30 km</option>
                      <option value="50">Within 50 km</option>
                      <option value="100">Within 100 km</option>
                      <option value="250">Within 250 km</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 mb-1 font-bold">Specification Notes / Quality Tolerance</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Moisture must be <1.5%, unprinted only. Direct weighbridge slip required."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowPostModal(false)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-bold text-white/70 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-5 py-2 font-black text-[#03140e] hover:bg-emerald-300 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Broadcast RFQ
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
      <MobileBottomNav />
    </main>
  );
}
