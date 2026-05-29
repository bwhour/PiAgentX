/**
 * Task Tools - 任务管理工具集
 */
import type { ToolDefinition } from "./index.js";
import { Type } from "@sinclair/typebox";
import { TaskManager } from "../../core/task/task-manager.js";

let taskManager: TaskManager;

/**
 * 初始化任务工具
 */
export function initTaskTools(tasksDir: string): void {
  taskManager = new TaskManager(tasksDir);
}

/**
 * 确保 TaskManager 已初始化
 */
function ensureInitialized(): void {
  if (!taskManager) {
    throw new Error("TaskManager not initialized. Call initTaskTools() first.");
  }
}

/**
 * 创建任务工具（支持单个和批量）
 */
export const taskCreateTool: ToolDefinition = {
  name: "task_create",
  label: "创建任务",
  description:
    "TRACKING TOOL — record one or more units of work before executing. " +
    "Pass a single-item array to create one task, or multiple items to create all at once (atomic). " +
    "Use after plan_task: create all steps in one call before executing anything. " +
    "Do NOT use as a substitute for planning — plan first, then create tasks to track execution. " +
    "Be specific: tasks like 'do the thing' are unambiguous to complete; tasks like 'fix the bug' are not.",
  parameters: Type.Object({
    tasks: Type.Array(
      Type.Object({
        subject: Type.String({ description: "Task subject — specific enough that 'completed' is unambiguous" }),
        description: Type.Optional(Type.String({ description: "Optional detail or acceptance criteria" }))
      }),
      { description: "Tasks to create (one or more)", minItems: 1 }
    )
  }),
  execute: async (_toolCallId, params: any) => {
    try {
      ensureInitialized();
      const result = taskManager.createBatch(params.tasks);
      return {
        content: [{ type: "text" as const, text: result }],
        details: undefined
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error creating tasks: ${message}` }],
        details: undefined
      };
    }
  }
};

/**
 * 更新任务工具（支持单个和批量，支持状态和依赖关系）
 */
export const taskUpdateTool: ToolDefinition = {
  name: "task_update",
  label: "更新任务",
  description:
    "Update the status and/or dependencies of one or more tasks. " +
    "Pass a single-item array to update one task, or multiple items to update all at once. " +
    "Set status to 'in_progress' when starting work, and 'completed' immediately when done — keep status current so task_list stays accurate. " +
    "Use addBlockedBy to declare prerequisites; use addBlocks to declare what this task unblocks.",
  parameters: Type.Object({
    updates: Type.Array(
      Type.Object({
        task_id: Type.Integer({ description: "Task ID to update" }),
        status: Type.Optional(Type.Union([
          Type.Literal("pending"),
          Type.Literal("in_progress"),
          Type.Literal("completed")
        ], { description: "New status (omit to leave unchanged)" })),
        addBlockedBy: Type.Optional(Type.Array(Type.Integer(), { description: "IDs of tasks that must complete before this one can start" })),
        addBlocks: Type.Optional(Type.Array(Type.Integer(), { description: "IDs of tasks that this task unblocks upon completion" }))
      }),
      { description: "Tasks to update (one or more)", minItems: 1 }
    )
  }),
  execute: async (_toolCallId, params: any) => {
    try {
      ensureInitialized();
      const results: string[] = [];
      for (const u of params.updates) {
        taskManager.update(u.task_id, u.status, u.addBlockedBy, u.addBlocks);
        const statusPart = u.status ? ` → ${u.status}` : "";
        const blockedByPart = u.addBlockedBy?.length ? ` (blocked by: ${u.addBlockedBy.join(", ")})` : "";
        const blocksPart = u.addBlocks?.length ? ` (unblocks: ${u.addBlocks.join(", ")})` : "";
        results.push(`#${u.task_id}${statusPart}${blockedByPart}${blocksPart}`);
      }
      return {
        content: [{ type: "text" as const, text: results.join("\n") }],
        details: undefined
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error updating tasks: ${message}` }],
        details: undefined
      };
    }
  }
};

/**
 * 列出所有任务工具
 */
export const taskListTool: ToolDefinition = {
  name: "task_list",
  label: "列出任务",
  description:
    "List all tasks with their IDs, statuses, and dependency relationships. " +
    "Use to get an overview of what has been planned, what is in progress, and what remains. " +
    "Check this after completing a task to decide what to work on next.",
  parameters: Type.Object({}),
  execute: async () => {
    try {
      ensureInitialized();
      const result = taskManager.listAll();
      return {
        content: [{ type: "text" as const, text: result }],
        details: undefined
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error listing tasks: ${message}` }],
        details: undefined
      };
    }
  }
};

/**
 * 获取任务详情工具
 */
export const taskGetTool: ToolDefinition = {
  name: "task_get",
  label: "获取任务详情",
  description:
    "Get full details of a specific task by ID, including description, status, and dependencies. " +
    "Use when task_list output is not enough and you need to recall the original task description or check exact dependency state.",
  parameters: Type.Object({
    task_id: Type.Integer({ description: "Task ID" })
  }),
  execute: async (_toolCallId, params: any) => {
    try {
      ensureInitialized();
      const result = taskManager.get(params.task_id);
      return {
        content: [{ type: "text" as const, text: result }],
        details: undefined
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error getting task: ${message}` }],
        details: undefined
      };
    }
  }
};
