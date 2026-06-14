import React, { useEffect, useState } from "react";
import { BuildPlan, BuildGap, BuildTask, Connector } from "../types.ts";
import {
  Hammer, Boxes, Search, AlertTriangle, CheckCircle2, ArrowRight, Plug,
  Layers, Sparkles, Loader2, Github, Cloud, SquareKanban, PenTool, MessageSquare,
  Wrench, Link2,
} from "lucide-react";

interface Props {
  missionId: string;
  isDark: boolean;
  onOpenFinding: (id: string) => void;
}

const CONNECTOR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Github, Cloud, SquareKanban, PenTool, MessageSquare,
};

const SEV: Record<BuildGap["severity"], { label: string; chip: string; dot: string }> = {
  high: { label: "High", chip: "text-rose-600 bg-rose-500/10 border-rose-500/30 dark:text-rose-400", dot: "bg-rose-500" },
  medium: { label: "Medium", chip: "text-amber-600 bg-amber-500/10 border-amber-500/30 dark:text-amber-400", dot: "bg-amber-500" },
  low: { label: "Low", chip: "text-sky-600 bg-sky-500/10 border-sky-500/30 dark:text-sky-400", dot: "bg-sky-500" },
};

const EFFORT: Record<BuildTask["effort"], { label: string; chip: string }> = {
  S: { label: "S · quick", chip: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-400" },
  M: { label: "M · a sprint", chip: "text-amber-600 bg-amber-500/10 border-amber-500/30 dark:text-amber-400" },
  L: { label: "L · a project", chip: "text-rose-600 bg-rose-500/10 border-rose-500/30 dark:text-rose-400" },
};

const STAGES = [
  { key: "analyze", label: "Analyze", Icon: Search },
  { key: "prototype", label: "Prototype", Icon: Boxes },
  { key: "build", label: "Build", Icon: Hammer },
];

export const BuildStudio: React.FC<Props> = ({ missionId, isDark, onOpenFinding }) => {
  const [plan, setPlan] = useState<BuildPlan | null>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [stage, setStage] = useState<string>("analyze");

  const card = isDark ? "bg-[#0c101f] border-white/[0.07]" : "bg-white border-slate-200";
  const subCard = isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200";
  const title = isDark ? "text-white" : "text-slate-900";
  const muted = isDark ? "text-[#9298b4]" : "text-slate-500";
  const body = isDark ? "text-[#b9bdd4]" : "text-slate-600";

  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([
      fetch(`/api/missions/${missionId}/build`).then(r => r.json()),
      fetch(`/api/connectors`).then(r => r.json()),
    ]).then(([p, c]) => {
      if (!live) return;
      setPlan(p);
      setConnectors(Array.isArray(c) ? c : []);
      setLoading(false);
    }).catch(() => live && setLoading(false));
    return () => { live = false; };
  }, [missionId]);

  const toggleConnector = async (id: string) => {
    setToggling(id);
    try {
      const updated = await fetch(`/api/connectors/${id}/toggle`, { method: "POST", credentials: "include" }).then(r => r.json());
      setConnectors(prev => prev.map(c => c.id === updated.id ? updated : c));
    } finally {
      setToggling(null);
    }
  };

  const connectorById = (id?: string) => connectors.find(c => c.id === id);

  if (loading || !plan) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className={`flex items-center gap-2 text-sm ${muted}`}>
          <Loader2 className="w-4 h-4 animate-spin" /> Assembling the build plan…
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-5 py-6 flex flex-col gap-6">

        {/* headline */}
        <div className="flex flex-col gap-2">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest font-bold w-fit ${isDark ? "text-sky-300" : "text-sky-600"}`}>
            <Hammer className="w-3.5 h-3.5" /> From analysis to build
          </span>
          <h2 className={`text-xl md:text-2xl font-bold font-display tracking-tight ${title}`} style={{ textWrap: "balance" } as React.CSSProperties}>
            {plan.headline}
          </h2>
          <p className={`text-sm leading-relaxed max-w-2xl ${body}`}>{plan.rationale}</p>
        </div>

        {/* stage stepper */}
        <div className={`flex items-center gap-1 p-1 rounded-xl border w-fit ${card}`}>
          {STAGES.map(({ key, label, Icon }, i) => (
            <React.Fragment key={key}>
              {i > 0 && <ArrowRight className={`w-3.5 h-3.5 ${muted}`} />}
              <button
                onClick={() => setStage(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  stage === key ? "bg-luna-gradient text-white shadow-sm" : `${body} hover:${title}`
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* ── ANALYZE: gaps ── */}
        {stage === "analyze" && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${title}`}><Search className="w-4 h-4 text-violet-400" /> What's missing or risky</h3>
              <span className={`text-[11px] font-mono ${muted}`}>{plan.gaps.length} gap{plan.gaps.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plan.gaps.map(g => {
                const sev = SEV[g.severity];
                return (
                  <div key={g.id} className={`rounded-xl border p-4 flex flex-col gap-2 ${card}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9px] font-mono uppercase tracking-wide ${muted}`}>{g.area}</span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${sev.chip}`}>{sev.label}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${sev.dot}`} />
                      <div>
                        <h4 className={`text-[13px] font-bold leading-snug ${title}`}>{g.title}</h4>
                        <p className={`text-[11.5px] leading-relaxed mt-1 ${body}`}>{g.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setStage("prototype")}
              className="self-start mt-1 flex items-center gap-1.5 bg-luna-gradient cta-luna text-white text-xs font-bold px-4 py-2 rounded-full"
            >
              See the prototype <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </section>
        )}

        {/* ── PROTOTYPE: spec preview ── */}
        {stage === "prototype" && (
          <section className="flex flex-col gap-4">
            <div className={`rounded-2xl border overflow-hidden ${card}`}>
              <div className={`px-5 py-4 border-b ${isDark ? "border-white/[0.06]" : "border-slate-200"} flex items-center gap-3`}>
                <div className="w-10 h-10 rounded-xl bg-luna-gradient flex items-center justify-center shadow-lg shadow-violet-500/20 flex-shrink-0">
                  <Boxes className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className={`text-[9px] font-mono uppercase tracking-widest ${muted}`}>Prototype spec · generated</div>
                  <h3 className={`text-base font-bold font-display ${title}`}>{plan.prototype.name}</h3>
                </div>
              </div>
              <div className="px-5 py-4 flex flex-col gap-4">
                <p className={`text-[13px] leading-relaxed ${body}`}>{plan.prototype.summary}</p>

                <div>
                  <div className={`text-[10px] font-mono uppercase tracking-wide mb-1.5 ${muted}`}>Stack</div>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.prototype.stack.map((s, i) => (
                      <span key={i} className={`text-[11px] font-mono px-2 py-1 rounded-md border ${subCard} ${body}`}>{s}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className={`text-[10px] font-mono uppercase tracking-wide mb-1.5 ${muted}`}>Screens</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {plan.prototype.screens.map((sc, i) => (
                      <div key={i} className={`rounded-xl border p-3 ${subCard}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-6 h-6 rounded-md bg-luna-gradient/10 border border-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-500 flex-shrink-0">{i + 1}</span>
                          <h4 className={`text-[12.5px] font-bold ${title}`}>{sc.name}</h4>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${body}`}>{sc.purpose}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setStage("build")}
              className="self-start flex items-center gap-1.5 bg-luna-gradient cta-luna text-white text-xs font-bold px-4 py-2 rounded-full"
            >
              Turn it into tasks <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </section>
        )}

        {/* ── BUILD: ranked tasks ── */}
        {stage === "build" && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${title}`}><Wrench className="w-4 h-4 text-emerald-400" /> Ranked build list</h3>
              <span className={`text-[11px] font-mono ${muted}`}>{plan.tasks.length} task{plan.tasks.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {plan.tasks.map((tk, i) => {
                const eff = EFFORT[tk.effort];
                const conn = connectorById(tk.connector);
                const ready = conn?.status === "connected";
                return (
                  <div key={tk.id} className={`rounded-xl border p-4 flex items-start gap-3 ${card}`}>
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${isDark ? "bg-white/[0.05] text-white" : "bg-slate-100 text-slate-700"}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-[13px] font-bold leading-snug ${title}`}>{tk.title}</h4>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${eff.chip}`}>{eff.label}</span>
                      </div>
                      <p className={`text-[11.5px] leading-relaxed mt-1 ${body}`}>{tk.detail}</p>
                      {conn && (
                        <div className="mt-2">
                          {ready ? (
                            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-500">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ready to file in {conn.name}
                            </span>
                          ) : (
                            <button
                              onClick={() => toggleConnector(conn.id)}
                              className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold ${isDark ? "text-sky-300 hover:text-sky-200" : "text-sky-600 hover:text-sky-700"}`}
                            >
                              <Plug className="w-3.5 h-3.5" /> Connect {conn.name} to file this
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── CONNECT your stack (always visible) ── */}
        <section className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${title}`}><Link2 className="w-4 h-4 text-sky-400" /> Connect your stack</h3>
            <span className={`text-[11px] font-mono ${muted}`}>{connectors.filter(c => c.status === "connected").length} connected</span>
          </div>
          <p className={`text-[12px] leading-relaxed -mt-1 ${body}`}>
            Plug in the tools your team already uses. NebulaX pulls in working context and files the build tasks straight into them.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {connectors.map(c => {
              const Icon = CONNECTOR_ICONS[c.icon] || Plug;
              const connected = c.status === "connected";
              return (
                <div key={c.id} className={`rounded-xl border p-4 flex flex-col gap-3 ${card}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${connected ? "bg-emerald-500/10" : (isDark ? "bg-white/[0.04]" : "bg-slate-100")}`}>
                      <Icon className={`w-4.5 h-4.5 ${connected ? "text-emerald-500" : body}`} />
                    </div>
                    <div className="min-w-0">
                      <h4 className={`text-[13px] font-bold ${title}`}>{c.name}</h4>
                      <span className={`text-[9px] font-mono uppercase tracking-wide ${muted}`}>{c.category}</span>
                    </div>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${body}`}>{c.summary}</p>

                  {connected && c.detected && c.detected.length > 0 && (
                    <ul className={`flex flex-col gap-1 rounded-lg p-2.5 ${subCard}`}>
                      {c.detected.map((d, i) => (
                        <li key={i} className={`text-[10.5px] leading-snug flex gap-1.5 ${body}`}>
                          <Sparkles className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    onClick={() => toggleConnector(c.id)}
                    disabled={toggling === c.id}
                    className={`mt-auto flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 rounded-lg border transition-all disabled:opacity-50 ${
                      connected
                        ? (isDark ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10" : "text-emerald-700 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10")
                        : "bg-luna-gradient cta-luna text-white border-transparent"
                    }`}
                  >
                    {toggling === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : connected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plug className="w-3.5 h-3.5" />}
                    {toggling === c.id ? "Working…" : connected ? "Connected" : "Connect"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <div className={`flex items-center gap-2 text-[11px] rounded-xl border border-dashed p-3 ${isDark ? "border-white/10 text-gray-500" : "border-slate-200 text-slate-400"}`}>
          <Layers className="w-3.5 h-3.5 flex-shrink-0 text-sky-400" />
          Gaps, prototype and tasks are generated from this mission's verified findings. Connecting a tool is simulated in this demo — it imports sample context and shows where tasks would land.
        </div>
      </div>
    </div>
  );
};
