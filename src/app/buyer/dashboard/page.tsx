"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import ProductCard from "@/components/ProductCard";
import { GridSkeleton } from "@/components/SkeletonLoader";
import {
  ShoppingCart,
  Sparkles,
  Handshake,
  ShieldCheck,
  Search,
  ArrowRight,
  TrendingDown,
  Layers,
} from "lucide-react";

type Product = {
  id: string;
  seller_id: string;
  title: string;
  category: string;
  material: string;
  description: string | null;
  specifications: string | null;
  quantity: number;
  quantity_unit: string;
  price: number;
  is_negotiable: boolean;
  condition: string;
  status: string;
  created_at: string;
};

type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  verification_status: string;
};

export default function BuyerDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<string, ProductImage[]>>({});
  const [dealsCount, setDealsCount] = useState(0);
  const [offersCount, setOffersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBuyerData();
  }, []);

  async function fetchBuyerData() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    const [productRes, dealsRes, offersRes] = await Promise.all([
      supabase.from("products").select("*").eq("status", "approved").limit(6),
      supabase.from("deal_requests").select("id", { count: "exact" }).eq("buyer_id", user.id),
      supabase.from("product_offers").select("id", { count: "exact" }).eq("buyer_id", user.id),
    ]);

    if (productRes.error) {
      setError(productRes.error.message);
      setLoading(false);
      return;
    }

    const approved = (productRes.data || []) as Product[];
    setProducts(approved);
    setDealsCount(dealsRes.count || 0);
    setOffersCount(offersRes.count || 0);

    if (approved.length > 0) {
      const pIds = approved.map((p) => p.id);
      const { data: imgData } = await supabase
        .from("product_images")
        .select("*")
        .in("product_id", pIds)
        .eq("verification_status", "approved");

      if (imgData) {
        const grouped: Record<string, ProductImage[]> = {};
        imgData.forEach((img) => {
          if (!grouped[img.product_id]) grouped[img.product_id] = [];
          grouped[img.product_id].push(img);
        });
        setImages(grouped);
      }
    }

    setLoading(false);
  }

  return (
    <main className="eco-page min-h-screen text-white pb-24">
      <Navbar />

      <div className="eco-orb eco-orb-one" />
      <div className="eco-orb eco-orb-two" />

      <div className="relative mx-auto max-w-7xl px-4 pt-28 sm:px-6 lg:px-8">
        {/* Header Title */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
              PROCUREMENT HUB
            </span>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Buyer <span className="text-emerald-400">Dashboard</span>
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Procure verified surplus materials, match requirements with AI, and track deal rooms.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/ai-match"
              className="flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30"
            >
              <Sparkles className="h-4 w-4" /> AI Requirement Match
            </Link>
            <Link
              href="/marketplace"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-[#03140e] hover:bg-emerald-300"
            >
              Explore Catalog <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/15 p-4 text-xs font-bold text-red-300">
            {error}
          </div>
        )}

        {/* Bento Stats */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/deals"
            className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-5 shadow-xl backdrop-blur-xl transition hover:border-emerald-400/50 hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between text-white/50 text-xs">
              <span>My Active Deals</span>
              <Handshake className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-3xl font-black text-emerald-300">{dealsCount}</p>
            <p className="mt-1 text-[11px] text-white/50">OTP Handover Deal Rooms</p>
          </Link>

          <Link
            href="/offers"
            className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-5 shadow-xl backdrop-blur-xl transition hover:border-emerald-400/50 hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between text-white/50 text-xs">
              <span>Outgoing Offers</span>
              <TrendingDown className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 text-3xl font-black text-amber-300">{offersCount}</p>
            <p className="mt-1 text-[11px] text-white/50">Price Counter-Negotiations</p>
          </Link>

          <div className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-white/50 text-xs">
              <span>Escrow Protection</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-3xl font-black text-white">100%</p>
            <p className="mt-1 text-[11px] text-emerald-400">Secure Transfer Standard</p>
          </div>
        </div>

        {/* Recommended Circular Stock */}
        <div className="mt-10 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Freshly Verified Materials</h3>
            <Link href="/marketplace" className="text-xs font-bold text-emerald-400 hover:underline">
              View all
            </Link>
          </div>

          {loading ? (
            <GridSkeleton count={3} />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const productImages = images[product.id] || [];
                const firstImageUrl = productImages[0]?.image_url || null;

                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    imageUrl={firstImageUrl}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </main>
  );
}