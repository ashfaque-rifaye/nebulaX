import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Profile, LedgerEntry } from "../types.ts";
import { PledgeDef } from "./GreenCredits.tsx";
import {
  X, Leaf, Coins, TrendingUp, LogOut, ArrowDownRight, ArrowUpRight, Loader2, Check, Gauge,
  Rocket, RotateCcw, Wand2, Bot, MessageSquare, Clock, Image as ImageIcon, Clapperboard, Sparkles, Zap,
  Bike, Salad, Thermometer, Lightbulb, Recycle,
} from "lucide-react";

const SRC_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  deploy: Rocket, resense: RotateCcw, edit: RotateCcw, "custom-agent": Wand2, agent: Bot,
  chat: MessageSquare, forecast: Clock, "media-image": ImageIcon, "media-video": Clapperboard,
  pledge: Leaf, dividend: TrendingUp,
};
const PLEDGE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Bike, Salad, Thermometer, Lightbulb, Recycle, WashingMachine: Recycle,
};

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
const todayUTC = () => new Date().toISOString().slice(0, 10);

interface Props {
  isDark: boolean;
  profile: Profile | null;
  pledges: PledgeDef[];
  minReserve: number;
  claimingId: string | null;
  onClaim: (pledgeId: string) => void;
  onClose: () => void;
  onSignOut: () => void;
}

export const Wallet: React.FC<Props> = ({ isDark, profile, pledges, minReserve, claimingId, onClaim, onClose, onSignOut }) => {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"activity" | "earn">("activity");

  const loadLedger = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(profile.handle)}/ledger?limit=150`, { credentials: "include" });
      if (res.ok) { const d = await res.json(); setLedger(d.ledger || []); }
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { loadLedger(); /* eslint-disable-next-line */ }, [profile?.handle, profile?.credits, claimingId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const muted = isDark ? "text-white/55" : "text-slate-500";
  const subtle = isDark ? "text-white/35" : "text-slate-400";
  const cardBg = isDark ? "bg-white/[0.03] border-white/[0.07]" : "bg-white border-violet-500/10";
  const claimedToday = new Set((profile?.pledges || []).filter(p => p.date === todayUTC()).map(p => p.id));
  const credits = profile?.credits ?? 0;
  const lowBalance = credits < minReserve * 3;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(4,4,14,0.66)", backdropFilter: "blur(8px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`relative w-full max-w-lg max-h-[88vh] rounded-[2rem] border glass-strong shadow-2xl overflow-hidden flex flex-col animate-fadeInUp ${isDark ? "border-white/10" : "border-violet-500/15"}`}>
        {/* balance header */}
        <div className="relative px-6 pt-6 pb-5 overflow-hidden flex-shrink-0">
          <div className="absolute -top-20 -right-10 w-56 h-56 bg-luna-gradient opacity-[0.18] blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-luna-gradient flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className={`text-[10px] font-mono uppercase tracking-widest ${subtle}`}>Green Wallet</div>
                <div className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>@{profile?.handle}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={onSignOut} title="Sign out" className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-white/55" : "hover:bg-slate-100 text-slate-500"}`}>
                <LogOut className="w-4 h-4" />
              </button>
              <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-white/60" : "hover:bg-slate-100 text-slate-500"}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative mt-4 flex items-end gap-2">
            <Coins className="w-7 h-7 text-emerald-400 mb-1" />
            <span className={`text-5xl font-extrabold tracking-tight font-display tabular ${isDark ? "text-white" : "text-slate-900"}`}>{credits}</span>
            <span className={`text-xs font-mono mb-2 ${muted}`}>credits</span>
          </div>

          <div className="relative grid grid-cols-3 gap-2 mt-4">
            {[
              { Icon: Leaf, label: "CO₂ saved", val: `${((profile?.totalCo2Saved_g ?? 0) / 1000).toFixed(2)} kg`, c: "text-emerald-500" },
              { Icon: TrendingUp, label: "$ saved", val: `$${(profile?.totalCostSaved_usd ?? 0).toFixed(3)}`, c: "text-violet-400" },
              { Icon: Zap, label: "Spent", val: `${profile?.totalSpent ?? 0} cr`, c: "text-fuchsia-400" },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl border p-2.5 ${cardBg}`}>
                <s.Icon className={`w-3.5 h-3.5 mb-1 ${s.c}`} />
                <div className={`text-sm font-extrabold tabular ${isDark ? "text-white" : "text-slate-900"}`}>{s.val}</div>
                <div className={`text-[8px] font-mono uppercase tracking-wider ${subtle}`}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* metered pricing explainer */}
          <div className={`relative mt-3 rounded-2xl border px-3 py-2 flex items-start gap-2 ${isDark ? "bg-violet-500/[0.06] border-violet-500/15" : "bg-violet-500/[0.04] border-violet-500/15"}`}>
            <Gauge className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
            <p className={`text-[10.5px] leading-snug ${muted}`}>
              Runs are <span className="font-semibold text-violet-400">metered by tokens</span> — each agent run debits credits = tokens × your model's rate. Greener engines cost less. Min. {minReserve} credits to start a run.
            </p>
          </div>
        </div>

        {/* tabs */}
        <div className={`flex px-6 gap-1 border-b flex-shrink-0 ${isDark ? "border-white/[0.07]" : "border-violet-500/10"}`}>
          {(["activity", "earn"] as const).map(tb => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`text-xs font-bold px-3 py-2.5 border-b-2 -mb-px transition-colors ${
                tab === tb ? "border-violet-500 text-violet-400" : `border-transparent ${muted} hover:text-violet-400`
              }`}
            >
              {tb === "activity" ? "Activity" : "Earn credits"}
            </button>
          ))}
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {tab === "activity" ? (
            loading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>
            ) : ledger.length === 0 ? (
              <div className={`text-center py-10 text-xs ${muted}`}>
                <Sparkles className="w-6 h-6 mx-auto mb-2 text-violet-400/60" />
                No wallet activity yet. Deploy a swarm or claim an eco-pledge to get started.
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {ledger.map(e => {
                  const Icon = SRC_ICON[e.source] || Coins;
                  const earn = e.direction === "earn";
                  return (
                    <div key={e.id} className={`flex items-center gap-3 px-2.5 py-2 rounded-xl border ${cardBg}`}>
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${earn ? "bg-emerald-500/15 text-emerald-400" : "bg-fuchsia-500/12 text-fuchsia-400"}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[11.5px] font-semibold leading-tight truncate ${isDark ? "text-white/90" : "text-slate-800"}`}>{e.note}</div>
                        <div className={`text-[9px] font-mono ${subtle}`}>
                          {timeAgo(e.ts)}{e.tokens ? ` · ${e.tokens} tok` : ""}{e.provider ? ` · ${e.provider}` : ""}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-xs font-bold tabular flex items-center gap-0.5 ${earn ? "text-emerald-400" : "text-fuchsia-400"}`}>
                          {earn ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {earn ? "+" : "−"}{e.amount}
                        </div>
                        <div className={`text-[9px] font-mono ${subtle}`}>bal {e.balance}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="flex flex-col gap-1.5">
              {lowBalance && (
                <div className="text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-1">
                  Running low — claim a few eco-pledges to keep the swarm flying.
                </div>
              )}
              {pledges.map(p => {
                const Icon = PLEDGE_ICON[p.icon] || Zap;
                const done = claimedToday.has(p.id);
                const busy = claimingId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => !done && !busy && onClaim(p.id)}
                    disabled={done || busy}
                    className={`group flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all ${
                      done ? "opacity-70 " + cardBg : `${cardBg} hover:border-emerald-500/40`
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${done ? "bg-emerald-500 text-white" : "bg-emerald-500/15 text-emerald-500"}`}>
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11.5px] font-bold leading-tight ${isDark ? "text-white/90" : "text-slate-800"}`}>{p.label}</div>
                      <div className={`text-[9px] ${subtle} truncate`}>{p.detail} · ~{p.co2_g >= 1000 ? (p.co2_g / 1000).toFixed(1) + "kg" : p.co2_g + "g"} CO₂</div>
                    </div>
                    <span className={`text-[11px] font-mono font-bold flex-shrink-0 text-emerald-500`}>{done ? "✓ today" : `+${p.credits}`}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
