import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateDelivery } from '../src/lib/delivery-estimate';

test('estimate itemizes distance, vehicle, service and product in integer paise', () => {
  const q = estimateDelivery(12, 100, 'mini', 25000);
  assert.equal(q.deliveryPaise, 51400);
  assert.equal(q.servicePaise, 5140);
  assert.equal(q.totalPaise, 2556540);
  assert.equal(q.lowPaise, 41120);
  assert.equal(q.highPaise, 61680);
  assert.equal(estimateDelivery(12, 100, 'pickup', 0).deliveryPaise, 81000);
});

test('unsupported route, invalid amounts and overloaded vehicles are rejected', () => {
  for (const args of [[0,100,'mini',0],[201,100,'mini',0],[12,501,'mini',0],[12,100,'mini',-1],[NaN,100,'mini',0],[12,100,'mini',Infinity]] as const) {
    assert.throws(() => estimateDelivery(args[0], args[1], args[2], args[3]));
  }
});
