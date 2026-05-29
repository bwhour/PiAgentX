/**
 * Tool set for BACKGROUND_MODE=true (parallel spawn tools, no plan/memory/browser).
 */
import { spawnTool } from "./spawn.js";
import { compactTool } from "./compact-tool.js";
import {
  taskCreateTool,
  taskUpdateTool,
  taskListTool,
  taskGetTool,
} from "./task-tools.js";
import {
  spawnBackgroundTool,
  checkBackgroundTool,
} from "./background-spawn.js";

export const backgroundCustomTools = [
  spawnTool,
  spawnBackgroundTool,
  checkBackgroundTool,
  compactTool,
  taskCreateTool,
  taskUpdateTool,
  taskListTool,
  taskGetTool,
];
