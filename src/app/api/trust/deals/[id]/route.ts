import { actor, bodyJson, fail, rateLimit } from "@/lib/trust/server";
import { deliveryAction, deliveryRecord } from "@/lib/trust/delivery";
export const runtime="nodejs";
export const maxDuration=60;
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){try{const {db,user,profile}=await actor(request,false,true);return Response.json(await deliveryRecord(db,(await context.params).id,user.id,profile.role==="admin"));}catch(e){return fail(e);}}
export async function POST(request:Request,context:Context){try{const {db,user,profile}=await actor(request,false,true);await rateLimit(db,`delivery:${user.id}`,25);return Response.json(await deliveryAction(db,(await context.params).id,user.id,profile.role==="admin",await bodyJson(request)));}catch(e){return fail(e);}}
