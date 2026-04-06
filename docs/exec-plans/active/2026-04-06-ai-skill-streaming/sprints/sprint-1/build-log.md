# Sprint 1 Build Log: English Intuition Skill Integration

## Changes Made

### New: `packages/app/src/main/env.d.ts`
- 为 main 进程添加 `*.md?raw` 模块类型声明，支持 Vite raw import

### Updated: `packages/app/tsconfig.node.json`
- `include` 添加 `src/main/**/*.d.ts`，确保新增的类型声明被 TypeScript 识别

### Rewritten: `packages/app/src/main/services/ai-provider.ts`
- **删除** 本地 `LookupMode` 类型，改用 `@english-studio/shared` 的 `LookupType`（已有 word/phrase/sentence）
- **导入** `english-intuition.md?raw` 作为 build-time 内联字符串
- **新增** `stripFrontmatter()` 剥离 YAML frontmatter
- **更新** `detectMode()` 返回 `LookupType`，三模式判断：1词=word, 2-6词无句号=phrase, 其余=sentence
- **重写** `buildPrompt()` 不再硬编码模板，改为：skill 内容作为指令 + 用户选中文本/上下文/模式作为请求
- **保持** `explainText()` 和 `findCli()` 接口不变，FloatingPanel 无感知

## Verification

- `tsc --noEmit -p tsconfig.node.json`: PASS (exit 0)
- Linter: 0 errors
- IPC handler (`ai.ts`): 无需修改，函数签名兼容

## Decisions

1. **Skill 文件位置不动**: `services/english-intuition.md` 与 `ai-provider.ts` 同目录，通过 `?raw` import 在构建时内联，无运行时文件路径依赖。
2. **Prompt 结构**: skill 全文作为指令部分 → 分隔线 → 用户选中文本+上下文+模式标签。CLI 会将整个内容作为 user message 发送。
3. **模式提示**: prompt 中包含 `MODE_LABEL` 提示 AI 使用对应模板，但 skill 自身的"输入类型判断"表也会生效，两者互为补充。
