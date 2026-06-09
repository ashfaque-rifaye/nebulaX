import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db.ts";
import { runMissionSensing, executeSingleAgentCognition, planMissionVariants, answerFabricQuestion, runSelfCorrection, enrichMissionNodes, runCustomAgent, generateFutures } from "./src/agents.ts";
import { WeaveNode } from "./src/types.ts";
import { isLLMAvailable, getProviderNames, chat } from "./src/llm.ts";
import { PLEDGES, DEPLOY_COST, MANUAL_AGENT_COST, CHAT_COST } from "./src/footprint.ts";
import { ChatTurn } from "./src/types.ts";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and Urlencoded parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- API ROUTES FIRST ---

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

  // ─── Profiles & Green Credits ──────────────────────────────────────────────

  // The eco-pledge catalogue (static).
  app.get("/api/pledges", (req, res) => {
    res.json({ pledges: PLEDGES, deployCost: DEPLOY_COST, manualAgentCost: MANUAL_AGENT_COST });
  });

  // Get (or lazily create) a profile by handle.
  app.get("/api/profile/:handle", (req, res) => {
    try {
      const handle = String(req.params.handle).trim().slice(0, 40);
      if (!handle) return res.status(400).json({ error: "Handle is required." });
      const profile = db.getOrCreateProfile(handle);
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to load profile" });
    }
  });

  // Claim an eco-pledge → award Green Credits + log real-world impact (once/day each).
  app.post("/api/profile/:handle/pledge", (req, res) => {
    try {
      const handle = String(req.params.handle).trim().slice(0, 40);
      const { pledgeId } = req.body;
      const def = PLEDGES.find(p => p.id === pledgeId);
      if (!handle || !def) return res.status(400).json({ error: "Valid handle and pledgeId required." });

      const profile = db.claimPledge(handle, def.id, def.credits, def.co2_g);
      if (!profile) {
        return res.status(409).json({ error: "Pledge already claimed today.", code: "ALREADY_CLAIMED" });
      }
      res.json({ profile, awarded: { credits: def.credits, co2_g: def.co2_g } });
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
  app.post("/api/missions", (req, res) => {
    try {
      const { prompt, persona, handle, parent_id } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Mission prompt string is required." });
      }

      // Green Credits gating: deploying the swarm costs credits.
      const owner = handle ? String(handle).trim().slice(0, 40) : null;
      if (owner) {
        const profile = db.getOrCreateProfile(owner);
        if (profile.credits < DEPLOY_COST) {
          return res.status(402).json({
            error: `Not enough Green Credits to deploy (need ${DEPLOY_COST}, have ${profile.credits}). Earn more via eco-pledges.`,
            code: "INSUFFICIENT_CREDITS",
            credits: profile.credits,
            required: DEPLOY_COST
          });
        }
        db.spendCredits(owner, DEPLOY_COST);
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

      res.status(201).json({ ...newMission, spent: owner ? DEPLOY_COST : 0 });
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
  app.post("/api/missions/:id/resense", (req, res) => {
    try {
      const mId = req.params.id;
      const mission = db.getMission(mId);
      if (!mission) return res.status(404).json({ error: "Mission not found" });

      const trigger = req.body?.trigger === "monitor" ? "monitor" : "resense";
      const owner = req.body?.handle ? String(req.body.handle).trim().slice(0, 40) : (mission.owner || null);
      if (owner) {
        const profile = db.getOrCreateProfile(owner);
        if (profile.credits < DEPLOY_COST) {
          return res.status(402).json({ error: `Not enough Green Credits to re-sense (need ${DEPLOY_COST}, have ${profile.credits}).`, code: "INSUFFICIENT_CREDITS", credits: profile.credits, required: DEPLOY_COST });
        }
        db.spendCredits(owner, DEPLOY_COST);
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
      res.json({ success: true, spent: owner ? DEPLOY_COST : 0 });
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

  app.post("/api/custom-agents/:id/run", async (req, res) => {
    try {
      const agent = db.getCustomAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Custom agent not found" });
      const handle = req.body?.handle ? String(req.body.handle).trim().slice(0, 40) : null;
      if (handle) {
        const profile = db.getOrCreateProfile(handle);
        if (profile.credits < MANUAL_AGENT_COST) {
          return res.status(402).json({ error: `Not enough Green Credits to run an agent (need ${MANUAL_AGENT_COST}, have ${profile.credits}).`, code: "INSUFFICIENT_CREDITS", credits: profile.credits, required: MANUAL_AGENT_COST });
        }
        db.spendCredits(handle, MANUAL_AGENT_COST);
      }
      const result = await runCustomAgent(agent.mission_id, agent.id);
      res.json({ ...result, spent: handle ? MANUAL_AGENT_COST : 0 });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to run custom agent" });
    }
  });

  // Forecast branching futures (Temporal Vista / EchoForge).
  app.post("/api/missions/:id/forecast", async (req, res) => {
    try {
      const handle = req.body?.handle ? String(req.body.handle).trim().slice(0, 40) : null;
      if (handle) {
        const profile = db.getOrCreateProfile(handle);
        if (profile.credits < MANUAL_AGENT_COST) {
          return res.status(402).json({ error: `Not enough Green Credits to forecast (need ${MANUAL_AGENT_COST}, have ${profile.credits}).`, code: "INSUFFICIENT_CREDITS", credits: profile.credits, required: MANUAL_AGENT_COST });
        }
        db.spendCredits(handle, MANUAL_AGENT_COST);
      }
      const result = await generateFutures(req.params.id);
      res.json({ ...result, spent: handle ? MANUAL_AGENT_COST : 0 });
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

  app.post("/api/missions/:id/chat", async (req, res) => {
    try {
      const mId = req.params.id;
      const { question, handle } = req.body;
      if (!question || typeof question !== "string") {
        return res.status(400).json({ error: "A question string is required." });
      }
      const owner = handle ? String(handle).trim().slice(0, 40) : null;
      if (owner) {
        const profile = db.getOrCreateProfile(owner);
        if (profile.credits < CHAT_COST) {
          return res.status(402).json({ error: `Not enough Green Credits to ask (need ${CHAT_COST}, have ${profile.credits}).`, code: "INSUFFICIENT_CREDITS", credits: profile.credits, required: CHAT_COST });
        }
        db.spendCredits(owner, CHAT_COST);
      }

      const userTurn: ChatTurn = {
        id: `chat-u-${Math.random().toString(36).substr(2, 9)}`,
        mission_id: mId,
        role: "user",
        content: question,
        created_at: new Date().toISOString()
      };
      db.addChat(userTurn);

      const { answer, citations } = await answerFabricQuestion(mId, question);
      const assistantTurn: ChatTurn = {
        id: `chat-a-${Math.random().toString(36).substr(2, 9)}`,
        mission_id: mId,
        role: "assistant",
        content: answer,
        citations,
        created_at: new Date().toISOString()
      };
      db.addChat(assistantTurn);

      res.json({ message: assistantTurn });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to answer question" });
    }
  });

  // Edit mission spec (optionally trigger a scoped re-sense).
  app.put("/api/missions/:id", (req, res) => {
    try {
      const mId = req.params.id;
      const { prompt, persona, targets, resense, handle } = req.body;
      const updated = db.updateMissionSpec(mId, { prompt, persona, targets });
      if (!updated) return res.status(404).json({ error: "Mission not found" });

      if (resense) {
        const owner = handle ? String(handle).trim().slice(0, 40) : (updated.owner || null);
        if (owner) {
          const profile = db.getOrCreateProfile(owner);
          if (profile.credits >= DEPLOY_COST) db.spendCredits(owner, DEPLOY_COST);
        }
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
  app.post("/api/missions/:id/agents/:agentId/execute", async (req, res) => {
    try {
      const { id, agentId } = req.params;
      const handle = req.body?.handle ? String(req.body.handle).trim().slice(0, 40) : null;
      if (handle) {
        const profile = db.getOrCreateProfile(handle);
        if (profile.credits < MANUAL_AGENT_COST) {
          return res.status(402).json({
            error: `Not enough Green Credits to run an agent (need ${MANUAL_AGENT_COST}, have ${profile.credits}).`,
            code: "INSUFFICIENT_CREDITS",
            credits: profile.credits,
            required: MANUAL_AGENT_COST
          });
        }
        db.spendCredits(handle, MANUAL_AGENT_COST);
      }
      const result = await executeSingleAgentCognition(id, agentId);
      res.json({ ...result, spent: handle ? MANUAL_AGENT_COST : 0 });
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
        { id: "actor", name: "Actor", status: "idle", task: "Formatting client correspondence loops" }
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
