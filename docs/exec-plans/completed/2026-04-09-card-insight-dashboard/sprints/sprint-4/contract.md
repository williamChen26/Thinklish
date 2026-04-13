# Sprint 4 Contract: F4 — 可筛选的全量卡片清单

## Feature

**F4:** 可筛选的全量卡片清单（P1）

## Scope

在 CardOverviewView 的仪表盘下方添加**全量卡片列表**，支持按 F2 分桶（全部/待复习/复习中/已掌握）筛选。每条展示正面文本预览、状态标签和下次复习时间。列表从仪表盘点击图例可直接筛选。

### Deliverables

1. **`core/src/cards/repository.ts`** — 新增 `getCardsWithBucket()` 函数，返回带 bucket 字段的卡片列表。
2. **`shared/src/types/card.ts`** — 新增 `CardBucket` 类型和 `CardWithBucket` 接口。
3. **IPC + API 层** — 新增 `cards:getAllWithBucket` 通道。
4. **`CardOverviewView.tsx`** — 在仪表盘下方添加筛选器 + 列表。

## Out of Scope

- 卡片详情页或编辑功能
- 从列表直接开始复习（跳转到 Review 页面除外）
- F5：侧边栏数字一致性
- 分页（当前规模不需要虚拟滚动）

## Acceptance Criteria & Verification

| AC | 标准 | 验证方法 |
|----|------|----------|
| AC-4.1 | 列表默认展示全部卡片，条数与仪表盘总数一致 | **运行时**：进入总览页，滚动到列表区域，确认卡片数等于仪表盘总数。 |
| AC-4.2 | 可按 全部/待复习/复习中/已掌握 筛选，筛选后条数与仪表盘对应数字一致 | **运行时**：切换筛选器，确认每个筛选下的列表条数匹配仪表盘数字。 |
| AC-4.3 | 每条展示可识别的正面内容预览；过长文本截断不破坏布局 | **运行时**：确认列表项显示正面文本，长文本有 truncate 处理。 |
| AC-4.4 | 列表项展示状态标签和下次复习时间 | **运行时**：确认每条列表项有彩色状态标签和日期信息。 |
| AC-4.5 | 空筛选结果展示明确空状态 | **运行时**：选择某个无卡片的筛选条件，确认显示空状态文案而非空白。 |
| T1 | 类型安全 | **命令**：`pnpm typecheck` 通过。 |

## Technical Approach

在 core 层新增 `getCardsWithBucket()` 用 SQL CASE WHEN 给每张卡片打上 bucket 标签（due/learning/mastered），一次查询返回全量带 bucket。renderer 端本地筛选（避免每次筛选都 IPC 往返）。列表放在仪表盘图表下方，用 select 筛选器。每个列表项是一行：正面预览（HTML stripped to text, truncated）+ 状态色块 + 下次复习相对时间。

## Dependencies

- F2（CardStats 分桶语义）
- F3（仪表盘已在页面上）

## Estimated Complexity

**中**：新增 IPC + 列表 UI，核心是 SQL 打 bucket 标签和前端筛选逻辑。
