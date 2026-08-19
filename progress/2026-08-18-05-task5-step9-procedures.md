# 2026-08-18 · Session 05 — TASK 5, step 9: the procedures

**Task:** TASK 5 — AI Agent Development Harness v2
**Status after this session:** IN PROGRESS (steps 1–9 done, step 10 next)

## What was done

Three procedures — `work-item`, `wrap-up`, `evaluate-harness` — and the guard that keeps them from being decoration. Tests 247 → 267, gate to ten steps, contracts to **3 fully enforced, 2 partial, 1 pending**.

The step's real deliverable is not the prose. It is that `done` stopped being a convention in a template and became a condition of the gate, which is what closes the Evidence Contract's outstanding half.

## Decisions

- **All three procedures are `disable-model-invocation: true`.** A router the model can trigger on its own turns "no procedure for a typo" into a suggestion, and ceremony applied to a one-line fix is exactly how procedures get abandoned. The router table is always loaded, so the model can *say* a procedure applies; starting one stays a deliberate act.
- **`wrap-up` grants only `Read Grep Glob`.** `allowed-tools` is a permission *grant* — it pre-approves without asking — so it is the one frontmatter field in this harness that moves in the permissive direction. Reads are safe to pre-approve; a shell is not, and the procedure never needs one.
- **`passed` is the only status that requires evidence**, because it is the only one making a positive claim. `not_applicable` requires a reason instead — the dimension is declared out loud, since silence reads as coverage. `blocked`, `failed` and `partial` are legitimate outcomes needing either. The vocabulary is closed, so a status nobody defined fails rather than passing as prose.
- **The pointer-versus-sentence half is left unmechanized, and says so.** "gate-run exit:0" and "we ran the gate and it was fine" are both non-empty; only a reader can tell them apart. Claiming to check it would be a false 🔒 on the check whose whole purpose is to stop false claims.
- **Logs predating the convention are not retroactively required to carry a block.** Demanding one would force either inventing evidence for finished work — which `C-01`'s logic forbids — or an exclusion roster of filenames, which is `INC-07`'s shape. A dated threshold in `guards.config.json` with a written reason is neither, and a *new* log cannot slip through it.
- **The router is checked in both directions.** A router naming a procedure nobody wrote is `INC-08` in the process layer. A skill nobody routes to is the mirror image and just as worth knowing, because the router is where someone looks for it.

## Findings from validating against real state (P-04)

- **The router parser swept the whole file and invented two requirements.** It demanded skills called `version` and `status`, because the `P-*` rules table's rule column is full of backticked words and the parser matched every table in `10-process.md`. Scoped to the router *section*, and to its action column only — the situation column carries work-item types, so a single-column parser would have demanded a skill named `feature`.

  Both narrowings were earned by a failure rather than anticipated, and both matter for the same reason: a guard that invents requirements gets deleted, and then it catches nothing.

- **`progress/README.md` failed the check, correctly.** It carries the done-block *template*, whose `<dimension>` placeholders are not dimensions. The fix is a property — a work log is a dated file — not a list of files to skip.

- **3/3 mutants caught** on the real artifacts: a `passed` dimension emptied of evidence, a `not_applicable` stripped of its reason, and a router row pointed at a procedure that does not exist.

- **The quoted-content false positive fired twice more**, once on a `Remove-Item` instruction being written *into a document*, and once on a string being substituted into a log. Both were text about commands, not commands. That is five occurrences in a day, now six and seven. `TASK 10` already carries the fix with the human's approval.

## A naming defect, found by being asked

The author asked what the difference was between `evals/` and `progress/evaluations/` and why both existed. The split turned out to be right and the labels wrong.

**The split is structural, not stylistic.** An eval case is the *input* — executable, stable, retired with a date and never deleted, and it travels with the harness when TASK 9 exports it. A scorecard is the *output* — one per evaluation, compared against the baseline and the previous one, and it is this repository's history rather than the harness's. They are a test definition and a test report.

**And the rung-1 boundary runs exactly between them.** `harness-evaluator` may write a scorecard and is denied writing an eval case — proven again after the rename. An evaluator that could author the cases it is measured against produces a number about nothing. Had the two lived in one directory, the write scope could not have separated them, and the boundary would not exist.

**The names, though, were near-synonyms.** `evals` and `evaluations` carry none of that distinction, which is why the question had to be asked at all — the same test that retired `docs/templates/` at step 3: if the name needs explaining, the name is the defect. Renamed to `evaluation-cases/` and `progress/evaluation-results/`, so *cases → results* reads without any documentation.

Nine files updated, one stale test assertion caught by the suite. **Historical logs were left as written** — they cite the old paths because that is what existed when they were written, and rewriting a log is falsifying a record rather than reconciling a document.

## The rename's real finding: thirteen references to documents that were never written

Asked to make sure the rename broke nothing, a sweep over every path cited in a live document turned up something older and worse than anything the rename could have caused.

**`architecture.md` cited `procedures.md` and `metrics.md` thirteen times. Neither has ever existed.** They were destinations in the KEEP/MODIFY matrix — *this inherited element lands there* — and the build put the content somewhere else without the matrix ever being reconciled:

- the spec checkpoint, the pre-implementation checklist and done-as-conjunction landed in `.claude/skills/work-item/` and `.claude/skills/wrap-up/` at step 9;
- the KPI split, the K1–K4 set and the substrate rule landed in `EVAL-TEMPLATE.md`'s KPI table;
- `InstructionsLoaded` as observable proof landed in `evidence.md` as the `instructions.loaded` event;
- the visual-QA checklist is deferred, and §M is where deferrals live.

Every row now names where the content actually is. Two of them read *better* than the original plan, because the destination turned out to be enforced rather than documented: "not applicable, said out loud" is not prose in a workflow document, it is a `not_applicable` with no reason failing the gate.

Also corrected: `hooks/delegation-gate.mjs` (the guard lives in `lib/`, dispatched from the single entry point) and a relative `lib/evidence.mjs`.

**This is `P-07` failing in the document that defines `P-07`.** Reconciling and checking you reconciled are different acts; the second never happened for this matrix because nothing checks it. Roles' bootstrap paths are checked by `check-agents` and templates' `instances:` by `check-templates` — architecture prose is checked by nobody. **A gate step that resolves every path cited in a live document belongs in step 10**, and its design constraint is already known: three of the seven hits in the first sweep were prose fragments like `home.en/es.md`, so it has to distinguish a path from a naming convention or it will be the next guard someone turns off.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test scripts/guards/**/*.test.mjs", "267 pass 0 fail", "3/3 procedure mutants caught"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs", "exit:0, 10 steps green"] }
  content:    { status: passed, evidence: ["check-terms.mjs", "exit:0"] }
  docs:       { status: passed, evidence: ["contracts.md Evidence row built, 3/2/1", "TASKS.md step 9", "evaluation-cases/ + progress/evaluation-results/ rename, 9 files"] }
  procedures: { status: passed, evidence: ["check-procedures.mjs", "router: 3 resolved both ways", "4 done blocks validated"] }
  ci:         { status: not_applicable, reason: "no remote exists — step 10 writes the workflow and it stays inert" }
  security:   { status: not_applicable, reason: "no new boundary, no new tool grant beyond Read/Grep/Glob on one skill" }
```

## Open questions

- **None of the three procedures has been run.** They are prose plus a guard over their artifacts; whether the flow they describe is the right one is answered by TASK 7, the first real work item through the harness. This is the same gap step 8 left, and it closes at the same moment.
- **`allowed-tools` clears at the next message.** Whether that interacts badly with a multi-turn procedure like `work-item` is untested — `work-item` grants nothing, so nothing is at risk today.

## Next

**Step 10 — Gate + CI.** The gate already exists and has grown to ten steps; step 10 is the CI workflow with **no path filter** (`INC-08`: two path-filtered workflows meant a repo-root guard ran in CI exactly zero times, invisibly), plus the honest note that it stays inert until a remote exists.

Then **TASK 10** — the human approved both fixes, scheduled before step 11 so the eval cases are not written against a guard with a known false positive.

## Files changed

`.claude/skills/{work-item,wrap-up,evaluate-harness}/SKILL.md` — new; three procedures.
`scripts/guards/lib/procedures.mjs` + tests — new; router resolution and done-block validation, 20 tests.
`scripts/guards/gate/check-procedures.mjs` — new; step 9's acceptance check.
`scripts/gate.mjs` — the tenth step.
`scripts/guards/guards.config.json` — `procedures.doneBlockRequiredFrom` with its rationale.
`docs/harness/contracts.md` — Evidence row `built`; ratio now 3/2/1.
`TASKS.md` — step 9 closed.
`evals/` → `evaluation-cases/` and `progress/evaluations/` → `progress/evaluation-results/` — with `harness-evaluator.md`, `evaluate-harness/SKILL.md`, `CLAUDE.md`, `architecture.md`, both templates, `guards.config.json` and two test files updated to follow.
