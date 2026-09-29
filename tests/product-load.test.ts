import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateProductLoad, recommendVehicle } from '../src/lib/product-load';
import { estimateDelivery } from '../src/lib/delivery-estimate';
import { parseCheckout } from '../src/lib/delivery-checkout';

test('small products select bike, bulky light furniture selects loader, quantities count', () => {
  assert.equal(estimateProductLoad({ title: 'Mobile phone', quantity: 1, quantity_unit: 'piece' })?.vehicle, 'bike');
  const chairs = estimateProductLoad({ title: 'Plastic chair', quantity: 3, quantity_unit: 'piece' });
  assert.equal(chairs?.suggestedKg, 15);
  assert.equal(chairs?.vehicle, 'mini');
  assert.equal(estimateProductLoad({ title: 'Laptop', quantity: 8, quantity_unit: 'piece' })?.vehicle, 'van');
  assert.equal(estimateProductLoad({ title: 'Unknown item', quantity: 1, quantity_unit: 'lot' }), null);
});
test('mass quantities convert once; unsupported heavy loads need custom quote', () => {
  assert.equal(estimateProductLoad({ title: 'Material', quantity: 500, quantity_unit: 'g' })?.suggestedKg, 0.5);
  assert.equal(estimateProductLoad({ title: 'Material', quantity: 2, quantity_unit: 'tonne' })?.suggestedKg, 2000);
  assert.equal(recommendVehicle(2001, false), null);
  assert.equal(recommendVehicle(0, false), null);
  assert.equal(estimateDelivery(1, 0.1, 'bike', 100).servicePaise, 560);
  assert.throws(() => estimateDelivery(1, 20.1, 'bike', 100));
});
test('checkout expires and invalid totals cannot be displayed as a valid preview', () => {
  const value = { createdAt: Date.now(), product: 'Sample', pickup: 'Sample pickup', destination: 'Sample drop', recipient: 'Demo', phone: '9999999999', addressLine: 'Demo building', vehicle: 'Bike', weight: 1, distanceKm: 1, productPaise: 10000, deliveryPaise: 5600, servicePaise: 560, totalPaise: 16160 };
  assert.ok(parseCheckout(JSON.stringify(value)));
  assert.equal(parseCheckout(JSON.stringify({ ...value, totalPaise: 1 })), null);
  assert.equal(parseCheckout(JSON.stringify({ ...value, createdAt: Date.now() - 900001 })), null);
  assert.equal(parseCheckout('invalid'), null);
});
