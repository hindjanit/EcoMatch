"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart,
  Boxes,
  User,
  Phone,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name.trim(),
          phone: phone.trim(),
          role,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setMessage("✓ Account created! Please check your email to confirm your registration.");
      setLoading(false);
      return;
    }

    setMessage("✓ Account created successfully! Redirecting...");
    setTimeout(() => router.push("/profile"), 800);
    setLoading(false);
  }

  return (
    <main className="eco-page min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="eco-orb eco-orb-one" />
      <div className="eco-orb eco-orb-two" />

      <div className="relative w-full max-w-md rounded-3xl border border-emerald-500/25 bg-[#061e16]/85 p-8 shadow-2xl backdrop-blur-2xl">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/10 text-xl font-bold text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              ♻
            </div>
            <span className="text-2xl font-black text-white">
              Eco<span className="text-emerald-400">Match</span>
            </span>
          </Link>

          <h2 className="mt-4 text-xl font-black text-white">Create Your Account</h2>
          <p className="mt-1 text-xs text-white/60">
            Join the circular material exchange network
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            I Want To
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("buyer")}
              className={`flex flex-col items-center justify-center rounded-2xl border p-3.5 transition-all ${
                role === "buyer"
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)] scale-[1.02]"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="mt-1.5 text-xs font-bold">Buy Materials</span>
            </button>

            <button
              type="button"
              onClick={() => setRole("seller")}
              className={`flex flex-col items-center justify-center rounded-2xl border p-3.5 transition-all ${
                role === "seller"
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)] scale-[1.02]"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              <Boxes className="h-5 w-5" />
              <span className="mt-1.5 text-xs font-bold">Sell Surplus</span>
            </button>
          </div>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="mt-6 space-y-3.5">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">
              Full Name / Company
            </label>
            <div className="relative mt-1">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Janit Kumar Hind"
                className="w-full rounded-xl border border-emerald-500/20 bg-[#03110b] pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">
              Phone Number
            </label>
            <div className="relative mt-1">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border border-emerald-500/20 bg-[#03110b] pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">
              Email Address
            </label>
            <div className="relative mt-1">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-emerald-500/20 bg-[#03110b] pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">
              Password
            </label>
            <div className="relative mt-1">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-xl border border-emerald-500/20 bg-[#03110b] pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 py-3.5 text-xs font-black text-[#03140e] shadow-[0_0_20px_rgba(16,185,129,0.35)] transition hover:from-emerald-300 hover:to-emerald-400 hover:scale-[1.02] disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 rounded-xl border p-3 text-center text-xs font-semibold ${
              message.startsWith("✓")
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {message}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-white/60">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold text-emerald-400 hover:text-emerald-300 underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}