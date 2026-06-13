export type MissionStatus = "queued" | "sensing" | "reasoning" | "synthesizing" | "ready" | "reweaving";

export interface Mission {
  id: string;
  prompt: string;                  // natural-language goal
  persona: string | null;          // optional: founder, investor, jobseeker, etc.
  targets: string[];               // resolved entities/URLs to watch
  status: MissionStatus;           // lifecycle
  created_at: string;
  updated_at: string;
  owner?: string;                  // profile handle that deployed this mission
  footprint?: MissionFootprint;    // metered carbon/cost ledger for the latest run
  // ── living-mission fields ──
  parent_id?: string;              // set if this is a deep-dive child of another mission
  monitoring?: boolean;            // live monitor toggle (client auto re-senses)
  cadence?: number;                // monitor cadence in seconds (default 45)
  agents?: string[];               // enabled specialist agent ids (undefined = all on)
  archived?: boolean;              // lifecycle: archived missions are hidden by default
  runs?: MissionRun[];             // history of sensing runs
  layout?: { [nodeId: string]: { x: number; y: number } }; // persisted canvas layout
}

// One sensing pass over a mission (initial deploy, re-sense, edit, or monitor tick).
export interface MissionRun {
  id: string;
  index: number;                   // 1-based run number
  trigger: "initial" | "resense" | "edit" | "monitor";
  started_at: string;
  finished_at?: string;
  node_ids: string[];              // nodes created during this run
  newSignals: number;              // count of new web-signal nodes
  summary?: string;                // human-readable "what changed"
}

// A user-created custom agent that operates on a mission's fabric.
export interface CustomAgent {
  id: string;
  mission_id: string;
  name: string;
  instruction: string;   // plain-language: what should this agent do?
  icon: string;          // lucide icon name
  created_at: string;
  last_run?: string;
}

// A turn in the per-mission grounded chat.
export interface ChatTurn {
  id: string;
  mission_id: string;
  role: "user" | "assistant";
  content: string;
  citations?: string[];            // node ids referenced by an assistant answer
  created_at: string;
}

// Metered energy/CO2/cost for a mission run + what it avoided vs a baseline.
export interface MissionFootprint {
  tokens: number;
  provider: string;
  energyWh: number;
  co2_g: number;
  co2Saved_g: number;
  costUsd: number;
  costSavedUsd: number;
  creditsEarned: number;           // efficiency dividend credited to the owner
}

// A user profile that banks Green Credits and a real impact ledger.
export interface Profile {
  handle: string;
  credits: number;
  totalCo2Saved_g: number;         // pledges + efficiency dividends
  totalCostSaved_usd: number;      // vs GPT-4-class baseline
  totalSpent: number;              // lifetime credits spent on model runs
  missionsDeployed: number;
  pledges: { id: string; date: string }[]; // claim history (date = UTC day)
  credential?: string;             // server-only: "salt:hash" (never serialized to client)
  created_at: string;
  updated_at: string;
}

// A server-side session (opaque token → handle, with expiry).
export interface Session {
  token: string;
  handle: string;
  created_at: string;
  expires_at: string;
}

// One movement in a profile's Green-Credit wallet (earn or spend).
export interface LedgerEntry {
  id: string;
  handle: string;
  ts: string;
  direction: "earn" | "spend";
  amount: number;                  // always positive; direction carries the sign
  balance: number;                 // running balance AFTER this entry
  source: string;                  // "deploy" | "resense" | "custom-agent" | "chat" | "forecast" | "agent" | "media-image" | "media-video" | "pledge" | "dividend"
  note: string;                    // human-readable description
  tokens?: number;                 // model tokens consumed (for metered spends)
  provider?: string;               // model/provider used
  mission_id?: string;
}

// A generated media artifact (image or video) for a mission, produced by the
// Visualizer / Cinematographer agents. URL is a remote link (live) or an
// on-brand SVG data-URI (simulated fallback).
export interface MediaAsset {
  id: string;
  mission_id: string;
  kind: "image" | "video";
  prompt: string;
  providerId: string;
  provider: string;        // human-readable provider/model label
  model: string;
  url: string;
  poster?: string;         // poster frame for video
  seconds?: number;        // clip length for video
  simulated: boolean;      // true = preview placeholder (no live key)
  credits: number;         // credits charged for this generation
  note?: string;
  source_node_id?: string; // finding this visual was derived from, if any
  created_at: string;
}

export type NodeType = "web-signal" | "human-note" | "synthesis" | "correction" | "output" | "memory" | "action";
export type EdgeRel = "weaved" | "contradicts" | "correction-applied" | "prior-context" | "source-of" | "supports";

export interface WeaveNode {
  id: string;
  mission_id: string;
  type: NodeType;
  title: string;
  content: string;
  confidence: number;            // 0..1 (effective, propagation calculated)
  own_score: number;             // 0..1 (intrinsic, prior to propagation)
  source: string;                // agent name or "human" + optional source URL/citation
  source_url: string | null;
  version: number;
  provenance: string[];          // node ids this was woven from
  flagged_by: "sentinel" | null;
  created_at: string;
  run_id?: string;               // sensing run that produced this node
  pinned?: boolean;              // user-pinned (curation)
  note?: string;                 // user annotation
  manual?: boolean;              // manually added by the user
  grounded?: boolean;            // true = extracted from a real fetched page; false = LLM-inferred
  corroboration?: number;        // # of independent sources supporting this signal
  render_kind?: "text" | "metrics" | "comparison" | "list" | "quote"; // how the canvas should render it
  data?: any;                    // structured payload for the chosen render_kind
  // ── temporal (EchoForge) ──
  time_horizon?: "past" | "present" | "future"; // where on the timeline this sits
  probability?: number;          // 0..1 — likelihood, for future/scenario nodes
  risk_reward?: "opportunity" | "risk" | "mixed"; // heat for future branches
}

export interface WeaveEdge {
  id: string;
  mission_id: string;
  source: string;                // source node id
  target: string;                // target node id
  relation: EdgeRel;
  label: string;                 // display label
  created_by: string;            // agent name or "human"
  created_at: string;
}

// The swarm's "next moves". Beyond drafting an email, it can propose a standing
// watch, a focused deep-dive mission, a strategic decision, or a deadline — each
// wired to a real, one-click handoff in the workspace.
export type ActionKind =
  | "outreach"      // contact a person (email draft)
  | "monitor"       // stand up a continuous watch
  | "deep-dive"     // spawn a focused child mission
  | "decision"      // a strategic move to lock in
  | "reminder"      // a deadline / calendar item
  | "draft-brief"   // a document to copy / export
  // legacy aliases (older runs / data):
  | "draft-email" | "draft-application" | "alert" | "other";

export interface ProposedAction {
  id: string;
  mission_id: string;
  kind: ActionKind;
  title: string;
  payload: {
    to?: string;
    subject?: string;
    body: string;
    seed?: string;       // deep-dive: the child mission prompt
    target?: string;     // monitor: the entity/url to watch
    deadline?: string;   // reminder: ISO date
    [key: string]: any;
  };
  rationale: string;             // why did Oracle propose it
  provenance: string[];          // supporting node ids
  status: "proposed" | "approved" | "dismissed";
}

export interface AgentStatus {
  id: string;
  name: string;
  status: "idle" | "working" | "flagged";
  task: string;
}

export interface ActivityFeedEvent {
  id: string;
  mission_id: string;
  timestamp: string;
  sender: string; // Agent name
  message: string;
  level: "info" | "success" | "warn" | "error";
}

export interface TraceableSentence {
  id: string;
  text: string;
  provenance: string[]; // Node IDs
}

export interface ResearchBrief {
  summary: string;
  sentences: TraceableSentence[];
  recommendations: string[];
}

// A proposed strategic interpretation of a generic mission prompt. The user
// picks one of three before the swarm is deployed.
export interface MissionPlanVariant {
  id: string;
  name: string;            // short title of what it accomplishes
  angle: string;           // one-line focus
  description: string;     // 2-sentence explanation of what the swarm will do
  focus: string[];         // short tags
  refined_prompt: string;  // the specific prompt the swarm actually runs
}
