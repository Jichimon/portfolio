# Design decision — site structure and navigation

**Status:** Accepted 2026-08-22, by the author, after they asked the question that exposed the problem: *"El Home es la página Work? o porque no hay un Home en el menú? Si el home es la página Work... para qué tendríamos una página aparte con la sección What I've built?"*
**Scope:** Governs the site's page set, the nav's contents, and what is a route versus a section. Downstream of the visual system in `2026-08-20-hero-direction.md`; upstream of every implementation item.

## The decision

**The home page is the work page.** There is no `Home` nav item, and there is no separate `/work` route.

| Destination | What it is |
|---|---|
| `/` | Home. Hero · Where I've worked · **What I've built** · Technologies · Get in touch |
| `/about` | Its own page |
| `/experience` | Its own page |
| `/case-studies/<slug>` | Five pages — four case studies plus the platform anchor |
| `/writing`, `/architectures`, search | Reserved. In the nav, marked `soon`, not linked |

The nav therefore carries **four live destinations and three reserved slots**, and two of the four — `Work` and `Contact` — are **sections of the home page** (`#work`, `#contact`), not routes. The wordmark is the way home.

`/case-studies` — the index — is **designed and not routed.** See below.

## Why

**The nav had no Home item because the home page had no identity.** It was a landing page carrying a bit of everything, so nothing in the nav could name it. Making it the work page gives it one: a visitor who clicks `Work` and a visitor who lands on `/` arrive at the same place, and that is correct for a portfolio whose entire argument is the work.

**Four employers, five case studies, one thesis — that fits on one page.** Splitting it across a landing page and an index page bought a second click and no new information.

**`About` and `Experience` stay separate because they are read, not scanned.** They are long prose with no metric-led structure; folding them into home would push the work below three screens of biography, which inverts the priority the brief set (*"land the thesis in eight seconds and the evidence in thirty"*).

**The cost, stated plainly:** the home page gets long, and a visitor who wants only the contact form scrolls past everything. The nav anchors are the mitigation, and they are why `Contact` stays in the nav even though it is not a route.

## The index is the growth path, not dead work

With five case studies, `/case-studies` shows exactly what home's `What I've built` already shows. A second page for the same five items earns nothing, so it is not routed.

It stays in the canvas because the day the list outgrows the home section — roughly eight or more — home keeps the strongest five and the index takes the full list. **On that day this is a routing change, not a design round.** The screen is designed, the card language is shared with home, and the only new decision left is which five stay.

**Trigger:** a sixth case study lands, or the home page's work section passes ~5 tiles.

## Consequences for implementation

- **The nav is one component with two kinds of item** — in-page anchor and route — and it must resolve `#work` to `/#work` when it renders on a page that is not home. That is the only real complexity the decision creates, and it is worth naming before someone hard-codes two navs.
- **Scroll-spy applies to the nav, not to a separate table of contents,** on the home page. The rail already lists the home's sections; a second list of the same destinations would be the rail saying the same thing twice. The author caught this: *"en el Home no debería existir el bloque de On this page ya que no aporta nada"*.

### Position tracking is a required behaviour, not a nice-to-have

The author has now raised this three times, most recently on 2026-08-22: *"el scroll y ver en qué sección te encontrás del case-study, en el diseño, sigue igual sin funcionar... eso es algo que en la implementación tiene que servir"*.

It does not work **in the Claude Design canvas** and will not: the Design runtime builds each artboard's DOM programmatically, and a `<script>` element created that way never executes. That is a property of the mockup tool, not a design decision, and it is exactly why this is written down here instead of being left to be rediscovered from a canvas that appears to lack the feature.

**Acceptance, on the implementation item that builds the rail:**

- On a case-study or platform page, scrolling changes which table-of-contents entry is marked current, without a click.
- On the home page, the same is true of the nav's own in-page items (`Work`, `Contact`).
- Clicking any entry moves to that section and leaves it marked current.
- With JavaScript disabled the rail is still a working list of links — position tracking is the enhancement, never the mechanism (`ADR-001`: zero-JS default, islands opt-in).

The canvas source already carries a working reference implementation of exactly this — a `data-spy="<class>"` host whose in-page anchors are tracked and whose matching `<li>` gets that class. It is ~30 lines of vanilla JS and it runs in the local preview. Reuse it or replace it, but the behaviour above is the contract.
- **The article pages keep their table of contents.** They have sections (`Context`, `Problem`, `Constraints`, …) that the site nav cannot name, so there the two lists are genuinely different lists.
- **`← Work` on a case study returns to `/#work`,** not to an index page that is not routed.

## What was rejected

- **A separate `/work` route with home as a teaser.** It is the conventional shape and it is the one to adopt later, from the index screen already designed. Today it would mean two pages showing five identical cards.
- **Folding About and Experience into home as sections.** Would have made a single-page site, which suits the rail pattern the author liked, but buries the evidence under the biography.
- **Adding a `Home` nav item alongside `Work`.** Two nav entries pointing at the same page is the symptom, not the fix.
