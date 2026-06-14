import React, { useState } from "react";
import { WeaveNode } from "../types.ts";
import { Wand2, Loader2, Check, Pencil, X } from "lucide-react";

interface Props {
  node: WeaveNode;
  missionId: string;
  isDark: boolean;
  onSaved: () => void;
}

// Inline fine-tuning for a generated finding: ask the agent to refine the text
// (facts/numbers preserved), edit it freely, and save it back into memory as a
// correction. Lets the user tune the exact data from the UI, not just read it.
export const RefineFinding: React.FC<Props> = ({ node, missionId, isDark, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(node.content);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const muted = isDark ? "text-[#9298b4]" : "text-slate-500";
  const btn = isDark ? "text-gray-300 border-white/10 hover:border-white/20" : "text-slate-600 border-slate-200 hover:border-slate-300";

  const refine = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/nodes/${node.id}/refine`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (d?.suggestion) setText(d.suggestion);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch(`/api/nodes/${node.id}/correct`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ content: text, mission_id: missionId, reason: "refined from the UI" }),
      });
      if (r.ok) { setOpen(false); onSaved(); }
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setText(node.content); setOpen(true); }}
        className={`mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all no-pan ${btn}`}
        title="Tune this finding's text and save it to memory"
      >
        <Pencil className="w-3 h-3" /> Refine
      </button>
    );
  }

  return (
    <div className={`mt-2 rounded-lg border p-2 no-pan ${isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[9px] font-mono uppercase tracking-wide ${muted}`}>Refine the text</span>
        <button onClick={() => setOpen(false)} className={muted}><X className="w-3 h-3" /></button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className={`w-full bg-transparent resize-none text-[11.5px] leading-snug focus:outline-none ${isDark ? "text-white" : "text-slate-800"}`}
      />
      <div className="flex items-center gap-1.5 mt-1.5">
        <button
          type="button" onClick={refine} disabled={loading}
          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border disabled:opacity-50 ${btn}`}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3 text-violet-500" />} Suggest
        </button>
        <button
          type="button" onClick={save} disabled={saving || !text.trim() || text === node.content}
          className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md bg-luna-gradient cta-luna text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save to memory
        </button>
      </div>
    </div>
  );
};
