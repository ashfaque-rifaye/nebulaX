import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import { WeaveNode, WeaveEdge } from "../types.ts";
import { 
  Play, 
  Pause, 
  Sliders, 
  Filter, 
  Boxes, 
  Activity, 
  ShieldAlert, 
  RefreshCw, 
  ChevronRight, 
  ChevronLeft,
  Crosshair,
  Sparkles
} from "lucide-react";

interface Fabric3DProps {
  nodes: WeaveNode[];
  edges: WeaveEdge[];
  isDark: boolean;
  selectedNodeId: string | null;
  onSelect: (id: string) => void;
}

// Map a node to its glow color
function nodeColor(node: WeaveNode): string {
  if (node.type === "correction") return "#10b981"; // human veto — emerald
  if (node.flagged_by === "sentinel") return "#ef4444"; // drift — red
  if (node.type === "synthesis") return "#38bdf8"; // synthesis — cyan
  if (node.confidence >= 0.8) return "#22c55e";
  if (node.confidence >= 0.5) return "#f59e0b";
  return "#ef4444";
}

// Function to generate text sprite in 3D
function makeTextSprite(message: string, color: string) {
  const fontface = "monospace";
  const fontsize = 26;
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 90;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Object3D();

  context.font = `Bold ${fontsize}px ${fontface}`;
  
  // High quality text rendering
  context.fillStyle = "rgba(0, 0, 0, 0.5)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  context.lineWidth = 2;
  context.strokeStyle = color;
  context.strokeRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = color;
  context.fillText(message, 15, fontsize + 15);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(38, 9, 1.0);
  return sprite;
}

export const Fabric3D: React.FC<Fabric3DProps> = ({ nodes, edges, isDark, selectedNodeId, onSelect }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<any>(null);
  
  const [dims, setDims] = useState({ w: 600, h: 400 });
  const [showInsights, setShowInsights] = useState(true);
  const [showControls, setShowControls] = useState(true);
  
  // HUD states
  const [showParticles, setShowParticles] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(0.6);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.0);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>({
    "web-signal": true,
    "human-note": true,
    "synthesis": true,
    "correction": true,
    "output": true,
    "memory": true,
    "action": true
  });

  // Track size
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setDims({ w: r.width, h: r.height });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Filter nodes & links
  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      if (n.confidence < confidenceThreshold) return false;
      if (selectedTypes[n.type] === false) return false;
      
      // Focus Mode logic: hide web-signals unless directly connected to selectedNodeId
      if (focusMode && n.type === "web-signal") {
        if (!selectedNodeId) return false;
        // Check if there is an edge between n.id and selectedNodeId
        const isConnected = edges.some(e => {
          const srcId = typeof e.source === 'object' ? (e.source as any).id : e.source;
          const tgtId = typeof e.target === 'object' ? (e.target as any).id : e.target;
          return (srcId === n.id && tgtId === selectedNodeId) || (tgtId === n.id && srcId === selectedNodeId);
        });
        if (!isConnected) return false;
      }
      
      return true;
    });
  }, [nodes, edges, confidenceThreshold, selectedTypes, focusMode, selectedNodeId]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [edges, filteredNodes]);

  const graphData = useMemo(() => {
    return {
      nodes: filteredNodes.map((n) => ({
        id: n.id,
        name: `${n.title} · ${Math.round(n.confidence * 100)}%`,
        val: n.type === "synthesis" ? 10 : n.type === "correction" ? 8 : 6,
        color: nodeColor(n),
        ref: n,
      })),
      links: filteredEdges.map((e) => ({
        source: e.source,
        target: e.target,
        relation: e.relation,
        color:
          e.relation === "contradicts"
            ? "#ef4444"
            : e.relation === "correction-applied"
            ? "#10b981"
            : isDark
            ? "#38bdf8"
            : "#2563eb",
      })),
    };
  }, [filteredNodes, filteredEdges, isDark]);

  // Compute highlighting
  const highlightNodes = useMemo(() => {
    const set = new Set<string>();
    const active = hoveredNodeId || selectedNodeId;
    if (active) {
      set.add(active);
      edges.forEach(e => {
        if (e.source === active) set.add(e.target);
        if (e.target === active) set.add(e.source);
      });
    }
    return set;
  }, [hoveredNodeId, selectedNodeId, edges]);

  const highlightLinks = useMemo(() => {
    const set = new Set<string>();
    const active = hoveredNodeId || selectedNodeId;
    if (active) {
      edges.forEach(e => {
        if (e.source === active || e.target === active) {
          set.add(e.id || `${e.source}-${e.target}`);
        }
      });
    }
    return set;
  }, [hoveredNodeId, selectedNodeId, edges]);

  // Orbit rotation controls updates
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const controls = fg.controls?.();
    if (controls) {
      // @ts-ignore
      controls.autoRotate = autoRotate;
      // @ts-ignore
      controls.autoRotateSpeed = rotationSpeed;
    }
  }, [autoRotate, rotationSpeed, graphData]);

  // Glide camera to a specific node
  const handleGlideToNode = (nodeId: string) => {
    onSelect(nodeId);
    const fg = fgRef.current;
    if (fg) {
      const graphNode = fg.getGraphData().nodes.find((n: any) => n.id === nodeId);
      if (graphNode) {
        const distance = 140;
        const distRatio = 1 + distance / Math.hypot(graphNode.x, graphNode.y, graphNode.z);
        fg.cameraPosition(
          { x: graphNode.x * distRatio, y: graphNode.y * distRatio, z: graphNode.z * distRatio },
          graphNode,
          1500
        );
      }
    }
  };

  const resetCamera = () => {
    const fg = fgRef.current;
    if (fg) {
      fg.cameraPosition({ x: 0, y: 0, z: 300 }, { x: 0, y: 0, z: 0 }, 1500);
    }
  };

  // Custom 3D Object Builder
  const buildNodeObject = (node: any) => {
    const group = new THREE.Group();
    const isSel = selectedNodeId === node.id;
    const isHovered = hoveredNodeId === node.id;
    const isActive = highlightNodes.size === 0 || highlightNodes.has(node.id);
    const color = node.color;
    
    let geometry;
    if (node.ref.type === "synthesis") {
      geometry = new THREE.BoxGeometry(10, 10, 10);
    } else if (node.ref.type === "correction") {
      geometry = new THREE.TorusGeometry(5, 2, 8, 24);
    } else if (node.ref.type === "action") {
      geometry = new THREE.ConeGeometry(5.5, 10, 4);
    } else {
      geometry = new THREE.SphereGeometry(5, 16, 16);
    }
    
    const material = new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: isActive ? (isSel || isHovered ? 1.0 : 0.85) : 0.15,
      shininess: 90,
      specular: 0xffffff
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    
    // Selection Ring
    if (isSel) {
      const ringGeom = new THREE.RingGeometry(8, 9, 32);
      const ringMat = new THREE.MeshBasicMaterial({ 
        color: isDark ? "#38bdf8" : "#2563eb", 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9 
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      // Align ring to look at camera
      ringMesh.lookAt(new THREE.Vector3(0, 0, 1));
      group.add(ringMesh);
    }
    
    // Sentinel drift alert box
    if (node.ref.flagged_by === "sentinel") {
      const boxGeom = new THREE.BoxGeometry(14, 14, 14);
      const edgeGeom = new THREE.EdgesGeometry(boxGeom);
      const lineMat = new THREE.LineBasicMaterial({ color: "#ef4444", linewidth: 2 });
      const wireframe = new THREE.LineSegments(edgeGeom, lineMat);
      group.add(wireframe);
    }
    
    // Render text label
    const cleanTitle = node.ref.title.substring(0, 16) + (node.ref.title.length > 16 ? "..." : "");
    const label = `${cleanTitle} · ${Math.round(node.ref.confidence * 100)}%`;
    const textColor = isDark ? "#38bdf8" : "#1e3a8a";
    const sprite = makeTextSprite(label, textColor);
    sprite.position.set(0, 12, 0);
    // @ts-ignore
    sprite.material.opacity = isActive ? 0.95 : 0.1;
    group.add(sprite);
    
    return group;
  };

  // Node Type toggles handler
  const toggleType = (type: string) => {
    setSelectedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Calculate statistics for Insights Panel
  const statistics = useMemo(() => {
    if (nodes.length === 0) return { totalNodes: 0, totalLinks: 0, avgConfidence: 0, anomalyCount: 0, hubs: [] };
    
    const activeIds = new Set(filteredNodes.map(n => n.id));
    const totalNodes = filteredNodes.length;
    const totalLinks = filteredEdges.length;
    const avgConfidence = totalNodes > 0 
      ? filteredNodes.reduce((acc, n) => acc + n.confidence, 0) / totalNodes 
      : 0;
    const anomalyCount = filteredNodes.filter(n => n.flagged_by === "sentinel").length;

    // Degree of node connectivity (Hubs)
    const degreeCount: Record<string, number> = {};
    filteredEdges.forEach(e => {
      degreeCount[e.source] = (degreeCount[e.source] || 0) + 1;
      degreeCount[e.target] = (degreeCount[e.target] || 0) + 1;
    });

    // Top synthesis hubs
    const hubs = filteredNodes
      .filter(n => n.type === "synthesis")
      .map(n => ({
        id: n.id,
        title: n.title,
        confidence: n.confidence,
        degree: degreeCount[n.id] || 0
      }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 3);

    return {
      totalNodes,
      totalLinks,
      avgConfidence,
      anomalyCount,
      hubs
    };
  }, [nodes, edges, filteredNodes, filteredEdges]);

  const themeClasses = {
    hudBg: isDark ? "bg-[#0b0e14]/90 border-white/5 text-gray-200" : "bg-white/90 border-slate-200 text-slate-800",
    textMute: isDark ? "text-gray-400" : "text-slate-500",
    textBold: isDark ? "text-white" : "text-slate-900",
    btnHover: isDark ? "hover:bg-white/10" : "hover:bg-slate-100",
    panelBg: isDark ? "bg-[#0b0e14]/95 border-l border-white/5" : "bg-white/95 border-l border-slate-200"
  };

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden flex">
      {nodes.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-500 mr-2" />
          Awaiting swarm signals to render the 3D fabric…
        </div>
      ) : (
        <>
          {/* Main 3D Canvas */}
          <div className="flex-1 h-full relative">
            <ForceGraph3D
              ref={fgRef}
              width={dims.w - (showInsights ? 280 : 0)}
              height={dims.h}
              graphData={graphData as any}
              backgroundColor={isDark ? "#06080d" : "#f8fafc"}
              nodeColor={(n: any) => n.color}
              nodeVal={(n: any) => n.val}
              nodeOpacity={0.9}
              nodeResolution={16}
              linkColor={(l: any) => {
                const id = l.id || `${l.source.id || l.source}-${l.target.id || l.target}`;
                if (highlightLinks.size > 0 && !highlightLinks.has(id)) {
                  return isDark ? "rgba(59,81,112,0.08)" : "rgba(148,163,184,0.1)";
                }
                return l.color;
              }}
              linkWidth={(l: any) => {
                const id = l.id || `${l.source.id || l.source}-${l.target.id || l.target}`;
                const base = l.relation === "contradicts" ? 2.0 : 1.0;
                return highlightLinks.size > 0 && highlightLinks.has(id) ? base * 2.2 : base;
              }}
              linkDirectionalParticles={(l: any) => {
                if (!showParticles) return 0;
                const id = l.id || `${l.source.id || l.source}-${l.target.id || l.target}`;
                if (highlightLinks.size > 0 && !highlightLinks.has(id)) return 0;
                return l.relation === "contradicts" ? 0 : 3;
              }}
              linkDirectionalParticleWidth={1.8}
              linkDirectionalParticleSpeed={0.007}
              linkOpacity={isDark ? 0.4 : 0.65}
              enableNodeDrag={true}
              onNodeClick={(n: any) => handleGlideToNode(n.id)}
              nodeThreeObject={buildNodeObject}
              nodeThreeObjectExtend={false}
              onNodeHover={(node: any) => setHoveredNodeId(node ? node.id : null)}
            />

            {/* floating instructions HUD */}
            <div className={`absolute bottom-3 left-3 z-10 px-3 py-1.5 rounded-lg text-[9px] font-mono border backdrop-blur pointer-events-none ${themeClasses.hudBg}`}>
              drag node · drag bg to orbit · scroll to zoom · click to inspect & camera-glide
            </div>

            {/* Floating Zoom & Controls HUD toggle */}
            <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
              <div className={`p-2.5 rounded-xl border backdrop-blur shadow-xl w-64 transition-all duration-300 ${themeClasses.hudBg} ${showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"}`}>
                <div className="flex items-center justify-between border-b pb-1.5 mb-2 border-white/10">
                  <span className="font-extrabold text-[10px] uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-500" />
                    Fabric HUD Controls
                  </span>
                  <button onClick={() => setShowControls(false)} className={`p-0.5 rounded ${themeClasses.btnHover}`}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Telemetry Actions */}
                <div className="flex gap-1.5 mb-3 select-none">
                  <button
                    onClick={() => setAutoRotate(!autoRotate)}
                    className={`flex-1 py-1 rounded text-[9px] font-mono border font-bold flex items-center justify-center gap-1 transition-all ${
                      autoRotate 
                        ? "bg-blue-600 border-blue-500 text-white" 
                        : isDark ? "bg-white/5 border-white/5 text-gray-400" : "bg-slate-100 border-slate-200 text-slate-600"
                    }`}
                  >
                    {autoRotate ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                    {autoRotate ? "Pause Orbit" : "Orbit Auto"}
                  </button>
                  <button
                    onClick={resetCamera}
                    className={`p-1 px-2 rounded text-[9px] font-mono border font-bold flex items-center justify-center gap-1 transition-all ${isDark ? "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"}`}
                    title="Recenter Camera Target"
                  >
                    <Crosshair className="w-2.5 h-2.5" />
                    Recenter
                  </button>
                </div>

                {/* Sliders */}
                <div className="flex flex-col gap-2.5 mb-3.5">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className={themeClasses.textMute}>Confidence cutoff:</span>
                      <span className="font-bold">{Math.round(confidenceThreshold * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.9"
                      step="0.1"
                      value={confidenceThreshold}
                      onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className={themeClasses.textMute}>Orbit Speed:</span>
                      <span className="font-bold">{rotationSpeed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2.5"
                      step="0.1"
                      value={rotationSpeed}
                      onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-mono border-t pt-2 border-white/10">
                    <span className={themeClasses.textMute}>Data flow streams:</span>
                    <button
                      onClick={() => setShowParticles(!showParticles)}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-colors ${
                        showParticles 
                          ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-400" 
                          : "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}
                    >
                      {showParticles ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-mono border-t pt-2 border-white/10 mt-1">
                    <span className={themeClasses.textMute}>Evidence Drill-Down:</span>
                    <button
                      onClick={() => setFocusMode(!focusMode)}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-colors ${
                        focusMode 
                          ? "bg-blue-600/20 border-blue-500/30 text-blue-400" 
                          : "bg-slate-500/10 border-slate-500/20 text-slate-400"
                      }`}
                    >
                      {focusMode ? "FOCUS" : "SHOW ALL"}
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-1.5 border-t pt-2 border-white/10">
                  <span className="text-[8.5px] font-mono uppercase tracking-wider font-bold mb-1 block">Filter Node Types:</span>
                  <div className="grid grid-cols-2 gap-1.5 text-[8.5px] font-mono">
                    {Object.keys(selectedTypes).map((type) => (
                      <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTypes[type]}
                          onChange={() => toggleType(type)}
                          className="rounded text-blue-500 focus:ring-0 w-2.5 h-2.5"
                        />
                        <span className="capitalize">{type.replace("-", " ")}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {!showControls && (
                <button
                  onClick={() => setShowControls(true)}
                  className={`p-2 rounded-xl border backdrop-blur shadow-2xl transition-all font-mono font-bold text-[9px] flex items-center gap-1.5 ${themeClasses.hudBg}`}
                >
                  <Sliders className="w-3.5 h-3.5 text-blue-500" />
                  HUD Panel
                </button>
              )}
            </div>

            {/* Drill-Down Legend Overlay */}
            {focusMode && (
              <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full text-[10px] font-mono border backdrop-blur shadow-lg flex items-center gap-2 pointer-events-none transition-all ${isDark ? "bg-blue-900/40 border-blue-500/30 text-blue-300" : "bg-blue-100/80 border-blue-500/30 text-blue-800"}`}>
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>Showing Core Insights. Click a Synthesis hub to drill down into raw evidence.</span>
              </div>
            )}

            {/* Selection indicator overlay */}
            {selectedNodeId && (
              <div
                className={`absolute top-3 right-3 z-10 px-2.5 py-1.5 rounded-lg text-[9px] font-mono border backdrop-blur flex items-center gap-2 cursor-pointer ${themeClasses.hudBg}`}
                onClick={() => handleGlideToNode(selectedNodeId)}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span>teleport: {selectedNodeId.split("-").pop()}</span>
              </div>
            )}
          </div>

          {/* Collapsible insights sidebar panel */}
          <div className={`w-[280px] h-full flex flex-col z-20 transition-all duration-300 relative select-none ${themeClasses.panelBg} ${showInsights ? "translate-x-0 border-l" : "absolute right-0 translate-x-full border-none"}`}>
            
            {/* Toggle handle button */}
            <button
              onClick={() => setShowInsights(!showInsights)}
              className={`absolute top-[48%] -left-6 z-30 p-1 px-1.5 rounded-l-md border border-r-0 backdrop-blur shadow-lg ${themeClasses.hudBg}`}
            >
              {showInsights ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>

            {/* Sidebar content */}
            <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
              <div className="border-b pb-2.5 border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                  Network Analytics
                </span>
                <span className="text-[8px] font-mono opacity-60">telemetry active</span>
              </div>

              {/* Statistics widget */}
              <div className="flex flex-col gap-2">
                <div className={`p-2.5 rounded-lg border text-[10px] font-mono flex flex-col gap-1.5 ${isDark ? "bg-black/35 border-white/5" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex justify-between">
                    <span className={themeClasses.textMute}>Nodes Visible:</span>
                    <span className="font-bold">{statistics.totalNodes} / {nodes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={themeClasses.textMute}>Links Count:</span>
                    <span className="font-bold">{statistics.totalLinks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={themeClasses.textMute}>Network Integrity:</span>
                    <span className="font-bold text-emerald-500">{Math.round(statistics.avgConfidence * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={themeClasses.textMute}>Active Anomalies:</span>
                    <span className={`font-bold ${statistics.anomalyCount > 0 ? "text-red-500 animate-pulse" : "text-gray-400"}`}>
                      {statistics.anomalyCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Synthesis Hubs widget */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-mono uppercase tracking-wider font-bold">Key Intelligence Hubs:</span>
                <div className="flex flex-col gap-2">
                  {statistics.hubs.length === 0 ? (
                    <span className="text-[9px] font-mono opacity-50 italic">No synthesis hubs found.</span>
                  ) : (
                    statistics.hubs.map(hub => (
                      <div
                        key={hub.id}
                        onClick={() => handleGlideToNode(hub.id)}
                        className={`p-2 rounded-lg border text-[9.5px] font-mono flex flex-col gap-1 transition-all cursor-pointer hover:scale-[1.01] ${
                          selectedNodeId === hub.id 
                            ? "border-blue-500 bg-blue-500/5" 
                            : isDark ? "bg-black/20 border-white/5 hover:bg-black/45" : "bg-slate-50/50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex justify-between items-center font-bold">
                          <span className="truncate max-w-[150px]">{hub.title}</span>
                          <span className="text-[8px] bg-blue-500/10 text-blue-400 px-1 border border-blue-500/25 rounded">hub</span>
                        </div>
                        <div className="flex justify-between text-[8px] opacity-75">
                          <span>Connected chains: {hub.degree}</span>
                          <span>Confidence: {Math.round(hub.confidence * 100)}%</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Drift Exceptions warning list */}
              <div className="flex flex-col gap-2 border-t pt-3 border-white/10 mt-auto">
                <span className="text-[9px] font-mono uppercase tracking-wider font-bold flex items-center gap-1 text-red-500">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Active Drift Exceptions
                </span>

                <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto">
                  {filteredNodes.filter(n => n.flagged_by === "sentinel").length === 0 ? (
                    <div className="flex items-center gap-1.5 bg-emerald-500/5 border border-emerald-500/20 px-2 py-1.5 rounded-lg text-[9px] text-emerald-500 font-mono">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span>No anomalies flagged by Sentinel.</span>
                    </div>
                  ) : (
                    filteredNodes
                      .filter(n => n.flagged_by === "sentinel")
                      .map(node => (
                        <div
                          key={node.id}
                          onClick={() => handleGlideToNode(node.id)}
                          className="p-2 border border-red-500/20 bg-red-500/5 rounded-lg text-[9px] font-mono cursor-pointer transition-all hover:bg-red-500/10 flex flex-col gap-0.5"
                        >
                          <div className="flex justify-between items-center font-bold text-red-400">
                            <span className="truncate max-w-[150px]">{node.title}</span>
                            <span>{Math.round(node.confidence * 100)}% CF</span>
                          </div>
                          <p className="line-clamp-2 text-gray-400 leading-normal text-[8px]">
                            {node.content}
                          </p>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
