# TASK 26 — slice G — not-found components

## Scope

Two new files:

- `site/src/components/not-found/NotFoundPanels.astro`
- `site/src/components/not-found/SeveredLink.astro`

No page module, no stylesheet, no rail, no gateway. No gate/build/astro-check run — orchestrator owns verification.

## Plan

1. Read shell-extract.md and notfound-extract.md (done).
2. Read `site/src/styles/tokens.css` for real custom-property names.
3. Read `site/src/components/home/HeroBackdrop.astro` for inline-SVG convention.
4. Build `SeveredLink.astro` — the `.break` block, two flanking SVGs + status code, whole thing `aria-hidden`.
5. Build `NotFoundPanels.astro` — two monolingual `<article>`/non-`<section>` panels, each `lang`-tagged, with heading/body/destinations list.
6. Decide where `SeveredLink` is rendered (inside `NotFoundPanels` vs page module) — decided: inside `NotFoundPanels`, see report.
7. Avoid nested `<section>` inset doubling — use non-`section` element for panels.
8. No color/font-family literals, no horizontal/vertical page padding, no max-width, only sanctioned breakpoints (1180/820/560 — all three used here).
9. Write final report.

## Log

- Started: read both extracts, drafted plan above.
- Read `site/src/styles/tokens.css` (real custom-property names, sanctioned breakpoints, `.document-page`/`.page-shell__main section` inset already handled by the shell) and `site/src/components/home/HeroBackdrop.astro` (inline-SVG convention: raw `<svg>` markup in the template, remapped `var(--color-*)` names, styles scoped in a `<style>` block).
- Read `site/src/components/page/NextUp.astro` and `site/src/components/article/SkillChips.astro` for the codebase's existing prop-typed, list-rendering component conventions.
- Wrote `SeveredLink.astro`: takes `{ code: string }`, renders the `.severed-link` block (two flanking SVGs + code span) as one `aria-hidden="true"` unit. SVG geometry carried verbatim from the extract, with `--ink`/`--ink-faint`/`--accent`/`--accent-line`/`--border-strong` remapped to `--color-*`.
- Wrote `NotFoundPanels.astro`: `Props = { panels: NotFoundPanel[]; statusLine: string }` exactly as specified (also exports the `NotFoundPanel` interface for the page module to reuse). Renders `SeveredLink` itself — see report below for why — deriving the status-code phrase from `statusLine` by splitting on `' · '` and taking the first segment, never touching individual digits. Panels render as `<article class="not-found-panel" lang={...}>`, not `<section>`, to avoid the double-inset trap.
- No gate, build, or `astro check` run — out of scope for this slice.

## Final report

See the closing chat message to the orchestrator for the full report (prop interfaces, `SeveredLink` placement rationale, inset avoidance, extract items not reproducible).

## Done

```yaml
done:
  scope:      { status: passed, evidence: ["site/src/components/not-found/NotFoundPanels.astro", "site/src/components/not-found/SeveredLink.astro", "no page module, stylesheet, rail or gateway touched"] }
  tests:      { status: not_applicable, reason: "an .astro component surface, which 30-testing.md places outside the unit and mutation tiers; the build and the end-to-end tier assert it, and both are the orchestrator's" }
  design:     { status: passed, evidence: ["both severed-link SVGs carried verbatim with only the token names remapped", "all three sanctioned breakpoints used, including the compact stage that removes the flanking geometry rather than shrinking it", "the artboard's implementation note was omitted, as instructed — it is a note to the builder, not copy"] }
  loose_ends: { status: passed, evidence: ["the nested-section inset was avoided by rendering each panel as an article rather than a section, reported rather than left silent"] }
  iterations: { status: passed, evidence: ["1"] }
```

**This block was added by the orchestrator at close, and its absence is itself the finding.** The slice delivered completely and reported well, but wrote no `done:` block — and **no guard caught that**, because `check-procedures` validates a block that exists and cannot yet detect one that is simply missing. That is `TASK 14`'s open gap, observed in the wild rather than in a fixture: two sibling logs in this same item were caught within seconds for carrying a status outside the vocabulary, and this one said nothing at all and passed clean. Silence reads as coverage, exactly as `P-03` says.

