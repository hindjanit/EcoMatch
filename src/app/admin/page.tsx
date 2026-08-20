"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);

  const [images, setImages] = useState<
    Record<string, ProductImage[]>
  >({});

  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "info"
  >("info");

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);

  useEffect(() => {
  checkAdminAndLoad();
}, []);

async function checkAdminAndLoad() {
  setLoading(true);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Not logged in
  if (userError || !user) {
    router.replace("/login");
    return;
  }

  // Check role from profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Profile error:", profileError);
    router.replace("/marketplace");
    return;
  }

  // Block buyer/seller
  if (profile.role !== "admin") {
    alert("Access denied. Admin only.");
    router.replace("/marketplace");
    return;
  }

  // Admin verified
  await loadPendingProducts();
}
  const totalImages = useMemo(() => {
    return Object.values(images).reduce(
      (total, productImages) =>
        total + productImages.length,
      0
    );
  }, [images]);

  async function loadPendingProducts() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "ADMIN PRODUCT LOAD ERROR:",
        error
      );

      setMessage(
        `Products load failed: ${error.message}`
      );

      setMessageType("error");
      setLoading(false);
      return;
    }

    const pendingProducts =
      (data || []) as Product[];

    setProducts(pendingProducts);

    if (pendingProducts.length === 0) {
      setImages({});
      setLoading(false);
      return;
    }

    const productIds =
      pendingProducts.map(
        (product) => product.id
      );

    const {
      data: imageData,
      error: imageError,
    } = await supabase
      .from("product_images")
      .select("*")
      .in("product_id", productIds);

    if (imageError) {
      console.error(
        "ADMIN IMAGE LOAD ERROR:",
        imageError
      );

      setMessage(
        `Products loaded, but images failed to load: ${imageError.message}`
      );

      setMessageType("error");
      setImages({});
    } else {
      const groupedImages: Record<
        string,
        ProductImage[]
      > = {};

      (
        (imageData || []) as ProductImage[]
      ).forEach((image) => {
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
      });

      setImages(groupedImages);
    }

    setLoading(false);
  }

  async function updateProductStatus(
    productId: string,
    status: "approved" | "rejected"
  ) {
    const confirmationMessage =
      status === "approved"
        ? "Approve this product and publish it on the marketplace?"
        : "Reject this product listing?";

    const confirmed =
      window.confirm(
        confirmationMessage
      );

    if (!confirmed) {
      return;
    }

    setProcessingId(productId);

    setMessage(
      status === "approved"
        ? "Approving product..."
        : "Rejecting product..."
    );

    setMessageType("info");

    try {
      // --------------------------------
      // UPDATE PRODUCT
      // --------------------------------

      const {
        error: productError,
      } = await supabase
        .from("products")
        .update({
          status,
        })
        .eq("id", productId);

      if (productError) {
        console.error(
          "PRODUCT STATUS ERROR:",
          productError
        );

        setMessage(
          `Product update failed: ${productError.message}`
        );

        setMessageType("error");
        setProcessingId(null);
        return;
      }

      // --------------------------------
      // UPDATE PRODUCT IMAGES
      // --------------------------------

      const {
        error: imageError,
      } = await supabase
        .from("product_images")
        .update({
          verification_status:
            status,
        })
        .eq(
          "product_id",
          productId
        );

      if (imageError) {
        console.error(
          "IMAGE STATUS ERROR:",
          imageError
        );

        setMessage(
          `Product was ${status}, but image verification could not be updated: ${imageError.message}`
        );

        setMessageType("error");

        await loadPendingProducts();

        setProcessingId(null);
        return;
      }

      setMessage(
        status === "approved"
          ? "✅ Product approved successfully and published to the marketplace."
          : "❌ Product rejected successfully."
      );

      setMessageType("success");

      // Remove immediately from screen
      setProducts((current) =>
        current.filter(
          (product) =>
            product.id !==
            productId
        )
      );

      setImages((current) => {
        const updated = {
          ...current,
        };

        delete updated[
          productId
        ];

        return updated;
      });
    } catch (error) {
      console.error(
        "UNEXPECTED ADMIN ERROR:",
        error
      );

      setMessage(
        `Unexpected error: ${
          error instanceof Error
            ? error.message
            : "Unknown error"
        }`
      );

      setMessageType("error");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    router.push("/login");
  }

  function getMessageClasses() {
    if (
      messageType === "success"
    ) {
      return "border-green-200 bg-green-50 text-green-700";
    }

    if (
      messageType === "error"
    ) {
      return "border-red-200 bg-red-50 text-red-700";
    }

    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return (
    <main className="min-h-screen bg-[#f7faf9]">
      {/* HEADER */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <button
              onClick={() =>
                router.push("/")
              }
              className="text-2xl font-bold text-[#187052]"
            >
              EcoMatch
            </button>

            <p className="text-xs font-medium text-gray-500">
              Admin Verification Panel
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                router.push(
                  "/marketplace"
                )
              }
              className="hidden rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 md:block"
            >
              Marketplace
            </button>

            <button
              onClick={
                loadPendingProducts
              }
              disabled={loading}
              className="hidden rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:block"
            >
              ↻ Refresh
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* HEADING */}
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold tracking-wide text-[#187052]">
              TRUST & SAFETY
            </p>

            <h1 className="mt-2 text-3xl font-bold text-[#163038]">
              Pending Product Verification
            </h1>

            <p className="mt-2 max-w-2xl text-gray-600">
              Review seller submissions,
              product information and
              uploaded images before they
              become visible on the
              EcoMatch marketplace.
            </p>
          </div>

          {!loading && (
            <div className="flex gap-3">
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-3">
                <p className="text-xs font-semibold text-yellow-700">
                  Pending
                </p>

                <p className="mt-1 text-2xl font-bold text-yellow-800">
                  {products.length}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white px-5 py-3">
                <p className="text-xs font-semibold text-gray-500">
                  Images to Review
                </p>

                <p className="mt-1 text-2xl font-bold text-[#163038]">
                  {totalImages}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* MESSAGE */}
        {message && (
          <div
            className={`mt-6 rounded-xl border p-4 text-sm font-medium ${getMessageClasses()}`}
          >
            {message}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">
              🛡️
            </div>

            <p className="mt-4 font-semibold text-[#163038]">
              Loading pending
              listings...
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Fetching products and
              verification images.
            </p>
          </div>
        )}

        {/* EMPTY */}
        {!loading &&
          products.length === 0 && (
            <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <div className="text-6xl">
                ✅
              </div>

              <h2 className="mt-5 text-xl font-bold text-[#163038]">
                No pending products
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                All submitted products
                have been reviewed.
              </p>

              <button
                onClick={() =>
                  router.push(
                    "/marketplace"
                  )
                }
                className="mt-6 rounded-xl bg-[#187052] px-6 py-3 text-sm font-semibold text-white hover:bg-[#125c43]"
              >
                View Marketplace
              </button>
            </div>
          )}

        {/* PRODUCTS */}
        {!loading &&
          products.length > 0 && (
            <div className="mt-8 space-y-6">
              {products.map(
                (product) => {
                  const productImages =
                    images[
                      product.id
                    ] || [];

                  const isProcessing =
                    processingId ===
                    product.id;

                  return (
                    <article
                      key={
                        product.id
                      }
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                    >
                      <div className="grid lg:grid-cols-[320px_1fr]">
                        {/* IMAGES */}
                        <div className="border-b border-gray-200 bg-[#eef3f1] p-5 lg:border-b-0 lg:border-r">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-[#163038]">
                              Product Images
                            </p>

                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">
                              {
                                productImages.length
                              }{" "}
                              image
                              {productImages.length !==
                              1
                                ? "s"
                                : ""}
                            </span>
                          </div>

                          {productImages.length >
                          0 ? (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                              {productImages.map(
                                (
                                  image,
                                  index
                                ) => (
                                  <button
                                    type="button"
                                    key={
                                      image.id
                                    }
                                    onClick={() =>
                                      setSelectedImage(
                                        image.image_url
                                      )
                                    }
                                    className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white"
                                  >
                                    <img
                                      src={
                                        image.image_url
                                      }
                                      alt={`${product.title} ${index + 1}`}
                                      className="h-36 w-full object-cover transition group-hover:scale-105"
                                    />

                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-center text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                                      Click to inspect
                                    </div>
                                  </button>
                                )
                              )}
                            </div>
                          ) : (
                            <div className="mt-4 flex h-44 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white">
                              <div className="text-center">
                                <div className="text-4xl">
                                  📷
                                </div>

                                <p className="mt-2 text-xs text-gray-500">
                                  No images uploaded
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-xs leading-5 text-yellow-700">
                            Verify that these
                            images represent
                            the actual product
                            before approval.
                          </div>
                        </div>

                        {/* DETAILS */}
                        <div className="p-6">
                          <div className="flex flex-col justify-between gap-5 md:flex-row">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-[#fff3d6] px-3 py-1 text-xs font-bold text-[#8a6500]">
                                  ⏳ PENDING
                                  REVIEW
                                </span>

                                <span className="rounded-full bg-[#e1f4ed] px-3 py-1 text-xs font-semibold text-[#187052]">
                                  {
                                    product.category
                                  }
                                </span>
                              </div>

                              <h2 className="mt-3 text-2xl font-bold text-[#163038]">
                                {
                                  product.title
                                }
                              </h2>

                              <p className="mt-1 text-sm text-gray-600">
                                {
                                  product.material
                                }
                              </p>

                              <p className="mt-3 text-xs text-gray-400">
                                Seller ID:{" "}
                                {
                                  product.seller_id
                                }
                              </p>
                            </div>

                            <div className="md:text-right">
                              <p className="text-xs text-gray-500">
                                Expected Price
                              </p>

                              <p className="text-2xl font-bold text-[#163038]">
                                ₹
                                {product.price.toLocaleString(
                                  "en-IN"
                                )}
                              </p>

                              {product.is_negotiable && (
                                <p className="mt-1 text-xs font-semibold text-[#187052]">
                                  Negotiable
                                </p>
                              )}
                            </div>
                          </div>

                          {/* QUICK DETAILS */}
                          <div className="mt-6 grid gap-4 rounded-xl bg-[#f7faf9] p-4 sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-gray-500">
                                Quantity
                              </p>

                              <p className="mt-1 font-semibold text-[#163038]">
                                {
                                  product.quantity
                                }{" "}
                                {
                                  product.quantity_unit
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">
                                Condition
                              </p>

                              <p className="mt-1 font-semibold text-[#163038]">
                                {
                                  product.condition
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">
                                Submitted
                              </p>

                              <p className="mt-1 font-semibold text-[#163038]">
                                {new Date(
                                  product.created_at
                                ).toLocaleDateString(
                                  "en-IN"
                                )}
                              </p>
                            </div>
                          </div>

                          {/* SPECIFICATIONS */}
                          <div className="mt-6 rounded-xl border border-gray-200 p-4">
                            <h3 className="text-sm font-bold text-[#163038]">
                              Specifications
                            </h3>

                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                              {product.specifications ||
                                "No specifications provided."}
                            </p>
                          </div>

                          {/* DESCRIPTION */}
                          <div className="mt-4 rounded-xl border border-gray-200 p-4">
                            <h3 className="text-sm font-bold text-[#163038]">
                              Description
                            </h3>

                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                              {product.description ||
                                "No description provided."}
                            </p>
                          </div>

                          {/* CHECKLIST */}
                          <div className="mt-5 rounded-xl border border-[#cfe8dd] bg-[#eef9f4] p-4">
                            <p className="text-sm font-bold text-[#163038]">
                              🛡️ Verification
                              Checklist
                            </p>

                            <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                              <p>
                                ✓ Product
                                details
                                complete
                              </p>

                              <p>
                                ✓ Category
                                and material
                                reviewed
                              </p>

                              <p>
                                ✓ Quantity
                                and price
                                reviewed
                              </p>

                              <p>
                                ✓ Images
                                represent
                                actual
                                product
                              </p>

                              <p>
                                ✓ No
                                misleading
                                content
                              </p>

                              <p>
                                ✓ Suitable
                                for
                                marketplace
                              </p>
                            </div>
                          </div>

                          {/* ACTIONS */}
                          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <button
                              type="button"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                updateProductStatus(
                                  product.id,
                                  "approved"
                                )
                              }
                              className="flex-1 rounded-xl bg-[#187052] py-3 font-semibold text-white hover:bg-[#125c43] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isProcessing
                                ? "Processing..."
                                : "✓ Approve Product"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                updateProductStatus(
                                  product.id,
                                  "rejected"
                                )
                              }
                              className="flex-1 rounded-xl border border-red-300 bg-white py-3 font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isProcessing
                                ? "Processing..."
                                : "✕ Reject Product"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
      </section>

      {/* IMAGE PREVIEW MODAL */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5"
          onClick={() =>
            setSelectedImage(null)
          }
        >
          <div
            className="relative max-h-[90vh] max-w-5xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <img
              src={selectedImage}
              alt="Product verification"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain"
            />

            <button
              type="button"
              onClick={() =>
                setSelectedImage(
                  null
                )
              }
              className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold text-gray-800 shadow-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </main>
  );
}