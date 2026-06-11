import React, { useEffect, useRef, useState } from "react";
import { ChatTurn, WeaveNode } from "../types.ts";
import { MessageSquare, X, Send, Loader2, Sparkles, FlaskConical, CornerDownLeft } from "lucide-react";

interface FabricChatProps {
  isDark: boolean;
  messages: ChatTurn[];
  nodes: WeaveNode[];
  loading: boolean;
  chatCost: number;
  onAsk: (q: string) => void;
  onCiteClick: (nodeId: string) => void;
  onDeepDive: (seed: string) => void;
  onClose: () => void;
}

const SUGGESTIONS = [
  "What's the biggest risk here?",
  "Summarize the key contradiction.",
  "What should I do next?",
];

export const FabricChat: React.FC<FabricChatProps> = ({
  isDark, messages, nodes, loading, chatCost, onAsk, onCiteClick, onDeepDive, onClose,
}) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const submit = () => {
    const q = input.trim();
    if (!q || loading) return;
    onAsk(q);
    setInput("");
  };

  const lastUserQ = [...messages].reverse().find(m => m.role === "user")?.content || "";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* header */}
      <div className={`p-4 border-b flex justify-between items-center flex-shrink-0 ${isDark ? "bg-black/25 border-white/5" : "bg-slate-50 border-slate-200"}`}>
        <div className="flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            Ask the Fabric
          </h3>
          <span className={`text-[10px] font-mono ${isDark ? "text-gray-500" : "text-slate-400"}`}>
            grounded in this mission's {nodes.length} nodes · {chatCost} cr / question
          </span>
        </div>
        <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? "text-gray-400 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center gap-3 text-center mt-6 px-2">
            <div className="w-11 h-11 rounded-2xl bg-violet-500/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-500" />
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              Ask anything about this mission. Answers are grounded in the woven evidence, with clickable citations.
            </p>
            <div className="flex flex-col gap-1.5 w-full mt-1">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onAsk(s)}
                  className={`text-[11px] text-left px-3 py-2 rounded-lg border transition-all ${
                    isDark ? "bg-white/[0.03] border-white/10 text-gray-300 hover:border-violet-500/40" : "bg-white border-slate-200 text-slate-600 hover:border-violet-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col gap-1 ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-violet-600 text-white rounded-br-sm"
                : isDark ? "bg-[#141a26] text-gray-200 rounded-bl-sm border border-white/5" : "bg-slate-100 text-slate-800 rounded-bl-sm"
            }`}>
              {m.content}
            </div>

            {/* citations */}
            {m.role === "assistant" && m.citations && m.citations.length > 0 && (
              <div className="flex flex-wrap gap-1 max-w-[88%]">
                {m.citations.map((cid) => {
                  const n = nodes.find(x => x.id === cid);
                  return (
                    <button
                      key={cid}
                      onClick={() => onCiteClick(cid)}
                      title={n?.title || cid}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all ${
                        isDark ? "bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20" : "bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100"
                      }`}
                    >
                      ↗ {n ? n.title.slice(0, 22) : cid.split("-").pop()}
                    </button>
                  );
                })}
              </div>
            )}

            {/* deep-dive from an assistant answer */}
            {m.role === "assistant" && (
              <button
                onClick={() => onDeepDive(lastUserQ || m.content.slice(0, 80))}
                className={`flex items-center gap-1 text-[9.5px] font-mono px-2 py-0.5 rounded transition-all ${
                  isDark ? "text-fuchsia-400 hover:bg-fuchsia-500/10" : "text-fuchsia-600 hover:bg-fuchsia-50"
                }`}
              >
                <FlaskConical className="w-3 h-3" />
                Deep-dive this as a child mission
              </button>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
            Reasoning over the fabric…
          </div>
        )}
      </div>

      {/* input */}
      <div className={`p-3 border-t ${isDark ? "border-white/5 bg-black/20" : "border-slate-200 bg-slate-50"}`}>
        <div className={`flex items-end gap-2 rounded-xl border px-3 py-2 ${isDark ? "bg-[#0b0e1c] border-white/10" : "bg-white border-slate-200"}`}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            rows={1}
            placeholder="Ask about this mission…"
            className={`flex-1 bg-transparent resize-none text-[13px] focus:outline-none max-h-24 ${isDark ? "text-white placeholder-gray-500" : "text-slate-800 placeholder-slate-400"}`}
          />
          <button
            onClick={submit}
            disabled={loading || !input.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white p-1.5 rounded-lg flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center gap-1 mt-1 px-1 text-[8.5px] font-mono text-slate-400">
          <CornerDownLeft className="w-2.5 h-2.5" /> to send · Shift+Enter for newline
        </div>
      </div>
    </div>
  );
};
