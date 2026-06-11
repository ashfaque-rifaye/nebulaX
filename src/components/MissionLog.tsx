import React, { useState } from "react";
import { Mission } from "../types.ts";
import { History, ArrowRight, Clock, Radio, RotateCcw, Sparkles, Leaf, ChevronDown, ChevronRight, Inbox } from "lucide-react";

interface MissionLogProps {
  isDark: boolean;
  missions: Mission[];
  onOpen: (missionId: string) => void;
}

const triggerLabel: Record<string, string> = {
  initial: "Initial deploy",
  resense: "Re-sense",
  edit: "Edited & re-sensed",
  monitor: "Auto monitor",
};

export const MissionLog: React.FC<MissionLogProps> = ({ isDark, missions, onOpen }) => {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const title = isDark ? "text-white" : "text-slate-900";
  const muted = isDark ? "text-gray-400" : "text-slate-500";
  const card = isDark ? "bg-[#0b0f19]/90 border-white/5" : "bg-white border-slate-200 shadow-sm";

  const sorted = missions.slice().sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return (
    <main className="flex-1 overflow-y-auto">
    <div className="max-w-5xl mx-auto w-full p-4 md:p-8 flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono tracking-widest text-blue-500 uppercase font-semibold flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" /> Mission Log
        </span>
        <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${title}`}>Every mission, every run — fully tracked</h2>
        <p className={`text-sm ${muted}`}>A persistent record of what you asked and what the swarm did. Nothing vanishes; open any mission to continue working.</p>
      </header>

      {sorted.length === 0 && (
        <div className={`rounded-2xl border p-10 flex flex-col items-center gap-2 text-center ${card}`}>
          <Inbox className="w-8 h-8 text-slate-400" />
          <p className={`text-sm ${muted}`}>No missions yet. Launch one from the workspace.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sorted.map((m) => {
          const runs = m.runs || [];
          const isOpen = open[m.id];
          const fp = m.footprint;
          return (
            <div key={m.id} className={`rounded-2xl border ${card}`}>
              <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  onClick={() => setOpen(o => ({ ...o, [m.id]: !o[m.id] }))}
                  className="flex-1 flex items-start gap-3 text-left min-w-0"
                >
                  {runs.length > 0 ? (isOpen ? <ChevronDown className="w-4 h-4 mt-1 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 mt-1 text-slate-400 flex-shrink-0" />) : <span className="w-4 flex-shrink-0" />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.parent_id && <span className="text-[9px] font-mono text-fuchsia-500">↳ deep-dive</span>}
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${m.status === "ready" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>{m.status}</span>
                      {m.monitoring && <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-500"><Radio className="w-2.5 h-2.5 animate-pulse" />monitoring</span>}
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1"><History className="w-3 h-3" />{runs.length} run{runs.length !== 1 ? "s" : ""}</span>
                    </div>
                    <h3 className={`text-sm font-bold mt-1 truncate ${title}`}>{m.prompt}</h3>
                    <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(m.updated_at).toLocaleString()}</span>
                      {m.owner && <span>· {m.owner}</span>}
                      {fp && <span className="flex items-center gap-1 text-emerald-500"><Leaf className="w-3 h-3" />{(fp.co2Saved_g).toFixed(1)}g saved</span>}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => onOpen(m.id)}
                  className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
                >
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {isOpen && runs.length > 0 && (
                <div className={`px-4 pb-4 pl-11 flex flex-col gap-2 border-t pt-3 ${isDark ? "border-white/5" : "border-slate-100"}`}>
                  {runs.slice().reverse().map((run) => (
                    <div key={run.id} className="flex items-start gap-2.5">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-white/5" : "bg-slate-100"}`}>
                        {run.trigger === "monitor" ? <Radio className="w-3 h-3 text-emerald-500" /> : run.trigger === "initial" ? <Sparkles className="w-3 h-3 text-blue-500" /> : <RotateCcw className="w-3 h-3 text-blue-400" />}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold ${title}`}>Run {run.index} · {triggerLabel[run.trigger] || run.trigger}</span>
                          <span className="text-[9px] font-mono text-slate-400">{run.finished_at ? new Date(run.finished_at).toLocaleTimeString() : "running…"}</span>
                        </div>
                        <p className={`text-[11px] ${muted}`}>{run.summary || `${run.newSignals} new signal(s)`}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    </main>
  );
};
