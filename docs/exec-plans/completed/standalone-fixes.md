# Standalone Fixes

Non-harness bug fixes. Each entry is a self-contained fix record.

---

## SF-2026-04-09-1: Generate Card 成功时无 UI 反馈

- **日期**: 2026-04-09
- **影响模块**: LearningLogView (renderer)
- **文件**: `packages/app/src/renderer/src/components/LearningLogView.tsx`

### 现象
用户在 Learning Log 中点击 "Generate Card" 按钮后，首次成功创建卡片时没有任何反馈。用户无法确认操作是否成功，再次点击后才看到 "already exists" 提示。同时因为不知道卡片已创建但需要 +1 天后才到期，误以为 Review 模块有 bug。

### 根因
`handleGenerateCard` 只处理了 `alreadyExists` 分支，遗漏了 `success && !alreadyExists`（首次创建成功）和 `!success`（创建失败）两个分支的反馈。

### 修复
补全三个分支的 UI 反馈：失败时显示错误信息，已存在时提示重复，首次成功时告知卡片已创建并说明将于明天进入复习队列。

### 经验教训
所有用户操作都必须有明确的成功/失败反馈。特别是当操作结果不会立即在 UI 中可见时（如本例中卡片创建后 +1 天才出现在 Review），反馈信息应包含"接下来会发生什么"的说明，避免用户困惑。

---

## SF-2026-04-09-2: Review 卡片内容过长时无法滚动

- **日期**: 2026-04-09
- **影响模块**: ReviewView (renderer)
- **文件**: `packages/app/src/renderer/src/components/ReviewView.tsx`

### 现象
复习卡片的背面内容（AI 解释）较长时，内容超出可视区域，卡片没有滚动条，用户无法查看完整内容。

### 根因
卡片容器只设了 `min-h-[280px]` 无 `max-h` 约束且无 `overflow` 处理；外层容器用 `justify-center` 也无 `overflow-y-auto`，导致内容撑出屏幕后完全不可达。

### 修复
三处变更：(1) 卡片容器加 `max-h-[60vh] overflow-y-auto`，翻牌后改为 `justify-start` 使长内容从顶部开始；(2) 外层容器加 `overflow-y-auto` 作为兜底；(3) 进度条和评分按钮加 `shrink-0` 防止被挤压。

### 经验教训
任何展示用户生成内容或 AI 生成内容的容器都必须设置 `max-h` + `overflow-y-auto`，因为内容长度不可预测。`dangerouslySetInnerHTML` 渲染的 HTML 更应如此——AI 的回复长度完全不受控。
