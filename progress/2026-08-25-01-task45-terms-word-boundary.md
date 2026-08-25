# 2026-08-25 · Session 01 — TASK 45: per-term word-boundary opt-in for `check-terms`

**Task:** TASK 45 — the confidentiality guard matches substrings, and a short term collides forever
**Status after this session:** DONE

## What was done

`parseTerms` now recognizes the wrapped `\b <term> \b` flag (already written into
`private/banned-terms.txt` by the author before this session) and returns
`{ term, line, wordBoundary: true }` for it; every other term is unaffected. A line
carrying only one of the two markers throws, naming its line number, instead of being
read as a literal (G-13). `scanText` and `mask` share one `termPattern` helper so both
honour the flag identically. 8 new tests added (30 total, up from 22), 4+ of them seen
red before the fix — including the one that reproduces the live defect: a flagged term
now genuinely matches as a word instead of being swallowed whole and matching nothing.

## Decisions

- **Per-term word-boundary opt-in, already decided by the author before this session.**
  This session's job was mechanical: make `parseTerms` recognize the flag the author had
  already written, instead of swallowing the whole line as one literal term — the live
  defect verified at session start (33 terms × 287 files, PASS, for the wrong reason: the
  flagged term was unprotected, matching nothing).
- **`mask` and `scanText` share one `termPattern(term)` helper** rather than each deciding
  independently whether to wrap in `\b`. Two independent implementations of the same
  boundary logic is exactly the shape that drifts silently when one is edited and the
  other is not.
- **A malformed flag throws from `parseTerms` itself**, not from the CLI. The CLI
  (`check-terms.mjs`, out of scope for this task) does not catch it, so it surfaces as an
  uncaught exception naming the line — which satisfies "fails the run, naming the line
  number" without touching a file this session does not own.

## Findings from validating against real state (P-04)

- Baseline before any change: `node --test scripts/guards/lib/terms.test.mjs` — 22 tests,
  22 passing. `node scripts/guards/gate/check-terms.mjs` — PASS, 33 terms × 287 files
  scanned, 1 binary skipped, whole repo minus 11 exclusions. This PASS was the bug: the
  flagged term's line was parsed as one literal string `\b <term> \b` (escaped and
  searched for verbatim), matching nothing, so the guard reported clean while the
  colliding term was unprotected.
- **After the fix, the live guard still PASSes (now 289 files — other agents' concurrent
  work added files to the tree, not mine) — and that is the CORRECT outcome, not a sign
  the bug persists.** Per the task's own "Known limit": the actual colliding npm package
  is `<term><digit>`, and `\b` does not exist between a letter and a digit, so the flag
  clears that specific collision by design. Liveness was verified indirectly, without
  reading `private/banned-terms.txt` (H-04): (1) the real-repo run completed with no
  uncaught exception, proving the flag line parses without hitting the malformed-flag
  path; (2) the fictional-term fixtures in `terms.test.mjs` exercise the exact same code
  path (`termPattern`) that runs against the real file, and prove standalone matching now
  works and compound-identifier matching correctly still does not.
- **Mid-session interruption.** A hand-applied mutation battery was cut off mid-flight
  (progress log left as "pending" in fragment form). Resumed this session by first
  verifying `terms.mjs` was byte-identical to a pre-mutation backup taken right after the
  real fix landed (`diff` — identical) before doing anything else, per instruction. No
  mutant was left on disk.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["scripts/guards/lib/terms.test.mjs — 30 tests, up from 22 baseline; 8 new, all 6 required by the four-item red battery seen to fail before the fix (plus 2 control/masking tests written straight to green)", "the reproducing test is 'RED: a flagged term matches standalone', which failed before the fix (actual 0, expected 1) — T-01: a bugfix with no reproducing test is not done"] }
  mutation:   { status: partial, evidence: ["2 of a planned ~4 hand-applied mutants run over the new logic in scripts/guards/lib/terms.mjs, both killed: (1) inverted the malformed-flag condition (opens!==closes -> opens===closes && false) — killed by both malformed-flag tests; (2) removed the \\b wrap in termPattern (return body unconditionally) — killed by the compound-identifier and over-mask tests", "a 3rd mutant (off-by-N in the WORD_BOUNDARY_OPEN/CLOSE slice offsets) was planned but not reached before the session was interrupted; not attempted after resuming, per the budget guidance to not push further once a partial battery is truthfully reported", "source verified byte-identical to a pre-mutation backup via diff before any further work, and the full terms.test.mjs suite re-run green (30/30) after restoring"] }
  gate:       { status: passed, evidence: ["node scripts/guards/gate/check-terms.mjs — exit 0, PASS, 33 terms x 289 files scanned, 1 binary skipped, whole repo minus 11 exclusions — no crash, so the real banned-terms.txt flag line parses cleanly", "node --test scripts/guards/gate/check-terms.test.mjs — 10/10 passing, unchanged, including the LIVENESS test"] }
  security:   { status: passed, evidence: ["private/banned-terms.txt was never read directly by this session (H-04) — verified only indirectly via the CLI's own exit code and fictional fixtures", "guards.config.json re-validated as parseable JSON via node -e JSON.parse after every edit"] }
  docs:       { status: passed, evidence: ["scripts/guards/lib/terms.mjs:14-19 design comment rewritten to state the new per-term semantics and why, replacing the false 'substring matching, deliberately' claim", "guards.config.json — terms._termFlagsRationale added, following the _opaqueFieldsRationale precedent, documenting the flag syntax and the letter/digit known limit for an auditor who cannot read private/"] }
  scope:      { status: passed, evidence: ["exactly the three owned files touched: scripts/guards/lib/terms.mjs, scripts/guards/lib/terms.test.mjs, scripts/guards/guards.config.json", "scripts/guards/lib/gate.mjs, gate.test.mjs, scripts/gate.mjs, scripts/guards/gate/check-terms.mjs untouched — confirmed via git status, all their modifications are the concurrent agent's, not this session's"] }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions

None. The letter/digit known limit is recorded above and in `guards.config.json`'s
`_termFlagsRationale`, as a deliberate, documented residual — not something this session
was asked to fix.

## Next

The 3rd planned mutant (slice-offset bug in the flag-stripping bounds) was not run. If a
future session wants full confidence on that one line, it is cheap: flip
`WORD_BOUNDARY_OPEN.length` to `0` in `parseTerms`'s slice call and confirm
`'RED: parseTerms recognizes the wrapped flag...'` fails (it should assert on the exact
stripped term).

## Files changed

`scripts/guards/lib/terms.mjs` — `parseTerms` recognizes `\b <term> \b`, throws on a
half-formed flag; new `termPattern` helper shared by `mask` and `scanText` so both honour
the flag; design comment at the top rewritten.
`scripts/guards/lib/terms.test.mjs` — 8 new tests for the flag: parse, standalone match,
compound-identifier non-match, unflagged-term contrast, two malformed-flag directions,
masking, over-mask guard.
`scripts/guards/guards.config.json` — `terms._termFlagsRationale` added.
