# Hotfix Log — 2026-04-10-rss-subscription

## HF1: 已有数据库启动时 createTables 崩溃 (affects F2 / Sprint 2)

### 现象

执行 `pnpm dev` 后 Electron app 无法打开，主进程在 `createTables` 中抛出 `SqliteError: no such column: feed_item_id`，导致窗口不显示。

### 根因分析

`schema.ts` 的 `createTables` 函数中，`CREATE INDEX IF NOT EXISTS idx_articles_feed_item_id ON articles(feed_item_id)` 被放在主 `db.exec()` 批量 SQL 块中，与 `CREATE TABLE IF NOT EXISTS` 语句一起执行。

对于已有数据库（RSS 功能之前创建的），`articles` 表已存在但没有 `feed_item_id` 列。`CREATE TABLE IF NOT EXISTS` 不会修改已有表结构，而 `migrateArticlesFeedColumns` 迁移函数在主 `db.exec()` 之后才执行。因此索引创建语句引用了尚不存在的列，导致 SQLite 报错。

这是 Generator 在 Sprint 2 实现时的疏忽：将新列的索引放在了迁移函数之前。Evaluator 未能发现此问题，因为测试用的是全新数据库（所有列都存在），没有覆盖"已有旧表 + 迁移"的场景。

### 修复

| 文件 | 变更 |
|------|------|
| `packages/core/src/database/schema.ts` | 从主 `db.exec()` 块中移除 `CREATE INDEX ... idx_articles_feed_item_id`。该索引已在迁移函数之后的独立 `db.exec()` 调用中正确创建。 |

### 经验教训

- **迁移列的索引必须在迁移函数之后创建**：当 `CREATE TABLE IF NOT EXISTS` 包含新列时，对于已存在的旧表不会添加这些列。所有引用新列的 `CREATE INDEX` 语句必须放在 `ALTER TABLE ADD COLUMN` 迁移执行之后。
- **Evaluator 应增加"旧数据库升级"测试场景**：仅测试全新数据库无法覆盖迁移路径。建议在 schema 相关 AC 中增加"pre-existing DB migration"检查项。
