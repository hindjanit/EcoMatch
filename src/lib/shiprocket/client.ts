import "server-only";

/**
 * Shiprocket Server-Side Integration Client
 *
 * Implements external authentication with caching and retry,
 * courier serviceability check, adhoc order creation,
 * AWB generation, pickup request, tracking, and cancellation.
 *
 * SECURITY:
 * Strictly server-side. Shiprocket credentials must NEVER be logged,
 * saved in databases, or exposed to the frontend/browser.
 */

export interface ShiprocketCredentials {
  email?: string;
  password?: string;
  baseUrl?: string;
}

export interface ShiprocketAddress {
  name: string;
  email: string;
  phone: string;
  address: string;
  address_2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface ShiprocketOrderItem {
  name: string;
  sku: string;
  units: number;
  selling_price: number;
  discount?: number;
  tax?: number;
  hsn?: number | string;
}

export interface CreateAdhocOrderInput {
  order_id: string; // EcoMatch deal ID or deal-derived reference
  order_date: string; // YYYY-MM-DD HH:mm
  pickup_location?: string; // Registered Shiprocket pickup location nickname
  channel_id?: string;
  comment?: string;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_address_2?: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country?: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  shipping_customer_name?: string;
  shipping_last_name?: string;
  shipping_address?: string;
  shipping_address_2?: string;
  shipping_city?: string;
  shipping_pincode?: string;
  shipping_country?: string;
  shipping_state?: string;
  shipping_email?: string;
  shipping_phone?: string;
  order_items: ShiprocketOrderItem[];
  payment_method: "Prepaid" | "COD";
  shipping_charges?: number;
  giftwrap_charges?: number;
  transaction_charges?: number;
  total_discount?: number;
  sub_total: number;
  length: number; // in cm
  breadth: number; // in cm
  height: number; // in cm
  weight: number; // in kg
}

export interface ServiceabilityResponse {
  available: boolean;
  courier_company_id?: number;
  courier_name?: string;
  rate?: number; // Courier carrier charge in INR
  etd?: string; // Estimated delivery date/time
  rating?: number;
  raw?: unknown;
}

export interface ShiprocketOrderResult {
  order_id: number;
  shipment_id: number;
  status: string;
  status_code: number;
  onboarding_completed_now?: number;
  awb_code?: string;
  courier_company_id?: string;
  courier_name?: string;
}

export interface AssignAWBResult {
  awb_code: string;
  courier_company_id: number;
  courier_name: string;
  applied_weight: number;
  shipment_id: number;
}

export interface PickupScheduleResult {
  pickup_status: number;
  pickup_token_number?: string;
  pickup_scheduled_date?: string;
  details?: unknown;
}

export interface TrackingActivity {
  date: string;
  status: string;
  activity: string;
  location: string;
  sr_status?: string;
}

export interface TrackingResult {
  tracking_data: {
    track_status: number;
    shipment_status: number;
    shipment_track?: TrackingActivity[];
    shipment_track_activities?: TrackingActivity[];
    track_url?: string;
    etd?: string;
    current_status?: string;
  };
}

// In-memory token cache with expiration timestamp (strictly server-side)
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export function getShiprocketBaseUrl(): string {
  const url = process.env.SHIPROCKET_BASE_URL?.trim();
  if (url && url.length > 0) {
    return url.replace(/\/+$/, "");
  }
  return "https://apiv2.shiprocket.in";
}

export function isShiprocketConfigured(): boolean {
  const email = process.env.SHIPROCKET_API_EMAIL?.trim();
  const password = process.env.SHIPROCKET_API_PASSWORD?.trim();
  return Boolean(email && password && email.length > 0 && password.length > 0);
}

/**
 * Retrieves valid Shiprocket Bearer token, renewing if expired or close to expiry (10 min buffer).
 */
export async function getShiprocketToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cachedToken && tokenExpiresAt > now + 10 * 60 * 1000) {
    return cachedToken;
  }

  const email = process.env.SHIPROCKET_API_EMAIL?.trim();
  const password = process.env.SHIPROCKET_API_PASSWORD?.trim();

  if (!email || !password) {
    throw new Error(
      "Shiprocket API credentials are not configured on the server. Set SHIPROCKET_API_EMAIL and SHIPROCKET_API_PASSWORD in your environment variables."
    );
  }

  const baseUrl = getShiprocketBaseUrl();
  const authUrl = `${baseUrl}/v1/external/auth/login`;

  const response = await fetch(authUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    let errMsg = `Authentication failed (${response.status})`;
    try {
      const errBody = await response.json();
      if (errBody?.message) errMsg = errBody.message;
    } catch {
      // ignore
    }
    // Never include email/password in errors
    throw new Error(`Shiprocket authentication error: ${errMsg}`);
  }

  const data = await response.json();
  const token = data?.token;
  if (!token || typeof token !== "string") {
    throw new Error("Shiprocket authentication response did not contain a valid bearer token.");
  }

  cachedToken = token;
  // Shiprocket tokens are generally valid for 10 days (864000s). We default to 7 days safely.
  const expiresInMs = (data?.expires_in || 7 * 24 * 3600) * 1000;
  tokenExpiresAt = now + expiresInMs;

  return cachedToken;
}

/**
 * Generic authenticated Shiprocket request wrapper with automatic 401 retry.
 */
export async function shiprocketRequest<T = any>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: any;
    params?: Record<string, string | number | boolean | undefined>;
  } = {}
): Promise<T> {
  const baseUrl = getShiprocketBaseUrl();
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  let urlStr = `${baseUrl}${path}`;
  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(options.params)) {
      if (v !== undefined && v !== null) searchParams.append(k, String(v));
    }
    const query = searchParams.toString();
    if (query) urlStr += `?${query}`;
  }

  let token = await getShiprocketToken();

  const performFetch = async (bearer: string) => {
    return fetch(urlStr, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
  };

  let response = await performFetch(token);

  // If token expired (401), force refresh once and retry
  if (response.status === 401) {
    token = await getShiprocketToken(true);
    response = await performFetch(token);
  }

  if (!response.ok) {
    let errMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson?.message) errMessage = errJson.message;
      else if (errJson?.error) errMessage = typeof errJson.error === "string" ? errJson.error : JSON.stringify(errJson.error);
    } catch {
      // response wasn't JSON
    }
    throw new Error(`Shiprocket request to ${endpoint} failed: ${errMessage}`);
  }

  return response.json();
}

/**
 * Check Courier Serviceability between pickup and delivery pincodes
 * GET /v1/external/courier/serviceability/
 */
export async function checkCourierServiceability(params: {
  pickup_postcode: string;
  delivery_postcode: string;
  weight: number; // kg
  cod?: 0 | 1;
  length?: number;
  breadth?: number;
  height?: number;
}): Promise<ServiceabilityResponse> {
  try {
    const data = await shiprocketRequest<{
      status: number;
      data?: {
        available_courier_companies?: Array<{
          courier_company_id: number;
          courier_name: string;
          rate: number | string;
          estimated_delivery_days?: string;
          etd?: string;
          rating?: number;
        }>;
      };
    }>("/v1/external/courier/serviceability/", {
      method: "GET",
      params: {
        pickup_postcode: params.pickup_postcode,
        delivery_postcode: params.delivery_postcode,
        weight: params.weight,
        cod: params.cod ?? 0,
        length: params.length,
        breadth: params.breadth,
        height: params.height,
      },
    });

    const companies = data?.data?.available_courier_companies || [];
    if (!companies.length) {
      return { available: false };
    }

    // Pick lowest rate courier
    const sorted = [...companies].sort((a, b) => Number(a.rate) - Number(b.rate));
    const best = sorted[0];

    return {
      available: true,
      courier_company_id: best.courier_company_id,
      courier_name: best.courier_name,
      rate: Number(best.rate),
      etd: best.etd || best.estimated_delivery_days,
      rating: best.rating,
      raw: best,
    };
  } catch (error) {
    return {
      available: false,
      raw: error instanceof Error ? error.message : "Serviceability lookup failed",
    };
  }
}

/**
 * Create an adhoc order in Shiprocket
 * POST /v1/external/orders/create/adhoc
 */
export async function createShiprocketOrder(
  payload: CreateAdhocOrderInput
): Promise<ShiprocketOrderResult> {
  const result = await shiprocketRequest<{
    order_id: number;
    shipment_id: number;
    status: string;
    status_code: number;
    awb_code?: string;
    courier_company_id?: string;
    courier_name?: string;
  }>("/v1/external/orders/create/adhoc", {
    method: "POST",
    body: payload,
  });

  return {
    order_id: result.order_id,
    shipment_id: result.shipment_id,
    status: result.status,
    status_code: result.status_code,
    awb_code: result.awb_code,
    courier_company_id: result.courier_company_id,
    courier_name: result.courier_name,
  };
}

/**
 * Assign AWB to shipment
 * POST /v1/external/courier/assign/awb
 */
export async function assignShiprocketAWB(params: {
  shipment_id: number;
  courier_id?: number;
}): Promise<AssignAWBResult> {
  const result = await shiprocketRequest<{
    awb_assign_status: number;
    response?: {
      data?: {
        awb_code: string;
        courier_company_id: number;
        courier_name: string;
        applied_weight: number;
        shipment_id: number;
      };
    };
  }>("/v1/external/courier/assign/awb", {
    method: "POST",
    body: params,
  });

  const d = result?.response?.data;
  if (!d?.awb_code) {
    throw new Error("Shiprocket failed to generate AWB code for this shipment.");
  }

  return {
    awb_code: d.awb_code,
    courier_company_id: d.courier_company_id,
    courier_name: d.courier_name,
    applied_weight: d.applied_weight,
    shipment_id: d.shipment_id,
  };
}

/**
 * Request Pickup for AWB
 * POST /v1/external/courier/generate/pickup
 */
export async function requestShiprocketPickup(params: {
  shipment_id: number[];
  pickup_date?: string[]; // YYYY-MM-DD
}): Promise<PickupScheduleResult> {
  const result = await shiprocketRequest<{
    pickup_status: number;
    response?: {
      pickup_token_number?: string;
      pickup_scheduled_date?: string;
      details?: unknown;
    };
  }>("/v1/external/courier/generate/pickup", {
    method: "POST",
    body: params,
  });

  return {
    pickup_status: result.pickup_status,
    pickup_token_number: result?.response?.pickup_token_number,
    pickup_scheduled_date: result?.response?.pickup_scheduled_date,
    details: result?.response?.details,
  };
}

/**
 * Get Tracking details by AWB code
 * GET /v1/external/courier/track/awb/:awb_code
 */
export async function getShiprocketTracking(awbCode: string): Promise<TrackingResult> {
  if (!awbCode || awbCode.trim().length === 0) {
    throw new Error("AWB code is required for tracking lookup.");
  }

  return shiprocketRequest<TrackingResult>(
    `/v1/external/courier/track/awb/${encodeURIComponent(awbCode.trim())}`,
    {
      method: "GET",
    }
  );
}

/**
 * Cancel an order or shipment in Shiprocket
 * POST /v1/external/orders/cancel
 */
export async function cancelShiprocketShipment(params: {
  ids: number[]; // Shiprocket order ids
}): Promise<{ success: boolean; message?: string }> {
  const result = await shiprocketRequest<{
    status: number;
    message?: string;
  }>("/v1/external/orders/cancel", {
    method: "POST",
    body: params,
  });

  return {
    success: result.status === 200,
    message: result.message,
  };
}

/**
 * Generate Shipping Label
 * POST /v1/external/courier/generate/label
 */
export async function generateShiprocketLabel(shipmentId: number): Promise<string | null> {
  try {
    const result = await shiprocketRequest<{
      label_created?: number;
      label_url?: string;
    }>("/v1/external/courier/generate/label", {
      method: "POST",
      body: { shipment_id: [shipmentId] },
    });
    return result?.label_url || null;
  } catch {
    return null;
  }
}

/**
 * Non-destructive connectivity and serviceability check
 * Authenticates with Shiprocket and queries courier serviceability between two valid Indian PIN codes.
 * Does NOT create any orders, shipments, AWBs, or pickups.
 */
export async function checkShiprocketConnectivity(
  pickupPostcode = "110020",
  deliveryPostcode = "110001",
  weightKg = 1.0
): Promise<{
  connected: boolean;
  authenticated: boolean;
  baseUrl: string;
  serviceability: ServiceabilityResponse;
  ratesAvailable: boolean;
  sampleCarrier?: string;
  sampleRateRupees?: number;
  message?: string;
}> {
  const baseUrl = getShiprocketBaseUrl();
  try {
    // 1. Authenticate (retrieves/validates Bearer token)
    await getShiprocketToken(false);

    // 2. Query courier serviceability without booking
    const service = await checkCourierServiceability({
      pickup_postcode: pickupPostcode,
      delivery_postcode: deliveryPostcode,
      weight: weightKg,
    });

    return {
      connected: true,
      authenticated: true,
      baseUrl,
      serviceability: service,
      ratesAvailable: service.available,
      sampleCarrier: service.courier_name,
      sampleRateRupees: service.rate,
      message: service.available
        ? `Successfully authenticated and retrieved live rate: ₹${service.rate} via ${service.courier_name}`
        : "Authenticated, but no couriers available for specified PIN codes",
    };
  } catch (error) {
    return {
      connected: false,
      authenticated: false,
      baseUrl,
      serviceability: { available: false },
      ratesAvailable: false,
      message: error instanceof Error ? error.message : "Shiprocket connection failed",
    };
  }
}
