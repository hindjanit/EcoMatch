'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, MapPin, Package, Truck } from 'lucide-react';
import { vehicles, type Vehicle } from '@/lib/delivery-estimate';

import type { DeliveryPoint } from '@/lib/delivery-route';
import { trustFetch, trustPost } from '@/lib/trust/client';

const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(paise / 100);
const input = 'mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#151C28] px-4 py-3 text-white';
const primary = 'min-h-12 rounded-xl bg-lime-300 px-5 py-3 font-bold text-[#062016] disabled:opacity-40';
type Context = { pickup: DeliveryPoint; productAmount: number; sample: boolean; buyer: boolean; approximate: boolean };
type Estimate = Awaited<ReturnType<typeof import('@/lib/delivery-estimate').estimateDelivery>> & { distanceKm: number; source: string; pickup: DeliveryPoint; destination: DeliveryPoint; approximate: boolean };

export default function DeliveryEstimatePreview({ dealId }: { dealId?: string }) {
  const [context, setContext] = useState<Context | null>(null);
  const [drop, setDrop] = useState('');
  const [destination, setDestination] = useState<DeliveryPoint | null>(null);
  const [suggestions, setSuggestions] = useState<DeliveryPoint[]>([]);
  const [weight, setWeight] = useState('100');
  const [vehicle, setVehicle] = useState<Vehicle>('mini');
  const [step, setStep] = useState<'estimate' | 'checkout' | 'complete'>('estimate');
  const [quote, setQuote] = useState<Estimate | null>(null);
  const [error, setError] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [method, setMethod] = useState('UPI');
  const [busy, setBusy] = useState(false);
  const revision = useRef(0);
  const locationRevision = useRef(0);
  const requestDeviceLocation = useCallback(() => {
    const requestId = ++locationRevision.current;
    if (!navigator.geolocation) { setLocationMessage('Device location unavailable. Search your delivery address below.'); return; }
    setLocationMessage('Finding your device location…');
    navigator.geolocation.getCurrentPosition(position => {
      if (requestId !== locationRevision.current) return;
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude, label: 'My current device location' };
      setDestination(point); setDrop(point.label); setQuote(null); setSuggestions([]); revision.current++;
      setLocationMessage(`Device pin selected (accuracy about ${Math.round(position.coords.accuracy)} m). Confirm it or search another address.`);
    }, () => {
      if (requestId === locationRevision.current) setLocationMessage('Location was not available or permission was denied. Search and select your delivery address below.');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }, []);
  useEffect(() => {
    let active = true;
    const locationCounter = locationRevision;
    const quoteCounter = revision;
    trustFetch(`/api/delivery/estimate${dealId ? `?dealId=${encodeURIComponent(dealId)}` : ''}`).then((data: Context) => {
      if (!active) return;
      setContext(data);
      if (data.buyer) requestDeviceLocation();
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Could not load seller location.'); });
    return () => { active = false; locationCounter.current++; quoteCounter.current++; };
  }, [dealId, requestDeviceLocation]);
  useEffect(() => {
    if (destination || drop.trim().length < 3) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/location/search?q=${encodeURIComponent(drop.trim())}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error('Address search unavailable. Retry or use your device location.');
        if (!controller.signal.aborted) {
          setSuggestions(data.suggestions || []);
          setLocationMessage(data.suggestions?.length ? 'Select the matching address below to set the delivery pin.' : 'No matching location found. Try the street, locality and city.');
        }
      } catch (e) { if (!controller.signal.aborted) setLocationMessage(e instanceof Error ? e.message : 'Address search unavailable.'); }
    }, 400);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [drop, destination]);
  async function calculate() {
    setError('');
    if (!context || !destination) { setError('Select a delivery address or allow device location first.'); return; }
    const requestId = ++revision.current;
    setBusy(true); setQuote(null);
    try {
      const result = await trustPost('/api/delivery/estimate', { dealId, destination, weight: Number(weight), vehicle });
      if (requestId === revision.current) setQuote(result);
    } catch (e) { if (requestId === revision.current) setError(e instanceof Error ? e.message : 'Could not calculate route.'); }
    finally { if (requestId === revision.current) setBusy(false); }
  }
  function invalidate() { revision.current++; setBusy(false); setQuote(null); setError(''); }
  return <section className="rounded-3xl border border-emerald-300/30 bg-[#0C101A] p-5 text-white sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-bold tracking-[0.18em] text-lime-300">ECOMATCH DELIVERY</span><span className="rounded-full bg-amber-200 px-3 py-2 text-xs font-bold text-amber-950">DEMO · ESTIMATE & PAYMENT PREVIEW</span></div>
    <h2 className="mt-5 text-2xl font-bold sm:text-3xl">{step === 'estimate' ? 'Plan your material delivery.' : step === 'checkout' ? 'Review your checkout.' : 'Demo walkthrough complete.'}</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{step === 'estimate' ? 'Explore an indicative delivery cost before arranging transport. No carrier is connected and no driver will be booked.' : 'Preview only. No money is collected, no order is placed, and your deal status stays unchanged.'}</p>
    <ol aria-label="Preview progress" className="my-6 flex flex-wrap gap-3 text-sm">{['Delivery estimate', 'Payment preview', 'Demo complete'].map((label, i) => <li key={label} aria-current={i === ['estimate', 'checkout', 'complete'].indexOf(step) ? 'step' : undefined} className={`rounded-full px-3 py-2 ${i === ['estimate', 'checkout', 'complete'].indexOf(step) ? 'bg-lime-300 text-[#062016]' : 'bg-white/10 text-slate-300'}`}>{i + 1}. {label}</li>)}</ol>
    {step === 'estimate' && <div className="grid gap-7 lg:grid-cols-2">
      <form onSubmit={e => { e.preventDefault(); calculate(); }} className="space-y-5">
        <div className="rounded-xl border border-white/20 bg-white/5 p-4"><p className="text-sm font-semibold"><MapPin className="mr-1 inline h-4 w-4"/>Pickup · seller saved location</p><p className="mt-2 text-slate-200">{context?.pickup.label || 'Loading seller pickup…'}</p>{context && <p className="mt-2 text-xs text-slate-400">{context.sample ? 'Standalone demo uses a fixed sample seller pin and ₹15,000 product. Open a deal for its actual seller location and agreed price.' : context.approximate ? 'Seller’s public area pin is approximate. Exact pickup access is needed for a final carrier quote.' : 'Saved seller pin. The buyer cannot change this pickup.'}</p>}</div>
        <div><label className="text-sm font-semibold">Where should we deliver your product?<input className={input} value={drop} maxLength={200} placeholder="Search street, locality and city" onChange={e => { locationRevision.current++; setDrop(e.target.value); setDestination(null); setSuggestions([]); setLocationMessage("Search and select your delivery address."); invalidate(); }} required/></label><button type="button" className="mt-2 min-h-12 rounded-xl border border-lime-300/40 px-4 text-sm text-lime-300" onClick={requestDeviceLocation}>Use my current location</button><p role="status" className="mt-2 text-xs leading-5 text-slate-300">{locationMessage}</p>{suggestions.length > 0 && <ul className="mt-3 overflow-hidden rounded-xl border border-white/20">{suggestions.map((point, i) => <li key={`${point.latitude}-${point.longitude}-${i}`}><button type="button" className="min-h-12 w-full border-b border-white/10 bg-[#151C28] p-3 text-left text-sm hover:bg-white/10" onClick={() => { locationRevision.current++; setDestination(point); setDrop(point.label); setSuggestions([]); setLocationMessage('Delivery pin selected.'); invalidate(); }}>{point.label}</button></li>)}</ul>}</div>
        {destination && <p className="text-xs text-lime-200">Selected delivery pin: {destination.latitude.toFixed(5)}, {destination.longitude.toFixed(5)}</p>}
        <p className="text-xs leading-5 text-slate-400">Distance is calculated from the seller pin to your selected destination by road. Address search uses Photon; route calculation shares the two pins with OSRM/OpenStreetMap. No address is saved by this preview.</p>
        <label className="block text-sm font-semibold">Material weight (kg)<input className={input} type="number" min="1" max={vehicles[vehicle].capacity} step="0.1" value={weight} onChange={e => { setWeight(e.target.value); invalidate(); }} required/></label>
        <label className="block text-sm font-semibold"><Truck className="mr-1 inline h-4 w-4"/>Vehicle<select className={input} value={vehicle} onChange={e => { setVehicle(e.target.value as Vehicle); invalidate(); }}>{Object.entries(vehicles).map(([key, v]) => <option key={key} value={key}>{v.name} · up to {v.capacity} kg</option>)}</select></label>
        <p className="rounded-xl bg-white/5 p-4 text-sm">Product value <strong className="float-right">{context ? money(context.productAmount * 100) : 'Loading…'}</strong></p>
        <p className="text-xs text-slate-400">Product price and pickup come from the server. Weight and vehicle suitability need confirmation before real booking.</p>
        {error && <p role="alert" className="rounded-xl bg-amber-100 p-3 text-sm text-amber-950">{error}</p>}
        <button className={`${primary} w-full`} disabled={busy || !context || !destination} type="submit">{busy ? 'Calculating road route…' : 'Calculate delivery & total'} <ArrowRight className="ml-2 inline h-4 w-4"/></button>
      </form>
      <div className="rounded-2xl border border-white/10 bg-[#151C28] p-5 sm:p-6">
        <Package className="mb-4 h-8 w-8 text-lime-300"/><h3 className="text-xl font-bold">Your delivery estimate</h3>
        {quote ? <><p className="mt-5 text-4xl font-bold text-lime-300">{money(quote.deliveryPaise)}</p><p className="mt-2 text-sm text-lime-200">{quote.distanceKm} km · calculated road distance</p><p className="mt-2 text-sm text-slate-300">Illustrative delivery range: {money(quote.lowPaise)}–{money(quote.highPaise)}</p><div className="my-5 space-y-3 text-sm"><Row label="Vehicle base" value={quote.basePaise}/><Row label={`${quote.distanceKm} km by road × ₹${vehicles[vehicle].perKm}/km`} value={quote.distancePaise}/><Row label="Illustrative service fee (10%)" value={quote.servicePaise}/></div><p className="mb-5 text-xs leading-5 text-slate-400">EcoMatch planning formula, not a Porter or carrier quote. Range is ±20% of this formula, not a guaranteed price. Excludes GST, tolls, parking, loading labour and waiting charges.</p><button className={`${primary} w-full`} onClick={() => setStep('checkout')}>Continue with one total <ArrowRight className="ml-2 inline h-4 w-4"/></button></> : <p className="mt-5 leading-7 text-slate-300">Add your route and load details to see a cost breakdown, then explore the checkout experience.</p>}
      </div>
    </div>}
    {step === 'checkout' && quote && <div className="grid gap-6 lg:grid-cols-2"><div className="space-y-5"><button className="min-h-12 text-sm text-lime-300" onClick={() => setStep('estimate')}><ArrowLeft className="mr-2 inline h-4 w-4"/>Edit estimate</button><div className="rounded-2xl bg-white/5 p-5"><p className="font-semibold">{quote.pickup.label} → {quote.destination.label}</p><p className="mt-2 text-sm text-slate-300">{vehicles[vehicle].name} · {quote.distanceKm} km by road · {weight} kg</p></div><fieldset><legend className="mb-3 font-bold">Explore payment methods</legend><div className="grid gap-3 sm:grid-cols-3">{['UPI', 'Cards', 'Net banking'].map(m => <label key={m} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${method === m ? 'border-lime-300 bg-lime-300/10' : 'border-white/20'}`}><input type="radio" name="payment-preview-method" checked={method === m} onChange={() => setMethod(m)}/>{m}</label>)}</div></fieldset><div className="rounded-xl border border-amber-200/30 p-4 text-sm leading-6 text-amber-100"><CreditCard className="mb-2 h-6 w-6"/>{method} preview — gateway not connected. Do not enter card details, UPI PINs or bank credentials. Real payment will be available after gateway integration.</div></div><div className="rounded-2xl bg-[#151C28] p-6"><h3 className="mb-5 text-xl font-bold">One checkout · Product + delivery</h3><div className="space-y-4 text-sm"><Row label="Product value" value={quote.productPaise}/><Row label="Estimated delivery" value={quote.deliveryPaise}/><Row label="Illustrative service fee" value={quote.servicePaise}/><div className="border-t border-white/20 pt-4 text-lg"><Row label="Combined estimated total" value={quote.totalPaise}/></div></div><p className="my-5 text-xs leading-5 text-slate-400">Excludes applicable taxes and additional transport charges. Product, delivery and service fee are combined into one checkout. This is a preview; payment is not collected.</p><button disabled className="mb-3 min-h-12 w-full rounded-xl border border-white/20 p-3 text-slate-400">Pay {money(quote.totalPaise)} · Coming soon</button><button className={`${primary} w-full`} onClick={() => setStep('complete')}>Finish demo preview</button></div></div>}
    {step === 'complete' && <div role="status" className="rounded-2xl border border-lime-300/30 bg-lime-300/5 p-6 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-lime-300"/><h3 className="mt-4 text-2xl font-bold">Preview finished — no payment made</h3><p className="mx-auto mt-3 max-w-lg leading-7 text-slate-300">You explored the estimate and checkout. No funds were held, no delivery was booked, and no ownership was transferred.</p><button className={`${primary} mt-6`} onClick={() => { setStep('estimate'); setQuote(null); }}>Try another estimate</button></div>}
  </section>;
}

function Row({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4"><span>{label}</span><strong className="shrink-0">{money(value)}</strong></div>;
}
