import React, { useEffect, useMemo, useRef, useState } from "react";
import { WeaveNode, ActivityFeedEvent } from "../types.ts";
import { Play, Pause, SkipBack, Search, ShieldCheck, Cpu, Undo, Radar } from "lucide-react";

interface MissionReplayProps {
  nodes: WeaveNode[];
  events: ActivityFeedEvent[];
  isDark: boolean;
  onSelect: (id: string) => void;
}

function stageOf(n: WeaveNode): { key: string; label: string; color: string; icon: React.ReactNode } {
  if (n.type === "correction") return { key: "act", label: "Correct", color: "#10b981", icon: <Undo className="w-3 h-3" /> };
  if (n.flagged_by === "sentinel") return { key: "reason", label: "Reason", color: "#ef4444", icon: <ShieldCheck className="w-3 h-3" /> };
  if (n.type === "synthesis") return { key: "synth", label: "Synthesize", color: "#38bdf8", icon: <Cpu className="w-3 h-3" /> };
  return { key: "sense", label: "Sense", color: "#a855f7", icon: <Search className="w-3 h-3" /> };
}

export const MissionReplay: React.FC<MissionReplayProps> = ({ nodes, events, isDark, onSelect }) => {
  const ordered = useMemo(
    () => nodes.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [nodes]
  );

  const [cursor, setCursor] = useState(ordered.length); // how many nodes are revealed
  const [playing, setPlaying] = useState(false);
  const timer = useRef<any>(null);

  // Keep cursor at the end when new data streams in (unless the user is scrubbing back).
  useEffect(() => {
    setCursor((c) => (c >= ordered.length - 1 ? ordered.length : c));
  }, [ordered.length]);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setCursor((c) => {
        if (c >= ordered.length) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, 900);
    return () => clearInterval(timer.current);
  }, [playing, ordered.length]);

  const revealed = ordered.slice(0, cursor);
  const latest = revealed[revealed.length - 1];

  // Caption: most recent event at/just before the latest revealed node.
  const caption = useMemo(() => {
    if (!latest) return "Press play to replay how the swarm built this fabric.";
    const t = new Date(latest.created_at).getTime();
    const near = events
      .filter((e) => new Date(e.timestamp).getTime() <= t + 500)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    return near ? `[${near.sender}] ${near.message}` : `${latest.source} wove "${latest.title}"`;
  }, [latest, events]);

  const startReplay = () => {
    setCursor(0);
    setPlaying(true);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className={`px-5 py-3 border-b ${isDark ? "border-white/5" : "border-slate-200"}`}>
        <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}>
          <Radar className="w-4 h-4 text-blue-500" />
          Mission Replay
        </h2>
        <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-slate-500"}`}>
          Scrub the timeline to watch the swarm sense → reason → synthesize → act, signal by signal.
        </p>
      </div>

      {/* revealed timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        {ordered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400">No signals to replay yet.</div>
        ) : (
          <div className="flex flex-col gap-2.5 max-w-3xl mx-auto">
            {revealed.map((n, i) => {
              const st = stageOf(n);
              return (
                <div
                  key={n.id}
                  onClick={() => onSelect(n.id)}
                  style={{ animation: i === revealed.length - 1 ? "replayIn 0.5s ease-out" : undefined }}
                  className={`cursor-pointer flex items-stretch gap-3 rounded-xl border p-3 transition-all hover:shadow-md ${
                    isDark ? "bg-[#0b0e14]/60 border-white/5 hover:border-white/15" : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: st.color }}
                    >
                      {st.icon}
                    </span>
                    {i < revealed.length - 1 && <span className={`flex-1 w-px ${isDark ? "bg-white/10" : "bg-slate-200"}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider" style={{ color: st.color }}>
                        {st.label}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                    <h4 className={`text-[12px] font-bold leading-snug mt-0.5 ${isDark ? "text-gray-100" : "text-slate-800"}`}>{n.title}</h4>
                    <p className={`text-[10.5px] mt-0.5 line-clamp-2 ${isDark ? "text-gray-400" : "text-slate-500"}`}>{n.content}</p>
                  </div>
                  <div
                    className={`self-center text-[10px] font-mono font-bold ${
                      n.confidence >= 0.8 ? "text-emerald-500" : n.confidence >= 0.5 ? "text-amber-500" : "text-red-500"
                    }`}
                  >
                    {Math.round(n.confidence * 100)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* transport controls */}
      <div className={`border-t px-5 py-3 flex flex-col gap-2 ${isDark ? "border-white/5 bg-[#0b0e14]/60" : "border-slate-200 bg-slate-50"}`}>
        <div className={`text-[10px] font-mono truncate ${isDark ? "text-blue-300" : "text-blue-600"}`}>{caption}</div>
        <div className="flex items-center gap-3">
          <button
            onClick={startReplay}
            title="Restart replay"
            className={`p-1.5 rounded-md ${isDark ? "text-gray-300 hover:bg-white/10" : "text-slate-600 hover:bg-slate-200"}`}
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => (cursor >= ordered.length ? startReplay() : setPlaying((p) => !p))}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {playing ? "Pause" : cursor >= ordered.length ? "Replay" : "Play"}
          </button>
          <input
            type="range"
            min={0}
            max={ordered.length}
            value={cursor}
            onChange={(e) => {
              setPlaying(false);
              setCursor(Number(e.target.value));
            }}
            className="flex-1 accent-blue-500 cursor-pointer"
          />
          <span className={`text-[10px] font-mono tabular-nums ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            {cursor}/{ordered.length}
          </span>
        </div>
      </div>
    </div>
  );
};
