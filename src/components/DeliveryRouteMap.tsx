"use client";

import { MapPin, Navigation } from "lucide-react";
import type { DeliveryPoint } from "@/lib/delivery-route";

export default function DeliveryRouteMap({ pickup, destination, distanceKm }: { pickup: DeliveryPoint; destination: DeliveryPoint; distanceKm: number }) {
  const sameHemisphere = Math.sign(pickup.longitude) === Math.sign(destination.longitude);
  const bend = sameHemisphere ? 40 : 58;
  return <section aria-label="Delivery route preview" className="overflow-hidden rounded-2xl border border-sky-300/25 bg-[#07160f] p-4">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-300">Road route preview</p><p className="mt-1 text-sm text-slate-300">Pins are used for the estimate</p></div><span className="rounded-full bg-sky-400/15 px-3 py-1 text-sm font-bold text-sky-200">{distanceKm} km</span></div>
    <svg viewBox="0 0 560 150" className="mt-3 h-32 w-full" role="img" aria-label={`${distanceKm} kilometre route from seller pickup to buyer delivery`}>
      <defs><linearGradient id="route" x1="0" x2="1"><stop stopColor="#a3e635"/><stop offset="1" stopColor="#38bdf8"/></linearGradient></defs>
      <path d={`M70 102 C 180 ${bend}, 365 ${150 - bend}, 490 50`} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="12" strokeLinecap="round"/>
      <path d={`M70 102 C 180 ${bend}, 365 ${150 - bend}, 490 50`} fill="none" stroke="url(#route)" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 8"/>
      <circle cx="70" cy="102" r="17" fill="#a3e635"/><circle cx="490" cy="50" r="17" fill="#38bdf8"/>
      <text x="70" y="108" textAnchor="middle" fill="#082f1b" fontSize="17">↑</text><text x="490" y="56" textAnchor="middle" fill="#082f49" fontSize="17">↓</text>
      <text x="70" y="138" textAnchor="middle" fill="#cbd5e1" fontSize="12">Seller pickup</text><text x="490" y="24" textAnchor="middle" fill="#cbd5e1" fontSize="12">Buyer delivery</text>
    </svg>
    <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2"><p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-lime-300"/><span className="line-clamp-2">{pickup.label}</span></p><p className="flex gap-2"><Navigation className="h-4 w-4 shrink-0 text-sky-300"/><span className="line-clamp-2">{destination.label}</span></p></div>
  </section>;
}
