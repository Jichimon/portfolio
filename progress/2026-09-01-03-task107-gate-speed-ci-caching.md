# 2026-09-01 · Session 03 — Gate speed: CI caching and a Stryker incremental spike

**Task:** TASK 107 — CI caching plus a Stryker incremental-mode spike, both scoped to gate speed
**Status after this session:** IN PROGRESS — local work complete and verified; the CI half needs a real push, which `H-01` reserves to the author, and depends on `TASK 106` landing first since both touch the same workflow run.

## What was done

Diagnosed why `node scripts/gate.mjs` is slow: `runGate` (`scripts/guards/lib/gate.mjs`) runs its ~20 steps through a plain sequential loop, and `mutation` (Stryker) dominates the cost by a wide margin. The author scoped the work to two levers, explicitly declining a third (a parallel DAG scheduler for `runGate`, which would have touched the mutation-covered surface and needed spec-first): CI-only dependency caching in `.github/workflows/harness.yml`, and a spike on Stryker's `incremental: true`, focused on whether it can work in CI specifically.

Added `cache: 'npm'` (both lockfiles) and Playwright browser caching to `harness.yml`. Added `incremental: true` plus an explicit `incrementalFile` to `stryker.config.mjs`, and wired `actions/cache/restore` + `actions/cache/save` around the gate step so the incremental cache survives between CI's otherwise-ephemeral runs.

## Decisions

- **Parallel scheduler (`runGate` as a DAG) dropped from scope, by the author's explicit call.** It was the higher-ceremony option (touches `scripts/guards/lib/gate.mjs`, mutation-covered, needs spec-first per `P-02`/`T-01`) and the author asked to focus on the two CI-only levers instead. Not rejected on the merits — left as a known option if gate speed becomes a problem again.
- **`incrementalFile` named explicitly** (`.stryker-tmp/incremental.json`) rather than left at Stryker's default, so the CI cache step has a fixed path to key on and the file's home is documented rather than discovered.
- **CI cache step split as `restore` + `save`, not the combined `actions/cache` action**, keyed on `github.run_id` with a `restore-keys` prefix. The combined action does not overwrite an existing key, so a fixed key would only ever populate once; this way every run saves a new entry and restores the most recent prior one.
- **Cache saved unconditionally (`if: always()`).** A red gate run still resolved some mutants; losing that progress on a failure means the next run starts cold right when iteration speed matters most.

## Continued — the first real CI run, and what it actually said (P-04)

`TASK 106`'s push (`059a7e5`, before this item's own changes existed) ran `harness.yml` for the full **6-hour GitHub Actions default and was cancelled — log empty.** `node scripts/gate.mjs > gate.log 2>&1` buffers everything until the process exits; a run that doesn't exit within the window leaves nothing to read, live in the Actions UI or after cancellation. This is a real gap in what shipped, found the expensive way (a burned 6-hour run) rather than caught by review.

**Root-caused before spending a second blind 6-hour run on it.** Stryker's own source (`node_modules/@stryker-mutator/core/dist/src/concurrent/concurrency-token-provider.js`) computes default concurrency as `os.availableParallelism() - 1` (for >4 cores). This machine: `os.availableParallelism()` → 12 → concurrency 11. GitHub's standard `ubuntu-latest` runner: 2 cores → concurrency 2. A >5x drop in parallel test-runner processes, compounding with generally slower shared cloud cores per core, plausibly turns the ~10–11min local cold run measured above into multiple hours on CI — a **compute-bound cost**, not a hang. Two fixes, both required before another real run is worth its cost:

- `run the gate` now streams through `tee` (`node scripts/gate.mjs 2>&1 | tee gate.log`) instead of redirecting to a file and `cat`-ing it at the end, so progress is visible live in the Actions log and survives a cancellation. `code=${PIPESTATUS[0]}` reads node's own exit status rather than `tee`'s (which always succeeds) — verified directly: `bash -c '(exit 7) | tee /dev/null; echo ${PIPESTATUS[0]}'` prints `7`, and the plain `$?` form would not.
- The job gains `timeout-minutes: 90`, stated as provisional in its own comment. There is no GitHub Actions default escape short of the 6-hour ceiling, and hitting that blind produced zero diagnostic value. 90 minutes bounds the next run's cost while it produces the real timing data needed to set this number honestly.

Both changes verified locally: `node scripts/guards/gate/check-docs.mjs` (PASS, still no `paths:` filter, still runs `node scripts/gate.mjs`), `node --test scripts/guards/lib/ci.test.mjs` (11/11), the workflow YAML parsed with the `yaml` package already in `site/node_modules`, and the extracted "run the gate" script syntax-checked with `bash -n` after every edit. **This is still a diagnostic, not a fix for the underlying compute cost** — 90 minutes is enough to observe real per-step timing on the next push, not a claim that the run will complete inside it. The genuine fix (incremental mode's cache making most runs cheap, or a paid larger runner, or moving mutation off the blocking path) is still an open decision, informed by whatever this next run actually shows.

## Findings from validating against real state (P-04)

- **Measured, not assumed: incremental mode reconstructs the full aggregate score, not a delta.** Baseline run (cold, `.stryker-tmp` removed first): **78.58%, 10m 31s**. Second run, no code changes: **78.58%, 21s** — same score, ~30x faster. This is the core claim the CI caching depends on, and it held.
- **The third validation point — a real regression, in a file that changed since the last cache entry, still fails the step — was attempted and not completed this session.** Weakened one assertion in `scripts/guards/lib/ci.test.mjs` (kept the call to `validateWorkflow` so coverage stayed intact, removed the assertions so a mutant that survives would no longer be caught), then a third Stryker run was denied by Claude Code's own auto-mode permission classifier — a session-level control distinct from this repository's guards, not something to route around. The test file was reverted immediately (`node --test scripts/guards/lib/ci.test.mjs` — 11/11 passing again, confirmed against the real, unmodified file) rather than left mid-experiment. **This is the residual**, not a settled result — see Open questions.
- **`check-docs.mjs` and `ci.test.mjs`'s own `LIVENESS` cases pass against the edited `harness.yml`** — the new cache/restore steps add no `paths:`/`paths-ignore:` filter and the workflow still runs `node scripts/gate.mjs` as the one command (`T-09`).
- **`TASK 106`'s first push confirmed harness.yml *runs*, not that it runs well** — see above: 6 hours, cancelled, empty log. The dependency this session flagged ("cannot be observed as working until that push happens") turned out to matter in a way nobody had reason to predict in advance: the workflow itself needed an observability fix before its own failure mode was legible.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test scripts/guards/lib/ci.test.mjs — 11/11, both before the regression and after reverting it", "node scripts/guards/gate/check-docs.mjs — PASS, 62 living docs, 305 refs resolved, harness.yml still carries no path filter", "bash -n on the extracted 'run the gate' script after each edit", "PIPESTATUS semantics verified directly: bash -c '(exit 7) | tee /dev/null; echo ${PIPESTATUS[0]}' -> 7"] }
  mutation:   { status: passed, evidence: ["node node_modules/@stryker-mutator/core/bin/stryker.js run — cold 78.58% in 10m31s; unchanged rerun 78.58% in 21s, same aggregate score, floor (77.0) held both times"] }
  ci:         { status: blocked, reason: "the first real run (059a7e5) went 6 hours and was cancelled with an empty log before the tee/timeout fixes existed. The actions/cache wiring, the incremental spike's CI behavior, AND the observability fix itself all still need one real, informative push (H-01 reserves that to the author) before any of them can be called confirmed" }
  security:   { status: not_applicable, reason: "config only — npm/Playwright cache keys and a Stryker cache path already covered by ignorePatterns (H-04's existing sandbox exclusion); no guard or boundary logic touched" }
  docs:       { status: passed, evidence: ["this log", "TASKS.md TASK 107 entry, updated with the real CI result and the root-cause diagnosis"] }
  loose_ends: { status: passed, evidence: ["the regression-still-caught validation point still named explicitly as unresolved", "the 90-minute timeout stated as provisional rather than measured, with what would make it honest named directly"] }
  scope:      { status: passed, evidence: ["parallel-scheduler option still deliberately out of scope", "the observability/timeout fix stayed inside harness.yml — no attempt to also fold in a Stryker concurrency override or a job split without first seeing what the next real run actually shows"] }
  content:    { status: not_applicable, reason: "no resources/** or site-facing content touched — CI workflow and mutation config only" }
  iterations: { status: passed, evidence: ["5"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1", "verify=4"] }
```

## Open questions

- **The regression-still-caught validation.** Needs either the author granting the permission the auto-mode classifier withheld, or the author running a third Stryker pass themselves with a deliberately weakened test to confirm incremental mode doesn't hide a real regression, before this is trusted for the `break: 77.0` ratchet (`T-03`).
- **Whether 90 minutes is even the right order of magnitude is genuinely unknown.** No real, observable CI timing exists yet — the only real run so far hid its own progress. The next push is the first chance to find out, live.
- If the next run's live timing shows mutation is still the dominant cost even warm, the options this session declined to reach for blind — an explicit Stryker `concurrency` override tuned to the runner's real core count, a paid larger GitHub-hosted runner, or splitting mutation into its own job/workflow — become worth pricing against real numbers instead of guesses.

## Next

Author reviews the diff and pushes as a **deliberate, monitored diagnostic** — not a hopeful retry. With `tee` streaming live, the Actions log will show real per-step timing for the first time; watch it rather than walking away. Whatever it shows (completes within 90 min, needs a longer bound, or shows one step is disproportionately slow) is the input to the next decision, not a guess. Once a real CI run confirms the design and the regression-still-caught validation is done, close `TASK 107` and fold the "NOT YET TRUSTED" note out of `stryker.config.mjs`.

## Files changed

`.github/workflows/harness.yml` — npm cache (both lockfiles), Playwright browser cache with conditional install, Stryker incremental-cache restore/save around the gate step; `timeout-minutes: 90` at the job level; `run the gate` streams through `tee` with `${PIPESTATUS[0]}` instead of redirect-then-`cat`.
`stryker.config.mjs` — `incremental: true`, explicit `incrementalFile`, with the spike's rationale and its unproven residual recorded inline.
`TASKS.md` — `TASK 107` opened, then extended with the real CI result, the root-cause diagnosis, and the two fixes.
