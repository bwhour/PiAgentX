/**
 * Spawn Tool - 派发子任务给 subagent
 */
import { Type } from "@sinclair/typebox";
import { runSubagent } from "../../services/subagent/subagent-service.js";

export const spawnTool = {
  name: "spawn",
  label: "派发子任务",
  description:
    "Delegate a self-contained subtask to an independent subagent and wait for the result. " +
    "Use when a task is well-scoped or better handled in isolation to keep the main context clean " +
    "(e.g., 'research topic X', 'summarize this file', 'run this analysis'). " +
    "The subagent starts with a fresh context and returns only a summary — it cannot share state with the current agent. " +
    "Do NOT use for tasks that depend on the current conversation history or need access to in-progress state.",
  parameters: Type.Object({
    prompt: Type.String({ description: "Complete prompt for the subtask — include all necessary context since the subagent starts fresh" }),
    description: Type.String({ description: "Short label for this subtask (shown in logs)" })
  }),
  execute: async (_toolCallId: string, params: { prompt: string; description: string }) => {
    console.log(`\n> spawn (${params.description}): ${params.prompt.substring(0, 80)}...`);

    const summary = await runSubagent(params.prompt);

    console.log(`  ${summary.substring(0, 200)}...\n`);

    return {
      content: [{ type: "text" as const, text: summary }],
      details: { description: params.description }
    };
  }
};
