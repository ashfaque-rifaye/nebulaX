import React from "react";
import {
  Compass, Search, FileText, ShieldCheck, Network, ShieldAlert, Sparkles, BookOpen, Mail,
  Rocket, TrendingUp, User, Gauge, ArrowRight, CheckCircle2, AlertTriangle, Eye, GitBranch
} from "lucide-react";
import { AGENTS, USE_CASES, PIPELINE_STEPS } from "../content.ts";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Compass, Search, FileText, ShieldCheck, Network, ShieldAlert, Sparkles, BookOpen, Mail,
  Rocket, TrendingUp, User, Gauge,
};
const Icon = ({ name, className }: { name: string; className?: string }) => {
  const C = ICONS[name] || Sparkles;
  return <C className={className} />;
};

interface PageProps {
  isDark: boolean;
  onLaunch: (prompt?: string) => void;
}

const card = (isDark: boolean) =>
  isDark ? "bg-[#0b0f19]/90 border-white/5" : "bg-white border-slate-200 shadow-sm";
const title = (isDark: boolean) => (isDark ? "text-white" : "text-slate-900");
const muted = (isDark: boolean) => (isDark ? "text-gray-400" : "text-slate-500");

// ─── HOW IT WORKS ────────────────────────────────────────────────────────────
export const HowItWorksPage: React.FC<PageProps> = ({ isDark, onLaunch }) => (
  <main className="flex-1 overflow-y-auto">
    <div className="max-w-6xl mx-auto w-full p-4 md:p-8 flex flex-col gap-8">
    <header className="text-center flex flex-col items-center gap-3">
      <span className="text-[10px] font-mono tracking-widest text-blue-500 uppercase font-semibold bg-blue-500/10 px-3 py-1 rounded-full">How it works</span>
      <h2 className={`text-3xl md:text-4xl font-extrabold tracking-tight ${title(isDark)}`}>From a sentence to a verified, actionable brief</h2>
      <p className={`text-sm max-w-2xl ${muted(isDark)}`}>
        You describe a goal in plain language. A swarm of specialized agents senses the live web, verifies what it finds,
        weaves it into one living map, and drafts your next moves — every claim traceable to its source.
      </p>
    </header>

    {/* pipeline */}
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      {PIPELINE_STEPS.map((s, i) => (
        <div key={s.n} className={`relative rounded-2xl border p-5 flex flex-col gap-2 ${card(isDark)}`}>
          <div className="flex items-center justify-between">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 ${s.color}`}><Icon name={s.icon} className="w-5 h-5" /></span>
            <span className="text-[10px] font-mono text-slate-400">STEP {s.n}</span>
          </div>
          <h3 className={`text-base font-bold ${title(isDark)}`}>{s.title}</h3>
          <p className={`text-xs leading-relaxed ${muted(isDark)}`}>{s.text}</p>
          {i < PIPELINE_STEPS.length - 1 && (
            <ArrowRight className="hidden md:block absolute -right-2.5 top-1/2 w-4 h-4 text-slate-300 dark:text-white/10 z-10" />
          )}
        </div>
      ))}
    </div>

    {/* what makes it different */}
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { icon: <Eye className="w-5 h-5 text-blue-500" />, h: "Total traceability", t: "Every sentence in the brief links to the exact source it came from. No unverifiable AI 'slop'." },
        { icon: <ShieldAlert className="w-5 h-5 text-red-500" />, h: "Self-correcting", t: "The Watchdog flags contradictions and drift; a one-line human correction heals confidence across the whole map." },
        { icon: <Network className="w-5 h-5 text-emerald-500" />, h: "Truly agentic web", t: "Agents open and read real pages — pricing, news, careers, filings — not a model guessing from memory." },
      ].map((b, i) => (
        <div key={i} className={`rounded-2xl border p-5 flex flex-col gap-2 ${card(isDark)}`}>
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">{b.icon}</div>
          <h3 className={`text-sm font-bold ${title(isDark)}`}>{b.h}</h3>
          <p className={`text-xs leading-relaxed ${muted(isDark)}`}>{b.t}</p>
        </div>
      ))}
    </section>

    <div className="flex justify-center">
      <button onClick={() => onLaunch()} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20">
        <Rocket className="w-4 h-4" /> Launch your first mission <ArrowRight className="w-4 h-4" />
      </button>
    </div>
    </div>
  </main>
);

// ─── THE TEAM (agents) ───────────────────────────────────────────────────────
export const AgentsPage: React.FC<PageProps> = ({ isDark, onLaunch }) => (
  <main className="flex-1 overflow-y-auto">
    <div className="max-w-6xl mx-auto w-full p-4 md:p-8 flex flex-col gap-8">
    <header className="text-center flex flex-col items-center gap-3">
      <span className="text-[10px] font-mono tracking-widest text-blue-500 uppercase font-semibold bg-blue-500/10 px-3 py-1 rounded-full">Meet the swarm</span>
      <h2 className={`text-3xl md:text-4xl font-extrabold tracking-tight ${title(isDark)}`}>Your AI intelligence team</h2>
      <p className={`text-sm max-w-2xl ${muted(isDark)}`}>
        Think of it as a research team where every member has one clear job. They hand work to each other automatically —
        you just give the goal and approve the output.
      </p>
    </header>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {AGENTS.map((a) => (
        <div key={a.id} className={`rounded-2xl border p-5 flex flex-col gap-2.5 transition-all hover:-translate-y-0.5 ${card(isDark)}`}>
          <div className="flex items-center gap-3">
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center bg-white/5 ${a.color}`}><Icon name={a.icon} className="w-5 h-5" /></span>
            <div>
              <h3 className={`text-sm font-extrabold ${title(isDark)}`}>{a.role}</h3>
              <span className="text-[10px] font-mono text-slate-400">aka “{a.codename}”</span>
            </div>
          </div>
          <p className={`text-[13px] font-semibold ${a.color}`}>{a.blurb}</p>
          <p className={`text-xs leading-relaxed ${muted(isDark)}`}>{a.detail}</p>
        </div>
      ))}
    </div>

    <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row items-center justify-between gap-4 ${card(isDark)}`}>
      <p className={`text-xs ${muted(isDark)}`}>
        <span className={`font-bold ${title(isDark)}`}>How they work together:</span> Mission Planner → Web Scout → Analysts → Fact-Checker → Memory Weaver → Watchdog → Strategist → Reporter → Assistant.
      </p>
      <button onClick={() => onLaunch()} className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2">
        See them work <ArrowRight className="w-4 h-4" />
      </button>
    </div>
    </div>
  </main>
);

// ─── USE CASES (who it's for + problem statements) ─────────────────────────────
export const UseCasesPage: React.FC<PageProps> = ({ isDark, onLaunch }) => (
  <main className="flex-1 overflow-y-auto">
    <div className="max-w-6xl mx-auto w-full p-4 md:p-8 flex flex-col gap-8">
    <header className="text-center flex flex-col items-center gap-3">
      <span className="text-[10px] font-mono tracking-widest text-blue-500 uppercase font-semibold bg-blue-500/10 px-3 py-1 rounded-full">Who it's for</span>
      <h2 className={`text-3xl md:text-4xl font-extrabold tracking-tight ${title(isDark)}`}>One platform, many missions</h2>
      <p className={`text-sm max-w-2xl ${muted(isDark)}`}>
        Anyone who has to track the outside world to make decisions. Pick the closest fit — each starts a real mission you can run now.
      </p>
    </header>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {USE_CASES.map((u) => (
        <div key={u.persona} className={`rounded-2xl border p-5 flex flex-col gap-3 ${card(isDark)}`}>
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center"><Icon name={u.icon} className="w-5 h-5" /></span>
            <h3 className={`text-base font-extrabold ${title(isDark)}`}>{u.persona}</h3>
          </div>
          <div className="flex gap-2 items-start">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className={`text-xs leading-relaxed ${muted(isDark)}`}><span className="font-semibold text-amber-600 dark:text-amber-400">Problem:</span> {u.problem}</p>
          </div>
          <div className="flex gap-2 items-start">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
            <p className={`text-xs leading-relaxed ${muted(isDark)}`}><span className="font-semibold text-emerald-600 dark:text-emerald-400">Nebula:</span> {u.solution}</p>
          </div>
          <div className={`text-[11px] rounded-lg border px-3 py-2 ${isDark ? "bg-black/30 border-white/5" : "bg-slate-50 border-slate-200"}`}>
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">You get</span>
            <span className={muted(isDark)}>{u.outcome}</span>
          </div>
          <button
            onClick={() => onLaunch(u.example)}
            className="mt-auto text-left group flex items-center justify-between gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-lg transition-all"
          >
            <span className="truncate">Run: “{u.example.length > 46 ? u.example.slice(0, 46) + "…" : u.example}”</span>
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
          </button>
        </div>
      ))}
    </div>
    </div>
  </main>
);
