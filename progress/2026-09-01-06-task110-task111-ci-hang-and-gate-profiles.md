# 2026-09-01 · Session 06 — TASK 110 + TASK 111: the CI hang, and gate profiles

**Tasks:** `TASK 110` (bugfix — `e2e smoke` hangs in CI) and `TASK 111` (harness — gate profiles)
**Status:** `TASK 110` **`DONE`** against run `33566729304`; `TASK 111`'s push half **done** against run `33570798170`, its full-profile half closed against `33571567866` (success, 11m8s). Both items `DONE`. Read from the provider, never from this log (`T-10`).

## Why these two, in this order

The CI failure had been read as strictness for three sessions. It was not: the gate **hung**
in `e2e smoke`, and it would have hung with zero mutants. `TASK 110` is that bug. `TASK 111`
is the mechanism the author asked for — one that keeps the heavy tiers off the per-push path
without deleting them.

## The root cause, and how it was found

The author's framing was that the gate is too strict. The first thing checked was the actual
run rather than the premise (`P-04`), and the run said something else:

- Run `33537419972`: last gate output **17:24:08**, cancellation **18:53:17**. Eighty-nine
  minutes, not one line.
- Its own cleanup block: `Terminate orphan process: (6262) (npm exec astro preview)`, with
  Playwright (6158) still waiting on it.
- The decisive one: the three-engine run and the Chromium-only run (`TASK 108`) died at
  **exactly the same 90 minutes**. A 3× cut that moves the wall time by nothing was never
  fixing what was wrong.

`astro preview` runs in the foreground unless `--background` is passed **or** it detects an
AI coding agent in the environment — `isRunByAgent()`, backed by `am-i-vibing`, whose
variable list contains `CLAUDECODE` and does not contain `GITHUB_ACTIONS`. Confirmed by
running the detector both ways rather than by reading the list:

```text
$ node site/node_modules/am-i-vibing/dist/cli.mjs
✓ Detected: [claude-code] Claude Code (agent)
$ env -u CLAUDECODE node site/node_modules/am-i-vibing/dist/cli.mjs
✗ No agentic environment detected
```

So the gate worked locally *because an agent was running it*. On a runner the same line
blocks forever, `globalSetup` never returns, and the job dies having verified nothing.

**Second failure, and the reason it took three cancelled runs.** `gate.mjs` captured each
step's stdout and printed it when the step **finished**, so a step that never finished
printed nothing. A hang and a slow run are indistinguishable when the instrument only
reports at the end.

## What was done

### TASK 110

- **`site/tests/e2e/preview-lifecycle.ts`**: `astro preview` → `astro preview --background`.
  One flag. The file's own comment, which asserted this Astro version *is* a background
  daemon, described a machine rather than a version and is corrected in place.
- **Per-step time bounds.** `scripts/gate.mjs` spawns with `timeout` + `SIGKILL`; the runner
  returns `timedOut` and `scripts/guards/lib/gate.mjs` reports `FAIL` naming the bound —
  read **before** the exit code, because a killed process's status says nothing. Bounds are
  chosen, not measured (`C-01`), and say so: 5 min default, 10 for `e2e smoke`, 20 for the
  capture matrix, 90 for mutation.
- **Live progress to stderr**, which is inherited rather than captured: a `>` line naming the
  step, its tier and its bound before it runs, a `<` line with the verdict and real elapsed
  time after. This is what `TASK 107` wanted and did not get.
- **`gate-steps.mjs`** rejects a malformed `timeoutMs` — `spawnSync` silently ignores a
  non-numeric timeout, so a step *declaring* a bound it does not have is the same silent
  failure one level up.

### TASK 111

- **`tier` on every step** (`fast` | `deep`), the vocabulary and the profile table declared
  once in `lib/gate.mjs` and derived from everywhere else.
- **`DEFER`, a fourth verdict.** Not a `SKIP`: a skip means the precondition was absent and
  nothing verified this anywhere; a defer means another profile runs it, and the note says
  which. Folding them together would exit 2 on every fast run and force CI to accept
  arbitrary skips alongside `confidentiality` — `INC-08`'s shape arriving through a verdict
  name.
- **The e2e tier splits by tag, not by file**: `--grep-invert @deep` (69 tests, 23.8s) on a
  push, `--grep @deep` (102 tests, 38.7s) in the full profile. 69 + 102 = 171 — checked
  against the pre-split run, not assumed. The route-set anti-empty assertion stays untagged
  on purpose: a guard deferred with the thing it guards is not a guard.
- **The workflow derives its profile from the trigger**, in one job. Nightly `schedule` +
  `workflow_dispatch` with a profile input; the Stryker cache steps now run only in the
  profile that has a mutation step to cache.

## Findings from validating against real state (P-04)

- **The author's own premise was half right, and saying which half was the whole job
  (`P-17`).** "Bajar lo estricto del gate" would not have fixed CI: the hang is upstream of
  strictness, and a gate with zero mutants would still have died at 90 minutes. The
  cost problem is real and separate, which is why this is two items.
- **Two prior sessions' fixes were aimed at a symptom, and one of them wrote its wrong root
  cause into the register as fact.** `TASK 107`'s entry stated *"a compute-bound cost, not a
  hang"*. Corrected in place rather than deleted — its caching work is real and stands.
- **The heredoc kept truncating on large writes**, twice producing a bash parse error and
  once nearly clobbering `lib/gate.mjs`. Checked with `git status` before assuming anything
  was lost (nothing was), then switched to file-based writes for anything over ~200 lines.
- **The first fix attempt tripped `S-08`.** The comments explaining `INC-18` inside
  `site/tests/e2e/**` cited an incident id, a task id and a `node_modules/` path — all
  forbidden inside `site/`. `check-site` caught all three. The reasoning moved to `ADR-006`
  and `architecture.md §C`, which is where the rule says it belongs, and the code comments
  kept the mechanism without the citations.
- **The deferral block was printed on the happy path only, which is wrong in the exact
  environment it exists for.** CI always exits `INCOMPLETE` — `private/banned-terms.txt` is
  gitignored by design, so the confidentiality step skips there (`H-04`) — so the one log
  anybody audits would have been the one log that never said what the profile deferred.
  Found by walking the CI exit paths rather than by a test failing; moved into `lib` as
  `formatDeferrals`, printed before the verdict branches, and covered by a test that asks
  for the block on a FAILED run and on an INCOMPLETE one.
- **One headline deliberately does NOT carry the profile, and that was checked rather than
  reasoned about.** `harness.yml` reads the skip count out of the `GATE INCOMPLETE` line with
  a sed expression anchored on text ending at `did not run:`, and `s///p` prints whatever
  follows. Both spellings were run through the workflow's own expression:

```text
  headline as it is        -> skips='1'                  -> ACCEPTED (job green)
  headline + "(profile:)"  -> skips='1 (profile: fast)'  -> REJECTED (job red)
```

  Appending the profile there would turn CI red on the single skip it is designed to accept
  (`confidentiality`, `H-04`). The profile is named one line above instead, in the deferral
  block, and the coupling is documented at both ends so nobody tidies it into a failure.
- **A new required property broke an existing fixture, correctly.** Making `tier` mandatory
  failed one `gate-steps.test.mjs` test whose fixture builder predates it. The fixture was
  wrong, not the rule.

## Red-path battery (P-14, T-04)

Every new mechanism was neutered and its battery re-run. All seven fail red and pass restored:

| mechanism | neutered | restored |
|---|---|---|
| the `timedOut` branch in `evaluate()` | FAIL | pass |
| the defer branch in `runGate` | FAIL | pass |
| the unknown-profile guard | FAIL | pass |
| `validateSteps`' tier check | FAIL | pass |
| `validateSteps`' `timeoutMs` check | FAIL | pass |
| the cross-tier dependency check | FAIL | pass |
| `formatDeferrals`' empty-list guard | FAIL | pass |

And the defect itself, which is the one that matters:

| | before `--background` | after |
|---|---|---|
| `env -u CLAUDECODE … playwright test` | killed at the 180s bound, **0 tests**, failing at `preview-lifecycle.ts:16` | **171 passed in 51.7s** |

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test \"scripts/guards/**/*.test.mjs\" — 1092 pass, 0 fail (1059 at TASK 109; +33 reconciles exactly)", "gate.test.mjs 25 -> 49, gate-steps.test.mjs 25 -> 34", "site/lib: 235 pass, 0 fail"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs --profile full — GATE PASSED, 22/22, exit:0 (run twice; the second is the final tree)", "node scripts/gate.mjs — GATE PASSED (profile: fast), 20 run + 2 deferred by name, exit:0", "measured on the final tree from the gate's own new per-step lines: fast 48.6s, full 118.2s with a warm incremental cache. A COLD mutation run measures ~10-11 min on this machine and has never completed on a runner"] }
  mutation:   { status: passed, evidence: ["ran inside the full-profile gate above: 79.39 then 79.40 vs the 77.0 break threshold, on two runs", "break 77.0 unchanged and the mutate glob untouched — this item changed cadence, not coverage"] }
  security:   { status: passed, evidence: ["seven new mechanisms each neutered and re-run: all fail red, all pass restored (table above)", "the defect itself reproduced red and green under the CI condition, env -u CLAUDECODE"] }
  ci:         { status: passed, evidence: ["TASK 110: run 33566729304 — e2e smoke PASS in 29.1s on a real runner, whole job 1m57s, all 22 steps reached (three previous runs were cancelled at 90min and 6h having verified nothing)", "TASK 111 push half: run 33570798170 — success 2m30s, profile derived from the trigger, both deep steps DEFER, deferral block printed, job green", "TASK 111 full-profile half: run 33571567866, dispatched"] }
  docs:       { status: passed, evidence: ["INC-18 in architecture.md §C; EC-015; ADR-006 amendment correcting the one above it; T-03 and T-09 amended per G-11; CLAUDE.md, README.md, package.json, both procedure skills, stryker.config.mjs", "check-docs, check-rules-registry, check-evals, check-procedures all PASS"] }
  loose_ends: { status: passed, evidence: ["the two residuals are stated below rather than dropped: the between-runs mutation gap, and the unmeasured deep-profile CI cost"] }
  scope:      { status: passed, evidence: ["the e2e hang, the bounds, the progress lines, the profiles, and their reconciliation — nothing else. TASK 38 (the ratchet) and TASK 69 (the e2e flake) were deliberately not touched"] }
  content:    { status: not_applicable, reason: "no resources/** touched" }
  iterations: { status: passed, evidence: ["1"] }
  iteration_split: { status: passed, evidence: ["verify=1"] }
```

## Residuals, stated rather than silently dropped (P-19)

- **Between a push and the next nightly run, a mutation regression is not caught by CI.** It
  is still caught locally by the run that closes an item, and by the nightly. The honest
  version: a change merged and left alone for a day is a change whose mutation score nobody
  has read. That is the price of a gate that finishes; the alternative priced and declined
  this session is a larger paid runner.
- **No CI number exists yet for either heavy step on a 2-core runner.** Every bound in this
  session is chosen, not measured. The first `full` run is what corrects them, and if
  mutation does not fit inside 90 minutes there, the decision is between a larger runner, a
  validated incremental cache, and a different cadence — never a lowered floor.
- **`TASK 69`'s e2e flake was not closed here.** Its two failures were on a clean tree
  locally, not in CI, so this hang does not explain them. Left open rather than folded in.

## Outcome, read from the provider

| run | what it proved |
|---|---|
| `33566729304` | **the hang is gone** — `e2e smoke` PASS in 29.1s, job 1m57s, all 22 steps reached. Gate red, on two guards that had never been reachable before: `TASK 112` |
| `33570798170` | **the profile mechanism works in CI** — `GATE_PROFILE: fast`, both deep steps `DEFER`, deferral block printed, `confidentiality` the only skip, job **green** in 2m30s |
| `33571567866` | **the full profile, success in 11m8s** — and the first CI measurement of the mutation step anywhere: **8m11s cold**, score 79.49 vs the 77.0 floor. `e2e visual capture` 53.8s |

The three cancelled runs before these cost 90 minutes, 90 minutes and six hours, and produced
no diagnosis between them. The three that replaced them cost about sixteen minutes together
and produced a named failure, a green job, and the first real cost numbers this repository has
ever had for its own gate.

**The estimate this item was built on turned out to be wrong, by a lot.** `TASK 107` reasoned
from Stryker's concurrency default — 11 workers locally, 2 on a runner — that the ~10-11 minute
local mutation run would take *"hours rather than minutes"* in CI. It takes **eight minutes and
eleven seconds**, cold. The arithmetic was right and the inference was not: a 5x cut in workers
is not a 5x cut in wall time on a step that is not purely parallel. Nobody could have checked
it, because three runs died before `mutation` ever started — which is its own argument for
fixing the instrument before optimising against a number you do not have.

**What that changes, stated rather than left implicit.** The mutation step is `deep` on a cost
that is real but four times smaller than assumed: ~8 minutes per push against the fast gate's
2m30s. That makes the tier a live decision instead of a forced one, and it is recorded in
`TASK 111`'s entry as such, with a recommendation to keep it `deep` and the cost of doing so
named.

## Next

The author reviews the diff and pushes. Then **both items close against the remote, not
against this log** (`T-10`): a push run reporting `GATE PASSED (profile: fast)` with both
deferrals named and `e2e smoke` green, and one manual
`gh workflow run harness.yml -f profile=full` completing the full profile inside its bound.
Two real runs read. The README's CI badge, deliberately withheld by `TASK 101`, goes in once
the first of those is green.

## Files changed

**New:** `evaluation-cases/EC-015-a-check-that-only-passes-under-an-agent.yaml`; this log.
**Modified:** `site/tests/e2e/preview-lifecycle.ts` (the one-flag fix); `site/tests/e2e/screenshots.smoke.spec.ts` (`@deep` tag); `scripts/gate.mjs` (tiers, bounds, profile parsing, progress, headline, the e2e split); `scripts/guards/lib/gate.mjs` (profiles, `DEFER`, timeout reporting, duration and progress formatting); `scripts/guards/lib/gate-steps.mjs` (tier, bound and cross-tier validation); `scripts/guards/lib/gate.test.mjs` (+17); `scripts/guards/lib/gate-steps.test.mjs` (+9, fixture); `.github/workflows/harness.yml`; `stryker.config.mjs` (CI note); `TASKS.md`; `CLAUDE.md`; `README.md`; `package.json`; `.claude/rules/30-testing.md`; `.claude/skills/wrap-up/SKILL.md`; `.claude/skills/work-item/SKILL.md`; `docs/adr/ADR-006-testing-toolchain.md`; `docs/harness/architecture.md`.
