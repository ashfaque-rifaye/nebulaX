import React, { useState } from "react";
import { CustomAgent } from "../types.ts";
import { Bot, X, Plus, Play, Trash2, Loader2, Wand2, Sparkles, ShieldAlert, Mail, TrendingUp } from "lucide-react";

interface CustomAgentsProps {
  isDark: boolean;
  agents: CustomAgent[];
  creating: boolean;
  runningId: string | null;
  onCreate: (name: string, instruction: string, icon: string) => void;
  onRun: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const TEMPLATES = [
  { name: "Risk Scanner", icon: "ShieldAlert", instruction: "Scan the findings for the biggest risks or red flags and summarize them with severity." },
  { name: "Outreach Drafter", icon: "Mail", instruction: "Draft a short, persuasive outreach email based on the most actionable finding." },
  { name: "Trend Summarizer", icon: "TrendingUp", instruction: "Identify the 3 most important trends across the findings and what they imply." },
];

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { Bot, ShieldAlert, Mail, TrendingUp, Sparkles, Wand2 };

export const CustomAgents: React.FC<CustomAgentsProps> = ({ isDark, agents, creating, runningId, onCreate, onRun, onDelete, onClose }) => {
  const [name, setName] = useState("");
  const [instruction, setInstruction] = useState("");
  const [icon, setIcon] = useState("Bot");
  const title = isDark ? "text-white" : "text-slate-900";
  const muted = isDark ? "text-gray-400" : "text-slate-500";

  const submit = () => {
    if (!name.trim() || !instruction.trim()) return;
    onCreate(name.trim(), instruction.trim(), icon);
    setName(""); setInstruction(""); setIcon("Bot");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={`p-4 border-b flex justify-between items-center flex-shrink-0 ${isDark ? "bg-black/25 border-white/5" : "bg-slate-50 border-slate-200"}`}>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><Wand2 className="w-4 h-4 text-fuchsia-500" /> Your Custom Agents</h3>
          <span className={`text-[10px] font-mono ${muted}`}>build a specialist that works on this mission · 6 cr/run</span>
        </div>
        <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? "text-gray-400 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* create */}
        <div className={`rounded-xl border p-3 flex flex-col gap-2.5 ${isDark ? "bg-[#0b0e1c] border-white/10" : "bg-slate-50 border-slate-200"}`}>
          <span className="text-[10px] font-mono uppercase tracking-wider text-fuchsia-500 font-bold flex items-center gap-1"><Plus className="w-3 h-3" /> New agent</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Agent name (e.g. Pricing Watchdog)"
            className={`text-xs rounded-lg border px-2.5 py-2 focus:outline-none ${isDark ? "bg-black/30 border-white/10 text-white placeholder-gray-500" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"}`} />
          <textarea value={instruction} onChange={e => setInstruction(e.target.value)} rows={2} placeholder="What should it do? e.g. 'Flag any pricing that contradicts a public claim.'"
            className={`text-xs rounded-lg border px-2.5 py-2 resize-none focus:outline-none ${isDark ? "bg-black/30 border-white/10 text-white placeholder-gray-500" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"}`} />
          <div className="flex items-center gap-1">
            {Object.keys(ICONS).map(k => {
              const I = ICONS[k];
              return <button key={k} onClick={() => setIcon(k)} className={`p-1.5 rounded-md border ${icon === k ? "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-500" : isDark ? "border-white/10 text-gray-400" : "border-slate-200 text-slate-400"}`}><I className="w-3.5 h-3.5" /></button>;
            })}
            <button onClick={submit} disabled={creating || !name.trim() || !instruction.trim()}
              className="ml-auto bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
            </button>
          </div>
          {/* templates */}
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map(t => (
              <button key={t.name} onClick={() => { setName(t.name); setInstruction(t.instruction); setIcon(t.icon); }}
                className={`text-[10px] px-2 py-1 rounded-full border ${isDark ? "border-white/10 text-gray-300 hover:border-fuchsia-500/40" : "border-slate-200 text-slate-600 hover:border-fuchsia-400"}`}>
                + {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* list */}
        <div className="flex flex-col gap-2">
          <span className={`text-[10px] font-mono uppercase tracking-wider ${muted}`}>Your agents ({agents.length})</span>
          {agents.length === 0 && <p className={`text-[11px] ${muted}`}>No custom agents yet. Create one above — it'll reason over this mission's findings and add its output to the canvas.</p>}
          {agents.map(a => {
            const I = ICONS[a.icon] || Bot;
            const running = runningId === a.id;
            return (
              <div key={a.id} className={`rounded-xl border p-3 flex flex-col gap-2 ${isDark ? "bg-[#0d1122] border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
                <div className="flex items-start gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-fuchsia-500/10 text-fuchsia-500 flex items-center justify-center flex-shrink-0"><I className="w-4 h-4" /></span>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-[12px] font-bold ${title}`}>{a.name}</h4>
                    <p className={`text-[10.5px] leading-snug ${muted}`}>{a.instruction}</p>
                  </div>
                  <button onClick={() => onDelete(a.id)} className="text-slate-400 hover:text-red-500 p-1" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <button onClick={() => onRun(a.id)} disabled={running}
                  className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-60 text-white text-[11px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1.5">
                  {running ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Working…</> : <><Play className="w-3.5 h-3.5 fill-current" /> Run on this mission</>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
