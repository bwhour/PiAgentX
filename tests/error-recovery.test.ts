/**
 * 错误恢复机制测试
 */
import { describe, it, expect, jest } from '@jest/globals';
import { ErrorRecovery, DEFAULT_RETRY_CONFIG } from '../src/services/recovery/error-recovery-service.js';

describe('ErrorRecovery', () => {
  let recovery: ErrorRecovery;

  beforeEach(() => {
    recovery = new ErrorRecovery();
  });

  describe('withRetry', () => {
    it('应该在第一次成功时返回结果', async () => {
      const fn = jest.fn<() => Promise<string>>().mockResolvedValue('success');

      const result = await recovery.withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该在临时失败后重试', async () => {
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');

      const result = await recovery.withRetry(fn, {
        ...DEFAULT_RETRY_CONFIG,
        initialDelay: 10,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('应该在达到最大重试次数后抛出错误', async () => {
      const error = new Error('persistent timeout');
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(error);

      await expect(
        recovery.withRetry(fn, {
          maxAttempts: 3,
          initialDelay: 10,
          backoffFactor: 2,
          maxDelay: 1000,
        })
      ).rejects.toThrow('persistent timeout');

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('应该对不可重试的错误立即失败', async () => {
      const error = { status: 400, message: 'Bad Request' };
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(error);

      await expect(
        recovery.withRetry(fn, {
          ...DEFAULT_RETRY_CONFIG,
          initialDelay: 10,
        })
      ).rejects.toEqual(error);

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('fallback', () => {
    it('应该在主函数成功时返回主函数结果', async () => {
      const primary = jest.fn<() => Promise<string>>().mockResolvedValue('primary');
      const fallback = jest.fn<() => Promise<string>>().mockResolvedValue('fallback');

      const result = await recovery.fallback(primary, fallback);

      expect(result).toBe('primary');
      expect(primary).toHaveBeenCalledTimes(1);
      expect(fallback).not.toHaveBeenCalled();
    });

    it('应该在主函数失败时使用降级方案', async () => {
      const primary = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('failed'));
      const fallback = jest.fn<() => Promise<string>>().mockResolvedValue('fallback');

      const result = await recovery.fallback(primary, fallback);

      expect(result).toBe('fallback');
      expect(primary).toHaveBeenCalledTimes(1);
      expect(fallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('classifyError', () => {
    it('应该识别可恢复错误', () => {
      const errors = [
        { code: 'ETIMEDOUT' },
        { status: 429 },
        { status: 503 },
        { message: 'timeout occurred' },
      ];

      errors.forEach(error => {
        expect(recovery.classifyError(error)).toBe('recoverable');
      });
    });

    it('应该识别用户错误', () => {
      const errors = [
        { status: 400 },
        { status: 401 },
        { status: 403 },
        { status: 404 },
      ];

      errors.forEach(error => {
        expect(recovery.classifyError(error)).toBe('user_error');
      });
    });

    it('应该识别致命错误', () => {
      const error = { message: 'Unknown error' };
      expect(recovery.classifyError(error)).toBe('fatal');
    });
  });

  describe('formatError', () => {
    it('应该格式化可恢复错误', () => {
      const error = { code: 'ETIMEDOUT', message: 'Connection timeout' };
      const formatted = recovery.formatError(error);

      expect(formatted).toContain('⚠️  临时错误');
      expect(formatted).toContain('ETIMEDOUT');
      expect(formatted).toContain('Connection timeout');
    });

    it('应该格式化用户错误', () => {
      const error = { status: 400, message: 'Bad Request' };
      const formatted = recovery.formatError(error);

      expect(formatted).toContain('❌ 请求错误');
      expect(formatted).toContain('HTTP 400');
      expect(formatted).toContain('Bad Request');
    });

    it('应该格式化致命错误', () => {
      const error = { message: 'Fatal error' };
      const formatted = recovery.formatError(error);

      expect(formatted).toContain('💥 致命错误');
      expect(formatted).toContain('Fatal error');
    });
  });
});
