# 2026-08-30 · Session 01 — TASK 67: `harness-evaluator`'s budget is conditional

**Task:** TASK 67 — `harness-evaluator`'s budget is conditional, and the role file does not say so
**Status after this session:** DONE

## What was done

Added one paragraph to `.claude/agents/harness-evaluator.md`, stating that the measured ~37-of-60-turn dispatch (`EVAL-001`, scoring `TASK 66`) held only because both corpora it read arrived precomputed by a deterministic script (`ADR-009` sub-decision 3), and citing `TASK 55`'s measurement (0/3 slices cut with a pre-written extract vs 1/1 cut at ~100k tokens reading raw sources) for what a raw-corpus brief costs instead. Generalized "both corpora" to "every corpus the brief names" so the new third bootstrap item (the status-history ledger, added by `TASK 66`) is covered by the same condition rather than needing a fourth restatement later.

## Decisions

- **Added a new paragraph rather than rewriting the existing budget paragraph** — the item's `Done` forbids re-tuning the 60-turn number or its existing rationale (the `20 → 60` raise from `INC-06`); only the missing precondition needed adding.
- **Phrased the condition as "every corpus the brief names" instead of "both" or "three"** — `TASK 66`, closed the session before this one, added a third bootstrap corpus (the status-history ledger) that did not exist when `TASK 67`'s `TASKS.md` entry was written. Hardcoding a count would misstate it again the next time a corpus is added.
- **No subagent delegated** — every source this edit cites was already read directly in this session (`TASKS.md`'s entry, the role file, `P-09`, `EVAL-001`, `ADR-009`). Delegating a one-paragraph edit with all sources already in hand contradicts `ADR-009`'s own sub-decision 1 (don't delegate a read the orchestrator already holds).

## Findings from validating against real state (P-04)

- Confirmed the ~37-of-60 figure directly in `EVAL-001` (item 12, and the `GAP-13` row) rather than trusting the hand-off packet's restatement.
- Confirmed the new paragraph sits above `## Bootstrap`, so it does not risk the `check-agents` backticked-path trap the hand-off flagged (that trap only fires below the `## Bootstrap` heading, per `INC-04`'s recorded failure).
- `ADR-009` sub-decision 3 explicitly names this same 37-turn measurement as its own evidence for deterministic assembly — confirmed the two documents agree on the number before citing both.
- **The gate, not self-review, caught a defect in this very log.** The first draft of this file's `Done` section wrote the dimensions flat, without the top-level `done:` key the template requires — `check-procedures` failed it with *"carries no `done` block"* on the second `gate.mjs` run. Fixed in place; see `Done` below and the `gate` dimension's evidence. Exactly the substrate argument `P-11` makes: the report is a claim, the gate run is the evidence, and this session's own first claim was wrong.
- **The same gate run reproduced `TASK 89`'s runner flake** — `component tests` failed with the identical `TypeError: Cannot read properties of undefined (reading 'config')` signature on a run with no mutation run before it, which narrows `TASK 89`'s two candidate mechanisms toward the Vite pre-bundling one. Recorded as a second data point on `TASK 89` in `TASKS.md`, not retried past (`T-06`); the third `gate.mjs` run passed it cleanly with no code change, consistent with a flake rather than a regression.
- **The run-order table (row 7b) still read `TASK 83` as not-`DONE`**, though its own entry has read `DONE` since 2026-08-29 — stale before this session touched it, found only because this session's own reconciliation of row 9 required reading the same table (`P-07`). Fixed in the same pass: out of `TASK 67`'s declared scope in substance, but a one-cell, zero-judgment sync rather than new work, so left corrected rather than filed.

## Done

```yaml
done:
  docs:            { status: passed, evidence: [".claude/agents/harness-evaluator.md — new paragraph after the budget paragraph, before ## Bootstrap"] }
  loose_ends:      { status: passed, evidence: ["no new loose ends opened; TASK 88/89 residuals from TASK 66 remain filed, untouched by this item"] }
  scope:           { status: passed, evidence: ["one file changed: .claude/agents/harness-evaluator.md — TASK 67's declared scope"] }
  tests:           { status: not_applicable, reason: "documentation item, no code path" }
  mutation:        { status: not_applicable, reason: "documentation item, no code path; gate's mutation step (76.56% against a 76.0 floor) ran and passed regardless" }
  ci:              { status: not_applicable, reason: "GAP-12/TASK 30 still blocks reading a real CI result; unrelated to this item" }
  security:        { status: not_applicable, reason: "documentation item, no code path" }
  content:         { status: not_applicable, reason: "role file is harness config, not resources/** publishable content" }
  gate:            { status: passed, evidence: ["node scripts/gate.mjs, three runs: 1st exit:0 21/21; 2nd exit:1 on component tests (TASK 89's runner flake, second data point recorded in TASKS.md) and check-procedures (this file's done block missing the top-level `done:` key, fixed below); 3rd exit:0 21/21, both findings gone"] }
  iterations:      { status: passed, evidence: ["2"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1", "verify=1"] }
```

## Open questions

None.

## Next

`TASK 88` (run-order 9a) — the `renderLedger` mutation-surface residual from `TASK 66`. Packet written: `progress/handoff/2026-08-30-task88.md`. `TASK 83`, previously thought still open, turned out to already be `DONE` (its `TASKS.md` entry has read `DONE` since 2026-08-29; only the run-order row was stale, and that is fixed now) — so it is not next-session work.

## Files changed

`.claude/agents/harness-evaluator.md` — added the conditional-budget paragraph (`TASK 67`'s `Done`).
`TASKS.md` — `TASK 67` marked `DONE`; run-order rows 7b and 9 updated with evidence; `TASK 89` gained a second recorded data point from this session's gate run.
`progress/2026-08-30-01-task67-conditional-budget.md` — this log.
`progress/handoff/2026-08-30-task88.md` — hand-off packet for the next session.
