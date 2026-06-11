# NebulaX — Self-Correcting Agent Swarm Weave

NebulaX is a living team-intelligence fabric. You define an **Intelligence Mission** in plain language; an autonomous agent swarm senses the web, weaves findings into a self-correcting memory graph, verifies claims, flags contradictions, and proposes executable next actions — every claim traceable, every human correction propagating through the fabric.

## Architecture

- **Frontend** — Vite + React 19 + TypeScript + Tailwind v4 + Motion (`src/App.tsx`, `src/components/`). A unified Swarm Workspace: five lenses over one fabric (Evidence Board with a 2D/3D constellation toggle, Flow Map, Temporal Vista, Triage, Replay), a docked Inspector panel (node detail / agent console / grounded chat / custom agents / mission pulse), a live agent-activity ticker with an expandable Brief & Actions pane, and a first-run spotlight tour.
- **Design system** — `src/index.css`: the LUNA theme — a deep-navy night sky (`#080b16`) with a luna-purple → luna-pink brand gradient and lavender accents, plus a daylit light-mode counterpart on the same semantic tokens. Bricolage Grotesque + Figtree + Spline Sans Mono variable fonts, glass morphism, starfield/moon/shooting-star ambience, gradient hero text, capability marquee, scroll-driven reveals, noise materials, and reduced-motion fallbacks throughout.
- **Backend** — Express, served alongside Vite from a single process (`server.ts`). REST API for missions, fabric, events, brief, actions, corrections, re-weave, and runtime LLM configuration.
- **Store** — in-memory DB persisted to `nebula-data.json` (`src/db.ts`), implementing the core IP: confidence propagation across a provenance graph, healed by the Watchdog on re-weave.
- **AI swarm** — `src/agents.ts` orchestrates the sensing → reasoning → synthesis → action pipeline.

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
