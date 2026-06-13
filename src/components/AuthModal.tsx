import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Profile } from "../types.ts";
import { X, Leaf, User, Lock, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck } from "lucide-react";

interface Props {
  isDark: boolean;
  initialMode?: "login" | "signup";
  /** Optional context line, e.g. "Sign in to deploy this swarm." */
  reason?: string;
  onClose: () => void;
  onAuthed: (profile: Profile) => void;
}

export const AuthModal: React.FC<Props> = ({ isDark, initialMode = "signup", reason, onClose, onAuthed }) => {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [handle, setHandle] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const submit = async () => {
    setError(null);
    if (handle.trim().length < 3) return setError("Handle must be at least 3 characters.");
    if (pass.length < 6) return setError("Passphrase must be at least 6 characters.");
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ handle: handle.trim(), passphrase: pass }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onAuthed(data as Profile);
      } else {
        setError(data.error || "Something went wrong. Try again.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const inputWrap = `flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors focus-within:border-violet-500 ${
    isDark ? "bg-black/30 border-white/10" : "bg-white border-violet-500/15"
  }`;
  const inputCls = `flex-1 bg-transparent text-sm focus:outline-none ${isDark ? "text-white placeholder-white/35" : "text-slate-800 placeholder-slate-400"}`;
  const muted = isDark ? "text-white/55" : "text-slate-500";

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(4,4,14,0.66)", backdropFilter: "blur(8px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div className={`relative w-full max-w-md rounded-[2rem] border glass-strong shadow-2xl overflow-hidden animate-fadeInUp ${isDark ? "border-white/10" : "border-violet-500/15"}`}>
        {/* glow header */}
        <div className="absolute -top-16 -right-10 w-48 h-48 bg-luna-gradient opacity-20 blur-3xl pointer-events-none" />
        <button onClick={() => !busy && onClose()} className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors z-10 ${isDark ? "hover:bg-white/10 text-white/60" : "hover:bg-slate-100 text-slate-500"}`}>
          <X className="w-4 h-4" />
        </button>

        <div className="relative px-7 pt-7 pb-6 flex flex-col gap-5">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-luna-gradient flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <h2 className={`text-xl font-bold font-display ${isDark ? "text-white" : "text-slate-900"}`}>
              {mode === "signup" ? "Create your Green account" : "Welcome back"}
            </h2>
            <p className={`text-[12px] leading-relaxed max-w-[300px] ${muted}`}>
              {reason || (mode === "signup"
                ? "Bank Green Credits by cutting real emissions, then spend them as you run the agent swarm."
                : "Sign in to your wallet and pick up your missions where you left off.")}
            </p>
          </div>

          {/* mode toggle */}
          <div className={`flex p-1 rounded-full border text-xs font-bold ${isDark ? "bg-white/[0.03] border-white/10" : "bg-violet-500/[0.04] border-violet-500/10"}`}>
            {(["signup", "login"] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-2 rounded-full transition-all ${mode === m ? "bg-luna-gradient text-white shadow" : muted}`}
              >
                {m === "signup" ? "Create account" : "Sign in"}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <div className={inputWrap}>
              <User className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <input
                value={handle}
                onChange={e => setHandle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submit(); }}
                autoFocus
                placeholder="handle (e.g. ashfaque)"
                autoCapitalize="off" autoCorrect="off" spellCheck={false}
                className={inputCls}
              />
            </div>
            <div className={inputWrap}>
              <Lock className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <input
                value={pass}
                onChange={e => setPass(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submit(); }}
                type={show ? "text" : "password"}
                placeholder={mode === "signup" ? "create a passphrase (6+ chars)" : "passphrase"}
                className={inputCls}
              />
              <button onClick={() => setShow(s => !s)} className={`p-0.5 ${muted} hover:text-violet-400 transition-colors`}>
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-[12px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{error}</div>
          )}

          <button
            onClick={submit}
            disabled={busy}
            className="bg-luna-gradient cta-luna text-white text-sm font-bold py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
              {mode === "signup" ? "Create account & get 120 credits" : "Sign in"}
              <ArrowRight className="w-4 h-4" />
            </>}
          </button>

          <p className={`text-[10px] flex items-center justify-center gap-1.5 ${muted}`}>
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            Passphrase hashed with scrypt · session in an httpOnly cookie
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
