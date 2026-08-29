"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, Sparkles, Handshake, MessageCircle, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadMessageState() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      setIsLoggedIn(Boolean(user));

      if (user) {
        const { data } = await supabase.rpc("get_unread_message_count");
        if (active && data !== null) setUnreadCount(Number(data || 0));
      }
    }

    loadMessageState();
    return () => {
      active = false;
    };
  }, [pathname, supabase]);

  const tabs = [
    { label: "Home", href: "/", icon: Home },
    { label: "Explore", href: "/marketplace", icon: Layers },
    { label: "AI Match", href: "/ai-match", icon: Sparkles },
    isLoggedIn
      ? { label: "Messages", href: "/chat/inbox", icon: MessageCircle }
      : { label: "Deals", href: "/deals", icon: Handshake },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-2 sm:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around rounded-2xl border border-emerald-500/20 bg-[#051810]/90 py-2 shadow-2xl backdrop-blur-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-3 py-1 transition-all ${
                isActive
                  ? "text-emerald-300 font-bold scale-105"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              <div
                className={`relative flex h-7 w-7 items-center justify-center rounded-xl transition ${
                  isActive ? "bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : ""
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.href === "/chat/inbox" && unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-sky-300 px-1 text-[8px] font-black text-slate-950 ring-2 ring-[#051810]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px]">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
