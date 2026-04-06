# Sprint 1 Contract: F1 — Project Foundation & Electron Shell

## Feature
F1: Project Foundation & Electron Shell

## Scope

建立完整的 pnpm monorepo 工程骨架，包含三个 workspace 包和一个可启动的 Electron 空壳应用。

### Deliverables

1. **Root monorepo 配置**: pnpm-workspace.yaml, tsconfig.base.json, eslint.config.mjs, .gitignore
2. **packages/shared**: 共享类型定义（Article, Lookup, Card）
3. **packages/core**: SQLite 数据库层（连接管理 + 初始 schema，含 articles、lookups、cards 三表）
4. **packages/app**: Electron + React + Vite + Tailwind 应用壳
   - Main process: 窗口管理 + 数据库初始化
   - Preload: IPC 安全桥接
   - Renderer: React 空壳 UI（侧边栏 + 主内容区）
   - shadcn/ui 风格 CSS 变量系统 + Tailwind 配置

### Non-Scope
- 不实现任何业务功能（文章获取、阅读器、AI 调用等）
- 不安装 shadcn/ui CLI 或具体组件
- 不配置 electron-builder 打包
- 不写 CI/CD

## Test Criteria

| # | 标准 | 验证方法 |
|---|------|---------|
| T1 | `pnpm install` 零错误 | 运行命令 |
| T2 | `pnpm build` 零错误 | 运行 `pnpm -r build` |
| T3 | Electron 应用可启动 | `pnpm dev` 不崩溃，显示窗口 |
| T4 | SQLite 数据库自动创建，含 3 张表 | 检查 userData 目录 |
| T5 | shared 类型可在 app 和 core 中导入 | TypeScript 编译通过 |
| T6 | `pnpm lint` 通过 | 运行命令 |

## Technology Choices

- **Build**: electron-vite (Vite for renderer, esbuild for main/preload)
- **UI**: React 18 + Tailwind CSS 3 + shadcn/ui CSS variable pattern
- **DB**: better-sqlite3 (WAL mode)
- **Lint**: ESLint 9 flat config + typescript-eslint
