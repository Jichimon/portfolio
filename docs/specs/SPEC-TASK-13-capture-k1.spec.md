# SPEC-TASK-13: Capture the K1 iteration count in every work log

```yaml
spec_id: SPEC-TASK-13
title: Capture K1 (implement→verify iterations) in the work-item done block
status: active
version: 1.0
date: 2026-08-19
approved_version: 1.0
work_item: TASK-13
intent: "Every completed work log records how many human-visible implement→verify cycles it took, in a shape a future evaluator reads without interpreting prose — because K1 is currently unmeasurable for two reasons, and this closes the one that is a procedure gap rather than a lack of runs."

tdd: required
tdd_rationale:
reproduces:

governed_by: []
related_docs:
  - docs/harness/contracts.md
  - .claude/skills/work-item/SKILL.md
  - progress/README.md

behaviors:
  - id: K1-001
    given: "a progress log dated on or after the iterations convention's start date, carrying a `done:` block"
    when: "check-procedures validates it"
    then: "the block must include an `iterations` dimension, or the check fails naming the file — mirroring the existing doneBlockRequiredFrom convention, not inventing a new mechanism"
    priority: critical
    status: planned
    edge_cases:
      - "a log predating the convention's start date is not retroactively required, same precedent as doneBlockRequiredFrom"
      - "a log with no done block at all is already caught by the existing check; this behavior only adds a presence requirement inside a block that exists"
    tests:
      - "procedures.test.mjs :: RED: a dated done block missing `iterations` is caught"
      - "procedures.test.mjs :: green path: a done block carrying `iterations` passes"

  - id: K1-002
    given: "a done block's `iterations` dimension with status `passed`"
    when: "validated"
    then: "its evidence's first entry must be a bare non-negative integer (matches ^\\d+$) — not a sentence — because a future evaluator (EVAL-001) reads it without interpreting English"
    priority: critical
    status: planned
    edge_cases:
      - "evidence holding a sentence like \"two passes\" is caught, distinctly from evidence being absent (which K1-001's sibling rule, existing validateDone, already catches)"
      - "status `not_applicable` (a work item with no implement/verify cycle at all, e.g. pure documentation) needs a reason instead, per the existing done-block rule — no new rule needed there"
    tests:
      - "procedures.test.mjs :: RED: `iterations` evidence that is not a bare integer is caught"
      - "procedures.test.mjs :: green path: `iterations: { status: passed, evidence: [\"2\"] }` passes"

  - id: K1-003
    given: "a work item running through the work-item procedure's Close step"
    when: "the human closes it"
    then: "the procedure instructs recording the iterations count as human-visible implement→verify cycles — a checkpoint round, a delegated slice returning for verification, or a rejected artifact sent back — never a tool-call count, which would move for reasons unrelated to INC-01's failure"
    priority: normal
    status: planned
    edge_cases: []
    tests:
      - "procedures.test.mjs :: LIVENESS: work-item/SKILL.md's Close step mentions capturing iterations"

constraints:
  - "The existing `doneBlockRequiredFrom` convention and mechanism are reused, not duplicated — a second, parallel cutoff (`iterationsRequiredFrom`) in guards.config.json, same shape, same rationale field."
  - "No attempt to auto-count iterations from the trace. The work item's own constraint is explicit: an iteration is human-visible, not a tool call — counting tool calls would produce a number that moves for reasons unrelated to what K1 measures. Capture stays a human-written number, only its presence and shape are mechanized."
  - "The cutoff date lands on 2026-08-19, same day as this session's earlier documentation-only log (Part A, TASK 5 item 8 closure). That log gets an `iterations: { status: not_applicable, reason: \"documentation-only closure, no implement/verify cycle\" }` line added during this item's Reconcile step, for consistency with its own filename date — not because it needs a real count."

out_of_scope:
  - "TASK 14 (done-blocks detect ANY omitted dimension, type-derived). This spec adds presence-checking for exactly one named dimension (`iterations`); the general mechanism for every dimension is TASK 14's job and stays separate."
  - "Reading K1 out of the logs and reporting a number — that is EVAL-001, a future eval case. This spec only makes the number exist somewhere `check-procedures` can already parse."
```

## Intent

`docs/harness/contracts.md` §6 calls K1 (implement→verify passes until the human accepts done) *"the single most important number here"*, and `EVAL-000` reported it unmeasurable for two independent reasons: no work item had completed under the harness, and no procedure step captured an iteration count even when one did. TASK 7 is about to become the first real work item to run through the harness end to end — this spec closes the second reason before that run starts, so its K1 is a measurement instead of an anecdote.

## Behaviors

### K1-001 — a dated done block must carry an `iterations` dimension · `critical` · `planned`

- **Given** a progress log dated on/after the iterations convention's start date, with a `done:` block
- **When** `check-procedures` runs
- **Then** a missing `iterations` dimension is a finding naming the file, reusing the same date-cutoff mechanism already proven for `doneBlockRequiredFrom`
- **Edge cases:** logs predating the cutoff are exempt; logs with no done block at all are already caught by the existing rule
- **Governed by:** none (no ADR yet — this is a harness/procedure change, not a stack decision)
- **Tests:** `procedures.test.mjs`

### K1-002 — the count is machine-readable, not prose · `critical` · `planned`

- **Given** an `iterations` dimension with `status: passed`
- **When** validated
- **Then** `evidence[0]` must be a bare integer; a sentence is caught as a distinct finding from missing evidence
- **Edge cases:** `not_applicable` with a reason remains legitimate (no implement/verify cycle occurred at all)
- **Governed by:** none
- **Tests:** `procedures.test.mjs`

### K1-003 — the work-item procedure instructs capturing it · `normal` · `planned`

- **Given** the Close step of `.claude/skills/work-item/SKILL.md`
- **When** a human reads it while closing a work item
- **Then** it names what an iteration is (human-visible implement→verify cycle) and where it goes (the `iterations` dimension)
- **Edge cases:** none
- **Governed by:** none
- **Tests:** a liveness grep in `procedures.test.mjs`

## Constraints and invariants

- Reuse the existing `doneBlockRequiredFrom` mechanism and shape; do not invent a second parser or a second config convention.
- No tool-call counting, ever — the work item's own stated constraint.
- Part A's own log from this session (`progress/2026-08-19-01-*.md`) gets an `iterations: not_applicable` line added during Reconcile, since its date lands on the same cutoff day.

## Out of scope

- TASK 14 — general omitted-dimension detection for every dimension name, type-derived. Owned by TASK 14.
- EVAL-001 — actually computing and reporting the K1 number across logs. Owned by a future eval case, once real data exists.

## Test plan

| Test (file::name) | Type | Scenario covered | Behavior(s) | Status |
|---|---|---|---|---|
| `procedures.test.mjs :: RED: a dated done block missing iterations is caught` | unit | K1-001 edge: presence | K1-001 | planned |
| `procedures.test.mjs :: green path: a done block carrying iterations passes` | unit | K1-001 happy path | K1-001 | planned |
| `procedures.test.mjs :: a log predating the cutoff is not required to carry iterations` | unit | K1-001 edge: date exemption | K1-001 | planned |
| `procedures.test.mjs :: RED: iterations evidence that is not a bare integer is caught` | unit | K1-002 edge: prose evidence | K1-002 | planned |
| `procedures.test.mjs :: green path: iterations with a bare integer evidence passes` | unit | K1-002 happy path | K1-002 | planned |
| `procedures.test.mjs :: iterations status not_applicable with a reason is legitimate` | unit | K1-002 edge: no cycle occurred | K1-002 | planned |
| `procedures.test.mjs :: LIVENESS: work-item SKILL.md's Close step mentions capturing iterations` | unit | K1-003 | K1-003 | planned |

**Coverage gaps:** none known at this size. If one surfaces during implementation it is logged in the Drift log below, not silently absorbed.

## Traceability

| Behavior | Priority | Status | Test(s) | Test written first? | ADR |
|---|---|---|---|---|---|
| K1-001 | critical | planned | see Test plan | — | none |
| K1-002 | critical | planned | see Test plan | — | none |
| K1-003 | normal | planned | see Test plan | — | none |

## Drift log

| Date | What diverged | Spec or code corrected | Note |
|---|---|---|---|
