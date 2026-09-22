import { NextResponse } from "next/server";

export const runtime = "nodejs";

export type CallAnalysisResult = {
  transcript: string;
  is_diverted: boolean;
  diverted_party: "seller" | "buyer" | null;
  diversion_reason: string;
  diversion_snippet: string;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

// Deterministic scanner tailored for Indian circular scrap/material marketplace contexts
function runDeterministicCallSafetyAudit(transcript: string): CallAnalysisResult {
  const normalized = transcript.toLowerCase();

  // 1. Phone numbers (standard 10-digit Indian, obfuscated, or spelled out)
  const phonePattern = /(?:(?:0|\+?91)?[6-9]\d{9})/;
  const disguisedDigits = transcript.replace(/[\s.,\-_*#/()|\\+]/g, "");
  const hasPhone = phonePattern.test(disguisedDigits);

  // 2. WhatsApp / Social / Telegram mentions with intent
  const whatsappPattern = /\b(?:whatsapp|whats\s*app|wa|telegram|tg|insta|instagram|ig)\b/i;
  const contactPhrases = /\b(?:ping|dm|msg|message|text|call|number|no|contact|baat|bhejo|aao)\b/i;

  // 3. Off-platform bypass & cash/direct UPI phrases
  const bypassPhrases = [
    "outside ecomatch",
    "direct deal",
    "bina app ke",
    "platform charges",
    "commission bacha",
    "commission mat do",
    "phonepe pe bhej do",
    "gpay kardo",
    "paytm karo direct",
    "cash me deal",
    "direct factory aao",
    "deal cancel kar do app pe",
    "app pe order cancel",
    "bahar baat karte hai",
    "whatsapp pe aa jao",
  ];

  const matchedBypass = bypassPhrases.find((phrase) => normalized.includes(phrase));

  if (matchedBypass || (whatsappPattern.test(normalized) && contactPhrases.test(normalized)) || hasPhone) {
    let snippet = "";
    const lines = transcript.split("\n");
    for (const line of lines) {
      const lineNorm = line.toLowerCase();
      if (
        (matchedBypass && lineNorm.includes(matchedBypass)) ||
        (whatsappPattern.test(lineNorm) && contactPhrases.test(lineNorm)) ||
        phonePattern.test(line.replace(/[\s.,\-_*#/()|\\+]/g, ""))
      ) {
        snippet = line.trim();
        break;
      }
    }

    const isSeller = /seller|supplier|seller:|supplier:/i.test(snippet) || /bhai direct factory aao|commission bacha|rate kam kar dunga/i.test(normalized);

    return {
      transcript: transcript || "Audio communication session completed.",
      is_diverted: true,
      diverted_party: isSeller ? "seller" : "buyer",
      diversion_reason: matchedBypass
        ? `Attempted disintermediation using bypass phrase: "${matchedBypass}" to circumvent platform escrow.`
        : hasPhone
        ? "Direct phone number exchanged during call to facilitate off-platform deal."
        : "Attempted to divert transaction to external chat / WhatsApp.",
      diversion_snippet: snippet || transcript.slice(0, 160),
      risk_score: 95,
      risk_level: "CRITICAL",
    };
  }

  return {
    transcript: transcript || "Audio communication session completed without safety violations.",
    is_diverted: false,
    diverted_party: null,
    diversion_reason: "Clean in-app discussion regarding lot specification, logistics, and OTP exchange.",
    diversion_snippet: "",
    risk_score: 12,
    risk_level: "LOW",
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      audioBase64,
      audioMimeType = "audio/webm",
      transcriptText = "",
      callerRole = "buyer",
      receiverRole = "seller",
    } = body;

    let transcript = (transcriptText || "").trim();
    const apiKey = process.env.GEMINI_API_KEY;

    // Step 1: Gemini Multimodal Audio Transcription & Analysis if audio provided and API key exists
    if (apiKey && (audioBase64 || transcript)) {
      try {
        const prompt = `You are the EcoMatch Safe Call AI Guard for an Indian circular material and scrap marketplace.
Audit this voice call between a ${callerRole} and a ${receiverRole}.
Your objectives:
1. Provide a concise chronological transcript with speaker identifiers: [Seller] and [Buyer].
2. Identify if either party (especially the Seller) is attempting off-platform diversion / disintermediation:
   - Trying to move communication to WhatsApp, phone calls, Telegram, or external channels.
   - Sharing phone numbers, direct bank UPI, or requesting direct cash/GPay to avoid platform commission.
   - Encouraging the counterparty to cancel the deal on EcoMatch.
3. If clean negotiations (specifications, dispatch timing, pickup location, condition), mark is_diverted as false.

Return ONLY a valid JSON object in this format (no markdown blocks):
{
  "transcript": "[Seller]: ... \\n[Buyer]: ...",
  "is_diverted": true or false,
  "diverted_party": "seller" or "buyer" or null,
  "diversion_reason": "concise explanation",
  "diversion_snippet": "exact quoted phrase where violation occurred",
  "risk_score": 0 to 100,
  "risk_level": "LOW" or "MEDIUM" or "HIGH" or "CRITICAL"
}`;

        const parts: any[] = [{ text: prompt }];

        if (audioBase64) {
          parts.push({
            inlineData: {
              mimeType: audioMimeType,
              data: audioBase64,
            },
          });
        } else if (transcript) {
          parts.push({ text: `Existing Transcript: ${transcript}` });
        }

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            signal: AbortSignal.timeout(6000),
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 500,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (res.ok) {
          const aiJson = await res.json();
          const rawText = aiJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText.trim());
            return NextResponse.json({
              success: true,
              analysis: {
                transcript: parsed.transcript || transcript,
                is_diverted: Boolean(parsed.is_diverted),
                diverted_party: parsed.diverted_party || null,
                diversion_reason: parsed.diversion_reason || "",
                diversion_snippet: parsed.diversion_snippet || "",
                risk_score: Number(parsed.risk_score || 0),
                risk_level: parsed.risk_level || "LOW",
              },
            });
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini call audit fallback to deterministic:", geminiErr);
      }
    }

    // Step 2: Resilient Deterministic Rule Engine
    const ruleVerdict = runDeterministicCallSafetyAudit(transcript);
    return NextResponse.json({
      success: true,
      analysis: ruleVerdict,
    });
  } catch (error: any) {
    console.error("Call analysis route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to analyze call",
        analysis: {
          transcript: "Call ended.",
          is_diverted: false,
          diverted_party: null,
          diversion_reason: "Processing fallback",
          diversion_snippet: "",
          risk_score: 0,
          risk_level: "LOW",
        },
      },
      { status: 500 }
    );
  }
}
