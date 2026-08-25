import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

const UIDAI_CERT_URL = "https://uidai.gov.in/images/uidai_offline_publickey_2026.cer";

function attr(xml: string, name: string) {
  const match = xml.match(new RegExp(`\\s${name}="([^"]*)"`));
  return match?.[1] || "";
}

function stripSignature(xml: string) {
  return xml.replace(/\s+s="[^"]*"/, "");
}

async function getAuthenticatedUser(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are missing.");
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json();
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("xml");
    const accessToken = String(form.get("accessToken") || "");
    if (!(file instanceof File) || !accessToken) {
      return NextResponse.json({ error: "Offline e-KYC XML and login session are required." }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "XML is too large. Maximum 2MB." }, { status: 400 });
    }
    const user = await getAuthenticatedUser(accessToken);
    if (!user?.id) return NextResponse.json({ error: "Please login again." }, { status: 401 });

    const xml = (await file.text()).trim();
    if (!xml.includes("<OKY") || !attr(xml, "s")) {
      return NextResponse.json({ error: "This does not look like a UIDAI Paperless Offline e-KYC XML." }, { status: 422 });
    }

    const signature = attr(xml, "s");
    const unsignedXml = stripSignature(xml);
    const certResponse = await fetch(UIDAI_CERT_URL, { cache: "no-store" });
    if (!certResponse.ok) throw new Error("Could not load the current UIDAI offline verification certificate.");
    const certBytes = Buffer.from(await certResponse.arrayBuffer());
    const certificate = new crypto.X509Certificate(certBytes);
    const validSignature = crypto.verify(
      "RSA-SHA256",
      Buffer.from(unsignedXml, "utf8"),
      certificate.publicKey,
      Buffer.from(signature, "base64")
    );
    if (!validSignature) {
      return NextResponse.json({ error: "UIDAI digital signature validation failed. The XML may be invalid, modified, or use an unsupported certificate." }, { status: 422 });
    }

    const reference = attr(xml, "r");
    const name = attr(xml, "n");
    const dob = attr(xml, "d");
    const gender = attr(xml, "g");
    const photo = attr(xml, "i");
    const proofHash = crypto.createHash("sha256").update(`${user.id}|${reference}|${signature}`).digest("hex");

    return NextResponse.json({
      verified: true,
      proofHash,
      identity: { name, dob, gender, referenceMasked: reference ? `••••${reference.slice(-4)}` : "UIDAI signed", photoBase64: photo || null },
      note: "UIDAI signature verified. Raw XML is not stored by this endpoint.",
    });
  } catch (error) {
    console.error("Phase 8 Aadhaar verification error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Identity verification failed." }, { status: 500 });
  }
}
