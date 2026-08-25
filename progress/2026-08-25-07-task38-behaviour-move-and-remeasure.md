# 2026-08-25 · Session 07 — TASK 38: the behaviour tier's home, and the re-measurement

**Task:** TASK 38 — Ratchet the mutation score toward 100
**Status after this session:** TODO — **partial and honest**. The architectural question is answered and the number is measured, but `break` was NOT raised, because the score is below it.

## The decision the item was blocked on

`site/lib/behavior` scored **0.00% over 111 mutants** — inside Stryker's mutate glob, with killers only Vitest can drive. Three answers were on the table. Exploring the tree surfaced a fourth the entry did not list: **`ADR-008`'s own tree already declares `src/behaviour/` as the home for this tier**, and the layout-shell item had simply not used it.

The author chose that. It costs no rule change, no glob negation, and leaves `mutation-suppressions.test.mjs`'s property untouched — the property whose whole point is that *the worst-scoring file is exactly the one it would be tempting to drop*.

## The move

`site/lib/behavior/{scroll-spy,theme}.mjs` and their two `.component.test.ts` files moved to `site/src/behaviour/`. `BaseLayout.astro`'s two dynamic imports and `vitest.config.ts`'s `include` glob followed. Verified after: **2 files, 15 tests, green**, and `check-site` reported **no new findings** — the move introduced nothing.

Checked before moving, not assumed: **nothing in `site/lib/**` imported the tier.** Only `BaseLayout.astro` did. So `S-06` was never at risk.

A gate defect was found *because of* the move and fixed by the concurrent TASK 39 slice: `component tests` had `skipIf: () => !holdsFileEndingWith('site/lib', ...)`, hardcoded to the old directory, so the step would have **skipped itself silently**. It now derives from `'site'`. That is TASK 39's own defect arriving through this item's door — recorded because it is the second time in two days that a path literal in a skip predicate turned out to be the fragile part.

## The measurement

| | |
|---|---|
| score | **73.06%** (`break` 74 — **still red, by 0.94**) |
| mutants | 4,773 |
| killed / timed out | 3,416 / 66 |
| survived | 1,046 |
| no coverage | 238 |

`shell.mjs`, the largest single lever, went **66.21% → 80.73%** in a sibling slice (58 new tests, survivors 146 → 84).

**`break` was deliberately not moved.** Raising it against a score below it is meaningless; lowering it to 73 is what `ADR-006` forbids — a survivor is killed by a test or excluded at the mutant, never by lowering the floor. The ratchet stays at 74 and the step stays red, which is the honest state.

## Findings

- **Two files this session improved went down**: `terms.mjs` 80.95 → 74.12, `gate.mjs` 86.44 → 80.41. Neither got worse — both **grew**, and new code carries proportionally fewer kills. The entry already records that a percentage floor can be gamed by adding well-tested code; this is the same coin's other face, and it means a session that adds real code can lower the score while improving the repository.
- **The only machine-readable artifact of a run was a 2.3 MB HTML file** with the report embedded as a JavaScript assignment. A ratchet cannot read that reliably. `stryker.config.mjs` gained the `json` reporter.
- **`ADR-008` had drifted from its own tree and nothing caught it.** It surfaced as a score, not as a review finding — which is the argument for the mutation gate existing at all.

## Loose ends

- **51 kills anywhere crosses 74.** The scoped `git-write.mjs` slice is the named next step: 217 mutants, 73 survivors, 26 uncovered, and it is the guard behind `H-01`.
- 84 survivors remain in `shell.mjs`, grouped into 7 named families in session 04's log.
- `site-structure.mjs` (317 survivors, 105 uncovered) is the largest remaining deficit and is untouched.

```yaml
done:
  tdd:        { status: not_applicable, reason: "no production behaviour was written — files moved unchanged, and the test-writing halves are sessions 04 and 05" }
  tests:      { status: passed, evidence: ["site/src/behaviour — 2 files, 15 tests green under Vitest from the new location", "full guard suite 580/580 after the move; site core tests and component tests both PASS in the closing gate run"] }
  mutation:   { status: partial, evidence: ["full run measured: 73.06% over 4,773 mutants — 3,416 killed, 66 timed out, 1,046 survived, 238 uncovered", "break left at 74 deliberately: the score is BELOW it, so raising is meaningless and lowering is what ADR-006 forbids", "behaviour tier confirmed out of the mutated set — 0 behaviour modules appear in the report"] }
  gate:       { status: partial, evidence: ["closing run 16/18 — the mutation step FAILs at 73.06 < 74, which is this item's remaining deficit", "the other failure is `evidence trace`, owned by TASK 12 and deferred by the author"] }
  docs:       { status: passed, evidence: ["docs/adr/ADR-008 — dated amendment recording the drift, the three rejected answers, and why the move was cheap", ".claude/rules/50-implementation.md — the tree's `src/ Astro only` annotation corrected; it was already false, since the gateway is .ts", "TASKS.md — TASK 38 carries the measured state and the remaining deficit by file"] }
  scope:      { status: passed, evidence: ["orchestrator files only: site/src/behaviour/**, BaseLayout.astro, vitest.config.ts, stryker.config.mjs, ADR-008, 50-implementation.md, TASKS.md — disjoint from every concurrent agent's owned set"] }
  loose_ends: { status: passed, evidence: ["51 kills to cross 74, with git-write.mjs named as the next scoped slice and its numbers recorded", "84 shell.mjs survivors and site-structure.mjs's 422 left named rather than counted"] }
  iterations: { status: passed, evidence: ["1"] }
```
