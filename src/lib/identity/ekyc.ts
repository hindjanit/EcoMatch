import {DOMParser, type Element} from '@xmldom/xmldom';
import {SignedXml} from 'xml-crypto';
import {createHash,verify, type KeyLike} from 'node:crypto';
const DS='http://www.w3.org/2000/09/xmldsig#';
const C14N='http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
const EXC='http://www.w3.org/2001/10/xml-exc-c14n#';
export class EkycError extends Error {}
const invalid=()=>new EkycError('Invalid XML file');
const failed=()=>new EkycError('UIDAI digital signature verification failed');
function parse(xml:string){
 if(Buffer.byteLength(xml)>2*1024*1024||/<!DOCTYPE|<!ENTITY/i.test(xml))throw invalid();
 try{return new DOMParser({onError:()=>{throw invalid();}}).parseFromString(xml,'application/xml');}catch{throw invalid();}
}
function children(e:Element,name:string){return Array.from(e.childNodes).filter((n):n is Element=>n.nodeType===1&&(n as Element).localName===name);}
function one(e:Element,name:string){const a=children(e,name);if(a.length!==1)throw new EkycError('e-KYC file is valid but required identity fields are missing');return a[0];}
export function inspectEkyc(xml:string){
 const doc=parse(xml);const root=doc.documentElement;
 if(!root||!['OKY','OfflinePaperlessKyc'].includes(root.localName||''))throw new EkycError('This XML is not a UIDAI Paperless Offline e-KYC file');
 const namespace=root.namespaceURI||'';
 if(namespace!==''&&namespace!=='http://www.uidai.gov.in/offlinePaperlesseKYC/1.0')throw new EkycError('This XML is not a UIDAI Paperless Offline e-KYC file');
 if(root.localName==='OKY'){
  if(!root.getAttribute('s'))throw new EkycError('Required UIDAI signature is missing');
  if(Array.from(root.childNodes).some(n=>n.nodeType===1))throw invalid();
 }else{
  const signatures=doc.getElementsByTagNameNS(DS,'Signature');
  if(signatures.length===0)throw new EkycError('Required UIDAI signature is missing');
  if(signatures.length!==1||signatures[0].parentNode!==root)throw failed();
 }
 return {doc,root};
}
/** trustedCertificate is supplied only by the server trust store, NEVER XML KeyInfo or request input. */
export function verifyEkyc(xml:string,trustedCertificate:string|Buffer,userId:string){
 const {doc,root}=inspectEkyc(xml);let identityRoot=root;
 if(root.localName==='OKY'){
  const signature=root.getAttribute('s')!;
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(signature))throw failed();
  // Preserve original signed bytes. Match the root attribute only, including its quote style.
  const opening=xml.match(/<OKY\b[^>]*>/)?.[0];
  const signatureAttribute=opening?.match(/\s+s\s*=\s*(["'])([\s\S]*?)\1/)?.[0];
  if(!opening||!signatureAttribute)throw failed();
  const unsigned=xml.replace(opening,opening.replace(signatureAttribute,''));
  if(!verify('RSA-SHA256',Buffer.from(unsigned),trustedCertificate as KeyLike,Buffer.from(signature,'base64')))throw failed();
 }else{
  const signature=doc.getElementsByTagNameNS(DS,'Signature')[0];
  const infos=signature.getElementsByTagNameNS(DS,'SignedInfo');
  if(infos.length!==1)throw failed();
  const info=infos[0],refs=info.getElementsByTagNameNS(DS,'Reference');
  // The official profile signs the entire document, not a selected unsigned identity subtree.
  if(refs.length!==1||refs[0].getAttribute('URI')!=='')throw failed();
  const alg=info.getElementsByTagNameNS(DS,'SignatureMethod');
  const digest=refs[0].getElementsByTagNameNS(DS,'DigestMethod');
  const canon=info.getElementsByTagNameNS(DS,'CanonicalizationMethod');
  // rsa-sha1 is the algorithm in UIDAI's published OfflinePaperlessKyc sample; never retry a failed signature with another algorithm.
  if(alg.length!==1||![DS+'rsa-sha1','http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'].includes(alg[0].getAttribute('Algorithm')||'')||digest.length!==1||digest[0].getAttribute('Algorithm')!=='http://www.w3.org/2001/04/xmlenc#sha256'||canon.length!==1||![C14N,EXC].includes(canon[0].getAttribute('Algorithm')||''))throw failed();
  const transforms=Array.from(refs[0].getElementsByTagNameNS(DS,'Transform'));
  if(!transforms.length||transforms[0].getAttribute('Algorithm')!==DS+'enveloped-signature'||transforms.length>2||transforms.some(t=>![DS+'enveloped-signature',C14N,EXC].includes(t.getAttribute('Algorithm')||'')))throw failed();
  try{
   const sig=new SignedXml({publicCert:trustedCertificate,getCertFromKeyInfo:()=>null});
   sig.loadSignature(signature.toString());if(!sig.checkSignature(xml))throw failed();
   const signed=sig.getSignedReferences();if(signed.length!==1)throw failed();
   identityRoot=parse(signed[0]).documentElement!;
   if(identityRoot.localName!=='OfflinePaperlessKyc')throw failed();
  }catch{throw failed();}
 }
 const compact=identityRoot.localName==='OKY';
 const poi=compact?identityRoot:one(one(identityRoot,'UidData'),'Poi');
 const name=poi.getAttribute(compact?'n':'name')?.trim();
 const dob=poi.getAttribute(compact?'d':'dob')?.trim();
 const reference=identityRoot.getAttribute(compact?'r':'referenceId');
 if(!name||!dob||!reference||name.length>200||dob.length>32)throw new EkycError('e-KYC file is valid but required identity fields are missing');
 return {identity:{name,dob,referenceMasked:'UIDAI signed document'},proofHash:createHash('sha256').update(userId).update(xml).digest('hex')};
}
