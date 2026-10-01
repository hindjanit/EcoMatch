import { actor, bodyJson, check, fail, rateLimit } from "@/lib/trust/server";
import { isValidGstinFormat } from "@/lib/trust/business";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { db, user, authDb } = await actor(request);
    await rateLimit(db, `business-verification:${user.id}`, 6);
    const body = await bodyJson(request, 4096);
    const gstin = String(body.gstin || "").trim().toUpperCase();
    const businessName = String(body.businessName || "").trim().slice(0, 160);
    const tradeName = String(body.tradeName || "").trim().slice(0, 160);
    if (!businessName || !isValidGstinFormat(gstin)) throw new Error("Enter a valid GSTIN checksum and business name.");
    const { error } = await authDb.rpc("trust_submit_business_verification", {
      p_business_name: businessName, p_trade_name: tradeName || null, p_gstin: gstin,
    });
    check(error);
    return Response.json({ ok: true, status: "pending", method: "manual_official_lookup" });
  } catch (error) { return fail(error); }
}
