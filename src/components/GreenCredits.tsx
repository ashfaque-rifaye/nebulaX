import React, { useState } from "react";
import { Profile, MissionPlanVariant } from "../types.ts";
import {
  Leaf, Coins, Zap, TrendingUp, Loader2, Check, ArrowRight, User,
  Bike, Salad, Thermometer, Lightbulb, Recycle, Sparkles
} from "lucide-react";

export interface PledgeDef {
  id: string;
  label: string;
  detail: string;
  credits: number;
  co2_g: number;
  icon: string;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Bike, Salad, Thermometer, Lightbulb, Recycle,
  WashingMachine: Recycle, // fallback alias
};

interface GreenCreditsProps {
  isDark: boolean;
  handle: string | null;
  profile: Profile | null;
  pledges: PledgeDef[];
  deployCost: number;
  loading: boolean;
  claimingId: string | null;
  onSetHandle: (h: string) => void;
  onClaim: (pledgeId: string) => void;
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export const GreenCredits: React.FC<GreenCreditsProps> = ({
  isDark, handle, profile, pledges, deployCost, loading, claimingId, onSetHandle, onClaim,
}) => {
  const [draft, setDraft] = useState("");

  // ── Handle setup gate ──
  if (!handle) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center float-y">
          <Leaf className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <h3 className={`text-sm font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>Create your Green profile</h3>
          <p className={`text-[11px] mt-1 max-w-[240px] ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Earn <span className="text-emerald-500 font-semibold">Green Credits</span> by cutting real-world emissions, then spend them to deploy the agent swarm.
          </p>
        </div>
        <div className="w-full max-w-[260px] flex flex-col gap-2">
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${isDark ? "bg-[#0b0f19] border-white/10" : "bg-white border-slate-200"}`}>
            <User className="w-3.5 h-3.5 text-slate-400" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) onSetHandle(draft.trim()); }}
              placeholder="pick a handle (e.g. ashfaque)"
              className={`flex-1 bg-transparent text-xs focus:outline-none ${isDark ? "text-white placeholder-gray-500" : "text-slate-800 placeholder-slate-400"}`}
            />
          </div>
          <button
            onClick={() => draft.trim() && onSetHandle(draft.trim())}
            disabled={!draft.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5"
          >
            Start earning <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const claimedToday = new Set((profile?.pledges || []).filter(p => p.date === todayUTC()).map(p => p.id));
  const credits = profile?.credits ?? 0;
  const co2kg = ((profile?.totalCo2Saved_g ?? 0) / 1000);
  const saved = profile?.totalCostSaved_usd ?? 0;

  return (
    <div className="w-full h-full flex flex-col">
      {/* header: balance + impact */}
      <div className={`px-3.5 py-3 border-b ${isDark ? "border-white/5 bg-[#0b0f19]/60" : "border-slate-200 bg-white/70"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Leaf className="w-4 h-4 text-emerald-500" />
            <span className={`text-[11px] font-bold font-mono tracking-wide ${isDark ? "text-gray-200" : "text-slate-800"}`}>GREEN CREDITS</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
            <User className="w-3 h-3" />{handle}
          </span>
        </div>
        <div className="flex items-end gap-1.5 mt-1.5">
          <Coins className="w-5 h-5 text-emerald-500 mb-0.5" />
          <span className={`text-3xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            {loading && !profile ? "…" : credits}
          </span>
          <span className="text-[10px] font-mono text-slate-400 mb-1.5">credits · {deployCost}/deploy</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className={`rounded-lg border px-2 py-1.5 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-emerald-50/60 border-emerald-200/60"}`}>
            <div className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider text-emerald-500"><Leaf className="w-2.5 h-2.5" />CO₂ saved</div>
            <div className={`text-sm font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>{co2kg.toFixed(2)} kg</div>
          </div>
          <div className={`rounded-lg border px-2 py-1.5 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-blue-50/60 border-blue-200/60"}`}>
            <div className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider text-blue-500"><TrendingUp className="w-2.5 h-2.5" />$ saved</div>
            <div className={`text-sm font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>${saved.toFixed(3)}</div>
          </div>
        </div>
      </div>

      {/* eco-pledges */}
      <div className="flex-1 overflow-y-auto p-2.5">
        <div className="flex items-center gap-1.5 px-1 mb-1.5">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400">Earn — daily eco-pledges</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {pledges.map((p) => {
            const Icon = ICONS[p.icon] || Zap;
            const done = claimedToday.has(p.id);
            const busy = claimingId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => !done && !busy && onClaim(p.id)}
                disabled={done || busy}
                className={`group flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all ${
                  done
                    ? isDark ? "bg-emerald-950/20 border-emerald-900/30 opacity-70" : "bg-emerald-50 border-emerald-200 opacity-80"
                    : isDark ? "bg-[#0c111c] border-white/5 hover:border-emerald-500/40" : "bg-white border-slate-200 hover:border-emerald-400 shadow-sm"
                }`}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${done ? "bg-emerald-500 text-white" : "bg-emerald-500/15 text-emerald-500"}`}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] font-bold leading-tight ${isDark ? "text-gray-100" : "text-slate-800"}`}>{p.label}</div>
                  <div className="text-[9px] text-slate-400 truncate">{p.detail} · ~{p.co2_g >= 1000 ? (p.co2_g/1000).toFixed(1)+"kg" : p.co2_g+"g"} CO₂</div>
                </div>
                <span className={`text-[10px] font-mono font-bold flex-shrink-0 ${done ? "text-emerald-500" : "text-emerald-500 group-hover:scale-110 transition-transform"}`}>
                  {done ? "✓ today" : `+${p.credits}`}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[8.5px] text-slate-400/80 text-center mt-2 px-2 leading-snug">
          Credits also accrue automatically as an <span className="text-emerald-500">efficiency dividend</span> — the CO₂ each mission avoids vs a GPT-4-class baseline.
        </p>
      </div>
    </div>
  );
};
