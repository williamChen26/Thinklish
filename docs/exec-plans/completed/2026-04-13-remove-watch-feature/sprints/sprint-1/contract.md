# Sprint 1 Contract: Remove Watch Feature (F1 + F2)

## Scope

全栈移除 Watch listing page 功能，包括类型定义、后端逻辑、数据库结构、IPC 通道和前端 UI。

## Deliverables

### 1. Delete entire files (4 files)
- `packages/core/src/ingestion/watch-fetcher.ts`
- `packages/core/src/ingestion/watch-fetcher.test.ts`
- `packages/core/src/ingestion/watch-url-store.ts`
- `packages/app/src/main/ipc/candidates.ts`

### 2. Shared types cleanup
- `ingestion-source.ts`: `IngestionSourceType = 'feed'` (remove `'watch'`); remove `watchBaselineComplete`
- `article.ts`: remove `candidateStatus` from `Article` and `ArticleCreateInput`
- `feed-scheduler-logic.ts`: `sourceType` to `'feed'` only

### 3. Core layer cleanup
- `schema.ts`: remove watch columns/tables/migrations; add cleanup migration for existing DBs
- `sources/repository.ts`: remove `watchBaselineComplete` mapping, `setWatchBaselineComplete`
- `articles/repository.ts`: remove candidate functions and `markWatchUrlDismissed` import
- `index.ts`: remove watch/candidate exports
- `feed-discovery.ts`: remove `isLikelySiteOrArticleUrl`
- `feed-discovery.test.ts`: remove `isLikelySiteOrArticleUrl` tests
- `storage/retention.ts`: remove candidate exclusion clause
- `storage/retention.test.ts`: remove candidate retention test
- `sources/repository.test.ts`: remove watch-related test cases
- `feed-scheduler-logic.test.ts`: remove watch scheduling test cases

### 4. App layer cleanup
- `main/index.ts`: remove `registerCandidateHandlers`
- `main/ipc/sources.ts`: remove `refreshWatch` handler; restrict `sourceType` to `'feed'`
- `main/ipc/feeds.ts`: remove `suggestWatch` and `isLikelySiteOrArticleUrl`
- `main/services/feed-scheduler.ts`: remove `refreshWatch` paths
- `renderer/src/lib/api.ts`: remove `candidatesAPI`, `refreshWatch`, `suggestWatch`
- `renderer/src/App.tsx`: remove `prefillWatchUrl` state
- `renderer/src/components/ArticlesView.tsx`: remove watch suggestion, candidate badges
- `renderer/src/components/SourcesView.tsx`: remove watch type, candidates panel, watch refresh

## Acceptance Criteria

- AC-1: 4 个文件被完全删除
- AC-2: `IngestionSourceType` 仅为 `'feed'`
- AC-3: `Article` 无 `candidateStatus` 字段
- AC-4: 无 `candidates:*` IPC 通道
- AC-5: Feed discovery 不再提示 "Watch this site"
- AC-6: 已有 DB 中 watch 数据在启动时被清理
- AC-7: `pnpm typecheck` 全量通过
- AC-8: `pnpm --filter @thinklish/core test` 全量通过
- AC-9: Feed 订阅和手动粘贴 URL 功能不受影响

## Dependencies

无。纯减法操作。

## Risks

- SQLite 不支持 DROP COLUMN，多余列保留但不再使用
- 需确保 retention 逻辑移除 candidate 排除后不会误删正常文章
