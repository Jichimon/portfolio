# 2026-08-22 · Session 15 — Pass 1, eleventh revision round: full-bleed hero, and the site gets a structure

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS

## The hero now bleeds

Last round's fix for the white band capped `main` at `max-width: 1176px` and centred it. That closed the unpainted-background complaint and opened a new one the author caught immediately: the hero's atmosphere stopped at the cap instead of running from the rail to the right edge of the window.

Both are true at once, and the cap was in the wrong place. **`main` is uncapped again; the measure moved onto the section content:**

```css
main { flex: 1 1 auto; min-width: 0; }
section { padding: 0 72px; }
section > *:not(.hero-bg) { max-width: 1032px; margin-inline: auto; }
```

### …and that broke the section labels, in a way worth recording

Putting the cap on `section > *` looked equivalent and was not. Several section children carry a **margin shorthand** — `.work h2 { margin: 0 0 24px }`, `.standalone-label { margin: 44px 0 16px }`, `.employers h2` — and a shorthand sets `margin-inline` to `0`. Both rules land on specificity `(0,1,1)`, so source order decides, and the component rules come later. The result: every element with a margin shorthand stayed pinned at the padding edge while its siblings centred. The author saw it in one screenshot — *"ahora estos títulos quedan mal alineados"* — with `WHERE I'VE WORKED` at the far left and its cards 300px inboard.

**The cap belongs on the section, not on the section's children:**

```css
main    { flex: 1 1 auto; min-width: 0; }
section { padding: 0 72px; max-width: 1176px; margin-inline: auto; }
.hero   { max-width: none; }                                  /* the one that bleeds */
.hero-content { max-width: 1032px; margin-inline: auto; }     /* re-centred on the shared measure */
```

Now each section is one centred box and its children inherit the alignment from their container instead of each having to opt in — so a future block with its own `margin:` shorthand cannot silently fall out of line (`P-16`). The hero opts out of the cap and re-centres only its copy, which puts `.hero-content` on exactly the same left edge as every section below: `72 + (W − 1176) / 2` either way.

1032px is what the content occupied inside the old 1176px cap, so nothing moves at or below the 1440px design width. The footer keeps a full-width rule on purpose — it closes the page, not the column — with its content on the same measure.

## The structural question, and the answer

The author asked the question that exposed the real problem: *"El Home es la página Work? o porque no hay un Home en el menú? Si el home es la página Work... para qué tendríamos una página aparte con la sección What I've built?"*

They were right that it had sprawled. The nav had no `Home` item because **the home page had no identity** — it was a landing page carrying a bit of everything, so nothing in the nav could name it. And `/case-studies` was showing exactly the five cards home already showed.

**Decided, recorded in `docs/design/decisions/2026-08-22-site-structure.md`: the home page is the work page.** No `Home` nav item, no separate `/work` route, the wordmark is the way home. `Work` and `Contact` are **sections** of home (`#work`, `#contact`); `About` and `Experience` are their own pages; the five case studies are their own pages. Four live destinations, three reserved `soon` slots.

`About` and `Experience` stay separate deliberately: they are long prose, read rather than scanned, and folding them into home would push the work below three screens of biography — inverting the priority the brief set (*land the thesis in eight seconds, the evidence in thirty*).

The cost is stated in the decision rather than hidden: home gets long, and someone who wants only the contact form scrolls past everything. The nav anchors are the mitigation, and that is why `Contact` stays in the nav despite not being a route.

### The index is deferred, not discarded

`/case-studies` is now **designed and not routed**, with an annotation on the canvas saying so. With five case studies it duplicates home. When the list outgrows the home section — roughly eight — home keeps the strongest five and this takes the full list, and **that day is a routing change, not a design round.** The trigger is written down.

### The home page lost its table of contents

The author's own call, and correct: *"en el Home no debería existir el bloque de On this page ya que no aporta nada"*. Once `Work` and `Contact` are nav anchors, a second list of the same destinations is the rail saying the same thing twice. Removed, CSS and all.

The article pages keep theirs — they have sections (`Context`, `Problem`, `Constraints`, …) the site nav cannot name, so there the two lists are genuinely different lists.

### The scroll-spy became one implementation instead of two

Rather than a nav-spy and a TOC-spy, any element carrying `data-spy="<class>"` has its in-page anchors tracked and that class toggled on the matching `<li>`. Home puts `data-spy="active"` on its nav; the article pages put `data-spy="here"` on their TOC. One block of code, two hosts.

## The author's verdict on last round's interactivity

*"no sirve lo de las rutas ni el scroll con la sección de la página activa... pero no hay problema... eso voy a ser más riguroso en la implementación"*.

Confirmed and now recorded on the canvas itself rather than only in a reply: the routes and the scroll-spy are **declared in the markup but do not run inside the Design editor.** The likely cause is that the Design runtime builds the artboard's DOM programmatically, and a `<script>` element created that way does not execute — which also matches the fact that the theme toggle, which goes through the runtime's own `DCLogic` binding, does work. The artboard iframe equally has nowhere to navigate to.

They stay in the source because the implementation inherits them, and the annotation now says plainly that they are a declaration rather than a demo. **Not claimed as working** — the same distinction that mattered in `INC-02`.

## Decisions

- **The measure lives on the section.** Two wrong homes were tried first and both are instructive: on `main` it cut the hero's bleed, and on `section > *` it lost every child carrying a `margin:` shorthand. A container that centres its own contents is the only version where adding a new block cannot break the alignment by accident.
- **Home is the work page.** Backed the author's instinct rather than defending the built index — three excellent pages beat four with one that earns nothing (`P-17`).
- **The index stays in the canvas.** Deleting a designed screen because it is not needed *today* means redesigning it later; keeping it with a written trigger costs one annotation.
- **The dead scroll-spy stays, labelled.** Removing it would delete the specification of a behaviour the author called important; leaving it unlabelled would be claiming it works.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["docs/design/decisions/2026-08-22-site-structure.md", "progress/2026-08-22-15-task8-design-pass1-revisions11.md", "canvas.json annotations record the structure and the declared-not-working caveat"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 212 files, 6 exclusions"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 PASS; check-trace fails on the same TASK 12 pre-existing correlation gap, unrelated to this change"], reason: "H-03 forbids editing evidence/ to work around it; TASK 12 owns the fix" }
  tests:      { status: passed, evidence: ["anchor/id integrity over the generated preview — 16 in-page anchors, 0 dangling, 0 duplicate ids, 3 data-spy hosts, 2 TOC blocks (articles only), main uncapped on home"] }
  scope:      { status: passed, evidence: ["hero bleed fixed at the root cause; the structure question answered with a decision doc rather than a reply; the home TOC removed as the author asked"] }
  loose_ends: { status: passed, evidence: ["the deferred index carries a written trigger; the non-functioning routes/spy are labelled on the canvas rather than left to be rediscovered"] }
  mutation:   { status: not_applicable, reason: "no mutation-covered surface touched" }
  security:   { status: not_applicable, reason: "no boundary, guard or permission changed" }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions / follow-ups

- **The nav is one component with two kinds of item** — anchor and route — and it must render `#work` as `/#work` when it is not on home. Named in the decision doc so nobody ships two navs.
- **`min-width: 1024px` on the board is a stopgap.** Below that the layout has no defined behaviour yet; the mobile artboards are where that gets decided.
- **Which five case studies stay on home** when the index is finally routed is undecided, and deliberately so — there are only five today.
- Carried forward: diagram text legibility; the "Get in touch" copy change (`H-02`); contact form backend; real logos for the marquee; mobile artboards; `home.es` stress test; `TASK 19`'s testimonial text; motifs unreviewed at real size.

## Next

Author reviews the bleed and the new structure. Then: mobile for the 4 screens and the `home.es` stress test.

## Files changed

`docs/design/canvas/src/Main.dc.html` — uncapped `main`, measure moved onto `section` (after a first attempt on `section > *` mis-aligned every child with a `margin:` shorthand), `.hero` opts out and re-centres its copy, footer keeps a full-width rule; on-this-page block and its CSS removed; nav items `Work`/`Contact` become in-page anchors with `data-spy`; generalized scroll-spy.
`docs/design/canvas/src/CaseStudyDetail.dc.html`, `PlatformPage.dc.html` — `Work`/`Contact` and the back link repointed at `/#work` and `/#contact`; TOC carries `data-spy`; generalized scroll-spy.
`docs/design/canvas/src/CaseStudiesIndex.dc.html` — same nav repointing.
`docs/design/canvas/src/canvas.json` — structure decision recorded in the screens annotation, with the declared-not-working caveat; new annotation marking the index as designed-not-routed with its trigger.
`docs/design/decisions/2026-08-22-site-structure.md` — new decision doc.
`progress/2026-08-22-15-task8-design-pass1-revisions11.md` — this log.
