# 2026-08-29 · Session 02 — TASK 83: cover the `'all'`-mode loop's trailing-flag shape

**Task:** TASK 83 — `path-boundary`'s `'all'`-mode loop is defeated by a flag placed after the target
**Status after this session:** DONE

## What was done

Added two tests to `path-boundary.test.mjs` proving the `'all'`-mode loop (`checkBashPaths`,
`path-boundary.mjs:173-177`) still denies a protected target when a flag follows it. No
production code changed, as scoped by the `TASK 83` hand-off. While hand-verifying the battery
actually kills the two named mutants (`T-04`), found that a real, separate bypass already exists
in the unmutated guard — filed as `TASK 86` rather than fixed here, to keep this item's scope to
what was declared (test-only).

## Decisions

- **Did not fold `TASK 84` into this session, even though it touches the same function.**
  Asked by the author directly. `TASK 84` needs new production detection logic and a wiring
  change to `pretooluse.mjs` (a different defect shape — a missing read-boundary vector — from
  `TASK 83`'s pure test-coverage gap on already-correct write-boundary code); `P-01` says a
  work item's "done" must be a single verifiable sentence, and `TASK 84`'s own text already
  established the precedent for this exact pair (same function, different defect shape → filed
  separately, not folded — the same reasoning `TASK 84` itself used to explain why it wasn't
  folded into `TASK 61`). Kept the two as sequential, separate work items.
- **Did not attempt to fix the `..`-through-a-flag bypass found while testing.** It is real
  (`rm -rf -/../resources` is wrongly `allowed` today) but fixing it needs production code —
  resolving an argument's path before deciding it looks like a flag — which is a different kind
  of change than this item's declared test-only scope. Filed as `TASK 86` instead of expanding
  this item's scope mid-session (`P-01`, `P-06`).

## Findings from validating against real state (P-04)

The hand-off's suggested test commands (`rm -rf resources/ -v`, `mv resources/a.md /tmp/a.md -v`)
do **not** kill either of the two named mutants, contrary to what the hand-off (written by the
prior session, before this one validated it) claimed. Traced by hand and confirmed by literally
applying each mutation and rerunning the suite:

- The real target in both example commands is already flagged **before** the trailing flag is
  even reached — the loop's skip logic on that specific trailing argument is never exercised by
  either command, regardless of whether it is skipped correctly or not.
- `arg.endsWith('-')` **is** killable, but only by a target whose own filename ends in `-`
  (`rm -rf 'resources/file-'`) — the one shape where `endsWith` and `startsWith` disagree about
  whether the *target itself* is a flag. Added as its own test and confirmed red under the
  mutation, green under the real code.
- The literal-`false` mutant (never skip anything) is a **true equivalent mutant** for this loop
  under any realistic flag syntax: skipping fewer arguments can only ever add extra `flag()`
  calls, and an ordinary flag (`-rf`, `-v`, ...) never resolves to a path inside a boundary, so
  `allowed`/`findings` cannot differ. The only construction that does distinguish it —
  `-/../resources`, a flag-shaped argument that resolves through `..` into the boundary — turned
  out to be a genuine, currently-live bypass in the unmutated guard, not a test gap. Documented
  inline in the test file (per `T-03`'s "a suppression carries its reason, at the mutant") rather
  than claiming a kill that did not happen (`P-11`), and filed as `TASK 86`.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test scripts/guards/lib/path-boundary.test.mjs: 37/37", "node scripts/gate.mjs (2026-08-29, second run): GATE PASSED, 20/20 steps"] }
  mutation:   { status: passed, evidence: ["hand-mutated path-boundary.mjs:175 to arg.endsWith('-') and to false, reran the suite for each, reverted; endsWith('-') killed by the new 'target ending in -' test, false confirmed equivalent and documented", "gate.mjs Stryker run: path-boundary.mjs 79.83% (186 killed, 0 timeout, 38 survived, 9 no cov); whole-suite 76.24%, above the 75.5 floor"] }
  scope:      { status: passed, evidence: ["git diff scripts/guards/lib/path-boundary.mjs: empty — test-only, as scoped"] }
  loose_ends: { status: passed, evidence: ["TASK 86 filed in TASKS.md for the `..`-through-a-flag bypass found during verification"] }
  docs:       { status: passed, evidence: ["TASKS.md TASK 83 entry closed with findings; TASK 86 entry opened"] }
  iterations:      { status: passed, evidence: ["1"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1"] }
```

**Note on the gate run itself:** the first `node scripts/gate.mjs` was launched before this log's `done:` block was filled in (still the empty skeleton written at session start), and `check-procedures`'s liveness check correctly failed on it — "the done block declares no dimension." Not a defect in the change under test; a sequencing mistake in this session, fixed by finishing the log before the second, authoritative gate run above.

## Open questions

None — `TASK 86` is a new, separately-scoped follow-up, not an open question on this item.

## Next

`TASK 66` — per the corrected run order in `progress/handoff/2026-08-29-task83.md` (`83 → 66 →
67 → 84 → 75`). `TASK 84` and the newly-filed `TASK 86` both touch `checkBashPaths`'s flag/target
classification and could reasonably be batched with each other when either is picked up, since
they are the same defect shape (missing detection vector) on the same function — unlike the
`TASK 83`/`TASK 84` pairing, which was not.

## Files changed

`scripts/guards/lib/path-boundary.test.mjs` — two new tests (trailing flag after an `'all'`-mode
target; a target ending in `-`), plus an inline comment recording the equivalent-mutant finding.
`TASKS.md` — `TASK 83` closed with findings; `TASK 86` opened.
`progress/2026-08-29-02-task83-all-mode-trailing-flag.md` — this log.
