/**
 * Main agent session (normal mode) and programmatic agentLoop helper.
 */
import {
  type AgentSession,
  estimateTokens,
} from "@earendil-works/pi-coding-agent";
import type { Message } from "../../types/index.js";
import {
  allCustomTools,
  initCompactTool,
  initBrowserTool,
  initTaskTools,
  initMemoryTools,
} from "../../infrastructure/tools/index.js";
import type { ToolDefinition } from "../../infrastructure/tools/index.js";
import { loadPlugins } from "../../infrastructure/plugins/index.js";
import { microCompact } from "../../services/compaction/compaction-service.js";
import { join } from "path";
import { paths } from "../../config/config.js";
import {
  getSessionDir,
  getSessionKey,
  logSystemPrompt,
  logBootstrapFiles,
} from "../../infrastructure/logging/observable-logger.js";
import { autoRecall, buildAgentSystemPrompt } from "./system-prompt.js";
import { bootstrapData } from "../../config/config.js";
import {
  createDefaultSessionManager,
  createPiagentSession,
  loadProjectSkills,
  registerPluginSkills,
} from "../../infrastructure/pi/session-setup.js";

let session: AgentSession | null = null;
let pluginTools: ToolDefinition[] = [];

function getWorkspaceDir(): string {
  return join(getSessionDir(), "workspace");
}

function getEffectiveTools(): ToolDefinition[] {
  return [...allCustomTools, ...pluginTools];
}

export async function getSession(): Promise<AgentSession> {
  if (!session) {
    try {
      initMemoryTools(paths.piDir);

      const skills = loadProjectSkills(paths.root);
      const pluginRegistry = await loadPlugins(paths.pluginDirs);
      pluginTools = pluginRegistry.tools;

      if (pluginRegistry.records.length > 0) {
        console.log("🔌 Plugins loaded:");
        for (const r of pluginRegistry.records) {
          if (r.status === "loaded") {
            console.log(`  ✅ ${r.name}: ${r.toolCount} tools, ${r.skillCount} skills`);
          } else {
            console.warn(`  ❌ ${r.name}: ${r.error}`);
          }
        }
      }

      registerPluginSkills(skills, pluginRegistry.skills);

      const workspaceDir = getWorkspaceDir();
      const effectiveTools = getEffectiveTools();
      const result = await createPiagentSession({
        cwd: workspaceDir,
        sessionManager: createDefaultSessionManager(workspaceDir),
        customTools: effectiveTools,
        channel: "terminal",
      });
      session = result.session;
      initCompactTool(session);

      console.log(`📋 Session: ${getSessionKey()}`);
      logBootstrapFiles(bootstrapData);
      logSystemPrompt(
        buildAgentSystemPrompt({
          memoryContext: "",
          dailyMemory: "",
          tools: effectiveTools,
          workspaceDir,
        }),
        0,
      );

      initTaskTools(join(getSessionDir(), "tasks"));
      initBrowserTool(getSessionDir());

      try {
        const { getMemoryStore } = await import("../../services/intelligence/memory-store.js");
        const stats = getMemoryStore().getStats();
        console.log(
          `🧠 Memory: evergreen ${stats.evergreenChars} chars, ${stats.dailyFiles} daily files (${stats.dailyEntries} entries)`,
        );
      } catch {
        /* optional */
      }
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
