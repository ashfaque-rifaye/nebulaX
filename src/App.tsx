import React, { useState, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Bot,
  Loader2,
  RefreshCw,
  Search,
  Network,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Mail,
  Plus,
  Send,
  User,
  Activity,
  FileCheck,
  ExternalLink,
  X,
  Undo,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Check,
  Info,
  Sun,
  Moon,
  LayoutGrid,
  Compass,
  BookOpen,
  Sparkles,
  Clock,
  List,
  Table2,
  HelpCircle,
  Activity as PulseIcon,
  Mic,
  MicOff,
  Boxes,
  History,
  Radar,
  Columns3,
  Rocket,
  Layers,
  Zap,
  Gauge,
  Leaf,
  MessageSquare,
  RotateCcw,
  Radio,
  Trash2,
  Pin,
  FlaskConical,
  Wand2,
  Maximize,
  Minimize,
  Cpu as CpuChip,
  PanelRightClose,
  PanelRightOpen,
  ChevronUp,
  ChevronDown,
  GitBranch,
  Crosshair,
  SlidersHorizontal,
  Wallet as WalletIcon,
  Clapperboard,
  Image as ImageIcon,
  Hammer,
  BarChart3,
  GitCompareArrows,
  CheckCircle2,
  Github,
  Cloud,
  SquareKanban,
  Users,
  PieChart,
  Plug,
  PenTool
} from "lucide-react";
import { Mission, WeaveNode, WeaveEdge, ProposedAction, ActivityFeedEvent, ResearchBrief, AgentStatus, MissionPlanVariant, Profile, ChatTurn, MissionRun, CustomAgent, Connector } from "./types.ts";
import { catColor } from "./categories.ts";
import { GreenCredits, PledgeDef } from "./components/GreenCredits.tsx";
import { FabricChat } from "./components/FabricChat.tsx";
import { HowItWorksPage, AgentsPage, UseCasesPage } from "./components/ExplainerPages.tsx";
import { MissionLog } from "./components/MissionLog.tsx";
import { DynamicNodeBody } from "./components/DynamicNode.tsx";
import { CustomAgents } from "./components/CustomAgents.tsx";
import { TemporalVista } from "./components/TemporalVista.tsx";
import { CommandConsole } from "./components/CommandConsole.tsx";
import { FabricCanvas } from "./components/FabricCanvas.tsx";
import { TriageBoard } from "./components/TriageBoard.tsx";
import { MissionReplay } from "./components/MissionReplay.tsx";
import { BuildStudio } from "./components/BuildStudio.tsx";
import { MissionPlanner } from "./components/MissionPlanner.tsx";
import { MissionSettings, MissionPatch } from "./components/MissionSettings.tsx";
import { SettingsModal } from "./components/SettingsModal.tsx";
import { OnboardingTour, TourStep } from "./components/OnboardingTour.tsx";
import { AuthModal } from "./components/AuthModal.tsx";
import { Wallet } from "./components/Wallet.tsx";
import { MediaStudio } from "./components/MediaStudio.tsx";
import { ConflictResolver } from "./components/ConflictResolver.tsx";
import { RefineFinding } from "./components/RefineFinding.tsx";

// Workspace lens definitions: one fabric, complementary views.
const WORKSPACE_VIEWS = [
  { key: "fabric2d", label: "Flow", desc: "Flow Map — findings mapped and connected by category", Icon: GitBranch },
  { key: "build", label: "Build", desc: "Build — gaps, a prototype and ranked tasks from the analysis", Icon: Hammer },
  { key: "vista", label: "Futures", desc: "Temporal Vista — forecast branching scenarios", Icon: Clock },
  { key: "triage", label: "Triage", desc: "Triage lanes — verified / needs review / resolved", Icon: Columns3 },
  { key: "replay", label: "Replay", desc: "Replay — watch the fabric build itself, run by run", Icon: History },
] as const;

type WorkspaceMode = typeof WORKSPACE_VIEWS[number]["key"];

const TOUR_STEPS: TourStep[] = [
  { target: '[data-tour="rail"]', title: "Watch the swarm work", body: "Eight specialist agents sense, verify, weave and act. Each tile is live: a pulsing ring means that agent is working right now. Click one to open its console." },
  { target: '[data-tour="views"]', title: "One fabric, several lenses", body: "Board for how findings connect, Flow for the sensing → comparison pipeline, Build to turn the analysis into a prototype and tasks, Futures for forecasts, Triage for verification, Replay for history. Hover any icon to see what it does." },
  { target: '[data-tour="stage"]', title: "Explore your findings", body: "Every card is a finding with its real data and sources. Drag to pan, scroll to zoom, click any card to inspect where it came from." },
  { target: '[data-tour="inspector"]', title: "Inspect, then act", body: "The Inspector shows the selected finding's data, sources and provenance, and tracks the overall mission read when nothing is selected." },
  { target: '[data-tour="feed"]', title: "Live agent feed", body: "The ticker streams what agents are doing in real time. Expand it for the full intelligence brief and one-click proposed actions." },
];

// Per-agent glyphs for the swarm rail.
const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  conductor: Compass,
  pathfinder: Search,
  analyst: BarChart3,
  veritas: ShieldCheck,
  cartographer: Network,
  sentinel: GitCompareArrows,
  oracle: Sparkles,
  scribe: BookOpen,
  actor: Mail,
  architect: Boxes,
  builder: Hammer,
  visualizer: ImageIcon,
  cinematographer: Clapperboard,
};

// Glyphs for the org tools an action can be routed into.
const CONNECTOR_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  github: Github, azure: Cloud, cicd: GitBranch, jira: SquareKanban, email: Mail,
  slack: MessageSquare, teams: Users, powerbi: BarChart3, tableau: PieChart, figma: PenTool,
};

// Which tool each proposed move strategizes into by default. The "build &
// strategize" wiring: outreach → email, watch → Slack, decision → Teams, etc.
const ACTION_ROUTING: Record<string, { connector: string; verb: string }> = {
  outreach: { connector: "email", verb: "Send via Email" },
  "draft-email": { connector: "email", verb: "Send via Email" },
  "draft-application": { connector: "email", verb: "Send via Email" },
  reminder: { connector: "email", verb: "Email reminder" },
  monitor: { connector: "slack", verb: "Send alert to Slack" },
  alert: { connector: "slack", verb: "Alert in Slack" },
  decision: { connector: "teams", verb: "Share to Teams" },
  "deep-dive": { connector: "github", verb: "Open as GitHub issue" },
  "draft-brief": { connector: "powerbi", verb: "Push to Power BI" },
  other: { connector: "github", verb: "File in GitHub" },
};

export default function App() {
  // Navigation & View State
  const [currentView, setCurrentView] = useState<"home" | "workspace" | "how" | "agents" | "usecases" | "log">("home");

  // Jump to the workspace command center, optionally pre-filling a mission prompt.
  const goLaunch = (prompt?: string) => {
    if (prompt) setNewPrompt(prompt);
    setLaunched(false);
    setSelectedNodeId(null);
    setFocusedAgent(null);
    setCurrentView("workspace");
  };
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("fabric2d");
  const [isMaximized, setIsMaximized] = useState(false);
  const workspaceContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMaximized(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleMaximize = async () => {
    try {
      if (!document.fullscreenElement) {
        if (workspaceContainerRef.current?.requestFullscreen) {
          await workspaceContainerRef.current.requestFullscreen();
        } else if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
      // Fallback to DOM-only maximize
      setIsMaximized(!isMaximized);
    }
  };
  // Whether the user has actively opened a mission. Until they do, the workspace
  // shows the Command Center (not a canvas) so nothing renders "for no reason".
  const [launched, setLaunched] = useState(false);
  // Live LLM provider chain (Groq → Cerebras → HuggingFace) reported by the backend.
  const [llmProviders, setLlmProviders] = useState<string[]>([]);
  // Model Control Center (switch provider/model, bring your own keys)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeEngine, setActiveEngine] = useState<{ provider: string; model: string } | null>(null);
  // Workspace shell: collapsible inspector + expandable intelligence pane
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [footerOpen, setFooterOpen] = useState(false);

  const fetchLlmConfig = async () => {
    try {
      const res = await fetch("/api/llm/config");
      if (res.ok) {
        const cfg = await res.json();
        if (cfg?.chain?.length) setActiveEngine({ provider: cfg.chain[0].name, model: cfg.chain[0].model });
        else setActiveEngine(null);
      }
    } catch (err) { console.error("Failed to load LLM config:", err); }
  };
  
  // Theme State ("dark" | "light")
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const saved = localStorage.getItem("nebula-theme");
      return saved === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });

  // Base Data State
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string>("mission-payments");
  const [nodes, setNodes] = useState<WeaveNode[]>([]);
  const [edges, setEdges] = useState<WeaveEdge[]>([]);
  const [events, setEvents] = useState<ActivityFeedEvent[]>([]);
  const [brief, setBrief] = useState<ResearchBrief | null>(null);
  const [actions, setActions] = useState<ProposedAction[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [routingId, setRoutingId] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [focusedAgent, setFocusedAgent] = useState<AgentStatus | null>(null);
  const [runningAgentId, setRunningAgentId] = useState<string | null>(null);

  // Selection & Hover States
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredSentenceId, setHoveredSentenceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"analysis" | "actions">("analysis");

  // New Mission Deployment Specs
  const [newPrompt, setNewPrompt] = useState("");
  const [selectedPersona, setSelectedPersona] = useState("Founder / Product Executive");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Green Credits / profile + auth. Identity is now a real session (httpOnly
  // cookie); `handle` is set only once the user is signed in.
  const [handle, setHandleState] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pledges, setPledges] = useState<PledgeDef[]>([]);
  const [deployCost, setDeployCost] = useState(25);
  const [minReserve, setMinReserve] = useState(4);
  const [profileLoading, setProfileLoading] = useState(false);
  const [claimingPledgeId, setClaimingPledgeId] = useState<string | null>(null);
  // Auth modal ({ reason }) + wallet modal
  const [authPrompt, setAuthPrompt] = useState<{ reason?: string; mode?: "login" | "signup" } | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const authed = !!handle;

  // Dismissible workspace guidance ("what am I looking at?")
  const [showGuide, setShowGuide] = useState<boolean>(() => {
    try { return localStorage.getItem("nebula-guide-dismissed") !== "1"; } catch { return true; }
  });
  const dismissGuide = () => {
    try { localStorage.setItem("nebula-guide-dismissed", "1"); } catch {}
    setShowGuide(false);
  };

  // Living missions: re-sense, monitor, chat, runs
  const [resensing, setResensing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatTurn[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Custom (user-created) agents
  const [customOpen, setCustomOpen] = useState(false);
  const [customAgentsList, setCustomAgentsList] = useState<CustomAgent[]>([]);
  const [customCreating, setCustomCreating] = useState(false);
  const [customRunningId, setCustomRunningId] = useState<string | null>(null);

  // Temporal Vista forecasting
  const [forecasting, setForecasting] = useState(false);
  const handleForecast = async () => {
    if (!selectedMissionId) return;
    if (!authed) { requireAuth("Sign in to forecast futures — it runs the Oracle agent."); return; }
    setForecasting(true);
    try {
      const res = await fetch(`/api/missions/${selectedMissionId}/forecast`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({})
      });
      if (res.ok) {
        await fetchMissionData(selectedMissionId);
        if (handle) fetchProfile(handle);
      } else if (res.status === 401) {
        requireAuth("Your session expired — sign in to forecast.", "login");
      } else if (res.status === 402) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || "Not enough Green Credits to forecast.");
        setWalletOpen(true);
      }
    } catch (err) { console.error("Forecast failed:", err); }
    finally { setForecasting(false); }
  };
  const layoutSaveTimer = useRef<any>(null);

  // Edit Swarm (modify the live mission: goal, persona, targets, roster, cadence)
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Media Studio (Visualizer / Cinematographer)
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioSeed, setStudioSeed] = useState<string>("");

  // Mission planner (pick a strategic angle before deploying the swarm)
  const [showPlanner, setShowPlanner] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [planVariants, setPlanVariants] = useState<MissionPlanVariant[]>([]);
  const [planPrompt, setPlanPrompt] = useState("");
  const [planDeployingId, setPlanDeployingId] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      setNewPrompt(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Correction Override Form
  // Retained: several inspector/selection handlers still seed this with the
  // focused node's text, but the human-veto form that consumed it was removed.
  const [correctionContent, setCorrectionContent] = useState("");
  const [reweaving, setReweaving] = useState(false);

  // Interactive Live Canvas States (for Panning, Zooming, and Positioning)
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [canvasZoom, setCanvasZoom] = useState(0.8);
  const [isPanning, setIsPanning] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [nodeOffsets, setNodeOffsets] = useState<{ [nodeId: string]: { x: number; y: number } }>({});

  const panStartPos = useRef({ x: 0, y: 0 });
  const panStartOffset = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragNodeStartOffset = useRef({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // Focus reference maps
  const nodeRefMap = useRef<Map<string, HTMLDivElement>>(new Map());

  const selectedMission = missions.find(m => m.id === selectedMissionId) || missions[0];
  const missionRuns = selectedMission?.runs || [];
  // Which panel the docked inspector shows; most specific selection wins,
  // falling back to the always-useful Mission Pulse overview.
  const inspectorContent: "node" | "agent" | "chat" | "agents" | "pulse" =
    selectedNodeId ? "node" : focusedAgent ? "agent" : chatOpen ? "chat" : customOpen ? "agents" : "pulse";
  // Highlight nodes from the latest run only once a re-sense has happened.
  const newestRunId = missionRuns.length > 1 ? missionRuns[missionRuns.length - 1].id : null;
  const parentMission = selectedMission?.parent_id ? missions.find(m => m.id === selectedMission.parent_id) : undefined;

  const PERSONAS = [
    "Founder / Product Executive",
    "Competitive Strategist",
    "Engineering Lead / CTO",
    "VC / Investor",
    "Market Research Analyst"
  ];

  // Sync / Fetch hooks
  useEffect(() => {
    fetchMissions();
    fetchAgents();
    fetchConnectors();
    fetchLlmStatus();
    fetchLlmConfig();
    fetchPledges();
    fetchMe();

    // Sync theme class to document element
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.className = "bg-[#080b16] text-[#f2f1f9] antialiased";
    } else {
      document.documentElement.classList.remove("dark");
      document.body.className = "bg-[#f6f4fd] text-slate-800 antialiased";
    }
    
    try {
      localStorage.setItem("nebula-theme", theme);
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  // Swarm Pipeline Active Status Poll (Refreshes grid dynamically during reasoning)
  useEffect(() => {
    if (!selectedMissionId) return;
    
    fetchMissionData(selectedMissionId);

    if (selectedMission?.status === "ready") {
      if (handle) fetchProfile(handle); // pick up the mission's efficiency dividend
      // Enrich nodes into rich render components once per mission.
      if (selectedMissionId && !enrichedRef.current.has(selectedMissionId)) {
        enrichedRef.current.add(selectedMissionId);
        fetch(`/api/missions/${selectedMissionId}/enrich`, { method: "POST" })
          .then(r => (r.ok ? r.json() : null))
          .then(d => { if (d?.updated) fetchMissionData(selectedMissionId); })
          .catch(() => {});
      }
      return;
    }

    const interval = setInterval(() => {
      fetchMissions();
      fetchMissionData(selectedMissionId);
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedMissionId, selectedMission?.status]);

  // Apply persisted canvas layout once per mission selection.
  const appliedLayoutRef = useRef<string | null>(null);
  const enrichedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!selectedMissionId) return;
    if (appliedLayoutRef.current === selectedMissionId) return;
    const m = missions.find(x => x.id === selectedMissionId);
    if (m) {
      setNodeOffsets(m.layout || {});
      appliedLayoutRef.current = selectedMissionId;
    }
  }, [selectedMissionId, missions]);

  // Debounced layout save when the user rearranges nodes.
  useEffect(() => {
    if (!launched || !selectedMissionId) return;
    if (appliedLayoutRef.current !== selectedMissionId) return; // don't save before initial load
    clearTimeout(layoutSaveTimer.current);
    layoutSaveTimer.current = setTimeout(() => {
      fetch(`/api/missions/${selectedMissionId}/layout`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: nodeOffsets })
      }).catch(() => {});
    }, 900);
    return () => clearTimeout(layoutSaveTimer.current);
  }, [nodeOffsets, launched, selectedMissionId]);

  // Live monitor: auto re-sense on an interval while the workspace is open.
  useEffect(() => {
    if (!launched || !selectedMission?.monitoring || selectedMission?.status !== "ready") return;
    const everyMs = Math.max(10, selectedMission?.cadence || 45) * 1000;
    const iv = setInterval(() => { handleResense("monitor"); }, everyMs);
    return () => clearInterval(iv);
  }, [launched, selectedMission?.monitoring, selectedMission?.status, selectedMission?.cadence, selectedMissionId]);

  // Load chat when the panel opens or the mission changes.
  useEffect(() => {
    if (chatOpen && selectedMissionId) fetchChat(selectedMissionId);
    if (!chatOpen) setChatMessages([]);
  }, [chatOpen, selectedMissionId]);

  // Load custom agents when that panel opens or the mission changes.
  useEffect(() => {
    if (customOpen && selectedMissionId) fetchCustomAgents(selectedMissionId);
  }, [customOpen, selectedMissionId]);

  // Hook to attach global mouse handlers for super smooth Figma-like dragging/panning
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggingNodeId) {
        // Adjust for current scale/zoom ratio so movement tracks cursor precisely
        const dx = (e.clientX - dragStartPos.current.x) / canvasZoom;
        const dy = (e.clientY - dragStartPos.current.y) / canvasZoom;
        setNodeOffsets(prev => ({
          ...prev,
          [draggingNodeId]: {
            x: dragNodeStartOffset.current.x + dx,
            y: dragNodeStartOffset.current.y + dy
          }
        }));
      } else if (isPanning) {
        // For screen-space translation, map exactly to cursor delta
        const dx = (e.clientX - panStartPos.current.x);
        const dy = (e.clientY - panStartPos.current.y);
        setCanvasPan({
          x: panStartOffset.current.x + dx,
          y: panStartOffset.current.y + dy
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setDraggingNodeId(null);
      setIsPanning(false);
    };

    if (draggingNodeId || isPanning) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [draggingNodeId, isPanning, canvasZoom]);

  // Non-passive wheel zoom, bound via callback ref so it survives the
  // animated unmount/remount cycle when switching workspace lenses.
  const attachCanvasStage = (el: HTMLDivElement | null) => {
    const prev = canvasRef.current as (HTMLDivElement & { __wheel?: (e: WheelEvent) => void }) | null;
    if (prev?.__wheel) prev.removeEventListener("wheel", prev.__wheel);
    (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (el) {
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const zoomIntensity = 0.05;
        setCanvasZoom(z => Math.min(Math.max(z - e.deltaY * zoomIntensity * 0.01, 0.4), 2.5));
      };
      (el as HTMLDivElement & { __wheel?: (e: WheelEvent) => void }).__wheel = onWheel;
      el.addEventListener("wheel", onWheel, { passive: false });
    }
  };

  // API fetches
  const fetchMissions = async () => {
    try {
      const res = await fetch("/api/missions");
      if (res.ok) {
        const data = await res.json();
        setMissions(data);
      }
    } catch (err) {
      console.error("Failed to load missions list:", err);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents/status");
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (err) {
      console.error("Failed to fetch agents:", err);
    }
  };

  const fetchPledges = async () => {
    try {
      const res = await fetch("/api/pledges");
      if (res.ok) {
        const data = await res.json();
        setPledges(data.pledges || []);
        if (data.deployCost) setDeployCost(data.deployCost);
        if (data.minReserve) setMinReserve(data.minReserve);
      }
    } catch (err) {
      console.error("Failed to fetch pledges:", err);
    }
  };

  const fetchProfile = async (h: string | null) => {
    if (!h) return;
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(h)}`);
      if (res.ok) setProfile(await res.json());
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Restore an existing session on load (httpOnly cookie → profile).
  const fetchMe = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const p: Profile = await res.json();
        setProfile(p);
        setHandleState(p.handle);
      } else {
        setHandleState(null);
        setProfile(null);
      }
    } catch { /* offline — stay signed out */ }
  };

  // Called by the AuthModal on a successful signup/login.
  const onAuthed = (p: Profile) => {
    setProfile(p);
    setHandleState(p.handle);
    setAuthPrompt(null);
  };

  // Open the auth modal with an optional contextual reason.
  const requireAuth = (reason?: string, mode: "login" | "signup" = "signup") => {
    setAuthPrompt({ reason, mode });
  };

  const signOut = async () => {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    setHandleState(null);
    setProfile(null);
    setWalletOpen(false);
  };

  const claimPledge = async (pledgeId: string) => {
    if (!handle) { requireAuth("Create an account to start banking Green Credits."); return; }
    setClaimingPledgeId(pledgeId);
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(handle)}/pledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pledgeId })
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      } else if (res.status === 409) {
        await fetchProfile(handle); // already claimed today — resync
      } else if (res.status === 401) {
        requireAuth("Your session expired — sign in to continue.", "login");
      }
    } catch (err) {
      console.error("Failed to claim pledge:", err);
    } finally {
      setClaimingPledgeId(null);
    }
  };

  const fetchLlmStatus = async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        if (data?.llm?.providers) setLlmProviders(data.llm.providers);
      }
    } catch (err) {
      console.error("Failed to fetch LLM status:", err);
    }
  };

  // Open a mission into the live workspace (used by deploy, mission cards, selector).
  const launchMission = (missionId: string, mode: WorkspaceMode = "fabric2d") => {
    setSelectedMissionId(missionId);
    setSelectedNodeId(null);
    setFocusedAgent(null);
    setNodeOffsets({});
    setCanvasPan({ x: 0, y: 0 });
    setCanvasZoom(1.0);
    setWorkspaceMode(mode);
    setLaunched(true);
    setCurrentView("workspace");
  };

  const primaryProvider = llmProviders[0] || "Groq";

  const fetchMissionData = async (mid: string) => {
    try {
      const [fabricRes, eventsRes, briefRes, actionsRes] = await Promise.all([
        fetch(`/api/missions/${mid}/fabric`),
        fetch(`/api/missions/${mid}/events`),
        fetch(`/api/missions/${mid}/brief`),
        fetch(`/api/missions/${mid}/actions`)
      ]);

      if (fabricRes.ok) {
        const fabric = await fabricRes.json();
        setNodes(fabric.nodes);
        setEdges(fabric.edges);
      }
      if (eventsRes.ok) {
        setEvents(await eventsRes.json());
      }
      if (briefRes.ok) {
        setBrief(await briefRes.json());
      }
      if (actionsRes.ok) {
        setActions(await actionsRes.json());
      }
    } catch (err) {
      console.error("Failed to fetch mission specifications package:", err);
    }
  };

  // Step 1: user submits a generic prompt → ask the swarm to propose 3 angles.
  const handleDeployMission = async (e: FormEvent) => {
    e.preventDefault();
    const p = newPrompt.trim();
    if (!p) return;
    if (!authed) { requireAuth("Sign in to deploy a swarm — runs are paid in Green Credits."); return; }

    setPlanPrompt(p);
    setPlanVariants([]);
    setPlanDeployingId(null);
    setShowPlanner(true);
    setPlanLoading(true);
    try {
      const res = await fetch("/api/missions/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p, persona: selectedPersona })
      });
      if (res.ok) {
        const data = await res.json();
        setPlanVariants(Array.isArray(data.variants) ? data.variants : []);
      } else {
        setPlanVariants([]);
      }
    } catch (err) {
      console.error("Failed to plan mission angles:", err);
      setPlanVariants([]);
    } finally {
      setPlanLoading(false);
    }
  };

  // Step 2: user picks an angle (or runs as-is) → create the mission + launch swarm.
  const createAndLaunchMission = async (prompt: string, deployTag: string) => {
    setPlanDeployingId(deployTag);
    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt, persona: selectedPersona })
      });
      if (res.ok) {
        const createdMission = await res.json();
        await fetchMissions();
        // Credits are metered after the run finishes — refresh shortly after.
        if (handle) { fetchProfile(handle); setTimeout(() => fetchProfile(handle), 9000); }
        setNewPrompt("");
        setActiveTab("analysis");
        setShowPlanner(false);
        setPlanVariants([]);
        setPlanDeployingId(null);
        launchMission(createdMission.id, "fabric2d");
      } else if (res.status === 401) {
        setPlanDeployingId(null);
        setShowPlanner(false);
        requireAuth("Sign in to deploy a swarm.", "login");
      } else if (res.status === 402) {
        const err = await res.json().catch(() => ({}));
        if (handle) fetchProfile(handle);
        setPlanDeployingId(null);
        alert(err.error || "Not enough Green Credits. Earn more with eco-pledges on the dashboard.");
        setShowPlanner(false);
        setWalletOpen(true); // open the wallet so they can earn
      } else {
        setPlanDeployingId(null);
      }
    } catch (err) {
      console.error("Failed to deploy intelligence mission:", err);
      setPlanDeployingId(null);
    }
  };

  const closePlanner = () => {
    setShowPlanner(false);
    setPlanVariants([]);
    setPlanLoading(false);
    setPlanDeployingId(null);
  };

  // ─── Living missions: re-sense, monitor, chat, deep-dive, curation ──────────
  const handleResense = async (trigger: "resense" | "monitor" = "resense") => {
    if (!selectedMissionId) return;
    if (trigger === "resense" && !authed) { requireAuth("Sign in to re-sense — it runs the swarm again."); return; }
    if (trigger === "resense") setResensing(true);
    try {
      const res = await fetch(`/api/missions/${selectedMissionId}/resense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ trigger })
      });
      if (res.ok) {
        await fetchMissions();
        if (handle) { fetchProfile(handle); setTimeout(() => fetchProfile(handle), 9000); }
      } else if (res.status === 401 && trigger === "resense") {
        requireAuth("Your session expired — sign in to re-sense.", "login");
      } else if (res.status === 402 && trigger === "resense") {
        const e = await res.json().catch(() => ({}));
        alert(e.error || "Not enough Green Credits to re-sense. Earn more via eco-pledges.");
        setWalletOpen(true);
      }
    } catch (err) {
      console.error("Re-sense failed:", err);
    } finally {
      if (trigger === "resense") setResensing(false);
    }
  };

  // Save edits to the live mission spec (goal / persona / targets / roster / cadence).
  const handleSaveMissionSpec = async (patch: MissionPatch, resense: boolean) => {
    if (!selectedMissionId) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/missions/${selectedMissionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...patch, resense, handle })
      });
      if (res.ok) {
        await fetchMissions();
        if (selectedMissionId) await fetchMissionData(selectedMissionId);
        if (handle) fetchProfile(handle);
        setEditOpen(false);
      } else if (res.status === 402) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || "Not enough Green Credits to re-sense. Earn more via eco-pledges.");
      }
    } catch (err) {
      console.error("Failed to save mission spec:", err);
    } finally {
      setEditSaving(false);
    }
  };

  const toggleMonitor = async () => {
    if (!selectedMission) return;
    const next = !selectedMission.monitoring;
    try {
      await fetch(`/api/missions/${selectedMissionId}/monitoring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monitoring: next })
      });
      fetchMissions();
    } catch (err) {
      console.error("Failed to toggle monitor:", err);
    }
  };

  const fetchCustomAgents = async (mid: string) => {
    try {
      const res = await fetch(`/api/missions/${mid}/custom-agents`);
      if (res.ok) { const d = await res.json(); setCustomAgentsList(d.agents || []); }
    } catch (err) { console.error("Failed to load custom agents:", err); }
  };

  const createCustomAgent = async (name: string, instruction: string, icon: string) => {
    if (!selectedMissionId) return;
    setCustomCreating(true);
    try {
      const res = await fetch(`/api/missions/${selectedMissionId}/custom-agents`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, instruction, icon })
      });
      if (res.ok) await fetchCustomAgents(selectedMissionId);
    } catch (err) { console.error("Create custom agent failed:", err); }
    finally { setCustomCreating(false); }
  };

  const runCustomAgentClient = async (agentId: string) => {
    if (!selectedMissionId) return;
    if (!authed) { requireAuth("Sign in to run your agents — each run is metered in credits."); return; }
    setCustomRunningId(agentId);
    try {
      const res = await fetch(`/api/custom-agents/${agentId}/run`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({})
      });
      if (res.ok) {
        await fetchMissionData(selectedMissionId);
        await fetchCustomAgents(selectedMissionId);
        if (handle) fetchProfile(handle);
      } else if (res.status === 401) {
        requireAuth("Your session expired — sign in to run agents.", "login");
      } else if (res.status === 402) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || "Not enough Green Credits to run this agent.");
        setWalletOpen(true);
      }
    } catch (err) { console.error("Run custom agent failed:", err); }
    finally { setCustomRunningId(null); }
  };

  const deleteCustomAgent = async (agentId: string) => {
    try {
      const res = await fetch(`/api/custom-agents/${agentId}`, { method: "DELETE" });
      if (res.ok && selectedMissionId) fetchCustomAgents(selectedMissionId);
    } catch (err) { console.error("Delete custom agent failed:", err); }
  };

  const fetchChat = async (mid: string) => {
    try {
      const res = await fetch(`/api/missions/${mid}/chat`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load chat:", err);
    }
  };

  const askFabric = async (question: string) => {
    if (!selectedMissionId) return;
    if (!authed) { requireAuth("Sign in to ask the fabric — answers run a grounded model."); return; }
    // optimistic user turn
    setChatMessages(prev => [...prev, {
      id: `tmp-${Date.now()}`, mission_id: selectedMissionId, role: "user", content: question, created_at: new Date().toISOString()
    }]);
    setChatLoading(true);
    try {
      const res = await fetch(`/api/missions/${selectedMissionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question })
      });
      if (res.ok) {
        await fetchChat(selectedMissionId);
        if (handle) fetchProfile(handle);
      } else if (res.status === 401) {
        requireAuth("Your session expired — sign in to ask.", "login");
      } else if (res.status === 402) {
        const e = await res.json().catch(() => ({}));
        await fetchChat(selectedMissionId);
        alert(e.error || "Not enough Green Credits to ask. Earn more via eco-pledges.");
        setWalletOpen(true);
      }
    } catch (err) {
      console.error("Chat failed:", err);
    } finally {
      setChatLoading(false);
    }
  };

  const deepDive = async (seed: string) => {
    if (!selectedMissionId) return;
    if (!authed) { requireAuth("Sign in to spawn a deep-dive — it deploys a child swarm."); return; }
    const childPrompt = `Deep dive: ${seed} — a focused investigation branching from "${selectedMission?.prompt || ""}".`;
    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: childPrompt, persona: selectedPersona, parent_id: selectedMissionId })
      });
      if (res.ok) {
        const child = await res.json();
        await fetchMissions();
        if (handle) { fetchProfile(handle); setTimeout(() => fetchProfile(handle), 9000); }
        setChatOpen(false);
        launchMission(child.id, "fabric2d");
      } else if (res.status === 401) {
        requireAuth("Your session expired — sign in to deep-dive.", "login");
      } else if (res.status === 402) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || "Not enough Green Credits to spawn a deep-dive mission.");
        setWalletOpen(true);
      }
    } catch (err) {
      console.error("Deep-dive failed:", err);
    }
  };

  const patchNode = async (id: string, patch: any) => {
    try {
      const res = await fetch(`/api/nodes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      if (res.ok) fetchMissionData(selectedMissionId);
    } catch (err) {
      console.error("Failed to update node:", err);
    }
  };

  const removeNode = async (id: string) => {
    try {
      const res = await fetch(`/api/nodes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSelectedNodeId(null);
        fetchMissionData(selectedMissionId);
      }
    } catch (err) {
      console.error("Failed to delete node:", err);
    }
  };


  const handleTriggerReweave = async () => {
    if (!selectedMissionId) return;
    setReweaving(true);
    try {
      const res = await fetch(`/api/missions/${selectedMissionId}/reweave`, {
        method: "POST"
      });
      if (res.ok) {
        await fetchMissionData(selectedMissionId);
        setSelectedNodeId(null);
      }
    } catch (err) {
      console.error("Failed to re-weave nodes:", err);
    } finally {
      setReweaving(false);
    }
  };

  const handleApproveAction = async (actionId: string) => {
    try {
      const res = await fetch(`/api/actions/${actionId}/approve`, { method: "POST" });
      if (res.ok) {
        fetchMissionData(selectedMissionId);
      }
    } catch (err) {
      console.error("Failed to approve action:", err);
    }
  };

  const fetchConnectors = async () => {
    try {
      const r = await fetch("/api/connectors");
      if (r.ok) setConnectors(await r.json());
    } catch (err) { console.error("Failed to fetch connectors:", err); }
  };

  // Route an approved move into a connected tool (GitHub/Slack/Teams/Email/…).
  const routeAction = async (actionId: string, connectorId: string) => {
    setRoutingId(actionId);
    try {
      const r = await fetch(`/api/actions/${actionId}/route`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ connector: connectorId }),
      });
      if (r.ok && selectedMissionId) await fetchMissionData(selectedMissionId);
    } catch (err) { console.error("Failed to route action:", err); }
    finally { setRoutingId(null); }
  };

  const handleDismissAction = async (actionId: string) => {
    try {
      const res = await fetch(`/api/actions/${actionId}/dismiss`, { method: "POST" });
      if (res.ok) {
        fetchMissionData(selectedMissionId);
      }
    } catch (err) {
      console.error("Failed to dismiss action:", err);
    }
  };

  // Node position preset base lookup mapping 
  // ── Memory-fabric layout ──────────────────────────────────────────────────
  // The evidence board reads left → right as the swarm's pipeline: sensed
  // sources on the left, woven synthesis / flagged contradictions in the middle,
  // corrections and proposed outputs on the right. We compute this with
  // longest-path layering over the provenance edges (so every edge flows
  // forward) plus a barycenter sweep (so connected nodes line up and edges stop
  // crossing). One processed graph instead of a hand-placed tangle.
  const BOARD_W = 1320, BOARD_H = 800, COL_W = 300, ROW_GAP = 172;
  const graphLayout = React.useMemo(() => {
    const pos: Record<string, { x: number; y: number; layer: number }> = {};
    if (nodes.length === 0) return pos;

    const ids = new Set(nodes.map(n => n.id));
    const preds = new Map<string, string[]>();
    const succs = new Map<string, string[]>();
    nodes.forEach(n => { preds.set(n.id, []); succs.set(n.id, []); });
    edges.forEach(e => {
      if (ids.has(e.source) && ids.has(e.target) && e.source !== e.target) {
        preds.get(e.target)!.push(e.source);
        succs.get(e.source)!.push(e.target);
      }
    });

    // Longest-path layering (depth from any root), cycle-guarded.
    const layer = new Map<string, number>();
    const depth = (id: string, stack: Set<string>): number => {
      if (layer.has(id)) return layer.get(id)!;
      if (stack.has(id)) return 0;
      stack.add(id);
      let L = 0;
      for (const p of preds.get(id) || []) L = Math.max(L, depth(p, stack) + 1);
      stack.delete(id);
      layer.set(id, L);
      return L;
    };
    nodes.forEach(n => depth(n.id, new Set()));

    // Isolated nodes (no edges) fall back to a type-based column.
    const typeLayer = (n: WeaveNode) =>
      n.type === "synthesis" ? 1
      : (n.type === "correction" || n.type === "action" || n.type === "output") ? 2 : 0;
    nodes.forEach(n => {
      if ((preds.get(n.id)!.length === 0) && (succs.get(n.id)!.length === 0)) {
        layer.set(n.id, typeLayer(n));
      }
    });

    const maxLayer = Math.max(0, ...nodes.map(n => layer.get(n.id) || 0));
    const buckets: WeaveNode[][] = Array.from({ length: maxLayer + 1 }, () => []);
    nodes.forEach(n => buckets[layer.get(n.id) || 0].push(n));

    // Order within each column: column 0 by recency; later columns by the mean
    // row of their already-placed predecessors (barycenter), which untangles edges.
    const row = new Map<string, number>();
    buckets.forEach((bucket, L) => {
      if (L === 0) {
        bucket.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      } else {
        const bary = (n: WeaveNode) => {
          const ps = (preds.get(n.id) || []).map(p => row.get(p)).filter((v): v is number => v !== undefined);
          return ps.length ? ps.reduce((s, v) => s + v, 0) / ps.length : 1e6;
        };
        bucket.sort((a, b) => bary(a) - bary(b));
      }
      bucket.forEach((n, i) => row.set(n.id, i));
    });

    const startX = (BOARD_W - maxLayer * COL_W) / 2;
    buckets.forEach((bucket, L) => {
      const x = startX + L * COL_W;
      const colH = (bucket.length - 1) * ROW_GAP;
      bucket.forEach((n, i) => { pos[n.id] = { x, y: BOARD_H / 2 - colH / 2 + i * ROW_GAP, layer: L }; });
    });
    return pos;
  }, [nodes, edges]);

  const getNodePosition = (node: WeaveNode, index: number) => {
    const p = graphLayout[node.id];
    if (p) return { x: p.x, y: p.y };
    return { x: 200 + (index % 3) * COL_W, y: 200 + Math.floor(index / 3) * ROW_GAP };
  };

  // Computes base preset coordinates combined with user-dragged relative offsets 
  const getActualNodePosition = (node: WeaveNode, index: number) => {
    const base = getNodePosition(node, index);
    const offset = nodeOffsets[node.id] || { x: 0, y: 0 };
    return {
      x: base.x + offset.x,
      y: base.y + offset.y
    };
  };

  // Start drag of a single node block
  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return; // Left click only for interactive dragging
    setDraggingNodeId(nodeId);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const currentOffset = nodeOffsets[nodeId] || { x: 0, y: 0 };
    dragNodeStartOffset.current = { ...currentOffset };
  };

  // Start panning of the entire canvas board viewport
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't pan raw canvas if clicking on controls, text fields, lists, buttons, or custom cards
    if (target.closest('.no-pan') || target.closest('button') || target.closest('select') || target.closest('input') || target.closest('textarea')) {
      return;
    }
    setIsPanning(true);
    panStartPos.current = { x: e.clientX, y: e.clientY };
    panStartOffset.current = { ...canvasPan };
  };

  // Thread pulling calculations
  const isNodeHighlightedInThread = (nodeId: string) => {
    if (!hoveredSentenceId || !brief) return false;
    const sentence = brief.sentences.find(s => s.id === hoveredSentenceId);
    return sentence ? sentence.provenance.includes(nodeId) : false;
  };

  const isThreadPullingActive = () => {
    return selectedNodeId !== null || hoveredNodeId !== null || hoveredSentenceId !== null;
  };

  const isNodeFocused = (nodeId: string) => {
    if (!isThreadPullingActive()) return true;
    if (hoveredNodeId === nodeId || selectedNodeId === nodeId) return true;

    if (hoveredSentenceId && brief) {
      const sentence = brief.sentences.find(s => s.id === hoveredSentenceId);
      if (sentence && sentence.provenance.includes(nodeId)) return true;
    }

    const targetSourceId = hoveredNodeId || selectedNodeId;
    if (targetSourceId) {
      const hasConnection = edges.some(
        e =>
          (e.source === nodeId && e.target === targetSourceId) ||
          (e.target === nodeId && e.source === targetSourceId)
      );
      if (hasConnection) return true;
    }

    return false;
  };

  // A finding's trust at a glance: a plain Verified / Needs review / Resolved
  // badge derived from real signals (sources, conflicts, corrections) — no opaque
  // percentage. A conflict or a single uncorroborated source needs a second look.
  const nodeStatus = (node: WeaveNode): { tone: "emerald" | "amber" | "rose"; label: string; Icon: React.ComponentType<{ className?: string }> } => {
    if (node.type === "correction") return { tone: "emerald", label: "Resolved", Icon: CheckCircle2 };
    if (node.conflict || node.flagged_by === "sentinel") return { tone: "rose", label: "Conflict", Icon: GitCompareArrows };
    if (node.verified === false) return { tone: "amber", label: "Needs review", Icon: AlertTriangle };
    return { tone: "emerald", label: "Verified", Icon: CheckCircle2 };
  };

  // Source count for the "N sources" chip.
  const sourceCount = (node: WeaveNode) => Math.max(1, node.corroboration || (node.provenance?.length ? node.provenance.length : 1));

  // Tailwind classes for a status tone (chip or border-only).
  const TONE: Record<string, { chip: string; border: string }> = {
    emerald: { chip: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-400", border: "border-emerald-500/40" },
    amber: { chip: "text-amber-600 bg-amber-500/10 border-amber-500/30 dark:text-amber-400", border: "border-amber-500/40" },
    rose: { chip: "text-rose-600 bg-rose-500/10 border-rose-500/30 dark:text-rose-400", border: "border-rose-500/40" },
  };
  const toneChip = (tone: "emerald" | "amber" | "rose", borderOnly = false) => borderOnly ? TONE[tone].border : TONE[tone].chip;

  // Compact "2h ago" / "3d ago" freshness label for a timestamp.
  const timeAgo = (iso: string) => {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  // Pipeline execution monitor labels
  const getAgentWorkingLabel = (agentId: string) => {
    if (runningAgentId === agentId) return "working";
    if (!selectedMission) return "idle";
    const status = selectedMission.status;
    if (status === "sensing" && ["conductor", "pathfinder"].includes(agentId)) return "working";
    if (status === "reasoning" && ["veritas", "sentinel", "cartographer"].includes(agentId)) return "working";
    if (status === "synthesizing" && ["scribe", "oracle", "actor"].includes(agentId)) return "working";
    return "idle";
  };

  // Color theme mapping matrix
  const isDark = theme === "dark";
  // Skip entrance offsets for users who prefer reduced motion.
  const reduceMotion = useReducedMotion();

  const t = {
    bgCanvas: isDark ? "bg-[#080b16]" : "bg-[#f6f4fd]",
    bgContainer: isDark ? "bg-[#080b16] text-[#f2f1f9]" : "bg-[#f6f4fd] text-slate-800",
    bgHeader: isDark ? "border-white/[0.06]" : "border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
    bgRail: isDark ? "bg-[#070a13]/90 border-white/[0.06]" : "bg-[#fdfcff] border-slate-200/80",
    bgPane: isDark ? "bg-[#0a0d1a]/95 border-white/[0.06]" : "bg-white border-slate-200 shadow-[0_-4px_24px_rgba(15,23,42,0.05)]",
    bgSubBar: isDark ? "bg-[#080b16]/85 border-white/[0.06]" : "bg-[#fdfcff] border-slate-200/70",
    bgCard: isDark ? "bg-[#0c101f]/90 border-white/[0.06] text-gray-200 shadow-xl shadow-black/20" : "bg-white border-slate-200/90 text-slate-800 shadow-[0_4px_12px_rgba(15,23,42,0.04)]",
    textTitle: isDark ? "text-white" : "text-slate-900 font-semibold",
    textDesc: isDark ? "text-[#b9bdd4]" : "text-slate-600",
    textMute: isDark ? "text-[#9298b4]" : "text-slate-500",
    bgInner: isDark ? "bg-[#12172e]" : "bg-slate-50/90",
    borderTheme: isDark ? "border-white/[0.06]" : "border-slate-100",
    textOption: isDark ? "bg-[#12172e] text-[#f2f1f9]" : "bg-white text-slate-800",
    shadow: isDark ? "shadow-2xl shadow-indigo-500/5" : "shadow-md shadow-slate-200",
    glow: isDark ? "glow-bg" : "hidden",
    svgLines: isDark ? "#2b3357" : "#cfc9e4",
    gridOpacity: isDark ? "opacity-25" : "opacity-[0.05]"
  };

  return (
    <div className={`h-screen flex flex-col font-sans overflow-hidden transition-colors duration-300 ${t.bgContainer}`}>
      {/* Decorative Blur (only shown in dark mode context) */}
      <div className={t.glow}></div>

      {/* --- RE-ENGINEERED NAVBAR GLOBAL PANEL --- */}
      {!isMaximized && (
      <header className={`px-5 py-3 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b glass ${t.bgHeader}`}>
        {/* LOGO TITLE SECTION */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full holo-ring bg-luna-gradient flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Network className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h1 className={`text-lg font-bold tracking-tight flex items-center gap-2 font-display ${t.textTitle}`}>
              NEBULA<span className="text-gradient font-extrabold">X</span>
              <span className="text-[9px] font-mono tracking-widest text-violet-600 bg-violet-500/10 dark:text-luna-lavender dark:bg-white/[0.06] px-2 py-0.5 rounded-full uppercase font-medium border border-violet-500/20 dark:border-white/10">
                Team Fabric
              </span>
            </h1>
            <p className={`text-[10px] font-mono hidden 2xl:block ${t.textMute}`}>Autonomous Self-Correcting Web Intelligence Swarm</p>
          </div>
        </div>

        {/* INTER-VIEW CONTROLS TAB SWITCHER — LUNA floating pill */}
        <div className={`flex items-center gap-1 p-1 rounded-full border glass ${
          isDark ? "border-white/10" : "border-violet-500/10 shadow-sm"
        }`}>
          <button
            onClick={() => setCurrentView("home")}
            className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all duration-300 flex items-center gap-1.5 ${
              currentView === "home"
                ? (isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm")
                : (isDark ? "text-white/50 hover:text-white" : "text-slate-500 hover:text-slate-900")
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Overview
          </button>

          <button
            onClick={() => setCurrentView("workspace")}
            className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all duration-300 flex items-center gap-1.5 ${
              currentView === "workspace"
                ? (isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm")
                : (isDark ? "text-white/50 hover:text-white" : "text-slate-500 hover:text-slate-900")
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Workspace
          </button>

          {([
            { key: "how", label: "How It Works", Icon: BookOpen },
            { key: "agents", label: "The Team", Icon: Bot },
            { key: "usecases", label: "Use Cases", Icon: Compass },
            { key: "log", label: "Mission Log", Icon: History },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setCurrentView(key)}
              className={`hidden lg:flex text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all duration-300 items-center gap-1.5 ${
                currentView === key
                  ? (isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm")
                  : (isDark ? "text-white/50 hover:text-white" : "text-slate-500 hover:text-slate-900")
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* MISSION SELECTOR GATING CONTROL */}
        {currentView === "workspace" && launched && (
          <div className={`flex items-center gap-2 rounded-full border py-1.5 pl-3 pr-2 select-none glass ${
            isDark ? "border-white/10" : "border-violet-500/10"
          }`}>
            <button
              onClick={() => { setLaunched(false); setSelectedNodeId(null); setFocusedAgent(null); }}
              title="Back to Command Center"
              className={`flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors ${
                isDark ? "text-violet-300 hover:bg-white/10" : "text-violet-600 hover:bg-violet-50"
              }`}
            >
              <Plus className="w-3 h-3" /> New
            </button>
            <div className={`w-px h-4 ${isDark ? "bg-white/10" : "bg-slate-300"}`}></div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${selectedMission?.status === "ready" ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-bounce"}`}></div>
              <span className={`text-[10px] font-mono tracking-wider uppercase ${isDark ? "text-gray-400" : "text-slate-400"}`}>Focus:</span>
            </div>
            <select
              value={selectedMissionId || ""}
              onChange={e => launchMission(e.target.value, workspaceMode)}
              className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer pr-1 ${
                isDark ? "text-white" : "text-slate-800"
              }`}
            >
              {missions.map(m => (
                <option key={m.id} value={m.id} className={isDark ? "bg-[#12152a] text-[#f2f1f9]" : "bg-white text-slate-800"}>
                  {(m.parent_id ? "↳ " : "")}{m.prompt.substring(0, 34).replace(/"/g, '')}...
                </option>
              ))}
            </select>
          </div>
        )}

        {/* QUICK SEARCH DEPLOY FORM */}
        {currentView === "workspace" && launched && (
          <form onSubmit={handleDeployMission} className="flex-1 max-w-sm flex items-center gap-2">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? "text-gray-500" : "text-slate-400"}`} />
              <input
                type="text"
                placeholder="Launch search mission..."
                value={newPrompt}
                onChange={e => setNewPrompt(e.target.value)}
                className={`w-full border rounded-full py-1.5 pl-8 pr-8 text-xs focus:outline-none focus:border-violet-500 transition-colors font-sans glass ${
                  isDark ? "border-white/10 text-white placeholder-white/35" : "border-violet-500/10 text-slate-800 placeholder-slate-400"
                }`}
              />
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 transition-colors ${
                  isListening
                    ? "text-red-500 bg-red-500/10 hover:bg-red-500/20"
                    : isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                }`}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5 animate-pulse" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !newPrompt.trim()}
              className="bg-luna-gradient cta-luna text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Deploy
            </button>
          </form>
        )}

        {/* RIGHT ACTION CLUSTER — account · model · theme (kept as one unit) */}
        <div className="flex items-center gap-2 flex-shrink-0">
        {/* GREEN CREDITS WALLET CHIP / SIGN-IN */}
        {handle ? (
          <button
            onClick={() => setWalletOpen(true)}
            title={`${profile?.credits ?? 0} Green Credits · ${((profile?.totalCo2Saved_g ?? 0) / 1000).toFixed(2)} kg CO₂ saved — open wallet`}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-all cursor-pointer ${
              isDark ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20" : "border-emerald-500/30 bg-emerald-50 hover:bg-emerald-100"
            }`}
          >
            <WalletIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{profile?.credits ?? "…"}</span>
            <span className="text-[9px] font-mono text-emerald-600/70 dark:text-emerald-400/70 hidden sm:inline">cr</span>
          </button>
        ) : (
          <button
            onClick={() => requireAuth()}
            title="Sign in or create your Green account"
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-all cursor-pointer bg-luna-gradient cta-luna text-white text-xs font-bold"
          >
            <User className="w-3.5 h-3.5" />
            Sign in
          </button>
        )}

        {/* MODEL CONTROL CENTER */}
        <button
          onClick={() => setSettingsOpen(true)}
          title={activeEngine ? `Engine: ${activeEngine.provider} · ${activeEngine.model} — click to switch models or add API keys` : "Configure an AI model & API keys"}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all press glass ${
            isDark ? "border-white/10 hover:border-violet-500/50" : "border-violet-500/10 hover:border-violet-400"
          }`}
        >
          <CpuChip className={`w-3.5 h-3.5 ${activeEngine ? "text-indigo-400" : "text-amber-500"}`} />
          <span className="hidden md:flex flex-col items-start leading-none gap-0.5">
            <span className={`text-[10px] font-bold ${t.textTitle}`}>{activeEngine ? activeEngine.provider : "No model"}</span>
            <span className={`text-[8px] font-mono max-w-[110px] truncate ${t.textMute}`}>{activeEngine ? activeEngine.model : "add API key"}</span>
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${activeEngine ? "bg-emerald-400 animate-pulse" : "bg-amber-500"}`} />
        </button>

        {/* LIGHT/DARK MODE TOGGLE BUTTON */}
        <button
          onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
          className={`p-2 rounded-full border transition-all outline-none cursor-pointer press glass ${
            isDark ? "border-white/10 hover:border-white/25" : "border-violet-500/10 hover:border-violet-300"
          }`}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
        </div>
      </header>
      )}

      {/* --- VIEW 1: HOME PORTAL / EXPLAINER COCKPIT --- */}
      {currentView === "home" && (
        <main className="flex-1 overflow-y-auto relative">

          {/* ════ HERO — the night sky ════ */}
          <section className={`noise relative overflow-hidden ${isDark ? "" : "stage-glow"}`}>
            {/* sky layers */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {isDark && (
                <>
                  <div className="starfield" />
                  <div
                    className="starfield starfield-twinkle"
                    style={{ backgroundPosition: "140px 90px, 60px 160px, 200px 40px, 90px 220px, 30px 70px, 170px 130px, 240px 200px" }}
                  />
                </>
              )}
              {/* LUNA ambient glow blobs */}
              <div className="absolute top-[14%] left-[4%] w-[420px] h-[420px] bg-violet-500/[0.08] rounded-full blur-[150px]" />
              <div className="absolute top-[40%] right-[6%] w-[320px] h-[320px] bg-fuchsia-400/[0.06] rounded-full blur-[120px]" />
              {/* the moon herself */}
              <div className="moon float-deep absolute -top-8 right-[6%] w-32 h-32 md:w-44 md:h-44 hide-mobile" />
              {isDark && (
                <>
                  <span className="shooting-star top-[16%] right-[26%]" />
                  <span className="shooting-star top-[46%] right-[4%]" style={{ animationDelay: "4.6s", animationDuration: "11s" }} />
                </>
              )}
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 pt-14 md:pt-20 pb-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 flex flex-col gap-6">
                {/* status pills */}
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-2 flex-wrap"
                >
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase font-semibold glass border rounded-full px-3.5 py-1.5 w-fit ${
                    isDark ? "text-luna-lavender border-white/10" : "text-violet-700 border-violet-500/15"
                  }`}>
                    <Sparkles className="w-3.5 h-3.5" />
                    Agentic Web · Microsoft Build AI
                  </span>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono tracking-wider uppercase font-semibold glass border rounded-full px-3.5 py-1.5 w-fit ${
                    isDark ? "text-emerald-300 border-emerald-400/20" : "text-emerald-700 border-emerald-500/25"
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {llmProviders.length > 0 ? `${primaryProvider} swarm live` : "swarm online"}
                  </span>
                </motion.div>

                {/* headline — line-mask reveal */}
                <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] font-display">
                  <span className="block overflow-hidden">
                    <motion.span
                      className={`block ${t.textTitle}`}
                      initial={reduceMotion ? false : { y: "112%" }}
                      animate={{ y: 0 }}
                      transition={{ duration: 0.8, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                    >
                      The self-correcting
                    </motion.span>
                  </span>
                  <span className="block overflow-hidden">
                    <motion.span
                      className="block text-gradient pb-2"
                      initial={reduceMotion ? false : { y: "112%" }}
                      animate={{ y: 0 }}
                      transition={{ duration: 0.8, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    >
                      team-intelligence fabric
                    </motion.span>
                  </span>
                </h2>

                <motion.p
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className={`text-sm md:text-base leading-relaxed max-w-xl ${isDark ? "text-white/70" : "text-slate-600"}`}
                >
                  State a goal in plain language. An autonomous agent swarm senses the open web, maps each
                  finding into category lanes, reconciles conflicting sources, and turns the analysis into a
                  prototype and a build plan — with <span className={`font-semibold ${isDark ? "text-luna-lavender" : "text-violet-700"}`}>every claim traceable to its source.</span>
                </motion.p>

                {/* CTAs */}
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-wrap items-center gap-3"
                >
                  <button
                    type="button"
                    onClick={() => { setLaunched(false); setCurrentView("workspace"); }}
                    className="bg-luna-gradient cta-luna font-bold text-white text-sm px-7 py-3.5 rounded-full flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Rocket className="w-4 h-4" />
                    Launch a Mission
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  {missions[0] && (
                    <button
                      type="button"
                      onClick={() => launchMission(missions[0].id, "fabric2d")}
                      className={`text-sm font-semibold px-6 py-3.5 rounded-full border transition-all duration-300 flex items-center gap-2 ${
                        isDark ? "border-white/20 text-white hover:bg-white/10 hover:border-white/30" : "border-violet-500/25 text-slate-700 hover:bg-violet-500/5 hover:border-violet-500/40"
                      }`}
                    >
                      <Network className="w-4 h-4 text-violet-500" />
                      See a live example
                    </button>
                  )}
                </motion.div>

                {/* trust badges */}
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.52, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-wrap gap-2.5"
                >
                  {[
                    { Icon: ShieldCheck, label: "Every claim sourced" },
                    { Icon: RefreshCw, label: "Self-healing memory" },
                    { Icon: Sparkles, label: "Zero-setup demo" },
                  ].map((b) => (
                    <span
                      key={b.label}
                      className={`glass border rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        isDark ? "text-white/45 border-white/10" : "text-slate-500 border-violet-500/10"
                      }`}
                    >
                      <b.Icon className="w-3 h-3" />
                      {b.label}
                    </span>
                  ))}
                </motion.div>

                {/* LIVE METRICS STRIP */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Active Missions", value: String(missions.length), icon: Compass, color: isDark ? "text-violet-400" : "text-violet-600" },
                    { label: "Specialist Agents", value: String(agents.length || 8), icon: Bot, color: isDark ? "text-cyan-400" : "text-cyan-600" },
                    { label: "AI Providers", value: String(llmProviders.length || 3), icon: Layers, color: isDark ? "text-fuchsia-400" : "text-fuchsia-600" },
                    { label: "Cross-checked", value: "every finding", icon: ShieldCheck, color: isDark ? "text-emerald-400" : "text-emerald-600" },
                  ].map((m, i) => (
                    <motion.div
                      key={m.label}
                      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.6 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      className={`rounded-2xl border p-4 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-white/80 border-violet-500/10"}`}
                    >
                      <m.icon className={`w-4 h-4 mb-1.5 ${m.color}`} />
                      <div className={`text-2xl font-extrabold tracking-tight font-display tabular ${t.textTitle}`}>{m.value}</div>
                      <div className={`text-[9px] font-mono uppercase tracking-wider ${isDark ? "text-white/35" : "text-slate-400"}`}>{m.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* RIGHT SIDE: GREEN CREDITS — earn compute by cutting real emissions */}
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.85, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 lg:col-span-5"
              >
                <div className="absolute -inset-3 bg-luna-gradient opacity-[0.18] blur-2xl rounded-[2.5rem] pointer-events-none" />
                <div className={`relative h-[380px] rounded-[2rem] overflow-hidden border flex flex-col glass shadow-2xl ${
                  isDark ? "border-white/10" : "border-violet-500/15"
                }`}>
                  <GreenCredits
                    isDark={isDark}
                    handle={handle}
                    profile={profile}
                    pledges={pledges}
                    deployCost={deployCost}
                    loading={profileLoading}
                    claimingId={claimingPledgeId}
                    onAuth={() => requireAuth()}
                    onOpenWallet={() => setWalletOpen(true)}
                    onClaim={claimPledge}
                  />
                </div>
              </motion.div>
            </div>

            {/* hairline + capability marquee */}
            <div className="relative z-10 max-w-7xl mx-auto px-6">
              <div className="h-px hairline-gradient" />
            </div>
            <div className="relative z-10 marquee py-5">
              <div className="marquee-track items-center">
                {[0, 1].map((dup) => (
                  <div key={dup} className="flex items-center gap-3 pr-3" aria-hidden={dup === 1}>
                    {[
                      "Provenance-linked claims",
                      "Cross-source verification",
                      "Side-by-side comparisons",
                      "11 specialist agents",
                      "Conflict resolution",
                      "Analyze → prototype → build",
                      "Connect GitHub, Azure, Jira",
                      "Temporal forecasts",
                      "Green compute credits",
                    ].map((cap) => (
                      <span
                        key={cap}
                        className={`flex items-center gap-2 whitespace-nowrap glass border rounded-full px-4 py-1.5 text-[11px] font-mono ${
                          isDark ? "text-white/50 border-white/[0.07]" : "text-slate-500 border-violet-500/10"
                        }`}
                      >
                        <span className="w-1 h-1 rounded-full bg-luna-gradient" />
                        {cap}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ════ SECTION: OPERATION PROTOCOL ════ */}
          <section className="relative max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col gap-10">
            <div className="scroll-reveal max-w-2xl">
              <div className={`text-[11px] font-bold tracking-[0.2em] uppercase mb-3 ${isDark ? "text-luna-lavender" : "text-violet-700"}`}>
                Operation Protocol
              </div>
              <h3 className={`text-3xl md:text-5xl font-bold tracking-tight ${t.textTitle}`}>
                How the swarm <span className="text-gradient">earns your trust</span>
              </h3>
              <p className={`text-sm mt-3 max-w-xl leading-relaxed ${isDark ? "text-white/60" : "text-slate-600"}`}>
                Each specialist owns one analytical job, and every output carries the receipts to prove it worked.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* CARD 1: WHAT THEY DO - AGENT ROLES */}
              <div className={`group scroll-reveal p-8 rounded-[2.5rem] border transition-all duration-500 flex flex-col gap-4 bg-gradient-to-br ${
                isDark
                  ? "from-violet-500/10 to-transparent bg-white/[0.03] border-white/5 hover:border-white/15"
                  : "from-violet-500/[0.06] to-transparent bg-white border-violet-500/10 shadow-lg shadow-violet-500/5 hover:shadow-xl"
              }`}>
                <div className={`w-14 h-14 rounded-2xl glass border flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ${
                  isDark ? "border-white/10" : "border-violet-500/15"
                }`}>
                  <Cpu className={`w-6 h-6 ${isDark ? "text-violet-400" : "text-violet-600"}`} />
                </div>
                <h4 className={`text-lg font-bold font-display ${t.textTitle}`}>What do they do?</h4>

                <p className={`text-xs leading-relaxed ${isDark ? "text-white/60" : "text-slate-600"}`}>
                  A team of specialists, each owning one job, hands work down the line — sense, verify, compare, then build:
                </p>

                <ul className="text-xs flex flex-col gap-2.5 list-none font-sans mt-1">
                  <li className="flex gap-2.5 items-start">
                    <span className={`font-bold font-mono ${isDark ? "text-violet-400" : "text-violet-600"}`}>1.</span>
                    <div>
                      <span className={`font-semibold block ${t.textTitle}`}>Scout — Sensing</span>
                      <span className={`text-[11px] ${isDark ? "text-white/50" : "text-slate-500"}`}>Browses the live web and reads real pages, pulling back the data behind each finding.</span>
                    </div>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <span className={`font-bold font-mono ${isDark ? "text-violet-400" : "text-violet-600"}`}>2.</span>
                    <div>
                      <span className={`font-semibold block ${t.textTitle}`}>Fact-checker — Verifying</span>
                      <span className={`text-[11px] ${isDark ? "text-white/50" : "text-slate-500"}`}>Cross-checks each finding across sources and marks it Verified or Needs review.</span>
                    </div>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <span className={`font-bold font-mono ${isDark ? "text-violet-400" : "text-violet-600"}`}>3.</span>
                    <div>
                      <span className={`font-semibold block ${t.textTitle}`}>Mapper &amp; Synthesist — Comparing</span>
                      <span className={`text-[11px] ${isDark ? "text-white/50" : "text-slate-500"}`}>Tags every finding into a category, lays the Flow into lanes, and builds the side-by-side read.</span>
                    </div>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <span className={`font-bold font-mono ${isDark ? "text-violet-400" : "text-violet-600"}`}>4.</span>
                    <div>
                      <span className={`font-semibold block ${t.textTitle}`}>Architect &amp; Builder — Shipping</span>
                      <span className={`text-[11px] ${isDark ? "text-white/50" : "text-slate-500"}`}>Turns the analysis into ranked moves, routed into GitHub, Slack, Teams, Email and your dashboards.</span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* CARD 2: Drift detection Sentinel */}
              <div className={`group scroll-reveal p-8 rounded-[2.5rem] border transition-all duration-500 flex flex-col gap-4 bg-gradient-to-br ${
                isDark
                  ? "from-fuchsia-400/10 to-transparent bg-white/[0.03] border-white/5 hover:border-white/15"
                  : "from-fuchsia-400/[0.07] to-transparent bg-white border-violet-500/10 shadow-lg shadow-violet-500/5 hover:shadow-xl"
              }`}>
                <div className={`w-14 h-14 rounded-2xl glass border flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ${
                  isDark ? "border-white/10" : "border-violet-500/15"
                }`}>
                  <ShieldAlert className={`w-6 h-6 ${isDark ? "text-fuchsia-400" : "text-fuchsia-600"}`} />
                </div>
                <h4 className={`text-lg font-bold font-display ${t.textTitle}`}>It catches when sources disagree</h4>

                <p className={`text-xs leading-relaxed ${isDark ? "text-white/60" : "text-slate-600"}`}>
                  How does the system stay trustworthy when web reports contradict each other?
                </p>

                <div className="text-xs flex flex-col gap-3">
                  <div className={`rounded-2xl p-3 text-[11px] border ${isDark ? "bg-amber-500/5 border-amber-500/15" : "bg-amber-500/5 border-amber-500/20"}`}>
                    <span className="font-semibold text-amber-600 dark:text-amber-400 block mb-1">🎯 Conflicts surfaced, not hidden</span>
                    The <span className="font-bold">Reviewer</span> compares findings across sources. When two sources disagree — a public claim against the fine print — it surfaces an <span className="text-rose-400 font-bold">open conflict</span> and marks the findings "needs review" instead of pretending they agree.
                  </div>

                  <div className={`rounded-2xl p-3 text-[11px] border ${isDark ? "bg-emerald-500/5 border-emerald-500/15" : "bg-emerald-500/5 border-emerald-500/20"}`}>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">🛠 One line resolves it</span>
                    Add a one-line correction and the conflict flips to "resolved" — the finding becomes verified and the read updates across the board.
                  </div>
                </div>
              </div>

              {/* CARD 3: MEASURING METHOD / HOW TO CONFIRM */}
              <div className={`group scroll-reveal p-8 rounded-[2.5rem] border transition-all duration-500 flex flex-col gap-4 bg-gradient-to-br ${
                isDark
                  ? "from-cyan-400/10 to-transparent bg-white/[0.03] border-white/5 hover:border-white/15"
                  : "from-cyan-400/[0.08] to-transparent bg-white border-violet-500/10 shadow-lg shadow-violet-500/5 hover:shadow-xl"
              }`}>
                <div className={`w-14 h-14 rounded-2xl glass border flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ${
                  isDark ? "border-white/10" : "border-violet-500/15"
                }`}>
                  <ShieldCheck className={`w-6 h-6 ${isDark ? "text-cyan-400" : "text-cyan-600"}`} />
                </div>
                <h4 className={`text-lg font-bold font-display ${t.textTitle}`}>How to measure if they are working?</h4>

                <p className={`text-xs leading-relaxed ${isDark ? "text-white/60" : "text-slate-600"}`}>
                  You can inspect and confirm agent performance dynamically inside the workspaces:
                </p>

                <ul className="text-xs flex flex-col gap-2 list-none font-sans mt-1">
                  <li className="flex gap-2 items-start">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold uppercase flex-shrink-0 ${isDark ? "text-cyan-300 bg-cyan-400/10" : "text-cyan-700 bg-cyan-500/10"}`}>1. Rails</span>
                    <span className={`text-[11px] ${isDark ? "text-white/50" : "text-slate-500"}`}>Review the left <span className="font-semibold">Swarm Active Monitor Rails</span> to verify which agent is actively chewing tasks.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold uppercase flex-shrink-0 ${isDark ? "text-cyan-300 bg-cyan-400/10" : "text-cyan-700 bg-cyan-500/10"}`}>2. Thread</span>
                    <span className={`text-[11px] ${isDark ? "text-white/50" : "text-slate-500"}`}>Hover summary sentences to track citations. If nodes glow, you have active trace pathways connected.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold uppercase flex-shrink-0 ${isDark ? "text-cyan-300 bg-cyan-400/10" : "text-cyan-700 bg-cyan-500/10"}`}>3. Streams</span>
                    <span className={`text-[11px] ${isDark ? "text-white/50" : "text-slate-500"}`}>Examine the <span className="font-semibold">Chronological Operations Log Stream</span> at the bottom to see live event payloads and timestamps.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold uppercase flex-shrink-0 ${isDark ? "text-cyan-300 bg-cyan-400/10" : "text-cyan-700 bg-cyan-500/10"}`}>4. Re-weave</span>
                    <span className={`text-[11px] ${isDark ? "text-white/50" : "text-slate-500"}`}>Hit <span className="font-semibold">Re-sense</span> and watch the board update as the Reviewer re-checks sources. If findings flip between Verified and Needs review, the pipeline is alive!</span>
                  </li>
                </ul>
              </div>

            </div>
          </section>

          {/* ════ SECTION: LIVE MISSIONS GALLERY ════ */}
          <section className="relative max-w-7xl mx-auto px-6 pb-16 md:pb-24 flex flex-col gap-8">
            <div className="scroll-reveal">
              <div className={`text-[11px] font-bold tracking-[0.2em] uppercase mb-3 ${isDark ? "text-luna-lavender" : "text-violet-700"}`}>
                Live Operations
              </div>
              <h3 className={`text-3xl md:text-4xl font-bold tracking-tight ${t.textTitle}`}>
                Currently deployed <span className="text-gradient">swarm missions</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Render dynamic missions from database state */}
              {missions.map(mission => {
                const lastRun = mission.runs?.[mission.runs.length - 1];
                const freshSignals = (mission.runs?.length || 0) > 1 ? (lastRun?.newSignals || 0) : 0;
                return (
                  <div
                    key={mission.id}
                    className={`scroll-reveal p-6 rounded-[2rem] border flex flex-col justify-between gap-4 select-none card-hover cursor-pointer noise relative overflow-hidden ${
                      isDark ? "bg-white/[0.03] border-white/[0.07]" : "bg-white border-violet-500/10 shadow-lg shadow-violet-500/5"
                    } ${selectedMissionId === mission.id ? "ring-2 ring-violet-500" : ""}`}
                    onClick={() => launchMission(mission.id, "fabric2d")}
                  >
                    <div className="relative z-10 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[10px] font-mono leading-none">
                        <span className={`font-bold uppercase ${isDark ? "text-luna-lavender" : "text-violet-600"}`}>Mission ID: {mission.id.split("-").pop()}</span>
                        <span className="flex items-center gap-1.5">
                          {freshSignals > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full font-bold bg-emerald-500 text-white animate-pulse" title={`${freshSignals} new signal(s) since the previous run`}>
                              +{freshSignals} new
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                            mission.status === "ready" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                          }`}>
                            {mission.status}
                          </span>
                        </span>
                      </div>

                      <h4 className={`text-sm font-bold tracking-tight line-clamp-2 ${t.textTitle}`}>
                        "{mission.prompt}"
                      </h4>
                      <p className={`text-[11px] line-clamp-2 leading-relaxed ${isDark ? "text-white/45" : "text-slate-500"}`}>
                        Target Watchlist Entities: {mission.targets.join(", ")}
                      </p>
                    </div>

                    <div className={`flex items-center justify-between text-[11px] font-mono border-t pt-3 ${isDark ? "border-white/[0.06]" : "border-violet-500/10"}`}>
                      <div className={`flex items-center gap-1 ${isDark ? "text-white/35" : "text-slate-400"}`}>
                        <Clock className="w-3 h-3" />
                        <span>{new Date(mission.created_at).toLocaleDateString()}</span>
                      </div>

                      <span className={`font-bold flex items-center gap-1 hover:underline ${isDark ? "text-violet-400" : "text-violet-600"}`}>
                        Launch Workspace
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* STATS SUMMARY BOX FOR FAST VERIFICATION */}
              <div className={`scroll-reveal p-6 rounded-[2rem] border flex flex-col justify-between bg-gradient-to-br ${
                isDark ? "from-violet-500/15 via-transparent to-fuchsia-400/10 border-violet-500/20" : "from-violet-500/[0.07] via-transparent to-fuchsia-400/[0.06] border-violet-500/15 shadow-lg shadow-violet-500/5"
              }`}>
                <div className="flex flex-col gap-1">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-widest block ${isDark ? "text-luna-lavender" : "text-violet-600"}`}>System Diagnostics</span>
                  <h4 className={`text-sm font-bold flex items-center gap-1.5 ${t.textTitle}`}>
                    <PulseIcon className="w-4 h-4 text-emerald-500 animate-pulse" />
                    Live system status
                  </h4>
                  <p className={`text-[11px] leading-snug ${isDark ? "text-white/50" : "text-slate-500"}`}>
                    The Scout, Fact-checker and Reviewer are in sync: findings are being fetched, cross-checked and compared across sources.
                  </p>
                </div>

                <div className={`grid grid-cols-2 gap-2 mt-2 pt-2 border-t font-mono text-xs ${isDark ? "border-white/[0.06]" : "border-violet-500/10"}`}>
                  <div>
                    <span className={`text-[10px] block pb-0.5 ${isDark ? "text-white/35" : "text-slate-400"}`}>Verification:</span>
                    <span className="font-bold text-emerald-500">Cross-source</span>
                  </div>
                  <div>
                    <span className={`text-[10px] block pb-0.5 ${isDark ? "text-white/35" : "text-slate-400"}`}>Conflicts:</span>
                    <span className={`font-bold ${isDark ? "text-violet-400" : "text-violet-600"}`}>Surfaced & resolvable</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* ════ CLOSING CTA ════ */}
          <section className="relative overflow-hidden">
            {isDark && <div className="starfield opacity-60" />}
            <div className="relative z-10 max-w-3xl mx-auto px-6 pb-20 md:pb-28 pt-2 text-center flex flex-col items-center gap-6 scroll-reveal">
              <div className="w-12 h-1 rounded-full bg-luna-gradient" />
              <h3 className={`text-3xl md:text-5xl font-bold tracking-tight ${t.textTitle}`}>
                Give your team a <span className="text-gradient">second brain</span>
              </h3>
              <p className={`text-sm md:text-base max-w-md leading-relaxed ${isDark ? "text-white/60" : "text-slate-600"}`}>
                One sentence in. A verified, source-linked intelligence fabric out — watching the web while you work.
              </p>
              <button
                type="button"
                onClick={() => { setLaunched(false); setCurrentView("workspace"); }}
                className="bg-luna-gradient cta-luna font-bold text-white text-sm px-8 py-4 rounded-full flex items-center gap-2 cursor-pointer"
              >
                <Rocket className="w-4 h-4" />
                Deploy your first swarm
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>

        </main>
      )}

      {/* --- EXPLAINER PAGES --- */}
      {currentView === "how" && <HowItWorksPage isDark={isDark} onLaunch={goLaunch} />}
      {currentView === "agents" && <AgentsPage isDark={isDark} onLaunch={goLaunch} />}
      {currentView === "usecases" && <UseCasesPage isDark={isDark} onLaunch={goLaunch} />}
      {currentView === "log" && <MissionLog isDark={isDark} missions={missions} onOpen={(id) => launchMission(id, "fabric2d")} />}

      {/* --- VIEW 2A: WORKSPACE COMMAND CENTER (shown until a mission is opened) --- */}
      {currentView === "workspace" && !launched && (
        <main className="flex-1 relative overflow-y-auto flex flex-col items-center justify-start px-4 pt-20 md:pt-28 pb-16">
          {/* night-sky backdrop */}
          {isDark && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="starfield" />
              <div className="aurora absolute top-1/4 left-1/3 w-[480px] h-[480px] rounded-full bg-violet-600/15 blur-3xl" />
              <div className="aurora absolute bottom-1/4 right-1/3 w-[420px] h-[420px] rounded-full bg-fuchsia-400/10 blur-3xl" style={{ animationDelay: "-8s" }} />
              <span className="shooting-star top-[18%] right-[20%]" style={{ animationDelay: "2.2s" }} />
            </div>
          )}

          <div className="relative w-full flex flex-col items-center gap-8">
            <CommandConsole
              isDark={isDark}
              value={newPrompt}
              onChange={setNewPrompt}
              onSubmit={handleDeployMission}
              isSubmitting={isSubmitting}
              isListening={isListening}
              onVoice={handleVoiceInput}
              persona={selectedPersona}
              setPersona={setSelectedPersona}
              personas={PERSONAS}
              suggestions={[
                "Compare Razorpay, Cashfree and PayU on pricing, settlement and contract terms",
                "Map a rival's moves across finance, product, marketing and hiring",
                "Audit our checkout's tech stack — surface gaps and what to build next"
              ]}
            />

            {/* Resume an existing mission */}
            {missions.length > 0 && (
              <div className="w-full max-w-3xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-mono uppercase tracking-widest ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                    Or resume an active mission
                  </span>
                  <div className={`flex-1 h-px ${isDark ? "bg-white/5" : "bg-slate-200"}`} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {missions.slice(0, 6).map(m => (
                    <button
                      key={m.id}
                      onClick={() => launchMission(m.id, "fabric2d")}
                      className={`text-left p-4 rounded-2xl border transition-all duration-300 group hover:-translate-y-0.5 glass ${
                        isDark ? "border-white/[0.07] hover:border-violet-500/40" : "border-violet-500/10 hover:border-violet-400 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-mono font-bold text-violet-500 uppercase">{m.id.split("-").pop()}</span>
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                          m.status === "ready" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                        }`}>{m.status}</span>
                      </div>
                      <p className={`text-[11.5px] font-semibold leading-snug line-clamp-2 ${isDark ? "text-gray-200" : "text-slate-800"}`}>
                        {m.prompt}
                      </p>
                      <span className="text-[10px] font-mono text-violet-500 flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        Open workspace <ArrowRight className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      {/* --- VIEW 2B: FULL SCHEMA SWARM INTERACTIVE WORKSPACE --- */}
      {currentView === "workspace" && launched && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative select-none">
          
          {/* --- LEFT SIDE: LIVE AGENT STATUS RAIL --- */}
          {!isMaximized && (
          <aside data-tour="rail" className={`w-full md:w-44 px-2.5 py-3 flex flex-row md:flex-col gap-2 justify-start items-stretch border-r overflow-x-auto md:overflow-y-auto select-none ${t.bgRail}`}>
            <div className="flex items-center gap-2 pb-2 md:border-b border-slate-200/50 dark:border-white/5 px-1 flex-shrink-0 select-none">
              <Bot className="w-4 h-4 text-indigo-400" />
              <span className={`text-[10px] font-mono tracking-widest uppercase font-bold ${t.textMute}`}>
                Agent Swarm
              </span>
            </div>

            <div className="flex flex-row md:flex-col gap-1.5 w-full flex-shrink-0">
              {agents.map((a, ai) => {
                const currentWork = getAgentWorkingLabel(a.id);
                const isWorking = currentWork === "working" || runningAgentId === a.id;
                const isFocused = focusedAgent?.id === a.id;
                const AgentIcon = AGENT_ICONS[a.id] || Bot;
                const rosterOff = !!(selectedMission?.agents && selectedMission.agents.length && !selectedMission.agents.includes(a.id));

                // Live "what it's doing" — newest event emitted by this agent.
                const liveEvent = [...events].reverse().find(
                  e => e.sender.toLowerCase() === a.id.toLowerCase() || e.sender.toLowerCase() === a.name.toLowerCase()
                );

                let completeLabel = "Standing by";
                if (selectedMission?.status === "ready") {
                  if (a.id === "conductor") completeLabel = "Plan ready";
                  else if (a.id === "pathfinder") completeLabel = "Sources fetched";
                  else if (a.id === "analyst") completeLabel = "Data extracted";
                  else if (a.id === "veritas") completeLabel = "Cross-checked";
                  else if (a.id === "cartographer") completeLabel = "Map linked";
                  else if (a.id === "sentinel") completeLabel = "No open conflicts";
                  else if (a.id === "oracle") completeLabel = "Comparison ready";
                  else if (a.id === "scribe") completeLabel = "Brief cited";
                  else if (a.id === "actor") completeLabel = "Actions drafted";
                  else if (a.id === "architect") completeLabel = "Gaps mapped";
                  else if (a.id === "builder") completeLabel = "Build plan ready";
                }
                const subLine = isWorking ? (liveEvent?.message || a.task) : (liveEvent?.message || completeLabel);
                const nodesByAgent = nodes.filter(n => n.source.toLowerCase().includes(a.id)).length;

                return (
                  <motion.button
                    key={a.id}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: ai * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => {
                      setSelectedNodeId(null); setChatOpen(false); setCustomOpen(false);
                      setFocusedAgent(isFocused ? null : a);
                    }}
                    title={rosterOff ? `${a.name} is OFF for this swarm — enable it in Edit Swarm` : `${a.name}: ${a.task} — click to open console`}
                    className={`flex flex-col gap-1 p-2 rounded-xl border text-left transition-all relative cursor-pointer select-none overflow-hidden min-w-[148px] md:min-w-0 press ${
                      isWorking ? "agent-working" : ""
                    } ${rosterOff ? "opacity-40 grayscale" : ""} ${
                      isFocused
                        ? "bg-indigo-600/10 border-indigo-500/70 ring-1 ring-indigo-500/35 shadow-lg shadow-indigo-500/10"
                        : isWorking
                        ? "bg-indigo-500/10 border-indigo-500/50"
                        : "bg-black/5 border-slate-200 dark:bg-white/[0.02] dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/15"
                    }`}
                  >
                    {/* Active Laser Sweep */}
                    {isWorking && (
                      <div className="absolute inset-x-0 h-[1.5px] bg-indigo-400/80 animate-scanner pointer-events-none" />
                    )}

                    <div className="flex items-center gap-2 select-none">
                      {/* agent avatar with status ring */}
                      <span className="relative flex-shrink-0">
                        <span
                          className={`relative w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                            isWorking
                              ? "bg-indigo-500 text-white"
                              : selectedMission?.status === "ready"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : isDark ? "bg-white/5 text-gray-400" : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          <AgentIcon className="w-3.5 h-3.5" />
                        </span>
                        {isWorking && (
                          <span className="absolute -inset-[3px] rounded-lg border-2 border-transparent border-t-indigo-400 spin-ring pointer-events-none" />
                        )}
                      </span>
                      <span className={`text-[11px] font-bold font-display truncate flex-1 ${t.textTitle}`}>
                        {a.name}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          isWorking
                            ? "bg-indigo-400 animate-ping"
                            : selectedMission?.status === "ready"
                            ? "bg-emerald-400 animate-pulse"
                            : "bg-slate-400/70"
                        }`}
                      />
                    </div>

                    <p className={`text-[8.5px] leading-snug line-clamp-2 min-h-[20px] ${
                      isWorking ? "text-indigo-500 dark:text-indigo-300 font-semibold" : t.textMute
                    }`}>
                      {subLine}
                    </p>
                    {nodesByAgent > 0 && (
                      <span className={`text-[7.5px] font-mono tabular ${t.textMute}`}>{nodesByAgent} node{nodesByAgent > 1 ? "s" : ""} woven</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </aside>
          )}

          {/* --- MAIN CENTER: VIEWPORT, CANVAS AND GRAPH PANEL --- */}
          <main className={`flex-1 flex flex-col min-w-0 ${t.bgCanvas} overflow-hidden relative ${isMaximized ? 'bg-[#080b16] dark:bg-[#080b16] z-[100]' : ''}`} ref={workspaceContainerRef}>

            {/* STATIC SUBBAR STATUS NOTIFIER */}
            {!isMaximized && (
            <section className={`px-3 py-1.5 flex items-center justify-between gap-3 z-10 text-xs border-b glass ${t.bgSubBar}`}>
              {/* mission focus + run history */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {parentMission && (
                  <button
                    onClick={() => launchMission(parentMission.id, workspaceMode)}
                    title={`Deep-dive of: ${parentMission.prompt}`}
                    className="flex-shrink-0 flex items-center gap-1 text-[10px] font-mono text-fuchsia-500 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded px-1.5 py-0.5 hover:bg-fuchsia-500/20"
                  >
                    <FlaskConical className="w-3 h-3" />
                    deep-dive ↑
                  </button>
                )}
                <Crosshair className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 hidden sm:block" />
                <span className={`font-bold truncate font-display ${t.textTitle}`} title={selectedMission?.prompt}>
                  {selectedMission?.prompt}
                </span>
                {/* run timeline strip: one dot per sensing pass */}
                {missionRuns.length > 0 && (
                  <span className="hidden xl:flex items-center gap-1 flex-shrink-0 pl-1" title={missionRuns[missionRuns.length - 1]?.summary || "Run history"}>
                    {missionRuns.slice(-8).map((r, i) => (
                      <span
                        key={r.id}
                        title={`Run ${r.index} · ${r.trigger} · ${r.newSignals} new signal(s)`}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          i === Math.min(missionRuns.length, 8) - 1 ? "bg-indigo-400 scale-125" : isDark ? "bg-white/20" : "bg-slate-300"
                        }`}
                      />
                    ))}
                    <span className={`text-[9px] font-mono tabular ${t.textMute}`}>{missionRuns.length} run{missionRuns.length > 1 ? "s" : ""}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 select-none flex-shrink-0">
                {/* VIEW SWITCHER — six lenses over the same fabric */}
                <div data-tour="views" className={`flex items-center rounded-lg p-0.5 border ${
                  isDark ? "bg-black/30 border-white/[0.07]" : "bg-slate-100 border-slate-200"
                }`}>
                  {WORKSPACE_VIEWS.map(({ key, label, desc, Icon }) => (
                    <button
                      key={key}
                      onClick={() => setWorkspaceMode(key)}
                      title={desc}
                      className={`relative px-2 py-1 text-[10px] font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                        workspaceMode === key
                          ? "text-white"
                          : isDark ? "text-slate-400 hover:text-gray-200" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {workspaceMode === key && (
                        <motion.span
                          layoutId="viewPill"
                          transition={{ type: "spring", stiffness: 480, damping: 36 }}
                          className="absolute inset-0 rounded-md bg-indigo-600 shadow-md shadow-indigo-600/30"
                        />
                      )}
                      <Icon className="w-3.5 h-3.5 relative z-10" />
                      <span className="hidden lg:inline relative z-10">{label}</span>
                    </button>
                  ))}
                </div>

                <div className={`w-px h-5 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />

                {/* Edit Swarm */}
                <button
                  onClick={() => setEditOpen(true)}
                  disabled={!selectedMission}
                  title="Edit this swarm — goal, persona, watchlist, active agents, cadence"
                  className={`text-[10px] font-semibold px-2.5 py-1.5 border rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 select-none press ${
                    isDark ? "text-violet-200 hover:text-white bg-violet-500/10 border-violet-500/25 hover:border-violet-500/50" : "text-violet-700 hover:text-violet-800 bg-violet-500/5 border-violet-500/20 hover:border-violet-500/40"
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span className="hidden md:inline">Edit Swarm</span>
                </button>

                {/* Re-sense */}
                <button
                  onClick={() => handleResense("resense")}
                  disabled={resensing || selectedMission?.status !== "ready"}
                  title={`Re-sense for fresh signals (${deployCost} credits)`}
                  className={`text-[10px] font-semibold px-2.5 py-1.5 border rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 select-none press ${
                    isDark ? "text-indigo-300 hover:text-white bg-indigo-500/10 border-indigo-500/25 hover:border-indigo-500/50" : "text-indigo-600 hover:text-indigo-700 bg-indigo-50 border-indigo-200 hover:border-indigo-300"
                  }`}
                >
                  <RotateCcw className={`w-3 h-3 ${resensing ? "animate-spin" : ""}`} />
                  <span className="hidden md:inline">Re-sense</span>
                </button>

                {/* Live monitor toggle */}
                <button
                  onClick={toggleMonitor}
                  disabled={!selectedMission}
                  title={selectedMission?.monitoring ? "Live monitor ON — auto re-senses every 45s. Click to stop." : "Turn on live monitoring (auto re-sense)"}
                  className={`text-[10px] font-semibold px-2.5 py-1.5 border rounded-lg transition-all flex items-center gap-1.5 select-none press ${
                    selectedMission?.monitoring
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/40"
                      : isDark ? "text-gray-300 hover:text-white bg-white/5 border-white/[0.07] hover:border-white/15" : "text-slate-600 hover:text-emerald-600 bg-white border-slate-200"
                  }`}
                >
                  <Radio className={`w-3 h-3 ${selectedMission?.monitoring ? "animate-pulse" : ""}`} />
                  <span className="hidden md:inline">{selectedMission?.monitoring ? "Monitoring" : "Monitor"}</span>
                </button>

                {/* Ask the Fabric */}
                <button
                  onClick={() => { setSelectedNodeId(null); setFocusedAgent(null); setCustomOpen(false); setChatOpen(v => !v); }}
                  title="Chat with this mission's fabric — answers cite their evidence"
                  className={`text-[10px] font-semibold px-2.5 py-1.5 border rounded-lg transition-all flex items-center gap-1.5 select-none press ${
                    chatOpen
                      ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/40"
                      : isDark ? "text-gray-300 hover:text-white bg-white/5 border-white/[0.07] hover:border-white/15" : "text-slate-600 hover:text-indigo-600 bg-white border-slate-200"
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span className="hidden md:inline">Ask Fabric</span>
                </button>

                {/* Custom agents */}
                <button
                  onClick={() => { setSelectedNodeId(null); setFocusedAgent(null); setChatOpen(false); setCustomOpen(v => !v); }}
                  title="Build & run your own specialist agents on this mission"
                  className={`text-[10px] font-semibold px-2.5 py-1.5 border rounded-lg transition-all flex items-center gap-1.5 select-none press ${
                    customOpen
                      ? "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/40"
                      : isDark ? "text-gray-300 hover:text-white bg-white/5 border-white/[0.07] hover:border-white/15" : "text-slate-600 hover:text-fuchsia-600 bg-white border-slate-200"
                  }`}
                >
                  <Wand2 className="w-3 h-3" />
                  <span className="hidden md:inline">My Agents</span>
                </button>

                {/* Media Studio */}
                <button
                  onClick={() => { setStudioSeed(""); setStudioOpen(true); }}
                  disabled={!selectedMission}
                  title="Media Studio — generate images & video from this mission"
                  className={`text-[10px] font-semibold px-2.5 py-1.5 border rounded-lg transition-all flex items-center gap-1.5 select-none press disabled:opacity-50 ${
                    isDark ? "text-violet-200 hover:text-white bg-violet-500/10 border-violet-500/25 hover:border-violet-500/50" : "text-violet-700 hover:text-violet-800 bg-violet-500/5 border-violet-500/20 hover:border-violet-500/40"
                  }`}
                >
                  <Clapperboard className="w-3 h-3" />
                  <span className="hidden md:inline">Studio</span>
                </button>

                <button
                  onClick={handleTriggerReweave}
                  disabled={reweaving || selectedMission?.status !== "ready"}
                  title="Re-check: re-run the Reviewer to resolve conflicts across the fabric"
                  className={`text-[10px] font-semibold px-2.5 py-1.5 border rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 select-none press ${
                    isDark ? "text-gray-300 hover:text-white bg-white/5 border-white/[0.07] hover:border-white/15" : "text-slate-600 hover:text-indigo-600 bg-white border-slate-200"
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${reweaving ? "animate-spin" : ""}`} />
                  <span className="hidden lg:inline">Re-Weave</span>
                </button>

                <div className={`w-px h-5 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />

                {/* Inspector dock toggle */}
                <button
                  onClick={() => setInspectorOpen(v => !v)}
                  title={inspectorOpen ? "Hide inspector panel" : "Show inspector panel"}
                  className={`hidden lg:flex p-1.5 border rounded-lg transition-all press ${
                    isDark ? "text-gray-300 hover:text-white bg-white/5 border-white/[0.07] hover:border-white/15" : "text-slate-600 bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {inspectorOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
                </button>

                {/* Fullscreen */}
                <button
                  onClick={toggleMaximize}
                  title="Fullscreen workspace"
                  className={`p-1.5 border rounded-lg transition-all press ${
                    isDark ? "text-gray-300 hover:text-white bg-white/5 border-white/[0.07] hover:border-white/15" : "text-slate-600 bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Maximize className="w-3.5 h-3.5" />
                </button>
              </div>
            </section>
            )}

            {/* --- PIPELINE STAGE LOADER --- */}
            {selectedMission && ["queued", "sensing", "reasoning", "synthesizing"].includes(selectedMission.status) && (
              <div className={`relative overflow-hidden border-b py-2 px-4 flex items-center justify-between gap-3 z-10 select-none ${
                isDark ? "bg-indigo-500/[0.06] border-indigo-500/15" : "bg-indigo-50/70 border-indigo-100"
              }`}>
                <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden">
                  <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-indigo-400 to-transparent sweep-x" />
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400 flex-shrink-0" />
                  <span className={`text-[11px] font-semibold ${t.textTitle}`}>
                    {selectedMission.status === "sensing"
                      ? "Pathfinder is reading live web pages…"
                      : selectedMission.status === "reasoning"
                      ? "Veritas is verifying claims & scoring credibility…"
                      : selectedMission.status === "synthesizing"
                      ? "Scribe is weaving the traceable brief…"
                      : "Conductor is planning the swarm deployment…"}
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1">
                  {(["sensing", "reasoning", "synthesizing"] as const).map((stage, i) => {
                    const order = ["queued", "sensing", "reasoning", "synthesizing"];
                    const cur = order.indexOf(selectedMission.status);
                    const mine = order.indexOf(stage);
                    const state = cur > mine ? "done" : cur === mine ? "active" : "wait";
                    return (
                      <span key={stage} className={`flex items-center gap-1 text-[9px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                        state === "done" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                        : state === "active" ? "text-indigo-300 border-indigo-500/40 bg-indigo-500/15 animate-pulse"
                        : isDark ? "text-gray-500 border-white/10" : "text-slate-400 border-slate-200"
                      }`}>
                        {state === "done" ? <Check className="w-2.5 h-2.5" /> : <span className={`w-1.5 h-1.5 rounded-full ${state === "active" ? "bg-indigo-400" : "bg-current opacity-40"}`} />}
                        {stage}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ════ INNER ROW: stage column + docked inspector ════ */}
            <div className="flex-1 flex min-h-0 relative">
              {/* ── STAGE COLUMN ── */}
              <div className="flex-1 flex flex-col min-w-0 relative">

                {/* BACKGROUND MATRIX GRID (pan-aware) */}
                <div
                  className={`absolute inset-0 pointer-events-none transition-opacity ${t.gridOpacity}`}
                  style={{
                    backgroundImage: "radial-gradient(ellipse 60% 50% at 50% 40%, var(--nx-glow-accent), transparent 70%), radial-gradient(rgba(148,163,184,0.16) 1.5px, transparent 1.5px)",
                    backgroundSize: `100% 100%, ${24 * canvasZoom}px ${24 * canvasZoom}px`,
                    backgroundPosition: `0 0, ${canvasPan.x}px ${canvasPan.y}px`
                  }}
                ></div>

                {/* Floating fullscreen HUD: restore + view switching while maximized */}
                {isMaximized && (
                  <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 p-1.5 rounded-xl border glass border-white/10 shadow-2xl">
                    {WORKSPACE_VIEWS.map(({ key, desc, Icon }) => (
                      <button
                        key={key}
                        onClick={() => setWorkspaceMode(key)}
                        title={desc}
                        className={`p-1.5 rounded-lg transition-colors ${
                          workspaceMode === key ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                    <div className="w-px h-4 bg-white/10" />
                    <button onClick={toggleMaximize} title="Exit fullscreen" className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10">
                      <Minimize className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* ── VIEW STAGE with animated lens transitions ── */}
                <div data-tour="stage" className="flex-1 min-h-0 relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={workspaceMode}
                      initial={{ opacity: 0, x: 18, scale: 0.995 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -12, scale: 0.995 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 flex flex-col"
                    >


            {/* --- 2D REACT FLOW FABRIC VIEWPORT --- */}
            {workspaceMode === "fabric2d" && (
              <FabricCanvas
                nodes={nodes}
                edges={edges}
                isDark={isDark}
                selectedNodeId={selectedNodeId}
                onSelect={(id) => { setSelectedNodeId(id); const n = nodes.find(x => x.id === id); if (n && (n.type === "web-signal" || n.type === "synthesis")) setCorrectionContent(n.content); }}
                isMaximized={isMaximized}
                onToggleMaximize={toggleMaximize}
              />
            )}

            {/* --- MISSION REPLAY VIEWPORT --- */}
            {workspaceMode === "replay" && (
              <MissionReplay
                nodes={nodes}
                events={events}
                isDark={isDark}
                onSelect={(id) => { setSelectedNodeId(id); const n = nodes.find(x => x.id === id); if (n && (n.type === "web-signal" || n.type === "synthesis")) setCorrectionContent(n.content); }}
              />
            )}

            {/* --- AGENT TRIAGE BOARD VIEWPORT --- */}
            {workspaceMode === "triage" && (
              <TriageBoard
                nodes={nodes}
                isDark={isDark}
                onSelect={(id) => { setSelectedNodeId(id); const n = nodes.find(x => x.id === id); if (n && (n.type === "web-signal" || n.type === "synthesis")) setCorrectionContent(n.content); }}
                onRequestCorrection={(node) => { setSelectedNodeId(node.id); setCorrectionContent(node.content); }}
              />
            )}

            {/* --- TEMPORAL VISTA (EchoForge: past → present → futures) --- */}
            {workspaceMode === "vista" && (
              <TemporalVista
                nodes={nodes}
                isDark={isDark}
                selectedNodeId={selectedNodeId}
                onSelect={(id) => { setSelectedNodeId(id); const n = nodes.find(x => x.id === id); if (n && (n.type === "web-signal" || n.type === "synthesis")) setCorrectionContent(n.content); }}
                onForecast={handleForecast}
                forecasting={forecasting}
              />
            )}

            {/* --- BUILD STUDIO (Analyze → Prototype → Build → Connect) --- */}
            {workspaceMode === "build" && selectedMission && (
              <BuildStudio
                missionId={selectedMission.id}
                isDark={isDark}
                onOpenFinding={(id) => { setSelectedNodeId(id); setWorkspaceMode("fabric2d"); const n = nodes.find(x => x.id === id); if (n && (n.type === "web-signal" || n.type === "synthesis")) setCorrectionContent(n.content); }}
              />
            )}
                    </motion.div>
                  </AnimatePresence>
                </div>

            {/* --- LIVE FEED BAR + EXPANDABLE INTELLIGENCE PANE --- */}
            {!isMaximized && (
            <footer data-tour="feed" className={`border-t flex flex-col z-20 relative select-none ${t.bgPane} ${footerOpen ? "h-72" : "h-auto"}`}>
              {/* ── LIVE TICKER ROW (always visible) ── */}
              {(() => {
                const sig = nodes.filter(n => n.type === "web-signal");
                const contra = nodes.filter(n => (n.conflict || n.flagged_by === "sentinel") && n.type !== "correction").length;
                const futs = nodes.filter(n => n.time_horizon === "future").length;
                const verifiedCount = sig.filter(n => n.verified !== false).length;
                const pctVerified = sig.length ? Math.round((verifiedCount / sig.length) * 100) : 0;
                const proposedCount = actions.filter(a => a.status === "proposed").length;
                const latest = events.slice(-3).reverse();
                const levelDot: Record<string, string> = { info: "bg-indigo-400", success: "bg-emerald-400", warn: "bg-amber-400", error: "bg-rose-400" };
                return (
                  <div className="flex items-center gap-3 px-4 h-10 flex-shrink-0 overflow-hidden">
                    {/* live dot + latest events ticker */}
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                      </span>
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-widest ${t.textMute}`}>Live</span>
                    </span>
                    <div className="flex-1 min-w-0 flex items-center gap-4 overflow-hidden">
                      <AnimatePresence mode="popLayout">
                        {latest.length === 0 ? (
                          <span className={`text-[10.5px] font-mono ${t.textMute}`}>Agents standing by — deploy or re-sense to stream activity…</span>
                        ) : latest.map((ev, i) => (
                          <motion.span
                            key={ev.id}
                            layout
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: i === 0 ? 1 : 0.55 - i * 0.15, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className={`flex items-center gap-1.5 text-[10.5px] min-w-0 ${i > 0 ? "hidden md:flex" : "flex"}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${levelDot[ev.level]}`} />
                            <span className={`font-mono font-bold uppercase text-[9px] flex-shrink-0 ${t.textMute}`}>{ev.sender}</span>
                            <span className={`truncate max-w-[320px] ${t.textDesc}`}>{ev.message}</span>
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* compact mission health */}
                    <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                      <span className="flex items-center gap-1.5" title="Findings cross-checked across sources">
                        <span className={`w-14 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-slate-200"}`}>
                          <motion.span
                            className="block h-full rounded-full bg-emerald-400"
                            animate={{ width: `${pctVerified}%` }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </span>
                        <span className="text-[10px] font-bold tabular text-emerald-400">{verifiedCount}/{sig.length} verified</span>
                      </span>
                      {contra > 0 && <span className="text-[10px] font-mono font-bold text-rose-400" title="Open conflicts between sources">{contra} conflict{contra !== 1 ? "s" : ""}</span>}
                      {futs > 0 && <span className="text-[10px] font-mono text-fuchsia-400" title="Forecasted future scenarios">{futs} futures</span>}
                    </div>

                    {/* expand / collapse the intelligence pane */}
                    <button
                      onClick={() => setFooterOpen(v => !v)}
                      className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all press flex-shrink-0 ${
                        proposedCount > 0 && !footerOpen
                          ? "text-indigo-300 bg-indigo-500/15 border-indigo-500/40"
                          : isDark ? "text-gray-300 bg-white/5 border-white/[0.07] hover:border-white/15" : "text-slate-600 bg-white border-slate-200"
                      }`}
                      title={footerOpen ? "Collapse the intelligence pane" : "Open brief, actions & full activity log"}
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Brief & Actions</span>
                      {proposedCount > 0 && (
                        <span className="min-w-[16px] h-4 px-1 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center tabular">{proposedCount}</span>
                      )}
                      {footerOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })()}

              {footerOpen && (
              <div className={`flex items-center justify-between border-y px-4 py-1.5 border-slate-200/50 dark:border-white/5 flex-shrink-0 select-none`}>
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab("analysis")}
                    className={`text-xs font-bold py-1 border-b-2 transition-all flex items-center gap-1.5 ${
                      activeTab === "analysis"
                        ? "border-indigo-500 text-slate-900 dark:text-white"
                        : "border-transparent text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                    Intelligence Brief
                  </button>

                  <button
                    onClick={() => setActiveTab("actions")}
                    className={`text-xs font-bold py-1 border-b-2 transition-all flex items-center gap-1.5 relative ${
                      activeTab === "actions"
                        ? "border-indigo-500 text-slate-900 dark:text-white"
                        : "border-transparent text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    Action Plan
                    {actions.filter(a => a.status === "proposed").length > 0 && (
                      <span className="min-w-[15px] h-[15px] px-0.5 rounded-full bg-indigo-500 text-white text-[8.5px] font-bold flex items-center justify-center tabular">
                        {actions.filter(a => a.status === "proposed").length}
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-gray-500 font-mono">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">hover findings to trace their sources</span>
                </div>
              </div>
              )}

              {/* GRID SECTIONS */}
              {footerOpen && (
              <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
                
                {/* CONTAINER COLUMN (span 8) */}
                <div className="col-span-8 overflow-y-auto p-4 border-r border-slate-200/50 dark:border-white/5">
                  {activeTab === "analysis" && brief && (
                    <div className="flex flex-col gap-3">
                      <div className="text-xs leading-relaxed border-b pb-2.5 border-slate-200/50 dark:border-white/5">
                        <span className="font-extrabold text-slate-900 dark:text-white block tracking-wider uppercase mb-0.5 text-[10px]">
                          SUMMARY
                        </span>
                        <p className={t.textDesc}>{brief.summary}</p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-mono tracking-wider text-slate-400 dark:text-gray-400 uppercase font-bold">
                          KEY FINDINGS — hover to highlight sources on the canvas
                        </span>
                        
                        {brief.sentences.map(s => (
                          <div
                            key={s.id}
                            onMouseEnter={() => setHoveredSentenceId(s.id)}
                            onMouseLeave={() => setHoveredSentenceId(null)}
                            className={`text-xs p-2 rounded-lg transition-all pl-6 leading-relaxed relative border ${
                              hoveredSentenceId === s.id
                                ? "bg-violet-500/5 border-violet-500/40 text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-600 dark:text-gray-300 border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.01]"
                            }`}
                          >
                            <div className="absolute left-2.5 top-3 w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                            {s.text}
                            
                            {/* Trace links */}
                            <span className="inline-flex gap-1 ml-2.5 select-none no-pan">
                              {s.provenance.map(provId => {
                                const relatedNode = nodes.find(n => n.id === provId);
                                const ratingColor = relatedNode ? toneChip(nodeStatus(relatedNode).tone) : "";
                                return (
                                  <button
                                    key={provId}
                                    onClick={() => {
                                      setSelectedNodeId(provId);
                                      const related = nodes.find(n => n.id === provId);
                                      if (related) setCorrectionContent(related.content);
                                    }}
                                    className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 border rounded opacity-80 hover:opacity-100 transition-all ${ratingColor}`}
                                    title={`Locate Evidence: Node ${provId}`}
                                  >
                                    ↗ node-{provId.split("-").pop()}
                                  </button>
                                );
                              })}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* SWARM DIRECTIVES DEPLOYED */}
                      <div className="flex flex-col gap-2 mt-4 bg-violet-500/5 border border-violet-500/15 p-4 rounded-xl">
                        <span className="text-[10.5px] font-mono tracking-wider text-violet-600 dark:text-violet-400 uppercase font-bold flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4" />
                          RECOMMENDED NEXT STEPS
                        </span>
                        <ul className="list-none flex flex-col gap-1.5 font-sans">
                          {brief.recommendations.map((rec, i) => (
                            <li key={i} className="text-xs text-slate-700 dark:text-gray-300 flex items-start gap-2 pl-1 leading-relaxed">
                              <span className="text-violet-500 select-none font-bold">↳</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {activeTab === "analysis" && !brief && (
                    <div className="flex flex-col gap-2 py-2">
                      <div className="skeleton h-3 w-2/3" />
                      <div className="skeleton h-3 w-full" />
                      <div className="skeleton h-3 w-5/6" />
                      <p className={`text-xs text-center pt-4 ${t.textMute}`}>
                        The Scribe is composing a traceable brief — every sentence will link to the evidence behind it.
                      </p>
                    </div>
                  )}

                  {activeTab === "actions" && (
                    <div className="flex flex-col gap-3">
                      {/* strategize & ship header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-luna-gradient flex items-center justify-center flex-shrink-0">
                            <Rocket className="w-3.5 h-3.5 text-white" />
                          </span>
                          <div className="leading-tight">
                            <h4 className={`text-[12px] font-bold font-display ${t.textTitle}`}>Strategize &amp; ship</h4>
                            <p className={`text-[9.5px] ${t.textMute}`}>Each verified move routes straight into a tool you use.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setWorkspaceMode("build")}
                          className={`text-[10px] font-bold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${isDark ? "border-white/10 text-gray-300 hover:border-white/25" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                          title="Manage connectors in the Build view"
                        >
                          <Plug className="w-3 h-3 text-sky-400" /> Connections
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {actions.length === 0 && (
                        <div className="col-span-2 flex flex-col items-center gap-2 py-8 text-center">
                          <span className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center">
                            <Rocket className="w-5 h-5 text-indigo-400" />
                          </span>
                          <p className={`text-xs max-w-sm leading-relaxed ${t.textMute}`}>
                            The Assistant turns verified findings into next moves — outreach, a watch, a deep-dive, a decision — each ready to route into Email, GitHub, Slack, Teams or your dashboards. Nothing is sent without you.
                          </p>
                        </div>
                      )}
                      {actions.map(act => {
                        const copy = (txt: string) => { try { navigator.clipboard.writeText(txt); } catch (e) { console.error(e); } };
                        const k = act.kind;
                        const isMail = k === "outreach" || k === "draft-email" || k === "draft-application";
                        const meta =
                          isMail ? { Icon: Mail, label: "Outreach", tone: "violet" } :
                          k === "monitor" ? { Icon: Radio, label: "Standing Watch", tone: "emerald" } :
                          k === "deep-dive" ? { Icon: Crosshair, label: "Deep Dive", tone: "cyan" } :
                          k === "decision" ? { Icon: Zap, label: "Decision", tone: "amber" } :
                          k === "reminder" ? { Icon: Clock, label: "Reminder", tone: "amber" } :
                          k === "alert" ? { Icon: ShieldAlert, label: "Alert", tone: "rose" } :
                          { Icon: FileText, label: "Brief", tone: "violet" };
                        const tones: Record<string, { text: string; chip: string }> = {
                          violet: { text: "text-violet-600 dark:text-violet-300", chip: "border-violet-500/25 bg-violet-500/10" },
                          emerald: { text: "text-emerald-600 dark:text-emerald-300", chip: "border-emerald-500/25 bg-emerald-500/10" },
                          cyan: { text: "text-cyan-600 dark:text-cyan-300", chip: "border-cyan-500/25 bg-cyan-500/10" },
                          amber: { text: "text-amber-600 dark:text-amber-300", chip: "border-amber-500/25 bg-amber-500/10" },
                          rose: { text: "text-rose-600 dark:text-rose-300", chip: "border-rose-500/25 bg-rose-500/10" },
                        };
                        const tone = tones[meta.tone];
                        const MetaIcon = meta.Icon;

                        // Connector routing — the "build & strategize" wiring.
                        const route = ACTION_ROUTING[k] || ACTION_ROUTING.other;
                        const connector = connectors.find(c => c.id === route.connector);
                        const connected = connector?.status === "connected";
                        const ConnIcon = connector ? (CONNECTOR_ICON[connector.id] || Plug) : Plug;
                        const sending = routingId === act.id;

                        const sendToConnector = () => {
                          if (!connector) { copy(act.payload.body); handleApproveAction(act.id); return; }
                          if (!connected) { setWorkspaceMode("build"); return; }
                          if (connector.id === "email") {
                            window.open(`mailto:${act.payload.to || ""}?subject=${encodeURIComponent(act.payload.subject || act.title)}&body=${encodeURIComponent(act.payload.body || "")}`);
                          }
                          routeAction(act.id, connector.id);
                        };

                        // Live secondary handoff (does the actual NebulaX-side action).
                        const secondary =
                          k === "monitor" ? { label: "Start watch", Icon: Radio, run: () => { if (!selectedMission?.monitoring) toggleMonitor(); handleApproveAction(act.id); } } :
                          k === "deep-dive" ? { label: "Launch", Icon: Crosshair, run: () => { deepDive(act.payload.seed || act.title); handleApproveAction(act.id); } } :
                          (k === "reminder" && act.payload.deadline) ? { label: "Calendar", Icon: Clock, run: () => { window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(act.title)}&details=${encodeURIComponent(act.payload.body || "")}&dates=${String(act.payload.deadline).replace(/-/g, "")}/${String(act.payload.deadline).replace(/-/g, "")}`, "_blank"); } } :
                          null;

                        return (
                        <div
                          key={act.id}
                          className={`border rounded-xl p-3 transition-all flex flex-col gap-2 relative ${
                            isDark ? "bg-white/[0.03] border-white/[0.07] hover:border-white/15" : "bg-white border-slate-200 hover:border-slate-300 shadow-[0_2px_8px_rgba(20,16,31,0.04)]"
                          } ${
                            act.status === "approved"
                              ? "border-emerald-500/40"
                              : act.status === "dismissed" ? "opacity-40" : ""
                          }`}
                        >
                          <div className="flex justify-between items-center gap-1.5 select-none">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`inline-flex items-center gap-1 text-[8.5px] font-mono font-bold px-2 py-0.5 border rounded-full uppercase tracking-wide ${tone.text} ${tone.chip}`}>
                                <MetaIcon className="w-2.5 h-2.5" /> {meta.label}
                              </span>
                              {connector && (
                                <span className={`inline-flex items-center gap-1 text-[8.5px] font-mono px-1.5 py-0.5 rounded-full border ${isDark ? "border-white/10 text-gray-300" : "border-slate-200 text-slate-500"}`} title={`Routes to ${connector.name}`}>
                                  <ArrowRight className="w-2.5 h-2.5 opacity-50" /> <ConnIcon className="w-2.5 h-2.5" /> {connector.name}
                                  {!connected && <span className="text-amber-500">·off</span>}
                                </span>
                              )}
                            </div>
                            {act.status === "approved" && (
                              <span className="text-[8.5px] font-mono text-emerald-600 dark:text-emerald-300 flex items-center gap-1 font-bold flex-shrink-0">
                                <Check className="w-2.5 h-2.5" /> shipped
                              </span>
                            )}
                          </div>

                          <h4 className="text-[11.5px] font-bold text-slate-900 dark:text-white leading-snug font-display">
                            {act.title}
                          </h4>

                          <p className={`text-[10px] leading-relaxed ${isDark ? "text-white/55" : "text-slate-500"}`}>
                            {act.rationale}
                          </p>

                          {/* type-specific preview */}
                          <div className={`border rounded-lg overflow-hidden ${isDark ? "bg-black/30 border-white/[0.06]" : "bg-slate-50 border-slate-200/70"}`}>
                            {isMail && (act.payload.to || act.payload.subject) && (
                              <div className={`px-2 py-1.5 border-b text-[9px] font-mono flex flex-col gap-0.5 ${isDark ? "border-white/[0.06] text-white/45" : "border-slate-200/70 text-slate-500"}`}>
                                {act.payload.to && <span><span className="opacity-60">To:</span> <span className="text-slate-900 dark:text-white">{act.payload.to}</span></span>}
                                {act.payload.subject && <span><span className="opacity-60">Subject:</span> <span className="text-slate-900 dark:text-white">{act.payload.subject}</span></span>}
                              </div>
                            )}
                            {k === "monitor" && act.payload.target && (
                              <div className={`px-2 py-1.5 border-b text-[9px] font-mono flex items-center gap-1.5 ${isDark ? "border-white/[0.06] text-emerald-300" : "border-slate-200/70 text-emerald-600"}`}>
                                <Radio className="w-2.5 h-2.5" /> Watching: <span className="text-slate-900 dark:text-white truncate">{act.payload.target}</span>
                              </div>
                            )}
                            {k === "deep-dive" && act.payload.seed && (
                              <div className={`px-2 py-1.5 border-b text-[9px] font-mono flex items-start gap-1.5 ${isDark ? "border-white/[0.06] text-cyan-300" : "border-slate-200/70 text-cyan-600"}`}>
                                <Crosshair className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" /> Spawns: <span className="text-slate-900 dark:text-white">{act.payload.seed}</span>
                              </div>
                            )}
                            <div className={`p-2 text-[10px] font-mono leading-normal max-h-20 overflow-y-auto whitespace-pre-wrap ${isDark ? "text-white/70" : "text-slate-700"}`}>
                              {act.payload.body}
                            </div>
                          </div>

                          {/* provenance: which findings earned this move */}
                          {act.provenance && act.provenance.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 select-none no-pan">
                              <span className={`text-[8px] font-mono uppercase ${isDark ? "text-white/40" : "text-slate-400"}`}>From {act.provenance.length} finding{act.provenance.length > 1 ? "s" : ""}:</span>
                              {act.provenance.slice(0, 3).map(pid => {
                                const pn = nodes.find(n => n.id === pid);
                                if (!pn) return null;
                                return (
                                  <button
                                    key={pid}
                                    onClick={() => { setSelectedNodeId(pid); setCorrectionContent(pn.content); }}
                                    title={pn.title}
                                    className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-all ${toneChip(nodeStatus(pn).tone)}`}
                                  >
                                    ↗ {pn.title.slice(0, 18)}{pn.title.length > 18 ? "…" : ""}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {act.status !== "dismissed" && (
                            <div className="flex items-center gap-2 mt-0.5 select-none no-pan">
                              <button
                                onClick={sendToConnector}
                                disabled={sending}
                                className={`flex-1 text-[10px] font-bold py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm press disabled:opacity-60 ${
                                  connected || !connector ? "bg-luna-gradient cta-luna text-white" : (isDark ? "border border-sky-500/40 text-sky-300 bg-sky-500/10" : "border border-sky-500/40 text-sky-600 bg-sky-500/5")
                                }`}
                                title={connected ? route.verb : connector ? `Connect ${connector.name} in Build` : "Copy & commit"}
                              >
                                <ConnIcon className="w-3.5 h-3.5" />
                                {sending ? "Routing…" : connected ? route.verb : connector ? `Connect ${connector.name}` : "Copy & commit"}
                              </button>
                              {secondary && (
                                <button
                                  onClick={secondary.run}
                                  className={`text-[10px] font-bold py-1.5 px-2.5 rounded-lg border transition-all flex items-center gap-1.5 ${isDark ? "border-white/10 text-gray-300 hover:border-white/25" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                                  title={secondary.label}
                                >
                                  <secondary.Icon className="w-3.5 h-3.5" /> {secondary.label}
                                </button>
                              )}
                              <button
                                onClick={() => copy(act.payload.body)}
                                className={`p-1.5 rounded-lg text-[10px] transition-all border ${isDark ? "border-white/10 text-white/60 hover:border-white/25" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                                title="Copy draft"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              {act.status === "proposed" && (
                                <button
                                  onClick={() => handleDismissAction(act.id)}
                                  className={`p-1.5 rounded-lg text-[10px] transition-all border ${isDark ? "border-white/10 text-white/50 hover:text-rose-400 hover:border-rose-500/30" : "border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50"}`}
                                  title="Dismiss (archived, never deleted)"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                      })}
                      </div>
                    </div>
                  )}
                </div>

                {/* TIMELINE ACTIVITIES OPERATIONS PANEL AREA (span 4) */}
                <div className="col-span-4 overflow-y-auto p-4 flex flex-col gap-3 font-mono border-l border-slate-200/50 dark:border-white/5">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/50 dark:border-white/5">
                    <Activity className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-[10px] tracking-wider text-slate-500 dark:text-gray-400 uppercase font-bold">
                      Agent Activity
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col gap-3 h-full">
                    {events.length === 0 ? (
                      <span className="text-[9.5px] text-slate-400 text-center py-6">
                        [Listening pipeline signal beacons...]
                      </span>
                    ) : (
                      events.map(ev => {
                        const levelColors = {
                          info: "text-violet-600 bg-violet-500/5 border-violet-500/10 dark:text-violet-400 dark:bg-violet-950/20 dark:border-violet-900/20",
                          success: "text-emerald-600 bg-emerald-500/5 border-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/20",
                          warn: "text-amber-600 bg-amber-500/5 border-amber-500/10 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/20",
                          error: "text-red-600 bg-red-500/5 border-red-500/10 dark:text-red-400 dark:bg-red-950/20 dark:border-red-900/20"
                        };

                        return (
                          <div
                            key={ev.id}
                            className={`text-[9.5px] border rounded-lg p-2.5 leading-relaxed ${levelColors[ev.level]}`}
                          >
                            <div className="flex justify-between items-center opacity-70 mb-1 text-[8px] border-b border-current/10 pb-0.5 font-bold select-none">
                              <span>[{ev.sender.toUpperCase()}]</span>
                              <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <span>{ev.message}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
              )}
            </footer>
            )}

              </div>

              {/* ── DOCKED INSPECTOR: node detail / agent console / chat / custom agents / mission pulse ── */}
              <aside
                data-tour="inspector"
                className={`${inspectorContent !== "pulse" ? "flex" : inspectorOpen && !isMaximized ? "hidden lg:flex" : "hidden"} flex-col absolute lg:relative lg:flex-shrink-0 inset-y-0 right-0 z-40 w-full sm:w-[400px] lg:w-[360px] xl:w-[400px] border-l shadow-2xl overflow-hidden select-none ${
                  isDark ? "bg-[#090d15] border-white/[0.06]" : "bg-white border-slate-200"
                }`}
              >

          {/* --- INSPECTOR CONTENT: NODE DETAIL + MEMORY CORRECTOR --- */}
          {inspectorContent === "node" && (
            <motion.div
              key={selectedNodeId}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col h-full overflow-y-auto"
            >
              <div className={`p-4 border-b flex justify-between items-center select-none flex-shrink-0 ${
                isDark ? "bg-black/25 border-white/[0.06]" : "bg-slate-50 border-slate-200"
              }`}>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 font-display">
                  <Bot className="w-4 h-4 text-violet-500" />
                  Cognitive Fabric Inspector
                </h3>
                <div className="flex items-center gap-1">
                  {(() => {
                    const sn = nodes.find(n => n.id === selectedNodeId);
                    if (!sn) return null;
                    return (
                      <>
                        <button
                          onClick={() => patchNode(sn.id, { pinned: !sn.pinned })}
                          title={sn.pinned ? "Unpin node" : "Pin node"}
                          className={`p-1.5 rounded-lg transition-colors ${sn.pinned ? "text-violet-500 bg-violet-500/10" : "text-slate-400 hover:text-violet-500 hover:bg-violet-500/10"}`}
                        >
                          <Pin className={`w-3.5 h-3.5 ${sn.pinned ? "fill-current" : ""}`} />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete node "${sn.title}"? This also removes its edges.`)) removeNode(sn.id); }}
                          title="Delete node"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    );
                  })()}
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    title="Dismiss Selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {(() => {
                const selectedNode = nodes.find(n => n.id === selectedNodeId);
                if (!selectedNode) return null;

                const status = nodeStatus(selectedNode);
                const srcN = sourceCount(selectedNode);

                return (
                  <div className="p-4 flex flex-col gap-4 flex-1">

                    {/* ENHANCED PROVENANCE DETAIL CARD */}
                    <div className={`p-4 rounded-xl border flex flex-col gap-3 ${toneChip(status.tone, true)} ${
                      isDark ? "bg-[#070a13] shadow-lg" : "bg-[#faf9fe]/50 shadow-sm"
                    }`}>

                      <div className="flex justify-between items-center leading-none select-none text-[8px] font-mono">
                        <span className={`px-1.5 py-0.5 border rounded uppercase ${toneChip(status.tone)}`}>
                          {selectedNode.type}
                        </span>
                        <span className={`flex items-center gap-1 px-1.5 py-0.5 border rounded uppercase font-bold ${toneChip(status.tone)}`}>
                          <status.Icon className="w-2.5 h-2.5" />
                          {status.label}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                          {selectedNode.title}
                        </h4>
                        <div className="mt-2.5">
                          <DynamicNodeBody node={selectedNode} isDark={isDark} />
                        </div>
                        {(selectedNode.type === "web-signal" || selectedNode.type === "synthesis") && !selectedNode.conflict && selectedMission && (
                          <RefineFinding node={selectedNode} missionId={selectedMission.id} isDark={isDark} onSaved={() => fetchMissionData(selectedMission.id)} />
                        )}
                      </div>

                      {/* EVIDENCE: sources + freshness (no opaque score) */}
                      <div className="grid grid-cols-2 gap-2 border-t border-slate-200/50 dark:border-white/5 pt-3">
                        <div className="flex flex-col">
                          <span className="text-[8.5px] font-mono uppercase tracking-wide text-slate-400">Sources</span>
                          <span className="text-[12px] font-extrabold text-slate-900 dark:text-white">{srcN} independent</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8.5px] font-mono uppercase tracking-wide text-slate-400">Updated</span>
                          <span className="text-[12px] font-extrabold text-slate-900 dark:text-white">{timeAgo(selectedNode.created_at)}</span>
                        </div>
                      </div>

                      {/* RECONCILE — structured conflict resolution that writes to memory */}
                      {((selectedNode.conflict || selectedNode.flagged_by === "sentinel") && selectedNode.type !== "correction") || (selectedNode.data && (selectedNode.data as any).resolution) ? (
                        selectedMission ? (
                          <ConflictResolver
                            node={selectedNode}
                            missionId={selectedMission.id}
                            isDark={isDark}
                            onResolved={() => { fetchMissionData(selectedMission.id); }}
                          />
                        ) : null
                      ) : null}

                      {/* EXTERNAL DIRECT CITATION LINK */}
                      {selectedNode.grounded !== undefined && (
                        <div className={`flex items-center gap-1.5 text-[9px] font-mono rounded px-2 py-1 border ${
                          selectedNode.grounded
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/25"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedNode.grounded ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                          {selectedNode.grounded
                            ? "LIVE — extracted from a real fetched page"
                            : "INFERRED — LLM analysis, no live source fetched"}
                        </div>
                      )}

                      {selectedNode.source_url && (
                        <div className="flex items-center justify-between text-[9.5px] font-mono mt-1 pt-2.5 border-t border-slate-200/50 dark:border-white/5 select-none no-pan">
                          <span className="text-slate-400 dark:text-gray-500 truncate max-w-[130px]">{selectedNode.source}</span>
                          <a
                            href={selectedNode.source_url || "#"}
                            referrerPolicy="no-referrer"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 font-bold"
                          >
                            OPEN CITED SIGNAL
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      {/* Visualize this finding in the Media Studio */}
                      <button
                        onClick={() => {
                          setStudioSeed(`${selectedNode.title} — ${selectedNode.content.slice(0, 180)}`);
                          setStudioOpen(true);
                        }}
                        className={`mt-2 w-full flex items-center justify-center gap-1.5 text-[10px] font-bold py-2 rounded-lg border transition-all press no-pan ${
                          isDark ? "text-violet-200 bg-violet-500/10 border-violet-500/25 hover:border-violet-500/50" : "text-violet-700 bg-violet-500/5 border-violet-500/20 hover:border-violet-500/40"
                        }`}
                        title="Generate an image or video from this finding"
                      >
                        <ImageIcon className="w-3 h-3" /> Visualize this finding
                      </button>
                    </div>

                    {/* CITATION AND PROVENANCE LISTS */}
                    {selectedNode.provenance && selectedNode.provenance.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        <span className="text-[10px] font-mono tracking-wider text-slate-400 dark:text-gray-400 uppercase font-bold select-none leading-none">
                          PROVENANCE SIGNALS CHAIN
                        </span>
                        
                        <div className="flex flex-col gap-2 no-pan">
                          {selectedNode.provenance.map(provId => {
                            const provNode = nodes.find(n => n.id === provId);
                            if (!provNode) return null;
                            return (
                              <div
                                key={provId}
                                onClick={() => {
                                  setSelectedNodeId(provId);
                                  if (provNode.type === "web-signal" || provNode.type === "synthesis") {
                                    setCorrectionContent(provNode.content);
                                  }
                                }}
                                className={`border p-2.5 rounded-lg text-left cursor-pointer transition-all flex items-start gap-2.5 ${toneChip(nodeStatus(provNode).tone, true)} ${
                                  isDark ? "bg-black/30 hover:bg-black/50" : "bg-white hover:bg-slate-50 shadow-xs"
                                }`}
                              >
                                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                  <span className="text-[10.5px] font-bold text-slate-800 dark:text-white truncate">
                                    {provNode.title}
                                  </span>
                                  <span className="text-[8.5px] font-mono text-slate-400">
                                    {provNode.type} · {nodeStatus(provNode).label} · {sourceCount(provNode)} src
                                  </span>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })()}

            </motion.div>
          )}

          {/* --- INSPECTOR CONTENT: AGENT COGNITIVE CONSOLE --- */}
          {inspectorContent === "agent" && focusedAgent && (
            <motion.div
              key={focusedAgent.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col h-full overflow-y-auto"
            >
              {/* Header */}
              <div className={`p-4 border-b flex justify-between items-center select-none flex-shrink-0 ${
                isDark ? "bg-black/25 border-white/[0.06]" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    runningAgentId === focusedAgent.id 
                      ? "bg-violet-400 animate-ping" 
                      : getAgentWorkingLabel(focusedAgent.id) === "working"
                      ? "bg-violet-400 animate-ping"
                      : "bg-emerald-500 animate-pulse"
                  }`} />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 font-display">
                    {focusedAgent.name} Cognitive Console
                  </h3>
                </div>
                <button
                  onClick={() => setFocusedAgent(null)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  title="Close Console"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 flex flex-col gap-4 flex-1">
                {/* Agent Health & Metrics */}
                <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
                  isDark ? "bg-[#070a13] border-white/5 shadow-lg" : "bg-[#faf9fe]/50 border-slate-200 shadow-sm"
                }`}>
                  <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase font-bold">
                    NEURAL ENGINE STATUS
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-mono text-slate-400 uppercase">Operational State</span>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-gray-200 uppercase mt-0.5">
                        {runningAgentId === focusedAgent.id 
                          ? "DECODING SIGNALS" 
                          : getAgentWorkingLabel(focusedAgent.id) === "working"
                          ? "EXECUTING TASK"
                          : "Listening Signals"}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[8px] font-mono text-slate-400 uppercase">Model Core</span>
                      <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-gray-200 mt-0.5">
                        {primaryProvider} · Llama 3.3 70B
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[8px] font-mono text-slate-400 uppercase">Last Latency</span>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-gray-200 mt-0.5">
                        {runningAgentId === focusedAgent.id ? "Measuring..." : "1.28s (cached)"}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[8px] font-mono text-slate-400 uppercase">Temperature</span>
                      <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-gray-200 mt-0.5">
                        0.70 (balanced)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Agent Directive Statement */}
                <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-500/5">
                  <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">SWARM DIRECTIVE & CAPACITIES</span>
                  <p className="text-xs text-slate-600 dark:text-gray-300 leading-normal">
                    {focusedAgent.id === "conductor" && "Turns your goal into a research plan: picks the targets and sources to hit and dispatches the right specialists."}
                    {focusedAgent.id === "pathfinder" && "Browses the live web and opens the real pages — pricing, filings, docs, news — pulling back raw facts."}
                    {focusedAgent.id === "analyst" && "Extracts clean, comparable data — prices, specs, dates — out of every page so findings can be charted and compared."}
                    {focusedAgent.id === "veritas" && "Cross-checks each finding against independent sources and marks it Verified or Needs review."}
                    {focusedAgent.id === "cartographer" && "Links related findings into one connected map and keeps it as living memory across runs."}
                    {focusedAgent.id === "sentinel" && "Compares findings across sources and surfaces any conflict — a public claim against the fine print — for you to resolve."}
                    {focusedAgent.id === "oracle" && "Builds the side-by-side comparison and the clear read: who wins where, and what it means for your decision."}
                    {focusedAgent.id === "scribe" && "Writes a readable brief where each sentence links back to the exact finding it came from."}
                    {focusedAgent.id === "actor" && "Drafts ready-to-run next steps — outreach, watches, reminders — for one-click approval. Nothing is sent on its own."}
                    {focusedAgent.id === "architect" && "Reads the analysis and your connected tools to surface what's missing or risky in your product and tech, ranked by impact."}
                    {focusedAgent.id === "builder" && "Turns the gaps into a prototype spec and a ranked set of shippable tasks, routed into the tools your team already uses."}
                  </p>
                </div>

                {/* MANUAL EXECUTION ACTUATOR */}
                <div className="pt-2">
                  <button
                    disabled={runningAgentId !== null || !!isSubmitting || selectedMission?.status !== "ready"}
                    onClick={async () => {
                      if (!selectedMission) return;
                      // Media agents open the Studio rather than the text executor.
                      if (focusedAgent.id === "visualizer" || focusedAgent.id === "cinematographer") {
                        setStudioSeed(""); setStudioOpen(true); return;
                      }
                      if (!authed) { requireAuth("Sign in to run an agent — each run is metered in credits."); return; }
                      setRunningAgentId(focusedAgent.id);
                      try {
                        const res = await fetch(`/api/missions/${selectedMission.id}/agents/${focusedAgent.id}/execute`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({})
                        });
                        if (res.ok) {
                          await fetchMissions();
                          await fetchMissionData(selectedMission.id);
                          await fetchAgents();
                          if (handle) fetchProfile(handle);
                        } else if (res.status === 401) {
                          requireAuth("Your session expired — sign in to run agents.", "login");
                        } else {
                          const errData = await res.json().catch(() => ({}));
                          if (res.status === 402) setWalletOpen(true);
                          alert(`Execution warning: ${errData.error || "Execution failed"}`);
                        }
                      } catch (err: any) {
                        console.error("Manual agent cognition error", err);
                      } finally {
                        setRunningAgentId(null);
                      }
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs font-extrabold tracking-wider transition-all select-none uppercase ${
                      selectedMission?.status !== "ready"
                        ? "bg-slate-300 dark:bg-white/5 text-slate-400 dark:text-slate-600 cursor-not-allowed border-none"
                        : runningAgentId === focusedAgent.id
                        ? "bg-violet-600/20 border border-violet-500 text-violet-400 shadow-md animate-pulse cursor-wait"
                        : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg cursor-pointer hover:shadow-violet-600/10 active:scale-[0.98]"
                    }`}
                  >
                    {runningAgentId === focusedAgent.id
                      ? "⚡ NEURAL THREAD RUNNING..."
                      : selectedMission?.status !== "ready"
                      ? "Pipeline Inactive"
                      : (focusedAgent.id === "visualizer" || focusedAgent.id === "cinematographer")
                      ? `🎬 OPEN ${focusedAgent.name.toUpperCase()} STUDIO`
                      : `⚡ EXECUTE ${focusedAgent.name.toUpperCase()} COGNITION`}
                  </button>
                </div>

                {/* STRICT AGENT CONSOLE FEED */}
                <div className="flex-1 flex flex-col gap-1.5 border-t border-slate-200/50 dark:border-white/5 pt-3 select-text min-h-0">
                  <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase font-bold">
                    LOCAL COGNITIVE EVENT TRAIL
                  </span>
                  
                  <div className={`flex-1 overflow-y-auto p-3 rounded-lg border font-mono text-[9.5px]/relaxed flex flex-col gap-2 ${
                    isDark ? "bg-[#05070a] border-white/5 text-violet-400" : "bg-slate-900 border-slate-900 text-violet-400"
                  }`}>
                    {events.filter(e => 
                      e.sender.toLowerCase() === focusedAgent.id.toLowerCase() || 
                      e.message.toLowerCase().includes(focusedAgent.name.toLowerCase())
                    ).length === 0 ? (
                      <span className="text-slate-500 text-center py-4 font-sans">[ Standby. Execute run to spark events. ]</span>
                    ) : (
                      events.filter(e => 
                        e.sender.toLowerCase() === focusedAgent.id.toLowerCase() || 
                        e.message.toLowerCase().includes(focusedAgent.name.toLowerCase())
                      ).map((e, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5 border-b border-white/5 pb-1.5">
                          <div className="flex justify-between items-center text-[7.5px] text-slate-500 select-none">
                            <span className="font-bold flex items-center gap-1 uppercase">
                              <span className={`w-1 h-1 rounded-full ${
                                e.level === "success" ? "bg-emerald-500" : e.level === "warn" ? "bg-amber-400" : e.level === "error" ? "bg-red-500" : "bg-violet-400"
                              }`} />
                              {e.sender}
                            </span>
                            <span>{new Date(e.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-white dark:text-violet-300 font-sans text-xs mt-0.5">
                            {e.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* --- INSPECTOR CONTENT: FABRIC CHAT (grounded assistant) --- */}
          {inspectorContent === "chat" && (
            <FabricChat
              isDark={isDark}
              messages={chatMessages}
              nodes={nodes}
              loading={chatLoading}
              chatCost={3}
              onAsk={askFabric}
              onCiteClick={(id) => { setChatOpen(false); setSelectedNodeId(id); const n = nodes.find(x => x.id === id); if (n) setCorrectionContent(n.content); }}
              onDeepDive={deepDive}
              onClose={() => setChatOpen(false)}
            />
          )}

          {/* --- INSPECTOR CONTENT: CUSTOM AGENTS --- */}
          {inspectorContent === "agents" && (
            <CustomAgents
              isDark={isDark}
              agents={customAgentsList}
              creating={customCreating}
              runningId={customRunningId}
              onCreate={createCustomAgent}
              onRun={runCustomAgentClient}
              onDelete={deleteCustomAgent}
              onClose={() => setCustomOpen(false)}
            />
          )}

          {/* --- INSPECTOR CONTENT: MISSION PULSE (default overview) --- */}
          {inspectorContent === "pulse" && (() => {
            const sig = nodes.filter(n => n.type === "web-signal");
            const grounded = sig.filter(n => n.grounded === true).length;
            const contra = nodes.filter(n => (n.conflict || n.flagged_by === "sentinel") && n.type !== "correction").length;
            const futs = nodes.filter(n => n.time_horizon === "future").length;
            const corrections = nodes.filter(n => n.type === "correction").length;
            const verifiedCount = sig.filter(n => n.verified !== false).length;
            const srcTotal = sig.reduce((s, n) => s + sourceCount(n), 0);
            const pctVerified = sig.length ? Math.round((verifiedCount / sig.length) * 100) : 0;
            const proposed = actions.filter(a => a.status === "proposed");
            const fp = selectedMission?.footprint;
            return (
              <div className="flex flex-col h-full overflow-y-auto">
                <div className={`p-4 border-b flex justify-between items-center select-none flex-shrink-0 ${
                  isDark ? "bg-black/25 border-white/[0.06]" : "bg-slate-50 border-slate-200"
                }`}>
                  <h3 className={`text-sm font-bold tracking-tight flex items-center gap-2 font-display ${t.textTitle}`}>
                    <PulseIcon className="w-4 h-4 text-indigo-400" />
                    Mission Pulse
                  </h3>
                  <button
                    onClick={() => setInspectorOpen(false)}
                    className={`p-1.5 rounded-lg ${isDark ? "text-gray-400 hover:bg-white/10 hover:text-white" : "text-slate-400 hover:bg-slate-100"}`}
                    title="Hide inspector panel"
                  >
                    <PanelRightClose className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 flex flex-col gap-4">
                  {/* status + persona */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                      selectedMission?.status === "ready" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" : "bg-amber-500/10 text-amber-400 border border-amber-500/25 animate-pulse"
                    }`}>{selectedMission?.status}</span>
                    {selectedMission?.persona && (
                      <span className={`flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full border ${isDark ? "border-white/10 text-gray-400" : "border-slate-200 text-slate-500"}`}>
                        <User className="w-2.5 h-2.5" />{selectedMission.persona}
                      </span>
                    )}
                    {selectedMission?.monitoring && (
                      <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400"><Radio className="w-2.5 h-2.5 animate-pulse" /> monitoring</span>
                    )}
                  </div>

                  {/* verified-findings readout (replaces the old confidence gauge) */}
                  <div className={`rounded-xl border p-4 flex flex-col gap-2 noise relative overflow-hidden ${isDark ? "bg-[#0c101f] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                    <span className={`relative z-10 text-[9px] font-mono uppercase tracking-widest font-bold ${t.textMute}`}>Verified findings</span>
                    <div className="relative z-10 flex items-end gap-2">
                      <span className="text-3xl font-bold font-display tabular leading-none text-emerald-400">{verifiedCount}<span className="text-base text-slate-400 font-semibold">/{sig.length}</span></span>
                      <span className={`text-[10px] pb-0.5 ${t.textMute}`}>cross-checked across {srcTotal} sources</span>
                    </div>
                    <div className={`relative z-10 h-2 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-slate-200"}`}>
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                        initial={{ width: 0 }}
                        animate={{ width: `${pctVerified}%` }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <div className="relative z-10 grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1.5">
                      {[
                        { label: "findings", value: sig.length, cls: t.textTitle },
                        { label: "live sources", value: grounded, cls: "text-emerald-400" },
                        { label: "open conflicts", value: contra, cls: contra ? "text-rose-400" : t.textTitle },
                        { label: "resolved", value: corrections, cls: corrections ? "text-cyan-400" : t.textTitle },
                      ].map(s => (
                        <div key={s.label} className="flex items-baseline justify-between gap-2">
                          <span className={`text-[9.5px] font-mono ${t.textMute}`}>{s.label}</span>
                          <span className={`text-sm font-bold tabular ${s.cls}`}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* proposed actions preview */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-mono uppercase tracking-widest font-bold ${t.textMute}`}>Proposed actions</span>
                      {proposed.length > 0 && (
                        <button onClick={() => { setFooterOpen(true); setActiveTab("actions"); }} className="text-[10px] font-bold text-indigo-400 hover:underline">
                          Open all ({proposed.length}) →
                        </button>
                      )}
                    </div>
                    {proposed.length === 0 ? (
                      <p className={`text-[10.5px] leading-relaxed rounded-lg border border-dashed px-3 py-2.5 ${isDark ? "border-white/10 text-gray-500" : "border-slate-200 text-slate-400"}`}>
                        The Actor agent drafts emails, briefs and reminders from verified findings. They appear here for one-click approval.
                      </p>
                    ) : (
                      proposed.slice(0, 2).map(act => (
                        <button
                          key={act.id}
                          onClick={() => { setFooterOpen(true); setActiveTab("actions"); }}
                          className={`text-left rounded-lg border p-2.5 transition-all card-hover ${isDark ? "bg-[#0c101f] border-white/[0.06]" : "bg-white border-slate-200"}`}
                        >
                          <span className="text-[8.5px] font-mono uppercase text-indigo-400">{act.kind}</span>
                          <p className={`text-[11px] font-bold leading-snug line-clamp-2 ${t.textTitle}`}>{act.title}</p>
                        </button>
                      ))
                    )}
                  </div>

                  {/* run history */}
                  {missionRuns.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className={`text-[9px] font-mono uppercase tracking-widest font-bold ${t.textMute}`}>Sensing runs</span>
                      {missionRuns.slice(-3).reverse().map(run => (
                        <div key={run.id} className={`flex items-center gap-2 text-[10px] rounded-lg px-2.5 py-1.5 border ${isDark ? "border-white/[0.05] bg-white/[0.02]" : "border-slate-100 bg-slate-50"}`}>
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold tabular flex-shrink-0 ${isDark ? "bg-indigo-500/15 text-indigo-300" : "bg-indigo-50 text-indigo-600"}`}>{run.index}</span>
                          <span className={`truncate flex-1 ${t.textDesc}`}>{run.summary || `${run.newSignals} new signal(s)`}</span>
                          <span className={`font-mono flex-shrink-0 ${t.textMute}`}>{run.trigger}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* footprint */}
                  {fp && (
                    <div className={`rounded-xl border p-3 flex items-center justify-between gap-2 ${isDark ? "bg-emerald-500/[0.05] border-emerald-500/15" : "bg-emerald-50/60 border-emerald-200/60"}`}>
                      <div className="flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className={`text-[10px] font-bold ${t.textTitle}`}>{(fp.co2Saved_g).toFixed(1)} g CO₂ saved</span>
                          <span className={`text-[9px] font-mono ${t.textMute}`}>{fp.tokens.toLocaleString()} tokens · {fp.provider}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 tabular">+{fp.creditsEarned} cr</span>
                    </div>
                  )}

                  {/* hint */}
                  <p className={`text-[10px] leading-relaxed flex gap-1.5 ${t.textMute}`}>
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-indigo-400" />
                    Click any finding on the {WORKSPACE_VIEWS.find(v => v.key === workspaceMode)?.label || "board"} to see its data, sources and where it came from.
                  </p>
                </div>
              </div>
            );
          })()}

              </aside>
            </div>

          </main>

        </div>
      )}

      {/* --- AUTH: sign in / create account --- */}
      {authPrompt && (
        <AuthModal
          isDark={isDark}
          initialMode={authPrompt.mode || "signup"}
          reason={authPrompt.reason}
          onClose={() => setAuthPrompt(null)}
          onAuthed={onAuthed}
        />
      )}

      {/* --- WALLET: balance, metered ledger, earn credits --- */}
      {walletOpen && handle && (
        <Wallet
          isDark={isDark}
          profile={profile}
          pledges={pledges}
          minReserve={minReserve}
          claimingId={claimingPledgeId}
          onClaim={claimPledge}
          onClose={() => setWalletOpen(false)}
          onSignOut={signOut}
        />
      )}

      {/* --- MEDIA STUDIO: Visualizer / Cinematographer --- */}
      {studioOpen && selectedMission && (
        <MediaStudio
          isDark={isDark}
          missionId={selectedMission.id}
          authed={authed}
          seedPrompt={studioSeed}
          onRequireAuth={(reason) => requireAuth(reason)}
          onOpenSettings={() => { setStudioOpen(false); setSettingsOpen(true); }}
          onSpent={() => { if (handle) fetchProfile(handle); }}
          onClose={() => setStudioOpen(false)}
        />
      )}

      {/* --- EDIT SWARM: reshape the live mission --- */}
      {editOpen && selectedMission && (
        <MissionSettings
          isDark={isDark}
          mission={selectedMission}
          personas={PERSONAS}
          busy={editSaving}
          resenseCost={deployCost}
          onClose={() => setEditOpen(false)}
          onSave={handleSaveMissionSpec}
        />
      )}

      {/* --- MISSION PLANNER: choose a strategic angle before deploying --- */}
      {showPlanner && (
        <MissionPlanner
          isDark={isDark}
          prompt={planPrompt}
          persona={selectedPersona}
          deployCost={deployCost}
          loading={planLoading}
          variants={planVariants}
          deployingId={planDeployingId}
          onSelect={(v) => createAndLaunchMission(v.refined_prompt, v.id)}
          onRunAsIs={() => createAndLaunchMission(planPrompt, "as-is")}
          onCancel={closePlanner}
        />
      )}

      {/* --- MODEL CONTROL CENTER: switch engines, bring your own keys --- */}
      {settingsOpen && (
        <SettingsModal
          isDark={isDark}
          onClose={() => setSettingsOpen(false)}
          onSaved={(cfg) => {
            if (cfg?.chain?.length) setActiveEngine({ provider: cfg.chain[0].name, model: cfg.chain[0].model });
            else setActiveEngine(null);
            fetchLlmStatus();
          }}
        />
      )}

      {/* --- FIRST-RUN SPOTLIGHT TOUR over the live workspace --- */}
      {currentView === "workspace" && launched && showGuide && !isMaximized && (
        <OnboardingTour isDark={isDark} steps={TOUR_STEPS} onFinish={dismissGuide} />
      )}

    </div>
  );
}
