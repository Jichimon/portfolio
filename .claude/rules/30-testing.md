---
paths:
  - "scripts/**"
  - "site/**"
  - "**/*.test.*"
  - "**/*.spec.*"
---

# Testing rules

The `T-*` surface. Path-scoped: these load when working on the guards, the site, or any test file — the only places they apply. Every other surface would carry them as noise.

## Where TDD and mutation actually bite

`D3` scoped both deliberately. Mutating render templates produces equivalent mutants and noise; parsing, joining and validating is real logic a mutant can break — and it is exactly where `INC-09` and `INC-10` lived.

```text
TDD + MUTATION      scripts/guards/**          the guards, incl. red paths
                    site/lib/content/**        frontmatter parsing, the i18n slug join,
                                               :::diagram resolution, locale parity,
                                               term checking
COMPONENT + DOM     site behaviour modules     scroll-spy tracking, theme persistence;
                    Preact islands             any island, once one exists.
                                               NOT mutation-covered - see the row below
E2E + BUILD         rendered pages             both locales, links, metadata
```

The component tier is the newest and the one whose boundary is easiest to get wrong. It exists because that code needs a **DOM**, which `node:test` does not provide and a full-page e2e run is the wrong instrument for. `.astro` components are **not** in it: the build renders them, and the design-fidelity diff and Playwright already assert them against a real build.

## TDD is policy by work-item type, not a universal invariant

| type | TDD | Form |
|---|---|---|
| `harness` (guards) | **required** | red → green → refactor, including the red-path battery |
| `feature` touching the mutation-covered surface | **required** | red → green → refactor |
| `bugfix` in that surface | **required** | the failing test must **reproduce the bug** before the fix. A bugfix with no reproducing test is not done |
| `migration` | **required** where it touches that surface | as above |
| `refactor` | **not applicable** | tests must exist and pass before *and* after. Adding a test is not what makes it a refactor |
| `content` · `research` · `planning` · `documentation` · `configuration` | **not applicable** | declared out loud, per `P-03` |

Stated as a universal rule it would be disbelieved on its first content item — and `content` is the type of every completed work item in this repository to date. One disbelieved rule discredits the registry.

## The rules

| id | rule | rung | origin |
|---|---|---|---|
| **T-01** | **TDD by work-item type**, per the table above. The universal part is narrower and survives: **no production behavior in the mutation-covered surface ships without a test that fails before it.** | 4 · 2 where the mutation gate covers it | A23 · D3 |
| **T-02** | **A test that would still pass with the system under test disabled is not that kind of test.** If an "end-to-end" test passes with the server off, it is not an end-to-end test. | 4 | **INC-02** · fifteen "e2e" tests mocked every HTTP call and stalled the realtime handshake. They passed. They proved nothing |
| **T-03** | **The mutation gate covers the surfaces above, and a surviving mutant is a finding** — not a statistic to average away. A surviving mutant is *observable proof* that a test proves nothing, which is the mechanized answer to `T-02`. | 2 | INC-02 · D3 |
| **T-04** | **Every guard ships with a red-path battery** exercising each bypass its author can think of, and the battery must fail when the guard is neutered. | 2 | INC-07 · `P-14` |
| **T-05** | **Risk-based, not coverage-based.** Few things tested, those exhaustively. A test earns its place where a bug is both likely and costly. A coverage percentage is a number about the suite, not about the risk. | 4 | existing practice |
| **T-06** | **A flake is a finding.** Do not retry until green and move on. Intermittent means a real race, a real timing assumption, or a real ordering bug. | 4 | INC-02 |
| **T-07** | **Assert what the user observes**, not what the implementation happens to do. A test coupled to internals passes through the refactor that breaks the feature. | 4 | existing practice |
| **T-08** | **Test placement is fixed by kind:** unit and component tests colocated with the code; end-to-end tests in one dedicated directory. Not negotiable per-author. | 4 | existing practice |
| **T-09** | **The gate is one command and is CI parity.** It **delegates** to sub-gates rather than re-listing their steps — otherwise a step added to a sub-gate is silently absent from the gate, and the local run verifies less than CI does. | 2 | INC-08 |
| **T-10** | **A green local gate is not evidence that CI fired.** Read the real run result from the provider. | 4 | **INC-08** · two path-filtered workflows meant a repo-root guard ran in CI exactly zero times, invisibly |

## Stack-dependent rows — decided by `ADR-006`, extended by its 2026-08-23 amendment

| Question the stack must answer | Answer |
|---|---|
| Unit test runner and invocation | `node:test`, for both `scripts/guards/**` (already true) and `site/lib/content/**`. `node --test "scripts/guards/**/*.test.mjs"` · `node --test "site/lib/content/**/*.test.mjs"` |
| Mutation tool, threshold, and the `_threshold_rationale` if it differs from the tool's default | Stryker Mutator (`@stryker-mutator/core`) with `@stryker-mutator/tap-runner` (drives `node:test` via TAP, one config for the whole mutation-covered surface). `break: 100` — Stryker's own default (`high: 80, low: 60, break: null`, non-enforcing) is looser than this project's established by-hand convention: every mutation result reported in `progress/` since TASK 5 is 100% mutant-kill, matching `T-04`'s "the battery must fail when the guard is neutered". **The component tier is deliberately outside this surface** — `D3` scoped mutation to parsing, joining and validating, and covering a Vitest surface needs a second Stryker config and a second invocation, the cost `ADR-006` priced and declined. A reasoned answer, not a blank |
| Component test runner and invocation | **Vitest** with **`@testing-library/preact`** in a **`jsdom`** environment, configured through `getViteConfig()` from `astro/config`. `npx vitest run`. Covers DOM-requiring behaviour modules (the scroll-spy, the theme toggle) and Preact islands once one exists; **not** `.astro` components. `@testing-library/preact` rather than `@testing-library/react` through `compat`, because that is what Preact's own testing guide installs. `jsdom` because Preact's guide names it for non-Jest runners — Astro's docs are silent on the choice |
| **Both unit runners are explicitly scoped; neither uses default discovery** | Node's auto-discovery matches `**/*.test.{cjs,mjs,js}` and Vitest's default `include` is `['**/*.{test,spec}.?(c\|m)[jt]s?(x)']`. **They overlap**, and neither project's docs mention the other. Each runner is handed an explicit, disjoint scope. The extension alone cannot separate them, since Vitest's default matches `.test.` and `.spec.` equally |
| E2E runner, and what "real" means for this stack (real browser, real build, real filesystem) | Playwright. "Real" is Astro's own documented pattern: `npm run build` then `webServer` serves the actual output via `npm run preview` — never a mock, matching `T-02` by construction. Three real browser engines (Chromium, Firefox, WebKit) |
| The gate's sub-gate commands | `node --test "site/lib/content/**/*.test.mjs"` · **`npx vitest run`** · `npx stryker run` (`testRunner: "tap"`, one config, both `node:test` surfaces — **not** the Vitest tier) · `npm run build && npx playwright test` |
| Integration test strategy, if any | None — declared, not blank. Playwright's e2e tier already runs against a real build, exercising the full pipeline (validation, diagram resolution, i18n routing) wired together exactly as production does; a separate tier would duplicate that coverage without a named gap |

**Still open, and narrower than it was:** whether `site/lib/content/**`'s eventual code needs Astro's Vite-powered runtime to test meaningfully. That code still does not exist, so `ADR-006`'s review trigger has **not** fired and this row stays open exactly as written — the 2026-08-23 amendment introduced Vitest for a *different* surface (components, which need a DOM), not for this one. If `site/lib/content/**` does turn out to need Vite, it moves to the Vitest tier and a second Stryker config gets priced then, not now.

**Answered by not answering, each with its reason stated:** the integration tier, above — none, because the e2e tier already exercises the same wiring against a real build. And component-tier mutation coverage — none, because of `D3`'s scoping and the two-config cost. A blank row with a reason is a legitimate answer; a speculative one is worse than nothing.

Full reasoning, options considered and sources: [docs/adr/ADR-006-testing-toolchain.md](../../docs/adr/ADR-006-testing-toolchain.md), whose 2026-08-23 amendment adds the component tier, and [docs/adr/ADR-007-ui-component-model.md](../../docs/adr/ADR-007-ui-component-model.md), which decides what the site is built from.
