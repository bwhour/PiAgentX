/**
 * AgentSessionRuntime factory for InteractiveMode (pi-coding-agent 0.75+).
 */
import {
  type AgentSessionRuntime,
  type CreateAgentSessionRuntimeFactory,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
} from "@earendil-works/pi-coding-agent";
import { join } from "path";
import { createDeepSeekModel } from "../../config/config.js";
import { getSessionDir } from "../logging/observable-logger.js";
import {
  bootstrapPiagentApp,
  buildPiagentResourceLoaderOptions,
  createDefaultSessionManager,
  finalizePiagentSession,
  getDefaultAgentDir,
} from "./session-setup.js";

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
  const agentDir = getDefaultAgentDir();

  const { getEffectiveTools } = await bootstrapPiagentApp({
    backgroundMode,
    pluginsLogLabel: "🔌 Plugins",
  });

  const sessionManager = createDefaultSessionManager(workspaceDir);

  const createRuntime: CreateAgentSessionRuntimeFactory = async ({
    cwd: runtimeCwd,
    sessionManager: sm,
  }) => {
    const services = await createAgentSessionServices({
      cwd: runtimeCwd,
      agentDir,
      resourceLoaderOptions: buildPiagentResourceLoaderOptions(
        { cwd: runtimeCwd, channel: "terminal", agentDir },
        getEffectiveTools,
      ),
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
    cwd: workspaceDir,
    agentDir,
    sessionManager,
  });

  await finalizePiagentSession(runtime.session, {
    profile: backgroundMode ? "background" : "full",
    workspaceDir,
    sessionDir: getSessionDir(),
    getEffectiveTools,
    logStartup: true,
    channel: "terminal",
  });

  return runtime;
}
