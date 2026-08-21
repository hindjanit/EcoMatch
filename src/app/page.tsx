"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const categories = [
  "Metals",
  "Plastic",
  "Wood",
  "Electrical Materials",
  "Machinery & Equipment",
  "Construction Materials",
  "Packaging Materials",
  "Other",
];

export default function Home() {
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  // =====================================================
  // AUTH STATE
  // =====================================================

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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
          setUserRole(null);
          setAuthLoading(false);
          return;
        }

        setIsLoggedIn(true);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (profileError) {
          console.error("Profile fetch error:", profileError);
          setUserRole(null);
        } else {
          setUserRole(profile?.role || null);
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
    } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // =====================================================
  // DASHBOARD ROUTING
  // =====================================================

  function handleDashboard() {
    if (userRole === "seller") {
      router.push("/seller/dashboard");
      return;
    }

    if (userRole === "buyer") {
      router.push("/buyer/dashboard");
      return;
    }

    // Fallback in case profile role is missing
    router.push("/marketplace");
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  async function handleLogout() {
    try {
      setAuthLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        return;
      }

      setIsLoggedIn(false);
      setUserRole(null);

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAuthLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7faf9] text-[#163038]">
      {/* ================================================= */}
      {/* NAVBAR */}
      {/* ================================================= */}

      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 px-8 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-2xl font-bold text-[#187052]"
          >
            EcoMatch
          </button>

          <div className="hidden gap-7 text-sm font-semibold text-gray-600 md:flex">
            <button
              onClick={() => router.push("/marketplace")}
              className="transition hover:text-[#187052]"
            >
              Marketplace
            </button>

            <a
              href="#how-it-works"
              className="transition hover:text-[#187052]"
            >
              How It Works
            </a>

            <a
              href="#about"
              className="transition hover:text-[#187052]"
            >
              About
            </a>
          </div>

          {/* AUTH BUTTONS */}

          <div className="flex items-center gap-3">
            {authLoading ? (
              <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200" />
            ) : isLoggedIn ? (
              <>
                <button
                  onClick={handleDashboard}
                  className="rounded-lg bg-[#187052] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#125c43]"
                >
                  Dashboard
                </button>

                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="rounded-lg bg-[#187052] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#125c43]"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ================================================= */}
      {/* HERO SECTION */}
      {/* ================================================= */}

      <section className="px-8 py-24 text-center">
        <p className="mb-4 text-sm font-bold tracking-wider text-[#25a675]">
          INDUSTRIAL REUSE MARKETPLACE
        </p>

        <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
          Find the Right Material.
          <br />

          <span className="text-[#187052]">
            Give Surplus a Second Life.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
          EcoMatch connects organisations to exchange reusable and industrial
          materials using AI classification, smart matching, verified listings
          and transparent ownership records.
        </p>

        {/* Main Actions */}

        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <button
            onClick={() => router.push("/marketplace")}
            className="rounded-xl bg-[#187052] px-8 py-4 font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#125c43]"
          >
            🛒 I Want to Buy
          </button>

          <button
            onClick={() => {
              if (!isLoggedIn) {
                router.push("/login");
                return;
              }

              if (userRole === "seller") {
                router.push("/seller/dashboard");
              } else {
                router.push("/marketplace");
              }
            }}
            className="rounded-xl border-2 border-[#187052] bg-white px-8 py-4 font-semibold text-[#187052] transition hover:bg-[#eef9f4]"
          >
            📦 I Want to Sell
          </button>
        </div>

        {/* Trust Indicators */}

        <div className="mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-5 text-sm font-medium text-gray-600">
          <span>✓ Verified Listings</span>
          <span>✓ Direct Buyer–Seller Chat</span>
          <span>✓ AI Waste Classification</span>
          <span>✓ Blockchain Ownership Ledger</span>
          <span>✓ Free Marketplace</span>
        </div>
      </section>

      {/* ================================================= */}
      {/* CATEGORIES */}
      {/* ================================================= */}

      <section className="px-8 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold tracking-wide text-[#187052]">
              BROWSE MATERIALS
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Explore Materials
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-gray-600">
              Browse verified industrial materials across different categories.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => router.push("/marketplace")}
                className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:border-[#b9ddce] hover:shadow-md"
              >
                <div className="mb-3 text-3xl">
                  ♻️
                </div>

                <h3 className="font-bold text-[#163038]">
                  {category}
                </h3>

                <p className="mt-2 text-sm leading-5 text-gray-500">
                  Find reusable {category.toLowerCase()} materials
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* HOW IT WORKS */}
      {/* ================================================= */}

      <section
        id="how-it-works"
        className="border-y border-gray-200 bg-white px-8 py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-bold tracking-wide text-[#187052]">
              SIMPLE & TRANSPARENT
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              How EcoMatch Works
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* STEP 1 */}

            <div className="rounded-2xl border border-gray-200 p-7 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e1f4ed] text-xl font-bold text-[#187052]">
                1
              </div>

              <h3 className="mt-5 text-lg font-bold">
                List or Search
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Sellers list surplus materials while buyers search
                according to their requirements.
              </p>
            </div>

            {/* STEP 2 */}

            <div className="rounded-2xl border border-gray-200 p-7 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e1f4ed] text-xl font-bold text-[#187052]">
                2
              </div>

              <h3 className="mt-5 text-lg font-bold">
                Classify & Verify
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                AI classifies surplus material, while verified listings
                are prepared for transparent ownership tracking.
              </p>
            </div>

            {/* STEP 3 */}

            <div className="rounded-2xl border border-gray-200 p-7 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e1f4ed] text-xl font-bold text-[#187052]">
                3
              </div>

              <h3 className="mt-5 text-lg font-bold">
                Exchange Transparently
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Organisations connect directly and the ownership ledger
                provides a transparent, tamper-evident record trail.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* AI SECTION */}
      {/* ================================================= */}

      <section className="px-8 py-20">
        <div className="mx-auto max-w-6xl rounded-3xl bg-[#e1f4ed] px-8 py-14 text-center md:px-16">
          <p className="font-bold tracking-wide text-[#187052]">
            POWERED BY AI
          </p>

          <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-bold md:text-4xl">
            Classify waste. Match reusable materials. Track ownership.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-gray-600">
            EcoMatch classifies surplus materials, matches buyer requirements
            with verified listings, and exposes a transparent ownership ledger
            for approved marketplace records.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => router.push("/ai-classify")}
              className="rounded-xl bg-[#187052] px-7 py-3 font-semibold text-white transition hover:bg-[#125c43]"
            >
              AI Waste Classifier →
            </button>

            <button
              onClick={() => router.push("/ai-match")}
              className="rounded-xl border border-[#187052] bg-white px-7 py-3 font-semibold text-[#187052] transition hover:bg-[#f7faf9]"
            >
              AI Material Matching
            </button>

            <button
              onClick={() => router.push("/ledger")}
              className="rounded-xl border border-[#187052] bg-white px-7 py-3 font-semibold text-[#187052] transition hover:bg-[#f7faf9]"
            >
              View Ownership Ledger
            </button>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* ABOUT */}
      {/* ================================================= */}

      <section
        id="about"
        className="border-t border-gray-200 bg-white px-8 py-20"
      >
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-bold tracking-wide text-[#187052]">
            ABOUT ECOMATCH
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            Turning industrial surplus into opportunity.
          </h2>

          <p className="mx-auto mt-5 max-w-3xl leading-7 text-gray-600">
            EcoMatch is a marketplace designed to make reusable,
            recyclable and industrial materials easier to discover,
            verify and exchange. Our goal is to reduce material waste
            while helping buyers find useful resources and sellers give
            surplus materials a second life.
          </p>
        </div>
      </section>

      {/* ================================================= */}
      {/* FOOTER */}
      {/* ================================================= */}

      <footer className="border-t border-gray-200 bg-[#163038] px-8 py-10 text-center text-white">
        <p className="text-xl font-bold text-[#6ed3a9]">
          EcoMatch
        </p>

        <p className="mt-2 text-sm text-gray-300">
          AI + Blockchain Marketplace for Circular Industrial Materials
        </p>

        <p className="mt-5 text-xs text-gray-400">
          Team High On Codes
        </p>

        <p className="mt-2 text-[10px] tracking-wide text-gray-500">
          Developed by Janit
        </p>
      </footer>
    </main>
  );
}