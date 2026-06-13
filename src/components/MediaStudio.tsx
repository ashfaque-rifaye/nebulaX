import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MediaAsset } from "../types.ts";
import {
  X, Image as ImageIcon, Clapperboard, Sparkles, Loader2, Wand2, Download, Trash2,
  Play, KeyRound, Clock, Coins,
} from "lucide-react";

// Client mirror of the server's media pricing (for the pre-flight estimate chip).
const IMG_RATE: Record<string, number> = {
  "fal-flux": 10, "replicate-flux": 12, "together-flux": 11, "bfl-flux": 14,
  "stability-sdxl": 9, "replicate-sdxl": 8, "openai-image": 18, "hf-image": 6,
};
const VID_RATE: Record<string, number> = {
  higgsfield: 9, "fal-kling": 8, "replicate-kling": 8, "fal-runway": 9,
  "fal-luma": 7, "fal-hunyuan": 6, "replicate-hunyuan": 6, "replicate-ltx": 3,
  "fal-wan": 5, "replicate-svd": 3, "fal-pika": 7,
};
const estImage = (id: string) => IMG_RATE[id] ?? 12;
const estVideo = (id: string, s: number) => (VID_RATE[id] ?? 7) * Math.max(1, s);

interface ProviderInfo {
  id: string; name: string; kind: "image" | "video"; models: string[];
  defaultModel: string; configured: boolean; live: boolean; note?: string;
}

interface Props {
  isDark: boolean;
  missionId: string;
  authed: boolean;
  seedPrompt?: string;
  onRequireAuth: (reason?: string) => void;
  onOpenSettings: () => void;
  onSpent: () => void;        // refresh wallet after a metered generation
  onClose: () => void;
}

export const MediaStudio: React.FC<Props> = ({ isDark, missionId, authed, seedPrompt, onRequireAuth, onOpenSettings, onSpent, onClose }) => {
  const [kind, setKind] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState(seedPrompt || "");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providerId, setProviderId] = useState("");
  const [model, setModel] = useState("");
  const [seconds, setSeconds] = useState(5);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const muted = isDark ? "text-white/55" : "text-slate-500";
  const subtle = isDark ? "text-white/35" : "text-slate-400";
  const cardBg = isDark ? "bg-white/[0.03] border-white/[0.07]" : "bg-white border-violet-500/10";
  const inputBg = isDark ? "bg-black/30 border-white/10 text-white placeholder-white/35" : "bg-white border-violet-500/15 text-slate-800 placeholder-slate-400";

  const kindProviders = providers.filter(p => p.kind === kind);
  const current = providers.find(p => p.id === providerId);
  const estimate = kind === "video" ? estVideo(providerId, seconds) : estImage(providerId);
  const anyConfigured = providers.some(p => p.configured);

  const loadProviders = async () => {
    try {
      const res = await fetch("/api/media/providers");
      if (res.ok) { const d = await res.json(); setProviders(d.providers || []); }
    } catch { /* ignore */ }
  };
  const loadAssets = async () => {
    try {
      const res = await fetch(`/api/missions/${missionId}/media`);
      if (res.ok) { const d = await res.json(); setAssets(d.assets || []); }
    } catch { /* ignore */ }
  };
  useEffect(() => { loadProviders(); loadAssets(); /* eslint-disable-next-line */ }, [missionId]);

  // Default the provider/model when kind changes.
  useEffect(() => {
    const list = providers.filter(p => p.kind === kind);
    if (list.length && !list.some(p => p.id === providerId)) {
      const pref = list.find(p => p.configured) || list[0];
      setProviderId(pref.id); setModel(pref.defaultModel);
    }
  }, [kind, providers]); // eslint-disable-line

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const generate = async () => {
    setErr(null);
    if (!authed) { onRequireAuth("Sign in to generate media — it's metered in credits."); return; }
    if (!prompt.trim()) { setErr("Describe what to generate."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/missions/${missionId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kind, prompt: prompt.trim(), providerId, model, seconds }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAssets(a => [data.asset, ...a]);
        onSpent();
      } else if (res.status === 401) {
        onRequireAuth("Your session expired — sign in to generate.");
      } else {
        setErr(data.error || "Generation failed.");
      }
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setAssets(a => a.filter(x => x.id !== id));
    try { await fetch(`/api/media/${id}`, { method: "DELETE", credentials: "include" }); } catch { /* ignore */ }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(4,4,14,0.66)", backdropFilter: "blur(8px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div className={`relative w-full max-w-4xl max-h-[90vh] rounded-[2rem] border glass-strong shadow-2xl overflow-hidden flex flex-col animate-fadeInUp ${isDark ? "border-white/10" : "border-violet-500/15"}`}>
        {/* header */}
        <div className={`flex items-start justify-between gap-3 px-6 py-4 border-b flex-shrink-0 ${isDark ? "border-white/[0.07]" : "border-violet-500/10"}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-luna-gradient flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className={`text-base font-bold font-display ${isDark ? "text-white" : "text-slate-900"}`}>Media Studio</h3>
              <p className={`text-[11px] ${muted}`}>Visualizer &amp; Cinematographer — render stills &amp; clips from this mission.</p>
            </div>
          </div>
          <button onClick={() => !busy && onClose()} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-white/60" : "hover:bg-slate-100 text-slate-500"}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* composer */}
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* kind toggle */}
            <div className={`flex p-1 rounded-full border w-fit text-xs font-bold ${isDark ? "bg-white/[0.03] border-white/10" : "bg-violet-500/[0.04] border-violet-500/10"}`}>
              {([["image", ImageIcon, "Image"], ["video", Clapperboard, "Video"]] as const).map(([k, Ic, label]) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all ${kind === k ? "bg-luna-gradient text-white shadow" : muted}`}
                >
                  <Ic className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={2}
              placeholder={kind === "video" ? "Describe a short clip — e.g. 'a slow cinematic push-in over a neon payments dashboard at night'" : "Describe an image — e.g. 'editorial hero of competing fintech logos colliding, dark gradient'"}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors ${inputBg}`}
            />

            {/* provider / model / seconds */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-mono uppercase tracking-widest ${subtle}`}>Engine</label>
                <select
                  value={providerId}
                  onChange={e => { setProviderId(e.target.value); const p = providers.find(x => x.id === e.target.value); if (p) setModel(p.defaultModel); }}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 ${inputBg}`}
                >
                  {kindProviders.map(p => (
                    <option key={p.id} value={p.id} className={isDark ? "bg-[#12172e]" : "bg-white"}>
                      {p.name}{p.configured ? " ● live" : " ○ preview"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-mono uppercase tracking-widest ${subtle}`}>Model</label>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 ${inputBg}`}
                >
                  {(current?.models || []).map(m => (
                    <option key={m} value={m} className={isDark ? "bg-[#12172e]" : "bg-white"}>{m.split("/").pop()}</option>
                  ))}
                </select>
              </div>
            </div>

            {kind === "video" && (
              <div className="flex items-center gap-3">
                <label className={`text-[10px] font-mono uppercase tracking-widest ${subtle} flex items-center gap-1`}><Clock className="w-3 h-3" /> Length</label>
                <input type="range" min={2} max={12} value={seconds} onChange={e => setSeconds(parseInt(e.target.value))} className="flex-1 accent-violet-500" />
                <span className={`text-xs font-mono ${muted}`}>{seconds}s</span>
              </div>
            )}

            {err && <div className="text-[12px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{err}</div>}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={generate}
                disabled={busy}
                className="bg-luna-gradient cta-luna text-white text-sm font-bold px-5 py-2.5 rounded-full flex items-center gap-2 disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {busy ? "Rendering…" : `Generate ${kind}`}
                <span className="text-[10px] font-mono bg-black/20 rounded-full px-2 py-0.5 flex items-center gap-1"><Coins className="w-2.5 h-2.5" />~{estimate}</span>
              </button>
              {!anyConfigured && (
                <button onClick={onOpenSettings} className={`text-[11px] flex items-center gap-1.5 ${muted} hover:text-violet-400 transition-colors`}>
                  <KeyRound className="w-3 h-3" /> Add an engine key for live output (previews work now)
                </button>
              )}
            </div>
          </div>

          {/* gallery */}
          <div className={`px-6 pb-6 pt-1`}>
            <div className={`text-[10px] font-mono uppercase tracking-widest mb-2.5 ${subtle}`}>Generated ({assets.length})</div>
            {assets.length === 0 ? (
              <div className={`rounded-2xl border border-dashed ${isDark ? "border-white/10" : "border-violet-500/15"} py-10 text-center text-xs ${muted}`}>
                <Wand2 className="w-6 h-6 mx-auto mb-2 text-violet-400/60" />
                No media yet — describe a scene above and generate.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {assets.map(a => (
                  <div key={a.id} className={`group relative rounded-2xl border overflow-hidden ${cardBg}`}>
                    <div className="relative aspect-video bg-black/40">
                      {a.kind === "video" && !a.simulated && a.url.startsWith("http") ? (
                        <video src={a.url} poster={a.poster} controls className="w-full h-full object-cover" />
                      ) : (
                        <img src={a.poster || a.url} alt={a.prompt} className="w-full h-full object-cover" />
                      )}
                      {a.kind === "video" && (a.simulated || !a.url.startsWith("http")) && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="w-9 h-9 rounded-full bg-white/15 border border-white/40 flex items-center justify-center"><Play className="w-4 h-4 text-white" /></span>
                          <span className="absolute inset-x-0 top-0 h-[2px] bg-violet-300/70 animate-scanner" />
                        </div>
                      )}
                      <div className="absolute top-1.5 left-1.5 flex gap-1">
                        <span className="text-[8px] font-mono uppercase tracking-wide bg-black/55 text-white/90 rounded px-1.5 py-0.5 flex items-center gap-1">
                          {a.kind === "video" ? <Clapperboard className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}{a.kind}
                        </span>
                        {a.simulated && <span className="text-[8px] font-mono uppercase bg-amber-500/80 text-black rounded px-1.5 py-0.5">preview</span>}
                      </div>
                      {/* hover actions */}
                      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={a.url} download={`nebulax-${a.id}.svg`} target="_blank" rel="noreferrer" className="w-6 h-6 rounded-md bg-black/55 hover:bg-black/75 flex items-center justify-center text-white"><Download className="w-3 h-3" /></a>
                        <button onClick={() => remove(a.id)} className="w-6 h-6 rounded-md bg-black/55 hover:bg-rose-500/80 flex items-center justify-center text-white"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <div className="p-2">
                      <p className={`text-[10px] leading-snug line-clamp-2 ${isDark ? "text-white/80" : "text-slate-700"}`}>{a.prompt}</p>
                      <div className={`flex items-center justify-between mt-1 text-[8.5px] font-mono ${subtle}`}>
                        <span className="truncate">{a.provider}</span>
                        <span className="flex items-center gap-0.5 flex-shrink-0"><Coins className="w-2.5 h-2.5" />{a.credits}{a.seconds ? ` · ${a.seconds}s` : ""}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
