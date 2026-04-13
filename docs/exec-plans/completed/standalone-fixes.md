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

---

## SF-2026-04-10-1: 打包后 ACP 适配器无法找到 Claude Code / Codex

- **日期**: 2026-04-10
- **影响模块**: ACP agent 解析 + 连接 (main process)
- **文件**: `packages/app/electron-builder.yml`, `packages/app/src/main/services/acp-agents.ts`, `packages/app/src/main/services/acp-connection.ts`

### 现象
`pnpm dev` 本地开发时 AI 功能正常，但 `electron-builder` 打包后启动 app 无法找到 Claude Code 和 Codex agent，所有 agent 状态为 `not_found`。

### 根因
两层错误叠加：

1. **`fixAsarPath` 对 `kind: 'node'` 的 JS 适配器无条件转换路径**：`require.resolve()` 在 asar 内成功定位文件，但 `fixAsarPath()` 将路径从 `app.asar/...` 转为 `app.asar.unpacked/...`，而适配器包未列入 `asarUnpack`，导致 `existsSync()` 在 unpacked 路径上必然失败。
2. **即使加入 `asarUnpack` 也不够**：子 `node` 进程没有 Electron 的 asar 补丁，无法读取仍在 asar 内的传递依赖（`@agentclientprotocol/sdk`、`@anthropic-ai/claude-agent-sdk`、`zod`），spawn 后会因模块解析失败而崩溃。

### 修复
按 `kind` 分策略：

| 变更 | 说明 |
|------|------|
| `electron-builder.yml` | 为 Codex 原生二进制加入 `asarUnpack`（`@zed-industries/codex-acp-*/**`） |
| `acp-agents.ts` | `kind: 'node'` 的 resolve 函数不再做 `fixAsarPath` + `existsSync`，保留 asar 内部路径；`kind: 'native'` 保持不变 |
| `acp-connection.ts` | 打包模式下 `kind: 'node'` 用 `ELECTRON_RUN_AS_NODE=1` + `process.execPath` spawn，子进程自带 asar 支持，可读取所有传递依赖 |

### 经验教训
Electron asar 打包场景下，需要被 `child_process.spawn` 执行的文件分两类处理：(1) 原生二进制必须 `asarUnpack`，因为 OS 不认识 asar；(2) JS 文件应保留 asar 路径 + 用 `ELECTRON_RUN_AS_NODE` spawn，这样子进程天然继承 asar 读取能力，无需枚举全部传递依赖。`fixAsarPath` 只应用于 `kind: 'native'`。

---

## SF-2026-04-13-1: 侧边菜单 Articles/Sources 导航项重复

- **日期**: 2026-04-13
- **影响模块**: Sidebar (renderer)
- **文件**: `packages/app/src/renderer/src/components/Sidebar.tsx`

### 现象
侧边菜单中 "Articles" 和 "Sources" 各出现两次——一次在顶部 "Add reading" 区域的快捷按钮中，一次在下方主导航列表中。

### 根因
`NAV_ITEMS` 数组包含了 `articles` 和 `sources` 两项，但这两个导航入口已在上方 "Add reading" 区域以独立按钮形式实现（调用相同的 `onNavChange`），导致同一功能入口渲染了两份。

### 修复
从 `NAV_ITEMS` 数组中移除 `articles` 和 `sources`，仅保留 `log`、`cardOverview`、`review`。

### 经验教训
新增快捷入口区域时，应同步检查是否与已有导航列表存在重叠，避免同一功能出现多个相同入口。

---

## SF-2026-04-13-2: App 标题被 macOS 窗口控制按钮遮挡

- **日期**: 2026-04-13
- **影响模块**: Sidebar (renderer)
- **文件**: `packages/app/src/renderer/src/components/Sidebar.tsx`

### 现象
macOS 上应用左上角的 "Thinklish" 标题被系统交通灯按钮（关闭、最小化、最大化）遮住，标题不可见。

### 根因
标题区域使用 `px-4`（16px 左内边距），不足以避开 macOS 窗口控制按钮所占的约 70px 空间。

### 修复
将标题区域的 `px-4` 改为 `pl-20 pr-4`，左内边距增至 80px，确保标题完全显示在交通灯按钮右侧。

### 经验教训
Electron 自定义标题栏在 macOS 上必须为系统交通灯按钮预留至少 70-80px 的左侧空间。设置 `titleBarStyle: 'hiddenInset'` 时，侧边栏顶部区域是最容易被遮挡的位置。
