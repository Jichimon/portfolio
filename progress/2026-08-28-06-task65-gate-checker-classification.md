# 2026-08-28 · Session — TASK 65: two gate checkers pass on an artifact they cannot classify

**Task:** TASK 65 — `check-evals` and `check-procedures` each pass/fail on an artifact by a shape it happens to match rather than a property it declares (`INC-07`'s shape, found by `EVAL-001`). Clause 1: `check-evals` never checks a `proof: none` case's `proof_reason` against the register, so `EC-014` reads stale (`TASK 18` shipped, the case still says it didn't). Clause 2: `check-procedures` demands a `done:` block from every dated `progress/*.md`, with no way to except a generated, non-work-log artifact.
**Status after this session:** DONE

## What was done

Two independent `implementer` slices, disjoint file sets, delegated in parallel:

- **Slice A (clause 1 — `check-evals`).** `delegation-gate.mjs` gained `parseWorkItemStatuses`, sharing a new private `scanWorkItemHeadings` scan with the existing `parseWorkItemTypes` rather than a second hand-rolled heading regex. `evals.mjs`'s `validateCases` gained an optional `workItemStatuses` parameter (default empty, so every existing caller is unchanged) and a check inside the `unproven` branch: a `proof: none` case whose `proof_reason` cites a `TASK-N` that `TASKS.md` marks `DONE` is now a finding. `check-evals.mjs` derives the map from the real register, guarded in try/catch (`G-13`). `EC-014` now carries its real proof (`scripts/guards/lib/evidence.test.mjs`, `"RED: a banned term inside an opaque tool_use_id is not a redaction finding"`) and `outcome: Caught`.
- **Slice B (clause 2 — `check-procedures`).** `procedures.mjs` gained `isGeneratedArtifact(text)` (requires **both** the `` tool output (`D2`) `` disclosure and a `**Reproduce this file**` fenced command — proven in red that either alone is not enough) and `missingDoneBlockFinding(text, date, since)`, which applies the exemption. `check-procedures.mjs`'s loop now calls through to it instead of an unconditional finding. `progress/2026-08-27-13-eval001-workitem-extract.md` needed **no edit** — it already carried both signals; confirmed directly (`isGeneratedArtifact` returns `true` against its real content, and `false` against this file's own skeleton, which is real unfinished work, not generated).

Orchestrator (this session), after both slices verified independently (`P-11`) and both `run.footer`s confirmed `COMPLETE/objective_reported` (`P-18`, `G-06`):
- `docs/harness/contracts.md` §5 gained one paragraph on the generated-artifact exemption; §6 gained one paragraph on the staleness check.
- `TASKS.md`: `TASK 65` → `DONE` with a closing note; the two stale self-referential "stays red until `TASK 65` ships" lines inside the retired `TASK 68` block corrected to past tense (`P-07`).

## Decisions

- **Two delegated slices, not one.** Clause 1 and clause 2 touch disjoint modules (`G-12`); splitting removed any chance of two agents racing on a shared file and kept each brief small enough to hand over as a bounded extract (`P-09`) rather than an open-ended read.
- **`contracts.md` and `TASKS.md` edited by the orchestrator, not delegated.** Both slices would otherwise have touched the same two files in the same window — the exact shape `INC-16` fired on.
- **Shared heading scan (`scanWorkItemHeadings`) instead of a second regex for status.** `TASK 74` already paid once for a hand-rolled parse of this exact heading shape going subtly wrong; duplicating it for status would be the same risk reintroduced deliberately.
- **Both generated-artifact signals required together, not either alone.** A stray fenced code block or an incidental "D2" mention proves nothing on its own; the red test proving this (P-14) is `missingDoneBlockFinding` still firing when only one signal is present.

## Findings from validating against real state (P-04)

- Confirmed live before any change: `node scripts/guards/gate/check-evals.mjs` exits 0 today with `EC-014` still `proof: none` / `outcome: Gap` — the staleness gap is real, not hypothetical.
- Confirmed live before any change: `node scripts/guards/gate/check-procedures.mjs` fails today with exactly one finding, on `progress/2026-08-27-13-eval001-workitem-extract.md`.
- `progress/2026-08-27-13-eval001-workitem-extract.md` already carries both signals the fix looks for (`` tool output (`D2`) `` and a `**Reproduce this file**` fenced command) — the file needs no edit, only the guard needs to read what is already there.
- **Found during `/wrap-up`'s reconciliation check, not during Close.** `TASKS.md`'s "THE HARNESS ECONOMY" milestone carries its own `## Run order` table, with row 4 naming `TASK 65`. Every other completed row in that table (`70`, `71`, `74`, `77`, `79`) carries a `DONE` tag in its Phase column; row 4 still read plain `fix` after Close. This is `P-07`'s named failure mode exactly — the entry updated, the table pointing at it not checked — caught only because wrap-up's step 1.3 says to look for it. Fixed, re-verified (`check-rules-registry`, `check-docs`, full gate) — all green.

## Harness measurement, at wrap-up (P-12)

Read from `evidence/runs/21753bb9-bb79-4e61-9d5d-bd1d79bb66b7/` directly, not from memory:

| run | tool.requested | policy.decision deny | unsafe-action attempts (deny + no result) | footer |
|---|---|---|---|---|
| `implementer-ae004e26baa916c1f` (slice A) | 33 | 0 | 0 | `COMPLETE/objective_reported`, ~211s |
| `implementer-a79c294f19d0c4031` (slice B) | 20 | 0 | 0 | `COMPLETE/objective_reported`, ~189s |
| `orchestrator` (this session) | 82 | 0 | 0 | none yet (session still open) |

Both delegated runs finished well inside `implementer`'s `maxTurns: 45` (33 and 20 tool calls respectively) — consistent with `P-09`'s sizing goal for a bounded slice. **Zero denies across every file** is itself the reportable number, not an absence of measurement: neither implementer touched anything outside its declared ownership, so no boundary ever had to fire. No regression found; nothing new filed.

## Open questions

None.

## Next

`TASK 63` — next in the author's chosen order (`65 → 63 → 61 → 64 → 66 → 67 → 75`). Handoff packet written: `progress/handoff/2026-08-28-task63.md` (see below — this was initially skipped in error, then written after the author pointed out the established convention).

## Files changed

`scripts/guards/lib/delegation-gate.mjs` — `parseWorkItemTypes` refactored onto a shared `scanWorkItemHeadings`; new export `parseWorkItemStatuses`.
`scripts/guards/lib/delegation-gate.test.mjs` — 2 new tests for `parseWorkItemStatuses`.
`scripts/guards/lib/evals.mjs` — `validateCases` gains `workItemStatuses` param + staleness check.
`scripts/guards/lib/evals.test.mjs` — extended `run` helper + 2 new tests.
`scripts/guards/gate/check-evals.mjs` — derives `workItemStatuses` from `TASKS.md`, passes to `validateCases`.
`evaluation-cases/EC-014-redaction-flags-an-opaque-id.yaml` — real proof, `outcome: Caught`, notes updated.
`scripts/guards/lib/procedures.mjs` — new `isGeneratedArtifact`, `missingDoneBlockFinding`.
`scripts/guards/lib/procedures.test.mjs` — 8 new tests.
`scripts/guards/gate/check-procedures.mjs` — calls through to `missingDoneBlockFinding`.
`docs/harness/contracts.md` — one paragraph each in §5 and §6.
`TASKS.md` — `TASK 65` closed; two stale lines in the retired `TASK 68` block corrected.
`progress/2026-08-28-06-task65-gate-checker-classification.md` — this file.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test \"scripts/guards/**/*.test.mjs\" — 754 pass, 0 fail"] }
  mutation:   { status: passed, evidence: ["node scripts/gate.mjs mutation step — 75.91% (6414 mutants, 4869 killed/timeout), floor 74.5"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs — GATE PASSED, 20/20 steps (run three times: 19/20 mid-session with the sole FAIL being `procedures` on this file's own then-missing done block, 20/20 once that block was added, 20/20 again after the wrap-up reconciliation fix below)"] }
  docs:       { status: passed, evidence: ["node scripts/guards/gate/check-docs.mjs — PASS", "node scripts/guards/gate/check-contracts.mjs — PASS", "node scripts/guards/gate/check-rules-registry.mjs — PASS", "THE HARNESS ECONOMY Run order table row 4 corrected to `fix · DONE` at /wrap-up (P-07)"] }
  security:   { status: passed, evidence: ["node --test scripts/guards/lib/delegation-gate.test.mjs — 38 pass including every TASK-74 red-path test for the H-05 heading parse, unmodified"] }
  content:    { status: not_applicable, reason: "harness/guard work; resources/** untouched" }
  ci:         { status: not_applicable, reason: "no remote exists yet (TASK 30)" }
  scope:      { status: passed, evidence: ["git diff --stat — 12 files, matching the two-slice ownership split in the approved plan"] }
  loose_ends: { status: passed, evidence: ["none opened; the only one found mid-session (this file's own missing done block, flagged correctly by slice B) is closed by this block"] }
  iterations:      { status: passed, evidence: ["5"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1", "slice=2", "verify=1", "reconcile=1"] }
```
