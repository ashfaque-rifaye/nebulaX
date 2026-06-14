import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db.ts";
import { runMissionSensing, executeSingleAgentCognition, planMissionVariants, answerFabricQuestion, runSelfCorrection, enrichMissionNodes, runCustomAgent, generateFutures } from "./src/agents.ts";
import { WeaveNode } from "./src/types.ts";
import { isLLMAvailable, getProviderNames, chat, chatJSON, getLLMConfigSummary, updateLLMConfig, testProvider } from "./src/llm.ts";
import { PLEDGES, DEPLOY_COST, MANUAL_AGENT_COST, MIN_RUN_RESERVE, creditsForTokens, creditsForImage, creditsForVideo } from "./src/footprint.ts";
import { generateMedia, getMediaConfigSummary, updateMediaConfig } from "./src/media.ts";
import { ChatTurn } from "./src/types.ts";
import {
  hashPassphrase, verifyPassphrase, newSessionToken, validateHandle, validatePassphrase,
  rateLimited, recordAttempt, clearAttempts, parseCookies, serializeSessionCookie, clearSessionCookie,
  SESSION_COOKIE, SESSION_TTL_MS,
} from "./src/auth.ts";

// Load environment variables
dotenv.config();

// Augment Express's Request with the authenticated handle (set by session mw).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { handle?: string | null; }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and Urlencoded parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // True when the request arrived over HTTPS (sets the Secure cookie flag).
  const isSecure = (req: express.Request) =>
    req.secure || req.headers["x-forwarded-proto"] === "https";

  // ── Session middleware: resolve the session cookie → req.handle ──
  app.use((req, _res, next) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    req.handle = db.getSessionHandle(token);
    next();
  });

  // ── CSRF defense-in-depth: reject cross-origin state-changing API calls ──
  // SameSite=Lax already blocks most; this checks Origin against Host for any
  // mutating /api request that carries an Origin header.
  app.use((req, res, next) => {
    const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    if (mutating && req.path.startsWith("/api/")) {
      const origin = req.headers.origin;
      if (origin) {
        try {
          if (new URL(origin).host !== req.headers.host) {
            return res.status(403).json({ error: "Cross-origin request blocked." });
          }
        } catch { /* malformed Origin — fall through */ }
      }
    }
    next();
  });

  // Require an authenticated session; 401 otherwise.
  const requireAuth: express.RequestHandler = (req, res, next) => {
    if (!req.handle) return res.status(401).json({ error: "Sign in to continue.", code: "UNAUTHENTICATED" });
    next();
  };

  // --- API ROUTES FIRST ---

  // ─── AUTH ───────────────────────────────────────────────────────────────
  // Create an account: handle + passphrase (scrypt-hashed) → session cookie.
  app.post("/api/auth/signup", (req, res) => {
    try {
      const h = validateHandle(req.body?.handle);
      if ("error" in h) return res.status(400).json({ error: h.error });
      const pw = validatePassphrase(req.body?.passphrase);
      if ("error" in pw) return res.status(400).json({ error: pw.error });
      if (db.hasCredential(h.handle)) {
        return res.status(409).json({ error: "That handle is taken. Try signing in instead.", code: "HANDLE_TAKEN" });
      }
      db.setCredential(h.handle, hashPassphrase(pw.pass));
      const token = newSessionToken();
      db.createSession(h.handle, token, SESSION_TTL_MS);
      res.setHeader("Set-Cookie", serializeSessionCookie(token, isSecure(req)));
      clearAttempts(h.handle.toLowerCase());
      res.status(201).json(db.publicProfile(db.getOrCreateProfile(h.handle)));
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Signup failed" });
    }
  });

  // Sign in: verify passphrase, rotate a fresh session, set cookie.
  app.post("/api/auth/login", (req, res) => {
    try {
      const h = validateHandle(req.body?.handle);
      if ("error" in h) return res.status(400).json({ error: h.error });
      const rlKey = h.handle.toLowerCase();
      if (rateLimited(rlKey)) {
        return res.status(429).json({ error: "Too many attempts. Wait a few minutes and try again." });
      }
      const stored = db.getCredential(h.handle);
      const pass = String(req.body?.passphrase ?? "");
      if (!stored || !verifyPassphrase(pass, stored)) {
        recordAttempt(rlKey);
        return res.status(401).json({ error: "Incorrect handle or passphrase." });
      }
      clearAttempts(rlKey);
      const token = newSessionToken();
      db.createSession(h.handle, token, SESSION_TTL_MS);
      res.setHeader("Set-Cookie", serializeSessionCookie(token, isSecure(req)));
      res.json(db.publicProfile(db.getOrCreateProfile(h.handle)));
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Login failed" });
    }
  });

  // Sign out: drop the session + clear the cookie.
  app.post("/api/auth/logout", (req, res) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    db.deleteSession(token);
    res.setHeader("Set-Cookie", clearSessionCookie(isSecure(req)));
    res.json({ success: true });
  });

  // Who am I? (used to restore a session on page load)
  app.get("/api/auth/me", (req, res) => {
    if (!req.handle) return res.status(401).json({ error: "Not signed in." });
    res.json(db.publicProfile(db.getOrCreateProfile(req.handle)));
  });

  // Change passphrase: verify the current one, then re-hash the new one.
  app.post("/api/auth/change-passphrase", requireAuth, (req, res) => {
    try {
      const handle = req.handle as string;
      const stored = db.getCredential(handle);
      const current = String(req.body?.currentPassphrase ?? "");
      if (!stored || !verifyPassphrase(current, stored)) {
        return res.status(401).json({ error: "Current passphrase is incorrect." });
      }
      const pw = validatePassphrase(req.body?.newPassphrase);
      if ("error" in pw) return res.status(400).json({ error: pw.error });
      db.setCredential(handle, hashPassphrase(pw.pass));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to change passphrase" });
    }
  });

  // Healthcheck & smoke test
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      llm: {
        available: isLLMAvailable(),
        providers: getProviderNames()
      }
    });
  });

  // LLM provider status + live smoke test (verifies a provider actually responds)
  app.get("/api/llm/status", async (req, res) => {
    const providers = getProviderNames();
    if (!isLLMAvailable()) {
      return res.json({ available: false, providers: [], message: "No LLM provider configured." });
    }
    try {
      const { text, provider } = await chat(
        [{ role: "user", content: "Reply with exactly the word: OK" }],
        { maxTokens: 5, temperature: 0 }
      );
      res.json({ available: true, providers, activeProvider: provider, sample: text.trim().slice(0, 40) });
    } catch (err: any) {
      res.status(502).json({ available: true, providers, error: err.message || "All providers failed smoke test." });
    }
  });

  // ─── LLM model control: switch providers/models, supply API keys at runtime ─

  // Current configuration: catalogue, fallback chain, masked keys.
  app.get("/api/llm/config", (req, res) => {
    res.json(getLLMConfigSummary());
  });

  // Update configuration: pin a provider, set models, store API keys (memory only).
  app.put("/api/llm/config", (req, res) => {
    try {
      const { activeProviderId, overrides } = req.body || {};
      const summary = updateLLMConfig({ activeProviderId, overrides });
      res.json(summary);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Invalid LLM configuration" });
    }
  });

  // Live connection test for one provider (or the head of the chain).
  app.post("/api/llm/test", async (req, res) => {
    const result = await testProvider(req.body?.providerId);
    res.status(result.ok ? 200 : 502).json(result);
  });

  // ─── Media engines (image/video) — BYO key, like the LLM control center ────
  app.get("/api/media/providers", (req, res) => {
    res.json(getMediaConfigSummary());
  });
  app.put("/api/media/config", (req, res) => {
    try {
      const { vendor, apiKey } = req.body || {};
      res.json(updateMediaConfig({ vendor, apiKey }));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Invalid media configuration" });
    }
  });

  // ─── Profiles & Green Credits ──────────────────────────────────────────────

  // The eco-pledge catalogue (static).
  app.get("/api/pledges", (req, res) => {
    res.json({ pledges: PLEDGES, deployCost: DEPLOY_COST, manualAgentCost: MANUAL_AGENT_COST, minReserve: MIN_RUN_RESERVE, metered: true });
  });

  // Get a profile by handle (public fields only; secrets never serialized).
  app.get("/api/profile/:handle", (req, res) => {
    try {
      const handle = String(req.params.handle).trim().slice(0, 40);
      if (!handle) return res.status(400).json({ error: "Handle is required." });
      const profile = db.getOrCreateProfile(handle);
      res.json(db.publicProfile(profile));
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to load profile" });
    }
  });

  // Wallet ledger (earn/spend history) — only the signed-in owner may read it.
  app.get("/api/profile/:handle/ledger", requireAuth, (req, res) => {
    try {
      const handle = String(req.params.handle).trim().slice(0, 40);
      if (handle.toLowerCase() !== String(req.handle).toLowerCase()) {
        return res.status(403).json({ error: "You can only view your own wallet." });
      }
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "120"), 10) || 120));
      res.json({ ledger: db.getLedger(handle, limit), profile: db.publicProfile(db.getOrCreateProfile(handle)) });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to load ledger" });
    }
  });

  // Claim an eco-pledge → award Green Credits + log real-world impact (once/day each).
  app.post("/api/profile/:handle/pledge", requireAuth, (req, res) => {
    try {
      const handle = String(req.params.handle).trim().slice(0, 40);
      if (handle.toLowerCase() !== String(req.handle).toLowerCase()) {
        return res.status(403).json({ error: "You can only claim pledges on your own account." });
      }
      const { pledgeId } = req.body;
      const def = PLEDGES.find(p => p.id === pledgeId);
      if (!handle || !def) return res.status(400).json({ error: "Valid handle and pledgeId required." });

      const profile = db.claimPledge(handle, def.id, def.credits, def.co2_g);
      if (!profile) {
        return res.status(409).json({ error: "Pledge already claimed today.", code: "ALREADY_CLAIMED" });
      }
      res.json({ profile: db.publicProfile(profile), awarded: { credits: def.credits, co2_g: def.co2_g } });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to claim pledge" });
    }
  });

  // Propose 3 strategic mission interpretations for a generic prompt (pre-deploy).
  app.post("/api/missions/plan", async (req, res) => {
    try {
      const { prompt, persona } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Mission prompt string is required." });
      }
      const variants = await planMissionVariants(prompt, persona || null);
      res.json({ variants });
    } catch (err: any) {
      console.error("Mission planning failed:", err);
      res.status(500).json({ error: err.message || "Failed to plan mission variants" });
    }
  });

  // Get all intelligence missions
  app.get("/api/missions", (req, res) => {
    try {
      const missions = db.getMissions();
      res.json(missions);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch missions" });
    }
  });

  // Get specific intelligence mission
  app.get("/api/missions/:id", (req, res) => {
    try {
      const mission = db.getMission(req.params.id);
      if (!mission) {
        return res.status(404).json({ error: "Mission not found" });
      }
      res.json(mission);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch mission" });
    }
  });

  // Create new intelligence mission (Starts async autonomous agent sensing thread)
  app.post("/api/missions", requireAuth, (req, res) => {
    try {
      const { prompt, persona, parent_id } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Mission prompt string is required." });
      }

      // Green Credits gating: must hold a minimum reserve to start. The actual
      // charge is metered from token consumption when the run completes.
      const owner = req.handle as string;
      const profile = db.getOrCreateProfile(owner);
      if (profile.credits < MIN_RUN_RESERVE) {
        return res.status(402).json({
          error: `Not enough Green Credits to deploy (need at least ${MIN_RUN_RESERVE}, have ${profile.credits}). Earn more via eco-pledges.`,
          code: "INSUFFICIENT_CREDITS",
          credits: profile.credits,
          required: MIN_RUN_RESERVE
        });
      }

      const missionId = `mission-${Math.random().toString(36).substr(2, 9)}`;
      const newMission = {
        id: missionId,
        prompt: prompt,
        persona: persona || "General Analyst",
        targets: [prompt.split(" ")[0] || "index.md"], // Guess entity name
        status: "queued" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        owner: owner || undefined,
        parent_id: parent_id || undefined
      };

      db.createMission(newMission);

      // Trigger the background agent swarm thread instantly (non-blocking)
      runMissionSensing(missionId, prompt, persona, owner).catch(err => {
        console.error("Swarm background execution exception:", err);
      });

      res.status(201).json({ ...newMission, metered: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to create intelligence mission" });
    }
  });

  // Get weave semantic fabric (nodes and edges for WeaveCanvas)
  app.get("/api/missions/:id/fabric", (req, res) => {
    try {
      const mId = req.params.id;
      const nodes = db.getNodes(mId);
      const edges = db.getEdges(mId);
      res.json({ nodes, edges });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch fabric data" });
    }
  });

  // ─── Build flow: plan + connectors (Analyze → Prototype → Build → Connect) ───
  app.get("/api/missions/:id/build", (req, res) => {
    try {
      res.json(db.getBuildPlan(req.params.id));
    } catch (err) {
      res.status(500).json({ error: "Failed to build plan" });
    }
  });

  app.get("/api/connectors", (_req, res) => {
    try {
      res.json(db.getConnectors());
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch connectors" });
    }
  });

  // Toggle a connector connected/disconnected (simulated for the demo).
  app.post("/api/connectors/:id/toggle", (req, res) => {
    try {
      const current = db.getConnectors().find(c => c.id === req.params.id);
      if (!current) return res.status(404).json({ error: "Unknown connector" });
      const next = current.status === "connected" ? "available" : "connected";
      const updated = db.setConnectorStatus(req.params.id, next);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to toggle connector" });
    }
  });

  // Get activities feed for log events
  app.get("/api/missions/:id/events", (req, res) => {
    try {
      const events = db.getEvents(req.params.id);
      res.json(events);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // Get readable brief report with sentence-level node tracing ids
  app.get("/api/missions/:id/brief", (req, res) => {
    try {
      const mId = req.params.id;
      const brief = db.getBrief(mId);
      res.json(brief);
    } catch (err) {
      res.status(500).json({ error: "Failed to assemble traceable research brief" });
    }
  });

  // Get proposed actions
  app.get("/api/missions/:id/actions", (req, res) => {
    try {
      const actions = db.getActions(req.params.id);
      res.json(actions);
    } catch (err) {
      res.status(500).json({ error: "Failed to load proposed actions" });
    }
  });

  // Approve action
  app.post("/api/actions/:id/approve", (req, res) => {
    try {
      db.updateActionStatus(req.params.id, "approved");
      res.json({ success: true, message: "Action approved and marked ready for execution." });
    } catch (err) {
      res.status(500).json({ error: "Failed to approve action" });
    }
  });

  // Route an action into a connected tool (GitHub / Slack / Teams / Email / …).
  // Simulated for the demo: marks the move taken and logs it to the activity feed.
  app.post("/api/actions/:id/route", (req, res) => {
    try {
      const all = db.getMissions().flatMap(m => db.getActions(m.id));
      const act = all.find(a => a.id === req.params.id);
      const connectorId = (req.body?.connector || "").toString();
      const connector = db.getConnectors().find(c => c.id === connectorId);
      if (!act) return res.status(404).json({ error: "Action not found" });
      if (connector && connector.status !== "connected") {
        return res.status(409).json({ error: "not_connected", connector: connector.id });
      }
      db.updateActionStatus(act.id, "approved");
      db.addEvent({
        id: `ev-route-${Math.random().toString(36).substr(2, 6)}`,
        mission_id: act.mission_id, timestamp: new Date().toISOString(),
        sender: "Assistant",
        message: `Routed "${act.title}" to ${connector?.name || connectorId}.`,
        level: "success",
      });
      res.json({ success: true, connector: connector?.name || connectorId });
    } catch (err) {
      res.status(500).json({ error: "Failed to route action" });
    }
  });

  // Dismiss action
  app.post("/api/actions/:id/dismiss", (req, res) => {
    try {
      db.updateActionStatus(req.params.id, "dismissed");
      res.json({ success: true, message: "Action dismissed." });
    } catch (err) {
      res.status(500).json({ error: "Failed to dismiss action" });
    }
  });

  // Post a human-correction note to veto / overwrite low confidence nodes
  app.post("/api/nodes/:id/correct", (req, res) => {
    try {
      const originalNodeId = req.params.id;
      const { content, reason, mission_id } = req.body;

      if (!content || !mission_id) {
        return res.status(400).json({ error: "Content and mission_id are required fields for feedback mapping." });
      }

      const originalNode = db.getNode(originalNodeId);
      const correctionNodeId = `node-corr-${Math.random().toString(36).substr(2, 5)}`;
      
      const correctionNode: WeaveNode = {
        id: correctionNodeId,
        mission_id: mission_id,
        type: "correction",
        title: `Override: Corrective Note for "${originalNode ? originalNode.title : "Original"}"`,
        content: content,
        confidence: 1.0,  // Human veto carries absolute confidence
        own_score: 1.0,
        source: "human veto (User Entry)",
        source_url: null,
        version: originalNode ? originalNode.version + 1 : 1,
        provenance: [originalNodeId],
        flagged_by: null,
        created_at: new Date().toISOString()
      };

      db.addCorrection(correctionNode, reason);

      res.status(201).json(correctionNode);
    } catch (err) {
      res.status(500).json({ error: "Failed to post corrective node" });
    }
  });

  // Reconcile a conflict: record the chosen canonical value back into memory.
  // choice: "accept" (agent recommendation) | "a" | "b" | "custom" (+ value).
  app.post("/api/missions/:id/conflicts/:nodeId/resolve", (req, res) => {
    try {
      const { choice, value } = req.body || {};
      const by = (req as any).handle || "human";
      const result = db.resolveConflict(req.params.nodeId, choice || "accept", value, by);
      if (!result.conflict) return res.status(404).json({ error: "No open conflict to resolve here" });
      const v = (result.conflict.data as any)?.resolution?.value || value || "";
      db.addEvent({
        id: `ev-rec-${Math.random().toString(36).substr(2, 6)}`,
        mission_id: req.params.id, timestamp: new Date().toISOString(),
        sender: "Reviewer",
        message: `Conflict reconciled and written to memory: ${String(v).slice(0, 120)}`,
        level: "success",
      });
      res.json({ ok: true, conflict: result.conflict, correction: result.correction });
    } catch (err) {
      res.status(500).json({ error: "Failed to reconcile conflict" });
    }
  });

  // Inline "Refine" — suggest a cleaner/updated version of a finding's text.
  // The user can then save it as a correction (writing it back to memory).
  app.post("/api/nodes/:id/refine", async (req, res) => {
    try {
      const node = db.getNode(req.params.id);
      if (!node) return res.status(404).json({ error: "Finding not found" });
      const instruction = (req.body?.instruction || "").toString().slice(0, 300);
      if (!isLLMAvailable()) {
        return res.json({ suggestion: node.content, note: "No LLM configured — returned the original text." });
      }
      const { data, tokens } = await chatJSON<{ text: string }>(
        `Rewrite this finding's text to be clearer, tighter and decision-ready, keeping every fact and number exactly. ${instruction ? `Extra instruction: ${instruction}.` : ""}
TITLE: ${node.title}
TEXT: ${node.content}
Return JSON: { "text": "the improved version (1-3 sentences, no invented facts)" }`,
        "Improve wording only. Never add facts or change numbers."
      );
      res.json({ suggestion: data?.text || node.content, tokens });
    } catch (err) {
      res.status(500).json({ error: "Failed to refine finding" });
    }
  });

  // Recompute graph, trigger confidence propagation and heal nodes
  app.post("/api/missions/:id/reweave", async (req, res) => {
    try {
      const mId = req.params.id;
      const logEvent = (sender: string, message: string, level: any = "info") =>
        db.addEvent({ id: `ev-rw-${Math.random().toString(36).substr(2, 9)}`, mission_id: mId, timestamp: new Date().toISOString(), sender, message, level });

      // Re-weave now runs the autonomous Watchdog self-correction over the whole fabric.
      const sc = await runSelfCorrection(mId, logEvent);
      db.propagateConfidence(mId);

      db.addEvent({
        id: `ev-reweave-${Math.random().toString(36).substr(2, 9)}`,
        mission_id: mId,
        timestamp: new Date().toISOString(),
        sender: "Cartographer",
        message: `Re-weave complete: confidence propagated across the fabric${sc.contradictions ? `; ${sc.contradictions} contradiction(s) auto-flagged` : ""}.`,
        level: "success"
      });

      res.json({ success: true, contradictions: sc.contradictions, message: "Healed confidence propagation across the fabric." });
    } catch (err) {
      res.status(500).json({ error: "Failed to re-weave confidence score mappings" });
    }
  });

  // ─── Living missions: re-sense, runs, chat, edit, lifecycle, curation ──────

  // Re-sense: re-run the swarm and APPEND a new run (time-series). Costs credits.
  app.post("/api/missions/:id/resense", requireAuth, (req, res) => {
    try {
      const mId = req.params.id;
      const mission = db.getMission(mId);
      if (!mission) return res.status(404).json({ error: "Mission not found" });

      const trigger = req.body?.trigger === "monitor" ? "monitor" : "resense";
      const owner = req.handle as string;
      const profile = db.getOrCreateProfile(owner);
      if (profile.credits < MIN_RUN_RESERVE) {
        return res.status(402).json({ error: `Not enough Green Credits to re-sense (need at least ${MIN_RUN_RESERVE}, have ${profile.credits}).`, code: "INSUFFICIENT_CREDITS", credits: profile.credits, required: MIN_RUN_RESERVE });
      }

      db.addEvent({
        id: `ev-resense-${Math.random().toString(36).substr(2, 9)}`,
        mission_id: mId,
        timestamp: new Date().toISOString(),
        sender: "Conductor",
        message: `Re-sensing mission for fresh signals (${trigger})...`,
        level: "info"
      });

      runMissionSensing(mId, mission.prompt, mission.persona, owner, trigger).catch(err => {
        console.error("Re-sense execution exception:", err);
      });
      res.json({ success: true, metered: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to re-sense mission" });
    }
  });

  // ─── Custom (user-created) agents ──────────────────────────────────────────
  app.get("/api/missions/:id/custom-agents", (req, res) => {
    res.json({ agents: db.getCustomAgents(req.params.id) });
  });

  app.post("/api/missions/:id/custom-agents", (req, res) => {
    try {
      const { name, instruction, icon } = req.body;
      if (!name || !instruction) return res.status(400).json({ error: "Name and instruction are required." });
      const agent = {
        id: `ca-${Math.random().toString(36).substr(2, 8)}`,
        mission_id: req.params.id,
        name: String(name).slice(0, 40),
        instruction: String(instruction).slice(0, 400),
        icon: typeof icon === "string" ? icon : "Bot",
        created_at: new Date().toISOString()
      };
      db.addCustomAgent(agent);
      res.status(201).json(agent);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create custom agent" });
    }
  });

  app.delete("/api/custom-agents/:id", (req, res) => {
    db.deleteCustomAgent(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/custom-agents/:id/run", requireAuth, async (req, res) => {
    try {
      const agent = db.getCustomAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Custom agent not found" });
      const handle = req.handle as string;
      const profile = db.getOrCreateProfile(handle);
      if (profile.credits < MIN_RUN_RESERVE) {
        return res.status(402).json({ error: `Not enough Green Credits to run an agent (need at least ${MIN_RUN_RESERVE}, have ${profile.credits}).`, code: "INSUFFICIENT_CREDITS", credits: profile.credits, required: MIN_RUN_RESERVE });
      }
      const result = await runCustomAgent(agent.mission_id, agent.id);
      const provider = getProviderNames()[0] || "Groq";
      const spent = db.debit(handle, creditsForTokens(result.tokens || 900, provider), {
        source: "custom-agent", note: `Ran custom agent “${agent.name}” (~${result.tokens} tokens)`,
        tokens: result.tokens, provider, mission_id: agent.mission_id,
      });
      res.json({ ...result, spent });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to run custom agent" });
    }
  });

  // Forecast branching futures (Temporal Vista / EchoForge).
  app.post("/api/missions/:id/forecast", requireAuth, async (req, res) => {
    try {
      const handle = req.handle as string;
      const profile = db.getOrCreateProfile(handle);
      if (profile.credits < MIN_RUN_RESERVE) {
        return res.status(402).json({ error: `Not enough Green Credits to forecast (need at least ${MIN_RUN_RESERVE}, have ${profile.credits}).`, code: "INSUFFICIENT_CREDITS", credits: profile.credits, required: MIN_RUN_RESERVE });
      }
      const result = await generateFutures(req.params.id);
      const provider = getProviderNames()[0] || "Groq";
      const spent = db.debit(handle, creditsForTokens(result.tokens || 1400, provider), {
        source: "forecast", note: `Forecast branching futures (~${result.tokens} tokens)`,
        tokens: result.tokens, provider, mission_id: req.params.id,
      });
      res.json({ ...result, spent });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to forecast futures" });
    }
  });

  // Classify nodes into rich render components (dynamic canvas).
  app.post("/api/missions/:id/enrich", async (req, res) => {
    try {
      const updated = await enrichMissionNodes(req.params.id);
      res.json({ success: true, updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to enrich nodes" });
    }
  });

  // Run history for a mission.
  app.get("/api/missions/:id/runs", (req, res) => {
    try {
      res.json({ runs: db.getRuns(req.params.id) });
    } catch (err) {
      res.status(500).json({ error: "Failed to load runs" });
    }
  });

  // Grounded chat over the mission fabric.
  app.get("/api/missions/:id/chat", (req, res) => {
    try {
      res.json({ messages: db.getChats(req.params.id) });
    } catch (err) {
      res.status(500).json({ error: "Failed to load chat" });
    }
  });

  app.post("/api/missions/:id/chat", requireAuth, async (req, res) => {
    try {
      const mId = req.params.id;
      const { question } = req.body;
      if (!question || typeof question !== "string") {
        return res.status(400).json({ error: "A question string is required." });
      }
      const owner = req.handle as string;
      const profile = db.getOrCreateProfile(owner);
      if (profile.credits < MIN_RUN_RESERVE) {
        return res.status(402).json({ error: `Not enough Green Credits to ask (need at least ${MIN_RUN_RESERVE}, have ${profile.credits}).`, code: "INSUFFICIENT_CREDITS", credits: profile.credits, required: MIN_RUN_RESERVE });
      }

      const userTurn: ChatTurn = {
        id: `chat-u-${Math.random().toString(36).substr(2, 9)}`,
        mission_id: mId,
        role: "user",
        content: question,
        created_at: new Date().toISOString()
      };
      db.addChat(userTurn);

      const { answer, citations, tokens } = await answerFabricQuestion(mId, question);
      const assistantTurn: ChatTurn = {
        id: `chat-a-${Math.random().toString(36).substr(2, 9)}`,
        mission_id: mId,
        role: "assistant",
        content: answer,
        citations,
        created_at: new Date().toISOString()
      };
      db.addChat(assistantTurn);

      const provider = getProviderNames()[0] || "Groq";
      const spent = db.debit(owner, creditsForTokens(tokens || 450, provider), {
        source: "chat", note: `Asked the fabric a question (~${tokens} tokens)`,
        tokens, provider, mission_id: mId,
      });
      res.json({ message: assistantTurn, spent });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to answer question" });
    }
  });

  // ─── Media generation (Visualizer / Cinematographer) ───────────────────────
  // List a mission's generated media.
  app.get("/api/missions/:id/media", (req, res) => {
    res.json({ assets: db.getMediaAssets(req.params.id) });
  });

  // Generate an image/video for a mission. Metered per image / per second.
  app.post("/api/missions/:id/media", requireAuth, async (req, res) => {
    try {
      const mId = req.params.id;
      if (!db.getMission(mId)) return res.status(404).json({ error: "Mission not found" });
      const handle = req.handle as string;
      const kind: "image" | "video" = req.body?.kind === "video" ? "video" : "image";
      const prompt = String(req.body?.prompt || "").trim().slice(0, 500);
      if (!prompt) return res.status(400).json({ error: "A prompt is required." });
      const providerId = String(req.body?.providerId || "");
      const seconds = Math.max(2, Math.min(12, parseInt(String(req.body?.seconds || "5"), 10) || 5));
      const sourceNodeId = req.body?.sourceNodeId ? String(req.body.sourceNodeId) : undefined;

      // Pre-flight cost estimate + reserve check.
      const estimate = kind === "video" ? creditsForVideo(providerId, seconds) : creditsForImage(providerId, 1);
      const profile = db.getOrCreateProfile(handle);
      if (profile.credits < Math.max(MIN_RUN_RESERVE, estimate)) {
        return res.status(402).json({
          error: `Not enough Green Credits to generate (need ~${estimate}, have ${profile.credits}).`,
          code: "INSUFFICIENT_CREDITS", credits: profile.credits, required: estimate,
        });
      }

      const result = await generateMedia(kind, prompt, providerId, req.body?.model, seconds);
      const charged = db.debit(handle, estimate, {
        source: kind === "video" ? "media-video" : "media-image",
        note: `${kind === "video" ? "Rendered clip" : "Rendered image"} on ${result.provider}${result.simulated ? " (preview)" : ""}`,
        provider: result.provider, mission_id: mId,
      });

      const asset = {
        id: `media-${Math.random().toString(36).substr(2, 9)}`,
        mission_id: mId, kind, prompt,
        providerId: providerId || result.provider,
        provider: result.provider, model: result.model,
        url: result.url, poster: result.poster, seconds: result.seconds,
        simulated: result.simulated, credits: charged, note: result.note,
        source_node_id: sourceNodeId,
        created_at: new Date().toISOString(),
      };
      db.addMediaAsset(asset);
      db.addEvent({
        id: `ev-media-${Math.random().toString(36).substr(2, 9)}`,
        mission_id: mId, timestamp: new Date().toISOString(),
        sender: kind === "video" ? "Cinematographer" : "Visualizer",
        message: `${kind === "video" ? "Rendered a clip" : "Rendered an image"} — “${prompt.slice(0, 48)}” on ${result.provider}.`,
        level: "success",
      });
      res.status(201).json({ asset, spent: charged });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to generate media" });
    }
  });

  app.delete("/api/media/:id", requireAuth, (req, res) => {
    db.deleteMediaAsset(req.params.id);
    res.json({ success: true });
  });

  // Edit mission spec (optionally trigger a scoped re-sense — metered like a run).
  app.put("/api/missions/:id", (req, res) => {
    try {
      const mId = req.params.id;
      const { prompt, persona, targets, agents, cadence, resense } = req.body;

      // A re-sense costs credits, so it requires a signed-in owner with reserve.
      if (resense) {
        if (!req.handle) return res.status(401).json({ error: "Sign in to re-sense.", code: "UNAUTHENTICATED" });
        const profile = db.getOrCreateProfile(req.handle);
        if (profile.credits < MIN_RUN_RESERVE) {
          return res.status(402).json({ error: `Not enough Green Credits to re-sense (need at least ${MIN_RUN_RESERVE}, have ${profile.credits}).`, code: "INSUFFICIENT_CREDITS", credits: profile.credits, required: MIN_RUN_RESERVE });
        }
      }

      const updated = db.updateMissionSpec(mId, { prompt, persona, targets, agents, cadence });
      if (!updated) return res.status(404).json({ error: "Mission not found" });

      if (resense) {
        const owner = req.handle as string;
        runMissionSensing(mId, updated.prompt, updated.persona, owner, "edit").catch(err => console.error(err));
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update mission" });
    }
  });

  // Lifecycle: archive / unarchive, monitoring toggle.
  app.post("/api/missions/:id/archive", (req, res) => {
    db.setArchived(req.params.id, req.body?.archived !== false);
    res.json({ success: true });
  });

  app.post("/api/missions/:id/monitoring", (req, res) => {
    db.setMonitoring(req.params.id, !!req.body?.monitoring);
    res.json({ success: true });
  });

  // Persist canvas layout (node offsets) for a mission.
  app.put("/api/missions/:id/layout", (req, res) => {
    try {
      db.setLayout(req.params.id, req.body?.layout || {});
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to save layout" });
    }
  });

  // Curate the fabric: manual node add / edit / delete.
  app.post("/api/missions/:id/nodes", (req, res) => {
    try {
      const mId = req.params.id;
      const { title, content } = req.body;
      if (!title) return res.status(400).json({ error: "Node title is required." });
      const node: WeaveNode = {
        id: `node-manual-${Math.random().toString(36).substr(2, 6)}`,
        mission_id: mId,
        type: "human-note",
        title,
        content: content || "",
        confidence: 1.0,
        own_score: 1.0,
        source: "human (manual entry)",
        source_url: null,
        version: 1,
        provenance: [],
        flagged_by: null,
        created_at: new Date().toISOString(),
        manual: true,
        pinned: true
      };
      db.addNode(node);
      res.status(201).json(node);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to add node" });
    }
  });

  app.put("/api/nodes/:id", (req, res) => {
    try {
      const { title, content, pinned, note } = req.body;
      const patch: any = {};
      if (title !== undefined) patch.title = title;
      if (content !== undefined) patch.content = content;
      if (pinned !== undefined) patch.pinned = pinned;
      if (note !== undefined) patch.note = note;
      const node = db.updateNode(req.params.id, patch);
      if (!node) return res.status(404).json({ error: "Node not found" });
      res.json(node);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update node" });
    }
  });

  app.delete("/api/nodes/:id", (req, res) => {
    try {
      db.deleteNode(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete node" });
    }
  });

  // Manually trigger dynamic agent execution
  app.post("/api/missions/:id/agents/:agentId/execute", requireAuth, async (req, res) => {
    try {
      const { id, agentId } = req.params;
      const handle = req.handle as string;
      const profile = db.getOrCreateProfile(handle);
      if (profile.credits < MIN_RUN_RESERVE) {
        return res.status(402).json({
          error: `Not enough Green Credits to run an agent (need at least ${MIN_RUN_RESERVE}, have ${profile.credits}).`,
          code: "INSUFFICIENT_CREDITS",
          credits: profile.credits,
          required: MIN_RUN_RESERVE
        });
      }
      const result = await executeSingleAgentCognition(id, agentId);
      const provider = getProviderNames()[0] || "Groq";
      const spent = db.debit(handle, creditsForTokens(result.tokens || 700, provider), {
        source: "agent", note: `Ran ${agentId} manually (~${result.tokens || 0} tokens)`,
        tokens: result.tokens || 0, provider, mission_id: id,
      });
      res.json({ ...result, spent });
    } catch (err: any) {
      console.error("Agent execution failed:", err);
      res.status(500).json({ error: err.message || "Failed to execute agent" });
    }
  });

  // Get active live agents status
  app.get("/api/agents/status", (req, res) => {
    try {
      const activeAgents = [
        { id: "conductor", name: "Conductor", status: "idle", task: "Orchestrating active fabric signals" },
        { id: "pathfinder", name: "Pathfinder", status: "idle", task: "Monitoring public portal indexes" },
        { id: "veritas", name: "Veritas", status: "idle", task: "Fact-checking cross-reference validations" },
        { id: "cartographer", name: "Cartographer", status: "idle", task: "Optimizing 2D coordinate embeddings" },
        { id: "sentinel", name: "Sentinel", status: "idle", task: "Analyzing statement drift" },
        { id: "oracle", name: "Oracle", status: "idle", task: "Gating executable action triggers" },
        { id: "scribe", name: "Scribe", status: "idle", task: "Indexing provenance tracing briefs" },
        { id: "actor", name: "Actor", status: "idle", task: "Formatting client correspondence loops" },
        { id: "visualizer", name: "Visualizer", status: "idle", task: "Rendering stills from findings on request" },
        { id: "cinematographer", name: "Cinematographer", status: "idle", task: "Animating clips from findings on request" }
      ];
      res.json(activeAgents);
    } catch (err) {
      res.status(500).json({ error: "Failed to query agents status" });
    }
  });


  // --- VITE DEVELOPER SERVER & MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Port static compilation target inside /dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULL-STACK] Nebula Server booted successfully on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Critical server boot failure:", err);
});
