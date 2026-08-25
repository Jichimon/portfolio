# SPEC-TASK-23: Tokens and the layout shell

```yaml
spec_id: SPEC-TASK-23
title: Tokens and the layout shell — the rail, the footer, and the two declaration sites
status: shipped
version: 1.0
date: 2026-08-24
approved_version: 1.0
work_item: TASK-23
intent: "Every page shares one token stylesheet, one rail and one footer — and two build-time assertions make 'declared once' a property the repository checks rather than a convention it hopes for."

tdd: required
tdd_rationale:

governed_by:
  - ADR-001
  - ADR-003
  - ADR-006
  - ADR-007
  - ADR-008
related_docs:
  - docs/design/canvas/src/Components.dc.html
  - docs/design/canvas/src/Main.dc.html
  - docs/design/decisions/2026-08-22-site-structure.md
  - resources/site/ui.en.md

behaviors:
  - id: SHELL-001
    given: "a token stylesheet declaring every colour, breakpoint and type step once"
    when: "any other stylesheet or component under site/ names a colour or a breakpoint as a literal"
    then: "check-site reports it as a finding, and the token names it checks against are read from the stylesheet rather than from a list"
    priority: critical
    status: implemented
    edge_cases:
      - "a literal inside the token stylesheet itself is correct, not a finding"
      - "a colour keyword inside a comment is prose, not a declaration"
      - "an SVG presentation attribute (stroke, fill) naming var(--accent) passes; naming #14140F does not"
      - "adding a twelfth token requires no edit to the guard or its config"
    tests:
      - "site-structure.test.mjs::token literals"
  - id: SHELL-002
    given: "a visitor with a stored theme preference, or none"
    when: "any page loads"
    then: "the resolved theme is applied to the document before first paint, persists across navigation, and the toggle names its destination rather than its current state"
    priority: critical
    status: implemented
    edge_cases:
      - "no stored preference: the system preference decides, and storing nothing is a valid state"
      - "localStorage throws or is unavailable: the page renders in the system theme rather than failing"
      - "a stored value that is neither light nor dark is ignored, not applied"
      - "with JavaScript disabled the page still renders in a complete, readable theme"
    tests:
      - "theme.component.test.ts::resolve"
      - "theme.component.test.ts::persist"
  - id: SHELL-003
    given: "the nav's structure declared once as data — order, target, and whether an item is an anchor, a route or reserved"
    when: "the rail renders on a page that is not the home page"
    then: "an anchor item resolves to /#work rather than #work, a route item is unchanged, and a reserved item renders as a span carrying its tag, never as a link"
    priority: critical
    status: implemented
    edge_cases:
      - "on the home page an anchor stays a bare fragment, so the browser does not navigate"
      - "in Spanish an anchor resolves to /es/#work, not /#work"
      - "a reserved item has no href at all — a link that goes nowhere is worse than a label that admits it"
      - "the item list is data: adding one changes no markup"
    tests:
      - "nav-structure.test.mjs::kinds"
      - "nav-structure.test.mjs::anchor resolution"
  - id: SHELL-004
    given: "a page that exists in both locales"
    when: "the rail renders its language switcher"
    then: "the inactive locale links to the same page in the other language, joined on slug, and never to the other locale's home"
    priority: critical
    status: implemented
    edge_cases:
      - "a page with no counterpart is a build failure, not a link to /"
      - "the switcher survives below 820px where the socials do not"
      - "a third state exists in which neither locale is current — the 404 owns it, and this item must not make it unreachable"
    tests:
      - "the gateway's existing alternate join, exercised through a real build"
  - id: SHELL-005
    given: "a host element carrying data-spy and in-page anchors below it"
    when: "the visitor scrolls"
    then: "the class named by data-spy is on exactly one item — the section currently in view — without a click"
    priority: critical
    status: implemented
    edge_cases:
      - "clicking an entry moves to that section and leaves it marked current"
      - "exactly one item is marked at any scroll position, including above the first section and below the last"
      - "a host whose anchors resolve to nothing is skipped rather than throwing"
      - "two hosts on one page are tracked independently, because the article template will have both"
    tests:
      - "scroll-spy.component.test.ts::marks"
      - "scroll-spy.component.test.ts::two hosts"
  - id: SHELL-006
    given: "a browser with JavaScript disabled"
    when: "any page renders"
    then: "the rail is a working list of links, the language switcher works, and no element depends on a script having run"
    priority: critical
    status: implemented
    edge_cases:
      - "no nav item is hidden until a script reveals it"
      - "the theme toggle is the one control that does nothing, and it must not render as broken"
    tests:
      - "asserted at build: the emitted HTML carries the full rail before any script tag"
  - id: SHELL-007
    given: "the four breakpoints the artboards carry"
    when: "the viewport crosses 1180, 820 or 560"
    then: "the rail is a sidebar above 820 and a top bar below it, and nothing has a fixed width floor"
    priority: normal
    status: partial
    tests:
      - "judged by the author against the artboards; mechanized by the fidelity item, which does not exist yet"
  - id: SHELL-008
    given: "the interface strings collection"
    when: "the rail or the footer prints any string a reader can see"
    then: "that string came from the collection through the gateway, and no .astro file outside the gateway declares one"
    priority: critical
    status: implemented
    edge_cases:
      - "punctuation and separators are not strings a reader reads — a slash between locales is structure"
      - "a locale code shown in the switcher (EN / ES) is a language tag, and is declared as data rather than copy"
      - "an aria-label is a visible string for this purpose, because a screen reader reads it"
    tests:
      - "site-structure.test.mjs::visible strings"
  - id: SHELL-009
    given: "the two new assertions above"
    when: "check-site runs against a tree that violates either"
    then: "it exits non-zero and names the file, the line and which rule was broken"
    priority: critical
    status: implemented
    edge_cases:
      - "proven against the real tree, not only fixtures — a planted literal and a planted string, both restored byte-identically"
      - "the guard denies rather than passing when its own config cannot be read"
    tests:
      - "site-structure.test.mjs::red battery"

constraints:
  - "The canvas repeats its token block in every .dc.html. Correct for eleven independent mockups, a defect here. Do not carry it across."
  - "Class names are block, element, variant, state. The canvas's mockup shorthand (hd, grp, lbl, k, v, sw) is not carried across; the fidelity diff is structural and stylistic, never name equality."
  - "Zero islands. The rail is server-rendered because it must work without JavaScript; the theme must resolve before first paint, which hydration cannot do by definition."
  - "The scroll-spy is generalized over data-spy from the start, because the article template drives its table of contents with the same implementation under a different class."
  - "No visible string states how many of a growing thing there are."
  - "guards.config.json is the orchestrator's, not the implementer's. Its new entries arrive with their reasons written."

out_of_scope:
  - "Any page body. This item renders the shell and one placeholder slot; the home, article and About/Experience items fill it."
  - "The design-fidelity diff. Its own item, behind the milestone."
  - "The contact form's four states. mailto: is the shipped answer until the Worker item."
  - "The /case-studies index. Designed and deliberately not routed."
  - "Raising the mutation threshold. The ratchet item owns the burn-down; this item only must not lower the floor."
```

## Intent

Every page on this site shares four things: a set of colour and type tokens, a rail, a footer, and a responsive contract. Today none of them exist, and every page item in the backlog is blocked behind them. That makes this the bottleneck of the localhost milestone rather than one item among several.

The harder half is not the markup. It is that two of this repository's implementation rules have been sitting at rung 4 — judgment — because there was nothing to check them against. `S-05` says design tokens are declared in one stylesheet and no colour or breakpoint literal appears outside it. `S-01` says no string a reader can see is declared outside `resources/**`. Both were written against a site that did not exist yet, and both promised a mechanism this item owes. This is the first moment there is a stylesheet to derive tokens from and markup to scan for strings, so it is the moment those promises come due.

**A correction to the registry travels with this item.** `50-implementation.md` said this item owed *"the Stylelint assertion behind `S-05`"*. `ADR-008` is the stated origin of that row and it never chose Stylelint — the word does not appear in it. A rule asserting a mechanism its origin does not support is what `G-10` exists to prevent, so the row is corrected here rather than quietly satisfied by something else.

## Behaviors

### SHELL-001 — the token stylesheet is the only place a colour or a breakpoint is written · `critical` · `implemented`

- **Given** one stylesheet declaring every token · **When** any other file under `site/` writes a colour or breakpoint literal · **Then** `check-site` reports it.
- **The token names are derived from the stylesheet**, never listed in the guard or its config. A twelfth token must cost no edit — that is the difference between this and a roster that passes forever in silence (`P-13`).
- **What counts as a colour:** `#hex`, `rgb(`, `rgba(`, `hsl(`, `oklch(`. **What counts as a breakpoint:** a `max-width:` or `min-width:` inside an `@media`.
- **Governed by:** `ADR-008` · **Tests:** `site-structure.test.mjs::token literals`

### SHELL-002 — the theme resolves before first paint · `critical` · `implemented`

- **Given** a stored preference or none · **When** a page loads · **Then** the theme is on the document before anything paints.
- This is the reason the toggle is not an island: hydration happens after paint by definition, so the resolution has to be a blocking inline script, and once that script exists the button beside it is a button (`ADR-007`).
- The label names the **destination** — "Dark mode" while light — because a switch that names where it is leaves the reader guessing what it does.
- **Storage can fail**, and that is not exotic: a private window, blocked site data, or a browser that throws on access. The page must render in the system theme rather than break.
- **Governed by:** `ADR-007` · **Tests:** `theme.component.test.ts::resolve`, `::persist`

### SHELL-003 — one nav component, three kinds of item · `critical` · `implemented`

- **Given** the nav's structure declared once as data · **When** the rail renders anywhere that is not home · **Then** `#work` resolves to `/#work`, a route is unchanged, and a reserved item is a `span`.
- The site-structure decision names this as *"the only real complexity the decision creates, and it is worth naming before someone hard-codes two navs."* It is written as data for exactly that reason.
- **In Spanish an anchor resolves to `/es/#work`.** The locale prefix and the fragment compose; neither is special-cased.
- **Governed by:** `ADR-008` · **Tests:** `nav-structure.test.mjs::kinds`, `::anchor resolution`

### SHELL-004 — the language switcher points at this page, not at home · `critical` · `implemented`

- **Given** a page with a counterpart · **When** the switcher renders · **Then** the inactive locale links to the same page in the other language.
- Being thrown back to the home page is the classic locale-switch defect, and the component sheet calls it *"a defect of data"* — which is why the target is per-page and comes from the collection's slug join rather than from a constant.
- **A missing counterpart is a build failure**, not a fallback to `/`. The content core already asserts locale parity and already caught a real defect with it.
- **Governed by:** `ADR-003` · **Tests:** exercised through a real build

### SHELL-005 — position tracking, generalized over `data-spy` · `critical` · `implemented`

- **Given** a host carrying `data-spy` · **When** the visitor scrolls · **Then** exactly one item carries the named class.
- The author has raised this five times and called it the one indispensable interaction. It does not work in the canvas and structurally cannot — the Design runtime builds each artboard's DOM programmatically, so a plain `<script>` never executes. That is a property of the mockup tool, which is precisely why the behaviour is written here instead of inferred from a mockup that appears to lack it.
- **Generalized from the start**, because the article template drives its table of contents with the same implementation under `data-spy="here"`. Building it against the nav alone would mean rewriting it one item later.
- **Governed by:** `ADR-007` · **Tests:** `scroll-spy.component.test.ts::marks`, `::two hosts`

### SHELL-006 — no JavaScript is a supported state, not a degraded one · `critical` · `implemented`

- **Given** JavaScript disabled · **When** any page renders · **Then** the rail is a working list of links.
- Tracking is the enhancement, never the mechanism (`ADR-001`). The theme toggle is the single control that does nothing, and it must not render as broken.
- **Tests:** the emitted HTML carries the full rail before any script tag

### SHELL-007 — three rail states across four breakpoints · `normal` · `partial`

- Above 820 the rail is a sidebar; below it, a top bar. 1180 and 560 adjust density and type without changing the shape.
- **The register says three states and the artboards carry four breakpoints.** They do not disagree: 560 is a refinement inside narrow, not a fourth state. All four are implemented, and "three states" is read as the rail's layout contract.
- **Tests:** judged by the author against the artboards. The mechanism is the fidelity item, which does not exist yet — stated rather than left silent (`P-03`).

### SHELL-008 — every chrome string comes from the collection · `critical` · `implemented`

- **Given** the interface strings collection · **When** the rail or footer prints anything a reader can see · **Then** it came through the gateway.
- **An `aria-label` counts**, because a screen reader reads it. Punctuation does not — a slash between two locale codes is structure.
- **Tests:** `site-structure.test.mjs::visible strings`

### SHELL-009 — both assertions are proven in red against the real tree · `critical` · `implemented`

- A guard seen only to pass has not been tested (`P-14`, `T-04`). Fixtures are necessary and not sufficient: the route-literal guard added by the content-layer item found a real violation on its first run against the real tree, and that is the standard here.
- **Tests:** `site-structure.test.mjs::red battery`, plus a real-tree run with a planted literal and a planted string, both restored byte-identically.

## Constraints and invariants

Listed in the block above. Three deserve emphasis because they are the ones most likely to be lost in translation from the canvas:

**The canvas is a mockup set, not a codebase.** Eleven artboards each repeat the whole token block, and each uses two-letter class names. Both are correct there and would be defects here. Criterion 3 makes the design the specification for markup and CSS, and the fidelity diff it names is structural and stylistic — explicitly never name equality.

**`guards.config.json` belongs to the orchestrator.** The implementer owns the guard and its tests; the config's new entries — the token stylesheet's location, the set of human-readable attributes — arrive with their reasons written, the same way `routeDeclarationSites` did.

**The floor may not fall.** Two new mutated functions land in `scripts/guards/lib/`, and the mutation surface was widened one item ago. The threshold is re-measured once, in the shared verification pass, against a run that includes all of it.

## Out of scope

Everything in the block above. Two are worth naming with their owner, because they will look like gaps:

- **The page bodies.** This item renders the shell and a slot. The home, article and About/Experience items fill it — and each is blocked on this one, which is why the shell is not allowed to grow into them.
- **The fidelity diff.** `SHELL-007` is the one behavior this item cannot mechanize, and it says so rather than claiming a check it does not have.
