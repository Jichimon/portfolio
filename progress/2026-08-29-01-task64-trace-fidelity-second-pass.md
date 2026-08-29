# 2026-08-29 · Session 01 — TASK 64: trace fidelity, second pass

**Task:** TASK 64 — Trace fidelity, second pass: the four writer defects `EVAL-001` found
**Status after this session:** DONE

## What was done

All six clauses closed, test-first throughout. Clause 3: `runIdFor` now returns
`agent_resolution: "missing_agent_type"` whenever it falls back to `"unknown-role"`, threaded
through `record()` onto every event of that run (never on a resolved one). Clauses 1+2:
`headerFooterPresence` (new, pure) classifies a delegated trace as unterminated (header, no
footer) or headerless (footer, no real start header); `check-trace` now counts and enumerates
both, non-failing, per the checkpoint decision. Clause 4: `extractLastPermissionMode` (new,
pure) reads the freshest `permissionMode` off the run's own transcript; `eventsFor`'s posture
resolver prefers a real payload value, falls back to the transcript, and never fabricates —
every header now carries `permission_mode_source`. `posturePatch`'s own header gained the same
field (`"payload"`, always, for that path). Clause 5: `L` documented as orchestrator-only in
`architecture.md` §K (the canonical location — not restated in `contracts.md`, per `G-10`);
`EC-003`'s stale `required_evidence` line removed. Clause 6: `summarizeSegment` now prefers a
segment's own `run.cost.by_model` over the role-file-declared tier, labelling which one a row
used via `model_source`; confirmed live against the real corpus (`implementer` now reports
both `sonnet` (declared, pre-`TASK 77`) and `claude-sonnet-5` (measured) as separate rows).

## Decisions

- **Corrected the register before implementing (`P-04`).** Clauses 2 and 3 are one defect in
  two eras, not two distinct variants — the `unknown-role` fallback (added after `agent: ""`
  appeared 7 times) renamed the symptom rather than fixing it; all 3 `unknown-role` files carry
  a `reason: "observed"` header injected by `posturePatch` at `SubagentStop`, not a
  `SubagentStart` header, so the register's "it **has** a header, so it is not `GAP-08`"
  reasoning is wrong. Clause 3's literal Done ("agent must be a role file in `.claude/agents/`
  or `orchestrator`") would fail 5 legitimate `Explore` traces — `Explore` is a runtime
  built-in with no role file in this repo. See the plan file for the corrected done shape.
- **Unterminated runs (clause 1): report + enumerate, never fail.** `H-03` forbids any agent
  from cleaning `evidence/runs/`, and `evidence.md` already records that a permanently-red
  trace step was twice resolved by a human deleting evidence. A footerless run also measures
  role reliability (`implementer` 21/48), not a writer defect — gating on it punishes the
  wrong actor. User-approved in the plan checkpoint.
- **`permission_mode` (clause 4): read from the transcript**, not declared merely absent.
  Verified the transcript's `user` lines carry `permissionMode` (179 occurrences in one real
  session). `record-event.mjs` already opens `transcript_path` for `TASK 77`'s `run.cost`, so
  this widens an existing I/O boundary rather than adding one. Every header gains
  `permission_mode_source` (`payload` | `transcript` | `unavailable`) — never a fabricated
  value (`C-01`). User-approved in the plan checkpoint.
- **`TASK 83` stays a separate item**, not folded in. Zero file overlap risk aside — it's a
  precision cost (`INC-01`): two unrelated fixes under one "done" is exactly the shape that
  rule exists to prevent. User-approved in the plan checkpoint.

## Findings from validating against real state (P-04)

See the plan file's corpus table — every register figure re-measured against the real
`evidence/runs/` corpus today (126 files, 196 headers), with two corrections recorded above.

**Two more findings surfaced mid-implementation, past the checkpoint, and changed the design
from what the approved plan described:**

- **The plan's clause-3 fix (a sibling-file lookup by `agent_id`) would have been dead code.**
  Checked before writing it: no `agent_id` anywhere in the corpus appears under two different
  role-name prefixes, in any session directory. All 10 header/footer-mismatched files (7
  `agent: ""` + 3 `unknown-role`) have no sibling with the same id at all — the real defect is
  a `SubagentStart` that never reached the writer for that dispatch, not a Start/Stop naming
  mismatch resolvable from a file already on disk. Implemented `agent_resolution` (an honest
  "why," attached to the sentinel already in place) instead, and folded the header/footer
  shape into the delivery-loss family alongside clauses 1+2, which is what the evidence
  actually supported.
- **A naive "any `run.header` present" check would have silently reclassified the `unknown-role`
  defect as healthy.** Running the first cut of `headerFooterPresence` against the real corpus
  (not just its own unit tests, whose fixtures had no `reason` field) showed all 3 `unknown-role`
  files DO carry a header — `posturePatch`'s `reason: "observed"` patch, not a real start. Fixed
  by excluding `reason: "observed"` from counting as a start boundary, the same distinction
  `costWindowStart` already draws one layer up for the identical reason. Caught by running the
  guard against `evidence/runs/` itself before considering the slice done, not by a hypothesis.
- **Verified a load-bearing transcript-coupling assumption empirically before committing to it**
  (the same discipline `evidence.md` names for `tool_response`/`tool_result`): dispatched a
  throwaway `Explore` probe with a temporary debug capture in `record-event.mjs` (removed
  before this closed) to confirm `SubagentStart`'s real payload shape. Two things the plan had
  assumed turned out to need correction: `transcript_path` on `SubagentStart` points at the
  **same shared session transcript** the orchestrator writes to (not a per-subagent file), and
  `permissionMode` is stamped only on genuine freeform human turns — never on a tool-result
  "user" line, and not on every human turn either (a slash command's own synthetic wrapper
  turns carry none, confirmed by comparing two real transcripts: 1/10 vs 41/55 human-typed
  lines carrying the field, the difference being how many freeform turns each session had).

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test \"scripts/guards/**/*.test.mjs\" — 852 pass, 0 fail"] }
  mutation:   { status: passed, evidence: ["node scripts/gate.mjs mutation step — 76.24%, floor 75.5 (reports/mutation/mutation.json)"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs — GATE PASSED, 20/20, exit:0 (run twice: 19/20 with this log's own then-empty done block as the sole FAIL — expected, chicken-and-egg — 20/20 once this block was written and verified, check-procedures included)"] }
  security:   { status: passed, evidence: ["scripts/guards/lib/evidence.test.mjs — redaction/opaque-field tests unchanged and passing; agent_resolution and permission_mode_source are closed-vocabulary literals, never free text, and check-trace's whole-file scanText scan covers both fields exactly as every other", "H-03's write vector unchanged — record-event.mjs still writes only through trace-writer.mjs's record()"] }
  docs:       { status: passed, evidence: ["docs/harness/architecture.md §K", "docs/harness/evidence.md — agent_resolution, permission_mode_source (incl. its one-turn-staleness limit), the two new check-trace counts, the corrected GAP-08 finding, the transcript coupling", "evaluation-cases/EC-003-a-role-bootstrapping-into-a-void.yaml", ".claude/rules/40-agent-policy.md G-06 rung 4→2", "check-docs.mjs + check-rules-registry.mjs — PASS in the full gate run"] }
  content:    { status: not_applicable, reason: "harness/guard work; resources/** untouched" }
  ci:         { status: not_applicable, reason: "no remote exists yet (TASK 30)" }
  scope:      { status: passed, evidence: ["git diff --stat — 13 files, 420 insertions(+) 25 deletions(-): the six clauses' code+tests, TASKS.md, and this log; no file outside that set touched"] }
  loose_ends: { status: passed, evidence: ["TASKS.md run-order table — TASK 83/84 resequenced with their placement reasoned, TASK 85 left explicitly unscheduled with its reason (P-06); no new loose end opened this session"] }
  iterations:      { status: passed, evidence: ["4"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1", "slice=1", "verify=1", "reconcile=1"] }
```

`iteration_split` accounting: **checkpoint=1** (one plan approval — `ExitPlanMode` was rejected
once on a UI hiccup, then approved via explicit text with no revision to the plan itself, so
this is one round, not two). **slice=1** (one continuous orchestrator-performed implementation
pass across all six clauses; two design corrections happened *inside* this pass, before either
was ever presented as finished, so per `K1`'s own human-visible-cycle definition they are not
separate iterations). **verify=1** (the one full `node scripts/gate.mjs` run before reconciling
— the mandatory closing gate run `/wrap-up` itself requires is not double-counted as a second
work-item iteration). **reconcile=1** (`TASKS.md`, this log, `EC-003`, and the three living
docs, all in one pass, no rework needed).

## Open questions

(none blocking; see plan)

## Next

All six clauses are implemented, tested, and verified against the real corpus; `TASKS.md`
is reconciled (`TASK 64` marked `DONE`, the two register corrections recorded, the
`TASK 83`/`84`/`85` sequencing decision written into the run-order table rather than left in
chat). `node scripts/gate.mjs` is 19/20 — the sole failure is `procedures`, on this very log's
still-placeholder `done:` block, which only `/wrap-up` may fill in (`disable-model-invocation`
refused a same-session attempt to replicate its workflow). **The author needs to type
`/wrap-up`** to close this item formally; the gate will be 20/20 the moment that runs.

## Files changed

- `scripts/guards/lib/evidence.mjs` — `runIdFor` gains `agent_resolution`; new
  `headerFooterPresence` and `extractLastPermissionMode`; `eventsFor`'s posture resolver and
  `posturePatch` both gain `permission_mode_source`.
- `scripts/guards/lib/evidence.test.mjs` — red tests for all of the above.
- `scripts/guards/hooks/trace-writer.mjs` — threads `agent_resolution` through `record()`.
- `scripts/guards/hooks/trace-writer.test.mjs` — red tests for the threading, plus a
  `readDelegatedEvents` fixture helper.
- `scripts/guards/hooks/record-event.mjs` — widens the transcript read to `SessionStart`/
  `SubagentStart` (temporary debug capture added and removed within this session).
- `scripts/guards/gate/check-trace.mjs` — the `unterminated`/`headerless` report lines.
- `scripts/guards/lib/cost.mjs` — `measuredModel`; `summarizeSegment` prefers it over
  `declaredModels`; report text and column headers updated.
- `scripts/guards/lib/cost.test.mjs` — red tests for `measuredModel`'s preference and its
  fallback.
- `.claude/rules/40-agent-policy.md` — `G-06`'s rung moves from 4 to 2 for the observation
  half, per `G-11`.
- `docs/harness/evidence.md` — documents `agent_resolution`, `permission_mode_source`, the two
  new report counts, the corrected `GAP-08` finding, and the transcript coupling.
- `docs/harness/architecture.md` — §K states `L` is orchestrator-only and why.
- `evaluation-cases/EC-003-a-role-bootstrapping-into-a-void.yaml` — drops the delegated
  `instructions.loaded` requirement; `notes` records the correction.
- `TASKS.md` — `TASK 64` closed; run-order table reconciled (`TASK 61`'s stale `DONE` marker
  fixed in passing; `TASK 83`/`84` inserted at their recommended positions with rationale;
  `TASK 85` left unscheduled with its reason).
