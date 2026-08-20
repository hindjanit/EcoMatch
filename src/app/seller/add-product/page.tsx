"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const categories = [
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
  "New",
  "Like New",
  "Good",
  "Used",
  "For Parts / Repair",
];

export default function AddProductPage() {
  const supabase = createClient();
  const router = useRouter();

  // -----------------------------
  // PRODUCT DETAILS
  // -----------------------------

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [material, setMaterial] = useState("");
  const [description, setDescription] = useState("");
  const [specifications, setSpecifications] = useState("");

  const [quantity, setQuantity] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("kg");

  const [price, setPrice] = useState("");
  const [isNegotiable, setIsNegotiable] = useState(false);

  const [condition, setCondition] = useState("");

  // -----------------------------
  // AI CLASSIFICATION
  // -----------------------------

  const [classification, setClassification] = useState<{
    category: string;
    material: string;
    confidence: number;
  } | null>(null);

  // -----------------------------
  // LOCATION
  // -----------------------------

  const [locationName, setLocationName] = useState("");

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [locationLoading, setLocationLoading] = useState(false);

  // -----------------------------
  // IMAGES
  // -----------------------------

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // -----------------------------
  // PAGE STATE
  // -----------------------------

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =====================================================
  // AI MATERIAL CLASSIFICATION
  // =====================================================

  function classifyMaterial() {
    const text = `
      ${title}
      ${material}
      ${description}
      ${specifications}
    `.toLowerCase();

    if (!title.trim() && !material.trim() && !description.trim()) {
      setError(
        "Please enter product title, material or description before classification."
      );
      return;
    }

    setError("");

    let detectedCategory = "Other";
    let detectedMaterial = material.trim() || "Unknown Material";
    let confidence = 70;

    // METALS
    if (
      text.includes("aluminium") ||
      text.includes("aluminum") ||
      text.includes("steel") ||
      text.includes("iron") ||
      text.includes("copper") ||
      text.includes("brass") ||
      text.includes("metal")
    ) {
      detectedCategory = "Metals";
      confidence = 94;

      if (text.includes("aluminium") || text.includes("aluminum")) {
        detectedMaterial = "Aluminium";
        confidence = 97;
      } else if (text.includes("steel")) {
        detectedMaterial = "Steel";
        confidence = 96;
      } else if (text.includes("iron")) {
        detectedMaterial = "Iron";
        confidence = 95;
      } else if (text.includes("copper")) {
        detectedMaterial = "Copper";
        confidence = 96;
      } else if (text.includes("brass")) {
        detectedMaterial = "Brass";
        confidence = 94;
      }
    }

    // PLASTIC
    else if (
      text.includes("plastic") ||
      text.includes("hdpe") ||
      text.includes("pet") ||
      text.includes("pvc") ||
      text.includes("polypropylene")
    ) {
      detectedCategory = "Plastic";
      confidence = 93;

      if (text.includes("hdpe")) {
        detectedMaterial = "HDPE Plastic";
        confidence = 97;
      } else if (text.includes("pvc")) {
        detectedMaterial = "PVC Plastic";
        confidence = 96;
      } else if (text.includes("pet")) {
        detectedMaterial = "PET Plastic";
        confidence = 95;
      } else if (text.includes("polypropylene")) {
        detectedMaterial = "Polypropylene";
        confidence = 95;
      } else {
        detectedMaterial = "Plastic";
      }
    }

    // WOOD
    else if (
      text.includes("wood") ||
      text.includes("timber") ||
      text.includes("plywood") ||
      text.includes("wooden")
    ) {
      detectedCategory = "Wood";
      detectedMaterial = "Wood";
      confidence = 94;
    }

    // ELECTRICAL / E-WASTE
    else if (
      text.includes("circuit") ||
      text.includes("electronic") ||
      text.includes("electrical") ||
      text.includes("computer") ||
      text.includes("pcb") ||
      text.includes("cable") ||
      text.includes("wire") ||
      text.includes("e-waste")
    ) {
      detectedCategory = "Electrical Materials";
      detectedMaterial = "Electronic / Electrical Material";
      confidence = 92;

      if (text.includes("pcb") || text.includes("circuit")) {
        detectedMaterial = "Electronic Circuit / PCB";
        confidence = 96;
      } else if (text.includes("cable") || text.includes("wire")) {
        detectedMaterial = "Electrical Cable / Wire";
        confidence = 94;
      }
    }

    // MACHINERY
    else if (
      text.includes("machine") ||
      text.includes("machinery") ||
      text.includes("motor") ||
      text.includes("pump") ||
      text.includes("gearbox")
    ) {
      detectedCategory = "Machinery & Equipment";
      detectedMaterial = material.trim() || "Machinery Component";
      confidence = 91;
    }

    // CONSTRUCTION
    else if (
      text.includes("cement") ||
      text.includes("brick") ||
      text.includes("concrete") ||
      text.includes("construction") ||
      text.includes("tile")
    ) {
      detectedCategory = "Construction Materials";
      detectedMaterial = material.trim() || "Construction Material";
      confidence = 90;
    }

    // PACKAGING
    else if (
      text.includes("cardboard") ||
      text.includes("packaging") ||
      text.includes("carton") ||
      text.includes("box")
    ) {
      detectedCategory = "Packaging Materials";
      detectedMaterial = text.includes("cardboard")
        ? "Cardboard"
        : "Packaging Material";
      confidence = 91;
    }

    // INDUSTRIAL
    else if (
      text.includes("industrial") ||
      text.includes("factory") ||
      text.includes("fabrication")
    ) {
      detectedCategory = "Industrial Goods";
      detectedMaterial = material.trim() || "Industrial Material";
      confidence = 86;
    }

    setClassification({
      category: detectedCategory,
      material: detectedMaterial,
      confidence,
    });

    // Automatically set detected category
    setCategory(detectedCategory);
  }

  // =====================================================
  // LOCATION
  // =====================================================

  async function handleUseLocation() {
    setError("");
    setMessage("");

    if (!navigator.geolocation) {
      setError("Your browser does not support location services.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError || !user) {
            setError(
              "Please login again before saving your location."
            );

            setLocationLoading(false);
            return;
          }

          const { error: locationError } = await supabase
            .from("profiles")
            .update({
              latitude: lat,
              longitude: lng,
              location_name:
                locationName.trim() || "Current Location",
            })
            .eq("id", user.id);

          if (locationError) {
            console.error(
              "Location save error:",
              locationError
            );

            setError(
              `Location could not be saved: ${locationError.message}`
            );

            setLocationLoading(false);
            return;
          }

          setLatitude(lat);
          setLongitude(lng);

          setMessage(
            "📍 Seller location saved successfully."
          );
        } catch (locationError) {
          console.error(locationError);

          setError(
            "Something went wrong while saving your location."
          );
        } finally {
          setLocationLoading(false);
        }
      },

      (geoError) => {
        console.error(
          "Geolocation error:",
          geoError
        );

        if (geoError.code === 1) {
          setError(
            "Location permission was denied. Please allow location access in your browser."
          );
        } else if (geoError.code === 2) {
          setError(
            "Your current location could not be determined."
          );
        } else {
          setError(
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
  // IMAGE SELECTION
  // =====================================================

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files || []
    );

    if (files.length === 0) return;

    const validFiles = files.filter((file) => {
      const validType =
        file.type.startsWith("image/");

      const validSize =
        file.size <= 5 * 1024 * 1024;

      return validType && validSize;
    });

    if (validFiles.length !== files.length) {
      setError(
        "Only image files up to 5MB each are allowed."
      );
      return;
    }

    const combinedFiles = [
      ...selectedImages,
      ...validFiles,
    ].slice(0, 5);

    setSelectedImages(combinedFiles);

    const newPreviews = combinedFiles.map(
      (file) => URL.createObjectURL(file)
    );

    setPreviews(newPreviews);

    setError("");
  }

  function removeImage(index: number) {
    const newImages = selectedImages.filter(
      (_, imageIndex) => imageIndex !== index
    );

    setSelectedImages(newImages);

    const newPreviews = newImages.map(
      (file) => URL.createObjectURL(file)
    );

    setPreviews(newPreviews);
  }

  // =====================================================
  // SUBMIT PRODUCT
  // =====================================================

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    // -----------------------------
    // VALIDATION
    // -----------------------------

    if (!title.trim()) {
      setError(
        "Please enter a product title."
      );
      return;
    }

    if (!category) {
      setError(
        "Please select a category."
      );
      return;
    }

    if (!material.trim()) {
      setError(
        "Please enter the material."
      );
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setError(
        "Please enter a valid quantity."
      );
      return;
    }

    if (!price || Number(price) < 0) {
      setError(
        "Please enter a valid price."
      );
      return;
    }

    if (!condition) {
      setError(
        "Please select the product condition."
      );
      return;
    }

    if (!classification) {
      setError(
        "Please classify the material before submitting the listing."
      );
      return;
    }

    if (selectedImages.length === 0) {
      setError(
        "Please upload at least one product image."
      );
      return;
    }

    if (
      latitude === null ||
      longitude === null
    ) {
      setError(
        "Please click 'Use My Current Location' before submitting the listing."
      );
      return;
    }

    setLoading(true);

    try {
      // -----------------------------
      // GET USER
      // -----------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      // -----------------------------
      // UPDATE SELLER LOCATION
      // -----------------------------

      const {
        error: locationUpdateError,
      } = await supabase
        .from("profiles")
        .update({
          latitude,
          longitude,
          location_name:
            locationName.trim() ||
            "Current Location",
        })
        .eq("id", user.id);

      if (locationUpdateError) {
        throw new Error(
          `Location could not be saved: ${locationUpdateError.message}`
        );
      }

      // -----------------------------
      // CREATE PRODUCT
      // -----------------------------

      const {
        data: product,
        error: productError,
      } = await supabase
        .from("products")
        .insert({
          seller_id: user.id,

          title: title.trim(),

          category,

          material: material.trim(),

          description:
            description.trim() || null,

          specifications:
            specifications.trim() || null,

          quantity: Number(quantity),

          quantity_unit: quantityUnit,

          price: Number(price),

          is_negotiable: isNegotiable,

          condition,

          status: "pending",
        })
        .select()
        .single();

      if (
        productError ||
        !product
      ) {
        throw new Error(
          productError?.message ||
            "Could not create product."
        );
      }

      // -----------------------------
      // UPLOAD PRODUCT IMAGES
      // -----------------------------

      for (
        let index = 0;
        index < selectedImages.length;
        index++
      ) {
        const file =
          selectedImages[index];

        const fileExtension =
          file.name
            .split(".")
            .pop()
            ?.toLowerCase() ||
          "jpg";

        const filePath =
          `${user.id}/${product.id}/${Date.now()}-${index}.${fileExtension}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from("product-images")
          .upload(
            filePath,
            file,
            {
              cacheControl: "3600",
              upsert: false,
            }
          );

        if (uploadError) {
          throw new Error(
            `Image upload failed: ${uploadError.message}`
          );
        }

        const {
          data: {
            publicUrl,
          },
        } = supabase.storage
          .from("product-images")
          .getPublicUrl(
            filePath
          );

        const {
          error: imageInsertError,
        } = await supabase
          .from("product_images")
          .insert({
            product_id:
              product.id,

            image_url:
              publicUrl,

            verification_status:
              "pending",
          });

        if (imageInsertError) {
          throw new Error(
            `Image record failed: ${imageInsertError.message}`
          );
        }
      }

      setMessage(
        "✅ Product submitted successfully! It is waiting for admin verification."
      );

      setTimeout(() => {
        router.push(
          "/seller/dashboard"
        );
      }, 1200);
    } catch (submitError) {
      console.error(
        submitError
      );

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while creating the listing."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="min-h-screen bg-[#f7faf9]">

      {/* HEADER */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">

          <button
            onClick={() =>
              router.push(
                "/seller/dashboard"
              )
            }
            className="text-2xl font-bold text-[#187052]"
          >
            EcoMatch
          </button>

          <button
            onClick={() =>
              router.push(
                "/seller/dashboard"
              )
            }
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            ← Dashboard
          </button>

        </div>
      </header>

      {/* FORM */}
      <section className="mx-auto max-w-5xl px-6 py-8">

        <div className="mb-8">

          <p className="text-sm font-bold tracking-wide text-[#187052]">
            SELL MATERIALS
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#163038]">
            Add Product Listing
          </h1>

          <p className="mt-2 text-gray-600">
            Add product details, classify the material and upload authentic images for verification.
          </p>

        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* PRODUCT DETAILS */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <h2 className="text-xl font-bold text-[#163038]">
              Product Details
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              {/* TITLE */}
              <div className="md:col-span-2">

                <label className="text-sm font-semibold text-[#163038]">
                  Product Title *
                </label>

                <input
                  value={title}
                  onChange={(e) => {
                    setTitle(
                      e.target.value
                    );

                    setClassification(
                      null
                    );
                  }}
                  placeholder="e.g. Mild Steel Scrap Sheets"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                />

              </div>

              {/* CATEGORY */}
              <div>

                <label className="text-sm font-semibold text-[#163038]">
                  Category *
                </label>

                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                >

                  <option value="">
                    Select category
                  </option>

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

              {/* MATERIAL */}
              <div>

                <label className="text-sm font-semibold text-[#163038]">
                  Material *
                </label>

                <input
                  value={material}
                  onChange={(e) => {
                    setMaterial(
                      e.target.value
                    );

                    setClassification(
                      null
                    );
                  }}
                  placeholder="e.g. Mild Steel"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                />

              </div>

              {/* QUANTITY */}
              <div>

                <label className="text-sm font-semibold text-[#163038]">
                  Quantity *
                </label>

                <div className="mt-2 flex gap-2">

                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        e.target.value
                      )
                    }
                    placeholder="100"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                  />

                  <select
                    value={quantityUnit}
                    onChange={(e) =>
                      setQuantityUnit(
                        e.target.value
                      )
                    }
                    className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                  >

                    <option value="kg">
                      kg
                    </option>

                    <option value="ton">
                      ton
                    </option>

                    <option value="piece">
                      piece
                    </option>

                    <option value="litre">
                      litre
                    </option>

                    <option value="meter">
                      meter
                    </option>

                    <option value="box">
                      box
                    </option>

                    <option value="unit">
                      unit
                    </option>

                  </select>

                </div>

              </div>

              {/* PRICE */}
              <div>

                <label className="text-sm font-semibold text-[#163038]">
                  Expected Price (₹) *
                </label>

                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) =>
                    setPrice(
                      e.target.value
                    )
                  }
                  placeholder="5000"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                />

                <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">

                  <input
                    type="checkbox"
                    checked={isNegotiable}
                    onChange={(e) =>
                      setIsNegotiable(
                        e.target.checked
                      )
                    }
                    className="h-4 w-4 accent-[#187052]"
                  />

                  Price is negotiable

                </label>

              </div>

              {/* CONDITION */}
              <div>

                <label className="text-sm font-semibold text-[#163038]">
                  Condition *
                </label>

                <select
                  value={condition}
                  onChange={(e) =>
                    setCondition(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                >

                  <option value="">
                    Select condition
                  </option>

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

              {/* DESCRIPTION */}
              <div className="md:col-span-2">

                <label className="text-sm font-semibold text-[#163038]">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(
                      e.target.value
                    );

                    setClassification(
                      null
                    );
                  }}
                  rows={5}
                  placeholder="Describe the material, usage, availability and other important details..."
                  className="mt-2 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                />

              </div>

              {/* SPECIFICATIONS */}
              <div className="md:col-span-2">

                <label className="text-sm font-semibold text-[#163038]">
                  Specifications
                </label>

                <textarea
                  value={specifications}
                  onChange={(e) => {
                    setSpecifications(
                      e.target.value
                    );

                    setClassification(
                      null
                    );
                  }}
                  rows={4}
                  placeholder="Size, grade, dimensions, weight, model number, technical specifications..."
                  className="mt-2 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-[#163038] outline-none focus:border-[#187052]"
                />

              </div>

            </div>
          </div>

          {/* AI CLASSIFICATION */}

          <div className="rounded-2xl border border-[#b9dace] bg-[#f0faf6] p-6 shadow-sm">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-xs font-bold uppercase tracking-wider text-[#187052]">
                  AI-ASSISTED CLASSIFICATION
                </p>

                <h2 className="mt-1 text-xl font-bold text-[#163038]">
                  Waste Material Classification
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Analyze the listing details to identify the material and suitable marketplace category.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  classifyMaterial
                }
                className="rounded-xl bg-[#187052] px-6 py-3 font-bold text-white hover:bg-[#125c43]"
              >
                ✨ Classify Material
              </button>

            </div>

            {classification && (

              <div className="mt-5 rounded-xl border border-green-200 bg-white p-5">

                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

                  <p className="font-bold text-[#163038]">
                    Classification Result
                  </p>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    {classification.confidence}% Confidence
                  </span>

                </div>

                <div className="grid gap-4 md:grid-cols-3">

                  <div>

                    <p className="text-xs font-semibold uppercase text-gray-500">
                      Detected Category
                    </p>

                    <p className="mt-1 font-bold text-[#163038]">
                      {classification.category}
                    </p>

                  </div>

                  <div>

                    <p className="text-xs font-semibold uppercase text-gray-500">
                      Detected Material
                    </p>

                    <p className="mt-1 font-bold text-[#163038]">
                      {classification.material}
                    </p>

                  </div>

                  <div>

                    <p className="text-xs font-semibold uppercase text-gray-500">
                      Classification Status
                    </p>

                    <p className="mt-1 font-bold text-green-700">
                      ✓ Classified
                    </p>

                  </div>

                </div>

                <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
                  Category has been automatically updated using the classification result. Final approval is still performed through EcoMatch verification.
                </p>

              </div>

            )}

          </div>

          {/* SELLER LOCATION */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <div className="flex items-start gap-3">

              <div className="text-3xl">
                📍
              </div>

              <div>

                <h2 className="text-xl font-bold text-[#163038]">
                  Seller Location
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  This location is used to calculate the distance between buyers and your listing.
                </p>

              </div>

            </div>

            <div className="mt-5">

              <label className="text-sm font-semibold text-[#163038]">
                Area / City
              </label>

              <input
                value={locationName}
                onChange={(e) =>
                  setLocationName(
                    e.target.value
                  )
                }
                placeholder="e.g. Noida, Uttar Pradesh"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-[#163038] outline-none placeholder:text-gray-500 focus:border-[#187052]"
              />

            </div>

            <button
              type="button"
              onClick={
                handleUseLocation
              }
              disabled={
                locationLoading
              }
              className="mt-4 rounded-xl bg-[#187052] px-5 py-3 font-semibold text-white hover:bg-[#125c43] disabled:cursor-not-allowed disabled:opacity-60"
            >

              {locationLoading
                ? "Getting Location..."
                : latitude !== null &&
                    longitude !== null
                  ? "✓ Location Saved"
                  : "📍 Use My Current Location"}

            </button>

            {latitude !== null &&
              longitude !== null && (

                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">

                  <p className="text-sm font-semibold text-green-700">
                    ✓ Location ready for distance matching
                  </p>

                  <p className="mt-1 text-xs text-green-600">
                    {locationName.trim() ||
                      "Current Location"}
                  </p>

                </div>

              )}

          </div>

          {/* PRODUCT IMAGES */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <h2 className="text-xl font-bold text-[#163038]">
              Product Images
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Upload authentic photos of the actual product. Maximum 5 images, 5MB each.
            </p>

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#b9dace] bg-[#eef9f4] px-6 py-10 text-center transition hover:bg-[#e4f5ed]">

              <div className="text-5xl">
                📷
              </div>

              <p className="mt-3 font-bold text-[#163038]">
                Upload Product Images
              </p>

              <p className="mt-1 text-sm text-gray-500">
                PNG, JPG, JPEG — up to 5MB each
              </p>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={
                  handleImageChange
                }
                className="hidden"
              />

            </label>

            {previews.length > 0 && (

              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-5">

                {previews.map(
                  (
                    preview,
                    index
                  ) => (

                    <div
                      key={preview}
                      className="relative overflow-hidden rounded-xl border border-gray-200"
                    >

                      <img
                        src={preview}
                        alt={`Product ${index + 1}`}
                        className="h-32 w-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(
                            index
                          )
                        }
                        className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-700"
                      >
                        ✕
                      </button>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

          {/* VERIFICATION */}

          <div className="rounded-2xl border border-[#cfe8dd] bg-[#eef9f4] p-6">

            <h2 className="font-bold text-[#163038]">
              🛡️ EcoMatch Verification
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Your listing, classification and uploaded images will be submitted for verification. Only approved products will appear on the marketplace.
            </p>

          </div>

          {/* ERROR */}

          {error && (

            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>

          )}

          {/* SUCCESS */}

          {message && (

            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
              {message}
            </div>

          )}

          {/* SUBMIT */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/seller/dashboard"
                )
              }
              className="rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                locationLoading
              }
              className="rounded-xl bg-[#187052] px-8 py-3 font-bold text-white shadow-sm hover:bg-[#125c43] disabled:cursor-not-allowed disabled:opacity-60"
            >

              {loading
                ? "Submitting Listing..."
                : "Submit Listing"}

            </button>

          </div>

        </form>

      </section>

    </main>
  );
}