"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: data.user.id,
          full_name: name,
          phone,
          role,
          verification_status: "pending",
        });

      if (profileError) {
        setMessage(profileError.message);
        setLoading(false);
        return;
      }
    }

    setMessage(
      "Account created successfully! Please check your email if verification is required."
    );

    setTimeout(() => {
      router.push("/marketplace");
    }, 1500);

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
            Create your EcoMatch account
          </p>
        </div>

        {/* Role Selection */}
        <div className="mt-8">
          <p className="mb-3 text-sm font-semibold text-[#163038]">
            I want to
          </p>

          <div className="grid grid-cols-2 gap-3">

            <button
              type="button"
              onClick={() => setRole("buyer")}
              className={`rounded-xl border p-4 text-center transition ${
                role === "buyer"
                  ? "border-[#187052] bg-[#e1f4ed] text-[#187052]"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="text-2xl">🛒</div>

              <p className="mt-1 font-semibold">
                Buy Materials
              </p>
            </button>

            <button
              type="button"
              onClick={() => setRole("seller")}
              className={`rounded-xl border p-4 text-center transition ${
                role === "seller"
                  ? "border-[#187052] bg-[#e1f4ed] text-[#187052]"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="text-2xl">📦</div>

              <p className="mt-1 font-semibold">
                Sell Materials
              </p>
            </button>

          </div>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="mt-6 space-y-4">

          {/* Full Name */}
          <div>
            <label className="text-sm font-semibold text-[#163038]">
              Full Name
            </label>

            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-[#163038] placeholder:text-gray-500 outline-none transition focus:border-[#187052] focus:ring-1 focus:ring-[#187052]"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-semibold text-[#163038]">
              Phone Number
            </label>

            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-[#163038] placeholder:text-gray-500 outline-none transition focus:border-[#187052] focus:ring-1 focus:ring-[#187052]"
            />
          </div>

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
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-[#163038] placeholder:text-gray-500 outline-none transition focus:border-[#187052] focus:ring-1 focus:ring-[#187052]"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-semibold text-[#163038]">
              Password
            </label>

            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-[#163038] placeholder:text-gray-500 outline-none transition focus:border-[#187052] focus:ring-1 focus:ring-[#187052]"
            />
          </div>

          {/* Create Account */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#187052] py-3 font-semibold text-white transition hover:bg-[#125c43] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

        </form>

        {/* Message */}
        {message && (
          <div className="mt-4 rounded-lg border border-[#b9e3d2] bg-[#e1f4ed] p-3 text-center text-sm font-medium text-[#187052]">
            {message}
          </div>
        )}

        {/* Login */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-semibold text-[#187052] hover:underline"
          >
            Login
          </a>
        </p>

      </div>
    </main>
  );
}