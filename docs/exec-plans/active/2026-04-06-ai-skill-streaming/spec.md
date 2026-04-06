# Spec: AI Skill Integration + Streaming Markdown Output

## Background

English Studio 的 AI 解释功能当前存在两个问题：

1. **Prompt 硬编码且与 Skill 脱节**：`ai-provider.ts` 中的 `buildPrompt()` 硬编码了 word/sentence 两种模式的 prompt，而用户已在 `english-intuition.md` 中编写了更完善的三模式（word/phrase/sentence）skill 模板，包含发音、语感、场景感等丰富模块。当前 prompt 与 skill 内容不一致。

2. **响应体验差**：FloatingPanel 等待全部 AI 响应完成后一次性渲染，用户面对长时间空白 loading 状态。且当前使用手写的简陋 Markdown 渲染器，只支持 `##`、`-`/`•` 和普通文本，无法渲染 skill 模板中的粗体、引用块、表格、代码块等丰富格式。

## Goals

1. 将 `english-intuition.md` skill 作为 AI 调用的 system prompt 源，替换硬编码 prompt。
2. 支持三模式识别（word / phrase / sentence），与 skill 模板对齐。
3. AI 响应改为流式输出，逐字渲染到 FloatingPanel。
4. 使用成熟的 Markdown 渲染库替换手写渲染器，完整支持 skill 输出的所有格式。

## Non-Goals

- 不更换 AI 后端（仍使用 Claude CLI / Codex CLI）。
- 不改变 IPC 通道命名规范。
- 不修改学习日志或卡片生成逻辑（它们消费最终完整响应即可）。

## Feature List

### F1: English Intuition Skill Integration

将 `english-intuition.md` 的内容作为 AI 系统提示，替换 `ai-provider.ts` 中硬编码的 `buildPrompt()` 逻辑。

**变更分析：**

- **Skill 文件位置**：当前在 `packages/app/src/main/services/english-intuition.md`。这个位置合理——它是 main 进程 service 层的一部分，与 `ai-provider.ts` 同目录，运行时通过 `fs.readFile` 读取即可。无需移动。
- **模式扩展**：当前 `detectMode()` 只区分 word/sentence（3词以下=word，否则=sentence）。需要扩展为 word/phrase/sentence 三模式，与 skill 中的判断逻辑对齐：
  - 单个词（含多词词汇如 "break down"）→ word
  - 2-6 个词的习惯用语/chunk/固定搭配，无主谓结构 → phrase
  - 完整句子（有主谓结构）→ sentence
- **Prompt 构建**：不再在代码里硬编码长 prompt。改为运行时读取 skill 文件内容，将其作为 system prompt，附加用户选中的文本和上下文作为 user message。
- **类型同步**：`LookupMode` 从 `'word' | 'sentence'` 扩展为 `'word' | 'phrase' | 'sentence'`。

**Acceptance Criteria:**
- AC-1.1: `buildPrompt()` 不再包含硬编码的模板文本，改为读取 `english-intuition.md` 作为 system prompt。
- AC-1.2: `detectMode()` 正确区分 word/phrase/sentence 三种模式，与 skill 文档中的判断规则一致。
- AC-1.3: AI 调用时将 skill 内容作为 system-level 指令，用户选中文本 + 上下文作为 user message，并明确告知当前模式。
- AC-1.4: `LookupMode` 类型扩展为三值联合类型，相关引用处同步更新。
- AC-1.5: Skill 文件加载失败时（文件不存在等），有明确错误信息返回，不静默失败。

**Priority:** P0
**Dependencies:** None

---

### F2: Streaming Output + Markdown Rendering

将 AI 响应从"等待完整结果"改为流式逐步输出，并使用 `react-markdown` 库完整渲染 Markdown 格式。

**变更分析：**

- **后端流式**：当前 `execFileAsync` 等待进程结束后返回 stdout。改为使用 `child_process.spawn`，逐步读取 stdout 数据，通过 IPC 事件推送给 renderer。
- **IPC 设计**：
  - `ai:explain` 改为启动流式调用，返回 `{ success: true, streamId: string }` 标识流。
  - 新增 `ai:stream-chunk` 事件（main → renderer 推送），携带 `{ streamId, chunk, done }` 。
  - 新增 `ai:stream-cancel` 通道（renderer → main），允许用户取消正在进行的流。
- **前端渲染**：
  - FloatingPanel 监听 `ai:stream-chunk` 事件，增量拼接响应文本。
  - 替换手写的 `AiResponseRenderer` 为 `react-markdown` + `remark-gfm`。
  - 流式过程中显示光标闪烁动画，完成后切换为完整渲染。
- **依赖**：新增 `react-markdown`、`remark-gfm` 到 `packages/app`。

**Acceptance Criteria:**
- AC-2.1: AI 响应在首个 token 到达后立即开始渲染，用户不再面对长时间空白 loading。
- AC-2.2: 流式输出过程中显示打字机效果，有视觉光标指示。
- AC-2.3: 用户可在流式输出过程中关闭面板，关闭时取消后台 CLI 进程，不泄漏资源。
- AC-2.4: Markdown 渲染完整支持：标题(##)、粗体、引用块(>)、列表(- / 1.)、内联代码、表格、emoji。
- AC-2.5: 响应完成后仍可使用 Save 和 Retry 功能，保存的是完整响应文本。
- AC-2.6: `preload/index.ts` 的 `on` 方法已存在，可复用于事件监听，无需修改 preload 层。

**Priority:** P0
**Dependencies:** F1（prompt 格式确定后才能确认流式输出内容正确）

## Suggested Sprint Order

1. **Sprint 1 → F1 (Skill Integration)**: 先确保 prompt 体系正确，这是输出质量的基础。
2. **Sprint 2 → F2 (Streaming + Markdown)**: 在正确 prompt 基础上优化交付体验。

## Risks

1. **CLI 流式兼容性**：`claude -p` 和 `codex -q` 的 stdout 流式行为可能不同，需分别测试。
2. **Markdown 渲染性能**：流式过程中频繁 re-render `react-markdown` 可能有性能问题，可能需要 throttle。
3. **Skill 文件大小**：`english-intuition.md` 内容较长（~185 行），作为 system prompt 会消耗较多 token，但这是必要的 trade-off。
