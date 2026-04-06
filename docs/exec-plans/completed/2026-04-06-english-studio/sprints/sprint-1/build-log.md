# Sprint 1 Build Log: F1 — Project Foundation & Electron Shell

## Status: PASSED

## Created Files

### Root
- `package.json` — workspace root, scripts, ESLint devDeps
- `pnpm-workspace.yaml` — packages/* workspace
- `tsconfig.base.json` — shared strict TypeScript config
- `eslint.config.mjs` — ESLint 9 flat config (JS recommended + TS recommended)
- `.gitignore` — updated for Electron/SQLite artifacts

### packages/shared (8 files)
- `package.json`, `tsconfig.json`
- `src/index.ts` — re-exports all types
- `src/types/article.ts` — Article, ArticleCreateInput
- `src/types/lookup.ts` — Lookup, LookupCreateInput, LookupType, MasteryStatus
- `src/types/card.ts` — Card, CardCreateInput

### packages/core (5 files)
- `package.json`, `tsconfig.json`
- `src/index.ts` — re-exports database functions
- `src/database/connection.ts` — initDatabase, getDatabase, closeDatabase (WAL mode)
- `src/database/schema.ts` — createTables (articles, lookups, cards + indexes)

### packages/app (16 files)
- `package.json`, `electron.vite.config.ts`
- `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`
- `tailwind.config.ts` — shadcn/ui CSS variable color system
- `postcss.config.js`
- `src/main/index.ts` — Electron main process, DB init, window management
- `src/preload/index.ts` + `index.d.ts` — IPC bridge with typed API
- `src/renderer/index.html`
- `src/renderer/src/main.tsx`, `App.tsx` — React shell with sidebar nav
- `src/renderer/src/assets/index.css` — Tailwind + shadcn/ui CSS variables (light/dark)
- `src/renderer/src/env.d.ts`, `lib/utils.ts` — cn() utility

## Verification Results

| Criterion | Result |
|-----------|--------|
| `pnpm install` | PASS (--ignore-scripts + electron-rebuild) |
| `pnpm -r build` | PASS (shared, core typecheck + app electron-vite build) |
| `pnpm lint` | PASS (zero errors) |
| SQLite schema | 3 tables (articles, lookups, cards) + 4 indexes |
| Shared types importable | PASS (TypeScript compilation successful) |

## Key Decisions

1. **No @electron-toolkit**: Wrote custom preload IPC bridge to minimize dependencies
2. **electron-rebuild**: Required for better-sqlite3 native module + Electron ABI compatibility
3. **shadcn/ui pattern**: CSS variables + Tailwind config ready, without shadcn/ui CLI dependency
4. **Alias-based monorepo**: electron-vite resolves workspace packages via path aliases, bundling TS source directly
