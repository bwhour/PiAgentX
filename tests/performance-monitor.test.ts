/**
 * 性能监控测试
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { PerformanceMonitor } from '../src/infrastructure/monitoring/performance-monitor.js';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe('LLM 调用追踪', () => {
    it('应该正确记录 LLM 调用', () => {
      const id = monitor.startLLMCall();
      expect(id).toMatch(/^llm_/);

      monitor.endLLMCall(id, { input_tokens: 100, output_tokens: 50 }, 1000);

      const metrics = monitor.getMetrics();
      expect(metrics.llm.calls).toBe(1);
      expect(metrics.llm.tokens.prompt).toBe(100);
      expect(metrics.llm.tokens.completion).toBe(50);
      expect(metrics.llm.tokens.total).toBe(150);
    });

    it('应该计算平均延迟', () => {
      const id1 = monitor.startLLMCall();
      monitor.endLLMCall(id1, null, 1000);

      const id2 = monitor.startLLMCall();
      monitor.endLLMCall(id2, null, 2000);

      const metrics = monitor.getMetrics();
      expect(metrics.llm.avgLatency).toBe(1500);
    });
  });

  describe('工具调用追踪', () => {
    it('应该正确记录工具调用', () => {
      const id = monitor.startToolCall('bash');
      monitor.endToolCall(id, 'bash', true, 500);

      const metrics = monitor.getMetrics();
      const bashStats = metrics.tools.get('bash');

      expect(bashStats).toBeDefined();
      expect(bashStats?.calls).toBe(1);
      expect(bashStats?.totalTime).toBe(500);
      expect(bashStats?.errors).toBe(0);
    });

    it('应该记录工具错误', () => {
      const id = monitor.startToolCall('bash');
      monitor.endToolCall(id, 'bash', false, 100);

      const metrics = monitor.getMetrics();
      const bashStats = metrics.tools.get('bash');

      expect(bashStats?.errors).toBe(1);
    });

    it('应该计算工具平均耗时', () => {
      const id1 = monitor.startToolCall('bash');
      monitor.endToolCall(id1, 'bash', true, 100);

      const id2 = monitor.startToolCall('bash');
      monitor.endToolCall(id2, 'bash', true, 200);

      const metrics = monitor.getMetrics();
      const bashStats = metrics.tools.get('bash');

      expect(bashStats?.avgTime).toBe(150);
    });
  });

  describe('会话统计', () => {
    it('应该记录对话轮次', () => {
      monitor.recordTurn();
      monitor.recordTurn();
      monitor.recordTurn();

      const metrics = monitor.getMetrics();
      expect(metrics.session.turns).toBe(3);
    });

    it('应该计算会话时长', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      monitor.recordTurn();
      expect(monitor.getMetrics().session.duration).toBeGreaterThan(0);
    });
  });

  describe('报告生成', () => {
    it('应该生成文本报告', () => {
      const id = monitor.startLLMCall();
      monitor.endLLMCall(id, { input_tokens: 100, output_tokens: 50 }, 1000);

      const report = monitor.getReport();
      expect(report).toContain('性能报告');
      expect(report).toContain('LLM 调用');
      expect(report).toContain('调用次数: 1');
    });

    it('应该导出 JSON 格式', () => {
      const id = monitor.startLLMCall();
      monitor.endLLMCall(id, { input_tokens: 100, output_tokens: 50 }, 1000);

      const json = monitor.exportJSON();
      const data = JSON.parse(json);

      expect(data.llm.calls).toBe(1);
      expect(data.llm.tokens.total).toBe(150);
    });
  });

  describe('重置功能', () => {
    it('应该重置所有指标', () => {
      const id = monitor.startLLMCall();
      monitor.endLLMCall(id, { input_tokens: 100, output_tokens: 50 }, 1000);

      monitor.reset();

      const metrics = monitor.getMetrics();
      expect(metrics.llm.calls).toBe(0);
      expect(metrics.llm.tokens.total).toBe(0);
      expect(metrics.tools.size).toBe(0);
    });
  });
});
