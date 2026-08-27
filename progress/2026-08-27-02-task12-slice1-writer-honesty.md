# 2026-08-27 · Session 02 — TASK 12 slice 1: the writer's honesty

**Task:** TASK 12 — trace fidelity, slice 1 of 3 (bugfix)
**Status after this session:** DONE

## What was done
Fixed two defects in `scripts/guards/lib/evidence.mjs`, scoped exclusively to `runIdFor` and the
module-level `bytes` helper, per `T-01` (bugfix in mutation-covered surface): red test first for
each behavior, watched fail with the actual failure message, then smallest fix, then full suite
green.

1. `runIdFor` treated an empty or whitespace-only `agent_type` as a valid name (`??` only catches
   `undefined`/`null`). Now falls back to `'unknown-role'` for absent, empty, or whitespace-only
   `agent_type`.
2. `bytes()` stringified any non-string `tool_response` via `String(obj)`, which collapses every
   object to the literal `"[object Object]"` — a constant 15 bytes regardless of actual payload
   size. This is why 100% of `tool.result` events in the corpus (3,754 across 101 files) recorded
   `bytes: 15`: the runtime sends `tool_response` as an object, and the field name was correct
   while the measurement was constant. Fixed to serialize non-string, non-nullish values via
   `JSON.stringify`, falling back to `String(s)` if stringify returns `undefined` (functions/
   symbols) or throws (circular structures) — so the hook can never crash on this path.

Also corrected the existing coupling test (`RED: a tool result is measured from
'tool_response'...`) which previously passed a **string** `tool_response`, asserting against a
shape the runtime does not send. It now exercises the object shape the runtime actually sends,
keeping its stated intent (fail loudly on field-name drift).

## Decisions
- **Property-based assertion for behavior 2** (`P-13`), as directed: a new test asserts that two
  differently-sized `tool_response` objects produce two different byte counts, rather than
  pinning a specific number — so the test still means something if the payload shape shifts.
- **`bytes()` kept non-exported and un-parameter-changed** — tested indirectly through
  `eventsFor`, matching how the pre-existing coupling test already exercised it. Exporting it
  would have widened the file's public surface beyond the brief's scope (`runIdFor` and `bytes`
  only, no interface changes implied).
- **Added two more tests beyond the minimum asked** (never-throws on circular reference,
  null/undefined still measure as zero) because the brief explicitly names these as edges "that
  matter because this runs inside a hook and a hook must never break the session" — treated as
  part of behavior 2's definition of done, not scope creep, since the brief itself specified them.

## Findings from validating against real state (P-04)
- Confirmed by reading the file before editing: the field name coupling (`tool_response` vs the
  docs' `tool_resu`) was already correct, exactly as the brief said — the defect was purely in
  `bytes()`'s handling of a non-string value, not in which field was read.

## Done
```yaml
done:
  tests: { status: passed, evidence: ["node --test \"scripts/guards/lib/evidence.test.mjs\" -> tests 47, pass 47, fail 0"] }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions
- None.

## Next
Slices 2 and 3 of TASK 12 own `validateTrace`, `redactToolInput`, `rejectReason` and `nextSeq` in
the same file — not this session's concern, noted only so the next session knows the boundary
held.

## Files changed
- `scripts/guards/lib/evidence.mjs` — `runIdFor` (empty/whitespace `agent_type` fallback) and the
  module-level `bytes` helper (measures serialized objects instead of `String(obj)`) only.
- `scripts/guards/lib/evidence.test.mjs` — two new red tests for `runIdFor`; three new tests for
  `bytes` behavior (different-size objects differ, circular never throws, null/undefined still
  zero); corrected the pre-existing `tool_response` coupling test to use an object payload
  instead of a string.
