export type DeliveryPoint = { latitude: number; longitude: number; label: string };
export function validPoint(value: unknown): value is DeliveryPoint {
  if (!value || typeof value !== 'object') return false;
  const p = value as DeliveryPoint;
  return typeof p.latitude === 'number' && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 &&
    typeof p.longitude === 'number' && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180 &&
    typeof p.label === 'string' && p.label.trim().length > 0 && p.label.length <= 500;
}
export async function roadDistance(pickup: DeliveryPoint, destination: DeliveryPoint, fetcher: typeof fetch = fetch) {
  if (!validPoint(pickup) || !validPoint(destination)) throw new Error('Select valid pickup and delivery locations.');
  const coordinates = `${pickup.longitude},${pickup.latitude};${destination.longitude},${destination.latitude}`;
  const response = await fetcher(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false&steps=false&alternatives=false&radiuses=500;500`, {
    signal: AbortSignal.timeout(12000), cache: 'no-store', headers: { 'User-Agent': 'EcoMatch-Delivery-Preview/1.0' },
  });
  if (!response.ok) throw new Error('Road routing is temporarily unavailable. Please retry.');
  const data = await response.json();
  const metres = data.routes?.[0]?.distance;
  if (data.code !== 'Ok' || typeof metres !== 'number' || !Number.isFinite(metres) || metres < 0) throw new Error('No drivable route found. Select a nearby road-accessible delivery point.');
  if (metres > 200000) throw new Error('This local delivery preview supports routes up to 200 km.');
  return { distanceKm: Math.max(0.1, Math.ceil(metres / 100) / 10), source: 'OSRM / OpenStreetMap road route' };
}
