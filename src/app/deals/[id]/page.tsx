"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import ESGCertificateModal from "@/components/ESGCertificateModal";
import DealRoomCallWidget from "@/components/DealRoomCallWidget";
import {
  Handshake,
  CheckCircle2,
  Clock,
  MapPin,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  Calendar,
  AlertCircle,
  Copy,
  ChevronRight,
  User,
  Boxes,
  Camera,
  RefreshCw,
  Leaf,
  Download,
  TrendingDown,
  Sliders,
  Crosshair,
  Loader2,
  Search,
} from "lucide-react";

type Deal = {
  id: string;
  deal_code: string;
  product_id: number | string;
  buyer_id: string;
  seller_id: string;
  status: string;
  agreed_price?: number | null;
  meeting_location: string | null;
  meeting_at: string | null;
  meeting_latitude: number | null;
  meeting_longitude: number | null;
  meeting_proposed_by: string | null;
  buyer_meeting_confirmed: boolean;
  seller_meeting_confirmed: boolean;
  exchange_code_generated_at: string | null;
  exchange_code_expires_at?: string | null;
  exchange_code_verified_at: string | null;
  buyer_handover_confirmed_at: string | null;
  seller_handover_confirmed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
};

type Product = {
  id: number | string;
  title: string;
  category: string;
  material: string;
  price: number;
  condition: string;
  status: string;
  current_owner_id?: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  verification_status: string | null;
};

type LocationSuggestion = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

declare global {
  interface Window {
    QRCode?: new (
      element: HTMLElement,
      options: {
        text: string;
        width?: number;
        height?: number;
        colorDark?: string;
        colorLight?: string;
        correctLevel?: number;
      }
    ) => unknown;
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect(source: HTMLVideoElement | HTMLImageElement | ImageBitmap): Promise<{ rawValue?: string }[]>;
    };
  }
}

const timelineSteps = [
  { key: "requested", label: "Requested", desc: "Deal initiated" },
  { key: "accepted", label: "Accepted", desc: "Seller approved" },
  { key: "exchange_ready", label: "Meeting Set", desc: "Meeting confirmed" },
  { key: "completed", label: "Completed", desc: "Handover verified" },
];

const statusOrder: Record<string, number> = {
  requested: 0,
  accepted: 1,
  meeting_planned: 1,
  exchange_ready: 2,
  completed: 3,
};

export default function DealRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [deal, setDeal] = useState<Deal | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [buyer, setBuyer] = useState<Profile | null>(null);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [userId, setUserId] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingLat, setMeetingLat] = useState<number | null>(null);
  const [meetingLng, setMeetingLng] = useState<number | null>(null);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationSelected, setLocationSelected] = useState(false);

  // Free Autocomplete Recommendations from Photon/OpenStreetMap
  useEffect(() => {
    const q = meetingLocation.trim();
    if (locationSelected || q.length < 3 || deal?.status === "exchange_ready") {
      setLocationSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLocationSearching(true);
      try {
        const res = await fetch(`/api/location/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (data?.suggestions) {
          setLocationSuggestions(data.suggestions as LocationSuggestion[]);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.warn("Location search error:", err);
        }
      } finally {
        setLocationSearching(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [meetingLocation, locationSelected, deal?.status]);

  function selectLocationSuggestion(sug: LocationSuggestion) {
    setMeetingLocation(sug.label);
    setMeetingLat(sug.latitude);
    setMeetingLng(sug.longitude);
    setLocationSelected(true);
    setLocationSuggestions([]);
  }

  async function handleUseCurrentLocation() {
    setError("");
    setMessage("");
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Your browser does not support GPS location services.");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMeetingLat(lat);
        setMeetingLng(lng);

        // Reverse geocode to get human-readable city/address
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { "User-Agent": "EcoMatch-App/1.0" } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            setMeetingLocation(addr);
          } else {
            setMeetingLocation(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
        } catch {
          setMeetingLocation(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }

        setLocationSelected(true);
        setLocationSuggestions([]);
        setLocationLoading(false);
        setMessage("📍 Current GPS coordinates detected and set!");
      },
      (geoErr) => {
        setLocationLoading(false);
        if (geoErr.code === 1) {
          setError("Location permission denied. Please allow location access in your browser.");
        } else {
          setError("Could not determine current location. Please type manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const [generatedCode, setGeneratedCode] = useState("");
  const [buyerCode, setBuyerCode] = useState("");
  const [qrLibReady, setQrLibReady] = useState(false);
  const [showEsgModal, setShowEsgModal] = useState(false);
  const [showPriceSlider, setShowPriceSlider] = useState(false);
  const [counterPrice, setCounterPrice] = useState<number>(0);
  const qrRef = useRef<HTMLDivElement | null>(null);
  const autoCodeAttempted = useRef(false);
  const confettiFired = useRef(false);

  useEffect(() => {
    if (params.id) loadDealRoom();
  }, [params.id]);

  useEffect(() => {
    if (!deal) return;
    setMeetingLocation(deal.meeting_location || "");
    setMeetingLat(deal.meeting_latitude);
    setMeetingLng(deal.meeting_longitude);
    if (!counterPrice) {
      setCounterPrice(Number(deal.agreed_price || product?.price || 0));
    }

    if (deal.meeting_at) {
      const d = new Date(deal.meeting_at);
      if (!Number.isNaN(d.getTime())) {
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
        setMeetingDate(local.slice(0, 10));
        setMeetingTime(local.slice(11, 16));
      }
    }

    if (deal.status === "completed" && !confettiFired.current) {
      confettiFired.current = true;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#a7f3d0", "#ffffff"],
      });
    }
  }, [deal?.id, deal?.meeting_at, deal?.meeting_location, deal?.status]);

  // Polling sync
  useEffect(() => {
    if (!deal || ["completed", "rejected", "cancelled"].includes(deal.status)) return;
    const timer = window.setInterval(() => loadDealRoom(true), 4000);
    return () => window.clearInterval(timer);
  }, [deal?.id, deal?.status]);

  // Auto-generate code for seller on exchange_ready
  useEffect(() => {
    if (!deal || !userId) return;
    const isSellerNow = deal.seller_id === userId;
    if (
      isSellerNow &&
      deal.status === "exchange_ready" &&
      !deal.exchange_code_verified_at &&
      !deal.exchange_code_generated_at &&
      !generatedCode &&
      !autoCodeAttempted.current
    ) {
      autoCodeAttempted.current = true;
      generateExchangeCode(true);
    }
  }, [deal?.status, deal?.exchange_code_generated_at, deal?.exchange_code_verified_at, userId]);

  // Render QR code
  useEffect(() => {
    if (!generatedCode || !deal || !qrLibReady || !qrRef.current || !window.QRCode) return;
    qrRef.current.innerHTML = "";
    const payload = JSON.stringify({
      type: "ECOMATCH_EXCHANGE",
      dealId: deal.id,
      code: generatedCode,
    });
    new window.QRCode(qrRef.current, {
      text: payload,
      width: 180,
      height: 180,
      colorDark: "#03140e",
      colorLight: "#f0fdf4",
    });
  }, [generatedCode, deal?.id, qrLibReady]);

  async function loadDealRoom(quiet = false) {
    if (!quiet) setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);

    const { data: dealData, error: dealError } = await supabase
      .from("deal_requests")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (dealError || !dealData) {
      setError(dealError?.message || "This secure deal could not be found.");
      if (!quiet) setLoading(false);
      return;
    }

    const current = dealData as Deal;
    setDeal(current);

    const [productResult, imageResult, profilesResult] = await Promise.all([
      supabase
        .from("products")
        .select("id,title,category,material,price,condition,status,current_owner_id")
        .eq("id", current.product_id)
        .maybeSingle(),
      supabase.from("product_images").select("image_url").eq("product_id", current.product_id).limit(1),
      supabase
        .from("profiles")
        .select("id,full_name,verification_status")
        .in("id", [current.buyer_id, current.seller_id]),
    ]);

    setProduct((productResult.data || null) as Product | null);
    setImage((imageResult.data || [])[0]?.image_url || null);

    const profiles = (profilesResult.data || []) as Profile[];
    setBuyer(profiles.find((p) => p.id === current.buyer_id) || null);
    setSeller(profiles.find((p) => p.id === current.seller_id) || null);

    // If OTP was already verified but status was not yet marked completed, auto-finalize!
    if (current.exchange_code_verified_at && current.status !== "completed") {
      confirmHandover();
    }

    if (!quiet) setLoading(false);
  }

  async function updateStatus(status: string) {
    if (!deal) return;
    setActionLoading(true);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("deal_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", deal.id);

    if (updateError) setError(updateError.message);
    else {
      setMessage(`Deal status updated to ${status.replaceAll("_", " ")}.`);
      await loadDealRoom(true);
    }
    setActionLoading(false);
  }

  async function handleUpdateAgreedPrice() {
    if (!deal || counterPrice <= 0) return;
    setActionLoading(true);
    setError("");
    setMessage("");

    const { error: priceError } = await supabase
      .from("deal_requests")
      .update({ agreed_price: counterPrice, updated_at: new Date().toISOString() })
      .eq("id", deal.id);

    if (priceError) {
      setError(`Could not update deal price: ${priceError.message}`);
    } else {
      setMessage(`✓ Deal value updated to ₹${counterPrice.toLocaleString("en-IN")}!`);
      setDeal((prev) => (prev ? { ...prev, agreed_price: counterPrice } : prev));
      setShowPriceSlider(false);
    }
    setActionLoading(false);
  }

  async function saveMeetingProposal() {
    if (!deal) return;
    const locText = meetingLocation.trim();
    if (!locText) {
      setError("Please enter a meeting location or detect your GPS location.");
      return;
    }
    if (!meetingDate || !meetingTime) {
      setError("Please choose both date and time for the handover.");
      return;
    }

    const at = new Date(`${meetingDate}T${meetingTime}`);
    if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) {
      setError("Please select a future meeting time.");
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    let finalLat = meetingLat;
    let finalLng = meetingLng;

    // If coordinates were not populated from dropdown or GPS, auto-resolve them
    if (finalLat === null || finalLng === null) {
      try {
        const res = await fetch(`/api/location/search?q=${encodeURIComponent(locText)}`);
        const data = await res.json();
        if (data?.suggestions && data.suggestions.length > 0) {
          finalLat = data.suggestions[0].latitude;
          finalLng = data.suggestions[0].longitude;
          setMeetingLat(finalLat);
          setMeetingLng(finalLng);
        }
      } catch (err) {
        console.warn("Auto coordinate resolve error:", err);
      }

      // Safe fallback if search API doesn't find exact match (e.g. private address)
      if (finalLat === null || finalLng === null) {
        finalLat = 28.6139;
        finalLng = 77.2090;
      }
    }

    const isBuyer = deal.buyer_id === userId;
    const { error: updateError } = await supabase
      .from("deal_requests")
      .update({
        meeting_location: locText,
        meeting_latitude: finalLat,
        meeting_longitude: finalLng,
        meeting_at: at.toISOString(),
        meeting_proposed_by: userId,
        buyer_meeting_confirmed: isBuyer,
        seller_meeting_confirmed: !isBuyer,
        status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deal.id);

    if (updateError) setError(updateError.message);
    else {
      setMessage("✓ Meeting proposal saved. Awaiting confirmation from counterparty.");
      await loadDealRoom(true);
    }
    setActionLoading(false);
  }

  async function confirmMeeting() {
    if (!deal) return;
    setActionLoading(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc("confirm_deal_meeting", {
      p_deal_id: deal.id,
    });

    if (rpcError) setError(rpcError.message);
    else {
      setMessage("✓ Meeting confirmed! OTP & QR code generated for safe handover.");
      await loadDealRoom(true);
    }
    setActionLoading(false);
  }

  async function generateExchangeCode(auto = false) {
    if (!deal) return;
    setActionLoading(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc("generate_deal_exchange_code", {
      p_deal_id: deal.id,
    });

    if (rpcError || !data) {
      const errText = rpcError?.message || "";
      if (errText.toLowerCase().includes("already verified") || deal.exchange_code_verified_at) {
        confirmHandover();
      } else {
        setError(errText || "Could not generate exchange code.");
      }
    } else {
      setGeneratedCode(String(data));
      setMessage("✓ 6-digit OTP and QR code ready for physical handover.");
      await loadDealRoom(true);
    }
    setActionLoading(false);
  }

  async function verifyExchangeCode() {
    if (!deal) return;
    const code = buyerCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("Please enter the 6-digit OTP provided by the seller.");
      return;
    }

    setActionLoading(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc("verify_deal_exchange_code", {
      p_deal_id: deal.id,
      p_code: code,
    });

    if (rpcError) setError(rpcError.message);
    else if (!data) setError("Invalid or expired OTP code.");
    else {
      setBuyerCode("");
      setMessage("🎉 OTP verified successfully! Material ownership permanently transferred and recorded in ledger.");
      confetti({
        particleCount: 150,
        spread: 85,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#a7f3d0", "#ffffff"],
      });
      await loadDealRoom(true);
    }
    setActionLoading(false);
  }

  async function confirmHandover() {
    if (!deal) return;
    setActionLoading(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc("confirm_deal_handover", {
      p_deal_id: deal.id,
    });

    if (rpcError) setError(rpcError.message);
    else if (data === "completed") {
      setMessage("🎉 Deal completed! Material ownership permanently recorded in ledger.");
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#a7f3d0", "#ffffff"],
      });
    } else {
      setMessage("Handover confirmed from your side. Waiting for counterparty.");
    }

    await loadDealRoom(true);
    setActionLoading(false);
  }

  if (loading) {
    return (
      <main className="eco-page min-h-screen text-white">
        <Navbar />
        <div className="mx-auto max-w-5xl px-6 pt-36 text-center">
          <div className="shimmer-box mx-auto h-10 w-48 rounded-xl" />
          <div className="mt-8 shimmer-box h-64 w-full rounded-3xl" />
        </div>
      </main>
    );
  }

  if (!deal) {
    return (
      <main className="eco-page min-h-screen text-white">
        <Navbar />
        <div className="mx-auto max-w-md px-6 pt-36 text-center">
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-4 text-xl font-bold">Deal Room Unavailable</h2>
            <p className="mt-2 text-xs text-white/60">{error || "Deal request not found."}</p>
            <Link
              href="/deals"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-[#03140e]"
            >
              <ArrowLeft className="h-4 w-4" /> My Deals
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isSeller = deal.seller_id === userId;
  const isBuyer = deal.buyer_id === userId;
  const currentStep = statusOrder[deal.status] ?? -1;
  const myMeetingConfirmed = isBuyer ? deal.buyer_meeting_confirmed : deal.seller_meeting_confirmed;
  const effectivePrice = Number(deal.agreed_price || product?.price || 0);

  return (
    <main className="eco-page min-h-screen text-white pb-24">
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
        strategy="afterInteractive"
        onLoad={() => setQrLibReady(true)}
      />
      <Navbar />

      <div className="eco-orb eco-orb-one" />
      <div className="eco-orb eco-orb-two" />

      <div className="relative mx-auto max-w-6xl px-4 pt-28 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Link href="/deals" className="hover:text-emerald-400">
            Deals
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-emerald-400">Deal Room</span>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate font-mono text-white/80">{deal.deal_code}</span>
        </div>

        {/* Hero Deal Card */}
        <div className="mt-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-[#072b1f] via-[#051e16] to-[#03130d] p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Handshake className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    SAFE DEAL ROOM
                  </span>
                  <span className="font-mono text-xs text-white/50">{deal.deal_code}</span>
                </div>
                <h1 className="mt-1.5 text-2xl font-black text-white sm:text-3xl">
                  {product?.title || "Circular Material Deal"}
                </h1>
                <p className="mt-1 text-xs text-white/60">
                  Role: <strong className="text-emerald-300">{isSeller ? "Seller (Offering Item)" : "Buyer (Receiving Item)"}</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start rounded-2xl border border-white/10 bg-black/40 p-4 md:items-end">
              <span className="text-[11px] uppercase tracking-wider text-white/50">Deal Value</span>
              <span className="text-3xl font-black text-emerald-400">
                ₹{effectivePrice.toLocaleString("en-IN")}
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                  {deal.status.replaceAll("_", " ")}
                </span>
                {["accepted", "meeting_planned", "exchange_ready"].includes(deal.status) && (
                  <DealRoomCallWidget
                    dealId={deal.id}
                    dealCode={deal.deal_code}
                    userId={userId}
                    counterpartyId={isBuyer ? deal.seller_id : deal.buyer_id}
                    counterpartyName={isBuyer ? (seller?.full_name || "Seller") : (buyer?.full_name || "Buyer")}
                    isBuyer={isBuyer}
                  />
                )}
                {["requested", "accepted"].includes(deal.status) && (
                  <button
                    onClick={() => {
                      setCounterPrice(effectivePrice);
                      setShowPriceSlider(true);
                    }}
                    className="flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-bold text-sky-300 hover:bg-sky-500/25 transition"
                  >
                    <Sliders className="h-3 w-3" /> Offer Slider
                  </button>
                )}
                <button
                  onClick={() => setShowEsgModal(true)}
                  className="flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/25"
                >
                  <Leaf className="h-3 w-3" /> ESG Passport
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Status Messages */}
        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-xs font-bold text-emerald-300 shadow-lg">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/15 p-4 text-xs font-bold text-red-300 shadow-lg">
            {error}
          </div>
        )}

        {/* Interactive Progress Stepper */}
        <div className="mt-8 rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-6 shadow-xl backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {timelineSteps.map((step, idx) => {
              const isPast = currentStep > idx;
              const isCurrent = currentStep === idx;
              return (
                <div
                  key={step.key}
                  className={`relative flex flex-col rounded-2xl border p-4 transition-all ${
                    isPast
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : isCurrent
                      ? "border-emerald-400 bg-emerald-500/20 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)] scale-[1.02]"
                      : "border-white/10 bg-white/5 text-white/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">0{idx + 1}</span>
                    {isPast ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : isCurrent ? (
                      <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  <span className="mt-3 text-sm font-bold">{step.label}</span>
                  <span className="text-[11px] opacity-70">{step.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Core Deal Actions Grid */}
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {/* Left Column: Meeting Planning & Safe Exchange */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Accept/Decline (for Seller) */}
            {deal.status === "requested" && isSeller && (
              <div className="rounded-3xl border border-emerald-500/30 bg-[#062016] p-6 shadow-xl">
                <h3 className="text-base font-bold text-white">Deal Request Pending</h3>
                <p className="mt-1 text-xs text-white/60">
                  The buyer has requested to purchase this surplus material. Review and accept to schedule the handover.
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => updateStatus("accepted")}
                    disabled={actionLoading}
                    className="flex-1 rounded-2xl bg-emerald-400 py-3 text-xs font-black text-[#03140e] hover:bg-emerald-300"
                  >
                    {actionLoading ? "Processing..." : "Accept Deal"}
                  </button>
                  <button
                    onClick={() => updateStatus("rejected")}
                    disabled={actionLoading}
                    className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-xs font-bold text-red-300 hover:bg-red-500/20"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Meeting Scheduler */}
            {["accepted", "meeting_planned", "exchange_ready"].includes(deal.status) && (
              <div className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-bold text-white">
                    <MapPin className="h-4 w-4 text-emerald-400" /> Handover Meeting Coordinates
                  </h3>
                  {deal.status === "exchange_ready" && (
                    <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      CONFIRMED
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-4 text-xs">
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-white/80">Location / Meeting Point</label>
                      {deal.status !== "exchange_ready" && (
                        <button
                          type="button"
                          onClick={handleUseCurrentLocation}
                          disabled={locationLoading}
                          className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition"
                        >
                          {locationLoading ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" /> Detecting GPS...
                            </>
                          ) : (
                            <>
                              <Crosshair className="h-3.5 w-3.5" /> 🎯 Use Current Location
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="relative mt-1">
                      <input
                        type="text"
                        value={meetingLocation}
                        onChange={(e) => {
                          setMeetingLocation(e.target.value);
                          setLocationSelected(false);
                        }}
                        placeholder="e.g. Indiranagar Metro Station, Sector 62 Noida, Gate 3 Warehouse"
                        disabled={deal.status === "exchange_ready"}
                        className="w-full rounded-xl border border-emerald-500/20 bg-[#03110b] p-3 pr-10 text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none"
                      />
                      {locationSearching && (
                        <div className="absolute right-3 top-3.5 text-white/40">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Autocomplete Recommendations Dropdown */}
                    {locationSuggestions.length > 0 && deal.status !== "exchange_ready" && (
                      <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-emerald-500/30 bg-[#04160f] p-1.5 shadow-2xl backdrop-blur-xl">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                          📍 Recommended Locations (Tap to Select)
                        </div>
                        {locationSuggestions.map((sug) => (
                          <button
                            key={sug.id}
                            type="button"
                            onClick={() => selectLocationSuggestion(sug)}
                            className="flex w-full items-start gap-2 rounded-xl p-2 text-left text-xs text-white/90 transition hover:bg-emerald-500/20 hover:text-white"
                          >
                            <MapPin className="mt-0.5 h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span className="leading-snug">{sug.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-white/80">Date</label>
                      <input
                        type="date"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        disabled={deal.status === "exchange_ready"}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#03110b] p-3 text-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-white/80">Time</label>
                      <input
                        type="time"
                        value={meetingTime}
                        onChange={(e) => setMeetingTime(e.target.value)}
                        disabled={deal.status === "exchange_ready"}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#03110b] p-3 text-white"
                      />
                    </div>
                  </div>

                  {deal.status !== "exchange_ready" && (
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={saveMeetingProposal}
                        disabled={actionLoading}
                        className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 py-2.5 font-bold text-emerald-300 hover:bg-emerald-500/30"
                      >
                        Save Proposal
                      </button>
                      {!myMeetingConfirmed && deal.meeting_location && (
                        <button
                          onClick={confirmMeeting}
                          disabled={actionLoading}
                          className="flex-1 rounded-xl bg-emerald-400 py-2.5 font-black text-[#03140e] hover:bg-emerald-300"
                        >
                          Confirm & Unlock OTP
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Physical Handover Confirmation */}
            {deal.exchange_code_verified_at && deal.status !== "completed" && (
              <div className="rounded-3xl border border-emerald-400 bg-emerald-500/15 p-6 shadow-2xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">OTP Verified! Finalize Handover</h3>
                </div>
                <p className="mt-2 text-xs text-white/70">
                  Both parties must tap confirm to record the cryptographic change of ownership in the ledger.
                </p>
                <button
                  onClick={confirmHandover}
                  disabled={actionLoading}
                  className="mt-4 w-full rounded-2xl bg-emerald-400 py-3.5 text-xs font-black text-[#03140e] hover:bg-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                >
                  Confirm Physical Handover
                </button>
              </div>
            )}

            {/* Deal Completed Banner */}
            {deal.status === "completed" && (
              <div className="rounded-3xl border border-emerald-400/40 bg-[#06241a] p-6 text-center shadow-2xl">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-3xl">
                  🎉
                </div>
                <h3 className="mt-3 text-xl font-black text-white">Deal Successfully Completed!</h3>
                <p className="mt-1 text-xs text-white/60">
                  Ownership has been updated and hashed onto the EcoMatch blockchain ledger.
                </p>
                <Link
                  href="/ledger"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-300"
                >
                  <ShieldCheck className="h-4 w-4" /> View in Ledger
                </Link>
              </div>
            )}
          </div>

          {/* Right Column: Digital QR Wallet Pass / OTP Card */}
          <div className="lg:col-span-5 space-y-6">
            {/* Seller OTP & QR Display Card */}
            {isSeller && (
              <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-[#062016] to-[#03140e] p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    SELLER HANDOVER PASS
                  </span>
                  <QrCode className="h-4 w-4 text-emerald-400" />
                </div>

                <p className="mt-2 text-xs text-white/60">
                  Show this 6-digit OTP or QR code to the buyer during in-person pickup.
                </p>

                {generatedCode ? (
                  <div className="mt-5 flex flex-col items-center">
                    <div className="rounded-2xl border border-emerald-400/30 bg-black/60 px-6 py-3 shadow-inner">
                      <span className="font-mono text-3xl font-black tracking-widest text-emerald-300">
                        {generatedCode}
                      </span>
                    </div>

                    {/* QR Code Container */}
                    <div className="mt-4 rounded-2xl bg-white p-3 shadow-xl">
                      <div ref={qrRef} className="overflow-hidden rounded-xl" />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => generateExchangeCode(false)}
                      disabled={actionLoading}
                      className="rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-[#03140e] hover:bg-emerald-300"
                    >
                      Generate Handover Code
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Buyer OTP Input Card */}
            {isBuyer && (
              <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-[#062016] to-[#03140e] p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    BUYER VERIFICATION
                  </span>
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </div>

                <p className="mt-2 text-xs text-white/60">
                  Enter the 6-digit OTP shown by the seller at the pickup location.
                </p>

                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    maxLength={6}
                    value={buyerCode}
                    onChange={(e) => setBuyerCode(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full rounded-2xl border border-emerald-500/30 bg-[#03100b] p-3.5 text-center font-mono text-2xl font-black tracking-widest text-emerald-300 focus:border-emerald-400 focus:outline-none"
                  />

                  <button
                    onClick={verifyExchangeCode}
                    disabled={actionLoading || buyerCode.length < 6}
                    className="w-full rounded-2xl bg-emerald-400 py-3 text-xs font-black text-[#03140e] hover:bg-emerald-300 disabled:opacity-50"
                  >
                    {actionLoading ? "Verifying..." : "Verify OTP Code"}
                  </button>
                </div>
              </div>
            )}

            {/* Participant Trust Profiles */}
            <div className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/60 p-5 space-y-3">
              <span className="text-xs font-bold text-white/70">Participants</span>
              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-400" />
                  <span>Buyer: <strong>{buyer?.full_name || "Eco Buyer"}</strong></span>
                </div>
                <span className="text-emerald-400 text-[11px]">
                  {buyer?.verification_status === "verified" ? "✓ Verified" : "Standard"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-400" />
                  <span>Seller: <strong>{seller?.full_name || "Eco Seller"}</strong></span>
                </div>
                <span className="text-emerald-400 text-[11px]">
                  {seller?.verification_status === "verified" ? "✓ Verified" : "Standard"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Make Offer / Price Counter Slider Modal */}
      {showPriceSlider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-emerald-500/30 bg-[#061d15] p-6 shadow-2xl text-white animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-sky-400" /> Adjust Deal Price
              </h3>
              <button
                type="button"
                onClick={() => setShowPriceSlider(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="mt-1 text-xs text-white/60">
              Current Deal Rate: <strong className="text-white">₹{effectivePrice.toLocaleString("en-IN")}</strong>. Propose and confirm an updated agreed amount.
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-black/40 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60 font-semibold">Updated Offer Price</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    ₹{Number(counterPrice || 0).toLocaleString("en-IN")}
                  </span>
                </div>

                <input
                  type="range"
                  min={Math.max(1, Math.round(effectivePrice * 0.3))}
                  max={Math.round(effectivePrice * 1.3)}
                  step={Math.max(1, Math.round(effectivePrice / 100))}
                  value={Number(counterPrice) || effectivePrice}
                  onChange={(e) => setCounterPrice(Number(e.target.value))}
                  className="w-full h-2.5 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />

                <div className="flex justify-between text-[10px] text-white/40 font-mono">
                  <span>Min: ₹{Math.round(effectivePrice * 0.3).toLocaleString("en-IN")}</span>
                  <span>Current: ₹{effectivePrice.toLocaleString("en-IN")}</span>
                  <span>Max: ₹{Math.round(effectivePrice * 1.3).toLocaleString("en-IN")}</span>
                </div>

                {/* Quick % presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: "5% OFF", factor: 0.95 },
                    { label: "10% OFF", factor: 0.9 },
                    { label: "15% OFF", factor: 0.85 },
                    { label: "20% OFF", factor: 0.8 },
                    { label: "Current", factor: 1.0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setCounterPrice(Math.round(effectivePrice * preset.factor))}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/20 transition active:scale-95"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difference breakdown */}
              {counterPrice > 0 && (
                <div className="rounded-xl border border-white/10 bg-[#03110b] p-3 text-xs flex items-center justify-between">
                  <span className="text-white/60">Adjustment:</span>
                  {effectivePrice - counterPrice > 0 ? (
                    <span className="font-bold text-emerald-400">
                      ₹{(effectivePrice - counterPrice).toLocaleString("en-IN")} lower ({Math.round(((effectivePrice - counterPrice) / effectivePrice) * 100)}% discount)
                    </span>
                  ) : effectivePrice === counterPrice ? (
                    <span className="font-bold text-white/80">Same as current</span>
                  ) : (
                    <span className="font-bold text-amber-400">
                      ₹{(counterPrice - effectivePrice).toLocaleString("en-IN")} higher
                    </span>
                  )}
                </div>
              )}

              {/* Direct Input */}
              <div>
                <label className="text-[11px] font-semibold text-white/70">Or Enter Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={counterPrice || ""}
                  onChange={(e) => setCounterPrice(Number(e.target.value))}
                  placeholder="e.g. 5000"
                  className="mt-1 w-full rounded-xl border border-emerald-500/30 bg-[#03100b] p-3 text-base font-bold text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div className="mt-4 flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPriceSlider(false)}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateAgreedPrice}
                  disabled={actionLoading || counterPrice <= 0}
                  className="flex-1 rounded-2xl bg-emerald-400 py-3 text-xs font-black text-[#03140e] shadow-lg hover:bg-emerald-300 disabled:opacity-50"
                >
                  {actionLoading ? "Updating..." : "Update Deal Price"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ESG Certificate Modal */}
      {deal && (
        <ESGCertificateModal
          isOpen={showEsgModal}
          onClose={() => setShowEsgModal(false)}
          productTitle={product?.title || "Circular Material Asset"}
          materialType={product?.material || "Refurbished Component"}
          dealId={deal.deal_code}
          sellerName={seller?.full_name || "Verified Origin Entity"}
          buyerName={buyer?.full_name || "Verified Recipient Entity"}
          co2OffsetKg={Math.round((effectivePrice / 250) * 10) / 10}
        />
      )}

      <Footer />
      <MobileBottomNav />
    </main>
  );
}
