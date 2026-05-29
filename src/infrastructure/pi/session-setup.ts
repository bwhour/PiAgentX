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
import { bootstrapData, createDeepSeekModel, paths } from "../../config/config.js";
import { buildAgentSystemPrompt, initSkillsBlock } from "../../core/agent/system-prompt.js";
import { loadPlugins } from "../plugins/loader.js";
import type { PluginRegistry, PluginSkill } from "../plugins/types.js";
import { allCustomTools, initBrowserTool, initCompactTool, initMemoryTools, initTaskTools } from "../tools/index.js";
import { backgroundCustomTools } from "../tools/background-tools.js";
import { getMemoryStore } from "../../services/intelligence/memory-store.js";
import { logBootstrapFiles, logSystemPrompt } from "../logging/observable-logger.js";
import { createDynamicPromptExtension, type PromptChannel } from "./dynamic-prompt-extension.js";

/** Tool init profile after session is created. */
export type SessionToolProfile = "full" | "background" | "none";

export interface PiagentAppBootstrap {
  skills: Skill[];
  pluginRegistry: PluginRegistry;
  getEffectiveTools: () => ToolDefinition[];
}

export interface BootstrapPiagentAppOptions {
  backgroundMode?: boolean;
  skillsCwd?: string;
  /** Console label prefix, e.g. "Plugins" or "Plugins loaded". */
  pluginsLogLabel?: string;
}

export interface FinalizePiagentSessionOptions {
  profile: SessionToolProfile;
  workspaceDir: string;
  sessionDir?: string;
  channel?: PromptChannel;
  getEffectiveTools?: () => ToolDefinition[];
  logStartup?: boolean;
}

const bootstrapCache = new Map<string, Promise<PiagentAppBootstrap>>();

function bootstrapCacheKey(options: BootstrapPiagentAppOptions): string {
  return `${options.backgroundMode ?? false}:${options.skillsCwd ?? paths.root}`;
}

function logPluginRegistry(registry: PluginRegistry, label = "Plugins"): void {
  if (registry.records.length === 0) return;
  console.log(label.endsWith(":") ? label : `${label}:`);
  for (const r of registry.records) {
    if (r.status === "loaded") {
      console.log(`  ✅ ${r.name}: ${r.toolCount} tools, ${r.skillCount} skills`);
    } else {
      console.warn(`  ❌ ${r.name}: ${r.error}`);
    }
  }
}

/**
 * One-time app bootstrap: memory, skills, plugins. Cached per backgroundMode + skillsCwd.
 */
export async function bootstrapPiagentApp(
  options: BootstrapPiagentAppOptions = {},
): Promise<PiagentAppBootstrap> {
  const key = bootstrapCacheKey(options);
  let pending = bootstrapCache.get(key);
  if (!pending) {
    pending = (async () => {
      const skillsCwd = options.skillsCwd ?? paths.root;
      initMemoryTools(paths.piDir);
      const skills = loadProjectSkills(skillsCwd);
      const pluginRegistry = await loadPlugins(paths.pluginDirs);
      logPluginRegistry(pluginRegistry, options.pluginsLogLabel ?? "Plugins");
      registerPluginSkills(skills, pluginRegistry.skills);
      const pluginTools = pluginRegistry.tools;
      const getEffectiveTools = (): ToolDefinition[] => {
        const base = options.backgroundMode ? backgroundCustomTools : allCustomTools;
        return [...base, ...pluginTools];
      };
      return { skills, pluginRegistry, getEffectiveTools };
    })();
    bootstrapCache.set(key, pending);
  }
  return pending;
}

/** Reset bootstrap cache (tests). */
export function resetPiagentAppBootstrap(): void {
  bootstrapCache.clear();
}

export async function logSessionStartup(options: {
  workspaceDir: string;
  getEffectiveTools: () => ToolDefinition[];
  channel?: PromptChannel;
}): Promise<void> {
  logBootstrapFiles(bootstrapData);
  logSystemPrompt(
    buildAgentSystemPrompt({
      memoryContext: "",
      dailyMemory: "",
      tools: options.getEffectiveTools(),
      workspaceDir: options.workspaceDir,
      channel: options.channel,
    }),
    0,
  );
  try {
    const stats = getMemoryStore().getStats();
    console.log(
      `🧠 Memory: evergreen ${stats.evergreenChars} chars, ${stats.dailyFiles} daily file(s) (${stats.dailyEntries} entries)`,
    );
  } catch {
    /* optional */
  }
}

export async function finalizePiagentSession(
  session: AgentSession,
  options: FinalizePiagentSessionOptions,
): Promise<void> {
  await session.bindExtensions({});

  const sessionDir = options.sessionDir;
  if (options.profile === "full") {
    initCompactTool(session);
    if (sessionDir) {
      initTaskTools(join(sessionDir, "tasks"));
      initBrowserTool(sessionDir);
    }
  } else if (options.profile === "background" && sessionDir) {
    initTaskTools(join(sessionDir, "tasks"));
  }

  if (options.logStartup && options.getEffectiveTools) {
    await logSessionStartup({
      workspaceDir: options.workspaceDir,
      getEffectiveTools: options.getEffectiveTools,
      channel: options.channel,
    });
  }
}

/** Shared resource-loader options for createPiagentSession and createAgentSessionServices. */
export function buildPiagentResourceLoaderOptions(
  options: Pick<PiagentSessionOptions, "cwd" | "channel" | "agentDir" | "extensionFactories">,
  getTools: () => ToolDefinition[],
) {
  return {
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
  };
}

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
    ...buildPiagentResourceLoaderOptions(options, getTools),
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
