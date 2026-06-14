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
