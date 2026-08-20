"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  "i",
  "me",
  "my",
  "need",
  "want",
  "looking",
  "for",
  "a",
  "an",
  "the",
  "and",
  "or",
  "with",
  "of",
  "in",
  "to",
  "under",
  "within",
  "around",
  "near",
  "please",
  "product",
  "material",
  "required",
  "requirement",
  "chahiye",
  "mujhe",
  "ka",
  "ki",
  "ke",
  "hai",
  "se",
]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(input: string) {
  return normalizeText(input)
    .split(" ")
    .filter(
      (word) =>
        word.length >= 2 &&
        !stopWords.has(word)
    );
}

function calculateMatch(
  product: Product,
  requirement: string
) {
  const keywords = extractKeywords(requirement);

  if (keywords.length === 0) {
    return {
      score: 0,
      matchedTerms: [] as string[],
    };
  }

  const title = normalizeText(product.title);
  const material = normalizeText(product.material);
  const category = normalizeText(product.category);
  const condition = normalizeText(product.condition);
  const description = normalizeText(product.description || "");
  const specifications = normalizeText(
    product.specifications || ""
  );

  let points = 0;
  let possiblePoints = 0;

  const matchedTerms = new Set<string>();

  keywords.forEach((keyword) => {
    // Each keyword can contribute up to 10 points
    possiblePoints += 10;

    let keywordScore = 0;

    if (title.includes(keyword)) {
      keywordScore = Math.max(keywordScore, 10);
      matchedTerms.add(keyword);
    }

    if (material.includes(keyword)) {
      keywordScore = Math.max(keywordScore, 10);
      matchedTerms.add(keyword);
    }

    if (category.includes(keyword)) {
      keywordScore = Math.max(keywordScore, 8);
      matchedTerms.add(keyword);
    }

    if (specifications.includes(keyword)) {
      keywordScore = Math.max(keywordScore, 9);
      matchedTerms.add(keyword);
    }

    if (description.includes(keyword)) {
      keywordScore = Math.max(keywordScore, 6);
      matchedTerms.add(keyword);
    }

    if (condition.includes(keyword)) {
      keywordScore = Math.max(keywordScore, 5);
      matchedTerms.add(keyword);
    }

    points += keywordScore;
  });

  // Price awareness
  const priceMatch = requirement.match(
    /(?:under|below|less than|max|maximum|₹|rs\.?|inr)\s*([\d,]+)/i
  );

  if (priceMatch) {
    const maxPrice = Number(
      priceMatch[1].replace(/,/g, "")
    );

    if (!Number.isNaN(maxPrice)) {
      possiblePoints += 15;

      if (product.price <= maxPrice) {
        points += 15;
        matchedTerms.add(`₹${maxPrice}`);
      }
    }
  }

  // Quantity awareness
  const quantityMatch = requirement.match(
    /(\d+(?:\.\d+)?)\s*(kg|kgs|kilogram|kilograms|ton|tons|piece|pieces|unit|units|meter|metre|litre|liter)/i
  );

  if (quantityMatch) {
    const requestedQuantity = Number(quantityMatch[1]);

    if (!Number.isNaN(requestedQuantity)) {
      possiblePoints += 10;

      if (product.quantity >= requestedQuantity) {
        points += 10;
        matchedTerms.add(
          `${requestedQuantity} ${quantityMatch[2]}`
        );
      }
    }
  }

  const rawScore =
    possiblePoints > 0
      ? (points / possiblePoints) * 100
      : 0;

  return {
    score: Math.min(100, Math.round(rawScore)),
    matchedTerms: Array.from(matchedTerms),
  };
}

export default function AIMatchPage() {
  const supabase = createClient();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<
    Record<string, ProductImage[]>
  >({});

  const [requirement, setRequirement] = useState("");
  const [submittedRequirement, setSubmittedRequirement] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError("");

    const { data, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (productError) {
      setError(productError.message);
      setLoading(false);
      return;
    }

    const approvedProducts = (data || []) as Product[];

    setProducts(approvedProducts);

    if (approvedProducts.length === 0) {
      setImages({});
      setLoading(false);
      return;
    }

    const productIds = approvedProducts.map(
      (product) => product.id
    );

    const { data: imageData, error: imageError } =
      await supabase
        .from("product_images")
        .select("*")
        .in("product_id", productIds)
        .eq("verification_status", "approved");

    if (!imageError) {
      const groupedImages: Record<
        string,
        ProductImage[]
      > = {};

      (imageData || []).forEach((image) => {
        if (!groupedImages[image.product_id]) {
          groupedImages[image.product_id] = [];
        }

        groupedImages[image.product_id].push(image);
      });

      setImages(groupedImages);
    }

    setLoading(false);
  }

  const matchedProducts = useMemo<MatchedProduct[]>(() => {
    if (!submittedRequirement.trim()) {
      return [];
    }

    return products
      .map((product) => {
        const match = calculateMatch(
          product,
          submittedRequirement
        );

        return {
          ...product,
          matchScore: match.score,
          matchedTerms: match.matchedTerms,
        };
      })
      .filter((product) => product.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [products, submittedRequirement]);

  function handleMatch() {
    const text = requirement.trim();

    if (!text) {
      setError("Please describe what material you need.");
      return;
    }

    setError("");
    setSubmittedRequirement(text);
  }

  return (
    <main className="min-h-screen bg-[#f7faf9]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button
            onClick={() => router.push("/marketplace")}
            className="text-2xl font-bold text-[#187052]"
          >
            EcoMatch
          </button>

          <button
            onClick={() => router.push("/marketplace")}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            ← Marketplace
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold tracking-wide text-[#187052]">
            ECOMATCH SMART MATCHING
          </p>

          <h1 className="mt-3 text-4xl font-bold text-[#163038]">
            Tell us what material you need.
          </h1>

          <p className="mt-3 text-gray-600">
            EcoMatch analyzes your requirement and ranks verified
            marketplace listings based on material, specifications,
            quantity, condition and price.
          </p>
        </div>

        {/* Requirement Input */}
        <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <label className="text-sm font-bold text-[#163038]">
            Describe your requirement
          </label>

          <textarea
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            rows={5}
            placeholder="Example: I need 100 kg aluminium sheets, around 3 mm thickness, under ₹60,000"
            className="mt-3 w-full resize-none rounded-xl border border-gray-300 px-4 py-4 text-[#163038] outline-none placeholder:text-gray-500 focus:border-[#187052]"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Tip: Mention material, quantity, dimensions, condition
              or budget for better matching.
            </p>

            <button
              onClick={handleMatch}
              className="rounded-xl bg-[#187052] px-7 py-3 font-bold text-white hover:bg-[#125c43]"
            >
              🤖 Find Best Matches
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-auto mt-5 max-w-4xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-10 text-center">
            <p className="font-semibold text-[#187052]">
              Loading verified products...
            </p>
          </div>
        )}

        {!loading && submittedRequirement && (
          <div className="mt-10">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#187052]">
                  MATCH RESULTS
                </p>

                <h2 className="mt-1 text-2xl font-bold text-[#163038]">
                  Recommended Products
                </h2>
              </div>

              <p className="text-sm text-gray-500">
                {matchedProducts.length} matching listing
                {matchedProducts.length !== 1 ? "s" : ""}
              </p>
            </div>

            {matchedProducts.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                <div className="text-5xl">🔎</div>

                <h3 className="mt-4 text-xl font-bold text-[#163038]">
                  No suitable match found
                </h3>

                <p className="mt-2 text-sm text-gray-600">
                  Try using simpler material names or broader
                  specifications.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {matchedProducts.map((product, index) => {
                  const image =
                    images[product.id]?.[0]?.image_url;

                  return (
                    <article
                      key={product.id}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                    >
                      <div className="relative h-48 bg-[#eef3f1]">
                        {image ? (
                          <img
                            src={image}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-5xl">
                            📦
                          </div>
                        )}

                        {index === 0 && (
                          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#187052] shadow-sm">
                            ⭐ Best Match
                          </span>
                        )}

                        <span className="absolute bottom-3 right-3 rounded-full bg-[#187052] px-3 py-1.5 text-sm font-bold text-white shadow-sm">
                          {product.matchScore}% Match
                        </span>
                      </div>

                      <div className="p-5">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#187052]">
                          {product.category}
                        </p>

                        <h3 className="mt-1 text-lg font-bold text-[#163038]">
                          {product.title}
                        </h3>

                        <p className="mt-2 text-sm text-gray-600">
                          {product.material}
                        </p>

                        {product.matchedTerms.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {product.matchedTerms
                              .slice(0, 5)
                              .map((term) => (
                                <span
                                  key={term}
                                  className="rounded-full bg-[#eef9f4] px-2.5 py-1 text-[10px] font-semibold text-[#187052]"
                                >
                                  ✓ {term}
                                </span>
                              ))}
                          </div>
                        )}

                        <div className="mt-4 flex items-end justify-between">
                          <div>
                            <p className="text-xs text-gray-500">
                              Expected Price
                            </p>

                            <p className="text-xl font-bold text-[#163038]">
                              ₹
                              {product.price.toLocaleString(
                                "en-IN"
                              )}
                            </p>
                          </div>

                          <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">
                            {product.condition}
                          </span>
                        </div>

                        <div className="mt-4 border-t border-gray-100 pt-4">
                          <p className="text-xs text-gray-500">
                            Available
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[#163038]">
                            {product.quantity}{" "}
                            {product.quantity_unit}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            router.push(`/product/${product.id}`)
                          }
                          className="mt-5 w-full rounded-xl bg-[#187052] py-3 text-sm font-bold text-white hover:bg-[#125c43]"
                        >
                          View Product
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}