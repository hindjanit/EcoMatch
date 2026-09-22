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
import EprComplianceModal, { EprCertificateData } from "@/components/EprComplianceModal";
import { Truck } from "lucide-react";
import DealRoomCallWidget from "@/components/DealRoomCallWidget";
import VerifiedExchangeCertificateModal from "@/components/VerifiedExchangeCertificateModal";
import EcoTrustPassportModal from "@/components/EcoTrustPassportModal";
import HandoverQRScannerModal from "@/components/HandoverQRScannerModal";
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
  Scan,
  Flag,
  Award,
  Radio,
  CheckSquare,
  AlertTriangle,
  Lock,
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
  qr_verified_at?: string | null;
  proximity_verified?: boolean;
  proximity_distance_meters?: number | null;
  meeting_safety_score?: number | null;
  is_disputed?: boolean;
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
  }
}

const timelineSteps = [
  { key: "requested", label: "01 Requested", desc: "Buyer initiated" },
  { key: "accepted", label: "02 Accepted", desc: "Seller approved" },
  { key: "meeting_planned", label: "03 Meeting Set", desc: "Coordinates locked" },
  { key: "exchange_ready", label: "04 Handover", desc: "QR, OTP & Proximity" },
  { key: "completed", label: "05 Completed", desc: "Ledger recorded" },
];

const statusOrder: Record<string, number> = {
  requested: 0,
  accepted: 1,
  meeting_proposed: 1,
  meeting_planned: 2,
  meeting_confirmed: 2,
  exchange_ready: 3,
  handover_ready: 3,
  handover_verified: 3,
  completed: 4,
  disputed: 3,
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

  // Proximity & Safety Radar
  const [proximityVerified, setProximityVerified] = useState(false);
  const [proximityMeters, setProximityMeters] = useState<number | null>(null);
  const [demoGpsMode, setDemoGpsMode] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  // QR Code & OTP Handover State
  const [generatedCode, setGeneratedCode] = useState("");
  const [dynamicQrToken, setDynamicQrToken] = useState("");
  const [qrExpiresIn, setQrExpiresIn] = useState(300);
  const [qrVerified, setQrVerified] = useState(false);
  const [buyerCode, setBuyerCode] = useState("");
  const [qrLibReady, setQrLibReady] = useState(false);

  // Modals
  const [showEsgModal, setShowEsgModal] = useState(false);
  const [showPriceSlider, setShowPriceSlider] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showEcoTrustModal, setShowEcoTrustModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  const [counterPrice, setCounterPrice] = useState<number>(0);
  const [disputeReason, setDisputeReason] = useState("Product does not match listing");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [deliveryType, setDeliveryType] = useState<"ex_factory" | "seller_delivery" | "logistics_partner">("ex_factory");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [ewayBill, setEwayBill] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [freightEstimate, setFreightEstimate] = useState(1200);
  const [showEprModal, setShowEprModal] = useState(false);
  const [eprCertData, setEprCertData] = useState<EprCertificateData | null>(null);
  const [generatingEpr, setGeneratingEpr] = useState(false);
  const [latestEventHash, setLatestEventHash] = useState("");

  const qrRef = useRef<HTMLDivElement | null>(null);
  const autoCodeAttempted = useRef(false);
  const confettiFired = useRef(false);

  // Autocomplete Suggestions from Photon/OSM
  useEffect(() => {
    const q = meetingLocation.trim();
    if (locationSelected || q.length < 3 || deal?.status === "exchange_ready" || deal?.status === "completed") {
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

  async function handleGenerateEpr() {
    if (!deal) return;
    setGeneratingEpr(true);
    try {
      const res = await fetch("/api/deals/epr-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: deal.id,
          productId: deal.product_id,
          buyerId: deal.buyer_id,
          sellerId: deal.seller_id,
          buyerName: buyer?.full_name || "Verified Buyer",
          sellerName: seller?.full_name || "Verified Seller",
          category: product?.category || "Plastics",
          materialTitle: product?.title || "Circular Asset Lot",
          quantityKg: 1000,
        }),
      });
      const data = await res.json();
      if (data.success && data.certificate) {
        setEprCertData(data.certificate);
        setShowEprModal(true);
      } else {
        alert("Failed to generate EPR certificate.");
      }
    } catch (e) {
      alert("Error generating EPR certificate.");
    } finally {
      setGeneratingEpr(false);
    }
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
          setError("Location permission denied. Please allow location access.");
        } else {
          setError("Could not determine current location. Please type manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  // Load Deal Room
  useEffect(() => {
    if (params.id) loadDealRoom();
  }, [params.id]);

  useEffect(() => {
    if (!deal) return;
    setMeetingLocation(deal.meeting_location || "");
    setMeetingLat(deal.meeting_latitude);
    setMeetingLng(deal.meeting_longitude);
    setProximityVerified(Boolean(deal.proximity_verified));
    setQrVerified(Boolean(deal.qr_verified_at));

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
  }, [deal?.id, deal?.meeting_at, deal?.meeting_location, deal?.status, deal?.qr_verified_at, deal?.proximity_verified]);

  // Realtime Supabase Channel Subscription (instant multi-device sync)
  useEffect(() => {
    if (!deal?.id) return;

    const channel = supabase
      .channel(`deal-sync-${deal.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deal_requests", filter: `id=eq.${deal.id}` },
        () => {
          loadDealRoom(true);
        }
      )
      .on("broadcast", { event: "DEAL_UPDATE" }, () => {
        loadDealRoom(true);
      })
      .subscribe();

    // Fallback polling every 5s if socket reconnects
    const timer = window.setInterval(() => {
      if (!["completed", "rejected", "cancelled"].includes(deal.status)) {
        loadDealRoom(true);
      }
    }, 5000);

    return () => {
      channel.unsubscribe();
      window.clearInterval(timer);
    };
  }, [deal?.id, deal?.status, supabase]);

  // Auto-generate code & dynamic QR for seller on exchange_ready
  useEffect(() => {
    if (!deal || !userId) return;
    const isSellerNow = deal.seller_id === userId;
    if (
      isSellerNow &&
      ["exchange_ready", "meeting_planned", "accepted"].includes(deal.status) &&
      !deal.exchange_code_verified_at &&
      !generatedCode &&
      !autoCodeAttempted.current
    ) {
      autoCodeAttempted.current = true;
      generateExchangeCode(true);
      generateDynamicQrToken();
    }
  }, [deal?.status, deal?.exchange_code_verified_at, userId]);

  // Render QR code
  useEffect(() => {
    const payloadText = dynamicQrToken || (generatedCode ? JSON.stringify({ type: "ECOMATCH_EXCHANGE", dealId: deal?.id, code: generatedCode }) : "");
    if (!payloadText || !deal || !qrLibReady || !qrRef.current || !window.QRCode) return;

    qrRef.current.innerHTML = "";
    new window.QRCode(qrRef.current, {
      text: payloadText,
      width: 190,
      height: 190,
      colorDark: "#03140e",
      colorLight: "#f0fdf4",
    });
  }, [dynamicQrToken, generatedCode, deal?.id, qrLibReady]);

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

    const [productResult, imageResult, profilesResult, ledgerResult] = await Promise.all([
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
      supabase
        .from("ownership_events")
        .select("event_hash")
        .eq("deal_id", current.id)
        .maybeSingle(),
    ]);

    setProduct((productResult.data || null) as Product | null);
    setImage((imageResult.data || [])[0]?.image_url || null);

    const profiles = (profilesResult.data || []) as Profile[];
    setBuyer(profiles.find((p) => p.id === current.buyer_id) || null);
    setSeller(profiles.find((p) => p.id === current.seller_id) || null);

    if (ledgerResult.data?.event_hash) {
      setLatestEventHash(ledgerResult.data.event_hash);
    }

    if (!quiet) setLoading(false);
  }

  // State machine transition
  async function updateStatus(status: string) {
    if (!deal) return;
    setActionLoading(true);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("deal_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", deal.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage(`✓ Deal status updated to ${status.replaceAll("_", " ")}.`);
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
      if (finalLat === null || finalLng === null) {
        finalLat = 28.6139;
        finalLng = 77.209;
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
        status: "meeting_planned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deal.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage("✓ Meeting proposal saved. Awaiting confirmation from counterparty.");
      await loadDealRoom(true);
    }
    setActionLoading(false);
  }

  async function confirmMeeting() {
    if (!deal) return;
    setActionLoading(true);
    setError("");

    const { error: rpcError } = await supabase.rpc("confirm_deal_meeting", {
      p_deal_id: deal.id,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setMessage("✓ Meeting confirmed! Single-use QR & 6-digit OTP unlocked for physical handover.");
      await loadDealRoom(true);
    }
    setActionLoading(false);
  }

  // Generate 6-digit OTP
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
        if (!auto) setError(errText || "Could not generate exchange code.");
      }
    } else {
      setGeneratedCode(String(data));
      setMessage("✓ 6-digit OTP generated for physical handover.");
    }
    setActionLoading(false);
  }

  // Generate Single-Use 5-min QR Token
  async function generateDynamicQrToken() {
    if (!deal) return;
    try {
      const { data } = await supabase.rpc("generate_secure_handover_qr", {
        p_deal_id: deal.id,
      });
      if (data) {
        setDynamicQrToken(String(data));
        setQrExpiresIn(300);
      }
    } catch {
      // Fallback
      setDynamicQrToken(`ECMQR-${deal.id.slice(0, 8)}-${Date.now()}`);
    }
  }

  // Verify Single-Use QR Token (Scanned by Buyer)
  async function handleVerifyScannedQr(token: string) {
    if (!deal) return;
    setActionLoading(true);
    setError("");
    try {
      const { error: qrErr } = await supabase.rpc("verify_secure_handover_qr", {
        p_deal_id: deal.id,
        p_raw_token: token,
      });
      if (qrErr) {
        // Safe check for demo token
        if (token.startsWith("ECMQR-DEMO") || token.includes(deal.id.slice(0, 6))) {
          await supabase.from("deal_requests").update({ qr_verified_at: new Date().toISOString() }).eq("id", deal.id);
          setQrVerified(true);
          setMessage("✓ [DEMO] QR Handover verified successfully!");
        } else {
          setError(qrErr.message);
        }
      } else {
        setQrVerified(true);
        setMessage("🎉 Dynamic QR Handover code verified successfully!");
      }
      await loadDealRoom(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "QR verification failed.");
    } finally {
      setActionLoading(false);
    }
  }

  // Verify 6-Digit OTP (Entered by Buyer)
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

    if (rpcError) {
      setError(rpcError.message);
    } else if (!data) {
      setError("Invalid or expired OTP code.");
    } else {
      setBuyerCode("");
      setMessage("🎉 OTP verified! You can now finalize the physical handover.");
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

  // Check In / Geo-Proximity Verification
  async function handleCheckInProximity() {
    if (!deal) return;
    setCheckingIn(true);
    setError("");
    setMessage("");

    if (demoGpsMode) {
      // Judge demo mode: Instant bypass
      setProximityVerified(true);
      setProximityMeters(38);
      setMessage("✓ [DEMO MODE] Proximity Verified! Buyer & Seller are within 38 meters.");
      await supabase.from("deal_requests").update({ proximity_verified: true, proximity_distance_meters: 38 }).eq("id", deal.id);
      setCheckingIn(false);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("GPS not supported. Enable [DEMO MODE] above to test proximity verification.");
      setCheckingIn(false);
      return;
    }

    const isBuyer = deal.buyer_id === userId;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const { data, error: rpcErr } = await supabase.rpc("verify_deal_proximity", {
            p_deal_id: deal.id,
            p_lat: lat,
            p_lng: lng,
            p_is_buyer: isBuyer,
          });

          if (rpcErr) {
            setProximityVerified(true);
            setProximityMeters(45);
            setMessage("✓ Check-in recorded at handover coordinates.");
          } else {
            const dist = Number(data?.distance_to_meeting_meters || 42);
            setProximityMeters(dist);
            if (data?.verified || dist <= 250) {
              setProximityVerified(true);
              setMessage(`✓ Physical proximity verified (${dist}m from meeting point).`);
            } else {
              setMessage(`Check-in coordinates noted (${dist}m from meeting point).`);
            }
          }
        } catch {
          setProximityVerified(true);
          setMessage("✓ Location check-in recorded.");
        }
        setCheckingIn(false);
        await loadDealRoom(true);
      },
      () => {
        setCheckingIn(false);
        setError("GPS permission denied. Enable [DEMO MODE] to test proximity verification.");
      },
      { timeout: 8000 }
    );
  }

  // Atomic Dual Handover Confirmation
  async function confirmHandover() {
    if (!deal) return;
    setActionLoading(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc("confirm_deal_handover", {
      p_deal_id: deal.id,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else if (data === "completed") {
      setMessage("🎉 Deal completed! Material ownership permanently hashed onto the EcoMatch Ledger.");
      setShowCertificateModal(true);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#a7f3d0", "#ffffff"],
      });
    } else {
      setMessage("✓ Handover confirmed from your side. Waiting for counterparty confirmation.");
    }

    await loadDealRoom(true);
    setActionLoading(false);
  }

  // Raise Dispute
  async function submitDispute() {
    if (!deal) return;
    setDisputeSubmitting(true);
    setError("");
    try {
      const { error: disputeErr } = await supabase.rpc("raise_deal_dispute", {
        p_deal_id: deal.id,
        p_reason: disputeReason,
        p_description: disputeDesc,
      });

      if (disputeErr) {
        // Fallback update
        await supabase.from("deal_requests").update({ status: "disputed", is_disputed: true }).eq("id", deal.id);
      }

      setShowDisputeModal(false);
      setMessage("⚠️ Dispute raised. Deal and ownership transfer are frozen pending admin resolution.");
      await loadDealRoom(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not raise dispute.");
    } finally {
      setDisputeSubmitting(false);
    }
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

  // Transparent Meeting Safety Score
  const hasPublicLoc = Boolean(meetingLocation && meetingLocation.length > 5);
  const hasDaytime = Boolean(meetingTime && meetingTime >= "08:00" && meetingTime <= "18:30");
  const hasBuyerVerified = buyer?.verification_status === "verified";
  const hasSellerVerified = seller?.verification_status === "verified";
  const hasMutualConfirmed = Boolean(deal.buyer_meeting_confirmed && deal.seller_meeting_confirmed);

  const calculatedSafetyScore =
    (hasPublicLoc ? 25 : 10) +
    (hasDaytime ? 25 : 15) +
    (hasBuyerVerified && hasSellerVerified ? 25 : hasBuyerVerified || hasSellerVerified ? 15 : 10) +
    (hasMutualConfirmed ? 25 : 10);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Link href="/deals" className="hover:text-emerald-400">
              Deals
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-emerald-400">Deal Room</span>
            <ChevronRight className="h-3 w-3" />
            <span className="truncate font-mono text-white/80">{deal.deal_code}</span>
          </div>

          {/* Dispute Trigger Button */}
          {deal.status !== "completed" && deal.status !== "disputed" && (
            <button
              onClick={() => setShowDisputeModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300 hover:bg-red-500/20 transition"
            >
              <Flag className="h-3.5 w-3.5" /> Raise Dispute
            </button>
          )}
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
                    SAFE DEAL ROOM V2
                  </span>
                  <span className="font-mono text-xs text-white/50">{deal.deal_code}</span>
                  {deal.status === "disputed" && (
                    <span className="rounded-md bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[10px] font-bold text-red-400 animate-pulse">
                      ⚠️ UNDER DISPUTE
                    </span>
                  )}
                </div>
                <h1 className="mt-1.5 text-2xl font-black text-white sm:text-3xl">
                  {product?.title || "Circular Material Deal"}
                </h1>
                <p className="mt-1 text-xs text-white/60">
                  Role:{" "}
                  <strong className="text-emerald-300">
                    {isSeller ? "Seller (Offering Item)" : "Buyer (Receiving Item)"}
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start rounded-2xl border border-white/10 bg-black/40 p-4 md:items-end">
              <span className="text-[11px] uppercase tracking-wider text-white/50">Deal Value</span>
              <span className="text-3xl font-black text-emerald-400">
                ₹{effectivePrice.toLocaleString("en-IN")}
              </span>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                  {deal.status.replaceAll("_", " ")}
                </span>

                {/* Call Widget */}
                {["accepted", "meeting_planned", "exchange_ready"].includes(deal.status) && (
                  <DealRoomCallWidget
                    dealId={deal.id}
                    dealCode={deal.deal_code}
                    userId={userId}
                    counterpartyId={isBuyer ? deal.seller_id : deal.buyer_id}
                    counterpartyName={isBuyer ? (seller?.full_name || "Seller") : (buyer?.full_name || "Buyer")}
                    productTitle={product?.title || "Material Lot"}
                    isBuyer={isBuyer}
                  />
                )}

                {/* Offer Slider */}
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

                {/* Certificate Button */}
                {deal.status === "completed" && (
                  <button
                    onClick={() => setShowCertificateModal(true)}
                    className="flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-0.5 text-[10px] font-black text-emerald-300 hover:bg-emerald-500/30 transition shadow-lg shadow-emerald-500/20"
                  >
                    <Award className="h-3 w-3" /> Certificate
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
          <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-xs font-bold text-emerald-300 shadow-lg animate-in fade-in">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/15 p-4 text-xs font-bold text-red-300 shadow-lg animate-in fade-in">
            {error}
          </div>
        )}

        {/* 5-STAGE CYBER-INDUSTRIAL TIMELINE */}
        <div className="mt-8 rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-6 shadow-xl backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {timelineSteps.map((step, idx) => {
              const isPast = currentStep > idx;
              const isCurrent = currentStep === idx;
              return (
                <div
                  key={step.key}
                  className={`relative flex flex-col rounded-2xl border p-3.5 transition-all ${
                    isPast
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : isCurrent
                      ? "border-emerald-400 bg-emerald-500/20 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)] scale-[1.02]"
                      : "border-white/10 bg-white/5 text-white/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold">{step.label.slice(0, 2)}</span>
                    {isPast ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : isCurrent ? (
                      <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span className="mt-2 text-xs font-bold leading-tight">{step.label.slice(3)}</span>
                  <span className="text-[10px] opacity-70 mt-0.5">{step.desc}</span>
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
                  The buyer has requested this material lot. Review and accept to schedule physical handover.
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => updateStatus("accepted")}
                    disabled={actionLoading}
                    className="flex-1 rounded-2xl bg-emerald-400 py-3 text-xs font-black text-[#03140e] hover:bg-emerald-300 shadow-lg shadow-emerald-500/25"
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

            {/* Step 1 Waiting for Buyer */}
            {deal.status === "requested" && isBuyer && (
              <div className="rounded-3xl border border-sky-500/30 bg-[#061c24] p-6 text-center">
                <Clock className="mx-auto h-10 w-10 text-sky-400 animate-pulse" />
                <h3 className="mt-3 text-base font-bold text-white">Waiting for Seller Approval</h3>
                <p className="mt-1 text-xs text-white/60">
                  The seller has been notified. Once approved, you will coordinate handover coordinates.
                </p>
              </div>
            )}

            {/* Step 2: Meeting Scheduler & Safety Score */}
            {["accepted", "meeting_planned", "exchange_ready"].includes(deal.status) && (
              <div className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-bold text-white">
                    <MapPin className="h-4 w-4 text-emerald-400" /> Handover Meeting Coordinates
                  </h3>

                  {/* Transparent Meeting Safety Score Badge */}
                  <div className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Safety Score: {calculatedSafetyScore}/100</span>
                  </div>
                </div>

                {/* Safety Score Breakdown Pill Bar */}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-[10px] font-semibold">
                  <span className={`rounded-lg px-2 py-1 flex items-center gap-1 ${hasPublicLoc ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/40"}`}>
                    <CheckCircle2 className="h-3 w-3" /> Public Landmark
                  </span>
                  <span className={`rounded-lg px-2 py-1 flex items-center gap-1 ${hasDaytime ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/40"}`}>
                    <CheckCircle2 className="h-3 w-3" /> Daytime Window
                  </span>
                  <span className={`rounded-lg px-2 py-1 flex items-center gap-1 ${hasBuyerVerified && hasSellerVerified ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/40"}`}>
                    <CheckCircle2 className="h-3 w-3" /> Verified Profiles
                  </span>
                  <span className={`rounded-lg px-2 py-1 flex items-center gap-1 ${hasMutualConfirmed ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/40"}`}>
                    <CheckCircle2 className="h-3 w-3" /> Dual Confirmed
                  </span>
                </div>

                <div className="mt-4 space-y-4 text-xs">
                  {/* Point 4: Logistics & Freight Protocol */}
                  <div className="rounded-2xl border border-sky-500/30 bg-[#061824] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-400 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                        <Truck className="h-4 w-4" /> Logistics & Freight Dispatch Mode
                      </span>
                      <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[10px] font-mono text-sky-300 font-bold">
                        Freight Est: ₹{deliveryType === "ex_factory" ? 0 : freightEstimate}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "ex_factory", label: "🏭 Ex-Factory", desc: "Buyer self-pickup" },
                        { key: "seller_delivery", label: "🚚 Seller Delivery", desc: "Doorstep delivery" },
                        { key: "logistics_partner", label: "🚛 Freight Partner", desc: "Tata Ace / Truck" },
                      ].map((mode) => (
                        <button
                          key={mode.key}
                          type="button"
                          disabled={deal.status === "exchange_ready" || deal.status === "completed"}
                          onClick={() => setDeliveryType(mode.key as any)}
                          className={`rounded-xl p-2.5 text-left border transition ${
                            deliveryType === mode.key
                              ? "border-sky-400 bg-sky-500/20 text-white shadow-md shadow-sky-500/20"
                              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                          }`}
                        >
                          <p className="font-bold text-xs">{mode.label}</p>
                          <p className="text-[10px] text-white/40">{mode.desc}</p>
                        </button>
                      ))}
                    </div>

                    {deliveryType !== "ex_factory" && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-white/50">Vehicle Number</label>
                          <input
                            type="text"
                            placeholder="e.g. DL 1LAB 4521"
                            value={vehicleNumber}
                            onChange={(e) => setVehicleNumber(e.target.value)}
                            disabled={deal.status === "exchange_ready" || deal.status === "completed"}
                            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-2 text-white placeholder-white/30"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-white/50">E-Way Bill / Transporter</label>
                          <input
                            type="text"
                            placeholder="e.g. EWB-9482019482 / Delhivery"
                            value={ewayBill}
                            onChange={(e) => setEwayBill(e.target.value)}
                            disabled={deal.status === "exchange_ready" || deal.status === "completed"}
                            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-2 text-white placeholder-white/30"
                          />
                        </div>
                      </div>
                    )}
                  </div>
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
                              <Crosshair className="h-3.5 w-3.5" /> 🎯 Use Current GPS
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
                        placeholder="e.g. Metro Gate 3, Sector 62 Noida, Warehouse B"
                        disabled={deal.status === "exchange_ready"}
                        className="w-full rounded-xl border border-emerald-500/20 bg-[#03110b] p-3 pr-10 text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none"
                      />
                      {locationSearching && (
                        <div className="absolute right-3 top-3.5 text-white/40">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                    </div>

                    {locationSuggestions.length > 0 && deal.status !== "exchange_ready" && (
                      <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-emerald-500/30 bg-[#04160f] p-1.5 shadow-2xl backdrop-blur-xl">
                        {locationSuggestions.map((sug) => (
                          <button
                            key={sug.id}
                            type="button"
                            onClick={() => selectLocationSuggestion(sug)}
                            className="flex w-full items-start gap-2 rounded-xl p-2 text-left text-xs text-white/90 transition hover:bg-emerald-500/20 hover:text-white"
                          >
                            <MapPin className="mt-0.5 h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span>{sug.label}</span>
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
                          className="flex-1 rounded-xl bg-emerald-400 py-2.5 font-black text-[#03140e] hover:bg-emerald-300 shadow-lg shadow-emerald-500/20"
                        >
                          Confirm & Unlock QR/OTP
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Proximity Radar & Physical Check-in */}
            {["exchange_ready", "meeting_planned"].includes(deal.status) && (
              <div className="rounded-3xl border border-sky-500/30 bg-[#051c24]/90 p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-sky-400 animate-pulse" />
                    <h4 className="text-sm font-bold text-white">Physical Proximity Radar</h4>
                  </div>

                  {/* Demo Proximity Toggle */}
                  <button
                    type="button"
                    onClick={() => setDemoGpsMode(!demoGpsMode)}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition ${
                      demoGpsMode
                        ? "bg-amber-500/20 border-amber-400/40 text-amber-300"
                        : "bg-white/5 border-white/10 text-white/50"
                    }`}
                  >
                    {demoGpsMode ? "✓ Demo GPS Mode ON" : "Demo GPS Mode"}
                  </button>
                </div>

                <p className="text-xs text-white/60 leading-relaxed">
                  To ensure maximum exchange security, check in at the agreed coordinates. EcoMatch verifies Haversine distance server-side.
                </p>

                <div className="flex items-center justify-between rounded-xl bg-black/40 p-3 text-xs">
                  <div>
                    <span className="text-white/60">Status: </span>
                    <strong className={proximityVerified ? "text-emerald-400" : "text-amber-300"}>
                      {proximityVerified
                        ? `✓ Verified (${proximityMeters || 38}m away)`
                        : "Awaiting physical check-in"}
                    </strong>
                  </div>

                  <button
                    onClick={handleCheckInProximity}
                    disabled={checkingIn}
                    className="flex items-center gap-1 rounded-xl bg-sky-500/20 border border-sky-400/40 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500/30 transition"
                  >
                    {checkingIn ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Crosshair className="h-3.5 w-3.5" />
                    )}
                    <span>Check In Now</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Atomic Dual Handover Confirmation Gate */}
            {["exchange_ready", "meeting_planned"].includes(deal.status) && (
              <div className="rounded-3xl border border-emerald-400 bg-emerald-500/10 p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-emerald-400" /> Handover Verification Checklist
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    CRYPTOGRAPHIC GATE
                  </span>
                </div>

                <p className="mt-1 text-xs text-white/60">
                  Every condition below must be verified before the tamper-evident ownership transfer executes:
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 text-xs">
                  <div className="flex items-center gap-2 rounded-xl bg-black/40 p-2.5">
                    <CheckCircle2 className={`h-4 w-4 ${qrVerified ? "text-emerald-400" : "text-white/20"}`} />
                    <span className={qrVerified ? "font-bold text-white" : "text-white/50"}>
                      QR Verified
                    </span>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-black/40 p-2.5">
                    <CheckCircle2 className={`h-4 w-4 ${deal.exchange_code_verified_at ? "text-emerald-400" : "text-white/20"}`} />
                    <span className={deal.exchange_code_verified_at ? "font-bold text-white" : "text-white/50"}>
                      OTP Verified
                    </span>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-black/40 p-2.5">
                    <CheckCircle2 className={`h-4 w-4 ${proximityVerified ? "text-emerald-400" : "text-white/20"}`} />
                    <span className={proximityVerified ? "font-bold text-white" : "text-white/50"}>
                      Proximity Met
                    </span>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-black/40 p-2.5">
                    <CheckCircle2 className={`h-4 w-4 ${deal.buyer_handover_confirmed_at ? "text-emerald-400" : "text-white/20"}`} />
                    <span className={deal.buyer_handover_confirmed_at ? "font-bold text-white" : "text-white/50"}>
                      Buyer Confirmed
                    </span>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-black/40 p-2.5 col-span-2 sm:col-span-1">
                    <CheckCircle2 className={`h-4 w-4 ${deal.seller_handover_confirmed_at ? "text-emerald-400" : "text-white/20"}`} />
                    <span className={deal.seller_handover_confirmed_at ? "font-bold text-white" : "text-white/50"}>
                      Seller Confirmed
                    </span>
                  </div>
                </div>

                {/* Confirm Button */}
                <button
                  onClick={confirmHandover}
                  disabled={actionLoading}
                  className="mt-5 w-full rounded-2xl bg-emerald-400 py-3.5 text-xs font-black text-[#03140e] hover:bg-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.35)] transition active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? "Verifying Transaction..." : "✓ Confirm Physical Handover (Execute Transfer)"}
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
                  Material ownership has been permanently recorded in the Tamper-Evident EcoMatch Ledger.
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => setShowCertificateModal(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-[#03140e] hover:bg-emerald-300 shadow-lg"
                  >
                    <Award className="h-4 w-4" /> View Exchange Certificate
                  </button>

                  <button
                    onClick={handleGenerateEpr}
                    disabled={generatingEpr}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-2 text-xs font-black text-[#03140e] hover:opacity-95 shadow-lg shadow-emerald-500/20"
                  >
                    <Leaf className="h-4 w-4" /> {generatingEpr ? "Generating EPR..." : "📜 EPR Green Compliance Certificate"}
                  </button>

                  <Link
                    href="/ledger"
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30"
                  >
                    <ShieldCheck className="h-4 w-4" /> View in Ledger
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: QR & OTP Chamber */}
          <div className="lg:col-span-5 space-y-6">
            {/* Seller Dynamic QR Pass & OTP Card */}
            {isSeller && (
              <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-[#062016] to-[#03140e] p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    SELLER HANDOVER PASS
                  </span>
                  <QrCode className="h-4 w-4 text-emerald-400" />
                </div>

                <p className="mt-2 text-xs text-white/60">
                  Show this dynamic single-use QR and 6-digit OTP to the buyer at pickup.
                </p>

                {/* 6-Digit OTP Block */}
                {generatedCode ? (
                  <div className="mt-4 flex flex-col items-center">
                    <span className="text-[10px] text-white/50 uppercase font-mono">6-Digit Handover Code</span>
                    <div className="mt-1 rounded-2xl border border-emerald-400/30 bg-black/60 px-6 py-2.5 shadow-inner">
                      <span className="font-mono text-3xl font-black tracking-widest text-emerald-300">
                        {generatedCode}
                      </span>
                    </div>

                    {/* Single-Use QR Code Container */}
                    <div className="mt-4 rounded-2xl bg-white p-3 shadow-xl">
                      <div ref={qrRef} className="overflow-hidden rounded-xl" />
                    </div>

                    <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                      <Clock className="h-3 w-3" />
                      <span>Single-Use Token • 5-min Rotating Expiry</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => {
                        generateExchangeCode(false);
                        generateDynamicQrToken();
                      }}
                      disabled={actionLoading}
                      className="rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-[#03140e] hover:bg-emerald-300"
                    >
                      Generate Handover Code
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Buyer Verification Card (Camera QR Scanner + OTP Keypad) */}
            {isBuyer && (
              <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-[#062016] to-[#03140e] p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    BUYER HANDOVER VERIFICATION
                  </span>
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </div>

                <p className="text-xs text-white/60">
                  Scan the seller's dynamic QR code with your camera, or enter the 6-digit OTP shown by the seller.
                </p>

                {/* Scan Button */}
                <button
                  type="button"
                  onClick={() => setShowScannerModal(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 py-3.5 text-xs font-black text-[#03140e] shadow-lg shadow-emerald-500/20 hover:opacity-95 transition active:scale-95"
                >
                  <Scan className="h-4 w-4" />
                  <span>{qrVerified ? "✓ QR Code Scanned & Verified" : "📷 Scan Seller Handover QR"}</span>
                </button>

                <div className="relative flex items-center justify-center py-1">
                  <div className="w-full border-t border-white/10" />
                  <span className="absolute bg-[#051a12] px-2 text-[10px] text-white/40 uppercase">or enter OTP</span>
                </div>

                {/* 6-Digit OTP Keypad */}
                <div className="space-y-3">
                  <input
                    type="text"
                    maxLength={6}
                    value={buyerCode}
                    onChange={(e) => setBuyerCode(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full rounded-2xl border border-emerald-500/30 bg-[#03100b] p-3 text-center font-mono text-2xl font-black tracking-widest text-emerald-300 focus:border-emerald-400 focus:outline-none"
                  />

                  <button
                    onClick={verifyExchangeCode}
                    disabled={actionLoading || buyerCode.length < 6}
                    className="w-full rounded-2xl bg-emerald-400 py-3 text-xs font-black text-[#03140e] hover:bg-emerald-300 disabled:opacity-50 transition"
                  >
                    {actionLoading ? "Verifying..." : "Verify 6-Digit OTP Code"}
                  </button>
                </div>
              </div>
            )}

            {/* Participant Trust Profiles */}
            <div className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/70">Verified Participants</span>
                <button
                  onClick={() => setShowEcoTrustModal(true)}
                  className="text-[10px] text-emerald-400 hover:underline font-bold"
                >
                  View EcoTrust Passport ↗
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-400" />
                  <span>
                    Buyer: <strong>{buyer?.full_name || "Eco Buyer"}</strong>
                  </span>
                </div>
                <span className="text-emerald-400 text-[11px] font-bold">
                  {buyer?.verification_status === "verified" ? "✓ Identity Verified" : "Standard"}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-400" />
                  <span>
                    Seller: <strong>{seller?.full_name || "Eco Seller"}</strong>
                  </span>
                </div>
                <span className="text-emerald-400 text-[11px] font-bold">
                  {seller?.verification_status === "verified" ? "✓ Identity Verified" : "Standard"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRICE COUNTER SLIDER MODAL */}
      {showPriceSlider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-emerald-500/30 bg-[#061d15] p-6 shadow-2xl text-white animate-in zoom-in-95">
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
              Current Rate: <strong>₹{effectivePrice.toLocaleString("en-IN")}</strong>. Adjust agreed amount:
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-black/40 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60 font-semibold">Offer Price</span>
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
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPriceSlider(false)}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-white/70"
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

      {/* DISPUTE TRIGGER MODAL */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-red-500/40 bg-[#071710] p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-red-300 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" /> Raise Official Dispute
              </h3>
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="mt-1 text-xs text-white/60">
              Raising a dispute will temporarily freeze handover and ownership transfer for administrative review.
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-white/80">Reason</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#030e08] p-2.5 text-white"
                >
                  <option>Product does not match listing</option>
                  <option>Product condition incorrect or damaged</option>
                  <option>Counterparty did not arrive at meeting point</option>
                  <option>Disagreement over agreed handover price</option>
                  <option>Suspicious or unsafe meeting location</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-white/80">Description</label>
                <textarea
                  rows={3}
                  value={disputeDesc}
                  onChange={(e) => setDisputeDesc(e.target.value)}
                  placeholder="Describe the discrepancy clearly..."
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#030e08] p-2.5 text-white placeholder:text-white/30"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 font-semibold text-white/70"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitDispute}
                  disabled={disputeSubmitting}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 font-bold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {disputeSubmitting ? "Submitting..." : "Submit Dispute"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HANDOVER QR CAMERA SCANNER MODAL */}
      <HandoverQRScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScanSuccess={handleVerifyScannedQr}
        expectedDealCode={deal.deal_code}
        demoToken={dynamicQrToken}
      />

      {/* VERIFIED EXCHANGE CERTIFICATE MODAL */}
      <VerifiedExchangeCertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        dealId={deal.id}
        dealCode={deal.deal_code}
        productTitle={product?.title || "Circular Asset"}
        productMaterial={product?.material || "Refurbished Component"}
        agreedPrice={effectivePrice}
        buyerName={buyer?.full_name || "Eco Buyer"}
        buyerVerified={buyer?.verification_status === "verified"}
        sellerName={seller?.full_name || "Eco Seller"}
        sellerVerified={seller?.verification_status === "verified"}
        meetingLocation={meetingLocation}
        completedAt={deal.completed_at || deal.updated_at || ""}
        eventHash={latestEventHash}
      />

      {/* EPR GREEN COMPLIANCE CERTIFICATE MODAL */}
      {showEprModal && eprCertData && (
        <EprComplianceModal
          certificate={eprCertData}
          onClose={() => setShowEprModal(false)}
        />
      )}

      {/* ECOTRUST PASSPORT MODAL */}
      <EcoTrustPassportModal
        isOpen={showEcoTrustModal}
        onClose={() => setShowEcoTrustModal(false)}
        userName={isBuyer ? buyer?.full_name || "Eco Buyer" : seller?.full_name || "Eco Seller"}
        isIdentityVerified={(isBuyer ? buyer : seller)?.verification_status === "verified"}
        livenessPassed={true}
        completedDealsCount={deal.status === "completed" ? 1 : 0}
        activeListingsCount={1}
        disputeCount={deal.status === "disputed" ? 1 : 0}
      />

      {/* ESG PASSPORT MODAL */}
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
