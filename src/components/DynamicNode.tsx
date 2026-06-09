import React from "react";
import { WeaveNode } from "../types.ts";
import { Quote, ArrowLeftRight, Hash } from "lucide-react";

interface Props {
  node: WeaveNode;
  isDark: boolean;
  compact?: boolean;
}

// Coerce ANY value into a safe string so we never try to render an object/array
// as a React child (which throws "Objects are not valid as a React child").
function str(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    // common shapes the LLM might return for a "point" or "value"
    if (typeof v.text === "string") return v.text;
    if (typeof v.value === "string") return v.value;
    if (typeof v.label === "string" && (v.value !== undefined)) return `${v.label}: ${str(v.value)}`;
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}

function asArray(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

// Lightweight client-side fallback: pull "label: value" metric pairs out of prose.
function heuristicMetrics(text: string): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  const re = /([A-Z][A-Za-z0-9 /&'-]{2,28}?)[:–-]\s*([$€₹]?\s?[\d][\d.,]*\s?(?:%|bn|mn|k|\/mo|\/month|per month|\/yr)?)/g;
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(text)) && out.length < 4 && guard++ < 50) {
    const label = m[1].trim();
    const value = m[2].trim();
    if (value && /\d/.test(value)) out.push({ label, value });
  }
  return out;
}

export const DynamicNodeBody: React.FC<Props> = ({ node, isDark, compact }) => {
  const muted = isDark ? "text-gray-300" : "text-slate-600";
  const sub = isDark ? "text-gray-400" : "text-slate-500";
  const kind = node.render_kind;
  const d = (node.data && typeof node.data === "object") ? node.data : {};

  try {
    // ── metrics ──
    if (kind === "metrics" && asArray(d.items).length) {
      const items = asArray(d.items).slice(0, compact ? 3 : 6);
      return (
        <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"} gap-1.5`}>
          {items.map((it: any, i: number) => (
            <div key={i} className={`rounded-md border px-2 py-1 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-slate-50 border-slate-200"}`}>
              <div className={`text-[7.5px] font-mono uppercase tracking-wide truncate ${sub}`}>{str(it?.label)}</div>
              <div className={`text-[12px] font-extrabold leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>{str(it?.value)}</div>
            </div>
          ))}
        </div>
      );
    }

    // ── comparison ──
    if (kind === "comparison" && d.left && d.right) {
      const col = (side: any, color: string) => (
        <div className="flex-1 min-w-0">
          <div className={`text-[9px] font-bold truncate ${color}`}>{str(side?.name)}</div>
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {asArray(side?.points).slice(0, compact ? 2 : 4).map((p: any, i: number) => (
              <li key={i} className={`text-[9.5px] leading-snug ${muted} flex gap-1`}><span className="opacity-50">·</span><span className="line-clamp-2">{str(p)}</span></li>
            ))}
          </ul>
        </div>
      );
      return (
        <div>
          <div className="flex items-center gap-1 mb-1 text-[8px] font-mono uppercase tracking-wider text-blue-500"><ArrowLeftRight className="w-2.5 h-2.5" /> comparison</div>
          <div className="flex gap-2 items-start">
            {col(d.left, "text-blue-500")}
            <div className={`w-px self-stretch ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
            {col(d.right, "text-fuchsia-500")}
          </div>
        </div>
      );
    }

    // ── list ──
    if (kind === "list" && asArray(d.items).length) {
      return (
        <ul className="flex flex-col gap-1">
          {asArray(d.items).slice(0, compact ? 3 : 6).map((p: any, i: number) => (
            <li key={i} className={`text-[10px] leading-snug flex gap-1.5 ${muted}`}>
              <span className="text-blue-500 font-bold flex-shrink-0">›</span>
              <span className={compact ? "line-clamp-1" : ""}>{str(p)}</span>
            </li>
          ))}
        </ul>
      );
    }

    // ── quote ──
    if (kind === "quote" && d.quote) {
      return (
        <blockquote className={`border-l-2 border-blue-500/50 pl-2 ${muted}`}>
          <Quote className="w-3 h-3 text-blue-500/60 mb-0.5" />
          <p className={`text-[10.5px] italic leading-snug ${compact ? "line-clamp-3" : ""}`}>"{str(d.quote)}"</p>
          {d.attribution && <span className={`text-[8.5px] font-mono ${sub}`}>— {str(d.attribution)}</span>}
        </blockquote>
      );
    }

    // ── heuristic metrics fallback (un-enriched nodes) ──
    if (!kind) {
      const mets = heuristicMetrics(node.content || "");
      if (mets.length >= 2) {
        return (
          <div>
            <div className="flex items-center gap-1 mb-1 text-[8px] font-mono uppercase tracking-wider text-emerald-500"><Hash className="w-2.5 h-2.5" /> key figures</div>
            <div className="grid grid-cols-2 gap-1.5">
              {mets.slice(0, compact ? 2 : 4).map((it, i) => (
                <div key={i} className={`rounded-md border px-2 py-1 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-slate-50 border-slate-200"}`}>
                  <div className={`text-[7.5px] font-mono uppercase tracking-wide truncate ${sub}`}>{it.label}</div>
                  <div className={`text-[12px] font-extrabold leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>{it.value}</div>
                </div>
              ))}
            </div>
          </div>
        );
      }
    }
  } catch {
    // fall through to plain text on any malformed data
  }

  // ── default text ──
  return <p className={`text-[9.5px] leading-normal ${compact ? "line-clamp-3" : "whitespace-pre-wrap"} ${muted}`}>{str(node.content)}</p>;
};
