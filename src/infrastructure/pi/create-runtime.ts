/**
 * AgentSessionRuntime factory for InteractiveMode (pi-coding-agent 0.75+).
 */
import {
  type AgentSessionRuntime,
  type CreateAgentSessionRuntimeFactory,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  SessionManager,
  type ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { join } from "path";
import { createDeepSeekModel, paths } from "../../config/config.js";
import { allCustomTools } from "../tools/index.js";
import { backgroundCustomTools } from "../tools/background-tools.js";
import { loadPlugins } from "../plugins/loader.js";
import {
  createDefaultSessionManager,
  getDefaultAgentDir,
  loadProjectSkills,
  registerPluginSkills,
} from "./session-setup.js";
import { createDynamicPromptExtension } from "./dynamic-prompt-extension.js";
import { getSessionDir } from "../logging/observable-logger.js";
import { initMemoryTools } from "../tools/memory-tool.js";
import { initCompactTool, initBrowserTool, initTaskTools } from "../tools/index.js";
import { getMemoryStore } from "../../services/intelligence/memory-store.js";
import { logBootstrapFiles, logSystemPrompt } from "../logging/observable-logger.js";
import { bootstrapData } from "../../config/config.js";
import { buildAgentSystemPrompt } from "../../core/agent/system-prompt.js";

export interface CreatePiagentRuntimeOptions {
  backgroundMode?: boolean;
  workspaceDir?: string;
}

function getWorkspaceDir(): string {
  return join(getSessionDir(), "workspace");
}

export async function createPiagentRuntime(
  options: CreatePiagentRuntimeOptions = {},
): Promise<AgentSessionRuntime> {
  const backgroundMode = options.backgroundMode ?? false;
  const workspaceDir = options.workspaceDir ?? getWorkspaceDir();
  const cwd = workspaceDir;

  initMemoryTools(paths.piDir);

  const skills = loadProjectSkills(paths.root);
  const pluginRegistry = await loadPlugins(paths.pluginDirs);

  if (pluginRegistry.records.length > 0) {
    console.log("🔌 Plugins:");
    for (const r of pluginRegistry.records) {
      if (r.status === "loaded") {
        console.log(`  ✅ ${r.name}: ${r.toolCount} tools, ${r.skillCount} skills`);
      } else {
        console.warn(`  ❌ ${r.name}: ${r.error}`);
      }
    }
  }

  registerPluginSkills(skills, pluginRegistry.skills);

  let pluginTools: ToolDefinition[] = pluginRegistry.tools;
  const getEffectiveTools = (): ToolDefinition[] => {
    const base = backgroundMode ? backgroundCustomTools : allCustomTools;
    return [...base, ...pluginTools];
  };

  const sessionManager = createDefaultSessionManager(cwd);
  const agentDir = getDefaultAgentDir();

  const createRuntime: CreateAgentSessionRuntimeFactory = async ({
    cwd: runtimeCwd,
    sessionManager: sm,
  }) => {
    const services = await createAgentSessionServices({
      cwd: runtimeCwd,
      agentDir,
      resourceLoaderOptions: {
        extensionFactories: [
          createDynamicPromptExtension({
            workspaceDir: runtimeCwd,
            getTools: getEffectiveTools,
            channel: "terminal",
          }),
        ],
        systemPromptOverride: () =>
          buildAgentSystemPrompt({
            memoryContext: "",
            dailyMemory: "",
            tools: getEffectiveTools(),
            workspaceDir: runtimeCwd,
            channel: "terminal",
          }),
        appendSystemPromptOverride: () => [],
      },
    });

    const created = await createAgentSessionFromServices({
      services,
      sessionManager: sm,
      model: createDeepSeekModel(),
      customTools: getEffectiveTools(),
    });

    return {
      ...created,
      services,
      diagnostics: services.diagnostics,
    };
  };

  const runtime = await createAgentSessionRuntime(createRuntime, {
    cwd,
    agentDir,
    sessionManager,
  });

  const session = runtime.session;
  await session.bindExtensions({});

  if (!backgroundMode) {
    initCompactTool(session);
    const sessionDir = getSessionDir();
    initTaskTools(join(sessionDir, "tasks"));
    initBrowserTool(sessionDir);
  }

  logBootstrapFiles(bootstrapData);
  logSystemPrompt(
    buildAgentSystemPrompt({
      memoryContext: "",
      dailyMemory: "",
      tools: getEffectiveTools(),
      workspaceDir: cwd,
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

  return runtime;
}
