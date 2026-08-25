# 2026-08-24 · Session 09 — the globs cover the core, and the component tier exists

**Task:** TASK 42 — the test and mutation globs cover one subfolder, not the core · TASK 44 — component test tier (opened this session)
**Status after this session:** both DONE, pending the shared verification pass that closes the layout-shell item

Both ran ahead of the layout-shell item and neither was delegated: they carry no spec, and a brief would have cost more context than the work. The author set the shape of this session explicitly — do these two, then the shell, and **verify all three once at the end**, because Stryker is the expensive operation in this repository and measuring three intermediate denominators prices nothing anybody will use.

## What was done

`TASK 42` widened four globs from `site/lib/content/**` to `site/lib/**` — the unit-runner and sub-gate rows in the testing rules, the gate step's command, and Stryker's `mutate` and `tap.testFiles`. The gate step is renamed `site core tests` and its precondition now guards `site/lib`.

`TASK 44` installed the component tier the testing ADR decided on 2026-08-23 and nobody had built: Vitest 4.1.11, jsdom 29.1.1, `@testing-library/preact` 3.2.4, a `site/vitest.config.ts` built on `getViteConfig()`, and an eighteenth gate step. Both its red and its green paths are proven.

## Decisions

- **The two runners are separated by SUFFIX, not by directory or extension.** `.component.test.ts` belongs to Vitest, `.test.mjs` to `node:test`. The testing rules already required an explicit, disjoint scope for both — the two default globs overlap and neither project's documentation mentions the other — but *how* to separate them was never fixed. A directory split would have meant a module's location, not its nature, decided its runner; the extension alone cannot separate them, because Vitest's default matches `.test.` in any of four extensions.
- **`passWithNoTests` is off, and the empty case is handled in the gate step instead.** With it on, renaming the suffix would make every test in the tier vanish and the suite stay green forever — the failure would be invisible and permanent. With it off, an empty run fails loudly, and the one legitimately-empty case (today, before the shell's behaviour modules land) is a gate step that skips itself with a written reason. A named skip is visible; a silent pass is not. This is the same reasoning `P-03` applies to a done-block dimension, moved onto a test runner.
- **A gate step may declare its own `cwd`.** Almost none do — the gate reads the repository from the root — but a package-scoped runner has to start inside its package to resolve its own config, and passing that as a flag would be a second way to say the same thing. The root stays the default, so no existing step is affected.
- **The threshold is deliberately NOT re-measured here.** A wider `mutate` glob is a new denominator, so `break: 74` is stale from the moment these globs changed. The shell lands two more mutated guard functions in the same stretch of work, so the number is re-measured once, against the run that follows all of it. Recorded rather than left implicit, because a stale threshold nobody flagged is indistinguishable from one nobody noticed.

## Findings from validating against real state (P-04)

**The old glob exited 0 with a failing test sitting in the tree.** This is the red path for `TASK 42`, and it is a sharper result than the item predicted. A deliberately failing test was planted in a sibling directory under the core; `node --test "site/lib/content/**/*.test.mjs"` **passed** — not skipped, not warned, *passed* — while the widened glob exited 1 and printed the failure. The defect was never hypothetical; it was one directory away and would have been invisible on arrival.

**`npm run check` was broken, and exited 0 while saying so.** The skeleton item installed `typescript@^7.0.2` alongside `@astrojs/check@0.9.10`, whose peer range is `^5 || ^6`. TypeScript 7's native compiler does not expose the programmatic API `astro check` relies on, so the command printed a fatal diagnostic — *"does not expose the programmatic API"* — and **returned exit code 0**. Nothing had noticed, because the command is not wired into the gate. Fixed by pinning TypeScript to `^6.0.3`, which is what Astro's own error message instructs; `astro check` now reports 13 files, 0 errors, 0 warnings. The latest `@astrojs/check` is `0.9.10`, so upgrading was not an option — the downgrade is the supported path, not a workaround. **The exit-0-on-failure half is a second live specimen of the open gate-step-honesty item and is noted there.** The peer conflict was pre-existing and latent: it surfaced only because installing anything new forces npm to re-resolve the tree.

**The confidentiality guard now fails on a third-party package name in the generated lockfile.** Installing jsdom pulled in a transitive dependency whose npm package name **contains a banned term as a substring**. The term is short, the match is real, and the containing text is a public package name from the public registry. `check-terms` matches case-insensitively with **no word boundary**, so a short term collides with unrelated text forever and will do so again on the next install. This is the same family as the item that fixed integrity-hash false positives on 2026-08-24 — that fix was scoped to opaque *fields* and explicitly kept package names and resolved URLs scanned, which was the right call then and is what this walks into now. **Not fixed here, deliberately:** changing the matching semantics of the confidentiality guard is not a decision to take mid-item, and word-boundary matching trades this false positive for a class of false *negatives* — a term embedded in a compound identifier would stop matching. Opened as its own item for the author.

**The site-structure guard caught the author of this session.** The first `vitest.config.ts` cited two ADRs and a rule id in its comments, which `S-08` forbids: the citation runs the other way, from a living document to the code. Three findings, rewritten, then PASS. Worth recording because it is the rule working on the person who had most recently read it.

## Done

```yaml
done:
  tdd: { status: passed, evidence: ["TASK 42 red path: a failing test planted in a sibling directory under the core left the OLD glob exiting 0 and the widened one exiting 1", "TASK 44 red path: a failing DOM assertion under the new suffix exits 1; the same test flipped green exits 0"] }
  gate: { status: blocked, reason: "deferred by the author's instruction to one shared verification pass after the layout-shell item — Stryker is the expensive operation and three intermediate denominators price nothing. check-docs and check-site were run pointwise and PASS; check-terms FAILS on the lockfile finding above, which is tracked" }
  living_docs: { status: passed, evidence: ["ADR-006 amended (the surface was named as one directory) and its first review trigger closed in the negative", "docs/adr/README.md: level-1 row updated, level-2 row added", ".claude/rules/30-testing.md: three glob citations and the surface block reconciled, and the open Vite question closed against code that now exists", "check-docs PASS — 54 living documents, 192 path references resolved"] }
  loose_ends: { status: passed, evidence: ["the lockfile substring finding and the exit-0 finding are tracked items, not prose"] }
  mutation: { status: blocked, reason: "same shared pass — the widened mutate glob is a new denominator and the shell adds two more mutated functions; measuring now would price a number nobody uses" }
  confidentiality: { status: blocked, reason: "check-terms FAILS on a transitive dependency's package name in site/package-lock.json. No authored content is involved and nothing was published; the decision on matching semantics is the author's and is tracked" }
  iterations: { status: passed, evidence: ["4"] }
```

**The 4, decomposed, because a bare number invites the wrong conclusion.** `TASK 42` took **1** — the glob edits and the red proof landed in one pass with no rework. `TASK 44` took **3**, and all three were the repository or the toolchain refusing something rather than a defect in the work: the install failed on a **pre-existing** peer conflict that had to be diagnosed and fixed first; the first config carried `passWithNoTests: true`, reconsidered and removed once the silent-green failure mode was traced; and the first `vitest.config.ts` was rejected by the site-structure guard for citing rule ids in comments. **Zero of the four were the author asking for a change** — the author's one correction, that verification collapse into a single shared pass, arrived at the plan stage, before any of this was written, which is the cheapest place a correction can land and is not an implement-verify cycle.

## Open questions

- **The confidentiality guard's matching semantics.** A short banned term substring-matches third-party package names in the generated lockfile, and will again on every install. Four candidate answers, none free: word-boundary matching (trades this false positive for possible false negatives in compound identifiers); treating lockfile package-name and URL fields as opaque (reverses a decision taken deliberately on 2026-08-24); excluding generated lockfiles wholesale (weakest, and the file is committed); or leaving it and accepting a permanently red step (worst — a gate step nobody can make green is a gate step people learn to ignore). **This is the author's call**, both because it touches confidentiality and because the trade is a judgment about which error direction costs more.

## Next

The layout-shell item's spec, then its checkpoint. The two prerequisites this session existed to clear are cleared: the core's sibling directories are now inside both gates, and the tier that will run the shell's two DOM-requiring modules exists and has been proven in both directions.

## Files changed

`stryker.config.mjs` — both globs widened to the core, with the narrowing's origin recorded rather than deleted.
`scripts/gate.mjs` — step renamed and widened; the component step added; a step may now declare its own `cwd`.
`.claude/rules/30-testing.md` — three glob citations, the surface block, and the open Vite question.
`docs/adr/ADR-006-testing-toolchain.md` — an amendment, and the carried-forward caveat corrected.
`docs/adr/README.md` — one level-1 row updated, one level-2 row added.
`site/vitest.config.ts` — new. The component tier's whole configuration.
`site/package.json` · `site/package-lock.json` — the tier installed; TypeScript pinned to the version `astro check` can actually use.
