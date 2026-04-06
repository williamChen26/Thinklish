# Sprint 2 Contract: F2 — Article Acquisition Pipeline

## Feature
F2: Article Acquisition Pipeline

## Scope

实现从 URL 输入到文章存储展示的完整管道：URL → 抓取 → 内容提取 → SQLite 存储 → 列表展示。

### Deliverables

1. **Core — Article Repository**: CRUD 操作（create, getAll, getById, delete）
2. **App/Main — Article Extractor**: fetch URL + @mozilla/readability 提取正文
3. **App/Main — IPC Handlers**: articles:add, articles:getAll, articles:getById, articles:delete, articles:addManual
4. **App/Renderer — Articles View**: 文章列表 + URL 输入 + 加载/错误状态
5. **Fallback**: 提取失败时支持手动粘贴标题+正文

### Non-Scope
- 不实现阅读视图（Sprint 3）
- 不实现文章编辑
- 不实现分页（MVP 阶段文章量不大）

## Test Criteria

| # | 标准 | 验证方法 |
|---|------|---------|
| T1 | 粘贴 URL 后 10s 内文章出现在列表 | 手动测试 |
| T2 | 抓取结果含标题、正文、来源域名 | 检查数据库记录 |
| T3 | 抓取失败时显示错误提示 | 输入无效 URL |
| T4 | 手动粘贴正文可作为 fallback | UI 交互 |
| T5 | 应用重启后文章不丢失 | 重启验证 |
| T6 | `pnpm build` 通过 | 运行命令 |
