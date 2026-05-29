/**
 * EventManager - 事件系统（Cron + Webhook）
 *
 * 支持：
 * - 定时任务（cron 表达式）
 * - 外部 webhook 触发
 *
 * 使用方式：
 *   const em = new EventManager(sessionManager);
 *   em.addCron(chatId, "0 9 * * *", "生成今日投资建议");
 *   em.triggerWebhook(chatId, "GitHub PR merged", payload);
 */
import { schedule, ScheduledTask } from "node-cron";
import type { ChannelSessionManager } from "../session/channel-session-manager.js";

interface CronJob {
  chatId: string;
  cron: string;
  prompt: string;
  task: ScheduledTask;
}

export class EventManager {
  private cronJobs = new Map<string, CronJob>();
  private sessionManager: ChannelSessionManager;

  constructor(sessionManager: ChannelSessionManager) {
    this.sessionManager = sessionManager;
  }

  /**
   * 添加定时任务
   * @param id 任务唯一标识
   * @param chatId 目标聊天 ID
   * @param cronExpr cron 表达式（如 "0 9 * * *" 每天 9 点）
   * @param prompt 触发时发送的提示词
   */
  addCron(id: string, chatId: string, cronExpr: string, prompt: string): void {
    if (this.cronJobs.has(id)) {
      throw new Error(`Cron job ${id} already exists`);
    }

    const task = schedule(cronExpr, async () => {
      console.log(`⏰ [Cron] 触发任务 [${id}] → [${chatId}]`);
      try {
        await this.sessionManager.processMessage(
          chatId,
          `cron-${id}-${Date.now()}`,
          prompt
        );
      } catch (err: any) {
        console.error(`❌ [Cron] 任务执行失败 [${id}]:`, err?.message);
      }
    });

    this.cronJobs.set(id, { chatId, cron: cronExpr, prompt, task });
    console.log(`✅ [Cron] 已添加任务 [${id}]: ${cronExpr}`);
  }

  /**
   * 移除定时任务
   */
  removeCron(id: string): boolean {
    const job = this.cronJobs.get(id);
    if (!job) return false;

    job.task.stop();
    this.cronJobs.delete(id);
    console.log(`🗑️ [Cron] 已移除任务 [${id}]`);
    return true;
  }

  /**
   * 触发 webhook 事件
   * @param chatId 目标聊天 ID
   * @param eventType 事件类型（如 "github.pr.merged"）
   * @param payload 事件数据
   */
  async triggerWebhook(chatId: string, eventType: string, payload: any): Promise<void> {
    console.log(`🔔 [Webhook] 收到事件 [${eventType}] → [${chatId}]`);
    const prompt = `Webhook event: ${eventType}\n\nPayload:\n${JSON.stringify(payload, null, 2)}`;

    try {
      await this.sessionManager.processMessage(
        chatId,
        `webhook-${eventType}-${Date.now()}`,
        prompt
      );
    } catch (err: any) {
      console.error(`❌ [Webhook] 处理失败:`, err?.message);
      throw err;
    }
  }

  /**
   * 列出所有定时任务
   */
  listCrons(): Array<{ id: string; chatId: string; cron: string; prompt: string }> {
    return Array.from(this.cronJobs.entries()).map(([id, job]) => ({
      id,
      chatId: job.chatId,
      cron: job.cron,
      prompt: job.prompt,
    }));
  }

  /**
   * 关闭所有任务
   */
  shutdown(): void {
    for (const [id, job] of this.cronJobs) {
      job.task.stop();
      console.log(`🛑 [Cron] 停止任务 [${id}]`);
    }
    this.cronJobs.clear();
  }
}
