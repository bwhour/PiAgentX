# PI Agent

[English](README.en.md)

基于 [@earendil-works/pi-coding-agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) **0.75.4** 的 TypeScript 应用层：终端 CLI、飞书 Bot、任务/记忆/子 Agent 等扩展能力。

## 核心特性

- 终端交互（`AgentSessionRuntime` + `InteractiveMode` + 自定义工具）
- 每轮系统提示通过 `before_agent_start` 扩展注入（记忆召回 + bootstrap，见 `src/infrastructure/pi/dynamic-prompt-extension.ts`）
- 飞书多会话 Bot（`npm run feishu`）
- 任务工作流、跨会话记忆、上下文微压缩
- 默认 DeepSeek（OpenAI 兼容 API），可配置其他提供商
- Node.js **≥ 22.19.0**

## 升级背景（0.75）
项目已从 `@mariozechner/*` **0.58.3** 升级到 `@earendil-works/*` **0.75.4**（`pi-coding-agent` / `pi-ai` / `pi-agent-core` / `pi-tui`）。

- **依赖升级**：`@mariozechner/*` 0.58.3 → `@earendil-works/*` 0.75.4
- **运行时升级**：`AgentSessionRuntime` + `InteractiveMode(runtime)`
- **Prompt 注入**：`before_agent_start` 扩展动态注入系统提示
- **会话构建统一**：CLI、Feishu、子 Agent 共用 `infrastructure/pi/session-setup.ts`

## 项目结构
```
PiAgentX/
├── src/
│   ├── api/              # CLI、飞书入口
│   ├── core/             # agent-loop、会话、任务、事件
│   ├── services/         # 记忆、压缩、plan、subagent
│   ├── infrastructure/   # 工具、插件、pi session/runtime 封装
│   ├── config/
│   └── types/
├── plugins/              # 插件示例
├── docs/zh/              # 中文文档
├── tests/
└── .env.example
```
### 源码目录（`src/`）
```text
src/
├── api/              # 入口层（CLI / Feishu）
├── core/             # 核心流程（Agent loop / 任务 / 提示词）
├── services/         # 服务编排（subagent / plan / 压缩 / 恢复）
├── infrastructure/   # 工具、插件、日志、runtime/session 封装
├── config/           # 配置与路径
└── types/            # 公共类型
```
### 关键入口
- `api/index.ts`：CLI 主入口（runtime + interactive mode）
- `api/feishu.ts`：Feishu Bot 入口（多会话处理）

### 关键模块
#### Runtime / Session（0.75 重点）
- `infrastructure/pi/create-runtime.ts` — 创建 `AgentSessionRuntime`，装配工具、插件、动态 prompt 扩展
- `infrastructure/pi/session-setup.ts` — `createPiagentSession()`、`loadProjectSkills()`、默认 `SessionManager`
- `infrastructure/pi/dynamic-prompt-extension.ts` — `before_agent_start` 动态注入记忆与系统提示

#### Agent 执行与服务编排
- `core/agent/agent-loop.ts` — 主 Agent 业务循环
- `core/agent/background-agent-loop.ts` — 后台并行模式
- `services/subagent/subagent-service.ts` — 子 Agent 独立上下文
- `services/compaction/compaction-service.ts` — 上下文压缩
- `services/recovery/error-recovery-service.ts` — 重试与降级恢复

#### 工具、插件与观测
- `infrastructure/tools/` — memory / compact / task / browser 等自定义工具
- `infrastructure/plugins/` — 插件加载与注册
- `infrastructure/logging/observable-logger.ts` — 可观测日志
- `infrastructure/monitoring/performance-monitor.ts` — 性能统计
- `infrastructure/session/session-factory.ts` — 带日志包装的会话工厂

## 快速开始
### 1. 安装依赖
```bash
npm install
```

编辑 `.env` 文件，根据你使用的模型提供商配置：
```bash
cp .env.example .env

LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com

MODEL_ID=deepseek-chat
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
MODEL_ID=claude-sonnet-4-20250514

LLM_PROVIDER=openai
OPENAI_API_KEY=sk-xxx
MODEL_ID=gpt-4-turbo
```
### 2. 运行
```bash
# 终端 CLI
npm run dev
# 飞书 Bot（需 FEISHU_APP_ID / FEISHU_APP_SECRET）
npm run feishu
# 并行子任务模式
BACKGROUND_MODE=true npm run dev
```
### 启动运行
> <small>
>
> `npm run build` · `npm test` · `npm run start`（需先 build）
> CLI：输入后回车；退出 `q` / `exit` / `Ctrl+C`
> 飞书：`Ctrl+C` 停止；环境变量见上文，飞书另需 `FEISHU_APP_ID` / `FEISHU_APP_SECRET`
>
> </small>
## 文档
- [文档索引](docs/zh/README.md)
- [架构](docs/zh/ARCHITECTURE.md)
- [源码导览（简版）](src/README.md)

## 技术栈
- `@earendil-works/pi-coding-agent` / `pi-ai` / `pi-agent-core` / `pi-tui` @ 0.75.4
- `@larksuiteoapi/node-sdk`（飞书）
- TypeScript 5.9+

## License
MIT