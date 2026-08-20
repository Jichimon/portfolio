# 2026-08-19 · Session 05 — TASK 7, decision 2 (content pipeline): ADR-002, revised after the author's question

**Task:** TASK 7 — Founding ADRs (decision 2 of 6, "content pipeline" in TASKS.md's numbering — decision 4)
**Status after this session:** TASK 7 `IN PROGRESS`, 1/6 accepted (ADR-002 still `Proposed`, pending final approval on the revised version). TASK 17 opened, `BLOCKED`.

## What was done

One `researcher` pass (frontmatter validation vs. `check-content`; `:::diagram{id}` → `/diagrams/{id}.svg` resolution), which hit a real harness hiccup — see Findings. Wrote `docs/adr/ADR-002-content-pipeline.md` from the report, presented at checkpoint. The author approved the `mermaid-cli` dependency but asked whether it should persist at build time indefinitely versus converting the current placeholders to real SVG once. Verified feasibility directly (rendered all 11 `.mmd` files, including the flagged-fragile `block-beta` one) before revising the ADR to adopt that design, and opened TASK 17 to carry the actual conversion output through the same `H-02` boundary TASK 16 already hit.

## Decisions

- **Frontmatter validation (Sub-decision 1): minimal Zod schema, 5 universal keys only, `.passthrough()` for the rest.** Rejected: a full schema mirroring `check-content` (drift risk on the volatile, type-conditional part) and no schema at all (loses any Astro-side signal).
- **Diagram resolution (Sub-decision 2), revised mid-session: one-time pre-render, zero Mermaid at build time — not a build-time fallback.** The author's question changed the decision, not just its packaging: the first draft (prebuild script, `.svg`-first-else-render-`.mmd` fallback) kept `mermaid-cli`/Puppeteer as an ongoing build dependency for as long as any `id` lacked a hand-authored replacement — potentially most of the site's first year, per TASK 6's own pace. Converting the 11 current placeholders to real `.svg` once removes that dependency from the build entirely; the pipeline becomes a plain file copy, permanently.
- **`otp-breakeven` (`block-beta`) is not special-cased**, in either version of the decision — verified rather than assumed to be risky: it rendered cleanly.

## Findings from validating against real state (P-04)

- **The content-pipeline `researcher` run needed a manual resume.** Its first pass ended with "Good, that confirms the basics. I now have sufficient material to write the report" and no report — 44 tool uses against a role-declared `maxTurns: 25`. Sent it a follow-up message asking for the full report explicitly; it then produced one, complete and well-sourced, on the next turn. Filed here rather than silently worked around, since `maxTurns` is supposed to be natively enforced (`G-06`) and 44 > 25 is either a budget observed differently than declared, or a real gap — worth `harness-evaluator`'s attention, not diagnosed further in this session.
- **Feasibility, not assumed:** rendered all 11 `.mmd` files with `@mermaid-js/mermaid-cli@11.16.0` in the scratchpad (never touching `resources/`). All 11 succeeded, exit 0, 17–36 KB SVGs each with real element content (verified via element counts, not just file existence). The upstream Mermaid `block-beta` bug reports the researcher found did not reproduce against this repository's actual `otp-breakeven.mmd`.
- **`resources/` write boundary held again**, this time via `Bash cp` rather than the `Edit`/`Write` tools that hit it on TASK 16 — confirms `guards.config.json`'s own note that the boundary is enforced on two vectors (file tools and shell) rather than one.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["docs/adr/ADR-002-content-pipeline.md, Proposed, revised", "TASKS.md TASK 17 opened"] }
  content:    { status: blocked, reason: "TASK 17's 11 rendered SVGs sit in the session scratchpad, cannot be written to resources/ (H-02) — needs the author to apply them" }
  iterations: { status: passed, evidence: ["2"] }
```

Two implement→verify cycles: (1) first ADR-002 draft, presented, author raised a design question rather than approving outright; (2) feasibility check + revised ADR-002 + TASK 17, not yet confirmed approved as of this log.

## Open questions

- ADR-002's revised version needs the author's final approval before the index/rule-rows update step.
- TASK 17: author copies the 11 SVGs from the scratchpad into `resources/diagrams/` (path in the TASK entry) before the scratchpad is cleaned up.

## Next

Await approval on revised ADR-002, then TASK 7 decision 3: i18n strategy.

## Files changed

`docs/adr/ADR-002-content-pipeline.md` — new, `Proposed`, revised mid-session after the author's question.
`TASKS.md` — TASK 17 opened, `BLOCKED`.
`progress/2026-08-19-05-task7-adr002-content-pipeline.md` — this file, new.
