# 2026-08-26 · Session 02 — TASK 26 slice E: experience components

**Task:** TASK 26 — Employment record components (slice E of a multi-slice delegation)
**Status after this session:** IN PROGRESS

## What was done

Built `EmploymentRecord.astro` and `EmploymentEntry.astro` under
`site/src/components/experience/`. Both are pure render components: no path
computed, no lookup performed, nothing imported from `site/lib/**`. Absent
optional keys (`stack`, `logo`, `caseStudyRows`) are detected with
`Object.hasOwn` against `Astro.props`, never by truthiness, so an empty
string or empty array cannot be mistaken for absence.

## Decisions

- **`EmploymentEntry` takes a flat prop list (`company`, `period`, ... plus
  `mostRecentLabel`), not a nested `entry` object.** This lets the caller
  (`EmploymentRecord`) spread `{...entry}` directly, and — critically — a
  key the content genuinely omits (per the gateway's own
  `buildEmploymentRecordEntry`, which only assigns `stack`/`logo`/
  `caseStudyRows` when `!== undefined`) stays omitted through the spread,
  so `Object.hasOwn` in the child sees the same absence the content declared.

- **Read `site/src/gateway/content-queries.ts` and
  `site/lib/content/pages/employment-record.mjs` before finalizing the
  props**, even though the brief said the props were already built. Both
  files exist and already define `EmploymentEntryContent` and
  `ExperienceStrings` with the exact shape the brief describes, and
  `site/src/pages/experience.astro` already calls `<EmploymentRecord
  entries={entries} lang={lang} labels={ui.data.experience}
  fullHistoryHref={fullHistoryLink.url} />` — confirming the prop names,
  including that `labels` is the *whole* `experience` UI-strings object
  (label, most_recent, cv_note, full_history, next_up), not a trimmed
  three-key object. My `Props.labels` type only names the three keys this
  component reads; the extra keys pass through structurally without a TS
  error since the value is never assigned from an object literal.

- **`lang` is accepted into `EmploymentRecord`'s `Props` and never
  referenced.** Every locale-sensitive value (case-study titles/hrefs,
  `fullHistoryHref`) is already resolved before it reaches this component,
  so there is nothing left in the render path that needs to branch on
  language. Kept in the interface because the brief specifies it and the
  real caller (`experience.astro`) passes it.

- **Added a literal `.employment-record__rule` element** (an empty,
  `aria-hidden` div) for the record's opening line, rather than putting
  `border-top` on the `.employment-record` container itself. The brief's
  own constraints section cites `.employment-record__rule` as a class name
  alongside `.employment-entry` and `.employment-entry__company` — both of
  which are exact classes this work produces — so it reads as a specific
  naming instruction rather than a generic BEM illustration. A bare
  container carrying both block-level layout (margin, max-width) and a
  visible rule felt like it was doing two jobs under one name; splitting
  them out gives the rule its own element and its own class.

- **Did not use the `.who`/`.what`/`.now` mockup shorthand.** Renamed to
  `.employment-entry__meta` (left column: logo, company, period, badge)
  and `.employment-entry__detail` (right column: title, paragraphs,
  case-study rows, stack line) — names describing what each group *is*,
  not where it sits, per S-04.

- **Kept the `--type-mono` deviation explicit in a comment**, mirroring the
  precedent in `StackStrip.astro`: the meta column is 13px against the
  token's 12.5px, so the family is named and the literal size stated
  rather than silently overriding two thirds of a shorthand token.

## Findings from validating against real state (P-04)

- The page modules (`site/src/pages/experience.astro`,
  `site/src/pages/es/experience.astro`), the gateway function
  `getExperienceRecord`, and the lib module `employment-record.mjs` already
  exist and are already wired to call `EmploymentRecord` with exactly the
  props this brief describes — none of that was invented for this session,
  it was read and matched against. This confirmed the prop shape rather
  than requiring me to guess it, and confirmed `lang` really is passed by
  the real caller (so it is a real prop to accept, just not one this
  component's render path needs).

- The `caseStudyRows` and `stack` fields are only ever set on the built
  entry object when the source value is `!== undefined` (see
  `employment-record.mjs` lines 18-30), which means the "absent key"
  contract is actually upheld upstream today, not just specified. Nothing
  in the current content declares a `logo`, matching the brief's note that
  this branch is unexercised.

## Done

```yaml
done:
  scope: { status: passed, evidence: ["site/src/components/experience/EmploymentRecord.astro", "site/src/components/experience/EmploymentEntry.astro"] }
  tests: { status: not_applicable, reason: "TDD required surface per T-01/T-08 is site/lib and behaviour modules; .astro components render via build/e2e per 30-testing.md, which the orchestrator owns" }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions

- None. The one ambiguity (whether `.employment-record__rule` names a real
  element or is illustrative) was resolved by building the literal element,
  reasoned above — worth the orchestrator double-checking against the
  actual artboard intent if there's a stronger source than the extract.

## Next

Orchestrator verification: astro check / build / gate, per the brief's
explicit instruction that this session does not run them.

## Files changed

- `site/src/components/experience/EmploymentRecord.astro` — new
- `site/src/components/experience/EmploymentEntry.astro` — new
</content>
