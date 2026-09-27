// Illustrative EcoMatch planning rates, not a carrier tariff or bookable quote.
export const vehicles = {
  mini: { name: 'Mini loader', capacity: 500, base: 250, perKm: 22 },
  pickup: { name: 'Pickup truck', capacity: 1000, base: 450, perKm: 30 },
  truck: { name: 'Light truck', capacity: 2000, base: 800, perKm: 42 },
} as const;
export type Vehicle = keyof typeof vehicles;
export function estimateDelivery(distance: number, weight: number, vehicle: Vehicle, productRupees: number) {
  const rate = vehicles[vehicle];
  if (!rate || ![distance, weight, productRupees].every(Number.isFinite) || distance < 1 || distance > 200 || weight < 1 || weight > rate.capacity || productRupees < 0 || productRupees > 10_000_000) {
    throw new Error('Use 1–200 km, a weight within vehicle capacity, and a valid product amount.');
  }
  const basePaise = rate.base * 100;
  const distancePaise = Math.round(distance * rate.perKm * 100);
  const deliveryPaise = basePaise + distancePaise;
  const servicePaise = Math.round(deliveryPaise * 0.1);
  const productPaise = Math.round(productRupees * 100);
  return { basePaise, distancePaise, deliveryPaise, servicePaise, productPaise,
    totalPaise: productPaise + deliveryPaise + servicePaise,
    lowPaise: Math.round(deliveryPaise * 0.8), highPaise: Math.round(deliveryPaise * 1.2) };
}
