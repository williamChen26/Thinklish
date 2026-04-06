# Sprint 3 Contract: F3 — Immersive Reader

## Feature
F3: Immersive Reader

## Scope

实现干净、适合长时间阅读的全屏阅读视图。支持 HTML 文章渲染、明暗主题切换、字体大小调整、行宽控制。阅读体验是产品核心，UI 质量要高。

### Deliverables

1. **ReaderView 组件**: 渲染文章 HTML（标题、段落、图片、引用、代码块）
2. **主题系统**: 明暗模式切换，持久化到 localStorage
3. **排版控制**: 字体大小（3 档）、行宽（窄/中/宽）、设置持久化
4. **Reader 工具栏**: 返回按钮 + 主题切换 + 字体控制
5. **useSettings hook**: 管理阅读设置的持久化

### Non-Scope
- 不实现文本选中和 AI 浮窗（Sprint 4）
- 不实现滚动进度保存
- 不实现图片懒加载优化

## Test Criteria

| # | 标准 |
|---|------|
| T1 | 点击文章进入阅读视图，正确渲染标题、段落、图片、引用 |
| T2 | 明暗主题切换立即生效，无闪烁 |
| T3 | 字体大小 3 档可调，设置持久化 |
| T4 | 最大内容宽度 ≤ 720px，行高 ≥ 1.6 |
| T5 | `pnpm build` 通过 |
