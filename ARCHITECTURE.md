# Architecture

## 当前状态

Thinklish 是一个基于 Electron 的桌面应用，采用 pnpm monorepo 架构，面向英语学习者提供沉浸式阅读和深度理解体验。

## 技术栈

- **Runtime**: Electron 40 + Node.js 24
- **Frontend**: React 18 + TypeScript 5 + Tailwind CSS 3
- **Build**: Turborepo + electron-vite 5 (Vite for renderer, SWC for main/preload)
- **Database**: SQLite (better-sqlite3 v12, WAL mode)
- **AI**: ACP (Agent Client Protocol) — 通过 `@agentclientprotocol/sdk` 与 Claude Code / Codex CLI 适配器通信
- **Lint**: ESLint 9 flat config + typescript-eslint

## 包结构

```text
packages/
  shared/     共享类型定义 (Article, Lookup, Card)
  core/       核心业务逻辑 (SQLite CRUD, 卡片生成, 导出)
  app/        Electron 应用
    src/
      main/         主进程 (窗口管理, IPC, AI 调用, DB 初始化)
        ipc/        IPC handlers (articles, ai, lookups, cards)
        services/   服务层 (article-extractor, ai-provider)
      preload/      预加载脚本 (contextBridge IPC 桥接)
      renderer/     React 渲染进程
        src/
          components/   UI 组件
            reader/     阅读器 (ReaderView, ReaderToolbar, ReaderContent)
            ai/         AI 浮窗 (FloatingPanel)
          hooks/        自定义 Hooks (useSettings, useTextSelection)
          lib/          工具函数 (api, format, utils)
```

## 构建编排 (Turborepo)

`turbo.json` 定义了以下任务管线：

| 任务 | 依赖关系 | 缓存产物 | 说明 |
|------|----------|----------|------|
| `build` | `^build` (上游先构建) | shared/core 无产物; app → `out/**` | 增量构建，缓存未变更包 |
| `typecheck` | `^build` | 无 | 类型检查 |
| `lint` | 无 | 无 | 各包并行 lint |
| `dev` | `^build` | 不缓存, persistent | 启动 electron-vite dev |

缓存存储在 `.turbo/`（已 gitignore）。未变更包在第二次构建时命中缓存、跳过执行。

## 依赖方向

```
shared ← core ← app/main
shared ← app/renderer
```

- `shared` 无外部依赖，仅定义类型
- `core` 依赖 shared + better-sqlite3，纯业务逻辑
- `app/main` 依赖 core + shared，处理 Electron/IPC/网络副作用
- `app/renderer` 通过 IPC 与 main 通信，不直接访问 core 或 Node.js API

## Type System

> 详见 [`docs/references/typescript-monorepo.md`](docs/references/typescript-monorepo.md)

**类型分布原则:**
- `shared` 只放纯接口/类型别名，零运行时代码，零外部依赖
- `core` 消费 shared 类型，对外暴露纯业务函数签名，不泄漏 better-sqlite3 类型
- `app/renderer` 只消费 shared 类型，禁止导入 core 或 Node.js API

**双 tsconfig:** `packages/app` 拆分为 `tsconfig.node.json`（main/preload, Node 环境）和 `tsconfig.web.json`（renderer, DOM 环境），防止类型污染。

**IPC 类型桥接:** renderer 通过 `lib/api.ts` 中的 `as Promise<T>` 断言标注 IPC 返回类型。修改 IPC handler 时必须同步更新 api.ts 类型声明。

**验证:** `pnpm typecheck` 独立于 build，必须单独运行。electron-vite 使用 esbuild/SWC 编译，不做类型检查。

## IPC 通道

| 通道 | 方向 | 用途 |
|------|------|------|
| `articles:add` | renderer → main | URL 抓取 + 存储 |
| `articles:getAll` | renderer → main | 文章列表 |
| `articles:getById` | renderer → main | 单篇文章 |
| `ai:explain` | renderer → main | AI 解释选中文本 |
| `lookups:create` | renderer → main | 创建学习日志 |
| `lookups:getAll` | renderer → main | 日志列表 (支持筛选) |
| `lookups:updateStatus` | renderer → main | 更新掌握状态 |
| `cards:generateFromLookup` | renderer → main | 从日志生成 Anki 卡片 |
| `cards:getDue` | renderer → main | 获取待复习卡片 |
| `cards:review` | renderer → main | 提交复习结果 |
| `cards:exportTsv` | renderer → main | 导出 TSV 文件 |
| `sources:getGlobalPosture` | renderer → main | 全局 RSS 刷新节奏 |
| `sources:setGlobalPosture` | renderer → main | 设置全局刷新节奏并重启调度 |
| `sources:refreshAll` | renderer → main | 手动刷新全部订阅源 |
| `sources:refreshProgress` | main → renderer | 批量刷新进度（push） |

## 数据模型

```
articles (id, url, title, content, content_html, source_domain, published_at)
lookups  (id, article_id → articles, selected_text, context, lookup_type, ai_response, mastery_status)
cards    (id, lookup_id → lookups, front, back, tags, next_review_at, interval, repetitions, ease_factor)
```

## Harness 编排层 (Ralph Loop)

本仓库使用 sprint-based 三智能体 harness 架构：

- **Planner** (Opus): 需求 → 大蓝图 spec
- **Generator** (Sonnet): 逐个 pick feature → 提 sprint 合同 → 实现
- **Evaluator** (Opus): 审合同 → 硬阈值验收

状态通过文件交接写入 `docs/exec-plans/`。
