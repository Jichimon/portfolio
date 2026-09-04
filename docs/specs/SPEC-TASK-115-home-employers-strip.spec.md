# SPEC-TASK-115: The home page's employer strip, rendered from the existing experience record

```yaml
spec_id: SPEC-TASK-115
title: Home employer strip, sourced from experience.{en,es}.md's roles[]
status: active
version: 1.1
date: 2026-09-03
approved_version: 1.1
work_item: TASK-115
intent: "Build the 'Where I've worked' section every home artboard already carries, sourced from the structured roles[] data TASK 20/26 already landed, with a real build-time resolution from a role's logo key to a served asset — a mechanism that does not exist yet anywhere in the pipeline."

tdd: required
tdd_rationale:
reproduces:

governed_by:
  - ADR-006
  - ADR-008

related_docs:
  - resources/site/experience.en.md
  - resources/site/experience.es.md
  - resources/site/ui.en.md
  - resources/site/ui.es.md
  - resources/logos/employers/
  - site/src/gateway/content-queries.ts
  - site/lib/content/pages/employment-record.mjs
  - site/src/components/experience/EmploymentEntry.astro
  - site/src/components/home/HomeSections.astro
  - site/src/components/home/StackStrip.astro
  - site/tests/e2e/home.smoke.spec.ts
  - scripts/guards/guards.config.json
  - docs/design/canvas/src/Main.dc.html
  - docs/design/canvas/src/HomeMobile.dc.html
  - docs/design/canvas/src/HomeES.dc.html

behaviors:
  - id: EMP-001
    given: "experience.{en,es}.md declare roles[] with company, period, and an optional logo, in a fixed order"
    when: "the home page is built for a locale"
    then: "the employers section renders one card per role, in the same order roles[] declares, between the hero and the work bento, each linking to /experience (/es/experience in Spanish) — with no employer name, year or count written anywhere in site/"
    priority: critical
    status: planned
    edge_cases:
      - "the section reuses getExperienceRecord(lang), the same data the /experience page already renders — no second collection and no duplicated employer facts"
      - "order is roles[] order, never re-sorted and never alphabetical, matching STACK-001's precedent for the same reason: which employer a reader meets first is the author's decision"
      - "an absent or empty roles[] yields no section, not an empty one — the same absent-content contract Testimonials and StackStrip already carry"
      - "the section's own heading comes from the already-authored, currently-unused ui.home.employers_heading string — no new string is invented"
    tests:
      - "home.smoke::EMP-001 renders one card per declared role, in declared order, in both locales"
      - "home.smoke::EMP-001 each card's href resolves to that locale's /experience route"

  - id: EMP-002
    given: "a role that declares logo: <file>, a role that declares none, and resources/logos/employers/ as the marks directory"
    when: "the collection loads and the card renders"
    then: "a declared logo with an asset behind it renders inside the fixed logo-slot box; a role with no logo renders the wordmark alone with no placeholder; a declared logo naming a file with no asset behind it fails the build naming the role; an asset under resources/logos/employers/ that no role references fails the build too"
    priority: critical
    status: planned
    edge_cases:
      - "this mechanism does not exist today: EmploymentEntry.astro already has a logo? prop and renders <img src={logo}>, but nothing resolves that string to a real, build-processed URL — unlike the stack strip's MARK_SOURCES glob (content-queries.ts:245-247), which this behavior mirrors for a second, separately-scoped folder"
      - "logos here are full-colour brand marks rendered via <img>, not SVG inlined with currentColor — this deliberately does not follow STACK-002's monochrome-follows-theme rule, because the design's own .logo-slot img is an object-fit: contain image box, not a mark span"
      - "the wordmark-alone fallback is the constraint TASK 24 already wrote down: 'Logo slots render only when a logo file exists, and the wordmark stands alone otherwise'"
      - "the publication-boundary check (asset -> reference) is scoped to resources/logos/employers/ by folder, mirroring STACK-003's same rule for resources/logos/stack/ — one flat resources/logos/ would force a roster to tell the two families apart (P-13), which TASK 114 already declined"
      - "the alt text is empty/decorative, matching EmploymentEntry.astro's existing convention: the company name renders as visible text beside the mark, so the mark is redundant with it (S-01)"
      - "this behavior does not touch or re-validate cross-locale agreement of roles[] itself (count, order, company/period parity) — that data and its own guarantees predate this item and belong to whatever validates experience.{en,es}.md today; this item only adds the logo -> asset resolution layer on top of it"
    tests:
      - "employer-logos.test::a role declaring a mark carries its filename; one declaring none carries no logo key at all"
      - "employer-logos.test::RED: a declared logo filename with no asset behind it is a finding naming the role"
      - "employer-logos.test::RED: an asset under resources/logos/employers/ that no role references is a finding naming the file"
      - "home.smoke::EMP-002 a role with a logo renders an <img>; a role without renders the wordmark alone with no broken image and no placeholder box"

  - id: EMP-003
    given: "the home page's existing sections (hero, work bento, stack strip, contact) and the S-03 file cap on site/src/components/home/, already at 6 of 6"
    when: "the employers section ships"
    then: "it renders as its own section between the hero and the work bento in the built DOM, matching the id=\"employers\" position in all three artboards, and its component(s) live in site/src/components/home/employers/ rather than directly in home/"
    priority: critical
    status: planned
    edge_cases:
      - "the design's own section order is hero -> employers (#employers) -> work (#work) -> marquee/stack (#stack) -> contact (#contact), confirmed identically in Main.dc.html, HomeMobile.dc.html and HomeES.dc.html — this item does not reorder anything else"
      - "the new subfolder mirrors the existing home/work/ split (WorkBento, CaseTile, CaseMotif), the same S-03 remedy already applied once on this exact directory"
      - "check-site's directory file-count guard passes with the new subfolder in place"
    tests:
      - "home.smoke::EMP-003 the employers section's DOM position falls after the hero and before the work bento, in both locales"
      - "check-site (gate step) passes with no S-03 finding under site/src/components/home/"

constraints:
  - "resources/** is read-only to every agent (H-02). The four logo files and the logo: key on each role in experience.{en,es}.md are the author's to write; this item's code half ships and builds green against zero declared logos, the same contract SPEC-TASK-114 already established for the stack strip."
  - "No new content collection. roles[] already lives inside the pages collection's experience entry; this item adds a resolution layer and a render surface, not a second source of employer facts."
  - "site/src/components/home/ holds 6 files against maxFilesPerDir 6 (S-03); this item adds none there. The new component(s) open site/src/components/home/employers/."
  - "The logo-resolution module is new logic — parsing a declared filename, joining it against the glob of real assets, and failing on either a dangling reference or an unreferenced asset — which is exactly D3's TDD/mutation surface (parsing, joining, validating), not a render template. It lands in a lib/ or gateway module Stryker already covers, mirroring where stack.mjs's equivalent check lives."
  - "resources/logos/employers/, not resources/logos/stack/ — the folder TASK 114 named and reserved for this exact purpose, and never populated until this item."
  - "The heading is not reworded or newly authored. ui.home.employers_heading already carries both locales' final copy and is wired in, unchanged."

out_of_scope:
  - "Sourcing, tracing or drawing the SVG logo files themselves. Which four files exist and what they look like is a content decision inside resources/** the author owns (H-02); this spec's implementation half builds the pipeline that consumes them, not the files."
  - "Re-validating cross-locale parity of roles[] (count, order, company/period agreement). That data and whatever already guarantees it predate this item; EMP-002 only adds the logo -> asset layer on top."
  - "Any change to the /experience page or EmploymentRecord/EmploymentEntry beyond what the new logo-resolution mechanism supplies to both consumers for free, since both read the same logo field."
  - "Reordering, restyling or otherwise touching the hero, work bento, stack strip or contact sections — this item inserts one new section between two existing ones and changes neither."
```

## Intent

Every home artboard — `Main.dc.html`, `HomeMobile.dc.html`, `HomeES.dc.html` — carries a fully designed **"Where I've worked" / "Dónde he trabajado"** section, `#employers`, sitting between the hero and the work bento. `TASK 24` (Home) built the rest of the page around it and left this one section out on purpose: at the time, the four employers existed only as prose inside `about.{en,es}.md`, and hardcoding four names into a template was the one thing that item's own criteria forbade. Its own words: *"The employer strip has no structured source until TASK 20 lands... Omit the section rather than hardcode it."*

`TASK 20`, closed by `TASK 26` on 2026-08-26, landed exactly that structured source — `roles[]` in `experience.{en,es}.md`, carrying `company`, `period` and an already-declared `logo` key nobody has populated. The section's heading string, `home.employers_heading`, has been sitting in `ui.{en,es}.md` unused since the chrome strings landed. Nobody came back to build the section itself once its blocker cleared — this spec is that return trip.

One real gap remains, and it is not content: `EmploymentEntry.astro` already renders `<img src={logo}>` from a role's `logo` prop, but nothing in the pipeline turns that frontmatter string into a real, build-verified asset URL. The stack strip solved the equivalent problem for its own marks (`content-queries.ts:245-247`, `stack.mjs:124-125`) — inline the SVG, fail the build on a dangling reference. This item builds the same shape of mechanism for a second, separately-scoped folder, `resources/logos/employers/`, rendering `<img>` rather than inlined `currentColor` SVG because the design's own `.logo-slot img` is a full-colour image box, not a themed mark.

## Behaviors

### EMP-001 — the strip renders from the existing record, in its designed position · `critical` · `planned`

- **Given** `experience.{en,es}.md` declare `roles[]` in a fixed order, **When** the home page builds for a locale, **Then** one card per role renders, in that order, between the hero and the work bento, each linking to that locale's `/experience` route.
- **Edge cases:** reuses `getExperienceRecord(lang)` rather than a second source · order is content, never re-sorted · absent content omits the section entirely · the heading is the already-authored, currently-unused `ui.home.employers_heading`.
- **Governed by:** ADR-008
- **Tests:** `home.smoke::EMP-001`, both locales.

### EMP-002 — the logo resolves to a real asset, or the wordmark stands alone · `critical` · `planned`

- **Given** a role with a declared `logo`, a role without, and `resources/logos/employers/` as the marks directory, **When** the collection loads and the card renders, **Then** a resolvable logo renders in the fixed slot, an absent one renders the wordmark alone, and either a dangling reference or an unreferenced asset fails the build by name.
- **Edge cases:** the resolution mechanism does not exist yet and this behavior builds it, mirroring `stack`'s pattern in a separate folder · full-colour `<img>`, not a themed inline mark · the wordmark-alone fallback is `TASK 24`'s own constraint · the publication-boundary check is scoped by folder, not by a roster.
- **Governed by:** ADR-006, ADR-008
- **Tests:** three red paths in a new `employer-logos.test`, plus `home.smoke::EMP-002`.

### EMP-003 — a fixed position in the page, inside its own subfolder · `critical` · `planned`

- **Given** the home page's four existing sections and `site/src/components/home/` already at the `S-03` cap, **When** the employers section ships, **Then** it renders between the hero and the work bento in the built DOM, and its component(s) live in a new `home/employers/` subfolder.
- **Edge cases:** the design's section order is identical across all three artboards · the subfolder mirrors the existing `work/` split, the same remedy already applied once on this directory.
- **Governed by:** ADR-008
- **Tests:** `home.smoke::EMP-003`, plus the `check-site` gate step.

## Constraints and invariants

Carried in the YAML block above. The two that decide the shape of the work: **`resources/**` is the author's** (`H-02`), so the four logo files and the `logo:` field are a hand-off and the code must build green without them; and **the resolution logic is new mutation-covered surface** (`D3`), landing in a `lib/`- or gateway-level module Stryker already reaches, not inline in a template.

## Out of scope

Carried in the YAML block above. Sourcing or drawing the four SVGs is explicitly not this spec's implementation half — that is the author's content decision, prepared collaboratively outside `resources/** ` and handed off per `H-02`.

## Test plan

| Test (file::name) | Type | Scenario covered | Behavior(s) | Status |
|---|---|---|---|---|
| `employer-logos.test::a role declaring a mark carries its filename; one declaring none carries no logo key` | unit | the optional logo, both ways | EMP-002 | planned |
| `employer-logos.test::RED: a declared logo filename with no asset behind it is a finding naming the role` | unit | a dangling reference | EMP-002 | planned |
| `employer-logos.test::RED: an asset under resources/logos/employers/ that no role references is a finding naming the file` | unit | the publication boundary | EMP-002 | planned |
| `home.smoke::EMP-001 renders one card per declared role, in declared order, both locales` | e2e | the count and order read from content | EMP-001 | planned |
| `home.smoke::EMP-001 each card's href resolves to that locale's /experience route` | e2e | the link target | EMP-001 | planned |
| `home.smoke::EMP-002 a role with a logo renders an img; one without renders the wordmark alone, no placeholder` | e2e | the render fallback | EMP-002 | planned |
| `home.smoke::EMP-003 the employers section's DOM position falls after the hero and before the work bento` | e2e | page structure | EMP-003 | planned |
| `check-site` (gate step) | guard | no S-03 finding under `site/src/components/home/` | EMP-003 | planned |
| mutation over the new logo-resolution module | mutation | the new core is actually tested | EMP-002 | planned |

**Coverage gaps:**

- **Nothing asserts a logo is visually correct** — cropped sanely, optically balanced against its three siblings, legible in both themes. `EMP-002`'s tests cover presence/absence and the two build failures; the rest is the author's eye at verification (`P-15`).
- **The e2e tier runs Chromium only**, per `ADR-006`'s 2026-09-01 amendment — no new engine-specific risk is introduced here, so no exception is requested.

## Traceability

| Behavior | Priority | Status | Test(s) | Test written first? | ADR |
|---|---|---|---|---|---|
| EMP-001 | critical | implemented | `home.smoke` x2 | yes | ADR-008 |
| EMP-002 | critical | implemented | `employment-record.test` x5, `home.smoke` x1 | yes | ADR-006, ADR-008 |
| EMP-003 | critical | implemented | `home.smoke` x1, `check-site` | yes | ADR-008 |

## Drift log

| Date | What diverged | Spec or code corrected | Note |
|---|---|---|---|
| 2026-09-03 | `site/lib/content/pages/` was already at 6/6 files (`S-03`) when implementation started; the test plan's `employer-logos.test` label implied a new file | Code corrected; spec's test-plan labels read as scenario names, not filenames | Logic landed inside `employment-record.mjs`/`employment-record.test.mjs` instead of a new module — small, tightly coupled to the role-building that module already does, and both `/experience` and the new strip already go through it |
| 2026-09-03 | EMP-002 assumed a full-colour `<img>` mark could be made theme-adaptive by painting the SVG with `fill="currentColor"` (the author's chosen fix for NICE's black-on-dark-theme contrast problem, from a preview rendered by inlining the SVG directly). That does not work: an `<img src="*.svg">` does not cascade the page's CSS `color` into the loaded document, so the deployed card renders NICE's wordmark black in both themes — confirmed against the real dark-theme screenshot, not assumed | Spec corrected: EMP-002 gains an explicit sibling-file convention instead | A declared `logo: nice.svg` additionally renders `nice-dark.svg` (same basename, `-dark` suffix) when that file exists alongside it, shown only under `[data-theme="dark"]` (the site's actual theme mechanism — an attribute the toggle sets at runtime, not `prefers-color-scheme`, so no CSS trick inside the SVG itself can react to it). No frontmatter or schema change: the convention is purely a second optional asset behind the same declared name. Falls back to the single logo, exactly as before, when no `-dark` sibling exists — every other logo (Banco Solidario S.A., Mamaya Tech, Avícola Sofía) is unaffected |
