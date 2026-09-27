import {actor,check,rateLimit,HttpError} from '@/lib/trust/server';
import {verifyEkyc,EkycError} from '@/lib/identity/ekyc';
import {uidaiCertificate} from '@/lib/identity/certificate';
import {CHALLENGES} from '@/lib/identity/policy';
import {randomInt} from 'node:crypto';
export const runtime='nodejs';
export async function POST(request:Request){try{
 const {db,user}=await actor(request);await rateLimit(db,`ekyc:${user.id}`,5);
 if(Number(request.headers.get('content-length'))>2200000)throw new HttpError(413,'XML is too large. Maximum 2MB.');
 const form=await request.formData(),file=form.get('xml');
 if(!(file instanceof File)||file.size>2097152)throw new EkycError('Invalid XML file');
 const xml=await file.text();
 // Report structural errors before a certificate network request. Never log XML/parser exceptions.
 const {inspectEkyc}=await import('@/lib/identity/ekyc');inspectEkyc(xml);
 const verified=verifyEkyc(xml,await uidaiCertificate(),user.id);
 const challenge=CHALLENGES[randomInt(CHALLENGES.length)];
 const {data,error}=await db.from('identity_sessions').insert({user_id:user.id,method:'uidai_offline_ekyc',signature_valid:true,proof_hash:verified.proofHash,challenge}).select('id,expires_at').single();check(error);if(!data)throw new Error('Verification session unavailable');
 return Response.json({sessionId:data.id,expiresAt:data.expires_at,challenge,method:'uidai_offline_ekyc',identity:verified.identity},{headers:{'Cache-Control':'no-store'}});
}catch(e){const status=e instanceof EkycError?422:e instanceof HttpError?e.status:503;return Response.json({error:e instanceof EkycError||e instanceof HttpError?e.message:'UIDAI verification service unavailable. Please retry or check server configuration.'},{status,headers:{'Cache-Control':'no-store'}});}}
