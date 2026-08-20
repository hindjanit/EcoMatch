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

type SellerLocation = {
  latitude: number;
  longitude: number;
  location_name?: string | null;
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

const conditions = [
  "All",
  "New",
  "Like New",
  "Good",
  "Used",
  "For Parts / Repair",
];

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const earthRadiusKm = 6371;

  const toRadians = (value: number) =>
    (value * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadiusKm * c;
}

export default function MarketplacePage() {
  const supabase = createClient();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<
    Record<string, ProductImage[]>
  >({});

  const [sellerLocations, setSellerLocations] =
    useState<Record<string, SellerLocation>>({});

  const [buyerLatitude, setBuyerLatitude] =
    useState<number | null>(null);

  const [buyerLongitude, setBuyerLongitude] =
    useState<number | null>(null);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationMessage, setLocationMessage] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [condition, setCondition] = useState("All");

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [distance, setDistance] = useState(50);

  const [showFilters, setShowFilters] =
    useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    setMessage("");

    // Approved products
    const {
      data,
      error,
    } = await supabase
      .from("products")
      .select("*")
      .eq("status", "approved")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "PRODUCT FETCH ERROR:",
        error
      );

      setMessage(error.message);
      setProducts([]);
      setImages({});
      setSellerLocations({});
      setLoading(false);
      return;
    }

    const approvedProducts =
      (data || []) as Product[];

    setProducts(approvedProducts);

    if (approvedProducts.length === 0) {
      setImages({});
      setSellerLocations({});
      setLoading(false);
      return;
    }

    // ------------------------------------
    // PRODUCT IMAGES
    // ------------------------------------

    const productIds =
      approvedProducts.map(
        (product) => product.id
      );

    const {
      data: imageData,
      error: imageError,
    } = await supabase
      .from("product_images")
      .select("*")
      .in("product_id", productIds)
      .eq(
        "verification_status",
        "approved"
      );

    if (imageError) {
      console.error(
        "IMAGE FETCH ERROR:",
        imageError
      );

      setImages({});
    } else {
      const groupedImages: Record<
        string,
        ProductImage[]
      > = {};

      (imageData || []).forEach(
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

      setImages(groupedImages);
    }

    // ------------------------------------
    // SELLER LOCATIONS
    // ------------------------------------

    const sellerIds = [
      ...new Set(
        approvedProducts.map(
          (product) =>
            product.seller_id
        )
      ),
    ];

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, latitude, longitude, location_name"
      )
      .in("id", sellerIds);

    if (profileError) {
      console.error(
        "SELLER LOCATION ERROR:",
        profileError
      );

      setSellerLocations({});
    } else {
      const locationMap: Record<
        string,
        SellerLocation
      > = {};

      (profileData || []).forEach(
        (profile) => {
          if (
            profile.latitude !== null &&
            profile.longitude !== null
          ) {
            locationMap[
              profile.id
            ] = {
              latitude:
                Number(
                  profile.latitude
                ),

              longitude:
                Number(
                  profile.longitude
                ),

              location_name:
                profile.location_name,
            };
          }
        }
      );

      setSellerLocations(
        locationMap
      );
    }

    setLoading(false);
  }

  // =====================================================
  // BUYER LOCATION
  // =====================================================

  function handleUseBuyerLocation() {
    setLocationMessage("");

    if (!navigator.geolocation) {
      setLocationMessage(
        "Your browser does not support location services."
      );

      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBuyerLatitude(
          position.coords.latitude
        );

        setBuyerLongitude(
          position.coords.longitude
        );

        setLocationMessage(
          "✓ Your location is active."
        );

        setLocationLoading(false);
      },

      (error) => {
        console.error(
          "Buyer location error:",
          error
        );

        if (error.code === 1) {
          setLocationMessage(
            "Location permission denied. Please allow location access."
          );
        } else if (
          error.code === 2
        ) {
          setLocationMessage(
            "Your location could not be determined."
          );
        } else {
          setLocationMessage(
            "Location request timed out. Please try again."
          );
        }

        setLocationLoading(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }

  // =====================================================
  // PRODUCT DISTANCE
  // =====================================================

  function getProductDistance(
    product: Product
  ) {
    if (
      buyerLatitude === null ||
      buyerLongitude === null
    ) {
      return null;
    }

    const sellerLocation =
      sellerLocations[
        product.seller_id
      ];

    if (!sellerLocation) {
      return null;
    }

    return calculateDistanceKm(
      buyerLatitude,
      buyerLongitude,
      sellerLocation.latitude,
      sellerLocation.longitude
    );
  }

  // =====================================================
  // FILTERS
  // =====================================================

  const filteredProducts =
    useMemo(() => {
      return products.filter(
        (product) => {
          const searchText =
            search
              .toLowerCase()
              .trim();

          const matchesSearch =
            !searchText ||
            product.title
              .toLowerCase()
              .includes(
                searchText
              ) ||
            product.material
              .toLowerCase()
              .includes(
                searchText
              ) ||
            (
              product.description ||
              ""
            )
              .toLowerCase()
              .includes(
                searchText
              ) ||
            (
              product.specifications ||
              ""
            )
              .toLowerCase()
              .includes(
                searchText
              );

          const matchesCategory =
            category === "All" ||
            product.category ===
              category;

          const matchesCondition =
            condition === "All" ||
            product.condition ===
              condition;

          const min =
            minPrice
              ? Number(minPrice)
              : null;

          const max =
            maxPrice
              ? Number(maxPrice)
              : null;

          const matchesMinPrice =
            min === null ||
            product.price >= min;

          const matchesMaxPrice =
            max === null ||
            product.price <= max;

          // --------------------------------
          // REAL DISTANCE FILTER
          // --------------------------------

          let matchesDistance = true;

          if (
            buyerLatitude !==
              null &&
            buyerLongitude !==
              null
          ) {
            const productDistance =
              getProductDistance(
                product
              );

            if (
              productDistance !==
              null
            ) {
              /*
                Slider 0 - 45 means:
                Show products <= selected km.

                50 means:
                50+ mode / don't hide
                products based on upper limit.
              */

              if (distance < 50) {
                matchesDistance =
                  productDistance <=
                  distance;
              }
            } else {
              /*
                Seller has no location.
                If buyer is actively
                filtering below 50km,
                hide listings without
                seller location.
              */

              if (distance < 50) {
                matchesDistance =
                  false;
              }
            }
          }

          return (
            matchesSearch &&
            matchesCategory &&
            matchesCondition &&
            matchesMinPrice &&
            matchesMaxPrice &&
            matchesDistance
          );
        }
      );
    }, [
      products,
      search,
      category,
      condition,
      minPrice,
      maxPrice,
      distance,
      buyerLatitude,
      buyerLongitude,
      sellerLocations,
    ]);

  function clearFilters() {
    setSearch("");
    setCategory("All");
    setCondition("All");
    setMinPrice("");
    setMaxPrice("");
    setDistance(50);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-[#f7faf9]">

      {/* HEADER */}
      <header className="border-b border-gray-200 bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <button
            onClick={() =>
              router.push("/")
            }
            className="text-2xl font-bold text-[#187052]"
          >
            EcoMatch
          </button>

          <div className="flex items-center gap-4">

            <button
              onClick={() =>
                router.push(
                  "/seller/dashboard"
                )
              }
              className="hidden text-sm font-semibold text-gray-700 hover:text-[#187052] md:block"
            >
              Sell Materials
            </button>

            <button
              onClick={() =>
                router.push(
                  "/chat/inbox"
                )
              }
              className="hidden text-sm font-semibold text-gray-700 hover:text-[#187052] md:block"
            >
              Messages
            </button>

            <button
              onClick={
                handleLogout
              }
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>

          </div>

        </div>

      </header>

      {/* HERO */}
      <section className="border-b border-gray-200 bg-white">

        <div className="mx-auto max-w-7xl px-6 py-10">

          <div className="max-w-3xl">

            <p className="text-sm font-bold tracking-wide text-[#187052]">
              VERIFIED INDUSTRIAL
              MARKETPLACE
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#163038] md:text-5xl">
              Find the right material
              for your needs.
            </h1>

            <p className="mt-4 text-lg leading-7 text-gray-600">
              Discover verified industrial
              materials, equipment and
              reusable resources from
              sellers on EcoMatch.
            </p>

          </div>

          {/* SEARCH */}
          <div className="mt-8 flex flex-col gap-3 md:flex-row">

            <div className="flex flex-1 items-center rounded-xl border border-gray-300 bg-white px-4 shadow-sm focus-within:border-[#187052]">

              <span className="mr-3 text-xl">
                🔎
              </span>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search materials, products, specifications..."
                className="w-full py-4 text-[#163038] outline-none placeholder:text-gray-500"
              />

            </div>

            <button
              onClick={() =>
                setShowFilters(
                  !showFilters
                )
              }
              className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-[#163038] hover:bg-gray-50"
            >
              ⚙ Filters
            </button>

          </div>

        </div>

      </section>

      {/* MAIN */}
      <section className="mx-auto max-w-7xl px-6 py-8">

        <div className="grid gap-8 lg:grid-cols-[270px_1fr]">

          {/* FILTERS */}
          <aside
            className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${
              showFilters
                ? "block"
                : "hidden lg:block"
            }`}
          >

            <div className="flex items-center justify-between">

              <h2 className="text-lg font-bold text-[#163038]">
                Filters
              </h2>

              <button
                onClick={
                  clearFilters
                }
                className="text-sm font-semibold text-[#187052] hover:underline"
              >
                Clear
              </button>

            </div>

            {/* CATEGORY */}
            <div className="mt-6">

              <label className="text-sm font-semibold text-[#163038]">
                Category
              </label>

              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value
                  )
                }
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-[#163038] outline-none focus:border-[#187052]"
              >

                {categories.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* PRICE */}
            <div className="mt-6">

              <label className="text-sm font-semibold text-[#163038]">
                Price Range
              </label>

              <div className="mt-2 grid grid-cols-2 gap-2">

                <input
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(e) =>
                    setMinPrice(
                      e.target.value
                    )
                  }
                  placeholder="Min ₹"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#163038] outline-none placeholder:text-gray-500 focus:border-[#187052]"
                />

                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(e) =>
                    setMaxPrice(
                      e.target.value
                    )
                  }
                  placeholder="Max ₹"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#163038] outline-none placeholder:text-gray-500 focus:border-[#187052]"
                />

              </div>

            </div>

            {/* DISTANCE */}
            <div className="mt-6">

              <div className="flex items-center justify-between">

                <label className="text-sm font-semibold text-[#163038]">
                  Maximum Distance
                </label>

                <span className="text-sm font-bold text-[#187052]">
                  {distance >= 50
                    ? "50+ km"
                    : `${distance} km`}
                </span>

              </div>

              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={distance}
                onChange={(e) =>
                  setDistance(
                    Number(
                      e.target.value
                    )
                  )
                }
                className="mt-4 w-full accent-[#187052]"
              />

              <div className="mt-1 flex justify-between text-xs text-gray-500">

                <span>
                  0 km
                </span>

                <span>
                  25 km
                </span>

                <span>
                  50+ km
                </span>

              </div>

              {/* BUYER LOCATION */}
              <button
                type="button"
                onClick={
                  handleUseBuyerLocation
                }
                disabled={
                  locationLoading
                }
                className="mt-4 w-full rounded-lg border border-[#187052] px-3 py-2.5 text-sm font-semibold text-[#187052] hover:bg-[#eef9f4] disabled:cursor-not-allowed disabled:opacity-60"
              >

                {locationLoading
                  ? "Getting Location..."
                  : buyerLatitude !==
                        null &&
                      buyerLongitude !==
                        null
                    ? "✓ Location Active"
                    : "📍 Use My Location"}

              </button>

              {locationMessage && (
                <p
                  className={`mt-2 text-xs ${
                    buyerLatitude !==
                      null &&
                    buyerLongitude !==
                      null
                      ? "font-semibold text-[#187052]"
                      : "text-red-600"
                  }`}
                >
                  {locationMessage}
                </p>
              )}

            </div>

            {/* CONDITION */}
            <div className="mt-6">

              <label className="text-sm font-semibold text-[#163038]">
                Condition
              </label>

              <select
                value={condition}
                onChange={(e) =>
                  setCondition(
                    e.target.value
                  )
                }
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-[#163038] outline-none focus:border-[#187052]"
              >

                {conditions.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* AI */}
            <div className="mt-8 rounded-xl border border-[#cfe8dd] bg-[#eef9f4] p-4">

              <p className="font-bold text-[#163038]">
                🤖 EcoMatch AI
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-600">
                Describe your requirements
                and let EcoMatch find the
                most suitable verified
                listings.
              </p>

          <button
  type="button"
  onClick={() => router.push("/ai-match")}
  className="mt-3 w-full rounded-lg bg-[#187052] px-3 py-2 text-sm font-semibold text-white hover:bg-[#125c43]"
>
  Try AI Matching
</button>

            </div>

          </aside>

          {/* PRODUCTS */}
          <div>

            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

              <div>

                <h2 className="text-xl font-bold text-[#163038]">
                  Available Materials
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  {
                    filteredProducts.length
                  }{" "}
                  product
                  {filteredProducts.length !==
                  1
                    ? "s"
                    : ""}{" "}
                  found
                </p>

              </div>

              {buyerLatitude !==
                null &&
                buyerLongitude !==
                  null && (
                  <div className="rounded-full bg-[#e1f4ed] px-4 py-2 text-xs font-semibold text-[#187052]">
                    📍 Distance matching active
                  </div>
                )}

            </div>

            {/* LOADING */}
            {loading && (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">

                <p className="font-semibold text-[#163038]">
                  Loading products...
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Finding verified listings
                  for you.
                </p>

              </div>
            )}

            {/* MESSAGE */}
            {!loading &&
              message && (
                <div className="mb-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  {message}
                </div>
              )}

            {/* EMPTY */}
            {!loading &&
              filteredProducts.length ===
                0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">

                  <div className="text-5xl">
                    📦
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-[#163038]">
                    No matching products
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
                    Try changing your search,
                    price, distance or other
                    filters.
                  </p>

                  <button
                    onClick={
                      clearFilters
                    }
                    className="mt-5 rounded-lg bg-[#187052] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#125c43]"
                  >
                    Clear Filters
                  </button>

                </div>
              )}

            {/* PRODUCT GRID */}
            {!loading &&
              filteredProducts.length >
                0 && (

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

                  {filteredProducts.map(
                    (product) => {

                      const productImage =
                        images[
                          product.id
                        ]?.[0]
                          ?.image_url;

                      const productDistance =
                        getProductDistance(
                          product
                        );

                      const sellerLocation =
                        sellerLocations[
                          product
                            .seller_id
                        ];

                      return (
                        <article
                          key={
                            product.id
                          }
                          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                        >

                          {/* IMAGE */}
                          <div className="relative h-48 bg-[#eef3f1]">

                            {productImage ? (
                              <img
                                src={
                                  productImage
                                }
                                alt={
                                  product.title
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">

                                <div className="text-center">

                                  <div className="text-5xl">
                                    📦
                                  </div>

                                  <p className="mt-2 text-xs font-medium text-gray-500">
                                    No product image
                                  </p>

                                </div>

                              </div>
                            )}

                            {/* DISTANCE BADGE */}
                            {productDistance !==
                              null && (
                                <div className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-[#187052] shadow-sm">
                                  📍{" "}
                                  {productDistance.toFixed(
                                    1
                                  )}{" "}
                                  km away
                                </div>
                              )}

                          </div>

                          {/* DETAILS */}
                          <div className="p-5">

                            <div className="flex items-start justify-between gap-3">

                              <div>

                                <p className="text-xs font-semibold uppercase tracking-wide text-[#187052]">
                                  {
                                    product.category
                                  }
                                </p>

                                <h3 className="mt-1 text-lg font-bold text-[#163038]">
                                  {
                                    product.title
                                  }
                                </h3>

                              </div>

                              <span className="shrink-0 rounded-full bg-[#e1f4ed] px-2.5 py-1 text-xs font-semibold text-[#187052]">
                                Verified
                              </span>

                            </div>

                            <p className="mt-3 text-sm text-gray-600">
                              {
                                product.material
                              }
                            </p>

                            {/* SELLER LOCATION */}
                            {sellerLocation
                              ?.location_name && (
                                <p className="mt-2 text-xs font-medium text-gray-500">
                                  📍{" "}
                                  {
                                    sellerLocation.location_name
                                  }
                                </p>
                              )}

                            {product.specifications && (
                              <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">
                                {
                                  product.specifications
                                }
                              </p>
                            )}

                            {/* PRICE */}
                            <div className="mt-4 flex items-end justify-between">

                              <div>

                                <p className="text-xs text-gray-500">
                                  Expected price
                                </p>

                                <p className="text-xl font-bold text-[#163038]">
                                  ₹
                                  {product.price.toLocaleString(
                                    "en-IN"
                                  )}
                                </p>

                                {product.is_negotiable && (
                                  <p className="text-xs font-medium text-[#187052]">
                                    Negotiable
                                  </p>
                                )}

                              </div>

                              <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">
                                {
                                  product.condition
                                }
                              </span>

                            </div>

                            {/* QUANTITY */}
                            <div className="mt-5 border-t border-gray-100 pt-4">

                              <p className="text-xs text-gray-500">
                                Available quantity
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

                            {/* VIEW PRODUCT */}
                            <button
                              onClick={() =>
                                router.push(
                                  `/product/${product.id}`
                                )
                              }
                              className="mt-5 w-full rounded-xl bg-[#187052] py-3 text-sm font-semibold text-white hover:bg-[#125c43]"
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

        </div>

      </section>

    </main>
  );
}