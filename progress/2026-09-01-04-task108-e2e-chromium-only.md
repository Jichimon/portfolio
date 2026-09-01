# 2026-09-01 · Session 04 — E2E narrowed to Chromium for CI

**Task:** TASK 108 — E2E narrowed to Chromium for CI
**Status after this session:** DONE, locally verified. The real CI effect is unconfirmed until the next push (`H-01` reserves that to the author).

## What was done

Read the real log of `TASK 107`'s monitored CI run (`gh run view 33517686247 --log`) after it hit the new 90-minute job timeout and was cancelled. The 90-minute bound worked as an escape hatch — no repeat of the earlier 6-hour blind run. But the log revealed something nobody had reason to assume beforehand: `guard tests` finished in ~2 seconds, then total silence for 89 minutes, and at cleanup GitHub listed an orphan `npm exec astro preview` process it had to terminate — proof that `e2e smoke` (not `mutation`) was the step still running when the clock ran out. `mutation`'s own incremental-cache save step found nothing to save, confirming Stryker never got a chance to start.

This overturned the working assumption (mine and the prior session's) that Stryker dominates CI cost — true locally, where it gets concurrency 11 on 12 cores, not demonstrated on GitHub's 2-core runner. Narrowed `site/playwright.config.ts`'s `projects` to Chromium only, and did the ADR-amendment work properly rather than as a quiet config edit: `docs/adr/ADR-006-testing-toolchain.md` (inline marker + full amendment section), `docs/adr/README.md` (level-1 date, level-2 table row), `.claude/rules/30-testing.md` (stack table row), and the now-stale "three real browser engines" comment in `harness.yml`.

## Decisions

- **Cut the step the evidence pointed at, not a percentage.** The author's broader concern — that the gate's total size looks disproportionate for "a harness and an almost-static site" — is real and being taken seriously (see the separate audit this session also does), but this specific item only touches what a real, monitored run actually showed was the bottleneck. Guessing further cuts from the same log would have been exactly the mistake `P-04` warns about.
- **Documented as a proper ADR amendment, not a silent config change.** `30-testing.md`'s stack table attributed "three real browser engines" to `ADR-006`, and `ADR-006` itself only ever named that as a reason to prefer Playwright over Cypress — not a commitment to run all three on every push. Both readings existed in the repository; recording which one now governs, and why, is what keeps the next reader from re-deriving this.
- **Firefox/WebKit are a stated gap, not a silent one (`C-11`).** The trigger to restore either is a real cross-engine defect, not a calendar date — written into the ADR amendment, the rule row, and the config comment identically, so it can't be found in one place and missed in another.

## Findings from validating against real state (P-04)

- **The real CI log, not a summary of it, is what changed the diagnosis.** `gh run view --log` on the actual cancelled run showed the orphan-process cleanup line naming `astro preview` — a detail no amount of re-reasoning from the earlier (correct, but locally-scoped) concurrency math would have surfaced. This is the second time in two sessions that pulling the real artifact instead of reasoning about the design overturned an assumption (the first was the empty-log discovery in `TASK 107`).
- **Local proof, not just a config diff.** Ran the actual e2e suite locally after the change: `171 passed in 2.2m`, Chromium only — a real number to compare against, not an assumption that removing two projects "should" make it faster.
- **`screenshots.smoke.spec.ts` already had a `browserName !== 'chromium'` skip guard**, unrelated to this item, that now simply never fires. Confirmed rather than assumed harmless — it was written for a different reason (screenshots captured once) and happens to be compatible.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node node_modules/@playwright/test/cli.js test (from site/) — 171 passed in 2.2m, Chromium only", "node scripts/guards/gate/check-rules-registry.mjs — PASS, 6 files consistent", "node scripts/guards/gate/check-docs.mjs — PASS, 62 living docs, 305 refs resolved"] }
  mutation:   { status: not_applicable, reason: "no scripts/guards/lib/** or site/lib/** file touched — playwright.config.ts, three docs, and one workflow comment only" }
  ci:         { status: blocked, reason: "the real effect on GitHub's runner is unconfirmed until the next push (H-01 reserves that to the author); this item's own done is scoped to what is locally verifiable" }
  security:   { status: not_applicable, reason: "no guard, boundary, or enforcement logic touched" }
  docs:       { status: passed, evidence: ["ADR-006 amended per this repository's own three-part convention (inline marker, level-2 table row, level-1 date) — verified against docs/adr/README.md's 'How to keep this alive' section before writing", "30-testing.md and check-docs both re-verified after the edit"] }
  loose_ends: { status: passed, evidence: ["what is NOT yet known (mutation's real CI cost, still unmeasured) stated explicitly in both TASKS.md and the ADR amendment rather than implied resolved"] }
  scope:      { status: passed, evidence: ["this item cuts only the step the evidence named; the broader coverage-size question is a separate audit, not silently folded in here"] }
  content:    { status: not_applicable, reason: "no resources/** touched" }
  iterations: { status: passed, evidence: ["2"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1", "verify=1"] }
```

## Open questions

- Does Chromium alone bring the whole gate under a sane CI bound, or is `mutation` — never yet reached in a real run — a second, independent cost once `e2e smoke` stops absorbing the 90-minute budget? Only the next real push answers this.

## Next

Author reviews and pushes as another monitored diagnostic. Watch the live-streamed log this time for whether `mutation` is even reached, and how long it takes if so — that is the input to whatever comes after this (Stryker concurrency tuning, a paid runner, or accepting the current shape).

## Files changed

`site/playwright.config.ts` — `projects` narrowed to Chromium only, with the evidence and the restoration trigger recorded inline.
`docs/adr/ADR-006-testing-toolchain.md` — inline `✏️ Amended` marker at the E2E decision paragraph; new `## Amendment · 2026-09-01` section; header `Date:` line corrected to list all four amendment dates (the three earlier ones had drifted out of sync with `docs/adr/README.md`'s own index — fixed in the same edit, `P-07`).
`docs/adr/README.md` — ADR-006's level-1 date cell; new level-2 table row.
`.claude/rules/30-testing.md` — E2E stack-table row updated to match.
`.github/workflows/harness.yml` — "three real browser engines" comment corrected to match the new config.
`TASKS.md` — `TASK 108` opened and closed in the same entry, per real local verification.
