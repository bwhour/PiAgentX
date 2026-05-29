import { appendFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const LOG_DIR = join(process.cwd(), ".pi", "logs");

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

export function getLogFilePath(name: string): string {
  ensureLogDir();
  return join(LOG_DIR, `${name}.log`);
}

export function appendJsonLog(name: string, entry: Record<string, unknown>): void {
  const file = getLogFilePath(name);
  appendFileSync(file, JSON.stringify({
    ts: new Date().toISOString(),
    ...entry,
  }) + "\n");
}
