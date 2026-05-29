# PI Agent 架构说明（0.75）

**语言：** [中文](ARCHITECTURE.md) | [English](../en/ARCHITECTURE.md)

本文件是当前主架构说明。项目已从 `@mariozechner/*` **0.58.3** 升级到 `@earendil-works/*` **0.75.4**。

## 分层结构

```text
api -> services -> core
  \-> infrastructure
```

- `api/`：入口与通道适配（CLI、Feishu）
- `services/`：业务编排（subagent、plan、compaction、recovery）
- `core/`：核心逻辑（agent loop、task、prompt、session mapping）
- `infrastructure/`：外部能力与运行时封装（tools、plugins、logging、monitoring、pi runtime/session）

## 关键运行时组件（0.75）

- `src/infrastructure/pi/create-runtime.ts` — 创建 `AgentSessionRuntime`，装配工具、插件、扩展
- `src/infrastructure/pi/session-setup.ts` — `createPiagentSession()`、skills、`SessionManager`
- `src/infrastructure/pi/dynamic-prompt-extension.ts` — `before_agent_start` 动态系统提示

## 入口与会话

- CLI：`src/api/index.ts`（`InteractiveMode(runtime)`）
- Feishu：`src/api/feishu.ts`
- 会话包装：`src/infrastructure/session/session-factory.ts`

## 设计约束

- Core 保持业务纯度，不耦合具体外部实现
- Services 只做编排
- Infrastructure 集中可替换依赖
- API 负责组装，不写复杂业务逻辑

## 关联文档

- [源码导览（中文）](../../src/README.md)
- [文档索引](README.md)
- [架构（English）](../en/ARCHITECTURE.md)
