
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number | string;
  name: string;
  category: string;
  price: number;
  quantity?: number;
  quality?: string;
  condition?: string;
  location?: string;
  description?: string;
  image_url?: string;
  status?: string;
};

export default function BuyerDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "approved")
      .order("id", { ascending: false });

    if (error) {
      console.error("BUYER PRODUCTS ERROR:", error);
      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  };

  const categories = [
    "All",
    "Metals",
    "Plastic",
    "Wood",
    "Industrial Goods",
  ];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name?.toLowerCase().includes(search.toLowerCase()) ||
      product.category?.toLowerCase().includes(search.toLowerCase()) ||
      product.description?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || product.category === category;

    return matchesSearch && matchesCategory;
  });

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* NAVBAR */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-green-700">
              EcoMatch
            </h1>
            <p className="text-xs text-gray-500">
              Smart Marketplace
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100">
              My Chats
            </button>

            <button className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100">
              My Profile
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-green-700">
        <div className="mx-auto max-w-7xl px-6 py-12 text-white">
          <p className="mb-2 text-sm font-medium text-green-100">
            BUY SMART. BUY SUSTAINABLE.
          </p>

          <h2 className="text-4xl font-bold">
            Find the materials you need.
          </h2>

          <p className="mt-3 max-w-2xl text-green-100">
            Discover recyclable, reusable and industrial materials
            from sellers around you.
          </p>

          {/* SEARCH */}
          <div className="mt-7 flex max-w-3xl overflow-hidden rounded-xl bg-white shadow-lg">
            <input
              type="text"
              placeholder="Search for aluminium, plastic, wood..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-5 py-4 text-gray-900 outline-none"
            />

            <button
              onClick={() => fetchProducts()}
              className="bg-green-800 px-7 font-semibold hover:bg-green-900"
            >
              Search
            </button>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          {/* SIDEBAR */}
          <aside className="h-fit rounded-xl border bg-white p-5">
            <h3 className="mb-4 font-semibold">Categories</h3>

            <div className="space-y-2">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    category === item
                      ? "bg-green-100 font-semibold text-green-700"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-8 border-t pt-5">
              <h3 className="mb-3 font-semibold">Quick Filters</h3>

              <button className="mb-2 w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                Price
              </button>

              <button className="mb-2 w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                Distance
              </button>

              <button className="mb-2 w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                Quality
              </button>

              <button className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                Condition
              </button>
            </div>
          </aside>

          {/* PRODUCTS */}
          <div>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  Available Materials
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {filteredProducts.length} approved product
                  {filteredProducts.length !== 1 ? "s" : ""} found
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-xl border bg-white p-10 text-center">
                <p className="text-gray-500">
                  Loading products...
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-xl border bg-white p-10 text-center">
                <div className="text-4xl">♻️</div>

                <h3 className="mt-4 text-lg font-semibold">
                  No products found
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Try another search or category.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    {/* IMAGE */}
                    <div className="flex h-48 items-center justify-center bg-gray-100">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-center text-gray-400">
                          <div className="text-4xl">📦</div>
                          <p className="mt-1 text-sm">
                            No image
                          </p>
                        </div>
                      )}
                    </div>

                    {/* DETAILS */}
                    <div className="p-5">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h3 className="font-semibold">
                          {product.name}
                        </h3>

                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          Approved
                        </span>
                      </div>

                      <p className="text-sm text-gray-500">
                        {product.category}
                      </p>

                      <div className="mt-4">
                        <p className="text-xl font-bold text-green-700">
                          ₹{product.price}
                        </p>

                        {product.quantity !== undefined && (
                          <p className="mt-1 text-sm text-gray-500">
                            Quantity: {product.quantity}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {product.quality && (
                          <span className="rounded-md bg-gray-100 px-2 py-1 text-xs">
                            Quality: {product.quality}
                          </span>
                        )}

                        {product.condition && (
                          <span className="rounded-md bg-gray-100 px-2 py-1 text-xs">
                            {product.condition}
                          </span>
                        )}
                      </div>

                      {product.location && (
                        <p className="mt-3 text-sm text-gray-500">
                          📍 {product.location}
                        </p>
                      )}

                      <button
                        onClick={() =>
                          console.log(
                            "Selected product:",
                            product
                          )
                        }
                        className="mt-5 w-full rounded-lg bg-green-700 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
                      >
                        View Product
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
