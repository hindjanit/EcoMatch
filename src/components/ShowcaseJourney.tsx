import Link from "next/link";
import { ArrowRight, CheckCircle2, MapPinned, ShieldCheck, WalletCards } from "lucide-react";

const steps = [
  ["Discover", "Find verified reusable assets near you.", "01"],
  ["Agree", "Lock price and condition in a private deal room.", "02"],
  ["Deliver", "Use seller pickup + buyer destination for a road estimate.", "03"],
  ["Handover", "Inspect on site and complete a protected QR/OTP handover.", "04"],
] as const;

export default function ShowcaseJourney() {
  return <section className="border-y border-[#10251b]/10 bg-[#e7f5de] px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#417553]">Live product walkthrough</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">From surplus to safe reuse.</h2></div><Link href="/marketplace" className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full bg-[#10251b] px-5 text-sm font-bold text-white">Start the journey <ArrowRight className="h-4 w-4"/></Link></div><div className="mt-10 grid gap-3 md:grid-cols-4">{steps.map(([title,detail,count],i)=><article key={title} className="relative rounded-3xl border border-[#10251b]/10 bg-white/80 p-5 shadow-sm"><span className="text-xs font-black text-[#5d8f67]">{count}</span><h3 className="mt-8 text-xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#52645a]">{detail}</p>{i<3&&<ArrowRight className="absolute -right-5 top-1/2 z-10 hidden h-8 w-8 rounded-full bg-[#b9ff66] p-2 text-[#10251b] md:block"/>}</article>)}</div><div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-[#31533d]"><span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4"/> identity & listing signals</span><span className="flex items-center gap-1"><MapPinned className="h-4 w-4"/> route-based planning</span><span className="flex items-center gap-1"><WalletCards className="h-4 w-4"/> transparent total</span><span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4"/> evidence-backed completion</span></div></div></section>;
}
