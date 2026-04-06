# Sprint 2 Build Log: F2 — Article Acquisition Pipeline

## Status: PASSED

## Created/Modified Files

### packages/core
- NEW: `src/articles/repository.ts` — createArticle, getAllArticles, getArticleById, deleteArticle
- MODIFIED: `src/index.ts` — re-export article repository
- MODIFIED: `package.json` — added @thinklish/shared dependency
- MODIFIED: `tsconfig.json` — added path aliases for shared

### packages/app
- NEW: `src/main/services/article-extractor.ts` — fetch URL + Readability extraction + fallback
- NEW: `src/main/ipc/articles.ts` — 5 IPC handlers (add, addManual, getAll, getById, delete)
- MODIFIED: `src/main/index.ts` — registerArticleHandlers()
- NEW: `src/renderer/src/lib/api.ts` — typed IPC wrapper for renderer
- NEW: `src/renderer/src/lib/format.ts` — formatRelativeTime, truncate
- NEW: `src/renderer/src/components/Sidebar.tsx` — extracted sidebar with review badge
- NEW: `src/renderer/src/components/ArticlesView.tsx` — URL input + article list + manual fallback
- MODIFIED: `src/renderer/src/App.tsx` — navigation routing with article selection

### Dependencies Added
- `@mozilla/readability` ^0.6.0
- `jsdom` ^29.0.1
- `@types/jsdom` ^28.0.1 (dev)

## Verification
- `pnpm -r build`: PASS (shared, core, app all build)
- `pnpm lint`: PASS (zero errors)
- Main bundle: 7.51 kB (up from 3.72 kB — article extractor + IPC)
- Renderer bundle: 298 kB
