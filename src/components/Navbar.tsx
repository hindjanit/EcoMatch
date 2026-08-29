"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  Layers,
  ShieldCheck,
  Cpu,
  User,
  LogOut,
  Menu,
  X,
  MessageSquare,
  Handshake,
  PlusCircle,
  BarChart3,
  Flame,
} from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageToast, setMessageToast] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (userError || !user) {
          setIsLoggedIn(false);
          setUserId("");
          setUserRole(null);
          setUserName(null);
          setIsVerified(false);
          setUnreadCount(0);
          setAuthLoading(false);
          return;
        }

        setIsLoggedIn(true);
        setUserId(user.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name, verification_status")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        setUserRole(profile?.role || null);
        setUserName(profile?.full_name || user.email?.split("@")[0] || "User");
        setIsVerified(profile?.verification_status === "verified");
        const { data: unreadTotal } = await supabase.rpc("get_unread_message_count");
        if (mounted && unreadTotal !== null) {
          setUnreadCount(Number(unreadTotal || 0));
        }
        setAuthLoading(false);
      } catch (error) {
        console.error("Auth check error:", error);
        if (mounted) {
          setIsLoggedIn(false);
          setUserRole(null);
          setAuthLoading(false);
        }
      }
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => checkUser());

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;

    async function refreshUnreadCount() {
      const { data } = await supabase.rpc("get_unread_message_count");
      if (data !== null) setUnreadCount(Number(data || 0));
    }

    refreshUnreadCount();
  }, [pathname, supabase, userId]);

  useEffect(() => {
    if (!userId) return;

    async function refreshUnreadCount() {
      const { data } = await supabase.rpc("get_unread_message_count");
      if (data !== null) setUnreadCount(Number(data || 0));
    }

    const channel = supabase
      .channel(`message-alerts-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const incoming = payload.new as {
            conversation_id: number;
            sender_id: string;
            message: string;
          };

          if (incoming.sender_id === userId) return;

          setUnreadCount((count) => count + 1);
          setMessageToast(incoming.message);
          window.setTimeout(() => setMessageToast(null), 5000);

          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("New EcoMatch message", {
              body: incoming.message,
              icon: "/favicon.ico",
              tag: `ecomatch-conversation-${incoming.conversation_id}`,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          void refreshUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  async function handleLogout() {
    setAuthLoading(true);
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserId("");
    setUserRole(null);
    setUnreadCount(0);
    setAuthLoading(false);
    setUserDropdownOpen(false);
    router.push("/login");
    router.refresh();
  }

  function handleDashboardRedirect() {
    if (userRole === "seller") router.push("/seller/dashboard");
    else if (userRole === "buyer") router.push("/buyer/dashboard");
    else router.push("/marketplace");
  }

  const navLinks = [
    { label: "Marketplace", href: "/marketplace", icon: Layers },
    { label: "AI Classifier", href: "/ai-classify", icon: Cpu },
    { label: "AI Match", href: "/ai-match", icon: Sparkles },
    { label: "Ledger", href: "/ledger", icon: ShieldCheck },
  ];
  const isHome = pathname === "/";

  return (
    <nav className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/10 bg-[#080c14]/85 px-4 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl sm:px-6">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div className={`relative flex h-9 w-9 items-center justify-center rounded-xl border text-base font-bold transition group-hover:scale-105 ${isHome ? "border-[#b9ff66]/30 bg-[#b9ff66]/10 text-[#b9ff66] shadow-[0_0_15px_rgba(185,255,102,0.14)]" : "border-sky-400/30 bg-gradient-to-br from-sky-500/20 to-indigo-500/10 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]"}`}>
            ♻
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${isHome ? "bg-[#b9ff66]" : "bg-sky-400"}`}></span>
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isHome ? "bg-[#b9ff66]" : "bg-sky-500"}`}></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-white">
                Eco<span className={`bg-clip-text text-transparent ${isHome ? "bg-gradient-to-r from-[#b9ff66] to-emerald-300" : "bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400"}`}>Match</span>
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? "border border-white/15 bg-white/10 text-white shadow-[0_0_15px_rgba(56,189,248,0.15)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right Action Section */}
        <div className="flex items-center gap-2">
          {authLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-xl bg-white/10" />
          ) : isLoggedIn ? (
            <div className="flex items-center gap-2">
              {/* Quick Post button for Sellers */}
              {userRole === "seller" && (
                <Link
                  href="/seller/add-product"
                  className="hidden items-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-500/20 px-3.5 py-2 text-xs font-bold text-sky-300 shadow-sm transition hover:bg-sky-500/30 hover:scale-[1.02] sm:flex"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  List Material
                </Link>
              )}

              {/* Deals / Offers Shortcut */}
              <Link
                href="/deals"
                className="hidden rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 hover:text-white sm:flex"
                title="Active Deals"
              >
                <Handshake className="h-4 w-4" />
              </Link>

              {/* Chat Inbox */}
              <Link
                href="/chat/inbox"
                className="relative hidden rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 hover:text-white sm:flex"
                title={unreadCount > 0 ? `${unreadCount} unread messages` : "Messages"}
              >
                <MessageSquare className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#b9ff66] px-1 text-[9px] font-black text-[#10251b] ring-2 ring-[#080c14]">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* User Dropdown Trigger */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1.5 pr-3 text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 font-bold text-sky-300">
                    {userName?.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="max-w-[80px] truncate sm:max-w-[120px]">
                    {userName}
                  </span>
                  {isVerified && (
                    <span title="Verified Identity">
                      <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                    </span>
                  )}
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-[#080c14]/95 p-2 shadow-2xl shadow-black/80 backdrop-blur-2xl">
                    <div className="border-b border-white/10 px-3 py-2.5">
                      <p className="text-xs text-white/50">Signed in as</p>
                      <p className="truncate text-sm font-bold text-white">
                        {userName}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-300">
                          {userRole || "User"}
                        </span>
                        {isVerified ? (
                          <span className="flex items-center gap-0.5 text-[10px] text-sky-400">
                            <ShieldCheck className="h-3 w-3" /> Verified
                          </span>
                        ) : (
                          <Link
                            href="/verify-identity"
                            onClick={() => setUserDropdownOpen(false)}
                            className="text-[10px] text-amber-400 underline hover:text-amber-300"
                          >
                            Verify KYC
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleDashboardRedirect();
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/5 hover:text-sky-300"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Dashboard
                      </button>
                      <Link
                        href="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/5 hover:text-sky-300"
                      >
                        <User className="h-3.5 w-3.5" />
                        My Profile & Trust
                      </Link>
                      <Link
                        href="/chat/inbox"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/5 hover:text-sky-300"
                      >
                        <span className="flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Messages
                        </span>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-sky-300 px-1.5 py-0.5 text-[9px] font-black text-slate-950">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                      <Link
                        href="/offers"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/5 hover:text-sky-300"
                      >
                        <Handshake className="h-3.5 w-3.5" />
                        Offers & Negotiations
                      </Link>
                    </div>

                    <div className="border-t border-white/10 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/10"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className={`flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-black text-slate-950 transition hover:scale-[1.02] ${isHome ? "bg-[#b9ff66] shadow-[0_0_15px_rgba(185,255,102,0.22)] hover:bg-[#cbff8d]" : "bg-gradient-to-r from-sky-400 via-indigo-400 to-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:from-sky-300 hover:to-sky-400"}`}
              >
                <Flame className="h-3.5 w-3.5 fill-current" />
                Join Free
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10 md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mt-2 rounded-2xl border border-white/10 bg-[#080c14]/95 p-4 shadow-2xl backdrop-blur-2xl md:hidden">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5 hover:text-sky-300"
                >
                  <Icon className="h-4 w-4 text-sky-400" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {isLoggedIn && (
            <div className="mt-3 border-t border-white/10 pt-3 space-y-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleDashboardRedirect();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5 hover:text-sky-300"
              >
                <BarChart3 className="h-4 w-4 text-sky-400" />
                Dashboard
              </button>
              <Link
                href="/deals"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5 hover:text-sky-300"
              >
                <Handshake className="h-4 w-4 text-sky-400" />
                Deal Rooms
              </Link>
              <Link
                href="/chat/inbox"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5 hover:text-sky-300"
              >
                <MessageSquare className="h-4 w-4 text-sky-400" />
                Chat Messages
                {unreadCount > 0 && (
                  <span className="ml-auto rounded-full bg-sky-300 px-2 py-0.5 text-[10px] font-black text-slate-950">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5 hover:text-sky-300"
              >
                <User className="h-4 w-4 text-sky-400" />
                My Profile
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      )}

      {messageToast && (
        <Link
          href="/chat/inbox"
          onClick={() => setMessageToast(null)}
          className="fixed right-4 top-24 z-[60] flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 rounded-2xl border border-sky-300/25 bg-[#0b151f]/95 p-4 text-left shadow-2xl backdrop-blur-2xl"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-300 text-slate-950">
            <MessageSquare className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-black text-white">New EcoMatch message</span>
            <span className="mt-1 block truncate text-xs text-slate-400">{messageToast}</span>
          </span>
        </Link>
      )}
    </nav>
  );
}
