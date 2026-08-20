"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { classifyWaste, WasteClassification } from "@/lib/wasteClassifier";

export default function AIClassifyPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<WasteClassification | null>(null);
  const [error, setError] = useState("");

  function classify() {
    if (!input.trim()) {
      setError("Describe the waste or surplus material first.");
      setResult(null);
      return;
    }
    setError("");
    setResult(classifyWaste(input));
  }

  return (
    <main className="min-h-screen bg-[#f7faf9] text-[#163038]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button onClick={() => router.push("/")} className="text-2xl font-bold text-[#187052]">EcoMatch</button>
          <div className="flex gap-2">
            <button onClick={() => router.push("/ai-match")} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">AI Match</button>
            <button onClick={() => router.push("/marketplace")} className="rounded-lg bg-[#187052] px-4 py-2 text-sm font-semibold text-white">Marketplace</button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="text-center">
          <p className="text-sm font-bold tracking-wider text-[#187052]">AI WASTE CLASSIFICATION</p>
          <h1 className="mt-3 text-4xl font-bold">Classify surplus before exchanging it.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-gray-600">Describe an organisation&apos;s reusable or waste material. The EcoMatch classifier identifies its likely category and suggests a reuse route.</p>
        </div>

        <div className="mt-10 rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
          <label className="text-sm font-bold">Material description</label>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={5} placeholder="Example: 250 kg used aluminium sheet offcuts from a fabrication unit" className="mt-3 w-full resize-none rounded-xl border border-gray-300 px-4 py-4 outline-none focus:border-[#187052]" />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">Demo classifier uses material signals to simulate the AI classification stage.</p>
            <button onClick={classify} className="rounded-xl bg-[#187052] px-7 py-3 font-bold text-white hover:bg-[#125c43]">🤖 Classify Material</button>
          </div>
          {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>

        {result && (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-[#cfe8dd] bg-[#eef9f4] p-6">
              <p className="text-xs font-bold tracking-wide text-[#187052]">CLASSIFICATION RESULT</p>
              <h2 className="mt-2 text-3xl font-bold">{result.category}</h2>
              <p className="mt-2 text-gray-600">{result.materialType}</p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[#187052]" style={{ width: `${result.confidence}%` }} />
              </div>
              <p className="mt-2 text-sm font-semibold">Confidence: {result.confidence}%</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold">Why this classification?</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{result.reason}</p>
              <h3 className="mt-5 font-bold">Suggested circular route</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{result.reuseRoute}</p>
              <button onClick={() => router.push("/seller/add-product")} className="mt-5 w-full rounded-xl border border-[#187052] py-3 font-bold text-[#187052] hover:bg-[#eef9f4]">List This Material →</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
