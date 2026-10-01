import { check, fail, HttpError, serviceDb } from "@/lib/trust/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

type Context = { params: Promise<{ provider: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const provider = (await context.params).provider.toLowerCase();

    if (provider === "shiprocket") {
      const configuredSecret = process.env.SHIPROCKET_WEBHOOK_SECRET?.trim();

      // Never accept an unauthenticated public tracking mutation. If the provider
      // webhook secret is not configured, keep the endpoint disabled.
      if (!configuredSecret) {
        throw new HttpError(503, "Shiprocket webhook verification is not configured");
      }
      const receivedToken = request.headers.get("x-api-key");
      if (!receivedToken) {
        throw new HttpError(401, "Missing webhook authorization header (x-api-key)");
      }

      const expectedBuffer = Buffer.from(configuredSecret);
      const receivedBuffer = Buffer.from(receivedToken.trim());

      if (
        expectedBuffer.length !== receivedBuffer.length ||
        !timingSafeEqual(expectedBuffer, receivedBuffer)
      ) {
        throw new HttpError(403, "Invalid webhook security token");
      }

      const rawBody = await request.text();
      let payload: any;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        throw new HttpError(400, "Malformed JSON webhook payload");
      }

      const awb = payload?.awb || payload?.awb_code || payload?.current_awb;
      const status = payload?.current_status || payload?.status || payload?.shipment_status;

      if (awb && status) {
        const db = serviceDb();
        await db
          .from("deliveries")
          .update({
            tracking_status: String(status).toUpperCase(),
            tracking_payload: payload,
            last_tracking_sync_at: new Date().toISOString(),
          })
          .eq("awb_code", String(awb).trim());
      }

      return Response.json({ received: true });
    }

    return fail(
      new HttpError(
        503,
        `No webhook handler configured for provider: ${provider}`
      )
    );
  } catch (e) {
    return fail(e);
  }
}
