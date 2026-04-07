# Thinklish

Think in English — 面向中文母语者的沉浸式英语阅读与深度理解桌面应用。

Thinklish 的核心理念不是翻译，而是帮助用户像英语母语者一样**感知**语义、结构与用法模式。用户在阅读英文文章时，可以选中任意单词、短语或句子，获得基于"英语直觉"的理解辅助，并通过间隔重复巩固记忆。

## 功能概览

- **文章导入**：粘贴 URL，自动抓取并解析为干净的阅读视图
- **AI 查词**：选中文本即可获得直觉式英语理解（非机械翻译）
- **学习日志**：记录每一次查词，按掌握程度追踪进度
- **间隔复习**：从查词记录自动生成 Anki 风格卡片，支持导出 TSV

## 技术栈

| 层 | 技术 |
|---|------|
| Runtime | Electron 40 + Node.js |
| Frontend | React 18 + TypeScript 5 + Tailwind CSS 3 |
| Build | Turborepo + electron-vite 5 (Vite + SWC) |
| Database | SQLite (better-sqlite3, WAL mode) |
| AI | ACP (Agent Client Protocol) — Claude Code / Codex CLI 适配器 |

详见 [`ARCHITECTURE.md`](ARCHITECTURE.md)。

## 快速开始

### 前置要求

- Node.js >= 18
- [pnpm](https://pnpm.io/) 9.x（`corepack enable` 自动启用）
- [Claude CLI](https://docs.anthropic.com/en/docs/claude-cli) 已安装并登录（AI 功能依赖）

### 安装依赖

```bash
pnpm install
```

如果 `better-sqlite3` 编译失败（常见于 Electron 版本更新后），运行原生模块重编译：

```bash
pnpm rebuild
```

### 启动开发环境

```bash
pnpm dev
```

这会通过 Turborepo 按依赖顺序构建 `shared` → `core`，然后启动 electron-vite dev server（含 HMR）。

### 构建生产版本

```bash
pnpm build
```

产物输出到 `packages/app/out/`。

## 常用命令

| 命令 | 作用 |
|------|------|
| `pnpm dev` | 启动开发环境（Turborepo 编排） |
| `pnpm build` | 全量构建 |
| `pnpm typecheck` | 类型检查（独立于构建，必须单独运行） |
| `pnpm lint` | ESLint 检查所有包 |
| `pnpm rebuild` | 重编译 better-sqlite3 原生模块 |

## 调试

### 主进程调试

electron-vite dev 启动时主进程默认开启 inspect 端口。在 VSCode/Cursor 中：

1. 启动 `pnpm dev`
2. 打开 "Run and Debug" 面板
3. 选择 "Attach to Process" 连接 Node.js 调试端口（默认 `9229`）

或在终端通过 Chrome DevTools 调试：访问 `chrome://inspect`。

### 渲染进程调试

应用窗口中按 `Cmd+Option+I`（macOS）打开 Chromium DevTools，与浏览器调试体验一致。

### 数据库

SQLite 数据库存储在 Electron 的 `userData` 目录：

```
~/Library/Application Support/thinklish/thinklish.db    # macOS
```

可使用任何 SQLite 工具查看（如 DB Browser for SQLite、`sqlite3` CLI）。

### 类型检查

electron-vite 构建时仅做转译不做类型检查。build 通过不等于类型正确。务必运行：

```bash
pnpm typecheck
```

## 包结构

```
packages/
  shared/     共享类型定义 (Article, Lookup, Card)
  core/       核心业务逻辑 (SQLite CRUD, 卡片生成, 导出)
  app/        Electron 应用 (主进程 + 渲染进程)
```

依赖方向：`shared ← core ← app/main`，`shared ← app/renderer`。Renderer 通过 IPC 与 main 通信，不直接访问 core。

## 仓库导航

- [`ARCHITECTURE.md`](ARCHITECTURE.md)：顶层架构与技术约束
- [`AGENTS.md`](AGENTS.md)：智能体协作入口
- [`docs/`](docs/README.md)：知识库总索引（设计文档、产品规格、执行计划）
