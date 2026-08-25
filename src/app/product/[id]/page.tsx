"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import PriceGauge from "@/components/PriceGauge";
import TrustBadge from "@/components/TrustBadge";
import AIDefectHeatmap from "@/components/AIDefectHeatmap";
import ESGCertificateModal from "@/components/ESGCertificateModal";
import {
  Boxes,
  ShieldCheck,
  Tag,
  ArrowLeft,
  Handshake,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileText,
  Share2,
  ChevronRight,
  TrendingDown,
  SlidersHorizontal,
  Scissors,
  Calculator,
  Leaf,
  Scan,
  Download,
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
  purchase_price?: number | null;
  months_used?: number | null;
  ai_reference_price?: number | null;
  ai_fair_price_min?: number | null;
  ai_fair_price_max?: number | null;
  ai_price_verdict?: string | null;
  ai_price_confidence?: number | null;
  ai_price_reason?: string | null;
  ai_price_sources?: { title: string; url: string }[] | null;
  ai_price_checked_at?: string | null;
};

type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  verification_status: string;
};

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dealLoading, setDealLoading] = useState(false);
  const [dealMessage, setDealMessage] = useState("");

  // Partial Lot Splitting State
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [isSplitLot, setIsSplitLot] = useState<boolean>(false);

  // Offers State
  const [offerPrice, setOfferPrice] = useState("");
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerMessage, setOfferMessage] = useState("");
  const [showOfferModal, setShowOfferModal] = useState(false);

  // ESG Certificate Modal State
  const [showEsgModal, setShowEsgModal] = useState(false);

  // Active Tab: Gallery vs AI Defect Heatmap
  const [activeMediaTab, setActiveMediaTab] = useState<"gallery" | "heatmap">("gallery");

  const [sellerTrust, setSellerTrust] = useState<{
    verification_status?: string;
    trust_score?: number;
    full_name?: string;
  } | null>(null);

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  async function loadProduct() {
    setLoading(true);
    setError("");

    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !productData) {
      setError(productError?.message || "Product not found");
      setLoading(false);
      return;
    }

    setProduct(productData as Product);
    const totalQty = Number(productData.quantity) || 1;
    setSelectedQuantity(totalQty);

    const { data: sellerData } = await supabase
      .from("profiles")
      .select("verification_status, trust_score, full_name")
      .eq("id", productData.seller_id)
      .maybeSingle();

    setSellerTrust(sellerData || null);

    if ((productData as Product).is_negotiable) {
      setOfferPrice(
        String(Math.max(1, Math.round(Number((productData as Product).price) * 0.85)))
      );
    }

    const { data: imageData, error: imageError } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .eq("verification_status", "approved");

    if (!imageError && imageData) {
      setImages(imageData as ProductImage[]);
    }

    setLoading(false);
  }

  // Calculated Dynamic Split Pricing
  const totalQty = product?.quantity || 1;
  const totalPrice = Number(product?.price) || 0;
  const unitRate = totalQty > 0 ? totalPrice / totalQty : totalPrice;
  const calculatedSplitPrice = Math.round(unitRate * selectedQuantity);

  async function requestSecureDeal() {
    if (!product) return;
    if (product.status !== "approved") {
      setDealMessage("This listing is no longer available for a new secure deal.");
      return;
    }
    setDealLoading(true);
    setDealMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    if (user.id === product.seller_id) {
      setDealMessage("You cannot request a deal on your own listing.");
      setDealLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("deal_requests")
      .select("id,deal_code,status")
      .eq("product_id", product.id)
      .eq("buyer_id", user.id)
      .in("status", ["requested", "accepted", "meeting_planned", "exchange_ready"])
      .maybeSingle();

    if (existing) {
      setDealMessage(`Active secure deal exists: ${existing.deal_code}`);
      setDealLoading(false);
      router.push(`/deals/${existing.id}`);
      return;
    }

    const dealCode = `ECO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const { data: insertData, error: insertError } = await supabase
      .from("deal_requests")
      .insert({
        deal_code: dealCode,
        product_id: product.id,
        buyer_id: user.id,
        seller_id: product.seller_id,
        status: "requested",
      })
      .select("id")
      .single();

    if (insertError) {
      setDealMessage(insertError.message);
      setDealLoading(false);
      return;
    }

    setDealMessage(`✓ Secure Deal Room created! Redirecting...`);
    setTimeout(() => {
      if (insertData?.id) router.push(`/deals/${insertData.id}`);
      else router.push("/deals");
    }, 800);
    setDealLoading(false);
  }

  async function sendOffer() {
    if (!product || !product.is_negotiable) return;
    const amount = Number(offerPrice);
    if (!amount || amount <= 0) {
      setOfferMessage("Enter a valid offer amount.");
      return;
    }

    setOfferLoading(true);
    setOfferMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.id === product.seller_id) {
      setOfferMessage("You cannot make an offer on your own listing.");
      setOfferLoading(false);
      return;
    }

    const { error: offerError } = await supabase.from("product_offers").insert({
      product_id: product.id,
      buyer_id: user.id,
      seller_id: product.seller_id,
      offer_price: amount,
      status: "pending",
      last_action_by: user.id,
    });

    if (offerError) {
      setOfferMessage(offerError.message);
    } else {
      setOfferMessage(
        `✓ Offer for ${selectedQuantity} ${product.quantity_unit || "units"} at ₹${amount.toLocaleString(
          "en-IN"
        )} sent to seller!`
      );
      setTimeout(() => setShowOfferModal(false), 1400);
    }
    setOfferLoading(false);
  }

  function openChatWithSplitInquiry() {
    if (!product) return;
    const splitNote =
      selectedQuantity !== totalQty
        ? `&inquiry=${encodeURIComponent(
            `Hi, I am interested in purchasing ${selectedQuantity} ${
              product.quantity_unit || "units"
            } (out of ${totalQty}) at estimated ₹${calculatedSplitPrice.toLocaleString(
              "en-IN"
            )}. Is this partial quantity available?`
          )}`
        : "";
    const targetUrl = `/chat?productId=${encodeURIComponent(product.id)}&sellerId=${encodeURIComponent(
      product.seller_id
    )}${splitNote}`;
    router.push(targetUrl);
  }

  if (loading) {
    return (
      <main className="eco-page min-h-screen text-white">
        <Navbar />
        <div className="mx-auto max-w-7xl px-6 pt-32 text-center">
          <div className="shimmer-box mx-auto h-12 w-64 rounded-2xl" />
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div className="shimmer-box aspect-square w-full rounded-3xl" />
            <div className="space-y-4">
              <div className="shimmer-box h-8 w-3/4 rounded-xl" />
              <div className="shimmer-box h-12 w-1/2 rounded-xl" />
              <div className="shimmer-box h-32 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="eco-page min-h-screen text-white">
        <Navbar />
        <div className="mx-auto max-w-lg px-6 pt-36 text-center">
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-4 text-xl font-bold text-white">Material Not Found</h2>
            <p className="mt-2 text-xs text-white/60">{error}</p>
            <Link
              href="/marketplace"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-[#03140e]"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Marketplace
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const activeImage = images[activeImageIndex]?.image_url || null;

  return (
    <main className="eco-page min-h-screen text-white pb-24">
      <Navbar />

      <div className="eco-orb eco-orb-one" />
      <div className="eco-orb eco-orb-two" />

      <div className="relative mx-auto max-w-7xl px-4 pt-28 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Link href="/" className="hover:text-emerald-400">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/marketplace" className="hover:text-emerald-400">
            Marketplace
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-emerald-400">{product.category}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate max-w-[150px] text-white/80">{product.title}</span>
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-12">
          {/* Left Column: Image Gallery, AI Defect Heatmap & Highlights */}
          <div className="lg:col-span-7 space-y-6">
            {/* Media Mode Tabs */}
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#061812]/80 p-1.5 backdrop-blur-xl w-fit">
              <button
                onClick={() => setActiveMediaTab("gallery")}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  activeMediaTab === "gallery"
                    ? "bg-white text-slate-950 shadow-md"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Boxes className="h-3.5 w-3.5" /> Photos Gallery ({images.length || 1})
              </button>
              <button
                onClick={() => setActiveMediaTab("heatmap")}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  activeMediaTab === "heatmap"
                    ? "bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                    : "text-emerald-400 hover:text-emerald-300"
                }`}
              >
                <Scan className="h-3.5 w-3.5" /> AI Optical Defect Heatmap
              </button>
            </div>

            {/* Gallery View */}
            {activeMediaTab === "gallery" ? (
              <div className="card-3d relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-4 shadow-2xl backdrop-blur-2xl">
                {/* Main Image */}
                <div className="relative aspect-[16/11] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#03120c]">
                  {activeImage ? (
                    <img
                      src={activeImage}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-white/40">
                      <Boxes className="h-16 w-16 text-emerald-400/40" />
                      <span className="mt-2 text-sm font-semibold">{product.material}</span>
                    </div>
                  )}

                  <div className="absolute top-4 left-4">
                    <span className="rounded-xl border border-emerald-500/40 bg-[#051c14]/90 px-3 py-1 text-xs font-bold text-emerald-300 shadow-lg backdrop-blur-md">
                      {product.category}
                    </span>
                  </div>

                  <div className="absolute top-4 right-4">
                    <span className="rounded-xl border border-white/20 bg-black/70 px-3 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
                      Condition: {product.condition}
                    </span>
                  </div>
                </div>

                {/* Thumbnails Reel */}
                {images.length > 1 && (
                  <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                    {images.map((img, idx) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border transition-all ${
                          activeImageIndex === idx
                            ? "border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-105"
                            : "border-white/10 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* AI Defect Heatmap View */
              <AIDefectHeatmap
                imageUrl={activeImage}
                productName={product.title}
                conditionGrade={product.condition}
                healthScore={product.condition === "New" ? 99.2 : product.condition === "Grade A" ? 94.2 : 86.5}
              />
            )}

            {/* Description & Specifications Box */}
            <div className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/70 p-6 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-bold text-white">
                  <FileText className="h-4 w-4 text-emerald-400" /> Material Specifications
                </h3>

                {/* ESG Certificate Trigger Button */}
                <button
                  onClick={() => setShowEsgModal(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 shadow-sm transition hover:bg-emerald-500/25 hover:scale-105"
                >
                  <Leaf className="h-3.5 w-3.5 text-emerald-400" />
                  View ESG / EPR Certificate
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-white/70">
                <p className="leading-relaxed whitespace-pre-wrap">{product.description || "No custom description provided."}</p>
                {product.specifications && (
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="font-bold text-emerald-400">Technical Details:</p>
                    <p className="mt-1 leading-relaxed text-white/80">{product.specifications}</p>
                  </div>
                )}
              </div>

              {/* Quick Spec Matrix */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-white/40">Material</p>
                  <p className="mt-1 font-bold text-white">{product.material}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-white/40">Total Available</p>
                  <p className="mt-1 font-bold text-white">{product.quantity} {product.quantity_unit || "units"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-white/40">Listed On</p>
                  <p className="mt-1 font-bold text-white">{new Date(product.created_at).toLocaleDateString()}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-white/40">Escrow Security</p>
                  <p className="mt-1 font-bold text-emerald-400">Enabled 100%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Pricing, PARTIAL LOT SPLITTER, AI Radar, Trust & Actions */}
          <div className="lg:col-span-5 space-y-6">
            {/* Price & Primary Action Card */}
            <div className="rounded-3xl border border-emerald-500/25 bg-gradient-to-b from-[#07261b] to-[#04160f] p-6 shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                  {product.is_negotiable ? "Price Negotiable" : "Fixed Price"}
                </span>
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified Lot
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-black text-white sm:text-3xl">
                {product.title}
              </h1>

              {/* Base Price Rate Display */}
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">
                  ₹{calculatedSplitPrice.toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-white/60">
                  for {selectedQuantity} {product.quantity_unit || "units"}
                </span>
              </div>
              <p className="text-[11px] font-mono text-emerald-400/80 mt-0.5">
                Unit Base Rate: ₹{Math.round(unitRate).toLocaleString("en-IN")} / {product.quantity_unit || "unit"}
              </p>

              {/* ======================================================= */}
              {/* PARTIAL LOT SPLITTER & DYNAMIC QUANTITY CALCULATOR */}
              {/* ======================================================= */}
              {totalQty > 1 && (
                <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-[#03150e]/90 p-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                      <Scissors className="h-3.5 w-3.5 text-emerald-400" />
                      Partial Lot Splitting
                    </span>
                    <span className="text-[10px] text-white/50">
                      Max: {totalQty} {product.quantity_unit || "units"}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-white/60 leading-tight">
                    Only need a partial amount? Adjust quantity to calculate dynamic price:
                  </p>

                  {/* Quantity Slider */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold">
                      <span className="text-white/60">Required Volume:</span>
                      <span className="text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-400/30">
                        {selectedQuantity} {product.quantity_unit || "units"}
                      </span>
                    </div>

                    <input
                      type="range"
                      min={1}
                      max={totalQty}
                      value={selectedQuantity}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSelectedQuantity(val);
                        setIsSplitLot(val !== totalQty);
                        if (product.is_negotiable) {
                          setOfferPrice(String(Math.round(unitRate * val * 0.85)));
                        }
                      }}
                      className="w-full h-2 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />

                    <div className="flex justify-between text-[9px] text-white/40 font-mono">
                      <span>1 {product.quantity_unit}</span>
                      <span>{Math.round(totalQty / 2)} {product.quantity_unit}</span>
                      <span>Full Lot ({totalQty} {product.quantity_unit})</span>
                    </div>
                  </div>

                  {/* Summary Breakdown */}
                  {selectedQuantity !== totalQty && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-2.5 text-[11px] space-y-1">
                      <div className="flex justify-between text-white/70">
                        <span>Selected Batch:</span>
                        <span className="font-bold text-white">
                          {selectedQuantity} of {totalQty} {product.quantity_unit}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-bold border-t border-white/10 pt-1">
                        <span>Calculated Split Cost:</span>
                        <span>₹{calculatedSplitPrice.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Deal Status/Error message */}
              {dealMessage && (
                <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-3 text-xs font-semibold text-emerald-300">
                  {dealMessage}
                </div>
              )}

              {/* CTA Buttons */}
              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={requestSecureDeal}
                  disabled={dealLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 py-3.5 text-sm font-black text-[#03140e] shadow-[0_0_20px_rgba(16,185,129,0.35)] transition hover:from-emerald-300 hover:to-emerald-400 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                  <Handshake className="h-4 w-4" />
                  {dealLoading
                    ? "Opening Deal Room..."
                    : selectedQuantity !== totalQty
                    ? `Enter Deal Room for ${selectedQuantity} ${product.quantity_unit || "units"}`
                    : "Enter Secure Deal Room"}
                </button>

                <div className="grid grid-cols-2 gap-3">
                  {product.is_negotiable && (
                    <button
                      onClick={() => setShowOfferModal(true)}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                    >
                      <TrendingDown className="h-4 w-4" />
                      {selectedQuantity !== totalQty ? "Offer on Split Qty" : "Make Offer"}
                    </button>
                  )}
                  <button
                    onClick={openChatWithSplitInquiry}
                    className={`flex items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 py-3 text-xs font-bold text-white transition hover:bg-white/10 ${
                      !product.is_negotiable ? "col-span-2" : ""
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 text-emerald-400" />
                    {selectedQuantity !== totalQty ? `Ask for ${selectedQuantity} ${product.quantity_unit}` : "Chat with Seller"}
                  </button>
                </div>
              </div>
            </div>

            {/* AI Price Intelligence Widget */}
            <PriceGauge
              price={calculatedSplitPrice}
              fairMin={product.ai_fair_price_min ? Math.round((product.ai_fair_price_min / totalQty) * selectedQuantity) : null}
              fairMax={product.ai_fair_price_max ? Math.round((product.ai_fair_price_max / totalQty) * selectedQuantity) : null}
              referencePrice={product.ai_reference_price ? Math.round((product.ai_reference_price / totalQty) * selectedQuantity) : null}
              verdict={product.ai_price_verdict}
              confidence={product.ai_price_confidence}
              reason={product.ai_price_reason}
            />

            {/* Seller Trust Passport */}
            <TrustBadge
              sellerName={sellerTrust?.full_name}
              verificationStatus={sellerTrust?.verification_status}
              trustScore={sellerTrust?.trust_score}
            />
          </div>
        </div>
      </div>

      {/* Make Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-emerald-500/30 bg-[#061d15] p-6 shadow-2xl text-white animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-white">
              {selectedQuantity !== totalQty ? `Offer on ${selectedQuantity} ${product.quantity_unit}` : "Make an Offer"}
            </h3>
            <p className="mt-1 text-xs text-white/60">
              Calculated Subtotal: ₹{calculatedSplitPrice.toLocaleString("en-IN")}. Propose your counter-price to the seller.
            </p>

            <div className="mt-5 space-y-3">
              <label className="text-xs font-bold text-emerald-400">Offer Amount (₹)</label>
              <input
                type="number"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                className="w-full rounded-2xl border border-emerald-500/30 bg-[#03100b] p-3 text-lg font-bold text-white focus:border-emerald-400 focus:outline-none"
              />

              {offerMessage && (
                <p className="rounded-xl bg-emerald-500/20 p-2.5 text-xs font-semibold text-emerald-300">
                  {offerMessage}
                </p>
              )}

              <div className="mt-4 flex gap-3 pt-2">
                <button
                  onClick={() => setShowOfferModal(false)}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={sendOffer}
                  disabled={offerLoading}
                  className="flex-1 rounded-2xl bg-emerald-400 py-3 text-xs font-black text-[#03140e] shadow-lg hover:bg-emerald-300 disabled:opacity-50"
                >
                  {offerLoading ? "Sending..." : "Submit Offer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ESG Certificate Modal */}
      <ESGCertificateModal
        isOpen={showEsgModal}
        onClose={() => setShowEsgModal(false)}
        productTitle={product.title}
        materialType={product.material}
        quantity={selectedQuantity}
        quantityUnit={product.quantity_unit || "kg"}
        sellerName={sellerTrust?.full_name || "Verified Seller Entity"}
        co2OffsetKg={Math.round(selectedQuantity * 1.42 * 10) / 10}
      />

      <Footer />
      <MobileBottomNav />
    </main>
  );
}