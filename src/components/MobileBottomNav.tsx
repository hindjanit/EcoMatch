"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, Sparkles, Handshake, User } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const tabs = [
    { label: "Home", href: "/", icon: Home },
    { label: "Explore", href: "/marketplace", icon: Layers },
    { label: "AI Match", href: "/ai-match", icon: Sparkles },
    { label: "Deals", href: "/deals", icon: Handshake },
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
                className={`flex h-7 w-7 items-center justify-center rounded-xl transition ${
                  isActive ? "bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : ""
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[10px]">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
