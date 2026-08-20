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

**Done:** a delegated run stopped by its budget writes `run.footer` with `termination.state: FAILED` and the budget named · at least one `run.header` carries a real `permission_mode` rather than the literal `"unknown"` · a delegated run's trace contains `instructions.loaded`, **or** `evidence.md` and `contracts.md` §6 both record that L is orchestrator-only and why · no trace file exists whose only event is a footer, none carries `agent: ""`, and none reuses a `tool_use_id` across two tool calls · `check-trace` asserts whether `run.header` is once-per-run or once-per-resume and fails a fixture violating it.

**Constraints**

- `H-03` still holds: only hooks write `evidence/`. Fixing the writers is in scope; editing a trace is not.
- The `permission_mode` capture may turn out to be unavailable from the hook payload. If so, the honest outcome is a recorded finding plus a correction to `G-04`'s claim — not a fabricated value.
- Re-measure `harness-evaluator`'s turn budget while here (`GAP-13`): it was raised 20 → 60 after a run was cut off mid-analysis, and one completed run is now available as a data point.

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

## TASK 15 — Mutation gate, or an honest rung · `harness` · `TODO`

From `EVAL-000` (`GAP-02`). `T-03` places the mutation gate at **rung 2**; `scripts/gate.mjs` has thirteen steps and none is a mutation run. Every mutation result in `progress/` was produced by hand. The rung claim is therefore ahead of reality, which is the same defect step 12 found in `C-09` and `C-14`.

**Unblocked 2026-08-19** — `TASK 7`'s decision 5 (`ADR-006`) fixed the tool: Stryker Mutator + `@stryker-mutator/tap-runner`, `break: 100`, one config over `scripts/guards/**` (and, once it exists, `site/lib/content/**`). **Either outcome closes this:** the gate runs mutation over `scripts/guards/**` and a surviving mutant fails it, **or** `T-03` reads rung 4 with the reason recorded. `G-11` requires the honest claim, including downward.

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

## TASK 8 — Site work breakdown · `planning` · `TODO`

**Unblocked 2026-08-19** — `TASK 7` closed, 6/6 ADRs accepted.

Turn the site from one word into a backlog. Runs through the `work-item` procedure and produces new `TASK N` entries here — design items, implementation items, and evaluation items for both the site and the harness.

**Done:** every entry has a type, one deliverable, and a done someone else could check. No entry reads "investigate X" without a concrete definition of done — if you cannot say when it ends, it is a note, not a work item.

**Constraints — two items the breakdown must not omit:**

- **A design/UX task**, generating the actual per-page designs the implementation items build against. Raised by the author while reviewing `ADR-006`: nothing in the backlog yet owns "what each screen looks like" as its own deliverable.
- **The `INC-03` visual-QA rigor checklist**, as its own evaluation item — a script/test comparing the real rendered site, both locally and once deployed (`ADR-004`: Cloudflare Workers), against each screen the design task produces. `docs/harness/architecture.md` §M already recorded this as deferred *"until the site has screens worth diffing"* — `TASK 8` is that trigger. `INC-03`'s own origin: a CSS-purge defect invisible in dev, seven element-level defects surviving two visual reviews against a dev build — the remedy has to diff dev, prod, and the design intent as three distinct things, not two reviews at a glance.

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
