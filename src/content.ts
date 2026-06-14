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
    problem: "Competitors ship and re-price constantly; you find out weeks late from a customer.",
    solution: "A standing watch on rivals' pricing, packaging, and AI features — contradictions between their marketing and their fine print flagged automatically.",
    example: "Track how Razorpay, Cashfree and PayU are shifting enterprise pricing and AI features",
    outcome: "A cited competitive brief + a drafted counter-pricing move.",
  },
  {
    persona: "Investors & VCs", icon: "TrendingUp",
    problem: "Monitoring a portfolio means tab-hopping across news, filings, and LinkedIn every day.",
    solution: "Continuous signal tracking across your companies — hiring surges, funding chatter, founder activity, narrative shifts — woven into one verifiable timeline.",
    example: "Monitor solid-state battery startups for hiring surges, funding alerts and breakthrough claims",
    outcome: "A diligence-ready digest with sources and a 'what changed since last week' delta.",
  },
  {
    persona: "Job Seekers & Professionals", icon: "User",
    problem: "You're tracking 5 target companies by hand and still miss the right opening or the culture red flag.",
    solution: "Watches target companies for openings, hiring signals, leadership moves, and interviewer backgrounds.",
    example: "Watch Stripe, Vercel and Linear for openings, culture shifts and hiring signals",
    outcome: "Timely alerts + a drafted, tailored outreach email to the hiring manager.",
  },
  {
    persona: "Researchers & Analysts", icon: "BookOpen",
    problem: "New papers, regulations, and news break faster than you can read them.",
    solution: "Monitors academic papers, regulatory changes, and global narratives on your topic, verified across sources.",
    example: "Monitor new research, regulatory changes and news on solid-state batteries",
    outcome: "A cited literature/regulatory watch you can trust and trace.",
  },
  {
    persona: "Small Business Owners", icon: "Gauge",
    problem: "Supplier prices, customer sentiment, and rules shift under you with no warning.",
    solution: "Tracks your suppliers' pricing, category sentiment, and regulatory risks in plain language.",
    example: "Track my suppliers' pricing, customer sentiment and regulatory risks in my category",
    outcome: "Early warnings + a recommended action before it costs you.",
  },
  {
    persona: "Students & Academics", icon: "Sparkles",
    problem: "Internships, grants, and deadlines are scattered and easy to miss.",
    solution: "Surfaces opportunities and deadlines in your field, with the source and the date.",
    example: "Alert me to internships and grants in computational biology before their deadlines",
    outcome: "A deadline-aware opportunity list + a drafted application starter.",
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
