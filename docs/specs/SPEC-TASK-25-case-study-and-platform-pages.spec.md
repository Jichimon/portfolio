# SPEC-TASK-25: Case study and platform pages — `/case-studies/[slug]` and `/es/case-studies/[slug]`

```yaml
spec_id: SPEC-TASK-25
title: Case study and platform pages
status: active
version: 1.1
date: 2026-08-26
approved_version: 1.1
work_item: TASK-25
intent: "Route the five article entries in both locales through two type-keyed templates, deriving the table of contents, the masthead, the diagram figures and the deep-dive grid from the entry's own frontmatter and body rather than from anything written into a template."

tdd: required
tdd_rationale: "Five new modules land in site/lib/content/**, which 30-testing scopes as mutation-covered and names ':::diagram resolution' in explicitly. Parsing a directive body, splitting a body at its last h2, extracting a link list and joining slugs against the route set are exactly the parsing/joining/deciding surface D3 scoped."

governed_by:
  - ADR-002
  - ADR-006
  - ADR-007
  - ADR-008

related_docs:
  - docs/design/canvas/src/CaseStudyDetail.dc.html
  - docs/design/canvas/src/CaseStudyMobile.dc.html
  - docs/design/canvas/src/PlatformPage.dc.html
  - docs/design/canvas/src/Components.dc.html
  - docs/design/decisions/2026-08-22-site-structure.md
  - docs/content-conventions.md

depends_on_author:
  - "resources/site/ui.{en,es}.md gains two strings in the `article:` group — `part_of` and `figure_prefix` — before CASE-006 and CASE-003 can render their copy. `resources/**` is frozen (H-02), so this is an author hand-off, same shape as TASK 49 and TASK 50. Until they land, both behaviors ship the block WITHOUT the affected clause rather than with an invented one (S-01, C-01)."

behaviors:
  - id: CASE-001
    given: "the five entries in the caseStudies collection — four of `type: case-study`, one of `type: platform` — each present in both locales"
    when: "the site builds"
    then: "`/case-studies/<slug>` and `/es/case-studies/<slug>` exist for every one of them, and each renders through the single template that its `type` selects"
    priority: critical
    status: implemented
    edge_cases:
      - "one template file per `type`, never one per entry"
      - "the route set is the one `deriveRouteSetFromEntries` already returns — no page enumerates a slug"
      - "an entry whose `type` matches no template fails the build naming the type, rather than falling back to a default"
      - "the language switcher resolves on both templates, because `getAlternateHref` can now find the alternate's route"
    tests:
      - "routes.smoke.spec.ts::every live route returns 200"
      - "case-study-pages.smoke.spec.ts::each type renders its own template"

  - id: CASE-002
    given: "an article body whose sections are `##` headings, with `###` subheadings inside some of them"
    when: "the page renders"
    then: "every `##` heading carries a deterministic URL-safe id derived from its own text, the rail renders one table-of-contents entry per `##` heading pointing at that id, and the list is marked `data-spy` so the existing scroll-spy tracks it"
    priority: critical
    status: implemented
    edge_cases:
      - "`###` headings are NOT in the table of contents — the artboards give them no id and no entry"
      - "two headings with identical text get distinct ids; the second is suffixed, deterministically"
      - "ids are generated from the heading text in the entry's OWN locale — `## Contexto` and `## Context` produce different ids, and that is correct"
      - "the table of contents is built from the same heading list the body renders, never from a second parse that could disagree"
      - "the label above the list is `ui.article.toc_heading`, never a literal"
    tests:
      - "toc.test.mjs::derives one entry per h2"
      - "toc.test.mjs::ignores h3"
      - "toc.test.mjs::disambiguates duplicate heading text"

  - id: CASE-003
    given: "a `:::diagram{id type}` directive whose body is a caption line or lines, optionally followed by a line beginning `Spec:` and its continuation"
    when: "the page renders"
    then: "the directive becomes `<figure class=\"diagram\">` holding an `<img src=\"/diagrams/<id>.svg\">` and a `<figcaption>` carrying the caption text — and every line from `Spec:` onward is dropped from the output entirely"
    priority: critical
    status: implemented
    edge_cases:
      - "**The `Spec:` half is an instruction to whoever draws the diagram and must never reach a reader.** `docs/content-conventions.md` §Diagram tags is the convention this implements; the default remark-directive behavior renders all children, which would publish `Spec: show the cloud/on-premise boundary explicitly…` on a public page. That is the defect this edge case exists to prevent."
      - "the `<img>`'s `alt` is the caption text — the only string available for it; there is no other source and none is invented (S-01)"
      - "a directive with no caption line before `Spec:` renders the figure with no figcaption and an empty alt, rather than falling back to the id or the `Spec:` text"
      - "`type` is metadata carried on the element and does not change the resolution — every value, `table` included, resolves to one `.svg`"
      - "figures are numbered per article, and the numbering prefix uses `ui.article.figure_prefix`; while that string is absent the caption renders unprefixed"
    tests:
      - "diagram-directive.test.mjs::splits caption from Spec"
      - "diagram-directive.test.mjs::drops every Spec continuation line"
      - "diagram-directive.test.mjs::caption becomes alt"
      - "diagram-directive.test.mjs::directive with only a Spec body yields no figcaption"

  - id: CASE-004
    given: "eleven `.svg` files in `resources/diagrams/` and eleven `:::diagram` directives across the five entries"
    when: "the site builds"
    then: "every referenced id resolves to a copy of its `.svg` served at `/diagrams/<id>.svg`, and a directive naming an id with no file on disk fails the build with an error naming that id"
    priority: critical
    status: implemented
    edge_cases:
      - "the copy is a plain file copy at build time — no rendering, no Puppeteer, no runtime resolution (ADR-002 sub-decision 2)"
      - "an id referenced from both locales copies once, not twice"
      - "`resources/**` is read-only (H-02) — the build reads from it and writes only into the site's own output"
      - "the copy destination is the build output, not a tracked directory: no `.svg` is duplicated into the working tree, so nothing new needs gitignoring and no copy can go stale against its source"
      - "a missing id is a build error, never a broken `<img>` that renders as a silent gap"
    tests:
      - "diagram-assets.test.mjs::resolves every referenced id"
      - "diagram-assets.test.mjs::throws naming the missing id"
      - "diagram-assets.test.mjs::deduplicates an id referenced twice"

  - id: CASE-005
    given: "an entry carrying some of `role`, `context`, `period`, `outcome` and `stack` in its frontmatter"
    when: "the template renders the masthead"
    then: "one label/value row appears for each key that is present, labelled from the matching `ui.article.*` string, in the artboards' order"
    priority: critical
    status: implemented
    edge_cases:
      - "**the row set is derived from the keys present, never from a hardcoded list** (P-13) — `mobile-banking-platform` carries no `outcome` and must show four rows, the case studies carry it and show five"
      - "`stack` is an array and joins with the separator the artboards use; the other four are strings"
      - "a key present but empty is treated as absent"
    tests:
      - "article-masthead.test.mjs::omits the row for an absent key"
      - "article-masthead.test.mjs::joins the stack array"
      - "article-masthead.test.mjs::preserves artboard row order"

  - id: CASE-006
    given: "an entry of `type: case-study` that appears in the platform's deep-dive list, an entry of `type: case-study` that does not, and the `platform` entry"
    when: "the template renders the category tag above the title"
    then: "the platform shows `ui.article.platform_tag`; a case study shows `ui.article.case_study_tag`, extended with the parent platform's title when — and only when — that platform's deep-dive list names it"
    priority: critical
    status: implemented
    edge_cases:
      - "**the child-to-parent relation is the inverse of CASE-010's list, computed once, not a second parse** — no frontmatter carries it and none can be added (H-02)"
      - "`multi-tenant-biometric-attendance` belongs to no platform and shows the bare tag"
      - "the connective copy is `ui.article.part_of`; **until the author adds it, the parent clause is omitted and the bare tag ships** — an absent string is an absent block, never an invented one (S-01, C-01)"
    tests:
      - "deep-dives.test.mjs::maps each child slug back to its parent"
      - "deep-dives.test.mjs::a standalone case study has no parent"

  - id: CASE-007
    given: "any article page"
    when: "it renders"
    then: "a back link to the home page's work section appears above the title, labelled `ui.article.back_to_work`, its href derived from the route set for the page's own locale"
    priority: normal
    status: implemented
    edge_cases:
      - "the Spanish page links to the Spanish home, not the English one"
    tests:
      - "case-study-pages.smoke.spec.ts::back link targets the local home"

  - id: CASE-008
    given: "the platform entry, carrying `scale: \"+100,000s\"` and `scale_caption: \"active users\"`"
    when: "the platform template renders its header"
    then: "the figure and its caption render as two stacked elements beside the title block, exactly as the artboard's scale block draws them"
    priority: normal
    status: implemented
    edge_cases:
      - "**the content's own words are printed verbatim** — the artboard reads `100,000s` / `active users on the platform`, the frontmatter reads `+100,000s` / `active users`, and the frontmatter wins. Editing either is a content change and is not in this item (C-01)"
      - "`scale` with no `scale_caption` renders the figure alone"
      - "the case-study template never renders these keys; no case-study entry carries them"
    tests:
      - "case-study-pages.smoke.spec.ts::the platform header carries the scale block"

  - id: CASE-009
    given: "an entry with a `skills` array"
    when: "the template renders"
    then: "the skills render as an unlabelled chip list below the article content"
    priority: normal
    status: implemented
    edge_cases:
      - "**no heading and no label** — none of the eleven artboards names this section, and inventing a label is what the design-fidelity criterion forbids"
      - "an entry with no `skills` renders no chip list at all, rather than an empty container"
      - "the values are content slugs (`legacy-integration`) and print as the content carries them; a display mapping would be new copy outside `resources/**` (S-01)"
    tests:
      - "case-study-pages.smoke.spec.ts::skills render with no label"

  - id: CASE-010
    given: "the platform body's `## Deep dives` section — a heading followed by exactly the three markdown links naming its child case studies"
    when: "the platform template renders"
    then: "the section is removed from the rendered body, and a card grid renders in its place: one card per link, its copy taken from the linked entry's OWN frontmatter (`title`, `role`, `period`) and its href re-derived from the route set for the page's locale"
    priority: critical
    status: implemented
    edge_cases:
      - "**the section must not render twice.** The grid is built from the body, so the body's own heading and list are stripped — otherwise the page shows the cards and then the plain list underneath"
      - "**the href in the markdown is discarded.** Both locales write `/case-studies/<slug>`; rendering that literally sends a Spanish reader to the English page. The slug is the only thing read out of the link; the path comes from the route set, and `localizeInternalHref` handles any internal link that survives elsewhere in a body"
      - "the card's heading is the child entry's `title`, not the markdown link text — they agree today, and the frontmatter is the source that stays correct if one changes"
      - "a link naming a slug with no entry fails the build naming the slug"
      - "the grid's heading is `ui.article.deep_dives`; the body's own `## Deep dives` heading is stripped with the section — note it is written in English in BOTH locales today, which is a separate content finding and is recorded, not fixed here (H-02)"
      - "an entry with no `## Deep dives` section renders no grid and no error — the case-study template hits this on all four of its entries"
    tests:
      - "deep-dives.test.mjs::extracts three slugs from the section"
      - "deep-dives.test.mjs::returns empty for a body with no section"
      - "deep-dives.test.mjs::throws naming a slug with no entry"
      - "deep-dives.test.mjs::strips the section from the body it returns"

  - id: CASE-011
    given: "an article body whose final `##` section is the self-critique — `What I would do differently` in English, `Qué haría distinto hoy` in Spanish"
    when: "the template renders"
    then: "that final section renders inside the distinct block the artboards give it, and the sections before it render as ordinary prose"
    priority: normal
    status: implemented
    edge_cases:
      - "**the split is positional, never keyed on heading text or id** — the heading differs per locale, so an id-keyed rule would style the English page and silently miss the Spanish one"
      - "on the platform this is evaluated AFTER CASE-010 strips the deep-dives section, which makes the self-critique the last section on both types and both locales — one rule, four cases"
      - "the section still appears in the table of contents, with its own id, like any other `##`"
      - "a body whose last section is something else still renders correctly, in the block; a wrong guess here is a styling defect, not a content one"
    tests:
      - "article-sections.test.mjs::splits the body at its last h2"
      - "article-sections.test.mjs::splits after deep dives are removed"

  - id: CASE-012
    given: "the platform body's services section — a `##` heading followed by a list whose every item opens with a bold name and an em-dash description"
    when: "the platform template renders"
    then: "that list renders as the artboard's two-column services grid, name over description, rather than as a bullet list"
    priority: normal
    status: implemented
    edge_cases:
      - "**the rule is structural, not positional or textual** — a list is a services grid when every one of its items opens with `<strong>` followed by an em dash. That property is locale-independent and checkable"
      - "the rule applies only in the platform template; the case-study bodies carry lists of the same shape and must keep rendering as prose lists"
      - "a list where only some items match is left as an ordinary list"
      - "**this is the least certain behavior in the spec.** If the structural rule proves fragile, the honest fallback is to render the list as prose and record the grid as a declared design-fidelity deviation, rather than to key it on a heading that changes per locale"
    tests:
      - "article-sections.test.mjs::detects a bold-lead definition list"
      - "article-sections.test.mjs::rejects a mixed list"

  - id: CASE-013
    given: "an article page at 390px carrying a diagram whose intrinsic width exceeds the viewport"
    when: "the page renders"
    then: "the figure scrolls horizontally inside its own container and the page body never scrolls sideways"
    priority: critical
    status: implemented
    edge_cases:
      - "this is `TASK 25`'s own Done clause and the failure it prevents is a page that is horizontally scrollable end to end at mobile width"
      - "the container, not the image, owns the overflow"
    tests:
      - "case-study-pages.smoke.spec.ts::no horizontal body scroll at 390"

  - id: CASE-014
    given: "`guards.config.json`'s `site.pendingRoutes`, which today names all five article slugs with the reason `TASK 25's Deliverable`"
    when: "this item ships"
    then: "those five entries are removed, `about` and `experience` remain, and the smoke tier's expect-200 set grows by ten routes without any spec file naming a slug"
    priority: critical
    status: implemented
    edge_cases:
      - "the smoke tier already fails loudly if a route is live while still listed pending — that is the mechanism, not a new check"
      - "`about` and `experience` stay pending; they belong to the next page item"
    tests:
      - "routes.smoke.spec.ts::live and pending sets are disjoint and complete"

  - id: CASE-015
    given: "`check-site` running over the tree with both templates in it"
    when: "the gate runs"
    then: "no reader-visible string is declared outside `resources/**`, no colour or breakpoint literal appears outside the token stylesheet, no comment under `site/**` cites anything outside it, no module outside the gateway imports `astro:content`, and no directory reaches the seven-file cap"
    priority: critical
    status: implemented
    edge_cases:
      - "**`site/` root is at 6 of 6 today** (`TASK 47`) — every new module in this item lands under `site/lib/content/**` or `site/src/**`, and nothing new goes in the root. Two new subfolders are created for context, not for overflow"
      - "`site/src/components/home/` is also at the cap; the article components get their own `article/` folder, which names a context"
      - "the deep-dive card hrefs come from the route set, so no source file contains a path naming a real slug"
    tests:
      - "check-site, run over the real tree"

constraints:
  - "**Two templates, one file each:** `CaseStudyDetail.astro` for `type: case-study`, `PlatformPage.astro` for `type: platform`. Neither carries the other's logic, and neither carries per-entry logic."
  - "**Every parse lands in `site/lib/content/**`, framework-free** (S-06), because that is the surface `node:test` runs and Stryker mutates. The `.astro` templates receive derived props and parse nothing themselves."
  - "**The mutation floor is 74.5 and this item may not lower it** (T-03). New `lib/` code arrives with its own battery; a surviving mutant is a finding, not a statistic."
  - "**Nothing new in `site/` root.** It holds six files against a cap of six (`TASK 47`). New modules go under `site/lib/content/diagrams/`, `site/lib/content/entries/` and `site/src/components/article/`."
  - "**Every reader-visible string comes from `resources/**`** (S-01). Where the design shows copy that `ui.{en,es}.md` does not carry, the block ships without it and the string is requested from the author — never invented, never approximated."
  - "**Every route comes from the collection** (S-02). No source file writes a path naming a real slug."
  - "**Locale parity in the same change** (C-09). Both locales of every route, every component and every string ship together."
  - "**The diagram pipeline is registered once**, in `astro.config.mjs`, as a remark-directive transform plus the heading-id plugin. Never per component, never per article."
  - "**`resources/**` is not edited by this item.** The two `ui` strings it needs are an author hand-off, and the item ships useful without them."

out_of_scope:
  - "The `/case-studies` index route — designed, deliberately unrouted until the list outgrows the home section at roughly eight items."
  - "The artboards' `.pair-label` device — `Diagram 1 of 2 · before`. **No content field carries it and none can be added** (H-02), so reproducing it would mean inventing copy (S-01). Declared as a design-fidelity deviation rather than faked."
  - "The artboards' hand-drawn HTML comparison table for `type: table` diagrams. `ADR-002` resolves every diagram to one static SVG; the richer artboard form is not reproduced."
  - "Pixel-level artboard diffing with tolerance — owned by the design-fidelity harness item."
  - "The About, Experience and 404 pages — owned by the next page item, which also owns removing their `pendingRoutes` entries."
  - "Any correction to the Spanish platform body's untranslated `## Deep dives` heading — a content finding, recorded here, owned by a content item."
```

## Intent

Route the five article entries — four case studies and one platform overview — at `/case-studies/<slug>` and `/es/case-studies/<slug>`, through two templates keyed on `type`. Everything on the page is derived: the table of contents from the body's own `##` headings, the masthead rows from whichever frontmatter keys the entry carries, the diagram figures from the `:::diagram` directives, the deep-dive grid from the platform body's own link list, and every label from `ui.{en,es}.md`.

The markup is the easy half. The work is the pipeline, and it is concentrated in four parses that all read the same body and must not disagree with each other: the heading list that feeds the table of contents, the directive bodies that split into a caption and a private drawing spec, the deep-dive section that must be lifted out before the body renders, and the positional split that gives the self-critique its own block. Each one is a pure function over an entry, which is why they live in `site/lib/content/**` under the mutation gate rather than inside a template.

## Behaviors

### CASE-001 — Routes and template dispatch · `critical` · `implemented`

- **Given** five entries, two locales · **When** the site builds · **Then** ten article routes exist, each rendering through the template its `type` selects.
- **Governed by:** ADR-008 · **Tests:** `routes.smoke.spec.ts`, `case-study-pages.smoke.spec.ts`

### CASE-002 — Heading ids and the rail table of contents · `critical` · `implemented`

`##` only. The artboards give `###` no id and no entry, and the scroll-spy contract is the `data-spy` attribute [scroll-spy.mjs](../../site/src/behaviour/scroll-spy.mjs) already implements — this behavior builds the list it tracks, not the tracking.

- **Governed by:** ADR-007, ADR-008 · **Tests:** `toc.test.mjs`

### CASE-003 — The diagram directive, and the half of it that must never ship · `critical` · `implemented`

`docs/content-conventions.md` §Diagram tags defines the block's body as *caption, then `Spec:` for whoever draws it*. Remark-directive's default renders every child, so the naive implementation publishes the drawing instructions. The caption is also the only string available for `alt`, which is why an absent caption yields an absent figcaption and an empty alt rather than a fallback.

- **Governed by:** ADR-002 · **Tests:** `diagram-directive.test.mjs`

### CASE-004 — Asset resolution and the loud missing id · `critical` · `implemented`

Eleven directives, eleven SVGs. `ADR-002` is explicit that a missing id is a build error naming the id, not a silent gap. The copy targets the build output rather than a tracked directory, so no SVG is duplicated into the working tree.

- **Governed by:** ADR-002 · **Tests:** `diagram-assets.test.mjs`

### CASE-005 — The masthead, derived from the keys present · `critical` · `implemented`

Five rows on a case study, four on the platform, because the platform carries no `outcome`. Deriving the set from the entry rather than listing it is `P-13` applied to a template.

- **Governed by:** ADR-008 · **Tests:** `article-masthead.test.mjs`

### CASE-006 — The category tag and the parent it names · `critical` · `implemented`

The artboard prints `Case study · part of Rebuilding a bank's mobile platform in-house`. `ui.article` carries `case_study_tag` and `platform_tag`; it does not carry the connective. That string is an author hand-off, and until it exists the bare tag ships.

- **Governed by:** ADR-008 · **Tests:** `deep-dives.test.mjs`

### CASE-007 — Back to work · `normal` · `implemented`

### CASE-008 — The platform's scale block · `normal` · `implemented`

Already resolved in content: `scale` and `scale_caption` are two keys, added when the home page's tile needed them. `TASK 25`'s register entry still describes this as an open decision — it is stale, and this row is the reconciliation (`P-07`).

### CASE-009 — Skills, unlabelled · `normal` · `implemented`

### CASE-010 — Deep dives: lift the section, rebuild the links · `critical` · `implemented`

Three defects share this behavior and each is a real one: the section rendering twice, the Spanish cards pointing at English pages, and the card copy drifting from the entry it names. All three come from treating the markdown as the source of the rendered thing rather than as the source of three slugs.

- **Governed by:** ADR-008 · **Tests:** `deep-dives.test.mjs`

### CASE-011 — The self-critique block · `normal` · `implemented`

Positional, because the heading text is `What I would do differently` in one locale and `Qué haría distinto hoy` in the other. Stripping the deep-dives section first makes *last `##` section* correct for all four combinations of type and locale.

### CASE-012 — The platform's services grid · `normal` · `implemented`

The structural rule — every list item opens bold followed by an em dash — is locale-independent and checkable, which the alternatives are not. It is also the behavior most likely to need the fallback its edge case names.

### CASE-013 — Diagrams scroll, pages do not · `critical` · `implemented`

### CASE-014 — Flipping the pending routes · `critical` · `implemented`

### CASE-015 — The `check-site` invariants · `critical` · `implemented`

## Constraints and invariants

See the `constraints:` block. Four are worth restating because they constrain *where code goes*, which is what decides whether the mutation gate sees it:

**The parses live in `site/lib/content/**`.** [30-testing.md](../../.claude/rules/30-testing.md) names `:::diagram` resolution in the mutated surface explicitly. A parse written inside an `.astro` file is invisible to Stryker, and this item's whole risk surface is parses.

**`site/` root is full.** Six files, cap six (`TASK 47`). This item adds nothing there. `astro.config.mjs` is edited, not joined.

**`site/src/components/home/` is also at six.** The article components get `site/src/components/article/`, a folder that names a context rather than absorbing overflow — which is the distinction `S-03` actually cares about.

**Two `ui` strings are missing and the item ships without them.** `article.part_of` and `article.figure_prefix`. `resources/**` is frozen for every agent, so these are an author hand-off. The behaviors that want them degrade to a shorter block, never to an invented string.

## Out of scope

See the `out_of_scope:` block. Two entries are omissions rather than deferrals, and are called out because they are visible: the artboards' `.pair-label` above each figure, and the hand-drawn comparison table for `type: table`. Neither is reproducible from content that exists, and `H-02` means content that does not exist cannot be added by this item. They are declared as design-fidelity deviations so the artboard diff reads them as decisions rather than as defects (`P-15`).

## Test plan

Written one behavior at a time — red, green, refactor, next — not as a batch.

| Test (file::name) | Type | Scenario covered | Behavior(s) | Status |
|---|---|---|---|---|
| `toc.test.mjs::derives one entry per h2` | unit | five `##` headings → five entries, in order | CASE-002 | implemented |
| `toc.test.mjs::ignores h3` | unit | a section with two `###` yields no extra entries | CASE-002 | implemented |
| `toc.test.mjs::disambiguates duplicate heading text` | unit | two `## Approach` → two distinct ids | CASE-002 | implemented |
| `toc.test.mjs::ids are locale-native` | unit | `## Contexto` → `contexto`, not `context` | CASE-002 | implemented |
| `diagram-directive.test.mjs::splits caption from Spec` | unit | caption line + `Spec:` line → caption only | CASE-003 | green |
| `diagram-directive.test.mjs::drops every Spec continuation line` | unit | the platform's four-line body → one caption | CASE-003 | green |
| `diagram-directive.test.mjs::caption becomes alt` | unit | `alt` equals the caption text | CASE-003 | green |
| `diagram-directive.test.mjs::directive with only a Spec body yields no figcaption` | unit | no caption line present | CASE-003 | green |
| `diagram-assets.test.mjs::resolves every referenced id` | unit | eleven directives → eleven resolved paths | CASE-004 | green |
| `diagram-assets.test.mjs::throws naming the missing id` | unit | an id with no `.svg` | CASE-004 | green |
| `diagram-assets.test.mjs::deduplicates an id referenced twice` | unit | same id in both locales → one copy | CASE-004 | green |
| `article-masthead.test.mjs::omits the row for an absent key` | unit | platform entry, no `outcome` → four rows | CASE-005 | green |
| `article-masthead.test.mjs::joins the stack array` | unit | seven-item `stack` → one joined value | CASE-005 | green |
| `article-masthead.test.mjs::preserves artboard row order` | unit | role, context, period, outcome, stack | CASE-005 | green |
| `deep-dives.test.mjs::extracts three slugs from the section` | unit | the platform body's `## Deep dives` | CASE-010 | green |
| `deep-dives.test.mjs::returns empty for a body with no section` | unit | a case-study body | CASE-010 | green |
| `deep-dives.test.mjs::throws naming a slug with no entry` | unit | a link to a slug nothing defines | CASE-010 | green |
| `deep-dives.test.mjs::strips the section from the body it returns` | unit | body out has no `## Deep dives` | CASE-010 | green |
| `deep-dives.test.mjs::maps each child slug back to its parent` | unit | three children → one parent title | CASE-006 | green |
| `deep-dives.test.mjs::a standalone case study has no parent` | unit | `multi-tenant-biometric-attendance` | CASE-006 | green |
| `article-sections.test.mjs::splits the body at its last h2` | unit | case-study body → prose + critique | CASE-011 | green |
| `article-sections.test.mjs::splits after deep dives are removed` | unit | platform body → critique is last | CASE-011 | green |
| `article-sections.test.mjs::detects a bold-lead definition list` | unit | the six-item services list | CASE-012 | green |
| `article-sections.test.mjs::rejects a mixed list` | unit | one item without the bold lead | CASE-012 | green |
| `case-study-pages.smoke.spec.ts::each type renders its own template` | e2e | platform header vs. case-study masthead | CASE-001 | green |
| `case-study-pages.smoke.spec.ts::back link targets the local home` | e2e | `/es/…` page links to `/es/` | CASE-007 | green |
| `case-study-pages.smoke.spec.ts::the platform header carries the scale block` | e2e | figure and caption present | CASE-008 | green |
| `case-study-pages.smoke.spec.ts::skills render with no label` | e2e | chip list, no heading above it | CASE-009 | green |
| `case-study-pages.smoke.spec.ts::the deep-dives section renders once` | e2e | grid present, raw list absent | CASE-010 | green |
| `case-study-pages.smoke.spec.ts::no Spec text reaches the page` | e2e | no rendered text begins `Spec:` | CASE-003 | green |
| `case-study-pages.smoke.spec.ts::no horizontal body scroll at 390` | e2e | `scrollWidth === clientWidth` on `body` | CASE-013 | green |
| `routes.smoke.spec.ts::every live route returns 200` | e2e | ten new article routes | CASE-001 | green |
| `routes.smoke.spec.ts::live and pending sets are disjoint and complete` | e2e | `pendingRoutes` holds only `about`, `experience` | CASE-014 | green |
| `check-site` over the real tree | integration | string, token, import, comment and file-cap assertions | CASE-015 | green |
| `npx stryker run` | mutation | the six new `lib/` modules, floor 74.5 | CASE-002 … CASE-012 | green |

**Coverage gaps:** `CASE-013`'s assertion proves the page does not scroll sideways; it does not prove the *figure* scrolls rather than clipping. That half is a design-fidelity read against `CaseStudyMobile.dc.html`, owned by this item's verification step, not by a test. Stated because silence reads as coverage (`P-03`).

## Traceability

| Behavior | Priority | Status | Test(s) | Test written first? | ADR |
|---|---|---|---|---|---|
| CASE-001 | critical | implemented | `routes.smoke`, `case-study-pages.smoke` | n/a — e2e | ADR-008 |
| CASE-002 | critical | implemented | `toc.test.mjs` ×4 | yes — required | ADR-007, ADR-008 |
| CASE-003 | critical | implemented | `diagram-directive.test.mjs` ×4, `case-study-pages.smoke` | yes — required | ADR-002 |
| CASE-004 | critical | implemented | `diagram-assets.test.mjs` ×3 | yes — required | ADR-002 |
| CASE-005 | critical | implemented | `article-masthead.test.mjs` ×3 | yes — required | ADR-008 |
| CASE-006 | critical | implemented | `deep-dives.test.mjs` ×2 | yes — required | ADR-008 |
| CASE-007 | normal | implemented | `case-study-pages.smoke` | n/a — e2e | ADR-008 |
| CASE-008 | normal | implemented | `case-study-pages.smoke` | n/a — e2e | ADR-008 |
| CASE-009 | normal | implemented | `case-study-pages.smoke` | n/a — e2e | ADR-008 |
| CASE-010 | critical | implemented | `deep-dives.test.mjs` ×4, `case-study-pages.smoke` | yes — required | ADR-008 |
| CASE-011 | normal | implemented | `article-sections.test.mjs` ×2 | yes — required | ADR-008 |
| CASE-012 | normal | implemented | `article-sections.test.mjs` ×2 | yes — required | ADR-008 |
| CASE-013 | critical | implemented | `case-study-pages.smoke` | n/a — e2e | ADR-008 |
| CASE-014 | critical | implemented | `routes.smoke` | n/a — config | — |
| CASE-015 | critical | implemented | `check-site` | n/a — guard | ADR-008 |

## Drift log

| Date | What diverged | Spec or code corrected | Note |
|---|---|---|---|
| 2026-08-26 | **The 1.0 draft covered eight behaviors and missed nine of `ui.article`'s ten strings**, the diagram body's caption/`Spec:` split, the deep-dives section rendering twice, the Spanish cards pointing at English routes, the services grid, the self-critique block, the narrow-width diagram scroll and the `pendingRoutes` flip. Its behavior and test statuses used a vocabulary (`unimplemented`) that `SPEC-TEMPLATE.md` does not define, and its traceability table had replaced the template's columns. | **This spec**, rewritten to **1.1** before any approval. | Found by reading the artboards and `ui.{en,es}.md` against the draft. `approved_version` was never set, so nothing was built against 1.0 — the drift is between a draft and reality, which is the cheapest place for it to be. |
| 2026-08-26 | **The file name tripped a guard.** The 1.0 draft was `SPEC-TASK-25-case-study-platform-templates.spec.md`, and `isTemplate()` discovers templates by matching `/TEMPLATE/i` against the basename — so `check-templates` classified the spec as a document template and failed the gate with two findings. | **The file name**, to `SPEC-TASK-25-case-study-and-platform-pages.spec.md`. | The guard is correct and property-based (`P-13`); the name was the defect. Recorded because the next spec whose subject is templates will hit it again. |
| 2026-08-26 | **`TASK 25`'s register entry describes `scale` as an unresolved decision** — *"one content string and the artboard prints it as two"*. It was resolved when the home item added `scale_caption`; the entry was never reconciled. | **This spec** records the resolved state in `CASE-008`; the register entry is corrected at wrap-up. | `P-07`: a living document that still claims an old state is the half of reconciliation that gets skipped. |
| 2026-08-26 | **The spec was written against a markdown pipeline this repository does not have.** `CASE-002`, `CASE-003`, `CASE-010`, `CASE-011` and `CASE-012` all assume remark and rehype; Astro 7 ships `satteri`, and `markdown.remarkPlugins` is deprecated in favour of `markdown.processor`. Container directives are a built-in feature there, so `remark-directive` is not a dependency at all. | **Neither.** Every behaviour is reachable unchanged — only the mechanism moved, and it was verified against the real processor with two spikes before any production code was written. | The spec describes what the page does, not which library does it, which is why nothing in it had to move. Recorded so the next reader does not go looking for a remark plugin. |
| 2026-08-26 | **The spec's constraint block names two new folders; three were needed.** `site/lib/content/entries/` holds four files, and `toc`, `article-sections`, `article-masthead` and `deep-dives` with their tests is eight more — over the seven-file cap. | **The tree.** `deep-dives` joined `entries/` (6 files); `toc`, `article-sections` and `article-masthead` went to a new `site/lib/content/articles/` (6 files); the diagram pair went to `site/lib/content/diagrams/` (4 files). | `articles/` names a context — the article body's own structure — rather than absorbing overflow, which is the distinction `S-03` cares about. |
| 2026-08-26 | **`CASE-005` says the row set is "never from a hardcoded list", and the implementation carries an ordered list of the five masthead keys.** | **Neither, and the tension is recorded rather than resolved by wording.** WHICH rows appear is derived from the entry, which is what the edge case is about and what its tests assert. The ORDER they appear in is a design decision and is declared. | An alternative was considered and rejected: deriving the order from the key order of the `article` group in the interface strings. It is more purely derived and it makes a content file's YAML key order silently load-bearing on the design. |
| 2026-08-26 | **`CASE-013`'s coverage gap turned out to be closeable.** The spec records that the figure-scrolls half is a design-fidelity read rather than a test. | **The test plan.** `case-study-pages.smoke.spec.ts` asserts the figure's computed `overflow-x` and that its `scrollWidth` exceeds its `clientWidth`, alongside the body-does-not-scroll assertion. | The gap was real when written; it stopped being one once the figure had a container to measure. |
