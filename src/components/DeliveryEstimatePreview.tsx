'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, MapPin, Package, Truck } from 'lucide-react';
import { vehicles, type Vehicle } from '@/lib/delivery-estimate';

import type { DeliveryPoint } from '@/lib/delivery-route';
import { useRouter } from 'next/navigation';
import { checkoutKey, type CheckoutPreview } from '@/lib/delivery-checkout';
import { recommendVehicle, type ProductLoad } from '@/lib/product-load';
import { trustFetch, trustPost } from '@/lib/trust/client';
import DeliveryRouteMap from '@/components/DeliveryRouteMap';

const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(paise / 100);
const input = 'mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#151C28] px-4 py-3 text-white';
const primary = 'min-h-12 rounded-xl bg-lime-300 px-5 py-3 font-bold text-[#062016] disabled:opacity-40';
type Context = { pickup: DeliveryPoint; productAmount: number; sample: boolean; buyer: boolean; approximate: boolean; product: { title?: string }; imageUrl: string | null; weightEstimate: ProductLoad | null };
type Estimate = Awaited<ReturnType<typeof import('@/lib/delivery-estimate').estimateDelivery>> & { distanceKm: number; source: string; pickup: DeliveryPoint; destination: DeliveryPoint; approximate: boolean };

export default function DeliveryEstimatePreview({ dealId }: { dealId?: string }) {
  const [context, setContext] = useState<Context | null>(null);
  const [drop, setDrop] = useState('');
  const [destination, setDestination] = useState<DeliveryPoint | null>(null);
  const [suggestions, setSuggestions] = useState<DeliveryPoint[]>([]);
  const [weight, setWeight] = useState('');
  const [loadEstimate, setLoadEstimate] = useState<ProductLoad | null>(null);
  const [bulky, setBulky] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle>('mini');

  const [quote, setQuote] = useState<Estimate | null>(null);
  const [error, setError] = useState('');
  const [locationMessage, setLocationMessage] = useState('');

  const [busy, setBusy] = useState(false);
  const revision = useRef(0);
  const locationRevision = useRef(0);
  const loadRevision = useRef(0);
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
      if (data.weightEstimate) { setLoadEstimate(data.weightEstimate); setWeight(String(data.weightEstimate.suggestedKg)); setBulky(data.weightEstimate.bulky); setVehicle(data.weightEstimate.vehicle || "truck"); }
      if (data.buyer) requestDeviceLocation();
      if (data.buyer && data.imageUrl) {
        setScanBusy(true); setScanMessage('Scanning listing photo for a weight range…');
        const scanRevision = loadRevision.current;
        trustPost('/api/delivery/estimate', { dealId, operation: 'scan' }).then(result => {
          if (!active || scanRevision !== loadRevision.current) return;
          const load: ProductLoad = result.weightEstimate;
          setLoadEstimate(load); setWeight(String(load.suggestedKg)); setBulky(load.bulky); setVehicle(load.vehicle || 'truck');
          setScanMessage('Photo estimate ready. Confirm packaged weight and dimensions with the seller.');
        }).catch(e => { if (active) setScanMessage(e instanceof Error ? e.message : 'Photo scan unavailable. Listing estimate shown instead.'); })
          .finally(() => { if (active) setScanBusy(false); });
      }
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
      const result = await trustPost('/api/delivery/estimate', { dealId, destination, weight: Number(weight), vehicle, bulky });
      if (requestId === revision.current) setQuote(result);
    } catch (e) { if (requestId === revision.current) setError(e instanceof Error ? e.message : 'Could not calculate route.'); }
    finally { if (requestId === revision.current) setBusy(false); }
  }
  function invalidate() { revision.current++; setBusy(false); setQuote(null); setConfirmed(false); setError(''); }
  async function scanPhoto() {
    if (!context?.buyer || !context.imageUrl) return;
    setScanBusy(true); setScanMessage('Scanning listing photo for a weight range…'); invalidate();
    const scanRevision = loadRevision.current;
    try {
      const data = await trustPost('/api/delivery/estimate', { dealId, operation: 'scan' });
      if (scanRevision !== loadRevision.current) return;
      const load: ProductLoad = data.weightEstimate;
      setLoadEstimate(load); setWeight(String(load.suggestedKg)); setBulky(load.bulky); setVehicle(load.vehicle || 'truck');
      setScanMessage('Photo estimate ready. Confirm packaged weight and dimensions with the seller.');
    } catch (e) { setScanMessage(e instanceof Error ? e.message : 'Photo scan unavailable. Use the listing estimate or confirmed weight.'); }
    finally { setScanBusy(false); }
  }
  function openCheckout() {
    if (!quote || !context?.buyer || !confirmed) return;
    if (recipient.trim().length < 2 || !/^[6-9][0-9]{9}$/.test(phone.trim()) || addressLine.trim().length < 5) {
      setError('Enter recipient name, a valid 10-digit Indian mobile number, and house/building details before checkout.'); return;
    }
    const snapshot: CheckoutPreview = { createdAt: Date.now(), dealId, product: context.product.title || 'Material purchase', pickup: quote.pickup.label, destination: quote.destination.label, recipient: recipient.trim(), phone: phone.trim(), addressLine: addressLine.trim(), vehicle: vehicles[vehicle].name, weight: Number(weight), distanceKm: quote.distanceKm, productPaise: quote.productPaise, deliveryPaise: quote.deliveryPaise, servicePaise: quote.servicePaise, totalPaise: quote.totalPaise };
    try { sessionStorage.setItem(checkoutKey, JSON.stringify(snapshot)); router.push('/delivery/checkout'); }
    catch { setError('Allow browser session storage to open the checkout preview.'); }
  }
  if (context && !context.buyer) return <section className="rounded-2xl border border-white/20 p-5 text-white"><h3 className="font-bold">Seller pickup location</h3><p className="mt-3">{context.pickup.label}</p><p className="mt-3 text-sm text-slate-300">The buyer selects the delivery address and proceeds to online checkout. Your saved location is used for pickup.</p></section>;
  return <section className="rounded-3xl border border-emerald-300/30 bg-[#0C101A] p-5 text-white sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-bold tracking-[0.18em] text-lime-300">ECOMATCH DELIVERY</span><span className="rounded-full bg-amber-200 px-3 py-2 text-xs font-bold text-amber-950">DEMO · ESTIMATE & PAYMENT PREVIEW</span></div>
    <h2 className="mt-5 text-2xl font-bold sm:text-3xl">Plan your material delivery.</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Choose where to receive your product, confirm its estimated load and continue to one online checkout. Booking and payment are currently previews.</p>
    <p className="my-6 text-sm text-lime-200">1. Delivery details → 2. Confirm estimate → 3. Payment page</p>
    <div className="grid gap-7 lg:grid-cols-2">
      <form onSubmit={e => { e.preventDefault(); calculate(); }} className="space-y-5">
        <div className="rounded-xl border border-white/20 bg-white/5 p-4"><p className="text-sm font-semibold"><MapPin className="mr-1 inline h-4 w-4"/>Pickup · seller saved location</p><p className="mt-2 text-slate-200">{context?.pickup.label || 'Loading seller pickup…'}</p>{context && <p className="mt-2 text-xs text-slate-400">{context.sample ? 'Standalone demo uses a fixed sample seller pin and ₹15,000 product. Open a deal for its actual seller location and agreed price.' : context.approximate ? 'Seller’s public area pin is approximate. Exact pickup access is needed for a final carrier quote.' : 'Saved seller pin. The buyer cannot change this pickup.'}</p>}</div>
        <div><label className="text-sm font-semibold">Where should we deliver your product?<input className={input} value={drop} maxLength={200} placeholder="Search street, locality and city" onChange={e => { locationRevision.current++; setDrop(e.target.value); setDestination(null); setSuggestions([]); setLocationMessage("Search and select your delivery address."); invalidate(); }} required/></label><button type="button" className="mt-2 min-h-12 rounded-xl border border-lime-300/40 px-4 text-sm text-lime-300" onClick={requestDeviceLocation}>Use my current location</button><p role="status" className="mt-2 text-xs leading-5 text-slate-300">{locationMessage}</p>{suggestions.length > 0 && <ul className="mt-3 overflow-hidden rounded-xl border border-white/20">{suggestions.map((point, i) => <li key={`${point.latitude}-${point.longitude}-${i}`}><button type="button" className="min-h-12 w-full border-b border-white/10 bg-[#151C28] p-3 text-left text-sm hover:bg-white/10" onClick={() => { locationRevision.current++; setDestination(point); setDrop(point.label); setSuggestions([]); setLocationMessage('Delivery pin selected.'); invalidate(); }}>{point.label}</button></li>)}</ul>}</div>
        {destination && <p className="text-xs text-lime-200">Selected delivery pin: {destination.latitude.toFixed(5)}, {destination.longitude.toFixed(5)}</p>}
        <p className="text-xs leading-5 text-slate-400">Distance is calculated from the seller pin to your selected destination by road. Address search uses Photon; route calculation shares the two pins with OSRM/OpenStreetMap. Only the checkout preview stores your entered details in this tab’s session; nothing is saved to your deal.</p>
        <div className="rounded-xl border border-lime-300/20 bg-lime-300/5 p-4"><h3 className="font-bold">Product load & recommended transport</h3><p className="mt-2 text-sm">{context?.product.title || 'Loading product…'}</p>{loadEstimate ? <><p className="mt-3 font-semibold text-lime-200">{loadEstimate.lowKg}–{loadEstimate.highKg} kg · {loadEstimate.source === 'photo' ? 'AI photo estimate' : loadEstimate.source === 'listing' ? 'Listed mass' : 'Category estimate'}</p><p className="mt-2 text-xs leading-5 text-slate-300">{loadEstimate.reason}</p></> : <p className="mt-3 text-sm text-slate-300">Weight cannot be inferred reliably. Scan the listing photo or enter the seller-confirmed packaged weight.</p>}{context?.imageUrl && <button type="button" disabled={scanBusy} onClick={() => void scanPhoto()} className="mt-3 min-h-12 rounded-xl border border-lime-300/50 px-4 text-sm text-lime-200 disabled:opacity-40">{scanBusy ? 'Scanning photo…' : 'Scan product photo for estimated weight'}</button>}<p role="status" className="mt-2 text-xs text-amber-100">{scanMessage}</p><p className="mt-2 text-xs text-slate-400">Photo estimates are not measurements. We start with the upper end of the range. Check dimensions and packaging with the seller.</p></div>
        <label className="block text-sm font-semibold">Estimated total packaged weight (kg)<input className={input} type="number" min="0.1" max="2000" step="0.1" value={weight} onChange={e => { loadRevision.current++; setWeight(e.target.value); const recommended = recommendVehicle(Number(e.target.value), bulky); if (recommended) setVehicle(recommended); invalidate(); }} required/></label>
        <label className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" checked={bulky} disabled={!!loadEstimate?.bulky} onChange={e => { loadRevision.current++; setBulky(e.target.checked); const recommended = recommendVehicle(Number(weight), e.target.checked); if (recommended) setVehicle(recommended); invalidate(); }}/>Bulky furniture / does not fit a small parcel vehicle</label>
        <label className="block text-sm font-semibold"><Truck className="mr-1 inline h-4 w-4"/>Recommended vehicle — you can upgrade<select className={input} value={vehicle} onChange={e => { loadRevision.current++; setVehicle(e.target.value as Vehicle); invalidate(); }}>{Object.entries(vehicles).map(([key, v]) => <option key={key} value={key} disabled={Number(weight) > v.capacity || (bulky && (key === 'bike' || key === 'van'))}>{v.name} · maximum {v.capacity} kg capacity</option>)}</select></label>
        <p className="text-xs text-slate-400">Small parcels can start at 0.1 kg; vehicle capacities are maximums, not minimum order weights. Van preview is conservatively limited to 100 kg; bulky furniture uses a loader.</p>
        <p className="rounded-xl bg-white/5 p-4 text-sm">Product value <strong className="float-right">{context ? money(context.productAmount * 100) : 'Loading…'}</strong></p>
        <p className="text-xs text-slate-400">Product price and pickup come from the server. Weight and vehicle suitability need confirmation before real booking.</p>
        {error && <p role="alert" className="rounded-xl bg-amber-100 p-3 text-sm text-amber-950">{error}</p>}
        <button className={`${primary} w-full`} disabled={busy || scanBusy || !context || !destination} type="submit">{busy ? 'Calculating road route…' : 'Calculate delivery & total'} <ArrowRight className="ml-2 inline h-4 w-4"/></button>
      </form>
      <div className="rounded-2xl border border-white/10 bg-[#151C28] p-5 sm:p-6">
        <Package className="mb-4 h-8 w-8 text-lime-300"/><h3 className="text-xl font-bold">Your delivery estimate</h3>
        {quote ? <><p className="mt-5 text-4xl font-bold text-lime-300">{money(quote.deliveryPaise)}</p><p className="mt-2 text-sm text-lime-200">{quote.distanceKm} km · calculated road distance</p><p className="mt-2 text-sm text-slate-300">Illustrative delivery range: {money(quote.lowPaise)}–{money(quote.highPaise)}</p><div className="my-5"><DeliveryRouteMap pickup={quote.pickup} destination={quote.destination} distanceKm={quote.distanceKm}/></div><div className="my-5 space-y-3 text-sm"><Row label="Vehicle base" value={quote.basePaise}/><Row label={`${quote.distanceKm} km by road × ₹${vehicles[vehicle].perKm}/km`} value={quote.distancePaise}/><Row label="Delivery service fee (10%)" value={quote.servicePaise}/></div><p className="mb-5 text-xs leading-5 text-slate-400">EcoMatch planning estimate, not a carrier tariff. The delivery partner confirms the final booking quote. It excludes GST, tolls, parking, loading labour and waiting charges.</p><div className="mb-5 space-y-3"><label className="block text-sm">Recipient name<input className={input} value={recipient} maxLength={100} autoComplete="name" onChange={e => setRecipient(e.target.value)}/></label><label className="block text-sm">Recipient mobile<input className={input} type="tel" inputMode="numeric" maxLength={10} autoComplete="tel-national" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}/></label><label className="block text-sm">House / flat / building & landmark<input className={input} value={addressLine} maxLength={200} autoComplete="address-line1" onChange={e => setAddressLine(e.target.value)}/></label><label className="flex min-h-12 items-start gap-3 text-sm leading-6"><input className="mt-1" type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>I have checked the delivery pin, load estimate and vehicle size. I understand this opens a payment simulation until a provider is connected.</label><p className="text-lg font-bold text-lime-300">Product + delivery + 10% delivery fee: {money(quote.totalPaise)}</p></div><button type="button" className={`${primary} w-full`} disabled={!confirmed || scanBusy} onClick={openCheckout}>Review payment summary <ArrowRight className="ml-2 inline h-4 w-4"/></button></> : <p className="mt-5 leading-7 text-slate-300">Add your route and load details to see a cost breakdown, then open the checkout preview.</p>}
      </div>
    </div>
  </section>;
}

function Row({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4"><span>{label}</span><strong className="shrink-0">{money(value)}</strong></div>;
}
