import { createClient } from "@/lib/supabase/client";
export async function trustFetch(url:string,options:RequestInit={}){
  const {data:{session}}=await createClient().auth.getSession();
  const response=await fetch(url,{...options,headers:{...(options.body instanceof FormData?{}:{"Content-Type":"application/json"}),...(session?{Authorization:`Bearer ${session.access_token}`} :{}),...options.headers}});
  const data=await response.json();if(!response.ok)throw new Error(data.error||"Request failed");return data;
}
export const trustPost=(url:string,data:Record<string,unknown>)=>trustFetch(url,{method:'POST',body:JSON.stringify(data)});
