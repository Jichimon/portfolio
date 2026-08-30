# 2026-08-29 · Session 04 — TASK-87: `destinationArgs`' positional fallback picks the wrong argument

**Task:** TASK 87 — `destinationArgs`' positional fallback picks the WRONG argument when the real destination is flag-shaped
**Status after this session:** DONE

## What was done

Fixed the bypass in `destinationArgs` (`scripts/guards/lib/path-boundary.mjs`, the `cp`/`ln`/`install`
`'dest'`-mode fallback), filed by `TASK 86` as its own residual because `TASK 86`'s fix does not
transplant here. TDD: reproducing red tests first, then the one-predicate fix, then anti-regression,
then the gate — followed by a self-caught correction to one of the fix's own claims, found while
re-verifying it during wrap-up rather than left standing.

## Decisions

- **Distinguish a real flag from a flag-shaped destination by the presence of a path separator,
  not by attempting to enumerate real cp/ln/install flag syntax.** A real flag never contains `/`
  or `\`; a `..`-climb into a boundary cannot resolve to anything without one. Narrower and
  cheaper than a flag allowlist, and it is exactly the signal that separates `TASK 61`'s case
  (`-v`, no separator, stays excluded) from `TASK 87`'s (`-/../resources/y.md`, has one, stays a
  candidate).
- **First dropped the backslash-separated variant, then reinstated it — the drop was wrong.** The
  first pass believed `\` was untestable through this entry point, on the claim that Bash's own
  escape semantics consume an unquoted `\` before `destinationArgs` ever sees the argument. That
  claim traced back to a diagnostic script whose *own* shell-escaping was broken (double-escaped
  through the Bash tool's quoting, not through `shell.mjs`), not to anything the guard actually
  does. Rereading `tokenize()` in `shell.mjs` directly shows it never treats an unquoted `\` as an
  escape character — an unquoted char is appended as-is — so the backslash form is a live bypass
  through the identical entry point, verified with a clean script file rather than an inline
  shell one-liner. Caught during wrap-up's own re-verification, before reporting the item done to
  the author, per `P-11` (an agent's own prior claim is a claim, not evidence, until re-checked)
  and `C-01`/`P-04` applied to the harness's own record rather than a case study's.

## Findings from validating against real state (P-04)

- Confirmed the exact repro from the `TASK 87` entry against the pre-fix code:
  `checkBashPaths('cp /tmp/x.md -/../resources/y.md', {write:['resources']}, ROOT)` returned
  `allowed: true` with no findings.
- The first backslash test (`-..\resources\y.md`, no separator between the leading `-` and the
  `..`) does not actually reproduce the forward-slash shape at all: `normalize()` only collapses
  a segment that is *exactly* `..`, and `-..` as one un-split segment never matches. The
  corrected form needs the separator right after the dash — `-\..\resources\y.md` — to mirror
  `-/../resources/y.md` once backslashes are normalized to slashes. Both the false negative (the
  wrong test shape) and the true positive (the corrected shape, genuinely `allowed: true`
  pre-fix) were checked directly rather than assumed.
- Proved both reproducing tests red-without-the-fix and green-with-it by a real before/after
  run — temporarily reverting the one changed line, confirming both fail, then restoring it and
  confirming the full 43/43 file passes — rather than trusting the single post-fix green run.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test scripts/guards/lib/path-boundary.test.mjs: 43/43", "node scripts/gate.mjs: GATE PASSED, 20/20 steps"] }
  mutation:   { status: passed, evidence: ["gate.mjs Stryker run: whole-suite 76.26%, above the 75.5 floor (T-03)"] }
  scope:      { status: passed, evidence: ["git diff scripts/guards/lib/path-boundary.mjs: one filter predicate plus its doc comments — no unrelated change"] }
  loose_ends: { status: passed, evidence: ["none opened — this item was itself TASK 86's residual and closes it"] }
  docs:       { status: passed, evidence: ["TASKS.md TASK 87 entry closed with the fix, the findings, and the mid-session correction; check-docs.mjs PASS"] }
  iterations:      { status: passed, evidence: ["1"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1"] }
```

## Open questions

None.

## Next

Resume the harness-economy run order at `TASK 66` (item 8): a substrate for `K2`. `TASK 67`
(item 9), `TASK 84` (item 9b, the `H-04` read-boundary shell vector) and `TASK 75` (item 10,
`C-09`'s locale-parity content check) follow it; `TASK 78` and `TASK 73` are the mechanize-phase
items after that, each with its own stated blocker.

## Files changed

`scripts/guards/lib/path-boundary.mjs` — `destinationArgs`' filter narrowed from
`!a.startsWith('-')` to `!(a.startsWith('-') && !/[/\\]/.test(a))`, with updated doc comments.
`scripts/guards/lib/path-boundary.test.mjs` — three reproducing red tests (forward-slash
destination, forward-slash `ln`, backslash destination) and one restated anti-regression test.
`TASKS.md` — `TASK 87` closed with the fix, the findings, and the mid-session correction.
`progress/2026-08-29-04-task87-destination-args-separator.md` — this log.
