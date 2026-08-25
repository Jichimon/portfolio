# 2026-08-25 · Session 02 — A gate step that never ran must not report PASS

**Task:** TASK 39 — A gate step that never ran must not report PASS
**Status after this session:** DONE

## What was done

`runGate` now returns a third bucket, `incomplete` (every `SKIP`), and `exitCode` is `1` on any `FAIL`/`BLOCKED`, else `2` if anything is `incomplete`, else `0`. `scripts/gate.mjs`'s headline splits accordingly: `GATE FAILED` still wins on a real failure, and a run with nothing failed but something skipped now prints `GATE INCOMPLETE` and exits 2 instead of `GATE PASSED` and exiting 0. `runGate`'s second parameter is widened from "returns an exit code" to "returns `{ code, stdout }`"; `evaluate` derives whether a step's own command was a test runner from its captured stdout (`node:test`'s `tests N` summary line, either reporter form) and fails a step that exited 0 having run zero tests, without penalizing a plain guard that never printed a test count at all. `dependsOn` now accepts a string or an array of strings; the real gate's `mutation` step declares both `'guard tests'` and `'site core tests'`.

## Decisions

- **A `SKIP` gets its own exit code (2) rather than folding into `FAIL`'s 1.** The author's decision, already made before this session started — see the brief. `SKIP` stays a legitimate verdict (`check-site` skipped honestly for weeks); what was wrong was the headline and exit code claiming `PASSED`, not the mechanism.
- **Liveness is derived from the runner's own summary line, never a per-step count.** `null` (no `tests N` line at all) is treated as "not a test runner" and the step is judged on exit code alone — a plain guard like `check-content` never printed one and must not be penalized for a property it never had. `0` is a positive claim from the runner and fails the step even at exit code 0. Rejected: a hardcoded per-step minimum test count, which is a roster in disguise and rots the next time someone adds a test (`P-13`).
- **`stdout` is captured (`stdio: ['inherit', 'pipe', 'inherit']`) and re-printed after the step finishes, rather than left fully inherited.** `stderr` still streams live so a hung or noisy step stays visible in real time; only `stdout` needed capturing for liveness derivation, and re-printing it after the step keeps the terminal output complete rather than losing it to the capture.
- **`dependsOn` normalizes internally to an array (`dependencies(step)`)** rather than branching arity through the whole module. `assertDependenciesResolve` and `evaluate` both call it, so a step declaring one dependency and a step declaring three go through identical code.
- **The real `mutation` step now names both `'guard tests'` and `'site core tests'`.** This is the motivating case from the item's own opening finding — a broken `site core tests` file used to die inside Stryker's initial run and report as a `mutation` failure with no BLOCKED note pointing at the real cause.

## Findings from validating against real state (P-04)

- **The full local `node --test "scripts/guards/**/*.test.mjs"` run (522 tests) confirmed the implementation has no false positive.** 521 passed, 1 failed — and the one failure was this session's own progress-log skeleton, which had `status: pending` in six `done:` fields (a template placeholder, not a value `check-procedures`' vocabulary accepts: `passed | failed | blocked | partial | not_applicable`). No liveness or dependency logic misfired against the real suite; fixed by finishing this log with real statuses instead of placeholders.
- **One full `node scripts/gate.mjs` run, before the orchestrator's course-correction landed, showed 5 of 18 steps not passing:** `guard tests` (the placeholder-status defect above, self-inflicted and now fixed), `mutation` (correctly `BLOCKED` — `depends on "guard tests", which did not pass`, proving the real STEPS list's multi-predecessor `dependsOn` resolves and reports correctly), `procedures` (same placeholder defect, both this log and a concurrent session's log), `evidence trace` (pre-existing, `TASK 12`, not touched), and `site structure` (pre-existing gateway-boundary finding in `Rail.astro`, not touched, not mine). None of the three behaviors this item owns caused a real regression.
- **The orchestrator flagged that `component tests`' `skipIf` at `scripts/gate.mjs` (line ~71) hardcodes `site/lib` and is about to go stale** once that tier moves to `site/src/behaviour/`. Changed the one predicate to derive from the package instead — `holdsFileEndingWith('site', '.component.test.ts')` — since it was cheap and inside a file this item already owns.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["scripts/guards/lib/gate.test.mjs — 20/20; 3 assertions inverted/added for the incomplete state (RED: TypeError reading r.incomplete.map before the field existed), 4 for multi-predecessor dependsOn (RED: assertDependenciesResolve threw on the array before dependencies() normalized it), 4 for liveness plus the widened {code,stdout} contract (RED: 8 pre-existing tests turned red the moment run() started returning an object compared with `=== 0`, plus the new zero-tests assertion failing with actual:'PASS')", "full guard suite 522 tests, 521 pass / 1 fail — the 1 fail was this log's own placeholder status text, not implementation logic; fixed, not re-run against the full suite again per the orchestrator's budget instruction"] }
  mutation:   { status: passed, evidence: ["3 hand-applied mutants over scripts/guards/lib/gate.mjs, all 3 killed: dropped the incomplete branch from exitCode (killed on exitCode 0 vs expected 2); disabled the zero-tests-run check with `if (false)` (killed on status PASS vs notStrictEqual PASS); collapsed dependencies() back to single-value (killed — assertDependenciesResolve threw on the joined 'one,two' string). Full mutation gate step deferred — the brief and the orchestrator both name it below its floor for reasons outside this item"] }
  gate:       { status: partial, evidence: ["one full `node scripts/gate.mjs` run: guard tests/procedures FAIL traced to this log's own placeholder statuses (now fixed, not re-verified end-to-end per budget instruction); mutation correctly BLOCKED on 'guard tests' with the multi-predecessor note; evidence trace and site structure pre-existing and not this item's (TASK 12, TASK 40's finding)"] }
  docs:       { status: passed, evidence: ["this log", "TASKS.md TASK 39 status to be flipped to DONE by the orchestrator/human on merge"] }
  scope:      { status: passed, evidence: ["only the three named files touched, plus this log; the one extra edit (component-tests skipIf predicate) was requested by the orchestrator mid-task and stayed inside an owned file", "no git write (H-01)", "terms.mjs/terms.test.mjs/guards.config.json — owned by a concurrent agent — untouched"] }
  content:    { status: not_applicable, reason: "nothing in resources/** touched; this is gate wiring" }
  security:   { status: not_applicable, reason: "no boundary, guard verdict or permission changed; a step that used to silently pass on nothing now reports honestly, which adds a check rather than relaxing one" }
  ci:         { status: not_applicable, reason: "the workflow runs the gate unfiltered and needs no change; no remote exists yet, so no run can be read (T-10)" }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions

None for this item. `TASK 12` (evidence trace correlation/redaction) and `TASK 40`'s `Rail.astro` gateway finding are pre-existing and out of scope here.

## Next

Re-run `node scripts/gate.mjs` end to end once this log and the concurrent terms-guard session both land, to confirm `guard tests` and `procedures` clear now that the placeholder-status defect is fixed on both logs.

## Files changed

`scripts/guards/lib/gate.mjs` — the `incomplete` bucket and its exit code; `dependencies()` normalizing `dependsOn` to a list; liveness derivation (`countTestsRun`) against the widened `{ code, stdout }` runner contract.
`scripts/guards/lib/gate.test.mjs` — the skip test inverted for the incomplete state; 4 new tests for multi-predecessor `dependsOn`; 4 new tests for liveness; `runnerFor` widened to build `{ code, stdout }` fixtures.
`scripts/gate.mjs` — the `GATE INCOMPLETE` headline and exit-2 path; the runner captures and re-prints `stdout` instead of pure `inherit`; the real `mutation` step's `dependsOn` now names both test-tier steps; the `component tests` `skipIf` predicate derives from `site` instead of the soon-to-be-stale `site/lib`.
`progress/2026-08-25-02-task39-gate-liveness-and-skip.md` — this log.
