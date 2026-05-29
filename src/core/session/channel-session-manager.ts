/**
 * ChannelSessionManager - 通用多通道 Session 管理器
 *
 * 通道无关的核心逻辑：
 * - 每个 chatId 独立 AgentSession + 对话历史
 * - 同一 chat 内串行队列，跨 chat 并行处理
 * - 消息去重（at-least-once 投递保护）
 * - 空闲 session 自动清理
 * - 自动记忆召回 + 微压缩 + token 超限保存
 *
 * 使用方式：
 *   const manager = new ChannelSessionManager({ channel: "feishu", ... });
 *   const reply = await manager.processMessage(chatId, messageId, text);
 */
import {
  type AgentSession,
  SessionManager,
  estimateTokens,
  type Skill,
} from "@earendil-works/pi-coding-agent";
import type { ToolDefinition } from "../../infrastructure/tools/index.js";
import { autoRecall } from "../agent/system-prompt.js";
import { microCompact } from "../../services/compaction/compaction-service.js";
import { paths } from "../../config/config.js";
import { createPiagentSession, finalizePiagentSession } from "../../infrastructure/pi/session-setup.js";
import { join } from "path";
import { mkdirSync, appendFileSync, readFileSync, existsSync, readdirSync } from "fs";
import { appendJsonLog } from "../../infrastructure/logging/file-log.js";
import { getSessionKey } from "../../infrastructure/logging/observable-logger.js";

// ─── Types ───────────────────────────────────────────────

interface QueueItem {
  messageId: string;
  text: string;
  resolve: (reply: string) => void;
  reject: (err: Error) => void;
  onProgress?: (text: string) => void; // 渐进式回复回调
}

interface ChatSession {
  session: AgentSession;
  lastActiveAt: number;
  queue: QueueItem[];
  processing: boolean;
  logFile: string; // log.jsonl 路径
}

export interface ChannelSessionManagerOptions {
  /** 通道名称，用于日志和目录隔离，如 "feishu" / "wechat" / "telegram" */
  channel: string;
  /** 可用工具集 */
  effectiveTools: ToolDefinition[];
  /** 可用 skills */
  skills: Skill[];
  /** 空闲 session 超时（默认 30 分钟） */
  idleTimeoutMs?: number;
  /** 去重缓存 TTL（默认 5 分钟） */
  dedupTtlMs?: number;
  /** token 压缩阈值（默认 40000） */
  compactTokenThreshold?: number;
}

// ─── Constants ───────────────────────────────────────────

const DEFAULT_IDLE_TIMEOUT = 30 * 60 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const DEFAULT_DEDUP_TTL = 5 * 60 * 1000;
const DEFAULT_COMPACT_THRESHOLD = 40000;

// ─── Manager ─────────────────────────────────────────────

export class ChannelSessionManager {
  private sessions = new Map<string, ChatSession>();
  private processedMessages = new Map<string, number>();

  private cleanupTimer: NodeJS.Timeout;
  private dedupTimer: NodeJS.Timeout;

  private channel: string;
  private effectiveTools: ToolDefinition[];
  private skills: Skill[];
  private idleTimeoutMs: number;
  private dedupTtlMs: number;
  private compactTokenThreshold: number;

  constructor(options: ChannelSessionManagerOptions) {
    this.channel = options.channel;
    this.effectiveTools = options.effectiveTools;
    this.skills = options.skills;
    this.idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT;
    this.dedupTtlMs = options.dedupTtlMs ?? DEFAULT_DEDUP_TTL;
    this.compactTokenThreshold = options.compactTokenThreshold ?? DEFAULT_COMPACT_THRESHOLD;

    // 定期清理空闲 session
    this.cleanupTimer = setInterval(() => this.cleanupIdleSessions(), CLEANUP_INTERVAL);

    // 定期清理去重缓存
    this.dedupTimer = setInterval(() => this.cleanupDedupCache(), 60 * 1000);
  }

  // ─── 公开 API ────────────────────────────────────────

  /** 检查消息是否重复（at-least-once 去重） */
  isDuplicate(messageId: string): boolean {
    if (this.processedMessages.has(messageId)) {
      console.log(`🔁 [${this.channel}] 重复事件已忽略 [${messageId}]`);
      return true;
    }
    this.processedMessages.set(messageId, Date.now());
    return false;
  }

  /** 检查指定 chatId 是否正在处理消息 */
  isProcessing(chatId: string): boolean {
    return this.sessions.get(chatId)?.processing ?? false;
  }

  /** 取消当前任务（stop 命令） */
  async abort(chatId: string): Promise<boolean> {
    const chatSession = this.sessions.get(chatId);
    if (!chatSession?.processing) return false;

    try {
      await chatSession.session.abort();
      chatSession.processing = false;
      chatSession.queue = []; // 清空队列
      console.log(`🛑 [${this.channel}][${chatId}] 任务已取消`);
      return true;
    } catch (err) {
      console.error(`❌ [${this.channel}][${chatId}] 取消失败:`, err);
      return false;
    }
  }

  /**
   * 处理一条消息，返回 agent 回复文本
   *
   * 同一 chat 内串行排队，跨 chat 并行。
   * 返回的 Promise 在消息被实际处理完毕后 resolve。
   *
   * @param onProgress 可选的渐进式回复回调，实时接收 agent 输出
   */
  processMessage(
    chatId: string,
    messageId: string,
    text: string,
    onProgress?: (text: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.enqueueAndProcess(chatId, { messageId, text, resolve, reject, onProgress });
    });
  }

  /** 关闭所有 session，释放资源 */
  shutdown(): void {
    clearInterval(this.cleanupTimer);
    clearInterval(this.dedupTimer);
    for (const [chatId, chatSession] of this.sessions) {
      try { chatSession.session.dispose(); } catch { /* ignore */ }
      console.log(`🛑 [${this.channel}] 关闭 session [${chatId}]`);
    }
    this.sessions.clear();
    this.processedMessages.clear();
  }

  /**
   * 启动时 backfill：扫描已有 log.jsonl，返回需要拉取历史的 chatId 列表
   *
   * 返回 Map<chatId, lastTimestamp>，用于从通道 API 拉取离线消息
   */
  getChatsForBackfill(): Map<string, string> {
    const result = new Map<string, string>();
    const sessionsDir = join(paths.piDir, `${this.channel}-sessions`);

    if (!existsSync(sessionsDir)) return result;

    try {
      const chatDirs = readdirSync(sessionsDir, { withFileTypes: true });
      for (const dir of chatDirs) {
        if (!dir.isDirectory()) continue;

        const chatId = dir.name;
        const logFile = join(sessionsDir, chatId, "log.jsonl");

        if (existsSync(logFile)) {
          // 读取最后一条消息的时间戳
          const content = readFileSync(logFile, "utf-8");
          const lines = content.trim().split("\n").filter(l => l);
          if (lines.length > 0) {
            try {
              const lastEntry = JSON.parse(lines[lines.length - 1]);
              result.set(chatId, lastEntry.timestamp);
            } catch {
              // 解析失败，跳过
            }
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️ [${this.channel}] backfill 扫描失败:`, err);
    }

    return result;
  }

  /**
   * 将 backfill 的消息写入 log.jsonl
   *
   * 用于启动时从通道 API 拉取的历史消息
   */
  appendBackfillMessage(chatId: string, messageId: string, role: "user" | "assistant", content: string, timestamp: string): void {
    const sessionDir = join(paths.piDir, `${this.channel}-sessions`, chatId);
    const logFile = join(sessionDir, "log.jsonl");

    mkdirSync(sessionDir, { recursive: true });

    appendFileSync(logFile, JSON.stringify({
      role,
      content,
      timestamp,
      message_id: messageId,
      backfilled: true,
    }) + "\n");
  }

  // ─── 内部逻辑 ────────────────────────────────────────

  private async getOrCreateSession(chatId: string): Promise<AgentSession> {
    const existing = this.sessions.get(chatId);
    if (existing) {
      existing.lastActiveAt = Date.now();
      return existing.session;
    }

    const sessionDir = join(paths.piDir, `${this.channel}-sessions`, chatId);
    mkdirSync(sessionDir, { recursive: true });

    const logFile = join(sessionDir, "log.jsonl");
    const sessionManager = SessionManager.continueRecent(paths.root, sessionDir);

    const result = await createPiagentSession({
      cwd: paths.root,
      sessionManager,
      customTools: this.effectiveTools,
      channel: "api",
    });

    const session = result.session;
    // Shared extension bind + tool profile (same path as CLI / agent-loop)
    await finalizePiagentSession(session, {
      profile: "none",
      workspaceDir: paths.root,
    });

    this.sessions.set(chatId, {
      session,
      lastActiveAt: Date.now(),
      queue: [],
      processing: false,
      logFile,
    });

    console.log(`🆕 [${this.channel}] 创建新 session [${chatId}] (活跃: ${this.sessions.size})`);
    appendJsonLog(this.channel, {
      event: "session.created",
      session_key: getSessionKey(),
      chat_id: chatId,
      active_sessions: this.sessions.size,
    });

    return session;
  }

  private async enqueueAndProcess(chatId: string, item: QueueItem): Promise<void> {
    await this.getOrCreateSession(chatId);
    const chatSession = this.sessions.get(chatId)!;

    if (chatSession.processing) {
      chatSession.queue.push(item);
      console.log(`⏳ [${this.channel}][${chatId}] 消息入队 (队列: ${chatSession.queue.length})`);
      return;
    }

    chatSession.processing = true;
    await this.executeItem(chatId, chatSession, item);

    while (chatSession.queue.length > 0) {
      const next = chatSession.queue.shift()!;
      console.log(`🔄 [${this.channel}][${chatId}] 处理队列消息 (剩余: ${chatSession.queue.length})`);
      await this.executeItem(chatId, chatSession, next);
    }

    chatSession.processing = false;
  }

  private async executeItem(chatId: string, chatSession: ChatSession, item: QueueItem): Promise<void> {
    const { session } = chatSession;

    // 同步 log.jsonl 到 SessionManager（恢复离线消息）
    this.syncLogToSession(chatSession);

    // 记录到 log.jsonl（完整记录，不压缩）
    appendFileSync(chatSession.logFile, JSON.stringify({
      role: "user",
      content: item.text,
      timestamp: new Date().toISOString(),
      message_id: item.messageId,
    }) + "\n");

    try {
      if (autoRecall(item.text)) {
        console.log(`  🧠 [${this.channel}][${chatId}] relevant memory found`);
      }

      microCompact(session.messages);

      const totalTokens = session.messages.reduce(
        (sum, msg) => sum + estimateTokens(msg),
        0,
      );
      if (totalTokens > this.compactTokenThreshold) {
        console.log(`🧠 [${this.channel}][${chatId}] 触发自动记忆保存`);
        await session.prompt(
          "Pre-compaction memory flush: Use memory_write to save important facts, " +
          "decisions, and context worth remembering across sessions. Be selective."
        );
      }

      await session.prompt(item.text);

      // Extract reply
      const reply = this.extractReply(session);
      console.log(`📝 [${this.channel}][${chatId}] 提取到回复 (${reply.length} 字符)`);
      chatSession.lastActiveAt = Date.now();

      // 记录回复到 log.jsonl
      if (reply) {
        appendFileSync(chatSession.logFile, JSON.stringify({
          role: "assistant",
          content: reply,
          timestamp: new Date().toISOString(),
        }) + "\n");
        console.log(`✅ [${this.channel}][${chatId}] 回复已写入 log.jsonl`);
      } else {
        console.warn(`⚠️ [${this.channel}][${chatId}] 回复为空，未写入`);
      }

      item.resolve(reply);
    } catch (err: any) {
      console.error(`❌ [${this.channel}][${chatId}] agent 执行失败:`, err?.message ?? err);
      appendJsonLog(this.channel, {
        event: "agent.error",
        session_key: getSessionKey(),
        chat_id: chatId,
        message_id: item.messageId,
        error_message: String(err?.message ?? err),
        error_stack: String(err?.stack ?? "").slice(0, 4000),
      });
      item.reject(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private extractReply(session: AgentSession): string {
    const lastMsg = session.messages.at(-1);
    console.log(`🔍 [extractReply] 最后一条消息:`, lastMsg?.role);
    if (lastMsg?.role === "assistant") {
      const textContent = lastMsg.content.find((c: any) => c.type === "text");
      if (textContent && "text" in textContent) {
        const text = (textContent as any).text;
        console.log(`🔍 [extractReply] 提取到文本:`, text.slice(0, 100));
        // 过滤掉 API 错误信息，避免直接返回给用户
        if (text.includes("401") || text.includes("Incorrect API key") || text.includes("API key")) {
          throw new Error("API 调用失败，请检查配置");
        }
        return text;
      }
    }
    console.log(`🔍 [extractReply] 未找到有效回复`);
    return "";
  }

  private cleanupIdleSessions(): void {
    const now = Date.now();
    for (const [chatId, chatSession] of this.sessions) {
      if (chatSession.processing) continue;
      if (now - chatSession.lastActiveAt > this.idleTimeoutMs) {
        console.log(`🧹 [${this.channel}] 清理空闲 session [${chatId}]`);
        try { chatSession.session.dispose(); } catch { /* ignore */ }
        this.sessions.delete(chatId);
        appendJsonLog(this.channel, {
          event: "session.cleaned",
          session_key: getSessionKey(),
          chat_id: chatId,
          active_sessions: this.sessions.size,
        });
      }
    }
  }

  private cleanupDedupCache(): void {
    const now = Date.now();
    for (const [id, ts] of this.processedMessages) {
      if (now - ts > this.dedupTtlMs) this.processedMessages.delete(id);
    }
  }

  /**
   * 同步 log.jsonl 到 SessionManager
   *
   * 将 log.jsonl 中的消息（如果不在 SessionManager 中）添加到 context，
   * 用于恢复离线期间的对话历史。
   */
  private syncLogToSession(chatSession: ChatSession): void {
    const sessionDir = chatSession.logFile.replace("/log.jsonl", "");

    // 1. 收集所有会话文件（包括 SessionManager 创建的带时间戳文件）
    const allMessages: any[] = [];

    try {
      const files = readdirSync(sessionDir);
      for (const file of files) {
        if (file.endsWith(".jsonl")) {
          const filePath = join(sessionDir, file);
          const content = readFileSync(filePath, "utf-8");
          const lines = content.trim().split("\n").filter(l => l);

          for (const line of lines) {
            try {
              const entry = JSON.parse(line);
              allMessages.push({ ...entry, _source: file });
            } catch { continue; }
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️ [${this.channel}] 扫描会话文件失败:`, err);
      return;
    }

    // 2. 按时间戳排序
    allMessages.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // 3. 合并到 log.jsonl（去重）
    if (!existsSync(chatSession.logFile)) {
      appendFileSync(chatSession.logFile, "");
    }

    const logContent = readFileSync(chatSession.logFile, "utf-8");
    const existingIds = new Set(
      logContent.trim().split("\n")
        .filter(l => l)
        .map(l => { try { return JSON.parse(l).message_id; } catch { return null; } })
        .filter(Boolean)
    );

    for (const msg of allMessages) {
      if (msg.message_id && !existingIds.has(msg.message_id) && msg._source !== "log.jsonl") {
        appendFileSync(chatSession.logFile, JSON.stringify({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          message_id: msg.message_id,
        }) + "\n");
        existingIds.add(msg.message_id);
      }
    }
  }
}
