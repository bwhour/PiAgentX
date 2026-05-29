# 架构对比：pi-mom vs 我们的实现

## 核心设计对齐 ✅

| 设计点 | pi-mom (Slack) | 我们的实现 (飞书) | 状态 |
|--------|----------------|------------------|------|
| 按 channel 隔离 session | channelStates.get(channelId) | sessions.get(chatId) | ✅ 已实现 |
| 跨 channel 并行 | 每个 channel 独立 runner | 每个 chatId 独立 AgentSession | ✅ 已实现 |
| 同 channel 内串行 | running 锁 | processing + queue | ✅ 已实现 |
| 持久化对话历史 | SessionManager + context.jsonl | SessionManager.continueRecent | ✅ 已实现 |
| 空闲恢复 | 基于文件自动恢复 | continueRecent 自动恢复 | ✅ 已实现 |
| 双文件历史 | log.jsonl + context.jsonl | log.jsonl + SDK 管理 | ✅ 已实现 |
| stop 命令 | session.abort() | sessionManager.abort() | ✅ 已实现 |
| 事件系统 | 文件监听 events/ | EventManager (cron + webhook) | ✅ 已实现 |

## 差异点分析

### 1. 忙碌处理策略

**pi-mom**: 忙碌时拒绝新消息，回复 "已在工作中，说 stop 取消"
**我们**: 消息入队排队处理

**选择理由**: 飞书场景下排队更友好，避免用户重复发送

### 2. 渐进式回复

**pi-mom**: 先发 "Thinking"，边处理边编辑消息，工具详情发到 thread
**我们**: 简单回复 "收到，正在处理..."

**选择理由**: 飞书 API 限制较多，保持简单

### 3. 启动 backfill

**pi-mom**: 启动时从 Slack API 拉取离线消息
**我们**: 未实现

**优先级**: 中 - 可选功能，按需添加

### 4. per-channel 记忆

**pi-mom**: 每个 channel 独立 MEMORY.md + 全局共享
**我们**: 全局共享记忆

**选择理由**: 当前场景够用，未来可扩展

### 5. Docker 沙箱

**pi-mom**: 所有工具在 Docker 内执行
**我们**: 直接执行

**选择理由**: 飞书 bot 场景暂不需要隔离

## 文件结构对比

### pi-mom
```
.pi/slack-sessions/{channelId}/
├── log.jsonl          # 完整记录（不压缩）
├── context.jsonl      # LLM 上下文（会压缩）
└── MEMORY.md          # channel 独立记忆
```

### 我们的实现
```
.pi/feishu-sessions/{chatId}/
├── log.jsonl          # 完整记录（不压缩）✅ 新增
└── session-*/         # SDK 管理的 context
```

## 总结

**核心架构已对齐** - 多 session 隔离、持久化历史、事件系统、stop 命令、双文件历史

**差异点合理** - 根据飞书场景做了适配性调整

**代码量对比**:
- pi-mom: ~800 行（Slack 特定逻辑）
- 我们: ~400 行（通用 ChannelSessionManager + 飞书适配）

**可复用性**: ChannelSessionManager 可直接用于微信/Telegram/Discord 等其他通道
