# Sprint 4 Build Log: F4 — Selection & AI Floating Window

## Status: PASSED

## Created/Modified Files

- NEW: `src/main/services/ai-provider.ts` — Claude/Codex CLI detection, prompt engineering (word/sentence), execution
- NEW: `src/main/ipc/ai.ts` — ai:explain, ai:detectMode IPC handlers
- NEW: `src/renderer/src/hooks/useTextSelection.ts` — text selection detection with context extraction
- NEW: `src/renderer/src/components/ai/FloatingPanel.tsx` — AI floating panel with loading/error/success states
- MODIFIED: `src/main/index.ts` — registered AI handlers
- MODIFIED: `src/renderer/src/lib/api.ts` — added aiAPI.explain
- MODIFIED: `src/renderer/src/components/reader/ReaderContent.tsx` — integrated text selection + floating panel

## Architecture Decisions

1. **CLI Detection**: Auto-detects `claude` (with `-p` flag) or `codex` (with `-q` flag)
2. **Prompt Engineering**: Separate word/sentence prompts emphasizing 语感/场景/表达逻辑
3. **Auto Mode Detection**: ≤3 words without punctuation → word mode; otherwise → sentence mode
4. **Position Calculation**: Panel positions below selection, flips up if near bottom
5. **Context Extraction**: 80 chars before/after selection for AI context

## Verification
- `pnpm -r build`: PASS (main 10.65 kB, renderer 315 kB)
- `pnpm lint`: PASS
