# Sprint 1 Contract: English Intuition Skill Integration

## Scope

将 `ai-provider.ts` 中硬编码的 prompt 替换为运行时加载 `english-intuition.md` skill 文件内容。扩展模式检测为三模式。

## Deliverables

### D1: Skill 文件 build-time 导入

- 使用 Vite 的 `?raw` 导入将 `english-intuition.md` 内容在构建时内联为字符串常量
- 新增 `packages/app/src/main/env.d.ts` 提供 `*.md?raw` 的 TypeScript 类型声明
- 更新 `tsconfig.node.json` 确保包含 `.d.ts` 文件

### D2: 三模式检测

- 删除本地 `LookupMode` 类型，改用 `@english-studio/shared` 的 `LookupType`（已有 word/phrase/sentence 三值）
- 更新 `detectMode()` 逻辑：
  - 1 词 → `'word'`
  - 2-6 词且无句子标点 → `'phrase'`
  - 其余 → `'sentence'`

### D3: Prompt 重构

- 删除 `buildPrompt()` 中的硬编码模板文本
- 新建 `buildPrompt()` 逻辑：将 skill 内容（去除 YAML frontmatter）+ 用户选中文本/上下文组合为单一 prompt
- Prompt 结构：skill 作为指令部分，选中文本+上下文+模式作为用户请求部分

### D4: 导出对齐

- `explainText()` 返回类型不变（`AiResult`），兼容现有 IPC 和 FloatingPanel 消费
- `detectMode()` 返回类型从 `LookupMode` 改为 `LookupType`

## Files Changed

| File | Action |
|------|--------|
| `packages/app/src/main/services/ai-provider.ts` | 重写 |
| `packages/app/src/main/env.d.ts` | 新建 |
| `packages/app/tsconfig.node.json` | 更新 include |

## Out of Scope

- 不修改 FloatingPanel（Sprint 2）
- 不修改 IPC handler 签名
- 不修改 preload 层
- 不修改 shared 包（`LookupType` 已经是三值）

## Acceptance Criteria

- [ ] `buildPrompt()` 不含硬编码英文/中文模板文本
- [ ] `detectMode()` 返回 `LookupType`，三模式判断逻辑正确
- [ ] Skill 文件内容在构建时正确内联
- [ ] `pnpm typecheck` 通过（或受限于开发环境时，无新增类型错误）
- [ ] 现有 IPC 接口不变，FloatingPanel 无感知
