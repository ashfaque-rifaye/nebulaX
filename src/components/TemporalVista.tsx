import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { WeaveNode } from "../types.ts";
import { Clock, ArrowRight, Sparkles, TrendingUp, ShieldAlert, Scale, Loader2, GitBranch, Zap } from "lucide-react";

interface TemporalVistaProps {
  nodes: WeaveNode[];
  isDark: boolean;
  selectedNodeId: string | null;
  onSelect: (id: string) => void;
  onForecast: () => void;
  forecasting: boolean;
}

const riskStyle = (rr?: string) =>
  rr === "opportunity" ? { c: "#22c55e", Icon: TrendingUp, label: "Opportunity" }
  : rr === "risk" ? { c: "#ef4444", Icon: ShieldAlert, label: "Risk" }
  : { c: "#f59e0b", Icon: Scale, label: "Mixed" };

interface Thread { key: string; x1: number; y1: number; x2: number; y2: number; presentId: string; futureId: string; color: string; }

export const TemporalVista: React.FC<TemporalVistaProps> = ({ nodes, isDark, selectedNodeId, onSelect, onForecast, forecasting }) => {
  const present = useMemo(
    () => nodes.filter(n => n.time_horizon !== "future" && (n.type === "web-signal" || n.type === "synthesis" || n.type === "correction")),
    [nodes]
  );
  const futures = useMemo(
    () => nodes.filter(n => n.time_horizon === "future").sort((a, b) => (b.probability || 0) - (a.probability || 0)),
    [nodes]
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const presentRefs = useRef<Map<string, HTMLElement>>(new Map());
  const futureRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [threads, setThreads] = useState<Thread[]>([]);
  const [hoverPresent, setHoverPresent] = useState<string | null>(null);
  const [hoverFuture, setHoverFuture] = useState<string | null>(null);
  const [bloom, setBloom] = useState(false);

  const title = isDark ? "text-white" : "text-slate-900";
  const muted = isDark ? "text-gray-400" : "text-slate-500";
  const conf = (c: number) => (c >= 0.8 ? "#22c55e" : c >= 0.5 ? "#f59e0b" : "#ef4444");

  // Recompute provenance thread geometry (present node → future it influences).
  const recompute = useCallback(() => {
    const cont = containerRef.current?.getBoundingClientRect();
    if (!cont) return;
    const lines: Thread[] = [];
    futures.forEach((f) => {
      const fe = futureRefs.current.get(f.id);
      if (!fe) return;
      const fr = fe.getBoundingClientRect();
      const x2 = fr.left - cont.left;
      const y2 = fr.top - cont.top + fr.height / 2;
      const rs = riskStyle(f.risk_reward);
      (f.provenance || []).forEach((pid) => {
        const pe = presentRefs.current.get(pid);
        if (!pe) return;
        const pr = pe.getBoundingClientRect();
        const x1 = pr.right - cont.left;
        const y1 = pr.top - cont.top + pr.height / 2;
        lines.push({ key: `${pid}->${f.id}`, x1, y1, x2, y2, presentId: pid, futureId: f.id, color: rs.c });
      });
    });
    setThreads(lines);
  }, [futures]);

  useEffect(() => {
    recompute();
    const ro = new ResizeObserver(() => recompute());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [recompute, present, futures]);

  // Re-forge bloom whenever the set of futures changes.
  const sig = futures.map(f => f.id).join(",");
  useEffect(() => {
    if (futures.length === 0) return;
    setBloom(true);
    const t = setTimeout(() => setBloom(false), 1600);
    return () => clearTimeout(t);
  }, [sig]);

  const active = hoverPresent || hoverFuture;
  const isThreadActive = (th: Thread) => !active || th.presentId === hoverPresent || th.futureId === hoverFuture;
  const presentInfluences = (pid: string) => !active ? false : (hoverPresent === pid || threads.some(t => t.presentId === pid && t.futureId === hoverFuture));
  const futureLit = (fid: string) => !active ? false : (hoverFuture === fid || threads.some(t => t.futureId === fid && t.presentId === hoverPresent));

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className={`px-5 py-3 border-b flex items-center justify-between gap-3 ${isDark ? "border-white/5" : "border-slate-200"}`}>
        <div>
          <h2 className={`text-base font-bold flex items-center gap-2 font-display ${title}`}><Clock className="w-4 h-4 text-indigo-400" /> Temporal Vista</h2>
          <p className={`text-[11px] ${muted}`}>Verified history on the left → branching futures on the right. Hover a finding to see the futures it influences.</p>
        </div>
        <button
          onClick={onForecast}
          disabled={forecasting || present.length === 0}
          className={`flex-shrink-0 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-lg shadow-fuchsia-600/20 press ${present.length > 0 && futures.length === 0 && !forecasting ? "animate-pulse" : ""}`}
        >
          {forecasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
          {futures.length ? "Re-forge futures" : "Forecast futures"}
        </button>
      </div>

      {/* temporal axis: orient the reader in time */}
      <div className={`flex items-center px-5 py-1 border-b text-[8.5px] font-mono uppercase tracking-widest select-none ${isDark ? "border-white/5 text-gray-500" : "border-slate-100 text-slate-400"}`}>
        <span className="flex-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> verified past → present</span>
        <span className="px-4 text-indigo-400 font-bold">now</span>
        <span className="flex-1 flex items-center justify-end gap-1.5 text-right">+6 – 18 months <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" /></span>
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_64px_minmax(0,1.2fr)] relative">
        {/* provenance thread overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" style={{ overflow: "visible" }}>
          {threads.map((th) => {
            const on = isThreadActive(th);
            const mx = (th.x1 + th.x2) / 2;
            return (
              <path
                key={th.key}
                d={`M ${th.x1} ${th.y1} C ${mx} ${th.y1}, ${mx} ${th.y2}, ${th.x2} ${th.y2}`}
                fill="none"
                stroke={th.color}
                strokeWidth={on ? 2 : 1}
                strokeOpacity={on ? 0.8 : 0.12}
                className={on && active ? "thread-flow" : ""}
              />
            );
          })}
        </svg>

        {/* PRESENT */}
        <div className="overflow-y-auto p-4 flex flex-col gap-2 z-10" onScroll={recompute}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 font-bold">Verified present</span>
            <span className="text-[10px] font-mono text-slate-400">({present.length})</span>
          </div>
          {present.map(n => {
            const lit = presentInfluences(n.id);
            return (
              <button
                key={n.id}
                ref={(el) => { if (el) presentRefs.current.set(n.id, el); }}
                onMouseEnter={() => setHoverPresent(n.id)}
                onMouseLeave={() => setHoverPresent(null)}
                onClick={() => onSelect(n.id)}
                className={`text-left rounded-lg border p-2.5 transition-all ${selectedNodeId === n.id ? "ring-1 ring-violet-500" : ""} ${lit ? "ring-1 ring-emerald-500 scale-[1.01]" : ""} ${active && !lit && hoverPresent !== n.id ? "opacity-50" : "opacity-100"} ${isDark ? "bg-[#0b0e1c]/60 border-white/5 hover:border-white/15" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: conf(n.confidence) }} />
                  <span className={`text-[11px] font-bold truncate ${title}`}>{n.title}</span>
                </div>
                <p className={`text-[10px] line-clamp-2 ${muted}`}>{n.content}</p>
              </button>
            );
          })}
          {present.length === 0 && <p className={`text-[11px] ${muted}`}>No verified findings yet.</p>}
        </div>

        {/* NOW divider */}
        <div className="hidden lg:flex flex-col items-center justify-center relative">
          <div className={`absolute inset-y-4 w-px ${isDark ? "bg-gradient-to-b from-emerald-500/0 via-violet-500/40 to-fuchsia-500/0" : "bg-gradient-to-b from-emerald-400/0 via-violet-400/50 to-fuchsia-400/0"}`} />
          <div className="rotate-90 flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-violet-500 whitespace-nowrap">now <ArrowRight className="w-3 h-3" /></div>
          <Zap className="absolute top-6 w-3 h-3 text-violet-400 animate-pulse" />
        </div>

        {/* FUTURES */}
        <div className={`overflow-y-auto p-4 flex flex-col gap-3 border-l z-10 ${isDark ? "border-white/5 bg-[#080a10]/40" : "border-slate-200 bg-slate-50/40"}`} onScroll={recompute}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-fuchsia-500" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-500 font-bold">Branching futures</span>
            <span className="text-[10px] font-mono text-slate-400">({futures.length})</span>
          </div>

          {futures.length === 0 && (
            <div className={`rounded-xl border border-dashed p-6 text-center flex flex-col items-center gap-2 ${isDark ? "border-white/10" : "border-slate-300"}`}>
              <Sparkles className="w-6 h-6 text-fuchsia-500" />
              <p className={`text-xs ${muted}`}>No futures yet. Click <span className="font-semibold text-fuchsia-500">Forecast futures</span> to simulate 3 branching scenarios from the verified present.</p>
            </div>
          )}

          {futures.map((f, i) => {
            const rs = riskStyle(f.risk_reward);
            const prob = Math.round((f.probability || 0) * 100);
            const lit = futureLit(f.id);
            return (
              <button
                key={f.id}
                ref={(el) => { if (el) futureRefs.current.set(f.id, el); }}
                onMouseEnter={() => setHoverFuture(f.id)}
                onMouseLeave={() => setHoverFuture(null)}
                onClick={() => onSelect(f.id)}
                style={{ borderColor: `${rs.c}4d`, animationDelay: `${i * 0.08}s` }}
                className={`text-left rounded-xl border p-3.5 transition-all hover:-translate-y-0.5 ${bloom ? "vista-bloom" : ""} ${selectedNodeId === f.id ? "ring-1 ring-fuchsia-500" : ""} ${lit ? "ring-1 ring-fuchsia-500 scale-[1.01]" : ""} ${active && !lit && hoverFuture !== f.id ? "opacity-50" : "opacity-100"} ${isDark ? "bg-[#0d1122]" : "bg-white shadow-sm"}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase" style={{ color: rs.c }}><rs.Icon className="w-3 h-3" /> {rs.label}</span>
                  <span className="text-[10px] font-mono font-bold" style={{ color: rs.c }}>{prob}% likely</span>
                </div>
                <h4 className={`text-[12.5px] font-extrabold leading-tight ${title}`}>{f.title.replace(/^Future:\s*/, "")}</h4>
                <p className={`text-[10.5px] leading-snug mt-1 line-clamp-3 ${muted}`}>{f.content}</p>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#e6e2f2" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${prob}%`, backgroundColor: rs.c }} />
                </div>
                {/* influence count */}
                <div className="mt-1.5 text-[8.5px] font-mono text-slate-400 flex items-center gap-1">
                  <GitBranch className="w-2.5 h-2.5" /> rooted in {(f.provenance || []).length} present finding{(f.provenance || []).length !== 1 ? "s" : ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
