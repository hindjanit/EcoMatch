import { NextResponse } from "next/server";

export const runtime = "nodejs";

function localCheck(text: string) {
  const rules: { re: RegExp; reason: string }[] = [
    { re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, reason: "Email address sharing detected" },
    { re: /(?:https?:\/\/|www\.|wa\.me|t\.me|instagram\.com|facebook\.com|snapchat\.com)/i, reason: "External link or social platform redirect detected" },
    { re: /\b[6-9]\d{9}\b/, reason: "Phone number sharing detected" },
    { re: /\b(?:whats\s?app|telegram|insta(?:gram)?|snap(?:chat)?|call me|text me|dm me|contact me|outside ecomatch)\b/i, reason: "Attempt to move the conversation outside EcoMatch" },
    { re: /\b(?:six|seven|eight|nine|zero|one|two|three|four|five)(?:[\s,.-]+(?:zero|one|two|three|four|five|six|seven|eight|nine)){7,}\b/i, reason: "Phone number written in words may be present" },
  ];
  for (const rule of rules) if (rule.re.test(text)) return { suspicious: true, reason: rule.reason, source: "rules" };
  return { suspicious: false, reason: "", source: "rules" };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body?.message || "").trim().slice(0, 2000);
    if (!message) return NextResponse.json({ suspicious: false, reason: "" });

    const local = localCheck(message);
    if (local.suspicious) return NextResponse.json(local);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json(local);

    const prompt = `You are EcoMatch Chat Safety. Decide whether this marketplace chat message is trying to move a buyer/seller conversation outside EcoMatch by sharing or disguising phone numbers, emails, social handles, external links, WhatsApp/Telegram/Instagram contact, or asking the other person to contact elsewhere. Do NOT flag ordinary discussion about product pickup locations, prices, product specifications, or saying that they prefer to stay on EcoMatch. Return ONLY JSON: {"suspicious":true|false,"reason":"short reason"}. Message: ${JSON.stringify(message)}`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: "application/json" } }),
    });
    if (!response.ok) return NextResponse.json(local);
    const raw = await response.json();
    const text = raw?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
    try {
      const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim());
      return NextResponse.json({ suspicious: Boolean(parsed.suspicious), reason: String(parsed.reason || "AI detected a possible off-platform diversion attempt"), source: "ai" });
    } catch { return NextResponse.json(local); }
  } catch {
    return NextResponse.json({ suspicious: false, reason: "" });
  }
}
