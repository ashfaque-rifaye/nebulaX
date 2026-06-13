import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Cpu, KeyRound, Check, Loader2, Zap, ShieldCheck, AlertTriangle,
  ChevronDown, Sparkles, Layers, Eye, EyeOff, RefreshCw, WifiOff
} from "lucide-react";

interface ProviderInfo {
  id: string;
  name: string;
  models: string[];
  defaultModel: string;
  keyHint: string;
  model: string;
  configured: boolean;
  keySource: "runtime" | "env" | null;
  maskedKey: string | null;
}

interface LLMConfig {
  activeProviderId: string | null;
  chain: { id: string; name: string; model: string }[];
  providers: ProviderInfo[];
}

interface SettingsModalProps {
  isDark: boolean;
  onClose: () => void;
  onSaved?: (cfg: LLMConfig) => void;
}

type TestState = { running: boolean; ok?: boolean; latencyMs?: number; error?: string };
type LoadState = "loading" | "ready" | "error";

// Static last-resort catalogue. Mirrors PROVIDER_CATALOG in src/llm.ts so the
// control center is never an empty husk if the live config call can't be
// reached — the operator can still read the lineup and queue key changes.
const FALLBACK_PROVIDERS: ProviderInfo[] = [
  { id: "groq", name: "Groq", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3-32b"], defaultModel: "llama-3.3-70b-versatile", keyHint: "console.groq.com/keys", model: "llama-3.3-70b-versatile", configured: false, keySource: null, maskedKey: null },
  { id: "cerebras", name: "Cerebras", models: ["llama-3.3-70b", "llama3.1-8b", "qwen-3-32b", "gpt-oss-120b"], defaultModel: "llama-3.3-70b", keyHint: "cloud.cerebras.ai", model: "llama-3.3-70b", configured: false, keySource: null, maskedKey: null },
  { id: "openai", name: "OpenAI", models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"], defaultModel: "gpt-4o-mini", keyHint: "platform.openai.com/api-keys", model: "gpt-4o-mini", configured: false, keySource: null, maskedKey: null },
  { id: "openrouter", name: "OpenRouter", models: ["meta-llama/llama-3.3-70b-instruct", "anthropic/claude-3.5-haiku", "google/gemini-2.0-flash-001", "deepseek/deepseek-chat-v3-0324"], defaultModel: "meta-llama/llama-3.3-70b-instruct", keyHint: "openrouter.ai/keys", model: "meta-llama/llama-3.3-70b-instruct", configured: false, keySource: null, maskedKey: null },
  { id: "together", name: "Together AI", models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Qwen/Qwen2.5-72B-Instruct-Turbo", "mistralai/Mixtral-8x7B-Instruct-v0.1"], defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo", keyHint: "api.together.xyz/settings/api-keys", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", configured: false, keySource: null, maskedKey: null },
  { id: "mistral", name: "Mistral", models: ["mistral-small-latest", "mistral-large-latest", "open-mistral-nemo"], defaultModel: "mistral-small-latest", keyHint: "console.mistral.ai/api-keys", model: "mistral-small-latest", configured: false, keySource: null, maskedKey: null },
  { id: "huggingface", name: "Hugging Face", models: ["mistralai/Mistral-7B-Instruct-v0.3", "meta-llama/Llama-3.1-8B-Instruct", "Qwen/Qwen2.5-7B-Instruct"], defaultModel: "mistralai/Mistral-7B-Instruct-v0.3", keyHint: "huggingface.co/settings/tokens", model: "mistralai/Mistral-7B-Instruct-v0.3", configured: false, keySource: null, maskedKey: null },
];

const FALLBACK_CONFIG: LLMConfig = { activeProviderId: null, chain: [], providers: FALLBACK_PROVIDERS };

// Fetch with a hard timeout so a stalled request can never strand the modal on
// skeletons. Returns parsed JSON or throws a readable error.
async function fetchJSON<T>(url: string, init?: RequestInit, timeoutMs = 9000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      // A reverse proxy / static host can answer /api/* with the SPA's HTML.
      throw new Error("Unexpected response (not JSON) — is the API server running?");
    }
  } catch (err: any) {
    if (err?.name === "AbortError") throw new Error("Request timed out — the API server didn't respond.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Media engines (image/video) — BYO key, grouped by vendor ───────────────
interface MediaProv { id: string; name: string; kind: "image" | "video"; vendor: string; configured: boolean; live: boolean; }
const VENDOR_LABEL: Record<string, string> = {
  fal: "fal.ai", replicate: "Replicate", openai: "OpenAI", together: "Together AI",
  huggingface: "Hugging Face", stability: "Stability AI", bfl: "Black Forest Labs", higgsfield: "Higgsfield",
};

const MediaEngines: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [provs, setProvs] = useState<MediaProv[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const muted = isDark ? "text-white/50" : "text-slate-500";
  const title = isDark ? "text-white" : "text-slate-900";
  const inner = isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-violet-500/15";

  const load = async () => {
    try { const r = await fetch("/api/media/providers"); if (r.ok) { const d = await r.json(); setProvs(d.providers || []); } } catch { /* ignore */ }
  };
  useEffect(() => { load(); }, []);

  const vendors: string[] = Array.from(new Set(provs.map(p => p.vendor)));
  const save = async (vendor: string) => {
    setSaving(vendor);
    try {
      await fetch("/api/media/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendor, apiKey: drafts[vendor] || "" }) });
      setDrafts(d => { const n = { ...d }; delete n[vendor]; return n; });
      await load();
    } catch { /* ignore */ } finally { setSaving(null); }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className={`text-[10px] font-mono uppercase tracking-widest font-bold ${muted}`}>Media engines · image &amp; video</span>
      <p className={`text-[10.5px] -mt-1 ${muted}`}>Bring your own key to generate live media. Without a key the Studio still renders on-brand previews.</p>
      {vendors.map(v => {
        const group = provs.filter(p => p.vendor === v);
        const configured = group.some(p => p.configured);
        const kinds: string[] = Array.from(new Set(group.map(p => p.kind)));
        const draft = drafts[v];
        return (
          <div key={v} className={`rounded-xl border p-3 ${inner}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs font-bold ${title}`}>{VENDOR_LABEL[v] || v}</span>
                <span className={`text-[8px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded ${isDark ? "bg-white/5 text-white/45" : "bg-violet-500/5 text-violet-600"}`}>{kinds.join(" · ")}</span>
              </div>
              {configured
                ? <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> key set</span>
                : <span className={`text-[9px] font-mono ${muted}`}>no key</span>}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={draft ?? ""}
                onChange={e => setDrafts(d => ({ ...d, [v]: e.target.value }))}
                placeholder={configured ? "•••••••• (replace key)" : `paste ${VENDOR_LABEL[v] || v} API key`}
                className={`flex-1 bg-transparent border rounded-lg px-2.5 py-1.5 text-[11px] font-mono focus:outline-none focus:border-violet-500 ${isDark ? "border-white/10 text-white placeholder-white/30" : "border-violet-500/15 text-slate-800 placeholder-slate-400"}`}
              />
              <button
                onClick={() => save(v)}
                disabled={saving === v || draft === undefined}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-luna-gradient text-white disabled:opacity-40 flex items-center gap-1"
              >
                {saving === v ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Save
              </button>
              {configured && (
                <button onClick={() => { setDrafts(d => ({ ...d, [v]: "" })); save(v); }} title="Remove key" className={`p-1.5 rounded-lg ${isDark ? "hover:bg-white/10 text-white/50" : "hover:bg-slate-100 text-slate-500"}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className={`text-[9px] font-mono mt-1.5 ${muted}`}>{group.map(p => p.name.split(" (")[0]).join(" · ")}</div>
          </div>
        );
      })}
    </div>
  );
};

// Model Control Center: pick the engine the swarm thinks with, bring your own
// keys, and verify the connection live. Keys live in server memory only.
export const SettingsModal: React.FC<SettingsModalProps> = ({ isDark, onClose, onSaved }) => {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [status, setStatus] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [modelDrafts, setModelDrafts] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setLoadError(null);
    try {
      const cfg = await fetchJSON<LLMConfig>("/api/llm/config");
      setConfig(cfg);
      setOffline(false);
      setStatus("ready");
    } catch (err: any) {
      setLoadError(err?.message || "Couldn't reach the model server.");
      setStatus("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Work offline against the static catalogue so the operator can still review
  // the lineup; saves are disabled until the server is reachable again.
  const continueOffline = () => {
    setConfig(FALLBACK_CONFIG);
    setOffline(true);
    setStatus("ready");
  };

  const put = async (body: any): Promise<LLMConfig | null> => {
    try {
      const cfg = await fetchJSON<LLMConfig>("/api/llm/config", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      setConfig(cfg);
      setOffline(false);
      onSaved?.(cfg);
      return cfg;
    } catch (err: any) {
      setLoadError(err?.message || "Couldn't save — the API server is unreachable.");
      return null;
    }
  };

  const setActive = async (id: string | null) => { await put({ activeProviderId: id }); };

  const saveProvider = async (p: ProviderInfo) => {
    setSaving(p.id);
    const overrides: any = { [p.id]: {} };
    if (keyDrafts[p.id] !== undefined) overrides[p.id].apiKey = keyDrafts[p.id];
    if (modelDrafts[p.id] !== undefined) overrides[p.id].model = modelDrafts[p.id];
    const ok = await put({ overrides });
    if (ok) setKeyDrafts((d) => { const n = { ...d }; delete n[p.id]; return n; });
    setSaving(null);
  };

  const runTest = async (id: string) => {
    setTests((t) => ({ ...t, [id]: { running: true } }));
    try {
      const data = await fetchJSON<any>("/api/llm/test", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId: id }),
      }, 20000);
      setTests((t) => ({ ...t, [id]: { running: false, ok: data.ok, latencyMs: data.latencyMs, error: data.error } }));
    } catch (err: any) {
      setTests((t) => ({ ...t, [id]: { running: false, ok: false, error: err?.message || "Test failed" } }));
    }
  };

  const surface = isDark ? "bg-[#0a0d1a] border-white/10" : "bg-white border-slate-200";
  const inner = isDark ? "bg-[#101427] border-white/8" : "bg-slate-50 border-slate-200";
  const muted = isDark ? "text-[#9298b4]" : "text-slate-500";
  const title = isDark ? "text-white" : "text-slate-900";
  const headChain = config?.chain || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className={`relative w-full max-w-2xl max-h-[86vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden noise ${surface}`}
        >
          {/* header */}
          <div className={`relative z-10 px-6 py-4 border-b flex items-center justify-between ${isDark ? "border-white/8" : "border-slate-200"}`}>
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center holo-ring">
                <Cpu className="w-4.5 h-4.5" />
              </span>
              <div>
                <h2 className={`text-base font-bold tracking-tight ${title}`}>Model Control Center</h2>
                <p className={`text-[11px] ${muted}`}>
                  Choose the engine the swarm thinks with. Keys stay in server memory, never written to disk.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status === "ready" && (
                <button onClick={load} className={`p-2 rounded-lg transition-colors ${isDark ? "text-gray-400 hover:bg-white/10 hover:text-white" : "text-slate-400 hover:bg-slate-100"}`} title="Reload providers">
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? "text-gray-400 hover:bg-white/10 hover:text-white" : "text-slate-400 hover:bg-slate-100"}`} title="Close settings">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* offline banner */}
          {offline && (
            <div className="relative z-10 px-6 py-2 bg-amber-500/10 border-b border-amber-500/25 flex items-center gap-2 text-[11px] text-amber-500 font-medium">
              <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
              Offline catalogue — couldn't reach the API server, so saving and testing are paused.
              <button onClick={load} className="ml-auto underline underline-offset-2 hover:text-amber-400">Reconnect</button>
            </div>
          )}

          {/* body */}
          <div className="relative z-10 flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {status === "loading" && (
              <div className="flex flex-col gap-3" aria-busy="true">
                <div className="skeleton h-14" /><div className="skeleton h-14" /><div className="skeleton h-14" />
                <div className={`flex items-center justify-center gap-2 text-[11px] font-mono pt-1 ${muted}`}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading provider catalogue…
                </div>
              </div>
            )}

            {status === "error" && (
              <div className={`rounded-xl border p-6 flex flex-col items-center text-center gap-3 ${isDark ? "border-rose-500/20 bg-rose-500/5" : "border-rose-200 bg-rose-50"}`}>
                <span className="w-11 h-11 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className={`text-sm font-bold ${title}`}>Couldn't load the model catalogue</h3>
                  <p className={`text-[11px] mt-1 max-w-sm ${muted}`}>{loadError}</p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={load} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3.5 py-2 rounded-lg press">
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                  <button onClick={continueOffline} className={`flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-2 rounded-lg border press ${isDark ? "border-white/10 text-gray-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                    Browse offline
                  </button>
                </div>
              </div>
            )}

            {status === "ready" && config && (
              <>
                {/* routing mode */}
                <div className="flex flex-col gap-2">
                  <span className={`text-[10px] font-mono uppercase tracking-widest font-bold ${muted}`}>Routing</span>
                  <button
                    onClick={() => setActive(null)}
                    disabled={offline}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all press disabled:opacity-60 disabled:cursor-not-allowed ${
                      config.activeProviderId === null
                        ? "border-indigo-500/60 bg-indigo-500/10 ring-1 ring-indigo-500/30"
                        : `${inner} hover:border-indigo-500/30`
                    }`}
                  >
                    <Layers className={`w-4 h-4 flex-shrink-0 ${config.activeProviderId === null ? "text-indigo-400" : muted}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold ${title}`}>Automatic cascade</div>
                      <div className={`text-[10.5px] ${muted}`}>
                        {headChain.length > 0
                          ? `Tries ${headChain.map(c => c.name).join(" → ")} until one answers.`
                          : "No provider configured yet — add a key below."}
                      </div>
                    </div>
                    {config.activeProviderId === null && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
                  </button>
                </div>

                {/* provider cards */}
                <div className="flex flex-col gap-2">
                  <span className={`text-[10px] font-mono uppercase tracking-widest font-bold ${muted}`}>Providers</span>
                  {config.providers.map((p) => {
                    const isActive = config.activeProviderId === p.id;
                    const isOpen = expanded === p.id;
                    const test = tests[p.id];
                    const dirty = keyDrafts[p.id] !== undefined || modelDrafts[p.id] !== undefined;
                    return (
                      <div
                        key={p.id}
                        className={`rounded-xl border transition-all ${
                          isActive ? "border-indigo-500/60 bg-indigo-500/[0.06] ring-1 ring-indigo-500/25" : inner
                        }`}
                      >
                        {/* row */}
                        <div className="flex items-center gap-3 p-3">
                          <button
                            onClick={() => setActive(isActive ? null : p.id)}
                            disabled={!p.configured || offline}
                            title={p.configured ? (isActive ? "Unpin (return to cascade)" : `Make ${p.name} the primary engine`) : "Add an API key first"}
                            className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                              isActive ? "border-indigo-400 bg-indigo-500" : p.configured ? "border-slate-400/60 hover:border-indigo-400" : "border-slate-500/25"
                            }`}
                          />
                          <button onClick={() => setExpanded(isOpen ? null : p.id)} className="flex-1 flex items-center gap-3 min-w-0 text-left">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${title}`}>{p.name}</span>
                                {p.keySource === "env" && (
                                  <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">ENV KEY</span>
                                )}
                                {p.keySource === "runtime" && (
                                  <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">YOUR KEY</span>
                                )}
                                {!p.configured && (
                                  <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded-full border ${isDark ? "text-gray-500 border-white/10" : "text-slate-400 border-slate-200"}`}>NO KEY</span>
                                )}
                              </div>
                              <div className={`text-[10.5px] font-mono truncate ${muted}`}>{p.model}</div>
                            </div>
                            <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${muted} ${isOpen ? "rotate-180" : ""}`} />
                          </button>
                        </div>

                        {/* expanded editor */}
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden"
                            >
                              <div className={`px-3 pb-3 pt-1 flex flex-col gap-2.5 border-t ${isDark ? "border-white/5" : "border-slate-200/70"}`}>
                                {/* model picker */}
                                <div className="flex flex-col gap-1 pt-2">
                                  <label className={`text-[9.5px] font-mono uppercase tracking-wider ${muted}`}>Model</label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {p.models.map((m) => {
                                      const selected = (modelDrafts[p.id] ?? p.model) === m;
                                      return (
                                        <button
                                          key={m}
                                          onClick={() => setModelDrafts((d) => ({ ...d, [p.id]: m }))}
                                          className={`text-[10px] font-mono px-2 py-1 rounded-md border transition-all ${
                                            selected
                                              ? "border-indigo-500/60 bg-indigo-500/15 text-indigo-300"
                                              : isDark ? "border-white/10 text-gray-400 hover:border-indigo-500/40 hover:text-gray-200" : "border-slate-200 text-slate-500 hover:border-indigo-400"
                                          }`}
                                        >
                                          {m}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <input
                                    value={modelDrafts[p.id] ?? p.model}
                                    onChange={(e) => setModelDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                                    placeholder="or type any model id…"
                                    spellCheck={false}
                                    className={`text-[11px] font-mono rounded-lg border px-2.5 py-2 focus:outline-none focus:border-indigo-500/60 ${
                                      isDark ? "bg-black/30 border-white/10 text-white placeholder-gray-600" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                                    }`}
                                  />
                                </div>

                                {/* api key */}
                                <div className="flex flex-col gap-1">
                                  <label className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${muted}`}>
                                    <KeyRound className="w-3 h-3" /> API key
                                    <span className="normal-case tracking-normal opacity-70">· get one at {p.keyHint}</span>
                                  </label>
                                  <div className={`flex items-center gap-1 rounded-lg border px-2.5 ${isDark ? "bg-black/30 border-white/10" : "bg-white border-slate-200"}`}>
                                    <input
                                      type={showKey[p.id] ? "text" : "password"}
                                      value={keyDrafts[p.id] ?? ""}
                                      onChange={(e) => setKeyDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                                      placeholder={p.maskedKey ? `current: ${p.maskedKey} — paste to replace` : "paste your key…"}
                                      spellCheck={false}
                                      autoComplete="off"
                                      className={`flex-1 bg-transparent text-[11px] font-mono py-2 focus:outline-none ${isDark ? "text-white placeholder-gray-600" : "text-slate-800 placeholder-slate-400"}`}
                                    />
                                    <button
                                      onClick={() => setShowKey((s) => ({ ...s, [p.id]: !s[p.id] }))}
                                      className={`p-1 rounded ${muted} hover:text-indigo-400`}
                                      title={showKey[p.id] ? "Hide key" : "Show key"}
                                    >
                                      {showKey[p.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </div>

                                {/* actions */}
                                <div className="flex items-center gap-2 pt-0.5">
                                  <button
                                    onClick={() => saveProvider(p)}
                                    disabled={!dirty || saving === p.id || offline}
                                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-lg transition-all press"
                                  >
                                    {saving === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    Save changes
                                  </button>
                                  <button
                                    onClick={() => runTest(p.id)}
                                    disabled={test?.running || offline || (!p.configured && keyDrafts[p.id] === undefined)}
                                    className={`flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-1.5 rounded-lg border transition-all press disabled:opacity-40 ${
                                      isDark ? "border-white/10 text-gray-300 hover:border-cyan-500/50 hover:text-cyan-300" : "border-slate-200 text-slate-600 hover:border-cyan-500"
                                    }`}
                                    title="Saved key required — save first if you just pasted one"
                                  >
                                    {test?.running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                    Test connection
                                  </button>
                                  {test && !test.running && test.ok && (
                                    <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                                      <ShieldCheck className="w-3.5 h-3.5" /> live · {test.latencyMs}ms
                                    </span>
                                  )}
                                  {test && !test.running && test.ok === false && (
                                    <span className="flex items-center gap-1 text-[10px] font-mono text-rose-400 truncate" title={test.error}>
                                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {test.error?.slice(0, 48)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                <p className={`text-[10px] leading-relaxed flex items-start gap-1.5 ${muted}`}>
                  <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0 text-indigo-400" />
                  Pinning a provider makes it the primary engine; the rest of the configured chain stays as automatic fallback, so a demo never dies mid-run.
                </p>

                <div className={`h-px ${isDark ? "bg-white/8" : "bg-slate-200"}`} />
                <MediaEngines isDark={isDark} />
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
