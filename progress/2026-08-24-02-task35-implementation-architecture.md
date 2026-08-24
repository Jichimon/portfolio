# 2026-08-24 · Session 02 — Implementation architecture: ADR-008 and the `S-*` rule surface

**Task:** TASK 35 — Implementation architecture: `ADR-008` and the `S-*` rule surface
**Status after this session:** DONE — `ADR-008` **approved by the author on 2026-08-24** at the checkpoint, and flipped to `Accepted` with its index row (`P-02`).

## What was done

`ADR-008` written with six sub-decisions: where the tree lives, how content reaches a component, reading a content directory outside the project root, where visible strings come from, CSS naming plus the file cap, and the Astro major. `.claude/rules/50-implementation.md` carries seven `S-*` rules, path-scoped to `site/**` so it costs nothing until someone works there. `check-site` is built, wired as the gate's fifteenth step, and proven in red against a real violating tree as well as in unit fixtures.

## Decisions

- **`site/lib/` framework-free, `site/src/` Astro-only.** The alternative the author asked for literally — everything under one `src/` — would have amended `30-testing.md` and `ADR-006` on day one and pulled the content core into Vite's graph, where `node:test` alone can no longer run it. The author chose this option after the collision was put in front of them.
- **`glob()` with `base`, not a hand-written loader.** An earlier draft of the plan called the hand-written loader "probably better architecture". **That was wrong and the ADR says so.** The layering the constraint asks for is satisfied by a core that operates on already-loaded entries — it is indifferent to how they arrived. A hand-written loader adds a surface needing a mock to test, loses Astro's markdown pipeline (including the `:::diagram` transform `ADR-002` depends on), loses dev watching and the digest cache, and moves nothing. It stays recorded as the contingency, with its cost measured, so nothing gets improvised under pressure.
- **Structure is not copy.** Nav labels go to `resources/`; which items exist, their order, their target and their `soon` flag stay in a data module. The line is drawn by what the thing *is*. The register's criterion 4 table was reconciled to say so, since it previously sent all nav items to a data module.
- **Each of `check-site`'s three properties owns its own territory.** A core file importing `astro:content` breaks two rules at once; reporting it twice teaches people to skim guard output. The core's rule is the stricter and more specific, so it wins.
- **`ADR-008` was indexed while still `Proposed`** — the first ADR in this repository to appear in the index before acceptance. An unindexed ADR is invisible, and the index is the mandatory entry point.

## Findings from validating against real state (P-04)

- **The chrome copy does not exist anywhere in `resources/`.** Checked, not assumed: content frontmatter carries the five universal keys and prose, and no file holds a nav label, a table-of-contents heading, a switcher label or the 404's lines. This is the finding that produced `TASK 36`, and it means the layout-shell item cannot ship until the author writes a file only they can write (`H-02`).
- **Astro's own i18n recipe uses a hardcoded dictionary module**, which the author's first constraint forbids. The precedent that makes the constraint reasonable rather than eccentric is also Astro's: Starlight sources interface strings from a content collection, one file per locale. Both facts are in the ADR, because the recipe is what someone finds first.
- **`base` pointing outside the project root has no vendor sentence behind it.** The Content Loader Reference defines `base` and says nothing about leaving the project. Mechanism and community use exist; documentation does not. It is the only load-bearing assumption in the backlog with nothing under it, which is why the skeleton item spikes it rather than the content-layer item discovering it.
- **A surviving mutant found a real hole.** Neutering the bare-import branch of `importsFrom` left all nineteen tests green: `import 'astro:content';` as a side effect would have walked straight past `S-02`. Two tests added, mutant killed. That is `T-03` doing exactly what it exists for — the hole was invisible to review and visible to a mutant.
- **The context budget survives the sixth rules file untouched** — 274 → 275 always-loaded lines, because `50-implementation.md`'s 49 lines are path-scoped and do not count. The one added line is the registry row in `00-hard-rules.md`.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["docs/adr/ADR-008-site-implementation-architecture.md — 6 sub-decisions, rejected options and costs recorded, evidence quality declared where thin", "docs/adr/README.md — level-1 row added while still Proposed, so the ADR was findable before acceptance rather than after; flipped to Current on approval the same day", ".claude/rules/00-hard-rules.md — S-* surface registered, 'five files' corrected to six"] }
  tests:      { status: passed, evidence: ["scripts/guards/lib/site-structure.test.mjs — 21 tests, written red before the module existed", "full guard suite green after the addition"] }
  mutation:   { status: passed, evidence: ["12 hand-applied mutants over scripts/guards/lib/site-structure.mjs, 12 killed after a fix", "1 SURVIVED on first run — the bare side-effect import — reported as a finding, covered by two new tests, then killed (T-03)"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs — 14 PASS, 1 declared SKIP (site structure, site/ does not exist yet), GATE PASSED", "check-rules-registry PASS across 6 files", "check-context-budget 275/320"] }
  security:   { status: passed, evidence: ["check-site adds a check and relaxes none", "red path proven against a real tree: 7-file directory, a page importing astro:content, and a core file importing Astro — 3 findings, exit 1; tree removed and the step returned to SKIP"] }
  content:    { status: not_applicable, reason: "nothing in resources/** touched (H-02). The interface strings this ADR requires are TASK 36, which the author writes" }
  ci:         { status: not_applicable, reason: "no remote exists, so no CI run can be read (T-10). The workflow runs the gate unfiltered and needed no change" }
  scope:      { status: passed, evidence: ["ADR written, approved at the checkpoint, flipped to Accepted with its index row", "rules registered, guard built and wired", "no git write (H-01)"] }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions

**Closed — the author approved on 2026-08-24, without amendment.** The three points below were the ones put in front of them, each recorded because each cost something.

**The checkpoint, as it was presented.** The file itself was handed over, not a summary of it (`P-02`), with three points flagged for the author's judgment:

1. **Sub-decision 1** puts the core at `site/lib/`, not inside `src/`. That is not literally what was asked for, and the reason is that `node:test` cannot run anything inside Vite's graph.
2. **Sub-decision 5's file cap has no external sourcing.** It is recorded as the author's convention, with the failure mode it invites written into the rule.
3. **Sub-decision 4 puts the project off Astro's documented i18n path** in exchange for the first constraint.

## Next

The skeleton item's spec, which cites `ADR-008` in `governed_by` and could not have been written against a proposal. Its first behaviour to prove is the loader spike — the one assumption in the backlog with no vendor sentence under it.

## Files changed

`docs/adr/ADR-008-site-implementation-architecture.md` — new. `Proposed` at the checkpoint, `Accepted` on approval.
`docs/adr/README.md` — level-1 row (`Proposed` → `Current`), and the intro note about indexing a proposal.
`.claude/rules/50-implementation.md` — new, 7 rules, path-scoped.
`.claude/rules/00-hard-rules.md` — the `S-*` surface registered; "five files" corrected to six.
`scripts/guards/lib/site-structure.mjs` — new, three property checks.
`scripts/guards/lib/site-structure.test.mjs` — new, 21 tests.
`scripts/guards/gate/check-site.mjs` — new, thin CLI.
`scripts/guards/guards.config.json` — the `site` section: cap, gateway, core, exclusions, each with its reason.
`scripts/gate.mjs` — fifteenth step, skipped with a named reason until `site/` exists.
`TASKS.md` — TASK 35 and TASK 36 opened; sequence table re-cut to seventeen items; criterion 4's nav row split into structure and copy.
