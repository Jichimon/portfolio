# SPEC-TASK-117: Employer cards deep-link to their own role on the experience page

```yaml
spec_id: SPEC-TASK-117
title: Derived role anchors on /experience, and employer cards that point at them
status: active
version: 1.0
date: 2026-09-03
approved_version: 1.0
work_item: TASK-117
intent: "The employer strip promises four destinations and delivers one — every card lands the reader at the top of /experience, because no role emits an anchor for a fragment to reach. Give each role a derived, stable id and point each card at its own."

tdd: required
tdd_rationale:
reproduces:

governed_by:
  - ADR-006
  - ADR-008

related_docs:
  - docs/specs/SPEC-TASK-115-home-employers-strip.spec.md
  - resources/site/experience.en.md
  - resources/site/experience.es.md
  - site/lib/content/pages/employment-record.mjs
  - site/src/gateway/content-queries.ts
  - site/src/components/experience/EmploymentEntry.astro
  - site/src/components/home/employers/EmployersSection.astro
  - site/src/components/home/employers/EmployerCard.astro
  - site/src/components/rail/Rail.astro
  - site/tests/e2e/home.smoke.spec.ts

behaviors:
  - id: EMP-008
    given: "roles[] in experience.{en,es}.md, each carrying a company name, and no anchor key anywhere in resources/**"
    when: "the employment record is built"
    then: "each role carries a derived anchor id — deterministic, URL-safe, and stable across builds — produced by a pure function that takes the company name and nothing else"
    priority: critical
    status: implemented
    edge_cases:
      - "accents fold rather than escape: 'Avícola Sofía' yields avicola-sofia, never avícola-sofía percent-encoded into a fragment nobody can read or type"
      - "punctuation collapses: runs of non-alphanumeric characters become one hyphen and leading/trailing hyphens are trimmed, so 'Banco Solidario S.A.' yields banco-solidario-s-a. Stripping legal suffixes was considered and DECLINED: 'S.A.', 'Inc.', 'Ltd.' is a roster, and a roster is what P-13 exists to refuse — the ugly-but-derivable id beats a pretty one that silently fails on the first suffix nobody listed"
      - "two roles deriving the same id is a build failure naming both roles, not a silent collision and not an auto-suffixed -2. A reader clicking the second card and landing on the first is a broken promise that no test would notice, and the author is the one who should decide how two stints at one employer are told apart"
      - "the derivation runs per locale off that locale's own company value, so the two locales agree only because the four names happen to be byte-identical today (verified 2026-09-03, experience.{en,es}.md lines 10/19/31/40). Nothing here DEPENDS on that: a locale whose name differed would still self-consistently link its own card to its own anchor, because both sides of the link are built from the same locale's data. Recorded because the opposite is the intuitive assumption and it would send someone hunting for a parity check that should not exist"
      - "an empty or whitespace-only company name yields no anchor rather than an empty fragment — a card that links to '#' is worse than one that links to the page"
    tests:
      - "employment-record.test::an anchor is derived for every role, from the company name alone"
      - "employment-record.test::accents fold and punctuation collapses — Avícola Sofía, Banco Solidario S.A."
      - "employment-record.test::RED: two roles deriving the same anchor is a finding naming both"
      - "employment-record.test::RED: a company name that yields no usable slug produces no anchor rather than an empty one"

  - id: EMP-009
    given: "the /experience page rendering the employment record, and the home page rendering the employer strip"
    when: "a reader clicks any employer card"
    then: "the browser navigates to that locale's experience route with the role's fragment, the matching role element carries that id, and the reader lands on the role rather than at the top of the page"
    priority: critical
    status: implemented
    edge_cases:
      - "all four roles are asserted, per locale — not only the first. The first card is the one that would appear to work even with the whole mechanism broken, because the first role sits at the top of the page anyway (P-13: assert the property, not the row that happens to be checked)"
      - "the id lands on the role's own container element, so the fragment targets what a reader recognises as 'the NICE role' rather than a heading nested inside it"
      - "nothing sits above the target at any width, verified rather than assumed: Rail.astro is a 264px SIDE rail, sticky at left with no vertical extent over the content, and at <=820px it becomes position: static and scrolls away entirely. So no scroll-margin-top is structurally required — any offset added is for optical breathing room and is declared as such, not as a fix for an overlap that does not exist"
      - "a fragment for a role that does not exist degrades to the page itself, which is the browser's own behaviour and needs no code — stated so nobody builds a redirect for it"
    tests:
      - "home.smoke::EMP-009 each of the four cards links to its own anchor, both locales"
      - "home.smoke::EMP-009 the matching element with that id exists on the target page, both locales"
      - "home.smoke::EMP-009 following a non-first card's link scrolls the page past its top"

constraints:
  - "resources/** does not change (H-02). An explicit anchor: key per role was considered and declined: it is a second value to author and keep in sync per locale for something the company name already determines, and it would put a URL fragment into content the author edits for prose reasons."
  - "The derivation is a pure function in site/lib/**, framework-free (S-06), which places it inside the mutation-covered surface — folding, collapsing and uniqueness-checking is parsing-and-joining logic, exactly what D3 scoped mutation and TDD to. TDD is required here and the red paths in EMP-008 are written first (T-01)."
  - "site/lib/content/pages/ is at the S-03 cap of 6 files, confirmed during TASK 115. This item adds no file there: the derivation extends employment-record.mjs, the module that already builds roles and already gained TASK 115's logo resolution, and its existing colocated test file grows with it."
  - "The anchor is emitted by EmploymentEntry.astro on the element it already renders per role. No new component, no wrapper element added purely to hold an id."
  - "No visible string changes (S-01). An anchor id is not reader-facing copy; it appears in a URL and in the DOM, never as text on the page."

out_of_scope:
  - "Card sizing, logo hierarchy and the two corrected assets. That is TASK 116, which changes how a card looks; this item changes where it goes."
  - "Anchors anywhere else on the site — case-study sections, about, the stack strip. This item gives four roles ids because four cards point at them; a general heading-anchor scheme is a different deliverable with a different audience."
  - "Preserving the fragment across a locale switch. The language switcher's behaviour is untouched, and a reader who switches locale mid-page lands where it already sends them. Named so the gap is a decision rather than an oversight."
  - "Scroll-spy or highlight-on-arrival treatment for the targeted role. The reader lands on it; making it flash or stay highlighted is a separate design question nobody has asked."
  - "Changing what /experience renders, beyond emitting an id per role."
```

## Intent

The employer strip shows four cards and every one of them links to `/experience`. The link is correct and the destination is not: `EmploymentEntry.astro:33` emits no `id`, so there is no anchor for a fragment to reach and the browser does the only thing it can, which is land the reader at the top of a page holding four roles. The strip therefore promises four destinations and delivers one — and it does so invisibly, because the first card *appears* to work: the NICE role is at the top of the page anyway.

The fix has two halves. `/experience` has to expose a target per role, and the cards have to point at their own. The interesting decision is where the id comes from. An explicit `anchor:` key in `roles[]` is the obvious option and is declined: it is a second value to author, twice, per locale, for something the company name already determines, and it puts a URL fragment into a content file the author edits for prose reasons. Deriving it from `company` costs one pure function and no content change at all.

That function is small and it is not trivial, which is why it earns TDD rather than a glance. It has to fold accents (`Avícola Sofía` → `avicola-sofia`, not a percent-encoded fragment nobody can read), collapse punctuation (`Banco Solidario S.A.` → `banco-solidario-s-a`), and refuse a collision loudly. On the punctuation: stripping legal suffixes to get a prettier `banco-solidario` was considered and declined, because the list of suffixes to strip is a roster, and a roster is exactly the shape `P-13` exists to refuse — it passes forever until the first employer whose suffix nobody listed. The derivable-but-ugly id wins.

On collisions: two roles yielding the same id **fails the build, naming both**, rather than auto-suffixing. Two stints at one employer is a real thing that can happen to this record, and when it does, a reader clicking the second card and silently landing on the first is a broken promise no test would catch. Failing loudly puts the decision where it belongs — with the author, who knows whether those are two roles or one.

One assumption worth recording because the intuitive version of it is wrong. The derivation runs per locale, off that locale's own `company` value. Today the two locales produce identical ids because the four company names are byte-identical across `experience.en.md` and `experience.es.md` (verified 2026-09-03, lines 10/19/31/40). But nothing here *depends* on that: both ends of every link — the card's `href` and the target's `id` — are built from the same locale's data, so a company name that differed by locale would still link correctly within each locale. Written down so nobody later goes looking for a cross-locale parity check that should not exist, and so nobody adds one.

## Behaviors

### EMP-008 — every role carries a derived, stable anchor · `critical` · `planned`

- **Given** `roles[]` with company names and no anchor key in `resources/**`, **When** the employment record builds, **Then** each role carries a deterministic, URL-safe id derived from its company name alone.
- **Edge cases:** accents fold rather than percent-encode · punctuation collapses, and suffix-stripping is declined as a roster (`P-13`) · a collision fails the build naming both roles · the derivation is per locale and depends on no cross-locale parity · an unusable name yields no anchor rather than an empty fragment.
- **Governed by:** ADR-006, ADR-008
- **Tests:** four in `employment-record.test`, two of them red paths.

### EMP-009 — the card reaches its own role · `critical` · `planned`

- **Given** `/experience` rendering the record and the home strip rendering the cards, **When** a reader clicks any card, **Then** they land on that role, not the page top.
- **Edge cases:** all four roles asserted per locale, because the first would pass with the mechanism entirely broken · the id sits on the role's own container · nothing overlays the target at any width, verified against `Rail.astro` rather than assumed · an unknown fragment degrades to the page, which is the browser's job.
- **Governed by:** ADR-008
- **Tests:** three in `home.smoke`, both locales.

## Constraints and invariants

Carried in the YAML block above. The two that decide the shape: **`resources/**` does not change**, which is what makes the derivation approach worth its function; and **that function is mutation-covered surface** (`S-06`, `D3`), so `tdd: required` is real here in a way it was not for `TASK 116` — the red paths are written and watched to fail before the derivation exists.

## Out of scope

Carried in the YAML block above. The one worth restating: **`TASK 116` changes how a card looks, this item changes where it goes.** The two are separable, testable apart, and deliberately not merged.

## Test plan

| Test (file::name) | Type | Scenario covered | Behavior(s) | Status |
|---|---|---|---|---|
| `employment-record.test::an anchor is derived for every role, from the company name alone` | unit | the happy path across all four real names | EMP-008 | planned |
| `employment-record.test::accents fold and punctuation collapses` | unit | `Avícola Sofía`, `Banco Solidario S.A.` — the two names that exercise every rule | EMP-008 | planned |
| `employment-record.test::RED: two roles deriving the same anchor is a finding naming both` | unit | the collision path | EMP-008 | planned |
| `employment-record.test::RED: a company name yielding no usable slug produces no anchor` | unit | the degenerate input | EMP-008 | planned |
| `home.smoke::EMP-009 each of the four cards links to its own anchor, both locales` | e2e | the href half, asserted per role rather than per page | EMP-009 | planned |
| `home.smoke::EMP-009 the matching element with that id exists on the target page, both locales` | e2e | the target half — the two halves can drift apart and each passes alone | EMP-009 | planned |
| `home.smoke::EMP-009 following a non-first card's link scrolls past the page top` | e2e | the promise itself, observed rather than inferred from markup (T-07) | EMP-009 | planned |
| mutation over the derivation | mutation | the new core is actually tested, not merely covered | EMP-008 | planned |

**Coverage gaps:**

- **Nothing asserts the reader lands at a *comfortable* position** — only that they land past the page top. Whether the role sits pleasantly in the viewport is optical and belongs to the author's pass (`P-15`).
- **The locale switcher does not carry the fragment**, and no test asserts it either way. Declared out of scope above rather than left silent (`P-03`).
- **The e2e tier runs Chromium only**, per `ADR-006`'s 2026-09-01 amendment. Fragment navigation is a well-standardised behaviour and no cross-engine defect has been observed on this surface, so no exception is requested (`T-05`, `C-11`).

## Traceability

| Behavior | Priority | Status | Test(s) | Test written first? | ADR |
|---|---|---|---|---|---|
| EMP-008 | critical | implemented | `employment-record.test` ×6 | yes | ADR-006, ADR-008 |
| EMP-009 | critical | implemented | `home.smoke` ×3 | yes | ADR-008 |

## Drift log

| Date | What diverged | Spec or code corrected | Note |
|---|---|---|---|
| 2026-09-03 | The spec's `constraints` said the derivation reaches both consumers through `buildEmploymentRecord` with no gateway work, which is true of **runtime** and false of **types**. `EmploymentEntryContent` is a declared interface — `content-queries.ts:649`, duplicated at `EmploymentRecord.astro:15` — and a field no interface names does not type-check its way into a component | Code corrected: two interface lines added. Spec's constraint wording left as written, since it is accurate about what it actually claims | *"No reshaping"* and *"no change"* are different propositions, and only the first had been checked when the second was written into the work log. Caught during slice A rather than discovered as a type error during slice B |
| 2026-09-03 | `EMP-008`'s test plan named four tests; six were written. The two extra exist because the first mutation run named four survivors in the new code, all of them real gaps: the collision guard's own skip condition, and the punctuation-run collapse | Code corrected — tests added, not the spec | `T-03` treats a survivor as a finding rather than a statistic. Each new test was proven to kill its named mutant by hand-applying the mutant to the real source, watching the test fail, and reverting — rather than trusting that a test near the line must cover it |
| 2026-09-03 | Two further survivors on the trim step (`/^-+\|-+$/`, one mutant per alternation branch) are **equivalent mutants**, suppressed at the mutant with a written reason rather than chased with a test | Code: suppression added. No spec change | Equivalent by construction: the preceding collapse replaces every maximal run of non-alphanumerics with exactly one hyphen in one global pass, so no two hyphens can ever be adjacent when the trim runs, making `-+` and `-` identical for every reachable input. Verified by fuzzing boundary-punctuation inputs against hand-built copies of each mutant before concluding equivalence. **The first suppression placement silently did nothing** — a `disable next-line` anchors to the start line of the AST node the comment attaches to, which inside a multi-line method chain is the chain's first line, not the line below the comment. Fixed by extracting the step into its own statement |
| 2026-09-03 | `employment-record.test` grew to six anchor-derivation tests rather than the four the test plan named. The first four covered every edge case in the behavior's own list; the mutation run found two survivors the four did not kill (a run of punctuation collapsing to one hyphen, and two anchor-less roles not colliding with each other), and both got a real test rather than a suppression. | Code (and this table) corrected | `T-03`: a surviving mutant is a finding, not a statistic — the extra tests are the finding closed, not scope creep. |
| 2026-09-03 | `home.smoke`'s pre-existing EMP-001 test (`each employer card links to the "<lang>" experience route`) asserted every card's `href` equals the bare `/experience` route exactly. EMP-009 makes that assertion false for any role with a derivable anchor: three of the four cards now carry a `#anchor` fragment. | Code (test) corrected | Widened the assertion to `^<route>(#.+)?\$` — the correct locale route, fragment optional — which keeps it scoped to what EMP-001 actually promised (the right page) and leaves the exact per-role fragment to EMP-009's own three assertions below it. |
