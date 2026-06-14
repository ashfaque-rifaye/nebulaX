import React, { useState } from "react";
import { WeaveNode } from "../types.ts";
import { GitCompareArrows, Sparkles, Check, Loader2, CheckCircle2, ExternalLink, Pencil } from "lucide-react";

interface Props {
  node: WeaveNode;
  missionId: string;
  isDark: boolean;
  onResolved: () => void;
}

type Choice = "accept" | "a" | "b" | "custom";

// The "Reconcile" surface: shows exactly what disagrees (Side A vs Side B), the
// agent's recommended reconciliation, and lets the user accept it, trust one
// source, or write their own value — which is recorded back into memory.
export const ConflictResolver: React.FC<Props> = ({ node, missionId, isDark, onResolved }) => {
  const d: any = (node.data && typeof node.data === "object") ? node.data : {};
  const sides: any[] = Array.isArray(d.sides) ? d.sides : [];
  const rec = d.recommendation || {};
  const resolution = d.resolution;

  const [choice, setChoice] = useState<Choice>("accept");
  const [custom, setCustom] = useState<string>(String(rec.value || ""));
  const [applying, setApplying] = useState(false);

  const card = isDark ? "bg-[#0c101f] border-white/[0.08]" : "bg-white border-slate-200";
  const title = isDark ? "text-white" : "text-slate-900";
  const muted = isDark ? "text-[#9298b4]" : "text-slate-500";
  const body = isDark ? "text-[#b9bdd4]" : "text-slate-600";

  // Already resolved → show the recorded outcome.
  if (resolution || (!node.conflict && node.flagged_by !== "sentinel")) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-500">
          <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled · written to memory
        </span>
        {resolution?.value && <span className={`text-[11.5px] leading-snug ${body}`}>{resolution.value}</span>}
      </div>
    );
  }

  const apply = async () => {
    setApplying(true);
    try {
      const payload: any = { choice };
      if (choice === "custom") payload.value = custom;
      const r = await fetch(`/api/missions/${missionId}/conflicts/${node.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (r.ok) onResolved();
    } finally {
      setApplying(false);
    }
  };

  const SideCard = ({ side, k }: { side: any; k: Choice }) => {
    const active = choice === k;
    return (
      <button
        type="button"
        onClick={() => setChoice(k)}
        className={`flex-1 min-w-0 text-left rounded-lg border p-2.5 transition-all ${
          active ? "border-violet-500 ring-1 ring-violet-500/40" : (isDark ? "border-white/10 hover:border-white/20" : "border-slate-200 hover:border-slate-300")
        } ${card}`}
      >
        <div className={`text-[8.5px] font-mono uppercase tracking-wide truncate ${muted}`}>{side?.label}</div>
        <div className={`text-[13px] font-extrabold leading-tight mt-0.5 ${title}`}>{side?.value}</div>
        {side?.source && (
          <span className="inline-flex items-center gap-1 text-[8.5px] font-mono text-violet-500 mt-1 truncate max-w-full">
            <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" /> {String(side.source).replace(/^https?:\/\//, "")}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-3 flex flex-col gap-3">
      <div>
        <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-rose-500">
          <GitCompareArrows className="w-3.5 h-3.5" /> Reconcile this conflict
        </span>
        {d.field && <div className={`text-[11px] mt-1 ${body}`}>In dispute: <span className={`font-bold ${title}`}>{d.field}</span></div>}
      </div>

      {/* the two sides */}
      {sides.length >= 2 && (
        <div className="flex gap-2 items-stretch">
          <SideCard side={sides[0]} k="a" />
          <div className={`self-center text-[9px] font-mono font-bold ${muted}`}>vs</div>
          <SideCard side={sides[1]} k="b" />
        </div>
      )}

      {/* agent recommendation */}
      {rec.value && (
        <button
          type="button"
          onClick={() => setChoice("accept")}
          className={`text-left rounded-lg border p-2.5 transition-all ${
            choice === "accept" ? "border-violet-500 ring-1 ring-violet-500/40" : "border-violet-500/30"
          } ${isDark ? "bg-violet-500/[0.06]" : "bg-violet-500/[0.04]"}`}
        >
          <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-violet-500">
            <Sparkles className="w-3 h-3" /> Reviewer recommends
          </span>
          <div className={`text-[12px] font-bold leading-snug mt-1 ${title}`}>{rec.value}</div>
          {rec.reasoning && <p className={`text-[10.5px] leading-relaxed mt-1 ${body}`}>{rec.reasoning}</p>}
        </button>
      )}

      {/* write your own */}
      <div
        className={`rounded-lg border p-2 transition-all ${choice === "custom" ? "border-violet-500 ring-1 ring-violet-500/40" : (isDark ? "border-white/10" : "border-slate-200")}`}
      >
        <span className={`flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wide ${muted}`}>
          <Pencil className="w-2.5 h-2.5" /> Or set your own value
        </span>
        <textarea
          value={custom}
          onFocus={() => setChoice("custom")}
          onChange={(e) => { setCustom(e.target.value); setChoice("custom"); }}
          rows={2}
          placeholder="Type the corrected, canonical value…"
          className={`mt-1.5 w-full bg-transparent resize-none text-[11.5px] leading-snug focus:outline-none ${isDark ? "text-white placeholder-gray-600" : "text-slate-800 placeholder-slate-400"}`}
        />
      </div>

      <button
        type="button"
        onClick={apply}
        disabled={applying || (choice === "custom" && !custom.trim())}
        className="flex items-center justify-center gap-1.5 bg-luna-gradient cta-luna text-white text-[11px] font-bold py-2 rounded-lg disabled:opacity-50"
      >
        {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        Resolve & write to memory
      </button>
      <p className={`text-[9px] leading-snug ${muted}`}>
        Resolving records the canonical value back into the fabric (our living memory) and marks both sources reconciled — the original claims stay on file.
      </p>
    </div>
  );
};
