import React, { useEffect, useRef, useState, useMemo } from "react";
import { WeaveNode } from "../types.ts";
import { 
  Radar as RadarIcon, 
  ShieldAlert, 
  Activity, 
  Search, 
  Sparkles, 
  Sliders, 
  ChevronRight, 
  ChevronLeft,
  Crosshair,
  ListFilter
} from "lucide-react";

interface SignalRadarProps {
  nodes: WeaveNode[];
  isDark: boolean;
  selectedNodeId: string | null;
  onSelect: (id: string) => void;
}

// Removed hashAngle in favor of dynamic agent sectors

function confColor(c: number): string {
  if (c >= 0.8) return "#22c55e"; // Green
  if (c >= 0.5) return "#f59e0b"; // Orange
  return "#ef4444"; // Red
}

interface RadarBlip {
  id: string;
  x: number;
  y: number;
  node: WeaveNode;
  angle: number;
  rad: number;
}

interface Ripple {
  x: number;
  y: number;
  size: number;
  maxSize: number;
  alpha: number;
  color: string;
}

export const SignalRadar: React.FC<SignalRadarProps> = ({ nodes, isDark, selectedNodeId, onSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  
  const blipsRef = useRef<RadarBlip[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const sweepRef = useRef(0);
  const prevSweepRef = useRef(0);

  // Layout states
  const [showTelemetry, setShowTelemetry] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState(0.0);
  const [hoveredBlip, setHoveredBlip] = useState<RadarBlip | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Filter nodes locally
  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      if (n.confidence < confidenceFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query) || n.source.toLowerCase().includes(query);
      }
      return true;
    });
  }, [nodes, confidenceFilter, searchQuery]);

  // Dynamic Agent Sectors
  const agentSectors = useMemo(() => {
    const agents = Array.from(new Set(nodes.map(n => n.source))).sort() as string[];
    const sectors: Record<string, { start: number; end: number; center: number }> = {};
    if (agents.length === 0) return sectors;
    const slice = (Math.PI * 2) / agents.length;
    agents.forEach((agent: string, i: number) => {
      sectors[agent] = { 
        start: i * slice, 
        end: (i + 1) * slice, 
        center: i * slice + slice / 2 
      };
    });
    return sectors;
  }, [nodes]);

  const getAgentAngle = (node: WeaveNode) => {
    const sector = agentSectors[node.source];
    if (!sector) return 0;
    // Deterministic jitter
    let h = 0;
    for (let i = 0; i < node.id.length; i++) h = (h * 31 + node.id.charCodeAt(i)) % 100;
    const jitter = (h / 100 - 0.5) * (sector.end - sector.start) * 0.8;
    return sector.center + jitter;
  };

  // Canvas drawing & animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      canvas.width = r.width;
      canvas.height = r.height;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const times = nodes.map((n) => new Date(n.created_at).getTime());
    const minT = Math.min(...times, Date.now());
    const maxT = Math.max(...times, Date.now());

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const R = Math.min(W, H) / 2 - 24;

      // Clear with dark/light themes
      ctx.fillStyle = isDark ? "#05070c" : "#f4f6fb";
      ctx.fillRect(0, 0, W, H);

      // Ring Boundaries (Urgency)
      ctx.lineWidth = 1;
      const ringNames = ["CORE: ACTION REQUIRED", "MID: SYNTHESIZED", "OUTER: RAW DATA"];
      const ringColors = [
        isDark ? "rgba(239, 68, 68, 0.25)" : "rgba(239, 68, 68, 0.3)", // Red core
        isDark ? "rgba(56, 189, 248, 0.15)" : "rgba(37, 99, 235, 0.2)", // Blue mid
        isDark ? "rgba(148, 163, 184, 0.1)" : "rgba(148, 163, 184, 0.15)" // Slate outer
      ];

      for (let i = 1; i <= 3; i++) {
        const ringR = (R * i) / 3;
        ctx.strokeStyle = ringColors[i-1];
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();

        if (i === 1) {
          ctx.fillStyle = isDark ? "rgba(239, 68, 68, 0.04)" : "rgba(239, 68, 68, 0.05)";
          ctx.fill();
        }

        // Ring Labels
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)";
        ctx.textAlign = "center";
        ctx.fillText(ringNames[i-1], cx, cy - ringR + 12);
      }

      // Draw Sector Dividers and Agent Names
      ctx.strokeStyle = isDark ? "rgba(56,189,248,0.15)" : "rgba(37,99,235,0.15)";
      Object.entries(agentSectors).forEach(([agent, sector]) => {
        const s = sector as { start: number; end: number; center: number };
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + R * Math.cos(s.start), cy + R * Math.sin(s.start));
        ctx.stroke();

        ctx.font = "bold 10px monospace";
        ctx.fillStyle = isDark ? "rgba(56,189,248,0.5)" : "rgba(37,99,235,0.6)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const labelR = R + 18;
        ctx.fillText(agent.toUpperCase(), cx + labelR * Math.cos(s.center), cy + labelR * Math.sin(s.center));
      });

      // Update Sweep Line
      prevSweepRef.current = sweepRef.current;
      sweepRef.current = (sweepRef.current + 0.01) % (Math.PI * 2);
      const sweep = sweepRef.current;
      const prevSweep = prevSweepRef.current;

      // Draw Sweep gradient slice
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      grad.addColorStop(0, isDark ? "rgba(56,189,248,0.25)" : "rgba(37,99,235,0.18)");
      grad.addColorStop(1, "rgba(56,189,248,0)");
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sweep);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, -0.6, 0);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      // Calculate position of blips in this frame
      const currentBlips: RadarBlip[] = [];
      filteredNodes.forEach((n) => {
        const angle = getAgentAngle(n);
        
        let urgencyRing = 2; // Outer (RAW)
        if (n.flagged_by === "sentinel" || n.type === "action" || n.type === "correction") {
          urgencyRing = 0; // Core (ACTION REQUIRED)
        } else if (n.type === "synthesis" || n.type === "output") {
          urgencyRing = 1; // Mid (SYNTHESIZED)
        }

        const t = new Date(n.created_at).getTime();
        const recency = maxT === minT ? 0.5 : 1 - (t - minT) / (maxT - minT);
        
        const ringInnerRad = (R * urgencyRing) / 3;
        const ringOuterRad = (R * (urgencyRing + 1)) / 3;
        const rad = ringInnerRad + ((1 - recency) * 0.8 + 0.1) * (ringOuterRad - ringInnerRad);
        
        const x = cx + Math.cos(angle) * rad;
        const y = cy + Math.sin(angle) * rad;
        currentBlips.push({ id: n.id, x, y, node: n, angle, rad });

        // Trigger expand sonar ripple when sweep crosses this blip's angle
        let crossed = false;
        if (prevSweep <= sweep) {
          crossed = angle >= prevSweep && angle <= sweep;
        } else {
          crossed = angle >= prevSweep || angle <= sweep;
        }

        if (crossed) {
          ripplesRef.current.push({
            x,
            y,
            size: 6,
            maxSize: 36,
            alpha: 0.8,
            color: confColor(n.confidence)
          });
        }
      });
      blipsRef.current = currentBlips;

      // Draw and Update active Sonar ripples
      ripplesRef.current = ripplesRef.current.filter((r) => {
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.size, 0, Math.PI * 2);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = r.alpha;
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        r.size += 0.6;
        r.alpha -= 0.015;
        return r.alpha > 0;
      });

      // Draw Blips
      currentBlips.forEach((b) => {
        const isSel = selectedNodeId === b.id;
        const isHovered = hoveredBlip?.id === b.id;
        const base = confColor(b.node.confidence);

        // Blip brightness glows stronger when sweep line is near
        let diff = Math.abs(b.angle - sweep);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        const lit = Math.max(0, 1 - diff / 0.65);

        const size = (b.node.type === "synthesis" ? 6 : 4) + lit * 3 + (isSel ? 3 : 0) + (isHovered ? 2 : 0);

        ctx.beginPath();
        ctx.arc(b.x, b.y, size, 0, Math.PI * 2);
        ctx.fillStyle = base;
        ctx.globalAlpha = 0.35 + lit * 0.65;
        ctx.shadowBlur = 6 + lit * 12 + (isSel ? 8 : 0);
        ctx.shadowColor = base;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;

        // Selection pulsing outer ring
        if (isSel) {
          const pulseSpeed = Date.now() * 0.005;
          const outerSize = size + 5 + Math.sin(pulseSpeed) * 2;
          ctx.beginPath();
          ctx.arc(b.x, b.y, outerSize, 0, Math.PI * 2);
          ctx.strokeStyle = base;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Sentinel exception alert ring (flashing red)
        if (b.node.flagged_by === "sentinel") {
          const isFlash = Math.floor(Date.now() / 250) % 2 === 0;
          ctx.beginPath();
          ctx.arc(b.x, b.y, size + 5, 0, Math.PI * 2);
          ctx.strokeStyle = isFlash ? "rgba(239, 68, 68, 0.8)" : "rgba(239, 68, 68, 0.2)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Hover Crosshair indicators
      if (hoveredBlip) {
        ctx.strokeStyle = isDark ? "rgba(56,189,248,0.25)" : "rgba(37,99,235,0.25)";
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        // Draw line from center to hovered blip
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(hoveredBlip.x, hoveredBlip.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Center Core Ping
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? "#38bdf8" : "#2563eb";
      ctx.shadowBlur = 14;
      ctx.shadowColor = isDark ? "#38bdf8" : "#2563eb";
      ctx.fill();
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [filteredNodes, isDark, selectedNodeId, hoveredBlip]);

  // Click handler to select blip
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let best: RadarBlip | null = null;
    let minDist = 18;
    blipsRef.current.forEach((b) => {
      const d = Math.hypot(b.x - x, b.y - y);
      if (d < minDist) {
        minDist = d;
        best = b;
      }
    });

    if (best) {
      onSelect((best as RadarBlip).id);
    }
  };

  // Mouse move handler for coordinates tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    let found: RadarBlip | null = null;
    let minDist = 18;
    blipsRef.current.forEach((b) => {
      const d = Math.hypot(b.x - x, b.y - y);
      if (d < minDist) {
        minDist = d;
        found = b;
      }
    });
    setHoveredBlip(found);
  };

  const handleMouseLeave = () => {
    setHoveredBlip(null);
    setMousePos(null);
  };

  // Telemetry metrics
  const stats = useMemo(() => {
    const total = filteredNodes.length;
    const avgConf = total > 0 
      ? filteredNodes.reduce((acc, n) => acc + n.confidence, 0) / total 
      : 0;
    const anomalies = filteredNodes.filter(n => n.flagged_by === "sentinel").length;
    return { total, avgConf, anomalies };
  }, [filteredNodes]);

  const getUrgencyName = (node: WeaveNode) => {
    if (node.flagged_by === "sentinel" || node.type === "action" || node.type === "correction") return "CORE: ACTION REQ";
    if (node.type === "synthesis" || node.type === "output") return "MID: SYNTHESIZED";
    return "OUTER: RAW DATA";
  };

  const themeClasses = {
    hudBg: isDark ? "bg-[#0b0e14]/90 border-white/5 text-gray-200" : "bg-white/90 border-slate-200 text-slate-800",
    textMute: isDark ? "text-gray-400" : "text-slate-500",
    textBold: isDark ? "text-white" : "text-slate-900",
    btnHover: isDark ? "hover:bg-white/10" : "hover:bg-slate-100",
    panelBg: isDark ? "bg-[#0b0e14]/95 border-l border-white/5" : "bg-white/95 border-l border-slate-200"
  };

  return (
    <div className="flex-1 overflow-hidden flex">
      {/* Canvas Radar Grid Container */}
      <div ref={wrapRef} className="flex-1 relative flex flex-col min-w-0">
        
        {/* Radar Title Bar */}
        <div className={`px-5 py-3 border-b flex items-center justify-between select-none ${isDark ? "border-white/5" : "border-slate-200"}`}>
          <div>
            <h2 className={`text-base font-bold flex items-center gap-2 font-display ${themeClasses.textBold}`}>
              <RadarIcon className="w-4 h-4 text-indigo-400 animate-pulse" />
              Intelligence Signal Radar
            </h2>
            <p className={`text-[10px] ${themeClasses.textMute}`}>
              Distance: Urgency Level (Core=Action Required) · Angle: Agent Source Sector.
            </p>
          </div>
          <div className="flex items-center gap-3 select-none">
            {/* active filter chips */}
            {(searchQuery || confidenceFilter > 0) && (
              <div className="flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    title="Clear search filter"
                    className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full border border-indigo-500/40 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                  >
                    “{searchQuery.slice(0, 14)}{searchQuery.length > 14 ? "…" : ""}” ✕
                  </button>
                )}
                {confidenceFilter > 0 && (
                  <button
                    onClick={() => setConfidenceFilter(0)}
                    title="Clear confidence threshold"
                    className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  >
                    ≥{Math.round(confidenceFilter * 100)}% CF ✕
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 font-mono text-[9px]">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className={themeClasses.textMute}>Telemetry Feed Active</span>
            </div>
          </div>
        </div>

        {(
          <div className="flex-1 relative min-h-0 min-w-0">
            <canvas
              ref={canvasRef}
              onClick={handleClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="w-full h-full block cursor-crosshair"
            />

            {/* Educational empty state over the live sweep */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6 pointer-events-none">
                <p className={`text-sm font-bold font-display ${themeClasses.textBold}`}>No signals on radar yet</p>
                <p className={`text-[11px] max-w-xs leading-relaxed ${themeClasses.textMute}`}>
                  Your swarm is gathering intelligence. Discovered signals appear as blips: angle = which agent found it, distance = how urgently it needs you.
                </p>
              </div>
            )}

            {/* Color legend */}
            <div className={`absolute top-3 right-3 z-10 px-3 py-2 rounded-lg border text-[9px] font-mono backdrop-blur pointer-events-none flex flex-col gap-1 ${themeClasses.hudBg}`}>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} /> ≥80% verified</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#f59e0b" }} /> 50–79% unsettled</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} /> &lt;50% / drift</span>
              <span className={`flex items-center gap-1.5 ${themeClasses.textMute}`}><span className="w-2.5 h-2.5 rounded-full border border-current" /> large = synthesis</span>
            </div>

            {/* Float Coordinates HUD (Bottom Left) */}
            {mousePos && (
              <div className={`absolute bottom-3 left-3 z-10 px-3 py-1.5 rounded-lg text-[9.5px] font-mono border backdrop-blur pointer-events-none flex gap-4 ${themeClasses.hudBg}`}>
                <div>
                  <span className={themeClasses.textMute}>Cursor Heading: </span>
                  <span className="font-bold text-blue-500">
                    {Math.round((Math.atan2(mousePos.y - canvasRef.current!.height / 2, mousePos.x - canvasRef.current!.width / 2) * 180) / Math.PI + 180)}°
                  </span>
                </div>
                <div>
                  <span className={themeClasses.textMute}>Range: </span>
                  <span className="font-bold text-blue-500">
                    {Math.round(Math.hypot(mousePos.x - canvasRef.current!.width / 2, mousePos.y - canvasRef.current!.height / 2))}m
                  </span>
                </div>
              </div>
            )}

            {/* Hover Tooltip HUD (Follows cursor) */}
            {hoveredBlip && mousePos && (
              <div 
                className={`absolute z-30 p-3 rounded-lg border backdrop-blur-md shadow-2xl font-mono text-[10px] w-64 pointer-events-none flex flex-col gap-1.5 ${themeClasses.hudBg}`}
                style={{
                  left: `${mousePos.x + 15}px`,
                  top: `${mousePos.y + 15}px`
                }}
              >
                <div className="flex justify-between items-center border-b pb-1 border-white/10">
                  <span className="font-extrabold text-blue-500 truncate max-w-[130px]">{hoveredBlip.node.title}</span>
                  <span 
                    className="px-1 text-[8px] border rounded font-bold uppercase"
                    style={{
                      borderColor: confColor(hoveredBlip.node.confidence),
                      color: confColor(hoveredBlip.node.confidence)
                    }}
                  >
                    {Math.round(hoveredBlip.node.confidence * 100)}% CF
                  </span>
                </div>
                
                <p className="line-clamp-3 text-slate-400 leading-normal text-[9.5px]">
                  {hoveredBlip.node.content}
                </p>

                <div className="flex justify-between text-[8px] border-t pt-1.5 border-white/5 opacity-75">
                  <span>Ring: {getUrgencyName(hoveredBlip.node)}</span>
                  <span>Agent: {hoveredBlip.node.source}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collapsible Telemetry Panel (Right Side) */}
      {nodes.length > 0 && (
        <div className={`w-[290px] h-full flex flex-col z-20 transition-all duration-300 relative select-none ${themeClasses.panelBg} ${showTelemetry ? "translate-x-0 border-l" : "absolute right-0 translate-x-full border-none"}`}>
          
          {/* Collapse Handle */}
          <button
            onClick={() => setShowTelemetry(!showTelemetry)}
            className={`absolute top-[48%] -left-6 z-30 p-1 px-1.5 rounded-l-md border border-r-0 backdrop-blur shadow-lg ${themeClasses.hudBg}`}
          >
            {showTelemetry ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>

          {/* Telemetry Panel Dashboard */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
            
            {/* HUD Header */}
            <div className="border-b pb-2 border-slate-200/50 dark:border-white/5 flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-500" />
                Telemetry HUD Console
              </span>
              <span className="text-[8px] font-mono opacity-60">sys status</span>
            </div>

            {/* Quick Metrics */}
            <div className={`p-2.5 rounded-lg border text-[10px] font-mono flex flex-col gap-1.5 ${isDark ? "bg-black/35 border-white/5" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex justify-between">
                <span className={themeClasses.textMute}>Active Signals:</span>
                <span className="font-bold">{stats.total} / {nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className={themeClasses.textMute}>Grid Density:</span>
                <span className="font-bold text-blue-400">{(stats.total / (nodes.length || 1) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className={themeClasses.textMute}>Avg Integrity (CF):</span>
                <span className="font-bold text-emerald-500">{Math.round(stats.avgConf * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className={themeClasses.textMute}>Radar Anomalies:</span>
                <span className={`font-bold ${stats.anomalies > 0 ? "text-red-500 animate-pulse" : "text-gray-400"}`}>
                  {stats.anomalies}
                </span>
              </div>
            </div>

            {/* Telemetry Filters Section */}
            <div className="flex flex-col gap-2.5 border-t border-b py-3 border-slate-200/50 dark:border-white/5">
              <span className="text-[9px] font-mono uppercase tracking-wider font-bold flex items-center gap-1">
                <ListFilter className="w-3.5 h-3.5" />
                Signal Scope Filter
              </span>

              {/* Text Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search signal titles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full text-[10px] font-mono pl-7 pr-3 py-1.5 rounded border outline-none ${
                    isDark 
                      ? "bg-black/40 border-white/5 text-gray-200 focus:border-blue-500" 
                      : "bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                  }`}
                />
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-500" />
              </div>

              {/* Integrity Cutoff */}
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex justify-between text-[9px] font-mono">
                  <span className={themeClasses.textMute}>Integrity Threshold:</span>
                  <span className="font-bold">{Math.round(confidenceFilter * 100)}% CF</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.9"
                  step="0.1"
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Sentinel Drifts alerts alerts stream */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-mono uppercase tracking-wider font-bold flex items-center gap-1 text-red-500">
                <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                Sentinel Drift Detections
              </span>
              
              <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto">
                {filteredNodes.filter(n => n.flagged_by === "sentinel").length === 0 ? (
                  <div className="flex items-center gap-1.5 bg-emerald-500/5 border border-emerald-500/20 px-2.5 py-2 rounded-lg text-[9px] text-emerald-500 font-mono">
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    <span>Scan integrity stable. No drifts.</span>
                  </div>
                ) : (
                  filteredNodes
                    .filter(n => n.flagged_by === "sentinel")
                    .map(node => (
                      <div
                        key={node.id}
                        onClick={() => onSelect(node.id)}
                        className={`p-2 border border-red-500/20 bg-red-500/5 rounded-lg text-[9px] font-mono cursor-pointer transition-all hover:bg-red-500/10 flex flex-col gap-0.5 ${
                          selectedNodeId === node.id ? "ring-1 ring-red-500 bg-red-500/10" : ""
                        }`}
                      >
                        <div className="flex justify-between font-bold text-red-400">
                          <span className="truncate max-w-[150px]">{node.title}</span>
                          <span>{Math.round(node.confidence * 100)}% CF</span>
                        </div>
                        <span className="text-[8px] text-gray-500 italic">Agent: {node.source}</span>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Recent Signal Sweeps list */}
            <div className="flex flex-col gap-2 border-t pt-3 border-white/10 mt-auto">
              <span className="text-[9px] font-mono uppercase tracking-wider font-bold flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                Chronological Signal Log
              </span>

              <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto">
                {filteredNodes.length === 0 ? (
                  <span className="text-[9px] font-mono opacity-50 italic text-center py-4">No signals matching filters.</span>
                ) : (
                  filteredNodes
                    .slice()
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 5)
                    .map(node => {
                      const ageSec = Math.round((Date.now() - new Date(node.created_at).getTime()) / 1000);
                      const displayAge = ageSec < 60 ? `${ageSec}s ago` : `${Math.round(ageSec / 60)}m ago`;
                      return (
                        <div
                          key={node.id}
                          onClick={() => onSelect(node.id)}
                          className={`p-2 rounded-lg border text-[9px] font-mono cursor-pointer transition-all ${
                            selectedNodeId === node.id 
                              ? "border-blue-500 bg-blue-500/5" 
                              : isDark ? "bg-black/20 border-white/5 hover:bg-black/45" : "bg-slate-50/50 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex justify-between items-center font-bold">
                            <span className="truncate max-w-[140px]">{node.title}</span>
                            <span className="text-[7.5px] opacity-60 font-normal">{displayAge}</span>
                          </div>
                          <div className="flex justify-between text-[8px] opacity-75 mt-0.5">
                            <span className="capitalize">{node.type.replace("-", " ")}</span>
                            <span style={{ color: confColor(node.confidence) }}>{Math.round(node.confidence * 100)}%</span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
