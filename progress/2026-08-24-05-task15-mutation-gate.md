# 2026-08-24 · Session 05 — The mutation gate, or an honest rung

**Task:** TASK 15 — Mutation gate, or an honest rung
**Status after this session:** DONE

## What was done

Stryker installed at the repository root, `stryker.config.mjs` written, and the mutation gate run over `scripts/guards/lib/**` for the first time in this repository's history. **It scored 74.35%, not 100%.** The gate step is wired at a measured ratchet rather than at `ADR-006`'s aspirational `break: 100`, and `T-03`'s rung is reconciled to say exactly what is enforced.

## The measurement — the whole item hangs on this number

First automated run, 2026-08-24, `npx stryker run` from the repository root:

| | |
|---|---|
| Mutation score | **74.35%** total · 77.30% covered — *this table is the FIRST run, before this item wrote its own module. At close the same command reads 74.41% / 780 survivors; the delta is this session's new file, not a re-measurement* |
| Mutants | **3,532** across 20 files |
| Killed | 2,605 |
| Timed out (counted as killed) | 21 |
| **Survived** | **771** |
| No coverage at all | 135 |
| Wall clock | **2 min 32 s**, 11 concurrent test-runner processes |
| Dry run | 22 test files, 7 s · `perTest` coverage analysis, 1.03 tests per mutant |

Worst three files, and this is the finding that matters most:

| File | Score | Survivors | What it enforces |
|---|---|---|---|
| `git-write.mjs` | 54.38% | 73 | `H-01` — no agent invokes a git write |
| `shell.mjs` | 66.21% | 146 | the quote-aware tokenizer every path guard depends on |
| `evidence.mjs` | 68.77% | 97 | `H-03` — the trace only hooks may write |

**316 of the 771 survivors sit in the three modules behind the rung-1 boundaries.** The guards this repository trusts most have its weakest batteries.

Survivors by mutator: `Regex` 218 · `StringLiteral` 215 · `ConditionalExpression` 128 · `MethodExpression` 47 · `LogicalOperator` 37 · everything else under 30.

## Decisions

- **`break: 74`, a measured ratchet, not `ADR-006`'s `break: 100`.** The ADR set 100 on the strength of every hand-applied battery in `progress/` reading 100% mutant-kill. Those batteries were not wrong — each was applied to the code its session was changing, and each really was 100% *of that*. They were never a measurement of the surface, and the difference had gone unnoticed for the whole life of the harness. Setting `break: 100` today ships a gate that is red on every run, which teaches people to ignore it; setting it at the measured floor ships a gate that fails on a regression, today, honestly. What it does **not** enforce is `T-03`'s actual sentence — *a surviving mutant is a finding* — and `30-testing.md` says so rather than implying otherwise.
- **No wholesale mutator exclusions, despite 433 of 771 survivors being `Regex` + `StringLiteral`.** Excluding those two would have bought back most of the gap in one line, and it was rejected for a specific reason: `INC-13` in this repository was a guard whose regex arrived on disk with literal control bytes and *could never match*, invisible to four inspections. A surviving `Regex` mutant is precisely that signal. And a mutated string literal in `git-write.mjs` or `path-boundary.mjs` is a mutated boundary path, not mutated prose. The noise is real; blinding the gate to the two mutators with the strongest local incident behind them is not the way to remove it.
- **Mutate `scripts/guards/lib/**` only, and reconcile `T-03` rather than the config.** Agreed with the author before the run. `gate/**` and `hooks/**` are thin argv-read-print-exit wrappers; `D3` scoped mutation to parsing, joining and validating, which is what `lib/` is. The run then produced independent evidence for this: `gate/check-terms.test.mjs` covered **zero** mutants, because it drives the CLI in a child process and instrumented coverage never comes back.
- **A suppression carries its reason, and a check enforces that.** Exclusions live inline at the mutant and nowhere else — one declaration site, travelling with the code. No standing exclusions register: two declaration sites for one datum, and the document is always the half that drifts.
- **Full run, no `--incremental`.** 2m32s is under the threshold the author set for deciding this, so the gate carries no state file that can go stale.

## Findings from validating against real state (P-04)

- **The premise of running this item at position 6 holds.** `mutate` carries `site/lib/content/**/*.mjs` before that directory exists, and Stryker **warns** rather than erroring: `Glob pattern "site/lib/content/**/*.mjs" did not result in any files`. The surface is covered the moment the content-layer item writes it.
- **`perTest` coverage analysis works with `tap-runner`**, at the file granularity `ADR-006` predicted — 1.03 tests per mutant on average, against 22 test files. The ADR's stated cost is real and small at this scale.
- **`tap-runner`'s default `nodeArgs` drive `node:test` correctly** with no override. The `-r {{hookFile}}` CJS preload against `.mjs` test files was flagged as a risk in planning and is a non-issue.
- **The sandbox risk did not fire.** Stryker copies git-tracked files, so gitignored `private/` is absent from `.stryker-tmp` — the same absence `harness.yml` documents for CI. The dry run succeeded anyway: `lib/*.test.mjs` use fixture strings, and the one test that reads real repository roots contributes no coverage regardless.
- **`ADR-006`'s open benchmark question now has one data point.** The ADR states outright that no benchmark exists quantifying `tap-runner` at any scale, from Stryker or anyone else. This repository now has a measured one: 3,532 mutants over 2,786 lines in 152 seconds.
- **Two moderate dev-only advisories** arrived with the install (`qs` via `typed-rest-client`, Stryker's dashboard reporter). No runtime exposure — nothing in `site/`'s dependency tree, nothing shipped. Recorded, not chased.

## The adversarial audit, and the critical defect it found

The auditor ran before close and found a hole in this item's own deliverable, in the first thing it looked at.

**`mutation-suppressions.mjs` required `//`. Stryker does not.** Its instrumenter (`directive-bookkeeper.js`, v10.0.0) applies `/^\s?Stryker (disable|restore)…/` to Babel's `comment.value` for **every leading comment node**, and Babel strips the delimiters — so `// Stryker disable all` and a block-comment spelling of the same directive reach that regex as byte-identical strings. Verified in Stryker's own source, not taken on the auditor's word.

**Why that was critical rather than untidy, and it is the second half that matters.** An *ignored* mutant leaves the score's **denominator**. `git-write.mjs` scores 54.38% — well below the 74.35% average — so one block-comment suppression at the top of it removes 73 survivors from the maths and **the aggregate score rises.** A regression in the guard behind `H-01` could have landed with the gate going *greener*, the suppression check blind to it, and nothing anywhere firing. The ratchet had a hole that ran the wrong way, and it was one line wide.

Fixed as `MS-006`: four tests, two of them red first (the two that require *catching* the block form failed; the two that require *not* flagging passed vacuously, which is what honest red looks like here). The mirror of Stryker's grammar is now documented against the file and version it was read from, and a **canary test** fails if that source stops being the thing it mirrors — the guard's own dependency was the vector, so trusting it silently would repeat the defect.

**A second finding, taken and fixed:** nothing in the gate read `stryker.config.mjs`, so lowering `break` to 0, or adding one negation glob, disabled the mutation gate silently. Dropping the worst-scoring module from `mutate` is especially quiet — it removes that module from the score *and* from the suppression scan in the same edit. Two assertions now cover it: the threshold may not fall below the measured floor, and the mutate negations may exclude nothing but test files. Both proven in red (`break: 0` fails; `'!scripts/guards/lib/git-write.mjs'` fails), then restored.

**Two findings deliberately not fixed here**, because they are properties of `gate.mjs` and predate this item: a step can exit 0 without running anything (`node --test` on a glob matching nothing exits 0), and a `SKIP` still prints `GATE PASSED`. Both are `INC-08`'s shape in the gate itself. Tracked as `TASK 39` rather than absorbed (`P-06`).

**What the auditor did not examine, stated because silence reads as coverage** (`P-03`): it never opened `30-testing.md` or `50-implementation.md`, so **the rung claim itself went unaudited** in that pass — the central claim of this work item. It also did not corroborate the closing 74.41% / 780, the three-file survivor concentration, or the timing. A second, deliberately narrow audit was run for the rung claim alone.

**Then the trace was read** (`H-03` permits reads) to find out what the harness recorded about a delegation that stopped without delivering. **It recorded nothing.**

`termination: { state: COMPLETE, reason: objective_reported }` — one footer, written at the end of the *resume*. The first stop left no footer at all. Set beside the same session's `implementer` run, which genuinely succeeded, the two footers are **byte-identical**: a delegation that delivered nothing and one that delivered everything are indistinguishable in the substrate every KPI is read from. The same file carries **two** `run.header` events and `permission_mode: "unknown"`. Four of `TASK 12`'s open criteria, which now has a measured specimen instead of a hypothesis and is updated with it.

Two lessons taken here rather than left in the conversation (`P-10`): `adversarial-auditor` carries `maxTurns: 20`, which is not enough for an audit of any breadth — recorded against the budget re-measurement `TASK 12` already owns. And **an audit brief is sliced by object like any other**: this one listed six attack categories, which is a surface, and `P-09` says so in as many words. The `work-item` procedure now carries it, because the failure is quieter than an implementer's — an auditor that runs out still delivers *some* findings, and they read as the audit rather than as a fragment of one.

## The second audit — narrow, and it corrected a security claim I had made by inference

The first audit never reached this item's central claim, so a second one was run against **one question about one object**: is the rung `T-03` declares the rung the gate enforces?

**Verdict: honest, both halves** — with one wording correction, now applied. The rung-2 clause read *"the score may not fall"*; what is mechanized is *"may not fall below the measured floor"*, and today that permits a 0.41-point fall in silence. The row now says the narrower, true thing. The rung-4 half was attacked on the grounds that if nothing ever asks a human to look at a survivor, 4 is generous — it does not land: `test-engineer`'s role file already requires an enumerated survivor list in its report, and rung 4 in this registry *is* prose in a rule or role file, no more. And the split-rung device turns out to be house style rather than an invention to keep an unearned 2 — nine pre-existing rows carry two rungs, `S-03` and `G-06` among them.

**It also found that I had asserted a security property by inference and been wrong.** This log originally recorded, under `security`, that *"Stryker's sandbox copies git-tracked files only, so gitignored `private/` never entered `.stryker-tmp`"*. That was reasoning about how Stryker works, not a measurement. Measured: `.stryker-tmp/sandbox-*/private/banned-terms.txt` and `glossary.md` were both there, alongside `evidence/`. The confidentiality mapping itself, materialised outside `private/`.

Nothing leaked — the tree is gitignored and is a scan exclusion — but *"nothing leaked this time"* is not the property `H-04` asks for. Fixed at the cause rather than in the prose: `ignorePatterns: ['private', 'evidence']` keeps them out of the sandbox entirely. The one test that then failed was `gate/check-terms.test.mjs`, which needs the real term list — and its removal from the mutation runner's scope costs **nothing measurable**, because the first run had already recorded it covering *zero* mutants. Re-run after the change: **74.41%, 780 survivors, identical to the run before it**, exit 0, and no `private/` in the sandbox. It still runs every time under the gate's `guard tests` step.

**And it closed the red path the first audit left untested.** `break` temporarily raised to 99 against the real 74.41: `Final mutation score 74.41 under breaking threshold 99, setting exit code to 1`, `EXIT=1`, then restored. The gate's non-zero → `FAIL` mapping is separately covered by `gate.test.mjs` and was observed live earlier in this session when the `npx` shim failed. So the mechanism behind the rung-2 claim is now proven end to end rather than inferred from vendor documentation.

**The second audit also exhausted its budget and had to be resumed** — at 29 `tool.requested` against `maxTurns: 20`, after the brief had been deliberately cut to one object precisely because the first had been given six. That is the finding: brief-slicing was necessary and not sufficient, and 20 turns does not fit an audit that runs anything. Recorded against `TASK 12`'s budget re-measurement, with the `harness-evaluator` 20 → 60 precedent named. Raising it is deliberately **not** done here — a budget is agent policy and what `G-06` promises to enforce, and changing it in the same breath as measuring it would leave nobody able to say which number was ever tested.

**Recorded, and deliberately not made a work item:** `check-rules-registry`'s `primaryRung()` takes the **first digit** in a rung cell, so for a split-rung row the clause order decides what the registry mechanically believes — `T-03` leads with 2 and is recorded as 2, `T-01` leads with 4 and is recorded as 4, and no convention enforces which half goes first. It has no consequence today: the guard's only assertion on that value is that it falls between 1 and 4. Written down so the gap reads as a decision rather than an oversight, and so the first check that *does* consume the number knows to look here.

## The defect the gate found in its own new step

The mutation step passed when run by hand and **FAILED inside `gate.mjs` in six seconds.** `spawnSync` has no shell, and on Windows `npx` is a `.cmd` shim: `spawnSync('npx', ...)` returns `{ status: null, error: ENOENT }`, and `gate.mjs`'s `?? 1` turns that into an ordinary `FAIL` with no hint that nothing ran. The step now invokes `node node_modules/@stryker-mutator/core/bin/stryker.js run` — a real file, like every other step, rather than a shim.

Worth recording as more than a Windows footnote. It is *a check that exists and does not check* (`INC-07`, `INC-08`) arriving through a new vector, and the only reason it was caught in minutes rather than months is that the failure was loud. Had `spawnSync` returned 0 instead of null, the step would have reported `PASS` forever. `ADR-006` still names `npx stryker run` and that is still the command to type by hand; the gate resolves the binary itself.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["full guard suite 440/440, up from 423 — the suppression battery is 17 tests, 7 of them added by the audit", "each of MS-001..MS-005 was seen to fail before its implementation existed; the implementer reported the messages, and MS-004's red arrived unprompted when the disable/restore distinction turned out to be load-bearing", "orchestrator re-verified independently: planted a bare reasonless suppression in shell.mjs, suite failed naming shell.mjs:260, file restored byte-identical", "the threshold itself proven in red at the CLI: break temporarily 99 against the real 74.41, Stryker exits 1 naming both numbers, restored", "MS-006 and the two config assertions each proven in red then restored — break: 0 fails, a non-test negation glob fails, the block-comment form fails before the fix and passes after"] }
  mutation:   { status: passed, evidence: ["74.41% over scripts/guards/lib/**, break 74 — the gate's own step, exit 0, final run at close. The 74.35% in the measurement table above is the FIRST run; the delta is this item's own new module, written and then grown by the audit fix", "mutation-suppressions.mjs, this item's new module, is inside the surface it protects", "780 survivors at close, against 771 at first run — the increase is this item's own module, not a regression elsewhere. Recorded as a finding, not averaged away — TASK 38"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 15 of 16 steps PASS, 152s wall clock at close", "mutation moved from absent to PASS, which is the item", "check-docs and check-procedures each failed once on this session's own edits and were fixed, not waived"], reason: "evidence trace fails on TASK 12's known writer defect, and H-03 forbids every agent from touching evidence/ by any vector. Named rather than claimed green — the same call TASK 21 and TASK 31 made on the same step" }
  security:   { status: passed, evidence: ["the implementer holds network: no and was given no network work; the install stayed with the orchestrator, as in TASK 21", "resources/** untouched (H-02)", "no git write — H-01 denied a `git checkout` restore mid-session and the restore was redone by file copy", "CORRECTED: the sandbox copies the working tree, NOT only what git tracks — private/banned-terms.txt and glossary.md were measured inside .stryker-tmp/sandbox-*/. Fixed at the cause: ignorePatterns keeps private/ and evidence/ out of the sandbox entirely; re-measured absent afterwards", ".stryker-tmp and reports excluded from repo-wide scans with written reasons, and gitignored"] }
  docs:       { status: passed, evidence: ["30-testing.md: the surface block splits TDD from MUTATION, T-03's rung reads 2 for one promise and 4 for the other, both audited as honest by a second narrow audit; the rung-2 clause narrowed from 'may not fall' to 'may not fall below the measured floor' on that audit's one wording finding", "ADR-006 amended 2026-08-24 with the measurement and the two triage decisions", "ADR-008 amended: the root is not dependency-free and could not be", "50-implementation.md S-07 amended", "check-docs PASS — 53 documents, 184 references resolved"] }
  content:    { status: not_applicable, reason: "nothing in resources/** touched; no publishable copy exists in this item" }
  ci:         { status: not_applicable, reason: "no remote exists, so no CI run can be read (T-10). The workflow gained `npm ci` so the mutation step cannot skip silently once a remote does exist — written, not verified" }
  loose_ends: { status: passed, evidence: ["TASK 12 updated with the measured trace specimen — four of its open criteria now have evidence rather than a hypothesis", "the work-item procedure now says an audit brief is sliced by object (P-09), with the 2026-08-24 instance behind it", "TASK 38 opened for the survivor backlog, prioritised on the three rung-1 modules", "TASK 39 opened for the two gate-wide defects the audit found — a step can exit 0 without running, and a SKIP still prints GATE PASSED", "the implementer's one scope excursion — a temporary probe in agents.mjs, a file it did not own — reported by it, verified reverted, recorded in Decisions"] }
  scope:      { status: passed, evidence: ["one deliverable: the gate enforces mutation and T-03's rung is honest", "the burn-down is TASK 38, not this item", "no mutator excluded, no threshold lowered to buy a green"] }
  iterations: { status: passed, evidence: ["6"] }
```

`iterations: 6` — the delegated slice returning for verification; the gate's first full run, which surfaced two self-inflicted document failures; the second run, which surfaced the `npx` defect; the first adversarial audit, which sent the suppression guard back with a critical hole in it; the second, narrow one, which corrected a security claim made by inference and closed the untested red path; and the S-07 audit, which found a rule row I had made unfalsifiable.

## The last open thread, closed after the done block was written

`S-07` was the one thing the second audit flagged and never examined. It was delegated on its own, to a `haiku` run of the same role — one question, one row, no commands — and it came back with a verdict the orchestrator then re-derived rather than accepted (`P-11`).

**The verdict: the first amendment was unfalsifiable, and it was mine.** It read *"only tooling that spans both packages"*. "Spans" is a claim about what the person adding a dependency intended it to do; no reader of `package.json` can check it. The concrete counter-test: ESLint added at the root because *"it lints both packages"* satisfies the phrase, while nothing about ESLint requires it to be there — and the rule it replaced, *"no dependencies"*, was at least binary. Trading a checkable rule for an accommodating one is how a registry acquires a row nobody believes, which is `C-14`'s origin argument arriving in a new place.

Narrowed to a property of the **tool** instead of the intent of the author: *"only tools whose configuration must live at the repository root to function."* Stryker satisfies it for a measured reason — its sandbox is rooted at the working directory, so a config under `site/` cannot reach `scripts/guards/lib/`. ESLint does not. Decidable against the tool's own documentation, by anyone.

`ADR-008`'s amendment carries the same correction, since it stated the phrase first.

**Worth noting about the rung.** `S-07` sits at rung 4 — prose, no mechanism. The audit's argument that this makes the wording *more* serious rather than less is right and is the reason this was worth doing at all: a rung-2 rule can afford loose prose because a guard decides the real cases, and a rung-4 rule is nothing but its prose.

**A closed item was edited after its done block.** Recorded plainly rather than quietly: the item's own `Done` is about `T-03`'s rung and was met before this; `S-07` is a rule row this item amended along the way, and leaving a known-unfalsifiable row standing because the paperwork was finished would be the wrong trade.

## Open questions

None blocking. The 771-survivor backlog is tracked work, not an open question.

## Next

Not `TASK 38`, and not `TASK 39` either — both were placed deliberately and the placement is written into their register entries so it is not re-derived. The next thing is the **content layer**, in a fresh session: it is typed `feature`, so it opens with a spec presented as a file and the author's approval recorded in `approved_version` before any write-capable role can run against it (`H-05`, rung 1, unwaivable in-session).

Original note, superseded: `TASK 38` — burn the survivor backlog down and ratchet `break` upward, starting with the three rung-1 modules.

## Files changed

`package.json` — the root's first dependencies: `@stryker-mutator/core` 10.0.0, `@stryker-mutator/tap-runner` 10.0.0, both read from disk.
`package-lock.json` — new, committed for `npm ci` in CI.
`stryker.config.mjs` — new. One config over both mutation-covered surfaces; ignorePatterns keeps private/ and evidence/ out of the sandbox.
`.claude/rules/30-testing.md` — the rung-2 clause narrowed, and the sub-gate row says the gate does not use the npx form.
`.gitignore` — `.stryker-tmp/` and `reports/`.
`scripts/guards/guards.config.json` — the same two paths as scan exclusions, each with its reason.
`scripts/guards/lib/mutation-suppressions.mjs` — new. A `Stryker disable` with no written reason is a finding.
`scripts/guards/lib/mutation-suppressions.test.mjs` — new. 10 tests, incl. the derived real-repository scan.
`scripts/gate.mjs` — the sixteenth step, `dependsOn: 'guard tests'`, invoking Stryker's bin rather than the npx shim.
`scripts/guards/lib/gate.mjs` — stale step counts reconciled; the `dependsOn` doc comment now names its first user.
`.github/workflows/harness.yml` — `npm ci` at the root, so the mutation step cannot skip silently in CI.
`.claude/rules/30-testing.md` — the surface split, `T-03`'s two-rung row, the measured threshold row.
`.claude/rules/50-implementation.md` — `S-07` amended; the tree note on where the Stryker config lives.
`.claude/skills/work-item/SKILL.md` — an audit brief is sliced by object too (P-09), with the instance behind it.
`TASKS.md` (TASK 12) — the measured trace specimen: four open criteria now have evidence.
`docs/adr/ADR-006-testing-toolchain.md` — the 2026-08-24 amendment carrying the measurement.
`docs/adr/ADR-008-site-implementation-architecture.md` — the 2026-08-24 amendment on the root's dependencies.
`scripts/guards/lib/mutation-suppressions.mjs` — MS-006: the delimiter is not part of Stryker's grammar.
`scripts/guards/lib/mutation-suppressions.test.mjs` — 7 more tests: MS-006, the Stryker canary, the two config assertions.
`TASKS.md` — `TASK 15` closed, sequence row 6 struck through, `TASK 38` and `TASK 39` opened.
