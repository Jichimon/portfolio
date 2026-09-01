# 2026-09-01 · Session 05 — TASK 109: the coverage audit, closed

**Task:** TASK 109 — the two candidates from the "cut the coverage" audit, implemented
**Status after this session:** DONE, locally verified against a real mutation run.

## What was done

The author's broader concern from `TASK 108`'s session — that ~1050 guard tests, a Stryker
run over 7,951 mutants, and (at the time) a three-engine e2e suite read as disproportionate
for "a harness and an almost-static site" — was answered in three steps across two sessions:
first an e2e cut backed by a real CI log (`TASK 108`), then an audit of `scripts/guards/lib/**`
and `site/lib/**` that pushed back on cutting the surface wholesale but surfaced two real,
narrow candidates, then — this session — both candidates implemented, tested, and verified
against a real mutation run rather than assumed fixed.

### Candidate 1 — `scripts/guards/lib/site-structure.mjs` split

877 lines, a header claiming "three things" while implementing eight unrelated `S-*`
checkers. Split into `scripts/guards/lib/site-structure/`: `shared.mjs` (the four primitives
used by more than one checker — `code`, `inside`, `importsFrom`, `lineAtOffset`), one module
per rule (`file-cap.mjs`, `gateway-boundary.mjs`, `framework-free.mjs`, `route-literals.mjs`,
`design-tokens.mjs`, `visible-strings.mjs`, `config-declarative.mjs`,
`comment-references.mjs`), and `index.mjs` composing them into `checkSite`. The original path
is now a one-line barrel (`export * from './site-structure/index.mjs'`), so every external
citation — `check-site.mjs`'s import, `gate.mjs`'s `redProof`, `ADR-008`, the rules registry —
needed no edit. Verified byte-for-byte behavior-preserving before touching anything else: all
107 pre-existing tests passed against the new split implementation, unchanged, before the test
file itself was split.

The test file split 1:1 alongside the source (one `*.test.mjs` per module, plus
`index.test.mjs` for the `checkSite` composition tests scattered through the original). 107
original tests + 2 new regression tests = 109, all passing.

**A real bug found while splitting, not invented to justify the item.** Diffing the three
near-identical hand-rolled comment/quote state machines against each other —
`codeStringLiteralsByLine` (now `route-literals.mjs`), `withCommentsBlanked` (now
`design-tokens.mjs`), `commentsByLine` (now `comment-references.mjs`) — surfaced a real
divergence: two of the three closed a backtick-quoted template literal at its first internal
newline, something only single- and double-quoted strings can legally do. A multi-line
template literal containing a `//`-shaped run of characters then desynced the state machine
badly enough that whatever came after the literal's real closing backtick was read in the
wrong state. Fixed with a one-line exception in each (`quote !== '` + "`" + `'`).

### Candidate 2 — `cost.mjs`'s kill rate, fixed honestly rather than excluded

The audit's own proposal to the author — get `cost.mjs` "out from under the blocking mutation
floor" — assumed a Stryker lever that turned out not to exist: there is no per-file "measure
but do not block" setting, only mutate-glob inclusion or exclusion, all or nothing. Excluding
the file would have reversed its own header's explicit intent ("Pure functions only... that
keeps the logic inside the mutation-covered surface (D3)") and hidden real gaps rather than
genuine noise. Checked, not assumed: read every one of the 139 surviving/uncovered mutants
individually before deciding anything. They were **not** concentrated in `formatReport`'s
prose the way `status-history.mjs`'s `renderLedger` was (`TASK 88`) — the largest cluster was
real aggregation arithmetic (`byRole`/`bySession`'s `+=` totals, the `results` counter,
`mb()`/`min()`'s exact formatting, `measuredModel`'s tie-break) asserted only by section-header
presence, never by a summed value.

Closed with:
- **7 new tests** targeting exactly those gaps.
- **13 `// Stryker disable next-line StringLiteral` suppressions**, on the genuinely inert
  prose lines only (titles, headings, description sentences, caveat bullets) — never on a
  table header row or a `|---|` separator, which stay live and unsuppressed. Same distinction
  `TASK 88` drew for `renderLedger`: a template's sentences are noise, its shape is structure.
- **One dead-code deletion**: `bySession`'s `last` timestamp was computed and stored but read
  by nothing — not this file, not `check-cost.mjs`, not a test. Removed rather than tested or
  excused with a suppression that would have called dead code "equivalent," which it is not.

### A pre-existing gate failure, found and fixed along the way

Running `check-site.mjs` as part of this item's own verification (not assumed clean) found 3
real `S-08` findings in `site/playwright.config.ts`: a comment from `TASK 108`'s own
(uncommitted) session cited `TASK 108`, `T-05` and `C-11` by id from inside `site/**`, which
`S-08` forbids. Confirmed this was unrelated to today's bugfix (the file's only template
literal is single-line, so it cannot trigger the newline/backtick desync) and unrelated to
today's split (the file was already modified on disk before this session touched anything).
Rewritten to keep the reasoning without the citations — the full account with its ids already
lives in `ADR-006`'s amendment, which is where `S-08` says a citation belongs.

## Decisions

- **Corrected the audit's own framing rather than silently implementing what it said.**
  Splitting `site-structure.mjs` does not reduce Stryker's mutant count — same code, same
  statements, regardless of which file holds them — and the mutation run confirms it: the
  whole `site-structure/` directory scores 61.80% in aggregate, against 61.2% for the
  monolithic file before. The real value of the split is maintainability (the header no longer
  lies about scope, each rule is reviewable in isolation) and the one genuine bug it surfaced —
  not a kill-rate win, and claiming one would be exactly what `C-01` forbids.
- **`cost.mjs` fixed by writing tests and suppressing real noise, not by hiding it from
  Stryker.** The mechanism the audit originally proposed does not exist in this toolchain;
  discovering that before implementing it (`P-04`) is what changed the plan from "exclude" to
  "test and suppress honestly."
- **The mutation floor (`break: 77.0`) was not touched.** The new aggregate (79.21%, up from a
  historical ~78.58%) has more slack than before, but raising the ratchet is explicitly `TASK
  38`'s own item per `stryker.config.mjs`'s comment — not a side effect of this one.

## Findings from validating against real state (P-04)

- **My own first regression-test fixtures were wrong, and I caught it by running them, not by
  reasoning harder.** The first attempt at proving the newline/backtick bug in red put a
  newline between the phantom re-opened quote and the target content — which the buggy code's
  own "any newline closes any quote" behavior reset before ever reaching the target, so both
  tests passed even with the bug reverted. Traced the actual character-by-character behavior by
  hand, rebuilt the fixtures so the divergence and the target sit on the same line, and reran:
  both failed with the bug reverted, both passed with it fixed. The lesson generalizes: a
  regression test's claim to be load-bearing is itself a claim that needs verifying, the same
  as any other (`P-11`).
- **The `byRole`/`bySession` test was proven load-bearing the same way**, not assumed from
  passing green: a planted `a.turns += r.turns` → `a.turns -= r.turns` mutation was reverted
  into the real file, the new test failed exactly as predicted (`-8` instead of `8`), and the
  fix was restored.
- **A worry about `TASKS.md` losing the `TASK 106`/`107`/`108` entries turned out to be a
  grep methodology error, not a real finding.** An early search used `^### TASK` (three
  hashes) against real `##` (two-hash) headings, then a second search's `tail -10` cut off
  entries that sit earlier in the file by position rather than by number. `git diff` on
  `TASKS.md` showed the real state: `TASK 106` and `TASK 107` are already committed, and
  `TASK 108` is the sole uncommitted addition, matching its own untracked progress log exactly.
  Nothing was lost. Recorded here because the almost-report would have been a false alarm, and
  catching it before saying so out loud is the point of `P-04`.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test \"scripts/guards/**/*.test.mjs\" — 1059 passed, 0 failed (was 1050 before this item)", "node scripts/guards/gate/check-site.mjs — PASS, 96 files, 0 findings (was 3 findings before the playwright.config.ts fix)"] }
  mutation:   { status: passed, evidence: ["node node_modules/@stryker-mutator/core/bin/stryker.js run — aggregate 79.21% (break threshold 77.0, PASSED); cost.mjs 66.67% (was 51.7%); site-structure/ directory 61.80% in aggregate (was 61.2% as one file — the split does not itself move this number, stated rather than implied otherwise); comment-references.mjs (the S-08 checker, with the bugfix) 87.65%", "incremental mode, not yet the trusted basis for the ratchet per stryker.config.mjs's own stated caution — reported as observed, not overclaimed as ratchet-grade (C-01)"] }
  ci:         { status: not_applicable, reason: "no CI workflow touched by this item" }
  security:   { status: passed, evidence: ["both bugfixes proven in red: reverted, the two new regression tests fail with the predicted failure mode (confirmed by literally reverting quote !== '`' in both files and rerunning); restored, both pass — P-14"] }
  docs:       { status: passed, evidence: ["node scripts/guards/gate/check-rules-registry.mjs and check-docs.mjs both re-run clean after the split (no path citations broken — the barrel kept every external reference resolving)"] }
  loose_ends: { status: passed, evidence: ["the deeper simplification this audit considered and declined — unifying the three comment/quote state machines into one shared walker instead of fixing each in place — is stated as a residual below, not silently dropped"] }
  scope:      { status: passed, evidence: ["exactly the two candidates the audit named and the author approved; the pre-existing S-08 finding in playwright.config.ts was fixed because this item's own verification step (check-site.mjs) found it, not sought out"] }
  content:    { status: not_applicable, reason: "no resources/** touched" }
  iterations: { status: passed, evidence: ["1"] }
  iteration_split: { status: passed, evidence: ["verify=1"] }
```

## Residual, stated rather than silently dropped (`P-19`)

**Considered and declined: unifying the three comment/quote state machines into one shared
walker.** Their trigger conditions are identical (verified by diffing all three character by
character before deciding), and a shared implementation would remove the duplication outright
rather than fixing the same bug three times in parallel. Declined for this session on a risk
basis, not a value basis: getting a hand-rolled FSM wrong in a shared primitive would silently
weaken three guards (`S-01`, `S-05`, `S-08`) at once, and verifying a rewrite that thoroughly
in the time available was not realistic. The narrower fix — the same one-line exception applied
to each of the two buggy copies — closes the actual defect without that risk. Nobody is
currently blocked by the remaining duplication; if a fourth near-identical parser shows up, or
one of the three needs another fix the others don't get, that is the trigger to revisit it.

## Open questions

None blocking. The mutation number reported here is from an incremental run; this repository's
own `stryker.config.mjs` already states incremental mode is not yet validated as the basis for
moving the ratchet itself — irrelevant to this item, since the floor was not touched, but
stated so the number is not read as more certain than it is.

## Next

Author reviews and commits. No further action required for this item.

## Files changed

**New:** `scripts/guards/lib/site-structure/{shared,file-cap,gateway-boundary,framework-free,route-literals,design-tokens,visible-strings,config-declarative,comment-references,index}.mjs` and their nine colocated `*.test.mjs` files.
**Deleted:** `scripts/guards/lib/site-structure.test.mjs` (split into the nine files above).
**Modified:** `scripts/guards/lib/site-structure.mjs` (now a one-line barrel); `scripts/gate.mjs` (`redProof` repointed to `site-structure/file-cap.test.mjs`); `scripts/guards/lib/cost.mjs` (aggregation-loop dead-code removal, 13 suppressions); `scripts/guards/lib/cost.test.mjs` (+7 tests); `site/playwright.config.ts` (S-08 fix, unrelated to this item's own two candidates but found by this item's own verification).
