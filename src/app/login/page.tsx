"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("✓ Login successful! Redirecting to marketplace...");
    setTimeout(() => {
      router.push("/marketplace");
      router.refresh();
    }, 600);

    setLoading(false);
  }

  return (
    <main className="eco-page min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient 3D Orbs */}
      <div className="eco-orb eco-orb-one" />
      <div className="eco-orb eco-orb-two" />

      <div className="relative w-full max-w-md rounded-3xl border border-emerald-500/25 bg-[#061e16]/85 p-8 shadow-2xl backdrop-blur-2xl">
        {/* Brand Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/10 text-xl font-bold text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition group-hover:scale-110">
              ♻
            </div>
            <span className="text-2xl font-black text-white">
              Eco<span className="text-emerald-400">Match</span>
            </span>
          </Link>

          <h2 className="mt-4 text-xl font-black text-white">Welcome Back</h2>
          <p className="mt-1 text-xs text-white/60">
            Sign in to access your circular marketplace dashboard
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          {/* Email */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Email Address
            </label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-emerald-500/20 bg-[#03110b] pl-10 pr-4 py-3 text-xs text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Password
              </label>
              <button
                type="button"
                className="text-[11px] text-white/50 hover:text-emerald-300"
              >
                Forgot?
              </button>
            </div>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-emerald-500/20 bg-[#03110b] pl-10 pr-10 py-3 text-xs text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 py-3.5 text-xs font-black text-[#03140e] shadow-[0_0_20px_rgba(16,185,129,0.35)] transition hover:from-emerald-300 hover:to-emerald-400 hover:scale-[1.02] disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In to EcoMatch"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Status Message */}
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

        {/* Signup Footer */}
        <p className="mt-8 text-center text-xs text-white/60">
          New to EcoMatch?{" "}
          <Link
            href="/signup"
            className="font-bold text-emerald-400 hover:text-emerald-300 underline"
          >
            Create an Account
          </Link>
        </p>
      </div>
    </main>
  );
}