# SPEC-TASK-116: The employer card's logo becomes the dominant element, and two assets are corrected to survive it

```yaml
spec_id: SPEC-TASK-116
title: Employer strip — logo-dominant hierarchy, name as caption, and the two assets that enlarging exposes
status: active
version: 1.0
date: 2026-09-03
approved_version: 1.0
work_item: TASK-116
intent: "Invert the employer card's visual hierarchy so the logo leads and the company name captions it, in the artboards as well as the component — and correct the two logo assets whose defects were invisible at 32px and are not at the new size."

tdd: not_applicable
tdd_rationale: "Every behavior here lands in presentation — a component's own scoped CSS, one template conditional — or in an asset file inside resources/**. None of it is parsing, joining or validating, which is the surface D3 scoped mutation and TDD to (T-01), and .astro components are deliberately outside the component tier because the build renders them and Playwright asserts them against a real build (30-testing.md). Declared out loud rather than left silent (P-03): the fallback branch in EMP-005 IS real behavior and is covered end-to-end, red path included — it is the instrument that differs, not the rigor. No module under site/lib/** changes in this item."
reproduces:

governed_by:
  - ADR-006
  - ADR-007
  - ADR-008

related_docs:
  - docs/specs/SPEC-TASK-115-home-employers-strip.spec.md
  - site/src/components/home/employers/EmployerCard.astro
  - site/src/components/home/employers/EmployersSection.astro
  - site/tests/e2e/home.smoke.spec.ts
  - docs/design/canvas/src/Main.dc.html
  - docs/design/canvas/src/HomeMobile.dc.html
  - docs/design/canvas/src/HomeES.dc.html
  - resources/logos/employers/

behaviors:
  - id: EMP-004
    given: "an employer card carrying a resolvable logo, at each of the three artboard widths, in both themes and both locales"
    when: "the home page is built and rendered"
    then: "the logo is the card's dominant element and the company name reads as its caption — the logo slot is materially larger than the name's type size, where today it is smaller"
    priority: critical
    status: implemented
    edge_cases:
      - "the longest name in the set (Banco Solidario S.A., and its Spanish siblings) still sets on at most two lines inside the card at the 390px artboard width — a caption that wraps to three lines has not become a caption, it has become a paragraph"
      - "the four cards keep a common optical baseline: the slot stays a fixed box with object-fit: contain, so a wide wordmark and a square icon still align, which is the reason the artboard gave for a fixed slot in the first place"
      - "period type is unchanged at 11px mono — this behavior moves two steps, not three, and a caption competing with the years underneath it defeats the point"
    tests:
      - "home.smoke::EMP-004 the rendered logo box is larger than the company name's computed font-size, in both locales"
      - "home.smoke::EMP-004 no employer card overflows its grid cell at 390px, 1024px and 1440px"

  - id: EMP-005
    given: "a role that declares no logo, alongside three that do"
    when: "its card renders"
    then: "the company name renders at the full pre-caption size rather than at caption size, so a card with no mark still leads with something legible instead of a small label over an empty slot"
    priority: critical
    status: implemented
    edge_cases:
      - "no placeholder box, dashed outline or reserved empty space stands in for the missing mark — TASK 24's original constraint, unchanged: 'Logo slots render only when a logo file exists, and the wordmark stands alone otherwise'"
      - "the artboard's own stated principle is what this branch protects: 'the wordmark works ALONE; a logo is an enhancement layered on top of a name that already reads, never a replacement for it'. A dominant logo slot is exactly what puts that principle at risk, which is why the fallback is a tested behavior here and not a styling detail"
      - "this is a real branch on a real prop, not a hypothetical: EmployerCard.astro already reads logo presence off Object.hasOwn, and all four roles currently declare one — so the branch is reachable only from a test fixture and must be asserted, never eyeballed"
    tests:
      - "home.smoke::EMP-005 a card with no logo renders its name at the full size, not the caption size"
      - "home.smoke::EMP-005 RED: a card with no logo renders no placeholder element in the slot's position"

  - id: EMP-006
    given: "Main.dc.html, HomeMobile.dc.html and HomeES.dc.html, which are the fidelity source of truth for the .employers section"
    when: "the component's hierarchy changes"
    then: "all three artboards carry the same hierarchy in the same change, so the design-fidelity diff reads the new proportions as the design rather than as drift"
    priority: critical
    status: implemented
    edge_cases:
      - "HomeES.dc.html is the length stress test and moves with the other two — the Spanish artboard exists precisely because the longest strings live there, and updating only the English pair would hide the wrap risk EMP-004's edge case names"
      - "the artboard comment block above .logo-slot states the design's reasoning; it is updated to match the new numbers rather than left describing a slot that no longer exists"
      - "no other section of any artboard is touched — this item changes .logo-slot and .employer-name and nothing else"
    tests:
      - "the design-fidelity diff (gate step) passes against .employers in all three artboards, both themes"

  - id: EMP-007
    given: "mamaya-tech.svg and banco-solidario.svg as they shipped in TASK 115, and the corrected files prepared outside resources/**"
    when: "a card renders either mark at the new slot size, on the dark theme"
    then: "neither shows a background-bleed outline nor a white fringe, and neither is visibly softer than its vector siblings"
    priority: normal
    status: implemented
    edge_cases:
      - "Mamaya Tech's defect was structural, not chromatic: the traced orange layer was a full-bleed rect with the letters punched out as evenodd holes, and the cream fill was trimmed ~1.5 units inside them, so the PAGE background showed through the gap — dark outline on the dark theme, invisible on the light one. The correction replaces the punched layer with a solid rect and paints the letters over it"
      - "Banco Solidario's fringe was opaque near-white, not semi-transparent, which is why a defringe pass could not reach it — measured, not inferred: 469 opaque near-white against 524 partial-alpha pixels. It is corrected by re-extracting from the author's 1132x615 source with alpha recovered from the darkest channel and the white matte un-composited, rather than by thresholding"
      - "the embedded raster that shipped in TASK 115 was 249x137 and would have been the one soft card at any larger slot; the replacement is resolution-adequate for a 3x display at the new size without carrying a master no screen asks for"
      - "nothing about the -dark.svg sibling convention, the logo: schema or the resolution mechanism changes — SPEC-TASK-115 built all three and they hold"
    tests:
      - "author's visual pass at three widths x two themes x two locales (P-15) — see Coverage gaps"

constraints:
  - "resources/** is read-only to every agent (H-02). Both corrected assets are produced outside it and applied by the author; the code half neither writes nor depends on the timing of that hand-off."
  - "The artboards are part of the deliverable, not documentation of it. Changing the component without changing docs/design/canvas/src/*.dc.html makes the fidelity diff report the intended change as a regression — EMP-006 exists because that failure mode is the default, not the exception."
  - "No change to the logo-resolution mechanism, the logo: frontmatter key, the -dark.svg sibling convention, or content-queries.ts's globs. This item changes size, hierarchy and two files inside resources/logos/employers/."
  - "No string a reader can see is introduced or reworded (S-01). The heading, the company names and the periods all continue to come from resources/**."
  - "Component styles stay scoped to their component, media queries included, and no colour literal is introduced (S-05). The type sizes this item moves are literals already, per EmployerCard.astro's existing comments explaining why they do not map onto a token step."

out_of_scope:
  - "Card ordering. Reverse-chronological stands, and the reasoning is recorded in this spec's Intent rather than left as an unstated default — but no code or content changes for it, so it is not a behavior."
  - "Where a card links to. That is TASK 117, which changes the href and adds the anchor target on /experience; this item does not touch either."
  - "The /experience page's own logo slot (EmploymentEntry.astro, 38x38). It is a different surface with a different layout and its own hierarchy, and nothing in the author's review named it."
  - "Re-tracing avicola-sofia.svg or the nice.svg/nice-dark.svg pair. Both were rendered at the new size during triage and are clean — vector traces with no raster residue and no punched background layer."
  - "Any new asset-quality guard. What broke here — a punched background layer, an opaque matte fringe, an under-resolution raster — is judged by looking at the rendered mark (P-15), and a check asserting 'this SVG has no full-bleed rect' would fail the three logos that legitimately have one."
```

## Intent

`TASK 115` shipped the employer strip faithful to the artboard. The artboard is what is wrong: `.logo-slot` is 32×32 against a `.employer-name` set at 21px/700, so the name outweighs the mark it exists to caption. A reader scanning the home page meets four company names in large bold type with a small graphic above each — the inverse of what a logo strip is for, which is recognition before reading.

Inverting that is a **design change, not a fidelity bug**, and the distinction decides the shape of the work: the three artboards are the fidelity source of truth, so they move in the same change or the diff reports the correction as drift. That is `EMP-006`, and it is `critical` rather than housekeeping because the failure mode is the default one.

Enlarging is also what makes two asset defects visible, which is why they belong to this item and not to a separate one — they share a single checkable done (`P-01`). Both were diagnosed on rendered output during the author's review rather than inferred from the files. Mamaya Tech's traced orange layer was a full-bleed rect with the letters punched out as `evenodd` holes, with the cream fill trimmed roughly 1.5 units inside them; the page background showed through that gap as a dark outline around every letter — invisible against the light theme's near-cream ground, glaring against the dark one, and worse at every size increase. Banco Solidario's mark carried a white fringe left by a chroma-key cut, and the reason no defringe pass could remove it is measurable rather than a matter of taste: 469 of the halo's pixels are **opaque** near-white against only 524 semi-transparent ones, so there is no alpha to un-composite and no threshold that separates them from the mark's own light regions. Its embedded raster was also 249×137, which is adequate at 32px and is not at the size this item introduces.

Both are corrected. Mamaya's punched layer is replaced by a solid rect with the letters painted over it — the halo is gone and the file is 8,865 bytes against 17,973, because the punched geometry was redundant. Banco Solidario is re-extracted from the author's 1132×615 source with alpha recovered from the darkest channel and the white matte un-composited, then resized and quantized: 36,760 bytes against the broken file's 70,259, at 4.5× the source resolution.

**On ordering, which the author raised and this spec answers without opening a behavior.** The strip runs newest-first and stays that way. The argument for ascending is real — antiquity to present reads as a growth arc and ends on the strongest employer — but it loses to a structural fact: *the strip is a credential list, not a timeline*. It carries no axis, no connecting rule and no arrow, so nothing in the layout tells a reader that time flows left to right, and absent that grammar the reader falls back on the universal convention for a list of employers, which is reverse-chronological. `/experience`, the page these cards link to, already orders the same four facts newest-first and badges the first as most recent; two orders for one set of facts across two pages costs more than any narrative gain. Reverse-chronological also happens to put the strongest employer for the target role in the position with the most visual weight. **What would change this answer:** giving the strip an explicit timeline treatment — a rule running through it, an axis, direction markers. Then the visual grammar becomes chronological and ascending is correct. That is a design decision nobody has made, and it is recorded here so that if it is made later, the ordering question is re-opened deliberately rather than rediscovered.

## Behaviors

### EMP-004 — the logo leads, the name captions · `critical` · `planned`

- **Given** a card with a resolvable logo at each artboard width, in both themes and locales, **When** the page renders, **Then** the logo slot is materially larger than the company name's type size, inverting today's relationship.
- **Edge cases:** the longest name still sets on at most two lines at 390px · the fixed slot keeps a common optical baseline across four differently-shaped marks · the period's 11px mono is unchanged.
- **Governed by:** ADR-007, ADR-008
- **Tests:** `home.smoke::EMP-004` ×2.

### EMP-005 — a card with no mark still leads with something legible · `critical` · `planned`

- **Given** a role declaring no logo, **When** its card renders, **Then** its name renders at the full pre-caption size, with no placeholder standing in for the absent mark.
- **Edge cases:** no placeholder, outline or reserved space · this branch is what protects the artboard's own "the wordmark works alone" principle, which a dominant slot is precisely what endangers · reachable only from a fixture today, so it must be asserted rather than observed.
- **Governed by:** ADR-008
- **Tests:** `home.smoke::EMP-005` ×2, one of them a red path.

### EMP-006 — the artboards move with the component · `critical` · `planned`

- **Given** the three artboards as fidelity source of truth, **When** the hierarchy changes, **Then** all three carry it in the same change and the fidelity diff passes.
- **Edge cases:** `HomeES.dc.html` is the length stress test and moves too · the artboard's own comment block is updated rather than left describing a slot that no longer exists · no other section is touched.
- **Governed by:** ADR-008
- **Tests:** the design-fidelity gate step.

### EMP-007 — the two corrected marks survive the new size · `normal` · `planned`

- **Given** the two defective assets and their corrected replacements, **When** either renders at the new slot size on the dark theme, **Then** no background-bleed outline, no white fringe, and no visible softness against the vector siblings.
- **Edge cases:** Mamaya's defect was structural (punched `evenodd` layer), Banco Solidario's was an opaque matte fringe plus insufficient resolution — different causes, both invisible at 32px · nothing in the resolution mechanism or the `-dark.svg` convention changes.
- **Governed by:** ADR-008
- **Tests:** the author's visual pass — see Coverage gaps.

## Constraints and invariants

Carried in the YAML block above. The two that decide the shape of the work: **the artboards are part of the deliverable** (`EMP-006`), because changing only the component turns the intended correction into a reported regression; and **`resources/**` is the author's** (`H-02`), so both corrected assets are a hand-off and the code half must neither write them nor depend on when they land.

## Out of scope

Carried in the YAML block above. Worth restating: **card ordering is answered in Intent and changes nothing**, and **where a card links to is `TASK 117`** — this item changes how a card looks, that one changes where it goes.

## Test plan

| Test (file::name) | Type | Scenario covered | Behavior(s) | Status |
|---|---|---|---|---|
| `home.smoke::EMP-004 the logo box is larger than the name's computed font-size, both locales` | e2e | the inverted hierarchy, measured on the rendered page rather than read off the stylesheet | EMP-004 | planned |
| `home.smoke::EMP-004 no card overflows its grid cell at 390px, 1024px and 1440px` | e2e | the caption does not become a paragraph at the narrow width | EMP-004 | planned |
| `home.smoke::EMP-005 a card with no logo renders its name at full size, not caption size` | e2e | the fallback branch | EMP-005 | planned |
| `home.smoke::EMP-005 RED: a card with no logo renders no placeholder in the slot's position` | e2e | the absence half of the fallback | EMP-005 | planned |
| design-fidelity diff (gate step) | guard | `.employers` matches across all three artboards, both themes | EMP-006 | planned |
| `npx astro check` (gate step) | build | no type error from the changed props or template branch | EMP-004, EMP-005 | planned |

**Coverage gaps:**

- **`EMP-007` is not machine-asserted, and that is deliberate rather than an omission.** A check that could catch a punched background layer or an opaque matte fringe would have to encode what a correct mark looks like, and it would fail the three logos that legitimately carry a full-bleed coloured background. The instrument is the author's eye at three widths × two themes × two locales (`P-15`), and the corrected files are rendered against both grounds before hand-off so that pass starts from evidence rather than from a first look.
- **Nothing asserts optical balance between the four marks** — that a wide wordmark and a square icon read as equally weighted inside a fixed box. Same instrument, same reason. This gap is inherited from `SPEC-TASK-115` and is not narrowed here.
- **The e2e tier runs Chromium only**, per `ADR-006`'s 2026-09-01 amendment. `EMP-004`'s measurements are layout facts a second engine could in principle disagree on; no cross-engine defect has been observed on this surface, so no exception is requested (`T-05`, `C-11`).

## Traceability

| Behavior | Priority | Status | Test(s) | Test written first? | ADR |
|---|---|---|---|---|---|
| EMP-004 | critical | implemented | `home.smoke` ×2, plus the visual pass that caught what they could not | n/a — `tdd: not_applicable` | ADR-007, ADR-008 |
| EMP-005 | critical | implemented | `home.smoke` ×2, both `test.skip()`-guarded with a stated reason | n/a — `tdd: not_applicable` | ADR-008 |
| EMP-006 | critical | implemented | design-fidelity gate step, `derive.mjs --check` + `verify.mjs` | n/a — `tdd: not_applicable` | ADR-008 |
| EMP-007 | normal | implemented | visual pass on the built screenshots, both themes | n/a | ADR-008 |

## Drift log

| Date | What diverged | Spec or code corrected | Note |
|---|---|---|---|
| 2026-09-03 | `EMP-005`'s fallback branch is not reachable from real content: all four roles in both locales declare a `logo`, and `resources/**` is not writable by the implementer, so no real build can render a card without a mark | Code implemented, spec's Coverage gaps extended | The branch ships (the `--standalone` modifier on the existing `hasLogo` conditional) and both e2e tests are **written and `test.skip()`-guarded with an explicit reason**, rather than omitted or left to pass vacuously. A skipped test carrying its reason goes live the day a role ships without a mark; a test that would still pass with the branch deleted never would (`T-02`) |
| 2026-09-03 | **`EMP-004`'s common optical baseline still fails in a ~130px-wide band, and the correction below overstated its own reach.** Measured against the real build at eleven widths by an adversarial audit, not computed: the four-column grid runs down to 1181px, where a card's content box is 138px — but `mamaya-tech.svg` (3.576:1) needs 172px to stand 48px tall, so `max-width: 100%` clamps it and `object-fit: contain` letterboxes the mark to **38.7px** while the other three, all needing ≤86px, hold 48px. The widest mark becomes the shortest again. The band runs 1181px→~1310px and **contains 1280×800 and 1280×720** (45.7px there) | **Neither corrected. Recorded as a stated residual** (`P-19`) | Nothing caught it and the reasons are structural: the capture matrix is 390/1024/1440, and 1024 and 1180 are two-column while 1440 is wide enough, so the band is never photographed; and `EMP-004`'s assertion measures `.employer-card__logo`, the flex **container**, which is `height: 48px` unconditionally at every width and cannot see the letterboxing of the `<img>` inside it. **The obvious fix is blocked by a real rule**: raising the 4→2 column breakpoint to ~1315px would mean a component using a width the declared breakpoint set does not carry (`S-05`), so it is a `tokens.css` change with its own justification, not a number in a component. Severity is bounded — a 20% height deficit at the very bottom of the band, 5% at 1280px, against the 60% deficit the item actually fixed — which is why this is stated rather than reopened, and the author's call rather than an agent's |
| 2026-09-03 | `EMP-004`'s "common optical baseline" edge case was implemented as a fixed 72×72 **square** slot, following the artboard's existing shape — and a square bounding box does not produce a common baseline. With `object-fit: contain`, each mark scales to its own limiting dimension, so rendered cap heights came out 50 / 40 / 40 / **20** px across the four `viewBox` ratios (1.44, 1.78, 1.80, 3.58:1). Mamaya Tech read as a runt beside Avícola Sofía | Code corrected; the spec's wording already required the baseline and did not need changing | Corrected to a **height-normalized** slot — `height: 48px`, `width: auto`, `max-width: 100%` — so all four marks share a cap height and width falls out, with `max-width: 100%` preventing overflow. **That cap was described here as "protecting the narrowest four-column card at the 1180px breakpoint", and an adversarial audit measured the opposite: at the bottom of the four-column band it is what breaks the shared height.** See the drift row below. **Every `EMP-004` e2e assertion passed against the defective square version**: the logo box *was* larger than the name's font size and nothing overflowed. "These four marks read as comparably weighted" is not a proposition the DOM can answer, which is exactly why the Coverage gaps section declares it rather than pretending to cover it — and why the gap still needs a person to look |
