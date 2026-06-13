import { WeaveNode, WeaveEdge, ProposedAction, Mission, AgentStatus, ActivityFeedEvent, ResearchBrief, TraceableSentence, Profile, MissionFootprint, MissionRun, ChatTurn, CustomAgent, Session, LedgerEntry, MediaAsset } from "./types.ts";
import { STARTER_CREDITS } from "./footprint.ts";
import * as fs from "fs";
import * as path from "path";

// Persistence file path
const STORAGE_FILE = path.join(process.cwd(), "nebula-data.json");

interface DBState {
  missions: Mission[];
  nodes: WeaveNode[];
  edges: WeaveEdge[];
  actions: ProposedAction[];
  events: ActivityFeedEvent[];
  profiles: Profile[];
  chats: ChatTurn[];
  customAgents: CustomAgent[];
  sessions?: Session[];
  ledger?: LedgerEntry[];
  media?: MediaAsset[];
}

// Pre-seeded high-fidelity missions to provide an immediate "wow" factor
const SEEDED_MISSIONS: Mission[] = [
  {
    id: "mission-payments",
    prompt: "Track how Razorpay, Cashfree, and PayU are shifting enterprise pricing and AI features.",
    persona: "Founder / Product Executive",
    targets: ["razorpay.com", "cashfree.com", "payu.in"],
    status: "ready",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "mission-battery",
    prompt: "Monitor solid-state battery startups for hiring surges, funding alerts, and breakthrough claims.",
    persona: "VC / Battery Investor",
    targets: ["quantumscape.com", "solidpowerbattery.com", "factorialenergy.com"],
    status: "ready",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 22).toISOString()
  },
  {
    id: "mission-uber",
    prompt: "Watch Uber's self-driving division for platform architecture shifts, hiring surges, and key breakthroughs.",
    persona: "Job Seeker / Engineering Lead",
    targets: ["uber.com/blog/engineering", "careers.uber.com"],
    status: "ready",
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 11).toISOString()
  }
];

const SEEDED_NODES: WeaveNode[] = [
  // --- Mission PAYMENTS Nodes ---
  {
    id: "node-p1",
    mission_id: "mission-payments",
    type: "web-signal",
    title: "Razorpay Enterprise Fee Schedule Update",
    content: "Razorpay quiet billing shift: Enterprise pricing is transitioning to a volume-dependent tier. Transactions between ₹10L and ₹50L per month bear a 1.95% rate, while custom enterprise platforms with AI checkout-acceleration are quoted a 1.80% API routing fee + a 0.05% optimization fee.",
    confidence: 0.9,
    own_score: 0.9,
    source: "PricingProductSignal @ razorpay.com/pricing",
    source_url: "https://razorpay.com/pricing",
    version: 1,
    provenance: [],
    flagged_by: null,
    created_at: new Date(Date.now() - 3600000 * 1.9).toISOString()
  },
  {
    id: "node-p2",
    mission_id: "mission-payments",
    type: "web-signal",
    title: "Cashfree Public Onboarding Banner",
    content: "Cashfree landing marketing page declares: '₹0 setup fee, ₹0 annual maintenance fee, and pristine transparent pricing at flat 1.90% per transaction.' High emphasis on seamless startup deployment.",
    confidence: 0.95,
    own_score: 0.95,
    source: "PricingProductSignal @ cashfree.com/pricing",
    source_url: "https://cashfree.com/pricing",
    version: 1,
    provenance: [],
    flagged_by: null,
    created_at: new Date(Date.now() - 3600000 * 1.8).toISOString()
  },
  {
    id: "node-p3",
    mission_id: "mission-payments",
    type: "web-signal",
    title: "Cashfree Developer Terms Clause 4.2",
    content: "Sensed deep inside developer integration terms: 'A platform servicing fee of ₹500/month applies to all active API endpoints using the Smart Routing engine, waived only for merchants processing above ₹15L/month.'",
    confidence: 0.92,
    own_score: 0.92,
    source: "Pathfinder @ cashfree.com/terms",
    source_url: "https://cashfree.com/terms/developer",
    version: 1,
    provenance: [],
    flagged_by: null,
    created_at: new Date(Date.now() - 3600000 * 1.7).toISOString()
  },
  {
    id: "node-p4",
    mission_id: "mission-payments",
    type: "correction",
    title: "Cashfree Policy Shift Refinement",
    content: "Verified with Cashfree merchant billing dashboard. The platform charge is confirmed; however, merchants onboarding before June 2026 are granted a perpetual waiver on the Smart Routing API subscription fee.",
    confidence: 1.0,
    own_score: 1.0,
    source: "human veto (Verified Merchant Policy)",
    source_url: null,
    version: 1,
    provenance: ["node-p3"],
    flagged_by: null,
    created_at: new Date(Date.now() - 3600000 * 0.5).toISOString()
  },
  {
    id: "node-p5",
    mission_id: "mission-payments",
    type: "web-signal",
    title: "Razorpay AI Checkout Release",
    content: "Press release: Razorpay releases 'AI Optimizer' - a predictive routing model that dynamically selects payment gateways based on real-time success rates. Claims optimizer reduces charge failures by 22% over vanilla routing.",
    confidence: 0.88,
    own_score: 0.88,
    source: "NarrativeSignal @ TechCrunch",
    source_url: "https://techcrunch.com/razorpay-ai-optimizer",
    version: 1,
    provenance: [],
    flagged_by: null,
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString()
  },
  {
    id: "node-p6",
    mission_id: "mission-payments",
    type: "synthesis",
    title: "Contradiction Audit: Cashfree Onboarding Clashes",
    content: "Sentinel and Veritas Flag: Cashfree's public pledge of '₹0 annual maintenance fee' directly contradicts Clause 4.2 of their Developer Terms outlining a ₹500/month Platform Servicing Fee. Ground truth corrected: fee exists but is waived conditionally.",
    confidence: 0.65, // Low because of contradiction, but raised by human-note!
    own_score: 0.5,
    source: "Veritas + Sentinel Multi-Source Audit",
    source_url: null,
    version: 1,
    provenance: ["node-p2", "node-p3"],
    flagged_by: "sentinel",
    created_at: new Date(Date.now() - 3600000 * 1.2).toISOString()
  },
  {
    id: "node-p7",
    mission_id: "mission-payments",
    type: "synthesis",
    title: "Intelligence Vector: Quantum Routing Leap",
    content: "Razorpay is pulling ahead in high-volume enterprise segments by backing checkout with predictive AI routing engines. Cashfree is pricing aggressively for smaller merchants but hides end-point API maintenance fees in developer sub-menus.",
    confidence: 0.94, // Healed and backed by human correction
    own_score: 0.94,
    source: "Oracle Synthesis Engine",
    source_url: null,
    version: 1,
    provenance: ["node-p1", "node-p4", "node-p5", "node-p6"],
    flagged_by: null,
    created_at: new Date(Date.now() - 3600000 * 1.0).toISOString()
  },

  // --- Mission BATTERY Nodes ---
  {
    id: "node-b1",
    mission_id: "mission-battery",
    type: "web-signal",
    title: "QuantumScape A0 Prototype Shipping",
    content: "QuantumScape earnings report notes shipment of A0 cell prototypes to custom automotive partners. Cells achieve 24-layer targets with over 95% capacity retention after 800 cycles.",
    confidence: 0.95,
    own_score: 0.95,
    source: "NarrativeSignal @ SEC Filings",
    source_url: "https://quantumscape.com/investor-sec",
    version: 1,
    provenance: [],
    flagged_by: null,
    created_at: new Date(Date.now() - 3600000 * 20).toISOString()
  },
  {
    id: "node-b2",
    mission_id: "mission-battery",
    type: "web-signal",
    title: "Solid Power Scaling Bottlenecks Sensed",
    content: "Inside sources report Solid Power's dry sulphide-electrolyte powder production encounters thermal humidity instabilities, capping pilot output of 100Ah cells at 15 cells/week vs target of 100/week.",
    confidence: 0.72,
    own_score: 0.72,
    source: "TalentSignal @ Glasdoor & Industry Insider",
    source_url: null,
    version: 1,
    provenance: [],
    flagged_by: null,
    created_at: new Date(Date.now() - 3600000 * 18).toISOString()
  },
  {
    id: "node-b3",
    mission_id: "mission-battery",
    type: "web-signal",
    title: "Factorial Energy 40Ah Cell Test Verification",
    content: "Independent testing laboratory TUV SUD certifies Factorial's 40Ah solid-state pouch cells. Energy density reaches 391 Wh/kg. Zero thermal runaway under nail penetration standards.",
    confidence: 0.98,
    own_score: 0.98,
    source: "Veritas @ TUV SUD Registry",
    source_url: "https://tuvsud.com/factorial-verification",
    version: 1,
    provenance: [],
    flagged_by: null,
    created_at: new Date(Date.now() - 3600000 * 15).toISOString()
  },
  {
    id: "node-b4",
    mission_id: "mission-battery",
    type: "synthesis",
    title: "Battery Startups Technical Maturity Divergence",
    content: "Veritas Verification Matrix: Factorial Energy stands out with certified 391 Wh/kg density and flawless security profiles. QuantumScape has automaker-validated cycle counts, but Solid Power is severely throttled by powder-handling chemistry limits.",
    confidence: 0.91,
    own_score: 0.91,
    source: "Veritas Cross-Reference System",
    source_url: null,
    version: 1,
    provenance: ["node-b1", "node-b2", "node-b3"],
    flagged_by: null,
    created_at: new Date(Date.now() - 3600000 * 14).toISOString()
  }
];

const SEEDED_EDGES: WeaveEdge[] = [
  // --- Mission PAYMENTS Edges ---
  {
    id: "edge-p1",
    mission_id: "mission-payments",
    source: "node-p2",
    target: "node-p6",
    relation: "source-of",
    label: "public promise",
    created_by: "Cartographer",
    created_at: new Date(Date.now() - 3600000 * 1.2).toISOString()
  },
  {
    id: "edge-p2",
    mission_id: "mission-payments",
    source: "node-p3",
    target: "node-p6",
    relation: "contradicts",
    label: "fee contradiction",
    created_by: "Sentinel",
    created_at: new Date(Date.now() - 3600000 * 1.2).toISOString()
  },
  {
    id: "edge-p3",
    mission_id: "mission-payments",
    source: "node-p4",
    target: "node-p6",
    relation: "correction-applied",
    label: "resolves waiver",
    created_by: "Cartographer",
    created_at: new Date(Date.now() - 3600000 * 0.5).toISOString()
  },
  {
    id: "edge-p4",
    mission_id: "mission-payments",
    source: "node-p1",
    target: "node-p7",
    relation: "supports",
    label: "routing patterns",
    created_by: "Cartographer",
    created_at: new Date(Date.now() - 3600000 * 1.0).toISOString()
  },
  {
    id: "edge-p5",
    mission_id: "mission-payments",
    source: "node-p5",
    target: "node-p7",
    relation: "supports",
    label: "AI features",
    created_by: "Cartographer",
    created_at: new Date(Date.now() - 3600000 * 1.0).toISOString()
  },
  {
    id: "edge-p6",
    mission_id: "mission-payments",
    source: "node-p6",
    target: "node-p7",
    relation: "weaved",
    label: "audited baseline",
    created_by: "Cartographer",
    created_at: new Date(Date.now() - 3600000 * 1.0).toISOString()
  },

  // --- Mission BATTERY Edges ---
  {
    id: "edge-b1",
    mission_id: "mission-battery",
    source: "node-b1",
    target: "node-b4",
    relation: "weaved",
    label: "shipment indicators",
    created_by: "Cartographer",
    created_at: new Date(Date.now() - 3600000 * 14).toISOString()
  },
  {
    id: "edge-b2",
    mission_id: "mission-battery",
    source: "node-b2",
    target: "node-b4",
    relation: "contradicts",
    label: "production blocks",
    created_by: "Sentinel",
    created_at: new Date(Date.now() - 3600000 * 14).toISOString()
  },
  {
    id: "edge-b3",
    mission_id: "mission-battery",
    source: "node-b3",
    target: "node-b4",
    relation: "weaved",
    label: "test compliance",
    created_by: "Cartographer",
    created_at: new Date(Date.now() - 3600000 * 14).toISOString()
  }
];

const SEEDED_ACTIONS: ProposedAction[] = [
  // --- Mission PAYMENTS Actions — a varied "next move" set ---
  {
    id: "action-p1",
    mission_id: "mission-payments",
    kind: "outreach",
    title: "Open a pricing renegotiation with Razorpay",
    payload: {
      to: "sales-billing@razorpay.com",
      subject: "Custom pricing revision — AI-routing benchmark",
      body: `Dear Strategic Pricing Director,

Reviewing our checkout routing, we see Razorpay's custom enterprise tier sitting at 1.80% API routing + 0.05% AI Optimizer premium.

As a high-volume partner running 1,000+ concurrent checkouts, we'd like our rate reassessed to a flat 1.75% on debit/UPI and 1.82% on corporate cards, with an AI-routing trial this quarter.

Could we find 30 minutes this week?

Best regards,
Enterprise Operations Lead`
    },
    rationale: "Razorpay's newly surfaced 1.80% custom tier gives high-volume founders concrete leverage to pitch a flat 1.75–1.82% on equivalent checkouts.",
    provenance: ["node-p1", "node-p7"],
    status: "proposed"
  },
  {
    id: "action-p2",
    mission_id: "mission-payments",
    kind: "monitor",
    title: "Put Cashfree's developer terms on a standing watch",
    payload: {
      target: "cashfree.com/terms/developer",
      body: "Stand up a daily watch on Cashfree's developer terms (Clause 4.2). Alert me if the ₹500/mo Smart Routing fee, or its conditional waiver wording, changes — the public ‘₹0 maintenance’ pledge already contradicts the fine print once."
    },
    rationale: "Sentinel flagged a live contradiction between Cashfree's public pricing and its developer terms; the waiver is conditional, so the clause is worth watching continuously.",
    provenance: ["node-p3", "node-p6"],
    status: "proposed"
  },
  {
    id: "action-p3",
    mission_id: "mission-payments",
    kind: "deep-dive",
    title: "Deep-dive PayU's enterprise AI roadmap",
    payload: {
      seed: "Track PayU's enterprise pricing tiers and AI checkout features, and how they compare to Razorpay's AI Optimizer and Cashfree's Smart Routing",
      body: "Spawn a focused child mission on PayU: enterprise pricing, AI checkout/routing features, and recent launches — to complete the three-way competitive picture against Razorpay and Cashfree."
    },
    rationale: "The fabric covers Razorpay and Cashfree in depth but PayU is thin; a scoped deep-dive closes the competitive gap.",
    provenance: ["node-p5", "node-p7"],
    status: "proposed"
  },
  {
    id: "action-p4",
    mission_id: "mission-payments",
    kind: "decision",
    title: "Lock the verified ₹0-maintenance waiver into the MSA",
    payload: {
      body: "Decision: before signing, cite the human-verified correction — Cashfree's ₹500/mo Smart Routing fee is waived in perpetuity for merchants onboarding before June 2026. Get the waiver written into the MSA, not left to policy."
    },
    rationale: "A human veto already corrected and confidence-healed this claim to 100%; turning it into a contract clause converts verified intelligence into a protected commercial term.",
    provenance: ["node-p4", "node-p6"],
    status: "proposed"
  },

  // --- Mission BATTERY Actions ---
  {
    id: "action-b1",
    mission_id: "mission-battery",
    kind: "decision",
    title: "Re-weight capital from Solid Power toward Factorial Energy",
    payload: {
      body: "Decision: shift Solid Power's allocation out 3–4 quarters and redirect surplus to Factorial Energy. Solid Power's powder fabrication is thermally constrained, capping A-sample shipping cells; Factorial holds flawless 391 Wh/kg TÜV SÜD certs."
    },
    rationale: "Solid Power's bottleneck is a structural risk to the timeline; re-routing capital to the certified leader minimizes cycle delays.",
    provenance: ["node-b2", "node-b3", "node-b4"],
    status: "proposed"
  },
  {
    id: "action-b2",
    mission_id: "mission-battery",
    kind: "monitor",
    title: "Watch QuantumScape for A0 shipping cadence",
    payload: {
      target: "quantumscape.com/investor-sec",
      body: "Stand up a watch on QuantumScape's investor/SEC updates for A0 prototype shipment volume and cycle-retention figures — the leading indicator that the 24-layer cells are scaling."
    },
    rationale: "A0 shipments to automotive partners are the clearest near-term signal of QuantumScape's execution; cadence changes move the thesis.",
    provenance: ["node-b1", "node-b4"],
    status: "proposed"
  }
];

const SEEDED_EVENTS: ActivityFeedEvent[] = [
  {
    id: "event-1",
    mission_id: "mission-payments",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    sender: "Conductor",
    message: "Intelligence Mission Initiated: Deploying sense teams across Payment corridors.",
    level: "info"
  },
  {
    id: "event-2",
    mission_id: "mission-payments",
    timestamp: new Date(Date.now() - 3600000 * 1.9).toISOString(),
    sender: "Pathfinder",
    message: "Navigated razorpay.com/pricing successfully. Extracted tiered enterprise pricing details.",
    level: "success"
  },
  {
    id: "event-3",
    mission_id: "mission-payments",
    timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(),
    sender: "PricingProductSignal",
    message: "Cashfree billing guidelines resolved. Banner promises flat 1.90% with ₹0 setup / ₹0 care premium.",
    level: "info"
  },
  {
    id: "event-4",
    mission_id: "mission-payments",
    timestamp: new Date(Date.now() - 3600000 * 1.7).toISOString(),
    sender: "Pathfinder",
    message: "Retrieved Developer Terms page. Discovered Clause 4.2 detailing undisclosed ₹500 platform fee.",
    level: "warn"
  },
  {
    id: "event-5",
    mission_id: "mission-payments",
    timestamp: new Date(Date.now() - 3600000 * 1.2).toISOString(),
    sender: "Sentinel",
    message: "CRITICAL DRIFT: Double-policy contradict detected. Cashfree's ₹0 fee claim conflicts with Clause 4.2 platform fee terms.",
    level: "error"
  },
  {
    id: "event-6",
    mission_id: "mission-payments",
    timestamp: new Date(Date.now() - 3600000 * 0.5).toISOString(),
    sender: "Cartographer",
    message: "Healed Weave: Applied human override correction. Downstream confidence scores propagating correction waivers successfully.",
    level: "success"
  }
];

// In-memory Database manager with atomic JSON saving
class Database {
  private state: DBState = {
    missions: [],
    nodes: [],
    edges: [],
    actions: [],
    events: [],
    profiles: [],
    chats: [],
    customAgents: [],
    sessions: [],
    ledger: [],
    media: []
  };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const fileContent = fs.readFileSync(STORAGE_FILE, "utf-8");
        this.state = JSON.parse(fileContent);
        // Ensure seeded missions exist
        for (const m of SEEDED_MISSIONS) {
          if (!this.state.missions.some(x => x.id === m.id)) {
            this.state.missions.push(m);
          }
        }
        // Ensure seeded nodes exist
        for (const n of SEEDED_NODES) {
          if (!this.state.nodes.some(x => x.id === n.id)) {
            this.state.nodes.push(n);
          }
        }
        // Ensure seeded edges exist
        for (const e of SEEDED_EDGES) {
          if (!this.state.edges.some(x => x.id === e.id)) {
            this.state.edges.push(e);
          }
        }
        // Ensure seeded actions exist
        for (const a of SEEDED_ACTIONS) {
          if (!this.state.actions.some(x => x.id === a.id)) {
            this.state.actions.push(a);
          }
        }
        // Ensure seeded events exist
        for (const ev of SEEDED_EVENTS) {
          if (!this.state.events.some(x => x.id === ev.id)) {
            this.state.events.push(ev);
          }
        }
        if (!this.state.profiles) this.state.profiles = [];
        if (!this.state.chats) this.state.chats = [];
        if (!this.state.customAgents) this.state.customAgents = [];
        if (!this.state.sessions) this.state.sessions = [];
        if (!this.state.ledger) this.state.ledger = [];
        if (!this.state.media) this.state.media = [];
        // Backfill profiles created before the wallet ledger existed.
        for (const p of this.state.profiles) if (p.totalSpent === undefined) p.totalSpent = 0;
        this.save();
      } else {
        // Initial bootstrap with pre-seeds
        this.state = {
          missions: [...SEEDED_MISSIONS],
          nodes: [...SEEDED_NODES],
          edges: [...SEEDED_EDGES],
          actions: [...SEEDED_ACTIONS],
          events: [...SEEDED_EVENTS],
          profiles: [],
          chats: [],
          customAgents: [],
          sessions: [],
          ledger: [],
          media: []
        };
        this.save();
      }
    } catch (e) {
      console.error("Failed to load Nebula Storage. Initializing fallback memory.", e);
      this.state = {
        missions: [...SEEDED_MISSIONS],
        nodes: [...SEEDED_NODES],
        edges: [...SEEDED_EDGES],
        actions: [...SEEDED_ACTIONS],
        events: [...SEEDED_EVENTS],
        profiles: [],
        chats: [],
        customAgents: [],
        sessions: [],
        ledger: [],
        media: []
      };
    }
  }

  public save() {
    try {
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(this.state, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save state to disk:", e);
    }
  }

  // API operations
  public getMissions(): Mission[] {
    return this.state.missions;
  }

  public getMission(id: string): Mission | undefined {
    return this.state.missions.find(m => m.id === id);
  }

  public createMission(mission: Mission) {
    this.state.missions.push(mission);
    this.save();
  }

  public updateMissionStatus(id: string, status: Mission["status"]) {
    const mission = this.getMission(id);
    if (mission) {
      mission.status = status;
      mission.updated_at = new Date().toISOString();
      this.save();
    }
  }

  public getNodes(missionId: string): WeaveNode[] {
    return this.state.nodes.filter(n => n.mission_id === missionId);
  }

  public getNode(id: string): WeaveNode | undefined {
    return this.state.nodes.find(n => n.id === id);
  }

  public getEdges(missionId: string): WeaveEdge[] {
    return this.state.edges.filter(e => e.mission_id === missionId);
  }

  public getActions(missionId: string): ProposedAction[] {
    return this.state.actions.filter(a => a.mission_id === missionId);
  }

  public updateActionStatus(id: string, status: ProposedAction["status"]) {
    const action = this.state.actions.find(a => a.id === id);
    if (action) {
      action.status = status;
      this.save();
    }
  }

  public getEvents(missionId: string): ActivityFeedEvent[] {
    return this.state.events.filter(e => e.mission_id === missionId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public addEvent(event: ActivityFeedEvent) {
    this.state.events.push(event);
    this.save();
  }

  public addNode(node: WeaveNode) {
    this.state.nodes.push(node);
    this.save();
  }

  public addEdge(edge: WeaveEdge) {
    this.state.edges.push(edge);
    this.save();
  }

  public addProposedAction(action: ProposedAction) {
    this.state.actions.push(action);
    this.save();
  }

  // ─── Profiles & Green Credits ──────────────────────────────────────────────
  public getProfile(handle: string): Profile | undefined {
    return this.state.profiles.find(p => p.handle.toLowerCase() === handle.toLowerCase());
  }

  public getOrCreateProfile(handle: string): Profile {
    let p = this.getProfile(handle);
    if (!p) {
      p = {
        handle,
        credits: STARTER_CREDITS,
        totalCo2Saved_g: 0,
        totalCostSaved_usd: 0,
        totalSpent: 0,
        missionsDeployed: 0,
        pledges: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.state.profiles.push(p);
      this.save();
    }
    return p;
  }

  public spendCredits(handle: string, amount: number): boolean {
    const p = this.getOrCreateProfile(handle);
    if (p.credits < amount) return false;
    p.credits -= amount;
    p.updated_at = new Date().toISOString();
    this.save();
    return true;
  }

  public addCredits(handle: string, amount: number) {
    const p = this.getOrCreateProfile(handle);
    p.credits += amount;
    p.updated_at = new Date().toISOString();
    this.save();
  }

  // Claim an eco-pledge: once per UTC day per pledge. Returns null if already claimed today.
  public claimPledge(handle: string, pledgeId: string, credits: number, co2_g: number): Profile | null {
    const p = this.getOrCreateProfile(handle);
    const today = new Date().toISOString().slice(0, 10);
    if (p.pledges.some(pl => pl.id === pledgeId && pl.date === today)) {
      return null; // already claimed today
    }
    p.pledges.push({ id: pledgeId, date: today });
    p.credits += credits;
    p.totalCo2Saved_g += co2_g;
    p.updated_at = new Date().toISOString();
    this.addLedger({
      handle, direction: "earn", amount: credits, balance: p.credits, source: "pledge",
      note: `Eco-pledge claimed — saved ~${co2_g >= 1000 ? (co2_g / 1000).toFixed(1) + "kg" : co2_g + "g"} CO₂`,
    });
    this.save();
    return p;
  }

  public setMissionFootprint(missionId: string, footprint: MissionFootprint) {
    const mission = this.getMission(missionId);
    if (mission) {
      mission.footprint = footprint;
      mission.updated_at = new Date().toISOString();
      this.save();
    }
  }

  // Credit the efficiency dividend after a mission completes and log its footprint.
  public recordMissionImpact(handle: string, missionId: string, footprint: MissionFootprint) {
    const mission = this.getMission(missionId);
    if (mission) {
      mission.footprint = footprint;
      mission.updated_at = new Date().toISOString();
    }
    const p = this.getOrCreateProfile(handle);
    p.credits += footprint.creditsEarned;
    p.totalCo2Saved_g += footprint.co2Saved_g;
    p.totalCostSaved_usd += footprint.costSavedUsd;
    p.missionsDeployed += 1;
    p.updated_at = new Date().toISOString();
    this.addLedger({
      handle, direction: "earn", amount: footprint.creditsEarned, source: "dividend",
      note: `Efficiency dividend — avoided ~${footprint.co2Saved_g}g CO₂ vs baseline`,
      tokens: footprint.tokens, provider: footprint.provider, mission_id: missionId,
    });
    this.save();
  }

  // ─── Auth: credentials & sessions ──────────────────────────────────────────
  /** Strip server-only secrets before sending a profile to the client. */
  public publicProfile(p: Profile): Omit<Profile, "credential"> {
    const { credential, ...rest } = p as any;
    return rest;
  }

  public hasCredential(handle: string): boolean {
    return !!this.getProfile(handle)?.credential;
  }

  public setCredential(handle: string, credential: string): Profile {
    const p = this.getOrCreateProfile(handle);
    p.credential = credential;
    p.updated_at = new Date().toISOString();
    this.save();
    return p;
  }

  public getCredential(handle: string): string | undefined {
    return this.getProfile(handle)?.credential;
  }

  public createSession(handle: string, token: string, ttlMs: number): Session {
    if (!this.state.sessions) this.state.sessions = [];
    const now = Date.now();
    // prune expired
    this.state.sessions = this.state.sessions.filter(s => new Date(s.expires_at).getTime() > now);
    const session: Session = {
      token, handle,
      created_at: new Date(now).toISOString(),
      expires_at: new Date(now + ttlMs).toISOString(),
    };
    this.state.sessions.push(session);
    this.save();
    return session;
  }

  public getSessionHandle(token: string | undefined): string | null {
    if (!token || !this.state.sessions) return null;
    const s = this.state.sessions.find(s => s.token === token);
    if (!s) return null;
    if (new Date(s.expires_at).getTime() <= Date.now()) {
      this.deleteSession(token);
      return null;
    }
    return s.handle;
  }

  public deleteSession(token: string | undefined) {
    if (!token || !this.state.sessions) return;
    this.state.sessions = this.state.sessions.filter(s => s.token !== token);
    this.save();
  }

  // ─── Wallet: ledger, metered debit / credit ────────────────────────────────
  private addLedger(e: Omit<LedgerEntry, "id" | "ts" | "balance"> & { balance?: number }) {
    if (!this.state.ledger) this.state.ledger = [];
    const profile = this.getProfile(e.handle);
    const entry: LedgerEntry = {
      id: `lx-${Math.random().toString(36).substr(2, 9)}`,
      ts: new Date().toISOString(),
      balance: e.balance ?? profile?.credits ?? 0,
      ...e,
    };
    this.state.ledger.push(entry);
    // keep the ledger bounded
    if (this.state.ledger.length > 5000) this.state.ledger = this.state.ledger.slice(-4000);
    return entry;
  }

  public getLedger(handle: string, limit = 100): LedgerEntry[] {
    const all = (this.state.ledger || []).filter(l => l.handle.toLowerCase() === handle.toLowerCase());
    return all.slice(-limit).reverse();
  }

  /** Metered spend. Clamps to available balance; records a ledger entry. Returns credits actually charged. */
  public debit(handle: string, amount: number, meta: { source: string; note: string; tokens?: number; provider?: string; mission_id?: string }): number {
    if (!handle || amount <= 0) return 0;
    const p = this.getOrCreateProfile(handle);
    const charge = Math.min(amount, p.credits);
    p.credits -= charge;
    p.totalSpent = (p.totalSpent || 0) + charge;
    p.updated_at = new Date().toISOString();
    this.addLedger({ handle, direction: "spend", amount: charge, balance: p.credits, ...meta });
    this.save();
    return charge;
  }

  /** Credit (earn) with a ledger entry. */
  public creditWallet(handle: string, amount: number, meta: { source: string; note: string; mission_id?: string }): number {
    if (!handle || amount <= 0) return 0;
    const p = this.getOrCreateProfile(handle);
    p.credits += amount;
    p.updated_at = new Date().toISOString();
    this.addLedger({ handle, direction: "earn", amount, balance: p.credits, ...meta });
    this.save();
    return amount;
  }

  // ─── Media assets (Visualizer / Cinematographer output) ────────────────────
  public addMediaAsset(asset: MediaAsset) {
    if (!this.state.media) this.state.media = [];
    this.state.media.push(asset);
    this.save();
  }

  public getMediaAssets(missionId: string): MediaAsset[] {
    return (this.state.media || []).filter(m => m.mission_id === missionId).reverse();
  }

  public getMediaAsset(id: string): MediaAsset | undefined {
    return (this.state.media || []).find(m => m.id === id);
  }

  public deleteMediaAsset(id: string) {
    if (!this.state.media) return;
    this.state.media = this.state.media.filter(m => m.id !== id);
    this.save();
  }

  // ─── Runs (mission history / time-series) ──────────────────────────────────
  public addRun(missionId: string, run: MissionRun) {
    const m = this.getMission(missionId);
    if (!m) return;
    if (!m.runs) m.runs = [];
    m.runs.push(run);
    this.save();
  }

  public updateRun(missionId: string, runId: string, patch: Partial<MissionRun>) {
    const m = this.getMission(missionId);
    const run = m?.runs?.find(r => r.id === runId);
    if (run) {
      Object.assign(run, patch);
      this.save();
    }
  }

  public getRuns(missionId: string): MissionRun[] {
    return this.getMission(missionId)?.runs || [];
  }

  // ─── Per-mission grounded chat ─────────────────────────────────────────────
  public getChats(missionId: string): ChatTurn[] {
    return this.state.chats.filter(c => c.mission_id === missionId);
  }

  public addChat(turn: ChatTurn) {
    this.state.chats.push(turn);
    this.save();
  }

  // ─── Custom (user-created) agents ──────────────────────────────────────────
  public getCustomAgents(missionId: string): CustomAgent[] {
    return this.state.customAgents.filter(a => a.mission_id === missionId);
  }

  public getCustomAgent(id: string): CustomAgent | undefined {
    return this.state.customAgents.find(a => a.id === id);
  }

  public addCustomAgent(agent: CustomAgent) {
    this.state.customAgents.push(agent);
    this.save();
  }

  public deleteCustomAgent(id: string) {
    this.state.customAgents = this.state.customAgents.filter(a => a.id !== id);
    this.save();
  }

  public touchCustomAgent(id: string) {
    const a = this.getCustomAgent(id);
    if (a) { a.last_run = new Date().toISOString(); this.save(); }
  }

  // ─── Node curation / CRUD ──────────────────────────────────────────────────
  public updateNode(id: string, patch: Partial<WeaveNode>): WeaveNode | undefined {
    const node = this.getNode(id);
    if (node) {
      Object.assign(node, patch);
      this.save();
    }
    return node;
  }

  public deleteNode(id: string) {
    this.state.nodes = this.state.nodes.filter(n => n.id !== id);
    this.state.edges = this.state.edges.filter(e => e.source !== id && e.target !== id);
    this.save();
  }

  // ─── Layout persistence ────────────────────────────────────────────────────
  public setLayout(missionId: string, layout: { [nodeId: string]: { x: number; y: number } }) {
    const m = this.getMission(missionId);
    if (m) {
      m.layout = layout;
      this.save();
    }
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────
  public setArchived(id: string, archived: boolean) {
    const m = this.getMission(id);
    if (m) { m.archived = archived; m.updated_at = new Date().toISOString(); this.save(); }
  }

  public setMonitoring(id: string, monitoring: boolean) {
    const m = this.getMission(id);
    if (m) { m.monitoring = monitoring; m.updated_at = new Date().toISOString(); this.save(); }
  }

  public updateMissionSpec(id: string, patch: { prompt?: string; persona?: string | null; targets?: string[]; agents?: string[]; cadence?: number }): Mission | undefined {
    const m = this.getMission(id);
    if (m) {
      if (patch.prompt !== undefined) m.prompt = patch.prompt;
      if (patch.persona !== undefined) m.persona = patch.persona;
      if (patch.targets !== undefined) m.targets = patch.targets;
      if (patch.agents !== undefined) m.agents = patch.agents;
      if (patch.cadence !== undefined) m.cadence = Math.max(10, Math.min(3600, patch.cadence));
      m.updated_at = new Date().toISOString();
      this.save();
    }
    return m;
  }

  // Weave editing and re-healing logic
  public addCorrection(node: WeaveNode, reasonOfCorrection?: string) {
    this.state.nodes.push(node);
    // Draw a correction edge from this correction node to the original node(s)
    for (const provId of node.provenance) {
      const edgeId = `edge-correction-${Math.random().toString(36).substr(2, 9)}`;
      const edge: WeaveEdge = {
        id: edgeId,
        mission_id: node.mission_id,
        source: node.id,
        target: provId,
        relation: "correction-applied",
        label: reasonOfCorrection || "applies corrective data",
        created_by: "human",
        created_at: new Date().toISOString()
      };
      this.state.edges.push(edge);
    }
    this.save();
  }

  // Core IP: Confidence propagation logic
  // A node's confidence score = min(own_score, weakest provenance node score)
  // If a node is weaved from other source nodes, its score propagates from them.
  // Exception: human corrections carry confidence = 1.0 and override low-confidence nodes.
  public propagateConfidence(missionId: string) {
    const nodes = this.getNodes(missionId);
    if (!nodes.length) return;

    const nodeMap = new Map<string, WeaveNode>();
    nodes.forEach(n => nodeMap.set(n.id, n));

    const visited = new Set<string>();
    const computing = new Set<string>();

    const calculateConfidence = (nodeId: string): number => {
      if (visited.has(nodeId)) {
        const node = nodeMap.get(nodeId);
        return node ? node.confidence : 0.5;
      }
      if (computing.has(nodeId)) {
        // Prevent infinite loops in cyclic dependencies (fall back to intrinsic score)
        const node = nodeMap.get(nodeId);
        return node ? node.own_score : 0.5;
      }

      computing.add(nodeId);
      const node = nodeMap.get(nodeId);
      if (!node) {
        computing.delete(nodeId);
        return 0;
      }

      if (node.type === "correction") {
        node.confidence = 1.0;
        visited.add(nodeId);
        computing.delete(nodeId);
        return 1.0;
      }

      // Start with intrinsic score
      let minProvScore = node.own_score;

      if (node.provenance && node.provenance.length > 0) {
        let provScoresSum = 0;
        let provCount = 0;
        
        node.provenance.forEach(pId => {
          const provNode = nodeMap.get(pId);
          if (provNode) {
            const pConf = calculateConfidence(pId);
            // If it's supported by a human correction node, confidence climbs to 1.0 or high
            if (provNode.type === "correction") {
              minProvScore = Math.max(minProvScore, 0.98); // Boosted by remediation
            } else {
              minProvScore = Math.min(minProvScore, pConf);
            }
            provScoresSum += pConf;
            provCount++;
          }
        });
      }

      // If sentinel flags it (e.g. active contradiction), suppress confidence
      if (node.flagged_by === "sentinel") {
        node.confidence = Math.min(minProvScore, 0.55);
      } else {
        node.confidence = minProvScore;
      }

      node.confidence = Number(node.confidence.toFixed(2));
      visited.add(nodeId);
      computing.delete(nodeId);
      return node.confidence;
    };

    // Propagate for all nodes
    nodes.forEach(node => {
      calculateConfidence(node.id);
    });

    this.save();
  }

  // Scribe sentence parser: Compiles complete research briefs for each mission
  public getBrief(missionId: string): ResearchBrief {
    // Determine which description to render
    const mission = this.getMission(missionId);
    const nodes = this.getNodes(missionId);

    if (missionId === "mission-payments") {
      return {
        summary: "An in-depth multi-agent sensing audit of fintech billing portals reveals that while payment platforms pitch absolute transparency, integration terms harbor conditional endpoint pricing.",
        sentences: [
          {
            id: "s1",
            text: "Razorpay is transitioning enterprise processing accounts to custom volume tiers starting at 1.80%, which acts as a leverage baseline for high-volume vendors.",
            provenance: ["node-p1", "node-p7"]
          },
          {
            id: "s2",
            text: "Cashfree maintains a zero-fee advertising campaign pointing to absolute pricing clarity.",
            provenance: ["node-p2"]
          },
          {
            id: "s3",
            text: "However, Dev Clause 4.2 introduces a stealth platform routing subscription fee of ₹500 per month, directly contradicting public advertisements.",
            provenance: ["node-p3", "node-p6"]
          },
          {
            id: "s4",
            text: "Human corrections confirm that Cashfree's platform billing can be fully waived via manually verified contracts for early-onboarding merchants.",
            provenance: ["node-p4"]
          },
          {
            id: "s5",
            text: "Razorpay is utilizing AI routing engines to achieve a 22% improvement in successful transactions, prompting significant capture of enterprise clients.",
            provenance: ["node-p5", "node-p7"]
          }
        ],
        recommendations: [
          "Demand customized Razorpay volume discounts referencing the newly discovered 1.80% slab.",
          "Secure an explicit, written developer fee waiver contract if implementing Cashfree endpoint gateways.",
          "Enable high-velocity routing logic blocks on payment channels to mitigate transactional cycle drop-outs."
        ]
      };
    } else if (missionId === "mission-battery") {
      return {
        summary: "Technical audits across solid-state battery startups highlight a clear divide in maturity, with dry sulphide chemistry production failing to scale relative to verified pouch battery prototypes.",
        sentences: [
          {
            id: "sb1",
            text: "QuantumScape has shipped initial 24-layer solid-state battery cells for OEM vehicle validations with stable cycling curves.",
            provenance: ["node-b1", "node-b4"]
          },
          {
            id: "sb2",
            text: "Solid Power is severely bottlenecked, failing to cross 15 prototype cells a week on the back of thermal and humidity chemistry handling errors.",
            provenance: ["node-b2", "node-b4"]
          },
          {
            id: "sb3",
            text: "Factorial Energy's solid-state pouch technology achieved a verified density of 391 Wh/kg in TUV SUD independent certified laboratory metrics.",
            provenance: ["node-b3", "node-b4"]
          }
        ],
        recommendations: [
          "Postpone investment expansions in dry sulphide powder systems due to thermal processing limits.",
          "Increase focus on pouch cell physical testing targets where manufacturers hold external certification bounds.",
          "Track Factorial Energy hiring surges as a primary leading indicator of automotive prototype scaleups."
        ]
      };
    } else {
      // ── Dynamic brief generated from the REAL woven nodes ──
      const defaultNodes = nodes || [];
      const actions = this.getActions(missionId);
      const signals = defaultNodes.filter(n => n.type === "web-signal");
      const syntheses = defaultNodes.filter(n => n.type === "synthesis" && n.flagged_by !== "sentinel");
      const conflicts = defaultNodes.filter(n => n.flagged_by === "sentinel");
      const corrections = defaultNodes.filter(n => n.type === "correction");
      const grounded = signals.filter(n => n.grounded === true).length;
      const avgConf = signals.length
        ? Math.round((signals.reduce((s, n) => s + n.confidence, 0) / signals.length) * 100)
        : 0;
      const topSynth = syntheses.slice().sort((a, b) => b.confidence - a.confidence)[0];

      // Summary: lead with the strongest synthesis, else a real, specific recap.
      let summary: string;
      if (topSynth) {
        summary = topSynth.content;
      } else if (signals.length) {
        summary =
          `The swarm wove ${signals.length} signal${signals.length !== 1 ? "s" : ""}` +
          (grounded ? ` (${grounded} live-fetched from real sources)` : "") +
          ` for "${mission?.prompt || "this mission"}", at an average source confidence of ${avgConf}%.` +
          (conflicts.length ? ` ${conflicts.length} contradiction${conflicts.length !== 1 ? "s were" : " was"} flagged for review.` : "") +
          (corrections.length ? ` ${corrections.length} human correction${corrections.length !== 1 ? "s have" : " has"} been applied.` : "");
      } else {
        summary = "The swarm is still sensing. Discovered sources will be mapped into the fabric as they arrive.";
      }

      // Traceable claims: one per signal, each linking back to its node (+ any synthesis that used it).
      const sentences: TraceableSentence[] = [];
      signals.forEach((sig) => {
        const usedBy = syntheses.filter(s => (s.provenance || []).includes(sig.id)).map(s => s.id);
        const text = sig.content.length > 180 ? sig.content.slice(0, 180).trim() + "…" : sig.content;
        sentences.push({ id: `dyn-s-${sig.id}`, text, provenance: [sig.id, ...usedBy] });
      });
      conflicts.forEach((c) => {
        sentences.push({
          id: `dyn-c-${c.id}`,
          text: `⚠ ${c.title}: ${c.content.slice(0, 160)}${c.content.length > 160 ? "…" : ""}`,
          provenance: [c.id, ...(c.provenance || [])]
        });
      });

      // Recommendations grounded in what was actually found.
      const recommendations: string[] = [];
      if (topSynth) recommendations.push(`Act on the core insight: ${topSynth.title}.`);
      if (conflicts.length) recommendations.push(`Resolve ${conflicts.length} flagged contradiction${conflicts.length !== 1 ? "s" : ""} with a human correction so downstream confidence heals.`);
      const lowConf = signals.filter(s => s.confidence < 0.6);
      if (lowConf.length) recommendations.push(`Re-verify ${lowConf.length} low-confidence signal${lowConf.length !== 1 ? "s" : ""} before relying on them.`);
      if (actions.length) recommendations.push(`Review ${actions.length} proposed action${actions.length !== 1 ? "s" : ""} drafted by the Assistant.`);
      if (!recommendations.length) recommendations.push("Pin the highest-value signals and re-sense later to track how they change over time.");

      return {
        summary,
        sentences: sentences.length > 0 ? sentences : [
          { id: "dyn-empty", text: "Agent analysis underway. Discovered sources are being mapped into the fabric.", provenance: [] }
        ],
        recommendations
      };
    }
  }
}

export const db = new Database();
