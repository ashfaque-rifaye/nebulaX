# Note while Building:


# NEBULA — Build Specification & Context

> **While building the appls, consider this skills if needed and use them wherever necessary.
1. Consider R3F, @react-three/drei, @react-three/postprocessing, @react-three/flex, Theatre.js, and GSAP/Lenis as the primary ecosystem. If a feature justifies a different library, look for alternate options that would make this site look better.
2. STATE & ISOLATION: Consider keeping the <Canvas> separate from standard HTML DOM UI. Use lightweight state stores (like Zustand) as the default mechanism for cross-boundary communication.
3. RESPONSIVE LAYOUTS: For complex 3D layouts requiring cross-device responsiveness, consider wrapping them in `@react-three/flex` (<Flex> and <Box>) as a primary layout strategy.
4. ANIMATION: Use Theatre.js (<ProjectProvider>, <SheetProvider>) for multi-axis camera sequences and complex lighting loops. Ensure `@theatre/studio` is conditionally toggled only when `process.env.NODE_ENV === 'development'`. Use animation wherever necessary. Use The best Animation library if necessary.
5. PERFORMANCE OPTIMIZATION: Default to converting 3D meshes using `npx gltfjsx [model].glb --transform` before structuring layouts. Favor highly optimized shadows like <ContactShadows /> over expensive dynamic shadow maps, and consider offloading high-frequency updates to custom GPU <shaderMaterial> GLSL scripts when useFrame loops impact performance.
6. AUDIO INTEGRATION: When spatial audio is required, default to nesting <PositionalAudio /> directly inside targeted moving nodes. Ensure audio playback is deferred until a user interaction event triggers on the DOM overlay.**
7.  PERFORMANCE & ACCELERATION RULES
- **Raycasting Engine**: For intricate mouse interactions on geometries exceeding 10k polygons, wrap elements inside `three-mesh-bvh` parameters to protect core viewport vital loops.
- **Math Mechanics**: Enforce `@react-three/maath` utilities for all runtime frame dampening operations (`useFrame`). Do not allow raw javascript loop interval calculations.
8. ADVANCED MATERIAL RENDERING
- **Refraction / Transparency**: Use Drei's premium `<MeshTransmissionMaterial>` over traditional mesh setups to handle physical transmission, thickness scaling, and sub-surface scattering profiles.
- **Dynamic Shading overrides**: Utilize `three-custom-shader-material` (CSM) when mutating base geometries so structural lighting grids remain unaffected by physical structural deformations.
9. ASSET ENGINE PIPELINES
- Integrate optimization flags via `gltf-pipeline --draco.compressionLevel 10` before mapping component states.
10.# ENTERPRISE 3D MASTER PIPELINE SPECIFICATIONS

11. FLUID & PARTICLE MANAGEMENT
- **High-Density Particles**: For scenes requiring more than 50k active nodes, enforce an **FBO (Frame Buffer Object) particle strategy**. Never loop through arrays inside standard CPU threads.
- **Fluid Interactions**: Inject webgl-fluid textures onto primary meshes when designing organic background transitions.

12. COMPRESSION & PRODUCTION LOAD BOUNDS
- All external 3D geometries must be loaded utilizing a dedicated **Draco Compression Decoder** setup. 
- Enforce strict progressive loading screens. Bind loading metrics from Drei's `<useProgress />` hook straight to your DOM overlay interface.
13. UI PHYSICS & SPRING MATRICES
- When rendering rubbery or elastic mesh deformations on hover, implement custom spring formulas directly into the uniform parameters to eliminate heavy external physics engine baggage.

14. CINEMATIC COLOR & LUT PIPELINE
- **Color Space**: Enforce strict Linear-sRGB tone mapping configurations across the GL pipeline (`gl.outputColorSpace = THREE.LinearSRGBColorSpace`).
- **Cinematic Passes**: Integrate a custom LUT (Look-Up Table) texture loader within the `EffectComposer` layer to map film-grade color profiles directly to final pixel draws.

15. VRAM MEMORY MANAGEMENT & PROFILING
- **GPU Compressions**: Prohibit raw PNG/JPG image assets for high-fidelity textures. Force the use of **KTX2 / Basis Universal** wrappers.
- **Draw Call Auditing**: Always embed `stats-gl` to track live vertex allocations and render passes. Keep total scene draw calls strictly below 50 on mobile viewports.

16. DOM TO WEBGL PIPELINE SWAPPING
- Leverage `tunnel-rat` to safely pass mesh hooks from independent UI component folders down into the main shared WebGL rendering container tree.
- Incorporate `GSAP Flip` to handle visual layouts transitioning elements between flat 2D DOM dimensions and deep 3D coordinate placements.


17. COMPLEX SCROLLYTELLING & CAMERA CONTROL
- Use `three-story-controls` for scroll-driven, cinematic camera paths. Maintain focal anchor tracking across transitions.
- Use `culori` in OKLAB space for color interpolation to ensure vibrant transitions during lighting changes.
18.  ADVANCED MATERIAL RENDERING & TRANSLUCENCY
- Implement `three-subsurface-scattering` for realistic lighting on organic or translucent materials.
- Use `three-noise` for procedural terrain generation or fluid mesh transformations directly in JavaScript.

19. PROFILING & ASSET OPTIMIZATION
- Implement Level of Detail (LOD) states for complex geometric meshes using `meshoptimizer` guidelines.
- Enable WebGPU compute shader overrides via `three-gpu-compute` for particle physics scenarios with high element counts to avoid thread delays.


20.  STATE BINDING WITH ZUSTAND
- Initialize a single, global Zustand reactive store (`src/store/useXpStore.ts`) to manage transitions across the Canvas and standard DOM HTML overlays.
- Track metrics like `currentScene`, `isAssetLoading`, and mouse coordinates (`targetVector`) globally. Banish isolated state lifters.

21. NEXT-GEN RENDERING PIPELINE
- Prioritize **WebGPU** contexts via **TypeGPU** configurations when implementing heavy visual layout mutations (such as organic jelly-like UI controls or custom screen deformation buffers).
- Fall back to R3F standard parameters only if a device lacks native WebGPU driver capabilities.

22.  ASSET ENGINE WRAPPERS
- For fast-turnaround aesthetic updates, utilize `<spline-viewer>` embed architectures. 
- Claude must capture the interior object nodes utilizing direct element IDs (`document.getElementById`) to append custom interactive pointer hooks cleanly.
# FUTURISTIC WEB ENGINE SPECIFICATIONS (WEBGPU & NEURAL PIPELINES)

23.  RENDERING BACKEND CONSTRAINTS
- **API Engine**: Force the use of **WebGPU** via Three's modern WebGPURenderer backend framework. Avoid legacy WebGL contexts entirely unless the host device lacks hardware driver capability.
- **Shader Language**: Prohibit raw GLSL template strings. Write all custom vertex and fragment pipeline operations using **TSL (Three.js Shading Language)** nodes for full type safety.

24.  VOLUMETRIC GRAPHICS & SCENE LAYOUTS
- **Mesh Systems**: Prioritize **3D Gaussian Splatting** (`<Splat />`) for organic, real-world environment reconstructions to bypass classic heavy polygon payloads.
- **Compute Pipelines**: Offload heavy structural simulations (such as morphing environments, interactive vortex fields, and micro-particle behaviors) entirely onto GPU compute shaders rather than JavaScript main thread loops.

25.  FLOW CONTROLS
- Utilize asynchronous chunk loading architectures for heavy neural cloud assets to guarantee an instant Core Web Vitals page speed scoring index.


26.  DYNAMIC VECTOR ANIMATION PIPELINE
- **Interface Engines**: Prioritize **Rive** (`@rive-app/canvas`) for all advanced 2D interactive UI layers and complex state-machine components. Banish heavy Lottie json or video payloads.
- **State Integration**: Cross-bind Rive event listeners directly with our 3D R3F Canvas mouse positional state values.

27.  ADVANCED HARDWARE SIMULATIONS (WGSL)
- When generating massive procedural ecosystems (exceeding 250k dynamic objects), bypass standard framework wrappers. Write optimized raw **WGSL Compute Shaders**.
- Keep data textures pinned completely within GPU memory pipelines. Prohibit reading data arrays back into the JavaScript main thread during standard execution loops.

28.  DATA GEOSPATIAL STREAMING
- For vast, comprehensive world-building scenarios, incorporate hierarchical **3D Tiles** parsing loaders to progressively stream model geometry chunks based on camera focus distances.

29.  TECHNICAL STACK BOUNDARIES
- **Graphics Core**: Three.js (WebGPURenderer backend over WebGL context via `three/webgpu`).
- **Layout Logic**: `@react-three/flex` for 3D UI, `tunnel-rat` for portal routing, and `Barba.js` for transition routing.
- **State & Motion**: `Zustand` global states, `GSAP` / `Anime.js (v4)` modular engines, and `Theatre.js` visual orchestrations.
- **Vectors & UI**: `Rive` engine canvas elements for complex interface animations.

30. STRUCTURAL AND PERFORMANCE EXPECTATIONS
- **Canvas Separation**: Isolate the WebGL render tree from standard DOM nodes. Route state indicators strictly through Zustand.
- **Raycasting**: Wrap all high-density mesh interactions in `three-mesh-bvh` parameters to keep frame updates locked at 120fps.
- **GPU Math**: Restrict complex loops inside `useFrame`. Build materials using type-safe **TSL (Three.js Shading Language)** nodes or custom WebGPU compute pipelines.
- **Assets Optimization**: Use `gltf-pipeline` Draco codecs for 3D assets, `KTX2` / `Basis Universal` formatting for textures, and hierarchical `3D Tiles` for massive volumetric maps.

31. SCENE CINEMATICS & ANIMATION DECREES
- Execute camera movement arcs using `three-story-controls` or compiled `Theatre.js` JSON states.
- Perform lighting and scene background shifts in the OKLAB color space via `culori` interpolation libraries.

# VIRAL UI/UX ENGINE SPECIFICATIONS: HIGH-HYPE INTERACTION

32. MOTION ENGINE PARADIGMS
- **Scroll Orchestration**: Enforce **Lenis Smooth Scroll** at the root level. All major page transitions must look fluid and soft.
- **Complex Timelines**: Utilize **GSAP** accompanied by `ScrollTrigger` for all complex, multi-stage parallax layouts. Never use raw CSS keyframe loops for large viewport shifts.
- **Interface Micro-Interactions**: Implement **Framer Motion** for all standard DOM layouts, tooltips, and flyouts using the `layoutId` component flag to enable layout morphing.

33. SHADER BACKGROUNDS & NO-CODE EMUTLATORS
- Prioritize **Spline Viewer** nodes for rapid-deployment 3D focal assets. 
- For lightweight procedural backgrounds, fall back to hardware-accelerated **Vanta.js** particle fields to protect the page rendering speed index.


34.  ULTRALIGHT HIGH-VELOCITY UI CORE
- **Base Components**: Exclusively use **HeroUI** or **Shadcn UI** for all core structural layouts to maintain a cohesive dark-mode SaaS presentation style.
- **Visual Eye-Candy**: Incorporate **Magic UI / Aceternity UI** design components (Bento Grids, Border Rays, Scrolling Cards) on the primary viewports to maximize the pitch wow-factor.

35. 
- **Database Backend**: Stream all interactive storage parameters directly through pre-configured **Supabase** database endpoints.
- **Metrics Presentation**: Render interactive analytics screens using **Tremor Charts** populated with rich mock datasets to ensure working visuals during live judge presentations.

36. 
- Prioritize high-fidelity visual styling elements over low-level raw logic tweaks. The interface must look flawless on screen shares.

**


> **How to use this file:** Drop it into your repo root as `CLAUDE.md` (or `PROJECT_SPEC.md`) and open Claude Code in that folder. It is the single source of truth for the build. A recommended kickoff prompt is at the very bottom (see "Kickoff prompt for Claude Code"). This spec is intentionally complete: data models, agent contracts, API surface, UI spec, design tokens, repo layout, and build order are all here so Claude Code can scaffold and build without guessing.

---

## 0. One-liner

**Nebula is a living team-intelligence fabric. Users define "Intelligence Missions" in plain language; an autonomous agent swarm senses the open web, weaves every finding into a self-correcting memory graph, verifies it against multiple sources, and proposes executable next actions — with every claim traceable to its source and every correction propagating through the fabric so the system gets smarter over time.**

- **Hackathon:** Microsoft Build AI (HackerEarth), India-only, teams of 1–3, runs ~May 5 – Jun 7 2026.
- **Declared theme:** Agentic Web (the architecture also touches Agent Swarms, AI Meets Data, and Security in the Agentic Future — declare one, demonstrate range).
- **Team skill profile:** balanced full-stack.

---

## 1. The product vision

### 1.1 From "competitor tracker" to "Intelligence Missions"
Nebula is **not** limited to competitive intelligence. The user states a goal in natural language — an **Intelligence Mission** — and the swarm handles the rest from the open web. This makes the audience millions of knowledge workers, not a niche of product teams.

### 1.2 Target users & example missions
| Persona | Example mission |
|---|---|
| Founders / product teams | "Track how Razorpay, Cashfree, and PayU are shifting enterprise pricing and AI features." |
| Investors / VCs | "Monitor my 8 portfolio companies for hiring surges, deal-flow signals, and founder activity." |
| Job seekers / professionals | "Watch these 5 target companies for relevant openings, culture shifts, and interviewer backgrounds." |
| Researchers / analysts | "Monitor new papers, regulatory changes, and global news on solid-state batteries." |
| Small business owners | "Track my suppliers' pricing, customer sentiment, and regulatory risks in my category." |
| Students / academics | "Alert me to internships and grants in computational biology before their deadlines." |
| Content creators / marketers | "Spot emerging viral topics and influencer activity in the personal-finance niche." |

### 1.3 Why "Agentic Web" fits exactly
The official theme: *"autonomous agents that navigate websites, extract information, complete multi-step transactions, and orchestrate actions across services without hand-holding."* Nebula delivers each clause:
- **Navigate messy real-world sites** — LinkedIn, careers pages, patent portals, news, GitHub, government portals.
- **Recover gracefully** — adapt to layout changes, rate limits, and blocked pages; surface login/CAPTCHA walls to the human rather than circumventing them (see §9 Action Safety).
- **Multi-step orchestration** — one agent's finding triggers deeper investigation by others.
- **Action completion** — drafts and queues executable next steps for explicit human approval.

### 1.4 Hero features
1. **The Weave Canvas** — a live, interactive graph where every signal, note, and synthesis is a node with a confidence score; edges carry provenance ("weaved from", "contradicts", "correction applied"). Agents weave in real time.
2. **Re-weave** — a human corrects one node; the correction propagates and downstream confidence heals. The fabric is permanently smarter for the next mission.
3. **Signal-to-Action** — the swarm doesn't just report; it proposes executable next steps ("Draft an outreach email to this hiring manager", "Prepare a counter-pricing brief", "Apply to this grant before the deadline"), drafted and queued for one-click human approval.

### 1.5 Why it wins (USP)
No incumbent combines all three: **persistent self-correcting memory** (vs one-shot reports from Crayon/Klue and stateless chatbots), **full traceability + human veto** (kills AI slop — every claim links to a source, corrections propagate), and **compounding intelligence** (more use → smarter + cheaper → a moat). Incumbents (Crayon, Klue, AlphaSense, Contify) are priced for large enterprises; Nebula generalizes to any mission and any user.

### 1.6 Supporting data points (for the pitch/README)
- McKinsey: knowledge workers spend ~20% of work hours (about one day/week) searching for information; other analyses put it near 1.8 hrs/day. Atlassian: up to 25%, with 56% routinely asking a colleague or booking a meeting to find an answer. External monitoring adds another 1–2 hrs/day.
- Competitive intelligence software market: estimates vary widely; representative analyses put it ~$3.1–3.2B in 2026 growing to ~$7–9.7B by 2033 (double-digit CAGR). Nebula's mission framing expands the addressable audience well beyond this category.

---

### Frontend 3D ecosystem & guidelines

1. Consider R3F, @react-three/drei, @react-three/postprocessing, @react-three/flex, Theatre.js, and GSAP/Lenis as the primary ecosystem. If a feature justifies a different library, look for alternate options that would make this site look better.
2. STATE & ISOLATION: Consider keeping the <Canvas> separate from standard HTML DOM UI. Use lightweight state stores (like Zustand) as the default mechanism for cross-boundary communication.
3. RESPONSIVE LAYOUTS: For complex 3D layouts requiring cross-device responsiveness, consider wrapping them in `@react-three/flex` (<Flex> and <Box>) as a primary layout strategy.
4. ANIMATION: Use Theatre.js (<ProjectProvider>, <SheetProvider>) for multi-axis camera sequences and complex lighting loops. Ensure `@theatre/studio` is conditionally toggled only when `process.env.NODE_ENV === 'development'`. Use animation wherever necessary. Use The best Animation library if necessary.
5. PERFORMANCE OPTIMIZATION: Default to converting 3D meshes using `npx gltfjsx [model].glb --transform` before structuring layouts. Favor highly optimized shadows like <ContactShadows /> over expensive dynamic shadow maps, and consider offloading high-frequency updates to custom GPU <shaderMaterial> GLSL scripts when useFrame loops impact performance.
6. AUDIO INTEGRATION: When spatial audio is required, default to nesting <PositionalAudio /> directly inside targeted moving nodes. Ensure audio playback is deferred until a user interaction event triggers on the DOM overlay.


## 2. Agent architecture (the swarm)

Four tiers. Agents communicate via an internal message bus (in-process pub/sub for MVP; swappable to Azure Service Bus). Orchestrated with **Semantic Kernel**. Each agent has a focused system prompt, a tool set, and a typed input/output contract.

### Tier 0 — Orchestration
- **Conductor** — the swarm brain. Decomposes a Mission into a dynamic plan (which signals to pursue, in what order), dispatches agents, manages dependencies, and decides when enough *verified* evidence exists to synthesize. Implemented as an SK planner loop, not a fixed pipeline.

### Tier 1 — Adaptive sensing (the eyes)
- **Pathfinder** — autonomous web navigator (Playwright). Plans its own browsing, follows links recursively, recovers from layout changes/rate limits, decides what's worth extracting. Surfaces (does not bypass) login/CAPTCHA walls.
- **Signal agents** — domain specialists that extract + lightly interpret a channel. MVP set: `PricingProductSignal`, `TalentSignal` (hiring), `NarrativeSignal` (press/news/blogs). Roadmap: `IPRegulatorySignal`, `SocialSignal`, `AcademicSignal`. Signal agents are config-driven so new domains are added without new code paths.

### Tier 2 — Reasoning & verification (the depth — this is what wins)
- **Veritas** — fact-checker. Cross-references each claim across independent sources, scores credibility, flags single-source/stale claims. The primary anti-slop mechanism.
- **Cartographer** — weaves the memory graph: creates nodes, forms edges by embedding similarity, does temporal reasoning (how something evolved) and entity resolution (merging mentions of the same entity across sources).
- **Sentinel** — quality guardian. Detects contradictions, drift, and low-confidence regions; creates `contradicts` edges; flags for human review or triggers re-verification.
- **Oracle** — the "so what" engine. Turns verified signals into strategic interpretation + predictions, and produces the **Signal-to-Action** proposals consumed by Actor.

### Tier 3 — Synthesis, memory & action
- **Scribe** — produces the traceable brief; every sentence links to its provenance node ids; brief confidence = min over provenance chain.
- **Echo** — memory steward. Retrieves relevant past context (RAG over the fabric), prunes/versions, surfaces "you researched this before."
- **Actor** — prepares executable next steps as **drafts only** (emails, application text, strategy notes) and queues side-effectful actions for explicit human approval. Never auto-submits. See §9.

### MVP agent subset (build these for the demo)
`Conductor (lite)`, `Pathfinder`, two Signal agents, `Veritas`, `Cartographer`, `Sentinel`, `Oracle (lite)`, `Scribe`, `Actor (draft-only)`. `Echo` and extra Signal agents are post-MVP/roadmap.

---

## 3. The Weave Protocol (core IP)

Four mechanics. Implement these as the heart of the `fabric` module — get them right before building UI.

1. **Versioned semantic graph.** Every node carries a `version`; every edit bumps it and preserves history. Nothing is destructively overwritten.
2. **Human veto as ground truth.** A `correction` node has `confidence = 1.0` and overrides any agent-produced node it targets.
3. **Confidence propagation.** A node's effective confidence = `min(own_score, weakest_provenance_node)`. Fixing one contradiction therefore heals the whole downstream chain. Recompute bottom-up on every weave/correction.
4. **Drift detection.** Sentinel checks recently-connected high-similarity nodes for conflicting assertions; on conflict it creates a `contradicts` edge and suppresses confidence until resolved.

---


---

## 6. LLM access — no credit card required

Primary: **GitHub Models** — a free, OpenAI-compatible inference API usable with a GitHub personal access token, no credit card. Counts fully as a Microsoft AI tool for judging. When you outgrow free limits you can bring your own Azure/OpenAI key with no code change.

```bash
# .env (backend)
LLM_BASE_URL=https://models.github.ai/inference     # GitHub Models endpoint
LLM_API_KEY=<github_pat_with_models_read>           # GitHub PAT (Models: Read-only)
LLM_MODEL=gpt-4o-mini                                # low-tier => higher free limits
EMBED_MODEL=text-embedding-3-small
# To switch to Azure OpenAI later, change BASE_URL/API_KEY/MODEL only.
```

```python
# OpenAI-compatible client (works for GitHub Models AND Azure OpenAI)
from openai import OpenAI
client = OpenAI(base_url=os.environ["LLM_BASE_URL"], api_key=os.environ["LLM_API_KEY"])
```

**Critical constraint:** GitHub Models free limits are tight (high-tier models ~10 req/min, ~50/day; low-tier ~15/min, ~150/day; 8K in / 4K out per request). For a multi-agent swarm:
- Default to `gpt-4o-mini`-class (low-tier) models for the higher daily allowance.
- Cache aggressively (hash prompt → reuse responses); never re-call for unchanged inputs.
- Batch where possible; keep prompts lean.
- For the live demo, run against **cached real fixtures** so you never hit the rate limit on stage.

Parallel path: apply to **Microsoft for Startups Founders Hub** (free Azure + Azure OpenAI credits, no VC needed, no card — verify current amounts). If credits land, point the same env vars at Azure OpenAI + use Azure AI Search/Cosmos. If any teammate has a university email, **Azure for Students** gives $100/yr, no card, includes Azure OpenAI. Also check whether the hackathon itself issues Azure passes.

---

## 7. System architecture (data flow)

```
User (NL mission)
   -> Command Bar (FE)
   -> POST /api/missions
   -> Conductor builds plan
        -> dispatches Pathfinder + Signal agents (Playwright)  [SENSE]
        -> Veritas verifies claims across sources              [REASON]
        -> Cartographer weaves nodes+edges (embeddings)        [REASON]
        -> Sentinel flags contradictions / low confidence      [REASON]
        -> Oracle interprets + proposes actions                [REASON/ACT]
        -> Scribe writes traceable brief                       [SYNTH]
        -> Actor drafts executable next steps (approval-gated) [ACT]
   -> Weave fabric persisted (graph store + vector store)
   -> FE polls events + fabric; Weave Canvas renders live
Human correction -> POST reweave -> confidence propagation -> brief heals
```

---


---

## 9. Action safety (non-negotiable design rules)

Bake these into Actor and the API. They are correct product design AND required behavior:
- **Drafts only by default.** Actor prepares content; it never sends, submits, posts, or transacts on its own.
- **Explicit human approval for every side-effectful action.** Approval marks intent; actual sending/submitting is handed back to the user (e.g., "Open in Mail") rather than executed silently.
- **Never bypass CAPTCHAs or bot-detection.** If Pathfinder hits a CAPTCHA, login wall, or block, it stops and surfaces it to the user — it does not attempt to solve or evade it.
- **Never enter credentials, payment details, or personal data into forms.** Never create accounts or change settings on the user's behalf.
- **Respect site terms and robots; prefer public data.** Cache responsibly; back off on rate limits.
- **Provenance always.** No claim in a brief without a linked source node.

---



### 10.4 UI stack decision
- **Primary canvas:** React Flow + Fluent UI + ElkJS + Framer Motion (stable, performant, demoable). **Use this.**
- **3D force graph (react-force-graph / R3F):** optional "hero view" toggle only if everything else is done. Do NOT make it the primary canvas (labels/traceability/perf risk in live demo).
- **Skip** hybrid 2D+3D and no-code (Spline) for the hackathon.

---


## 12. Build order (give Claude Code these as sequential tasks)

## 13. MVP scope

**In:** NL mission input; Conductor (lite); Pathfinder + 2 Signal agents on 2–3 real public sources; Cartographer weaving; Veritas verification; Sentinel contradiction flag; Oracle interpretation; Scribe traceable brief; Actor draft proposals (approval-gated); Weave Canvas with click-to-trace + Re-weave; confidence propagation.

**Out (put on a roadmap slide — naming cuts shows product judgment):** Echo memory steward, extra Signal agents (IP/regulatory, social, academic), multi-user auth/roles, real-time SignalR, PDF export, live sending of approved actions (MVP hands the draft back to the user).

---

---

---

---


---

## Kickoff prompt for Claude Code

> Read `CLAUDE.md` end to end. We are building **Nebula** per this spec. Start with build-order step 1: scaffold the FastAPI backend and the Vite + React + TypeScript frontend, add all dependencies from §5, create `.env.example` per §6 (GitHub Models, OpenAI-compatible), and add a `/health` endpoint plus a smoke test that calls the LLM client and prints a completion. Use the repo layout in §11. Do not build UI yet. After scaffolding, implement step 2 (LLM client + Semantic Kernel + prompt cache) and stop for my review. Follow the Action Safety rules in §9 as hard constraints throughout.

