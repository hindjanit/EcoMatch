import { vehicles, type Vehicle } from './delivery-estimate';
export type ProductLoad = { lowKg: number; highKg: number; suggestedKg: number; bulky: boolean; source: 'ai' | 'listing' | 'category' | 'photo'; reason: string; vehicle: Vehicle | null };
export type LoadProduct = { title?: string; description?: string; material?: string; category?: string; specifications?: string; quantity?: number; quantity_unit?: string; ai_estimated_weight_kg?: number | string | null; seller_confirmed_weight_kg?: number | string | null; ai_weight_bulky?: boolean | null };
export function recommendVehicle(weight: number, bulky: boolean): Vehicle | null {
  return selectSmallestSuitableDeliveryOption(weight, bulky);
}
export function makeLoad(lowKg: number, highKg: number, bulky: boolean, source: ProductLoad['source'], reason: string): ProductLoad {
  const low = Math.max(0.1, Math.round(lowKg * 10) / 10);
  const high = Math.max(low, Math.ceil(highKg * 10) / 10);
  return { lowKg: low, highKg: high, suggestedKg: high, bulky, source, reason, vehicle: recommendVehicle(high, bulky) };
}
export function extractExplicitWeight(specifications?: string): number | null {
  if (!specifications) return null;
  const match = specifications.match(/Logistics:\s*estimated\s+packaged\s+weight\s+([\d.]+)\s*kg/i);
  if (match) {
    const val = parseFloat(match[1]);
    if (Number.isFinite(val) && val > 0) return Math.round(val * 10) / 10;
  }
  return null;
}
export function getCanonicalWeight(product: LoadProduct): { weightKg: number; bulky: boolean; source: 'ai' } | null {
  const confirmedWeight = Number(product.seller_confirmed_weight_kg);
  const aiWeight = Number.isFinite(confirmedWeight) && confirmedWeight > 0 ? confirmedWeight : Number(product.ai_estimated_weight_kg);
  if (!Number.isFinite(aiWeight) || aiWeight <= 0) return null;
  const text = `${product.title || ''} ${product.material || ''} ${product.category || ''}`.toLowerCase();
  const inferredBulky = /chair|table|desk|sofa|cabinet|furniture|fridge|refrigerator|washing machine|pallet|machinery/.test(text);
  // A completed AI assessment is authoritative: an explicit false must not be
  // overridden by a broad category keyword such as "furniture". The keyword
  // fallback is only for legacy rows created before the bulky field existed.
  const bulky = typeof product.ai_weight_bulky === 'boolean' ? product.ai_weight_bulky : inferredBulky;
  return { weightKg: Math.round(aiWeight * 1000) / 1000, bulky, source: 'ai' };
}

export function selectSmallestSuitableDeliveryOption(
  weightKg: number,
  bulky = false,
  availableOptions?: Vehicle[]
): Vehicle | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
  const order: Vehicle[] = ['bike', 'van', 'mini', 'pickup', 'truck'];
  const candidates = availableOptions && availableOptions.length > 0
    ? order.filter((v) => availableOptions.includes(v))
    : order;

  for (const option of candidates) {
    if (bulky && (option === 'bike' || option === 'van')) continue;
    if (weightKg <= vehicles[option].capacity) {
      return option;
    }
  }

  return null;
}

export function estimateProductLoad(product: LoadProduct): ProductLoad | null {
  const explicit = extractExplicitWeight(product.specifications);
  const text = `${product.title || ''} ${product.material || ''} ${product.category || ''}`.toLowerCase();
  const bulky = /chair|table|desk|sofa|cabinet|furniture|fridge|refrigerator|washing machine|pallet|machinery/.test(text);

  if (explicit !== null) {
    return makeLoad(explicit, explicit, bulky, 'listing', `Seller confirmed packaged weight of ${explicit} kg recorded in product listing specifications.`);
  }

  const quantity = Number(product.quantity ?? 1);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const unit = String(product.quantity_unit || 'piece').toLowerCase();
  const factor = /^(kg|kilogram|kilograms)$/.test(unit) ? 1 : /^(g|gram|grams)$/.test(unit) ? 0.001 : /^(ton|tons|tonne|tonnes|mt)$/.test(unit) ? 1000 : 0;
  if (factor) return makeLoad(quantity * factor, quantity * factor, bulky, 'listing', 'Uses the listed total mass; packaging and dimensions still need confirmation.');
  if (!/^(piece|pieces|unit|units|item|items|pcs)$/.test(unit)) return null;
  let range: [number, number] | null = null;
  if (/phone|mobile/.test(text)) range = [0.3, 0.7];
  else if (/laptop|notebook|macbook/.test(text)) range = [1.5, 4];
  else if (/book/.test(text)) range = [0.3, 1.5];
  else if (/chair/.test(text)) range = /plastic/.test(text) ? [2, 5] : [5, 18];
  else if (/table|desk/.test(text)) range = [10, 40];
  else if (/sofa/.test(text)) range = [30, 100];
  else if (/fridge|refrigerator|washing machine/.test(text)) range = [35, 100];
  if (!range) return null;
  return makeLoad(range[0] * quantity, range[1] * quantity, bulky, 'category', `Category-based planning range for ${quantity} listed item(s), including a rough packaging allowance. Not a photo scan or measured weight.`);
}
