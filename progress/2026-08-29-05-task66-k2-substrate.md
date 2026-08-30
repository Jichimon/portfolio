# 2026-08-29 · Session 05 — `TASK 66`: a substrate for `K2`

**Task:** TASK 66 — Record work-item status transitions, so `K2` has a substrate
**Status after this session:** DONE

> Skeleton written first, before any implementation (`P-09`). Eight cut runs, eight surviving logs — the one mitigation measured to work.

## What was done

`K2` (done-reopens) had no substrate at all. `TASKS.md` records the *current* status and nothing else, so `EVAL-001` observed 0 reopens, could not distinguish that from 0 *recorded*, and declined to report 2 → 0 as an improvement. `docs/harness/contracts.md` meanwhile claimed `K2` was read from *"`TASKS.md` status transitions and `progress/`"* — a source that did not exist.

The transitions are now **derived from the register's own git history**: one status map per revision of `TASKS.md`, diffed consecutively. `scripts/status-history.mjs` writes the ledger the evaluator reads; `scripts/guards/lib/status-history.mjs` holds the pure core; `check-status-history` is the gate's 21st step, and it fails when a derived transition away from `DONE` carries no `**Reopened <date>**` declaration, or when a declaration names a reopening the history does not show.

**The real corpus, measured rather than asserted:** 31 committed revisions of `TASKS.md`, **43 transitions**, **0 unparseable**, **0 vanished**, and **`left_done` = 0** — no work item has ever left `DONE`. `K2 = 0` is now a measurement over the project's whole recorded lifetime instead of an absence of data.

## Decisions

- **Derive from git; do not write the history by hand.** The scorecard template defines `observable` as *"read from an artifact the scored entity does not author"*. `H-01` denies every agent a git write at rung 1, so a git-derived list is observable **by that definition**, while a status-history line typed into `TASKS.md` by the orchestrator would be prose the scored entity wrote about itself. Deriving also needed no backfill: the whole history was already there. Rejected: a hand-written history block per entry, and an append-only ledger — both are self-reported and both demand 88 items of backfill.
- **Keep the reason hand-written, and check it against the derived history.** Git says *what* changed and cannot say why "done" meant two different things, which is the entire point of `K2`. The declaration is the reason; the derived history is what makes forgetting it detectable, because the substrate that exposes the omission is not one anybody here can edit.
- **Generate the ledger at the moment of use; do not commit it and check its freshness.** A committed ledger oscillates: the commit that records a status change is itself the event the file then lacks, so the gate would demand a second commit forever. Generating it in `evaluate-harness` step 1 is the same shape as the two `EVAL-001` corpora and what `ADR-009` means by *"the context assembler is the script"*. `harness-evaluator` holds no `Bash`, so the ledger has to reach it as a file either way.
- **Bound the gate's git walk with a dated threshold.** `statusHistory.reopenDeclarationsFrom`, the fourth use of the mechanism `doneBlockRequiredFrom` established. It keeps the step O(recent commits) — 5 revisions walked instead of 31 — and it means the 43 historical transitions are not retroactively demanded to carry a line nobody had been told to write.
- **An uncommitted transition is always in window, stated explicitly.** The moment to write down why done meant two things is the moment the status changes, not the commit after it. It also removes the oscillation a commit-time check would create: the line lands in the same edit, so the committed history already satisfies the check.
- **`DONE → RETIRED` is reported under its own destination, never folded into reopens.** The register's own head defines `RETIRED` as the deliverable moving to another id; summing it with `DONE → TODO` would report a consolidation as a failure of "done".

## Findings from validating against real state (P-04)

- **`parseWorkItemStatuses` could not read the register's first six revisions.** `registerVocabulary` demanded a `Status values:` line **and** a `type` table and threw without both — but the type table did not exist until 2026-08-19, and those revisions are shaped ``## TASK 0 — Case studies · `DONE` ``: statuses, no type span at all. The derivation would have been blind over exactly the era `EVAL-000`'s baseline of 2 came from. Fixed by splitting the two vocabularies: the heading scan needs statuses only, and `parseWorkItemTypes` classifies the type one layer up. Both keep their own `G-13` throw, and the only non-test consumer (`check-evals`) gets *stricter*, not blinder.
- **The whole git walk costs 1.1 s over 31 revisions**, which is what made deriving viable at all — and what made the dated threshold worth building, since the same walk at a year of this commit rate costs ~25 s.
- **`harness-evaluator` holds no `Bash`.** That single fact decided the artifact's shape: not a script the evaluator runs, but a file the orchestrator hands it.
- **`check-agents` caught a backticked git command in the role's Bootstrap list** and read it as a path claim that does not resolve (`INC-04`). Correct behaviour; the wording was changed rather than the guard.
- **The mutation run found what the neutering battery could not.** The new module landed at **63.22%** — 69 survivors, 20 uncovered — and pulled the aggregate from 76.07 to 75.89. Two distinct causes, and only one of them was noise: 35 `StringLiteral` mutants emptying sentences of ledger prose, which is exactly the class `D3` scoped mutation *away* from and is now suppressed at the mutant with a written reason; and **34 structural mutants that mattered**, including every section guard in `renderLedger` — a mutant that deletes the "unparseable revisions" section from the corpus an evaluation reads. Separately, **every string in the git argv survived**: a dropped `--reverse` silently inverts the direction of every transition and a changed `--format` silently empties the dates, and both produce a ledger that looks right. Nothing was asserting them. 63.22 → 76.86 → **82.64%**, 40 survivors, 2 uncovered.
- **The first neutering pass found a hole in this item's own tests.** Deleting the missing-declaration branch left the battery **green**: both branches name the item and the word `Reopened`, and the assertions matched only those. The finding is the reason `P-14` is a rule — a red battery that has only been seen to pass has not been tested. The two assertions now match the direction-specific wording, and the same neuter now fails 3 tests.

## Harness measurement, read from the trace (P-12, wrap-up step 4)

`evidence/runs/8e19b236-7378-4dbb-8dbc-e5f8bc892910/orchestrator.jsonl`, read rather than remembered.

| | |
|---|---|
| events · `seq` | 492 · dense, 1 → 492, **0 gaps** |
| `tool.requested` / `policy.decision` / `tool.result` | 161 / 161 / 160 |
| **unsafe-action attempts** (`deny` with no result) | **0** |
| the one request with no result | the in-flight background gate run, `decision: allow` — not an attempt |
| tool mix | `Bash` 130 · `Write` 10 · `Edit` 6 · `TaskStop` 5 · `Read` 3 · `ToolSearch` 3 · `Monitor` 3 · `ExitPlanMode` 1 |
| wall clock | 82 min |
| **`L` context load** | **6/6** — all five rule files plus `CLAUDE.md`, `30-testing.md` among them, loaded on its `paths:` match when the guards were touched |
| delegated runs | **0** |
| `permission_mode` | `unknown`, source `unavailable` — the orchestrator's own `SessionStart` payload carries none, which is `TASK 64`'s `permission_mode_source` field reporting honestly rather than fabricating |

**Budgets: nothing to observe, and that is the honest report.** No role was delegated, so `maxTurns` — the one budget the runtime enforces — governed nothing this session, and the observed three (`maxToolCalls`, `maxRuntime`, `maxRetries`) had no run to be observed against (`G-06`). The orchestrator itself has no role file and therefore no budget (`G-09`), which is not a regression but the standing condition `TASK 70` already measured and `TASK 78` will price.

**No regression to file.** `L` at 6/6 with `V` at 0 is the healthy pair, not the trap: `V` is 0 because nothing was attempted, not because nothing is checked — the three real-corpus denials this session provoked came from `check-status-history` at the gate, which is rung 2 and does not write `policy.decision` events.

## Done

```yaml
done:
  tdd:              { status: passed, evidence: ["scripts/guards/lib/status-history.test.mjs — 41 tests, red before green", "scripts/guards/lib/delegation-gate.test.mjs — 3 RED (TASK 66) tests failing before the vocabulary split"] }
  red_path:         { status: passed, evidence: ["15/15 clauses proven load-bearing by neutering each in turn", "real-corpus red path: a DONE→TODO flip with no declaration FAILS check-status-history naming TASK-87; declared, it PASSES; an orphan declaration on TASK-83 FAILS"] }
  guard_suite:      { status: passed, evidence: ["node --test \"scripts/guards/**/*.test.mjs\" — 907/907"] }
  mutation:         { status: passed, evidence: ["status-history.mjs 63.22 → 82.64%; surface 75.89 → 76.55, re-measured 76.54", "floor raised 75.5 → 76.0 in stryker.config.mjs, T-03's row reconciled", "one suppression, at the mutant, with a written reason citing D3"] }
  gate:             { status: passed, evidence: ["node scripts/gate.mjs — 21/21 PASS, exit 0, on the tree as it stands (runs 1, 2, 3 and 5 of 5)", "run 4 failed on `component tests` at module evaluation with ZERO tests collected, in a step this item touches no file of — captured, reproduced-clean at 15/15 standalone, and filed as TASK 89 rather than retried past (T-06)"] }
  substrate:        { status: passed, evidence: ["node scripts/status-history.mjs — 31 revisions, 43 transitions, 0 unparseable, 0 vanished, left_done 0"] }
  reconcile:        { status: passed, evidence: ["docs/harness/contracts.md K2 row + the gate's step count, which had rotted to \"20 steps\"", "progress/evaluation-results/EVAL-TEMPLATE.md", ".claude/agents/harness-evaluator.md bootstrap", ".claude/skills/evaluate-harness/SKILL.md step 1", "TASKS.md head", "CLAUDE.md layout", ".claude/rules/30-testing.md T-03 floor"] }
  loose_ends:       { status: passed, evidence: ["TASK 88 — a render template inside the mutation-covered surface, placed at 9a in the run order", "TASK 89 — the `component tests` flake, captured and filed rather than retried past"] }
  spec:             { status: not_applicable, reason: "type `harness` produces no spec; the artifact the author approved is the plan and the diff" }
  content:          { status: not_applicable, reason: "no file under resources/ or site/ is touched; C-09 and C-05 are unaffected" }
  iterations:       { status: passed, evidence: ["3"] }
  iteration_split:  { status: passed, evidence: ["checkpoint=1", "verify=2"] }
```

**`iterations` = 3, and the two verify returns are named rather than rounded down.** One checkpoint (plan → approval). Then gate run 1 came back green **and** with the new module at 63.22% dragging the surface down, which sent the work back — that is a return to verify, not a green run. Gate run 2 came back at 76.55, which tripped `T-03`'s ratchet and sent it back again for the floor raise. Gate run 3 closed it. Counting the first green run as the end would have reported 2 and hidden the finding that mattered most.

## Open questions

- **The gate failed once, on the fourth run, in a tier this item does not touch.** `component tests` collapsed at module evaluation with **zero tests collected** — the shape `TASK 39`'s zero-tests-ran mechanism exists to catch, and it caught it. It passes 15/15 standalone and passed the three runs before it. Filed as `TASK 89` with the captured output, which is what `TASK 85` lacks. Reported here rather than smoothed over: three green runs and one red one is a flake, and `T-06` makes a flake a finding.
- **Nothing else open.** The one residual — 40 `CallExpression` mutants surviving on `renderLedger`'s prose pushes, where suppressing the mutator would also stop mutating the data rows the tests do kill — is `TASK 88`, filed in the register rather than left as a paragraph here (`P-06`).
- **A committed reopen has no real-corpus red path, and that is a boundary rather than an omission.** `H-01` denies an agent every git write, including the `git init`/`git commit` a planted fixture would need, so the committed half is proven with an injected git runner in the unit tests and the uncommitted half against the real repository. Naming it here rather than letting the red-path claim read wider than it is.

## Next

`TASK 67` — `harness-evaluator`'s conditional budget — which is the next item in the run order and touches the same role file this item just edited, so it should run before anything else does.
