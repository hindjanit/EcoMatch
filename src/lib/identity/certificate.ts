import 'server-only';
import {X509Certificate} from 'node:crypto';
// Fixed official trust anchor source, never a request/KeyInfo-supplied URL.
const CERT_URL='https://backend.uidai.gov.in/get/files/media/document/2026-07/uidai_offline_publickey_2026.cer';
export async function uidaiCertificate(){
 try{
  const r=await fetch(CERT_URL,{signal:AbortSignal.timeout(12000),cache:'no-store',redirect:'error'});
  if(!r.ok)throw new Error();
  const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>32768)throw new Error();
  const cert=new X509Certificate(bytes),now=Date.now();
  if(cert.fingerprint256!=='E0:30:4B:9E:61:EE:36:40:EC:DD:AE:2D:B4:B6:17:F2:E2:67:8F:57:DB:C2:82:6C:2F:86:AC:5C:04:F2:77:DF')throw new Error();
  if(now<Date.parse(cert.validFrom)||now>Date.parse(cert.validTo)||cert.publicKey.asymmetricKeyType!=='rsa'||(cert.publicKey.asymmetricKeyDetails?.modulusLength||0)<2048)throw new Error();
  return cert.toString();
 }catch{throw new Error('UIDAI verification certificate unavailable. Please try again later.');}
}
