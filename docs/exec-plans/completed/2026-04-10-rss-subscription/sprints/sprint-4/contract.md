# Sprint 4 contract — F6: Integrated UX

**Run:** `2026-04-10-rss-subscription`  
**Scope:** Coexistence of paste-URL and subscription flows, visible sync health, discoverability of imported articles, learning-focused copy.

## In scope

1. **Navigation** — Sidebar (or equivalent) surfaces **Paste article URL** and **Sources** as sibling primary entry points, not nested or hidden.
2. **Articles** — Filter by ingestion source (including “pasted / no source”); **Recent imports** mode for feed-backed articles; source badge remains visible; optional sort remains newest-first for imports discoverability.
3. **Sources** — Per-source **detail** (expand row or panel): **last success**, **last error** with **plain-language remediation** (no raw stack traces in UI); **next scheduled / eligible** time or human-readable schedule (manual / watch / backoff-aware estimate using shared scheduler math).
4. **Empty states** — Articles and sources empty copy ties **steady reading habit** and **material quality** to subscriptions; not “news reader” framing.
5. **Shared utilities** — Pure `getNextDueTime` / scheduler helpers available to renderer via `@thinklish/shared`; optional `remediateIngestionError` in shared for reuse + unit tests from `@thinklish/core`.

## Out of scope

- F4 watch polling, F5 retention, F7 discovery.
- Changing scheduler fairness algorithm (only exposing existing semantics in UI).

## Acceptance mapping (spec F6)

| AC | Verification |
|----|----------------|
| AC1 Paste + add source prominent | Sidebar quick-add + Articles header link to sources |
| AC2 Last success / error / next attempt | Source detail row: timestamps + next-eligible line |
| AC3 Errors + remediation, no stacks | Remediation helper strips `at ` stack lines; structured hints |
| AC4 Discover imports | Source filter + “Recent imports” toggle |
| AC5 Onboarding copy | Updated empty states |

## Definition of done

- `pnpm typecheck` passes.
- `pnpm --filter @thinklish/core test` passes.
- `build-log.md` updated for this sprint.
