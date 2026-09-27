import { actor, bodyJson, check, fail, HttpError, rateLimit } from "@/lib/trust/server";
import { assessListing } from "@/lib/trust/ai";
export const runtime="nodejs";
export const maxDuration=60;
export async function POST(request:Request){try{
  const {db,user,profile}=await actor(request);await rateLimit(db,`listing:${user.id}`,5);
  const b=await bodyJson(request);const id=String(b.productId||"");
  const {data:p,error}=await db.from("products").select("seller_id,status").eq("id",id).single();check(error);
  if(!p||p.seller_id!==user.id&&profile.role!=="admin")throw new HttpError(403,"Listing access denied");
  if(!["pending","pending_review","changes_requested"].includes(p.status))throw new HttpError(409,"Listing already reviewed");
  return Response.json(await assessListing(db,id));
}catch(e){return fail(e);}}
