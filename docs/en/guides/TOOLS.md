# Tools configuration

**Language:** [中文](../../zh/guides/TOOLS.md) | **English**

> SDK: `@earendil-works/pi-coding-agent` **0.75.4**

## Default tools

When using `createAgentSession()` without a custom tool list, **coding tools** are included:

- `read` — read files
- `bash` — run shell commands
- `edit` — precise in-place edits
- `write` — write files

In this project, built-in tools are merged with **custom tools** via `customTools` in `createPiagentRuntime()` / `createPiagentSession()` (see `src/infrastructure/pi/create-runtime.ts`).

## Customize tools

### Predefined sets

```typescript
import { createAgentSession, createCodingTools, createReadOnlyTools } from "@earendil-works/pi-coding-agent";

await createAgentSession({
  cwd: process.cwd(),
  customTools: createCodingTools(),
});
```

### Pick specific built-ins

```typescript
import {
  createAgentSession,
  createReadTool,
  createBashTool,
  createWriteTool,
} from "@earendil-works/pi-coding-agent";

await createAgentSession({
  cwd: process.cwd(),
  customTools: [createReadTool(), createBashTool(), createWriteTool()],
});
```

### Add project custom tools

Register tools in `src/infrastructure/tools/index.ts` and pass them through `createPiagentRuntime({ backgroundMode })` or `createPiagentSession({ customTools })`.

## Built-in tool factories

| Tool | Purpose | Factory |
|------|---------|---------|
| read | Read file | `createReadTool()` |
| bash | Shell | `createBashTool()` |
| edit | Edit file | `createEditTool()` |
| write | Write file | `createWriteTool()` |
| grep | Search | `createGrepTool()` |
| find | Find files | `createFindTool()` |
| ls | List dir | `createLsTool()` |

## Safety

- Read-only: `createReadOnlyTools()`
- Restrict bash in `createBashTool()` options
- Validate inputs in custom `execute` handlers
