# 2026-08-18 · Session 09 — TASK 5, step 12: acceptance and freeze

**Task:** TASK 5 — AI Agent Development Harness v2
**Status after this session:** TASK 5 `DONE`, 2026-08-19. Acceptance suite 10/11, export deleted by the human with zero references remaining, architecture frozen.

## What the acceptance suite found

It ran, and it earned its place immediately: **two content rules claimed gate enforcement that did not exist.**

`C-09` read *"rung 2 · `locale-parity` in the gate"*. `C-14` read *"rung 2 · `frontmatter` in the gate"*. **Neither guard had ever been written.** Both were carried forward from the original blueprint's step 6 — "terms (port), locale-parity, frontmatter" — where only the terms port was built, and nobody noticed the other two because the rows still read as though they had been.

That is a **false 🔒**, and the architecture is explicit that it is worse than an honest 🔧: a rule claiming rung 2 retires the human eye that rung 4 would have kept. Two of them sat on the surface that carries every one of this repository's own native incidents.

## `C-14` described content that does not exist

Surveying `resources/` before building the guard mattered more than building it:

| | |
|---|---|
| **5 keys universal** across all 18 files with frontmatter | `slug` `lang` `type` `title` `confidentiality` |
| **7 keys required only by case studies** | `subtitle` `role` `context` `period` `stack` `skills` `featured` |
| **`outcome`** | on 8 of 20 — absent from `mobile-banking-platform` in **both** locales |
| **`scale`** | exists in the content, was never in the rule |
| **2 files with no frontmatter** | both legitimately: a GitHub README and the intake questionnaire |

`C-14` named thirteen flat keys as if they applied to everything. **No file in the repository satisfies that list.** A guard built from the rule as written would have failed all eight pages on its first run and been switched off within a day — and `resources/` is read-only input, so the content could not have been "fixed" to match.

So the rule was corrected to describe reality: five universal keys, the rest **derived from the declared `type`**, and an unknown type is a finding rather than a pass. `outcome` is deliberately **not** required, with the reason recorded in the config beside it.

The reverse direction is asserted too: `check-content`'s liveness test fails if a configured key is required by a type that **no real file carries**. That closes the loop that let `C-14` drift in the first place — a rule can no longer describe content that does not exist.

## `check-content` — the thirteenth gate step

Two properties, both derived rather than rostered:

- **Parity** keys on the *pair*, not a count. Nine English and nine Spanish files that pair with nothing would satisfy any count-based check. It also catches the worse case: a pair whose two locales declare **different slugs**, which looks correct in a directory listing while being unjoinable, because the slug is the i18n join key.
- **Frontmatter** keys on the declared `type`, plus three agreements — `lang` against the filename suffix, `slug` against the filename, and the pair against itself.

**11/11 mutants caught**, every one against the **real** content tree — a deleted counterpart in each direction, two slugs on one pair, a removed universal key, a case study losing a type-required key, `lang` and `slug` disagreeing with their filenames, an unknown type, frontmatter removed entirely, a rename that breaks a pair, and a root pointing at nothing so the walk is empty.

**`resources/` was never written to.** Every mutation ran against a copy with the config temporarily repointed, because `H-02` is a hard rule and a battery that suspends the boundary it is testing under proves nothing about the boundary.

### A design defect found by its own test

The first version folded exemption validation into `checkFrontmatter`, and the green-path test failed: called with a two-file fixture, it reported the real config's exemptions as stale, because a fixture of two files contains neither of them. **A check whose verdict depends on how much of the world the caller happened to pass is a check that will be wrong somewhere.** Split into `validateExemptions`, which the CLI calls once against the whole tree.

## The rest of the suite

| # | Check | Result |
|---|---|---|
| 1 | Gate green on a clean tree; red **naming the step** when a guard is neutered | ✅ `GATE FAILED at: guard tests` |
| 2 | Red battery: plain `commit`, `-C`, `sh -c`, `$( )`, `Write` to `.git/` | ✅ 5/5 exit 2, all traced with rule + guard + reason |
| 3 | `resources/` write · `private/` read | ✅ denied, `H-02` / `H-04` |
| 4 | Delegation on a draft spec | ✅ proven end to end in `delegation-gate.test.mjs` |
| 5 | Locale parity broken → fails; restored → passes | ✅ **now actually possible** — the guard exists |
| 6 | Every eval case carries a verdict | ✅ 13 cases, `EVAL-000` |
| 10 | `./scripts/check-terms.sh` | ✅ 33 terms × 152 files |
| 11 | References to the inherited export → zero | ✅ after correcting one in the step-11 log |

**Items 7 and 9 were then verified from the trace**, which is stronger evidence than the form the suite originally specified:

| # | Check | Result |
|---|---|---|
| 7 | The rule files actually load | ✅ `instructions.loaded` names all five rule files plus `CLAUDE.md` across three orchestrator sessions. `30-testing.md` fires **more often** than the rest — it is path-scoped, so progressive disclosure is observable rather than assumed |
| 9 | A delegated report opens with its bootstrap documents, corroborated by the trace | ✅ `harness-evaluator`'s first eight calls hit four of its five declared bootstrap documents, in the declared order |

**Item 8 — the fresh-session smoke test — was NOT run, and is declared rather than skipped** (`P-03`). It is not self-administrable: it asks whether a *new* session, unprompted, states the git boundary, the spec-first flow and where the rules live. A session that has spent hours building the harness cannot answer it uncontaminated, and answering it anyway would be the `A16` error — measuring the author instead of the artifact. It runs at the start of TASK 7, which is a fresh session by nature.

## Findings

- **A read-only `sed -n` on `resources/` was denied by `H-02`.** `sed` is on the mutator list because `sed -i` mutates, and the guard does not distinguish the flags. Over-strict is the safe direction and `Read` is the correct tool anyway, so this is a papercut rather than a defect — but it is the same family as TASK 10's false positive and is filed rather than forgotten.
- **`INC-13` recurred twice more this session**, both times in `node -e` one-liners through the shell: once eating doubled backslashes in a test about path handling, once truncating a template literal. Neither reached a committed artifact, because both failed loudly and immediately. The lesson is now unambiguous: **source containing escapes is written with a file tool, never through a shell.**
- **The export file was untracked**, so its deletion was permanent rather than recoverable through git. Surfaced before acting; the human deleted it, and `grep` confirms zero references remain against the 14 incidents transcribed in §C.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test scripts/guards/**/*.test.mjs", "371 pass 0 fail", "11/11 content mutants caught against the real tree"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs", "exit:0, 13 steps green"] }
  acceptance: { status: passed, evidence: ["10 of 11 items run and green", "items 7 and 9 verified from the trace", "item 8 blocked below, declared not omitted"] }
  security:   { status: passed, evidence: ["red battery 5/5 denied and traced", "resources/ never written during the content battery"] }
  content:    { status: passed, evidence: ["check-content: 20 files, 9 pairs, 2 reasoned exemptions", "check-terms exit:0"] }
  docs:       { status: passed, evidence: ["architecture §M GAP-11 recorded as a decision with a trigger", "C-09 and C-14 corrected to name a guard that exists"] }
  ci:         { status: not_applicable, reason: "no remote exists — T-10 forbids reading a green local gate as evidence CI fired" }
  freeze:     { status: passed, evidence: ["export deleted by the human, grep returns zero references", "14 incidents survive in architecture.md §C", "TASK 5 DONE; GAP-01..13 filed as TASK 11-15"] }
  smoke_test: { status: blocked, reason: "acceptance item 8 (fresh-session smoke test) is not self-administrable — a session that just built the harness cannot answer it uncontaminated. Runs at the start of TASK 7. Declared rather than omitted (P-03)" }
```

## Files changed

`scripts/guards/lib/content.mjs` + `content.test.mjs` — new; 21 tests.
`scripts/guards/gate/check-content.mjs` — new; the thirteenth gate step.
`scripts/gate.mjs` — the `content` step.
`scripts/guards/guards.config.json` — the `content` block, with the type-keyed required sets and two reasoned exemptions.
`.claude/rules/20-content.md` — `C-09` and `C-14` corrected to name `check-content`; `C-14`'s key list rewritten to describe real content.
`docs/harness/architecture.md` — §M gains the argued-unmechanizable block (`GAP-11`).
`TASKS.md` — step 12 state.
`progress/2026-08-18-08-*.md` — one export reference removed.
