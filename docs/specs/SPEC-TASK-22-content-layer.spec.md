# SPEC-TASK-22: Content layer — collections, schema, locale join

```yaml
spec_id: SPEC-TASK-22
title: Content layer — collections, schema, locale join
status: shipped
version: 1.0
date: 2026-08-24
approved_version: 1.0
work_item: TASK-22
intent: "Give every later page item one place that loads resources/, one place that joins a slug across locales, and one place that builds a route path — all three testable without a browser or a bundler."

tdd: required
tdd_rationale: >
  Not applicable-by-exception anywhere. This is a `feature` item and site/lib/content/** is the
  mutation-covered surface named in 30-testing.md — parsing, joining and deciding, which is what
  D3 scoped mutation to in the first place. T-01's universal half binds directly: no production
  behaviour here ships without a test that failed before it. The guard slice is TDD by its own
  rule (T-04): a red-path battery, proven against a real violating tree and not only fixtures.
reproduces:

governed_by:
  - ADR-001
  - ADR-002
  - ADR-003
  - ADR-006
  - ADR-008
related_docs:
  - TASKS.md
  - .claude/rules/30-testing.md
  - .claude/rules/50-implementation.md
  - docs/adr/README.md
  - docs/design/decisions/2026-08-22-site-structure.md

behaviors:
  - id: CONTENT-001
    given: "resources/ holds twelve locale-suffixed markdown files across two directories, plus two files that carry no locale suffix"
    when: "astro build runs"
    then: "three collections load — pages, caseStudies and ui — every entry validates against its schema, and the two unsuffixed files are absent from all three"
    priority: critical
    status: implemented
    edge_cases:
      - "resources/site/intake.md carries no frontmatter and must not reach a collection — excluded by the shape of the glob pattern, never by naming the file"
      - "resources/github/profile-README.md is outside every collection's base and is not reachable at all"
      - "ui.{en,es}.md sits in the same directory as the pages but is a different content shape, so it is a different collection"
      - "base points outside the project root, which the skeleton item proved works and no vendor sentence guarantees"
    tests:
      - "manual::three-collections-load-at-build"

  - id: CONTENT-002
    given: "a collection whose schema pins `type` to the literal values that collection may hold"
    when: "an entry declares a type outside that set"
    then: "the build fails naming the file and the offending value, rather than passing the entry through"
    priority: critical
    status: implemented
    edge_cases:
      - "an unknown type is a finding, not a pass — it is either a typo or a shape nobody has specified keys for, and both need a human"
      - "the five universal keys are the ONLY frontmatter duplicated into Zod; per-type required keys stay with check-content, per ADR-002 sub-decision 1, which is followed here rather than the register's looser paraphrase of it"
      - "the loose form is z.looseObject: same decision as ADR-002's .passthrough(), current method name, because astro 7.2.5 installs zod 4.4.3 where the older name is deprecated"
    tests:
      - "manual::unknown-type-fails-the-build"

  - id: CONTENT-003
    given: "a set of loaded entries where every slug is expected to exist in both locales"
    when: "the pair assertion runs, or a page is queried by slug and locale"
    then: "each slug resolves to exactly one entry per locale, its alternate resolves to the other, and a slug present in only one locale throws naming that slug"
    priority: critical
    status: implemented
    edge_cases:
      - "the join key is entry.data.slug, never the collection's generated id. CORRECTED 2026-08-24: this edge case originally repeated ADR-003's claim that the id is filename-derived, which is false for astro 7.2.5 — the default id IS data.slug when frontmatter carries one, so both locales of a pair collide and one silently overwrites the other. An explicit generateId derives the id from the file path instead"
      - "a slug absent from both locales is a different failure from a slug present in one, and the message says which"
      - "a duplicate slug within one locale is a failure, not a silent first-match"
      - "failing loudly is the point: a half-rendered page is the outcome this behaviour exists to prevent"
    tests:
      - "site/lib/content/entries/locale-pair.test.mjs"

  - id: CONTENT-004
    given: "mobile-banking-platform carries no `outcome` in either locale, and the other four case studies carry no `scale`"
    when: "an entry is read through the gateway and a consumer asks for an absent optional field"
    then: "the value is `undefined` — never an empty string, a null, a zero or any other fabricated stand-in"
    priority: critical
    status: implemented
    edge_cases:
      - "C-01: a missing value is fine, an invented one is disqualifying. No default is supplied anywhere in this layer"
      - "an absent field must be distinguishable from a field explicitly present and empty"
      - "the specimens are real content, but the unit fixtures are invented so the test does not break when the content changes (T-07)"
    tests:
      - "site/lib/content/entries/case-study-catalog.test.mjs"

  - id: CONTENT-005
    given: "the loaded pages and case-study collections, and the two locales"
    when: "the route set is derived"
    then: "it contains every published route in both locales — the unprefixed English route and its /es/ counterpart — and adding a content pair changes the set with no code edit"
    priority: critical
    status: implemented
    edge_cases:
      - "English is unprefixed and Spanish is prefixed, per ADR-003's URL shape"
      - "the home page is the work page: there is no /work route, and Work and Contact are anchors rather than routes"
      - "/case-studies, the index, is designed and deliberately not routed — it must not appear in the set"
      - "one function builds a path; nothing else concatenates one"
    tests:
      - "site/lib/content/routes/route-set.test.mjs"

  - id: CONTENT-006
    given: "the slug set derived by reading the filenames under resources/"
    when: "check-site runs over the site tree"
    then: "a source file outside the declared route-declaration site that contains a literal naming a real slug is a finding, and the same literal inside the declaration site passes"
    priority: critical
    status: implemented
    edge_cases:
      - "a planted literal in a page fails; a planted literal in a test fails; the legitimate one in the derivation module passes"
      - "the slug set is DERIVED from disk, never listed in config — a sixth case study is covered with no edit"
      - "the declaration site is a SET in config, the same shape as the gateway boundary, not a roster of components"
      - "quoted text that merely resembles a path is not a route literal — the check names a real slug or it does not fire"
    tests:
      - "scripts/guards/lib/site-structure.test.mjs"

  - id: CONTENT-007
    given: "the frozen content's in-body links, which are written unprefixed and identically in both locales"
    when: "an internal href is localized for a target locale"
    then: "the Spanish locale yields the /es/-prefixed path, English yields the href unchanged, and an anchor, an external URL or a mailto: is returned untouched"
    priority: critical
    status: implemented
    edge_cases:
      - "an already-prefixed /es/ href is not double-prefixed"
      - "a bare fragment (#work) and a same-page anchor are not routes"
      - "http://, https:// and mailto: are left alone"
      - "the function is pure and framework-free — no astro:i18n, because ADR-008 puts locale URLs in the core and S-06 makes that enforceable"
    tests:
      - "site/lib/content/routes/internal-link-localizer.test.mjs"

  - id: CONTENT-008
    given: "the tree this item creates"
    when: "check-site runs"
    then: "only the gateway and content.config.ts import astro:content, site/lib/** imports no framework and nothing from site/src/**, and no directory reaches seven files"
    priority: normal
    status: implemented
    edge_cases:
      - "entries/ and routes/ each name a context; a folder existing only to absorb overflow is a finding, not compliance"
      - "no comment under site/** references anything outside site/"
    tests:
      - "scripts/guards/gate/check-site.mjs against the real tree"

  - id: CONTENT-009
    given: "the content core's colocated test files"
    when: "node scripts/gate.mjs runs"
    then: "a gate step runs them, a deliberately broken one fails that step, and Stryker's tap runner is handed the same files so the mutants it already generates for this surface are killable"
    priority: critical
    status: implemented
    edge_cases:
      - "the mutate glob for this surface already exists and its testFiles half does not — without the second half every new mutant survives and the aggregate falls below the measured floor"
      - "the step skips with a named reason on a tree where the directory does not exist, and the skip is announced"
      - "proven in red before it is declared done: a step seen only to pass is a step that has not been tested"
    tests:
      - "manual::gate-step-fails-on-a-broken-core-test"
      - "manual::mutation-score-does-not-fall"

constraints:
  - "resources/** is read-only (H-02). The collections read it; nothing writes back, and no orphan can be planted there to test CONTENT-003"
  - "Only the five universal keys are duplicated into Zod (ADR-002 sub-decision 1). Per-type required keys stay with check-content, which owns byType"
  - "No Mermaid at build time, and no diagram pipeline in this item at all (ADR-002 decision 3)"
  - "The core operates on already-loaded entries and imports no framework (S-06, ADR-008 sub-decision 2)"
  - "Only site/src/gateway/** and site/src/content.config.ts import astro:content (S-02)"
  - "No directory under site/** holds seven files, and a subdivision names a context (S-03)"
  - "No comment under site/** references a path, document, rule, ADR, incident or work item (S-08)"
  - "Every name says what the thing is and what state it holds (S-10)"
  - "One datum, one declaration site: the route set is derived from the collection, and the alternate-locale URL comes from the slug join"
  - "No git write (H-01). The human owns commits"

out_of_scope:
  - "The :::diagram directive transform and the SVG copy into public/ — owned by the item that renders case-study prose, which is where it can be verified against real HTML rather than by inspection"
  - "The rehype plugin that applies localizeInternalHref to the markdown pipeline — same owner, same reason. The pure function and its answer to ADR-003 ship here"
  - "Rendering of any kind — no component, template or page. The register's fourth criterion ends with 'the consuming component omits its block', which is not a clause this item leaves unowned: 'a section is omitted when its content is absent' is a standing decision taken 2026-08-23 that already binds every page item. CONTENT-004 owns the part that exists here, whole"
  - "Any page, layout, token, stylesheet or component — owned by the layout-shell and page items"
  - "The i18n block in astro.config.mjs, and astro:i18n entirely. Nothing reads it; routes are explicit and fallback is deliberately not relied on"
  - "site/lib/i18n/ and site/lib/nav/ from ADR-008's tree. Neither is covered by the node:test or Stryker globs today, and widening those globs is its own work item"
  - "Playwright, Vitest, Stylelint — each arrives with the item that needs it (S-07)"
```

## Intent

Every page item after this one asks the same three questions: *what content exists*, *what is its counterpart in the other locale*, and *what URL does it live at*. Answering them once, in a module a plain `node --test` can run and Stryker can mutate, is the whole value of this item — and it is why `D3` scoped mutation to parsing, joining and deciding rather than to templates.

The item also closes two things that have been open since 2026-08-19 with no owner: how a locale-naive link inside frozen prose becomes a correct link on a Spanish page, and whether Astro's own i18n fallback is something this project may rely on. Both get an answer in `ADR-003`, not only in code — an amendment, because a decision that lives in an implementation is a decision the next reader cannot find.

## Behaviors

### CONTENT-001 — three collections load every publishable file · `critical` · `implemented`

- **Given** `resources/` **When** the site builds **Then** `pages`, `caseStudies` and `ui` load, every entry validates, and the two files carrying no locale suffix are in no collection.
- **Edge cases:** `intake.md` is excluded by the pattern's shape, not by being named; `profile-README.md` is outside every base; `ui.{en,es}.md` is its own collection because it is its own shape; `base` resolves outside the project root.
- **Governed by:** ADR-002, ADR-008 sub-decision 3

### CONTENT-002 — an unknown `type` is a build failure · `critical` · `implemented`

- **Given** a schema pinning `type` per collection **When** an entry declares something else **Then** the build fails naming the file and the value.
- **Edge cases:** only the five universal keys reach Zod; `z.looseObject` rather than the deprecated `.passthrough()`, because the installed Zod is 4.4.3.
- **Governed by:** ADR-002 sub-decision 1, C-14

### CONTENT-003 — the pair joins, and an orphan throws · `critical` · `implemented`

- **Given** loaded entries **When** a page is queried or the pair assertion runs **Then** the slug resolves per locale, the alternate resolves, and a one-locale slug throws naming it.
- **Edge cases:** the join key is `entry.data.slug` and never the generated id; absent-from-both and present-in-one are different messages; a duplicate slug in one locale fails rather than silently first-matching.
- **Governed by:** ADR-003

### CONTENT-004 — an absent optional field is `undefined`, never invented · `critical` · `implemented`

- **Given** real specimens — no `outcome` on the platform entry, no `scale` on the four case studies **When** a consumer reads an absent field **Then** it is `undefined`, with no stand-in supplied anywhere in this layer.
- **Edge cases:** absent must be distinguishable from present-and-empty; fixtures are invented so the test survives a content change.
- **Governed by:** C-01

### CONTENT-005 — the route set is derived · `critical` · `implemented`

- **Given** the two routable collections and the two locales **When** the set is derived **Then** it holds every published route in both locales, and a new content pair changes it with no code edit.
- **Edge cases:** English unprefixed, Spanish prefixed; no `/work` route; `/case-studies` is not routed; one function builds a path.
- **Governed by:** ADR-003, and the site-structure decision

### CONTENT-006 — no route literal naming a real slug lives outside its declaration site · `critical` · `implemented`

- **Given** the slug set derived from disk **When** `check-site` runs **Then** a literal naming a real slug outside the declared site is a finding, and the same literal inside it passes.
- **Edge cases:** planted in a page fails, planted in a test fails, legitimate in the derivation module passes; the set is derived, the declaration site is a config set.
- **Governed by:** ADR-008, S-02's precedent for declaring a boundary as a set

### CONTENT-007 — an internal prose link is localized · `critical` · `implemented`

- **Given** frozen prose whose links are unprefixed in both locales **When** an href is localized **Then** Spanish gets the prefix, English is unchanged, and anchors, external URLs and `mailto:` are untouched.
- **Edge cases:** no double prefix; a bare fragment is not a route; the function is pure and imports no Astro.
- **Governed by:** ADR-003 (its first open item, answered here)

### CONTENT-008 — the tree holds its own shape · `normal` · `implemented`

- **Given** the created tree **When** `check-site` runs **Then** the gateway boundary, the framework-free core, the file cap and the comment rule all hold.
- **Governed by:** ADR-008, S-02, S-03, S-06, S-08

### CONTENT-009 — the core's tests are run by the gate and can kill their mutants · `critical` · `implemented`

- **Given** the colocated test files **When** the gate runs **Then** a step runs them and a broken one fails it, and the tap runner is handed the same files so the mutants already generated for this surface are killable.
- **Edge cases:** the `mutate` half exists and the `testFiles` half does not; the step skips with a named reason where the directory is absent; proven in red before it is declared done.
- **Governed by:** ADR-006, T-03, T-04

## Constraints and invariants

`resources/**` is read-only, so `CONTENT-003`'s failure path is proven by unit test rather than by planting an orphan. The core is framework-free and operates on already-loaded entries, which is the only reason `node:test` can run it. Only the gateway and `content.config.ts` know Astro loaded anything. No directory reaches seven files, and each subdivision names a context rather than absorbing overflow. Nothing is installed that this item does not need.

## Out of scope

Named against an owner in the frontmatter block above, so nobody invents coverage: the diagram pipeline and the rehype wiring go to the prose item; tokens, layouts and components go to the layout-shell item; `astro:i18n` and the `i18n` config block go nowhere, because nothing reads them.

**One line of the register's fourth criterion is not deferred, it is already owned.** *"…and the consuming component omits its block"* names a component, and there is none here. It needs no new owner: *"a section is omitted when its content is absent"* was decided on 2026-08-23 and binds every page item as a standing constraint. What this item owes is the other clause, and `CONTENT-004` delivers it complete — no fabricated default anywhere in the layer, proven against real specimens.

## Test plan

`tdd: required`. This table is an inventory to work through one behaviour at a time — **not a batch to write red up front.** The red step is the deliverable: the failing message is reported before the implementation that satisfies it exists.

| Test (file::name) | Type | Scenario covered | Behavior(s) | Status |
|---|---|---|---|---|
| `locale-pair.test.mjs::finds the entry for a slug in the requested locale` | unit | happy path of the join | CONTENT-003 | green |
| `locale-pair.test.mjs::finds the alternate-locale entry for a slug` | unit | the alternate resolves | CONTENT-003 | green |
| `locale-pair.test.mjs::throws naming the slug when only one locale exists` | unit | the orphan, which is the whole point | CONTENT-003 | green |
| `locale-pair.test.mjs::distinguishes absent-from-both from present-in-one` | unit | two failures, two messages | CONTENT-003 | green |
| `locale-pair.test.mjs::rejects a slug duplicated within one locale` | unit | no silent first-match | CONTENT-003 | green |
| `locale-pair.test.mjs::joins on the slug field and not on a filename-derived id` | unit | the footgun ADR-003 names explicitly | CONTENT-003 | green |
| `case-study-catalog.test.mjs::lists only the entries of the requested locale` | unit | the locale filter | CONTENT-004 | green |
| `case-study-catalog.test.mjs::orders the listing the same way on every call` | unit | stable order, so the bento does not shuffle | CONTENT-005 | green |
| `case-study-catalog.test.mjs::leaves an absent optional field undefined` | unit | no fabricated default (C-01) | CONTENT-004 | green |
| `case-study-catalog.test.mjs::distinguishes an absent field from an empty one` | unit | the edge that makes the previous row meaningful | CONTENT-004 | green |
| `case-study-catalog.test.mjs::includes both the case-study and platform types` | unit | one listing, two archetypes | CONTENT-004 | green |
| `route-set.test.mjs::derives a route per entry per locale` | unit | the set is derived, not listed | CONTENT-005 | green |
| `route-set.test.mjs::leaves the default locale unprefixed and prefixes the other` | unit | ADR-003's URL shape | CONTENT-005 | green |
| `route-set.test.mjs::grows when a content pair is added, with no code change` | unit | criterion 1, proven rather than asserted | CONTENT-005 | green |
| `route-set.test.mjs::emits no index route for the collection` | unit | `/case-studies` is designed and not routed | CONTENT-005 | green |
| `internal-link-localizer.test.mjs::prefixes an internal href for the non-default locale` | unit | the ADR-003 open item | CONTENT-007 | green |
| `internal-link-localizer.test.mjs::returns the href unchanged for the default locale` | unit | English is unprefixed | CONTENT-007 | green |
| `internal-link-localizer.test.mjs::does not double-prefix an already-localized href` | unit | idempotence | CONTENT-007 | green |
| `internal-link-localizer.test.mjs::leaves a fragment, an external URL and a mailto untouched` | unit | what is not a route | CONTENT-007 | green |
| `site-structure.test.mjs::flags a route literal naming a real slug in a page` | unit | the red path | CONTENT-006 | green |
| `site-structure.test.mjs::flags a route literal naming a real slug in a test file` | unit | criterion 4 names tests explicitly | CONTENT-006 | green |
| `site-structure.test.mjs::allows the same literal inside the declaration site` | unit | the guard must not block its own mechanism | CONTENT-006 | green |
| `site-structure.test.mjs::derives the slug set from disk rather than from config` | unit | P-13 — item six is checked, not waved through | CONTENT-006 | green |
| `manual::three-collections-load-at-build` | e2e | the build's own output names the entry counts | CONTENT-001 | green |
| `manual::unknown-type-fails-the-build` | e2e | a temporarily mistyped literal in the schema's union makes the build fail loudly | CONTENT-002 | green |
| `check-site.mjs against the real tree` | integration | PASS, with the file cap and both boundaries holding | CONTENT-008 | green |
| `manual::gate-step-fails-on-a-broken-core-test` | e2e | a deliberately broken core test fails the new step, then is restored | CONTENT-009 | green |
| `manual::mutation-score-does-not-fall` | mutation | the aggregate stays at or above the measured floor with the new surface included | CONTENT-009 | green |

**Coverage gaps, each with an owner rather than a silence:**

- **`CONTENT-003`'s build-time firing is not proven by a build.** `resources/**` is read-only, so no orphan can be planted. The throw is proven by unit test; that it fires *during a build* is proven the day a page item queries the collection. Owner: the page items.
- **`CONTENT-001` and `CONTENT-002` are `manual::` rows.** There is no test runner in `site/` that can drive a build, and this item does not add one. The evidence is the build's own printed output, recorded verbatim in the work log — never "it should work". Owner of the automated form: the smoke-tier item.
- **Nothing here renders, so nothing here omits a block.** `CONTENT-004` covers what this layer owns, whole: an absent field surfaces as `undefined` and no value is ever invented. That a template then omits the block is the standing decision *"a section is omitted when its content is absent"*, binding every page item since 2026-08-23 — an obligation that already has an owner, not a gap this item leaves behind.

## Traceability

| Behavior | Priority | Status | Test(s) | Test written first? | ADR |
|---|---|---|---|---|---|
| CONTENT-001 | critical | green | `manual::three-collections-load-at-build` | n/a — build evidence | ADR-002, ADR-008 |
| CONTENT-002 | critical | green | `manual::unknown-type-fails-the-build` | n/a — build evidence | ADR-002 |
| CONTENT-003 | critical | green | `locale-pair.test.mjs` (6 rows) | yes | ADR-003 |
| CONTENT-004 | critical | green | `case-study-catalog.test.mjs` (4 rows) | yes | — (C-01) |
| CONTENT-005 | critical | green | `route-set.test.mjs` (4 rows), `case-study-catalog.test.mjs::orders…` | yes | ADR-003 |
| CONTENT-006 | critical | green | `site-structure.test.mjs` (4 rows) | yes | ADR-008 |
| CONTENT-007 | critical | green | `internal-link-localizer.test.mjs` (4 rows) | yes | ADR-003 |
| CONTENT-008 | normal | green | `check-site.mjs` against the real tree | the guard's own tests predate it | ADR-008 |
| CONTENT-009 | critical | green | `manual::gate-step-fails-on-a-broken-core-test`, `manual::mutation-score-does-not-fall` | n/a — a gate step, proven in red | ADR-006 |

## Drift log

| Date | What diverged | Spec or code corrected | Note |
|---|---|---|---|
| 2026-08-24 | `ADR-003` says cross-locale links use `astro:i18n`'s `getRelativeLocaleUrl`. `ADR-008`, four days later, puts locale URLs in the framework-free core, and `S-06` makes that enforceable — a module importing `astro:i18n` leaves both `node:test`'s and Stryker's reach | Spec follows `ADR-008`; `ADR-003` is amended in this item rather than left disagreeing | The later decision governs, and the earlier one is corrected rather than quietly ignored |
| 2026-08-24 | The work item's first constraint asks for per-type required keys in the schema. `ADR-002` sub-decision 1 weighed exactly that as its Option A and rejected it | Spec follows the ADR; `type` is pinned to a literal union, which is what the constraint's real requirement — an unknown type is a build failure — actually needs | Two owners for `byType` is the drift `ADR-002`'s review trigger exists to prevent |
| 2026-08-24 | The guard written for CONTENT-006 found a real violation on its first run against the tree: `route-set.test.mjs` used `/about` as a sample input to the path builder, and `about` is a real page slug | The fixture moved to an invented slug, matching the convention every other fixture in that file already followed | **The guard earning its place on day one**, and the correction improves the test independently: a fixture coupled to real content breaks the day the content changes (`T-07`). Precision confirmed in the same run — it did not fire on the invented slugs, on `'/es'`, or on the template literals |
| 2026-08-24 | **The load-bearing one.** `ADR-003` states that the collection's auto-generated id is filename-derived (`mobile-banking-platform-en`). False for `astro@7.2.5`: the loader's default returns `data.slug` whenever frontmatter carries one, and `ADR-002` made `slug` universal — so both halves of a locale pair generated the **same id** and one silently overwrote the other in the content store | Code corrected with an explicit `generateId` deriving from the file path, on all three collections; `ADR-003`'s parenthetical marked refuted in the index; this spec's own CONTENT-003 edge case, which repeated the same claim, corrected in place | **Found by a build, not by review.** The first real build failed with `slug "about" is present only in "es", missing "en"` — the content core's own pair assertion catching a live defect on first contact with real content, which is exactly what CONTENT-003 exists to do. The ADR's advice *not* to pair on the id was right; the reason it gave described behaviour that does not exist, and the real behaviour is worse than the one being warned about |
| 2026-08-24 | **A method name, not a decision.** `ADR-002` was written against Zod 3 documentation and spells the loose form `.passthrough()`. `astro@7.2.5` installs `zod@4.4.3`, where that method still works but reads `@deprecated Use z.looseObject() or .loose() instead` | Spec uses the current name; `ADR-002` gains a dated note | Sub-decision 1 is untouched: five universal keys in the schema, everything type-conditional left to `check-content`. The only thing that moved is what the library calls the method. Read from `node_modules/zod/v4/classic/schemas.d.cts:460`, never from a release page (`C-01`) |
