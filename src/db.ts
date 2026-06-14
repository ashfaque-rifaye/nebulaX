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
  seedVersion?: number;
}

// Pre-seeded, demo-ready workspaces. Every finding carries the REAL data it
// describes (metrics / side-by-side comparisons), a binary verified badge and a
// source count — no opaque confidence percentages.
// Bump this whenever the seeded workspaces change so existing installs replace
// their old demo data instead of keeping stale missions around.
export const SEED_VERSION = 4;

// Every mission id we have ever seeded — used to purge old demo workspaces on a
// version bump while leaving user-created missions untouched.
export const ALL_SEED_MISSION_IDS = [
  "mission-payments", "mission-battery", "mission-uber",   // legacy
  "mission-fintech", "mission-teardown", "mission-stack",  // current
];

// Category palette lives in a client-safe module; re-export for server callers.
export { CATEGORY_META } from "./categories.ts";

const SEEDED_MISSIONS: Mission[] = [
  {
    id: "mission-fintech",
    prompt: "Compare Razorpay, Cashfree and PayU for our checkout — pricing, product, settlement and contract terms.",
    persona: "Founder / Product Executive",
    targets: ["razorpay.com", "cashfree.com", "payu.in"],
    status: "ready",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "mission-teardown",
    prompt: "Map Vercel's moves across finance, product, marketing and hiring.",
    persona: "Competitive Strategist",
    targets: ["vercel.com", "vercel.com/blog", "vercel.com/careers"],
    status: "ready",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 20).toISOString()
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
  // ─────────────────── Mission FINTECH — Razorpay vs Cashfree vs PayU ───────────────────
  {
    id: "node-f1",
    mission_id: "mission-fintech",
    type: "web-signal",
    title: "Razorpay enterprise pricing",
    content: "Razorpay's enterprise tier is volume-banded: ₹10L–₹50L/month settles at 1.95%, while custom high-volume accounts with AI checkout acceleration are quoted 1.80% API routing + a 0.05% optimization fee.",
    confidence: 0.9, own_score: 0.9,
    source: "razorpay.com/pricing",
    source_url: "https://razorpay.com/pricing",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 3, verified: true, grounded: true,
    category: "Pricing",
    render_kind: "metrics",
    data: { items: [
      { label: "MDR (custom)", value: "1.80%" },
      { label: "Standard band", value: "1.95%" },
      { label: "AI fee", value: "+0.05%" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 1.9).toISOString()
  },
  {
    id: "node-f2",
    mission_id: "mission-fintech",
    type: "web-signal",
    title: "Cashfree public pricing",
    content: "Cashfree's landing page advertises ₹0 setup, ₹0 annual maintenance, and a flat 1.90% per transaction with instant settlement on the Growth plan.",
    confidence: 0.95, own_score: 0.95,
    source: "cashfree.com/pricing",
    source_url: "https://cashfree.com/pricing",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true, grounded: true,
    category: "Pricing",
    render_kind: "metrics",
    data: { items: [
      { label: "Flat MDR", value: "1.90%" },
      { label: "Setup fee", value: "₹0" },
      { label: "Maintenance", value: "₹0" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 1.8).toISOString()
  },
  {
    id: "node-f3",
    mission_id: "mission-fintech",
    type: "web-signal",
    title: "Cashfree developer terms, Clause 4.2",
    content: "Buried in the developer integration terms: a ₹500/month platform servicing fee applies to every active API endpoint using the Smart Routing engine, waived only for merchants processing above ₹15L/month.",
    confidence: 0.92, own_score: 0.92,
    source: "cashfree.com/terms/developer",
    source_url: "https://cashfree.com/terms/developer",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true, grounded: true,
    category: "Contracts",
    render_kind: "quote",
    data: { quote: "A platform servicing fee of ₹500/month applies to all active API endpoints using the Smart Routing engine, waived only for merchants processing above ₹15L/month.", attribution: "Developer Terms, Clause 4.2" },
    created_at: new Date(Date.now() - 3600000 * 1.7).toISOString()
  },
  {
    id: "node-f-conflict",
    mission_id: "mission-fintech",
    type: "synthesis",
    title: "Conflict: Cashfree's ₹0 maintenance vs the ₹500 clause",
    content: "Cashfree's public page says ₹0 annual maintenance, but Clause 4.2 of its developer terms charges ₹500/month for Smart Routing endpoints. Both can't be true at face value.",
    confidence: 0.55, own_score: 0.5,
    source: "Conflict Reviewer",
    source_url: null,
    version: 1, provenance: ["node-f2", "node-f3"], flagged_by: "sentinel",
    corroboration: 2, verified: false, conflict: true,
    category: "Contracts",
    render_kind: "text",
    data: {
      field: "Cashfree annual maintenance / platform fee",
      sides: [
        { ref: "node-f2", label: "Cashfree public pricing page", value: "₹0 / year", source: "cashfree.com/pricing" },
        { ref: "node-f3", label: "Developer Terms · Clause 4.2", value: "₹500 / month (Smart Routing)", source: "cashfree.com/terms/developer" },
      ],
      recommendation: {
        verdict: "both-conditional",
        value: "₹500/month for Smart Routing endpoints, waived for merchants above ₹15L/month",
        reasoning: "The marketing page quotes the headline ₹0 maintenance but omits the Smart-Routing platform fee; the developer terms add it with a volume-based waiver. Both are technically true — the fee exists, but is waived at your processing volume.",
      },
    },
    created_at: new Date(Date.now() - 3600000 * 1.2).toISOString()
  },
  {
    id: "node-f4",
    mission_id: "mission-fintech",
    type: "web-signal",
    title: "Razorpay 'AI Optimizer' launch",
    content: "Razorpay shipped 'AI Optimizer', a predictive routing model that picks the gateway with the best real-time success rate per transaction. Razorpay reports it cuts charge failures by 22% versus static routing.",
    confidence: 0.88, own_score: 0.88,
    source: "TechCrunch",
    source_url: "https://techcrunch.com/razorpay-ai-optimizer",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true, grounded: true,
    category: "Product",
    render_kind: "metrics",
    data: { items: [
      { label: "Failure drop", value: "−22%" },
      { label: "Routing", value: "Predictive" },
      { label: "Decision", value: "Real-time" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString()
  },
  {
    id: "node-f5",
    mission_id: "mission-fintech",
    type: "web-signal",
    title: "PayU enterprise pricing & AI",
    content: "PayU quotes 1.85% blended MDR for enterprise, ₹0 setup. Its 'PayU Engine' offers rule-based smart routing but no published success-rate uplift, and AI fraud scoring is in private beta.",
    confidence: 0.84, own_score: 0.84,
    source: "payu.in/pricing",
    source_url: "https://payu.in/pricing",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true, grounded: true,
    category: "Pricing",
    render_kind: "metrics",
    data: { items: [
      { label: "Blended MDR", value: "1.85%" },
      { label: "Setup fee", value: "₹0" },
      { label: "AI routing", value: "Rule-based" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 1.4).toISOString()
  },
  {
    id: "node-f6",
    mission_id: "mission-fintech",
    type: "web-signal",
    title: "Settlement speed compared",
    content: "Settlement timelines differ materially: Razorpay settles T+1 standard (T+0 on request), Cashfree advertises instant settlement on Growth, and PayU is T+2 standard with a paid T+1 add-on.",
    confidence: 0.9, own_score: 0.9,
    source: "Vendor docs · cross-checked",
    source_url: "https://razorpay.com/settlements",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 3, verified: true, grounded: true,
    category: "Settlement",
    render_kind: "metrics",
    data: { items: [
      { label: "Razorpay", value: "T+1 / T+0" },
      { label: "Cashfree", value: "Instant" },
      { label: "PayU", value: "T+2 / T+1" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 1.3).toISOString()
  },
  {
    id: "node-f-matrix",
    mission_id: "mission-fintech",
    type: "synthesis",
    title: "Side-by-side: Razorpay vs Cashfree vs PayU",
    content: "Three-way comparison across the metrics that move an enterprise checkout decision: effective MDR, fixed fees, settlement speed, and AI routing maturity.",
    confidence: 0.92, own_score: 0.92,
    source: "Synthesist",
    source_url: null,
    version: 1, provenance: ["node-f1", "node-f2", "node-f4", "node-f5", "node-f6"], flagged_by: null,
    corroboration: 5, verified: true,
    category: "Pricing",
    render_kind: "matrix",
    data: {
      columns: ["Razorpay", "Cashfree", "PayU"],
      rows: [
        { label: "Effective MDR", values: ["1.80%*", "1.90%", "1.85%"] },
        { label: "Fixed fees", values: ["₹0", "₹500/mo?", "₹0"] },
        { label: "Settlement", values: ["T+1 / T+0", "Instant", "T+2 / T+1"] },
        { label: "AI routing", values: ["Predictive −22%", "Smart Routing", "Rule-based"] },
      ],
      note: "*custom high-volume tier · ?Cashfree fixed fee is under an open conflict — resolve it to lock the value",
      highlight: 0,
    },
    created_at: new Date(Date.now() - 3600000 * 1.0).toISOString()
  },
  {
    id: "node-f7",
    mission_id: "mission-fintech",
    type: "synthesis",
    title: "Where each gateway wins",
    content: "Razorpay leads on high-volume routing economics and the only measured AI uplift (−22% failures). Cashfree is cheapest to start and settles instantly — pending the maintenance-fee conflict. PayU sits in the middle with the slowest settlement.",
    confidence: 0.91, own_score: 0.91,
    source: "Synthesist",
    source_url: null,
    version: 1, provenance: ["node-f-matrix"], flagged_by: null,
    corroboration: 5, verified: true,
    category: "Product",
    render_kind: "list",
    data: { items: [
      "Razorpay — best for high volume + measured AI routing uplift",
      "Cashfree — cheapest start + instant settlement (resolve the fee conflict first)",
      "PayU — middle of the pack, slowest settlement (T+2 default)",
    ] },
    created_at: new Date(Date.now() - 3600000 * 0.9).toISOString()
  },

  // ─────────────────── Mission TEARDOWN — Vercel across finance / product / marketing / hiring ───────────────────
  {
    id: "node-t1",
    mission_id: "mission-teardown",
    type: "web-signal",
    title: "Series E funding & valuation",
    content: "Vercel raised a $250M Series E led by Accel at a $3.25B valuation, citing growth of its Frontend Cloud and AI products. Total raised to date crosses $560M.",
    confidence: 0.92, own_score: 0.92,
    source: "TechCrunch",
    source_url: "https://techcrunch.com/vercel-series-e",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 3, verified: true, grounded: true,
    category: "Finance",
    render_kind: "metrics",
    data: { items: [
      { label: "Round", value: "Series E" },
      { label: "Raised", value: "$250M" },
      { label: "Valuation", value: "$3.25B" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 22).toISOString()
  },
  {
    id: "node-t2",
    mission_id: "mission-teardown",
    type: "web-signal",
    title: "Revenue — trade press estimate",
    content: "The Information reported Vercel at roughly $100M ARR in late 2024, driven by Pro seats and enterprise contracts.",
    confidence: 0.78, own_score: 0.78,
    source: "The Information (2024)",
    source_url: "https://theinformation.com/vercel-arr",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 1, verified: false, grounded: true,
    category: "Finance",
    render_kind: "metrics",
    data: { items: [
      { label: "ARR", value: "~$100M" },
      { label: "As of", value: "late 2024" },
      { label: "Driver", value: "Pro + enterprise" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 21).toISOString()
  },
  {
    id: "node-t3",
    mission_id: "mission-teardown",
    type: "web-signal",
    title: "Revenue — founder interview",
    content: "In a 2025 interview the founder referenced a roughly $200M run-rate, attributing the jump to AI (v0) adoption.",
    confidence: 0.74, own_score: 0.74,
    source: "Podcast interview (2025)",
    source_url: null,
    version: 1, provenance: [], flagged_by: null,
    corroboration: 1, verified: false, grounded: false,
    category: "Finance",
    render_kind: "metrics",
    data: { items: [
      { label: "Run-rate", value: "~$200M" },
      { label: "As of", value: "2025" },
      { label: "Driver", value: "v0 / AI" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 20).toISOString()
  },
  {
    id: "node-t-conflict",
    mission_id: "mission-teardown",
    type: "synthesis",
    title: "Conflict: ARR figures don't match",
    content: "Two finance sources give different revenue: ~$100M ARR (trade press, 2024) vs ~$200M run-rate (interview, 2025). Reconcile before using either in a model.",
    confidence: 0.5, own_score: 0.5,
    source: "Conflict Reviewer",
    source_url: null,
    version: 1, provenance: ["node-t2", "node-t3"], flagged_by: "sentinel",
    corroboration: 2, verified: false, conflict: true,
    category: "Finance",
    render_kind: "text",
    data: {
      field: "Vercel annualized revenue",
      sides: [
        { ref: "node-t2", label: "The Information (2024)", value: "~$100M ARR", source: "theinformation.com" },
        { ref: "node-t3", label: "Founder interview (2025)", value: "~$200M run-rate", source: "podcast (2025)" },
      ],
      recommendation: {
        verdict: "needs-data",
        value: "Record as a range: ~$100M ARR (2024) → ~$200M run-rate (2025) — growth over time, not a contradiction",
        reasoning: "The figures are from different dates and metrics (trailing ARR vs forward run-rate). Both are likely right at their respective times; store as a time-ranged estimate rather than picking one.",
      },
    },
    created_at: new Date(Date.now() - 3600000 * 19).toISOString()
  },
  {
    id: "node-t4",
    mission_id: "mission-teardown",
    type: "web-signal",
    title: "v0 — generative UI product",
    content: "v0 turns prompts into production React/Tailwind. Vercel positions it as the on-ramp from idea to deployed app, tightly bound to the Frontend Cloud.",
    confidence: 0.9, own_score: 0.9,
    source: "vercel.com/blog",
    source_url: "https://vercel.com/blog/v0",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true, grounded: true,
    category: "Product",
    render_kind: "list",
    data: { items: [
      "Prompt → production React + Tailwind",
      "Deploys straight to Vercel",
      "Lead AI product, drives upgrade path",
    ] },
    created_at: new Date(Date.now() - 3600000 * 18).toISOString()
  },
  {
    id: "node-t5",
    mission_id: "mission-teardown",
    type: "web-signal",
    title: "Next.js + AI SDK cadence",
    content: "Vercel ships Next.js and the AI SDK on a fast cadence, keeping the open-source funnel that feeds the paid Frontend Cloud. AI SDK adoption is the current wedge.",
    confidence: 0.88, own_score: 0.88,
    source: "vercel.com/blog",
    source_url: "https://vercel.com/blog",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true, grounded: true,
    category: "Product",
    render_kind: "metrics",
    data: { items: [
      { label: "OSS funnel", value: "Next.js" },
      { label: "AI wedge", value: "AI SDK" },
      { label: "Cadence", value: "Fast" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 17).toISOString()
  },
  {
    id: "node-t6",
    mission_id: "mission-teardown",
    type: "web-signal",
    title: "Positioning: 'Frontend Cloud'",
    content: "Marketing has consolidated around one phrase — 'Frontend Cloud' — reframing hosting as an AI-native developer platform rather than a deploy tool.",
    confidence: 0.86, own_score: 0.86,
    source: "vercel.com",
    source_url: "https://vercel.com",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true, grounded: true,
    category: "Marketing",
    render_kind: "quote",
    data: { quote: "The Frontend Cloud gives developers the frameworks, workflows, and infrastructure to build a faster, more personalized web.", attribution: "Vercel homepage" },
    created_at: new Date(Date.now() - 3600000 * 16).toISOString()
  },
  {
    id: "node-t7",
    mission_id: "mission-teardown",
    type: "web-signal",
    title: "DevRel & 'Ship' campaigns",
    content: "Heavy developer-relations motion: Ship conference, template galleries, and high-volume technical content keep Vercel top-of-funnel with frontend engineers.",
    confidence: 0.83, own_score: 0.83,
    source: "Conf + social",
    source_url: "https://vercel.com/ship",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true, grounded: true,
    category: "Marketing",
    render_kind: "list",
    data: { items: [
      "Ship — annual developer conference",
      "Template & starter galleries",
      "High-volume technical content",
    ] },
    created_at: new Date(Date.now() - 3600000 * 15).toISOString()
  },
  {
    id: "node-t8",
    mission_id: "mission-teardown",
    type: "web-signal",
    title: "Hiring: AI & infra roles surging",
    content: "Careers page is weighted toward AI/ML and infrastructure engineering, with a cluster of v0 and AI-SDK roles — signaling where the next product investment goes.",
    confidence: 0.85, own_score: 0.85,
    source: "vercel.com/careers",
    source_url: "https://vercel.com/careers",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true, grounded: true,
    category: "Hiring",
    render_kind: "metrics",
    data: { items: [
      { label: "Top area", value: "AI / ML" },
      { label: "Cluster", value: "v0 + AI SDK" },
      { label: "Signal", value: "AI doubling-down" },
    ] },
    created_at: new Date(Date.now() - 3600000 * 14).toISOString()
  },
  {
    id: "node-t9",
    mission_id: "mission-teardown",
    type: "web-signal",
    title: "Hiring: enterprise GTM expansion",
    content: "A second hiring cluster is enterprise go-to-market — sales, solutions engineering and support — consistent with the move upmarket the funding round described.",
    confidence: 0.82, own_score: 0.82,
    source: "vercel.com/careers",
    source_url: "https://vercel.com/careers",
    version: 1, provenance: [], flagged_by: null,
    corroboration: 2, verified: true, grounded: true,
    category: "Hiring",
    render_kind: "list",
    data: { items: [
      "Enterprise sales + solutions engineering",
      "Support / success roles",
      "Move upmarket matches the raise",
    ] },
    created_at: new Date(Date.now() - 3600000 * 13).toISOString()
  },
  {
    id: "node-t-synth",
    mission_id: "mission-teardown",
    type: "synthesis",
    title: "Read: AI is the thesis, enterprise is the engine",
    content: "Across categories the story is consistent: a $3.25B raise (finance) funds an AI-first product bet (v0/AI SDK) marketed as the 'Frontend Cloud', with hiring split between AI engineering and enterprise GTM. The one thing to nail down is revenue — the two figures conflict.",
    confidence: 0.9, own_score: 0.9,
    source: "Synthesist",
    source_url: null,
    version: 1, provenance: ["node-t1", "node-t4", "node-t6", "node-t8", "node-t-conflict"], flagged_by: null,
    corroboration: 5, verified: true,
    category: "Product",
    render_kind: "list",
    data: { items: [
      "Finance — $3.25B valuation funds the AI bet",
      "Product — v0 + AI SDK is the wedge",
      "Marketing — 'Frontend Cloud', AI-native repositioning",
      "Hiring — AI engineering + enterprise GTM",
    ] },
    created_at: new Date(Date.now() - 3600000 * 12).toISOString()
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
    category: "Infrastructure",
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
    category: "Reliability",
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
    category: "Security",
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
    category: "Performance",
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
    category: "Infrastructure",
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
    category: "Reliability",
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
  // ── FINTECH: the conflict thread + the comparison thread ──
  { id: "edge-f1", mission_id: "mission-fintech", source: "node-f2", target: "node-f-conflict", relation: "source-of", label: "₹0 pledge", created_by: "Reviewer", created_at: new Date(Date.now() - 3600000 * 1.2).toISOString() },
  { id: "edge-f2", mission_id: "mission-fintech", source: "node-f3", target: "node-f-conflict", relation: "contradicts", label: "₹500 clause", created_by: "Reviewer", created_at: new Date(Date.now() - 3600000 * 1.2).toISOString() },
  { id: "edge-f3", mission_id: "mission-fintech", source: "node-f1", target: "node-f-matrix", relation: "supports", label: "Razorpay", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 1.0).toISOString() },
  { id: "edge-f4", mission_id: "mission-fintech", source: "node-f2", target: "node-f-matrix", relation: "supports", label: "Cashfree", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 1.0).toISOString() },
  { id: "edge-f5", mission_id: "mission-fintech", source: "node-f4", target: "node-f-matrix", relation: "supports", label: "AI routing", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 1.0).toISOString() },
  { id: "edge-f6", mission_id: "mission-fintech", source: "node-f5", target: "node-f-matrix", relation: "supports", label: "PayU", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 1.0).toISOString() },
  { id: "edge-f7", mission_id: "mission-fintech", source: "node-f6", target: "node-f-matrix", relation: "supports", label: "settlement", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 1.0).toISOString() },
  { id: "edge-f8", mission_id: "mission-fintech", source: "node-f-conflict", target: "node-f-matrix", relation: "contradicts", label: "open fee", created_by: "Reviewer", created_at: new Date(Date.now() - 3600000 * 1.0).toISOString() },
  { id: "edge-f9", mission_id: "mission-fintech", source: "node-f-matrix", target: "node-f7", relation: "weaved", label: "read-out", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 0.9).toISOString() },

  // ── TEARDOWN: within-category links + cross-category synthesis ──
  { id: "edge-t1", mission_id: "mission-teardown", source: "node-t2", target: "node-t-conflict", relation: "source-of", label: "ARR 2024", created_by: "Reviewer", created_at: new Date(Date.now() - 3600000 * 19).toISOString() },
  { id: "edge-t2", mission_id: "mission-teardown", source: "node-t3", target: "node-t-conflict", relation: "contradicts", label: "run-rate 2025", created_by: "Reviewer", created_at: new Date(Date.now() - 3600000 * 19).toISOString() },
  { id: "edge-t3", mission_id: "mission-teardown", source: "node-t5", target: "node-t4", relation: "supports", label: "product cadence", created_by: "Mapper", created_at: new Date(Date.now() - 3600000 * 17).toISOString() },
  { id: "edge-t4", mission_id: "mission-teardown", source: "node-t7", target: "node-t6", relation: "supports", label: "devrel", created_by: "Mapper", created_at: new Date(Date.now() - 3600000 * 15).toISOString() },
  { id: "edge-t5", mission_id: "mission-teardown", source: "node-t9", target: "node-t8", relation: "supports", label: "GTM", created_by: "Mapper", created_at: new Date(Date.now() - 3600000 * 13).toISOString() },
  { id: "edge-t6", mission_id: "mission-teardown", source: "node-t1", target: "node-t-synth", relation: "supports", label: "finance", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: "edge-t7", mission_id: "mission-teardown", source: "node-t4", target: "node-t-synth", relation: "supports", label: "product", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: "edge-t8", mission_id: "mission-teardown", source: "node-t6", target: "node-t-synth", relation: "supports", label: "marketing", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: "edge-t9", mission_id: "mission-teardown", source: "node-t8", target: "node-t-synth", relation: "supports", label: "hiring", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: "edge-t10", mission_id: "mission-teardown", source: "node-t-conflict", target: "node-t-synth", relation: "contradicts", label: "revenue caveat", created_by: "Reviewer", created_at: new Date(Date.now() - 3600000 * 12).toISOString() },

  // ── STACK: four findings → today/target → build shortlist ──
  { id: "edge-s1", mission_id: "mission-stack", source: "node-s1", target: "node-s-matrix", relation: "supports", label: "stack", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 5.0).toISOString() },
  { id: "edge-s2", mission_id: "mission-stack", source: "node-s2", target: "node-s-matrix", relation: "supports", label: "reliability", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 5.0).toISOString() },
  { id: "edge-s3", mission_id: "mission-stack", source: "node-s3", target: "node-s-matrix", relation: "supports", label: "security", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 5.0).toISOString() },
  { id: "edge-s4", mission_id: "mission-stack", source: "node-s4", target: "node-s-matrix", relation: "supports", label: "speed", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 5.0).toISOString() },
  { id: "edge-s5", mission_id: "mission-stack", source: "node-s-matrix", target: "node-s5", relation: "weaved", label: "shortlist", created_by: "Synthesist", created_at: new Date(Date.now() - 3600000 * 4.8).toISOString() }
];

const SEEDED_ACTIONS: ProposedAction[] = [
  // --- Mission FINTECH Actions — a varied "next move" set ---
  {
    id: "action-f1",
    mission_id: "mission-fintech",
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
    rationale: "Razorpay's surfaced 1.80% custom tier gives high-volume founders concrete leverage to pitch a flat 1.75–1.82% on equivalent checkouts.",
    provenance: ["node-f1", "node-f7"],
    status: "proposed"
  },
  {
    id: "action-f2",
    mission_id: "mission-fintech",
    kind: "monitor",
    title: "Put Cashfree's developer terms on a standing watch",
    payload: {
      target: "cashfree.com/terms/developer",
      body: "Stand up a daily watch on Cashfree's developer terms (Clause 4.2). Alert me if the ₹500/mo Smart Routing fee, or its waiver wording, changes — the public ‘₹0 maintenance’ pledge already conflicts with the fine print once."
    },
    rationale: "The swarm surfaced a live conflict between Cashfree's public pricing and its developer terms; the waiver is conditional, so the clause is worth watching continuously.",
    provenance: ["node-f3", "node-f-conflict"],
    status: "proposed"
  },
  {
    id: "action-f3",
    mission_id: "mission-fintech",
    kind: "deep-dive",
    title: "Deep-dive PayU's AI fraud-scoring beta",
    payload: {
      seed: "Track PayU's private AI fraud-scoring beta and any published success-rate uplift, and how it compares to Razorpay's AI Optimizer (−22% failures)",
      body: "Spawn a focused child mission on PayU's AI roadmap: the private fraud-scoring beta, any measured success-rate uplift, and rollout timing — the one column where PayU's data is still thin in the comparison."
    },
    rationale: "PayU is fully in the three-way comparison except on measured AI uplift; a scoped deep-dive closes the last data gap.",
    provenance: ["node-f5", "node-f-matrix"],
    status: "proposed"
  },
  {
    id: "action-f4",
    mission_id: "mission-fintech",
    kind: "decision",
    title: "Reconcile the Cashfree fee before signing",
    payload: {
      body: "Decision: resolve the open ₹0-vs-₹500 conflict in the workspace, then write the agreed term into the MSA. The Reviewer's recommendation is that the ₹500/mo Smart-Routing fee is waived above ₹15L/month — confirm with Cashfree and lock it as a contract clause, not a policy."
    },
    rationale: "An unresolved pricing conflict shouldn't go into a contract. Reconcile it first; the resolved value becomes a protected commercial term.",
    provenance: ["node-f-conflict", "node-f3"],
    status: "proposed"
  },

  // --- Mission TEARDOWN Actions ---
  {
    id: "action-t1",
    mission_id: "mission-teardown",
    kind: "decision",
    title: "Underwrite the AI thesis, hedge the revenue",
    payload: {
      body: "Decision: base the view on the AI-product + enterprise-GTM thesis (well-evidenced across product, marketing and hiring), but model revenue as a range until the ARR conflict is reconciled. Don't anchor a number on a single source."
    },
    rationale: "The strategic picture is corroborated across four categories; only revenue is in conflict, so it should be hedged rather than guessed.",
    provenance: ["node-t-synth", "node-t-conflict"],
    status: "proposed"
  },
  {
    id: "action-t2",
    mission_id: "mission-teardown",
    kind: "monitor",
    title: "Watch hiring + v0 launches for the next move",
    payload: {
      target: "vercel.com/careers",
      body: "Stand up a watch on Vercel's careers page and product blog. AI/infra role clusters and v0 launches are the leading indicator of where the next product and revenue push lands."
    },
    rationale: "Hiring and product cadence lead the public narrative; changes there move the competitive read before the press catches up.",
    provenance: ["node-t8", "node-t4"],
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
    mission_id: "mission-fintech",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    sender: "Planner",
    message: "Mission started: comparing Razorpay, Cashfree and PayU across pricing, product, settlement and contracts.",
    level: "info"
  },
  {
    id: "event-2",
    mission_id: "mission-fintech",
    timestamp: new Date(Date.now() - 3600000 * 1.9).toISOString(),
    sender: "Scout",
    message: "Read razorpay.com/pricing — extracted the tiered enterprise pricing.",
    level: "success"
  },
  {
    id: "event-3",
    mission_id: "mission-fintech",
    timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(),
    sender: "Analyst",
    message: "Cashfree pricing parsed: flat 1.90%, ₹0 setup, ₹0 maintenance on the public page.",
    level: "info"
  },
  {
    id: "event-4",
    mission_id: "mission-fintech",
    timestamp: new Date(Date.now() - 3600000 * 1.7).toISOString(),
    sender: "Scout",
    message: "Read the developer terms — found Clause 4.2 with a ₹500/month Smart-Routing fee.",
    level: "warn"
  },
  {
    id: "event-5",
    mission_id: "mission-fintech",
    timestamp: new Date(Date.now() - 3600000 * 1.2).toISOString(),
    sender: "Reviewer",
    message: "Conflict surfaced: Cashfree's public ‘₹0 maintenance’ doesn't match Clause 4.2's ₹500/mo fee. Open the finding to reconcile.",
    level: "warn"
  },
  {
    id: "event-6",
    mission_id: "mission-fintech",
    timestamp: new Date(Date.now() - 3600000 * 1.1).toISOString(),
    sender: "Reviewer",
    message: "Recommendation ready: the fee exists but is waived above ₹15L/month — accept it or set your own value to update memory.",
    level: "info"
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
  "mission-fintech": {
    mission_id: "mission-fintech",
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
  "mission-teardown": {
    mission_id: "mission-teardown",
    headline: "Build a category-mapped competitive tracker that watches a rival across finance, product, marketing and hiring",
    rationale: "The teardown shows the value of one connected view: a $3.25B raise funds an AI-first product bet, marketed as the 'Frontend Cloud', staffed by AI + enterprise hiring. The gap is keeping it live and reconciling conflicting numbers automatically.",
    gaps: [
      { id: "g-t1", title: "Revenue is a single-source guess", detail: "The two ARR figures conflict (~$100M vs ~$200M) and neither is corroborated. Any model built on one is fragile.", severity: "high", area: "Finance" },
      { id: "g-t2", title: "Signals aren't categorized automatically", detail: "Findings arrive flat; mapping them to Finance / Product / Marketing / Hiring is manual today.", severity: "medium", area: "Product" },
      { id: "g-t3", title: "No leading-indicator alerting", detail: "Hiring clusters and product launches lead the narrative, but there's no watch that fires when they move.", severity: "low", area: "Ops" },
    ],
    prototype: {
      name: "Rival Radar",
      summary: "A live competitor board that pulls signals, auto-tags each into a category, draws the cross-category map, reconciles conflicting numbers, and alerts on leading indicators (hiring, launches).",
      stack: ["React", "Node", "Postgres", "Scheduled scrapers", "Embeddings (category tagging)"],
      screens: [
        { name: "Category map", purpose: "Finance / Product / Marketing / Hiring lanes with cross-links to the synthesis." },
        { name: "Conflict queue", purpose: "Numbers that disagree, with an agent-recommended reconciliation to accept or edit." },
        { name: "Signal alerts", purpose: "Fire when hiring clusters or product launches shift — the leading indicators." },
      ],
    },
    tasks: [
      { id: "t-t1", title: "Auto-tag findings into categories", detail: "Classify each signal into Finance/Product/Marketing/Hiring with embeddings; let the user re-tag.", effort: "M", connector: "github" },
      { id: "t-t2", title: "Wire careers + blog scrapers", detail: "Scheduled pulls of careers and product blog; diff against last run.", effort: "M", connector: "azure" },
      { id: "t-t3", title: "Build the conflict reconciliation queue", detail: "Surface disagreeing figures with the agent's recommendation; write resolutions to memory.", effort: "M", connector: "github" },
      { id: "t-t4", title: "Alert on hiring/launch moves", detail: "Notify when a category's leading indicator changes materially.", effort: "S", connector: "slack" },
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
        // One-time refresh: when the seeded workspaces change, drop the old demo
        // missions (and their entire fabric) and reinstall the current set below.
        // User-created missions (ids outside the seed set) are left untouched.
        if (this.state.seedVersion !== SEED_VERSION) {
          const seedSet = new Set(ALL_SEED_MISSION_IDS);
          this.state.missions = (this.state.missions || []).filter(m => !seedSet.has(m.id));
          this.state.nodes = (this.state.nodes || []).filter(n => !seedSet.has(n.mission_id));
          this.state.edges = (this.state.edges || []).filter(e => !seedSet.has(e.mission_id));
          this.state.actions = (this.state.actions || []).filter(a => !seedSet.has(a.mission_id));
          this.state.events = (this.state.events || []).filter(ev => !seedSet.has(ev.mission_id));
          this.state.connectors = [...SEEDED_CONNECTORS];
          this.state.seedVersion = SEED_VERSION;
        }
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
          connectors: [...SEEDED_CONNECTORS],
          seedVersion: SEED_VERSION
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
        connectors: [...SEEDED_CONNECTORS],
        seedVersion: SEED_VERSION
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

  // ─── Conflict reconciliation (the "Reconcile" feature) ─────────────────────
  // Resolve a flagged conflict by recording a canonical value back into the
  // fabric (our living memory). `choice` is "accept" (agent recommendation),
  // "a"/"b" (trust one source), or "custom" (a user-edited value). Writes a
  // correction node, marks the conflict + its sources resolved, and returns both.
  public resolveConflict(
    conflictNodeId: string,
    choice: "accept" | "a" | "b" | "custom",
    customValue?: string,
    by = "human",
  ): { conflict?: WeaveNode; correction?: WeaveNode } {
    const conflict = this.getNode(conflictNodeId);
    if (!conflict || !(conflict.conflict || conflict.flagged_by === "sentinel")) return {};
    const d = (conflict.data && typeof conflict.data === "object") ? conflict.data : {};
    const sides: any[] = Array.isArray(d.sides) ? d.sides : [];
    const rec = d.recommendation || {};

    let value = "";
    let how = "";
    if (choice === "custom" && customValue && customValue.trim()) { value = customValue.trim(); how = "your edited value"; }
    else if (choice === "a" && sides[0]) { value = String(sides[0].value); how = `${sides[0].label}`; }
    else if (choice === "b" && sides[1]) { value = String(sides[1].value); how = `${sides[1].label}`; }
    else { value = String(rec.value || customValue || "Reconciled by the user"); how = "the recommended reconciliation"; }

    const cid = `node-correction-${Math.random().toString(36).substr(2, 6)}`;
    const correction: WeaveNode = {
      id: cid, mission_id: conflict.mission_id, type: "correction",
      title: `Resolved: ${d.field || conflict.title.replace(/^Conflict:\s*/i, "")}`,
      content: `Reconciled value recorded to memory: ${value}. (via ${how})`,
      confidence: 1.0, own_score: 1.0,
      source: by === "human" ? "Human reconciliation" : "Agent reconciliation",
      source_url: null, version: 1, provenance: [conflictNodeId], flagged_by: null,
      corroboration: Math.max(1, sides.length), verified: true,
      category: conflict.category,
      render_kind: "text",
      created_at: new Date().toISOString(),
    };
    this.state.nodes.push(correction);
    this.state.edges.push({
      id: `edge-resolve-${Math.random().toString(36).substr(2, 6)}`,
      mission_id: conflict.mission_id, source: cid, target: conflictNodeId,
      relation: "correction-applied", label: "resolved", created_by: by,
      created_at: new Date().toISOString(),
    });

    // Mark the conflict + its source findings resolved.
    conflict.conflict = false;
    conflict.flagged_by = null;
    conflict.verified = true;
    conflict.title = `Resolved: ${(d.field || "conflict")}`;
    conflict.data = { ...d, resolution: { choice, value, by, at: new Date().toISOString() } };
    for (const s of sides) {
      const sn = s?.ref ? this.getNode(s.ref) : undefined;
      if (sn) { sn.flagged_by = null; sn.conflict = false; sn.verified = true; }
    }
    this.save();
    return { conflict, correction };
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

    if (missionId === "mission-fintech") {
      return {
        summary: "Across Razorpay, Cashfree and PayU, no single gateway wins everywhere. Razorpay leads on high-volume routing economics and is the only one with a measured AI uplift; Cashfree is cheapest to start and settles instantly — pending one open conflict on its maintenance fee; PayU sits in between with the slowest settlement.",
        sentences: [
          {
            id: "s1",
            text: "Razorpay's custom enterprise tier settles at 1.80% (1.95% standard band) plus a 0.05% AI fee, the lowest effective rate for high volume.",
            provenance: ["node-f1", "node-f-matrix"]
          },
          {
            id: "s2",
            text: "Cashfree advertises a flat 1.90% with ₹0 setup and ₹0 maintenance, plus instant settlement.",
            provenance: ["node-f2"]
          },
          {
            id: "s3",
            text: "But Clause 4.2 of Cashfree's developer terms adds a ₹500/month Smart-Routing fee — an open conflict with the public ₹0 pledge that you can reconcile in the workspace.",
            provenance: ["node-f3", "node-f-conflict"]
          },
          {
            id: "s4",
            text: "Settlement speed differs materially: Razorpay T+1 (T+0 on request), Cashfree instant, PayU T+2.",
            provenance: ["node-f6"]
          },
          {
            id: "s5",
            text: "Razorpay's AI Optimizer is the only routing engine with a measured result: a 22% drop in charge failures versus static routing.",
            provenance: ["node-f4", "node-f-matrix"]
          }
        ],
        recommendations: [
          "Reconcile the Cashfree ₹0-vs-₹500 conflict, then write the agreed term into the MSA.",
          "Use Razorpay's 1.80% custom slab as the benchmark when negotiating high-volume rates.",
          "Pilot Razorpay AI Optimizer behind a flag and verify the −22% claim on your own traffic."
        ]
      };
    } else if (missionId === "mission-teardown") {
      return {
        summary: "Vercel's strategy is consistent across categories: a $3.25B raise (Finance) funds an AI-first product bet — v0 and the AI SDK (Product) — repositioned as the 'Frontend Cloud' (Marketing), staffed by AI-engineering and enterprise-GTM hiring (Hiring). The one open question is revenue: two sources disagree.",
        sentences: [
          {
            id: "tb1",
            text: "A $250M Series E at a $3.25B valuation funds the AI product push.",
            provenance: ["node-t1", "node-t-synth"]
          },
          {
            id: "tb2",
            text: "v0 (prompt → production React) and a fast Next.js / AI SDK cadence are the product wedge.",
            provenance: ["node-t4", "node-t5"]
          },
          {
            id: "tb3",
            text: "Hiring splits between AI/infra engineering and enterprise go-to-market — matching the move upmarket.",
            provenance: ["node-t8", "node-t9"]
          },
          {
            id: "tb4",
            text: "Revenue is unresolved: ~$100M ARR (trade press, 2024) vs ~$200M run-rate (interview, 2025) — reconcile before modelling.",
            provenance: ["node-t-conflict"]
          }
        ],
        recommendations: [
          "Reconcile the ARR conflict (record a 2024→2025 range rather than picking one figure).",
          "Treat hiring clusters and v0 launches as the leading indicators to watch.",
          "Underwrite the AI + enterprise thesis; it's corroborated across four categories."
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
