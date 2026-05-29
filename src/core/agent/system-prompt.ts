/**
 * Agent 系统提示词管理
 *
 * 职责:
 * - skills block 的组装与缓存（SDK skills + 插件 skills）
 * - 每轮记忆召回（auto-recall）
 * - 今日每日记忆读取
 * - 将以上内容装配成最终的系统提示词
 */
import type { Skill } from "@earendil-works/pi-coding-agent";
import { join } from "path";
import { readFileSync, existsSync } from "fs";
import { getMemoryStore } from "../../services/intelligence/memory-store.js";
import { buildSystemPrompt } from "../../services/intelligence/system-prompt-builder.js";
import { bootstrapData } from "../../config/config.js";
import type { PluginSkill } from "../../infrastructure/plugins/index.js";

// SDK 内置工具列表（固定不变）
const BUILTIN_TOOLS = [
  "- read: Read file contents",
  "- bash: Execute bash commands",
  "- edit: Make surgical edits to files",
  "- write: Create or overwrite files",
  "- grep: Search file contents for patterns (respects .gitignore)",
  "- find: Find files by glob pattern (respects .gitignore)",
  "- ls: List directory contents",
];

// skills block 缓存（会话初始化时设置，之后每轮复用）
let skillsBlock = "";

/**
 * 初始化 skills block。在会话创建后调用一次。
 */
export function initSkillsBlock(sdkSkills: Skill[], pluginSkills: PluginSkill[]): void {
  if (sdkSkills.length === 0 && pluginSkills.length === 0) {
    skillsBlock = "";
    return;
  }

  const lines = ["## Available Skills", ""];

  for (const s of sdkSkills) {
    lines.push(`### Skill: ${s.name}`);
    lines.push(`Description: ${s.description}`);
    lines.push(`Invocation: ${(s as any).invocation || s.name}`);
    lines.push("");
  }

  for (const s of pluginSkills) {
    lines.push(`### Skill: ${s.name}`);
    lines.push(`Description: ${s.description}`);
    if (s.invocation) lines.push(`Invocation: ${s.invocation}`);
    if (s.content) lines.push(s.content);
    lines.push("");
  }

  skillsBlock = lines.join("\n");
}

/**
 * 根据用户消息自动搜索相关记忆，返回注入提示词的上下文字符串。
 */
export function autoRecall(userMessage: string): string {
  try {
    const store = getMemoryStore();
    const results = store.hybridSearch(userMessage, 3);
    if (!results.length) return "";
    return results.map(r => `- [${r.path}] ${r.snippet}`).join("\n");
  } catch {
    return "";
  }
}

/**
 * 读取今日的每日记忆文件，返回纯文本内容。
 */
export function readDailyMemory(piDir: string): string {
  try {
    const today = new Date().toISOString().split("T")[0];
    const dailyFile = join(piDir, "memory", "daily", `${today}.jsonl`);
    if (!existsSync(dailyFile)) return "";
    const lines = readFileSync(dailyFile, "utf-8").split("\n").filter(l => l.trim());
    return lines.map(l => {
      try { return JSON.parse(l).content; } catch { return ""; }
    }).filter(Boolean).join("\n");
  } catch {
    return "";
  }
}

/**
 * 构建当前轮次的完整系统提示词。
 *
 * @param memoryContext - autoRecall 返回的记忆上下文
 * @param dailyMemory   - readDailyMemory 返回的今日记忆
 * @param tools         - 内置工具 + 插件工具列表
 * @param workspaceDir  - 当前会话的工作目录
 */
export function buildAgentSystemPrompt(params: {
  memoryContext: string;
  dailyMemory: string;
  tools: Array<{ name: string; description: string }>;
  workspaceDir: string;
  channel?: "terminal" | "api";
}): string {
  const { memoryContext, dailyMemory, tools, workspaceDir, channel = "terminal" } = params;

  const customToolsBlock = [
    ...BUILTIN_TOOLS,
    ...tools.map(t => `- ${t.name}: ${t.description}`),
  ].join("\n");

  return buildSystemPrompt({
    bootstrap: bootstrapData,
    skillsBlock,
    memoryContext,
    dailyMemory,
    date: new Date().toISOString().split("T")[0],
    cwd: workspaceDir,
    model: "deepseek-chat",
    channel,
    mode: "full",
    customToolsBlock,
  });
}
