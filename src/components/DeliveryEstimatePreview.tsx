'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, MapPin, Package, Truck } from 'lucide-react';
import { estimateDelivery, vehicles, type Vehicle } from '@/lib/delivery-estimate';

const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(paise / 100);
const input = 'mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#151C28] px-4 py-3 text-white';
const primary = 'min-h-12 rounded-xl bg-lime-300 px-5 py-3 font-bold text-[#062016] disabled:opacity-40';
type Estimate = ReturnType<typeof estimateDelivery>;

export default function DeliveryEstimatePreview({ productAmount }: { productAmount?: number }) {
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [distance, setDistance] = useState('12');
  const [weight, setWeight] = useState('100');
  const [amount, setAmount] = useState(String(productAmount ?? 25000));
  const [vehicle, setVehicle] = useState<Vehicle>('mini');
  const [step, setStep] = useState<'estimate' | 'checkout' | 'complete'>('estimate');
  const [quote, setQuote] = useState<Estimate | null>(null);
  const [error, setError] = useState('');
  const [method, setMethod] = useState('UPI');
  function calculate() {
    setError('');
    if (!pickup.trim() || !drop.trim()) { setError('Enter both pickup and delivery areas.'); return; }
    if (!amount.trim()) { setError('Enter the product value, or 0 for delivery only.'); return; }
    try { setQuote(estimateDelivery(Number(distance), Number(weight), vehicle, Number(amount))); }
    catch (e) { setQuote(null); setError(e instanceof Error ? e.message : 'Check your estimate details.'); }
  }
  function invalidate() { setQuote(null); setError(''); }
  return <section className="rounded-3xl border border-emerald-300/30 bg-[#0C101A] p-5 text-white sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-bold tracking-[0.18em] text-lime-300">ECOMATCH DELIVERY</span><span className="rounded-full bg-amber-200 px-3 py-2 text-xs font-bold text-amber-950">DEMO · ESTIMATE & PAYMENT PREVIEW</span></div>
    <h2 className="mt-5 text-2xl font-bold sm:text-3xl">{step === 'estimate' ? 'Plan your material delivery.' : step === 'checkout' ? 'Review your checkout.' : 'Demo walkthrough complete.'}</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{step === 'estimate' ? 'Explore an indicative delivery cost before arranging transport. No carrier is connected and no driver will be booked.' : 'Preview only. No money is collected, no order is placed, and your deal status stays unchanged.'}</p>
    <ol aria-label="Preview progress" className="my-6 flex flex-wrap gap-3 text-sm">{['Delivery estimate', 'Payment preview', 'Demo complete'].map((label, i) => <li key={label} aria-current={i === ['estimate', 'checkout', 'complete'].indexOf(step) ? 'step' : undefined} className={`rounded-full px-3 py-2 ${i === ['estimate', 'checkout', 'complete'].indexOf(step) ? 'bg-lime-300 text-[#062016]' : 'bg-white/10 text-slate-300'}`}>{i + 1}. {label}</li>)}</ol>
    {step === 'estimate' && <div className="grid gap-7 lg:grid-cols-2">
      <form onSubmit={e => { e.preventDefault(); calculate(); }} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold"><MapPin className="mr-1 inline h-4 w-4"/>Pickup area<input className={input} value={pickup} maxLength={120} placeholder="e.g. Okhla, Delhi" onChange={e => { setPickup(e.target.value); invalidate(); }} required/></label><label className="text-sm font-semibold">Delivery area<input className={input} value={drop} maxLength={120} placeholder="e.g. Sector 62, Noida" onChange={e => { setDrop(e.target.value); invalidate(); }} required/></label></div>
        <p className="text-xs leading-5 text-slate-400">Area names stay in this page. Enter the approximate road distance yourself; this preview does not calculate a map route.</p>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Road distance (km)<input className={input} type="number" min="1" max="200" step="0.1" value={distance} onChange={e => { setDistance(e.target.value); invalidate(); }} required/></label><label className="text-sm font-semibold">Material weight (kg)<input className={input} type="number" min="1" max={vehicles[vehicle].capacity} step="0.1" value={weight} onChange={e => { setWeight(e.target.value); invalidate(); }} required/></label></div>
        <label className="block text-sm font-semibold"><Truck className="mr-1 inline h-4 w-4"/>Vehicle<select className={input} value={vehicle} onChange={e => { setVehicle(e.target.value as Vehicle); invalidate(); }}>{Object.entries(vehicles).map(([key, v]) => <option key={key} value={key}>{v.name} · up to {v.capacity} kg</option>)}</select></label>
        <label className="block text-sm font-semibold">Product value (₹)<input className={input} type="number" min="0" max="10000000" step="0.01" value={amount} onChange={e => { setAmount(e.target.value); invalidate(); }} required/></label>
        <p className="text-xs text-slate-400">{productAmount === undefined ? '₹25,000 is an editable sample product value.' : 'Prefilled from this deal; edits affect this preview only.'} Vehicle size and loading needs must be checked before a real booking.</p>
        {error && <p role="alert" className="rounded-xl bg-amber-100 p-3 text-sm text-amber-950">{error}</p>}
        <button className={`${primary} w-full`} type="submit">Calculate estimate <ArrowRight className="ml-2 inline h-4 w-4"/></button>
      </form>
      <div className="rounded-2xl border border-white/10 bg-[#151C28] p-5 sm:p-6">
        <Package className="mb-4 h-8 w-8 text-lime-300"/><h3 className="text-xl font-bold">Your delivery estimate</h3>
        {quote ? <><p className="mt-5 text-4xl font-bold text-lime-300">{money(quote.deliveryPaise)}</p><p className="mt-2 text-sm text-slate-300">Illustrative delivery range: {money(quote.lowPaise)}–{money(quote.highPaise)}</p><div className="my-5 space-y-3 text-sm"><Row label="Vehicle base" value={quote.basePaise}/><Row label={`${distance} km × ₹${vehicles[vehicle].perKm}/km`} value={quote.distancePaise}/><Row label="Illustrative service fee (10%)" value={quote.servicePaise}/></div><p className="mb-5 text-xs leading-5 text-slate-400">EcoMatch planning formula, not a Porter or carrier quote. Range is ±20% of this formula, not a guaranteed price. Excludes GST, tolls, parking, loading labour and waiting charges.</p><button className={`${primary} w-full`} onClick={() => setStep('checkout')}>Open payment preview <ArrowRight className="ml-2 inline h-4 w-4"/></button></> : <p className="mt-5 leading-7 text-slate-300">Add your route and load details to see a cost breakdown, then explore the checkout experience.</p>}
      </div>
    </div>}
    {step === 'checkout' && quote && <div className="grid gap-6 lg:grid-cols-2"><div className="space-y-5"><button className="min-h-12 text-sm text-lime-300" onClick={() => setStep('estimate')}><ArrowLeft className="mr-2 inline h-4 w-4"/>Edit estimate</button><div className="rounded-2xl bg-white/5 p-5"><p className="font-semibold">{pickup} → {drop}</p><p className="mt-2 text-sm text-slate-300">{vehicles[vehicle].name} · {distance} km entered · {weight} kg</p></div><fieldset><legend className="mb-3 font-bold">Explore payment methods</legend><div className="grid gap-3 sm:grid-cols-3">{['UPI', 'Cards', 'Net banking'].map(m => <label key={m} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${method === m ? 'border-lime-300 bg-lime-300/10' : 'border-white/20'}`}><input type="radio" name="payment-preview-method" checked={method === m} onChange={() => setMethod(m)}/>{m}</label>)}</div></fieldset><div className="rounded-xl border border-amber-200/30 p-4 text-sm leading-6 text-amber-100"><CreditCard className="mb-2 h-6 w-6"/>{method} preview — gateway not connected. Do not enter card details, UPI PINs or bank credentials. Real payment will be available after gateway integration.</div></div><div className="rounded-2xl bg-[#151C28] p-6"><h3 className="mb-5 text-xl font-bold">Order summary · Demo</h3><div className="space-y-4 text-sm"><Row label="Product value" value={quote.productPaise}/><Row label="Estimated delivery" value={quote.deliveryPaise}/><Row label="Illustrative service fee" value={quote.servicePaise}/><div className="border-t border-white/20 pt-4 text-lg"><Row label="Estimated total" value={quote.totalPaise}/></div></div><p className="my-5 text-xs leading-5 text-slate-400">Excludes applicable taxes and additional transport charges. This total is an illustration, not a payment request or escrow hold.</p><button disabled className="mb-3 min-h-12 w-full rounded-xl border border-white/20 p-3 text-slate-400">Pay {money(quote.totalPaise)} · Coming soon</button><button className={`${primary} w-full`} onClick={() => setStep('complete')}>Finish demo preview</button></div></div>}
    {step === 'complete' && <div role="status" className="rounded-2xl border border-lime-300/30 bg-lime-300/5 p-6 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-lime-300"/><h3 className="mt-4 text-2xl font-bold">Preview finished — no payment made</h3><p className="mx-auto mt-3 max-w-lg leading-7 text-slate-300">You explored the estimate and checkout. No funds were held, no delivery was booked, and no ownership was transferred.</p><button className={`${primary} mt-6`} onClick={() => { setStep('estimate'); setQuote(null); }}>Try another estimate</button></div>}
  </section>;
}

function Row({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4"><span>{label}</span><strong className="shrink-0">{money(value)}</strong></div>;
}
