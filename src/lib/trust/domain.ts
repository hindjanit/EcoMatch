// Pure business rules shared by server orchestration, UI labels and tests.
export type Check = { status: "pass" | "review" | "fail" | "unknown"; reason: string; penalty: number };
export type ListingReview = { score: number; riskLevel: "LOW" | "MEDIUM" | "HIGH"; recommendation: "AUTO_APPROVE" | "ADMIN_REVIEW"; reasons: string[]; hardFlags: string[]; uncertain: boolean; checks: Record<string, Check> };
export function scoreListing(checks: Record<string, Check>, hardFlags: string[] = []): ListingReview {
  const entries = Object.values(checks);
  const uncertain = entries.length < 6 || entries.some(c => c.status === "unknown");
  const score = Math.max(0, Math.min(100, 100 - entries.reduce((n,c) => n + Math.max(0,Math.min(100,Number.isFinite(c.penalty) ? c.penalty : 100)),0)));
  const approved = score >= 80 && !uncertain && hardFlags.length === 0 && !entries.some(c => c.status === "fail");
  return { score, uncertain, hardFlags, riskLevel: hardFlags.length || score < 50 ? "HIGH" : approved ? "LOW" : "MEDIUM", recommendation: approved ? "AUTO_APPROVE" : "ADMIN_REVIEW", reasons: entries.filter(c=>c.status!=="pass").map(c=>c.reason), checks };
}
export function money(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000) throw new Error("Invalid money amount (integer paise required)");
  return value;
}
export function priceQuote(productPaise:number, deliveryPaise:number, markupPercent=10) {
  money(productPaise); money(deliveryPaise);
  if (!Number.isFinite(markupPercent) || markupPercent < 0 || markupPercent > 100) throw new Error("Invalid markup percentage");
  const servicePaise=money(Math.round(deliveryPaise * markupPercent / 100));
  return { productPaise,deliveryPaise,servicePaise,totalPaise:money(productPaise+deliveryPaise+servicePaise),markupPercent };
}
export function securityDeposit(returnFarePaise:number, minimumPaise=50000, riskBufferPaise=10000) { return money(Math.max(money(minimumPaise),money(returnFarePaise)+money(riskBufferPaise))); }
export const transitions = {
  SELLER_ACCEPTED:["FULFILMENT_SELECTED","CANCELLED"], FULFILMENT_SELECTED:["DELIVERY_QUOTED","CANCELLED"],
  DELIVERY_QUOTED:["BUYER_PAYMENT_PENDING","DELIVERY_QUOTED","CANCELLED","EXPIRED"], BUYER_PAYMENT_PENDING:["BUYER_PAYMENT_HELD","CANCELLED","EXPIRED"],
  BUYER_PAYMENT_HELD:["SELLER_DEPOSIT_PENDING","DISPUTED"], SELLER_DEPOSIT_PENDING:["PICKUP_EVIDENCE_PENDING","DISPUTED"],
  PICKUP_EVIDENCE_PENDING:["PICKUP_VERIFIED","PICKUP_REVIEW_REQUIRED","DISPUTED"], PICKUP_REVIEW_REQUIRED:["PICKUP_VERIFIED","DISPUTED"],
  PICKUP_VERIFIED:["LOGISTICS_BOOKED","DISPUTED"], LOGISTICS_BOOKED:["DRIVER_ASSIGNED","DISPUTED"], DRIVER_ASSIGNED:["PICKUP_COMPLETED","DISPUTED"],
  PICKUP_COMPLETED:["IN_TRANSIT","DISPUTED"], IN_TRANSIT:["DELIVERY_EVIDENCE_PENDING","DISPUTED"],
  DELIVERY_EVIDENCE_PENDING:["BUYER_CONFIRMATION_PENDING","DELIVERY_REVIEW_REQUIRED","DISPUTED"], DELIVERY_REVIEW_REQUIRED:["BUYER_CONFIRMATION_PENDING","DISPUTED"],
  BUYER_CONFIRMATION_PENDING:["PAYMENT_RELEASE_PENDING","DISPUTED"], PAYMENT_RELEASE_PENDING:["COMPLETED","DISPUTED"],
  DISPUTED:["RETURN_REQUESTED","BUYER_CONFIRMATION_PENDING"], RETURN_REQUESTED:["RETURN_BOOKING"], RETURN_BOOKING:["RETURN_PICKUP"],
  RETURN_PICKUP:["RETURN_IN_TRANSIT"], RETURN_IN_TRANSIT:["RETURN_DELIVERED"], RETURN_DELIVERED:["RETURN_VERIFIED"], RETURN_VERIFIED:["RETURNED"],
  COMPLETED:[], RETURNED:[], CANCELLED:[], EXPIRED:[]
} as const;
export type DeliveryState=keyof typeof transitions;
export function assertTransition(from:DeliveryState,to:DeliveryState) {
  if (!(transitions[from] as readonly string[] | undefined)?.includes(to)) throw new Error(`Transition ${from} → ${to} is not allowed`);
}
export function canSettle(state:DeliveryState, disputed:boolean, pickupVerified:boolean, deliveryVerified:boolean, buyerConfirmed:boolean) {
  return state === "PAYMENT_RELEASE_PENDING" && !disputed && pickupVerified && deliveryVerified && buyerConfirmed;
}
export type TranscriptSegment={speakerUserId:string|null;text:string;start:number;end:number;confidence:number;attributionVerified:boolean};
export function detectDiversion(segments:TranscriptSegment[]) {
  const evidence: {userId:string|null;text:string;start:number;confidence:number;explicit:boolean;attributionVerified:boolean;categories:string[]}[]=[];
  for (const s of segments) {
    const t=s.text.normalize("NFKC").toLowerCase();
    // Negated safety advice and quotations require human review, never an immediate restriction.
    const negated=/\b(don't|do not|never|avoid|mat|nahi|nahin|mana)\b|मत|नहीं|नही|[“”"]/.test(t);
    const social=/whats\s*app|telegram|instagram|\bdm\b|व्हाट्सएप|व्हाट्सऐप|टेलीग्राम/.test(t);
    const request=/bhej|aa ja|aao|message|send|number|call me directly|contact me|भेज|आ जाओ|नंबर|नम्बर/.test(t);
    const outside=/ecomatch.{0,18}(bahar|outside)|outside.{0,18}ecomatch|platform.{0,8}fee.{0,12}(bach|avoid)|payment.{0,12}bahar|direct.{0,8}(upi|payment)|upi.{0,15}(direct|bhej)|बाहर.{0,15}(डील|पेमेंट)|फीस.{0,10}बच/.test(t);
    if (!(outside || social && request || /number bhejo|call me directly|नंबर भेजो/.test(t))) continue;
    evidence.push({userId:s.speakerUserId,text:s.text.slice(0,600),start:s.start,confidence:Math.min(1,Math.max(0,s.confidence)),explicit:outside && !negated,attributionVerified:s.attributionVerified,categories:[...(social||request?["OFF_PLATFORM_COMMUNICATION"]:[]),...(outside?["OFF_PLATFORM_PAYMENT"]:[])]});
  }
  const strong=evidence.find(e=>e.explicit && e.attributionVerified && e.userId && e.confidence>=0.95);
  return {diversionDetected:evidence.length>0,riskScore:strong?94:evidence.length?65:0,confidence:strong?.confidence??(evidence[0]?.confidence||0),initiatorUserId:strong?.userId??null,categories:[...new Set(evidence.flatMap(e=>e.categories))],evidence,recommendedAction:strong?"BLOCK_AND_REVIEW":evidence.length?"HOLD_FOR_REVIEW":"NONE"};
}
export function validOtp(expiresAt:string,usedAt:string|null,attempts:number,now=Date.now()) {return !usedAt && attempts<5 && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt)>now;}
export const RECORDING_NOTICE="This call may be recorded and analysed by EcoMatch for marketplace safety, fraud prevention and dispute resolution.";
