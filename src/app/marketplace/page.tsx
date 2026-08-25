"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FILTER_CATEGORIES, PRODUCT_CONDITIONS } from "@/lib/catalog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import ProductCard from "@/components/ProductCard";
import { GridSkeleton } from "@/components/SkeletonLoader";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Sparkles,
  Layers,
  RotateCcw,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  X,
  Boxes,
  PlusCircle,
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

type SellerLocation = {
  latitude: number;
  longitude: number;
  location_name?: string | null;
  verification_status?: string | null;
  trust_score?: number | null;
};

const categories = FILTER_CATEGORIES;
const conditions = ["All", ...PRODUCT_CONDITIONS] as const;

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export default function MarketplacePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<string, ProductImage[]>>({});
  const [sellerLocations, setSellerLocations] = useState<Record<string, SellerLocation>>({});

  const [buyerLatitude, setBuyerLatitude] = useState<number | null>(null);
  const [buyerLongitude, setBuyerLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [condition, setCondition] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [distance, setDistance] = useState(50);
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "distance">("newest");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("PRODUCT FETCH ERROR:", error);
      setMessage(error.message);
      setProducts([]);
      setImages({});
      setSellerLocations({});
      setLoading(false);
      return;
    }

    const approvedProducts = (data || []) as Product[];
    setProducts(approvedProducts);

    if (approvedProducts.length === 0) {
      setImages({});
      setSellerLocations({});
      setLoading(false);
      return;
    }

    const productIds = approvedProducts.map((p) => p.id);
    const sellerIds = [...new Set(approvedProducts.map((p) => p.seller_id))];

    // Fetch images and seller profiles in parallel
    const [imageRes, profileRes] = await Promise.all([
      supabase
        .from("product_images")
        .select("*")
        .in("product_id", productIds)
        .eq("verification_status", "approved"),
      supabase
        .from("profiles")
        .select("id, latitude, longitude, location_name, verification_status, trust_score")
        .in("id", sellerIds),
    ]);

    if (imageRes.data) {
      const groupedImages: Record<string, ProductImage[]> = {};
      imageRes.data.forEach((img) => {
        if (!groupedImages[img.product_id]) groupedImages[img.product_id] = [];
        groupedImages[img.product_id].push(img);
      });
      setImages(groupedImages);
    }

    if (profileRes.data) {
      const locationMap: Record<string, SellerLocation> = {};
      profileRes.data.forEach((prof) => {
        locationMap[prof.id] = {
          latitude: prof.latitude !== null ? Number(prof.latitude) : 0,
          longitude: prof.longitude !== null ? Number(prof.longitude) : 0,
          location_name: prof.location_name,
          verification_status: prof.verification_status,
          trust_score: prof.trust_score,
        };
      });
      setSellerLocations(locationMap);
    }

    setLoading(false);
  }

  function handleUseBuyerLocation() {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage("Your browser does not support geolocation.");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBuyerLatitude(position.coords.latitude);
        setBuyerLongitude(position.coords.longitude);
        setLocationLoading(false);
        setLocationMessage("✓ Location acquired! Listings ranked by distance.");
      },
      (error) => {
        console.error("GPS Error:", error);
        setLocationLoading(false);
        setLocationMessage("Could not retrieve GPS location.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function getProductDistance(product: Product) {
    if (buyerLatitude === null || buyerLongitude === null) return null;
    const seller = sellerLocations[product.seller_id];
    if (!seller || !seller.latitude || !seller.longitude) return null;
    return calculateDistanceKm(buyerLatitude, buyerLongitude, seller.latitude, seller.longitude);
  }

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const searchText = search.toLowerCase().trim();
      const matchesSearch =
        !searchText ||
        product.title.toLowerCase().includes(searchText) ||
        product.material.toLowerCase().includes(searchText) ||
        (product.description || "").toLowerCase().includes(searchText) ||
        (product.specifications || "").toLowerCase().includes(searchText);

      const matchesCategory = category === "All" || product.category === category;
      const matchesCondition = condition === "All" || product.condition === condition;

      const min = minPrice ? Number(minPrice) : null;
      const max = maxPrice ? Number(maxPrice) : null;
      const matchesMin = min === null || product.price >= min;
      const matchesMax = max === null || product.price <= max;

      let matchesDistance = true;
      if (buyerLatitude !== null && buyerLongitude !== null) {
        const dist = getProductDistance(product);
        if (dist !== null) {
          if (distance < 50) matchesDistance = dist <= distance;
        } else {
          if (distance < 50) matchesDistance = false;
        }
      }

      let matchesVerified = true;
      if (verifiedOnly) {
        const seller = sellerLocations[product.seller_id];
        matchesVerified = seller?.verification_status === "verified";
      }

      return matchesSearch && matchesCategory && matchesCondition && matchesMin && matchesMax && matchesDistance && matchesVerified;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "distance") {
        const distA = getProductDistance(a) ?? 999999;
        const distB = getProductDistance(b) ?? 999999;
        return distA - distB;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [
    products,
    search,
    category,
    condition,
    minPrice,
    maxPrice,
    distance,
    buyerLatitude,
    buyerLongitude,
    sellerLocations,
    verifiedOnly,
    sortBy,
  ]);

  function clearFilters() {
    setSearch("");
    setCategory("All");
    setCondition("All");
    setMinPrice("");
    setMaxPrice("");
    setDistance(50);
    setVerifiedOnly(false);
    setSortBy("newest");
  }

  const activeFilterCount = [
    category !== "All",
    condition !== "All",
    minPrice !== "",
    maxPrice !== "",
    distance < 50,
    verifiedOnly,
  ].filter(Boolean).length;

  return (
    <main className="eco-page min-h-screen text-white relative pb-20">
      <Navbar />

      {/* Ambient Glows */}
      <div className="eco-orb eco-orb-one" />
      <div className="eco-orb eco-orb-two" />

      <section className="relative mx-auto max-w-7xl px-4 pt-28 sm:px-6 lg:px-8">
        {/* Header Title & Subtitle */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                CIRCULAR MARKETPLACE
              </span>
              <span className="text-xs text-slate-400">Verified Surplus Materials</span>
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl text-[#FAF8F5]">
              Exchange Reusable <span className="bg-gradient-to-r from-emerald-300 via-[#9CB4A7] to-[#FAF8F5] bg-clip-text text-transparent">Materials</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              Discover verified industrial surplus, recyclable stocks, and reusable inventory with AI price intelligence and safe escrow deal rooms.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/seller/add-product")}
              className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black text-slate-950 shadow-lg transition hover:scale-[1.02] hover:bg-slate-200"
            >
              <PlusCircle className="h-4 w-4" />
              List Material For Free
            </button>
          </div>
        </div>

        {/* Search & Action Bar */}
        <div className="mt-8 rounded-3xl border border-white/10 bg-[#0c101a]/85 p-4 shadow-2xl backdrop-blur-2xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search materials (e.g. Aluminium offcuts, HDPE drums, copper wire, timber)..."
                className="w-full rounded-2xl border border-white/10 bg-[#07090e] pl-11 pr-10 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-xs font-bold transition ${
                showFilters || activeFilterCount > 0
                  ? "border-sky-400 bg-sky-500/20 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-400 text-[10px] font-black text-slate-950">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="relative flex items-center">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full rounded-2xl border border-white/10 bg-[#07090e] px-4 py-3 text-xs font-bold text-slate-200 focus:border-sky-400 focus:outline-none sm:w-auto"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="distance">Nearest Distance</option>
              </select>
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all ${
                    isSelected
                      ? "border-sky-400/40 bg-sky-500/20 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.2)] scale-[1.02]"
                      : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <Layers className="h-3 w-3" />
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Collapsible Filter Panel */}
          {showFilters && (
            <div className="mt-4 grid gap-6 border-t border-white/10 pt-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Distance Radius */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white/80">
                  <span>Proximity Radius</span>
                  <span className="text-emerald-400">{distance >= 50 ? "50+ km (Any)" : `${distance} km`}</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={distance}
                  onChange={(e) => setDistance(Number(e.target.value))}
                  className="w-full accent-emerald-400"
                />
                <button
                  onClick={handleUseBuyerLocation}
                  disabled={locationLoading}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-1.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  <MapPin className="h-3 w-3" />
                  {locationLoading ? "Acquiring GPS..." : "Use My Live GPS Location"}
                </button>
                {locationMessage && (
                  <p className="text-[10px] text-emerald-400/80 text-center">{locationMessage}</p>
                )}
              </div>

              {/* Price Range Filter */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-white/80">Price Range (₹)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#03110b] p-2 text-xs text-white placeholder:text-white/30"
                  />
                  <span className="text-white/40">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#03110b] p-2 text-xs text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              {/* Condition Filter */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-white/80">Material Condition</span>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#03110b] p-2 text-xs font-semibold text-white focus:border-emerald-400 focus:outline-none"
                >
                  {conditions.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
              </div>

              {/* Verified Sellers Toggle & Reset */}
              <div className="flex flex-col justify-between space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white/80">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-400"
                  />
                  <span>Verified Sellers Only</span>
                </label>

                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset All Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Metadata Bar */}
        <div className="mt-8 flex items-center justify-between text-xs text-white/60">
          <p>
            Showing <strong className="text-emerald-400">{filteredProducts.length}</strong> verified materials
            {category !== "All" && ` in ${category}`}
          </p>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Catalog</span>
          </div>
        </div>

        {/* Products Grid */}
        <div className="mt-6">
          {loading ? (
            <GridSkeleton count={6} />
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => {
                const productImages = images[product.id] || [];
                const firstImageUrl = productImages[0]?.image_url || null;
                const distanceKm = getProductDistance(product);
                const seller = sellerLocations[product.seller_id];

                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    imageUrl={firstImageUrl}
                    distanceKm={distanceKm}
                    locationName={seller?.location_name}
                    isVerifiedSeller={seller?.verification_status === "verified"}
                    trustScore={seller?.trust_score}
                  />
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="mt-12 rounded-3xl border border-emerald-500/20 bg-[#061d15]/50 p-12 text-center shadow-2xl backdrop-blur-xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <Boxes className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">No materials matched your search</h3>
              <p className="mx-auto mt-2 max-w-md text-xs text-white/50">
                Try widening your distance slider, removing category filters, or using the AI classifier to match alternative surplus.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={clearFilters}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => router.push("/seller/add-product")}
                  className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-[#03140e] hover:bg-emerald-300"
                >
                  Post First Listing
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </main>
  );
}