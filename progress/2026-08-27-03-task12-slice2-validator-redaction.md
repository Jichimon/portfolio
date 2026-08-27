# 2026-08-27 · Session 03 — TASK 12 / TASK 18 slice 2: validator redaction scan + tool_use_id reuse

**Task:** TASK 12 / TASK 18 — trace fidelity, slice 2 of 4
**Status after this session:** IN PROGRESS

## What was done
Behavior 1 (TASK 18): `validateTrace`'s redaction scan now reuses `terms.mjs`'s `scanText`/`blankOpaqueValues`
instead of hand-rolling a regex, so it honours the per-term `\b` flag and blanks three named
opaque fields (`tool_use_id`, `run_id`, `parent_run_id`) before matching — by field name only, never
by shape. Behavior 2: `validateTrace` now flags a `tool_use_id` reused across two `tool.requested`
events, scoped to that event type only.

## Decisions
- **Reused `scanText`/`blankOpaqueValues` from `terms.mjs` rather than hand-rolling opaque-field
  blanking inside `evidence.mjs`.** The brief calls this out explicitly as completing an already-decided
  design (the `_opaqueFieldsRationale` in `guards.config.json` already points at this file). Rejected:
  writing a second, evidence-local blanking function — that would be the exact kind of duplicated
  mechanism the registry warns against (two copies drift).
- **Reporting the line number in the redaction finding, additively.** The brief calls this an
  "improvement" and explicitly says it is safe because it never quotes the value. Kept the existing
  `banned-terms.txt:<line>` reference and added the trace line number alongside it.
- **Behavior change reported rather than silently fixed:** switching from a hand-rolled
  case-insensitive substring regex to `scanText` means the redaction scan now honours each term's
  own `\b` word-boundary flag (TASK 45), where before it always did plain substring matching. This
  is called out per the brief's instruction, not left implicit.

## Findings from validating against real state (P-04)
- The old redaction scan built its own pattern per term (`new RegExp(term.replace(...), 'i')`) and
  ignored the `wordBoundary` flag entirely — confirmed by reading `validateTrace`'s current body
  before editing anything.
- `guards.config.json` already carries a top-level `terms.opaqueFields` block (used by `check-terms.mjs`
  for lockfile `integrity` values) — a *different* block from the one this task adds under `evidence`.
  Kept them separate per the brief (which specifies `evidence.opaqueFields`), since they answer to
  different consumers and different field sets.

## Done
```yaml
done:
  tests: { status: passed, evidence: ["node --test \"scripts/guards/lib/evidence.test.mjs\"", "node --test \"scripts/guards/gate/check-terms.test.mjs\""] }
  scope: { status: passed, evidence: ["scripts/guards/lib/evidence.mjs (validateTrace only)", "scripts/guards/lib/evidence.test.mjs", "scripts/guards/guards.config.json (evidence block only)", "scripts/guards/gate/check-trace.mjs"] }
  loose_ends: { status: passed, evidence: ["see Loose ends in final report"] }
  iterations: { status: passed, evidence: ["2"] }
```

## Open questions
None.

## Next
Slice 3 of 4 (not this session's scope).

## Files changed
`scripts/guards/lib/evidence.mjs` — `validateTrace` reuses `scanText`/`blankOpaqueValues` for redaction, adds `tool_use_id` reuse check.
`scripts/guards/lib/evidence.test.mjs` — four red tests for the opaque-field exclusion, one red test for tool_use_id reuse.
`scripts/guards/guards.config.json` — `evidence.opaqueFields` + `_opaqueFieldsRationale` added.
`scripts/guards/gate/check-trace.mjs` — threads `cfg.opaqueFields` into `validateTrace`.
