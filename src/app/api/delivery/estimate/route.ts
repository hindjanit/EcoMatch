import { createHash } from 'node:crypto';
import { estimateProductLoad, recommendVehicle, type LoadProduct } from '@/lib/product-load';
import { photoLoad } from '@/lib/product-photo-load';
import { createClient } from '@supabase/supabase-js';
import { estimateDelivery, vehicles, type Vehicle } from '@/lib/delivery-estimate';
import { roadDistance, validPoint } from '@/lib/delivery-route';

export const runtime = 'nodejs';
const sampleProduct = { title: 'Wooden table', category: 'Furniture', quantity: 1, quantity_unit: 'piece' };
const scanTimes = new Map<string, number>();
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
  const { data: product } = await db.from('products').select('*').eq('id', deal.product_id).maybeSingle();
  const price = deal.agreed_price ?? product?.price;
  if (price === null || price === undefined || !Number.isFinite(Number(price))) throw new RequestError('Product price is unavailable.', 409);
  const loadProduct: LoadProduct = { title: product?.title, description: String(product?.description || '').slice(0, 2000), category: product?.category, material: product?.material, specifications: String(product?.specifications || '').slice(0, 1000), quantity: product?.quantity, quantity_unit: product?.quantity_unit };
  const { data: images } = await db.from('product_images').select('image_url').eq('product_id', deal.product_id).limit(1);
  return { pickup, productAmount: Number(price), sample: false, buyer: user.id === deal.buyer_id, approximate, product: loadProduct, imageUrl: images?.[0]?.image_url || null, weightEstimate: estimateProductLoad(loadProduct) };
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
    if (body.operation === 'scan') {
      if (ctx.sample || !ctx.imageUrl) throw new RequestError('Open a deal with a listing photo to scan its estimated weight.');
      const scanKey = createHash('sha256').update(request.headers.get('authorization') || '').digest('hex');
      const now = Date.now();
      if (now - (scanTimes.get(scanKey) || 0) < 30000) throw new RequestError('Wait 30 seconds before scanning again.', 429);
      for (const [key, time] of scanTimes) if (now - time > 60000) scanTimes.delete(key);
      if (scanTimes.size > 1000) throw new RequestError('Photo estimation is busy. Retry shortly.', 429);
      scanTimes.set(scanKey, now);
      return json({ weightEstimate: await photoLoad(ctx.product, ctx.imageUrl) });
    }
    if (!validPoint(body.destination) || !Object.hasOwn(vehicles, body.vehicle) || typeof body.weight !== 'number') throw new RequestError('Select a delivery location, vehicle and valid weight.');
    const bulky = ctx.weightEstimate?.bulky || body.bulky === true;
    const recommended = recommendVehicle(body.weight, bulky);
    if (!recommended) throw new RequestError('This load needs a custom transport quote.');
    if (bulky && (body.vehicle === 'bike' || body.vehicle === 'van')) throw new RequestError('Bulky items need a goods loader, even if their weight is low.');
    // Never accept a browser-supplied distance, pickup or product price.
    estimateDelivery(1, body.weight, body.vehicle as Vehicle, ctx.productAmount);
    const route = await roadDistance(ctx.pickup, body.destination);
    const quote = estimateDelivery(route.distanceKm, body.weight, body.vehicle as Vehicle, ctx.productAmount);
    return json({ ...quote, ...route, pickup: ctx.pickup, destination: body.destination, approximate: ctx.approximate, sample: ctx.sample });
  } catch (e) {
    return json({ error: e instanceof SyntaxError ? 'Invalid request.' : e instanceof Error ? e.message : 'Estimate unavailable.' }, e instanceof RequestError ? e.status : 400);
  }
}
