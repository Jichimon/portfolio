# 2026-08-27 · Session 06 — TASK 12 slice 5: posture header

**Task:** TASK 12 — trace fidelity, slice 5 of 5: observed permission_mode header
**Status after this session:** DONE

## What was done
Added a pure decision function `posturePatch(existingText, permissionMode)` to `evidence.mjs`
that decides when the trace should record a fresh `run.header` carrying the real, observed
`permission_mode`. Wired it into `trace-writer.mjs`'s `record()` so every call — not just
`SessionStart`/`SubagentStart` — can surface a real mode the moment a `PostToolUse` or
`PostToolUseFailure` payload carries one, closing the gap where `G-04`'s promise had never
once been kept (118/118 headers on disk read `unknown`).

## Decisions
- **Empty/new trace text emits a header rather than returning null** — chosen over "no
  baseline, do nothing" because (a) a real mode with nothing recorded yet is new information
  worth capturing immediately, not something to wait on, and (b) with no prior event at all
  there is nothing for it to be adjacent to, so the load-bearing guard (behavior 3) does not
  apply. This is also exercised directly: `trace-writer.test.mjs`'s first `record()` call
  against a brand-new temp file depends on this to produce a header at all.
- **The adjacency guard (`last event is a run.header → null`) is unconditional**, independent
  of whether that header is the observed one or the original startup one. A fixture whose
  *only* header is followed by other events is not the same case as a fixture whose *last*
  event is a header — the brief's five red tests only resolve into a consistent design once
  that distinction is made explicit; test 1 (only header, unknown → default) has trailing
  activity after the header, while test 3 (last event is a header) has none.
- **`record()` reuses the text it already reads for `nextSeq`** rather than reading the file a
  second time, and skips calling `posturePatch` at all when the caller's own `events[0]` is
  already a `run.header` — belt-and-braces on top of `posturePatch`'s own adjacency check, per
  the brief.

## Findings from validating against real state (P-04)
None beyond what the brief already established from the corpus (118/118 headers `unknown`).
Ran `check-trace.mjs` against the live repository as instructed; it reported exactly 11
findings both before conceptual reasoning and after implementation — the 10 duplicate
`tool_use_id`s in the stale synthetic fixture plus the 1 pre-existing redaction failure named
in the brief (`TASK 59`), and nothing new. That run's own trace picked up real `observed`
headers as it went (this session was not running under `bypassPermissions`), which is direct
evidence behavior 2 works outside the isolated unit tests too.

## Done
```yaml
done:
  tests: { status: passed, evidence: ["node --test \"scripts/guards/lib/evidence.test.mjs\" — 71/71 pass", "node --test \"scripts/guards/hooks/trace-writer.test.mjs\" — 5/5 pass"] }
  scope: { status: passed, evidence: ["only evidence.mjs, trace-writer.mjs, evidence.test.mjs, trace-writer.test.mjs touched"] }
  content: { status: not_applicable, reason: "guard/harness code, not publishable content" }
  mutation: { status: not_applicable, reason: "brief did not request a Stryker run for this slice; posturePatch is a pure function under scripts/guards/lib/**, so it is mutation-covered surface and should be measured at the next full gate run" }
  ci: { status: not_applicable, reason: "brief explicitly reserves the full gate run for the human" }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions
None.

## Next
Run the full `node scripts/gate.mjs` (human-run, per the brief) to confirm the Stryker floor
still holds with `posturePatch` added to the mutation-covered surface, and to fold this
slice's evidence into the overall TASK 12 close-out.

## Files changed
`scripts/guards/lib/evidence.mjs` — added `posturePatch(existingText, permissionMode)`, the pure decision behind the observed header; no existing export touched.
`scripts/guards/lib/evidence.test.mjs` — added `posturePatch` import and 6 new tests (5 marked RED, seen to fail before the export existed, plus 1 covering the "not a real string" input shape).
`scripts/guards/hooks/trace-writer.mjs` — `record()` now reuses the text already read for `nextSeq` to call `posturePatch`, prepending its result to the events written when non-null; skips the call outright when the caller's own events already open with a `run.header`.
`scripts/guards/hooks/trace-writer.test.mjs` — new file; 5 tests against a temp root of the test's own making (never `evidence/`), 3 of them RED before the `record()` change.
