/**
 * system-prompt.ts 单元测试
 *
 * 覆盖：
 * - initSkillsBlock：skills block 组装逻辑
 * - readDailyMemory：每日记忆文件读取
 * - autoRecall：记忆召回（含错误处理）
 * - buildAgentSystemPrompt：参数装配传递
 */
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ——— Mock 外部依赖（必须在 import 模块之前声明）————————————————

const mockBuildSystemPrompt = jest.fn<(...args: any[]) => string>()
  .mockReturnValue('mocked-system-prompt');

const mockHybridSearch = jest.fn<(...args: any[]) => any[]>().mockReturnValue([]);

jest.unstable_mockModule('../../../src/services/intelligence/system-prompt-builder.js', () => ({
  buildSystemPrompt: mockBuildSystemPrompt,
}));

jest.unstable_mockModule('../../../src/config/config.js', () => ({
  bootstrapData: {},
  createDeepSeekModel: jest.fn(),
  paths: { root: '/tmp', piDir: '/tmp/.pi', pluginDirs: [] },
  compactionConfig: {},
  agentConfig: {},
}));

jest.unstable_mockModule('../../../src/services/intelligence/memory-store.js', () => ({
  getMemoryStore: jest.fn(() => ({
    hybridSearch: mockHybridSearch,
    writeMemory: jest.fn(),
    getStats: jest.fn(() => ({ evergreenChars: 0, dailyFiles: 0, dailyEntries: 0 })),
  })),
  initMemoryStore: jest.fn(),
}));

// ——— 动态导入（在 mock 注册后）——————————————————————————————

const { initSkillsBlock, autoRecall, readDailyMemory, buildAgentSystemPrompt } =
  await import('../../../src/core/agent/system-prompt.js');

// ——— 测试环境准备 ———————————————————————————————————————

let tmpDir: string;

beforeAll(() => {
  tmpDir = join(tmpdir(), `piagent-sp-test-${Date.now()}`);
  mkdirSync(join(tmpDir, 'memory', 'daily'), { recursive: true });
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ——— readDailyMemory ——————————————————————————————————————

describe('readDailyMemory', () => {
  it('piDir 不存在 → 返回空字符串', () => {
    const result = readDailyMemory('/nonexistent-path-xyz-123');
    expect(result).toBe('');
  });

  it('今日文件不存在 → 返回空字符串', () => {
    const result = readDailyMemory(tmpDir);
    expect(result).toBe('');
  });

  it('读取有效的 JSONL 文件，拼接 content 字段', () => {
    const today = new Date().toISOString().split('T')[0];
    const piDir = join(tmpDir, 'valid-daily');
    mkdirSync(join(piDir, 'memory', 'daily'), { recursive: true });
    writeFileSync(join(piDir, 'memory', 'daily', `${today}.jsonl`), [
      JSON.stringify({ ts: 1, category: 'fact', content: 'First memory' }),
      JSON.stringify({ ts: 2, category: 'preference', content: 'Second memory' }),
    ].join('\n'));

    const result = readDailyMemory(piDir);
    expect(result).toBe('First memory\nSecond memory');
  });

  it('跳过格式错误的 JSON 行，保留有效行', () => {
    const today = new Date().toISOString().split('T')[0];
    const piDir = join(tmpDir, 'malformed-daily');
    mkdirSync(join(piDir, 'memory', 'daily'), { recursive: true });
    writeFileSync(join(piDir, 'memory', 'daily', `${today}.jsonl`), [
      JSON.stringify({ content: 'Valid first' }),
      'not json at all',
      JSON.stringify({ content: 'Valid last' }),
    ].join('\n'));

    const result = readDailyMemory(piDir);
    expect(result).toBe('Valid first\nValid last');
  });

  it('忽略空行', () => {
    const today = new Date().toISOString().split('T')[0];
    const piDir = join(tmpDir, 'empty-lines');
    mkdirSync(join(piDir, 'memory', 'daily'), { recursive: true });
    writeFileSync(join(piDir, 'memory', 'daily', `${today}.jsonl`), [
      JSON.stringify({ content: 'Only line' }),
      '',
      '   ',
    ].join('\n'));

    const result = readDailyMemory(piDir);
    expect(result).toBe('Only line');
  });

  it('content 字段为空 → 过滤掉', () => {
    const today = new Date().toISOString().split('T')[0];
    const piDir = join(tmpDir, 'empty-content');
    mkdirSync(join(piDir, 'memory', 'daily'), { recursive: true });
    writeFileSync(join(piDir, 'memory', 'daily', `${today}.jsonl`), [
      JSON.stringify({ content: '' }),
      JSON.stringify({ content: 'Real content' }),
    ].join('\n'));

    const result = readDailyMemory(piDir);
    expect(result).toBe('Real content');
  });
});

// ——— initSkillsBlock + buildAgentSystemPrompt 联合验证 ————————————

describe('initSkillsBlock', () => {
  beforeEach(() => {
    mockBuildSystemPrompt.mockClear();
    initSkillsBlock([], []); // 每次测试前重置 skillsBlock
  });

  function captureSkillsBlock(): string {
    buildAgentSystemPrompt({ memoryContext: '', dailyMemory: '', tools: [], workspaceDir: '/tmp' });
    return (mockBuildSystemPrompt.mock.calls[0]?.[0] as any)?.skillsBlock ?? '';
  }

  it('空 skills → skillsBlock 为空字符串', () => {
    expect(captureSkillsBlock()).toBe('');
  });

  it('SDK skills → 包含 name / description / invocation', () => {
    initSkillsBlock([
      { name: 'my-skill', description: 'Does something', invocation: '/my-skill' } as any,
    ], []);

    const block = captureSkillsBlock();
    expect(block).toContain('## Available Skills');
    expect(block).toContain('### Skill: my-skill');
    expect(block).toContain('Description: Does something');
    expect(block).toContain('Invocation: /my-skill');
  });

  it('SDK skill 没有 invocation → 用 name 作为 invocation', () => {
    initSkillsBlock([
      { name: 'no-invoc', description: 'desc' } as any,
    ], []);

    const block = captureSkillsBlock();
    expect(block).toContain('Invocation: no-invoc');
  });

  it('插件 skills → 包含 name / description / invocation / content', () => {
    initSkillsBlock([], [{
      name: 'plugin-skill',
      description: 'Plugin skill desc',
      invocation: '/plugin-skill',
      content: '## Plugin Usage\nSome details',
    }]);

    const block = captureSkillsBlock();
    expect(block).toContain('### Skill: plugin-skill');
    expect(block).toContain('Invocation: /plugin-skill');
    expect(block).toContain('## Plugin Usage');
  });

  it('插件 skill 没有 invocation → 不写 Invocation 行', () => {
    initSkillsBlock([], [{
      name: 'no-invoc-plugin',
      description: 'desc',
    }]);

    const block = captureSkillsBlock();
    expect(block).toContain('### Skill: no-invoc-plugin');
    expect(block).not.toContain('Invocation:');
  });

  it('插件 skill 没有 content → 不附加额外内容', () => {
    initSkillsBlock([], [{
      name: 'no-content-skill',
      description: 'desc',
      invocation: '/nc',
    }]);

    const block = captureSkillsBlock();
    // block 只包含 name / desc / invoc，无多余内容
    const lines = block.split('\n').filter(Boolean);
    const skillLines = lines.slice(lines.indexOf('### Skill: no-content-skill'));
    // invocation 是最后一个有效行（下一段之前）
    expect(skillLines[0]).toBe('### Skill: no-content-skill');
    expect(skillLines.some(l => l.startsWith('Invocation:'))).toBe(true);
  });

  it('SDK + 插件 skills 混合 → 都出现在 block 中', () => {
    initSkillsBlock(
      [{ name: 'sdk-skill', description: 'SDK' } as any],
      [{ name: 'plugin-skill', description: 'Plugin' }],
    );

    const block = captureSkillsBlock();
    expect(block).toContain('### Skill: sdk-skill');
    expect(block).toContain('### Skill: plugin-skill');
  });
});

// ——— buildAgentSystemPrompt ——————————————————————————————

describe('buildAgentSystemPrompt', () => {
  beforeEach(() => {
    mockBuildSystemPrompt.mockClear();
    initSkillsBlock([], []); // 重置 skillsBlock
  });

  it('内置工具出现在 customToolsBlock 中', () => {
    buildAgentSystemPrompt({ memoryContext: '', dailyMemory: '', tools: [], workspaceDir: '/w' });

    const opts = mockBuildSystemPrompt.mock.calls[0]?.[0] as any;
    expect(opts.customToolsBlock).toContain('- bash: Execute bash commands');
    expect(opts.customToolsBlock).toContain('- read: Read file contents');
    expect(opts.customToolsBlock).toContain('- write: Create or overwrite files');
  });

  it('自定义工具追加到 customToolsBlock', () => {
    buildAgentSystemPrompt({
      memoryContext: '',
      dailyMemory: '',
      tools: [{ name: 'my_tool', description: 'Does X' }],
      workspaceDir: '/w',
    });

    const opts = mockBuildSystemPrompt.mock.calls[0]?.[0] as any;
    expect(opts.customToolsBlock).toContain('- my_tool: Does X');
  });

  it('memoryContext 和 dailyMemory 透传给 buildSystemPrompt', () => {
    buildAgentSystemPrompt({
      memoryContext: 'recalled memory',
      dailyMemory: 'today fact',
      tools: [],
      workspaceDir: '/w',
    });

    const opts = mockBuildSystemPrompt.mock.calls[0]?.[0] as any;
    expect(opts.memoryContext).toBe('recalled memory');
    expect(opts.dailyMemory).toBe('today fact');
  });

  it('workspaceDir 作为 cwd 传入', () => {
    buildAgentSystemPrompt({ memoryContext: '', dailyMemory: '', tools: [], workspaceDir: '/my/workspace' });

    const opts = mockBuildSystemPrompt.mock.calls[0]?.[0] as any;
    expect(opts.cwd).toBe('/my/workspace');
  });

  it('date 字段格式为 YYYY-MM-DD', () => {
    buildAgentSystemPrompt({ memoryContext: '', dailyMemory: '', tools: [], workspaceDir: '/w' });

    const opts = mockBuildSystemPrompt.mock.calls[0]?.[0] as any;
    expect(opts.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('返回 buildSystemPrompt 的结果', () => {
    mockBuildSystemPrompt.mockReturnValueOnce('custom-prompt-result');
    const result = buildAgentSystemPrompt({ memoryContext: '', dailyMemory: '', tools: [], workspaceDir: '/w' });
    expect(result).toBe('custom-prompt-result');
  });

  it('多个工具全部出现在 customToolsBlock', () => {
    buildAgentSystemPrompt({
      memoryContext: '',
      dailyMemory: '',
      tools: [
        { name: 'tool_a', description: 'Tool A' },
        { name: 'tool_b', description: 'Tool B' },
        { name: 'tool_c', description: 'Tool C' },
      ],
      workspaceDir: '/w',
    });

    const opts = mockBuildSystemPrompt.mock.calls[0]?.[0] as any;
    expect(opts.customToolsBlock).toContain('- tool_a: Tool A');
    expect(opts.customToolsBlock).toContain('- tool_b: Tool B');
    expect(opts.customToolsBlock).toContain('- tool_c: Tool C');
  });
});

// ——— autoRecall ——————————————————————————————————————————

describe('autoRecall', () => {
  beforeEach(() => {
    mockHybridSearch.mockReset().mockReturnValue([]);
  });

  it('无结果时返回空字符串', () => {
    const result = autoRecall('something');
    expect(result).toBe('');
  });

  it('有结果时格式化为 "- [path] snippet" 列表', () => {
    mockHybridSearch.mockReturnValueOnce([
      { path: 'MEMORY.md', snippet: 'User prefers dark mode', score: 0.9 },
      { path: 'daily/2025-01-01', snippet: 'Discussed project goals', score: 0.7 },
    ]);

    const result = autoRecall('user preferences');
    expect(result).toBe(
      '- [MEMORY.md] User prefers dark mode\n- [daily/2025-01-01] Discussed project goals',
    );
  });

  it('getMemoryStore 抛出时返回空字符串（不崩溃）', async () => {
    const { getMemoryStore } = await import('../../../src/services/intelligence/memory-store.js');
    (getMemoryStore as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Store not initialized');
    });

    const result = autoRecall('anything');
    expect(result).toBe('');
  });
});
