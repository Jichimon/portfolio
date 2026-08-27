# `EVAL-001` work-item extract — the register, every `done:` block, and the citation graph

**Not a scorecard.** This is tool output (`D2`), generated so `harness-evaluator` does not spend its 60 turns re-deriving from 60+ `TASKS.md` entries and 97 `progress/` logs what a script can count — the reading half of `P-09`, measured by `TASK 55` at 3 of 3 slices surviving on a pre-written extract against 0 of 1 on "go read the sources". It counts and points; it interprets nothing. Every row carries an exact pointer, so any of it can be checked with a targeted `Grep` rather than trusted (`P-11`).

**Reproduce this file** with:

```
node progress/2026-08-27-13-build-workitem-extract.mjs > progress/2026-08-27-13-eval001-workitem-extract.md
```

Its companion is `progress/2026-08-27-12-eval001-trace-index.md`, which covers `evidence/runs/`. Between them the two corpora the evaluation reads are precomputed; nothing else needs an unbounded walk.

## Corpus size, measured

| | count |
|---|---|
| work items in `TASKS.md` | 61 |
| — `DONE` | 48 |
| — `TODO` | 13 |
| `progress/` logs (excluding README) | 97 |
| — carrying a `done:` block | 84 |
| — carrying an `iterations` dimension | 75 |
| run directories under `evidence/runs/` | 36 |
| — post-baseline (first event after 2026-08-19T16:08:28.265Z) | 33 |
| — scored by `EVAL-000` | 2 |
| — pre-baseline, unscored | 1 |
| — undated (no `ts` on any event) | 0 |

## 1 · Run directories by time span — the scope partition, drawn from `ts` and not assumed

`BASELINE` marks the two directories `EVAL-000` scored by name. `post` is every directory whose first event postdates the last event in those two. The cut uses event timestamps rather than file mtimes, which a checkout rewrites.

| run dir | partition | first event | last event | files | events | agents seen |
|---|---|---|---|---|---|---|
| `5751ce4c-d1e6-4e94-ba07-522038d27915` | BASELINE | 2026-08-18 | 2026-08-19 | 5 | 1292 | harness-evaluator, orchestrator |
| `2ac4fd9f-d33b-4c7b-b982-6681cb7dfee0` | BASELINE | 2026-08-18 | 2026-08-18 | 1 | 7 | orchestrator |
| `90f82190-6db7-4a3c-8b7a-fe66b50912a3` | pre | 2026-08-19 | 2026-08-19 | 1 | 7 | orchestrator |
| `9a066423-fbac-4ece-8677-6d0ac7fce237` | post | 2026-08-19 | 2026-08-19 | 11 | 1613 | Explore, implementer, orchestrator, researcher |
| `6860d153-70d7-4f0b-b3fe-761de6decd00` | post | 2026-08-19 | 2026-08-19 | 1 | 7 | orchestrator |
| `8578015c-9a1a-4da0-b575-b395770eae9b` | post | 2026-08-20 | 2026-08-20 | 1 | 6 | orchestrator |
| `935ce3ad-0ee2-4b86-bae6-ed646a84a40f` | post | 2026-08-20 | 2026-08-20 | 3 | 205 | Explore, orchestrator |
| `53c017fc-ae20-4ac8-b5ca-406872de8b5b` | post | 2026-08-22 | 2026-08-22 | 1 | 6 | orchestrator |
| `e2cf4616-bde9-4810-9d3c-d57f9f14c467` | post | 2026-08-22 | 2026-08-22 | 1 | 6 | orchestrator |
| `9d06a627-7a03-4365-a7ee-b6990bdf55ef` | post | 2026-08-23 | 2026-08-24 | 5 | 724 | implementer, orchestrator |
| `32bc8893-ecbc-4ed2-831b-04fb93182220` | post | 2026-08-24 | 2026-08-24 | 5 | 728 | adversarial-auditor, implementer, orchestrator |
| `89d0a848-15ab-4566-a21a-7b3f9e9627ac` | post | 2026-08-24 | 2026-08-24 | 1 | 7 | orchestrator |
| `2fc08374-7dee-478d-8ba2-f77c99c8ffd9` | post | 2026-08-24 | 2026-08-24 | 1 | 6 | orchestrator |
| `2b631645-bc5f-47a4-abaa-1712448331d5` | post | 2026-08-24 | 2026-08-24 | 2 | 473 | orchestrator |
| `ff549b41-28ac-4d10-9944-fd1a55415af2` | post | 2026-08-24 | 2026-08-25 | 18 | 3168 | implementer, orchestrator |
| `ae6d158d-2a3e-4382-84fc-466e3ac8f24b` | post | 2026-08-24 | 2026-08-24 | 1 | 7 | orchestrator |
| `26d0a4d6-35df-473c-b878-de6389cbf81c` | post | 2026-08-24 | 2026-08-24 | 1 | 7 | orchestrator |
| `ef05f088-7521-465b-b3a2-24b6e9df7fd7` | post | 2026-08-25 | 2026-08-25 | 1 | 6 | orchestrator |
| `b6218083-34c2-4cdf-b8f5-b59a827cdfde` | post | 2026-08-25 | 2026-08-27 | 2 | 80 | orchestrator, unknown-role |
| `0ad34041-120d-4c1c-8af3-3cece3bf1081` | post | 2026-08-25 | 2026-08-25 | 1 | 7 | orchestrator |
| `4027a446-91c7-4410-ad28-b2f6cd47c5ec` | post | 2026-08-25 | 2026-08-25 | 1 | 7 | orchestrator |
| `17db4bf1-702e-43ba-9e46-43c37c128aaa` | post | 2026-08-25 | 2026-08-26 | 6 | 1167 | implementer, orchestrator, test-engineer |
| `e670bf67-2755-487a-9f13-74781a7df4f2` | post | 2026-08-25 | 2026-08-25 | 1 | 6 | orchestrator |
| `d3996d93-1827-452a-adf3-5bc9c59e7d4c` | post | 2026-08-26 | 2026-08-26 | 1 | 7 | orchestrator |
| `5a10d8af-ee05-465a-bc7f-502b664ef3f1` | post | 2026-08-26 | 2026-08-26 | 3 | 322 | Explore, orchestrator |
| `a8d17e89-0114-43fe-863f-80cc6120ad18` | post | 2026-08-26 | 2026-08-26 | 1 | 7 | orchestrator |
| `b4add49b-03cf-4839-929d-db8c5f785d21` | post | 2026-08-26 | 2026-08-26 | 7 | 1102 | implementer, orchestrator, test-engineer |
| `56e9413b-2c34-4eeb-8dba-21c8df5aa62e` | post | 2026-08-26 | 2026-08-26 | 1 | 7 | orchestrator |
| `2760bdea-e954-4832-b787-2b9a93b959a7` | post | 2026-08-26 | 2026-08-27 | 5 | 620 | implementer, orchestrator, test-engineer |
| `b365ba06-741a-44ad-9a84-0c5f516b80d6` | post | 2026-08-26 | 2026-08-26 | 1 | 7 | orchestrator |
| `2f992e48-e080-4d12-805f-f362bf54cf5d` | post | 2026-08-27 | 2026-08-27 | 1 | 6 | orchestrator |
| `53898bfe-6d4b-4689-a93c-86900c09c619` | post | 2026-08-27 | 2026-08-27 | 10 | 1145 | budget-probe, implementer, orchestrator, researcher |
| `23050ada-4964-4e4a-b5fe-197026a612d7` | post | 2026-08-27 | 2026-08-27 | 1 | 313 | orchestrator |
| `74c124d6-4b2f-45c1-92da-2868bf4b51cc` | post | 2026-08-27 | 2026-08-27 | 1 | 294 | orchestrator |
| `b2d44ea1-43e5-4596-a798-bacd1b2bb1c8` | post | 2026-08-27 | 2026-08-27 | 1 | 7 | orchestrator |
| `21861e1c-40fc-4c83-9d34-fce7fc364625` | post | 2026-08-27 | 2026-08-27 | 1 | 95 | orchestrator |

## 2 · The register — every work item, its type, its status, its logs

`cites` is every other work-item id appearing in that entry's own section: the citation graph, unjudged. An item citing an earlier one is a `K3` **candidate**, not an escaped defect — deciding which is the evaluator's job.

| id | type | status | title | `TASKS.md` line | `progress/` logs | cites |
|---|---|---|---|---|---|---|
| TASK 0 | content | DONE | Case studies | 39 | — | 3 |
| TASK 1 | content | DONE | Diagrams | 46 | `2026-08-14-01-task1-diagrams.md` | 6 |
| TASK 2 | content | DONE | Site copy | 98 | 6 logs: `2026-08-15-01-task2-intake.md` … `2026-08-15-06-task2-done.md` | — |
| TASK 3 | content | DONE | Resolve `[NEEDS INPUT]` | 129 | `2026-08-15-07-task3-needs-input.md`<br>`2026-08-16-01-task3-about-link-consistency.md` | — |
| TASK 4 | content | DONE | GitHub profile README | 164 | `2026-08-16-02-task4-github-readme.md` | 5 |
| TASK 5 | harness | DONE | AI Agent Development Harness v2 | 183 | 10 logs: `2026-08-17-01-task5-harness-architecture.md` … `2026-08-19-01-task5-smoke-test-and-session-kickoff.md` | 7 |
| TASK 10 | bugfix | DONE | Guard precision follow-ups | 228 | `2026-08-18-07-task10-guard-precision.md` | — |
| TASK 12 | bugfix | DONE | Trace fidelity | 246 | 6 logs: `2026-08-25-06-task12-triage-not-reachable.md` … `2026-08-27-06-task12-slice5-posture-header.md` | 15, 18, 22, 39, 45, 52, 55, 59 |
| TASK 13 | feature | DONE | Capture K1 | 412 | `2026-08-19-02-task13-capture-k1.md` | 7 |
| TASK 14 | bugfix | TODO | Done-blocks detect an omitted dimension | 426 | — | 26 |
| TASK 34 | bugfix | DONE | The gate reports every step, not just the first failure | 450 | `2026-08-24-01-task34-gate-reports-every-step.md` | 12, 31 |
| TASK 15 | harness | DONE | Mutation gate, or an honest rung | 469 | `2026-08-24-05-task15-mutation-gate.md` | 7, 22, 38 |
| TASK 38 | harness | TODO | Ratchet the mutation score toward 100 | 489 | `2026-08-25-04-task38-shell-test-battery.md`<br>`2026-08-25-05-task38-git-write-battery.md`<br>`2026-08-25-07-task38-behaviour-move-and-remeasure.md` | 15, 22, 34, 39 |
| TASK 39 | bugfix | DONE | A gate step that never ran must not report PASS | 562 | `2026-08-25-02-task39-gate-liveness-and-skip.md` | 15, 22, 34, 44 |
| TASK 40 | research | DONE | Code readability: names and comments | 597 | `2026-08-24-06-task40-code-readability.md` | 10, 15 |
| TASK 41 | harness | DONE | Playwright smoke tier | 622 | `2026-08-25-08-task41-playwright-smoke-tier.md` | 12, 27, 34, 39 |
| TASK 42 | bugfix | DONE | The test and mutation globs cover one subfolder, not the core | 656 | `2026-08-24-09-task42-task44-globs-and-component-tier.md` | 22 |
| TASK 44 | harness | DONE | Component test tier: Vitest, jsdom, `@testing-library/preact` | 683 | `2026-08-24-09-task42-task44-globs-and-component-tier.md` | — |
| TASK 46 | content | DONE | Two rail strings the interface-strings collection does not carry | 697 | `2026-08-25-03-task46-rail-socials-wordmark.md` | — |
| TASK 45 | bugfix | DONE | The confidentiality guard matches substrings, and a short term collides forever | 718 | `2026-08-25-01-task45-terms-word-boundary.md` | 37, 44 |
| TASK 43 | harness | DONE | Concurrent writes happened, and the deferred remedies name a different actor | 739 | `2026-08-27-08-task43-concurrent-writes-decision.md` | 22, 52 |
| TASK 11 | bugfix | TODO | Case-folded boundary comparison | 769 | — | — |
| TASK 6 | content | TODO | Replace Mermaid diagrams with hand-authored assets | 784 | — | 1, 8 |
| TASK 7 | research | DONE | Founding ADRs | 810 | 7 logs: `2026-08-19-04-task7-adr001-site-stack.md` … `2026-08-19-12-task7-closed.md` | 8, 13, 15, 16, 17 |
| TASK 8 | planning | DONE | Site work breakdown | 835 | 19 logs: `2026-08-20-01-task8-design-brief.md` … `2026-08-23-19-task8-closed-backlog.md` | 7, 15, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 38, 40, 41, 42, 44, 54, 60 |
| TASK 35 | research | DONE | Implementation architecture: `ADR-008` and the `S-*` rule surface | 960 | `2026-08-24-02-task35-implementation-architecture.md` | 5, 36 |
| TASK 36 | content | DONE | Interface strings as content | 987 | `2026-08-24-07-task36-interface-strings.md` | 16, 17, 20 |
| TASK 37 | bugfix | DONE | `check-terms` false-positives on generated opaque values | 1013 | `2026-08-24-03-task37-terms-opaque-values.md` | 18 |
| TASK 30 | maintenance | TODO | Publish the repository to GitHub | 1031 | — | — |
| TASK 31 | content | DONE | Reconcile the brief and the decision docs with what was built | 1048 | `2026-08-23-21-task31-design-docs-reconciled.md` | 20 |
| TASK 33 | research | DONE | UI component model and component test tier | 1067 | `2026-08-23-22-task33-component-model-and-test-tier.md` | 8 |
| TASK 21 | feature | DONE | Astro skeleton and the two root commands | 1097 | `2026-08-24-04-task21-astro-skeleton.md` | 12, 31, 32, 37 |
| TASK 32 | feature | TODO | CI deploy pipeline: GitHub Actions → Cloudflare Workers | 1121 | — | 21, 27 |
| TASK 22 | feature | DONE | Content layer: collections, schema, locale join | 1138 | `2026-08-24-08-task22-content-layer.md` | 17, 38, 42, 43 |
| TASK 23 | feature | DONE | Tokens and the layout shell | 1170 | `2026-08-24-10-task23-layout-shell.md` | 27, 46 |
| TASK 47 | maintenance | DONE | `site/` is at the file cap, and the next config file forces a split | 1220 | `2026-08-27-09-task47-package-root-file-cap.md` | — |
| TASK 48 | bugfix | DONE | A delegated slice closes without `astro check` having run | 1249 | `2026-08-27-11-task48-astro-check-gate-step.md` | 38, 47 |
| TASK 49 | content | DONE | `home.{en,es}.md` carries a body the design does not render | 1281 | — | — |
| TASK 50 | content | DONE | `contact.{en,es}.md` is superseded and routes nowhere | 1313 | — | — |
| TASK 51 | harness | DONE | The smoke tier's screenshots were dropped without being declared | 1341 | — | 25 |
| TASK 52 | harness | DONE | A missing `run.footer` may be the cut-off signal `G-06` says does not exist | 1365 | — | 12 |
| TASK 54 | harness | DONE | A green gate can be measuring HTML the current code did not produce | 1419 | `2026-08-27-10-task54-pipeline-keyed-cache.md` | 25 |
| TASK 55 | harness | DONE | Five delegated runs, five turn budgets exhausted | 1455 | — | 12, 14, 25, 26, 52, 59 |
| TASK 56 | bugfix | DONE | A self-staling list whose test forbade it from ever reaching empty | 1527 | — | 26, 39 |
| TASK 57 | bugfix | DONE | Two end-to-end assertions passed alone and failed under load | 1543 | — | 26 |
| TASK 58 | bugfix | DONE | A screenshot step reported PASS while writing no image | 1557 | — | 26, 39 |
| TASK 53 | version | DONE | `SPEC-TASK-24` sits at `version` 1.1 with `approved_version` 1.0 | 1571 | — | 24 |
| TASK 24 | feature | DONE | Home | 1591 | `2026-08-25-09-task24-home.md` | 19, 20 |
| TASK 25 | feature | DONE | Case study and platform templates | 1626 | `2026-08-26-01-task25-case-study-and-platform-pages.md` | 54, 55 |
| TASK 26 | feature | DONE | About, Experience and 404 | 1651 | 9 logs: `2026-08-26-02-task26-about-experience-404.md` … `2026-08-26-02-task26-slice-h-e2e.md` | 20 |
| TASK 27 | harness | TODO | Design-fidelity harness: dev, prod and the design as three things | 1678 | — | 15, 32 |
| TASK 28 | feature | TODO | Custom domain | 1700 | — | — |
| TASK 29 | feature | TODO | Contact form Worker | 1712 | — | — |
| TASK 20 | content | TODO | Split About and Experience, and source three photographs | 1727 | — | 8, 26 |
| TASK 19 | content | TODO | LinkedIn recommendations as content | 1778 | — | — |
| TASK 9 | harness | TODO | Harness export v2 | 1795 | — | 8 |
| TASK 16 | content | DONE | About page: 16Personalities aside | 1805 | `2026-08-19-03-task16-about-16personalities-drafted.md`<br>`2026-08-19-06-task16-closed-task17-handoff.md` | 5, 6 |
| TASK 17 | content | DONE | Pre-render placeholder diagrams to static SVG | 1827 | `2026-08-19-06-task16-closed-task17-handoff.md`<br>`2026-08-19-07-task7-adr002-accepted-task17-closed.md` | 1, 6, 7, 16 |
| TASK 18 | bugfix | DONE | Trace redaction false-positives on opaque IDs | 1841 | — | 12 |
| TASK 59 | bugfix | DONE | A malformed term list silently disabled write-time scrubbing, and the trace kept the result | 1857 | `2026-08-27-07-task59-write-time-scrubber.md` | 9, 12, 45 |
| TASK 60 | harness | TODO | Run EVAL-001, the milestone's harness-scoring half | 1900 | — | 5, 22, 26 |

## 3 · Every `done:` block, digested

`iterations` is read verbatim from the log's own prose and is therefore **`self-reported`**, never `observable` — `K1`'s substrate is the work log, and the log is written by the entity being scored. `dimensions` lists each dimension as `name:status`, with `!` appended where the dimension claims `passed` with an empty or absent evidence array (`P-03`). A log with no `done:` block at all is marked `NO DONE BLOCK`.

| log | items | iterations | dimensions |
|---|---|---|---|
| `progress/2026-08-13-01-readme-glossary-and-diagram-ids.md` | — | — | **NO DONE BLOCK** |
| `progress/2026-08-14-01-task1-diagrams.md` | 1 | — | **NO DONE BLOCK** |
| `progress/2026-08-15-01-task2-intake.md` | 2 | — | **NO DONE BLOCK** |
| `progress/2026-08-15-02-task2-devolucion-home.md` | 2 | — | **NO DONE BLOCK** |
| `progress/2026-08-15-03-task2-about.md` | 2 | — | **NO DONE BLOCK** |
| `progress/2026-08-15-04-task2-about-closed-link-fix.md` | 2 | — | **NO DONE BLOCK** |
| `progress/2026-08-15-05-task2-experience.md` | 2 | — | **NO DONE BLOCK** |
| `progress/2026-08-15-06-task2-done.md` | 2 | — | **NO DONE BLOCK** |
| `progress/2026-08-15-07-task3-needs-input.md` | 3 | — | **NO DONE BLOCK** |
| `progress/2026-08-16-01-task3-about-link-consistency.md` | 3 | — | **NO DONE BLOCK** |
| `progress/2026-08-16-02-task4-github-readme.md` | 4 | — | **NO DONE BLOCK** |
| `progress/2026-08-17-01-task5-harness-architecture.md` | 5 | — | **NO DONE BLOCK** |
| `progress/2026-08-18-01-task5-steps-2-to-6.md:33` | 5 | **absent** | tests:passed · gate:passed · content:passed · docs:passed · ci:not_applicable · security:not_applicable |
| `progress/2026-08-18-02-task5-step6-and-open-questions.md:42` | 5 | **absent** | tests:passed · gate:passed · content:passed · docs:passed · ci:not_applicable · security:passed |
| `progress/2026-08-18-03-task5-step7-evidence.md:40` | 5 | **absent** | tests:passed · gate:passed · content:passed · docs:passed · evidence:passed · ci:not_applicable · security:passed |
| `progress/2026-08-18-04-task5-step8-roles.md:69` | 5 | **absent** | tests:passed · gate:passed · content:passed · docs:passed · security:passed · ci:not_applicable |
| `progress/2026-08-18-05-task5-step9-procedures.md:65` | 5 | **absent** | tests:passed · gate:passed · content:passed · docs:passed · procedures:passed · ci:not_applicable · security:not_applicable |
| `progress/2026-08-18-06-task5-step10-gate-and-ci.md:30` | 5 | **absent** | tests:passed · gate:passed · content:passed · docs:passed · ci:not_applicable · security:not_applicable |
| `progress/2026-08-18-07-task10-guard-precision.md:51` | 10 | **absent** | tests:passed · gate:passed · bugfix:passed · docs:passed · security:passed · content:passed · ci:not_applicable |
| `progress/2026-08-18-08-task5-step11-evals-and-baseline.md:73` | 5 | **absent** | tests:passed · gate:passed · docs:passed · security:passed · content:passed · ci:not_applicable |
| `progress/2026-08-18-09-task5-step12-acceptance-and-freeze.md:78` | 5 | **absent** | tests:passed · gate:passed · acceptance:passed · security:passed · content:passed · docs:passed · ci:not_applicable · freeze:passed · smoke_test:blocked |
| `progress/2026-08-19-01-task5-smoke-test-and-session-kickoff.md:25` | 5 | (no evidence array) | docs:passed · scope:passed · iterations:not_applicable |
| `progress/2026-08-19-02-task13-capture-k1.md:23` | 13 | 1 | tests:passed · gate:passed · docs:passed · ci:not_applicable · iterations:passed |
| `progress/2026-08-19-03-task16-about-16personalities-drafted.md:24` | 16 | (no evidence array) | content:blocked · docs:passed · iterations:not_applicable |
| `progress/2026-08-19-04-task7-adr001-site-stack.md:25` | 7 | 1 | docs:passed · content:not_applicable · iterations:passed |
| `progress/2026-08-19-05-task7-adr002-content-pipeline.md:25` | 7 | 2 | docs:passed · content:blocked · iterations:passed |
| `progress/2026-08-19-06-task16-closed-task17-handoff.md:22` | 16, 17 | 1 | content:passed · docs:passed · gate:passed · iterations:passed |
| `progress/2026-08-19-07-task7-adr002-accepted-task17-closed.md:22` | 7, 17 | 1 | docs:passed · content:passed · gate:passed · iterations:passed |
| `progress/2026-08-19-08-task7-adr003-i18n-strategy.md:24` | 7 | 1 | docs:passed · gate:passed · iterations:passed |
| `progress/2026-08-19-09-inc15-trace-redaction-false-positive.md:34` | — | (no evidence array) | docs:passed · security:passed · gate:passed · content:passed · iterations:not_applicable |
| `progress/2026-08-19-10-task7-adr004-accepted.md:13` | 7 | 1 | docs:passed · gate:passed · iterations:passed |
| `progress/2026-08-19-11-task7-adr005-accepted.md:13` | 7 | 1 | docs:passed · gate:passed · iterations:passed |
| `progress/2026-08-19-12-task7-closed.md:47` | 7 | 9 | docs:passed · gate:passed · scope:passed · iterations:passed |
| `progress/2026-08-20-01-task8-design-brief.md:33` | 8 | 1 | docs:passed · content:passed · gate:passed · scope:passed · loose_ends:passed · tests:not_applicable · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-20-02-task8-design-pass0.md:29` | 8 | 2 | docs:passed · content:passed · gate:partial · scope:passed · loose_ends:passed · tests:not_applicable · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-20-03-task8-design-pass0-v2.md:33` | 8 | 2 | docs:passed · content:passed · gate:partial · scope:passed · loose_ends:passed · tests:not_applicable · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-20-04-task8-design-pass1.md:31` | 8 | 1 | docs:passed · content:passed · gate:partial · scope:passed · loose_ends:passed · tests:not_applicable · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-20-05-task8-design-pass1-revisions.md:33` | 8 | 1 | docs:passed · content:passed · gate:partial · scope:passed · loose_ends:passed · tests:not_applicable · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-20-06-task8-design-pass1-revisions2.md:32` | 8 | 1 | docs:passed · content:passed · gate:partial · scope:passed · loose_ends:passed · tests:not_applicable · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-20-07-task8-design-pass1-revisions3.md:23` | 8 | 1 | docs:passed · content:passed · gate:partial · scope:passed · loose_ends:passed · tests:not_applicable · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-20-08-task8-design-pass1-revisions4.md:21` | 8 | 1 | docs:passed · content:passed · gate:partial · scope:passed · loose_ends:passed · tests:not_applicable · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-20-09-task8-design-pass1-revisions5.md:23` | 8 | 1 | docs:passed · content:passed · gate:partial · scope:passed · loose_ends:passed · tests:not_applicable · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-20-10-task8-design-pass1-revisions6.md:18` | 8 | 1 | docs:passed · content:passed · gate:partial · scope:passed · loose_ends:passed · tests:not_applicable · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-20-11-task8-design-pass1-revisions7.md:45` | 8 | 1 | docs:passed · content:passed · gate:partial · scope:passed · loose_ends:passed · tests:not_applicable · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-20-12-task8-design-pass1-revisions8.md:42` | 8 | 1 | docs:passed · content:passed · gate:partial · scope:passed · loose_ends:passed · tests:not_applicable · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-22-13-task8-design-pass1-revisions9.md:67` | 8 | 1 | docs:passed · content:passed · gate:partial · scope:passed · loose_ends:passed · tests:not_applicable · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-22-14-task8-design-pass1-revisions10.md:54` | 8 | 1 | docs:passed · content:passed · gate:partial · tests:passed · scope:passed · loose_ends:passed · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-22-15-task8-design-pass1-revisions11.md:79` | 8 | 1 | docs:passed · content:passed · gate:partial · tests:passed · scope:passed · loose_ends:passed · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-22-16-task8-design-pass2-about-experience.md:60` | 8 | 4 | docs:passed · content:passed · gate:partial · tests:passed · scope:passed · loose_ends:passed · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-23-17-task8-design-pass2-home-es-404.md:146` | 8 | 2 | docs:passed · content:passed · gate:partial · tests:passed · scope:passed · loose_ends:passed · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-23-18-task8-design-pass2-components.md:115` | 8 | 2 | docs:passed · content:passed · gate:partial · tests:passed · scope:passed · loose_ends:passed · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-23-19-task8-closed-backlog.md:101` | 8 | 2 | docs:passed · content:passed · gate:partial · tests:not_applicable · scope:passed · loose_ends:passed · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-23-20-backlog-resequenced-local-first.md:70` | — | 2 | docs:passed · content:not_applicable · gate:partial · tests:not_applicable · scope:passed · loose_ends:passed · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-23-21-task31-design-docs-reconciled.md:152` | 31 | 3 | docs:passed · content:passed · gate:partial · tests:passed · scope:passed · loose_ends:passed · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-23-22-task33-component-model-and-test-tier.md:106` | 33 | 2 | docs:passed · gate:partial · tests:passed · content:passed · scope:passed · loose_ends:passed · mutation:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-24-01-task34-gate-reports-every-step.md:30` | 34 | 1 | tests:passed · mutation:passed · gate:passed · docs:passed · scope:passed · content:not_applicable · security:not_applicable · ci:not_applicable · iterations:passed |
| `progress/2026-08-24-02-task35-implementation-architecture.md:29` | 35 | 1 | docs:passed · tests:passed · mutation:passed · gate:passed · security:passed · content:not_applicable · ci:not_applicable · scope:passed · iterations:passed |
| `progress/2026-08-24-03-task37-terms-opaque-values.md:27` | 37 | 1 | tests:passed · mutation:passed · gate:passed · security:passed · docs:passed · content:not_applicable · ci:not_applicable · scope:passed · iterations:passed |
| `progress/2026-08-24-04-task21-astro-skeleton.md:31` | 21 | 2 | tests:passed · gate:partial · security:passed · docs:passed · content:not_applicable · mutation:not_applicable · ci:not_applicable · scope:passed · iterations:passed |
| `progress/2026-08-24-05-task15-mutation-gate.md:101` | 15 | 6 | tests:passed · mutation:passed · gate:partial · security:passed · docs:passed · content:not_applicable · ci:not_applicable · loose_ends:passed · scope:passed · iterations:passed |
| `progress/2026-08-24-06-task40-code-readability.md:65` | 40 | 2 | tdd:passed · tests:passed · red_path:passed · mutation:passed · gate:passed · security:passed · docs:passed · content:not_applicable · locale_parity:not_applicable · ci:not_applicable · loose_ends:passed · scope:passed · iterations:passed |
| `progress/2026-08-24-07-task36-interface-strings.md:87` | 36 | 2 | content:passed · locale_parity:passed · factual_integrity:passed · confidentiality:passed · tdd:not_applicable · tests:passed · mutation:passed · gate:partial · security:passed · docs:passed · ci:not_applicable · loose_ends:passed · scope:passed · iterations:passed |
| `progress/2026-08-24-08-task22-content-layer.md:51` | 22 | 15 | tests:passed · mutation:passed · gate:partial · docs:passed · scope:passed · loose_ends:passed · iterations:passed · ci:not_applicable · content:not_applicable · security:not_applicable |
| `progress/2026-08-24-09-task42-task44-globs-and-component-tier.md:34` | 42, 44 | 4 | tdd:passed · gate:blocked · living_docs:passed · loose_ends:passed · mutation:blocked · confidentiality:blocked · iterations:passed |
| `progress/2026-08-24-10-task23-layout-shell.md:166` | 23 | 14 | spec:passed · tdd:passed · tests:passed · gate:failed · mutation:failed · living_docs:passed · loose_ends:passed · design_fidelity:blocked · confidentiality:blocked · iterations:passed |
| `progress/2026-08-25-01-task45-terms-word-boundary.md:60` | 45 | 1 | tests:passed · mutation:partial · gate:passed · security:passed · docs:passed · scope:passed · iterations:passed |
| `progress/2026-08-25-02-task39-gate-liveness-and-skip.md:27` | 39 | 1 | tests:passed · mutation:passed · gate:partial · docs:passed · scope:passed · content:not_applicable · security:not_applicable · ci:not_applicable · iterations:passed |
| `progress/2026-08-25-03-task46-rail-socials-wordmark.md:67` | 46 | 2 | tdd:not_applicable · content:passed · scope:passed · tests:not_applicable · docs:passed · loose_ends:passed · iterations:passed |
| `progress/2026-08-25-04-task38-shell-test-battery.md:126` | 38 | 1 | tests:passed · mutation:partial · scope:passed · iterations:passed · loose_ends:passed |
| `progress/2026-08-25-05-task38-git-write-battery.md:58` | 38 | 3 | tdd:not_applicable · tests:passed · mutation:passed · gate:passed · scope:passed · docs:passed · loose_ends:passed · iterations:passed |
| `progress/2026-08-25-06-task12-triage-not-reachable.md:37` | 12 | 1 | tdd:not_applicable · tests:not_applicable · docs:passed · gate:partial · scope:passed · loose_ends:passed · iterations:passed |
| `progress/2026-08-25-07-task38-behaviour-move-and-remeasure.md:47` | 38 | 1 | tdd:not_applicable · tests:passed · mutation:partial · gate:partial · docs:passed · scope:passed · loose_ends:passed · iterations:passed |
| `progress/2026-08-25-08-task41-playwright-smoke-tier.md:43` | 41 | 3 | tests:passed · mutation:passed · ci:not_applicable · security:not_applicable · docs:passed · loose_ends:passed · scope:passed · iterations:passed |
| `progress/2026-08-25-09-task24-home.md:272` | 24 | 6 | spec:passed · tests:passed · tdd:passed · red_path:passed · mutation:passed · gate:partial · build_proof:passed · design_fidelity:partial · ci:not_applicable · security:not_applicable · content:passed · docs:passed · loose_ends:passed · scope:passed · iterations:passed |
| `progress/2026-08-26-01-task25-case-study-and-platform-pages.md:160` | 25 | 7 | spec:passed · tests:passed · tdd:passed · red_path:passed · mutation:passed · gate:partial · design_fidelity:partial · content:passed · docs:passed · loose_ends:passed · scope:passed · author_handoff:partial · ci:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-26-02-task26-about-experience-404.md:156` | 26 | 9 | spec:passed · tests:passed · tdd:passed · red_path:passed · mutation:passed · gate:partial · design_fidelity:partial · content:passed · docs:passed · loose_ends:passed · scope:passed · author_handoff:partial · ci:not_applicable · security:not_applicable · iterations:passed |
| `progress/2026-08-26-02-task26-slice-a-employment-record.md:65` | 26 | 1 | tests:passed · tdd:passed · scope:passed · loose_ends:passed · iterations:passed |
| `progress/2026-08-26-02-task26-slice-b-about-article.md:43` | 26 | 1 | tests:passed · scope:passed · iterations:passed |
| `progress/2026-08-26-02-task26-slice-c-about-body.md:41` | 26 | 1 | tests:passed · scope:passed · docs:not_applicable · iterations:passed |
| `progress/2026-08-26-02-task26-slice-d-published-photos.md:22` | 26 | 1 | tests:passed · tdd:partial · red_path:passed · scope:passed · iterations:passed |
| `progress/2026-08-26-02-task26-slice-e-experience-components.md:90` | 26 | 1 | scope:passed · tests:not_applicable · iterations:passed |
| `progress/2026-08-26-02-task26-slice-f-about-components.md:63` | 26 | 1 | scope:passed · tests:not_applicable · iterations:passed |
| `progress/2026-08-26-02-task26-slice-g-not-found-components.md:40` | 26 | 1 | scope:passed · tests:not_applicable · design:passed · loose_ends:passed · iterations:passed |
| `progress/2026-08-26-02-task26-slice-h-e2e.md:17` | 26 | 1 | tests:passed · tdd:not_applicable · red_path:passed · scope:passed · iterations:passed |
| `progress/2026-08-27-01-trace-fidelity-y-presupuestos.md:111` | — | 1 | rules:passed · budgets:passed · red_path:passed · tests:passed · register:passed · content:not_applicable · ci:not_applicable · iterations:passed |
| `progress/2026-08-27-02-task12-slice1-writer-honesty.md:48` | 12 | 1 | tests:passed · iterations:passed |
| `progress/2026-08-27-03-task12-slice2-validator-redaction.md:38` | 12 | 2 | tests:passed · scope:passed · loose_ends:passed · iterations:passed |
| `progress/2026-08-27-04-task12-slice3-delivery-loss.md:70` | 12 | 1 | tests:passed · scope:passed · loose_ends:passed · iterations:passed |
| `progress/2026-08-27-05-task12-slice4-header-multiplicity.md:20` | 12 | 1 | tests:passed · scope:passed · content:not_applicable · mutation:not_applicable · ci:not_applicable · loose_ends:passed · iterations:passed |
| `progress/2026-08-27-06-task12-slice5-posture-header.md:43` | 12 | 1 | tests:passed · scope:passed · content:not_applicable · mutation:not_applicable · ci:not_applicable · iterations:passed |
| `progress/2026-08-27-07-task59-write-time-scrubber.md:42` | 59 | 1 | tests:passed · scope:passed · loose_ends:passed · iterations:passed |
| `progress/2026-08-27-08-task43-concurrent-writes-decision.md:25` | 43 | 1 | tests:not_applicable · mutation:not_applicable · docs:passed · scope:passed · loose_ends:passed · iterations:passed |
| `progress/2026-08-27-09-task47-package-root-file-cap.md:26` | 47 | 1 | tests:passed · mutation:passed · docs:passed · scope:passed · loose_ends:passed · iterations:passed |
| `progress/2026-08-27-10-task54-pipeline-keyed-cache.md:29` | 54 | 1 | tests:passed · mutation:passed · docs:passed · scope:passed · loose_ends:passed · iterations:passed |
| `progress/2026-08-27-11-task48-astro-check-gate-step.md:28` | 48 | 1 | tests:passed · mutation:passed · ci:not_applicable · docs:passed · scope:passed · loose_ends:passed · iterations:passed |
| `progress/2026-08-27-12-eval001-trace-index.md:247` | — | 1 | tests:not_applicable · scope:passed · docs:passed · content:not_applicable · mutation:not_applicable · ci:not_applicable · loose_ends:passed · iterations:passed |
| `progress/2026-08-27-13-eval001-workitem-extract.md` | — | — | **NO DONE BLOCK** |

## 4 · Dimension frequency across every `done:` block

The denominator for `P-03`: a dimension that no log declares is a dimension whose silence has never been read as coverage, and one declared `passed` with empty evidence is what `validateDone` already catches.

| dimension | declared | passed | partial | not_applicable | other | passed with empty evidence |
|---|---|---|---|---|---|---|
| iterations | 75 | 72 | 0 | 3 | 0 | 0 |
| tests | 72 | 50 | 0 | 22 | 0 | 0 |
| docs | 67 | 66 | 0 | 1 | 0 | 0 |
| scope | 61 | 61 | 0 | 0 | 0 | 0 |
| gate | 57 | 24 | 31 | 0 | 2 | 0 |
| content | 54 | 38 | 0 | 14 | 2 | 0 |
| loose_ends | 48 | 48 | 0 | 0 | 0 | 0 |
| mutation | 48 | 16 | 3 | 27 | 2 | 0 |
| security | 46 | 14 | 0 | 32 | 0 | 0 |
| ci | 28 | 0 | 0 | 28 | 0 | 0 |
| tdd | 14 | 7 | 1 | 6 | 0 | 0 |
| red_path | 7 | 7 | 0 | 0 | 0 | 0 |
| spec | 4 | 4 | 0 | 0 | 0 | 0 |
| design_fidelity | 4 | 0 | 3 | 0 | 1 | 0 |
| confidentiality | 3 | 1 | 0 | 0 | 2 | 0 |
| locale_parity | 2 | 1 | 0 | 1 | 0 | 0 |
| living_docs | 2 | 2 | 0 | 0 | 0 | 0 |
| author_handoff | 2 | 0 | 2 | 0 | 0 | 0 |
| evidence | 1 | 1 | 0 | 0 | 0 | 0 |
| procedures | 1 | 1 | 0 | 0 | 0 | 0 |
| bugfix | 1 | 1 | 0 | 0 | 0 | 0 |
| acceptance | 1 | 1 | 0 | 0 | 0 | 0 |
| freeze | 1 | 1 | 0 | 0 | 0 | 0 |
| smoke_test | 1 | 0 | 0 | 0 | 1 | 0 |
| factual_integrity | 1 | 1 | 0 | 0 | 0 | 0 |
| build_proof | 1 | 1 | 0 | 0 | 0 | 0 |
| design | 1 | 1 | 0 | 0 | 0 | 0 |
| rules | 1 | 1 | 0 | 0 | 0 | 0 |
| budgets | 1 | 1 | 0 | 0 | 0 | 0 |
| register | 1 | 1 | 0 | 0 | 0 | 0 |

_Generated by `progress/2026-08-27-13-build-workitem-extract.mjs`. 61 items · 97 logs · 36 run directories._
