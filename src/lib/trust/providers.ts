import { priceQuote, securityDeposit } from "./domain";
export type Location={address:string;latitude:number;longitude:number};
export type Quote={id:string;basePaise:number;distanceKm:number;expiresAt:string;isDemo:boolean};
export type Booking={id:string;status:string;trackingUrl:string|null;isDemo:boolean};
export interface LogisticsProvider {
  getQuote(pickup:Location,drop:Location):Promise<Quote>;
  createDelivery(quote:Quote,idempotencyKey:string):Promise<Booking>;
  cancelDelivery(id:string):Promise<void>;
  getDeliveryStatus(id:string):Promise<string>;
  getTracking(id:string):Promise<Booking>;
  handleWebhook(raw:string,signature:string):Promise<{eventId:string;bookingId:string;status:string}>;
}
export interface PaymentProvider {
  createOrder(amountPaise:number,idempotencyKey:string):Promise<{id:string;isDemo:boolean}>;
  verifyPayment(raw:string,signature:string):Promise<{eventId:string;orderId:string;amountPaise:number;currency:"INR";status:"HELD"}>;
  refundPayment(id:string,amountPaise:number,key:string):Promise<{id:string;status:string}>;
  releasePayment(id:string,amountPaise:number,key:string):Promise<{id:string;status:string}>;
  getPaymentStatus(id:string):Promise<string>;
}
export class MockLogisticsProvider implements LogisticsProvider {
  async getQuote(pickup:Location,drop:Location):Promise<Quote> {
    for(const l of [pickup,drop]) if(!l.address.trim()||!Number.isFinite(l.latitude)||!Number.isFinite(l.longitude)||Math.abs(l.latitude)>90||Math.abs(l.longitude)>180) throw new Error("Complete valid pickup and drop locations are required");
    const r=Math.PI/180,a=Math.sin((drop.latitude-pickup.latitude)*r/2)**2+Math.cos(pickup.latitude*r)*Math.cos(drop.latitude*r)*Math.sin((drop.longitude-pickup.longitude)*r/2)**2;
    return {id:crypto.randomUUID(),basePaise:30000,distanceKm:Math.round(6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))*10)/10,expiresAt:new Date(Date.now()+15*60_000).toISOString(),isDemo:true};
  }
  async createDelivery(_quote:Quote,key:string):Promise<Booking>{return {id:`demo-${key}`,status:"LOGISTICS_BOOKED",trackingUrl:null,isDemo:true};}
  async cancelDelivery():Promise<void>{}
  async getDeliveryStatus(){return "SIMULATED_STATUS_REQUIRES_DEMO_ACTION";}
  async getTracking(id:string):Promise<Booking>{return {id,status:await this.getDeliveryStatus(),trackingUrl:null,isDemo:true};}
  async handleWebhook():Promise<never>{throw new Error("Demo logistics has no external webhooks");}
}
// Intentionally no guessed Porter URLs, credentials or payloads. Implement only after
// the merchant's approved Enterprise contract and API documentation are available.
export class PorterLogisticsProvider implements LogisticsProvider {
  private unavailable():never{throw new Error("Porter Enterprise adapter is not configured. Supply approved API documentation and credentials.");}
  async getQuote():Promise<Quote>{return this.unavailable();}
  async createDelivery():Promise<Booking>{return this.unavailable();}
  async cancelDelivery():Promise<void>{this.unavailable();}
  async getDeliveryStatus():Promise<string>{return this.unavailable();}
  async getTracking():Promise<Booking>{return this.unavailable();}
  async handleWebhook():Promise<never>{return this.unavailable();}
}
export class MockPaymentProvider implements PaymentProvider {
  async createOrder(amount:number,key:string){priceQuote(amount,0);return {id:`demo-${key}`,isDemo:true};}
  async verifyPayment():Promise<never>{throw new Error("Mock payments require an authenticated demo action, never a production webhook");}
  async refundPayment(id:string,amount:number,key:string){priceQuote(amount,0);return {id:`${id}-refund-${key}`,status:"REFUNDED"};}
  async releasePayment(id:string,amount:number,key:string){priceQuote(amount,0);return {id:`${id}-release-${key}`,status:"RELEASED"};}
  async getPaymentStatus(){return "DEMO";}
}
export function deliveryConfig(){
  const markup=Number(process.env.LOGISTICS_MARKUP_PERCENT??10),minimum=Number(process.env.SELLER_DEPOSIT_MIN_PAISE??50000),buffer=Number(process.env.SELLER_DEPOSIT_RISK_BUFFER_PAISE??10000);
  priceQuote(0,0,markup);securityDeposit(0,minimum,buffer);
  return {markup,minimum,buffer,demo:process.env.ECOMATCH_DEMO_MODE==="true"};
}
export function logisticsProvider():LogisticsProvider {if(process.env.LOGISTICS_PROVIDER==="porter")return new PorterLogisticsProvider();if(deliveryConfig().demo&&process.env.LOGISTICS_PROVIDER==="mock")return new MockLogisticsProvider();throw new Error("Secure Delivery is unavailable until a logistics provider is configured");}
export function paymentProvider():PaymentProvider {if(deliveryConfig().demo&&process.env.PAYMENT_PROVIDER==="mock")return new MockPaymentProvider();throw new Error("Production payment provider and verified callback adapter are not configured");}
