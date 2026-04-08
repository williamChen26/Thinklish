# Exec Plans Index

这里存放执行计划、完成记录和技术债追踪。

## 目录

- [`active/`](active/README.md): 正在执行的计划和 harness 运行
- [`completed/`](completed/README.md): 已完成的计划与复盘
- [`tech-debt-tracker.md`](tech-debt-tracker.md): 技术债登记

## 计划类型

| 类型 | 格式 | 适用场景 |
|------|------|----------|
| **Harness 运行** | `active/<run-id>/` 目录 | `/harness` 启动的 sprint-based 功能开发 |
| **执行计划** | `active/<name>.md` 单文件 | 跨模块复杂任务的手动计划 |
| **轻量计划** | PR 描述或 commit message | 单模块小改动 |

## Harness 运行结构 (Ralph Loop)

通过 `/harness` 启动的运行采用 sprint-based ralph loop:

```
Planner 产出 spec (大蓝图)
       │
       ▼
while (spec 中还有未实现功能):
       │
       ├─ Generator: 从 spec 中 pick 一个 feature → 提出 sprint contract
       ├─ Evaluator: 审 contract (scope 是否合理)
       ├─ Generator: 实现该 sprint
       ├─ Evaluator: 验收 (PASS / FAIL)
       │     ├─ FAIL → Generator 返工 (max 3 rounds)
       │     └─ PASS → 更新状态，进入下一个 sprint
       │
       ▼
所有功能完成 → 运行结束
```

### 目录结构

```
active/<run-id>/
  meta.json                    # 运行元数据、全局状态
  spec.md                      # Planner 产出: 高层规格 (大蓝图)
  sprints/
    sprint-1/
      contract.md              # Generator 提出、Evaluator 审定的 sprint 合同
      build-log.md             # Generator 实现日志 + 自评
      evaluation.md            # Evaluator 验收结果（必须产出）
      iterations/
        round-2/
          feedback.md          # Evaluator 返工反馈
          changes.md           # Generator 返工记录
    sprint-2/
      contract.md
      build-log.md
      evaluation.md
    ...
  hotfixes/                    # Post-completion 修复记录（归档后由 /hotfix 创建）
    hotfix-log.md              # 结构化 hotfix 记录（现象、根因、修复、教训）
```

### meta.json schema

```json
{
  "id": "2026-04-01-rss-reader",
  "status": "planning | sprinting | completed | failed",
  "task": "原始用户需求",
  "created_at": "ISO",
  "updated_at": "ISO",
  "spec_features": [
    { "id": "F1", "name": "OPML import", "status": "completed" },
    { "id": "F2", "name": "Feed subscription", "status": "in_progress" },
    { "id": "F3", "name": "Article reader", "status": "pending" }
  ],
  "current_sprint": {
    "number": 2,
    "feature_id": "F2",
    "status": "generating | evaluating | revising | passed | failed",
    "round": 1,
    "max_rounds": 3
  },
  "sprint_history": [
    {
      "number": 1,
      "feature_id": "F1",
      "rounds": 2,
      "verdict": "passed",
      "started": "ISO",
      "completed": "ISO"
    }
  ],
  "hotfixes": [
    {
      "id": "HF1",
      "affects_feature": "F1",
      "affects_sprint": 1,
      "title": "简述修复内容",
      "date": "YYYY-MM-DD",
      "files": ["changed/file/paths"]
    }
  ]
}
```

### 状态机

```
PLANNING
    │
    ▼
SPRINTING ──────────────────────────────┐
    │                                    │
    ├─ CONTRACTING (Generator 提合同)    │
    │       │                            │
    │       ▼                            │
    ├─ CONTRACT_REVIEW (Evaluator 审合同) │
    │       │                            │
    │       ▼                            │
    ├─ GENERATING (Generator 实现)       │
    │       │                            │
    │       ▼                            │
    ├─ EVALUATING (Evaluator 验收)       │
    │       │                            │
    │  ┌────┴────┐                       │
    │  ▼         ▼                       │
    │ PASS    REVISING ──→ GENERATING    │
    │  │      (max 3)                    │
    │  ▼                                 │
    │ 还有功能? ──yes──→ 下一个 sprint ──┘
    │  │
    │  no
    │  │
    ▼  ▼
COMPLETED
```

## 文件即记忆 (Context Reset Protocol)

每个 agent 每次执行都从干净上下文开始。它通过读取记录系统中的文件来"回忆"之前发生了什么：

| Agent 需要知道什么 | 从哪里读 |
|-------------------|---------|
| 项目大蓝图 | `spec.md` |
| 哪些功能已完成 | `meta.json → spec_features` |
| 当前 sprint 要做什么 | `sprints/sprint-N/contract.md` |
| 上一轮 Evaluator 的反馈 | `sprints/sprint-N/iterations/round-M/feedback.md` |
| 之前 sprint 的实现决策 | `sprints/sprint-{1..N-1}/build-log.md` |

这就是为什么每一步的产出都必须写入记录系统——它们是下一个 agent 的输入。

## 生命周期

1. `/harness` 在 `active/<run-id>/` 创建运行目录
2. Planner 产出 `spec.md`
3. Sprint 循环推进，每个 sprint 在 `sprints/sprint-N/` 下产出
4. 所有功能完成后，**Harness Phase 3** 将运行目录移动到 `completed/<run-id>/`（归档由 Harness 全权负责，见 `.claude/skills/harness/SKILL.md`）
5. 补技术债记录到 `tech-debt-tracker.md`
6. （可选）人工测试发现 bug → **`/hotfix`** 修复代码并写入记录

### /hotfix 修复路径

`/hotfix` 支持两种模式，覆盖所有轻量级 bug 修复场景：

```
发现 bug
    │
    ├─ 与某个 harness 运行相关？
    │     │
    │     yes → /hotfix <run-id> <bug>    (关联模式)
    │     │     ├─ completed/<run-id>/hotfixes/hotfix-log.md
    │     │     ├─ meta.json  (追加 hotfixes 数组)
    │     │     ├─ build-log.md  (追加 Errata)
    │     │     └─ history.log + README.md
    │     │
    │     no → /hotfix <bug>              (通用模式)
    │           └─ completed/standalone-fixes.md
    │           └─ history.log  (追加独立行)
    │
    └─ 影响范围 >5 files？ → 启动新的 /harness 运行
```

**记录文件位置：**

| 模式 | 主记录 | 辅助记录 |
|------|--------|---------|
| 关联模式 | `completed/<run-id>/hotfixes/hotfix-log.md` | `meta.json`, `build-log.md`, `history.log`, `README.md` |
| 通用模式 | `completed/standalone-fixes.md` | `history.log` |

## 计划模板 (手动执行计划)

每份手动执行计划至少包含：

1. 背景与目标
2. 范围与非目标
3. 实施步骤
4. 风险与回滚思路
5. 验证方法
6. 决策日志
