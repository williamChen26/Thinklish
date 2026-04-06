# Sprint 4 Contract: F4 — Selection & AI Floating Window

## Feature
F4: Selection & AI Floating Window

## Scope

1. **Text Selection Hook**: 检测阅读器中文本选中，获取选中文本、上下文、位置
2. **AI CLI Service**: 调用 Claude Code CLI (`claude`) 获取 AI 解释
3. **Prompt Engineering**: 区分 word/sentence 模式，输出英语思维/语感/场景
4. **Floating Panel UI**: 选中后弹出浮窗，显示 AI 解释，支持加载/重试/收起/保存
5. **IPC**: ai:explain handler

### Non-Scope
- 不实现学习日志记录（Sprint 5）
- 不实现流式输出（P1 增强）
- 不实现多 AI provider 切换

## Test Criteria

| # | 标准 |
|---|------|
| T1 | 选中文本后 200ms 内浮窗出现 |
| T2 | AI 调用成功时显示格式化解释 |
| T3 | CLI 调用失败时显示错误 + 重试按钮 |
| T4 | 单词模式输出 ≥ 4 项（含义/语感/搭配/例句） |
| T5 | `pnpm build` 通过 |
