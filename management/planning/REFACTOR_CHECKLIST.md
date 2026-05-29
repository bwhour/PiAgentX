# 项目重构检查清单

## 第一阶段：基础重构 ✅

### 任务 1.1：创建目录结构
- [ ] 创建 `examples/` 目录
- [ ] 创建 `docs/` 目录
- [ ] 创建 `scripts/` 目录
- [ ] 创建 `tests/` 目录
- [ ] 创建 `config/` 目录
- [ ] 更新 `src/` 子目录结构

### 任务 1.2：移动 Python 示例
- [ ] 创建 `examples/python/` 目录
- [ ] 重命名 Python 脚本：
  - [ ] `s01_agent_loop.py` → `examples/python/01-basic-agent-loop.py`
  - [ ] `s02_tool_use.py` → `examples/python/02-tool-use-pattern.py`
  - [ ] `s03_todo_write.py` → `examples/python/03-todo-write-example.py`
  - [ ] `s04_subagent.py` → `examples/python/04-subagent-pattern.py`
  - [ ] `s05_skill_loading.py` → `examples/python/05-skill-loading.py`
  - [ ] `s06_context_compact.py` → `examples/python/06-context-compaction.py`
  - [ ] `s07_task_system.py` → `examples/python/07-task-system.py`
  - [ ] `s08_background_tasks.py` → `examples/python/08-background-tasks.py`
  - [ ] `s09_agent_teams.py` → `examples/python/09-agent-teams.py`
  - [ ] `s10_team_protocols.py` → `examples/python/10-team-protocols.py`
  - [ ] `s11_autonomous_agents.py` → `examples/python/11-autonomous-agents.py`
  - [ ] `s12_worktree_task_isolation.py` → `examples/python/12-worktree-isolation.py`
- [ ] 更新 Python 脚本中的导入路径（如果有）
- [ ] 创建 `examples/python/README.md`

### 任务 1.3：整理文档
- [ ] 创建文档目录结构：
  ```
  docs/
  ├── api/
  ├── guides/
  └── architecture/
  ```
- [ ] 移动和重命名文档：
  - [ ] `PI-TOOLS-LIST.md` → `docs/guides/tools-list.md`
  - [ ] `README-OBSERVABLE.md` → `docs/guides/observable-logging.md`
  - [ ] `TOOLS.md` → `docs/guides/custom-tools.md`
  - [ ] `框架.md` → `docs/architecture/framework.md`
- [ ] 更新根目录 `README.md` 中的链接
- [ ] 创建 `docs/README.md` 索引文件

### 任务 1.4：重构 src/ 目录
- [ ] 创建 `src/core/` 目录并移动文件：
  - [ ] `agent-loop.ts` → `src/core/agent-loop.ts`
  - [ ] `config.ts` → `src/core/config.ts`
  - [ ] `types.ts` → `src/core/types.ts`
  - [ ] 创建 `src/core/session-manager.ts`
- [ ] 创建 `src/tools/` 目录并移动文件：
  - [ ] `tools/spawn.ts` → `src/tools/spawn.ts`
  - [ ] `tools/compact-tool.ts` → `src/tools/compact-tool.ts`
  - [ ] `tools/task-tools.ts` → `src/tools/task-tools.ts`
  - [ ] 创建 `src/tools/bash.ts`
  - [ ] 创建 `src/tools/file-tools.ts`
- [ ] 创建 `src/skills/` 目录：
  - [ ] 创建 `src/skills/loader.ts`
  - [ ] 创建 `src/skills/registry.ts`
  - [ ] 创建 `src/skills/skill-builder.ts`
- [ ] 创建 `src/ui/` 目录并移动文件：
  - [ ] `observable-logger.ts` → `src/ui/logger/observable-logger.ts`
  - [ ] `session-id-mapper.ts` → `src/ui/logger/session-id-mapper.ts`
  - [ ] 创建 `src/ui/cli/`
  - [ ] 创建 `src/ui/tui/`
- [ ] 创建 `src/utils/` 目录并移动文件：
  - [ ] `compaction.ts` → `src/utils/compression.ts`
  - [ ] `task-manager.ts` → `src/utils/task-manager.ts`
  - [ ] 创建 `src/utils/validation.ts`
  - [ ] 创建 `src/utils/security.ts`
  - [ ] 创建 `src/utils/performance.ts`
- [ ] 更新所有 TypeScript 文件的导入路径
- [ ] 更新 `tsconfig.json` 中的路径映射

## 第二阶段：功能完善 🔄

### 任务 2.1：测试体系
- [ ] 安装测试依赖：
  - [ ] `npm install --save-dev jest @types/jest ts-jest`
  - [ ] `npm install --save-dev @jest/globals`
- [ ] 创建 `jest.config.js`
- [ ] 创建测试目录结构：
  ```
  tests/
  ├── unit/
  │   ├── core/
  │   ├── tools/
  │   └── utils/
  ├── integration/
  └── e2e/
  ```
- [ ] 编写核心测试：
  - [ ] `tests/unit/core/agent-loop.test.ts`
  - [ ] `tests/unit/core/config.test.ts`
  - [ ] `tests/unit/tools/bash.test.ts`
  - [ ] `tests/unit/utils/compression.test.ts`
- [ ] 添加测试脚本到 `package.json`

### 任务 2.2：配置系统
- [ ] 创建 `config/` 目录结构：
  ```
  config/
  ├── default.json
  ├── development.json
  ├── staging.json
  └── production.json
  ```
- [ ] 创建配置加载器：`src/core/config-loader.ts`
- [ ] 实现配置验证
- [ ] 更新 `.env` 文件处理
- [ ] 添加环境变量验证

### 任务 2.3：构建脚本
- [ ] 创建 `scripts/` 目录：
  ```
  scripts/
  ├── build.ts
  ├── deploy.ts
  ├── test.ts
  ├── lint.ts
  └── clean.ts
  ```
- [ ] 实现 TypeScript 构建脚本
- [ ] 添加代码检查脚本
- [ ] 创建部署脚本模板
- [ ] 更新 `package.json` 中的脚本命令

### 任务 2.4：文档生成
- [ ] 安装文档工具：`npm install --save-dev typedoc`
- [ ] 创建 `typedoc.json` 配置
- [ ] 添加文档生成脚本
- [ ] 创建示例代码文档
- [ ] 设置自动化文档构建

## 第三阶段：高级功能 ⏳

### 任务 3.1：插件系统
- [ ] 设计插件 API 接口
- [ ] 创建插件加载器
- [ ] 实现插件注册机制
- [ ] 添加插件热重载
- [ ] 创建插件开发模板

### 任务 3.2：TUI 界面
- [ ] 评估 TUI 框架选项
- [ ] 设计界面布局
- [ ] 实现多窗格界面
- [ ] 添加代码编辑器集成
- [ ] 实现快捷键系统

### 任务 3.3：性能监控
- [ ] 添加性能指标收集
- [ ] 创建性能仪表板
- [ ] 实现资源监控
- [ ] 添加告警机制
- [ ] 创建性能报告

### 任务 3.4：安全增强
- [ ] 实现命令执行沙箱
- [ ] 添加会话隔离
- [ ] 创建访问控制列表
- [ ] 实现审计日志
- [ ] 添加安全扫描

## 验证和测试 ✅

### 编译验证
- [ ] `npm run build` 成功
- [ ] 无 TypeScript 编译错误
- [ ] 所有导入路径正确

### 功能验证
- [ ] `npm run dev` 正常启动
- [ ] 基本工具功能正常
- [ ] Skills 加载正常
- [ ] 任务系统工作正常

### 测试验证
- [ ] `npm test` 所有测试通过
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] 端到端测试通过

### 文档验证
- [ ] README 更新完成
- [ ] API 文档生成成功
- [ ] 所有链接有效
- [ ] 示例代码可运行

## 回滚检查点 📍

### 检查点 1：目录创建后
- [ ] Git 提交：`feat: create new directory structure`
- [ ] 验证：目录结构创建完成

### 检查点 2：Python 示例移动后
- [ ] Git 提交：`feat: move python examples to examples/ directory`
- [ ] 验证：所有 Python 脚本可运行

### 检查点 3：文档整理后
- [ ] Git 提交：`feat: reorganize documentation`
- [ ] 验证：文档链接正常

### 检查点 4：源代码重构后
- [ ] Git 提交：`feat: refactor src/ directory structure`
- [ ] 验证：项目编译通过

### 检查点 5：测试体系建立后
- [ ] Git 提交：`feat: add testing framework`
- [ ] 验证：所有测试通过

## 依赖更新 📦

### 开发依赖
- [ ] 更新 TypeScript 配置
- [ ] 更新构建工具配置
- [ ] 更新测试框架配置
- [ ] 更新代码检查配置

### 运行时依赖
- [ ] 检查所有依赖版本
- [ ] 更新过时的依赖
- [ ] 添加缺失的依赖
- [ ] 移除未使用的依赖

## 代码质量检查 🔍

### 代码规范
- [ ] 统一的代码风格
- [ ] 一致的命名约定
- [ ] 适当的注释和文档
- [ ] 错误处理完善

### 性能优化
- [ ] 无内存泄漏
- [ ] 合理的资源使用
- [ ] 优化的算法复杂度
- [ ] 适当的缓存策略

### 安全性
- [ ] 输入验证
- [ ] 输出编码
- [ ] 错误信息处理
- [ ] 访问控制

## 完成标准 🎯

### 必须完成
- [ ] 所有测试通过
- [ ] 编译无错误
- [ ] 功能完全正常
- [ ] 文档完整准确

### 应该完成
- [ ] 代码结构清晰
- [ ] 性能指标达标
- [ ] 安全审查通过
- [ ] 用户体验良好

### 可以完成
- [ ] 插件系统可用
- [ ] TUI 界面完善
- [ ] 监控系统运行
- [ ] 部署流程自动化

---
*最后更新：2026年3月16日*
*状态：规划阶段*
*预计开始时间：2026年3月18日*
*预计完成时间：2026年5月10日*
