/**
 * Shared pi-coding-agent session construction for CLI, Feishu, and subagents.
 */
import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  loadSkills,
  SessionManager,
  type AgentSession,
  type CreateAgentSessionResult,
  type ExtensionFactory,
  type Skill,
  type ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { join } from "path";
import { createDeepSeekModel, paths } from "../../config/config.js";
import { buildAgentSystemPrompt, initSkillsBlock } from "../../core/agent/system-prompt.js";
import type { PluginSkill } from "../plugins/types.js";
import { createDynamicPromptExtension, type PromptChannel } from "./dynamic-prompt-extension.js";

export interface PiagentSessionOptions {
  cwd: string;
  sessionManager: SessionManager;
  customTools: ToolDefinition[];
  /** Extra extension factories (e.g. dynamic prompt is added automatically). */
  extensionFactories?: ExtensionFactory[];
  channel?: PromptChannel;
  agentDir?: string;
  model?: ReturnType<typeof createDeepSeekModel>;
}

export function loadProjectSkills(cwd: string = paths.root): Skill[] {
  try {
    const result = loadSkills({
      cwd,
      agentDir: getAgentDir(),
      skillPaths: [],
      includeDefaults: true,
    });
    const warnings = result.diagnostics.filter((d) => d.type === "warning");
    if (warnings.length > 0) {
      console.warn("⚠️  Skills warnings:");
      for (const w of warnings) {
        console.warn(`  - ${w.path}: ${w.message}`);
      }
    }
    if (result.skills.length > 0) {
      console.log(`✅ Loaded ${result.skills.length} skill(s)`);
      for (const s of result.skills) {
        console.log(`  - ${s.name}`);
      }
    }
    return result.skills;
  } catch (error) {
    console.warn("⚠️  Skills load failed:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

export function registerPluginSkills(sdkSkills: Skill[], pluginSkills: PluginSkill[]): void {
  initSkillsBlock(sdkSkills, pluginSkills);
}

/**
 * Build resource loader: suppress default append files, inject dynamic prompt extension.
 */
async function buildResourceLoader(
  options: PiagentSessionOptions,
  getTools: () => ToolDefinition[],
): Promise<DefaultResourceLoader> {
  const agentDir = options.agentDir ?? paths.piDir;
  const loader = new DefaultResourceLoader({
    cwd: options.cwd,
    agentDir,
    extensionFactories: [
      createDynamicPromptExtension({
        workspaceDir: options.cwd,
        getTools,
        channel: options.channel,
      }),
      ...(options.extensionFactories ?? []),
    ],
    systemPromptOverride: () =>
      buildAgentSystemPrompt({
        memoryContext: "",
        dailyMemory: "",
        tools: getTools(),
        workspaceDir: options.cwd,
        channel: options.channel,
      }),
    appendSystemPromptOverride: () => [],
  });
  await loader.reload();
  return loader;
}

export async function createPiagentSession(
  options: PiagentSessionOptions,
): Promise<CreateAgentSessionResult> {
  const getTools = () => options.customTools;
  const resourceLoader = await buildResourceLoader(options, getTools);

  return createAgentSession({
    cwd: options.cwd,
    agentDir: options.agentDir ?? paths.piDir,
    sessionManager: options.sessionManager,
    model: options.model ?? createDeepSeekModel(),
    customTools: options.customTools,
    resourceLoader,
  });
}

export function createDefaultSessionManager(cwd: string): SessionManager {
  return SessionManager.create(cwd, join(paths.piDir, "sdk-sessions"));
}

export function getDefaultAgentDir(): string {
  return getAgentDir();
}

export type { AgentSession };
