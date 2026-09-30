import { estimateProductLoad, getCanonicalWeight, makeLoad, selectSmallestSuitableDeliveryOption, type LoadProduct } from '@/lib/product-load';
import { createClient } from '@supabase/supabase-js';
import { estimateDelivery } from '@/lib/delivery-estimate';
import { roadDistance, validPoint } from '@/lib/delivery-route';

export const runtime = 'nodejs';
const sampleProduct = { title: 'Wooden table', category: 'Furniture', quantity: 1, quantity_unit: 'piece' };
const sample = { pickup: { label: 'Demo seller · Okhla Industrial Area, Delhi', latitude: 28.5308, longitude: 77.2713 }, productAmount: 15000, sample: true, buyer: true, approximate: false, product: sampleProduct as LoadProduct, imageUrl: null as string | null, weightEstimate: estimateProductLoad(sampleProduct) };
class RequestError extends Error { constructor(message: string, public status = 400) { super(message); } }
function json(data: unknown, status = 200) { return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } }); }
async function context(request: Request, dealId: unknown) {
  if (dealId === undefined || dealId === null || dealId === '') return sample;
  if (typeof dealId !== 'string' || !/^[0-9a-f-]{36}$/i.test(dealId)) throw new RequestError('Invalid deal.');
  const token = request.headers.get('authorization')?.replace(/^Bearer /i, '');
  if (!token) throw new RequestError('Please sign in to view this deal estimate.', 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new RequestError('Delivery locations are temporarily unavailable.', 503);
  const db = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: { user }, error: authError } = await db.auth.getUser(token);
  if (authError || !user) throw new RequestError('Please sign in again.', 401);
  const { data: deal, error } = await db.from('deal_requests').select('seller_id,buyer_id,product_id,agreed_price').eq('id', dealId).maybeSingle();
  if (error || !deal || ![deal.buyer_id, deal.seller_id].includes(user.id)) throw new RequestError('This deal is not available to your account.', 403);
  // Authorize the participant before optionally using the server-only key.
  const profilesDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : db;
  let { data: seller } = await profilesDb.from('profiles').select('latitude,longitude,location_name').eq('id', deal.seller_id).maybeSingle();
  let approximate = false;
  if (!seller) {
    const result = await db.from('public_profiles').select('latitude,longitude,location_name').eq('id', deal.seller_id).maybeSingle();
    seller = result.data;
    approximate = true;
  }
  const pickup = { latitude: seller?.latitude, longitude: seller?.longitude, label: seller?.location_name || 'Seller saved pickup location' };
  if (!validPoint(pickup)) throw new RequestError('The seller needs to save a pickup location in their profile before delivery can be estimated.', 409);
  const { data: product } = await db.from('products').select('title,description,category,material,specifications,quantity,quantity_unit,price,ai_estimated_weight_kg,seller_confirmed_weight_kg,ai_weight_bulky').eq('id', deal.product_id).maybeSingle();
  const price = deal.agreed_price ?? product?.price;
  if (price === null || price === undefined || !Number.isFinite(Number(price))) throw new RequestError('Product price is unavailable.', 409);
  const loadProduct: LoadProduct = { title: product?.title, description: String(product?.description || '').slice(0, 2000), category: product?.category, material: product?.material, specifications: String(product?.specifications || '').slice(0, 1000), quantity: product?.quantity, quantity_unit: product?.quantity_unit, ai_estimated_weight_kg: product?.ai_estimated_weight_kg, seller_confirmed_weight_kg: product?.seller_confirmed_weight_kg, ai_weight_bulky: product?.ai_weight_bulky };
  const canonical = getCanonicalWeight(loadProduct);
  const weightEstimate = canonical
    ? makeLoad(
        canonical.weightKg,
        canonical.weightKg,
        canonical.bulky,
        canonical.source,
        canonical.source === 'seller_measured'
          ? 'Seller-provided packaged weight.'
          : 'Vision AI estimated shipment weight. This is not a physical measurement.'
      )
    : estimateProductLoad(loadProduct);
  return { pickup, productAmount: Number(price), sample: false, buyer: user.id === deal.buyer_id, approximate, product: loadProduct, imageUrl: null, weightEstimate };
}
export async function GET(request: Request) {
  try { return json(await context(request, new URL(request.url).searchParams.get('dealId'))); }
  catch (e) { return json({ error: e instanceof RequestError ? e.message : 'Could not load delivery details.' }, e instanceof RequestError ? e.status : 503); }
}
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 4000) throw new RequestError('Request too large.', 413);
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestError('Invalid request.');
    const ctx = await context(request, body.dealId);
    if (!ctx.buyer) throw new RequestError('Only the buyer can choose a delivery address or open checkout.', 403);
    // Disallow buyer photo scanning during delivery workflow
    if (body.operation === 'scan') {
      throw new RequestError('Product AI scanning is managed during seller listing creation. Delivery uses the verified product load.', 400);
    }
    if (!validPoint(body.destination)) {
      throw new RequestError('Please select a valid delivery destination pin.');
    }

    // SERVER-AUTHORITATIVE WEIGHT & VEHICLE DETERMINATION. The bounded
    // category/type estimate is explicitly labelled and is never persisted as a
    // seller measurement or used as a carrier booking weight.
    const canonicalWeight = ctx.weightEstimate?.suggestedKg;
    if (!canonicalWeight || !Number.isFinite(canonicalWeight) || canonicalWeight <= 0) {
      throw new RequestError('Delivery estimate unavailable — product weight could not be determined. Please contact support or the seller.', 422);
    }

    const bulky = Boolean(ctx.weightEstimate?.bulky);
    const vehicleKey = selectSmallestSuitableDeliveryOption(canonicalWeight, bulky);
    if (!vehicleKey) {
      throw new RequestError('This shipment exceeds standard vehicle capacity. A custom logistics quote is required.', 422);
    }

    // Never accept a browser-supplied distance, pickup, weight, vehicle or product price.
    estimateDelivery(1, canonicalWeight, vehicleKey, ctx.productAmount);
    const route = await roadDistance(ctx.pickup, body.destination);
    const quote = estimateDelivery(route.distanceKm, canonicalWeight, vehicleKey, ctx.productAmount);
    return json({
      ...quote,
      ...route,
      vehicle: vehicleKey,
      weightKg: canonicalWeight,
      weightLowKg: ctx.weightEstimate?.lowKg,
      weightHighKg: ctx.weightEstimate?.highKg,
      bulky,
      weightSource: ctx.weightEstimate?.source,
      pickup: ctx.pickup,
      destination: body.destination,
      approximate: ctx.approximate,
      sample: ctx.sample,
    });
  } catch (e) {
    return json({ error: e instanceof SyntaxError ? 'Invalid request.' : e instanceof Error ? e.message : 'Estimate unavailable.' }, e instanceof RequestError ? e.status : 400);
  }
}
