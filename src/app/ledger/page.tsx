"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  seller_id: string;
  title: string;
  material: string;
  status: string;
  created_at: string;
};

type LedgerBlock = Product & { index: number; previousHash: string; hash: string };

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function LedgerPage() {
  const router = useRouter();
  const supabase = createClient();
  const [blocks, setBlocks] = useState<LedgerBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { buildLedger(); }, []);

  async function buildLedger() {
    setLoading(true);
    const { data, error: loadError } = await supabase.from("products").select("id,seller_id,title,material,status,created_at").eq("status", "approved").order("created_at", { ascending: true });
    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }

    let previousHash = "GENESIS";
    const chain: LedgerBlock[] = [];
    for (let i = 0; i < (data || []).length; i++) {
      const product = data![i] as Product;
      const payload = `${i + 1}|${product.id}|${product.seller_id}|${product.title}|${product.material}|${product.created_at}|${previousHash}`;
      const hash = await sha256(payload);
      chain.push({ ...product, index: i + 1, previousHash, hash });
      previousHash = hash;
    }
    setBlocks(chain);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#f7faf9] text-[#163038]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button onClick={() => router.push("/")} className="text-2xl font-bold text-[#187052]">EcoMatch</button>
          <button onClick={() => router.push("/marketplace")} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">← Marketplace</button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-3xl bg-[#163038] p-8 text-white">
          <p className="text-sm font-bold tracking-wider text-[#8ce0bd]">BLOCKCHAIN OWNERSHIP LEDGER</p>
          <h1 className="mt-2 text-4xl font-bold">Transparent material ownership records.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-200">Each approved listing is represented as a cryptographically linked record. Every block includes the previous block hash, making changes visible in this prototype chain.</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-4 py-2">🔗 {blocks.length} linked records</span>
            <span className="rounded-full bg-white/10 px-4 py-2">🔐 SHA-256 hashes</span>
            <span className="rounded-full bg-white/10 px-4 py-2">👁 Transparent ownership</span>
          </div>
        </div>

        {loading && <p className="py-12 text-center font-semibold text-[#187052]">Building ownership chain...</p>}
        {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">Ledger load failed: {error}</p>}
        {!loading && !error && blocks.length === 0 && <div className="mt-8 rounded-2xl border bg-white p-10 text-center text-gray-600">No approved products are available to anchor in the ledger yet.</div>}

        <div className="mt-8 space-y-4">
          {blocks.map((block) => (
            <article key={block.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold tracking-wider text-[#187052]">BLOCK #{String(block.index).padStart(3, "0")}</p>
                  <h2 className="mt-1 text-xl font-bold">{block.title}</h2>
                  <p className="mt-1 text-sm text-gray-600">Material: {block.material}</p>
                  <p className="mt-1 text-sm text-gray-600">Owner / Organisation ID: <span className="font-mono text-xs">{block.seller_id}</span></p>
                  <p className="mt-1 text-xs text-gray-500">Recorded: {new Date(block.created_at).toLocaleString("en-IN")}</p>
                </div>
                <button onClick={() => router.push(`/product/${block.id}`)} className="rounded-lg border border-[#187052] px-4 py-2 text-sm font-bold text-[#187052]">View Material</button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-[#f7faf9] p-4"><p className="text-xs font-bold text-gray-500">PREVIOUS HASH</p><p className="mt-2 break-all font-mono text-xs">{block.previousHash}</p></div>
                <div className="rounded-xl bg-[#eef9f4] p-4"><p className="text-xs font-bold text-[#187052]">CURRENT HASH</p><p className="mt-2 break-all font-mono text-xs">{block.hash}</p></div>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><strong>Prototype note:</strong> this hackathon build demonstrates blockchain principles using a SHA-256 linked ledger generated from verified marketplace records. A production deployment can persist the same ownership events to a permissioned blockchain or smart contract.</p>
      </section>
    </main>
  );
}
