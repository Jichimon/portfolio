# 2026-08-30 · Session 04 — TASK 92: a comment-only heredoc marker defeats `commandContexts`

**Task:** TASK 92 — a comment-only heredoc marker defeats `commandContexts`' decomposition entirely, for every hard rule
**Status after this session:** DONE

## What was done

Worked in the same sitting as `TASK 93` (same file, same test file, same mutation runs — see that item's log for the sibling fix). **The first fix landed, passed its own tests and a full gate run — and was wrong**, in the same shape `TASK 84` hit one session earlier: an `adversarial-auditor` pass, scoped narrowly to just the new code in this item and `TASK 93` (not a broad re-audit), found the first `isRealHeredocOpener` genuinely incomplete in three distinct ways, all confirmed independently against real bash and the real guard functions before being trusted (`P-11`).

**F1 — comment detection only recognized whitespace or line-start as a word boundary.** Real bash starts a comment wherever a new word may begin, which also includes right after `;`, `&`, `|`, `(`, `)` and backtick. `echo a ;# <<EOF` is a real comment in bash (confirmed: `bash -c` on it really executes the payload line), and the first fix's narrower rule missed it — for all four hard rules, since the fix is shared decomposition. **F2 — quote state was reset to `null` on every physical line.** A quoted string that genuinely spans more than one line (`echo "` / `<<EOF` / `"` / payload) left the interior line scanned from a false "not in a quote" start, so a heredoc marker sitting inside an open multi-line quote was wrongly accepted as real. This directly refuted the first close's own claim that the same function closed both the same-line and cross-line quoted cases. **F3 — no backslash-escape awareness outside quotes.** `echo \<<EOF` — bash reads the escaped `\<` as a literal character and the remaining lone `<` as a real (failing) redirect, never a heredoc; the first fix had no notion of this and treated it as a real opener anyway. All three were reproduced against `checkGitWrite`/`checkBashPaths` directly, before and after, not inferred from reading the diff.

The fix is a structural rewrite, not three patches: `scanLineForHeredoc(line, quoteIn)` replaces `isRealHeredocOpener`, threading quote state across the whole `heredocSpans` outer loop instead of re-deriving it from nothing on every line, widening the comment-boundary character class (`COMMENT_BOUNDARY`), and skipping the character after an unquoted backslash before any special-character check runs. While designing the wider boundary set, a third-`<` guard was added proactively (`<<<word`, a herestring, must not be misread as a heredoc opener with a delimiter to search for later) — not part of the audit's findings, found and fixed in the same pass, with its own test.

## Decisions

- **A widened, fixed `COMMENT_BOUNDARY` character class (`\s|&;()<>`` `), not a growing whitelist chased one auditor finding at a time.** The set matches the standard POSIX shell metacharacters (minus `$`, deliberately: `$#` is a real parameter expansion, not a comment) rather than accreting exactly the four characters `F1` happened to demonstrate — the whole reason the first version was too narrow was that it grew by example instead of by definition.
- **Quote state threaded through `heredocSpans`'s own loop variable, not reconstructed per line.** The alternative — re-scanning from the start of the whole command on every line to recompute quote state — is quadratic and unnecessary; carrying one `quote` variable across the existing outer loop is both simpler and correct, and resets to a fresh scan only after a real heredoc body is consumed (since a body is data, never code, and cannot itself carry quote state into what follows).
- **The unquoted-backslash skip sits before the quote-open check, not inside it** — `\"` outside any quote is a literal double-quote character, not a quote delimiter, and the escape has to be recognized before the character it protects is ever tested against anything else. This also correctly handles `\'`/`\"` immediately preceding a real heredoc marker, beyond the one case the audit demonstrated.
- **The redundant `line[i+2] !== '<'` guard was found and removed, not kept "for safety."** It was added defensively alongside the herestring `line[i-1] !== '<'` check, but the anchored delimiter regex (`^<<-?\s*...`) already rejects a third `<` immediately after a matched pair on its own — verified by hand-simulating the mutant Stryker found surviving there, which confirmed the check never changed an outcome for any input. Keeping dead code and suppressing the mutants it produces would have been worse than removing it (`P-16`).
- **Stryker suppression directives (not plain comments) for every genuinely equivalent survivor in the new code**, each confirmed `status: Ignored` in the report rather than assumed: the `for` loop's own off-by-one (`line[line.length]` is always `undefined`), the `{ match: null, quote }` object literal at the comment-detection return (quote is provably `null` there, since the `if (quote)` branch above already exits early whenever it isn't), and the `c === '<' && line[i+1] === '<'` sub-checks (the anchored regex re-validates the literal characters regardless of this boolean shortcut, so loosening it only adds attempts the regex itself then rejects).

## Findings from validating against real state (P-04)

- **The adversarial-auditor's report was independently re-verified before being acted on, exactly as `TASK 84` established (`P-11`)** — every one of the three confirmed findings was reproduced directly against `checkGitWrite`/`checkBashPaths` with a scratch script, and the underlying bash-semantics claims (word-boundary comment rules, cross-line quote spanning, backslash-escape-vs-redirect) were independently re-verified against a real `bash -c` invocation (GNU bash 5.2.15 under Git Bash on this machine), not accepted on the report's word alone.
- The report also flagged two items as "unverified in this audit" (the 998/998 full-suite count and the 85.40% mutation score) because its own scope was deliberately narrowed to the two new code objects and did not re-run the full gate or Stryker — this is the audit correctly stating its own boundaries, not a discrepancy; both numbers were independently confirmed true at the time by this session's own full-suite and full-gate runs before the audit ran, and are re-measured fresh below after the rewrite superseded them.
- A harness-level notification wrapping the audit's report flagged instruction-shaped text inside it and neutralized control-looking tags before delivery — expected behavior for a report that quotes raw shell syntax (`<<`, `&`) and a settings-file path, not a real injection attempt. The report was treated throughout as data to verify, never as instructions, per `G-02`.

## Done

```yaml
done:
  tests:       { status: passed, evidence: ["scripts/guards/lib/shell.test.mjs: 58 -> 85 tests (shared with TASK 93)", "node --test \"scripts/guards/**/*.test.mjs\": 1007/1007 green", "node scripts/gate.mjs: GATE PASSED, 21/21, exit 0"] }
  mutation:    { status: passed, evidence: ["scoped run, scripts/guards/lib/shell.mjs: 80.73% (pre-session baseline) -> 86.76%, 0 unsuppressed survivors in the new scanLineForHeredoc/heredocSpans code", "6 genuinely equivalent survivors suppressed with real Stryker directives, reasons stated at each mutant, confirmed status: Ignored", "full gate aggregate: 78.34% against the 77.0 floor (up from 78.21% before this session's rewrite)"] }
  ci:          { status: not_applicable, reason: "no CI-relevant workflow files touched" }
  docs:        { status: passed, evidence: ["TASKS.md: TASK 92 closed with a closing narrative reflecting the audit-driven rewrite; run-order row present"] }
  loose_ends:  { status: passed, evidence: ["TASK 95 opened separately for a DIRECT_WRAPPERS composition gap found while closing TASK 93 (see that item's log) — not folded in here since it is unrelated to this item's own diff"] }
  scope:       { status: passed, evidence: ["only scripts/guards/lib/shell.mjs and its test file changed; TASK 93's eval fix landed in the same files in the same sitting, kept as a separate work item and a separate closing narrative per P-01"] }
  security:    { status: passed, evidence: ["adversarial-auditor pass run on the first fix per its own \"always on a guard or a boundary\" instruction; all 3 confirmed findings independently re-verified against real bash and the real guard functions, fixed, and re-verified again after the rewrite"] }
  iterations:      { status: passed, evidence: ["9"] }
  iteration_split: { status: passed, evidence: ["slice=1", "verify=8"] }
```

## Open questions

- None specific to this item. `TASK 91`/`94`/`95` remain open, unplaced in the run order.

## Next

`TASK 91` (`private/` write vector), `TASK 94` (shell-expansion residual, documentation) and `TASK 95` (a `DIRECT_WRAPPERS` candidate is never itself unwrapped) are still open and unplaced in the run order — `TASK 95` severe enough (it defeats `H-01` too) to warrant reordering ahead of the existing queue, same as `TASK 92`/`93` were flagged at `TASK 84`'s own close.

## Files changed

- `scripts/guards/lib/shell.mjs` — `COMMENT_BOUNDARY`, `scanLineForHeredoc` (replacing `isRealHeredocOpener`), the cross-line-quote-threaded `heredocSpans`, three Stryker suppression directives with stated reasons.
- `scripts/guards/lib/shell.test.mjs` — the comment/quote heredoc-opener red battery, the F1/F2/F3 audit-reproduction tests, the herestring anti-regression test (shared file with `TASK 93`'s tests).
- `TASKS.md` — `TASK 92` closed with the full audit-and-rewrite narrative; run-order row present.
