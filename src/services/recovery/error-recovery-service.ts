/**
 * 错误恢复机制
 * 自动处理临时故障和可恢复错误
 */

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  backoffFactor: number;
  maxDelay: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  backoffFactor: 2,
  maxDelay: 10000,
};

export class ErrorRecovery {
  /**
   * 带重试的函数执行
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: Error | undefined;
    let delay = config.initialDelay;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // 判断是否可重试
        if (!this.isRetryable(error) || attempt === config.maxAttempts) {
          throw error;
        }

        console.warn(
          `⚠️  尝试 ${attempt}/${config.maxAttempts} 失败: ${lastError.message}`
        );
        console.warn(`   ${delay}ms 后重试...`);

        await this.sleep(delay);
        delay = Math.min(delay * config.backoffFactor, config.maxDelay);
      }
    }

    throw lastError!;
  }

  /**
   * 降级策略：主函数失败时使用备用函数
   */
  async fallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    try {
      return await primary();
    } catch (error) {
      console.warn('⚠️  主函数失败，使用降级方案...');
      return await fallback();
    }
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryable(error: any): boolean {
    // 网络超时
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      return true;
    }

    // 连接被拒绝
    if (error.code === 'ECONNREFUSED') {
      return true;
    }

    // API 限流
    if (error.status === 429) {
      return true;
    }

    // 服务器错误（5xx）
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // 特定错误消息
    const retryableMessages = [
      'timeout',
      'timed out',
      'rate limit',
      'too many requests',
      'service unavailable',
      'bad gateway',
      'gateway timeout',
    ];

    const errorMessage = (error.message || '').toLowerCase();
    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * 错误分类
   */
  classifyError(error: any): 'recoverable' | 'fatal' | 'user_error' {
    // 可恢复错误
    if (this.isRetryable(error)) {
      return 'recoverable';
    }

    // 用户错误（4xx，除了 429）
    if (error.status >= 400 && error.status < 500 && error.status !== 429) {
      return 'user_error';
    }

    // 致命错误
    return 'fatal';
  }

  /**
   * 格式化错误消息
   */
  formatError(error: any): string {
    const type = this.classifyError(error);
    const prefix = {
      recoverable: '⚠️  临时错误',
      user_error: '❌ 请求错误',
      fatal: '💥 致命错误',
    }[type];

    const message = error.message || String(error);
    const code = error.code ? ` [${error.code}]` : '';
    const status = error.status ? ` (HTTP ${error.status})` : '';

    return `${prefix}${code}${status}: ${message}`;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 全局错误恢复实例
 */
export const errorRecovery = new ErrorRecovery();
