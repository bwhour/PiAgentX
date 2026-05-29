/**
 * Agent Loop tests (session init; LLM cases need DEEPSEEK_API_KEY or OPENAI_API_KEY).
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getSession, agentLoop } from '../src/core/agent/agent-loop.js';
import type { Message } from '../src/types/index.js';
import * as logger from '../src/infrastructure/logging/observable-logger.js';

const hasLlmKey = Boolean(process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY);
const describeAgent = hasLlmKey ? describe : describe.skip;

describeAgent('Agent Loop', () => {
  let session: any;

  beforeEach(async () => {
    logger.initSession('jest_agent_loop');
    session = await getSession();
  });

  afterEach(() => {
    // 清理
  });

  it('应该成功创建 session', async () => {
    expect(session).toBeDefined();
    expect(session.agent).toBeDefined();
    expect(session.sessionManager).toBeDefined();
  });

  it('应该处理简单的用户消息', async () => {
    const messages: Message[] = [
      { role: 'user', content: 'echo "hello"' }
    ];

    await agentLoop(messages);

    expect(messages.length).toBeGreaterThan(1);
    expect(messages[messages.length - 1].role).toBe('assistant');
  });

  it('应该跳过空消息', async () => {
    const messages: Message[] = [
      { role: 'user', content: '' }
    ];

    await agentLoop(messages);

    expect(messages.length).toBe(1);
  });
});
