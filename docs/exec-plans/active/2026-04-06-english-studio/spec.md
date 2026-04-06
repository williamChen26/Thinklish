# Spec: English Studio — 沉浸式英语阅读与深度理解桌面应用

## Background

非英语母语学习者在阅读英文内容时，最大的痛点不是"查不到词"，而是"查完词还是不懂为什么英语要这样说"。现有工具（词典、翻译器）停留在字面翻译层面，无法帮助用户建立英语语感和表达直觉。

English Studio 的核心价值主张是：在真实阅读场景中，用 AI 帮助用户理解英语表达的底层逻辑（为什么这样说、什么语感、什么场景用），并将碎片化学习自动沉淀为可复习的知识资产。

这不是一个翻译工具，而是一个"英语思维训练器"。

## Goals

1. 提供从"获取文章→沉浸阅读→选中理解→自动记录→间隔复习"的完整学习闭环。
2. AI 解释聚焦"英语为什么这样表达"，而非机械翻译。
3. 学习过程零整理成本：自动记录、自动生成卡片、自动安排复习。
4. Local-first 架构：所有数据本地存储，隐私安全，离线可用（AI 调用除外）。
5. 代码架构清晰可扩展：pnpm monorepo，包边界明确，支持后续扩展更多 AI provider。

## Non-Goals

1. **不做全功能 RSS 阅读器** — 不实现订阅管理、OPML 导入等 RSS 特有功能。文章获取仅通过 URL 粘贴。
2. **不做社交功能** — 没有分享、排行榜、社区等功能。
3. **不做云同步** — MVP 阶段不实现跨设备同步，所有数据本地存储。
4. **不做完整 Anki 客户端** — 只生成和导出卡片，不重新实现 Anki 的全部复习算法。
5. **不做多语言支持** — 界面语言固定为中文，学习目标语言固定为英语。
6. **不做 PDF/epub 阅读** — 仅支持网页文章内容。

## Feature List

### F1: Project Foundation & Electron Shell

建立项目基础架构：pnpm monorepo 结构、Electron + React + TypeScript 脚手架、SQLite 数据层、共享类型定义。这是所有后续功能的基础地基。

参考架构（类似 spool-lab/spool）:
```
packages/
  app/        Electron 主应用 (React + Vite + Tailwind)
  core/       核心引擎 (SQLite + 业务逻辑)
  shared/     共享类型与工具
```

**Acceptance Criteria:**
- AC-1.1: `pnpm install && pnpm build` 成功完成，零错误。
- AC-1.2: Electron 应用可启动并显示一个带有基础导航的空壳窗口。
- AC-1.3: SQLite 数据库在首次启动时自动创建，包含 articles、lookups、cards 三张表的初始 schema。
- AC-1.4: `packages/shared` 中导出的类型可以在 `packages/app` 和 `packages/core` 中正常导入使用。
- AC-1.5: 项目包含 ESLint + TypeScript strict mode 配置，`pnpm lint` 通过。

**Priority:** P0 (must-have)
**Dependencies:** None

---

### F2: Article Acquisition Pipeline

用户粘贴 URL，系统自动抓取网页正文内容（标题、正文、来源、发布时间、原始 URL），存储到本地 SQLite。需要处理抓取失败的兜底策略。

**Acceptance Criteria:**
- AC-2.1: 用户在输入框粘贴 URL 并确认后，系统在 10 秒内完成抓取并显示在文章列表中。
- AC-2.2: 抓取结果包含：标题、正文（纯文本 + 保留段落/标题结构的 HTML）、来源域名、发布时间（如可提取）、原始 URL。
- AC-2.3: 当抓取失败时（网络错误、内容提取失败），显示明确的错误提示，并允许用户手动粘贴正文作为 fallback。
- AC-2.4: 已抓取文章持久化存储在 SQLite 中，应用重启后数据不丢失。
- AC-2.5: 文章列表页显示所有已保存文章，按添加时间倒序排列，每条显示标题、来源、时间。

**Priority:** P0 (must-have)
**Dependencies:** F1

---

### F3: Immersive Reader

提供干净、适合长时间阅读的阅读界面。支持标题、段落、图片、引用、代码块等基本排版。支持深色模式、字体大小调整、行宽和行距优化。阅读体验是产品核心，UI 质量要高。

**Acceptance Criteria:**
- AC-3.1: 点击文章列表中的文章后，进入全屏阅读视图，正确渲染标题、段落、图片、引用块和代码块。
- AC-3.2: 支持明暗两种主题切换，切换立即生效且无闪烁。
- AC-3.3: 提供字体大小（至少 3 档）、行宽（窄/中/宽）调节控件，设置持久化。
- AC-3.4: 阅读视图最大内容宽度不超过 720px，行高不低于 1.6，符合长文阅读的舒适标准。
- AC-3.5: 在 1000 词以上的文章中，滚动流畅无卡顿。

**Priority:** P0 (must-have)
**Dependencies:** F1, F2

---

### F4: Selection & AI Floating Window

用户在阅读器中选中单词、短语或句子后，弹出轻量浮窗。浮窗通过 Claude Code CLI 或 Codex CLI 调用 AI 获取解释。AI 自动区分"单词解释"和"句子解释"两种模式，输出强调语感、场景和表达逻辑。

**Acceptance Criteria:**
- AC-4.1: 用户在阅读视图中选中文本后，200ms 内在选中位置附近弹出浮窗（不遮挡选中文本）。
- AC-4.2: 浮窗展示 loading 状态，AI 响应完成后渲染格式化的解释内容；支持重新解释、收起、保存三个操作。
- AC-4.3: AI 调用通过 Claude Code CLI 或 Codex CLI 完成；CLI 调用失败时显示错误提示并允许重试。
- AC-4.4: 单词模式输出包含：语境含义、语感、常见搭配、例句、近义词辨析（至少 4 项）。句子模式输出包含：核心意思、结构拆解、表达逻辑、中文不能直译的点、变体表达（至少 4 项）。
- AC-4.5: 从选中到 AI 首次输出显示的延迟不超过 5 秒（正常网络条件下）。

**Priority:** P0 (must-have)
**Dependencies:** F1, F3

---

### F5: Learning Log System

每次用户查看 AI 解释后，系统自动记录学习事件。学习日志支持浏览、筛选和状态管理。这是后续 Anki 卡片生成和复习系统的数据基础。

**Acceptance Criteria:**
- AC-5.1: 用户在浮窗中查看 AI 解释后，系统自动创建一条学习日志（无需用户手动操作）。
- AC-5.2: 每条日志包含：原文片段（上下文）、所在文章引用、用户选中文本、AI 输出内容、类型（word/phrase/sentence）、时间戳、掌握状态。
- AC-5.3: 学习日志页面支持按时间、类型、掌握状态筛选，默认按时间倒序显示。
- AC-5.4: 用户可手动修改日志的掌握状态（未复习/复习中/已掌握/需加强）。
- AC-5.5: 日志数据持久化在 SQLite 中，支持 100+ 条日志的流畅浏览。

**Priority:** P1 (should-have)
**Dependencies:** F1, F4

---

### F6: Anki Card Generation & Export

基于学习日志自动生成 Anki 卡片。卡片内容围绕"理解"和"场景"设计，而不只是中英翻译。支持导出为 Anki 兼容的 TSV/CSV 格式。

**Acceptance Criteria:**
- AC-6.1: 用户可从学习日志中选择条目，一键生成 Anki 卡片。
- AC-6.2: 单词卡片正面包含单词+语境句，背面包含语感说明+搭配+例句。句子卡片正面包含原句，背面包含结构拆解+表达逻辑+变体表达。
- AC-6.3: 支持批量导出为 TSV 格式（Anki 默认导入格式），文件可被 Anki 桌面版成功导入。
- AC-6.4: 导出的卡片包含标签（来源文章、类型、日期），方便在 Anki 中分类管理。
- AC-6.5: 已生成卡片在日志中有可视标记，避免重复生成。

**Priority:** P1 (should-have)
**Dependencies:** F1, F5

---

### F7: Spaced Repetition & Review

基于学习日志和 Anki 卡片的应用内复习系统。使用简单的间隔重复策略（"1 次学习 + 3 次复习"）。支持复习队列、状态追踪和每日复习提醒。

**Acceptance Criteria:**
- AC-7.1: 应用内提供"今日复习"入口，展示当天应复习的卡片队列。
- AC-7.2: 复习卡片采用正面/背面翻转交互，用户可标记：记住/模糊/忘记。
- AC-7.3: 系统根据用户标记自动调整下次复习时间（记住→间隔加倍，模糊→间隔不变，忘记→重置为 1 天）。
- AC-7.4: 复习状态（未复习/复习中/已掌握/需加强）在学习日志和复习页面保持同步。
- AC-7.5: 应用启动时，如有待复习项目，在主界面显示提醒徽标。

**Priority:** P2 (nice-to-have)
**Dependencies:** F1, F5, F6

## Risks & Dependencies

### 技术风险

1. **CLI 可用性**: Claude Code CLI 或 Codex CLI 可能未安装或版本不兼容。需在启动时检测 CLI 可用性，并给出明确指引。
2. **网页内容抽取**: 部分网站可能有反爬策略、付费墙或非标准 HTML 结构，导致正文提取失败。需使用成熟的 Readability 库并有手动输入 fallback。
3. **Electron 构建复杂度**: Electron + SQLite (better-sqlite3) 的 native module 构建在不同平台上可能有兼容问题。需参考 spool 项目的 electron-rebuild 方案。
4. **CLI 响应延迟**: AI CLI 调用涉及网络和模型推理，延迟可能较高。需实现 loading 状态和流式输出支持。

### 产品风险

1. **AI 输出质量**: Prompt 设计是否能稳定产出高质量的"语感+场景"解释，需要在实际使用中反复调优。
2. **学习效果可验证性**: "理解英语表达逻辑"这个目标难以量化衡量，需通过用户反馈迭代。

### 外部依赖

1. Claude Code CLI 或 Codex CLI（至少一个已安装）
2. 网络连接（用于 AI 调用和文章抓取）
3. Anki 桌面版（用于导入导出的卡片）

## Open Questions

1. **CLI 优先级**: Claude Code CLI 和 Codex CLI 应该优先支持哪个？还是两个都作为 P0？建议先支持一个，另一个作为 P1 扩展。
2. **UI 组件库选择**: 需要确认使用哪个 React 组件库（如 shadcn/ui、Radix、Ant Design 等）。建议使用 shadcn/ui + Tailwind，轻量且可定制。
3. **Agent Skill 标准**: 用户提到将 AI prompt 沉淀为 agent skill（参考 agentskills.io）。这是否在 MVP 范围内？建议作为 F4 的实现细节，不单独列为 feature。
4. **流式输出**: CLI 调用是否应支持流式渲染（打字机效果）？这显著提升体验但增加实现复杂度。建议 P0 先做完整响应，P1 加流式。

## Suggested Sprint Order

1. **Sprint 1 → F1 (Project Foundation)**: 地基必须先打好。产出：可启动的 Electron 空壳 + monorepo 结构 + SQLite 初始化。
2. **Sprint 2 → F2 (Article Acquisition)**: 有了骨架，先让内容进来。产出：URL 粘贴 → 抓取 → 存储 → 列表展示。
3. **Sprint 3 → F3 (Immersive Reader)**: 有了内容，提供阅读体验。产出：干净的阅读界面 + 主题切换 + 排版控制。
4. **Sprint 4 → F4 (Selection & AI Window)**: 核心价值交付。产出：选中 → 弹窗 → AI 解释 → 显示。
5. **Sprint 5 → F5 (Learning Log)**: 自动沉淀学习过程。产出：自动记录 + 日志浏览 + 状态管理。
6. **Sprint 6 → F6 (Anki Cards)**: 知识资产外化。产出：卡片生成 + 导出。
7. **Sprint 7 → F7 (Review System)**: 闭环复习。产出：复习队列 + SRS + 提醒。
