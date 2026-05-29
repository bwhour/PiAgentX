/**
 * Plugin Loader 单元测试
 *
 * 测试 loadPlugins() 的：加载逻辑、错误处理、多目录合并
 *
 * 注意：
 * - 需要 import() 执行的测试用例使用 tests/fixtures/plugins/ 中的静态文件
 *   （Jest ESM 模式不支持从 tmpdir() 动态 import）
 * - 仅需要文件系统操作（无 import）的测试用例使用 tmpdir
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadPlugins } from '../../../src/infrastructure/plugins/loader.js';

// ——— tmpdir：仅用于不需要 import() 的测试 ————————————————

let tmpDir: string;

beforeAll(() => {
  tmpDir = join(tmpdir(), `piagent-plugin-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ——— fixture 根目录（Jest 可以 import 其中的 .js 文件）——————

const FIXTURES = join(process.cwd(), 'tests', 'fixtures', 'plugins');

// ——— 基础行为 ——————————————————————————————————————————————

describe('loadPlugins - 基础行为', () => {
  it('空目录列表 → 返回空注册表', async () => {
    const result = await loadPlugins([]);
    expect(result.tools).toHaveLength(0);
    expect(result.skills).toHaveLength(0);
    expect(result.records).toHaveLength(0);
  });

  it('不存在的目录 → 返回空注册表', async () => {
    const result = await loadPlugins(['/nonexistent-piagent-path-xyz']);
    expect(result.tools).toHaveLength(0);
    expect(result.skills).toHaveLength(0);
    expect(result.records).toHaveLength(0);
  });

  it('插件目录无 piagent.plugin.json → 忽略该目录', async () => {
    const noManifestDir = join(tmpDir, 'no-manifest');
    mkdirSync(join(noManifestDir, 'my-plugin'), { recursive: true });
    // 不写 manifest 文件
    const result = await loadPlugins([noManifestDir]);
    expect(result.records).toHaveLength(0);
  });
});

// ——— 清单解析 ————————————————————————————————————————————

describe('loadPlugins - 清单解析', () => {
  it('manifest JSON 格式错误 → error 记录', async () => {
    const pluginDir = join(tmpDir, 'bad-manifest', 'bad-plugin');
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(join(pluginDir, 'piagent.plugin.json'), 'not valid { json');

    const result = await loadPlugins([join(tmpDir, 'bad-manifest')]);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].status).toBe('error');
    expect(result.records[0].error).toMatch(/清单解析失败/);
    expect(result.tools).toHaveLength(0);
  });

  it('只有 manifest，无入口文件 → loaded，0 工具', async () => {
    const pluginDir = join(tmpDir, 'manifest-only', 'm-plugin');
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(join(pluginDir, 'piagent.plugin.json'), JSON.stringify({
      id: 'm-plugin',
      name: 'Manifest Only',
    }));

    const result = await loadPlugins([join(tmpDir, 'manifest-only')]);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].status).toBe('loaded');
    expect(result.records[0].name).toBe('Manifest Only');
    expect(result.records[0].toolCount).toBe(0);
    expect(result.records[0].skillCount).toBe(0);
  });

  it('manifest 没有 name → 用 id 作为 name', async () => {
    const pluginDir = join(tmpDir, 'no-name', 'no-name-plugin');
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(join(pluginDir, 'piagent.plugin.json'), JSON.stringify({ id: 'fallback-id' }));

    const result = await loadPlugins([join(tmpDir, 'no-name')]);
    expect(result.records[0].name).toBe('fallback-id');
    expect(result.records[0].id).toBe('fallback-id');
  });
});

// ——— 入口文件加载（使用静态 fixture）————————————————————————

describe('loadPlugins - 入口文件加载', () => {
  it('加载 index.js：注册工具和技能', async () => {
    const result = await loadPlugins([FIXTURES]);
    const rec = result.records.find(r => r.id === 'has-tool-and-skill');

    expect(rec).toBeDefined();
    expect(rec!.status).toBe('loaded');
    expect(rec!.toolCount).toBe(1);
    expect(rec!.skillCount).toBe(1);

    const tool = result.tools.find(t => t.name === 'my_tool');
    expect(tool).toBeDefined();
    expect(tool!.description).toBe('Does something');

    const skill = result.skills.find(s => s.name === 'my-skill');
    expect(skill).toBeDefined();
    expect(skill!.invocation).toBe('/my-skill');
    expect(skill!.content).toBe('## Usage');
  });

  it('支持 register 命名导出（非 default）', async () => {
    const result = await loadPlugins([FIXTURES]);
    const rec = result.records.find(r => r.id === 'named-export');

    expect(rec).toBeDefined();
    expect(rec!.status).toBe('loaded');

    const tool = result.tools.find(t => t.name === 'ne_tool');
    expect(tool).toBeDefined();
    expect(tool!.description).toBe('Named export tool');
  });

  it('入口文件注册多个工具', async () => {
    const result = await loadPlugins([FIXTURES]);
    const rec = result.records.find(r => r.id === 'multi-tool');

    expect(rec).toBeDefined();
    expect(rec!.toolCount).toBe(3);

    const names = result.tools.filter(t => t.name.startsWith('tool_')).map(t => t.name);
    expect(names.sort()).toEqual(['tool_1', 'tool_2', 'tool_3']);
  });

  it('入口文件抛出错误 → error 记录', async () => {
    const result = await loadPlugins([FIXTURES]);
    const rec = result.records.find(r => r.id === 'throws-on-load');

    expect(rec).toBeDefined();
    expect(rec!.status).toBe('error');
    expect(rec!.error).toMatch(/加载失败/);
  });
});

// ——— 多目录合并 ——————————————————————————————————————————

describe('loadPlugins - 多目录合并', () => {
  it('一个目录不存在，另一个正常加载', async () => {
    const manifestDir = join(tmpDir, 'partial-missing', 'good-plugin');
    mkdirSync(manifestDir, { recursive: true });
    writeFileSync(join(manifestDir, 'piagent.plugin.json'), JSON.stringify({ id: 'good-plugin', name: 'Good' }));

    const result = await loadPlugins(['/completely/nonexistent', join(tmpDir, 'partial-missing')]);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].id).toBe('good-plugin');
  });

  it('同目录下多个插件子目录', async () => {
    const pluginsDir = join(tmpDir, 'sibling-plugins');
    for (const name of ['alpha', 'beta', 'gamma']) {
      const pd = join(pluginsDir, name);
      mkdirSync(pd, { recursive: true });
      writeFileSync(join(pd, 'piagent.plugin.json'), JSON.stringify({ id: name, name }));
    }

    const result = await loadPlugins([pluginsDir]);
    expect(result.records).toHaveLength(3);
    expect(result.records.map(r => r.id).sort()).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('多个 pluginDirs 结果合并', async () => {
    // dir1: manifest-only plugin
    const dir1 = join(tmpDir, 'combined-1', 'plugin-a');
    mkdirSync(dir1, { recursive: true });
    writeFileSync(join(dir1, 'piagent.plugin.json'), JSON.stringify({ id: 'plugin-a', name: 'Plugin A' }));

    // dir2: manifest-only plugin
    const dir2 = join(tmpDir, 'combined-2', 'plugin-b');
    mkdirSync(dir2, { recursive: true });
    writeFileSync(join(dir2, 'piagent.plugin.json'), JSON.stringify({ id: 'plugin-b', name: 'Plugin B' }));

    const result = await loadPlugins([join(tmpDir, 'combined-1'), join(tmpDir, 'combined-2')]);
    expect(result.records).toHaveLength(2);
    expect(result.records.map(r => r.id).sort()).toEqual(['plugin-a', 'plugin-b']);
  });
});

// ——— 工具执行验证（使用静态 fixture）————————————————————————

describe('loadPlugins - 工具执行验证', () => {
  it('已加载的工具 execute 函数可正常调用', async () => {
    const result = await loadPlugins([FIXTURES]);
    const tool = result.tools.find(t => t.name === 'hello_tool');
    expect(tool).toBeDefined();

    const output = await tool!.execute('call-1', { name: 'World' }, undefined, undefined, {} as any);
    expect(output.content[0]).toMatchObject({ type: 'text', text: 'Hello, World' });
  });
});
