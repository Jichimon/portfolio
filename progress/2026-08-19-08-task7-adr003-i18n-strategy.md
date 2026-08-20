# 2026-08-19 · Session 08 — TASK 7, decision 3: i18n strategy (ADR-003, draft)

**Task:** TASK 7 — Founding ADRs (decision 3 of 6)
**Status after this session:** ADR-003 `Proposed`, presented at checkpoint, awaiting approval.

## What was done

One `researcher` pass scoped to URL shape, content-collection-to-route wiring, the locale switcher, default-locale, and fallback behavior — built on ADR-001/ADR-002 without reopening either. Wrote `docs/adr/ADR-003-i18n-strategy.md`. Hit and fixed one gate failure: `check-docs` correctly flagged a hypothetical illustrative path (`src/content/case-studies/en/x.md`, an eliminated option, never meant to exist) cited in backticks as if it were a real file reference — reworded to prose, not a fake path, rather than adding an exemption.

## Decisions

- **URL shape: prefix only the non-default locale** (`/case-studies/x` for English, `/es/case-studies/x` for Spanish). Matches the frozen content's own existing (currently non-functional) internal links, which are all written unprefixed.
- **`defaultLocale: en`** — a stated judgment call, not a technical requirement: `CLAUDE.md`'s target audience and the content's existing link shape both point the same direction.
- **Wiring: two `getStaticPaths` route files per collection**, filtered by `lang`, joined on `entry.data.slug` — explicitly **not** Astro's own auto-generated `id`, which the research found does not match ADR-002's join key and would have been a real footgun at implementation time.
- **Two items explicitly left open, not silently assumed:** the in-body link-rewriting mechanism (every internal content link is locale-naive today, and nothing in Astro's i18n feature fixes that automatically) is named as a TASK 8 dependency; whether Astro's built-in `i18n.fallback` fires for collection-driven routes is flagged as evidence-thin and deferred to a TASK 8 spike rather than assumed either way.

## Findings from validating against real state (P-04)

- `check-docs` treats any backtick-quoted, path-shaped string as a citation it must resolve — including one written purely as an illustrative example of a *rejected* option. Real finding about the guard's precision (it has no false negatives here, only a slightly literal true positive), not a defect; fixed by rewording rather than exempting.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["docs/adr/ADR-003-i18n-strategy.md, Proposed"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs", "exit:0, 13 steps green, after one fix"] }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions

- ADR-003 awaiting human approval.

## Next

On approval: update `docs/adr/README.md`, TASK 7's progress line (3/6), then decision 4: hosting and deploy.

## Files changed

`docs/adr/ADR-003-i18n-strategy.md` — new, `Proposed`.
`progress/2026-08-19-08-task7-adr003-i18n-strategy.md` — this file, new.
