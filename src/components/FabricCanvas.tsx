import React, { useMemo, useEffect, useState } from 'react';
import {
  ReactFlow, Controls, Background, MiniMap, useNodesState, useEdgesState,
  MarkerType, Handle, Position, Panel, ReactFlowProvider, useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { WeaveNode, WeaveEdge } from '../types.ts';
import { CATEGORY_META, CATEGORY_ORDER, catColor, catRank } from '../categories.ts';
import { DynamicNodeBody } from './DynamicNode.tsx';
import {
  Cpu, CheckCircle2, AlertTriangle, GitCompareArrows, FileText, Undo,
  Maximize, Minimize, Filter,
} from 'lucide-react';

interface FabricCanvasProps {
  nodes: WeaveNode[];
  edges: WeaveEdge[];
  isDark: boolean;
  selectedNodeId: string | null;
  onSelect: (id: string) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

const NODE_W = 280, NODE_H = 150, V_GAP = 18, COL_W = 326, LANE_PAD = 48, LANE_LABEL_X = -224;

const status = (n: WeaveNode): { label: string; tone: string; Icon: any } => {
  if (n.type === 'correction') return { label: 'Resolved', tone: 'emerald', Icon: CheckCircle2 };
  if (n.conflict || n.flagged_by === 'sentinel') return { label: 'Conflict', tone: 'rose', Icon: GitCompareArrows };
  if (n.verified === false) return { label: 'Needs review', tone: 'amber', Icon: AlertTriangle };
  return { label: 'Verified', tone: 'emerald', Icon: CheckCircle2 };
};
const TONE: Record<string, string> = {
  emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25',
  amber: 'text-amber-500 bg-amber-500/10 border-amber-500/25',
  rose: 'text-rose-500 bg-rose-500/10 border-rose-500/25',
};

// ── Rich finding card (the card style from the old board, in the Flow) ──
const FindingNode = ({ data, selected }: any) => {
  const node = data.node as WeaveNode;
  const isDark = data.isDark;
  const st = status(node);
  const c = catColor(node.category);
  const TypeIcon = node.type === 'synthesis' ? Cpu : node.type === 'correction' ? Undo : FileText;
  const ring = selected ? 'ring-2 ring-violet-500'
    : (node.conflict || node.flagged_by === 'sentinel') ? 'ring-1 ring-rose-500/60' : '';
  const srcN = Math.max(1, node.corroboration || (node.provenance?.length ? node.provenance.length : 1));

  return (
    <div
      style={{ width: NODE_W }}
      className={`rounded-2xl border p-3 flex flex-col gap-2 transition-all ${ring} ${
        isDark ? 'bg-[#0c101f]/95 border-white/10 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
      } shadow-md`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-violet-400 !border-0" />

      <div className="flex items-center justify-between gap-2 text-[8.5px] leading-none">
        <span className="flex items-center gap-1.5 min-w-0">
          <TypeIcon className="w-3 h-3 flex-shrink-0" style={{ color: c }} />
          {node.category && (
            <span className="font-mono font-bold uppercase tracking-wide px-1.5 py-0.5 rounded truncate"
              style={{ color: c, background: c + '1f' }}>{node.category}</span>
          )}
        </span>
        <span className={`flex items-center gap-1 font-mono font-bold px-1.5 py-0.5 rounded border ${TONE[st.tone]}`}>
          <st.Icon className="w-2.5 h-2.5" /> {st.label}
        </span>
      </div>

      <h3 className="text-[12px] font-bold leading-snug line-clamp-2" style={{ color: isDark ? '#fff' : '#0f172a' }}>{node.title}</h3>
      <DynamicNodeBody node={node} isDark={isDark} compact />

      <div className="flex items-center justify-between text-[7.5px] font-mono mt-0.5 pt-1 border-t border-slate-200/50 dark:border-white/5 text-slate-400">
        <span className="truncate max-w-[150px]">{node.source}</span>
        <span>{srcN} {srcN === 1 ? 'source' : 'sources'}</span>
      </div>

      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-violet-400 !border-0" />
    </div>
  );
};

// ── Lane label (non-interactive) for each category band ──
const LaneLabel = ({ data }: any) => (
  <div className="flex items-center gap-2 select-none pointer-events-none" style={{ width: 190 }}>
    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: data.color }} />
    <span className="text-[13px] font-bold font-display tracking-tight" style={{ color: data.color }}>{data.label}</span>
  </div>
);

const nodeTypes = {
  'web-signal': FindingNode, 'synthesis': FindingNode, 'correction': FindingNode,
  'action': FindingNode, 'output': FindingNode, 'human-note': FindingNode, 'memory': FindingNode,
  'laneLabel': LaneLabel,
};

// ── Category-lane layout: x by edge depth (the pipeline), y grouped into a
// horizontal band per category, so you literally see Finance / Product / etc.
// as separate rows and which findings connect across them. ──
function laneLayout(nodes: WeaveNode[], edges: WeaveEdge[]) {
  const ids = new Set(nodes.map(n => n.id));
  const preds = new Map<string, string[]>();
  nodes.forEach(n => preds.set(n.id, []));
  edges.forEach(e => { if (ids.has(e.source) && ids.has(e.target) && e.source !== e.target) preds.get(e.target)!.push(e.source); });

  const rank = new Map<string, number>();
  const depth = (id: string, stack: Set<string>): number => {
    if (rank.has(id)) return rank.get(id)!;
    if (stack.has(id)) return 0;
    stack.add(id);
    let L = 0;
    for (const p of preds.get(id) || []) L = Math.max(L, depth(p, stack) + 1);
    stack.delete(id);
    rank.set(id, L);
    return L;
  };
  nodes.forEach(n => depth(n.id, new Set()));

  const cats = [...new Set(nodes.map(n => n.category || 'General'))].sort((a, b) => catRank(a) - catRank(b));
  const byCat = new Map<string, WeaveNode[]>();
  cats.forEach(c => byCat.set(c, []));
  nodes.forEach(n => byCat.get(n.category || 'General')!.push(n));

  const positions: Record<string, { x: number; y: number }> = {};
  const lanes: { cat: string; top: number; height: number }[] = [];
  let yCursor = 0;
  for (const cat of cats) {
    const laneNodes = byCat.get(cat)!;
    const byRank = new Map<number, WeaveNode[]>();
    laneNodes.forEach(n => { const r = rank.get(n.id)!; if (!byRank.has(r)) byRank.set(r, []); byRank.get(r)!.push(n); });
    const maxStack = Math.max(1, ...[...byRank.values()].map(a => a.length));
    const laneHeight = maxStack * (NODE_H + V_GAP);
    byRank.forEach((arr) => {
      const blockH = arr.length * (NODE_H + V_GAP);
      arr.forEach((n, i) => {
        positions[n.id] = { x: rank.get(n.id)! * COL_W, y: yCursor + (laneHeight - blockH) / 2 + i * (NODE_H + V_GAP) };
      });
    });
    lanes.push({ cat, top: yCursor, height: laneHeight });
    yCursor += laneHeight + LANE_PAD;
  }
  return { positions, lanes };
}

const FabricFlow = ({ nodes: rawNodes, edges: rawEdges, isDark, selectedNodeId, onSelect }: FabricCanvasProps) => {
  const { fitView } = useReactFlow();
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const presentCats = useMemo(
    () => [...new Set(rawNodes.map(n => n.category || 'General'))].sort((a, b) => catRank(a) - catRank(b)),
    [rawNodes]
  );

  const layout = useMemo(() => laneLayout(rawNodes, rawEdges), [rawNodes, rawEdges]);

  const baseNodes = useMemo(() => {
    const findingNodes = rawNodes.map(n => ({
      id: n.id, type: n.type,
      position: layout.positions[n.id] || { x: 0, y: 0 },
      data: { node: n, isDark },
      draggable: true,
    }));
    const laneNodes = layout.lanes.map(l => ({
      id: `lane-${l.cat}`, type: 'laneLabel',
      position: { x: LANE_LABEL_X, y: l.top + l.height / 2 - 12 },
      data: { label: CATEGORY_META[l.cat]?.label || l.cat, color: catColor(l.cat) },
      draggable: false, selectable: false,
    }));
    return [...laneNodes, ...findingNodes];
  }, [rawNodes, layout, isDark]);

  const baseEdges = useMemo(() => rawEdges.map(e => {
    const src = rawNodes.find(n => n.id === e.source);
    const isCon = e.relation === 'contradicts';
    const col = isCon ? '#fb7185' : catColor(src?.category);
    return {
      id: e.id, source: e.source, target: e.target, label: e.label,
      animated: !isCon,
      style: { stroke: col, strokeWidth: 1.8, strokeDasharray: isCon ? '5 4' : undefined },
      markerEnd: { type: MarkerType.ArrowClosed, color: col },
      labelStyle: { fill: isDark ? '#cbd5e1' : '#475569', fontSize: 9, fontFamily: 'monospace', fontWeight: 700 },
      labelBgStyle: { fill: isDark ? '#0b0e1c' : '#ffffff', fillOpacity: 0.9 },
      labelBgPadding: [5, 2] as [number, number], labelBgBorderRadius: 4,
      data: { cat: src?.category || 'General' },
    };
  }), [rawEdges, rawNodes, isDark]);

  const [rfNodes, setNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (baseNodes.length === 0) return;
    setNodes(baseNodes as any);
    setEdges(baseEdges as any);
    const raf = requestAnimationFrame(() => setTimeout(() => fitView({ padding: 0.16, duration: 600, maxZoom: 1 }), 60));
    return () => cancelAnimationFrame(raf);
  }, [baseNodes, baseEdges, fitView, setNodes, setEdges]);

  useEffect(() => {
    if (!selectedNodeId) return;
    const node = rfNodes.find(n => n.id === selectedNodeId);
    if (node) fitView({ nodes: [{ id: node.id }], duration: 600, padding: 0.7, maxZoom: 1.15 });
  }, [selectedNodeId, rfNodes, fitView]);

  // Apply selection + category-filter dimming without relaying out.
  const shownNodes = rfNodes.map(n => {
    const cat = (n.data as any)?.node?.category || (n.type === 'laneLabel' ? (n.id as string).replace('lane-', '') : 'General');
    const dim = activeCat && cat !== activeCat;
    return { ...n, selected: n.id === selectedNodeId, style: { ...(n.style || {}), opacity: dim ? 0.18 : 1, transition: 'opacity .2s' } };
  });
  const shownEdges = rfEdges.map(e => {
    const dim = activeCat && (e.data as any)?.cat !== activeCat;
    return { ...e, style: { ...(e.style || {}), opacity: dim ? 0.08 : 1 }, animated: !dim && e.animated };
  });

  return (
    <ReactFlow
      nodes={shownNodes}
      edges={shownEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => { if (node.type !== 'laneLabel') onSelect(node.id); }}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
      minZoom={0.08}
      maxZoom={1.6}
      proOptions={{ hideAttribution: true }}
      className="!bg-transparent"
    >
      <Background color={isDark ? '#222c47' : '#d8d3ec'} gap={28} size={1.2} />
      <Controls className={isDark ? '!bg-[#0a0d1a]/90 !border-white/10 !fill-white [&>button]:!border-white/10 [&>button]:!bg-transparent [&>button:hover]:!bg-white/10' : '!shadow-md !border-slate-200'} />
      <MiniMap
        pannable zoomable
        nodeColor={(n: any) => n.type === 'laneLabel' ? 'transparent' : catColor((n.data as any)?.node?.category)}
        nodeStrokeColor={(n: any) => n.type === 'laneLabel' ? 'transparent' : catColor((n.data as any)?.node?.category)}
        nodeBorderRadius={6}
        nodeStrokeWidth={2}
        maskColor={isDark ? 'rgba(8,11,22,0.72)' : 'rgba(246,244,253,0.72)'}
        className={`!rounded-xl !overflow-hidden ${isDark ? '!bg-[#0a0d1a] !border !border-white/10' : '!bg-white !border !border-slate-200'}`}
        style={{ width: 180, height: 120 }}
      />

      {/* category filter + legend */}
      <Panel position="top-left" className="m-4">
        <div className={`glass border rounded-xl p-2.5 shadow-xl ${isDark ? 'border-white/10' : 'border-slate-200'}`} style={{ maxWidth: 320 }}>
          <div className={`flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
            <Filter className="w-3 h-3 text-violet-400" /> Categories — click to isolate
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCat(null)}
              className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-all ${
                activeCat === null ? 'bg-luna-gradient text-white border-transparent' : (isDark ? 'border-white/15 text-gray-300 hover:border-white/30' : 'border-slate-200 text-slate-600 hover:border-slate-300')
              }`}
            >All</button>
            {presentCats.map(cat => {
              const c = catColor(cat);
              const on = activeCat === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCat(on ? null : cat)}
                  className="text-[10px] font-bold px-2 py-1 rounded-full border transition-all flex items-center gap-1.5"
                  style={on
                    ? { color: '#fff', background: c, borderColor: c }
                    : { color: c, background: c + '14', borderColor: c + '55' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? '#fff' : c }} />
                  {CATEGORY_META[cat]?.label || cat}
                </button>
              );
            })}
          </div>
        </div>
      </Panel>
    </ReactFlow>
  );
};

export const FabricCanvas: React.FC<FabricCanvasProps> = (props) => {
  if (props.nodes.length === 0) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center gap-3 relative text-center px-6">
        <div className="w-14 h-14 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center float-y">
          <Cpu className="w-7 h-7 text-indigo-400" />
        </div>
        <h3 className={`text-base font-bold font-display ${props.isDark ? "text-white" : "text-slate-900"}`}>The flow map builds itself</h3>
        <p className={`text-xs max-w-sm leading-relaxed ${props.isDark ? "text-[#9298b4]" : "text-slate-500"}`}>
          As the swarm senses findings, this view groups them into category lanes — Finance, Product, Marketing and more — and connects what relates to what.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full relative">
      {props.onToggleMaximize && (
        <button
          onClick={props.onToggleMaximize}
          className="absolute top-4 right-4 p-2 rounded-lg border bg-white/80 dark:bg-[#0b0e1c]/80 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors z-[60] text-slate-700 dark:text-gray-300 shadow-md backdrop-blur-sm"
          title={props.isMaximized ? "Restore view" : "Maximize flow"}
        >
          {props.isMaximized ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      )}
      <ReactFlowProvider>
        <FabricFlow {...props} />
      </ReactFlowProvider>
    </div>
  );
};
