# 2026-08-27 · Session 12 — milestone prep: reconcile `TASK 27`, open `TASK 60`, build the `EVAL-001` trace index

**Task:** Session 0 of the plan to close THE LOCALHOST MILESTONE and `TASK 27` — reconcile a contradiction in `TASKS.md`, open the work item `EVAL-001` needs to be delegated against, and build the trace index that lets `harness-evaluator` run inside its 60-turn budget. No code, no delegation — this session's whole scope.
**Status after this session:** the three deliverables below are done; `EVAL-001` itself and `TASK 27` are unstarted, to run in later sessions.

## What was done

1. **Reconciled `TASKS.md`.** The milestone's own text required every `TASK 27` fidelity diff to be green, while the backlog table placed the whole item *behind* the milestone — unreachable by construction. Split `TASK 27` into its local+design legs (moved above the milestone) and its prod leg (stays behind `TASK 32`, exactly as already designed with a declared `skipped`). Updated `TASK 27`'s own header from "runs before the page items" (stale since the item moved on 2026-08-24) to "runs before the milestone."
2. **Opened `TASK 60`.** `harness-evaluator` holds `Write`, so `H-05`'s `delegation-gate` will deny any delegation to it whose brief names no work item — and nothing in the register covered "run the harness evaluation." `TASK 60` is that id, typed `harness` so no spec is required.
3. **Built this trace index** (below), reproducible from `progress/2026-08-27-12-build-trace-index.mjs`, so `TASK 60`'s delegation brief can hand `harness-evaluator` a precomputed extract instead of an unbounded read across 104 trace files — the reading half of `P-09`, measured by `TASK 55` at 3/3 slices surviving on a pre-written extract against 0/1 on "go read the sources."

Verified both edits parse correctly: `parseWorkItemTypes` reads `TASK-60 → harness` and `TASK-27 → harness`, and `node scripts/guards/gate/check-rules-registry.mjs` / `check-docs.mjs` both pass against the edited `TASKS.md`.

## The trace index

**Not a scorecard.** This is tool output (`D2`), generated to let `harness-evaluator` avoid
reading 104 trace files exhaustively when 60 turns are its whole budget (`P-09`'s reading
half: *"a brief that hands over the extract has not handed over an unbounded read"*, and
`TASK 55` measured 3 of 3 slices surviving on pre-written extracts against 0 of 1 on a
"go read the sources" brief). Every row below carries an exact pointer so the evaluator can
verify any of it with a targeted `Grep` rather than trust it (`P-11`).

**Reproduce this file** with:

```
node progress/2026-08-27-12-build-trace-index.mjs   # walks evidence/runs/**/*.jsonl, read-only, no writes
```

The script that produced it: reads every `.jsonl` under `evidence/runs/`, and for each file
extracts `run.header` occurrences (seq, agent, `permission_mode`), `run.footer` occurrences
(count, `termination`), the last `seq` seen, and every `policy.decision` with
`decision:"deny"`. It does not interpret any of this — counting and pointing is all it does.

## Corpus size, measured

| | count |
|---|---|
| run directories under `evidence/runs/` | 35 |
| `.jsonl` trace files | 104 |
| `run.header` events | 176 |
| `run.footer` events | 106 |
| `policy.decision` with `decision:"deny"` | 40 |
| `instructions.loaded` events | 332, **all 332 in `orchestrator.jsonl` files — zero in any delegated (non-orchestrator) trace** |

## Three anomalies found by running the index, not assumed

**1 · The synthetic fixture directories `EVAL-000` excluded no longer exist on disk.**
`EVAL-000`'s scope section declared `evidence/runs/rn/`, `evidence/runs/rn2/`,
`evidence/runs/sep/` and `evidence/runs/unknown/` excluded (`GAP-06`, `GAP-07`) because `H-03`
forbids deleting them by any vector available to an agent. None of the four appear in the
current `evidence/runs/` listing. **This is reported, not acted on** — a human, not any agent
in this harness, would have had to remove them, and confirming that is outside this index's
job. If `EVAL-001` finds the same, the two `GAP` rows they describe should be marked resolved
rather than re-declared.

**2 · `L` (context load) is still 0/0 for the delegated path, unchanged since `EVAL-000`.**
Every one of the 332 `instructions.loaded` events sits in an `orchestrator.jsonl` file, across
34 distinct orchestrator traces. Not one delegated run — `implementer`, `test-engineer`,
`researcher`, `adversarial-auditor`, `harness-evaluator`, `Explore`, `budget-probe` — carries a
single one, in any of the 70 delegated trace files. `EVAL-000` named this gap on the delegated
path specifically; sixty delegated runs later, it is exactly as unmeasured as it was then.

**3 · A second footer-only orphan, same shape as `EVAL-000`'s `GAP-08`.**
`evidence/runs/b6218083-34c2-4cdf-b8f5-b59a827cdfde/unknown-role-aeb35e8a584709486.jsonl`
carries exactly two events — a `run.header` at `seq:1` (`agent:"unknown-role"`,
`permission_mode:"plan"`) and a `run.footer` at `seq:2` (`COMPLETE/objective_reported`) —
and nothing else. `EVAL-000`'s `GAP-08` was a run that "reports an objective without a header
or a single tool call" and could not be scored; this one has a header but the same absence of
any tool call. Whether this is the same defect recurring or a new one is for `EVAL-001` to
decide, not this index.

## Posture observed, not inferred

Confirms `9` headers (of 176) carry a real `permission_mode` rather than `unknown` — `5`
sessions show `auto` at some point in their trace, `4` show `plan`, and the remaining headers
across all files read `unknown`. This is the deliverable of the posture-header slice closed
2026-08-27 (see `progress/2026-08-27-06-task12-slice5-posture-header.md`): before that slice,
118 of 118 headers on disk read `unknown`; this corpus (captured after it landed) is the first
with any real observed value at all. No run in the corpus shows `bypassPermissions`.

## An event-schema variant worth flagging, not resolving here

Deny row 14 below (`53898bfe.../implementer-a7f9923142c6f74c6.jsonl:94`) carries
`rule:"settings.deny"`, `guard:"permission-engine"`, and no `tool_name` field — the command it
denied lives under `target.command` instead. This is a different decision shape than the
guard-produced denials (which carry `tool_name` and a `rule` id like `H-02`), and the index's
extraction script left its tool/reason columns blank rather than guess. The pointer is exact;
`Grep` it directly if it matters to a KPI.

## Per-file index

| run dir | file | agent | excluded | header seq(s) | permission_mode | footer | termination | events | denies |
|---|---|---|---|---|---|---|---|---|---|
| `0ad34041-120d-4c1c-8af3-3cece3bf1081` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | ×1 | COMPLETE/other | 7 | 0 |
| `17db4bf1-702e-43ba-9e46-43c37c128aaa` | `-a7752c22c8902b6b7.jsonl` | -a7752c22c8902b6b7 | no | — | — | ×1 | COMPLETE/objective_reported | 1 | 0 |
| `17db4bf1-702e-43ba-9e46-43c37c128aaa` | `implementer-a3a18d174aa9162b9.jsonl` | implementer | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 26 | 0 |
| `17db4bf1-702e-43ba-9e46-43c37c128aaa` | `implementer-a99ebc7e188b7c917.jsonl` | implementer | no | 1 | unknown (unknown) | NONE | — | 91 | 0 |
| `17db4bf1-702e-43ba-9e46-43c37c128aaa` | `implementer-abaabad486dbb1eea.jsonl` | implementer | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 38 | 0 |
| `17db4bf1-702e-43ba-9e46-43c37c128aaa` | `orchestrator.jsonl` | orchestrator | no | 1, 494 (×2) | unknown (unknown) | NONE | — | 896 | 2 |
| `17db4bf1-702e-43ba-9e46-43c37c128aaa` | `test-engineer-a56c7d65c0aacc21a.jsonl` | test-engineer | no | 1 | unknown (unknown) | NONE | — | 115 | 0 |
| `23050ada-4964-4e4a-b5fe-197026a612d7` | `orchestrator.jsonl` | orchestrator | no | 1, 104 (×3) | unknown (unknown,plan,auto) | NONE | — | 313 | 2 |
| `26d0a4d6-35df-473c-b878-de6389cbf81c` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | ×1 | COMPLETE/other | 7 | 0 |
| `2760bdea-e954-4832-b787-2b9a93b959a7` | `implementer-a1fadaa54fe67f59b.jsonl` | implementer | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 41 | 0 |
| `2760bdea-e954-4832-b787-2b9a93b959a7` | `implementer-a3d1e7efda79b6849.jsonl` | implementer | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 77 | 0 |
| `2760bdea-e954-4832-b787-2b9a93b959a7` | `implementer-a6130dbf7e76eab90.jsonl` | implementer | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 53 | 0 |
| `2760bdea-e954-4832-b787-2b9a93b959a7` | `orchestrator.jsonl` | orchestrator | no | 1, 298 (×2) | unknown (unknown) | NONE | — | 298 | 3 |
| `2760bdea-e954-4832-b787-2b9a93b959a7` | `test-engineer-a2dc10f799a2bcc3f.jsonl` | test-engineer | no | 1 | unknown (unknown) | NONE | — | 151 | 0 |
| `2ac4fd9f-d33b-4c7b-b982-6681cb7dfee0` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | ×1 | COMPLETE/other | 7 | 0 |
| `2b631645-bc5f-47a4-abaa-1712448331d5` | `-aaa9d96eb5a76d81b.jsonl` | -aaa9d96eb5a76d81b | no | — | — | ×1 | COMPLETE/objective_reported | 1 | 0 |
| `2b631645-bc5f-47a4-abaa-1712448331d5` | `orchestrator.jsonl` | orchestrator | no | 1, 277 (×2) | unknown (unknown) | NONE | — | 472 | 4 |
| `2f992e48-e080-4d12-805f-f362bf54cf5d` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | NONE | — | 6 | 0 |
| `2fc08374-7dee-478d-8ba2-f77c99c8ffd9` | `orchestrator.jsonl` | orchestrator | no | — | — | NONE | — | 6 | 0 |
| `32bc8893-ecbc-4ed2-831b-04fb93182220` | `adversarial-auditor-a36657bcbff330f70.jsonl` | adversarial-auditor | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 14 | 0 |
| `32bc8893-ecbc-4ed2-831b-04fb93182220` | `adversarial-auditor-aa6d36cb107cf88aa.jsonl` | adversarial-auditor | no | 1, 89 (×2) | unknown (unknown) | ×1 | COMPLETE/objective_reported | 90 | 0 |
| `32bc8893-ecbc-4ed2-831b-04fb93182220` | `adversarial-auditor-aab270189d54aa26a.jsonl` | adversarial-auditor | no | 1, 86 (×2) | unknown (unknown) | ×1 | COMPLETE/objective_reported | 87 | 0 |
| `32bc8893-ecbc-4ed2-831b-04fb93182220` | `implementer-aac6d1982a132cc62.jsonl` | implementer | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 92 | 0 |
| `32bc8893-ecbc-4ed2-831b-04fb93182220` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | NONE | — | 445 | 2 |
| `4027a446-91c7-4410-ad28-b2f6cd47c5ec` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | ×1 | COMPLETE/other | 7 | 0 |
| `53898bfe-6d4b-4689-a93c-86900c09c619` | `budget-probe-a213151a3f10616f9.jsonl` | budget-probe | no | 1, 3 (×2) | unknown (unknown,auto) | NONE | — | 8 | 0 |
| `53898bfe-6d4b-4689-a93c-86900c09c619` | `implementer-a6449afc2c77c98e2.jsonl` | implementer | no | 1 | unknown (unknown) | NONE | — | 100 | 0 |
| `53898bfe-6d4b-4689-a93c-86900c09c619` | `implementer-a7f9923142c6f74c6.jsonl` | implementer | no | 1 | unknown (unknown) | NONE | — | 115 | 1 |
| `53898bfe-6d4b-4689-a93c-86900c09c619` | `implementer-aaa32ebc073b854e7.jsonl` | implementer | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 56 | 0 |
| `53898bfe-6d4b-4689-a93c-86900c09c619` | `implementer-ac573af4adfa6f2e1.jsonl` | implementer | no | 1, 3 (×2) | unknown (unknown,auto) | NONE | — | 143 | 0 |
| `53898bfe-6d4b-4689-a93c-86900c09c619` | `implementer-acf5a3746100a184a.jsonl` | implementer | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 68 | 0 |
| `53898bfe-6d4b-4689-a93c-86900c09c619` | `implementer-ae42915c32a73f377.jsonl` | implementer | no | 1, 70 (×2) | unknown (unknown,auto) | NONE | — | 92 | 0 |
| `53898bfe-6d4b-4689-a93c-86900c09c619` | `orchestrator.jsonl` | orchestrator | no | 1, 267 (×2) | unknown (unknown,auto) | NONE | — | 449 | 0 |
| `53898bfe-6d4b-4689-a93c-86900c09c619` | `researcher-a3c611a937e8d1a35.jsonl` | researcher | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 38 | 0 |
| `53898bfe-6d4b-4689-a93c-86900c09c619` | `researcher-ad61d65a67c3ce435.jsonl` | researcher | no | 1 | unknown (unknown) | NONE | — | 76 | 0 |
| `53c017fc-ae20-4ac8-b5ca-406872de8b5b` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | NONE | — | 6 | 0 |
| `56e9413b-2c34-4eeb-8dba-21c8df5aa62e` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | ×1 | COMPLETE/other | 7 | 0 |
| `5751ce4c-d1e6-4e94-ba07-522038d27915` | `-a15f3760a1780e3e0.jsonl` | -a15f3760a1780e3e0 | no | — | — | ×1 | COMPLETE/objective_reported | 1 | 0 |
| `5751ce4c-d1e6-4e94-ba07-522038d27915` | `harness-evaluator-ad60736a83d99e98a.jsonl` | harness-evaluator | no | 1, 109 (×2) | unknown (unknown) | ×1 | COMPLETE/objective_reported | 125 | 1 |
| `5751ce4c-d1e6-4e94-ba07-522038d27915` | `harness-evaluator-ae218871eb315b93b.jsonl` | harness-evaluator | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 95 | 0 |
| `5751ce4c-d1e6-4e94-ba07-522038d27915` | `harness-evaluator-aeff13603a9732beb.jsonl` | harness-evaluator | no | 1, 116 (×2) | unknown (unknown) | ×1 | COMPLETE/objective_reported | 133 | 2 |
| `5751ce4c-d1e6-4e94-ba07-522038d27915` | `orchestrator.jsonl` | orchestrator | no | 278 | unknown (unknown) | NONE | — | 938 | 3 |
| `5a10d8af-ee05-465a-bc7f-502b664ef3f1` | `-a11c2beeef0e2dc4a.jsonl` | -a11c2beeef0e2dc4a | no | — | — | ×1 | COMPLETE/objective_reported | 1 | 0 |
| `5a10d8af-ee05-465a-bc7f-502b664ef3f1` | `Explore-af2a80cceb2643c9f.jsonl` | Explore | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 68 | 0 |
| `5a10d8af-ee05-465a-bc7f-502b664ef3f1` | `orchestrator.jsonl` | orchestrator | no | 1, 118 (×2) | unknown (unknown) | NONE | — | 253 | 5 |
| `6860d153-70d7-4f0b-b3fe-761de6decd00` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | ×1 | COMPLETE/other | 7 | 0 |
| `74c124d6-4b2f-45c1-92da-2868bf4b51cc` | `orchestrator.jsonl` | orchestrator | no | 1, 102 (×3) | unknown (unknown,plan,auto) | NONE | — | 143 | 0 |
| `8578015c-9a1a-4da0-b575-b395770eae9b` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | NONE | — | 6 | 0 |
| `89d0a848-15ab-4566-a21a-7b3f9e9627ac` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | ×1 | COMPLETE/other | 7 | 0 |
| `90f82190-6db7-4a3c-8b7a-fe66b50912a3` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | ×1 | COMPLETE/other | 7 | 0 |
| `935ce3ad-0ee2-4b86-bae6-ed646a84a40f` | `Explore-a02f6990008172660.jsonl` | Explore | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 53 | 0 |
| `935ce3ad-0ee2-4b86-bae6-ed646a84a40f` | `Explore-a84bb3f72410e3bee.jsonl` | Explore | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 56 | 0 |
| `935ce3ad-0ee2-4b86-bae6-ed646a84a40f` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | NONE | — | 96 | 2 |
| `9a066423-fbac-4ece-8677-6d0ac7fce237` | `Explore-a76c9fbcd49365fd7.jsonl` | Explore | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 59 | 0 |
| `9a066423-fbac-4ece-8677-6d0ac7fce237` | `Explore-afb3b6b8a7e9793c0.jsonl` | Explore | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 74 | 0 |
| `9a066423-fbac-4ece-8677-6d0ac7fce237` | `implementer-ac7f0703f0d9c8fab.jsonl` | implementer | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 98 | 0 |
| `9a066423-fbac-4ece-8677-6d0ac7fce237` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | NONE | — | 758 | 2 |
| `9a066423-fbac-4ece-8677-6d0ac7fce237` | `researcher-a25d1ad45f1a11101.jsonl` | researcher | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 104 | 0 |
| `9a066423-fbac-4ece-8677-6d0ac7fce237` | `researcher-a2c7e463c1529fb58.jsonl` | researcher | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 89 | 0 |
| `9a066423-fbac-4ece-8677-6d0ac7fce237` | `researcher-a3c882ab6edb0db24.jsonl` | researcher | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 41 | 0 |
| `9a066423-fbac-4ece-8677-6d0ac7fce237` | `researcher-a62ebb5d4675949c1.jsonl` | researcher | no | 1, 134 (×2) | unknown (unknown) | ×1 | COMPLETE/objective_reported | 135 | 0 |
| `9a066423-fbac-4ece-8677-6d0ac7fce237` | `researcher-ac57010da7cf8997c.jsonl` | researcher | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 104 | 0 |
| `9a066423-fbac-4ece-8677-6d0ac7fce237` | `researcher-adc2424e9deb7be2c.jsonl` | researcher | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 83 | 0 |
| `9a066423-fbac-4ece-8677-6d0ac7fce237` | `researcher-addc7d6c9aeecf082.jsonl` | researcher | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 68 | 0 |
| `9d06a627-7a03-4365-a7ee-b6990bdf55ef` | `-a31b7b600a2b25900.jsonl` | -a31b7b600a2b25900 | no | — | — | ×1 | COMPLETE/objective_reported | 1 | 0 |
| `9d06a627-7a03-4365-a7ee-b6990bdf55ef` | `implementer-adad78ac724df67a3.jsonl` | implementer | no | 1 | unknown (unknown) | NONE | — | 109 | 0 |
| `9d06a627-7a03-4365-a7ee-b6990bdf55ef` | `implementer-adc2418993e66c942.jsonl` | implementer | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 131 | 0 |
| `9d06a627-7a03-4365-a7ee-b6990bdf55ef` | `implementer-af3f959e07ea50610.jsonl` | implementer | no | 1 | unknown (unknown) | NONE | — | 94 | 0 |
| `9d06a627-7a03-4365-a7ee-b6990bdf55ef` | `orchestrator.jsonl` | orchestrator | no | 1, 197 (×2) | unknown (unknown) | NONE | — | 389 | 2 |
| `a8d17e89-0114-43fe-863f-80cc6120ad18` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | ×1 | COMPLETE/other | 7 | 0 |
| `ae6d158d-2a3e-4382-84fc-466e3ac8f24b` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | ×1 | COMPLETE/other | 7 | 0 |
| `b2d44ea1-43e5-4596-a798-bacd1b2bb1c8` | `orchestrator.jsonl` | orchestrator | no | 5 | unknown (unknown) | ×1 | COMPLETE/other | 7 | 0 |
| `b365ba06-741a-44ad-9a84-0c5f516b80d6` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | ×1 | COMPLETE/other | 7 | 0 |
| `b4add49b-03cf-4839-929d-db8c5f785d21` | `implementer-a1f0eff76cf419cd8.jsonl` | implementer | no | 1 | unknown (unknown) | NONE | — | 108 | 1 |
| `b4add49b-03cf-4839-929d-db8c5f785d21` | `implementer-a3d449826e0eff02e.jsonl` | implementer | no | 1 | unknown (unknown) | NONE | — | 103 | 0 |
| `b4add49b-03cf-4839-929d-db8c5f785d21` | `implementer-a443a88a01e1f31ed.jsonl` | implementer | no | 1 | unknown (unknown) | NONE | — | 91 | 0 |
| `b4add49b-03cf-4839-929d-db8c5f785d21` | `implementer-a66ae8559c32a8d11.jsonl` | implementer | no | 1 | unknown (unknown) | NONE | — | 91 | 0 |
| `b4add49b-03cf-4839-929d-db8c5f785d21` | `implementer-ab43556cf2733de85.jsonl` | implementer | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 53 | 0 |
| `b4add49b-03cf-4839-929d-db8c5f785d21` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | NONE | — | 535 | 1 |
| `b4add49b-03cf-4839-929d-db8c5f785d21` | `test-engineer-a72f5fec0b346ca52.jsonl` | test-engineer | no | 1 | unknown (unknown) | NONE | — | 121 | 0 |
| `b6218083-34c2-4cdf-b8f5-b59a827cdfde` | `orchestrator.jsonl` | orchestrator | no | 1, 45 (×4) | unknown (unknown,plan) | NONE | — | 78 | 0 |
| `b6218083-34c2-4cdf-b8f5-b59a827cdfde` | `unknown-role-aeb35e8a584709486.jsonl` | unknown-role | no | 1 | plan (plan) | ×1 | COMPLETE/objective_reported | 2 | 0 |
| `d3996d93-1827-452a-adf3-5bc9c59e7d4c` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | ×1 | COMPLETE/other | 7 | 0 |
| `e2cf4616-bde9-4810-9d3c-d57f9f14c467` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | NONE | — | 6 | 0 |
| `e670bf67-2755-487a-9f13-74781a7df4f2` | `orchestrator.jsonl` | orchestrator | no | 1 | unknown (unknown) | NONE | — | 6 | 0 |
| `ef05f088-7521-465b-b3a2-24b6e9df7fd7` | `orchestrator.jsonl` | orchestrator | no | 5 | unknown (unknown) | NONE | — | 6 | 0 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `-a45856924a1e6862a.jsonl` | -a45856924a1e6862a | no | — | — | ×1 | COMPLETE/objective_reported | 1 | 0 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `-a5e02d76a2eb61671.jsonl` | -a5e02d76a2eb61671 | no | — | — | ×1 | COMPLETE/objective_reported | 1 | 0 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `implementer-a0210c9a3c2b63343.jsonl` | implementer | no | 1, 178 (×3) | unknown (unknown) | ×2 | COMPLETE/objective_reported | 215 | 0 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `implementer-a226f9512726b6d2e.jsonl` | implementer | no | 1 | unknown (unknown) | NONE | — | 130 | 0 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `implementer-a3a4f6741c7316ec1.jsonl` | implementer | no | 1, 125 (×2) | unknown (unknown) | ×1 | COMPLETE/objective_reported | 168 | 0 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `implementer-a4893c9d118eb5c3f.jsonl` | implementer | no | 1 | unknown (unknown) | NONE | — | 141 | 1 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `implementer-a598b8537a5cc8881.jsonl` | implementer | no | 1 | unknown (unknown) | NONE | — | 99 | 1 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `implementer-a5af33f424f9eb8d3.jsonl` | implementer | no | 1, 93 (×2) | unknown (unknown) | ×2 | COMPLETE/objective_reported | 130 | 0 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `implementer-a6324cd99854ef10b.jsonl` | implementer | no | 1, 151 (×2) | unknown (unknown) | ×1 | COMPLETE/objective_reported | 182 | 1 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `implementer-a95869a166de3ebe8.jsonl` | implementer | no | 1 | unknown (unknown) | ×1 | COMPLETE/objective_reported | 107 | 0 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `implementer-ac6972d02c5d3d6a6.jsonl` | implementer | no | 1 | unknown (unknown) | NONE | — | 46 | 0 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `implementer-acabc27591f6d4420.jsonl` | implementer | no | 1 | unknown (unknown) | NONE | — | 109 | 0 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `implementer-ae62d7c1270bce2a4.jsonl` | implementer | no | 1 | unknown (unknown) | NONE | — | 139 | 0 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `implementer-aece4577a636c3e70.jsonl` | implementer | no | 1, 108 (×2) | unknown (unknown) | ×2 | COMPLETE/objective_reported | 148 | 0 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `implementer-aef99d844f87e8c14.jsonl` | implementer | no | 1 | unknown (unknown) | NONE | — | 106 | 0 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `implementer-af5a8e134d0e1968e.jsonl` | implementer | no | 1, 122 (×2) | unknown (unknown) | NONE | — | 215 | 0 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `implementer-afbd76047fdbe3463.jsonl` | implementer | no | 1, 183 (×3) | unknown (unknown) | ×1 | COMPLETE/objective_reported | 196 | 0 |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | `orchestrator.jsonl` | orchestrator | no | 1, 511 (×3) | unknown (unknown) | NONE | — | 1035 | 4 |

## Every deny decision, with pointer

| # | pointer | rule | guard | tool | reason (truncated) | in excluded dir |
|---|---|---|---|---|---|---|
| 1 | `evidence/runs/17db4bf1-702e-43ba-9e46-43c37c128aaa/orchestrator.jsonl:32` | H-02 | path-boundary | Bash | sed targets resources/site/ui.en.md, inside the protected "resources" boundary | no |
| 2 | `evidence/runs/17db4bf1-702e-43ba-9e46-43c37c128aaa/orchestrator.jsonl:707` | H-02 | path-boundary | Bash | sed targets resources/site/home.en.md, inside the protected "resources" boundary | no |
| 3 | `evidence/runs/23050ada-4964-4e4a-b5fe-197026a612d7/orchestrator.jsonl:15` | H-05 | delegation-gate | Agent | a write-capable delegation to "Explore" (the role declares no tools list, so nothing proves it is read-only) names no work item. A run with  | no |
| 4 | `evidence/runs/23050ada-4964-4e4a-b5fe-197026a612d7/orchestrator.jsonl:17` | H-05 | delegation-gate | Agent | a write-capable delegation to "Explore" (the role declares no tools list, so nothing proves it is read-only) names no work item. A run with  | no |
| 5 | `evidence/runs/2760bdea-e954-4832-b787-2b9a93b959a7/orchestrator.jsonl:38` | H-02 | path-boundary | Bash | sed targets resources/site/ui.es.md, inside the protected "resources" boundary | no |
| 6 | `evidence/runs/2760bdea-e954-4832-b787-2b9a93b959a7/orchestrator.jsonl:99` | H-02 | path-boundary | Bash | sed targets resources/site/about.en.md, inside the protected "resources" boundary | no |
| 7 | `evidence/runs/2760bdea-e954-4832-b787-2b9a93b959a7/orchestrator.jsonl:104` | H-02 | path-boundary | Bash | awk targets resources/site/ui.en.md, inside the protected "resources" boundary | no |
| 8 | `evidence/runs/2b631645-bc5f-47a4-abaa-1712448331d5/orchestrator.jsonl:20` | H-05 | delegation-gate | Agent | a write-capable delegation to "Explore" (the role declares no tools list, so nothing proves it is read-only) names no work item. A run with  | no |
| 9 | `evidence/runs/2b631645-bc5f-47a4-abaa-1712448331d5/orchestrator.jsonl:22` | H-05 | delegation-gate | Agent | a write-capable delegation to "Explore" (the role declares no tools list, so nothing proves it is read-only) names no work item. A run with  | no |
| 10 | `evidence/runs/2b631645-bc5f-47a4-abaa-1712448331d5/orchestrator.jsonl:46` | H-02 | path-boundary | Bash | sed targets resources/site/home.en.md, inside the protected "resources" boundary | no |
| 11 | `evidence/runs/2b631645-bc5f-47a4-abaa-1712448331d5/orchestrator.jsonl:323` | H-02 | path-boundary | Bash | sed targets resources/case-studies/otp-provider-decoupling.en.md, inside the protected "resources" boundary | no |
| 12 | `evidence/runs/32bc8893-ecbc-4ed2-831b-04fb93182220/orchestrator.jsonl:148` | H-05 | delegation-gate | Agent | a write-capable delegation to "implementer" (holds Edit, Write, Bash) names no work item. A run with no work item is ungoverned by definitio | no |
| 13 | `evidence/runs/32bc8893-ecbc-4ed2-831b-04fb93182220/orchestrator.jsonl:166` | H-01 | git-write | Bash | "git checkout" is not on the read-only allowlist — the human owns commits, so work is left uncommitted for review | no |
| 14 | `evidence/runs/53898bfe-6d4b-4689-a93c-86900c09c619/implementer-a7f9923142c6f74c6.jsonl:94` | settings.deny | permission-engine | — | — | no |
| 15 | `evidence/runs/5751ce4c-d1e6-4e94-ba07-522038d27915/harness-evaluator-ad60736a83d99e98a.jsonl:102` | G-05 | role-scope | Write | "harness-evaluator" may write only inside progress/evaluation-results, and C:/dev/projects/portfolio/progress/evaluation-results/EVAL-000-ba | no |
| 16 | `evidence/runs/5751ce4c-d1e6-4e94-ba07-522038d27915/harness-evaluator-aeff13603a9732beb.jsonl:124` | G-05 | role-scope | Write | "harness-evaluator" may write only inside progress/evaluation-results, and C:/dev/projects/portfolio/progress/evaluation-results/EVAL-000-ba | no |
| 17 | `evidence/runs/5751ce4c-d1e6-4e94-ba07-522038d27915/harness-evaluator-aeff13603a9732beb.jsonl:132` | G-05 | role-scope | Write | "harness-evaluator" may write only inside progress/evaluation-results, and C:/dev/projects/portfolio/progress/evaluation-results/EVAL-000-ba | no |
| 18 | `evidence/runs/5751ce4c-d1e6-4e94-ba07-522038d27915/orchestrator.jsonl:11` | H-03 | path-boundary | Bash | rm targets evidence/runs, inside the protected "evidence" boundary | no |
| 19 | `evidence/runs/5751ce4c-d1e6-4e94-ba07-522038d27915/orchestrator.jsonl:196` | H-01 | git-write | Bash | "git commit" is not on the read-only allowlist (via substitution) — the human owns commits, so work is left uncommitted for review | no |
| 20 | `evidence/runs/5751ce4c-d1e6-4e94-ba07-522038d27915/orchestrator.jsonl:809` | H-02 | path-boundary | Bash | sed targets resources/case-studies/$(ls, inside the protected "resources" boundary | no |
| 21 | `evidence/runs/5a10d8af-ee05-465a-bc7f-502b664ef3f1/orchestrator.jsonl:23` | H-05 | delegation-gate | Agent | TASK-25 is typed `feature`, which produces a spec, and no spec file names it as its work_item. There is nothing approved to implement agains | no |
| 22 | `evidence/runs/5a10d8af-ee05-465a-bc7f-502b664ef3f1/orchestrator.jsonl:27` | H-05 | delegation-gate | Agent | TASK-24 cannot be delegated to a write-capable role: its spec has drifted: version 1.1 is past approved_version 1.0, so the version about to | no |
| 23 | `evidence/runs/5a10d8af-ee05-465a-bc7f-502b664ef3f1/orchestrator.jsonl:29` | H-05 | delegation-gate | Agent | a write-capable delegation to "Explore" (the role declares no tools list, so nothing proves it is read-only) names no work item. A run with  | no |
| 24 | `evidence/runs/5a10d8af-ee05-465a-bc7f-502b664ef3f1/orchestrator.jsonl:31` | H-05 | delegation-gate | Agent | a write-capable delegation to "Explore" (the role declares no tools list, so nothing proves it is read-only) names no work item. A run with  | no |
| 25 | `evidence/runs/5a10d8af-ee05-465a-bc7f-502b664ef3f1/orchestrator.jsonl:163` | H-02 | path-boundary | Bash | sed targets resources/case-studies/mobile-banking-platform.en.md, inside the protected "resources" boundary | no |
| 26 | `evidence/runs/935ce3ad-0ee2-4b86-bae6-ed646a84a40f/orchestrator.jsonl:10` | H-05 | delegation-gate | Agent | a write-capable delegation to "Explore" (the role declares no tools list, so nothing proves it is read-only) names no work item. A run with  | no |
| 27 | `evidence/runs/935ce3ad-0ee2-4b86-bae6-ed646a84a40f/orchestrator.jsonl:30` | H-02 | path-boundary | Bash | sed targets resources/case-studies/mobile-banking-platform.en.md, inside the protected "resources" boundary | no |
| 28 | `evidence/runs/9a066423-fbac-4ece-8677-6d0ac7fce237/orchestrator.jsonl:11` | H-05 | delegation-gate | Agent | a write-capable delegation to "Explore" (the role declares no tools list, so nothing proves it is read-only) names no work item. A run with  | no |
| 29 | `evidence/runs/9a066423-fbac-4ece-8677-6d0ac7fce237/orchestrator.jsonl:281` | H-02 | path-boundary | Bash | cp targets resources/diagrams/otp-breakeven.mmd, inside the protected "resources" boundary | no |
| 30 | `evidence/runs/9d06a627-7a03-4365-a7ee-b6990bdf55ef/orchestrator.jsonl:292` | H-05 | delegation-gate | Agent | TASK-22 is typed `feature`, which produces a spec, and no spec file names it as its work_item. There is nothing approved to implement agains | no |
| 31 | `evidence/runs/9d06a627-7a03-4365-a7ee-b6990bdf55ef/orchestrator.jsonl:341` | H-05 | delegation-gate | Agent | TASK-22 is typed `feature`, which produces a spec, and no spec file names it as its work_item. There is nothing approved to implement agains | no |
| 32 | `evidence/runs/b4add49b-03cf-4839-929d-db8c5f785d21/implementer-a1f0eff76cf419cd8.jsonl:10` | H-02 | path-boundary | Bash | sed targets resources/site/ui.en.md, inside the protected "resources" boundary | no |
| 33 | `evidence/runs/b4add49b-03cf-4839-929d-db8c5f785d21/orchestrator.jsonl:53` | H-02 | path-boundary | Bash | sed targets resources/site/ui.en.md, inside the protected "resources" boundary | no |
| 34 | `evidence/runs/ff549b41-28ac-4d10-9944-fd1a55415af2/implementer-a4893c9d118eb5c3f.jsonl:96` | H-02 | path-boundary | Bash | sed targets resources/site/home.en.md, inside the protected "resources" boundary | no |
| 35 | `evidence/runs/ff549b41-28ac-4d10-9944-fd1a55415af2/implementer-a598b8537a5cc8881.jsonl:93` | H-01 | git-write | Bash | "git stash" in this form can write — the human owns commits, so work is left uncommitted for review | no |
| 36 | `evidence/runs/ff549b41-28ac-4d10-9944-fd1a55415af2/implementer-a6324cd99854ef10b.jsonl:117` | H-02 | path-boundary | Bash | sed targets resources/site/ui.es.md, inside the protected "resources" boundary | no |
| 37 | `evidence/runs/ff549b41-28ac-4d10-9944-fd1a55415af2/orchestrator.jsonl:20` | H-05 | delegation-gate | Agent | a write-capable delegation to "Explore" (the role declares no tools list, so nothing proves it is read-only) names no work item. A run with  | no |
| 38 | `evidence/runs/ff549b41-28ac-4d10-9944-fd1a55415af2/orchestrator.jsonl:22` | H-05 | delegation-gate | Agent | a write-capable delegation to "Explore" (the role declares no tools list, so nothing proves it is read-only) names no work item. A run with  | no |
| 39 | `evidence/runs/ff549b41-28ac-4d10-9944-fd1a55415af2/orchestrator.jsonl:24` | H-05 | delegation-gate | Agent | TASK-22 is typed `feature`, which produces a spec, and no spec file names it as its work_item. There is nothing approved to implement agains | no |
| 40 | `evidence/runs/ff549b41-28ac-4d10-9944-fd1a55415af2/orchestrator.jsonl:59` | H-02 | path-boundary | Bash | sed targets resources/case-studies/otp-provider-decoupling.en.md, inside the protected "resources" boundary | no |

## Done

```yaml
done:
  tests: { status: not_applicable, reason: "no code changed — TASKS.md reconciliation and a read-only diagnostic script over evidence/runs/" }
  scope: { status: passed, evidence: ["TASKS.md (backlog table row, TASK 27 header, new TASK 60 entry)", "progress/2026-08-27-12-eval001-trace-index.md (this file)", "progress/2026-08-27-12-build-trace-index.mjs (new, read-only)"] }
  docs: { status: passed, evidence: ["node scripts/guards/gate/check-rules-registry.mjs — PASS, 6 files, registry consistent", "node scripts/guards/gate/check-docs.mjs — PASS, 59 living documents, 221 path references resolved"] }
  content: { status: not_applicable, reason: "harness/process work, not publishable content — resources/** untouched" }
  mutation: { status: not_applicable, reason: "no site/lib or guard logic changed; build-trace-index.mjs is a one-off diagnostic script, not part of the mutation-covered surface" }
  ci: { status: not_applicable, reason: "no remote exists yet (TASK 30)" }
  loose_ends: { status: passed, evidence: ["three anomalies found while building the index (excluded-dir fixtures gone, L still 0 for delegated runs, a second footer-only orphan) are recorded in this file for EVAL-001 to score, not resolved here — that is its job, not this session's"] }
  iterations: { status: passed, evidence: ["1"] }
```

## Next

Two independent sessions, each self-contained via its handoff packet in `progress/handoff/`:

- **`TASK 60`** — `/evaluate-harness`, pointed at `progress/handoff/2026-08-27-eval001.md`. Depends on nothing; can run immediately.
- **`TASK 27`**, local + design legs — pointed at `progress/handoff/2026-08-27-task27.md`. Independent of `TASK 60`.

Neither blocks the other. Once both close, the localhost milestone's remaining half — the author's own judgment of the site — runs last.

## Files changed

`TASKS.md` — backlog table (new row splitting `TASK 27`), `TASK 27`'s header, new `TASK 60` entry.
`progress/2026-08-27-12-eval001-trace-index.md` — this file.
`progress/2026-08-27-12-build-trace-index.mjs` — new, the reproducible index-building script.
