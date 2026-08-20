"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useSearchParams,
  useRouter,
} from "next/navigation";

import { createClient } from "@/lib/supabase/client";

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

export default function ChatPage() {
  const supabase = createClient();
  const router = useRouter();

  const searchParams = useSearchParams();

  const conversationId =
    searchParams.get("conversation");

  const productId =
    searchParams.get("product");

  const sellerId =
    searchParams.get("seller");

  const [userId, setUserId] =
    useState("");

  const [
    conversation,
    setConversation,
  ] =
    useState<Conversation | null>(
      null
    );

  const [product, setProduct] =
    useState<Product | null>(null);

  const [
    messages,
    setMessages,
  ] =
    useState<Message[]>([]);

  const [
    newMessage,
    setNewMessage,
  ] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    initializeChat();
  }, [
    conversationId,
    productId,
    sellerId,
  ]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  async function initializeChat() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);

    // =====================================
    // OPEN USING CONVERSATION ID
    // =====================================

    if (conversationId) {
      const id =
        Number(conversationId);

      if (Number.isNaN(id)) {
        setError(
          "Invalid conversation ID."
        );

        setLoading(false);
        return;
      }

      const {
        data,
        error: conversationError,
      } =
        await supabase
          .from("conversations")
          .select("*")
          .eq("id", id)
          .single();

      if (
        conversationError ||
        !data
      ) {
        setError(
          conversationError?.message ||
            "Conversation not found."
        );

        setLoading(false);
        return;
      }

      if (
        data.buyer_id !==
          user.id &&
        data.seller_id !== user.id
      ) {
        setError(
          "You are not a participant in this conversation."
        );

        setLoading(false);
        return;
      }

      setConversation(data);

      await Promise.all([
        loadMessages(data.id),
        loadProduct(
          data.product_id
        ),
      ]);

      setLoading(false);
      return;
    }

    // =====================================
    // OPEN FROM PRODUCT PAGE
    // =====================================

    if (productId && sellerId) {
      if (user.id === sellerId) {
        setError(
          "You cannot chat with yourself."
        );

        setLoading(false);
        return;
      }

      const numericProductId =
        Number(productId);

      if (
        Number.isNaN(
          numericProductId
        )
      ) {
        setError(
          "Invalid product ID."
        );

        setLoading(false);
        return;
      }

      const {
        data:
          existingConversation,
        error: findError,
      } =
        await supabase
          .from("conversations")
          .select("*")
          .eq(
            "product_id",
            numericProductId
          )
          .eq(
            "buyer_id",
            user.id
          )
          .eq(
            "seller_id",
            sellerId
          )
          .maybeSingle();

      if (findError) {
        setError(
          findError.message
        );

        setLoading(false);
        return;
      }

      let currentConversation =
        existingConversation;

      // Create only if not found
      if (
        !currentConversation
      ) {
        const {
          data:
            newConversation,
          error:
            createError,
        } =
          await supabase
            .from(
              "conversations"
            )
            .insert({
              product_id:
                numericProductId,

              buyer_id:
                user.id,

              seller_id:
                sellerId,
            })
            .select("*")
            .single();

        if (
          createError ||
          !newConversation
        ) {
          setError(
            createError?.message ||
              "Could not create conversation."
          );

          setLoading(false);
          return;
        }

        currentConversation =
          newConversation;
      }

      setConversation(
        currentConversation
      );

      await Promise.all([
        loadMessages(
          currentConversation.id
        ),

        loadProduct(
          currentConversation.product_id
        ),
      ]);

      router.replace(
        `/chat?conversation=${currentConversation.id}`
      );

      setLoading(false);
      return;
    }

    setError(
      "Invalid chat details."
    );

    setLoading(false);
  }

  async function loadProduct(
    currentProductId: number
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from("products")
        .select(
          "id, title, category, price"
        )
        .eq(
          "id",
          currentProductId
        )
        .maybeSingle();

    if (error) {
      console.error(
        "Product error:",
        error
      );

      return;
    }

    setProduct(data);
  }

  async function loadMessages(
    currentConversationId: number
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from("messages")
        .select("*")
        .eq(
          "conversation_id",
          currentConversationId
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

    if (error) {
      setError(error.message);
      return;
    }

    setMessages(
      (data || []) as Message[]
    );
  }

  async function sendMessage() {
    const text =
      newMessage.trim();

    if (
      !text ||
      !conversation ||
      !userId ||
      sending
    ) {
      return;
    }

    setSending(true);

    const {
      data,
      error,
    } =
      await supabase
        .from("messages")
        .insert({
          conversation_id:
            conversation.id,

          sender_id:
            userId,

          message: text,
        })
        .select("*")
        .single();

    if (error) {
      setError(
        error.message
      );

      setSending(false);
      return;
    }

    if (data) {
      setMessages(
        (current) => {

          if (
            current.some(
              (message) =>
                message.id ===
                data.id
            )
          ) {
            return current;
          }

          return [
            ...current,
            data,
          ];
        }
      );
    }

    setNewMessage("");
    setSending(false);
  }

  // =====================================
  // REALTIME
  // =====================================

  useEffect(() => {
    if (!conversation) {
      return;
    }

    const channel =
      supabase
        .channel(
          `chat-${conversation.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",

            schema:
              "public",

            table:
              "messages",

            filter:
              `conversation_id=eq.${conversation.id}`,
          },

          (payload) => {

            const incomingMessage =
              payload.new as Message;

            setMessages(
              (current) => {

                if (
                  current.some(
                    (message) =>
                      message.id ===
                      incomingMessage.id
                  )
                ) {
                  return current;
                }

                return [
                  ...current,
                  incomingMessage,
                ];
              }
            );
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [conversation]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7faf9]">

        <div className="text-center">

          <div className="text-5xl">
            💬
          </div>

          <p className="mt-4 font-semibold text-[#187052]">
            Opening chat...
          </p>

        </div>

      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7faf9] px-6">

        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">

          <div className="text-4xl">
            ⚠️
          </div>

          <h1 className="mt-4 text-xl font-bold text-[#163038]">
            Chat unavailable
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>

          <button
            onClick={() =>
              router.back()
            }
            className="mt-6 rounded-xl bg-[#187052] px-5 py-3 font-semibold text-white"
          >
            Go Back
          </button>

        </div>

      </main>
    );
  }

  const isBuyer =
    conversation?.buyer_id ===
    userId;

  return (
    <main className="min-h-screen bg-[#f7faf9]">

      {/* HEADER */}
      <header className="border-b border-gray-200 bg-white">

        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">

          <button
            onClick={() =>
              router.push(
                "/marketplace"
              )
            }
            className="text-2xl font-bold text-[#187052]"
          >
            EcoMatch
          </button>

          <button
            onClick={() =>
              router.push(
                "/chat/inbox"
              )
            }
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            ← Messages
          </button>

        </div>

      </header>

      <section className="mx-auto max-w-4xl px-5 py-8">

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          {/* CHAT HEADER */}
          <div className="border-b border-gray-200 bg-[#eef9f4] p-5">

            <div className="flex items-center justify-between gap-4">

              <div>

                <div className="flex items-center gap-2">

                  <span className="text-2xl">
                    {isBuyer
                      ? "🏪"
                      : "🛒"}
                  </span>

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wide text-[#187052]">
                      {isBuyer
                        ? "Chat with Seller"
                        : "Buyer Inquiry"}
                    </p>

                    <h1 className="mt-1 text-xl font-bold text-[#163038]">
                      {product?.title ||
                        "Product Conversation"}
                    </h1>

                  </div>

                </div>

                {product && (
                  <p className="mt-2 text-sm text-gray-600">
                    {product.category}
                    {" • "}
                    ₹
                    {product.price.toLocaleString(
                      "en-IN"
                    )}
                  </p>
                )}

              </div>

              {product && (
                <button
                  onClick={() =>
                    router.push(
                      `/product/${product.id}`
                    )
                  }
                  className="hidden rounded-lg border border-[#b9ddce] bg-white px-4 py-2 text-xs font-semibold text-[#187052] hover:bg-[#f7faf9] sm:block"
                >
                  View Product
                </button>
              )}

            </div>

          </div>

          {/* MESSAGES */}
          <div className="min-h-[450px] max-h-[570px] overflow-y-auto bg-[#f8faf9] p-5">

            {messages.length ===
              0 && (

              <div className="flex min-h-[400px] items-center justify-center text-center">

                <div>

                  <div className="text-6xl">
                    💬
                  </div>

                  <p className="mt-4 font-bold text-[#163038]">
                    Start the conversation
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    Discuss price,
                    quantity,
                    availability and
                    specifications.
                  </p>

                </div>

              </div>
            )}

            <div className="space-y-3">

              {messages.map(
                (message) => {

                  const isMine =
                    message.sender_id ===
                    userId;

                  return (
                    <div
                      key={
                        message.id
                      }
                      className={`flex ${
                        isMine
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >

                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                          isMine
                            ? "rounded-br-md bg-[#187052] text-white"
                            : "rounded-bl-md border border-gray-200 bg-white text-[#163038]"
                        }`}
                      >

                        <p className="whitespace-pre-wrap break-words text-sm leading-6">
                          {
                            message.message
                          }
                        </p>

                        <p
                          className={`mt-1 text-right text-[10px] ${
                            isMine
                              ? "text-white/70"
                              : "text-gray-400"
                          }`}
                        >
                          {new Date(
                            message.created_at
                          ).toLocaleTimeString(
                            "en-IN",
                            {
                              hour:
                                "2-digit",
                              minute:
                                "2-digit",
                            }
                          )}
                        </p>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

            <div
              ref={
                messagesEndRef
              }
            />

          </div>

          {/* INPUT */}
          <div className="border-t border-gray-200 bg-white p-4">

            <div className="flex items-end gap-3">

              <textarea
                value={
                  newMessage
                }
                onChange={(e) =>
                  setNewMessage(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {

                  if (
                    e.key ===
                      "Enter" &&
                    !e.shiftKey
                  ) {
                    e.preventDefault();

                    sendMessage();
                  }
                }}
                placeholder="Type your message..."
                rows={1}
                className="max-h-32 min-h-[48px] flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm text-[#163038] outline-none placeholder:text-gray-500 focus:border-[#187052]"
              />

              <button
                onClick={
                  sendMessage
                }
                disabled={
                  sending ||
                  !newMessage.trim()
                }
                className="h-12 rounded-xl bg-[#187052] px-6 font-semibold text-white hover:bg-[#125c43] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending
                  ? "Sending..."
                  : "Send"}
              </button>

            </div>

            <p className="mt-2 text-xs text-gray-400">
              Press Enter to send • Shift +
              Enter for a new line
            </p>

          </div>

        </div>

      </section>

    </main>
  );
}