import test from 'node:test';
import assert from 'node:assert/strict';
import { roadDistance, validPoint } from '../src/lib/delivery-route';
import { POST } from '../src/app/api/delivery/estimate/route';

const pickup = { latitude: 28.5308, longitude: 77.2713, label: 'Sample pickup' };
const destination = { latitude: 28.567, longitude: 77.324, label: 'Sample drop' };
test('road route uses longitude/latitude order and rounds distance up to 100 metres', async () => {
  const result = await roadDistance(pickup, destination, async url => {
    assert.match(String(url), /77.2713,28.5308;77.324,28.567/);
    return Response.json({ code: 'Ok', routes: [{ distance: 9771 }] });
  });
  assert.equal(result.distanceKm, 9.8);
});
test('invalid points and missing routes never become a zero-cost estimate', async () => {
  assert.equal(validPoint({ ...pickup, latitude: null }), false);
  assert.equal(validPoint({ ...pickup, longitude: Infinity }), false);
  await assert.rejects(roadDistance(pickup, destination, async () => Response.json({ code: 'NoRoute' })), /No drivable route/);
  await assert.rejects(roadDistance(pickup, destination, async () => Response.json({ code: 'Ok', routes: [{ distance: 201000 }] })), /200 km/);
});
test('API ignores supplied pickup, product price, distance and total', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async url => {
    assert.match(String(url), /77.2713,28.5308;77.324,28.567/);
    return Response.json({ code: 'Ok', routes: [{ distance: 5000 }] });
  };
  try {
    const response = await POST(new Request('http://localhost/api/delivery/estimate', { method: 'POST', body: JSON.stringify({ destination, vehicle: 'mini', weight: 100, pickup: destination, productAmount: 1, distance: 1, totalPaise: 1 }) }));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.distanceKm, 5);
    assert.equal(result.productPaise, 1500000);
    assert.equal(result.totalPaise, 1539600);
    assert.equal(result.sample, true);
  } finally { globalThis.fetch = original; }
});
test('deal quote requires authentication and invalid destinations are rejected', async () => {
  const response = await POST(new Request('http://localhost/api/delivery/estimate', { method: 'POST', body: JSON.stringify({ dealId: '94630f4d-2523-43a4-a693-0c62349771aa', destination, vehicle: 'mini', weight: 100 }) }));
  assert.equal(response.status, 401);
  const invalid = await POST(new Request('http://localhost/api/delivery/estimate', { method: 'POST', body: JSON.stringify({ destination: { ...destination, latitude: '' }, vehicle: 'mini', weight: 100 }) }));
  assert.equal(invalid.status, 400);
});
