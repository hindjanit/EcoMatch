import "server-only";
import { createClient as supabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
export function serviceDb(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Keep deployment configuration details server-side. This helper is only ever
  // imported by Route Handlers, so the service-role credential cannot reach a
  // browser bundle.
  if(!url||!key)throw new HttpError(503,"Secure calling is temporarily unavailable. Please try again.");
  return supabaseClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function actor(request:Request,admin=false,allowRestricted=false){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)throw new HttpError(503,"Authentication is not configured");
  const cookieStore=await cookies();
  const auth=createServerClient(url,key,{cookies:{getAll:()=>cookieStore.getAll(),setAll:items=>{for(const i of items)cookieStore.set(i.name,i.value,i.options);}}});
  const bearer=request.headers.get("authorization")?.replace(/^Bearer /i,"");
  const {data:{user},error}=await auth.auth.getUser(bearer);
  if(error||!user)throw new HttpError(401,"Please sign in");
  const db=serviceDb();
  const {data:profile,error:pError}=await db.from("profiles").select("id,role,account_status,is_banned,verification_status").eq("id",user.id).single();
  if(pError||!profile)throw new HttpError(503,"Apply the trust migration before using this feature");
  if(admin&&profile.role!=="admin")throw new HttpError(403,"Admin access required");
  if(!allowRestricted&&(profile.is_banned||profile.account_status!=="active"))throw new HttpError(403,"Your account is restricted pending safety review. Contact the administrator.");
  return {db,user,profile,authDb:auth};
}
export function fail(error:unknown){return Response.json({error:error instanceof HttpError?error.message:error instanceof Error?error.message:"Request failed"},{status:error instanceof HttpError?error.status:400});}
export function check(error:{message:string}|null){if(error)throw new Error(error.message);}
export async function rateLimit(db:ReturnType<typeof serviceDb>,key:string,limit=20){const {data,error}=await db.rpc("trust_rate_limit",{p_key:key,p_limit:limit,p_seconds:60});check(error);if(!data)throw new HttpError(429,"Too many requests. Try again shortly.");}
export async function bodyJson(request:Request,maxBytes=32768):Promise<Record<string,unknown>>{const raw=await request.text();if(Buffer.byteLength(raw)>maxBytes)throw new HttpError(413,"Request too large");const b=JSON.parse(raw);if(!b||typeof b!=="object"||Array.isArray(b))throw new HttpError(400,"Invalid request body");return b;}
