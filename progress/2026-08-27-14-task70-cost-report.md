# 2026-08-27 · Session 14 — The harness economy: measuring what a run costs

**Task:** TASK 70 — What a run costs: the report. This session opened the milestone that carries it (`TASK 70`–`TASK 74`) and did the register consolidation the author asked for.
**Status after this session:** IN PROGRESS — the register work is complete; `cost.mjs` is not yet written.

## What was done

Consolidated `EVAL-001`'s nine scattered ids into one **THE HARNESS ECONOMY** milestone with a run order, retiring two ids in place with pointers rather than renumbering. Opened `TASK 70`–`TASK 73` from the approved plan, and `TASK 74` from a defect found while verifying that the new entries parse the way `H-05`'s gate actually reads them.

**Two items closed.** `TASK 74` fixed a rung-1 fail-open in `parseWorkItemTypes`. `TASK 70` shipped `scripts/guards/lib/cost.mjs` (+ 18 tests) and `scripts/guards/gate/check-cost.mjs`, a read-only report cutting the trace three ways — per session, per role, per dispatch — with its limits printed in its own header.

Four measurements were taken **before** any of it was designed, and they are recorded in the milestone header rather than inside an item, because two of them kill hypotheses that were on the table.

**What the report says, as a snapshot at this session's close.** Every figure below moves as the corpus grows — the report is reproducible against a *fixed* corpus, not constant over time, and quoting it as a constant is the mistake to avoid.

| role | model | dispatches | finished | turns | result MB |
|---|---|---|---|---|---|
| `orchestrator` | (undeclared) | 59 | **14/59** | 2,398 | **10.19** |
| `implementer` | sonnet | 48 | **21/48** | 1,209 | 1.19 |
| `harness-evaluator` | opus | 7 | 4/7 | 141 | 0.45 |
| `researcher` | sonnet | 10 | 8/10 | 158 | 0.00 † |
| `test-engineer` | sonnet | 3 | **0/3** | 112 | 0.00 ‡ |
| `Explore` | (undeclared) | 5 | **5/5** | 78 | 0.00 ‡ |
| `adversarial-auditor` | opus | 5 | 3/5 | 54 | 0.00 ‡ |

† under-counted: `WebFetch` records ~78 bytes for a whole page. ‡ mostly pre-dates the byte fix.

The orchestrator carries more result bytes than every delegated role combined, several times over, and finishes least often. This session alone (`21861e1c`) is 7.01 MB across 12 dispatches with only 1 delegated — the orchestrator-heavy shape `ADR-009` has to price.

## Decisions

- **The context assembler is a script, not the orchestrator.** The author's instinct was that the orchestrator should gather and assemble all context. The measurement points the other way: the orchestrator already carries **4.42 MB across 2,453 calls — 72% of every byte the harness has ever pulled into a context window** — and it is the actor whose context must survive the whole session. What worked twice on 2026-08-27 was a deterministic script writing an extract to disk, which neither the orchestrator nor the agent ever held in context. `ADR-009` (`TASK 71`) makes that policy. **Rejected:** a Haiku summarizer role, unless it first beats a script on a measured number — both extracts built today cost zero model tokens and are byte-reproducible.

- **No hook registration is removed, and the measurement is the reason rather than caution.** Hooks cost **no tokens**; the tax is ~200 ms per process, two per tool call, ≈29.6 min across 4,445 requests against 497 min of tool execution — about **6% of tool wall-clock**. **93% of that is Node booting** (~145 ms of bare `node -e ""`), not guard code: imports measure 10–12 ms and the 31 KB config parse ~2 ms. So the two per-call hooks are also the two that cannot go — `PreToolUse` *is* every rung-1 boundary, and `PostToolUse` writes the `bytes`/`duration_ms` this milestone measures. **Rejected in advance:** a Node SEA or startup snapshot, which targets the 10–12 ms slice and not the 145 ms boot. **Deferred to a measurement:** excluding the repo and Node from Defender on-access scanning, which is the only large lever and is machine-level rather than a repository change.

- **A fifth register status, `RETIRED`, rather than deleting a merged entry.** Ids are stable and `progress/` plus the scorecards cite them, so a retired entry stays in place carrying a pointer to the id that absorbed it. Verified that no guard parses the status token — `parseWorkItemTypes` reads the **type**, not the status — so a retired item still resolves for `H-05`, which is the property that matters.

- **`TASK 62` → `TASK 64` is a fold on one surface; `TASK 68` → `TASK 65` is a fold on one *property* across two.** Recorded as a difference rather than glossed: `TASK 64`'s four clauses all edit the hook writers, which is the precedent `TASK 12` set. `TASK 65` now spans `evals.mjs` and `procedures.mjs` — two modules, two test files. It holds because each clause is independently checkable and neither closes the other, but it is the boundary of the idiom, and a third checker joining would be `INC-01` rather than a further saving.

- **Three items were deliberately not merged.** `TASK 61` is rung 1 and needs its own red battery; `TASK 63` is the eight-escape finding and the largest single outcome item; `TASK 69` belongs to the site suite, not the harness.

## Findings from validating against real state (P-04)

**`H-05` fails open on a word in a title, and it has for as long as the parser has existed.** Found by checking that the four new entries parse the way the gate reads them — the `P-11` check on a register edit that looked purely editorial.

`parseWorkItemTypes` (`scripts/guards/lib/delegation-gate.mjs:93-97`) captures the **first backticked all-letter token anywhere in the heading**, because `.*?` is lazy and the `i` flag makes `[a-z]+` case-insensitive. Two entries misparse today, both predating this session and both confirmed against `git show HEAD:TASKS.md`: **`TASK 53` reads `version`**, **`TASK 62` reads `L`**.

Proven by running the real function rather than reasoning about it: a heading reading *TASK 99 — Fix the `slug` join · `feature` · `TODO`* parses as type `slug`, and `specRequiredFor` demands **no spec**; strip the backticks from the title and the same item parses as `feature` and the spec **is** demanded. A `feature` escapes `H-05` because of a word in its title — the boundary `INC-05` exists to hold.

**Not yet exploitable, and the entry says so rather than overclaiming (`C-01`):** both live misparses land on types outside `specRequiredFor` (`planning`, `harness`), so no delegation has been wrongly permitted. It is latent, and the trigger is someone writing a natural title. Filed as `TASK 74`, sequenced **before** the measurement work.

**Two measurement gaps in the substrate `TASK 70` depends on**, both found while prototyping it:

1. **`run.header` carries `model` only on `reason: startup`** — 8 of 139 headers; every `reason: delegated` header is `null`. The header does carry `agent`, so the tier joins to the role file's `model:` frontmatter — a derivation, not a record, and a dispatch-time override would be invisible. Filed as `TASK 64` clause 6; `TASK 70` states the limit in the report.
2. **The earliest runs record every result as 0 bytes** — the `tool_result`/`tool_response` bug `evidence.mjs:375` documents in its own comment. This is why `test-engineer` reads 128 calls and 0.00 MB. The report must partition on the fix date, as `EVAL-001` partitioned its scoring, or it will publish a role as free.

**A detail for whoever implements `TASK 74`:** several headings carry a fourth `·`-separated field (`· **ran third**`, `· **runs after the localhost milestone**`), so a positional read cannot count from the end blindly.

**Three defects in my own work that the harness caught and the tests did not.** Worth recording because they are the harness paying, which is the question `EVAL-001` left open:

1. **A `0x00` byte in `scripts/guards/lib/cost.mjs`**, where a space belonged, inside a template literal used as a Map key. Every unit test passed — the key was still unique. `sources.test.mjs` (*"no source file carries a stray control byte"*) failed the `guard tests` step and named the file, the byte and the offset. This is the one gate step whose paired-predicate assertion `TASK 63` wants generalized, and it is the step that earned its keep today.
2. **The first liveness anchor read `evidence/` from a mutation-covered test.** `stryker.config.mjs` sets `ignorePatterns: ['private', 'evidence']` and states its reason — the trace is "machine-written, large, and **no test reads it**". My test made that sentence false, and Stryker failed its dry run rather than the invariant failing silently. The anchor became a fixture transcribed verbatim from the trace, with the regenerating command in the test. This was also the right answer for a second reason nobody was arguing yet: the corpus is pruned by `retainRuns`, so the anchoring run would eventually have vanished and taken the test with it (`P-16`).
3. **`countTurns` counted a phantom turn on any resumed dispatch.** A `run.header` can land between a request and its result, so the next segment *begins* with an orphaned result belonging to the previous one; pairing that with the following request read every resumed dispatch one turn too high. Found by writing a test for an edge the corpus had shown me (`budget-probe`'s two segments encode as `q` then `.rq.r`) rather than by inspection.

**The `budget-probe` anchor was unsound and was dropped rather than kept because it was green.** Its two segments are split across a header boundary, so they measure a split and not a cap — the assertion passed for the wrong reason. `researcher`'s 12/25 pair is the only clean anchor in the corpus, and it is now the only one asserted.

**`C-09` claims a rung its guard does not reach — found in the working tree, not by reading the rule.** `git status` showed `resources/site/about.es.md` and `experience.es.md` modified by the author with their English counterparts untouched, and `check-content` **passed**: 20 files, 9 locale pairs. The check asserts the pair exists and shares a `slug` — the structural half — while `C-09` claims rung 2 for the whole rule, including *"never modify one locale without modifying the other in the same change"*. The two locales now carry different `title:` values and `h1`s that are different statements rather than translations. Filed as `TASK 75`, which owns the **guard**; the copy is the author's under `H-02` and nothing here touched it.

## Done

```yaml
done:
  scope:      { status: passed, evidence: ["TASK 74 and TASK 70 closed; TASK 71/72/73 opened and sequenced", "register consolidated: TASK 62 retired into TASK 64, TASK 68 into TASK 65, both in place with pointers — no id reused or renumbered (G-10)", "resources/, evidence/, private/ and git untouched; no rule file edited"] }
  tests:      { status: passed, evidence: ["node --test scripts/guards/lib/cost.test.mjs — 18 pass, 0 fail", "node --test scripts/guards/lib/delegation-gate.test.mjs — 36 pass, 0 fail (7 new)", "TDD: both batteries written red first — 6 of 7 delegation-gate tests failed before the fix, and cost.test.mjs failed on a missing module"] }
  red_path:   { status: passed, evidence: ["delegation-gate: neutering the positional read fails 3 tests (36 -> 33 pass)", "cost: neutering the turn counter and the byte sum fails 5 tests (18 -> 13 pass)", "P-14 — a guard seen only to pass has not been tested"] }
  self_audit: { status: passed, evidence: ["three defects in this session's own code were caught by the harness rather than by its author: a 0x00 byte in cost.mjs that every unit test passed over (sources.test.mjs named the file, byte and offset); a liveness test reading evidence/ from inside the mutation-covered surface, which Stryker's dry run rejected and which would also have died to retainRuns pruning; and a phantom turn on every resumed dispatch", "the budget-probe anchor was dropped for being green-for-the-wrong-reason: its segments split across a header boundary and measure a split, not a cap"] }
  evidence:   { status: passed, evidence: ["parser change verified against the WHOLE register, not the two known cases: 75 items before and after, none lost, none gained, exactly two corrected", "the turn method anchored at both ends of its scale: researcher 12/25 against a cap of 25, budget-probe 1/2 against a cap of 2", "check-cost byte-identical across consecutive runs (cmp)"] }
  loose_ends: { status: passed, evidence: ["the H-05 fail-open became TASK 74 rather than a paragraph (P-06)", "the model-null-on-delegated-headers gap became TASK 64 clause 6", "the WebFetch under-count is stated in the report header and constrains ADR-009 decision 1", "the C-09 rung overclaim became TASK 75, found in the working tree rather than by reading the rule"] }
  docs:       { status: passed, evidence: ["node scripts/guards/gate/check-docs.mjs — PASS, 60 living documents, 241 path references resolved", "the type table reconciled: `documentation` was used by TASK 67 and absent from it (P-07)", "TASK 70's own done clause corrected where it named the wrong specimen (C-02)"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 19 of 20 steps PASS", "guard tests 682/682; mutation 75.83 vs a 74.5 floor; e2e smoke PASS"], reason: "`procedures` is red on exactly one file and it is the known, tracked one: progress/2026-08-27-13-eval001-workitem-extract.md is generated tool output carrying no done block, which is TASK 65 clause 2 (absorbed from TASK 68, with the three wrong fixes recorded). Declared here rather than left as background noise — TASK 34's lesson. `e2e smoke` PASSED on two of three full runs this session and failed one on the same Firefox /about navigation; that is TASK 69, whose entry already records it as load-dependent, and no file under site/ was touched here" }
  mutation:   { status: passed, evidence: ["npx stryker run — final mutation score 75.83, against the break threshold of 74.5", "cost.mjs and delegation-gate.mjs are both inside the mutation-covered surface (D3: scripts/guards/lib/**), so the new code was mutated rather than sitting beside the gate", "the score ROSE: 74.74 measured on 2026-08-25, 75.83 now. TASK 38 owns the ratchet, so the floor is not moved here"] }
  content:    { status: not_applicable, reason: "harness work — resources/** untouched, and H-02 guarantees it rather than trusting the claim" }
  ci:         { status: not_applicable, reason: "no remote exists yet (TASK 30); .github/workflows/harness.yml is inert until one does (T-10)" }
  iterations: { status: passed, evidence: ["3"], note: "the plan checkpoint, the TASK 74 red/green cycle, and the TASK 70 cycle including one corrected liveness anchor" }
```
