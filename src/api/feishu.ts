/**
 * Feishu bot adapter (WebSocket long-connection mode).
 *
 * pi-mom style: one session per chatId, persisted history, parallel chats.
 *
 * Run: npm run feishu
 * Requires: FEISHU_APP_ID, FEISHU_APP_SECRET
 *
 * Feishu console: Event subscription → receive events via long connection.
 */
import "dotenv/config";

import * as lark from "@larksuiteoapi/node-sdk";
import type { Skill } from "@earendil-works/pi-coding-agent";
import { bootstrapPiagentApp } from "../infrastructure/pi/session-setup.js";
import { initSession, getSessionKey, logEvent, logSessionEnd } from "../infrastructure/logging/observable-logger.js";
import { appendJsonLog, getLogFilePath } from "../infrastructure/logging/file-log.js";
import { allCustomTools } from "../infrastructure/tools/index.js";
import type { ToolDefinition } from "../infrastructure/tools/index.js";
import { paths } from "../config/config.js";
import { FeishuSessionManager } from "./feishu-session-manager.js";
import { EventManager } from "../core/events/event-manager.js";

// ─── Environment ─────────────────────────────────────────

const APP_ID = process.env.FEISHU_APP_ID!;
const APP_SECRET = process.env.FEISHU_APP_SECRET!;

if (!APP_ID || !APP_SECRET) {
  console.error("❌ Missing FEISHU_APP_ID or FEISHU_APP_SECRET");
  process.exit(1);
}

// Debug: LLM API key presence
console.log("🔑 Environment check:");
console.log("  DEEPSEEK_API_KEY:", process.env.DEEPSEEK_API_KEY ? "set" : "❌ missing");
console.log("  OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "set" : "❌ missing");
console.log("  LLM_PROVIDER:", process.env.LLM_PROVIDER || "(not set)");

// ─── One-time bootstrap ──────────────────────────────────

initSession();
console.log(`📋 Feishu Session: ${getSessionKey()}`);
console.log(`🪵 Feishu Log: ${getLogFilePath("feishu")}`);
appendJsonLog("feishu", {
  event: "feishu.start",
  session_key: getSessionKey(),
  mode: "websocket-multi-session",
});

const { skills, pluginRegistry } = await bootstrapPiagentApp({
  pluginsLogLabel: "🔌 Plugins",
});

// Feishu tool set (exclude tools that rely on module-level singleton state)
const EXCLUDED_TOOLS = new Set(["compact", "browser", "task_create", "task_update", "task_list", "task_get", "spawn"]);
const feishuTools: ToolDefinition[] = [
  ...allCustomTools.filter((t) => !EXCLUDED_TOOLS.has(t.name)),
  ...pluginRegistry.tools,
];
console.log(`🔧 Feishu tools: ${feishuTools.map((t) => t.name).join(", ")}`);

// Session manager (ChannelSessionManager, channel="feishu")
const sessionManager = new FeishuSessionManager({
  channel: "feishu",
  effectiveTools: feishuTools,
  skills,
});

// Event manager (cron jobs and webhooks)
const eventManager = new EventManager(sessionManager);

// Example cron (daily 9:00 report):
// eventManager.addCron("daily-report", "oc_xxx", "0 9 * * *", "Generate daily market summary");

// 示例：webhook 触发（外部系统调用）
// eventManager.triggerWebhook("oc_xxx", "github.pr.merged", { repo: "piagent", pr: 123 });

// ─── 飞书 Client ─────────────────────────────────────────

const client = new lark.Client({ appId: APP_ID, appSecret: APP_SECRET });

/**
 * 启动时 backfill：拉取离线期间的消息
 */
async function backfillOfflineMessages(): Promise<void> {
  const chatsToBackfill = sessionManager.getChatsForBackfill();
  if (chatsToBackfill.size === 0) {
    console.log("📥 无需 backfill");
    return;
  }

  console.log(`📥 开始 backfill ${chatsToBackfill.size} 个 chat 的离线消息...`);

  for (const [chatId, lastTimestamp] of chatsToBackfill) {
    try {
      // 从飞书 API 拉取历史消息（最多 3 页，每页 20 条）
      let pageToken: string | undefined;
      let fetchedCount = 0;
      const maxPages = 3;

      for (let page = 0; page < maxPages; page++) {
        const response = await client.im.message.list({
          params: {
            container_id_type: "chat",
            container_id: chatId,
            page_size: 20,
            page_token: pageToken,
            // 不指定 start_time，拉取最近的消息
          },
        });

        if (!response.data?.items || response.data.items.length === 0) break;

        // 按时间顺序写入 log.jsonl
        for (const msg of response.data.items) {
          if (msg.msg_type !== "text") continue;

          try {
            const content = msg.body?.content;
            if (!content) continue;

            const text = JSON.parse(content).text?.trim();
            if (!text) continue;

            const role = "user"; // 简化处理，都当作用户消息
            const timestamp = new Date(parseInt(msg.create_time || "0")).toISOString();

            sessionManager.appendBackfillMessage(
              chatId,
              msg.message_id || `backfill-${Date.now()}`,
              role,
              text,
              timestamp
            );
            fetchedCount++;
          } catch {
            continue;
          }
        }

        pageToken = response.data.page_token;
        if (!pageToken) break;
      }

      if (fetchedCount > 0) {
        console.log(`  ✅ [${chatId}] backfill ${fetchedCount} 条消息`);
      }
    } catch (err: any) {
      console.warn(`  ⚠️ [${chatId}] backfill 失败:`, err?.message ?? err);
    }
  }

  console.log("📥 Backfill 完成");
}

async function sendReply(chatId: string, text: string): Promise<void> {
  try {
    await client.im.message.create({
      params: { receive_id_type: "chat_id" },
      data: {
        receive_id: chatId,
        msg_type: "text",
        content: JSON.stringify({ text }),
      },
    });
    console.log(`📤 已回复 [${chatId}]`);
    appendJsonLog("feishu", {
      event: "reply.sent",
      session_key: getSessionKey(),
      chat_id: chatId,
      text_preview: text.slice(0, 200),
    });
    logEvent("feishu.reply.sent", {
      chat_id: chatId,
      text_preview: text.slice(0, 200),
    });
  } catch (err: any) {
    console.error("❌ 飞书回复失败:", err?.message ?? err);
    console.error("   code:", err?.code, "| msg:", err?.msg);
    appendJsonLog("feishu", {
      event: "reply.error",
      session_key: getSessionKey(),
      chat_id: chatId,
      error_message: String(err?.message ?? err),
      error_code: err?.code,
      error_type: err?.type,
      error_stack: String(err?.stack ?? "").slice(0, 4000),
    });
    logEvent("feishu.reply.error", {
      chat_id: chatId,
      error_message: String(err?.message ?? err),
      error_code: err?.code,
      error_type: err?.type,
      error_stack: String(err?.stack ?? "").slice(0, 4000),
    });
  }
}

// ─── 事件分发器 ──────────────────────────────────────────

const dispatcher = new lark.EventDispatcher({}).register({
  "im.message.receive_v1": async (data) => {
    console.log("🔔 收到飞书事件:", JSON.stringify(data, null, 2));
    const msg = data.message;

    // 去重：同一 message_id 只处理一次（由 ChannelSessionManager 统一管理）
    if (sessionManager.isDuplicate(msg.message_id)) return;

    // 只处理文本消息
    if (msg.message_type !== "text") return;

    let text: string;
    try {
      text = JSON.parse(msg.content).text?.trim();
    } catch {
      return;
    }
    if (!text) return;

    const chatId = msg.chat_id;

    // stop 命令：取消当前任务
    if (text.toLowerCase() === "stop") {
      const aborted = await sessionManager.abort(chatId);
      await sendReply(chatId, aborted ? "✅ 已取消当前任务" : "当前没有运行中的任务");
      return;
    }
    console.log(`📨 收到消息 [${chatId}]: ${text.slice(0, 80)}${text.length > 80 ? "..." : ""}`);
    appendJsonLog("feishu", {
      event: "message.receive",
      session_key: getSessionKey(),
      chat_id: chatId,
      message_id: msg.message_id,
      message_type: msg.message_type,
      text_preview: text.slice(0, 200),
    });
    logEvent("feishu.message.receive", {
      chat_id: chatId,
      message_id: msg.message_id,
      message_type: msg.message_type,
      text_preview: text.slice(0, 200),
    });

    // 立即回复用户，避免等待期间无反馈
    if (sessionManager.isProcessing(chatId)) {
      await sendReply(chatId, "任务处理中，您的消息已排队，请稍后~");
    } else {
      await sendReply(chatId, "收到，正在处理...");
    }

    // 异步处理消息（agent 运行可能较久，内部按 chatId 排队，跨 chat 并行）
    try {
      const reply = await sessionManager.processMessage(chatId, msg.message_id, text);
      if (reply) {
        await sendReply(chatId, reply);
      }
    } catch (err: any) {
      console.error(`❌ [${chatId}] 处理失败:`, err?.message ?? err);
      logEvent("feishu.agent.error", {
        chat_id: chatId,
        message_id: msg.message_id,
        error_message: String(err?.message ?? err),
      });
      await sendReply(chatId, "抱歉，处理消息时出错了，请稍后重试。");
    }
  },
  // 忽略消息已读事件（避免报错）
  "im.message.message_read_v1": async () => {
    // 不需要处理
  },
  // 忽略机器人进入单聊事件
  "im.chat.access_event.bot_p2p_chat_entered_v1": async () => {
    // 不需要处理
  },
});

// ─── 启动 WebSocket ──────────────────────────────────────

const wsClient = new lark.WSClient({
  appId: APP_ID,
  appSecret: APP_SECRET,
  loggerLevel: lark.LoggerLevel.info,
});

// 启动前先 backfill 离线消息
await backfillOfflineMessages();

console.log("🔌 正在连接飞书 WebSocket...");
wsClient.start({ eventDispatcher: dispatcher });

console.log("🚀 飞书 Bot 已启动（WebSocket 长连接 + 多 Session 模式）");
console.log("📡 每个 chatId 独立 session，持久化对话历史，跨 chat 并行处理");
console.log("🔗 飞书连接状态: https://open.feishu.cn/app");
appendJsonLog("feishu", {
  event: "ws.started",
  session_key: getSessionKey(),
  app_id: APP_ID,
  connection_url: "https://open.feishu.cn/app",
});

// ─── 优雅退出 ────────────────────────────────────────────

process.on("SIGINT", () => {
  eventManager.shutdown();
  sessionManager.shutdown();
  logSessionEnd();
  process.exit(0);
});

process.on("exit", () => {
  logSessionEnd();
});
