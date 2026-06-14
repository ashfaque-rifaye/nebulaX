import { WeaveNode, WeaveEdge, ProposedAction, Mission, AgentStatus, ActivityFeedEvent, ResearchBrief, TraceableSentence, Profile, MissionFootprint, MissionRun, ChatTurn, CustomAgent, Session, LedgerEntry, MediaAsset, Connector, BuildPlan, BuildGap, BuildTask } from "./types.ts";
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
  connectors?: Connector[];
}

// Pre-seeded, demo-ready workspaces. Every finding carries the REAL data it
// describes (metrics / side-by-side comparisons), a binary verified badge and a
// source count — no opaque confidence percentages.
const SEEDED_MISSIONS: Mission[] = [
  {
    id: "mission-payments",
    prompt: "Compare Razorpay, Cashfree and PayU on enterprise pricing, settlement and AI checkout.",
    persona: "Founder / Product Executive",
    targets: ["razorpay.com", "cashfree.com", "payu.in"],
    status: "ready",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "mission-battery",
    prompt: "Compare QuantumScape, Factorial and Solid Power on energy density, cycle life and funding.",
    persona: "VC / Deep-Tech Investor",
    targets: ["quantumscape.com", "factorialenergy.com", "solidpowerbattery.com"],
    status: "ready",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 22).toISOString()
  },
  {
    id: "mission-stack",
    prompt: "Audit Acme Checkout's product and tech stack — surface gaps and what to build next.",
    persona: "Engineering Lead / CTO",
    targets: ["github.com/acme/checkout", "checkout.acme.com"],
    status: "ready",
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString()
  }
];

const SEEDED_NODES: WeaveNode[] = [
  // ─────────────────── Mission PAYMENTS — Razorpay vs Cashfree vs PayU ───────────────────
  {
    id: "node-p1",
    mission_id: "mission-payments",
    type: "web-signal",
    title: "Razorpay enterprise pricing",
    content: "Razorpay's enterprise tier is volume-banded: ₹10L–₹50L/month settles at 1.95%, while custom high-volume accounts with AI checkout acceleration are quoted 1.80% API routing + a 0.05% optimization fee. T+1 settlement standard, T+0 on request.",
    confidence: 0.9, own_score: 0.9,
    source: "razorpay.com/pricing",
    source_url: "https://razorpay.com/pricing",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 3, verified: true,
    grounded: true,
    render_kind: "metrics",
    data: { items: [
      { label: "MDR (custom)", value: "1.80%" },
      { label: "Standard band", value: "1.95%" },
      { label: "AI fee", value: "+0.05%" },
      { label: "Settlement", value: "T+1 / T+0" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 1.9).toISOString()
  },
  {
    id: "node-p2",
    mission_id: "mission-payments",
    type: "web-signal",
    title: "Cashfree public pricing",
    content: "Cashfree's landing page advertises ₹0 setup, ₹0 annual maintenance, and a flat 1.90% per transaction with instant settlement on the Growth plan.",
    confidence: 0.95, own_score: 0.95,
    source: "cashfree.com/pricing",
    source_url: "https://cashfree.com/pricing",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true,
    grounded: true,
    render_kind: "metrics",
    data: { items: [
      { label: "Flat MDR", value: "1.90%" },
      { label: "Setup fee", value: "₹0" },
      { label: "Maintenance", value: "₹0*" },
      { label: "Settlement", value: "Instant" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 1.8).toISOString()
  },
  {
    id: "node-p3",
    mission_id: "mission-payments",
    type: "web-signal",
    title: "Cashfree developer terms, Clause 4.2",
    content: "Buried in the developer integration terms: a ₹500/month platform servicing fee applies to every active API endpoint using the Smart Routing engine, waived only for merchants processing above ₹15L/month.",
    confidence: 0.92, own_score: 0.92,
    source: "cashfree.com/terms/developer",
    source_url: "https://cashfree.com/terms/developer",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true,
    grounded: true,
    render_kind: "quote",
    data: { quote: "A platform servicing fee of ₹500/month applies to all active API endpoints using the Smart Routing engine, waived only for merchants processing above ₹15L/month.", attribution: "Developer Terms, Clause 4.2" },
    created_at: new Date(Date.now() - 3600000 * 1.7).toISOString()
  },
  {
    id: "node-p-conflict",
    mission_id: "mission-payments",
    type: "synthesis",
    title: "Open conflict: Cashfree's ₹0 pledge vs the ₹500 clause",
    content: "Cashfree's public '₹0 annual maintenance' pledge conflicts with Clause 4.2 of its developer terms, which charges ₹500/month for Smart Routing endpoints. Both can't be true at face value — the swarm surfaced it for you to resolve before relying on the pricing.",
    confidence: 0.65, own_score: 0.5,
    source: "Cross-source check",
    source_url: null,
    version: 1, provenance: ["node-p2", "node-p3"], flagged_by: "sentinel",
    corroboration: 2, verified: false, conflict: true,
    render_kind: "text",
    created_at: new Date(Date.now() - 3600000 * 1.2).toISOString()
  },
  {
    id: "node-p4",
    mission_id: "mission-payments",
    type: "correction",
    title: "Resolved: the maintenance fee is waived in writing",
    content: "Confirmed against the Cashfree merchant billing dashboard: the ₹500/month Smart Routing fee is real, but merchants onboarding before June 2026 get a perpetual waiver. The conflict resolves to 'fee exists, but is contractually waived for you.'",
    confidence: 1.0, own_score: 1.0,
    source: "Human verification · merchant dashboard",
    source_url: null,
    version: 1, provenance: ["node-p-conflict", "node-p3"], flagged_by: null,
    corroboration: 1, verified: true,
    render_kind: "text",
    created_at: new Date(Date.now() - 3600000 * 0.5).toISOString()
  },
  {
    id: "node-p5",
    mission_id: "mission-payments",
    type: "web-signal",
    title: "Razorpay 'AI Optimizer' launch",
    content: "Razorpay shipped 'AI Optimizer', a predictive routing model that picks the gateway with the best real-time success rate per transaction. Razorpay reports it cuts charge failures by 22% versus static routing.",
    confidence: 0.88, own_score: 0.88,
    source: "TechCrunch",
    source_url: "https://techcrunch.com/razorpay-ai-optimizer",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true,
    grounded: true,
    render_kind: "metrics",
    data: { items: [
      { label: "Failure drop", value: "−22%" },
      { label: "Routing", value: "Predictive" },
      { label: "Decision", value: "Real-time" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString()
  },
  {
    id: "node-p6",
    mission_id: "mission-payments",
    type: "web-signal",
    title: "PayU enterprise pricing & AI",
    content: "PayU quotes 1.85% blended MDR for enterprise, ₹0 setup, T+2 standard settlement (T+1 paid add-on). Its 'PayU Engine' offers rule-based smart routing but no published success-rate uplift, and AI fraud scoring is in private beta.",
    confidence: 0.84, own_score: 0.84,
    source: "payu.in/pricing",
    source_url: "https://payu.in/pricing",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true,
    grounded: true,
    render_kind: "metrics",
    data: { items: [
      { label: "Blended MDR", value: "1.85%" },
      { label: "Setup fee", value: "₹0" },
      { label: "Settlement", value: "T+2 / T+1" },
      { label: "AI routing", value: "Rule-based" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 1.4).toISOString()
  },
  {
    id: "node-p-matrix",
    mission_id: "mission-payments",
    type: "synthesis",
    title: "Side-by-side: Razorpay vs Cashfree vs PayU",
    content: "Three-way comparison across the metrics that actually move an enterprise checkout decision: effective MDR, fixed fees, settlement speed, and AI routing maturity.",
    confidence: 0.94, own_score: 0.94,
    source: "Synthesist",
    source_url: null,
    version: 1, provenance: ["node-p1", "node-p2", "node-p4", "node-p5", "node-p6"], flagged_by: null,
    corroboration: 5, verified: true,
    render_kind: "matrix",
    data: {
      columns: ["Razorpay", "Cashfree", "PayU"],
      rows: [
        { label: "Effective MDR", values: ["1.80%*", "1.90%", "1.85%"] },
        { label: "Fixed fees", values: ["₹0", "₹500/mo†", "₹0"] },
        { label: "Settlement", values: ["T+1 / T+0", "Instant", "T+2 / T+1"] },
        { label: "AI routing", values: ["Predictive −22%", "Smart Routing", "Rule-based"] },
      ],
      note: "*custom high-volume tier · †waived for you per the verified correction",
      highlight: 0,
    },
    created_at: new Date(Date.now() - 3600000 * 1.0).toISOString()
  },
  {
    id: "node-p7",
    mission_id: "mission-payments",
    type: "synthesis",
    title: "Where each gateway wins",
    content: "Razorpay leads on high-volume routing economics and the only measured AI uplift (−22% failures), making it the strongest fit above ₹50L/month. Cashfree is cheapest to start and settles instantly, best for early-stage volume — once the Smart Routing fee is waived in the contract. PayU sits in the middle with the slowest settlement.",
    confidence: 0.93, own_score: 0.93,
    source: "Synthesist",
    source_url: null,
    version: 1, provenance: ["node-p-matrix", "node-p4"], flagged_by: null,
    corroboration: 5, verified: true,
    render_kind: "list",
    data: { items: [
      "Razorpay — best for high volume + measured AI routing uplift",
      "Cashfree — cheapest start + instant settlement, after the fee waiver",
      "PayU — middle of the pack, slowest settlement (T+2 default)",
    ] },
    created_at: new Date(Date.now() - 3600000 * 0.9).toISOString()
  },

  // ─────────────────── Mission BATTERY — QuantumScape vs Factorial vs Solid Power ───────────────────
  {
    id: "node-b1",
    mission_id: "mission-battery",
    type: "web-signal",
    title: "QuantumScape A0 cells shipping",
    content: "QuantumScape's earnings note confirms A0 cell prototypes shipped to automotive partners: 24-layer cells holding 95%+ capacity retention after 800 cycles. Cash runway reported into 2028.",
    confidence: 0.95, own_score: 0.95,
    source: "QuantumScape SEC filing",
    source_url: "https://quantumscape.com/investor-sec",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 3, verified: true,
    grounded: true,
    render_kind: "metrics",
    data: { items: [
      { label: "Layers", value: "24" },
      { label: "Retention", value: "95% @800" },
      { label: "Stage", value: "A0 shipping" },
      { label: "Runway", value: "to 2028" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 20).toISOString()
  },
  {
    id: "node-b2",
    mission_id: "mission-battery",
    type: "web-signal",
    title: "Solid Power scaling bottleneck",
    content: "Industry sources describe Solid Power's dry sulphide-electrolyte powder line hitting thermal/humidity instability, capping pilot output of 100Ah cells at ~15/week against a 100/week target. Single-source — worth a second look before acting.",
    confidence: 0.72, own_score: 0.72,
    source: "Industry insider (single source)",
    source_url: null,
    version: 1, provenance: [], flagged_by: null,
    corroboration: 1, verified: false,
    grounded: false,
    render_kind: "metrics",
    data: { items: [
      { label: "Output", value: "~15/wk" },
      { label: "Target", value: "100/wk" },
      { label: "Blocker", value: "Powder line" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 18).toISOString()
  },
  {
    id: "node-b3",
    mission_id: "mission-battery",
    type: "web-signal",
    title: "Factorial 40Ah cell certified",
    content: "TÜV SÜD certified Factorial's 40Ah solid-state pouch cells at 391 Wh/kg with zero thermal runaway under nail-penetration testing. Joint development deals with two OEMs disclosed.",
    confidence: 0.98, own_score: 0.98,
    source: "TÜV SÜD registry",
    source_url: "https://tuvsud.com/factorial-verification",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 3, verified: true,
    grounded: true,
    render_kind: "metrics",
    data: { items: [
      { label: "Density", value: "391 Wh/kg" },
      { label: "Capacity", value: "40 Ah" },
      { label: "Safety", value: "0 runaway" },
      { label: "OEM deals", value: "2" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 15).toISOString()
  },
  {
    id: "node-b-matrix",
    mission_id: "mission-battery",
    type: "synthesis",
    title: "Side-by-side: solid-state readiness",
    content: "Three solid-state contenders compared on the levers a deep-tech investor underwrites: verified energy density, cycle life, manufacturing readiness, and validation.",
    confidence: 0.92, own_score: 0.92,
    source: "Synthesist",
    source_url: null,
    version: 1, provenance: ["node-b1", "node-b2", "node-b3"], flagged_by: null,
    corroboration: 3, verified: true,
    render_kind: "matrix",
    data: {
      columns: ["QuantumScape", "Factorial", "Solid Power"],
      rows: [
        { label: "Energy density", values: ["~380 Wh/kg", "391 Wh/kg ✓", "~350 Wh/kg"] },
        { label: "Cycle life", values: ["95% @800", "n/d", "n/d"] },
        { label: "Mfg readiness", values: ["A0 shipping", "Pilot + OEM", "Bottlenecked"] },
        { label: "Validation", values: ["Automaker", "TÜV SÜD ✓", "Single-source"] },
      ],
      note: "n/d = not disclosed in verified sources",
      highlight: 1,
    },
    created_at: new Date(Date.now() - 3600000 * 14).toISOString()
  },
  {
    id: "node-b4",
    mission_id: "mission-battery",
    type: "synthesis",
    title: "Read: Factorial leads on verified maturity",
    content: "Factorial is the only contender with an independently certified density figure (391 Wh/kg, TÜV SÜD) plus OEM development deals. QuantumScape has the strongest cycle-life evidence and is shipping A0. Solid Power's bottleneck is single-sourced and unverified — treat as a watch item, not a thesis driver.",
    confidence: 0.91, own_score: 0.91,
    source: "Synthesist",
    source_url: null,
    version: 1, provenance: ["node-b-matrix"], flagged_by: null,
    corroboration: 3, verified: true,
    render_kind: "list",
    data: { items: [
      "Factorial — only certified density + OEM deals (lead)",
      "QuantumScape — best cycle-life evidence, A0 shipping",
      "Solid Power — bottleneck unverified, watch not thesis",
    ] },
    created_at: new Date(Date.now() - 3600000 * 13).toISOString()
  },

  // ─────────────────── Mission STACK — Acme Checkout product & tech audit ───────────────────
  {
    id: "node-s1",
    mission_id: "mission-stack",
    type: "web-signal",
    title: "Current stack snapshot",
    content: "Acme Checkout runs a React 18 SPA on a Node 18 / Express monolith, Postgres 14 (single primary), Stripe for payments, hosted single-region on Azure App Service. CI on GitHub Actions; no feature flags; issues tracked in Jira.",
    confidence: 0.9, own_score: 0.9,
    source: "github.com/acme/checkout",
    source_url: "https://github.com/acme/checkout",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true,
    grounded: true,
    render_kind: "metrics",
    data: { items: [
      { label: "Frontend", value: "React 18" },
      { label: "Backend", value: "Node 18" },
      { label: "Data", value: "Postgres 14" },
      { label: "Hosting", value: "Azure · 1 region" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 5.8).toISOString()
  },
  {
    id: "node-s2",
    mission_id: "mission-stack",
    type: "web-signal",
    title: "Payment retries aren't idempotent",
    content: "The checkout retry path re-POSTs to /charge without an idempotency key. Under network timeouts this can double-charge; Stripe supports idempotency keys but the client doesn't send one. Reproduced on staging.",
    confidence: 0.86, own_score: 0.86,
    source: "Code review · /src/checkout/charge.ts",
    source_url: "https://github.com/acme/checkout",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true,
    grounded: true,
    render_kind: "list",
    data: { items: [
      "Retry re-POSTs /charge with no idempotency key",
      "Risk: double-charge on timeout",
      "Fix: pass Stripe Idempotency-Key per attempt",
    ] },
    created_at: new Date(Date.now() - 3600000 * 5.6).toISOString()
  },
  {
    id: "node-s3",
    mission_id: "mission-stack",
    type: "web-signal",
    title: "Live key in the client bundle",
    content: "A Stripe restricted key and an analytics secret are inlined into the client JS bundle via VITE_ env vars. They ship to every browser. Should be moved server-side and rotated.",
    confidence: 0.88, own_score: 0.88,
    source: "Bundle scan · dist/assets/index.js",
    source_url: null,
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true,
    grounded: true,
    render_kind: "list",
    data: { items: [
      "Restricted key + analytics secret in client bundle",
      "Exposed to every browser session",
      "Fix: proxy server-side, rotate keys",
    ] },
    created_at: new Date(Date.now() - 3600000 * 5.4).toISOString()
  },
  {
    id: "node-s4",
    mission_id: "mission-stack",
    type: "web-signal",
    title: "Checkout performance budget blown",
    content: "Field data: checkout route loads a 1.8 MB JS bundle, time-to-interactive 4.2s on mid-tier mobile, LCP 3.1s. The pricing table blocks render on a synchronous fetch. Cart-abandon correlates with the slow first paint.",
    confidence: 0.84, own_score: 0.84,
    source: "RUM · checkout.acme.com",
    source_url: "https://checkout.acme.com",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true,
    grounded: true,
    render_kind: "metrics",
    data: { items: [
      { label: "Bundle", value: "1.8 MB" },
      { label: "TTI", value: "4.2 s" },
      { label: "LCP", value: "3.1 s" },
      { label: "Blocking fetch", value: "Yes" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 5.2).toISOString()
  },
  {
    id: "node-s-matrix",
    mission_id: "mission-stack",
    type: "synthesis",
    title: "Today vs target architecture",
    content: "What the audit found versus where the stack should be to ship a reliable, fast, multi-region checkout.",
    confidence: 0.9, own_score: 0.9,
    source: "Synthesist",
    source_url: null,
    version: 1, provenance: ["node-s1", "node-s2", "node-s3", "node-s4"], flagged_by: null,
    corroboration: 4, verified: true,
    render_kind: "matrix",
    data: {
      columns: ["Today", "Target"],
      rows: [
        { label: "Payment retries", values: ["Non-idempotent", "Idempotency keys"] },
        { label: "Secrets", values: ["In client bundle", "Server-side, rotated"] },
        { label: "Checkout TTI", values: ["4.2 s", "< 2.0 s"] },
        { label: "Regions", values: ["1 (Azure)", "2 + failover"] },
      ],
      highlight: 1,
    },
    created_at: new Date(Date.now() - 3600000 * 5.0).toISOString()
  },
  {
    id: "node-s5",
    mission_id: "mission-stack",
    type: "synthesis",
    title: "Top 3 to build next",
    content: "Ranked by risk-reduction-per-effort: idempotent payments first (correctness + money), then move secrets server-side (security), then split the checkout bundle and lazy-load the pricing table (conversion).",
    confidence: 0.92, own_score: 0.92,
    source: "Synthesist",
    source_url: null,
    version: 1, provenance: ["node-s-matrix"], flagged_by: null,
    corroboration: 4, verified: true,
    render_kind: "list",
    data: { items: [
      "Idempotent payment retries (correctness)",
      "Move secrets server-side + rotate (security)",
      "Code-split checkout, lazy pricing table (speed)",
    ] },
    created_at: new Date(Date.now() - 3600000 * 4.8).toISOString()
  }
];

const SEEDED_EDGES: WeaveEdge[] = [
  // ── PAYMENTS: the conflict thread + the comparison thread ──
  { id: "edge-p1", mission_id: "mission-payments", source: "node-p2", target: "node-p-conflict", relation: "source-of", label: "public ₹0 pledge", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 1.2).toISOString() },
  { id: "edge-p2", mission_id: "mission-payments", source: "node-p3", target: "node-p-conflict", relation: "contradicts", label: "₹500 clause", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 1.2).toISOString() },
  { id: "edge-p3", mission_id: "mission-payments", source: "node-p4", target: "node-p-conflict", relation: "correction-applied", label: "resolved: waived", created_by: "human", created_at: new Date(Date.now() - 3600000 * 0.5).toISOString() },
  { id: "edge-p4", mission_id: "mission-payments", source: "node-p1", target: "node-p-matrix", relation: "supports", label: "Razorpay", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 1.0).toISOString() },
  { id: "edge-p5", mission_id: "mission-payments", source: "node-p2", target: "node-p-matrix", relation: "supports", label: "Cashfree", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 1.0).toISOString() },
  { id: "edge-p6", mission_id: "mission-payments", source: "node-p5", target: "node-p-matrix", relation: "supports", label: "AI routing", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 1.0).toISOString() },
  { id: "edge-p7", mission_id: "mission-payments", source: "node-p6", target: "node-p-matrix", relation: "supports", label: "PayU", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 1.0).toISOString() },
  { id: "edge-p8", mission_id: "mission-payments", source: "node-p-matrix", target: "node-p7", relation: "weaved", label: "read-out", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 0.9).toISOString() },

  // ── BATTERY: three signals → comparison → read ──
  { id: "edge-b1", mission_id: "mission-battery", source: "node-b1", target: "node-b-matrix", relation: "supports", label: "QuantumScape", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 14).toISOString() },
  { id: "edge-b2", mission_id: "mission-battery", source: "node-b2", target: "node-b-matrix", relation: "supports", label: "Solid Power", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 14).toISOString() },
  { id: "edge-b3", mission_id: "mission-battery", source: "node-b3", target: "node-b-matrix", relation: "supports", label: "Factorial", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 14).toISOString() },
  { id: "edge-b4", mission_id: "mission-battery", source: "node-b-matrix", target: "node-b4", relation: "weaved", label: "read-out", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 13).toISOString() },

  // ── STACK: four findings → today/target → build shortlist ──
  { id: "edge-s1", mission_id: "mission-stack", source: "node-s1", target: "node-s-matrix", relation: "supports", label: "stack", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 5.0).toISOString() },
  { id: "edge-s2", mission_id: "mission-stack", source: "node-s2", target: "node-s-matrix", relation: "supports", label: "reliability", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 5.0).toISOString() },
  { id: "edge-s3", mission_id: "mission-stack", source: "node-s3", target: "node-s-matrix", relation: "supports", label: "security", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 5.0).toISOString() },
  { id: "edge-s4", mission_id: "mission-stack", source: "node-s4", target: "node-s-matrix", relation: "supports", label: "speed", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 5.0).toISOString() },
  { id: "edge-s5", mission_id: "mission-stack", source: "node-s-matrix", target: "node-s5", relation: "weaved", label: "shortlist", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 4.8).toISOString() }
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
      body: "Stand up a daily watch on Cashfree's developer terms (Clause 4.2). Alert me if the ₹500/mo Smart Routing fee, or its waiver wording, changes — the public ‘₹0 maintenance’ pledge already conflicts with the fine print once."
    },
    rationale: "The swarm surfaced a live conflict between Cashfree's public pricing and its developer terms; the waiver is conditional, so the clause is worth watching continuously.",
    provenance: ["node-p3", "node-p-conflict"],
    status: "proposed"
  },
  {
    id: "action-p3",
    mission_id: "mission-payments",
    kind: "deep-dive",
    title: "Deep-dive PayU's AI fraud-scoring beta",
    payload: {
      seed: "Track PayU's private AI fraud-scoring beta and any published success-rate uplift, and how it compares to Razorpay's AI Optimizer (−22% failures)",
      body: "Spawn a focused child mission on PayU's AI roadmap: the private fraud-scoring beta, any measured success-rate uplift, and rollout timing — the one column where PayU's data is still thin in the comparison."
    },
    rationale: "PayU is fully in the three-way comparison except on measured AI uplift; a scoped deep-dive closes the last data gap.",
    provenance: ["node-p6", "node-p-matrix"],
    status: "proposed"
  },
  {
    id: "action-p4",
    mission_id: "mission-payments",
    kind: "decision",
    title: "Lock the verified ₹0-maintenance waiver into the MSA",
    payload: {
      body: "Decision: before signing, cite the verified correction — Cashfree's ₹500/mo Smart Routing fee is waived in perpetuity for merchants onboarding before June 2026. Get the waiver written into the MSA, not left to policy."
    },
    rationale: "The conflict resolved to a verified, in-writing waiver; turning it into a contract clause converts the finding into a protected commercial term.",
    provenance: ["node-p4", "node-p-conflict"],
    status: "proposed"
  },

  // --- Mission BATTERY Actions ---
  {
    id: "action-b1",
    mission_id: "mission-battery",
    kind: "decision",
    title: "Re-weight capital from Solid Power toward Factorial Energy",
    payload: {
      body: "Decision: shift Solid Power's allocation out 3–4 quarters and redirect surplus to Factorial Energy. Solid Power's bottleneck is single-sourced and unverified; Factorial holds the only TÜV SÜD-certified 391 Wh/kg figure plus OEM deals."
    },
    rationale: "Factorial is the verified leader and Solid Power's risk is unconfirmed; re-routing toward certified maturity de-risks the timeline.",
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
  },

  // --- Mission STACK Actions ---
  {
    id: "action-s1",
    mission_id: "mission-stack",
    kind: "decision",
    title: "Ship idempotent payment retries this sprint",
    payload: {
      body: "Decision: make the /charge retry path idempotent before anything else. Generate a per-attempt key client-side, pass Stripe's Idempotency-Key header, and add a regression test that replays a timed-out charge. This is correctness + money, not polish."
    },
    rationale: "The retry double-charge is the only finding that can cost real money on every timeout; it ranks first on risk-reduction-per-effort.",
    provenance: ["node-s2", "node-s5"],
    status: "proposed"
  },
  {
    id: "action-s2",
    mission_id: "mission-stack",
    kind: "reminder",
    title: "Rotate the exposed keys today",
    payload: {
      deadline: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      body: "The restricted Stripe key and analytics secret are in the client bundle. Rotate both today, move the calls behind a server proxy, and add a CI check that fails the build if a secret name reaches dist/."
    },
    rationale: "Exposed secrets are live in every shipped bundle; rotation is time-sensitive and cheap.",
    provenance: ["node-s3"],
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
    sender: "Fact-checker",
    message: "Conflict surfaced: Cashfree's public ‘₹0 maintenance’ pledge doesn't match Clause 4.2's ₹500/mo Smart Routing fee. Flagged for review.",
    level: "warn"
  },
  {
    id: "event-6",
    mission_id: "mission-payments",
    timestamp: new Date(Date.now() - 3600000 * 0.5).toISOString(),
    sender: "Synthesist",
    message: "Conflict resolved: verified against the merchant dashboard — the fee exists but is waived in writing for pre-June-2026 onboarding.",
    level: "success"
  }
];

// The org tools NebulaX can connect to and pull working context from. Connecting
// one is simulated for the demo: it flips to "connected" and surfaces detected
// context that feeds the analysis and gives build tasks somewhere to land.
const SEEDED_CONNECTORS: Connector[] = [
  { id: "github", name: "GitHub", category: "Code", icon: "Github", status: "connected", summary: "Repos, pull requests, issues and CI status.", detected: ["acme/checkout · 38 open issues", "No idempotency key in /charge", "Secret name found in dist bundle"] },
  { id: "azure", name: "Azure", category: "Cloud", icon: "Cloud", status: "available", summary: "App Service, regions, cost and alerts.", detected: ["1 region (Central India)", "No failover slot", "P95 latency 480ms"] },
  { id: "jira", name: "Jira", category: "Tracking", icon: "SquareKanban", status: "available", summary: "Backlog, sprints, and one-click issue creation.", detected: ["Sprint 24 · 12 in progress", "No security epic", "3 stale 'checkout' bugs"] },
  { id: "figma", name: "Figma", category: "Design", icon: "PenTool", status: "available", summary: "Designs, prototypes and design tokens.", detected: ["Checkout v2 frames", "Token set: Acme/Light", "2 prototypes linked"] },
  { id: "slack", name: "Slack", category: "Comms", icon: "MessageSquare", status: "available", summary: "Channels, alerts and approval routing.", detected: ["#payments · 4 alerts today", "Routes approvals to @leads", "Incident webhook live"] },
];

// Pre-built "what to build next" plans for the seeded workspaces. Each turns the
// verified findings into gaps → a prototype → ranked, connector-routed tasks.
const BUILD_PLANS: Record<string, Omit<BuildPlan, "connectors">> = {
  "mission-payments": {
    mission_id: "mission-payments",
    headline: "Build a smart-rail router that picks the cheapest verified gateway per transaction",
    rationale: "The verified comparison shows no single gateway wins everywhere — Razorpay leads on AI routing economics, Cashfree on instant settlement, PayU in between. A thin routing layer captures the best of each instead of locking to one.",
    gaps: [
      { id: "g-p1", title: "Locked to a single gateway", detail: "All checkout traffic goes to one rail, so you pay its MDR even when another rail is cheaper or settles faster for that transaction.", severity: "high", area: "Architecture" },
      { id: "g-p2", title: "Fee waiver lives in an email, not in code", detail: "Cashfree's ₹0-maintenance waiver is verified but not enforced anywhere — a billing change could silently start charging ₹500/mo.", severity: "medium", area: "Contracts" },
      { id: "g-p3", title: "No measured AI uplift for 2 of 3 rails", detail: "Only Razorpay publishes a success-rate uplift (−22%). PayU and Cashfree are unmeasured, so routing rules can't weigh them fairly yet.", severity: "low", area: "Data" },
    ],
    prototype: {
      name: "Smart Rail Router",
      summary: "A routing layer that scores each gateway per transaction on live MDR, settlement and success rate, then sends the charge to the winner — with a cost simulator built from the verified comparison matrix.",
      stack: ["React", "Node / Express", "Razorpay + Cashfree + PayU SDKs", "Postgres", "Redis (rate cache)"],
      screens: [
        { name: "Rail comparison", purpose: "Live MDR, fees, settlement and AI uplift side-by-side (from the verified matrix)." },
        { name: "Routing rules", purpose: "Per-segment rules: volume band, card type, settlement need." },
        { name: "Cost simulator", purpose: "Replay last month's transactions to project savings per routing policy." },
      ],
    },
    tasks: [
      { id: "t-p1", title: "Integrate Razorpay AI Optimizer behind a flag", detail: "Wire the predictive-routing endpoint, measure the −22% claim on your own traffic before defaulting to it.", effort: "M", connector: "github" },
      { id: "t-p2", title: "Build the cost simulator from the matrix", detail: "Feed the verified MDR/settlement rows into a replay over historical charges.", effort: "M", connector: "github" },
      { id: "t-p3", title: "Encode the Cashfree fee waiver as a guard", detail: "Assert ₹0 maintenance on every invoice import; alert if a ₹500 line appears.", effort: "S", connector: "jira" },
      { id: "t-p4", title: "Route MDR-change alerts to #payments", detail: "Hook the standing watch on Cashfree's terms into Slack.", effort: "S", connector: "slack" },
    ],
  },
  "mission-battery": {
    mission_id: "mission-battery",
    headline: "Build a diligence board that tracks verified solid-state milestones, not press claims",
    rationale: "Factorial is the only contender with a certified density figure and OEM deals; QuantumScape has the cycle-life evidence; Solid Power's risk is single-sourced. A board that only counts verified milestones keeps the thesis honest.",
    gaps: [
      { id: "g-b1", title: "Cycle-life undisclosed for 2 of 3", detail: "Only QuantumScape publishes retention-after-cycles. Factorial and Solid Power are blank, so maturity can't be compared on durability.", severity: "medium", area: "Data" },
      { id: "g-b2", title: "Solid Power's blocker is unverified", detail: "The bottleneck claim is single-source — it shouldn't drive allocation until corroborated.", severity: "high", area: "Verification" },
      { id: "g-b3", title: "No funding-runway tracker", detail: "Runway is the real clock on a deep-tech bet; it isn't being tracked against milestone burn.", severity: "low", area: "Risk" },
    ],
    prototype: {
      name: "Solid-State Diligence Board",
      summary: "A board that ingests filings, certifications and OEM disclosures, scores each contender only on verified milestones, and flags single-source claims so they never silently become facts.",
      stack: ["React", "Node", "Postgres", "Recharts", "Scheduled ingestion jobs"],
      screens: [
        { name: "Contender matrix", purpose: "Verified density, cycle life, readiness and validation per company." },
        { name: "Milestone timeline", purpose: "Filing- and cert-backed events, single-source items visibly marked." },
        { name: "Runway tracker", purpose: "Cash runway vs milestone burn, with alerts on dilution events." },
      ],
    },
    tasks: [
      { id: "t-b1", title: "Ingest QuantumScape SEC + earnings", detail: "Scheduled pull of filings; extract cells/layer, retention, runway.", effort: "M", connector: "azure" },
      { id: "t-b2", title: "Add a certification verification source", detail: "Cross-check density claims against TÜV/UL registries before they count.", effort: "S", connector: "github" },
      { id: "t-b3", title: "Track OEM-deal disclosures", detail: "Watch for new joint-development announcements per contender.", effort: "S", connector: "jira" },
      { id: "t-b4", title: "Alert on new cycle-life data", detail: "Notify when any contender first publishes retention-after-cycles.", effort: "S", connector: "slack" },
    ],
  },
  "mission-stack": {
    mission_id: "mission-stack",
    headline: "Ship idempotent, secure, fast checkout — three builds, ranked by risk-reduction-per-effort",
    rationale: "The audit found two correctness/security issues that can cost money or leak secrets, plus a speed problem hurting conversion. Fixing them in that order buys down the most risk for the least work before any new feature.",
    gaps: [
      { id: "g-s1", title: "Payment retries aren't idempotent", detail: "The /charge retry re-POSTs with no idempotency key, so a network timeout can double-charge a customer. Reproduced on staging.", severity: "high", area: "Reliability" },
      { id: "g-s2", title: "Live keys in the client bundle", detail: "A restricted Stripe key and an analytics secret ship in the browser JS — exposed to every session.", severity: "high", area: "Security" },
      { id: "g-s3", title: "Checkout is slow (4.2s TTI)", detail: "A 1.8 MB bundle and a render-blocking pricing fetch push time-to-interactive to 4.2s on mobile, correlating with cart abandonment.", severity: "medium", area: "Performance" },
      { id: "g-s4", title: "Single region, no failover", detail: "All traffic runs from one Azure region with no failover slot — an outage takes checkout fully down.", severity: "medium", area: "Resilience" },
    ],
    prototype: {
      name: "Checkout 2.0",
      summary: "A hardened checkout: idempotent charges, secrets behind a server proxy, a code-split bundle that loads under 2s, and a warm second region for failover.",
      stack: ["React 18", "Node 18 / Express", "Stripe", "Azure (2 regions)", "Postgres 14"],
      screens: [
        { name: "Idempotent charge flow", purpose: "Per-attempt key, safe retries, replay-timeout regression test." },
        { name: "Secrets proxy", purpose: "Server-side token exchange; nothing secret reaches the browser." },
        { name: "Code-split checkout", purpose: "Lazy-loaded pricing table, TTI under 2s on mid-tier mobile." },
        { name: "Region failover", purpose: "Warm standby in a second region with health-based cutover." },
      ],
    },
    tasks: [
      { id: "t-s1", title: "Add Stripe Idempotency-Key to the retry path", detail: "Generate a per-attempt key client-side; add a test that replays a timed-out charge and asserts a single capture.", effort: "M", connector: "github" },
      { id: "t-s2", title: "Move secrets server-side + rotate", detail: "Proxy the calls, rotate both keys, and add a CI check that fails if a secret name reaches dist/.", effort: "M", connector: "github" },
      { id: "t-s3", title: "Code-split checkout, lazy pricing table", detail: "Split the 1.8 MB bundle and defer the pricing fetch to hit <2s TTI.", effort: "M", connector: "github" },
      { id: "t-s4", title: "Stand up a second Azure region + failover", detail: "Warm standby slot with health-based cutover.", effort: "L", connector: "azure" },
      { id: "t-s5", title: "File the above as a hardening sprint", detail: "Create the epic and stories with the findings attached.", effort: "S", connector: "jira" },
    ],
  },
};

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
    media: [],
    connectors: [...SEEDED_CONNECTORS]
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
        if (!this.state.connectors || this.state.connectors.length === 0) this.state.connectors = [...SEEDED_CONNECTORS];
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
          media: [],
          connectors: [...SEEDED_CONNECTORS]
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
        media: [],
        connectors: [...SEEDED_CONNECTORS]
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

  // ─── Connectors (org tools NebulaX plugs into) ─────────────────────────────
  public getConnectors(): Connector[] {
    if (!this.state.connectors || this.state.connectors.length === 0) this.state.connectors = [...SEEDED_CONNECTORS];
    return this.state.connectors;
  }

  public setConnectorStatus(id: string, status: Connector["status"]): Connector | undefined {
    const c = this.getConnectors().find(x => x.id === id);
    if (c) { c.status = status; this.save(); }
    return c;
  }

  // ─── Build plan (Analyze → Prototype → Build) ──────────────────────────────
  // Returns the "what to build next" plan for a mission: seeded for the demo
  // workspaces, derived from the live fabric for everything else.
  public getBuildPlan(missionId: string): BuildPlan {
    const connectors = this.getConnectors();
    const seeded = BUILD_PLANS[missionId];
    if (seeded) return { ...seeded, connectors };

    // ── Dynamic fallback: build a plan from the real woven fabric ──
    const mission = this.getMission(missionId);
    const nodes = this.getNodes(missionId);
    const actions = this.getActions(missionId);
    const signals = nodes.filter(n => n.type === "web-signal");
    const syntheses = nodes.filter(n => n.type === "synthesis" && !n.conflict && n.flagged_by !== "sentinel");
    const conflicts = nodes.filter(n => n.conflict || n.flagged_by === "sentinel");
    const unverified = signals.filter(n => n.verified === false);
    const topSynth = syntheses[0];

    const gaps: BuildGap[] = [];
    conflicts.slice(0, 2).forEach((c, i) => gaps.push({
      id: `g-dyn-c${i}`, title: c.title, detail: c.content.slice(0, 180),
      severity: "high", area: "Verification",
    }));
    unverified.slice(0, 2).forEach((n, i) => gaps.push({
      id: `g-dyn-u${i}`, title: `Single-source: ${n.title}`, detail: `${n.content.slice(0, 150)} — corroborate before relying on it.`,
      severity: "medium", area: "Data",
    }));
    if (gaps.length === 0 && topSynth) gaps.push({
      id: "g-dyn-0", title: "Turn the lead insight into a build", detail: topSynth.content.slice(0, 180),
      severity: "low", area: "Opportunity",
    });

    const tasks: BuildTask[] = actions.slice(0, 4).map((a, i) => ({
      id: `t-dyn-${i}`, title: a.title, detail: (a.payload?.body || a.rationale || "").slice(0, 160),
      effort: (i === 0 ? "M" : "S") as BuildTask["effort"],
      connector: ["github", "jira", "slack", "azure"][i % 4],
    }));

    return {
      mission_id: missionId,
      headline: topSynth ? `Build on the verified read: ${topSynth.title}` : `Stand up a tracker for "${mission?.prompt || "this mission"}"`,
      rationale: topSynth?.content?.slice(0, 200) || "Turn the strongest verified findings into a prototype and a short, ranked build list.",
      gaps,
      prototype: {
        name: `${(mission?.prompt || "Insight").split(" ").slice(0, 3).join(" ")} workspace`,
        summary: "A focused tool that operationalizes this mission's verified findings: track the metrics that matter, alert on changes, and route follow-ups to the team's tools.",
        stack: ["React", "Node", "Postgres", "Scheduled ingestion"],
        screens: [
          { name: "Findings dashboard", purpose: "The verified metrics and comparisons from this mission, live." },
          { name: "Change alerts", purpose: "Notify when a tracked figure or source moves." },
          { name: "Action queue", purpose: "Proposed next moves, routed to the right connected tool." },
        ],
      },
      tasks: tasks.length ? tasks : [
        { id: "t-dyn-0", title: "Re-sense to refresh the fabric", detail: "Run another sensing pass so the build plan reflects the latest sources.", effort: "S", connector: "github" },
      ],
      connectors,
    };
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
        summary: "Across Razorpay, Cashfree and PayU, no single gateway wins everywhere. Razorpay leads on high-volume routing economics and is the only one with a measured AI uplift; Cashfree is cheapest to start and settles instantly once its hidden Smart-Routing fee is waived in writing; PayU sits in between with the slowest settlement.",
        sentences: [
          {
            id: "s1",
            text: "Razorpay's custom enterprise tier settles at 1.80% (1.95% standard band) plus a 0.05% AI fee, the lowest effective rate for high volume.",
            provenance: ["node-p1", "node-p-matrix"]
          },
          {
            id: "s2",
            text: "Cashfree advertises a flat 1.90% with ₹0 setup and ₹0 maintenance, plus instant settlement.",
            provenance: ["node-p2"]
          },
          {
            id: "s3",
            text: "But Clause 4.2 of Cashfree's developer terms adds a ₹500/month Smart-Routing fee — a direct conflict with the public ₹0 pledge.",
            provenance: ["node-p3", "node-p-conflict"]
          },
          {
            id: "s4",
            text: "Verified against the merchant dashboard, that fee is waived in writing for merchants onboarding before June 2026 — resolving the conflict in your favour.",
            provenance: ["node-p4"]
          },
          {
            id: "s5",
            text: "Razorpay's AI Optimizer is the only routing engine with a measured result: a 22% drop in charge failures versus static routing.",
            provenance: ["node-p5", "node-p-matrix"]
          }
        ],
        recommendations: [
          "Use Razorpay's 1.80% custom slab as the benchmark when negotiating high-volume rates.",
          "Get Cashfree's ₹0-maintenance waiver written into the MSA, not left to policy.",
          "Pilot Razorpay AI Optimizer behind a flag and verify the −22% claim on your own traffic."
        ]
      };
    } else if (missionId === "mission-battery") {
      return {
        summary: "On verified evidence, Factorial leads: it holds the only independently certified density figure (391 Wh/kg, TÜV SÜD) plus OEM development deals. QuantumScape has the strongest cycle-life data and is shipping A0 cells. Solid Power's bottleneck is single-sourced — a watch item, not a thesis driver.",
        sentences: [
          {
            id: "sb1",
            text: "QuantumScape shipped 24-layer A0 cells holding 95% capacity after 800 cycles, with cash runway reported into 2028.",
            provenance: ["node-b1", "node-b-matrix"]
          },
          {
            id: "sb2",
            text: "Factorial's 40Ah pouch cells are TÜV SÜD-certified at 391 Wh/kg with zero thermal runaway — the only certified density figure in the set.",
            provenance: ["node-b3", "node-b-matrix"]
          },
          {
            id: "sb3",
            text: "Solid Power's reported ~15/week output bottleneck is single-sourced and unverified, so it shouldn't drive allocation yet.",
            provenance: ["node-b2", "node-b4"]
          }
        ],
        recommendations: [
          "Weight toward Factorial on verified maturity; keep QuantumScape for its cycle-life evidence.",
          "Hold on Solid Power until the manufacturing bottleneck is corroborated by a second source.",
          "Track cycle-life disclosures — the one durability metric still missing for two of three."
        ]
      };
    } else if (missionId === "mission-stack") {
      return {
        summary: "Acme Checkout's audit surfaced two issues that can cost money or leak secrets, plus a speed problem hurting conversion. Fix order by risk-reduction-per-effort: idempotent payments, then server-side secrets, then a faster checkout — before any new feature.",
        sentences: [
          {
            id: "ss1",
            text: "The /charge retry path re-POSTs with no idempotency key, so a network timeout can double-charge a customer (reproduced on staging).",
            provenance: ["node-s2", "node-s5"]
          },
          {
            id: "ss2",
            text: "A restricted Stripe key and an analytics secret ship inside the client JS bundle, exposed to every browser session.",
            provenance: ["node-s3"]
          },
          {
            id: "ss3",
            text: "Checkout loads a 1.8 MB bundle with a render-blocking pricing fetch, pushing time-to-interactive to 4.2s on mobile.",
            provenance: ["node-s4", "node-s-matrix"]
          }
        ],
        recommendations: [
          "Ship idempotent payment retries this sprint with a replay-timeout regression test.",
          "Rotate the exposed keys today and move the calls behind a server proxy.",
          "Code-split checkout and lazy-load the pricing table to hit sub-2s TTI."
        ]
      };
    } else {
      // ── Dynamic brief generated from the REAL woven nodes ──
      const defaultNodes = nodes || [];
      const actions = this.getActions(missionId);
      const signals = defaultNodes.filter(n => n.type === "web-signal");
      const syntheses = defaultNodes.filter(n => n.type === "synthesis" && !n.conflict && n.flagged_by !== "sentinel");
      const conflicts = defaultNodes.filter(n => n.conflict || n.flagged_by === "sentinel");
      const corrections = defaultNodes.filter(n => n.type === "correction");
      const grounded = signals.filter(n => n.grounded === true).length;
      const verifiedCount = signals.filter(n => n.verified !== false).length;
      const topSynth = syntheses[0];

      // Summary: lead with the strongest synthesis, else a real, specific recap.
      let summary: string;
      if (topSynth) {
        summary = topSynth.content;
      } else if (signals.length) {
        summary =
          `The swarm wove ${signals.length} finding${signals.length !== 1 ? "s" : ""}` +
          (grounded ? ` (${grounded} live-fetched from real sources)` : "") +
          ` for "${mission?.prompt || "this mission"}" — ${verifiedCount} cross-checked across sources.` +
          (conflicts.length ? ` ${conflicts.length} open conflict${conflicts.length !== 1 ? "s" : ""} surfaced for review.` : "") +
          (corrections.length ? ` ${corrections.length} resolved by a human correction.` : "");
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
      if (conflicts.length) recommendations.push(`Resolve ${conflicts.length} open conflict${conflicts.length !== 1 ? "s" : ""} with a quick verification so the read is trustworthy.`);
      const needsReview = signals.filter(s => s.verified === false);
      if (needsReview.length) recommendations.push(`Corroborate ${needsReview.length} single-source finding${needsReview.length !== 1 ? "s" : ""} before relying on them.`);
      if (actions.length) recommendations.push(`Review ${actions.length} proposed action${actions.length !== 1 ? "s" : ""} drafted by the Assistant.`);
      if (!recommendations.length) recommendations.push("Pin the highest-value findings and re-sense later to track how they change over time.");

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
