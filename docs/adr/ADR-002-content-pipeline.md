# ADR-002: Content pipeline — frontmatter validation and diagram resolution

**Status:** Accepted
**Date:** 2026-08-19
**Context:** Builds on ADR-001 (Astro, static output — Accepted). Two concrete questions ADR-001 deferred: whether Astro's content-collections schema duplicates `check-content` (already in the gate, validating the same frontmatter shape), and how `:::diagram{id="X" type="Y"}` resolves to `/diagrams/{id}.svg` given today's asset is always a Mermaid `.mmd` placeholder (TASK 1) but TASK 6 will replace assets one `id` at a time with hand-authored `.svg` files, without the directive syntax ever changing.

## Sub-decision 1 — Frontmatter validation

### Options considered

| Option | Pros | Cons |
|---|---|---|
| **A. Full Zod schema mirroring `check-content`** | Astro-side type safety and editor autocomplete for every frontmatter field; a second, independent check that fires at `astro build`/`dev` time | Two hand-synced implementations of one rule (JSON `guards.config.json` vs. TypeScript Zod) — exactly the drift risk ADR-001's Review Trigger already named |
| **B. No schema at all (loader with no `schema` key)** | Zero duplication; `check-content` genuinely becomes the single source of truth | No build-time signal if frontmatter is wrong — Astro renders `undefined` silently into templates; `check-content` only catches it if someone runs the gate |
| **C. Minimal schema — the 5 universal keys only, `.passthrough()` for the rest** | Type safety for exactly the fields every template needs to route/render on (`slug`, `lang`, `type`); the volatile, type-conditional part (`subtitle`, `stack`, `skills`, …) stays owned by `check-content` alone, so the only duplicated surface is the part that essentially never changes | Still two places asserting *something*, even if the overlap is small and deliberately chosen |

### Decision — Option C

The five universal keys (`slug`, `lang`, `type`, `title`, `confidentiality`) are the part of the frontmatter contract that is stable — new content types add extra keys, they don't change these five. Duplicating exactly that stable subset costs little and buys real value: Astro fails the build if a template's routing fields are missing, rather than rendering `undefined`. Everything type-conditional stays exclusively `check-content`'s job, so `guards.config.json`'s `byType` map — the part of the rule that actually changes when a new content `type` is introduced — has one owner, not two.

#### ✏️ Note, 2026-08-24 — the method was renamed, the decision was not

**Option C is unchanged and is what the content layer implements.** This note exists because the sentence above names a Zod method that is deprecated in the version actually installed, and an ADR naming a deprecated API is one the next reader believes and applies wrongly.

This document was written on 2026-08-19 against Zod 3 documentation, before anything was installed. `astro@7.2.5` depends on `zod@^4.3.6` and resolves `4.4.3`, where `.passthrough()` still works but carries `@deprecated Use z.looseObject() or .loose() instead` — read from `site/node_modules/zod/v4/classic/schemas.d.cts`, not from a release page (`C-01`). Astro itself imports `zod/v4`, so the `z` a collection schema is built with is the v4 API.

The loose form is therefore written `z.looseObject`. Same shape, same five keys, same split of ownership with `check-content`: only the method name moved.

**One thing this note deliberately does not do is widen the schema.** The work-item register's own constraint for the content layer reads *"five universal keys plus per-type required keys"* — which is Option A above, considered here and rejected. Where the register and this ADR disagree, this ADR governs, and the register's real requirement — an unknown `type` is a build failure rather than a pass — is met by pinning `type` to a literal union per collection, which needs no per-type key duplication at all.

## Sub-decision 2 — `:::diagram{id} → /diagrams/{id}.svg` resolution

### Options considered

| Option | Pros | Cons |
|---|---|---|
| **1. Prebuild script with a runtime fallback** — materializes `public/diagrams/{id}.svg` at every build: checks `resources/diagrams/{id}.svg` first, falls back to rendering `resources/diagrams/{id}.mmd` via `mermaid-cli` if the `.svg` is absent | Works from day one with no prep step; self-healing if a `.svg` is ever deleted | Keeps `mermaid-cli`/Puppeteer (a real headless-browser dependency) in the **ongoing** build, for as long as any `id` still lacks a hand-authored `.svg` — which, per TASK 6's own "one at a time, as needed" pace, could be most of the site's first year |
| **2. A single custom remark/rehype plugin** doing both the directive-to-markup transform and the disk-check/render fallback inline | One artifact instead of two | Same ongoing-dependency cost as Option 1, plus couples markup-transform concerns with heavy async rendering inside the content-render pass, invoked per locale page, with no natural place to dedupe rendering the same `id` twice (once per `.en.md`/`.es.md`) |
| **3. One-time pre-render, then a pure copy — no Mermaid at build time, ever** — a separate, one-off content-preparation step (not part of the site's build) renders all 11 current `.mmd` placeholders to real `.svg` files, checked into `resources/diagrams/` as the actual content. From that point on, **every `id` always has a `.svg` on disk** — either this pre-rendered placeholder or, later, TASK 6's hand-authored replacement, indistinguishable to the pipeline. The site's own build step becomes: copy `resources/diagrams/{id}.svg` → `public/diagrams/{id}.svg`. Nothing else. `mermaid-cli`/Puppeteer never runs as part of `astro build` | Requires the one-time conversion to happen before decision 4 is fully buildable — a prerequisite content step, not zero setup |

**Eliminated:** any strategy that renders Mermaid client-side (`rehype-mermaid`'s `pre-mermaid` strategy, `astro-mermaid`'s default mode) — forecloses by ADR-001's already-accepted zero-JS-by-default commitment, not re-argued here.

### Decision — Option 3 (raised by the author over Option 1, this ADR's first draft)

The site's build never runs Mermaid. A one-time content-preparation step renders all 11 `.mmd` placeholders to `.svg` and they become the checked-in content at `resources/diagrams/{id}.svg`, exactly like a future hand-authored replacement would be. The site build's diagram-resolution logic is then trivial and permanent: copy `resources/diagrams/{id}.svg` to `public/diagrams/{id}.svg`, once per `id`, no rendering, no headless browser, no Puppeteer — ever, not just after TASK 6 finishes. The `:::diagram{id type}` directive is unchanged from Option 1: a small `remark-directive`-based transform (registered once in `astro.config.mjs`) that emits `<img src="/diagrams/${id}.svg">` and does no rendering itself.

**Feasibility verified directly, not assumed** (`P-04`): this session rendered all 11 `.mmd` files, including `otp-breakeven` (`block-beta` — the one TASK 1 flagged as fragile), with `@mermaid-js/mermaid-cli@11.16.0`. All 11 succeeded, exit 0, producing real content (17–36 KB SVGs, dozens of genuine `<rect>`/`<path>`/`<g>` elements each, not empty shells). The upstream `block-beta` bug reports found in research did not reproduce against this content. Output sits at `tmp/diagrams-task17/` in this repository (gitignored scratch, not the session's external temp dir), ready for the author to place in `resources/diagrams/` — tracked as **TASK 17** (`TASKS.md`), blocked on the same `H-02` boundary as TASK 16: the agent can generate the files but not write them into frozen `resources/`. Applying this also required a `.gitignore` fix: it previously ignored `resources/diagrams/*.svg` on the assumption the file was always build-regenerated — an assumption this decision replaces.

**A diagram `id` with no `.svg` on disk (TASK 17 not yet applied, or a future new diagram added without one) is a build error naming the missing id.** Silence here would reproduce `INC-01`'s "silence reads as coverage" failure shape (`P-03`).

**`otp-breakeven` (`block-beta`)** is not special-cased going forward either. Its pre-rendered placeholder ships like the other 10; if it ever needs replacing, that happens through TASK 6 same as any other `id` — the fragility that motivated checking it first no longer blocks the pipeline design, since generation now happens once, offline, not on every build.

## Consequences

- **We gain:** frontmatter safety on the fields that matter for routing without duplicating volatile, type-conditional rules; a diagram pipeline with **zero runtime Mermaid/Puppeteer dependency** — the build's diagram step is a plain file copy, permanently, not just after TASK 6 finishes; a hand-authored and a pre-rendered-placeholder SVG are indistinguishable to the pipeline, so TASK 6 can replace assets one at a time with zero markdown or build changes, exactly as it promises; a loud, named failure instead of a silently missing diagram.
- **We accept losing:** self-healing (Option 1's fallback would regenerate a deleted `.svg` automatically; Option 3 requires TASK 17 — or a future equivalent one-time step — to exist before a new, un-rendered `id` can build); a single-artifact pipeline (Option 2's simplicity) in exchange for cleaner separation of concerns; Astro-side type coverage for type-dependent frontmatter fields (subtitle, stack, skills, …) stays entirely unvalidated at the Astro layer — a defect there is only caught by `check-content`, which means the gate must actually run for that safety net to exist.
- **This creates a dependency on:** TASK 17 (the one-time pre-render) landing before decision 4 is fully buildable — a content-preparation prerequisite, not a build-time one. `@mermaid-js/mermaid-cli`/Puppeteer becomes a **one-off, offline tool dependency** rather than a build-environment one: decision 2 (hosting/deploy) no longer needs to confirm the deploy environment can run a headless browser, only that whoever runs a one-time content-prep pass locally can (already confirmed: this session did, successfully, for all 11 diagrams).

## Review trigger

If the two-schema split (Sub-decision 1) drifts once — a field `check-content` requires that the Astro schema's `.passthrough()` silently let through wrong, or vice versa — revisit narrowing to Option B (no schema) rather than widening back toward Option A. If a future diagram `id` needs adding faster than a human can run a one-time render-and-place step (Sub-decision 2), that is the trigger to reconsider Option 1's build-time fallback for that specific gap — not to reopen the whole decision, since Option 3's "always a real `.svg` on disk" contract can still hold with an occasional manual regeneration.

## Sources

One researcher pass, this session, 2026-08-19. Official/vendor: Astro *Content Collections*, *Content Loader API Reference*, *Markdown in Astro*, *Integrations Reference*, *Project Structure* guides (docs.astro.build); `@mermaid-js/mermaid-cli` and `rehype-mermaid` package metadata (registry.npmjs.org) and READMEs; Mermaid block-diagram docs (mermaid.js.org). Independent: `remark-directive` README (unifiedjs/GitHub), `rehype-mermaid` README (github.com/remcohaszing), three Mermaid `block-beta` bug-report titles (github.com/mermaid-js/mermaid, search-summary only, not full-text verified). Repository data (`D1`), read directly: all 11 `resources/diagrams/*.mmd` files, `resources/case-studies/mobile-banking-platform.en.md`, `scripts/guards/gate/check-content.mjs`, `scripts/guards/lib/content.mjs`, `scripts/guards/guards.config.json`, `scripts/gate.mjs`, `docs/adr/ADR-001-site-stack.md`.

**Evidence caveats carried forward from the research** (see the full report in this session's trace for detail): `rehype-mermaid`'s exact quoted behavior came through an intermediary fetch summarizer and was corrected once after a misread; `npmjs.com` package pages 403'd and were substituted with `registry.npmjs.org`'s JSON API; Mermaid's own current self-declared status of `block-beta` was not confirmed against a dated changelog, only against TASK 1's existing claim and consistent (but not fully read) bug reports; no independent production benchmark exists for either sub-decision's chosen option — this is a new decision, not a well-trodden pattern with public war stories.
