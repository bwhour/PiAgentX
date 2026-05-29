/**
 * ACP Tool - Agent 调用 Claude/Codex
 */
import { Type } from "@sinclair/typebox";
import { AgentAcpController } from "../../core/agent-acp-controller.js";

const controller = new AgentAcpController();

export const askClaudeTool = {
  name: "ask_claude",
  label: "询问 Claude",
  description:
    "Ask Claude (via CLI) a question and get a response. Maintains conversation context per agent. " +
    "WHEN to use: need Claude's analysis, code review, or general reasoning on a specific question. " +
    "DO NOT use for tasks you can handle directly with your own tools.",
  parameters: Type.Object({
    prompt: Type.String({ description: "The question or instruction to send to Claude" })
  }),
  execute: async (_toolCallId: string, params: { prompt: string }) => {
    const answer = await controller.askClaude('default', params.prompt);
    return {
      content: [{ type: "text" as const, text: answer }],
      details: { prompt: params.prompt }
    };
  }
};

export const askCodexTool = {
  name: "ask_codex",
  label: "询问 Codex",
  description:
    "Ask Codex (GPT-5.4 via CLI) a question and get a response. Maintains conversation context per agent. " +
    "WHEN to use: need Codex's code generation, debugging help, or technical analysis. " +
    "DO NOT use for simple tasks or when you already have the answer.",
  parameters: Type.Object({
    prompt: Type.String({ description: "The question or instruction to send to Codex" })
  }),
  execute: async (_toolCallId: string, params: { prompt: string }) => {
    const answer = await controller.askCodex('default', params.prompt);
    return {
      content: [{ type: "text" as const, text: answer }],
      details: { prompt: params.prompt }
    };
  }
};
