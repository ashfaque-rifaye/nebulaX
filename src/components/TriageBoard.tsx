import React, { useMemo, useState } from "react";
import { WeaveNode } from "../types.ts";
import { ShieldAlert, ShieldCheck, FileText, Undo, GripVertical } from "lucide-react";

interface TriageBoardProps {
  nodes: WeaveNode[];
  isDark: boolean;
  onSelect: (id: string) => void;
  onRequestCorrection: (node: WeaveNode) => void;
}

type LaneKey = "unverified" | "verified" | "drift" | "corrected";

const LANES: { key: LaneKey; title: string; hint: string; accent: string; icon: React.ReactNode }[] = [
  { key: "unverified", title: "Unverified", hint: "awaiting credibility check", accent: "slate", icon: <FileText className="w-3.5 h-3.5" /> },
  { key: "verified", title: "Verified", hint: "high confidence ≥ 80%", accent: "emerald", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { key: "drift", title: "Drift ⚠", hint: "Sentinel flagged conflict", accent: "red", icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  { key: "corrected", title: "Corrected ✓", hint: "human veto applied", accent: "blue", icon: <Undo className="w-3.5 h-3.5" /> },
];

function defaultLane(n: WeaveNode): LaneKey {
  if (n.type === "correction") return "corrected";
  if (n.flagged_by === "sentinel") return "drift";
  if (n.confidence >= 0.8) return "verified";
  return "unverified";
}

const accentClasses: Record<string, { head: string; ring: string; dot: string }> = {
  slate: { head: "text-slate-500", ring: "border-slate-300/40", dot: "bg-slate-400" },
  emerald: { head: "text-emerald-500", ring: "border-emerald-500/40", dot: "bg-emerald-500" },
  red: { head: "text-red-500", ring: "border-red-500/40", dot: "bg-red-500" },
  blue: { head: "text-blue-500", ring: "border-blue-500/40", dot: "bg-blue-500" },
};

export const TriageBoard: React.FC<TriageBoardProps> = ({ nodes, isDark, onSelect, onRequestCorrection }) => {
  // Client-side lane overrides so dragging feels live (does not mutate backend).
  const [overrides, setOverrides] = useState<Record<string, LaneKey>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [overLane, setOverLane] = useState<LaneKey | null>(null);

  const laneOf = (n: WeaveNode): LaneKey => overrides[n.id] ?? defaultLane(n);

  const grouped = useMemo(() => {
    const g: Record<LaneKey, WeaveNode[]> = { unverified: [], verified: [], drift: [], corrected: [] };
    nodes.forEach((n) => g[laneOf(n)].push(n));
    return g;
  }, [nodes, overrides]);

  const handleDrop = (lane: LaneKey) => {
    if (!dragId) return;
    const node = nodes.find((n) => n.id === dragId);
    setOverLane(null);
    setDragId(null);
    if (!node) return;
    // Dropping a correctable node into "Corrected" opens the human-veto flow.
    if (lane === "corrected" && (node.type === "web-signal" || node.type === "synthesis")) {
      onRequestCorrection(node);
      return;
    }
    setOverrides((prev) => ({ ...prev, [node.id]: lane }));
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className={`px-5 py-3 border-b ${isDark ? "border-white/5" : "border-slate-200"}`}>
        <h2 className={`text-base font-bold flex items-center gap-2 font-display ${isDark ? "text-white" : "text-slate-900"}`}>
          <GripVertical className="w-4 h-4 text-indigo-400" />
          Agent Triage Board
        </h2>
        <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-slate-500"}`}>
          Drag signals between lanes to re-triage. Drop a card on <span className="font-semibold">Corrected ✓</span> to file a human-veto override.
        </p>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="grid grid-cols-4 gap-3 h-full min-w-[760px]">
          {LANES.map((lane) => {
            const ac = accentClasses[lane.accent];
            const cards = grouped[lane.key];
            const isOver = overLane === lane.key;
            return (
              <div
                key={lane.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverLane(lane.key);
                }}
                onDragLeave={() => setOverLane((l) => (l === lane.key ? null : l))}
                onDrop={() => handleDrop(lane.key)}
                className={`flex flex-col rounded-xl border transition-colors min-h-0 ${
                  isOver ? ac.ring + " " + (isDark ? "bg-white/[0.04]" : "bg-slate-50") : isDark ? "border-white/5 bg-[#0b0e14]/50" : "border-slate-200 bg-slate-50/50"
                }`}
              >
                <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? "border-white/5" : "border-slate-200"}`}>
                  <span className={`text-[11px] font-bold font-mono uppercase tracking-wide flex items-center gap-1.5 ${ac.head}`}>
                    {lane.icon}
                    {lane.title}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isDark ? "bg-white/5 text-gray-400" : "bg-white text-slate-500"}`}>
                    {cards.length}
                  </span>
                </div>
                <div className="text-[8.5px] font-mono px-3 pt-1 text-slate-400 uppercase tracking-wider">{lane.hint}</div>

                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                  {cards.map((n) => (
                    <div
                      key={n.id}
                      draggable
                      onDragStart={() => setDragId(n.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverLane(null);
                      }}
                      onClick={() => onSelect(n.id)}
                      className={`group cursor-grab active:cursor-grabbing rounded-lg border p-2.5 transition-all ${
                        dragId === n.id ? "opacity-40" : "opacity-100"
                      } ${isDark ? "bg-[#0c111c] border-white/5 hover:border-white/15" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className={`text-[7.5px] font-mono uppercase tracking-wider ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                          {n.type}
                        </span>
                        <span
                          className={`text-[8px] font-mono font-bold px-1 rounded ${
                            n.confidence >= 0.8 ? "text-emerald-500" : n.confidence >= 0.5 ? "text-amber-500" : "text-red-500"
                          }`}
                        >
                          {Math.round(n.confidence * 100)}%
                        </span>
                      </div>
                      <h4 className={`text-[11px] font-bold leading-snug mt-1 line-clamp-2 ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                        {n.title}
                      </h4>
                      <p className={`text-[9.5px] mt-1 line-clamp-2 ${isDark ? "text-gray-400" : "text-slate-500"}`}>{n.content}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${ac.dot}`} />
                        <span className="text-[8px] font-mono text-slate-400 truncate">{n.source}</span>
                      </div>
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-[10px] font-mono text-slate-400/60 py-6 text-center">
                      drop signals here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
