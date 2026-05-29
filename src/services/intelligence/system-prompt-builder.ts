/**
 * System Prompt Builder - 8 层系统提示词动态组装
 *
 * 层级：
 * 1. Identity   - IDENTITY.md 或默认身份
 * 2. Soul       - SOUL.md 人格注入
 * 3. Tools      - TOOLS.md 工具使用指南
 * 4. Skills     - 已发现的技能列表
 * 5. Memory     - MEMORY.md 长期记忆 + 本轮自动召回
 * 6. Bootstrap  - BOOTSTRAP.md / AGENTS.md 启动上下文
 * 7. Runtime    - 当前时间、cwd、model
 * 8. Channel    - 渠道提示（terminal / api）
 */

export interface BuildSystemPromptOptions {
  bootstrap: Record<string, string>;
  skillsBlock?: string;
  memoryContext?: string;
  dailyMemory?: string;
  date: string;
  cwd: string;
  model: string;
  channel?: "terminal" | "api";
  mode?: "full" | "minimal" | "none";
  customToolsBlock?: string;
}

const CHANNEL_HINTS: Record<string, string> = {
  terminal: "You are responding via a terminal REPL. Markdown is supported.",
  api: "You are responding via API. Be concise and structured.",
};

export function buildSystemPrompt(opts: BuildSystemPromptOptions): string {
  const {
    bootstrap,
    skillsBlock = "",
    memoryContext = "",
    dailyMemory = "",
    date,
    cwd,
    model,
    channel = "terminal",
    mode = "full",
    customToolsBlock = "",
  } = opts;

  const sections: string[] = [];

  // 第 1 层: 身份
  const identity = bootstrap["IDENTITY.md"]?.trim();
  sections.push(identity || "You are a helpful assistant operating inside pi, an agent harness.\nYou help users by reading files, executing commands, editing code, writing new files, browsing the web, and planning tasks.");

  // 第 2 层: 灵魂（仅 full 模式）
  if (mode === "full") {
    const soul = bootstrap["SOUL.md"]?.trim();
    if (soul) sections.push(`## Personality\n\n${soul}`);
  }

  // 第 3 层: 工具使用指南
  const toolsMd = bootstrap["TOOLS.md"]?.trim();
  if (toolsMd) {
    sections.push(`## Tool Usage Guidelines\n\n${toolsMd}`);
  } else if (customToolsBlock) {
    sections.push(`## Available Tools\n\n${customToolsBlock}`);
  }

  // 第 4 层: 技能（仅 full 模式）
  if (mode === "full" && skillsBlock) {
    sections.push(skillsBlock);
  }

  // 第 5 层: 记忆（仅 full 模式）
  if (mode === "full") {
    const memMd = bootstrap["MEMORY.md"]?.trim();
    const parts: string[] = [];
    if (memMd) parts.push(`### Evergreen Memory\n\n${memMd}`);
    if (dailyMemory) parts.push(`### Recent Memory (today)\n\n${dailyMemory}`);
    if (memoryContext) parts.push(`### Recalled Memories (auto-searched)\n\n${memoryContext}`);
    if (parts.length) {
      sections.push("## Memory\n\n" + parts.join("\n\n"));
    }
    sections.push(
      "## Memory Instructions\n\n" +
      "- Use memory_write to save important user facts, preferences, and context.\n" +
      "- Reference remembered facts naturally in conversation.\n" +
      "- Use memory_search to recall specific past information."
    );
  }

  // 第 6 层: Bootstrap 上下文
  if (mode === "full" || mode === "minimal") {
    for (const name of ["BOOTSTRAP.md", "AGENTS.md"]) {
      const content = bootstrap[name]?.trim();
      if (content) {
        sections.push(`## ${name.replace(".md", "")}\n\n${content}`);
      }
    }
  }

  // 第 7 层: 运行时上下文
  sections.push(
    `## Runtime Context\n\n` +
    `- Model: ${model}\n` +
    `- Current date: ${date}\n` +
    `- Current working directory: ${cwd}\n` +
    `- Prompt mode: ${mode}`
  );

  // 第 8 层: 渠道提示
  sections.push(`## Channel\n\n${CHANNEL_HINTS[channel] ?? `You are responding via ${channel}.`}`);

  return sections.join("\n\n");
}
