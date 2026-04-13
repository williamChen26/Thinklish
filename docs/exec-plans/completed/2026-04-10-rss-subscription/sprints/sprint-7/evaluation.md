# Sprint 7 evaluation — F7 Feed discovery assistance

**Status:** Pending Evaluator review (Generator handoff).

## Generator self-check

- `pnpm typecheck` (root): passed after implementation.
- Core `feed-discovery` vitest: passed.
- AC coverage: confirm-before-create, multi-feed descriptions, watch fallback with Sources prefill, no auto-subscribe, degradable IPC.

## Notes for Evaluator

- Heuristic path probes are **skipped** when `<link rel="alternate">` feeds exist, to reduce redundant network traffic; see `contract.md`.
