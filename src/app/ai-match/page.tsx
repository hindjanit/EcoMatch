"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import {
  Sparkles,
  Search,
  Zap,
  ArrowRight,
  Boxes,
  Tag,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";

type Product = {
  id: string;
  seller_id: string;
  title: string;
  category: string;
  material: string;
  description: string | null;
  specifications: string | null;
  quantity: number;
  quantity_unit: string;
  price: number;
  is_negotiable: boolean;
  condition: string;
  status: string;
  created_at: string;
};

type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  verification_status: string;
};

type MatchedProduct = Product & {
  matchScore: number;
  matchedTerms: string[];
};

const stopWords = new Set([
  "i", "me", "my", "need", "want", "looking", "for", "a", "an", "the", "and", "or", "with", "of", "in", "to", "under", "within", "around", "near", "please", "product", "material", "required", "requirement",
  "chahiye", "chahia", "mujhe", "merako", "mera", "meri", "mere", "ka", "ki", "ke", "hai", "hain", "se", "liye", "konsa", "kaunsa", "best", "hoga", "hona", "banwana", "apne", "ghar", "toh", "tha", "kar", "do"
]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[^\p{L}\p{N}\s.x-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(input: string) {
  return normalizeText(input)
    .split(" ")
    .filter((word) => word.length >= 2 && !stopWords.has(word) && !/^\d+$/.test(word));
}

export default function AIMatchPage() {
  const supabase = createClient();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<string, ProductImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [isMatching, setIsMatching] = useState(false);

  const samplePrompts = [
    "Mujhe 30kg industrial nails ya fasteners chahiye under ₹1500",
    "Need 250 kg aluminium sheets or metal offcuts for fabrication",
    "Looking for 5 to 10 used office ergonomic chairs under ₹3000 each",
    "Food grade HDPE plastic drums or chemical containers in Bangalore",
    "Copper scrap wire with intact insulation for motor recycling",
  ];

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").eq("status", "approved");
    const prods = (data || []) as Product[];
    setProducts(prods);

    if (prods.length > 0) {
      const pIds = prods.map((p) => p.id);
      const { data: imgData } = await supabase
        .from("product_images")
        .select("*")
        .in("product_id", pIds)
        .eq("verification_status", "approved");

      if (imgData) {
        const grouped: Record<string, ProductImage[]> = {};
        imgData.forEach((img) => {
          if (!grouped[img.product_id]) grouped[img.product_id] = [];
          grouped[img.product_id].push(img);
        });
        setImages(grouped);
      }
    }
    setLoading(false);
  }

  const matchedResults = useMemo(() => {
    const keywords = extractKeywords(query);
    if (!keywords.length) return [];

    const scored = products
      .map((product) => {
        let score = 0;
        const matchedTerms: string[] = [];
        const titleNorm = normalizeText(product.title);
        const matNorm = normalizeText(product.material);
        const catNorm = normalizeText(product.category);
        const descNorm = normalizeText(product.description || "");

        keywords.forEach((kw) => {
          if (titleNorm.includes(kw)) {
            score += 40;
            matchedTerms.push(kw);
          } else if (matNorm.includes(kw)) {
            score += 35;
            matchedTerms.push(kw);
          } else if (catNorm.includes(kw)) {
            score += 25;
            matchedTerms.push(kw);
          } else if (descNorm.includes(kw)) {
            score += 15;
            matchedTerms.push(kw);
          }
        });

        const normalizedScore = Math.min(99, Math.max(0, score));
        return {
          ...product,
          matchScore: normalizedScore,
          matchedTerms: [...new Set(matchedTerms)],
        };
      })
      .filter((p) => p.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    return scored;
  }, [products, query]);

  return (
    <main className="eco-page min-h-screen text-white pb-24">
      <Navbar />

      <div className="eco-orb eco-orb-one" />
      <div className="eco-orb eco-orb-two" />

      <div className="relative mx-auto max-w-6xl px-4 pt-28 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" /> AI REQUISITION MATCHER
          </div>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">
            Match Material Needs with <span className="text-emerald-400">AI</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs sm:text-sm text-white/60">
            Enter your natural language procurement requirement in English or Hinglish. EcoMatch ranks approved surplus stock in real-time.
          </p>
        </div>

        {/* Search HUD Box */}
        <div className="mt-8 rounded-3xl border border-emerald-500/25 bg-[#061e16]/80 p-6 shadow-2xl backdrop-blur-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Mujhe 200 kg aluminium sheet ya metal scraps chahiye..."
              className="w-full rounded-2xl border border-emerald-500/20 bg-[#03110b] pl-12 pr-4 py-4 text-sm text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-white/40">Try Sample Needs:</span>
            {samplePrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setQuery(prompt)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:border-emerald-500/40 hover:text-emerald-300 transition"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Results Metadata */}
        {query && (
          <div className="mt-8 flex items-center justify-between text-xs text-white/60">
            <p>
              Ranked <strong className="text-emerald-400">{matchedResults.length}</strong> matching materials from live catalog
            </p>
            <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
              NLP Match Engine Active
            </span>
          </div>
        )}

        {/* Matched Grid */}
        <div className="mt-6">
          {matchedResults.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {matchedResults.map((product) => {
                const productImages = images[product.id] || [];
                const firstImg = productImages[0]?.image_url || null;

                return (
                  <div
                    key={product.id}
                    className="card-3d relative flex flex-col justify-between rounded-3xl border border-emerald-500/25 bg-[#061e16]/80 p-5 shadow-2xl backdrop-blur-xl"
                  >
                    <div>
                      {/* Top Match Score Ring */}
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                          {product.category}
                        </span>
                        <div className="flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-black text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                          <Zap className="h-3 w-3 fill-current" />
                          {product.matchScore}% Match
                        </div>
                      </div>

                      {/* Image */}
                      <div className="mt-3 aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                        {firstImg ? (
                          <img src={firstImg} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-emerald-400/40">
                            <Boxes className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      <h3 className="mt-3 text-lg font-bold text-white">{product.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-white/60">{product.description}</p>

                      {/* Matched Keyword Highlights */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {product.matchedTerms.map((t) => (
                          <span
                            key={t}
                            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300"
                          >
                            ✓ {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
                      <div>
                        <p className="text-[10px] uppercase text-white/50">Price</p>
                        <p className="text-xl font-black text-white">
                          ₹{Number(product.price).toLocaleString("en-IN")}
                        </p>
                      </div>

                      <Link
                        href={`/product/${product.id}`}
                        className="flex items-center gap-1 rounded-xl bg-emerald-400 px-3.5 py-2 text-xs font-black text-[#03140e] hover:bg-emerald-300"
                      >
                        View & Deal <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : query ? (
            <div className="mt-10 rounded-3xl border border-emerald-500/20 bg-[#061d15]/50 p-12 text-center shadow-xl">
              <Boxes className="mx-auto h-12 w-12 text-emerald-400/40" />
              <h4 className="mt-3 text-lg font-bold">No exact match for "{query}"</h4>
              <p className="mx-auto mt-1 max-w-sm text-xs text-white/50">
                Try using alternate material synonyms (e.g. Aluminium instead of Metal) or explore the general marketplace catalog.
              </p>
              <Link
                href="/marketplace"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-[#03140e] hover:bg-emerald-300"
              >
                Browse All Marketplace Listings
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </main>
  );
}