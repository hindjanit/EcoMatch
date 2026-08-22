"use client";

import {
  useMemo,
  useState,
  useEffect,
} from "react";

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

// =====================================================
// TEXT HELPERS
// =====================================================

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

  // Hindi / Hinglish filler words
  "chahiye",
  "chahia",
  "mujhe",
  "merako",
  "mera",
  "meri",
  "mere",
  "ka",
  "ki",
  "ke",
  "hai",
  "hain",
  "se",
  "liye",
  "konsa",
  "kaunsa",
  "best",
  "hoga",
  "hona",
  "banwana",
  "apne",
  "ghar",
  "toh",
  "tha",
  "kar",
  "do",
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
    .filter(
      (word) =>
        word.length >= 2 &&
        !stopWords.has(word) &&
        !/^\d+$/.test(word)
    );
}

// =====================================================
// PRODUCT SEARCH TEXT
// =====================================================

function getProductText(product: Product) {
  return normalizeText(`
    ${product.title}
    ${product.category}
    ${product.material}
    ${product.description || ""}
    ${product.specifications || ""}
    ${product.condition}
  `);
}

// =====================================================
// REQUIREMENT EXTRACTION
// =====================================================

function extractBudget(requirement: string) {
  const normalized = requirement
    .toLowerCase()
    .replace(/,/g, "");

  const patterns = [
    /under\s*₹?\s*(\d+)/i,
    /below\s*₹?\s*(\d+)/i,
    /less\s+than\s*₹?\s*(\d+)/i,
    /max(?:imum)?\s*₹?\s*(\d+)/i,
    /budget\s*(?:of|is)?\s*₹?\s*(\d+)/i,
    /₹\s*(\d+)/i,
    /rs\.?\s*(\d+)/i,
    /inr\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);

    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

function extractQuantity(requirement: string) {
  const normalized =
    requirement.toLowerCase();

  const match = normalized.match(
    /(\d+(?:\.\d+)?)\s*(kg|kgs|kilogram|kilograms|ton|tons|piece|pieces|unit|units|meter|metre|meters|metres|litre|liter|litres|liters)/i
  );

  if (!match) {
    return null;
  }

  return {
    value: Number(match[1]),
    unit: match[2].toLowerCase(),
  };
}

function extractDimension(requirement: string) {
  const normalized = requirement
    .toLowerCase()
    .replace(/×/g, "x");

  const match = normalized.match(
    /(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/
  );

  if (!match) {
    return null;
  }

  return {
    first: match[1],
    second: match[2],

    normalized:
      `${match[1]}x${match[2]}`,
  };
}

// =====================================================
// MATERIAL DETECTION
// =====================================================

const materialGroups = [
  {
    name: "steel",
    terms: [
      "steel",
      "stainless steel",
      "mild steel",
      "tmt steel",
    ],
  },

  {
    name: "aluminium",
    terms: [
      "aluminium",
      "aluminum",
    ],
  },

  {
    name: "copper",
    terms: [
      "copper",
    ],
  },

  {
    name: "iron",
    terms: [
      "iron",
      "cast iron",
    ],
  },

  {
    name: "plastic",
    terms: [
      "plastic",
      "hdpe",
      "pvc",
      "pet",
      "polypropylene",
    ],
  },

  {
    name: "wood",
    terms: [
      "wood",
      "timber",
      "plywood",
    ],
  },

  {
    name: "cardboard",
    terms: [
      "cardboard",
      "corrugated",
      "carton",
    ],
  },
];

function detectRequestedMaterial(
  requirement: string
) {
  const normalized =
    normalizeText(requirement);

  for (const group of materialGroups) {
    const found = group.terms.find(
      (term) =>
        normalized.includes(term)
    );

    if (found) {
      return {
        group: group.name,
        term: found,
      };
    }
  }

  return null;
}

// =====================================================
// GRADE DETECTION
// =====================================================

function extractGrade(
  requirement: string
) {
  const normalized =
    normalizeText(requirement);

  // Common industrial grades
  const gradePatterns = [
    /\b304\b/,
    /\b316\b/,
    /\b6061\b/,
    /\b6063\b/,
    /\b202\b/,
    /\b1018\b/,
    /\b1020\b/,
    /\bss304\b/,
    /\bss316\b/,
  ];

  for (const pattern of gradePatterns) {
    const match =
      normalized.match(pattern);

    if (match) {
      return match[0];
    }
  }

  return null;
}

// =====================================================
// CONDITION DETECTION
// =====================================================

function extractCondition(
  requirement: string
) {
  const normalized =
    normalizeText(requirement);

  const conditions = [
    "new",
    "like new",
    "good",
    "used",
    "for parts",
  ];

  return (
    conditions.find((condition) =>
      normalized.includes(condition)
    ) || null
  );
}

// =====================================================
// MATCH CALCULATION
// =====================================================

function calculateMatch(
  product: Product,
  requirement: string
) {
  const productText =
    getProductText(product);

  const matchedTerms =
    new Set<string>();

  let points = 0;
  let possiblePoints = 0;

  // =====================================================
  // 1. MATERIAL MATCH — 30 POINTS
  // =====================================================

  const requestedMaterial =
    detectRequestedMaterial(
      requirement
    );

  if (requestedMaterial) {
    possiblePoints += 30;

    if (
      productText.includes(
        requestedMaterial.group
      ) ||
      productText.includes(
        requestedMaterial.term
      )
    ) {
      points += 30;

      matchedTerms.add(
        requestedMaterial.term
      );
    }
  }

  // =====================================================
  // 2. MATERIAL GRADE — 20 POINTS
  // =====================================================

  const requestedGrade =
    extractGrade(requirement);

  if (requestedGrade) {
    possiblePoints += 20;

    if (
      productText.includes(
        requestedGrade
      )
    ) {
      points += 20;

      matchedTerms.add(
        requestedGrade
      );
    }
  }

  // =====================================================
  // 3. DIMENSION — 20 POINTS
  // =====================================================

  const requestedDimension =
    extractDimension(
      requirement
    );

  if (requestedDimension) {
    possiblePoints += 20;

    const productDimensionText =
      productText
        .replace(/\s*x\s*/g, "x");

    if (
      productDimensionText.includes(
        requestedDimension.normalized
      )
    ) {
      points += 20;

      matchedTerms.add(
        requestedDimension.normalized
      );
    } else {
      // partial dimension match
      const hasFirst =
        productDimensionText.includes(
          requestedDimension.first
        );

      const hasSecond =
        productDimensionText.includes(
          requestedDimension.second
        );

      if (hasFirst && hasSecond) {
        points += 14;

        matchedTerms.add(
          `${requestedDimension.first}x${requestedDimension.second}`
        );
      }
    }
  }

  // =====================================================
  // 4. QUANTITY — 15 POINTS
  // =====================================================

  const requestedQuantity =
    extractQuantity(
      requirement
    );

  if (requestedQuantity) {
    possiblePoints += 15;

    const requested =
      requestedQuantity.value;

    const available =
      Number(product.quantity);

    if (available >= requested) {
      points += 15;

      matchedTerms.add(
        `${requested} ${requestedQuantity.unit}`
      );
    } else {
      // Partial credit if reasonably close
      const ratio =
        available / requested;

      if (ratio >= 0.75) {
        points += 8;
      } else if (ratio >= 0.5) {
        points += 4;
      }
    }
  }

  // =====================================================
  // 5. BUDGET — 15 POINTS
  // =====================================================

  const maxBudget =
    extractBudget(requirement);

  if (maxBudget !== null) {
    possiblePoints += 15;

    if (
      Number(product.price) <=
      maxBudget
    ) {
      points += 15;

      matchedTerms.add(
        `₹${maxBudget.toLocaleString(
          "en-IN"
        )}`
      );
    } else {
      // Slight partial credit if close
      const difference =
        Number(product.price) -
        maxBudget;

      const percentageAbove =
        difference / maxBudget;

      if (percentageAbove <= 0.1) {
        points += 7;
      }
    }
  }

  // =====================================================
  // 6. CONDITION — 10 OPTIONAL POINTS
  // =====================================================

  const requestedCondition =
    extractCondition(requirement);

  if (requestedCondition) {
    possiblePoints += 10;

    if (
      normalizeText(
        product.condition
      ).includes(
        requestedCondition
      )
    ) {
      points += 10;

      matchedTerms.add(
        requestedCondition
      );
    }
  }

  // =====================================================
  // 7. ADDITIONAL IMPORTANT KEYWORDS
  // =====================================================

  const keywords =
    extractKeywords(requirement);

  const alreadyStructured =
    new Set([
      requestedMaterial?.group,
      requestedMaterial?.term,
      requestedGrade,
      requestedCondition,
    ]);

  const remainingKeywords =
    keywords.filter(
      (keyword) =>
        !alreadyStructured.has(
          keyword
        ) &&
        !keyword.includes("x")
    );

  // Max bonus = 10 points
  let bonusPoints = 0;

  remainingKeywords.forEach(
    (keyword) => {
      if (
        productText.includes(keyword)
      ) {
        bonusPoints += 2;

        matchedTerms.add(
          keyword
        );
      }
    }
  );

  bonusPoints =
    Math.min(10, bonusPoints);

  // Bonus does not increase denominator
  points += bonusPoints;

  // =====================================================
  // FINAL SCORE
  // =====================================================

  if (possiblePoints === 0) {
    return {
      score: 0,
      matchedTerms:
        Array.from(matchedTerms),
    };
  }

  const rawScore =
    (points / possiblePoints) *
    100;

  return {
    score: Math.min(
      100,
      Math.round(rawScore)
    ),

    matchedTerms:
      Array.from(matchedTerms),
  };
}

// =====================================================
// PAGE
// =====================================================

export default function AIMatchPage() {
  const supabase =
    createClient();

  const router =
    useRouter();

  const [
    products,
    setProducts,
  ] =
    useState<Product[]>([]);

  const [
    images,
    setImages,
  ] =
    useState<
      Record<
        string,
        ProductImage[]
      >
    >({});

  const [
    requirement,
    setRequirement,
  ] =
    useState("");

  const [
    submittedRequirement,
    setSubmittedRequirement,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError("");

    const {
      data,
      error: productError,
    } =
      await supabase
        .from("products")
        .select("*")
        .eq(
          "status",
          "approved"
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (productError) {
      setError(
        productError.message
      );

      setLoading(false);

      return;
    }

    const approvedProducts =
      (data || []) as Product[];

    setProducts(
      approvedProducts
    );

    if (
      approvedProducts.length ===
      0
    ) {
      setImages({});
      setLoading(false);

      return;
    }

    const productIds =
      approvedProducts.map(
        (product) =>
          product.id
      );

    const {
      data: imageData,
      error: imageError,
    } =
      await supabase
        .from(
          "product_images"
        )
        .select("*")
        .in(
          "product_id",
          productIds
        )
        .eq(
          "verification_status",
          "approved"
        );

    if (!imageError) {
      const groupedImages:
        Record<
          string,
          ProductImage[]
        > = {};

      (
        imageData || []
      ).forEach(
        (image) => {
          if (
            !groupedImages[
              image.product_id
            ]
          ) {
            groupedImages[
              image.product_id
            ] = [];
          }

          groupedImages[
            image.product_id
          ].push(image);
        }
      );

      setImages(
        groupedImages
      );
    }

    setLoading(false);
  }

  // =====================================================
  // CALCULATE MATCHES
  // =====================================================

  const matchedProducts =
    useMemo<
      MatchedProduct[]
    >(() => {
      if (
        !submittedRequirement.trim()
      ) {
        return [];
      }

      return products
        .map((product) => {
          const match =
            calculateMatch(
              product,
              submittedRequirement
            );

          return {
            ...product,

            matchScore:
              match.score,

            matchedTerms:
              match.matchedTerms,
          };
        })

        // Hide extremely irrelevant results
        .filter(
          (product) =>
            product.matchScore >= 10
        )

        .sort(
          (a, b) =>
            b.matchScore -
            a.matchScore
        );
    }, [
      products,
      submittedRequirement,
    ]);

  // =====================================================
  // HANDLE MATCH
  // =====================================================

  function handleMatch() {
    const text =
      requirement.trim();

    if (!text) {
      setError(
        "Please describe what material you need."
      );

      return;
    }

    setError("");

    setSubmittedRequirement(
      text
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="min-h-screen bg-[#f7faf9]">

      {/* HEADER */}

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <button
            onClick={() =>
              router.push(
                "/marketplace"
              )
            }
            className="text-2xl font-bold text-[#187052]"
          >
            EcoMatch
          </button>

          <button
            onClick={() =>
              router.push(
                "/marketplace"
              )
            }
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            ← Marketplace
          </button>

        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* TITLE */}

        <div className="mx-auto max-w-3xl text-center">

          <p className="text-sm font-bold tracking-wide text-[#187052]">
            ECOMATCH SMART MATCHING
          </p>

          <h1 className="mt-3 text-4xl font-bold text-[#163038]">
            Tell us what material you need.
          </h1>

          <p className="mt-3 text-gray-600">
            EcoMatch analyzes your requirement and ranks verified marketplace
            listings based on material, grade, dimensions, quantity,
            condition and price.
          </p>

        </div>

        {/* REQUIREMENT INPUT */}

        <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <label className="text-sm font-bold text-[#163038]">
            Describe your requirement
          </label>

          <textarea
            value={
              requirement
            }

            onChange={(e) =>
              setRequirement(
                e.target.value
              )
            }

            rows={5}

            placeholder="Example: I need 70 kg 304 steel sheets, dimension 7x9, under ₹40,000"

            className="mt-3 w-full resize-none rounded-xl border border-gray-300 px-4 py-4 text-[#163038] outline-none placeholder:text-gray-500 focus:border-[#187052]"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs text-gray-500">
              Tip: Mention material, grade,
              quantity, dimensions, condition
              or budget for better matching.
            </p>

            <button
              onClick={
                handleMatch
              }

              className="rounded-xl bg-[#187052] px-7 py-3 font-bold text-white hover:bg-[#125c43]"
            >
              🤖 Find Best Matches
            </button>

          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mx-auto mt-5 max-w-4xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div className="mt-10 text-center">

            <p className="font-semibold text-[#187052]">
              Loading verified products...
            </p>

          </div>
        )}

        {/* RESULTS */}

        {!loading &&
          submittedRequirement && (

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
                  {
                    matchedProducts.length
                  }{" "}
                  matching listing
                  {
                    matchedProducts.length !==
                    1
                      ? "s"
                      : ""
                  }
                </p>

              </div>

              {matchedProducts.length ===
              0 ? (

                <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">

                  <div className="text-5xl">
                    🔎
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-[#163038]">
                    No suitable match found
                  </h3>

                  <p className="mt-2 text-sm text-gray-600">
                    Try using simpler material names
                    or broader specifications.
                  </p>

                </div>

              ) : (

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

                  {matchedProducts.map(
                    (
                      product,
                      index
                    ) => {

                      const image =
                        images[
                          product.id
                        ]?.[0]
                          ?.image_url;

                      return (

                        <article
                          key={
                            product.id
                          }

                          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                        >

                          {/* IMAGE */}

                          <div className="relative h-48 bg-[#eef3f1]">

                            {image ? (

                              <img
                                src={
                                  image
                                }

                                alt={
                                  product.title
                                }

                                className="h-full w-full object-cover"
                              />

                            ) : (

                              <div className="flex h-full items-center justify-center text-5xl">
                                📦
                              </div>

                            )}

                            {index ===
                              0 && (

                              <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#187052] shadow-sm">
                                ⭐ Best Match
                              </span>

                            )}

                            <span className="absolute bottom-3 right-3 rounded-full bg-[#187052] px-3 py-1.5 text-sm font-bold text-white shadow-sm">
                              {
                                product.matchScore
                              }
                              % Match
                            </span>

                          </div>

                          {/* DETAILS */}

                          <div className="p-5">

                            <p className="text-xs font-bold uppercase tracking-wide text-[#187052]">
                              {
                                product.category
                              }
                            </p>

                            <h3 className="mt-1 text-lg font-bold text-[#163038]">
                              {
                                product.title
                              }
                            </h3>

                            <p className="mt-2 text-sm text-gray-600">
                              {
                                product.material
                              }
                            </p>

                            {/* MATCH REASONS */}

                            {product
                              .matchedTerms
                              .length >
                              0 && (

                              <div className="mt-3 flex flex-wrap gap-1.5">

                                {product.matchedTerms
                                  .slice(
                                    0,
                                    6
                                  )
                                  .map(
                                    (
                                      term
                                    ) => (

                                      <span
                                        key={
                                          term
                                        }

                                        className="rounded-full bg-[#eef9f4] px-2.5 py-1 text-[10px] font-semibold text-[#187052]"
                                      >
                                        ✓{" "}
                                        {
                                          term
                                        }
                                      </span>

                                    )
                                  )}

                              </div>

                            )}

                            {/* PRICE */}

                            <div className="mt-4 flex items-end justify-between">

                              <div>

                                <p className="text-xs text-gray-500">
                                  Expected Price
                                </p>

                                <p className="text-xl font-bold text-[#163038]">
                                  ₹
                                  {Number(
                                    product.price
                                  ).toLocaleString(
                                    "en-IN"
                                  )}
                                </p>

                              </div>

                              <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">
                                {
                                  product.condition
                                }
                              </span>

                            </div>

                            {/* QUANTITY */}

                            <div className="mt-4 border-t border-gray-100 pt-4">

                              <p className="text-xs text-gray-500">
                                Available
                              </p>

                              <p className="mt-1 text-sm font-semibold text-[#163038]">
                                {
                                  product.quantity
                                }{" "}
                                {
                                  product.quantity_unit
                                }
                              </p>

                            </div>

                            {/* VIEW */}

                            <button
                              onClick={() =>
                                router.push(
                                  `/product/${product.id}`
                                )
                              }

                              className="mt-5 w-full rounded-xl bg-[#187052] py-3 text-sm font-bold text-white hover:bg-[#125c43]"
                            >
                              View Product
                            </button>

                          </div>

                        </article>

                      );
                    }
                  )}

                </div>

              )}

            </div>

          )}

      </section>
    </main>
  );
}