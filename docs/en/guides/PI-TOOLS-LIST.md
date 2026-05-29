# PI coding-agent built-in tools

**Language:** [中文](../../zh/guides/PI-TOOLS-LIST.md) | **English**

> Package path: `node_modules/@earendil-works/pi-coding-agent`

## Inspect locally

```bash
ls node_modules/@earendil-works/pi-coding-agent/dist/core/tools/*.d.ts
```

```typescript
import { codingTools } from "@earendil-works/pi-coding-agent";
console.log(codingTools);
```

## Core tools (7)

| Tool | Role |
|------|------|
| **read** | Read file (optional offset/limit) |
| **write** | Create or overwrite file |
| **edit** | Replace exact string in file |
| **grep** | Search content (regex) |
| **find** | Find files by name |
| **ls** | List directory |
| **bash** | Run shell command |

## Typical task mapping

| Task | Prefer | Fallback |
|------|--------|----------|
| Read file | `read` | `bash cat` |
| Write file | `write` | `bash` |
| Patch file | `edit` | `bash sed` |
| Search text | `grep` | `bash grep` |
| Find files | `find` | `bash find` |
| List dir | `ls` | `bash ls` |
| Other | `bash` | — |

## Import factories

```typescript
import {
  createReadTool,
  createWriteTool,
  createEditTool,
  createBashTool,
  createGrepTool,
  createFindTool,
  createLsTool,
  codingTools,
} from "@earendil-works/pi-coding-agent";
```

Default `codingTools` set: `read`, `bash`, `edit`, `write`.
