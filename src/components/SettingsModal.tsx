import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Cpu, KeyRound, Check, Loader2, Zap, ShieldCheck, AlertTriangle,
  ChevronDown, Sparkles, Layers, Eye, EyeOff
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

// Model Control Center: pick the engine the swarm thinks with, bring your own
// keys, and verify the connection live. Keys live in server memory only.
export const SettingsModal: React.FC<SettingsModalProps> = ({ isDark, onClose, onSaved }) => {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [modelDrafts, setModelDrafts] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/llm/config");
      if (res.ok) setConfig(await res.json());
    } catch (err) {
      console.error("Failed to load LLM config:", err);
    }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const put = async (body: any) => {
    const res = await fetch("/api/llm/config", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) {
      const cfg = await res.json();
      setConfig(cfg);
      onSaved?.(cfg);
      return cfg;
    }
    return null;
  };

  const setActive = async (id: string | null) => { await put({ activeProviderId: id }); };

  const saveProvider = async (p: ProviderInfo) => {
    setSaving(p.id);
    const overrides: any = { [p.id]: {} };
    if (keyDrafts[p.id] !== undefined) overrides[p.id].apiKey = keyDrafts[p.id];
    if (modelDrafts[p.id] !== undefined) overrides[p.id].model = modelDrafts[p.id];
    await put({ overrides });
    setKeyDrafts((d) => { const n = { ...d }; delete n[p.id]; return n; });
    setSaving(null);
  };

  const runTest = async (id: string) => {
    setTests((t) => ({ ...t, [id]: { running: true } }));
    try {
      const res = await fetch("/api/llm/test", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId: id }),
      });
      const data = await res.json();
      setTests((t) => ({ ...t, [id]: { running: false, ok: data.ok, latencyMs: data.latencyMs, error: data.error } }));
    } catch (err: any) {
      setTests((t) => ({ ...t, [id]: { running: false, ok: false, error: err?.message || "Test failed" } }));
    }
  };

  const surface = isDark ? "bg-[#0a0e17] border-white/10" : "bg-white border-slate-200";
  const inner = isDark ? "bg-[#0f1522] border-white/8" : "bg-slate-50 border-slate-200";
  const muted = isDark ? "text-[#8b93a7]" : "text-slate-500";
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
            <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? "text-gray-400 hover:bg-white/10 hover:text-white" : "text-slate-400 hover:bg-slate-100"}`} title="Close settings">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* body */}
          <div className="relative z-10 flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {!config ? (
              <div className="flex flex-col gap-3">
                <div className="skeleton h-14" /><div className="skeleton h-14" /><div className="skeleton h-14" />
              </div>
            ) : (
              <>
                {/* routing mode */}
                <div className="flex flex-col gap-2">
                  <span className={`text-[10px] font-mono uppercase tracking-widest font-bold ${muted}`}>Routing</span>
                  <button
                    onClick={() => setActive(null)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all press ${
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
                            disabled={!p.configured}
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
                                    disabled={!dirty || saving === p.id}
                                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-lg transition-all press"
                                  >
                                    {saving === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    Save changes
                                  </button>
                                  <button
                                    onClick={() => runTest(p.id)}
                                    disabled={test?.running || (!p.configured && keyDrafts[p.id] === undefined)}
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
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
