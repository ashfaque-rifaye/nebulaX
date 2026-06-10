// ─── Nebula Multi-Provider LLM Client ───────────────────────────────────────
// Provider-agnostic, OpenAI-compatible inference with an automatic fallback
// chain plus runtime configuration: the UI can switch the active model and
// supply API keys at runtime (kept in server memory, never persisted to disk).
//
// Every provider below exposes an OpenAI-compatible /chat/completions endpoint,
// so we drive them all with one request shape and just swap base URL + key.
// No SDK required — Node 18+ ships a global `fetch`.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderDef {
  id: string;
  name: string;
  baseUrl: string;
  envVar: string;             // environment variable that may hold the key
  defaultModel: string;
  models: string[];           // curated picks; any model id can be typed in
  supportsJsonMode: boolean;
  keyHint: string;            // where to get a key
}

// The catalogue of switchable providers, in default fallback priority order.
export const PROVIDER_CATALOG: ProviderDef[] = [
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    envVar: "GROQ_API_KEY",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3-32b"],
    supportsJsonMode: true,
    keyHint: "console.groq.com/keys",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    envVar: "CEREBRAS_API_KEY",
    defaultModel: "llama-3.3-70b",
    models: ["llama-3.3-70b", "llama3.1-8b", "qwen-3-32b", "gpt-oss-120b"],
    supportsJsonMode: true,
    keyHint: "cloud.cerebras.ai",
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    envVar: "OPENAI_API_KEY",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
    supportsJsonMode: true,
    keyHint: "platform.openai.com/api-keys",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    envVar: "OPENROUTER_API_KEY",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    models: ["meta-llama/llama-3.3-70b-instruct", "anthropic/claude-3.5-haiku", "google/gemini-2.0-flash-001", "deepseek/deepseek-chat-v3-0324"],
    supportsJsonMode: true,
    keyHint: "openrouter.ai/keys",
  },
  {
    id: "together",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    envVar: "TOGETHER_API_KEY",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Qwen/Qwen2.5-72B-Instruct-Turbo", "mistralai/Mixtral-8x7B-Instruct-v0.1"],
    supportsJsonMode: true,
    keyHint: "api.together.xyz/settings/api-keys",
  },
  {
    id: "mistral",
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    envVar: "MISTRAL_API_KEY",
    defaultModel: "mistral-small-latest",
    models: ["mistral-small-latest", "mistral-large-latest", "open-mistral-nemo"],
    supportsJsonMode: true,
    keyHint: "console.mistral.ai/api-keys",
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    baseUrl: "https://router.huggingface.co/v1",
    envVar: "HF_API_TOKEN",
    defaultModel: "mistralai/Mistral-7B-Instruct-v0.3",
    models: ["mistralai/Mistral-7B-Instruct-v0.3", "meta-llama/Llama-3.1-8B-Instruct", "Qwen/Qwen2.5-7B-Instruct"],
    supportsJsonMode: false,
    keyHint: "huggingface.co/settings/tokens",
  },
];

// ── Runtime configuration (in-memory; set from the UI via /api/llm/config) ──
interface RuntimeOverride {
  apiKey?: string;   // user-supplied key (overrides env)
  model?: string;    // user-selected model (overrides default/env)
}
interface RuntimeConfig {
  activeProviderId: string | null;   // null = automatic cascade
  overrides: Record<string, RuntimeOverride>;
}
const runtime: RuntimeConfig = { activeProviderId: null, overrides: {} };

const ENV_MODEL_VARS: Record<string, string> = {
  groq: "GROQ_MODEL",
  cerebras: "CEREBRAS_MODEL",
  huggingface: "HF_MODEL",
};

function isUsableKey(key: string | undefined): key is string {
  return !!key && key.trim() !== "" && !key.startsWith("MY_") && !key.includes("your_") && !key.includes("xxx");
}

interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string | undefined;
  model: string;
  supportsJsonMode: boolean;
}

function resolveProvider(def: ProviderDef): ProviderConfig {
  const ov = runtime.overrides[def.id] || {};
  const envKey = process.env[def.envVar];
  const envModel = ENV_MODEL_VARS[def.id] ? process.env[ENV_MODEL_VARS[def.id]] : undefined;
  return {
    id: def.id,
    name: def.name,
    baseUrl: def.baseUrl,
    apiKey: isUsableKey(ov.apiKey) ? ov.apiKey : (isUsableKey(envKey) ? envKey : undefined),
    model: ov.model || envModel || def.defaultModel,
    supportsJsonMode: def.supportsJsonMode,
  };
}

// Build the provider chain. If the user pinned an active provider, it leads
// the chain; remaining configured providers stay as fallbacks.
function getProviders(): ProviderConfig[] {
  const resolved = PROVIDER_CATALOG.map(resolveProvider).filter((p) => isUsableKey(p.apiKey));
  if (!runtime.activeProviderId) return resolved;
  const pinned = resolved.find((p) => p.id === runtime.activeProviderId);
  if (!pinned) return resolved;
  return [pinned, ...resolved.filter((p) => p.id !== pinned.id)];
}

/** True if at least one provider has credentials configured. */
export function isLLMAvailable(): boolean {
  return getProviders().length > 0;
}

/** Names of the configured providers, in fallback order (for logging/UI). */
export function getProviderNames(): string[] {
  return getProviders().map((p) => p.name);
}

/** Mask a key for display: keep first 4 + last 3 characters. */
function maskKey(key: string | undefined): string | null {
  if (!key) return null;
  if (key.length <= 8) return "•••••";
  return `${key.slice(0, 4)}…${key.slice(-3)}`;
}

/** Full config snapshot for the settings UI (keys are masked). */
export function getLLMConfigSummary() {
  const chain = getProviders();
  return {
    activeProviderId: runtime.activeProviderId,
    chain: chain.map((p) => ({ id: p.id, name: p.name, model: p.model })),
    providers: PROVIDER_CATALOG.map((def) => {
      const ov = runtime.overrides[def.id] || {};
      const resolved = resolveProvider(def);
      const envConfigured = isUsableKey(process.env[def.envVar]);
      return {
        id: def.id,
        name: def.name,
        models: def.models,
        defaultModel: def.defaultModel,
        keyHint: def.keyHint,
        model: resolved.model,
        configured: isUsableKey(resolved.apiKey),
        keySource: isUsableKey(ov.apiKey) ? "runtime" : envConfigured ? "env" : null,
        maskedKey: maskKey(resolved.apiKey),
      };
    }),
  };
}

/** Apply runtime configuration from the settings UI. */
export function updateLLMConfig(patch: {
  activeProviderId?: string | null;
  overrides?: Record<string, { apiKey?: string | null; model?: string | null }>;
}) {
  if (patch.activeProviderId !== undefined) {
    const valid = patch.activeProviderId === null || PROVIDER_CATALOG.some((d) => d.id === patch.activeProviderId);
    if (valid) runtime.activeProviderId = patch.activeProviderId;
  }
  if (patch.overrides) {
    for (const [id, ov] of Object.entries(patch.overrides)) {
      if (!PROVIDER_CATALOG.some((d) => d.id === id)) continue;
      const cur = runtime.overrides[id] || {};
      if (ov.apiKey !== undefined) {
        if (ov.apiKey === null || ov.apiKey === "") delete cur.apiKey;
        else cur.apiKey = String(ov.apiKey).trim();
      }
      if (ov.model !== undefined) {
        if (ov.model === null || ov.model === "") delete cur.model;
        else cur.model = String(ov.model).trim();
      }
      runtime.overrides[id] = cur;
    }
  }
  return getLLMConfigSummary();
}

/** Smoke-test one provider (or the head of the chain) and report latency. */
export async function testProvider(providerId?: string): Promise<{ ok: boolean; provider: string; model: string; latencyMs: number; sample?: string; error?: string }> {
  let cfg: ProviderConfig | undefined;
  if (providerId) {
    const def = PROVIDER_CATALOG.find((d) => d.id === providerId);
    if (!def) return { ok: false, provider: providerId, model: "", latencyMs: 0, error: "Unknown provider" };
    cfg = resolveProvider(def);
    if (!isUsableKey(cfg.apiKey)) return { ok: false, provider: cfg.name, model: cfg.model, latencyMs: 0, error: "No API key configured" };
  } else {
    cfg = getProviders()[0];
    if (!cfg) return { ok: false, provider: "none", model: "", latencyMs: 0, error: "No provider configured" };
  }
  const start = Date.now();
  try {
    const { content } = await callProvider(cfg, [{ role: "user", content: "Reply with exactly the word: OK" }], { maxTokens: 5, temperature: 0, timeoutMs: 15000 });
    return { ok: true, provider: cfg.name, model: cfg.model, latencyMs: Date.now() - start, sample: content.trim().slice(0, 40) };
  } catch (err: any) {
    return { ok: false, provider: cfg.name, model: cfg.model, latencyMs: Date.now() - start, error: err?.message || String(err) };
  }
}

interface ChatOptions {
  json?: boolean; // request strict JSON output
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

async function callProvider(
  provider: ProviderConfig,
  messages: ChatMessage[],
  opts: ChatOptions,
): Promise<{ content: string; tokens: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30000);

  try {
    const body: Record<string, any> = {
      model: provider.model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1500,
    };

    if (opts.json && provider.supportsJsonMode) {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`${provider.name} HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data: any = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`${provider.name} returned an empty completion`);
    }
    const tokens: number =
      data?.usage?.total_tokens ??
      ((data?.usage?.prompt_tokens || 0) + (data?.usage?.completion_tokens || 0)) ??
      0;
    return { content, tokens };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Run a chat completion against the provider chain. Tries each provider in
 * priority order and returns the first success. Throws only if all fail.
 */
export async function chat(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<{ text: string; provider: string; tokens: number }> {
  const providers = getProviders();
  if (providers.length === 0) {
    throw new Error("No LLM provider configured (add an API key in Model Settings, or set GROQ_API_KEY / CEREBRAS_API_KEY / HF_API_TOKEN).");
  }

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      const { content, tokens } = await callProvider(provider, messages, opts);
      if (provider !== providers[0]) {
        console.log(`[LLM] Fell back to ${provider.name} (${provider.model}).`);
      }
      return { text: content, provider: provider.name, tokens };
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.warn(`[LLM] ${provider.name} failed: ${msg}`);
      errors.push(`${provider.name}: ${msg}`);
    }
  }

  throw new Error(`All LLM providers failed. ${errors.join(" | ")}`);
}

/** Pull the first balanced JSON object/array out of a (possibly noisy) string. */
function extractJSON(raw: string): string {
  let s = raw.trim();
  // Strip markdown code fences.
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  let start = -1;
  let open = "{";
  let close = "}";
  if (firstObj === -1 && firstArr === -1) return s;
  if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
    start = firstArr;
    open = "[";
    close = "]";
  } else {
    start = firstObj;
  }

  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return s.slice(start);
}

/**
 * Convenience helper: ask the model for JSON and return it parsed.
 * `prompt` is the user instruction; `system` is optional steering.
 */
export async function chatJSON<T = any>(
  prompt: string,
  system?: string,
  opts: ChatOptions = {},
): Promise<{ data: T; provider: string; tokens: number }> {
  const messages: ChatMessage[] = [];
  messages.push({
    role: "system",
    content:
      (system ? system + "\n\n" : "") +
      "You are a precise intelligence-analysis engine. Respond with ONLY valid JSON. No prose, no markdown fences.",
  });
  messages.push({ role: "user", content: prompt });

  const { text, provider, tokens } = await chat(messages, { ...opts, json: true });
  const cleaned = extractJSON(text);
  try {
    return { data: JSON.parse(cleaned) as T, provider, tokens };
  } catch (err) {
    throw new Error(`Failed to parse JSON from ${provider}: ${(err as Error).message}. Raw: ${cleaned.slice(0, 200)}`);
  }
}
