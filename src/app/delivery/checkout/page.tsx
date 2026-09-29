'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, CreditCard, LockKeyhole } from 'lucide-react';
import { checkoutKey, parseCheckout, type CheckoutPreview } from '@/lib/delivery-checkout';

const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n / 100);
export default function DeliveryCheckout() {
  const [checkout, setCheckout] = useState<CheckoutPreview | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [method, setMethod] = useState('UPI');
  const [complete, setComplete] = useState(false);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      let value = null;
      try { value = parseCheckout(sessionStorage.getItem(checkoutKey)); if (!value) sessionStorage.removeItem(checkoutKey); } catch { /* storage disabled */ }
      setCheckout(value); setLoaded(true);
    });
    return () => { active = false; };
  }, []);
  const back = checkout?.dealId ? `/deals/${checkout.dealId}` : '/delivery/estimate';
  function finish() {
    if (!checkout || Date.now() - checkout.createdAt > 900000) { setExpired(true); return; }
    try { sessionStorage.removeItem(checkoutKey); } catch { /* no payment or booking is persisted */ }
    setComplete(true);
  }
  return <main className="min-h-screen bg-[#07090E] px-4 py-10 text-white"><div className="mx-auto max-w-5xl"><nav className="mb-8 flex justify-between gap-4"><Link href="/" className="text-xl font-bold text-lime-300">EcoMatch</Link><Link href={back} className="min-h-12 rounded-xl border border-white/20 px-4 py-3 text-sm">Back to delivery</Link></nav><section className="rounded-3xl border border-white/10 bg-[#0C101A] p-5 sm:p-8"><span className="rounded-full bg-amber-200 px-3 py-2 text-xs font-bold text-amber-950">PAYMENT GATEWAY PREVIEW · NO REAL CHARGE</span><h1 className="mt-6 text-3xl font-bold">{complete ? 'Demo checkout finished' : 'One payment. Product + delivery.'}</h1><p className="my-4 text-sm leading-6 text-slate-300">Delivery includes a 10% service fee on transport charges only. This demo does not charge money, reserve a driver or confirm an order.</p>
      {!loaded ? <p>Loading checkout…</p> : !checkout ? <div className="py-8"><p>Your preview is missing or has expired. Create a new delivery estimate first.</p><Link className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-lime-300 px-5 font-bold text-black" href="/delivery/estimate">Get an estimate</Link></div> : complete ? <div role="status" className="py-10 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-lime-300"/><h2 className="mt-5 text-2xl font-bold">No payment collected</h2><p className="mt-3 text-slate-300">{method} checkout preview completed for {money(checkout.totalPaise)}. No delivery was booked.</p><Link className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-lime-300 px-5 font-bold text-black" href={back}>Return to delivery</Link></div> : <div className="mt-8 grid gap-6 md:grid-cols-2"><div><div className="mb-6 rounded-2xl bg-white/5 p-5"><h2 className="font-bold">Deliver to {checkout.recipient}</h2><p className="mt-2 text-sm text-slate-300">{checkout.addressLine}, {checkout.destination}</p><p className="mt-2 text-sm text-slate-300">Phone: {checkout.phone}</p><p className="mt-4 text-xs text-slate-400">Pickup: {checkout.pickup}<br/>{checkout.vehicle} · {checkout.weight} kg estimated · {checkout.distanceKm} km by road</p></div><fieldset><legend className="mb-3 font-bold">Choose payment method</legend>{['UPI', 'Debit / Credit card', 'Net banking'].map(m => <label key={m} className={`mb-3 flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 ${method === m ? 'border-lime-300 bg-lime-300/10' : 'border-white/15'}`}><input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)}/><CreditCard className="h-5 w-5"/>{m}</label>)}</fieldset><p className="mt-4 text-sm leading-6 text-amber-100"><LockKeyhole className="mr-1 inline h-4 w-4"/>Gateway not connected. No card numbers, UPI PINs or banking passwords are requested.</p></div><div className="h-fit rounded-2xl bg-[#151C28] p-6"><h2 className="mb-5 text-xl font-bold">Order summary</h2><p className="mb-4 text-sm text-slate-300">{checkout.product}</p>{[['Product', checkout.productPaise], ['Estimated delivery', checkout.deliveryPaise], ['Service fee (10% of delivery)', checkout.servicePaise], ['Total online payment · Preview', checkout.totalPaise]].map(([label, amount], i) => <div key={label} className={`flex justify-between gap-3 border-b border-white/10 py-3 ${i === 3 ? 'text-lg font-bold text-lime-300' : 'text-sm'}`}><span>{label}</span><span className="shrink-0">{money(Number(amount))}</span></div>)}<p className="my-5 text-xs leading-5 text-slate-400">Indicative transport estimate. Taxes, tolls, parking, loading and waiting are excluded. Preview expires after 15 minutes. Details stay in this tab’s session until demo completion or tab closure.</p>{expired && <p role="alert" className="mb-3 text-amber-200">Estimate expired. Return to delivery and recalculate.</p>}<button className="min-h-12 w-full rounded-xl bg-lime-300 px-4 py-3 font-bold text-[#062016] disabled:opacity-40" disabled={expired} onClick={finish}>Simulate {method} checkout · {money(checkout.totalPaise)}</button><p className="mt-3 text-center text-xs text-slate-400">Demo action only — no real payment</p></div></div>}
    </section></div></main>;
}
