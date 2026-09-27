import {actor,bodyJson,check,fail,rateLimit} from '@/lib/trust/server';
import {demoEnabled} from '@/lib/identity/policy';
export const runtime='nodejs';
export async function GET(){return Response.json({demoEnabled:demoEnabled()},{headers:{'Cache-Control':'no-store'}});}
export async function POST(request:Request){try{const {db,user}=await actor(request);await rateLimit(db,`identity-complete:${user.id}`,10);const b=await bodyJson(request);
 if(b.presenceConfirmed!==true||!['camera_self_reported','native_face_detected_self_reported_challenge'].includes(String(b.presenceStatus)))return Response.json({error:'Complete the camera presence challenge first'},{status:400});
 const {data,error}=await db.rpc('trust_identity_complete',{p_user:user.id,p_session:b.sessionId,p_challenge:b.challenge,p_presence:b.presenceStatus,p_demo_enabled:demoEnabled()});check(error);return Response.json(data);
}catch(e){return fail(e);}}
