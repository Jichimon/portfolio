# SPEC-TASK-124: The carousel's position indicator, and smaller cards

```yaml
spec_id: SPEC-TASK-124
title: The employer scroll row shows where the visitor stands, on smaller cards
status: active
version: 1.0
date: 2026-10-20
approved_version: 1.0
work_item: TASK-124
intent: "The scroll row scrolled but nothing said so: an indicator must show the position within the strip, and the cards can shrink now that the grid arithmetic no longer fixes their size."

tdd: not_applicable
tdd_rationale: "Presentation CSS plus markup; nothing touches the mutation-covered core (T-01's presentation exemption). The indicator's e2e assertions are written red-first against the shipped strip that has no track, and watched to fail."

reproduces:

governed_by:
  - ADR-008
  - ADR-007
related_docs:
  - docs/specs/SPEC-TASK-123-employer-scroll-row.spec.md

behaviors:
  - id: EMP-012
    given: "the employer strip is scrollable"
    when: "the page renders in an engine that supports CSS scroll-driven animations"
    then: "a thin progress track renders under the row and its fill advances from empty as the visitor scrolls, reaching full at the strip's end"
    priority: critical
    status: planned
    edge_cases:
      - "at rest the fill is empty and the track is visible — the track is the affordance, the fill the position"
      - "an engine without scroll-driven animations shows no track at all, never an empty promise; the native scroll keeps working"
      - "the track and the fill take their colours from the theme tokens, so both themes read"
    tests:
      - "home.smoke.spec.ts::the strip carries a progress indicator that follows the scroll at 1440px in <lang>"

  - id: EMP-013
    given: "the cards take the smaller 220px basis"
    when: "the strip renders at any sanctioned width"
    then: "four full cards show beside the peek at wide widths, and every EMP-010 and EMP-011 assertion still holds with its expectations derived from the rendered geometry"
    priority: normal
    status: planned
    edge_cases:
      - "at the wide widths the scroll range fits inside one card stride, so a partial gesture settles at the clamped end rather than at a snap point — the settle assertion accepts either, both derived"
    tests:
      - "home.smoke.spec.ts::a partial scroll of the strip settles card-aligned in <lang> (widened)"

constraints:
  - "Zero JavaScript: the indicator is CSS scroll-driven animation; site/src/behaviour/ stays at its file cap."
  - "The card's own design is untouched — only its basis changes."
  - "Every width and position the tests read is derived from the rendered geometry (P-13)."

out_of_scope:
  - "Dots, arrows, or any script-driven carousel chrome."
  - "A track shown when the strip does not scroll — a future employer count that fits at some width shows no track there; detecting that per layout is CSS-unreachable today and is declared, not engineered."
```

## Intent

The author reviewed the shipped scroll row in his browser and named two things: nothing indicates the strip scrolls, or where the visitor stands in it, and the cards can be smaller now that no four-column grid fixes their width. One designed pair answers both: a 2px progress track under the row, its fill advancing with the scroll through CSS scroll-driven animations — zero JavaScript, matching the site's no-JS posture — and the card basis down to 220px, where a fourth card shows beside the peek at wide widths. The track is the affordance ("there is a journey here"), the fill is the position ("you are this far along it"), and the peeking card remains the invitation.

## Behaviors

### EMP-012 — the position indicator · `critical` · `planned`

- **Given** the strip scrolls, **when** the page renders in a supporting engine, **then** the track renders under the row and its fill advances from empty to full across the scroll range.
- **Edge cases:** unsupported engines show nothing rather than an inert track (`@supports`-guarded); the fill reads in both themes through the tokens.
- **Governed by:** ADR-007 (pure CSS, zero islands)
- **Tests:** written red-first — the shipped strip has no track, so the assertion fails before the markup exists.

### EMP-013 — the smaller basis · `normal` · `planned`

- **Given** the cards take the 220px basis, **when** the strip renders, **then** the derived assertions of EMP-010/011 still hold, with the settle assertion widened to accept a snap-aligned settle or the clamped end — at wide widths the smaller basis puts the whole scroll range inside one card stride.
- **Tests:** the widened settle assertion passes at both the old and the new basis; the change is a generalization, recorded in the drift log, not a weakening.

## Test plan

| Test (file::name) | Type | Scenario covered | Behavior(s) | Status |
|---|---|---|---|---|
| home.smoke.spec.ts::the strip carries a progress indicator that follows the scroll at 1440px in en/es | e2e | the track renders; the fill is empty at rest and advances after a stride scroll | EMP-012 | planned |
| home.smoke.spec.ts::a partial scroll of the strip settles card-aligned in en/es (widened) | e2e | the settle lands snap-aligned or at the clamped end | EMP-013 | planned |

**Coverage gaps:** the indicator's cross-engine presence (the gate runs Chromium, which supports scroll-driven animations; other engines' omission is the `@supports` path and is not assertable from this suite — ADR-006's declared narrowing).

## Traceability

| Behavior | Priority | Status | Test(s) | Test written first? | ADR |
|---|---|---|---|---|---|
| EMP-012 | critical | planned | the indicator e2e, both locales | yes — watched failing against the trackless strip | ADR-007 |
| EMP-013 | normal | planned | the widened settle e2e | no — a tolerance generalization over an already-green test, recorded as such | ADR-008 |

## Drift log

| Date | What diverged | Spec or code corrected | Note |
|---|---|---|---|
| 2026-10-20 | The direction came from the author's browser review rather than over this file; the form (CSS scroll-driven track vs dots vs arrows) is the session's, chosen for the site's no-JS posture | spec | Orchestrator-direct per the TASK-32 precedent; nothing delegated, so H-05's gate was not invoked |
| 2026-10-20 | EMP-011's assertion widened to accept the clamped end | code | At the 220px basis the wide-width range fits inside one stride, so the settle lands at the end — the generalization is derived either way and passes at the old basis too |