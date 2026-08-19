# SPEC-<TASK-N>: <feature or task, in one line>

<!-- TEMPLATE. instances: docs/specs/ Copy, fill, delete these guidance comments.
     A spec documents BEHAVIOR. Architecture lives in ADRs; this file links to them and
     never duplicates them. Behaviors are the atomic unit and carry a stable id. -->

```yaml
spec_id: SPEC-<TASK-N>
title: <short title>
status: draft            # draft      = being written, NOT approved
                         # active     = approved and being implemented
                         # shipped    = implemented and in effect
                         # superseded = replaced by another spec
version: 1.0
date: <YYYY-MM-DD>
approved_version:        # EMPTY until the human approves at the checkpoint. Then set it to
                         # `version`. Drift past it needs re-approval before more code.
                         #
                         # status + version + approved_version are read by the delegation
                         # gate (H-05). These three fields are load-bearing, not bookkeeping:
                         # removing one silently disarms the gate.
work_item: TASK-<N>
intent: "<one sentence: which behavioral problem this solves>"

tdd: required            # required | not_applicable
                         # T-01 keys this on work-item type AND surface. A `feature` item
                         # touching the mutation-covered surface (the guards, the content
                         # pipeline) requires TDD; the same item touching only presentation
                         # does not. The SPEC decides it, not the work item, because the
                         # spec is what knows which files the behaviors land in.
tdd_rationale:           # REQUIRED when tdd == not_applicable. Declared out loud, never
                         # silent — silence reads as coverage (P-03).
reproduces:              # bugfix specs ONLY: the test that must FAIL before the fix and
                         # pass after. A bugfix with no reproducing test is not done (T-01).

governed_by:             # ADRs that rule over this spec. Never duplicated here.
  - ADR-<NNN>
related_docs:
  - <doc>

behaviors:
  - id: <DOM>-001        # domain prefix in UPPERCASE. Ids never change once published.
    given: "<state / precondition>"
    when: "<action / event>"
    then: "<expected observable result>"
    priority: critical   # critical | normal
    status: planned      # planned | partial | implemented | out_of_scope
    edge_cases:          # REQUIRED when priority == critical
      - "<edge case>"
    tests:               # >= 1 when priority == critical.
                         # When tdd == required these do not exist yet: this is the test
                         # to write FIRST, and watch fail, before the behavior exists.
      - "<test id>"

constraints:             # invariants that cut across behaviors
  - "<constraint>"

out_of_scope:            # explicit, so nobody invents coverage
  - "<item>"
```

## Intent

<!-- 2-4 sentences of prose: the why, for humans. -->

## Behaviors

### <DOM>-001 — <title> · `critical` · `planned`

- **Given** … **When** … **Then** …
- **Edge cases:** …
- **Governed by:** ADR-<NNN>
- **Tests:** …

## Constraints and invariants

## Out of scope

<!-- What is explicitly left out, and which future work item owns it. -->

## Test plan

<!-- Every test and the exact scenario it covers — the happy path AND each edge case as
     its own row. Every critical behavior maps to >= 1 row.

     When tdd == required, THIS TABLE IS THE INVENTORY THE IMPLEMENTER WORKS THROUGH, and
     the Status column tracks the cycle. It is approved before any of these tests exist. -->

| Test (file::name) | Type | Scenario covered | Behavior(s) | Status |
|---|---|---|---|---|
| | unit / integration / e2e / mutation | | | planned / red / green / gap |

**Status vocabulary.** `red` is not a defect — it is the correct mid-cycle state, and having a word for it is the whole point:

| Status | Meaning |
|---|---|
| `planned` | identified, not yet written |
| `red` | **written and failing, implementation pending.** The TDD checkpoint |
| `green` | passing |
| `gap` | a known scenario deliberately not covered, with a named owner |

The previous vocabulary was `passing / planned`, which collapsed *not written* and *written and correctly failing* into one word — so a spec could not distinguish work not started from work half done.

**TDD is per behavior, not per spec.** Take one behavior: write its test, watch it fail, implement, refactor, move on. **Do not write every test in this table red up front** — a large batch of red tests defers all feedback to the end, which is the failure TDD exists to prevent. This table is an inventory, not a batch.

**Coverage gaps:** <known scenarios deliberately not covered, and who owns each>

## Traceability

| Behavior | Priority | Status | Test(s) | Test written first? | ADR |
|---|---|---|---|---|---|

<!-- "Test written first?" is self-reported here, and marked as such — but it is one of the
     few adherence signals that is OBSERVABLE in principle: the trace records file writes
     with a monotonic `seq`, so a test file written at a lower seq than its implementation
     is evidence rather than a claim. Not built (the check belongs with the evaluator);
     recorded here so the column is honest about its substrate today. -->

## Drift log

<!-- The only place that records reality disagreeing with intent. An empty drift log on a
     non-trivial work item is suspicious, not clean — drift always exists, and an empty log
     usually means nobody wrote it down. -->

| Date | What diverged | Spec or code corrected | Note |
|---|---|---|---|
