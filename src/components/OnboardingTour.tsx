import React, { useEffect, useLayoutEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, ArrowLeft, X, Sparkles } from "lucide-react";

export interface TourStep {
  target: string;        // CSS selector ([data-tour="..."])
  title: string;
  body: string;
}

interface OnboardingTourProps {
  isDark: boolean;
  steps: TourStep[];
  onFinish: () => void;
}

// Spotlight walkthrough with zero dependencies: a fixed overlay punches a hole
// over the target via a giant box-shadow, and a tooltip docks beside it.
export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isDark, steps, onFinish }) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = steps[index];

  const measure = () => {
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    setRect(el.getBoundingClientRect());
  };

  useLayoutEffect(() => {
    measure();
    const t = setTimeout(measure, 120); // after panel transitions settle
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onFinish(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("resize", measure); window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const pad = 8;
  const spot = rect
    ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  // Tooltip placement: below target if room, else above; clamp horizontally.
  const tipW = 320;
  let tipStyle: React.CSSProperties = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  if (spot) {
    const below = spot.top + spot.height + 16;
    const fitsBelow = below + 170 < window.innerHeight;
    const left = Math.min(Math.max(12, spot.left + spot.width / 2 - tipW / 2), window.innerWidth - tipW - 12);
    tipStyle = fitsBelow
      ? { left, top: below }
      : { left, top: Math.max(12, spot.top - 186) };
  }

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-label="Product tour">
      {/* spotlight hole */}
      {spot ? (
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          className="absolute rounded-xl pointer-events-none ring-2 ring-indigo-400/80"
          style={{
            ...spot,
            boxShadow: "0 0 0 9999px rgba(2,4,10,0.72)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(2,4,10,0.72)]" />
      )}

      {/* tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={`absolute w-[320px] rounded-2xl border shadow-2xl p-4 flex flex-col gap-2.5 noise ${
            isDark ? "bg-[#101427] border-white/10" : "bg-white border-slate-200"
          }`}
          style={tipStyle}
        >
          <div className="relative z-10 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              {index + 1} / {steps.length}
            </span>
            <button onClick={onFinish} className={`p-1 rounded-md ${isDark ? "text-gray-500 hover:text-white hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`} title="Skip tour">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <h3 className={`relative z-10 text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>{step.title}</h3>
          <p className={`relative z-10 text-xs leading-relaxed ${isDark ? "text-[#b9bdd4]" : "text-slate-600"}`}>{step.body}</p>

          <div className="relative z-10 flex items-center justify-between pt-1">
            {/* progress dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-indigo-400" : "w-1.5 " + (isDark ? "bg-white/15" : "bg-slate-300")}`} />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {index > 0 && (
                <button
                  onClick={() => setIndex(index - 1)}
                  className={`p-1.5 rounded-lg border transition-colors ${isDark ? "border-white/10 text-gray-400 hover:text-white" : "border-slate-200 text-slate-500 hover:text-slate-800"}`}
                  title="Previous step"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => (index === steps.length - 1 ? onFinish() : setIndex(index + 1))}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-lg press"
              >
                {index === steps.length - 1 ? "Start exploring" : "Next"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
