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
  ShieldAlert,
  ArrowLeft,
  Handshake,
  Boxes,
  Lock,
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
};

type Product = {
  id: number;
  title: string;
  category: string;
  price: number;
};

function ChatContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const conversationId = searchParams.get("conversation");
  const productId = searchParams.get("product") || searchParams.get("productId");
  const sellerId = searchParams.get("seller") || searchParams.get("sellerId");

  const [userId, setUserId] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    initChat();
  }, [conversationId, productId, sellerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time message subscription / polling
  useEffect(() => {
    if (!conversation) return;
    const interval = setInterval(() => {
      loadMessages(conversation.id, true);
    }, 3000);
    return () => clearInterval(interval);
  }, [conversation]);

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
        .single();

      if (convErr) {
        setError(convErr.message);
        setLoading(false);
        return;
      }
      activeConv = data as Conversation;
    } else if (productId && sellerId) {
      const pId = Number(productId);
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
          setError(createErr.message);
          setLoading(false);
          return;
        }
        activeConv = newConv as Conversation;
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
      .single();

    if (prodData) setProduct(prodData as Product);

    await loadMessages(activeConv.id, false);
    setLoading(false);
  }

  async function loadMessages(cId: number, quiet = false) {
    const { data, error: msgErr } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", cId)
      .order("created_at", { ascending: true });

    if (!msgErr && data) {
      setMessages(data as Message[]);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !conversation || sending) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    const { error: sendErr } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: userId,
      message: content,
    });

    if (sendErr) {
      setError(sendErr.message);
    } else {
      await loadMessages(conversation.id, true);
    }
    setSending(false);
  }

  return (
    <div className="relative mx-auto max-w-4xl px-4 pt-28 sm:px-6">
      {/* Top Chat Bar */}
      <div className="flex items-center justify-between rounded-3xl border border-emerald-500/20 bg-[#061e16]/90 p-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/chat/inbox"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                {product?.category || "Material"}
              </span>
              <h2 className="font-bold text-white text-sm sm:text-base">
                {product?.title || "Material Discussion"}
              </h2>
            </div>
            {product?.price && (
              <p className="text-xs text-emerald-400 font-semibold">
                Listed Price: ₹{product.price.toLocaleString("en-IN")}
              </p>
            )}
          </div>
        </div>

        {product?.id && (
          <Link
            href={`/product/${product.id}`}
            className="hidden rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 sm:block"
          >
            View Product
          </Link>
        )}
      </div>

      {/* Fraud & Safe Exchange Alert */}
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-[#03140e]/60 px-4 py-2 text-[11px] text-white/50">
        <Lock className="h-3.5 w-3.5 text-emerald-400" />
        <span>For your security, always complete handovers through the verified OTP Deal Room.</span>
      </div>

      {/* Messages Scroll Box */}
      <div className="mt-4 flex h-[480px] flex-col justify-between rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-5 shadow-2xl backdrop-blur-2xl">
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-xs text-white/40">
              Start the discussion! Inquire about volume, pickup logistics or price negotiation.
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
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="mt-4 flex items-center gap-2 pt-2 border-t border-white/10">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
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