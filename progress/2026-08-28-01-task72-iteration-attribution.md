# 2026-08-28 · Session 01 — TASK 72: record where the iterations go

**Task:** TASK 72 — Record where the iterations go
**Status after this session:** DONE

## What was done

`iteration_split` — one done-block dimension carrying `bucket=count` pairs that must sum to `iterations` — with its vocabulary derived from the `work-item` procedure's own step headings and the register's own type table, never written into the guard. Six new exported functions in `procedures.mjs`, 24 new tests, wired into `check-procedures` and into the five documents that describe the convention.

Also, ahead of it and belonging to the approved plan rather than to this item: `TASK 76` opened in the register and recorded as blocking `TASK 30`, the milestone run order reordered to the author's chosen sequence, and one stale paragraph in the register's head reconciled.

## Decisions

- **The field is `iteration_split`, and its evidence is `bucket=count` pairs summing to `iterations`.** One field, per the item's constraint. A pair list keeps it machine-readable without inventing a nested schema `parseDoneBlock` cannot read — the existing `^\s{2,}([a-z_]+):\s*\{(.*)\}` line parser accepts `iteration_split` unchanged, so the extended shape cost no parser change at all. Rejected: a second `iterations_*` count per bucket, which is the taxonomy the entry forbids.

- **The sum invariant is the load-bearing half.** Without it the split can say anything and still pass — which is worse than not having the field, because it looks like a measurement. Everything else in the check is shape; this is the part that makes the number mean something.

- **The vocabulary is derived from two live artifacts, never written into the guard (`P-13`).** The buckets are the *return points* of the `work-item` procedure — its own `## N · Name` headings — minus the first step (`Orient`: nothing returns to the entry point) and the last (`Close`: a return to Close is a reopen, which is `K2`, a different metric with a different substrate). Then the item's `type` narrows it: a type whose row in the register's type table answers **No** to *"Produces a spec?"* cannot attribute an iteration to the spec step, because it never had one. A step added to the procedure becomes a bucket without the guard being touched, and that is asserted by a test rather than claimed.

- **Both derivations throw rather than returning empty (`G-13`).** An empty vocabulary accepts every bucket name, so the check would report PASS while asserting nothing — `INC-07` exactly, one layer up. `check-procedures` catches the throw and reports it as a **named finding**, because a gate step owes the reader a reason rather than a stack trace.

- **The type is resolved by reusing `parseWorkItemTypes`, not by re-parsing the register.** `TASK 74` had just made that function correct and it is the single reader of the register's heading shape. The log's own filename carries the id, which `progress/README.md` already mandates.

- **A dated cutoff, reusing `doneBlockRequiredFrom`'s mechanism rather than duplicating its reasoning.** `iterationSplitRequiredFrom: 2026-08-28`, third use of the same threshold shape. Required only where `iterations` reads `passed` — a `not_applicable` count has no cycles to attribute.

- **`EVAL-TEMPLATE.md` gains a `K1b` row, and the two scorecards are left untouched.** The template is the artifact the next evaluation fills; `EVAL-000` and `EVAL-001` are artifacts under evaluation, and editing one is a finding rather than a reconcile.

## Findings from validating against real state (P-04)

- **`check-procedures` fails any dated log whose `done:` block is empty — so opening a log as a skeleton turns the gate red until it is filled.** Found by doing it: `P-09`'s one measured mitigation against a cut run is writing the log first, and that log immediately produced two gate findings. The behaviour is correct (an empty conjunction is true of everything) and the tension is real. Recorded in `wrap-up` §3 so it reads as a known cost rather than as a bug the next session tries to fix.

- **The same skeleton blocked the mutation gate, not just the gate.** `npx stryker run` aborted its **dry run** — *"There were failed tests in the initial test run"* — because the liveness test over `progress/` was red. So the ordering is forced rather than stylistic: the log's `done:` block must be complete before mutation can be measured at all. Worth knowing, because the failure message names Stryker and points nowhere near the cause.

- **The register's head described a parser that no longer exists.** It stated the status token *"is not parsed by any guard"* and that the type is *"the first backticked token after the em dash"*. `TASK 74` made both false four days ago and the paragraph was never reconciled — `P-07`'s characteristic failure, in the document that defines the shape the guard reads. Corrected.

- **A red-battery anchor silently matched nothing, and the battery reported it rather than passing.** One of nine neuters used `\\b` inside a shell heredoc, which Python collapsed to a backspace character, so the anchor found zero matches. The harness for the battery printed `SKIP anchor x0` and a final `every neuter caught: False` instead of counting nine greens — which is the only reason it was caught. A battery that silently skips a neuter is a battery that proves less than it claims, and this is the second time this session's tooling has been saved by making "found nothing" visible rather than benign.

- **`ui.es.md`'s own traceability body has become false**, recorded under `TASK 76` rather than fixed here: it claims six `home.*` strings were lifted from the artboard *"sin tocar una coma"* when they were rewritten, and it quotes a value for `stack_heading` that its own frontmatter no longer carries.

## Done

```yaml
done:
  tests:           { status: passed, evidence: ["node --test \"scripts/guards/**/*.test.mjs\"", "706 pass 0 fail", "+24 tests"] }
  red_battery:     { status: passed, evidence: ["9 neuters applied to procedures.mjs, 9 caught", "T-04, P-14"] }
  mutation:        { status: passed, evidence: ["npx stryker run", "75.61 vs break 74.5", "procedures.mjs 347/467"] }
  gate:            { status: partial, evidence: ["node scripts/gate.mjs", "19 of 20", "only `procedures` red, on TASK 65 clause 2, pre-existing and tracked"] }
  docs:            { status: passed, evidence: [".claude/skills/work-item/SKILL.md#7", ".claude/skills/wrap-up/SKILL.md#2", "progress/README.md", "docs/harness/contracts.md#5", "progress/evaluation-results/EVAL-TEMPLATE.md"] }
  loose_ends:      { status: passed, evidence: ["TASKS.md TASK 76", "TASKS.md run order"] }
  scope:           { status: passed, evidence: ["one field, one dimension — the entry's own constraint"] }
  content:         { status: not_applicable, reason: "no publishable file touched; resources/** is read-only to agents (H-02)" }
  security:        { status: not_applicable, reason: "no auth surface, no network, no credential path" }
  ci:              { status: not_applicable, reason: "no remote exists (TASK 30)" }
  iterations:      { status: passed, evidence: ["4"] }
  iteration_split: { status: passed, evidence: ["slice=3", "reconcile=1"] }
```

**Reading the split, since this is the first log to carry one.** Four implement→verify cycles, three of which returned to the implementation step: the tests failing on a missing import (expected, that is the red), two liveness assertions failing after the first green, and the derivation throw surfacing as a stack trace rather than a finding. The fourth returned to reconcile, when the mutation gate refused to run against an unfinished log. **Zero returned to `checkpoint`** — the plan approval covered this item's design, and no artifact came back from the author. That is the shape a bare `iterations: 4` cannot express, and the reason this field exists.

## Open questions

- **Whether `slice` is the right name for the implementation bucket.** It is what the derivation yields — step 4's heading is *"Slice and delegate"* — and renaming it means renaming the procedure step, which is the correct place to change it if the author wants `implement`. Left alone deliberately: inventing a display name in the guard would be the first hardcoded string in a vocabulary whose whole point is that it has none.

## Next

`TASK 71` → `ADR-009`. It is the last item in the milestone's *measure → decide* half, and `TASK 70` and `TASK 72` are now both closed, so every number the ADR's seven decisions rest on either exists or can be honestly declared absent.

## Files changed

`scripts/guards/lib/procedures.mjs` — six exported functions: the two derivations, the bucket join, the log-to-item id, and the two validators.
`scripts/guards/lib/procedures.test.mjs` — 24 tests, including three `G-13` throws, the type-narrowing assertion and two liveness checks over the real files.
`scripts/guards/gate/check-procedures.mjs` — the new checks wired in, with both derivation throws caught and reported as named findings.
`scripts/guards/guards.config.json` — `iterationSplitRequiredFrom` and its rationale.
`.claude/skills/work-item/SKILL.md` — §7 tells the author what to write and why.
`.claude/skills/wrap-up/SKILL.md` — §2 the shape, §3 the skeleton-log consequence.
`progress/README.md` — the dimension list and the paired shape.
`docs/harness/contracts.md` — K1's row and the done-dimension example.
`progress/evaluation-results/EVAL-TEMPLATE.md` — a `K1b` row so the next scorecard reads the split.
`TASKS.md` — TASK 72 closed; TASK 76 opened and blocking TASK 30; run order reordered; the head's stale parser paragraph reconciled.
