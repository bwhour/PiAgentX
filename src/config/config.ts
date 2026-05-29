/**
 * Central configuration.
 */
import type { Model } from "@earendil-works/pi-ai";
import { join } from "path";
import { BootstrapLoader } from "../services/intelligence/bootstrap-loader.js";

// Load bootstrap once at startup (skills/memory refresh each turn in agent-loop)
const _bootstrapLoader = new BootstrapLoader(join(process.cwd(), ".pi"));
export const bootstrapData = _bootstrapLoader.loadAll("full");

// pi-ai 在 provider="openai" 时默认读取 OPENAI_API_KEY。
// 当前项目把 DeepSeek 作为 OpenAI 兼容接口使用，因此做一次别名兜底。
if (!process.env.OPENAI_API_KEY && process.env.DEEPSEEK_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.DEEPSEEK_API_KEY;
}

/**
 * 模型配置
 */
export function createDeepSeekModel(): Model<'openai-completions'> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

  console.log("🔧 创建 DeepSeek 模型:");
  console.log("  API Key:", apiKey ? `${apiKey.slice(0, 10)}...` : "❌ 未设置");
  console.log("  Base URL:", baseUrl);

  if (!apiKey) {
    throw new Error("❌ DEEPSEEK_API_KEY 未设置");
  }

  // 确保 OPENAI_API_KEY 被设置（pi-ai 库依赖此环境变量）
  if (!process.env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = apiKey;
  }

  return {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    api: 'openai-completions',
    provider: 'openai',
    baseUrl,
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 64000,
    maxTokens: 8000,
  };
}

/**
 * 路径配置
 */
export const paths = {
  root: process.cwd(),
  piDir: join(process.cwd(), ".pi"),
  sessionsDir: join(process.cwd(), ".pi", "sessions"),
  sessionMapFile: join(process.cwd(), ".pi", "session-id-map.json"),
  skillsDir: join(process.cwd(), "skills"),
  /** 插件目录列表：项目级 plugins/ 和用户本地 .pi/plugins/ */
  pluginDirs: [
    join(process.cwd(), "plugins"),
    join(process.cwd(), ".pi", "plugins"),
  ],
};

/**
 * 压缩配置
 */
export const compactionConfig = {
  // Keep the N most recent tool call results
  keepRecentToolResults: 3,
  // Compact tool results only when longer than this
  minLengthToCompact: 100,
};

/**
 * Agent configuration placeholder.
 *
 * systemPrompt is built each turn by dynamic-prompt-extension (before_agent_start).
 * Tool instructions come from .pi/bootstrap/TOOLS.md.
 */
export const agentConfig = {};
