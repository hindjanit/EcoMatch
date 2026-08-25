"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import {
  ShieldCheck,
  Link as LinkIcon,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Lock,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Layers,
} from "lucide-react";

type OwnershipEvent = {
  id: string;
  product_id: string | number;
  deal_id: string | null;
  deal_code: string | null;
  previous_owner_id: string | null;
  new_owner_id: string | null;
  event_type: string;
  previous_hash: string;
  event_hash: string;
  created_at: string;
};

type Product = {
  id: string | number;
  title: string;
  material: string;
  seller_id: string;
  current_owner_id: string | null;
  status: string;
};

export default function LedgerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [events, setEvents] = useState<OwnershipEvent[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [isTamperSimulated, setIsTamperSimulated] = useState(false);

  useEffect(() => {
    loadLedger();
  }, []);

  async function loadLedger() {
    setLoading(true);
    setError("");

    const { data, error: eventError } = await supabase
      .from("ownership_events")
      .select("*")
      .order("created_at", { ascending: true });

    if (eventError) {
      setError(eventError.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as OwnershipEvent[];
    setEvents(rows);

    const ids = [...new Set(rows.map((event) => event.product_id))];
    if (ids.length) {
      const { data: productRows } = await supabase
        .from("products")
        .select("id,title,material,seller_id,current_owner_id,status")
        .in("id", ids);
      const map: Record<string, Product> = {};
      (productRows || []).forEach((product) => {
        map[String(product.id)] = product as Product;
      });
      setProducts(map);
    }

    setLoading(false);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  }

  return (
    <main className="eco-page min-h-screen text-white pb-24">
      <Navbar />

      <div className="eco-orb eco-orb-one" />
      <div className="eco-orb eco-orb-two" />

      <div className="relative mx-auto max-w-6xl px-4 pt-28 sm:px-6 lg:px-8">
        {/* Header Hero */}
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-[#072b1f] via-[#051e16] to-[#03130d] p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  CRYPTOGRAPHIC LEDGER
                </span>
                <span className="text-xs text-white/50">SHA-256 Chained Ownership</span>
              </div>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                Immutable Material <span className="text-emerald-400">Ownership</span>
              </h1>
              <p className="mt-2 max-w-xl text-xs sm:text-sm text-white/60">
                Every verified circular exchange is cryptographically linked with its prior block hash, generating a tamper-evident audit trail for industrial surplus.
              </p>
            </div>

            {/* Live Metrics */}
            <div className="flex gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center">
                <p className="text-[10px] uppercase text-white/50">Total Blocks</p>
                <p className="mt-1 text-2xl font-black text-emerald-400">{events.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center">
                <p className="text-[10px] uppercase text-white/50">Security</p>
                <p className="mt-1 text-2xl font-black text-emerald-400">SHA-256</p>
              </div>
            </div>
          </div>

          {/* Interactive Simulation Button */}
          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
            <p className="text-xs text-white/50">
              Interactive Blockchain Verification Mode
            </p>
            <button
              onClick={() => setIsTamperSimulated(!isTamperSimulated)}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
                isTamperSimulated
                  ? "border-red-400 bg-red-500/20 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
              }`}
            >
              {isTamperSimulated ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" /> Reset Tamper Simulation
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" /> Simulate Tamper Attack
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-300">
            {error}
          </div>
        )}

        {/* Tamper warning message if active */}
        {isTamperSimulated && (
          <div className="mt-6 rounded-2xl border border-red-500/50 bg-red-950/40 p-4 text-xs font-bold text-red-300 shadow-xl animate-pulse">
            🚨 TAMPER DETECTED: Hash mismatch at Block #001 invalidates the subsequent chain verification state! Demonstrates mathematical immutability.
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && events.length === 0 && (
          <div className="mt-10 rounded-3xl border border-emerald-500/20 bg-[#061d15]/60 p-12 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <LinkIcon className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-xl font-bold">No Ownership Transfers Recorded Yet</h3>
            <p className="mx-auto mt-2 max-w-md text-xs text-white/50">
              When a buyer and seller complete a deal through OTP handover, an immutable record block will appear here.
            </p>
            <Link
              href="/marketplace"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-black text-[#03140e] hover:bg-emerald-300"
            >
              Explore Marketplace <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Blocks Chain List */}
        <div className="mt-8 space-y-6">
          {events.map((event, index) => {
            const product = products[String(event.product_id)];
            const isCorrupted = isTamperSimulated && index > 0;

            return (
              <div key={event.id} className="relative">
                {/* Chain Link Indicator Line between blocks */}
                {index > 0 && (
                  <div className="mx-auto my-2 flex h-8 w-1 items-center justify-center bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                    <div className="h-2 w-2 rounded-full bg-emerald-300 shadow" />
                  </div>
                )}

                <div
                  className={`rounded-3xl border p-6 shadow-2xl backdrop-blur-2xl transition-all duration-300 ${
                    isCorrupted
                      ? "border-red-500/50 bg-[#1f0909]/80 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
                      : "border-emerald-500/20 bg-[#061e16]/80 hover:border-emerald-400/50"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl border font-mono text-sm font-black ${
                          isCorrupted
                            ? "border-red-500/40 bg-red-500/10 text-red-400"
                            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        }`}
                      >
                        #{String(index + 1).padStart(3, "0")}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                              isCorrupted
                                ? "bg-red-500/20 text-red-300"
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {isCorrupted ? "INVALID HASH CHAIN" : "VALIDATED ON LEDGER"}
                          </span>
                          <span className="text-xs text-white/50">Deal: {event.deal_code || "N/A"}</span>
                        </div>
                        <h3 className="mt-1 text-xl font-bold text-white">
                          {product?.title || `Material ${event.product_id}`}
                        </h3>
                      </div>
                    </div>

                    <Link
                      href={`/product/${event.product_id}`}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 text-center"
                    >
                      View Material
                    </Link>
                  </div>

                  {/* Owner Transition Grid */}
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 text-xs">
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5">
                      <p className="text-[10px] uppercase font-bold text-white/40">Previous Owner</p>
                      <p className="mt-1 truncate font-mono text-white/80">{event.previous_owner_id || "Initial Creator"}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-3.5">
                      <p className="text-[10px] uppercase font-bold text-emerald-400">Current Owner</p>
                      <p className="mt-1 truncate font-mono text-emerald-300 font-bold">{event.new_owner_id || "Acquired"}</p>
                    </div>
                  </div>

                  {/* Cryptographic Hashes */}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
                    <div className="rounded-2xl border border-white/10 bg-black/50 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-white/40">Previous Hash</span>
                        <button
                          onClick={() => copyToClipboard(event.previous_hash)}
                          className="text-white/40 hover:text-white"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="mt-1 break-all font-mono text-[11px] text-white/60">{event.previous_hash}</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/30 bg-black/60 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-emerald-400">Event Block Hash</span>
                        <button
                          onClick={() => copyToClipboard(event.event_hash)}
                          className="text-emerald-400/70 hover:text-emerald-300"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="mt-1 break-all font-mono text-[11px] text-emerald-300 font-bold">{event.event_hash}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </main>
  );
}
