# PI Agent 可观察系统 - 完整指南

## 快速开始

### 1. 运行 PI Agent

**标准模式**（推荐日常使用）：
```bash
npm run dev
```

**详细追踪模式**（用于深度分析）：
```bash
npm run dev:log
```

### 2. 转换会话（仅标准模式需要）

```bash
npm run convert
```

### 3. 查看和分析

**交互式 TUI**（推荐）：
```bash
npm run sessions
```

**命令行**：
```bash
npm run session list
npm run session conversation <session_key>
npm run session analyze <session_key>
```

## 两种模式对比

| 功能 | 标准模式 | 详细追踪模式 |
|------|---------|------------|
| 启动命令 | `npm run dev` | `npm run dev:log` |
| 自动记录 | ✅ | ✅ |
| 需要转换 | ✅ 需要 `npm run convert` | ❌ 直接生成 |
| 提示词内容 | ❌ | ✅ |
| LLM 调用详情 | ❌ | ✅ |
| 持续时间 | ❌ | ✅ |
| 输出预览 | ❌ | ✅ |
| 性能开销 | 最小 | 轻微 |
| 日志大小 | 小 | 大 |
| 推荐场景 | 日常使用 | 调试分析 |

## 记录的信息

### 标准模式记录

- ✅ 会话开始/结束
- ✅ 模型切换
- ✅ 思考级别变化
- ✅ 用户输入（内容）
- ✅ 助手输出（内容）
- ✅ 工具调用（名称、参数）
- ✅ 工具结果（成功/失败）
- ✅ Token 使用统计
- ✅ 成本统计

### 详细追踪模式额外记录

- ✅ 提示词内容（前 500 字符）
- ✅ 完整提示词（前 1000 字符）
- ✅ LLM 调用开始/结束
- ✅ 响应时间（毫秒）
- ✅ 输出预览（前 200 字符）
- ✅ 每回合的 LLM 调用次数
- ✅ 每回合的工具调用次数

## 文件结构

```
.pi/observable-logs/
└── session_{id}/
    ├── conversation.json    # 对话上下文（用于恢复对话）
    ├── events.jsonl         # 追踪记录（用于分析）
    └── metadata.json        # 会话元数据
```

### conversation.json - 对话上下文

```json
{
  "session_key": "session_xxx",
  "messages": [
    {
      "role": "user",
      "content": "你好",
      "timestamp": "2024-03-15T10:30:00.000Z"
    },
    {
      "role": "assistant",
      "content": "你好！我是您的编程助手...",
      "timestamp": "2024-03-15T10:30:05.000Z"
    }
  ]
}
```

### events.jsonl - 追踪记录

**标准模式示例**：
```jsonl
{"ts": 1773510269.253, "event": "session.start", "session_key": "session_xxx"}
{"ts": 1773510270.100, "event": "turn.start", "turn_index": 0}
{"ts": 1773510270.150, "event": "user.input", "turn_index": 0, "content_length": 5}
{"ts": 1773510275.420, "event": "agent.end", "turn_index": 0, "usage": {"total": 946}}
{"ts": 1773510275.422, "event": "turn.end", "turn_index": 0}
```

**详细追踪模式示例**：
```jsonl
{"ts": 1773510269.253, "event": "session.start", "run_id": "ffd229d4", "session_key": "session_xxx"}
{"ts": 1773510270.100, "event": "turn.start", "run_id": "ffd229d4", "turn_index": 0}
{"ts": 1773510270.150, "event": "user.input", "run_id": "ffd229d4", "turn_index": 0, "content_preview": "hello"}
{"ts": 1773510270.200, "event": "agent.start", "run_id": "ffd229d4", "turn_index": 0, "prompt": "hello", "history_length": 0}
{"ts": 1773510270.250, "event": "llm.start", "run_id": "ffd229d4", "llm_run_id": "a1b2c3d4", "model": "deepseek-chat", "full_prompt": "hello"}
{"ts": 1773510275.418, "event": "llm.end", "run_id": "ffd229d4", "llm_run_id": "a1b2c3d4", "input_tokens": 864, "output_tokens": 82, "duration_ms": 5168}
{"ts": 1773510275.420, "event": "agent.end", "run_id": "ffd229d4", "turn_index": 0, "llm_calls": 1, "tool_calls": 0}
{"ts": 1773510275.422, "event": "turn.end", "run_id": "ffd229d4", "turn_index": 0}
```

### metadata.json - 会话元数据

```json
{
  "session_key": "session_xxx",
  "run_id": "ffd229d4",
  "start_time": "2024-03-15T10:30:00.000Z",
  "end_time": "2024-03-15T10:45:00.000Z",
  "model": "deepseek-chat",
  "cwd": "/path/to/PiAgentX",
  "total_turns": 5,
  "total_messages": 10,
  "total_tokens": 8500,
  "total_cost": 0,
  "llm_calls": 5,
  "tool_calls": 12
}
```

## 使用场景

### 场景 1: 日常开发

```bash
# 1. 启动 PI Agent
npm run dev

# 2. 使用 PI Agent 进行开发工作
# ...

# 3. 定期转换会话
npm run convert

# 4. 查看历史会话
npm run sessions
```

### 场景 2: 调试问题

```bash
# 1. 使用详细追踪模式
npm run dev:log

# 2. 重现问题
# ...

# 3. 查看详细日志
npm run sessions
# 按 T 键查看追踪记录

# 4. 分析特定会话
npm run session analyze <session_key>
```

### 场景 3: 性能优化

```bash
# 1. 使用详细追踪模式收集数据
npm run dev:log

# 2. 分析响应时间
cat .pi/observable-logs/session_*/events.jsonl | \
  jq -r 'select(.event == "llm.end") | .duration_ms' | \
  awk '{sum+=$1; count++} END {print "Average:", sum/count, "ms"}'

# 3. 分析 Token 使用
npm run session analyze <session_key>
```

### 场景 4: 准确度评估

```bash
# 1. 收集多个会话数据
npm run dev:log
# 执行多个任务...

# 2. 分析工具调用成功率
cat .pi/observable-logs/*/events.jsonl | \
  jq -s 'map(select(.event == "tool.result")) |
    {total: length, success: map(select(.success == true)) | length} |
    .success_rate = (.success / .total * 100)'

# 3. 查看失败的工具调用
cat .pi/observable-logs/*/events.jsonl | \
  jq 'select(.event == "tool.result" and .success == false)'
```

## 可用命令总结

```bash
# 运行
npm run dev          # 标准模式
npm run dev:log      # 详细追踪模式

# 转换
npm run convert      # 转换标准模式的会话

# 查看
npm run sessions     # 交互式 TUI
npm run session list # 列出所有会话
npm run session show <session_key>         # 查看详情
npm run session conversation <session_key> # 查看对话
npm run session analyze <session_key>      # 分析统计

# 监控
npm run monitor      # 实时监控 PI Agent 活动
```

## 文档索引

- [OBSERVABLE-SYSTEM.md](OBSERVABLE-SYSTEM.md) - 系统概述
- [SESSION-LOGGING.md](SESSION-LOGGING.md) - 日志格式详解
- [DETAILED-LOGGING.md](DETAILED-LOGGING.md) - 详细追踪模式
- [MONITORING.md](MONITORING.md) - 实时监控

## 最佳实践

1. **日常使用标准模式**，性能更好，日志更轻量
2. **需要调试时使用详细追踪模式**，获取完整信息
3. **定期运行 `npm run convert`** 转换标准模式的会话
4. **使用 TUI (`npm run sessions`)** 浏览和分析会话
5. **定期清理旧日志**，避免占用过多空间
6. **注意敏感信息**，详细模式会记录提示词内容

## 故障排除

### 问题: 找不到会话

**解决方案**:
```bash
# 检查是否有会话文件
ls ~/.pi/agent/sessions/--path-to-PiAgentX--/

# 运行转换
npm run convert

# 检查转换后的文件
ls .pi/observable-logs/
```

### 问题: TUI 显示空列表

**解决方案**:
```bash
# 确保已转换会话
npm run convert

# 或使用详细追踪模式
npm run dev:log
```

### 问题: 详细追踪模式不工作

**解决方案**:
- 确保使用 `npm run dev:log` 而不是 `npm run dev`
- 检查 `.pi/observable-logs/` 目录是否有新会话
- 查看控制台是否有错误信息
