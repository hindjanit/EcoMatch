"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  async function loadProduct() {
    setLoading(true);
    setError("");

    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("status", "approved")
      .single();

    if (productError) {
      console.error("Product error:", productError);
      setError("Product not found or is not available.");
      setLoading(false);
      return;
    }

    setProduct(productData as Product);

    // Only show approved/verified product images
    const { data: imageData, error: imageError } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .eq("verification_status", "approved");

    if (imageError) {
      console.error("Image error:", imageError);
    } else {
      setImages((imageData || []) as ProductImage[]);
    }

    setLoading(false);
  }

  function openChat() {
    if (!product) {
      alert("Product information is not available.");
      return;
    }

    const currentProductId = String(product.id || "").trim();
    const currentSellerId = String(product.seller_id || "").trim();

    console.log("Opening chat with:", {
      productId: currentProductId,
      sellerId: currentSellerId,
    });

    if (!currentProductId || !currentSellerId) {
      alert("Seller information is missing for this product.");
      return;
    }

    router.push(
      `/chat?product=${encodeURIComponent(
        currentProductId
      )}&seller=${encodeURIComponent(currentSellerId)}`
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7faf9]">
        <p className="font-semibold text-[#187052]">
          Loading product...
        </p>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-[#f7faf9] px-6 py-20">
        <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="text-5xl">📦</div>

          <h1 className="mt-4 text-2xl font-bold text-[#163038]">
            Product Not Available
          </h1>

          <p className="mt-2 text-gray-600">
            {error}
          </p>

          <button
            onClick={() => router.push("/marketplace")}
            className="mt-6 rounded-xl bg-[#187052] px-6 py-3 font-semibold text-white hover:bg-[#125c43]"
          >
            Back to Marketplace
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7faf9]">
      {/* Header */}
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
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              ← Marketplace
            </button>
          </div>
        </div>
      </header>

      {/* Product */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-sm font-semibold text-[#187052] hover:underline"
          >
            ← Back
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Images */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-[#f7faf9]"
                  >
                    <img
                      src={image.image_url}
                      alt={product.title}
                      className="h-72 w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-96 items-center justify-center rounded-xl bg-[#eef3f1]">
                <div className="text-center">
                  <div className="text-6xl">📷</div>

                  <p className="mt-3 text-gray-500">
                    No verified product images
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Main Details */}
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#e1f4ed] px-3 py-1 text-xs font-bold text-[#187052]">
                {product.category}
              </span>

              <span className="rounded-full bg-[#eef3f1] px-3 py-1 text-xs font-semibold text-gray-700">
                {product.condition}
              </span>

              <span className="rounded-full bg-[#e1f4ed] px-3 py-1 text-xs font-semibold text-[#187052]">
                ✓ Verified Listing
              </span>
            </div>

            <h1 className="mt-4 text-4xl font-bold text-[#163038]">
              {product.title}
            </h1>

            <p className="mt-2 text-lg text-gray-600">
              {product.material}
            </p>

            {/* Price */}
            <div className="mt-6">
              <p className="text-sm text-gray-500">
                Price
              </p>

              <p className="text-4xl font-bold text-[#163038]">
                ₹{product.price.toLocaleString("en-IN")}
              </p>

              {product.is_negotiable && (
                <p className="mt-1 text-sm font-semibold text-[#187052]">
                  Price is negotiable
                </p>
              )}
            </div>

            {/* Quick Details */}
            <div className="mt-7 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">
                  Quantity
                </p>

                <p className="mt-1 font-bold text-[#163038]">
                  {product.quantity} {product.quantity_unit}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">
                  Condition
                </p>

                <p className="mt-1 font-bold text-[#163038]">
                  {product.condition}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">
                  Category
                </p>

                <p className="mt-1 font-bold text-[#163038]">
                  {product.category}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">
                  Material
                </p>

                <p className="mt-1 font-bold text-[#163038]">
                  {product.material}
                </p>
              </div>
            </div>

            {/* Chat */}
            <button
              onClick={openChat}
              className="mt-7 w-full rounded-xl bg-[#187052] py-4 text-lg font-bold text-white shadow-sm hover:bg-[#125c43]"
            >
              💬 Chat with Seller / Organisation
            </button>

            <button
              onClick={() => router.push("/ledger")}
              className="mt-3 w-full rounded-xl border border-[#187052] bg-white py-3 font-bold text-[#187052] hover:bg-[#eef9f4]"
            >
              🔗 Verify Ownership Record
            </button>
          </div>
        </div>

        {/* Description & Specifications */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#163038]">
              Product Description
            </h2>

            <p className="mt-4 whitespace-pre-line leading-7 text-gray-600">
              {product.description || "No description provided."}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#163038]">
              Specifications
            </h2>

            <p className="mt-4 whitespace-pre-line leading-7 text-gray-600">
              {product.specifications || "No specifications provided."}
            </p>
          </div>
        </div>

        {/* Trust */}
        <div className="mt-6 rounded-2xl border border-[#cfe8dd] bg-[#eef9f4] p-6">
          <h2 className="text-lg font-bold text-[#163038]">
            🛡️ EcoMatch Verification
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            This product has been reviewed through the EcoMatch verification
            process before being listed on the marketplace.
          </p>
        </div>
      </section>
    </main>
  );
}