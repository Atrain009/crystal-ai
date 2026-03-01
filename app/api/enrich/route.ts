import { NextResponse } from "next/server";

type EnrichReq = {
  city: string;
  region?: string;
  flags?: Record<string, boolean>;
  prefs?: {
    budget?: "low" | "mid" | "high";
    dietary?: string;          // e.g. "no pork, vegetarian friendly"
    vibe?: string;             // e.g. "street food, cozy cafes"
    contentStyle?: string;     // e.g. "vlog-friendly, cinematic"
  };
};

type EnrichResp = {
  restaurants: Array<{ name: string; vibe: string; order: string; why: string }>;
  activities: string[];
  meta?: { cached?: boolean; fallback?: boolean };
  error?: string;
};

// --- Simple in-memory rate limit + cache (works on warm serverless instances)
const rateMap: Map<string, { count: number; windowStart: number }> =
  (globalThis as any).__rateMap ?? new Map();
(globalThis as any).__rateMap = rateMap;

const cacheMap: Map<string, { value: EnrichResp; expires: number }> =
  (globalThis as any).__cacheMap ?? new Map();
(globalThis as any).__cacheMap = cacheMap;

const WINDOW_MS = 60_000;      // 1 minute
const MAX_REQ_PER_WINDOW = 8;  // guardrail
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

function getClientId(req: Request) {
  // Vercel often provides x-forwarded-for
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || "unknown").trim();
}

function cacheKey(body: EnrichReq) {
  return JSON.stringify({
    city: body.city,
    region: body.region,
    flags: body.flags || {},
    prefs: body.prefs || {},
  });
}

function fallback(city: string): EnrichResp {
  // Safe fallback (generic but useful)
  return {
    restaurants: [
      { name: `${city}: busy local phở spot`, vibe: "classic + fast", order: "house phở", why: "Reliable, iconic, easy win" },
      { name: `${city}: modern coffee shop`, vibe: "clean + aesthetic", order: "signature coffee", why: "Great reset + content-friendly" },
      { name: `${city}: street food cluster`, vibe: "chaotic-good", order: "ask vendor’s best seller", why: "Best ‘local energy’ on camera" },
    ],
    activities: [
      "Do a 90-minute walking loop: 3 food stops + 1 café",
      "Golden hour mission: find the best viewpoint + shoot 20 min of b-roll",
    ],
    meta: { fallback: true },
  };
}

async function callOpenAI(body: EnrichReq): Promise<EnrichResp> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { restaurants: [], activities: [], error: "Missing OPENAI_API_KEY on server." };
  }

  const { city, region, flags, prefs } = body;

  const prompt = `
You are a meticulous travel agent who recommends REALISTIC, plausible picks without making wild claims.
If you're unsure of a specific venue name, use a category-based recommendation (e.g., "busy bún chả spot in Old Quarter")
instead of inventing a fake named place.

Trip context:
- City: ${city}
- Region: ${region || "unknown"}
- Flags: ${JSON.stringify(flags || {})}
- Preferences: ${JSON.stringify(prefs || {})}

Return ONLY valid JSON:
{
  "restaurants": [
    { "name": "...", "vibe": "...", "order": "...", "why": "..." }
  ],
  "activities": ["...", "..."]
}

Rules:
- restaurants: exactly 3 items
- activities: exactly 2 items
- Keep each field concise.
`;

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      // Cost guardrails:
      max_output_tokens: 400,
    }),
  });

  const raw = await resp.json();

  // Extract text safely (Responses API)
  const text =
    raw?.output?.[0]?.content?.find((c: any) => c?.type === "output_text")?.text ??
    raw?.output?.[0]?.content?.[0]?.text;

  if (!resp.ok) {
    return {
      restaurants: [],
      activities: [],
      error: `OpenAI error: ${raw?.error?.message || resp.statusText || "unknown"}`,
    };
  }

  if (!text) {
    return { restaurants: [], activities: [], error: "No text returned from OpenAI." };
  }

  // Parse JSON
  try {
    const parsed = JSON.parse(text);

    // Minimal shape validation
    if (!Array.isArray(parsed.restaurants) || !Array.isArray(parsed.activities)) {
      return { restaurants: [], activities: [], error: "AI returned invalid JSON shape." };
    }

    return {
      restaurants: parsed.restaurants.slice(0, 3),
      activities: parsed.activities.slice(0, 2),
    };
  } catch {
    return { restaurants: [], activities: [], error: "AI response was not valid JSON." };
  }
}

export async function POST(req: Request) {
  const clientId = getClientId(req);

  // Rate limiting
  const now = Date.now();
  const entry = rateMap.get(clientId);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateMap.set(clientId, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
    rateMap.set(clientId, entry);
    if (entry.count > MAX_REQ_PER_WINDOW) {
      return NextResponse.json(
        { restaurants: [], activities: [], error: "Rate limit hit. Try again in ~1 minute." },
        { status: 429 }
      );
    }
  }

  let body: EnrichReq;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ restaurants: [], activities: [], error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.city) {
    return NextResponse.json({ restaurants: [], activities: [], error: "Missing city." }, { status: 400 });
  }

  const key = cacheKey(body);
  const cached = cacheMap.get(key);
  if (cached && cached.expires > now) {
    return NextResponse.json({ ...cached.value, meta: { ...(cached.value.meta || {}), cached: true } });
  }

  // Call OpenAI
  const ai = await callOpenAI(body);

  // Fallback if AI fails
  const result: EnrichResp = ai.error ? { ...fallback(body.city), error: ai.error } : ai;

  cacheMap.set(key, { value: result, expires: now + CACHE_TTL_MS });

  return NextResponse.json(result);
}
