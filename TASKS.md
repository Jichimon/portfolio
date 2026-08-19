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

**Una dimensión de aceptación queda abierta y se declara en voz alta** (`P-03`: el silencio se lee como cobertura). El ítem 8 de la suite — el smoke test de sesión fresca — **no se corrió**, porque no es auto-administrable: pide que una sesión nueva describa sin ayuda el boundary de git, el flujo spec-first y dónde viven las reglas, y una sesión que acaba de construir el harness no puede dar esa respuesta sin contaminarla. Se corre al abrir TASK 7, que es una sesión fresca por naturaleza. Los otros diez ítems pasaron, siete verificados contra artefactos.

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

**Done:** a delegated run stopped by its budget writes `run.footer` with `termination.state: FAILED` and the budget named · at least one `run.header` carries a real `permission_mode` rather than the literal `"unknown"` · a delegated run's trace contains `instructions.loaded`, **or** `evidence.md` and `contracts.md` §6 both record that L is orchestrator-only and why · no trace file exists whose only event is a footer, none carries `agent: ""`, and none reuses a `tool_use_id` across two tool calls · `check-trace` asserts whether `run.header` is once-per-run or once-per-resume and fails a fixture violating it.

**Constraints**

- `H-03` still holds: only hooks write `evidence/`. Fixing the writers is in scope; editing a trace is not.
- The `permission_mode` capture may turn out to be unavailable from the hook payload. If so, the honest outcome is a recorded finding plus a correction to `G-04`'s claim — not a fabricated value.
- Re-measure `harness-evaluator`'s turn budget while here (`GAP-13`): it was raised 20 → 60 after a run was cut off mid-analysis, and one completed run is now available as a data point.

---

## TASK 13 — Capture K1 · `feature` · `TODO`

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

## TASK 15 — Mutation gate, or an honest rung · `harness` · `TODO` (blocked by TASK 7)

From `EVAL-000` (`GAP-02`). `T-03` places the mutation gate at **rung 2**; `scripts/gate.mjs` has thirteen steps and none is a mutation run. Every mutation result in `progress/` was produced by hand. The rung claim is therefore ahead of reality, which is the same defect step 12 found in `C-09` and `C-14`.

Blocked because the mutation tool and its threshold are TASK 7's decision 5. **Either outcome closes this:** the gate runs mutation over `scripts/guards/**` and a surviving mutant fails it, **or** `T-03` reads rung 4 with the reason recorded. `G-11` requires the honest claim, including downward.

**Done:** `T-03`'s rung matches what the gate actually enforces, and if it stays at 2, the gate enforces it.

---

## TASK 11 — Case-folded boundary comparison · `bugfix` · `TODO`

`isInside` compares a path to a boundary case-sensitively. On a case-insensitive filesystem — which is the one this repository lives on — a protected directory spelled in a different case reaches the same real files and matches no boundary. `INC-14` fixed the *resolver* (`repoRelative` now folds the root prefix) but not the *comparison*, and the two are separate halves.

Stated as a hypothesis, not a finding: unlike `INC-14`'s two defects, this one has not been reproduced against a live payload. The first job is to establish whether the runtime can actually deliver a differently-cased path, because if it cannot, the honest answer is a recorded reason not to change anything rather than a speculative fix.

**Done:** a red test that reaches a protected tree through a differently-cased path, then a fix that denies it — or a recorded finding that the runtime normalizes case before the hook sees it, with the evidence that shows it, and `EC-013`'s residual-risk note updated to match.

**Constraints**

- The direction matters and differs by list. For the **deny** boundaries (`H-02`, `H-03`, `H-04`) case-folding is strictly safer: more paths match, more get denied. For the **allowlist** scopes it is the permissive direction, so the two cannot simply share one comparison without saying which is which.
- Do not fold case on a case-sensitive filesystem, where two spellings are genuinely two files. CI runs on Linux; the guards must be correct on both.

---

## TASK 6 — Replace Mermaid diagrams with hand-authored assets · `content` · `TODO` (blocked by TASK 8)

The 11 `.mmd` files from TASK 1 are placeholders, not the final assets. Mermaid's
autolayout could not produce diagrams the author considers presentable — see TASK 1's
Known limitations. Once the site exists and a given diagram is actually needed on a
page, the author will hand-author its replacement (e.g. Structurizr or another
manually-laid-out tool), **one at a time, as needed — not as a batch.** Keep the
existing `id`s; only the asset behind `/diagrams/{id}.svg` changes, so nothing in the
case study markdown needs to change when a diagram is replaced.

**Acceptance**
- [ ] No blanket acceptance — closes incrementally, per id, as each is replaced.

---

## TASK 7 — Founding ADRs · `research` · `TODO` (blocked by TASK 5)

The technology decisions the site rests on. One short ADR each, human-approved one at a time, indexed in `docs/adr/README.md`.

**This is the first real work item to run through the harness**, and that run is the harness's acceptance test. If it needs more than two implement→verify passes, K1 says so and the harness gets corrected before any site code is written.

**Decisions to resolve**

1. **Site stack** — generator/framework, rendering model, and *why not the alternatives*.
2. **Hosting and deploy** — where it runs, what that constrains, how a deploy is verified.
3. **i18n strategy** — how the `slug` join key across `.en.md` / `.es.md` becomes routes.
4. **Content pipeline** — how `resources/**` is read, validated and rendered, including the `:::diagram` directive and the `/diagrams/{id}.svg` resolution.
5. **Testing toolchain** — unit runner, mutation tool and its threshold, e2e runner.
6. **Publication** — whether this repository gets a remote and under what visibility. Open since the TASK 4 audit; the site cannot deploy and CI cannot fire without it.

**Done:** an accepted ADR per decision, the ADR index live, the blank stack rows in `.claude/rules/` filled from the decisions actually made, and the gate's sub-gates real.

**Constraint:** answer a rule row only when there is a reason for it. A blank row is a legitimate answer; a speculative one is worse than nothing.

---

## TASK 8 — Site work breakdown · `planning` · `TODO` (blocked by TASK 7)

Turn the site from one word into a backlog. Runs through the `work-item` procedure and produces new `TASK N` entries here — design items, implementation items, and evaluation items for both the site and the harness.

**Done:** every entry has a type, one deliverable, and a done someone else could check. No entry reads "investigate X" without a concrete definition of done — if you cannot say when it ends, it is a note, not a work item.

---

## TASK 9 — Harness export v2 · `harness` · `TODO`

`export-harness-v2.md`: the portable bootstrap that installs this harness on another project, plus the method for comparing it against harnesses in other projects.

**Written from the harness, not from this plan** — and only after the harness has driven real work (TASK 8's first items) and been scored at least once. The point of an export is to carry what worked, not what was designed. Writing it earlier would export a hypothesis.

**Trigger:** the first `EVAL` with a real, non-harness workload.

---

## Deliberately out of scope

- **Demo / reconstruction projects.** A repo built in a hurry looks junior and
  contradicts the positioning. The case studies are the evidence.
- **Technical articles.** Later, derived from these case studies. Not now.
- **Agent orchestration machinery.** Role files with a bootstrap, guards and procedures — not a framework. No agent graph engine, planner, memory platform or agent-to-agent bus. The architecture permits them later; the harness does not contain them. Full list: `docs/harness/architecture.md` §M.

> **Amended 2026-08-17.** This section previously deferred *"agent workflows, spec pipelines, eval harnesses"* as premature, pending the content backlog closing. It has closed (TASKS 0–4 `DONE`), which is the trigger that entry named, and TASK 5 is that revisit. What remains out of scope is narrower and is stated above.
