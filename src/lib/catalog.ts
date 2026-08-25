export const MARKETPLACE_CATEGORIES = [
  "Mobile Phones",
  "Electronics",
  "Computers & Accessories",
  "Home Appliances",
  "Furniture & Home",
  "Vehicles & Auto Parts",
  "Fashion & Accessories",
  "Books & Education",
  "Sports & Fitness",
  "Toys & Kids",
  "Industrial & Business",
  "Construction Materials",
  "Metals",
  "Plastic",
  "Wood",
  "Electrical Materials",
  "Machinery & Equipment",
  "Packaging Materials",
  "Industrial Goods",
  "Other",
] as const;

export const FILTER_CATEGORIES = ["All", ...MARKETPLACE_CATEGORIES] as const;

export const PRODUCT_CONDITIONS = [
  "New",
  "Like New",
  "Good",
  "Used",
  "For Parts / Repair",
] as const;

export const CATEGORY_CARDS = [
  { name: "Mobile Phones", icon: "◫", detail: "Phones, tablets and accessories" },
  { name: "Electronics", icon: "⌁", detail: "TVs, audio, gadgets and devices" },
  { name: "Furniture & Home", icon: "▰", detail: "Furniture, decor and household items" },
  { name: "Vehicles & Auto Parts", icon: "◇", detail: "Vehicles, spares and accessories" },
  { name: "Computers & Accessories", icon: "▣", detail: "Laptops, PCs, monitors and parts" },
  { name: "Industrial & Business", icon: "⚙", detail: "Machinery, tools and surplus stock" },
  { name: "Construction Materials", icon: "▦", detail: "Tiles, fixtures and site surplus" },
  { name: "Metals", icon: "◈", detail: "Steel, aluminium, copper and scrap" },
] as const;
