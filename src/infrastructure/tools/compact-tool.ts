/**
 * Manual context compaction via AgentSession.compact() (SDK 0.75+).
 */
import { Type } from "@sinclair/typebox";
import type { AgentSession } from "@earendil-works/pi-coding-agent";

let sessionRef: AgentSession | null = null;

export function initCompactTool(session: AgentSession) {
  sessionRef = session;
}

export const compactTool = {
  name: "compact",
  label: "Compact context",
  promptSnippet: "compact: Summarize and compress conversation to free context window",
  description:
    "Manually trigger conversation compaction to reclaim context window space. " +
    "Use when the conversation is getting long and you notice degraded recall, or proactively before starting a large task that will consume many tokens. " +
    "Do NOT use routinely after every response — compaction discards raw history and replaces it with a summary, so only trigger it when context pressure is real. " +
    "Optionally provide a focus hint to tell the summarizer what to preserve (e.g., 'current task state and file paths').",
  parameters: Type.Object({
    focus: Type.Optional(
      Type.String({ description: "What to preserve in the summary" }),
    ),
  }),
  execute: async (_toolCallId: string, params: { focus?: string }) => {
    if (!sessionRef) {
      return {
        content: [{ type: "text" as const, text: "Session not initialized" }],
        details: undefined,
      };
    }

    try {
      const beforeCount = sessionRef.messages.length;
      await sessionRef.compact(params.focus);
      return {
        content: [
          {
            type: "text" as const,
            text: `✅ Compaction complete (was ${beforeCount} messages).${params.focus ? `\nFocus: ${params.focus}` : ""}`,
          },
        ],
        details: undefined,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn("⚠️  Compaction failed:", message);
      return {
        content: [{ type: "text" as const, text: `❌ Compaction failed: ${message}` }],
        details: undefined,
      };
    }
  },
};
