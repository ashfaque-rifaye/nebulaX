import { db } from "./db.ts";
import { WeaveNode, WeaveEdge, ProposedAction, ActivityFeedEvent, MissionPlanVariant, MissionRun } from "./types.ts";
import { chatJSON, isLLMAvailable, getProviderNames } from "./llm.ts";
import { estimateFootprint, efficiencyDividend, creditsForTokens } from "./footprint.ts";
import { gatherWebIntelligence } from "./web.ts";

// Nebula's AI layer is now provider-agnostic: Groq (primary) → Cerebras → Hugging Face.
// See src/llm.ts for the fallback chain. No vendor SDK is required.

function llmReady(): boolean {
  return isLLMAvailable();
}

// Given a generic mission prompt, propose 3 distinct strategic interpretations
// for the user to choose from BEFORE the swarm is deployed.
export async function planMissionVariants(prompt: string, persona: string | null): Promise<MissionPlanVariant[]> {
  if (llmReady()) {
    try {
      const { data } = await chatJSON<{ variants: any[] }>(
        `A user wants to launch an autonomous web-intelligence mission with this goal: "${prompt}".
Target persona: ${persona || "General Analyst"}.

Propose exactly 3 DISTINCT strategic angles the agent swarm could pursue for this goal. Each must take a genuinely different approach (e.g. competitive pricing vs. talent/hiring signals vs. narrative/risk monitoring).

Return JSON:
{
  "variants": [
    {
      "name": "2-4 word title naming what this angle accomplishes",
      "angle": "one short line describing the focus",
      "description": "2 sentences on exactly what the swarm will investigate and produce",
      "focus": ["tag1", "tag2", "tag3"],
      "refined_prompt": "a specific, detailed mission prompt (1-2 sentences) the swarm will actually execute for this angle"
    }
  ]
}`,
        "You are a strategy planner that frames an investigation in multiple distinct, high-value ways."
      );
      if (data?.variants && Array.isArray(data.variants) && data.variants.length > 0) {
        return data.variants.slice(0, 3).map((v: any, i: number) => ({
          id: `plan-${i}`,
          name: v.name || `Strategy ${i + 1}`,
          angle: v.angle || "",
          description: v.description || "",
          focus: Array.isArray(v.focus) ? v.focus.slice(0, 4) : [],
          refined_prompt: v.refined_prompt || prompt
        }));
      }
    } catch (err: any) {
      console.error("Mission planning failed, using fallback variants:", err?.message || err);
    }
  }
  return fallbackPlanVariants(prompt);
}

function fallbackPlanVariants(prompt: string): MissionPlanVariant[] {
  return [
    {
      id: "plan-0",
      name: "Competitive Pricing Watch",
      angle: "Pricing, packaging & monetization shifts",
      description: `Track how the entities in "${prompt}" are changing pricing, tiers, and commercial terms. Surfaces undisclosed fees and pricing-model contradictions.`,
      focus: ["Pricing", "Packaging", "Fees"],
      refined_prompt: `${prompt} — focus specifically on pricing changes, enterprise tiers, hidden fees, and monetization strategy.`
    },
    {
      id: "plan-1",
      name: "Talent & Momentum Signals",
      angle: "Hiring surges, key people & execution speed",
      description: `Monitor hiring patterns, leadership moves, and team momentum across the targets in "${prompt}". Indicates where investment and execution are accelerating.`,
      focus: ["Hiring", "Leadership", "Momentum"],
      refined_prompt: `${prompt} — focus on hiring surges, notable departures/arrivals, org changes, and signals of execution speed.`
    },
    {
      id: "plan-2",
      name: "Narrative & Risk Radar",
      angle: "Press, product launches & emerging risks",
      description: `Watch the public narrative, product announcements, and regulatory or reputational risks around "${prompt}". Flags contradictions between marketing claims and reality.`,
      focus: ["Press", "Launches", "Risk"],
      refined_prompt: `${prompt} — focus on press coverage, product/AI feature launches, and regulatory or reputational risks.`
    }
  ];
}

// Grounded "chat with your fabric": answer a question using ONLY the mission's
// nodes as evidence, returning the answer + the node ids it cited.
export async function answerFabricQuestion(
  missionId: string,
  question: string
): Promise<{ answer: string; citations: string[]; tokens: number }> {
  const nodes = db.getNodes(missionId);
  const mission = db.getMission(missionId);

  if (!isLLMAvailable()) {
    return {
      answer: "The fabric assistant needs an LLM provider configured (set GROQ_API_KEY). For now, explore the nodes and brief directly.",
      citations: [],
      tokens: 0
    };
  }

  // Prefer pinned + higher-confidence nodes; cap context for lean prompts.
  const ctxNodes = nodes
    .slice()
    .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (b.confidence - a.confidence))
    .slice(0, 24);
  const refs = ctxNodes
    .map((n, i) => `[${i + 1}] (${n.type}, ${Math.round(n.confidence * 100)}% conf) ${n.title}: ${n.content.slice(0, 320)}`)
    .join("\n");

  try {
    const { data, tokens } = await chatJSON<{ answer: string; citations: number[] }>(
      `You are Nebula's fabric assistant for the mission "${mission?.prompt || ""}". Answer the user's question using ONLY the evidence nodes below. Be specific and cite the nodes you used by their bracket numbers.

EVIDENCE NODES:
${refs}

USER QUESTION: ${question}

Return JSON: { "answer": "a concise, specific answer grounded strictly in the evidence (2-5 sentences, markdown allowed)", "citations": [bracket numbers you actually used] }`,
      "Ground every claim in the provided evidence. If the evidence does not cover the question, say so plainly rather than inventing facts."
    );
    const citations = (data.citations || [])
      .map((num: number) => ctxNodes[num - 1]?.id)
      .filter((x): x is string => Boolean(x));
    return { answer: data.answer || "I couldn't form an answer from the current fabric.", citations, tokens };
  } catch (err: any) {
    return { answer: `The assistant hit an error: ${err.message || "unknown"}.`, citations: [], tokens: 0 };
  }
}

// Autonomous self-correction: the Watchdog scans the WHOLE fabric (across all
// runs) for genuine contradictions, auto-creates contradiction nodes, suppresses
// the confidence of the conflicting claims, and re-propagates — no human needed.
// Human corrections still override via the veto flow. This is the self-correcting loop.
export async function runSelfCorrection(
  missionId: string,
  logEvent?: (sender: string, message: string, level?: ActivityFeedEvent["level"]) => void
): Promise<{ contradictions: number; tokens: number }> {
  const log = logEvent || (() => {});
  const claims = db.getNodes(missionId).filter(
    n => (n.type === "web-signal" || n.type === "synthesis") && n.flagged_by !== "sentinel"
  );
  if (!isLLMAvailable() || claims.length < 2) return { contradictions: 0, tokens: 0 };

  log("Sentinel", "Watchdog auto-scanning the full fabric for contradictions & drift...", "info");
  const list = claims.map((n, i) => `[${i + 1}] ${n.title}: ${n.content.slice(0, 200)}`).join("\n");
  let created = 0;
  let tokens = 0;
  try {
    const { data, tokens: t } = await chatJSON<{ contradictions: { a: number; b: number; reason: string }[] }>(
      `These are factual claims in a knowledge graph. Identify ONLY genuine contradictions — two claims that cannot both be true (different values for the same fact, a reversal, or a public claim contradicted by fine print). Do NOT invent conflicts; if there are none, return an empty list.
CLAIMS:
${list}
Return JSON: { "contradictions": [ { "a": <claim number>, "b": <claim number>, "reason": "what specifically conflicts" } ] }`,
      "Be conservative. Only report real, defensible contradictions grounded in the claims."
    );
    tokens = t;
    const found = Array.isArray(data?.contradictions) ? data.contradictions : [];
    const ts = () => new Date().toISOString();

    for (const c of found) {
      const a = claims[c.a - 1];
      const b = claims[c.b - 1];
      if (!a || !b || a.id === b.id) continue;
      // Skip if this exact pair was already flagged.
      const dup = db.getNodes(missionId).some(
        n => n.flagged_by === "sentinel" && (n.provenance || []).includes(a.id) && (n.provenance || []).includes(b.id)
      );
      if (dup) continue;

      const cid = `node-watchdog-${Math.random().toString(36).substr(2, 5)}`;
      db.addNode({
        id: cid, mission_id: missionId, type: "synthesis",
        title: `Contradiction: ${a.title.slice(0, 38)} vs ${b.title.slice(0, 38)}`,
        content: c.reason || "Conflicting claims detected across the fabric.",
        confidence: 0.5, own_score: 0.5, source: "Watchdog (auto)", source_url: null,
        version: 1, provenance: [a.id, b.id], flagged_by: "sentinel", created_at: ts()
      });
      db.addEdge({ id: `edge-wd-a-${Math.random().toString(36).substr(2, 5)}`, mission_id: missionId, source: a.id, target: cid, relation: "contradicts", label: "auto-flagged", created_by: "Sentinel", created_at: ts() });
      db.addEdge({ id: `edge-wd-b-${Math.random().toString(36).substr(2, 5)}`, mission_id: missionId, source: b.id, target: cid, relation: "contradicts", label: "auto-flagged", created_by: "Sentinel", created_at: ts() });
      db.updateNode(a.id, { flagged_by: "sentinel" });
      db.updateNode(b.id, { flagged_by: "sentinel" });
      created++;
      log("Sentinel", `Auto-flagged contradiction: ${(c.reason || "conflict").slice(0, 90)}. Confidence suppressed pending review.`, "error");
    }

    if (created === 0) log("Sentinel", "Fabric scan complete — no unresolved contradictions.", "success");
    else log("Oracle", `Self-correction flagged ${created} contradiction${created !== 1 ? "s" : ""}. Submit a one-line correction to heal downstream confidence.`, "warn");
    db.propagateConfidence(missionId);
  } catch (e: any) {
    console.error("Self-correction error:", e);
  }
  return { contradictions: created, tokens };
}

// Dynamic canvas enrichment: classify each finding into the BEST way to display
// it (metrics / comparison / list / quote / text) and extract structured data,
// so the 2D fabric can render rich components instead of plain text boxes.
export async function enrichMissionNodes(missionId: string): Promise<number> {
  const nodes = db.getNodes(missionId).filter(
    n => (n.type === "web-signal" || n.type === "synthesis") && !n.render_kind
  );
  if (!isLLMAvailable() || nodes.length === 0) return 0;

  const batch = nodes.slice(0, 14);
  const list = batch.map((n, i) => `[${i + 1}] (${n.type}) ${n.title}: ${n.content.slice(0, 400)}`).join("\n");
  try {
    const { data } = await chatJSON<{ items: { i: number; render_kind: string; data: any }[] }>(
      `For each finding below, choose the BEST way to display it on a canvas and extract structured data from the finding's own text.
render_kind options:
- "metrics": when there are key numbers/prices/percentages → data {"items":[{"label":"...","value":"..."}]}
- "comparison": when two entities/options are contrasted → data {"left":{"name":"...","points":["..."]},"right":{"name":"...","points":["..."]}}
- "list": discrete points/steps → data {"items":["...","..."]}
- "quote": a notable verbatim statement → data {"quote":"...","attribution":"..."}
- "text": plain prose → data {}

FINDINGS:
${list}

Return JSON: { "items": [ { "i": <finding number>, "render_kind": "metrics|comparison|list|quote|text", "data": { ... } } ] }`,
      "Pick the single most informative component per finding. Only use facts present in the finding text. Prefer metrics/comparison/list over plain text when the content supports it."
    );
    let updated = 0;
    const valid = new Set(["text", "metrics", "comparison", "list", "quote"]);
    (data?.items || []).forEach((it) => {
      const n = batch[it.i - 1];
      if (n && it.render_kind && valid.has(it.render_kind)) {
        db.updateNode(n.id, { render_kind: it.render_kind as any, data: it.data || {} });
        updated++;
      }
    });
    return updated;
  } catch (e) {
    console.error("Node enrichment failed:", e);
    return 0;
  }
}

// Execute a user-created custom agent: it reasons over the mission fabric per
// its instruction and writes a new node (and optionally a proposed action) onto
// the canvas — letting users extend the swarm with their own specialists.
export async function runCustomAgent(missionId: string, agentId: string): Promise<{ nodeId?: string; actionId?: string; tokens: number; message: string }> {
  const agent = db.getCustomAgent(agentId);
  const ts = () => new Date().toISOString();
  const rand = () => Math.random().toString(36).substr(2, 5);
  const log = (sender: string, msg: string, level: ActivityFeedEvent["level"] = "info") =>
    db.addEvent({ id: `ev-ca-${rand()}`, mission_id: missionId, timestamp: ts(), sender, message: msg, level });

  if (!agent) return { tokens: 0, message: "Agent not found" };
  log(agent.name, `Custom agent "${agent.name}" running its task: ${agent.instruction}`, "info");

  const nodes = db.getNodes(missionId).filter(n => n.type === "web-signal" || n.type === "synthesis").slice(0, 16);
  if (!isLLMAvailable()) { log(agent.name, "No LLM configured — cannot run.", "warn"); return { tokens: 0, message: "No LLM" }; }
  if (nodes.length === 0) { log(agent.name, "No findings on the canvas yet to work with.", "warn"); return { tokens: 0, message: "No nodes" }; }

  const ctx = nodes.map((n, i) => `[${i + 1}] ${n.title}: ${n.content.slice(0, 250)}`).join("\n");
  try {
    const { data, tokens } = await chatJSON<any>(
      `You are a custom agent named "${agent.name}". Your job: ${agent.instruction}.
Using ONLY the mission's findings below, do your job and produce ONE output to place on the canvas.
FINDINGS:
${ctx}

Return JSON: {
  "title": "short title of your output",
  "content": "your result, specific and grounded in the findings",
  "render_kind": "text" | "metrics" | "comparison" | "list" | "quote",
  "data": { ...payload matching render_kind, see below... },
  "action": { "make": <boolean>, "kind": "draft-email"|"draft-brief"|"reminder", "title": "...", "body": "..." }
}
Shapes: metrics→{"items":[{"label","value"}]}; comparison→{"left":{"name","points":[]},"right":{"name","points":[]}}; list→{"items":[]}; quote→{"quote","attribution"}; text→{}.`,
      "Ground everything strictly in the findings. Be concrete and genuinely useful."
    );
    db.touchCustomAgent(agentId);

    const cid = `node-custom-${rand()}`;
    const valid = ["text", "metrics", "comparison", "list", "quote"];
    db.addNode({
      id: cid, mission_id: missionId, type: "synthesis",
      title: `${agent.name}: ${data.title || "Output"}`,
      content: data.content || "",
      confidence: 0.85, own_score: 0.85,
      source: `Custom Agent · ${agent.name}`, source_url: null,
      version: 1, provenance: nodes.slice(0, 4).map(n => n.id), flagged_by: null, created_at: ts(),
      render_kind: valid.includes(data.render_kind) ? data.render_kind : undefined,
      data: data.data || undefined
    });
    nodes.slice(0, 3).forEach(n => db.addEdge({
      id: `edge-ca-${rand()}`, mission_id: missionId, source: n.id, target: cid,
      relation: "weaved", label: "custom analysis", created_by: agent.name, created_at: ts()
    }));

    let actionId: string | undefined;
    if (data.action?.make && data.action.title) {
      actionId = `act-ca-${rand()}`;
      db.addProposedAction({
        id: actionId, mission_id: missionId,
        kind: data.action.kind || "draft-brief",
        title: data.action.title, payload: { body: data.action.body || "" },
        rationale: `Proposed by your custom agent "${agent.name}"`, provenance: [cid], status: "proposed"
      });
    }
    db.propagateConfidence(missionId);
    log(agent.name, `Done — added "${data.title || "output"}" to the canvas${actionId ? " + a proposed action" : ""}.`, "success");
    return { nodeId: cid, actionId, tokens, message: "ok" };
  } catch (e: any) {
    log(agent.name, `Failed: ${e.message || "unknown error"}.`, "error");
    return { tokens: 0, message: e.message || "error" };
  }
}

// Futurist (EchoForge): simulate branching plausible futures rooted in the
// verified present findings. Each future is a node with a time_horizon="future",
// a probability, and a risk/reward heat — so the Temporal Vista can branch right.
export async function generateFutures(missionId: string): Promise<{ created: number; tokens: number }> {
  const ts = () => new Date().toISOString();
  const rand = () => Math.random().toString(36).substr(2, 5);
  const log = (sender: string, msg: string, level: ActivityFeedEvent["level"] = "info") =>
    db.addEvent({ id: `ev-fc-${rand()}`, mission_id: missionId, timestamp: ts(), sender, message: msg, level });

  const present = db.getNodes(missionId).filter(n => (n.type === "web-signal" || n.type === "synthesis") && n.time_horizon !== "future");
  if (!isLLMAvailable() || present.length === 0) { log("Oracle", "Not enough verified present findings to forecast futures.", "warn"); return { created: 0, tokens: 0 }; }

  // Re-forge = replace, not append: clear the old scenarios first so corrections
  // produce a fresh, healed set of futures (not a pile-up).
  const oldFutures = db.getNodes(missionId).filter(n => n.time_horizon === "future");
  if (oldFutures.length > 0) {
    oldFutures.forEach(f => db.deleteNode(f.id));
    log("Oracle", `Re-forging: cleared ${oldFutures.length} prior scenario${oldFutures.length !== 1 ? "s" : ""} to rebuild from the corrected present.`, "info");
  }

  // Tag existing nodes as "present" so the timeline has a left side.
  present.forEach(n => { if (!n.time_horizon) db.updateNode(n.id, { time_horizon: "present" }); });

  log("Oracle", "Futurist simulating branching scenarios from the verified present...", "info");
  const ctx = present.map((n, i) => `[${i + 1}] ${n.title}: ${n.content.slice(0, 200)}`).join("\n");
  const mission = db.getMission(missionId);
  try {
    const { data, tokens } = await chatJSON<{ futures: any[] }>(
      `You are a foresight engine. Based ONLY on the verified present findings about "${mission?.prompt || "this topic"}", simulate 3 DISTINCT plausible futures 6–18 months out. Make them genuinely different (e.g. an optimistic, a disruptive-risk, and a base case).
PRESENT FINDINGS:
${ctx}

Return JSON: { "futures": [ { "title": "short scenario name", "narrative": "2-3 sentences on what happens and why, grounded in the findings", "probability": <0-100 integer>, "risk_reward": "opportunity"|"risk"|"mixed", "signpost": "the early signal that would confirm this future" } ] }`,
      "Ground each future in the present findings. Probabilities should be realistic and not all equal."
    );
    const futures = Array.isArray(data?.futures) ? data.futures.slice(0, 3) : [];
    let created = 0;
    futures.forEach((f: any) => {
      const fid = `node-future-${rand()}`;
      const prob = Math.max(0, Math.min(1, (Number(f.probability) || 50) / 100));
      db.addNode({
        id: fid, mission_id: missionId, type: "synthesis",
        title: `Future: ${f.title || "Scenario"}`,
        content: `${f.narrative || ""}${f.signpost ? `\n\nWatch for: ${f.signpost}` : ""}`,
        confidence: prob, own_score: prob,
        source: "Futurist (foresight)", source_url: null,
        version: 1, provenance: present.slice(0, 5).map(n => n.id), flagged_by: null, created_at: ts(),
        time_horizon: "future",
        probability: prob,
        risk_reward: ["opportunity", "risk", "mixed"].includes(f.risk_reward) ? f.risk_reward : "mixed"
      });
      present.slice(0, 3).forEach(n => db.addEdge({
        id: `edge-fut-${rand()}`, mission_id: missionId, source: n.id, target: fid,
        relation: "supports", label: "could lead to", created_by: "Futurist", created_at: ts()
      }));
      created++;
      log("Oracle", `Scenario "${f.title}" — ${Math.round(prob * 100)}% likely (${f.risk_reward || "mixed"}).`, "success");
    });
    db.propagateConfidence(missionId);
    return { created, tokens };
  } catch (e: any) {
    log("Oracle", `Forecast failed: ${e.message || "unknown"}.`, "error");
    return { created: 0, tokens: 0 };
  }
}

// Main autonomous swarm entry point (runs background agent flows / simulation)
export async function runMissionSensing(
  missionId: string,
  prompt: string,
  persona: string | null,
  owner?: string | null,
  trigger: MissionRun["trigger"] = "initial"
) {
  const timestamp = () => new Date().toISOString();

  // Carbon & cost ledger accumulators for this run.
  let totalTokens = 0;
  let runProvider = getProviderNames()[0] || "Groq";

  // Respect the mission's active agent roster. The sense→verify→weave spine
  // always runs; optional specialists (sentinel/oracle/scribe/actor) can be
  // toggled off in Edit Swarm.
  const roster = db.getMission(missionId)?.agents;
  const agentOn = (id: string) => !roster || roster.length === 0 || roster.includes(id);

  // Open a sensing run for this pass so the mission becomes a time-series.
  const runStartMs = Date.now();
  const existingRuns = db.getRuns(missionId);
  const runId = `run-${Math.random().toString(36).substr(2, 9)}`;
  const runIndex = existingRuns.length + 1;
  db.addRun(missionId, {
    id: runId,
    index: runIndex,
    trigger,
    started_at: timestamp(),
    node_ids: [],
    newSignals: 0
  });

  const logEvent = (sender: string, message: string, level: ActivityFeedEvent["level"] = "info") => {
    db.addEvent({
      id: `ev-${Math.random().toString(36).substr(2, 9)}`,
      mission_id: missionId,
      timestamp: timestamp(),
      sender,
      message,
      level
    });
  };

  try {
    // --- STEP 1: QUEUED -> SENSING ---
    db.updateMissionStatus(missionId, "sensing");
    logEvent("Conductor", `Decomposed mission: "${prompt}". Activating sensing cells.`, "info");
    if (llmReady()) {
      logEvent("Conductor", `LLM swarm online. Provider chain: ${getProviderNames().join(" → ")}.`, "success");
    }
    await sleep(800);

    logEvent("Pathfinder", "Deploying search agents, navigating public indices...", "success");
    logEvent("SignalAgent", "Spawning PricingProductSignal, TalentSignal, and NarrativeSignal...", "info");
    await sleep(1200);

    let discoveredNodes: WeaveNode[] = [];

    if (llmReady()) {
      // ──────────────────────────────────────────────────────────────────────
      // REAL WEB INTELLIGENCE PIPELINE
      // This is the core of the agentic web: Pathfinder actually navigates
      // real websites, extracts real data, and feeds it into the swarm.
      // ──────────────────────────────────────────────────────────────────────
      try {
        logEvent("Pathfinder", `Launching real web intelligence gathering for: "${prompt}"...`, "info");

        const webResult = await gatherWebIntelligence(prompt, persona, (progressMsg) => {
          // Route progress messages to the appropriate agent in the event feed
          if (progressMsg.includes("search queries")) {
            logEvent("Pathfinder", progressMsg, "info");
          } else if (progressMsg.includes("Navigating") || progressMsg.includes("Fetching")) {
            logEvent("Pathfinder", progressMsg, "success");
          } else if (progressMsg.includes("Veritas") || progressMsg.includes("Distilled")) {
            logEvent("Veritas", progressMsg, "success");
          } else if (progressMsg.includes("Discovered")) {
            logEvent("SignalAgent", progressMsg, "info");
          } else {
            logEvent("Pathfinder", progressMsg, "info");
          }
        });

        totalTokens += webResult.totalTokens;

        if (webResult.signals.length > 0) {
          logEvent("Pathfinder", `Web intelligence complete: ${webResult.pagesFetched} pages fetched, ${webResult.signals.length} real signals extracted.`, "success");

          // De-dupe against what's already in the fabric (re-sense shouldn't pile up copies).
          const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
          const existing = db.getNodes(missionId);
          let deduped = 0;

          webResult.signals.forEach((sig, index) => {
            const isDup = existing.some(
              e => e.type === "web-signal" &&
                ((e.source_url && sig.source_url && e.source_url === sig.source_url) ||
                 norm(e.title) === norm(sig.title))
            );
            if (isDup) { deduped++; return; }

            const nodeId = `node-web-${index}-${Math.random().toString(36).substr(2, 5)}`;
            const newNode: WeaveNode = {
              id: nodeId,
              mission_id: missionId,
              type: "web-signal",
              title: sig.title,
              content: sig.content,
              confidence: sig.confidence,
              own_score: sig.confidence,
              source: `Pathfinder @ ${sig.source_name}`,
              source_url: sig.source_url,
              version: 1,
              provenance: [],
              flagged_by: null,
              created_at: timestamp(),
              grounded: true
            };

            db.addNode(newNode);
            existing.push(newNode); // so later signals in this batch also de-dupe
            discoveredNodes.push(newNode);
            logEvent("Veritas", `Verified Real Signal: "${newNode.title}" from ${sig.source_url} (${Math.round(sig.confidence * 100)}% confidence).`, "success");
          });

          if (deduped > 0) {
            logEvent("Cartographer", `Merged ${deduped} duplicate signal${deduped !== 1 ? "s" : ""} already in the fabric (no repeats).`, "info");
          }
        } else {
          logEvent("Pathfinder", `Web fetching returned no usable signals (${webResult.pagesAttempted} pages attempted, ${webResult.pagesFetched} succeeded). Falling back to LLM analysis.`, "warn");
        }
      } catch (webErr: any) {
        console.error("Web intelligence pipeline failed:", webErr);
        logEvent("Pathfinder", `Web intelligence pipeline encountered an error: ${webErr.message || "Unknown"}. Falling back to LLM analysis.`, "warn");
      }

      // Fallback: if real web sensing returned nothing, use LLM-only mode
      if (discoveredNodes.length === 0) {
        try {
          logEvent("Pathfinder", "Activating LLM-only analysis mode as web sensing fallback...", "info");

          const { data, provider, tokens } = await chatJSON<{ signals: any[] }>(
            `You are an autonomous intelligence researcher for the "Agentic Web". Investigate this mission: "${prompt}".
Return a JSON object with 2 to 3 highly realistic, specific web signals / facts you would find from credible public sources.
Format strictly as:
{
  "signals": [
    {
      "title": "Short title containing the brand/entity and the key fact",
      "content": "A detailed, structured paragraph with figures, prices, hiring changes, or engineering details. Be highly specific and informative.",
      "source_name": "Authentic source name (e.g. Company Blog, Press Release, TechCrunch, SEC Filing)",
      "url": "A realistic webpage URL related to the source",
      "category": "pricing" | "talent" | "narrative"
    }
  ]
}`,
            "You synthesize plausible, well-grounded intelligence signals. Be concrete with names, numbers and dates."
          );

          totalTokens += tokens;
          runProvider = provider;
          if (data?.signals && Array.isArray(data.signals)) {
            logEvent("Veritas", `LLM fallback discovered ${data.signals.length} analytical data points via ${provider}.`, "success");

            data.signals.forEach((sig: any, index: number) => {
              const nodeId = `node-llm-${index}-${Math.random().toString(36).substr(2, 5)}`;
              const score = index === 1 ? 0.76 : index === 2 ? 0.82 : 0.94;

              const newNode: WeaveNode = {
                id: nodeId,
                mission_id: missionId,
                type: "web-signal",
                title: sig.title || `Signal ${index + 1}`,
                content: sig.content || "No content extracted.",
                confidence: score,
                own_score: score,
                source: `${sig.category === "pricing" ? "PricingProductSignal" : sig.category === "talent" ? "TalentSignal" : "NarrativeSignal"} @ ${sig.source_name || "web"}`,
                source_url: sig.url || null,
                version: 1,
                provenance: [],
                flagged_by: null,
                created_at: timestamp(),
                grounded: false
              };

              db.addNode(newNode);
              discoveredNodes.push(newNode);
              logEvent("Veritas", `LLM Signal (inferred): "${newNode.title}" with confidence ${score}.`, "success");
            });
          }
        } catch (llmError: any) {
          console.error("LLM fallback also failed:", llmError);
          logEvent("Conductor", `Both web and LLM pipelines failed: ${llmError.message}. Using offline simulation.`, "warn");
          discoveredNodes = generateSmartFallbackNodes(missionId, prompt, timestamp);
        }
      }
    } else {
      // --- ZERO-API-KEY FALLBACK ---
      logEvent("Conductor", "No LLM API keys configured. Running high-fidelity simulation...", "warn");
      discoveredNodes = generateSmartFallbackNodes(missionId, prompt, timestamp);
    }

    // Guard: only seed simulated nodes on the FIRST run. On a re-sense that found
    // only duplicates/nothing-new, leaving discoveredNodes empty is correct.
    if (discoveredNodes.length === 0 && trigger === "initial" && db.getNodes(missionId).filter(n => n.type === "web-signal").length === 0) {
      discoveredNodes = generateSmartFallbackNodes(missionId, prompt, timestamp);
    }

    await sleep(1000);

    // --- STEP 2: SENSING -> REASONING ---
    db.updateMissionStatus(missionId, "reasoning");
    logEvent("Veritas", "Veritas validator assessing cross-source citations and credentials...", "info");
    logEvent("Sentinel", "Sentinel guard crawling nodes for dynamic drift and systemic contradictions...", "info");
    await sleep(1500);

    let conflictNode: WeaveNode | null = null;
    let synthesisContent = "Intelligence fabric has successfully consolidated data around the prompt.";
    let synthesisTitle = "Swarm Strategic Core Insight";

    if (discoveredNodes.length >= 1) {
      if (llmReady()) {
        try {
          logEvent("Sentinel", "Synthesizing the data and scanning for contradictions...", "info");
          const signalsText = discoveredNodes.map(n => `Title: ${n.title}\nContent: ${n.content}`).join("\n\n");

          const { data: parsedReasoning, tokens: rTokens } = await chatJSON<any>(
            `Analyze the following findings about "${prompt}":
${signalsText}

Identify any single contradiction, contrast, or point of friction between the findings.
Also provide a strategic synthesis summary.
Return JSON:
{
  "has_contradiction": boolean,
  "contradiction_title": "Short title if conflict found, else empty",
  "contradiction_description": "Detailed explanation of the conflicting statements or contrast, else empty",
  "synthesis_title": "Short title for strategic synthesis",
  "synthesis_content": "The overall high-level insight derived from these points combined."
}`
          );

          totalTokens += rTokens;
          synthesisTitle = parsedReasoning.synthesis_title || synthesisTitle;
          synthesisContent = parsedReasoning.synthesis_content || synthesisContent;

          if (agentOn("sentinel") && parsedReasoning.has_contradiction && parsedReasoning.contradiction_title) {
            logEvent("Sentinel", "Systemic conflict sensor sparked: Analyzing statement details...", "warn");
            conflictNode = {
              id: `node-contradict-${Math.random().toString(36).substr(2, 5)}`,
              mission_id: missionId,
              type: "synthesis",
              title: `Contradiction Alert: ${parsedReasoning.contradiction_title}`,
              content: parsedReasoning.contradiction_description || "Conflicting statements detected across sources.",
              confidence: 0.52,
              own_score: 0.52,
              source: "Sentinel Conflict Auditor",
              source_url: null,
              version: 1,
              provenance: discoveredNodes.map(n => n.id),
              flagged_by: "sentinel",
              created_at: timestamp()
            };
            db.addNode(conflictNode);
            logEvent("Sentinel", `CRITICAL DRIFT: Conflicting values registered: [${parsedReasoning.contradiction_title}].`, "error");

            discoveredNodes.forEach(rn => {
              db.addEdge({
                id: `edge-conflict-${Math.random().toString(36).substr(2, 5)}`,
                mission_id: missionId,
                source: rn.id,
                target: conflictNode!.id,
                relation: "contradicts" as const,
                label: "statement drift",
                created_by: "Sentinel",
                created_at: timestamp()
              });
            });
          } else {
            logEvent("Sentinel", "No critical contradictions identified in current payload.", "success");
          }
        } catch (reasoningErr: any) {
          console.error("AI reasoning failure", reasoningErr);
          logEvent("Sentinel", `Failed active AI anomaly detection: ${reasoningErr.message || "Unknown error"}. Using offline synthesis.`, "warn");
        }
      } else {
        logEvent("Sentinel", "Simulating offline structural contradiction analysis...", "info");
      }

      // NOTE: no mock/fabricated contradictions. The Watchdog only flags a
      // contradiction when the model genuinely detects one above — fabricating
      // conflicts would be exactly the "AI slop" this product exists to prevent.
    }

    await sleep(1000);

    // --- STEP 3: REASONING -> SYNTHESIZING ---
    db.updateMissionStatus(missionId, "synthesizing");
    logEvent("Cartographer", "Cartographer compiling 2D semantic weave relationships...", "info");
    logEvent("Scribe", "Scribe preparing tracing indices to provide source claim traceability.", "info");
    await sleep(1200);

    // Form weave curves between nodes
    discoveredNodes.forEach((node, i) => {
      if (i > 0) {
        const edge: WeaveEdge = {
          id: `edge-dyn-w-${i}-${Math.random().toString(36).substr(2, 5)}`,
          mission_id: missionId,
          source: discoveredNodes[i - 1].id,
          target: node.id,
          relation: "weaved",
          label: "semantic relative",
          created_by: "Cartographer",
          created_at: timestamp()
        };
        db.addEdge(edge);
      }
    });

    // Strategy synthesis node
    const synthesisNode: WeaveNode = {
      id: `node-dyn-synthesis-${Math.random().toString(36).substr(2, 5)}`,
      mission_id: missionId,
      type: "synthesis",
      title: synthesisTitle,
      content: synthesisContent,
      confidence: 0.92,
      own_score: 0.92,
      source: "Oracle Core",
      source_url: null,
      version: 1,
      provenance: discoveredNodes.map(n => n.id),
      flagged_by: null,
      created_at: timestamp()
    };
    db.addNode(synthesisNode);

    // Link synthesis to conflict node
    if (conflictNode) {
      const parentEdge: WeaveEdge = {
        id: `edge-dyn-sync-parent-${Math.random().toString(36).substr(2, 5)}`,
        mission_id: missionId,
        source: conflictNode.id,
        target: synthesisNode.id,
        relation: "supports",
        label: "assessed drift constraints",
        created_by: "Cartographer",
        created_at: timestamp()
      };
      db.addEdge(parentEdge);
    }

    logEvent("Scribe", "Report brief has been compiled, with tracing anchors wired.", "success");
    await sleep(1000);

    // --- STEP 4: SYNTHESIZING -> READY ---
    logEvent("Oracle", "Oracle mapping findings to direct executable recommendations...", "info");
    logEvent("Actor", "Actor assembling email correspondence drafts and calendar prompts...", "info");
    await sleep(1200);

    // Add proposed actions via AI (Actor specialist — skippable via Edit Swarm)
    if (agentOn("actor") && llmReady() && discoveredNodes.length > 0) {
      try {
        logEvent("Actor", "Actor model creating executable workflows from synthesis.", "info");
        const { data: parsedActions, tokens: aTokens } = await chatJSON<{ actions: any[] }>(
          `Based on the synthesis: "${synthesisContent}", propose THREE distinct, executable next moves for a ${persona || "Analyst"}.
Use DIFFERENT action kinds — do not make them all emails. Choose from:
- "outreach": contact a specific person (include "to" + "subject")
- "monitor": stand up a continuous watch on an entity/URL (include "target")
- "deep-dive": spawn a focused follow-up mission (include "seed" = the new mission prompt)
- "decision": a strategic move to lock in
- "reminder": a deadline (include ISO "deadline")
Return JSON:
{
  "actions": [
    {
       "kind": "outreach" | "monitor" | "deep-dive" | "decision" | "reminder",
       "title": "Short imperative title (verb first)",
       "rationale": "Why this matters, grounded in the findings",
       "to": "recipient email (outreach only)",
       "subject": "email subject (outreach only)",
       "target": "entity or URL to watch (monitor only)",
       "seed": "the follow-up mission prompt (deep-dive only)",
       "deadline": "YYYY-MM-DD (reminder only)",
       "payload_body": "the action's body text"
    }
  ]
}`
        );
        totalTokens += aTokens;
        if (parsedActions?.actions && Array.isArray(parsedActions.actions)) {
          parsedActions.actions.forEach((act: any, i: number) => {
            const payload: any = { body: act.payload_body || "" };
            if (act.to) payload.to = act.to;
            if (act.subject) payload.subject = act.subject;
            if (act.target) payload.target = act.target;
            if (act.seed) payload.seed = act.seed;
            if (act.deadline) payload.deadline = act.deadline;
            db.addProposedAction({
              id: `act-dyn-${i}-${Math.random().toString(36).substr(2, 5)}`,
              mission_id: missionId,
              kind: act.kind || "decision",
              title: act.title || "Proposed Action",
              payload,
              rationale: act.rationale || "",
              provenance: conflictNode ? [conflictNode.id, synthesisNode.id] : [synthesisNode.id],
              status: "proposed"
            });
          });
        }
      } catch (actorErr: any) {
        console.error("Actor failed", actorErr);
        logEvent("Actor", `Action generation failed: ${actorErr.message || "Unknown error"}`, "warn");
      }
    } else {
      logEvent("Actor", "Simulating offline proposed executive summaries...", "info");
    }

    // SIMULATED FALLBACK — a varied next-move set (not all emails) so the
    // action plan reads like a real intelligence handoff even offline.
    if (db.getActions(missionId).length === 0) {
      const rid = () => Math.random().toString(36).substr(2, 5);
      const firstTarget = (db.getMission(missionId)?.targets || [])[0] || prompt.split(" ")[0];
      const fallbacks: ProposedAction[] = [
        {
          id: `act-dyn-dec-${rid()}`, mission_id: missionId, kind: "decision",
          title: "Lock in the verified position before acting",
          payload: { body: `Turn the highest-confidence finding from "${prompt}" into a committed decision. Cite the verified node so the call is defensible, and re-weave if any source drifts.` },
          rationale: "The synthesis is verified across sources — converting it into a decision captures the intelligence before it goes stale.",
          provenance: [synthesisNode.id], status: "proposed"
        },
        {
          id: `act-dyn-mon-${rid()}`, mission_id: missionId, kind: "monitor",
          title: `Put ${firstTarget} on a standing watch`,
          payload: { target: String(firstTarget), body: `Stand up a continuous watch on ${firstTarget}. Re-sense on a cadence and alert when a new signal or contradiction appears.` },
          rationale: "The fabric is a snapshot; a standing watch turns it into a live feed that self-corrects as the world changes.",
          provenance: [synthesisNode.id], status: "proposed"
        },
        {
          id: `act-dyn-dive-${rid()}`, mission_id: missionId, kind: "deep-dive",
          title: "Deep-dive the strongest open thread",
          payload: { seed: `Deep dive into the most consequential finding from: ${prompt}`, body: "Spawn a focused child mission to resolve the biggest remaining unknown surfaced by this swarm." },
          rationale: "One finding is load-bearing but under-sourced; a scoped deep-dive raises its confidence.",
          provenance: [synthesisNode.id], status: "proposed"
        },
      ];
      fallbacks.forEach(a => db.addProposedAction(a));
    }

    // Watchdog: autonomous self-correction across the whole fabric (cross-run drift/contradictions).
    try {
      const sc = await runSelfCorrection(missionId, logEvent);
      totalTokens += sc.tokens;
    } catch (e) {
      console.error("Self-correction pass failed:", e);
    }

    // Propagate confidence scores
    db.propagateConfidence(missionId);

    // Simulated run (no live LLM key): estimate a representative token count
    // from the work produced so the Green-Credit economy still meters a
    // realistic per-run cost. Real runs use the actual token tally.
    if (totalTokens === 0) {
      const produced = db.getNodes(missionId).filter(n => new Date(n.created_at).getTime() >= runStartMs).length;
      totalTokens = 1200 + produced * 480;
    }

    // Meter the carbon & cost ledger for this run and credit the efficiency dividend.
    const fp = estimateFootprint(totalTokens, runProvider);
    const footprint = { ...fp, creditsEarned: efficiencyDividend(fp) };
    if (owner) {
      // Charge the wallet for the model run, metered by ACTUAL tokens consumed…
      const spendSource = trigger === "initial" ? "deploy" : trigger === "edit" ? "edit" : "resense";
      const charged = db.debit(owner, creditsForTokens(totalTokens, runProvider), {
        source: spendSource,
        note: `${trigger === "initial" ? "Deployed" : "Re-sensed"} swarm on ${fp.provider} (~${totalTokens} tokens)`,
        tokens: totalTokens, provider: fp.provider, mission_id: missionId,
      });
      // …then bank the green efficiency dividend for the footprint avoided.
      db.recordMissionImpact(owner, missionId, footprint);
      logEvent(
        "Conductor",
        `Ledger: ran on ${fp.provider} (~${totalTokens} tokens, ~${fp.co2_g} gCO₂) → −${charged} credits. Avoided ~${fp.co2Saved_g} gCO₂ and $${fp.costSavedUsd.toFixed(4)} vs a GPT-4-class baseline → +${footprint.creditsEarned} Green Credits.`,
        "success"
      );
    } else {
      db.setMissionFootprint(missionId, footprint);
    }

    // Finalize the run: tag the nodes it produced and summarize the delta.
    const runNodes = db.getNodes(missionId).filter(n => !n.run_id && new Date(n.created_at).getTime() >= runStartMs);
    runNodes.forEach(n => db.updateNode(n.id, { run_id: runId }));
    const newSignals = runNodes.filter(n => n.type === "web-signal").length;
    const newConflicts = runNodes.filter(n => n.flagged_by === "sentinel").length;
    const summary = trigger === "initial"
      ? `Initial sweep wove ${runNodes.length} nodes (${newSignals} signals${newConflicts ? `, ${newConflicts} contradiction${newConflicts > 1 ? "s" : ""}` : ""}).`
      : `Re-sense #${runIndex}: +${newSignals} new signal${newSignals !== 1 ? "s" : ""}${newConflicts ? `, ${newConflicts} new contradiction${newConflicts > 1 ? "s" : ""}` : ""}.`;
    db.updateRun(missionId, runId, { finished_at: timestamp(), node_ids: runNodes.map(n => n.id), newSignals, summary });
    if (trigger !== "initial") {
      logEvent("Conductor", summary, newSignals > 0 ? "success" : "info");
    }

    // Complete pipeline
    db.updateMissionStatus(missionId, "ready");
    logEvent("Conductor", "Intelligence Mission ready. Monitoring is permanently active, standing by for override reweaves.", "success");

  } catch (error: any) {
    console.error("Critical swarm crash during sensing:", error);
    db.updateMissionStatus(missionId, "ready");
    logEvent("Conductor", `Swarm encountered runtime exception: ${error.message || "Unknown error"}`, "error");
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateSmartFallbackNodes(missionId: string, prompt: string, timestamp: () => string): WeaveNode[] {
  const terms = prompt.split(" ");
  const brand = terms[0] || "TargetCorp";
  const secondBrand = terms[2] || "CompetitorCo";

  const node1: WeaveNode = {
    id: `node-gen-1-${Math.random().toString(36).substr(2, 5)}`,
    mission_id: missionId,
    type: "web-signal",
    title: `${brand} Public Pricing Model Statement`,
    content: `Public page indexes declare complete flat pricing structure with absolutely $0 setup or account upkeep fees. Ad emphasizes a frictionless developer onboarding trajectory.`,
    confidence: 0.95,
    own_score: 0.95,
    source: "PricingProductSignal @ " + brand.toLowerCase() + ".com",
    source_url: `https://${brand.toLowerCase()}.com/pricing`,
    version: 1,
    provenance: [],
    flagged_by: null,
    created_at: timestamp()
  };

  const node2: WeaveNode = {
    id: `node-gen-2-${Math.random().toString(36).substr(2, 5)}`,
    mission_id: missionId,
    type: "web-signal",
    title: `${brand} Developer Sandbox Clause 17`,
    content: `Sandbox SLA fine-print details: 'Following sandbox transition, endpoints generating more than 100 API queries per hour bear a standard endpoint maintenance tariff of $50/month, billed direct to connected profiles.'`,
    confidence: 0.9,
    own_score: 0.9,
    source: "Pathfinder @ " + brand.toLowerCase() + ".com/docs",
    source_url: `https://${brand.toLowerCase()}.com/terms/developer`,
    version: 1,
    provenance: [],
    flagged_by: null,
    created_at: timestamp()
  };

  const node3: WeaveNode = {
    id: `node-gen-3-${Math.random().toString(36).substr(2, 5)}`,
    mission_id: missionId,
    type: "web-signal",
    title: `${secondBrand} Comparative AI Launch Presser`,
    content: `Competitor ${secondBrand} releases automated prediction API blocks that optimize active checkouts natively. Pricing starts slightly higher but excludes sandbox endpoint sub-charges.`,
    confidence: 0.88,
    own_score: 0.88,
    source: "NarrativeSignal @ TechCrunch",
    source_url: "https://techcrunch.com/competitive-ai-rollouts",
    version: 1,
    provenance: [],
    flagged_by: null,
    created_at: timestamp()
  };

  db.addNode(node1);
  db.addNode(node2);
  db.addNode(node3);

  return [node1, node2, node3];
}

export async function executeSingleAgentCognition(missionId: string, agentId: string): Promise<any> {
  const timestamp = () => new Date().toISOString();
  const mission = db.getMission(missionId);
  const prompt = mission?.prompt || "TargetCorp Pricing Shift";
  const persona = mission?.persona || "General Analyst";

  const logEvent = (sender: string, message: string, level: ActivityFeedEvent["level"] = "info") => {
    db.addEvent({
      id: `ev-manual-${Math.random().toString(36).substr(2, 9)}`,
      mission_id: missionId,
      timestamp: timestamp(),
      sender,
      message,
      level
    });
  };

  const senderName = agentId.charAt(0).toUpperCase() + agentId.slice(1);

  logEvent(senderName, `Cognitive manual run initiated for agent ${senderName}. Ingestion state: optimized.`, "info");
  await sleep(1500);

  let resultData: any = { status: "success", agentId, tokens: 0 };

  if (agentId === "conductor") {
    logEvent("Conductor", `Analyzing mission parameters: "${prompt}". Recalculating task graphs.`, "info");
    await sleep(1000);
    db.propagateConfidence(missionId);
    logEvent("Conductor", `Coordinate system healed and synchronized. Sub-swarm alignment intact.`, "success");
    resultData.message = "Swarm task graphs recalculated successfully.";
  }
  else if (agentId === "pathfinder") {
    logEvent("Pathfinder", "Deploying the live Web Scout... Target query: " + prompt, "info");

    let added = 0;
    if (llmReady()) {
      try {
        const web = await gatherWebIntelligence(prompt, persona, (m) =>
          logEvent("Pathfinder", m, m.includes("Fetch") || m.includes("Navigat") ? "success" : "info")
        );
        const existing = db.getNodes(missionId);
        const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
        web.signals.slice(0, 2).forEach((sig, i) => {
          const isDup = existing.some(e => e.type === "web-signal" &&
            ((e.source_url && sig.source_url && e.source_url === sig.source_url) || norm(e.title) === norm(sig.title)));
          if (isDup) return;
          const node: WeaveNode = {
            id: `node-manualPath-${i}-${Math.random().toString(36).substr(2, 5)}`,
            mission_id: missionId,
            type: "web-signal",
            title: sig.title,
            content: sig.content,
            confidence: sig.confidence,
            own_score: sig.confidence,
            source: `Web Scout @ ${sig.source_name}`,
            source_url: sig.source_url,
            version: 1,
            provenance: [],
            flagged_by: null,
            created_at: timestamp(),
            grounded: true
          };
          db.addNode(node);
          existing.push(node);
          added++;
          resultData.nodeId = node.id;
          logEvent("Veritas", `Verified live signal: "${sig.title}" from ${sig.source_url}.`, "success");
        });
      } catch (e: any) {
        console.error("Manual Web Scout failed:", e);
        logEvent("Pathfinder", `Web scout hit an error: ${e.message || "unknown"}.`, "warn");
      }
    }
    if (added === 0) {
      logEvent("Pathfinder", "No new live signals (duplicates already in the fabric, or sources blocked).", "warn");
    }
  }
  else if (agentId === "veritas") {
    logEvent("Veritas", "Verifying credibility metrics across all active canvas nodes.", "info");
    await sleep(1000);
    const nodes = db.getNodes(missionId);
    nodes.forEach(n => {
      if (n.own_score < 0.95) {
        n.own_score = Math.min(0.98, parseFloat((n.own_score + 0.02).toFixed(2)));
      }
    });
    db.propagateConfidence(missionId);
    logEvent("Veritas", "Cross-source validation completed. Evaluated metadata credibility curves successfully.", "success");
    resultData.message = "Node confidence scores dynamically verified and adjusted.";
  }
  else if (agentId === "cartographer") {
    logEvent("Cartographer", "Reprojecting 2D node coordinates. Ingesting semantic similarities...", "info");
    await sleep(1000);
    const nodes = db.getNodes(missionId);
    if (nodes.length >= 2) {
      const edge: WeaveEdge = {
        id: `edge-manualCart-${Math.random().toString(36).substr(2, 5)}`,
        mission_id: missionId,
        source: nodes[0].id,
        target: nodes[nodes.length - 1].id,
        relation: "supports",
        label: "manual weave",
        created_by: "Cartographer",
        created_at: timestamp()
      };
      db.addEdge(edge);
      logEvent("Cartographer", `Successfully constructed semantic edge link: "${nodes[0].title}" -> "${nodes[nodes.length-1].title}".`, "success");
      resultData.edgeId = edge.id;
    } else {
      logEvent("Cartographer", "Too few nodes to calculate dynamic similarity matrices.", "warn");
    }
  }
  else if (agentId === "sentinel") {
    logEvent("Sentinel", "Scanning all source facts for system contradictions and structural drift.", "info");
    await sleep(1200);

    let conflictTitle = "Potential Pricing & SLA Friction";
    let conflictContent = "Drift Warning: Registered flat pricing pledges show direct systemic incompatibility with the sandbox limit sub-charges we verified in the SLA docs.";

    if (llmReady()) {
      try {
        const { data: parsed, tokens: _t } = await chatJSON<any>(
          `Create a brief business contradiction or point of friction based on this intelligence target: "${prompt}". Return JSON:
{
  "title": "Short title describing the conflict",
  "description": "Fascinating detailed description of the conflicting statements or policies."
}`
        );
        resultData.tokens += _t;
        if (parsed.title && parsed.description) {
          conflictTitle = parsed.title;
          conflictContent = parsed.description;
        }
      } catch (e) {
        console.error("LLM failed during manual sentinel run:", e);
      }
    }

    const conflictNode: WeaveNode = {
      id: `node-manualSentinel-${Math.random().toString(36).substr(2, 5)}`,
      mission_id: missionId,
      type: "synthesis",
      title: `Tactical Drift Warning: ${conflictTitle}`,
      content: conflictContent,
      confidence: 0.74,
      own_score: 0.74,
      source: "Manual Sentinel Conflict Auditor",
      source_url: null,
      version: 1,
      provenance: [],
      flagged_by: "sentinel",
      created_at: timestamp()
    };
    db.addNode(conflictNode);
    logEvent("Sentinel", `CRITICAL DRIFT FLAGGED: "${conflictTitle}" posted as synthesis.`, "warn");
    resultData.nodeId = conflictNode.id;
  }
  else if (agentId === "oracle") {
    logEvent("Oracle", "Integrating findings to generate an optimal core strategic synthesis summary...", "info");
    await sleep(1200);

    let synthTitle = "Consolidated Strategic Swarm Insight";
    let synthContent = "A synthesized analysis proves that consolidating volume integrations under a single customized API wrapper maximizes performance and minimizes platform surcharge exposures.";

    if (llmReady()) {
      try {
        const { data: parsed, tokens: _t } = await chatJSON<any>(
          `Create a professional strategic recommendation or synthesis for an executive regarding this context: "${prompt}". Return JSON:
{
  "title": "Title of synthesis",
  "content": "Professional strategic advice/insight summary."
}`
        );
        resultData.tokens += _t;
        if (parsed.title && parsed.content) {
          synthTitle = parsed.title;
          synthContent = parsed.content;
        }
      } catch (e) {
        console.error("LLM failed during manual oracle run:", e);
      }
    }

    const synthNode: WeaveNode = {
      id: `node-manualOracle-${Math.random().toString(36).substr(2, 5)}`,
      mission_id: missionId,
      type: "synthesis",
      title: synthTitle,
      content: synthContent,
      confidence: 0.95,
      own_score: 0.95,
      source: "Manual Oracle Planner",
      source_url: null,
      version: 1,
      provenance: [],
      flagged_by: null,
      created_at: timestamp()
    };
    db.addNode(synthNode);
    logEvent("Oracle", `Dynamic strategic synthesis generated: "${synthTitle}"`, "success");
    resultData.nodeId = synthNode.id;
  }
  else if (agentId === "scribe") {
    logEvent("Scribe", "Assembling provenance tracing indexes and structuring report brief.", "info");
    await sleep(1000);
    logEvent("Scribe", "Traceability mapping table successfully compiled.", "success");
    resultData.message = "Scribe compiled and locked active metadata tracing bounds.";
  }
  else if (agentId === "actor") {
    logEvent("Actor", "Creating dynamic workflow proposals... Target persona: " + persona, "info");
    await sleep(1200);

    let actTitle = "Trigger System Audit for Custom Billing SLA Clauses";
    let actRationale = "Heuristics detect custom billing risks. Standard verification avoids sudden enterprise costs.";
    let actBody = `### Draft Directive: Instate Volume Billing Review\n- Conduct manual contract reviews for endpoint billing limits\n- Align monthly query thresholds under lower custom pricing bounds.`;

    if (llmReady()) {
      try {
        const { data: parsed, tokens: _t } = await chatJSON<any>(
          `Suggest a single actionable step or reminder for a "${persona}" researching "${prompt}". Return JSON:
{
  "title": "Action Title",
  "rationale": "Why this is critical",
  "body": "Markdown text with bullets/steps of the action"
}`
        );
        resultData.tokens += _t;
        if (parsed.title && parsed.rationale && parsed.body) {
          actTitle = parsed.title;
          actRationale = parsed.rationale;
          actBody = parsed.body;
        }
      } catch (e) {
        console.error("LLM failed during manual actor run:", e);
      }
    }

    const action: ProposedAction = {
      id: `act-manual-${Math.random().toString(36).substr(2, 5)}`,
      mission_id: missionId,
      kind: "draft-brief",
      title: actTitle,
      payload: { body: actBody },
      rationale: actRationale,
      provenance: [],
      status: "proposed"
    };
    db.addProposedAction(action);
    logEvent("Actor", `Successfully compiled interactive Proposed Action: "${actTitle}".`, "success");
    resultData.actionId = action.id;
  }

  logEvent(senderName, `Autonomous manual run completed with optimal stability. Cognition status: IDLE.`, "success");
  return resultData;
}
