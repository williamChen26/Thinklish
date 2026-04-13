# Product Spec: RSS & Subscription-Style Article Ingestion

**Run ID:** `2026-04-10-rss-subscription`  
**Status:** Sprinting  
**Audience:** Planner → Generator → Evaluator (harness loop)

---

## Background

Thinklish is an immersive English reading and deep-comprehension desktop app for Chinese native speakers. The product promise is *not* translation-first: it helps users perceive meaning, structure, and usage patterns the way proficient readers do. The established loop is **obtain article → immersive read → selective understanding (AI) → automatic capture → spaced review**.

Today, articles enter the system almost entirely through **manual URL paste**, followed by content extraction and persistence in a unified article library. That path is simple and aligned with intentional reading, but it does not scale as a **steady supply of high-quality English reading material**—which is what serious learners need over months and years.

This spec deliberately **reverses a prior non-goal**: Thinklish will add **subscription-style ingestion** so users can keep their library fresh without treating the product as a full RSS client. The north star remains **English learning**; RSS and related mechanisms are **channels**, not the product identity.

Two ingestion realities must be addressed:

- **Scenario A — Standard syndication:** Many publishers expose RSS or Atom. Users should be able to subscribe and receive new items as first-class articles in the same library used for pasted URLs.
- **Scenario B — No syndication feed:** Many valuable sites do not publish RSS. Users should still be able to attach ongoing attention to a site or page family and have **new reading candidates** surface in a controlled, reviewable way—conceptually a **generated or virtual feed**, not a claim of standards-compliant RSS on the publisher's side.

All ingested material must **flow through the same article lifecycle** (read, lookup, cards, review) without parallel silos that fragment the learning record.

---

## Goals

1. **Sustainable reading supply:** Enable users to maintain a pipeline of English articles aligned with their interests, with less friction than pasting every URL by hand.
2. **Standards-based subscriptions where available:** Support subscription to **RSS and Atom** sources so new entries appear as importable or automatic additions to the unified article library (exact automation level per feature).
3. **Coverage when syndication is absent:** For sites without feeds, provide a **subscription-like experience** that surfaces **new or changed reading targets** derived from web observation, presented as items the user can open in the existing reading workflow.
4. **Product-consistent reading objects:** Every surfaced item must become (or map to) the same **article** abstraction the app already uses for extraction, storage, and downstream learning features.
5. **Trust and control:** Users must understand what each source does, when it last updated, and how to pause or remove it; failures must be visible and recoverable.
6. **Responsible performance:** Ingestion must be **bounded, schedulable, and non-disruptive** to reading and UI responsiveness, including under many sources or bursty updates.
7. **Progressive adoption:** Manual URL paste remains credible as the "first day" path; subscription features feel like a **natural upgrade**, not a mode switch.

---

## Non-Goals

The following are **explicitly out of scope** for this initiative. They protect Thinklish from becoming a generic RSS reader and keep focus on learning.

1. **Full-featured RSS client:** No ambition to match dedicated readers (e.g. advanced folder taxonomies, river-of-news layouts, read/unread sync across unrelated products, or "inbox zero" RSS workflows as the primary UX).
2. **OPML import/export, feed sharing, or social subscription graphs:** Unless listed as a future optional epic, treat as **not required** for v1 of this spec.
3. **Podcast / media enclosure management:** Enclosures may be ignored; Thinklish targets **text reading**, not media library management.
4. **Hosted feed generation for the public internet:** Thinklish does not need to publish feeds for third parties or act as a feed hosting service.
5. **Email-to-RSS, newsletter parsing, or paywall circumvention:** Unless separately specified, authentication-heavy or ToS-sensitive ingestion strategies are **not goals** of this spec.
6. **Replacing content extraction quality work:** Subscription features **depend on** the existing article extraction behavior for full text when the user opens an item; this spec does not redefine extraction algorithms.
7. **Multi-device real-time sync of subscription state:** Unless the broader product already mandates cloud sync, assume **local-first** subscription configuration and article library on the desktop instance.

---

## Feature List

Features are ordered by **dependency and learner value**: registry and standard feeds first; scheduling and lifecycle governance next; synthetic / non-RSS path and UX refinements follow.

Each feature is intended to be **implementable in a single sprint**. Each includes **priority**, **dependencies**, and **acceptance criteria (AC)**.

---

### F1 — Ingestion source registry (feeds & watched targets)

**Priority:** P0  
**Dependencies:** None (product concept only; integrates with existing article library at data level in later features).

**Description:** Users can register **ingestion sources** with a clear type distinction: at minimum **(a) syndicated feed URL** and **(b) non-syndicated watch target** (site/page family) for the synthetic path. Each source has a human-readable label, enabled/paused state, and basic metadata needed for trust (e.g. when added, last successful check).

**Acceptance criteria:**

1. User can **add** a new source by providing a URL and choosing or confirming the source **type** (feed vs watch) when the product cannot infer it unambiguously.
2. User can **rename**, **pause/resume**, and **delete** a source; paused sources perform **no background ingestion**.
3. Source list is **persisted** across app restarts and is **isolated per user profile** if the product already defines profiles; otherwise per local install.
4. Deleting a source does **not** silently delete all articles previously ingested from it unless the user explicitly opts into a destructive cleanup flow (default: safe delete of source only).
5. Empty state explains the **learning purpose** of sources (steady English reading material), not "RSS reader" positioning.

---

### F2 — RSS/Atom ingestion into the unified article library

**Priority:** P0  
**Dependencies:** F1.

**Description:** For sources of syndicated type, the product retrieves feed documents, interprets standard RSS/Atom item semantics, and creates or updates **article records** compatible with the existing reading pipeline. Items must be **deduplicated** in a predictable way (e.g. stable identity derived from canonical link or guid-equivalent when present).

**Acceptance criteria:**

1. Given a valid RSS or Atom feed URL, new entries appear as **articles** visible in the same article list (or equivalent primary library surface) used for pasted URLs.
2. Re-running ingestion **does not create duplicate articles** for the same logical item according to the product's documented identity rules.
3. Each ingested article retains **provenance**: user-visible association to the originating source (and original item link where applicable).
4. If an item's metadata updates (e.g. title correction), the product applies a **defined update policy** (either refresh in place or ignore) without breaking user-generated learning artifacts tied to that article.
5. Malformed feeds and partial entries fail **gracefully**: user sees a source-level error, not a crashed session.

---

### F3 — Scheduled refresh, fairness, and UI non-interference

**Priority:** P0  
**Dependencies:** F2.

**Description:** Ingestion runs on a **schedule** with **global and per-source fairness** so that background work does not degrade reading responsiveness. Users can choose from **coarse frequency bands** (e.g. manual-only, relaxed, normal) rather than per-second controls. The system applies **backoff** when sources repeatedly fail.

**Acceptance criteria:**

1. User can configure a **global default** refresh posture; optional per-source overrides may exist but are not required if global bands suffice for v1.
2. During active reading, background ingestion **does not cause sustained UI stalls**; any heavy work is deferred or chunked according to product-defined responsiveness targets.
3. When many sources are enabled, the scheduler **rotates** attention so one hyperactive feed cannot starve others beyond documented bounds.
4. Repeated HTTP or parse failures trigger **exponential or stepped backoff** and surface **actionable** status (e.g. "temporarily paused after failures").
5. User can trigger **manual refresh** for a single source or for all sources, with visible progress and completion summary.

---

### F4 — Synthetic / "virtual feed" path for non-RSS sites

**Priority:** P1  
**Dependencies:** F1, F3 (conceptual sharing of scheduling and backoff; may ship after F2 if needed, but must not fork article semantics).

**Description:** For sources without RSS/Atom, the product monitors **user-defined web targets** and emits **candidate reading items** when meaningful change or new listing behavior is detected. Candidates appear as **articles or article stubs** that enter the same library and extraction flow when opened—preserving the core loop. This capability is presented to users as **"follow a site without a feed"**, not as impersonating a publisher's RSS endpoint.

**Acceptance criteria:**

1. User can register a **watch target** (e.g. listing page, blog index, or article URL pattern scope as defined by the product) when no feed is available.
2. When the product detects **new candidate links** or **material content change** per its documented rules, new **library entries** appear for user review (exact automation: all auto-import vs inbox confirm is a product choice, but must be documented in AC for the sprint).
3. Opening a candidate triggers the **same article reading experience** as a pasted URL, including extraction and downstream AI features.
4. False positives (navigation chrome, cookie banners, minor edits) are **bounded**: user can dismiss or mark noise, and the product learns or filters per sprint-defined policy without requiring ML in the spec.
5. User-visible copy distinguishes **syndicated sources** from **watched sites** to set correct expectations on reliability and legality of repeated fetching.

---

### F5 — Storage governance and library growth control

**Priority:** P1  
**Dependencies:** F2 (and F4 when enabled).

**Description:** Subscription ingestion can increase article volume quickly. The product defines **retention and cap policies** to protect disk space and cognitive load, without orphaning active learning data. Policies favor **keeping articles referenced by lookups/cards** unless the user overrides.

**Acceptance criteria:**

1. Product exposes at least one **global policy knob**: e.g. maximum age for **unread** imported articles, maximum total imported articles, or per-source caps—stated as user-facing options, not implementation.
2. Articles with **active learning artifacts** (e.g. existing lookups or scheduled cards) are **not deleted** by default retention passes.
3. Before bulk deletion, user receives **clear warning** with counts of affected articles and learning links.
4. User can **permanently remove** all articles from a specific source in one action (explicit destructive flow).
5. Storage reporting shows **approximate footprint** attributable to imported vs manually added articles (high-level is sufficient).

---

### F6 — Integrated UX: coexistence with paste URL and clear status surfaces

**Priority:** P1  
**Dependencies:** F1–F3 (F4 optional for same sprint if scope allows).

**Description:** Subscription features live alongside **paste URL** as sibling entry points. Users always see **sync health**: last run time, item counts, errors. The experience reinforces **English learning**, not feed tech.

**Acceptance criteria:**

1. Primary "add article" flows include **paste URL** and **add source** without burying either.
2. Source detail view shows **last success**, **last error**, and **next scheduled attempt** (or equivalent human-friendly schedule description).
3. Errors link to **plain-language remediation** (check URL, site blocking, auth not supported, etc.) without exposing raw stack traces by default.
4. Newly imported articles are **discoverable** without hunting (e.g. sort/filter by source or "recent imports").
5. Onboarding copy ties subscriptions to **habit and material quality**, not "following the news."

---

### F7 — Feed discovery assistance (optional enhancement)

**Priority:** P2  
**Dependencies:** F1, F2.

**Description:** When a user pastes a **site root or article URL**, the product may **suggest** discovered syndicated feed URLs (e.g. from standard link relations or common patterns) to reduce manual hunt friction.

**Acceptance criteria:**

1. When suggestion is available, user can **one-click add** a suggested feed as a new source after **confirmation**.
2. When multiple feeds exist, user sees **short descriptions** (e.g. "full articles" vs "comments") if such distinction is inferable; otherwise neutral listing.
3. If no feed is found, user is **offered the watched-site path** (F4) without dead-ending.
4. Suggestion logic **never** auto-subscribes without explicit user consent.
5. Feature is **degradable**: if discovery fails, paste URL and manual feed entry still work.

---

## Performance Considerations

This section states **product-level performance expectations** so engineering can design within explicit bounds. It intentionally avoids prescribing mechanisms.

1. **Polling cadence:** Default schedules must assume **dozens** of sources on modest hardware; "aggressive" modes must still respect **ceiling rates** documented in the sprint contract (e.g. minimum interval per source, maximum concurrent network operations).
2. **Burst ingestion:** When a feed publishes many items at once, processing must be **chunked** so article creation does not monopolize resources; user-facing progress should reflect large backfills.
3. **Database write pressure:** High-volume imports must avoid **single long transactions** that block interactive queries; acceptance tests should include **import N items** scenarios with reading interactions interleaved.
4. **Main thread / UI responsiveness:** Long-running fetch, parse, and extraction work must not pin the interaction thread; scrolling and lookup interactions remain fluid during background imports within agreed latency targets.
5. **Network and battery courtesy:** Respect system sleep/idle where possible; avoid tight loops on failure; use backoff as in F3.
6. **Disk growth:** F5 policies must be testable; synthetic sources should assume **higher churn** than RSS and plan for pruning and user review queues accordingly.
7. **Observability for users:** Provide lightweight **diagnostics** (e.g. last duration, items processed) sufficient to explain "why my machine felt busy" without overwhelming casual learners.

---

## Risks & Dependencies

**Risks**

1. **Site policy and robots/ToS:** Automated fetching may conflict with some sites' terms; synthetic watching amplifies this. Product copy and defaults should encourage ethical use; some sites will remain unsupported.
2. **Authentication and paywalls:** Many high-value English sources require login; without an auth story, user expectations may outstrip capability—must be messaged clearly.
3. **False positives in synthetic mode:** Change detection can surface noise; poor UX here erodes trust faster than RSS parse errors.
4. **Duplicate identity edge cases:** Feeds without stable guids and rewritten URLs can duplicate content; requires careful identity documentation and user-merge tools later if needed.
5. **Scope creep:** Any feature resembling social reading, river layouts, or enclosure players risks diluting the learning mission—Non-Goals must be enforced in sprint contracts.

**Dependencies**

1. **Existing article model and extraction pipeline:** Ingestion must converge on current article creation inputs and storage semantics.
2. **IPC and main-process capabilities (implementation detail owned by Generator):** Network access and persistence already exist for manual URL; subscriptions extend volume and scheduling only at the product layer.
3. **SQLite durability:** WAL mode is assumed; sprint verification should stress **read during write** scenarios at acceptance-test level.

---

## Resolved Questions (Product Decisions)

1. **Auto-import vs review queue:** **Layered approach.** RSS sources → auto-import (user explicitly subscribed = trusted). Watch sources (F4) → candidate queue requiring user confirmation (higher false-positive rate). Article list gains a "new imports" visual marker for discoverability.
2. **Partial content in feeds:** **Lazy fetch on open.** List displays feed-provided title + summary only. Full-text extraction via Readability triggers when user opens the article for reading. Saves resources; articles the user never reads never get fetched.
3. **Language filtering:** **Default ON (English only).** This is an English learning app; non-English items are noise. Users can disable per source in source settings.
4. **Synthetic target definition:** **Single listing-page URL** for v1 (e.g. blog index, category page). Simplest mental model, most predictable behavior. Domain-wide and pattern matching deferred.
5. **Merge with manual duplicates:** **Silent URL-based merge.** If pasted URL already exists from feed import, show "already in library" toast and navigate to the existing article. No duplicates created.
6. **Export and backup:** **Not in scope for v1.** Subscriptions stay local-only. Revisit when/if broader export initiative happens.

---

## Suggested Sprint Order

1. **Sprint 1 — F1:** Ingestion source registry (types, pause/delete, persistence, safe defaults). *Unlocks everything else.*
2. **Sprint 2 — F2:** RSS/Atom ingestion into unified articles with deduplication and provenance. *Delivers core learner value.*
3. **Sprint 3 — F3:** Scheduler, backoff, manual refresh, non-interference acceptance. *Makes F2 production-safe.*
4. **Sprint 4 — F6:** Integrated UX and status surfaces coexisting with paste URL. *Reduces fragmentation and support burden.*
5. **Sprint 5 — F5:** Storage governance and explicit cleanup flows. *Controls growth before synthetic path scales volume.*
6. **Sprint 6 — F4:** Watched-site / synthetic feed path with bounded false positives and same article lifecycle. *Completes scenario B.*
7. **Sprint 7 — F7 (optional):** Feed discovery assistance. *Polish and acquisition hook.*

Parallelization note: **F5** can overlap **F6** after **F2** if staffing allows, but **F3** should precede heavy real-world use of **F2**. **F4** should not start until **F3**'s fairness and backoff patterns exist to reuse.

---

*End of spec.*
