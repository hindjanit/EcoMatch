import {actor,bodyJson,check,fail,rateLimit} from '@/lib/trust/server';
import {demoEnabled,CHALLENGES} from '@/lib/identity/policy';
import {randomInt} from 'node:crypto';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!demoEnabled())return Response.json({error:'Demo identity verification is disabled'},{status:403});
 try{const {db,user}=await actor(request);await rateLimit(db,`identity-demo:${user.id}`,10);const b=await bodyJson(request);
 if(b.action==='reset'){const {error}=await db.rpc('trust_identity_reset_demo',{p_user:user.id});check(error);return Response.json({ok:true});}
 if(b.action!=='start')return Response.json({error:'Unknown demo action'},{status:400});
 const {data:p,error:pe}=await db.from('profiles').select('verification_status').eq('id',user.id).single();check(pe);if(p?.verification_status==='verified')return Response.json({error:'Use an unverified demo account. Real verification will not be overwritten.'},{status:409});
 const challenge=CHALLENGES[randomInt(CHALLENGES.length)];
 const {data,error}=await db.from('identity_sessions').insert({user_id:user.id,method:'demo_identity_liveness',signature_valid:false,challenge}).select('id,expires_at').single();check(error);if(!data)throw new Error('Verification session unavailable');
 return Response.json({sessionId:data.id,expiresAt:data.expires_at,challenge,method:'demo_identity_liveness',identity:{name:'EcoMatch Demo User',age:24,referenceMasked:`DEMO-${data.id.slice(0,8).toUpperCase()}`,documentStatus:'Synthetic Demo Identity'}},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return fail(e);}
}
