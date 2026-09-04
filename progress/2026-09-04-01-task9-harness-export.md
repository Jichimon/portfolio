# 2026-09-04 · Session 01 — TASK 9: the harness export, as two portable bootstraps

**Task:** TASK 9 — Harness export v2
**Status after this session:** DONE

## What was done

Wrote the export as two self-contained bootstraps under `docs/harness/export/` — one for Claude Code, one for OpenCode — sharing a byte-identical core, plus `check-export` and its red battery to keep them identical. Opened `TASK 119` for a pre-existing red gate step found on the way.

## Decisions

- **The export ships as two documents, one per agent tool, not one.** The author runs Claude Code on one target project and OpenCode on the other. A single document would have to hedge every control-plane sentence into "depending on your tool", and the control plane is the half that decides whether a rule is a boundary or a preference (`G-03`). Two documents sharing a byte-identical core keeps each one able to say *this* is how *your* tool denies a version-control write.
- **The trigger was waived, in writing, at A3.** `TASK 9`'s entry blocks it on *the first `EVAL` with a real, non-harness workload* — `TASK 100`, still open. The author authorized proceeding. Why it does not contradict the entry's own reasoning: installing the harness on those two projects **is** the workload `TASK 100` names, so the export is the vehicle by which that trigger can fire rather than an advance on it. The export is marked **v1** and says so on its own first screen; what the two installs teach comes back as an amendment with a measured origin. Recorded rather than assumed, because an unrecorded deviation is indistinguishable from a violation when an evaluator reads this later (`G-01`).
- **The gate travels, though it was not among the layers the author selected.** The author chose the control plane, the evidence trace and the evaluation layer, and did not select the gate. The three selected layers are each read by a gate step — `check-settings`, `check-trace`, `check-evals` — so exporting them without the gate ships three layers nobody verifies, which is a rung-4 export wearing a rung-2 label. Raised at the plan and approved. It travels **thin**: §18 carries the one-command shape, the profiles, `protects` + `redProof` + a time bound per step, and §19 the guard-design properties. This repository's twenty-three steps do not travel; they are about this stack.
- **Ids are not renumbered on export.** A rule that does not travel leaves a visible gap with a one-line reason (`G-10`, invariant 2). A clean `C-01`…`C-08` in the target would silently break every citation in this repository's `progress/` and in the target's own future logs. Seven `C-*` rows and two `S-*` rows are named as not-exported, each with its reason.
- **Anti-drift is a check, not a generator.** Two committed files kept identical by `check-export` was chosen over a build step. The trade-off, stated in both directions (`C-11`): a generator is conceptually cleaner and removes the copy step entirely, and it is a build artifact nobody reads plus a staleness check of its own — more machinery than the property is worth at two files. The guard derives its file set from the directory, so a third bootstrap is covered by existing.
- **`INC-09`, `INC-10` and `INC-11` are generalized in the export, not dropped.** They are transcribed as documentation-integrity incidents — a target published as an outcome, a design described as an implementation, a generated asset accepted as final — with no case-study names. Their rules (`C-01`, `C-02`, `C-03`, `P-15`) are among the most portable in the registry, and a rule whose origin did not travel is ceremony on arrival (`G-10`).

## Findings from validating against real state (P-04)

- **`check-docs` constrains how the export documents may be written, and this was found before writing rather than after.** It treats every non-dated `.md` under `docs/` as a living document and requires every path it claims to resolve; `extractRefs` counts any backticked token carrying a known extension and a directory separator. The bootstraps are full of *target-project* paths that do not exist here. The authoring discipline that resolves it: **target paths live inside fenced blocks or carry a placeholder**, both of which the extractor skips. It worked — `check-docs` passes with no exclusion entry added, so the guard keeps checking the parts that really are claims about this repository. The fallback (a reasoned entry in `docs.exclude`) was not needed and is not used.
- **OpenCode reads `.claude/skills/<name>/SKILL.md` natively.** Checked against its own documentation rather than assumed. So the three procedures are one set of files serving both bootstraps and cannot drift between them; the OpenCode appendix says to keep them there for exactly that reason.
- **OpenCode has no path-scoped rule loading, no documented equivalent of pinning a permission-bypassing mode closed, and possibly no instructions-loaded event.** Three real capability gaps against the Claude Code half. Its prelude names all three with the honest response rather than a workaround — including that the context-load indicator is reported `unmeasurable` if no event exists, which is `C-01` applied to the harness's own numbers. This is the clearest instance in the whole item of `G-07`: the sibling documents must not make the same enforcement claim when the environments differ.
- **A fourth OpenCode unknown could not be settled from documentation and is handed over as a measurement, not a guess:** whether the plugin's before-execute hook runs before or after the permission map. The appendix says to install both halves until it is observed, and its smoke test has a line whose whole job is to record which mechanism refused. Writing a confident answer here would have been the `C-02` failure one level up.
- **The `design canvas` gate step is red on the committed tree**, and has been. `derive.mjs` throws on six testimonial and quote-mark fragments the artboard no longer carries. The canvas sources are unmodified against `HEAD`, so this is not this item's doing. **The finding that outlasts the fix**: at least one work item closed against a gate already failing this step, and nobody tracked it until an unrelated item ran the full gate. Opened as `TASK 119`.
- **`T-03` was applied to this item’s own module only after the item first broke it.** The new module entered the mutated surface at **84.87% with 18 survivors**, and the first report of that reading was *"the surface rose"* — a module-level finding averaged into a repository-level statistic, which is precisely the move `T-03` forbids, made by the session that had just transcribed `T-03` into an export document. **What the survivors named was a defect in the battery, not in the code**: every assertion about the reported byte offset matched `at byte <digits>`, which passes for any integer a broken scan produces, so the entire scan loop was alive behind it — `T-02` one level down. Six tests asserting exact offsets and two covering untested branches took the module to **100%, zero survivors, zero uncovered**, with three suppressions each carrying a written reachability argument rather than a shrug. **The generalizable half, recorded in `T-03`:** a rising repository score is the least informative number in a mutation run.
- **The repository score is 80.49% against a floor of 79.0, and the floor was deliberately not turned** — two tenths against a timeout count that has varied by tens across runs would trade the 1.11 of slack `TASK 114` chose on purpose for 0.81, on no new information. Recorded in `T-03` rather than skipped, because a row naming a stale measurement is `P-07` in the document that defines the rung.
- **The full gate was run through a pipe, and the pipe ate the per-step output.** The run reported an exit code of 0 that belonged to `tail`, not to the gate, which actually failed. This is `INC-18`'s own lesson committed by the session reading about it: an instrument that only reports at the end cannot distinguish a hang from a slow run, and one that reports somebody else's exit code cannot distinguish a pass from a failure. The mutation score had to be re-measured separately because of it.
- **`TASKS.md` and the other living documents are CRLF.** Cost two failed edits before it was diagnosed — `cat -A` did not show the carriage returns and a byte-level read did. Noted because every scripted edit to this repository's markdown has to match `\r\n` or silently find no anchor.

## Done

```yaml
done:
  tests:           { status: passed,  evidence: ["node --test scripts/guards/lib/export-parity.test.mjs", "23 pass 0 fail"] }
  mutation:        { status: passed,  evidence: ["npx stryker run", "export-parity.mjs 100%, 0 survivors, 0 uncovered", "repo 80.49% vs break 79.0", "floor NOT moved — reason in T-03"] }
  gate:            { status: partial, evidence: ["node scripts/gate.mjs --profile full", "22/23 pass, 0 deferred", "FAIL design canvas — red at HEAD before this item, tracked as TASK 119"] }
  docs:            { status: passed,  evidence: ["CLAUDE.md layout + knowledge table", "README.md pointers", "architecture.md section H", "docs/harness/export/README.md"] }
  scope:           { status: passed,  evidence: ["docs/harness/export/", "3 files", "check-export exit:0"] }
  loose_ends:      { status: passed,  evidence: ["TASK 119"] }
  iterations:      { status: passed,  evidence: ["2"] }
  iteration_split: { status: passed,  evidence: ["checkpoint=1", "verify=1"] }
```

## Open questions

- **Which target project gets which tool**, and whether either has an existing harness to compare against. §20's five-verdict matrix is written for that comparison and has not been used on a real one. Carried into `TASK 100` rather than left here.

## Next

`TASK 100` — install one of these on a target project and drive one real work item through it. That is the measurement `TASK 9` was blocked on, and the export exists to make it cheap. The findings come back as amendments with a measured origin, which is what turns this from v1 into something that carries what worked.

## Files changed

`docs/harness/export/README.md` — the index: what the two documents are, what travels, how they are maintained.
`docs/harness/export/HARNESS-BOOTSTRAP.claude-code.md` — prelude + shared core + Claude Code install.
`docs/harness/export/HARNESS-BOOTSTRAP.opencode.md` — prelude + shared core + OpenCode install.
`scripts/guards/lib/export-parity.mjs` — the pure check: one marker pair per document, cores byte-identical, file set derived from the directory.
`scripts/guards/lib/export-parity.test.mjs` — its red battery, 23 cases, offsets asserted exactly.
`scripts/guards/gate/check-export.mjs` — the thin CLI.
`scripts/guards/guards.config.json` — the `export` section, with its rationale.
`scripts/gate.mjs` — the `export parity` step, with `protects` and `redProof`.
`TASKS.md` — TASK 9 amended and moved to IN PROGRESS with the A3 waiver recorded; TASK 119 opened.
`CLAUDE.md` · `README.md` · `docs/harness/architecture.md` — reconciled to point at the export.
`.claude/rules/30-testing.md` — `T-03` records the 80.49% re-measurement, why the floor did not move, and what the module-level reading hid.
`progress/handoff/2026-09-04-task100.md` — the packet for the next session.

## Closed

**2026-09-04, by the author.** `TASK 9` set to `DONE` on the author's word, which is the only thing that sets a work-item status (`wrap-up` §1). The goal-alignment triage was reconciled in the same pass — its Goal 2 row still read *"`TASK 9` (blocked)"*, and an index row contradicting the entry it points at is `P-07`'s characteristic failure, done in the document that defines it.
