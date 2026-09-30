'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, MapPin, Package, Truck } from 'lucide-react';
import { vehicles, type Vehicle } from '@/lib/delivery-estimate';

import type { DeliveryPoint } from '@/lib/delivery-route';
import { useRouter } from 'next/navigation';
import { checkoutKey, type CheckoutPreview } from '@/lib/delivery-checkout';
import { selectSmallestSuitableDeliveryOption, type ProductLoad } from '@/lib/product-load';
import { trustFetch, trustPost } from '@/lib/trust/client';
import DeliveryRouteMap from '@/components/DeliveryRouteMap';

const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(paise / 100);
const input = 'mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#151C28] px-4 py-3 text-white';
const primary = 'min-h-12 rounded-xl bg-lime-300 px-5 py-3 font-bold text-[#062016] disabled:opacity-40';
type Context = { pickup: DeliveryPoint; productAmount: number; sample: boolean; buyer: boolean; approximate: boolean; product: { title?: string }; imageUrl: string | null; weightEstimate: ProductLoad | null };
type Estimate = Awaited<ReturnType<typeof import('@/lib/delivery-estimate').estimateDelivery>> & { distanceKm: number; source: string; pickup: DeliveryPoint; destination: DeliveryPoint; approximate: boolean; vehicle: Vehicle; weightKg: number };

export default function DeliveryEstimatePreview({ dealId }: { dealId?: string }) {
  const [context, setContext] = useState<Context | null>(null);
  const [drop, setDrop] = useState('');
  const [destination, setDestination] = useState<DeliveryPoint | null>(null);
  const [suggestions, setSuggestions] = useState<DeliveryPoint[]>([]);
  const [loadEstimate, setLoadEstimate] = useState<ProductLoad | null>(null);
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();

  const [quote, setQuote] = useState<Estimate | null>(null);
  const [error, setError] = useState('');
  const [locationMessage, setLocationMessage] = useState('');

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
      setDestination(point); setDrop(point.label); setQuote(null); setBusy(false); setConfirmed(false); setSuggestions([]); revision.current++;
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
      if (data.weightEstimate) {
        setLoadEstimate(data.weightEstimate);
      }
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
    if (!loadEstimate || !loadEstimate.suggestedKg) {
      setError('Delivery estimate unavailable — product weight could not be determined. Please contact support or the seller.');
      return;
    }
    const requestId = ++revision.current;
    setBusy(true); setQuote(null);
    try {
      const result = await trustPost('/api/delivery/estimate', { dealId, destination });
      if (requestId === revision.current) setQuote(result);
    } catch (e) { if (requestId === revision.current) setError(e instanceof Error ? e.message : 'Could not calculate route.'); }
    finally { if (requestId === revision.current) setBusy(false); }
  }

  function invalidate() { revision.current++; setBusy(false); setQuote(null); setConfirmed(false); setError(''); }

  const weightKg = loadEstimate?.suggestedKg ?? 0;
  const isBulky = Boolean(loadEstimate?.bulky);
  const autoVehicleKey = quote?.vehicle || loadEstimate?.vehicle || selectSmallestSuitableDeliveryOption(weightKg, isBulky);
  const autoVehicle = vehicles[autoVehicleKey ?? 'bike'];

  function openCheckout() {
    if (!quote || !context?.buyer || !confirmed) return;
    if (recipient.trim().length < 2 || !/^[6-9][0-9]{9}$/.test(phone.trim()) || addressLine.trim().length < 5) {
      setError('Enter recipient name, a valid 10-digit Indian mobile number, and house/building details before checkout.'); return;
    }
    const snapshot: CheckoutPreview = {
      createdAt: Date.now(),
      dealId,
      product: context.product.title || 'Material purchase',
      pickup: quote.pickup.label,
      destination: quote.destination.label,
      recipient: recipient.trim(),
      phone: phone.trim(),
      addressLine: addressLine.trim(),
      vehicle: autoVehicle?.name || 'Automatically selected service',
      weight: quote.weightKg,
      distanceKm: quote.distanceKm,
      productPaise: quote.productPaise,
      deliveryPaise: quote.deliveryPaise,
      servicePaise: quote.servicePaise,
      totalPaise: quote.totalPaise,
    };
    try { sessionStorage.setItem(checkoutKey, JSON.stringify(snapshot)); router.push('/delivery/checkout'); }
    catch { setError('Allow browser session storage to open the checkout preview.'); }
  }

  if (context && !context.buyer) return <section className="rounded-2xl border border-white/20 p-5 text-white"><h3 className="font-bold">Seller pickup location</h3><p className="mt-3">{context.pickup.label}</p><p className="mt-3 text-sm text-slate-300">The buyer selects the delivery address and proceeds to online checkout. Your saved location is used for pickup.</p></section>;

  return <section className="rounded-3xl border border-emerald-300/30 bg-[#0C101A] p-5 text-white sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-bold tracking-[0.18em] text-lime-300">ECOMATCH DELIVERY</span><span className="rounded-full bg-amber-200 px-3 py-2 text-xs font-bold text-amber-950">DEMO · ESTIMATE & PAYMENT PREVIEW</span></div>
    <h2 className="mt-5 text-2xl font-bold sm:text-3xl">Plan your material delivery.</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Choose where to receive your product, review the verified AI-estimated load and continue to checkout. EcoMatch automatically allocates the optimal delivery transport.</p>
    <p className="my-6 text-sm text-lime-200">1. Delivery details → 2. Confirm estimate → 3. Payment page</p>
    <div className="grid gap-7 lg:grid-cols-2">
      <form onSubmit={e => { e.preventDefault(); calculate(); }} className="space-y-5">
        <div className="rounded-xl border border-white/20 bg-white/5 p-4"><p className="text-sm font-semibold"><MapPin className="mr-1 inline h-4 w-4"/>Pickup · seller saved location</p><p className="mt-2 text-slate-200">{context?.pickup.label || 'Loading seller pickup…'}</p>{context && <p className="mt-2 text-xs text-slate-400">{context.sample ? 'Standalone demo uses a fixed sample seller pin and ₹15,000 product. Open a deal for its actual seller location and agreed price.' : context.approximate ? 'Seller’s public area pin is approximate. Exact pickup access is needed for a final carrier quote.' : 'Saved seller pin. The buyer cannot change this pickup.'}</p>}</div>
        <div><label className="text-sm font-semibold">Where should we deliver your product?<input className={input} value={drop} maxLength={200} placeholder="Search street, locality and city" onChange={e => { locationRevision.current++; setDrop(e.target.value); setDestination(null); setSuggestions([]); setLocationMessage("Search and select your delivery address."); invalidate(); }} required/></label><button type="button" className="mt-2 min-h-12 rounded-xl border border-lime-300/40 px-4 text-sm text-lime-300" onClick={requestDeviceLocation}>Use my current location</button><p role="status" className="mt-2 text-xs leading-5 text-slate-300">{locationMessage}</p>{suggestions.length > 0 && <ul className="mt-3 overflow-hidden rounded-xl border border-white/20">{suggestions.map((point, i) => <li key={`${point.latitude}-${point.longitude}-${i}`}><button type="button" className="min-h-12 w-full border-b border-white/10 bg-[#151C28] p-3 text-left text-sm hover:bg-white/10" onClick={() => { locationRevision.current++; setDestination(point); setDrop(point.label); setSuggestions([]); setLocationMessage('Delivery pin selected.'); invalidate(); }}>{point.label}</button></li>)}</ul>}</div>
        {destination && <p className="text-xs text-lime-200">Selected delivery pin: {destination.latitude.toFixed(5)}, {destination.longitude.toFixed(5)}</p>}
        <p className="text-xs leading-5 text-slate-400">Distance is calculated from the seller pin to your selected destination by road. Address search uses Photon; route calculation shares the two pins with OSRM/OpenStreetMap.</p>
        {/* READ-ONLY CANONICAL SHIPMENT LOAD & AUTO VEHICLE */}
        <div className="rounded-xl border border-lime-300/30 bg-lime-950/20 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-lime-300" />
              Verified Shipment Load
            </h3>
            <span className="rounded-full bg-lime-400/20 border border-lime-400/40 px-2.5 py-0.5 text-xs font-semibold text-lime-300">
              AI Estimated
            </span>
          </div>

          <p className="text-sm text-slate-200 font-medium">{context?.product.title || 'Loading product…'}</p>

          {loadEstimate ? (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-lg bg-black/40 p-3 border border-white/10">
                <span className="text-xs text-slate-400 block">Package Weight</span>
                <span className="text-lg font-bold text-lime-300">{weightKg} kg</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {loadEstimate.source === 'ai' ? 'Canonical AI analysis' : loadEstimate.source === 'listing' ? 'Listing mass' : 'Category planning estimate'}
                </span>
              </div>
              <div className="rounded-lg bg-black/40 p-3 border border-white/10">
                <span className="text-xs text-slate-400 block">Handling Classification</span>
                <span className="text-sm font-semibold text-white mt-1 block">
                  {isBulky ? 'Bulky Freight' : 'Standard Parcel'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {isBulky ? 'Requires goods loader' : 'Standard cargo'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-amber-200 bg-amber-950/40 p-3 rounded-lg border border-amber-500/30">
              Delivery estimate unavailable — product weight could not be determined.
            </p>
          )}

          {/* AUTO-SELECTED CARRIER VEHICLE (READ-ONLY) */}
          <div className="rounded-lg bg-white/5 p-3 border border-white/10 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-lime-300" />
                Allocated Transport Mode
              </span>
              <span className="text-xs text-lime-300 font-semibold">Auto-Selected by EcoMatch</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-white">{autoVehicleKey ? autoVehicle.name : 'Awaiting shipment analysis'}</span>
              {autoVehicleKey && <span className="text-xs text-slate-400">Up to {autoVehicle.capacity} kg</span>}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Automatically determined as the smallest viable option capable of safely carrying this shipment.
            </p>
          </div>
        </div>

        <p className="rounded-xl bg-white/5 p-4 text-sm">Product value <strong className="float-right">{context ? money(context.productAmount * 100) : 'Loading…'}</strong></p>
        {error && <p role="alert" className="rounded-xl bg-amber-100 p-3 text-sm text-amber-950">{error}</p>}
        <button className={`${primary} w-full`} disabled={busy || !context || !destination || !loadEstimate} type="submit">{busy ? 'Calculating road route…' : 'Calculate delivery & total'} <ArrowRight className="ml-2 inline h-4 w-4"/></button>
      </form>
      <div className="rounded-2xl border border-white/10 bg-[#151C28] p-5 sm:p-6">
        <Package className="mb-4 h-8 w-8 text-lime-300"/><h3 className="text-xl font-bold">Your delivery estimate</h3>
        {quote ? <><p className="mt-5 text-4xl font-bold text-lime-300">{money(quote.deliveryPaise)}</p><p className="mt-2 text-sm text-lime-200">{quote.distanceKm} km · calculated road distance</p><p className="mt-2 text-sm text-slate-300">Illustrative delivery range: {money(quote.lowPaise)}–{money(quote.highPaise)}</p><div className="my-5"><DeliveryRouteMap pickup={quote.pickup} destination={quote.destination} distanceKm={quote.distanceKm}/></div><div className="my-5 space-y-3 text-sm"><Row label="Vehicle base" value={quote.basePaise}/><Row label={`${quote.distanceKm} km by road × ₹${autoVehicle.perKm}/km`} value={quote.distancePaise}/><Row label="Delivery service fee (10%)" value={quote.servicePaise}/></div><p className="mb-5 text-xs leading-5 text-slate-400">EcoMatch planning estimate, not a carrier tariff. The delivery partner confirms the final booking quote. It excludes GST, tolls, parking, loading labour and waiting charges.</p><div className="mb-5 space-y-3"><label className="block text-sm">Recipient name<input className={input} value={recipient} maxLength={100} autoComplete="name" onChange={e => setRecipient(e.target.value)}/></label><label className="block text-sm">Recipient mobile<input className={input} type="tel" inputMode="numeric" maxLength={10} autoComplete="tel-national" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}/></label><label className="block text-sm">House / flat / building & landmark<input className={input} value={addressLine} maxLength={200} autoComplete="address-line1" onChange={e => setAddressLine(e.target.value)}/></label><label className="flex min-h-12 items-start gap-3 text-sm leading-6"><input className="mt-1" type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>I have verified the delivery destination and allocated vehicle size. I understand this initiates an authenticated escrow delivery.</label><p className="text-lg font-bold text-lime-300">Product + delivery + 10% delivery fee: {money(quote.totalPaise)}</p></div><button type="button" className={`${primary} w-full`} disabled={!confirmed} onClick={openCheckout}>Review payment summary <ArrowRight className="ml-2 inline h-4 w-4"/></button></> : <p className="mt-5 leading-7 text-slate-300">Add your destination pin to see a cost breakdown, then review the payment summary.</p>}
      </div>
    </div>
  </section>;
}

function Row({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4"><span>{label}</span><strong className="shrink-0">{money(value)}</strong></div>;
}
