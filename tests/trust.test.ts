import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {scoreListing,priceQuote,securityDeposit,detectDiversion,validOtp,assertTransition,canSettle} from '../src/lib/trust/domain';
import jsQR from 'jsqr';
import {generateQrSvg,generateQrMatrix} from '../src/lib/trust/qr';
const buyer='00000000-0000-0000-0000-000000000001',seller='00000000-0000-0000-0000-000000000002',admin='00000000-0000-0000-0000-000000000003',stranger='00000000-0000-0000-0000-000000000004';
test('QR renderer creates SVG and matrix',()=>{
  const svg=generateQrSvg('https://ecomatch.example.com/delivery/verify#test');
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('viewBox='));
  assert.ok(svg.endsWith('</svg>'));
  const matrix=generateQrMatrix('123456');
  assert.ok(matrix.length>=21);
  assert.equal(matrix.length,matrix[0].length);
  // Verify top-left finder pattern corners
  assert.equal(matrix[0][0],true);
  assert.equal(matrix[0][6],true);
  assert.equal(matrix[6][0],true);
  assert.equal(matrix[6][6],true);
});
test('delivery QR decodes the complete production and long payload without truncation',()=>{
 for(const input of ['https://eco-match-sepia.vercel.app/delivery/verify#'+'T'.repeat(43),'https://eco-match-sepia.vercel.app/delivery/verify#'+'long-payload-'.repeat(60)]){
 const matrix=generateQrMatrix(input),scale=5,size=(matrix.length+8)*scale,rgba=new Uint8ClampedArray(size*size*4).fill(255);
 for(let r=0;r<matrix.length;r++)for(let c=0;c<matrix.length;c++)if(matrix[r][c])for(let y=0;y<scale;y++)for(let x=0;x<scale;x++){const i=(((r+4)*scale+y)*size+(c+4)*scale+x)*4;rgba[i]=rgba[i+1]=rgba[i+2]=0;}
 assert.equal(jsQR(rgba,size,size)?.data,input);
 }
 assert.throws(()=>generateQrMatrix('x'.repeat(10000)));
});
test('listing threshold cannot override a hard flag, failed check or uncertainty',()=>{const checks=Object.fromEntries(Array.from({length:6},(_,i)=>[`check${i}`,{status:'pass' as const,reason:'Observed',penalty:0}]));assert.equal(scoreListing(checks).recommendation,'AUTO_APPROVE');assert.equal(scoreListing(checks,['PROHIBITED']).recommendation,'ADMIN_REVIEW');assert.equal(scoreListing({...checks,x:{status:'unknown',reason:'Cannot verify',penalty:0}}).recommendation,'ADMIN_REVIEW');assert.equal(scoreListing({...checks,x:{status:'fail',reason:'Mismatch',penalty:0}}).recommendation,'ADMIN_REVIEW');assert.equal(scoreListing({...checks,x:{status:'review',reason:'Price',penalty:21}}).recommendation,'ADMIN_REVIEW');});
test('money arithmetic uses integer paise and bounded inputs',()=>{assert.deepEqual(priceQuote(100000,30000),{productPaise:100000,deliveryPaise:30000,servicePaise:3000,totalPaise:133000,markupPercent:10});assert.equal(securityDeposit(30000),50000);assert.equal(securityDeposit(80000),90000);assert.throws(()=>priceQuote(-1,2));assert.throws(()=>priceQuote(1.1,2));assert.throws(()=>priceQuote(1,2,NaN));});
test('Hindi/Hinglish diversion separates advice, uncertain speech and verified initiator',()=>{const segment={speakerUserId:buyer,text:'WhatsApp number bhejo, EcoMatch ke bahar deal karenge',start:0,end:4,confidence:.99,attributionVerified:true};assert.equal(detectDiversion([segment]).initiatorUserId,buyer);assert.equal(detectDiversion([segment]).recommendedAction,'BLOCK_AND_REVIEW');assert.equal(detectDiversion([{...segment,attributionVerified:false}]).recommendedAction,'HOLD_FOR_REVIEW');assert.notEqual(detectDiversion([{...segment,text:'WhatsApp number mat bhejo, payment bahar nahi karna'}]).recommendedAction,'BLOCK_AND_REVIEW');assert.equal(detectDiversion([{...segment,text:'Can you send more pictures?'}]).recommendedAction,'NONE');});
test('state rules deny early or disputed settlement and expired/reused OTP',()=>{assert.throws(()=>assertTransition('FULFILMENT_SELECTED','COMPLETED'));assert.equal(canSettle('PAYMENT_RELEASE_PENDING',true,true,true,true),false);assert.equal(canSettle('PAYMENT_RELEASE_PENDING',false,true,true,true),true);assert.equal(validOtp(new Date(Date.now()-1000).toISOString(),null,0),false);assert.equal(validOtp(new Date(Date.now()+10000).toISOString(),null,5),false);});
test('PostgreSQL migration and full simulated delivery preserve security invariants',async()=>{
 const db=new PGlite({extensions:{pgcrypto}});try { await db.exec(await readFile('tests/phase17-contract.sql','utf8'));try{await db.exec(await readFile('supabase/phase18_trust_secure_delivery.sql','utf8'));await db.exec(await readFile('supabase/phase19_identity_and_audit_repairs.sql','utf8'));}catch(e){console.error('Migration:',(e as Error).message);throw e;}
 await db.exec(`select set_config('request.jwt.claim.role','service_role',false);`);
 for(const [id,role] of [[buyer,'buyer'],[seller,'seller'],[admin,'admin'],[stranger,'buyer']])await db.query('insert into profiles(id,role,verification_status,full_name,latitude,longitude,location_name) values($1,$2,\'verified\',\'Member\',28.613945,77.209133,\'Secret address\')',[id,role]);
 await db.query("insert into products(id,seller_id,title,status,price) values(1,$1,'Steel lot','approved',1000)",[seller]);
 const row=await db.query<{id:string}>("insert into deal_requests(product_id,buyer_id,seller_id,deal_code,status,agreed_price) values(1,$1,$2,'TEST-01','accepted',1000) returning id",[buyer,seller]);const deal=row.rows[0].id;
 let version=0;
 async function action(who:string,name:string,data:object={},key=crypto.randomUUID()){const r=await db.query<{r:{state:string;version:number}}> ('select trust_delivery_action($1,$2,$3,$4,$5,$6::jsonb) r',[deal,who,name,version,key,JSON.stringify(data)]);version=r.rows[0].r.version;return r.rows[0].r;}
 await assert.rejects(action(stranger,'select_delivery',{isDemo:true}),/Participant/);
 await action(buyer,'select_delivery',{isDemo:true});await assert.rejects(action(buyer,'settle',{}),/not ready/);
 await action(seller,'address',{location:{address:'Pickup',latitude:28.6,longitude:77.2}});await action(buyer,'address',{location:{address:'Dropoff',latitude:28.7,longitude:77.3}});
 await action(buyer,'quote',{productPaise:100000,deliveryPaise:30000,servicePaise:3000,totalPaise:133000,depositPaise:50000,markupPercent:10,distanceKm:10,expiresAt:new Date(Date.now()+900000).toISOString(),provider:'mock',id:'mock-quote',isDemo:true});
 await action(buyer,'buyer_order',{orderId:'buyer-test',provider:'mock'});await assert.rejects(action(buyer,'payment_verified',{orderId:'buyer-test',amountPaise:1,currency:'INR',isDemo:true}),/mismatch/);
 const key=crypto.randomUUID();const payload={orderId:'buyer-test',amountPaise:133000,currency:'INR',isDemo:true};const before=version;await action(buyer,'payment_verified',payload,key);const after=version;version=before;await action(buyer,'payment_verified',payload,key);assert.equal(version,after);
 await assert.rejects(action(buyer,'payment_verified',{...payload,amountPaise:1},key),/Idempotency/);
 await action(seller,'deposit_order',{orderId:'deposit-test',provider:'mock'});await action(seller,'payment_verified',{orderId:'deposit-test',amountPaise:50000,currency:'INR',isDemo:true});
 const evidence={photos:['a','b','c'],videoPath:'v',hash:'evidenceHash',analysis:{matchScore:90},reviewStatus:'VERIFIED'};
 await action(seller,'evidence',{...evidence,stage:'pickup'});await action(seller,'book',{bookingId:'mock-booking',provider:'mock'});await action(seller,'tracking',{state:'DRIVER_ASSIGNED'});
 const token='T'.repeat(43);await db.query('select trust_issue_delivery_token($1,$2,$3,$4,$5)',[deal,seller,'pickup',token,'123456']);
 const bad=await db.query<{r:{ok:boolean}}>('select trust_verify_delivery_token($1,$2) r',[token,'999999']);assert.equal(bad.rows[0].r.ok,false);
 const good=await db.query<{r:{ok:boolean}}>('select trust_verify_delivery_token($1,$2) r',[token,'123456']);assert.equal(good.rows[0].r.ok,true);version++;
 const replay=await db.query<{r:{ok:boolean}}>('select trust_verify_delivery_token($1,$2) r',[token,'123456']);assert.equal(replay.rows[0].r.ok,false);
 await action(seller,'tracking',{state:'IN_TRANSIT'});await action(buyer,'tracking',{state:'DELIVERY_EVIDENCE_PENDING'});await action(buyer,'evidence',{...evidence,stage:'delivery'});
 await assert.rejects(action(buyer,'buyer_confirm'),/OTP/);
 await db.query('select trust_issue_delivery_token($1,$2,$3,$4,$5)',[deal,buyer,'delivery','D'.repeat(43),'654321']);await db.query('select trust_verify_delivery_token($1,$2)',['D'.repeat(43),'654321']);version++;
 await action(buyer,'buyer_confirm');await action(buyer,'dispute',{reason:'Wrong Product',description:'Different metal delivered'});await assert.rejects(action(seller,'settle',{releaseReference:'fake',refundReference:'fake'}),/frozen/);
 await action(admin,'resolve_dispute',{outcome:'reject_claim',reason:'Reviewed all original pickup and delivery evidence; same item.'});await action(buyer,'buyer_confirm');await action(buyer,'settle',{releaseReference:'demo-release',refundReference:'demo-refund'});
 const events=await db.query<{event_type:string}>('select event_type from ownership_events where deal_id=$1',[deal]);assert.equal(events.rows.length,1);assert.equal(events.rows[0].event_type,'demo_ownership_transfer');
 await assert.rejects(action(buyer,'settle',{releaseReference:'again',refundReference:'again'}),/not ready/);
 await db.exec(`set role authenticated;select set_config('request.jwt.claim.role','authenticated',false);select set_config('request.jwt.claim.sub','${stranger}',false);`);
 assert.equal((await db.query('select * from deliveries')).rows.length,0);assert.equal((await db.query('select * from profiles')).rows.length,1);const publicP=await db.query<{latitude:number;location_name:string}>('select latitude,location_name from public_profiles');assert.notEqual(String(publicP.rows[0].latitude),'28.613945');assert.notEqual(publicP.rows[0].location_name,'Secret address');
 await assert.rejects(db.query("update profiles set account_status='safety_blocked' where id=$1",[stranger]),/Protected/);
 await assert.rejects(db.query("insert into payments(deal_id,payer_id,kind,provider,provider_order_id,amount_paise,status,is_demo) values($1,$2,'buyer','mock','forged',1,'HELD',true)",[deal,stranger]),/permission denied/);
 } finally { await db.close(); }
});

test('disputed deal return flow and refund settlement execute with integrity',async()=>{
 const db=new PGlite({extensions:{pgcrypto}});
 try {
  await db.exec(await readFile('tests/phase17-contract.sql','utf8'));
  await db.exec(await readFile('supabase/phase18_trust_secure_delivery.sql','utf8'));await db.exec(await readFile('supabase/phase19_identity_and_audit_repairs.sql','utf8'));
  await db.exec(`select set_config('request.jwt.claim.role','service_role',false);`);
  for(const [id,role] of [[buyer,'buyer'],[seller,'seller'],[admin,'admin']]) {
    await db.query('insert into profiles(id,role,verification_status,full_name,latitude,longitude,location_name) values($1,$2,\'verified\',\'Member\',28.613945,77.209133,\'Location\')',[id,role]);
  }
  await db.query("insert into products(id,seller_id,title,status,price) values(2,$1,'Copper wire','approved',2000)",[seller]);
  const row=await db.query<{id:string}>("insert into deal_requests(product_id,buyer_id,seller_id,deal_code,status,agreed_price) values(2,$1,$2,'TEST-RETURN','accepted',2000) returning id",[buyer,seller]);
  const deal=row.rows[0].id;
  let version=0;
  async function action(who:string,name:string,data:object={},key=crypto.randomUUID()){
    const r=await db.query<{r:{state:string;version:number}}>('select trust_delivery_action($1,$2,$3,$4,$5,$6::jsonb) r',[deal,who,name,version,key,JSON.stringify(data)]);
    version=r.rows[0].r.version;
    return r.rows[0].r;
  }
  await action(buyer,'select_delivery',{isDemo:true});
  await action(seller,'address',{location:{address:'Pickup St',latitude:28.6,longitude:77.2}});
  await action(buyer,'address',{location:{address:'Delivery Ave',latitude:28.7,longitude:77.3}});
  await action(buyer,'quote',{productPaise:200000,deliveryPaise:30000,servicePaise:3000,totalPaise:233000,depositPaise:50000,markupPercent:10,distanceKm:10,expiresAt:new Date(Date.now()+900000).toISOString(),provider:'mock',id:'mock-q2',isDemo:true});
  await action(buyer,'buyer_order',{orderId:'b-order',provider:'mock'});
  await action(buyer,'payment_verified',{orderId:'b-order',amountPaise:233000,currency:'INR',isDemo:true});
  await action(seller,'deposit_order',{orderId:'s-order',provider:'mock'});
  await action(seller,'payment_verified',{orderId:'s-order',amountPaise:50000,currency:'INR',isDemo:true});
  const ev={photos:['p1','p2','p3'],videoPath:'v1',hash:'hash',analysis:{matchScore:95},reviewStatus:'VERIFIED'};
  await action(seller,'evidence',{...ev,stage:'pickup'});
  await action(seller,'book',{bookingId:'book-ret',provider:'mock'});
  await action(seller,'tracking',{state:'DRIVER_ASSIGNED'});
  const t1='P'.repeat(43);
  await db.query('select trust_issue_delivery_token($1,$2,$3,$4,$5)',[deal,seller,'pickup',t1,'111222']);
  await db.query('select trust_verify_delivery_token($1,$2)',[t1,'111222']);version++;
  await action(seller,'tracking',{state:'IN_TRANSIT'});
  await action(buyer,'tracking',{state:'DELIVERY_EVIDENCE_PENDING'});
  await action(buyer,'evidence',{...ev,stage:'delivery'});
  const t2='D'.repeat(43);
  await db.query('select trust_issue_delivery_token($1,$2,$3,$4,$5)',[deal,buyer,'delivery',t2,'333444']);
  await db.query('select trust_verify_delivery_token($1,$2)',[t2,'333444']);version++;
  await action(buyer,'buyer_confirm');
  // Buyer disputes: defective material
  await action(buyer,'dispute',{reason:'Damaged Product',description:'Material damaged in transit or defective'});
  // Admin reviews dispute and orders a return with deduction
  await action(admin,'resolve_dispute',{outcome:'return',reason:'Return approved with partial deposit deduction',buyerRefundPaise:233000,depositDeductionPaise:20000});
  // Return stages under admin supervision
  await action(admin,'return_progress',{state:'RETURN_BOOKING'});
  await action(admin,'return_progress',{state:'RETURN_PICKUP'});
  await action(admin,'return_progress',{state:'RETURN_IN_TRANSIT'});
  await action(admin,'return_progress',{state:'RETURN_DELIVERED'});
  await action(seller,'evidence',{...ev,stage:'return'});
  const evRet = await db.query<{id:string}>('select id from exchange_evidence where deal_id=$1 and stage=\'return\' limit 1',[deal]);
  await action(admin,'review_evidence',{evidenceId:evRet.rows[0].id,reason:'Admin confirmed return evidence match.'});
  // Settle return by admin
  await action(admin,'return_settle',{refundReference:'demo-refund-ref'});
  const dRecord=await db.query<{secure_state:string}>('select secure_state from deal_requests where id=$1',[deal]);
  assert.equal(dRecord.rows[0].secure_state,'RETURNED');
  const payments=await db.query<{status:string;kind:string}>('select status,kind from payments where deal_id=$1',[deal]);
  assert.ok(payments.rows.some(p=>p.kind==='buyer'&&p.status==='REFUNDED'));
  const deposit=await db.query<{status:string;deducted_paise:number}>('select status,deducted_paise from seller_security_deposits where deal_id=$1',[deal]);
  assert.equal(deposit.rows[0].status,'PARTIALLY_DEDUCTED');
  assert.equal(deposit.rows[0].deducted_paise,20000);
 } finally { await db.close(); }
});
