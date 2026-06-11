import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import { WeaveNode, WeaveEdge } from "../types.ts";
import { Boxes, Pause, Play, Crosshair, ShieldAlert } from "lucide-react";

interface Constellation3DProps {
  nodes: WeaveNode[];
  edges: WeaveEdge[];
  isDark: boolean;
  selectedNodeId: string | null;
  onSelect: (id: string) => void;
}

// One confidence/identity color, identical meaning to every other lens.
function nodeColor(n: WeaveNode): string {
  if (n.type === "correction") return "#34d399";
  if (n.flagged_by === "sentinel") return "#fb7185";
  if (n.type === "synthesis") return "#818cf8";
  if (n.confidence >= 0.8) return "#34d399";
  if (n.confidence >= 0.5) return "#fbbf24";
  return "#fb7185";
}

const LEGEND = [
  { c: "#34d399", label: "Verified ≥80%" },
  { c: "#fbbf24", label: "Review 50–79%" },
  { c: "#fb7185", label: "Low / drift" },
  { c: "#818cf8", label: "Synthesis" },
];

// A deliberately calm 3D constellation: same fabric as the 2D board, given
// depth. Auto-orbits, glides to a node on click, and keeps controls to the two
// that matter (pause the orbit, recenter). No overloaded HUD.
export const Constellation3D: React.FC<Constellation3DProps> = ({ nodes, edges, isDark, selectedNodeId, onSelect }) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<any>(null);
  const [dims, setDims] = useState({ w: 600, h: 400 });
  const [spinning, setSpinning] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    const measure = () => {
      if (wrapRef.current) {
        const r = wrapRef.current.getBoundingClientRect();
        setDims({ w: r.width, h: r.height });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const ids = new Set(nodes.map((n) => n.id));
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        label: `${n.title.slice(0, 32)}${n.title.length > 32 ? "…" : ""} · ${Math.round(n.confidence * 100)}%`,
        val: n.type === "synthesis" ? 9 : n.type === "correction" ? 7 : 5,
        color: nodeColor(n),
        ref: n,
      })),
      links: edges
        .filter((e) => ids.has(e.source) && ids.has(e.target))
        .map((e) => ({
          source: e.source,
          target: e.target,
          relation: e.relation,
          color: e.relation === "contradicts" ? "#fb7185" : e.relation === "correction-applied" ? "#34d399" : isDark ? "#4f6bd8" : "#6366f1",
        })),
    };
  }, [nodes, edges, isDark]);

  // Neighborhood highlight set for hover/selection.
  const active = hoverId || selectedNodeId;
  const highlight = useMemo(() => {
    const set = new Set<string>();
    if (active) {
      set.add(active);
      edges.forEach((e) => {
        if (e.source === active) set.add(e.target as string);
        if (e.target === active) set.add(e.source as string);
      });
    }
    return set;
  }, [active, edges]);

  // Drive auto-orbit through the underlying three controls.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const controls = fg.controls?.();
    if (controls) {
      controls.autoRotate = spinning;
      controls.autoRotateSpeed = 0.7;
    }
  }, [spinning, graphData, dims]);

  const glideTo = (id: string) => {
    onSelect(id);
    const fg = fgRef.current;
    if (!fg) return;
    const gn = fg.getGraphData().nodes.find((n: any) => n.id === id);
    if (gn) {
      const dist = 130;
      const ratio = 1 + dist / Math.hypot(gn.x || 1, gn.y || 1, gn.z || 1);
      fg.cameraPosition({ x: (gn.x || 0) * ratio, y: (gn.y || 0) * ratio, z: (gn.z || 0) * ratio }, gn, 1200);
    }
  };

  const recenter = () => {
    fgRef.current?.cameraPosition({ x: 0, y: 0, z: 320 }, { x: 0, y: 0, z: 0 }, 1200);
  };

  // Glowing sphere with a soft halo; a wireframe cage marks Sentinel drift.
  const buildNode = (gn: any) => {
    const group = new THREE.Group();
    const isActive = highlight.size === 0 || highlight.has(gn.id);
    const isSel = selectedNodeId === gn.id;
    const r = Math.sqrt(gn.val) * 1.6;

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(r, 20, 20),
      new THREE.MeshBasicMaterial({ color: gn.color, transparent: true, opacity: isActive ? 1 : 0.18 })
    );
    group.add(core);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(r * 1.9, 16, 16),
      new THREE.MeshBasicMaterial({ color: gn.color, transparent: true, opacity: isActive ? (isSel ? 0.28 : 0.14) : 0.04 })
    );
    group.add(halo);

    if (gn.ref.flagged_by === "sentinel") {
      const cage = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(r * 3, r * 3, r * 3)),
        new THREE.LineBasicMaterial({ color: "#fb7185", transparent: true, opacity: isActive ? 0.9 : 0.15 })
      );
      group.add(cage);
    }
    if (isSel) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r * 2.2, r * 2.5, 32),
        new THREE.MeshBasicMaterial({ color: isDark ? "#a5b4fc" : "#6366f1", side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
      );
      ring.lookAt(new THREE.Vector3(0, 0, 1));
      group.add(ring);
    }
    return group;
  };

  const driftCount = nodes.filter((n) => n.flagged_by === "sentinel").length;

  if (nodes.length === 0) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <div className="w-14 h-14 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center float-y holo-ring">
          <Boxes className="w-7 h-7 text-indigo-400" />
        </div>
        <h3 className={`text-base font-bold font-display ${isDark ? "text-white" : "text-slate-900"}`}>The constellation is empty</h3>
        <p className={`text-xs max-w-sm leading-relaxed ${isDark ? "text-[#8b93a7]" : "text-slate-500"}`}>
          Deploy a mission and each finding becomes a star here — depth and proximity show how the swarm clustered the evidence.
        </p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="flex-1 relative overflow-hidden">
      <ForceGraph3D
        ref={fgRef}
        width={dims.w}
        height={dims.h}
        graphData={graphData as any}
        backgroundColor={isDark ? "#05070c" : "#eef1f8"}
        nodeThreeObject={buildNode}
        nodeLabel={(n: any) => (active ? "" : `<div style="font:600 11px Inter,sans-serif;color:#fff;background:rgba(10,14,23,.92);padding:4px 8px;border-radius:6px;border:1px solid rgba(129,140,248,.4)">${n.label}</div>`)}
        linkColor={(l: any) => {
          const s = typeof l.source === "object" ? l.source.id : l.source;
          const t = typeof l.target === "object" ? l.target.id : l.target;
          if (highlight.size > 0 && !(highlight.has(s) && highlight.has(t))) return isDark ? "rgba(79,107,216,0.06)" : "rgba(99,102,241,0.08)";
          return l.color;
        }}
        linkWidth={(l: any) => (l.relation === "contradicts" ? 1.6 : 0.8)}
        linkDirectionalParticles={(l: any) => {
          const s = typeof l.source === "object" ? l.source.id : l.source;
          const t = typeof l.target === "object" ? l.target.id : l.target;
          if (highlight.size > 0 && !(highlight.has(s) && highlight.has(t))) return 0;
          return l.relation === "contradicts" ? 0 : 2;
        }}
        linkDirectionalParticleWidth={1.6}
        linkDirectionalParticleSpeed={0.006}
        linkOpacity={isDark ? 0.35 : 0.5}
        enableNodeDrag={false}
        onNodeClick={(n: any) => glideTo(n.id)}
        onNodeHover={(n: any) => setHoverId(n ? n.id : null)}
        onBackgroundClick={() => setSpinning((s) => s)}
      />

      {/* title chip */}
      <div className={`absolute top-4 left-4 z-10 px-3 py-2 rounded-xl glass border shadow-lg pointer-events-none ${isDark ? "border-white/10" : "border-slate-200"}`}>
        <div className="flex items-center gap-1.5">
          <Boxes className="w-4 h-4 text-indigo-400" />
          <span className={`text-[12px] font-bold font-display tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>3D Constellation</span>
        </div>
        <p className={`text-[10px] mt-0.5 ${isDark ? "text-[#8b93a7]" : "text-slate-500"}`}>Drag to orbit · scroll to zoom · click a star to inspect</p>
      </div>

      {/* minimal controls */}
      <div className={`absolute top-4 right-4 z-10 flex items-center gap-1 p-1 rounded-xl glass border shadow-lg ${isDark ? "border-white/10" : "border-slate-200"}`}>
        <button
          onClick={() => setSpinning((s) => !s)}
          className={`p-1.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-colors ${isDark ? "text-gray-300 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"}`}
          title={spinning ? "Pause orbit" : "Resume orbit"}
        >
          {spinning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={recenter}
          className={`p-1.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-colors ${isDark ? "text-gray-300 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"}`}
          title="Recenter camera"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* legend */}
      <div className={`absolute bottom-4 left-4 z-10 px-3 py-2 rounded-xl glass border shadow-lg ${isDark ? "border-white/10" : "border-slate-200"}`}>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {LEGEND.map((l) => (
            <span key={l.label} className={`flex items-center gap-1.5 text-[9.5px] font-mono ${isDark ? "text-gray-300" : "text-slate-600"}`}>
              <span className="w-2 h-2 rounded-full" style={{ background: l.c, boxShadow: `0 0 6px ${l.c}` }} />
              {l.label}
            </span>
          ))}
        </div>
        {driftCount > 0 && (
          <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-current/10 text-[9.5px] font-mono text-rose-400">
            <ShieldAlert className="w-3 h-3" /> {driftCount} caged node{driftCount > 1 ? "s" : ""} flagged for drift
          </div>
        )}
      </div>
    </div>
  );
};
