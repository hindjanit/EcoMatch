import { priceQuote, securityDeposit } from "./domain";
import {
  isShiprocketConfigured,
  checkCourierServiceability,
  createShiprocketOrder,
  assignShiprocketAWB,
  requestShiprocketPickup,
  getShiprocketTracking,
  cancelShiprocketShipment,
} from "@/lib/shiprocket/client";

export type Location = { address: string; latitude: number; longitude: number; pincode?: string };
export type Quote = {
  id: string;
  basePaise: number;
  distanceKm: number;
  expiresAt: string;
  isDemo: boolean;
  courierCompanyId?: number | string;
  courierName?: string;
  etd?: string;
};
export type Booking = {
  id: string;
  status: string;
  trackingUrl: string | null;
  isDemo: boolean;
  shipmentId?: number;
  awbCode?: string;
  courierName?: string;
  rawTracking?: unknown;
};

export interface LogisticsProvider {
  getQuote(pickup: Location, drop: Location, weightKg?: number): Promise<Quote>;
  createDelivery(
    quote: Quote,
    idempotencyKey: string,
    orderContext?: {
      dealId: string;
      productTitle: string;
      quantity: number;
      pricePaise: number;
      weightKg?: number;
      dimensions?: { length: number; breadth: number; height: number };
      seller: { name: string; phone: string; email: string; address: string; pincode?: string; city?: string; state?: string };
      buyer: { name: string; phone: string; email: string; address: string; pincode?: string; city?: string; state?: string };
    }
  ): Promise<Booking>;
  cancelDelivery(id: string): Promise<void>;
  getDeliveryStatus(id: string): Promise<string>;
  getTracking(id: string, awbCode?: string): Promise<Booking>;
  handleWebhook(raw: string, signature: string): Promise<{ eventId: string; bookingId: string; status: string }>;
}

export interface PaymentProvider {
  createOrder(amountPaise: number, idempotencyKey: string): Promise<{ id: string; isDemo: boolean }>;
  verifyPayment(
    raw: string,
    signature: string
  ): Promise<{ eventId: string; orderId: string; amountPaise: number; currency: "INR"; status: "HELD" }>;
  refundPayment(id: string, amountPaise: number, key: string): Promise<{ id: string; status: string }>;
  releasePayment(id: string, amountPaise: number, key: string): Promise<{ id: string; status: string }>;
  getPaymentStatus(id: string): Promise<string>;
}

export class MockLogisticsProvider implements LogisticsProvider {
  async getQuote(pickup: Location, drop: Location): Promise<Quote> {
    for (const l of [pickup, drop]) {
      if (
        !l.address.trim() ||
        !Number.isFinite(l.latitude) ||
        !Number.isFinite(l.longitude) ||
        Math.abs(l.latitude) > 90 ||
        Math.abs(l.longitude) > 180
      )
        throw new Error("Complete valid pickup and drop locations are required");
    }
    const r = Math.PI / 180,
      a =
        Math.sin(((drop.latitude - pickup.latitude) * r) / 2) ** 2 +
        Math.cos(pickup.latitude * r) *
          Math.cos(drop.latitude * r) *
          Math.sin(((drop.longitude - pickup.longitude) * r) / 2) ** 2;
    return {
      id: crypto.randomUUID(),
      basePaise: 30000,
      distanceKm: Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      isDemo: true,
      courierName: "Demo Logistics Partner",
    };
  }

  async createDelivery(_quote: Quote, key: string): Promise<Booking> {
    return { id: `demo-${key}`, status: "LOGISTICS_BOOKED", trackingUrl: null, isDemo: true };
  }

  async cancelDelivery(): Promise<void> {}

  async getDeliveryStatus() {
    return "SIMULATED_STATUS_REQUIRES_DEMO_ACTION";
  }

  async getTracking(id: string): Promise<Booking> {
    return { id, status: await this.getDeliveryStatus(), trackingUrl: null, isDemo: true };
  }

  async handleWebhook(): Promise<never> {
    throw new Error("Demo logistics has no external webhooks");
  }
}

/**
 * Real Shiprocket Logistics Provider
 */
export class ShiprocketLogisticsProvider implements LogisticsProvider {
  private extractPincode(addr: string): string {
    const match = addr.match(/\b([1-9][0-9]{5})\b/);
    return match ? match[1] : "";
  }

  async getQuote(pickup: Location, drop: Location, weightKg = 1.0): Promise<Quote> {
    const pickupPincode = pickup.pincode || this.extractPincode(pickup.address);
    const dropPincode = drop.pincode || this.extractPincode(drop.address);

    if (!pickupPincode || !dropPincode) {
      throw new Error(
        "A valid 6-digit Indian PIN code was not found in the pickup or delivery address. Please include your PIN code."
      );
    }

    const r = Math.PI / 180,
      a =
        Math.sin(((drop.latitude - pickup.latitude) * r) / 2) ** 2 +
        Math.cos(pickup.latitude * r) *
          Math.cos(drop.latitude * r) *
          Math.sin(((drop.longitude - pickup.longitude) * r) / 2) ** 2;
    const distanceKm = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;

    const service = await checkCourierServiceability({
      pickup_postcode: pickupPincode,
      delivery_postcode: dropPincode,
      weight: Math.max(0.5, Number(weightKg || 1.0)),
    });

    if (!service.available || !service.rate) {
      throw new Error(
        `Delivery quote unavailable: Shiprocket reports no available couriers between PIN ${pickupPincode} and ${dropPincode}.`
      );
    }

    // Rate is in INR rupees, convert to integer paise
    const basePaise = Math.round(service.rate * 100);

    return {
      id: crypto.randomUUID(),
      basePaise,
      distanceKm,
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      isDemo: false,
      courierCompanyId: service.courier_company_id,
      courierName: service.courier_name || "Shiprocket Express",
      etd: service.etd,
    };
  }

  async createDelivery(
    quote: Quote,
    idempotencyKey: string,
    orderContext?: {
      dealId: string;
      productTitle: string;
      quantity: number;
      pricePaise: number;
      weightKg?: number;
      dimensions?: { length: number; breadth: number; height: number };
      seller: { name: string; phone: string; email: string; address: string; pincode?: string; city?: string; state?: string };
      buyer: { name: string; phone: string; email: string; address: string; pincode?: string; city?: string; state?: string };
    }
  ): Promise<Booking> {
    if (!orderContext) {
      throw new Error("Order context required for genuine Shiprocket booking.");
    }

    const sellerPincode = orderContext.seller.pincode || this.extractPincode(orderContext.seller.address) || "110001";
    const buyerPincode = orderContext.buyer.pincode || this.extractPincode(orderContext.buyer.address) || "110001";

    const orderPayload = {
      order_id: `ECOMATCH-${orderContext.dealId}`,
      order_date: new Date().toISOString().slice(0, 16).replace("T", " "),
      billing_customer_name: orderContext.buyer.name || "EcoMatch Buyer",
      billing_address: orderContext.buyer.address || "Verified Buyer Address",
      billing_city: orderContext.buyer.city || "New Delhi",
      billing_pincode: buyerPincode,
      billing_state: orderContext.buyer.state || "Delhi",
      billing_country: "India",
      billing_email: orderContext.buyer.email || "buyer@ecomatch.internal",
      billing_phone: orderContext.buyer.phone?.replace(/[^0-9]/g, "").slice(-10) || "9876543210",
      shipping_is_billing: true,
      order_items: [
        {
          name: orderContext.productTitle || "EcoMatch Verified Material",
          sku: `SKU-${orderContext.dealId.slice(0, 8)}`,
          units: Math.max(1, orderContext.quantity || 1),
          selling_price: Math.max(1, Math.round(orderContext.pricePaise / 100)),
        },
      ],
      payment_method: "Prepaid" as const,
      sub_total: Math.max(1, Math.round(orderContext.pricePaise / 100)),
      length: Math.max(10, orderContext.dimensions?.length || 20),
      breadth: Math.max(10, orderContext.dimensions?.breadth || 15),
      height: Math.max(5, orderContext.dimensions?.height || 10),
      weight: Math.max(0.5, orderContext.weightKg || 1.0),
    };

    // Step 1: Create Adhoc Order
    const orderRes = await createShiprocketOrder(orderPayload);
    const shipmentId = orderRes.shipment_id;
    let awbCode = orderRes.awb_code;
    let courierName = orderRes.courier_name || quote.courierName;

    // Step 2: Assign AWB if not yet generated
    if (!awbCode && shipmentId) {
      try {
        const awbRes = await assignShiprocketAWB({
          shipment_id: shipmentId,
          courier_id: quote.courierCompanyId ? Number(quote.courierCompanyId) : undefined,
        });
        awbCode = awbRes.awb_code;
        if (awbRes.courier_name) courierName = awbRes.courier_name;
      } catch (awbErr) {
        console.error("Shiprocket AWB Assignment warning:", awbErr);
      }
    }

    // Step 3: Request Pickup if AWB assigned
    if (shipmentId && awbCode) {
      try {
        await requestShiprocketPickup({ shipment_id: [shipmentId] });
      } catch (pickupErr) {
        console.error("Shiprocket Pickup Schedule warning:", pickupErr);
      }
    }

    return {
      id: String(orderRes.order_id || shipmentId),
      shipmentId,
      awbCode,
      courierName,
      status: awbCode ? "AWB_ASSIGNED" : "LOGISTICS_BOOKED",
      trackingUrl: awbCode ? `https://shiprocket.co/tracking/${awbCode}` : null,
      isDemo: false,
    };
  }

  async cancelDelivery(id: string): Promise<void> {
    const numId = Number(id);
    if (Number.isFinite(numId)) {
      await cancelShiprocketShipment({ ids: [numId] });
    }
  }

  async getDeliveryStatus(id: string): Promise<string> {
    return "LIVE_COURIER_SYNC";
  }

  async getTracking(id: string, awbCode?: string): Promise<Booking> {
    if (!awbCode) {
      return { id, status: "BOOKED_AWAITING_AWB", trackingUrl: null, isDemo: false };
    }

    const trackingData = await getShiprocketTracking(awbCode);
    const status = trackingData.tracking_data?.current_status || "IN_TRANSIT";
    const trackingUrl = trackingData.tracking_data?.track_url || `https://shiprocket.co/tracking/${awbCode}`;

    return {
      id,
      awbCode,
      status,
      trackingUrl,
      isDemo: false,
      rawTracking: trackingData.tracking_data,
    };
  }

  async handleWebhook(raw: string, signature: string): Promise<{ eventId: string; bookingId: string; status: string }> {
    // Shiprocket webhooks can send awb tracking updates
    try {
      const data = JSON.parse(raw);
      return {
        eventId: String(data.awb || data.shipment_id || crypto.randomUUID()),
        bookingId: String(data.order_id || data.shipment_id || ""),
        status: String(data.current_status || "STATUS_UPDATE"),
      };
    } catch {
      throw new Error("Invalid Shiprocket webhook payload.");
    }
  }
}

export class MockPaymentProvider implements PaymentProvider {
  async createOrder(amount: number, key: string) {
    priceQuote(amount, 0);
    return { id: `demo-${key}`, isDemo: true };
  }
  async verifyPayment(): Promise<never> {
    throw new Error("Mock payments require an authenticated demo action, never a production webhook");
  }
  async refundPayment(id: string, amount: number, key: string) {
    priceQuote(amount, 0);
    return { id: `${id}-refund-${key}`, status: "REFUNDED" };
  }
  async releasePayment(id: string, amount: number, key: string) {
    priceQuote(amount, 0);
    return { id: `${id}-release-${key}`, status: "RELEASED" };
  }
  async getPaymentStatus() {
    return "DEMO";
  }
}

export function deliveryConfig() {
  const markup = Number(process.env.LOGISTICS_MARKUP_PERCENT ?? 10);
  const minimum = Number(process.env.SELLER_DEPOSIT_MIN_PAISE ?? 50000);
  const buffer = Number(process.env.SELLER_DEPOSIT_RISK_BUFFER_PAISE ?? 10000);
  priceQuote(0, 0, markup);
  securityDeposit(0, minimum, buffer);
  return { markup, minimum, buffer, demo: process.env.ECOMATCH_DEMO_MODE === "true" };
}

export function logisticsProvider(): LogisticsProvider {
  const provider = process.env.LOGISTICS_PROVIDER?.toLowerCase().trim();

  // If explicitly set to shiprocket or if shiprocket credentials exist and not in demo-only mode
  if (provider === "shiprocket" || (isShiprocketConfigured() && provider !== "mock")) {
    return new ShiprocketLogisticsProvider();
  }

  if (deliveryConfig().demo && (provider === "mock" || !provider)) {
    return new MockLogisticsProvider();
  }

  if (isShiprocketConfigured()) {
    return new ShiprocketLogisticsProvider();
  }

  throw new Error("Secure Delivery is unavailable until a logistics provider is configured");
}

export function paymentProvider(): PaymentProvider {
  if (deliveryConfig().demo && (process.env.PAYMENT_PROVIDER === "mock" || !process.env.PAYMENT_PROVIDER)) {
    return new MockPaymentProvider();
  }
  throw new Error("Production payment provider and verified callback adapter are not configured");
}
