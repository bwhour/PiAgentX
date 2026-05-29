/**
 * Reflect Agent - 执行结果回顾与评估 Agent
 *
 * 职责：
 * - 分析已完成的工作是否达到用户原始目标
 * - 识别遗漏、偏差或质量问题
 * - 给出改进建议或确认完成
 *
 * 实现：直接调用 LLM，无工具循环
 */
import { completeSimple } from "@earendil-works/pi-ai";
import { createDeepSeekModel } from "../../config/config.js";

const REFLECT_SYSTEM_PROMPT = `You are a reflection-only agent. Your ONLY job is to evaluate whether completed work actually achieves the user's original goal.

CRITICAL CONSTRAINTS:
- You have NO tools. Do not attempt to call any.
- Do NOT redo the work or suggest new implementations.
- Your entire response must be a single structured Markdown evaluation, nothing else.

Your analysis must cover:
1. GOAL vs OUTCOME: Does what was done match what the user actually wanted?
2. COMPLETENESS: Are there missing pieces, edge cases, or implied requirements that were not addressed?
3. QUALITY: Are there obvious errors, inconsistencies, or things that will not work?
4. NEXT STEPS: What, if anything, should be done next?

Rules:
- Be direct and specific — vague feedback like "looks good" or "consider improving" is useless.
- If the work is complete and correct, say so clearly and explain why.
- If something is missing or wrong, point to the exact gap with enough detail that the main agent can act on it.
- Do NOT suggest improvements beyond what the user asked for — only flag gaps relative to the stated goal.

Output format (Markdown):

# Reflection

## Goal Recap
[The user's original intent in one sentence]

## Outcome Summary
[What was actually done, in one sentence]

## Assessment
[COMPLETE / PARTIAL / INCOMPLETE] — [one-line verdict]

## Gaps / Issues
[List specific problems, or "None" if complete]
- Issue 1: ...
- Issue 2: ...

## Recommended Next Steps
[Concrete follow-up actions, or "None — ready to deliver" if done]
`;

/**
 * 创建并运行 Reflect Agent
 * 评估完成的工作是否达到用户目标，返回结构化评估
 */
export async function createReflectAgent(
  goal: string,
  outcome: string,
  context?: string,
): Promise<string> {
  let userPrompt = `请评估以下工作是否达到了用户的原始目标。\n\n用户目标：\n${goal}\n\n已完成的工作：\n${outcome}`;
  if (context) {
    userPrompt += `\n\n补充上下文：\n${context}`;
  }

  const result = await completeSimple(createDeepSeekModel(), {
    systemPrompt: REFLECT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt, timestamp: Date.now() }],
  });

  const textContent = result.content.find(c => c.type === "text");
  return textContent && "text" in textContent ? textContent.text : "Reflect Agent 未能生成有效评估";
}
