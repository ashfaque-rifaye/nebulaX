import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Mission } from "../types.ts";
import { AGENTS } from "../content.ts";
import {
  X, Target, Plus, Sparkles, Radio, RotateCcw, Save, Loader2, SlidersHorizontal,
  Bot, Compass, Search, FileText, ShieldCheck, Network, ShieldAlert, BookOpen, Mail, Clapperboard, Image as ImageIcon
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Compass, Search, FileText, ShieldCheck, Network, ShieldAlert, Sparkles, BookOpen, Mail,
  Clapperboard, Image: ImageIcon, Bot,
};

// Agents that must always run (the sense → verify → weave spine).
const CORE_AGENTS = new Set(["conductor", "pathfinder", "analyst", "veritas", "cartographer"]);

const CADENCE_OPTIONS = [
  { v: 30, label: "30s" },
  { v: 45, label: "45s" },
  { v: 120, label: "2m" },
  { v: 300, label: "5m" },
  { v: 900, label: "15m" },
];

export interface MissionPatch {
  prompt: string;
  persona: string | null;
  targets: string[];
  agents: string[];
  cadence: number;
}

interface Props {
  isDark: boolean;
  mission: Mission;
  personas: string[];
  busy: boolean;
  /** estimated credit cost of a re-sense, for the cost-preview chip */
  resenseCost?: number;
  onClose: () => void;
  onSave: (patch: MissionPatch, resense: boolean) => void;
}

export const MissionSettings: React.FC<Props> = ({ isDark, mission, personas, busy, resenseCost, onClose, onSave }) => {
  const [prompt, setPrompt] = useState(mission.prompt);
  const [persona, setPersona] = useState<string>(mission.persona || personas[0] || "General Analyst");
  const [targets, setTargets] = useState<string[]>(mission.targets || []);
  const [targetDraft, setTargetDraft] = useState("");
  const [enabled, setEnabled] = useState<Set<string>>(
    () => new Set(mission.agents && mission.agents.length ? mission.agents : AGENTS.map(a => a.id))
  );
  const [cadence, setCadence] = useState<number>(mission.cadence || 45);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const addTarget = () => {
    const v = targetDraft.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (v && !targets.includes(v)) setTargets([...targets, v]);
    setTargetDraft("");
  };
  const removeTarget = (t: string) => setTargets(targets.filter(x => x !== t));

  const toggleAgent = (id: string) => {
    if (CORE_AGENTS.has(id)) return; // spine can't be disabled
    setEnabled(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const patch = (): MissionPatch => ({
    prompt: prompt.trim() || mission.prompt,
    persona,
    targets,
    agents: AGENTS.map(a => a.id).filter(id => enabled.has(id)),
    cadence,
  });

  const cardBg = isDark ? "bg-white/[0.03] border-white/[0.07]" : "bg-white border-violet-500/10";
  const inputBg = isDark ? "bg-black/30 border-white/10 text-white placeholder-white/35" : "bg-white border-violet-500/15 text-slate-800 placeholder-slate-400";
  const label = isDark ? "text-white/45" : "text-slate-500";

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(4,4,14,0.62)", backdropFilter: "blur(6px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div className={`w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-[2rem] border glass-strong shadow-2xl flex flex-col animate-fadeInUp ${isDark ? "border-white/10" : "border-violet-500/15"}`}>
        {/* header */}
        <div className={`flex items-start justify-between gap-3 px-6 py-4 border-b ${isDark ? "border-white/[0.07]" : "border-violet-500/10"}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl glass border border-white/10 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className={`text-base font-bold font-display ${isDark ? "text-white" : "text-slate-900"}`}>Edit Swarm</h3>
              <p className={`text-[11px] ${label}`}>Reshape what this mission watches and who works it.</p>
            </div>
          </div>
          <button onClick={() => !busy && onClose()} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-white/60" : "hover:bg-slate-100 text-slate-500"}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* goal */}
          <div className="flex flex-col gap-1.5">
            <label className={`text-[10px] font-mono uppercase tracking-widest ${label}`}>Mission goal</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={2}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors ${inputBg}`}
            />
          </div>

          {/* persona */}
          <div className="flex flex-col gap-1.5">
            <label className={`text-[10px] font-mono uppercase tracking-widest ${label}`}>Lens / persona</label>
            <select
              value={persona}
              onChange={e => setPersona(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors ${inputBg}`}
            >
              {[persona, ...personas.filter(p => p !== persona)].map(p => (
                <option key={p} value={p} className={isDark ? "bg-[#12172e]" : "bg-white"}>{p}</option>
              ))}
            </select>
          </div>

          {/* targets */}
          <div className="flex flex-col gap-1.5">
            <label className={`text-[10px] font-mono uppercase tracking-widest ${label} flex items-center gap-1.5`}>
              <Target className="w-3 h-3" /> Watchlist targets ({targets.length})
            </label>
            <div className={`flex flex-wrap gap-1.5 p-2 rounded-xl border ${cardBg}`}>
              {targets.map(t => (
                <span key={t} className={`group inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-full border ${isDark ? "bg-violet-500/10 border-violet-500/25 text-violet-200" : "bg-violet-500/5 border-violet-500/20 text-violet-700"}`}>
                  {t}
                  <button onClick={() => removeTarget(t)} className="opacity-50 group-hover:opacity-100 hover:text-rose-400 transition-opacity"><X className="w-3 h-3" /></button>
                </span>
              ))}
              <span className="inline-flex items-center gap-1 flex-1 min-w-[140px]">
                <input
                  value={targetDraft}
                  onChange={e => setTargetDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTarget(); } }}
                  placeholder="add domain or entity…"
                  className={`flex-1 bg-transparent text-[11px] font-mono px-1 py-1 focus:outline-none ${isDark ? "text-white placeholder-white/30" : "text-slate-700 placeholder-slate-400"}`}
                />
                <button onClick={addTarget} disabled={!targetDraft.trim()} className="p-1 rounded-md text-violet-400 hover:bg-violet-500/10 disabled:opacity-30"><Plus className="w-3.5 h-3.5" /></button>
              </span>
            </div>
          </div>

          {/* agent roster */}
          <div className="flex flex-col gap-1.5">
            <label className={`text-[10px] font-mono uppercase tracking-widest ${label}`}>Active specialists — tap to toggle</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AGENTS.map(a => {
                const Icon = ICONS[a.icon] || Bot;
                const on = enabled.has(a.id);
                const core = CORE_AGENTS.has(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleAgent(a.id)}
                    disabled={core}
                    title={core ? `${a.role} — core agent, always on` : `${a.role}: ${a.blurb}`}
                    className={`relative flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all ${
                      on
                        ? isDark ? "bg-violet-500/10 border-violet-500/40" : "bg-violet-500/5 border-violet-500/30"
                        : isDark ? "bg-white/[0.02] border-white/[0.06] opacity-50" : "bg-slate-50 border-slate-200 opacity-60"
                    } ${core ? "cursor-default" : "cursor-pointer hover:border-violet-500/50"}`}
                  >
                    <Icon className={`w-4 h-4 ${on ? a.color : isDark ? "text-white/40" : "text-slate-400"}`} />
                    <span className={`text-[10px] font-bold leading-tight ${isDark ? "text-white" : "text-slate-800"}`}>{a.codename}</span>
                    <span className={`text-[8px] font-mono uppercase tracking-wide ${core ? "text-violet-400" : on ? "text-emerald-500" : label}`}>
                      {core ? "core" : on ? "on" : "off"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* cadence */}
          <div className="flex flex-col gap-1.5">
            <label className={`text-[10px] font-mono uppercase tracking-widest ${label} flex items-center gap-1.5`}>
              <Radio className="w-3 h-3" /> Live-monitor cadence
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {CADENCE_OPTIONS.map(o => (
                <button
                  key={o.v}
                  onClick={() => setCadence(o.v)}
                  className={`text-[11px] font-mono px-3 py-1.5 rounded-full border transition-all ${
                    cadence === o.v
                      ? "bg-luna-gradient text-white border-transparent"
                      : isDark ? "bg-white/[0.03] border-white/10 text-white/60 hover:text-white" : "bg-white border-violet-500/15 text-slate-500 hover:text-slate-800"
                  }`}
                >{o.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className={`flex items-center justify-between gap-3 px-6 py-4 border-t ${isDark ? "border-white/[0.07]" : "border-violet-500/10"}`}>
          <button
            onClick={() => onClose()}
            disabled={busy}
            className={`text-xs font-semibold px-4 py-2.5 rounded-full border transition-all ${isDark ? "border-white/15 text-white/70 hover:bg-white/5" : "border-violet-500/15 text-slate-600 hover:bg-violet-500/5"}`}
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSave(patch(), false)}
              disabled={busy}
              className={`text-xs font-bold px-4 py-2.5 rounded-full border transition-all flex items-center gap-1.5 ${isDark ? "border-white/15 text-white hover:bg-white/5" : "border-violet-500/20 text-slate-800 hover:bg-violet-500/5"}`}
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
            </button>
            <button
              onClick={() => onSave(patch(), true)}
              disabled={busy}
              className="text-xs font-bold px-4 py-2.5 rounded-full bg-luna-gradient cta-luna text-white flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Save &amp; Re-sense
              {resenseCost != null && <span className="text-[10px] font-mono bg-black/20 rounded-full px-1.5 py-0.5">~{resenseCost} cr</span>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
