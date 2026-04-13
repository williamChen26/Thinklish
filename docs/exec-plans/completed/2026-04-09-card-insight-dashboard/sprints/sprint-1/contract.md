# Sprint 1 Contract: F1 — 卡片总览主导航入口与页面骨架

## Feature

**F1:** 卡片总览主导航入口与页面骨架（P0）

## Scope

在主导航中增加「卡片总览 / 卡片仪表盘」入口，并实现该区域的顶层页面骨架：标题、简短说明、**与数据状态一致**的空状态与加载表现；不包含统计分桶、图表或可筛选列表（留给后续 sprint）。

### Deliverables

1. **`Sidebar.tsx`**
   - 扩展 `NavItem`（例如新增 `'cardOverview'`，名称与标签与产品文案一致，如「Card overview」或「卡片总览」）。
   - 在 `NAV_ITEMS` 中增加对应项（图标/排序位置与现有三条目风格一致）。
2. **`App.tsx`**
   - 在 `activeNav === 'cardOverview'` 时渲染新的总览视图组件。
   - 保持与现有 `articles` / `log` / `review` 切换逻辑一致（切换主导航时可按需清空子状态，与当前 `handleNavChange` 行为对齐）。
3. **`CardOverviewView.tsx`（或等价命名）**
   - 页面级标题与一两句说明（总览用途）。
   - 通过现有 `cardsAPI.getAll()`（或经 `preload`/IPC 的等价只读接口）拉取卡片列表以判断「是否有卡片」；**加载中**与 **加载完成且 0 张** 使用不同 UI，文案不得与「无卡片」混用。
   - **空状态（0 张卡）**：明确引导用户前往 **Learning Log** 通过已有「生成卡片」流程创建卡片；**不得**展示全零图表、假数据仪表盘或易被理解为错误的提示。
   - **有卡片时**：本 sprint 仅保留简短确认性文案或占位区块即可（例如「后续将在此展示统计与图表」），**不得**实现 F2/F3 的指标与可视化。

## Acceptance Criteria & Verification

| AC | 标准 | 验证方法 |
|----|------|----------|
| AC-1.1 | 用户可从侧边栏主导航直接进入卡片总览，无需隐藏手势 | **运行时**：启动应用（`pnpm --filter @thinklish/app dev`），在侧边栏可见并点击新入口，主区域切换至总览页。 |
| AC-1.2 | 无卡片时展示明确空状态，包含：(a) 告知用户当前无卡片，(b) 引导用户前往 Learning Log 生成卡片的说明文案，(c) 无误导性全零图表、假数据仪表盘或错误提示 | **运行时**：在空库（无 cards 记录）下进入总览页，目视确认：①存在引导文案提及 Learning Log 或生成卡片；②页面无图表、进度条等零值可视化组件；③文案不含 "error"/"失败" 等错误语义。 |
| AC-1.3 | 数据未就绪时展示可理解的加载/占位；文案与「无卡片」区分 | **运行时**：在慢速环境或通过暂时延迟 `getAll` 解析（开发期）观察：加载阶段不出现「您还没有卡片」类空状态文案；加载结束后才根据 `length === 0` 显示空状态。 |
| AC-1.4 | 用户可从总览返回文章 / 日志 / 复习等已有核心区 | **运行时**：在总览页依次点击 Articles、Learning Log、Review，主区域均正确切换，无单页困住。 |

补充 **可执行** 工程校验（与手工运行时互补）：

| # | 标准 | 验证方法 |
|---|------|----------|
| T1 | 类型与构建无回归 | **命令**：`pnpm --filter @thinklish/app typecheck` 与 `pnpm --filter @thinklish/app build` 均成功退出。 |
| T2 | `NavItem` 联合类型扩展后，所有取值均被 Sidebar 与 App 条件分支覆盖 | **命令**：`pnpm typecheck` 全量通过（TypeScript 的穷尽性检查会捕获未覆盖的联合成员）+ **运行时**：逐一点击所有侧边栏导航项确认均可正常切换。 |

## Technical Approach

在 `Sidebar` 的 `NavItem` 联合类型与 `NAV_ITEMS` 中增加 `cardOverview`（或最终选定 id），与现有 `articles | log | review` 并列。新建 `CardOverviewView`，在 `useEffect` 中调用已有 `cardsAPI.getAll()`，用本地 `status: 'loading' | 'ready'` 与 `cards.length` 三分支渲染：加载骨架/文案、空状态、有卡时的极简占位。`App.tsx` 增加与 `LearningLogView` 同级的一路条件渲染。不新增 IPC；复用 `cards:getAll` 即可满足 F1 的空/非空判断。样式与文案沿用当前 `ReviewView` 加载/空状态模式的 spacing 与 `text-muted-foreground` 层次。

## Out of Scope

- F2：卡片聚合指标与状态分桶（待复习 / 复习中 / 已掌握等）。
- F3：洞察仪表盘图表与可视化。
- F4：可筛选全量卡片列表。
- F5：与侧边栏复习角标数字的跨界面一致性改造。
- 新增复习角标、导出 TSV、或修改 Anki 复习算法与数据库 schema。

## Dependencies

- **无外部 spec 依赖**：不依赖 F2–F5。
- **代码依赖**：`packages/app/src/renderer/src/lib/api.ts` 中 `cardsAPI.getAll` 及既有 Electron IPC `cards:getAll`。

## Estimated Complexity

**低～中**：改动集中在 renderer 三处（Sidebar、App、新视图），无 main 进程与 schema 变更；主要复杂度在于加载/空/有卡三态文案与 UI 边界清晰，避免与后续图表 sprint 混淆。
