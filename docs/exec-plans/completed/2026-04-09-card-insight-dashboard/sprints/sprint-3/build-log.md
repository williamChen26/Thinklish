# Sprint 3 build log — F3: 洞察仪表盘可视化

## Summary

Replaced the four-tile stats grid in `CardOverviewView` (when `stats.total > 0`) with a dependency-free SVG donut built from stacked `<circle>` elements using `stroke-dasharray` / `stroke-dashoffset`, center label for total count, and a horizontal wrapping legend (color dot + label + count). Loading and empty (`total === 0`) branches are unchanged.

## Donut behavior

- **Geometry:** `viewBox="0 0 160 160"`, center `(80,80)`, `r=60`, `strokeWidth=20`, circumference `2πr`.
- **Rotation:** `rotate(-90 80 80)` so segments start at 12 o’clock.
- **Order:** Due → Learning → Mastered (skipped when count is 0).
- **Single bucket:** When one category equals `total`, one full circle is drawn (no dasharray) in that segment’s color.
- **Colors (light/dark):** `#ef4444` (Due), `#eab308` (Learning), `#22c55e` (Mastered).
- **A11y:** Donut `role="img"` with `aria-label` summarizing counts; legend as semantic list.

## Files touched

| Layer | Path |
|-------|------|
| renderer | `packages/app/src/renderer/src/components/CardOverviewView.tsx` — `CardDeckDonutChart` + legend |

## Verification

- `pnpm typecheck` — passed (2026-04-09).

## Out of scope (per contract)

- Third-party chart libraries.
- Changes to loading or empty states.
