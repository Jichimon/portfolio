# TASKS

The Work Item register. Read `CLAUDE.md` first.

Status values: `TODO` · `IN PROGRESS` · `BLOCKED` · `DONE` · `RETIRED`
Update the status line when a task changes state, and log the session in `progress/`.

**`RETIRED` means the deliverable moved to another id, never that it was dropped.** Added 2026-08-27, when `EVAL-001`'s nine items were consolidated. A retired entry **stays in place** carrying a pointer to the id that absorbed it: ids are stable and never reused, `progress/` and the scorecards cite them, and deleting the section would break every citation while making the consolidation invisible. A retired entry is not a done one, and nothing may close against it. **Reconciled 2026-08-28 (`P-07`).** This paragraph used to say the status token was not parsed by any guard and that the type was *"the first backticked token after the em dash"*. `TASK 74` made both false: `parseWorkItemTypes` now reads the status against the `Status values:` line above, and takes the type from the code span **immediately before it**, validated against the type table below. So `RETIRED` had to be added to that line for a retired item to resolve at all — and it did, which is the property that matters for `H-05`.

**A status change away from `DONE` carries a declaration line, and the gate checks it against git.** Added 2026-08-29 by `TASK 66`, because `K2` (done-reopens) had no substrate at all: this file records the current status only, so an evaluator can observe 0 reopens and cannot distinguish that from 0 *recorded*. The transitions themselves are now **derived** from `git log -- TASKS.md` — an artifact no agent can author, since `H-01` denies every git write at rung 1 — which needs no backfill and cannot be silently omitted. What git cannot say is why "done" meant two different things to the two parties, and that is the whole of `K2`. So a reopened entry carries, immediately under its heading:

```markdown
**Reopened <date>** — was `DONE` since <date>. <One sentence: what "done" meant to each party.>
```

`check-status-history` fails when a derived transition away from `DONE` has no such line, and when a line names a reopening the committed history does not show. Both directions are bounded by `statusHistory.reopenDeclarationsFrom` in `scripts/guards/guards.config.json`, the same dated-threshold mechanism the done-block conventions use. **A reopen made and reversed inside a single commit is invisible** — that is the boundary between the two metrics, and it is deliberate: `K1` counts implement→verify cycles inside a session, `K2` counts what survives into the committed register.

**Work Item model.** Every entry is one deliverable with a checkable done and a `type`. Ids are stable and never reused — `progress/` cites them.

| type | Produces a spec? | The artifact the human approves |
|---|---|---|
| `content` | No | the content file; the parity and terms guards are the contract |
| `research` | No | the ADR |
| `planning` | No | the generated work-item list |
| `feature` · `migration` | **Yes** | `docs/specs/SPEC-TASK-N-*.spec.md` |
| `bugfix` · `maintenance` | No | the diff |
| `harness` | No | the architecture document + the acceptance suite |
| `documentation` | No | the reconciled document |

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

## TASK 12 — Trace fidelity · `bugfix` · `DONE`

From `EVAL-000` (`GAP-03`, `GAP-04`, `GAP-05`, `GAP-07`, `GAP-08`, `GAP-09`, `GAP-13`). The trace is the substrate every KPI and every eval verdict is read from, and six separate things it records are wrong or missing. They share one surface — the hook writers — so they are one work item rather than six.

The one that matters most: **a run stopped by `maxTurns` is recorded as `COMPLETE`.** `G-06` promises `FAILED` with `budget_exhausted`; no footer on disk has ever said that. A failed delegation is currently indistinguishable from a successful one, which is `INC-06`'s lesson inverted — the agent delivers zero and the trace reports success.


**A second defect on the same surface, measured at the home item's wrap-up 2026-08-26 and reported here because this item owns the writers.** The `evidence trace` gate step fails against **this repository's four most recent runs**, not only historical ones — 25 findings against the newest, all of the same shape: `tool.result has no matching tool.requested`.

Characterized rather than guessed at. In the newest run's orchestrator file: 277 `tool.requested`, 278 `tool.result`, and **25 results whose `tool_use_id` never appears as a request**. Every orphan is a `Bash` call, every one `ok: true`. The sequence around them is the tell — at `seq 124` a `policy.decision` carries one id and at `seq 125` a result carries a different one — which is what interleaving looks like when **two tool calls run concurrently and the `PreToolUse` write is lost for one of them**. `seq` itself is dense in every file, so nothing is truncated; the counter is doing its job and the correlation is not.

**This costs more than a red step.** The trace's whole claim is that it can distinguish *the agent tried something dangerous* from *something dangerous happened*, and that distinction is derived from correlating a request with its decision and its result. A request that never lands cannot be correlated with anything, so a denied call whose request write was lost would be **invisible** — not reported as allowed, simply absent. The unsafe-action metric is counted from exactly these events.

For the record, the same run's two real attempts *were* captured: both `H-02` denials, `sed` aimed at `resources/`, both by the orchestrator, both recorded with request, decision and no result. The boundary held and the trace saw it. The question this raises is how many it did not see.

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

**An eighth specimen, 2026-08-25, and it is the first one that is NOT this entry's shape at all.** A component slice owning **two files** was cut at **~100k tokens across 30 tool calls** having produced **zero files**. Its last message was *"Now let's find the relevant CSS rules for `.hero`, `.hero-bg`, …"* — it was still **reading**.

**Every specimen before this one lost its output. This one never reached its output, because the input was too expensive.** The brief pointed it at `docs/design/canvas/src/Main.dc.html`, a 790-line artboard whose `<style>` block runs from line 11 to line 419, and the agent spent its whole budget grepping around inside it for the rules belonging to two sections. The file-count heuristic this entry records says two files completes; two files did not complete, and the reason has nothing to do with how many files were owned.

**So the datum needs a second axis, and it is one the orchestrator also controls.** `P-09` says to enumerate objects rather than surfaces and to cut scope when a slice will not fit — stated entirely in terms of what the agent must *produce*. This says the same discipline applies to what the agent must *consume*: a brief that names a large artifact and expects the agent to find the relevant part of it has handed over an unbounded read. **The fix that worked was the orchestrator doing the expensive read once** — the hero and marquee markup and CSS extracted to a 209-line working file, the brief pointed at that and explicitly forbidden from opening the artboard, and the scope cut from two components to one.

**This is the design canvas's problem specifically, and every remaining page item will hit it.** Eleven artboards, each repeating the full token block, each 790–806 lines. Three page items are still open and all three are briefed against them.

**The extraction has its own failure mode, and it was hit the same day.** Cutting an artboard into per-component slices silently drops the rules that belong to **no** component — the artboard's `section { padding: 0 72px; max-width: 1176px; margin-inline: auto; }` applies to every section on every page, so it appeared in none of the three extracts and reached none of the five components. The home page shipped with **no horizontal inset at all**, edge to edge, and every automated check passed: `astro check`, `check-site`, the smoke tier and the mutation gate are all blind to it, because nothing is wrong with the code. **The author found it by looking at the page.**

**It was hit again the same day, on the same page, four more times — so the failure mode is systematic rather than a one-off.** The author compared the built home page against the design and reported that the cards matched neither the layout nor the art. What that one look surfaced: the **five per-tile motifs did not exist at all** (the slice that owned them was never run, and its behavior sat at `planned` while the item approached closure); the **bento left a hole** where the design's `tile-wide` class would have gone; **three entire responsive stages** were absent — the one-column bento, the anchor tile's smaller heading and stacked foot, and the thesis stepping 40 → 30 → 25; and the **contact form ran 1032px wide** where the design gives its column a 520px measure. Every automated check was green through all four.

Three of them were **predicted in this repository's own logs before they shipped** — the contact slice wrote down that it was building no width constraint and flagged it as a loose end. That is the sharper finding: **a flagged loose end nobody converts into a work item is indistinguishable from one nobody noticed** (`P-06`). The flag cost the agent a paragraph and bought nothing.

So the technique's rule is: **extract the element-level CSS per component, and extract the global and shell-level rules once, separately.** A selector that names a bare element (`section`, `main`, `[id]`) or the page shell belongs to composition, and composition is the one stylesheet's job, not a component's. This is also `INC-03`'s exact shape — a defect invisible to every check and visible to a human on first look — which is what the design-fidelity item exists to mechanize.

**A seventh specimen, 2026-08-25, and it is the first one where the proposed mitigation was actually applied.** The smoke-tier slice was briefed with verification **removed from its scope** — three files, log-first, and the gate run, the red path and `astro check` all explicitly reserved for the orchestrator. It was cut anyway, at **38 tool calls and ~64k tokens**, with its final message reading *"Now let's run `npx astro check` first, then try building and running the playwright suite."*

**So excluding the proof from the brief does not prevent the cut either.** It changes *what is lost*: all three files had landed and were of good quality, so the loss was the account of the work rather than the work. That is a better failure than the layout-shell specimen's one-partially-written-file-of-seven, and it is still a run that reported nothing. Set beside the fifth specimen — briefed to measure first, and cut having produced zero tests — the two together say the cut lands on **whatever is last**, and that no reordering removes it. The candidates remaining are unchanged: a larger budget, or two runs.

**What it cost, measured rather than estimated:** one orchestrator verification pass, which found two defects the slice's own report would have claimed clean — a suite passing against a stale server, and a `webServer` race with the preview daemon. Recoverable when someone is watching, as this entry already records, and worth nothing when nobody is.

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

**Scoped 2026-08-27, and the substrate was read again before anything was planned (`P-04`). Three of this entry's premises moved, and one defect nobody had named turned out to be the largest.**

**The defect nobody had named: every `tool.result` in the corpus records `bytes: 15`. All 3,754 of them.** `15` is the length of `"[object Object]"` — the runtime sends `tool_response` as an object and `bytes()` in `scripts/guards/lib/evidence.mjs` passes it through `String()`. This is `INC-08` repeating **inside the subsystem built to prevent it**: a number that looks healthy and is a constant artifact of stringifying an object. Worse, the test that congratulates itself for catching `tool_result` against `tool_response` hands the function a **string**, so it asserts against a shape the runtime does not send — the passing test that tests its own mock, which `implementer`'s own role file names as its second failure mode.

**The orphan `tool.result` events are real losses, not an ordering artifact.** Both hypotheses were separated rather than assumed: of the 63 results with no matching request, **zero** have their request later in the same file. So `validateTrace`'s order-sensitive correlation is not the cause. All 63 are `Bash`, all `ok: true`, all in orchestrator files, across 6 run directories. The `PreToolUse` write never happened, and `INC-12`'s route is already closed by `G-13`, so there is a second cause still unnamed.

**`run.header` multiplicity is decidable, but only downward.** 118 headers across 101 files; every one reports `startup` or `delegated`, so the payload still cannot tell a resume from a cold start. What the corpus does support is that **no `run.header` is ever adjacent to another** — the 28 non-first headers are preceded by `tool.result` (21), `instructions.loaded` (4) or `run.footer` (3). So **once-per-resume is assertable and once-per-run is not**, and that is the decision this entry said had to be taken rather than discovered. Checked before proposing it, because this entry documents the trap: **11 files do not begin with a header**, so *"the first event is a `run.header`"* would turn the gate red on evidence no agent may clean (`H-03`). It is not being added.

**`permission_mode` is reachable and the route is confirmed live.** `SessionStart` and `SubagentStart` omit it — a fresh header written this session reads `permission_mode: "unknown", model: null` — but `PostToolUse` carries it, captured from real payloads in `evidence.test.mjs`'s coupling test. The mechanism chosen is a `run.header` with `reason: "observed"`, emitted the first time the writer sees a real mode and again if it changes. One extra event per run, no new vocabulary, and it never lands adjacent to another header, so it does not disturb the rule above. It makes `G-04`'s compensating record true for the first time.

**Two done clauses are superseded rather than met, and both by `TASK 52` rather than by this entry:**

- *"a delegated run stopped by its budget writes `run.footer` with `termination.state: FAILED`"* — **unwritable**, confirmed twice. `SubagentStop` carries no stop reason. What replaced it is better: the footer's **absence** is the signal, proven in red on 2026-08-27 and now carried by `G-06`.
- *"no trace file exists whose only event is a footer"* — **not adopted.** A footer-only file records a subagent that stopped without its start ever being seen, and refusing to write it would delete a signal to make a criterion true. What is fixed is the **name**: those files are called `-<id>.jsonl` because `runIdFor` lets an empty `agent_type` through `??`, and that is a local bug with a local fix.

**The remaining work is code, and it is being taken with `TASK 18` as one `bugfix` item in three sequential slices** — the writer's honesty (`runIdFor`, `bytes`), the validator (redaction projection, `tool_use_id` reuse, orphan classification), and the posture header plus a measured floor for the hook-delivery loss rate. Sequential because all three touch `scripts/guards/lib/evidence.mjs` and `G-12` forbids two roles owning one object. The measurements above are handed to each brief as numbers; **no brief is pointed at `evidence/` to go and find them** (`P-09`, as amended by `TASK 55` the same day).

---

**Closed 2026-08-27. Five slices, not three — re-cut twice under `P-09` rather than hoped through.** Four of the five were cut at their 30-turn cap, every one of them *after* its code had landed and on the account of it, which is the shape `TASK 55` closed the same day. All five kept their logs, because all five wrote the skeleton first.

| slice | behaviors | outcome |
|---|---|---|
| 1 · writer honesty | `runIdFor` on a blank `agent_type`; `bytes` on a non-string | completed, 18 turns |
| 2 · redaction and correlation | `TASK 18`'s field-name exclusion; `tool_use_id` reuse | cut at 30; one defect found in verification |
| 3 · delivery loss | orphan classification; measured floor | cut at 30; work complete |
| 4 · header multiplicity | adjacency; `reason` vocabulary | completed, 23 turns |
| 5 · posture header | `posturePatch`; the writer uses it | cut at 30; work complete |

**Verified in this session's own live trace rather than in a fixture** (`P-11` — the report is a claim, the artifact is the evidence): a `run.header` at seq 267 reading `reason: observed, permission_mode: auto`, which is the **first real `permission_mode` in 118 headers** and the first time `G-04`'s compensating record has ever worked; 25 distinct `tool.result` byte counts where all 3,754 previously read 15; and no file named `-<id>.jsonl`.

**One defect slipped in, and verification caught it rather than the report.** Slice 2's reuse finding **quoted the offending `tool_use_id`** — inside the function whose own doc says findings never quote the value, for the exact field `INC-15` exists because banned terms land in. It now names the earlier event's `seq`, with a test asserting the id is absent from the message. That test was itself broken on first write: a `\b` mangled into byte `0x08` left a regex that read correctly and could never match, so the assertion was vacuously true. The **control-byte guard caught it** — that guard doing precisely the job its message describes.

**`check-trace` is green, and nothing was deleted to make it so.** The delivery-loss rate reads **1.49% against a 2.00% floor**. The two directories the human cleared were a synthetic fixture that never recorded a run and the file behind `TASK 59`; the 59 remaining orphans are measured and floored, not hidden. That distinction is the whole point of the floor.

**Two done clauses were superseded rather than met**, both by `TASK 52` and both recorded above: `termination.state: FAILED` is unwritable, replaced by the footer's absence; and *"no trace file exists whose only event is a footer"* was not adopted, because refusing to write an orphan footer would delete a signal in order to make a criterion true.

**Reconciled, and then checked** (`P-07`, whose characteristic failure is doing the obvious half): `docs/harness/evidence.md` gained the three things its event table cannot hold in a cell — why a `run.header` is written more than once, why the **missing** footer is the signal and the `termination` block is not, and what the delivery-loss rate does and does not cover, including that a denied call whose request was lost stays invisible either way. `docs/harness/contracts.md` §2 stopped promising a termination vocabulary nothing writes, and its duplicated copy of `P-09`'s deleted clause moved with the rule rather than being left to drift.

Detail: `progress/2026-08-27-01`, plus `-02` through `-06`, one log per slice.


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

**A live specimen, 2026-08-26, and it is the cleanest possible demonstration.** `TASK 26` ran nine delegated slices, each writing its own progress log. Three of those logs reached the gate in an unfinished state:

| log | what it carried | caught? |
|---|---|---|
| slice D | `tests: { status: in_progress }` | **yes** — named within seconds, status outside the vocabulary |
| slice H | `tests: { status: in_progress }` | **yes** — same rule |
| slice G | **no `done:` block at all** | **no.** Passed clean |

Slice G was not the sloppiest of the three — it delivered completely and reported well. It simply never wrote the block, and `check-procedures` validated 71 done blocks without noticing that a seventy-second was missing.

**That is this item's exact mechanism, observed rather than argued.** Two siblings were caught for saying something wrong; the third said nothing and passed. `P-03` calls it out in one line — silence reads as coverage — and the gap is that the check can hear a wrong answer and cannot hear no answer.

**One thing the specimen adds to the Constraint below.** The obvious fix, demanding a `done:` block in every log, would be wrong: a log written mid-session for work still in flight legitimately has none yet. What makes slice G's log detectable is not its age but its **claim** — it says the work is finished. The applicable set has to be derived from that, which is the same "derive it, do not demand a roster" shape the constraint already names.

**A second specimen, from `EVAL-001` (2026-08-27), and it is the harder half.** The one above is a log with **no** block; this one has a block that answers three questions and silently drops five. `progress/2026-08-26-02-task26-slice-b-about-article.md:43` declares `tests`, `scope` and `iterations`, and omits `docs`, `content`, `security`, `mutation` and `loose_ends`; slices c, e, f, g and h share the shape. The scorecard's other half of this finding is worth keeping beside it: **0 of 84 done blocks declare `passed` with empty evidence**, across 30 distinct dimension names. The mechanized half holds absolutely, and every miss is on the unmechanized half — which is `P-03`'s point restated as a measurement.

**Done:** a red test presents a done block missing an applicable dimension and `check-procedures` fails; a partially-declared block like slice B's fails the same check; the test fails when the new assertion is removed.

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

## TASK 41 — Playwright smoke tier · `harness` · `DONE` · **ran eleventh**

**Closed 2026-08-25.** The gate runs **19 steps** and passes 18; the one red is `evidence trace`, which `H-03` puts outside every agent's reach and which every item since the content layer has closed the same way. **54 smoke tests across chromium, firefox and webkit in ~51s**, every route derived from the content source, zero route strings in the spec file.

**The item's Done was not reachable as written, and that is this session's finding rather than a status update.** `listRoutes()` derives sixteen routes; two have page modules. Asserting 200 over all sixteen would have added a knowingly-red nineteenth step — the exact blindness `TASK 34` and `TASK 39` exist to remove. Resolved with a **self-staling `site.pendingRoutes` list**, seven slugs each carrying a reason: expected-200 is *derived minus pending*, **and every pending route must still 404**, so the day a page item routes one the suite fails and forces the entry out. A skip list would never have expired. Keyed by slug rather than route, so a locale added later costs no edit (`P-13`).

**Two red paths were run and the first one found that the suite as delivered proved nothing.** With `src/pages/index.astro` renamed out of the tree, the suite returned **18 passed** — Playwright's default `reuseExistingServer` had attached it to a preview server left running from an earlier run, serving a `dist/` twenty minutes old. That is `T-02` verbatim: a test that passes with the thing under test disabled. `P-14` earned its place again, on a suite whose only prior evidence was a green run.

**The cause underneath it is worth recording, because it is a property of the toolchain and not of this item.** This Astro version's `astro preview` is a **background daemon** — it reports `(background)` unasked and the parent returns once it has forked. Playwright's `webServer` manages a foreground process and reads that exit as a failure, so a run's fate depended on whether the URL answered before Playwright noticed the exit: **observed both ways within one session**, once passing 54/54 and four times dying with `exited early`. `T-06` says a flake is a finding. The lifecycle moved into `globalSetup`, which stops any daemon, builds, starts one, polls until it answers, and returns a teardown — deterministic, and it stops a run leaking a daemon into the next one. `30-testing.md`'s sub-gate row is corrected accordingly (`G-11`).

**A duplication arrived with the delivered code and was removed rather than rationalised.** `ROUTED_PAGE_SLUGS` and `INDEX_PAGE_SLUG` were declared in the gateway *and* again in the smoke spec, with a comment explaining why the copy was acceptable. Two declaration sites for one datum is criterion 4's exact prohibition, and the explanatory comment was the tell. Both now import them from `route-set.mjs`, beside the derivation that consumes them.

**The seventh cut-off specimen, and it is the informative one for `TASK 12`.** The single delegated slice was briefed with verification **excluded** — the mitigation that item's entry proposes — and it was cut anyway, at 38 tool calls, on the sentence that begins the proof. All three files had landed and were good. Moving proof out of the brief did not prevent the cut; it changed what was lost from *the work* to *nothing*, because the orchestrator was watching. `astro check` had never run and carried **five** type errors — the second consecutive item where a slice closed without it.

Detail: `progress/2026-08-25-08-task41-playwright-smoke-tier.md`.

**Superseded opening note follows, kept for the trail.**

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
## TASK 43 — Concurrent writes happened, and the deferred remedies name a different actor · `harness` · `DONE`

**Closed 2026-08-27, in the negative on both mechanisms.** Neither is built. `roleWriteScopes` for `implementer`/`test-engineer` **would not have caught this** — it is a per-role allowlist and the colliding writer was the orchestrator, which has no role file by design (`G-09`). Worktree isolation would have separated the writers, at a merge step per delegation, on one incident, with its other three triggers unfired (`P-17`).

**What moved instead.** The incident is transcribed as **`INC-16`** in `architecture.md` §C. Both deferred rows now name the real actor: the `[A21]` trigger reads **two write-capable roles** and says out loud that it would not have covered `INC-16`; the `[A9]` row records that its first trigger fired and isolation was priced and declined. Corrected in `architecture.md` §M **and** the mirror table in `40-agent-policy.md`, in the same change — two tables saying one thing cannot be allowed to drift.

**The cause was reading, not concurrency, and it becomes `P-18` at rung 3:** *a `completed` notification is not a report, and a fragment is resumed rather than taken over.* It points at machinery that did not exist when this item was opened — `TASK 52` proved that a run terminating normally writes its `run.footer` and a cut run writes none (`G-06`), so *did this run finish* is now readable from the trace instead of inferred. The rule names the artifact; `work-item` §4→§5 carries the step that forces it.

**`INC-16` gets an `evals.excluded` entry rather than a case**, with its reason: there is no guard to neuter, so nothing can be demonstrated failing, and a case passing because the orchestrator behaved well measures the model (`A16`). It returns the moment footer-absence has a reader — the gap `G-06` already carries at rung 4.

Detail: `progress/2026-08-27-08-task43-concurrent-writes-decision.md`.

**Superseded opening note follows, kept for the trail.**

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
| 11 | ~~`TASK 41`~~ — Playwright smoke tier | `harness` | no | **DONE 2026-08-25.** The half of the fidelity harness that verifies the site rather than building diffing infrastructure. Its Done was unreachable at this position — sixteen derived routes, two built — so it ships a self-staling pending-routes list that fails the day a page item routes one. Found, by running the red path, that the suite as delivered passed with the home page removed |
| 12 | ~~`TASK 24`~~ — home | `feature` | yes | **DONE 2026-08-26.** Both index routes render from content, 81 e2e across three engines, mutation 75.07. Its lesson is the one the register should carry forward: every automated check was green while five design defects shipped, and five of the fifteen tests this item scheduled had never been written |
| 13 | ~~`TASK 25`~~ — case study and platform templates | `feature` | yes | **DONE 2026-08-26.** Ten article routes through two type-keyed templates; the table of contents, the masthead rows, the diagram figures and the deep-dive grid are all derived from the entry's own frontmatter and body. Its finding is `TASK 54`: the e2e suite passed with both critical mechanisms deliberately broken, because the build was serving a cached render |
| 14 | `TASK 26` — About, Experience and 404 | `feature` | yes | |
| — | `TASK 27`, local + design legs — the fidelity diff the milestone requires | `harness` | no | **Split out 2026-08-27.** `TASKS.md`'s own milestone line requires every `TASK 27` fidelity diff to be green, which is unreachable while the whole item sits behind the milestone. Only the prod leg needs a deploy; local and design do not, so they move here and the prod leg stays behind `TASK 32` |
| — | **THE LOCALHOST MILESTONE** — the author judges the site; `harness-evaluator` scores the harness (`TASK 60`) | | | |
| 15 | `TASK 30` — publish the repository to GitHub | `maintenance` | no | Nothing else can be automated until the code has a remote |
| 16 | `TASK 32` — CI deploy pipeline, GitHub Actions → Cloudflare | `feature` | yes | Proves the whole path — push → build → live — and switches on `TASK 27`'s third comparison |
| 17 | `TASK 27`, prod leg — the third comparison | `harness` | no | **Moved behind the milestone 2026-08-24**, split from `TASK 41`; **narrowed to the prod leg only 2026-08-27**, when the local and design legs moved above the milestone to make it reachable. Needs a deploy to exist, which is the item directly above |
| 18 | `TASK 28` — custom domain | `feature` | yes | Blocked on the domain existing; deliberately off the critical path |
| 19 | `TASK 29` — contact form Worker | `feature` | yes | **Trigger fired 2026-09-02** — resumed, spec awaiting approval |

## The localhost milestone

The line the whole local sequence runs at. It has no deliverable of its own, so it has no id — but it is the entry condition for `TASK 30`, and a milestone that lives only in a conversation is a milestone nobody can check. Its harness-scoring half is delegated work, and delegated work needs an id to be governed by (`H-05`) — that id is `TASK 60`, opened 2026-08-27 for exactly this:

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

## TASK 30 — Publish the repository to GitHub · `maintenance` · `DONE`

`ADR-005` accepted a public GitHub remote for the whole repository on 2026-08-19, and verified the history clean before deciding — no `private/`, no `evidence/`, no unsanitized original ever committed. **The push itself was left as the author's action and has not happened.** Everything automatable downstream is blocked on it.

**Moved from position 1 to position 11 on 2026-08-23**, when the backlog was re-cut local-first. Nothing downstream of this item is needed to reach a presentable `localhost`, and the author judges the site before publishing it. The constraint below that mattered most gets *more* true as a result, not less: by the time this runs, the working tree additionally carries all of `site/`, so there is more to review in the first diff, not less.

**~~Blocked by `TASK 76` as of 2026-08-28.~~ Unblocked 2026-08-31.** The Spanish had been rewritten across three pages, and later across all five case studies, while the English was not. Publishing then would have made a bilingual portfolio that contradicts itself public, in the locale most of the target audience reads, which is not a thing to fix after the first push. `TASK 76` closed on 2026-08-31: both locales now say the same thing, verified file by file rather than asserted.

**The one thing flagged to weigh before pushing is resolved.** `TASK 104` held six content questions the rewrite left open, plus two minors and a seventh gap found along the way. All closed 2026-09-01, applied to `resources/**` and verified against the tree (`check-content`, `check-terms` both PASS) — see its own entry. No longer a consideration for this item.

**And one thing that is closer to a blocker than it looks: `TASK 69`.** This item's own §*What CI does* has `.github/workflows/ci.yml` — then named `harness.yml` — running the gate on push. As of 2026-08-31 the gate's `e2e smoke` step failed **2 of 2** runs on a clean tree while the same suite passed **2 of 2** standalone. Whatever the mechanism turns out to be, a repository whose first CI run goes red is a repository showing a red badge to the audience it was published for. Either `TASK 69` lands first, or the push happens with the workflow's trigger narrowed deliberately and that decision recorded here. **2026-08-31, later the same day: eight further controlled attempts (including the real, unmodified `node scripts/gate.mjs`) all passed cleanly, under heavier load than either real failure was measured under** — see `TASK 69`'s own entry. The mechanism is still unnamed, so `TASK 69` is not closed and this is not resolved to zero risk. But GitHub Actions runs on a dedicated runner with no concurrent human/editor activity, which is structurally closer to today's 8/8-clean isolated conditions than to the one session that produced both known failures — evidence toward lower CI risk than this note originally assumed, weighed here rather than acted on unilaterally. The choice of whether to land `TASK 69` first, narrow the workflow trigger, or accept the residual risk and push is still the author's call. **2026-09-01: decided.** The author accepted the residual risk and chose to proceed with `TASK 30` rather than hold it on `TASK 69`, on the strength of the evidence above. `TASK 69` stays open, deprioritized rather than closed — see its own entry — and is not being carried as a blocker on this item anymore.

**~~The remote already exists and the repository is public~~ — verified 2026-09-01: `origin` is `https://github.com/Jichimon/portfolio.git`, `gh repo view` reports `visibility: PUBLIC`, `main` tracks `origin/main`. What remains before this item's own `Done` is checkable is the CI risk it names below, and `README.md` rendering the exhibit `TASK 101` wrote rather than the stale content-conventions doc that shipped in the first push.**

**`TASK 106` closes the CI risk this entry carried.** `.github/workflows/ci.yml` — then named `harness.yml` — was live and had never been read as a real signal — `T-10`'s own warning. Read for the first time 2026-09-01: two of twenty gate steps failed, both root-caused rather than patched around (see `TASK 106`'s own entry). Not `TASK 69` — that flake never reproduced in the runs read. This item is not marked `DONE` here, because its own `Done` is about what the *remote* shows, and that is unverified until the next push carries `TASK 106`'s and `TASK 101`'s changes.

**CLOSED 2026-09-01. Every clause verified against the remote itself, not against the working tree (`T-10`).** `gh repo view` reports `visibility: PUBLIC` at <https://github.com/Jichimon/portfolio>; `main` tracks `origin/main`; the pushed tree at `main` contains **no `private/` and no `evidence/`**, confirmed by reading the remote's own git tree through the API rather than by trusting `.gitignore`; `README.md` is present and renders the exhibit `TASK 101` wrote. And the clause this item had been waiting on since it was opened — *`gh run view` on the push's own `harness` run reports success* — is run `33570798170`, **success in 2m30s**.

**What it took, and it was not this item's own work.** The blocker was never the push: it was that `harness.yml` could not go green. Three runs were cancelled at their timeout (`INC-18`, `TASK 110`), one failed on two guards that could never have passed on a runner (`TASK 112`). This item closes on the back of those two, which is why its own entry stayed `TODO` for a day after the repository was already public.

**The CI badge is now in `README.md`.** `TASK 101` deliberately left it out, on the grounds that adding it before a green run is asserting a result nobody has observed. That trigger has fired.

**Deliverable:** the repository public on GitHub, `main` tracking the remote, `.github/workflows/ci.yml` — then named `harness.yml` — green on that push.

**Done:** `git remote -v` shows the origin; the GitHub page renders `README.md`; `private/` and `evidence/` are absent from the remote, confirmed by browsing the pushed tree rather than by trusting `.gitignore`; `gh run view` on the push's own `harness` run reports success.

**Constraints**
- **The author performs every git write** (`H-01`). An agent may prepare files and read history; it does not create the remote, commit or push.
- Re-verify the history immediately before pushing, not once in August. `ADR-005`'s check was true when made; a push publishes whatever is there *now*.
- The uncommitted working tree is large — the whole design canvas, the harness and this backlog. Review the diff before the first commit, which is the entire point of leaving commits to the human.

---

## TASK 106 — CI runs the gate and goes green · `bugfix` · `TODO`

**Opened 2026-09-01**, the first time `.github/workflows/ci.yml` — then named `harness.yml` — was read as a real signal against the real remote rather than assumed inert (`T-10`). Two failures, both root-caused against the actual CI environment rather than patched to make a symptom go away (`P-04`):

1. **`site/` is its own package, not an npm workspace.** `npm ci` at the root never populates `site/node_modules`, so three gate steps (`type check`, `component tests`, `e2e smoke`) resolve a binary that was never installed — read as a plain FAIL, the exact failure mode `gate.mjs`'s own comments already name for a drifted path. Confirmed by handing `gate-steps.mjs`'s validator an `io.exists` that reports `site/node_modules` absent: it reproduces the two findings CI's log showed. Fixed by adding `npm ci` with `working-directory: site` to the workflow — not by touching `gate.mjs`'s `STEPS`, since the binaries genuinely will exist once installed.
2. **`private/banned-terms.txt` is gitignored by design (`H-04`)** and was never going to reach a runner. `check-terms.mjs` refuses to pass without it, which is correct — a confidentiality check that reports clean without reading its own term list is worse than no check. The gate's own `confidentiality` step now carries the same `skipIf`/`skipNote` pairing every other dependency-conditional step already has; `check-terms.test.mjs`'s own `LIVENESS` test gets the matching `node:test` skip, so both stay honest about *why* rather than failing where nothing could have passed.

**The concern raised and overruled, stated once (`P-17`):** shipping the term list to CI would close this more completely, but `H-04` puts the mapping outside every agent's reach and the author declined to widen that for a green badge. The chosen fix makes the gap loud instead of hidden — the workflow's gate step accepts an `INCOMPLETE` (exit 2) run **only** when `confidentiality` is the single skipped step; any other skip, or a skip alongside a real failure, still fails the job.

**Two more fixes landed alongside, both required for the gate to mean what it claims in CI:**
- `actions/checkout@v4` gains `fetch-depth: 0` — `check-status-history` derives `K2` from `git log -- TASKS.md`, and the default depth-1 clone hands it one commit with no history to diff, which would report a false clean zero rather than a real measurement.
- `npx playwright install --with-deps` added for the `site/` install — `npm ci` installs the `@playwright/test` package, never the three browser engines `e2e smoke` drives.

**The verdict script's own first draft was wrong, and proven so before it shipped rather than after (`P-14`).** `grep -c '^  SKIP  '` was meant to count skipped steps, but `gate.mjs` prints every skip **twice** — once in the padded summary table, once in the unpadded incomplete-detail block — and a plain prefix match counts both, silently doubling every real count. A synthetic single-skip log scored `skips=2` against it, which would have rejected the exact case this step exists to accept. Caught by building three synthetic `gate.log` fixtures (a clean confidentiality-only skip, confidentiality plus an unrelated second skip, and confidentiality beside a real `FAIL`) and running the actual extracted script against each before trusting it. Fixed by reading the count from the `GATE INCOMPLETE — N of 20…` header line instead of counting `SKIP` lines at all.

**Deliverable:** `.github/workflows/ci.yml` — then named `harness.yml`; `scripts/gate.mjs`'s `confidentiality` step; `scripts/guards/gate/check-terms.test.mjs`'s `LIVENESS` test; `scripts/guards/gate/check-docs.mjs`'s now-stale "inert until a remote exists" print line, corrected in the same change (`P-07`).

**Done:** a push carrying this change shows `harness.yml` green on GitHub, with the `::warning::` line naming `confidentiality` as the only skip — read from the provider, not from a local run (`T-10`). Not yet observed as of this writing; the local gate passes with `confidentiality` running normally (this machine holds `private/`).

**Constraints**
- **No confidentiality mapping enters CI, under any framing** — the fix accepts the gap rather than working around `H-04`.
- **Root-caused, not step-patched.** The `type check` / `component tests` / `e2e smoke` fix is installing what CI was missing, not editing `gate.mjs`'s `STEPS` to tolerate absent binaries.

---

## TASK 107 — Gate speed: CI caching and a Stryker incremental spike · `harness` · `IN PROGRESS`

**Opened 2026-09-01**, from a direct question about why `node scripts/gate.mjs` is slow. `runGate` (`scripts/guards/lib/gate.mjs`) runs its ~20 steps through a plain sequential loop; `mutation` (Stryker) dominates the cost by a wide margin (measured 74s–11min depending on scope). Three levers were identified — a parallel DAG scheduler for `runGate`, CI-only dependency caching, and Stryker's `incremental: true` — and the author scoped this item to the latter two, declining the scheduler explicitly: it touches the mutation-covered surface and would need spec-first (`P-02`, `T-01`), against two changes that touch only `.github/workflows/ci.yml` — then named `harness.yml` — and `stryker.config.mjs`, neither in Stryker's own `mutate` glob.

**Serves goal 2** — this is exactly the kind of harness-efficiency fact `TASK 9`'s eventual export needs to carry, and it reduces the wall-clock/cost every future item pays under either goal, adjacent to the cost-accounting thread `TASK 70`/`77`/`78` opened.

**Deliverable:** `cache: 'npm'` (both lockfiles) and a keyed Playwright browser cache in `ci.yml` (then `harness.yml`); `incremental: true` plus an explicit `incrementalFile` in `stryker.config.mjs`; `actions/cache/restore` + `actions/cache/save` wired around the gate step so the incremental cache survives CI's otherwise-ephemeral runs.

**Measured, not assumed:** a cold Stryker run scored 78.58% in 10m31s; an immediate unchanged rerun scored 78.58% in 21s — same aggregate score, ~30x faster, confirming incremental mode reconstructs the full score from cache rather than only scoring the delta.

**The "depends on `TASK 106`" constraint fired exactly as written, and badly.** `TASK 106`'s own push (`059a7e5`, before this item's caching/incremental changes existed) ran the workflow for the **full 6-hour GitHub Actions default and was cancelled — with an empty log.** `node scripts/gate.mjs > gate.log 2>&1` buffers everything until the process exits, so a run that never exits inside the timeout leaves nothing to read, live or after the fact — a real gap, found the expensive way rather than reviewed for it beforehand.

**CORRECTED 2026-09-01 by `TASK 110`, and the correction is the point (`P-04`).** The paragraph below root-causes the six-hour run as a *compute-bound cost, not a hang*. It was a hang: `astro preview` blocks in the foreground on a runner, because it daemonizes only when it detects an AI coding agent in the environment, and `e2e smoke` therefore ran zero tests in all three cancelled runs while `mutation` never started. The concurrency arithmetic below is accurate and remains the reason mutation cannot sit on the per-push path (`TASK 111`); what it was not is the cause of the cancelled runs. **The caching work this item shipped stands and is unaffected.** Recorded here rather than rewritten away, because a wrong cause deleted is a wrong cause the next session re-derives.

**Root-caused, not guessed, before spending a second 6-hour run to find out.** Stryker's own source (`concurrency-token-provider.js`) defaults concurrency to `os.availableParallelism() - 1`. The author's machine: 12 cores → concurrency 11. GitHub's standard `ubuntu-latest` runner: 2 cores → concurrency 2 — a >5x drop in parallel test-runner processes, compounding with generally slower shared cloud cores. That gap alone plausibly turns a ~10–11min local cold mutation run into multiple hours, which is a **compute-bound cost**, not a hang. Two fixes landed on top of the caching work above, both required before another real CI run is worth spending:
- **`run the gate` streams through `tee` instead of redirecting and `cat`-ing at the end.** `${PIPESTATUS[0]}` reads node's own exit code rather than `tee`'s (which always succeeds) — a plain `$?` after a pipe would read the wrong process. Verified: `bash -c '(exit 7) | tee /dev/null; echo ${PIPESTATUS[0]}'` reads `7`.
- **The job gains `timeout-minutes: 90`**, stated in the workflow as provisional rather than measured — GitHub Actions has no default escape short of its own 6-hour ceiling, and hitting that ceiling blind is itself uninformative. 90 minutes is a bound to fail loud and fast on; the next real run's live-streamed timing is what should set this number honestly, not a second guess.

**Done:** the CI caching and incremental config are in place and locally verified (see above); the workflow still carries no `paths:`/`paths-ignore:` filter and still runs `node scripts/gate.mjs` as its one command (`check-docs`, `T-09`); a real regression, in a file that changed since the last cache entry, still fails the mutation step — attempted this session, not completed (see Constraints); a real CI run (`T-10`) confirms the cache steps behave as designed, in particular that `if: always()` persists progress from a red run.

**Constraints**
- **Not yet trusted for the `break: 77.0` ratchet (`T-03`).** This repository has hit two cache-correctness bugs before (`TASK 89`, `TASK 103`), so incremental mode does not get to silently become the basis for the mutation gate — the regression-still-caught proof is required first, recorded as a residual in `stryker.config.mjs` itself and in `progress/2026-09-01-03-task107-gate-speed-ci-caching.md`, not assumed from the reconstruction result alone.
- **The regression spike was attempted and blocked, not skipped.** A deliberately weakened assertion in `scripts/guards/lib/ci.test.mjs` was reverted immediately after a third Stryker run was denied by Claude Code's own auto-mode permission classifier (a session-level control, not one of this repository's own guards) — confirmed reverted via `node --test scripts/guards/lib/ci.test.mjs`, 11/11 passing against the real file.
- **Depends on `TASK 106` landing first.** Both items edit the same workflow; this one's CI half cannot be observed as working until `TASK 106`'s own push confirms the workflow runs green at all.
- **The parallel-scheduler option stays a known, unbuilt alternative** — recorded here so it is not re-derived, not opened as a second item without a reason beyond "it would also help."

---

## TASK 108 — E2E narrowed to Chromium for CI · `harness` · `DONE`

**Opened 2026-09-01, by `TASK 107`'s own monitored diagnostic run** — not a hypothesis. The 90-minute job timeout fired at 1h30m32s (the escape hatch worked); the live-streamed log showed `guard tests` finishing in ~2 seconds, then **89 minutes of silence** across `site core tests`, `component tests`, `type check` and `e2e smoke`, ending in cancellation. At cleanup GitHub listed an orphan process it had to kill: `npm exec astro preview`, spawned only by `e2e smoke`'s `globalSetup` — meaning the build had finished and Playwright was mid-run across three browser engines when the timeout hit. `mutation`'s own incremental-cache save step found nothing to save, confirming Stryker never started. **Every prior estimate in this repository, including `ADR-006`'s own, had assumed `mutation` would dominate CI cost** — true locally (Stryker gets concurrency 11 on this machine's 12 cores), not demonstrated on GitHub's 2-core standard runner, where `e2e smoke`'s three-engine matrix turned out to be the thing actually running when the clock ran out.

**Serves the author's direct concern, raised the same session:** the gate's total size (1050+ guard tests, three e2e browser engines, a 7,000+-mutant Stryker run) read as disproportionate for "a harness and an almost-static site," and the author asked for real cuts rather than a defense of the status quo. This item is the first one backed by hard evidence rather than the request alone.

**Deliverable:** `site/playwright.config.ts`'s `projects` array narrowed to Chromium; `docs/adr/ADR-006-testing-toolchain.md` amended (inline marker at the E2E decision paragraph, plus a full `## Amendment · 2026-09-01` section); `docs/adr/README.md`'s level-1 date and level-2 table updated; `.claude/rules/30-testing.md`'s E2E stack-table row updated to match; `.github/workflows/ci.yml`'s — then named `harness.yml` — now-stale "three real browser engines" comment corrected.

**Done:** `node node_modules/@playwright/test/cli.js test` from `site/` passes with Chromium alone — verified locally, **171 passed in 2.2 minutes**, down from a three-engine run that was still in flight past 89 minutes on CI. `check-rules-registry` and `check-docs` both PASS against the amended ADR/rules/README. `screenshots.smoke.spec.ts`'s own `browserName !== 'chromium'` skip guard (already present, unrelated to this item) now never fires, confirmed rather than assumed to be harmless.

**What is accepted, not hidden (`C-11`):** Firefox and WebKit-specific rendering defects are no longer caught by the blocking gate. `playwright.config.ts`'s `projects` array is exactly where to restore either the day a real cross-engine defect motivates it — that is the trigger, not a calendar date.

**What this does not resolve, stated rather than assumed:** whether Chromium alone is now enough to bring the whole gate under a sane CI bound, or whether `mutation` — never yet reached in a real CI run — is a second, independent cost once `e2e smoke` stops absorbing the 90-minute budget. The next real push is what answers that, not this item.

**Constraints**
- **Evidence-driven, not a percentage target.** This item cuts the one step a real, monitored CI run showed was actually the bottleneck. It does not cut mutation coverage, which is the harness's own enforcement mechanism and the subject the public `README.md` (`TASK 101`) uses as its credibility claim — that surface gets its own deliberate audit, not a reflexive haircut (see the author's own request, addressed separately).
- **Local proof required before claiming done**, not just a config edit — `T-02`'s standard applies to changing the e2e tier's shape as much as to building it: a test that would pass without the change proving anything is not evidence.

---

## TASK 109 — The coverage audit's two candidates, implemented · `harness` · `DONE`

**Opened 2026-09-01, the audit `TASK 108`'s own entry deferred.** That item cut e2e to the one
step a real CI run showed was the bottleneck; the author's broader concern — that ~1050 guard
tests and a 7,951-mutant Stryker run read as disproportionate for "a harness and an
almost-static site" — was answered separately by an audit of `scripts/guards/lib/**` and
`site/lib/**`. The audit pushed back (`P-17`) on cutting most of that surface: `evidence.mjs`,
`shell.mjs`, `path-boundary.mjs`, `delegation-gate.mjs`, `procedures.mjs` and `evals.mjs` are
each tied directly to a hard rule (`H-01`–`H-05`) or a documented incident (`INC-05`, `INC-07`,
`INC-08`) in their own header — and it is the exact mechanism the public `README.md`
(`TASK 101`) cites as the portfolio's credibility claim. It found two narrower, real
candidates, approved by the author, and this item is both of them implemented and verified.

**Candidate 1 — `scripts/guards/lib/site-structure.mjs` split.** 877 lines, a header claiming
"three things" while implementing eight unrelated `S-*` checkers, and the single largest
(1,126 mutants, 16.2% of the guards surface) and worst-covered (61.2%) large file in the
mutation report. Split into `scripts/guards/lib/site-structure/`: one module per rule
(`file-cap`, `gateway-boundary`, `framework-free`, `route-literals`, `design-tokens`,
`visible-strings`, `config-declarative`, `comment-references`), a `shared.mjs` for the four
genuinely cross-cutting primitives, and an `index.mjs` composing `checkSite`. The original path
is now a one-line barrel, so every external citation (`check-site.mjs`, `gate.mjs`'s
`redProof`, `ADR-008`, the rules registry) needed no edit. Verified behavior-preserving before
anything else moved: all 107 pre-existing tests passed against the split implementation before
the test file itself was split 1:1 alongside it (+2 new regression tests, 109 total).

**A real bug found while splitting, not invented to justify the item.** Diffing the three
near-identical hand-rolled comment/quote state machines against each other —
`codeStringLiteralsByLine`, `withCommentsBlanked`, `commentsByLine` — found that two of the
three closed a backtick-quoted template literal at its first internal newline, which only
single/double-quoted strings can legally do. A multi-line template literal containing a
`//`-shaped run of characters then desynced the state machine badly enough that a real,
subsequent comment could be misread — a false `S-05`/`S-08` finding or a missed one, depending
on what followed. Fixed with a one-line exception in each, proven in red: reverted, both new
regression tests fail with the predicted failure mode; restored, both pass.

**Candidate 2 — `cost.mjs`'s kill rate (51.7%, the worst in the whole 7,951-mutant surface),
fixed rather than excluded.** The audit's own proposal to the author — get it "out from under
the blocking floor" — assumed a Stryker lever that does not exist: there is no per-file
"measure but do not block" setting, only mutate-glob inclusion or exclusion, all or nothing.
Excluding the file would have reversed its own header's stated intent and hidden real gaps
rather than genuine noise — checked by reading all 139 survivors individually, not assumed
from the score. They were not concentrated in prose the way `renderLedger` was (`TASK 88`); the
largest cluster was real aggregation arithmetic (`byRole`/`bySession`'s `+=` totals, the
`results` counter, `mb()`/`min()`'s formatting, `measuredModel`'s tie-break) proven only by a
section header's presence, never a summed value. Closed with 7 new tests (one proven
load-bearing in red: a planted `+=`→`-=` flip failed it before the fix), 13 `Stryker disable
next-line StringLiteral` suppressions on inert prose only — never a table header or a `|---|`
row, which stay live — and one dead-code deletion (`bySession`'s `last` timestamp, computed and
read by nothing).

**Found and fixed along the way:** this item's own `check-site.mjs` verification (not assumed
clean) surfaced 3 pre-existing `S-08` findings in `site/playwright.config.ts` — a comment from
`TASK 108`'s own uncommitted session cited `TASK 108`, `T-05` and `C-11` by id from inside
`site/**`. Confirmed unrelated to this item's own changes (the file's only template literal is
single-line) and fixed: the reasoning kept, the citations removed to where `ADR-006`'s
amendment already carries them.

**Deliverable:** `scripts/guards/lib/site-structure/` (9 modules + 9 colocated test files +
barrel); `scripts/guards/lib/cost.mjs` and `cost.test.mjs`; `scripts/gate.mjs`'s `redProof`
repointed; `site/playwright.config.ts`'s comment fix.

**Done:** `node --test "scripts/guards/**/*.test.mjs"` — 1,059 passed, 0 failed (was 1,050).
`check-site.mjs` — PASS, 0 findings (was 3). A full mutation run:
**aggregate 79.21%** (break threshold 77.0, comfortably passed — floor left untouched, raising
the ratchet is `TASK 38`'s own item); `cost.mjs` **66.67%** (was 51.7%); the `site-structure/`
directory **61.80%** in aggregate (was 61.2% as one file — **the split itself does not move
this number**, stated rather than implied otherwise, since the same code produces the same
mutants regardless of which file holds it; the file most improved by the actual bugfix,
`comment-references.mjs`, reads 87.65%).

**What this does not claim (`C-01`):** that the gate's total size is now "right" in some
absolute sense — no number in this audit could produce that. It claims two specific,
evidence-backed items closed the way the audit found them, and states plainly where the
audit's own earlier framing (site-structure's mutant count as a splitting target, `cost.mjs`'s
exclusion) did not survive contact with the real mechanism (`P-04`, `P-11`).

**Residual, not silently dropped (`P-19`):** unifying the three comment/quote state machines
into one shared walker — their trigger conditions are identical, verified by diffing them
character by character — was considered and declined this session on a risk basis, not a value
basis. A shared primitive done wrong would silently weaken three guards (`S-01`, `S-05`,
`S-08`) at once, and verifying a rewrite that thoroughly was not realistic in the time
available; the narrower one-line fix applied to each of the two buggy copies closes the actual
defect without that risk. Revisit if a fourth near-identical parser appears, or one of the
three needs a fix the others don't get.

**Constraints**
- **Exactly the two candidates the audit named and the author approved** — not a broader pass
  over the surface the audit already defended (`H-01`–`H-05`'s enforcement mechanism), and not
  a reflexive haircut.
- **No number claimed without a real run behind it (`C-01`).** The mutation figures above are
  from an incremental run; `stryker.config.mjs`'s own comment states incremental mode is not
  yet validated as the basis for moving the ratchet — irrelevant here, since the floor was not
  touched, but stated so the number is not read as more certain than it is.

Full account: `progress/2026-09-01-05-task109-coverage-audit-closed.md`.

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

## TASK 32 — CI deploy pipeline: GitHub Actions → Cloudflare Workers · `feature` · `IN PROGRESS`

**Built 2026-09-01, unpushed.** `SPEC-TASK-32` approved at `1.0` and implemented in four slices. **`node scripts/gate.mjs --profile full` — `GATE PASSED (profile: full)`, 22 of 22, mutation 79.77 against the 77.0 floor.** **Every local dimension is met and the item is deliberately NOT closed**, because its own `Done` is about what the *provider* shows and no `ci.yml` run exists yet (`T-10`): a green local gate is not evidence that CI fired, and this item's first clause — *a commit pushed to `main` appears at the live URL with no local command run* — is verified by doing it, never by reasoning that it would work.

**What shipped.** `harness.yml` → `ci.yml`, with the deploy as a **`job`** in it: `needs: gate`, restricted to a push on `main`, ordered concurrency, an explicit build, `cloudflare/wrangler-action@v4`, then a route verifier. `site/wrangler.jsonc` declares an assets-only Worker — no `main`, `not_found_handling: "404-page"`. `wrangler@4.128.0` installed in `site/`, with `check-terms` run immediately after rather than at the end, because `TASK 45`'s collision lived in exactly that lockfile.

**The half that is not the deploy, and is the reason this item is worth more than a workflow file.** A deploy step's exit code says a command succeeded; it does not say the site is there. So the deploy publishes its own URL from the action's `deployment-url` output, and `scripts/verify-deploy.mjs` walks **every route the collection derives** against it — 16 routes — failing the run naming anything that is not a served HTML page. `scripts/guards/lib/deploy-verify.mjs` holds the deciding half with 18 tests, and the red paths were run against a **real `wrangler dev` serving the real `dist/`**, not a stub: a missing route is named with its 404, an unset `PROD_BASE_URL` fails closed, an unreachable host is bounded at 10 attempts rather than hanging, and `/nope` and `/es/nope` both answer 404 with `text/html`.

**One derivation, two consumers.** `routes.smoke.spec.ts` kept its frontmatter readers local to itself; they moved to `site/lib/content/routes/route-source.mjs` so the verifier and the e2e suite enumerate routes through the same code. A verifier that derived routes differently from the suite would be verifying something else (criterion 4). **69 e2e passed before and 69 after**, which is what makes it a refactor.

**Two guards caught what this session would otherwise have shipped, and both were the self-staling mechanisms doing their job.** `check-docs` reported its own forward-looking exemptions as stale the moment their targets appeared — twice, once per slice. And `check-site` found **`S-08` violations in two comments this session wrote**: work-item ids inside `site/**`, the exact citation direction that rule inverts. A third lived in `site/wrangler.jsonc` and was **not** flagged, because `.jsonc` is outside `check-site`'s scanned extensions — fixed anyway, since a guard gap is not permission.

**That gap is a stated residual, not an item** (`P-19`). Widening the extension list would close it, and closing it advances neither goal: `site/` holds exactly one `.jsonc` file, the violation was found and fixed by reading, and nobody is adversarially writing work-item ids into a Worker config. Opening an item here is `INC-17`'s shape — a finding is evidence that something is true, never evidence that fixing it serves the goal. **The trigger for revisiting it:** a second commented config format arriving under `site/`, or an `S-08` violation reaching a commit.

**The mutation read is what this item would otherwise have shipped without.** The full gate passed at **79.54** against a floor of 77.0 — while `deploy-verify.mjs`, this item's own new module, sat at **77.92 with 15 survivors and 2 mutants no test reached at all**. The aggregate rose because two new modules entered the denominator, which is precisely how a weak battery hides inside a healthy number, and `T-03` exists for that case: a surviving mutant is a finding, not a statistic.

**Three of the survivors were vacuous assertions in tests written the same day**, which is the more useful half. The unset-`PROD_BASE_URL` test matched `/base URL/i` — and **both** the unset branch and the not-a-URL branch say "base URL", so a whitespace-only value fell through to the second and the assertion could not tell them apart. Removing `.trim()` survived. Removing the `typeof` check survived. And `!Array.isArray(routes)` survived because only the empty-array half was ever exercised, though a derivation returning `undefined` is the likelier real failure. The rest were genuine gaps: the readiness loop's `<=` bound, the guard that stops it sleeping after the last attempt, the **default `sleep` parameter, which had no coverage at all** because every test injected one, and three regex anchors — unanchored, `about.en.md.bak` becomes a route the site does not serve. **Eight tests added, no threshold moved, re-measured cold rather than inferred: `deploy-verify.mjs` 77.92 → 96.10 with zero uncovered, `route-source.mjs` 90.32 → 96.77.** Three of the four remaining survivors are suppressed at the mutant with a written reason — two genuinely equivalent, one whose behaviour is only observable through a timing assertion that would be a flake.

**Deviation from this item's own plan, recorded rather than glossed:** all four slices were run by the orchestrator directly, with **nothing delegated**, on the author's instruction. The cost is that `P-11`'s report-versus-artifact separation does not apply — there was no report, only artifacts, each verified against a real run.

Detail: `progress/2026-09-01-08-task32-ci-deploy.md`.

**What remains, and it is one action:** the author pushes. Then `gh run view` on that run, the live URL over HTTPS, and the observation that a PR run and a nightly run both show `deploy` skipped.


**Unblocked 2026-09-01.** Its `needs TASK 30` marker is gone: the repository is public, `main` tracks the remote, and `harness.yml` is green there (run `33570798170`). This is now the last item standing between goal 1 and a reader who can see the site rather than the repository.

**One thing this item inherits, worth knowing before it starts.** `check-docs` validates the CI workflow **by name**, so a second `.yml` would land with no path-filter check, no gate-parity check and no Node floor — `INC-08`'s shape arriving through a filename. `TASK 111` kept the deep tier inside the one guarded workflow for exactly that reason; a deploy workflow cannot do the same, so this item owes either a widened guard or a stated, reasoned exemption.

**The exemption is not taken, and neither is the widened guard: the second file is.** Decided with the author 2026-09-01, before the spec. The deploy is a **`job`**, not a workflow — `needs: gate`, gated on a push to `main`, inside the one file every guard already reads. That carries no guard gap at all, and it runs the gate **once** per push rather than twice, which the two-file shape could not avoid while also honouring the `npm test`-before-deploy constraint below. The cost is that this item's own Deliverable line was wrong and is corrected rather than reinterpreted (`P-07`).

**And the one file is renamed `harness.yml` → `ci.yml`**, same session, same decision. After this item the file gates on **every** trigger and deploys on **one**: a PR run, a nightly `full` run and a push to any other branch all verify and ship nothing. `ci` describes that; `harness` describes what the file was before the deploy job, and `deploy` would misdescribe the majority of its runs. Two costs, stated rather than discovered: GitHub opens a **new** entry in the Actions tab, so runs `33570798170` and `33571567866` — the evidence `TASK 30` and `TASK 111` closed on — stay reachable under the old workflow name and not under this one; and the README badge is dead until `ci.yml`'s first run.

The deploy half split out of `TASK 21` on 2026-08-23. A workflow that ships the site to Cloudflare **on every push to `main`** — and nothing else that ships it at all.

**Deliverable:** the `deploy` job in `.github/workflows/ci.yml`, `site/wrangler.jsonc`, and the live-route verifier (`scripts/verify-deploy.mjs` over `scripts/guards/lib/deploy-verify.mjs`).

**Done:** **a commit pushed to `main` appears at the live URL with no local command run**; the URL returns HTTP 200 over HTTPS; and **every route the collection derives returns 200 at the deployed URL, asserted by CI rather than by a look**. Recorded here and in `docs/adr/ADR-004`.

**The third clause used to read *"`TASK 27`'s prod comparison is switched on and passing"*, and that was unreachable.** `TASK 27` is `TODO` in full: `site/tests/e2e/` holds five smoke specs and no fidelity-diff suite, so there is no prod target to switch on and no amount of work in *this* item creates one. The clause is moved back to `TASK 27`'s prod leg, which already says it stays behind this item — **this item unblocks that comparison; it does not contain it** (`P-01`: a done you can check, and one item's done cannot be another item's deliverable). What replaces it is narrower, mechanized, and answers the question the deploy actually raises: *did it land, whole?*

**Constraints**
- **CI is the only deploy path, from the first deploy.** A manual `wrangler deploy` first and CI later means shipping one mechanism and then replacing it — and the manual one keeps working, so nobody notices when the automated one breaks. The workflow builds and deploys; nothing else does.
- The workflow runs `npm test` **before** deploying. A gate that only runs locally is a gate that runs when someone remembers — and a green local gate is not evidence that CI fired (`T-10`).
- **The author creates `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub repository secrets.** No Cloudflare credential enters the session environment (`G-08`); an agent writes the workflow, the author supplies the secrets. The token is scoped to Workers deploy on one account, never a global key.
- Astro, static output, no adapter (`ADR-001`, `ADR-004`) — `wrangler deploy` serves `dist/` as static assets.
- **This item unblocks `TASK 27`'s deferred third comparison; it does not perform it.** What this item owes that comparison is the one thing it was waiting on: a deployed base URL, published under a name both items read. That name is **`PROD_BASE_URL`**, declared once in the deploy job from the deploy step's own `deployment-url` output and never typed into a file — so the account subdomain stays out of the repository (`C-06`).
- **The live-route verifier derives its routes from the content collection, never from a list.** `site/tests/e2e/routes.smoke.spec.ts` already derives the full route set through `deriveRouteSetFromEntries` in `site/lib/content/routes/route-set.mjs`; the verifier imports the same function rather than deriving a second one. Two derivations that could disagree is criterion 4's exact defect, and a verifier that enumerates routes differently from the suite is verifying something else.
- **The verifier is not a gate step.** `gate.mjs` is untouched by this item: a gate that requires a network and a live deployment is a gate that fails on an aeroplane, and `T-09`'s one-command parity says CI runs what a human runs.

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

## TASK 47 — `site/` is at the file cap, and the next config file forces a split · `maintenance` · `DONE`

**Closed 2026-08-27. `S-03` gains a second calibration rather than a bigger number.** Ordinary directories keep **6**. A **package root** — derived from disk as a directory holding `package.json`, never a named path — gets **10**. Both live in `guards.config.json` with their reasons, and `check-site` now reports both.

**The scope was the defect, not the number.** `S-03` governs how somebody organises code and its remedy is a split by context; a package root is not a directory anyone organises, so that remedy is unavailable to it. Checked against each tool rather than assumed: npm fixes `package.json` and the lockfile, `astro`/`astro check`/the editor read `astro.config.mjs` and `tsconfig.json` from the project root, and `vitest`/`playwright` accept `--config` but Playwright resolves `testDir` relative to its config file — so a `site/testing/` split buys a flag on every invocation and displaces paths for no structural gain. **At eleven the answer is still not a higher number**, and that is written at the number.

**Test-first, and proven in red against the real tree as well as in the battery.** 7 new cases, 5 failing before the implementation, 98 pass after. Against the tree: a seventh file at `site/` root passes, a seventh in `site/src/behaviour` fails naming the directory, and the leak is closed in both directions.

**Two loose ends found while validating, both closed here.** `site/test-results` was excluded from the term scanner and **not** from `check-site`'s walk — an asymmetry that would first have fired on a **red** test run, a gate failure landing on top of a real one. Proven by planting eight files and removing the exclusion, then restoring it. And two residue directories under site/ were removed — an empty locale folder and a doubled site/site/ holding one throwaway Playwright measuring script: both were **a write with a relative path resolved from the wrong working directory**, and **`git status` showed neither** — one an empty directory git does not version, the other under `.gitignore`'s `node_modules/`. `H-01` exists so the human sees every agent write in one diff; these two were in no diff. Recorded as a note, not a rule — nothing can mechanize it against git's index (`G-10`).

Detail: `progress/2026-08-27-09-task47-package-root-file-cap.md`.

**Superseded opening note follows, kept for the trail.**

Opened 2026-08-25 by the smoke-tier item. `site/` holds **six** files at its root — `astro.config.mjs`, `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts` — and `maxFilesPerDir` is **6**. It passes today with zero headroom, so the next root-level config file fails `check-site` (`S-03`).

That is the rule working, not a defect. It is tracked because the failure will arrive attached to some unrelated item, whose author will then be choosing a directory layout under time pressure — which is how a folder that exists only to absorb overflow gets created, and `S-03` calls that a finding rather than compliance.

**The smoke-tier item's own entry said `site/` "already holds four" when it held five.** A count in prose expires; this entry deliberately states the cap and the condition rather than the current number.

**Done:** a decision, recorded, on where a seventh root-level config file goes — a named context subfolder, or a raised cap with its reason written at the number — taken before the item that needs it rather than inside it.

**Constraints**

- Not every tool tolerates its config being moved. Whatever is decided has to be checked against the tool's own documentation before it is written down (`C-01`, `S-07`).
- Do not raise the cap merely to make this go away. It is the author's convention with a stated rationale, and a threshold that moves whenever it binds is not a threshold.

---

## TASK 48 — A delegated slice closes without `astro check` having run · `bugfix` · `DONE`

**Closed 2026-08-27. `astro check` is the gate's `type check` step**, placed before the e2e tier. The gate now runs **20 steps**.

**The bug was reproduced before it was fixed, and the reproduction is the finding.** A full gate run with a type error sitting on disk reported **GATE PASSED, 19 of 19** — not a red step somebody ignored, a gate with no opinion at all. That is how two consecutive items closed carrying 19 and 5 type errors.

**The step does not double the build, and that was the item's first constraint.** Checked rather than assumed: with the same planted error `astro build` **exited 0** and built all 17 pages, while `astro check` **exited 1** naming `ts(2322)`.

**Proven in red and in skip** (`P-14`, `T-04`): with the error planted, **GATE FAILED — 1 of 20**, `type check` the only failure. With `@astrojs/check` removed, **GATE INCOMPLETE**, exit 2, the step declaring its gap out loud rather than passing on nothing. Clean: **GATE PASSED, 20 of 20**.

**Hints do not fail it and needed no setting** — the tree reports **20 hints, 0 errors, exit 0**, which is the tool's own default severity. The entry above said 19; a count in prose expires, in the same session that closed `TASK 47` for saying so. **No `dependsOn`**, deliberately: a type error does not break the build, so marking the e2e tier BLOCKED on it would assert a causality that does not exist.

**Measured in passing:** mutation **77.10%** over **5,710** mutants against a floor of 74.5, up from the last recorded 74.74% over 4,773. Turning the ratchet belongs to `TASK 38`, not here.

Detail: `progress/2026-08-27-11-task48-astro-check-gate-step.md`.

**Superseded opening note follows, kept for the trail.**

Opened 2026-08-25 by the smoke-tier item, on its **second consecutive** occurrence. The layout-shell item closed its behaviour modules on Vitest and mutants without running `astro check`, which had accumulated **19** type errors. The smoke-tier slice landed three files and was cut off immediately before running it; it carried **five**.

**Both were caught by the orchestrator, and that is the problem.** `astro check` is not a gate step — it is a command someone has to remember, and the evidence now says the person who remembers is never the one who wrote the code. `T-09` says the gate is one command and is CI parity; a type check that only runs when an orchestrator thinks of it is neither.

**Done:** `astro check` runs as a gate step over `site/`, with a red path proving a planted type error fails it — or a recorded decision that it should not, naming what covers the same ground instead (`G-11`, `P-03`).

**Constraints**

- **Check whether the build already covers this before adding a step.** `astro build` may or may not type-check; `astro check` exists as a separate command, which suggests it does not, but that is an assumption and this item's first act is to test it against real state (`P-04`). A step that duplicates the build's own checking is a step that doubles gate time for nothing.
- The step declares its gap out loud when `site/` is absent, the shape every site step in `gate.mjs` already uses (`P-03`).
- 19 hints are currently reported and are **not** errors. Do not fail the gate on hints without deciding that separately — a step that fires on advisory output is a step people learn to ignore.

---

## TASK 49 — `home.{en,es}.md` carries a body the design does not render · `content` · `DONE`

**Closed 2026-08-26.** The `thesis` key is in frontmatter and the hero prints it from there. Both bodies were replaced by a traceability note naming, per element, where the site now reads what the prose used to hold — the rail strings, the `thesis` key, the derived work section, `ui.home.contact_*` and `ui.socials`, and `about.{en,es}.md` for the five-years paragraph. **"What I'm looking for" is recorded as having no home:** the design draws it on no page, so it goes unpublished rather than published twice, and the note says so instead of leaving a reader to wonder where it went. The orchestrator handed over both files complete; the author pasted them (`H-02`). `check-content` and `check-terms` pass.

**Superseded opening note follows, kept for the trail.**


Opened 2026-08-25 by the home page item, which needs exactly one line out of this file and cannot address it.

`home.{en,es}.md` was written before the design existed and reads as a full prose page. The design keeps **one** sentence of it — the thesis, which the hero prints — and that sentence sits in the markdown body, so reaching it means parsing prose for a bold paragraph. Everything else in the body has a declared home elsewhere and is rendered from there:

| body element | where the site actually gets it |
|---|---|
| the role · location · timezone line | `ui.rail.role`, `.location`, `.timezone` |
| **the thesis sentence** | **nowhere addressable — this is the gap** |
| the five-years paragraph | not on the home artboard; About's material |
| the four "Evidence, not adjectives" bullets | the work bento, derived from the case studies |
| "What I'm looking for" | not on the artboard |
| "Get in touch" + the two links | `ui.home.contact_*` and `ui.socials` |

**An unrendered content file is worse than an absent one.** It looks published, it is not, and it drifts against the thing that really renders — which is the same defect class as a count in visible copy: nothing breaks, it just quietly stops being true.

**Done:** `home.{en,es}.md` carries a `thesis` key in frontmatter, its body no longer duplicates anything the site renders from another source, and `check-content` and `check-terms` pass.

**Constraints**

- **The author makes the edit.** `H-02` puts `resources/**` outside every agent's reach, so this item's shape is: the orchestrator hands over the exact content, the author pastes it, and that hand-off is a checkpoint. Agreed with the author 2026-08-25 as the working pattern for this class of item.
- Locale parity in the same change (`C-09`). The Spanish is first-class content, not a translation artifact.
- **This does not apply to About or Experience.** Both artboards render their markdown bodies as prose — checked, not assumed — so their bodies stay prose. What they need is structure *around* the prose, and the About/Experience split item already owns that.

---

## TASK 50 — `contact.{en,es}.md` is superseded and routes nowhere · `content` · `DONE`

**Closed 2026-08-26, decided: retire.** The author's call, taken with the alternatives on the table rather than by default. Contact is a **section of the home page, not a page**: it carries no route, and every string it rendered already comes from `ui.home.contact_*`, `ui.contact_form` and `ui.socials`. A file loaded by the collection, validated by the schema, counted by the parity guard and rendered by nothing is worse than an absent one — it looks published, it is not, and it drifts against the thing that really renders.

The pair was already deleted from the working tree; what was missing was the decision, and this is it. `check-content`, `check-docs` and `check-terms` pass with the pair gone, `ROUTED_PAGE_SLUGS` names `home`, `about` and `experience`, and nothing outside the historical `progress/` trail references either file.

**Two alternatives were offered and declined**, recorded so nobody re-derives them:

- **A routed `/contact` page.** Legitimate — a portfolio normally has one — but it is a design decision needing an artboard, and none exists. Building one from nothing would have been inventing design.
- **A `/contact` route redirecting to the home page's contact anchor**, so a guessed or previously shared URL lands somewhere sensible. Declined as scope: the URL was never published, so there is nothing to preserve, and a redirect for a path nobody has is a mechanism with no user.

**Superseded opening note follows, kept for the trail.**


Opened 2026-08-25 alongside its sibling above, and separated from it because it is a different deliverable with a different done (`P-01`).

Contact is **a section of the home page**, not a page. It carries no route — `ROUTED_PAGE_SLUGS` names `home`, `about` and `experience` — and every string it renders comes from `ui.home.contact_*`, `ui.contact_form` and `ui.socials`. So `contact.{en,es}.md` is loaded by the collection, validated by the schema, counted by the parity guard, and rendered by nothing.

**Done:** a decision, recorded, on whether `contact.{en,es}.md` is retired or given a routed page — and if retired, the pair is gone, `check-content` and `check-docs` still pass, and nothing in the collection loads a file with no consumer.

**Constraints**

- The author makes the edit (`H-02`), same hand-off shape as the item above.
- **Retiring is not obviously right.** A `/contact` page is a normal thing for a portfolio to have, and the design simply did not draw one. Deciding to retire it is a design decision, not a cleanup.
- Whatever is decided, the pair moves together (`C-09`).

---

## TASK 51 — The smoke tier's screenshots were dropped without being declared · `harness` · `DONE`

Opened 2026-08-25, while fixing the home page's design-fidelity gaps.

The Playwright item's Done named four things. Three were delivered and reported. The fourth — *"screenshots are captured at 1440 / 1024 / 390 in both themes for the author to judge"* — was **not built and not mentioned**. There is no `screenshots.smoke.spec.ts`; `site/tests/e2e/` holds the lifecycle and one spec. The closing entry does not claim the screenshots exist, so nothing in the register is false — it simply says nothing, and `P-03` is explicit that **silence reads as coverage**.

**What makes this worth an item rather than a note.** The dropped dimension is the *only* one of the four whose output a human was meant to look at. Hours later the author compared the built home page against the design by eye and found five fidelity defects — missing art, a hole in the grid, three absent responsive stages, a form at twice its intended width — every one of them invisible to `astro check`, `check-site`, the smoke tier and the mutation gate. **The deliverable that would have surfaced them is the one that was silently skipped.** That is `INC-03`'s shape arriving through a new door: not *dev ≠ prod*, but *nobody looked*.

**Done:** `site/tests/e2e/screenshots.smoke.spec.ts` captures both routes at the three sanctioned widths in both themes, writes them to a path that is declared rather than defaulted, and the gate step names where they landed. Proven by deleting the output directory and re-running.

**Constraints**

- **Not the fidelity diff.** No artboard comparison and no tolerance — that stays with the diffing item. This produces images for a human, which is a different and much cheaper deliverable.
- The output directory is gitignored and **named in one place**. A run of this session wrote three PNGs into `site/undefined/`, which is what an undefined path variable looks like when nothing asserts it.
- `P-03`'s wider lesson belongs in the closing note of whichever item does this: a dimension that does not apply is **declared out loud with a reason**. Dropping one quietly is the failure this item exists to mark.

**Closed 2026-08-26**, run in parallel with `TASK 25`. `site/tests/e2e/screenshots.smoke.spec.ts` captures every live route at 1440 / 1024 / 390 in both themes, from a route set derived from the content rather than listed in the file — **72 images**, which is what 12 live routes now costs, where the item was written when there were 2. The output directory is a single declared constant with an assertion behind it, so the `site/undefined/` failure cannot recur silently.

**The delete-and-re-run proof was observed by the orchestrator rather than reported by the agent**, which ran out of budget before it got there: the directory was empty when the gate started and held all 72 when it finished.

**One thing gitignoring did not cover, and it is the reusable half.** `check-site` walks the real tree, not git's index, so the 72-file output directory failed the file cap the first time the suite ran against the full route set — and `check-docs` then failed on the now-stale exemption that had been holding this item's place. Both are fixed in `guards.config.json`: `screenshots` is an excluded generated tree with its reason, and the exemption is gone. **A gitignore is not an exclusion**, and this is the item that found out.

---

## TASK 52 — A missing `run.footer` may be the cut-off signal `G-06` says does not exist · `harness` · `DONE`

Opened 2026-08-26 at wrap-up, from the trace rather than from memory (`P-12`).

`G-06` currently disclaims the ability to see a cut-off run at all: *"a budget-stopped run is indistinguishable from a successful one in the trace"*, amended downward on 2026-08-25 precisely because nothing observed had ever contradicted it. **This session's trace contradicts it, on a small sample.**

Six trace files, three of them with no `run.footer`:

| file | tool calls | footer | known outcome |
|---|---|---|---|
| `implementer-a3a18d…` | 8 | yes | completed, delivered |
| `implementer-abaaba…` | 12 | yes | completed, delivered |
| `-a7752c22c…` | 0 | yes | completed |
| `implementer-a99ebc…` | 30 | **no** | **cut off, zero files delivered** |
| `test-engineer-a56c7…` | 38 | **no** | **cut off mid-verification** |
| `orchestrator` | 277 | **no** | still running — expected |

Every delegated run that finished has a footer. Every delegated run known to have been cut does not. Five for five, and the two cut-offs were identified independently — by the orchestrator watching them stop, not by reading the trace.

**Done:** either `G-06`'s claim is amended upward with the mechanism named and a red path behind it — a deliberately cut run producing no footer, and a completed run producing one — or the correlation is shown to be coincidental and *that* is recorded, so nobody re-derives it from the same six files.

**Constraints**

- **Two data points are not a mechanism.** The honest outcome may be "suggestive, not load-bearing", and `G-11` requires the claim to move only as far as the evidence does — this item is as free to conclude nothing as it is to conclude something.
- A footer can plausibly go missing for reasons other than a cut — a crash, a killed process, a hook that did not fire. Those alternatives are the item's real work, not the happy path.
- `evidence/**` is read here and never written (`H-03`).

**Closed 2026-08-27. The correlation is a mechanism, and it was produced on purpose rather than found.** This entry's six files were suggestive and this entry said so; two dispatches settled it. Same role (`researcher`, `maxTurns: 25`), same session, same day, same read-only tool set, one variable — whether the brief fit the budget.

| | green half | red half |
|---|---|---|
| trace file | `researcher-a3c611a937e8d1a35.jsonl` | `researcher-ad61d65a67c3ce435.jsonl` |
| brief | 12 files, strictly one read per turn | 32 files, strictly one read per turn |
| turns | 12 of 25 | **25 of 25** |
| outcome | completed and reported | **cut at the limit, at item 24 of 32** |
| last event | `run.footer` | `tool.result` |
| `run.footer` | `COMPLETE / objective_reported` | **none** |

`G-06` amended **upward** accordingly, per `G-11`, having been amended downward on 2026-08-25 by `TASK 12`'s triage — the same row moving in both directions as the evidence moved is the rule working, not the rule wobbling.

**Three things this deliberately does NOT claim**, because the constraints above asked for exactly that discipline:

- **A missing footer means the run did not terminate normally, not that its budget was the cause.** A crash, a kill or a hook that never fired look identical. The standing counterexample is named in `G-06` itself: `harness-evaluator`, two footerless segments at ~32 turns against a cap of 60.
- **The `termination` block is still a literal.** `SubagentStop` carries no stop reason, so `FAILED` and `budget_exhausted` remain unwritable. The signal is the footer's **absence**, read from outside the file — never a field inside it.
- **Nothing checks this yet.** `G-06` carries rung 4 for the inference. Mechanizing it in `check-trace` is not done here, because a check that flags every footerless orchestrator file as a finding would be red on the running session forever.

**The alternative explanation this entry could not rule out, ruled out.** `TASK 12` conjectured that a cut run's footer lands in the `-<id>.jsonl` file written by a stop with no `agent_type`, so the footer would be misfiled rather than missing. It does not: the 7 dash-named files carry `agent_id`s matching no sibling run, and three of them sit in sessions containing no cut-off run at all. They are a separate phenomenon and they do not confound this.

**The reusable red path is `.claude/agents/budget-probe.md`** — `tools: Read`, `maxTurns: 2`, kept rather than deleted so the claim can be re-run (`P-14`). One caveat found while building it: **a role file is not picked up the moment it is written.** The probe was dispatched immediately after `check-agents` passed on it and came back *"Agent type not found"*; a `maxTurns` edited on an existing role did not take effect either, so the red path was run by temporarily lowering `researcher` (restored). **Later in the same session the registry rescanned**, `budget-probe` became available, and a third dispatch stopped at **exactly its 2-turn limit with no footer** — a third specimen for `G-06` at a different cap. So the reload is delayed, not absent, and the first statement of this caveat said "cannot" where the evidence only supported "not yet". Corrected here rather than left standing.

Detail: `progress/2026-08-27-01-trace-fidelity-y-presupuestos.md`.

---

## TASK 54 — A green gate can be measuring HTML the current code did not produce · `harness` · `DONE`

**Closed 2026-08-27. The caches are keyed on the pipeline's own inputs, not cleared.** `astro.config.mjs` fingerprints the core, itself and the lockfile — a plugin's version is a pipeline input too — and derives `cacheDir` and `vite.cacheDir` from that fingerprint. A pipeline change lands on a fresh directory by construction, and an unchanged pipeline still builds warm.

**The defect was reproduced before it was fixed, and the reproduction is the sharpest artifact.** Diagram-caption plugin neutered so it stops dropping the private `Spec:` half: **warm cache, 0 files carried the leak; cold cache, same code, 10.** Same command, opposite answers, no warning in either.

**The red path passes with a WARM cache**, which is what the item asked for. Same neutering, cache present and populated for the previous key: the build produced the defect in 10 files and the e2e suite failed **12**, every failure on `no drawing-spec text reaches the page`, across chromium, firefox and webkit. Restored: **309 passed, 0 failed**.

**Measured, not impressions** (`C-01`). On 17 pages: cold **15.01s**, warm **2.91s** — a far worse ratio than the ~2.5s/~1.3s on 12 pages this entry was opened with, and the reason clearing on every gate run was rejected: it charges every run for a defect that occurs only when the pipeline changes. After the change, an unchanged pipeline builds in **2.56s**. The cost is paid on the build that follows a pipeline change, which is the build that must not be cheap.

**Pruning superseded cache directories is garbage collection, never invalidation.** Correctness does not depend on the deletion succeeding — a build whose keyed directory is missing is slow once, never wrong — so it is best-effort and scoped by the prefixes the module itself mints, leaving Astro's unsuffixed defaults and Vitest's own cache untouched.

**`INC-03` gains no rule, and that is the decision.** The mechanism is structural: the key is a function of the code, so the build cannot silently reuse stale HTML. A rule saying *the build must reflect the code* would be prose nothing can check, and `architecture.md` §M already records the deliberate absence here.

**One limit, stated rather than left to be discovered.** The fingerprint covers the core, the config and the lockfile. A pipeline input placed elsewhere would not move the key on later edits — though adding it moves the key once, since the config is itself an input. The core is where the pipeline lives by rule, so the limit is bounded by that rule.

Detail: `progress/2026-08-27-10-task54-pipeline-keyed-cache.md`.

**Superseded opening note follows, kept for the trail.**

Opened 2026-08-26 by `TASK 25`, from a red path that refused to go red.

Both of that item's critical mechanisms were deliberately neutered — the diagram caption stopped dropping its private `Spec:` half, and the deep-dives strip was made a no-op — and the end-to-end suite was re-run. **All sixteen tests passed.** The tests were fine. `node_modules/.vite` and `node_modules/.astro` cache the markdown pipeline's output, keyed on the markdown; a change to a plugin under `site/lib/**` does not invalidate that cache, so the build reused HTML produced by the *previous* version of the code. Clearing both caches and rebuilding produced the defect immediately, and the suite then failed 6 of 16.

**Why this is an item and not a note.** The consequence is general and silent. Any change to a content-pipeline plugin can pass a full green gate — `astro check`, `check-site`, the smoke tier, the mutation gate — against a build made from the code as it was before the change. Nothing anywhere says so. This is `INC-03`'s lesson arriving through its third door: not *dev ≠ prod*, not *nobody looked*, but **the build did not rebuild**, and the difference is invisible in every report.

**Done:** a build that follows a change under `site/lib/**` renders that change, proven in red — the same neutering, an untouched cache, and a failing suite. Either the caches are keyed on the pipeline's own inputs as well as on the markdown, or the gate's build step clears them and the cost of doing so is measured and recorded.

**Constraints**

- **Measure the cost before choosing.** Clearing the cache on every gate run is the blunt fix and it lengthens the one command everybody types; a rebuild from cold took ~2.5s here against ~1.3s warm, on twelve pages, and that ratio is what changes as the site grows. Record the measurement, not an impression of it.
- **The red path is the deliverable.** A fix that is only ever seen to pass is exactly what produced this item.
- Whether `INC-03` gains a rule, or this stays a mechanism with no rule behind it, is a decision for whoever closes it — `docs/harness/architecture.md` §M already records the deliberate gap.

---

## TASK 55 — Five delegated runs, five turn budgets exhausted · `harness` · `DONE`

Opened 2026-08-26 by `TASK 25`, which delegated five `implementer` slices and had all five cut off.

Every slice owned exactly two files — the size `TASK 12`'s specimen set says completes, and the size `P-09` was re-cut to. Two delivered everything and were cut before reporting; one was cut mid-sentence while fixing its own finding; one delivered two of three exports and the orchestrator finished it; one delivered a complete implementation whose report never arrived. **So the artifacts were mostly fine and the reports were the casualty**, which is the failure mode nobody notices: the orchestrator gets a truncated summary and has to re-derive from the diff what the agent already knew.

**What is different from `TASK 12`'s specimens.** Not the writing — the reading. Each brief required the content entries, two or three artboards, and a markdown-pipeline API nobody in this repository had used before. `maxTurns: 30` in `.claude/agents/implementer.md` was calibrated against slices whose context was already familiar.

**Nine more slices, 2026-08-26 (`TASK 26`), and this set finally separates the two causes.** Six completed, three were cut. What differs between them is not size — every slice owned exactly two files, as `TASK 25`'s did — but what each was told to **read**.

| round | slices | briefed to read | cut off |
|---|---|---|---|
| one · core modules | 4 | one or two sibling modules for house style | **2 of 4** |
| two · components | 3 | **one pre-written extract**, forbidden from opening any artboard | **0 of 3** |
| three · end-to-end | 1 | **three existing spec files, plus "derive from the content"** | **1 of 1** |

**Round two is the result that matters: three for three, on component work of comparable size to the round that lost half its runs.** The only variable changed was that the orchestrator did the expensive artboard read once, up front, and handed each agent a bounded extract with an explicit instruction not to open the source. That is the second axis this item was opened to find, now with a controlled comparison rather than a hypothesis.

**And the failure that proves it from the other side was the orchestrator's own.** The end-to-end slice was the single brief in the item that named files to go and read instead of handing over an extract. It spent **50 tool calls and roughly 100k tokens and produced no test file at all** — only its log skeleton — with its final message saying it was about to start looking at the page sources. It never reached its output because the input was unbounded, which is this register's eighth specimen repeating exactly, in a brief written by someone who had already applied the fix three times that hour.

So the distinction `P-09` needs is not only *objects owned plus documents that must be read*. It is sharper and more actionable: **a brief that names a document to find something in has handed over an unbounded read; a brief that hands over the extract has not.** The two look identical when you write them and cost differently by an order of magnitude.

**Two further observations from the same nine runs:**

- **Log-first held again, three for three.** Every cut-off slice kept its progress log. Two of them, though, left a `done:` block mid-state — one with a status outside the vocabulary, which `check-procedures` caught within seconds, and one with no block at all, which nothing caught. See `TASK 14`.
- **Resuming by message stayed cheap.** The one core slice cut with real work outstanding was finished in a single round trip, because the orchestrator could name exactly which three tests were missing.

**Done:** either the budget is raised with the new number justified by measurement rather than by feel, or `P-09` gains the distinction this item found — that a slice is sized by *objects owned plus documents that must be read*, not by objects alone — or both, with the rejected option recorded.

**Constraints**

- **Do not simply raise the number.** A budget raised without a measured reason is a budget that gets raised again next time. `TASK 12` holds seven specimens and this item adds five; that is a sample worth reading before changing anything.
- **The report is part of the deliverable, not a courtesy.** An agent that writes the code and never reports what it drifted on has delivered an artifact and lost the reasoning behind it, and `P-11` means the orchestrator then has to verify from scratch what the agent already checked.
- The correlation `TASK 52` is chasing — a cut run leaves no `run.footer` — now has five more specimens. Whoever takes either item should read the other's evidence first.

**Closed 2026-08-27, taking both branches, because the measurement this entry demanded turned out to exist after all.**

**The measurement.** `TASK 12`'s triage concluded that turns are not recoverable from the trace, and it was reading for a turn *count*, which no event carries. A turn is nonetheless **observable as a transition from `tool.result` to `tool.requested`**, and a dispatch — the unit `maxTurns` applies to — is a **segment between `run.header` events**, since a resume gets a fresh header and a fresh budget. Over the whole corpus (34 run directories, 101 files, 12,885 events, read never written):

| role | `maxTurns` | segments WITH footer | segments WITHOUT footer |
|---|---|---|---|
| `implementer` | 30 | 22 · turns 4–32 | **23 · turns 28–41, mode 30–33** |
| `test-engineer` | 30 | 1 · 2 turns | 6 · 1, 29, 34, 34, 37, 41 |
| `adversarial-auditor` | 20 | 3 · 0, 0, 3 | 2 · 25, 26 |
| `researcher` | 25 | 7 · 0–22 | 1 · 30 |
| `harness-evaluator` | 60 | 3 · 5, 5, 30 | 2 · **32, 32** |
| `Explore` | none declared | 8 · 12–32 | 0 |

The proxy is **exact** when calls are sequential and overcounts by roughly a third when they are batched — established, not assumed: `TASK 52`'s two probe runs forbade parallel reads and the proxy read exactly 12 and exactly 25 against a known cap of 25. The overcount is a property of parallelism, not an error in the method.

**Half of all `implementer` dispatches hit the cap: 23 of 45.** The completed ones run 4–32. A cap that half the dispatches reach is not a safety net, it is a scheduler, and it is biting inside the working distribution rather than at its edge. That is the measured reason this entry's first constraint asked for.

**Branch one — the budgets, each with its number's reason:**

| role | from | to | why |
|---|---|---|---|
| `implementer` | 30 | **45** | 23 of 45 segments at the cap; completed work reaches 32 |
| `test-engineer` | 30 | **45** | 6 of 7 segments footerless, the worst ratio on the roster |
| `adversarial-auditor` | 20 | **40** | 2 of 2 segments with real work were cut; its three footers were runs of 0, 0 and 3 turns. It has never once produced a footer having worked. It is also the only role whose job is running red paths, and a red path is five calls per finding |
| `researcher` | 25 | **25** | one cut in eight. No change, said out loud rather than by omission (`P-03`) |
| `harness-evaluator` | 60 | **60** | its two cuts happened at ~32 turns against a cap of 60, so the budget is not what stopped them. This is `G-06`'s counterexample, not a budget problem |

**Branch two — `P-09` gains the reading axis**, in the sharper form this entry found: *a brief that names a document for the agent to find something inside has handed over an unbounded read; a brief that hands over the extract has not.* The origin recorded on the row is this item's own controlled comparison — nine slices of equal size, all owning two files, cut 2 of 4 · **0 of 3** · 1 of 1 by what each was told to read.

**One clause was removed from `P-09` rather than kept, and it is worth naming.** The row promised *"an agent cut off mid-run delivers zero, not half — the cost is total, not proportional."* This repository's own register falsifies it: across thirteen specimens the artifacts mostly landed and the **report** was the casualty. `INC-06`'s original observation stands for the slice that is too big; it is wrong as a general claim, and a rule contradicted by the evidence beside it is a rule that gets disbelieved. What replaced it is the finding that survives — the cut lands on whatever is last, and log-first is the one mitigation measured to work, eight for eight.

**What is and is not verified.** A role file is not picked up the instant it is written, but the registry **does** rescan during a session: `budget-probe`, created here, was unavailable at first and later enforced its 2-turn cap exactly. **`implementer`'s new cap was then observed directly** — `TASK 59`'s slice ran to **45 turns** before stopping, against the 30 that cut four slices earlier the same day. So the raised numbers are live, and this is an observation rather than the inference it was first written as. **What remains unmeasured is whether they help.** Whether 45 turns lowers `implementer`'s cut rate below the 23-of-45 measured here is a re-measurement, and the segment method above is now cheap enough to repeat — which is the honest answer to this entry's own warning that *a budget raised without a measured reason is a budget that gets raised again next time.*

Detail: `progress/2026-08-27-01-trace-fidelity-y-presupuestos.md`.

---

## TASK 56 — A self-staling list whose test forbade it from ever reaching empty · `bugfix` · `DONE`

Opened and closed 2026-08-26 by `TASK 26`, recorded because the shape generalizes.

`guards.config.json`'s `pendingRoutes` is a self-staling list: a slug whose route the collection derives but which no page module serves yet. Its own rationale ends *"This list is expected to reach EMPTY, which is the healthy end state, not a defect."*

**The smoke tier asserted the opposite.** `routes.smoke.spec.ts` carried `expect(pendingRoutes.length).toBeGreaterThan(0)`, so the day the last pending route was served — which is what this backlog has been working toward for six items — the suite would have gone red for succeeding.

Both halves were written in good faith and each is right on its own. The assertion exists for a real reason: a route set with nothing in it lets every loop below iterate zero times and report green, which is `TASK 39`'s failure shape. What it got wrong is *which* emptiness is suspicious. An empty **live** set means the derivation broke. An empty **pending** set means the work finished.

**Done:** the liveness assertion covers the live set only, and the pending half asserts **coherence** instead — every slug still listed must be one the route set actually derives, so a stale entry naming a page that no longer exists is reported. Nothing else would have caught that.

**Constraint honoured:** the fix does not weaken `TASK 39`'s protection. It narrows it to the set where emptiness is genuinely a defect.

---

## TASK 57 — Two end-to-end assertions passed alone and failed under load · `bugfix` · `DONE`

Opened and closed 2026-08-26 by `TASK 26`.

Two assertions in the new page suite failed on Firefox under the full 495-test run and passed 25 of 25 when that same spec ran alone on the same engine. `T-06` says a flake is a finding, so the cause was found rather than the run repeated.

**Both depended on rendered layout where the question was structural.** One read `innerText`, which forces a layout pass; the other resolved a child-combinator locator. Under contention with the screenshot tier hammering the same preview server, both timed out. Neither was asserting anything about layout: one compares a byline's text against the rail's, the other asks which class the first child carries.

**Done:** both read the DOM directly — `textContent` via `evaluate`, and `firstElementChild.className` — and four consecutive full-suite runs are clean. The timing assumption is removed rather than tolerated.

**Worth carrying forward.** The first full run of the session reported one failure that vanished on re-run and left no artifact, and it was almost certainly one of these two. That one was nearly written off as noise. The rule that saved it is the plain one: **run the failing spec in isolation before believing a flake is environmental** — if it passes alone and fails in company, the test is making a timing assumption and the assumption is the bug.

---

## TASK 58 — A screenshot step reported PASS while writing no image · `bugfix` · `DONE`

Opened and closed 2026-08-26 by `TASK 26`, and it is `TASK 39`'s exact shape in a new place.

The screenshot tier was extended to capture the not-found page, which had never been captured because it is served by every unmatched address and the collection therefore derives no route for it. **The page a visitor sees when something has gone wrong was the one page nobody was looking at** — and a real fidelity defect had already shipped behind that gap, found only because the orchestrator captured it by hand.

The extension appeared to work: the run reported `97 passed` and named the new tests. **It had written no image.** The capture body asserts `status === 200`, which the not-found page correctly is not, so all six of its tests were failing — and the failure sat far enough up a 100-line reporter stream to be missed on first read.

**Done:** the expected status travels with the route rather than being assumed by the loop, the not-found page is captured at all three widths in both themes, and the run reports 103 passed with 102 images on disk — counted, not inferred.

**The reusable half is the reading, not the fix.** A step that names the right work and reports a green summary is not evidence the work happened; `P-11` says the artifact is the evidence, and here the artifact was a file count that took one command to check and would have gone unchecked.

---

## TASK 53 — `SPEC-TASK-24` sits at `version` 1.1 with `approved_version` 1.0 · `planning` · `DONE`

**Closed 2026-08-26.** Author approved `HOME-011` (`normal` priority, fully implemented, green on all 9 of its unit tests in `bento-spans.test.mjs`). `SPEC-TASK-24`'s `approved_version` moved 1.0 → 1.1; drift log records the approval with today's date. `H-05` no longer blocks write-capable delegation against this spec.

**Superseded opening note follows, kept for the trail.**

Opened 2026-08-26 at wrap-up. A one-decision item, tracked rather than left as a sentence (`P-06`).

The home item added `HOME-011` — the bento's derived column spans — which did not exist when the author approved that spec. The version moved; the approval did not. That is the honest state and it was left that way deliberately: the code is built, tested and green, and the author has not signed off on the added behavior.

**It matters beyond bookkeeping.** `H-05` is a rung-1 boundary and it blocks write-capable delegation on any active spec whose `version` has moved past its `approved_version`. So the next item that wants to delegate an implementer against this spec will be denied — correctly, and confusingly, if nobody remembers why.

**Done:** the author has read `HOME-011` and either moved `approved_version` to 1.1, or asked for the behavior to change and the version to move again. Recorded in the spec's drift log either way.

**Constraints**

- **Not an agent's decision.** An approval an agent grants itself is not an approval — that is `INC-05`, and `P-02` is explicit that a plan approval or a "go ahead" is not this gate.

---

## TASK 24 — Home · `feature` · `DONE` · **ran twelfth**

**Closed 2026-08-26.** The gate runs 19 steps and passes 18; the one red is `evidence trace`, which `H-03` puts outside every agent's reach and which every item since the content layer has closed the same way. `/` and `/es/` render the hero, the work bento, the stack strip and the contact section entirely from `resources/`. **81 e2e tests across chromium, firefox and webkit** (54 before this item), 72 core unit tests, 15 component tests, `astro check` clean, **mutation 75.07 against a floor of 74.5** — up from 74.74, because the new tests raised the headroom rather than eating it.

**`HOME-004` is proven, not asserted.** The author pasted a throwaway sixth case-study pair; the build ran; the pair came out. Every file under `site/src` and `site/lib` hashed identically before and after (`1ef17d06…565af0`), so the no-template-edit half is a fact rather than a claim. Featured tiles went 4 → 5, stack chips 40 → 44 in both locales, and the column spans recomputed from `2 · 1 · 1 · 2` to `2 · 1 · 1 · 1 · 1` — **a different layout, correctly, with nobody deciding it.** That last row is the item's best argument: the design resolves its own bento by hand-labelling one tile wide, which is right for exactly five case studies and wrong for six. Copying the class across would have been invisible until the sixth arrived.

**The item's real finding is that the gate was green while the page was wrong.** The author compared the built home against the design and reported that the cards matched neither the layout nor the art. They were right about more than they named: the five per-tile motifs **did not exist at all** (`HOME-007` sat at `planned` while the item approached closure), the bento left a hole, **three entire responsive stages** were absent — the one-column bento, the anchor tile's narrow treatment, the thesis stepping 40 → 30 → 25 — and the contact form ran at twice its intended width. `astro check`, `check-site`, the smoke tier and the mutation gate were green through every one. Nothing was wrong with the code. **Three of the five had been written down as loose ends in this repository's own logs before they shipped**, which is the sharper half: a flagged loose end that nobody converts into a work item is indistinguishable from one nobody noticed (`P-06`).

**Five of the fifteen tests this spec scheduled had never been written.** The Test Plan named them and attributed them to the route smoke suite, which contained none of them. Found at close by listing the real test names and diffing them against the table instead of trusting it — the same `P-11` move that keeps paying. They now live in `site/tests/e2e/home.smoke.spec.ts`, every expected count and string derived from `resources/`, and were proven load-bearing in red. One of them failed on arrival for a real reason: `HOME-008`'s edge case required the contact address to come from content, and `HomeSections.astro` was holding it as a literal.

**The spec is at `version` 1.1 with `approved_version` 1.0, deliberately.** `HOME-011` — the derived bento spans — did not exist when the author approved this spec, and the honest state is that the code is built and green while the added behavior is unsigned. `H-05` blocks write-capable delegation until that is resolved, which is the protection working rather than an obstruction.

**One dimension is `partial` and says so.** The author's design review happened at 1440 in the light theme; the re-review at three widths in both themes has not been run since the fixes landed. The artboard diff itself stays with the design-fidelity harness item.

Detail: `progress/2026-08-25-09-task24-home.md`.

**Superseded opening note follows, kept for the trail.**


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

## TASK 25 — Case study and platform templates · `feature` · `DONE` · **ran thirteenth**

The two article archetypes, and the five case studies routed through them.

**Deliverable:** `/case-studies/[slug]` and `/es/case-studies/[slug]`, one template per `type` (`case-study`, `platform`), each with the rail table of contents.

**Done:** every case study renders in both locales; the table of contents is generated from the article's own headings, never hand-written; scrolling marks the current heading; diagrams render as static SVG and scroll horizontally rather than overflowing at narrow.

**Design fidelity:** the case-study template against `CaseStudyDetail.dc.html` and `CaseStudyMobile.dc.html`; the platform template against `PlatformPage.dc.html`. Both themes, all three widths.

**Constraints**
- `platform` gets the distinct treatment the design specifies — a scale figure instead of an outcome metric, a services grid, and Deep Dives styled as the card language its children use elsewhere.
- **`/case-studies` (the index) is designed and deliberately not routed.** It ships when the list outgrows the home section, roughly eight items. Do not route it in this item.
- ~~**`scale` is one content string and the artboard prints it as two.**~~ **Stale when this item opened, and the entry was the thing that was wrong.** The home item had already split it: the frontmatter carries `scale: "+100,000s"` and `scale_caption: "active users"`, and both print verbatim. The artboard reads `100,000s` / `active users on the platform`; the content wins, and editing either would be a content change this item does not own.
- ~~**The platform-to-deep-dive relation has no structured field, and cannot get one.**~~ **Answered: parse the body links, and make the parse do double duty.** The platform body's `## Deep dives` section is located *structurally* — the `##` heading whose following list has a single internal link in every item — never by its heading text, because the Spanish body writes that heading in English today and a text-keyed rule would break silently the day someone translates it. The pipeline lifts the section out and hands the slugs to the template, so the section cannot render twice; the template rebuilds each card from the linked entry's OWN frontmatter and re-derives the href from the route set, so the Spanish cards point at Spanish pages. The child-to-parent direction is the inverse of that same list, computed once — rejected: showing all siblings derived from `type`, which would have put an unrelated employer's case study under a bank platform.
- ~~**`skills` has no label in any artboard.**~~ **Answered: rendered, unlabelled.** A chip list below the article body, with no heading, no `aria-label` and no caption — and an end-to-end test asserts the absence, so a later change cannot quietly invent one. The values print as the content carries them (`legacy-integration`), because a display mapping would be new copy outside the content.

**Closed 2026-08-26.** Ten article routes, two type-keyed templates, six new core modules. `astro check` clean, **check-site PASS**, 34 end-to-end tests across three engines for these pages alone, and **the two assertions the author asked for by name are read off the built HTML rather than off a test's opinion of it**: no text beginning `Spec:` appears anywhere in any of the twelve built pages, and the deep-dives section renders exactly once — one grid, three cards, zero surviving list items, in both locales.

**Its lesson is the one the register should carry forward, and it is not about this page.** The end-to-end suite was proven in red by neutering both critical mechanisms — and it passed, all sixteen. The build had served a cached render: `node_modules/.vite` and `node_modules/.astro` key the markdown pipeline's output on the markdown, so a change to a plugin under `site/lib/**` does not invalidate it. Cleared and rebuilt, the defect appeared instantly and the suite failed 6 of 16. **A green gate can be measuring HTML the current code did not produce.** That is `TASK 54`, and it is the third door `INC-03` has come through.

Two `ui` strings are still owed by the author — `article.part_of` and `article.figure_prefix` — and both blocks ship shorter rather than approximated. `TASK 55` records that all five delegated runs exhausted their turn budget.

---

## TASK 26 — About, Experience and 404 · `feature` · `DONE` · **ran fourteenth**

**Closed 2026-08-26.** `/about`, `/experience`, the bilingual 404 and their `/es/` counterparts. **17 pages build**, the gate runs 19 steps and passes 18 — the one red is `evidence trace`, which `H-03` puts outside every agent's reach and which every item since the content layer has closed the same way. **303 end-to-end tests across three engines**, 212 core unit tests (156 before), 15 component tests, `astro check` clean, and **mutation 76.72 against a floor of 74.5 — the highest this repository has measured**, up from 75.90.

**Its most important result has nothing to do with the pages.** Spiked before the spec was written: **the build publishes every file its asset glob matches, referenced or not**, under both an eager and a lazy glob. A photograph the author had deliberately withheld — six or more identifiable people, `C-06` consent — was in that directory. Nothing rendered it, no test looked for it, every check was green, and it would have shipped at a guessable URL. `resources/photos/` is now a **declared** publication boundary, and `ABOUT-009` fails the build naming any asset no locale references, derived from the directory listing rather than a roster. `INC-03`'s lesson has now arrived through a fourth door: not *dev ≠ prod*, not *nobody looked*, not *the build did not rebuild*, but **what nobody rendered was published anyway.**

**Three design defects were found by looking, none by a check.** About shipped with its page inset applied twice, because its component rendered a `<section>` inside the page's own — the exact failure the not-found brief carried an explicit warning about, and it landed in the one slice that was not warned. An explanatory HTML comment shipped to production. And the not-found page printed `HTTP 404` in the display slot where the artboard has the numeral alone, duplicating the status line directly above it. All three fixed.

**Absence over approximation held against real unwritten content.** The About lead and one photo caption are still empty, and the page renders no empty paragraph and no reserved gap — asserted end to end, and proven in red by neutering the rule and watching the suite fail.

**Delegation: nine slices, six clean, three cut off, and the pattern is now legible.** Round one lost two of four; round two, handed pre-written extracts and forbidden from opening any artboard, lost none of three. The one that produced **nothing at all** was the end-to-end slice — the only brief that was handed a reading list instead of an extract, which makes its failure the orchestrator's rather than the agent's. Detail: `progress/2026-08-26-02-task26-about-experience-404.md`.

**Superseded opening note follows, kept for the trail.**


**Deliverable:** `/about`, `/experience`, the bilingual 404, and their `/es/` counterparts.

**Done:** About renders on one centred axis with photo figures omitted while `TASK 20` is open; Experience renders the chronology from `experience.{en,es}.md`; **the 404 is served with a real `404` status, never a `200` carrying error copy** — a soft 404 is indexed as a real page.

**Design fidelity:** against `About.dc.html`, `Experience.dc.html` and `NotFound.dc.html`. About's rule is the one to assert explicitly — **one centred axis, exactly two widths** — because it is the constraint three earlier versions broke.

**Constraints**
- The 404's language switcher marks neither locale as current. That is a designed state.
- Experience entries take an optional logo; absent is a supported value.

---

## TASK 27 — Design-fidelity harness: dev, prod and the design as three things · `harness` · `TODO` · **runs before the milestone**

`INC-03`'s remedy, deferred since `docs/harness/architecture.md` §M *"until the site has screens worth diffing"*. The site is that trigger — and this is the mechanism criterion 3 names, so **it is built before the screens it checks, not after them.** Built afterwards, the first three pages ship unverified and then get retrofitted, which is the more expensive order and the one that quietly never happens.

**Split into two legs 2026-08-27, so the milestone it gates is actually reachable.** The milestone's own text ("`npm test` is green, including every `TASK 27` fidelity diff") required this whole item, but the backlog table put it entirely *behind* the milestone — unreachable by construction. Only the **prod** leg genuinely needs a deploy; **local** (dev build vs. design) does not. The **local + design legs run before the milestone**, in the backlog row directly above it; the **prod leg stays behind `TASK 32`**, reporting a declared `skipped` until a deployed base URL exists, exactly as designed below.

**Deliverable:** a Playwright suite that captures every route at 1440 / 1024 / 390 in both themes and both locales, and diffs **three** things: the local build, the deployed build, and the design intent — the corresponding artboard, rendered from `docs/design/canvas/build/src/`.

**Done:** the suite is reachable from `npm test` — i.e. it runs as a sub-gate of `gate.mjs`, not as a separate invocation someone has to remember; a deliberately introduced CSS regression fails it (`P-14` — proven in red, never merely seen to pass); a page item can name its artboard and get a pass/fail without writing new harness code.

**The prod comparison is deferred, and deferred out loud (amended 2026-08-23).** The backlog is now local-first, so there is no deployed build to compare against until `TASK 32`. The mechanism is still built for **three** targets: the prod target reads its base URL from an environment variable and, when that is unset, reports `skipped — no deployed build exists yet (TASK 32)`. A skip that names its reason and its owner is `P-03` applied to a test — silence reads as coverage, a named skip does not. Removing the third leg instead would remove `INC-03`'s entire lesson.

**The prod comparison is THIS item's clause, moved back here 2026-09-01.** It had been written into `TASK 32`'s own `Done` — *"`TASK 27`'s prod comparison is switched on and passing"* — which made one item's done depend on building another item's deliverable, and made `TASK 32` unclosable by construction: this item is `TODO` in full, `site/tests/e2e/` holds five smoke specs and no fidelity-diff suite, so there was no prod target for `TASK 32` to switch on and no work inside it that would create one (`P-01`). The deploy item now owes this one exactly what it was waiting on and nothing else: **a deployed base URL, published as `PROD_BASE_URL`** — the variable named above, declared once in the deploy job from the deploy step's own output. When this item is built, the prod leg reads that name and the skip retires itself.

**Constraints**
- **Three comparisons, not two.** `INC-03`'s origin was a CSS-purge defect invisible in dev, with seven element-level defects surviving two visual reviews against a dev build. Dev-vs-design alone would have missed it exactly as it was missed then, and prod-vs-dev alone would not have known what correct looked like.
- **The skip is temporary by construction.** `TASK 32` is not done until the base URL is set and the prod comparison passes. A skip with no owner is a skip that becomes permanent.
- **Routes and artboards are both enumerated from their artifacts** — the content collection and `canvas.json` — never from a list in the test file (`P-13`). `docs/design/canvas/verify.mjs` already does exactly this and is the pattern to copy.
- A pixel diff on a whole page is a test that fails for the wrong reasons. Diff at the **component** level against the sheet, with a tolerance, plus a small set of full-page structural assertions.
- The artboards are mockups: content differs from the real content by design. **The comparison is structural and stylistic — layout, tokens, spacing, states — never text equality.** An item claiming otherwise would fail forever and be switched off.
- Installs Playwright, which also unblocks the e2e half of `TASK 15`.

---

## TASK 28 — Custom domain · `feature` · `DONE`

**Domain and redirect configured directly by the author, outside this repo — no agent touched DNS or Cloudflare routes, per this item's own constraint below.** Verified 2026-09-02 rather than taken on the author's word alone (`P-04`): `https://luis-antm.com/` and `https://www.luis-antm.com/` both resolve at HTTP 200 over a validly-certificated HTTPS connection, and a spot-check of `/`, `/about`, `/experience`, `/es/`, `/es/about` all return 200 while `/nope` returns a real 404 — no route regressed against what `*.workers.dev` served.

**One repo-side loose end followed from this: the live URL had nowhere published yet.** `TASK 4` recorded exactly this trigger on 2026-08-16 — the GitHub profile README shipped with email + LinkedIn only because there was no live site to link at the time, with an explicit note to revisit once one existed. That trigger has now fired: `H-02` denies any agent write to `resources/**`, including the orchestrator's, so this was the **author's** edit to make — applied 2026-09-02, verified in the file at `resources/github/profile-README.md`:23, now reading `[Portfolio](https://luis-antm.com/) · [Email me](...) · [LinkedIn](...)`. No new item opened for it (`P-19`) — it is `TASK 4`'s own follow-up, now closed.

**Deliverable (met):** the site served from the author's own domain over HTTPS, with `*.workers.dev` redirecting to it.

**Done (met):** the apex and `www` both resolve; the certificate is valid; no route 404s that worked on the previous host.

**Constraints — kept for the trail**
- **The author buys the domain and owns the Cloudflare account.** An agent prepares the DNS and route config; it does not purchase, authenticate or transfer anything. **Held to exactly as written: this closing note involved no DNS or route configuration, only verification and a one-line content addition.**
- A portfolio sent to recruiters wants a real domain, so this should not sit open long — but it was correctly kept off the critical path for the first deploy.

---

## TASK 29 — Contact form Worker · `feature` · `IN PROGRESS`

Replaces `mailto:` with a real submission, which is what makes the form's four designed states real.

**The deferral trigger fired 2026-09-02.** The author asked for submissions without a mail client opening, which is the condition this item was holding for — so it is resumed rather than reopened, and no new item was created for it (`P-19`). Spec: `docs/specs/SPEC-TASK-29-contact-form-worker.spec.md`, awaiting the author's `approved_version`. Log: `progress/2026-09-02-01-task29-contact-form-worker.md`.

**Deliverable:** a Cloudflare Worker accepting the form POST and sending mail, with the `sending` / `sent` / `error` states wired to it.

**Done:** a submission arrives as email; a forced failure shows the error state **with the sender's text intact**; the success state echoes back the address the reply will go to.

**Constraints**
- **Returns when the author wants submissions without a mail client opening.** Until then `mailto:` is not a stopgap, it is the shipped answer.
- The API key lives in Cloudflare, never locally (`G-08`).
- Needs a spam answer — a Turnstile challenge or a rate limit. A public unprotected form is a mailbox someone else fills.

---

## TASK 20 — Split About and Experience, and source three photographs · `content` · `TODO` · **most of it closed 2026-08-26**

**Reconciled 2026-08-26 by `TASK 26`, which needed a subset of this item to render its two pages and could not proceed without it.** What that item drafted, and the author applied to frozen `resources/` themselves:

| row | state |
|---|---|
| Per-role narrative moved out of About | **done** — About's four employer paragraphs are gone; Experience owns the chronology outright |
| The four employers as structured entries | **done** — `roles[]` in `experience.{en,es}.md` frontmatter with `company`, `period`, `title`, `body`, `stack`, optional `logo`, and `case_studies` as bare slugs |
| An `h1` and an intro line for Experience, plus a per-role `stack` field | **done**, both locales |
| An `h1` for About | **done**, both locales. The Spanish was derived from the author's own Spanish prose and signed off rather than invented |
| **Three photographs** | **done** — a 3:2 Huayna Potosí panorama, a 4:5 portrait and a 4:5 Bolivia landscape, all the author's own, all EXIF-free, all rendering |
| A lead paragraph opening About as a person | **still open.** `lead` is present and empty; the block is absent rather than approximated, and appears with no code change the day it is written |
| Two or three sentences on working from Cochabamba for teams abroad | **still open**, same shape |

**Two things this reconciliation adds that the original entry did not know.**

**`resources/photos/` is a publication boundary, not a drop box.** Every file in it is published by the build whether anything references it or not. Two candidate photographs were removed for that reason, one of them because it shows identifiable third parties whose consent `C-06` requires. The build now fails naming any unreferenced asset, so this cannot recur silently — but the rule is worth stating here too, because this is the item that adds photographs.

**The portrait is shippable and it is the weakest image on the site.** It reads as a phone selfie against an indoor wall, and it is the one photograph whose only job is to be him. Recorded as a real, small, non-blocking improvement rather than left as an impression.

**Superseded opening note follows, kept for the trail.**


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

## TASK 19 — LinkedIn recommendations as content · `content` · `DONE`

The home page's contact section carries three testimonial cards, currently `[NEEDS INPUT]` placeholders in the design canvas. They cannot be filled from the design task: the quotes are real words written by real people about the author, so they are content, they belong in `resources/`, and `H-02` puts that outside any agent's reach.

Three recommendations exist on the author's LinkedIn profile: a manager at NICE, a Product Owner at Banco Solidario, and a second manager at NICE.

**Done:** `resources/site/testimonials.en.md` and `resources/site/testimonials.es.md` exist, both locales, each carrying for all three recommendations: a stable `id`, the quote verbatim, the language it was written in, the recommender's name, their title and company at the time of writing, and the permalink to the recommendation on LinkedIn. `check-terms` and `check-content` pass.

**Closed 2026-09-02.** All three recommendations are transcribed in both locales, each carrying a stable `id`, the quote verbatim, the language it was written in, the recommender's name, their title and company, and a link to the recommendations on LinkedIn. Each also carries an `excerpt` — the card copy, verbatim with every cut marked `[…]`, which `TASK 113` proves against the full quote at build time.

**Two stated residuals, neither of which reaches a reader** (`P-19`). `title: "Recomendations"` in the English file is misspelled, in a key nothing renders. And the first NICE recommendation reads `Al-assisted` where LinkedIn has `AI-assisted` — a transcription slip inside a verbatim quote, in the archived full text rather than in the excerpt, so no page shows it. Both are the author's to fix and neither justifies an open item.

**A third residual is a design preference, not a defect:** the author asked for the two short cards side by side above the long one. The layout gives the full width to the LAST card, and the long recommendation is currently declared second. Moving `solidario-po` after `nice-manager-b` — in both locale files, which the build checks — produces that arrangement.

**The path was corrected on 2026-09-02, from `resources/` to `resources/site/`.** The shape this file copies is `ui.{en,es}.md` — a data file with no route of its own — and that lives with the rest of the site's content rather than beside the `case-studies/`, `diagrams/` and `photos/` directories. The exact frontmatter, key by key, is in `SPEC-TASK-113`; `TASK 113` renders what this produces.

**Constraints**

- **Nothing is invented or paraphrased into existence** (`C-01`, `C-04`). A quote that cannot be copied exactly is a `[NEEDS INPUT]`, not an approximation.
- **The recommenders are third parties.** Their names and public professional titles are fine; anything beyond that — contact details, anything they said privately — is not (`C-06`).
- **Both locales in the same change** (`C-09`). The quotes were written in one language; the other locale carries a translation clearly marked as such, with the original preserved, rather than a silent restatement.
- The design canvas's placeholder cards are updated to the real text once this lands — the canvas is downstream of the content, not the other way round.
- **Four files, not two.** The three interface strings the cards need — the two translation notes and the link label — are chrome and live in `ui.{en,es}.md` under the existing `home:` group (`S-01`). They are in `resources/**` too, so they are this item's to write and not `TASK 113`'s.

---

## TASK 113 — Testimonials column on the home page · `feature` · `DONE`

`TASK 24` shipped the home page with the contact section's second column deliberately empty, because its content did not exist: the comment in `ContactSection.astro` says so, `HOME-006` asserts the block is absent, and the design canvas still carries three `[NEEDS INPUT]` cards. `TASK 19` produces that content. This item renders it.

**Closed 2026-09-02**, `node scripts/gate.mjs --profile full` — **GATE PASSED, 22 of 22 steps**, mutation and the visual-capture matrix included. `SPEC-TASK-113` at `version` 1.1, `approved_version` 1.1, `status: shipped`.

**A stated residual, not a work item** (`P-19`). The `pages` loader glob in `site/src/content.config.ts` excludes non-page data files **by name** — it now reads `!(ui|testimonials|stack)`, a third name added by `TASK 114` four hours after the second. It is the roster-versus-property shape (`P-13`), and this item fixed the half it could: the readers now derive pages from the declared `type` via `readPageEntries`. The loader half cannot be fixed the same way, because Astro's `glob()` matches filenames and never sees frontmatter. What is left is a one-line edit each time a data file joins that directory, paid by whoever adds it, and the failure is loud and immediate — the build names the file. No reader is affected and nobody's throughput is. Opening an item for it would be ratchet upkeep serving neither project goal; recording it is the honest form.

**Goal served (`P-19`):** goal 1, publication. Three recommendations written by other people are the one kind of evidence on this site the author cannot write himself, and today a reader sees none of them. The reader is who notices if this stays open.

**Done:** `/` and `/es/` render one card per testimonial the content declares — quote, name, title, company, a link to the recommendation on LinkedIn, and, on a card whose original language is not the page's, a note naming the language it was translated from. `HOME-006` is inverted to assert exactly that, `node scripts/gate.mjs --profile full` passes, and the canvas placeholders are replaced with the real text.

**Constraints**

- **Blocked on `TASK 19` for the content, and on nothing else.** The collection, the core module, the component and the inverted test are all writable before a single quote exists; only the visual diff and the canvas replacement need the real words.
- **A section is omitted when its content is absent.** Zero renderable testimonials means no column and no empty grid cell — the form keeps its own measure. An entry whose quote is still `[NEEDS INPUT]` is one of the absent ones: it is skipped, and the marker never reaches a page.
- **The cross-locale join is the `id`.** Both locale files declare the same ids in the same order, and a translated entry carries its original verbatim — asserted in `site/lib/content/`, not in the collection schema, so the rule sits on the surface `node:test` runs and Stryker mutates (`T-01`).
- **Nothing invents a string.** The translation notes and the link label come from `ui.{en,es}.md` (`S-01`); the separator between title and company is drawn by CSS, the way `.contact-section__link` already draws its own.
- **`site/lib/content/entries/` and `pages/` are both at 6 of 6 files** (`S-03`), so the core module opens `site/lib/content/testimonials/`. That is a context, not an overflow folder.

---

## TASK 114 — The home stack strip as a curated list, with marks · `feature` · `DONE`

The strip renders `listStack(lang)`, which is the deduplicated union of every case study's `stack:` frontmatter. That array is not a technology list — it is what a reader of *that article* needs to know about *that project*, so it legitimately carries standards (`BIAN`), notations (`C4 model`), practices (`batched stored procedures`) and hardware categories (`biometric terminals`). Aggregated under a heading that says **Technologies I've worked with**, half the strip contradicts its own title. The design had already decided otherwise on both counts: `Main.dc.html:230-232` declares a `.mark.has-logo` box the live page never fills, and the artboard's own chip list was curated rather than derived — 15 items including `Polly` and `BFF`, which appear in no case study at all.

**Goal served (`P-19`):** goal 1, publication. The strip is the second thing a reader's eye lands on below the hero and the one place the site states its technical range at a glance. Today it states it wrongly, in a section whose own title contradicts a third of its contents. A reader skimming for a stack match is who notices.

**Done:** `/` and `/es/` render the strip from `resources/site/stack.{en,es}.md` and nothing else — one chip per declared entry, in declared order, each with an inlined monochrome mark following the theme where the entry declares one and the designed dot where it does not. `listCaseStudyStackForLang` is deleted rather than orphaned, the case-study mastheads still carry the standards and practices that left the home page, `STACK-001` asserts the count from the content files, and `node scripts/gate.mjs --profile full` passes.

**CLOSED 2026-09-02.** `node scripts/gate.mjs --profile full` — `GATE PASSED (profile: full)`, 22 of 22. Both index routes render 13 chips from the pair and nothing from any case study; `listCaseStudyStackForLang` and its four tests are gone.

**The anti-regression assertion was proven in red rather than assumed.** Planting one undeclared chip named `BIAN` — the exact shape of the old aggregate leaking back — failed `STACK-001` in both locales at `Expected: 13, Received: 14`. Reverted, green again.

**Two decisions came from measurement, not from judgement, and both were the opposite of what was assumed at planning.** The Simple Icons index holds **no Amazon or AWS mark at all** while `.NET` survives — checked against the real 3,457-slug index after an unverified claim in the plan said roughly the reverse. And `.NET` and `iOS` are **wordmarks**, measured with `getBBox()` at 24x8.94 and 24x11.9, which is 6.7px and 8.9px tall inside the 18px box beside a 13px name saying the same word. Independently, AWS permits its marks *"in plain text only (no logos)"* and forbids recolouring, and Microsoft forbids third-party logo use *"in any manner"* — so the dot is the correct render for those entries rather than a missing asset, and the spec says so where a later session will read it.

**The mutation gaps were the real finding.** `stack.mjs` first scored 81% with 15 survivors, and every one named a test that proved less than it looked like it proved — two assertions passing because their regex matched a *different* finding, one direction of the cross-locale check untested, four of five paint keywords never asserted. Now 100%: 102 killed, zero survivors, zero uncovered, one suppression carrying its reason. The repository re-measured **80.11%** and the floor is ratcheted 77.0 -> 79.0 (`T-03`, `G-11`).

**The content landed and the item has no residual.** The author curated twice — first dropping the two wordmarks, then adding JavaScript, TypeScript, Node.js, MongoDB and MySQL, all five measured as symbols before being handed over. **18 chips, 14 marks, 4 dots**, and the four dots are exactly the four whose owners publish plain-text-only terms: `.NET`, `iOS`, `SQL Server`, `AWS`. Each round cost one edit in a file the author owns, with the build refusing every way of getting it wrong — a `file:` with no asset behind it, an asset nothing references, a locale that disagrees. That property, not the strip, is what this item was for. The three home artboards are regenerated from the content file rather than retyped, so the design record cannot drift from the page by hand (`P-07`).

**Constraints**

- **Blocked on the author for the content, and on nothing else.** `resources/site/stack.{en,es}.md` and every SVG under `resources/logos/stack/` are in `resources/**` (`H-02`). The collection, the core module, the gateway and the component are all writable before a single entry exists; only the visual diff needs the real list. Same shape as `TASK 113`'s block on `TASK 19`.
- **The heading is not reworded.** `home.stack_heading` stays as both locales carry it today; the fix is the list becoming true, not the title becoming vague enough to cover it.
- **`resources/logos/stack/`, not `resources/logos/`.** A second logo consumer already exists, built and empty: `EmploymentEntry.astro:36-37` renders an employer logo from the `logo` key of each role. The two families differ in consumer, render mechanism, colour rule and namespace, and the publication-boundary check runs asset → reference — so one flat folder would force it to carry a roster to tell them apart (`P-13`). `employers/` is created empty and named now, so the first employer logo does not land in the stack folder because that is where logos went.
- **The cross-locale join is the `id`.** Both locale files declare the same ids in the same order, asserted in `site/lib/content/stack/` rather than in the collection schema, so the rule sits on the surface `node:test` runs and Stryker mutates (`T-01`). Most `name` values are identical in both locales; the pair exists because `C-09` is a hard rule and `singleLocale` is deliberately empty.
- **A mark is decorative, never a string.** The technology's name is rendered beside it, so the mark carries `aria-hidden` and no `alt` — nothing here needs a string outside `resources/**` (`S-01`).
- **`C-06` carries forward from the artboard verbatim:** no named security vendor gets a mark here. No identity provider, no liveness or fraud tooling, no OTP provider. Not as a logo and not as a label.
- **`site/src/components/home/` is at 6 of 6 files** (`S-03`), so this item adds none there — the mark is a variant of the existing `.stack-strip__mark` span, not a new component. The core module opens `site/lib/content/stack/`.

---

## TASK 9 — Harness export v2 · `harness` · `DONE`

**Two portable bootstraps, one per agent tool**, under `docs/harness/export/`: each installs this harness on another project, and each carries the method for comparing it against a harness already there. **Amended 2026-09-04 — the entry named one file, `export-harness-v2.md`.** The author runs Claude Code on one target project and OpenCode on the other, and the control plane is the half that cannot be written once for both: it is what decides whether a rule is a boundary or a preference (`G-03`), and the two tools deny by different mechanisms. So the two documents share a **byte-identical core** and differ only where the tool does, with `check-export` failing a core that has drifted rather than a human being expected to notice.

**Goal served:** goal 2 — a harness good enough to export to the author's other projects. This is that goal's own deliverable, not an item adjacent to it (`P-19`).

**Written from the harness, not from this plan** — and only after the harness has driven real work (TASK 8's first items) and been scored at least once. The point of an export is to carry what worked, not what was designed. Writing it earlier would export a hypothesis.

**Trigger:** the first `EVAL` with a real, non-harness workload.

**Waived at A3 on 2026-09-04, by the author (`G-01`).** Recorded rather than assumed: an unrecorded deviation is indistinguishable from a violation when an evaluator reads this later. Why it does not contradict the paragraph above — **installing the harness on the two target projects *is* the workload `TASK 100` names**, so the export is the vehicle by which this trigger can fire rather than an advance on it. The export ships marked **v1**, says so on its own first screen, and what the two installs teach comes back as an amendment carrying a measured origin.

**Done:** two bootstraps and their index exist under `docs/harness/export/`; each is self-contained, so a reader needs nothing from this repository, which may be deleted; their shared cores are byte-identical and a gate step fails when they are not; **every full-profile gate step passes except one that was already failing at `HEAD` before this item began, and that one is tracked**.

**Closed 2026-09-04, by the author.** Three files under `docs/harness/export/`: an index and two bootstraps, one per agent tool, sharing a byte-identical 1,005-line core. `check-export` is gate step 11 and was proven in red against the real files — a planted single-byte drift reported the file, the byte offset, the line and the differing text on both sides. The full-profile gate passes 22 of 23 steps with none deferred; the one failure is `design canvas`, red at `HEAD` before this item began and tracked as `TASK 119`. The mutation surface rose to 80.31% as `export-parity.mjs` entered it, and the floor was deliberately left at 79.0 with the reason recorded in `T-03`.

**What this item did NOT do, stated so the next reader does not assume it** (`C-02`): it produced documents that *describe* an installation. It did not perform one. The harness has still never been measured on a codebase it did not build, which is `TASK 100` — and the hand-off packet for it is `progress/handoff/2026-09-04-task100.md`. The export is marked **v1** on its own first screen for exactly this reason.

**That last clause is an amendment made the same day it was written, and it is visible rather than quiet.** The first version read *"the full-profile gate passes"*, which made this item hostage to `TASK 119` — a canvas-deriver defect with nothing to do with the export, red on the committed tree before this work started. One work item is one deliverable (`P-01`), and a `Done` that cannot be met without fixing somebody else's defect is a `Done` written wrong. **What is NOT being done here is lowering the bar to fit the result** (`P-03`): the gate is reported `partial` in the work log, with the failing step named and its id, not `passed`.

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

## TASK 18 — Trace redaction false-positives on opaque IDs · `bugfix` · `DONE` — closed inside `TASK 12`

`INC-15` (`docs/harness/architecture.md` §C). `check-trace`'s whole-file redaction scan (`validateTrace` in `scripts/guards/lib/evidence.mjs`) substring-matches every `private/banned-terms.txt` entry against the **entire serialized trace line**, including fields that are never authored content — `tool_use_id`, `run_id`, `parent_run_id` are opaque, API-generated random tokens. A 4-character banned term coincidentally appeared inside a `tool_use_id` during a `researcher` run this session, failing the gate on a true string match that carries zero actual confidentiality risk.

**The check's whole-file design is correct and should not be narrowed carelessly** — its whole point is catching a leak by a route nobody wrote a specific redactor for (`docs/harness/architecture.md`, INC-15's row). The fix is precise, not a general loosening: exclude the known-opaque, system-generated fields from the scan by name, and keep every content-bearing field (tool inputs, results, targets, messages) covered exactly as today.

**Done:** `validateTrace` (or its caller) excludes `tool_use_id`, `run_id` and `parent_run_id` from redaction scanning by field name — never by a blanket "looks like an ID" heuristic, which would quietly widen the exclusion over time — with a red test proving a banned term inside one of those three fields no longer fails the check, and a red test proving a banned term in any other field (e.g. a tool `target` or a future content field) still does.

**Constraints**

- Do not touch `redactToolInput`'s own scrubbing (`scripts/guards/lib/evidence.mjs`) — that's a separate, working mechanism for a different purpose (masking known-sensitive input fields at write time), not the one that flagged this.
- This incident's affected trace file (`evidence/runs/9a066423-fbac-4ece-8677-6d0ac7fce237/researcher-a0400b23ffcda81af.jsonl`) was hand-edited by the human to remove the leaked lines, which broke `seq` continuity — a second, expected finding from the same guard, working correctly. That file should be deleted outright (evidence is gitignored, uncommitted, disposable) rather than hand-patched to restore density; not this task's job to fix, since evidence/ is `H-03`-protected from every agent, including this one.
- **Merged 2026-08-27 into `TASK 12`'s closing item**, as slice two of three. Same file, same function neighbourhood (`validateTrace`), and the fix is unchanged from what this entry specifies: exclude `tool_use_id`, `run_id` and `parent_run_id` **by field name**, scan a projection of each parsed event, and scan any line that fails to parse **whole and raw**, so a malformed line cannot become a redaction blind spot. `redactToolInput` is not touched, exactly as the constraint above requires. The affected trace file named above has since been pruned by retention, so the corpus currently reports **no** redaction findings — which means the red test must be a fixture, not that file.

---

## TASK 59 — A malformed term list silently disabled write-time scrubbing, and the trace kept the result · `bugfix` · `DONE`

Opened 2026-08-27 by `TASK 12`'s slice 3, from the gate rather than from memory. `check-trace` reports a **real redaction failure** in `evidence/runs/e2b37e26-b3b5-4c21-af9e-9f0fbd45234f/orchestrator.jsonl`: a banned term sits in the `target.command` of a `tool.requested` event, in a 233-character shell command, written at `2026-08-25T15:40:31Z`.

**It is `TASK 45`'s defect with a second victim nobody named.** That item found that a `\b <term> \b` line in the term list was being read as one literal term, escaped, and matched against nothing — while `check-terms` still reported PASS. The half that got recorded was the **check** protecting nothing. The half that did not is that `redactToolInput` scrubs through the same `mask()`, so for the whole window that the list was malformed **the trace writer was also protecting nothing**, silently, for that term.

The fix landed in `a45bbec` the same day, and `mask()` blanks the term correctly today — verified, not assumed. So the writer is sound and this is a historical artifact. What is not resolved is the shape.

**Why this is an item and not a note.** A check that fails is loud. A **redactor** that silently stops redacting writes the leak to disk, where `H-03` means no agent can ever remove it, and the only signal is a validator noticing months later. `G-13` already says a guard that cannot evaluate must deny; the write-time scrubber has no equivalent, because a hook that refuses to write is a lost measurement rather than a blocked action. That tension is the item's actual question, and it should be answered rather than assumed away.

**Done:** either the write-time scrubber fails loudly when its own term list is malformed — with a red path proving a malformed list cannot result in an unscrubbed write — or the reason it deliberately does not is recorded where the next person will find it, with the residual risk named. Plus a note in `docs/harness/evidence.md` that redaction is only as good as the term list parsed at write time, which is currently implied and nowhere stated.

**Constraints**

- **The affected file has been deleted** (2026-08-27, by the human — `H-03`), so `check-trace` is green and the artifact is gone. **The item is not thereby closed:** the artifact was the symptom, and the question — whether a scrubber that cannot parse its own term list should fail loudly or stay quiet — is untouched by removing the file it produced.
- **Do not quote the term** in any finding, test fixture or log, including this entry. The probe that located it printed the field path and the string length and nothing else.

---

**Closed 2026-08-27, the same day it was opened, because the answer was already written in this repository.** `check-terms.mjs` guards its own term list twice and says why in the message text: a missing file means *"a confidentiality check that cannot read its own term list must never report clean"*, and zero terms means *"an empty list makes every scan pass, which is worse than no scan at all."*

**The reading side had both guards. The writing side had neither, and no tests at all.** `loadTerms` returned `[]` for a missing list, never checked for an empty parse, and cached globally on a key of nothing. A checkout where the list went missing would have scrubbed nothing, silently, forever.

**The decision, and it deliberately differs from `check-terms`: discriminate on whether `private/` exists.** Absent means there is nothing in this checkout to protect, so `[]` is correct — which keeps the harness usable on a fresh clone and on `TASK 9`'s export, since `private/` is gitignored and never committed. Present, with its term list missing, empty or unparseable, means the thing being protected exists and the protection does not: **throw, naming which of the three it was.**

The asymmetry is the point and it is stated in the code. `check-terms` is a gate step a human runs, so refusing unconditionally costs one red step. `pretooluse.mjs` is a hook on **every tool call**, so refusing unconditionally would deny every call on a checkout without `private/` and brick the harness. Same principle, different blast radius.

**Both hooks were proven rather than assumed** (`P-14` — a guard seen only to pass has not been tested):

- `pretooluse.mjs` already turned any throw into a `G-13` denial through `main().catch`. It had never been exercised for this cause. It now is, by **spawning the real hook** against a temp root — the harness `INC-12`'s own regression test already built — with two red paths: `private/` present and its list empty denies with exit **2 and specifically not 1**, and a checkout with no `private/` still allows an innocuous call.
- `record-event.mjs` is a recorder and cannot deny; it exits 0 unconditionally because a measurement must never stop the thing it measures. It now catches the throw explicitly, writes **nothing**, and still exits 0 — proven by a test asserting no file appears. Previously a throw killed it with an uncaught stack trace, which wrote nothing either, but by accident rather than by design.

**A latent bug found on the way and fixed with it:** `cachedTerms` was module-level and keyed on nothing, so a second call with a different root returned the first root's terms. One hook is one process with one root, so it had never bitten in production — but it made the four cases untestable in one file, which is its own kind of evidence.

**The second half of this item's done was already discharged** by `TASK 12`'s reconcile pass: `docs/harness/evidence.md` states that redaction is only ever as good as the term list parsed at write time, and names this item.

**The mutation ratchet turned, and it turned because it caught this item first.** The new module landed at **63.22%** and pulled the aggregate 76.07 → **75.89** — the silent fall the floor exists to make visible, arriving inside the item that added the code. Reading the survivors rather than averaging them (`T-03`) separated `D3`'s declared noise class (35 `StringLiteral` mutants emptying ledger prose, now suppressed at the mutant with a written reason) from 34 that mattered: every section guard in `renderLedger`, and **every string in the git argv** — a dropped `--reverse` inverts the direction of every transition the derivation reports, and nothing was asserting it. File 63.22 → **82.64%**; surface 75.89 → **76.55**, re-measured at 76.54. Floor raised **75.5 → 76.0**, which is the upkeep `TASK 63` named as `TASK 65`'s residual rather than a new obligation.

**What is not claimed.** The original incident's artifact is gone and the specific malformation `parseTerms` throws on is covered — but this closes the *silent* failure modes, not every possible one. A term list that parses cleanly and is simply **wrong** — a term nobody added — is not detectable by any mechanism here, and never was. That is the residual risk, and it belongs to whoever maintains the list rather than to the code.

Detail: `progress/2026-08-27-07-task59-write-time-scrubber.md`.
- `TASK 45` is `DONE` and stays `DONE`. This is not a reopening; it is the part of its blast radius that was not looked at.

---

## TASK 60 — Run EVAL-001, the milestone's harness-scoring half · `harness` · `DONE`

**Opened 2026-08-27, reconciling a gap in the milestone's own text.** "The localhost milestone" names two halves — the author judges the site, `harness-evaluator` scores the harness — but only the first half had anything to check it against; the second named an activity, not a work item. `H-05`'s `delegation-gate` denies any write-capable delegation whose brief names no work item (`extractWorkItems` requires at least one `TASK-N` match), and `harness-evaluator` holds `Write` — so a delegation to it needs an id to cite, and none existed. This item is that id.

**Deliverable:** `progress/evaluation-results/EVAL-001-<slug>.md`, following `EVAL-TEMPLATE.md`'s fixed shape, scored against the first real non-harness work — the six site items (`TASK 22`–`TASK 26`, plus the pulled-in bugfixes they opened) — per `EVAL-000`'s own instruction that this is *"the first evaluation with any external validity"*.

**Done:** the scorecard exists, in the template's shape; every `EC-*` case gets `Caught`/`Partial`/`Gap`, cited to a trace event; every KPI names its substrate (`observable`/`self-reported`/`unmeasurable`) rather than presenting one as the other; every `Gap` becomes its own tracked work item (`P-06`); the run's own `permission_mode` and `enforcement_environment` are recorded, per every excluded run's reason.

**Constraints**
- **No type-`feature` or type-`migration` id ever appears in the delegation brief**, even to explain context — `extractWorkItems` scans the whole brief text and `specRequiredFor` would then demand an approved spec for it. Name the site items descriptively (*"the content-layer item"*, *"the two page-template items"*) instead; their facts and findings are read from `TASKS.md` and the trace, not carried by citing an id.
- **This item's own id (`TASK-60`) is the one write-capable delegations to `harness-evaluator` cite** — it is typed `harness`, so `specRequiredFor` does not apply to it and no spec is needed.
- Reads `progress/2026-08-27-12-eval001-trace-index.md` first — a precomputed, reproducible index of every trace file's header/footer/posture and every `policy.decision` deny, built so the 60-turn budget is not spent re-deriving what a targeted `Grep` can verify (`P-09`).
- Score the harness, never the model (`A16`): a pass condition is a guard verdict plus a trace shape, not the absence of bad behavior.

**Closed 2026-08-27.** `progress/evaluation-results/EVAL-001-first-non-harness-work.md` · 5 Caught · 5 Partial · 4 Gap across 14 cases. Its bottom line: *the harness is paying for its rung-1 boundaries and is not yet paying for its gate.* The twelve improvement items it filed become `TASK 61`–`TASK 67` below, plus three referenced rather than duplicated.

---

## The seven items `EVAL-001` opened

Filed 2026-08-27 from `progress/evaluation-results/EVAL-001-first-non-harness-work.md`'s "Improvement work items filed" section. The evaluator wrote twelve; it cannot write this register, so the orchestrator files them (`P-06`). **Twelve became seven, and the two compressions are recorded rather than silent:** four trace-writer defects share one surface and became `TASK 64`, on the precedent `TASK 12` set for exactly this; and three of the twelve are already tracked — the omitted-dimension check is `TASK 14`, which gains its live specimen below rather than a duplicate id, and the CI item is `GAP-12`, blocked on `TASK 30` and already carried by it.

> **Consolidated again 2026-08-27, later the same day**, when the author asked for one or two units of work rather than nine scattered ids. `TASK 62` retired into `TASK 64`; `TASK 68` retired into `TASK 65`; both stay in place carrying pointers, because ids are stable and the scorecard cites them. The survivors are sequenced by **THE HARNESS ECONOMY** milestone below, which also opens `TASK 70`–`TASK 73`. **Three were deliberately not merged:** `TASK 61` is rung 1 and needs its own red battery, `TASK 63` is the eight-escape finding and the largest single outcome item, and `TASK 69` belongs to the site suite rather than the harness. Merging those would recreate `INC-01` — one "done" meaning four things.

## TASK 61 — `path-boundary` denies reads that `H-02` and `H-03` exist to permit · `bugfix` · `DONE`

**Opened 2026-08-27 by `EVAL-001`, which measured it as 44% of the harness's entire denial volume.** `H-02` makes `resources/**` read-only *input*; reading it is the permitted use, and 15 of the 34 post-baseline denials refused a read. Three were read verbatim from the trace and all three are pure reads — `sed -n '1,200p' resources/site/ui.en.md | grep -n "article" -A 40` is the clearest.

**A second instance, on the other boundary, produced while verifying the first:** the orchestrator ran `sed -n '9p' <a trace file>` to check the evaluator's claim against the trace and was denied by `H-03` for *writing* to `evidence/`. A guard that denies the act of auditing it is the same defect on a second boundary, and it was found by the finding.

**Cause, in the guard's own source.** `scripts/guards/lib/path-boundary.mjs:86` puts `sed`, `perl` and `awk` in an `INPLACE` set with the comment *"only dangerous with the relevant flag, but cheap to treat as such"*, and `:113-118` flags **every** non-flag argument of any `MUTATOR` or `INPLACE` head — so `cp <source-in-resources> <dest>` is denied on its source. The denial text records the command name and the target but not the flag, so the trace as written cannot distinguish a prevented write from a refused read.

**Done:** a red battery in `scripts/guards/lib/path-boundary.test.mjs` shows `sed -n '1,200p' resources/site/ui.en.md` **allowed** and `sed -i 's/a/b/' resources/site/ui.en.md` **denied**; write-intent for the `INPLACE` heads is decided by the in-place flag (`-i`, `-i.bak`, `perl -pi`) rather than the executable name; `cp` flags only its destination argument, **`mv` flags both ends** — corrected at the checkpoint: `H-02` forbids "writes, moves **or deletes**", and a move is a delete of its source, so flagging only the destination would have opened a real hole; each assertion fails when its clause is removed (`P-14`).

**The trade-off, stated in both directions (`C-11`).** The current rule is deliberately over-broad and says so, and over-denial is the safe direction for a rung-1 boundary. What `EVAL-001` priced is the other side: 15 false denials teach every delegated agent that the boundary is arbitrary, and a boundary agents learn to route around is worth less than one that is occasionally inconvenient. Fix the precision, not the rung.

**Closed 2026-08-29.** Landed as `WRITES`, a table naming which argument(s) each command writes, replacing the name-based `MUTATORS`/`INPLACE` sets — the property is checked directly (`P-13`) instead of inferred from set membership. Three pure helpers: `inPlaceFlag` (the deciding `-i`/`--in-place`/`--include` token, or `null` — a `null` command contributes no findings at all), `destinationArgs` (`-t`/`--target-directory` value, else the last positional — handling `-t` explicitly, since a naive "last argument" rule would have let `cp -t resources/ /tmp/x.md` through), `ddTargets` (`of=` arguments only; `if=` reads). `how` now carries the deciding reason (`sed -i`, `cp (destination)`, `dd of=`) rather than the bare command name, closing the trace-legibility half of the diagnosis. `pretooluse.mjs` needed no change — it already interpolates `how` into the denial text. **A live rung-1 bypass, found during checkpoint validation and folded in by author decision:** `dd of=resources/x.md` was silently **allowed** — `of=` doesn't start with `-`, so it was flagged as a candidate, but the unstripped `of=` prefix matched no boundary. Now denied. Full case-by-case verification (18 probe cases including anti-regression) and mutation detail in `progress/2026-08-28-08-task61-path-boundary-precision.md`. Two coverage gaps in the new logic, found by inspecting mutation survivors rather than trusting the score (`T-03`), backfilled with tests directly (awk in-place denial; a flag placed after a destination argument): file-local mutation score 75.5% → 79.40%, whole-suite floor unaffected (75.95%, above the 75.5 break). Whole-suite battery 830/830. Two loose ends filed rather than left in prose (`P-06`): `TASK 83`, `TASK 84`.

## TASK 62 — `L` on the delegated path: instrument it, or record that it cannot be · `harness` · `RETIRED`

> **Retired 2026-08-27 into `TASK 64`, clause 5.** Same surface: the hook writers. `instructions.loaded` is written by `record-event.mjs` through `eventsFor`, which is the file `TASK 64`'s other four clauses already open — and two items editing one module is `G-12`'s collision, not two work items. The entry stays here because `EVAL-001`'s scorecard and `progress/2026-08-27-13-task60-eval001.md` both cite this id.
>
> **The substance below is unchanged and still governs**; only the id that closes it moved.

**Opened 2026-08-27 by `EVAL-001`. `GAP-03`, now unactioned across three scorecards.** All 332 `instructions.loaded` events sit in `orchestrator.jsonl` files across 34 traces; **zero** appear in any of the 70 delegated trace files. Verified inside a single directory rather than corpus-wide only: `b4add49b-…/orchestrator.jsonl` carries 19, and its five `implementer` files and one `test-engineer` file carry none.

`EVAL-000` said the harness could not tell an instrumentation gap from `INC-04` running live. `EVAL-001` argues that is no longer the honest framing — delegated agents were themselves denied by guards, and their logs use the rule surface fluently — but that evidence is circumstantial, and the measurement still does not exist. The reportable value is therefore **`unmeasurable`, never 0**: a zero implies a measurement was taken and came back empty.

**Done:** either a delegated (non-orchestrator) trace file on disk carries at least one `instructions.loaded` event, **or** `docs/harness/evidence.md` and `docs/harness/contracts.md` §6 both state that `L` is orchestrator-only and why, `EC-003`'s `required_evidence` line stops demanding an artifact the harness does not produce, and no scorecard reports a delegated `L` figure again. `G-11` requires the honest claim including downward.

## TASK 63 — The paired-predicate assertion reaches every gate step · `harness` · `DONE`

**Opened 2026-08-27 by `EVAL-001`, on the strongest outcome signal in the scorecard.** Eight of its fifteen escaped defects are one failure mode — **a check reported PASS while doing nothing** — and the gate caught none of them: `TASK 34`, `TASK 39`, `TASK 42`, `TASK 48`, `TASK 51`, `TASK 54`, `TASK 57`, `TASK 58`.

`T-02`'s mechanization exists in exactly one place, `scripts/guards/lib/sources.test.mjs:57` (*"the check would catch a planted control byte"*), and was never generalized. This is a content failure of the mechanization, not a compliance failure — `T-02` is loaded on every matching path and `EC-002` has a green control.

**Done:** every step in `scripts/gate.mjs` has a test asserting the step **fails** on a planted defect of its own kind; any step producing an artifact — screenshot, build output, type check — fails rather than reporting PASS when the artifact is absent; each assertion fails when its planted defect is removed. **Residual to fold in while here:** `T-03`'s mutation floor sits at 74.5 against a measured 74.74, so the score may fall 0.24 points in silence — a ratchet permitting a silent fall is `EC-002`'s own shape inside the remedy for `EC-002`.

**Closed 2026-08-28.** Every one of the 20 entries in `scripts/gate.mjs`'s `STEPS` array now carries a `redProof: { file, test }` naming a real test that demonstrates it fails on a planted defect of its own kind — the same `file`+`test` idiom `check-evals` already applies to eval-case proofs, generalized to the gate's own steps. `scripts/guards/lib/gate-steps.mjs`'s `validateSteps` derives every assertion from the step objects themselves (never a hardcoded roster), checked twice: once against synthetic fixtures (the module's own red-path battery) and once against `gate.mjs`'s real, imported `STEPS` array — so a 21st step landing next month with no `redProof` is caught, not silently accepted (proven directly, `P-16`). Thirteen already-covered `check-*.mjs` steps got their existing lib batteries wired in; `guard tests`/`site core tests`/`component tests`/`e2e smoke` point at the gate-runner's own zero-tests-ran mechanism, widened this session to recognize Vitest's and Playwright's real summary shapes (previously only `node:test`'s); `type check` and `mutation` point at the structural cmd-path proof, per the author's explicit call to prove this repository's wiring rather than re-testing a vendor's type checker.

**The design canvas got its own split, reshaped from the original plan during the author's review** (`docs/design/canvas/verify.mjs` carried zero test coverage of any kind — outside both the guard-test glob and Stryker's mutate glob). Of its 7 checks, 5 derive from the artifact and are relocated to `scripts/guards/lib/canvas.mjs` with a battery; the other 2 hardcode literals specific to the *current* design version (breakpoints, class names, copy vocabulary) and would have locked that version in as a hidden test dependency if battery-tested as-is — a future redesign would then fail the gate because the design changed, not because anything broke. Those literals moved into a declared `canvas` key in `guards.config.json` instead, with the guard's failure message naming the exact config path to fix. Every structural check now also strips HTML comments before scanning, so commenting out a section while iterating no longer trips the gate.

**Wiring the real `redProof` values in caught four live bugs immediately** — none of which any single slice's own battery could have found, since each slice tested only its own proof file in isolation: a glob pattern (`scripts/guards/**/*.test.mjs`) misread by the cmd-path check as a missing binary; `guard tests` genuinely had no `skipNote` for its `skipIf`; the integration test's own `io` was double-joining already-absolute `cwd`/`cmd` paths; and three proof-file matches needed a literal backslash present in the target source (a test name written as a single-quoted string with an escaped apostrophe is matched against raw source text, not an evaluated string). Full findings and fixes in `progress/2026-08-28-07-task63-paired-predicate-gate-steps.md`.

**The mutation-floor residual folded in as planned**, re-measured rather than assumed: `74.5 -> 75.5` against a closing-run score of `76.07%` (6,800 mutants: 5,098 killed, 72 timed out, 1,376 survived, 250 with no coverage, 4 errors) — the surface grew by `gate-steps.mjs` and `canvas.mjs`, both well-killed by their own batteries. `EC-002` reconciled to `outcome: Caught`, its stale notes (claiming no repo-wide mutation gate existed, when `TASK 15` had already shipped one) corrected in the same pass.

## TASK 64 — Trace fidelity, second pass: the four writer defects `EVAL-001` found · `bugfix` · `DONE`

**Opened 2026-08-27 by `EVAL-001`.** Four separate findings, folded into one item because they share one surface — the hook writers — which is the same reasoning `TASK 12` recorded when it folded six of `EVAL-000`'s gaps. Each clause below is independently checkable, so the fold costs no precision.

1. **Budget exhaustion still leaves no machine-readable mark (`GAP-04`).** No footer in 104 files carries `termination.state: FAILED`; all 106 are `COMPLETE`. Meanwhile **24 delegated trace files carry a header and no footer at all**, every one of them post-baseline — one is the deliberate `budget-probe` red-path run, which is why the scorecard reports 23. `TASK 52` amended `G-06` *upward* to make the footer's absence the signal, at rung 4, checked by nothing. **Done:** either a `run.footer` with `termination.state: FAILED` exists on disk, or `check-trace` reports every delegated trace carrying a header and no footer as a finding and enumerates the current instances.
2. **`GAP-08` recurred six times.** Footer-only trace files with an empty `agent` field: `17db4bf1-…/-a7752c22c8902b6b7.jsonl`, `2b631645-…/-aaa9d96eb5a76d81b.jsonl`, `5a10d8af-…/-a11c2beeef0e2dc4a.jsonl`, `9d06a627-…/-a31b7b600a2b25900.jsonl`, `ff549b41-…/-a45856924a1e6862a.jsonl`, `ff549b41-…/-a5e02d76a2eb61671.jsonl` — plus the baseline's original, seven on disk in total. **Done:** no file under `evidence/runs/` has a footer as its only event, and no event carries `agent: ""`.
3. **A distinct variant: a run that started, reported success, and made no tool call.** `evidence/runs/b6218083-…/unknown-role-aeb35e8a584709486.jsonl` — header at `seq:1` (`agent:"unknown-role"`, `permission_mode:"plan"`), footer at `seq:2` (`COMPLETE/objective_reported`), nothing between. It **has** a header, so it is not `GAP-08`: the writer emitted a placeholder role name rather than failing. **Done:** `check-trace` fails any trace whose `agent` is neither a role file present in `.claude/agents/` nor the reserved `orchestrator`, and the writer records why it could not resolve the agent instead of emitting a placeholder.
4. **`permission_mode` coverage, not mechanism (`GAP-05`, partially closed).** 167 of 176 headers still read `unknown`. The mechanism landed in `TASK 12`'s posture slice and the coverage did not. **Done:** every `run.header` written after this item closes carries a real `permission_mode`, so a scorecard can honour the template's instruction to exclude a `bypassPermissions` run — which today it cannot do for 95% of the corpus.
5. **`L` on the delegated path — absorbed from `TASK 62`, retired 2026-08-27.** All 332 `instructions.loaded` events sit in `orchestrator.jsonl` files; **zero** appear in any of the 70 delegated trace files. The reportable value is `unmeasurable`, never 0 — a zero implies a measurement was taken and came back empty. **Done:** either a delegated (non-orchestrator) trace file on disk carries at least one `instructions.loaded` event, **or** `docs/harness/evidence.md` and `docs/harness/contracts.md` §6 both state that `L` is orchestrator-only and why, `EC-003`'s `required_evidence` line stops demanding an artifact the harness does not produce, and no scorecard reports a delegated `L` figure again (`G-11` requires the honest claim including downward). The full reasoning stays under `TASK 62`.

**A sixth measurement lands here rather than opening a third id**, found 2026-08-27 while prototyping `TASK 70` and belonging to the same writer: **`run.header` carries `model` only on `reason: startup`** — 8 of 139 headers, every `reason: delegated` header `null`. `TASK 70` works around it by joining the header's `agent` to the role file's `model:` frontmatter, which is a derivation and not a record: a dispatch-time model override is invisible to it. **Done:** a delegated `run.header` carries the model that actually ran, or `docs/harness/evidence.md` records that the runtime does not supply it on `SubagentStart` and that the join is the substitute.

**Closed 2026-08-29.** Re-measured against the real corpus before implementing (`P-04`) and two of the register's own claims above did not hold: **clauses 2 and 3 are one defect in two eras, not a distinct variant** — every `unknown-role` file's header is `posturePatch`'s `reason: "observed"` patch, never a real `SubagentStart` header, so "it has a header, so it is not `GAP-08`" was wrong; and clause 3's literal Done (fail any `agent` not matching a role file in `.claude/agents/`) would have failed 5 legitimate `Explore` traces, a runtime built-in with no role file here. Both corrections are recorded in `docs/harness/evidence.md` and this session's log rather than silently fixed.

Shipped, test-first throughout (847 → 852 guard tests):
1. **Clause 1 (unterminated) + clauses 2/3 (headerless, the corrected `GAP-08`):** `headerFooterPresence` (new, `scripts/guards/lib/evidence.mjs`) classifies a delegated trace as unterminated (header, no footer — 25/82) or headerless (footer, no real start header — 10/82, folding both eras). `check-trace` counts and enumerates both, on every run, **never failing** — `H-03` forbids cleaning a single historical instance, and `evidence.md` already records that a permanently-red trace step was twice "fixed" by a human deleting evidence. User-approved at the plan checkpoint over two alternatives (a ratcheted floor; a hard failure).
2. **Clause 3, the writer fix:** `runIdFor` adds `agent_resolution: "missing_agent_type"` to every event of a run it could not resolve — present only on the fallback, absent on a real one, so its presence alone is the signal (`P-13`). This changes what new runs write; it cannot touch the historical instances (`H-03`).
3. **Clause 4:** `extractLastPermissionMode` (new) reads the freshest `permissionMode` off the run's own transcript — verified against a real captured `SubagentStart` payload first (`P-04`): `transcript_path` points at the same shared session file the orchestrator writes to, and the field is stamped only on genuine freeform human turns. `eventsFor`'s posture resolver prefers a real payload value, falls back to the transcript, and never fabricates one; every header now carries `permission_mode_source` (`payload` \| `transcript` \| `unavailable`), including `posturePatch`'s own header.
4. **Clause 5:** `L`'s orchestrator-only scope is now stated in `docs/harness/architecture.md` §K (the canonical location — `contracts.md` already deferred there, so nothing was restated, per `G-10`); `EC-003`'s `required_evidence` line demanding a delegated `instructions.loaded` event is removed, with the correction recorded in the case's own `notes`.
5. **Clause 6:** `summarizeSegment` (`scripts/guards/lib/cost.mjs`) now prefers a segment's own `run.cost.by_model` over the role-file-declared tier, labelling which one via `model_source`. Confirmed live against the real corpus: `implementer` now reports as two rows, `sonnet` (declared, pre-`TASK 77`) and `claude-sonnet-5` (measured).

Gate: 19/20 at time of this entry (the 20th, `procedures`, fails only on this item's own still-open work log, which resolves at `/wrap-up`); full guard suite 852/852. Detail: `progress/2026-08-29-01-task64-trace-fidelity-second-pass.md`.

## TASK 65 — Two gate checkers pass on an artifact they cannot classify · `bugfix` · `DONE`

**Opened 2026-08-27 by `EVAL-001`, which found the live instance.** `EC-014`'s control shipped — `scripts/guards/lib/evidence.mjs:170-183` and `:275-279` thread `opaqueFields` blanked by field name rather than by a "looks opaque" heuristic, with three red tests at `scripts/guards/lib/evidence.test.mjs:182`, `:192`, `:201` — and `TASK 18` is `DONE`. **The case file still reads `proof: none`, `outcome: Gap`, and a `proof_reason` asserting that the fix "is not implemented yet."** `check-evals` passes, because it exempts `proof: none` from every staleness assertion.

This is `INC-07`'s shape — a check that passes forever — inside the checker `contracts.md` §6 built to prevent exactly that. The evaluator scored the case `Caught` from the artifacts and left the file alone, correctly: it never edits what it scores.

**Done, clause 1 — `check-evals`:** `check-evals` fails a case carrying `proof: none` whose `proof_reason` names a work item that `TASKS.md` marks `DONE`; the check fails when that assertion is removed; and `EC-014` carries its real `proof` block (`scripts/guards/lib/evidence.test.mjs`, test `RED: a banned term inside an opaque tool_use_id is not a redaction finding`) with `outcome: Caught`.

**Done, clause 2 — `check-procedures`, absorbed from `TASK 68`, retired 2026-08-27.** The instance: `check-procedures` requires a `done:` block in every `progress/*.md` written after 2026-08-18, and fails on `progress/2026-08-27-13-eval001-workitem-extract.md` — a **generated** artifact, reproducible byte-for-byte from a read-only script, which records no work and finishes nothing. **The three obvious fixes are all wrong and `TASK 68` records why**, so nobody re-derives them: an exclusion roster is `INC-07`'s shape and the guard's own rationale refuses it; moving the file breaks `check-docs` instead, since both the scorecard and `TASK 60`'s log cite its path; and emitting a `done:` block from the generator makes the guard green by making the artifact lie. **Done:** `check-procedures` passes on a `progress/` file that declares itself generated and carries a reproduce command, fails on one that does neither, and still fails a real session log that omits its `done:` block; each assertion fails when its clause is removed (`P-14`); and the marker is a declared property of the file rather than a list of filenames in a config.

**Why one item and not two.** The two clauses share the defect, not the code: a checker deciding what an artifact *is* by a shape it happens to match, rather than by a property the artifact declares. They sit on two modules with two test files, so the fold is wider than `TASK 64`'s — see the note under `TASK 68` for why it holds and where the idiom stops.

**Closed 2026-08-28.** Both clauses shipped as two independent `implementer` slices (disjoint files, no shared object — `G-12`), each test-first. Clause 1: `parseWorkItemStatuses` added to `delegation-gate.mjs` (a shared heading scan behind it and `parseWorkItemTypes`, rather than a second hand-rolled regex — `TASK 74`'s lesson applied preemptively); `validateCases` takes an optional `workItemStatuses` map and flags a `proof: none` case whose `proof_reason` cites a `DONE` work item; `EC-014` now carries its real proof and `outcome: Caught`. Clause 2: `isGeneratedArtifact` and `missingDoneBlockFinding` added to `procedures.mjs`, requiring **both** the `` tool output (`D2`) `` disclosure and a `**Reproduce this file**` command together — proven in red that either alone is not enough (`P-14`). `progress/2026-08-27-13-eval001-workitem-extract.md` needed no edit: it already carried both signals, and the guard now reads them. `docs/harness/contracts.md` §5 and §6 gained one paragraph each. `node scripts/guards/gate/check-evals.mjs` and `check-procedures.mjs` both pass; `node --test "scripts/guards/**/*.test.mjs"` is green (124 new/changed-file tests re-verified directly, no regressions).

## TASK 66 — Record work-item status transitions, so `K2` has a substrate · `harness` · `DONE`

**Opened 2026-08-27 by `EVAL-001`, which had to report `K2` as `unmeasurable` where the baseline reported 2.** Nothing in this repository records a status transition: `TASKS.md` carries current status only, and the trace carries tool calls, not register states. The evaluator observed 0 reopens and could not distinguish that from 0 recorded — and **declined to report 2 → 0 as an improvement**, which is the right call and also the reason the metric is now worth less than it was.

**Done:** a status change in `TASKS.md` away from `DONE` leaves a dated, greppable line a scorecard can read without interpretation, and the next evaluation reports `K2` with substrate `observable` rather than `unmeasurable`.

**Closed 2026-08-29.** The transitions are **derived from the register's own committed history** — one status map per revision of `TASKS.md`, diffed consecutively — rather than written by hand. That is what makes them `observable` by the scorecard's own definition (*read from an artifact the scored entity does not author*): `H-01` denies every agent a git write at rung 1. It also needed no backfill, and it cannot be silently omitted the way a convention can. What git cannot say is **why** "done" meant two different things, which is the whole of `K2`, so a transition away from `DONE` carries a hand-written `**Reopened <date>**` line and `check-status-history` — the gate's new step — fails when the derived history and the declarations disagree **in either direction**.

**The real corpus, measured:** 31 committed revisions, **43 transitions**, **0 unparseable**, **0 vanished**, **`left_done` = 0**. No work item has ever left `DONE`, so `K2 = 0` is now a measurement over the project's whole recorded lifetime rather than an absence of data. `scripts/status-history.mjs` writes the ledger `harness-evaluator` reads — it holds no `Bash` and cannot derive it — generated at the moment of use rather than committed, because a committed ledger oscillates: the commit that records a status change is itself the event the file then lacks.

**Three findings from validating against real state, none of them predicted by the entry.** `parseWorkItemStatuses` **could not read the register's first six revisions** — `registerVocabulary` demanded a `Status values:` line *and* a `type` table, and the table did not exist until 2026-08-19, so the derivation would have been blind over exactly the era `EVAL-000`'s baseline of 2 came from; the two vocabularies are now read separately, each keeping its own `G-13` throw. `P-16`'s question — *what breaks when the register's own vocabulary moves next month?* — turned out not to answer "nothing": dropping a token from `Status values:` unclassifies every entry using it at once, which folded together with deletion would have read as forty work items being **deleted**; `vanished` and `unclassified` are now separate, distinguished by whether the heading survives, which needs no vocabulary to read and so stays correct exactly when the vocabulary is what broke. And **the first neutering pass found a hole in this item's own tests** — deleting the missing-declaration branch left the battery green, because both branches name the item and the word `Reopened` and the assertions matched only those (`P-14` earning its place).

**What is not claimed.** A **committed** reopen has no real-corpus red path: `H-01` denies an agent the `git commit` a planted fixture needs. The committed half is proven with an injected git runner in the unit battery, the uncommitted half against the real repository — a `DONE` → `TODO` flip with no declaration fails naming the item, passes once declared, and an orphaned declaration fails. And **the second half of this item's `Done` is discharged by `EVAL-002`, not here**: the substrate exists and has not yet been read by an evaluation.

Detail: `progress/2026-08-29-05-task66-k2-substrate.md`.

## TASK 103 — A config file garbage-collects a build cache in every process that loads it · `bugfix` · `DONE`

**Opened and closed 2026-08-31, from `TASK 89`'s investigation rather than from a hypothesis.** `site/astro.config.mjs` swept stale `.astro-*` / `.vite-*` cache directories from its **module body**. A config's module body runs in every process that loads the config — `astro build`, but equally `astro check`, `astro preview`, `vitest run` through `getViteConfig()`, and anything inside a Stryker sandbox, whose `site/node_modules` is a **symlink to the real one**. So a test runner was recursively deleting a build cache.

**Demonstrated, not argued.** Two directories planted in the real `site/node_modules`, then a plain `vitest run`:

```text
before the fix:  .vite-fakekey + .astro-fakekey  →  vitest run   →  BOTH DELETED
after the fix:   .vite-fakekey + .astro-fakekey  →  vitest run   →  both survive
                 .vite-fakekey + .astro-fakekey  →  astro build  →  both collected
```

The third line is as load-bearing as the first: the collector is **scoped, not removed**.

**This is NOT claimed to be `TASK 89`'s mechanism, and that distinction is the point** (`C-02`). It is a real ordering hazard found while investigating one, fixed on its own evidence. `TASK 89` stays open.

**Done:** the sweep moved out of the module body into an `astro:build:start` integration hook, which `getViteConfig()` provably never fires — it runs `runHookConfigSetup` and `runHookConfigDone` and nothing else; the action lives beside its decision in `site/lib/build/pipeline-fingerprint.mjs` as `sweepStaleCacheDirs`, with `readdir`/`remove` injected, best-effort in both directions (an unreadable directory collects nothing; one directory another process holds open does not stop the rest); and `check-site` gains `checkConfigsDeclareRatherThanAct`, so the defect cannot be restored silently.

**The guard's property is about the FILE, not the line** — a config may not reach a mutating filesystem API at all. That needs no brace counting and cannot be walked around with a top-level IIFE. The API list is **inverted**: it names the read-only calls, so an API nobody thought of is a finding by default (`P-13`), and a namespace or default import is a finding on `G-13`'s logic, because nobody can see statically what `fs.*` reaches for. **Proven in red four ways** (`P-14`): the check reporting nothing, the allowlist read as a denylist, a namespace import waved through, and no file treated as a config — 4, 4, 1 and 4 failures respectively, 105 → 107 passing once restored.

**Two coverage gaps in the new code were found by its own mutation run and closed rather than suppressed:** the default `io` — the one production actually uses — was never exercised, because every test injected a double; and an `as`-aliased import was untested, so the finding could have named the alias instead of the real API. Both now have tests.

**`S-08` earned its place on the way through:** the first draft cited this work item's id in comments **inside `site/`**, and `check-site` failed on all three. The citation runs the other way — this entry points at the code.

Detail: `progress/2026-08-31-02-task89-component-tier-cache.md`.

## TASK 104 — Six content questions the bilingual rewrite left open · `content` · `DONE` · **goal 1** · before `TASK 30` publishes

**Opened 2026-08-31 by `TASK 76`, which produced them rather than inherited them.** `TASK 76` matched the English to the rewritten Spanish in substance, which is what it promised. Along the way it found six things the Spanish rewrite left ambiguous or self-contradicting, and **filling any of them with the reading that sounds better would have been `C-01`'s exact failure**, so they were carried out of the item instead of decided inside it.

**Why this serves a goal and is not audit residue (`P-19`).** Two of the six are a published page contradicting itself, in a locale most of the target audience reads, on a page `TASK 30` is about to make public. The other four are `C-04` traceability: a claim whose source nobody can name. The adversary who notices is an interviewer reading the case study.

**Each needs the author, not an agent.** No agent may write `resources/**` (`H-02`), and four of the six are facts only the author holds (`C-04`).

| # | Question | Where | Why it matters |
|---|---|---|---|
| 1 | MassTransit or RabbitMq? | `experience.es.md` keeps `MassTransit`; `mobile-banking-platform.es.md` dropped it and added `RabbitMq`; the Spanish prose names RabbitMQ. `profile-README.md`'s career-wide stack still lists MassTransit **and** Polly | Three files, three answers. English mirrors each file as it stands, so it inherits the disagreement |
| 2 | **A page contradicting itself.** `qr-collections-for-merchants.es.md` says the delegate holds *"un QR genérico de cobro"*, and two paragraphs later the design principle still says *"una única capacidad revocable, de un solo uso"* | Spanish only; the English dropped *single-use* from the principle | `C-02`. The security argument of that section rests on which one is true |
| 3 | **A sentence that reads as unfinished.** *"un enfoque vertical ambicioso en una tecnología que te seduce con slices horizontales"* | `multi-tenant-biometric-attendance.es.md`, end of the modules paragraph | It has **no English counterpart**, deliberately: rendering it meant inventing the missing half (`C-01`). Locale parity is open until it is answered or removed |
| 4 | Does a QR delegate read the transaction history of the QR they generated? | Both locales now say yes; both previously said *no transaction history* | `C-04`. The change was made in the Spanish rewrite and the English followed it |
| 5 | The OTP constraint that was swapped. The Spanish removed *"equipo chico, capacidad de operación limitada"* and added a fraud-exposure constraint, but the *two functions or one service* argument further down still argues from operability | `otp-provider-decoupling.{en,es}.md` | An argument standing on a constraint the page no longer states. Either the constraint returns or the argument is refooted |
| 6 | **A traceability record that went stale in the same change that fixed two others.** `ui.es.md`'s closing note says *"El artboard escribe `EE.&nbsp;UU.` con espacio duro. Acá va con espacio normal, igual que en `home.es.md`"*. `rail.timezone` now reads `EEUU`, with no periods and no space, and `home.es.md` carries no such string at all | `ui.es.md`, last section | `P-07`. Found 2026-08-31 by comparing the applied tree against the packet; the restored clause used the author's own wording, which the note does not describe |

**Two minor ones, recorded so they are decisions rather than oversights, and not blocking. Both closed 2026-09-01, applied by the author:** `profile-README.md`'s `h1` now reads *Luis Octavio Antelo* (was *Luis Antelo*); `ui.es.md`'s `home.standalone_label` now uses a colon where it had a plain hyphen.

**Closed 2026-09-01. All six answered by the author and applied to `resources/**`**, plus a seventh gap this round found and closed in the same packet. Verified against the applied tree, not assumed (`P-11`):

1. **MassTransit or RabbitMq** — reconciled. `profile-README.md`, `mobile-banking-platform.{en,es}.md` and `experience.{en,es}.md` now all carry both.
2. **The generic-vs-single-use contradiction** — gone. Both locales of `qr-collections-for-merchants.*` say *generic* QR, and neither claims *single-use* any more.
3. **The unfinished sentence** — rendered. `multi-tenant-biometric-attendance.es.md`'s full passage now has an English counterpart at `multi-tenant-biometric-attendance.en.md:60`.
4. **Transaction-history read access** — confirmed **yes**, a delegate reads only the history of the QR they generated. Both locales agreed already.
5. **The OTP constraint** — returned. `otp-provider-decoupling.{en,es}.md` both carry the team-capacity bullet, English at line 55.
6. **The stale traceability note** — rewritten, not just the abbreviation it described. `rail.timezone` reads `US` in both locales; `ui.es.md`'s `## Un detalle tipográfico` now states that fact instead of describing a retired `EE.&nbsp;UU.` hard-space decision with no referent left in the file.
7. **Found and closed in the same round, not part of the original six:** the author added `## Despliegue en Nube` to `mobile-banking-platform.es.md` mid-round — a fresh `C-09` gap. Its English counterpart, `## Cloud Deployment`, landed in the same packet, at `mobile-banking-platform.en.md:60`.

Both minor items also closed 2026-09-01 (see above). `check-content` PASS (20 content files, 9 locale pairs, 2 reasoned exemptions) and `check-terms` PASS (33 terms × 456 files, whole repo minus 13 exclusions) on the applied tree.

**Constraint honored throughout:** `H-02`. No agent wrote `resources/**` — every change here was drafted in `progress/handoff/` and applied by the author.

Detail: `progress/2026-08-31-03-task76-english-half.md` and `progress/handoff/2026-08-31-task76-content.md` § *Open questions* for how the six were found; `progress/2026-09-01-01-task104-content-answers.md` and `progress/handoff/2026-09-01-task104-content.md` for how the last three (3, 5, and the traceability note) were closed.

## TASK 105 — A human refusal is invisible in the trace, and looks identical to a call in flight · `bugfix` · `TODO` · **goal 2**

**Opened 2026-08-31 from `TASK 76`'s wrap-up measurement (`P-12`), not from a hypothesis.** The session offered a natural experiment: the human refused two tool calls, an `ExitPlanMode` at `seq 92` and a `Bash` at `seq 156`. **The trace records no denial for either.**

**What the trace actually holds for a refused call**, read rather than assumed:

```text
tool.requested    seq 92    ExitPlanMode
policy.decision   seq 93    decision: allow    source: guard
(no tool.result)
```

`policy.decision: allow` is correct in isolation: the `PreToolUse` guard did allow it, and the refusal came later, from the human. But the composite record is **`allow` plus no result**, which is byte-for-byte the shape of a call that is still running. This session ended with four such orphans: two refusals and two backgrounded gate runs, indistinguishable from each other in the trace.

**Why it matters more than its size suggests.** `G-02`'s unsafe-action metric is defined as *`tool.requested` carrying a deny decision and no result*, and `docs/harness/evidence.md` builds the whole *attempt versus event* distinction on it. A human saying no is the single most informative refusal the harness can observe, and it is the one the metric cannot see. Worse, `check-trace` reads an orphaned request as delivery loss or truncation, so a refusal is currently miscounted as evidence of a broken trace.

**The machinery exists and is wired, which is what makes this worth an item rather than a feature request.** `.claude/settings.json` registers `PermissionDenied` → `record-event.mjs`, and `scripts/guards/lib/evidence.mjs:644` already emits `policy.decision` with `decision: 'deny'`, `source: 'permission'`. Its own comment scopes it to *"every deny rule in settings.json"*. So the likely answer is that the runtime does not fire `PermissionDenied` for an interactive refusal at all, and the branch has only ever been exercised by rule-based denials.

**First step is a question, not a fix:** does `PermissionDenied` fire for an interactive rejection? Refuse one call deliberately and read the trace. Everything after that depends on the answer, and guessing it wrong costs a wasted implementation.

**Done:** either the trace distinguishes *refused by the human* from *still in flight* on both vectors, with a red-path proof that the new event appears (`P-14`); **or** the runtime is shown not to expose the signal, and that is written into `docs/harness/evidence.md` as a **stated limit** with `G-02`'s metric definition narrowed to match what it can actually count (`G-11`, `G-07`). The second outcome is a legitimate close, not a failure: a metric that names its blind spot is worth more than one that quietly has one.

**Scope guard (`P-19`):** this touches the trace's own claims about itself, which is goal 2's substrate. It is one item. If closing it opens more in the same surface, that surface is generating work and the next act is to bound the claim, not take the next item.

## TASK 89 — The `component tests` step fails at module evaluation, with zero tests collected · `bugfix` · `TODO`

**Worked 2026-08-31 and NOT closed — both candidate mechanisms are refuted, the flake is still unreproduced, and one real defect found on the way was fixed.** Reported `partial` rather than `done`, because this item's `Done` asks for a named mechanism and there is not one.

**Candidate 1, as written, is false on this tree — killed empirically rather than argued.** A bogus `configHash` (`deadbeef`) planted in `site/node_modules/.vite-<key>/deps/_metadata.json` was left **untouched** by a `vitest run`, which passed 15/15; had Vitest read that directory it would have logged the re-optimization and recursively deleted it (`vite/dist/node/chunks/node.js:32164-32175`). A sweep of the whole tree finds exactly two dependency-optimizer caches, both Astro-shaped: **Vitest has none anywhere in this repository.** `resolveOptimizerConfig` disables the optimizer by default and `VitestOptimizer` re-points `cacheDir` to `<cacheDir>/vitest/<sha1(label)>`, which holds no `deps` directory at all.

**Candidate 2 is refuted a second time, independently of the third data point:** a Stryker sandbox symlinks the real `site/node_modules` and carries the current `astro.config.mjs` over a mutated `site/lib`, so it *could* do damage — but nothing inside one loads that config (`grep -rln 'astro/config' site/lib/` is empty, and the tap runner only drives `node --test`).

**The log line was probably never Vitest's, and that is the finding this item most needed.** `scripts/gate.mjs:298` runs every step with `stdio: ['inherit', 'pipe', 'inherit']` — stderr streams live, stdout is captured and flushed only *after* the step ends. So the line following Vitest's summary block is the **first line of the next step**. Verified against a passing run: the Vitest block is followed with no separator by `type check`'s `[content] Syncing content` / `[types] Generated`. That is exactly the slot `[vite] Re-optimizing dependencies…` occupies in both captured reproductions, and `astro check` (mode `development`) shares one `deps` directory with `astro build` (mode `production`) while `process.env.NODE_ENV || config.mode` is one of the four inputs to `getConfigHash`. **The register read an adjacency as a causality** (`P-04`).

**The symptom itself is now named precisely, which the entry never did.** `@vitest/runner` holds a module-scoped `runner` binding assigned by `clearCollectorContext` immediately before each test file is imported, and `describe()` dereferences `runner.config` (`chunk-artifact.js:1643`, `:1734`). Both suites fail on their **first** `describe`. So the mechanism is **two live instances of `@vitest/runner`** — the copy the test file imports is not the copy the collector context was set on — a torn or duplicated module graph, not a cache invalidation.

**Forensic evidence that a re-optimization really did happen on a day the flake fired.** `.vite-<key>/vitest/da39a3ee…` is dated 2026-08-27 while its sibling `deps/` is dated 2026-08-30 — reproduction #2's day — so `deps` alone was removed and rebuilt inside a parent that never was, which is Vite's own `fsp.rm(depsCacheDir)` and not our sweep. The rebuild is **byte-identical in all four hashes** to the 2026-08-27 copy, so the config did not change: it **oscillated away and back**.

**IT REPRODUCED, on the fifth full gate run of 2026-08-31, and that run settles the entry's central claim — against it.** Same signature, both suites, first `describe` of each, `Tests no tests`. Nothing in the tier had changed since the four clean runs before it; the only edits in between were to `TASKS.md` and `progress/`.

```text
   Start at  12:05:20
   Duration  2.16s (transform 554ms, setup 0ms, import 0ms, tests 0ms, environment 3.00s)

12:05:27 [vite] Re-optimizing dependencies because vite config has changed
12:05:28 [content] Syncing content
12:05:28 [types] Generated 1.63s
12:05:28 [check] Getting diagnostics for Astro files in ...
```

**Read the clock.** Vitest started at 12:05:20 and ran 2.16 s, so it was gone by ~12:05:22. The `Re-optimizing` line is stamped **12:05:27** — five seconds later — and the three lines under it are `astro check`'s. **The line belongs to the `type check` step, not to Vitest.** Corroborated on disk: `site/node_modules/.vite-f96b5135/deps` carries mtime **12:05:27** to the second, rewritten with a new `configHash` by that process — the Astro-consumer ping-pong that follows from `getConfigHash` folding in `process.env.NODE_ENV || config.mode`, `astro build` resolving at `production` and `astro check` at `development`.

**So the cache invalidation happens after the failure, in a different process.** The entry's candidate 1 was an adjacency in a log, and the adjacency is now measured at five seconds and one process boundary (`P-04`).

**What the reproduction adds:** `import 0ms` and `tests 0ms` against `transform 554ms` — the modules were transformed and then never really imported, so collection produced nothing at all. Vitest still owned **no** dependency cache at that moment (`.vite-f96b5135/vitest/da39a3ee…/` held `results.json` and nothing else). And re-run alone immediately afterwards it passed **15/15 — in 20.86 s** against a normal 1.5–2 s, everything transformed cold, which is the register's own "passes alone" observation reproduced.

**Six consecutive clean `component tests` runs on 2026-08-31**, including `node scripts/gate.mjs` twice back to back with the second starting seconds after the first exited — repro #2's exact shape. Zero re-optimization lines, zero `TypeError`s. Per `TASK 85`'s own precedent that is **not** a close. And no consumer re-optimizes on this tree at all: `astro build`, `astro check`, `vitest run` and `astro preview` each leave `deps` untouched and print nothing, so the condition cannot currently be recreated by any invocation shape.

**What is left of this item — one question, not two candidates.** *What produces two `@vitest/runner` instances?* The cache story is dead, Stryker is out, and the symptom is named. Roughly one full gate run in seven, on this machine, on a tree whose component tier is not being touched. Detail: `progress/2026-08-31-02-task89-component-tier-cache.md`.


**Opened 2026-08-29 by `TASK 66`'s wrap-up gate run, and unlike `TASK 85` this one has its output captured.** The fourth consecutive gate run of the session failed on `component tests`; the three before it passed, and the same command re-run alone immediately after passed **15/15 in 2.11 s**.

**What was captured, exactly.** Both suites failed **at module evaluation**, not at an assertion — `TypeError: Cannot read properties of undefined (reading 'config')`, pointing at the `describe(...)` line in `site/src/behaviour/scroll-spy.component.test.ts:39` and `theme.component.test.ts:36`, with `Test Files 2 failed (2)` and **`Tests  no tests`**. The next line of the log is Vite's own: `[vite] Re-optimizing dependencies because vite config has changed`.

**It is not this item's doing, and that was checked rather than assumed:** `TASK 66` changed no file under `site/` — the working tree at the time held `.claude/`, `docs/`, `progress/`, `scripts/`, `CLAUDE.md`, `TASKS.md` and `stryker.config.mjs`, and nothing else.

**Two candidate mechanisms, and the item exists to distinguish them rather than to pick one now.** Either Vitest's dependency pre-bundling cache is being invalidated *during* collection, which is what the re-optimizing line reports and what "zero tests collected" is consistent with; or Stryker's sandbox copies of the tree — created and destroyed repeatedly across four gate runs and two standalone mutation runs in the same hour — perturb the config `getViteConfig()` resolves. `T-06` is explicit that intermittent means a real race, a real timing assumption or a real ordering bug, and **zero tests collected is the more alarming half**: a runner that collects nothing and a runner that passes look identical to any check reading only an exit code — except that `TASK 39`'s zero-tests-ran mechanism exists precisely for this, and it is what turned this into a `FAIL` rather than a silent green.

**Done:** the mechanism is named, with the evidence that distinguishes the two candidates; the fix addresses that mechanism rather than adding a retry; and the gate's `component tests` step passes twice consecutively from a cold dependency cache with a mutation run in between. **Adding a retry, or clearing the cache as a build step, is not this item's done** — `T-06` forbids the first, and the second hides the ordering bug rather than fixing it.

**Third data point, 2026-08-31, `TASK 94`'s session — a negative one, and it bears on which candidate mechanism survives.** **Every** `gate.mjs` invocation of one ~2-hour session had `component tests` clean — four of them, and the count is a floor rather than the claim. The first reached the step after `guard tests` failed, so `mutation` was `BLOCKED` and no Stryker sandbox was created; **each of the others ran Stryker to completion immediately beforehand**, 78.57% every time. So a completed mutation run **directly preceding** the step failed to reproduce it, three times over. That is evidence against the Stryker-sandbox candidate and consistent with the first — Vitest's dependency pre-bundling cache being invalidated *during* collection, which is a cache-state condition rather than a neighbour-process one. Not conclusive: the two reproductions both followed a *different* preceding shape (a fourth consecutive run; a second invocation moments after the first), and nothing here reproduced either. Recorded because a negative result that narrows two candidates to one is the evidence this item's `Done` asks for, and it is free.

**Related, not duplicated (`P-06`).** `TASK 69` and `TASK 85` are the same *class* on the **e2e** tier and stay separate: different runner, different tier, and `TASK 85` has no captured repro at all while this one does. If the two turn out to share a root cause, that is a finding for whichever runs second.

**Second data point, 2026-08-30, `TASK 67`'s gate run.** Identical signature: both suites failed at module evaluation with the same `TypeError: Cannot read properties of undefined (reading 'config')` at the same two `describe(...)` lines, `Tests  no tests`, immediately followed by Vite's own `Re-optimizing dependencies because vite config has changed`. This was the *second* `gate.mjs` invocation of that session — the first, run moments earlier over the same working tree, passed `component tests` cleanly. Consistent with the first candidate mechanism in the paragraph above (dependency pre-bundling cache invalidated during collection) rather than the Stryker-sandbox one: no mutation run intervened between the two `gate.mjs` invocations that session, only two ordinary guard runs and two file edits. Not retried past, per `T-06` — the session recorded it here and moved on.

## TASK 88 — A render template lives in the mutation-covered surface · `maintenance` · `DONE`

**Opened 2026-08-29 by `TASK 66`, from its own mutation run rather than from a hypothesis.** `renderLedger` (`scripts/guards/lib/status-history.mjs`) builds the status-history document, and `D3` scoped mutation to *parsing, joining and validating* precisely because **mutating render templates produces equivalent mutants and noise**. The function is a render template that happens to live in `lib/`, so the config's own glob mutates it: `StringLiteral` mutants emptying sentences of prose, plus surviving `CallExpression` mutants that delete a `push` of a prose or blank line. **The counts in the first draft of this entry were estimates and three were wrong** — corrected 2026-08-30 against `reports/mutation/mutation.json` rather than left to be disbelieved (`C-01`'s logic): **27** surviving `CallExpression`, not "~40", plus one `ArrayDeclaration` on `const L = []`; **49** `Ignored`, not 35, because the block directive is wider than one mutator's worth of lines; and the entry did not mention that the file also carried **14 more survivors and 2 uncovered mutants outside `renderLedger`**, which its own `Done` covers.

**Half of it is already handled and the residual is the interesting half.** `StringLiteral` is suppressed at the mutant with a written reason. `CallExpression` is **not**, deliberately: suppressing it across the function would also stop mutating the *data* rows — `` L.push(`- ${t.date} · ${t.id} · ${t.from} → ${t.to}`) `` — which the tests do kill and which are the whole point of the artifact. So a mutator-level suppression buys quiet by giving up real coverage, and a per-line one is forty directives.

**Done:** the rendering half is outside the mutation-covered surface **or** explicitly inside it with a reason, decided rather than defaulted; whichever way it goes, `scripts/guards/lib/status-history.mjs` carries no surviving mutant that a reader would have to re-triage, and the surface's aggregate does not fall.

**Constraints**

- **Do not solve this by lowering the threshold.** `stryker.config.mjs` says an equivalent mutant is excluded at the mutant with a written reason, never by moving the number, and `checkStrykerSuppressions` enforces the reason half.
- **A `!` glob entry naming this one file is a roster** (`P-13`). If the answer is an exclusion, it is a declared *property* — a naming convention that means "this is a render template" — not a filename.
- The same question applies to any future `lib/` module that renders. Decide the shape once.

**Shipped 2026-08-30. The rendering half stays INSIDE the mutation-covered surface**, and `D3` gains the distinction it was missing: a render template's **sentences** are noise, suppressed at the mutant with a written reason; its **shape** is structure, asserted and never suppressed. The reframing the item turned on is that **a blank line in Markdown is not prose, it is syntax** — drop the one between a paragraph and a table and the table stops rendering, and this artifact's reader is `harness-evaluator`, which reads it as a Markdown document. The 27 survived because every assertion on the ledger matched content with `[\s\S]*` and none asked whether the document was well-formed.

`scripts/guards/lib/markdown-shape.mjs` is that missing assertion — four rules over block structure, quoting no sentence, so the ledger's prose stays free to change without touching a test. **Proven by neutering rather than by reading:** all 50 `L.push` calls in `renderLedger` plus the `const L = []` were mutated one at a time and **51 of 51 died**. The 16 outside `renderLedger` were taken one by one: 14 killed by named tests, 2 declared equivalent and suppressed at the mutant with the reason and the run that proves it.

**Final state: `status-history.mjs` carries 236 killed, 55 ignored, zero survivors and zero uncovered.** Surface re-measured **77.58%** (was 76.55); floor ratcheted 76.0 → 77.0.

**The new module's own first run is the finding worth carrying forward.** It entered the surface at 89% with **41 survivors of its own** — a checker built to catch untested code, itself untested. Reading them instead of suppressing them removed a `kind` field that was written and never read, an `isHeading` classifier that was not load-bearing, and three redundant guards whose mutants were unkillable *because* they were redundant. It now reads **100%, with no suppression at all**.

**Two alternatives priced and declined**, recorded so nobody re-derives them: a golden-file snapshot (kills everything in one assertion, but every prose edit then regenerates the fixture, and an artifact regenerated by reflex is a control that stops being read); and excluding render templates by a `*.render.mjs` convention (a declared property, not a roster — but it discards the 49 mutants `renderLedger` already kills, and would have *raised* the number to 76.69 by deleting the evidence rather than the defect).

Detail: `progress/2026-08-30-02-task88-mutation-surface-shape.md`.

## TASK 67 — `harness-evaluator`'s budget is conditional, and the role file does not say so · `documentation` · `DONE`

**Opened 2026-08-27 by `EVAL-001`, closing `GAP-13` with a measurement.** The run consumed ~37 of 60 turns including two whole-file writes — but **only because both corpora were precomputed**. The role file records the 20 → 60 raise and not the condition, so the next brief that hands it raw corpora will read 60 as sufficient when the measurement says nothing of the kind.

**Done:** `.claude/agents/harness-evaluator.md` states the observed cost (~37 turns, with both corpora precomputed) and that a brief handing over raw corpora is a different budget, citing `TASK 55`'s measurement — 0 of 3 slices cut when briefed with an extract, 1 of 1 cut at ~100k tokens when told to go read the sources.

**Referenced, not duplicated (`P-06`).** Three of the evaluator's twelve are already tracked: the omitted-dimension check is `TASK 14`; the CI result is `GAP-12`, blocked on `TASK 30`; and `EC-013`'s case-folding residual is `TASK 11`.

**Shipped 2026-08-30.** The role file now carries a paragraph immediately after the budget paragraph, stating the precomputed-corpora condition and generalizing it to "every corpus the brief names" — `TASK 66`, closed the session before, had already added a third bootstrap corpus (the status-history ledger) that the original "both" wording no longer covered. Gate **21/21, exit 0**; mutation 76.56% against the 76.0 floor. `progress/2026-08-30-01-task67-conditional-budget.md`.

## TASK 68 — `check-procedures` cannot tell a work log from generated tool output · `bugfix` · `RETIRED`

> **Retired 2026-08-27 into `TASK 65`, clause 2.** Both are gate checkers that pass — or fail — on an artifact they cannot classify, and both fixes are the same move: derive the property from the artifact instead of exempting a shape (`P-13`).
>
> **This fold is wider than `TASK 64`'s and the difference is recorded rather than glossed.** `TASK 64` folded four defects on **one** surface, the hook writers, and `TASK 12` set that precedent. This one spans **two** guard modules — `check-evals`/`evals.mjs` and `check-procedures`/`procedures.mjs` — with two test files, so it is a fold on a shared *property*, not a shared file. It holds because each clause is independently checkable and neither can be closed by the other; it is the boundary of the idiom, and a third checker joining would be `INC-01` (one "done" meaning several things) rather than a further saving.
>
> **The substance below is unchanged and still governs**; only the id that closes it moved. **The `procedures` gate step stayed red for `progress/2026-08-27-13-eval001-workitem-extract.md` until `TASK 65` shipped, 2026-08-28** — every item that closed in the meantime declared that in its `done:` block rather than letting a red step become background noise, which is `TASK 34`'s lesson.

**Opened 2026-08-27 by `TASK 60`, which produced the instance while running.** `check-procedures` requires a `done:` block in every `progress/*.md` written after 2026-08-18, and it now fails on `progress/2026-08-27-13-eval001-workitem-extract.md` — a **generated** artifact, reproducible byte-for-byte from a read-only script, which records no work and finishes nothing. A done block on it would be a machine-written claim that a work item completed, which is ceremony in the one register that must not contain any.

**Why the obvious fixes are all wrong**, so the next session does not re-derive them:

- **An exclusion roster is refused by the guard's own rationale**, in writing, as `INC-07`'s shape. That refusal is correct and should not be reversed.
- **Moving the file out of `progress/` trades one red step for another.** Both the scorecard and this item's log cite its path; `progress/evaluation-results/` is a `docs` root, so the citation must resolve, and moving the file breaks `check-docs` instead.
- **Emitting a `done:` block from the generator** makes the guard green by making the artifact lie.

**The shape of the real fix, per `P-13`: derive the property, do not list the files.** A generated artifact can declare itself — the two extracts already carry a reproduce command and a "this is tool output (`D2`), not a scorecard" header — so the marker exists in substance and needs only to become machine-readable, and the guard needs to require a `done:` block of everything that does **not** carry it.

**Done:** `check-procedures` passes on a `progress/` file that declares itself generated and carries a reproduce command, fails on one that does neither, and still fails a real session log that omits its `done:` block; each assertion fails when its clause is removed (`P-14`); and the marker is a declared property of the file rather than a list of filenames in a config.

**Until it shipped, the `procedures` step was red for this one file** and every item closing in the meantime declared that in its `done:` block rather than let a red step become background noise — which is `TASK 34`'s lesson. Shipped as `TASK 65` clause 2, 2026-08-28.

## TASK 69 — An `/about` assertion passes alone and times out under load, on Firefox · `bugfix` · `TODO`

**Opened 2026-08-27 by `TASK 60`'s gate run. This is `TASK 57`'s failure mode recurring after that item closed it**, which makes it an escaped defect against a closed work item rather than a new flake.

**Measured, not inferred.** Under the full suite — 513 tests, three engines — `tests/e2e/about-experience-404.smoke.spec.ts:122` (*"the byline prints its three pairs and reuses the rail location verbatim"*) failed with `page.goto: Test timeout of 30000ms exceeded` navigating to `http://localhost:4321/about`; 308 passed, 204 skipped. Re-run alone on Firefox, the same file's **25 tests all pass in 59.4s**, the byline test among them. It passes in isolation and fails under load: the definition of the class.

**2026-08-31: four runs on one unchanged tree, and the split is total.** Measured during `TASK 76`'s wrap-up, on content that had just been applied to `resources/`, with no change to `site/` at all.

| Run | Context | Result | Wall clock |
|---|---|---|---|
| 1 | inside `node scripts/gate.mjs` | **FAIL**, 1 test, `NS_ERROR_CONNECTION_REFUSED` on `/es/about` | 3.5 min |
| 2 | the suite alone | **309 passed, 0 failed** | 2.5 min |
| 3 | inside `node scripts/gate.mjs` | **FAIL**, **19 tests**, all Firefox, all `Test timeout of 30000ms`, several at `browserContext.newPage` before any navigation | **49.3 min** |
| 4 | the suite alone | **309 passed, 0 failed** | 2.6 min |

**Inside the gate, 0 of 2. Alone, 2 of 2.** Same tree, same commit, same machine, minutes apart.

**Three things this rules out, each checked rather than assumed:**

- **Not the content.** Run 3's failures include `GET /` and `GET /es/`, and several never reached a navigation at all: they timed out *opening a browser page*. A markdown change cannot do that, and the suite passed twice on the same files.
- **Not gate-internal parallelism.** `scripts/gate.mjs` drives every step through `spawnSync`, sequentially. The gate does not compete with itself.
- **Not a fixed timeout being marginally too tight.** A 20x swing in wall clock, 2.5 min against 49.3, is not a budget that needs five more seconds. `TASK 57` already established that raising it closes the symptom and nothing else.

**What run 1 adds on its own:** the error was `NS_ERROR_CONNECTION_REFUSED`, and the line directly above it in the gate output is `Stopped preview server (pid 262964)`. Connection *refused* is not a slow server, it is **no server**, so at least that instance is a teardown racing a worker that still had a test in flight rather than contention.

**Where to look:** what the preceding gate steps leave the machine in. The suite manages its own preview server in `globalSetup`; the open questions are what ends it, and whether teardown waits for every worker or only for the reporter.

**This now blocks more than a green local gate.** `TASK 30` publishes, and `.github/workflows/ci.yml` — then named `harness.yml` — runs the gate. A step that fails 2 of 2 inside the gate and passes 2 of 2 outside it will fail in CI too, in front of whoever the repository is being shown to.

**It is not this item's doing.** `TASK 60` changed no file under `site/` — the working tree at the time held only `TASKS.md` and additions under `progress/`.

`T-06` is explicit that a flake is a finding and that intermittent means a real race, a real timing assumption or a real ordering bug. The timeout is on navigation rather than on an assertion, which points at contention for the single preview server the suite manages in `globalSetup`, not at the byline markup.

**2026-08-31, later the same day: eight controlled reproduction attempts, zero repro — a finding in its own right, not an absence of one.** A faithful repro harness (`scripts/gate.mjs`'s own exported `STEPS` and `scripts/guards/lib/gate.mjs`'s `runGate`, so the invocation is byte-for-byte the production one — same binaries, same cwd, same sequential `spawnSync` semantics) ran `guard tests` → `site core tests` → `component tests` → `type check` → `e2e smoke` seven times, plus one run of the real, unmodified `node scripts/gate.mjs` (all 21 steps) as a tie-breaker. Process/CPU sampling (2s interval, `tasklist` + `Get-CimInstance Win32_Processor`) ran throughout. **All eight `e2e smoke` results: 309 passed, 0 failed.** The unmodified full gate reached `GATE PASSED`, 21/21.

This was not a soft test: attempt 1 alone sustained 85–100% CPU with `firefox.exe` peaking at 71 concurrent processes, and the machine also carries ambient, unrelated background load (`msedge.exe`/`msedgewebview2.exe` processes, present throughout, no relation to this repo's Chromium/Firefox/WebKit-only Playwright config) — genuinely less headroom than a clean run, not more. None of it reproduced the failure. That weakens, without fully retiring, the leading contention-based hypotheses (a Vitest `forks`-pool worker-cleanup lag — version-matched to open upstream issues on the installed 4.1.11 — or general resource contention from the preceding steps): heavier load than either known failure was ever measured under still didn't tip it over.

**The honest reading is that this session could not name the mechanism**, and closing this item requires that, not just clean runs — `TASK 69`'s own `Done` conjoins them. Two things are worth weighing, not resolving unilaterally: first, both real failures happened inside one specific, long (141-minute), file-write-heavy session (`TASK 76`'s wrap-up, 192 tool calls) — a concurrent-activity confound (the author's own editor/IDE indexing freshly-built or freshly-edited files, for instance) that an isolated diagnostic session run with nobody else touching the machine cannot exercise or rule out. Second, and this cuts toward less urgency rather than more: `.github/workflows/ci.yml` runs on a dedicated GitHub Actions runner with no concurrent human or editor activity — structurally closer to this session's clean, isolated conditions (8/8) than to the one session that produced both known failures. That is evidence toward lower CI risk than the original framing assumed, not proof of zero risk.

Full instrumented log: `progress/2026-08-31-04-task69-e2e-contention.md`.

**Done:** unchanged — the mechanism is named — server contention, a fixed 30s navigation budget under parallel load, or an ordering dependency — with the evidence that distinguishes them; the fix addresses that mechanism rather than raising the timeout; and the full three-engine suite passes twice consecutively from a cold build. **Raising the timeout closes the symptom and is not this item's done**, because `TASK 57` already established that this class survives that treatment. **Not met by today's eight clean runs alone** — mechanism-naming is a separate conjunct, unmet, and the item stays `TODO`.

## TASK 75 — `C-09` claims rung 2, and `check-content` only sees the structure · `bugfix` · `TODO`

**Opened 2026-08-27, from a live divergence rather than a hypothesis.** `C-09` states locale parity as *"never modify one locale without modifying the other in the same change"* and claims **rung 2, mechanized by `check-content`**. The check passes on a working tree where `about.es.md` and `experience.es.md` were rewritten and their English counterparts were not — 20 files, 9 locale pairs, PASS.

**What the check actually asserts** is that the pair exists and shares a `slug`. That is the *structural* half. The rung-2 claim covers the whole rule, so the semantic half — the two locales still saying the same thing — is asserted at a rung nothing reaches. `G-11` requires the claim to move when the mechanism does, **including downward**.

**The live specimen, as of this session** (recorded so the item has something to check, not to direct the content — `resources/**` is the author's under `H-02`): `title:` reads *"Luis Octavio Antelo"* in both `.es` pages and *"Luis Antelo"* in both `.en` pages; and the `h1` pairs are now different statements rather than translations of one, in both `about` and `experience`.

**Done:** either `check-content` gains an assertion that fails when one locale of a pair is modified without the other — a `git`-independent property, since the check must work on a clean tree too, so most likely a per-pair content hash or a declared `parity_reviewed` marker — **or** `C-09`'s row is amended to say that rung 2 covers structural pairing only and that semantic parity is rung 4, with the uncovered half named (`G-11`). Whichever is chosen, the specimen above is resolved or explicitly accepted by the author.

**Constraint:** do not "fix" this by editing `resources/**`. That is the author's content and `H-02` denies it; this item owns the *guard*, not the copy.

## TASK 76 — The English half of the Spanish rewrite · `content` · `DONE` · **unblocks `TASK 30`**

> **Closed 2026-08-31, session 03.** All four `Done` criteria met and verified on the applied tree. The author applied the packet (`progress/handoff/2026-08-31-task76-content.md`) across 18 files; the 19th staged file, `mobile-banking-platform.es.md`, carried no changes and is correctly unmodified. Log: `progress/2026-08-31-03-task76-english-half.md`.
>
> | Criterion | Evidence |
> |---|---|
> | 1 · the scale figures settled and consistent | `grep -rn` over `resources/`: **one claim per subject**, each qualified. Total = *millions of people* / *millones de personas* in `about.{en,es}`, `experience.{en,es}`, `profile-README.md`. Active = *more than a million active users* / *más de un millón de usuarios activos* in `mobile-banking-platform.{en,es}`. QR = 100,000 in three months. The surviving *hundreds of thousands* / *cientos de miles* is monthly **OTP operations**, a different subject, paired correctly |
> | 2 · English matching its Spanish in substance, and the two Spanish gaps closed | 19 staged files compared line by line against the applied tree: **one substantive deviation**, the author's own `rail.timezone` wording. The thesis anchor is restored in `experience.es.md`; the US-overlap clause is restored in `ui.es.md` |
> | 3 · the two traceability bodies reconciled | `ui.en.md` and `ui.es.md` provenance sections rewritten to match the values they describe. **A third record went stale in the same act** and is `TASK 104` |
> | 4 · `check-content` and `check-terms` pass | **Both PASS**, which is what this criterion asks. `check-terms` 33 terms × 472 files; `check-content` green inside the gate, twice. **The gate as a whole is 20/21 on this tree**, and the failing step is `e2e smoke`: `TASK 69`, now 0 of 2 inside the gate and 2 of 2 standalone (309 passed each) on this exact content, with one gate run failing 19 Firefox tests at `browserContext.newPage` before any navigation. Not this change, and reported rather than waved through |
>
> **Scope the author added mid-item:** the em-dash `—` left **both** locales. 81 English lines and 24 Spanish at session start; `grep -rc` over `resources/` now returns zero everywhere except `intake.md` (50), which is internal, unpublished, and declared out of scope rather than skipped.
>
> **Five content questions survive this item and are `TASK 104`.** They are the author's to answer, not blockers on the copy: the English matches the Spanish in substance, which is what this item promised.
>
> **Four things in the original entry below are out of date, corrected here rather than edited away:**
>
> **Four things below are now out of date, corrected here rather than edited away:**
>
> 1. **The scale table is superseded.** The author settled it this session: the **total** reads *millions of people* (`about.{en,es}`, `experience.{en,es}`, `profile-README.md`), the **active** figure reads *more than a million active users* (`mobile-banking-platform.{en,es}`, already correct). The register's *hundreds of thousands = active* is retired.
> 2. **The live `C-01` finding below is resolved.** `7c5014c` set `scale: "+1M"` in both locales, so the body and the frontmatter agree. The English's ungrammatical *"more than a million **of** active users"* survived and is fixed in the packet.
> 3. **The divergence reached all five case studies, not two.** `7c5014c` rewrote `otp-provider-decoupling.es.md` (120 lines), `multi-tenant-biometric-attendance.es.md` (75) and `qr-collections-for-merchants.es.md` (59) as well. `check-content` passes on all of it: `TASK 75`'s gap, fifth independent instance.
> 4. **The working tree is not uncommitted.** The author committed as `7c5014c` on 2026-08-31 18:38.
>
> **And one finding the item did not predict: the rewrite changes facts, not only voice.** A delegate now reads the transaction history of the QR they generated (previously *no transaction history*); that QR is *generic* rather than *single-use*, while the design principle two paragraphs later still says single-use; the OTP item swapped its *small team* constraint for a fraud-exposure one while keeping an argument that rests on operability; and phase zero of the migration went from *the only part that determined whether the migration would be correct* to *the part that gave me the confidence*. All four are open questions in the packet, not decisions taken on the author's behalf (`C-01`, `P-17`).
>
> **Scope added by the author this session:** the em-dash `—` leaves **both** locales, on the author's own precedent (they removed it from two subtitles in `7c5014c`). 81 English lines and 24 Spanish at session start; zero in the packet. `resources/site/intake.md` is out of scope and stated as such: 53 occurrences, internal, never published.

**Opened 2026-08-28.** The author rewrote the Spanish across `about`, `experience` and `ui` — new `h1`s, a new voice, expanded stacks, new photo captions, one corrected job title — and the English was not touched in the same change. `C-09` makes that a violation on its face; `TASK 75` is the guard that should have caught it and did not. This item owns the **copy**; `TASK 75` owns the **check**. They are separate because fixing one does not fix the other.

**Why it blocks publication.** `npm test` green is half the localhost milestone; the other half is a site whose two locales say the same thing. Worse than staleness: the English half currently **understates the author's largest system by roughly an order of magnitude**, in the language most of the target audience reads. Publishing now ships a bilingual portfolio that contradicts itself and undersells in the locale that matters most.

### The scale figures — settled first, before any English is written

Four distinct subjects, currently collapsed into one number in three files. Each is true; each needs its own qualifier, propagated to every page that states it (`C-03`).

| Subject | Figure | Source | State today |
|---|---|---|---|
| Bank mobile app — **total users** | **≥2 million** | the author directly, which `C-04` accepts | correct **only** in `experience.es.md:22` (*"utilizada por millones de personas"*) |
| Bank mobile app — **active users** | hundreds of thousands | `mobile-banking-platform.{en,es}.md` — `scale: "+100,000s"`, `scale_caption: "active users"` | **correct and properly qualified.** This file is the model to copy |
| **QR Business module** | 100,000 users in the first three months | `qr-collections-for-merchants.{en,es}.md` | correct in the case study and in `experience.es.md`; **absent from `experience.en.md`** |
| NICE CX platform | millions of users | both locales of `experience` already agree | correct; a **different** system, and must not be conflated with the bank's |

**What changes:** `about.{en,es}.md` and `experience.en.md` say *"hundreds of thousands ... depend on / use"* of the **total**, which is the active-user figure applied to the wrong subject; `profile-README.md` repeats it. `about.es.md` says *"cientos de miles"*, so Spanish currently disagrees with itself between its own two pages. **Settle this before authoring any English**, or the understated number is baked into a second locale.

### The divergence, enumerated as objects (`P-09`)

| File | What diverged |
|---|---|
| `about.en.md` | `h1` · the `me-profile` and `bolivia-landscape` captions (ES gained one, ES rewrote one) · the whole opening section, rewritten from a career summary into a first-person account with a different claim structure · the judgment paragraph · the university paragraph (ES adds *auxiliar en varias materias*) |
| `experience.en.md` | `h1` · `intro` · **all four `stack:` lists** — ES adds elasticSearch/AWS/Jenkins/RAG/LLMs/Snowflake (NICE), Flutter (bank, and drops Polly), PL/SQL/Android/Angular/.NET/low-code/javascript (Mamaya), Angular/.NET/SQL Server/PL/SQL/PLCs (Avícola) · the bank's two body paragraphs collapsed into one that names the QR module, TOTP and RabbitMQ · the Mamaya and Avícola bodies rewritten · one job title: `Analista de Sistemas` → `Trainee → Analista de Sistemas` |
| `ui.en.md` | `home.employers_heading` · `work_heading` · `stack_heading` · `contact_invite` (one question in EN, four in ES) · `contact_note` · `standalone_label` |

**A live `C-01` finding, observed in the working tree at 2026-08-31 12:2x while this item was still open.** The author is editing `mobile-banking-platform.{en,es}.md` and both bodies now read *"more than a million **active** users"* / *"más de un millón de usuarios **activos**"* — while **both frontmatters still carry `scale: "+100.000s"` with `scale_caption: "active users"`**. Three things follow, and none of them is a translation problem:

- **The page contradicts itself, in both locales**, between its frontmatter and its body. Whichever is right, one of them is now wrong on a rendered page.
- **The figure matches neither recorded subject.** This item's own table has **≥2 million = total users** and **hundreds of thousands = active users**, both from the author directly (`C-04`). *"More than a million active"* is a third number, and the table above names this exact file as **the model to copy** precisely because it was the one place where the active figure was correctly qualified.
- The English also reads *"more than a million **of** active users"*.

**Left untouched: `resources/**` is denied to every agent at rung 1 (`H-02`), and this is the author's own in-flight work.** Recorded here so it is not lost, and because settling the four figures *before* authoring any English is already this item's first instruction.

**The object list above is incomplete as of 2026-08-31, and the gap was found rather than predicted.** The working tree carries **two further Spanish-only edits**, uncommitted, in files this item never enumerated:

| File | What diverged | English counterpart |
|---|---|---|
| `resources/case-studies/mobile-banking-platform.es.md` | `subtitle` rewritten (adds *in-house*, *aplicando BIAN*) · `stack` gains Flutter, Android, iOS, Postgres, RabbitMq and drops MassTransit/Polly · `skills` gains `micro-servicios`, `clean-architecture`, `DDD` · body prose reflowed | unchanged — still the old stack, old subtitle |
| `resources/case-studies/legacy-payment-data-migration.es.md` | ~81 lines changed, largely prose | unchanged |

So the rewrite reached the **case studies** as well as `about`/`experience`/`ui`, and this item's slice is larger than its table says. **`check-content` passes on all of it** — verified 2026-08-31, `20 content file(s) · 9 locale pair(s)`, exit 0 — because the parity assertion covers the pair's existence and its universal keys, not `stack`, `skills`, `subtitle` or prose. That is `TASK 75`'s gap, observed on a second, independent instance.

**Two findings inside the divergence that are not "translate this":**

- **`experience.es.md` dropped the thesis anchor.** The English Avícola entry ends *"That gap is the one I have been working in ever since"* — the sentence that ties the first job to the professional thesis (`C-15`). The Spanish replaced it with a different statement and the anchor is gone. Restoring it in Spanish is part of this item, not a separate one.
- **`ui.es.md` `rail.timezone` lost *"· full overlap with US business hours"*,** which English keeps. That clause is a selling point for exactly the roles being targeted, and it is the locale that dropped it, not the one that gained it.

### Two records that became false and must be reconciled (`P-07`)

Both files carry a traceability body asserting where each value came from. The rewrite made those bodies wrong, and a traceability record nobody can trust is worse than none:

- `ui.es.md`'s table claims `home.contact_invite`, `contact_note` and the four headings were lifted from `HomeES.dc.html` *"sin tocar una coma"*. They were rewritten.
- The same body states `home.stack_heading` reads *"Tecnologías con las que trabajé"*. Its own frontmatter now says *"Tecnologías que manejo"*.

**No action needed, checked and recorded so nobody redoes it:** `title:` and `rail.wordmark:` already carry *Luis Octavio Antelo* in **both** locales; the QR figure matches `qr-collections-for-merchants.{en,es}.md` exactly; `Banco Solidario S.A.` was already the `company:` value in both locales, so naming it in prose discloses nothing new and `check-terms` passes.

**Done:**

1. The four scale figures above are settled with their qualifiers and consistent across every page and both locales — verifiable by `grep -rn "millones\|millions\|hundreds of thousands\|cientos de miles" resources/` returning one claim per subject.
2. Each file in the divergence table carries English matching its Spanish in substance, and the two Spanish gaps above (the thesis anchor, the timezone clause) are closed.
3. The two traceability bodies are reconciled with the values they describe.
4. `check-content` and `check-terms` pass.

**Constraints**

- **This is authorship, not translation.** The new Spanish is deliberately colloquial and regional — *peladingo*, *todingos*, *dizque me veo 'pintudo'*, *(yala)*. `C-09` makes the Spanish first-class rather than a translation artifact, and the same holds in reverse. But `C-13` sets English at **B2–C1, plain and direct**, and says flat technical English reads more senior than ornate English. **Do not render the Bolivian register literally.** Match the warmth and the directness; drop the localisms.
- **`H-02`: no agent writes `resources/**`.** The deliverable is the proposed English in a `progress/` file for the author to apply — the precedent `TASK 20` set, where drafted content was applied to frozen `resources/` by the author.
- The expanded `stack:` lists are factual claims about the author's experience. `C-04` requires each to trace to the author or a case study; where one does not, ask rather than assume (`P-17`).

---

# THE HARNESS ECONOMY

**Opened 2026-08-27**, after `EVAL-001` closed and the author named the cost directly: delegated agents burn their budget searching, slices lose their seams, runs die and report success anyway. The milestone exists because nine scattered ids were the wrong unit — this is one arc, and its order encodes **measure → decide → mechanize**. `TASK 9`'s export trigger fired with `EVAL-001`, so everything here feeds the export rather than competing with it.

**Four measurements taken before any of it was designed.** Two kill hypotheses that were on the table, which is why they are recorded here rather than inside an item:

| Question | Measured | What it means |
|---|---|---|
| Do the always-loaded rules cost too much per request? | **276 of 320 lines**, `check-context-budget` PASS | **No.** The static surface is small and already governed |
| Do the per-request hooks cost tokens? | **~200 ms per process, two per tool call**; of that, **~145 ms is bare `node -e ""`** on this machine, imports 10–12 ms, the 31 KB config parse ~2 ms. 4,445 requests ≈ **29.6 min** against 497 min of tool execution | **No tokens — a ~6% latency tax, and 93% of it is Node booting rather than guard code.** Rewriting the guards addresses the other 7% |
| Where do the result bytes go? | orchestrator **4.42 MB / 2,453 calls** · every delegated role together **1.66 MB** | The orchestrator carries **72%** of every byte the harness has pulled into a context window, runs Opus, and `G-09` denies it a role file — so no `model:` governs the most expensive actor |
| Which role finishes what it starts? | Footer rate: `Explore` **5/5** · `researcher` 8/10 · `adversarial-auditor` 3/5 · `harness-evaluator` 4/7 · **`implementer` 21/48** · `test-engineer` 0/3 | "Se marcan como completas sin estarlo", quantified. The **write-capable** roles are the unreliable ones. `G-06` bounds it: a missing footer means the run did not terminate normally, never that a budget caused it |

**The finding that shaped the sequence.** The instinct — *the orchestrator should gather all the context and assemble it* — points at the actor already holding three quarters of the load, and the one whose context must survive the whole session. What worked twice on 2026-08-27 was cheaper: **a deterministic script did the expensive read, wrote an extract to disk, and neither the orchestrator nor the agent ever held the corpus.** 104 trace files and 96 logs became two files, and `harness-evaluator` finished in ~37 of 60 turns. **The context assembler is the script.** `ADR-009` makes that policy rather than a habit.

**No hook registration is removed, and the measurement above is the reason rather than caution.** `PreToolUse` *is* every rung-1 boundary (`H-01`–`H-05`, `G-03`, `G-13`); `PostToolUse` writes the `bytes` and `duration_ms` this whole milestone measures. Cutting the second to save 6% latency would delete the instrument and keep the problem. The other seven events are already free — 139 headers, 64 footers and 350 `instructions.loaded` against 4,445 tool calls.

## Run order

| # | Item | Phase | Blocked by |
|---|---|---|---|
| 0 | `TASK 74` — a title word displaces the work-item type, and `H-05` fails open | **rung 1 — runs first** · `DONE` | — |
| 1 | `TASK 70` — the cost report | measure · `DONE` | — |
| 2 | `TASK 72` — record where the iterations go | measure | — |
| 3 | `TASK 71` — `ADR-009`, delegation economics and the brief contract | decide · `DONE` | `TASK 70` |
| 3b | `TASK 79` — the hand-off packet becomes a documented convention | decide · `DONE` | — |
| 3c | `TASK 77` — the trace records what a run cost, in tokens and wall-clock | measure · `DONE` | — |
| 4 | `TASK 65` — two checkers that cannot classify (absorbs `TASK 68`) | fix · `DONE` | — |
| 5 | `TASK 63` — the paired-predicate assertion reaches every gate step | fix · `DONE` | — |
| 6 | `TASK 61` — `path-boundary` denies reads the rules exist to permit | fix · `DONE` | — |
| 7 | `TASK 64` — trace fidelity, second pass (absorbs `TASK 62`) | fix · `DONE` | — |
| 7b | `TASK 83` — the `'all'`-mode loop's untested trailing-flag shape | fix · `DONE` | `progress/2026-08-29-02-task83-all-mode-trailing-flag.md` |
| 8 | `TASK 66` — a substrate for `K2` | fix · `DONE` | — |
| 9 | `TASK 67` — `harness-evaluator`'s conditional budget | fix · `DONE` | `progress/2026-08-30-01-task67-conditional-budget.md` |
| 9a | `TASK 88` — a render template inside the mutation surface | fix · `DONE` | `progress/2026-08-30-02-task88-mutation-surface-shape.md` |
| — | `TASK 89` — `component tests` collects zero tests and fails | **runner flake, not this milestone** — same class as `TASK 69`/`TASK 85`, one tier over. **Worked 2026-08-31 and left open**: both candidates refuted, flake unreproduced | — |
| 9h | `TASK 103` — a config garbage-collects a build cache in every process that loads it | fix · `DONE` | `progress/2026-08-31-02-task89-component-tier-cache.md` |
| — | `TASK 90` — `isTemplate` matches any filename mentioning templates | **not placed** — a false positive that blocks a green gate, opened by `TASK 88`'s own run. Cheap and self-contained; it earns its slot the next time anyone's log slug would trip it, and `TASK 88`'s rename is recorded as the workaround it is | — |
| 9b | `TASK 84` — `checkBashPaths` has no shell vector for `H-04`'s read boundary | fix · `DONE` | `progress/2026-08-30-03-task84-read-vector.md` |
| — | `TASK 91` — `private/` carries no write boundary at all, on either vector | **not placed** — a loose end from `TASK 84`, opened by it rather than folded in or silently dropped | — |
| 9c | `TASK 92` — a comment-only heredoc marker defeats `commandContexts` entirely | fix · `DONE` | `progress/2026-08-30-04-task92-heredoc-comment-bypass.md` |
| 9d | `TASK 93` — `eval` is recognized as neither a flag-wrapper nor a direct-argument wrapper | fix · `DONE` | `progress/2026-08-30-05-task93-eval-wrapper.md` |
| 9g | `TASK 94` — shell-level expansion is an unexamined residual, not yet a stated one | **goal 1 — credibility** · `DONE` | `progress/2026-08-31-01-task94-shell-expansion-residual.md` |
| 9e | `TASK 95` — a `DIRECT_WRAPPERS` candidate is never itself unwrapped | fix · `DONE` | `progress/2026-08-30-06-task95-direct-wrapper-recursion.md` |
| 9f | `TASK 96` — `env -S`/`--split-string` packs a whole command into one argument | fix · `DONE` | `progress/2026-08-30-07-task96-env-split-string.md` |
| — | `TASK 97` — `sudo -s`/`-i` pass their arguments to a shell, the `env -S` shape elsewhere | `RETIRED` — absorbed by `TASK 94` as a documented limit | `TASK 94` |
| — | `TASK 98` — `powershell -EncodedCommand` carries a base64 command past `EVAL_FLAGS` | `RETIRED` — absorbed by `TASK 94` as a documented limit | `TASK 94` |
| — | `TASK 99` — goal-alignment triage, and the rule that prevents the drift | triage · `DONE` | `progress/2026-08-30-08-task99-goal-alignment-triage.md` |
| — | `TASK 100` — drive the harness on a real, non-harness workload | **goal 2** · unblocks `TASK 9` | — |
| — | `TASK 101` — the repository as the portfolio's public exhibit | **goal 1** · after `TASK 30` | `TASK 30` |
| — | `TASK 102` — every open item declares the goal it serves | **deferred, with a trigger** — `P-19` is one day old | — |
| 10 | `TASK 75` — `C-09` claims rung 2 and `check-content` sees only structure | fix | — |
| — | `TASK 69` — the load-sensitive `/about` e2e | **site suite, not this milestone** | — |
| — | `TASK 76` — the English half of the Spanish rewrite | **site suite** · `DONE` 2026-08-31 · **unblocks `TASK 30`** | `progress/2026-08-31-03-task76-english-half.md` |
| — | `TASK 104` — six content questions the rewrite left open | **goal 1** · opened by `TASK 76` · `DONE` 2026-09-01 | `progress/2026-09-01-01-task104-content-answers.md` |
| — | `TASK 105` — a human refusal is invisible in the trace | **goal 2** · opened by `TASK 76`'s wrap-up measurement (`P-12`) | — |
| 11 | `TASK 78` — cost per completed item becomes computable | mechanize · **after the fix phase** | `TASK 77` |
| 12 | `TASK 73` — the brief contract becomes a guard | mechanize | `TASK 71` · **runs after the site is published** |

**Reordered 2026-08-28 by the author.** The fix phase now runs `65 → 63` first and everything else after, because those two are what make the rest verifiable: `TASK 65` is the **only red gate step**, so until it lands every *"the gate passes"* is a partial; and `TASK 63` closes the failure mode behind **eight of `EVAL-001`'s fifteen escaped defects** — a check reporting PASS while asserting nothing. Fixing `61`, `64`, `66` or `67` before those two means verifying each of them with an instrument known to be blind.

**`TASK 77` inserted ahead of the fix phase 2026-08-28, by the same reasoning one level down.** It is the substrate every item after it is measured against: with it, each fix-phase item's real cost in tokens and wall-clock is recorded as it runs, and `TASK 78` can later turn those into cost per item — including the comparison the author asked for, one item run on Sonnet against the ones run on Opus. Without it, that data is gone by the time anyone wants it, because the transcripts it comes from are ephemeral and the fix phase is where the items are.

**`TASK 83`/`84`/`85` placed 2026-08-29, filed as `TASK 61`'s own residuals rather than in the author's stated sequence (`P-06`).** `83` sits right after `64` (`7b`), not before it: same untested-trailing-flag shape `61` already fixed once, in the pre-existing `'all'`-mode loop `61` did not touch — two red tests with no production change, cheap enough to batch immediately after the item that shares its file, and `G-12` says not to run it concurrently with anything else touching `path-boundary.mjs`, which nothing in this phase does. `84` sits after `67` (`9b`): a **rung-1 boundary with no shell-side enforcement at all** (`cat private/glossary.md` passes clean today) deserves its own session with a red battery, same as `61` got, but it does not block the harness-plumbing items ahead of it. `85` — the `e2e smoke` flake — is **not placed**: its own `Done` requires a captured repro first, which nothing here can force; three consecutive gate runs during `TASK 64` (one mid-session, two full) stayed clean, so watch for it recurring rather than chasing it.

## TASK 74 — A title word displaces the work-item type, and `H-05` fails open · `bugfix` · `DONE`

**Opened 2026-08-27, found while verifying that the milestone's own new entries parse the way the gate reads them** — the check `P-11` asks for, on a register edit that looked purely editorial.

**The defect.** `parseWorkItemTypes` (`scripts/guards/lib/delegation-gate.mjs:93-97`) reads the type with ``/^##\s+TASK\s+(\d+)\s+—.*?`([a-z]+)`/gim``. The `.*?` is lazy and the `i` flag makes `[a-z]+` case-insensitive, so it captures **the first backticked all-letter token anywhere in the heading** — the title's own words included — rather than the type field. Two entries misparse today, both predating this session: **`TASK 53` reads `version`** (from *"sits at `version` 1.1"*) and **`TASK 62` reads `L`** (from *"`L` on the delegated path"*).

**Why this is rung 1 and not cosmetic.** The parsed type feeds `specRequiredFor`, which is the half of `H-05` that demands an approved spec before a write-capable delegation. Proven by running the real function rather than reasoning about it: a heading reading *TASK 99 — Fix the `slug` join · `feature` · `TODO`* parses as type **`slug`**, and the gate demands **no spec**; strip the backticks from the title and the same item parses as `feature` and the spec **is** demanded. **A `feature` escapes `H-05` because of a word in its title.** That is a boundary failing open, and `INC-05` — three implementers delegated against a spec nobody had signed off — is the incident it exists to prevent.

**Not yet exploitable, and the entry says so rather than overclaiming (`C-01`).** Both live misparses land on types outside `specRequiredFor` (`planning`, `harness`), so no delegation has been wrongly permitted. This is a latent fail-open, and the reason to fix it now is that the trigger is *someone writing a natural title*.

**Done:** the type is read from the heading's **type field** — the register's documented entry shape puts the type in the **second-to-last** `·`-separated field of the heading, so it is positional rather than "the first backticked word"; `TASK 53` parses as `planning` and `TASK 62` as `harness`; a heading whose type is outside the documented vocabulary is a **finding rather than a silent pass**, per `G-13` — a gate that cannot classify an item must not clear it for delegation; and the red battery in `scripts/guards/lib/delegation-gate.test.mjs` carries the ``` `slug` ```/`feature` case above and fails when the positional fix is reverted (`T-04`, `P-14`).

**Constraints**

- **Do not fix this by renaming the two headings.** That is the roster shape `P-13` forbids: it makes today's two green and leaves the next natural title to reopen it. Fix the parser.
- **The positional read must tolerate the trailing annotations the register already uses** — several headings carry a fourth field (`· **ran third**`, `· **runs after the localhost milestone**`), so "second-to-last" is derived from the fields present, not counted from the end blindly. Check it against every heading in the file, not against a sample (`P-13`).
- The vocabulary is derived from the type table at the head of this file, not hardcoded in the guard — the same table `TASKS.md` already publishes.

**Closed 2026-08-27.** The type is now the code span immediately **before** the status span, and the status is matched against the register's own declared vocabulary rather than by shape — because `L` matches `/^[A-Z ]+$/`, so "looks like a status" reintroduces the same bug one layer down. Both vocabularies are derived from the head of this file (`Status values:` and the `type` table), so a type added there is honoured without touching the guard, and a type outside it is a finding: `parseWorkItemTypes` omits the item, and `decideDelegation` already denies on a missing type.

**Verified against the whole register rather than the two known cases:** old and new parsers both yield **75 items — none lost, none gained, exactly two corrected** (`TASK 53` `version`→`planning`, `TASK 62` `L`→`harness`). Seven red tests, and the battery fails 3 when the positional read is neutered (`P-14`).

**Two consequences worth recording.** `documentation` was used by `TASK 67` and **absent from the type table** — the guard now derives from that table, so the table has been reconciled with the register it documents (`P-07`); previously the omission was invisible because nothing read it. And the guard now denies **all** delegation if the register head is unparseable, which is `G-13` accepted deliberately: loud, correct and recoverable, against a boundary that fails open in silence. Two test fixtures that carried a register with no head were updated rather than the throw being softened.

## TASK 70 — What a run costs: the report · `harness` · `DONE`

**Opened 2026-08-27.** Every proposal about slice seams, delegation break-even and model tiers is currently a guess, because nothing reports what a run cost. The substrate already exists and is unused: every `tool.result` carries `bytes` and `duration_ms` (`scripts/guards/lib/evidence.mjs:403-413`), written by a hook the scored agent cannot edit (`H-03`).

**Done:** a reproducible read-only report over `evidence/runs/` emits, per dispatch and per session — role, model tier, **turns**, **result bytes**, **duration**, footer state and deny count; a second run over the same corpus is byte-identical; and the segment method is anchored against a run whose cap is known.

**The anchor named here when this item was opened was wrong, and the correction is recorded rather than quietly swapped (`C-02`).** The entry said *"the two `budget-probe` runs read 12 and 25 against a cap of 25"*, read from `G-06`'s sentence *"the reusable probe is `.claude/agents/budget-probe.md`"*. Measured: `budget-probe` declares `maxTurns: 2` and its two runs read **1 and 2**. The 12/25 pair is **`researcher` in run `53898bfe`** — `maxTurns: 25`, dispatched twice in one session, 12 turns with a footer and 25 without. `budget-probe` was written *after* that measurement as the reusable version, not as the run that produced it. Both anchors are now asserted, at opposite ends of the scale: one method that reproduces 25 and 2 is a method rather than a coincidence.

**Closed 2026-08-27.** `scripts/guards/lib/cost.mjs` + `cost.test.mjs` (18 tests) + `scripts/guards/gate/check-cost.mjs`. Byte-identical across consecutive runs; red path proven by neutering the turn counter and the byte sum, which fails 5 tests. **A fourth honest limit was found while verifying a number rather than accepting it:** `researcher` reported 0.00 MB across 158 turns, and the cause is that `WebFetch` records **~78 bytes per result** and `WebSearch` ~154 — the response wrapper, not the page the model read. The role whose entire job is fetching therefore reads as nearly free, so `ADR-009`'s break-even rule may not be computed for it from this column. The report states this in its own header.

**Constraints**

- Pure functions in `scripts/guards/lib/cost.mjs` with a thin CLI in `scripts/guards/gate/check-cost.mjs` — the shape every existing check uses, which puts the logic inside the mutation-covered surface (`D3`) rather than beside it. **Report-only: not a failing gate step.** A cost figure is not a pass/fail property yet, and `TASK 63` is what makes gate steps mean something.
- Reuse, do not reinvent: the turn-segment method is `TASK 55`'s (a `tool.result` → `tool.requested` transition; a dispatch is a segment between `run.header` events), and the two extract scripts in `progress/` are the working precedent for read-only corpus walks.
- **The model tier is derived, not read.** `run.header` carries `model` only on `reason: startup` — 8 of 139 headers. The header does carry `agent`, so the tier joins to the role file's own `model:` frontmatter: a property, not a roster (`P-13`). The report states the limit — that is the model the role *declares*, and a dispatch-time override is invisible. Recording it properly is `TASK 64` clause 6.
- **Three honest limits stated in the report's own header, or it will be quoted as a token count within a week** (`C-01` applied to the harness's own figures): `bytes` measures tool **results** only — not the prompt, not the re-sent conversation history, not model output, so it is a proxy for marginal context inflow and **never tokens billed**; the earliest runs record every result as **0 bytes** (the `tool_result`/`tool_response` bug documented at `scripts/guards/lib/evidence.mjs:375`, which is why `test-engineer` reads 128 calls and 0.00 MB), so the report partitions on the fix date exactly as `EVAL-001` partitioned its scoring, or it will publish a role as free; and a missing footer is not evidence of budget exhaustion (`G-06`).
- Wall-clock per session is reported, so "los agentes tardan demasiado" gets a number and the Defender lever below can be judged rather than argued.

**One machine-level lever, measured rather than assumed.** A ~145 ms bare-Node boot is characteristic of on-access antivirus scanning; unscanned, Node boots in ~40 ms. Excluding the repository and the Node install from Windows Defender is free to test and is the largest single lever on hook latency. It is **not** a repository change and closes nothing here — the report times `node -e ""` before and after, three runs each, and if it does not move, that is recorded as a dead lever. **A Node SEA or startup snapshot is declined in advance**: it targets the 10–12 ms import slice, not the 145 ms boot.

## TASK 71 — `ADR-009`: delegation economics and the brief contract · `research` · `DONE`

**Opened 2026-08-27.** The harness has no recorded answer to *when not to delegate*, and the cheapest win available is refusing a delegation that costs more than doing the work inline. Our delegated dispatches run **0.18–0.45 MB of result bytes** against a **4,588-byte median brief** across 80 dispatches.

> **Corrected 2026-08-28, before the ADR was written (`C-01`).** This paragraph originally read *"external cost math puts the break-even where a worker absorbs ~500k+ tokens … so several of our delegations are plausibly below break-even."* A dedicated search found **no source for that figure**, and published estimates vary by more than an order of magnitude with task shape. Both halves of the sentence fail: the figure is withdrawn, and the hypothesis it supported is **contradicted** by our own ratio — 4,588 bytes of brief against 0.18–0.45 MB absorbed is 39×–98×, which is favourable. The waste is in runs that do not finish, not in the arithmetic. An unsourced number in the register is the same defect as an unmeasured number in a case study.

**Done:** `ADR-009` — delegation economics — exists under `docs/adr/`, in the template's shape, and settles seven questions, each resting on a measured number from `TASK 70` or an explicit *"not measurable, and here is why"* — a decision resting on an unmeasured figure is `C-01`'s failure applied to the harness itself.

1. **When NOT to delegate** — a break-even rule for this repository.
2. **The brief contract** — required sections: objective · inputs **as extracts, by path** · output format · boundaries · definition of done. `P-08` already forbids pasting rules into briefs, so the contract governs *inputs and outputs*, never policy.
3. **Deterministic assembly as policy, always** — the extract goes to a file, the brief hands over the path. Per the author's instruction: keep it deterministic wherever possible.
4. **The numeric gate a summarizer role must pass before it exists** — it uses the deterministic tooling *and* costs fewer tokens than the alternative, stated as a number from `TASK 70` on a real corpus. If it does not clear the gate it is not built, and the decision is recorded so nobody re-proposes it.
5. **What a delegated run must return** — a bounded summary, not a transcript, and the report is part of the deliverable. `TASK 55` found this the hard way when the artifacts landed and the reports were the casualty.
6. **Model tier per role, and the orchestrator's own tier** — the allocation is `implementer`/`researcher`/`test-engineer` on Sonnet, `adversarial-auditor`/`harness-evaluator` on Opus, the orchestrator on Opus, with the footer rates above as the evidence. **The standing answer on Haiku is recorded so it is not re-proposed each session:** a summarizer role must beat a script on decision 4's number, and both extracts built on 2026-08-27 were scripts — zero model tokens, byte-reproducible, auditable. Haiku's remaining slot is prose a script cannot parse, which has not appeared, plus `budget-probe`. The orchestrator's tier is a **prose policy verified from the trace**, because `G-09` denies it a role file and a fake `model:` field would be worse than the honest shape.
7. **The headline metric: cost per completed item** — observable, written by hooks the agent cannot edit, and it captures both stated goals at once. `K1` becomes a factor of it rather than the headline. Amending `docs/harness/contracts.md` §6 and `docs/harness/architecture.md` §K is this ADR's consequence, not a side edit.

**Constraints**

- The `researcher` role gathers the external evidence and **does not write the ADR** — a researcher arriving with a recommendation finds the evidence for it. Sources arrive dated and quoted, never obeyed (`G-02` `D3`).
- Do not re-open `ADR-006`'s or `ADR-008`'s settled ground; cite them.

**An eighth sub-decision was added 2026-08-28, before acceptance, and it is recorded here because the entry asked for seven.** The author read the draft and asked where the cost of each slice and each trace is *captured* and *stored* — a question decision 7 named a metric without answering. Checking it produced a finding against this ADR's own first draft: **tokens are measurable and the draft was about to record their absence as a fact.** Hook payloads carry no usage field, but every hook receives `transcript_path`, and the transcript's `message.usage` carries per-message, per-model token counts. Sub-decision 8 is the capture matrix, the `run.cost` event that `TASK 77` builds, the declared work-item join that `TASK 78` builds, and what stays unmeasurable. `G-06`'s *"`maxCost` is not available"* remains true of the **budget control** and had been read as true of the **measurement**; `TASK 77` splits the claim.

**Closed 2026-08-28 — `ADR-009` accepted by the author, eight sub-decisions, status `Current`.** The `P-02` checkpoint was the acceptance and it happened; nothing here closed against a proposal. Two of the ADR's conclusions are worth carrying forward because they point away from where the discussion naturally goes: the **model tier is the smaller lever** (widest adjacent-tier gap 2.5×, against `implementer`'s 44% footer rate worth ~2.3× on runs that produced nothing), and **our dispatches are not below break-even** (4,588-byte median brief against 0.18–0.45 MB absorbed, 39×–98×) — the waste is in the cut runs, not in the arithmetic. The unsourced ~500k figure this item was opened on is withdrawn, and the ADR leaves that slot empty and named rather than substituting the nearest number.

## TASK 72 — Record where the iterations go · `harness` · `DONE`

**Opened 2026-08-27.** `K1` reports that an item took nine passes and nothing says whether they were implementation, integration between slices, or author review. Every proposal about slice seams is a guess without that split, and "the seams are wasteful" is exactly the claim the author raised.

**Done:** the `done:` block carries an iteration-attribution field alongside the existing `iterations` count; `wrap-up` and `check-procedures` accept the extended shape and still fail a block claiming success with nothing behind it (`P-03`, `A22`); and the vocabulary is derived from the work item's own `type` rather than a hardcoded list (`P-13`).

**Constraints**

- One field. This is the cheap half of the measurement, and an item that grows a taxonomy stops being cheap.
- It counts **human-visible implement→verify cycles**, never tool calls — `work-item` §7 is explicit, and a tool-call count moves for reasons unrelated to what `K1` measures.

**Closed 2026-08-28.** The field is `iteration_split`, and its evidence is `bucket=count` pairs that **must sum to `iterations`** — the sum check is what stops the field being decorative, because without it the split can say anything and still pass, which is worse than not having it: it looks like a measurement.

**The vocabulary is derived from two live artifacts and appears nowhere in the guard (`P-13`).** The buckets are the `work-item` procedure's own `## N · Name` steps, minus the first (nothing returns to the entry point) and the last (a return to Close is a reopen, which is `K2`); then the register's own type table narrows them — a type answering **No** to *"Produces a spec?"* has no `spec` bucket, because it never had a spec to iterate on. A step added to the procedure becomes a bucket without the guard being touched, which is asserted by a test rather than claimed. Both derivations **throw** when their source stops parsing (`G-13`): an empty vocabulary accepts every bucket name, so the check would report PASS while asserting nothing — `INC-07` exactly.

**Reuse rather than a second reader:** the per-log type join is `parseWorkItemTypes`, the single reader of the register's heading shape and the one `TASK 74` had just made correct; the cutoff is `iterationSplitRequiredFrom`, the third use of `doneBlockRequiredFrom`'s dated-threshold mechanism.

**Red battery: nine neuters, nine caught** (`T-04`, `P-14`) — including the two that matter most, a flat vocabulary that accepts `spec` on a `content` item, and a dropped sum invariant. `check-procedures` reports a derivation failure as a **named finding** rather than a stack trace, which is the presentation half of `G-13`.

**Measured at close:** 706 guard tests pass (+24), mutation **75.61** against the 74.5 floor, gate **19 of 20** — the one red step is `procedures`, on this item's own sibling defect (`TASK 65` clause 2), unchanged by this work.

**One finding worth recording, because it will surprise the next session (`P-16`).** `check-procedures` fails any dated log whose `done:` block is empty — so a log opened as a **skeleton**, which is `P-09`'s one measured mitigation against a cut run, turns the gate red until it is filled. That is correct behaviour (an empty conjunction is true of everything) and the tension is real; it is now stated in `wrap-up` §3 so it reads as a known cost rather than a bug.

## TASK 73 — The brief contract becomes a guard · `harness` · `TODO` (needs `TASK 71` · **runs after the site is published**)

**Opened 2026-08-27, deliberately last.** Contracts that are advisory drift; this is the difference between a convention and a boundary. It is scheduled after the site so harness work does not delay the portfolio, which is the author's sequencing decision.

**Done:** `scripts/guards/lib/delegation-gate.mjs` denies, at rung 1, a **write-capable** delegation whose brief lacks the contract's sections — the way `H-05` already denies one naming no work item; the battery proves each clause in red and fails when the clause is removed (`T-04`, `P-14`); and a read-only delegation is unaffected.

**Constraints**

- **Extend the existing guard; never register a second guard on the same matcher.** One `PreToolUse` registration is a deliberate property — N registrations mean N process spawns per call, and the measurement above is what that costs.
- Write-capability is read off the role's own `tools` list, never a roster (`H-05`).
- `G-13`: a guard that cannot evaluate must deny.

## TASK 77 — The trace records what a run cost, in tokens and wall-clock · `harness` · `DONE`

**Opened 2026-08-28 by `ADR-009`'s eighth sub-decision, from a claim that turned out to be false.** The harness has been treating token cost as unavailable. `G-06` says `maxCost` *"is not available and is never reported as a number"* — true of the **budget control** — and `ADR-009`'s first draft said `bytes` is *"never tokens billed"*, true of that column. Together they read as *tokens cannot be measured*, and that is wrong. Hook payloads carry no usage field, but **every hook receives `transcript_path`**, and the transcript's `message.usage` carries `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens` and `thinking_tokens` per assistant message, tagged with its `model`. Measured 2026-08-28: one session totals 1,062,469 output and 168,464,001 cache-read tokens, and an earlier session carries two model tiers in one file, so per-model attribution already works.

**Done:** every `SubagentStop` and `SessionEnd` writes one `run.cost` event carrying `wall_ms` and per-model token counts; `check-trace` validates its shape as it validates every other event; and the red battery proves that **no string from the transcript can reach the trace**, and that a missing, truncated or reshaped transcript records an **absence** rather than a crash or a silent zero (`G-13`).

**Constraints**

- **Integers only.** The extractor takes named numeric fields and nothing else — not a message id, not an error string, not a `model` value it did not itself derive. The transcript holds everything that was said, including anything read near `private/`; `docs/harness/evidence.md` states that the trace records *what was attempted, decided and happened*, never *what was said*, and this constraint is what keeps that true. It is the reason the red battery exists, not a style preference.
- **A zero is not an absence.** A transcript that cannot be read records the fact. Writing `0` would publish a run as free — the exact defect `TASK 70` found in `WebFetch`'s byte column, and the reason that report had to partition on a fix date.
- **Reuse the writer.** `eventsFor` in `scripts/guards/lib/evidence.mjs` is where every event is built. Do not add a second write path, and do not register another hook: the per-call hook cost is already measured and one more registration is one more process spawn per tool call.
- **`G-06`'s row is amended in the same change (`G-11`).** `maxCost` stays unavailable as a *budget control*; cost as a *measurement* stops being an overclaim. Both halves stated, neither deleted.
- Per dispatch and per session — **never per turn**. That is the taxonomy `TASK 72` already declined.

**Closed 2026-08-28.** `run.cost` writes at `SubagentStop`/`SessionEnd`, alongside `run.footer`. Two implementation decisions `ADR-009` §8 left open, both filled in and worth recording so nobody re-derives them:

- **The "since the previous such event" boundary** is the most recent `run.header` in the run's own trace file whose `reason` is not `observed` (a mid-dispatch posture-change header, not a resume boundary — counting it would silently truncate the window), or the most recent `run.cost`, whichever is later. `wall_ms` comes from the same boundary.
- **`message.model` is validated against a known shape** (`/^claude-[a-z0-9]+(-[a-z0-9.]+)*$/i`) before it is trusted as an object key; anything else buckets under the fixed sentinel `unknown-model`. It is transcript text, and copying it verbatim would be a second, unaudited path for arbitrary text to reach the trace.

**A real defect was found and fixed by `P-11`'s "verify two ways" check, not by the test battery.** The transcript writes one JSONL line per content block, not one per logical assistant message — a single turn's `thinking`/`text`/`tool_use` blocks share one `message.id`, each carrying its own `usage` snapshot, and `output_tokens` grows across those snapshots while the cache fields stay constant. The first implementation summed every qualifying line independently, overcounting almost every field (measured on a real dispatch: 2.1 transcript lines per logical message on average). The fix deduplicates by `message.id`, keeping only the last occurrence in file order. Caught by reading a real `run.cost` event this item's own implementer dispatch produced and independently recomputing it by hand from the transcript — the two numbers disagreed, which is what sent the fix back rather than closing on a green test suite. `docs/harness/evidence.md` records the mechanic; `G-06`, `docs/harness/architecture.md` §I and `docs/harness/contracts.md` §2 are amended in the same change (`G-11`) — the same "`maxCost` … never reported as a number" overclaim was live in three documents, not the one this item's hand-off named.

## TASK 78 — Cost per completed item becomes computable · `harness` · `TODO` (needs `TASK 77` · **runs after the fix phase**)

**Opened 2026-08-28.** `ADR-009` names cost per completed work item as the headline metric, and it is currently **uncomputable**: `run.header` carries no work-item id, the parent's `Agent` request and the child's run id are different values, and no parent `tool_use_id` reaches `SubagentStart`. Two figures already in the trace are also never reported — a dispatch's wall-clock (first and last `ts` of its segment) and the brief's own size (`target.bytes` on the parent's `Agent` request, 3,819 bytes for the `TASK 71` researcher dispatch).

**Done:** `check-cost.mjs` prints a **per-work-item** row — tokens, wall-clock, result bytes, brief bytes, dispatches, footers — joined through a `cost:` `done:`-block dimension that `check-procedures` verifies **resolves to a real run** under `evidence/runs/`.

**Constraints**

- **Compute the two that already exist; do not add events for them.** Wall-clock and brief bytes are in the trace already.
- The `cost:` dimension is a **self-reported pointer into an observable artifact**, and the report says so where it prints it. A hook cannot know which work item is being worked on, so a heuristic that guessed would be worse than an honest declaration.
- Validate it the way `iteration_split` is validated: **derived** — the named file exists and the run id appears in it — never a roster (`P-13`).
- **Still report-only.** A cost figure becomes a failing gate step only after someone calibrates a threshold, and that is not this item (`TASK 34`'s lesson).

## TASK 79 — The hand-off packet becomes a documented convention · `documentation` · `DONE`

**Opened and closed 2026-08-28, from a live gap found while planning the session split.** `progress/handoff/` holds three working packets and **no document mentions the directory** — not `progress/README.md`, not a rule, not `wrap-up`. A convention nobody can find is one that gets reinvented at a lower standard each time, and the plan to run one work item per session depends entirely on it.

**Why it matters more than its size.** This is `P-09`'s reading half applied to a session instead of an agent, and the extension is exact: **a fresh session is economically a delegated agent with a cold context.** `P-09` measured 0 of 3 slices cut when handed a pre-written extract against 2 of 4 when sent to read. A packet that says *"read `TASKS.md` and work it out"* has handed over an unbounded read; one that says *"here is the state, here are the traps, here is your prompt"* has not.

**Done:** `progress/README.md` carries the packet's shape and when one is written; `wrap-up`'s hand-over step names the directory and requires a packet whenever the next work item will start in a fresh session; and the shape is **derived from the packets that exist** rather than invented.

**Constraints**

- **Describe what those files do; do not redesign them** (`C-02`). Two of them worked.
- The packet's centre is the **ready-to-paste prompt**. Without one the next session opens by deciding what to do rather than doing it.
- No new directory and no template file — `progress/README.md` already carries the work-log template, and the packet goes beside it.

**Closed 2026-08-28.** The derivation found something the plan had assumed away: **the directory holds two different kinds of document, and only one of them is a session hand-off.** `2026-08-27-task27.md` and `2026-08-27-eval001.md` hand context to a *fresh session*; `2026-08-26-task26-content.md` hands drafted content to the *author* to apply to `resources/**` under `H-02`. Writing one shape over both would have produced a convention that fits neither. Four sections are shared by the two session packets and are required — the goal in one sentence, the ready-to-paste prompt, why this item now, and boundaries — and everything else the two do individually is declared optional, because a section present in one of two is not a convention.

## TASK 80 — The session close is a spoken hand-over, not only a written packet · `documentation` · `DONE`

**Opened and closed 2026-08-28, from the author's own feedback on the previous session's ending.** `TASK 79` made the packet a documented convention, and the packet is a **file**. What the author found useful was the ending *in the terminal*: the cut said out loud, the prompt to paste, and the tier with its reason. `wrap-up` §5 required the file and said nothing about the message.

**Why this is not deferred for a trial, which is what was proposed.** The suggestion was to run the format two more sessions and then write it down. It cannot be trialled unwritten: **a fresh session does not inherit an unwritten habit**, which is the entire premise `TASK 79` documented. Session two would not produce the ending, and session three would read that as the format not sticking rather than as nobody having been told. A three-line procedure step is cheaper than a wrong conclusion.

**And it does not go in `CLAUDE.md`,** which states of itself that no rule bodies live there because a rule stated twice drifts (`G-10`). `wrap-up` already owns hand-over; a second home for it would be the drift that file exists to prevent.

**Done:** `wrap-up` §5 requires the closing message and names its three parts — the cut stated explicitly, the paste-ready prompt reproduced **in the terminal** rather than only in the packet, and the tier with its one-line reason — plus what is left for the human to decide.

## TASK 81 — `EC-005`'s notes assert `maxCost` is unmeasurable, and that stopped being true · `harness` · `TODO`

**Opened 2026-08-28, a loose end from `TASK 77` (`P-06`).** `EC-005`'s `outcome: Partial` `notes` state *"maxCost is unavailable and never reported as a number"* — true when the case was scored, and no longer true: `TASK 77` shipped `run.cost`, a per-dispatch/session measurement written at `SubagentStop`/`SessionEnd`. The `notes` field is a dated evaluation record, not a live claim, so `TASK 77` deliberately left it unedited rather than rewriting history the case wasn't re-run to produce.

**Done:** `harness-evaluator` re-scores `EC-005` against the current repository — `maxCost` as a *budget control* is still `NOT AVAILABLE` (no knob exists, and this case's `question`/`expected_behavior` are about budget enforcement, not cost measurement, so the verdict itself may not move) — and the `notes` field is updated to state both halves, matching `G-06`'s own amended row rather than repeating the now-superseded claim.

**Not urgent.** No gate step depends on this case's current text; it is a documentation-accuracy gap in a scored record, not a defect in what the harness does.

## TASK 82 — Vitest's own zero-tests summary is misread as a non-zero count when every test is skipped or todo · `bugfix` · `TODO`

**Opened 2026-08-29, a loose end from `TASK 63` (`P-06`).** `TASK 63` widened `countTestsRun` (`scripts/guards/lib/gate.mjs`) to recognize Vitest's and Playwright's real summary shapes, closing the `component tests` and `e2e smoke` gate steps' zero-tests-ran blind spot for the case that matters: a run that exits 0 having verified nothing. One edge case was flagged, not fixed, during that item's own slice: Vitest's all-`.skip`/all-`.todo` summary reads `Tests  N skipped (N)` / `Tests  N todo (N)` — parsed by the widened regex as a **positive** count `N`, so a component-test file where every test is skipped still reports PASS. `node:test` has the identical shape already (a TAP suite that is entirely skipped also reports non-zero), so this is a pre-existing limitation the widening inherited rather than introduced — but it is a real gap in the same failure class `TASK 63` closes: a step that verified nothing can still read PASS.

**Done:** either `countTestsRun` distinguishes an all-skipped/all-todo run from one with at least one real pass (with a red test planting each of the four shapes — `node:test` TAP-all-skipped, `node:test` spec-all-skipped, Vitest all-skipped, Vitest all-todo), or the gap is declared out loud in `scripts/guards/lib/gate.test.mjs`'s own comments and in `docs/harness/contracts.md` as a known, accepted limitation with its reason — never left unstated in prose only.

**Not urgent.** No real test file in this repository is entirely skipped or todo today; this is a latent gap, not a live one.

## TASK 83 — `path-boundary`'s `'all'`-mode loop is defeated by a flag placed after the target · `bugfix` · `DONE`

**Opened 2026-08-29, a loose end from `TASK 61` (`P-06`).** `checkBashPaths`'s `'all'`-mode loop (`rm`, `rmdir`, `tee`, `truncate`, `shred`, `chmod`, `chown`, `touch`, `mv`) flags every argument that does not start with `-`: `for (const arg of args) { if (arg.startsWith('-')) continue; flag(arg, head); }`. Nothing stops a target from being followed by a flag — the loop still flags it correctly today (`startsWith` runs per-argument, not just on the last one), but the pattern is completely untested: no test in `path-boundary.test.mjs` exercises any `'all'`-mode command with a trailing flag. Found while reading `TASK 61`'s mutation survivors: two mutants at `path-boundary.mjs:185` (`arg.startsWith('-')` mutated to `false` and to `arg.endsWith('-')`) survived, and the identical shape exists, equally untested, at `:175` in the `'all'`-mode loop — `TASK 61` closed only the two branches its own new logic introduced (`awk` in-place, `destinationArgs`' fallback) and left this one, which predates it, named rather than silently expanded into.

**Done:** a red test plants a trailing flag after an `'all'`-mode target (e.g. `rm -rf resources/ -v`, `mv resources/a.md /tmp/a.md -v`) and asserts it is still denied; the assertion fails when `arg.startsWith('-')` is neutered to `arg.endsWith('-')` or to `false`.

**Closed 2026-08-29.** Test-only, as scoped — `scripts/guards/lib/path-boundary.mjs` is unchanged; only `path-boundary.test.mjs` gained tests. **Validated by hand, not assumed (`P-04`, `P-11`):** the two example commands named above do **not** kill either mutant — the real target is already flagged before the trailing flag is even reached, so the loop's skip logic on that specific argument is never exercised by them. What actually kills `arg.endsWith('-')` is a target whose own name ends in `-` (`rm -rf 'resources/file-'`) — confirmed by hand-mutating `:175`, rerunning, watching it fail, then reverting. The literal-`false` mutant (never skip anything) turned out to be a true equivalent for this loop under any ordinary flag syntax: skipping fewer arguments only ever adds extra `flag()` calls, and an ordinary flag never resolves to a path inside a boundary, so `allowed`/`findings` cannot differ. The one construction that does distinguish it — a flag-shaped argument that resolves through `..` into the boundary, e.g. `-/../resources` — is a **real, separate bypass already live in the unmutated code today** (`rm -rf -/../resources` is wrongly `allowed`), found as a side effect of trying to kill this mutant. Fixing it needs a production change (resolve an argument's path before deciding it looks like a flag), which is outside this item's declared test-only scope, so it is filed rather than folded in (`P-06`): `TASK 86`. `node --test "scripts/guards/**/*.test.mjs"` 854/854.

## TASK 84 — `checkBashPaths` has no shell vector for the `H-04` read boundary at all · `bugfix` · `DONE`

**Opened 2026-08-29, found during `TASK 61`'s checkpoint validation, out of that item's scope (`P-06`).** `checkBashPaths(command, boundaries, root)` reads `boundaries.write` only (`scripts/guards/lib/path-boundary.mjs`, `const write = boundaries.write ?? []`) — it never consults `boundaries.read`. `cat private/glossary.md` therefore passes the guard cleanly: `H-04`'s "never read by a delegated role" is enforced for the file tools (`Read`/`Grep`/`Glob`, via `checkPath(..., 'read', ...)` in `pretooluse.mjs`) but has no shell-side enforcement whatsoever. This is a different boundary (read, not write) on a different function signature than `TASK 61` touched, and is filed separately rather than folded in, per that item's own reasoning for why `dd` *was* folded in — same function, same defect shape — which this is not.

**Done:** `checkBashPaths` (or a sibling function reusing its decomposition) denies a shell command that reads `private/**` — `cat private/glossary.md`, `grep -r x private/`, `sed -n '1p' private/glossary.md` at minimum — with a red battery proving it, and `pretooluse.mjs` wired to call it. Scope the fix to detection only; `private/`'s shell vector for *writing* is already covered by the existing `write` boundary, so this item is read-only.

**Closed 2026-08-30.** Confirmed first, TDD-red: `cat private/glossary.md`, `grep -r x private/`, `sed -n '1p' private/glossary.md` and `head private/banned-terms.txt` all returned `{"allowed":true}` against the unmodified code (matches the hand-off packet's own verified extract, `progress/handoff/2026-08-30-task84.md`). **The entry's own scoping sentence above was wrong, exactly as the hand-off flagged**: `private` sits in `boundaries.read`, not `boundaries.write`, so nothing already covered the shell's *write* vector on it either. That gap is real, is not this item's to fix, and is opened separately as `TASK 91` rather than folded in here or silently dropped (`P-06`).

**The first fix landed, passed its own tests and the full gate — and was wrong.** Per the `adversarial-auditor` agent's own instruction to run "always on a guard or a boundary," an audit pass ran on the closed diff before this entry was actually finalized. It found the `'pattern'` mode's argument-skip genuinely broken: it exempted "the first non-flag-shaped argument" *by position*, which is the search pattern only when the pattern is a bare token — glue it to its own flag (`grep -e. private/x`, `perl -pe1 private/x`, `sed --expression=p private/x`) and the FILE becomes the first non-flag token instead, and gets silently exempted from the read check in its place. The audit also found `cp -t/tmp private/glossary.md` (a glued short `-t` that `destinationArgs` didn't recognize, so the real source got mistaken for the destination and excluded) and `ln private/glossary.md` (`ln`'s valid single-argument form — link the source into the cwd — misread by a fallback built for `cp`/`install`, which need two positionals to mean anything). **Every claim was independently re-verified against the real function before being trusted** (`P-11`) — not accepted on the agent's word.

**The rewrite, not a patch:** `readArgsForPattern` replaces the position-only skip with per-tool flag tables (`TEXT_FLAG_LETTER`/`LONG`, `FILE_FLAG_LETTER`/`LONG`) distinguishing pattern-supplying flags (`-e`, `--regexp=`, exempt) from file-supplying flags (`-f`, `--file=`, a real read — `grep -f private/x /etc/hosts` was a third live bypass, found while building the rewrite rather than by the audit) — split and glued forms of both. `destinationArgs` gained the missing glued-`-t` branch; `sourceArgs` gained an `ln`-specific single-positional case. **A second self-found bug mid-rewrite:** an unconditional cluster search for the flag letter anywhere in a token (mirroring `inPlaceFlag`'s own accepted imprecision) let `-fprivate/x`'s OWN glued value — "private" contains an "e" — be misread as a clustered *text* flag, exempting the file it should have checked. Fixed by gating that deeper search (`deepSearch`) to only the tools with a single recognized letter (`perl` has no file-letter; `awk` has no text-letter); `grep`/`egrep`/`fgrep`/`sed`, which have both, are matched only at the flag's own position — narrower than full clustering support, but every bypass actually demonstrated stays caught, and an unrecognized cluster still gets checked rather than silently exempted.

**Red battery, final:** 68 tests in `path-boundary.test.mjs` (from the original 43), covering the minimum reproduction, the extended reader roster, `cp`/`ln`/`install` source-exfiltration, the flag-shaped `..`-climb bypass, the in-place-edit resolution, the documentation-trap anti-regression, all three audit-found bypass classes with their own reproducing tests, and a direct-unit battery on `readArgsForPattern` covering every tool's own flag letters and long forms, glued and split. Whole-suite guard battery green throughout.

**Mutation, read from the report rather than assumed, across three rounds:** the first `READS` pass measured `path-boundary.mjs` at 82.93% → 84.67% after killing 5 of 6 new survivors (the 6th, `wmode === 'inplace'` surviving mutation to `true`, is a proven equivalent — reachable only when `wmode` is undefined or already `'inplace'`, and `inPlaceFlag` returns `null` for every other head, so no input distinguishes it; **not suppressed with a Stryker directive** — verified against the installed `directive-bookkeeper.js` that a comment preceding a chained `else if` attaches to the outer if/else chain's own line rather than the branch's, so the directive would silently never match, and is documented in a plain comment instead of a non-functional one). The rewrite's larger surface dropped the file to 77.36% (88 survivors); a further battery — every tool's own flag letter and long form individually, split/glued edge cases, `hasExplicitTargetFlag`'s `.some`-vs-`.every` distinction, `ln`-vs-`cp`/`install` scoping — brought it to 85.62% in isolation, **86.68% (405 killed, 54 survived, 9 no-coverage) in the full-suite gate run**, most of the residual survivors pre-existing debt in `normalize`/`repoRelative`/`destinationArgs`' original logic, unrelated to this item's diff. **Full gate: PASSED, 21/21, exit 0. Mutation score 78.04%** against the 77.0 floor — higher than the 77.58% this item inherited, not just above the floor.

**What this item does NOT claim.** The audit also surfaced two severe, pre-existing bugs in `shell.mjs` — shared decomposition code this item did not touch, used by all four hard rules, not only `H-04` — and a class of structural residual (shell-level expansion) neither this item nor a simple bugfix can close. All three are independently re-verified and recorded separately: `TASK 92` (a fake heredoc marker defeats `commandContexts` entirely — confirmed against `H-01`/`H-02`/`H-03`/`H-04` alike), `TASK 93` (`eval` is recognized by neither wrapper set), `TASK 94` (shell-level expansion as a stated residual). `TASK 92`/`93` are severe enough — `H-01`, the rule whose whole point is that a git write is never unreviewed, is bypassed by both — that they warrant the author's attention ahead of the existing run order, not buried behind it.

Detail: `progress/2026-08-30-03-task84-read-vector.md`.

## TASK 91 — `private/` carries no write boundary at all, on either vector · `bugfix` · `TODO`

**Opened 2026-08-30, a loose end from `TASK 84` (`P-06`).** `guards.config.json`'s `boundaries.write` lists `resources`, `evidence`, `.git` — `private` appears only in `boundaries.read`. `H-04` governs *reading* `private/**`; nothing governs writing to it, deleting it, or moving it elsewhere. Verified directly and via `path-boundary.test.mjs`'s own `'mv is not a READS-roster command...'` anti-regression test (which documents the gap rather than closing it): `rm -rf private/`, `tee private/x`, `touch private/x`, and `mv private/glossary.md /tmp/dest` all return `{"allowed":true}` against the real config today. The last one is the sharpest shape — moving a confidential file out of `private/` both deletes it from its protected location and exposes it, unprotected, wherever it lands.

**Not absorbed by `TASK 94`, checked rather than assumed (2026-08-31).** §L's residual covers what the shell resolves *after* the guard reads the command; this item is a boundary that was never configured at all, so the four commands above are denied by nothing on either vector regardless of expansion. Different mechanism, different fix, and closing it inside a documentation item would have been the scope creep `P-01` forbids.

**Done:** either `private` is added to `boundaries.write` (with `pretooluse.mjs`'s `boundaryRule()` and its deny message reviewed for whether `H-04` or a new rule id is the right citation for a *write* finding on a boundary the registry currently frames only as a read boundary), or a deliberate decision is recorded for why deletion/relocation of `private/**` stays out of scope while reading it does not (`C-11`: the trade-off stated, not assumed) — with a red battery proving whichever way it goes (`T-04`).

## TASK 85 — `e2e smoke` failed once inside `gate.mjs`, clean every other time · `bugfix` · `TODO`

**Opened 2026-08-29, a flake found verifying `TASK 61` (`T-06` — a flake is a finding, not something to retry past silently).** `node scripts/gate.mjs`'s `e2e smoke` step failed once (background-buffered output truncated before the actual Playwright failure detail, so the specific spec/route is not captured); `npx playwright test` run standalone twice immediately after, and `gate.mjs` run once more end-to-end immediately after that, all three passed clean (309 passed, 0 failed, exit 0 each time). `TASK 61` touches only `scripts/guards/lib/path-boundary.mjs` and its test file — no `site/**` path — so the failure cannot be caused by that change; it is pre-existing and intermittent. `docs/adr/ADR-006-testing-toolchain.md` / `.claude/rules/30-testing.md` already document one race in this exact tier — `astro preview`'s background-daemon lifecycle racing Playwright's `webServer` readiness check — and record it as addressed by having `gate.mjs` own the daemon's lifecycle directly; this occurrence, if the same race, is a recurrence rather than a new mechanism, but that is not yet confirmed since the failure detail was lost.

**Done:** either the failure reproduces with its detail captured (route, browser, error) and is diagnosed against the documented daemon-lifecycle race — fixed if it is the same mechanism recurring, or newly diagnosed if not — or three consecutive clean `node scripts/gate.mjs` runs with full output captured is treated as insufficient to close this without a repro, and the item stays open with a note that reproduction requires load conditions not yet identified (e.g. running immediately after a ~6-minute Stryker pass, as `TASK 61`'s occurrence did both times it ran in that sequence).

## TASK 86 — A flag-shaped argument that resolves through `..` bypasses the `'all'`-mode loop entirely · `bugfix` · `DONE`

**Opened 2026-08-29, a loose end from `TASK 83` (`P-06`).** `checkBashPaths`'s `'all'`-mode loop (`scripts/guards/lib/path-boundary.mjs:173-177`, behind `rm`, `rmdir`, `tee`, `truncate`, `shred`, `chmod`, `chown`, `touch`, `mv`) decides whether an argument is a flag — and therefore skips it, never resolving or checking it — purely from its raw text: `arg.startsWith('-')`. That check runs **before** any path resolution. An argument crafted to start with `-` but climb back into a protected boundary via `..` is skipped outright and never reaches `flag()`/`repoRelative` at all: `rm -rf -/../resources` is `allowed: true` against the current code, verified directly —

```js
checkBashPaths('rm -rf -/../resources', { write: ['resources','evidence','.git'], read: ['private'] }, ROOT)
// => { allowed: true, findings: [] }
```

— against `checkBashPaths('rm -rf resources', ...)` on the identical boundary, which is correctly `allowed: false`. This is the same evasion class the guard already defends against for ordinary arguments (`RED: a path that climbs out and back in is still inside the boundary`, `path-boundary.test.mjs`) — `..`-resolution — reaching the same protected tree through a second, unguarded door: the flag/target classification itself, which happens on raw text ahead of any resolution.

**Found as a side effect of `TASK 83`,** while trying (and failing) to construct a test that kills the literal-`false` mutant of the identical `startsWith('-')` check — that mutant turned out to be a true equivalent for ordinary flag syntax, and this construction was the only one that distinguished it, which is what exposed that it also breaks the real, unmutated guard.

**Done:** the `'all'`-mode loop (and, if the same defect shape is confirmed there too, the `'inplace'` loop at `:182-187`, which shares the identical `startsWith('-')` check) denies an argument that is flag-shaped on its surface but resolves inside a protected boundary once joined to root and `..`-resolved — with a red battery proving both the fix and the anti-regression case (an ordinary flag like `-rf`/`-v` still passes through untouched); and a mutation-proven test exists for the corrected logic, not just a passing one.

**Closed 2026-08-29, same session as `TASK 83` — folded forward at the author's direction rather than deferred to a fresh session, since the context was already loaded (`P-09`'s reading-half reasoning applied to a session rather than an agent).** Confirmed first, TDD-red: the `'inplace'` loop shares the identical shape and the identical bypass — `sed -i 's/a/b/' -/../resources/x.md` was also wrongly `allowed`. **The fix is simpler than the Done line anticipated:** rather than "resolve before deciding it looks like a flag," the actual patch just stops deciding at all — `if (arg.startsWith('-')) continue;` is deleted from both loops, and every argument is checked unconditionally. This is safe by construction, not by luck: `isInside` requires the whole resolved relative path to *equal or start with* the boundary at a segment boundary, and any real flag's text (`-rf`, `--in-place=.bak`) sits in front of that comparison and breaks the literal match — so a genuine flag is checked and never matches, while `-/../resources` still resolves down to exactly `resources` once `..` collapses the leading `-` segment. Red battery: `path-boundary.test.mjs` — two reproducing tests (`'all'`-mode, `'inplace'`-mode), one anti-regression test (an ordinary flag on a non-boundary path still allows). Whole-suite battery 857/857 after the fix (one unrelated, transient `progress/` skeleton-log failure mid-session, resolved before the closing gate run). **A second, related bypass found while fixing this one, not folded in:** `destinationArgs` (the `cp`/`ln`/`install` `'dest'`-mode fallback) filters on the identical raw-text `startsWith('-')` before picking its "last positional" as the destination — `cp /tmp/x.md -/../resources/y.md` is also wrongly `allowed`, and worse, silently substitutes the *wrong* argument as the presumed destination. Its fix cannot be "check every argument unconditionally" the way this one was: `destinationArgs` must still pick exactly *one* argument, and the existing, passing `TASK 61` regression test (`cp /tmp/x.md resources/y.md -v` — the trailing real flag must not become the presumed destination) means naively dropping the filter breaks a currently-correct case. Filed separately as `TASK 87` rather than expanded into here (`P-01`, `P-06`) — different function, and a genuinely different fix shape, not the same patch reapplied.

## TASK 87 — `destinationArgs`' positional fallback picks the WRONG argument when the real destination is flag-shaped · `bugfix` · `DONE`

**Opened 2026-08-29, a loose end from `TASK 86` (`P-06`), found while fixing it.** `destinationArgs` (`scripts/guards/lib/path-boundary.mjs`, the `'dest'`-mode fallback behind `cp`/`ln`/`install`) computes its last-resort destination as `args.filter((a) => !a.startsWith('-'))`, then takes the last element — the identical raw-text-before-resolution mistake `TASK 86` closed in the `'all'`/`'inplace'` loops. `cp /tmp/x.md -/../resources/y.md` is `allowed: true` today, verified directly. Worse than `TASK 86`'s shape: it does not merely miss the real target, it silently substitutes the source argument as the presumed destination, so the check runs and passes while looking at the wrong argument entirely.

**Why `TASK 86`'s fix does not transplant directly.** That fix deleted the skip and checked every argument independently — safe there because `'all'`/`'inplace'` treat every non-matching argument as an independent candidate. `destinationArgs` instead must select exactly *one* argument as *the* destination, and an existing, currently-correct regression test (`TASK 61`: `cp /tmp/x.md resources/y.md -v` must still resolve the middle argument, not the trailing `-v`, as the destination) means the fallback cannot simply stop filtering by raw `-` prefix — that breaks a real, already-tested case in the other direction.

**Done:** `destinationArgs`' positional fallback identifies the correct destination even when it is flag-shaped and reachable only through `..`-resolution, without regressing the case a real trailing flag must still be excluded from (`TASK 61`'s own battery); red tests for both directions, plus the reproducing case above; mutation-proven, not just passing.

**Closed 2026-08-29, same session as `TASK 86`.** `TASK-86`'s own fix ("stop deciding, check every argument") does not transplant here, because `destinationArgs` must still pick exactly one candidate and `TASK 61`'s regression test depends on excluding a real trailing flag. **The fix:** narrow the filter's "this is a flag, exclude it" test from raw `startsWith('-')` to `startsWith('-') AND contains neither '/' nor '\'` — a real `cp`/`ln`/`install` flag never contains a path separator in its own syntax, and a `..`-climb into a boundary cannot resolve to anything without one, so the two are cleanly separable on that signal alone. Red battery: three reproducing tests (`cp /tmp/x.md -/../resources/y.md`, `ln -s /tmp/x.md -/../resources/y.md`, and the backslash form `cp /tmp/x.md -\..\resources\y.md`), one restated anti-regression test proving an ordinary trailing flag still never becomes the presumed destination. **A mid-session correction, recorded rather than quietly fixed (`C-01`, `P-11`):** the backslash case was first believed untestable, on the claim that Bash's own unescaped-`\` semantics get consumed by the tokenizer before the argument reaches `destinationArgs` — that claim came from a diagnostic script whose own shell-escaping was wrong, not from `shell.mjs`. Rereading `tokenize()` directly shows it does not treat an unquoted `\` as an escape at all outside quotes; a clean re-test confirmed the backslash argument survives intact and the bypass is real (`cp /tmp/x.md -\..\resources\y.md` was `allowed: true` pre-fix, matching the forward-slash case exactly once the leading `-` sits in its own segment). The regex was restored to cover both separators, the dropped test was reinstated with the correct separator placement, and both are proven red-without-the-fix and green-with-it by direct before/after runs, not inferred. Whole-suite battery 43/43 in `path-boundary.test.mjs`, 858/859 guard-wide mid-session (the one red test was the skeleton-log `check-procedures` case for this item's own in-progress work log, resolved by filling its `done:` block). Full gate PASSED 20/20 at close, mutation score **76.26%** against the 75.5 floor.

## TASK 90 — `isTemplate` matches any filename that mentions templates, case-insensitively · `bugfix` · `TODO`

**Opened 2026-08-30 by `TASK 88`'s own gate run, which produced the instance rather than a hypothesis.** `isTemplate` (`scripts/guards/lib/templates.mjs`) discovers templates as *"any file whose basename contains TEMPLATE"*, with the `i` flag: ``/(^|[/\])[^/\]*TEMPLATE[^/\]*\.(md|ya?ml)$/i``. So a **work log about render templates** is a template. `TASK 88`'s log, named `...-render-template-surface.md`, failed `check-templates` with two findings — no `instances:` declaration, and no self-declaration in its body — neither of which a session log has any business carrying.

**The reproduction, so it survives the workaround.** Any file under `progress/` whose slug contains the word `template` fails the `templates` gate step with exactly those two findings. Verified 2026-08-30; `TASK 88`'s log was renamed to clear the gate, which is a workaround and is recorded as one.

**Why the loose form is not merely untidy.** It is the same class as `TASK 74` (a title word displacing the type field) and `TASK 65`/`TASK 68` (a checker that cannot classify its artifact): a guard deciding what an artifact *is* from a substring that the artifact's subject matter can supply. It fails in the direction that costs — a **false positive** that blocks a green gate — and its remedy is `P-13`'s: derive the property. **All four real templates share one shape**, checked rather than assumed: `ADR-TEMPLATE.md`, `SPEC-TEMPLATE.md`, `EC-TEMPLATE.yaml`, `EVAL-TEMPLATE.md` — uppercase, and `TEMPLATE` as the final `-`-separated segment of the basename.

**Done:** `isTemplate` accepts the four real templates and rejects a `progress/` log whose slug contains the word `template` in any casing; the discriminator is a declared property of the naming convention, not a list of the four filenames (`P-13`); and the red battery in `scripts/guards/lib/templates.test.mjs` carries the false-positive case above and fails when the fix is reverted (`T-04`, `P-14`).

**Constraints**

- **Do not solve it by renaming files.** That is what `TASK 88` did to get its gate green, and it leaves the next person who writes about templates to rediscover this.
- The `no templates discovered` vacuity guard must still fire — a fix that narrows the predicate to nothing would pass every other assertion silently.

## TASK 92 — A comment-only heredoc marker defeats `commandContexts`' decomposition entirely, for every hard rule · `bugfix` · `DONE`

**Opened 2026-08-30, found by an `adversarial-auditor` pass `TASK 84` ran on itself before closing, per the agent's own "always on a guard or a boundary" instruction — and independently re-verified in this session before being recorded (`P-11`).** `heredocSpans` (`scripts/guards/lib/shell.mjs:58-73`) finds a heredoc start with `/<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/` matched against each *raw line*, with no check that the `<<` is real shell syntax rather than text inside a comment. A `#`-prefixed line containing the literal text `<<EOF` matches identically to a real heredoc opener, and `stripDataRegions` then drops every line up to the next occurrence of the delimiter — including real commands — from what the guards ever see:

```bash
# <<EOF
cat private/glossary.md
EOF
```

Verified directly: `checkBashPaths` returns `{"allowed":true,"findings":[]}` for this string, and the same shape does the identical thing to `rm -rf resources/` (`H-02`), `tee evidence/runs/x` (`H-03`) and `git commit -m x` (`checkGitWrite`, `H-01`) — confirmed for all four, not assumed from the read case alone. Bash itself treats line 1 as an ordinary comment (the `<<EOF` is never a real heredoc opener, since nothing precedes it that could receive one) and executes line 2 for real; the guard's line-only regex has no way to know that without at least confirming a heredoc marker sits at the END of a real command, not inside a comment or a quoted string on its own line.

**Severity: this is not a shell-vector gap in one boundary. It is a decomposition-layer hole under all four**, including `H-01` — the one hard rule whose entire justification is that a git write must never happen unreviewed. `TASK 84`'s own fix, and every prior `path-boundary.mjs` hardening (`TASK 61`, `83`, `86`, `87`), sits downstream of this function and inherits the gap regardless of how precise the boundary-specific logic gets.

**Done:** a heredoc marker is recognized only when the shell would actually treat it as one — at minimum, not when it appears after a `#` on the same line (a fuller fix may also need to rule out one inside an already-open quote, which `stripDataRegions`' existing single-quote handling may or may not already cover incidentally — checked, not assumed, before declaring this done). Red battery proving the fake-marker bypass is closed for at least one boundary directly and confirming the same fix closes it for the other three via the shared function (not four separate patches). `T-04`/`P-14`: this is exactly the shape of guard that must be proven in red, not just observed passing a happy path.

**Closed 2026-08-30, same day, worked together with `TASK 93` in one sitting.** First fix: `isRealHeredocOpener(line, idx)`, walking `line` up to the regex match tracking quote state, returning `false` inside an open quote or after an unquoted `#` at a word boundary (whitespace or line-start only). `heredocSpans` called it before registering a span. **The open question in this entry's own Done line — whether an already-open quote around the marker was incidentally already handled — was checked, not assumed, and the answer was no**: the original ran a bare per-line regex with zero quote state, so `echo "<<EOF"` matched identically to a genuine opener; the first fix's own test proved this specific case closed.

**The first fix landed, passed its own tests and a full gate run — and was wrong, the same shape `TASK 84` hit one session earlier.** A scoped `adversarial-auditor` pass (this item's and `TASK 93`'s new code only, not a broad re-audit) found the word-boundary rule too narrow (`;#`, `&#`, `)#`, `|#` all start a real comment in bash — confirmed via `bash -c`; the first fix only recognized whitespace/line-start), the quote tracking reset to `null` on every physical line (so a quote genuinely spanning more than one line left an interior marker scanned from a false start — this directly refuted the open-question note above, which was answered correctly for the same-line case and wrongly assumed complete), and no backslash-escape awareness outside quotes (`echo \<<EOF` — bash reads the escaped `\<` as literal and the lone `<` as a failing redirect, never a heredoc). All three independently re-verified against real bash (GNU bash 5.2.15) and the real guard functions before being trusted (`P-11`), not accepted on the audit's word.

**The rewrite:** `scanLineForHeredoc(line, quoteIn)` replaces `isRealHeredocOpener`, threading quote state across `heredocSpans`' own outer loop instead of re-deriving it from nothing per line; `COMMENT_BOUNDARY` widens the word-boundary set to the standard shell metacharacters (`\s|&;()<>`` `, deliberately excluding `$` — `$#` is a real parameter expansion); an unquoted backslash now skips the character it protects before anything else is tested. A fourth issue, self-found while building the wider boundary set rather than audit-reported: a herestring (`<<<word`) could be misread as a heredoc opener with delimiter "word" to search for later — closed with a `line[i-1] !== '<'` guard, plus removing an initially-added but redundant `line[i+2] !== '<'` guard once hand-simulating its own surviving mutant proved the anchored delimiter regex already rejects a third `<` on its own.

Verified directly against the real `checkBashPaths`/`checkGitWrite` functions, before and after, for every one of the four original reproductions AND all three audit findings: all now correctly denied.

**Red battery:** `shell.mjs`'s colocated test file grew from 58 to 85 tests across this item and `TASK 93` together — the original comment/quote battery, plus the three audit-reproduction tests (F1/F2/F3) and the herestring anti-regression test. Whole-suite guard battery: 1007/1007 green.

**Mutation:** scoped run on `scripts/guards/lib/shell.mjs` went from the 80.73% baseline to **86.76%**, zero unsuppressed survivors in the new `scanLineForHeredoc`/`heredocSpans` code. Six genuinely equivalent survivors suppressed with real Stryker directives (the loop's own off-by-one; the comment-detection return's object literal, since `quote` is provably `null` there; and the `c==='<' && line[i+1]==='<'` sub-checks, since the anchored regex re-validates the literal characters regardless of that boolean shortcut) — each confirmed `status: Ignored` in the report. **Full gate: PASSED, 21/21, exit 0. Aggregate mutation score 78.34%** against the 77.0 floor. Detail: `progress/2026-08-30-04-task92-heredoc-comment-bypass.md`.

## TASK 93 — `eval` is recognized as neither a flag-wrapper nor a direct-argument wrapper — the shortest bypass in the wrapper set · `bugfix` · `DONE`

**Opened 2026-08-30, same audit as `TASK 92`, independently re-verified in this session.** `commandContexts` (`scripts/guards/lib/shell.mjs:216-258`) descends into a command hidden inside a wrapper via two named sets: `FLAG_WRAPPERS` (`sh`, `bash`, `zsh`, `dash`, `ksh`, `powershell`, `pwsh`, `cmd` — a command passed as a flag's argument, `sh -c "..."`) and `DIRECT_WRAPPERS` (`env`, `nohup`, `xargs`, `time`, `timeout`, `sudo`, `doas`, `stdbuf`, `nice`, `ionice` — a command passed as trailing positional arguments). `eval` is a third, real shape — `eval "COMMAND STRING"` — and is in neither set, so `commandContexts` never descends into its argument at all; the whole invocation is treated as one opaque call to the program named `eval`, which matches no entry in `WRITES` or `READS` and triggers no redirect scan on its own literal text.

Verified directly: `eval "cat private/glossary.md"` reads the file (`H-04`), `eval "rm -rf resources"` deletes it (`H-02`), and `eval "git commit -m x"` reaches `checkGitWrite` with `allowed:true` (`H-01`) — all three confirmed against the real functions, and contrasted directly against `sh -c "cat private/glossary.md"` on the identical payload, which **is** caught, proving the gap is `eval`'s specific absence from the wrapper sets rather than a general decomposition failure.

**Done:** `eval` recognized as a wrapper (most naturally added to `FLAG_WRAPPERS`'s shape, since its argument is a command STRING rather than a sequence of direct arguments like `env`/`timeout`) and its contents descended into exactly as `sh -c` already is. Red battery: the three reproductions above, each proven denied after the fix and confirmed denied-nowhere-before-it via a before/after run rather than inferred from the code reading correct (`P-11`). Whether `settings.json`'s file-tool-adjacent deny rules or any other wrapper spelling (`command eval "..."`, a function wrapping `eval`) reopen a narrower version of the same class is worth a note in the closing log, not necessarily a blocking requirement of this item.

**Closed 2026-08-30, same day, worked together with `TASK 92` in one sitting.** First fix: `EVAL_WRAPPERS` set and a dedicated branch, rather than folded into `FLAG_WRAPPERS` as the entry's Done line first suggested — `eval` joins every argument with a space and re-parses the result, matching neither existing wrapper shape. Verified against all three named reproductions, denied.

**The first fix landed, passed its own tests and a full gate run — and was wrong, the same shape `TASK 92`'s own audit found.** The same scoped `adversarial-auditor` pass found `eval -- "git commit -m x"` still escaping every hard rule: bash's `eval` builtin, like every builtin that calls its own `no_options()`, silently consumes a single leading `--` as an end-of-options marker before evaluating the rest — the first fix's `argv.slice(1).join(' ')` did not discard it, so the joined string started with a stray `--` matching no allowlist entry and no `WRITES`/`READS` head. Independently re-verified against real bash (`bash -c 'eval -- "echo RAN"'` really executes) and the real guard functions before being trusted (`P-11`).

**The fix:** strip a single leading `--` (only when it is literally `argv[1]`) before joining the rest. Two adjacent cases the audit specifically distinguished, and this fix had to get right rather than over- or under-correct: a lone `-` is NOT consumed (bash tries to run a command literally named `-`, which fails) and only the FIRST of two consecutive `--` is consumed (the second becomes the attempted command name) — both covered by their own tests, not just the one reported bypass.

Verified directly against the real functions, before and after: `eval -- "cat private/glossary.md"` (`H-04`), `eval -- "rm -rf resources"` (`H-02`), `eval -- "git commit -m x"` (`H-01`) all now denied.

**Red battery:** ten tests total for this item in `shell.mjs`'s colocated test file (shared 58 -> 85 total with `TASK 92`): the original seven, plus the `eval --` reproduction, the read-boundary contrast, and the lone-dash/double-dash near-misses the audit deliberately did not report as bugs but that a narrower or more aggressive fix could still get wrong. Whole-suite guard battery: 1007/1007 green.

**Mutation:** covered by the same scoped run as `TASK 92` — `scripts/guards/lib/shell.mjs` at **86.76%**, zero unsuppressed survivors in the `EVAL_WRAPPERS` branch (the earlier `argv.length > 1`/`>= 1` equivalent pair moved to a single `rest.length > 0` check, still equivalent at the empty case for the same reason, still suppressed with a real directive, confirmed `status: Ignored`). Nine other `eval`-spelling angles the audit tried (path/extension, `VAR=` prefix, nesting, substitution, empty argument, metacharacters, unquoted multi-token) held with no fix needed — recorded as confirmed-solid, not just an absence of findings. **Full gate: PASSED, 21/21, exit 0. Aggregate mutation score 78.34%** against the 77.0 floor. Detail: `progress/2026-08-30-05-task93-eval-wrapper.md`.

**Also found while closing this item, filed separately rather than folded in:** `TASK 95` — a `DIRECT_WRAPPERS` candidate (`env`, `timeout`, …) is never itself recursed back through `commandContexts`, so a `FLAG_WRAPPERS`/`EVAL_WRAPPERS` command reached *through* one of them (`env sh -c "..."`, `env eval "..."`) still escapes every hard rule. Pre-existing, unrelated to this session's diff (`DIRECT_WRAPPERS` untouched by either fix) — verified directly and severe enough (defeats `H-01`) to warrant the same reordering-ahead-of-the-queue flag `TASK 92`/`93` themselves got from `TASK 84`.

## TASK 94 — Shell-level expansion (globs, variables, `cd`, unresolved redirection/substitution forms) is unexamined residual, not yet a stated one · `documentation` · `DONE`

**Opened 2026-08-30, same audit as `TASK 92`/`TASK 93`.** Beyond the two fixable decomposition bugs above, the audit demonstrated a class of bypass that a text-only, non-executing guard cannot resolve by pattern-matching harder: `cat priv*/glossary.md` (glob), `P=private; cat $P/glossary.md` (variable expansion), `cd private && cat glossary.md` (relative path after a `cd` the guard has no notion of), `cat priv\ate/glossary.md` (a backslash `normalize()` already strips, confirmed live), `echo private/glossary.md | xargs cat` (the path arrives at `cat` only at runtime, through a pipe, never as literal text in the static command string), input redirection (`< private/glossary.md` has no counterpart to `redirectTargets`' `>` handling), and process substitution (`<(...)` is not in `commandContexts`' substitution scan, which only knows `$()` and backticks).

**Why this is `documentation` and not `bugfix`.** `checkBashPaths`'s own docstring already states an honest, bounded scope — "does not and cannot catch a script the agent wrote and then executed" — but does not name shell-level expansion as part of that boundary, and the two problems are different in kind. `architecture.md §L` is the place this residual is supposed to live; checked and it is silent on the specific forms above. Closing that gap honestly is a documentation act. Some of the individual forms ARE narrow, fixable decomposition gaps in the same shape as `TASK 92`/`TASK 93` (input redirection and process substitution both belong in `shell.mjs` next to the code that already handles `>` and `$()`/backticks, and are worth their own follow-on `bugfix` items once this one has named them precisely) — but the data-flow-through-a-pipe class (`xargs`, and any future construct with the same shape) is not a pattern-matching problem at all; it would need either executing the pipeline in a sandbox to observe what actually runs, or accepting it as a permanent, structural limit of a `policy-controlled` (`G-07`), non-executing guard.

**Done:** `architecture.md §L` (or the nearest equivalent) names shell-level expansion and runtime data flow (glob, variable, `cd`, pipe-to-dynamic-command) as a stated, bounded residual — matching the standard `P-15`/`G-07` already hold every other honestly-scoped limit to — with the input-redirection and process-substitution sub-cases split out as their own `bugfix` `TODO` entries once named here, rather than silently folded into a "someday" note.

**Closed 2026-08-31.** `architecture.md` §L carries a new subsection, *The limit of a non-executing guard — shell-level expansion*, sitting between the axis table and the blast radius, and axis 9's own row now points at it rather than implying coverage it does not have. The residual is stated as a **class** — anything the shell resolves after the guard has read the command text — with the individual forms used only as illustrations, because the enumeration is known to be incomplete by construction and a roster-shaped claim would rot exactly the way this entry's own glob claim did (`P-13`, `P-16`).

**Three of this entry's opening claims did not survive validation against the real functions, and correcting them was most of the item's value (`P-04`).** First, **the glob claim was wider than the truth**: a wildcard bypasses only when it sits in or before the segment naming the boundary — `cat private/__pro*` is **denied**, because the literal prefix survives into `isInside`. Second, **input redirection and process substitution are not open, they are covered by accident**: `cat < private/__probe__` and `diff <(cat private/__probe__) /dev/null` are both denied today — not because either construct is understood, but because `tokenize` leaves the path in `argv` and the head sits on the `READS` roster in `'all'` mode, where every argument is checked anyway. Off that roster the identical form passes (`node -e 1 < private/__probe__`, `echo <(cat private/__probe__)`). The coverage is a property of a roster, not of the mechanism. Third, and absent from this entry, the hand-off and all eight closed bypass items: **expansion reaches the command HEAD, so the residual reaches `H-01`** — `G=git; $G commit -m x` and `g*t commit -m x` both return `allowed: true`, and `H-01` is the boundary whose entire point is that a git write is never unreviewed. Brace expansion (`rm -rf {resources,docs}`) was found by the same probe and had been named nowhere at all — which is the evidence for stating a class rather than a list.

**The two follow-on `bugfix` entries this `Done` line asks for were deliberately not opened, and the deviation is recorded rather than silent (`A3`, `P-19`).** That sentence was written hours before `INC-17`, `P-19` and the goal triage existed. The finding above settles it: input redirection and process substitution are not fixable decomposition gaps sitting next to `>` and `$()` — they are the same class as the rest of the series, and their present denials come from a roster rather than from anything a fix would extend. Opening them would have made this the ninth bypass item in the surface whose whole diagnosis is that it generates work rather than receiving it. Both are named in §L instead. The author took this decision at the checkpoint.

**`TASK 97` and `TASK 98` are `RETIRED` into this item** — their deliverable moved here, which is what `RETIRED` means in this register, and both entries stay in place carrying the pointer. **`TASK 91` stays `TODO`**: it is a write-boundary configuration gap on `private/**`, not an expansion one, and its own `Done` has a recorded-decision branch that deserves its own sitting rather than being closed inside someone else's item (`P-01`).

**`shell.mjs` was not touched.** Two docstrings in `path-boundary.mjs` were, both pointers to §L rather than second copies of it (`G-10`): `checkBashPaths`' own scope note now separates *what the guard cannot see* from *what does not exist yet*, and the `READS` residual comment records that removing an entry from that map silently widens a residual §L states.

Detail: `progress/2026-08-31-01-task94-shell-expansion-residual.md`.

## TASK 95 — a `DIRECT_WRAPPERS` candidate is never itself unwrapped, so a chained `env sh -c "..."`/`env eval "..."` escapes every hard rule · `bugfix` · `DONE`

**Opened 2026-08-30, found while closing `TASK 93` and independently verified against the real functions before being recorded (`P-04`).** `DIRECT_WRAPPERS` (`env`, `nohup`, `xargs`, `time`, `timeout`, `sudo`, `doas`, `stdbuf`, `nice`, `ionice`) handles `env git push` by offering every argv suffix as its own candidate context, pushed directly: `found.push({ argv: argv.slice(i), ... })` (`scripts/guards/lib/shell.mjs`, the `DIRECT_WRAPPERS` branch of `commandContexts`). That candidate is never itself passed back through `commandContexts` — it is a terminal `argv` array, checked only by each boundary function's own head/args logic. That works for `env git push` (one of the offered suffixes literally starts with `git`, which `checkGitWrite` matches directly) and even for `env timeout 5 git push` (chained `DIRECT_WRAPPERS`-on-`DIRECT_WRAPPERS` still works, because *some* suffix is still a bare `git ...` argv). It does **not** work when the wrapped command needs actual unwrapping rather than a bare positional match — a `FLAG_WRAPPERS` command (`sh -c "..."`) or an `EVAL_WRAPPERS` command (`eval "..."`) hides its payload inside one quoted **string** argument, and a raw, non-recursed suffix like `['sh', '-c', 'cat private/glossary.md']` is never unwrapped into the command it names.

Verified directly against the real functions: `env sh -c "cat private/glossary.md"` (`H-04`), `env eval "cat private/glossary.md"` (`H-04`), and `env sh -c "git commit -m x"` (`H-01`) all return `{"allowed":true}` — confirmed pre-existing (not introduced by `TASK 92`/`93`'s diff: reproduced against `git show HEAD` unchanged, and the mechanism is `DIRECT_WRAPPERS`, which neither of those items touched). Contrasted directly against `env timeout 5 git commit -m x`, which **is** caught (`{"allowed":false, ...}`) — proving the gap is specifically "a wrapper reached *through* `DIRECT_WRAPPERS` that itself needs recursion to unwrap," not a general `DIRECT_WRAPPERS` failure.

**Done:** every `DIRECT_WRAPPERS` candidate is also recursed back through `commandContexts` (not just offered as a raw suffix), so a `FLAG_WRAPPERS`/`EVAL_WRAPPERS` command reached through `env`/`timeout`/`sudo`/etc. is unwrapped the same way it would be at the top level. Red battery: the three reproductions above, each proven denied after the fix via a before/after run against the real function (`P-11`), plus confirmation that the existing `env`/`timeout`-suffix tests still pass (no regression in the case that already worked by brute-force offering).

**Closed 2026-08-30.** The fix extracts the two string-carrying wrapper families into a module-private `wrapperContexts(argv, via, depth)` and passes every offered `DIRECT_WRAPPERS` suffix through it at `depth + 1`; the raw suffix push is unchanged, so the brute-force path that already worked is untouched.

**The obvious fix was measured and rejected, and this is the part worth keeping.** Re-joining the suffix and recursing on the string — `commandContexts(suffix.join(' '), …)`, the shape the hand-off implied — turns `['env','sh','-c','git commit -m x']` into `sh -c git commit -m x`, where `-c`'s argument has collapsed to the single word `git` and `commit` is a separate token. `checkGitWrite` on that returns `{"allowed":true}`: the re-join looks like a fix, passes a naive test, and leaves `H-01` open. The helper therefore takes an argv and never re-serializes, and a test pins the joined form's genuine weakness so nobody re-derives it.

**A nested `DIRECT_WRAPPERS` suffix is deliberately not re-entered**, on a completeness argument rather than a shortcut: the loop already offers every suffix of the whole argv, and a nested wrapper's suffixes are `argv.slice(i).slice(j) === argv.slice(i + j)` — a strict subset. Re-entering would add only duplicates, and on an adversarial `env env env …` line, exponentially many under the depth cap. `env timeout 5 sh -c "git push"` is caught through `env`'s own suffix list, and a test asserts `via === ['env','sh']` — pinning the mechanism, not just the outcome (`P-16`).

**Two corrections to this entry's own opening claims, found by validating rather than restating (`P-04`).** First, `env eval "..."` is **not** a live bypass: `eval` is a shell builtin with no executable on `PATH`, so `env`/`nice`/`sudo` answer `env: 'eval': No such file or directory`. The guard catches the form anyway — over-reporting is the stated direction for these wrappers (`INC-07`) — but it is hardening, and closes no live hole (`C-02`). Second, the gap was **wider** than recorded here: it reaches all four boundaries, `H-01`, `H-02`, `H-03` and `H-04`, through any of the ten heads. Verified live against real bash: `env sh -c`, `nohup sh -c`, `timeout 5 sh -c`, `nice sh -c`, `xargs sh -c` and chained `env timeout 5 sh -c` all execute their payload.

**Evidence.** 13 tests red before the fix, green after — split by kind (`T-08`): 7 decomposition tests in `shell.test.mjs`, 4 for `H-01` in `git-write.test.mjs`, 4 for `H-02`/`H-03`/`H-04` in `path-boundary.test.mjs`. Guard suite 1022 pass / 0 fail. **Gate 21/21, exit 0**; mutation **78.36%** against the 77.0 floor, with **zero survivors on the three lines this change introduces** (the 9 survivors in that window all sit on lines that existed verbatim before it). The floor was not moved — a `bugfix`-type improvement, matching `TASK 84` and `TASK 92`/`93`.

**The scoped `adversarial-auditor` pass found a live bypass this fix does not close, and it is filed as `TASK 96` rather than folded in (`P-01`).** `env -S "git commit -m x"` — `env`'s own string-splitting option — packs a whole command into one argument `env` itself field-splits. That is `FLAG_WRAPPERS` shape reached through a head classified only as `DIRECT_WRAPPERS`, a different mechanism from this item's, and this item's `Done` does not cover it. Independently re-verified before being recorded: all four spellings execute under GNU coreutils 8.32, and all four boundaries return `allowed:true`. The audit also confirmed both claims this fix rests on, finding no counterexample to either.

## TASK 96 — `env -S` / `--split-string` packs a whole command into one argument, so `env` is a flag-wrapper nobody classified as one · `bugfix` · `DONE`

**Opened 2026-08-30 by `TASK 95`'s closing `adversarial-auditor` pass, and independently re-verified against the real functions and real bash before being recorded (`P-04`, `P-11`).** `env` sits in `DIRECT_WRAPPERS`, whose model is "every remaining token is its own command word." `env -S "git commit -m x"` breaks that model: `-S` takes **one** string argument that `env` itself splits into a command line — exactly `FLAG_WRAPPERS`' shape (`sh -c "…"`), except `env` is in neither `FLAG_WRAPPERS` nor `EVAL_WRAPPERS`, so nothing ever re-tokenizes it. The suffix `['git commit -m x']` reaches the checkers as a single token whose `basename` is the whole string `"git commit -m x"` — not `git`, and not any `WRITES`/`READS` head — so it matches no boundary at all.

Verified: `env -S "git commit -m x"` (`H-01`), `env --split-string="git commit -m x"` (`H-01`), the glued `env -S"git commit -m x"`, the bundled `env -vS "git commit -m x"`, `env -S "rm -rf resources/home.en.md"` (`H-02`), `env -S "rm -rf evidence/trace.jsonl"` (`H-03`) and `env -S "cat private/__probe_does_not_exist__"` (`H-04`) all return `{"allowed":true}` from both `checkGitWrite` and `checkBashPaths`. All four spellings **execute** under GNU coreutils 8.32 on this machine. Pre-existing and unrelated to `TASK 95`'s diff — `env`'s classification was untouched by it.

**Scope note.** `env -S` does not spawn a shell, so a redirection inside the string is passed literally to the program rather than performed — the escape vector is direct binary execution (`git`, the `rm`/`mv`/`cp`/`tee` mutators, the `cat`/`grep` readers), which is precisely what the four boundaries exist to stop.

**Done:** `env`'s string-splitting option is decomposed like the flag-wrapper it is, so the packed command is re-tokenized and reaches the boundary checkers as a real argv. Every spelling above proven denied after the fix via a before/after run against the real functions (`P-11`), the separator (`-S x`), glued (`-Sx`), long (`--split-string=x`) and bundled (`-vS x`) forms each covered, plus confirmation that `env`'s existing `DIRECT_WRAPPERS` behaviour (`env git push`, `env sh -c "…"`, `env timeout 5 git push`) is unchanged.

**Closed 2026-08-30, same sitting as `TASK 95`, whose closing audit opened it.** `splitStringArgs(argv)` collects every string a split-string option hands to the wrapper; `wrapperContexts` recurses `commandContexts` on each at `depth + 1`. Placed in `wrapperContexts` rather than in the `DIRECT_WRAPPERS` branch on purpose, so it also fires when `env` arrives as another wrapper's suffix — `sudo env -S "…"` is denied, and a test asserts it.

**The first fix was wrong, and a second scoped audit caught it — the third consecutive item in this surface where that happened** (`TASK 92`, `TASK 93`, now this one). It matched the long option by exact spelling. GNU `getopt_long` accepts any unambiguous abbreviation, and `split-string` is env's **only** long option beginning with `s`, so `env --s "git commit -m x"` walked through all four boundaries while `env -S "…"` was correctly denied. Verified independently before being accepted: `--s`, `--sp`, `--spl`, `--split-str` and `--split-strin` all execute under coreutils 8.32, in both the `=value` and separate-value forms. `longSplitStringValue` now matches by prefix, with `--` end-of-options and non-prefix long options (`--unset`, `--u`, `--ignore-environment`) tested to stay out.

**One deliberate non-denial, tested so it is not later "fixed" into an over-deny.** `env -uS "git commit -m x"` stays **allowed**, because `-u` consumes the `S` as the name of the variable to unset and env then tries to exec a program literally named `git commit -m x`. Confirmed under coreutils 8.32, alongside `-CS` (`cannot change directory to 'S'`) and `-0uS`. `ENV_VALUE_OPTS` therefore stops the cluster scan at `u` and `C`, which `env --help` confirms are the only value-taking short options besides `S` itself. A missing entry would make the scan over-report, which is the safe direction (`INC-07`).

**Evidence.** 12 tests red before their fix, green after, split by kind (`T-08`) across `shell.test.mjs`, `git-write.test.mjs` and `path-boundary.test.mjs`, covering the separator, glued, long, abbreviated, bundled and repeated forms plus the `-uS` grammar case. Every spelling proven denied by a before/after run against the real functions (`P-11`); `env git push`, `env sh -c "…"` and `env timeout 5 git push` unchanged.

**Two further findings, filed rather than folded in (`P-01`, `P-06`):** `TASK 97` (`sudo -s`/`-i`, the same shape in another program — recorded as unproven in execution, since no POSIX sudo exists on this machine) and `TASK 98` (`powershell -EncodedCommand`, confirmed executing, but a base64/UTF-16LE decode step rather than a set membership).

## TASK 97 — `sudo -s` / `-i` pass their remaining arguments to a shell, the `env -S` shape in a different program · `bugfix` · `RETIRED`

**Retired 2026-08-31 into `TASK 94`.** The deliverable moved, it was not dropped: this is an obfuscated wrapper form of the class `architecture.md` §L now states as a bounded residual, and its `Done` line already offered exactly that exit — *"if that cannot be arranged, the item closes as `documentation` naming the form as a stated residual rather than guessing at a grammar nobody here can run."* It could not be arranged; there is no POSIX `sudo` on this machine. The finding below stays in place, unchanged and still unproven-in-execution, because ids are stable and the reasoning is what a second operator would need (`P-19`, `G-07`).

**Opened 2026-08-30 by `TASK 96`'s closing `adversarial-auditor` pass.** `sudo` and `doas` sit in `DIRECT_WRAPPERS`. POSIX `sudo -s` and `sudo -i` pass their remaining arguments to `$SHELL -c` — the same "one argument holds a command line" shape as `env -S`, in a program the guard classifies as direct-argument only. `sudo -s "git commit -m x"`, `sudo -i "git commit -m x"`, `sudo -s "cat private/__probe_does_not_exist__"` and `doas -s "git commit -m x"` all return `{"allowed":true}` from both checkers — confirmed against the real functions.

**Recorded as unproven-in-execution, deliberately (`C-01`).** Unlike `TASK 96`, this was **not** confirmed against a real shell: the only `sudo` on this machine is Windows `C:/WINDOWS/system32/sudo`, which has a different option set and triggers elevation, and `doas` is absent. The finding rests on reading the guard plus documented POSIX sudo semantics. That is enough to open an item and not enough to call it a demonstrated live bypass — the distinction `TASK 95` had to make about `env eval`, one item earlier.

**Done:** the `-s`/`-i` command-passing forms of `sudo`/`doas` are decomposed like the flag wrappers they are, with the POSIX semantics confirmed against a real POSIX sudo first — or, if that cannot be arranged, the item closes as `documentation` naming the form as a stated residual rather than guessing at a grammar nobody here can run.

## TASK 98 — `powershell -EncodedCommand` carries a base64 command past `EVAL_FLAGS` · `bugfix` · `RETIRED`

**Retired 2026-08-31 into `TASK 94`.** The deliverable moved, it was not dropped. This is the strongest-evidenced entry in the series — the form **executes on this machine**, confirmed — and it is retired anyway, which is the point worth keeping: `P-19` asks which goal closing an item serves and who would notice if it stayed open, not how well-proven the finding is. A base64 UTF-16LE payload is what an adversary writes; this project has one operator and no adversary, and `architecture.md` §L now says so out loud rather than leaving a silent hole. The finding below stays in place, unchanged, and returns to scope with a second operator.

**Opened 2026-08-30 by `TASK 96`'s closing `adversarial-auditor` pass.** `FLAG_WRAPPERS` covers `powershell`/`pwsh`, and `EVAL_FLAGS` covers `-c`, `-command`, `/c` and `-e` — but not `-EncodedCommand` / `-ec`, which take the same command as **base64-encoded UTF-16LE**. `powershell -EncodedCommand <base64>` and `pwsh -ec <base64>` return `{"allowed":true}` from both checkers, and the form **executes on this machine** — confirmed by running a harmless encoded `echo`.

**Why this is its own item rather than an `EVAL_FLAGS` row.** Every other entry in that set names an argument that already *is* the command; this one names an argument that must be base64-decoded from UTF-16LE before it is a command. That is a decode step in the decomposition path, with its own failure modes (invalid base64, the `-e`/`-ec`/`-enc` prefix family, encodings that are not UTF-16LE), not a one-line addition to a set.

**Done:** the encoded-command forms are decoded and re-decomposed, or the form is denied outright as undecodable — either is a defensible answer and the choice is made explicitly, with a red battery covering the prefix family and a malformed payload.

## Goal alignment — the triage of 2026-08-30

**The two goals this project exists for**, stated by the author and binding on the register:

1. **A clean portfolio, published, plus the repository itself as a public exhibit** — the harness included, as evidence of how the work was done.
2. **A harness good enough to export to the author's other projects**, improving their **efficiency**. Not their security: the author is currently the only operator, and hardening against an adversary who does not exist is work that serves nobody. Security returns to scope when a second person does.

**Why this section exists.** `INC-17`: eight of the twelve items closed between 2026-08-29 and 2026-08-30 were command-decomposition bypasses in one file. Each was real. None advanced either goal, and the series was divergent by construction — every audit of that surface opened one to three more items in it. `P-19` is the rule that came out of it. This table is that rule applied once, to the whole open register, so the next session inherits a sorted board instead of a flat list.

| Serves | Items | Note |
|---|---|---|
| **Goal 1 — publish** | ~~`TASK 110`~~ · ~~`TASK 111`~~ · ~~`TASK 112`~~ · ~~`TASK 30`~~ **all `DONE` 2026-09-01** · `TASK 32` **built 2026-09-01, unpushed** · `TASK 28` · `TASK 29` | ~~**71 items are closed and nobody can see any of it.**~~ **Shipped 2026-09-01:** the repository is public and its CI is green, so the harness half of goal 1 is visible to a reader for the first time. What remains here is the deploy (`TASK 32`) and the two content items. **`TASK 110` and `TASK 111` are first as of 2026-09-01**: CI cannot go green at all until the e2e hang is fixed, and cannot finish in a sane budget until the heavy tiers leave the per-push path — and `TASK 30`'s own `Done` is a green run on the remote |
| **Goal 1 — content** | `TASK 6` · `TASK 20` · `TASK 19` · `TASK 76` · `TASK 104` · `TASK 27` · `TASK 113` · `TASK 114` · `TASK 115` · `TASK 116` · `TASK 117` | The pages a reader actually judges. **`TASK 113` onward were opened after this triage and are added here rather than left off it** (`P-07`): all are `feature` items whose whole deliverable is a home-page surface a reader reads — the recommendations column, the stack strip, the employer strip, and the two corrections the author's review of that strip opened (`TASK 116`, `TASK 117`). Each carries its own `Goal served` line as `P-19` requires; this row is the summary. **Said "the last three" until 2026-09-03**, when adding two ids made the count false — the index row and the entries it points at drifting apart in the same edit is `P-07`'s own characteristic failure, so the phrasing is now open-ended rather than a number to re-check |
| **Goal 1 — credibility** | ~~`TASK 94`~~ **`DONE` 2026-08-31** · ~~`TASK 101`~~ **`DONE` 2026-09-01** | `TASK 94` **retired the bypass series** by stating the residual instead of chasing it — the cheapest high-leverage item on the board, and it closed without opening a single item in the surface it documents. `TASK 101` decided the exhibit is `README.md` only and rewrote it |
| **Goal 2 — the deliverable** | ~~`TASK 9`~~ **`DONE` 2026-09-04** · `TASK 100` (the measurement) | `TASK 9`'s own trigger was *the first `EVAL` with a real, non-harness workload*, and nothing was advancing it. **Waived at A3 on 2026-09-04 and the item shipped**, on the reading that installing the harness on the two target projects *is* that workload — so the export is the vehicle by which the trigger fires rather than an advance on it. `TASK 100` is no longer the unblocker; it is the measurement the export was built to make cheap, and it is the only item left under this goal |
| **Goal 2 — efficiency & trust** | `TASK 89` · `TASK 78` · `TASK 81` · `TASK 73` · `TASK 102` | **This note was wrong and is corrected 2026-08-31.** `TASK 39` already closed the silent-pass class: the step **FAILS**, loudly, and nothing is quietly unverified. What it costs is a gate that intermittently cannot be trusted to have run — `T-06` shaped, one tier over from `TASK 69`/`TASK 85`. `TASK 89`'s own hand-off had already retracted this premise, and it survived here for a day (`P-07`) |
| **Stated residuals — not tasks** | `TASK 91` · ~~`TASK 97`~~ · ~~`TASK 98`~~ | Obfuscated-command bypasses. Real, verified, and **nobody on this project would notice them**: an adversary writes `env --s`, a mistaken agent writes `git commit -m x`. `TASK 94` named the residual on 2026-08-31, so **`97` and `98` are now `RETIRED` into it** and live in `architecture.md` §L as documented limits. `TASK 91` stays open — it is a write-boundary configuration gap, not an expansion one, and §L does not cover it. All three return to scope with a second operator (`P-19`, `G-07`) |
| **Deferred — no goal served today** | `TASK 38` · `TASK 11` · `TASK 14` · `TASK 75` · `TASK 90` · `TASK 85` · `TASK 69` | Ratchet upkeep, small guard bugs and two flakes. Real, none of them visible to a reader or to the author's throughput |

**Recommended order:** ~~`TASK 94`~~ (`DONE` 2026-08-31) → ~~`TASK 89`~~ (**worked 2026-08-31, left open** — both candidates refuted, flake unreproduced across six controlled runs; `TASK 103` shipped out of it) → ~~`TASK 30`/`TASK 32`~~ → ~~`TASK 9`~~ (`DONE` 2026-09-04, ahead of `TASK 100` rather than after it — see the row above) → `TASK 100`.

**`TASK 89`'s placement is now the author's call, not the register's default.** Its slot rested on the note corrected above, and the honest reading after 2026-08-31 is that it belongs beside `TASK 85` and `TASK 69` under *Deferred — no goal served today* unless the flake fires again: six controlled runs, a tier of 15 tests, a step that fails loudly rather than passing silently, and no invocation shape on this machine that can recreate the condition. Left in place rather than moved, because demoting an item on the strength of not reproducing it is exactly the judgement `P-19` says belongs to a person.

## TASK 99 — Goal-alignment triage, and the rule that prevents the drift · `planning` · `DONE`

**Opened and closed 2026-08-30**, after the author asked the question the register could not answer: *does any of this serve the two goals?* It did not, and the honest answer produced `INC-17`, `P-19`, the triage table above, and `TASK 100`–`TASK 102`.

**Done:** `INC-17` transcribed in `docs/harness/architecture.md` §C; `P-19` in `.claude/rules/10-process.md` with that origin and a rung that does not overclaim; every open item sorted against the two goals, including the ones this triage demotes to residuals; the items that serve the goals and did not exist yet, opened.

## TASK 100 — Drive the harness on a real, non-harness workload · `harness` · `TODO`

**Opened 2026-08-30 by `TASK 99`.** `TASK 9` (Harness export v2) is the deliverable of goal 2, and it is blocked on its own stated trigger: *the first `EVAL` with a real, non-harness workload*. That trigger has never fired. Every evaluation to date has scored the harness against work on the harness — which is precisely the closed loop `INC-17` describes, and the reason the efficiency problems the export is supposed to carry are still invisible.

**Why this is the unblocker and not a nice-to-have.** An export written now would carry what was *designed*, not what *worked* — the failure `TASK 9`'s own entry warns about, and the same shape as `C-02` one level up. The harness has never been measured against a codebase it did not build.

**Done:** the harness is installed on one of the author's other projects and drives at least one real work item there end to end, with a scorecard produced from that run. The findings — what transferred, what did not, what needed rewriting for a project with different conventions — land in `progress/` as the input `TASK 9` is waiting for. **Scope discipline:** the point is the measurement, not perfecting the harness mid-flight; defects found there are recorded, not fixed in the same pass (`P-06`).

## TASK 101 — The repository as the portfolio's public exhibit · `content` · `DONE`

**Opened 2026-08-30 by `TASK 99`.** Goal 1 names the repository itself — harness included — as something a reader should be able to look at. Nothing in the register carries that: `TASK 30` publishes the repository, but publishing is not exhibiting, and a visitor who lands on it today finds no entry point explaining what they are looking at.

**The concern, stated once (`P-17`), because it is a real one.** `C-15` requires every page to reinforce one thesis: *connecting legacy critical systems to modern services in regulated environments.* A case study about agent tooling does not reinforce that, and bolting one onto the site would dilute the differentiator the whole portfolio is built to protect — the single framing mistake `CLAUDE.md` says costs the most. **The resolution is the framing, not the omission:** what this exhibit shows is *the same engineering discipline the case studies claim, applied where the reader can audit it themselves* — spec-first, boundaries that are enforced rather than asserted, honest scoping of what a control does not cover. That is evidence for the thesis rather than a second thesis.

**Done:** a decision on where the exhibit lives — repository `README.md` only, or a site page — made explicitly and recorded; if a site page, it passes `C-15` on the framing above rather than on an exception. Both locales if it becomes a page (`C-09`).

**Closed 2026-09-01. Decided with the author: `README.md` only, no site page.** A site page would pull `C-09`'s both-locales obligation into an item whose entire subject is the harness, for a page most portfolio readers never navigate to — the repository README already reaches the audience that opens the repository at all. `README.md` rewritten to the framing above: the exhibit *is* the same discipline the case studies claim, not a second thesis, stated in those words. English only — the root README carries no locale suffix and sits outside `content.roots`, the same precedent `TASK 4` set for the GitHub profile README.

**The move this required:** the previous `README.md` was actually the `resources/` content-conventions doc, never relocated when `CLAUDE.md`'s own layout table was written. It moved to `docs/content-conventions.md`, with its one dangling reference fixed along the way (`CLAUDE.md §3.1`, which does not exist, corrected to `.claude/rules/20-content.md`) and its stale "the future site" language corrected to describe the site that exists. `CLAUDE.md`'s *Where knowledge lives* row repointed. `docs/specs/SPEC-TASK-25-*.spec.md` cited `README.md §Diagram tags` by name in two places (`related_docs` and `CASE-003`'s prose) — `check-docs` would not have caught the staleness (it checks that a path resolves, not that a cited section still exists there), so both citations were corrected to `docs/content-conventions.md` in the same change rather than left for someone else to find (`P-07`).

**No numbers invented (`C-01`).** The README states only what the repository already records: 20 gate steps, the mutation floor's current measured value (`stryker.config.mjs`), `enforcement_environment: policy-controlled` — and states the confidentiality-check gap out loud rather than omitting it, matching `TASK 106`'s own resolution of the same gap. **The CI badge is deliberately not yet in the file** — added only once `TASK 106`'s fix is confirmed green against the real remote (`T-10`); adding it before that is asserting a result nobody has observed.

## TASK 102 — Every open item declares the goal it serves · `harness` · `TODO` · **deferred, with a trigger**

**Opened 2026-08-30 by `TASK 99`.** `P-19` sits at rung 4 — judgment — and `G-11` says a rule's rung moves when its mechanism does. The mechanization is available: `status-history.mjs` already parses every `TASK` heading in this file, so a guard could assert that each `TODO` carries a goal marker and fail on one that does not.

**Deliberately not built yet, and the reason is `P-19` itself.** Building it now means editing 26 existing entries to add a marker, to enforce a rule that has existed for one day and has been applied exactly once — ceremony bought before the judgment has been shown to fail. **Trigger:** a second drift of the shape `INC-17` describes, or the register passing ~40 open items, whichever comes first.

**Done:** when triggered — a goal marker in the heading grammar, `check-status-history` asserting it as a property rather than a roster (`P-13`), and `P-19`'s rung updated to 2 with the claim made honest (`G-11`).

## TASK 110 — `e2e smoke` hangs in CI; the gate reports nothing while it does · `bugfix` · `DONE`

**Opened 2026-09-01**, after a third consecutive GitHub Actions run was cancelled at its timeout. Two sessions had already acted on this symptom — `TASK 107` added caching and a 90-minute bound on a root cause it stated as *"a compute-bound cost, not a hang"*, `TASK 108` cut the e2e tier from three browser engines to one — and **neither moved the wall time at all**. Both runs died at exactly 90 minutes. A 3× reduction that changes nothing was never fixing what was wrong, and that is the tell this item started from.

**Root cause, read from the run rather than reasoned about (`P-04`).** `astro preview` runs in the **foreground** unless `--background` is passed *or* it detects an AI coding agent in the environment (`isRunByAgent()`, backed by `am-i-vibing`, whose variable list contains `CLAUDECODE` and does not contain `GITHUB_ACTIONS`). The author's gate runs inside an agent, so the preview daemonized, `execFileSync` returned, and the suite passed — locally, every time, for weeks. On a runner the same line blocks forever: `globalSetup` never returns, zero tests run, nothing is printed. The last cancelled run's own cleanup named it, one screen below where anyone had looked: `Terminate orphan process: (6262) (npm exec astro preview)`.

**The second failure, which is why it took three runs.** `gate.mjs` captured each step's stdout and printed it when the step **finished**, so a step that never finished printed nothing — 89 minutes of empty log. A hang and a slow run are indistinguishable when the instrument only reports at the end. `INC-18` is both halves.

**Deliverable:** `site/tests/e2e/preview-lifecycle.ts` asks for the daemon explicitly; every gate step carries a time bound and a hung step FAILS naming it; the gate writes a progress line per step to **stderr**, which is inherited rather than captured, so a cancelled run names the step it died in.

**Proven in red before the fix and green after, with the CI condition reproduced locally** — `env -u CLAUDECODE node node_modules/@playwright/test/cli.js test`: killed at the 180s bound having run no test, failing at `preview-lifecycle.ts:16` inside `globalSetup`; after the fix, **171 passed in 51.7s** under the identical environment. The three new mechanisms were each neutered and their batteries re-run: the timeout branch, the progress lines and the malformed-bound check all fail red and pass restored (`P-14`).

**CLOSED 2026-09-01 against run `33566729304`, read from the provider (`T-10`).** `e2e smoke` **PASS in 29.1s** on a real runner — the step that had consumed 90 minutes and verified nothing in each of the three previous runs. The whole job finished in **1m57s**, reached all 22 steps, and printed per-step timing for the first time (`> [5/22] e2e smoke (fast, bound 10m00s)` … `< [PASS] e2e smoke 29.1s`). The deferral mechanism behaved: steps 6 and 7 ran nowhere and cost nothing.

**That run's gate is RED, and not for anything this item touched.** Reaching steps 16 and 18 for the first time exposed two guards that could never have passed on a runner — `TASK 112`, opened for it. Closing this item on a red run is deliberate: its `Done` is about the hang, the hang is gone, and folding an unrelated failure into it would make "done" mean four things again (`P-01`, `INC-01`).

**Done:** a real `harness.yml` run on a push **passes `e2e smoke`** and reaches the end of the gate, with per-step timing visible in the Actions log. Read from `gh run view`, never inferred from a green local gate (`T-10`). A failure there for some other reason is a new finding, recorded rather than folded into this one.

**Constraints**
- **`TASK 107`'s diagnosis is corrected in place, not deleted.** Its caching work is real and stands; its root cause was wrong, and a wrong cause left in the register is one the next session re-derives.
- The bounds are **chosen, not measured** (`C-01`). The first CI run with per-step timing is what corrects them.

---

## TASK 111 — Gate profiles: the heavy tiers leave the per-push path · `harness` · `DONE`

**Opened 2026-09-01**, from the author's own framing: the CI run has to finish, or nothing ships, and *"ningún extremo es positivo"*. `TASK 110` fixes the hang; this item answers the cost that is still there once it is fixed. Stryker's default concurrency is `os.availableParallelism() - 1` — 11 on the author's machine, **2** on a standard runner — across ~7,900 mutants. The local cold run measures ~10–11 minutes; **no CI run has ever produced a number**, because the hang sat in front of it every time. **[True when written, superseded the same day: 8m11s — see this item's closing note.]**

**Serves goal 1 first, goal 2 second.** Seventy-one items are closed and nobody can see any of it (`TASK 30`, `TASK 32`); a gate that cannot go green on a push is what stands between the repository and its own audience. The harness half is that the mechanism is one an export can carry.

**Deliverable:** every step in `scripts/gate.mjs` declares a `tier`; `runGate` takes a profile and reports a step outside it as **`DEFER`** — a fourth verdict, deliberately not a `SKIP`. `fast` (the bare command, and every push) runs everything except the mutation run and the visual-capture matrix; `full` (`--profile full`) runs everything, nightly in CI, on demand, and in the local run that closes a work item. The e2e tier splits by tag rather than by file: 69 tests on a push, 102 tagged `@deep` in the full profile — 69 + 102 = 171, checked rather than assumed.

**What this is not, stated because it is the whole risk.** Nothing left the `mutate` glob, the floor did not move (`break: 77.0`), and no test was deleted. This is **cadence, not coverage**. Three mechanisms keep that honest rather than aspirational: a deferral is printed by name with the profile that runs it, the headline reads `GATE PASSED (profile: fast)` and never a bare `GATE PASSED`, and `wrap-up` requires `--profile full` to close an item. If any of the three is lost, this becomes a gate that verifies less while saying the same thing — which is exactly the failure `runGate`'s own header records the harness making once before.

**The concern raised and accepted, once (`P-17`).** Making `fast` the default changes what "the gate passed" means, and the author chose that trade deliberately after being shown it. The residual is real and belongs in the record rather than in a footnote: between a push and the next nightly run, a mutation regression is not caught by CI.

**First half CLOSED 2026-09-01 against run `33570798170` — success, 2m30s.** `GATE_PROFILE: fast` derived from the trigger; `DEFER   e2e visual capture` and `DEFER   mutation` in the summary; the deferral block printed with the profile that runs them and the sentence that deferred is not verified; `SKIP  confidentiality` the only skip; job green. The two deep steps cost the runner nothing, which is the entire point of the item. **The second half — a manual full-profile run — is `33571567866`, dispatched the same day.**

**Earlier, partially evidenced by run `33566729304`:** the profile was derived from the trigger (`GATE_PROFILE: fast`), both deep steps were deferred and cost nothing, and the headline read `GATE FAILED (profile: fast)` — the profile is in the verdict, as designed. What that run did NOT show is the deferral block, which `TASK 112` traces to output lost at `process.exit()`. So this item stays open on its own terms.

**CLOSED 2026-09-01. Both halves, two real runs, read from the provider (`T-10`).** Push: `33570798170`, success in 2m30s. Full profile: `33571567866`, dispatched manually with `GATE_PROFILE: full`, **success in 11m8s**.

**And the full run produced the number this whole sequence was missing.** `mutation` on GitHub's 2-core runner: **8m11s, cold** — no incremental cache to restore, since this was the first deep run — scoring 79.49 against the 77.0 floor. `e2e visual capture`: 53.8s.

**That measurement contradicts the estimate this item was built on, and the contradiction is recorded rather than buried (`P-04`, `C-01`).** `TASK 107` reasoned from Stryker's concurrency default — 11 workers locally against 2 on a runner — that a ~10-11 minute local run would become *"hours rather than minutes"*. It became **eight minutes**. The arithmetic was sound and the conclusion was wrong, because a 5x drop in workers is not a 5x drop in wall time on a step that is not purely parallel. Nobody could have known: three runs died before `mutation` ever started.

**So the tier assignment is now a live decision instead of a forced one, and it belongs to the author.** Keeping mutation `deep` costs a mutation regression going unseen between a push and the nightly run; moving it back to `fast` costs every push ~8 minutes instead of ~2.5. **Recommendation: keep it `deep`** — the fast gate's whole value is that it answers in the time somebody will actually wait for, the nightly run and the local `--profile full` that closes a work item both catch a regression before it reaches anything, and the incremental cache this run just saved makes subsequent deep runs cheaper still. Recorded as a decision with a stated cost, not as a default nobody revisited.

**One clause of this Done was written wrong and is corrected rather than quietly reinterpreted (`P-07`).** It asked for a push run reporting `GATE PASSED (profile: fast)`, and CI can never print that: `confidentiality` skips on every runner by design (`H-04`), so the honest headline there is `GATE INCOMPLETE`, which the workflow then accepts. What the clause was actually reaching for — *the profile is visible in the verdict and both deferrals are named* — is satisfied, and is what the corrected wording asks for.

**Done:** a push run derives its profile from the trigger, names both deferred steps and the profile that runs them, and goes green (`GATE INCOMPLETE` with `confidentiality` as its only skip is the accepted shape in CI, never a bare pass); **and** a manual `gh workflow run ci.yml -f profile=full` completes the full profile inside its bound. Two real runs read, neither inferred from the other. If the full run does not fit, the number is recorded and the decision is taken on it — a larger runner, a validated incremental cache, or a different cadence — never a lowered floor.

**Constraints**
- **One workflow file.** `check-docs` validates `.github/workflows/ci.yml` by name; a second file would carry no guard at all, which is `INC-08` arriving through a filename instead of a filter.
- The deep tier runs on a `schedule`, and **GitHub disables scheduled workflows after 60 days of repository inactivity** — recorded so a silently-stopped nightly is recognized rather than discovered.

---

## TASK 112 — Two guards that could never pass on a runner · `bugfix` · `DONE`

**Opened 2026-09-01, by the first CI run that got far enough to find them.** `TASK 110` fixed the hang; the gate then reached steps 16 and 18 for the first time in this repository's history and both failed — `check-docs` with eleven findings, `check-content` with one. Every one is the same shape:

```text
TASKS.md cites `private/glossary.md`, which does not exist
.claude/rules/00-hard-rules.md cites `private/glossary.md`, which does not exist
docs/harness/contracts.md cites `private/banned-terms.txt`, which does not exist
guards.config.json  resources/site/intake.md is exempt but does not exist
```

Four files: `private/glossary.md`, `private/banned-terms.txt`, `reports/mutation/mutation.json`, `resources/site/intake.md`. All four exist on the author's machine. All four are **gitignored on purpose** — `private/` by `H-04`, `reports/` and the intake notes by explicit decisions recorded in `.gitignore` itself. None can ever reach a runner.

**The citations are correct and stay.** `H-04`'s own rule row names `private/glossary.md`; deleting the reference to make a checker happy is the tail wagging the dog, and `C-07`'s instinct one level up. What was wrong is the question the guard asked. *"Does this file exist?"* is a question about a machine. The question a checkout can answer is *"does the repository claim to contain this?"* — and for a path git deliberately ignores, the answer is no, on every machine, by design.

**Deliverable:** a missing reference is still a finding, **except** when git itself says the repository excludes it, in which case it is printed by name as a machine-local reference and does not fail the gate. Derived by asking `git check-ignore` — the same source of truth the checkout obeys — never from a list of paths kept in a config (`P-13`). The same predicate settles `check-content`'s stale-exemption check.

**Verified against the real condition, not a fixture.** A tree containing exactly what a push carries (`git ls-files -co --exclude-standard`, 483 files, no `private/`, no `reports/`, no `intake.md`) reproduces CI locally. Before: `check-docs` FAIL 11, `check-content` FAIL 1. After: both PASS, with all eleven references printed by name. Three red paths on that same tree: neutering the oracle brings all eleven back as hard findings; a planted citation to a file that was never written is still caught; and a planted typo *inside* an ignored path is excused — the stated residual — but printed by name where a reader sees it.

**A third defect, found by reading the CI log rather than by a test.** The summary table and the deferral block are absent from that run's log, while every stderr line survived. The likely cause is `process.exit()` dropping queued stdout on POSIX, where writes to a pipe are asynchronous — **not reproducible on this repository's Windows machine**, so it is recorded as likely rather than proven (`C-01` applies to a cause as much as to a number). The fix is `process.exitCode` and a return, which is correct regardless and costs nothing. **This matters more than it looks: CI takes the INCOMPLETE branch on every run** (`H-04` keeps the term list off the runner), so a truncated summary there is the normal case, and it would have silently swallowed the deferral list `TASK 111` exists to print. The next CI run is the test.

**CLOSED 2026-09-01 against run `33570798170` — success, 2m30s — read from the provider (`T-10`).** Every clause of the Done below is in that log: `GATE INCOMPLETE — 1 of 22 step(s) did not run:` with `SKIP  confidentiality` as the only skip, the workflow's warning annotation and a green job, all eleven machine-local references printed by name under `check-docs`, and **the full summary table and the deferral block both present** — which is the evidence for the exit-handling fix, since that branch is the one CI takes every time and the one whose output had gone missing. Per-step timing on a 2-core runner, for the record: `guard tests 2.0s`, `e2e smoke 31.1s`, `type check 7.9s`, everything else under a quarter of a second.

**The `process.exit()` cause is now supported rather than merely likely.** It was recorded as unproven because two attempts to reproduce it on Windows showed no truncation; the fix landed anyway, and the output that had vanished came back on the next Linux run. That is evidence for the explanation, not a proof of it — nobody re-ran the old code to watch it fail — and it is written down at that strength deliberately.

**Done:** a push run reaches `GATE INCOMPLETE` with `confidentiality` as its only skip, the workflow accepts it, and the job is green — with the summary table and the deferral block both present in the Actions log. Read from `gh run view` (`T-10`).

**Constraints**
- **The guard must not go blind.** A dangling citation to an ordinary path stays a hard finding; that is the defect class this guard was built for (`architecture.md` cited two files thirteen times that had never been written), and it has its own red path on the runner-equivalent tree.
- **The residual is stated, not engineered around** (`P-19`): a typo inside an ignored path is excused everywhere, because it is indistinguishable from a real machine-local citation without asking a human what that directory is supposed to hold. Every excused reference is printed by name on every run, which is the mitigation. A stricter design — parsing `git check-ignore -v`'s matched pattern and demanding the ignored directory be absent — was written out and declined: it buys one narrow case at the cost of a pattern parser nobody asked for.

---

## TASK 115 — Home: the employer strip · `feature` · `DONE`

**Closed 2026-09-03.** `node scripts/gate.mjs --profile full` — GATE PASSED (profile: full), 22/22, mutation 80.18% against a 79.0 floor. `/` and `/es/` render "Where I've worked" between the hero and the work bento, four cards, sourced from `experience.{en,es}.md`'s `roles[]` with no employer name or year hardcoded anywhere in `site/`. Verified against the real built screenshots, not the gate summary alone — `site/screenshots/home.en.1440.dark.png` and its light/es/390/1024 siblings.

**The real finding was a defect the tests could not see, twice, and both were caught only by looking at a screenshot.** NICE's brand mark is pure black. The first fix — paint the wordmark with `currentColor` so it follows the theme — was verified by inlining the SVG directly in a preview render and looked correct there; in the actual component, every logo renders via `<img src>`, which does not cascade the page's CSS `color` into the loaded SVG document at all, so the deployed card was still unreadable in dark mode. The corrected mechanism is a sibling-file convention (`<basename>-dark.svg`, shown only under the site's real `[data-theme="dark"]` attribute — `prefers-color-scheme` cannot see a runtime toggle) with no schema change. **The second failure was procedural, not architectural**: the tracing session's own scratch script silently reverted a promoted asset on a later, unrelated re-run, so the first hand-off of the dark variant shipped a byte-identical copy of the light one — Vite deduplicated the two to one file, so the swap "worked" and rendered nothing different. Found by hashing both files, not by re-eyeballing a render.

**`SPEC-TASK-115` closed at `version` 1.1, `approved_version` 1.1** — the dark-variant mechanism is real behavior the original `version` 1.0 did not describe, so it went back to the author before any more code landed on top of it, exactly the gate `H-05` exists to hold open.

**Two loose ends carried, both pre-existing and outside this item's own surface**, recorded in `progress/2026-09-03-01-task115-employer-strip.md`: a stray literal `</content>` tag closing `EmploymentEntry.astro` and `EmploymentRecord.astro`, and two mutation survivors in `buildCaseStudyRow` unrelated to this change.

**Superseded opening note follows, kept for the trail.**



`Main.dc.html`, `HomeMobile.dc.html` and `HomeES.dc.html` all carry a fully designed "Where I've worked" / "Dónde he trabajado" section (`#employers`, between the hero and the work bento) that `TASK 24` explicitly omitted: at the time, the four employers existed only as prose in `about.{en,es}.md`, and hardcoding four names was the one thing that item's own criteria forbade. `TASK 20`/`26` closed that gap — `experience.{en,es}.md` now carries `roles[]` with `company`, `period` and an already-declared, never-populated `logo` key — and the section's own heading string has been sitting unused in `ui.{en,es}.md` since the chrome strings landed (`home.employers_heading`). The blocker named in 2026-08-26 is gone; nobody has come back to build the section itself.

**Goal served (`P-19`):** goal 1, publication. It's the second section on the page in the design and the first place a reader sees the four-employer thread the whole site's thesis is built on — right now the home page jumps from the hero straight to project tiles with no "who did this reader just land on" beat at all.

**Done:** `/` and `/es/` render the employers section between the hero and the work bento, sourced entirely from `experience.{en,es}.md`'s `roles[]` (company, period, logo) via the same `getExperienceRecord` the `/experience` page already uses — no hardcoded employer name or year anywhere in `site/`. Each card links to `/experience` (`/es/experience` in Spanish). A role with no `logo` renders the wordmark alone rather than a placeholder. A `logo` that names a file with no asset behind it fails the build, naming the role — same contract `stack.mjs` already enforces for the tech strip. `node scripts/gate.mjs --profile full` passes, including a design-fidelity diff against the `.employers` section of all three artboards, both themes.

**Constraints**

- **`site/src/components/home/` is at 6 of 6 files (`S-03`)** — this item adds none there. The new component(s) live in a subfolder, `site/src/components/home/employers/`, the same split `work/` already uses for `WorkBento`/`CaseTile`/`CaseMotif`.
- **No new content collection.** The data already exists as `roles[]` inside the `pages` collection's `experience` entry; this item reuses `getExperienceRecord(lang)` rather than duplicating employer facts into a second source.
- **The logo-resolution mechanism does not exist yet, and this item builds it.** `EmploymentEntry.astro` already has a `logo?` prop and renders `<img src={logo}>`, but nothing today turns a frontmatter `logo:` string into a real, build-resolved asset URL, unlike the stack strip's `MARK_SOURCES` glob (`content-queries.ts:245-247`). Mirror that pattern for `resources/logos/employers/*`, including the same "declared logo, no asset behind it" build failure `stack.mjs:124-125` already enforces.
- **Blocked on the author for the logo files and the `logo:` field, and on nothing else** (`H-02`) — same shape as `TASK 114`'s block on its own content. The component, the resolution mechanism, the gateway wiring and the design-fidelity harness are all buildable and testable today with zero logos declared; only the final visual diff needs the real four.
- **`resources/logos/employers/` is the destination**, not `resources/logos/stack/` — named and reserved by `TASK 114` for exactly this, never created until now.

---

## TASK 116 — Employer strip: the logo becomes the dominant element · `feature` · `DONE`

**Closed 2026-09-03.** `node scripts/gate.mjs --profile full` — GATE PASSED (profile: full), 22/22, mutation 80.18 against a 79.0 floor on an incremental run reporting zero changed files, which is the correct result for an item that touched nothing under `site/lib/`. The logo now leads and the company name captions it, on `/` and `/es/`, at all three artboard widths and in both themes, with the artboards moved in the same change.

**The item's real defect was caught by a screenshot after every one of its own tests had passed — the third time in a row on this surface, and the pattern is now the finding.** The first implementation used a fixed 72×72 **square** slot, faithful to the artboard's existing shape. A square bounding box does not give a row of logos a common optical baseline: with `object-fit: contain` each mark scales to its own limiting dimension, so rendered cap heights came out 50 / 40 / 40 / **20** px across the four `viewBox` ratios, and Mamaya Tech read as a runt beside Avícola Sofía. Every `EMP-004` assertion passed against that version — the logo box *was* larger than the name, and nothing overflowed — because *"these four marks read as comparably weighted"* is not a proposition the DOM can answer. Corrected to a height-normalized slot (`height: 48px`, `width: auto`, `max-width: 100%`), which the spec's Coverage gaps had already named as the thing no test would catch.

**Two logo assets were corrected as part of this item, both defects invisible at 32px.** Mamaya Tech's traced orange layer was a full-bleed rect with the letters punched out as `evenodd` holes and a cream fill trimmed inside them, so the page background showed through as a dark outline on every letter in the dark theme. Banco Solidario's white fringe was **opaque** near-white rather than semi-transparent — measured, 469 opaque against 524 partial-alpha pixels — so no defringe pass could reach it, and its embedded raster was only 249×137. Both were re-produced outside `resources/**` and applied by the author (`H-02`); the replacements are 8,865 bytes against 17,973 and 36,760 against 70,259, the latter at 4.5× the source resolution.

**Two gate flakes this session, recorded with a candidate cause rather than as noise** (`T-06`): a `guard tests` step and a `component tests` step each failed once and passed on re-run, the latter with all three `src/behaviour/` suites erroring at module load while `git status` showed no change to any file they depend on. Both occurred while a second gate run was active on the same machine; concurrent runs share `node_modules/.vite`, `.astro`, `dist/` and Playwright's preview server. Unconfirmed, and in `progress/2026-09-03-02-task116-employer-logo-hierarchy.md` rather than dropped.

**Card ordering was raised by the author and answered without opening a behavior**: reverse-chronological stands, because the strip carries no axis, rule or arrow and so reads as a credential list rather than a timeline, and `/experience` already orders the same four facts newest-first. The trigger that would re-open it — an explicit timeline treatment — is named in the spec so it is re-decided rather than rediscovered.

**Superseded opening note follows, kept for the trail.**



**Opened 2026-09-03, from the author's review of `TASK 115`.** The strip shipped faithful to the artboard, and the artboard is what is wrong: `.logo-slot` is 32×32 against a 21px/700 `.employer-name` (`Main.dc.html:293-309`), so the name outweighs the mark it is supposed to caption. Inverting that hierarchy is a design change, not a fidelity bug — the three artboards move with the component or the fidelity diff reads the correction as a regression.

**Enlarging is also what makes two asset defects visible, which is why they are one item and not three** (`P-01` — they share a single checkable done). Both were diagnosed on rendered output during the review, not inferred: Mamaya Tech's traced orange layer was a rect with the letters punched out as `evenodd` holes and a cream fill trimmed ~1.5 units inside them, so the page background showed through as a dark outline on every letter — invisible on light, glaring on dark, worse at every size increase. Banco Solidario's mark carried a white fringe from a chroma-key cut whose residue was **opaque** near-white, not semi-transparent, so no defringe pass could reach it; its embedded raster was also only 249×137 and would have been the one blurry card at any larger slot. Both are fixed and re-rendered; the author has applied Mamaya and supplied a 1132×615 source that made a clean Banco Solidario extraction possible.

**Goal served (`P-19`):** goal 1, publication. The strip is the "who did this reader just land on" beat, and a logo the eye has to hunt for below a larger name does not deliver it. The reader who skims the home page in six seconds is who notices.

**Done:** `/` and `/es/` render the employer cards with the logo as the dominant element and the company name as its caption, matching the three artboards, which are updated in the same change. A role with **no** logo still renders its name at the full pre-caption size, so the wordmark-alone fallback stays legible rather than collapsing to a caption over an empty slot. `node scripts/gate.mjs --profile full` passes, including the design-fidelity diff against `.employers` in all three artboards, both themes, and no logo shows a background-bleed outline or a white fringe at the new size in either theme.

**Constraints**

- **The artboards change too, and in the same change.** `Main.dc.html`, `HomeMobile.dc.html` and `HomeES.dc.html` are the fidelity source of truth; changing only the component makes the diff report the fix as drift.
- **The design's own stated principle must survive the inversion.** The artboard records that *"the wordmark works ALONE; a logo is an enhancement layered on top of a name that already reads, never a replacement for it"* — a dominant logo slot means an employer without one now has a hole where the dominant element should be. The fallback branch is behavior, not styling, and it is tested.
- **The two asset files are the author's to write** (`H-02`). Corrected `mamaya-tech.svg` and `banco-solidario.svg` are produced outside `resources/` and applied by the author, same shape as `TASK 115`.
- **No change to the logo-resolution mechanism, the `logo:` schema, or the `-dark.svg` sibling convention.** `TASK 115` built all three and they hold; this item changes size, hierarchy and two asset files.
- **Card ordering does not change.** Reverse-chronological is deliberate and its reasoning is recorded in this item's spec: the strip carries no axis, rule or arrow, so it reads as a credential list rather than a timeline, and `/experience` — the page these cards link to — already orders the same four facts newest-first. Two orders for one set of facts is worse than either order.

---

## TASK 117 — Employer cards deep-link to their own role on `/experience` · `feature` · `DONE`

**Closed 2026-09-03.** `node scripts/gate.mjs --profile full` — GATE PASSED, 22/22, mutation **80.24** against a 79.0 floor, up from 80.18. Each employer card on `/` and `/es/` now links to its own role's anchor, `/experience` emits that anchor as a real target, and the reader lands on the role instead of the page top. Anchors are derived from `company` by a pure function in `site/lib/`; `resources/**` gained nothing to keep in sync.

**Shipped in two sequential slices, and the split was made on evidence rather than caution.** `TASK 116` was a 7-object slice whose implementer was cut by the 45-turn budget three times, so this item went out as `EMP-008` (the derivation and its tests) then `EMP-009` (the wiring and its e2e assertions). **The evidence then contradicted the diagnosis**: slice A owned 3 objects and was cut anyway. What consumes the budget on this surface is not writing — it is the verify loop (run Stryker, read survivors, write a test, re-run), which costs four or five turns per turn of the crank and cannot be skipped. Cutting by object count does not address that; the honest follow-on is to size by verification phase, or to raise `maxTurns` for items in the mutated surface, and neither is done here.

**`T-03` was applied rather than averaged.** The first mutation run left `employment-record.mjs` at 94.50% with six survivors. Two were the pre-existing `buildCaseStudyRow` pair carried from `TASK 115`; the other four were new, and each was a real untested behavior the spec's own edge cases named — the collision guard's skip condition and the punctuation-run collapse. Two were killed by new tests, each proven to kill its mutant by hand-applying the mutant and watching the test fail. The remaining two are **equivalent** — the collapse step guarantees no two adjacent hyphens, so `-+` and `-` cannot differ on any reachable input — and are suppressed at the mutant with a written, fuzz-verified reason rather than chased. **The first suppression silently did nothing**: a `disable next-line` anchors to the start line of the AST node the comment attaches to, which inside a multi-line method chain is the chain's first line, not the line below the comment. Recorded because the next person to suppress inside a chain will hit it.

**Two design decisions worth keeping visible.** `banco-solidario-s-a` is ugly and correct: stripping legal suffixes to get `banco-solidario` needs a roster of suffixes, and a roster passes forever until the first one nobody listed (`P-13`). And two roles deriving the same anchor **fails the build naming both**, rather than auto-suffixing — two stints at one employer is a real possibility for this record, and a reader clicking the second card and silently landing on the first is a broken promise no test would catch.

**Superseded opening note follows, kept for the trail.**



**Opened 2026-09-03, from the author's review of `TASK 115`.** Every card links to `/experience` and every one lands the reader at the top of the page, so the strip promises four destinations and delivers one. The link is not the defect: `EmploymentEntry.astro:33` emits no `id`, so no anchor target exists for a fragment to reach.

**Goal served (`P-19`):** goal 1, publication. A reader who clicks NICE wants the NICE role, and today has to find it by scrolling a page of four. The reader following the strip's own affordance is who notices.

**Done:** each card on `/` and `/es/` links to its own role's anchor on `/experience` / `/es/experience`, the target element carries that id, and the browser lands on the role rather than the page top — asserted end-to-end per locale, for all four roles, not only the first. Anchors are derived, not authored: no new key in `resources/`. `node scripts/gate.mjs --profile full` passes.

**Constraints**

- **The anchor is derived from `company`, per locale, and needs no cross-locale agreement to work.** The four `company:` values happen to be byte-identical across `experience.en.md` and `experience.es.md` (lines 10, 19, 31, 40), verified 2026-09-03 — but nothing depends on that: both ends of every link, the card's `href` and the target's `id`, are built from the same locale's data, so a name differing by locale would still link correctly within that locale. Recorded because the opposite is the intuitive assumption, and it would send someone building a parity check that should not exist.
- **A collision fails the build, naming both roles.** Two stints at one employer is a real possibility for this record, and auto-suffixing would send a reader clicking the second card silently to the first — a broken promise no test would notice. Whether two entries are two roles or one is the author's call, so the build stops rather than guessing.
- **The derivation is a pure function in `site/lib/`**, which puts it inside the mutation-covered surface (`T-01`, `S-06`) — accents, punctuation and the `S.A.` suffix all have to fall out deterministically, and that is exactly the parsing-and-joining logic `D3` scoped mutation to.
- **`resources/**` does not change** (`H-02`). An explicit `anchor:` key was considered and declined: it is a second thing to keep in sync per locale for a value the company name already determines.
- **The landing position accounts for whatever the layout puts above it.** A fragment that lands under sticky chrome is the same failed promise as one that lands at the top; `Rail.astro:86` is sticky and the target's `scroll-margin` is part of the behavior, not a cosmetic afterthought.
- **The strip's ordering, sizing and assets are `TASK 116`.** This item changes where a card points and what `/experience` exposes to point at.

---

## TASK 119 — The `design canvas` gate step has been red on the committed tree · `bugfix` · `TODO`

**Found 2026-09-04 by `TASK 9`, on a clean checkout of the canvas.** `node scripts/gate.mjs` fails at `design canvas`. `docs/design/canvas/derive.mjs` throws *"source strings not found"* for six testimonial and quote-mark markup fragments it expects in the artboard it derives the Spanish and mobile boards from. The artboard was edited and the deriver's expected fragments were not, so the derivation cannot run and nine structural assertions never execute.

**This is not `TASK 9`'s doing and it is not new.** The canvas sources are unmodified against `HEAD`, so the step is red at the commit, not in the working tree — which means at least one work item closed against a gate that was already failing this step. **That is the finding worth more than the fix**: `wrap-up` reads the gate's headline, and a `FAIL` on an unrelated step is exactly the shape a session in a hurry records as *someone else's problem* and then does not track (`P-06`). Nobody tracked it until an unrelated item ran the gate.

**Goal served:** goal 1 — the design fidelity diff is what keeps every rendered screen honest against its artboard, and a deriver that cannot run asserts nothing about the two boards it produces.

**Done:** `node docs/design/canvas/verify.mjs` exits 0 on a clean tree, with the deriver reading fragments that exist in the artboard rather than fragments somebody remembered; and the reason the two drifted apart is named — either the deriver reads structure rather than literal strings, or the artboard carries the fragments the deriver needs and something fails when it stops doing so.

**Constraints**

- **Do not re-seed by hand and call it fixed.** A fixture regenerated by reflex is a control that stops being read. If the fragments are the wrong abstraction, say so and change the abstraction (`P-13`).
- **No change to the artboards' design.** This is a deriver defect; whatever the artboard now says is the specification.

---
## TASK 118 — `isInside` decides three rung-1 boundaries case-sensitively, on a case-insensitive filesystem · `harness` · `TODO`

**Opened 2026-09-03 by the adversarial audit of `TASK 116`/`117`.** `scripts/guards/lib/path-boundary.mjs:33-35` compares normalized paths without folding case, so `isInside('RESOURCES/x', 'resources')` returns `false` on a tree where NTFS resolves both spellings to the same directory. Probed directly rather than inferred: `RESOURCES/`, `EVIDENCE/` and `PRIVATE/` all evaluate outside their boundary, so this reaches **`H-02`, `H-03` and `H-04` at once** — the audit found it on `resources/` only, and the other two came out of checking the function instead of the report.

**The repository already learned this lesson one function away and did not carry it across.** `repoRelative`, immediately below, folds case deliberately and its comment cites `INC-14`: *"A case-sensitive comparison then fails to relativize, the absolute path matches no boundary, and H-02/H-03 fail OPEN."* That fix was applied to the relativization step and never to the boundary decision the relativized path is then handed to.

**What is and is not claimed.** A live probe of `rm -f RESOURCES/<nonexistent>` was allowed by the guard and stopped by a later layer, so nothing was written — but `G-03` is explicit that a permission-engine block and a guard denial are not interchangeable, and `00-hard-rules.md` names the guard as the rung-1 enforcer of all three rules. Whether the downstream layer was a `deny` (survives every mode) or an `ask` (does not) was not determined; `permissions.disableBypassPermissionsMode: "disable"` is set, which narrows the exposure but does not restore the boundary.

**Goal served (`P-19`):** goal 2, the harness. The adversary is an agent doing bulk file work on Windows — the platform every session in this repository has run on — and the asset at risk is the content source of truth `H-02` exists to protect.

**Done:** `isInside` decides the same way for every spelling that the host filesystem resolves to the same path, proven in red for all three boundaries and both spellings (`P-14`, `T-04`), and the existing battery still passes. **Folding unconditionally is the expected shape and needs its trade-off stated rather than assumed**: on a case-sensitive filesystem it would deny a write to a genuinely distinct `RESOURCES/` directory, which is a false positive on a directory nobody has, against a rung-1 hole on the platform actually in use — `G-13`'s fail-closed direction. `node scripts/gate.mjs --profile full` passes.

**Constraints**

- **`repoRelative`'s existing case folding is not the fix and must not be widened into one.** It folds the *root prefix* so an absolute path relativizes at all; the boundary comparison it feeds is a separate decision and is what this item changes.
- **The red battery covers all three boundaries, not just the one the audit probed.** A fix verified only against `resources/` would leave `H-03` and `H-04` in exactly the state this entry was opened for (`P-13`).
- **No claim is made about other spellings until they are probed.** The audit listed absolute paths, backslash separators, variable indirection, quote splitting and interpreter writes (`node -e`, `python -c`) as untested vectors. They are named here so the gap is a stated limit rather than an implied all-clear; closing them is not this item's done.

---

## Deliberately out of scope

- **Demo / reconstruction projects.** A repo built in a hurry looks junior and
  contradicts the positioning. The case studies are the evidence.
- **Technical articles.** Later, derived from these case studies. Not now.
- **Agent orchestration machinery.** Role files with a bootstrap, guards and procedures — not a framework. No agent graph engine, planner, memory platform or agent-to-agent bus. The architecture permits them later; the harness does not contain them. Full list: `docs/harness/architecture.md` §M.

> **Amended 2026-08-17.** This section previously deferred *"agent workflows, spec pipelines, eval harnesses"* as premature, pending the content backlog closing. It has closed (TASKS 0–4 `DONE`), which is the trigger that entry named, and TASK 5 is that revisit. What remains out of scope is narrower and is stated above.
