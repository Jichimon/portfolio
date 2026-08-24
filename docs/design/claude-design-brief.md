# Portfolio site — design specification

**Status:** design specification of record, as of 2026-08-23. This document used to be the prompt that started the design process — paste it into Claude Design, run it in two passes, start a fresh session. That job finished on 2026-08-23 after fifteen review rounds. It is now **the document the page-implementation work items read to build the site.**

The artboards in `docs/design/canvas/src/*.dc.html` are **pixel truth.** This document explains why they look the way they do and states what an implementation must not break. Where a claim here and an artboard disagree, believe the artboard — this reconciliation (session 19 and after) exists precisely because the earlier prompt drifted from what fifteen rounds actually produced, and the same risk applies to this document the day someone edits a screen without updating the prose beside it.

**No visible copy states how many of a growing thing there are — including in this document.** Case studies, deep dives, employers, testimonials and technologies are all lists that grow; a count written down today is wrong the day the list changes. `docs/design/canvas/verify.mjs` check 5 enforces this on the screens, sentence-scoped, four-digit years excluded — it is what caught nine such occurrences across four screens in session 17. This document follows the same discipline throughout.

---

## 1. What this is, and what governs what

This is the design specification the page-implementation items build against. It has three layers, in order of authority:

1. **The artboards** (`docs/design/canvas/src/*.dc.html`) — pixel truth. What renders is what ships.
2. **The decision docs** (`docs/design/decisions/*.md`) — the reasoning behind a specific fork, written down once so it is not re-litigated per implementer. Two exist: `2026-08-20-hero-direction.md` (the visual system) and `2026-08-22-site-structure.md` (the page set and the nav).
3. **This document** — the synthesis. It exists so nobody has to read fifteen `progress/` logs to find out why the hero is 11px blurred instead of 20px, or why there is no `/contact` route.

**Constraint sources**, unchanged from the original brief: `ADR-001` (Astro, static, zero-JS default), `ADR-002` (diagrams are pre-rendered SVG, never rendered at build), `ADR-003` (unprefixed `en`, `/es/` Spanish), `ADR-004` (Cloudflare Workers static assets, locale-aware 404), [`ADR-007`](../adr/ADR-007-ui-component-model.md) (`.astro` by default with zero framework JS; Preact via `preact/compat` declared for islands, of which there are **none** at the localhost milestone — the scroll-spy and the theme toggle stay vanilla, exactly as §7 specifies them), `CLAUDE.md` (the thesis), `.claude/rules/20-content.md` (`C-06` no vendor logos or security-vendor names, `C-10` evidence over adjectives, `C-15` the thesis).

**Downstream:** the diagram visual language this document specifies (§8) is what the eleven hand-authored diagram assets build against.

---

## 2. The subject, the thesis, the audience, the voice

Luis Octavio Antelo Mansilla. Backend engineer and solution architect, five years, based in Cochabamba, Bolivia (GMT-4, full overlap with US business hours). Most recently Senior Software Engineer at NICE. Targeting Senior Software Engineer, Senior Backend Engineer, and Solution Architect roles — remote, international, English-speaking.

**The thesis every screen must reinforce:**

> Connecting legacy critical systems to modern services in regulated environments.

Oracle EBS and satellite integrations, on-premise core banking and cloud microservices, legacy PHP alongside .NET on AWS. Four employers, one recurring problem. That specificity is the entire differentiator. A design that makes this read as generic "backend developer / distributed systems" positioning has failed, regardless of how good it looks.

### The audience

Hiring managers, staff engineers and architects at international companies, reading on a laptop, probably for under three minutes, probably with six other tabs open. They are looking for evidence of judgment. They are allergic to portfolio theatre.

### The voice, and what it demands of the design

The content operates on one rule, and the homepage states it as a section heading: **"Evidence, not adjectives."** There are no "passionate about technology" claims anywhere. Every assertion is a decision, a trade-off, a constraint, or a measured outcome.

Four properties the design has to serve:

**Numbers lead.** Every homepage bullet opens with a bolded metric before the sentence explaining it: `~70% projected reduction in monthly run cost.` · `100,000 users in three months.` · `Millions of records, zero production incidents.` · `Millions of users, one platform.` The metric is a typographic event, not a badge or a pill.

**Honesty is a feature, and it must not be buried.** Every case study ends with a section titled **"What I would do differently"** containing real self-criticism. One case study states outright that its headline number is a target that was never measured, because the rollout did not complete. That section carries deliberate visual weight — it is a seniority signal, not an appendix.

**Aphoristic closers.** The prose lands on short, quotable sentences: *"That threshold is reusable. A recommendation is not."* · *"In a bank, the architecture argument is the second argument."* · *"Judgment isn't a title."* · *"That absence is the point of the diagram."* These are pull-quote candidates, treated typographically rather than decoratively — no oversized quotation marks, no tinted callout boxes.

**Two registers, deliberately.** Case studies are clinical and technical. Home and About carry measured warmth — climbing and hiking around Bolivia, amateur boxing, an INTJ-A result offered as a second data point. The design keeps the same sober system throughout; About is the only screen that gets a different *treatment* (a wider reading measure, more air at the close — now realized as an article layout, see §5), never a different visual identity. No stock photography, no sport iconography, no personality graphics — the three photographs About does carry (§9) are the author's own, not illustration.

### Typographic tells in the source, worth honoring

- The middot `·` as an inline separator: `Senior Software Engineer · Cochabamba, Bolivia (GMT-4...) · Open to remote`
- The arrow `→` as a pointer to a linked case study, and inside a role string: `Backend Engineer → Solution Architect`
- Em dashes, used heavily and mid-sentence
- Bold paragraph lead-ins acting as micro-headings: `**Cost.**` `**Control.**` `**Coupling.**` — these appear inside sections and read as structure without becoming a heading level
- En-dashed year ranges: `2023–2025`

---

## 3. The page set

**Superseded original:** the earlier brief specified nine screens including a standalone `contact` page ("43 words on a page. Its shortness is the design problem"). That page does not exist. The structural decision that replaced it is `docs/design/decisions/2026-08-22-site-structure.md`, accepted 2026-08-22; only the consequence for this document is summarized here — read that file for the reasoning.

**The home page is the work page.** There is no `Home` nav item and no separate `/work` route — the wordmark is the way home.

| Route | What it is |
|---|---|
| `/` | Home — hero · Where I've worked · What I've built (`#work`) · Technologies · Get in touch (`#contact`) |
| `/about` | Its own page — an article about the person |
| `/experience` | Its own page — the employer chronology |
| `/case-studies/<slug>` | Five pages — four case studies plus the platform anchor |
| `/writing`, `/architectures`, search | Reserved. In the nav, marked `soon`, not linked |

`Work` and `Contact` are **sections of the home page** (`#work`, `#contact`), not routes. `About` and `Experience` are routes. The five case studies are routes. The three `soon` slots are labels, never links.

`/case-studies` — the index — is **designed and not routed.** With five case studies it would show exactly what home's `What I've built` already shows, so a second page for the same five items is not worth a click. It stays in the canvas (`CaseStudiesIndex.dc.html`) as the growth path: the day a sixth case study lands, or home's work section passes roughly five tiles, routing it is a routing change, not a design round.

**Content still missing, and who owns it:** see §9.

---

## 4. The visual system

### Type

**Space Grotesk at ≥20px only.** Below 20px its weight-axis interpolation reads soft. Confirmed against the artboards: every `Space Grotesk` declaration in the source sits at 20px or above (headings, the hero title, tile titles, pull-quote marks). Below that threshold, nav items, the wordmark, card titles, employer names and eyebrows are set in **IBM Plex Sans** at a bolder weight instead. **IBM Plex Mono** carries labels, metadata and the marquee. This rule is not in the original brief — it is load-bearing for implementation and was decided in session 05.

### Palette

The accent is **wine/burgundy**, not the ~230° cyan-blue the original brief specified — cyan read as a former employer's brand. Confirmed in `Main.dc.html`: `--accent: oklch(42% 0.15 15)` light, `oklch(70% 0.15 15)` dark. A third token, `--label`, gold/ochre — `oklch(52% 0.1 75)` light, `oklch(75% 0.11 75)` dark — was introduced in session 06 for masthead and metadata legibility, deliberately not another blue. Two chromatic tokens, two meanings: accent marks the current thing and the interactive thing; label marks metadata — years, roles, field labels, kickers. (Sessions 05, 06; `docs/design/decisions/2026-08-20-hero-direction.md`.)

### The hero

The seam metaphor survives: one side dense/rigid/legacy (stacked strata), one side open/light/modern (discrete floating nodes), the boundary between them as the actual subject. No real system or vendor logos anywhere (`C-06`) — geometry and behavior carry it.

**The blur is 11px, not ~20px.** The original brief called for "heavily blurred atmospheric layer." That did not survive contact with the artboard: at full atmosphere the metaphor "se pierde todo el sentido" (session 05) — it has to be legible, not merely felt. The strata are tinted with the accent at a light blur; the resolved node graph on the modern side stays sharp. Legible, not merely felt, is the standing rule for the whole motif system (§8).

**No drawn seam marker.** Three treatments were tried and rejected in a row: a blurred glow blob (session 06, read as an unexplained stain with nothing to anchor it), a vertical line with traveling pulses (session 07), a static horizontal line (session 11). Three rejections of one class is information about the class, not bad luck. The seam that shipped is not a drawn element — it is the **overlap of the two layers**: the strata's fade finishes at roughly 55% of the hero width while the node graph starts at 38%, so the graph visually emerges out of the blur rather than being marked by a line.

**Reveal-on-scroll was never built.** The original brief put it back in scope after an earlier over-correction toward stillness. No implementation exists in any artboard. Treat it as unbuilt, not as a design decision against it.

### Technology and employer strips

Unchanged in substance from the original brief: a horizontal marquee of technologies sourced from the real `stack` arrays across the case studies and the platform page, typographic, in loop; an employer strip naming the four real, already-public employers (`NICE`, `Banco Solidario S.A.`, `Mamaya Tech`, `Avícola Sofía`) with their years. What is new is the logo slot — see §6.

---

## 5. The layout system

### The measure rule

```css
main    { flex: 1 1 auto; min-width: 0; }
section { padding: 0 72px; max-width: 1176px; margin-inline: auto; }
.hero   { max-width: none; }                              /* the one section that bleeds */
.hero-content { max-width: 1032px; margin-inline: auto; } /* re-centred on the shared measure */
```

Confirmed verbatim in `Main.dc.html`. **State why, because the wrong version looks equivalent.** Putting the cap on `section > *` loses every child carrying a `margin:` shorthand — a shorthand sets `margin-inline: 0`, both rules land on specificity `(0,1,1)`, and the component rule wins on source order, so the element stays pinned at the padding edge while its siblings centre. A container that centres its own contents is the only version where adding a new block cannot break the alignment by accident. Two wrong homes were tried first: on `main` it cut the hero's bleed; on `section > *` it misaligned every section label. (Session 15.)

### The responsive contract

Four declared states, on every screen — three plus a refinement, and both halves of that sentence matter: the source carries `@media` at 1180px, 820px and 560px (confirmed in `Main.dc.html`), so claiming "three states" alone would contradict the file.

| State | Width | What changes |
|---|---|---|
| wide | >1180px | as approved — 264px rail, full measures |
| medium | 820–1180px | rail narrows to 208px, section padding 72px → 48px, 3-column grids become 2 |
| narrow | <820px | **the rail stops being a rail** — `position: static`, full width, nav becomes one horizontally scrollable row; role, location, socials and the article table of contents drop out; the language switcher **survives** |
| refinement | <560px | small adjustments only — e.g. the 404 hides its motif sides rather than shrinking them to two smudges |

**Top bar over hamburger, deliberately.** Four live nav items and three disabled ones fit a scrollable row. Hiding navigation behind a tap is a cost paid to buy space, and this nav does not need to buy any (confirmed in `Components.dc.html`'s narrow-state annotation). Recorded because the hamburger is the reflex and reflexes need a reason.

Per-screen collapses that are **not** mechanical, each confirmed against its artboard:

- **The bento goes 3 → 2 → 1 with every span reset.** `Main.dc.html`: `.tile-anchor, .tile-wide, .tile-full { grid-column: span 2; }` at ≤1180px, then `{ grid-column: span 1; }` at ≤820px. A leftover `span 2` at one column overflows silently — the reset is not automatic and has to be written at each breakpoint.
- **The home hero drops from 420px min-height at ≤820px**, with the strata and node layers widened (`.strata-bg { width: 76%; }`, `.nodes-bg { width: 82%; }`) so the composition still reads at 390.
- **The article masthead's `100px 1fr` becomes one stacked column** at narrow. Confirmed: the metadata block (`.masthead` in `Components.dc.html`, the equivalent grid in `CaseStudyDetail.dc.html`, `PlatformPage.dc.html` and `CaseStudyMobile.dc.html`) is `grid-template-columns: 100px 1fr` at wide widths.
- **About's photo pair stacks, and the panorama re-crops 21:9 → 3:2**, because a 21:9 frame at 390px is 167px tall and shows nothing.

### About's layout rule

Exactly **two widths**, confirmed in `About.dc.html`: `.col { max-width: 680px; margin-inline: auto; }` governs the headline, the lead, the byline, every paragraph, the pull quote **and the photo pair**; full content width is reserved for the panorama figure alone (`.break-wide`), and nothing else. The panorama is the page's only full-width moment, which is what makes it mean something.

This replaced three alignment schemes on one screen — the author asked "¿cuál es el centro de la página?" and the honest answer was that there had been no rule, only variety (session 16).

---

## 6. The components, and what content each is handed

The full inventory, its class names, its states and what content it is handed live in `Components.dc.html` — the component sheet, assembled last on purpose (once the language switcher, the link row and the severed-seam motif had all landed) rather than for budget. This section states the rules that are easy to miss when building against it.

### The nav is one component with two kinds of item

In-page anchor and route. It must resolve `#work` to `/#work` and `#contact` to `/#contact` when rendered on a page that is not home — confirmed across every non-home artboard (`About.dc.html`, `Experience.dc.html`, `CaseStudyDetail.dc.html`, `PlatformPage.dc.html`, `CaseStudiesIndex.dc.html`, `NotFound.dc.html`, `CaseStudyMobile.dc.html` all link `Work`/`Contact` as `/#work` / `/#contact`; `Main.dc.html` and `HomeES.dc.html`, being home itself, use the bare `#work`). That is the only real complexity the site-structure decision creates, and it is worth naming before someone hard-codes two navs (`docs/design/decisions/2026-08-22-site-structure.md`).

### The frontmatter metadata block — a ruled list, not a card

`grid-template-columns: 100px 1fr`, `--label` gold at roughly 11px, `border-top`/`border-bottom` rules — confirmed as `.masthead` in `Components.dc.html` and its equivalents in `CaseStudyDetail.dc.html`, `PlatformPage.dc.html` and `CaseStudyMobile.dc.html`. A card treatment was tried in session 06 and reverted in session 07.

**Implementation trap worth stating:** a flat sequence of label/value `div`s under `repeat(3, 1fr)` scrambles pairs across row boundaries, because CSS grid auto-placement does not know a label belongs with the value beside it. This is why the metadata block is a two-column ruled list rather than a repeating grid (session 08).

### The bento work section

A mosaic, not a text list or a uniform card grid — tile size carries the hierarchy, so the platform anchor tile is simply bigger than the rest (`.tile-anchor { grid-column: span 2; }`). Each project tile opens with an abstract motif drawn from its own architecture (§8). The diagnosis that produced this: below the hero there was not a single image on the page, and cards alone would not have fixed that (session 12).

### Logo slots

Company and technology marks have three placements, one rule: **the logo is layered on a wordmark that already reads, never a replacement for it** — so a missing logo is never a design problem. Confirmed in `Components.dc.html`:

| Placement | Size | Class |
|---|---|---|
| Home employer card | 32px | `.logo-slot` |
| Experience entry | 38px | `.logo-slot.lg` |
| Home stack strip | 18px (dot fallback, then mark) | `.mark`, `.mark.has-logo` |

The slot is a fixed box, not a natural size — a row of logos at their own dimensions has no optical baseline. `.mark` is the no-logo state (a small dot); `.mark.has-logo` is the 18px form. A placeholder is legible in a static list of four employer cards but reads as breakage in a moving strip of technologies, which is why the employer cards show visible dashed slots while the marquee keeps its dots. (Session 18.)

**`C-06` binds here, and it is the thing that would be forgotten: no named security vendor gets a mark — no identity provider, no liveness or fraud tooling, no OTP provider, not as a logo and not as a label.** The four employers are already public in the frozen content; those vendors never are. Sourcing the actual logo files is unowned work (§9), carrying a per-mark licensing question a design cannot answer.

### The testimonial card

Three testimonial cards exist in `Components.dc.html`, each carrying `[NEEDS INPUT]` placeholder text marked as such. The real LinkedIn recommendations — text, name, title, permalink, both locales — are `TASK 19`'s deliverable; nothing in the design speaks on the author's behalf (`C-01`, `C-04`). The card is deliberately quiet: an oversized quote mark and a name carry it.

### The contact form's four states

The only place on the site where an action can fail: `idle`, `sending`, `sent`, `error` (confirmed: `state: idle | sending | sent | error` in `Components.dc.html`). Two rules do the work:

- **On success the form is gone.** An emptied form sitting beside a success message invites sending the same thing twice, and the second copy always looks worse than the first.
- **On failure the contents survive and a second channel is named.** A failed send that also loses what someone wrote costs them the message twice, and by then they are not writing it again. The fallback address is part of the error state, not a consolation elsewhere on the page.

`sending` **blocks** rather than only dimming (`.is-sending .contact-form { opacity: .5; pointer-events: none; }`) — the visual state and the disabled state are the same fact, so they are one class rather than a class plus a hope. The confirmation is two lines and echoes the address that was typed: once it has sent, the only thing that can still be wrong is where the reply goes, so a typo becomes visible at the one moment the sender can still fix it. The backend is still undecided — a Cloudflare Worker per `ADR-004`, or a plain `mailto:` — and the four states are identical either way, which is why they could be designed before that decision. (Session 18.)

This directly overrules the original brief's **"No contact form... Do not design a form."** That line no longer applies.

### Page versus document

A **page has a rail** — it is somewhere a reader can *be* on the site, so it owes navigation, a locale switch, and copy that behaves like copy. The component sheet is a **document**: no rail, because there is nowhere to navigate to from a specimen, and its prose is *about* the site rather than *of* it, which is why it may quote a rule the pages have to obey. `verify.mjs` derives this from the artboard itself (does it carry `class="rail"`?) rather than from a filename, and scopes three checks by it — one property, never a per-file exception list.

---

## 7. Behaviour that must work

### The scroll-spy contract

One implementation, two hosts: any element carrying `data-spy="<class>"` has its in-page anchors tracked, and that class toggles on the matching `<li>` as the reader scrolls. Home puts it on the nav; the article pages (case studies, the platform page) put it on their own table of contents, because they have sections (`Context`, `Problem`, `Constraints`, …) the site nav cannot name. Roughly 30 lines of vanilla JS; a working reference implementation is present in the canvas source (`data-spy` occurs in `Main.dc.html`, `HomeES.dc.html`, `HomeMobile.dc.html`, `CaseStudyDetail.dc.html`, `PlatformPage.dc.html`, `CaseStudyMobile.dc.html`, `Components.dc.html`).

Four acceptance criteria — full reasoning in `docs/design/decisions/2026-08-22-site-structure.md`, not restated here:

- On a case-study or platform page, scrolling changes which table-of-contents entry is marked current, without a click.
- On home, the same holds for the nav's own in-page items (`Work`, `Contact`).
- Clicking any entry moves to that section and leaves it marked current.
- **With JavaScript disabled the rail is still a working list of links** — tracking is the enhancement, never the mechanism (`ADR-001`).

**Why it does not run in the canvas, stated plainly so the next reader does not conclude it was never wanted:** the Claude Design runtime builds each artboard's DOM programmatically, and a `<script>` element created that way never executes. That is a property of the mockup tool, not a design decision. The author has raised this three times — most recently, quoted in the site-structure decision: *"el scroll y ver en qué sección te encontrás del case-study, en el diseño, sigue igual sin funcionar... eso es algo que en la implementación tiene que servir."* — and called it indispensable.

### The switcher contract

The alternate `href` points at **this page in the other language**, never at the other locale's home: `/about` → `/es/about`, `/case-studies/<slug>` → `/es/case-studies/<slug>` (confirmed: `About.dc.html`'s switcher links `href="/es/about"`, not `/es/`). Being thrown back to the home page on a locale switch is the classic defect, and it is a defect of **data, not styling** — the target is per-screen, not a constant.

On the 404, **neither locale is marked current**, and that is a designed state, not a missing one: a 404 answers every unmatched route in both locales at once, so it cannot read the visitor's language off a URL that failed to match in the first place (confirmed in `NotFound.dc.html`).

There is **no "open state"** for the switcher — the original brief listed one among the system states to design. Two locales make it a switch, not a menu: `EN / ES` in mono, in `.rail-bottom` above the theme toggle, on every page (session 17).

### The bilingual 404

Served with a real `404` HTTP status, never a `200` carrying error copy — a soft 404 gets indexed as a real page (confirmed as an explicit implementation note in `NotFound.dc.html`). Two complete monolingual panels, never interleaved: a reader reads their half and ignores the other. The motif is the severed channel (§8).

---

## 8. The motif vocabulary

Four primitives, all stroked geometry, never glow or gradient: **strata** (what cannot move — dense, horizontal, accumulated, no air between layers), **discrete nodes** (what is new — separated, connected on purpose), the **channel** where the two meet, and the **severed channel** on the 404, with the status code sitting in the gap where the connection should be — a link that does not connect, on a site about connecting things.

**The constraint that produced it: stroked geometry, never glow or gradient.** A stroke survives both themes without a redraw; a glow looks right in dark and falls apart in light. That single constraint is why the hero, every bento tile motif, and the eleven hand-authored diagram replacements (`TASK 6`) can share one visual language instead of three. **No real system or vendor logos anywhere**, including in the hero's legacy/modern metaphor (`C-06`) — geometry and behaviour carry it.

The five tile motifs, each drawn from that project's own architecture (session 12):

- **Platform anchor** — strata, channel, connected node graph: the thesis in miniature.
- **OTP decoupling** — one filled node fanning out to four: delegated authority.
- **QR collections** — one block splitting into three with one detaching on a dashed line: decomposition with the vendor leaving the critical path.
- **Payment data migration** — stack of records → arrow → outlined stack: the migration.
- **Multi-tenant attendance** — four lanes converging into one module: multiple tenants onto one modular monolith.

---

## 9. Content still missing, and who owns it

A section whose content is absent is **omitted from the build**, not filled with a placeholder — no `[NEEDS INPUT]` ever reaches production, and the site looks finished from the first build. The design already marks each of these visibly, so nothing here is a surprise to whoever picks it up.

| Missing | Owner |
|---|---|
| Three LinkedIn recommendations — text, name, title, permalink, both locales | `TASK 19` |
| The About/Experience content split, About's lead paragraph, three photographs (confirmed against `About.dc.html`: a panorama, 21:9, min. 2000px wide, and a photo pair, both 4:5, min. 800×1000) | `TASK 20` |
| The `Get in touch` invite copy, Experience's `h1` and intro line, per-role stack lines | `TASK 20`, blocked here by `H-02` |
| Diagram legibility at published width, in both themes | `TASK 6` |
| Real vendor logos for the marquee and the three logo slots (§6) | unowned, deliberately — the typographic version may simply be better, and sourcing carries a per-mark licensing question a design cannot answer |

**Note on the photographs:** an earlier annotation in `canvas.json` described the third photograph as a 1:1 square. The artboard itself (`About.dc.html`) specifies both non-panorama photographs at 4:5 — a portrait and a travel/landscape shot, forming `.pair`. The artboard is pixel truth; the table above follows it, and the annotation is stale.

---

## 10. Anti-goals, corrected

- No hero image, no stock illustration, no abstract 3D shapes, no animated gradient meshes.
- No skill bars, no percentage-proficiency graphics.
- **Technology logo walls are in scope, as typographic marquee plus optional logo slots (§6)** — not a wall of hunted-down third-party SVG logos.
- **No blog stub, no "services I offer," no pricing.** `writing`, `architectures` and search stay in the nav as marked `soon` destinations, not stub pages pretending to be live.
- No emoji as interface elements.
- **No scroll-jacking, no parallax.** Reveal-on-scroll is permitted in principle but **was never built** — treat it as absent, not as rejected (§4).
- No dark-terminal-with-green-text aesthetic.
- Nothing that implies a metric was measured when the copy says it was projected.
- **No real system or vendor logos anywhere**, including in the hero's legacy/modern metaphor and in the employer/technology logo slots (`C-06`) — no named security vendor (no identity provider, no liveness or fraud tooling, no OTP provider) gets a mark, as a logo or as a label.
- **Superseded, not carried forward:** "No testimonials section" (three testimonial cards exist, §6) and "No contact form" (four form states exist, §6).

---

## 11. Screen inventory

Fifteen artboards across two canvas pages, confirmed against `docs/design/canvas/src/canvas.json` and the files present in `docs/design/canvas/src/`.

### `screens` — live, pass 1 and pass 2

| Artboard | What it is | Notes |
|---|---|---|
| `Main.dc.html` | Home — the work page | Hero, bento work section, marquee, employer strip, contact section |
| `HomeES.dc.html` | Home — Spanish | **Generated**, a length stress test — see below |
| `HomeMobile.dc.html` | Home — 390px | **Generated** from `Main.dc.html` |
| `CaseStudyDetail.dc.html` | Case study detail — `otp-provider-decoupling` | The richest instance: three diagrams including the before/after pair, the honest-outcome frontmatter |
| `CaseStudyMobile.dc.html` | Case study — 390px | **Generated**, the article archetype at narrow width |
| `CaseStudiesIndex.dc.html` | Case studies index | Designed, not routed — see §3 |
| `PlatformPage.dc.html` | Platform anchor — `mobile-banking-platform` | Distinct from the case-study template: a scale stat, a 2-column services grid, `Deep Dives` styled as the parent of its three children |
| `About.dc.html` | About | An article: headline, lead, three photographs, one 680px column |
| `Experience.dc.html` | Experience | The employer chronology, one ruled entry per role |
| `NotFound.dc.html` | 404 — bilingual | Two monolingual panels, the severed-channel motif, neither locale marked current |
| `Components.dc.html` | Component sheet | A document, not a page — no rail. The hand-off inventory: nav, footer, diagram figure, metric block, case-study card, `What I would do differently` block, frontmatter metadata block, bold-lead-in paragraph, pull quote, marquee, employer strip, contact form's four states, motif vocabulary, logo slots |

### `directions` — pass 0 history, kept per `docs/design/canvas/README.md`

| Artboard | What it is |
|---|---|
| `DirectionB.dc.html` | Pass 0 direction B — "Estratos y falla," not chosen outright but its strata texture was folded into the accepted hero |
| `DirectionC.dc.html` | Pass 0 direction C — "Todo pasa por acá," not chosen |
| `DirectionCDark.dc.html` | Direction C in dark mode, not chosen |
| `MobileSeam.dc.html` | A mobile seam test against direction C, superseded once the hero direction changed |

Fifteen files, eleven live, four history — see §12 for the round-by-round trail.

---

## 12. History

Fifteen review rounds, each logged in `progress/`. Session numbers below are the `NN` component of the log's filename.

- **Session 01–03** — the design brief written (session 01), pass 0 v1 rejected outright: *"un Word que se lee desde el navegador"* — the reading-screen register had been applied to the whole site, including the chrome (session 02). Pass 0 v2 accepted with an amendment: direction A's structure carrying direction B's strata texture (session 03; `docs/design/decisions/2026-08-20-hero-direction.md`).
- **Session 04** — pass 1 built: the first four screens.
- **Sessions 05–15** — eleven revision rounds. Type pairing corrected to Space Grotesk ≥20px / IBM Plex Sans below it (05); accent changed from cyan to wine/burgundy, `--label` introduced (05, 06); the seam's glow-blob treatment rejected (06), then its line-with-pulses treatment rejected (07), then a static line rejected (11) — the seam that shipped is the layer overlap, no drawn marker; the metadata block's card treatment reverted to a ruled list, and the grid auto-placement trap found (07, 08); testimonials introduced (09); the bento mosaic and its five architecture-derived tile motifs designed (12); the case-studies index built and its hierarchy (platform anchor as parent, not peer) established (13); the site-structure decision made — home becomes the work page, `/case-studies` designed and not routed, the nav resolves `#work`/`#contact` per-page (15; `docs/design/decisions/2026-08-22-site-structure.md`). **Pass 1 approved 2026-08-22.**
- **Session 16** — About and Experience split outright: About becomes an article about the person, Experience keeps the employer chronology. Layout rule found by asking "¿cuál es el centro de la página?" — two widths, not three schemes.
- **Session 17** — Home in Spanish (`HomeES.dc.html`) built as a length stress test and measured: +10% overall across 37 corresponding strings, `n=37`. The bilingual 404 designed. The "no copy counts a growing thing" rule found and enforced (`verify.mjs` check 5) after nine occurrences were found and fixed across four screens.
- **Session 18** — the component sheet assembled last, on purpose. The contact form's four states designed. Logo slots (32px / 38px / 18px) declared.
- **Session 19** — the design work closed against the backlog. **Pass 2 approved 2026-08-23.**

This document's own origin — a Claude Design prompt run in two passes, starting fresh sessions per pass — is recorded here rather than restated in §1, because that method's job ended with session 19; this reconciliation (the item that produced the document you are reading) is what turned the closed prompt into a specification of record.
