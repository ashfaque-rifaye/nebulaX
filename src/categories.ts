// Shared, client-safe category palette + ordering. Used by the Flow map to
// colour, cluster and filter findings by analysis category, and by the server
// seed/db for a single source of truth (no fs import here, so it's bundle-safe).

export const CATEGORY_META: Record<string, { color: string; label: string }> = {
  Finance:        { color: "#34d399", label: "Finance" },
  Pricing:        { color: "#34d399", label: "Pricing" },
  Settlement:     { color: "#22d3ee", label: "Settlement" },
  Contracts:      { color: "#818cf8", label: "Contracts" },
  Product:        { color: "#8b5cf6", label: "Product" },
  Marketing:      { color: "#e879f9", label: "Marketing" },
  Hiring:         { color: "#fbbf24", label: "Hiring" },
  Reliability:    { color: "#38bdf8", label: "Reliability" },
  Security:       { color: "#fb7185", label: "Security" },
  Performance:    { color: "#2dd4bf", label: "Performance" },
  Infrastructure: { color: "#60a5fa", label: "Infrastructure" },
  General:        { color: "#94a3b8", label: "General" },
};

// Lane order, top-to-bottom, for the category-clustered Flow layout.
export const CATEGORY_ORDER = [
  "Finance", "Pricing", "Settlement", "Contracts",
  "Product", "Marketing", "Hiring",
  "Reliability", "Security", "Performance", "Infrastructure",
  "General",
];

export const catColor = (cat?: string): string =>
  (CATEGORY_META[cat || "General"] || CATEGORY_META.General).color;

export const catRank = (cat?: string): number => {
  const i = CATEGORY_ORDER.indexOf(cat || "General");
  return i === -1 ? CATEGORY_ORDER.length : i;
};

// Keyword categorizer so every finding lands in a real category (not "General")
// even with no LLM key. Order matters — more specific buckets win first.
export function inferCategory(text: string): string {
  const t = (text || "").toLowerCase();
  if (/\b(settle|payout|t\+\d|disburs)\b/.test(t)) return "Settlement";
  if (/\b(contract|terms|clause|sla|agreement|\bmsa\b|waiver|license|compliance)\b/.test(t)) return "Contracts";
  if (/\b(secur|vuln|\bcve\b|secret|api key|exploit|leak|breach|encrypt|auth|password)\b/.test(t)) return "Security";
  if (/\b(latency|performance|\btti\b|\blcp\b|bundle|throughput|p95|p99|page load|render|fps)\b/.test(t)) return "Performance";
  if (/\b(reliab|idempoten|retry|outage|failover|uptime|incident|resilien|downtime)\b/.test(t)) return "Reliability";
  if (/\b(region|infra|cloud|deploy|hosting|architecture|kubernetes|server|database|ci\/cd|pipeline)\b/.test(t)) return "Infrastructure";
  if (/\b(hir|hiring|\brole\b|\bjob\b|career|headcount|recruit|talent|layoff|researcher|engineer|\bteam\b|staff|workforce)\b/.test(t)) return "Hiring";
  if (/\b(market|campaign|positioning|brand|devrel|conference|messaging|\bgtm\b|go-to-market|\bads?\b|launch event|community)\b/.test(t)) return "Marketing";
  if (/\b(funding|raise|valuation|series [a-e]\b|\barr\b|revenue|run-rate|profit|margin|\bipo\b|earnings|quarter|\bq[1-4]\b|growth|expansion|cash)\b/.test(t)) return "Finance";
  if (/\b(price|pricing|\bmdr\b|\bfee\b|\bcost\b|discount|tariff|per month|\/mo|\btier\b|\bplan\b|subscription)\b/.test(t)) return "Pricing";
  if (/\b(launch|product|feature|\bapi\b|\bsdk\b|\bmodel\b|release|roadmap|ships?|\bbeta\b|\bgpu\b|chip|graphics|hardware|prototype)\b/.test(t)) return "Product";
  return "General";
}

