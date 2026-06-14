// Shared, human-readable product content used across the explainer pages.
// Keeping this in one place so the agent roster and audience stay consistent.

export interface AgentInfo {
  id: string;
  codename: string;   // internal swarm name
  role: string;       // plain human job title
  blurb: string;      // one line: what it does for YOU
  detail: string;     // a sentence more, plain language
  icon: string;       // lucide icon name
  color: string;      // tailwind text color class
  sources?: string[]; // the knowledge sources this agent draws on to do its job
}

// The swarm, explained like a team of people who actually do the work. Order =
// pipeline order: sense → verify → compare → recommend → build.
export const AGENTS: AgentInfo[] = [
  {
    id: "conductor", codename: "Planner", role: "Research Planner",
    blurb: "Turns your goal into a concrete research plan.",
    detail: "Reads your plain-language goal, decides exactly what to look for and which sources to hit, then dispatches the right specialists.",
    icon: "Compass", color: "text-violet-500",
    sources: ["Your goal & persona", "Past missions on file"],
  },
  {
    id: "pathfinder", codename: "Scout", role: "Web Researcher",
    blurb: "Browses the live web and opens the real pages.",
    detail: "Searches the open web and reads actual pricing pages, filings, docs and news — pulling back raw facts instead of guessing.",
    icon: "Search", color: "text-cyan-500",
    sources: ["Open web search", "Company sites & docs", "Filings & news"],
  },
  {
    id: "analyst", codename: "Analyst", role: "Data Analyst",
    blurb: "Pulls the real numbers out of every page.",
    detail: "Turns messy page text into clean, comparable data — prices, specs, dates — ready to chart and compare side by side.",
    icon: "BarChart3", color: "text-purple-500",
    sources: ["Fetched page text", "Pricing & spec tables"],
  },
  {
    id: "veritas", codename: "Fact-checker", role: "Verifier",
    blurb: "Cross-checks every finding across sources.",
    detail: "Confirms each finding against independent sources and marks it Verified or Needs review — a plain badge, not a vague score.",
    icon: "ShieldCheck", color: "text-emerald-500",
    sources: ["Independent sources", "Source freshness & count"],
  },
  {
    id: "cartographer", codename: "Mapper", role: "Knowledge Mapper",
    blurb: "Links findings into one connected map.",
    detail: "Connects related findings so you see the whole picture, and keeps the map as living memory across every run.",
    icon: "Network", color: "text-violet-400",
    sources: ["The mission fabric", "Prior runs"],
  },
  {
    id: "sentinel", codename: "Reviewer", role: "Conflict Reviewer",
    blurb: "Catches when sources disagree.",
    detail: "Spots findings that conflict — a public claim against the fine print — and surfaces the conflict for you to resolve. No jargon, no hidden scores.",
    icon: "GitCompareArrows", color: "text-rose-500",
    sources: ["Cross-source comparison"],
  },
  {
    id: "oracle", codename: "Synthesist", role: "Synthesist",
    blurb: "Builds the side-by-side and the so-what.",
    detail: "Turns verified findings into a real comparison and a clear read: who wins where, and what it means for your decision.",
    icon: "Sparkles", color: "text-amber-500",
    sources: ["Verified findings"],
  },
  {
    id: "scribe", codename: "Reporter", role: "Briefing Writer",
    blurb: "Writes the brief — every line cited.",
    detail: "Produces a readable summary where each sentence links back to the exact finding it came from, so nothing is unverifiable.",
    icon: "BookOpen", color: "text-indigo-500",
    sources: ["Verified findings", "Provenance chain"],
  },
  {
    id: "actor", codename: "Assistant", role: "Action Drafter",
    blurb: "Drafts your next moves (you approve).",
    detail: "Prepares ready-to-run outreach, watches, deep-dives and reminders — one click to act, nothing sent on its own.",
    icon: "Mail", color: "text-fuchsia-500",
    sources: ["Verified findings", "Your persona"],
  },
  {
    id: "architect", codename: "Architect", role: "Solution Architect",
    blurb: "Finds the gaps and what to build.",
    detail: "Reads the analysis and your connected tools to surface what's missing or risky in your product and tech, ranked by impact.",
    icon: "Boxes", color: "text-sky-500",
    sources: ["Verified findings", "Connected tools (GitHub, Azure, Jira…)"],
  },
  {
    id: "builder", codename: "Builder", role: "Prototype Builder",
    blurb: "Turns gaps into a prototype and a build list.",
    detail: "Drafts a prototype spec and a ranked set of shippable tasks, routed into the tools your team already uses.",
    icon: "Hammer", color: "text-emerald-400",
    sources: ["Architect's gaps", "Connected tools"],
  },
  {
    id: "visualizer", codename: "Visualizer", role: "Image Maker",
    blurb: "Turns a finding into an on-brand image.",
    detail: "On request, renders a still from any finding or prompt using FLUX, SDXL, Stability or GPT-Image — bring your own key, or get an instant on-brand preview.",
    icon: "Image", color: "text-violet-400",
    sources: ["Any finding or prompt"],
  },
  {
    id: "cinematographer", codename: "Cinematographer", role: "Video Maker",
    blurb: "Generates short clips from a prompt.",
    detail: "Animates a scene from a finding or prompt via Higgsfield, Kling, Runway, Luma, Hunyuan and more — swarmed on demand and metered per second.",
    icon: "Clapperboard", color: "text-fuchsia-400",
    sources: ["Any finding or prompt"],
  },
];

export interface UseCase {
  persona: string;
  icon: string;
  problem: string;     // the pain, in their words
  solution: string;    // what Nebula does about it
  example: string;     // a ready-to-run mission prompt
  outcome: string;     // what they walk away with
}

// Who it's for + the exact problem solved. Used on the Use Cases page.
export const USE_CASES: UseCase[] = [
  {
    persona: "Founders & Product Teams", icon: "Rocket",
    problem: "Competitors ship and re-price constantly; their public pricing rarely matches the fine print.",
    solution: "A side-by-side comparison of rivals on the metrics that matter, with any conflict between marketing and contract terms surfaced for one-click reconciliation.",
    example: "Compare Razorpay, Cashfree and PayU on pricing, settlement and contract terms",
    outcome: "A real comparison table, a reconciled pricing fact, and a build plan for a smart-rail router.",
  },
  {
    persona: "Competitive Strategists", icon: "TrendingUp",
    problem: "Signals about a rival are scattered across finance, product, marketing and hiring — and never connected.",
    solution: "Findings are auto-tagged by category and mapped into lanes, so you see Finance link to Finance and Product to Product, with the cross-category story drawn for you.",
    example: "Map a rival's moves across finance, product, marketing and hiring",
    outcome: "A category-mapped competitor board with conflicting numbers reconciled, not guessed.",
  },
  {
    persona: "Engineering Leads & CTOs", icon: "Boxes",
    problem: "You know the product has gaps, but turning an audit into a ranked, shippable plan is manual.",
    solution: "The swarm audits your stack, ranks the gaps by risk-reduction-per-effort, drafts a prototype spec, and routes the tasks into the tools you already use.",
    example: "Audit our checkout's tech stack — surface gaps and what to build next",
    outcome: "Ranked gaps, a prototype spec, and tasks ready to file in GitHub, Jira and Azure.",
  },
  {
    persona: "Investors & VCs", icon: "User",
    problem: "Diligence means reconciling figures that never agree across press, filings and interviews.",
    solution: "Every finding is verified across sources; when two numbers disagree, the Reviewer recommends a reconciliation you accept or edit — and it's recorded to memory.",
    example: "Track a startup's funding, product and hiring, and reconcile its revenue figures",
    outcome: "A diligence digest where every number is verified or explicitly reconciled.",
  },
  {
    persona: "Researchers & Analysts", icon: "BookOpen",
    problem: "New papers, regulations and claims break faster than you can read — and they often contradict.",
    solution: "Monitors your topic across sources, marks each finding Verified or Needs review, and flags contradictions so nothing unconfirmed slips into your conclusions.",
    example: "Monitor new research and regulatory changes on my topic, flag contradictions",
    outcome: "A cited, conflict-aware watch you can trust and trace to the source.",
  },
  {
    persona: "Operators & Small Teams", icon: "Gauge",
    problem: "Supplier prices and terms shift under you, and the headline rate hides the real cost.",
    solution: "Compares your suppliers on real terms, reconciles the gap between the quote and the contract, and recommends the next move.",
    example: "Compare my suppliers' pricing and contract terms, flag the hidden fees",
    outcome: "A clear comparison, the true cost reconciled, and a recommended action.",
  },
];

// The pipeline, explained in 6 plain steps (How It Works page).
export const PIPELINE_STEPS = [
  { n: 1, title: "Sense", icon: "Search", color: "text-cyan-500",
    text: "You state a goal in plain language. The Scout searches and reads real pages across the open web." },
  { n: 2, title: "Verify", icon: "ShieldCheck", color: "text-emerald-500",
    text: "The Fact-checker cross-references each finding across sources and marks it Verified or Needs review." },
  { n: 3, title: "Compare", icon: "Network", color: "text-violet-500",
    text: "The Mapper links findings into one map; the Reviewer surfaces any conflicts between sources." },
  { n: 4, title: "Read", icon: "Sparkles", color: "text-amber-500",
    text: "The Synthesist builds the side-by-side comparison and the so-what; the Reporter writes a fully-cited brief." },
  { n: 5, title: "Act", icon: "Mail", color: "text-fuchsia-500",
    text: "The Assistant drafts your next steps — outreach, watches, reminders — ready for one-click approval." },
  { n: 6, title: "Build", icon: "Hammer", color: "text-sky-500",
    text: "The Architect and Builder turn the analysis into gaps, a prototype and ranked tasks — routed to the tools you already use." },
];
