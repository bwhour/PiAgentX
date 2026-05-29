#!/usr/bin/env tsx
import { OpenClawBackend } from './openclaw-backend';

async function main() {
  const backend = new OpenClawBackend();

  console.log('🧪 测试 Codex 多轮对话...\n');

  const r1 = await backend.runCodex('写一个加法函数');
  console.log('第1轮:', r1.text);
  console.log('SessionID:', r1.sessionId, '\n');

  const r2 = await backend.runCodex('给它加注释', r1.sessionId);
  console.log('第2轮:', r2.text);
}

main().catch(console.error);
