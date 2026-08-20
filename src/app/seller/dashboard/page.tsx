"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  title: string;
  category: string;
  price: number;
  quantity: number;
  quantity_unit: string;
  status: string;
  created_at: string;
};

type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  verification_status: string;
};

export default function SellerDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<string, ProductImage[]>>({});

  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
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
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (productError) {
      console.error("SELLER PRODUCT ERROR:", productError);
      setError(productError.message);
      setProducts([]);
      setImages({});
      setLoading(false);
      return;
    }

    const sellerProducts = (data || []) as Product[];

    setProducts(sellerProducts);

    if (sellerProducts.length === 0) {
      setImages({});
      setLoading(false);
      return;
    }

    const productIds = sellerProducts.map((product) => product.id);

    const { data: imageData, error: imageError } = await supabase
      .from("product_images")
      .select("*")
      .in("product_id", productIds);

    if (imageError) {
      console.error("SELLER IMAGE ERROR:", imageError);
      setImages({});
    } else {
      const groupedImages: Record<string, ProductImage[]> = {};

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

  async function deleteProduct(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this listing?"
    );

    if (!confirmed) return;

    setDeletingId(id);

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (deleteError) {
      alert(`Could not delete product: ${deleteError.message}`);
      setDeletingId(null);
      return;
    }

    await loadProducts();
    setDeletingId(null);
  }

  const stats = useMemo(() => {
    const total = products.length;

    const pending = products.filter(
      (product) => product.status === "pending"
    ).length;

    const approved = products.filter(
      (product) => product.status === "approved"
    ).length;

    const rejected = products.filter(
      (product) => product.status === "rejected"
    ).length;

    return {
      total,
      pending,
      approved,
      rejected,
    };
  }, [products]);

  function getStatusClasses(status: string) {
    if (status === "approved") {
      return "border-green-200 bg-green-50 text-green-700";
    }

    if (status === "rejected") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  function getStatusText(status: string) {
    if (status === "approved") {
      return "✓ Approved";
    }

    if (status === "rejected") {
      return "✕ Rejected";
    }

    return "⏳ Pending";
  }

  return (
    <main className="min-h-screen bg-[#f7faf9]">
      {/* HEADER */}
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
              onClick={() => router.push("/seller/add-product")}
              className="rounded-lg bg-[#187052] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125c43]"
            >
              + Add Product
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* Heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold tracking-wide text-[#187052]">
              SELLER DASHBOARD
            </p>

            <h1 className="mt-2 text-3xl font-bold text-[#163038]">
              My Listings
            </h1>

            <p className="mt-2 text-gray-600">
              Manage your products and track their verification status.
            </p>
          </div>

          <button
            onClick={loadProducts}
            className="w-fit rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Listings
            </p>

            <p className="mt-2 text-3xl font-bold text-[#163038]">
              {stats.total}
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
            <p className="text-sm font-medium text-yellow-700">
              Pending Review
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-800">
              {stats.pending}
            </p>
          </div>

          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <p className="text-sm font-medium text-green-700">
              Approved
            </p>

            <p className="mt-2 text-3xl font-bold text-green-800">
              {stats.approved}
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-medium text-red-700">
              Rejected
            </p>

            <p className="mt-2 text-3xl font-bold text-red-800">
              {stats.rejected}
            </p>
          </div>
        </div>

        {/* Error */}
        {!loading && error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-700">
              Could not load your listings.
            </p>

            <p className="mt-1 text-sm text-red-600">
              {error}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">📦</div>

            <p className="mt-4 font-semibold text-[#163038]">
              Loading your listings...
            </p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && products.length === 0 && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="text-6xl">📦</div>

            <h2 className="mt-5 text-xl font-bold text-[#163038]">
              No listings yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Add your first recyclable, reusable or industrial material to
              start selling on EcoMatch.
            </p>

            <button
              onClick={() => router.push("/seller/add-product")}
              className="mt-6 rounded-xl bg-[#187052] px-6 py-3 font-bold text-white hover:bg-[#125c43]"
            >
              + Add First Product
            </button>
          </div>
        )}

        {/* Listings */}
        {!loading && !error && products.length > 0 && (
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {products.map((product) => {
              const productImage =
                images[product.id]?.[0]?.image_url;

              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="grid sm:grid-cols-[180px_1fr]">
                    {/* Image */}
                    <div className="h-52 bg-[#eef3f1] sm:h-full">
                      {productImage ? (
                        <img
                          src={productImage}
                          alt={product.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-48 items-center justify-center">
                          <div className="text-center">
                            <div className="text-5xl">📦</div>

                            <p className="mt-2 text-xs text-gray-500">
                              No image
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wide text-[#187052]">
                            {product.category}
                          </p>

                          <h2 className="mt-1 truncate text-xl font-bold text-[#163038]">
                            {product.title}
                          </h2>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                            product.status
                          )}`}
                        >
                          {getStatusText(product.status)}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">
                            Price
                          </p>

                          <p className="mt-1 font-bold text-[#163038]">
                            ₹
                            {product.price.toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Quantity
                          </p>

                          <p className="mt-1 font-bold text-[#163038]">
                            {product.quantity}{" "}
                            {product.quantity_unit}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-xs text-gray-500">
                        Listed on{" "}
                        {new Date(
                          product.created_at
                        ).toLocaleDateString("en-IN")}
                      </p>

                      {/* Status Info */}
                      {product.status === "pending" && (
                        <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-xs leading-5 text-yellow-700">
                          Your listing is waiting for admin verification.
                        </div>
                      )}

                      {product.status === "approved" && (
                        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-xs leading-5 text-green-700">
                          This product is live on the marketplace.
                        </div>
                      )}

                      {product.status === "rejected" && (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
                          This listing was rejected during verification.
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-5 flex flex-wrap gap-2">
                        {product.status === "approved" && (
                          <button
                            onClick={() =>
                              router.push(`/product/${product.id}`)
                            }
                            className="rounded-lg bg-[#187052] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125c43]"
                          >
                            View Product
                          </button>
                        )}

                        <button
                          onClick={() =>
                            deleteProduct(product.id)
                          }
                          disabled={deletingId === product.id}
                          className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === product.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}