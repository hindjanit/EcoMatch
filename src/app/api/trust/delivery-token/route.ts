import { bodyJson, check, fail, rateLimit, serviceDb } from "@/lib/trust/server";
import { sha256 } from "@/lib/trust/ai";
export async function POST(request:Request){try{
 const b=await bodyJson(request,2048),token=String(b.token||""),otp=String(b.otp||"");
 if(!/^[A-Za-z0-9_-]{43}$/.test(token)||!/^\d{6}$/.test(otp))return Response.json({error:"Invalid or expired handover code"},{status:400});
 const db=serviceDb();await rateLimit(db,`handover:${sha256(token)}`,5);
 const {data,error}=await db.rpc("trust_verify_delivery_token",{p_token:token,p_otp:otp});check(error);
 return Response.json(data.ok?data:{error:"Invalid, expired or unavailable handover code"},{status:data.ok?200:400});
}catch(e){return fail(e);}}
