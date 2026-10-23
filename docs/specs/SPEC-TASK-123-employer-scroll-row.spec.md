# SPEC-TASK-123: The employer strip becomes a scroll row

```yaml
spec_id: SPEC-TASK-123
title: The employer strip composes at any card count as one horizontal scroll row
status: active
version: 1.0
date: 2026-10-20
approved_version: 1.0
work_item: TASK-123
intent: "Five employer cards wrapped a lone card into a second row under the strip's four-column grid; one scroll mechanism must compose at any count so growth never costs a layout decision."

tdd: not_applicable
tdd_rationale: "Every behavior lands in presentation CSS; nothing touches the mutation-covered core (T-01's presentation exemption). The e2e assertions are still written red-first against the grid layout and watched to fail before the row changes — the discipline without the tier."

reproduces:

governed_by:
  - ADR-008
  - ADR-007
related_docs:
  - docs/design/canvas/src/Components.dc.html

behaviors:
  - id: EMP-010
    given: "the home page with any number of declared employer roles"
    when: "the strip renders at any of the three sanctioned widths"
    then: "the cards lay side by side in one horizontal row the visitor scrolls, the strip contains its own overflow so the page never scrolls horizontally, and the row is scrollable exactly when the rendered cards exceed its width"
    priority: critical
    status: planned
    edge_cases:
      - "390px: one card visible with the next card's edge peeking as the scroll affordance"
      - "1024px and 1440px: fewer cards than roles visible, the remainder in the scroll"
      - "a role count whose cards fit without overflowing: the row must not scroll"
      - "the page must not scroll horizontally at any width regardless of role count"
    tests:
      - "home.smoke.spec.ts::the employer strip is a scroll row that contains its own overflow at <width>px in <lang>"

  - id: EMP-011
    given: "the strip is scrollable"
    when: "the visitor scrolls the row partway by a small amount"
    then: "the row settles card-aligned rather than at an arbitrary offset"
    priority: normal
    status: planned
    edge_cases:
      - "a scroll gesture smaller than one card still settles on the next card boundary"
      - "a scroll gesture past the last card settles with the last card in view, not past it"
    tests:
      - "home.smoke.spec.ts::a partial scroll of the strip settles card-aligned at <width>px in <lang>"

constraints:
  - "Zero JavaScript: the mechanism is overflow, scroll-snap and nothing else; the no-JavaScript contract holds."
  - "A sixth employer changes nothing but the content file; the assertions derive their overflow expectation from the rendered cards, never from a width roster (P-13)."
  - "The card's own design is untouched: logo treatment, caption, period, position-derived border colors."
  - "The scrollbar stays hidden (the site's own rail precedent: scrollbar-width: none), with the peeking card edge as the scroll affordance."
  - "The artboards and the component sheet's reasoning move in the same change; the 'static row' note is amended with its reason, not deleted."

out_of_scope:
  - "Autoscroll, arrows, or any script-driven carousel behaviour — the strip is CSS only."
  - "A page-level indicator of the number of employers (dots, counts): copy never counts a growing thing."
  - "The /experience page's employment entries: only the home strip is a scroll row."
```

## Intent

The employer strip was built as a four-column grid when the record had four employers, and the fifth card — TASK 119 — wrapped alone into a second row. The record will not stop growing: the author's stated plan is that finished freelance engagements land as their own employer entries. A fixed grid re-creates this defect at every new count; the derived-span pattern widens a card instead of showing five equal companies; one horizontal scroll row composes at any count with no layout decision, and it is the shape the author picked. The design record rejected a marquee for this section when the list was four; that reasoning is amended in the component sheet with the date and the cause rather than deleted — five cards with more coming, plus a site precedent (the rail's narrow-state nav) for a quiet horizontal scroll row with its scrollbar hidden.

## Behaviors

### EMP-010 — one scroll row that contains its own overflow · `critical` · `planned`

- **Given** the home page with N declared employer roles, **when** the strip renders at 390/1024/1440, **then** the cards form one horizontal row inside a scrollable strip; the page itself never scrolls horizontally, and the strip is scrollable exactly when the rendered cards' combined width exceeds the strip's width.
- **Edge cases:** the peeking card edge at every width is the affordance; a role count that fits must not scroll; a role count that overflows must.
- **Governed by:** ADR-008 (the row derives from content; the layout is the strip's, the card's design unchanged)
- **Tests:** written red-first against the grid layout.

### EMP-011 — the row settles card-aligned · `normal` · `planned`

- **Given** the strip is scrollable, **when** the visitor scrolls partway by less than a card, **then** the row settles on a card boundary, and a scroll past the end settles with the last card in view.
- **Governed by:** ADR-007 (pure CSS, zero islands)
- **Tests:** a real wheel-gesture scroll, not a programmatic snap read.

## Constraints and invariants

As the frontmatter's `constraints` list.

## Out of scope

As the frontmatter's `out_of_scope` list. What is explicitly left for later: nothing in this item depends on the future content change that adds the finished engagements as employer entries — when it happens, it is a `roles[]` edit and nothing here moves.

## Test plan

| Test (file::name) | Type | Scenario covered | Behavior(s) | Status |
|---|---|---|---|---|
| home.smoke.spec.ts::the employer strip is a scroll row that contains its own overflow at 390/1024/1440px in en/es | e2e | one row, derived scrollability, page containment at every width | EMP-010 | planned |
| home.smoke.spec.ts::a partial scroll of the strip settles card-aligned at 1440px in en/es | e2e | wheel-gesture scroll settles on a card boundary | EMP-011 | planned |
| home.smoke.spec.ts::no employer card overflows its grid cell at 390/1024/1440px in en/es (existing) | e2e | page never scrolls horizontally; names stay at two lines or fewer inside the narrower cards | EMP-010 | green (comment amended: the row now scrolls by design; the page must not) |

**Coverage gaps:** a mid-gesture snap-timing assertion (the settle is asserted after the gesture, not during); scroll behaviour under Firefox/WebKit stays outside the blocking gate per the e2e narrowing (ADR-006, 2026-09-01) and returns with that decision if a cross-engine defect is ever found.

## Traceability

| Behavior | Priority | Status | Test(s) | Test written first? | ADR |
|---|---|---|---|---|---|
| EMP-010 | critical | planned | the scroll-row e2e, both locales × three widths | yes — written and watched red against the grid layout | ADR-008 |
| EMP-011 | normal | planned | the settle e2e, both locales at 1440 | yes — same red run | ADR-007 |

## Drift log

| Date | What diverged | Spec or code corrected | Note |
|---|---|---|---|
| 2026-10-20 | The design checkpoint happened at the session's option table rather than over this file: the author picked the scroll row from three candidates with a growth rationale. Recorded as approved here, and implementation ran orchestrator-direct (nothing delegated), so H-05's gate was not invoked | spec | The TASK-32 precedent, stated rather than glossed; the artifact is what the author reviews now |