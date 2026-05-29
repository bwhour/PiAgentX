# PI Agent Architecture (0.75)

**Language:** [中文](../zh/ARCHITECTURE.md) | **English**

Primary architecture reference. Upgraded from `@mariozechner/*` **0.58.3** to `@earendil-works/*` **0.75.4**.

## Layers

```text
api -> services -> core
  \-> infrastructure
```

- `api/` — Entrypoints (CLI, Feishu)
- `services/` — Orchestration (subagent, plan, compaction, recovery)
- `core/` — Domain logic (agent loop, tasks, prompts, session mapping)
- `infrastructure/` — Integrations (tools, plugins, logging, monitoring, pi runtime/session)

## Runtime components (0.75)

- `src/infrastructure/pi/create-runtime.ts` — Builds `AgentSessionRuntime`, wires tools/plugins/extensions
- `src/infrastructure/pi/session-setup.ts` — `createPiagentSession()`, skills, `SessionManager`
- `src/infrastructure/pi/dynamic-prompt-extension.ts` — Dynamic system prompt on `before_agent_start`

## Entrypoints & sessions

- CLI: `src/api/index.ts` (`InteractiveMode(runtime)`)
- Feishu: `src/api/feishu.ts`
- Session wrapper: `src/infrastructure/session/session-factory.ts`

## Design rules

- Keep **core** free of vendor-specific adapters
- **Services** orchestrate only; no low-level I/O
- **Infrastructure** owns replaceable dependencies
- **API** composes layers; avoid heavy business logic

## Related docs

- [Source map (EN)](../../src/README.en.md)
- [Doc index](README.md)
- [架构（中文）](../zh/ARCHITECTURE.md)
