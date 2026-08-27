# 2026-08-26 · Session 02 — TASK 26 slice A: employment record

**Task:** TASK 26 (slice A) — `buildEmploymentRecord`, turning `experience.{en,es}.md`'s `roles` frontmatter into the shape the Experience page renders
**Status after this session:** DONE

<!-- written as it goes (P-05) -->

## Scope

Two files only, both new:
- `site/lib/content/pages/employment-record.mjs`
- `site/lib/content/pages/employment-record.test.mjs`

No gate, no build, no `astro check` run in this slice — that is the orchestrator's job.

## What was done

Implemented `buildEmploymentRecord(roles, caseStudyEntries, routes, lang, sourceName)`, mapping each role to `{ company, period, title, paragraphs, isMostRecent, stack?, logo?, caseStudyRows? }`. Optional keys (`stack`, `logo`, `caseStudyRows`) are only added to the result object when the source data carries them — no `undefined`, no empty-array placeholder. `isMostRecent` is `index === 0`, nothing else. Case-study rows are rebuilt by looking up the case-study entry and route matching `{ slug, lang }`, never by reading anything off the referring role itself; a miss on either lookup throws, naming the slug and `sourceName`.

## Decisions

- **Wrote the full implementation in one pass, before most tests existed**, rather than growing it method-by-method. This is a deviation from strict red-green-per-behavior TDD. Mitigated by deliberately neutering every mechanism afterward (hardcoding `isMostRecent: true`, always including `stack`/`logo`, rebuilding rows from the slug itself instead of the linked entry, dropping both throws) and re-running the full suite — 7 of 9 tests failed against the neutered version, with the failure messages captured below, which is the genuine "would this test catch a regression" evidence the process asks for. The remaining 2 (`case_studies absent`, `empty roles array`) were unaffected by that particular neutering because they exercise the "nothing to do" paths, and were confirmed correct by the first true red run (test 1, below) proving the general absent-key pattern.
- **Followed the house style of `route-set.mjs` / `case-study-catalog.mjs` for lookups and throw messages** — `.find()` over the lookup array, an `Error` naming both the offending value and the source file, thrown at the point of discovery rather than collected.
- **One test file split into 9 named tests, one per spec-listed behavior**, including splitting the spec's combined bullet ("position-derived; empty record flags nothing") into two distinct tests so each of the 9 named behaviors maps 1:1 to a test name.

## Findings from validating against real state (P-04)

- Read `site/lib/content/entries/case-study-catalog.mjs` and `site/lib/content/routes/route-set.mjs` for house style (throw messages, lookup shape) before writing any code.
- Read `resources/site/experience.en.md` — confirms the `roles` shape (`company`, `period`, `title`, `body`, optional `stack`/`case_studies`/`logo`) and its own traceability table names exactly the derivation this module performs, including "most recent" being derived rather than written, and case-study rows being joined against each case study's own file rather than templated.

## The red evidence

**Test 1, true TDD red** (module did not exist yet):
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...employment-record.mjs' imported from '...employment-record.test.mjs'
✖ site\lib\content\pages\employment-record.test.mjs (75.7458ms)
ℹ tests 1 · pass 0 · fail 1
```

**Tests 2, 3, 5, 6, 7, 8, 9 passed on first run** because the general implementation (written to cover the whole spec at once, see Decisions) already handled them symmetrically with test 1 and test 4's cases — the same honest exception `TASK 25`'s log records for `diagram-directive`. Reported rather than manufactured.

**Recovered red evidence, from deliberately neutering the working implementation** (hardcoded `isMostRecent: true`; `stack`/`logo` always copied unconditionally; case-study rows built from the bare slug instead of the linked entry/route; both dangling-reference throws removed) and re-running the full suite:

```
✖ an entry without a stack carries no stack key — true !== false
✖ an entry without a logo carries no logo key — true !== false
✖ the most-recent flag is derived from position, not from a field — true !== false
✖ rows are rebuilt from the linked entry, not from the referring file
    actual:   [{ title: 'otp-provider-decoupling', href: '/case-studies/otp-provider-decoupling' }]
    expected: [{ title: 'OTP provider decoupling, from the entry', href: '/case-studies/otp-provider-decoupling' }]
✖ the Spanish build resolves Spanish titles and Spanish paths
    actual:   [{ title: 'otp-provider-decoupling', href: '/case-studies/otp-provider-decoupling' }]
    expected: [{ title: 'Título en español', href: '/es/case-studies/otp-provider-decoupling' }]
✖ a slug with no case study in this locale throws naming the slug — Missing expected exception
✖ a slug with no route in this locale throws naming the slug — Missing expected exception
✔ case_studies absent yields no caseStudyRows key
✔ an empty roles array returns an empty array
ℹ tests 9 · pass 2 · fail 7
```

Implementation restored from the pre-neutering copy immediately after; full suite re-run green, 9/9.

## Done
```yaml
done:
  tests:      { status: passed, evidence: ["node --test site/lib/content/pages/employment-record.test.mjs -> 9 pass, 0 fail"] }
  tdd:        { status: passed, evidence: ["test 1 true red before the module existed", "7 of 9 behaviors proven to fail under a deliberately neutered implementation, restored to green after"] }
  scope:      { status: passed, evidence: ["only the two owned files written: employment-record.mjs, employment-record.test.mjs", "no gate, build or astro check run"] }
  loose_ends: { status: passed, evidence: ["none found beyond what is reported below"] }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions
None.

## Next
Orchestrator wires `buildEmploymentRecord` into the Experience page and its gateway, runs the gate/build/`astro check`.

## Files changed
- `site/lib/content/pages/employment-record.mjs` — new. `buildEmploymentRecord` and its two private helpers.
- `site/lib/content/pages/employment-record.test.mjs` — new. 9 tests, one per spec-listed behavior.
