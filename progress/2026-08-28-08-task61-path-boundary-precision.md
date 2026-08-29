# TASK 61 — `path-boundary` decides write-intent by argument role, not executable name

**Type:** bugfix · **Status:** DONE
**Plan:** `C:\Users\luisa\.claude\plans\task-61-como-dice-hacer-hazy-gem.md` (approved 2026-08-28)

## 1 · Orient

Read `TASKS.md` TASK 61 entry, `progress/handoff/2026-08-28-task61.md`, `docs/adr/README.md` index.
Validated against real state (`P-04`) by importing `checkBashPaths` and running it directly against
the guard's own source before planning — see Findings below.

## 2 · Spec

Not applicable — `bugfix`, not `feature`/`migration`. Confirmed against `delegation.specRequiredFor`
in `guards.config.json` (`["feature","migration"]`) and against the work-item skill's own routing
table. The plan file is the approved artifact.

## 3 · Checkpoint

Plan approved by the author 2026-08-28 (plan mode → `ExitPlanMode`), after two `AskUserQuestion`
decisions:
- `mv` keeps flagging its source (H-02 forbids "moves", not just writes) — `TASKS.md`'s Done clause
  amended rather than implemented as originally written.
- `dd of=` bypass (found live during validation, not in the hand-off) folded into this item rather
  than filed separately — same function, same defect shape.

## 4 · Slice and delegate

One `implementer` run, briefed with the extract (table + three helper contracts + full
case list) rather than a document list, per `P-09`'s reading half. Files owned: exactly
`scripts/guards/lib/path-boundary.mjs` and its test file — no others.

Run `a6a4ee8d-9ac3-444a-a108-a54d8fa38ffd:a869cf672ec547297`. `run.footer` checked before
trusting the report (`P-18`, `G-06`): `{"termination":{"state":"COMPLETE","reason":"objective_reported"}}`
— normal termination, not a fragment.

Reported: `WRITES` table replacing `MUTATORS`/`INPLACE`; `inPlaceFlag`, `destinationArgs`,
`ddTargets` helpers; `how` now carries the deciding reason. Red evidence captured per
behavior (4 failing cases before the fix: the sed/cp allow cases, the `dd of=` deny case,
the `how` assertion). Four neutering proofs run and restored. 33/33 own file, 828/828
whole suite at report time. Files touched: exactly the two owned. No drift from brief.

## 5 · Verify

Verified independently rather than trusting the report (`P-11`) — the artifact is the
evidence, not the claim:

- Read the diff directly (`path-boundary.mjs`). Confirmed the table/helpers match the plan.
- Re-ran the 18-case probe from the plan's Context section directly against the fixed
  module, standalone — all 18 matched expectation, including both `dd of=` cases (the
  live bypass found during planning) and the `mv` source-still-denied case (the author's
  `AskUserQuestion` decision).
- `node scripts/gate.mjs` — 19 of 20 steps PASS. Mutation: **75.95%**, above the 75.5 floor.
  The one failure was `check-procedures`, correctly: this very log had no `done` block yet
  (P-03 — a log without one records that work happened, not that it finished). Not a defect
  in the fix.
- Per `T-03` (*"a surviving mutant is a finding, not a statistic to average away"*) and the
  plan's own instruction to watch that new branches arrive killed, inspected
  `reports/mutation/mutation.json` for `path-boundary.mjs` specifically: 53 survivors on
  233 mutants. Checked two by hand against the real code (not assumed from the report):
  `awk -i inplace ...` and `awk --include=x ...` both correctly DENY; a `cp` destination
  with a trailing flag (`cp /tmp/x.md resources/y.md -v`) also correctly DENIES — so these
  were coverage gaps in the new logic, not defects. Backfilled two tests directly (test-only,
  no production change — the code was already verified correct first) and re-scoped Stryker
  to the one file: survivors dropped from 53 to 39, file-local score 75.5 → **79.40%**. The
  three remaining survivors at `path-boundary.mjs:182,185` are (a) one equivalent mutant —
  the `else if (mode === 'inplace')` condition is unreachable-false by the time it's checked,
  since the three prior branches already excluded every other value `WRITES` can hold — and
  (b) two instances of the SAME "a flag placed after the target defeats `.startsWith('-')`"
  shape that already existed, untested, in the pre-existing `'all'`-mode loop at line 175
  before this task touched the file. Not a regression; recorded as a loose end below rather
  than expanded into a second hardening pass this item did not scope.
- `node --test "scripts/guards/**/*.test.mjs"` — 830/830 after the backfill (828 immediately
  after delegation, +2 from the backfill).
- Re-ran `node scripts/gate.mjs` a second time (all production/test code had changed since
  the first run). **19/20 PASS, but `e2e smoke` FAIL this time** — unexpected, since this
  item touches zero files under `site/**`. Investigated rather than assumed (`P-04`):
  `npx playwright test` run standalone, twice, both 309 passed / 0 failed / exit 0. Ran the
  full gate a third time with output captured to a file (the background buffer had truncated
  the actual failure detail) — clean: 19/20 PASS (only `procedures`, expected), mutation
  **76.15%**. Three of four runs of this suite were clean, the fourth's detail was lost to a
  buffer limit before it could be diagnosed. Per `T-06` ("a flake is a finding"), not
  dismissed silently — filed as `TASK 85` with the evidence above, since `docs/adr/ADR-006`
  already documents one race in this exact tier (the Astro preview daemon) that this may or
  may not be a recurrence of; not blocking this item's close, since it is demonstrably
  unrelated to what this item changed.

## 6 · Reconcile

- `TASKS.md` TASK 61 — Done clause corrected to match the two author decisions from the
  checkpoint (`mv` flags both ends; the `dd of=` bypass folded in), status set to `DONE`.
- This log is the record; no other living document names `path-boundary.mjs`'s internals
  by name (checked: `docs/harness/architecture.md` §L states the guard's honest *scope*
  — cannot follow execution into a written script — which is unaffected by this fix and
  needed no edit).
- Loose end → new `TASKS.md` entry (`P-06`, not left as prose): the `-v`-after-target gap
  in the `'all'`-mode loop (`path-boundary.mjs:175`), pre-existing and out of this item's
  scope, filed as `TASK 83`.
- Loose end → new `TASKS.md` entry: `checkBashPaths` reads `boundaries.write` only, so
  `H-04`'s `private/` read boundary has **no shell vector** at all — `cat private/glossary.md`
  passes the guard. Found during planning-stage validation, out of this item's scope (a
  different boundary, a different function signature), filed as `TASK 84`.
- Loose end → new `TASKS.md` entry: the one-off `e2e smoke` failure inside `gate.mjs` (`T-06`,
  not this item's surface), filed as `TASK 85`.

## 7 · Close

**Measured from the trace, not memory (`P-12`).** Orchestrator run `a6a4ee8d-9ac3-444a-a108-a54d8fa38ffd`:
73 `tool.requested` events, **0 denies** — no unsafe-action attempts this session. Delegated
`implementer` run: 32 tool calls against its 45-turn budget, footer `COMPLETE/objective_reported`
(`G-06`). No `maxTurns` cutoff on either run.

```yaml
done:
  tests:      { status: passed, evidence: ["node --test \"scripts/guards/**/*.test.mjs\" — 830 pass, 0 fail"] }
  mutation:   { status: passed, evidence: ["node scripts/gate.mjs mutation step — 76.15%, floor 75.5", "path-boundary.mjs file-local: 75.5% -> 79.40% after backfill"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs — GATE PASSED, 20/20, exit:0 (run five times: 19/20 mid-session x2 with the sole FAIL being this file's own then-missing done block or an unrelated one-off e2e flake (TASK 85), 20/20 once this block was written and verified — check-procedures included"] }
  security:   { status: passed, evidence: ["scripts/guards/lib/path-boundary.test.mjs — 35/35, including the anti-regression block (mv/rm/tee/cp -t stay denied) and the folded dd of= bypass (now denied)", "18-case probe re-run directly against the fixed module — all 18 match, independent of the implementer's own report (P-11)"] }
  docs:       { status: passed, evidence: ["TASKS.md TASK 61 Done clause corrected + closed; TASK 83/84/85 filed (P-06)", "docs/harness/architecture.md §L checked — claim unaffected by this fix, no edit needed (P-07)", "node scripts/guards/gate/check-docs.mjs, check-rules-registry.mjs — PASS in the full gate run"] }
  content:    { status: not_applicable, reason: "harness/guard work; resources/** untouched" }
  ci:         { status: not_applicable, reason: "no remote exists yet (TASK 30)" }
  scope:      { status: passed, evidence: ["git diff --stat — path-boundary.mjs, path-boundary.test.mjs (the two implementer-owned files) + TASKS.md (register reconciliation) + this new progress log; no other file touched"] }
  loose_ends: { status: passed, evidence: ["TASK 83 (pre-existing 'all'-mode flag-after-target gap)", "TASK 84 (H-04's private/ read boundary has no shell vector)", "TASK 85 (one-off e2e smoke flake, unrelated)"] }
  iterations:      { status: passed, evidence: ["6"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1", "slice=2", "verify=2", "reconcile=1"] }
```

`iteration_split` accounting: **checkpoint=1** (one plan approval, no revision). **slice=2** (the
delegated `implementer` run; a second, orchestrator-performed implementation pass — the two-test
mutation-coverage backfill in §5 — verified correct against the running code before being added,
same as any implement→verify cycle). **verify=2** (the routine gate/mutation verification of both
slices; a second, distinct pass to investigate and resolve the unexpected `e2e smoke` failure before
it could be trusted as unrelated). **reconcile=1** (one pass: `TASKS.md` + this log + the three
filed loose ends, no rework needed).
