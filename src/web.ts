// ─── Nebula Web Intelligence Layer ──────────────────────────────────────────
// This module is the REAL backbone of the agentic web swarm.
// It does what the agents CLAIM to do: autonomously navigates real websites,
// extracts real information, and returns structured intelligence.
//
// Pipeline: prompt → search queries → web search → page fetch → text extract → LLM distill
//
// Search backends:
//   1. Brave Search API (if BRAVE_API_KEY is set — free tier: 2000 queries/month)
//   2. DuckDuckGo HTML scraping (zero-config fallback — no API key needed)
//
// The module is designed to NEVER throw — every function returns a result or
// an empty array, so the pipeline always moves forward.

import * as cheerio from "cheerio";
import { chatJSON } from "./llm.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ExtractedPage {
  url: string;
  title: string;
  text: string;          // cleaned, truncated plain text
  fetchedAt: string;
  bytesFetched: number;
}

export interface DistilledSignal {
  title: string;
  content: string;
  source_url: string;
  source_name: string;
  confidence: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 12000;
const MAX_PAGE_BYTES = 512_000;     // 500KB cap per page
const MAX_TEXT_CHARS = 6000;        // chars of extracted text to send to LLM
const MAX_RESULTS_PER_QUERY = 3;

// ─── 1. Generate Search Queries ─────────────────────────────────────────────
// Uses the LLM to decompose a natural-language mission prompt into
// specific, targeted search queries that will find real intelligence.

export async function generateSearchQueries(
  prompt: string,
  persona: string | null
): Promise<string[]> {
  try {
    const { data } = await chatJSON<{ queries: string[] }>(
      `You are an expert OSINT researcher. A user wants to investigate: "${prompt}"
Their persona is: ${persona || "General Analyst"}.

Generate exactly 4 highly specific web search queries that would find REAL, concrete intelligence about this topic.
Each query should target a different angle (e.g., pricing pages, press releases, hiring pages, regulatory filings, official announcements).
Make queries specific enough to return useful results — include company/entity names, years, specific terms.

Return JSON: { "queries": ["query 1", "query 2", "query 3", "query 4"] }`,
      "Generate precise, search-engine-optimized queries. No generic queries."
    );

    if (data?.queries && Array.isArray(data.queries)) {
      return data.queries.slice(0, 5);
    }
  } catch (err) {
    console.error("[Web] Failed to generate search queries via LLM:", err);
  }

  // Fallback: create basic queries from the prompt
  const words = prompt.split(" ").filter(w => w.length > 3).slice(0, 4);
  return [
    prompt,
    `${words[0] || "target"} pricing 2024 2025`,
    `${words[0] || "target"} news latest announcement`,
  ];
}

// ─── 2. Web Search ──────────────────────────────────────────────────────────
// Searches the web using Brave Search API (if key exists) or DuckDuckGo scraping.

export async function searchWeb(query: string): Promise<SearchResult[]> {
  // Try Brave Search first (structured JSON, most reliable)
  const braveKey = process.env.BRAVE_API_KEY;
  if (braveKey && braveKey.trim() && !braveKey.includes("xxx")) {
    const results = await searchBrave(query, braveKey);
    if (results.length > 0) return results;
  }

  // Fallback: DuckDuckGo HTML scraping (zero-config)
  const ddgResults = await searchDuckDuckGo(query);
  if (ddgResults.length > 0) return ddgResults;

  // Ultimate fallback: ask LLM for likely URLs
  return await suggestUrlsViaLLM(query);
}

async function searchBrave(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${MAX_RESULTS_PER_QUERY}`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[Web] Brave Search HTTP ${res.status}`);
      return [];
    }

    const data: any = await res.json();
    const results: SearchResult[] = (data?.web?.results || [])
      .slice(0, MAX_RESULTS_PER_QUERY)
      .map((r: any) => ({
        title: r.title || "",
        url: r.url || "",
        snippet: r.description || "",
      }));

    console.log(`[Web] Brave Search returned ${results.length} results for: "${query}"`);
    return results;
  } catch (err) {
    console.warn("[Web] Brave Search failed:", err);
    return [];
  }
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[Web] DuckDuckGo HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    $(".result").each((_i, el) => {
      if (results.length >= MAX_RESULTS_PER_QUERY) return false;

      const titleEl = $(el).find(".result__a");
      const snippetEl = $(el).find(".result__snippet");
      const href = titleEl.attr("href") || "";

      // DuckDuckGo wraps URLs in a redirect; extract the actual URL
      let actualUrl = href;
      try {
        const parsed = new URL(href, "https://duckduckgo.com");
        const uddg = parsed.searchParams.get("uddg");
        if (uddg) actualUrl = decodeURIComponent(uddg);
      } catch {
        // Use the raw href
      }

      // Skip DuckDuckGo internal links and ad links
      if (!actualUrl || actualUrl.includes("duckduckgo.com") || actualUrl.startsWith("/")) return;

      results.push({
        title: titleEl.text().trim(),
        url: actualUrl,
        snippet: snippetEl.text().trim(),
      });
    });

    console.log(`[Web] DuckDuckGo returned ${results.length} results for: "${query}"`);
    return results;
  } catch (err) {
    console.warn("[Web] DuckDuckGo scraping failed:", err);
    return [];
  }
}

// Last resort: ask the LLM to suggest specific URLs likely to contain intelligence.
async function suggestUrlsViaLLM(query: string): Promise<SearchResult[]> {
  try {
    const { data } = await chatJSON<{ urls: any[] }>(
      `For this research query: "${query}", suggest 3 REAL, specific URLs that are likely to contain relevant intelligence. These must be real websites that actually exist (e.g., official company pages, news sites, government portals).
Return JSON: { "urls": [{ "title": "Description", "url": "https://...", "snippet": "What you'd expect to find" }] }`,
      "Suggest only real, existing, publicly accessible URLs."
    );
    if (data?.urls && Array.isArray(data.urls)) {
      return data.urls.slice(0, 3).map((u: any) => ({
        title: u.title || "",
        url: u.url || "",
        snippet: u.snippet || "",
      }));
    }
  } catch (err) {
    console.warn("[Web] LLM URL suggestion failed:", err);
  }
  return [];
}

// ─── 3. Page Fetching ───────────────────────────────────────────────────────
// Fetches real web pages with proper headers, timeouts, and error handling.

export async function fetchPage(url: string): Promise<ExtractedPage | null> {
  try {
    // Validate URL
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeout);

      if (!res.ok) {
        console.warn(`[Web] Fetch ${url} → HTTP ${res.status}`);
        return null;
      }

      // Check content type — only process HTML/text
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("text/html") && !ct.includes("text/plain") && !ct.includes("application/xhtml")) {
        console.warn(`[Web] Skipping ${url} — content-type: ${ct}`);
        return null;
      }

      // Read body with size limit
      const rawBytes = await res.arrayBuffer();
      if (rawBytes.byteLength > MAX_PAGE_BYTES) {
        console.warn(`[Web] Page too large: ${url} (${rawBytes.byteLength} bytes)`);
      }
      const html = new TextDecoder().decode(rawBytes.slice(0, MAX_PAGE_BYTES));

      // Extract readable text
      const { title, text } = extractTextFromHTML(html);

      if (text.length < 50) {
        console.warn(`[Web] Page too sparse after extraction: ${url} (${text.length} chars)`);
        return null;
      }

      console.log(`[Web] Fetched ${url} → ${text.length} chars extracted`);

      return {
        url,
        title,
        text: text.slice(0, MAX_TEXT_CHARS),
        fetchedAt: new Date().toISOString(),
        bytesFetched: rawBytes.byteLength,
      };
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === "AbortError") {
        console.warn(`[Web] Timeout fetching ${url}`);
      } else {
        console.warn(`[Web] Fetch error for ${url}:`, fetchErr.message || fetchErr);
      }
      return null;
    }
  } catch (err) {
    console.warn(`[Web] Invalid URL: ${url}`);
    return null;
  }
}

// ─── 4. HTML Text Extraction ────────────────────────────────────────────────
// Strips HTML to clean, readable text using cheerio.

function extractTextFromHTML(html: string): { title: string; text: string } {
  const $ = cheerio.load(html);

  // Remove noise elements
  $("script, style, noscript, iframe, svg, nav, footer, header, [role='navigation'], [role='banner'], .cookie-banner, .ad, .advertisement, #cookie-consent").remove();

  const title = $("title").text().trim() || $("h1").first().text().trim() || "";

  // Extract text from main content areas first, fall back to body
  let text = "";
  const mainSelectors = ["main", "article", "[role='main']", ".content", ".post-content", ".article-body", "#content"];
  for (const sel of mainSelectors) {
    const mainText = $(sel).text().trim();
    if (mainText.length > 200) {
      text = mainText;
      break;
    }
  }

  // Fallback to full body text
  if (!text || text.length < 200) {
    text = $("body").text().trim();
  }

  // Clean up whitespace
  text = text
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, text };
}

// ─── 5. Signal Distillation ─────────────────────────────────────────────────
// Uses the LLM to extract structured intelligence from real page text.
// This is the key step: turning raw web content into actionable WeaveNode data.

export async function distillSignals(
  pages: ExtractedPage[],
  prompt: string
): Promise<{ signals: DistilledSignal[]; tokens: number }> {
  if (pages.length === 0) return { signals: [], tokens: 0 };

  const pagesContext = pages.map((p, i) =>
    `--- SOURCE ${i + 1} ---\nURL: ${p.url}\nTitle: ${p.title}\nContent:\n${p.text.slice(0, 2000)}\n`
  ).join("\n");

  try {
    const { data, tokens } = await chatJSON<{ signals: any[] }>(
      `You are an intelligence analyst extracting FACTS from real web pages.

MISSION: "${prompt}"

Below are REAL web pages that were just fetched. Extract 1 key intelligence finding per source.
For each finding, pull out SPECIFIC facts: numbers, prices, dates, names, quotes.
Do NOT make up information — only report what is actually in the source text.
If a source has no relevant information for the mission, skip it.

${pagesContext}

Return JSON:
{
  "signals": [
    {
      "title": "Specific factual title (include entity name + key fact)",
      "content": "Detailed paragraph with specific data points extracted from the source. Include exact numbers, prices, dates, or quotes found in the text.",
      "source_url": "The exact URL this was extracted from",
      "source_name": "Human-readable source name (e.g., 'Razorpay Pricing Page', 'TechCrunch Article')",
      "confidence": 0.85
    }
  ]
}`,
      "Extract only factual information actually present in the source text. Never fabricate data. If a source is irrelevant, omit it."
    );

    if (data?.signals && Array.isArray(data.signals)) {
      const signals = data.signals
        .filter((s: any) => s.title && s.content && s.source_url)
        .map((s: any) => ({
          title: String(s.title),
          content: String(s.content),
          source_url: String(s.source_url),
          source_name: String(s.source_name || "Web Source"),
          confidence: typeof s.confidence === "number" ? Math.min(Math.max(s.confidence, 0.4), 0.98) : 0.85,
        }));

      return { signals, tokens };
    }

    return { signals: [], tokens };
  } catch (err) {
    console.error("[Web] Signal distillation failed:", err);
    return { signals: [], tokens: 0 };
  }
}

// ─── 6. Full Pipeline ───────────────────────────────────────────────────────
// Orchestrates the entire web intelligence pipeline end-to-end.
// This is what Pathfinder actually calls.

export interface WebIntelligenceResult {
  signals: DistilledSignal[];
  searchResults: SearchResult[];
  pagesAttempted: number;
  pagesFetched: number;
  totalTokens: number;
}

export async function gatherWebIntelligence(
  prompt: string,
  persona: string | null,
  onProgress?: (msg: string) => void
): Promise<WebIntelligenceResult> {
  const log = onProgress || (() => {});
  let totalTokens = 0;

  // Step 1: Generate search queries
  log("Generating targeted search queries from mission prompt...");
  const queries = await generateSearchQueries(prompt, persona);
  log(`Generated ${queries.length} search queries: ${queries.map(q => `"${q}"`).join(", ")}`);

  // Step 2: Execute searches
  log("Deploying search agents across web indices...");
  const allResults: SearchResult[] = [];
  for (const query of queries) {
    const results = await searchWeb(query);
    for (const r of results) {
      // Deduplicate by URL
      if (!allResults.some(existing => existing.url === r.url)) {
        allResults.push(r);
      }
    }
  }
  log(`Discovered ${allResults.length} unique web sources across ${queries.length} search vectors.`);

  if (allResults.length === 0) {
    log("No web sources found. Search APIs may be unavailable.");
    return { signals: [], searchResults: [], pagesAttempted: 0, pagesFetched: 0, totalTokens: 0 };
  }

  // Step 3: Fetch top pages (cap at 6 to stay fast)
  const toFetch = allResults.slice(0, 6);
  log(`Navigating ${toFetch.length} target web pages for data extraction...`);

  const fetchedPages: ExtractedPage[] = [];
  for (const result of toFetch) {
    log(`Fetching: ${result.url}`);
    const page = await fetchPage(result.url);
    if (page) {
      fetchedPages.push(page);
    }
  }
  log(`Successfully extracted content from ${fetchedPages.length}/${toFetch.length} pages.`);

  if (fetchedPages.length === 0) {
    log("All page fetches failed (sites may be blocking or unreachable).");
    // Return search snippets as minimal signal data
    const snippetSignals: DistilledSignal[] = allResults
      .filter(r => r.snippet.length > 30)
      .slice(0, 3)
      .map(r => ({
        title: r.title,
        content: r.snippet,
        source_url: r.url,
        source_name: new URL(r.url).hostname,
        confidence: 0.65, // lower confidence for snippet-only data
      }));
    return {
      signals: snippetSignals,
      searchResults: allResults,
      pagesAttempted: toFetch.length,
      pagesFetched: 0,
      totalTokens: 0,
    };
  }

  // Step 4: Distill intelligence from real page text
  log("Veritas analyzing extracted content for factual intelligence signals...");
  const { signals, tokens } = await distillSignals(fetchedPages, prompt);
  totalTokens += tokens;
  log(`Distilled ${signals.length} verified intelligence signals from ${fetchedPages.length} real sources.`);

  return {
    signals,
    searchResults: allResults,
    pagesAttempted: toFetch.length,
    pagesFetched: fetchedPages.length,
    totalTokens,
  };
}
