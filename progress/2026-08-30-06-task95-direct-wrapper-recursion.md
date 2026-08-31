# 2026-08-30 · Session 06 — a `DIRECT_WRAPPERS` candidate is never itself unwrapped

**Task:** TASK 95 — a `DIRECT_WRAPPERS` candidate is never itself unwrapped, so a chained `env sh -c "..."` escapes every hard rule
**Status after this session:** IN PROGRESS

## What was done

`commandContexts` offered every argv suffix of a `DIRECT_WRAPPERS` head (`env`, `timeout`, `sudo`, `nice`, `nohup`, `xargs`, …) as a **terminal** array that nothing re-examined. A flag wrapper reached through one of them kept its payload sealed inside a single quoted argument, so `env sh -c "…"` escaped **all four** shell-side hard boundaries at once. The two string-carrying wrapper families were extracted into a module-private `wrapperContexts(argv, via, depth)`, and each offered suffix is now passed through it at `depth + 1`.

## Decisions

- **The helper takes an argv, never a re-joined string — and this was measured, not reasoned.** The obvious fix is `commandContexts(suffix.join(' '), …)`. It does not work: `['env','sh','-c','git commit -m x'].slice(1).join(' ')` is `sh -c git commit -m x`, where `-c`'s argument has collapsed to the single word `git` and `commit` is a separate token. `checkGitWrite` on that returns `{"allowed":true}` — the re-join fix looks like a fix, passes a naive test, and leaves `H-01` open. A test pins the joined form's genuine weakness so nobody re-derives this.
- **A nested `DIRECT_WRAPPERS` suffix is deliberately NOT re-entered**, on a completeness argument rather than a shortcut: the loop already offers every suffix of the whole argv, and a nested direct wrapper's suffixes are `argv.slice(i).slice(j) === argv.slice(i + j)` — a strict subset of what is already on offer. Re-entering would add only duplicates, and on an adversarial `env env env …` line, exponentially many under the depth cap of 6. `env timeout 5 sh -c "git push"` is therefore caught through `env`'s own suffix list; a test asserts `via` is `['env','sh']`, pinning the mechanism and not just the outcome.
- **The `DIRECT` hop increments `depth`.** A direct + flag chain is two real nesting levels and costs two. Only observable at the cap, so a test pins it at exactly 4-passes / 5-fails — `TASK 93`'s missing-increment class.
- **No defensive empty-argv guard in `wrapperContexts`.** Both call sites guarantee `argv.length >= 1`, and an unreachable branch is a mutant no test can kill (`T-03`).
- **The red battery is split by kind, not by owner** (`T-08`), which deviates from the approved plan's "all in `shell.test.mjs`". `shell.test.mjs` tests `commandContexts` shape and imports only `shell.mjs`; the boundary-outcome assertions belong beside their checkers, where the `denied`/`bDenied` helpers and the boundary fixtures already live. Recorded rather than done silently.

## Findings from validating against real state (P-04)

- **The hand-off packet was wrong on one case, and it is the kind of wrong that matters.** It lists `env eval "cat private/glossary.md"` as a live bypass. It is not: `eval` is a shell builtin with no executable on `PATH`, so `env`/`nice`/`sudo` cannot exec it — real bash answers `env: 'eval': No such file or directory`. The guard now catches that form anyway, because over-reporting is the stated direction for these wrappers (`INC-07`), but it is recorded as **hardening, not a closed live hole** (`C-02`). The packet's own header says it is a claim, not ground truth; this is the instance that earned the disclaimer.
- **The gap was wider than the packet described.** It listed three cases against `H-01` and `H-04`. Reproduced against the real functions and the real `guards.config.json`, it reaches **all four** boundaries — `H-01`, `H-02`, `H-03`, `H-04` — through any of the ten `DIRECT_WRAPPERS` heads.
- **Verified live against this machine's real bash**, not only against the guard's own logic: `env sh -c`, `nohup sh -c`, `timeout 5 sh -c`, `nice sh -c`, `xargs sh -c` and the chained `env timeout 5 sh -c` all execute their payload. `time`, `ionice` and `doas` are not present here and `sudo` is disabled, so their rows are guard-level coverage rather than locally demonstrated execution.

## Evidence

Before, against the real functions and real config:

```text
*ALLOWED*  H-01  <- env sh -c "git commit -m x"
*ALLOWED*  H-02  <- env sh -c "rm resources/a.md"
*ALLOWED*  H-03  <- timeout 5 sh -c "rm -rf evidence/runs"
*ALLOWED*  H-04  <- env sh -c "cat private/__probe_does_not_exist__"
denied     H-01  <- env timeout 5 git commit -m x   (contrast: some suffix IS a bare git argv)
```

After: every row `denied`, with the two contrast rows unchanged.

## Done

```yaml
done:
  tests:           { status: passed, evidence: ["node --test scripts/guards/**/*.test.mjs — 1022 pass, 0 fail"] }
  mutation:        { status: passed, evidence: ["gate.mjs step 2 — 78.36% against the 77.0 floor, 0 survivors on the lines this change introduces"] }
  security:        { status: passed, evidence: ["H-01/H-02/H-03/H-04 red battery, 13 tests red before the fix, green after"] }
  docs:            { status: passed, evidence: ["progress/2026-08-30-06-task95-direct-wrapper-recursion.md", "TASKS.md TASK 95"] }
  loose_ends:      { status: passed, evidence: ["TASKS.md — TASK 91, TASK 94 remain tracked and untouched"] }
  scope:           { status: passed, evidence: ["scripts/guards/lib/shell.mjs + 3 colocated test files"] }
  ci:              { status: not_applicable, reason: "no CI provider configured for this repository yet" }
  content:         { status: not_applicable, reason: "no publishable content touched — guard internals only" }
  iterations:      { status: passed, evidence: ["1"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1"] }
```

## Open questions

None.

## Next

`TASK 94` — the `documentation` item naming shell-level expansion as a stated residual in `architecture.md §L`. This session's real-bash probing produced exactly the evidence that item wants, and it is the last of the three loose ends left by `TASK 93`.

## Files changed

`scripts/guards/lib/shell.mjs` — `wrapperContexts` extracted; each `DIRECT_WRAPPERS` suffix now passes through it.
`scripts/guards/lib/shell.test.mjs` — 7 decomposition tests: unwrapping, argv-vs-join, chaining, depth, no blow-up.
`scripts/guards/lib/git-write.test.mjs` — 4 tests, `H-01` red battery plus the non-regression case.
`scripts/guards/lib/path-boundary.test.mjs` — 4 tests, `H-02`/`H-03`/`H-04` red battery plus an over-deny check.
