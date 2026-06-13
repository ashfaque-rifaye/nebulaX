// ─── NebulaX media generation layer ─────────────────────────────────────────
// A provider-agnostic catalog of image + video models, mirroring src/llm.ts:
// bring-your-own-key (env or runtime), a broad roster of engines, and — when no
// key / no network is available — a high-fidelity SIMULATION fallback that
// renders an on-brand poster so the whole flow works keyless. Real generation
// lights up automatically the moment a provider key is configured.

export type MediaKind = "image" | "video";

export interface MediaProviderDef {
  id: string;
  name: string;
  kind: MediaKind;
  vendor: string;          // shared credential group (fal / replicate / …)
  envVar: string;          // API key env var
  models: string[];
  defaultModel: string;
  live: boolean;           // is a real API path wired (vs simulate-only for now)
  note?: string;
}

// "Use as many as possible" — a deliberately broad roster.
export const MEDIA_CATALOG: MediaProviderDef[] = [
  // ── Image ──
  { id: "fal-flux", name: "FLUX.1 (fal.ai)", kind: "image", vendor: "fal", envVar: "FAL_KEY",
    models: ["fal-ai/flux/schnell", "fal-ai/flux/dev", "fal-ai/flux-pro/v1.1"], defaultModel: "fal-ai/flux/schnell", live: true },
  { id: "replicate-flux", name: "FLUX (Replicate)", kind: "image", vendor: "replicate", envVar: "REPLICATE_API_TOKEN",
    models: ["black-forest-labs/flux-schnell", "black-forest-labs/flux-dev", "black-forest-labs/flux-1.1-pro"], defaultModel: "black-forest-labs/flux-schnell", live: true },
  { id: "together-flux", name: "FLUX (Together)", kind: "image", vendor: "together", envVar: "TOGETHER_API_KEY",
    models: ["black-forest-labs/FLUX.1-schnell", "black-forest-labs/FLUX.1-dev"], defaultModel: "black-forest-labs/FLUX.1-schnell", live: true },
  { id: "bfl-flux", name: "FLUX Pro (Black Forest)", kind: "image", vendor: "bfl", envVar: "BFL_API_KEY",
    models: ["flux-pro-1.1", "flux-pro", "flux-dev"], defaultModel: "flux-pro-1.1", live: false },
  { id: "stability-sdxl", name: "Stable Diffusion 3 (Stability)", kind: "image", vendor: "stability", envVar: "STABILITY_API_KEY",
    models: ["sd3.5-large", "sd3.5-medium", "stable-image-core"], defaultModel: "sd3.5-large", live: false },
  { id: "replicate-sdxl", name: "SDXL (Replicate)", kind: "image", vendor: "replicate", envVar: "REPLICATE_API_TOKEN",
    models: ["stability-ai/sdxl", "stability-ai/stable-diffusion-3.5-large"], defaultModel: "stability-ai/sdxl", live: true },
  { id: "openai-image", name: "GPT Image (OpenAI)", kind: "image", vendor: "openai", envVar: "OPENAI_API_KEY",
    models: ["gpt-image-1", "dall-e-3"], defaultModel: "gpt-image-1", live: true },
  { id: "hf-image", name: "SDXL (Hugging Face)", kind: "image", vendor: "huggingface", envVar: "HF_API_KEY",
    models: ["stabilityai/stable-diffusion-xl-base-1.0", "black-forest-labs/FLUX.1-schnell"], defaultModel: "stabilityai/stable-diffusion-xl-base-1.0", live: true },

  // ── Video ──
  { id: "higgsfield", name: "Higgsfield", kind: "video", vendor: "higgsfield", envVar: "HIGGSFIELD_API_KEY",
    models: ["higgsfield-dop-turbo", "higgsfield-cinematic"], defaultModel: "higgsfield-dop-turbo", live: false, note: "Cinematic camera-control video" },
  { id: "fal-kling", name: "Kling 1.6 (fal.ai)", kind: "video", vendor: "fal", envVar: "FAL_KEY",
    models: ["fal-ai/kling-video/v1.6/standard", "fal-ai/kling-video/v1.6/pro"], defaultModel: "fal-ai/kling-video/v1.6/standard", live: true },
  { id: "replicate-kling", name: "Kling (Replicate)", kind: "video", vendor: "replicate", envVar: "REPLICATE_API_TOKEN",
    models: ["kwaivgi/kling-v1.6-standard", "kwaivgi/kling-v1.6-pro"], defaultModel: "kwaivgi/kling-v1.6-standard", live: true },
  { id: "fal-runway", name: "Runway Gen-3 (fal.ai)", kind: "video", vendor: "fal", envVar: "FAL_KEY",
    models: ["fal-ai/runway-gen3/turbo/image-to-video"], defaultModel: "fal-ai/runway-gen3/turbo/image-to-video", live: true },
  { id: "fal-luma", name: "Luma Dream Machine (fal.ai)", kind: "video", vendor: "fal", envVar: "FAL_KEY",
    models: ["fal-ai/luma-dream-machine", "fal-ai/luma-dream-machine/ray-2"], defaultModel: "fal-ai/luma-dream-machine", live: true },
  { id: "fal-hunyuan", name: "Hunyuan Video (fal.ai)", kind: "video", vendor: "fal", envVar: "FAL_KEY",
    models: ["fal-ai/hunyuan-video"], defaultModel: "fal-ai/hunyuan-video", live: true },
  { id: "replicate-hunyuan", name: "Hunyuan (Replicate)", kind: "video", vendor: "replicate", envVar: "REPLICATE_API_TOKEN",
    models: ["tencent/hunyuan-video"], defaultModel: "tencent/hunyuan-video", live: true },
  { id: "replicate-ltx", name: "LTX-Video (Replicate)", kind: "video", vendor: "replicate", envVar: "REPLICATE_API_TOKEN",
    models: ["lightricks/ltx-video"], defaultModel: "lightricks/ltx-video", live: true },
  { id: "fal-wan", name: "Wan 2.1 (fal.ai)", kind: "video", vendor: "fal", envVar: "FAL_KEY",
    models: ["fal-ai/wan-t2v", "fal-ai/wan-pro"], defaultModel: "fal-ai/wan-t2v", live: true },
  { id: "replicate-svd", name: "Stable Video (Replicate)", kind: "video", vendor: "replicate", envVar: "REPLICATE_API_TOKEN",
    models: ["stability-ai/stable-video-diffusion"], defaultModel: "stability-ai/stable-video-diffusion", live: true },
  { id: "fal-pika", name: "Pika 2.2 (fal.ai)", kind: "video", vendor: "fal", envVar: "FAL_KEY",
    models: ["fal-ai/pika/v2.2/text-to-video"], defaultModel: "fal-ai/pika/v2.2/text-to-video", live: true },
];

// Runtime (in-memory) key overrides supplied via the Model Control Center.
const runtimeKeys: Record<string, string> = {};

function keyFor(def: MediaProviderDef): string | undefined {
  const rt = runtimeKeys[def.vendor];
  if (rt && rt.trim()) return rt.trim();
  const env = process.env[def.envVar];
  return env && env.trim() ? env.trim() : undefined;
}

export function getMediaProviderById(id: string): MediaProviderDef | undefined {
  return MEDIA_CATALOG.find(p => p.id === id);
}

/** Catalog + which providers are configured (key present), masked. */
export function getMediaConfigSummary() {
  return {
    providers: MEDIA_CATALOG.map(def => {
      const key = keyFor(def);
      return {
        id: def.id, name: def.name, kind: def.kind, vendor: def.vendor, envVar: def.envVar,
        models: def.models, defaultModel: def.defaultModel, live: def.live, note: def.note,
        configured: !!key, maskedKey: key ? maskKey(key) : null,
      };
    }),
  };
}

/** Store/clear a runtime key for a vendor group (memory only — never persisted). */
export function updateMediaConfig(patch: { vendor?: string; apiKey?: string | null }) {
  if (patch.vendor) {
    if (patch.apiKey === null || patch.apiKey === "") delete runtimeKeys[patch.vendor];
    else if (typeof patch.apiKey === "string") runtimeKeys[patch.vendor] = patch.apiKey.trim();
  }
  return getMediaConfigSummary();
}

function maskKey(k: string): string {
  if (k.length <= 8) return "••••";
  return `${k.slice(0, 4)}••••${k.slice(-4)}`;
}

export interface MediaResult {
  url: string;            // data-URI (simulated) or remote URL (live)
  poster?: string;        // poster image for video
  simulated: boolean;
  provider: string;
  model: string;
  seconds?: number;
  note?: string;
}

// ─── Generation entrypoint ──────────────────────────────────────────────────
export async function generateMedia(
  kind: MediaKind,
  prompt: string,
  providerId: string,
  model: string | undefined,
  seconds = 5
): Promise<MediaResult> {
  const def = getMediaProviderById(providerId) || MEDIA_CATALOG.find(p => p.kind === kind)!;
  const useModel = model || def.defaultModel;
  const key = keyFor(def);

  // Live path — only attempted when a key exists AND the provider is wired.
  if (key && def.live) {
    try {
      const real = await callLiveProvider(def, useModel, prompt, key, seconds);
      if (real) return { ...real, simulated: false, provider: def.name, model: useModel, seconds: kind === "video" ? seconds : undefined };
    } catch (err: any) {
      // fall through to simulation on any failure (network / quota / shape)
      console.error(`[media] live ${def.id} failed, simulating:`, err?.message || err);
    }
  }

  // Simulation fallback — always works, keyless.
  const url = simulatedPoster(prompt, kind, def.name, useModel);
  return {
    url,
    poster: kind === "video" ? url : undefined,
    simulated: true,
    provider: def.name,
    model: useModel,
    seconds: kind === "video" ? seconds : undefined,
    note: key ? "Live call failed — showing a preview." : "Preview (add an API key in the Model Control Center for live generation).",
  };
}

// Minimal live adapters for the most common vendors. Each returns a media URL
// or throws. Kept compact; anything not handled returns null → simulation.
async function callLiveProvider(
  def: MediaProviderDef, model: string, prompt: string, key: string, seconds: number
): Promise<{ url: string; poster?: string } | null> {
  if (def.vendor === "openai" && def.kind === "image") {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt, n: 1, size: "1024x1024" }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data: any = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    const url = data?.data?.[0]?.url;
    if (b64) return { url: `data:image/png;base64,${b64}` };
    if (url) return { url };
    throw new Error("No image returned");
  }

  if (def.vendor === "fal") {
    const res = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${key}` },
      body: JSON.stringify(def.kind === "video" ? { prompt, duration: seconds } : { prompt }),
    });
    if (!res.ok) throw new Error(`fal ${res.status}`);
    const data: any = await res.json();
    const img = data?.images?.[0]?.url || data?.image?.url;
    const vid = data?.video?.url || data?.videos?.[0]?.url;
    if (def.kind === "video" && vid) return { url: vid, poster: data?.image?.url };
    if (img) return { url: img };
    throw new Error("No media in fal response");
  }

  if (def.vendor === "replicate") {
    // Replicate is async (create → poll). Kept simple with a short poll budget.
    const create = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, Prefer: "wait" },
      body: JSON.stringify({ version: model, input: def.kind === "video" ? { prompt, num_frames: seconds * 24 } : { prompt } }),
    });
    if (!create.ok) throw new Error(`replicate ${create.status}`);
    const data: any = await create.json();
    const out = Array.isArray(data?.output) ? data.output[data.output.length - 1] : data?.output;
    if (typeof out === "string") return { url: out };
    throw new Error("Replicate prediction not ready");
  }

  if (def.vendor === "together" && def.kind === "image") {
    const res = await fetch("https://api.together.xyz/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt, n: 1 }),
    });
    if (!res.ok) throw new Error(`together ${res.status}`);
    const data: any = await res.json();
    const url = data?.data?.[0]?.url;
    const b64 = data?.data?.[0]?.b64_json;
    if (url) return { url };
    if (b64) return { url: `data:image/png;base64,${b64}` };
    throw new Error("No image in together response");
  }

  if (def.vendor === "huggingface" && def.kind === "image") {
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ inputs: prompt }),
    });
    if (!res.ok) throw new Error(`hf ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { url: `data:image/png;base64,${buf.toString("base64")}` };
  }

  return null;
}

// ─── Simulated poster (on-brand SVG data-URI) ───────────────────────────────
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

// A LUNA-palette poster derived deterministically from the prompt.
function simulatedPoster(prompt: string, kind: MediaKind, providerName: string, model: string): string {
  const h = hash(prompt + model);
  const palettes = [
    ["#7c5cff", "#ff84c1", "#080b16"],
    ["#bfa6ff", "#7c5cff", "#0a0c14"],
    ["#ff84c1", "#a18fff", "#0d1020"],
    ["#9d85ff", "#22d3ee", "#080b16"],
    ["#7c5cff", "#34d399", "#0a0c14"],
  ];
  const [c1, c2, bg] = palettes[h % palettes.length];
  const W = kind === "video" ? 640 : 512;
  const H = kind === "video" ? 360 : 512;
  const cx = 60 + (h % 380), cy = 60 + ((h >> 3) % 220);
  const r1 = 120 + (h % 90), r2 = 80 + ((h >> 5) % 120);

  // wrap prompt into <=3 lines of ~30 chars
  const words = prompt.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 32) { lines.push(cur.trim()); cur = w; }
    else cur += " " + w;
    if (lines.length >= 2) break;
  }
  if (cur.trim() && lines.length < 3) lines.push(cur.trim());
  const promptLines = lines.slice(0, 3);
  const esc = (s: string) => s.replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

  const playGlyph = kind === "video"
    ? `<g transform="translate(${W / 2},${H / 2 - 30})">
         <circle r="34" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
         <path d="M-10,-16 L18,0 L-10,16 Z" fill="#ffffff" opacity="0.92"/>
       </g>
       <rect x="0" y="0" width="${W}" height="${H}" fill="url(#scan)" opacity="0.5"/>` : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="g1" cx="${(cx / W * 100).toFixed(0)}%" cy="${(cy / H * 100).toFixed(0)}%" r="80%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.95"/>
      <stop offset="55%" stop-color="${c2}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${bg}" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="50%" stop-color="#000" stop-opacity="0.06"/>
      <stop offset="51%" stop-color="#fff" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="26"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect width="${W}" height="${H}" fill="url(#g1)"/>
  <circle cx="${cx}" cy="${cy}" r="${r1}" fill="${c1}" opacity="0.30" filter="url(#blur)"/>
  <circle cx="${W - cx * 0.6}" cy="${H - cy * 0.5}" r="${r2}" fill="${c2}" opacity="0.30" filter="url(#blur)"/>
  <g stroke="${c1}" stroke-width="1" fill="none" opacity="0.35">
    <ellipse cx="${W / 2}" cy="${H / 2}" rx="${r1}" ry="${r1 * 0.42}" transform="rotate(${h % 60} ${W / 2} ${H / 2})"/>
    <ellipse cx="${W / 2}" cy="${H / 2}" rx="${r2}" ry="${r2 * 0.5}" transform="rotate(${-(h % 50)} ${W / 2} ${H / 2})"/>
  </g>
  ${Array.from({ length: 28 }).map((_, i) => {
    const x = (hash(prompt + i) % W), y = (hash(model + i) % H), rr = (i % 3 === 0 ? 1.6 : 0.9);
    return `<circle cx="${x}" cy="${y}" r="${rr}" fill="#ffffff" opacity="${0.25 + (i % 4) * 0.12}"/>`;
  }).join("")}
  ${playGlyph}
  <text x="22" y="34" font-family="monospace" font-size="11" fill="#ffffff" opacity="0.7" letter-spacing="2">NEBULAX · ${kind.toUpperCase()} STUDIO</text>
  ${promptLines.map((l, i) => `<text x="22" y="${H - 56 + i * 22}" font-family="sans-serif" font-weight="700" font-size="18" fill="#ffffff">${esc(l)}</text>`).join("")}
  <text x="22" y="${H - 14}" font-family="monospace" font-size="10" fill="#ffffff" opacity="0.6">${esc(providerName)} · ${esc(model.split("/").pop() || model)}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
