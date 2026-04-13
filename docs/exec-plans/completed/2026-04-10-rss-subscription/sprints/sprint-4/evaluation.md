# Sprint 4 evaluation — F6: Integrated UX

**Run:** `2026-04-10-rss-subscription`  
**Rubric:** `sprints/sprint-4/contract.md` only (build log used for cross-check, not as acceptance source).  
**Verdict:** **PASS**

## Hard thresholds

| Gate | Required | Evidence | Result |
|------|------------|----------|--------|
| Typecheck | `pnpm typecheck` passes | Executed 2026-04-13: turbo typecheck all packages, exit 0 | **PASS** |
| Core tests | `pnpm --filter @thinklish/core test` passes | Executed 2026-04-13: 5 files, **42** tests, exit 0 | **PASS** |
| Build log | `build-log.md` present for sprint | `sprints/sprint-4/build-log.md` exists, dated, references contract | **PASS** |

## Contract scope vs implementation

### 1. Navigation — paste vs sources as sibling primary entry points

**Contract:** Sidebar (or equivalent) surfaces **Paste article URL** and **Sources** as sibling primary entry points, not nested or hidden.

**Evidence:** `Sidebar.tsx` adds an “Add reading” block with two peer buttons: “Paste article URL” → `articles`, “Sources & feeds” → `sources` (same visual level, not nested under a single parent action).

```32:59:packages/app/src/renderer/src/components/Sidebar.tsx
      <div className="px-3 pb-2 space-y-2 border-b border-border/60">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Add reading</p>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onNavChange('articles')}
            ...
          >
            Paste article URL
          </button>
          <button
            type="button"
            onClick={() => onNavChange('sources')}
            ...
          >
            Sources & feeds
          </button>
        </div>
      </div>
```

**AC1 (contract table):** Articles header includes a **Sources & feeds** control (`ArticlesView.tsx` ~136–142) satisfying “Articles header link to sources” together with sidebar quick-add.

**Result:** **PASS**

### 2. Articles — filters, recent imports, badges, discoverability

**Contract:** Filter by ingestion source (including pasted / no source); **Recent imports** mode; source badge remains visible; optional newest-first for imports (repository ordering acceptable if not duplicated in UI).

**Evidence:**

- Source filter + pasted option: `ArticlesView.tsx` `parseSourceFilter`, `visibleArticles` memo (filters `sourceId === null` for pasted, numeric id for a source), and `<select>` options “All articles” / “Pasted / manual only” / per-source (`~51–62`, `~215–240`).
- Recent imports: checkbox “Recent imports (from feeds)” filters `sourceId !== null` (`~51–55`, `~242–250`); mutually exclusive with pasted filter via `onToggleRecentImports` (`~118–123`).
- Badges: “From feed” when `article.sourceId !== null`; `sourceLabel` badge when present (`~311–321`).
- Newest-first: `getAllArticles()` in core uses `ORDER BY datetime(a.created_at) DESC, a.id DESC` (`packages/core/src/articles/repository.ts` ~81–85), so the rendered list inherits newest-first without extra UI sort control — aligns with contract’s **optional** sort for discoverability.

**Result:** **PASS**

### 3. Sources — detail: last success, last error + remediation, next schedule

**Contract:** Expandable detail with **last success**, **last error** with plain-language remediation (no raw stacks in default UI), **next scheduled / eligible** using shared scheduler math.

**Evidence:**

- Expandable row: `expandedId` toggles `Detail` / `Hide detail`; detail `<tr>` with `colSpan={9}` (`SourcesView.tsx` ~66, ~538–613, ~549–613).
- Last success / last attempt: headings “Last successful fetch”, “Last attempt” with relative + `toLocaleString` absolute (`~553–577`).
- Next schedule: `describeSourceSchedule(s, globalPosture, Date.now())` (`~579–584`), implemented with `getEffectivePosture` / `getNextDueTime` from `@thinklish/shared` in `source-schedule-hint.ts` (`~1–42`).
- Watch / manual / paused copy explicitly documented in `describeSourceSchedule` (watch not on automatic timer; manual-only messaging) — consistent with contract “manual / watch / backoff-aware estimate” exposure without changing fairness algorithm.

**Result:** **PASS**

### 4. Errors + remediation (no stack dumps as primary UX)

**Contract:** Plain-language remediation; no raw stack traces in UI; structured hints.

**Evidence:**

- `remediateIngestionError` in `@thinklish/shared` maps patterns to `summary` + `bullets`; stack-like input collapsed for `sanitizedTechnical` via `looksLikeStackTrace` / `firstMeaningfulLine` (`source-error-remediation.ts` ~10–41, ~147–155).
- UI: summary + bullet list; raw text confined to collapsible “Technical detail” (`SourcesView.tsx` ~585–605).
- Tests in `@thinklish/core`: null/empty, 404, stack collapse, DNS-style (`source-error-remediation.test.ts`).

**Result:** **PASS**

### 5. Empty states — habit + material quality framing

**Contract:** Articles and sources empty copy ties **steady reading habit** and **material quality** to subscriptions; not “news reader” framing.

**Evidence:**

- Articles empty: “reading habit”, “strong English material”, “deep reading and spaced review” (`ArticlesView.tsx` ~259–266).
- Sources empty: “steady stream”, “material quality”, “not another news river” (`SourcesView.tsx` ~383–388).

**Result:** **PASS**

### 6. Shared utilities

**Contract:** Pure scheduler helpers available to renderer via `@thinklish/shared`; `remediateIngestionError` in shared + tests from `@thinklish/core`.

**Evidence:** `source-schedule-hint.ts` imports `getEffectivePosture`, `getNextDueTime` from `@thinklish/shared`; remediation imported in `SourcesView.tsx` from `@thinklish/shared`; tests import `remediateIngestionError` from `@thinklish/shared` in core test file.

**Result:** **PASS**

## Acceptance mapping (contract table)

| AC | Result | Primary evidence |
|----|--------|------------------|
| AC1 Paste + add source prominent | PASS | `Sidebar.tsx` quick-add; `ArticlesView.tsx` header + empty-state CTA |
| AC2 Last success / error / next attempt | PASS | `SourcesView.tsx` expanded detail sections |
| AC3 Errors + remediation, no stacks | PASS | `source-error-remediation.ts` + `SourcesView.tsx` details; `source-error-remediation.test.ts` |
| AC4 Discover imports | PASS | `ArticlesView.tsx` filter + recent imports checkbox |
| AC5 Onboarding copy | PASS | Empty states in `ArticlesView.tsx`, `SourcesView.tsx` |

## Build log cross-check

`build-log.md` claims shared scheduler move, remediation module, renderer updates, and verification commands. Independent runs this session **confirm** typecheck and core test counts align (42 tests). No contradiction with contract.

## Non-blocking notes (do not fail sprint)

- **Duplication:** Standard nav still lists “Articles” / “Sources” below quick-add; contract allows equivalent prominence — acceptable; future polish could reduce redundancy if product wants a leaner sidebar.
- **“Recent imports”** does not re-sort beyond API order; API is already `created_at DESC`, so behavior matches intent.

## Harness follow-up (out of evaluator scope)

Set `current_sprint.status` / `spec_features` / `sprint_history` per harness Step 4 when the orchestrator applies this verdict.
