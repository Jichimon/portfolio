# 2026-08-24 · Session 01 — The gate reports every step, not just the first failure

**Task:** TASK 34 — The gate reports every step, not just the first failure
**Status after this session:** DONE

## What was done

The run loop came out of `scripts/gate.mjs` into `scripts/guards/lib/gate.mjs` as `runGate(steps, run)`, with the runner injected so the loop is testable without spawning fourteen processes. The `break` on first failure is gone: every step runs, every step gets a reported verdict, and the exit code is still 1 the moment anything fails. `scripts/gate.mjs` is now the step list plus the reporting and nothing else.

Twelve tests, written red before the module existed. Seven hand-applied mutants, all killed.

## Decisions

- **The loop moved to `guards/lib/`, matching the thirteen existing guards.** The old loop was inline in a CLI, so the only way to test it was to run the real gate — which is exactly why a five-day blindness went unnoticed. Rejected: testing `gate.mjs` end to end by spawning it with fixture steps. That needs a way to inject steps into a module that hardcodes them, which is a bigger change to the file than extracting the loop.
- **`dependsOn` exists and no step uses it.** `TASK 34`'s constraint says sequencing matters where a later step consumes an earlier one's output, that such a step is named, and that the rest do not inherit the constraint. Checked all fourteen: **none consumes another's output** — each reads the repository independently. So the honest state is a mechanism with zero users, not an ordering assumption baked into the list (`P-13`). It cost eight lines and it is the answer to `P-16`'s question: when someone adds a dependent step next month, it is handled rather than silently mis-ordered. Rejected: no mechanism at all, on the grounds that a future dependent step would run out of order and fail for a reason nobody could read.
- **A `BLOCKED` step counts as a failure.** An unrun guard is not a passing guard. Letting `BLOCKED` exit 0 would rebuild the exact hole this item closes, one level down.
- **A dependency naming a missing or later step throws instead of running.** `G-13`'s shape applied to the gate's own machinery: the loop would otherwise either block that step forever or wave it through, and both are silent.
- **The loud exit stays.** Fail-fast was a choice, not a bug — it makes a broken repository cheap to diagnose. The summary is scannable, and the block underneath names every failure with what it protects, so reporting everything did not make one failure quieter.

## Findings from validating against real state (P-04)

- **`check-docs` is not red.** `TASK 34`'s entry named three findings that predate this session — `site/src/content.config.ts`, `resources/testimonials.en.md`, `resources/testimonials.es.md`. Run directly, `check-docs` **passes**: 50 living documents, 159 path references resolved, 5 reasoned exemptions. `TASK 31` closed them on 2026-08-23 and the entry was never reconciled. The claim was true when written and had expired by the time it was acted on.
- **`TASK 31` was `TODO` in the register and closed in fact**, with a complete `done` block and `iterations: 3` in its log. Corrected in `TASKS.md` in this session, along with its row in the backlog sequence table. The work was finished; only the register was stale — the half of `P-07` that gets skipped.
- **Nine of the fourteen steps were never actually blind.** Run individually before the fix, `check-docs`, `check-context-budget`, `check-content`, `verify.mjs` and `check-evals` all passed. The cost of the blindness was not a hidden failure this time; it was that nobody could have known either way.
- **The gate now passes end to end, all fourteen steps, for the first time.** The remaining blocker was `check-trace`'s 35 findings, all inside `evidence/runs/` — 34 broken correlations and one redaction leak, across exactly two run directories, both gitignored and disposable. The author deleted them (`H-03` keeps agents out of `evidence/`, not the human). The underlying redaction defect is still `TASK 18`; deleting stale traces does not fix it.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["scripts/guards/lib/gate.test.mjs — 12 tests, written red before scripts/guards/lib/gate.mjs existed (module-not-found, 0 pass / 1 fail)", "full guard suite 390/390, up from 378"] }
  mutation:   { status: passed, evidence: ["7 hand-applied mutants over scripts/guards/lib/gate.mjs, 7 killed: reinstated fail-fast break; BLOCKED dropped from the failure list; exitCode pinned to 0; skipIf ignored; dependency comparison inverted; the dependency assertion neutered; FAIL never assigned"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs — 14/14 PASS, GATE PASSED", "red path at the CLI: check-rules-registry (step 2) replaced with process.exit(1) — steps 3-14 still ran and reported, summary showed FAIL at step 2 with 13 PASS, real exit code 1; guard restored and re-verified PASS"] }
  docs:       { status: passed, evidence: ["TASKS.md — TASK 34 closed; TASK 31 status corrected to DONE in both its heading and the backlog sequence row", "scripts/gate.mjs header states where the loop lives and why"] }
  scope:      { status: passed, evidence: ["one deliverable: every step runs and reports", "check-trace's underlying failure deliberately untouched — that is TASK 12 and TASK 18 (H-03)", "no git write (H-01)"] }
  content:    { status: not_applicable, reason: "nothing in resources/** touched; this is gate wiring" }
  security:   { status: not_applicable, reason: "no boundary, guard verdict or permission changed. A step that used to be skipped now runs, which adds a check rather than relaxing one" }
  ci:         { status: not_applicable, reason: "the workflow runs the gate unfiltered and needed no change; no remote exists yet, so no run can be read (T-10)" }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions

None for this item. `TASK 18`'s redaction false-positive on opaque ids is still open and will re-dirty `check-trace` the next time a banned term collides with a generated id.

## Next

`TASK 35` — `ADR-008` and the `.claude/rules/50-implementation.md` surface. Every implementation spec below it cites `ADR-008` in `governed_by`, and a spec citing an ADR that does not exist governs nothing. It also brings the `check-site` guard, which needed this item first: a new gate step added behind a failing one runs zero times.

## Files changed

`scripts/guards/lib/gate.mjs` — new. The run loop, with the runner injected.
`scripts/guards/lib/gate.test.mjs` — new. 12 tests.
`scripts/gate.mjs` — the loop replaced by `runGate`; reporting names every failure.
`TASKS.md` — TASK 34 closed; TASK 31's stale status corrected.
