// ─── Nebula Multi-Provider LLM Client ───────────────────────────────────────
// Provider-agnostic, OpenAI-compatible inference with an automatic fallback
// chain. Primary: Groq. Fallbacks (in order): Cerebras → Hugging Face.
//
// Every provider below exposes an OpenAI-compatible /chat/completions endpoint,
// so we drive them all with one request shape and just swap base URL + key.
// No SDK required — Node 18+ ships a global `fetch`.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string | undefined;
  model: string;
  // Some providers (HF) are finicky about response_format; allow opting out.
  supportsJsonMode: boolean;
}

// Build the provider chain from environment variables. Order = priority.
function getProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [
    {
      name: "Groq",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      supportsJsonMode: true,
    },
    {
      name: "Cerebras",
      baseUrl: "https://api.cerebras.ai/v1",
      apiKey: process.env.CEREBRAS_API_KEY,
      model: process.env.CEREBRAS_MODEL || "llama-3.3-70b",
      supportsJsonMode: true,
    },
    {
      name: "HuggingFace",
      baseUrl: "https://router.huggingface.co/v1",
      apiKey: process.env.HF_API_TOKEN,
      model: process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.3",
      supportsJsonMode: false,
    },
  ];

  // Keep only providers that have a usable, non-placeholder key.
  return providers.filter(
    (p) =>
      p.apiKey &&
      p.apiKey.trim() !== "" &&
      !p.apiKey.startsWith("MY_") &&
      !p.apiKey.includes("your_") &&
      !p.apiKey.includes("xxx"),
  );
}

/** True if at least one provider has credentials configured. */
export function isLLMAvailable(): boolean {
  return getProviders().length > 0;
}

/** Names of the configured providers, in fallback order (for logging/UI). */
export function getProviderNames(): string[] {
  return getProviders().map((p) => p.name);
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
    throw new Error("No LLM provider configured (set GROQ_API_KEY / CEREBRAS_API_KEY / HF_API_TOKEN).");
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
