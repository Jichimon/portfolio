# 2026-08-30 · Session 03 — TASK 84: the shell read vector for `H-04`

**Task:** TASK 84 — `checkBashPaths` has no shell vector for the `H-04` read boundary
**Status after this session:** DONE

## What was done

Implemented the shell read vector for `H-04` (`READS` roster, three argument-classification modes, mirroring `WRITES`), then ran an `adversarial-auditor` pass on it per that agent's own "always on a guard or a boundary" instruction. The audit found the first implementation genuinely broken — a position-only pattern-skip exempted the wrong argument whenever a `grep`/`sed`/`perl` pattern was glued to its flag (`grep -e. private/x`), plus two related bugs in `cp`/`ln`'s destination handling. All three were independently re-verified before being trusted, then fixed with a flag-aware rewrite, re-verified, and covered by a substantially larger red battery. The same audit also found two severe, **pre-existing** decomposition-layer bypasses in `shell.mjs` (a fake heredoc marker, and `eval` missing from the wrapper set) that undermine all four hard rules, not just this one — independently confirmed and recorded as new, separately-scoped, high-priority items (`TASK 92`, `TASK 93`) rather than folded into this one or silently dropped.

## Decisions

- **A `READS` roster mirroring `WRITES`, with three argument-classification modes (`all`/`pattern`/`source`)** — chosen over a 3-command hardcoded list (too narrow, `P-13`'s shape) and over checking every argument unconditionally (produces real false positives on `grep`'s pattern argument, the same failure class `TASK 10` fixed on the write side). Full reasoning in the approved plan, `C:\Users\luisa\.claude\plans\task-84-aparte-del-plan-swirling-hartmanis.md`.
- **The write vector on `private/` (`rm -rf private/`, `mv private/x /tmp`, etc.) stays out of scope**, per `TASKS.md`'s own Done line — tracked as `TASK 91` rather than folded in or silently dropped (`P-06`).
- **`readArgsSkippingPattern`'s position-only design was replaced, not patched, after the audit** — the flaw was structural (it could never tell "the pattern" from "the file" once the pattern stopped being the first non-flag token), so a rewrite (`readArgsForPattern`, per-tool flag tables, glued/split-aware) was the honest fix rather than special-casing the reported examples.
- **The clustering search for a text/file flag beyond position 1 (`-ne`, `-pe1`, real `perl` one-liners) is gated by `deepSearch`, true only when the OTHER letter is not also recognized for that head.** Found mid-fix: an unconditional deep search let `-fprivate/x`'s own glued value ("private" contains an "e") be misread as a clustered TEXT flag, exempting the file instead of reading it as `-f`'s value. Restricting deep search to tools with only one recognized letter (`perl` has no file-letter; `awk` has no text-letter) closes that ambiguity by construction rather than by patching the one reported case.
- **`shell.mjs`'s two structural findings (fake heredoc marker, `eval` unrecognized) are NOT fixed in this item.** Both are pre-existing, both predate this session's diff entirely (confirmed — `shell.mjs` is untouched), and both affect `H-01`/`H-02`/`H-03` as much as `H-04`. Fixing shared decomposition logic used by every hard rule is a bigger, more carefully-scoped change than this bugfix's blast radius should cover in the same sitting (`P-01`).

## Findings from validating against real state (P-04)

- Confirmed directly (`node -e` against the real config and `checkBashPaths`): `cat private/glossary.md`, `grep -r x private/`, `sed -n '1p' private/glossary.md`, `head private/banned-terms.txt` all returned `{"allowed":true,"findings":[]}` against the unmodified code — matches the hand-off packet's own verified extract (`progress/handoff/2026-08-30-task84.md`).
- `pretooluse.mjs` needed no change: `boundaryRule()` already derives the rule from `guards.config.json`'s `ruleFor` map by boundary name, and `private` already maps to `H-04` there.
- **The adversarial-auditor's report was independently re-verified before being acted on (`P-11`)** — every one of its 7 confirmed bypass classes was reproduced directly against the real function with a scratch script, not accepted on the agent's word. Two of its "attempted and blocked" claims were permission-layer refusals in the auditor's own sandboxed context, not guard denials — correctly caveated in its own report rather than miscounted as a guard holding.
- **A Stryker `disable next-line` directive attached to a chained `else if` does not take effect** — verified by reading the installed `directive-bookkeeper.js` (not assumed from the docs): the ignore rule is keyed to whichever AST node's `leadingComments` the comment attaches to, and a comment immediately preceding `} else if (...)` does not reliably attach to that branch's own line. Recorded in a plain comment instead of a non-functional directive, once discovered by a scoped Stryker run showing the mutant still `[Survived]` despite the directive being present.

## Done

```yaml
done:
  tests:       { status: passed, evidence: ["scripts/guards/lib/path-boundary.test.mjs 68/68", "node --test \"scripts/guards/**/*.test.mjs\" green", "node scripts/gate.mjs: GATE PASSED, 21/21, exit 0"] }
  mutation:    { status: passed, evidence: ["full gate: 78.04% against the 77.0 floor (was 77.58% before this item)", "path-boundary.mjs in the full-suite run: 86.68% (405 killed, 54 survived, 9 no-coverage)"] }
  ci:          { status: not_applicable, reason: "no CI-relevant workflow files touched" }
  docs:        { status: passed, evidence: ["TASKS.md: TASK 84 closed, TASK 91/92/93/94 opened"] }
  loose_ends:  { status: passed, evidence: ["TASK 91 (private/ write vector)", "TASK 92 (fake heredoc marker)", "TASK 93 (eval wrapper)", "TASK 94 (shell-expansion residual, documentation)"] }
  scope:       { status: passed, evidence: ["only scripts/guards/lib/path-boundary.mjs and its test file changed; pretooluse.mjs and guards.config.json confirmed unnecessary to touch"] }
  security:    { status: passed, evidence: ["adversarial-auditor pass run per its own \"always on a guard or a boundary\" instruction; every finding independently re-verified; in-scope findings fixed and re-verified; out-of-scope findings recorded as TASK 92/93/94"] }
  iterations:      { status: passed, evidence: ["7"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1", "slice=1", "verify=5"] }
```

## Open questions

- `TASK 92`/`TASK 93` are severe enough (they undermine `H-01` git-write, not just `H-04`) that the author may want to reorder the run queue to prioritize them ahead of everything currently scheduled. Flagged in the closing summary; not decided here.

## Next

`TASK 91`/`92`/`93`/`94` are opened but not placed in the run order. The author should decide whether `TASK 92`/`93` (both critical, both affect all four hard rules) jump the queue.

## Files changed

- `scripts/guards/lib/path-boundary.mjs` — the `READS` roster, `readArgsForPattern`, `shortFlagGlued`, `sourceArgs`/`hasExplicitTargetFlag`, and the `destinationArgs` glued-`-t` fix.
- `scripts/guards/lib/path-boundary.test.mjs` — the read-vector red battery, the audit-driven regression tests, and the mutant-killing direct-unit battery for `readArgsForPattern`.
- `TASKS.md` — `TASK 84` closed; `TASK 91`, `92`, `93`, `94` opened.
