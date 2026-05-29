/**
 * Custom tools registry for piagent (merged with SDK built-ins at session creation).
 */
export type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import { spawnTool } from "./spawn.js";
import { compactTool, initCompactTool } from "./compact-tool.js";
import { browserTool, initBrowserTool } from "./browser-tool.js";
import {
  taskCreateTool,
  taskUpdateTool,
  taskListTool,
  taskGetTool,
  initTaskTools,
} from "./task-tools.js";
import { planTool } from "./plan-tool.js";
import { clarifyTool } from "./clarify-tool.js";
import { reflectTool } from "./reflect-tool.js";
import { memoryWriteTool, memorySearchTool } from "./memory-tool.js";
import { askClaudeTool, askCodexTool } from "./acp-tool.js";

export { initCompactTool, initBrowserTool, initTaskTools };
export { initMemoryTools } from "./memory-tool.js";

/** Ensure custom tools appear in the SDK "Available tools" section (0.59+). */
function withSnippet<T extends ToolDefinition>(tool: T, snippet: string): T {
  return { ...tool, promptSnippet: snippet };
}

export const allCustomTools: ToolDefinition[] = [
  withSnippet(planTool, "plan_task: Structured planning before complex work"),
  withSnippet(clarifyTool, "clarify: Ask user for missing requirements"),
  withSnippet(taskCreateTool, "task_create: Create tracked task"),
  withSnippet(taskUpdateTool, "task_update: Update task status"),
  withSnippet(taskListTool, "task_list: List tasks"),
  withSnippet(reflectTool, "reflect: Post-task reflection"),
  withSnippet(memoryWriteTool, "memory_write: Persist facts across sessions"),
  withSnippet(memorySearchTool, "memory_search: Search saved memory"),
  withSnippet(taskGetTool, "task_get: Get one task"),
  withSnippet(spawnTool, "spawn: Delegate isolated subtask"),
  compactTool,
  withSnippet(browserTool, "browser: Playwright browser automation"),
  withSnippet(askClaudeTool, "ask_claude: Query Claude via CLI"),
  withSnippet(askCodexTool, "ask_codex: Query Codex via CLI"),
];
