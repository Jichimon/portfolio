# 2026-08-27 · Session 09 — TASK 47: `site/` is at the file cap

**Task:** TASK 47 — `site/` is at the file cap, and the next config file forces a split
**Status after this session:** DONE

## What was done

`S-03` gains a second calibration. Ordinary directories keep **6**; a **package root** — derived from disk as a directory holding `package.json` — gets **10**. Both numbers live in `guards.config.json` with their reasons. Written test-first, proven in red against the real tree as well as in the unit battery. Two loose ends found while validating were closed in the same change.

## Decisions

- **The scope was the defect, not the number.** `S-03` is a convention about how somebody organises code, and the remedy it asks for is a split by context. **A package root is not a directory anyone organises** — its members are there because a tool requires them to be, so they share an external requirement rather than a context and the remedy is unavailable to them. That is why this is not a raised cap wearing a disguise, and the rule row, the ADR amendment and the config rationale all say it in those terms.
- **Checked against each tool rather than assumed** (`P-04`, `S-07`): npm fixes `package.json` and `package-lock.json`; `astro`, `astro check` and the editor read `astro.config.mjs` and `tsconfig.json` from the project root; `vitest` and `playwright` *do* accept `--config`, but Playwright resolves `testDir` relative to its config file, so a `site/testing/` split would displace paths and buy a flag on every invocation for no structural gain. Three of six cannot move and the two that can should not.
- **10, derived rather than plucked:** the six there today plus the arrivals that can actually be named — `wrangler.jsonc` (`TASK 32`), `.npmrc`, `README.md`, `.gitignore`. **At eleven the answer is not a higher number**; it is a file that did not have to sit at a package root. Written at the number, in the rule and in the ADR.
- **Derived from disk, never a named path** (`P-13`): any directory holding `package.json` gets the calibration, so the repository root and a package nobody has created yet are covered with no edit.
- **A package root with no calibration configured throws** (`G-13`). Reading `undefined` as "no limit" would exempt every package root silently — the exact failure this surface exists to refuse — so the guard denies instead.

## Findings from validating against real state (P-04)

- **`site/test-results` was excluded from the term scanner and *not* from `check-site`'s walk.** The asymmetry is why it went unnoticed: the directory is empty on a green run, so the cap would first have fired on a **red** one — a gate failure arriving on top of a real test failure, at the worst possible moment. Proven rather than argued: eight files planted under `site/test-results/some-failing-test/` and the exclusion temporarily removed produced `site/test-results/some-failing-test holds 8 files`. Restored, green. Same class as `screenshots`, which was already excluded for the same reason.
- **The two residue directories were the same defect, and git could not see either.** `site/site/node_modules/.scratch/measure-bento.mjs` (2026-08-25) is a throwaway Playwright script measuring `.work-bento__grid` boxes, from the home item; `site/es/` (2026-08-26) was empty. Both are a **write with a relative path resolved from the wrong working directory** — the intended `site/node_modules/.scratch/…` written with the cwd already at `site/`. Nothing was corrupted; they were dead directories, not split state. **`git status --porcelain site/` returned zero lines for both**: git does not version empty directories, and the other fell under `.gitignore`'s `node_modules/`. `H-01` exists so the human sees in one diff everything an agent did, and these two writes were in no diff. Recorded as a note rather than a rule: nothing can mechanize it against git's index, and a rule that cannot be checked is ceremony (`G-10`). Both directories removed.
- **The register's own advice held.** `TASK 41`'s entry said *"the file cap is 6 and `site/` already holds four"* when it held five. This item's entry deliberately stated the cap and the condition instead of a count, and it was still accurate three days later.

## Done
```yaml
done:
  tests: { status: passed, evidence: ["node --test scripts/guards/lib/site-structure.test.mjs — 98 pass, 0 fail", "7 new cases, 5 red before the implementation"] }
  mutation: { status: passed, evidence: ["covered by the gate's mutation step over scripts/guards/lib/**"] }
  docs: { status: passed, evidence: ["check-rules-registry exit 0", "check-docs exit 0", "check-site exit 0", "ADR-008 amended and docs/adr/README.md reconciled in the same change (P-07)"] }
  scope: { status: passed, evidence: ["6 files: site-structure.mjs, site-structure.test.mjs, guards.config.json, check-site.mjs, 50-implementation.md, ADR-008 + its index"] }
  loose_ends: { status: passed, evidence: ["both closed in this item — see Findings"] }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions

None. The mutation score is re-measured by the gate's own step at the end of the session rather than asserted here.

## Next

TASK 54 — the build cache that can serve HTML the current code did not produce.

## Files changed

`scripts/guards/lib/site-structure.mjs` — `packageRoots()` derived from the file list; `checkFileCap` takes two calibrations and denies on a missing one.
`scripts/guards/lib/site-structure.test.mjs` — 7 cases for the second calibration, including the leak checks in both directions.
`scripts/guards/guards.config.json` — `maxFilesPerPackageRoot: 10` with its reason; `test-results` added to `site.exclusions`.
`scripts/guards/gate/check-site.mjs` — the summary line reports both caps.
`.claude/rules/50-implementation.md` — `S-03` amended.
`docs/adr/ADR-008-site-implementation-architecture.md` — sub-decision 5 amended.
`docs/adr/README.md` — the ADR-008 row's date and a superseded-points row.
