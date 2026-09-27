import {actor,bodyJson,check,fail,rateLimit} from '@/lib/trust/server';
export const runtime='nodejs';
export async function GET(request:Request){try{const {db}=await actor(request,true);const results=await Promise.all([
 db.from('products').select('id,title,seller_id,status,safety_score,approval_method,created_at,listing_ai_reviews(*)').order('created_at',{ascending:false}).limit(100),
 db.from('communication_risk_events').select('*,calls(product_id,caller_id,receiver_id,started_at)').order('created_at',{ascending:false}).limit(100),
 db.from('deal_requests').select('id,deal_code,secure_state,secure_version,secure_demo,buyer_id,seller_id,created_at').eq('fulfilment_mode','secure_delivery').order('created_at',{ascending:false}).limit(100),
 db.from('call_recordings').select('*').order('created_at',{ascending:false}).limit(100),
 db.from('trust_audit_logs').select('*').order('created_at',{ascending:false}).limit(100),
 db.from('profiles').select('id,full_name,verification_method,verification_status,identity_presence_status,verified_at').order('verified_at',{ascending:false,nullsFirst:false}).limit(100),
 db.from('call_transcripts').select('id,call_id,text,start_time,attribution_verified').order('created_at',{ascending:false}).limit(500)
 ]);results.forEach(r=>check(r.error));return Response.json({listings:results[0].data,risks:results[1].data,deliveries:results[2].data,recordings:results[3].data,audit:results[4].data,identities:results[5].data,transcripts:results[6].data});}catch(e){return fail(e);}}
export async function POST(request:Request){try{const {db,user}=await actor(request,true);await rateLimit(db,`admin:${user.id}`,30);const b=await bodyJson(request);if(b.action==='attribute'){const {error}=await db.rpc('trust_attribute_call',{p_actor:user.id,p_event:String(b.id),p_attribution:b.attribution,p_reason:b.reason});check(error);return Response.json({ok:true});}const {error}=await db.rpc('trust_admin_action',{p_actor:user.id,p_action:b.action,p_id:String(b.id),p_reason:b.reason});check(error);return Response.json({ok:true});}catch(e){return fail(e);}}
