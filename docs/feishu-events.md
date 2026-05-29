# 飞书事件系统使用指南

## 功能概述

### 核心功能
1. **按 chatId 隔离 session** - 每个聊天独立上下文，互不干扰
2. **对话历史持久化** - 自动保存和恢复对话历史
3. **事件系统** - 支持 cron 定时任务和 webhook 触发
4. **Stop 命令** - 用户发送 "stop" 立即取消当前任务
5. **双文件历史** - log.jsonl 完整记录（不压缩），context 由 SDK 管理

## 1. Stop 命令

### 使用方式

在飞书中直接发送：
```
stop
```

立即取消当前正在执行的任务并清空队列。

## 2. Cron 定时任务

### 添加定时任务

```typescript
// src/api/feishu.ts 中取消注释并修改：
eventManager.addCron(
  "daily-report",           // 任务 ID（唯一）
  "oc_xxx",                 // 飞书 chatId
  "0 9 * * *",              // cron 表达式（每天 9 点）
  "生成今日投资建议并总结市场动态"  // 提示词
);
```

### Cron 表达式示例

```
0 9 * * *     # 每天 9:00
0 */2 * * *   # 每 2 小时
0 9 * * 1     # 每周一 9:00
0 0 1 * *     # 每月 1 号 0:00
```

### 管理任务

```typescript
// 列出所有任务
const jobs = eventManager.listCrons();

// 移除任务
eventManager.removeCron("daily-report");
```

## 2. Webhook 触发

### 使用场景

- GitHub PR 合并后通知
- CI/CD 构建完成通知
- 外部系统事件通知

### 调用方式

```typescript
await eventManager.triggerWebhook(
  "oc_xxx",              // 飞书 chatId
  "github.pr.merged",    // 事件类型
  { repo: "piagent", pr: 123, author: "user" }  // 事件数据
);
```

### HTTP API 示例（需自行实现）

```typescript
// 在 feishu.ts 中添加 HTTP 服务器
import express from "express";

const app = express();
app.use(express.json());

app.post("/webhook/:chatId", async (req, res) => {
  const { chatId } = req.params;
  const { event, payload } = req.body;

  try {
    await eventManager.triggerWebhook(chatId, event, payload);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000);
```

## 注意事项

1. **chatId 获取**：在飞书群聊中发送消息，查看日志获取 `chat_id`
2. **时区**：cron 使用服务器本地时区
3. **并发**：同一 chatId 的事件会排队执行，避免冲突
4. **持久化**：定时任务重启后需重新添加（可改造为持久化配置）

## 完整示例

```typescript
// 每天 9 点发送投资建议
eventManager.addCron(
  "morning-brief",
  "oc_abc123",
  "0 9 * * *",
  "分析昨日市场表现，生成今日投资建议"
);

// 每周一总结
eventManager.addCron(
  "weekly-summary",
  "oc_abc123",
  "0 9 * * 1",
  "总结上周投资组合表现，提出本周策略"
);

// GitHub webhook
await eventManager.triggerWebhook(
  "oc_abc123",
  "deploy.success",
  { env: "production", version: "v1.2.3" }
);
```
