"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { TrendingDown, Handshake } from "lucide-react";

type Offer = {
  id: string;
  product_id: number | string;
  buyer_id: string;
  seller_id: string;
  offer_price: number;
  counter_price: number | null;
  agreed_price: number | null;
  status: "pending" | "countered" | "accepted" | "rejected" | "cancelled" | string;
  created_at: string;
};

type Product = { id: number | string; title: string; price: number; status: string };
type OfferActionResult = { status?: string; dealId?: string | null; agreedPrice?: number | null };

export default function OffersPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [dealByOffer, setDealByOffer] = useState<Record<string, string>>({});
  const [counterValues, setCounterValues] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadOffers();
    // supabase/router are stable for this page instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadOffers() {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
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
    const productIds = [...new Set(rows.map((o) => o.product_id))];
    if (productIds.length) {
      const { data: productRows } = await supabase
        .from("products")
        .select("id,title,price,status")
        .in("id", productIds);
      const map: Record<string, Product> = {};
      (productRows || []).forEach((product) => { map[String(product.id)] = product as Product; });
      setProducts(map);
    } else {
      setProducts({});
    }

    const acceptedIds = rows.filter((o) => o.status === "accepted").map((o) => o.id);
    if (acceptedIds.length) {
      const { data: deals } = await supabase
        .from("deal_requests")
        .select("id,source_offer_id")
        .in("source_offer_id", acceptedIds);
      const map: Record<string, string> = {};
      (deals || []).forEach((deal) => {
        if (deal.source_offer_id) map[String(deal.source_offer_id)] = String(deal.id);
      });
      setDealByOffer(map);
    } else {
      setDealByOffer({});
    }
    setLoading(false);
  }

  async function updateOffer(offer: Offer, action: "reject" | "cancel" | "counter" | "accept") {
    setError("");
    setMessage("");
    setWorkingId(offer.id);
    try {
      let counterPrice: number | null = null;
      if (action === "counter") {
        counterPrice = Number(counterValues[offer.id]);
        if (!Number.isFinite(counterPrice) || counterPrice <= 0) {
          setError("Enter a valid counter offer amount.");
          return;
        }
      }

      const { data, error: rpcError } = await supabase.rpc("trust_offer_action", {
        p_offer: offer.id,
        p_action: action,
        p_counter_price: counterPrice,
      });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      const result = (data || {}) as OfferActionResult;
      if (result.status === "accepted") {
        const price = Number(result.agreedPrice || offer.counter_price || offer.offer_price);
        setMessage(`✓ Offer accepted at ₹${price.toLocaleString("en-IN")}. Deal Room is ready.`);
      } else if (action === "counter") {
        setMessage("✓ Counter-offer sent to the buyer.");
      } else if (action === "cancel") {
        setMessage("✓ Offer cancelled/declined.");
      } else {
        setMessage(`✓ Offer ${action}ed.`);
      }
      await loadOffers();
    } finally {
      setWorkingId("");
    }
  }

  return (
    <main className="eco-page min-h-screen text-white pb-24">
      <Navbar />
      <div className="eco-orb eco-orb-one" />
      <div className="eco-orb eco-orb-two" />

      <div className="relative mx-auto max-w-6xl px-4 pt-28 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">PRICE NEGOTIATIONS</span>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">My <span className="text-emerald-400">Offers</span></h1>
            <p className="mt-1 text-xs text-white/60">Review, counter and accept buyer/seller price negotiations.</p>
          </div>
          <Link href="/deals" className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20">
            <Handshake className="h-4 w-4" /> Go to Deal Rooms
          </Link>
        </div>

        {message && <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-4 text-xs font-semibold text-emerald-300">{message}</div>}
        {error && <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/15 p-4 text-xs font-semibold text-red-300">{error}</div>}

        {loading ? (
          <div className="mt-8 space-y-4"><div className="shimmer-box h-24 w-full rounded-2xl" /><div className="shimmer-box h-24 w-full rounded-2xl" /></div>
        ) : offers.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-emerald-500/20 bg-[#061d15]/60 p-12 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"><TrendingDown className="h-8 w-8" /></div>
            <h3 className="mt-4 text-xl font-bold">No Active Offers</h3>
            <p className="mx-auto mt-2 max-w-md text-xs text-white/50">Make an offer on any negotiable material in the marketplace to start bargaining.</p>
            <Link href="/marketplace" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-black text-[#03140e] hover:bg-emerald-300">Explore Marketplace</Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {offers.map((offer) => {
              const product = products[String(offer.product_id)];
              const isSeller = offer.seller_id === userId;
              const isBusy = workingId === offer.id;
              const dealId = dealByOffer[offer.id];
              return (
                <div key={offer.id} className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-6 shadow-xl backdrop-blur-xl">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">{isSeller ? "Incoming Buyer Offer" : "Your Outgoing Offer"}</span>
                        <span className="text-xs text-white/50">{new Date(offer.created_at).toLocaleDateString()}</span>
                      </div>
                      <h3 className="mt-1 text-lg font-bold text-white">{product?.title || `Material Lot #${offer.product_id}`}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-white/60">Listed: ₹{product?.price?.toLocaleString("en-IN")}</span>
                        <span className="font-bold text-emerald-400">Offered: ₹{offer.offer_price?.toLocaleString("en-IN")}</span>
                        {offer.counter_price && <span className="font-bold text-amber-400">Counter: ₹{offer.counter_price.toLocaleString("en-IN")}</span>}
                        {offer.agreed_price && <span className="font-bold text-cyan-300">Agreed: ₹{offer.agreed_price.toLocaleString("en-IN")}</span>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-xl bg-white/10 px-3 py-1 text-xs font-bold uppercase text-white/80">{offer.status}</span>

                      {offer.status === "pending" && isSeller && (
                        <>
                          <input
                            inputMode="decimal"
                            value={counterValues[offer.id] || ""}
                            onChange={(event) => setCounterValues((old) => ({ ...old, [offer.id]: event.target.value }))}
                            placeholder="Counter ₹"
                            className="w-28 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs outline-none focus:border-amber-400/50"
                          />
                          <button disabled={isBusy} onClick={() => void updateOffer(offer, "counter")} className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50">Counter</button>
                          <button disabled={isBusy} onClick={() => void updateOffer(offer, "accept")} className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-[#03140e] hover:bg-emerald-300 disabled:opacity-50">Accept</button>
                          <button disabled={isBusy} onClick={() => void updateOffer(offer, "reject")} className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-50">Decline</button>
                        </>
                      )}

                      {offer.status === "pending" && !isSeller && (
                        <button disabled={isBusy} onClick={() => void updateOffer(offer, "cancel")} className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-50">Cancel Offer</button>
                      )}

                      {offer.status === "countered" && isSeller && (
                        <>
                          <input
                            inputMode="decimal"
                            value={counterValues[offer.id] || ""}
                            onChange={(event) => setCounterValues((old) => ({ ...old, [offer.id]: event.target.value }))}
                            placeholder="Revise ₹"
                            className="w-28 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs outline-none focus:border-amber-400/50"
                          />
                          <button disabled={isBusy} onClick={() => void updateOffer(offer, "counter")} className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50">Update Counter</button>
                          <span className="text-xs text-white/50">Waiting for buyer</span>
                        </>
                      )}

                      {offer.status === "countered" && !isSeller && (
                        <>
                          <button disabled={isBusy} onClick={() => void updateOffer(offer, "accept")} className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-[#03140e] hover:bg-emerald-300 disabled:opacity-50">Accept Counter</button>
                          <button disabled={isBusy} onClick={() => void updateOffer(offer, "cancel")} className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-50">Decline</button>
                        </>
                      )}

                      {offer.status === "accepted" && dealId && (
                        <Link href={`/deals/${dealId}`} className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-[#03140e] hover:bg-emerald-300">Open Deal Room</Link>
                      )}
                      {offer.status === "accepted" && !dealId && <span className="text-xs text-amber-300">Deal Room is being prepared.</span>}
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
