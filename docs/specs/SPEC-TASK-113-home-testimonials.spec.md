# SPEC-TASK-113: The testimonials column on the home page

```yaml
spec_id: SPEC-TASK-113
title: Testimonials column, rendered from the LinkedIn recommendations content pair
status: shipped
version: 1.1
date: 2026-09-02
approved_version: 1.1
approved_by: "the author, 2026-09-02, in session, version 1.0 and then 1.1, having opened this file — transcribed here by the orchestrator because the delegation gate reads the file and not the conversation (P-02)"
work_item: TASK-113
intent: "Render the three LinkedIn recommendations in the contact section's second column, so the one kind of evidence on this site the author cannot write himself actually reaches a reader."

tdd: required
tdd_rationale:
reproduces:

governed_by:
  - ADR-006
  - ADR-008
related_docs:
  - resources/site/testimonials.en.md
  - resources/site/testimonials.es.md
  - resources/site/ui.en.md
  - resources/site/ui.es.md
  - site/src/content.config.ts
  - site/src/gateway/content-queries.ts
  - site/src/components/home/ContactSection.astro
  - site/tests/e2e/home.smoke.spec.ts
  - scripts/guards/guards.config.json
  - docs/design/canvas/src/Main.dc.html

behaviors:
  - id: TESTIMONIAL-001
    given: "resources/site/testimonials.{en,es}.md declare the same testimonial ids in the same order, each carrying a quote, the language it was written in, a name, a title, a company and a LinkedIn permalink"
    when: "the home page is built for a locale"
    then: "the contact section renders one card per testimonial, in declared order, each showing the quote, the name, the title and the company, with a link to that recommendation on LinkedIn"
    priority: critical
    status: implemented
    edge_cases:
      - "the order is the file's order, never alphabetical and never derived from the id - the author decides which recommendation is read first"
      - "the title and the company travel as separate values; the separator between them is drawn by CSS, because punctuation is not copy and would otherwise need a string of its own"
      - "the link label comes from ui.{en,es}.md like every other visible string (S-01); nothing in the template invents one"
      - "a permalink is rendered as the card's own link, never as bare text a reader would have to copy"
    tests:
      - "testimonials.test::cards come back in the order the entry declares them"
      - "testimonials.test::a card carries title and company as separate values"
      - "home.smoke::HOME-006 renders one .testimonial per declared entry, in both locales"

  - id: TESTIMONIAL-002
    given: "a testimonial whose original_language differs from the locale being rendered"
    when: "its card is rendered"
    then: "the card shows the translated quote and a note naming the language it was translated from, and the verbatim original is preserved in the content file and reachable at the permalink"
    priority: critical
    status: implemented
    edge_cases:
      - "the note is chosen by original_language, so a Spanish original on the English page and an English original on the Spanish page each get their own string rather than one generic translated label"
      - "a card whose original_language equals the locale carries NO note - a note on every card would tell a reader nothing and would make the real ones invisible"
      - "the original is never rendered beside the translation: it is preserved in the file and public at the permalink, which is what C-09's the original preserved asks for without doubling the column"
      - "a testimonial declaring original_language different from lang and carrying no original_quote fails the build naming the id, because the original would then exist nowhere"
    tests:
      - "testimonials.test::RED: a translated entry with no original_quote is a finding naming its id"
      - "testimonials.test::RED: an entry whose original_language equals lang and which carries an original_quote anyway is a finding"
      - "testimonials.test::the translation note is chosen by original_language"
      - "home.smoke::the note appears on exactly the translated cards, in both locales"

  - id: TESTIMONIAL-003
    given: "the two locale files, which are the only place the testimonial list exists"
    when: "the collection is loaded"
    then: "a disagreement between the locales fails the build naming what disagrees, rather than rendering a column that is silently different in one language"
    priority: critical
    status: implemented
    edge_cases:
      - "an id present in one locale and absent in the other is a finding naming that id"
      - "the same ids in a different order is a finding, because the order is content and a reader in one language would meet the recommendations in a different sequence"
      - "a duplicate id inside one file is a finding - it makes the cross-locale join ambiguous rather than merely odd"
      - "the check runs at build time, in the gateway, so it fires on astro build and astro check rather than only under a test"
    tests:
      - "testimonials.test::RED: an id in one locale and not the other is a finding naming it"
      - "testimonials.test::RED: the same ids in a different order is a finding"
      - "testimonials.test::RED: a duplicate id within one locale is a finding"

  - id: TESTIMONIAL-005
    given: "a recommendation long enough that printing it whole would swamp the card, whose entry therefore carries an excerpt alongside the full quote"
    when: "its card is rendered"
    then: "the card shows the excerpt, the full quote stays in the file as the record, and the build refuses any excerpt whose words are not in the quote it claims to come from"
    priority: critical
    status: implemented
    edge_cases:
      - "the excerpt is split on the elision marker and EVERY fragment must appear verbatim in the quote - that is what turns 'nothing is paraphrased' from a instruction into something the build can refuse"
      - "comparison ignores whitespace runs and line breaks, because a YAML block folds them and an excerpt copied across a line boundary is still verbatim"
      - "an entry with no excerpt renders its full quote, so the field is optional and the short recommendations need nothing"
      - "an excerpt on a placeholder entry is a finding: there is no quote yet for it to be verbatim against"
      - "the excerpt belongs to its locale - a Spanish card excerpts the Spanish quote, never the preserved original, so each locale's elision is decided in the language a reader will read"
    tests:
      - "testimonials.test::RED: an excerpt fragment absent from the quote is a finding naming the id"
      - "testimonials.test::RED: a paraphrase that changes one word is a finding"
      - "testimonials.test::an excerpt spanning a line break in the quote is accepted"
      - "testimonials.test::a card renders its excerpt when one exists and its quote when none does"

  - id: TESTIMONIAL-004
    given: "content that declares no testimonials, or declares only entries whose quote is still a [NEEDS INPUT] marker"
    when: "the home page is built"
    then: "no column, no empty grid cell and no marker reach the page; the contact form keeps the measure it has today"
    priority: critical
    status: implemented
    edge_cases:
      - "the marker is matched at the start of the quote, so a quote that legitimately contains the words in another position is not silently dropped"
      - "some entries renderable and some not renders the renderable ones and omits the rest, rather than all-or-nothing"
      - "with the column absent, .contact-section__main keeps its 520px measure - a form input the width of the page is the regression this guards against, and it is why the measure was written before the column existed"
      - "the standing HOME-006 assertion that no NEEDS INPUT text reaches the body stays exactly as it is, and is what proves this"
    tests:
      - "testimonials.test::an entry whose quote begins with the marker is omitted"
      - "testimonials.test::an entry list that is entirely markers yields no cards"
      - "home.smoke::the page body never contains NEEDS INPUT, in both locales"

constraints:
  - "resources/** is read-only to every agent (H-02). All four content files - the testimonial pair and the three new strings in each ui file - are the author's to write, and this spec's implementation half cannot begin them or repair them."
  - "The cross-field and cross-locale rules live in site/lib/content/testimonials/, not in the collection schema: that is the surface node:test runs and Stryker mutates (ADR-006), and a superRefine on a collection schema is the fragile place for a rule spanning two levels of frontmatter."
  - "site/lib/content/entries/ and site/lib/content/pages/ both hold 6 files against maxFilesPerDir 6 (S-03), so the core module opens site/lib/content/testimonials/. site/src/components/home/ holds 5 files and takes the new component with none to spare."
  - "Only the gateway imports astro:content (S-02). The component receives props and knows nothing about what loaded them."
  - "No visible string is declared outside resources/** (S-01), and no colour or breakpoint literal appears outside tokens.css (S-05)."
  - "check-content reports an unknown type as a finding (P-13), so content.byType.testimonials is part of this change rather than a follow-up."

out_of_scope:
  - "The recommendation text, the names, the titles and the permalinks - TASK 19 owns them, and H-02 puts them outside this item's reach."
  - "Choosing WHICH sentences an excerpt keeps. The build proves an excerpt is verbatim; it cannot judge whether it is representative, and that judgment is the author's."
  - "A testimonials page or route of its own. The content is a data file with no route, exactly like ui.{en,es}.md, and nothing here adds one."
  - "Testimonials anywhere but the home page. If a case study or the about page should carry one later, that is a new work item with a new decision behind it."
  - "Photographs or avatars of the recommenders. They are third parties and nobody has asked them (C-06)."
```

## Intent

Three people wrote recommendations about the author on LinkedIn. That is the one class of evidence on this portfolio the author cannot produce himself, and today a reader sees none of it: `TASK 24` built the contact section with its second column deliberately empty, because inventing the content would have been the actual error.

This spec covers everything downstream of the words. The words themselves arrive from `TASK 19`, in two locale files the author writes by hand.

The interesting behavior is not the rendering — it is what happens when the two locales disagree, and what a translated quote is allowed to claim. Two of the three recommendations are translated in each language, and a translation that quietly presents itself as the original is the same failure `INC-09` and `INC-10` are about, one surface over: a reader is told something that is not quite true, and nothing in the build notices.

## Behaviors

### TESTIMONIAL-001 — The column renders what the content declares · `critical` · `implemented`

- **Given** both locale files declaring the same ids in the same order **When** the home page is built **Then** one card per testimonial, in declared order, each with quote, name, title, company and a link to the recommendation.
- **Edge cases:** declared order wins over any derived one · title and company stay separate values, the separator is CSS · the link label comes from `ui.{en,es}.md` · the permalink is a link, never bare text.
- **Governed by:** ADR-008
- **Tests:** `testimonials.test`, `home.smoke`

### TESTIMONIAL-002 — A translation says that it is one · `critical` · `implemented`

- **Given** a testimonial whose `original_language` differs from the rendered locale **When** its card renders **Then** the translated quote plus a note naming the source language, with the verbatim original preserved in the file and public at the permalink.
- **Edge cases:** the note is chosen per source language, not generic · no note on a native card · the original is not rendered beside the translation · a translated entry with no `original_quote` fails the build naming its id.
- **Governed by:** ADR-008 · `C-09`
- **Tests:** `testimonials.test` (two red paths), `home.smoke`

### TESTIMONIAL-003 — The locales cannot silently disagree · `critical` · `implemented`

- **Given** two locale files that are the only place the list exists **When** the collection loads **Then** any disagreement fails the build naming what disagrees.
- **Edge cases:** an id in one locale only · the same ids in a different order · a duplicate id inside one file · the check fires at build time, not only under a test.
- **Governed by:** ADR-008
- **Tests:** `testimonials.test` (three red paths)

### TESTIMONIAL-004 — Absent content is an absent column · `critical` · `implemented`

- **Given** no testimonials, or only `[NEEDS INPUT]` ones **When** the page builds **Then** no column, no empty cell, no marker, and the form keeps its 520px measure.
- **Edge cases:** the marker matches at the start of the quote · a partial list renders its renderable half · the form's measure survives the column's absence · the standing `NEEDS INPUT` assertion is what proves it.
- **Governed by:** the register's standing rule that a section is omitted when its content is absent
- **Tests:** `testimonials.test`, `home.smoke`

### TESTIMONIAL-005 — An excerpt is provably the recommender's own words · `critical` · `implemented`

- **Given** a recommendation too long for a card, whose entry carries an `excerpt` beside the full quote **When** its card renders **Then** the excerpt is shown, the full quote stays as the record, and the build refuses any excerpt whose words are not in that quote.
- **Edge cases:** every fragment between elision markers must appear verbatim · whitespace and line breaks are flattened before comparing, because a YAML block folds them · quotation marks wrapping the excerpt are delimiters rather than words, stripped before comparing and before rendering so the card never shows two opening marks · no excerpt renders the full quote · an excerpt on a placeholder entry is a finding · each locale excerpts its own quote, never the preserved original.
- **Governed by:** ADR-008
- **Tests:** `testimonials.test` ×9

## Constraints and invariants

Listed in the block above. The one worth restating in prose: **this item cannot fix its own inputs.** If the author's files are malformed, the correct outcome is a build failure that names the file and the id — not a template that copes. Coping is how a locale ends up quietly shorter than the other one.

## Out of scope

Listed in the block above. `TASK 19` owns the words and the strings; nothing here may write them.

## Test plan

| Test (file::name) | Type | Scenario covered | Behavior(s) | Status |
|---|---|---|---|---|
| `testimonials.test::cards come back in the order the entry declares them` | unit | declared order is preserved | TESTIMONIAL-001 | green |
| `testimonials.test::a card carries title and company as separate values` | unit | no punctuation baked into a value | TESTIMONIAL-001 | green |
| `testimonials.test::a card carries the permalink and the configured link label` | unit | the link is built from content, not invented | TESTIMONIAL-001 | green |
| `testimonials.test::RED: a translated entry with no original_quote is a finding naming its id` | unit | the original would otherwise exist nowhere | TESTIMONIAL-002 | green |
| `testimonials.test::RED: a native entry carrying an original_quote is a finding` | unit | the reverse error, which would render a note that is false | TESTIMONIAL-002 | green |
| `testimonials.test::the translation note is chosen by original_language` | unit | en-source and es-source get different notes | TESTIMONIAL-002 | green |
| `testimonials.test::a native entry carries no translation note` | unit | the note stays meaningful by being rare | TESTIMONIAL-002 | green |
| `testimonials.test::RED: an id in one locale and not the other is a finding naming it` | unit | the cross-locale join | TESTIMONIAL-003 | green |
| `testimonials.test::RED: the same ids in a different order is a finding` | unit | order is content | TESTIMONIAL-003 | green |
| `testimonials.test::RED: a duplicate id within one locale is a finding` | unit | an ambiguous join | TESTIMONIAL-003 | green |
| `testimonials.test::an entry whose quote begins with the marker is omitted` | unit | a marker never reaches a page | TESTIMONIAL-004 | green |
| `testimonials.test::an entry list that is entirely markers yields no cards` | unit | absent content, absent column | TESTIMONIAL-004 | green |
| `home.smoke::HOME-006 the home renders one card per declared testimonial` | e2e | the real build, both locales | TESTIMONIAL-001 | green |
| `home.smoke::HOME-006 each card links to a LinkedIn permalink` | e2e | the link survives the template | TESTIMONIAL-001 | green |
| `home.smoke::HOME-006 the translation note appears on exactly the translated cards` | e2e | the note is not on every card | TESTIMONIAL-002 | green |
| `home.smoke::HOME-006 the page body never contains NEEDS INPUT` | e2e | **kept verbatim from the current test** | TESTIMONIAL-004 | green |
| `testimonials.test::RED: an excerpt fragment absent from the quote is a finding naming the id` | unit | the anti-paraphrase invariant | TESTIMONIAL-005 | green |
| `testimonials.test::RED: a paraphrase that changes one word is a finding` | unit | the near-miss, which is the realistic error | TESTIMONIAL-005 | green |
| `testimonials.test::an excerpt spanning a line break in the quote is accepted` | unit | YAML block folding must not read as a mismatch | TESTIMONIAL-005 | green |
| `testimonials.test::a card renders its excerpt when one exists and its quote when none does` | unit | the field is optional | TESTIMONIAL-005 | green |
| `mutation::site/lib/content/testimonials/**` | mutation | the new module enters the mutated surface at or above the 77.0 floor | all | green |

**Coverage gaps:**

- **The Spanish reads naturally.** Not testable, and named rather than left silent (`P-03`). It is a human read at verify, and `C-09` is the standard.
- **The card matches the canvas at every breakpoint.** Covered by the visual-capture matrix in the `full` profile and by a human diff against `Main.dc.html` / `HomeES.dc.html` / `HomeMobile.dc.html`, not by an assertion.
- **A permalink that 404s.** Nothing here fetches LinkedIn, and nothing should: an outbound network check in a build is a new failure mode bought for a link the author pasted from his own profile.

## Traceability

| Behavior | Priority | Status | Test(s) | Test written first? | ADR |
|---|---|---|---|---|---|
| TESTIMONIAL-001 | critical | implemented | `testimonials.test` ×3, `home.smoke` ×2 | pending | ADR-008 |
| TESTIMONIAL-002 | critical | implemented | `testimonials.test` ×4, `home.smoke` ×1 | pending | ADR-008 |
| TESTIMONIAL-003 | critical | implemented | `testimonials.test` ×3 | pending | ADR-008 |
| TESTIMONIAL-004 | critical | implemented | `testimonials.test` ×2, `home.smoke` ×1 | pending | ADR-008 |
| TESTIMONIAL-005 | critical | implemented | `testimonials.test` ×4 | pending | ADR-008 |

## Drift log

| Date | What diverged | Spec or code corrected | Note |
|---|---|---|---|
| 2026-09-02 | `TASK 19` names `resources/testimonials.{en,es}.md`; this spec targets `resources/site/` | `TASKS.md` corrected | The shape being copied is `ui.{en,es}.md`, which lives with the site's content. Recorded before implementation rather than discovered during it |
| 2026-09-02 | The page reader excluded the interface strings by filename (`excludeStem: 'ui'`). Adding a second non-page data file to the same directory made that roster hold a member it did not know about | Code corrected: `readPageEntries` added to `site/lib/content/routes/route-source.mjs`, filtering on the declared `type`; four consumers switched | Not in this spec's file list. It is the roster-versus-property failure, and this change is what would have made it real — the testimonial pair was flowing into three suites and the post-deploy verifier as a page. Four tests pin the property |
| 2026-09-02 | The new e2e assertion was first written as `HOME-007`, an id `SPEC-TASK-24` already owns | Test corrected: it carries `TESTIMONIAL-002`, this spec's own id | Caught before the file was run. Ids are never reused, and the numbering gap in the home suite is not a free slot |
| 2026-09-02 | The transcribed recommendations run 1,400-2,400 characters against a card that wants ~150, so the column as specified would be unreadable | Spec bumped to 1.1: `TESTIMONIAL-005` adds an optional `excerpt` | The full quote stays as the record rather than being destroyed by the edit, which also keeps each locale's elision decided independently. The invariant it buys was not in the original design and is the reason this beat editing the quote in place: an excerpt must be verbatim, and the build can now prove it |
| 2026-09-02 | The author's first transcription copied the English file into the Spanish one, changing only `lang` and `title`, so all three Spanish entries were malformed | Neither — the build refused it by name, which is the designed outcome | `TESTIMONIAL-002`'s red path, proven against real content rather than a fixture: two entries translated from English with no `original_quote`, one native entry carrying one anyway. `check-content` and `check-terms` both passed, which is the point of putting this rule where it is — the frontmatter shape was valid and the claim was not |
