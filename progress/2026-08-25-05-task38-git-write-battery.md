# 2026-08-25 · Session 05 — A red-path battery for `git-write.mjs`, the guard behind `H-01`

**Task:** TASK 38 — Ratchet the mutation score toward 100 (scoped slice: `git-write.mjs` only)
**Status after this session:** DONE

**Who did what, stated up front (`P-11`).** The 29 tests were written by a delegated `test-engineer`. **Every measurement in this log was run by the orchestrator, not by the agent that wrote the tests** — the agent was cut off before its own final Stryker run three times, and on the third its session limit was reached. The log is finished by the orchestrator from the tree and from its own runs. Nothing here is the agent's self-report.

## What was done

`scripts/guards/lib/git-write.test.mjs` extended from 39 to **68 tests**. The guard module itself was not touched.

Coverage added, by the distinction each group makes:

- **The subcommand allowlist, one assertion per boundary** — every read-only form allowed individually; `add` and the other writes denied. A mutated subcommand string is a mutated boundary, not prose, so a per-subcommand assertion is what makes a `StringLiteral` mutant observable.
- **Subcommands that are read in one form and write in another** — `notes` (bare/list/show pass, mutating forms do not), `bisect` (log/view pass, the real steps do not), `remote` (bare, `-v`, `show`, `get-url` are reads; a mixed flag set is not), `branch` (`--list` with a pattern still lists; a write flag disqualifies even alongside a list flag), `tag` (`-v` is a *write* flag here, unlike `branch` — the asymmetry is asserted explicitly), `submodule` (`summary` is a read alongside `status`).
- **Global flags between the binary and the subcommand** — `--no-pager` is harmless; `--namespace` consumes its value in both spellings; every `VALUE_OPTS` entry swallows its next token in the space form.
- **Wrappers** — `sudo`, `doas`, `nohup`, `xargs`, `timeout`, `stdbuf`, `nice`, `ionice`, and the eval shells `zsh`, `dash`, `ksh`, `cmd /c`. A wrapper around a *read* stays allowed, which is the half that stops the guard being over-strict.
- **Separators and disguise** — a bare newline is a separator; a write buried mid-chain is caught; an env-var prefix disguises nothing beyond the very front.
- **Heredocs** — an expanding heredoc still has its substitutions denied; an unterminated one does not swallow the rest of the command; a delimiter appearing as ordinary text does not open one.
- **Degenerate input** — bare `git`, an unrecognized trailing flag: allowed, and no crash.
- **The denial messages themselves** — the `-c` injection finding names execution; an ambiguous-subcommand denial names *"in this form can write"*. `T-07`: the caller observes allowed-or-denied **and the reason**, so the reason is asserted.

## Measurements

All run by the orchestrator.

| `git-write.mjs` | before | after |
|---|---|---|
| score | 54.38% | **85.71%** |
| mutants | 217 | 217 |
| killed (incl. 1 timeout) | 117 | **186** |
| survived | 73 | **31** |
| no coverage | 26 | **0** |

**+69 kills**, against the 51 the repository needed to clear its floor.

Repository-wide, full run afterwards: **74.74%** over 4,773 mutants — 3,496 killed, 66 timed out, 992 survived, 212 uncovered. That cleared the `break` of 74 which had been red all day, and **this slice is what turned the ratchet for the first time since it was created**: `break` 74 → 74.5 in `stryker.config.mjs`, `FLOOR` to match in `mutation-suppressions.test.mjs`, both moved by the orchestrator in one step.

Full guard suite: 580 → **609**, nothing pre-existing broken.

## Findings

- **`git-write.mjs` is no longer the worst file in the repository.** `site-structure.mjs` at 59.66% — 1,046 mutants, 317 survivors, 105 uncovered — is, and it is where the next scoped pass goes.
- **Uncovered mutants went to zero.** 26 mutants had no test reaching them at all; that is the category `P-14` is really about, since a mutant with no coverage is a line the battery never executes.
- **`tag -v` and `branch -v` mean opposite things** — verify versus list — and the old battery asserted neither. That is the kind of distinction a mutation score surfaces and a passing test suite does not.

## Loose ends

- **31 survivors remain in `git-write.mjs`, and they are NOT grouped into families here.** The run that would have enumerated them was cut by a session limit, and inventing a grouping from the count would be a claim with nothing behind it (`C-01`). The next pass on this file starts by re-running the scoped measurement to get the list.
- 84 survivors remain in `shell.mjs`, grouped into 7 families in session 04's log.
- The 0.24-point slack under the new floor is thin, and timeouts count as killed while their count is timing-dependent (21, 45 and 66 across runs here). Recorded in `stryker.config.mjs` beside the number.

## Next

`site-structure.mjs`, on the trigger this item already defines — a session that touches a module under `scripts/guards/lib/**` kills that module's survivors before it closes.

```yaml
done:
  tdd:        { status: not_applicable, reason: "no production behaviour was written — this slice adds a red-path battery to an existing guard and does not modify git-write.mjs" }
  tests:      { status: passed, evidence: ["scripts/guards/lib/git-write.test.mjs — 39 to 68 tests, 29 added", "node --test scripts/guards/lib/git-write.test.mjs passes; full guard suite 580 to 609, nothing pre-existing red"] }
  mutation:   { status: passed, evidence: ["scoped Stryker over git-write.mjs, run by the orchestrator: 54.38% to 85.71% — 217 mutants, 186 killed, 31 survived, 0 uncovered (was 73 survived, 26 uncovered)", "repository-wide full run afterwards: 74.74% over 4,773 mutants, clearing the break of 74"] }
  gate:       { status: passed, evidence: ["the mutation step passes for the first time this session; break raised 74 to 74.5 with FLOOR moved in lockstep"] }
  scope:      { status: passed, evidence: ["one file written by the agent: scripts/guards/lib/git-write.test.mjs; git-write.mjs itself untouched, confirmed by the mutant total staying at 217"] }
  docs:       { status: passed, evidence: ["stryker.config.mjs threshold rationale updated with the raise and the timeout-variance risk", ".claude/rules/30-testing.md — T-03 and the stack row carry the new floor (G-11)", "TASKS.md — TASK 38 records the ratchet turn and the new worst file"] }
  loose_ends: { status: passed, evidence: ["31 survivors left explicitly UNGROUPED rather than given an invented family breakdown — the enumerating run was cut by a session limit (C-01)"] }
  iterations: { status: passed, evidence: ["3"] }
```
