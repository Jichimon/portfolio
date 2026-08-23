# 2026-08-20 · Session 05 — Pass 1 revisions after author review

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS

## What was done

The author reviewed pass 1's four screens and gave nine concrete pieces of feedback in one message. All nine were actionable rather than open questions, so this session implemented directly rather than re-entering a checkpoint — per `P-17`, pushing back where warranted and then doing the work, not stalling on calls the author had already effectively made.

- **Accent color: cyan → wine/burgundy** (`oklch(42% 0.15 15)` light, `oklch(70% 0.15 15)` dark). The author's own words: cyan read "muy NiCE" — too close to a former employer's brand. Recommended wine over the author's other option (magenta) and said why: serious, warm, fits "regulated bank," and doesn't risk reading as playful for an audience of hiring managers — stated as a judgment call, not left as an open question, since the author had explicitly said "no sé" and wanted a recommendation.
- **Hero background reworked for legibility.** The author's real complaint: "la imagen de fondo igual se pierde... al ser difuminada se pierde todo el sentido." Blur dropped from 26px to 6px on the strata layer (and near-zero on the nodes, unchanged), opacity raised, the strata tinted with the new accent so it reads as a considered pattern rather than noise, and a soft radial "quiet zone" added directly behind the hero copy so the now much-more-present background doesn't fight text legibility. Some nodes and connecting lines recolored into the accent for a less monochrome composition — addressing the "paleta muy apagada, no solo blanco/negro y celeste" complaint directly.
- **Small UI text switched from Space Grotesk to IBM Plex Sans.** The author: "la fuente que se usa para el menu y otras cosas es borrosa." Space Grotesk is a variable font; at the small sizes used for nav items, the wordmark, card titles and employer names, its weight-axis interpolation reads soft. New rule applied across all four artboards: **Space Grotesk only at ≥20px** (thesis, article titles, `h2`/`h3` prose headings) where its character is a genuine feature; **IBM Plex Sans, bolder weight, everywhere smaller** — nav, wordmark, card titles, employer names, section eyebrows.
- **Nav subtitle**: "Backend Engineer / Solution Architect" → "Senior Software Engineer" (matches the real dateline text in `resources/site/home.en.md`, which the author's request pointed back to rather than inventing a new phrase).
- **"Selected work" → "What I've built"** on both the home teaser heading and the case-studies index page title, per the author's ask for more human wording.
- **Technology marquee made graphic, not hunted-for-logos.** The real vendor marks (`.NET`, `AWS`, `SQL Server`, …) are third-party trademarks — sourcing ~15 real SVGs is a genuine asset task, not a design-canvas edit, so it's flagged to the author rather than silently deferred or silently done. What shipped instead: much larger, bolder type in a chip layout with small geometric marks (not logos) in rotating accent/ink/faint colors — addresses "más llamativos" without the licensing/asset-sourcing scope.
- **Employer strip is now real links** (`href="#experience"` — the mockup placeholder pattern used everywhere else on these artboards, since real routing doesn't exist yet) with a bolder card treatment (accent-topped, elevated background) instead of plain text.
- **A "Get in touch" section added** below "Where I've worked," using the real verbatim copy from `resources/site/home.en.md`'s `## Get in touch` (checked against the source rather than invented): the invitation line, a real `mailto:` link, GitHub/LinkedIn. "Open to remote or hybrid/relocation" — removed from the dateline per the author's request — relocated here as a small supporting note, where a reader deciding whether to reach out would actually want it.
- **Dateline simplified and upsized**: dropped "Open to remote or hybrid/relocation" (relocated, above), switched from small monospace to bold Plex Sans at 18px per "un poco más grande y bold (más legible)."
- **Platform page's `cat-tag`** ("Platform · anchor of 3 deep dives") enlarged from 11px to 16px, matched on the case study's equivalent tag for consistency.

## Decisions

- **Real vendor logos are out of scope for this pass, stated explicitly rather than silently substituted.** Fetching and rights-checking ~15 real product marks is asset work with its own licensing considerations, not a canvas-design edit — offered to the author as a follow-up task rather than either doing it unreviewed or quietly ignoring the request.
- **The employer strip links to `/experience`**, not to individual case studies, because that's the one real page in `resources/` that actually describes what happened at all four employers — verified before deciding rather than assumed.

## Findings from validating against real state (P-04)

- **The nav subtitle and dateline wording were pulled from `resources/site/home.en.md`, not invented** — "Senior Software Engineer" is the page's own H1-equivalent framing, so aligning the nav subtitle to it was a matter of reading the source rather than composing new copy.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["progress/2026-08-20-05-task8-design-pass1-revisions.md"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 201 files, 6 exclusions"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 PASS; check-trace fails on the same TASK 12 pre-existing correlation gap (now 3 occurrences, accumulated over this session's length), unrelated to this change"], reason: "H-03 forbids editing evidence/ to work around it; TASK 12 owns the fix" }
  scope:      { status: passed, evidence: ["all nine of the author's feedback points addressed in this round; the real-logo request explicitly flagged as separate scope rather than silently done or dropped"] }
  loose_ends: { status: passed, evidence: ["real vendor logos named as an open follow-up above, not left implicit"] }
  tests:      { status: not_applicable, reason: "no mutation-covered surface touched" }
  mutation:   { status: not_applicable, reason: "same as tests" }
  security:   { status: not_applicable, reason: "no boundary, guard or permission changed" }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions

- **Real vendor/tool logos for the marquee** — worth pursuing as a separate asset-sourcing pass, or is the bolder typographic treatment enough?
- **Mobile + `home.es`** — still the next screens after this revision round settles.

## Next

Author reviews the republished canvas. If the hero, accent and legibility fixes land, move to mobile for the 4 screens (against this revised hero, not the earlier blurred one or the superseded `MobileSeam` direction) and the `home.es` stress test.

## Files changed

`docs/design/canvas/src/Main.dc.html` — accent, hero background, dateline, marquee, work heading, card fonts, employer strip, new Get in touch section, footer simplified.
`docs/design/canvas/src/CaseStudyDetail.dc.html` — accent, nav fonts, role text, cat-tag size, prose h3 font.
`docs/design/canvas/src/CaseStudiesIndex.dc.html` — accent, nav fonts, role text, heading text, card fonts.
`docs/design/canvas/src/PlatformPage.dc.html` — accent, nav fonts, role text, cat-tag size, service/dive-card fonts.
`progress/2026-08-20-05-task8-design-pass1-revisions.md` — this log.
