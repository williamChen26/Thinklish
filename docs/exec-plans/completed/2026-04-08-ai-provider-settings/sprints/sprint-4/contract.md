# Sprint 4 Contract: F3 — FloatingPanel AI Provider Display

## Feature
F3: FloatingPanel AI Provider Display

## Scope

在 FloatingPanel 右上角（header 区域）显示当前使用的 AI agent 名称。

### Deliverables

1. **FloatingPanel 新增 `agentName` state**: 从 `aiAPI.explain` 返回的 `agentName` 中获取
2. **Header 标签**: 在关闭按钮左侧显示小字号 muted 颜色的 agent 名称标签
3. **Auto 模式显示实际 agent**: 不显示 "Auto"，而是显示实际选择的 agent 名

### Non-Scope
- 不修改后端逻辑（Sprint 3 已完成）
- 不修改设置 UI

## Test Criteria

| # | 标准 | 验证方法 |
|---|------|---------|
| T1 | Header 右上角显示 agent 名称 | 代码审查 |
| T2 | 标签样式 muted、不抢视觉焦点 | 代码审查 |
| T3 | Auto 模式显示实际 agent 名 | 代码逻辑审查 |
| T4 | `pnpm build && pnpm typecheck` 通过 | 运行命令 |
