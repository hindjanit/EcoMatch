"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import {
  Handshake,
  ShieldCheck,
  MapPin,
  Clock,
  ArrowRight,
  Boxes,
  PlusCircle,
  CheckCircle2,
} from "lucide-react";

type Deal = {
  id: string;
  deal_code: string;
  product_id: number | string;
  buyer_id: string;
  seller_id: string;
  status: string;
  meeting_location: string | null;
  meeting_at: string | null;
  buyer_confirmed: boolean;
  seller_confirmed: boolean;
  agreed_price?: number | null;
  created_at: string;
};

type Product = { id: number | string; title: string; price: number };

export default function DealsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadDeals();
  }, []);

  async function loadDeals() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);

    const { data, error } = await supabase
      .from("deal_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    const rows = (data || []) as Deal[];
    setDeals(rows);

    const ids = [...new Set(rows.map((d) => d.product_id))];
    if (ids.length) {
      const { data: productData } = await supabase
        .from("products")
        .select("id,title,price")
        .in("id", ids);
      const map: Record<string, Product> = {};
      (productData || []).forEach((p) => {
        map[String(p.id)] = p as Product;
      });
      setProducts(map);
    }
    setLoading(false);
  }

  return (
    <main className="eco-page min-h-screen text-white pb-24">
      <Navbar />

      <div className="eco-orb eco-orb-one" />
      <div className="eco-orb eco-orb-two" />

      <div className="relative mx-auto max-w-6xl px-4 pt-28 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
              SAFE EXCHANGE ENGINE
            </span>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Active <span className="text-emerald-400">Deal Rooms</span>
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Track and execute verified material handovers with OTP & QR security protocols.
            </p>
          </div>

          <Link
            href="/marketplace"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-[#03140e] hover:bg-emerald-300"
          >
            Explore Marketplace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-4 text-xs font-semibold text-emerald-300">
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-8 space-y-4">
            <div className="shimmer-box h-24 w-full rounded-2xl" />
            <div className="shimmer-box h-24 w-full rounded-2xl" />
          </div>
        ) : deals.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-emerald-500/20 bg-[#061d15]/60 p-12 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Handshake className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-xl font-bold">No Active Deals Found</h3>
            <p className="mx-auto mt-2 max-w-md text-xs text-white/50">
              Initiate a deal from any marketplace listing to coordinate secure physical pickup and OTP verified transfer.
            </p>
            <Link
              href="/marketplace"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-black text-[#03140e] hover:bg-emerald-300"
            >
              Browse Materials
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {deals.map((deal) => {
              const product = products[String(deal.product_id)];
              const isSeller = deal.seller_id === userId;
              const price = Number(deal.agreed_price || product?.price || 0);

              return (
                <div
                  key={deal.id}
                  className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-6 shadow-xl backdrop-blur-xl transition-all hover:border-emerald-400/40"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-400 font-bold">
                        <Handshake className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-white/50">
                            {deal.deal_code}
                          </span>
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                            You are {isSeller ? "Seller" : "Buyer"}
                          </span>
                        </div>
                        <h3 className="mt-1 text-lg font-bold text-white">
                          {product?.title || `Material Lot #${deal.product_id}`}
                        </h3>
                        <p className="mt-0.5 text-xs text-white/50">
                          Value: <strong className="text-emerald-400">₹{price.toLocaleString("en-IN")}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-xl px-3 py-1 text-xs font-bold uppercase ${
                          deal.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-white/10 text-white/80"
                        }`}
                      >
                        {deal.status.replaceAll("_", " ")}
                      </span>

                      <Link
                        href={`/deals/${deal.id}`}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-[#03140e] hover:bg-emerald-300"
                      >
                        Enter Deal Room <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
      <MobileBottomNav />
    </main>
  );
}
