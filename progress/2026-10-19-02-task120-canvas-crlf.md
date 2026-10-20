# 2026-10-19 · Session 02 — TASK 120, the design-canvas step on a CRLF checkout

**Task:** TASK 120 — The design-canvas gate step fails on a CRLF checkout
**Status after this session:** DONE — `node scripts/gate.mjs --profile full` GATE PASSED, 22/22, on the same working tree whose `design canvas` step had failed two hours earlier.

## What was done

- Diagnosed and fixed the `design canvas` gate step, found by the gate run that opened TASK 119 — not by a hypothesis. One exported reader (`readArtboard` in `docs/design/canvas/derive.mjs`) now folds `\r\n` to `\n` at every artboard read boundary in both `derive.mjs` and `verify.mjs`, so the ES table's multi-line `from` blocks and the derived-vs-disk comparison are EOL-agnostic by construction. No line ending on disk is touched, and nothing changes for CI's LF checkout.

## Decisions

- **Normalize at the read boundary, not by rewriting the checkout.** Converting the working tree to LF would fix the symptom until the next pull re-materialized CRLF. The blobs are LF either way; the tooling now works under both regimes.
- **No `.gitattributes` change.** Declaring EOLs repo-wide is a real option with a wider blast radius (index renormalization, every text file), and it is the author's, not this item's. The canvas fix is correct under either policy, which is why it ships without waiting on that decision.
- **`verify.mjs` reads the live artboards through the same reader**, so `checkDerivedScreens` compares LF against LF regardless of what the checkout holds — and every other canvas check now runs on the same normalized text CI sees.

## Findings from validating against real state (P-04)

- **The failure was six weeks old and nobody had run the step locally since.** The last committed artboard change was the employer-strip commit (2026-09-03); that branch's CI run was green on Linux — `gh pr view 1` reports `gate: SUCCESS` twice, read from the provider rather than assumed (`T-10`). This machine runs `core.autocrlf=true`, and the working tree's `Main.dc.html` measured 799 CRLF lines and zero LF-only at session start. The step passed on 2026-09-03 because the tree still held the LF bytes those sessions had written; the post-merge pull, not any edit, broke it. The first local gate run since — this session's — is what surfaced it.
- **The red path was observed live, not planted (`P-14`)**: the gate run over TASK 119's opening edits shows `design canvas` FAIL with `derive: source strings not found` on an unmodified tree, before any fix existed.
- **PR #1 also makes the branch-protection case concrete.** Nothing blocked merging that PR, and nothing needed to — its checks were green. The hole this defect fell into is that no local gate ran between the pull and today; branch protection plus the per-item PR flow makes every merge carry a fresh green run, from a machine that checks out the same bytes the runner does.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node docs/design/canvas/verify.mjs — PASS on the CRLF tree, every section", "node docs/design/canvas/derive.mjs --check — ok, 3 derived file(s) match their sources", "node scripts/gate.mjs --profile full — GATE PASSED, 22/22, design canvas green at 174ms"] }
  mutation:   { status: passed, evidence: ["full-profile mutation PASS, 1m04s incremental over unchanged surfaces — the fix touches docs/design/canvas/, outside the mutated core, so zero changed files is the correct result"] }
  scope:      { status: passed, evidence: ["docs/design/canvas/derive.mjs — readArtboard exported and used at all three read sites", "docs/design/canvas/verify.mjs — the src map and the derived-actual fallback read through it"] }
  docs:       { status: passed, evidence: ["TASKS.md carries TASK 120 closed with the close paragraph", "this log"] }
  content:    { status: not_applicable, reason: "no file under resources/** is touched (H-02) — the defect and the fix are both in the design tooling" }
  ci:         { status: not_applicable, reason: "H-01 — nothing pushed this session for CI to evaluate; the PR run is the author's merge step" }
  security:   { status: not_applicable, reason: "a read-time string normalization in design tooling; no site code, no content, no input surface" }
  loose_ends: { status: passed, evidence: ["none open — both line-ending regimes covered; CI's LF path is unchanged and PR #1's green gate is its baseline"] }
  iterations:      { status: passed, evidence: ["2"] }
  iteration_split: { status: passed, evidence: ["verify=2"] }
```

## Next

TASK 119 continues — its packet is drafted and waiting on the author's paste. The fifth role, the artboards' fifth entry, the full gate on the applied tree, and the close all follow from that paste.

## Files changed

- `docs/design/canvas/derive.mjs` — `readArtboard` exported and used at every read boundary.
- `docs/design/canvas/verify.mjs` — artboard reads through the same reader.
- `TASKS.md` — TASK 120 opened and closed.
- `progress/2026-10-19-02-task120-canvas-crlf.md` — this log.