# 2026-08-29 · Session 03 — TASK 86: flag-shaped `..`-traversal bypass in `checkBashPaths`

**Task:** TASK 86 — A flag-shaped argument that resolves through `..` bypasses the `'all'`-mode loop entirely
**Status after this session:** DONE

## What was done

Fixed a real, live bypass in `checkBashPaths`'s `'all'`-mode and `'inplace'`-mode loops
(`scripts/guards/lib/path-boundary.mjs`): both decided whether an argument was a flag from its
raw text (`arg.startsWith('-')`) *before* any path resolution, so an argument crafted to start
with `-` but resolve through `..` into a protected boundary was skipped outright and never
reached `flag()`. `rm -rf -/../resources` was `allowed: true` against the boundary it plainly
deletes. TDD: reproducing red tests first, then the fix, then anti-regression, then the gate.

## Decisions

- **Folded this into the same session as `TASK 83`, at the author's explicit direction**, rather
  than deferring to a fresh session as originally planned. Pushed back once (this is a real
  production-code change to a rung-1-adjacent guard, not paperwork) and then proceeded once the
  author confirmed — a human instruction at `A2` governing a rung-3 process preference (`G-01`).
- **The fix is simpler than `TASK 86`'s own `Done` line anticipated.** It proposed "resolve an
  argument's path before deciding it looks like a flag." The actual patch is smaller: stop
  deciding at all — delete the skip, check every argument unconditionally. This is safe because
  `isInside` requires the *whole* resolved path to equal or start with the boundary at a segment
  boundary; a real flag's text sits in front of that comparison and breaks the literal match, so
  it can never accidentally resolve into a protected tree. Verified this holds by construction,
  not sampling, before relying on it.
- **Did not extend the same fix to `destinationArgs`** (`cp`/`ln`/`install`'s `'dest'`-mode
  fallback), even though it shares the identical raw-text `startsWith('-')` mistake and is also a
  live bypass (`cp /tmp/x.md -/../resources/y.md` is wrongly `allowed`). That function must pick
  **one** argument as *the* destination, and `TASK 61`'s own passing regression test requires a
  real trailing flag to be excluded from that pick — so `TASK 86`'s "check everything" fix would
  regress a currently-correct case. Filed as `TASK 87` instead of reshaping this item's fix to
  cover a function with a genuinely different shape (`P-01`, `P-06`).

## A `check-docs` false alarm along the way

The first full gate run failed `living docs + CI` — not a defect in the fix, but in this session's
own `TASKS.md` prose: two example paths in the `TASK 86`/`TASK 87` write-ups (`` `/tmp/x.md` ``,
`` `resources/y.md` ``) happened to appear **standalone** in backticks elsewhere in the text,
which `check-docs`' extractor (`doc-links.mjs`) treats as a real file citation whenever a
backtick span has no internal whitespace and a known extension. Fixed by rewording those two
spots to describe the argument in prose instead of repeating the fake path in isolation — the
same pattern `TASK 61`'s own notes already used correctly (its `cp`/`dd` examples are always
embedded in a longer, space-containing backtick span, never isolated). Re-ran `check-docs.mjs`
alone to confirm before paying for the full ~6-minute gate again.

## Findings from validating against real state (P-04)

- Confirmed the identical bypass shape reaches the `'inplace'` loop too (`sed`/`perl`/`awk`),
  not just `'all'`-mode — `sed -i 's/a/b/' -/../resources/x.md` was also wrongly `allowed`
  before the fix. `TASK 86`'s own `Done` line had flagged this as something to *confirm*, not
  assumed; confirmed directly rather than taken on faith.
- The `destinationArgs` variant (`TASK 87`) was found only because fixing `TASK 86` required
  understanding exactly *why* "check everything" is safe for `'all'`/`'inplace'` — which made it
  obvious the same reasoning does not hold for a function that must pick a single argument.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test scripts/guards/lib/path-boundary.test.mjs: 40/40", "node scripts/gate.mjs (second run, after the check-docs fix): GATE PASSED, 20/20 steps"] }
  mutation:   { status: passed, evidence: ["gate.mjs Stryker run: path-boundary.mjs 80.27% (179 killed, 0 timeout, 35 survived, 9 no cov); whole-suite 76.24%, above the 75.5 floor"] }
  scope:      { status: passed, evidence: ["git diff scripts/guards/lib/path-boundary.mjs: skip deleted from both loops plus one doc-comment update — no unrelated change"] }
  loose_ends: { status: passed, evidence: ["TASK 87 filed in TASKS.md for the destinationArgs variant, not folded in"] }
  docs:       { status: passed, evidence: ["TASKS.md TASK 86 entry closed with findings; TASK 87 entry opened; check-docs.mjs PASS after rewording two standalone example-path citations"] }
  iterations:      { status: passed, evidence: ["1"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1"] }
```

## Open questions

None.

## Next

`TASK 87` is available immediately (same file, same investigation) if the author wants to keep
going in this session; otherwise the corrected run order from `progress/handoff/2026-08-29-task83.md`
resumes at `TASK 66`.

## Files changed

`scripts/guards/lib/path-boundary.mjs` — the `startsWith('-')` skip removed from the `'all'`-mode
and `'inplace'`-mode loops; one doc-comment updated to match.
`scripts/guards/lib/path-boundary.test.mjs` — two reproducing red tests, one anti-regression test.
`TASKS.md` — `TASK 86` closed with findings; `TASK 87` opened.
`progress/2026-08-29-03-task86-flag-shaped-traversal.md` — this log.
