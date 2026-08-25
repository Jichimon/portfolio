# 2026-08-25 · Session 04 — A test battery for `shell.mjs`, the tokenizer under `H-01` and `H-02`/`H-03`

**Task:** TASK 38 — Ratchet the mutation score toward 100 (scoped slice: `shell.mjs` only)
**Status after this session:** DONE — battery written, measured, reported short of the 90 target (real number recorded, not chased further)

## What was done

`scripts/guards/lib/shell.mjs` had no colocated test file — it was exercised only
indirectly through `path-boundary.test.mjs` and `git-write.test.mjs`. This session adds
`scripts/guards/lib/shell.test.mjs` (58 tests), asserting the tokenizer's observable
behavior (which paths a command touches, which commands it runs, per `T-07`) across
`tokenize`, `redirectTargets`, `basename`, `stripDataRegions` and `commandContexts`.
Ground truth for every non-obvious case (quote-escape edge cases, heredoc/substitution
interaction, nested-substitution `via` chains, the depth cutoff) was taken by running the
real functions against candidate inputs before writing the assertion, rather than derived
by hand-tracing the source — several hand-traced predictions (Windows-path backslash
handling in one exploration script, in particular) turned out wrong on the first attempt
and were corrected against the measured output.

## Decisions

- **Test the five exported functions directly, not only through `commandContexts`.** The
  brief's `T-07` concern is about not asserting internals a caller never observes — but
  `stripDataRegions`, `tokenize`, `redirectTargets` and `basename` are each themselves a
  documented, exported contract that `git-write.mjs`/`path-boundary.mjs` consume directly
  (`ctx.argv[0]` through `basename`, `ctx.raw` through `redirectTargets`), so asserting
  their return values on documented inputs is asserting what a caller reads, not an
  internal never surfaced.
- **Used `commandContexts(cmd, via, depth)`'s own `depth` parameter directly** to test the
  `depth > 6` cutoff, rather than constructing real nested-wrapper strings to trigger it.
  Constructing a real trigger turned out fragile: nested `$(...)` substitutions cap out at
  ~2 levels because the substitution regex only reliably matches one level of embedded
  parens, and nested `sh -c "..."` wrappers with alternating quote characters produced
  irregular found/not-found results unrelated to the depth cutoff itself, from quote-parity
  interactions rather than the cutoff being tested. Calling the exported function's own
  parameter is still a call to a documented part of its signature, so it stays within
  T-07's boundary rather than reaching past it.
- **Did not iterate further to chase 90 after the first scoped measurement**, on explicit
  instruction mid-session. `C-01`'s discipline applies to the metric itself: a real 80.73
  is reported as 80.73, not rounded up or represented as "nearly there."

## Findings from validating against real state (P-04)

- **A hand-traced prediction was wrong and caught before it reached the test file.** An
  exploration script (`node -e` style, outside the repo) built a Windows path with quotes
  using a bash heredoc with `\\` in the source; the heredoc silently collapsed the doubled
  backslashes before Node ever parsed the `.mjs`, so the "observed" tokenizer output
  (`"C:Program Filesgit.exe"`, no backslashes) was an artifact of the exploration
  pipeline, not of `shell.mjs`. Re-run with backslashes properly doubled in the JS source
  produced the expected `"C:\\Program Files\\git.exe"` and `basename` resolving to `git`.
  Recorded because it is exactly the kind of thing that would have shipped as a wrong,
  passing assertion had it not been checked against the real function output first.
- **The `$()`/backtick substitution regex does not reliably support nesting past ~2
  levels** — `commandContexts('echo ' + wrap('git push', n))` returns the same result for
  n=3, 6, 7 and 8 (two `substitution` hops, then a leftover unmatched literal), so the
  `depth > 6` cutoff is not reachable through realistic substitution nesting and had to be
  tested via the function's own `depth` parameter instead (see Decisions).
- **Two other agents were writing to `site/` concurrently.** The first scoped Stryker run
  crashed mid-sandbox-copy (`ENOENT` on files under `site/dist/.prerender/…`) because
  `site/dist` was being rebuilt by another process while Stryker copied the working tree.
  Not a defect in this session's work — retried once and it completed cleanly. Worth
  naming because it is exactly the kind of shared-mutable-state hazard concurrent agent
  runs create, and it cost one throwaway run.

## Measurements

- **Baseline** (from brief, measured 2026-08-25 before this session): 66.21%, 441
  mutants, 146 survivors, 3 with no coverage.
- **Post-battery, measured 2026-08-25, scoped run** (`node node_modules/@stryker-mutator/core/bin/stryker.js run --mutate "scripts/guards/lib/shell.mjs"`):

  | | |
  |---|---|
  | Mutation score | **80.73%** (covered 80.91%) |
  | Total mutants | **441** |
  | Killed | **340** |
  | Timed out (counted as killed) | **16** |
  | **Survived** | **84** |
  | No coverage | **1** |
  | Threshold | `break 74` — PASS (`80.73 >= 74`) |
  | Wall clock | 31s |

  **Short of the 90 target — reported as measured, not rounded or estimated (`C-01`).**
  Tests ran against `shell.test.mjs` (335 killed), `path-boundary.test.mjs` and
  `git-write.test.mjs`.

- **Survivor families not reached** (84 total, grouped by root cause rather than
  enumerated one-by-one — full detail is in the Stryker console output, not re-run):
  1. **Backslash-escape-before-closing-quote arithmetic/conditional mutants** in
     `splitSegments`, `blankSingleQuoted` and `redirectTargets` (lines 22, 82, 87, 164) —
     `cmd[i-1] !== '\\'` mutated to `cmd[i+1]`, `===`, or `true`/`false`. My battery
     exercises the escaped-quote case in `tokenize` only; the same escape logic is
     duplicated three more times across the file (command substitution scanning, single-
     quote blanking, redirect-target scanning) and none of those three call sites has a
     test with a backslash immediately before the closing quote character.
  2. **`$(...)`/`)` depth-tracking mutants** in `splitSegments` (lines 26–27) —
     `depth++`/`depth--` swapped, `depth > 0` loosened, the whole branch stubbed to a
     block. My tests exercise one level of `$(...)` nesting inside a substitution but
     never a case where `splitSegments` itself must track depth to avoid splitting a
     top-level `;`/`|` that sits inside an unclosed `$(...)`.
  3. **Wrapper-name string literals** (lines 191–202) — `zsh`, `dash`, `ksh`, `pwsh`,
     `cmd`, `-command`, `/c`, `nohup`, `xargs`, `time`, `stdbuf`, `doas`, `nice`,
     `ionice`. Only `sh`, `bash`, `-c`, `env` and `timeout` are exercised; the rest of
     each `Set` literal can be blanked to `""` with nothing noticing.
  4. **`depth + 1` → `depth - 1` at the two real recursion call sites** (lines 221, 241)
     — killed at the parameter boundary directly (my depth-6/7 test) but not at the
     call sites themselves, because no test drives recursion deep enough through a real
     nested string for the sign of the increment to matter observably.
  5. **`filter(Boolean)` / `.trim()` on `splitSegments`'s output** (line 38) and the
     heredoc-array/`trim()` calls in `heredocSpans` (lines 59, 65) — no test asserts on
     a segment list containing an empty/whitespace-only entry that `filter(Boolean)`
     would need to remove, or a heredoc terminator line with trailing whitespace that
     `.trim()` would need to normalize.
  6. **`basename`'s extension regex anchor** (`$` at line 207) — no test has an
     extension-like substring that is not at the very end of the token.
  7. **The env-prefix regex anchor** (`^` at line 230) and **the substitution regex's
     nested-paren repetition** (line 44) — both survive on inputs my battery does not
     construct (an env-looking assignment not at the start of a token; a substitution
     regex variant that only breaks on multiply-nested unbalanced parens).

  None of these 84 were judged equivalent — each corresponds to a real, nameable input
  my battery does not construct, not to a mutation with no observable effect.

## Done

```yaml
done:
  tests:    { status: passed, evidence: ["scripts/guards/lib/shell.test.mjs — 58/58 passing (node --test scripts/guards/lib/shell.test.mjs)", "full guard suite: node --test \"scripts/guards/**/*.test.mjs\" — 580/580, up from 522/522 before this session"] }
  mutation: { status: partial, evidence: ["scoped run, node node_modules/@stryker-mutator/core/bin/stryker.js run --mutate \"scripts/guards/lib/shell.mjs\": 80.73%, 441 mutants, 340 killed, 16 timeout, 84 survived, 1 no-coverage — up from baseline 66.21%/146 survivors, still short of this item's 90 target and of ADR-006's 100"], reason: "short of the 90 target; 84 survivors grouped into 7 named families above rather than enumerated individually, none judged equivalent" }
  scope:    { status: passed, evidence: ["one file written: scripts/guards/lib/shell.test.mjs", "no other file touched — shell.mjs, stryker.config.mjs, mutation-suppressions.test.mjs and every other test file left as found"] }
  iterations: { status: passed, evidence: ["1"] }
  loose_ends: { status: passed, evidence: ["the 7 survivor families above are the concrete next slice of TASK 38's shell.mjs work, not absorbed or hidden by this session closing"] }
```

## Open questions

None. The gap to 90 is a known, named backlog (the 7 families above), not an open question.

## Next

Another pass on `scripts/guards/lib/shell.test.mjs` targeting the 7 named survivor
families, starting with the backslash-escape-before-quote family since it recurs in three
separate functions and is likely the single highest-value addition. Re-measure with the
same scoped Stryker command after adding tests, and iterate against the printed survivor
list rather than guessing.

## Files changed

`scripts/guards/lib/shell.test.mjs` — new, the only file owned by this session. 58 tests
covering `tokenize`, `redirectTargets`, `basename`, `stripDataRegions` and
`commandContexts`.
