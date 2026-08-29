# 2026-08-28 · Session — TASK 63: the paired-predicate assertion reaches every gate step

**Task:** TASK 63 — every one of `scripts/gate.mjs`'s 20 steps gets a test proving it fails on a planted defect of its own kind, so a step reporting PASS while verifying nothing (EVAL-001's largest finding: 8 of 15 escaped defects, one failure mode) cannot recur silently.
**Status after this session:** DONE

## Plan (approved 2026-08-28, plan-mode checkpoint)

Plan file: `C:\Users\luisa\.claude\plans\task-63-the-hand-off-is-lucky-sparkle.md`

Mechanism: every `STEPS` entry gains a `redProof: { file, test }`, resolved the same way `evals.mjs` resolves eval-case proofs. A new pure module `scripts/guards/lib/gate-steps.mjs` validates the real, imported `STEPS` array (not a copy) — so a 21st step added later cannot land without its own red proof.

Four implementer slices, disjoint file ownership (G-12). A, B, C1 in parallel; C2 only after C1 returns (same files).

- **Slice A** — the step contract: `scripts/gate.mjs` (export STEPS, add redProof to all 20), new `scripts/guards/lib/gate-steps.mjs` + `.test.mjs`.
- **Slice B** — liveness for Vitest/Playwright: `scripts/guards/lib/gate.mjs` (`countTestsRun`), `gate.test.mjs`.
- **Slice C1** — canvas relocation: new `scripts/guards/lib/canvas.mjs` + `.test.mjs`, `docs/design/canvas/verify.mjs` becomes thin CLI; strip HTML comments before every structural check; battery for the 5 derived checks only.
- **Slice C2** (after C1) — canvas design contract: literals (breakpoints, class names, GROWS/COUNTS vocabulary) move to a declared `canvas` key in `guards.config.json`; battery proves the check reads the declaration, not a hardcoded literal.

Orchestrator-owned (not delegated, INC-16 shape): `stryker.config.mjs` floor bump, `.claude/rules/30-testing.md`, `evaluation-cases/EC-002-*.yaml`, `docs/design/canvas/README.md`, `docs/harness/contracts.md`, `TASKS.md`, this file.

## Findings from validating against real state (P-04)

- Confirmed: 13 guard-CLI steps already carry T-04 batteries in `scripts/guards/lib/*.test.mjs` (754 tests, 0 fail, measured before any change).
- Confirmed: `countTestsRun`'s regex does not match Vitest's summary (`      Tests  15 passed (15)`) — verified by running `node node_modules/vitest/vitest.mjs run` directly.
- Confirmed, worse than the hand-off stated: `docs/design/canvas/verify.mjs` sits outside BOTH the `guard tests` glob and Stryker's mutate glob — a battery beside it as-is would run under nothing.
- **Correction to the hand-off:** its 5-row gap table missed the largest gap — nothing reads the real `STEPS` array in `gate.mjs`; `gate.test.mjs` only exercises `runGate` against synthetic fixtures. A drifted binary path or a permanently-true `skipIf` is caught by nothing, which is the exact class the 8 escaped defects belonged to.
- **Correction to the hand-off:** it overstates what the 13 lib batteries prove — predicate logic, not CLI wiring (`process.exit`). Only `check-terms` has a CLI-level test; `check-evals.mjs`'s vacuous-incident-set guard lives in neither lib nor test.
- **Addition, found during author review (not in the hand-off):** of `verify.mjs`'s 7 checks, only 5 derive from the artifact; 3 hardcode design-version literals (breakpoints, `class="rail"/"lang"/"cur"`) and 1 hardcodes a copy vocabulary (GROWS/COUNTS). Writing a battery over those as-is would mechanize brittleness against a future redesign — reshaped slice C into C1/C2 to declare the literals instead of hardcoding them.
- **Addition:** `EC-002`'s own notes are stale — they assert no repo-wide mutation gate exists; TASK 15 shipped one (`break: 74.5`). In scope to reconcile.

## Decisions

- **Reworked slice C into C1/C2 during author review, before any delegation.** The author asked, correctly: what happens to this new battery when the design changes? Reading verify.mjs's 7 checks showed only 5 derive from the artifact; 3 hardcode this design version's literals (breakpoints, class names) and 1 hardcodes a copy vocabulary. C1 relocates and batteries only the 5 derived checks (plus strips HTML comments before every structural check, so commenting out a section while iterating no longer trips the gate). C2, sequential after C1, moves the literals into a declared canvas key in guards.config.json that the author edits alongside a redesign.
- **redProof wiring into the real STEPS array is deferred to the orchestrator, after all slices return — not built into slice A.** Slice A's validator needs every step's real proof file to exist before it can assert anything about the live array; B and C1 create those proof files in parallel and don't share ownership with A. Wiring the 20 real redProof values, and the one integration test asserting the real array is clean, is a single post-merge pass — same shape TASK 65 used for contracts.md/TASKS.md (INC-16: two agents in the same shared file in the same window).
- **Three slices dispatched in parallel** (A: gate-steps.mjs contract + gate.mjs export/guard; B: countTestsRun widened for Vitest/Playwright; C1: canvas relocation) — disjoint files (G-12). C2 (canvas.mjs literals -> config) waits for C1's return.

## The final wiring pass (orchestrator) — and what it caught

All four slices landed clean (A, B, C1 with a footer each; B and C2 needed a resume after being cut at their turn budget, per P-18 — B resumed via SendMessage and finished with a footer; C2 was cut with its substance already complete, verified directly by the orchestrator rather than spending further budget on a resume for verification-only work). Zero regressions across 819 tests with all four landed.

Wiring the real `redProof` values into all 20 `STEPS` entries, then adding the integration test that runs `validateSteps` against the real, imported array (not a fixture), is exactly the check this item exists to build — and it found real bugs immediately, which is the point:

1. **`gate-steps.mjs`'s own cmd-path check false-positived on glob patterns.** `guard tests` and `site core tests` hand `node --test` a glob (`scripts/guards/**/*.test.mjs`), which `existsSync` never resolves regardless of how many real files it matches. Fixed by excluding entries containing `*`, red-proven with a dedicated test.
2. **`guard tests` genuinely had no `skipNote` for its `skipIf`** — a real, pre-existing gap (undeclared skip, the exact silent-pass shape this item exists to close), invisible until something actually checked the pairing. Added.
3. **A path-resolution bug in the orchestrator's own integration-test harness**, not in the shipped validator: `cwd`/`cmd` entries in `gate.mjs` are built as absolute paths (`join(ROOT, ...)`), while `redProof.file` follows the repo-relative convention `evals.mjs` already uses. The test's `io` was joining ROOT onto already-absolute paths a second time, silently producing paths that could never exist. Fixed with `path.isAbsolute`.
4. **Three `redProof.test` values needed a literal backslash.** `io.read(file).includes(test)` matches the file's raw SOURCE TEXT, not an evaluated JS string — and three test names (component tests, e2e smoke, design canvas) are written as single-quoted strings with an escaped apostrophe (e.g. `Vitest\'s`), so the backslash is part of the literal characters on disk. Easy to get wrong once, which is exactly why the integration test exists rather than trusting the wiring by inspection.

None of these would have been caught by any single slice's own battery — each slice tested its own proof file in isolation and had no reason to know about the other three. This is the property `P-16` asks for: proven directly, by adding a 21st step with no `redProof` to the real array and confirming it's caught (`gate-steps.test.mjs`, "adding a step with no redProof to the real STEPS array is caught, not silently accepted").

Full suite after all fixes: 822 pass, 0 fail.

## Harness measurement, at wrap-up (P-12)

Read from `evidence/runs/1de0af84-fff4-4d2f-b871-7f9142fa425c/` directly, not from memory:

| run | tool.requested | policy.decision deny | unsafe-action attempts (deny + no result) | footer |
|---|---|---|---|---|
| `implementer-ad764975ffce4587a` (slice A) | 56 | 0 | 0 | `COMPLETE/objective_reported` |
| `implementer-a3b0ad89ecb4a1ac2` (slice B, resumed once per P-18) | 81 | 1 | 1 (`git stash && ... && git stash pop`, denied by the `git-write` guard on `H-01`) | `COMPLETE/objective_reported` |
| `implementer-a4309d6bd58032739` (slice C1) | 51 | 0 | 0 | `COMPLETE/objective_reported` |
| `implementer-af0d7f38d0284b2c0` (slice C2, cut at budget with substance complete, verified directly rather than resumed) | 52 | 0 | 0 | none — cut, per `G-06` |
| `orchestrator` (this session, final) | 195 | 0 | 0 | written at `/wrap-up` |

**The one boundary that fired, fired correctly.** Slice B's `implementer` tried `git stash && node --test ... && git stash pop` — a reasonable-looking way to test against a clean baseline — and `H-01`'s `git-write` guard denied it before execution, with no `tool.result` following (a true attempt, not an executed write). The agent recovered without git access and delivered correctly. This is the boundary doing exactly what it exists to do: the human's ability to see everything an agent did in one diff, preserved.

**Two of four delegated runs needed a resume (`P-18`, `G-06`), and the two failure modes looked identical from the notification alone but were not identical on disk.** Slice B's cut left zero code in its owned files — a true "cost is total, not proportional" case, and the resume also had to correct a wrong derivation (it had used `test.skip()` for Playwright's "zero tests" case, which produces `"1 skipped"`, not the genuine zero-match path) before it could finish. Slice C2's cut left its entire substance complete — config, four new functions, twenty new tests, all seven `verify.mjs` sections wired — with only its own verification unrun; resuming it would have spent a fresh budget re-deriving conclusions the orchestrator could confirm directly in three cheap commands. Treating both cuts the same way (blind resume, or blind takeover) would have been wrong in both directions.

No regression found in the harness's own machinery; the `redProof` mechanism this item built found four real, live bugs in the wiring on its first real run against real data — recorded above — which is itself evidence the check has teeth (`EC-002`'s exact question: would this check catch something broken, or does it just look like it would).

## Open questions

None.

## Next

`TASK 61` — next in the author's chosen order (`65 → 63 → 61 → 64 → 66 → 67 → 75`). Hand-off packet written: `progress/handoff/2026-08-28-task61.md`. `TASK 61` is a smaller, single-surface item than `TASK 63` (`path-boundary` denies reads `H-02`/`H-03` exist to permit — one guard, one fix, no multi-slice shape), but "the normal case" per `progress/README.md` is still a fresh session next, so the packet is written per that default rather than skipped for the item's size.

## Files changed

`scripts/gate.mjs` — `STEPS` exported, run block guarded behind a main-module check so importing the file no longer executes the gate; all 20 entries gain a `redProof: { file, test }`; `guard tests` gains the `skipNote` it was missing.
`scripts/guards/lib/gate-steps.mjs` — new. `validateSteps(steps, io)`: nine structural checks per step, derived from the step object itself, never a hardcoded roster (P-13); a malformed step is a finding, never a throw (G-13).
`scripts/guards/lib/gate-steps.test.mjs` — new. 25 tests: a red-path battery against synthetic fixtures, plus the integration test running `validateSteps` against the real, imported `STEPS` array, plus the `P-16` proof that a 21st step with no `redProof` is caught.
`scripts/guards/lib/gate.mjs` — `countTestsRun` widened to recognize Vitest's and Playwright's real zero-tests and N-passed summary shapes, alongside `node:test`'s (unchanged).
`scripts/guards/lib/gate.test.mjs` — 5 new tests for the widened `countTestsRun`.
`scripts/guards/lib/canvas.mjs` — new. Nine pure functions relocated/added from `docs/design/canvas/verify.mjs`: five artifact-derived structural checks (registration, derived-screen drift, anchors, locale hygiene, spec agreement) plus four config-driven checks (responsive contract, page chrome, growing-count copy, switcher current-locale) reading their literals from `guards.config.json`'s new `canvas` key rather than hardcoding them.
`scripts/guards/lib/canvas.test.mjs` — new. 38 tests: red-path battery per check, comment-stripping proof, and the redesign-rehearsal shape (a declared value changed, the check fails naming the config path, reverted, passes again).
`scripts/guards/guards.config.json` — new `canvas` key: breakpoints, theme attribute, fixed-width-floor pattern, chrome class names, switcher exclusions, the GROWS/COUNTS vocabulary and the year-exclusion pattern — every literal `verify.mjs`'s sections 2/2b/5/6 used to hardcode.
`docs/design/canvas/verify.mjs` — thin CLI: does every `readFileSync`/`readdirSync`/`JSON.parse`, calls into `canvas.mjs`'s nine functions, keeps no check-logic of its own. Output byte-for-byte identical to before.
`stryker.config.mjs` — `break: 74.5 -> 75.5`, against a re-measured 76.07% (6,800 mutants).
`.claude/rules/30-testing.md` — `T-03`'s row and the toolchain table both reconciled to the new floor and measurement.
`evaluation-cases/EC-002-a-test-that-would-pass-with-the-system-off.yaml` — `control`/`proof` repointed at `gate-steps.mjs`'s generalization, `outcome: Partial -> Caught`, stale notes (claiming no mutation gate existed) corrected.
`docs/design/canvas/README.md` — the "Verifying a pass" table gains a Layer column (structural vs declared) naming exactly which config key governs each literal check, plus a paragraph on the `TASK 63` relocation.
`docs/harness/contracts.md` — one paragraph in §6, generalizing the eval-case proof idiom to the gate's own `redProof` mechanism.
`TASKS.md` — `TASK 63` closed with a full account; the "Run order" table's row 5 corrected to `fix · DONE` (the same reconciliation gap `TASK 65` caught once already, on the same table).
`progress/2026-08-28-07-task63-paired-predicate-gate-steps.md` — this file.
`progress/handoff/2026-08-28-task61.md` — the hand-off packet for the next work item, written at close (`P-05`, `progress/README.md`).
`TASKS.md` — `TASK 82` opened for slice B's flagged edge case (all-skipped/all-todo suites read as non-zero), and a stray block of `/wrap-up` skill instruction text — paste contamination from an earlier session, sitting under `TASK 81` with no connection to that item's content — removed.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test \"scripts/guards/**/*.test.mjs\" — 822 pass, 0 fail"] }
  mutation:   { status: passed, evidence: ["node scripts/gate.mjs mutation step — 76.07% (6800 mutants, 5098 killed + 72 timeout), floor raised 74.5 -> 75.5"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs — GATE PASSED, 20/20 steps, run twice at close (this file's own then-missing done block was the sole FAIL mid-session; resolved by this block, then re-run clean after TASK 82 was opened and TASKS.md's stray TASK 81 contamination was removed — 76.07% then 76.06% mutation, both above the 75.5 floor)"] }
  docs:       { status: passed, evidence: ["node scripts/guards/gate/check-docs.mjs — PASS", "node scripts/guards/gate/check-evals.mjs — PASS, EC-002 now Caught", "node scripts/guards/gate/check-rules-registry.mjs — PASS", "TASKS.md Run order table row 5 corrected to `fix · DONE` at close (P-07), same reconciliation gap TASK 65 caught once already", "TASKS.md: stray /wrap-up skill-instruction text (paste contamination under TASK 81, unrelated to that item) found and removed at /wrap-up's own reconciliation step"] }
  security:   { status: passed, evidence: ["the one guard denial in this session's trace (implementer-a3b0ad89ecb4a1ac2, a git stash attempt) fired correctly on H-01 with no tool.result following — a true attempt, not an executed write"] }
  content:    { status: not_applicable, reason: "harness/guard work; resources/** untouched" }
  ci:         { status: not_applicable, reason: "no remote exists yet (TASK 30)" }
  scope:      { status: passed, evidence: ["git status --short — 11 modified + 6 new files, matching the four-slice ownership split plus the orchestrator-owned files named in the plan, plus TASK 82's opening and the hand-off packet written at close"] }
  loose_ends: { status: passed, evidence: ["the redProof mechanism's own four wiring findings (glob false-positive, missing skipNote, absolute-path join, backslash-in-source-text) were fixed in this same session, not deferred", "TASK 82 opened for slice B's flagged edge case: an all-skipped/all-todo Vitest suite reads as a positive count, not zero — pre-existing in node:test's own shape too, not introduced here, not urgent (no real file is all-skipped today), but tracked per P-06 rather than left in a slice report", "TASKS.md hygiene finding, unrelated to this item's scope but fixed while reconciling it: a stray block of /wrap-up skill instruction text (paste contamination from an earlier session) was sitting under TASK 81 with no connection to that item's content — removed"] }
  iterations:      { status: passed, evidence: ["8"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1", "slice=4", "verify=1", "reconcile=2"] }
```
