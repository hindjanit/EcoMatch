"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import {
  TrendingDown,
  Handshake,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Boxes,
} from "lucide-react";

type Offer = {
  id: string;
  product_id: number | string;
  buyer_id: string;
  seller_id: string;
  offer_price: number;
  counter_price: number | null;
  agreed_price: number | null;
  status: string;
  created_at: string;
};

type Product = { id: number | string; title: string; price: number; status: string };

export default function OffersPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [counterValues, setCounterValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadOffers();
  }, []);

  async function loadOffers() {
    setLoading(true);
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);
    const { data, error: offerError } = await supabase
      .from("product_offers")
      .select("*")
      .order("created_at", { ascending: false });

    if (offerError) {
      setError(offerError.message);
      setLoading(false);
      return;
    }
    const rows = (data || []) as Offer[];
    setOffers(rows);
    const ids = [...new Set(rows.map((o) => o.product_id))];
    if (ids.length) {
      const { data: productRows } = await supabase
        .from("products")
        .select("id,title,price,status")
        .in("id", ids);
      const map: Record<string, Product> = {};
      (productRows || []).forEach((p) => {
        map[String(p.id)] = p as Product;
      });
      setProducts(map);
    }
    setLoading(false);
  }

  async function updateOffer(offer: Offer, action: "reject" | "cancel" | "counter" | "accept") {
    setError("");
    setMessage("");
    const isSeller = offer.seller_id === userId;
    const now = new Date().toISOString();
    let update: Record<string, unknown> = { updated_at: now, last_action_by: userId };
    let agreedPrice: number | null = null;

    if (action === "reject") update.status = "rejected";
    if (action === "cancel") update.status = "cancelled";
    if (action === "counter") {
      const amount = Number(counterValues[offer.id]);
      if (!isSeller || !amount || amount <= 0) {
        setError("Enter a valid counter offer amount.");
        return;
      }
      update = { ...update, status: "countered", counter_price: amount };
    }
    if (action === "accept") {
      agreedPrice = isSeller ? Number(offer.offer_price) : Number(offer.counter_price || 0);
      if (!agreedPrice) {
        setError("No valid offer amount is available to accept.");
        return;
      }
      update = { ...update, status: "accepted", agreed_price: agreedPrice };
    }

    const { error: updateError } = await supabase.from("product_offers").update(update).eq("id", offer.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (action === "accept" && agreedPrice) {
      const { data: existing } = await supabase
        .from("deal_requests")
        .select("id,deal_code")
        .eq("source_offer_id", offer.id)
        .maybeSingle();

      if (!existing) {
        const dealCode = `ECO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const { error: dealError } = await supabase.from("deal_requests").insert({
          deal_code: dealCode,
          product_id: offer.product_id,
          buyer_id: offer.buyer_id,
          seller_id: offer.seller_id,
          status: "accepted",
          agreed_price: agreedPrice,
          source_offer_id: offer.id,
        });
        if (dealError) {
          setError(`Offer accepted, but deal could not be created: ${dealError.message}`);
          await loadOffers();
          return;
        }
        setMessage(`✓ Offer accepted at ₹${agreedPrice.toLocaleString("en-IN")}. Deal Room created!`);
      } else {
        setMessage("✓ Offer accepted. Available in My Deals.");
      }
    } else {
      setMessage(`✓ Offer ${action}ed.`);
    }
    await loadOffers();
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
              PRICE NEGOTIATIONS
            </span>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              My <span className="text-emerald-400">Offers</span>
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Review and manage buyer and seller price counter-offers.
            </p>
          </div>

          <Link
            href="/deals"
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
          >
            <Handshake className="h-4 w-4" /> Go to Deal Rooms
          </Link>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-4 text-xs font-semibold text-emerald-300">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/15 p-4 text-xs font-semibold text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 space-y-4">
            <div className="shimmer-box h-24 w-full rounded-2xl" />
            <div className="shimmer-box h-24 w-full rounded-2xl" />
          </div>
        ) : offers.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-emerald-500/20 bg-[#061d15]/60 p-12 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <TrendingDown className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-xl font-bold">No Active Offers</h3>
            <p className="mx-auto mt-2 max-w-md text-xs text-white/50">
              Make an offer on any negotiable material in the marketplace to start bargaining.
            </p>
            <Link
              href="/marketplace"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-black text-[#03140e] hover:bg-emerald-300"
            >
              Explore Marketplace
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {offers.map((offer) => {
              const product = products[String(offer.product_id)];
              const isSeller = offer.seller_id === userId;

              return (
                <div
                  key={offer.id}
                  className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-6 shadow-xl backdrop-blur-xl"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                          {isSeller ? "Incoming Buyer Offer" : "Your Outgoing Offer"}
                        </span>
                        <span className="text-xs text-white/50">{new Date(offer.created_at).toLocaleDateString()}</span>
                      </div>
                      <h3 className="mt-1 text-lg font-bold text-white">
                        {product?.title || `Material Lot #${offer.product_id}`}
                      </h3>
                      <div className="mt-1 flex items-center gap-3 text-xs">
                        <span className="text-white/60">Listed: ₹{product?.price?.toLocaleString("en-IN")}</span>
                        <span className="font-bold text-emerald-400">Offered: ₹{offer.offer_price?.toLocaleString("en-IN")}</span>
                        {offer.counter_price && (
                          <span className="font-bold text-amber-400">Counter: ₹{offer.counter_price?.toLocaleString("en-IN")}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-xl bg-white/10 px-3 py-1 text-xs font-bold uppercase text-white/80">
                        {offer.status}
                      </span>
                      {offer.status === "pending" && isSeller && (
                        <>
                          <button
                            onClick={() => updateOffer(offer, "accept")}
                            className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-[#03140e] hover:bg-emerald-300"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => updateOffer(offer, "reject")}
                            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20"
                          >
                            Decline
                          </button>
                        </>
                      )}
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
