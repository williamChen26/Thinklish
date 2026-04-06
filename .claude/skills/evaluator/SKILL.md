---
name: evaluator
description: "Evaluator agent skill: review sprint contracts or evaluate sprint implementations. Quality gate with hard thresholds."
user_invocable: true
---

# /evaluator — Sprint Evaluator

Operates in two modes: **contract review** or **sprint evaluation**.

## Usage

```
/evaluator contract <run-id>    # Review proposed sprint contract
/evaluator sprint <run-id>      # Evaluate sprint implementation
```

## Mode: Contract Review

### Step 1: Resolve Run

Locate `docs/exec-plans/active/<run-id>/`. Verify `current_sprint.status` is `"contracting"`.

### Step 2: Gather Context

- `sprints/sprint-<N>/contract.md` — proposed contract
- `spec.md` — big picture
- `meta.json` — completion status

### Step 3: Invoke Evaluator Agent (contract review mode)

Spawn Evaluator agent (`model: opus`) with:
- Agent instructions from `.claude/agents/evaluator.md` (Mode 1 section)
- Gathered context
- Instruction to review the contract and write verdict

### Step 4: Process Verdict

**APPROVED:**
- Update `current_sprint.status → "approved"`
- Report: "Contract approved. Run `/generator build <run-id>` to start implementation."

**REVISE:**
- Write Evaluator's feedback to `sprints/sprint-<N>/contract-feedback.md`
- Update `current_sprint.status → "contracting"` (Generator needs to revise)
- Report: what needs to change. Prompt: "Run `/generator contract <run-id>` to revise."

---

## Mode: Sprint Evaluation

### Step 1: Resolve Run

Verify `current_sprint.status` is `"evaluating"`.

### Step 2: Gather Context (Progressive Disclosure)

- `sprints/sprint-<N>/contract.md` — grading rubric
- `sprints/sprint-<N>/build-log.md` — Generator's self-assessment (cross-reference only)
- Actual code changes (read modified files from build-log)
- Run tests independently
- Previous feedback (if round 2+)

### Step 3: Invoke Evaluator Agent (evaluation mode)

Spawn Evaluator agent (`model: opus`) with:
- Agent instructions from `.claude/agents/evaluator.md` (Mode 2 section)
- Gathered context
- Instruction to: evaluate every criterion → write `evaluation.md` → if FAIL write `feedback.md`

### Step 4: Process Verdict

**PASS:**
```json
{
  "current_sprint": { "status": "passed" },
  "spec_features": [{ "id": "F-X", "status": "completed" }],
  "sprint_history": [..., { "number": N, "feature_id": "F-X", "rounds": M, "verdict": "passed" }]
}
```

Check if more features remain:
- **Yes**: Report success + "Run `/generator contract <run-id>` for the next sprint."
- **No**: Set `status → "completed"`. Report: all features implemented.

**FAIL + rounds remain:**
```json
{
  "current_sprint": { "status": "revising", "round": <M> }
}
```

Create `sprints/sprint-<N>/iterations/round-<M+1>/` directory.
Report: which criteria failed. Prompt: "Run `/generator build <run-id>` to address feedback."

**FAIL + max rounds reached:**
```json
{
  "current_sprint": { "status": "failed" },
  "sprint_history": [..., { "verdict": "failed" }]
}
```

Report: max iterations reached. Recommend: skip this feature and continue, or escalate to human.

**REPLAN:**
Set `status → "failed"`. Report: Evaluator recommends replanning. Suggest `/planner` with refined requirements.

> **Note:** Evaluator 的工作到 Step 4 结束。归档（`active/` → `completed/`）由 Harness Phase 3 负责，不属于 Evaluator 职责。
