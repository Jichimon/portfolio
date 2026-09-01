# ADR-006: Testing toolchain — `node:test`, Stryker, Playwright

**Status:** Accepted
**Date:** 2026-08-19 · amended 2026-08-23, 2026-08-24 (×2), 2026-09-01
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

> ✏️ **Amended 2026-08-23** — see [the component test tier](#amendment--2026-08-23--the-component-test-tier) below. This paragraph still stands for `site/lib/content/**`, which remains on `node:test`. What it did not contemplate is a **component** surface, which needs a DOM rather than Vite. Vitest now enters for that surface, and for it only.

**Mutation tool: Stryker Mutator with `@stryker-mutator/tap-runner`, `break: 100`** (not Stryker's own default `break: null`, i.e. non-enforcing). The threshold matches this project's own established convention — every mutation result reported by hand in `progress/` to date (TASK 8's 7/7, TASK 9's 3/3, TASK 10's 6/6, TASK 13's 11/11) is 100% mutant-kill, matching `T-04`'s standard that a guard's battery must fail when the guard is neutered. Stryker's ship defaults (`high: 80, low: 60`) are informational bands, not enforced thresholds, unless `break` is set — leaving it at the default would silently enforce nothing, the opposite of this project's practice.

**E2E runner: Playwright.** Astro's own documented pattern for it matches this project's own `T-02` rule word for word — a test that would still pass with the built site absent is not an e2e test, and Playwright's `webServer` config against a real `npm run build` is exactly that discipline, shown in Astro's docs rather than assumed.

> ✏️ **Amended 2026-09-01** — see [the amendment below](#amendment--2026-09-01--e2e-narrowed-to-chromium-for-ci). Playwright itself is unchanged; the **three-engine matrix** named in the options table above as a reason to prefer it over Cypress is narrowed to Chromium for the CI-blocking gate, on real evidence rather than a guess.

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

> ✏️ **Amended 2026-08-23** — the first of these three triggers has **not** fired: whether `site/lib/content/**` needs Vite is still open, because that code still does not exist. What fired instead was the policy this trigger established — *introduce Vitest when the need is real, never preemptively* — applied to a surface this ADR never contemplated. See [the component test tier](#amendment--2026-08-23--the-component-test-tier) below.

## Amendment · 2026-08-23 — the component test tier

**Verb: ✏️ Amended.** The decisions above stand; this adds a third tier they did not contemplate. Raised by `TASK 33`, alongside `ADR-007`, which decides what the site is built from — this decides how that thing is tested. Indexed in `docs/adr/README.md` level 2.

### What this ADR did not decide, stated accurately

The register that opened `TASK 33` described this amendment as *"`ADR-006`'s own review trigger firing."* That is not quite true, and the accurate version matters, because a document that overstates its own continuity is one nobody can navigate later.

This ADR's written trigger is about **`site/lib/content/**` needing Vite**. This amendment is about **components needing a DOM**. Those are adjacent propositions, not the same one. `site/lib/content/**` still does not exist, so that trigger has not fired and stays open exactly as written.

What this ADR *did* establish, and what genuinely governs here, is a **policy**: introduce Vitest when the need is real, accepting the two-config cost *"only if the need is real, not preemptively."* The need is now real — for a surface this ADR never considered, because when it was written nothing had decided whether the site would have components with behaviour at all. `ADR-007` decided that on 2026-08-23.

### The gap, concretely

`ADR-001` and `ADR-007` between them put the site's client-side behaviour in plain modules rather than in framework components: the scroll-spy's current-section tracking, and the theme toggle's persistence and its resolve-before-first-paint requirement. **Both are real logic, and both need a DOM to test at all.** `node:test` provides no DOM. Playwright provides a real browser, but a full-page e2e run is the wrong instrument for *"given these section offsets and this scroll position, which entry is current"* — it is slow, it couples the assertion to a rendered page, and when it fails it does not say which of the two is broken.

That is a gap between the two tiers this ADR decided, and nothing currently covers it.

### Decision

**A third tier: Vitest with `@testing-library/preact`, in a `jsdom` environment.**

| Question | Answer |
|---|---|
| **What it covers** | DOM-requiring behaviour modules — the scroll-spy, the theme toggle — and Preact islands, once one exists. `ADR-007` puts the island count at zero today, so the tier's day-one subject is the behaviour modules, and it is not idle |
| **What it does not cover** | `.astro` components. They are rendered by the build, and the design-fidelity harness diffs them against their artboards while Playwright exercises them in a real browser against a real build. A third thing asserting the same markup would duplicate that coverage without a named gap — the same reasoning that left the integration tier blank above |
| **Testing Library flavour** | `@testing-library/preact`, **not** `@testing-library/react` aliased through `compat`. This is what Preact's own testing guide installs, and that guide does not treat `compat` as changing the answer |
| **DOM environment** | `jsdom`. Astro's testing documentation is **silent** on `jsdom` vs `happy-dom` vs Vitest's browser mode — a genuine silence, not a recommendation to read between the lines of. `jsdom` is chosen because Preact's own testing guide names it for non-Jest runners, which is a sourced reason rather than a preference |
| **Vitest configuration** | Through `getViteConfig()` from `astro/config` — Astro's documented way *"to set up Vitest with your Astro project's settings"*, which is what makes the `compat` JSX transform work in tests without a second copy of that configuration. Astro's docs do **not** say whether a plain behaviour module needs it; it is used anyway because it costs nothing and removes a second declaration site |
| **Mutation coverage** | **No — and this is a decision, not an omission.** See below |
| **Placement** | Colocated with the code, per `T-08`. Unchanged by this amendment; recorded so the silence is not read as an oversight |

### Both runners are explicitly scoped, and neither uses default discovery

This is the finding that would otherwise have been discovered by a confusing failure months from now. **Node's and Vitest's default test-file globs overlap**, and neither project's documentation mentions the other, so nothing warns you:

- Node's auto-discovery — which applies only when `node --test` is given no glob argument — matches `**/*.test.{cjs,mjs,js}`.
- Vitest's default `include` is `['**/*.{test,spec}.?(c|m)[jt]s?(x)']`.

Both match an ordinary `*.test.mjs`. This repository has avoided the collision so far by accident of the invocation shape this ADR already chose — an explicit glob passed to `node --test`. That is now a **stated rule rather than a lucky habit**: each runner is given an explicit, disjoint scope, and neither is allowed to discover files on its own. Note that the separation cannot come from the file extension alone, since Vitest's default matches `.test.` and `.spec.` equally; it comes from the scope each runner is handed.

### Mutation stays one config, and the component tier is outside it

`break: 100` on `@stryker-mutator/tap-runner` over `scripts/guards/**` and `site/lib/content/**` is **unchanged**. The new tier is deliberately not mutation-covered, for two reasons that were already established rather than invented here:

- **`D3` scoped mutation on purpose** — to parsing, joining and validating, which is real logic a mutant can break. It excluded render-shaped code because mutating it produces equivalent mutants and noise.
- **This ADR already priced the alternative.** Covering a Vitest surface means `@stryker-mutator/vitest-runner`, and Stryker has no multi-runner support — a fact confirmed above, against Stryker's own configuration schema. That is a second config file and a second `npx stryker run`, both wired into the single test command. This ADR declined that cost when the question was `site/lib/content/**`, and the reasoning does not change because the surface does.

**The honest counter-argument, recorded rather than suppressed:** the scroll-spy's *"which section is current"* logic is genuinely closer to `D3`'s protected category than to a render template, and a case could be made for covering it. It is not covered, and the reason is cost rather than principle. If a scroll-spy defect ever ships that a mutant would have caught, that is the trigger below firing, and this paragraph is what should be re-read.

### The sub-gate command

Alongside the three this ADR already names, and reaching the gate by delegation rather than by being re-listed (`T-09`):

- Component / behaviour: `npx vitest run`

### Consequences of this amendment

- **We gain:** coverage of the one surface that had none — client-side behaviour that needs a DOM — with an instrument that fails informatively, at a tier below a full-page e2e run. And an explicit scoping rule between the two unit runners, decided before it could bite.
- **We accept losing:** a second test-runner idiom, in a repository that deliberately had one. That was the exact cost this ADR weighed and declined in August, and it is accepted now because the alternative is worse: without it, the scroll-spy and the theme toggle are asserted only through a rendered page, which is testing internal behaviour through a surface that was never meant to carry it. We also accept that the component tier sits outside the mutation gate, so `T-03`'s guarantee does not extend to it — stated plainly rather than left for someone to infer from a config file.
- **This creates a dependency on:** the Astro skeleton item, which installs Vitest and writes the config; and on the mutation-gate item, which must scope the Stryker glob so it does not reach the new tier.

### Review trigger for this amendment

- **A component-tier test asserts internal structure rather than what the reader observes.** That is `T-07`'s failure, and the tier was justified on `T-07`'s grounds — so it fires against the tier's own reason for existing.
- **A defect in the scroll-spy or the theme toggle reaches the localhost milestone that a surviving mutant would have caught.** That is the trigger to re-open the mutation question above and pay the two-config cost, with a real incident behind it rather than a preference.
- **`jsdom` diverges from real browser behaviour on something the site depends on** — most plausibly around scroll or intersection APIs, which is precisely what the scroll-spy uses. That is the trigger to reconsider Vitest's browser mode for this tier, and it is a foreseeable one rather than a hypothetical.

### Sources for this amendment

One researcher pass, 2026-08-23, the same pass that sourced `ADR-007`. Official/vendor, fetched 2026-08-23: Astro docs *Testing* (the `getViteConfig()` quote, and the silence on DOM environments — confirmed on two separate fetches with targeted prompts rather than inferred from one); Vitest docs *Environment* (`'node' | 'jsdom' | 'happy-dom' | 'edge-runtime'`, default `'node'`) and *include* (the default glob); Preact's *Preact Testing Library* guide (the `@testing-library/preact` install command, and *"this library relies on a DOM environment being present"* with `jsdom` named for non-Jest runners); Node.js *Test runner* documentation, v26.7.0 (the default discovery globs); npm registry metadata and GitHub Releases for `vitest` (`4.1.11`, published 2026-08-18) and `@testing-library/preact` (`3.2.4`).

**Evidence caveats.** Preact's testing guide does not name Vitest anywhere — its applicability here rests on Vitest supporting the same `environment: 'jsdom'` setting Vitest's own docs describe, which is an inference across two vendors rather than a claim either makes. The glob-overlap finding is likewise **derived** by comparing two separately-documented defaults; neither project documents the other, and no vendor asserts a conflict. Whether `@testing-library/preact` needs a manual cleanup call is documented in neither Preact's guide nor the package's README — a genuine absence, and one the first component test will settle rather than something to guess at now.

## Amendment · 2026-08-24 — the threshold was aspirational, and the first real run said so

**Verb: ✏️ Amended.** The tool, the runner and the surface are unchanged. One number is.

`TASK 15` wired `npx stryker run` into `gate.mjs` and ran it over the whole mutation-covered surface for the first time. **It scored 74.35%** — 3,532 mutants across 20 files, 2,605 killed, 21 timed out, **771 survived**, 135 with no coverage at all, in 2 minutes 32 seconds on 11 concurrent runners.

**Where `break: 100` came from, and why it was wrong without anyone being wrong.** This ADR justified 100 on the grounds that *"every mutation result reported by hand in `progress/` to date … is 100% mutant-kill."* That statement was and remains true. What it does not support is the inference drawn from it: each of those batteries was applied by hand to *the code that session was changing*, and each really was 100% of that. None of them was ever a measurement of the surface, and nothing in the harness could tell the difference between "this module's battery is complete" and "every module's battery is complete". That gap is precisely what mechanizing the gate exposed on its first run — which is the gate paying for itself before it had finished being built.

**`break` is now `74`, a ratchet rather than a goal.** The score may not fall; every point it rises cannot be lost again. Raising it to 100 is `TASK 38`. `30-testing.md`'s `T-03` row carries the honest split: rung 2 for *the score may not fall*, rung 4 for *a surviving mutant is a finding*, until the floor reaches 100.

**Two decisions taken during triage, recorded so they are not re-derived:**

- **No wholesale mutator exclusions**, although `Regex` (218) and `StringLiteral` (215) together are 56% of the survivors and excluding both would have closed most of the gap in one config line. `INC-13` in this repository was a guard whose regex arrived on disk with literal control bytes and *could never match*, invisible across four inspections — a surviving `Regex` mutant is exactly that signal. And a mutated string literal inside `git-write.mjs` or `path-boundary.mjs` is a mutated boundary path, not mutated prose. The noise is real; blinding the gate to the two mutators with the strongest local incident behind them is not how to remove it.
- **`scripts/guards/gate/**` and `hooks/**` are outside the mutate glob**, and the run produced independent evidence for it rather than the other way round: `scripts/guards/gate/check-terms.test.mjs` covered **zero** mutants, because it drives the CLI in a child process and instrumented coverage never returns.

**This ADR's open benchmark question now has a data point.** It states outright that no benchmark exists, from Stryker or anyone else, quantifying `tap-runner` at any scale. This repository now has one measured number: 3,532 mutants over 2,786 lines in 152 seconds, `perTest` coverage analysis, 1.03 tests per mutant on average. It is one project on one machine and is offered as exactly that.


## Amendment · 2026-08-24 — the surface was named as one directory, and the core is not one directory

**What this ADR wrote, and what it meant.** Every row above names the mutation-and-unit surface `site/lib/content/**`. On 2026-08-19 that was not a narrowing — it was the whole of the core as anyone had imagined it, written before `ADR-008` existed and before a single file under `site/` did. The intent was *the framework-free core*; the spelling was *one of its directories*.

**The two stopped being the same thing on 2026-08-24.** `ADR-008` fixed the tree and named two more directories beside it — `site/lib/nav/` for nav structure and `site/lib/i18n/` for locale URLs — and `S-06` scopes the framework-free guarantee to **the whole of `site/lib/**`**. So the repository carried one surface with two boundaries: a rule describing the core, and four globs describing a subfolder of it.

**Nothing had gone wrong yet, and that is the point.** The content-layer item put everything it wrote under `content/`, including a link localizer that arguably belongs in `i18n/` — the cheap choice for one item, and not one the layout-shell item can repeat, because `ADR-008` names where the nav module lives. The day the first file landed in a sibling directory it would have been outside the gate step and outside the mutation run, **silently**. That is `INC-08`'s shape — *a check that exists and does not check* — arriving through a glob instead of through a path filter.

**The fix, and its proof.** All four globs now read `site/lib/**`: the unit-runner row and the sub-gate row in `30-testing.md`, the gate step's command, and Stryker's `mutate` and `tap.testFiles`. The gate step is renamed `site core tests` and its `skipIf` guards `site/lib` rather than `site/lib/content`, so a checkout without the core still declares the gap out loud instead of passing on nothing.

Proven in red rather than reasoned about, which is the only form that distinguishes this from the claim it is correcting: a deliberately failing test was planted in a sibling directory under the core. **The old glob exited 0 — green, with a failing test sitting in the tree.** The widened glob exited 1 and printed it. The planted file was then removed and the suite re-run green.

**The first review trigger has fired and resolved, in the negative.** This ADR left open whether the core's eventual code would need Vite's runtime to test meaningfully, and said the question was unanswerable because that code did not exist. It exists now: four modules and 26 tests, every one running under plain `node --test` with no Astro in the import graph — which is what the gateway pattern was built to make possible. **Vitest is not introduced for this surface, and the second Stryker config stays declined.** The trigger is not deleted; it is simply no longer a question about code nobody has written.

**What this amendment deliberately does not do.** It does not re-measure `break`. A wider `mutate` glob is a new denominator, so the floor recorded in the 2026-08-24 threshold amendment is stale from the moment these globs change — but the layout-shell item lands two more mutated guard functions in the same stretch of work, and measuring twice would price two intermediate denominators nobody will ever use. The number is re-measured once, against the run that follows all of it, with the measurement written beside it. Recorded here rather than left implicit, because a stale threshold that nobody flagged is indistinguishable from one nobody noticed.

## Amendment · 2026-09-01 — E2E narrowed to Chromium for CI

**What this ADR decided, and what it did not.** The options table above named "three browser engines (Chromium, Firefox, WebKit) relevant for a public site on unknown reader devices" as a reason to prefer Playwright over Cypress — a real property of the *tool*, not a commitment to run all three on every push. `30-testing.md`'s stack table read it as the latter: *"Three real browser engines"* as what `e2e smoke` runs in CI. Nobody had priced that against a shared CI runner, because CI was inert until `TASK 30` published the remote.

**Measured, not assumed, the first time it could be.** `TASK 106`'s first real push (`059a7e5`) ran the gate for the full 6-hour GitHub Actions default and was cancelled with no diagnostic output — a separate defect, fixed by streaming the gate's output live (`TASK 107`). The **second** real run, with that fix in place and a 90-minute job timeout as an explicit bound, gave the first actual evidence: `guard tests` (1050 `node:test` cases) finished in ~2 seconds, then **89 minutes of silence** across `site core tests`, `component tests`, `type check` and `e2e smoke`, ending in cancellation. At cleanup, GitHub listed an orphan process it had to kill: `npm exec astro preview` — spawned only by `e2e smoke`'s `globalSetup`, after `astro build` had already completed. `mutation` (Stryker) never started; its incremental-cache save step found no file to save. So the step still running at 89 minutes, provably, was `e2e smoke` — not `mutation`, which every prior estimate in this repository (including this ADR's own) had assumed would dominate, on the strength of local measurements taken with Stryker's default concurrency at 11 (12 local cores). GitHub's standard `ubuntu-latest` runner reports 2 cores, so Stryker itself would run at concurrency 2 there — slower, but that comparison turned out not to be the one that mattered first.

**The decision.** `e2e smoke`'s blocking CI run narrows from three browser engines to one — Chromium. `T-05` ("risk-based, not coverage-based... a test earns its place where a bug is both likely and costly") applies directly: this is a content-heavy, largely static site built from one markdown pipeline, not an application with browser-specific interactive logic: Firefox- or WebKit-specific rendering defects are a real but low-probability risk for this shape of output, and the cost of checking for them on every push — three engines' worth of process launches on a 2-core shared runner — was disproportionate before anyone had measured it.

**What is accepted, stated rather than left implicit (`C-11`).** Firefox and WebKit-specific rendering defects are no longer caught automatically by the blocking gate. `playwright.config.ts`'s `projects` array is exactly where to restore either or both if a real defect specific to one of them is ever found — that is the trigger, not a calendar date.

**What is not yet known.** Whether Chromium alone brings the gate comfortably under a sane bound, or whether `mutation` (never yet reached in a real CI run) is a second, independent cost once `e2e smoke` stops absorbing the whole 90-minute budget. That is `TASK 108`'s own open question, not assumed here.

## Sources

Two researcher passes, this session, 2026-08-19 — the second specifically to quantify the `node:test`-vs-Vitest mutation-runner trade-off after the author questioned the first draft's unsupported claim. Official/vendor, fetched 2026-08-19: Astro docs *Testing*, *Content Loader API Reference*; Stryker Mutator docs *NodeJS guide*, *Configuration*, *Config file*, *Plugins*, *Tap Runner*, *Vitest Runner*; Stryker Mutator blog, *Announcing StrykerJS 7.0: Vitest and Tap test runner support* (published 2023-06-05, confirming `tap-runner` is not new); Stryker Mutator GitHub Releases (v10.0.0, 2026-08-14, all three packages — core, tap-runner, vitest-runner — same release day); npm registry metadata for `@stryker-mutator/core`, `@stryker-mutator/tap-runner`, `@stryker-mutator/vitest-runner`, `@playwright/test`, `cypress`. Independent: GitHub issues `stryker-js#2166` (multi-config attempt, unresolved) and `#3320` (slow-run report, no isolated cause), `stryker-net#2640` (multi-config feature request, open) — used only to confirm no multi-runner support exists, not for any performance number. Four SEO-comparison sites (bugbug.io, webfuse.com, thinksys.com, tech-insider.org) on Playwright-vs-Cypress browser-engine coverage, converging but not verified against Cypress's own docs — flagged as thin/secondary. Repository data (`D1`), read directly: `.claude/rules/30-testing.md`, `scripts/gate.mjs`, `.github/workflows/harness.yml` (Node 24), `progress/*.md` (the by-hand mutation-result convention), `docs/adr/ADR-002-content-pipeline.md`, confirmed no `package.json` exists anywhere yet.

**Evidence caveats carried forward:** Cypress's current WebKit/Safari support status was not independently verified against Cypress's own docs. No benchmark, vendor or independent, quantifies the command-runner-vs-plugin (or tap-runner-vs-Vitest-runner) speed difference at any scale — every claim about relative speed in this ADR is mechanism-level (what each runner can and cannot filter), never a measured multiplier. Whether the site core needs Vite's runtime was open when this ADR was written, as a fact about code that did not exist yet; it was **closed in the negative on 2026-08-24**, once the code existed — see the amendment above.
