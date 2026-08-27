# SPEC-TASK-26: About, Experience and the bilingual 404

```yaml
spec_id: SPEC-TASK-26
title: About, Experience and 404
status: active
version: 1.0
date: 2026-08-26
approved_version: 1.0
work_item: TASK-26
intent: "Route the last three designed pages — /about, /experience and the bilingual 404 — entirely from resources/, with every block absent rather than approximated when its content does not exist."

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
  - docs/design/canvas/src/About.dc.html
  - docs/design/canvas/src/Experience.dc.html
  - docs/design/canvas/src/NotFound.dc.html
  - progress/handoff/2026-08-26-task26-content.md

behaviors:
  - id: ABOUT-001
    given: "about.{en,es}.md exists and its slug is routed"
    when: "/about or /es/about is requested"
    then: "the page renders with every text element on one centred column and exactly one full-width element"
    priority: critical
    status: implemented
    edge_cases:
      - "at 1180px the column stays centred while the shell padding shrinks to 48px"
      - "at 820px the column releases its max-width and the rail stops being a rail"
      - "the full-width break never exceeds the shell's own max-width"
    tests:
      - "about.smoke::renders one centred column at every sanctioned width"
      - "about.smoke::has exactly one full-width element"

  - id: ABOUT-002
    given: "about frontmatter carries h1, and lead may be empty or absent"
    when: "the page renders"
    then: "the h1 prints from frontmatter and the lead paragraph is absent entirely when lead is empty or absent"
    priority: critical
    status: implemented
    edge_cases:
      - "lead: '' omits the block"
      - "the lead key absent entirely omits the block"
      - "h1 missing fails the build naming the file — a page with no headline is a defect, not a state"
    tests:
      - "about-article.test::readAboutMasthead omits an empty lead"
      - "about-article.test::readAboutMasthead throws naming the file when h1 is missing"

  - id: ABOUT-003
    given: "ui.about carries based_in, since and reads_as labels and about frontmatter carries the since and reads_as values"
    when: "the byline renders"
    then: "three label-value pairs print, and based_in's value is read from ui.rail.location rather than restated in the page"
    priority: normal
    status: implemented
    tests:
      - "about.smoke::byline prints three pairs and reuses the rail location"

  - id: ABOUT-004
    given: "the rendered body's first block is a paragraph"
    when: "the body renders"
    then: "that paragraph alone carries the drop treatment, positionally"
    priority: normal
    status: implemented
    tests:
      - "about.smoke::the first body paragraph carries the drop class and no other does"

  - id: ABOUT-005
    given: "the body contains at most one blockquote"
    when: "the body renders"
    then: "the blockquote renders as the pull line; zero blockquotes renders no pull line"
    priority: critical
    status: implemented
    edge_cases:
      - "zero blockquotes is valid and prints no pull line"
      - "two or more blockquotes fail the build naming the file — the design uses the device once"
    tests:
      - "about-article.test::splitAboutBody returns no pull line when the body has none"
      - "about-article.test::splitAboutBody throws naming the file on a second blockquote"

  - id: ABOUT-006
    given: "the body contains at most one thematic break"
    when: "the body renders"
    then: "the paired photo figures render at the break, splitting the prose above from the prose below"
    priority: critical
    status: implemented
    edge_cases:
      - "zero thematic breaks places the pair after the whole body"
      - "two or more fail the build naming the file"
    tests:
      - "about-article.test::splitAboutBody splits on the single thematic break"
      - "about-article.test::splitAboutBody places the pair last when there is no break"

  - id: ABOUT-007
    given: "about frontmatter carries a photos list whose entries name a slot, an alt and a caption"
    when: "the page renders"
    then: "each photo renders as a figure in its slot; an entry whose caption is empty renders the figure without a figcaption; an absent or empty photos list renders no figures and the page stays valid"
    priority: critical
    status: implemented
    edge_cases:
      - "caption: '' renders the figure with no figcaption"
      - "the photos key absent renders no figures at all"
      - "an entry naming a file that does not exist in resources/photos/ fails the build naming that file"
      - "one pair photo present and the other absent renders a single-column pair rather than a hole"
    tests:
      - "about-article.test::readPhotoFigures omits an empty caption"
      - "about-article.test::readPhotoFigures throws naming a file that has no asset"
      - "about.smoke::renders the declared photo figures and no placeholder frames"

  - id: ABOUT-008
    given: "ui.about.next_up names nav item keys rather than paths"
    when: "the next-up block renders"
    then: "each href is resolved through the nav structure in the page's own locale"
    priority: normal
    status: implemented
    edge_cases:
      - "a key naming no nav item fails the build naming the key"
    tests:
      - "about.smoke::next-up links resolve to localized destinations"

  - id: ABOUT-009
    given: "resources/photos/ holds image files and the two locales' photos lists reference some of them"
    when: "the build resolves photo assets"
    then: "a file in resources/photos/ that no photos entry references fails the build naming that file"
    priority: critical
    status: implemented
    edge_cases:
      - "a file referenced by only one locale still counts as referenced"
      - "the set of referenced names is derived from the content, never from a list in code"
    tests:
      - "published-photos.test::assertEveryAssetIsReferenced names the unreferenced file"
      - "published-photos.test::an asset referenced by one locale only is accepted"

  - id: EXP-001
    given: "experience.{en,es}.md frontmatter carries a roles list"
    when: "/experience or /es/experience is requested"
    then: "the chronology renders one entry per role, in the order the file declares"
    priority: critical
    status: implemented
    edge_cases:
      - "an empty roles list renders no record section rather than an empty ruled box"
      - "the body of the file renders nowhere"
    tests:
      - "experience.smoke::renders one entry per declared role, in order"
      - "experience.smoke::no text from the markdown body appears on the page"

  - id: EXP-002
    given: "a role carries company, period, title, body paragraphs and an optional stack and logo"
    when: "the entry renders"
    then: "each present field prints and each absent optional field renders nothing at all"
    priority: critical
    status: implemented
    edge_cases:
      - "stack absent renders no technology line"
      - "logo absent renders no logo square — the company name stands alone rather than beside an empty frame"
      - "a single body paragraph renders without a second"
    tests:
      - "employment-record.test::an entry without a stack carries no stack line"
      - "employment-record.test::an entry without a logo carries no logo slot"

  - id: EXP-003
    given: "the record holds at least one role"
    when: "the record renders"
    then: "the most-recent badge marks the first entry, derived from the record's own order"
    priority: normal
    status: implemented
    edge_cases:
      - "an empty record marks nothing"
    tests:
      - "employment-record.test::the badge is derived from position, not from a field"

  - id: EXP-004
    given: "a role carries case_studies as bare slugs"
    when: "the entry renders"
    then: "each row's title and href come from that case study's own entry in this page's locale"
    priority: critical
    status: implemented
    edge_cases:
      - "the Spanish page links to Spanish articles with Spanish titles"
      - "a slug with no case study fails the build naming the slug"
      - "a slug with no route in this locale fails the build naming the slug"
      - "case_studies absent renders no rows"
    tests:
      - "employment-record.test::rows are rebuilt from the linked entry, not from the referring file"
      - "experience.smoke::the Spanish record links only to Spanish article paths"

  - id: EXP-005
    given: "ui.experience carries cv_note and full_history, and full_history.social names an entry of ui.socials"
    when: "the availability note renders"
    then: "the note prints and the link resolves to the named social entry's URL"
    priority: normal
    status: implemented
    edge_cases:
      - "a social name matching no entry fails the build naming it"
    tests:
      - "experience.smoke::the availability note links to the declared social URL"

  - id: NF-001
    given: "a path matches no route"
    when: "it is requested from the built site"
    then: "the response carries HTTP status 404 and the not-found page, never a 200 with error copy"
    priority: critical
    status: implemented
    edge_cases:
      - "an unmatched path under /es/ returns the same page and the same status"
      - "a path shaped like a case study but naming no slug returns 404, not a build error"
    tests:
      - "not-found.smoke::an unmatched route responds 404"
      - "not-found.smoke::an unmatched /es/ route responds 404"

  - id: NF-002
    given: "one page file serves every unmatched route in both locales"
    when: "the page renders"
    then: "both locales render side by side, each a complete monolingual panel, read from ui.en and ui.es together"
    priority: critical
    status: implemented
    edge_cases:
      - "the status line composes both locales' status_word around one status_code"
      - "at 820px the panels stack and stay complete rather than interleaving"
    tests:
      - "not-found.smoke::both locale panels render with their own heading, body and destinations"
      - "not-found.smoke::the status line carries both locales' wording"

  - id: NF-003
    given: "the 404 belongs to no locale"
    when: "the rail renders on it"
    then: "the language switcher marks neither locale current and offers both as links"
    priority: critical
    status: implemented
    edge_cases:
      - "no element on the 404 carries aria-current for language"
      - "every other page still marks its own locale current"
    tests:
      - "not-found.smoke::neither locale is marked current"
      - "about.smoke::the locale is still marked current on a normal page"

  - id: NF-004
    given: "ui.{en,es}.not_found.destinations name destinations in order"
    when: "each panel renders its list"
    then: "each destination's href is resolved through the nav structure in that panel's own locale"
    priority: normal
    status: implemented
    tests:
      - "not-found.smoke::the Spanish panel's destinations point at Spanish paths"

  - id: PAGE-001
    given: "about and experience are listed as pendingRoutes in guards.config.json"
    when: "this item routes them"
    then: "both entries are removed and the smoke tier asserts 200 for them where it asserted 404"
    priority: critical
    status: implemented
    edge_cases:
      - "pendingRoutes reaching empty is the healthy end state, not a defect"
    tests:
      - "routes.smoke::every derived route responds 200"

constraints:
  - "No string a reader can see is declared outside resources/** (S-01). A missing string is an absent block, never an invented placeholder."
  - "resources/** is not written by this item (H-02). Every content change is an author hand-off, drafted in progress/handoff/2026-08-26-task26-content.md."
  - "Locale parity in the same change (C-09)."
  - "No new breakpoint and no colour literal (S-05). The three sanctioned breakpoints already cover all three artboards."
  - "No new layout file: site/src/layouts/ holds four against a cap of six and three archetypes would fail S-03."
  - "Photo figures use <Picture>, not <Image>: <Image> silently ignores a formats array and emits WebP only. Verified against a real build 2026-08-26."
  - "The photo widths are derived from the real layout — the 680px column and the 1176px shell — never round numbers."

out_of_scope:
  - "Artboard diffing and any pixel tolerance — TASK 27."
  - "Hand-authored diagram replacement — TASK 6. These three pages carry no diagram."
  - "astro check as a gate step — TASK 48."
  - "Any change to a delegated role's turn budget — TASK 55."
  - "The About lead paragraph and the Cochabamba paragraph as written prose — TASK 20 and the author. This item guarantees only that their absence is a supported state."
  - "A routed /contact page — TASK 50 decides that separately."
```

## Intent

Three designed pages remain unrouted. About and Experience are blocked not on code but on content: the Experience artboard renders a structured employer record where the file holds prose, and the About artboard renders no employer chronology at all, which is the de-duplication `TASK 20` decided with the author. The 404 is blocked on nothing — its strings have been complete in both locales since `TASK 36`.

The through-line of every behavior below is **absence over approximation**. Every optional block — the lead, a caption, a photograph, a stack line, a logo, a case-study row — renders nothing when its content does not exist, and no template ever invents a stand-in. That is what lets this item close on the day the author is still writing two paragraphs, and it is the same rule the home page already applies to its employer strip and its testimonials.

The one place the rule inverts is a **dangling reference**: a `photos` entry naming a file that is not there, a `case_studies` slug with no case study, a nav key that names no item. Those fail the build naming the thing, because a silent omission there is a typo shipping as a design decision.

## Constraints and invariants

Beyond the block above, two invariants are worth stating in prose because they are the ones a later change is most likely to break.

**`resources/photos/` is the publication boundary.** Verified against a real build: every file the asset glob matches is emitted into the output, referenced or not, under both an eager and a lazy glob. A photograph held back for consent reasons would therefore be published with every check green. `ABOUT-009` turns that into a named build error rather than a convention.

**The 404 reads both locales at once.** It is the only page that does, and it is why the interface strings are a joinable collection rather than one module per locale — a fact `ui.en.md`'s own body already records. Nothing about this page may assume a current locale, including the rail it inherits.

## Out of scope

Listed in the block above. The one worth repeating: **this item does not write the About lead or the Cochabamba paragraph.** `C-01` forbids drafting either — they are facts about the author's life. What this item owes is that the page is correct and shippable without them, and that they appear with no code change on the day they land.

## Test plan

| Test (file::name) | Type | Scenario covered | Behavior(s) | Status |
|---|---|---|---|---|
| `about-article.test::readAboutMasthead omits an empty lead` | unit | `lead: ''` and an absent key both omit | ABOUT-002 | green |
| `about-article.test::readAboutMasthead throws naming the file when h1 is missing` | unit | a headline is required, not optional | ABOUT-002 | green |
| `about-article.test::splitAboutBody splits on the single thematic break` | unit | the pair lands at the break | ABOUT-006 | green |
| `about-article.test::splitAboutBody places the pair last when there is no break` | unit | zero breaks is valid | ABOUT-006 | green |
| `about-article.test::splitAboutBody returns no pull line when the body has none` | unit | zero blockquotes is valid | ABOUT-005 | green |
| `about-article.test::splitAboutBody throws naming the file on a second blockquote` | unit | the device is used once | ABOUT-005 | green |
| `about-article.test::readPhotoFigures omits an empty caption` | unit | caption absent, figure present | ABOUT-007 | green |
| `about-article.test::readPhotoFigures throws naming a file that has no asset` | unit | a dangling reference is loud | ABOUT-007 | green |
| `published-photos.test::assertEveryAssetIsReferenced names the unreferenced file` | unit | the consent leak cannot recur silently | ABOUT-009 | green |
| `published-photos.test::an asset referenced by one locale only is accepted` | unit | parity is not required of an asset | ABOUT-009 | green |
| `employment-record.test::an entry without a stack carries no stack line` | unit | absence over approximation | EXP-002 | green |
| `employment-record.test::an entry without a logo carries no logo slot` | unit | the wordmark stands alone | EXP-002 | green |
| `employment-record.test::the badge is derived from position, not from a field` | unit | nothing hardcodes "most recent" | EXP-003 | green |
| `employment-record.test::rows are rebuilt from the linked entry, not from the referring file` | unit | the title cannot drift | EXP-004 | green |
| `about.smoke::renders one centred column at every sanctioned width` | e2e | the rule three versions broke | ABOUT-001 | green |
| `about.smoke::has exactly one full-width element` | e2e | the single full-width moment | ABOUT-001 | green |
| `about.smoke::byline prints three pairs and reuses the rail location` | e2e | one datum, declared once | ABOUT-003 | green |
| `about.smoke::the first body paragraph carries the drop class and no other does` | e2e | positional drop | ABOUT-004 | green |
| `about.smoke::renders the declared photo figures and no placeholder frames` | e2e | no mockup frame reaches production | ABOUT-007 | green |
| `about.smoke::next-up links resolve to localized destinations` | e2e | no path literal in content | ABOUT-008 | green |
| `about.smoke::the locale is still marked current on a normal page` | e2e | the NF-003 change is contained | NF-003 | green |
| `experience.smoke::renders one entry per declared role, in order` | e2e | the chronology | EXP-001 | green |
| `experience.smoke::no text from the markdown body appears on the page` | e2e | the body renders nowhere | EXP-001 | green |
| `experience.smoke::the Spanish record links only to Spanish article paths` | e2e | the locale join | EXP-004 | green |
| `experience.smoke::the availability note links to the declared social URL` | e2e | the LinkedIn indirection | EXP-005 | green |
| `not-found.smoke::an unmatched route responds 404` | e2e | **a real status, never a soft 404** | NF-001 | green |
| `not-found.smoke::an unmatched /es/ route responds 404` | e2e | both locales, one file | NF-001 | green |
| `not-found.smoke::both locale panels render with their own heading, body and destinations` | e2e | two complete monolingual halves | NF-002 | green |
| `not-found.smoke::the status line carries both locales' wording` | e2e | the composed status line | NF-002 | green |
| `not-found.smoke::neither locale is marked current` | e2e | the designed neutral state | NF-003 | green |
| `not-found.smoke::the Spanish panel's destinations point at Spanish paths` | e2e | per-panel locale resolution | NF-004 | green |
| `routes.smoke::every derived route responds 200` | e2e | pendingRoutes reaches empty | PAGE-001 | green |
| mutation over `site/lib/content/pages/**` | mutation | the two new core modules hold their tests up | ABOUT-002 · ABOUT-005…007 · ABOUT-009 · EXP-002…004 | green |

**Coverage gaps:**

- **The production 404 status is not proven here.** The local proof runs against `astro preview`; whether Cloudflare's static-asset host returns 404 rather than 200 for `404.html` is `TASK 32`'s to verify against the real deployment. Declared rather than claimed (`P-03`).
- **No artboard diff.** `TASK 27` owns it. The fidelity check for this item is the orchestrator's read plus the author's, at three widths in both themes.
- **The design-fidelity deviation on the full-width slot** — 3:2 where the artboard specifies 21:9, decided by the author 2026-08-26 — is recorded, not tested. A ratio is a design decision, and a test asserting it would only restate the stylesheet.

## Traceability

| Behavior | Priority | Status | Test(s) | Test written first? | ADR |
|---|---|---|---|---|---|
| ABOUT-001 | critical | implemented | about.smoke ×2 | n/a — e2e | ADR-008 |
| ABOUT-002 | critical | implemented | about-article.test ×2 | pending | ADR-008 |
| ABOUT-003 | normal | implemented | about.smoke | n/a — e2e | ADR-008 |
| ABOUT-004 | normal | implemented | about.smoke | n/a — e2e | ADR-007 |
| ABOUT-005 | critical | implemented | about-article.test ×2 | pending | ADR-002 |
| ABOUT-006 | critical | implemented | about-article.test ×2 | pending | ADR-002 |
| ABOUT-007 | critical | implemented | about-article.test ×2 · about.smoke | pending | ADR-008 |
| ABOUT-008 | normal | implemented | about.smoke | n/a — e2e | ADR-003 |
| ABOUT-009 | critical | implemented | published-photos.test ×2 | pending | ADR-008 |
| EXP-001 | critical | implemented | experience.smoke ×2 | n/a — e2e | ADR-008 |
| EXP-002 | critical | implemented | employment-record.test ×2 | pending | ADR-008 |
| EXP-003 | normal | implemented | employment-record.test | pending | ADR-008 |
| EXP-004 | critical | implemented | employment-record.test · experience.smoke | pending | ADR-003 |
| EXP-005 | normal | implemented | experience.smoke | n/a — e2e | ADR-008 |
| NF-001 | critical | implemented | not-found.smoke ×2 | n/a — e2e | ADR-001 |
| NF-002 | critical | implemented | not-found.smoke ×2 | n/a — e2e | ADR-003 |
| NF-003 | critical | implemented | not-found.smoke · about.smoke | n/a — e2e | ADR-003 |
| NF-004 | normal | implemented | not-found.smoke | n/a — e2e | ADR-003 |
| PAGE-001 | critical | implemented | routes.smoke | n/a — e2e | ADR-006 |

## Drift log

| Date | What diverged | Spec or code corrected | Note |
|---|---|---|---|
| 2026-08-26 | The artboard specifies the full-width photo slot at 21:9 and ≥2000px wide; the source photograph is 3:2 at 1080px. | Spec | Author decided to keep the photograph and move the slot to 3:2. Cropping would have cut the sky and foreground road that give the mountain its scale, at under half the specified width. Recorded as a declared design-fidelity deviation. |
| 2026-08-26 | `<Image formats={[...]}>` was assumed to emit AVIF. It ignores the prop and emits WebP only. | Spec | Found by spiking against a real build before any production code. The constraint block now names `<Picture>`. |
| 2026-08-26 | The asset glob was assumed to publish only referenced files. It publishes every match, under both eager and lazy globs. | Spec | `ABOUT-009` added, and `resources/photos/` declared the publication boundary. A photograph held back for third-party consent would otherwise have shipped with every check green. |
| 2026-08-26 | `NF-002` assumed the display numeral could print the whole `status_code` phrase. The artboard prints the numeral alone, and the phrase already appears in the status line directly above it. | Code | Found by looking at the rendered page, not by a check. The numeral is sliced from the same content string rather than written down. |
| 2026-08-26 | `ABOUT-001` was implemented with the article as a `<section>` inside the page's own section, so the shell's page inset applied twice. | Code | Found by reading the built HTML. The root is now an `<article>`. The sibling not-found slice, which had been warned about exactly this, did not hit it. |
| 2026-08-26 | The About lead's absence is guarded in TWO places — the core module omits the key and the component also checks truthiness — so neutering only the core could not surface the defect. | — | Not a defect; recorded because the red path had to neuter both layers to prove the assertion discriminates, and a future reader would otherwise conclude the first attempt had proved it. |
