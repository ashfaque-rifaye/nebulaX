import React, { useState, useEffect, useRef, FormEvent } from "react";
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
  Minimize
} from "lucide-react";
import { Mission, WeaveNode, WeaveEdge, ProposedAction, ActivityFeedEvent, ResearchBrief, AgentStatus, MissionPlanVariant, Profile, ChatTurn, MissionRun, CustomAgent } from "./types.ts";
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
import { SignalRadar } from "./components/SignalRadar.tsx";
import { MissionPlanner } from "./components/MissionPlanner.tsx";

// Per-agent glyphs for the swarm rail.
const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  conductor: Compass,
  pathfinder: Search,
  veritas: ShieldCheck,
  cartographer: Network,
  sentinel: ShieldAlert,
  oracle: Sparkles,
  scribe: BookOpen,
  actor: Mail,
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
  const [workspaceMode, setWorkspaceMode] = useState<"canvas" | "fabric2d" | "replay" | "triage" | "radar" | "vista">("canvas");
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

  // Green Credits / profile (earn credits via eco-pledges, spend to deploy agents)
  const [handle, setHandleState] = useState<string | null>(() => {
    try { return localStorage.getItem("nebula-handle"); } catch { return null; }
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pledges, setPledges] = useState<PledgeDef[]>([]);
  const [deployCost, setDeployCost] = useState(25);
  const [profileLoading, setProfileLoading] = useState(false);
  const [claimingPledgeId, setClaimingPledgeId] = useState<string | null>(null);

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
    setForecasting(true);
    try {
      const res = await fetch(`/api/missions/${selectedMissionId}/forecast`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle })
      });
      if (res.ok) {
        await fetchMissionData(selectedMissionId);
        if (handle) fetchProfile(handle);
      } else if (res.status === 402) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || "Not enough Green Credits to forecast.");
      }
    } catch (err) { console.error("Forecast failed:", err); }
    finally { setForecasting(false); }
  };
  const layoutSaveTimer = useRef<any>(null);

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
  const [correctionContent, setCorrectionContent] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [reweaving, setReweaving] = useState(false);

  // Interactive Live Canvas States (for Panning, Zooming, and Positioning)
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [canvasZoom, setCanvasZoom] = useState(1.0);
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
  // Highlight nodes from the latest run only once a re-sense has happened.
  const newestRunId = missionRuns.length > 1 ? missionRuns[missionRuns.length - 1].id : null;
  const parentMission = selectedMission?.parent_id ? missions.find(m => m.id === selectedMission.parent_id) : undefined;

  const PERSONAS = [
    "Founder / Product Executive",
    "VC / Battery Investor",
    "Job Seeker / Engineering Lead",
    "Market Research Analyst"
  ];

  // Sync / Fetch hooks
  useEffect(() => {
    fetchMissions();
    fetchAgents();
    fetchLlmStatus();
    fetchPledges();
    fetchProfile(handle);

    // Sync theme class to document element
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.className = "bg-[#07090e] text-gray-200 antialiased";
    } else {
      document.documentElement.classList.remove("dark");
      document.body.className = "bg-[#f8fafc] text-slate-800 antialiased";
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
    const iv = setInterval(() => { handleResense("monitor"); }, 45000);
    return () => clearInterval(iv);
  }, [launched, selectedMission?.monitoring, selectedMission?.status, selectedMissionId]);

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

  // Hook to attach non-passive wheel zoom
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomIntensity = 0.05;
      const nextZoom = Math.min(Math.max(canvasZoom - e.deltaY * zoomIntensity * 0.01, 0.4), 2.5);
      setCanvasZoom(nextZoom);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, [canvasZoom]);

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

  const persistHandle = (h: string) => {
    try { localStorage.setItem("nebula-handle", h); } catch {}
    setHandleState(h);
    fetchProfile(h);
  };

  const claimPledge = async (pledgeId: string) => {
    if (!handle) return;
    setClaimingPledgeId(pledgeId);
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(handle)}/pledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pledgeId })
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      } else if (res.status === 409) {
        await fetchProfile(handle); // already claimed today — resync
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
  const launchMission = (missionId: string, mode: "canvas" | "fabric2d" | "replay" | "triage" | "radar" | "vista" = "canvas") => {
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
        body: JSON.stringify({ prompt, persona: selectedPersona, handle })
      });
      if (res.ok) {
        const createdMission = await res.json();
        await fetchMissions();
        if (handle) fetchProfile(handle); // reflect the spent credits
        setNewPrompt("");
        setActiveTab("analysis");
        setShowPlanner(false);
        setPlanVariants([]);
        setPlanDeployingId(null);
        launchMission(createdMission.id, "canvas");
      } else if (res.status === 402) {
        const err = await res.json().catch(() => ({}));
        if (handle) fetchProfile(handle);
        setPlanDeployingId(null);
        alert(err.error || "Not enough Green Credits. Earn more with eco-pledges on the dashboard.");
        setShowPlanner(false);
        setCurrentView("home"); // send them to the Green Credits panel to earn
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
    if (trigger === "resense") setResensing(true);
    try {
      const res = await fetch(`/api/missions/${selectedMissionId}/resense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, trigger })
      });
      if (res.ok) {
        await fetchMissions();
        if (handle) fetchProfile(handle);
      } else if (res.status === 402 && trigger === "resense") {
        const e = await res.json().catch(() => ({}));
        alert(e.error || "Not enough Green Credits to re-sense. Earn more via eco-pledges.");
      }
    } catch (err) {
      console.error("Re-sense failed:", err);
    } finally {
      if (trigger === "resense") setResensing(false);
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
    setCustomRunningId(agentId);
    try {
      const res = await fetch(`/api/custom-agents/${agentId}/run`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle })
      });
      if (res.ok) {
        await fetchMissionData(selectedMissionId);
        await fetchCustomAgents(selectedMissionId);
        if (handle) fetchProfile(handle);
      } else if (res.status === 402) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || "Not enough Green Credits to run this agent.");
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
    // optimistic user turn
    setChatMessages(prev => [...prev, {
      id: `tmp-${Date.now()}`, mission_id: selectedMissionId, role: "user", content: question, created_at: new Date().toISOString()
    }]);
    setChatLoading(true);
    try {
      const res = await fetch(`/api/missions/${selectedMissionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, handle })
      });
      if (res.ok) {
        await fetchChat(selectedMissionId);
        if (handle) fetchProfile(handle);
      } else if (res.status === 402) {
        const e = await res.json().catch(() => ({}));
        await fetchChat(selectedMissionId);
        alert(e.error || "Not enough Green Credits to ask. Earn more via eco-pledges.");
      }
    } catch (err) {
      console.error("Chat failed:", err);
    } finally {
      setChatLoading(false);
    }
  };

  const deepDive = async (seed: string) => {
    if (!selectedMissionId) return;
    const childPrompt = `Deep dive: ${seed} — a focused investigation branching from "${selectedMission?.prompt || ""}".`;
    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: childPrompt, persona: selectedPersona, handle, parent_id: selectedMissionId })
      });
      if (res.ok) {
        const child = await res.json();
        await fetchMissions();
        if (handle) fetchProfile(handle);
        setChatOpen(false);
        launchMission(child.id, "canvas");
      } else if (res.status === 402) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || "Not enough Green Credits to spawn a deep-dive mission.");
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

  const handleSubmitCorrection = async (nodeId: string) => {
    if (!correctionContent.trim() || !selectedMissionId) return;

    setIsCorrecting(true);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/correct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: correctionContent,
          reason: correctionReason || "Refining details with human verification override.",
          mission_id: selectedMissionId
        })
      });

      if (res.ok) {
        setCorrectionContent("");
        setCorrectionReason("");
        await handleTriggerReweave();
        // If this mission already has forecasted futures, re-forge them from the
        // now-corrected present — the Temporal Vista heals with a green bloom.
        const hasFutures = nodes.some(n => n.time_horizon === "future");
        if (hasFutures) {
          await handleForecast();
        }
      }
    } catch (err) {
      console.error("Failed to post override correction:", err);
    } finally {
      setIsCorrecting(false);
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
  const getNodePosition = (node: WeaveNode, index: number) => {
    const layoutPaymentsMap: { [key: string]: { x: number; y: number } } = {
      "node-p1": { x: 180, y: 150 },
      "node-p2": { x: 420, y: 80 },
      "node-p3": { x: 680, y: 120 },
      "node-p4": { x: 690, y: 350 },
      "node-p5": { x: 190, y: 360 },
      "node-p6": { x: 415, y: 240 },
      "node-p7": { x: 430, y: 410 }
    };

    const layoutBatteryMap: { [key: string]: { x: number; y: number } } = {
      "node-b1": { x: 190, y: 150 },
      "node-b2": { x: 490, y: 130 },
      "node-b3": { x: 790, y: 160 },
      "node-b4": { x: 490, y: 380 }
    };

    if (node.mission_id === "mission-payments" && layoutPaymentsMap[node.id]) {
      return layoutPaymentsMap[node.id];
    }
    if (node.mission_id === "mission-battery" && layoutBatteryMap[node.id]) {
      return layoutBatteryMap[node.id];
    }

    // Centered Grid coordinates for dynamically spawned user-defined missions
    const row = Math.floor(index / 3);
    const col = index % 3;
    const isScribeNode = node.type === "synthesis";
    
    if (isScribeNode) {
      return { x: 450, y: 220 + row * 180 };
    }
    return {
      x: 180 + col * 280 + (row % 2 === 0 ? 0 : 40),
      y: 120 + row * 220 + (node.type === "correction" ? 90 : 0)
    };
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

  // Confidence propagation badge color mappings
  const getConfColor = (score: number, borderOnly = false) => {
    if (score >= 0.8) {
      return borderOnly ? "border-emerald-500/50" : "text-emerald-500 bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30";
    }
    if (score >= 0.5) {
      return borderOnly ? "border-amber-500/50" : "text-amber-500 bg-amber-500/10 border-amber-500/30 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/30";
    }
    return borderOnly ? "border-red-500/50" : "text-red-500 bg-red-400/10 border-red-500/20 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/20";
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

  const t = {
    bgCanvas: isDark ? "bg-[#07090e]" : "bg-[#f8fafc]",
    bgContainer: isDark ? "bg-[#07090e] text-gray-200" : "bg-[#f1f5f9] text-slate-800",
    bgHeader: isDark ? "bg-[#0b0e14]/90 border-white/5" : "bg-white border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
    bgRail: isDark ? "bg-[#090c12]/80 border-white/5" : "bg-[#f8fafc] border-slate-200/80",
    bgPane: isDark ? "bg-[#0a0d14]/90 border-white/5" : "bg-white border-slate-200 shadow-[0_-4px_24px_rgba(15,23,42,0.05)]",
    bgSubBar: isDark ? "bg-[#0b0e15]/60 border-white/5" : "bg-[#f8fafc] border-slate-100",
    bgCard: isDark ? "bg-[#0b0f19]/90 border-white/5 text-gray-200 shadow-xl" : "bg-white border-slate-200/90 text-slate-800 shadow-[0_4px_12px_rgba(15,23,42,0.04)]",
    textTitle: isDark ? "text-white" : "text-slate-900 font-semibold",
    textDesc: isDark ? "text-gray-300" : "text-slate-600",
    textMute: isDark ? "text-gray-400" : "text-slate-500",
    bgInner: isDark ? "bg-[#111622]" : "bg-slate-50/90",
    borderTheme: isDark ? "border-white/5" : "border-slate-100",
    textOption: isDark ? "bg-[#111622] text-[#e6edf3]" : "bg-white text-slate-800",
    shadow: isDark ? "shadow-2xl shadow-blue-500/5" : "shadow-md shadow-slate-200",
    glow: isDark ? "glow-bg" : "hidden",
    svgLines: isDark ? "#1e293b" : "#cbd5e1",
    gridOpacity: isDark ? "opacity-20" : "opacity-[0.06]"
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${t.bgContainer}`}>
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scanner {
          animation: scan 2.5s linear infinite;
        }
      `}</style>
      {/* Decorative Blur (only shown in dark mode context) */}
      <div className={t.glow}></div>

      {/* --- RE-ENGINEERED NAVBAR GLOBAL PANEL --- */}
      {!isMaximized && (
      <header className={`px-6 py-3.5 sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b backdrop-blur-md ${t.bgHeader}`}>
        {/* LOGO TITLE SECTION */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Network className="w-5 h-5 text-white" />
            </div>
            {isDark && <div className="absolute -inset-1 rounded-lg bg-blue-500/20 blur opacity-70 -z-10"></div>}
          </div>
          <div>
            <h1 className={`text-lg font-extrabold tracking-tight flex items-center gap-2 ${t.textTitle}`}>
              NEBULA
              <span className="text-[9px] font-mono tracking-widest text-blue-500 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/40 px-1.5 py-0.5 rounded uppercase font-medium">
                Team Fabric
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-gray-400 font-mono">Autonomous Self-Correcting Web Intelligence Swarm</p>
          </div>
        </div>

        {/* INTER-VIEW CONTROLS TAB SWITCHER */}
        <div className={`flex items-center gap-1.5 p-1 rounded-lg border pr-2.5 ${
          isDark ? "bg-[#090c12]/80 border-white/5" : "bg-slate-100 border-slate-200/50"
        }`}>
          <button
            onClick={() => setCurrentView("home")}
            className={`text-xs px-3.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              currentView === "home"
                ? (isDark ? "bg-[#1a2333] text-white shadow-sm" : "bg-white text-slate-900 shadow-sm")
                : (isDark ? "text-gray-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Overview Dashboard
          </button>
          
          <button
            onClick={() => setCurrentView("workspace")}
            className={`text-xs px-3.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              currentView === "workspace"
                ? (isDark ? "bg-[#1a2333] text-white shadow-sm" : "bg-white text-slate-900 shadow-sm")
                : (isDark ? "text-gray-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Swarm Workspace
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
              className={`hidden lg:flex text-xs px-3.5 py-1.5 rounded-md font-medium transition-all items-center gap-1.5 ${
                currentView === key
                  ? (isDark ? "bg-[#1a2333] text-white shadow-sm" : "bg-white text-slate-900 shadow-sm")
                  : (isDark ? "text-gray-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* MISSION SELECTOR GATING CONTROL */}
        {currentView === "workspace" && launched && (
          <div className={`flex items-center gap-2 rounded-lg border py-1.5 pl-3 pr-2 select-none ${
            isDark ? "bg-[#111622] border-white/5" : "bg-slate-100 border-slate-200/60"
          }`}>
            <button
              onClick={() => { setLaunched(false); setSelectedNodeId(null); setFocusedAgent(null); }}
              title="Back to Command Center"
              className={`flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors ${
                isDark ? "text-blue-300 hover:bg-white/10" : "text-blue-600 hover:bg-blue-50"
              }`}
            >
              <Plus className="w-3 h-3" /> New
            </button>
            <div className={`w-px h-4 ${isDark ? "bg-white/10" : "bg-slate-300"}`}></div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${selectedMission?.status === "ready" ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-bounce"}`}></div>
              <span className={`text-[10px] font-mono tracking-wider uppercase ${isDark ? "text-gray-450" : "text-slate-400"}`}>Focus:</span>
            </div>
            <select
              value={selectedMissionId || ""}
              onChange={e => launchMission(e.target.value, workspaceMode)}
              className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer pr-1 ${
                isDark ? "text-white" : "text-slate-800"
              }`}
            >
              {missions.map(m => (
                <option key={m.id} value={m.id} className={isDark ? "bg-[#111622] text-[#e6edf3]" : "bg-white text-slate-800"}>
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
                className={`w-full border rounded-lg py-1.5 pl-8 pr-8 text-xs focus:outline-none focus:border-blue-500 transition-all font-sans ${
                  isDark ? "bg-[#111622] border-white/5 text-white placeholder-gray-505" : "bg-slate-100 border-slate-200/60 text-slate-800 placeholder-slate-400"
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
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Deploy
            </button>
          </form>
        )}

        {/* GREEN CREDITS BALANCE CHIP */}
        {handle && (
          <button
            onClick={() => setCurrentView("home")}
            title={`${profile?.credits ?? 0} Green Credits · ${((profile?.totalCo2Saved_g ?? 0) / 1000).toFixed(2)} kg CO₂ saved — click to earn more`}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-all cursor-pointer ${
              isDark ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20" : "border-emerald-500/30 bg-emerald-50 hover:bg-emerald-100"
            }`}
          >
            <Leaf className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{profile?.credits ?? "…"}</span>
            <span className="text-[9px] font-mono text-emerald-600/70 dark:text-emerald-400/70 hidden sm:inline">cr</span>
          </button>
        )}

        {/* LIGHT/DARK MODE TOGGLE BUTTON */}
        <button
          onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
          className={`p-2 rounded-lg border transition-all outline-none cursor-pointer ${
            isDark ? "border-white/5 hover:bg-white/5" : "border-slate-200 hover:bg-slate-100"
          }`}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
      </header>
      )}

      {/* --- VIEW 1: HOME PORTAL / EXPLAINER COCKPIT --- */}
      {currentView === "home" && (
        <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col gap-8">
          
          {/* HERO INTRODUCTION PLATFORM */}
          <section className={`relative overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 md:p-10 rounded-3xl border ${t.bgCard}`}>
            {/* aurora backdrop */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-0">
              <div className="aurora absolute -top-1/3 -left-10 w-[520px] h-[520px] rounded-full bg-blue-600/20 blur-3xl" />
              <div className="aurora absolute -bottom-1/3 right-0 w-[460px] h-[460px] rounded-full bg-cyan-500/15 blur-3xl" style={{ animationDelay: "-11s" }} />
              <div className="aurora absolute top-1/2 left-1/2 w-[360px] h-[360px] rounded-full bg-fuchsia-500/10 blur-3xl" style={{ animationDelay: "-5s" }} />
            </div>

            <div className="relative z-10 lg:col-span-7 flex flex-col gap-5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-blue-500 uppercase font-semibold bg-blue-500/10 px-2.5 py-1 rounded-full w-fit">
                  <Sparkles className="w-3.5 h-3.5" />
                  Agentic Web · Microsoft Build AI
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-wider text-emerald-500 uppercase font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {llmProviders.length > 0 ? `${primaryProvider} swarm live` : "swarm online"}
                </span>
              </div>

              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
                <span className={t.textTitle}>The self-correcting</span>
                <br />
                <span className="bg-gradient-to-r from-blue-500 via-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">
                  team-intelligence fabric
                </span>
              </h2>

              <p className={`text-sm md:text-[15px] leading-relaxed max-w-xl ${t.textDesc}`}>
                State a goal in plain language. An autonomous agent swarm senses the open web, weaves every
                finding into a verified memory graph, flags contradictions, and proposes your next move —
                with <span className="font-semibold text-blue-500">every claim traceable to its source.</span>
              </p>

              {/* LIVE METRICS STRIP */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Active Missions", value: String(missions.length), icon: Compass, color: "text-blue-500" },
                  { label: "Specialist Agents", value: String(agents.length || 8), icon: Bot, color: "text-cyan-500" },
                  { label: "AI Providers", value: String(llmProviders.length || 3), icon: Layers, color: "text-fuchsia-500" },
                  { label: "Avg Confidence", value: "92%", icon: Gauge, color: "text-emerald-500" },
                ].map((m) => (
                  <div
                    key={m.label}
                    className={`rounded-xl border p-3 backdrop-blur ${isDark ? "bg-white/[0.03] border-white/10" : "bg-white/70 border-slate-200"}`}
                  >
                    <m.icon className={`w-4 h-4 mb-1.5 ${m.color}`} />
                    <div className={`text-xl font-extrabold tracking-tight ${t.textTitle}`}>{m.value}</div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400">{m.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => { setLaunched(false); setCurrentView("workspace"); }}
                  className="bg-blue-600 hover:bg-blue-500 font-bold text-white text-sm px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/25 active:scale-[0.98]"
                >
                  <Rocket className="w-4 h-4" />
                  Launch a Mission
                  <ArrowRight className="w-4 h-4" />
                </button>
                {missions[0] && (
                  <button
                    type="button"
                    onClick={() => launchMission(missions[0].id, "canvas")}
                    className={`text-sm font-semibold px-5 py-3 rounded-xl border transition-all flex items-center gap-2 ${
                      isDark ? "border-white/10 text-gray-200 hover:bg-white/5" : "border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Network className="w-4 h-4 text-blue-500" />
                    See a live example
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT SIDE: GREEN CREDITS — earn compute by cutting real emissions */}
            <div className={`relative z-10 lg:col-span-5 h-[360px] rounded-2xl overflow-hidden border flex flex-col shadow-2xl ${
              isDark ? "bg-black/30 border-white/10" : "bg-white border-slate-200/60"
            }`}>
              <GreenCredits
                isDark={isDark}
                handle={handle}
                profile={profile}
                pledges={pledges}
                deployCost={deployCost}
                loading={profileLoading}
                claimingId={claimingPledgeId}
                onSetHandle={persistHandle}
                onClaim={claimPledge}
              />
            </div>
          </section>

          {/* SECTION: EXACTLY HOW DOES IT WORK & WHAT DO THEY DO & HOW TO MEASURE */}
          <section className="flex flex-col gap-5">
            <div className="text-center md:text-left">
              <h3 className={`text-xl font-bold tracking-tight ${t.textTitle}`}>
                Operation Protocol & Agent Directory
              </h3>
              <p className={`text-xs ${t.textMute}`}>
                Understand what each specialize agent does and the exact metrics to measure if they are working.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* CARD 1: WHAT THEY DO - AGENT ROLES */}
              <div className={`p-5 rounded-xl border flex flex-col gap-3.5 ${t.bgCard}`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-950 dark:text-white">What do they do?</h4>
                </div>
                
                <p className={`text-xs leading-relaxed ${t.textDesc}`}>
                  Nebula deploys specialized cognitive virtual agents in parallel pipelines to handle distinct analytical milestones:
                </p>

                <ul className="text-xs flex flex-col gap-2.5 list-none font-sans mt-1">
                  <li className="flex gap-2.5 items-start">
                    <span className="text-blue-500 font-bold font-mono">1.</span>
                    <div>
                      <span className="font-semibold block text-slate-900 dark:text-gray-100">[Pathfinder] Scanning</span>
                      <span className="text-[11px] text-slate-500 dark:text-gray-400">Scrapes search indices, crawling target domains to fetch web signals.</span>
                    </div>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <span className="text-blue-500 font-bold font-mono">2.</span>
                    <div>
                      <span className="font-semibold block text-slate-900 dark:text-gray-100">[Veritas] Verifying</span>
                      <span className="text-[11px] text-slate-500 dark:text-gray-400">Assembles confidence indices and evaluates source reliability.</span>
                    </div>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <span className="text-blue-500 font-bold font-mono">3.</span>
                    <div>
                      <span className="font-semibold block text-slate-900 dark:text-gray-100">[Scribe & Oracle] Synthesizing</span>
                      <span className="text-[11px] text-slate-500 dark:text-gray-400">Generates executive brief reports and draft proposed actions.</span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* CARD 2: Drift detection Sentinel */}
              <div className={`p-5 rounded-xl border flex flex-col gap-3.5 ${t.bgCard}`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/15 flex items-center justify-center text-red-600 dark:text-red-400">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-950 dark:text-white">Contradiction Sentinel Shield</h4>
                </div>
                
                <p className={`text-xs leading-relaxed ${t.textDesc}`}>
                  How does the system ensure sanity and credibility under conflicting web reports?
                </p>

                <div className="text-xs flex flex-col gap-3">
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded p-2.5 text-[11px]">
                    <span className="font-semibold text-amber-600 dark:text-amber-400 block mb-1">🎯 Automated Verification Flags</span>
                    The <span className="font-bold">Sentinel Agent</span> executes deep semantic contradictions checks between web nodes. If two sources assert contrasting claims, the system triggers a <span className="text-red-400 font-bold">Drift Exception Alert</span> and suppresses confidence values automatically!
                  </div>
                  
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-2.5 text-[11px]">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">🛠 Recalculation Mathematics</span>
                    Once a human operator posts a corrigendum memory veto, Nebula's re-weaving algorithm propagates confidence values network-wide, immediately rectifying the system summary.
                  </div>
                </div>
              </div>

              {/* CARD 3: MEASURING METHOD / HOW TO CONFIRM */}
              <div className={`p-5 rounded-xl border flex flex-col gap-3.5 ${t.bgCard}`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-500">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-950 dark:text-white">How to measure if they are working?</h4>
                </div>
                
                <p className={`text-xs leading-relaxed ${t.textDesc}`}>
                  You can inspect and confirm agent performance dynamically inside the workspaces:
                </p>

                <ul className="text-xs flex flex-col gap-2 list-none font-sans mt-1">
                  <li className="flex gap-2 items-start">
                    <span className="text-emerald-500 text-[10px] bg-emerald-500/10 px-1 py-0.5 rounded font-mono font-bold uppercase flex-shrink-0">1. Rails</span>
                    <span className="text-[11px] text-slate-500 dark:text-gray-400">Review the left <span className="font-semibold">Swarm Active Monitor Rails</span> to verify which agent is actively chewing tasks.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-emerald-500 text-[10px] bg-emerald-500/10 px-1 py-0.5 rounded font-mono font-bold uppercase flex-shrink-0">2. Thread</span>
                    <span className="text-[11px] text-slate-500 dark:text-gray-400">Hover summary sentences to track citations. If nodes glow, you have active trace pathways connected.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-emerald-500 text-[10px] bg-emerald-500/10 px-1 py-0.5 rounded font-mono font-bold uppercase flex-shrink-0">3. Streams</span>
                    <span className="text-[11px] text-slate-500 dark:text-gray-400">Examine the <span className="font-semibold">Chronological Operations Log Stream</span> at the bottom to see live event payloads and timestamps.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-emerald-500 text-[10px] bg-emerald-500/10 px-1 py-0.5 rounded font-mono font-bold uppercase flex-shrink-0">4. Veto</span>
                    <span className="text-[11px] text-slate-500 dark:text-gray-400">Submit a correction. If the connected nodes immediately shift confidence values on the Canvas, the pipeline is alive!</span>
                  </li>
                </ul>
              </div>

            </div>
          </section>

          {/* DYNAMIC SWARM GALLERY AND STARTERS */}
          <section className="flex flex-col gap-4">
            <h3 className={`text-lg font-bold tracking-tight ${t.textTitle}`}>
              Currently Deployed Swarm Missions
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Render dynamic missions from database state */}
              {missions.map(mission => {
                const isPayments = mission.id === "mission-payments";
                return (
                  <div
                    key={mission.id}
                    className={`p-5 rounded-xl border flex flex-col justify-between gap-4 select-none hover:scale-[1.01] transition-all duration-200 cursor-pointer ${
                      selectedMissionId === mission.id ? "ring-2 ring-blue-500 " + t.bgCard : t.bgCard
                    }`}
                    onClick={() => launchMission(mission.id, "canvas")}
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[10px] font-mono leading-none">
                        <span className="text-blue-500 font-bold uppercase">Mission ID: {mission.id.split("-").pop()}</span>
                        <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                          mission.status === "ready" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                        }`}>
                          {mission.status}
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight line-clamp-2">
                        "{mission.prompt}"
                      </h4>
                      <p className={`text-[11px] line-clamp-2 leading-relaxed ${t.textMute}`}>
                        Target Watchlist Entities: {mission.targets.join(", ")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono border-t border-slate-200/50 dark:border-white/5 pt-3">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(mission.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 hover:underline">
                        Launch Workspace
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* STATS SUMMARY BOX FOR FAST VERIFICATION */}
              <div className={`p-5 rounded-xl border flex flex-col justify-between bg-gradient-to-br from-blue-900/10 to-teal-900/10 dark:from-blue-900/20 dark:to-teal-900/20 border-blue-500/15 ${t.shadow}`}>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-blue-500 font-bold uppercase tracking-widest block">System Diagnostics</span>
                  <h4 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                    <PulseIcon className="w-4 h-4 text-emerald-500 animate-pulse" />
                    Telemetric Indexing Matrix
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-snug">
                    Veritas credibility calculations, Pathfinder crawling buffers, and Sentinel contradiction exceptions are fully synchronized.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/40 dark:border-white/5 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block pb-0.5">Average Confidence:</span>
                    <span className="font-bold text-emerald-500">92.4% Verified</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block pb-0.5">Veto Corrections:</span>
                    <span className="font-bold text-blue-500">Activated (100% CF)</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

        </main>
      )}

      {/* --- EXPLAINER PAGES --- */}
      {currentView === "how" && <HowItWorksPage isDark={isDark} onLaunch={goLaunch} />}
      {currentView === "agents" && <AgentsPage isDark={isDark} onLaunch={goLaunch} />}
      {currentView === "usecases" && <UseCasesPage isDark={isDark} onLaunch={goLaunch} />}
      {currentView === "log" && <MissionLog isDark={isDark} missions={missions} onOpen={(id) => launchMission(id, "canvas")} />}

      {/* --- VIEW 2A: WORKSPACE COMMAND CENTER (shown until a mission is opened) --- */}
      {currentView === "workspace" && !launched && (
        <main className="flex-1 relative overflow-y-auto flex flex-col items-center justify-center px-4 py-10">
          {/* aurora backdrop */}
          {isDark && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="aurora absolute top-1/4 left-1/3 w-[480px] h-[480px] rounded-full bg-blue-600/15 blur-3xl" />
              <div className="aurora absolute bottom-1/4 right-1/3 w-[420px] h-[420px] rounded-full bg-cyan-500/10 blur-3xl" style={{ animationDelay: "-8s" }} />
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
                "Track how Razorpay, Cashfree and PayU shift enterprise pricing and AI features",
                "Monitor solid-state battery startups for hiring surges and breakthrough claims",
                "Watch OpenAI and Anthropic enterprise pricing and model release strategy"
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
                      onClick={() => launchMission(m.id, "canvas")}
                      className={`text-left p-3.5 rounded-xl border transition-all group hover:-translate-y-0.5 ${
                        isDark ? "bg-[#0b0f19]/80 border-white/5 hover:border-blue-500/40" : "bg-white border-slate-200 hover:border-blue-400 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-mono font-bold text-blue-500 uppercase">{m.id.split("-").pop()}</span>
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                          m.status === "ready" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                        }`}>{m.status}</span>
                      </div>
                      <p className={`text-[11.5px] font-semibold leading-snug line-clamp-2 ${isDark ? "text-gray-200" : "text-slate-800"}`}>
                        {m.prompt}
                      </p>
                      <span className="text-[10px] font-mono text-blue-500 flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
          
          {/* --- LEFT SIDE: SWARM MONITORING RAIL --- */}
          {!isMaximized && (
          <aside className={`w-full md:w-36 px-2.5 py-4 flex flex-row md:flex-col gap-3 justify-between md:justify-start items-stretch border-r overflow-x-auto select-none ${t.bgRail}`}>
            <div className="flex items-center gap-2 pb-2 md:border-b border-slate-200/50 dark:border-white/5 px-1 flex-shrink-0 select-none">
              <Bot className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <span className="text-[10px] font-mono tracking-widest text-slate-500 dark:text-gray-400 uppercase font-bold">
                SWARM RAILS
              </span>
            </div>

            <div className="flex flex-row md:flex-col gap-2 w-full flex-shrink-0">
              {agents.map(a => {
                const currentWork = getAgentWorkingLabel(a.id);
                const isWorking = currentWork === "working" || runningAgentId === a.id;
                const isFocused = focusedAgent?.id === a.id;
                const AgentIcon = AGENT_ICONS[a.id] || Bot;

                // Live "what it's doing" — newest event emitted by this agent.
                const liveEvent = [...events].reverse().find(
                  e => e.sender.toLowerCase() === a.id.toLowerCase() || e.sender.toLowerCase() === a.name.toLowerCase()
                );

                let completeStatus = "STANDBY";
                let completeLabel = "Listening signals";
                if (selectedMission?.status === "ready") {
                  completeStatus = "STABLE";
                  if (a.id === "conductor") completeLabel = "Orchestration OK";
                  else if (a.id === "pathfinder") completeLabel = "Signal files crawled";
                  else if (a.id === "veritas") completeLabel = "Citations verified";
                  else if (a.id === "cartographer") completeLabel = "Weave graph laid out";
                  else if (a.id === "sentinel") completeLabel = "Contradictions resolved";
                  else if (a.id === "oracle") completeLabel = "Strategy ready";
                  else if (a.id === "scribe") completeLabel = "Provenance indexed";
                  else if (a.id === "actor") completeLabel = "Proposed action ready";
                }

                const subLine = isWorking ? (liveEvent?.message || a.task) : (liveEvent?.message || completeLabel);

                return (
                  <div
                    key={a.id}
                    onClick={() => {
                      setSelectedNodeId(null);
                      setFocusedAgent(a);
                    }}
                    title={`${a.name}: ${a.task} (Click to inspect console)`}
                    className={`flex flex-col gap-1 p-2 rounded-lg border text-left transition-all relative cursor-pointer select-none overflow-hidden ${
                      isWorking ? "agent-working" : ""
                    } ${
                      isFocused
                        ? "bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/35 shadow-lg shadow-blue-500/10 active:scale-[0.98]"
                        : isWorking
                        ? "bg-blue-500/10 border-blue-500/50 active:scale-[0.98]"
                        : "bg-black/5 border-slate-200 dark:bg-[#0f1420]/30 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-[#0f1420]/60 hover:shadow-md hover:border-slate-300 dark:hover:border-white/10 active:scale-[0.98]"
                    }`}
                  >
                    {/* Active Laser Sweep */}
                    {isWorking && (
                      <div className="absolute inset-x-0 h-[1.5px] bg-blue-500/80 animate-scanner pointer-events-none" />
                    )}

                    <div className="flex items-center gap-1.5 select-none">
                      {/* glowing agent avatar */}
                      <span
                        className={`relative w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                          isWorking
                            ? "bg-blue-500 text-white"
                            : selectedMission?.status === "ready"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : isDark ? "bg-white/5 text-gray-400" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        <AgentIcon className={`w-3 h-3 ${isWorking ? "animate-pulse" : ""}`} />
                        {isWorking && <span className="absolute -inset-0.5 rounded-md bg-blue-500/40 blur animate-pulse -z-10" />}
                      </span>
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white font-display truncate flex-1">
                        {a.name}
                      </span>
                      <div
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          isWorking
                            ? "bg-blue-400 animate-ping"
                            : selectedMission?.status === "ready"
                            ? "bg-emerald-500/60 animate-pulse"
                            : "bg-slate-400"
                        }`}
                      ></div>
                    </div>

                    <span className={`text-[7.5px] font-mono truncate tracking-wide flex items-center gap-1 ${
                      isWorking
                        ? "text-blue-500 dark:text-blue-400 font-bold"
                        : selectedMission?.status === "ready"
                        ? "text-emerald-500 dark:text-emerald-400"
                        : "text-slate-400 dark:text-gray-400"
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${isWorking ? "bg-blue-400 animate-pulse" : "bg-current"}`} />
                      {isWorking ? "DECODING" : completeStatus}
                    </span>
                    <p className="text-[7.5px] text-slate-400 dark:text-slate-500 leading-snug line-clamp-2 min-h-[18px]">
                      {subLine}
                    </p>
                  </div>
                );
              })}
            </div>
          </aside>
          )}

          {/* --- MAIN CENTER: VIEWPORT, CANVAS AND GRAPH PANEL --- */}
          <main className={`flex-1 flex flex-col min-w-0 ${t.bgCanvas} overflow-hidden relative ${isMaximized ? 'bg-[#06080d] dark:bg-[#06080d] z-[100]' : ''}`} ref={workspaceContainerRef}>

            {/* BACKGROUND MATRIX GRID */}
            <div
              className={`absolute inset-0 pointer-events-none transition-opacity ${t.gridOpacity}`}
              style={{
                backgroundImage: "radial-gradient(rgba(148,163,184,0.15) 1.5px, transparent 1.5px)",
                backgroundSize: `${24 * canvasZoom}px ${24 * canvasZoom}px`,
                backgroundPosition: `${canvasPan.x}px ${canvasPan.y}px`
              }}
            ></div>
            
            {/* STATIC SUBBAR STATUS NOTIFIER */}
            {!isMaximized && (
            <section className={`px-4 py-2 block xl:flex items-center justify-between z-10 text-xs border-b ${t.bgSubBar}`}>
              <div className="flex items-center gap-2 mb-2 xl:mb-0">
                <span className="text-slate-400 dark:text-gray-400 font-mono hidden sm:inline">Telemetry Focus:</span>
                {parentMission && (
                  <button
                    onClick={() => launchMission(parentMission.id, workspaceMode)}
                    title={`Deep-dive of: ${parentMission.prompt}`}
                    className="flex items-center gap-1 text-[10px] font-mono text-fuchsia-500 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded px-1.5 py-0.5 hover:bg-fuchsia-500/20"
                  >
                    <FlaskConical className="w-3 h-3" />
                    deep-dive ↑
                  </button>
                )}
                <span className="font-extrabold text-blue-600 dark:text-blue-300 truncate max-w-[200px] sm:max-w-xs md:max-w-md xl:max-w-lg">
                  "{selectedMission?.prompt}"
                </span>
              </div>
              
              <div className="flex items-center flex-wrap gap-3 mt-2 md:mt-0 select-none">
                
                {/* VIEW TABS — five interactive lenses over the same fabric */}
                <div className={`flex items-center rounded-lg p-0.5 border ${
                  isDark ? "bg-[#0b0e14]/80 border-white/5" : "bg-slate-100 border-slate-200"
                }`}>
                  {([
                    { key: "canvas", label: "Canvas", Icon: Network },
                    { key: "fabric2d", label: "2D Fabric", Icon: Boxes },
                    { key: "replay", label: "Replay", Icon: History },
                    { key: "triage", label: "Triage", Icon: Columns3 },
                    { key: "radar", label: "Radar", Icon: Radar },
                    { key: "vista", label: "Vista", Icon: Clock }
                  ] as const).map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      onClick={() => setWorkspaceMode(key)}
                      className={`px-2.5 py-1 text-[10px] sm:text-xs font-mono rounded-md transition-colors flex items-center gap-1.5 ${
                        workspaceMode === key
                          ? isDark ? "bg-white/10 text-white shadow" : "bg-white text-blue-700 shadow border-slate-200/50"
                          : isDark ? "text-slate-400 hover:text-gray-300" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>

                {/* runs badge */}
                {(selectedMission?.runs?.length || 0) > 0 && (
                  <span
                    title={selectedMission?.runs?.[selectedMission.runs.length - 1]?.summary || "Run history"}
                    className={`hidden sm:flex items-center gap-1 rounded px-2 py-0.5 border text-[10px] font-mono ${
                      isDark ? "bg-white/5 text-gray-400 border-white/10" : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    <History className="w-3 h-3" />
                    {selectedMission!.runs!.length} run{selectedMission!.runs!.length > 1 ? "s" : ""}
                  </span>
                )}

                {/* Re-sense */}
                <button
                  onClick={() => handleResense("resense")}
                  disabled={resensing || selectedMission?.status !== "ready"}
                  title={`Re-sense for fresh signals (${deployCost} credits)`}
                  className={`text-[10px] sm:text-xs font-mono px-2.5 py-1.5 border rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 select-none cursor-pointer ${
                    isDark ? "text-blue-300 hover:text-white bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40" : "text-blue-600 hover:text-blue-700 bg-blue-50 border-blue-200 hover:border-blue-300"
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
                  className={`text-[10px] sm:text-xs font-mono px-2.5 py-1.5 border rounded-lg transition-all flex items-center gap-1.5 select-none cursor-pointer ${
                    selectedMission?.monitoring
                      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/40"
                      : isDark ? "text-gray-300 hover:text-white bg-white/5 border-white/5 hover:border-white/10" : "text-slate-600 hover:text-emerald-600 bg-slate-200/55 border-slate-300/40"
                  }`}
                >
                  <Radio className={`w-3 h-3 ${selectedMission?.monitoring ? "animate-pulse" : ""}`} />
                  <span className="hidden md:inline">{selectedMission?.monitoring ? "Monitoring" : "Monitor"}</span>
                </button>

                {/* Ask the Fabric */}
                <button
                  onClick={() => { setSelectedNodeId(null); setFocusedAgent(null); setChatOpen(v => !v); }}
                  title="Chat with this mission's fabric"
                  className={`text-[10px] sm:text-xs font-mono px-2.5 py-1.5 border rounded-lg transition-all flex items-center gap-1.5 select-none cursor-pointer ${
                    chatOpen
                      ? "text-blue-500 bg-blue-500/10 border-blue-500/40"
                      : isDark ? "text-gray-300 hover:text-white bg-white/5 border-white/5 hover:border-white/10" : "text-slate-600 hover:text-blue-600 bg-slate-200/55 border-slate-300/40"
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span className="hidden md:inline">Ask Fabric</span>
                </button>

                {/* Custom agents */}
                <button
                  onClick={() => { setSelectedNodeId(null); setFocusedAgent(null); setChatOpen(false); setCustomOpen(v => !v); }}
                  title="Build & run your own agents on this mission"
                  className={`text-[10px] sm:text-xs font-mono px-2.5 py-1.5 border rounded-lg transition-all flex items-center gap-1.5 select-none cursor-pointer ${
                    customOpen
                      ? "text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/40"
                      : isDark ? "text-gray-300 hover:text-white bg-white/5 border-white/5 hover:border-white/10" : "text-slate-600 hover:text-fuchsia-600 bg-slate-200/55 border-slate-300/40"
                  }`}
                >
                  <Wand2 className="w-3 h-3" />
                  <span className="hidden md:inline">My Agents</span>
                </button>

                <button
                  onClick={handleTriggerReweave}
                  disabled={reweaving || selectedMission?.status !== "ready"}
                  className={`text-[10px] sm:text-xs font-mono px-2.5 py-1.5 border rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 select-none cursor-pointer ${
                    isDark ? "text-gray-300 hover:text-white bg-white/5 border-white/5 hover:border-white/10" : "text-slate-600 hover:text-blue-600 bg-slate-200/55 border-slate-300/40 hover:border-slate-300"
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${reweaving ? "animate-spin" : ""}`} />
                  <span className="hidden lg:inline">Re-Weave</span>
                </button>
              </div>
            </section>
            )}

            {/* --- WORKSPACE GUIDE (dismissible "what am I looking at?") --- */}
            {showGuide && !isMaximized && (
              <div className={`flex items-center gap-3 px-4 py-2 border-b text-[11px] z-10 ${isDark ? "bg-blue-500/[0.06] border-blue-500/15 text-gray-300" : "bg-blue-50/70 border-blue-100 text-slate-600"}`}>
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <div className="flex-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span><span className="font-bold text-blue-500">①</span> Each card is a verified finding (●&nbsp;LIVE = real source).</span>
                  <span><span className="font-bold text-blue-500">②</span> <span className="font-semibold">Re-sense</span> for fresh data · <span className="font-semibold">Ask Fabric</span> to query it · <span className="font-semibold">Monitor</span> to auto-track.</span>
                  <span><span className="font-bold text-blue-500">③</span> Read the brief &amp; approve next steps in <span className="font-semibold">Proposed Actions</span> below.</span>
                </div>
                <button onClick={dismissGuide} className={`flex-shrink-0 p-1 rounded ${isDark ? "hover:bg-white/10 text-gray-400" : "hover:bg-blue-100 text-slate-400"}`} title="Got it">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* --- PIPELINE ANIMATION STEP LOADER --- */}
            {selectedMission && ["queued", "sensing", "reasoning", "synthesizing"].includes(selectedMission.status) && (
              <div className="bg-blue-500/5 border-b border-blue-500/20 py-2.5 px-6 flex items-center justify-between z-10 animate-pulse text-xs text-blue-700 dark:text-blue-200 select-none">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <div className="font-mono">
                    <span className="text-blue-600 dark:text-blue-400 font-bold uppercase mr-1.5">
                      [Swarm Mining Web Signals]
                    </span>
                    Conductor cell active:
                    <span className="text-emerald-600 dark:text-teal-300 ml-1">
                      {selectedMission.status === "sensing"
                        ? "Pathfinder scanning crawled indexed URLs..."
                        : selectedMission.status === "reasoning"
                        ? "Veritas executing credibility metrics check..."
                        : "Scribe writing traceable brief telemetry..."}
                    </span>
                  </div>
                </div>
                
                <div className={`text-[10px] font-mono px-2 py-0.5 border rounded ${
                  isDark ? "bg-blue-900/30 text-blue-350 border-blue-500/20" : "bg-blue-100 text-blue-750 border-blue-550/10"
                }`}>
                  PIPELINE: {selectedMission.status.toUpperCase()}
                </div>
              </div>
            )}

            {/* --- COGNITIVE WEAVE INFINITY CANVAS VIEWPORT --- */}
            {workspaceMode === "canvas" && (
            <div 
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              className="flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing p-4"
              style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
            >
              
              {/* CANVAS MANUAL HUD */}
              <div className={`group absolute top-4 left-4 z-30 flex flex-col rounded-xl border backdrop-blur font-mono text-[9.5px] shadow-xl w-10 h-10 hover:w-[320px] hover:h-auto overflow-hidden transition-all duration-300 no-pan ${
                isDark ? "bg-[#0b0e14]/90 border-white/5 text-gray-400 hover:bg-[#0b0e14]" : "bg-white/95 border-slate-200 text-slate-500 hover:bg-white"
              }`}>
                <div className="absolute inset-0 flex items-center justify-center cursor-help group-hover:opacity-0 transition-opacity duration-300 pointer-events-none">
                  <Info className="w-5 h-5 text-blue-500" />
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-1.5 p-3.5 w-full">
                  <span className={`font-extrabold mb-1.5 border-b pb-1 flex items-center gap-1.5 select-none text-[10px] ${
                    isDark ? "text-gray-200 border-white/5" : "text-slate-850 border-slate-200/80"
                  }`}>
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    CANVAS INTERACTION PROTOCOL
                  </span>
                  <div className="flex items-center gap-1.5 bg-emerald-500/5 px-2 py-0.5 rounded text-emerald-600 dark:text-emerald-400">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span>High Credibility Index (≥ 80% CF)</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-amber-500/5 px-2 py-0.5 rounded text-amber-600 dark:text-amber-400">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    <span>Incongruity / Verification Drift (50-79%)</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-red-500/5 px-2 py-0.5 rounded text-red-600 dark:text-red-400">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    <span>Low Credibility / Drift Exception (≤ 49%)</span>
                  </div>
                  <div className="mt-1.5 border-t border-slate-200 dark:border-white/5 pt-1.5 text-blue-600 dark:text-blue-300 font-semibold leading-normal">
                    💡 Drag backgrounds to Pan. Click to select. Drag individual node cards to organize! Use scroll/HUD to Zoom!
                  </div>
                </div>
              </div>

              {/* EMPTY WORKSPACE STATE */}
              {nodes.length === 0 && (
                <div className="text-center p-6 z-10 select-none">
                  <div className="w-14 h-14 rounded-full bg-slate-200/50 dark:bg-[#111622] border border-slate-200 dark:border-white/5 flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <Network className="w-7 h-7 text-blue-500" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display mb-1">
                    Swarm Network Idle
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-gray-450 max-w-sm mx-auto leading-relaxed">
                    Sensing grids have not deployed signals for this mission yet. Initiating swarm threads takes ~3 to 8 seconds. Please deploy above or track event streams.
                  </p>
                </div>
              )}

              {/* TRANSLATED AND ZOOMABLE BOARD WRAPPER */}
              {nodes.length > 0 && (
                <div 
                  className="absolute inset-0 select-none"
                  style={{
                    transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
                    transformOrigin: "center center",
                    transition: isPanning || draggingNodeId ? "none" : "transform 0.15s ease-out"
                  }}
                >
                  
                  {/* CENTRAL VIRTUAL BOARD AREAL */}
                  <div className="w-[1050px] h-[750px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    
                    {/* SVG EDGE RENDERING LAYER */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                      <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 1 L 10 5 L 0 9 z" fill={t.svgLines} />
                        </marker>
                        <marker id="arrow-contradict" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 1 L 10 5 L 0 9 z" fill="#cb2e2e" />
                        </marker>
                        <marker id="arrow-correct" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 1 L 10 5 L 0 9 z" fill="#167e45" />
                        </marker>
                      </defs>

                      {/* Connects all edges with responsive Bezier Curves */}
                      {edges.map(edge => {
                        const srcNode = nodes.find(n => n.id === edge.source);
                        const tgtNode = nodes.find(n => n.id === edge.target);
                        if (!srcNode || !tgtNode) return null;

                        const srcIndex = nodes.findIndex(n => n.id === edge.source);
                        const tgtIndex = nodes.findIndex(n => n.id === edge.target);
                        
                        // Grab actual positions incorporating real-time offsets
                        const p1 = getActualNodePosition(srcNode, srcIndex);
                        const p2 = getActualNodePosition(tgtNode, tgtIndex);

                        // Curvatures math around centers
                        const offsetCurve = 45; 
                        const midX = (p1.x + p2.x) / 2;
                        const midY = (p1.y + p2.y) / 2 - (p1.x === p2.x ? 0 : offsetCurve);

                        const isConContradict = edge.relation === "contradicts";
                        const isConCorrect = edge.relation === "correction-applied";
                        
                        const isEdgeActive =
                          !isThreadPullingActive() ||
                          (selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId)) ||
                          (hoveredNodeId && (edge.source === hoveredNodeId || edge.target === hoveredNodeId)) ||
                          (hoveredSentenceId && brief?.sentences.find(s => s.id === hoveredSentenceId)?.provenance.includes(edge.source) && brief?.sentences.find(s => s.id === hoveredSentenceId)?.provenance.includes(edge.target));

                        const edgeColor = isConContradict
                          ? "stroke-red-500/35"
                          : isConCorrect
                          ? "stroke-emerald-500/35"
                          : isDark ? "stroke-slate-800" : "stroke-slate-200/90";

                        const activeEdgeColor = isConContradict
                          ? "stroke-red-500"
                          : isConCorrect
                          ? "stroke-emerald-500"
                          : "stroke-blue-500";

                        return (
                          <g key={edge.id} className="transition-all duration-300">
                            <path
                              d={`M ${p1.x} ${p1.y + 35} Q ${midX} ${midY} ${p2.x} ${p2.y}`}
                              fill="none"
                              className={`${isEdgeActive ? activeEdgeColor : edgeColor} transition-all`}
                              strokeWidth={isEdgeActive ? 2.5 : 1.2}
                              strokeDasharray={isConContradict ? "3 3" : undefined}
                              markerEnd={`url(#${isConContradict ? "arrow-contradict" : isConCorrect ? "arrow-correct" : "arrow"})`}
                            />
                            {/* Interactive displaying path connections labels */}
                            {isEdgeActive && (
                              <text
                                x={midX}
                                y={midY - 4}
                                fill={isConContradict ? "#ef4444" : isConCorrect ? "#10b981" : "#3b82f6"}
                                className="text-[8px] font-mono uppercase font-bold text-anchor-middle select-none text-center bg-white dark:bg-black p-0.5"
                                textAnchor="middle"
                              >
                                {edge.label}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {/* DYNAMIC ABSOLUTE CARDS LAYER */}
                    {nodes.map((node, index) => {
                      const pos = getActualNodePosition(node, index);
                      const confRating = node.confidence;
                      const isSynth = node.type === "synthesis";
                      const isCorr = node.type === "correction";
                      
                      const isFocused = isNodeFocused(node.id);
                      const isHighlighted = isNodeHighlightedInThread(node.id);
                      const isSelected = selectedNodeId === node.id;

                      return (
                        <div
                          key={node.id}
                          ref={el => { if (el) nodeRefMap.current.set(node.id, el); }}
                          style={{
                            position: "absolute",
                            left: `${pos.x}px`,
                            top: `${pos.y}px`,
                            transform: "translate(-50%, -15px)",
                            width: "185px",
                            transition: draggingNodeId === node.id ? "none" : "all 0.15s ease-out"
                          }}
                          onMouseEnter={() => setHoveredNodeId(node.id)}
                          onMouseLeave={() => setHoveredNodeId(null)}
                          onMouseDown={(e) => {
                            setSelectedNodeId(node.id);
                            if (node.type === "web-signal" || node.type === "synthesis") {
                              setCorrectionContent(node.content);
                            } else {
                              setCorrectionContent("");
                            }
                            handleNodeDragStart(e, node.id);
                          }}
                          className={`rounded-lg border p-3 select-none flex flex-col gap-1.5 shadow-md no-pan cursor-grab active:cursor-grabbing hover:shadow-lg transition-all z-10 ${
                            isHighlighted
                              ? "ring-2 ring-blue-500 ring-offset-2 scale-[1.04] dark:ring-offset-black"
                              : isSelected
                              ? "ring-1 ring-blue-500 scale-[1.03] " + getConfColor(confRating, true)
                              : getConfColor(confRating, true)
                          } ${isFocused ? "opacity-100 filter-none" : "opacity-35 scale-[0.96] blur-[0.4px]"} ${
                            isDark ? "bg-[#0b0f19]/95 text-slate-200" : "bg-white text-slate-800"
                          } hover:border-slate-400`}
                        >
                          {/* CARD HEADER */}
                          <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 pb-1 text-[8px] leading-none">
                            <div className="flex items-center gap-1 overflow-hidden">
                              {isSynth ? (
                                <Cpu className="w-3 h-3 text-blue-500" />
                              ) : isCorr ? (
                                <Undo className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <FileText className="w-3 h-3 text-purple-500" />
                              )}
                              <span className="font-mono uppercase tracking-wider text-slate-400 select-none">
                                {node.type}
                              </span>
                              {node.pinned && <Pin className="w-2.5 h-2.5 text-blue-500 fill-blue-500" />}
                            </div>

                            <div className="flex items-center gap-1">
                              {node.grounded === true && (
                                <span className="font-mono font-bold px-1 rounded leading-none text-[7px] bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-0.5" title="Extracted from a real fetched web page">
                                  ● LIVE
                                </span>
                              )}
                              {node.grounded === false && (
                                <span className="font-mono font-bold px-1 rounded leading-none text-[7px] bg-amber-500/10 text-amber-500 border border-amber-500/20" title="LLM-inferred (no live source fetched)">
                                  ~AI
                                </span>
                              )}
                              {newestRunId && node.run_id === newestRunId && (
                                <span className="font-mono font-bold px-1 rounded leading-none text-[7px] bg-emerald-500 text-white animate-pulse">NEW</span>
                              )}
                              <span className={`font-mono font-bold px-1 rounded leading-none text-[8px] ${getConfColor(confRating)}`}>
                                {Math.round(confRating * 100)}%
                              </span>
                            </div>
                          </div>

                          {/* BODY: dynamic component (metrics / comparison / list / quote / text) */}
                          <div>
                            <h4 className="text-[10px] sm:text-[10.5px] font-bold tracking-tight leading-tight mb-1 truncate text-slate-900 dark:text-white">
                              {node.title}
                            </h4>
                            <DynamicNodeBody node={node} isDark={isDark} compact />
                          </div>

                          {/* CONTRADICT ADVISORY WARNINGS */}
                          {node.flagged_by === "sentinel" && (
                            <div className="flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-[7px] font-mono px-1 py-0.5 border border-red-500/20 rounded mt-0.5 animate-pulse select-none leading-none">
                              <ShieldAlert className="w-2.5 h-2.5 flex-shrink-0" />
                              <span>Drift Detected</span>
                            </div>
                          )}

                          {/* CARD FOOTER */}
                          <div className="flex items-center justify-between text-[7px] text-slate-400 dark:text-gray-500 font-mono mt-1 pt-1 border-t border-slate-200/50 dark:border-white/5 select-none">
                            <span className="truncate max-w-[100px]">{node.source}</span>
                            <span>v{node.version}</span>
                          </div>
                        </div>
                      );
                    })}

                  </div>
                </div>
              )}

              {/* FLOATING ZOOM & HUD NAVIGATION AREA (BOTTOM RIGHT) */}
              <div className={`absolute bottom-4 right-4 z-20 flex items-center gap-1.5 p-2 rounded-xl border shadow-2xl select-none no-pan ${
                isDark ? "bg-[#0b0e14]/95 border-white/5" : "bg-white/95 border-slate-200"
              }`}>
                <button
                  type="button"
                  onClick={() => setCanvasZoom(z => Math.max(z - 0.15, 0.45))}
                  className={`p-1 px-2.5 text-xs font-bold rounded-md transition-all border cursor-pointer ${
                    isDark ? "text-gray-400 hover:bg-white/10 border-white/5" : "text-slate-600 hover:bg-slate-100 border-slate-200"
                  }`}
                  title="Zoom Out"
                >
                  -
                </button>
                <span className={`text-[10px] font-mono font-bold min-w-[40px] text-center ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                  {Math.round(canvasZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setCanvasZoom(z => Math.min(z + 0.15, 2.25))}
                  className={`p-1 px-2.5 text-xs font-bold rounded-md transition-all border cursor-pointer ${
                    isDark ? "text-gray-400 hover:bg-white/10 border-white/5" : "text-slate-600 hover:bg-slate-100 border-slate-200"
                  }`}
                  title="Zoom In"
                >
                  +
                </button>
                <div className={`w-[1px] h-4 mx-1 ${isDark ? "bg-white/10" : "bg-slate-200"}`}></div>
                <button
                  type="button"
                  onClick={() => {
                    setCanvasPan({ x: 0, y: 0 });
                    setCanvasZoom(1.0);
                    setNodeOffsets({});
                  }}
                  className="p-1.5 px-3 text-[9.5px] font-mono text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-md transition-all font-bold border border-blue-500/20 cursor-pointer"
                  title="Recenter Board Coordinates"
                >
                  Reset Layout
                </button>
                <div className={`w-[1px] h-4 mx-1 ${isDark ? "bg-white/10" : "bg-slate-200"}`}></div>
                <button
                  type="button"
                  onClick={toggleMaximize}
                  className="p-1.5 px-3 text-[9.5px] font-mono text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-md transition-all font-bold border border-slate-200 dark:border-white/5 cursor-pointer flex items-center gap-1"
                  title={isMaximized ? "Restore Layout" : "Maximize Canvas"}
                >
                  {isMaximized ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isMaximized ? "Restore" : "Maximize"}</span>
                </button>
              </div>

            </div>
            )}

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

            {/* --- SIGNAL RADAR VIEWPORT --- */}
            {workspaceMode === "radar" && (
              <SignalRadar
                nodes={nodes}
                isDark={isDark}
                selectedNodeId={selectedNodeId}
                onSelect={(id) => { setSelectedNodeId(id); const n = nodes.find(x => x.id === id); if (n && (n.type === "web-signal" || n.type === "synthesis")) setCorrectionContent(n.content); }}
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

            {/* --- BOTTOM DASHBOARD PANE / EVENT TRACE STREAM --- */}
            {!isMaximized && (
            <footer className={`h-60 border-t flex flex-col z-20 relative select-none ${t.bgPane}`}>
              {/* DECISION COCKPIT — at-a-glance health of this mission */}
              {(() => {
                const sig = nodes.filter(n => n.type === "web-signal");
                const grounded = sig.filter(n => n.grounded === true).length;
                const contra = nodes.filter(n => n.flagged_by === "sentinel").length;
                const futs = nodes.filter(n => n.time_horizon === "future").length;
                const avg = sig.length ? Math.round((sig.reduce((s, n) => s + n.confidence, 0) / sig.length) * 100) : 0;
                const avgColor = avg >= 80 ? "bg-emerald-500" : avg >= 50 ? "bg-amber-500" : "bg-red-500";
                const Stat = ({ label, value, color }: { label: string; value: any; color?: string }) => (
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-extrabold ${color || (isDark ? "text-white" : "text-slate-900")}`}>{value}</span>
                    <span className="text-[9px] font-mono uppercase tracking-wide text-slate-400">{label}</span>
                  </div>
                );
                return (
                  <div className="flex items-center gap-4 px-6 py-2 border-b border-slate-200/50 dark:border-white/5 flex-shrink-0 overflow-x-auto">
                    <div className="flex items-center gap-2 min-w-[150px]">
                      <span className="text-[9px] font-mono uppercase tracking-wide text-slate-400">Confidence</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10 min-w-[60px]">
                        <div className={`h-full ${avgColor} transition-all`} style={{ width: `${avg}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${avg >= 80 ? "text-emerald-500" : avg >= 50 ? "text-amber-500" : "text-red-500"}`}>{avg}%</span>
                    </div>
                    <div className="w-px h-5 bg-slate-200 dark:bg-white/10" />
                    <Stat label="findings" value={sig.length} />
                    <Stat label="live" value={grounded} color="text-emerald-500" />
                    <Stat label="conflicts" value={contra} color={contra ? "text-red-500" : undefined} />
                    <Stat label="futures" value={futs} color="text-fuchsia-500" />
                    {futs === 0 && (
                      <button onClick={() => setWorkspaceMode("vista")} className="ml-auto flex-shrink-0 text-[10px] font-mono font-bold text-fuchsia-500 hover:underline flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Forecast futures →
                      </button>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center justify-between border-b px-6 py-2 border-slate-200/50 dark:border-white/5 flex-shrink-0 select-none">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab("analysis")}
                    className={`text-xs font-extrabold py-1.5 border-b-2 transition-all flex items-center gap-1.5 ${
                      activeTab === "analysis"
                        ? "border-blue-500 text-slate-900 dark:text-white"
                        : "border-transparent text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                    Intelligence Brief
                  </button>
                  
                  <button
                    onClick={() => setActiveTab("actions")}
                    className={`text-xs font-extrabold py-1.5 border-b-2 transition-all flex items-center gap-1.5 relative ${
                      activeTab === "actions"
                        ? "border-blue-500 text-slate-900 dark:text-white"
                        : "border-transparent text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-500" />
                    Action Plan
                    {actions.filter(a => a.status === "proposed").length > 0 && (
                      <span className="absolute -top-0.5 -right-2 w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-gray-500 font-mono">
                  <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  <span>Interactive Provenance Tracing Ready</span>
                </div>
              </div>

              {/* GRID SECTIONS */}
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
                                ? "bg-blue-500/5 border-blue-500/40 text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-600 dark:text-gray-300 border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.01]"
                            }`}
                          >
                            <div className="absolute left-2.5 top-3 w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            {s.text}
                            
                            {/* Trace links */}
                            <span className="inline-flex gap-1 ml-2.5 select-none no-pan">
                              {s.provenance.map(provId => {
                                const relatedNode = nodes.find(n => n.id === provId);
                                const ratingColor = relatedNode ? getConfColor(relatedNode.confidence) : "";
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
                      <div className="flex flex-col gap-2 mt-4 bg-blue-500/5 border border-blue-500/15 p-4 rounded-xl">
                        <span className="text-[10.5px] font-mono tracking-wider text-blue-600 dark:text-blue-400 uppercase font-bold flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4" />
                          RECOMMENDED NEXT STEPS
                        </span>
                        <ul className="list-none flex flex-col gap-1.5 font-sans">
                          {brief.recommendations.map((rec, i) => (
                            <li key={i} className="text-xs text-slate-700 dark:text-gray-350 flex items-start gap-2 pl-1 leading-relaxed">
                              <span className="text-blue-500 select-none font-bold">↳</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {activeTab === "analysis" && !brief && (
                    <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-8">
                      Wait compilation index. Swarm conducts are scanning.
                    </p>
                  )}

                  {activeTab === "actions" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {actions.length === 0 && (
                        <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-8 col-span-2">
                          No proposed Action-Drafts. Swarm Conductor standing by.
                        </p>
                      )}
                      {actions.map(act => (
                        <div
                          key={act.id}
                          className={`border rounded-lg p-3 transition-all flex flex-col gap-2 relative ${
                            isDark
                              ? "bg-[#0c101a] border-white/5 hover:border-white/10"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          } ${
                            act.status === "approved"
                              ? (isDark ? "border-emerald-500/30 bg-emerald-950/15 shadow-sm shadow-emerald-500/5" : "border-emerald-500/30 bg-emerald-50/15 shadow-sm shadow-emerald-500/5")
                              : act.status === "dismissed"
                              ? "opacity-35"
                              : ""
                          }`}
                        >
                          <div className="flex justify-between items-start select-none">
                            <span className={`text-[8.5px] font-mono px-1.5 py-0.5 border rounded uppercase ${
                              act.kind === "draft-email" ? "text-purple-600 border-purple-500/20 bg-purple-500/5" : "text-blue-600 border-blue-500/20 bg-blue-500/5"
                            }`}>
                              {act.kind}
                            </span>
                            
                            {act.status === "approved" && (
                              <span className="text-[8.5px] font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.5 border border-emerald-900/30 rounded flex items-center gap-1 select-none font-bold">
                                <Check className="w-2.5 h-2.5" /> Approved
                              </span>
                            )}
                          </div>

                          <h4 className="text-[11px] sm:text-[11.5px] font-bold text-slate-900 dark:text-white leading-snug">
                            {act.title}
                          </h4>
                          
                          <p className={`text-[9.5px] italic ${t.textMute}`}>
                            "{act.rationale}"
                          </p>

                          <div className={`border p-2 rounded text-[10px] font-mono leading-normal h-24 overflow-y-auto whitespace-pre-wrap ${
                            isDark ? "bg-black/40 border-white/5 text-gray-300" : "bg-slate-50 border-slate-200/60 text-slate-700"
                          }`}>
                            {act.payload.body}
                          </div>

                          {act.status === "proposed" && (
                            <div className="flex gap-2 mt-1 select-none no-pan">
                              <button
                                onClick={() => handleApproveAction(act.id)}
                                className="flex-1 bg-blue-600 text-white hover:bg-blue-500 text-[10px] font-bold py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1 shadow-sm"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve Proposed Action
                              </button>
                              <button
                                onClick={() => handleDismissAction(act.id)}
                                className="bg-slate-100 border border-slate-200 text-slate-500 hover:text-red-500 hover:bg-red-50/50 p-1 px-2 rounded-md text-[10px] dark:bg-white/5 dark:border-white/5 dark:text-gray-400 dark:hover:border-red-900/20 transition-all flex items-center"
                                title="Dismiss Proposal"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {act.status === "approved" && (
                            <div className="flex flex-wrap gap-2 no-pan">
                              {/* Executable handoff: open a prefilled draft (never auto-sends) */}
                              {act.payload.to && (
                                <a
                                  href={`mailto:${act.payload.to}?subject=${encodeURIComponent(act.payload.subject || act.title)}&body=${encodeURIComponent(act.payload.body || "")}`}
                                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1 shadow-sm"
                                >
                                  <Mail className="w-3.5 h-3.5" /> Open in Mail
                                </a>
                              )}
                              {act.payload.deadline && (
                                <a
                                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(act.title)}&details=${encodeURIComponent(act.payload.body || "")}&dates=${String(act.payload.deadline).replace(/-/g, "")}/${String(act.payload.deadline).replace(/-/g, "")}`}
                                  target="_blank" rel="noreferrer"
                                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1 shadow-sm"
                                >
                                  <Clock className="w-3.5 h-3.5" /> Add to Calendar
                                </a>
                              )}
                              <button
                                onClick={() => { try { navigator.clipboard.writeText(act.payload.body); } catch (e) { console.error(e); } }}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1 shadow-sm"
                              >
                                <FileText className="w-3.5 h-3.5" /> Copy
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* TIMELINE ACTIVITIES OPERATIONS PANEL AREA (span 4) */}
                <div className="col-span-4 overflow-y-auto p-4 flex flex-col gap-3 font-mono border-l border-slate-200/50 dark:border-white/5">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/50 dark:border-white/5">
                    <Activity className="w-3.5 h-3.5 text-blue-500" />
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
                          info: "text-blue-600 bg-blue-500/5 border-blue-500/10 dark:text-blue-400 dark:bg-blue-950/20 dark:border-blue-900/20",
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
            </footer>
            )}

          </main>

          {/* --- RIGHT SIDE: INSPECTOR AND MEMORY CORRECTOR PANE --- */}
          {selectedNodeId && (
            <aside className={`absolute top-0 right-0 h-full w-full sm:w-[350px] md:w-[400px] border-l shadow-2xl flex flex-col overflow-y-auto select-none z-50 ${
              isDark ? "bg-[#0d1017]" : "bg-white"
            }`}>
              
              <div className={`p-4 border-b flex justify-between items-center select-none ${
                isDark ? "bg-black/25" : "bg-slate-50"
              }`}>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 font-display">
                  <Bot className="w-4 h-4 text-blue-500" />
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
                          className={`p-1.5 rounded-lg transition-colors ${sn.pinned ? "text-blue-500 bg-blue-500/10" : "text-slate-400 hover:text-blue-500 hover:bg-blue-500/10"}`}
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
                
                const confRating = selectedNode.confidence;

                return (
                  <div className="p-4 flex flex-col gap-4 flex-1">
                    
                    {/* ENHANCED PROVENANCE DETAIL CARD */}
                    <div className={`p-4 rounded-xl border flex flex-col gap-3 ${getConfColor(confRating, true)} ${
                      isDark ? "bg-[#07090e] shadow-lg" : "bg-[#f8fafc]/50 shadow-sm"
                    }`}>
                      
                      <div className="flex justify-between items-center leading-none select-none text-[8px] font-mono">
                        <span className={`px-1.5 py-0.5 border rounded uppercase ${getConfColor(confRating)}`}>
                          {selectedNode.type}
                        </span>
                        <span className="text-slate-400 mr-1.5">
                          v{selectedNode.version}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                          {selectedNode.title}
                        </h4>
                        <div className="mt-2.5">
                          <DynamicNodeBody node={selectedNode} isDark={isDark} />
                        </div>
                      </div>

                      {/* CONFIDENCE BAR METER */}
                      <div className="flex flex-col gap-1 border-t border-slate-200/50 dark:border-white/5 pt-3">
                        <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 dark:text-gray-400">
                          <span>Prior Intrinsic confidence:</span>
                          <span>{Math.round(selectedNode.own_score * 100)}%</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-mono">
                          <span className="text-slate-500 dark:text-gray-400">Calculated Network Confidence:</span>
                          <span className="font-extrabold text-slate-800 dark:text-white">
                            {Math.round(confRating * 100)}% CF
                          </span>
                        </div>
                        
                        <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden mt-1 select-none">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              confRating >= 0.8 ? "bg-emerald-500" : confRating >= 0.35 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${confRating * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* SENTINEL CLAIM DRIFT EXCEPTION */}
                      {selectedNode.flagged_by === "sentinel" && (
                        <div className="bg-red-50 text-red-700 border border-red-200/80 dark:bg-red-950/40 dark:border-red-900/30 rounded-lg p-3 flex flex-col gap-1 text-[10px] leading-snug">
                          <span className="font-bold font-mono tracking-wider flex items-center gap-1.5 uppercase leading-none">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-500 flex-shrink-0 animate-pulse" />
                            Claim Incongruency Detected
                          </span>
                          <span>
                            Sentinel flagged contradictions between source data claims. Min-variance thresholds are suppressed on this node until resolved via human veto correction override parameters.
                          </span>
                        </div>
                      )}

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
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold"
                          >
                            OPEN CITED SIGNAL
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* INTERACTIVE MEMORY CORRECTOR VETO FORM */}
                    {(selectedNode.type === "web-signal" || selectedNode.type === "synthesis") && (
                      <div className={`flex flex-col gap-3 p-4 rounded-xl no-pan border ${
                        isDark ? "bg-[#090c12]/90 border-white/5" : "bg-slate-50 border-slate-200"
                      }`}>
                        <span className={`text-[10px] font-mono tracking-wider uppercase font-bold flex items-center gap-1.5 select-none leading-none ${
                          isDark ? "text-teal-400" : "text-teal-650"
                        }`}>
                          <Undo className="w-3.5 h-3.5" />
                          VERIFY COGNITIVE SWARM CLAIM
                        </span>
                        
                        <p className={`text-[10px] leading-relaxed font-sans select-none ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                          Submit an authoritative human verification veto claim. This injects a high credibility Correction node (100% CF) to bypass drift anomalies in the swarm.
                        </p>

                        <div className="flex flex-col gap-1">
                          <label className={`text-[9.5px] font-mono select-none ${isDark ? "text-gray-500" : "text-slate-400"}`}>Corrected claim statement:</label>
                          <textarea
                            placeholder="Provide correct verified data values..."
                            value={correctionContent}
                            onChange={e => setCorrectionContent(e.target.value)}
                            className={`w-full h-20 border p-2 rounded text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 font-sans ${
                              isDark ? "bg-black/40 border-white/5 text-white" : "bg-white border-slate-200 text-slate-800"
                            }`}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className={`text-[9.5px] font-mono select-none ${isDark ? "text-gray-500" : "text-slate-400"}`}>Operator veto reason:</label>
                          <input
                            type="text"
                            placeholder="e.g., Confirmed waiver applies June 2026"
                            value={correctionReason}
                            onChange={e => setCorrectionReason(e.target.value)}
                            className={`w-full border p-2 rounded text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 font-sans ${
                              isDark ? "bg-black/40 border-white/5 text-white" : "bg-white border-slate-200 text-slate-800"
                            }`}
                          />
                        </div>

                        <button
                          onClick={() => handleSubmitCorrection(selectedNode.id)}
                          disabled={isCorrecting || !correctionContent.trim()}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 select-none cursor-pointer"
                        >
                          {isCorrecting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5 animate-pulse" />
                          )}
                          Submit Memory Correction Veto
                        </button>
                      </div>
                    )}

                    {/* CITATION AND PROVENANCE LISTS */}
                    {selectedNode.provenance && selectedNode.provenance.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        <span className="text-[10px] font-mono tracking-wider text-slate-400 dark:text-gray-450 uppercase font-bold select-none leading-none">
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
                                className={`border p-2.5 rounded-lg text-left cursor-pointer transition-all flex items-start gap-2.5 ${getConfColor(provNode.confidence, true)} ${
                                  isDark ? "bg-black/30 hover:bg-black/50" : "bg-white hover:bg-slate-50 shadow-xs"
                                }`}
                              >
                                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                  <span className="text-[10.5px] font-bold text-slate-800 dark:text-white truncate">
                                    {provNode.title}
                                  </span>
                                  <span className="text-[8.5px] font-mono text-slate-400">
                                    Type: {provNode.type} · Confidence {Math.round(provNode.confidence * 100)}%
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

            </aside>
          )}

          {focusedAgent && (
            <aside className={`absolute top-0 right-0 h-full w-full sm:w-[350px] md:w-[400px] border-l shadow-2xl flex flex-col overflow-y-auto select-none z-50 ${
              isDark ? "bg-[#0d1017] border-white/5" : "bg-white border-slate-200"
            }`}>
              {/* Header */}
              <div className={`p-4 border-b flex justify-between items-center select-none ${
                isDark ? "bg-black/25 border-white/5" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    runningAgentId === focusedAgent.id 
                      ? "bg-blue-400 animate-ping" 
                      : getAgentWorkingLabel(focusedAgent.id) === "working"
                      ? "bg-blue-400 animate-ping"
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
                  isDark ? "bg-[#07090e] border-white/5 shadow-lg" : "bg-[#f8fafc]/50 border-slate-200 shadow-sm"
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
                    {focusedAgent.id === "conductor" && "Deconstructs enterprise intelligence requests into target domains, aligns multi-agent queues, controls lifecycle states."}
                    {focusedAgent.id === "pathfinder" && "Crawls public portals and reasons over real-time web indexes to harvest factual product signal footprints."}
                    {focusedAgent.id === "veritas" && "Factcheck-audits newly harvested signals for citation provenance, credential credibility, and assigns intrinsic confidence scores."}
                    {focusedAgent.id === "cartographer" && "Draws multidimensional force-directed graph linkages, constructs semantic edges, maps physical coordinates."}
                    {focusedAgent.id === "sentinel" && "Monitors statement consistency for logical rules contradictions, policies friction, flags drift anomalies instantly."}
                    {focusedAgent.id === "oracle" && "Correlates multi-agent synthesized nodes to generate strategic executive executive summary briefs with high fidelity description fields."}
                    {focusedAgent.id === "scribe" && "Constructs sentence-level attribution tracing markers, linking final report assertions to authentic provenance source URLs."}
                    {focusedAgent.id === "actor" && "Transforms strategic research insights into executable transaction draft designs, email correspondences, and target timeline reminder bounds."}
                  </p>
                </div>

                {/* MANUAL EXECUTION ACTUATOR */}
                <div className="pt-2">
                  <button
                    disabled={runningAgentId !== null || !!isSubmitting || selectedMission?.status !== "ready"}
                    onClick={async () => {
                      if (!selectedMission) return;
                      setRunningAgentId(focusedAgent.id);
                      try {
                        const res = await fetch(`/api/missions/${selectedMission.id}/agents/${focusedAgent.id}/execute`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ handle })
                        });
                        if (res.ok) {
                          await fetchMissions();
                          await fetchMissionData(selectedMission.id);
                          await fetchAgents();
                          if (handle) fetchProfile(handle);
                        } else {
                          const errData = await res.json();
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
                        ? "bg-blue-600/20 border border-blue-500 text-blue-400 shadow-md animate-pulse cursor-wait"
                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg cursor-pointer hover:shadow-blue-600/10 active:scale-[0.98]"
                    }`}
                  >
                    {runningAgentId === focusedAgent.id 
                      ? "⚡ NEURAL THREAD RUNNING..." 
                      : selectedMission?.status !== "ready"
                      ? "Pipeline Inactive"
                      : `⚡ EXECUTE ${focusedAgent.name.toUpperCase()} COGNITION`}
                  </button>
                </div>

                {/* STRICT AGENT CONSOLE FEED */}
                <div className="flex-1 flex flex-col gap-1.5 border-t border-slate-200/50 dark:border-white/5 pt-3 select-text min-h-0">
                  <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase font-bold">
                    LOCAL COGNITIVE EVENT TRAIL
                  </span>
                  
                  <div className={`flex-1 overflow-y-auto p-3 rounded-lg border font-mono text-[9.5px]/relaxed flex flex-col gap-2 ${
                    isDark ? "bg-[#05070a] border-white/5 text-blue-400" : "bg-slate-900 border-slate-900 text-blue-400"
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
                                e.level === "success" ? "bg-emerald-500" : e.level === "warn" ? "bg-amber-400" : e.level === "error" ? "bg-red-500" : "bg-blue-400"
                              }`} />
                              {e.sender}
                            </span>
                            <span>{new Date(e.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-white dark:text-blue-300 font-sans text-xs mt-0.5">
                            {e.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* --- FABRIC CHAT: grounded assistant over this mission --- */}
          {chatOpen && (
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

          {/* --- CUSTOM AGENTS: user-built specialists that act on the fabric --- */}
          {customOpen && (
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

        </div>
      )}

      {/* --- MISSION PLANNER: choose a strategic angle before deploying --- */}
      {showPlanner && (
        <MissionPlanner
          isDark={isDark}
          prompt={planPrompt}
          loading={planLoading}
          variants={planVariants}
          deployingId={planDeployingId}
          onSelect={(v) => createAndLaunchMission(v.refined_prompt, v.id)}
          onRunAsIs={() => createAndLaunchMission(planPrompt, "as-is")}
          onCancel={closePlanner}
        />
      )}

    </div>
  );
}
