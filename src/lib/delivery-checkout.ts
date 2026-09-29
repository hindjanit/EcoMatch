export const checkoutKey = 'ecomatch-delivery-preview-checkout';
export type CheckoutPreview = {
  createdAt: number; dealId?: string; product: string; pickup: string; destination: string;
  recipient: string; phone: string; addressLine: string; vehicle: string; weight: number; distanceKm: number;
  productPaise: number; deliveryPaise: number; servicePaise: number; totalPaise: number;
};
export function parseCheckout(raw: string | null): CheckoutPreview | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || !Number.isFinite(value.createdAt) || value.createdAt > Date.now() || Date.now() - value.createdAt > 900000) return null;
    if (!['product', 'pickup', 'destination', 'recipient', 'phone', 'addressLine', 'vehicle'].every(k => typeof value[k] === 'string' && value[k].length > 0 && value[k].length <= 1000)) return null;
    if (!['productPaise', 'deliveryPaise', 'servicePaise', 'totalPaise'].every(k => Number.isSafeInteger(value[k]) && value[k] >= 0)) return null;
    if (value.totalPaise !== value.productPaise + value.deliveryPaise + value.servicePaise || value.servicePaise !== Math.round(value.deliveryPaise * 0.1)) return null;
    if (!Number.isFinite(value.weight) || value.weight <= 0 || !Number.isFinite(value.distanceKm) || value.distanceKm <= 0) return null;
    if (value.dealId && (typeof value.dealId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.dealId))) return null;
    return value as CheckoutPreview;
  } catch { return null; }
}
