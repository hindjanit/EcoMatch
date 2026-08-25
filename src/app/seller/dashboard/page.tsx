"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import {
  Boxes,
  PlusCircle,
  TrendingUp,
  ShieldCheck,
  Trash2,
  ExternalLink,
  DollarSign,
  PackageCheck,
  Clock,
  ArrowRight,
} from "lucide-react";

type Product = {
  id: string;
  title: string;
  category: string;
  price: number;
  quantity: number;
  quantity_unit: string;
  status: string;
  created_at: string;
};

type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  verification_status: string;
};

export default function SellerDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<string, ProductImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
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

    const { data, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (productError) {
      setError(productError.message);
      setProducts([]);
      setImages({});
      setLoading(false);
      return;
    }

    const sellerProducts = (data || []) as Product[];
    setProducts(sellerProducts);

    if (sellerProducts.length === 0) {
      setImages({});
      setLoading(false);
      return;
    }

    const productIds = sellerProducts.map((p) => p.id);
    const { data: imageData } = await supabase
      .from("product_images")
      .select("*")
      .in("product_id", productIds);

    if (imageData) {
      const groupedImages: Record<string, ProductImage[]> = {};
      imageData.forEach((img) => {
        if (!groupedImages[img.product_id]) groupedImages[img.product_id] = [];
        groupedImages[img.product_id].push(img);
      });
      setImages(groupedImages);
    }

    setLoading(false);
  }

  async function deleteProduct(productId: string) {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    setDeletingId(productId);
    const { error: delError } = await supabase.from("products").delete().eq("id", productId);
    if (delError) alert(delError.message);
    else await loadProducts();
    setDeletingId(null);
  }

  const totalValue = products.reduce((sum, p) => sum + Number(p.price || 0), 0);
  const approvedCount = products.filter((p) => p.status === "approved").length;
  const pendingCount = products.filter((p) => p.status === "pending").length;

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
              SUPPLIER PORTAL
            </span>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Seller <span className="text-emerald-400">Dashboard</span>
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Manage your industrial surplus listings, track buyer interest, and monitor deal rooms.
            </p>
          </div>

          <Link
            href="/seller/add-product"
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-5 py-3 text-xs font-black text-[#03140e] shadow-[0_0_20px_rgba(16,185,129,0.35)] transition hover:scale-[1.02]"
          >
            <PlusCircle className="h-4 w-4" /> Post New Material
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/15 p-4 text-xs font-bold text-red-300">
            {error}
          </div>
        )}

        {/* Bento Analytics Grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-white/50 text-xs">
              <span>Listed Catalog Value</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-black text-white">₹{totalValue.toLocaleString("en-IN")}</p>
            <p className="mt-1 text-[11px] text-emerald-400">Across {products.length} material lots</p>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-white/50 text-xs">
              <span>Active on Marketplace</span>
              <PackageCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-400">{approvedCount}</p>
            <p className="mt-1 text-[11px] text-white/50">Verified by Admin</p>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-white/50 text-xs">
              <span>Pending Review</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 text-2xl font-black text-amber-300">{pendingCount}</p>
            <p className="mt-1 text-[11px] text-white/50">AI Trust checks in progress</p>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-white/50 text-xs">
              <span>Safe Escrow Status</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-black text-white">Active</p>
            <p className="mt-1 text-[11px] text-emerald-400">OTP Handover Protected</p>
          </div>
        </div>

        {/* Listings Inventory Grid */}
        <div className="mt-10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Your Listed Inventory</h3>
            <span className="text-xs text-white/50">{products.length} total</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="shimmer-box h-20 w-full rounded-2xl" />
              <div className="shimmer-box h-20 w-full rounded-2xl" />
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-3xl border border-emerald-500/20 bg-[#061d15]/50 p-12 text-center shadow-xl">
              <Boxes className="mx-auto h-12 w-12 text-emerald-400/40" />
              <h4 className="mt-3 text-lg font-bold text-white">No Material Listings Yet</h4>
              <p className="mx-auto mt-1 max-w-sm text-xs text-white/50">
                Post your surplus materials with photos and specifications to reach industrial buyers.
              </p>
              <Link
                href="/seller/add-product"
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-[#03140e] hover:bg-emerald-300"
              >
                <PlusCircle className="h-4 w-4" /> Add First Listing
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {products.map((product) => {
                const productImages = images[product.id] || [];
                const previewUrl = productImages[0]?.image_url || null;

                return (
                  <div
                    key={product.id}
                    className="flex flex-col gap-4 rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-5 shadow-xl backdrop-blur-xl transition hover:border-emerald-400/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                        {previewUrl ? (
                          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-emerald-400/40">
                            <Boxes className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                            {product.category}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              product.status === "approved"
                                ? "bg-green-500/20 text-green-300"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {product.status}
                          </span>
                        </div>
                        <h4 className="mt-1 text-base font-bold text-white">{product.title}</h4>
                        <p className="mt-0.5 text-xs text-white/50">
                          ₹{Number(product.price).toLocaleString("en-IN")} · Available: {product.quantity} {product.quantity_unit || "units"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/product/${product.id}`}
                        className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </Link>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        disabled={deletingId === product.id}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
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