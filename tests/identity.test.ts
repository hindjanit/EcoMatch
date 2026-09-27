import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {SignedXml} from 'xml-crypto';
import {inspectEkyc,verifyEkyc} from '../src/lib/identity/ekyc';
import {demoEnabled,requireDemo} from '../src/lib/identity/policy';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {readFile} from 'node:fs/promises';
const key=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const DS='http://www.w3.org/2000/09/xmldsig#';
// All fixtures are synthetic and signed with an ephemeral TEST key, never a UIDAI credential.
const base='<OfflinePaperlessKyc referenceId="TEST-SYNTHETIC"><UidData><Poi name="Synthetic Test Person" dob="1990" gender="X"/><Poa country="Test"/><Pht>TEST</Pht></UidData></OfflinePaperlessKyc>';
function signed(xml=base,algorithm='http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'){
 const sig=new SignedXml({privateKey:key.privateKey,signatureAlgorithm:algorithm,canonicalizationAlgorithm:'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'});
 sig.addReference({xpath:'/*',transforms:[DS+'enveloped-signature'],digestAlgorithm:'http://www.w3.org/2001/04/xmlenc#sha256',isEmptyUri:true});sig.computeSignature(xml);return sig.getSignedXml();
}
test('strict XML structure rejects malformed, foreign roots, entity declarations and missing signatures',()=>{
 for(const xml of ['<OfflinePaperlessKyc>','<x/><y/>','<!DOCTYPE x [<!ENTITY a SYSTEM "file:///secret">]><x>&a;</x>'])assert.throws(()=>inspectEkyc(xml),/Invalid XML/);
 assert.throws(()=>inspectEkyc('<SomethingElse/>'),/not a UIDAI/);
 assert.throws(()=>inspectEkyc('<OfflinePaperlessKyc/>'),/signature is missing/);
 assert.throws(()=>inspectEkyc('<OKY/>'),/signature is missing/);
});
test('XMLDSig verifies complete signed root with pinned test key, including official legacy signature algorithm',()=>{
 for(const algorithm of [DS+'rsa-sha1','http://www.w3.org/2001/04/xmldsig-more#rsa-sha256']){
 const xml=signed(base,algorithm);assert.equal(verifyEkyc(xml,key.publicKey,'test-user').identity.name,'Synthetic Test Person');
 assert.throws(()=>verifyEkyc(xml.replace('Synthetic Test Person','Tampered'),key.publicKey,'test-user'),/signature verification failed/);
 }
 const foreign=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
 assert.throws(()=>verifyEkyc(signed(),foreign.publicKey,'test-user'),/signature verification failed/);
});
test('signed content cannot omit identity fields, wrap unsigned identity, or add duplicate signatures',()=>{
 assert.throws(()=>verifyEkyc(signed(base.replace('name="Synthetic Test Person"','')),key.publicKey,'test-user'),/identity fields are missing/);
 const xml=signed();assert.throws(()=>verifyEkyc(xml.replace('<UidData>','<UidData><Poi name="Injected" dob="1990"/>'),key.publicKey,'u'),/signature verification failed/);
 const sig=xml.match(/<Signature[\s\S]*<\/Signature>/)![0];assert.throws(()=>verifyEkyc(xml.replace('</OfflinePaperlessKyc>',sig+'</OfflinePaperlessKyc>'),key.publicKey,'u'),/signature verification failed/);
 assert.throws(()=>verifyEkyc(xml.replace('URI=""','URI="#other"'),key.publicKey,'u'),/signature verification failed/);
});
test('legacy OKY validates original bytes and rejects fake compact credentials',()=>{
 const raw='<OKY n="Synthetic Test Person" d="1990" r="TEST-REFERENCE" />';const signature=sign('RSA-SHA256',Buffer.from(raw),key.privateKey).toString('base64');
 const xml=raw.replace(' />',` s="${signature}" />`);assert.equal(verifyEkyc(xml,key.publicKey,'u').identity.name,'Synthetic Test Person');assert.throws(()=>verifyEkyc(xml.replace('1990','1991'),key.publicKey,'u'),/signature verification failed/);
});
test('only exact server environment enables demo; query and client flags cannot enable it',()=>{assert.equal(demoEnabled({}),false);assert.equal(demoEnabled({ECOMATCH_DEMO_MODE:'false',NEXT_PUBLIC_DEMO:'true'}),false);assert.equal(demoEnabled({ECOMATCH_DEMO_MODE:'true'}),true);assert.throws(()=>requireDemo({demo:'true'}),/disabled/);});
const buyer='00000000-0000-0000-0000-000000000001',seller='00000000-0000-0000-0000-000000000002',admin='00000000-0000-0000-0000-000000000003';
test('database regression: handover authorization, identity separation/replay, review retry and attribution',async()=>{
 const db=new PGlite({extensions:{pgcrypto}});
 const asService=()=>db.exec("reset role;select set_config('request.jwt.claim.role','service_role',false)");
 const asUser=(id:string)=>db.exec(`set role authenticated;select set_config('request.jwt.claim.role','authenticated',false);select set_config('request.jwt.claim.sub','${id}',false)`);
 try{
  for(const f of ['tests/phase17-contract.sql','supabase/phase18_trust_secure_delivery.sql','supabase/phase19_identity_and_audit_repairs.sql'])await db.exec(await readFile(f,'utf8'));
  await asService();for(const [id,role] of [[buyer,'buyer'],[seller,'seller'],[admin,'admin']])await db.query("insert into profiles(id,role,verification_status) values($1,$2,'unverified')",[id,role]);
  await db.query("insert into products(id,seller_id,status) values(1,$1,'approved'),(2,$1,'pending_review')",[seller]);
  const {rows:[{id:deal}]}=await db.query<{id:string}>("insert into deal_requests(product_id,buyer_id,seller_id,status,deal_code) values(1,$1,$2,'accepted','SELF-TEST') returning id",[buyer,seller]);
  await asUser(buyer);
  await assert.rejects(db.query("update deal_requests set exchange_code_verified_at=now(),seller_handover_confirmed_at=now() where id=$1",[deal]),/server managed/);
  await assert.rejects(db.query("update deal_requests set status='completed' where id=$1",[deal]));
  await assert.rejects(db.query('select confirm_deal_handover($1)',[deal]),/OTP/);
  await assert.rejects(db.query('select generate_deal_exchange_code($1)',[deal]),/Seller/);
  await asUser(seller);const {rows:[{code}]}=await db.query<{code:string}>('select generate_deal_exchange_code($1) code',[deal]);
  await assert.rejects(db.query('select verify_deal_exchange_code($1,$2)',[deal,code]),/Only buyer/);
  await asUser(buyer);assert.equal((await db.query<{ok:boolean}>('select verify_deal_exchange_code($1,$2) ok',[deal,code])).rows[0].ok,true);
  assert.equal((await db.query<{result:string}>('select confirm_deal_handover($1) result',[deal])).rows[0].result,'waiting_for_other_party');
  assert.equal((await db.query<{result:string}>('select confirm_deal_handover($1) result',[deal])).rows[0].result,'waiting_for_other_party');
  await asUser(seller);assert.equal((await db.query<{result:string}>('select confirm_deal_handover($1) result',[deal])).rows[0].result,'completed');
  await asService();assert.equal((await db.query('select * from ownership_events')).rows.length,1);
  const {rows:[{id:session}]}=await db.query<{id:string}>("insert into identity_sessions(user_id,method,signature_valid,challenge) values($1,'demo_identity_liveness',false,'Smile') returning id",[buyer]);
  await assert.rejects(db.query("select trust_identity_complete($1,$2,'Smile','camera_self_reported',false)",[buyer,session]),/disabled/);
  await assert.rejects(db.query("select trust_identity_complete($1,$2,'Smile','camera_self_reported',true)",[seller,session]),/expired or unavailable/);
  await db.query("select trust_identity_complete($1,$2,'Smile','camera_self_reported',true)",[buyer,session]);
  const profile=(await db.query<{verification_status:string;verification_method:string;identity_liveness_passed:boolean}>('select * from profiles where id=$1',[buyer])).rows[0];assert.equal(profile.verification_status,'verified_demo');assert.equal(profile.verification_method,'demo_identity_liveness');assert.equal(profile.identity_liveness_passed,false);
  await assert.rejects(db.query("select trust_identity_complete($1,$2,'Smile','camera_self_reported',true)",[buyer,session]),/expired or unavailable/);
  await asUser(buyer);await assert.rejects(db.query("update profiles set verification_status='verified' where id=$1",[buyer]),/server managed/);
  await assert.rejects(db.query("select trust_identity_complete($1,$2,'Smile','camera_self_reported',true)",[buyer,session]),/permission denied/);
  await asService();await db.query('select trust_identity_reset_demo($1)',[buyer]);assert.equal((await db.query<{verification_status:string}>('select verification_status from profiles where id=$1',[buyer])).rows[0].verification_status,'unverified');
  const {rows:[{id:real}]}=await db.query<{id:string}>("insert into identity_sessions(user_id,method,signature_valid,proof_hash,challenge) values($1,'uidai_offline_ekyc',true,$2,'Blink') returning id",[seller,'f'.repeat(64)]);
  await db.query("select trust_identity_complete($1,$2,'Blink','camera_self_reported',false)",[seller,real]);await assert.rejects(db.query('select trust_identity_reset_demo($1)',[seller]),/Cannot reset real/);
  const review={score:40,uncertain:true,hardFlags:[],recommendation:'ADMIN_REVIEW',riskLevel:'HIGH',checks:{},reasons:['AI unavailable'],source:'unavailable'};
  await db.query('select trust_publish_review(2,0,$1::jsonb,ARRAY[]::text[])',[JSON.stringify(review)]);
  await db.query('select trust_publish_review(2,1,$1::jsonb,ARRAY[]::text[])',[JSON.stringify(review)]);
  assert.equal((await db.query('select * from listing_ai_reviews where product_id=2')).rows.length,2);
  await assert.rejects(db.query('select trust_publish_review(2,1,$1::jsonb,ARRAY[]::text[])',[JSON.stringify(review)]),/Listing changed/);
  const {rows:[{id:call}]}=await db.query<{id:string}>("insert into calls(caller_id,receiver_id,product_id,status) values($1,$2,1,'ENDED') returning id",[buyer,seller]);
  const {rows:[{id:event}]}=await db.query<{id:string}>("insert into communication_risk_events(call_id,actor_id,risk_type,review_status,action_taken) values($1,$2,'DIVERSION','PENDING','HOLD_FOR_REVIEW') returning id",[call,buyer]);
  await assert.rejects(db.query("select trust_admin_action($1,'block',$2,'Reviewed speech evidence')",[admin,event]),/speaker identity/);
  await assert.rejects(db.query("select trust_attribute_call($1,$2,'buyer','Reviewed speech evidence')",[buyer,event]),/Active admin/);
  await db.query("select trust_attribute_call($1,$2,'unable_to_determine','Speaker cannot be identified')",[admin,event]);
  await assert.rejects(db.query("select trust_admin_action($1,'block',$2,'Reviewed speech evidence')",[admin,event]),/speaker identity/);
  await db.query("select trust_attribute_call($1,$2,'seller','Recording reviewed and speaker confirmed')",[admin,event]);
  await db.query("select trust_admin_action($1,'block',$2,'Explicit diversion in reviewed evidence')",[admin,event]);
  assert.equal((await db.query<{account_status:string}>('select account_status from profiles where id=$1',[seller])).rows[0].account_status,'safety_blocked');
  assert.equal((await db.query<{account_status:string}>('select account_status from profiles where id=$1',[buyer])).rows[0].account_status,'active');
  assert.equal((await db.query("select * from trust_audit_logs where action='attribution_reviewed'")).rows.length,2);
 }finally{await db.close();}
});
