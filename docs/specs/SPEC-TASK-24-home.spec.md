# SPEC-TASK-24: Home — `/` and `/es/`, rendered from content

```yaml
spec_id: SPEC-TASK-24
title: Home
status: active
version: 1.1
date: 2026-08-25
approved_version: 1.0
work_item: TASK-24
intent: "Turn the two index routes from a bare shell into the designed home page, with every list, count and string derived from resources/ rather than written into a template."

tdd: required
tdd_rationale:
reproduces:

governed_by:
  - ADR-002
  - ADR-003
  - ADR-006
  - ADR-007
  - ADR-008
related_docs:
  - docs/design/canvas/src/Main.dc.html
  - docs/design/canvas/src/HomeMobile.dc.html
  - docs/design/canvas/src/HomeES.dc.html
  - docs/design/canvas/src/Components.dc.html
  - docs/design/decisions/2026-08-22-site-structure.md

behaviors:
  - id: HOME-001
    given: "every case study carries an `order` integer in its frontmatter, both locales"
    when: "the home page asks the content layer for the case-study catalog"
    then: "entries come back ascending by `order`, not alphabetically by slug"
    priority: critical
    status: implemented
    edge_cases:
      - "a case study missing `order` fails the build loudly, rather than sorting to an arbitrary position"
      - "two case studies sharing an `order` value fails the build — a tie is a content defect, not something to break silently"
      - "`order` values need not be contiguous; 1,2,4,8 sorts the same as 1,2,3,4"
      - "the en and es halves of a pair carry the same `order`; a mismatch fails the build"
    tests:
      - "case-study-catalog.test.mjs::orders by the order field"
      - "case-study-catalog.test.mjs::throws when an entry has no order"
      - "case-study-catalog.test.mjs::throws on a duplicate order"

  - id: HOME-002
    given: "five case studies whose `stack` arrays hold twenty distinct values with overlaps"
    when: "the stack strip asks for the technology set"
    then: "it receives the union of every `stack` array, deduplicated by exact string, in a deterministic order"
    priority: critical
    status: implemented
    edge_cases:
      - "the same value in two case studies appears once"
      - "`AWS` and `AWS Fargate` are different strings and both appear — no alias map, decided 2026-08-25"
      - "an entry with an empty or absent `stack` contributes nothing and does not throw"
      - "the Spanish catalog yields the Spanish values, since some are translated"
    tests:
      - "case-study-catalog.test.mjs::unions stack values across entries"
      - "case-study-catalog.test.mjs::deduplicates by exact string"
      - "case-study-catalog.test.mjs::tolerates an entry with no stack"

  - id: HOME-003
    given: "the catalog in published order"
    when: "the work section renders"
    then: "entries with `featured: true` render in the primary bento and entries with `featured: false` render in a second group beneath the standalone label"
    priority: critical
    status: implemented
    edge_cases:
      - "if no entry is non-featured, the standalone label and its group are absent entirely — not an empty container"
      - "if no entry is featured, the primary bento is absent"
      - "the `type: platform` entry takes the wide tile treatment; `type: case-study` entries take the numbered tile"
    tests:
      - "home.smoke.spec.ts::home renders both bento groups in "<lang>""

  - id: HOME-004
    given: "the home page built from the five current case studies"
    when: "a sixth case-study pair is added to resources/ and the site is rebuilt"
    then: "the bento and the stack strip both include it, with no edit to any template or component"
    priority: critical
    status: implemented
    edge_cases:
      - "no visible string on the page states how many case studies, employers or technologies exist"
      - "a sixth entry with no motif renders without a motif rather than falling back to another entry's"
    tests:
      - "manual build proof, recorded in the work log — add, build, observe, remove"

  - id: HOME-005
    given: "no structured employer list exists anywhere in resources/"
    when: "the home page renders"
    then: "the employers section is absent from the DOM entirely"
    priority: critical
    status: implemented
    edge_cases:
      - "absent means no section element, no heading and no empty row — not a hidden or placeholder block"
      - "the four employer names are not written into any template, in either locale"
    tests:
      - "home.smoke.spec.ts::home has no employers section in "<lang>""

  - id: HOME-006
    given: "no testimonials content file exists"
    when: "the contact section renders"
    then: "the testimonials column is absent and the contact column occupies the layout alone"
    priority: critical
    status: implemented
    edge_cases:
      - "no NEEDS INPUT marker reaches the rendered page in either locale"
      - "the contact column's own layout is correct with the column gone, at all three widths"
    tests:
      - "home.smoke.spec.ts::home has no testimonials block in "<lang>""

  - id: HOME-007
    given: "the hero background composition and the per-tile motifs are decorative SVG"
    when: "a component renders one"
    then: "it receives it as a prop, and a tile with no motif renders without one"
    priority: normal
    status: implemented
    tests:
      - "covered by HOME-004's build proof"

  - id: HOME-008
    given: "no contact Worker exists"
    when: "the contact form is submitted"
    then: "it opens the visitor's mail client via `mailto:`, and no sending, sent or error state is rendered"
    priority: critical
    status: implemented
    edge_cases:
      - "no success state is shown that the site cannot actually know occurred"
      - "the email address is read from content, never written into the template"
    tests:
      - "home.smoke.spec.ts::contact form targets mailto and renders no result state in "<lang>""

  - id: HOME-009
    given: "home.en.md and home.es.md"
    when: "`/` and `/es/` are built"
    then: "each renders from its own locale's content file and its own locale's interface strings, and the language switcher on each points at the other"
    priority: critical
    status: implemented
    edge_cases:
      - "the Spanish route is the length stress test — no overflow or clipped text at any of the three widths"
      - "in-body links in Spanish prose resolve to the /es/ route"
    tests:
      - "home.smoke.spec.ts::both index routes return 200 and cross-link to each other"

  - id: HOME-011
    given: "a bento of three columns, and a featured group whose tiles carry different base widths"
    when: "the group is laid out"
    then: "the last tile grows into whatever its row has left, so no group of any size leaves a hole beside it"
    priority: normal
    status: implemented
    edge_cases:
      - "a group that already fills its rows exactly is left alone"
      - "a lone tile takes the full width rather than a fraction of a row"
      - "a base span wider than the grid is capped, never allowed to overflow its row"
      - "one column is a real grid — the narrowest layout — not an error"
    tests:
      - "bento-spans.test.mjs, nine cases"

  - id: HOME-010
    given: "the new components"
    when: "`check-site` runs"
    then: "no visible string is declared outside resources/, no colour or breakpoint literal appears outside the token stylesheet, and no route literal naming a real slug appears in any source file"
    priority: critical
    status: implemented
    edge_cases:
      - "the tile numbers are digits, not letters, so the string guard does not fire — they are derived from position within the featured group, not typed"
      - "case-study tile links are built from the derived route set, never written out as a path naming a slug"
    tests:
      - "check-site, run over the real tree"

constraints:
  - "resources/** is read-only to every agent (H-02). The `order` field is added by the author before this spec is implemented."
  - "The content layer's alphabetical sort is replaced, not supplemented. Alphabetical is deterministic, looks plausible and is wrong."
  - "Class names are block/element/variant/state (S-04). The canvas's mockup shorthand is not carried across."
  - "Component styles stay scoped to their component, media queries included (S-05)."
  - "No directory under site/** reaches seven files (S-03)."
  - "No comment references anything outside site/** (S-08)."
  - "Zero Preact islands — ADR-007. Everything here is server-rendered .astro."

out_of_scope:
  - "The employers strip's content — owned by the About/Experience content split item."
  - "The testimonials content — owned by the testimonials item."
  - "A real form submission — owned by the contact Worker item."
  - "The case-studies index route, and the case-study and platform article templates."
  - "Artboard pixel diffing with tolerance — owned by the design-fidelity harness item."
```

## Intent

The two index routes currently render the shell and nothing else: rail, footer, themes, no body. This spec fills them in from `resources/`, following `Main.dc.html` as the specification rather than as a reference.

The item's real difficulty is not markup. It is that three of the six designed sections have no data behind them yet, and the two lists that do have data are ordered or shaped wrongly by the layer that supplies them. Getting those right is what makes a sixth case study a pair of `.md` files and nothing else.

## Behaviors

See the `behaviors:` block above. `HOME-001`, `HOME-002` and `HOME-011` land in `site/lib/`, which is the mutation-covered surface, so all three are written test-first. The remaining behaviors are presentation and are asserted by the build, `check-site` and the e2e tier. **`HOME-011` was added after approval** — it is listed here rather than left to be inferred from the drift log, because a reader who takes this sentence at face value would conclude the spec covers ten behaviors and that the span derivation is somebody's undocumented addition.

### How `HOME-004` is achieved, and what it does not require

`HOME-004` reads like it demands new decoupling between the UI and data access. It does not: the pipeline `ADR-008` mandates is already built and already enforced, and this item consumes it rather than extending it.

```text
resources/**  →  content.config.ts  →  src/gateway/*  →  lib/content/*  →  props  →  component
```

`S-02` keeps `astro:content` inside the gateway; `S-06` keeps `site/lib/**` framework-free and forbids it importing from `src/`. Both are `check-site` assertions at rung 2. A sixth case study therefore arrives through the same path the five current ones do, and a component never learns what loaded its data.

**The separation does not exist to reduce shipped JavaScript, and reasoning about it that way leads to the wrong trade-offs.** `output: 'static'` runs the whole of that chain at build time. Measured on the current build, 2026-08-25: the home page loads **four modules totalling ~3.7 KB** — the layout's inline bootstrap, a preload helper, the theme module and the scroll-spy — and every one of them is there for *interaction*, not for data. Sorting the catalog, unioning the stack values and joining the locale pair cost **zero bytes at runtime**.

What the boundary buys instead is two things, and both are the reason it is a rule rather than a preference:

- **It is the only reason the core is testable at all.** `node:test` runs it and Stryker mutates it precisely because nothing in it imports Astro. A module that reaches for `astro:content` leaves both nets in one line.
- **A content defect has one place to live.** Already paid for once, and recorded: the locale-pair assertion in the core caught the `generateId` collision on first contact with real content — a defect that made entries *disappear* rather than merely fail to pair.

Shipped JavaScript is governed by a different decision entirely: `ADR-007`'s zero Preact islands, which this item does not change.

**The known cost of the boundary, stated rather than implied:** the gateway's `UiStringGroups` interface is transcribed by hand from the interface-strings frontmatter. That is a second declaration site for a *shape* — not for a datum — and nothing checks it, so it drifts the day a group gains a key. Out of scope here; named so it is not discovered as a surprise.

## Constraints and invariants

**The two decisions taken with the author on 2026-08-25, so nothing below re-litigates them.**

*Published order comes from content, not from code.* An `order` integer per case study, both locales. The alternative — a curated order module in `site/lib/` — was rejected because a sixth case study would then need a code edit, which criterion 1 forbids. Deriving from `type` + `featured` + `period` was rejected because two entries share the same period and the tie-break would be arbitrary.

*The stack strip renders the full union, unnormalised.* An alias table collapsing the AWS variants into one was rejected as a roster that goes stale the day a new stack value lands. The stated cost: both the general and the specific value render, where the artboard's curated fifteen showed only one. The artboard is a mockup and its curation was a human pass, not a rule — reproducing it would mean maintaining that pass forever.

## Out of scope

See the `out_of_scope:` block. Three sections are omitted rather than faked, per the standing decision that a section is omitted when its content is absent — which is the content-driven constraint doing real work rather than a concession.

## Test plan

| Test (file::name) | Type | Scenario covered | Behavior(s) | Status |
|---|---|---|---|---|
| `case-study-catalog.test.mjs::orders by the order field` | unit | five entries in scrambled input order come back 1..5 | HOME-001 | passing |
| `case-study-catalog.test.mjs::throws when an entry has no order` | unit | one entry missing `order` | HOME-001 | passing |
| `case-study-catalog.test.mjs::throws on a duplicate order` | unit | two entries carrying the same value | HOME-001 | passing |
| `case-study-catalog.test.mjs::orders independently per locale` | unit | en and es catalogs both ordered | HOME-001 | passing |
| `case-study-catalog.test.mjs::unions stack values across entries` | unit | three entries, overlapping arrays | HOME-002 | passing |
| `case-study-catalog.test.mjs::deduplicates by exact string` | unit | a repeated value collapses; a longer variant of it does not | HOME-002 | passing |
| `case-study-catalog.test.mjs::tolerates an entry with no stack` | unit | absent and empty array | HOME-002 | passing |
| `case-study-catalog.test.mjs::returns a stable order` | unit | same input, same output, twice | HOME-002 | passing |
| `home.smoke.spec.ts::home renders both bento groups in "<lang>"` | e2e | featured group and standalone group present, counts derived | HOME-003 | passing |
| `home.smoke.spec.ts::home has no employers section in "<lang>"` | e2e | section absent from the DOM | HOME-005 | passing |
| `home.smoke.spec.ts::home has no testimonials block in "<lang>"` | e2e | both locales, and no marker text | HOME-006 | passing |
| `home.smoke.spec.ts::contact form targets mailto and renders no result state in "<lang>"` | e2e | both locales | HOME-008 | passing |
| `home.smoke.spec.ts::both index routes return 200 and cross-link to each other` | e2e | switcher href on each points at the other | HOME-009 | passing |
| `check-site` over the real tree | integration | string, token and route-literal assertions | HOME-010 | passing |
| `bento-spans.test.mjs`, nine cases | unit | row filling at 1, 2, 3 and 4 columns; exact fits; a lone tile; a capped base span; a rejected column count | HOME-011 | passing |
| `case-study-catalog.test.mjs::joins the outcome and the period` | unit | an entry carrying both | HOME-003 | passing |
| `case-study-catalog.test.mjs::falls back to whichever exists alone` | unit | outcome only, period only, neither | HOME-003 | passing |
| `case-study-catalog.test.mjs::carries the scale caption` | unit | figure with and without a caption | HOME-003 | passing |
| manual build proof, recorded in the work log | build | sixth pair added, bento and strip grow, pair removed | HOME-004, HOME-007 | proven |

**Coverage gaps**

- **`HOME-004` is proven by a recorded manual build, not by an automated test.** Automating it would mean writing into `resources/**`, which `H-02` puts outside every agent's reach. The proof is a real build run with its output pasted into the work log — weaker than a test, and named as weaker rather than implied to be equivalent. Owner: this item.
- **`HOME-007` has no test of its own.** "Is a prop rather than a hardcoded child" is a structural property that the sixth-case-study build proof exercises indirectly and nothing asserts directly. Owner: this item, deliberately not covered.
- **No artboard comparison.** Fidelity is a human read at three widths and both themes until the design-fidelity harness item builds the diff. Owner: that item.

## Traceability

| Behavior | Priority | Status | Test(s) | Test written first? | ADR |
|---|---|---|---|---|---|
| HOME-001 | critical | implemented | 4 unit | yes | ADR-002 |
| HOME-002 | critical | implemented | 4 unit | yes | ADR-002 |
| HOME-003 | critical | implemented | 1 e2e | n/a — presentation | ADR-007 |
| HOME-004 | critical | implemented | build proof | n/a | ADR-008 |
| HOME-005 | critical | implemented | 1 e2e | n/a — presentation | ADR-008 |
| HOME-006 | critical | implemented | 1 e2e | n/a — presentation | ADR-008 |
| HOME-007 | normal | implemented | — | n/a | ADR-007 |
| HOME-008 | critical | implemented | 1 e2e | n/a — presentation | ADR-004 |
| HOME-009 | critical | implemented | 1 e2e | n/a — presentation | ADR-003 |
| HOME-011 | normal | implemented | 9 unit | yes | ADR-007 |
| HOME-010 | critical | implemented | check-site | n/a — guard exists | ADR-008 |

## Drift log

| Date | What diverged | Spec or code corrected | Note |
|---|---|---|---|
| 2026-08-26 | **Five of the fifteen scheduled tests did not exist.** The Test Plan named `home renders both bento groups`, `home has no employers section`, `home has no testimonials block`, `contact form targets mailto and renders no result state` and `both index routes return 200 and cross-link` — every one of them attributed to the route smoke suite, which contains none of them. Their behaviors would have been marked implemented on the strength of a table nobody checked against the file. | **Code.** `site/tests/e2e/home.smoke.spec.ts`, nine tests (five assertions, four of them run per locale), every expected count and string derived from `resources/` through the same functions the gateway calls. The Test Plan rows now name the file that holds them. | Found at close, by listing the real test names and diffing them against this table instead of trusting it. The suite went 54 → 81 across three engines. Proven load-bearing in red: with one featured tile removed from the render, the count assertion fails in both locales. |
| 2026-08-26 | **`HOME-008`'s edge case — *"the email address is read from content, never written into the template"* — was violated.** `HomeSections.astro` held `const contactAddress = 'luis.antm@hotmail.com'`. | **Code and content.** The author added `home.contact_email` to both interface-strings files; the component reads it; the gateway types it. The new e2e test asserts the form's action equals `mailto:` plus the address *read from the content file*, so the literal cannot come back without failing. | The test was written before the fix and failed for exactly this reason — which is what a scheduled test buys that a written-down edge case does not. |
| 2026-08-26 | **`HOME-007` — the per-tile motifs — was `planned` and unbuilt while the item was one step from closing.** The slice that owned them was never run, and nothing in the item's own machinery noticed a critical-adjacent behavior with no artifact behind it. | **Code.** `CaseMotif.astro`, five motifs extracted from the design by script with the token mapping applied and verified, rendering nothing for a slug it does not know. | The author found it by looking at the page. This is the same shape as the row below and the reason both are recorded rather than quietly fixed. |
| 2026-08-26 | **Four design rules that belong to no single component were dropped**, because the artboard was cut into per-component slices: the bento's row-filling width, the one-column stage at 820, the anchor tile's narrow treatment, the thesis stepping 40 → 30 → 25, and the contact column's 520px measure. | **Code**, in the components that own each rule, plus `HOME-011` for the one that had to become a derivation rather than a copied class. | Every automated check was green through all of them — `astro check`, `check-site`, the smoke tier, the mutation gate. Nothing was wrong with the code. Recorded at length in the work log and in the trace-fidelity item, whose extraction technique caused it. |
| 2026-08-26 | **`HOME-011` did not exist when this spec was approved.** The bento's column spans were expected to be copied from the design as a class; they had to become a derivation instead, because the design's own answer is only correct for exactly five case studies — proven by the sixth-entry build, where the correct layout is a different one. | **This spec**, `version` 1.0 → **1.1**. `approved_version` stays 1.0. | The version moves and the approval does not, which is the honest state: the code is built and green, and the author has not signed off on the added behavior. `H-05` blocks write-capable delegation until they do, which is exactly the protection it exists to give. |
| 2026-08-25 | `HOME-001`'s fourth edge case — *"the en and es halves of a pair carry the same `order`; a mismatch fails the build"* — appeared in the prose edge-case list but in **neither** the behavior's own `tests:` list nor the Test Plan table. The spec asked for something it never scheduled a test for. | **Code**, plus this row. The check cannot live in `listCaseStudyEntriesForLang`, which is called once per locale and never holds both halves; it landed in `locale-pair.mjs` as `assertEveryPairAgreesOnOrder`, wired into the gateway's case-study load so it runs on every build. Three tests, written red first. | Found by the implementer of slice B1 and reported rather than quietly skipped, which is the outcome the brief asked for. The defect it prevents is the kind this repository keeps finding late: two locales each internally consistent, each plausible, rendering the same list in a different sequence. |
