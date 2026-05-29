# PI-Coding-Agent 工具列表

## 查看方式

### 1. 本地文件查看

```bash
# 查看所有工具定义文件
ls node_modules/@earendil-works/pi-coding-agent/dist/core/tools/*.d.ts
```

### 2. 代码中查看

```typescript
import { codingTools } from "@earendil-works/pi-coding-agent";
console.log(codingTools);
```

## 完整工具列表

### 📝 文件操作工具

#### 1. read - 读取文件
```typescript
{
  name: "read",
  description: "读取文件内容",
  parameters: {
    path: string,        // 文件路径
    offset?: number,     // 起始行（可选）
    limit?: number       // 读取行数（可选）
  }
}
```

**用途**: 读取文件内容，支持分页读取大文件

#### 2. write - 写入文件
```typescript
{
  name: "write",
  description: "写入文件",
  parameters: {
    path: string,        // 文件路径
    content: string      // 文件内容
  }
}
```

**用途**: 创建新文件或覆盖现有文件

#### 3. edit - 编辑文件
```typescript
{
  name: "edit",
  description: "精确编辑文件",
  parameters: {
    path: string,        // 文件路径
    old_str: string,     // 要替换的文本
    new_str: string      // 新文本
  }
}
```

**用途**: 精确替换文件中的文本，比 sed 更可靠

### 🔍 搜索工具

#### 4. grep - 搜索内容
```typescript
{
  name: "grep",
  description: "搜索文件内容",
  parameters: {
    pattern: string,     // 搜索模式（正则）
    path?: string,       // 搜索路径（可选）
    glob?: string        // 文件过滤（如 "*.ts"）
  }
}
```

**用途**: 在文件中搜索文本，支持正则表达式

#### 5. find - 查找文件
```typescript
{
  name: "find",
  description: "按名称查找文件",
  parameters: {
    pattern: string,     // 文件名模式
    path?: string        // 搜索路径（可选）
  }
}
```

**用途**: 按文件名查找文件

#### 6. ls - 列出目录
```typescript
{
  name: "ls",
  description: "列出目录内容",
  parameters: {
    path?: string        // 目录路径（可选，默认当前目录）
  }
}
```

**用途**: 列出目录中的文件和子目录

### ⚙️ 命令执行工具

#### 7. bash - 执行命令
```typescript
{
  name: "bash",
  description: "执行 shell 命令",
  parameters: {
    command: string,     // 要执行的命令
    timeout?: number     // 超时时间（毫秒，可选）
  }
}
```

**用途**: 执行任意 bash 命令

## 工具使用优先级

AI 会根据任务自动选择最合适的工具：

| 任务 | 推荐工具 | 备选工具 |
|------|---------|---------|
| 读取文件 | `read` | `bash cat` |
| 写入文件 | `write` | `bash echo` |
| 修改文件 | `edit` | `bash sed` |
| 搜索内容 | `grep` | `bash grep` |
| 查找文件 | `find` | `bash find` |
| 列出目录 | `ls` | `bash ls` |
| 其他命令 | `bash` | - |

## 在代码中查看

### 方式 1: 查看工具定义文件

```bash
# 查看 read 工具
cat node_modules/@earendil-works/pi-coding-agent/dist/core/tools/read.d.ts

# 查看 bash 工具
cat node_modules/@earendil-works/pi-coding-agent/dist/core/tools/bash.d.ts
```

### 方式 2: 查看工具导出

```typescript
import {
  createReadTool,
  createWriteTool,
  createEditTool,
  createBashTool,
  createGrepTool,
  createFindTool,
  createLsTool
} from "@earendil-works/pi-coding-agent";
```

### 方式 3: 查看默认工具集

```typescript
import { codingTools } from "@earendil-works/pi-coding-agent";

// codingTools 包含：
// - read
// - bash
// - edit
// - write
```

## 总结

pi-coding-agent 提供 **7 个核心工具**：

1. ✅ **read** - 读取文件
2. ✅ **write** - 写入文件
3. ✅ **edit** - 编辑文件
4. ✅ **grep** - 搜索内容
5. ✅ **find** - 查找文件
6. ✅ **ls** - 列出目录
7. ✅ **bash** - 执行命令

这些工具覆盖了编程助手的所有基本需求！
