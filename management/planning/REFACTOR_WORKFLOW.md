# 项目重构工作流

## Git 分支策略

### 主分支结构
```
main (稳定版)
  │
  ├── develop (开发版)
  │     │
  │     ├── feature/refactor-phase1 (第一阶段重构)
  │     │     │
  │     │     ├── feature/refactor-directories (目录重构)
  │     │     ├── feature/refactor-examples (示例重构)
  │     │     └── feature/refactor-docs (文档重构)
  │     │
  │     ├── feature/refactor-phase2 (第二阶段重构)
  │     │     │
  │     │     ├── feature/testing-framework (测试框架)
  │     │     ├── feature/config-system (配置系统)
  │     │     └── feature/build-scripts (构建脚本)
  │     │
  │     └── feature/refactor-phase3 (第三阶段重构)
  │           │
  │           ├── feature/plugin-system (插件系统)
  │           ├── feature/tui-enhancement (TUI增强)
  │           └── feature/security-enhancement (安全增强)
  │
  └── hotfix/ (紧急修复)
```

### 分支命名约定
- `feature/` - 新功能开发
- `refactor/` - 代码重构
- `bugfix/` - bug 修复
- `hotfix/` - 紧急修复
- `release/` - 发布准备

## 重构工作流程

### 阶段 1：准备阶段
```bash
# 1. 从 develop 创建重构分支
git checkout develop
git pull origin develop
git checkout -b feature/refactor-phase1

# 2. 创建子任务分支
git checkout -b feature/refactor-directories
```

### 阶段 2：实施阶段
```bash
# 1. 实施一个子任务
# 例如：创建目录结构
mkdir -p examples/python docs/{api,guides,architecture}

# 2. 提交更改
git add .
git commit -m "feat: create new directory structure"

# 3. 合并回阶段分支
git checkout feature/refactor-phase1
git merge --no-ff feature/refactor-directories
git branch -d feature/refactor-directories
```

### 阶段 3：测试阶段
```bash
# 1. 运行测试
npm test

# 2. 编译检查
npm run build

# 3. 功能验证
npm run dev
```

### 阶段 4：合并阶段
```bash
# 1. 更新 develop 分支
git checkout develop
git pull origin develop

# 2. 合并重构分支
git merge --no-ff feature/refactor-phase1

# 3. 解决冲突（如果有）
# 4. 运行完整测试套件
npm run test:all

# 5. 推送到远程
git push origin develop
```

## 每日工作流程

### 早上（9:00-10:00）
1. **同步代码**
   ```bash
   git checkout feature/refactor-phase1
   git pull origin develop
   ```
2. **查看任务清单**
   ```bash
   # 查看今天的任务
   cat REFACTOR_CHECKLIST.md | grep -A5 "今天计划"
   ```
3. **创建当日工作分支**
   ```bash
   git checkout -b feature/refactor-$(date +%Y%m%d)
   ```

### 上午工作（10:00-12:00）
1. **实施一个具体任务**
   - 例如：移动 Python 示例文件
   - 确保每个更改都有测试
   
2. **提交更改**
   ```bash
   git add .
   git commit -m "feat: move python examples to examples/ directory"
   ```

### 中午检查（12:00-13:00）
1. **运行测试**
   ```bash
   npm test
   ```
2. **编译检查**
   ```bash
   npm run build
   ```
3. **代码审查**
   - 检查代码风格
   - 验证功能正常

### 下午工作（13:00-17:00）
1. **继续实施任务**
2. **编写测试**
3. **更新文档**

### 下班前（17:00-18:00）
1. **合并当日工作**
   ```bash
   git checkout feature/refactor-phase1
   git merge --no-ff feature/refactor-$(date +%Y%m%d)
   git branch -d feature/refactor-$(date +%Y%m%d)
   ```
2. **运行完整测试**
   ```bash
   npm run test:all
   ```
3. **更新任务清单**
   ```bash
   # 标记完成的任务
   sed -i '' 's/\[ \]/[x]/g' REFACTOR_CHECKLIST.md
   ```
4. **准备明日计划**
   ```bash
   # 查看明日任务
   cat REFACTOR_CHECKLIST.md | grep -B2 -A2 "明天计划"
   ```

## 代码审查流程

### 提交前检查
1. **代码风格**
   ```bash
   npm run lint
   ```
2. **类型检查**
   ```bash
   npx tsc --noEmit
   ```
3. **测试覆盖**
   ```bash
   npm test -- --coverage
   ```

### 审查清单
- [ ] 代码符合项目规范
- [ ] 有适当的测试覆盖
- [ ] 文档已更新
- [ ] 无安全漏洞
- [ ] 性能影响可接受

### 审查工具
```bash
# 1. 查看更改
git diff develop..feature/refactor-phase1

# 2. 查看提交历史
git log --oneline --graph develop..feature/refactor-phase1

# 3. 运行代码检查
npm run lint:strict
```

## 测试策略

### 单元测试
```typescript
// 每个重构的模块都需要单元测试
describe('AgentLoop', () => {
  test('should handle basic tool calls', async () => {
    // 测试代码
  });
});
```

### 集成测试
```typescript
// 测试模块间的集成
describe('Tool System Integration', () => {
  test('should work with agent loop', async () => {
    // 集成测试代码
  });
});
```

### 端到端测试
```typescript
// 测试完整流程
describe('End-to-End Workflow', () => {
  test('should complete a coding task', async () => {
    // E2E 测试代码
  });
});
```

## 回滚流程

### 自动回滚
```bash
# 如果测试失败，自动回滚到上一个稳定提交
if ! npm test; then
  echo "Tests failed, rolling back..."
  git reset --hard HEAD~1
  exit 1
fi
```

### 手动回滚
```bash
# 1. 找到要回滚到的提交
git log --oneline -10

# 2. 创建回滚分支
git checkout -b rollback/$(date +%Y%m%d)

# 3. 回滚到指定提交
git reset --hard <commit-hash>

# 4. 强制推送（谨慎使用）
git push origin rollback/$(date +%Y%m%d) --force
```

## 沟通和协作

### 每日站会（9:30）
1. **昨天完成的工作**
2. **今天计划的工作**
3. **遇到的障碍**

### 每周评审（周五 16:00）
1. **进度回顾**
2. **问题讨论**
3. **下周计划**

### 文档更新
1. **每日更新**：任务清单状态
2. **每周更新**：进度报告
3. **阶段更新**：架构文档

## 工具和自动化

### 自动化脚本
```bash
#!/bin/bash
# scripts/refactor-helper.sh

# 1. 检查当前状态
check_status() {
  git status
  npm test
  npm run build
}

# 2. 创建重构分支
create_refactor_branch() {
  local phase=$1
  git checkout develop
  git pull origin develop
  git checkout -b "feature/refactor-phase$phase"
}

# 3. 运行完整测试套件
run_full_test() {
  npm run test:unit
  npm run test:integration
  npm run test:e2e
  npm run lint
  npx tsc --noEmit
}
```

### CI/CD 集成
```yaml
# .github/workflows/refactor.yml
name: Refactor CI

on:
  push:
    branches: [feature/refactor-*]
  pull_request:
    branches: [develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm run lint
```

## 风险管理

### 风险识别
1. **技术风险**：重构引入 bug
2. **时间风险**：进度延迟
3. **资源风险**：人员变动

### 缓解措施
1. **小步快跑**：每次只重构一小部分
2. **充分测试**：每个更改都有测试
3. **定期备份**：重要节点创建备份

### 应急计划
1. **技术问题**：回滚到上一个稳定版本
2. **时间问题**：调整范围或优先级
3. **资源问题**：重新分配任务或寻求帮助

## 成功指标

### 量化指标
1. **代码质量**：测试覆盖率 > 80%
2. **构建时间**：构建时间减少 20%
3. **性能指标**：启动时间 < 2秒
4. **bug 数量**：重构后 bug 减少 50%

### 定性指标
1. **开发者体验**：新功能开发时间减少
2. **代码可读性**：代码审查通过率提高
3. **维护成本**：bug 修复时间减少
4. **团队满意度**：开发者反馈积极

---
*工作流版本：v1.0*
*最后更新：2026年3月16日*
*下次评审：重构开始前*
