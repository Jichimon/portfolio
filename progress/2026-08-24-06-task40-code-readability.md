# TASK 40 — Code readability: names and comments

**Date:** 2026-08-24
**Type:** `research`
**Ran:** seventh in the site sequence, before the first real source file

## Why this ran before the content layer

The author set three constraints on how site code reads, and asked — as with the five that produced `ADR-008` — that they become precedent rather than an instruction repeated per item. A constraint that lives only in a conversation is one no delegated agent ever hears: a brief carries the task and never the rules (`P-08`).

Placed ahead of the content layer for the same reason the fidelity harness was placed ahead of the pages. Landing it afterwards means the first three implementation items write in the old style and then get retrofitted, which is the more expensive order and the one that quietly never happens.

## The three, in the author's terms

1. Comments short and concise, used only where something needs explaining — *"mejor es que el código hable por sí mismo"*.
2. No comment relates to any document outside `site/`. Code may be referenced **from** project documents, and those references are kept current.
3. Names verbose and fully understandable — what each variable, class, function and file is for, and what state it holds.

## What was built

- `docs/adr/ADR-008-site-implementation-architecture.md` § Sub-decision 7, three options weighed, decision recorded with its cost in both directions (`C-11`).
- `.claude/rules/50-implementation.md` — `S-08` (rung 2), `S-09` (rung 4), `S-10` (rung 4). Path-scoped to `site/**`, so the always-loaded budget is untouched.
- `scripts/guards/lib/site-structure.mjs` — `commentsByLine` (quote-aware, per-line) and `checkCommentsCarryNoExternalReference`, wired into `checkSite`.
- `scripts/guards/gate/check-site.mjs` — derives the reference set from the repository's own top-level entries.
- `scripts/guards/guards.config.json` — `site.commentRecordIdPattern`, a pattern rather than a list of ids.

## TDD

Required (`T-01`: guard surface). **13 tests written red before the function existed** — measured at 38 tests / 25 pass / 13 fail — then green at 38/38. Full guard suite 453/453.

**Proven in red at the CLI, not only in unit tests** (`P-14`). A planted `<!-- tracked in TASKS.md, see progress/ for the log -->` in `site/src/pages/index.astro` made `check-site` exit 1 naming the file and line; the restore was verified byte-identical against git.

## What the guard found on its first real run

`site/astro.config.mjs` line 4, the only source file the site had:

```
// Static output, no adapter (ADR-001, ADR-004). Preact is registered with compat
// enabled because the next slice (SKEL-004) needs it present.
```

Three references in two lines. Rewritten to one line naming the single thing the code cannot say — what `compat` does. A rule that finds something the day it lands is a rule with an origin rather than an aspiration.

## Two incidents this session ran into

**`G-13` fired against the session that wrote it.** A bad backslash escape left `guards.config.json` as invalid JSON. The `PreToolUse` hook could not parse its own config and denied **every** tool call — Bash, Edit, Write and Read alike — until the author replaced one line by hand.

That is `INC-12` inverted, and it is the exact cost `G-13`'s row already declared in writing: *loud, correct and recoverable, against a failure that was silent and total.* `INC-12` was the same file torn and the hook exiting 1, which the runtime treats as non-blocking, so every rung-1 boundary stood open for the duration of a read. Today the same tear closed everything instead. **No new incident id was minted:** `G-13` describes this exactly, the rule behaved as specified, and adding an incident would oblige an eval case (`check-evals`) for a defect that is already covered.

**`check-docs` rejected the ADR that leans on it.** Sub-decision 7's argument is that references belong in documents because `check-docs` keeps them alive. Its first draft cited a module path under the content core that does not exist yet, and the guard rejected the document. Recorded in the ADR rather than quietly fixed.

## Reconciled while here (`P-07`)

`TASK 15` amended `ADR-008` inline on 2026-08-24 — the root-is-not-dependency-free narrowing — and never added the level-2 row or flipped the level-1 status to `Current-with-amendments`. That is `P-07`'s characteristic failure, doing the obvious half, found by the next session rather than by the one that caused it. Both are now in `docs/adr/README.md`, and the missing row says so.

Also added: `site/playwright.config.ts` to `docs.ignore` with its reason — the documented forward-looking-deliverable class, self-clearing the day `TASK 41` creates it.

## Also opened

`TASK 41` — Playwright smoke tier, split from `TASK 27` with the author. `TASK 27` bundled verifying that the site works with building a three-way diffing framework; only the first belongs beside the pages. `TASK 27` keeps its id and moves behind the milestone.

## done

```yaml
done:
  tdd:        { status: passed, evidence: ["13 tests written red before checkCommentsCarryNoExternalReference existed - measured 38 tests / 25 pass / 13 fail, then 38/38 green", "the red was watched and reported, not inferred: the first run failed at module load because the export did not exist"] }
  tests:      { status: passed, evidence: ["node --test scripts/guards/**/*.test.mjs - 465 pass, 0 fail, up from 440", "site-structure.test.mjs 50/50, up from 25"] }
  red_path:   { status: passed, evidence: ["CLI red path against the REAL tree, not only fixtures: planted <!-- tracked in TASKS.md, see progress/ --> in site/src/pages/index.astro, check-site exited 1 naming site/src/pages/index.astro:9 and the reference it matched", "restore verified byte-identical against git show HEAD", "the guard also found a pre-existing violation on its first run: site/astro.config.mjs:4 carried ADR-001, ADR-004 and SKEL-004 in two comment lines"] }
  mutation:   { status: passed, evidence: ["global 74.95 over scripts/guards/lib/**, break 74 - UP from 74.41 at the previous item's close, so the new module raised the floor's headroom rather than eating it", "site-structure.mjs measured alone: 67.05 when the scanner first landed, 86.97 after the survivors were killed - better than all three rung-1 modules (54/66/69)", "the first full gate run FAILED at 73.56, below the floor. Killed by tests, never by lowering break (ADR-006): nine boundary tests plus three that pin the false-positive direction, since a guard that fires on quoted text is one people route around"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs - 16 of 16 steps PASS at close, the first fully green gate this repository has had", "evidence trace moved from FAIL to PASS when the author deleted the one stale trace directory, so no gate: partial was needed", "two intermediate runs failed and were fixed rather than waived: 13 PASS on this log's own malformed done block, then 15 PASS on a sub-floor mutation score"] }
  security:   { status: passed, evidence: ["resources/** untouched (H-02)", "evidence/** untouched (H-03) - the one stale trace directory was deleted by the author, not by an agent", "no git write (H-01); git used for reads only, to verify the red-path restore", "G-13 denied every tool call for part of this session and the config was restored by the author by hand"] }
  docs:       { status: passed, evidence: ["ADR-008 gained sub-decision 7 with three options weighed and its cost stated in both directions (C-11)", "50-implementation.md carries S-08, S-09, S-10 - check-rules-registry PASS, 6 files consistent", "docs/adr/README.md reconciled: TASK 15's inline amendment gained the level-2 row it never had and ADR-008 moved to Current-with-amendments (P-07)", "check-docs PASS - 53 documents, 188 references resolved, 6 reasoned exemptions"] }
  content:    { status: not_applicable, reason: "no publishable content touched; resources/ is read-only input and stayed untouched (H-02)" }
  locale_parity: { status: not_applicable, reason: "no locale-bearing file touched - this item edits rules, an ADR and a guard" }
  ci:         { status: not_applicable, reason: "no remote exists, so no CI run can be read (T-10). TASK 30 owns it" }
  loose_ends: { status: passed, evidence: ["TASK 41 opened, split from TASK 27 with the author, and TASK 27 moved behind the milestone with its id unchanged (G-10)", "site/playwright.config.ts added to docs.ignore with its reason, the documented forward-looking-deliverable class, self-clearing when TASK 41 creates it", "no new incident id minted for the G-13 lockout: the rule already describes it and an incident would oblige an eval case for a covered defect"] }
  scope:      { status: passed, evidence: ["one deliverable: the three constraints are loaded rules with an origin and an honest rung", "the two judgment halves were NOT mechanized, and 50-implementation.md records that nobody owns mechanizing them and why (G-11)", "scripts/ was not touched - the harness keeps its opposite convention"] }
  iterations: { status: passed, evidence: ["2"] }
```

**On `iterations`.** One implement→verify cycle to red-then-green the guard, and a second forced by the `G-13` lockout, which needed the author to restore the config before the work could continue. The lockout is counted because it was a human-visible cycle, not because the code was wrong.
