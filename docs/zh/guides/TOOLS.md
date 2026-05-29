# Tools 配置说明

**语言：** [中文](TOOLS.md) | [English](../../en/guides/TOOLS.md)

## 默认工具

当前项目使用 `createAgentSession()` 时，**默认自动包含以下工具**：

```typescript
// 默认 codingTools 包含：
- read    // 读取文件
- bash    // 执行 bash 命令
- edit    // 编辑文件（精确替换）
- write   // 写入文件
```

这些工具在 `src/agent-loop.ts` 中通过以下方式自动加载：

```typescript
const result = await createAgentSession({
  cwd: process.cwd(),
  // tools 参数未指定，默认使用 codingTools
});
```

## 如何自定义工具

### 方式 1: 使用预定义工具集

```typescript
import { createAgentSession, createCodingTools, createReadOnlyTools } from "@earendil-works/pi-coding-agent";

// 使用完整的编程工具集（默认）
const result = await createAgentSession({
  cwd: process.cwd(),
  tools: createCodingTools(), // read, bash, edit, write
});

// 或使用只读工具集（安全模式）
const result = await createAgentSession({
  cwd: process.cwd(),
  tools: createReadOnlyTools(), // read, bash (只读)
});
```

### 方式 2: 选择特定工具

```typescript
import {
  createAgentSession,
  createReadTool,
  createBashTool,
  createWriteTool
} from "@earendil-works/pi-coding-agent";

const result = await createAgentSession({
  cwd: process.cwd(),
  tools: [
    createReadTool(),
    createBashTool(),
    createWriteTool(),
    // 不包含 edit 工具
  ],
});
```

### 方式 3: 添加自定义工具

```typescript
import { createAgentSession, createCodingTools } from "@earendil-works/pi-coding-agent";

const result = await createAgentSession({
  cwd: process.cwd(),
  tools: createCodingTools(), // 内置工具
  customTools: [
    // 添加自定义工具
    {
      name: "search_web",
      description: "搜索网页内容",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "搜索关键词" }
        },
        required: ["query"]
      },
      execute: async (input) => {
        // 实现搜索逻辑
        return `搜索结果: ${input.query}`;
      }
    }
  ],
});
```

## 可用的内置工具

| 工具 | 功能 | 创建函数 |
|------|------|---------|
| read | 读取文件内容 | `createReadTool()` |
| bash | 执行 bash 命令 | `createBashTool()` |
| edit | 精确编辑文件 | `createEditTool()` |
| write | 写入文件 | `createWriteTool()` |
| grep | 搜索文件内容 | `createGrepTool()` |
| find | 查找文件 | `createFindTool()` |
| ls | 列出目录 | `createLsTool()` |

## 修改当前项目的工具配置

编辑 `src/agent-loop.ts`：

```typescript
import {
  AgentSession,
  createAgentSession,
  createReadTool,
  createBashTool,
  createEditTool,
  createWriteTool,
  createGrepTool,
} from "@earendil-works/pi-coding-agent";

async function getSession() {
  if (!session) {
    const result = await createAgentSession({
      cwd: process.cwd(),
      tools: [
        createReadTool(),
        createBashTool(),
        createEditTool(),
        createWriteTool(),
        createGrepTool(), // 新增 grep 工具
      ],
    });
    session = result.session;
  }
  return session;
}
```

## 工具安全性

- **只读模式**: 使用 `createReadOnlyTools()` 防止文件修改
- **限制 bash**: 可以在 `createBashTool()` 中配置允许的命令
- **自定义验证**: 在 customTools 的 execute 中添加权限检查
