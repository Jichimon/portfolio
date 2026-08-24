# ADR index — mandatory entry point

**Read this before any ADR.** An ADR is almost never refuted wholesale; it is amended point by point. Consulting one without this index risks applying a decision a later point already overturned — which is a defect, not a style issue. Citing a refuted decision is itself a finding (`P-07`).

TASK 7 writes the founding set: site stack, hosting and deploy, i18n strategy, content pipeline, testing toolchain, publication. **6 of 6 accepted — TASK 7 closed 2026-08-19.**

`TASK 33` adds the seventh on 2026-08-23 — the UI component model — and amends the testing toolchain in the same change. `TASK 35` adds the eighth on 2026-08-24 — how the implementation tree is arranged. It was the first ADR to sit in this index **before** being accepted, so it was findable while it was still a proposal rather than only after; accepted the same day. **The level-2 table below stopped being empty on that date**, so the three-part discipline it describes is now load-bearing rather than theoretical.

## Level 1 — status of each ADR

**States:** `Current` · `Current-with-amendments` (still standing, some points amended — see level 2) · `Superseded by ADR-<NNN>` (refuted in full).

| ADR | Title | Date | Status |
|---|---|---|---|
| [ADR-001](ADR-001-site-stack.md) | Site stack — Astro, static output | 2026-08-19 | `Current` |
| [ADR-002](ADR-002-content-pipeline.md) | Content pipeline — frontmatter validation and diagram resolution | 2026-08-19 | `Current` |
| [ADR-003](ADR-003-i18n-strategy.md) | i18n strategy — unprefixed English, `/es/` Spanish | 2026-08-19 | `Current` |
| [ADR-004](ADR-004-hosting-deploy.md) | Hosting and deploy — Cloudflare Workers, static assets | 2026-08-19 | `Current` |
| [ADR-005](ADR-005-publication.md) | Publication — public GitHub remote, now, whole repository | 2026-08-19 | `Current` |
| [ADR-006](ADR-006-testing-toolchain.md) | Testing toolchain — `node:test`, Stryker (`tap-runner`), Playwright | 2026-08-19 · amended 2026-08-23 | `Current-with-amendments` |
| [ADR-007](ADR-007-ui-component-model.md) | UI component model — `.astro` by default, Preact for islands, zero islands today | 2026-08-23 | `Current` |
| [ADR-008](ADR-008-site-implementation-architecture.md) | Site implementation architecture — framework-free core, Astro gateway, content as the only source of copy, and how the code reads | 2026-08-24 · amended 2026-08-24 | `Current-with-amendments` |

## Level 2 — amendments, point by point

An amended point does **not** invalidate the whole ADR — only that point.

| Verb | Meaning | Marked inline in the ADR? |
|---|---|---|
| ↪️ **Extended** | Still valid; another document expands it | No — the point stands as written |
| ✏️ **Amended** | Changed in part; its old form no longer applies | Yes |
| ⛔ **Refuted** | No longer in effect (the rest of the ADR stands) | Yes |
| 🔁 **Superseded** | The entire ADR was replaced | Yes |

| ADR · § | What the point said | Verb | Superseded by | Date |
|---|---|---|---|---|
| [ADR-006](ADR-006-testing-toolchain.md) · Decision, Review trigger | Two tiers: `node:test` for content logic, Playwright for e2e. Vitest enters only if `site/lib/content/**` turns out to need Vite. Nothing decided about testing a component | ✏️ **Amended** | [ADR-006 § Amendment · 2026-08-23](ADR-006-testing-toolchain.md#amendment--2026-08-23--the-component-test-tier) — a third tier, Vitest + `@testing-library/preact` in `jsdom`, for DOM-requiring behaviour modules and Preact islands. The named trigger has **not** fired; its *policy* is what governs. Mutation coverage unchanged | 2026-08-23 |
| [ADR-008](ADR-008-site-implementation-architecture.md) · Sub-decision 6 | *"root — `start` and `test` only, and no dependencies"*, carried into `S-07` as a rule | ✏️ **Amended** | [ADR-008 § Amended 2026-08-24](ADR-008-site-implementation-architecture.md) — Stryker's sandbox is rooted at the working directory, so one config covering both mutation surfaces can only live at the root. The rule becomes *only tools whose configuration must live at the repository root to function*. **This row was missing until 2026-08-24**: the amendment was written inline and the index was never reconciled — `P-07`'s characteristic failure, found by the next session rather than by the one that caused it | 2026-08-24 |
| [ADR-001](ADR-001-site-stack.md) · Decision | *"whether any specific piece of the site's UI should be a React island, plain CSS/JS, or a View Transition — that is a design decision for TASK 8"* | ↪️ **Extended** | [ADR-007](ADR-007-ui-component-model.md) — the deferral is answered, not overturned. `TASK 8` closed without recording it; `TASK 33` did. No inline mark and no status change: the point deferred a decision rather than asserting something now false | 2026-08-23 |

## How to keep this alive

**Three parts, all load-bearing.** When amending or refuting a point: add the level-2 row (so the amendment is findable), adjust the level-1 status (so a reader knows to look), and add the **inline annotation at the exact paragraph** of the affected ADR (so someone reading it top to bottom cannot miss it).

The characteristic failure is doing the first and skipping the other two. That is why `P-07` requires re-reading after reconciling: *reconciling and checking you reconciled are different acts, and only the second produces evidence.*

At wrap-up, audit that no point refuted during the work was left unmarked.
