/**
 * CLI entry: InteractiveMode on pi-coding-agent 0.75+ AgentSessionRuntime.
 */
import "dotenv/config";
import { InteractiveMode } from "@earendil-works/pi-coding-agent";
import * as logger from "../infrastructure/logging/observable-logger.js";
import { wrapSessionWithLogger } from "../infrastructure/session/session-factory.js";
import { PerformanceMonitor } from "../infrastructure/monitoring/performance-monitor.js";
import { createPiagentRuntime } from "../infrastructure/pi/create-runtime.js";

const USE_BACKGROUND_MODE = process.env.BACKGROUND_MODE === "true";

async function main() {
  try {
    console.log("🚀 Starting PI Agent...\n");

    logger.initSession();
    console.log(`📋 Session: ${logger.getSessionKey()}\n`);
    console.log(`📌 Mode: ${USE_BACKGROUND_MODE ? "Background" : "Normal"}\n`);

    const runtime = await createPiagentRuntime({ backgroundMode: USE_BACKGROUND_MODE });
    const session = runtime.session;

    const perfMonitor = new PerformanceMonitor();
    wrapSessionWithLogger(session, perfMonitor);

    process.on("SIGINT", async () => {
      console.log(perfMonitor.getReport());
      logger.logSessionEnd();
      await runtime.dispose();
      process.exit(0);
    });

    process.on("exit", () => {
      logger.logSessionEnd();
    });

    const mode = new InteractiveMode(runtime);
    await mode.run();

    logger.logSessionEnd();
    await runtime.dispose();
  } catch (error) {
    console.error("❌ Startup failed:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
