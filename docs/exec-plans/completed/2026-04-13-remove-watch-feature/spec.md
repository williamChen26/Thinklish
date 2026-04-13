# Spec: Remove Watch Listing Page Feature

## Background

`2026-04-10-rss-subscription` 运行中实现了 7 个功能，其中 Sprint 6 (F4: Synthetic/virtual feed) 和 Sprint 7 (F7: Feed discovery — watch fallback 部分) 实现了"监听无 RSS 网站"的能力。

经过产品评估，该功能在当前阶段价值偏低：
- 启发式链接发现可靠性不高（依赖路径模式匹配，无法处理 SPA / 非标准 URL）
- Candidate 审核流程增加用户心智负担，操作量接近手动粘贴 URL
- 适用面窄（2026 年绝大多数持续更新的英文内容站都有 RSS）
- 代码复杂度高，增加理解和维护成本

## Goal

移除 Watch listing page 功能的所有代码、数据结构和交互逻辑，降低仓库复杂度。保留 Feed discovery 的 RSS/Atom 发现核心能力（`discoverFeeds`、`extractAlternateFeedsFromHtml`）。

## Non-Goals

- 不添加任何新功能
- 不重构保留的 Feed/RSS 功能（只做精准移除）
- 不修改 UI 设计语言或样式

## Features

### F1: Remove watch backend — types, core logic, data stores (P0)

移除 watch 相关的类型定义、核心逻辑、数据存储层。

**涉及删除的文件（整文件删除）：**
- `packages/core/src/ingestion/watch-fetcher.ts`
- `packages/core/src/ingestion/watch-fetcher.test.ts`
- `packages/core/src/ingestion/watch-url-store.ts`

**涉及修改的文件（精准移除）：**
- `packages/shared/src/types/ingestion-source.ts` — `IngestionSourceType` 改为仅 `'feed'`；移除 `watchBaselineComplete` 字段
- `packages/shared/src/types/article.ts` — 移除 `candidateStatus` 字段和 `ArticleCreateInput.candidateStatus`
- `packages/shared/src/feed-scheduler-logic.ts` — `sourceType` 改为仅 `'feed'`
- `packages/core/src/database/schema.ts` — 移除 `watch_baseline_complete` 列、`ingestion_candidate_status` 列、`watch_seen_urls` / `watch_dismissed_urls` 表及其迁移函数；`source_type` CHECK 约束改为仅 `'feed'`；添加数据迁移（删除已有 watch sources 和 candidate articles）
- `packages/core/src/sources/repository.ts` — 移除 `watchBaselineComplete` 映射和 `setWatchBaselineComplete` 函数
- `packages/core/src/articles/repository.ts` — 移除 `candidateStatus` 映射、`listCandidateArticles`、`acceptWatchCandidateArticle`、`dismissWatchCandidateArticle`；移除 `markWatchUrlDismissed` import
- `packages/core/src/index.ts` — 移除 watch/candidate 相关 exports
- `packages/core/src/ingestion/feed-discovery.ts` — 移除 `isLikelySiteOrArticleUrl` 函数
- `packages/core/src/storage/retention.ts` — 移除 candidate 排除逻辑

**AC:**
- AC-1: `IngestionSourceType` 仅为 `'feed'`，无 `'watch'` 选项
- AC-2: `Article` 接口无 `candidateStatus` 字段
- AC-3: 数据库 schema 不包含 `watch_seen_urls`、`watch_dismissed_urls` 表
- AC-4: 已有数据库中的 watch sources 和 candidate articles 在 `createTables` 时被清理
- AC-5: `pnpm typecheck` 全量通过
- AC-6: `pnpm --filter @thinklish/core test` 全量通过（删除/修改 watch 相关 test）

### F2: Remove watch frontend — IPC, scheduler, UI (P0)

移除 watch 相关的 IPC 通道、调度器逻辑和 UI 组件。

**涉及删除的文件：**
- `packages/app/src/main/ipc/candidates.ts`

**涉及修改的文件：**
- `packages/app/src/main/index.ts` — 移除 `registerCandidateHandlers` import 和调用
- `packages/app/src/main/ipc/sources.ts` — 移除 `sources:refreshWatch` handler；`isCreateInput` 仅允许 `sourceType: 'feed'`
- `packages/app/src/main/ipc/feeds.ts` — 移除 `suggestWatch` 和 `isLikelySiteOrArticleUrl` import
- `packages/app/src/main/services/feed-scheduler.ts` — 移除 `refreshWatch` import 和 watch 分支
- `packages/app/src/renderer/src/lib/api.ts` — 移除 `candidatesAPI`、`sourcesAPI.refreshWatch`、`FeedDiscoverResponse.suggestWatch`
- `packages/app/src/renderer/src/App.tsx` — 移除 `prefillWatchUrl` state 和相关 prop 传递
- `packages/app/src/renderer/src/components/ArticlesView.tsx` — 移除 `onOpenSourcesForWatch`、watch suggestion strip、candidate badge
- `packages/app/src/renderer/src/components/SourcesView.tsx` — 移除 watch type 选项、candidate panel、`handleRefreshWatch`、prefill watch 逻辑

**AC:**
- AC-1: 无 `candidates:*` IPC 通道注册
- AC-2: 添加 source 时只能选择 `feed` 类型
- AC-3: Feed discovery 发现 RSS 时正常提示添加，未发现时**不再**提示 "Watch this site"
- AC-4: SourcesView 中无 "Watch candidates" 面板
- AC-5: `pnpm typecheck` 全量通过
- AC-6: App 正常启动，Feed 订阅和手动粘贴 URL 功能不受影响

## Sprint Order

1. Sprint 1: F1 + F2 合并执行（移除是原子操作，跨层耦合必须同步进行）

## Risks

- **数据库迁移**：已有用户的 DB 中可能有 watch sources 和 candidate articles，需要在 `createTables` 中安全清理
- **SQLite 限制**：SQLite 不支持 `DROP COLUMN`（3.35+ 支持但不依赖），多余列保留但不再使用
- **遗漏引用**：watch 代码分布广泛，需确保所有引用都被移除

## Performance Impact

正向：移除 watch 类型后，scheduler 只处理 feed 类型 sources，减少不必要的类型判断和分支。
