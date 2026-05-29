#!/usr/bin/env tsx
import { OpenClawBackend } from './openclaw-backend';

async function main() {
  const backend = new OpenClawBackend();

  console.log('🧪 测试 Claude (OpenClaw 方式)...\n');
  const claudeResult = await backend.runClaude('用一句话介绍你自己');
  console.log(claudeResult);

  console.log('\n🧪 测试 Codex (OpenClaw 方式)...\n');
  const codexResult = await backend.runCodex('写一个 hello world');
  console.log(codexResult);
}

main().catch(console.error);
