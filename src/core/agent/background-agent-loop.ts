/**
 * Background mode: spawn_background + check_background; drains queue before each prompt.
 */
import { type AgentSession } from "@earendil-works/pi-coding-agent";
import type { Message } from "../../types/index.js";
import { backgroundManager } from "../../infrastructure/tools/background-spawn.js";
import { initTaskTools } from "../../infrastructure/tools/task-tools.js";
import { microCompact } from "../../services/compaction/compaction-service.js";
import { join } from "path";
import { SessionIdMapper } from "../session/session-id-mapper.js";
import { paths } from "../../config/config.js";
import {
  createDefaultSessionManager,
  createPiagentSession,
  loadProjectSkills,
} from "../../infrastructure/pi/session-setup.js";
import { backgroundCustomTools } from "../../infrastructure/tools/background-tools.js";

let session: AgentSession | null = null;

function getNotificationsText(): string {
  const notifs = backgroundManager.drain();
  if (notifs.length === 0) return "";

  const text = notifs
    .map((n) => `[${n.taskId}] ${n.status}: ${n.description}\n${n.result}`)
    .join("\n\n");

  console.log(`\n📬 Injected ${notifs.length} background result(s)`);
  return `<background-results>\n${text}\n</background-results>\n\n`;
}

export async function getSession(): Promise<AgentSession> {
  if (!session) {
    loadProjectSkills(paths.root);
    const result = await createPiagentSession({
      cwd: paths.root,
      sessionManager: createDefaultSessionManager(paths.root),
      customTools: backgroundCustomTools,
      channel: "terminal",
    });
    session = result.session;

    const sessionUuid = session.sessionManager.getSessionId() || "default";
    const mapper = new SessionIdMapper(paths.sessionMapFile);
    console.log(`📋 Session: ${mapper.getFriendlyId(sessionUuid)} (${sessionUuid})`);

    initTaskTools(join(paths.sessionsDir, sessionUuid, "tasks"));
  }
  return session;
}

export async function agentLoop(messages: Message[]): Promise<void> {
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

  microCompact(agentSession.messages);

  const finalPrompt = getNotificationsText() + userContent;
  await agentSession.prompt(finalPrompt);

  const lastMsg = agentSession.messages.at(-1);
  if (lastMsg?.role === "assistant") {
    const textContent = lastMsg.content.find((c) => c.type === "text");
    if (textContent && "text" in textContent) {
      messages.push({ role: "assistant", content: textContent.text });
    }
  }
}
