import { NextResponse } from "next/server";

export const runtime = "nodejs";

export type SafetyCheckResult = {
  suspicious: boolean;
  reason: string;
  source: string;
  riskType: "NONE" | "OFF_PLATFORM_DIVERSION" | "CONTACT_INFORMATION_EXCHANGE" | "PAYMENT_DIVERSION" | "VERIFICATION_BYPASS" | "SCAM_SIGNAL";
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: "LOW" | "MEDIUM" | "HIGH";
};

function comprehensiveSafetyCheck(text: string, recentUserMessages?: string[]): SafetyCheckResult {
  const normalized = text.toLowerCase().trim();

  // 1. Check for single/split isolated digits (e.g. "9", "7", "8") sent individually to bypass 10-digit regex
  if (/^\s*\d{1,2}\s*$/.test(text)) {
    return {
      suspicious: true,
      reason: "Single isolated digits cannot be sent individually to prevent split contact sharing. Please write full messages or use the Deal Room.",
      source: "isolated_digit_rule",
      riskType: "CONTACT_INFORMATION_EXCHANGE",
      riskScore: 80,
      riskLevel: "HIGH",
      confidence: "HIGH",
    };
  }

  // 1b. Check cumulative digits across recent messages from same user in this conversation
  if (recentUserMessages && recentUserMessages.length > 0) {
    const combinedHistoryDigits = [...recentUserMessages, text]
      .join("")
      .replace(/\D/g, "");
    if (/(?:(?:0|\+?91)?[6-9]\d{9})/.test(combinedHistoryDigits) || (combinedHistoryDigits.length >= 10 && combinedHistoryDigits.length <= 13)) {
      return {
        suspicious: true,
        reason: "Multi-message split phone number sharing detected.",
        source: "split_history_rule",
        riskType: "CONTACT_INFORMATION_EXCHANGE",
        riskScore: 95,
        riskLevel: "CRITICAL",
        confidence: "HIGH",
      };
    }
  }

  // 2. Disguised phone numbers with symbols, punctuation, spaces, decimals, or words in between
  const digitsOnly = text.replace(/\D/g, "");

  // Standard Indian 10-digit mobile number or 11/12 with country code (91/0)
  if (/(?:^|\D)(?:0|\+?91)?[6-9]\d{9}(?:\D|$)/.test(text.replace(/[\s.,\-_*#/()|\\+]/g, ""))) {
    return {
      suspicious: true,
      reason: "Phone number sharing detected.",
      source: "phone_number_rule",
      riskType: "CONTACT_INFORMATION_EXCHANGE",
      riskScore: 98,
      riskLevel: "CRITICAL",
      confidence: "HIGH",
    };
  }

  // If total digits count in a single message is 10 or more and contains a mobile number pattern:
  if (digitsOnly.length >= 10 && /(?:(?:0|\+?91)?[6-9]\d{9})/.test(digitsOnly)) {
    return {
      suspicious: true,
      reason: "Disguised phone number sharing detected in message.",
      source: "disguised_digits_rule",
      riskType: "CONTACT_INFORMATION_EXCHANGE",
      riskScore: 96,
      riskLevel: "CRITICAL",
      confidence: "HIGH",
    };
  }

  // 3. Spelled-out numbers in English and Hindi/Hinglish
  const numberWordsPattern = /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|shunya|ek|do|doh|teen|tin|chaar|char|paanch|panch|chhe|chhah|che|saat|sat|aath|ath|nau|now|das|dass)\b/gi;
  const wordMatches = normalized.match(numberWordsPattern);
  if (wordMatches && wordMatches.length >= 5) {
    return {
      suspicious: true,
      reason: "Phone number written in words detected.",
      source: "spelled_numbers_rule",
      riskType: "CONTACT_INFORMATION_EXCHANGE",
      riskScore: 92,
      riskLevel: "CRITICAL",
      confidence: "HIGH",
    };
  }

  // 4. Email address sharing (standard and obfuscated)
  const standardEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const obfuscatedEmail = /\b[a-zA-Z0-9._%+-]+\s*(?:@|\[at\]|\(at\)|\bat\b)\s*[a-zA-Z0-9.-]+\s*(?:\.|\bdot\b|\[dot\]|\(dot\))\s*(?:com|in|org|net|co|io|me|xyz|gmail|yahoo|outlook|hotmail)\b/i;
  const emailKeywords = /\b(?:gmail|yahoo|outlook|hotmail|icloud|protonmail|rediffmail)\b/i;

  if (
    standardEmail.test(text) ||
    obfuscatedEmail.test(text) ||
    (emailKeywords.test(text) && /\b(?:mail|email|id|address|send|contact)\b/i.test(normalized))
  ) {
    return {
      suspicious: true,
      reason: "Email address sharing detected.",
      source: "email_rule",
      riskType: "CONTACT_INFORMATION_EXCHANGE",
      riskScore: 90,
      riskLevel: "HIGH",
      confidence: "HIGH",
    };
  }

  // 5. External payment requests (UPI, Paytm, GPay, PhonePe, direct bank transfer)
  const upiPattern = /\b[a-zA-Z0-9._-]+@(okaxis|oksbi|okhdfcbank|okicici|paytm|ybl|ibl|upi)\b/i;
  const paymentPhrases = /\b(?:gpay|phonepe|paytm|bhim\s*upi|direct\s*transfer|google\s*pay|send\s*money|advance\s*payment|token\s*amount)\b/i;
  if (upiPattern.test(text) || (paymentPhrases.test(normalized) && /\b(?:pay|send|transfer|bhejo|id|qr|number)\b/i.test(normalized))) {
    return {
      suspicious: true,
      reason: "Direct payment handle or off-platform payment request detected.",
      source: "payment_diversion_rule",
      riskType: "PAYMENT_DIVERSION",
      riskScore: 95,
      riskLevel: "CRITICAL",
      confidence: "HIGH",
    };
  }

  // 6. Social media handles and platforms
  const socialPlatforms = /\b(?:whats\s?app|telegram|tg|insta(?:gram)?|ig|snap(?:chat)?|facebook|fb|discord|twitter|threads|linkedin|truecaller)\b/i;
  const socialHandles = /(?:^|\s)@([a-zA-Z0-9._]{3,})/i;
  const instaHandlePhrases = /\b(?:insta|ig|snap|tg|telegram|fb|wa)\s*(?:id|handle|pe|par|account|no|num)?\s*[:=\-]?\s*@?([a-zA-Z0-9._]{3,})\b/i;
  const diversionPhrases = /\b(?:ping|dm|msg|message|text|call|contact|reach|add|follow|aao|baat karo)\s*(?:me\s*)?(?:on|pe|par|at|krna)?\s*(?:insta|ig|whatsapp|wa|telegram|tg|snap|fb|call|outside)\b/i;

  if (
    socialPlatforms.test(normalized) &&
    (/\b(?:id|handle|account|no|number|bhejo|ping|dm|add|message|call|pe|par|join)\b/i.test(normalized) ||
      socialHandles.test(text) ||
      instaHandlePhrases.test(normalized))
  ) {
    return {
      suspicious: true,
      reason: "Social media or off-platform handle sharing detected.",
      source: "social_handle_rule",
      riskType: "OFF_PLATFORM_DIVERSION",
      riskScore: 88,
      riskLevel: "HIGH",
      confidence: "HIGH",
    };
  }

  if (diversionPhrases.test(normalized) || normalized.includes("outside ecomatch") || normalized.includes("move this transaction outside")) {
    return {
      suspicious: true,
      reason: "Attempt to move conversation outside EcoMatch detected.",
      source: "diversion_phrase_rule",
      riskType: "OFF_PLATFORM_DIVERSION",
      riskScore: 94,
      riskLevel: "CRITICAL",
      confidence: "HIGH",
    };
  }

  // 7. External links, URLs and shorteners
  const urlPattern = /(?:https?:\/\/|www\.)\S+/i;
  const domainPattern = /\b[a-zA-Z0-9-]+\.(?:com|in|org|net|co|io|me|xyz|app|ai|site|online|tech|store|info|biz|tv|link|click|page\.link|gl|ly|to)\b/i;
  const shorteners = /\b(?:bit\.ly|tinyurl\.com|t\.co|wa\.me|t\.me|chat\.whatsapp\.com|drive\.google\.com|forms\.gle)\b/i;

  if (urlPattern.test(text) || domainPattern.test(text) || shorteners.test(text)) {
    return {
      suspicious: true,
      reason: "External link or web redirect detected.",
      source: "external_link_rule",
      riskType: "VERIFICATION_BYPASS",
      riskScore: 85,
      riskLevel: "HIGH",
      confidence: "HIGH",
    };
  }

  return {
    suspicious: false,
    reason: "",
    source: "rules",
    riskType: "NONE",
    riskScore: 0,
    riskLevel: "LOW",
    confidence: "LOW",
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body?.message || "").trim().slice(0, 2000);
    const recentMessages = Array.isArray(body?.recentMessages)
      ? (body.recentMessages as string[])
      : [];

    if (!message) {
      return NextResponse.json({
        suspicious: false,
        reason: "",
        riskType: "NONE",
        riskScore: 0,
        riskLevel: "LOW",
        confidence: "LOW",
      });
    }

    // Step 1: Instant Deterministic Rule Evaluation
    const ruleResult = comprehensiveSafetyCheck(message, recentMessages);
    if (ruleResult.suspicious) {
      return NextResponse.json(ruleResult);
    }

    // Step 2: AI Safety Semantic Scanner via Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json(ruleResult);

    const prompt = `You are the EcoMatch Anti-Circumvention AI Guard.
Analyze the following user chat message in an Indian circular material marketplace.
Determine if the user is attempting to share or solicit:
- Phone numbers or contact exchange
- External payment methods (GPay, PhonePe, Paytm, direct UPI)
- Moving transaction outside the platform
- Social media handles or links

DO NOT flag legitimate negotiations about product price, condition, lot splitting quantities, or on-platform meeting times.

Return ONLY valid JSON in this exact structure:
{"suspicious": true|false, "reason": "brief explanation", "riskType": "OFF_PLATFORM_DIVERSION"|"CONTACT_INFORMATION_EXCHANGE"|"PAYMENT_DIVERSION"|"NONE", "riskScore": 0-100}

User Message: ${JSON.stringify(message)}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          signal: AbortSignal.timeout(3500),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.0,
              maxOutputTokens: 120,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (response.ok) {
        const raw = await response.json();
        const text =
          raw?.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text || "")
            .join("") || "";
        const clean = text
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        const parsed = JSON.parse(clean);
        if (parsed.suspicious) {
          const score = Number(parsed.riskScore || 85);
          return NextResponse.json({
            suspicious: true,
            reason: String(parsed.reason || "Off-platform diversion detected."),
            source: "ai",
            riskType: parsed.riskType || "OFF_PLATFORM_DIVERSION",
            riskScore: score,
            riskLevel: score >= 90 ? "CRITICAL" : "HIGH",
            confidence: "HIGH",
          });
        }
      }
    } catch (aiErr) {
      console.warn("AI Moderation fallback:", aiErr);
    }

    return NextResponse.json({
      suspicious: false,
      reason: "",
      source: "rules",
      riskType: "NONE",
      riskScore: 0,
      riskLevel: "LOW",
      confidence: "LOW",
    });
  } catch (error) {
    console.error("Moderation endpoint exception:", error);
    return NextResponse.json({
      suspicious: false,
      reason: "",
      riskType: "NONE",
      riskScore: 0,
      riskLevel: "LOW",
      confidence: "LOW",
    });
  }
}
