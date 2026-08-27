"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";

import {
  Phone,
  PhoneCall,
  Volume2,
  AlertTriangle,
  ShieldAlert,
  Ban,
  CheckCircle2,
  Clock,
  User,
  Boxes,
  Loader2,
  RotateCcw,
  ShieldCheck,
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
  ai_review_bucket?: "normal" | "review" | "likely_scam" | string;
  ai_risk_score?: number | null;
  ai_risk_reasons?: string[] | null;
};

type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  verification_status: string;
};

type DealCallLog = {
  id: string;
  deal_id: string;
  caller_id: string;
  receiver_id: string;
  duration_seconds: number;
  recording_url: string | null;
  status: string;
  created_at: string;
  deal?: {
    deal_code: string;
    agreed_price: number;
    status: string;
    product?: {
      title: string;
      category: string;
    };
  };
  caller?: {
    id: string;
    full_name: string | null;
    warning_count?: number;
    is_banned?: boolean;
    verification_status?: string;
  };
  receiver?: {
    id: string;
    full_name: string | null;
    warning_count?: number;
    is_banned?: boolean;
    verification_status?: string;
  };
};

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"products" | "calls">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [callLogs, setCallLogs] = useState<DealCallLog[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [callActionLoading, setCallActionLoading] = useState<string | null>(null);

  const [images, setImages] = useState<
    Record<string, ProductImage[]>
  >({});

  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "info"
  >("info");

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);

  const [riskFilter, setRiskFilter] = useState<"all" | "normal" | "review" | "likely_scam">("all");

  useEffect(() => {
  checkAdminAndLoad();
}, []);

async function checkAdminAndLoad() {
  setLoading(true);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Not logged in
  if (userError || !user) {
    router.replace("/login");
    return;
  }

  // Check role from profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Profile error:", profileError);
    router.replace("/marketplace");
    return;
  }

  // Block buyer/seller
  if (profile.role !== "admin") {
    alert("Access denied. Admin only.");
    router.replace("/marketplace");
    return;
  }

  // Admin verified
  await loadPendingProducts();
}
  const totalImages = useMemo(() => {
    return Object.values(images).reduce(
      (total, productImages) =>
        total + productImages.length,
      0
    );
  }, [images]);

  const riskCounts = useMemo(() => ({
    normal: products.filter((p) => (p.ai_review_bucket || "normal") === "normal").length,
    review: products.filter((p) => p.ai_review_bucket === "review").length,
    likely_scam: products.filter((p) => p.ai_review_bucket === "likely_scam").length,
  }), [products]);

  const filteredProducts = useMemo(() => {
    if (riskFilter === "all") return products;
    return products.filter((p) => (p.ai_review_bucket || "normal") === riskFilter);
  }, [products, riskFilter]);

  async function loadPendingProducts() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "ADMIN PRODUCT LOAD ERROR:",
        error
      );

      setMessage(
        `Products load failed: ${error.message}`
      );

      setMessageType("error");
      setLoading(false);
      return;
    }

    const pendingProducts =
      (data || []) as Product[];

    setProducts(pendingProducts);

    if (pendingProducts.length === 0) {
      setImages({});
      setLoading(false);
      return;
    }

    const productIds =
      pendingProducts.map(
        (product) => product.id
      );

    const {
      data: imageData,
      error: imageError,
    } = await supabase
      .from("product_images")
      .select("*")
      .in("product_id", productIds);

    if (imageError) {
      console.error(
        "ADMIN IMAGE LOAD ERROR:",
        imageError
      );

      setMessage(
        `Products loaded, but images failed to load: ${imageError.message}`
      );

      setMessageType("error");
      setImages({});
    } else {
      const groupedImages: Record<
        string,
        ProductImage[]
      > = {};

      (
        (imageData || []) as ProductImage[]
      ).forEach((image) => {
        if (
          !groupedImages[
            image.product_id
          ]
        ) {
          groupedImages[
            image.product_id
          ] = [];
        }

        groupedImages[
          image.product_id
        ].push(image);
      });

      setImages(groupedImages);
    }

    setLoading(false);
  }

  async function loadCallLogs() {
    setCallsLoading(true);
    try {
      const { data, error } = await supabase
        .from("deal_call_logs")
        .select(`
          *,
          caller:caller_id(id, full_name, warning_count, is_banned, verification_status),
          receiver:receiver_id(id, full_name, warning_count, is_banned, verification_status),
          deal:deal_id(
            deal_code, agreed_price, status,
            product:product_id(title, category)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Load call logs error:", error);
      } else {
        setCallLogs((data || []) as DealCallLog[]);
      }
    } catch (e) {
      console.warn("Exception loading calls:", e);
    } finally {
      setCallsLoading(false);
    }
  }

  async function handleIssueStrike(userId: string, userName: string, action: "warning" | "ban") {
    const defaultReason =
      action === "warning"
        ? "Attempted off-platform transaction diversion or shared phone number on secure call."
        : "Severe safety violation: Off-platform diversion attempt.";

    const reasonPrompt = window.prompt(
      action === "warning"
        ? `Issue Safety Strike Warning to ${userName}?\nEnter reason:`
        : `Permanently BAN ${userName}?\nEnter reason:`,
      defaultReason
    );
    if (!reasonPrompt) return;

    setCallActionLoading(userId);
    try {
      const { data, error } = await supabase.rpc("admin_issue_warning_or_ban", {
        p_user_id: userId,
        p_action: action,
        p_reason: reasonPrompt,
      });

      if (error || !data?.success) {
        alert(`Action failed: ${error?.message || data?.error || "Error executing action"}`);
      } else {
        if (data.action === "banned") {
          alert(`🚫 User ${userName} has been BANNED (Strike 2 auto-ban or direct ban)!`);
        } else {
          alert(`⚠️ Strike 1 warning issued to ${userName}. (Current warnings: ${data.warnings}/2)`);
        }
        await loadCallLogs();
      }
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setCallActionLoading(null);
    }
  }

  async function updateProductStatus(
    productId: string,
    status: "approved" | "rejected"
  ) {
    const confirmationMessage =
      status === "approved"
        ? "Approve this product and publish it on the marketplace?"
        : "Reject this product listing?";

    const confirmed =
      window.confirm(
        confirmationMessage
      );

    if (!confirmed) {
      return;
    }

    setProcessingId(productId);

    setMessage(
      status === "approved"
        ? "Approving product..."
        : "Rejecting product..."
    );

    setMessageType("info");

    try {
      // --------------------------------
      // UPDATE PRODUCT
      // --------------------------------

      const {
        error: productError,
      } = await supabase
        .from("products")
        .update({
          status,
        })
        .eq("id", productId);

      if (productError) {
        console.error(
          "PRODUCT STATUS ERROR:",
          productError
        );

        setMessage(
          `Product update failed: ${productError.message}`
        );

        setMessageType("error");
        setProcessingId(null);
        return;
      }

      // --------------------------------
      // UPDATE PRODUCT IMAGES
      // --------------------------------

      const {
        error: imageError,
      } = await supabase
        .from("product_images")
        .update({
          verification_status:
            status,
        })
        .eq(
          "product_id",
          productId
        );

      if (imageError) {
        console.error(
          "IMAGE STATUS ERROR:",
          imageError
        );

        setMessage(
          `Product was ${status}, but image verification could not be updated: ${imageError.message}`
        );

        setMessageType("error");

        await loadPendingProducts();

        setProcessingId(null);
        return;
      }

      setMessage(
        status === "approved"
          ? "✅ Product approved successfully and published to the marketplace."
          : "❌ Product rejected successfully."
      );

      setMessageType("success");

      // Remove immediately from screen
      setProducts((current) =>
        current.filter(
          (product) =>
            product.id !==
            productId
        )
      );

      setImages((current) => {
        const updated = {
          ...current,
        };

        delete updated[
          productId
        ];

        return updated;
      });
    } catch (error) {
      console.error(
        "UNEXPECTED ADMIN ERROR:",
        error
      );

      setMessage(
        `Unexpected error: ${
          error instanceof Error
            ? error.message
            : "Unknown error"
        }`
      );

      setMessageType("error");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    router.push("/login");
  }

  function getMessageClasses() {
    if (
      messageType === "success"
    ) {
      return "border-green-200 bg-green-50 text-green-700";
    }

    if (
      messageType === "error"
    ) {
      return "border-red-200 bg-red-50 text-red-700";
    }

    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return (
    <main className="eco-page min-h-screen text-white pb-24 relative overflow-hidden">
      <Navbar />

      <div className="eco-orb eco-orb-one" />
      {/* ADMIN CONTENT */}
      <section className="relative mx-auto max-w-7xl px-4 pt-28 sm:px-6 lg:px-8">
        {/* ADMIN HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
              TRUST & SAFETY GATEWAY
            </span>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Admin Platform <span className="text-emerald-400">Moderation</span>
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Inspect pending supplier materials, review AI risk signals, and audit recorded handover calls.
            </p>
          </div>

          <div className="flex gap-2">
            {activeTab === "products" ? (
              <button
                onClick={loadPendingProducts}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Refresh Review Queue
              </button>
            ) : (
              <button
                onClick={loadCallLogs}
                disabled={callsLoading}
                className="flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-xs font-bold text-sky-300 hover:bg-sky-500/20 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Refresh Call Logs
              </button>
            )}
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex flex-wrap gap-3 border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black transition ${
              activeTab === "products"
                ? "bg-emerald-400 text-[#03140e] shadow-lg shadow-emerald-500/20"
                : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>📦 Material Ingestion Queue ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("calls");
              loadCallLogs();
            }}
            className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black transition ${
              activeTab === "calls"
                ? "bg-sky-400 text-[#021824] shadow-lg shadow-sky-500/20"
                : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <PhoneCall className="h-4 w-4" />
            <span>🎙️ Handover Call Audits & Moderation ({callLogs.length})</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: PRODUCT LISTINGS */}
        {/* ========================================================================= */}
        {activeTab === "products" && (
          <>
            {!loading && (
              <div className="mt-4 flex gap-3">
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-3">
                  <p className="text-xs font-semibold text-yellow-700">Pending</p>
                  <p className="mt-1 text-2xl font-bold text-yellow-800">{products.length}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white px-5 py-3">
                  <p className="text-xs font-semibold text-gray-500">Images to Review</p>
                  <p className="mt-1 text-2xl font-bold text-[#163038]">{totalImages}</p>
                </div>
              </div>
            )}

        {/* MESSAGE */}
        {message && (
          <div
            className={`mt-6 rounded-xl border p-4 text-sm font-medium ${getMessageClasses()}`}
          >
            {message}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">
              🛡️
            </div>

            <p className="mt-4 font-semibold text-[#163038]">
              Loading pending
              listings...
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Fetching products and
              verification images.
            </p>
          </div>
        )}

        {/* EMPTY */}
        {!loading &&
          products.length === 0 && (
            <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <div className="text-6xl">
                ✅
              </div>

              <h2 className="mt-5 text-xl font-bold text-[#163038]">
                No pending products
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                All submitted products
                have been reviewed.
              </p>

              <button
                onClick={() =>
                  router.push(
                    "/marketplace"
                  )
                }
                className="mt-6 rounded-xl bg-[#187052] px-6 py-3 text-sm font-semibold text-white hover:bg-[#125c43]"
              >
                View Marketplace
              </button>
            </div>
          )}

        {!loading && products.length > 0 && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: `All Pending (${products.length})` },
                { key: "normal", label: `AI Normal (${riskCounts.normal})` },
                { key: "review", label: `AI Review (${riskCounts.review})` },
                { key: "likely_scam", label: `Likely Scam (${riskCounts.likely_scam})` },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setRiskFilter(item.key as typeof riskFilter)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    riskFilter === item.key
                      ? item.key === "likely_scam"
                        ? "bg-red-600 text-white"
                        : item.key === "review"
                          ? "bg-amber-500 text-white"
                          : "bg-[#163038] text-white"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">AI buckets only prioritize review. Final approve/reject decision remains with the admin.</p>
          </div>
        )}

        {/* PRODUCTS */}
        {!loading &&
          products.length > 0 && (
            <div className="mt-6 space-y-6">
              {filteredProducts.map(
                (product) => {
                  const productImages =
                    images[
                      product.id
                    ] || [];

                  const isProcessing =
                    processingId ===
                    product.id;

                  return (
                    <article
                      key={
                        product.id
                      }
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                    >
                      <div className="grid lg:grid-cols-[320px_1fr]">
                        {/* IMAGES */}
                        <div className="border-b border-gray-200 bg-[#eef3f1] p-5 lg:border-b-0 lg:border-r">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-[#163038]">
                              Product Images
                            </p>

                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">
                              {
                                productImages.length
                              }{" "}
                              image
                              {productImages.length !==
                              1
                                ? "s"
                                : ""}
                            </span>
                          </div>

                          {productImages.length >
                          0 ? (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                              {productImages.map(
                                (
                                  image,
                                  index
                                ) => (
                                  <button
                                    type="button"
                                    key={
                                      image.id
                                    }
                                    onClick={() =>
                                      setSelectedImage(
                                        image.image_url
                                      )
                                    }
                                    className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white"
                                  >
                                    <img
                                      src={
                                        image.image_url
                                      }
                                      alt={`${product.title} ${index + 1}`}
                                      className="h-36 w-full object-cover transition group-hover:scale-105"
                                    />

                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-center text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                                      Click to inspect
                                    </div>
                                  </button>
                                )
                              )}
                            </div>
                          ) : (
                            <div className="mt-4 flex h-44 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white">
                              <div className="text-center">
                                <div className="text-4xl">
                                  📷
                                </div>

                                <p className="mt-2 text-xs text-gray-500">
                                  No images uploaded
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-xs leading-5 text-yellow-700">
                            Verify that these
                            images represent
                            the actual product
                            before approval.
                          </div>
                        </div>

                        {/* DETAILS */}
                        <div className="p-6">
                          <div className="flex flex-col justify-between gap-5 md:flex-row">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-[#fff3d6] px-3 py-1 text-xs font-bold text-[#8a6500]">
                                  ⏳ PENDING REVIEW
                                </span>

                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                                  product.ai_review_bucket === "likely_scam"
                                    ? "bg-red-100 text-red-700"
                                    : product.ai_review_bucket === "review"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-green-100 text-green-700"
                                }`}>
                                  {product.ai_review_bucket === "likely_scam"
                                    ? `🚨 LIKELY SCAM · Safety ${Math.max(0, 100 - Number(product.ai_risk_score || 0))}/100`
                                    : product.ai_review_bucket === "review"
                                      ? `⚠ AI REVIEW · Safety ${Math.max(0, 100 - Number(product.ai_risk_score || 0))}/100`
                                      : `✓ AI NORMAL · Safety ${Math.max(0, 100 - Number(product.ai_risk_score || 0))}/100`}
                                </span>

                                <span className="rounded-full bg-[#e1f4ed] px-3 py-1 text-xs font-semibold text-[#187052]">
                                  {
                                    product.category
                                  }
                                </span>
                              </div>

                              <h2 className="mt-3 text-2xl font-bold text-[#163038]">
                                {
                                  product.title
                                }
                              </h2>

                              <p className="mt-1 text-sm text-gray-600">
                                {
                                  product.material
                                }
                              </p>

                              <p className="mt-3 text-xs text-gray-400">
                                Seller ID:{" "}
                                {
                                  product.seller_id
                                }
                              </p>
                            </div>

                            <div className="md:text-right">
                              <p className="text-xs text-gray-500">
                                Expected Price
                              </p>

                              <p className="text-2xl font-bold text-[#163038]">
                                ₹
                                {product.price.toLocaleString(
                                  "en-IN"
                                )}
                              </p>

                              {product.is_negotiable && (
                                <p className="mt-1 text-xs font-semibold text-[#187052]">
                                  Negotiable
                                </p>
                              )}
                            </div>
                          </div>

                          {Array.isArray(product.ai_risk_reasons) && product.ai_risk_reasons.length > 0 ? (
                            <div className={`mt-5 rounded-xl border p-4 ${
                              product.ai_review_bucket === "likely_scam"
                                ? "border-red-200 bg-red-50"
                                : "border-amber-200 bg-amber-50"
                            }`}>
                              <p className="text-sm font-bold text-[#163038]">AI Review Reasons</p>
                              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                                {product.ai_risk_reasons.map((reason, index) => (
                                  <li key={`${product.id}-risk-${index}`}>• {reason}</li>
                                ))}
                              </ul>
                            </div>
                          ) : product.ai_review_bucket === "normal" ? (
                            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
                              <p className="text-sm font-bold text-green-800">AI Safety Summary</p>
                              <p className="mt-1 text-sm text-green-700">No major price or classification anomaly was detected by the current risk checks.</p>
                              <p className="mt-1 text-xs text-green-700/80">Safety score is the inverse of risk score: Risk {Number(product.ai_risk_score || 0)}/100 → Safety {Math.max(0, 100 - Number(product.ai_risk_score || 0))}/100.</p>
                            </div>
                          ) : null}

                          {/* QUICK DETAILS */}
                          <div className="mt-6 grid gap-4 rounded-xl bg-[#f7faf9] p-4 sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-gray-500">
                                Quantity
                              </p>

                              <p className="mt-1 font-semibold text-[#163038]">
                                {
                                  product.quantity
                                }{" "}
                                {
                                  product.quantity_unit
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">
                                Condition
                              </p>

                              <p className="mt-1 font-semibold text-[#163038]">
                                {
                                  product.condition
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">
                                Submitted
                              </p>

                              <p className="mt-1 font-semibold text-[#163038]">
                                {new Date(
                                  product.created_at
                                ).toLocaleDateString(
                                  "en-IN"
                                )}
                              </p>
                            </div>
                          </div>

                          {/* SPECIFICATIONS */}
                          <div className="mt-6 rounded-xl border border-gray-200 p-4">
                            <h3 className="text-sm font-bold text-[#163038]">
                              Specifications
                            </h3>

                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                              {product.specifications ||
                                "No specifications provided."}
                            </p>
                          </div>

                          {/* DESCRIPTION */}
                          <div className="mt-4 rounded-xl border border-gray-200 p-4">
                            <h3 className="text-sm font-bold text-[#163038]">
                              Description
                            </h3>

                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                              {product.description ||
                                "No description provided."}
                            </p>
                          </div>

                          {/* CHECKLIST */}
                          <div className="mt-5 rounded-xl border border-[#cfe8dd] bg-[#eef9f4] p-4">
                            <p className="text-sm font-bold text-[#163038]">
                              🛡️ Verification
                              Checklist
                            </p>

                            <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                              <p>
                                ✓ Product
                                details
                                complete
                              </p>

                              <p>
                                ✓ Category
                                and material
                                reviewed
                              </p>

                              <p>
                                ✓ Quantity
                                and price
                                reviewed
                              </p>

                              <p>
                                ✓ Images
                                represent
                                actual
                                product
                              </p>

                              <p>
                                ✓ No
                                misleading
                                content
                              </p>

                              <p>
                                ✓ Suitable
                                for
                                marketplace
                              </p>
                            </div>
                          </div>

                          {/* ACTIONS */}
                          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <button
                              type="button"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                updateProductStatus(
                                  product.id,
                                  "approved"
                                )
                              }
                              className="flex-1 rounded-xl bg-[#187052] py-3 font-semibold text-white hover:bg-[#125c43] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isProcessing
                                ? "Processing..."
                                : "✓ Approve Product"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                updateProductStatus(
                                  product.id,
                                  "rejected"
                                )
                              }
                              className="flex-1 rounded-xl border border-red-300 bg-white py-3 font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isProcessing
                                ? "Processing..."
                                : "✕ Reject Product"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HANDOVER CALL AUDITS & MODERATION */}
      {/* ========================================================================= */}
      {activeTab === "calls" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-3xl border border-sky-500/20 bg-[#061822] p-6 shadow-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <PhoneCall className="h-5 w-5 text-sky-400" />
                  Recorded Handover Voice Calls
                </h2>
                <p className="mt-1 text-xs text-white/60">
                  Listen to in-app buyer/seller audio streams. Enforce 2-strike off-platform diversion policies.
                </p>
              </div>

              <div className="flex gap-2">
                <span className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-300">
                  Total Calls: {callLogs.length}
                </span>
              </div>
            </div>
          </div>

          {callsLoading && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 text-sky-400 animate-spin" />
              <p className="mt-3 text-sm font-bold text-white/80">Loading recorded call logs...</p>
            </div>
          )}

          {!callsLoading && callLogs.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center shadow-sm">
              <div className="text-5xl">🎙️</div>
              <h3 className="mt-4 text-lg font-bold text-white">No Handover Calls Recorded Yet</h3>
              <p className="mt-1 text-xs text-white/60">
                When buyers and sellers use the secure in-app voice call in Deal Rooms, recordings will appear here for safety audit.
              </p>
            </div>
          )}

          {!callsLoading && callLogs.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              {callLogs.map((log) => {
                const durationMins = Math.floor((log.duration_seconds || 0) / 60);
                const durationSecs = (log.duration_seconds || 0) % 60;
                const formattedDuration = `${String(durationMins).padStart(2, "0")}:${String(durationSecs).padStart(2, "0")}`;

                return (
                  <div
                    key={log.id}
                    className="rounded-3xl border border-white/10 bg-[#07131b] p-6 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      {/* Deal & Call Header */}
                      <div className="flex items-start justify-between border-b border-white/10 pb-4">
                        <div>
                          <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-sky-300">
                            Deal #{log.deal?.deal_code || log.deal_id.slice(0, 8)}
                          </span>
                          <h4 className="mt-2 text-base font-bold text-white">
                            {log.deal?.product?.title || "Material Lot Handover"}
                          </h4>
                          <span className="text-[11px] text-white/50">
                            {new Date(log.created_at).toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black text-emerald-400">
                            ⏱️ {formattedDuration}
                          </span>
                          <p className="mt-1 text-[10px] uppercase font-bold text-white/40">
                            Status: {log.status}
                          </p>
                        </div>
                      </div>

                      {/* Audio Player */}
                      <div className="mt-4 rounded-2xl border border-sky-500/20 bg-[#030d13] p-4">
                        <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                          <Volume2 className="h-3.5 w-3.5" /> Call Audio Recording
                        </span>

                        {log.recording_url ? (
                          <audio
                            controls
                            src={log.recording_url}
                            className="mt-3 w-full rounded-xl bg-sky-950/40"
                          />
                        ) : (
                          <p className="mt-2 text-xs italic text-white/40">
                            Audio recording processing or unavailable.
                          </p>
                        )}
                      </div>

                      {/* Participants & 2-Strike Enforcement */}
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        {/* Caller */}
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <span className="text-[10px] font-bold uppercase text-white/40">Caller</span>
                          <p className="mt-0.5 font-bold text-white truncate">
                            {log.caller?.full_name || "Buyer/Seller"}
                          </p>

                          <div className="mt-2 flex items-center gap-1.5">
                            {log.caller?.is_banned ? (
                              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-black text-red-300">
                                🚫 BANNED
                              </span>
                            ) : (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                (log.caller?.warning_count || 0) > 0
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-emerald-500/20 text-emerald-300"
                              }`}>
                                Strike {(log.caller?.warning_count || 0)}/2
                              </span>
                            )}
                          </div>

                          {!log.caller?.is_banned && (
                            <div className="mt-3 flex flex-col gap-1.5">
                              <button
                                type="button"
                                disabled={callActionLoading === log.caller_id}
                                onClick={() =>
                                  handleIssueStrike(
                                    log.caller_id,
                                    log.caller?.full_name || "Caller",
                                    "warning"
                                  )
                                }
                                className="w-full rounded-lg border border-amber-500/40 bg-amber-500/15 py-1.5 text-[10px] font-black text-amber-300 hover:bg-amber-500/25 transition"
                              >
                                ⚠️ Issue Strike Warning
                              </button>

                              <button
                                type="button"
                                disabled={callActionLoading === log.caller_id}
                                onClick={() =>
                                  handleIssueStrike(
                                    log.caller_id,
                                    log.caller?.full_name || "Caller",
                                    "ban"
                                  )
                                }
                                className="w-full rounded-lg border border-red-500/40 bg-red-500/15 py-1.5 text-[10px] font-black text-red-300 hover:bg-red-500/25 transition"
                              >
                                🚫 Ban Account
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Receiver */}
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <span className="text-[10px] font-bold uppercase text-white/40">Receiver</span>
                          <p className="mt-0.5 font-bold text-white truncate">
                            {log.receiver?.full_name || "Buyer/Seller"}
                          </p>

                          <div className="mt-2 flex items-center gap-1.5">
                            {log.receiver?.is_banned ? (
                              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-black text-red-300">
                                🚫 BANNED
                              </span>
                            ) : (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                (log.receiver?.warning_count || 0) > 0
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-emerald-500/20 text-emerald-300"
                              }`}>
                                Strike {(log.receiver?.warning_count || 0)}/2
                              </span>
                            )}
                          </div>

                          {!log.receiver?.is_banned && (
                            <div className="mt-3 flex flex-col gap-1.5">
                              <button
                                type="button"
                                disabled={callActionLoading === log.receiver_id}
                                onClick={() =>
                                  handleIssueStrike(
                                    log.receiver_id,
                                    log.receiver?.full_name || "Receiver",
                                    "warning"
                                  )
                                }
                                className="w-full rounded-lg border border-amber-500/40 bg-amber-500/15 py-1.5 text-[10px] font-black text-amber-300 hover:bg-amber-500/25 transition"
                              >
                                ⚠️ Issue Strike Warning
                              </button>

                              <button
                                type="button"
                                disabled={callActionLoading === log.receiver_id}
                                onClick={() =>
                                  handleIssueStrike(
                                    log.receiver_id,
                                    log.receiver?.full_name || "Receiver",
                                    "ban"
                                  )
                                }
                                className="w-full rounded-lg border border-red-500/40 bg-red-500/15 py-1.5 text-[10px] font-black text-red-300 hover:bg-red-500/25 transition"
                              >
                                🚫 Ban Account
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </section>

      {/* IMAGE PREVIEW MODAL */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5"
          onClick={() =>
            setSelectedImage(null)
          }
        >
          <div
            className="relative max-h-[90vh] max-w-5xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <img
              src={selectedImage}
              alt="Product verification"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain"
            />

            <button
              type="button"
              onClick={() =>
                setSelectedImage(
                  null
                )
              }
              className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold text-gray-800 shadow-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <Footer />
      <MobileBottomNav />
    </main>
  );
}