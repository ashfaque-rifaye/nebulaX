import React from "react";
import { Profile } from "../types.ts";
import {
  Leaf, Coins, Zap, TrendingUp, Loader2, Check, ArrowRight, User, Wallet as WalletIcon,
  Bike, Salad, Thermometer, Lightbulb, Recycle, Sparkles, ShieldCheck
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
  onAuth: () => void;          // open the sign-in / create-account modal
  onOpenWallet: () => void;    // open the full wallet (ledger + earn)
  onClaim: (pledgeId: string) => void;
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export const GreenCredits: React.FC<GreenCreditsProps> = ({
  isDark, handle, profile, pledges, deployCost, loading, claimingId, onAuth, onOpenWallet, onClaim,
}) => {
  // ── Signed-out gate: a real account CTA (no more vague handle box) ──
  if (!handle) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center gap-4 p-6 text-center overflow-hidden">
        <div className="absolute -top-16 -right-10 w-44 h-44 bg-luna-gradient opacity-20 blur-3xl pointer-events-none" />
        <div className="relative w-14 h-14 rounded-2xl bg-luna-gradient flex items-center justify-center float-y shadow-lg shadow-violet-500/30">
          <Leaf className="w-7 h-7 text-white" />
        </div>
        <div className="relative">
          <h3 className={`text-base font-extrabold font-display ${isDark ? "text-white" : "text-slate-900"}`}>Your Green Wallet</h3>
          <p className={`text-[11px] mt-1 max-w-[250px] ${isDark ? "text-white/55" : "text-slate-500"}`}>
            Create an account to bank <span className="text-emerald-500 font-semibold">Green Credits</span> by cutting real emissions, then spend them as you run the swarm.
          </p>
        </div>
        <div className="relative w-full max-w-[260px] flex flex-col gap-2">
          <button
            onClick={onAuth}
            className="bg-luna-gradient cta-luna text-white text-xs font-bold py-2.5 rounded-full flex items-center justify-center gap-1.5"
          >
            Create account · get 120 credits <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onAuth}
            className={`text-[11px] font-semibold py-1.5 transition-colors ${isDark ? "text-white/55 hover:text-white" : "text-slate-500 hover:text-slate-800"}`}
          >
            Already have one? <span className="text-violet-400">Sign in</span>
          </button>
          <p className={`text-[9px] flex items-center justify-center gap-1 mt-0.5 ${isDark ? "text-white/35" : "text-slate-400"}`}>
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" /> scrypt-hashed · httpOnly session
          </p>
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
      <div className={`px-3.5 py-3 border-b ${isDark ? "border-white/5 bg-[#0b0e1c]/60" : "border-slate-200 bg-white/70"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Leaf className="w-4 h-4 text-emerald-500" />
            <span className={`text-[11px] font-bold font-mono tracking-wide ${isDark ? "text-gray-200" : "text-slate-800"}`}>GREEN CREDITS</span>
          </div>
          <button
            onClick={onOpenWallet}
            title="Open your wallet — balance, ledger & earnings"
            className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full border transition-colors ${isDark ? "text-white/60 border-white/10 hover:bg-white/5" : "text-slate-500 border-violet-500/15 hover:bg-violet-500/5"}`}
          >
            <WalletIcon className="w-3 h-3" />{handle}
          </button>
        </div>
        <div className="flex items-end gap-1.5 mt-1.5">
          <Coins className="w-5 h-5 text-emerald-500 mb-0.5" />
          <span className={`text-3xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            {loading && !profile ? "…" : credits}
          </span>
          <span className="text-[10px] font-mono text-slate-400 mb-1.5">credits · metered/run</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className={`rounded-lg border px-2 py-1.5 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-emerald-50/60 border-emerald-200/60"}`}>
            <div className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider text-emerald-500"><Leaf className="w-2.5 h-2.5" />CO₂ saved</div>
            <div className={`text-sm font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>{co2kg.toFixed(2)} kg</div>
          </div>
          <div className={`rounded-lg border px-2 py-1.5 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-violet-50/60 border-violet-200/60"}`}>
            <div className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider text-violet-500"><TrendingUp className="w-2.5 h-2.5" />$ saved</div>
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
                    : isDark ? "bg-[#0d1122] border-white/5 hover:border-emerald-500/40" : "bg-white border-slate-200 hover:border-emerald-400 shadow-sm"
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
