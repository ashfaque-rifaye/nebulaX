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
}

// The swarm, explained like a team of people. Order = pipeline order.
export const AGENTS: AgentInfo[] = [
  {
    id: "conductor", codename: "Conductor", role: "Mission Planner",
    blurb: "Breaks your goal into a research plan.",
    detail: "Reads your plain-language mission and decides what to look for, in what order, and which specialists to dispatch.",
    icon: "Compass", color: "text-violet-500",
  },
  {
    id: "pathfinder", codename: "Pathfinder", role: "Web Scout",
    blurb: "Actually browses the live web for you.",
    detail: "Searches the open web, opens real pages (pricing pages, news, careers, filings) and pulls back the raw facts — surfacing blocks instead of guessing.",
    icon: "Search", color: "text-cyan-500",
  },
  {
    id: "analyst", codename: "Signal Analysts", role: "Analysts",
    blurb: "Read the pages and pull out what matters.",
    detail: "Domain specialists (pricing, hiring, news) that turn messy page text into clean, specific findings with numbers and dates.",
    icon: "FileText", color: "text-purple-500",
  },
  {
    id: "veritas", codename: "Veritas", role: "Fact-Checker",
    blurb: "Cross-checks every claim across sources.",
    detail: "Scores how trustworthy each finding is based on how many independent sources confirm it, and flags single-source or stale claims.",
    icon: "ShieldCheck", color: "text-emerald-500",
  },
  {
    id: "cartographer", codename: "Cartographer", role: "Memory Weaver",
    blurb: "Connects findings into one living map.",
    detail: "Links related findings together so you see the whole picture, not scattered snippets — and keeps the map as your memory over time.",
    icon: "Network", color: "text-violet-400",
  },
  {
    id: "sentinel", codename: "Sentinel", role: "Watchdog",
    blurb: "Catches contradictions and drift.",
    detail: "Continuously watches for findings that conflict with each other or change over time, and lowers confidence until they're resolved.",
    icon: "ShieldAlert", color: "text-red-500",
  },
  {
    id: "oracle", codename: "Oracle", role: "Strategist",
    blurb: "Tells you what it all means.",
    detail: "Turns verified findings into a clear so-what: the strategic takeaway and what's likely to happen next.",
    icon: "Sparkles", color: "text-amber-500",
  },
  {
    id: "scribe", codename: "Scribe", role: "Reporter",
    blurb: "Writes the brief — every line cited.",
    detail: "Produces a readable summary where every sentence links back to the exact source node it came from, so nothing is unverifiable.",
    icon: "BookOpen", color: "text-indigo-500",
  },
  {
    id: "actor", codename: "Actor", role: "Assistant",
    blurb: "Drafts your next steps (you approve).",
    detail: "Prepares executable actions — an outreach email, a calendar reminder, a brief — ready for one-click approval. Never sends anything on its own.",
    icon: "Mail", color: "text-fuchsia-500",
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

// The pipeline, explained in 5 plain steps (How It Works page).
export const PIPELINE_STEPS = [
  { n: 1, title: "Sense", icon: "Search", color: "text-cyan-500",
    text: "You state a goal in plain language. The Web Scout searches and reads real pages across the open web." },
  { n: 2, title: "Verify", icon: "ShieldCheck", color: "text-emerald-500",
    text: "The Fact-Checker cross-references each finding across sources and scores how much to trust it." },
  { n: 3, title: "Weave", icon: "Network", color: "text-violet-500",
    text: "The Memory Weaver connects findings into one living map; the Watchdog flags any contradictions." },
  { n: 4, title: "Recommend", icon: "Sparkles", color: "text-amber-500",
    text: "The Strategist explains what it means and what's next; the Reporter writes a fully-cited brief." },
  { n: 5, title: "Act", icon: "Mail", color: "text-fuchsia-500",
    text: "The Assistant drafts your next steps — emails, reminders, briefs — ready for one-click approval." },
];
