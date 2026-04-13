# AGENTS

这个仓库采用智能体优先工作流。

## 优先级

1. 保持仓库可读、可导航、可验证。
2. 让重要上下文进入仓库，而不是停留在聊天记录里。
3. 通过小而清晰的变更持续推进，不靠大块临时说明。
4. 将反复出现的人工判断沉淀为文档、脚本或检查规则。

## 从哪里开始

- 阅读 `README.md` 了解仓库目标。
- 阅读 `ARCHITECTURE.md` 理解顶层结构与边界。
- 阅读 `docs/README.md` 找到当前任务对应的知识位置。
- 做复杂任务前，先看 `docs/exec-plans/active/`。

## 工作方式

- 把 `AGENTS.md` 当作地图；细节应写入 `docs/`。
- 如果新增需求、约束、决策或例外，优先补文档。
- 如果一个规则会被反复提醒，优先把它变成脚本或 CI 检查。
- 小改动可以直接做；复杂改动先写执行计划。
- 不要把关键知识只放在 PR 描述、聊天或脑海里。

## Harness 编排系统 (Ralph Loop)

本仓库配备 sprint-based 三智能体 harness 编排系统。

### 入口命令

| 命令 | 作用 |
|------|------|
| `/harness <需求>` | 完整 ralph loop |
| `/planner <需求>` | 仅规划，生成 spec |
| `/generator contract/build <run-id>` | 提合同 / 实现 sprint |
| `/evaluator contract/sprint <run-id>` | 审合同 / 验收 sprint |
| `/hotfix [run-id] <bug>` | 轻量级 bug 修复（有 run-id 关联 harness 运行，无则通用模式） |

### 智能体定义

| Agent | 文件 | 职责 |
|-------|------|------|
| Planner | `.claude/agents/planner.md` | 需求 → 大蓝图 spec (feature list + AC) |
| Generator | `.claude/agents/generator.md` | 提 sprint 合同 + TDD 实现 |
| Evaluator | `.claude/agents/evaluator.md` | 审合同 + 硬阈值质量验收 |

### 运行状态

Sprint 运行状态存储在 `docs/exec-plans/active/<run-id>/`，详见 `docs/exec-plans/index.md`。

## 仓库地图

- `docs/design-docs/`: 核心理念、设计决策、验证状态。
- `docs/product-specs/`: 用户问题、范围、验收标准。
- `docs/exec-plans/active/`: 正在执行的计划和 sprint 运行。
- `docs/exec-plans/completed/`: 已完成计划与复盘。
- `docs/exec-plans/tech-debt-tracker.md`: 技术债登记。
- `docs/generated/`: 由工具生成、但值得版本化的资料。
- `docs/references/`: 外部参考与内部规范摘录。

## 变更约束

- 任何重大结构调整都要同步更新 `ARCHITECTURE.md`。
- 任何产品行为变化都要同步更新对应 `product-specs`。
- 任何长期性经验都应沉淀到 `design-docs` 或顶层专题文档。
- 提交前运行 `./scripts/check_repo_docs.sh`。

## 风格原则

- 优先清晰命名与稳定结构。
- 优先显式边界，而不是隐式耦合。
- 优先可组合、可测试、可检查的实现。
- 优先未来智能体也能快速接手的产物。
