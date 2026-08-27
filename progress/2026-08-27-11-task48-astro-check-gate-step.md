# 2026-08-27 · Session 11 — TASK 48: a delegated slice closes without `astro check` having run

**Task:** TASK 48 — A delegated slice closes without `astro check` having run
**Status after this session:** DONE

## What was done

`astro check` is the gate's **`type check`** step, placed before the e2e tier. The bug was reproduced first — a full gate run reporting **GATE PASSED, 19 of 19, with a type error sitting on disk** — then closed, then proven in red and in skip.

## Decisions

- **The step earns its place; it does not double the build.** Checked rather than assumed (`P-04`), and this was the item's first constraint: with a planted type error `astro build` **exited 0** and built all 17 pages, while `astro check` **exited 1** naming `ts(2322)`. The build does not type-check, so the step covers ground nothing else covers.
- **Before `e2e smoke`, and with no `dependsOn`.** Before, so a type error does not cost three browser engines. No dependency, because a type error does **not** break the build — marking the e2e tier BLOCKED on it would assert a causality that does not exist, and `TASK 34` built `dependsOn` to name a real root cause, not to express ordering.
- **Hints do not fail it, and that needed no setting.** The tree reports **20 hints, 0 errors, exit 0** — the tool's own default severity. A step that fires on advisory output is a step people learn to ignore, so the default is the right one and is recorded rather than configured.
- **The skip guards both halves of the toolchain.** `astro check` is a thin front end over `@astrojs/check`; without it the command *prompts to install* rather than checking, and a step that can prompt is a step that can hang. The `skipIf` therefore tests the astro binary **and** the checker package.
- **The binary is resolved by real path, never `npx`.** `spawnSync` has no shell and `npx` is a `.cmd` shim on Windows — the failure mode the mutation and Playwright steps already carry in their comments: a step that reports FAIL without having run.
- **The mutation floor is not touched here.** It is measured below and it rose; turning the ratchet belongs to `TASK 38`, which owns that burn-down. Moving a threshold inside an unrelated item is how a number stops meaning what its rationale says.

## Findings from validating against real state (P-04)

- **The reproduction is the finding.** A full gate run with a type error on disk reported **GATE PASSED, 19 of 19**. Not a step that was red and ignored — a gate with no opinion at all. That is precisely how two consecutive items closed carrying 19 and 5 type errors, and why "the person who remembers is never the one who wrote the code" was the right diagnosis.
- **The first reproduction attempt was contaminated by its own fixtures, and the guards caught both.** The probe carried a comment reading `TASK 48`, which `check-site` failed on `S-08` — a comment referencing something outside `site/**`. And the work-log skeleton's empty done block failed `check-procedures` plus the liveness test in the guard suite. Neither was a pre-existing defect; both were mine, and the run was redone with one variable isolated. Worth recording because a contaminated reproduction that had gone unnoticed would have argued for the wrong conclusion.
- **The hint count in the item's entry had already expired.** It said 19; the tree reports 20. Exactly the rot `TASK 47`'s entry warns about, in the same session that closed it.
- **The mutation score rose without anyone aiming at it.** **77.10%** over **5,710** mutants — 4,327 killed, 1,083 survived, 223 uncovered, 70 timeouts — against the last recorded 74.74% over 4,773. The floor of 74.5 holds with room. The new well-tested core module is part of why, and this measurement is an input to `TASK 38` rather than a reason to move the number here.

## Done
```yaml
done:
  tests: { status: passed, evidence: ["node scripts/gate.mjs — GATE PASSED, 20 of 20, exit 0", "reproduction: GATE PASSED 19/19 with a type error on disk", "red: GATE FAILED 1 of 20, type check the only failure", "skip: GATE INCOMPLETE, exit 2, declared not silent"] }
  mutation: { status: passed, evidence: ["77.10% over 5,710 mutants, floor 74.5 — gate mutation step PASS"] }
  ci: { status: not_applicable, reason: "no remote exists yet; .github/workflows/harness.yml carries no path filter and runs this same gate (TASK 30 owns the remote)" }
  docs: { status: passed, evidence: ["30-testing.md sub-gate row records the step and its non-redundancy evidence", "check-rules-registry exit 0", "check-docs exit 0"] }
  scope: { status: passed, evidence: ["2 files: scripts/gate.mjs, .claude/rules/30-testing.md"] }
  loose_ends: { status: passed, evidence: ["see Open questions"] }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions

- **The mutation floor is now 2.6 points below the measured score.** That is slack the ratchet is supposed to close, and `TASK 38` owns it. Recorded here as a measurement rather than acted on.

## Next

`TASK 38` — turn the ratchet against the 77.10% measured here. Or `TASK 30`, which is what makes `T-10` checkable at all: every CI dimension in this session's logs reads `not_applicable` for want of a remote.

## Files changed

`scripts/gate.mjs` — the `type check` step.
`.claude/rules/30-testing.md` — the sub-gate commands row records `astro check`, its placement and the evidence that it is not redundant with the build.
