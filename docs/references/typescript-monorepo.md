# TypeScript Monorepo 类型架构

- 创建日期: 2026-04-06
- 适用: 所有涉及代码生成与验收的 Agent（Generator、Evaluator）
- 关联: [`ARCHITECTURE.md`](../../ARCHITECTURE.md) 的 Type System 段

## 类型流向

```
shared (纯类型定义)
  ├── core (业务逻辑 + better-sqlite3)
  │     └── app/main (Electron 主进程, IPC handlers)
  └── app/renderer (React UI, 通过 IPC 间接消费 core)
```

**核心规则:**
- `shared` 只放接口和类型别名，零运行时代码，零外部依赖
- `core` 消费 shared 类型 + better-sqlite3，对外暴露纯业务函数签名，不暴露 better-sqlite3 类型
- `app/main` 消费 core + shared，处理 Electron/IPC/网络副作用
- `app/renderer` 只消费 shared 类型，通过 IPC 与 main 通信，禁止导入 core 或 Node.js API

## 双 tsconfig 机制

`packages/app` 使用两份独立的 tsconfig，各自覆盖不同的运行环境：

| tsconfig | 覆盖目录 | lib | path alias | 用途 |
|----------|---------|-----|------------|------|
| `tsconfig.node.json` | `src/main/**`, `src/preload/**`, `electron.vite.config.ts` | ES2022 | `@english-studio/core`, `@english-studio/shared` | Node.js 运行环境 |
| `tsconfig.web.json` | `src/renderer/src/**` | ES2022, DOM, DOM.Iterable | `@renderer/*`, `@english-studio/shared` | 浏览器运行环境 |

**为什么拆分:** main 进程运行在 Node.js 中，可用 Node API 但无 DOM；renderer 运行在 Chromium 中，有 DOM 但无 Node API。混用会导致类型污染（如 renderer 中出现 `Buffer` 类型，或 main 中出现 `HTMLElement`）。

**验证命令:**
- `pnpm typecheck:node` — 只检查 main/preload
- `pnpm typecheck:web` — 只检查 renderer
- `pnpm typecheck` — 两者都跑（`typecheck:node && typecheck:web`）

## Path Alias 一览

| Alias | 定义位置 | 解析目标 |
|-------|---------|---------|
| `@english-studio/shared` | `tsconfig.node.json`, `tsconfig.web.json`, `core/tsconfig.json` | `../shared/src` |
| `@english-studio/shared/*` | 同上 | `../shared/src/*` |
| `@english-studio/core` | `tsconfig.node.json` | `../core/src` |
| `@english-studio/core/*` | `tsconfig.node.json` | `../core/src/*` |
| `@renderer/*` | `tsconfig.web.json` | `./src/renderer/src/*` |

**注意:** renderer 侧没有 `@english-studio/core` 别名——这是刻意的，防止 renderer 直接导入 core。

## IPC 类型桥接模式

Electron 的 IPC 机制天然是无类型的（`ipcRenderer.invoke` 返回 `Promise<unknown>`）。当前采用三层桥接：

```
preload/index.ts          ← 实现: contextBridge.exposeInMainWorld('electron', electronAPI)
preload/index.d.ts        ← 声明: ElectronAPI 接口 (invoke, on)
renderer/src/env.d.ts     ← 声明: Window.electron 类型扩展
renderer/src/lib/api.ts   ← 消费: 用 as Promise<T> 断言 IPC 返回类型
```

**当前局限:** `api.ts` 中的 `as Promise<T>` 是类型断言（trust me），编译器无法验证 main 端 handler 的返回值是否真的匹配 `T`。这意味着：
- main 端 handler 返回结构变了但 renderer 端没改 → 编译通过但运行时崩溃
- 新增 IPC 通道时必须同时更新 main handler + api.ts 类型声明

**变更协议:** 修改 IPC 相关代码时，必须同时检查：
1. `src/main/ipc/*.ts` 中 handler 的返回类型
2. `src/renderer/src/lib/api.ts` 中对应方法的类型断言
3. 两者是否一致

## 类型变更工作流

新增或修改类型时，按以下顺序操作：

1. **修改 shared 类型** → `packages/shared/src/types/*.ts`
2. **更新 shared 导出** → `packages/shared/src/index.ts`（新类型必须 re-export）
3. **更新 core 消费方** → `packages/core/src/**/*.ts`
4. **更新 main 消费方** → `packages/app/src/main/**/*.ts`
5. **更新 renderer 消费方** → `packages/app/src/renderer/src/**/*.ts`
6. **运行 `pnpm typecheck`** — 确认全链路类型正确

跳过第 2 步是最常见的遗漏——新增类型但忘记从 `shared/src/index.ts` re-export。

## 常见错误模式

### E1: 新增类型忘记 re-export

```typescript
// shared/src/types/settings.ts
export interface Settings { ... }

// shared/src/index.ts — 忘记加这行
export type { Settings } from './types/settings';

// 消费方报错: Module '"@english-studio/shared"' has no exported member 'Settings'
```

**修复:** 每次新增类型文件后，必须更新 `shared/src/index.ts`。

### E2: renderer 中误用 Node.js 类型

```typescript
// renderer 中使用了 Buffer — tsconfig.web.json 没有 node lib
const buf: Buffer = ... // Error: Cannot find name 'Buffer'
```

**修复:** renderer 侧不应使用 Node.js 类型。如需二进制处理，使用 `Uint8Array`。

### E3: electron-vite build 通过但 typecheck 失败

electron-vite 使用 esbuild (main) 和 SWC (renderer) 编译，两者都**只做转译不做类型检查**。这意味着 `pnpm -r build` 通过不等于类型正确。

**必须:** 始终用 `pnpm typecheck` 独立验证，不能只依赖 build。

### E4: IPC 返回类型漂移

```typescript
// main/ipc/articles.ts — 返回 { success: true, article, isNew: true }
// api.ts — 类型声明为 { success: true, article: Article }
// isNew 字段丢失，但编译通过（因为是 as 断言）
```

**修复:** 修改 IPC handler 返回值时，必须同步更新 `api.ts` 中的类型声明。

### E5: strict mode 下未处理的 null/undefined

```typescript
// tsconfig.base.json 启用了 strict: true（含 strictNullChecks）
const article = await getArticleById(id); // Article | null
article.title; // Error: Object is possibly 'null'
```

**修复:** 始终处理 null case，使用 early return 或 nullish coalescing。

## 验证检查清单

Agent 在提交 build-log 前必须确认：

- [ ] `pnpm typecheck:node` 通过（零错误）
- [ ] `pnpm typecheck:web` 通过（零错误）
- [ ] 新增类型已从 `shared/src/index.ts` re-export
- [ ] IPC 变更已同步更新 main handler + renderer api.ts
- [ ] 无 `@ts-ignore` 或 `@ts-expect-error`（除非有文档化的理由）
- [ ] 无 `any` 类型（除非有文档化的理由）
