# 2026-08-22 · Session 16 — Pass 1 approved; pass 2 begins with About and Experience

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS

## Pass 1 is approved

The author approved the four desktop screens after eleven revision rounds: *"podemos aprobar el diseño de las 4 páginas y proseguir para finalizar el diseño del sitio"*. Recorded in `TASKS.md` on the `TASK 8` status line, because "approved" is a state someone reading this next month needs to find without reconstructing it from a chat.

## Two things routed to their real owners rather than kept as prose

**Diagram legibility → `TASK 6`.** The author raised it three times and suggested another task; `TASK 6` already owns the eleven hand-authored replacements, so it got the constraint instead of a new duplicate entry (`P-01`). It is written as an acceptance criterion, not an aspiration: **readable at the width it is published at, without zooming**, judged in the rendered page and in both themes — which is `P-15` applied to a class of asset that has already nearly shipped on "it renders".

**Rail position tracking → an acceptance criterion on `TASK 8`'s breakdown and on the structure decision.** The author asked mid-session for it to be written down: *"el scroll y ver en qué sección te encontrás del case-study, en el diseño, sigue igual sin funcionar... eso es algo que en la implementación tiene que servir"*.

The reason it will never work in the canvas is now stated where it will be found rather than left to be re-derived: **the Design runtime builds each artboard's DOM programmatically, and a `<script>` created that way never executes.** That is a property of the mockup tool. Without that sentence written down, the next reader sees a design that appears to lack the feature and concludes it was not wanted — which is the exact inversion the author was guarding against. Four checkable criteria are now in `docs/design/decisions/2026-08-22-site-structure.md`, including the one that is easy to forget: **with JavaScript off the rail is still a working list of links** — tracking is the enhancement, never the mechanism (`ADR-001`).

## About — the reading screen

The brief's instruction was *"the only one carrying warmth. Solve it typographically."* The source has **no headings**, and none were invented — inventing them would be writing content into a page whose content is frozen (`H-02`), and would flatten prose that is deliberately continuous.

Structure comes from three devices instead:

- **A display lede.** The opening sentence *is* the thesis, so it gets the only Space Grotesk display size on the page and an accent rule under it.
- **A marginal spine.** Four of the paragraphs are chronological, one per employer, so each gets a mono marker hanging in the left margin — employer, years, and a tick that widens and turns accent on the current role. It makes "four employers, one recurring problem" visible before a word is read, which is the page's whole argument.
- **A separated close.** The degree, the climbing and boxing, and the 16Personalities aside move out of the argument's flow into a labelled key/value block. They are context, not evidence, and trailing them off the end of the seniority paragraph made the page end on its weakest note.

The reflection paragraph deliberately has **no marker** — it is not a chapter, and giving it one would have implied a fifth employer.

Inline case-study links get an accent underline rather than the site's usual bare treatment: on a page of continuous prose they are the only interactive elements, and invisible links on a reading page are links nobody clicks.

The 16Personalities URL is a real anchor here. `TASK 16` noted it landed in `about.{en,es}.md` as bare text and would not render as a link — worth fixing in the content when that file is next edited; the design assumes the fixed version.

## Experience — the record

The brief said *"resist turning this into a timeline graphic unless the graphic earns it"*, and it does not. With four roles a rule per entry says the same thing as a decorative spine and costs nothing.

This is the masthead's ruled-list grammar scaled up to page level: company and years hang in a fixed 232px left column so **the four dates line up down the page**, which is the one thing a reader actually scans for here. About tells the story; this page is the record, and the two are different jobs.

The case-study links became **ruled rows with an arrow, not bullets**. Three long titles as a bullet list read as filler; as an index they read as destinations, and the row shifts right on hover so it behaves like one.

### Two things on this screen are proposed copy, not published content

Flagged rather than shipped quietly, because a mockup that shows content the source does not have is how a build discovers a missing field late:

- **The `h1` and its intro line** — `experience.md` has no headings and no lede. "Four employers, five years, one recurring problem" is my copy, consistent with the thesis (`C-15`) but not published.
- **The per-role stack lines.** Every value is traceable (`C-04`) — the bank's comes from the platform case study's frontmatter, NICE's and the two earlier ones from `about.md` and `experience.md` prose — but `experience.md` carries no `stack` field to render them from.

Both need a content change to `experience.en.md` **and** `experience.es.md` in the same edit (`C-09`), which is outside this task because `resources/**` is read-only to agents (`H-02`). If the author would rather not add them, the design drops both without damage. Also recorded as an annotation on the canvas itself, so the next person to open it sees the caveat next to the screen.

## Verification

Ten artboards seeded and checked. The link-integrity assertion over the generated preview: **0 dangling in-page anchors, 0 duplicate ids**, and the only remaining `href="#"` placeholders are the three superseded direction boards, which are history and not maintained. Declared routes across the whole canvas are now exactly the structure decision's set: `/`, `/#work`, `/#contact`, `/about`, `/experience`, and the five `/case-studies/<slug>`.

`/case-studies` is absent from that list, which is correct and worth stating: nothing links to the index because it is designed and not routed.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["progress/2026-08-22-16-task8-design-pass2-about-experience.md", "docs/design/decisions/2026-08-22-site-structure.md — scroll-spy acceptance criteria added", "TASKS.md — pass 1 approval recorded, TASK 6 legibility criterion, TASK 8 fourth constraint, TASK 20 created", "docs/design/canvas/README.md — re-seed command updated for 10 artboards"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 216 files, 6 exclusions"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 PASS; check-trace fails on the same TASK 12 pre-existing correlation gap, unrelated to this change"], reason: "H-03 forbids editing evidence/ to work around it; TASK 12 owns the fix" }
  tests:      { status: passed, evidence: ["link integrity over the generated preview — 0 dangling anchors, 0 duplicate ids, declared routes match the structure decision exactly", "responsive contract asserted over all six screens — media queries present, rail-collapse rule present, no min-width floor remaining", "About measure asserted — exactly two widths, one grid module, pull quote once and not as h1"] }
  scope:      { status: passed, evidence: ["two of pass 2's four screens built, then re-split after author review; the remaining two named with a reason, not silently deferred"] }
  loose_ends: { status: passed, evidence: ["TASK 20 created for the About/Experience content split and the three photographs; the copy gaps are marked on the screens themselves, not only in prose"] }
  mutation:   { status: not_applicable, reason: "no mutation-covered surface touched" }
  security:   { status: not_applicable, reason: "no boundary, guard or permission changed" }
  iterations: { status: passed, evidence: ["4"] }
```

## Why pass 2 is not finished in one run

`P-09`: a slice is sized by whether it fits in one run, and an agent cut off mid-run delivers zero rather than half. Two full content pages against real copy is what fits. The remainder, in the order it should be taken:

1. **System states** — bilingual 404 and the language switcher in its open state. Small, and the switcher is the only piece of chrome the four approved screens do not yet contain.
2. **Component sheet** — deliberately last of the desktop set: it is an inventory, and it can only be assembled once every component it inventories exists. Building it before About and Experience would have meant revising it twice.
3. **`home.es` length stress test** — Spanish runs ~15–20% longer (`home.es.md` is 311 words against 294; `about.es.md` 647 against 605). The hero headline, the nav labels and the bento tile titles are the three places that break first, and finding that now is cheaper than finding it after mobile doubles the surface.
4. **Mobile** for every screen, against the accepted hero — `MobileSeam.dc.html` tested the *rejected* Direction C and needs redoing, not reusing.

## Open questions / follow-ups

- **The proposed Experience copy and stack lines** need an author decision: add to `experience.{en,es}.md`, or drop from the design.
- **The marginal spine on About assumes one paragraph per employer.** It holds for the current text; a rewrite that merges or splits a paragraph breaks the mapping. Named because it is the kind of coupling that looks free until content changes.
- Carried forward: the "Get in touch" copy change (`H-02`); contact form backend; real logos for the marquee; `TASK 19`'s testimonial text; the motifs still unreviewed at real size.

## Files changed

`docs/design/canvas/src/About.dc.html` — new. Reading screen: display lede, marginal employer spine, separated personal close.
`docs/design/canvas/src/Experience.dc.html` — new. Ruled record: fixed date column, case-study links as index rows, per-role stack line (proposed copy).
`docs/design/canvas/src/canvas.json` — two artboards added to the screens page; annotation covering both, carrying the proposed-copy caveat.
`docs/design/canvas/local-preview.mjs` — the two new boards added to the preview roster.
`docs/design/canvas/README.md` — re-seed command updated to ten artboards.
`docs/design/decisions/2026-08-22-site-structure.md` — position tracking written as four acceptance criteria, with why it cannot work in the canvas.
`TASKS.md` — pass 1 approval recorded; `TASK 6` gains a legibility acceptance criterion; `TASK 8` gains a fourth breakdown constraint.
`progress/2026-08-22-16-task8-design-pass2-about-experience.md` — this log.

---

## Same day, second half — the author found the two pages read as one

*"por qué about y experience tienen la misma estructura?? ... ahorita las 2 páginas se ven muy parecidas"*.

**The direct answer, because they asked for it:** to give About structure without inventing headings, I hung an employer-and-years marker in the margin beside each of its four chronological paragraphs. That marker *is* Experience's left column. I turned About into a second CV while trying to make it not look like one.

But that is only the visible half. **The two content files already tell the same chronology twice** — `about.en.md` has one paragraph per employer, `experience.en.md` has one entry per employer, and the facts inside them overlap almost completely. The design duplicated a duplication that was already in `resources/`. No amount of layout would have fixed it, which is why this round ends with a content work item rather than a nicer About.

The author also flagged the line *"The narrative version is on About."* and asked why it was there at all. They are right: **a page that has to explain its relationship to another page is confessing the overlap.** Removed rather than reworded — if the split is real the reader does not need to be told, and if it is not, the sentence is an apology.

### The split

**Experience owns the employer story outright.** Each entry now carries the narrative that used to live on About, alongside the role, its case studies and its stack. Its opening moved too: the thesis sentence — *"The same problem kept finding me, across four employers that had nothing else in common"* — is Experience's argument, not About's, and it now heads that page.

**About became an article about a person.** No spine, no employer markers, no chronology of any kind. What it has instead:

- **A headline in his own words** — *"I just like being bad at something new until I'm not."* That sentence already exists in `about.md`, buried in the last paragraph. It is the most personal thing on the site and it was being used as a throwaway.
- **A wide measure and 17.5px body**, set to be read rather than scanned.
- **Three photographs**, which is what the author asked for and what the page actually needed. Each frame states what belongs in it and at what proportion — a frame that briefs you is useful; a grey box is a bug.
- **The reflection paragraph** (*"Judgment isn't a title"*) promoted to the opening body text, where it does the work the page's first screen needs.

### What is marked, not invented

Three `[NEEDS INPUT]` markers on About and the three photo frames. They are on the screen, in accent, impossible to miss — because the failure mode here is a mockup that looks finished and quietly implies content nobody has written (`C-01`).

None of it can be resolved from this task: it is a rewrite of `about.{en,es}.md` and `experience.{en,es}.md`, and `resources/**` is read-only to agents (`H-02`). **`TASK 20` now owns it**, with the photo specs, the locale-parity requirement, and two constraints worth naming — the photographs must be the author's own, and third parties in them need consent or a crop (`C-06`).

### Verification, second pass

`class="chapter"` no longer appears anywhere — the marginal spine is gone, not merely restyled. 3 photo slots, 3 `[NEEDS INPUT]` markers, 0 dangling anchors, 0 duplicate ids, `check-terms` PASS over 216 files.

---

## Third round, same day — the About layout had no rule, and the author found it

Three findings, all correct, and the third is the one that mattered.

### The headline was doing two jobs and neither well

*"I just like being bad at something new until I'm not." está bien como frase marcada a mitad del artículo... no como título.*

Worse than they said: **the same sentence was on the page twice**, as `h1` and again as the pull quote roughly two thirds down. I promoted it to headline for its warmth and then kept the pull quote it was already earmarked for, and nothing in the build catches a duplicated sentence.

New headline: **"I'd rather design the system than run the room it lives in."** It is a first-person edit of a sentence already in `about.md` — *"more at ease designing a system than running the room it lives in"* — so it is his characterization, not mine, and it frames the page around how he thinks rather than around a job title. It needs the same content change the rest of About needs (`TASK 20`), which now also covers the headline.

### Contact widened past "problem solver"

*"no cerrándome a problem solver sino a ideas implementor".* Right instinct, and it is also what `C-10` is about — "problem solver" is on the banned-adjective list for a reason.

`Got a problem that's hard to explain? Let's work through it together.`
→ `Got a system that's hard to explain — or an idea you don't yet know how to build? Let's work it out together.`

Still carries the thesis (a system too tangled to describe) but no longer implies the only way in is a problem. This copy lives only in the canvas; landing it needs `home.{en,es}.md`, same `H-02` constraint as before.

### The layout question, answered honestly: there was no rule

*"cuál es el centro de la página? por qué no seguimos un orden?"*

The page had **three different alignment schemes in one screen**: a two-column opening with the portrait floated right, a narrow body left, a full-width panorama, a photo-left/text-right pair, then narrow body again. I alternated sides for visual variety. **Variety is not a layout rule**, and the author could not find the centre because there wasn't one — that is the correct reading, not a matter of taste.

Their two specific questions have no good answer under the old scheme and that is the tell:

- *Why is the portrait right and the text below left?* No reason. It was placement by feel.
- *Why is the panorama 21:9 when no text runs along that length?* Also no reason — a 21:9 crop was chosen for drama, not for a job.

**Rebuilt on one left spine.** Every element starts at the same x. Nothing is floated opposite anything. Three measures exist and nothing else:

| Measure | Used by |
|---|---|
| 880px | the headline, and only the headline |
| 680px | every paragraph, the lead, the byline, the draft blocks, the pull quote |
| full content width (1032px) | photographs |

This is also what the case-study pages already do — prose and figures share a left edge, figures simply run wider — so About stops being the odd page out and the site gains one page-layout rule instead of two.

The panorama now has a job: it is the **lead image**, directly under the byline, where a wide crop is the right shape because nothing is meant to sit beside it. A break's job is to be a break.

**The two remaining photographs are now both specified 4:5** and sit as a single paired module at full width. Previously one was 4:5 and the other 1:1, which cannot pair without a ragged edge. The design sets the crop rather than the layout bending around whatever aspect ratio the files happen to have — and since the author has not taken them yet, that spec is free to set now and expensive to change later.

Rhythm: headline → lead → byline → panorama → body → photo pair → body → pull quote → body → next.

### Verification

Asserted as a property rather than eyeballed: the declared max-widths in `About.dc.html` are now `680`, `880`, `1176` (plus `340`, which is caption text inside a photo frame) — no fourth measure crept in. One `grid-template-columns` on the page, which is the photo pair. The pull quote sentence appears exactly once, and not as the `h1`.

---

## Fourth round, same day — the dead space, and the responsive contract

### The dead space was the left spine's own doing

*"y que hacemos con ese espacio? y este otro espacio?"* — the ~350px running down the right of every text block on About.

Last round's left spine fixed the *order* and created this. The distinction that matters: **an asymmetric leftover reads as a mistake; a symmetric margin reads as a margin.** Same empty pixels, different meaning, and no amount of moving photographs around changes which one it is.

So About moved from a left spine to **one centred axis**. Exactly two widths remain:

| Width | Used by |
|---|---|
| 680px, centred | headline, lead, byline, every paragraph, the drafts, the pull quote, **and the photo pair** |
| full content width | the panorama, and nothing else |

The author offered two fixes — shrink the panorama into the text measure, or widen the text. Both were rejected for the same reason: **the panorama is the page's only full-width moment, and that is what makes it mean something.** Widening the text would have pushed the measure past ~75 characters, which costs readability to solve a cosmetic problem. Pulling the *pair* back into the column is what closes the gap, because two 4:5 photographs at 680 are already a substantial block.

The headline dropped its own 880px measure and joined the column, so the earlier claim of "exactly two widths" is now true rather than nearly true.

### Responsive: the question was the right one, and it had no answer at all

*"cómo haríamos para que este diseño sobreviva a mobile o pantallas menos anchas?"*

It would not have. Every board carried `min-width: 1024px` — a hard floor I added two rounds ago to stop the fluid board collapsing, which also guaranteed a horizontal scrollbar on any phone. That is removed from all six screens.

In its place, **one contract, three states, applied to every screen**:

| State | Width | What changes |
|---|---|---|
| wide | >1180px | the design as approved — 264px rail, full measures |
| medium | 820–1180px | rail narrows to 208px, padding tightens, 3-column grids become 2 |
| narrow | <820px | **the rail stops being a rail** |

The rail *is* the mobile question — a 264px fixed column cannot exist at 390px. At narrow it unsticks, spans the top full width, and its nav becomes a single horizontally scrollable row; the role, location, socials and the article table of contents drop out; everything below is one column.

**Top bar over hamburger, deliberately.** The nav has four live items and three disabled ones, which fits a scrollable row. Hiding navigation behind a tap is a cost you pay to buy space, and this nav does not need to buy any — so it does not pay. Recorded because the hamburger is the reflex and reflexes need a reason.

Per screen, the collapses that are not mechanical: the bento goes 3→2→1 with every span reset (a `grid-column: span 2` left in place at one column overflows silently); the home hero drops from 560px to 420px with the strata and node layers widened so the composition still reads at 390; the article masthead's `100px 1fr` becomes a single stacked column; About's photo pair stacks and the panorama re-crops from 21:9 to 3:2, because a 21:9 frame at 390px is 167px tall and shows nothing.

### The verification that made this checkable

A design claim about responsiveness is worthless without a way to look, so the local preview now carries **width buttons per screen — 390 / 768 / 1024 / 1440 / fit**. The board is `width: 100%`, so constraining the scroller genuinely constrains the viewport the media queries respond to; this is not a zoom, it is the real narrow state.

That also makes the property assertable rather than eyeballed. All six screens: media queries present, the rail collapse rule present, no fixed floor remaining — checked in the source, not in a screenshot.

The published canvas cannot show this as well: its artboards are `expand: fill`, so resizing the browser window does exercise the breakpoints, but there is no per-artboard width control. **The local preview is the right place to judge the narrow states**, and it is now sent alongside every publish for that reason.

### What this does not yet cover

- **No fixed 390px artboard.** The responsive source is better than a static mockup for judging behaviour, but a frozen phone frame is still what a component sheet and a hand-off want. Next slice.
- **The narrow hero is reasoned, not seen at 390 by the author.** The strata/node widths were chosen from the geometry; they may need the same tuning the desktop hero took.
- **`home.es` at narrow is untested twice over** — Spanish runs longer *and* the column is tighter, which is where a headline breaks.
