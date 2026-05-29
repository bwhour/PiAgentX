/**
 * 统一配置管理
 */
import type { Model } from "@earendil-works/pi-ai";
import { join } from "path";
import { BootstrapLoader } from "../services/intelligence/bootstrap-loader.js";

// 启动时加载一次 bootstrap（skills/memory 在 agent-loop 里每轮更新）
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
  // 保留最近 N 个工具调用结果
  keepRecentToolResults: 3,
  // 工具结果超过此长度才压缩
  minLengthToCompact: 100,
};

/**
 * Agent 配置
 *
 * systemPrompt 由 dynamic-prompt-extension（before_agent_start）每轮动态构建。
 * 工具指令从 .pi/bootstrap/TOOLS.md 加载。
 */
export const agentConfig = {};
