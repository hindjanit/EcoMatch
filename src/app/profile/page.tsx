"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import {
  User,
  ShieldCheck,
  ShieldAlert,
  Boxes,
  Handshake,
  TrendingUp,
  PlusCircle,
  Mail,
  Phone,
  MapPin,
  Award,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  verification_status: string | null;
  verification_method?: string | null;
  verified_at?: string | null;
  trust_score?: number | null;
  location_name?: string | null;
};

type Product = {
  id: number | string;
  title: string;
  price: number;
  status: string;
  created_at: string;
};

type Deal = {
  id: string;
  status: string;
  buyer_id: string;
  seller_id: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
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

    setEmail(user.email || "");
    setEmailVerified(Boolean(user.email_confirmed_at));

    const [profileResult, productResult, dealResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("products")
        .select("id,title,price,status,created_at")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("deal_requests")
        .select("id,status,buyer_id,seller_id")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
    ]);

    if (profileResult.error) setError(profileResult.error.message);
    setProfile((profileResult.data || null) as Profile | null);
    setProducts((productResult.data || []) as Product[]);
    setDeals((dealResult.data || []) as Deal[]);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="eco-page min-h-screen text-white">
        <Navbar />
        <div className="mx-auto max-w-5xl px-6 pt-36 text-center">
          <div className="shimmer-box mx-auto h-12 w-64 rounded-2xl" />
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="shimmer-box h-64 rounded-3xl" />
            <div className="shimmer-box h-64 rounded-3xl" />
          </div>
        </div>
      </main>
    );
  }

  const verified = profile?.verification_status === "verified";
  const activeListings = products.filter((p) => ["pending", "approved"].includes(p.status)).length;
  const soldListings = products.filter((p) => p.status === "sold").length;
  const completedDeals = deals.filter((d) => d.status === "completed").length;
  const pendingDeals = deals.filter((d) => !["completed", "rejected", "cancelled"].includes(d.status)).length;

  return (
    <main className="eco-page min-h-screen text-white pb-24">
      <Navbar />

      <div className="eco-orb eco-orb-one" />
      <div className="eco-orb eco-orb-two" />

      <div className="relative mx-auto max-w-6xl px-4 pt-28 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/15 p-4 text-xs font-bold text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-12">
          {/* User Profile Identity Card */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-[#072a1d] via-[#051e16] to-[#03130d] p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/20 text-2xl font-black text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    {(profile?.full_name || email || "E").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      MEMBER PROFILE
                    </span>
                    <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                      {profile?.full_name || "EcoMatch Member"}
                    </h1>
                    <p className="mt-0.5 text-xs text-white/50 capitalize">{profile?.role || "Trader"} Account</p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1 text-xs font-bold ${
                    verified
                      ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : "border-amber-400/40 bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {verified ? (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> UIDAI Verified
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-400" /> KYC Unverified
                    </>
                  )}
                </span>
              </div>

              {/* Info Matrix */}
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5">
                  <div className="flex items-center gap-1.5 text-white/50">
                    <Mail className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Email Address</span>
                  </div>
                  <p className="mt-1 truncate font-semibold text-white">{email}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5">
                  <div className="flex items-center gap-1.5 text-white/50">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Phone Number</span>
                  </div>
                  <p className="mt-1 truncate font-semibold text-white">{profile?.phone || "Not added"}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5">
                  <div className="flex items-center gap-1.5 text-white/50">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Location</span>
                  </div>
                  <p className="mt-1 truncate font-semibold text-white">{profile?.location_name || "GPS not configured"}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5">
                  <div className="flex items-center gap-1.5 text-white/50">
                    <Award className="h-3.5 w-3.5 text-emerald-400" />
                    <span>KYC Protocol</span>
                  </div>
                  <p className="mt-1 truncate font-semibold text-emerald-300">{profile?.verification_method || "Pending verification"}</p>
                </div>
              </div>

              {!verified && (
                <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4">
                  <h4 className="text-xs font-bold text-amber-300">Unlock Full Trading Limits</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Unverified accounts have a ₹1,000 listing cap. Complete quick paperless UIDAI verification to lift restrictions.
                  </p>
                  <Link
                    href="/verify-identity"
                    className="mt-3 inline-flex items-center gap-1 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-[#03140e] hover:bg-amber-300"
                  >
                    Verify Identity Now <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Trust Score & Bento Stats */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-6 shadow-2xl backdrop-blur-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                TRUST PASSPORT
              </span>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <span className="text-4xl font-black text-emerald-300">
                    {profile?.trust_score || 70}
                  </span>
                  <span className="text-sm font-semibold text-white/40">/100</span>
                  <p className="mt-1 text-xs text-white/60">Calculated from verified identity & clean deals</p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-emerald-400/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <ShieldCheck className="h-8 w-8" />
                </div>
              </div>

              {/* Bento Stats Grid */}
              <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5">
                  <p className="text-white/40">Active Listings</p>
                  <p className="mt-1 text-xl font-bold text-white">{activeListings}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5">
                  <p className="text-white/40">Sold Items</p>
                  <p className="mt-1 text-xl font-bold text-white">{soldListings}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5">
                  <p className="text-white/40">Active Deals</p>
                  <p className="mt-1 text-xl font-bold text-emerald-400">{pendingDeals}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5">
                  <p className="text-white/40">Completed Deals</p>
                  <p className="mt-1 text-xl font-bold text-emerald-400">{completedDeals}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* My Material Listings Box */}
        <div className="mt-8 rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-6 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                INVENTORY MANAGEMENT
              </span>
              <h2 className="mt-1 text-xl font-black text-white">My Material Listings</h2>
            </div>
            <Link
              href="/seller/add-product"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-[#03140e] hover:bg-emerald-300"
            >
              <PlusCircle className="h-4 w-4" /> Add Material
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/5 bg-black/30 p-8 text-center text-xs text-white/40">
              No surplus materials listed yet. Post your first listing to start exchanging.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 transition-all hover:border-emerald-400/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-bold text-white">{product.title}</h3>
                    <p className="mt-0.5 text-xs text-white/50">
                      ₹{Number(product.price).toLocaleString("en-IN")} · Listed {new Date(product.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase ${
                        product.status === "approved"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {product.status}
                    </span>
                    <Link
                      href={`/product/${product.id}`}
                      className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </main>
  );
}
