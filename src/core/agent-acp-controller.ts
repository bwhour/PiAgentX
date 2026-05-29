/**
 * Agent 使用 ACP 控制 Claude/Codex
 */

import { OpenClawBackend } from '../acp/openclaw-backend';

export class AgentAcpController {
  private backend = new OpenClawBackend();
  private sessions = new Map<string, string>();

  async askClaude(agentId: string, prompt: string): Promise<string> {
    const sessionId = this.sessions.get(`claude-${agentId}`);
    const result = await this.backend.runClaude(prompt, sessionId);
    this.sessions.set(`claude-${agentId}`, result.sessionId);
    return result.text;
  }

  async askCodex(agentId: string, prompt: string): Promise<string> {
    const sessionId = this.sessions.get(`codex-${agentId}`);
    const result = await this.backend.runCodex(prompt, sessionId);
    this.sessions.set(`codex-${agentId}`, result.sessionId);
    return result.text;
  }
}
