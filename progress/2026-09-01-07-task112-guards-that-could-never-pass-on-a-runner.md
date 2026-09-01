# 2026-09-01 · Session 07 — TASK 112: two guards that could never pass on a runner

**Task:** `TASK 112` — `check-docs` and `check-content` assert file existence against a working tree, and CI does not have one
**Status:** code complete and verified against a runner-equivalent tree; closes against a real CI run, not against this log (`T-10`).

## What produced this item

`TASK 110` fixed the hang. The author pushed, and run
[`33566729304`](https://github.com/Jichimon/portfolio/actions/runs/33566729304) did what none of
the three runs before it could:

```text
> [5/22] e2e smoke  (fast, bound 10m00s)
< [PASS] e2e smoke  29.1s
GATE FAILED (profile: fast) — 2 of 22 step(s) did not pass:
```

Whole job: **1m57s**, against three previous runs cancelled at 90 minutes and six hours. The
step that had been consuming the entire budget and verifying nothing passed in 29 seconds.

And then the gate reached steps 16 and 18 **for the first time in this repository's history**,
and both failed. That is not a regression — it is the first time anybody could see them.

## The finding

Twelve findings, one shape:

```text
TASKS.md cites `private/glossary.md`, which does not exist
.claude/rules/00-hard-rules.md cites `private/glossary.md`, which does not exist
docs/harness/contracts.md cites `private/banned-terms.txt`, which does not exist
guards.config.json  resources/site/intake.md is exempt but does not exist
```

Four files — `private/glossary.md`, `private/banned-terms.txt`, `reports/mutation/mutation.json`,
`resources/site/intake.md`. All four present locally, all four **gitignored on purpose**, none
tracked:

```text
private/glossary.md                    exists=yes tracked=NO
private/banned-terms.txt               exists=yes tracked=NO
reports/mutation/mutation.json         exists=yes tracked=NO
resources/site/intake.md               exists=yes tracked=NO
```

**The citations are right and stay.** `H-04`'s own rule row names `private/glossary.md`.
Deleting a correct reference to make a checker happy is the tail wagging the dog. What was
wrong is the guard's question: *"does this file exist"* is a question about a machine, and the
only question a checkout can answer is *"does the repository claim to contain this"*.

## What was done

- **`scripts/guards/lib/repo-ignore.mjs`** — asks `git check-ignore`, the same source of truth
  the checkout obeys, once per distinct reference and cached. Not a list of paths in a config
  (`P-13`): a new ignored directory next month needs no edit here. Fails closed (`G-13`) — an
  unanswerable call reads as *not* ignored, so a broken git makes the guard stricter, never
  blinder.
- **`doc-links.mjs`** — a missing reference the repository excludes becomes an `info` finding
  (the idiom `gate-steps.mjs` already uses), printed by name, never counted as a defect.
- **`content.mjs`** — an exemption for a deliberately-excluded path is not stale.
- **`scripts/gate.mjs`** — `process.exitCode` and a return, never `process.exit()`. See below.

## The third defect, found by reading rather than by a test

The summary table and the deferral block are **absent from that CI log**, while every stderr
line survived. `grep -c "step(s) deferred"` over the whole 2,354-line log: **0**.

The likely cause is `process.exit()` discarding queued stdout on POSIX, where pipe writes are
asynchronous. **Stated as likely, not proven** — two attempts to reproduce it on this
repository's Windows machine (20,000 lines through a pipe, with and without `process.exit`)
showed no truncation at all, because pipe writes behave differently here. `C-01` applies to a
cause as much as to a number, so it is written down as the best available explanation and the
next CI run is the test.

The fix is correct regardless and costs nothing. **It matters more than it looks:** CI takes
the INCOMPLETE branch on *every* run — `H-04` keeps the term list off the runner — so a
truncated summary there is the normal case, not the rare one, and it would have silently
swallowed the deferral list `TASK 111` exists to print.

## Verified against the real condition, not a fixture (P-04, T-10)

The runner was reproduced locally: a tree holding exactly what a push carries
(`git ls-files -co --exclude-standard`, 483 files), with `.git` alongside so `check-ignore`
can answer. `private/`, `reports/` and `resources/site/intake.md` are absent there, as on a
runner.

| on the runner-equivalent tree | before | after |
|---|---|---|
| `check-docs` | FAIL, 11 finding(s) | **PASS**, 11 machine-local references printed by name |
| `check-content` | FAIL, 1 finding | **PASS** |

Three red paths on that same tree, because a guard that stops failing is only good news if it
still fails for the right reasons (`P-14`):

| probe | result |
|---|---|
| the ignore oracle neutered | the eleven come back as **hard findings** — the fix is what is doing the work |
| a planted citation to a file that was never written | **caught**, exit 1 — the guard is not blind |
| a planted typo *inside* an ignored path (`private/glossry.md`) | excused, and **printed by name** — the stated residual, visible rather than silent |

And in the pure batteries: the `info` branch in `doc-links.mjs` and the exemption clause in
`content.mjs` were each neutered and their tests re-run — both fail red, both pass restored.

**Every other dependency-free gate step was run on that tree too**, precisely so the next push
does not discover a third CI-only failure: `check-rules-registry`, `check-templates`,
`check-settings`, `check-contracts`, `check-agents`, `check-procedures`, `check-trace`,
`check-docs`, `check-context-budget`, `check-content`, `check-site`, `check-evals`,
`check-status-history` and the design canvas — **all PASS**.

**Two guard tests fail on that tree, and both are artifacts of the probe rather than defects.**
`gate-steps.test.mjs`'s real-STEPS check and the Stryker directive canary resolve installed
binaries (`site/node_modules/vitest/vitest.mjs`, `astro.mjs`, Stryker's own package), and the
tree deliberately contains only what a push carries — no `node_modules`. CI runs `npm ci` in
both packages before the gate, and run `33566729304` already reported `guard tests PASS 1.8s`
against that installed tree. Recorded rather than quietly discounted: the probe is faithful for
everything except steps that need an install, and knowing where a probe stops being faithful is
part of using it (`P-11`).

## The CI acceptance path, exercised rather than assumed

One thing between here and a green job had **never executed on a runner**: the workflow's
exit-2 branch, which accepts an INCOMPLETE gate only when `confidentiality` is the single
skip. The three cancelled runs never reached it, and the fourth exited 1.

So it was run, on this machine, against a real gate log — the confidentiality step's `skipIf`
temporarily forced to `true` to reproduce the runner's condition (`private/banned-terms.txt`
never reaches one), the gate piped through `tee` exactly as `harness.yml` does, and the
workflow's own acceptance script extracted verbatim and run against the result:

```text
gate exit=2
::warning::GATE INCOMPLETE — 'confidentiality' skipped ... Every other step ran.
VERDICT: job GREEN (skips=1 conf=1)
job exit=0
```

`scripts/gate.mjs` was restored immediately and verified clean. That same log also carries the
evidence for the exit-handling fix: **the summary table (23 rows) and the deferral block are
both present in an exit-2 run**, which is the branch CI takes every time and the one whose
output went missing on the runner.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test \"scripts/guards/**/*.test.mjs\" — 1108 pass, 0 fail (1092 before this item)", "repo-ignore.test.mjs 7 new, doc-links.test.mjs +5, content.test.mjs +4"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs --profile full — GATE PASSED, 22/22, exit:0, mutation 79.51 vs the 77.0 floor", "on the runner-equivalent tree: check-docs PASS, check-content PASS (both FAIL before), and every other dependency-free step PASS", "the workflow's exit-2 acceptance path run end to end against a real forced-skip gate log: skips=1, conf=1, job GREEN"] }
  security:   { status: passed, evidence: ["oracle neutered -> 11 findings return; planted dangling ref -> still caught; both lib branches neutered -> batteries fail red, pass restored (P-14)", "fails closed: an unanswerable git call reads as not-ignored, so the reference stays a finding (G-13)"] }
  ci:         { status: blocked, reason: "the deliverable is a green run on the remote and only the author can push (H-01). Reproduced locally against a tree containing exactly what a push carries; T-10 forbids reading that as evidence CI fired" }
  docs:       { status: passed, evidence: ["TASK 112 in TASKS.md with the residual stated; TASK 110 closed against run 33566729304; TASK 111 updated with what that run did and did not show", "check-docs, check-content, check-rules-registry, check-procedures, check-status-history all PASS"] }
  loose_ends: { status: passed, evidence: ["the process.exit() cause is recorded as likely-not-proven rather than asserted, with the next CI run named as its test"] }
  scope:      { status: passed, evidence: ["the two failing guards and the output-truncation fix they exposed. No citation was deleted, no exemption widened, no other guard touched"] }
  content:    { status: not_applicable, reason: "no resources/** touched" }
  iterations: { status: passed, evidence: ["1"] }
  iteration_split: { status: passed, evidence: ["verify=1"] }
```

## Residual, stated rather than engineered around (P-19)

**A typo inside an ignored path is excused, on every machine.** `private/glossry.md` is
indistinguishable from a real machine-local citation without asking a human which files that
directory is supposed to hold. The mitigation is that every excused reference is printed by
name on every gate run, so a wrong one is visible to anyone reading the output. A stricter
design — parse `git check-ignore -v`'s matched pattern, and excuse a path under an ignored
*directory* only when that directory is absent — was written out and declined: it buys one
narrow case at the cost of a pattern parser, on a repository with one operator.

## Next

Author reviews and pushes. `TASK 112` closes when a push run reaches `GATE INCOMPLETE` with
`confidentiality` as its only skip, the workflow accepts that and the job goes **green**, and
the Actions log shows the summary table and the deferral block. `TASK 111` closes on the same
run plus one manual `gh workflow run harness.yml -f profile=full`.

## Files changed

**New:** `scripts/guards/lib/repo-ignore.mjs`, `scripts/guards/lib/repo-ignore.test.mjs`; this log.
**Modified:** `scripts/guards/lib/doc-links.mjs` and `content.mjs` (the injected predicate); their test files; `scripts/guards/gate/check-docs.mjs` and `check-content.mjs` (the git oracle, and the machine-local report); `scripts/gate.mjs` (exit handling); `TASKS.md`.
