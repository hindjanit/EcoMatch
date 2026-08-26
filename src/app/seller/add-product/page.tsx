"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { MARKETPLACE_CATEGORIES, PRODUCT_CONDITIONS } from "@/lib/catalog";
import { calculateProductRisk } from "@/lib/productRisk";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";

const categories = MARKETPLACE_CATEGORIES;
const conditions = PRODUCT_CONDITIONS;

type VisionAnalysis = {
  productName: string;
  category: string;
  productType: string;
  brand: string;
  condition: string;
  conditionConfidence: number;
  classificationConfidence: number;
  visibleIssues: string[];
  suggestedTitle: string;
  suggestedDescription: string;
  suggestedSpecifications: string[];
  reusePotential: "High" | "Medium" | "Low" | string;
  notes: string;
};

type PriceAnalysis = {
  referencePrice: number;
  marketLow: number;
  marketHigh: number;
  marketPriceFound: boolean;
  productMatched: string;
  matchQuality: string;
  fairMin: number;
  fairMax: number;
  sellerPrice: number;
  verdict: string;
  confidence: number;
  ageFactor: number;
  conditionFactor: number;
  reason: string;
  researchSummary: string;
  sources: { title: string; url: string }[];
};

export default function AddProductPage() {
  const supabase = createClient();
  const router = useRouter();

  // -----------------------------
  // PRODUCT DETAILS
  // -----------------------------

  const [listingMode, setListingMode] = useState<"individual" | "b2b">(
    "individual",
  );
  const [allowLotSplit, setAllowLotSplit] = useState(true);
  const [isEsgEligible, setIsEsgEligible] = useState(true);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [material, setMaterial] = useState("");
  const [description, setDescription] = useState("");
  const [specifications, setSpecifications] = useState("");

  const [quantity, setQuantity] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("piece");

  const [price, setPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [monthsUsed, setMonthsUsed] = useState("");
  const [isNegotiable, setIsNegotiable] = useState(false);

  const [condition, setCondition] = useState("");

  // -----------------------------
  // AI CLASSIFICATION
  // -----------------------------

  const [classification, setClassification] = useState<{
    category: string;
    material: string;
    confidence: number;
  } | null>(null);

  // -----------------------------
  // REAL AI IMAGE ANALYSIS
  // -----------------------------

  const [visionAnalysis, setVisionAnalysis] = useState<VisionAnalysis | null>(
    null,
  );
  const [visionLoading, setVisionLoading] = useState(false);

  const [priceAnalysis, setPriceAnalysis] = useState<PriceAnalysis | null>(
    null,
  );
  const [priceLoading, setPriceLoading] = useState(false);

  // -----------------------------
  // LOCATION
  // -----------------------------

  const [locationName, setLocationName] = useState("");

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMode, setLocationMode] = useState<"live" | "manual">("live");
  const [aiApplied, setAiApplied] = useState(false);
  const [toast, setToast] = useState("");
  const productDetailsRef = useRef<HTMLDivElement | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<
    { id: string; label: string; latitude: number; longitude: number }[]
  >([]);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState("");
  const [locationSelected, setLocationSelected] = useState(false);

  // -----------------------------
  // IMAGES
  // -----------------------------

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // -----------------------------
  // PAGE STATE
  // -----------------------------

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =====================================================
  // AUTO-PREFILL FROM HOMEPAGE CLASSIFIER
  // =====================================================

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("ecomatch_prefill_product");
      if (stored) {
        const item = JSON.parse(stored);
        if (item.title) setTitle(item.title);
        if (item.category) setCategory(item.category);
        if (item.material) setMaterial(item.material);
        if (item.condition) setCondition(item.condition);
        if (item.description) setDescription(item.description);
        if (item.specifications) setSpecifications(item.specifications);
        if (item.quantity) setQuantity(String(item.quantity));
        if (item.quantityUnit) setQuantityUnit(item.quantityUnit);
        if (item.imagePreview) setPreviews([item.imagePreview]);
        setAiApplied(true);
        setMessage(
          "✓ Auto-populated product details from AI Vision analysis! Review and submit.",
        );
        sessionStorage.removeItem("ecomatch_prefill_product");
      }
    } catch (e) {
      console.error("Prefill error:", e);
    }
  }, []);

  // =====================================================
  // FREE LOCATION AUTOCOMPLETE (PHOTON / OPENSTREETMAP)
  // =====================================================

  useEffect(() => {
    if (locationMode !== "manual") {
      setLocationSuggestions([]);
      setLocationSearchError("");
      return;
    }

    const query = locationName.trim();

    if (locationSelected || query.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLocationSearchLoading(true);
      setLocationSearchError("");

      try {
        const response = await fetch(
          `/api/location/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error || "Location suggestions could not be loaded.",
          );
        }

        setLocationSuggestions(
          Array.isArray(payload?.suggestions) ? payload.suggestions : [],
        );
      } catch (searchError) {
        if ((searchError as Error)?.name !== "AbortError") {
          console.error("Location autocomplete error:", searchError);
          setLocationSearchError(
            searchError instanceof Error
              ? searchError.message
              : "Location suggestions could not be loaded.",
          );
        }
      } finally {
        setLocationSearchLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [locationMode, locationName, locationSelected]);

  function selectLocationSuggestion(suggestion: {
    label: string;
    latitude: number;
    longitude: number;
  }) {
    setLocationName(suggestion.label);
    setLatitude(suggestion.latitude);
    setLongitude(suggestion.longitude);
    setLocationSelected(true);
    setLocationSuggestions([]);
    setLocationSearchError("");
    setToast("✓ Location selected successfully");
    window.setTimeout(() => setToast(""), 2200);
  }

  // =====================================================
  // ULTRA-FAST CLIENT-SIDE IMAGE OPTIMIZATION FOR AI VISION
  // =====================================================

  async function resizeImageForVision(file: File): Promise<Blob> {
    try {
      if (typeof createImageBitmap === "function") {
        const bitmap = await createImageBitmap(file);
        const maxDim = 768;
        let width = bitmap.width;
        let height = bitmap.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close?.();
          return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.78);
          });
        }
      }
    } catch {
      // Fallback to standard reader
    }

    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 768;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              canvas.toBlob(
                (blob) => {
                  resolve(blob || file);
                },
                "image/jpeg",
                0.78,
              );
            } else {
              resolve(file);
            }
          };
          img.onerror = () => resolve(file);
          img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
      } catch {
        resolve(file);
      }
    });
  }

  // =====================================================
  // REAL AI IMAGE ANALYSIS
  // =====================================================

  async function analyzeProductImage() {
    if (selectedImages.length === 0) {
      setError(
        "Please upload at least one clear product image before using AI Vision.",
      );
      return;
    }

    setError("");
    setMessage("");
    setVisionLoading(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);

    try {
      const optimizedBlob = await resizeImageForVision(selectedImages[0]);
      const imageToSend = new File(
        [optimizedBlob],
        selectedImages[0].name || "product.jpg",
        {
          type: "image/jpeg",
        },
      );

      const formData = new FormData();
      formData.append("image", imageToSend);
      formData.append(
        "sellerText",
        [title, material, description, specifications]
          .filter(Boolean)
          .join("\n"),
      );

      const response = await fetch("/api/ai/analyze-product", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "AI image analysis failed.");
      }

      const analysis = payload.analysis as VisionAnalysis;

      setVisionAnalysis(analysis);

      // Automatically populate form inputs directly with AI Vision findings
      if (analysis.suggestedTitle || analysis.productName) {
        setTitle(analysis.suggestedTitle || analysis.productName);
      }
      setCategory(analysis.category);
      setCondition(analysis.condition);

      if (analysis.productType) {
        setMaterial(analysis.productType);
      }

      if (analysis.suggestedDescription) {
        setDescription(analysis.suggestedDescription);
      }

      if (analysis.suggestedSpecifications?.length) {
        setSpecifications(analysis.suggestedSpecifications.join("\n"));
      }

      setClassification({
        category: analysis.category,
        material: analysis.productType || analysis.productName,
        confidence: analysis.classificationConfidence,
      });

      setAiApplied(true);
      setMessage(
        "✨ AI Vision analysis completed and populated into form. Review details and enter your asking price.",
      );
      showToast("AI details populated into form");
    } catch (visionError) {
      console.error("Vision analysis error:", visionError);
      setError(
        visionError instanceof Error
          ? visionError.message
          : "Could not analyze the product image.",
      );
    } finally {
      setVisionLoading(false);
    }
  }

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 2600);
  }

  function applyVisionSuggestions() {
    if (!visionAnalysis) return;

    if (visionAnalysis.suggestedTitle) {
      setTitle(visionAnalysis.suggestedTitle);
    }

    if (visionAnalysis.productType) {
      setMaterial(visionAnalysis.productType);
    }

    if (visionAnalysis.suggestedDescription) {
      setDescription(visionAnalysis.suggestedDescription);
    }

    if (visionAnalysis.suggestedSpecifications?.length) {
      setSpecifications(visionAnalysis.suggestedSpecifications.join("\n"));
    }

    setCategory(visionAnalysis.category);
    setCondition(visionAnalysis.condition);

    setClassification({
      category: visionAnalysis.category,
      material: visionAnalysis.productType || visionAnalysis.productName,
      confidence: visionAnalysis.classificationConfidence,
    });

    setAiApplied(true);
    setMessage(
      "✓ AI suggestions applied. Please review and edit anything that is not accurate.",
    );
    showToast("AI data entered successfully");
    window.setTimeout(() => {
      productDetailsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);
  }

  // =====================================================
  // AI PRICE INTELLIGENCE
  // =====================================================

  async function analyzePrice() {
    if (!price || Number(price) <= 0) {
      setError("Please enter the seller asking price first.");
      return;
    }

    if (!visionAnalysis && !title.trim()) {
      setError(
        "Analyze the product image or enter product details before checking price intelligence.",
      );
      return;
    }

    setError("");
    setMessage("");
    setPriceLoading(true);

    try {
      const response = await fetch("/api/ai/price-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          productType: visionAnalysis?.productType || material,
          brand: visionAnalysis?.brand || "Unknown",
          condition,
          description,
          specifications,
          sellerPrice: Number(price),
          purchasePrice: Number(purchasePrice || 0),
          monthsUsed: Number(monthsUsed || 0),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload?.error || "Could not analyze the resale price.",
        );
      }

      setPriceAnalysis(payload.analysis as PriceAnalysis);
      setMessage(
        "💰 AI Price Intelligence completed. Review the fair resale range before submitting.",
      );
    } catch (priceError) {
      console.error("Price analysis error:", priceError);
      setError(
        priceError instanceof Error
          ? priceError.message
          : "Could not analyze the resale price.",
      );
    } finally {
      setPriceLoading(false);
    }
  }

  // =====================================================
  // LOCATION
  // =====================================================

  async function handleUseLocation() {
    setError("");
    setMessage("");

    if (!navigator.geolocation) {
      setError("Your browser does not support location services.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError || !user) {
            setError("Please login again before saving your location.");

            setLocationLoading(false);
            return;
          }

          const { error: locationError } = await supabase
            .from("profiles")
            .update({
              latitude: lat,
              longitude: lng,
              location_name: locationName.trim() || "Current Location",
            })
            .eq("id", user.id);

          if (locationError) {
            console.error("Location save error:", locationError);

            setError(`Location could not be saved: ${locationError.message}`);

            setLocationLoading(false);
            return;
          }

          setLatitude(lat);
          setLongitude(lng);

          setMessage("📍 Seller location saved successfully.");
        } catch (locationError) {
          console.error(locationError);

          setError("Something went wrong while saving your location.");
        } finally {
          setLocationLoading(false);
        }
      },

      (geoError) => {
        console.error("Geolocation error:", geoError);

        if (geoError.code === 1) {
          setError(
            "Location permission was denied. Please allow location access in your browser.",
          );
        } else if (geoError.code === 2) {
          setError("Your current location could not be determined.");
        } else {
          setError("Location request timed out. Please try again.");
        }

        setLocationLoading(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }

  // =====================================================
  // IMAGE SELECTION
  // =====================================================

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    const validFiles = files.filter((file) => {
      const validType = file.type.startsWith("image/");

      const validSize = file.size <= 5 * 1024 * 1024;

      return validType && validSize;
    });

    if (validFiles.length !== files.length) {
      setError("Only image files up to 5MB each are allowed.");
      return;
    }

    const combinedFiles = [...selectedImages, ...validFiles].slice(0, 5);

    setSelectedImages(combinedFiles);

    const newPreviews = combinedFiles.map((file) => URL.createObjectURL(file));

    setPreviews(newPreviews);
    setVisionAnalysis(null);
    setPriceAnalysis(null);

    setError("");
  }

  function removeImage(index: number) {
    const newImages = selectedImages.filter(
      (_, imageIndex) => imageIndex !== index,
    );

    setSelectedImages(newImages);

    const newPreviews = newImages.map((file) => URL.createObjectURL(file));

    setPreviews(newPreviews);
    setVisionAnalysis(null);
    setPriceAnalysis(null);
  }

  // =====================================================
  // SUBMIT PRODUCT
  // =====================================================

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    // -----------------------------
    // VALIDATION
    // -----------------------------

    if (!title.trim()) {
      setError("Please enter a product title.");
      return;
    }

    if (!category) {
      setError("Please select a category.");
      return;
    }

    if (!material.trim()) {
      setError("Please enter the material.");
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setError("Please enter a valid quantity.");
      return;
    }

    if (!price || Number(price) < 0) {
      setError("Please enter a valid price.");
      return;
    }

    if (!condition) {
      setError("Please select the product condition.");
      return;
    }

    if (!classification) {
      setError("Please classify the product before submitting the listing.");
      return;
    }

    if (selectedImages.length === 0) {
      setError("Please upload at least one product image.");
      return;
    }

    if (locationMode === "live" && (latitude === null || longitude === null)) {
      setError(
        "Please use your current location or switch to manual location.",
      );
      return;
    }

    if (locationMode === "manual" && !locationName.trim()) {
      setError("Please enter your area or city for the manual location.");
      return;
    }

    setLoading(true);

    try {
      // -----------------------------
      // GET USER
      // -----------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      // -----------------------------
      // TRUST / IDENTITY LISTING GATE
      // Unverified sellers: <= ₹10,000, <= 30 active posts.
      // Verified sellers: <= 300 active posts.
      // The same rule is also enforced by a DB trigger.
      // -----------------------------
      const { data: sellerProfile, error: sellerProfileError } = await supabase
        .from("profiles")
        .select("verification_status")
        .eq("id", user.id)
        .maybeSingle();

      if (sellerProfileError) {
        throw new Error(
          `Could not check seller verification: ${sellerProfileError.message}`,
        );
      }

      const isIdentityVerified =
        sellerProfile?.verification_status === "verified";

      const { count: activeCount, error: activeCountError } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .in("status", ["pending", "approved"]);

      if (activeCountError) {
        throw new Error(
          activeCountError?.message || "Could not check listing limits.",
        );
      }

      if (!isIdentityVerified) {
        if (Number(price) > 10000) {
          setLoading(false);
          setError(
            "Identity Verification is required to list products above ₹10,000.",
          );
          window.setTimeout(() => router.push("/verify-identity"), 1200);
          return;
        }

        if ((activeCount || 0) >= 30) {
          setLoading(false);
          setError(
            "Unverified accounts can keep up to 30 active listings. Verify your identity to unlock up to 300 listings.",
          );
          return;
        }
      } else {
        if ((activeCount || 0) >= 300) {
          setLoading(false);
          setError(
            "Verified accounts can have up to 300 active listings. Please manage or remove older listings.",
          );
          return;
        }
      }

      // -----------------------------
      // UPDATE SELLER LOCATION
      // -----------------------------

      const { error: locationUpdateError } = await supabase
        .from("profiles")
        .update({
          latitude,
          longitude,
          location_name:
            locationName.trim() ||
            (locationMode === "live" ? "Current Location" : "Manual Location"),
        })
        .eq("id", user.id);

      if (locationUpdateError) {
        throw new Error(
          `Location could not be saved: ${locationUpdateError.message}`,
        );
      }

      // -----------------------------
      // CREATE PRODUCT
      // -----------------------------

      const risk = calculateProductRisk({
        askingPrice: Number(price),
        referencePrice: priceAnalysis?.referencePrice,
        fairMin: priceAnalysis?.fairMin,
        fairMax: priceAnalysis?.fairMax,
        priceConfidence: priceAnalysis?.confidence,
        visionConfidence:
          visionAnalysis?.classificationConfidence ??
          classification?.confidence,
        visibleIssues: visionAnalysis?.visibleIssues,
      });

      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          seller_id: user.id,

          title: title.trim(),

          category,

          material: material.trim(),

          description: description.trim() || null,

          specifications: specifications.trim() || null,

          quantity: Number(quantity),

          quantity_unit: quantityUnit,

          price: Number(price),
          purchase_price: purchasePrice ? Number(purchasePrice) : null,
          months_used: monthsUsed ? Number(monthsUsed) : null,

          is_negotiable: isNegotiable,

          condition,

          ai_reference_price: priceAnalysis?.referencePrice ?? null,
          ai_fair_price_min: priceAnalysis?.fairMin ?? null,
          ai_fair_price_max: priceAnalysis?.fairMax ?? null,
          ai_price_verdict: priceAnalysis?.verdict ?? null,
          ai_price_confidence: priceAnalysis?.confidence ?? null,
          ai_price_reason: priceAnalysis?.reason ?? null,
          ai_price_sources: priceAnalysis?.sources ?? null,
          ai_price_checked_at: priceAnalysis ? new Date().toISOString() : null,

          ai_review_bucket: risk.bucket,
          ai_risk_score: risk.score,
          ai_risk_reasons: risk.reasons,

          status: "pending",
        })
        .select()
        .single();

      if (productError || !product) {
        throw new Error(productError?.message || "Could not create product.");
      }

      // -----------------------------
      // UPLOAD PRODUCT IMAGES
      // -----------------------------

      for (let index = 0; index < selectedImages.length; index++) {
        const file = selectedImages[index];

        const fileExtension =
          file.name.split(".").pop()?.toLowerCase() || "jpg";

        const filePath = `${user.id}/${product.id}/${Date.now()}-${index}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("product-images").getPublicUrl(filePath);

        const { error: imageInsertError } = await supabase
          .from("product_images")
          .insert({
            product_id: product.id,

            image_url: publicUrl,

            verification_status: "pending",
          });

        if (imageInsertError) {
          throw new Error(`Image record failed: ${imageInsertError.message}`);
        }
      }

      setMessage(
        "✅ Product submitted successfully! It is waiting for admin verification.",
      );

      setTimeout(() => {
        router.push("/seller/dashboard");
      }, 1200);
    } catch (submitError) {
      console.error(submitError);

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while creating the listing.",
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="eco-page min-h-screen text-[#163038] pb-24 relative overflow-hidden">
      <Navbar />

      <div className="eco-orb eco-orb-one" />
      <div className="eco-orb eco-orb-two" />

      {toast && (
        <div className="fixed right-5 top-20 z-[100] rounded-2xl border border-emerald-400/30 bg-[#061e16] px-5 py-3 font-bold text-emerald-300 shadow-2xl backdrop-blur-xl">
          ✓ {toast}
        </div>
      )}

      {/* FORM */}
      <section className="relative mx-auto max-w-5xl px-4 pt-28 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
            CIRCULAR SUPPLY INGESTION
          </span>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
            List Material for{" "}
            <span className="text-emerald-400">Verification</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-white/60">
            Upload a product photo, let EcoMatch Vision auto-classify specs,
            then review the listing before verification.
          </p>
        </div>

        {/* LISTING TYPE SELECTOR (B2B VS INDIVIDUAL) */}
        <div className="mb-6 rounded-2xl border border-emerald-500/25 bg-[#061812]/90 p-4 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Listing Mode / Supplier Type
              </h3>
              <p className="text-xs text-white/60">
                Choose your listing workflow for optimized classification and
                discovery
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-1">
              <button
                type="button"
                onClick={() => setListingMode("individual")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  listingMode === "individual"
                    ? "bg-white text-slate-950 shadow-md"
                    : "text-white/60 hover:text-white"
                }`}
              >
                👤 Individual (P2P Item)
              </button>
              <button
                type="button"
                onClick={() => {
                  setListingMode("b2b");
                  setQuantityUnit("kg");
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  listingMode === "b2b"
                    ? "bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                    : "text-emerald-400 hover:text-emerald-300"
                }`}
              >
                🏢 Enterprise / B2B Bulk Lot
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PRODUCT DETAILS */}

          <div
            ref={productDetailsRef}
            className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#163038]">
                Product Details
              </h2>
              {listingMode === "b2b" && (
                <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  Bulk Industrial Mode
                </span>
              )}
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {/* TITLE */}
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-[#163038]">
                  Product Title *
                </label>

                <input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setPriceAnalysis(null);
                  }}
                  placeholder="e.g. iPhone 15, Study Table, Aluminium Sheets"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                />
              </div>

              {/* CATEGORY */}
              <div>
                <label className="text-sm font-semibold text-[#163038]">
                  Category *
                </label>

                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPriceAnalysis(null);
                  }}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                >
                  <option value="">Select category</option>

                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              {/* MATERIAL */}
              <div>
                <label className="text-sm font-semibold text-[#163038]">
                  Primary Material / Product Type *
                </label>

                <input
                  value={material}
                  onChange={(e) => {
                    setMaterial(e.target.value);
                    setPriceAnalysis(null);
                  }}
                  placeholder="e.g. Smartphone, Wood, Aluminium, Furniture"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                />
              </div>

              {/* QUANTITY */}
              <div>
                <label className="text-sm font-semibold text-[#163038]">
                  Quantity *
                </label>

                <div className="mt-2 flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="100"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                  />

                  <select
                    value={quantityUnit}
                    onChange={(e) => setQuantityUnit(e.target.value)}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                  >
                    <option value="piece">piece</option>

                    <option value="kg">kg</option>

                    <option value="ton">ton</option>

                    <option value="litre">litre</option>

                    <option value="meter">meter</option>

                    <option value="box">box</option>

                    <option value="unit">unit</option>
                  </select>
                </div>
              </div>

              {/* PRICE */}
              <div>
                <label className="text-sm font-semibold text-[#163038]">
                  Expected Price (₹) *
                </label>

                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setPriceAnalysis(null);
                  }}
                  placeholder="5000"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                />

                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={isNegotiable}
                      onChange={(e) => setIsNegotiable(e.target.checked)}
                      className="h-4 w-4 accent-[#187052]"
                    />
                    Price is negotiable (Deal Room active)
                  </label>

                  <label className="flex items-center gap-2 text-sm text-emerald-800 font-semibold bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    <input
                      type="checkbox"
                      checked={allowLotSplit}
                      onChange={(e) => setAllowLotSplit(e.target.checked)}
                      className="h-4 w-4 accent-[#187052]"
                    />
                    ✂️ Allow Partial Lot Splitting (e.g. buyer can request 30kg
                    out of 100kg)
                  </label>

                  <label className="flex items-center gap-2 text-sm text-sky-800 font-semibold bg-sky-50 p-2 rounded-xl border border-sky-200">
                    <input
                      type="checkbox"
                      checked={isEsgEligible}
                      onChange={(e) => setIsEsgEligible(e.target.checked)}
                      className="h-4 w-4 accent-sky-600"
                    />
                    🌱 Issue Digital ESG / EPR Carbon Credit Certificate upon
                    sale
                  </label>
                </div>
              </div>

              {/* PURCHASE PRICE */}
              <div>
                <label className="text-sm font-semibold text-[#163038]">
                  Original Purchase Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => {
                    setPurchasePrice(e.target.value);
                    setPriceAnalysis(null);
                  }}
                  placeholder="Optional e.g. 18000"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Used as a fallback reference if an exact current online price
                  cannot be found.
                </p>
              </div>

              {/* PRODUCT AGE */}
              <div>
                <label className="text-sm font-semibold text-[#163038]">
                  Used For (Months)
                </label>
                <input
                  type="number"
                  min="0"
                  value={monthsUsed}
                  onChange={(e) => {
                    setMonthsUsed(e.target.value);
                    setPriceAnalysis(null);
                  }}
                  placeholder="e.g. 6"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                />
              </div>

              {/* CONDITION */}
              <div>
                <label className="text-sm font-semibold text-[#163038]">
                  Condition *
                </label>

                <select
                  value={condition}
                  onChange={(e) => {
                    setCondition(e.target.value);
                    setPriceAnalysis(null);
                  }}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                >
                  <option value="">Select condition</option>

                  {conditions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              {/* DESCRIPTION */}
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-[#163038]">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setPriceAnalysis(null);
                  }}
                  rows={5}
                  placeholder="Describe the material, usage, availability and other important details..."
                  className="mt-2 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                />
              </div>

              {/* SPECIFICATIONS */}
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-[#163038]">
                  Specifications
                </label>

                <textarea
                  value={specifications}
                  onChange={(e) => {
                    setSpecifications(e.target.value);
                    setPriceAnalysis(null);
                  }}
                  rows={4}
                  placeholder="Size, grade, dimensions, weight, model number, technical specifications..."
                  className="mt-2 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                />
              </div>
            </div>
          </div>

          {/* SELLER LOCATION */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-3xl">📍</div>

              <div>
                <h2 className="text-xl font-bold text-[#163038]">
                  Seller Location
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  This location is used to calculate the distance between buyers
                  and your listing.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setLocationMode("live")}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${locationMode === "live" ? "bg-[#187052] text-white" : "border border-gray-300 bg-white text-gray-700"}`}
              >
                📍 Live Location Recommended
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocationMode("manual");
                  setLatitude(null);
                  setLongitude(null);
                  setLocationSelected(false);
                  setLocationSuggestions([]);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${locationMode === "manual" ? "bg-[#163038] text-white" : "border border-gray-300 bg-white text-gray-700"}`}
              >
                ✍️ Enter Manually
              </button>
            </div>

            <div className="mt-5">
              <label className="text-sm font-semibold text-[#163038]">
                Area / City
              </label>

              {locationMode === "manual" ? (
                <>
                  <div className="relative mt-2">
                    <input
                      value={locationName}
                      onChange={(e) => {
                        setLocationName(e.target.value);
                        setLatitude(null);
                        setLongitude(null);
                        setLocationSelected(false);
                      }}
                      placeholder="e.g. Sector 46 Noida"
                      autoComplete="off"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[#163038] outline-none placeholder:text-gray-500 focus:border-[#187052]"
                    />

                    {locationSearchLoading && (
                      <span className="absolute right-4 top-3.5 text-xs font-semibold text-gray-400">
                        Searching...
                      </span>
                    )}

                    {locationSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                        {locationSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onClick={() => selectLocationSuggestion(suggestion)}
                            className="block w-full border-b border-gray-100 px-4 py-3 text-left text-sm text-[#163038] transition last:border-b-0 hover:bg-[#eef9f4]"
                          >
                            📍 {suggestion.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    Type a locality such as Sector 46 Noida and choose a
                    suggestion. No map is shown; coordinates are saved silently
                    for distance matching.
                  </p>

                  {locationSearchError && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      {locationSearchError}
                    </div>
                  )}
                </>
              ) : (
                <input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Optional label e.g. Noida, Uttar Pradesh"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-[#163038] outline-none placeholder:text-gray-500 focus:border-[#187052]"
                />
              )}
            </div>

            {locationMode === "live" && (
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={locationLoading}
                className="mt-4 rounded-xl bg-[#187052] px-5 py-3 font-semibold text-white hover:bg-[#125c43] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {locationLoading
                  ? "Getting Location..."
                  : latitude !== null && longitude !== null
                    ? "✓ Location Saved"
                    : "📍 Use My Current Location"}
              </button>
            )}

            {locationMode === "manual" && locationName.trim() && (
              <div
                className={`mt-4 rounded-xl border p-4 ${latitude !== null && longitude !== null ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}`}
              >
                <p
                  className={`text-sm font-semibold ${latitude !== null && longitude !== null ? "text-green-700" : "text-blue-700"}`}
                >
                  {latitude !== null && longitude !== null
                    ? "✓ Location selected"
                    : "Select one of the location suggestions"}
                </p>
                <p
                  className={`mt-1 text-xs ${latitude !== null && longitude !== null ? "text-green-600" : "text-blue-600"}`}
                >
                  {locationName}
                </p>
                {latitude === null || longitude === null ? (
                  <p className="mt-1 text-xs text-blue-600">
                    Choose a suggestion to enable accurate distance matching.
                  </p>
                ) : null}
              </div>
            )}

            {latitude !== null && longitude !== null && (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-semibold text-green-700">
                  ✓ Location ready for distance matching
                </p>

                <p className="mt-1 text-xs text-green-600">
                  {locationName.trim() || "Current Location"}
                </p>
              </div>
            )}
          </div>

          {/* PRODUCT IMAGES */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#163038]">Product Images</h2>

            <p className="mt-1 text-sm text-gray-600">
              Upload authentic photos of the actual product. Maximum 5 images,
              5MB each.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#187052] bg-[#eef9f4] px-6 py-8 text-center transition hover:bg-[#e4f5ed]">
                <div className="text-4xl">📷</div>
                <p className="mt-2 font-bold text-[#163038]">Take Photo</p>
                <p className="mt-1 text-xs text-gray-500">
                  Open the device camera and capture the actual product
                </p>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#b9dace] bg-white px-6 py-8 text-center transition hover:bg-[#f7faf9]">
                <div className="text-4xl">🖼️</div>
                <p className="mt-2 font-bold text-[#163038]">
                  Upload from Gallery
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG, JPEG — maximum 5 images, 5MB each
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>

            {previews.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-5">
                {previews.map((preview, index) => (
                  <div
                    key={preview}
                    className="relative overflow-hidden rounded-xl border border-gray-200"
                  >
                    <img
                      src={preview}
                      alt={`Product ${index + 1}`}
                      className="h-32 w-full object-cover"
                    />

                    {index === 0 && (
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                        AI primary image
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-[#b9dace] bg-[#f0faf6] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#187052]">
                    EcoMatch Vision AI
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-[#163038]">
                    Analyze the actual product photo
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                    AI inspects the first uploaded image to identify the
                    product, suggest its category, estimate visible condition
                    and prepare listing details.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={analyzeProductImage}
                  disabled={visionLoading || selectedImages.length === 0}
                  className="shrink-0 rounded-xl bg-[#163038] px-6 py-3 font-bold text-white transition hover:bg-[#0f242a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {visionLoading
                    ? "Analyzing Image..."
                    : "✦ Analyze with Vision AI"}
                </button>
              </div>

              {visionAnalysis && (
                <div className="mt-5 rounded-2xl border border-green-200 bg-white p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-[#187052]">
                        AI Product Understanding
                      </p>
                      <h4 className="mt-1 text-xl font-bold text-[#163038]">
                        {visionAnalysis.productName}
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        {visionAnalysis.brand !== "Unknown"
                          ? `Brand: ${visionAnalysis.brand}`
                          : "Brand not confidently visible"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                        {visionAnalysis.classificationConfidence}% Product
                        Confidence
                      </span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {visionAnalysis.conditionConfidence}% Condition
                        Confidence
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-[#f7faf9] p-4">
                      <p className="text-[10px] font-bold uppercase text-gray-500">
                        Category
                      </p>
                      <p className="mt-1 font-bold text-[#163038]">
                        {visionAnalysis.category}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#f7faf9] p-4">
                      <p className="text-[10px] font-bold uppercase text-gray-500">
                        Product Type
                      </p>
                      <p className="mt-1 font-bold text-[#163038]">
                        {visionAnalysis.productType}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#f7faf9] p-4">
                      <p className="text-[10px] font-bold uppercase text-gray-500">
                        Visual Condition
                      </p>
                      <p className="mt-1 font-bold text-[#163038]">
                        {visionAnalysis.condition}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#f7faf9] p-4">
                      <p className="text-[10px] font-bold uppercase text-gray-500">
                        Reuse Potential
                      </p>
                      <p className="mt-1 font-bold text-[#187052]">
                        {visionAnalysis.reusePotential}
                      </p>
                    </div>
                  </div>

                  {visionAnalysis.visibleIssues.length > 0 && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-bold uppercase text-amber-700">
                        Visible observations
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {visionAnalysis.visibleIssues.map((issue) => (
                          <span
                            key={issue}
                            className="rounded-full bg-white px-3 py-1 text-xs text-amber-800"
                          >
                            {issue}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 rounded-xl bg-[#f7faf9] p-4">
                    <p className="text-xs font-bold uppercase text-gray-500">
                      AI note
                    </p>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      {visionAnalysis.notes}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-gray-500">
                      AI condition is a visual estimate only. Seller must review
                      all generated details and admin verification remains
                      mandatory.
                    </p>
                    <button
                      type="button"
                      onClick={applyVisionSuggestions}
                      className="shrink-0 rounded-xl border border-[#187052] bg-white px-5 py-2.5 text-sm font-bold text-[#187052] hover:bg-[#eef9f4]"
                    >
                      {aiApplied ? "✓ AI Data Applied" : "Apply AI Suggestions"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI PRICE INTELLIGENCE */}
          <div className="rounded-2xl border border-[#d7c8ff] bg-[#faf8ff] p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6d4bc3]">
                  EcoMatch Price Intelligence
                </p>
                <h2 className="mt-1 text-xl font-bold text-[#163038]">
                  Is your asking price fair?
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                  AI can research a current Indian new-retail reference online
                  and combine it with product age and visual condition to
                  estimate a fair resale range.
                </p>
              </div>
              <button
                type="button"
                onClick={analyzePrice}
                disabled={priceLoading || !price}
                className="shrink-0 rounded-xl bg-[#6d4bc3] px-6 py-3 font-bold text-white hover:bg-[#593ba8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {priceLoading ? "Checking Market..." : "💰 Analyze Fair Price"}
              </button>
            </div>

            {priceAnalysis && (
              <div className="mt-5 rounded-2xl border border-purple-200 bg-white p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-500">
                      AI Verdict
                    </p>
                    <p
                      className={`mt-1 text-2xl font-bold ${
                        priceAnalysis.verdict === "Great Deal" ||
                        priceAnalysis.verdict === "Good Deal"
                          ? "text-green-700"
                          : priceAnalysis.verdict === "Fair Price"
                            ? "text-[#187052]"
                            : "text-amber-700"
                      }`}
                    >
                      {priceAnalysis.verdict}
                    </p>
                  </div>
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-[#6d4bc3]">
                    {priceAnalysis.confidence}% Price Confidence
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#f7faf9] p-4">
                    <p className="text-[10px] font-bold uppercase text-gray-500">
                      Reference New Price
                    </p>
                    <p className="mt-1 text-lg font-bold text-[#163038]">
                      ₹{priceAnalysis.referencePrice.toLocaleString("en-IN")}
                    </p>
                    <p className="mt-1 text-[10px] text-gray-500">
                      {priceAnalysis.marketPriceFound
                        ? "Researched online"
                        : "Fallback reference"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-green-50 p-4">
                    <p className="text-[10px] font-bold uppercase text-green-700">
                      Fair Resale Range
                    </p>
                    <p className="mt-1 text-lg font-bold text-green-800">
                      ₹{priceAnalysis.fairMin.toLocaleString("en-IN")} – ₹
                      {priceAnalysis.fairMax.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f7faf9] p-4">
                    <p className="text-[10px] font-bold uppercase text-gray-500">
                      Seller Asking
                    </p>
                    <p className="mt-1 text-lg font-bold text-[#163038]">
                      ₹{priceAnalysis.sellerPrice.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-gray-600">
                  {priceAnalysis.reason}
                </p>
                {priceAnalysis.researchSummary && (
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Market research: {priceAnalysis.researchSummary}
                  </p>
                )}

                {priceAnalysis.sources.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <p className="text-xs font-bold uppercase text-gray-500">
                      Online reference sources
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {priceAnalysis.sources.map((source) => (
                        <a
                          key={source.url}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-[#6d4bc3] hover:underline"
                        >
                          {source.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <p className="mt-4 text-[11px] leading-5 text-gray-500">
                  This is an AI-assisted resale estimate, not a guaranteed
                  market value. Exact model, hidden defects, local demand,
                  warranty and accessories can change the final price.
                </p>
              </div>
            )}
          </div>

          {/* VERIFICATION */}

          <div className="rounded-2xl border border-[#cfe8dd] bg-[#eef9f4] p-6">
            <h2 className="font-bold text-[#163038]">
              🛡️ EcoMatch Verification
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Your listing, AI analysis and uploaded images will be submitted
              for verification. AI assists the seller, while final marketplace
              approval remains a human verification step.
            </p>
          </div>

          {/* ERROR */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {message && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
              {message}
            </div>
          )}

          {/* SUBMIT */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/seller/dashboard")}
              className="rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || locationLoading}
              className="rounded-xl bg-[#187052] px-8 py-3 font-bold text-white shadow-sm hover:bg-[#125c43] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Submitting Listing..." : "Submit Listing"}
            </button>
          </div>
        </form>
      </section>

      <Footer />
      <MobileBottomNav />
    </main>
  );
}
