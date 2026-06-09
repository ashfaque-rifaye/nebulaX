# Nebula — Self-Correcting Agent Swarm Weave

Nebula is a living team-intelligence fabric. You define an **Intelligence Mission** in plain language; an autonomous agent swarm senses the web, weaves findings into a self-correcting memory graph, verifies claims, flags contradictions, and proposes executable next actions — every claim traceable, every human correction propagating through the fabric.

## Architecture

- **Frontend** — Vite + React + TypeScript + Tailwind (`src/App.tsx`, `src/components/`). Interactive Weave Canvas, traceable brief, proposed actions, live agent rail, activity feed, and a tower-defense mini-game.
- **Backend** — Express, served alongside Vite from a single process (`server.ts`). REST API for missions, fabric, events, brief, actions, corrections, and re-weave.
- **Store** — in-memory DB persisted to `nebula-data.json` (`src/db.ts`), implementing the core IP: confidence propagation + human-veto ground truth.
- **AI swarm** — `src/agents.ts` orchestrates the sensing → reasoning → synthesis → action pipeline.

## AI providers (multi-provider fallback chain)

The AI layer (`src/llm.ts`) is provider-agnostic and OpenAI-compatible. It tries providers in order and uses the first that responds:

1. **Groq** (primary) — `llama-3.3-70b-versatile`
2. **Cerebras** (fallback) — `llama-3.3-70b`
3. **Hugging Face** (fallback) — `mistralai/Mistral-7B-Instruct-v0.3`

If no keys are set, the swarm runs a high-fidelity simulation so the UI is always demoable.

## Run locally

**Prerequisites:** Node.js 18+

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set at least `GROQ_API_KEY` (Cerebras / HF optional).
3. Run: `npm run dev` → http://localhost:3000

### Useful endpoints
- `GET /api/health` — status + configured providers
- `GET /api/llm/status` — live smoke test against the provider chain
