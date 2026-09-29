import { vehicles, type Vehicle } from './delivery-estimate';
export type ProductLoad = { lowKg: number; highKg: number; suggestedKg: number; bulky: boolean; source: 'listing' | 'category' | 'photo'; reason: string; vehicle: Vehicle | null };
export type LoadProduct = { title?: string; description?: string; material?: string; category?: string; specifications?: string; quantity?: number; quantity_unit?: string };
export function recommendVehicle(weight: number, bulky: boolean): Vehicle | null {
  if (!Number.isFinite(weight) || weight <= 0) return null;
  for (const key of ['bike', 'van', 'mini', 'pickup', 'truck'] as Vehicle[]) {
    if (bulky && (key === 'bike' || key === 'van')) continue;
    if (weight <= vehicles[key].capacity) return key;
  }
  return null;
}
export function makeLoad(lowKg: number, highKg: number, bulky: boolean, source: ProductLoad['source'], reason: string): ProductLoad {
  const low = Math.max(0.1, Math.round(lowKg * 10) / 10);
  const high = Math.max(low, Math.ceil(highKg * 10) / 10);
  return { lowKg: low, highKg: high, suggestedKg: high, bulky, source, reason, vehicle: recommendVehicle(high, bulky) };
}
export function estimateProductLoad(product: LoadProduct): ProductLoad | null {
  const text = `${product.title || ''} ${product.material || ''} ${product.category || ''}`.toLowerCase();
  const bulky = /chair|table|desk|sofa|cabinet|furniture|fridge|refrigerator|washing machine|pallet|machinery/.test(text);
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
