/**
 * Injects per-turn system prompt (memory recall + bootstrap) via before_agent_start.
 * Required on pi-coding-agent 0.75+ — mutating agent.state.systemPrompt before prompt() is reset.
 */
import type { ExtensionFactory, ToolDefinition } from "@earendil-works/pi-coding-agent";
import { paths } from "../../config/config.js";
import {
  autoRecall,
  buildAgentSystemPrompt,
  readDailyMemory,
} from "../../core/agent/system-prompt.js";

export type PromptChannel = "terminal" | "api";

export interface DynamicPromptExtensionOptions {
  workspaceDir: string;
  getTools: () => ToolDefinition[];
  channel?: PromptChannel;
}

export function createDynamicPromptExtension(
  options: DynamicPromptExtensionOptions,
): ExtensionFactory {
  const channel = options.channel ?? "terminal";

  return (pi) => {
    pi.on("before_agent_start", async (event) => {
      const memoryContext = autoRecall(event.prompt);
      const dailyMemory = readDailyMemory(paths.piDir);
      const systemPrompt = buildAgentSystemPrompt({
        memoryContext,
        dailyMemory,
        tools: options.getTools(),
        workspaceDir: options.workspaceDir,
        channel,
      });
      return { systemPrompt };
    });
  };
}
