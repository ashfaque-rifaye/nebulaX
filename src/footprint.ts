// ─── Nebula Carbon & Cost Ledger ────────────────────────────────────────────
// Turns real LLM token usage into an estimated energy / CO₂ / $ footprint, and
// the amount AVOIDED versus a GPT-4-class GPU-inference baseline. These are
// transparent estimates (shown to users as "estimated"), not invented points —
// that's what keeps Green Credits meaningful rather than a gimmick.
//
// Sources / assumptions (rounded, conservative):
// - GPU LLM inference energy ≈ 3 Wh per 1K tokens for a GPT-4-class model.
// - Efficient inference accelerators (Groq LPU, Cerebras WSE) use a fraction of
//   that energy per token; HF routed models sit in between.
// - Global average grid carbon intensity ≈ 400 gCO₂e / kWh.
// - Blended (input+output) price per 1K tokens per provider, USD.

export interface Footprint {
  tokens: number;
  provider: string;
  energyWh: number;       // estimated energy actually used
  co2_g: number;          // estimated CO₂ actually emitted
  co2Saved_g: number;     // CO₂ avoided vs baseline
  costUsd: number;        // estimated $ actually spent
  costSavedUsd: number;   // $ avoided vs baseline
}

const WH_PER_1K_TOKENS_BASELINE = 3.0;        // GPT-4-class GPU inference
const GRID_GCO2_PER_KWH = 400;                // global avg grid intensity

// Fraction of baseline ENERGY each provider uses per token (lower = greener).
const PROVIDER_ENERGY_FACTOR: Record<string, number> = {
  Groq: 0.35,
  Cerebras: 0.5,
  HuggingFace: 0.7,
};

// Blended USD per 1K tokens.
const USD_PER_1K_BASELINE = 0.009;            // GPT-4-class blended
const USD_PER_1K_PROVIDER: Record<string, number> = {
  Groq: 0.0007,
  Cerebras: 0.0008,
  HuggingFace: 0.0006,
};

export function estimateFootprint(tokens: number, provider: string): Footprint {
  const energyFactor = PROVIDER_ENERGY_FACTOR[provider] ?? 0.6;
  const usdPer1k = USD_PER_1K_PROVIDER[provider] ?? 0.001;

  const baselineWh = (tokens / 1000) * WH_PER_1K_TOKENS_BASELINE;
  const energyWh = baselineWh * energyFactor;

  const co2_g = (energyWh / 1000) * GRID_GCO2_PER_KWH;
  const baselineCo2_g = (baselineWh / 1000) * GRID_GCO2_PER_KWH;
  const co2Saved_g = Math.max(0, baselineCo2_g - co2_g);

  const costUsd = (tokens / 1000) * usdPer1k;
  const baselineCostUsd = (tokens / 1000) * USD_PER_1K_BASELINE;
  const costSavedUsd = Math.max(0, baselineCostUsd - costUsd);

  return {
    tokens,
    provider,
    energyWh: round(energyWh, 3),
    co2_g: round(co2_g, 2),
    co2Saved_g: round(co2Saved_g, 2),
    costUsd: round(costUsd, 5),
    costSavedUsd: round(costSavedUsd, 5),
  };
}

// The "efficiency dividend": Green Credits awarded for the footprint Nebula
// avoided on this mission. 1 credit ≈ 1 g CO₂e avoided (rounded).
export function efficiencyDividend(fp: Footprint): number {
  return Math.max(1, Math.round(fp.co2Saved_g));
}

function round(n: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

// Cost (in Green Credits) to run swarm actions. These remain as *display*
// reference / pre-flight estimates; the real charge is metered per token below.
export const DEPLOY_COST = 25;       // deploy a full mission (also a re-sense)
export const MANUAL_AGENT_COST = 6;  // run a single agent manually
export const CHAT_COST = 3;          // ask the fabric assistant a question
export const STARTER_CREDITS = 120;  // new profiles begin here so they can try it

// Minimum wallet balance required to START any model run. The true cost is
// charged after the run from actual token consumption.
export const MIN_RUN_RESERVE = 4;

// ── Token-metered credit pricing ────────────────────────────────────────────
// Credits charged per 1K tokens, by provider. Greener / cheaper engines cost
// fewer credits — so the wallet drains in proportion to the model you actually
// used. Pricier frontier models cost more, exactly as billed.
const CREDITS_PER_1K_DEFAULT = 4.0;
const CREDITS_PER_1K_PROVIDER: Record<string, number> = {
  Groq: 2.0,
  Cerebras: 2.2,
  HuggingFace: 2.6,
  Together: 3.0,
  OpenRouter: 3.5,
  Mistral: 3.2,
  OpenAI: 6.0,
};

/** Green-Credit cost for a metered LLM run. Always ≥ 1 credit for any real run. */
export function creditsForTokens(tokens: number, provider: string): number {
  if (!tokens || tokens <= 0) return 0;
  const rate = CREDITS_PER_1K_PROVIDER[provider] ?? CREDITS_PER_1K_DEFAULT;
  return Math.max(1, Math.round((tokens / 1000) * rate));
}

// ── Media generation pricing (Feature 3) ────────────────────────────────────
// Stills are charged per image; clips per second of footage. Real cloud media
// models are far pricier than text, so credits scale accordingly.
const CREDITS_PER_IMAGE_DEFAULT = 12;
const CREDITS_PER_IMAGE_PROVIDER: Record<string, number> = {
  "fal-flux": 10, "replicate-flux": 12, "together-flux": 11, "bfl-flux": 14,
  "stability-sdxl": 9, "replicate-sdxl": 8, "openai-image": 18, "hf-image": 6,
};
// Per-SECOND credit cost for video. Real cloud video is far pricier than text
// or stills, so clips cost more — but kept affordable against the demo wallet
// (a few seconds, not hundreds of credits). Frontier engines still cost more.
const CREDITS_PER_VIDEO_SEC_DEFAULT = 7;
const CREDITS_PER_VIDEO_SEC_PROVIDER: Record<string, number> = {
  "higgsfield": 9, "fal-kling": 8, "replicate-kling": 8, "fal-runway": 9,
  "fal-luma": 7, "fal-hunyuan": 6, "replicate-hunyuan": 6, "replicate-ltx": 3,
  "fal-wan": 5, "replicate-svd": 3, "fal-pika": 7,
};

export function creditsForImage(providerId: string, count = 1): number {
  const rate = CREDITS_PER_IMAGE_PROVIDER[providerId] ?? CREDITS_PER_IMAGE_DEFAULT;
  return Math.max(1, Math.round(rate * count));
}
export function creditsForVideo(providerId: string, seconds: number): number {
  const rate = CREDITS_PER_VIDEO_SEC_PROVIDER[providerId] ?? CREDITS_PER_VIDEO_SEC_DEFAULT;
  return Math.max(1, Math.round(rate * Math.max(1, seconds)));
}

// The eco-pledge catalogue. Each is a real-world action; credits + estimated
// kg CO₂ saved are conservative. Claimable once per UTC day per pledge.
export interface PledgeDef {
  id: string;
  label: string;
  detail: string;
  credits: number;
  co2_g: number;   // estimated real-world CO₂ saved by the action
  icon: string;    // lucide icon name (resolved on the client)
}

export const PLEDGES: PledgeDef[] = [
  { id: "transit", label: "Took transit / walked / cycled", detail: "Skipped a ~5 km car trip", credits: 40, co2_g: 900, icon: "Bike" },
  { id: "meatfree", label: "Ate a meat-free meal", detail: "One plant-based meal today", credits: 30, co2_g: 1500, icon: "Salad" },
  { id: "ac", label: "Set AC to 24°C or higher", detail: "Eased cooling load today", credits: 25, co2_g: 500, icon: "Thermometer" },
  { id: "offpeak", label: "Cold wash / off-peak appliances", detail: "Ran laundry cold / off-peak", credits: 20, co2_g: 300, icon: "WashingMachine" },
  { id: "standby", label: "Killed standby / switched to LED", detail: "Cut phantom load", credits: 15, co2_g: 120, icon: "Lightbulb" },
  { id: "noplastic", label: "No single-use plastic today", detail: "Reusable bottle / bag", credits: 10, co2_g: 80, icon: "Recycle" },
];
