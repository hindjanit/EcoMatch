"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import {
  ArrowRight,
  Bell,
  BellRing,
  Boxes,
  CheckCheck,
  ChevronRight,
  MessageCircle,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

type InboxConversation = {
  id: number;
  product_id: number;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  product_title: string | null;
  product_category: string | null;
  product_price: number | null;
  counterparty_id: string;
  counterparty_name: string;
  counterparty_verification_status: string | null;
  counterparty_avatar_url: string | null;
  counterparty_role: "Seller" | "Buyer";
  last_message_id: number | null;
  last_message: string | null;
  last_message_sender_id: string | null;
  last_message_created_at: string | null;
  unread_count: number;
};

type ConversationRow = {
  id: number;
  product_id: number;
  buyer_id: string;
  seller_id: string;
  created_at: string;
};

type ProductRow = {
  id: number;
  title: string;
  category: string;
  price: number;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  verification_status: string | null;
  avatar_url: string | null;
};

type MessageRow = {
  id: number;
  conversation_id: number;
  sender_id: string;
  message: string;
  created_at: string;
};

function formatConversationTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { day: "2-digit", month: "short" });
}

export default function ChatInboxPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission)
  );

  const loadFallbackInbox = useCallback(
    async (currentUserId: string) => {
      const { data: conversationData, error: conversationError } = await supabase
        .from("conversations")
        .select("*")
        .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false });

      if (conversationError) throw conversationError;

      const conversationList = (conversationData || []) as ConversationRow[];
      if (!conversationList.length) return [];

      const productIds = [...new Set(conversationList.map((conversation) => conversation.product_id))];
      const profileIds = [
        ...new Set(
          conversationList.map((conversation) =>
            conversation.buyer_id === currentUserId
              ? conversation.seller_id
              : conversation.buyer_id
          )
        ),
      ];
      const conversationIds = conversationList.map((conversation) => conversation.id);

      const [productsResult, profilesResult, messagesResult] = await Promise.all([
        supabase.from("products").select("id,title,category,price").in("id", productIds),
        supabase
          .from("profiles")
          .select("id,full_name,verification_status,avatar_url")
          .in("id", profileIds),
        supabase
          .from("messages")
          .select("id,conversation_id,sender_id,message,created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false }),
      ]);

      const productMap = new Map(
        ((productsResult.data || []) as ProductRow[]).map((product) => [product.id, product])
      );
      const profileMap = new Map(
        ((profilesResult.data || []) as ProfileRow[]).map((profile) => [profile.id, profile])
      );
      const latestMessageMap = new Map<number, MessageRow>();
      ((messagesResult.data || []) as MessageRow[]).forEach((message) => {
        if (!latestMessageMap.has(message.conversation_id)) {
          latestMessageMap.set(message.conversation_id, message);
        }
      });

      return conversationList
        .map((conversation): InboxConversation => {
          const isBuyer = conversation.buyer_id === currentUserId;
          const counterpartyId = isBuyer ? conversation.seller_id : conversation.buyer_id;
          const profile = profileMap.get(counterpartyId);
          const product = productMap.get(conversation.product_id);
          const latestMessage = latestMessageMap.get(conversation.id);

          return {
            ...conversation,
            product_title: product?.title || null,
            product_category: product?.category || null,
            product_price: product?.price || null,
            counterparty_id: counterpartyId,
            counterparty_name:
              profile?.full_name?.trim() || (isBuyer ? "EcoMatch seller" : "EcoMatch buyer"),
            counterparty_verification_status: profile?.verification_status || null,
            counterparty_avatar_url: profile?.avatar_url || null,
            counterparty_role: isBuyer ? "Seller" : "Buyer",
            last_message_id: latestMessage?.id || null,
            last_message: latestMessage?.message || null,
            last_message_sender_id: latestMessage?.sender_id || null,
            last_message_created_at: latestMessage?.created_at || null,
            unread_count: 0,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.last_message_created_at || b.created_at).getTime() -
            new Date(a.last_message_created_at || a.created_at).getTime()
        );
    },
    [supabase]
  );

  const loadInbox = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
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

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_my_conversation_inbox"
      );

      try {
        if (!rpcError && rpcData) {
          setConversations(
            (rpcData as InboxConversation[]).map((conversation) => ({
              ...conversation,
              unread_count: Number(conversation.unread_count || 0),
              product_price:
                conversation.product_price === null
                  ? null
                  : Number(conversation.product_price),
            }))
          );
        } else {
          setConversations(await loadFallbackInbox(user.id));
        }
      } catch (inboxError) {
        setError(inboxError instanceof Error ? inboxError.message : "Could not load messages.");
      } finally {
        setLoading(false);
      }
    },
    [loadFallbackInbox, router, supabase]
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadInbox();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadInbox]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`inbox-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          loadInbox(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          loadInbox(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadInbox, supabase, userId]);

  async function enableNotifications() {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  const filteredConversations = conversations.filter((conversation) => {
    const searchValue = query.trim().toLowerCase();
    if (!searchValue) return true;
    return [
      conversation.counterparty_name,
      conversation.product_title,
      conversation.product_category,
      conversation.last_message,
    ].some((value) => value?.toLowerCase().includes(searchValue));
  });

  const totalUnread = conversations.reduce(
    (total, conversation) => total + conversation.unread_count,
    0
  );

  return (
    <main className="eco-page min-h-screen pb-24 text-white">
      <Navbar />

      <div className="relative mx-auto max-w-5xl px-4 pt-28 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-300">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
              Private marketplace inbox
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
              Your messages
              {totalUnread > 0 && (
                <span className="ml-3 inline-flex translate-y-[-4px] rounded-full bg-sky-400 px-2 py-1 text-xs font-black text-slate-950">
                  {totalUnread} new
                </span>
              )}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Every conversation keeps the person, listing and deal context together.
            </p>
          </div>

          {notificationPermission !== "unsupported" && notificationPermission !== "granted" && (
            <button
              type="button"
              onClick={enableNotifications}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:border-sky-400/30 hover:bg-sky-400/10 sm:self-auto"
            >
              <Bell className="h-4 w-4 text-sky-300" />
              Enable desktop alerts
            </button>
          )}
        </div>

        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b111b]/80 px-4 py-3 backdrop-blur-xl">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a person, product or message"
            aria-label="Search conversations"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          />
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-5 space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="shimmer-box h-28 rounded-3xl" />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-[#0b111b]/75 p-10 text-center backdrop-blur-xl sm:p-14">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-black">
              {query ? "No matching conversations" : "Your inbox is ready"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              {query
                ? "Try a different person or product name."
                : "When you contact a seller—or a buyer contacts you—the conversation will appear here."}
            </p>
            {!query && (
              <Link href="/marketplace" className="mt-6 inline-flex items-center gap-2 rounded-full bg-sky-300 px-5 py-2.5 text-xs font-black text-slate-950">
                Browse marketplace <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {filteredConversations.map((conversation) => {
              const isUnread = conversation.unread_count > 0;
              const isMine = conversation.last_message_sender_id === userId;
              const initials = conversation.counterparty_name
                .split(" ")
                .filter(Boolean)
                .map((part) => part[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <Link
                  key={conversation.id}
                  href={`/chat?conversation=${conversation.id}`}
                  className={`group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.5rem] border p-4 transition sm:gap-4 sm:p-5 ${
                    isUnread
                      ? "border-sky-400/35 bg-sky-400/[0.08] shadow-[0_18px_50px_rgba(56,189,248,0.08)]"
                      : "border-white/10 bg-[#0b111b]/80 hover:border-white/20 hover:bg-[#101824]"
                  }`}
                >
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400/25 to-indigo-400/20 text-sm font-black text-sky-200 sm:h-14 sm:w-14">
                    {conversation.counterparty_avatar_url ? (
                      <Image
                        src={conversation.counterparty_avatar_url}
                        alt=""
                        fill
                        unoptimized
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      initials || <UserRound className="h-5 w-5" />
                    )}
                    {conversation.counterparty_verification_status === "verified" && (
                      <span className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-300 text-slate-950 ring-2 ring-[#0b111b]">
                        <ShieldCheck className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className={`truncate text-sm sm:text-base ${isUnread ? "font-black text-white" : "font-bold text-slate-100"}`}>
                        {conversation.counterparty_name}
                      </h2>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {conversation.counterparty_role}
                      </span>
                    </div>

                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs">
                      <Boxes className="h-3.5 w-3.5 shrink-0 text-sky-300" />
                      <span className="truncate font-semibold text-sky-200">
                        {conversation.product_title || `Product #${conversation.product_id}`}
                      </span>
                      {conversation.product_category && (
                        <span className="hidden truncate text-slate-600 sm:inline">
                          · {conversation.product_category}
                        </span>
                      )}
                    </div>

                    <p className={`mt-1.5 truncate text-xs sm:text-sm ${isUnread ? "font-semibold text-slate-200" : "text-slate-500"}`}>
                      {isMine && <span className="text-sky-300">You: </span>}
                      {conversation.last_message || "Conversation started"}
                    </p>
                  </div>

                  <div className="flex h-full flex-col items-end justify-between py-0.5">
                    <span className={`text-[10px] sm:text-xs ${isUnread ? "font-bold text-sky-200" : "text-slate-600"}`}>
                      {formatConversationTime(
                        conversation.last_message_created_at || conversation.created_at
                      )}
                    </span>
                    {isUnread ? (
                      <span className="flex min-w-5 items-center justify-center rounded-full bg-sky-300 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                        {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
                      </span>
                    ) : isMine && conversation.last_message ? (
                      <CheckCheck className="h-4 w-4 text-slate-600" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-sky-300" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {notificationPermission === "granted" && (
          <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
            <BellRing className="h-3.5 w-3.5 text-sky-300" /> Desktop message alerts are enabled.
          </p>
        )}
      </div>

      <Footer />
      <MobileBottomNav />
    </main>
  );
}
