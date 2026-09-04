# 2026-09-03 · Session 01 — TASK 115, the home page's employer strip

**Task:** TASK 115 — Home: the employer strip
**Status after this session:** DONE — code and content both landed, full gate green on the real tree, verified against the built screenshots rather than the report alone

## What was done

The design's "Where I've worked" section (`Main.dc.html` / `HomeMobile.dc.html` / `HomeES.dc.html`, `#employers`) went from fully designed and never built to live on both locale routes, sourced from the same `roles[]` data `/experience` already renders from. Four employer logos, hand-traced from the author's raster originals into SVG. A logo-resolution mechanism that did not exist anywhere in the pipeline before this item — `EmploymentEntry.astro`'s `logo?` prop had been rendering `<img src={logo}>` since `TASK 26` with nothing behind it. And, found only by looking at the real built screenshots rather than trusting the DOM assertions: NICE's brand mark is pure black and was unreadable against the dark theme's card surface, twice — first because a `currentColor` fix does not work through an `<img src="*.svg">` (the loaded document does not inherit the page's CSS `color`), and then because the hand-off of the corrected dark-variant asset silently failed and shipped a byte-identical copy of the light one. Both are fixed and both are re-verified visually, not just re-asserted.

## Decisions

- **Reuse `getExperienceRecord(lang)` rather than a new collection.** The employer facts (`company`, `period`, `logo`) already live in `experience.{en,es}.md`'s `roles[]`, the same source `/experience` renders from. A second source would duplicate facts the author would then have to keep in sync by hand.
- **Full-colour `<img>` marks, not themed inline SVG.** The design's `.logo-slot img` is an `object-fit: contain` image box, not a `currentColor` mark span like the stack strip's — these are brand logos, not a technology glyph set.
- **Banco Solidario S.A.'s icon ships as a trimmed, background-stripped raster embedded in a valid `.svg` wrapper, not a flat-colour trace.** Measured, not assumed: the icon is a real smooth gradient (sampled corner-to-corner across the circular mark), and a flat-colour trace bands it visibly. Faithful-but-raster beat vector-but-wrong here.
- **`site/lib/content/pages/employment-record.mjs` was extended in place rather than opening a new module.** The directory was already at 6/6 files (`S-03`); the spec's test-plan labels (`employer-logos.test::...`) read as scenario names rather than a literal required filename, recorded as drift in the spec rather than followed into an `S-03` violation.
- **NICE's dark-theme legibility problem is solved with a sibling-file convention (`<basename>-dark.svg`), not a CSS/currentColor trick.** The first attempt (paint the wordmark with `currentColor`, verified only by inlining the SVG directly in a preview render) does not work in the real rendering context: `<img>`-loaded SVGs do not inherit the embedding page's `color`. The corrected mechanism — an optional second asset, shown only under `[data-theme="dark"]` (the site's actual runtime toggle attribute, not `prefers-color-scheme`, which cannot see it) — needed no schema change and left the other three employers untouched.

## Findings from validating against real state (P-04)

- **The logo-resolution mechanism `EmploymentEntry.astro`'s `logo?` prop implies did not exist anywhere in the pipeline.** Unlike the stack strip's `MARK_SOURCES` glob (`content-queries.ts:245-247`), nothing turned a frontmatter `logo:` string into a real, build-resolved asset URL. This item builds that mechanism for `resources/logos/employers/*`, the folder `TASK 114` named and reserved but never populated.
- **`site/src/components/home/` and `site/lib/content/pages/` were both already at 6 of 6 files (`S-03`)**, confirmed against the real directory listings rather than assumed. The component split into a new `home/employers/` subfolder (mirroring `work/`); the core logic stayed inside `employment-record.mjs` rather than opening a matching subfolder there, since it is a few small functions tightly coupled to the role-building that module already does.
- **The design's real section order is hero → employers (`#employers`) → work (`#work`) → stack (`#stack`) → contact**, read directly from `Main.dc.html`'s body markup rather than inferred from the style block's ordering (which lists selectors in a different sequence than the sections actually appear).
- **A preview rendered by a different embedding mechanism than production proves nothing about production.** The `currentColor` fix looked correct because it was verified by inlining the SVG directly (`sharp` rasterizing the file with a manually-set `color` style). The actual component renders every logo via `<img src>`, which does not cascade CSS custom properties or `color` into the loaded SVG document at all — a platform behavior, not a bug, and one that made the "fix" invisible to its own verification. Caught only because the implementer looked at the real built screenshot instead of trusting the DOM assertion, exactly the discipline `P-11`/`T-02` ask for.
- **A one-off tracing script's lack of idempotency cost a full round-trip.** The scratch `run.mjs` used to trace all four logos (`tmp/task115-logos/`) unconditionally regenerates `nice.svg` from the raw PNG on every run, with no guard against a manually-promoted variant already sitting there. Re-running it for unrelated Mamaya Tech fixes silently reverted the promoted `currentColor` version back to plain black; a same-named `nice-dark.svg` generated afterward from that (already-reverted) source found nothing to replace and shipped as a byte-identical copy. Found by hashing both files rather than eyeballing a rendered preview a second time.
- **Vite deduplicates identical asset content to one output file, which turned a content bug into a silent no-op rather than a visible one.** With `nice.svg` and `nice-dark.svg` byte-identical, the build produced one physical file and both `<img>` tags in the swap resolved to it — the CSS toggle and the resolution code were both already correct, so nothing failed loudly. Only a hash comparison and a direct look at the built HTML's two asset URLs surfaced it.
- **`import.meta.glob(..., { query: '?url' })` alone does not defeat Vite's `assetsInlineLimit` (4096 bytes).** The smallest of the four logos (`nice.svg`, 1,594 bytes) built to a `data:` URI instead of a real file the first time; the other three, all over 4KB, masked the defect until the smallest one exposed it. Fixed with the `?url&no-inline` query.

## Open

- `EmploymentEntry.astro` and `EmploymentRecord.astro` (outside this item's scope) each end with a stray literal `</content>` closing tag — harmless, but looks like a leftover artifact from however those files were originally produced. Worth a look next time either file is touched.
- 2 pre-existing mutation survivors in `buildCaseStudyRow` (`&&` → `true` mutants on the case-study slug/route lookups), unrelated to this item and unchanged across every run this session.

## Done

```yaml
done:
  scope:      { status: passed, evidence: ["docs/specs/SPEC-TASK-115-home-employers-strip.spec.md — approved_version 1.1, matches version 1.1"] }
  content:    { status: passed, evidence: ["resources/site/experience.{en,es}.md:11,20,32,41 — logo: keys", "resources/logos/employers/{nice,nice-dark,banco-solidario,mamaya-tech,avicola-sofia}.svg — present, nice.svg and nice-dark.svg confirmed distinct by sha256"] }
  tests:      { status: passed, evidence: ["node --test site/lib/**/*.test.mjs — 345 pass, 0 fail", "npx playwright test home.smoke — EMP-001/002/003 assertions green in en and es"] }
  mutation:   { status: passed, evidence: ["stryker aggregate 80.18%, floor 79.0"] }
  build:      { status: passed, evidence: ["npx astro check — 0 errors, 0 warnings", "site/screenshots/home.en.1440.dark.png — NICE card legible, all four employer cards render between hero and work bento, verified visually this session"] }
  docs:       { status: passed, evidence: ["docs/specs/SPEC-TASK-115-home-employers-strip.spec.md — traceability table updated to implemented, drift log carries both corrections"] }
  loose_ends: { status: partial, reason: "two open items recorded above, both pre-existing and outside this item's own surface" }
  scope_gate: { status: passed, evidence: ["git status --short — only the brief's enumerated files plus the new employers/ subfolders changed"] }
  iterations:      { status: passed, evidence: ["6"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1", "slice=3", "verify=2"] }
```

## Next

Author's visual pass at the three artboard widths / both themes / both locales, per the spec's own stated coverage gap (nothing machine-asserts a logo is *optically* correct, only that it renders, resolves, or falls back correctly). Otherwise closed.

## Files changed

`TASKS.md` — `TASK 115` opened, then closed.
`docs/specs/SPEC-TASK-115-home-employers-strip.spec.md` — written, approved at 1.0, revised and re-approved at 1.1 for the dark-variant mechanism.
`progress/2026-09-03-01-task115-employer-strip.md` — this log.
`site/lib/content/pages/employment-record.mjs`, `employment-record.test.mjs` — logo validation, dark-sibling derivation.
`site/src/gateway/content-queries.ts` — employer logo glob (base + dark), asset-boundary checks, URL resolution.
`site/src/components/home/employers/EmployersSection.astro`, `EmployerCard.astro` — new.
`site/src/components/home/HomeSections.astro` — wires the section between `Hero` and `WorkBento`.
`site/tests/e2e/home.smoke.spec.ts` — EMP-001/002/003 assertions.
`resources/site/experience.{en,es}.md`, `resources/logos/employers/*` — author's, applied directly (`H-02`).
