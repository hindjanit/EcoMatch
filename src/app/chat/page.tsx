"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import {
  Send,
  MessageSquare,
  ShieldCheck,
  ArrowLeft,
  Lock,
  MapPin,
  ExternalLink,
  Sparkles,
  Navigation,
  Boxes,
} from "lucide-react";

type Conversation = {
  id: number;
  product_id: number;
  buyer_id: string;
  seller_id: string;
};

type Message = {
  id: number;
  conversation_id: number;
  sender_id: string;
  message: string;
  created_at: string;
  read_at?: string | null;
};

type ConversationContext = {
  id: number;
  product_title: string | null;
  product_category: string | null;
  product_price: number | null;
  counterparty_id: string;
  counterparty_name: string;
  counterparty_verification_status: string | null;
  counterparty_avatar_url: string | null;
  counterparty_role: "Seller" | "Buyer";
};

type Product = {
  id: number;
  title: string;
  category: string;
  price: number;
};

type SellerProfile = {
  id: string;
  full_name: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  verification_status: string | null;
};

type CounterpartyProfile = {
  id: string;
  full_name: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  verification_status: string | null;
  avatar_url?: string | null;
  role: "Seller" | "Buyer";
};

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371;
  const toRadians = (val: number) => (val * Math.PI) / 180;
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

const BUYER_SUGGESTIONS = [
  "Is this item still available?",
  "What is your best/final price?",
  "Where is the exact pickup location?",
  "Can you share more photos or condition details?",
  "Can we do an on-site inspection before OTP handover?",
];

const SELLER_SUGGESTIONS = [
  "Yes, the item is available and ready for pickup!",
  "Price is fair & fixed as mentioned in the listing.",
  "Let's create a Deal Room to lock in the handover schedule.",
  "When are you available to inspect & pick up?",
  "Yes, physical inspection is welcome before OTP release.",
];

function ChatContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const conversationId = searchParams.get("conversation");
  const productId = searchParams.get("product") || searchParams.get("productId");
  const sellerId = searchParams.get("seller") || searchParams.get("sellerId");
  const inquiry = searchParams.get("inquiry");

  const [userId, setUserId] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [counterparty, setCounterparty] = useState<CounterpartyProfile | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState(inquiry || "");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const initialScrollDone = useRef(false);

  const isSeller = Boolean(conversation && userId && conversation.seller_id === userId);
  const activeSuggestions = isSeller ? SELLER_SUGGESTIONS : BUYER_SUGGESTIONS;

  useEffect(() => {
    if (inquiry && !newMessage) {
      setNewMessage(inquiry);
    }
  }, [inquiry]);

  useEffect(() => {
    initChat();
  }, [conversationId, productId, sellerId]);

  // SMART SCROLL: Only auto-scroll down if user was ALREADY at the bottom or on initial load
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    if (!initialScrollDone.current && messages.length > 0) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      initialScrollDone.current = true;
    } else if (isNearBottomRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    // If user scrolled up to read past messages, do not force scroll down!
  }, [messages]);

  function handleContainerScroll() {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Consider at bottom if within 80px of bottom
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
  }

  // Real-time message subscription + polling
  useEffect(() => {
    if (!conversation) return;

    const channel = supabase
      .channel(`chat-room-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          if (payload.new) {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (newMsg.sender_id !== userId) {
              markConversationRead(conversation.id, userId);
            }
          }
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      loadMessages(conversation.id, true);
    }, 2500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [conversation, userId]);

  async function initChat() {
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

    setUserId(user.id);

    let activeConv: Conversation | null = null;

    if (conversationId) {
      const { data, error: convErr } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", Number(conversationId))
        .maybeSingle();

      if (convErr) {
        setError(`Could not load conversation: ${convErr.message}`);
        setLoading(false);
        return;
      }
      activeConv = data as Conversation;
    } else if (productId && sellerId) {
      const pId = Number(productId);

      if (user.id === sellerId) {
        const { data: sellerConvs } = await supabase
          .from("conversations")
          .select("*")
          .eq("product_id", pId)
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false });

        if (sellerConvs && sellerConvs.length > 0) {
          activeConv = sellerConvs[0] as Conversation;
        } else {
          setError("You are the seller of this product. No buyer conversations have been started for this lot yet.");
          setLoading(false);
          return;
        }
      } else {
        const { data: existing } = await supabase
          .from("conversations")
          .select("*")
          .eq("product_id", pId)
          .eq("buyer_id", user.id)
          .eq("seller_id", sellerId)
          .maybeSingle();

        if (existing) {
          activeConv = existing as Conversation;
        } else {
          const { data: newConv, error: createErr } = await supabase
            .from("conversations")
            .insert({
              product_id: pId,
              buyer_id: user.id,
              seller_id: sellerId,
            })
            .select("*")
            .single();

          if (createErr) {
            console.error("Conversation creation error:", createErr);
            setError(`Could not start conversation: ${createErr.message}`);
            setLoading(false);
            return;
          }
          activeConv = newConv as Conversation;
        }
      }
    }

    if (!activeConv) {
      setError("No valid conversation parameters provided.");
      setLoading(false);
      return;
    }

    setConversation(activeConv);

    // Fetch product details
    const { data: prodData } = await supabase
      .from("products")
      .select("id, title, category, price")
      .eq("id", activeConv.product_id)
      .maybeSingle();

    if (prodData) setProduct(prodData as Product);

    // Fetch counterparty profile
    const isBuyerUser = user.id === activeConv.buyer_id;
    const counterpartyId = isBuyerUser ? activeConv.seller_id : activeConv.buyer_id;
    const counterpartyRole: "Seller" | "Buyer" = isBuyerUser ? "Seller" : "Buyer";

    const { data: cpData } = await supabase
      .from("profiles")
      .select("id, full_name, location_name, latitude, longitude, verification_status, avatar_url")
      .eq("id", counterpartyId)
      .maybeSingle();

    if (cpData) {
      setCounterparty({
        ...cpData,
        role: counterpartyRole,
      });
    } else {
      // Profile RLS may intentionally hide direct profile reads. The inbox RPC only
      // exposes the public identity of a participant in this user's conversation.
      const { data: inboxContext } = await supabase.rpc("get_my_conversation_inbox");
      const context = (inboxContext as ConversationContext[] | null)?.find(
        (row) => Number(row.id) === Number(activeConv.id)
      );

      if (context) {
        setCounterparty({
          id: context.counterparty_id,
          full_name: context.counterparty_name,
          location_name: null,
          latitude: null,
          longitude: null,
          verification_status: context.counterparty_verification_status,
          avatar_url: context.counterparty_avatar_url,
          role: context.counterparty_role,
        });

        if (!prodData && context.product_title) {
          setProduct({
            id: activeConv.product_id,
            title: context.product_title,
            category: context.product_category || "Marketplace listing",
            price: Number(context.product_price || 0),
          });
        }
      }
    }

    // Fetch seller profile for location and distance
    const { data: sellerData } = await supabase
      .from("profiles")
      .select("id, full_name, location_name, latitude, longitude, verification_status")
      .eq("id", activeConv.seller_id)
      .maybeSingle();

    if (sellerData) {
      setSeller(sellerData as SellerProfile);

      // Fetch buyer profile for distance comparison
      const { data: buyerData } = await supabase
        .from("profiles")
        .select("latitude, longitude")
        .eq("id", user.id)
        .maybeSingle();

      if (
        buyerData?.latitude &&
        buyerData?.longitude &&
        sellerData.latitude &&
        sellerData.longitude
      ) {
        const dist = calculateDistanceKm(
          buyerData.latitude,
          buyerData.longitude,
          sellerData.latitude,
          sellerData.longitude
        );
        setDistanceKm(dist);
      } else if (sellerData.latitude && sellerData.longitude && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const dist = calculateDistanceKm(
              pos.coords.latitude,
              pos.coords.longitude,
              sellerData.latitude!,
              sellerData.longitude!
            );
            setDistanceKm(dist);
          },
          () => {}
        );
      }
    }

    await loadMessages(activeConv.id, false);
    await markConversationRead(activeConv.id, user.id);
    setLoading(false);
  }

  async function markConversationRead(cId: number, currentUserId: string) {
    const { error: rpcError } = await supabase.rpc("mark_conversation_read", {
      p_conversation_id: cId,
    });

    if (!rpcError) return;

    // Compatibility fallback while Phase 15 is being rolled out.
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", cId)
      .neq("sender_id", currentUserId)
      .is("read_at", null);
  }

  async function loadMessages(cId: number, quiet = false) {
    try {
      const { data, error: msgErr } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", cId)
        .order("created_at", { ascending: true });

      if (!msgErr && data) {
        const fetched = data as Message[];
        setMessages((prev) => {
          // If message count and last ID are same, return prev to prevent re-render scroll trigger!
          if (
            prev.length === fetched.length &&
            prev.length > 0 &&
            prev[prev.length - 1]?.id === fetched[fetched.length - 1]?.id
          ) {
            return prev;
          }
          return fetched;
        });
      } else if (msgErr && !quiet) {
        console.error("Message load error:", msgErr);
      }
    } catch (e) {
      if (!quiet) console.error("loadMessages exception:", e);
    }
  }

  async function handleSendMessage(e?: React.FormEvent, directText?: string) {
    if (e) e.preventDefault();
    const textToSend = (directText !== undefined ? directText : newMessage).trim();
    if (!textToSend || !conversation || sending) return;

    setError("");
    setSending(true);
    if (!directText) setNewMessage("");

    // 1. Collect recent messages from current user in this chat to detect multi-message split digit sharing
    const myRecentMessages = messages
      .filter((m) => m.sender_id === userId)
      .slice(-6)
      .map((m) => m.message);

    // 2. Comprehensive safety moderation check (Local + AI)
    let isSuspicious = false;
    let suspicionReason = "";
    try {
      const modRes = await fetch("/api/chat/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          recentMessages: myRecentMessages,
        }),
      });
      const modData = await modRes.json();
      if (modData?.suspicious) {
        isSuspicious = true;
        suspicionReason = modData.reason || "Sharing external contact details is not allowed.";
      }
    } catch (modError) {
      console.warn("Moderation check error:", modError);
    }

    if (isSuspicious) {
      setError(`⚠️ Message blocked: ${suspicionReason}. For your security, phone numbers, emails, Instagram IDs, and external links cannot be shared.`);
      if (!directText) setNewMessage(textToSend);
      setSending(false);
      return;
    }

    // 3. Try send_safe_message RPC
    let inserted = false;
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc("send_safe_message", {
        p_conversation_id: conversation.id,
        p_message: textToSend,
        p_ai_flag: isSuspicious,
        p_ai_reason: suspicionReason || null,
      });

      if (!rpcErr && rpcData) {
        if (rpcData.allowed === false) {
          setError(`⚠️ ${rpcData.reason || "Message not allowed."} ${rpcData.warning || ""}`);
          if (!directText) setNewMessage(textToSend);
          setSending(false);
          return;
        }
        inserted = true;
      }
    } catch (rpcErr) {
      console.warn("RPC send_safe_message fallback:", rpcErr);
    }

    // 4. Fallback direct insert
    if (!inserted) {
      const { error: sendErr } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          sender_id: userId,
          message: textToSend,
        });

      if (sendErr) {
        console.error("Message send error:", sendErr);
        setError(`Failed to send message: ${sendErr.message}`);
        if (!directText) setNewMessage(textToSend);
        setSending(false);
        return;
      }
    }

    // Explicit send: force user to bottom to see their new message
    isNearBottomRef.current = true;
    await loadMessages(conversation.id, true);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    setSending(false);
  }

  const mapSearchQuery = seller?.latitude && seller?.longitude
    ? `${seller.latitude},${seller.longitude}`
    : seller?.location_name
    ? seller.location_name
    : null;

  const googleMapsUrl = mapSearchQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapSearchQuery)}`
    : null;

  const counterpartyName =
    counterparty?.full_name || (counterparty?.role === "Seller" ? "Seller" : "Buyer");
  const counterpartyInitials = counterpartyName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative mx-auto max-w-4xl px-4 pt-28 sm:px-6">
      {/* Top Chat Bar */}
      <div className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/90 p-4 shadow-xl backdrop-blur-xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/chat/inbox"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white transition"
              title="Back to Inbox"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            {/* Counterparty Avatar Badge */}
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/30 to-sky-500/20 text-emerald-300 font-black text-sm shadow-md">
              <span>{counterpartyInitials || "U"}</span>
              {counterparty?.verification_status === "verified" && (
                <span
                  className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow-sm"
                  title="UIDAI Verified Member"
                >
                  <ShieldCheck className="h-2 w-2 stroke-[3]" />
                </span>
              )}
            </div>

            <div className="min-w-0">
              {/* Line 1: Primary Counterparty Name + Role Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-white text-base sm:text-lg leading-tight truncate">
                  {counterpartyName}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-black uppercase ${
                    counterparty?.role === "Seller"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {counterparty?.role || "Member"}
                </span>
                {counterparty?.verification_status === "verified" && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-mono font-bold text-emerald-400">
                    <ShieldCheck className="h-2.5 w-2.5" /> Verified
                  </span>
                )}
              </div>

              {/* Line 2: Product Context (Regarding: Laptop · ₹40,999) */}
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-400/90 truncate">
                <Boxes className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span className="font-semibold text-slate-200 truncate">
                  Re: {product?.title || "Material Discussion"}
                </span>
                {product?.price !== undefined && (
                  <span className="text-emerald-400 font-mono font-bold">
                    · ₹{product.price.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {product?.id && (
            <Link
              href={`/product/${product.id}`}
              className="shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition flex items-center gap-1"
            >
              <span>View Product</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>

        {/* Seller Location & Distance Bar */}
        {(seller?.location_name || distanceKm !== null) && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5 text-xs">
            <div className="flex items-center gap-2 text-white/70">
              <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>
                Seller Location:{" "}
                <strong className="text-white">
                  {seller?.location_name || "Configured Seller Area"}
                </strong>
              </span>
              {distanceKm !== null && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  📍 {distanceKm < 1 ? "< 1 km away" : `${distanceKm.toFixed(1)} km away`}
                </span>
              )}
            </div>

            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-300 hover:bg-sky-500/20 transition"
              >
                <Navigation className="h-3 w-3" /> View on Map <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Fraud & Safe Exchange Alert */}
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-[#03140e]/60 px-4 py-2 text-[11px] text-white/50">
        <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        <span>For your security, always complete handovers through the verified OTP Deal Room.</span>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-xs font-semibold text-amber-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-3 text-amber-300 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages Scroll Box */}
      <div className="mt-4 flex h-[460px] flex-col justify-between rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl">
        <div
          ref={scrollContainerRef}
          onScroll={handleContainerScroll}
          className="flex-1 overflow-y-auto space-y-3 pr-2 scroll-smooth"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center text-xs text-white/50">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-xs text-white/40 space-y-2">
              <MessageSquare className="h-8 w-8 text-emerald-500/30" />
              <p>Start the discussion! Inquire about volume, pickup logistics or price negotiation.</p>
              <p className="text-[11px] text-emerald-400/70">Or tap any suggestion below to send instantly.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === userId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl p-3.5 text-xs ${
                      isMe
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                        : "border border-white/10 bg-[#03110b] text-white/90"
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    <span className="mt-1 block text-[10px] opacity-60 text-right">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Dynamic Quick Message Suggestions Chips (Buyer vs Seller Role-Aware) */}
        <div className="mt-3 border-t border-white/10 pt-2.5">
          <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 mb-1.5">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> {isSeller ? "Seller Quick Replies" : "Buyer Quick Inquiries"}
            </span>
            <span className="text-[9px] text-white/40 lowercase">tap to send</span>
          </div>
          <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {activeSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSendMessage(undefined, suggestion)}
                disabled={sending}
                className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/80 transition hover:border-emerald-400/60 hover:bg-emerald-500/15 hover:text-white active:scale-95 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={(e) => handleSendMessage(e)} className="mt-2 flex items-center gap-2 pt-1">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isSeller ? "Reply to buyer..." : "Type your message..."}
            className="flex-1 rounded-2xl border border-emerald-500/20 bg-[#03110b] px-4 py-3 text-xs text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-[#03140e] transition hover:bg-emerald-300 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <main className="eco-page min-h-screen text-white pb-24">
      <Navbar />

      <div className="eco-orb eco-orb-one" />
      <div className="eco-orb eco-orb-two" />

      <Suspense fallback={<div className="pt-36 text-center text-xs">Loading chat...</div>}>
        <ChatContent />
      </Suspense>

      <Footer />
      <MobileBottomNav />
    </main>
  );
}
