# ADR-006: Testing toolchain — `node:test`, Stryker, Playwright

**Status:** Accepted
**Date:** 2026-08-19
**Context:** The last of TASK 7's six decisions. Fills five rows `.claude/rules/30-testing.md` has left deliberately blank since TASK 5: unit test runner, mutation tool + threshold, e2e runner, the gate's sub-gate commands, and integration test strategy. That file already fixes *where* TDD/mutation bite (`scripts/guards/**` and `site/lib/content/**` — frontmatter parsing, the slug join, `:::diagram` resolution, locale parity, term checking) and where e2e/build checks apply (rendered pages, both locales). This decision only fixes *which tools*. No `package.json` exists anywhere in the repository yet — whichever tools are chosen here are the first npm dependencies this repository carries, and `site/lib/content/**` itself does not exist yet (`TASK 8` hasn't broken down the site work).

## Options considered

### Unit test runner for `site/lib/content/**`, and Stryker's runner for it

**Corrected mid-review** (flagged, not hidden): the first draft of this ADR claimed no dedicated Stryker runner plugin exists for `node:test`. That was wrong. `@stryker-mutator/tap-runner` is official, current (v10.0.0, released 2026-08-14 — the same day as `@stryker-mutator/core` and the Vitest runner), and drives `node:test` via its built-in TAP reporter. It supports real coverage-based mutant filtering — coarser than the Vitest/Jest/Mocha runners' `perTest` mode (it filters at the *test-file* level, not per individual test — "Coverage is always recorded per test, which means that coverage is measured per test file"), but genuinely not the "re-run everything, every time" of the generic command runner. This changes the actual comparison:

| Option | Pros | Cons |
|---|---|---|
| **`node:test` + `tap-runner`** | One test-runner idiom across the whole mutation-covered surface; one Stryker config, one invocation (confirmed: Stryker's config schema has no multi-runner/multi-project support — `testRunner` is a single value, and a real attempt to mutate two packages from one config, filed against Stryker itself, went unresolved); real coverage-based mutant filtering, not the command runner's `off`-only mode; near-zero extra config (~6 keys) | File-level, not test-level, filtering — coarser than Vitest's; each test file runs in its own process, "can become slow when you have a lot of test files" at a scale this project isn't at yet |
| **Vitest, split from guards** | Astro's own docs give it first-party treatment (`getViteConfig()`); test-level (`perTest`) mutant filtering, the finest-grained mode Stryker offers | A second test-runner idiom alongside `node:test`; **confirmed** to require two separate Stryker config files and two separate `npx stryker run` invocations — not a documented multi-project mode, a real structural cost, not a hypothetical one |
| **`node:test` + Stryker's generic command runner** (the first draft's actual, mistaken, plan) | Zero extra runner dependency | No coverage analysis at all — reruns the entire suite per mutant. Superseded by the `tap-runner` option above, which keeps every advantage of staying on `node:test` while fixing this specific cost. Not carried forward as a real option once `tap-runner` was found |

**No benchmark number exists, from Stryker or anyone else, quantifying command-runner-vs-plugin speed at any scale** — the vendor docs describe the mechanism (full suite vs. filtered), never a multiplier, and the one GitHub report found (a 942-test suite projecting 72+ hours) had coverage analysis already disabled and no maintainer diagnosis, so it doesn't isolate the runner choice as the cause. Not treated as evidence either way (`C-01`).

**Whether `site/lib/content/**`'s actual code will need Vite's runtime to test meaningfully stays genuinely open** — Astro's testing docs discuss `getViteConfig()` only in the context of testing Astro *components*, never plain parsing/validation helpers; ADR-002 already committed that surface's frontmatter validation to Zod, a framework-agnostic library. This is a fact about code `TASK 8` hasn't written yet, not one research can resolve now — named as the review trigger below rather than guessed at.

### Mutation tool

Only one real candidate surfaced: **Stryker Mutator** (`@stryker-mutator/core`) — current (v10.0.0, released 2026-08-14, five days before this research), actively maintained, Node ≥ 22 (CI already runs Node 24). No competing JS/TS mutation tool was found as a genuine alternative.

### E2E runner

| Option | Pros | Cons |
|---|---|---|
| **Playwright** | Astro's own docs demonstrate the exact real-build-then-serve pattern this project's `T-02` requires (`webServer` config running `npm run preview` against a real `npm run build` output) — quoted directly, not inferred; three browser engines (Chromium, Firefox, WebKit) relevant for a public site on unknown reader devices | — |
| **Cypress** | Mature, well-documented tool in its own right | Astro's docs don't demonstrate the build-then-serve pattern for it as explicitly; browser-engine coverage is narrower (Chrome/Edge primary, no confirmed-current WebKit/Safari support) — this specific claim rests on secondary, SEO-comparison-site sources, not verified against Cypress's own docs, and is named as thin evidence rather than a settled fact |

**Eliminated:** Jest, as a unit-runner alternative — no advantage over Vitest specifically for an Astro/Vite project, would be a third idiom alongside `node:test`. Any client-side/headless-Mermaid e2e strategy — already foreclosed by ADR-002's zero-Mermaid-at-build-time decision.

## Decision

**Unit runner: `node:test`, for both `scripts/guards/**` and `site/lib/content/**`.** One idiom across the entire mutation-covered surface. Mutation testing that surface uses **Stryker's `tap-runner`**, not the generic command runner (a mistake in this ADR's first draft, corrected above) — one Stryker configuration, real coverage-based mutant filtering at the test-file level, and no second test-runner idiom. If `TASK 8` later reveals `site/lib/content/**` code genuinely coupled to Astro's Vite-powered content-collections loader (open per the research above), that specific module is the trigger to introduce Vitest for it alone — not a reason to move the whole surface preemptively, and not a cost this project is paying today for a problem it doesn't yet have.

**Mutation tool: Stryker Mutator with `@stryker-mutator/tap-runner`, `break: 100`** (not Stryker's own default `break: null`, i.e. non-enforcing). The threshold matches this project's own established convention — every mutation result reported by hand in `progress/` to date (TASK 8's 7/7, TASK 9's 3/3, TASK 10's 6/6, TASK 13's 11/11) is 100% mutant-kill, matching `T-04`'s standard that a guard's battery must fail when the guard is neutered. Stryker's ship defaults (`high: 80, low: 60`) are informational bands, not enforced thresholds, unless `break` is set — leaving it at the default would silently enforce nothing, the opposite of this project's practice.

**E2E runner: Playwright.** Astro's own documented pattern for it matches this project's own `T-02` rule word for word — a test that would still pass with the built site absent is not an e2e test, and Playwright's `webServer` config against a real `npm run build` is exactly that discipline, shown in Astro's docs rather than assumed.

**Gate sub-gate commands** (mechanical, once `site/` exists):

- Unit: `node --test "site/lib/content/**/*.test.mjs"` — same invocation shape `gate.mjs` already uses for guards.
- Mutation: `npx stryker run` — one config, `testRunner: "tap"`, covering `scripts/guards/**` and `site/lib/content/**` together.
- E2E: `npm run build && npx playwright test`.

**Integration test strategy: none — declared, not silently blank.** Playwright's e2e tier, running against a real `npm run build` output, already exercises the full pipeline wired together — Zod validation, diagram resolution, i18n routing, all as they run in production. A separate integration tier would test the same wiring the e2e tier already covers, without a concrete gap motivating it. `_threshold_rationale`-style logic applies to blank rows too: a row is left unfilled only with a stated reason, and this is that reason.

## Consequences

- **We gain:** one test-runner idiom across the entire mutation-covered surface; one Stryker configuration, one invocation; real (file-level) coverage-based mutant filtering instead of the full-suite-per-mutant cost the first draft of this ADR mistakenly accepted; a mutation threshold that matches what this project has actually been doing by hand since TASK 5, now enforceable instead of asserted; an e2e tier that Astro's own docs show wired to a real build, satisfying `T-02` by construction rather than by discipline.
- **We accept losing:** Vitest's finer-grained, per-test (not per-file) mutant filtering — a real but currently unmeasured gap, since no benchmark exists comparing the two at any scale, let alone this project's. Also: `tap-runner` spawns one process per test file, a documented limitation ("can become slow when you have a lot of test files") this project's current 19 guard test files don't exercise, but a future large `site/lib/content/**` suite might.
- **This creates a dependency on:** `TASK 15` ("Mutation gate, or an honest rung") — now unblocked, since it was waiting on exactly this decision. It wires Stryker into `gate.mjs` for real; this ADR decides the tool, runner and threshold, `TASK 15` makes the gate enforce it.

## Review trigger

If `site/lib/content/**`'s eventual code turns out to need Vite's runtime to test meaningfully (open question above — unknowable until `TASK 8` writes it), that is the trigger to introduce Vitest for that specific surface, accepting the two-config cost confirmed above only if the need is real, not preemptively. If `tap-runner`'s per-test-file process spawning becomes a measured bottleneck as the site's test-file count grows, that is a separate, independent trigger to reconsider the runner even without a Vite-coupling reason. If `break: 100` produces a genuine, irreducible equivalent-mutant case (a mutant no meaningful test could kill), record it as a named, reasoned exception at that mutant, not a lowered global threshold.

## Sources

Two researcher passes, this session, 2026-08-19 — the second specifically to quantify the `node:test`-vs-Vitest mutation-runner trade-off after the author questioned the first draft's unsupported claim. Official/vendor, fetched 2026-08-19: Astro docs *Testing*, *Content Loader API Reference*; Stryker Mutator docs *NodeJS guide*, *Configuration*, *Config file*, *Plugins*, *Tap Runner*, *Vitest Runner*; Stryker Mutator blog, *Announcing StrykerJS 7.0: Vitest and Tap test runner support* (published 2023-06-05, confirming `tap-runner` is not new); Stryker Mutator GitHub Releases (v10.0.0, 2026-08-14, all three packages — core, tap-runner, vitest-runner — same release day); npm registry metadata for `@stryker-mutator/core`, `@stryker-mutator/tap-runner`, `@stryker-mutator/vitest-runner`, `@playwright/test`, `cypress`. Independent: GitHub issues `stryker-js#2166` (multi-config attempt, unresolved) and `#3320` (slow-run report, no isolated cause), `stryker-net#2640` (multi-config feature request, open) — used only to confirm no multi-runner support exists, not for any performance number. Four SEO-comparison sites (bugbug.io, webfuse.com, thinksys.com, tech-insider.org) on Playwright-vs-Cypress browser-engine coverage, converging but not verified against Cypress's own docs — flagged as thin/secondary. Repository data (`D1`), read directly: `.claude/rules/30-testing.md`, `scripts/gate.mjs`, `.github/workflows/harness.yml` (Node 24), `progress/*.md` (the by-hand mutation-result convention), `docs/adr/ADR-002-content-pipeline.md`, confirmed no `package.json` exists anywhere yet.

**Evidence caveats carried forward:** Cypress's current WebKit/Safari support status was not independently verified against Cypress's own docs. No benchmark, vendor or independent, quantifies the command-runner-vs-plugin (or tap-runner-vs-Vitest-runner) speed difference at any scale — every claim about relative speed in this ADR is mechanism-level (what each runner can and cannot filter), never a measured multiplier. Whether `site/lib/content/**` needs Vite's runtime remains open, a fact about code that doesn't exist yet.
