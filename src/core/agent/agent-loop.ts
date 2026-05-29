/**
 * Main agent session (normal mode) and programmatic agentLoop helper.
 */
import {
  type AgentSession,
  estimateTokens,
} from "@earendil-works/pi-coding-agent";
import type { Message } from "../../types/index.js";
import { microCompact } from "../../services/compaction/compaction-service.js";
import { join } from "path";
import {
  getSessionDir,
  getSessionKey,
} from "../../infrastructure/logging/observable-logger.js";
import { autoRecall } from "./system-prompt.js";
import {
  bootstrapPiagentApp,
  createDefaultSessionManager,
  createPiagentSession,
  finalizePiagentSession,
} from "../../infrastructure/pi/session-setup.js";

let session: AgentSession | null = null;

function getWorkspaceDir(): string {
  return join(getSessionDir(), "workspace");
}

export async function getSession(): Promise<AgentSession> {
  if (!session) {
    try {
      const { getEffectiveTools } = await bootstrapPiagentApp({
        pluginsLogLabel: "🔌 Plugins loaded",
      });

      const workspaceDir = getWorkspaceDir();
      const result = await createPiagentSession({
        cwd: workspaceDir,
        sessionManager: createDefaultSessionManager(workspaceDir),
        customTools: getEffectiveTools(),
        channel: "terminal",
      });
      session = result.session;

      await finalizePiagentSession(session, {
        profile: "full",
        workspaceDir,
        sessionDir: getSessionDir(),
        getEffectiveTools,
        logStartup: true,
        channel: "terminal",
      });

      console.log(`📋 Session: ${getSessionKey()}`);
    } catch (error) {
      console.error(
        "❌ Failed to create AgentSession:",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
  return session;
}

export async function agentLoop(messages: Message[]): Promise<void> {
  try {
    const agentSession = await getSession();

    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage.role !== "user") return;

    const userContent =
      typeof lastUserMessage.content === "string"
        ? lastUserMessage.content
        : Array.isArray(lastUserMessage.content)
          ? lastUserMessage.content.find((c) => typeof c === "object" && "text" in c)?.text || ""
          : "";

    if (!userContent.trim()) {
      console.warn("⚠️  Empty user message, skipping");
      return;
    }

    if (autoRecall(userContent)) {
      console.log("  🧠 [auto-recall] relevant memory found");
    }

    microCompact(agentSession.messages);

    const totalTokens = agentSession.messages.reduce(
      (sum, msg) => sum + estimateTokens(msg),
      0,
    );
    if (totalTokens > 40000) {
      console.log("🧠 Pre-compaction memory flush");
      await agentSession.prompt(
        "Pre-compaction memory flush: Use memory_write to save important facts, " +
          "decisions, and context worth remembering across sessions. Be selective.",
      );
    }

    await agentSession.prompt(userContent);

    const lastMsg = agentSession.messages.at(-1);
    if (lastMsg?.role === "assistant") {
      const textContent = lastMsg.content.find((c) => c.type === "text");
      if (textContent && "text" in textContent) {
        messages.push({ role: "assistant", content: textContent.text });
      }
    }
  } catch (error) {
    console.error("❌ agentLoop failed:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}
