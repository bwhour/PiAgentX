/**
 * Background Spawn Tool - spawn 的异步分身
 *
 * 与 spawn 的区别：
 * - spawn: 阻塞等待 subagent 完成，返回结果
 * - spawn_background: 立即返回 task_id，subagent 在后台运行
 *
 * 结果通过 notification queue 注入回主 agent（在下次 prompt 前 drain）
 */
import { Type } from "@sinclair/typebox";
import { runSubagent } from "../../services/subagent/subagent-service.js";

interface BackgroundTask {
  taskId: string;
  description: string;
  status: "running" | "completed" | "error";
  result?: string;
}

interface Notification {
  taskId: string;
  description: string;
  status: "completed" | "error";
  result: string;
}

class BackgroundManager {
  private tasks = new Map<string, BackgroundTask>();
  private notificationQueue: Notification[] = [];
  private counter = 0;

  run(prompt: string, description: string): string {
    const taskId = `bg-${++this.counter}`;
    const task: BackgroundTask = { taskId, description, status: "running" };
    this.tasks.set(taskId, task);

    // fire-and-forget
    runSubagent(prompt).then(result => {
      task.status = "completed";
      task.result = result;
      this.notificationQueue.push({ taskId, description, status: "completed", result });
    }).catch(err => {
      const result = `Error: ${err instanceof Error ? err.message : String(err)}`;
      task.status = "error";
      task.result = result;
      this.notificationQueue.push({ taskId, description, status: "error", result });
    });

    console.log(`\n> spawn_background [${taskId}] (${description}): started`);
    return `Background task ${taskId} started: ${description}`;
  }

  drain(): Notification[] {
    const notifs = [...this.notificationQueue];
    this.notificationQueue = [];
    return notifs;
  }

  check(taskId?: string): string {
    if (taskId) {
      const t = this.tasks.get(taskId);
      if (!t) return `Unknown task: ${taskId}`;
      return `[${t.status}] ${t.description}\n${t.result ?? "(running)"}`;
    }
    if (this.tasks.size === 0) return "No background tasks.";
    return [...this.tasks.values()]
      .map(t => `${t.taskId}: [${t.status}] ${t.description}`)
      .join("\n");
  }
}

export const backgroundManager = new BackgroundManager();

export const spawnBackgroundTool = {
  name: "spawn_background",
  label: "后台派发子任务",
  description:
    "Launch a subagent in the background and return immediately without waiting for it to finish. " +
    "Use when a task is independent, long-running, and does not need to block the current conversation " +
    "(e.g., 'research X while I work on Y', 'fetch and summarize a report in parallel'). " +
    "Do NOT use when you need the result before proceeding — use spawn instead. " +
    "The result is injected automatically into the next conversation turn via notification. " +
    "Always provide a clear description so you can identify the task later with check_background.",
  parameters: Type.Object({
    prompt: Type.String({ description: "子任务的完整提示" }),
    description: Type.String({ description: "任务简短描述" })
  }),
  execute: async (_toolCallId: string, params: { prompt: string; description: string }) => {
    const result = backgroundManager.run(params.prompt, params.description);
    return {
      content: [{ type: "text" as const, text: result }],
      details: { description: params.description }
    };
  }
};

export const checkBackgroundTool = {
  name: "check_background",
  label: "检查后台任务",
  description:
    "Check the status of one or all background tasks started with spawn_background. " +
    "Pass a task_id to inspect a specific task (returns status and result if completed). " +
    "Omit task_id to list all background tasks and their current states. " +
    "Use this when you want to poll task progress or confirm a background task has finished before acting on its result.",
  parameters: Type.Object({
    task_id: Type.Optional(Type.String({ description: "任务 ID，不传则列出所有" }))
  }),
  execute: async (_toolCallId: string, params: { task_id?: string }) => {
    const result = backgroundManager.check(params.task_id);
    return {
      content: [{ type: "text" as const, text: result }],
      details: undefined
    };
  }
};
