/**
 * Session logging via session.subscribe() and createPiagentSession for subagents.
 */
import type { AgentSession, CreateAgentSessionOptions } from "@earendil-works/pi-coding-agent";
import { join } from "path";
import { paths } from "../../config/config.js";
import * as logger from "../logging/observable-logger.js";
import type { PerformanceMonitor } from "../monitoring/performance-monitor.js";
import { createDefaultSessionManager, createPiagentSession } from "../pi/session-setup.js";

export type AgentType = "main" | "subagent" | "plan";

export interface CreateTrackedSessionOptions {
  agentType: AgentType;
  createOptions: Omit<CreateAgentSessionOptions, "resourceLoader"> & {
    cwd?: string;
    customTools?: CreateAgentSessionOptions["customTools"];
    model?: CreateAgentSessionOptions["model"];
  };
}

export function attachLogger(
  session: AgentSession,
  agentType: AgentType,
  perfMonitor?: PerformanceMonitor,
  llmPerfIdRef?: { current?: string },
): void {
  const startTimes = new Map<string, number>();
  const toolPerfIds = new Map<string, string>();
  let turnStartTime = 0;

  session.subscribe((event) => {
    switch (event.type) {
      case "turn_start":
        turnStartTime = Date.now();
        if (agentType === "main") logger.logTurnStart();
        break;
      case "turn_end":
        if (agentType === "main") logger.logTurnEnd();
        break;
      case "message_end": {
        const msg = event.message;
        if (!msg) break;
        if (msg.role === "assistant") {
          const text = msg.content?.find((c) => c.type === "text")?.text || "";
          const usage = msg.usage;
          const duration = turnStartTime ? Date.now() - turnStartTime : 0;
          const llmRunId = logger.logLLMStart("deepseek-chat", 1);
          logger.logLLMEnd(llmRunId, usage, text, duration);
          if (agentType === "main") {
            logger.logAgentEnd(msg.stopReason || "stop", usage, text);
            if (perfMonitor && llmPerfIdRef?.current) {
              perfMonitor.endLLMCall(llmPerfIdRef.current, usage, duration);
              llmPerfIdRef.current = undefined;
            }
          }
        }
        if (msg.role === "toolResult") {
          logger.logToolResult(
            msg.toolCallId,
            msg.toolCallId,
            msg.content,
            msg.isError ? new Error(String(msg.content)) : undefined,
          );
          if (agentType === "main") {
            const perfId = toolPerfIds.get(msg.toolCallId);
            if (perfMonitor && perfId) {
              perfMonitor.endToolCall(perfId, msg.toolName || "unknown", !msg.isError);
              toolPerfIds.delete(msg.toolCallId);
            }
          }
        }
        break;
      }
      case "tool_execution_start":
        startTimes.set(event.toolCallId, Date.now());
        logger.logToolCall(event.toolName, event.toolCallId, event.args);
        if (agentType === "main") {
          const perfId = perfMonitor?.startToolCall(event.toolName);
          if (perfId) toolPerfIds.set(event.toolCallId, perfId);
        }
        break;
      case "agent_end":
        if (agentType !== "main") {
          const msgs = event.messages || [];
          const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
          const text = lastAssistant?.content?.find((c) => c.type === "text")?.text || "";
          const llmCalls = msgs.filter((m) => m.role === "assistant").length;
          const toolCalls = msgs.filter((m) => m.role === "toolResult").length;
          const duration = turnStartTime ? Date.now() - turnStartTime : 0;
          logger.logSubagentEnd(agentType as "subagent" | "plan", text, llmCalls, toolCalls, duration);
        }
        break;
    }
  });
}

export function wrapSessionWithLogger(
  session: AgentSession,
  perfMonitor?: PerformanceMonitor,
): AgentSession {
  const llmPerfIdRef: { current?: string } = {};
  attachLogger(session, "main", perfMonitor, llmPerfIdRef);
  const originalPrompt = session.prompt.bind(session);
  session.prompt = async function (userMessage: string, options?: Parameters<AgentSession["prompt"]>[1]) {
    logger.logUserInput(userMessage);
    logger.logAgentStart(userMessage);
    if (perfMonitor) llmPerfIdRef.current = perfMonitor.startLLMCall();
    return originalPrompt(userMessage, options);
  };
  return session;
}

export async function createTrackedSession(opts: CreateTrackedSessionOptions): Promise<AgentSession> {
  const { agentType, createOptions } = opts;
  const cwd = createOptions.cwd ?? paths.root;
  const { session } = await createPiagentSession({
    cwd,
    sessionManager: createOptions.sessionManager ?? createDefaultSessionManager(cwd),
    customTools: createOptions.customTools ?? [],
    model: createOptions.model,
    channel: "terminal",
  });
  await session.bindExtensions({});

  attachLogger(session, agentType);

  const originalPrompt = session.prompt.bind(session);
  session.prompt = async function (userMessage: string, options?: Parameters<AgentSession["prompt"]>[1]) {
    logger.logSubagentStart(agentType as "subagent" | "plan", userMessage);
    return originalPrompt(userMessage, options);
  };

  return session;
}
