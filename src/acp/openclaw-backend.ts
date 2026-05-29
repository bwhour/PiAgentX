/**
 * CLI Backend - 基于 OpenClaw 实现
 */

import { spawn } from 'child_process';

interface CliBackendConfig {
  command: string;
  args: string[];
  resumeArgs: string[];
  output: 'json' | 'jsonl';
  input: 'arg' | 'stdin';
}

const CLAUDE_BACKEND: CliBackendConfig = {
  command: 'claude',
  args: ['-p', '--output-format', 'json', '--permission-mode', 'bypassPermissions'],
  resumeArgs: ['-p', '--output-format', 'json', '--permission-mode', 'bypassPermissions', '--resume'],
  output: 'json',
  input: 'arg'
};

const CODEX_BACKEND: CliBackendConfig = {
  command: 'codex',
  args: ['exec', '--json', '--color', 'never'],
  resumeArgs: ['exec', 'resume'],
  output: 'jsonl',
  input: 'arg'
};

export class OpenClawBackend {
  async runClaude(prompt: string, sessionId?: string): Promise<{ text: string; sessionId: string }> {
    const backend = CLAUDE_BACKEND;
    const args = sessionId
      ? [...backend.resumeArgs, sessionId]
      : [...backend.args, prompt];

    const output = await this.exec(backend.command, args);
    const json = JSON.parse(output);
    return {
      text: json.result || '',
      sessionId: json.session_id || sessionId || ''
    };
  }

  async runCodex(prompt: string, sessionId?: string): Promise<{ text: string; sessionId: string }> {
    const backend = CODEX_BACKEND;
    const args = sessionId
      ? [...backend.resumeArgs, sessionId, prompt]
      : [...backend.args, prompt];

    const output = await this.exec(backend.command, args);
    const lines = output.trim().split('\n').filter(Boolean);
    let text = '';
    let threadId = sessionId || '';

    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        if (json.thread_id) threadId = json.thread_id;
        if (json.item?.text) text += json.item.text;
      } catch {
        // resume 模式返回纯文本
        text += line + '\n';
      }
    }

    return { text: text.trim(), sessionId: threadId };
  }

  private async exec(cmd: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args);
      let output = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Process exited with code ${code}`));
        } else {
          resolve(output);
        }
      });

      proc.on('error', reject);
    });
  }
}

