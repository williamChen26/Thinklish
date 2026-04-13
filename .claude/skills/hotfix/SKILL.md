# /hotfix — Lightweight Bug Fix

轻量级 bug 修复。支持两种模式：**关联模式**（修复已归档 harness 运行的 bug）和**通用模式**（修复任意 bug）。不走完整 Generator/Evaluator 循环，直接修复代码并写入结构化记录。

## Usage

```
/hotfix <run-id> <bug description>    # 关联模式 — 修复某个 harness 运行的遗留 bug
/hotfix <bug description>             # 通用模式 — 修复非 harness 相关的 bug
```

Examples:
```
/hotfix 2026-04-08-ai-provider-settings "选择 Cursor 后 ACP 初始化卡死"
/hotfix "阅读器滚动到底部时出现白屏"
```

## When to Use

- 已完成的 harness 运行在人工测试/使用中发现 bug（关联模式）
- 非 harness 相关的 bug：原始代码缺陷、依赖升级引发的问题、用户报告的 UI bug 等（通用模式）
- Bug 属于实现错误，而非架构缺陷
- 修复范围可控（1-5 个文件，不涉及新 feature）

## When NOT to Use

- Bug 涉及**重大架构变更**（超过 5 个文件或需要新的数据模型） → 启动新的 `/harness` 运行
- Bug 源自 spec 本身的设计缺陷 → 启动 `/planner` 重新规划
- Bug 在**活跃运行**中发现 → 由 Evaluator 正常流程处理
- 要做的是**新功能**而非 bug 修复 → 使用 `/harness`

## Mode Detection

解析用户输入，判断模式：

- 参数匹配 `docs/exec-plans/completed/<run-id>/` 中的某个 `run-id` → **关联模式**
- 否则 → **通用模式**

---

## 关联模式 Protocol

### Step 1: Locate Run

1. Find `docs/exec-plans/completed/<run-id>/`
2. Read `meta.json` — 确认 `status: "completed"`
3. Read `spec.md` — 理解原始需求和 feature 定义

### Step 2: Diagnose

1. 复现或理解 bug 现象
2. 定位受影响的 **feature ID** 和 **sprint number**
3. 读取该 sprint 的 `contract.md` 和 `build-log.md` — 理解原始实现决策
4. 执行根因分析：确定是 Generator 实现错误、Evaluator 验证遗漏、还是 spec 模糊导致

### Step 3: Fix

1. 直接修改代码（scope 应尽量小）
2. 运行 `pnpm typecheck` — 必须通过
3. 如有测试，运行测试确认修复不引入回归

### Step 4: Scope Check

评估修复影响范围：

- **1-3 个文件变更** → 继续 Step 5
- **4-5 个文件变更** → 在 hotfix-log 中标注"边界 hotfix"，继续
- **>5 个文件变更** → **ABORT**，建议用户启动 `/harness` 新运行

### Step 5: Write Records

以下记录操作**全部执行**，确保修复信息进入记录系统：

#### 5a. Create hotfix log

Create `docs/exec-plans/completed/<run-id>/hotfixes/hotfix-log.md`（如已存在则追加）:

```markdown
## HF<N>: <title> (affects <feature-id> / Sprint <sprint-number>)

### 现象
<用户观察到的 bug 行为>

### 根因分析
<为什么原始实现是错的，为什么 Evaluator 没有发现>

### 修复

| 文件 | 变更 |
|------|------|
| `<path>` | <one-line description> |

### 经验教训
<可沉淀的规则或检查项，供未来 agent 参考>
```

#### 5b. Update meta.json

追加 `hotfixes` 数组（如不存在则创建）：

```json
{
  "hotfixes": [
    {
      "id": "HF<N>",
      "affects_feature": "<feature-id>",
      "affects_sprint": "<sprint-number>",
      "title": "<one-line title>",
      "date": "<YYYY-MM-DD>",
      "files": ["<changed file paths>"]
    }
  ]
}
```

更新 `updated_at` 为当前时间。

#### 5c. Update affected build-log

在 `sprints/sprint-<N>/build-log.md` 末尾追加 Errata 段落：

```markdown
## ⚠️ Errata (HF<N> — Post-Sprint Hotfix)

**问题**: <one-line description>
**修复**: <one-line fix description>

详见 [`hotfixes/hotfix-log.md`](../../hotfixes/hotfix-log.md).
```

#### 5d. Update history.log

在 `docs/exec-plans/completed/history.log` 中该运行的行末追加 `| +<N> hotfixes (<brief>)`。

#### 5e. Update completed/README.md

在运行条目中追加 hotfix 计数。

### Step 6: Report

向用户报告：

1. 修复了什么（文件 + 变更摘要）
2. 根因分类（Generator 错误 / Evaluator 遗漏 / spec 模糊）
3. 记录系统中更新了哪些文件
4. 是否有可沉淀的规则建议（应更新到 agent 定义或检查清单中）

---

## 通用模式 Protocol

### Step 1: Diagnose

1. 理解 bug 现象
2. 定位相关代码模块和文件
3. 执行根因分析

### Step 2: Fix

1. 直接修改代码（scope 应尽量小）
2. 运行 `pnpm typecheck` — 必须通过
3. 如有测试，运行测试确认修复不引入回归

### Step 3: Scope Check

评估修复影响范围：

- **1-3 个文件变更** → 继续 Step 4
- **4-5 个文件变更** → 在 fix-log 中标注"边界修复"，继续
- **>5 个文件变更** → **ABORT**，建议用户启动 `/harness` 新运行

### Step 4: Write Records

#### 4a. Create / append fix log

Write to `docs/exec-plans/completed/standalone-fixes.md`（如不存在则创建，如已存在则追加）:

```markdown
## SF-<YYYY-MM-DD>-<N>: <title>

- **日期**: <YYYY-MM-DD>
- **影响模块**: <module or component name>
- **文件**: `<path1>`, `<path2>`

### 现象
<bug 行为描述>

### 根因
<为什么出错>

### 修复
<一句话描述修复方式>

### 经验教训
<可沉淀的规则或检查项>
```

#### 4b. Update history.log

在 `docs/exec-plans/completed/history.log` 末尾追加独立行：

```
SF-<YYYY-MM-DD>-<N> | standalone fix | <title> | <YYYY-MM-DD>
```

### Step 5: Report

向用户报告：

1. 修复了什么（文件 + 变更摘要）
2. 根因分析
3. 记录系统中更新了哪些文件

---

## Relationship to Other Skills

| 场景 | 使用 |
|------|------|
| 新功能开发 | `/harness` |
| 活跃运行中的 bug | `/evaluator sprint` 正常流程处理 |
| 已完成运行的小 bug (1-5 files) | **`/hotfix <run-id> <bug>`** |
| 非 harness 相关的小 bug (1-5 files) | **`/hotfix <bug>`** |
| 重大缺陷 (>5 files) | `/harness` 新运行 |
| Spec 设计错误 | `/planner` 重新规划 |

## Anti-Patterns

1. **Silent fix**: 修了代码但没写记录 — 未来 agent 无法从记录系统中学到教训。
2. **Scope creep**: 在 hotfix 中顺便做功能增强 — hotfix 只修 bug，不加 feature。
3. **Skip typecheck**: 修复后未运行 `pnpm typecheck` — 可能引入新的类型错误。
4. **Blame without learning**: 只说"Evaluator 没发现"但不提出改进检查清单的建议。
5. **Wrong tool**: 用 `/hotfix` 做 feature 开发 — 超过 5 个文件变更必须用 `/harness`。
