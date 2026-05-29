/** Lightweight message types for agentLoop() callers (not SDK AgentMessage). */

export interface UserMessage {
  role: "user";
  content: string | Array<{ type: "text"; text: string }>;
}

export interface AssistantMessage {
  role: "assistant";
  content: string;
}

export type Message = UserMessage | AssistantMessage;
