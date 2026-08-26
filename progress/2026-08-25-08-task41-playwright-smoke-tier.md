# TASK 41 — Playwright smoke tier

**Opened and closed 2026-08-25.** Type `harness`, so no spec: the artifact the author approves is the diff.

Position 11 in the site sequence, running immediately before the home page item so that item is verified on arrival rather than retrofitted.

## What was done

Playwright installed in `site/`, a config that builds and serves `dist/` through a `globalSetup` lifecycle, and one smoke spec deriving every route from the content source. The gate gained a nineteenth step, `e2e smoke`, and it passes: **54 tests across chromium, firefox and webkit in ~51s.**

Two red paths were run against the real tree, and the first of them found that the suite as delivered proved nothing.

## Decisions

- **The pending-routes list, and why it is not a skip list.** `listRoutes()` derives sixteen routes; only two have page modules today. Rather than assert over all sixteen and leave the step red until the page items land — which is the blindness `TASK 34` and `TASK 39` exist to remove — `guards.config.json` carries `site.pendingRoutes`, seven slugs each with a reason naming the item that will route it. Expected-200 is *derived minus pending*. **The second assertion is what makes this honest:** every pending route must still 404, so the day one gets routed the suite fails and forces the entry out. Rejected: a plain skip, which never expires and which nobody would notice going stale.
- **The list is keyed by slug, not by route.** A slug covers both locales by construction, so adding a locale later needs no edit here (`P-13`).
- **`ROUTED_PAGE_SLUGS` and `INDEX_PAGE_SLUG` moved into the core.** They arrived duplicated — declared in the gateway and again in the smoke spec, with a comment rationalising the copy. Two declaration sites for one datum is criterion 4's exact prohibition, and the rationalisation was the tell. They now live in `route-set.mjs`, beside the derivation that consumes them, and both callers import them. Rejected: keeping the copy and trusting the comment.
- **`globalSetup` instead of Playwright's `webServer`.** Forced by the daemon finding below, not preferred on style.

## Findings from validating against real state (P-04)

**Three, and the first two are the reason `P-14` exists.**

**1 · The suite passed with the system under test removed.** The delivered config carried Playwright's default `reuseExistingServer: !process.env.CI`. A preview server left running from an earlier run was still on port 4321, so the first red path — `src/pages/index.astro` renamed out of the tree — returned **18 passed**. It was talking to a `dist/` built twenty minutes earlier. That is `T-02` stated exactly: a test that passes with the thing under test disabled is not that kind of test. Pinned to `false`, with the observation written at the line.

**2 · `astro preview` is a background daemon in this Astro version, and `webServer` cannot manage it.** It reports `(background)` without being asked and the parent process returns as soon as it has forked. Playwright's `webServer` manages a foreground process and treats an exit before the URL answers as a failure — so whether a run survived depended on whether the URL came up before Playwright noticed the exit. **Both outcomes were observed within one session:** the first full run passed 54/54, and the next four attempts died with `Process from config.webServer exited early`. `T-06` says a flake is a finding, not something to retry until green. The lifecycle now belongs to `globalSetup`, which stops any daemon, builds, starts one, and polls until it answers — and returns a teardown that stops it again. Deterministic, and it also stops the run leaking a daemon into the next one.

**3 · Five type errors reached the tree, all one root cause.** `astro check` was never run by the delegated slice — it was the step the run was cut off before reaching. Missing `@types/node`; installed, with `types: ["node"]` in `tsconfig.json`. Now 0 errors across 31 files. This is the second consecutive item where a delegated slice closed without `astro check` having run, which is worth naming as a pattern rather than an incident.

**A fourth, smaller:** the `docs.ignore` entry for `site/playwright.config.ts` went stale the moment the file appeared, exactly as its own reason predicted, and was removed. The self-staling property doing its job, reported by the guard rather than remembered.

## The delegation, and what it cost

One slice was delegated: three files, log-first, verification explicitly excluded from the brief and reserved for the orchestrator. **It was cut off anyway**, at 38 tool calls and ~64k tokens, with its final message reading *"Now let's run `npx astro check` first, then try building and running the playwright suite."*

That is the **seventh** specimen of the pattern `TASK 12` owns, and it is informative in a way the earlier six are not: this brief had already applied the mitigation. The work was excluded from proving itself, and the run still died on the sentence that begins the proof. All three files had landed and were of good quality. The cost was one orchestrator pass to verify — which found two defects that would have shipped a suite proving nothing.

**The datum for that item's re-measurement:** moving proof out of the brief did not prevent the cut; it changed what was lost from *the work* to *nothing*, because the orchestrator was watching. That is the same recoverable-when-supervised result `TASK 12` already records, now with the mitigation applied rather than absent.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["npx playwright test → 54 passed, 3 engines, 51.0s", "node --test site/lib/**/*.test.mjs → 43 pass 0 fail"] }
  mutation:   { status: passed, evidence: ["gate step 5 `mutation` PASS against break 74.5"] }
  ci:         { status: not_applicable, reason: "no remote exists yet; the workflow is unfiltered and inert until the publish item lands (T-10)" }
  security:   { status: not_applicable, reason: "no credential, no network egress, no new boundary — the suite reads local files and localhost" }
  docs:       { status: passed, evidence: ["check-docs PASS 56 documents, 201 references", ".claude/rules/30-testing.md sub-gate row corrected (G-11)"] }
  loose_ends: { status: passed, evidence: ["TASKS.md — site/ root file count at the S-03 cap; the astro check omission pattern"] }
  scope:      { status: passed, evidence: ["no artboard diff, no tolerance, no prod target — those stay with the fidelity-harness item"] }
  iterations: { status: passed, evidence: ["3"] }
```

`iterations` = 3: the delegated slice returning cut, the orchestrator's verification pass that found the stale-server and daemon defects, and the re-run that went green.

## Open questions

None blocking. One for the author to be aware of: `site/` now holds **6** files at its root, exactly `maxFilesPerDir`. The next root-level config file forces a split (`S-03`).

## Next

The home page item. Its spec is written and sits at `status: draft` awaiting the checkpoint, and its one prerequisite — the `order` field in the five case studies, both locales — is the author's to add, since `H-02` puts `resources/**` outside every agent's reach.

## Files changed

`site/playwright.config.ts` — new; `globalSetup` lifecycle, three browser projects, no `webServer`.
`site/tests/e2e/preview-lifecycle.ts` — new; owns the preview daemon deterministically.
`site/tests/e2e/routes.smoke.spec.ts` — new; routes derived from the content source, four assertions plus a vacuity guard.
`site/lib/content/routes/route-set.mjs` — `ROUTED_PAGE_SLUGS` and `INDEX_PAGE_SLUG` exported; one declaration site.
`site/src/gateway/content-queries.ts` — imports them instead of redeclaring.
`site/tsconfig.json` — `types: ["node"]`.
`site/package.json` — `@playwright/test`, `@types/node`, `test:e2e` script.
`scripts/gate.mjs` — step `e2e smoke`.
`scripts/guards/guards.config.json` — `site.pendingRoutes`; two scan exclusions; the stale playwright `docs.ignore` entry removed.
`.claude/rules/30-testing.md` — sub-gate command row corrected.
`.gitignore` — Playwright working output.
