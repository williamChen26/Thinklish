# Sprint 7 contract — F7 Feed discovery assistance

**Run:** `2026-04-10-rss-subscription`  
**Feature:** F7 — Feed discovery assistance (optional enhancement)  
**Priority:** P2 · **Depends on:** F1, F2 (and F4 for watched-site offer)

## Product decisions (locked for this sprint)

1. **Trigger:** When the user types or pastes an `http(s)` URL in the Articles “paste URL” field, the app **debounces** (~550ms) and runs **background discovery** without blocking Add / paste flows.
2. **Discovery rules:** Fetch page HTML; collect `<link rel="alternate">` with RSS/Atom types (plus `application/xml` / `text/xml` when inferable from href/body); if **no** alternates are found, probe a **small capped** set of common paths (`/feed`, `/rss`, `/atom.xml`, `/feed.xml`, `/rss.xml`, parent-dir `/feed`). When alternates **are** found, **skip** heuristic probes to avoid redundant requests (declarative feeds win).
3. **Consent:** Suggested feeds are shown in a strip; **Add as source** uses a **native confirm** before `sources:create`. **Never** auto-creates a source.
4. **Multiple feeds:** Each suggestion shows **title**, **URL**, and a **short description** (link title, path heuristics like “Comments”, or RSS vs Atom fallback).
5. **No feed:** IPC returns `suggestWatch: true` when discovery yields no feeds and the pasted URL is still a plausible site/article URL (not `*.xml` / `*.rss` / `*.atom`). Articles UI offers **Watch this site instead?**, opening Sources with the add form prefilled as **watched page** (F4).
6. **Degradable:** IPC and core never throw to the renderer; failures yield empty feeds and `suggestWatch: false` unless URL still qualifies for watch hint.

## Scope

### In scope

- Shared: `DiscoveredFeed` type (`url`, `type`, optional `title` / `description`).
- Core: `feed-discovery.ts` — `discoverFeeds`, `extractAlternateFeedsFromHtml` (tests), `isLikelySiteOrArticleUrl`.
- IPC: `feeds:discover` → `{ feeds, suggestWatch }`.
- Renderer: `feedsAPI`; Articles URL area — loading hint, feed strip, watch strip; `SourcesView` optional `prefillWatchUrl` / `onConsumedPrefillWatch`; `App` wiring.

### Out of scope

- JSON Feed, OPML, sitemap-based discovery, authenticated pages, robots.txt UI, ranking/scoring feeds beyond declared order.

## Acceptance criteria mapping

| AC | Verification |
|----|----------------|
| 1 One-click add after confirmation | Confirm dialog → `sources:create` feed source. |
| 2 Multiple feeds → short descriptions | `DiscoveredFeed.description` + per-row UI copy. |
| 3 No feed → watched-site path | `suggestWatch` + button → Sources prefill watch URL. |
| 4 Never auto-subscribe | No create without confirm; discovery is suggest-only. |
| 5 Degradable | Invalid / failed discovery → empty feeds; paste + manual sources unchanged. |

## Definition of done

- `pnpm typecheck` at repo root passes.
- Core tests for `feed-discovery` pass.
- Sprint `build-log.md` lists touched files.
