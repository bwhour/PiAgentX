/**
 * Plan Agent - 独立的规划 Agent
 *
 * 职责：
 * - 分析任务需求
 * - 生成结构化执行计划
 * - 不执行任何操作，只输出计划文本
 *
 * 实现：直接调用 LLM，无工具循环
 */
import { completeSimple } from "@earendil-works/pi-ai";
import { createDeepSeekModel } from "../../config/config.js";

const PLAN_SYSTEM_PROMPT = `You are a planning-only agent. Your ONLY job is to think and output a plan as text. You do NOT execute anything.

CRITICAL CONSTRAINTS:
- You have NO bash, write, edit, or file-creation tools. Do not attempt to call them.
- Do NOT create files, run commands, or produce any output other than the plan text.
- Your entire response must be a single Markdown plan document, nothing else.
- If you feel the urge to "start working" or "create a file", stop — write the plan instead.

You may use read/grep/find/ls ONLY to understand existing context (e.g. check if a file exists, read a config). Do not use them to execute the task.

Your output must answer:
1. What is the user's REAL goal? (look beyond literal words)
2. What information or resources are needed first? (external data, files, APIs?)
3. What is the right execution path? (gather-then-produce / plan-then-execute / direct)
4. What are the concrete steps for the main agent to follow?

IMPORTANT: If the task requires real-world data (weather, prices, schedules, reviews, current events, etc.):
- Mark those steps with [BROWSER REQUIRED] — the main agent MUST use the browser tool, NOT use its own knowledge
- Never assume the main agent can skip browser steps because it "already knows" the data
- Model knowledge is outdated and unverified — real tasks need real data

Output format (Markdown):
# Plan

## Goal
[The user's real intent, not just literal words]

## Execution Path
[Path A: gather real-world info first | Path B: plan then execute locally | Path C: direct]

## Steps
1. [BROWSER REQUIRED] Search for X — use browser tool to get real data, do NOT use model knowledge
2. [BROWSER REQUIRED] Search for Y — ...
3. [LOCAL] Create file using the data collected above
...

## Notes
[Dependencies, risks, or things to watch out for]
`;

/**
 * 创建并运行 Plan Agent
 * 直接调用 LLM 一次，无工具循环，只输出计划文本
 */
export async function createPlanAgent(task: string, context?: string): Promise<string> {
  let userPrompt = `请为以下任务制定详细的执行计划：\n\n${task}`;
  if (context) {
    userPrompt += `\n\n上下文信息：\n${context}`;
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("❌ API Key 未配置");
  }

  const result = await completeSimple(
    createDeepSeekModel(),
    {
      systemPrompt: PLAN_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt, timestamp: Date.now() }],
    },
    { apiKey } // 第三个参数是 StreamOptions
  );

  const textContent = result.content.find(c => c.type === "text");
  return textContent && "text" in textContent ? textContent.text : "Plan Agent 未能生成有效计划";
}
