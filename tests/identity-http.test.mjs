import {test} from 'node:test';
import assert from 'node:assert/strict';
// Run against a local production build started with ECOMATCH_DEMO_MODE=false.
const base=process.env.ECOMATCH_TEST_BASE_URL||'http://localhost:3107';
if(!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))throw new Error('HTTP regression tests require localhost');
test('production demo configuration ignores browser query flags',async()=>{const r=await fetch(`${base}/api/identity/session?demo=true`);assert.equal(r.status,200);assert.deepEqual(await r.json(),{demoEnabled:false});});
test('production demo start and reset endpoints reject before authentication',async()=>{for(const action of ['start','reset']){const r=await fetch(`${base}/api/identity/demo?demo=true`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,demo:true,ECOMATCH_DEMO_MODE:true})});assert.equal(r.status,403);assert.match((await r.json()).error,/disabled/);}});
test('unauthenticated caller cannot finish verification with forged browser proof',async()=>{const r=await fetch(`${base}/api/identity/session`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'forged',presenceConfirmed:true,signatureValid:true})});assert.equal(r.status,401);});
