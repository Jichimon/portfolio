# SPEC-TASK-114: The home stack strip, rendered from a curated content pair with marks

```yaml
spec_id: SPEC-TASK-114
title: The stack strip as its own curated list, with monochrome marks
status: active
version: 1.1
date: 2026-09-02
approved_version: 1.0
work_item: TASK-114
intent: "Stop deriving the home strip from the case studies' stack frontmatter, which is not a technology list, and render instead a list the author owns entry by entry — each with a mark that follows the theme."

tdd: required
tdd_rationale:
reproduces:

governed_by:
  - ADR-006
  - ADR-008
related_docs:
  - resources/site/stack.en.md
  - resources/site/stack.es.md
  - resources/logos/stack/
  - site/src/content.config.ts
  - site/src/gateway/content-queries.ts
  - site/lib/content/entries/case-study-catalog.mjs
  - site/lib/content/assets/published-photos.mjs
  - site/src/components/home/StackStrip.astro
  - site/tests/e2e/home.smoke.spec.ts
  - scripts/guards/guards.config.json
  - docs/design/canvas/src/Main.dc.html

behaviors:
  - id: STACK-001
    given: "resources/site/stack.{en,es}.md declare the same technology ids in the same order, each carrying a display name and optionally the filename of a mark"
    when: "the home page is built for a locale"
    then: "the strip renders one chip per declared entry, in declared order, showing that locale's name — and nothing derived from any case study's stack frontmatter reaches it"
    priority: critical
    status: planned
    edge_cases:
      - "the order is the file's order, never alphabetical and never derived from the id — which technology a reader meets first is the author's decision"
      - "the strip is rendered twice so the marquee loop closes on itself; the duplicate pass stays aria-hidden, so the count a reader or a test observes is the declared count and not double it"
      - "a name is content and comes from the locale file, never from a template (S-01); the heading keeps coming from ui.{en,es}.md unchanged"
      - "an absent or empty collection yields no chips and therefore no section at all — the same absent-content contract the testimonials column already has"
    tests:
      - "stack.test::items come back in the order the entry declares them"
      - "stack.test::an entry list that is empty yields no items"
      - "home.smoke::STACK-001 renders one visible chip per declared entry, in both locales"
      - "home.smoke::STACK-001 renders no chip whose name the content pair does not declare"

  - id: STACK-002
    given: "an entry that names a mark file, and an entry that names none"
    when: "its chip is rendered"
    then: "the first renders that SVG inlined inside the 18px mark box, painted with currentColor so it follows the theme; the second renders the designed dot"
    priority: critical
    status: planned
    edge_cases:
      - "the mark is decorative and the technology's name is rendered beside it, so the mark carries aria-hidden and no alt text — nothing here needs a string outside resources/**"
      - "the dot is a designed fallback, not a gap: a visible placeholder box reads as breakage in a moving strip, which is why the artboard chose a dot and why that comment stays"
      - "a mark inherits the chip's colour rather than declaring one, so light and dark are covered by the same asset and no colour literal lands outside the token stylesheet (S-05)"
      - "C-06 carries forward from the artboard verbatim: no named security vendor gets a mark here — no identity provider, no liveness or fraud tooling, no OTP provider, neither as a mark nor as a name"
      - "an entry renders the dot when its owner permits plain-text reference only, and that is a CORRECT render rather than a missing asset: AWS requires plain text only (no logos) and forbids changing a mark colour, and Microsoft forbids using its logos in any manner and forbids altering them — both verified against the published guidelines on 2026-09-02, and both are exactly the two things a normalized brand mark would do"
    tests:
      - "stack.test::an item declaring a mark carries its filename; one declaring none carries no mark key at all"
      - "stack.test::RED: an SVG with no viewBox is a finding naming the file"
      - "stack.test::RED: an SVG carrying a colour literal is a finding naming the file"
      - "home.smoke::STACK-002 a chip with a mark renders an inline svg; a chip without one renders none"

  - id: STACK-003
    given: "the two locale files and the marks directory, which together are the only place the strip's content exists"
    when: "the collection is loaded"
    then: "a disagreement between the locales, a declared mark with no file behind it, or a file in the marks directory that nothing references each fails the build naming what is wrong"
    priority: critical
    status: planned
    edge_cases:
      - "an id present in one locale and absent in the other is a finding naming that id"
      - "the same ids in a different order is a finding — the order is content, and a reader in one language would meet the technologies in a different sequence"
      - "a duplicate id inside one file is a finding: it makes the cross-locale join ambiguous rather than merely odd"
      - "an unreferenced SVG is a finding because the glob is a publication boundary — every file it matches is emitted whether or not anything renders it, so a withheld mark would ship at a guessable URL with every check green"
      - "the boundary check is scoped to resources/logos/stack/, so the employers' marks sit outside it by folder rather than by a roster (P-13)"
      - "the check runs at build time in the gateway, so it fires on astro build and astro check rather than only under a test"
    tests:
      - "stack.test::RED: an id in one locale and not the other is a finding naming it"
      - "stack.test::RED: the same ids in a different order is a finding"
      - "stack.test::RED: a duplicate id within one locale is a finding"
      - "stack.test::RED: a declared mark filename with no asset behind it is a finding naming it"
      - "stack.test::RED: an asset no entry references is a finding naming it"

constraints:
  - "resources/** is read-only to every agent (H-02). Both locale files and every SVG under resources/logos/stack/ are the author's to write, and this spec's implementation half cannot begin them or repair them. The code ships and builds green against an absent pair, which is the same contract SPEC-TASK-113 has."
  - "The heading is not reworded. home.stack_heading stays as both locales carry it today; the fix is the list becoming true, not the title becoming vague enough to cover the list."
  - "The cross-locale and asset rules live in site/lib/content/stack/, not in the collection schema: that is the surface node:test runs and Stryker mutates (ADR-006), and a superRefine on a collection schema is the fragile place for a rule spanning two files."
  - "resources/logos/stack/ and resources/logos/employers/, not one flat resources/logos/. EmploymentEntry.astro already renders an employer logo from each role's logo key, so a second family exists; the publication-boundary check runs asset -> reference, and a shared folder would force it to carry a roster to tell the families apart."
  - "site/src/components/home/ holds 6 files against maxFilesPerDir 6 (S-03), so this item adds none there: the mark is a variant of the existing .stack-strip__mark span. The core module opens site/lib/content/stack/, since entries/, pages/, routes/ and articles/ are all at the cap."
  - "Marks are mono-only, and no full-colour brand logo is added to escape the dot. The two loudest names in the list are the two whose owners publish the narrowest terms: AWS permits its marks in plain text only and forbids recolouring them, Microsoft forbids third-party use of its logos in any manner and forbids altering them (both read 2026-09-02). A brand-coloured mark would also need a per-logo dark-theme check and would break the strip's muted register, so the constraint and the design agree and the dot stands on both."
  - "The .NET and iOS marks are kept as a stated author judgement, not as a compliance claim. The same Microsoft and Apple terms cover them; their presence in Simple Icons licenses the FILE under CC0 and licenses nothing about the trademark. Recorded here so the decision is visible rather than assumed (C-01 applied to a permission as much as to a number)."
  - "listCaseStudyStackForLang has exactly one consumer and is deleted with its tests once the gateway stops calling it, rather than left reachable as a second answer to what the stack is."

out_of_scope:
  - "Employer logos. resources/logos/employers/ is named and created by this item and filled by none of it; EmploymentEntry's slot stays empty, which is its correct state — the artboard: the wordmark works ALONE."
  - "Grouping the strip by category. The design is one flat marquee, and nothing in the complaint asks for groups."
  - "Sourcing or drawing the SVGs. Which technologies carry a mark is a curation decision inside a file the author owns."
  - "Correcting ui.es.md line 175, a stale note describing home.stack_heading with a value it no longer carries. resources/** is the author's (H-02); recorded in the work log for them."
```

## Intent

The strip renders `listStack(lang)`, which is the deduplicated union of every case study's `stack:` frontmatter. That array is doing a different job, and doing it well: it is what a reader of *that article* needs to know about *that project*, so it legitimately carries standards (`BIAN`), notations (`C4 model`), practices (`batched stored procedures`) and hardware categories (`biometric terminals`). Aggregated under a heading that reads **Technologies I've worked with**, roughly a third of the strip contradicts its own title — and the entries that are not technologies are exactly the ones that could never carry a mark.

The design had already decided both halves of the fix, and the implementation took a shortcut past them. `Main.dc.html:230-232` declares `.mark.has-logo` — an 18px box with `object-fit: contain` — and the comment above it calls the dot *"the mark slot, in its no-logo state… a designed fallback rather than a gap"*. `StackStrip.astro` copied the comment without the mechanism. The artboard's own chip list was also curated rather than derived: fifteen items, including `Polly` and `BFF`, which appear in no case study's `stack:` at all.

So this is not new design. It is the strip catching up to a decision the artboard already recorded, plus the one thing an artboard cannot do: give the list a source the author edits directly. Nothing is orphaned by the change — `article-masthead.mjs` renders `stack` as a masthead row on every case study, which is where the standards and the practices already have their context.

## Behaviors

### STACK-001 — the strip renders the curated pair, in declared order · `critical` · `planned`

- **Given** the two locale files declare the same ids in the same order, **When** the home page is built for a locale, **Then** one chip per entry renders in that order with that locale's name, and nothing derived from a case study reaches the strip.
- **Edge cases:** declared order, never alphabetical · the duplicated marquee pass stays `aria-hidden`, so the observable count is the declared count · names come from the content pair, the heading still from `ui.{en,es}.md` · an absent pair renders no section.
- **Governed by:** ADR-008
- **Tests:** `stack.test` for order and for the empty list; `home.smoke::STACK-001` for the count and for the absence of any undeclared name.

### STACK-002 — the mark, and the dot when there is none · `critical` · `planned`

- **Given** an entry with a mark filename and an entry without, **When** the chip renders, **Then** the first inlines that SVG in the 18px box painted with `currentColor`, and the second renders the dot.
- **Edge cases:** the mark is decorative, so `aria-hidden` and no `alt` · the dot is designed, not missing · colour is inherited, so one asset covers both themes and no literal escapes the token stylesheet · `C-06` forbids a security vendor's mark here, as the artboard already states.
- **Governed by:** ADR-008
- **Tests:** `stack.test` for the mark key and the two SVG red paths; `home.smoke::STACK-002` for inline `svg` presence and absence.

### STACK-003 — the pair and the marks directory refuse to disagree · `critical` · `planned`

- **Given** the two files and `resources/logos/stack/`, **When** the collection loads, **Then** a locale disagreement, a dangling mark reference or an unreferenced asset each fail the build by name.
- **Edge cases:** an id in one locale only · the same ids in a different order · a duplicate id within a file · an unreferenced SVG, because the glob is a publication boundary · the boundary scoped by folder rather than by a roster · the check runs in the gateway, so `astro build` and `astro check` both fire it.
- **Governed by:** ADR-006, ADR-008
- **Tests:** five red paths in `stack.test`.

## Constraints and invariants

Carried in the YAML block above. The two that decide the shape of the work: **`resources/**` is the author's** (`H-02`), so the content half is a hand-off and the code must build green without it; and **the rules that span two files live in `site/lib/content/stack/`**, not in the collection schema, because that is the surface `node:test` runs and Stryker mutates.

## Out of scope

Carried in the YAML block above. `resources/logos/employers/` is named and created here and filled by none of it — naming it now is what stops the first employer logo from landing in the stack folder because that is where logos went.

## Test plan

| Test (file::name) | Type | Scenario covered | Behavior(s) | Status |
|---|---|---|---|---|
| `stack.test::items come back in the order the entry declares them` | unit | declared order survives the build | STACK-001 | planned |
| `stack.test::an entry list that is empty yields no items` | unit | the absent-content path | STACK-001 | planned |
| `stack.test::an item declaring a mark carries its filename; one declaring none carries no mark key` | unit | the optional mark, both ways | STACK-002 | planned |
| `stack.test::RED: an SVG with no viewBox is a finding naming the file` | unit | an unscalable asset would blow the 18px box | STACK-002 | planned |
| `stack.test::RED: an SVG carrying a colour literal is a finding naming the file` | unit | `currentColor` is what must paint it (S-05) | STACK-002 | planned |
| `stack.test::RED: an id in one locale and not the other is a finding naming it` | unit | cross-locale membership | STACK-003 | planned |
| `stack.test::RED: the same ids in a different order is a finding` | unit | cross-locale order | STACK-003 | planned |
| `stack.test::RED: a duplicate id within one locale is a finding` | unit | the join stays unambiguous | STACK-003 | planned |
| `stack.test::RED: a declared mark filename with no asset behind it is a finding naming it` | unit | a dangling reference | STACK-003 | planned |
| `stack.test::RED: an asset no entry references is a finding naming it` | unit | the publication boundary | STACK-003 | planned |
| `home.smoke::STACK-001 one visible chip per declared entry, both locales` | e2e | the count read from the content files, never hardcoded | STACK-001 | planned |
| `home.smoke::STACK-001 no chip carries a name the pair does not declare` | e2e | catches a silent reintroduction of the aggregate | STACK-001 | planned |
| `home.smoke::STACK-002 a chip with a mark renders an inline svg; one without renders none` | e2e | the mark reaches the rendered page | STACK-002 | planned |
| mutation over `site/lib/content/stack/**` | mutation | the new core is actually tested | all | planned |

**Coverage gaps:**

- **Nothing asserts that a mark is visually correct** — that it is the right logo, cropped sanely, and optically balanced against its neighbours. `viewBox` and the colour rule are the machine-checkable half; the rest is the visual pass in verification and it is the author's eye. Stated rather than implied (`P-15`: a generated asset is judged by fitness for its published use, not by whether it renders).
- **The e2e tier runs Chromium only**, per `ADR-006`'s 2026-09-01 amendment. An inline SVG inheriting `currentColor` is not an area where engines are known to differ, so no engine-specific assertion is added; the gap is the standing one, not a new one.

## Traceability

| Behavior | Priority | Status | Test(s) | Test written first? | ADR |
|---|---|---|---|---|---|
| STACK-001 | critical | planned | `stack.test` x2, `home.smoke` x2 | pending | ADR-008 |
| STACK-002 | critical | planned | `stack.test` x3, `home.smoke` x1 | pending | ADR-008 |
| STACK-003 | critical | planned | `stack.test` x5 | pending | ADR-006, ADR-008 |

## Drift log

| Date | What diverged | Spec or code corrected | Note |
|---|---|---|---|
| 2026-09-02 | The test plan named a test `RED: an SVG carrying an rgb() colour literal…`. That name cannot exist: check-site scans this tree for colour literals and a test TITLE is scanned like any other line, so the guard failed on the word in the name | Spec corrected to the name the test actually carries | The fixtures hit the same wall and were assembled rather than spelled out, with the reason written at the top of the file. Version bumped to 1.1; the behaviour is unchanged and only the test's own name moved |
| 2026-09-02 | The .NET and iOS marks are wordmarks, measured at 24x8.94 and 24x11.9 — 6.7px and 8.9px tall inside the 18px box, beside a 13px name saying the same word | Content corrected; spec unchanged | Independently the same two entries the trademark check had flagged. Both drop their file key and render the dot, which STACK-002 already calls a correct render rather than a missing asset |
