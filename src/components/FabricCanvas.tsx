import React, { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  Panel,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { WeaveNode, WeaveEdge } from '../types.ts';
import { ShieldAlert, Cpu, CheckCircle2, Zap, Maximize, Minimize } from 'lucide-react';

interface FabricCanvasProps {
  nodes: WeaveNode[];
  edges: WeaveEdge[];
  isDark: boolean;
  selectedNodeId: string | null;
  onSelect: (id: string) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

// ----------------------
// Custom Node Components
// ----------------------

const getNodeBorder = (node: WeaveNode, isSelected: boolean, isDark: boolean) => {
  if (isSelected) return 'ring-2 ring-blue-500 shadow-blue-500/50 shadow-lg scale-[1.02]';
  if (node.flagged_by === 'sentinel') return 'ring-2 ring-red-500 animate-pulse shadow-red-500/30 shadow-md';
  return isDark ? 'border border-white/10 shadow-sm' : 'border border-slate-200 shadow-sm';
};

const getConfidenceColor = (conf: number) => {
  if (conf >= 0.8) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  if (conf >= 0.5) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  return 'text-red-500 bg-red-500/10 border-red-500/20';
};

const BaseNode = ({ data, selected, typeLabel, icon: Icon }: any) => {
  const node = data.node as WeaveNode;
  const isDark = data.isDark;
  const themeBg = isDark ? 'bg-[#0b0e14]/95 text-gray-200 backdrop-blur-md' : 'bg-white/95 text-slate-800 backdrop-blur-md';
  
  return (
    <div className={`p-3.5 rounded-xl w-72 ${themeBg} ${getNodeBorder(node, selected, isDark)} transition-all duration-300 cursor-pointer`}>
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 !bg-blue-500 border-2 !border-[#0b0e14]" />
      
      <div className="flex justify-between items-center mb-2.5 border-b border-slate-500/20 pb-1.5">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 opacity-80">
          <Icon className="w-3.5 h-3.5 text-blue-500" />
          {typeLabel}
        </span>
        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${getConfidenceColor(node.confidence)}`}>
          {Math.round(node.confidence * 100)}% CF
        </span>
      </div>
      
      <h3 className="text-[13px] font-bold mb-1.5 leading-snug">{node.title}</h3>
      <p className="text-[10.5px] opacity-75 line-clamp-4 leading-relaxed mb-3 font-medium">{node.content}</p>
      
      <div className="flex justify-between items-center text-[9px] font-mono opacity-60 mt-2 bg-slate-500/5 -mx-1.5 -mb-1.5 p-2 rounded-b-lg border-t border-slate-500/10">
        <span className="truncate max-w-[150px]">Agent: {node.source}</span>
        {node.flagged_by === 'sentinel' && (
          <span className="text-red-500 flex items-center gap-1 font-bold">
            <ShieldAlert className="w-3 h-3" /> DRIFT
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 !bg-blue-500 border-2 !border-[#0b0e14]" />
    </div>
  );
};

const SignalNode = (props: any) => <BaseNode {...props} typeLabel="Raw Signal" icon={Zap} />;
const SynthesisNode = (props: any) => <BaseNode {...props} typeLabel="Synthesis" icon={Cpu} />;
const CorrectionNode = (props: any) => <BaseNode {...props} typeLabel="Correction" icon={CheckCircle2} />;
const ActionNode = (props: any) => <BaseNode {...props} typeLabel="Action" icon={Zap} />;

const nodeTypes = {
  'web-signal': SignalNode,
  'synthesis': SynthesisNode,
  'correction': CorrectionNode,
  'action': ActionNode,
  'output': ActionNode,
  'human-note': SignalNode,
  'memory': SignalNode
};

// ----------------------
// Layout Algorithm
// ----------------------
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 40, ranksep: 200 });

  nodes.forEach((node) => {
    // Approx node dimensions based on w-72 (288px) and typical height
    dagreGraph.setNode(node.id, { width: 300, height: 160 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      position: {
        x: nodeWithPosition.x - 300 / 2,
        y: nodeWithPosition.y - 160 / 2,
      },
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
    };
    return newNode;
  });

  return { nodes: layoutedNodes, edges };
};

// ----------------------
// Main Canvas Component
// ----------------------
const FabricFlow = ({ nodes: rawNodes, edges: rawEdges, isDark, selectedNodeId, onSelect }: FabricCanvasProps) => {
  const { fitView } = useReactFlow();
  
  const initialNodes = useMemo(() => {
    return rawNodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: { x: 0, y: 0 },
      data: { node: n, isDark },
    }));
  }, [rawNodes, isDark]);

  const initialEdges = useMemo(() => {
    return rawEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.relation !== 'contradicts',
      style: { stroke: e.relation === 'contradicts' ? '#ef4444' : (isDark ? '#38bdf8' : '#3b82f6'), strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: e.relation === 'contradicts' ? '#ef4444' : (isDark ? '#38bdf8' : '#3b82f6'),
      },
      labelStyle: { fill: isDark ? '#9ca3af' : '#475569', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' },
      labelBgStyle: { fill: isDark ? '#0b0e14' : '#ffffff', fillOpacity: 0.85 },
      labelBgPadding: [6, 3],
      labelBgBorderRadius: 4,
    }));
  }, [rawEdges, isDark]);

  const [rfNodes, setNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState([]);

  // Apply layout on init
  useEffect(() => {
    if (initialNodes.length === 0) return;
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      'LR'
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    
    // Slight delay to ensure ReactFlow has rendered the DOM nodes before fitting view
    setTimeout(() => {
      fitView({ padding: 0.1, duration: 800 });
    }, 100);
  }, [initialNodes, initialEdges, fitView, setNodes, setEdges]);

  // Center selected node if clicked externally
  useEffect(() => {
    if (selectedNodeId) {
      const node = rfNodes.find(n => n.id === selectedNodeId);
      if (node) {
        fitView({ nodes: [{ id: node.id }], duration: 800, padding: 1.5 });
      }
    }
  }, [selectedNodeId, rfNodes, fitView]);

  const confColor = (n: any) => {
    const conf = (n.data?.node as WeaveNode)?.confidence ?? 0;
    if ((n.data?.node as WeaveNode)?.flagged_by === 'sentinel') return '#fb7185';
    if (conf >= 0.8) return '#34d399';
    if (conf >= 0.5) return '#fbbf24';
    return '#fb7185';
  };

  return (
    <ReactFlow
      nodes={rfNodes.map(n => ({ ...n, data: { ...n.data, isDark }, selected: n.id === selectedNodeId }))}
      edges={rfEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => onSelect(node.id)}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
      minZoom={0.05}
      maxZoom={1.6}
      proOptions={{ hideAttribution: true }}
      className={isDark ? '!bg-transparent' : '!bg-transparent'}
    >
      <Background color={isDark ? '#2a3550' : '#cbd5e1'} gap={26} size={1.4} />
      <Controls className={isDark ? '!bg-[#0a0e17]/90 !border-white/10 !fill-white [&>button]:!border-white/10 [&>button]:!bg-transparent [&>button:hover]:!bg-white/10' : ''} />
      <MiniMap
        pannable
        zoomable
        nodeColor={confColor}
        nodeStrokeWidth={3}
        maskColor={isDark ? 'rgba(5,7,12,0.78)' : 'rgba(244,246,251,0.78)'}
        className={isDark ? '!bg-[#0a0e17]' : '!bg-white'}
      />

      <Panel position="top-left" className={`p-3.5 glass border rounded-xl m-4 font-mono text-[10px] pointer-events-none shadow-xl ${isDark ? 'border-white/10 text-gray-300' : 'border-slate-200 text-slate-700'}`}>
        <h3 className="font-bold text-[12px] text-indigo-400 mb-1.5 flex items-center gap-1.5 font-display tracking-tight">
          <Cpu className="w-4 h-4" />
          Intelligence Flow Map
        </h3>
        <p className="opacity-80">Sensing → reasoning → synthesis, left to right.</p>
        <p className="opacity-80 mt-0.5">Scroll to zoom · Drag to pan · Click to inspect</p>
        <div className="flex items-center gap-2.5 mt-2 pt-2 border-t border-current/10">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />≥80%</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />50–79%</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" />&lt;50% / drift</span>
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
        <h3 className={`text-base font-bold font-display ${props.isDark ? "text-white" : "text-slate-900"}`}>The flow map weaves itself</h3>
        <p className={`text-xs max-w-sm leading-relaxed ${props.isDark ? "text-[#8b93a7]" : "text-slate-500"}`}>
          As soon as the swarm senses signals, this view auto-lays the pipeline: raw signals flow into syntheses, corrections and actions, left to right.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full relative">
      {props.onToggleMaximize && (
        <button
          onClick={props.onToggleMaximize}
          className="absolute top-4 right-4 p-2 rounded-lg border bg-white/80 dark:bg-[#0b0e14]/80 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors z-[60] text-slate-700 dark:text-gray-300 shadow-md backdrop-blur-sm"
          title={props.isMaximized ? "Restore view" : "Maximize canvas"}
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
