"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

  const [conversations, setConversations] = useState<
    InboxConversation[]
  >([]);

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

    // Buyer + Seller conversations
    const {
      data: conversationData,
      error: conversationError,
    } = await supabase
      .from("conversations")
      .select("*")
      .or(
        `buyer_id.eq.${user.id},seller_id.eq.${user.id}`
      )
      .order("created_at", {
        ascending: false,
      });

    if (conversationError) {
      console.error(
        "Conversation error:",
        conversationError
      );

      setError(conversationError.message);
      setLoading(false);
      return;
    }

    const conversationList =
      (conversationData || []) as Conversation[];

    if (conversationList.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // ---------------------------------
    // FETCH PRODUCTS
    // ---------------------------------

    const productIds = [
      ...new Set(
        conversationList.map(
          (conversation) => conversation.product_id
        )
      ),
    ];

    const {
      data: productData,
      error: productError,
    } = await supabase
      .from("products")
      .select("id, title, category, price")
      .in("id", productIds);

    if (productError) {
      console.error(
        "Product loading error:",
        productError
      );
    }

    const productMap: Record<number, Product> = {};

    ((productData || []) as Product[]).forEach(
      (product) => {
        productMap[product.id] = product;
      }
    );

    // ---------------------------------
    // FETCH MESSAGES
    // ---------------------------------

    const conversationIds = conversationList.map(
      (conversation) => conversation.id
    );

    const {
      data: messageData,
      error: messageError,
    } = await supabase
      .from("messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", {
        ascending: false,
      });

    if (messageError) {
      console.error(
        "Messages loading error:",
        messageError
      );
    }

    const lastMessageMap: Record<number, Message> = {};

    ((messageData || []) as Message[]).forEach(
      (message) => {
        // Since query is descending,
        // first message = latest message
        if (!lastMessageMap[message.conversation_id]) {
          lastMessageMap[message.conversation_id] =
            message;
        }
      }
    );

    // ---------------------------------
    // COMBINE DATA
    // ---------------------------------

    const finalConversations: InboxConversation[] =
      conversationList.map((conversation) => ({
        ...conversation,

        product:
          productMap[conversation.product_id],

        lastMessage:
          lastMessageMap[conversation.id],
      }));

    // Sort by latest message
    finalConversations.sort((a, b) => {
      const aTime = new Date(
        a.lastMessage?.created_at || a.created_at
      ).getTime();

      const bTime = new Date(
        b.lastMessage?.created_at || b.created_at
      ).getTime();

      return bTime - aTime;
    });

    setConversations(finalConversations);
    setLoading(false);
  }

  function openConversation(
    conversationId: number
  ) {
    router.push(
      `/chat?conversation=${conversationId}`
    );
  }

  function formatTime(date: string) {
    const messageDate = new Date(date);

    const today = new Date();

    const sameDay =
      messageDate.toDateString() ===
      today.toDateString();

    if (sameDay) {
      return messageDate.toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    }

    return messageDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
      }
    );
  }

  return (
    <main className="min-h-screen bg-[#f7faf9]">

      {/* HEADER */}
      <header className="border-b border-gray-200 bg-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

          <button
            onClick={() =>
              router.push("/marketplace")
            }
            className="text-2xl font-bold text-[#187052]"
          >
            EcoMatch
          </button>

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                router.push("/seller/dashboard")
              }
              className="hidden rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:block"
            >
              Seller Dashboard
            </button>

            <button
              onClick={() =>
                router.push("/marketplace")
              }
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Marketplace
            </button>

          </div>

        </div>

      </header>

      {/* MAIN */}
      <section className="mx-auto max-w-5xl px-6 py-10">

        <div className="mb-8">

          <p className="text-sm font-bold tracking-wide text-[#187052]">
            ECOMATCH MESSAGES
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#163038]">
            Conversations
          </h1>

          <p className="mt-2 text-gray-600">
            Keep track of your buyer and seller
            conversations.
          </p>

        </div>

        {/* LOADING */}
        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">

            <div className="text-5xl">
              💬
            </div>

            <p className="mt-4 font-semibold text-[#163038]">
              Loading conversations...
            </p>

          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">

            <h2 className="font-bold text-red-700">
              Unable to load messages
            </h2>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>

            <button
              onClick={loadInbox}
              className="mt-4 rounded-lg bg-[#187052] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#125c43]"
            >
              Try Again
            </button>

          </div>
        )}

        {/* EMPTY */}
        {!loading &&
          !error &&
          conversations.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">

              <div className="text-6xl">
                💬
              </div>

              <h2 className="mt-5 text-xl font-bold text-[#163038]">
                No conversations yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                Conversations will appear here when
                you contact a seller or a buyer contacts
                you.
              </p>

              <button
                onClick={() =>
                  router.push("/marketplace")
                }
                className="mt-6 rounded-xl bg-[#187052] px-6 py-3 font-semibold text-white hover:bg-[#125c43]"
              >
                Browse Marketplace
              </button>

            </div>
          )}

        {/* CONVERSATIONS */}
        {!loading &&
          !error &&
          conversations.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

              {conversations.map(
                (conversation, index) => {

                  const isBuyer =
                    conversation.buyer_id ===
                    userId;

                  const lastMessage =
                    conversation.lastMessage;

                  const sentByMe =
                    lastMessage?.sender_id ===
                    userId;

                  return (
                    <button
                      key={conversation.id}
                      onClick={() =>
                        openConversation(
                          conversation.id
                        )
                      }
                      className={`w-full p-5 text-left transition hover:bg-[#f7faf9] ${
                        index !==
                        conversations.length - 1
                          ? "border-b border-gray-100"
                          : ""
                      }`}
                    >

                      <div className="flex items-start gap-4">

                        {/* Avatar */}
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e1f4ed] text-xl">
                          {isBuyer ? "🏪" : "🛒"}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">

                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0">

                              <div className="flex flex-wrap items-center gap-2">

                                <h2 className="truncate font-bold text-[#163038]">
                                  {conversation.product
                                    ?.title ||
                                    `Product #${conversation.product_id}`}
                                </h2>

                                <span className="rounded-full bg-[#eef9f4] px-2 py-0.5 text-[10px] font-bold text-[#187052]">
                                  {isBuyer
                                    ? "SELLER"
                                    : "BUYER"}
                                </span>

                              </div>

                              {conversation.product && (
                                <p className="mt-1 text-xs text-gray-500">
                                  {
                                    conversation
                                      .product.category
                                  }
                                  {" • "}
                                  ₹
                                  {conversation.product.price.toLocaleString(
                                    "en-IN"
                                  )}
                                </p>
                              )}

                            </div>

                            <p className="shrink-0 text-xs text-gray-400">
                              {formatTime(
                                lastMessage
                                  ?.created_at ||
                                  conversation.created_at
                              )}
                            </p>

                          </div>

                          {/* Last Message */}
                          <div className="mt-3">

                            {lastMessage ? (
                              <p className="truncate text-sm text-gray-600">

                                {sentByMe && (
                                  <span className="font-semibold text-[#187052]">
                                    You:{" "}
                                  </span>
                                )}

                                {lastMessage.message}

                              </p>
                            ) : (
                              <p className="text-sm italic text-gray-400">
                                No messages yet
                              </p>
                            )}

                          </div>

                        </div>

                        <div className="self-center text-gray-400">
                          ›
                        </div>

                      </div>

                    </button>
                  );
                }
              )}

            </div>
          )}

      </section>

    </main>
  );
}