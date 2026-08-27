# 2026-08-27 · Session 04 — TASK 12 slice 3: separating a writer defect from a delivery loss

**Task:** TASK 12 — trace fidelity, slice 3 of 5
**Status after this session:** DONE (this slice)

## What was done

`validateTrace`'s orphan-`tool.result` finding now carries `kind: 'delivery_loss'`, scoped to that
one finding only. `check-trace.mjs` partitions on it: every other finding still fails the step
unconditionally, delivery-loss findings are counted and turned into a rate over every
`tool.result` event read, and the step fails only when that rate exceeds `guards.config.json`'s
new `evidence.maxRequestLossRate` (0.02, measured). The rate is printed on every run, pass or
fail, and a zero-over-zero (fresh clone, or a corpus with no `tool.result` events) reports 0,
never `NaN`.

## Decisions

- **The `kind` tag is scoped to orphan `tool.result` only, never orphan `policy.decision`.** The
  measured incident (63 losses) is exclusively orphan `tool.result` events; an orphan
  `policy.decision` is a different, untested shape and stays an ordinary unconditional finding
  rather than being folded into the same floor by assumption.
- **No new export was added to `evidence.mjs`.** The brief restricted that file to "`validateTrace`
  only, and only the orphan finding," read literally: the `'delivery_loss'` string is a literal
  in both `evidence.mjs` and `check-trace.mjs` rather than a shared constant, so nothing outside
  the orphan-finding block changed.
- **The rate/floor partition lives entirely in `check-trace.mjs`**, which parses each trace line
  itself only to count `tool.result` events for the denominator (`validateTrace` already parses
  the file for findings; this is a second, minimal, deliberately duplicated pass rather than
  widening `validateTrace`'s return shape to carry a counter).
- **No `scripts/guards/gate/check-trace.test.mjs` file was created**, even though the brief's DoD
  and "Red tests, written first" section describe fixture-corpus, floor-comparison tests that
  read like CLI-level tests. The enumerated file list for this slice names only `evidence.mjs`,
  `evidence.test.mjs`, `check-trace.mjs` and the config — no test file for `check-trace.mjs`. To
  honor both "write only enumerated files" and T-01's reproducing-test requirement, the CLI tests
  were added to `evidence.test.mjs` instead, spawning `check-trace.mjs` in a child process against
  a fixture repository — the same `--root`-override pattern `check-terms.mjs`/`check-terms.test.mjs`
  already establish in this codebase (confirmed by reading them first, `P-04`). This is flagged
  under Drift below rather than silently resolved.
- **`check-trace.mjs` gained a `--root <dir>` flag**, mirroring `check-terms.mjs` exactly, so its
  own tests can run against a fixture tree instead of the real, growing corpus. This is test
  scaffolding, not a new user-facing behavior, so it was not given its own preceding red test —
  same treatment `check-terms.mjs`'s own `--root` received.

## Findings from validating against real state (P-04)

- Running `check-terms.mjs`/`check-terms.test.mjs` first (per the brief's verification step) showed
  it already establishes the exact `--root`-override + spawned-fixture pattern this slice needed
  for `check-trace.mjs` — reading it before designing anything avoided inventing a second pattern.
- Running the new tests **before** touching `check-trace.mjs` production code produced real red
  output for the wrong-but-informative reason that `--root` wasn't recognized yet: the CLI fell
  back to the real repository root and printed the *actual* 74 pre-existing findings from the real
  `evidence/` corpus (63 orphan `tool.result`, several `tool_use_id` reuses, one redaction hit) —
  independent confirmation, before any fix, that the brief's "63 orphans / same shape" description
  matches what's on disk today.
- After the fix, running `check-trace.mjs` directly (no `--root`, real corpus, explicitly permitted
  by the brief) shows delivery loss now separated from hard findings: `63/4236 tool.result event(s)
  — 1.49% (floor 2.00%)`, well under the floor. The corpus has grown since the brief's `63/3,754 =
  1.68%` was measured — expected, and exactly the drift the rationale names (`retainRuns: 50`).
  The remaining 11 hard findings are the brief's named exception: the stale synthetic
  `evidence/runs/unknown/orchestrator.jsonl` fixture (10 `tool_use_id`-reuse findings) plus one
  pre-existing redaction hit in a real run file — neither is this slice's defect.
- The working tree carried unrelated, pre-existing uncommitted changes to `TASKS.md`, three
  `.claude/agents/*.md` files and two rule files when this session started, from other concurrent
  sessions/slices. Confirmed via `git diff --stat` scoped to the four owned files, which shows
  nothing else was touched here.

## Done

```yaml
done:
  tests: { status: passed, evidence: ["node --test scripts/guards/lib/evidence.test.mjs — 59 pass, 0 fail", "node --test scripts/guards/gate/check-terms.test.mjs — 10 pass, 0 fail"] }
  scope: { status: passed, evidence: ["scripts/guards/lib/evidence.mjs", "scripts/guards/lib/evidence.test.mjs", "scripts/guards/guards.config.json", "scripts/guards/gate/check-trace.mjs"] }
  loose_ends: { status: passed, evidence: ["reported below and in the final report; none acted on"] }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions

- None requiring the author's input. One question for the orchestrator: whether a colocated
  `scripts/guards/gate/check-trace.test.mjs` should exist going forward as its own file (matching
  `check-terms.test.mjs`'s precedent) rather than living inside `evidence.test.mjs` — see Drift in
  the final report.

## Next

Slice 4 of 5 (per the brief's forward reference): the posture header (`run.header` with
`reason: "observed"` for `permission_mode`) — not started here, out of this slice's scope.

## Files changed

`scripts/guards/lib/evidence.mjs` — the orphan-`tool.result` finding in `validateTrace` now carries `kind: 'delivery_loss'`; nothing else in the file touched.
`scripts/guards/lib/evidence.test.mjs` — two new red-then-green tests for the `kind` tag (Behavior 1), plus a `check-trace.mjs` fixture/spawn test section for the loss-rate floor (Behavior 2), since no separate `check-trace.test.mjs` is in this slice's file list.
`scripts/guards/gate/check-trace.mjs` — added `--root` override (test scaffolding, mirrors `check-terms.mjs`); partitions `validateTrace`'s findings on `kind === 'delivery_loss'`, counts `tool.result` events for the denominator, computes and prints the rate every run, and fails only on hard findings or a rate exceeding `guards.config.json`'s floor.
`scripts/guards/guards.config.json` — added `evidence.maxRequestLossRate: 0.02` and `_maxRequestLossRateRationale`.
