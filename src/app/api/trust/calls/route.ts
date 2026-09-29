import { actor, bodyJson, check, fail, HttpError, rateLimit } from '@/lib/trust/server';
export const runtime='nodejs';
export async function GET(request:Request){try{
  const {db,user}=await actor(request,false,true);
  const id=new URL(request.url).searchParams.get('id');
  if(!id){
    const {data:calls,error}=await db.from('calls').select('id,caller_id,receiver_id,status,created_at,ended_at,recording_consent,offer,answer').or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at',{ascending:false}).limit(20);
    check(error);
    const callIds=(calls||[]).map(c=>c.id);
    const {data:recordings}=callIds.length?await db.from('call_recordings').select('id,call_id,uploaded_by,status,error,created_at').in('call_id',callIds):{data:[]};
    return Response.json({calls:calls||[],recordings:recordings||[]});
  }
  const {data,error}=await db.from('calls').select('*').eq('id',id).single();check(error);
  if(!data||![data.caller_id,data.receiver_id].includes(user.id))throw new HttpError(403,'Call access denied');
  return Response.json({call:data,recordingAllowed:data.status==='ACCEPTED'&&!!data.recording_consent?.[data.caller_id]&&!!data.recording_consent?.[data.receiver_id]});
}catch(e){return fail(e);}}
export async function POST(request:Request){try{const {db,user}=await actor(request,false,true);const b=await bodyJson(request);
  if(b.action==='save_offer'||b.action==='save_answer'){
    const callId=String(b.callId||''),description=b.action==='save_offer'?b.offer:b.answer;
    if(!callId||!description||typeof description!=='object')throw new HttpError(400,'Call description required');
    const {data:call,error}=await db.from('calls').select('caller_id,receiver_id,status').eq('id',callId).single();check(error);
    const allowed=b.action==='save_offer'?call?.caller_id===user.id&&call.status==='RINGING':call?.receiver_id===user.id&&call.status==='ACCEPTED';
    if(!allowed)throw new HttpError(403,'Call signal access denied');
    check((await db.from('calls').update(b.action==='save_offer'?{offer:description}:{answer:description}).eq('id',callId)).error);
    return Response.json({ok:true});
  }
  await rateLimit(db,`call:${user.id}`,15);
  const {data,error}=await db.rpc('trust_call_action',{p_actor:user.id,p_action:b.action,p_call:b.callId||null,p_data:b});check(error);return Response.json(data);
}catch(e){return fail(e);}}
