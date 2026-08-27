# 2026-08-27 · Session 05 — TASK 12 slice 4: run.header multiplicity + reason vocabulary

**Task:** TASK 12 — trace fidelity, slice 4 of 5
**Status after this session:** DONE

## What was done
Added two checks to `validateTrace`: two adjacent `run.header` events are now a finding (one start recorded twice), while two headers separated by real events remain unflagged (a legitimate resume). Added a declared vocabulary (`traceHeaderReasons`) for a header's `reason` field, threaded through the same `opts` argument as `opaqueFields`, failing closed when the list is absent or empty. Both behaviors were proven red before being implemented, and the whole existing corpus (107 trace files) still produces exactly the same 11 pre-existing findings.

## Decisions
- **Adjacency, not "more than one per file", is the finding.** Per the brief's decided answer: once-per-resume is legitimate, once-per-start is not. Implemented by tracking the previous event's `ev` and flagging only `run.header` directly following `run.header` — never flagging on count alone, which would break the 18 files that carry two headers for a real resume.
- **The reason-vocabulary check only fires when `reason` is present on the event.** `SCHEMA['run.header']` does not require `reason` (only `run_id`, `permission_mode`), and many existing tests' `ok` fixture omits it entirely. Making absence itself a finding would be a different check (schema completeness) not asked for here, and would break dozens of pre-existing fixtures that predate this field. Rejected in favor of the narrower "present-but-undeclared" reading, which matches the brief's own examples (`reason: "resumed"` as the counterexample, not a missing `reason`).
- **Fail-closed for an absent/empty `traceHeaderReasons` means: any present reason is reported.** An empty array's `.includes()` is always false, so this falls out of the same code path as the vocabulary check itself — no separate branch needed, and it cannot regress into a silent no-op later without someone changing the `includes` check itself.
- **`observed` declared now, not emitted.** Config rationale states its purpose (slice 5's permission-mode observation) explicitly, per the brief, so slice 5 doesn't need to touch this list.

## Findings from validating against real state (P-04)
Confirmed against the live corpus rather than assumed: running `check-trace.mjs` before and after the change both report exactly 11 findings (10 duplicate `tool_use_id`s in one stale synthetic fixture, 1 genuine redaction failure). The new header checks added zero new findings, which independently confirms the brief's corpus evidence — all 118 real headers use only `startup` or `delegated`, and none is adjacent to another.

## Done
```yaml
done:
  tests: { status: passed, evidence: ["node --test \"scripts/guards/lib/evidence.test.mjs\" — 65 pass, 0 fail"] }
  scope: { status: passed, evidence: ["only scripts/guards/lib/evidence.mjs, scripts/guards/lib/evidence.test.mjs, scripts/guards/guards.config.json (evidence block), scripts/guards/gate/check-trace.mjs touched"] }
  content: { status: not_applicable, reason: "no publishable content touched" }
  mutation: { status: not_applicable, reason: "not run this session per brief instruction (\"do not run the full gate; I run it\"); new branches are straightforward boolean guards with direct test coverage on both sides of each condition" }
  ci: { status: not_applicable, reason: "not run this session per brief instruction — orchestrator runs the gate" }
  loose_ends: { status: passed, evidence: ["see Open questions / below — none blocking, all recorded"] }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions
None requiring author input.

## Next
Slice 5: make the writer record the real `permission_mode` as `observed` once the runtime exposes it, per the rationale already recorded in `guards.config.json`'s `_traceHeaderReasonsRationale`.

## Files changed
`scripts/guards/lib/evidence.mjs` — `validateTrace`: adjacent-`run.header` finding, and `reason`-vocabulary finding via new `opts.traceHeaderReasons` (fail-closed on empty/absent).
`scripts/guards/lib/evidence.test.mjs` — 6 new tests: 1 red+1 green for adjacency, 3 red/green for vocabulary (undeclared reason, each declared value, fail-closed default), 1 confirming absent `reason` is out of scope.
`scripts/guards/guards.config.json` — `evidence` block: added `traceHeaderReasons` (`startup`, `delegated`, `observed`) with rationale.
`scripts/guards/gate/check-trace.mjs` — threaded `cfg.traceHeaderReasons ?? []` into the existing `validateTrace` call, alongside `opaqueFields`.
