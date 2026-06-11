import React, { FormEvent } from "react";
import { Mic, MicOff, Send, Loader2, Sparkles, Bot, ChevronRight } from "lucide-react";

interface CommandConsoleProps {
  isDark: boolean;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  isListening: boolean;
  onVoice: () => void;
  persona: string;
  setPersona: (p: string) => void;
  personas: string[];
  // Optional quick-start prompt suggestions
  suggestions?: string[];
}

// The hero interaction surface: large type/voice command bar where the user
// states an intelligence mission in natural language and dispatches the swarm.
export const CommandConsole: React.FC<CommandConsoleProps> = ({
  isDark,
  value,
  onChange,
  onSubmit,
  isSubmitting,
  isListening,
  onVoice,
  persona,
  setPersona,
  personas,
  suggestions = [],
}) => {
  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-5">
      {/* badge */}
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-indigo-400 uppercase font-semibold bg-indigo-500/10 px-3 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5" />
          Define an Intelligence Mission
        </span>
        <h2 className={`text-2xl md:text-4xl font-bold tracking-tight font-display ${isDark ? "text-white" : "text-slate-900"}`}>
          What should the swarm investigate?
        </h2>
        <p className={`text-sm max-w-xl ${isDark ? "text-gray-400" : "text-slate-500"}`}>
          Speak or type a goal in plain language. The agent swarm senses the web, weaves a verified
          memory graph, and proposes your next moves.
        </p>
      </div>

      {/* the command bar */}
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div
          className={`relative rounded-2xl border-2 transition-all shadow-2xl ${
            isListening
              ? "border-rose-500/60 shadow-rose-500/10"
              : value.trim()
              ? "border-indigo-500/60 shadow-indigo-500/10"
              : isDark
              ? "border-white/10 shadow-black/40"
              : "border-slate-200 shadow-slate-200/60"
          } ${isDark ? "bg-[#0b0e1c]" : "bg-white"}`}
        >
          {/* animated glow ring while listening */}
          {isListening && (
            <span className="absolute -inset-0.5 rounded-2xl bg-rose-500/20 blur animate-pulse pointer-events-none" />
          )}

          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e as unknown as FormEvent);
              }
            }}
            placeholder="e.g. Track how Razorpay, Cashfree and PayU are shifting enterprise pricing and AI features…"
            rows={2}
            className={`relative w-full bg-transparent resize-none px-5 pt-4 pb-2 text-[15px] leading-relaxed focus:outline-none font-sans ${
              isDark ? "text-white placeholder-gray-500" : "text-slate-800 placeholder-slate-400"
            }`}
          />

          {/* bottom control row */}
          <div className="relative flex items-center justify-between gap-3 px-3 pb-3 pt-1">
            <div className="flex items-center gap-2">
              {/* persona selector */}
              <div
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${
                  isDark ? "bg-[#12152a] border-white/10" : "bg-slate-50 border-slate-200"
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                <select
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${
                    isDark ? "text-gray-200" : "text-slate-700"
                  }`}
                >
                  {personas.map((p) => (
                    <option key={p} value={p} className={isDark ? "bg-[#12152a] text-white" : "bg-white text-slate-800"}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* voice with live waveform */}
              <button
                type="button"
                onClick={onVoice}
                title={isListening ? "Stop listening" : "Speak your mission"}
                className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  isListening
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/40"
                    : isDark
                    ? "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10"
                    : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span className="flex items-center gap-[2px] h-4" aria-hidden>
                      {[0, 1, 2, 3, 4].map(i => (
                        <span
                          key={i}
                          className="wave-bar w-[2.5px] h-full rounded-full bg-rose-400"
                          style={{ animationDelay: `${i * 0.12}s` }}
                        />
                      ))}
                    </span>
                    <span className="hidden sm:inline">Listening…</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span className="hidden sm:inline">Voice</span>
                  </>
                )}
              </button>

              {/* deploy */}
              <button
                type="submit"
                disabled={isSubmitting || !value.trim()}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2 rounded-lg transition-all shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Deploy Swarm
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* quick suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className={`text-[10px] font-mono uppercase tracking-wider ${isDark ? "text-gray-500" : "text-slate-400"}`}>
            Try:
          </span>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(s)}
              className={`group flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                isDark
                  ? "bg-white/[0.03] border-white/10 text-gray-300 hover:border-indigo-500/40 hover:text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-slate-900"
              }`}
            >
              {s.length > 52 ? s.slice(0, 52) + "…" : s}
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
