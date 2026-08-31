# 2026-08-30 · Session 05 — TASK 93: `eval` is unrecognized as a wrapper

**Task:** TASK 93 — `eval` is recognized as neither a flag-wrapper nor a direct-argument wrapper
**Status after this session:** DONE

## What was done

Worked in the same sitting as `TASK 92` (same file, same test file, same mutation runs — see that item's log for the sibling fix). **The first fix landed, passed its own tests and a full gate run — and was wrong**, same shape as `TASK 92`'s own audit finding: a scoped `adversarial-auditor` pass (narrowed to just this item's and `TASK 92`'s new code, not a broad re-audit) found one real bypass, confirmed against real bash before being trusted (`P-11`).

**F4 — `eval`'s leading `--` was joined into the command string instead of being consumed.** Bash's `eval` builtin, like every builtin that calls its own internal `no_options()`, silently swallows a single leading `--` as an end-of-options marker — `eval` has no real options, so this is pure noise bash discards, but the first fix's `argv.slice(1).join(' ')` did not discard it, so `eval -- "git commit -m x"` produced the joined string `-- git commit -m x`, whose recursed context has `argv[0] === '--'` — matching neither the git allowlist nor any `WRITES`/`READS` head, so it sailed through every hard rule the exact same way the original bug did. Confirmed directly: `bash -c 'eval -- "echo RAN"'` really executes; `eval -- "cat private/glossary.md"` (H-04), `eval -- "rm -rf ..."` (H-02), `eval -- "git commit -m x"` (H-01) all returned `allowed:true` against the real functions before the fix.

The fix strips a single leading `--` (only when it is literally the first argument) before joining the rest, matching bash's actual behavior — confirmed against two adjacent cases the audit specifically distinguished: a lone `-` is NOT consumed (bash tries to run a command literally named `-`, which fails), and only the FIRST of two consecutive `--` is consumed (the second becomes the attempted command name). Both are covered by their own tests rather than just the one reported bypass, since the boundary of "exactly `--`, exactly once, exactly first" is where a narrower fix could still get it wrong.

## Decisions

- **Strip `--` before computing `rest`, rather than teaching `commandContexts` a general option-parsing concept.** `eval` is the only wrapper in this file with a bash-builtin-specific `--`-swallowing quirk; generalizing it into a shared mechanism for other wrappers would be speculative scope this item's Done never asked for, and no other wrapper here has been shown to need it.
- **`rest.length > 0` replaces the previous `argv.length > 1` gate**, computed after the `--`-stripping rather than before — this also incidentally removes the earlier version's own two equivalent-mutant survivors on that exact comparison, since there is now only one length check instead of a pre-check plus a post-check.
- **Both "near-miss" cases the audit deliberately did NOT report as bugs (`eval -` and `eval -- --`) were still written as tests**, not skipped — the audit's own note was "bash does not run them either," which is exactly the boundary a narrower or more aggressive fix could get wrong in either direction (consuming too much, or too little).

## Findings from validating against real state (P-04)

- **The adversarial-auditor's report was independently re-verified before being acted on (`P-11`)** — the `eval -- "..."` finding was reproduced directly against `checkGitWrite`/`checkBashPaths`, and the underlying bash claim (that `eval` calls `no_options()` and silently consumes a leading `--`) was independently re-verified against a real `bash -c` invocation (GNU bash 5.2.15, Git Bash) rather than accepted on the report's word — including the two contrast cases (`eval -` fails; `eval -- --` consumes only the first `--`).
- The report flagged the previous session's `998/998`/`85.40%` claims as unverified in ITS OWN scope (it deliberately did not re-run the full suite or Stryker) — not a discrepancy, just the audit stating its boundary; those numbers were true when this session's own full runs produced them, and are re-measured fresh below now that the rewrite supersedes them.
- Nine bypass angles the audit tried against this branch held (`/usr/bin/eval`, `eval.exe`, a `VAR=` prefix, nested `eval`, reached through `$()`/backticks, an empty first argument, metacharacters in the joined string, unquoted multi-token arguments) — recorded here as confirmed-solid, not just as an absence of findings, since a clean report on nine angles is itself evidence worth keeping (`P-11`).

## Done

```yaml
done:
  tests:       { status: passed, evidence: ["scripts/guards/lib/shell.test.mjs: 58 -> 85 tests (shared with TASK 92)", "node --test \"scripts/guards/**/*.test.mjs\": 1007/1007 green", "node scripts/gate.mjs: GATE PASSED, 21/21, exit 0"] }
  mutation:    { status: passed, evidence: ["scoped run, scripts/guards/lib/shell.mjs: 80.73% (pre-session baseline) -> 86.76%, 0 unsuppressed survivors in the new EVAL_WRAPPERS branch", "1 genuinely equivalent survivor pair suppressed with a real Stryker directive, confirmed status: Ignored", "full gate aggregate: 78.34% against the 77.0 floor (up from 78.21% before this session's rewrite)"] }
  ci:          { status: not_applicable, reason: "no CI-relevant workflow files touched" }
  docs:        { status: passed, evidence: ["TASKS.md: TASK 93 closed with a closing narrative reflecting the audit-driven fix; run-order row present"] }
  loose_ends:  { status: passed, evidence: ["TASK 95 opened separately for a DIRECT_WRAPPERS composition gap (env sh -c \"...\", env eval \"...\") found while closing this item — pre-existing, unrelated to this item's own diff, not folded in", "the entry's own noted-not-chased question (command eval \"...\", a function wrapping eval) remains open, unchanged from the first close"] }
  scope:       { status: passed, evidence: ["only scripts/guards/lib/shell.mjs and its test file changed; TASK 92's heredoc fix landed in the same files in the same sitting, kept as a separate work item and a separate closing narrative per P-01"] }
  security:    { status: passed, evidence: ["adversarial-auditor pass run on the first fix per its own \"always on a guard or a boundary\" instruction; the one confirmed finding independently re-verified against real bash and the real guard functions, fixed, and re-verified again"] }
  iterations:      { status: passed, evidence: ["9"] }
  iteration_split: { status: passed, evidence: ["slice=1", "verify=8"] }
```

## Open questions

- Whether `command eval "..."` or a function that wraps `eval` reopens a narrower version of this same bypass class — still flagged, still not investigated (unchanged from the first close).
- `TASK 95` (found while closing this item) is severe enough — it defeats `H-01` too, the same way `TASK 92`/`93` did — that the author may want to reorder the run queue ahead of the existing schedule.

## Next

`TASK 91` (`private/` write vector), `TASK 94` (shell-expansion residual, documentation) and `TASK 95` (`DIRECT_WRAPPERS` composition gap) are still open and unplaced in the run order.

## Files changed

- `scripts/guards/lib/shell.mjs` — the `--`-stripping fix in the `EVAL_WRAPPERS` branch, a real Stryker suppression directive for the one equivalent mutant this branch's length check produces.
- `scripts/guards/lib/shell.test.mjs` — the `eval --` red battery, including the two near-miss anti-regression cases (shared file with `TASK 92`'s tests).
- `TASKS.md` — `TASK 93` closed with the audit-and-fix narrative; `TASK 95` opened; run-order row present.
