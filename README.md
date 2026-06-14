# NebulaX — Self-Correcting Agent Swarm Weave

NebulaX is a living team-intelligence fabric. You define an **Intelligence Mission** in plain language; an autonomous agent swarm senses the web, extracts the real data behind each finding, tags it into a **category**, cross-checks it across sources, maps everything into a category-clustered **Flow**, surfaces any conflicting numbers for you to **reconcile**, and then turns the analysis into a prototype and a ranked build plan routed into the tools your team already uses. Every finding shows its real metrics, a **Verified / Needs review** badge and its sources — no opaque confidence scores.

## Architecture

- **Frontend** — Vite + React 19 + TypeScript + Tailwind v4 + Motion (`src/App.tsx`, `src/components/`). A unified Swarm Workspace with five lenses over one fabric: **Flow** (the primary view — findings mapped into category lanes and connected by what relates to what), **Build**, **Futures**, **Triage**, **Replay**, plus a docked Inspector (finding detail / Reconcile / agent console / grounded chat / mission pulse), a live agent ticker with an expandable Brief & Actions pane, and a first-run tour. Findings carry real data (metrics / N-way comparison tables), a binary verified badge, a source count and a category.
- **Flow map** — `src/components/FabricCanvas.tsx` (+ `src/categories.ts`): every finding is auto-tagged by category (Finance, Product, Marketing, Pricing, Security…) and laid into a horizontal **lane** per category, so you see Finance link to Finance and the cross-category synthesis drawn between them. Click a category chip to isolate it; rich cards, a category-coloured minimap and lane labels make the map readable.
- **Reconcile** — `src/components/ConflictResolver.tsx`: when two sources disagree on a fact, the conflict is shown as a structured diff (Side A vs Side B + sources), the Reviewer proposes a recommended reconciliation, and one click — Accept / Trust A / Trust B / edit a value — records the canonical value back into memory (`db.resolveConflict`) and marks the sources reconciled, keeping the originals on file. `RefineFinding.tsx` does the same inline for any generated finding's text.
- **Build Studio** — `src/components/BuildStudio.tsx`: turns a finished analysis into next steps — **Analyze** (gaps & risks in the org's product/tech), **Prototype** (a generated spec: name, stack, screens), and **Build** (ranked, effort-tagged tasks) — plus simulated **connectors** (GitHub, Azure, Jira, Figma, Slack) that import working context and give the tasks somewhere to land.
- **Edit Swarm** — `src/components/MissionSettings.tsx`: reshape a live mission — goal, persona, watchlist targets, the active specialist roster (the sense→verify→compare spine stays core; Reviewer/Synthesist/Reporter/Assistant/Architect/Builder/Visualizer/Cinematographer toggle), and the live-monitor cadence — then Save or Save & Re-sense.
- **Accounts & wallet** — `src/auth.ts` (scrypt-hashed passphrases, httpOnly session cookies, login rate-limiting, CSRF origin checks) + `AuthModal`/`Wallet`. Green Credits are a real wallet: every model run is **metered by actual token consumption** (`footprint.creditsForTokens`, per-provider rates) and recorded as an earn/spend **ledger** entry; earn back via daily eco-pledges.
- **Media Studio** — `src/media.ts` + `src/components/MediaStudio.tsx`: Visualizer (image) and Cinematographer (video) agents over a 19-engine BYO-key roster (FLUX, SDXL/SD3.5, GPT-Image; Higgsfield, Kling, Runway, Luma, Hunyuan, LTX, Wan, SVD, Pika), metered per image / per second, with a keyless on-brand simulation fallback.
- **Design system** — `src/index.css`: the LUNA theme — a deep-navy night sky (`#080b16`) with a luna-purple → luna-pink brand gradient and lavender accents, plus a daylit light-mode counterpart on the same semantic tokens. Bricolage Grotesque + Figtree + Spline Sans Mono variable fonts, glass morphism, starfield/moon/shooting-star ambience, gradient hero text, capability marquee, scroll-driven reveals, noise materials, and reduced-motion fallbacks throughout.
- **Backend** — Express, served alongside Vite from a single process (`server.ts`). REST API for auth/sessions, the credit wallet & ledger, missions, fabric, events, brief, actions, corrections, **conflict reconciliation** (`/conflicts/:id/resolve`) and **inline refine** (`/nodes/:id/refine`), the **build plan** and **connectors**, media generation, and runtime LLM/media configuration.
- **Store** — in-memory DB persisted to `nebula-data.json` (`src/db.ts`): the provenance graph of category-tagged findings (each with real metric/comparison data, a `verified` flag and a source count), conflicts the Reviewer surfaces and the corrections that resolve them, seeded build plans + connectors, plus profiles/credentials, sessions, the credit ledger, and media assets. A `SEED_VERSION` bump cleanly replaces the demo workspaces on existing installs while leaving user-created missions untouched.
- **Demo workspaces** — three category-rich, ready-to-explore missions seed on first run: **Fintech** (Razorpay vs Cashfree vs PayU, with an open pricing conflict to reconcile), **Teardown** (a competitor mapped across Finance / Product / Marketing / Hiring, with a revenue conflict), and **Stack** (an app/tech audit that feeds the Build flow).
- **AI swarm** — `src/agents.ts` orchestrates the sense → verify → compare → recommend → build pipeline (respecting each mission's agent roster).

## AI providers — Model Control Center

The AI layer (`src/llm.ts`) is provider-agnostic and OpenAI-compatible. Click the engine chip in the header to open the **Model Control Center**: pick a provider (Groq, Cerebras, OpenAI, OpenRouter, Together AI, Mistral, Hugging Face), choose or type any model id, paste an API key (held in server memory only, never written to disk), and run a live connection test. Pinning a provider makes it primary; every other configured provider stays as automatic fallback.

Environment variables still work as the baseline chain:

1. **Groq** (primary) — `GROQ_API_KEY`, default `llama-3.3-70b-versatile`
2. **Cerebras** — `CEREBRAS_API_KEY`, default `llama-3.3-70b`
3. **OpenAI / OpenRouter / Together / Mistral** — `OPENAI_API_KEY` / `OPENROUTER_API_KEY` / `TOGETHER_API_KEY` / `MISTRAL_API_KEY`
4. **Hugging Face** — `HF_API_TOKEN`, default `mistralai/Mistral-7B-Instruct-v0.3`

If no keys are set, the swarm runs a high-fidelity simulation so the UI is always demoable.

## Run locally

**Prerequisites:** Node.js 18+

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set at least `GROQ_API_KEY` (Cerebras / HF optional).
3. Run: `npm run dev` → http://localhost:3000

### Useful endpoints
- `GET /api/health` — status + configured providers
- `GET /api/llm/status` — live smoke test against the provider chain
- `GET /api/llm/config` — provider catalogue + current chain (keys masked)
- `PUT /api/llm/config` — pin a provider, set models, store API keys at runtime
- `POST /api/llm/test` — connection test for one provider (`{ "providerId": "groq" }`)
