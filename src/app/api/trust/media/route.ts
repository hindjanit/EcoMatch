import { actor, bodyJson, check, fail, HttpError, rateLimit } from "@/lib/trust/server";
export const runtime="nodejs";
export async function POST(request:Request){try{
  const {db,user,profile}=await actor(request,false,true);await rateLimit(db,`media:${user.id}`,30);const b=await bodyJson(request);
  const id=String(b.dealId||""),stage=String(b.stage||""),path=String(b.path||"");
  if(b.callId){
    const {data:call,error}=await db.from("calls").select("*").eq("id",b.callId).single();check(error);
    if(!call||profile.role!=="admin"&&![call.caller_id,call.receiver_id].includes(user.id))throw new HttpError(403,"Call access denied");
    if(b.operation!=="read")throw new HttpError(400,"Use the call recording upload endpoint");
    const {data:r,error:re}=await db.from("call_recordings").select("storage_path").eq("call_id",call.id).eq("id",b.recordingId).single();check(re);
    if(!r)throw new HttpError(404,'Recording not found');
    const {data,error:se}=await db.storage.from("call-recordings-private").createSignedUrl(r.storage_path,60);check(se);
    check((await db.from("trust_audit_logs").insert({actor_id:user.id,entity_type:"call",entity_id:call.id,action:"recording_access"})).error);
    return Response.json(data);
  }
  const {data:deal,error}=await db.from("deal_requests").select("buyer_id,seller_id,secure_state").eq("id",id).single();check(error);
  if(!deal||profile.role!=="admin"&&![deal.buyer_id,deal.seller_id].includes(user.id))throw new HttpError(403,"Deal access denied");
  if(b.operation==="read"){
    const {data:rows,error:e}=await db.from("exchange_evidence").select("photos,video_path").eq("deal_id",id);check(e);
    if(!rows?.some(r=>r.video_path===path||r.photos.includes(path)))throw new HttpError(404,"Evidence not found");
    const {data,error:se}=await db.storage.from("exchange-evidence").createSignedUrl(path,60);check(se);
    check((await db.from("trust_audit_logs").insert({actor_id:user.id,entity_type:"deal",entity_id:id,action:"evidence_access",details:{path}})).error);return Response.json(data);
  }
  if(profile.account_status!=="active"&&stage!=="dispute")throw new HttpError(403,"Account restricted");
  if(!["pickup","delivery","dispute","return"].includes(stage))throw new HttpError(400,"Invalid stage");
  if(stage==="pickup"&&deal.seller_id!==user.id||stage==="delivery"&&deal.buyer_id!==user.id||stage==="return"&&deal.seller_id!==user.id)throw new HttpError(403,"Evidence role mismatch");
  const types:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","video/webm":"webm","video/mp4":"mp4"};
  const ext=types[String(b.mimeType)];if(!ext)throw new HttpError(400,"Unsupported file type");
  const uploadPath=`${id}/${user.id}/${stage}/${crypto.randomUUID()}.${ext}`;
  const {data,error:se}=await db.storage.from("exchange-evidence").createSignedUploadUrl(uploadPath,{upsert:false});check(se);return Response.json(data);
}catch(e){return fail(e);}}
