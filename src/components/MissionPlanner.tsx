import React from "react";
import { MissionPlanVariant } from "../types.ts";
import { X, Loader2, Sparkles, ArrowRight, Compass, Check, Wand2, User, Leaf, Cpu, Timer } from "lucide-react";

interface MissionPlannerProps {
  isDark: boolean;
  prompt: string;
  persona?: string;       // selected operator persona steering the angles
  deployCost?: number;    // Green Credits charged on deploy
  loading: boolean;
  variants: MissionPlanVariant[];
  deployingId: string | null; // id of variant being deployed, or "as-is"
  onSelect: (v: MissionPlanVariant) => void;
  onRunAsIs: () => void;
  onCancel: () => void;
}

const ACCENTS = [
  { ring: "hover:border-blue-500/60", chip: "bg-blue-500/10 text-blue-500", glow: "from-blue-500/15", num: "text-blue-500" },
  { ring: "hover:border-fuchsia-500/60", chip: "bg-fuchsia-500/10 text-fuchsia-500", glow: "from-fuchsia-500/15", num: "text-fuchsia-500" },
  { ring: "hover:border-cyan-500/60", chip: "bg-cyan-500/10 text-cyan-500", glow: "from-cyan-500/15", num: "text-cyan-500" },
];

export const MissionPlanner: React.FC<MissionPlannerProps> = ({
  isDark,
  prompt,
  persona,
  deployCost = 25,
  loading,
  variants,
  deployingId,
  onSelect,
  onRunAsIs,
  onCancel,
}) => {
  const busy = deployingId !== null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={busy ? undefined : onCancel} />

      <div
        className={`relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl ${
          isDark ? "bg-[#0a0d14] border-white/10" : "bg-white border-slate-200"
        }`}
      >
        {/* header */}
        <div className={`sticky top-0 z-10 flex items-start justify-between gap-4 px-6 py-4 border-b backdrop-blur ${isDark ? "bg-[#0a0d14]/90 border-white/10" : "bg-white/90 border-slate-200"}`}>
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-indigo-400 uppercase font-semibold">
              <Wand2 className="w-3.5 h-3.5" />
              Choose your mission angle
            </span>
            <h2 className={`text-lg font-bold tracking-tight font-display ${isDark ? "text-white" : "text-slate-900"}`}>
              How should the swarm approach this?
            </h2>
            <p className={`text-xs max-w-2xl ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              For <span className="font-semibold text-indigo-400">“{prompt}”</span> — pick a strategy and the agents weave it.
            </p>
            {/* deployment context: persona steering + live cost preview */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {persona && (
                <span className={`flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full border ${isDark ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300" : "border-indigo-200 bg-indigo-50 text-indigo-600"}`} title="Angles are tailored to this operator persona">
                  <User className="w-2.5 h-2.5" /> {persona}
                </span>
              )}
              <span className={`flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full border ${isDark ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-emerald-200 bg-emerald-50 text-emerald-600"}`} title="Green Credits charged when the swarm deploys">
                <Leaf className="w-2.5 h-2.5" /> {deployCost} credits
              </span>
              <span className={`flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full border ${isDark ? "border-white/10 text-gray-400" : "border-slate-200 text-slate-500"}`} title="Typical token spend for one full sensing pass">
                <Cpu className="w-2.5 h-2.5" /> ~8–15k tokens
              </span>
              <span className={`flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full border ${isDark ? "border-white/10 text-gray-400" : "border-slate-200 text-slate-500"}`} title="Typical wall-clock time until the fabric is ready">
                <Timer className="w-2.5 h-2.5" /> ~30–90s
              </span>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={busy}
            className={`p-2 rounded-lg disabled:opacity-40 ${isDark ? "text-gray-400 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* body */}
        <div className="p-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-5 flex flex-col gap-3 animate-pulse ${isDark ? "bg-[#0c111c] border-white/5" : "bg-slate-50 border-slate-200"}`}
                >
                  <div className={`h-3 w-1/3 rounded ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                  <div className={`h-5 w-2/3 rounded ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                  <div className={`h-3 w-full rounded ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
                  <div className={`h-3 w-5/6 rounded ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
                  <div className="flex gap-1.5 mt-2">
                    <div className={`h-4 w-12 rounded-full ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                    <div className={`h-4 w-12 rounded-full ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                  </div>
                </div>
              ))}
              <div className="md:col-span-3 flex items-center justify-center gap-2 text-xs font-mono text-blue-500 pt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Conductor is decomposing your goal into strategic angles…
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {variants.map((v, i) => {
                  const ac = ACCENTS[i % ACCENTS.length];
                  const isThisDeploying = deployingId === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => onSelect(v)}
                      disabled={busy}
                      className={`group relative text-left rounded-xl border p-5 flex flex-col gap-3 transition-all overflow-hidden disabled:cursor-not-allowed ${
                        isDark ? "bg-[#0c111c] border-white/10" : "bg-white border-slate-200 shadow-sm"
                      } ${!busy ? ac.ring + " hover:-translate-y-1 hover:shadow-xl" : "opacity-60"}`}
                    >
                      <div className={`absolute inset-x-0 -top-10 h-24 bg-gradient-to-b ${ac.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-mono font-bold ${ac.num}`}>ANGLE {i + 1}</span>
                        <Compass className={`w-4 h-4 ${ac.num}`} />
                      </div>
                      <h3 className={`text-base font-extrabold tracking-tight leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                        {v.name}
                      </h3>
                      <p className={`text-[11px] font-medium ${ac.num}`}>{v.angle}</p>
                      <p className={`text-[12px] leading-relaxed flex-1 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                        {v.description}
                      </p>
                      {v.focus?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {v.focus.map((f, fi) => (
                            <span key={fi} className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${ac.chip}`}>
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                      <div
                        className={`mt-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg transition-all ${
                          isThisDeploying
                            ? "bg-blue-600/20 text-blue-400"
                            : "bg-blue-600 text-white group-hover:bg-blue-500"
                        }`}
                      >
                        {isThisDeploying ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Weaving the swarm…
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" /> Deploy this angle <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* run-as-is fallback */}
              <div className={`mt-5 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${isDark ? "border-white/10" : "border-slate-200"}`}>
                <span className={`text-[11px] ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                  Prefer your original wording? Run it verbatim without a strategic reframe.
                </span>
                <button
                  onClick={onRunAsIs}
                  disabled={busy}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg border transition-all disabled:opacity-40 ${
                    isDark ? "border-white/10 text-gray-200 hover:bg-white/5" : "border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {deployingId === "as-is" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Run my exact prompt
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
