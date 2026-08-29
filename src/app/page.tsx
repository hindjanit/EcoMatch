"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Cpu,
  Fingerprint,
  Leaf,
  LockKeyhole,
  MapPin,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

type PreviewProduct = {
  id: string | number;
  title: string;
  category: string;
  material: string;
  price: number;
  condition: string;
  seller_id: string;
};

type ProductImage = {
  product_id: string | number;
  image_url: string;
};

const fallbackProducts: PreviewProduct[] = [
  {
    id: "demo-1",
    title: "ThinkPad T14 fleet · 12 units",
    category: "Computers & Accessories",
    material: "Enterprise electronics",
    price: 312000,
    condition: "Grade A",
    seller_id: "demo",
  },
  {
    id: "demo-2",
    title: "Aluminium extrusion offcuts",
    category: "Metals",
    material: "6063 aluminium",
    price: 18400,
    condition: "Production surplus",
    seller_id: "demo",
  },
  {
    id: "demo-3",
    title: "Modular office workstations",
    category: "Furniture & Home",
    material: "Wood · steel",
    price: 68000,
    condition: "Good",
    seller_id: "demo",
  },
];

const categoryLinks = [
  { label: "Electronics", icon: Cpu, tone: "bg-[#dff7e7] text-[#184f36]" },
  { label: "Industrial & Business", icon: Building2, tone: "bg-[#e5e4ff] text-[#363378]" },
  { label: "Metals", icon: Boxes, tone: "bg-[#fff0cf] text-[#6a4513]" },
  { label: "Furniture & Home", icon: PackageCheck, tone: "bg-[#e3f0ff] text-[#16486b]" },
];

const trustPoints = [
  {
    icon: Fingerprint,
    label: "Identity verified",
    detail: "Know who you are trading with before the first message.",
  },
  {
    icon: Sparkles,
    label: "AI condition report",
    detail: "Photos become structured condition, defect and pricing signals.",
  },
  {
    icon: LockKeyhole,
    label: "Protected handover",
    detail: "Lock terms, inspect on-site and complete with a secure OTP.",
  },
];

function formatPrice(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function Home() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [requirement, setRequirement] = useState("");
  const [products, setProducts] = useState<PreviewProduct[]>(fallbackProducts);
  const [images, setImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function loadMarketplacePreview() {
      const { data } = await supabase
        .from("products")
        .select("id,title,category,material,price,condition,seller_id")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(3);

      if (!active || !data?.length) return;

      const liveProducts = data as PreviewProduct[];
      setProducts(liveProducts);

      const { data: imageData } = await supabase
        .from("product_images")
        .select("product_id,image_url")
        .in(
          "product_id",
          liveProducts.map((product) => product.id)
        )
        .eq("verification_status", "approved");

      if (!active || !imageData) return;

      const nextImages: Record<string, string> = {};
      (imageData as ProductImage[]).forEach((image) => {
        const key = String(image.product_id);
        if (!nextImages[key]) nextImages[key] = image.image_url;
      });
      setImages(nextImages);
    }

    loadMarketplacePreview();
    return () => {
      active = false;
    };
  }, [supabase]);

  function handleRequirementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = requirement.trim();
    router.push(query ? `/ai-match?requirement=${encodeURIComponent(query)}` : "/ai-match");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f3f4e9] text-[#10251b] selection:bg-[#b9ff66] selection:text-[#10251b]">
      <Navbar />

      <section className="relative isolate px-4 pb-20 pt-32 sm:px-6 sm:pb-28 sm:pt-36 lg:px-8">
        <div className="absolute inset-x-0 top-0 -z-10 h-[720px] overflow-hidden bg-[#0b2118]">
          <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-[#b9ff66]/15 blur-[100px]" />
          <div className="absolute right-[-8rem] top-[-4rem] h-[34rem] w-[34rem] rounded-full border border-white/10" />
          <div className="absolute right-[-2rem] top-[2rem] h-[24rem] w-[24rem] rounded-full border border-[#b9ff66]/15" />
          <div className="home-noise absolute inset-0 opacity-40" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="relative z-10 text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#dfffb8] backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b9ff66] shadow-[0_0_10px_#b9ff66]" />
              India&apos;s trusted circular marketplace
            </div>

            <h1 className="mt-7 max-w-3xl text-[clamp(3.1rem,8vw,6.7rem)] font-black leading-[0.88] tracking-[-0.065em]">
              Waste less.
              <span className="mt-2 block text-[#b9ff66]">Trade smarter.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
              Turn idle equipment and surplus material into verified supply. EcoMatch helps
              businesses discover, evaluate and exchange reusable assets with confidence.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/marketplace"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#b9ff66] px-6 text-sm font-black text-[#10251b] transition hover:bg-[#ccff8f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b9ff66]"
              >
                Explore marketplace
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                href="/seller/add-product"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-6 text-sm font-bold text-white backdrop-blur-xl transition hover:bg-white/10"
              >
                List an asset
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/60">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#b9ff66]" /> AI-assisted listing</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#b9ff66]" /> Verified profiles</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#b9ff66]" /> Secure deal rooms</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[610px] lg:ml-auto">
            <div className="absolute -inset-6 rounded-[3rem] bg-[#b9ff66]/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#f8f9f1] p-3 shadow-[0_40px_100px_rgba(0,0,0,0.38)] sm:p-4">
              <div className="rounded-[1.4rem] bg-[#10251b] p-4 text-white sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b9ff66]">AI sourcing desk</p>
                    <p className="mt-1 text-sm font-bold sm:text-base">What does your business need?</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#b9ff66] text-[#10251b]">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>

                <form onSubmit={handleRequirementSubmit} className="mt-4 flex items-center gap-2 rounded-2xl bg-white p-2 shadow-inner">
                  <Search className="ml-2 h-4 w-4 shrink-0 text-[#587064]" />
                  <input
                    value={requirement}
                    onChange={(event) => setRequirement(event.target.value)}
                    placeholder="e.g. 10 laptops under ₹3 lakh in Noida"
                    aria-label="Describe what material or equipment you need"
                    className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[#10251b] outline-none placeholder:text-[#738279]"
                  />
                  <button
                    type="submit"
                    aria-label="Find matching materials"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#b9ff66] text-[#10251b] transition hover:scale-105"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>

              <div className="grid gap-3 p-2 pt-4 sm:grid-cols-2">
                <div className="relative min-h-56 overflow-hidden rounded-[1.4rem] bg-[#dfe4d2] p-5">
                  <div className="absolute -bottom-16 -right-10 h-52 w-52 rounded-full bg-[#b9ff66]" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#284638]">Live match</span>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#284638]"><MapPin className="h-3 w-3" /> 4.2 km</span>
                    </div>
                    <div className="mt-7 flex h-20 w-28 items-center justify-center rounded-2xl bg-[#172b22] shadow-2xl shadow-[#173d2b]/30">
                      <Cpu className="h-9 w-9 text-[#b9ff66]" />
                    </div>
                    <p className="mt-5 text-lg font-black leading-tight">12 verified<br />business laptops</p>
                  </div>
                </div>

                <div className="flex min-h-56 flex-col justify-between rounded-[1.4rem] bg-[#e6e4ff] p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#35316d] text-white">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-black text-[#35316d]">94% FIT</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#5e5a87]">Fair market estimate</p>
                    <p className="mt-1 text-2xl font-black tracking-tight text-[#24214c]">₹2.8–3.2L</p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/70">
                      <div className="h-full w-[82%] rounded-full bg-[#4a438a]" />
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[#4a438a]"><BadgeCheck className="h-3 w-3" /> Price checked by EcoMatch AI</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-4 hidden items-center gap-3 rounded-2xl border border-white/60 bg-white/90 p-3 pr-5 text-[#10251b] shadow-xl backdrop-blur-xl sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dff7e7] text-[#17623e]"><ShieldCheck className="h-5 w-5" /></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#6a7b71]">Trade status</p><p className="text-xs font-black">Identity + listing verified</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#10251b]/10 bg-[#f3f4e9] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#53675c]">Browse by material stream</p>
          <div className="flex flex-wrap gap-2">
            {categoryLinks.map(({ label, icon: Icon, tone }) => (
              <Link key={label} href={`/marketplace?category=${encodeURIComponent(label)}`} className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold transition hover:-translate-y-0.5 ${tone}`}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4d765f]">Freshly verified</p>
              <h2 className="mt-3 text-4xl font-black leading-none tracking-[-0.045em] sm:text-6xl">Useful assets,<br />already in circulation.</h2>
            </div>
            <Link href="/marketplace" className="group inline-flex items-center gap-2 self-start rounded-full border border-[#10251b]/15 px-5 py-3 text-sm font-black transition hover:bg-[#10251b] hover:text-white md:self-auto">
              View all listings <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {products.map((product, index) => {
              const imageUrl = images[String(product.id)];
              const isDemo = String(product.id).startsWith("demo-");
              const href = isDemo ? "/marketplace" : `/product/${product.id}`;
              const tones = ["bg-[#dfe4d2]", "bg-[#e7e4ff]", "bg-[#ffe9c2]"];

              return (
                <Link key={product.id} href={href} className="group overflow-hidden rounded-[1.75rem] border border-[#10251b]/10 bg-[#fafbf5] p-3 shadow-[0_18px_50px_rgba(30,54,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(30,54,42,0.14)]">
                  <div className={`relative aspect-[4/3] overflow-hidden rounded-[1.25rem] ${tones[index % tones.length]}`}>
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={product.title}
                        fill
                        unoptimized
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-28 w-36 rotate-[-4deg] items-center justify-center rounded-3xl bg-[#10251b] shadow-2xl transition duration-500 group-hover:rotate-0 group-hover:scale-105">
                          {index === 0 ? <Cpu className="h-12 w-12 text-[#b9ff66]" /> : index === 1 ? <Boxes className="h-12 w-12 text-[#b9ff66]" /> : <PackageCheck className="h-12 w-12 text-[#b9ff66]" />}
                        </div>
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#10251b] backdrop-blur">{product.condition}</span>
                    <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-[#10251b] px-2.5 py-1 text-[10px] font-bold text-white"><BadgeCheck className="h-3 w-3 text-[#b9ff66]" /> Verified</span>
                  </div>
                  <div className="p-3 pb-2 pt-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.13em] text-[#63766c]">{product.material || product.category}</p>
                    <h3 className="mt-2 min-h-12 text-lg font-black leading-tight tracking-[-0.02em]">{product.title}</h3>
                    <div className="mt-5 flex items-end justify-between border-t border-[#10251b]/10 pt-4">
                      <div><p className="text-[10px] font-bold uppercase text-[#738279]">Lot price</p><p className="text-xl font-black">{formatPrice(product.price)}</p></div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10251b] text-white transition group-hover:bg-[#b9ff66] group-hover:text-[#10251b]"><ArrowUpRight className="h-4 w-4" /></div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#10251b] px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#b9ff66] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#10251b]"><Zap className="h-3 w-3" /> Trust, built in</div>
            <h2 className="mt-6 text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl">A safer way to say, “let&apos;s make a deal.”</h2>
            <p className="mt-6 max-w-lg text-sm leading-7 text-white/60 sm:text-base">EcoMatch carries trust from the first listing to the physical handover—so circular trade feels as dependable as buying new.</p>
            <Link href="/verify-identity" className="mt-8 inline-flex items-center gap-2 text-sm font-black text-[#b9ff66] hover:text-[#d5ffa3]">See how verification works <ChevronRight className="h-4 w-4" /></Link>
          </div>

          <div className="space-y-3">
            {trustPoints.map(({ icon: Icon, label, detail }, index) => (
              <div key={label} className="group grid gap-5 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6 transition hover:border-[#b9ff66]/35 hover:bg-white/[0.07] sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#b9ff66] text-[#10251b]"><Icon className="h-5 w-5" /></div>
                <div><p className="text-xs font-bold text-[#b9ff66]">0{index + 1}</p><h3 className="mt-1 text-xl font-black">{label}</h3><p className="mt-1 max-w-lg text-sm leading-6 text-white/55">{detail}</p></div>
                <ArrowUpRight className="hidden h-5 w-5 text-white/30 transition group-hover:text-[#b9ff66] sm:block" />
              </div>
            ))}

            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/chat/inbox" className="group rounded-[1.75rem] bg-[#e7e4ff] p-6 text-[#27234d] transition hover:-translate-y-0.5">
                <div className="flex items-center justify-between"><MessageCircle className="h-5 w-5" /><ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></div>
                <p className="mt-10 text-xs font-bold uppercase tracking-wider text-[#655f96]">Private negotiation</p><p className="mt-1 text-xl font-black">Message real people,<br />with product context.</p>
              </Link>
              <Link href="/deals" className="group rounded-[1.75rem] bg-[#b9ff66] p-6 text-[#10251b] transition hover:-translate-y-0.5">
                <div className="flex items-center justify-between"><CircleDollarSign className="h-5 w-5" /><ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></div>
                <p className="mt-10 text-xs font-bold uppercase tracking-wider text-[#42651c]">Secure exchange</p><p className="mt-1 text-xl font-black">Lock the terms.<br />Verify the handover.</p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#e0e3d4] p-7 sm:p-12 lg:p-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10251b] text-[#b9ff66]"><Leaf className="h-5 w-5" /></div>
              <h2 className="mt-7 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl">Your unused asset could be someone else&apos;s next advantage.</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-[#51655a] sm:text-base">List it in minutes. Let AI structure the details. Meet a verified buyer through a protected EcoMatch deal.</p>
            </div>
            <Link href="/signup" className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#10251b] px-7 text-sm font-black text-white transition hover:bg-[#1a392b]">Start circulating <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </main>
  );
}
