"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import {
  MessageSquare,
  ArrowRight,
  Boxes,
  User,
  Clock,
  ChevronRight,
} from "lucide-react";

type Conversation = {
  id: number;
  product_id: number;
  buyer_id: string;
  seller_id: string;
  created_at: string;
};

type Product = {
  id: number;
  title: string;
  category: string;
  price: number;
};

type Message = {
  id: number;
  conversation_id: number;
  sender_id: string;
  message: string;
  created_at: string;
};

type InboxConversation = Conversation & {
  product?: Product;
  lastMessage?: Message;
};

export default function ChatInboxPage() {
  const supabase = createClient();
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadInbox();
  }, []);

  async function loadInbox() {
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

    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (conversationError) {
      setError(conversationError.message);
      setLoading(false);
      return;
    }

    const conversationList = (conversationData || []) as Conversation[];
    if (conversationList.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const productIds = [...new Set(conversationList.map((c) => c.product_id))];
    const { data: productData } = await supabase
      .from("products")
      .select("id, title, category, price")
      .in("id", productIds);

    const productMap: Record<number, Product> = {};
    (productData || []).forEach((p) => {
      productMap[p.id] = p as Product;
    });

    const conversationIds = conversationList.map((c) => c.id);
    const { data: messageData } = await supabase
      .from("messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    const messageMap: Record<number, Message> = {};
    (messageData || []).forEach((m) => {
      if (!messageMap[m.conversation_id]) {
        messageMap[m.conversation_id] = m as Message;
      }
    });

    const enriched: InboxConversation[] = conversationList.map((conv) => ({
      ...conv,
      product: productMap[conv.product_id],
      lastMessage: messageMap[conv.id],
    }));

    setConversations(enriched);
    setLoading(false);
  }

  return (
    <main className="eco-page min-h-screen text-white pb-24">
      <Navbar />

      <div className="eco-orb eco-orb-one" />
      <div className="eco-orb eco-orb-two" />

      <div className="relative mx-auto max-w-5xl px-4 pt-28 sm:px-6 lg:px-8">
        <div>
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
            SECURE MESSAGING
          </span>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Chat <span className="text-emerald-400">Inbox</span>
          </h1>
          <p className="mt-1 text-xs text-white/60">
            Direct real-time negotiations and material inquiries with verified members.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/15 p-4 text-xs font-bold text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 space-y-3">
            <div className="shimmer-box h-20 w-full rounded-2xl" />
            <div className="shimmer-box h-20 w-full rounded-2xl" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-emerald-500/20 bg-[#061d15]/60 p-12 text-center shadow-2xl backdrop-blur-xl">
            <MessageSquare className="mx-auto h-12 w-12 text-emerald-400/40" />
            <h3 className="mt-4 text-xl font-bold">No Conversations Yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-xs text-white/50">
              When you inquire about a material or a buyer contacts you, your messages will appear here.
            </p>
            <Link
              href="/marketplace"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-black text-[#03140e] hover:bg-emerald-300"
            >
              Browse Materials <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {conversations.map((conv) => {
              const isMe = conv.lastMessage?.sender_id === userId;

              return (
                <Link
                  key={conv.id}
                  href={`/chat?conversation=${conv.id}`}
                  className="flex items-center justify-between rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-5 shadow-xl backdrop-blur-xl transition hover:border-emerald-400/50 hover:bg-[#07251c]/90"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-400 font-bold">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                          {conv.product?.category || "Material"}
                        </span>
                        <h4 className="font-bold text-white">
                          {conv.product?.title || `Product #${conv.product_id}`}
                        </h4>
                      </div>
                      <p className="mt-1 text-xs text-white/60 line-clamp-1">
                        {isMe && <strong className="text-emerald-400 font-normal">You: </strong>}
                        {conv.lastMessage?.message || "Conversation started..."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-white/40">
                    {conv.lastMessage && (
                      <span className="text-[11px]">
                        {new Date(conv.lastMessage.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-emerald-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
      <MobileBottomNav />
    </main>
  );
}