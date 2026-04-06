# Sprint 3 Build Log: F3 — Immersive Reader

## Status: PASSED

## Created/Modified Files

- NEW: `hooks/useSettings.ts` — theme/fontSize/contentWidth 管理 + localStorage 持久化
- NEW: `components/reader/ReaderView.tsx` — 阅读视图入口，加载文章数据
- NEW: `components/reader/ReaderToolbar.tsx` — 返回/主题切换/字体/行宽控制
- NEW: `components/reader/ReaderContent.tsx` — HTML 文章渲染 + 排版控制
- MODIFIED: `App.tsx` — 集成 ReaderView，文章列表 ↔ 阅读器导航
- MODIFIED: `assets/index.css` — 完整的 reader-content 排版样式

## Key Design Decisions

1. **CSS 变量驱动排版**: 字体大小/行高/行宽通过 Tailwind class 动态切换
2. **dangerouslySetInnerHTML**: 用于渲染 Readability 提取的 HTML（已 sanitized）
3. **Sticky 工具栏**: 滚动时始终可见，backdrop-blur 半透明效果
4. **Reader CSS**: 完整覆盖 p/h/img/blockquote/pre/code/table/figure 等元素

## Verification
- `pnpm -r build`: PASS
- `pnpm lint`: PASS
- CSS bundle: 20.80 kB (reader styles included)
