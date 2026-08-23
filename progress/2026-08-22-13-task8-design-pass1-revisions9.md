# 2026-08-22 · Session 13 — Pass 1, ninth revision round: table of contents, index parity, and two things that left the design task

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS

## Read-back before editing

The author had not mentioned editing the canvas this round, but the check ran anyway (`WebFetch` → `--extract` → normalized diff against `build/src/`). `Main.dc.html` differed from the published bytes by exactly one line — the `rail-nav` margin this session had just changed — which establishes that nothing else had been saved from the editor since session 12. The one inline `style=` that looked like an editor artifact (`figcaption style="margin-bottom: 44px"`) turned out to be in source already.

Worth keeping as a habit: the check is cheap, and the alternative is discovering a destroyed edit after republishing.

## What was done

### 1. A table of contents on the article pages

Both `CaseStudyDetail` and `PlatformPage` now carry one. It lives **in the nav rail**, below the site nav and separated from it by a hairline, a mono `On this page` label, and a vertical rule whose accent segment marks the section in view.

Two alternatives were considered and rejected against the constraints already on these pages:

- **A sticky right-hand column.** It would have taken ~250px out of the article column, and `figure.diagram` is `max-width: 1080px` — the diagrams would have rendered ~25% smaller. The author has already flagged diagram text as too small to read; making it smaller to gain a TOC trades the wrong way.
- **An inline block under the masthead.** No horizontal cost, but it scrolls away, so it stops being navigation after the first screen — on a page this long that is most of the read.

The rail costs the article nothing and stays visible the whole way down. Two supporting changes: `.rail` gained `overflow-y: auto` so a shorter viewport scrolls the rail rather than clipping the theme toggle, and `.rail-nav`'s top margin went `56px → 40px` **on all four screens** to buy the space — changing it on two would have made the nav jump 16px when navigating between them.

TOC entries are shortened where a heading is long (`One decision worth explaining: two services, not one` → `One decision: two services`). A 200px rail cannot carry the full string, and a three-line TOC entry is worse than an abbreviated one.

### 2. The case-studies index now runs the same bento as the home page

`CaseStudiesIndex` was still on session 12's superseded card language — the flat `.card` / `.children-row` / `.standalone-wrap` structure with an indented bracket for the platform's children. Replaced wholesale with the home page's `.bento`: same tokens, same tile anatomy, same five SVG motifs, same `tile-anchor` / `tile-wide` / `tile-full` spans.

The file was also missing the `--label` token entirely (light and dark), which the tile footer's `.hi` line needs — added.

**Deliberately not differentiated from the home section.** The temptation was to give the index "more" — stack lines, context rows — since it has a whole page. That would have made two designs of one list, which is the opposite of what the author asked for in the same message about reusable components. The index is the same card given the whole page.

All `.card` / `.card-tag` / `.card-meta` / `.children-row` / `.standalone-wrap` / `.section-label` CSS is gone, and so are the six inline `style="font-size:16px"` overrides the old markup needed to make one card class serve three sizes. Verified by grep, not assumed.

### 3. The redundant rule on the platform page

`.platform-header` carried `border-bottom: 2px solid var(--ink)` and `.masthead` carries its own `border-top: 1px solid var(--ink)` — two horizontal rules, 40px apart, doing one job. Removed the header's, which is exactly what `CaseStudyDetail` does (its subtitle just carries `margin-bottom: 40px`).

## Two things that left the design task

Both raised by the author, both correctly identified by them as not belonging here.

- **The LinkedIn recommendations are now `TASK 19`** (`content`). They are real words by real people and belong in `resources/`, which `H-02` puts outside any agent's reach — so no amount of design work could have closed them. The entry names all three recommenders' roles, requires the permalink alongside each quote, and forbids paraphrase (`C-01`). The canvas keeps its `[NEEDS INPUT]` cards until that lands; the canvas is downstream of the content.
- **Content-driven components are now a third constraint on `TASK 8`'s own breakdown**, not a note. The author's framing — every list on this site is expected to grow — is right, and the place it survives is as an acceptance criterion on each implementation item the breakdown produces. Written with a checkable failure: *a sixth case study is a new pair of `.md` files and nothing else; if adding one means editing a page template, the item is not done.* The two elements that look like one-offs and are not — the hero background composition and the per-tile motif — are named explicitly, because they are the ones someone would hard-code without noticing.

## Answered

**"Are the next pages similar to these four, or a different design each?"** — Checked against the brief's screen inventory (§ "Screens to design", items 5–9) rather than answered from memory:

- **About** and **Experience** reuse the *article* shape — the rail plus a single prose column — minus the masthead and the diagrams. About is headingless by design, so it does not even get a TOC; its whole design problem is typographic.
- **Contact** is genuinely its own screen, and the brief already names why: 43 words on a page, where *"its shortness is the design problem"*.
- **System states** (a bilingual 404 and the language switcher open) and the **component sheet** are not pages at all — the sheet is an inventory of components that already exist by then.

So the honest answer is that pass 2 is mostly re-instantiation, not new direction. The shapes that carry the site are three — article, index, composed landing — and all three are built and now under review. That is also why the reusability point lands where it does: if the components are content-driven, About and Experience are assembly rather than design.

## Decisions

- **The TOC goes in the rail, not beside the article.** Recorded with the reasoning above because the obvious placement — a right-hand sticky column — is the one that quietly shrinks the diagrams the author has already complained about.
- **`rail-nav` margin changed on all four screens, not two.** A rail that shifts between pages is a worse defect than the 16px it saves.
- **The index does not get a richer card than the home page.** Same component, same data, different amount of page.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["progress/2026-08-22-13-task8-design-pass1-revisions9.md", "TASKS.md — TASK 19 added, TASK 8 third constraint added, trail pointer updated"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 209 files, 6 exclusions"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 PASS; check-trace fails on the same TASK 12 pre-existing correlation gap, unrelated to this change"], reason: "H-03 forbids editing evidence/ to work around it; TASK 12 owns the fix" }
  scope:      { status: passed, evidence: ["all three design points addressed; the two items the author routed elsewhere were tracked rather than absorbed"] }
  loose_ends: { status: passed, evidence: ["TASK 19 created for the testimonials; the reusability requirement landed as a TASK 8 constraint rather than prose"] }
  tests:      { status: not_applicable, reason: "no mutation-covered surface touched" }
  mutation:   { status: not_applicable, reason: "same as tests" }
  security:   { status: not_applicable, reason: "no boundary, guard or permission changed" }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions / follow-ups

- **The TOC's active-section indicator is drawn on the first entry** in the mockup, which is honest for a page at the top but does not demonstrate the mechanic. Whether it tracks scroll via an `IntersectionObserver` island or CSS scroll-driven animation is an implementation decision (`ADR-001` allows both).
- **The rail's vertical budget is now nearly full on `PlatformPage`** — eight TOC entries plus seven nav items. `overflow-y: auto` catches it, but a case study with more sections than that will scroll the rail. Worth watching once the real content drives the list.
- Carried forward: diagram text legibility in the inline SVGs; the "Get in touch" invite copy needs a content-type change to `home.en.md`/`home.es.md` outside this task (`H-02`); contact form backend; real vendor/tool logos for the marquee; mobile artboards; `home.es` stress test; the motifs still unreviewed at real size.

## Next

Author reviews the TOC placement and the index. Then: mobile for the 4 screens and the `home.es` stress test.

## Files changed

`docs/design/canvas/src/CaseStudyDetail.dc.html` — rail TOC added (6 entries), `.rail` gains `overflow-y`, `rail-nav` margin 56→40.
`docs/design/canvas/src/PlatformPage.dc.html` — same TOC (8 entries), plus the redundant `border-bottom` removed from `.platform-header`.
`docs/design/canvas/src/CaseStudiesIndex.dc.html` — card language replaced with the home page's bento wholesale; `--label` token added for both themes; `rail-nav` margin 56→40.
`docs/design/canvas/src/Main.dc.html` — `rail-nav` margin 56→40, for rail consistency across pages.
`TASKS.md` — `TASK 19` created; `TASK 8` gains a third breakdown constraint and an updated trail pointer.
`progress/2026-08-22-13-task8-design-pass1-revisions9.md` — this log.
