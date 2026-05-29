# PI Agent

[中文](README.md)

TypeScript application layer on [@earendil-works/pi-coding-agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) **0.75.4**: terminal CLI, Feishu bot, tasks, memory, sub-agents, and custom tools.

## Features
- Terminal UI (`AgentSessionRuntime` + `InteractiveMode` + custom tools)
- Per-turn system prompt via `before_agent_start` (memory recall + bootstrap; see `src/infrastructure/pi/dynamic-prompt-extension.ts`)
- Feishu multi-session bot (`npm run feishu`)
- Task workflow, cross-session memory, context compaction
- Default DeepSeek (OpenAI-compatible API); other providers supported
- Node.js **≥ 22.19.0**

## Upgrade (0.75)
From `@mariozechner/*` **0.58.3** to `@earendil-works/*` **0.75.4** (`pi-coding-agent` / `pi-ai` / `pi-agent-core` / `pi-tui`).

- Dependencies: `@mariozechner/*` 0.58.3 → `@earendil-works/*` 0.75.4
- Runtime: `AgentSessionRuntime` + `InteractiveMode(runtime)`
- System prompt: dynamic injection via `before_agent_start`
- Sessions: CLI, Feishu, and sub-agents share `infrastructure/pi/session-setup.ts`

## Project layout

```
PiAgentX/
├── src/
│   ├── api/              # CLI, Feishu entrypoints
│   ├── core/             # agent-loop, sessions, tasks, events
│   ├── services/         # memory, compaction, plan, subagent
│   ├── infrastructure/   # tools, plugins, pi runtime/session
│   ├── config/
│   └── types/
├── plugins/
├── docs/en/
├── tests/
└── .env.example
```

### Source tree (`src/`)
```text
src/
├── api/              # CLI, Feishu
├── core/             # agent loop, tasks, prompts
├── services/         # subagent, plan, compaction, recovery
├── infrastructure/   # tools, plugins, logging, runtime/session
├── config/
└── types/
```

### Entrypoints
- `api/index.ts` — CLI (`InteractiveMode(runtime)`)
- `api/feishu.ts` — Feishu multi-session bot

### Key modules

#### Runtime / session (0.75)
- `infrastructure/pi/create-runtime.ts` — `AgentSessionRuntime`, tools, plugins, extensions
- `infrastructure/pi/session-setup.ts` — `createPiagentSession()`, skills, `SessionManager`
- `infrastructure/pi/dynamic-prompt-extension.ts` — dynamic system prompt on `before_agent_start`

#### Execution & services
- `core/agent/agent-loop.ts` — main agent loop
- `core/agent/background-agent-loop.ts` — background mode
- `services/subagent/subagent-service.ts` — isolated sub-agent context
- `services/compaction/compaction-service.ts` — context compaction
- `services/recovery/error-recovery-service.ts` — retry and fallback

#### Tools & observability
- `infrastructure/tools/` — custom tools (memory, compact, task, browser, …)
- `infrastructure/plugins/` — plugin loader
- `infrastructure/logging/observable-logger.ts`
- `infrastructure/monitoring/performance-monitor.ts`
- `infrastructure/session/session-factory.ts`

## Quick start
### 1. Install
```bash
npm install
```
Edit `.env` for your LLM provider:
```bash
cp .env.example .env

LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
MODEL_ID=deepseek-chat

LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
MODEL_ID=claude-sonnet-4-20250514

LLM_PROVIDER=openai
OPENAI_API_KEY=sk-xxx
MODEL_ID=gpt-4-turbo
```
### 2. Run
```bash
# Terminal CLI
npm run dev
# Feishu bot (FEISHU_APP_ID / FEISHU_APP_SECRET)
npm run feishu
# Background parallel sub-tasks
BACKGROUND_MODE=true npm run dev
```
### Run & operate
> <small>
>
> `npm run build` · `npm test` · `npm run start` (after build)
> CLI: Enter to run; quit with `q` / `exit` / `Ctrl+C`
> Feishu: `Ctrl+C` to stop; env vars above; also `FEISHU_APP_ID` / `FEISHU_APP_SECRET`
>
> </small>
## Docs
- [Index](docs/en/README.md)
- [Architecture](docs/en/ARCHITECTURE.md)
- [Source map (short)](src/README.en.md)

## Stack
- `@earendil-works/pi-coding-agent` / `pi-ai` / `pi-agent-core` / `pi-tui` @ 0.75.4
- `@larksuiteoapi/node-sdk` (Feishu)
- TypeScript 5.9+

## License
MIT