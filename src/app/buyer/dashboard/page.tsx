"use client";

import { useEffect, useMemo, useState } from "react";
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

const categories = [
  "All",
  "Metals",
  "Plastic",
  "Wood",
  "Industrial Goods",
  "Electrical Materials",
  "Machinery & Equipment",
  "Construction Materials",
  "Packaging Materials",
  "Other",
];

export default function BuyerDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<string, ProductImage[]>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    const { data, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (productError) {
      console.error("BUYER PRODUCTS ERROR:", productError);

      setError(productError.message);
      setProducts([]);
      setImages({});
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

    const productIds = approvedProducts.map((product) => product.id);

    const { data: imageData, error: imageError } = await supabase
      .from("product_images")
      .select("*")
      .in("product_id", productIds)
      .eq("verification_status", "approved");

    if (imageError) {
      console.error("BUYER IMAGE ERROR:", imageError);
      setImages({});
    } else {
      const groupedImages: Record<string, ProductImage[]> = {};

      ((imageData || []) as ProductImage[]).forEach((image) => {
        if (!groupedImages[image.product_id]) {
          groupedImages[image.product_id] = [];
        }

        groupedImages[image.product_id].push(image);
      });

      setImages(groupedImages);
    }

    setLoading(false);
  }

  const filteredProducts = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return products.filter((product) => {
      const matchesSearch =
        !searchText ||
        product.title.toLowerCase().includes(searchText) ||
        product.category.toLowerCase().includes(searchText) ||
        product.material.toLowerCase().includes(searchText) ||
        (product.description || "").toLowerCase().includes(searchText) ||
        (product.specifications || "").toLowerCase().includes(searchText);

      const matchesCategory =
        category === "All" || product.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-[#f7faf9] text-[#163038]">
      {/* NAVBAR */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button
            onClick={() => router.push("/")}
            className="text-2xl font-bold text-[#187052]"
          >
            EcoMatch
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/marketplace")}
              className="hidden rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 md:block"
            >
              Marketplace
            </button>

            <button
              onClick={() => router.push("/chat/inbox")}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              💬 Messages
            </button>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-[#187052]">
        <div className="mx-auto max-w-7xl px-6 py-12 text-white">
          <p className="mb-2 text-sm font-bold tracking-wide text-green-100">
            BUY SMART. BUY SUSTAINABLE.
          </p>

          <h1 className="text-4xl font-bold">
            Find the materials you need.
          </h1>

          <p className="mt-3 max-w-2xl text-green-100">
            Explore verified recyclable, reusable and industrial materials
            available on EcoMatch.
          </p>

          {/* SEARCH */}
          <div className="mt-7 flex max-w-3xl overflow-hidden rounded-xl bg-white shadow-lg">
            <input
              type="text"
              placeholder="Search aluminium, plastic, wood, specifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-5 py-4 text-[#163038] outline-none placeholder:text-gray-500"
            />

            <button
              onClick={fetchProducts}
              className="bg-[#125c43] px-7 font-semibold text-white hover:bg-[#0e4c37]"
            >
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
          {/* SIDEBAR */}
          <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-[#163038]">
              Categories
            </h2>

            <div className="mt-4 space-y-2">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    category === item
                      ? "bg-[#e1f4ed] font-semibold text-[#187052]"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-8 border-t border-gray-100 pt-5">
              <p className="text-sm font-bold text-[#163038]">
                More Tools
              </p>

              <button
                onClick={() => router.push("/marketplace")}
                className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Advanced Filters
              </button>

              <button
                onClick={() => router.push("/ai-match")}
                className="mt-2 w-full rounded-lg bg-[#187052] px-3 py-2 text-sm font-semibold text-white hover:bg-[#125c43]"
              >
                🤖 AI Matching
              </button>
            </div>
          </aside>

          {/* PRODUCTS */}
          <div>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  Available Materials
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {filteredProducts.length} approved product
                  {filteredProducts.length !== 1 ? "s" : ""} found
                </p>
              </div>

              <button
                onClick={() => router.push("/marketplace")}
                className="text-sm font-semibold text-[#187052] hover:underline"
              >
                Open Full Marketplace →
              </button>
            </div>

            {/* ERROR */}
            {!loading && error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* LOADING */}
            {loading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                <p className="font-semibold text-[#163038]">
                  Loading verified products...
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              /* EMPTY */
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                <div className="text-5xl">♻️</div>

                <h3 className="mt-4 text-lg font-bold">
                  No products found
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Try another search term or category.
                </p>

                <button
                  onClick={() => {
                    setSearch("");
                    setCategory("All");
                  }}
                  className="mt-5 rounded-lg bg-[#187052] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#125c43]"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              /* PRODUCT GRID */
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => {
                  const productImage =
                    images[product.id]?.[0]?.image_url;

                  return (
                    <article
                      key={product.id}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >
                      {/* IMAGE */}
                      <div className="h-48 bg-[#eef3f1]">
                        {productImage ? (
                          <img
                            src={productImage}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <div className="text-center">
                              <div className="text-5xl">
                                📦
                              </div>

                              <p className="mt-2 text-xs text-gray-500">
                                No product image
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* DETAILS */}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-[#187052]">
                              {product.category}
                            </p>

                            <h3 className="mt-1 text-lg font-bold text-[#163038]">
                              {product.title}
                            </h3>
                          </div>

                          <span className="rounded-full bg-[#e1f4ed] px-2.5 py-1 text-xs font-semibold text-[#187052]">
                            Verified
                          </span>
                        </div>

                        <p className="mt-3 text-sm text-gray-600">
                          {product.material}
                        </p>

                        {product.specifications && (
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">
                            {product.specifications}
                          </p>
                        )}

                        <div className="mt-4 flex items-end justify-between gap-4">
                          <div>
                            <p className="text-xs text-gray-500">
                              Expected Price
                            </p>

                            <p className="text-xl font-bold text-[#163038]">
                              ₹{product.price.toLocaleString("en-IN")}
                            </p>

                            {product.is_negotiable && (
                              <p className="text-xs font-semibold text-[#187052]">
                                Negotiable
                              </p>
                            )}
                          </div>

                          <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">
                            {product.condition}
                          </span>
                        </div>

                        <div className="mt-5 border-t border-gray-100 pt-4">
                          <p className="text-xs text-gray-500">
                            Available quantity
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[#163038]">
                            {product.quantity} {product.quantity_unit}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            router.push(`/product/${product.id}`)
                          }
                          className="mt-5 w-full rounded-xl bg-[#187052] py-3 text-sm font-semibold text-white hover:bg-[#125c43]"
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
        </div>
      </section>
    </main>
  );
}