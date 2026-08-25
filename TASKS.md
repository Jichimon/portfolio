# TASKS

The Work Item register. Read `CLAUDE.md` first.

Status values: `TODO` · `IN PROGRESS` · `BLOCKED` · `DONE`
Update the status line when a task changes state, and log the session in `progress/`.

**Work Item model.** Every entry is one deliverable with a checkable done and a `type`. Ids are stable and never reused — `progress/` cites them.

| type | Produces a spec? | The artifact the human approves |
|---|---|---|
| `content` | No | the content file; the parity and terms guards are the contract |
| `research` | No | the ADR |
| `planning` | No | the generated work-item list |
| `feature` · `migration` | **Yes** | `docs/specs/SPEC-TASK-N-*.spec.md` |
| `bugfix` · `maintenance` | No | the diff |
| `harness` | No | the architecture document + the acceptance suite |

**Entry shape.** Instances of this shape are the sections below — which is why it is documented here rather than in a separate templates directory.

```markdown
## TASK <N> — <verb + object> · `<type>` · `TODO`

<Two or three sentences: what this delivers and why now. Not a design.>

**Done:** <one sentence someone else could check.>

**Constraints**

- <what must not change, and what this must not touch>
```

If the done cannot be written in one checkable sentence, this is two work items (`P-01`). A title someone can act on without opening the entry is right; if they must open it to know what to do, the title is wrong. And no entry reads "investigate X" without a concrete done — if you cannot say when it ends, it is a note.

The session log that accompanies a work item is a different artifact with a different authority: `progress/README.md`.

---

## TASK 0 — Case studies · `content` · `DONE`

5 slugs × 2 locales in `resources/case-studies/`. Sanitized. 4 `[NEEDS INPUT]`
markers outstanding, tracked in TASK 3.

---

## TASK 1 — Diagrams · `content` · `DONE`

Produce Mermaid source for every `:::diagram` tag declared in the case studies.
Output to `resources/diagrams/{id}.mmd`, one file per id. 11/11 exist.

| id | type | Source file |
|---|---|---|
| `platform-c4-context` | c4-context | mobile-banking-platform |
| `platform-auth-boundary` | c4-container | mobile-banking-platform |
| `qr-c4-container` | c4-container | qr-collections-for-merchants |
| `qr-permission-model` | flow | qr-collections-for-merchants |
| `otp-c4-before` | c4-container | otp-provider-decoupling |
| `otp-c4-after` | c4-container | otp-provider-decoupling |
| `otp-breakeven` | table | otp-provider-decoupling |
| `migration-phases` | flow | legacy-payment-data-migration |
| `attendance-c4-context` | c4-context | multi-tenant-biometric-attendance |
| `attendance-c4-container` | c4-container | multi-tenant-biometric-attendance |
| `attendance-c4-component` | c4-component | multi-tenant-biometric-attendance |

**Rules**
- The spec inside each `:::diagram` block is the requirement. Follow it.
- Labels are subject to the same confidentiality glossary as prose.
- Language-neutral labels where possible, so one asset serves both locales.
- `otp-c4-before` / `otp-c4-after` must use identical layout for side-by-side
  comparison.
- `otp-breakeven` is a cost-vs-volume chart, not C4. If Mermaid can't express it
  well, say so and propose an alternative rather than shipping something weak.
- The three `attendance-*` diagrams exist as PNGs from the original project. **Redraw
  sanitized** — vendor and company names removed. Do not reuse as-is.

**Known limitations**
- Mermaid's automatic layout (dagre) produced confusing edge routing on the branchier
  diagrams — sink nodes sharing a rank with unrelated terminal nodes, edges that read as
  passing through the wrong node, connectors that visually disappear behind subgraph
  boundaries. Several review rounds with the author narrowed this (`curve: linear`,
  explicit `direction`, nested subgraphs pairing each service with its own store) but
  never reached hand-authored quality. These 11 files are good enough to unblock this
  task and everything downstream — not the final visual asset. Replacement tracked in
  TASK 6.
- `otp-breakeven` uses `block-beta`, a Mermaid diagram type still marked "beta" —
  renderer support is less universal than `flowchart`. Same caveat, same fix path.

**Acceptance**
- [x] 11 `.mmd` files, all rendering without syntax errors *(per the author's manual
  checks in mermaid.live during review; not independently re-run against every file in
  its final form)*
- [x] `./scripts/check-terms.sh` passes
- [ ] Before/after pair visually comparable — not achieved to the author's satisfaction;
  see Known limitations above and TASK 6.

---

## TASK 2 — Site copy · `content` · `DONE`

Create `resources/site/`, both locales for each file.

**`home.{en|es}.md`** — must answer in under 30 seconds: who is this, what does he
build, what systems, why trust him, where is the evidence, how to contact him. Lead
with the professional thesis. Include timezone and remote availability in the first
screen — an international hiring manager needs that immediately.

**`about.{en|es}.md`** — the narrative version of the thesis. The four-employer
through-line is the story. Currently studying Ingeniería Informática at UAGRM:
include, do not lead with it.

**`experience.{en|es}.md`** — condensed history that links out to case studies
rather than repeating them. Must not duplicate the CV.

**`contact.{en|es}.md`** — email, GitHub, LinkedIn. **No phone number. No references
section** — the CV's reference block contains third parties' personal phone numbers
and must never reach a public site.

**Acceptance**
- [x] No generic filler sentences
- [x] Every claim traceable to a case study, the CV, or the author directly
  (intake answers) — the last category came up mostly in `about.md`/
  `experience.md`, where facts existed nowhere else yet.
- [x] Locale parity — verified per file, most recently a full side-by-side
  read of `home.{en,es}.md`.
- [x] `./scripts/check-terms.sh` passes

---

## TASK 3 — Resolve `[NEEDS INPUT]` · `content` · `DONE`

All four markers resolved with the author, 2026-08-15. `grep -rn "NEEDS INPUT"
resources/` now returns nothing.

1. **`otp-provider-decoupling`** — the rollout never completed: the plan was
   approved and execution began, but the author left the bank before the OTP flow
   was actually cut over to the in-house service. There is no measured P95 or real
   monthly cost, and there will not be one. Reworded `Result` (both locales) and the
   frontmatter `outcome` to present the ~70% figure and the latency numbers as the
   plan's targets, not achieved outcomes — plus a closing note explaining why no
   measured numbers exist. This corrected an overstatement that had also leaked into
   `home.{en,es}.md` and `about.{en,es}.md` (both reworded in the same pass, since
   they cited the OTP result as a completed fact).
2. **`qr-collections-for-merchants`** — ~8 transactions/second through delegated
   collections, ~15% of delegates were not previous bank customers, reached with no
   formal marketing plan. Added as two new `Result` bullets, both locales.
3. **`multi-tenant-biometric-attendance`** — 14 tenants at handover, ~30% reduction
   in HR administrative workload. **Also surfaced a bigger correction while asking:**
   the case study described the isolation model as "database per tenant," but the
   real implementation was a single tenant-shared database for all 14 tenants, with
   a dedicated-per-tenant opt-in path designed but never built. Rewrote the
   "Database" section, the two related "What I would do differently" bullets, the
   `attendance-c4-container` diagram spec, and the two already-generated `.mmd`
   files (`attendance-c4-container.mmd`, `attendance-c4-component.mmd`) to match
   reality — both locales.

`Avícola Sofía` (the holding's real name, confirmed during this session) was added
to `private/glossary.md`. It stays named in `home`/`about`/`experience` per the
2026-08-15 employer-naming policy already in the glossary, and stays generic
("an agro-industrial holding") in the case study and diagrams, unchanged from
before.

---

## TASK 4 — GitHub profile README · `content` · `DONE`

`resources/github/profile-README.md` written, 2026-08-16. English only, per spec.

No live site to link yet (TASK 5 still blocked at the time, and this content
repo has no GitHub remote), so the README's call to action is email + LinkedIn
only — revisit once TASK 5 ships and there's a real portfolio URL.

Audited all 18 public repos on `github.com/Jichimon`. Recommend-only, per the
author — pin/archive/private recommendations and full rationale are in
`progress/2026-08-16-02-task4-github-readme.md`, not executed against GitHub
in this session. Two decisions made with the author during the audit:
`control_asistencia` → make private (hardcoded expired API key, names a
vendor the matching case study omits); the four overlapping OpenTK/graphics
repos → consolidate the public story around `MyFirstGameEngine`, archive the
other three.

---

## TASK 5 — AI Agent Development Harness v2 · `harness` · `DONE`

**Cerrada 2026-08-19.** Doce steps, 13 pasos de gate, 371 tests, 14 incidentes transcritos y cubiertos por 13 eval cases. El export heredado eliminado con cero referencias. La arquitectura queda **congelada**: cambiarla es ahora un work item como cualquier otro.

**11/11 ítems de aceptación pasaron.** El ítem 8 — el smoke test de sesión fresca — quedó deliberadamente sin correr en el cierre de TASK 5 (`P-03`: el silencio se lee como cobertura, así que se declaró abierto en vez de omitido), porque no es auto-administrable: pide que una sesión nueva describa sin ayuda el boundary de git, el flujo spec-first y dónde viven las reglas, y una sesión que acaba de construir el harness no puede dar esa respuesta sin contaminarla. **Corrido y pasado el 2026-08-19**, al abrir TASK 7 con una sesión fresca real — ver `progress/2026-08-19-01-task5-smoke-test-and-session-kickoff.md`. Los otros diez ítems pasaron antes, siete verificados contra artefactos.

**Lo que el harness demostró de sí mismo:** encontró `INC-14` — dos fronteras rung-1 rotas, una de ellas fallando *abierta* — que trece guards, 371 tests y doce pasos del gate no habían encontrado. Y `EVAL-000` concluye que **todavía no puede demostrarse que esté pagando**, porque ningún work item ha corrido a través de él. Ese número llega con TASK 7.



The site is built by agents. The harness those agents run inside has to exist first, and it has to be a harness for *this* project rather than an import from another one.

**Done:** the acceptance suite in `docs/harness/architecture.md` §O step 12 passes, and the inherited export file is deleted with zero references remaining.

Architecture and the full 12-step blueprint: [docs/harness/architecture.md](docs/harness/architecture.md). The single architectural change: the inherited harness was a method with no runtime — every control lived in prose addressed to the agent. v2 keeps the method and adds a control plane underneath it, so that what matters is denied by a guard rather than requested in a paragraph.

| # | Step | State |
|---|---|---|
| 1 | Architecture document + findings resolution — **human checkpoint** | ✅ approved |
| 2 | Rules registry (`.claude/rules/`) — **human checkpoint** | ✅ approved · validated by `check-rules-registry`, 55 rules |
| 3 | Contracts + templates | ✅ done · validated by `check-templates`, 5 templates |
| 4 | Adapter — rewrite `CLAUDE.md` thin — **human checkpoint** | ✅ approved · 154 → 67 lines |
| 5 | Runtime boundary (`settings.json` + hook wiring) | ✅ done · validated by `check-settings` |
| 6 | Guards — pure functions, red-path tests | ✅ done · 5 guards, 153 tests, ~60 red paths. `check-terms` ported to Node and inverted to scan-everything-minus-exclusions |
| 7 | Evidence — trace schema + `record-event` | ✅ done · 6-event schema, dense `seq`, redaction at write time, 8 hook events wired; validated by `check-trace` |
| 8 | Roles — 5 agent files | ✅ done · 5 roles, six posture dimensions each, withheld tools asserted; one enforced write scope; validated by `check-agents`, 7/7 mutants caught |
| 9 | Procedures — `work-item` · `wrap-up` · `evaluate-harness` | ✅ done · 3 skills, router resolves both ways, `done` blocks enforced by `check-procedures`, 3/3 mutants caught |
| 10 | Gate + CI | ✅ done · unfiltered workflow (`INC-08`), inert until a remote exists; `check-docs` resolves every path cited in a living document; 5/5 mutants caught |
| 11 | Evals + baseline `EVAL-000` — **human checkpoint** | ✅ built · 13 cases covering 14 incidents, 1 excluded with a reason; `check-evals` is the twelfth gate step, 13/13 mutants caught. **Checkpoint open on the gap list** |
| 12 | Acceptance, export removal, freeze | ✅ done · 10/11 items green (item 8 needs a fresh session, declared open); found `C-09`/`C-14` claiming gate enforcement that never existed — `check-content` built, 11/11 mutants; export deleted, zero references |

**Constraints**

- `resources/` becomes read-only input, enforced by a deny rule and a guard — not by good intentions. The content backlog is closed; nothing in TASK 5 edits it.
- Stack-dependent rules stay **blank** until TASK 7. Filling them speculatively produces rules nobody believes in, and one disbelieved rule discredits the registry.
- Nothing may reference the inherited export file. Its incidents are transcribed as `INC-01`…`INC-11` in the architecture document.

**Known gap found in this task — closed in step 6**

- `scripts/check-terms.sh` scanned a hardcoded roster of five paths and did **not** cover `docs/`, `.claude/` or `scripts/` — `INC-07`'s failure shape in this repository's own tooling. The port inverted it: 33 terms × 95 files, whole repo minus four exclusions, each exclusion carrying a written reason. The `.sh` file is now a thin wrapper so the documented command still works.

---

---

## TASK 10 — Guard precision follow-ups · `bugfix` · `DONE`

Two defects in the rung-1 guards, both found while building steps 7 and 8, neither urgent enough to interrupt the blueprint but both cheap to lose track of.

**Closed 2026-08-18.** Both fixed. The false positive is gone — heredoc bodies and single-quoted spans are data, double quotes and `<<EOF` still expand, and a redirect is found by tracking quote state rather than by a raw regex, so `echo x > 'evidence/t'` stays denied while `echo 'x > evidence/t'` does not. 8 new tests, 6/6 mutants caught. `G-13` is in the registry at rung 1, with `INC-12` transcribed as its origin and `INC-13` recorded as an incident that confirms `P-14` rather than needing a rule of its own. `INC-13` also gained a permanent source scan for stray control bytes — which then failed on its first real run, against the paragraph describing `INC-13`.

**Decided 2026-08-18 — approved, both.** The human gave the green light to correct both defects. The fail-closed property becomes a registry rule with its own incident id rather than staying an undocumented code-level behaviour: it has a dated origin, it sits at rung 1, and a second case of the same family appeared the same day (a guard whose regex could never match). Scheduled **after blueprint step 9 and before step 11** — the eval cases exercise these guards, and running them against a guard with a known false positive produces results that have to be redone.

**Done:** `checkBashPaths` and `checkGitWrite` no longer fire on a dangerous string that appears inside quotes rather than as a command, with a red test for each; and the registry carries a rule for "a guard that cannot evaluate must deny", with its incident transcribed in `docs/harness/architecture.md` §C.

**Constraints**

- The quoting fix must not weaken detection of the real thing. `shell.mjs` already tokenizes quote-aware; the redirect scan in `checkBashPaths` does not use it, and that is the actual gap.
- Over-strict is the safe direction, but it blocked legitimate work three times in one session — a guard people route around is worse than one that is slightly permissive about quoted text.
- The rule's origin is this session's finding, and it is transcribed as an incident before the rule cites it: a torn `guards.config.json` made the `PreToolUse` hook exit 1, which the runtime treats as non-blocking, so every rung-1 boundary was open for the duration. A rule with no origin is deleted rather than kept (`G-10`).
- The same incident has a sibling worth transcribing with it: a guard whose regex arrived on disk with literal control bytes, so it read correctly in four inspections and could never match. Both are the family *the guard exists and does not protect*.
- The false positive has now fired **five times in one day**, once aborting a patch mid-run without an obvious signal. That frequency is itself the argument: a guard people route around protects nothing.

## TASK 12 — Trace fidelity · `bugfix` · `TODO`

From `EVAL-000` (`GAP-03`, `GAP-04`, `GAP-05`, `GAP-07`, `GAP-08`, `GAP-09`, `GAP-13`). The trace is the substrate every KPI and every eval verdict is read from, and six separate things it records are wrong or missing. They share one surface — the hook writers — so they are one work item rather than six.

The one that matters most: **a run stopped by `maxTurns` is recorded as `COMPLETE`.** `G-06` promises `FAILED` with `budget_exhausted`; no footer on disk has ever said that. A failed delegation is currently indistinguishable from a successful one, which is `INC-06`'s lesson inverted — the agent delivers zero and the trace reports success.


**Two more specimens, 2026-08-25, and they narrow the cause rather than repeating it.** The same session that wrote the triage above delegated two `implementer` slices in parallel. **Both were cut off. Both were cut off inside their verification step, not inside the work.**

| | slice A (`TASK 45`) | slice B (`TASK 39`) |
|---|---|---|
| files owned | 3 | 3 |
| tool calls | 36 | 35 |
| tokens | ~91k | ~84k |
| cut at | mid hand-applied mutation battery, between restoring mutant 2 and applying mutant 3 | immediately before running the gate |
| fragment in place of a report | *"Restoring, and applying mutant 3 (offset bug in the flag-slicing)."* | *"Let's run the full gate now."* |

**This refutes file-count as the sole explanation.** The datum recorded below — *every slice owning more than two files was cut; every slice owning two completed* — predicted these two would be marginal at three files. They were cut, but not while writing files: both had their production edits and their test files landed, and both died in the step that proves the work. The sharper statement of the pattern is therefore **the last step in the brief is the one that gets cut**, whatever it is. When the brief ends in a report, the report is lost; when it ends in a verification battery, the verification is lost — and a half-applied mutation battery is strictly worse than a missing report, because it can leave a **guard mutated on disk** where nothing but that same battery would notice.


**By the end of that session the count was five cut-offs out of five delegated runs, and the last one falsifies the obvious fix.** After the two above, a third and fourth were cut the same way. The fifth was briefed with the mitigation *inverted* — its brief said **measure first, before writing anything**, precisely so the measurement could not be the step that got lost. It was cut anyway, and it produced **zero tests**: the up-front measurement consumed the entire budget, and the run ended having re-derived a baseline the brief had already handed it.

**So reordering the brief does not solve this, and that is the finding.** Moving the fragile step earlier just changes which step is lost. What the five runs share is not an ordering but a shape: **every one of them was briefed to do work AND to prove it in the same run**, and the budget fits one of those, not both. The candidates that remain are a larger budget, or splitting proof from work into two runs — and this item owns the re-measurement that would decide between them. Neither is decided in passing.

**A sixth data point, from the orchestrator rather than an agent.** All five runs were re-driven to completion by `SendMessage`, cheaply, because the orchestrator could see the tree and tell each one exactly what already existed. That is not a fix — it needs a human-supervised session and does nothing for an unattended run — but it does say the loss is **recoverable when someone is watching**, which is a different cost from `INC-06`'s *the agent delivers zero*.


**One mitigation was tried in these two briefs and it worked, partially.** Both agents were instructed to write their `progress/` log **first**, as a skeleton, and update it as they went — explicitly to stop the record from competing for the final turn. **Both logs survived both cut-offs.** So log-first preserves the artifact; it does not prevent the cut. That is a real result for the re-measurement this item owns: the fix is not only a bigger number, it is **ordering the brief so that nothing which must not be interrupted is scheduled last**.


**Triaged 2026-08-25, and the headline clause above is NOT REACHABLE as written. That is this triage's finding, not a status update.** The item was scoped for a session, the substrate was read before anything was planned (`P-04`), and the conclusion is that **no code path in `scripts/` can produce `termination.state: FAILED` or `budget_exhausted`, because nothing in the runtime tells a hook that a budget was hit.**

| What was checked | What was found |
|---|---|
| Does any hook payload carry a turn count, a budget field, or a stop reason for a subagent? | **No.** `evidence.mjs:272-276` writes the string literal `'COMPLETE'` in both branches and the literal `'objective_reported'` on `SubagentStop`, because there is nothing to read. The string `budget_exhausted` does not appear anywhere in the codebase. |
| Does `SubagentStop` even fire when a run is cut off? | **Apparently not.** Five trace files on disk carry a footer and nothing else, with `agent: ""` and a dash-prefixed filename — the artifact of a stop with no `agent_type`. This entry already recorded it from the other side: *"the first stop left none at all"*, the footer belonging to the later resume. |
| Every footer on disk | 35 `objective_reported`, 8 `other`, **zero anything else**, across 79 headers. |

**So the honest outcome is a corrected claim, not a fabricated value** — the same shape this item's own `permission_mode` constraint already grants, arriving one clause earlier. `G-06`'s promise is amended rather than deleted: `maxTurns` really is enforced natively by the runtime; what was never true is that the **trace** records the termination. Amended 2026-08-25 in `.claude/rules/40-agent-policy.md`, per `G-11` — make the claim honest, including downward.

**What stays in scope and is still reachable**, written down so the next session starts from the triage instead of repeating it:

- **`permission_mode` — reachable, and the route is known.** All 79 headers read `"unknown"` because `SessionStart`/`SubagentStart` payloads omit the field. But `PostToolUse` and `PostToolUseFailure` payloads **do** carry it. The value is obtainable; it is simply not on the event the header is written from.
- **`agent: ""` and footer-only files — reachable.** `trace-writer.mjs:78` composes the filename from an empty `agent`, producing `-<id>.jsonl`. A writer that refuses to open a file it cannot name is a local fix.
- **A reused `tool_use_id` — reachable.** `evidence/runs/unknown/orchestrator.jsonl` reuses `"probe"` twice and `"p"` ten times.
- **`run.header` multiplicity — reachable, but under-determined.** 16 files carry two or three headers. The payload cannot distinguish a resume from a cold start: all four headers carrying a non-null `model` still report `reason: "startup"`. So `check-trace` can assert how many are permitted and under what condition, but the once-per-run vs once-per-resume question **is decided, not discovered** — the data does not answer it.
- **The step is red for a cause no agent may clear.** `check-trace` reports 13 orphan `tool.result` events — all `Bash`, all `ok: true`, all `bytes: 15`, across two run directories — where `PostToolUse` fired and `PreToolUse` never recorded the request. `H-03` keeps every agent out of `evidence/`, so clearing them is a human act. **It has been done twice by deleting run directories** (`progress/2026-08-24-01`, `progress/2026-08-24-06`), which is worth naming plainly: the gate has been made green by deleting the evidence.


**Live specimen, 2026-08-24 — four of this item's open criteria now have a real trace behind them, not a hypothesis.** `TASK 15` delegated an `adversarial-auditor` run that stopped without delivering a report and had to be resumed by message. Its trace (`adversarial-auditor-aab270189d54aa26a.jsonl`, read not written — `H-03`) records:

| Observed | What this item promises |
|---|---|
| `termination: { state: COMPLETE, reason: objective_reported }` | `FAILED` with `budget_exhausted` and the budget named |
| **One** `run.footer`, written at the end of the *resume* — the first stop left none at all | a terminating run writes its own footer |
| **Two** `run.header` events in one file (seq 1, seq 86) | `check-trace` asserts once-per-run *or* once-per-resume, and fails a fixture violating it |
| `permission_mode: "unknown"`, `model: null` | at least one header carries a real `permission_mode` |

**The shape is worse than this entry originally described.** The headline defect was *"a run stopped by `maxTurns` is recorded as `COMPLETE`"*. What the specimen shows is that **the failed segment is not recorded at all** — a later resume's footer covers for it, so the failure is not merely mislabelled, it is unrecoverable from the trace. Set beside the same session's `implementer` run, which genuinely succeeded and whose footer reads `COMPLETE / objective_reported` **byte-identically**, the two are indistinguishable. That is `INC-06`'s lesson inverted, exactly as this entry says, now with a specimen.

**Budget datum, for the `GAP-13` re-measurement this item already owns.** `adversarial-auditor` carries `maxTurns: 20` and its trace shows **28 `tool.requested`** before the resume — consistent with hitting 20 turns using parallel calls, so this is not evidence that `maxTurns` went unenforced. What it *is* evidence of: 20 turns is not enough for an audit of any breadth. The same session's `implementer` used **30 of its 30**, right at its cap, and delivered a complete report — which may mean it fit exactly, or may mean it was cut off after the work happened to be done. Neither can be told apart from the trace either, which is the same defect from the other end.

**Done:** a delegated run stopped by its budget writes `run.footer` with `termination.state: FAILED` and the budget named · at least one `run.header` carries a real `permission_mode` rather than the literal `"unknown"` · a delegated run's trace contains `instructions.loaded`, **or** `evidence.md` and `contracts.md` §6 both record that L is orchestrator-only and why · no trace file exists whose only event is a footer, none carries `agent: ""`, and none reuses a `tool_use_id` across two tool calls · `check-trace` asserts whether `run.header` is once-per-run or once-per-resume and fails a fixture violating it.

**Constraints**

- `H-03` still holds: only hooks write `evidence/`. Fixing the writers is in scope; editing a trace is not.
- The `permission_mode` capture may turn out to be unavailable from the hook payload. If so, the honest outcome is a recorded finding plus a correction to `G-04`'s claim — not a fabricated value.
- Re-measure `harness-evaluator`'s turn budget while here (`GAP-13`): it was raised 20 → 60 after a run was cut off mid-analysis, and one completed run is now available as a data point.

**Three more specimens, 2026-08-24, and these are the unambiguous ones.** `TASK 22` ran four delegated `implementer` slices; **three stopped mid-turn without reporting**, each with its work already finished and its report the thing that got cut. That removes the ambiguity this entry records about the earlier implementer that used 30 of 30 and *did* report — the question was whether it fit exactly or was cut after the work happened to be done. Here the answer is visible: the work landed, the account of it did not.

**A sixth followed, and six specimens in one work item is now a pattern rather than a run of bad luck.** The guard slice stopped at **155k tokens across 46 tool calls** with one of its two assertions written and wired, the second still a stub, and `check-site` left **throwing** mid-edit. Its notification read *"Now wire it into checkSite:"*.

**The pattern the six specimens make, stated as a datum rather than a conclusion:** every slice in this item that owned **more than two files** was cut off; every slice that owned **two** completed, twice, including one that was reopened and finished a second time. That is six data points on one role at one budget, in one day, on work of comparable difficulty. It does not by itself say whether the fix is a larger budget, a harder cap on files-per-slice, or a report written before the work rather than after — but it is the first evidence in this repository that the failure correlates with something the orchestrator controls when writing the brief, rather than with the nature of the task.

**A fifth specimen followed the fourth within the hour, same item, same shape:** a markup slice stopped at **149k tokens across 41 tool calls** with six of its seven files written and its notification reading *"Now the two page files."* This one had already been re-cut smaller **once** after the fourth, and consumed everything it needed as finished, verified inputs — no design decisions, no toolchain discovery. It still did not fit. That is a useful datum for the re-measurement: two consecutive cuts of the same work, the second deliberately narrowed, both ending the same way. **The remaining work after the cut-off was one file**, which is what resuming is for — but nothing in the trace says so, and the orchestrator only knew by opening the tree.

**A fourth specimen, 2026-08-24, and it separates two causes that the first three could not.** The layout-shell item delegated a slice owning seven file groups plus a font decision plus a typing fix. It stopped at **228k tokens across 47 tool calls** having produced **one partially-written file**, and its notification carried a fragment — *"Now let's create the tokens.css file."* — where a report belongs.

**This one was not a budget that was too low; it was a slice that was too big**, and the two look identical from the trace. The three specimens above all had their *work* finished and their *report* cut, which is the report-competes-with-the-work shape. This one was cut in the middle of the third file of seven. `P-09` already names the remedy — enumerate objects, never surfaces, and cut the scope rather than hoping — and the re-cut into two slices sharing no file is what shipped. **What the trace cannot tell you is which of the two it was**, and until a footer says `FAILED` with the budget named, every future instance needs a human to open the tree and look. That is this item's whole point, arriving through a fourth door.

**What the shape suggests, for the re-measurement this item owns:** the report competes for the same budget as the work and always loses, because it comes last. One slice's brief added a mutation battery as a required step and that slice was the first to be cut — so a brief that adds a verification step has to buy the budget for it, which is a different finding from *the number is too low*. Both belong here; neither is decided in passing.

**`adversarial-auditor`'s budget belongs in this re-measurement too, and it now has two specimens on one day.** It carries `maxTurns: 20` — the **lowest of the five roles**, against `implementer` and `test-engineer` at 30, `researcher` at 25 and `harness-evaluator` at 60. It is also the only role whose job is running red paths, and a red path is never one call: back the file up, modify it, run the suite, restore it, verify the restore. Five calls to establish one finding.

Both `TASK 15` audits on 2026-08-24 stopped without reporting and had to be resumed by message — the first at 28 `tool.requested`, the second at 29. **The second one is the informative one:** it was deliberately cut to a single question about a single object, precisely because the first had been given six attack categories, and it blew the budget anyway. So this is not only the brief-slicing problem the `work-item` procedure now records; 20 turns does not fit an audit that runs anything.

The precedent for the fix is in this repository already: `harness-evaluator` went 20 → 60 after being cut off mid-analysis, which is the same failure in a different role. Raising this one is deliberately **not** done as a side edit here — a budget is agent policy, it is what `G-06` promises to enforce, and changing it in the same breath as measuring it would leave nobody able to say which number was ever tested.

---

## TASK 13 — Capture K1 · `feature` · `DONE`

**Closed 2026-08-19.** `SPEC-TASK-13-capture-k1.spec.md` approved and implemented test-first, one delegation, first pass clean (K1 = 1 for this item itself). `check-procedures` now fails a dated log (from 2026-08-19 on) whose `done:` block omits an `iterations` dimension, and fails one whose `iterations` evidence isn't a bare integer. `work-item`'s Close step instructs capturing it. Detail: `progress/2026-08-19-02-task13-capture-k1.md`.

From `EVAL-000` (`GAP-10`). K1 — implement→verify passes until the human accepts done — is the metric `contracts.md` §6 calls *"the single most important number here"*, and **no procedure step records it.** `EVAL-000` reports it `unmeasurable` with raw 0 for two independent reasons: nothing has completed under the harness, and even when something does, there will be no substrate to read.

This is what makes TASK 7 a measurement instead of an anecdote, so it lands **before** TASK 7 rather than after.

**Done:** the `work-item` procedure captures an iteration count in the work log, in a shape `EVAL-001` reads without interpretation, and `check-procedures` fails a completed log that omits it.

**Constraint:** an iteration is a human-visible implement→verify cycle, not a tool call. Counting tool calls would produce a number that moves for reasons unrelated to the failure `INC-01` describes.

---

## TASK 14 — Done-blocks detect an omitted dimension · `bugfix` · `TODO`

From `EVAL-000` (`GAP-01`), which downgraded `EC-001` to `Partial` on exactly this. `validateDone` catches a dimension marked `passed` with empty evidence, but a block that simply **does not mention** a dimension passes clean — and omission is `INC-01`'s actual mechanism. The incident was not four dimensions with weak evidence; it was four different meanings of done, each silently missing what the others covered. `P-03` says silence reads as coverage, and the check cannot yet detect silence.

**Done:** a red test presents a done block missing an applicable dimension and `check-procedures` fails; the test fails when the new assertion is removed.

**Constraint:** which dimensions are *applicable* is type-dependent — `ci` is `not_applicable` with no remote, `content` does not apply to a guard fix. Derive the applicable set from the work item's type rather than demanding a fixed roster, or this becomes `INC-07` in a new place.

---

## TASK 34 — The gate reports every step, not just the first failure · `bugfix` · `DONE` · **ran third**

**Closed 2026-08-24.** The run loop moved to `scripts/guards/lib/gate.mjs` as `runGate(steps, run)` with the runner injected, so it is testable without spawning fourteen processes. 12 tests written red before the module existed; 7 hand-applied mutants, 7 killed; guard suite 378 → 390. Red path proven at the CLI, not only in unit tests: step 2 replaced with `process.exit(1)`, steps 3–14 still ran and reported, exit code 1, guard restored. **`dependsOn` exists and no step uses it** — all fourteen were checked and none consumes another step's output, so the mechanism has zero users rather than the list carrying an unstated ordering assumption (`P-13`, `P-16`). **The gate now passes end to end, 14/14, for the first time.** Two claims in this entry had expired before it ran and are corrected below. Detail: `progress/2026-08-24-01-task34-gate-reports-every-step.md`.

**Found 2026-08-23**, while re-cutting the backlog local-first. `scripts/gate.mjs` stops at the first failing step. `check-trace` (step 9) has failed on `TASK 12`'s known correlation gap since 2026-08-19, so **steps 10–13 have not run in any gate invocation since** — `check-docs`, `check-context-budget`, `check-content`, `check-evals`.

`check-docs` turned out to be **red behind it**, with three findings that predate this session: `site/src/content.config.ts`, `resources/testimonials.en.md` and `resources/testimonials.es.md`. Nobody saw them, and "the gate passes up to the known failure" had been reading as "the gate passes". *(**Expired by the time this item ran.** `TASK 31` closed all three on 2026-08-23; run directly on 2026-08-24, `check-docs` passes — 50 documents, 159 references resolved. The claim was true when written. Kept rather than deleted, because a finding that quietly disappears teaches nobody that findings expire.)*

That is `INC-08`'s shape in a new place. `INC-08` was two path-filtered workflows meaning a repo-root guard ran in CI exactly zero times, invisibly; this is one long-lived failure meaning four guards run locally exactly zero times, invisibly. Both are *a check that exists and does not check*, and `T-09` says the gate is one command and is CI parity — a gate that silently verifies nine steps out of thirteen is not parity with anything.

**Done:** the gate runs **every** step and reports a per-step verdict, exiting non-zero if any failed — with a red test proving that a failure in an early step does not prevent a later step from running or reporting. The exit code and the summary must still make a single failure impossible to miss; reporting everything is not the same as burying the failure.

**Constraints**
- **Fail-fast was not a bug, it was a choice** — it makes a broken repository cheap to diagnose. The fix is to keep the loud exit while removing the blindness, not to make failure quieter.
- A step whose *precondition* is genuinely absent should `SKIP` with a reason, which `gate.mjs` already supports; that mechanism is not what is broken here and should not be widened to paper over real failures (`P-03` — silence reads as coverage).
- Sequencing matters where a later step depends on an earlier one's output. If any such dependency exists, it is named and that step alone stays gated on its predecessor; the rest do not inherit the constraint (`P-13` — derive it, do not assume the whole list is ordered).
- **Do not fix `check-trace`'s underlying failure here.** That is `TASK 12`, and `H-03` keeps every agent out of `evidence/` regardless.

---
## TASK 15 — Mutation gate, or an honest rung · `harness` · `DONE` · **ran sixth**

**Closed 2026-08-24.** The gate has a mutation step. `stryker.config.mjs` at the repository root, one config over `scripts/guards/lib/**` and `site/lib/content/**` — the second glob written before that directory exists, which is the whole reason this item ran ahead of the content-layer item. Stryker warns on the empty half rather than erroring, so the premise held.

**The first automated run scored 74.35%, not 100%** — 3,532 mutants, 2,605 killed, 21 timed out, **771 survived**, 135 with no coverage at all, in 2m32s. Every hand-applied battery in `progress/` really was 100%; each was applied to the code its session was changing, and none was ever a measurement of the surface. Nothing in the harness could tell those two apart until something ran over all of it. **316 of the 771 survivors sit in `shell.mjs` (66%), `git-write.mjs` (54%) and `evidence.mjs` (69%)** — the three modules behind the rung-1 boundaries. The guards this repository trusts most have its weakest batteries.

So `break` is the **measured floor, 74**, a ratchet rather than a goal, and `T-03` now reads honestly in both directions (`G-11`): rung 2 for *the score may not fall*, rung 4 for *a surviving mutant is a finding*. `TASK 38` owns the burn-down. `dependsOn` gained its first user — measured against a deliberately red suite, Stryker fails cleanly in seconds, so the dependency is about the gate reporting one root cause instead of two, not about protecting Stryker. `S-07` amended: Stryker's sandbox is rooted at the working directory, so a config in `site/` cannot reach `scripts/`, and the root is not dependency-free. Detail: `progress/2026-08-24-05-task15-mutation-gate.md`.

**Superseded framing follows, kept for the trail.**

**Pulled into the site backlog on 2026-08-23.** *(It ran at position 4 when the sequence held fourteen items; it is position 6 since 2026-08-24 added three. The id never moved — the order is not the id, `G-10`.)* The author asked for *one* command covering every test, and `ADR-006` names mutation as a sub-gate that `gate.mjs` does not yet run. Leaving this out would ship an `npm test` that claims to run all the tests and does not — which is `T-09`'s failure mode arriving through the front door. It runs **before any real site code lands**, so `site/lib/content/**` is covered by the Stryker config's glob the moment `TASK 22` writes it, rather than retrofitted afterwards.

From `EVAL-000` (`GAP-02`). `T-03` places the mutation gate at **rung 2**; `scripts/gate.mjs` has thirteen steps and none is a mutation run. Every mutation result in `progress/` was produced by hand. The rung claim is therefore ahead of reality, which is the same defect step 12 found in `C-09` and `C-14`.

**Unblocked 2026-08-19** — `TASK 7`'s decision 5 (`ADR-006`) fixed the tool: Stryker Mutator + `@stryker-mutator/tap-runner`, `break: 100`, one config over `scripts/guards/**` (and, once it exists, `site/lib/content/**`). **Either outcome closes this:** the gate runs mutation over `scripts/guards/**` and a surviving mutant fails it, **or** `T-03` reads rung 4 with the reason recorded. `G-11` requires the honest claim, including downward.

**Done:** `T-03`'s rung matches what the gate actually enforces, and if it stays at 2, the gate enforces it.

---

## TASK 38 — Ratchet the mutation score toward 100 · `harness` · `TODO` · **ratchet turned once, 2026-08-25**

**THE RATCHET TURNED, 2026-08-25: `break` 74 -> 74.5 against a re-measured 74.74%.** That is this item's stated close condition — *raised at least once against a re-measured score, with the new floor recorded and the survivors it represents named* — and it is met. The item stays open because it closes on a ratchet, not on perfection, and re-opens as often as the floor can move.

| | at session start | now |
|---|---|---|
| aggregate | **70.02%** (below a break of 74 — the gate step was red) | **74.74%** over 4,773 mutants |
| `git-write.mjs` (`H-01`) | 54.38% · 73 survivors · 26 uncovered | **85.71%** · 31 survivors · **0 uncovered** |
| `shell.mjs` (the tokenizer both path guards sit on) | 66.21% · 146 survivors · **no test file at all** | **80.73%** · 84 survivors · 58 tests |
| `site/lib/behavior` | 0.00% over 111 mutants, uncoverable by any runner here | **out of the mutated surface** |
| guard suite | 453 tests | **609 tests** |

**Two of the three files this entry named as "start here" have left the danger list; the third has not, and this item is therefore NOT fully closed against its own Done.** `git-write.mjs` is rank 21 of 26 and `shell.mjs` rank 20, but **`evidence.mjs` (68.77%, 119 available) is still the second-worst file in the repository** and was never touched this session. The Done clause *"the three modules above are no longer the three worst"* is met **2 of 3**, and saying so is cheaper than discovering it next time. **`site-structure.mjs` at 59.66% — 1,046 mutants, 317 survivors, 105 uncovered, 422 available — is now the worst**, and it is where the next scoped pass goes.

**The timeout-variance risk stopped being hypothetical within the hour.** The run that set the floor read **74.74%**; the gate's own run minutes later, with **no code change at all**, read **74.63%** — a 0.11-point drift, leaving 0.13 of slack against the 74.5 floor. That is the mechanism this item warned about, observed rather than predicted: timeouts count as killed and their count is timing-dependent. The floor still holds, and the response if it ever does not is more kills, never a lower number.

**The slack is 0.24 points and that is thinner than it looks.** Timeouts count as killed and their count is timing-dependent: runs on this surface have reported **21, 45 and 66** timeouts. A drop from 66 to 21 is 45 fewer kills — **0.94 points** — enough to fail the threshold on a slower machine with no code change at all. Recorded in `stryker.config.mjs` beside the number rather than left to be discovered by whoever hits it. The answer if it happens is more kills, never a lower floor.

**Named survivors, so the next pass starts from a list rather than a re-measurement:** 31 in `git-write.mjs` · 84 in `shell.mjs`, grouped into 7 families in `progress/2026-08-25-04` (largest: backslash-escape-before-closing-quote logic duplicated across three functions but exercised only through `tokenize`; and the `$(...)` depth-tracking branch in `splitSegments`) · 422 in `site-structure.mjs`, unexamined.


**Measured again 2026-08-25, and the behaviour-tier question is answered.** The architectural question this entry opened was decided by the author in favour of **honouring `ADR-008`'s own tree**: the tier moved from `site/lib/behavior/` to `site/src/behaviour/`, the home sub-decision 1 had declared all along and which the layout-shell item had not used. It cost no rule change, no glob negation, and left `mutation-suppressions.test.mjs`'s property untouched — the two answers that would have weakened it were rejected. Nothing in `site/lib/**` imported the tier; only `BaseLayout.astro` did, through two dynamic imports. Verified after the move: 2 files, 15 tests, green under Vitest. `ADR-008` carries the dated amendment.

**`shell.mjs` got its missing test file, and it moved the most of anything here.** It had no colocated battery at all and was exercised only through the two guards built on it. Now **58 tests, and 66.21% → 80.73%** — 441 mutants, 84 survivors, down from 146. The 84 remaining are grouped into 7 named families in `progress/2026-08-25-04-task38-shell-test-battery.md` rather than counted.

**The floor was NOT raised, and that is the honest outcome rather than a deferral.** The full run after all of the above scored **73.06% over 4,773 mutants** — 3,416 killed, 66 timed out, 1,046 survived, 238 with no coverage. `break` sits at **74**, so the gate's mutation step is **still red, by 0.94 points**. Raising the floor against a score that is below it would be the exact move `ADR-006` forbids, and lowering it to 73 would make the ratchet something that accommodates its result.

**An effect worth naming, because it will recur and looks like a regression.** Two files this session improved went *down*: `terms.mjs` 80.95 → 74.12 and `gate.mjs` 86.44 → 80.41. Neither got worse — both **grew**, and the new code carries proportionally fewer kills than the old. This entry already records that *a percentage floor can be gamed by adding well-tested code*; this is the same coin's other face, and it means a session that adds real code can lower the score while improving the repository. The mitigation is unchanged: ratchet often enough that the slack stays small.

**Also added while here:** `stryker.config.mjs` gained the `json` reporter. The only machine-readable artifact of a run was a 2.3 MB HTML file with the report embedded as a JS assignment, which is not something a ratchet can read reliably — and this item's whole deliverable is a number read off a run.

**Where the remaining deficit sits, measured:** `git-write.mjs` **54.38%** (217 mutants, 73 survivors, 26 uncovered — the worst file in the repository, and the guard behind `H-01`) · `site-structure.mjs` **59.66%** (1,046 mutants, 317 survivors, 105 uncovered) · `evidence.mjs` **68.77%** (381 mutants, 97 survivors). **51 kills anywhere crosses 74.**


**The score is BELOW the floor as of 2026-08-25, and this item is no longer only a burn-down.** The layout-shell item measured **70.02 against a break of 74** over 4,713 mutants. `break` was not lowered — it ratchets up and does not come back — so the gate’s mutation step is red until this runs.

**The breakdown, so nobody re-derives it or blames the wrong half.** `site/lib/nav` scored **100.00%** (38 mutants, zero survivors) and `site/lib/content` held at 92.62%. `site/lib/behavior` scored **0.00%** across 111 mutants — none covered, because its tests are `.component.test.ts` and Vitest runs them, which the tap runner does not drive. **That is the tempting explanation and it is not the main one:** removing all 111 from the denominator gives 71.71%, still short. The behaviour tier accounts for **1.69 of a 5.64-point fall**. The rest is `scripts/guards/lib/site-structure.mjs` at **59.66% over 1,046 mutants, 317 survivors and 105 uncovered** — a file that grew by two guard functions in that item and is now the largest single deficit in the repository.

**An architectural question has to be answered before or alongside the burn-down, and it is the author’s.** `ADR-008`’s tree contracts the core as *"Node ESM, no Astro, no Vite — node:test runs it, Stryker mutates it."* The behaviour modules are Node ESM with no Astro **and need a DOM**, so neither half of that sentence is true of them. There is no declared home for *framework-free but DOM-requiring*. An exclusion was tried and correctly refused by `mutation-suppressions.test.mjs`, whose property is that the mutate globs exclude test files and nothing else — *"the worst-scoring file is exactly the one it would be tempting to drop."* Three answers, each with a different cost: widen that property to permit a reasoned, differently-covered surface; move the tier out of the mutated core; or leave the step red until this item lands.

**Where these two run, agreed with the author 2026-08-24 so nobody re-derives it.** Neither is site work and neither blocks the localhost milestone, so both sit outside the seventeen-item sequence — but "outside the sequence" is how an item quietly becomes never, and that is what this note prevents.

- **`TASK 39` runs immediately before the design-fidelity item**, not before the first page. The tempting argument — *a step added to a blind gate is never verified*, which is what pulled `TASK 34` in at position 3 — is weaker than it looks here: every item that adds a step must already prove it in red (`T-04`, `P-14`), so a dead step is caught the day it is written. The blindness is about later decay, not day one. What makes the fidelity item the right neighbour is that its entire value is a diff that actually runs.
- **`TASK 38` never runs as a block.** One scoped pass on `git-write.mjs` alone — one file, 73 survivors, 54%, the guard behind `H-01` — which fits in a session. The rest runs on a **trigger, not a slot**: a session that touches a module under `scripts/guards/lib/**` kills that module's survivors before it closes. The ratchet then rises on its own and never competes with the site.

Opened 2026-08-24 by `TASK 15`, the moment the mutation gate produced its first real number. **780 mutants survive** across `scripts/guards/lib/**` (measured at TASK 15's close; 771 at its first run, before that item's own module existed), and the gate's `break` sits at the measured floor of 74 rather than at the 100 `ADR-006` specified. That is honest, and it is not where this should stay: `T-03` says a surviving mutant is a finding, and 780 findings that nothing acts on are 780 statistics.

**Not site work, and deliberately off the site sequence** — it does not block the localhost milestone, and it is sized to be picked up between items rather than in one run.

**Start here, and the order is not arbitrary.** 316 of them sit in three files, and those three are the rung-1 boundaries:

| File | Score | Survivors | The boundary it enforces |
|---|---|---|---|
| `git-write.mjs` | 54.38% | 73 | `H-01` — no agent invokes a git write |
| `shell.mjs` | 66.21% | 146 | the quote-aware tokenizer every path guard is built on |
| `evidence.mjs` | 68.77% | 97 | `H-03` — the trace only hooks may write |

`P-14` says a guard is not trusted until it has been proven in red. A 54% mutation score on the guard behind `H-01` is a measured statement that nearly half its battery proves nothing — and `INC-14` already found two rung-1 boundaries broken, one failing *open*, which is what this number looks like from the inside.

**Eleven more survivors arrived 2026-08-24 with the content core, and they are named rather than counted.** `TASK 22` wired the mutation runner to `site/lib/content/**` — the surface had 149 mutants and **no test file had ever been handed to the runner to kill them**, so the aggregate was 72.11 and the gate was failing. Wired, that surface scores 92.62: **8 survivors in `locale-pair.mjs`, 3 in `internal-link-localizer.mjs`**, 0 without coverage. The two sibling modules are at 100. The measured floor moved 74.35 → 75.66 and `break` was deliberately **not** raised, because raising it against a re-measured score is this item's own deliverable and doing it in passing would leave nobody able to say which number was tested.

**Done:** `break` in `stryker.config.mjs` is raised at least once against a re-measured score, with the new floor recorded and the survivors it represents named — and the three modules above are no longer the three worst. Closing at 100 is the eventual goal; **this item closes on a ratchet, not on perfection**, and re-opens as often as the floor can move.

**Constraints**

- **A survivor is killed by a test or excluded at the mutant, never by lowering the floor** (`ADR-006`). `mutation-suppressions.test.mjs` fails a suppression with no written reason, so an exclusion cannot be quiet.
- **Do not exclude the `Regex` or `StringLiteral` mutators to buy back score.** Together they are 433 of the 771 measured at first run, and it is the obvious move; `TASK 15` rejected it, and the reasoning is in `ADR-006`'s 2026-08-24 amendment. `INC-13` was a guard whose regex could never match.
- **A percentage floor can be gamed by adding well-tested code.** Stryker offers no absolute-count threshold, so the mitigation is frequency: ratchet often enough that the slack stays small.
- **`shell.mjs` has no colocated test file at all**, which is most of why it is second-worst (66.21%, 146 survivors). It is exercised only indirectly, through `path-boundary.test.mjs` and `git-write.test.mjs` — and it is the quote-aware tokenizer both of those guards are built on. A `shell.test.mjs` is likely the single highest-value file this item can add, and `T-08` puts it beside the code.
- Every test added here is judged by `T-07` — assert what the caller observes. A test written only to kill a mutant, asserting an internal, is `INC-02`'s shape arriving through the fix rather than the defect.

---

## TASK 39 — A gate step that never ran must not report PASS · `bugfix` · `DONE`

**Closed 2026-08-25.** Three deliverables, all with red batteries; `gate.test.mjs` 12 → 20 tests, 3 hand-applied mutants killed.

**1 · A third state.** `runGate` returns `incomplete`; the exit code is `1` on FAIL/BLOCKED, **`2`** when nothing failed but steps did not run, `0` only when every step passed. The headline reads `GATE INCOMPLETE` and names them. `skipIf` is untouched — `SKIP` stays a legitimate verdict, and what was wrong was the headline and the exit code, not the mechanism. The existing assertion at `gate.test.mjs:65-77`, which asserted `exitCode === 0` on a skip, was **inverted rather than left standing beside a new one**.

**2 · Liveness.** The runner contract widened from *returns a number* to `{ code, stdout }`, and a step that ran zero tests is derived from `node:test`’s own summary line, independent of exit code. A step producing no such line — a plain `check-*` guard — is judged on exit code alone, so nothing that is not a test runner is penalised. **Derived, never enumerated** (`P-13`): a hardcoded per-step count would have been the same roster in disguise.

**3 · `dependsOn` takes several predecessors**, so `mutation` can declare both test steps instead of only one. **Proven live rather than only in unit tests:** in the closing gate run `mutation` ran and reported its own failure instead of being `BLOCKED` behind a single predecessor. Chaining the two test steps was considered and rejected — it would block a genuinely independent second failure behind the first, which is the blindness `TASK 34` was opened to remove. Detail: `progress/2026-08-25-02-task39-gate-liveness-and-skip.md`.

**The evidence for that decision arrived the next day and it is not marginal.** Between the tier landing and the layout shell closing, `astro check` accumulated **19 type errors** — eighteen missing annotations across two test files and one real assignment defect in a layout — and **nothing anywhere went red**. Every one was written by a delegated run that had verified its own work with the test runner. A type-check that exists as a script and is wired into nothing is a type-check that does not exist, and the cost of adding it as a gate step is one line.

**A second live specimen, found 2026-08-24 by `TASK 44`, and it is not a gate step — which is why it is worth recording here.** `npm run check` in `site/` printed a fatal diagnostic (`astro check` refusing to run against TypeScript 7, whose native compiler does not expose the programmatic API it needs) and **returned exit code 0**. Nobody had noticed, because that command is not wired into the gate — so the property this item owns was being violated in a place the item’s own framing does not reach. The immediate cause was fixed by pinning TypeScript to `^6.0.3`; the exit-code behaviour belongs to Astro’s CLI and is not this repository’s to fix. **What is this repository’s:** deciding whether `astro check` becomes a gate step, since a type-check nobody runs is a type-check that does not exist. Noted rather than opened as its own item, because it is this item’s property arriving through a different door.

Opened 2026-08-24 by `TASK 15`'s adversarial audit. Two findings, one shape, and neither belongs to the item that found them — they are properties of `gate.mjs` and predate it.

**1 · A step can exit 0 without running anything.** Measured: `node --test "scripts/guards/**/*.nosuchtest.mjs"` exits **0**. `scripts/gate.mjs` reads `spawnSync(...).status ?? 1` and nothing else — no output assertion, no test-count floor, no liveness check on any of the sixteen steps. So if a test file is deleted or renamed, `guard tests` still passes and the check it carried vanishes with no signal. `TASK 15` put the Stryker-suppression check in a *test file* precisely because `sources.test.mjs` set that precedent — which means that check inherits this hole.

`TASK 15` hit the loud half of the same coin and survived it: `spawnSync('npx', …)` returns `status: null` on Windows, `?? 1` turned it into a FAIL, and the defect was found in minutes. Had the spawn returned 0 instead, the step would have reported `PASS` forever.

**2 · A skipped step still exits 0 and prints `GATE PASSED`.** `runGate` filters failures to `FAIL` and `BLOCKED`, so a `SKIP` leaves `exitCode: 0`. The skip is announced — *"N step(s) skipped — declared, not silent"* — but the headline and the exit code both say the gate passed. Realistic triggers now that the root carries dependencies for the first time: a clone where someone installed only in `site/`; `npm ci` under `NODE_ENV=production`, which omits devDependencies entirely.

That is `INC-08` in the gate itself: *a check that exists and does not check*, invisibly. `T-09` calls the gate CI parity, and a gate that reports PASS while a step did nothing is parity with nothing.

**Done:** a step that produced no work is distinguishable from one that passed — a red test proving that a step whose command runs zero tests does not report `PASS`; and the gate's exit code and headline reflect skipped steps rather than reporting `GATE PASSED` over them.

**Constraints**

- **`SKIP` is a legitimate verdict and must stay one.** `check-site` skipped honestly for weeks before `site/` existed, and the mutation step must skip on a fresh clone rather than fail confusingly. What is wrong is the *headline*, not the mechanism — do not fix this by deleting `skipIf` (`P-03`: silence reads as coverage, but so does a green summary over a skip).
- **Derive liveness, never enumerate it** (`P-13`). "Each step declares the minimum work it must have done" is a roster in disguise if it becomes a hardcoded per-step count. A test-count floor read from the runner's own output is a property; `expect 433 tests` is a number that rots the next time someone adds a test.
- **A third finding, same file, opened 2026-08-24 by `TASK 22`:** `dependsOn` takes a **single** predecessor and `assertDependenciesResolve` requires it to be an earlier step. The gate now has two test steps — `guard tests` and `content core tests` — and the mutation step can only declare one of them. A broken content-core test therefore fails **two** steps for one root cause: its own, and `mutation`, whose Stryker run dies on the failed initial test run. Chaining the two test steps was considered and rejected: it would block a genuinely independent second failure behind the first, which is the blindness this item's sibling was opened to remove. The fix is for `dependsOn` to accept several predecessors, which is a `runGate` change and therefore needs its own red battery (`T-04`).
- Do not widen this into re-plumbing `runGate`. `TASK 34` extracted it so it is testable without spawning sixteen processes; that is the seam to use.

---

## TASK 40 — Code readability: names and comments · `research` · `DONE` · **ran seventh**

**Closed 2026-08-24.** `ADR-008` sub-decision 7 accepted, three options weighed. `S-08`, `S-09`, `S-10` in `.claude/rules/50-implementation.md`, path-scoped to `site/**` so the always-loaded budget is untouched. `checkCommentsCarryNoExternalReference` added to `site-structure.mjs`: **13 tests written red before the function existed**, guard suite 440 → 453. Proven in red at the CLI against the real tree, not only in unit tests — a planted `<!-- tracked in TASKS.md, see progress/ -->` failed `check-site`, and the restore was verified byte-identical.

**The guard found a real violation on its first run**, in the only source file the site had: `site/astro.config.mjs` carried three references in two comment lines — `ADR-001`, `ADR-004`, `SKEL-004`. Rewritten to one line naming the single thing the code cannot say, which is what `compat` does.

**Two things this item ran into, both worth keeping.** `G-13` fired against the session that wrote it: a bad backslash escape left `guards.config.json` as invalid JSON, the `PreToolUse` hook could not parse its own config, and **every tool call was denied** — Bash, Edit, Write and Read alike — until the author fixed one line by hand. That is `INC-12` inverted and the exact cost `G-13`'s row already declared in writing: *loud, correct and recoverable, against a failure that was silent and total.* It is the first time that rule has been exercised by a real case rather than by a fixture. No new incident id was minted: `G-13` already describes this, and the rule behaved as specified.

And `check-docs` rejected the ADR for citing a module path under the content core that does not exist yet — the mechanism sub-decision 7 leans on, proving itself against the paragraph that describes it. Recorded in the ADR rather than quietly fixed.

**Also reconciled while here (`P-07`):** `TASK 15` amended `ADR-008` inline on 2026-08-24 and never added the level-2 row or flipped the level-1 status. That is `P-07`'s characteristic failure — doing the obvious half — and it was found by the next session rather than by the one that caused it. Both are now in `docs/adr/README.md`.

**The three constraints, in the author's terms:** comments short and concise, unrelated to any document outside `site/`, used only where the code cannot speak for itself; and names verbose enough that what each variable, class, function and file is for — and what state it holds — reads without leaving the file.

**Done:** `ADR-008` carries the sub-decision, accepted and indexed; `50-implementation.md` carries the three rules with `ADR-008` as their origin and a rung matching what is actually enforced (`G-11`); `check-site` fails, in a red test, on a `site/` file whose comment references an external document.

**Constraints**

- **Only the reference ban is mechanizable, and the split is stated rather than blurred.** Comment density and name quality stay rung 4. A comment-per-line ratio and a minimum identifier length are numbers that rot, and the second produces `i` → `indexValue`, which is noise wearing compliance.
- **The reference set is derived, never listed** (`P-13`): the repository's own top-level entries, read from disk, plus an id pattern in config. A directory added next month is covered with no edit.
- **`scripts/` is untouched.** The harness cites rule ids inline on purpose. `50-implementation.md` is path-scoped to `site/**`, so the line between the two trees already existed.
- **Quoted text is data** (`TASK 10`). A `base: '../resources/site'` in a string is the code doing its job; the scanner is quote-aware or it becomes a guard people route around.

---

## TASK 41 — Playwright smoke tier · `harness` · `TODO`

Split from `TASK 27` on 2026-08-24, with the author. `TASK 27` bundled two things of very different cost: verifying that the site actually works, and building a three-way component-level diffing framework. The first belongs beside the pages; the second does not block the milestone and now runs after it.

**Deliverable:** Playwright installed in `site/`, `site/playwright.config.ts`, specs under `site/tests/e2e/` (`T-08`), and a gate step.

**Done:** every route derived from the content collection returns 200 in both locales; **the 404 returns a real `404` status, never a `200` carrying error copy**; no page logs a console error; screenshots are captured at 1440 / 1024 / 390 in both themes for the author to judge; and a deliberately broken route fails the step, proven in red before the step is declared done.

**Constraints**

- **Routes are enumerated from the collection, never from a list in the test file** (`P-13`). `docs/design/canvas/verify.mjs` already does exactly this and is the pattern to copy.
- **A gate step proven only in green is a step that never ran** — which is `TASK 39`'s finding, still open. Do not add a seventeenth step without a red path (`P-14`, `T-04`).
- **This is not the fidelity diff.** No artboard comparison, no tolerance, no prod target. Claiming otherwise would make `TASK 27` look done when it is not.
- `npm start` is the production build; the suite runs against the built output, never a dev server (`INC-03`, `T-02`).
- **The file cap is 6 and `site/` already holds four.** `playwright.config.ts` takes it to five (`S-03`).

---

## TASK 42 — The test and mutation globs cover one subfolder, not the core · `bugfix` · `DONE`

**Closed 2026-08-24.** All four globs now read `site/lib/**`: the unit-runner row and the sub-gate row in `30-testing.md`, the gate step’s command, and Stryker’s `mutate` and `tap.testFiles`. The step is renamed **`site core tests`** and its `skipIf` guards `site/lib` rather than `site/lib/content`, so a checkout without the core still declares the gap out loud instead of passing on nothing.

**The red path returned a sharper result than the item predicted.** A deliberately failing test was planted in a sibling directory under the core. `node --test "site/lib/content/**/*.test.mjs"` **exited 0** — not skipped, not warned, *passed*, with a failing test sitting in the tree — while the widened glob exited 1 and printed it. The planted file was removed and the suite re-run green. The defect was never hypothetical: it was one directory away, and it would have been invisible on arrival.

**The mutation half is verified in the shared pass that closes the layout-shell item, and `break` is re-measured there rather than here.** A wider `mutate` glob is a new denominator, so `74` was stale the moment these globs changed — but the shell lands two more mutated guard functions in the same stretch of work, and measuring twice would price two intermediate denominators nobody will ever use. Deferred on the author’s instruction, with the reason recorded so a stale threshold does not read as an unnoticed one.

**`ADR-006`’s first review trigger fired and resolved in the negative, in the same change.** It asked whether the core’s eventual code would need Vite’s runtime to test meaningfully and said it stayed open because that code did not exist. It exists now — four modules, 26 tests, every one running under plain `node --test` with no Astro in the import graph. Vitest is **not** introduced for this surface and the second Stryker config stays declined. Detail: `progress/2026-08-24-09-task42-task44-globs-and-component-tier.md`.

**Superseded opening note follows, kept for the trail.**
Opened 2026-08-24 by `TASK 22`. Both unit-test globs and Stryker's `mutate` glob name **`site/lib/content/**`**, not `site/lib/**`. `ADR-008`'s tree plans two more directories beside it — `site/lib/i18n/` for locale URLs and `site/lib/nav/` for nav structure — and **the day either gets its first file, that file is outside the gate step and outside the mutation run, silently.**

`TASK 22` avoided it by putting everything it wrote under `content/`, including a link localizer that arguably belongs in `i18n/`. That was the cheap choice for one item and it is not available to the next one: the layout-shell item owns the nav data module, and `ADR-008` names its location.

This is `INC-08`'s shape — *a check that exists and does not check* — arriving through a glob rather than through a path filter. The narrowing was written before any of this code existed, when `content/` was the only directory anyone had imagined.

**Done:** the unit-test glob in `30-testing.md`, the gate step's command and Stryker's `mutate` and `testFiles` globs all cover the surface the rules actually describe — with a red test proving a file in a sibling directory under the core is run and mutated, and `ADR-006` reconciled to match (`G-11`).

**Constraints**

- **Widening is the safe direction and still needs measuring.** More mutants means a new denominator; re-measure the floor rather than assuming the number holds.
- `S-06` already scopes the whole of `site/lib/**` as framework-free, so the rules disagree with each other today: one surface, two boundaries. Fix the globs, do not narrow `S-06`.
- Do not fold in the ratchet item's burn-down. This item makes the net cover the surface; killing what it catches is the other item's job.

---

## TASK 44 — Component test tier: Vitest, jsdom, `@testing-library/preact` · `harness` · `DONE`

**Opened and closed 2026-08-24**, pulled into the sequence ahead of the layout-shell item for the same reason the mutation-gate item was pulled in ahead of any site code: a test tier installed *inside* the feature item that uses it is a tier whose own red path never gets proven. The shell lands the first two DOM-requiring modules — the scroll-spy and the theme toggle — and `ADR-006`’s 2026-08-23 amendment had decided the tier without anyone building it.

**Delivered:** Vitest 4.1.11, jsdom 29.1.1 and `@testing-library/preact` 3.2.4 in `site/`; `site/vitest.config.ts` built on `getViteConfig()` so a test imports what the site imports; and an **eighteenth gate step**, `component tests`.

**Two decisions worth not re-deriving.** The two unit runners are separated by **suffix** — `.component.test.ts` for Vitest, `.test.mjs` for `node:test` — because their default globs overlap, the extension alone cannot separate them, and a directory split would have meant a module’s *location* decided its runner rather than its nature. And **`passWithNoTests` is deliberately off**: with it on, renaming that suffix would make every test in the tier vanish and the suite stay green forever. The legitimately-empty case is handled where it is visible instead — the gate step skips itself with a written reason (`P-03`).

**Proven in both directions before being declared done** (`P-14`): a failing DOM assertion under the new suffix exits 1 and the step fails; the same test flipped green exits 0; the planted file was then removed. A third mechanism was added in passing — a gate step may declare its own `cwd`, because a package-scoped runner has to start inside its package to resolve its own config. The root stays the default.

**The tier is outside the mutation surface, and that is declared rather than silent:** `D3` scoped mutation to parsing, joining and validating, and covering a Vitest surface needs a second Stryker config and a second invocation — the cost `ADR-006` priced and declined.

---

## TASK 46 — Two rail strings the interface-strings collection does not carry · `content` · `DONE`

**Closed 2026-08-25.** `ui.{en,es}.md` carry `rail.wordmark` and a top-level `socials` group, author-written, byte-identical in both locales, each with its traceability row — the English file cites `Main.dc.html` 425 and 448, the Spanish `HomeES.dc.html` 425 and 448, all four verified against the artboards. `RailSocials.astro` renders the list from data with the `·` as a CSS `::before`, hidden under `@media (max-width: 820px)`. **Verified against the built output, not against a guard:** both links are present in `dist/index.html` and `dist/es/index.html`, and the hide rule survives into the compiled CSS. `check-site` reports **0 findings** — the declared `SITE_IDENTITY_NAME` violation is gone. `astro check`: 0 errors, 0 warnings.

**The finding this item produced is worth more than the item.** The first pass made the two props **optional with a silent default**, because the orchestrator had fenced `site/src/layouts/` and `site/src/pages/` off from the delegated slice — and those were exactly the files the wiring needed. The result: `check-site`, `astro check` and `astro build` were **all three green over a feature that rendered nothing**, because `BaseLayout.astro` passed neither value down. It was found by grepping the built HTML, not by any guard. Both props are now required, so the type system enforces the wiring. **`check-site` passing never meant "renders" — it meant "no string literal escaped the gateway",** and those are different propositions. Detail: `progress/2026-08-25-03-task46-rail-socials-wordmark.md`.

**Opened 2026-08-24 by the layout-shell item.** The design’s rail carries GitHub and LinkedIn links below the theme toggle, and they are the one rail element the responsive contract specifies to **disappear below 820px** — on a phone, language outranks a profile link. **The interface-strings collection carries no `socials` group**, so both the labels and the two URLs exist only in an artboard.

**The block was correctly omitted rather than invented**, which is this project’s standing rule — a section is omitted when its content is absent — and `resources/**` is read-only to every agent, so inventing the strings would have been the only alternative and would have been the actual error. Recorded so the omission reads as a decision rather than as something nobody noticed.

**The wordmark is the second one, and it is the sharper case.** The rail prints the author’s name as the site’s only way home — there is no `Home` nav item, by design, so the wordmark carries that job alone. It **cannot** be omitted the way the socials block can, so the layout-shell item rendered it as a literal and **declared the violation in the file rather than burying it**. It is the one place the shell does not satisfy the no-strings-outside-content rule, and the guard built in the same item will report it — correctly. The value is identical in both locales, so there is nothing to translate; it needs a key, not a translation.

**Done:** `ui.{en,es}.md` carries a `socials` group and a wordmark key, each with its traceability row; the rail renders the socials block with its below-820 hiding rule and reads the wordmark from content; and the string guard reports zero findings.

**Constraints**

- **The author writes the content**, not an agent. The two URLs are the author’s own public profiles and the labels are visible strings, so both belong in the content file under the same rule as every other chrome string.
- **The list must be data, not markup.** A third profile is a new entry in the content file and nothing else — the same criterion every other list on this site is held to.
- **The hiding rule is part of the deliverable.** The block is the one piece of rail chrome that is deliberately dropped at narrow, and a version that survives to 390px is not the design.

---
## TASK 45 — The confidentiality guard matches substrings, and a short term collides forever · `bugfix` · `DONE`

**Closed 2026-08-25.** The decision, recorded: **per-term word-boundary opt-in**. `private/banned-terms.txt` gains a wrapped flag syntax — `\b <term> \b` — and the author marks the one colliding term; the other 32 keep substring matching. The three rejected answers and their costs are in the work log. `terms.mjs` 22 → 30 tests, four red paths seen to fail first; 5 hand-applied mutants, 5 killed, source restored byte-identical.

**The item reproduced its own failure mode before it was fixed, which is the useful part.** The flag was written to disk before the parser existed, so `parseTerms` read the whole line as a literal term, escaped it, and matched nothing — `check-terms` reported **PASS with that term entirely unprotected**. That is `INC-13`’s family arriving through the fix rather than the defect. The guard therefore now **fails the run, naming the line number, on a half-formed flag** (`G-13`: a guard that cannot evaluate must deny) rather than degrading to a literal in silence.

**Liveness proven against the real term list, not against fixtures.** Run from the orchestrator (`H-04` denies the file to delegated roles only), printing no term: 33 parsed, 1 flagged, 32 substring. The flagged term matches standalone and at start of line; stays clean against a trailing digit, inside the registry tarball path, and glued to letters; and **25/25 unflagged single-word terms still match inside compound identifiers** — which is what proves the decision is per-term and not global. **Known limit, recorded rather than discovered later:** `\b` does not exist between a letter and a digit, so `<term>-something` would still collide. The flag is deliberately kept equal to the regex primitive — a per-term human decision needs to be predictable, not clever. Detail: `progress/2026-08-25-01-task45-terms-word-boundary.md`.

**Opened 2026-08-24 by `TASK 44`.** Installing the component tier pulled in a transitive dependency whose **npm package name contains a banned term as a substring**. `check-terms` matches case-insensitively with **no word boundary**, so the generated `site/package-lock.json` now fails the confidentiality step in four places. No authored content is involved, nothing was published, and the containing text is a public package name from the public registry.

**This is the same family as `TASK 37`**, which fixed integrity-hash false positives on 2026-08-24 — and that fix was scoped to opaque *fields*, explicitly keeping package names and resolved URLs scanned. That was the right call then: a package name genuinely could carry a leak. It is also exactly what this walks into now, which is why this is a decision rather than a patch.

**Done:** a decision, recorded, on which error direction costs more, and the guard reflecting it.

**Constraints**

- **Four candidate answers, none free.** Word-boundary matching trades this false positive for a class of false *negatives* — a term embedded in a compound identifier would stop matching, and compound identifiers are exactly where an internal system name shows up. Treating lockfile package-name and URL fields as opaque reverses `TASK 37`’s deliberate call. Excluding generated lockfiles wholesale is the weakest and the file is committed. Leaving it is the worst: **a gate step nobody can make green is a gate step people learn to ignore**, which is how a confidentiality check dies.
- **`C-07` applies to the fix, not only to the content.** This must not be routed around — the answer is a stated decision about matching semantics, never an exclusion added quietly to make a red step green.
- **It recurs on every install.** This is not a one-off to wait out; the next dependency with a short colliding name reproduces it.

---
## TASK 43 — Concurrent writes happened, and the deferred remedies name a different actor · `harness` · `TODO`

Opened 2026-08-24 by `TASK 22`. `40-agent-policy.md` defers two mechanisms — **enforced write scope for `implementer`/`test-engineer`**, and **worktree isolation as a default** — and both name the same trigger: *concurrent writes*. The trigger fired.

**It did not fire the way either row anticipated.** Not two agents: **the orchestrator and one agent**, writing the same two files inside the same minute. A delegated run reported `completed` twice while still alive; its second report was a fragment, the orchestrator read that as a finished run, verified the tree, found work left undone and did it. The agent's own edits then failed with *"string not found"*, because the edits had already been made underneath it.

**Nothing was corrupted, and that is luck rather than design.** The agent reported the collision from inside, verified with `git diff` instead of overwriting, and refused an edit war. Both parties' independent measurements agreed exactly. A less careful agent would have re-applied its version over the other's.

**Done:** a decision, recorded, on whether this builds one of the two deferred mechanisms or only corrects their trigger wording — and if the answer is neither, the reason written where the next person will find it before repeating this.

**Constraints**

- **The orchestrator is not covered by `roleWriteScopes`** — it has no role file, by design, because a subagent cannot run the human checkpoint. Any enforcement aimed at this case has to reckon with that asymmetry rather than assume the orchestrator is just another role.
- The cheap half may not be a mechanism at all: *a `completed` notification is not a report, and a fragment is resumed rather than taken over.* That is a procedure rule, and it belongs in the delegation step of the work-item procedure if it belongs anywhere.
- Worktree isolation is the heavier answer and its other named triggers have still not fired. Do not adopt it here on the strength of one incident without pricing it (`P-17`).

---

## TASK 11 — Case-folded boundary comparison · `bugfix` · `TODO`

`isInside` compares a path to a boundary case-sensitively. On a case-insensitive filesystem — which is the one this repository lives on — a protected directory spelled in a different case reaches the same real files and matches no boundary. `INC-14` fixed the *resolver* (`repoRelative` now folds the root prefix) but not the *comparison*, and the two are separate halves.

Stated as a hypothesis, not a finding: unlike `INC-14`'s two defects, this one has not been reproduced against a live payload. The first job is to establish whether the runtime can actually deliver a differently-cased path, because if it cannot, the honest answer is a recorded reason not to change anything rather than a speculative fix.

**Done:** a red test that reaches a protected tree through a differently-cased path, then a fix that denies it — or a recorded finding that the runtime normalizes case before the hook sees it, with the evidence that shows it, and `EC-013`'s residual-risk note updated to match.

**Constraints**

- The direction matters and differs by list. For the **deny** boundaries (`H-02`, `H-03`, `H-04`) case-folding is strictly safer: more paths match, more get denied. For the **allowlist** scopes it is the permissive direction, so the two cannot simply share one comparison without saying which is which.
- Do not fold case on a case-sensitive filesystem, where two spellings are genuinely two files. CI runs on Linux; the guards must be correct on both.

---

## TASK 6 — Replace Mermaid diagrams with hand-authored assets · `content` · `TODO` (unblocked 2026-08-23 — TASK 8 closed; replace incrementally once TASK 25 renders a diagram in a real page)

The 11 `.mmd` files from TASK 1 are placeholders, not the final assets. Mermaid's
autolayout could not produce diagrams the author considers presentable — see TASK 1's
Known limitations. Once the site exists and a given diagram is actually needed on a
page, the author will hand-author its replacement (e.g. Structurizr or another
manually-laid-out tool), **one at a time, as needed — not as a batch.** Keep the
existing `id`s; only the asset behind `/diagrams/{id}.svg` changes, so nothing in the
case study markdown needs to change when a diagram is replaced.

**Legibility is an acceptance criterion, not a nice-to-have.** Raised by the author across three
rounds of `TASK 8`'s design review, against the placeholder SVG diagrams drawn into the canvas:
*"los diagramas quedan con fuente muy pequeña igual, no se entenderían en una lectura a simple
vista"*. Those canvas diagrams are mockups and are not this task's deliverable, but they proved
the failure mode is real at the sizes a diagram actually renders on the page. So every
replacement asset must be **readable at the width it is published at, without zooming** — which
in practice means a minimum effective label size rather than whatever the layout tool emits, and
it means judging each asset in the page, not in the editor (`P-15`: fitness for the published
use, never "it renders").

**Acceptance**
- [ ] No blanket acceptance — closes incrementally, per id, as each is replaced.
- [ ] Each replaced asset is checked in the rendered page at its published width, both themes.

---

## TASK 7 — Founding ADRs · `research` · `DONE`

**Closed 2026-08-19.** 6/6 ADRs accepted. `docs/adr/README.md` live. The five blank stack-dependent rows in `.claude/rules/30-testing.md` filled from `ADR-006`, with an explicit "open, not blank" note where the honest answer is still unknown (whether `site/lib/content/**` needs Vite's runtime — a fact about code `TASK 8` hasn't written yet). **The gate's sub-gates are documented, not yet wired**: `ADR-006` names the exact commands (`node --test`, `npx stryker run` with `testRunner: "tap"`, `npm run build && npx playwright test`), but nothing runs them in `gate.mjs` yet, because `site/` doesn't exist — that wiring is `TASK 15`'s and `TASK 8`'s job, not this one's. Declared explicitly (`P-03`) rather than silently claimed as "real" when there's nothing to run.

The technology decisions the site rests on. One short ADR each, human-approved one at a time, indexed in `docs/adr/README.md`.

**This is the first real work item to run through the harness**, and that run is the harness's acceptance test. **K1, measured per decision (`TASK 13`'s convention, first real data):** stack 2 · content pipeline 2 · i18n 1 · hosting/deploy 1 · publication 1 · testing toolchain 2 — **max 2, never exceeded, sum 9 across 6 decisions.** Neither 2-pass decision was a defect correction: stack's second pass added the React/plain-HTML clarification the author asked for; testing toolchain's second pass caught and fixed a real factual error in the first draft (a false claim that no dedicated Stryker runner exists for `node:test` — `tap-runner` does). The checkpoint discipline found something real twice, not just cost two extra rounds. Full detail: `progress/2026-08-19-12-task7-closed.md`.

Order agreed with the author, by dependency rather than the numeric listing: site stack → content pipeline → i18n → hosting/deploy → publication → testing toolchain.

**Decisions**

1. ~~**Site stack**~~ — **[ADR-001](docs/adr/ADR-001-site-stack.md), Accepted 2026-08-19: Astro, static output.** No blank `.claude/rules/` rows resolved by this one — the stack-dependent blanks in `30-testing.md` belong to decision 5.
2. ~~**Hosting and deploy**~~ — **[ADR-004](docs/adr/ADR-004-hosting-deploy.md), Accepted 2026-08-19: Cloudflare Workers, static assets — `wrangler deploy`, no adapter, deploy path independent of decision 6.**
3. ~~**i18n strategy**~~ — **[ADR-003](docs/adr/ADR-003-i18n-strategy.md), Accepted 2026-08-19: unprefixed English (default), `/es/` for Spanish; two `getStaticPaths` route files joined on `slug`.** Two items left explicitly open for TASK 8: the in-body link-rewriting mechanism, and whether Astro's built-in i18n fallback fires for collection-driven routes.
4. ~~**Content pipeline**~~ — **[ADR-002](docs/adr/ADR-002-content-pipeline.md), Accepted 2026-08-19: minimal Zod schema (5 universal keys) + one-time diagram pre-render (TASK 17), zero Mermaid at build time.** Raised and resolved along the way: TASK 16 (content) and TASK 17 (content) both closed as side effects of this decision. No blank `.claude/rules/` rows resolved by this one either.
5. ~~**Testing toolchain**~~ — **[ADR-006](docs/adr/ADR-006-testing-toolchain.md), Accepted 2026-08-19: `node:test` everywhere + Stryker's `tap-runner` (one config, real coverage-based mutant filtering), `break: 100`; Playwright for e2e.** Fills all five blank rows in `30-testing.md`. Unblocks `TASK 15`.
6. ~~**Publication**~~ — **[ADR-005](docs/adr/ADR-005-publication.md), Accepted 2026-08-19: public GitHub remote, now, whole repository.** Verified git history clean (no `private/`/`evidence/`/unsanitized-original commits, ever) before deciding. The push itself is the author's action (`H-01`), not yet done as of this ADR.

**Done:** an accepted ADR per decision, the ADR index live, the blank stack rows in `.claude/rules/` filled from the decisions actually made, and the gate's sub-gates real.

**Constraint:** answer a rule row only when there is a reason for it. A blank row is a legitimate answer; a speculative one is worse than nothing.

---

## TASK 8 — Site work breakdown · `planning` · `DONE`

**Unblocked 2026-08-19** — `TASK 7` closed, 6/6 ADRs accepted.

**In progress 2026-08-20** — the design/UX item's input artifact exists: `docs/design/claude-design-brief.md`, carrying the screen inventory and the stack constraints the design cannot violate. Its **visual-direction section was rewritten** after the author rejected pass 0 v1 (three typeset documents, no nav/hero/motion) — see "History" in `docs/design/canvas/README.md`. **A direction is accepted** (`docs/design/decisions/2026-08-20-hero-direction.md`, since revised twice against real author feedback — the doc records both the original call and what changed): Direction A's structure, amended with Direction B's stacked-strata texture, now legible rather than heavily blurred, wine/burgundy accent, a gold/ochre `--label` tertiary color, and a visible seam line with traveling pulses in place of the original soft glow. **Pass 1 (screens 1–4, desktop) was APPROVED by the author on 2026-08-22**, after eleven revision rounds — home, the `otp-provider-decoupling` case study, the `/case-studies` index and the `mobile-banking-platform` anchor page. **The design deliverable is DONE — pass 2 approved 2026-08-23.** Eleven live artboards: home, the `otp-provider-decoupling` case study, the `/case-studies` index, the `mobile-banking-platform` anchor, About, Experience, the **bilingual 404**, the **`home.es` length stress test**, the **component sheet**, and two frozen **390px phone frames**. The **responsive contract** (three states, rail collapses below 820px) is on every screen and the **language switcher** is chrome on every page. The sheet carries fifteen component groups, each with its class name, its states and **what content it is handed** — plus the contact form's four states (idle/sending/sent/error), the only new design in it, since the form is the one place on the site where an action can fail. Three artboards are **derived, not authored** (`docs/design/canvas/derive.mjs`) and `verify.mjs` re-runs the derivation in memory, so a hand-edited copy cannot drift.
**Closed 2026-08-23.** The backlog is written and sits immediately below this entry: `TASK 21`–`TASK 33`, cut against the page set in `docs/design/decisions/2026-08-22-site-structure.md` rather than the brief's nine-screen inventory. Four framing decisions were taken with the author before writing it — deploy in item one, sections omitted when their content is absent, `mailto:` before a Worker, `*.workers.dev` before a custom domain — and they are recorded at the head of the backlog so no later item re-litigates them. **The first of those four was reversed on 2026-08-23**, later the same day, in favour of local-first: a stable, real site on `localhost` is the milestone the author judges before anything is published. The mechanism is unchanged — CI-only deploy to Cloudflare — only its position moved. See the amended decision table at the head of the backlog. This item stays `DONE`; a reversed framing decision reconciles the living document, it does not reopen a closed work item (`P-07`). All four breakdown constraints below are discharged: the design/UX task produced eleven live artboards — ten pages plus the component sheet — alongside four pass-0 history boards; `INC-03`'s visual-QA checklist is `TASK 27`; rail position tracking is an acceptance criterion on `TASK 23`; and content-driven components, in both its markup and its copy halves, is one of six criteria applied to every implementation item rather than repeated in each. The `home.es` delta is **measured, not assumed** — +10% overall across 37 corresponding strings, and the one element that changes shape is the rail's timezone line (43→63 chars, two lines to three); nothing in the layout is sized to an English string. **Not yet verified by rendering** — no headless browser exists in the repo until `TASK 27` installs Playwright, so narrow-state overflow is reasoned from measured character counts. `docs/design/canvas/verify.mjs` now asserts the canvas's **nine** structural properties, derived from the artboards rather than a roster (`P-13`) — and since `TASK 31` it is a **gate step** (`design canvas`), so a stale canvas fails `node scripts/gate.mjs` rather than surviving until someone re-seeds by hand. **Original pass-1 note follows, superseded and kept for the trail** — everything it calls outstanding shipped in pass 2, and its `TASK 31` corrections landed 2026-08-23: [design canvas](https://claude.ai/code/artifact/890abe00-2817-4bc8-bd8c-6fc9dc887f6b) — home, the `otp-provider-decoupling` case study, the `/case-studies` index, and the `mobile-banking-platform` anchor page, source in `docs/design/canvas/` (a `local-preview.mjs` fallback ships alongside it in case the Artifact link doesn't resolve). Mobile for these 4 screens, a `home.es` stress test, pass 2 (screens 5–9), and a couple of small flagged follow-ups (diagram text legibility; a proposed "Get in touch" copy change that needs its own content-task edit to `home.en.md`/`home.es.md` since `resources/**` is read-only for agents under `H-02`) remain. See `progress/2026-08-20-01-task8-design-brief.md` (the brief) through `progress/2026-08-23-19-task8-closed-backlog.md` (the backlog, closing) for the full decision trail. **The site's structure is now decided and recorded** in `docs/design/decisions/2026-08-22-site-structure.md`: the home page *is* the work page — no `Home` nav item, no separate `/work` route, `Work` and `Contact` are sections of home (`#work`, `#contact`), `About` and `Experience` are their own pages, and the five case studies are their own pages. `/case-studies` is **designed and not routed**, deferred until the list outgrows the home section. The breakdown's page-level implementation items should be cut against that page set, not against the nine-screen inventory in the brief.

Turn the site from one word into a backlog. Runs through the `work-item` procedure and produces new `TASK N` entries here — design items, implementation items, and evaluation items for both the site and the harness.

**Done:** every entry has a type, one deliverable, and a done someone else could check. No entry reads "investigate X" without a concrete definition of done — if you cannot say when it ends, it is a note, not a work item.

**Constraints — four items the breakdown must not omit:**

- **A design/UX task**, generating the actual per-page designs the implementation items build against. Raised by the author while reviewing `ADR-006`: nothing in the backlog yet owns "what each screen looks like" as its own deliverable.
- **The `INC-03` visual-QA rigor checklist**, as its own evaluation item — a script/test comparing the real rendered site, both locally and once deployed (`ADR-004`: Cloudflare Workers), against each screen the design task produces. `docs/harness/architecture.md` §M already recorded this as deferred *"until the site has screens worth diffing"* — `TASK 8` is that trigger. `INC-03`'s own origin: a CSS-purge defect invisible in dev, seven element-level defects surviving two visual reviews against a dev build — the remedy has to diff dev, prod, and the design intent as three distinct things, not two reviews at a glance.
- **Rail position tracking as an acceptance criterion on the item that builds the nav.** The author has raised it three times and it is the one interaction they have called indispensable: scrolling a case study must change which table-of-contents entry is marked current, without a click, and the same must hold for the home page's own nav items. It does **not** work in the design canvas and cannot — the Design runtime builds each artboard's DOM programmatically, so a plain `<script>` never executes — which is precisely why it is written down rather than left to be inferred from a mockup that appears to lack it. Full acceptance list, including the no-JavaScript fallback, in `docs/design/decisions/2026-08-22-site-structure.md`; a working ~30-line reference implementation is in the canvas source.
- **Content-driven components as an acceptance criterion on every implementation item**, not a note in a design doc. Raised by the author on 2026-08-22 while reviewing the design canvas: every list on the site is expected to grow — case studies, stack entries, employers, testimonials — and every one of them must render from the content files rather than from markup written once per item. The same applies to the two design elements that read as one-offs but are not: the home hero's background composition, and the per-project motif on a work tile — both must be swappable per instance without editing a page. **The failure this prevents is concrete:** a sixth case study should be a new pair of `.md` files and nothing else, and if adding one means editing a page template, the implementation item did not meet its done.

  **It applies to copy, not only to markup** — raised by the author on 2026-08-23 against the 404's *"Five case studies"* and *"Four employers"*. A count in visible copy is the quieter half of the same defect: markup that hardcodes a list breaks visibly, whereas `Five case studies` does not break when a sixth lands — it just starts lying, and nothing anywhere fails. Checking the property rather than fixing the two spots named found **nine**, across four screens, including Experience's `h1`, which counted employers and so expired the day the author changed job. Copy names what a destination *is*, never how much is in it. Enforced from now on by `docs/design/canvas/verify.mjs` check 5 (sentence-scoped, years excluded); the same criterion belongs on every implementation item that renders a list.

---

# The site implementation backlog

`TASK 8`'s output, **re-cut local-first on 2026-08-23**. Cut against the page set in `docs/design/decisions/2026-08-22-site-structure.md` — **not** the brief's nine-screen inventory, which the structure decision superseded.

Nineteen items run in the sequence below (`TASK 38`, opened by item 6 on 2026-08-24, is **not** one of them — it is harness debt, not site work, and it does not block the milestone). Eleven are `TASK 8`'s own (`TASK 21`–`TASK 31`). Six are not, and are named rather than quietly absorbed: **`TASK 15`** is a pre-existing harness item pulled in because `npm test` is incomplete without it; **`TASK 34`** is a pre-existing gate defect pulled in on 2026-08-24 because three items below add a gate step; **`TASK 32`** is the deploy half split out of the skeleton item; **`TASK 33`** was opened by the re-cut itself; and **`TASK 35`** and **`TASK 36`** were opened on 2026-08-24 by the session that took the five implementation constraints below.

**Ids are stable and order is not the id** (`G-10`). Run them in this sequence:

| # | Item | Type | Spec? | Why here |
|---|---|---|---|---|
| 1 | ~~`TASK 31`~~ — reconcile the brief and the decision docs | `content` | no | **DONE 2026-08-23.** The input artifact every item below reads was stale. Fixing it after the pages are built fixes nothing |
| 2 | ~~`TASK 33`~~ — UI component model + component test tier | `research` | no | **DONE 2026-08-23.** `ADR-007` + `ADR-006`'s amendment. Every spec below cites them in `governed_by` |
| 3 | ~~`TASK 34`~~ — the gate reports every step | `bugfix` | no | **DONE 2026-08-24. Pulled in.** Three of the items below add a gate step, and a step added behind a long-lived failure runs exactly zero times. Fixing this after they land means they were never verified |
| 4 | ~~`TASK 35`~~ — implementation architecture: `ADR-008` + the `S-*` rule surface | `research` | no | **DONE 2026-08-24.** The author's five implementation constraints became an ADR and a loaded rule file. Every `feature` spec below cites `ADR-008` in `governed_by` |
| 5 | ~~`TASK 21`~~ — Astro skeleton + the two root commands | `feature` | yes | **DONE 2026-08-24.** The first line of code, and the two commands every later item is judged by |
| 6 | ~~`TASK 15`~~ — mutation gate wired into `gate.mjs` | `harness` | no | **DONE 2026-08-24. Pulled in.** `npm test` was incomplete without it. Ran before any site code landed, so `site/lib/content/**` is in the config's glob rather than retrofitted. Scored 74.35% on its first real run and opened `TASK 38` |
| 7 | ~~`TASK 40`~~ — code readability: names and comments | `research` | no | **DONE 2026-08-24.** The author set three constraints on how the code reads. Ran before the first real source file for the same reason the fidelity harness was placed ahead of the pages: landing it after means three items write in the old style and get retrofitted |
| 8 | ~~`TASK 36`~~ — interface strings as content | `content` | no | **DONE 2026-08-24.** 63 chrome strings per locale, in frontmatter, nine groups one per template. Scope derived from criterion 4 rather than from the item body's enumeration, which pulled in the article masthead labels and the page labels the later items would otherwise have typed into a template |
| 9 | `TASK 22` — content layer | `feature` | yes | The reusable core; every page item depends on it |
| — | ~~`TASK 42`~~ — the test and mutation globs cover the core | `bugfix` | no | **DONE 2026-08-24. Pulled in.** The item below creates `site/lib/nav/`, and the globs stopped at `site/lib/content/**` — so that file would have been outside the gate step and outside the mutation run, silently. Proven in red: the old glob exited **0** with a failing test in the tree |
| — | ~~`TASK 44`~~ — component test tier | `harness` | no | **DONE 2026-08-24. Pulled in.** The item below lands the first two DOM-requiring modules. A tier installed inside the feature item that uses it is a tier whose own red path never gets proven |
| 10 | `TASK 23` — tokens and the layout shell | `feature` | yes | Every page item depends on it |
| 11 | `TASK 41` — Playwright smoke tier | `harness` | no | The half of the fidelity harness that verifies the site rather than building diffing infrastructure. Runs with the pages, not before them |
| 12 | `TASK 24` — home | `feature` | yes | |
| 13 | `TASK 25` — case study and platform templates | `feature` | yes | |
| 14 | `TASK 26` — About, Experience and 404 | `feature` | yes | |
| — | **THE LOCALHOST MILESTONE** — the author judges the site; `harness-evaluator` scores the harness | | | |
| 15 | `TASK 30` — publish the repository to GitHub | `maintenance` | no | Nothing else can be automated until the code has a remote |
| 16 | `TASK 32` — CI deploy pipeline, GitHub Actions → Cloudflare | `feature` | yes | Proves the whole path — push → build → live — and switches on `TASK 27`'s third comparison |
| 17 | `TASK 27` — design-fidelity harness, the three-way diff | `harness` | no | **Moved behind the milestone 2026-08-24**, split from `TASK 41`. Its prod comparison needs a deploy to exist, which is the item directly above |
| 18 | `TASK 28` — custom domain | `feature` | yes | Blocked on the domain existing; deliberately off the critical path |
| 19 | `TASK 29` — contact form Worker | `feature` | yes | Deferred with a stated trigger |

## The localhost milestone

The line the whole local sequence runs at. It has no deliverable of its own, so it has no id — but it is the entry condition for `TASK 30`, and a milestone that lives only in a conversation is a milestone nobody can check:

> `npm start` serves `/`, `/es/`, all five `/case-studies/<slug>` in both locales, `/about`, `/experience` and their `/es/` counterparts, plus a real 404 — both themes, all three responsive states — and `npm test` is green, including every `TASK 27` fidelity diff.

## Two commands, and only two

Declared once here so no item invents a third. Both live in a **root `package.json`**, delegating into `site/` — root is where a newcomer looks, and it keeps "one command" literally true rather than "one command, from inside `site/`".

| Command | Does | Why this shape |
|---|---|---|
| `npm start` | `astro build`, then serves `dist/` | The production artifact, on localhost. **This is the verification path.** `npm run dev` still exists for iteration but is never what "presentable" is judged against — `INC-03` was exactly a defect invisible in a dev build |
| `npm test` | A thin alias to `node scripts/gate.mjs` | **One list, not two.** `T-09` requires the gate to *delegate* to its sub-gates rather than re-list them, or a step added to a sub-gate is silently absent from the top-level run. Unit, component, mutation, e2e and design fidelity all arrive through the gate |

**`npm test` runs at the end of every item.** Not "before declaring done" as a habit — as the item's own last step.

## The execution model

Implementation is **delegated, not hand-written by the orchestrator**: `implementer` for code, `test-engineer` where the test suite is the deliverable, `adversarial-auditor` before close — all three on `sonnet`, per their role files. The orchestrator writes the spec, runs the human checkpoint, and **verifies the artifact rather than the report** (`P-11`): "I ran the gate and it passed" and "the gate passes" are different propositions.

Every `feature` item therefore runs: **spec → author approves → delegate → `npm test` → wrap-up.**

**The cost, stated up front:** `H-05` is rung 1 and cannot be waived in-session. `delegation-gate` matches specs on `work_item` by strict equality, so it is **one spec per `feature` item** — eight of them in this backlog, each needing the author's approval recorded in `approved_version` before any write-capable role can be delegated against it. Items typed `harness`, `content`, `maintenance` and `research` need no spec; their approved artifact is something else.

**A second cost, found by hitting it twice on 2026-08-23 (`TASK 31`):** a delegation brief **must not name a `feature`-typed work item by its id — not even in passing, and not inside a quoted error message.** `extractWorkItems` in `scripts/guards/lib/delegation-gate.mjs` scans the **whole brief text** with `/\bTASK[\s-]?(\d+)\b/gi` and treats every hit as an item being delegated against; there is no field separating *the item I am working on* from *an item I am mentioning*. A `content`-item brief was denied twice over ids it merely cited as downstream context — the second time because it quoted the text of the first denial, which contained one. **The finding cannot be transmitted by quoting it; it has to be paraphrased.**

This is not a defect to route around. Reading the brief instead of a field the orchestrator fills in is `P-13`'s shape: a declared field would be a roster, and an orchestrator who forgot to fill it would get a silently ungoverned run. **The working rule:** name `feature`-typed items descriptively in a brief — *"the page implementation items"*, *"the deploy item"* — and write their ids only inside the files the agent edits, never in the brief itself. Ids of `content`, `research`, `harness` and `maintenance` items are unaffected, because those types are not in `specRequiredFor`.

## Five decisions taken with the author on 2026-08-23, so nothing below re-litigates them

| Decision | Consequence for the backlog |
|---|---|
| ~~**Deploy early, iterate in production**~~ — **SUPERSEDED the same day** | The original call: `TASK 21` is a walking skeleton live before any design exists, so deploy risk is found on day one. **Replaced by local-first:** a stable, real site on `localhost` is the milestone the author judges before anything is published. The deploy *mechanism* is unchanged — still CI-only — but it now runs after the milestone, as `TASK 30` + `TASK 32`. Recorded rather than deleted: a reversed decision with no trace is one the next session re-litigates |
| **Local-first, deploy second** | The sequence above. `TASK 21` builds and serves locally; nothing is published until the whole site is presentable |
| **A section is omitted when its content is absent** | No `[NEEDS INPUT]` ever reaches production. Missing testimonials means no testimonials block; a missing photo means no figure. The site looks finished from the first build and fills in as content lands, with no code change — which is the content-driven constraint doing real work |
| **`mailto:` now, a Worker later** | Zero backend, zero secrets, zero spam surface at launch. The stated cost: the form's designed `sending` / `sent` / `error` states are not exercised yet. `TASK 29` adds the Worker when the author wants it |
| **`*.workers.dev` first, custom domain after** | Nothing blocks the first deploy. `TASK 28` connects the real domain once it exists |

## Six criteria apply to every item and are not repeated in each one

**1 · Content-driven.** A sixth case study is a new pair of `.md` files and nothing else. If adding an item means editing a template, the item's done was not met. This applies to copy as well as markup: no visible string states how many of a growing thing there are.

**2 · Locale parity** (`C-09`). Both locales in the same change, always. No item ships English-only.

**3 · Design fidelity — every item that renders a screen is diffed against its artboard, and is not done until that diff passes.** Named per item, and mechanized by `TASK 27` rather than left to a look. The design is *the specification*: `docs/design/canvas/src/*.dc.html` is the source of truth for markup and CSS, and `Components.dc.html` names every component, its states, and what content it takes. Implementation copies from it; it does not reinterpret it.

**4 · One datum, one declaration site.** The single most important architectural constraint below, and the one the canvas itself violates — every `.dc.html` carries its own copy of the token block, which is correct for eleven independent mockups and would be a defect in a site. Copying from the canvas is precisely how it would get carried in, so the mapping is written down:

| Datum | Declared once, here | Never |
|---|---|---|
| Copy, in either locale | `resources/**` | in a template, a component, or a translation object |
| Design tokens (color, type ramp, spacing, breakpoints) | one token stylesheet | as a literal value anywhere else |
| The route set | derived from the content collection | a hardcoded list in a route file, a sitemap, or a test |
| Nav **structure** — which items exist, their order, their target, their `soon` flag | one data module | in the rail markup |
| Nav **labels**, and every other visible chrome string | `resources/site/ui.{en,es}.md` (`TASK 36`) | in a data module, a template, or a translation object |
| A component's markup and states | the component | duplicated per page |
| Diagram assets | `resources/diagrams/` | inline SVG in prose |
| The alternate-locale URL of a page | the collection's `slug` join | a per-page constant |

**The check that makes it real, not aspirational:** a build-time assertion that no color literal, breakpoint literal or route string appears outside its declaration site. Owned by `TASK 23` for tokens and `TASK 22` for routes — as a property, never a roster (`P-13`).

**5 · Every item ships its own tests, and is not done until `npm test` is green.** Per `T-01`'s type table: content-layer logic gets `node:test` unit tests inside the mutation-covered surface; **client-side behaviour gets component tests** — Vitest + `@testing-library/preact` in `jsdom`, per `TASK 33`'s amendment to `ADR-006` — covering the DOM-requiring modules (the scroll-spy, the theme toggle) and Preact islands once one exists, and asserting what the user observes rather than internal structure (`T-07`). `.astro` components are **not** in that tier: the build renders them and the fidelity diff asserts them. every screen gets its `TASK 27` fidelity diff. A test that would still pass with the thing under test removed is not that kind of test (`T-02`), and a flake is a finding, not something to retry until green (`T-06`).

**6 · The work is delegated, and the delegation is enumerated before it starts.** The role is named in this register; **the files it owns are enumerated in the item's spec**, which is the artifact the author approves and the only thing `H-05` will let a write-capable role run against. Ownership is disjoint across files and behaviors (`G-12`) — two roles never own the same object — and slices are sized by object, never by surface (`P-09`): *these six files*, never *the components*. An agent cut off mid-run delivers zero, not half, so when a slice will not fit, the scope gets cut rather than hoped through. The orchestrator then verifies the artifact, not the report (`P-11`).


---

## TASK 35 — Implementation architecture: `ADR-008` and the `S-*` rule surface · `research` · `DONE` · **ran fourth**

**Closed 2026-08-24.** `ADR-008` accepted by the author, six sub-decisions. `.claude/rules/50-implementation.md` carries `S-01`–`S-07`, path-scoped to `site/**` — the always-loaded budget moved 274 → 275 lines, because the file's 49 lines do not count and only the registry row does. `check-site` is the gate's fifteenth step, skipped with a named reason until `site/` exists; 21 tests, 12 hand-applied mutants, **one survived on the first run** — a bare side-effect import of `astro:content` — reported as a finding, covered, then killed (`T-03`). Proven in red against a real violating tree, not only against fixtures. Detail: `progress/2026-08-24-02-task35-implementation-architecture.md`.

**Opened 2026-08-24**, when the author set five constraints on how the site is built and asked that they become precedent for the whole project rather than instructions repeated per item. A constraint that lives only in a conversation is one the next delegated agent never hears: briefs carry the task and never the rules (`P-08`), and rules load themselves.

The five, in the author's terms: every visible string comes from `resources/`; a dedicated layer fetches the content and no component reads it directly; no implementation folder reaches seven files; CSS classes are specified for reuse and none exists without a purpose; and the architecture is decided and written rather than improvised per item.

Three of the five collide with something already decided, and the collisions are the work:

- **`site/lib/content/**` is already committed** by `30-testing.md` and `ADR-006` as the mutation-covered surface. The tree has to accommodate that path, not replace it.
- **The chrome copy does not exist anywhere in `resources/`** — checked, not assumed. That is `TASK 36`.
- **The design canvas uses mockup-grade class names** (`hd`, `grp`, `lbl`, `k`, `v`, `sw`), and criterion 3 says implementation copies from the canvas rather than reinterpreting it. Resolved by reading criterion 3 for what it says: the fidelity diff is structural and stylistic, **never class-name equality**.

**Deliverable:** `docs/adr/ADR-008-site-implementation-architecture.md`; `.claude/rules/50-implementation.md`, path-scoped to `site/**`; `scripts/guards/lib/site-structure.mjs` + `scripts/guards/gate/check-site.mjs` with a red-path battery; the registry table in `.claude/rules/00-hard-rules.md`, `docs/harness/contracts.md` and `docs/adr/README.md` reconciled.

**Done:** `ADR-008` is `Accepted` and indexed; `50-implementation.md` carries the `S-*` rules with `ADR-008` as their origin and a rung each that matches what is actually enforced (`G-11`); `check-site` is a gate step and fails, in a red test, both on a directory at the file cap and on a page importing the content collection directly.

**Constraints**

- **Path-scoped, or the budget breaks.** Always-loaded instructions sit at 274/320 lines. A sixth always-loaded rules file would spend most of the remaining headroom on rules that only matter inside `site/**`. `paths: ["site/**"]` costs nothing until someone works there.
- **Every rule carries an origin and an honest rung** (`G-10`, `G-11`). Two of the five are judgment and stay at rung 4 with the mechanization owned by a named later item. Claiming rung 2 for a rule nothing enforces is the defect step 12 of `TASK 5` found in `C-09` and `C-14`.
- **The file cap has no external sourcing**, and the ADR says so plainly rather than dressing it as industry practice. Its known failure mode — a split that invents categories to absorb overflow — becomes part of the rule, not a footnote.
- Does not reopen `ADR-001` through `ADR-007`. `ADR-008` sits on them.

---

## TASK 36 — Interface strings as content · `content` · `DONE` · **ran eighth**

**Closed 2026-08-24.** `resources/site/ui.{en,es}.md`, **63 leaf strings each, identical key shapes**, in frontmatter across nine groups — one group per template. `check-content` moved from 20 files / 9 pairs to **22 files / 10 pairs**; `check-terms` clean over 257 files.

**Scope was derived, not taken from the list below.** That list is a roster, and `P-13` says derive the property instead — which criterion 4 already states: *"Nav labels, and every other visible chrome string"*. The rule applied was **a string belongs there when a template prints it regardless of which content file is loaded**, which pulled in the article masthead labels, the two page labels, the About byline labels, the home section headings and the contact form. None were in the enumeration; all would otherwise have been typed into a template by whichever item needed them first.

**Sixteen Spanish strings existed in no artboard** and are listed individually in `ui.es.md`'s own body with their English reference, so they are reviewed one by one rather than approved in bulk. Two are flagged as decisions rather than reviews: whether *Deep dives* is translated, and the phrase that carries it. Verified before the paste, not after: the real guard functions, a real YAML parser proving both locales carry identical key shapes, and `check-terms` over the repository with the drafts temporarily inside it. Detail: `progress/2026-08-24-07-task36-interface-strings.md`.

The site's chrome has copy, and none of it exists. Verified against `resources/` on 2026-08-24 rather than assumed: every content file carries the five universal keys and prose, and **nothing anywhere holds a nav label.** `Work`, `About`, `Experience`, `Contact`, the three `soon` slots, `On this page`, `← Work`, the language switcher, the theme toggle's labels, the footer and the 404's copy are all currently strings that would have to be typed into a template — which is exactly what the first implementation constraint forbids.

Astro's own i18n recipe uses a hand-written dictionary module, so the constraint puts this project off the documented path. The precedent that makes it reasonable is Astro's own: **Starlight sources its interface strings from a content collection**, one file per locale, rather than from a module.

**Deliverable:** `resources/site/ui.{en,es}.md` — both locales — plus the `ui` type registered in `guards.config.json`'s `byType` map so `check-content` validates the pair instead of waving through an unknown type (`C-14`).

**Done:** both files exist and `check-content` validates them as a locale pair of a known type; every string in them is traceable to an artboard in `docs/design/canvas/src/`; `check-terms` passes.

**Constraints**

- **The author writes the files; an agent writes the draft.** `H-02` is rung 1 and there is no reopening mechanism. The item produces both files complete, word for word, in the work log, and the author pastes them — the path `TASK 16` and `TASK 17` already took.
- **Nothing is invented** (`C-01`, `C-04`). Every string is lifted from an artboard. Where the Spanish does not already exist in `HomeES.dc.html` or `NotFound.dc.html`, the draft **marks which strings are newly written**, so the author reviews those with judgment rather than approving the file in bulk.
- **Both locales in the same change** (`C-09`). The Spanish is first-class content, not a translation artifact.
- **Structure is not copy.** Which nav items exist, their order, their target and their `soon` flag are structure and live in one data module under `site/lib/nav/`. Their labels are copy and live here. The criterion 4 table below is reconciled to say so.
- This item does not touch `about`, `experience` or the photographs — that is `TASK 20`.

---

## TASK 37 — `check-terms` false-positives on generated opaque values · `bugfix` · `DONE`

**Found and closed 2026-08-24**, by the first `npm install` this repository has ever run. `check-terms` substring-matches every banned term against every line of every scanned file. A `sha512` integrity hash in a lockfile is base64 of a digest, so **every short character sequence is reachable by chance** — and two of them, in `site/package-lock.json`, contained a banned term. A true string match, carrying zero confidentiality risk, failing the gate and taking `guard tests` down with it through the scanner's own liveness test.

This is `INC-15`'s family in a second place. `INC-15` was the same collision inside a `tool_use_id` in the trace; `TASK 18` owns that half and is unaffected by this fix. Both are *an opaque, machine-generated token that happens to contain a term someone banned*. **No new incident id was minted**: `C-05`'s origin is unchanged, no rule cites this, and adding an incident to the architecture document would oblige an eval case (`check-evals`) for a defect the existing `INC-15` already describes.

**The fix is precise, not a general loosening.** Values of fields named in `guards.config.json`'s `terms.opaqueFields` are blanked **before matching only** — by field name, never by a "looks like a hash" heuristic, which is the shape that widens itself silently over time. The value is replaced with same-length filler, so a finding elsewhere on the same line still reports the column it actually occupies, and the **context printed in a finding is the real line**, masked as always. Package names, resolved URLs, versions and everything else on the line are scanned exactly as before.

**Done:** a red test proves a banned term inside an `integrity` value is no longer a finding; a second proves the same term in a non-opaque field on the same line still is; a third proves nothing is skipped when no opaque field is configured. `check-terms` passes over 247 files. 7 hand-applied mutants, 7 killed — **two survived the first run** and both were real gaps: the exported function's own default was untested, and nothing asserted that the printed context is the unblanked line.

**Constraints**

- **The exclusion is opt-in from config and empty by default.** A scanner that blanks something by default blinds a repository nobody configured, which is `INC-07`'s shape.
- Do not exclude `site/package-lock.json` wholesale. A lockfile can carry a private registry URL naming an internal system, and that is exactly what `C-05` exists to catch — the exclusion is scoped to the digest field, not to the file.
- `private/banned-terms.txt` was not read, edited or reasoned about (`H-04`). The finding names a line number; nothing here needs the term itself.

---

## TASK 30 — Publish the repository to GitHub · `maintenance` · `TODO` · **runs after the localhost milestone**

`ADR-005` accepted a public GitHub remote for the whole repository on 2026-08-19, and verified the history clean before deciding — no `private/`, no `evidence/`, no unsanitized original ever committed. **The push itself was left as the author's action and has not happened.** Everything automatable downstream is blocked on it.

**Moved from position 1 to position 11 on 2026-08-23**, when the backlog was re-cut local-first. Nothing downstream of this item is needed to reach a presentable `localhost`, and the author judges the site before publishing it. The constraint below that mattered most gets *more* true as a result, not less: by the time this runs, the working tree additionally carries all of `site/`, so there is more to review in the first diff, not less.

**Deliverable:** the repository public on GitHub, `main` tracking the remote.

**Done:** `git remote -v` shows the origin; the GitHub page renders `README.md`; `private/` and `evidence/` are absent from the remote, confirmed by browsing the pushed tree rather than by trusting `.gitignore`.

**Constraints**
- **The author performs every git write** (`H-01`). An agent may prepare files and read history; it does not create the remote, commit or push.
- Re-verify the history immediately before pushing, not once in August. `ADR-005`'s check was true when made; a push publishes whatever is there *now*.
- The uncommitted working tree is large — the whole design canvas, the harness and this backlog. Review the diff before the first commit, which is the entire point of leaving commits to the human.

---

## TASK 31 — Reconcile the brief and the decision docs with what was built · `content` · `DONE` · **ran first**

**Closed 2026-08-23**, with the full `done` block and `iterations: 3` in `progress/2026-08-23-21-task31-design-docs-reconciled.md`. The status line here said `TODO` until 2026-08-24, when the session opening the site backlog checked it against the log rather than reading it (`P-04`). The work was finished; only the register was stale — which is exactly the half of `P-07` that gets skipped.

`docs/design/claude-design-brief.md` describes a design that no longer exists, and it is the **input artifact every implementation item reads**. A stale brief is what the next session takes as truth.

Fifteen review rounds changed things the brief still states otherwise: the contact invite copy, the count-free rewrite across four screens, the logo slots, the confirmation message, Experience's `h1`, the language switcher, the responsive contract, and the bilingual 404 — none of which the brief mentions. The screen inventory is superseded by `docs/design/decisions/2026-08-22-site-structure.md`.

**Deliverable:** the design documentation reconciled with the eleven live artboards, in one change — `docs/design/claude-design-brief.md`, the **two** decision docs in `docs/design/decisions/`, and `docs/design/canvas/README.md`, which is the third document in that class. *(This line said "the three decision docs" until this item counted them: there are two. Corrected by the item it describes — the same class of stale claim it exists to fix.)*

**Done:** every screen the brief names exists in `docs/design/canvas/src/`, and every artboard there is named by the brief — checked as a property in both directions, not by reading (`P-13`); no statement in the brief contradicts a shipped artboard.

**Constraints**
- **Reconcile, do not rewrite.** Where the brief was overruled, record what changed and why — the reasoning trail in `progress/` is the evidence and should be cited, not restated.
- The copy changes that belong in `resources/**` are **not** this item — they are `TASK 20`, and `H-02` keeps agents out of published content. This item fixes the design documents only.
- Runs **before** the page items, not after. Reconciling a brief once the pages exist reconciles nothing.

---

## TASK 33 — UI component model and component test tier · `research` · `DONE` · **ran second**

Two decisions that were left open by name and are now needed, because **every spec below cites them in `governed_by`** — and a spec citing an ADR that does not exist governs nothing.

`ADR-001` deferred the first explicitly: *"whether any specific piece of the site's UI should be a React island, plain CSS/JS, or a View Transition — that is a design decision for TASK 8."* `TASK 8` closed without recording it. `ADR-006` left the second as a named gap: it decided `node:test` for content logic and Playwright for e2e, and decided **nothing** about testing a component, which needs a DOM that `node:test` alone does not provide.

**Deliverable:** `docs/adr/ADR-007-ui-component-model.md`; a dated amendment to `docs/adr/ADR-006-testing-toolchain.md`; the stack-dependent rows in `.claude/rules/30-testing.md` updated to match; `docs/adr/README.md` reconciled.

**`ADR-007` — decided with the author on 2026-08-23; the ADR records it rather than re-opening it:** `.astro` by default, zero framework JS; **Preact through `@astrojs/preact` with `preact/compat`** declared for islands, so what gets written is literal React — JSX, hooks, the same API. The rejected option and its cost are recorded: React proper, no functional gain at this scale, against a site whose author named low weight and fast load as the priority.

**Two claims in this entry were corrected by the item itself** — recorded rather than quietly edited, because both would have been cited as fact by the specs below:

- ~~*"islands are... the theme toggle, the scroll-spy rail, and later the contact form's states"*~~ → **the island count at the localhost milestone is zero.** The design specification of record — reconciled the previous day — specifies the scroll-spy as *"roughly 30 lines of vanilla JS"* with a working reference implementation already in the canvas source, and its acceptance criterion is that the rail still works with JavaScript disabled. The theme toggle must resolve *before first paint*, which no hydrating island can do. Both stay `.astro` plus a script. Only the contact form's four states clear the bar, and they arrive with the contact-form Worker item. Preact is unchanged as the declared framework, installed and proven by the skeleton item.
- ~~*"~3KB instead of ~45KB gz per hydrating page"*~~ → **neither number survived sourcing, and the error runs in both directions.** Preact's homepage says 3kB while its own README says 4kB the same day; the `preact/compat` surface this project actually chose measures **9,689 B** gz, and `react` + `react-dom/client` measures **60,329 B** — higher than the 45KB claimed. No source measures the same widget built once in each. `ADR-007` therefore asserts the direction, which every source corroborates, and declines the numbers (`C-01`).

**`ADR-006` amendment:** component tests are **Vitest + `@testing-library/preact` in `jsdom`**, a third tier alongside `node:test` (content logic, mutation-covered) and Playwright (e2e + fidelity). The cost is stated plainly: a second test-runner idiom in a repository that deliberately had one — accepted because the alternative asserts internal structure, and `T-07` forbids exactly that. The tier is **not** mutation-covered: `D3` scoped mutation to parsing, joining and validating, and covering a Vitest surface needs a second Stryker config, the cost `ADR-006` already priced and declined.

**A third correction, to this line:** this entry said the amendment *"is `ADR-006`'s own review trigger firing."* It is not, quite. That trigger is about `site/lib/content/**` needing **Vite**; the amendment is about components needing a **DOM**, and `site/lib/content/**` still does not exist. What governs is the *policy* the trigger established — introduce Vitest when the need is real, never preemptively — applied to a surface `ADR-006` never contemplated. The amendment says so in those words rather than claiming a continuity it does not have.

**Done:** both ADRs `Accepted` and indexed in `docs/adr/README.md`; `30-testing.md`'s stack-dependent table names the component tier and its invocation; no row left blank without a written reason.

**Closed 2026-08-23.** `ADR-007` accepted; `ADR-006` amended in place — dated line, inline markers at both affected paragraphs, and a dated amendment section. `docs/adr/README.md` carries **the first level-2 rows the file has ever had**: `ADR-006` ✏️ Amended and flipped to `Current-with-amendments`, `ADR-001` ↪️ Extended with no inline mark, because it deferred a decision rather than asserting something now false. `30-testing.md` gained the component tier, the explicit-scoping row and a component sub-gate command. Work log: `progress/2026-08-23-22-task33-component-model-and-test-tier.md`.

**Constraints**
- **Amend `ADR-006`; do not write a second ADR for the other half of the testing toolchain.** One topic across two documents is the drift shape `G-10` exists to prevent. `ADR-007` is its own ADR because it decides what the site is *built from*, not what it is *tested with*.
- The Preact decision is the author's and is already taken. This item writes it down with its rejected alternatives and its cost; it does not re-litigate it (`P-17`: the concern is stated once, then the work gets done).
- Answer a rule row only when there is a reason for it. A blank row with a stated reason is a legitimate answer; a speculative one is worse than nothing.

---

## TASK 21 — Astro skeleton and the two root commands · `feature` · `DONE` · **ran fifth**

**Closed 2026-08-24.** `SPEC-TASK-21` approved and implemented in two delegated slices, both first-pass clean. `astro@7.2.5`, static output, no adapter; the built page ships **zero bytes of JavaScript** — no script tag, no asset reference. **Both spikes answered and deleted.** The Preact island hydrated in the author's browser, which is what closed `SKEL-004` — no headless browser exists in this repository until the fidelity-harness item, and an agent inspecting markup is not a hydration check. And the loader read `../resources/site` from outside the project root: 4 entries at build time, a real frontmatter value in the built HTML. **`ADR-008`'s fallback ladder is not entered** — the assumption with no vendor sentence under it turned out to hold. The `site structure` gate step moved from SKIP to PASS, which is `SKEL-005`. Two things broke along the way and both became their own items or fixes: the first `npm install` in this repo's history took the gate down (`TASK 37`), and `check-site` would have denied the collection config Astro itself requires — found and fixed before an agent hit it. Detail: `progress/2026-08-24-04-task21-astro-skeleton.md`.

**The one dimension that is not green:** `check-trace` reports 2 findings in this session's own trace — `TASK 12`'s known writer defect, which `H-03` forbids every agent from touching. Closed with `gate: partial` naming the step and its owner, the same call `TASK 31` made on the same step. **Every item closing before `TASK 12` lands will have to make it too**, which is an argument for pulling that item forward.

An Astro project that builds and serves locally, plus the two commands the whole backlog is judged by. **One page saying nothing** — no design, no content, no components. The point is to prove the local path end to end before anything is built on top of it.

**Split from its original form on 2026-08-23.** This entry used to carry the GitHub Actions workflow as well, which made it one item with two dones — and a done that needed a remote to exist (`P-01`, `INC-01`'s shape). The deploy half is now `TASK 32`.

**Deliverable:** `site/` with `astro.config.mjs`, `package.json`, the `@astrojs/preact` integration and one route — plus a **root `package.json`** carrying `start` and `test`.

**Done:** `npm start` from the repository root builds the site and serves the production output on localhost; `npm test` from the root runs the full gate and passes; the Preact integration is proven by one throwaway island that actually hydrates, then removed.

**Constraints**
- **`npm test` is a thin alias to `node scripts/gate.mjs`, never a second list of steps** (`T-09`). A step added to a sub-gate must appear in the top-level run without anyone editing the alias.
- **`npm start` is the production build, not the dev server.** `npm run dev` may exist for iteration, but the verification path is the built artifact — `INC-03` was a CSS-purge defect invisible in dev that survived two visual reviews.
- Astro, static output, no adapter (`ADR-001`, `ADR-004`). Preact per `ADR-007`.
- **No deploy config here.** `wrangler.jsonc` belongs to `TASK 32`; writing it now means writing configuration nothing reads for weeks.
- `site/node_modules` and `site/dist` are gitignored, and `scripts/guards/guards.config.json` excludes them from `check-terms` — a `node_modules` tree will otherwise slow every gate run and produce term false-positives. This is the one edit outside `site/` and the root `package.json` that this item makes.
- **Delegation:** `implementer`, owning `site/**` and the root `package.json`. The `guards.config.json` exclusion stays with the orchestrator, since it is a boundary-adjacent file.

---

## TASK 32 — CI deploy pipeline: GitHub Actions → Cloudflare Workers · `feature` · `TODO` (needs TASK 30)

The deploy half split out of `TASK 21` on 2026-08-23. A workflow that ships the site to Cloudflare **on every push to `main`** — and nothing else that ships it at all.

**Deliverable:** `.github/workflows/deploy.yml` and `site/wrangler.jsonc`.

**Done:** **a commit pushed to `main` appears at the live URL with no local command run**; the URL returns HTTP 200 over HTTPS; and **`TASK 27`'s prod comparison is switched on and passing**. Recorded here and in `docs/adr/ADR-004`.

**Constraints**
- **CI is the only deploy path, from the first deploy.** A manual `wrangler deploy` first and CI later means shipping one mechanism and then replacing it — and the manual one keeps working, so nobody notices when the automated one breaks. The workflow builds and deploys; nothing else does.
- The workflow runs `npm test` **before** deploying. A gate that only runs locally is a gate that runs when someone remembers — and a green local gate is not evidence that CI fired (`T-10`).
- **The author creates `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub repository secrets.** No Cloudflare credential enters the session environment (`G-08`); an agent writes the workflow, the author supplies the secrets. The token is scoped to Workers deploy on one account, never a global key.
- Astro, static output, no adapter (`ADR-001`, `ADR-004`) — `wrangler deploy` serves `dist/` as static assets.
- **This item closes `TASK 27`'s deferred third comparison.** Until a deployed base URL exists, that comparison reports `skipped` with its reason; this item is not done while it still does.

---

## TASK 22 — Content layer: collections, schema, locale join · `feature` · `DONE` · **ran ninth**

**Closed 2026-08-24.** `SPEC-TASK-22` approved and implemented in five delegated slices. **26 tests in the content core, 92.62% mutation score over it, 0 mutants without coverage**, and the guard suite 465 → 476. The gate runs **17 steps** and passes 16; the one red is `evidence trace`, which `H-03` puts outside every agent's reach and which every item since has closed the same way. K1 = 15, and its composition matters more than the number — see the log.

**The finding that paid for the item.** `ADR-003` stated as fact that a collection's auto-generated id is filename-derived. **False for `astro@7.2.5`, and false in the dangerous direction:** the loader's default returns `data.slug` whenever frontmatter carries one, and `ADR-002` made `slug` universal — so both halves of every locale pair generated the *same* id and one silently overwrote the other. The ADR warned about an id that could not pair; the reality was an id that made entries **disappear**. Found by the first real build failing with `slug "about" is present only in "es", missing "en"` — the content core's own pair assertion, written two slices earlier for exactly this, catching a live defect on first contact with real content. Fixed with an explicit `generateId`; the ADR's parenthetical is **refuted** in the index.

**A second finding that would have shipped a red gate.** `stryker.config.mjs` listed `site/lib/content/**` in its `mutate` globs and claimed the surface was *"covered the moment it is written"* — but its `tap.testFiles` never named it. Measured before the fix: **149 mutants on the new surface, every one without coverage**, dragging the aggregate to **72.11 against a break threshold of 74**. After: **75.66**, with the `scripts/` subtree byte-identical between runs, so the whole movement is attributable to the content core alone. A glob that generates mutants and a glob that supplies killers are two separate promises, and only one had been made. `break` was deliberately **not** raised — that is `TASK 38`'s deliverable.

**What verification caught that a green suite did not.** Slice 1 returned 11/11 green with **four surviving mutants across three vacuous assertions** — including a test whose name promised it rejected duplicate slugs and which passed with the duplicate check deleted. Slice 2 returned green with a home page identified by **array position**, invisible to mutation testing entirely: correct code, correct tests, and a caller reordering an argument would silently move the site's home page. Three redundant branches were found by mutation and none by review; one design defect was found by review and could not have been found by mutation. **A 100% score reads like an all-clear and is not one.**

**The route-literal guard earned its place on its first run**, flagging `/about` in a fixture where every neighbouring fixture was already invented — and firing on nothing else: not the invented slugs, not `'/es'`, not the template literals.

**Loose ends became `TASK 42` and `TASK 43`**, plus notes on the ratchet, trace-fidelity, gate and article-template items, and one constraint on the home item: the core orders case studies alphabetically by slug, which is deterministic, plausible-looking and **not** the published order. Detail: `progress/2026-08-24-08-task22-content-layer.md`.

**Superseded opening note follows, kept for the trail.**

**Opened 2026-08-24.** `SPEC-TASK-22-content-layer.spec.md` drafted, nine behaviors, **checkpoint open**. Four scope calls taken with the author before writing it — the diagram directive and the rehype wiring defer to the item that renders prose, the route-literal guard checks for literals naming a real slug, and the gateway exposes the interface strings. Four findings from validating against real state, three of which would have failed the gate had the spec been written from the documents alone: `stryker.config.mjs` generates mutants for this surface that **no test file is handed to the runner to kill**; `gate.mjs` has no step for the core's tests at all; the installed Zod is 4.4.3, where `ADR-002`'s `.passthrough()` is deprecated; and `guards.config.json`'s self-staling `docs.ignore` entry for `site/src/content.config.ts` expires the moment this item creates that file. Detail: `progress/2026-08-24-08-task22-content-layer.md`.

The reusable core, and the item most of the site's value depends on. Astro content collections over `resources/`, with the minimal Zod schema and the `slug`-based locale join.

**Deliverable:** `site/src/content.config.ts` plus a small query module — `getPage(slug, lang)`, `listCaseStudies(lang)`, `getAlternate(slug, lang)`.

**Done:** every file in `resources/` loads and validates; both locales of every `slug` join; a query for a slug that exists in only one locale fails loudly at build rather than rendering a half-page; **an absent optional field returns `undefined` and the consuming component omits its block** — proven with a test, not by inspection; **the route set is derived from the collection and a test asserts no route string is hardcoded anywhere else** (criterion 4).

**Constraints**
- Five universal keys (`slug`, `lang`, `type`, `title`, `confidentiality`) plus per-type required keys, per `ADR-002` and `C-14`. **An unknown `type` is a build failure, not a pass** (`P-13`).
- `resources/**` is read-only (`H-02`). The collection reads it; nothing writes back.
- **Resolves `ADR-003`'s two open items**, which have had no owner since: the in-body link-rewriting mechanism (`/case-studies/x` → `/es/case-studies/x` inside Markdown prose), and whether Astro's built-in i18n fallback fires for collection-driven routes. Both get an answer in the ADR, not just in code.
- Diagrams are pre-rendered SVG (`TASK 17`), so **no Mermaid at build time** (`ADR-002`).

---

## TASK 23 — Tokens and the layout shell · `feature` · `DONE` · **ran tenth**

**Closed 2026-08-25.** `SPEC-TASK-23` shipped in seven delegated slices. The site now serves `/` and `/es/` with a complete rail, footer, both themes and all three responsive states — **and zero `<script>` tags reach the page before the rail does**, so the no-JavaScript contract holds by construction rather than by discipline.

**Measured:** guard suite **476 → 506** · site core **43 tests** · component tier **15 tests in jsdom, 14/14 mutants killed** on an independent battery · `astro check` **0 errors across 27 files** · gate **18 steps**.

**The two mechanizations this item owed are built, and `S-05`’s row was wrong twice.** It promised a **Stylelint** assertion that `ADR-008` — its stated origin — never chose; and it required two things CSS cannot both satisfy, since a media query cannot read a custom property. Both corrected. The token guard **derives the sanctioned set from the stylesheet** rather than carrying a list, and the weakening is stated in the rule rather than hidden: an invented fourth breakpoint is caught, the same sanctioned width repeated across eight components is not.

**The precision result matters as much as the recall one.** Against 26 real files full of expressions, punctuation, HTML entities, class names and scoped `<style>` blocks, the string guard reports **exactly one** finding — the wordmark, which is a real violation with no content key to fix it. Four red paths planted against the real tree were all caught and all restored byte-identically.

**A defect caught before it could be measured.** Stryker’s `mutate` glob now reads `site/lib/**`, and the behaviour modules land there with `.component.test.ts` tests that **Vitest** runs — not the tap runner. Every mutant generated for them would have had no killer, dropping the aggregate for a surface that is genuinely tested. Excluded with the reason written at the exclusion; it would otherwise have surfaced only as an unexplained score drop.

**Two orchestrator misses, recorded because they read identically from outside.** Slice one was closed on a green suite and a mutant battery **without running `check-site`** — the route-literal guard from the previous item then found six literals in it. And the behaviour modules were closed on Vitest and mutants **without running `astro check`**, which had accumulated **19 type errors**. Verifying the artifact against *some* of the checks that apply to it is a quieter version of trusting the report.

**Loose ends became `TASK 46` and notes on the budget and gate-honesty items.** The wordmark and the socials block both need content the author owns. Detail: `progress/2026-08-24-10-task23-layout-shell.md`.

**Superseded opening note follows, kept for the trail.**

**Opened 2026-08-24.** `SPEC-TASK-23-layout-shell.spec.md` written and **approved by the author at the checkpoint** — `status: active`, `approved_version: 1.0`. Nine behaviors, `SHELL-001`…`SHELL-009`, seven of them `critical`. Two prerequisites were cleared first and are recorded as their own closed items rather than absorbed into this one: the test and mutation globs now cover the whole core, and the component test tier exists.

**Four delegated slices, cut by object** (`P-09`): the nav structure core · the token stylesheet and the shell markup · the two guard assertions · the two DOM-requiring behaviour modules. **Slices two and three run in that order deliberately** — the guard lands *after* the code it judges, so it can be proven in red against a real tree rather than only against fixtures. That ordering is what made the route-literal guard from the content-layer item find a real violation on its first run.

**Verification is one shared pass at the end**, on the author's instruction: Stryker is the expensive operation in this repository, and this item plus its two prerequisites all move the denominator, so measuring three times prices two intermediate numbers nobody will use. `break` is re-measured once, against the run that follows all of it.

Everything every page shares: the `oklch` token set and its `data-theme` swap, the three-state responsive contract, the rail (wordmark, nav, language switcher, theme toggle, socials), and the footer.

**Deliverable:** a base layout component plus one global stylesheet, lifted from the canvas.

**Done:** the theme toggle persists across navigation; the language switcher points at the *same page* in the other locale; **the rail marks the current section on scroll, and with JavaScript disabled it is still a working list of links**; **tokens are declared in exactly one stylesheet, with a build-time assertion that no color or breakpoint literal appears outside it** (criterion 4).

**Design fidelity:** the rail, footer and all three responsive states diffed against `Components.dc.html` §01–§05 and any page artboard. `TASK 27` is the mechanism.

**Note:** the canvas repeats the token block in every `.dc.html`. That is correct for eleven independent mockups and would be a defect here — **do not carry it across.**

**Two mechanizations this item owes, both decided with the author on 2026-08-24 before the spec was written.**

**The `S-05` assertion is `check-site`, not Stylelint** — and the registry row that said otherwise was wrong. `50-implementation.md` promised *"the Stylelint assertion behind `S-05`"*, but `ADR-008`, its stated origin, **never chose Stylelint**: the word does not appear in the ADR. A rule asserting a mechanism its origin does not support is the shape `G-10` exists to prevent, so the row is corrected as part of this item. The guard **reads the token stylesheet and derives the `--*` names from it** rather than carrying a list; outside that sheet, no `#hex`, no `rgb(`/`rgba(`/`hsl(`/`oklch(`, and no `max-width:`/`min-width:` inside an `@media`. Rejected: installing Stylelint, which would add a dependency and a gate step for one assertion and make its config a **second** declaration site for what counts as a token — a roster, which is the shape `P-13` rejects.

**The `S-01` assertion is built here, scoped.** In `.astro` outside the gateway: no text node and no human-readable attribute (`aria-label`, `title`, `alt`, `placeholder`) carries a run of letters outside an expression. The switcher’s punctuation (`/`, `·`) does not fire, because it is not letters. This is the first markup with strings in it, so it is the first time there is anything to scan.

**The register says three states and the artboards carry four breakpoints.** There is a `560px` query adjusting padding and title size in every page artboard. It is **not** a fourth state — the rail only changes shape at 820 — so all four media queries are implemented and "three states" is read as the rail’s layout contract rather than a breakpoint count. Recorded so the fidelity diff is not written against three.

**Constraints**
- **Rail position tracking is an acceptance criterion, not a nice-to-have** — the author has raised it four times and it is the one interaction they called indispensable. The full acceptance list is in `docs/design/decisions/2026-08-22-site-structure.md`; a working ~30-line reference implementation is in the canvas source, generalized over `data-spy`.
- Tracking is a **progressive enhancement**, never the mechanism. **No-JS is a supported state, not a degraded one.** Per `ADR-007` this is *not* a Preact island: the rail is server-rendered markup because it has to work without JavaScript, and the tracking is a script attached to it. The theme toggle is the same shape, and for a sharper reason — it must resolve before first paint, which hydration cannot do.
- Three states: wide >1180, medium 820–1180, narrow <820 where the rail becomes a top bar. No fixed width floor.
- The theme choice must not flash on load — set it before first paint, or accept a flash and say so.

---

## TASK 24 — Home · `feature` · `TODO`

**Deliverable:** `/` and `/es/`, rendered from `home.{en,es}.md` and the case-study collection — hero, employers, work bento, stack strip, testimonials, contact.

**Done:** every list renders from content; **adding a case study `.md` pair changes the bento with no template edit**, proven by actually adding a throwaway sixth and removing it; the testimonials block is absent while `TASK 19` is open; the hero background and the per-tile motifs are swappable per instance.

**Design fidelity:** diffed against `Main.dc.html` (wide, medium) and `HomeMobile.dc.html` (390), both themes; the Spanish route against `HomeES.dc.html`, which is the length stress test and the reason it exists.

**Constraints**
- The hero composition and each tile motif are **props, not hardcoded children** — this is the specific pair the author called out as reading like one-offs when they are not.
- Contact form is `mailto:` for now, with the designed `sent`/`error` states unused; do not build a fake success state that lies.
- Logo slots render only when a logo file exists, and the wordmark stands alone otherwise (component sheet §14).
- **The technology strip is derived from the case studies' `stack` arrays, and needs a normalisation rule decided rather than discovered.** Measured 2026-08-24: all fifteen artboard chips are in the union of the five case studies, so derivation works — but that union holds twenty distinct values with real overlaps (`AWS` beside `AWS Fargate` and `AWS Lambda`; `SQL Server` beside `SQL Server 2012 → 2022`; `BIAN` beside `BIAN microservices`) plus two the design dropped. The artboard's fifteen are a curated subset, so a naive union renders twenty chips.
- **The content layer returns case studies in alphabetical slug order, and that is not the published order.** `listCaseStudyEntriesForLang` sorts by `slug` because the core was asked for *the same order on every call* and nothing more — determinism, not curation. **Alphabetical is deterministic, looks plausible and is wrong**, which is exactly how it ships unnoticed. The published order is this item's to decide, and `featured` is already on every entry. Do not leave the core's ordering as the site's ordering by default.
- **The employer strip has no structured source until `TASK 20` lands.** Its four entries live as prose in `experience.{en,es}.md`. Omit the section rather than hardcode it — a section is omitted when its content is absent.

---

## TASK 25 — Case study and platform templates · `feature` · `TODO`

The two article archetypes, and the five case studies routed through them.

**Deliverable:** `/case-studies/[slug]` and `/es/case-studies/[slug]`, one template per `type` (`case-study`, `platform`), each with the rail table of contents.

**Done:** every case study renders in both locales; the table of contents is generated from the article's own headings, never hand-written; scrolling marks the current heading; diagrams render as static SVG and scroll horizontally rather than overflowing at narrow.

**Design fidelity:** the case-study template against `CaseStudyDetail.dc.html` and `CaseStudyMobile.dc.html`; the platform template against `PlatformPage.dc.html`. Both themes, all three widths.

**Constraints**
- `platform` gets the distinct treatment the design specifies — a scale figure instead of an outcome metric, a services grid, and Deep Dives styled as the card language its children use elsewhere.
- **`/case-studies` (the index) is designed and deliberately not routed.** It ships when the list outgrows the home section, roughly eight items. Do not route it in this item.
- **`scale` is one content string and the artboard prints it as two.** The platform page shows a large figure over a small caption; the frontmatter carries `"Hundreds of thousands of active users"`. No number is invented either way — it is already in the content, in words. Choose: split the field in two keys, or render the string whole and accept that the artboard's typographic split is not reproduced. State which.
- **The platform-to-deep-dive relation has no structured field, and cannot get one.** `mobile-banking-platform` is the parent of three of the four case studies, and that relationship exists **only as prose links in the article body** — there is no `parent` or `children` key in any frontmatter, and `resources/**` is frozen (`H-02`), so one cannot be added. The only structured signal is `type: platform` versus `type: case-study`, which says a page *is* a parent but not *of what*. Decide how the Deep Dives grid gets its list — parse the body links, derive from `type` and accept showing all siblings, or ask the author for a content change — and say which. Found 2026-08-24 by `TASK 22`, which owns the collection and deliberately did not invent a relation the content does not carry.
- **`skills` has no label in any artboard.** The five case studies carry the field and none of the eleven artboards shows it. Render it unlabelled or do not render it; **inventing a label the design does not have is what criterion 3 forbids.** Say which was chosen.

---

## TASK 26 — About, Experience and 404 · `feature` · `TODO`

**Deliverable:** `/about`, `/experience`, the bilingual 404, and their `/es/` counterparts.

**Done:** About renders on one centred axis with photo figures omitted while `TASK 20` is open; Experience renders the chronology from `experience.{en,es}.md`; **the 404 is served with a real `404` status, never a `200` carrying error copy** — a soft 404 is indexed as a real page.

**Design fidelity:** against `About.dc.html`, `Experience.dc.html` and `NotFound.dc.html`. About's rule is the one to assert explicitly — **one centred axis, exactly two widths** — because it is the constraint three earlier versions broke.

**Constraints**
- The 404's language switcher marks neither locale as current. That is a designed state.
- Experience entries take an optional logo; absent is a supported value.

---

## TASK 27 — Design-fidelity harness: dev, prod and the design as three things · `harness` · `TODO` · **runs before the page items**

`INC-03`'s remedy, deferred since `docs/harness/architecture.md` §M *"until the site has screens worth diffing"*. The site is that trigger — and this is the mechanism criterion 3 names, so **it is built before the screens it checks, not after them.** Built afterwards, the first three pages ship unverified and then get retrofitted, which is the more expensive order and the one that quietly never happens.

**Deliverable:** a Playwright suite that captures every route at 1440 / 1024 / 390 in both themes and both locales, and diffs **three** things: the local build, the deployed build, and the design intent — the corresponding artboard, rendered from `docs/design/canvas/build/src/`.

**Done:** the suite is reachable from `npm test` — i.e. it runs as a sub-gate of `gate.mjs`, not as a separate invocation someone has to remember; a deliberately introduced CSS regression fails it (`P-14` — proven in red, never merely seen to pass); a page item can name its artboard and get a pass/fail without writing new harness code.

**The prod comparison is deferred, and deferred out loud (amended 2026-08-23).** The backlog is now local-first, so there is no deployed build to compare against until `TASK 32`. The mechanism is still built for **three** targets: the prod target reads its base URL from an environment variable and, when that is unset, reports `skipped — no deployed build exists yet (TASK 32)`. A skip that names its reason and its owner is `P-03` applied to a test — silence reads as coverage, a named skip does not. Removing the third leg instead would remove `INC-03`'s entire lesson.

**Constraints**
- **Three comparisons, not two.** `INC-03`'s origin was a CSS-purge defect invisible in dev, with seven element-level defects surviving two visual reviews against a dev build. Dev-vs-design alone would have missed it exactly as it was missed then, and prod-vs-dev alone would not have known what correct looked like.
- **The skip is temporary by construction.** `TASK 32` is not done until the base URL is set and the prod comparison passes. A skip with no owner is a skip that becomes permanent.
- **Routes and artboards are both enumerated from their artifacts** — the content collection and `canvas.json` — never from a list in the test file (`P-13`). `docs/design/canvas/verify.mjs` already does exactly this and is the pattern to copy.
- A pixel diff on a whole page is a test that fails for the wrong reasons. Diff at the **component** level against the sheet, with a tolerance, plus a small set of full-page structural assertions.
- The artboards are mockups: content differs from the real content by design. **The comparison is structural and stylistic — layout, tokens, spacing, states — never text equality.** An item claiming otherwise would fail forever and be switched off.
- Installs Playwright, which also unblocks the e2e half of `TASK 15`.

---

## TASK 28 — Custom domain · `feature` · `TODO` (blocked: the domain does not exist yet)

**Deliverable:** the site served from the author's own domain over HTTPS, with `*.workers.dev` redirecting to it.

**Done:** the apex and `www` both resolve; the certificate is valid; no route 404s that worked on the previous host.

**Constraints**
- **The author buys the domain and owns the Cloudflare account.** An agent prepares the DNS and route config; it does not purchase, authenticate or transfer anything.
- A portfolio sent to recruiters wants a real domain, so this should not sit open long — but it was correctly kept off the critical path for the first deploy.

---

## TASK 29 — Contact form Worker · `feature` · `TODO` (deferred — trigger stated)

Replaces `mailto:` with a real submission, which is what makes the form's four designed states real.

**Deliverable:** a Cloudflare Worker accepting the form POST and sending mail, with the `sending` / `sent` / `error` states wired to it.

**Done:** a submission arrives as email; a forced failure shows the error state **with the sender's text intact**; the success state echoes back the address the reply will go to.

**Constraints**
- **Returns when the author wants submissions without a mail client opening.** Until then `mailto:` is not a stopgap, it is the shipped answer.
- The API key lives in Cloudflare, never locally (`G-08`).
- Needs a spam answer — a Turnstile challenge or a rate limit. A public unprotected form is a mailbox someone else fills.

---

## TASK 20 — Split About and Experience, and source three photographs · `content` · `TODO`

`about.{en,es}.md` and `experience.{en,es}.md` tell the same chronology twice. About walks the four employers in prose; Experience lists the same four employers with the same facts in a different register. The design work in `TASK 8` surfaced it — the author's words: *"ahorita las 2 páginas se ven muy parecidas"* — but no design can fix it, because the duplication is in the content.

**The split, decided with the author:** Experience owns the employer story outright. About becomes a piece of writing about the person, not a second CV.

**Done:** `about.{en,es}.md` contains no employer-by-employer chronology and `experience.{en,es}.md` carries the narrative that was moved out of it; the four `[NEEDS INPUT]` items below are resolved or explicitly dropped; `check-terms` and `check-content` pass.

**What has to be written or found**

| Item | Where it lands |
|---|---|
| A lead paragraph opening About as a person rather than a résumé | `about.{en,es}.md` |
| Two or three sentences on working from Cochabamba for teams abroad — the site currently says nothing about it beyond a timezone | `about.{en,es}.md` |
| Per-role narrative moved out of About | `experience.{en,es}.md` |
| An `h1` and an intro line for Experience, plus a per-role `stack` field | `experience.{en,es}.md` frontmatter + body |
| **Three photographs** — a 4:5 portrait, a 21:9 Huayna Potosí summit shot, a 1:1 Bolivia landscape or travel image | `resources/` (new), referenced from `about.{en,es}.md` |
| **The four employers as structured entries** — `company`, `period`, optional `logo` — because the home page's employer strip and the Experience page both render them as data and the file is prose today. Found 2026-08-24 while drafting the chrome strings: nothing in `resources/` holds that list as structure, so the home item cannot render the strip without hardcoding four names, which criterion 1 forbids | `experience.{en,es}.md` frontmatter |
| **An `h1` for About** — the artboard carries one and no content file does. Found in the same pass; the row above it names the lead paragraph but not the headline | `about.{en,es}.md` |

**Constraints**

- **Both locales in the same change** (`C-09`). The Spanish is first-class content, not a translation artifact.
- **Nothing invented** (`C-01`, `C-04`). The design carries `[NEEDS INPUT]` markers exactly where copy does not exist yet; they are resolved by the author writing it, never by an agent drafting something plausible about his own life.
- **The photographs are the author's own.** No stock, no AI-generated stand-in — the portrait in particular is the one image on the site whose only job is to be him.
- **Third parties in photographs need their consent**, or crop them out (`C-06`).
- The design canvas is downstream: its placeholder frames are replaced once these land, not before.

---

## TASK 19 — LinkedIn recommendations as content · `content` · `TODO`

The home page's contact section carries three testimonial cards, currently `[NEEDS INPUT]` placeholders in the design canvas. They cannot be filled from the design task: the quotes are real words written by real people about the author, so they are content, they belong in `resources/`, and `H-02` puts that outside any agent's reach.

Three recommendations exist on the author's LinkedIn profile: a manager at NICE, a Product Owner at Banco Solidario, and a second manager at NICE.

**Done:** `resources/testimonials.en.md` and `resources/testimonials.es.md` exist, both locales, each carrying for all three recommendations: the quote verbatim, the recommender's name, their title and company at the time of writing, and the permalink to the recommendation on LinkedIn. `check-terms` and `check-content` pass.

**Constraints**

- **Nothing is invented or paraphrased into existence** (`C-01`, `C-04`). A quote that cannot be copied exactly is a `[NEEDS INPUT]`, not an approximation.
- **The recommenders are third parties.** Their names and public professional titles are fine; anything beyond that — contact details, anything they said privately — is not (`C-06`).
- **Both locales in the same change** (`C-09`). The quotes were written in one language; the other locale carries a translation clearly marked as such, with the original preserved, rather than a silent restatement.
- The design canvas's placeholder cards are updated to the real text once this lands — the canvas is downstream of the content, not the other way round.

---

## TASK 9 — Harness export v2 · `harness` · `TODO`

`export-harness-v2.md`: the portable bootstrap that installs this harness on another project, plus the method for comparing it against harnesses in other projects.

**Written from the harness, not from this plan** — and only after the harness has driven real work (TASK 8's first items) and been scored at least once. The point of an export is to carry what worked, not what was designed. Writing it earlier would export a hypothesis.

**Trigger:** the first `EVAL` with a real, non-harness workload.

---

## TASK 16 — About page: 16Personalities aside · `content` · `DONE`

**Closed 2026-08-19.** The author applied the drafted paragraph to both locales directly (`H-02` — the agent could draft it but not write it). `check-terms` and `check-content` pass. One drift from the draft: the link landed as plain text (`Full profile → https://...`) rather than a Markdown link (`[Full profile →](https://...)`) — worth fixing to a real link when next editing this file, since it won't render as a clickable link otherwise; not blocking, and the agent cannot fix it directly (`resources/` stays frozen).

One short closing paragraph on `about.{en,es}.md`: the author tested as INTJ-A ("Architect") on 16Personalities, linked to the full profile, tied to the independent-decision pattern already visible in the case studies above it — not the test's standalone trait/weakness list (`C-10`, `C-15` — reviewed and agreed with the author before drafting).

**Found while executing this item:** `resources/` is rung-1 read-only for **every** agent in this session, including the orchestrator — not only delegated roles. `H-02`'s deny rule (`Write(./resources/**)`, `Edit(./resources/**)`) and `D1` ("`resources/` becomes a runtime-enforced read-only input") apply session-wide; there is no reopening mechanism, by design — TASK 5 closed the content backlog on purpose. This is the same boundary TASK 6 will hit when the author hand-authors diagram replacements: content changes to `resources/` happen through the author's own editor, never through the agent, from here on.

**Done:** the drafted paragraph (below, both locales) is applied to `resources/site/about.{en,es}.md` by the author directly, and `./scripts/check-terms.sh` + `check-content` pass on the result.

**Blocked on:** the author applying the text — drafted and ready, `TASKS.md`/`progress/` cannot carry it further.

**Drafted text — English** (appended after the closing "Outside of work…" paragraph):

> For a second data point on the same thing: I tested as an INTJ-A — "Architect" — on 16Personalities. Independent, rational, and more at ease designing a system than running the room it lives in, which lines up with how most of the decisions above actually got made. [Full profile →](https://www.16personalities.com/profiles/21180e3e5b55c)

**Drafted text — Spanish** (mismo lugar, `about.es.md`):

> Como segundo dato sobre lo mismo: en 16Personalities salí INTJ-A — "Arquitecto". Independiente, racional, y más cómodo diseñando un sistema que dirigiendo la sala donde vive, algo que coincide con cómo se tomó la mayoría de las decisiones de arriba. [Perfil completo →](https://www.16personalities.com/profiles/21180e3e5b55c)

---

## TASK 17 — Pre-render placeholder diagrams to static SVG · `content` · `DONE`

**Closed 2026-08-19.** All 11 `.svg` files applied to `resources/diagrams/` by the author (confirmed via `git status` — tracked, not gitignored). `tmp/diagrams-task17/` removed. Gate green.

Raised by the author while reviewing `ADR-002` (content pipeline, TASK 7 decision 4): rather than have the site's build render Mermaid on every build (a headless-browser/Puppeteer dependency that would persist for as long as any diagram `id` lacks a hand-authored replacement, per TASK 6's "one at a time, as needed" pace), render the current 11 `.mmd` placeholders to real `.svg` files **once**, now, and check them in as the actual content. From then on the build's diagram step is a plain file copy — no Mermaid, no Puppeteer, ever — and a pre-rendered placeholder is indistinguishable from a future hand-authored replacement to the pipeline. See `ADR-002`'s Sub-decision 2 for the full reasoning.

**Feasibility verified this session, not assumed (`P-04`):** all 11 `.mmd` files rendered successfully with `@mermaid-js/mermaid-cli@11.16.0`, exit 0, including `otp-breakeven` (`block-beta` — the one TASK 1 flagged as fragile; it rendered fine, 18.6 KB, 26 real `<rect>` elements, no error). Output — `attendance-c4-component.svg`, `attendance-c4-container.svg`, `attendance-c4-context.svg`, `migration-phases.svg`, `otp-breakeven.svg`, `otp-c4-after.svg`, `otp-c4-before.svg`, `platform-auth-boundary.svg`, `platform-c4-context.svg`, `qr-c4-container.svg`, `qr-permission-model.svg` — sits at `tmp/diagrams-task17/` in this repository (gitignored scratch space, not published content), ready to copy in.

**Done:** all 11 `.svg` files placed at `resources/diagrams/{id}.svg` by the author (the `.mmd` sources can stay alongside as the editable record, or be removed — author's call, the pipeline only reads the `.svg`), `tmp/diagrams-task17/` removed once copied, and `./scripts/check-terms.sh` passes on the result.

**Blocked on:** the author copying the files from `tmp/diagrams-task17/` into `resources/diagrams/` — same `H-02` boundary as TASK 16, the agent generated the files but cannot write them into frozen `resources/`. **Also fixed while opening this item:** `.gitignore` was ignoring `resources/diagrams/*.svg` on the old assumption that it was always build-regenerated — corrected, or these files would land in `resources/diagrams/` and git would silently never track them.

---

## TASK 18 — Trace redaction false-positives on opaque IDs · `bugfix` · `TODO`

`INC-15` (`docs/harness/architecture.md` §C). `check-trace`'s whole-file redaction scan (`validateTrace` in `scripts/guards/lib/evidence.mjs`) substring-matches every `private/banned-terms.txt` entry against the **entire serialized trace line**, including fields that are never authored content — `tool_use_id`, `run_id`, `parent_run_id` are opaque, API-generated random tokens. A 4-character banned term coincidentally appeared inside a `tool_use_id` during a `researcher` run this session, failing the gate on a true string match that carries zero actual confidentiality risk.

**The check's whole-file design is correct and should not be narrowed carelessly** — its whole point is catching a leak by a route nobody wrote a specific redactor for (`docs/harness/architecture.md`, INC-15's row). The fix is precise, not a general loosening: exclude the known-opaque, system-generated fields from the scan by name, and keep every content-bearing field (tool inputs, results, targets, messages) covered exactly as today.

**Done:** `validateTrace` (or its caller) excludes `tool_use_id`, `run_id` and `parent_run_id` from redaction scanning by field name — never by a blanket "looks like an ID" heuristic, which would quietly widen the exclusion over time — with a red test proving a banned term inside one of those three fields no longer fails the check, and a red test proving a banned term in any other field (e.g. a tool `target` or a future content field) still does.

**Constraints**

- Do not touch `redactToolInput`'s own scrubbing (`scripts/guards/lib/evidence.mjs`) — that's a separate, working mechanism for a different purpose (masking known-sensitive input fields at write time), not the one that flagged this.
- This incident's affected trace file (`evidence/runs/9a066423-fbac-4ece-8677-6d0ac7fce237/researcher-a0400b23ffcda81af.jsonl`) was hand-edited by the human to remove the leaked lines, which broke `seq` continuity — a second, expected finding from the same guard, working correctly. That file should be deleted outright (evidence is gitignored, uncommitted, disposable) rather than hand-patched to restore density; not this task's job to fix, since evidence/ is `H-03`-protected from every agent, including this one.

---

## Deliberately out of scope

- **Demo / reconstruction projects.** A repo built in a hurry looks junior and
  contradicts the positioning. The case studies are the evidence.
- **Technical articles.** Later, derived from these case studies. Not now.
- **Agent orchestration machinery.** Role files with a bootstrap, guards and procedures — not a framework. No agent graph engine, planner, memory platform or agent-to-agent bus. The architecture permits them later; the harness does not contain them. Full list: `docs/harness/architecture.md` §M.

> **Amended 2026-08-17.** This section previously deferred *"agent workflows, spec pipelines, eval harnesses"* as premature, pending the content backlog closing. It has closed (TASKS 0–4 `DONE`), which is the trigger that entry named, and TASK 5 is that revisit. What remains out of scope is narrower and is stated above.
