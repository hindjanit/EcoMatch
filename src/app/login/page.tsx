"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    setMessage("Login successful! Redirecting...");

    setTimeout(() => {
      router.push("/marketplace");
    }, 800);

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7faf9] px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

        {/* Logo */}
        <div className="text-center">
          <a
            href="/"
            className="text-3xl font-bold text-[#187052]"
          >
            EcoMatch
          </a>

          <p className="mt-2 text-sm text-gray-600">
            Welcome back to EcoMatch
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="mt-8 space-y-5">

          {/* Email */}
          <div>
            <label className="text-sm font-semibold text-[#163038]">
              Email
            </label>

            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-[#163038] placeholder:text-gray-500 outline-none transition focus:border-[#187052] focus:ring-1 focus:ring-[#187052]"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[#163038]">
                Password
              </label>

              <button
                type="button"
                className="text-xs font-semibold text-[#187052] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-[#163038] placeholder:text-gray-500 outline-none transition focus:border-[#187052] focus:ring-1 focus:ring-[#187052]"
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#187052] py-3 font-semibold text-white transition hover:bg-[#125c43] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        {/* Message */}
        {message && (
          <div className="mt-4 rounded-lg border border-[#b9e3d2] bg-[#e1f4ed] p-3 text-center text-sm font-medium text-[#187052]">
            {message}
          </div>
        )}

        {/* Signup */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <a
            href="/signup"
            className="font-semibold text-[#187052] hover:underline"
          >
            Create Account
          </a>
        </p>

      </div>
    </main>
  );
}