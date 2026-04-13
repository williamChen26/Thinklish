# Sprint 5 build log — F5 storage governance

## Summary

Implemented retention policy (three global knobs), retention cleanup with lookup protection, storage stats (imported vs manual approximate bytes), per-source bulk article delete with preview and typed confirmation, IPC wiring, and a **Library and storage** section on the Sources screen.

## Key files

| Area | Path |
|------|------|
| Types | `packages/shared/src/types/storage.ts`, `packages/shared/src/index.ts` |
| Core logic + tests | `packages/core/src/storage/retention.ts`, `retention.test.ts`, `packages/core/src/index.ts` |
| IPC | `packages/app/src/main/ipc/storage.ts`, `packages/app/src/main/ipc/sources.ts`, `packages/app/src/main/index.ts` |
| Renderer | `packages/app/src/renderer/src/lib/api.ts`, `format.ts`, `components/SourcesView.tsx` |
| Contract | `docs/exec-plans/active/2026-04-10-rss-subscription/sprints/sprint-5/contract.md` |

## Product semantics

- **Unread imported** for age rule: `source_id IS NOT NULL`, `is_stub = 1` (never opened in reader for full extraction).
- **Retention never removes** articles that have **any** `lookups` row (cards cascade from lookups).
- **Per-source / total caps** apply only to imported articles with no lookups; newest rows are kept when trimming.
- **Delete all articles from source**: `DELETE` all `articles` with that `source_id` (CASCADE removes lookups/cards). Source row remains unless user deletes the source separately.

## Verification

- `pnpm typecheck` — pass
- `pnpm --filter @thinklish/core test` — pass (48 tests)

## Follow-ups (optional)

- Auto-run retention on a timer (not in sprint contract).
- Persist per-source retention overrides.
