# Harness v2 — architecture

> **Status:** Proposed · amended by the findings resolution · awaiting approval (blueprint step 1)
> **Date:** 2026-08-17 · amended 2026-08-17
> **Supersedes:** the tech-agnostic harness export brought in from a prior project. That file is deleted at blueprint step 12; everything load-bearing in it is transcribed here.

This is the single architecture document for the harness. It is the contract the implementation follows. Its companions are `contracts.md` (the six contracts), `evidence.md` (the trace schema), `.claude/skills/` (the procedures, as executable skills rather than a document), and `.claude/rules/` (the rules registry itself).

**Amendment record.** Twenty findings were raised against the first draft and resolved in [architecture-findings.md](architecture-findings.md), which then applied a proportionality filter (§16 there) asking of each amendment: *what failure does this prevent, and has that failure happened?* Amendments that could not name one are **specified here and not built**, with a named trigger. Sections marked **`[A-N]`** carry an amendment; the findings document holds the reasoning and the evidence, and is superseded once this document is frozen.

`A1`–`A21` and `A24` land in this document. **`A22`** (per-dimension `status` + `evidence` on the done-conjunction, capped at pointers) landed in `.claude/skills/wrap-up/` at step 9, enforced by `check-procedures`. **`A23`** (TDD as policy by work-item type, with `bugfix` requiring a bug-reproducing failing test) lands in `.claude/rules/30-testing.md` at step 2. Both are decided; neither has a file to live in yet. **`A24`** (every blueprint step ships its own executable acceptance check) was raised during step 2 and is recorded in §O.

---

## A · Executive decision

The inherited harness was a **method**: a rules registry with stable ids and provenance, a spec-first workflow with one hard human checkpoint, "done" defined as a conjunction of dimensions rather than a feeling, an adversarial audit that assumes the work is wrong, and a measurement protocol that is allowed to conclude the method is not paying. That method is sound and it is kept nearly intact.

What it did not have was a **runtime**. Every control lived in prose addressed to the agent. Security was an instruction. Evidence was markdown the agent itself authored. There was no permission model, no execution budget, no trust hierarchy, and no way to answer "what actually happened" except by reading the agent's own account of it. A harness whose only enforcement is instruction is a harness that works exactly as long as the agent chooses to cooperate.

Harness v2 keeps the method and adds a control plane underneath it. Seven layers — Intent, Knowledge, Policy, Orchestration, Execution, Evidence, Evaluation — with an explicit boundary between what the agent is *told* and what the agent is *prevented from doing*. The single architectural change, stated in one line:

> **Anything that matters is enforced at the lowest rung that can hold it, and the rung is declared. Prose is the last resort, not the first.**

Three consequences follow. Rules move to `.claude/rules/`, where the tool loads them automatically and the load is observable, so "the agent must read the rules" stops being a hope. The controls that must not be negotiable — git writes, the frozen content directory, delegation on an unapproved spec — become `PreToolUse` guards that deny regardless of what the agent decides. And every tool call, permission decision and guard verdict is appended to a JSONL trace, so the harness's own KPIs are read from artifacts rather than from prose written by the thing being scored.

What this is **not** an attempt to build: an agent orchestration framework. No agent graph engine, no planner, no dynamic role marketplace, no agent-to-agent bus, no memory platform, no telemetry product. The architecture must permit those later; the harness will not contain them. The deliverable is policy, workflow, execution contracts and evidence — four things, small enough that a new project adopts them in days.

One honest caveat, recorded here because it will be tempting to forget: this harness is heavier than a portfolio site of fifteen markdown files strictly requires. It is justified by two facts outside the site — the harness is a reusable artifact that will be exported to other projects, and it is itself evidence of engineering judgment. If `EVAL-000` and its successors show it is not paying, the correct response is to cut it, not to defend it.

---

## B · The architecture

```text
                              ┌──────────┐
                              │  HUMAN   │  approves · escalation target · owns git
                              └────┬─────┘
                                   │
  01 INTENT        Work Item (TASKS.md) — type: content|research|planning|
                                          feature|migration|bugfix|harness
                                   │
  02 KNOWLEDGE     ┌─ .claude/rules/*.md    normative, ALWAYS loaded (+ path-scoped)
                   └─ docs/harness/*.md     reasoning, read on demand
                      docs/adr/** · docs/specs/** · docs/security/** · resources/**
                                   │
  03 POLICY        trust hierarchy · permissions · boundaries · budgets
                   ┌─ .claude/settings.json      allow/deny/ask       ◄ runtime
                   ├─ .claude/rules/40-*.md      the statements       ◄ always loaded
                   └─ docs/harness/contracts.md  tables + reasons     ◄ on demand
                                   │
  04 ORCHESTRATION  main session (no role file — only it can ask the human)
                    skills: work-item · wrap-up · evaluate-harness
                                   │
  05 EXECUTION     ┌─ agents: implementer · test-engineer · adversarial-auditor
                   │          researcher · harness-evaluator
                   │  each: tools · model · maxTurns · permissionMode · 6 posture
                   │        dimensions, declared and checked          [A20]
                   └─ ONE PreToolUse entry point:
                        record-event · git-write · resources-readonly ·
                        evidence-readonly · delegation-gate (matcher: Agent) [A4]
                                   │
  06 EVIDENCE      evidence/runs/<session-id>/<run>.jsonl  ◄ hooks, gap-evident  [A11]
                   3 correlated events: tool.requested → policy.decision →
                   tool.result · executed is DERIVED, not stored          [A10]
                   progress/TASK-N-*.md · spec drift logs
                   rule: the artifact outranks the report
                                   │
  07 EVALUATION    evaluation-cases/EC-0NN.yaml · progress/evaluation-results/EVAL-0NN
                   L = context load · V = violations · outcomes          [A14]
                                   │
  ADAPTER          CLAUDE.md — identity, layout, commands, pointers. Nothing decides here.
```

### Layer responsibilities and boundaries

| Layer | Owns | Explicitly does **not** own |
|---|---|---|
| **Intent** | What the human wants, as one deliverable with a checkable done and a type | How it is built; behavior detail (that is the spec) |
| **Knowledge** | Rules, architecture, decisions, specs, security requirements, content | Wiring; anything tool-specific |
| **Policy** | What an agent may do, must ask for, and may never do; trust precedence; budgets | Task-specific scope (that is the run contract) |
| **Orchestration** | Which role runs, in what order, with what brief; the human checkpoint | Doing the work itself |
| **Execution** | Sandbox, filesystem, shell, network, credentials, tool authorization, limits | Deciding *whether* an action is allowed on policy grounds — it enforces, policy decides |
| **Evidence** | A verifiable record of what happened | Judgment about whether it was good |
| **Evaluation** | Whether the agent can do the task, and whether the harness is paying | Fixing what it finds |

### The three planes, restated

The inherited split survives and is the reason a tool migration is cheap:

```text
Canonical knowledge   docs/** + .claude/rules/**   tool-neutral, survives migration
        ↓
Executable procedures .claude/skills/**            ~50 lines each, rewritten per tool
        ↓
Tool adapter          CLAUDE.md + settings.json    mostly pointers and wiring
```

**The law of the split:** product knowledge, an architecture decision, or a rule body found inside the adapter or a procedure is a bug. Move it to the knowledge plane and leave a pointer.

### Trust: two ladders, not one **`[A1]`**

The first draft used a single seven-level ladder with `HUMAN_INSTRUCTION` at the top. That conflated two different questions and implied an in-session instruction could override a security boundary. It cannot — and the runtime already prevents it, so the document was describing the system incorrectly.

**The ladders themselves live in [`.claude/rules/40-agent-policy.md`](../../.claude/rules/40-agent-policy.md) (`G-01`, `G-02`)**, because they are normative and must be loaded into every session. This section holds the reasoning and the evidence, which must not be. Restating them here would be the law of the split violated in the document that defines it.

- **Authority ladder (`G-01`)** — `A1` non-negotiable policy · `A2` human instruction · `A3` negotiable policy · `A4` approved spec.
- **Data-trust ladder (`G-02`)** — repository data · tool output · external content · memory. All data, none of it instruction.

**Why A1 sits above human instruction.** Deny rules block in every permission mode, including `bypassPermissions`, and a `PreToolUse` hook returning `allow` cannot override one — Claude Code evaluates deny rules regardless of hook output. So the runtime already refuses to let an in-session instruction move a boundary; the first draft's single ladder was describing a permission model the tool does not implement. The human retains full control by editing the settings file and restarting. What they cannot do is waive a boundary conversationally, mid-run, under time pressure — and that is the property worth having.

**Realization rule:** a boundary that must not be waivable is expressed at A1, and A1 is realized as a `deny` rule — never as an `ask` rule, a procedure step, or prose.

**Why two ladders rather than one.** They answer different questions — *whose intent governs* and *what may be treated as an instruction at all* — and a single ordered list forces a false comparison between them. Nothing on the data ladder has authority at any level, so ranking it below the spec implied a precedence that does not exist.

**Provenance.** For anything at A1–A4 the harness must answer *where did this come from*. That is satisfied without a knowledge graph: every rule row carries an `origin`, every ADR a date and status, every spec a `version` and `approved_version`, every trace event a source and timestamp. Four fields, enough to keep human-approved policy distinguishable from untrusted external content.

---

## C · Origins — the incidents behind the rules

A rule with no origin is ceremony, and ceremony teaches people the registry contains things that do not matter. Every rule cites one of these. They are transcribed here in full so that nothing depends on the export once it is deleted.

**Inherited (`INC-01`…`INC-08`) — from the prior project, a multi-tenant SaaS built with AI agents by one developer.** They are real, and they are labelled inherited because they did not happen here; that distinction matters when reading the baseline evaluation.

| id | Incident | Produced |
|---|---|---|
| **INC-01** | **The seven-pass hydra.** One ticket mixed two deliverables (a scaffold *and* a feature). "Done" was declared four times, each meaning something different: compiled, then tests-green, then looks-about-right, then deployed. Each declaration was followed by a review that found more. Seven implement→verify passes instead of one; roughly twelve defects escaped past a "done" claim. | spec-first + human checkpoint; one deliverable per work item; done-as-conjunction; the done-dimensions table |
| **INC-02** | **The tests that tested nothing.** Fifteen "end-to-end" tests mocked every HTTP call and deliberately stalled the realtime handshake. They passed. The behavior they claimed to cover had *zero* real coverage. Nothing in a green suite distinguishes a real end-to-end test from a mocked one wearing the label. | the separate test role; the mutation gate; "if it would still pass with the server off, it is not an e2e test" |
| **INC-03** | **Dev ≠ prod.** The CSS framework purged styles that existed only in the shared package, so the production build lost them; development mode never showed it. Two visual reviews passed anyway, done against a dev server and at a glance. Seven element-level defects — *missing elements*, not colour nuances — survived. | the visual-QA rigor checklist; capture from a production-like build; a build-time canary guard |
| **INC-04** | **The agents that were never told the rules.** A subagent started cold, inheriting none of the project's always-loaded context, so every rule had to be re-typed into its brief by the orchestrator — and whatever the orchestrator forgot, the agent never knew. It produced code violating rules it had never seen. **Partially stale:** in the current tool subagents *do* inherit the CLAUDE.md hierarchy and project rules. The surviving half is that `docs/**` is still not auto-loaded, which is what bootstrap sections now cover. | delegation carries its own context; role files with a `## Bootstrap` section; the roster guard |
| **INC-05** | **The approval that wasn't.** Three implementers were delegated on the strength of a *plan* the human had approved. The human had never seen the spec. Worse, the spec's version moved after that approval, so the version implemented was one nobody had signed off on. | the artifact is the spec **file**; a plan approval is not the gate; a version bump past `approved_version` needs re-approval; the delegation gate |
| **INC-06** | **Slices sized by topic, not by finishability.** Three delegated slices were scoped by *surface* ("the hook guards", "all of CI"). All three agents ran out of context mid-run: ~301k tokens, **0 of 3** delivered. Re-cut as *objects* ("these six blocks, in these six files"), the same work on the same roles delivered **3 of 3** on ~182k. | size a slice by finishability, not topic; an agent cut off mid-run delivers zero, not half |
| **INC-07** | **The guard that guarded a list.** A guard carried a hardcoded roster of known-good names. It passed forever, including for the seventh item nobody added to the list. A rule enforced against a roster stops protecting anything the moment the roster goes stale — silently. | validate properties, never a roster |
| **INC-08** | **CI that never ran.** Two workflows filtered on `paths:` for their own directories. A guard added at the repository root ran in CI exactly **zero** times since it was written, and nobody could tell, because the local gate was green. | CI as its own done-dimension; the unfiltered workflow; "a green local gate is not evidence CI fired" |

**Native (`INC-09`…`INC-15`) — this repository's own history.**

| id | Incident | Produced |
|---|---|---|
| **INC-09** | **A target published as an outcome.** The `otp-provider-decoupling` case study presented a ~70% run-cost reduction and specific latency figures as achieved results. The rollout never completed — the plan was approved and execution began, but the OTP flow was never cut over before handover, so no measured number exists or ever will. The error had already propagated into `home.{en,es}.md` and `about.{en,es}.md`, which cited it as a completed fact. Corrected 2026-08-15 across six files. | C-01 (never present an unmeasured number as measured); C-04 (a correction propagates to every derived page in the same change) |
| **INC-10** | **A design described as an implementation.** The `multi-tenant-biometric-attendance` case study described the isolation model as "database per tenant". The real implementation was a single tenant-shared database for all 14 tenants; the dedicated-per-tenant path was designed and never built. Two generated `.mmd` diagrams encoded the wrong model as well. Surfaced only because a `[NEEDS INPUT]` marker forced the question. Corrected across both locales, the diagram spec, and two diagram sources. | C-02 (describe what was built, never what was designed) |
| **INC-11** | **Generated assets accepted as final.** The eleven Mermaid diagrams from TASK 1 were declared done against a syntax bar, not a presentability bar. Autolayout produced confusing edge routing — sink nodes sharing a rank with unrelated terminals, connectors disappearing behind subgraph boundaries. Several review rounds narrowed it without reaching hand-authored quality. They shipped as acknowledged placeholders with a tracked replacement task, which is the right outcome; the failure was that "renders without syntax errors" was nearly accepted as "done". | the done-dimension for generated assets: the acceptance bar is fitness for the published use, and a placeholder must be declared as one |
| **INC-12** | **The guard that failed open.** A concurrent rewrite of `guards.config.json` left the file momentarily unparseable. The `PreToolUse` hook's top-level `JSON.parse` threw, the process exited **1**, and the runtime treats a non-zero exit other than 2 as a **non-blocking** hook error — so the tool call proceeded. **Every rung-1 boundary was open for the duration of that read**, and the only symptom was two `tool.result` events in the trace with no matching `tool.requested`. Reproduced deliberately afterwards: with a torn config, a denied git write reached exit 1 and would have run. Found by the trace, not by reading the code. | **`G-13`** — a guard that cannot evaluate must deny |
| **INC-14** | **The guard that denied everything.** The first real delegation — `harness-evaluator`, producing `EVAL-000` — was denied at rung 1 writing the scorecard it exists to produce, **inside its own declared scope**. `checkRoleScope` prefix-tested the repository-relative scope `progress/evaluation-results` against the payload's path, and `Write` always carries an **absolute** path, which cannot start with a relative prefix. The harness's only enforced per-role write scope was refusing **100% of authorized writes**, and the denial text asserted a path was "outside" a directory it was plainly inside. Its battery stayed green because every fixture was relative: the red paths were exercised, the green path was never tested against a real payload shape. Probing the shared resolver then exposed a **worse sibling** — `repoRelative` compared the root prefix case-sensitively, so when the drive letter arrived as `C:` against a root recorded as `c:` the path failed to relativize, matched no boundary, and **`H-02` and `H-03` failed open**. Found by an agent doing the job, not by a test. | the resolver is shared by every path guard, and a boundary is tested against a **captured payload** rather than a written-down assumption — the same lesson as the `tool_response` field name in step 7 |
| **INC-13** | **The guard that could never fire.** A roster check shipped with `\b` word boundaries that arrived on disk as literal **0x08** bytes, and later a heredoc parser with a `\1` backreference that arrived as **0x01** — both mangled by the shell tooling used to write them. A control byte renders invisibly in `grep`, in an editor and in line output, so the source read correctly in four separate inspections while the predicate could never match. Caught only by the accompanying red test; on the second occurrence the test passed anyway for an unrelated reason, and the logic was asleep until a mutation run exposed it. | **no new rule** — `P-14` and `T-04` already require it, and this is the evidence they were right. Mechanized as a source scan for stray control bytes |
| **INC-15** | **The redaction check that flagged its own machinery.** `check-trace`'s whole-file redaction scan (`validateTrace`, `scripts/guards/lib/evidence.mjs`) substring-matches every `banned-terms.txt` entry against the entire serialized trace line — deliberately, so a leak reaching disk by a route nobody wrote a redactor for is still caught. A `researcher` run's trace failed it: a 4-character banned term appeared as a substring inside a `tool_use_id` — an opaque, Anthropic-API-generated random token, never authored content. The human located and removed the affected lines directly (evidence is gitignored, never committed, and only a human can write there — `H-03`); doing so broke `seq` continuity, which the same check correctly flagged as a second finding, exactly as it's designed to for a truncated trace. Real defect, contained: the redaction guard did its job on unauthored fields it was never meant to police, and has no way today to tell "opaque ID" from "content that might leak." | no new rule yet — `TASK 18` narrows whole-file redaction to exclude known-opaque, system-generated fields (`tool_use_id`, `run_id`, `parent_run_id`) while keeping every content-bearing field covered |

---

## D · Decision matrix — export → v2

Every material element of the inherited harness, with a verdict. `KEEP` means it transfers as written; `MODIFY` means the idea survives with a changed mechanism; `REPLACE` means the mechanism was wrong; `DEFER` means it earns its place later; `REMOVE` means it does not apply.

| Element | Decision | Why | Destination |
|---|---|---|---|
| Rules registry, stable ids, never reused | **KEEP** | The idea that makes reference-by-id possible at all | `.claude/rules/**` |
| Rule provenance (`origin` per row) | **KEEP** | A rule with no incident is ceremony (INC-07 generalized) | registry column; §C here |
| "Mechanize > procedure > audit"; mechanized rules leave the dashboard | **KEEP** | Keeps the registry readable; an unread registry enforces nothing | §J |
| Progressive disclosure | **MODIFY** | Now tool-enforced via path-scoped rules and on-demand `docs/**`, not discipline | §B, layer 02 |
| Spec checkpoint on the real file | **KEEP** | INC-05. The single most important gate | `.claude/skills/work-item/` §3 |
| Spec versioning (`version` / `approved_version`) | **KEEP** | INC-05's second half; the delegation gate reads these fields | spec template |
| "Evidence > agent self-report" | **KEEP** | Central principle; now actually substantiated | §B layer 06, `contracts.md` |
| Adherence vs outcomes KPI split | **KEEP** | High adherence + flat outcomes means the *content* is wrong, not compliance | `EVAL-TEMPLATE.md` KPI table · `.claude/skills/evaluate-harness/` |
| Adversarial audit as a separate role | **KEEP** | The human's proxy at done; needs a cold context to be adversarial | `.claude/agents/` |
| Harness self-evaluation, falsifiable | **KEEP** | A harness nobody may conclude against is a belief system | `.claude/skills/evaluate-harness/`, §K |
| Retrospective replay | **MODIFY** | Becomes an **executable** eval suite instead of a documented exercise | `evaluation-cases/` |
| "Validate properties, never a roster" | **KEEP** | INC-07 | §J, every guard |
| "A false 🔒 is worse than an honest 🔧" | **KEEP** | Claiming mechanization retires a human eye that is still needed | §J |
| **P-01 "git belongs to the human"** | **MODIFY** | Restated as a boundary: shared state is the branch and the remote. Same protection, general framing | `.claude/rules/00`, git guards |
| **Delegation gate on `SubagentStart`** | **REPLACE** | `SubagentStart` cannot block in this tool. The gate is `PreToolUse` matched on **`Agent`** — the tool that spawns a subagent. **`Task` does not exist**; `TaskCreate`/`TaskUpdate` are task-list tools, so a matcher on `Task` would gate nothing and fail silently — INC-08's exact shape **`[A4]`** | `scripts/guards/lib/delegation-gate.mjs`, dispatched from the one PreToolUse entry point |
| **Registry location (`docs/harness-rules.md`)** | **MODIFY** | Moved to `.claude/rules/`, which the tool loads automatically and observably | §B layer 02 |
| **"A subagent starts cold" (INC-04)** | **MODIFY** | Stale: subagents inherit CLAUDE.md and project rules. Bootstrap sections re-justified around `docs/**` | role files |
| `e2e-tester` role | **MODIFY** | Becomes `test-engineer`: e2e **plus** the mutation gate. A surviving mutant is observable proof a test proves nothing (INC-02) | `.claude/agents/` |
| `implementer` role | **MODIFY** | Gains a TDD contract: red → green → refactor, failing test named before the code that satisfies it | `.claude/agents/` |
| `researcher`, `harness-evaluator` roles | **KEEP** | Each is a *capability boundary* (no write tools / must not score itself), not merely a procedure | `.claude/agents/` |
| Orchestrator has no role file | **KEEP** | A subagent cannot ask the human, so it structurally cannot run the checkpoint | roster guard fails on the name |
| Ticket → **Work Item** | **MODIFY** | Typed; not all work is a feature. Keeps `TASK N` ids, which `progress/` already cites | `TASKS.md` |
| Delegation by disjoint **file** ownership | **MODIFY** | Widened to files, behaviors, contracts, schemas, resources — semantic collisions, not just git conflicts | `contracts.md` run contract |
| Slice sized by finishability | **KEEP** | INC-06 | run contract, budgets |
| Done-as-conjunction + the dimensions table | **KEEP** | INC-01 | `.claude/skills/wrap-up/` §2, enforced by `check-procedures` |
| "Not applicable, because…" said out loud | **KEEP** | Silence reads as coverage | `.claude/skills/wrap-up/` §2 — **mechanized**: a `not_applicable` with no reason fails the gate |
| Pre-implementation checklist | **KEEP** | Resolves cross-cutting rules while they are still cheap | `.claude/skills/work-item/` §1 |
| ADR index with two-level amendments | **KEEP** | Citing a refuted decision is a defect, not a style issue | `docs/adr/README.md` |
| Ticket log per item, contemporaneous | **KEEP** | Already this repo's practice (`progress/`) | `progress/` |
| KPIs K1–K4, A1–A9 | **MODIFY** | Kept, plus agent-specific metrics that the trace makes observable | `EVAL-TEMPLATE.md` KPI table |
| The substrate rule (observable / self-reported / unmeasurable) | **KEEP** | The most important idea in the measurement chapter | `EVAL-TEMPLATE.md`, the Substrate column |
| Guard design: pure function + thin CLI, dependency-free | **KEEP** | A guard testable only by triggering the agent is a guard nobody tests | `scripts/guards/` |
| Guard shell language | **MODIFY** | Node `.mjs` instead of `.sh` — runs identically in PowerShell, Git Bash and CI | `scripts/guards/` |
| Unfiltered CI workflow | **KEEP** | INC-08 | `.github/workflows/harness.yml` (inert until a remote exists) |
| Visual-QA rigor checklist | **DEFER** | INC-03 is real but there is no UI yet. Returns when the site has screens | §M, the deferred list |
| Visual-capture tooling / gallery route | **DEFER** | Same trigger | — |
| PDR (product decision records) | **REMOVE** | No product layer worth versioning | — |
| The .NET stack rules | **REMOVE** | Wrong stack. Re-derived after TASK 7 | derivation table, blank |
| Stack-rule derivation table | **KEEP** | The mechanism for re-answering rather than inheriting | `.claude/rules/`, rows blank until TASK 7 |
| — | **NEW** | Control plane: `settings.json` permissions + `PreToolUse` guards | §L |
| — | **NEW** | Trust hierarchy and provenance | §B |
| — | **NEW** | Agent / Run / Tool / Policy / Evidence / Evaluation contracts | `contracts.md` |
| — | **NEW** | Execution budgets (`maxTurns`, tool calls, wall clock) + stop/fail/escalate | `contracts.md` |
| — | **NEW** | JSONL evidence trace written by hooks | §B layer 06 |
| — | **NEW** | `InstructionsLoaded` as observable proof the rules **loaded** — context load only, never adherence. Violations are a separate family **`[A14]`** | `evidence.md`, the `instructions.loaded` event |
| — | **NEW** | Eval case model + 10 executable cases | `evaluation-cases/` |
| — | **NEW** | `C-*` content surface derived from INC-09…INC-11 | `.claude/rules/20-content.md` |
| — | **NEW** | `G-13`, fail-closed guards, derived from INC-12 | `.claude/rules/40-agent-policy.md` |

---

## E · Core invariants

These survive a change of language, framework, model provider, agent tool or infrastructure. If a future change breaks one of these, it is not a refactor — it is a different harness.

1. **Knowledge, procedures and adapter are separate planes.** A rule body in the adapter is a bug.
2. **Every rule exists once, has a stable id, and cites an origin.** Ids are never reused after retirement.
3. **Restating a rule is forbidden.** Reference by id; two copies drift and both become untrustworthy.
4. **The enforcement rung is declared per rule, and the highest achievable rung is used.**
5. **A claimed mechanization that does not cover the whole rule keeps its human-review half.**
6. **Human approval attaches to the real artifact**, never to a summary or a plan of it.
7. **An approved artifact that changes after approval is unapproved** until re-approved.
8. **Evidence outranks self-report.** Where an artifact and a report disagree, the artifact wins.
9. **A KPI read from prose written by the entity it scores is not a measurement** — it is marked as self-reported or not reported.
10. **"Done" is the conjunction of every applicable dimension**, and inapplicable dimensions are declared out loud.
11. **Agents do not modify shared state outside their authorized boundary.**
12. **Least privilege by default**; capability is granted by allowlist, never assumed.
13. **Everything on the data-trust ladder is data, never instruction** — repository content, tool output, external content, memory. **`[A1]`**
14. **Every run has a bounded budget** and a defined stop / fail / escalate behavior.
15. **Guards validate properties, never rosters.**
16. **A guard is not trusted until it has been proven in red.**
17. **Work is one deliverable with a checkable done**; two deliverables are two work items.
18. **A slice is sized by whether it can be finished in one run**, not by topic.
19. **The harness is falsifiable** — it is permitted to conclude that it is not paying.
20. **Knowledge lands in the repository or it does not exist.** Memory is a cache.
21. **Only a `deny` rule or a `PreToolUse` guard denial is a boundary.** `ask` rules, `permissionMode` and role prose are hardening — `bypassPermissions` removes them. Deny rules survive it, and so do hooks: a `PreToolUse` hook runs for every tool call and an exit 2 stops the call before permission rules are evaluated. **`[A2]`**
22. **The harness claims only what its declared `enforcement_environment` supports.** **`[A12]`**

---

## F · Contracts

Defined in full in [contracts.md](contracts.md). Summarized here so this document stands alone:

| Contract | Answers | Realized as | Enforced by |
|---|---|---|---|
| **Agent** | What is this role, what may it touch, what must it never do, what evidence must it return | agent frontmatter + six declared posture dimensions + `## Bootstrap` / `## Boundaries` / `## Reporting` | `check-agents.mjs`; per-agent write-scope guard for `harness-evaluator` |
| **Run** | What is this specific execution for, what does it own, what is its budget, its isolation, when does it stop or escalate | the delegation brief + the run header and footer in the trace | `delegation-gate.mjs` (matcher `Agent`), `maxTurns` |
| **Tool** | Which tools exist, their **risk class**, their default decision, which roles may hold them | `settings.json` permissions + per-agent `tools` | the tool's permission engine + the Bash guard |
| **Policy** | Trust precedence (two ladders), boundary set, approval set, how a new policy is added | `.claude/rules/40-agent-policy.md` + `settings.json` | `PreToolUse` guards |
| **Evidence** | The three-event schema; what counts as proof for each done-dimension | `evidence/runs/<session-id>/<run>.jsonl` + `progress/**` | `record-event.mjs` |
| **Evaluation** | What an eval case is; how a harness failure is declared | `evaluation-cases/EC-0NN.yaml` | the `evaluate-harness` procedure |

**Six posture dimensions `[A20]`.** Every role declares all six, and `check-agents.mjs` fails any role that omits one — the property-based version of the check, so role six is validated instead of waved through (INC-07):

```text
filesystem_read     scope
filesystem_write    scope
network             yes | no
credentials         none | <named>
approval_required   [] | [<action>…]
isolation           none | worktree
```

**The role *is* the security profile.** No separate profile taxonomy — with five roles it would map one-to-one onto them, adding indirection with no compression.

---

## G · Repository structure

```text
portfolio/
├── CLAUDE.md                       adapter — identity, layout, commands, pointers
├── TASKS.md                        the Work Item register
├── docs/
│  ├── harness/{architecture,contracts,procedures,metrics}.md
│  ├── adr/{README.md, ADR-TEMPLATE.md, ADR-0NN-*.md}
│  ├── specs/{SPEC-TEMPLATE.md, SPEC-TASK-N-*.spec.md}
│  ├── security/security-requirements.md
│  └── plan.md
├── progress/                       one log per work item + evaluations/EVAL-0NN-*.md
├── evaluation-cases/{README.md, cases/EC-0NN-*.yaml}
├── evidence/                       README + schema committed; runs/ gitignored
├── resources/                      FROZEN — read-only input
├── scripts/
│  ├── gate.mjs                     the one-command gate; delegates, never re-lists
│  ├── check-terms.sh               thin wrapper over the .mjs port
│  └── guards/{guards.config.json, lib/, *.test.mjs, gate/, hooks/}
├── .claude/
│  ├── rules/                       THE REGISTRY — one id space, one file per surface
│  ├── agents/*.md                  5 role files
│  ├── skills/<name>/SKILL.md       3 procedures
│  └── settings.json                wiring + permissions ONLY
└── .github/workflows/harness.yml   no path filter; inert until a remote exists
```

Two placement decisions worth keeping: **`progress/` sits at the repository root**, because work logs are operational output and mixing them into `docs/` makes `docs/` unreadable within a month; and **`evidence/runs/` is gitignored**, because it is machine output, it would dirty every diff, and this repository may yet be published.

---

## H · Bootstrap flow

How a fresh project adopts this harness. Human approval is required at the starred steps.

```text
fresh project
   ↓
1  pick the adapter          which file is always loaded, which directory holds roles
   ↓
2  founding decisions ★      the ADRs that constrain everything else, one at a time
   ↓
3  project policy ★          boundaries, permissions, budgets, trust precedence
   ↓
4  harness installation      rules · contracts · adapter · guards · roles · procedures · gate
   ↓
5  validation                acceptance suite: red paths, fresh-session smoke test,
                             one delegated run corroborated by the trace
   ↓
6  baseline                  replay the known incidents → EVAL-000, marked baseline
   ↓
7  first work item ★         through the full procedure, including the checkpoint
```

**This project inverts steps 2 and 4**, deliberately and once. The founding technology ADRs (TASK 7) cannot be written before there is a procedure to write them with, and the harness's stack-dependent leaves — the derivation-table answers, the test and mutation commands, the gate's sub-gates — are left blank until those ADRs land. The stack-*independent* core is built first. This is recorded as a deviation, not as the general pattern.

**Retrofit onto an existing codebase** differs in one rule: conventions are **discovered, not invented**. Read the code first; what it already does becomes a rule with an origin of "existing practice", which is a real origin. Inventory what is already mechanized and send those rules straight to the appendix. Then find the done-dimensions that have never been checked — that list is the first improvement backlog.

---

## I · Run lifecycle and state authority **`[A17]`**

**This lifecycle describes a run, not a work item.** One work item has many runs across many sessions — TASK 5 is itself the proof. Conflating the two would make a `TASKS.md` entry look like a point on this path, which it is not.

```text
CREATED ──► PLANNED ──► APPROVAL_REQUIRED ──► APPROVED ──► RUNNING ──► VERIFYING
                                                                          │
                                                          RECONCILING ◄───┘
                                                                │
                                                            COMPLETE

off-ramps, reachable from any state:
  BLOCKED     an external dependency is missing; work cannot proceed
  ESCALATED   a decision exceeds the agent's authority; the human is required
  FAILED      the objective could not be met within budget
  CANCELLED   the human withdrew the work
```

Mapping to the workflow: `PLANNED` is the pre-implementation checklist, `APPROVAL_REQUIRED` is the spec checkpoint, `RUNNING` is implementation, `VERIFYING` is the done-dimensions plus the adversarial audit, `RECONCILING` is updating the living docs and then checking that you did. No state exists that does not correspond to a step someone actually performs.

### State authority — one source each

| Concern | Authority | States | Never authoritative for |
|---|---|---|---|
| **Work-item state** | `TASKS.md` | `TODO` · `IN PROGRESS` · `BLOCKED` · `DONE` | run outcomes |
| **Run state** | the trace | the lifecycle above | whether the item is done |
| **Intended behavior + approval** | the spec (`status`, `version`, `approved_version`) | `draft` · `active` · `shipped` · `superseded` | either of the above |
| **Narrative** | `progress/TASK-N.md` | none | **anything** — it is a log |

Two rules follow. **A work item's status is set by a human at wrap-up, never inferred from run states.** And **`progress/` is authoritative for nothing**: it records reasoning and decisions, and where it disagrees with the trace, the trace wins (invariant 8).

### Termination is structured, not a state **`[A13]`**

A policy violation does not get its own lifecycle state — states answer *can this work continue*, and a violation adds no new answer to that. It gets metadata, which carries strictly more information than a state could:

```yaml
termination:
  state:  FAILED | ESCALATED | BLOCKED | CANCELLED | COMPLETE
  reason: policy_violation | budget_exhausted | objective_unmet |
          dependency_missing | human_decision_required | withdrawn
  rule:   <rule id>       # required when reason == policy_violation
  guard:  <guard name>    # required when reason == policy_violation
```

This lets the evaluator filter violating runs out of a scorecard, and lets metrics answer *which rule is violated most often* — a question no single state could answer.

### Budgets, honestly classified **`[A8]`**

**Budget exhaustion is never a silent state.** A run that exhausts a budget terminates `FAILED` with `reason: budget_exhausted` and the budget named — never as a partial success. An agent cut off mid-run delivers zero, not half (INC-06).

| Field | Status | Mechanism |
|---|---|---|
| `maxTurns` | **ENFORCED** | native subagent frontmatter |
| `maxToolCalls` | **OBSERVED** | counted from the trace at wrap-up |
| `maxRuntime` | **OBSERVED** | derived from trace timestamps at wrap-up |
| `maxRetries` | **OBSERVED** | counted from `tool.result` failures and repeated requests |
| `maxCost` | **NOT AVAILABLE** | not exposed to hooks. Never reported as a number |

The first draft proposed enforcing `maxToolCalls` and `maxRuntime` live, via a guard on every tool call. The proportionality filter downgraded both to observed: `maxTurns` is native and already bounds the INC-06 failure, and a hot-path hook to enforce ceilings a solo developer would notice anyway is cost without a matching incident. **Promotion trigger:** a delegated run overruns with `maxTurns` already set.

---

## J · Enforcement model

Every rule declares the highest rung it actually reaches. Claiming a rung you have not earned is worse than declaring a lower one, because it retires a human eye that is still needed.

```text
 1  runtime enforcement     settings.json deny/ask · PreToolUse guard · per-agent tools
 2  automated validation    the gate script · CI · a test
 3  procedure step          a structural step in a skill that must be performed
 4  agent instruction       prose in a rule file or a role file
```

| Rung | What it can do | What it cannot do |
|---|---|---|
| 1 | Deny the action regardless of what the agent decides | Judge quality, intent, or whether a comment restates its code |
| 2 | Fail the build on a property of the artifact | Fire before the artifact exists |
| 3 | Force a checkpoint to occur in sequence | Survive someone skipping the procedure |
| 4 | Shape judgment | Guarantee anything |

**Partial mechanization is a real answer.** A comment's *length* is checkable; whether it merely restates the code is not. The delegation half of the spec checkpoint is gateable; an orchestrator writing code itself launches no subagent and meets no gate. In both cases the rule keeps a rung-4 row for the uncovered half and says which half.

**Adding a guard:** write the pure function and its tests **including every bypass you can think of**; wire it into the gate *and* CI; move the rule to the mechanized appendix naming the enforcer; and if it covers only half the rule, keep the dashboard row for the other half.

**Two rules of writing a guard.** Prove it in red — a guard seen only to pass has not been tested. And validate properties, never a roster (INC-07): derive what you check from the artifact itself, so item seven is checked instead of waved through.

---

## K · Evaluation strategy

Two levels, and they answer different questions:

- **Harness evaluation** — is the process working? Scored against KPIs, compared to a baseline.
- **Agent evaluation** — can the agent actually perform the task, and does it refuse what it should refuse? Scored by executable eval cases.

**Baseline.** `EVAL-000` is produced by replaying every transcribed incident against the harness and asking, per incident, *would this have been caught?* Verdicts are `Caught` / `Partial` / `Gap`, and every `Gap` must produce a work item — a gap with no ticket is a gap that has been noticed and forgiven. The scorecard is marked **baseline, not evaluation**, so nobody later reads it as a trend.

**Regression.** The eval cases are the executable form of the replay. Each names the incident it descends from, and a case that starts failing is a harness regression, not a bad day.

**The architectural requirement is the loop, not a count `[A15]`:**

```text
incident  →  eval case  →  regression
```

Every incident produces a case. A case is never deleted — it is retired with a written reason and a date, and retired ids are not reused. Ten was the *starting* count, one per transcribed incident that has an executable form; it is a baseline, never a target. The first draft made ten an architectural requirement, which could only cause padding at eight or deletion pressure at fourteen — and the suite reached **twelve** on its first pass, because three more incidents had been transcribed by then and one (`INC-03`) has no executable form until the site has screens. That is the count doing what a baseline does.

**Growth control**, so the suite never becomes the benchmark this architecture refuses to build: **a case must be executable and must be demonstrated failing when the control it covers is removed.** A case that cannot be shown failing is documentation, and belongs in §C.

**Adversarial cases score the harness, not the model `[A16]`.** An injection case asserts on the guard's verdict and the trace — never on the model declining. A case that passes because the model refused is measuring the model, and will silently start failing on a model upgrade while the harness is unchanged.

**Two metric families, not one `[A14]`.** Loading a rule is not following it.

| Family | Question | Substrate | Source |
|---|---|---|---|
| **L** — context load | Did the rule file enter context? | observable | `InstructionsLoaded` events |
| **V** — violations | Was a rule broken? | observable where a guard exists; audit-scored otherwise | guard denials; auditor findings |

L is a hygiene indicator and never a compliance claim. **L at 100% with V above zero means the rule's content or its enforcement rung is wrong — not that it was not loaded.** This mirrors the adherence-versus-outcome logic one level down, and it exists because an adherence KPI built on `InstructionsLoaded` alone would sit at 100% forever while hiding every real violation.

**Live evaluation** runs at wrap-up over the work actually done, filling the KPIs from the trace and the artifacts.

**Declaring a harness failure.** The harness has failed when, across comparable work, adherence sits near 100% and the outcome KPIs do not move — that means the *content* is wrong, not compliance. Or when passes-to-done does not fall across two or three comparable items. The correct response in both cases is to cut or correct the harness. Two data points are a line, not a trend; at small N the honest question is not "is the slope positive" but *"did the known failure modes recur?"*, which is answerable and worth the hour.

**Declared biases.** Every scorecard states two, because both silently invalidate a comparison: **circularity** (was the instrument changed by the work it is scoring?) and **composition** (is the scored work mostly harness work, i.e. is the harness being scored on itself?). `EVAL-000` will be heavily exposed to both, and must say so.

---

## L · Security model

Eight axes. Everything else is a future security extension.

### Enforcement environment **`[A12]`**

```text
enforcement_environment:  policy-controlled     ◄ current value
                          os-sandboxed
```

- **policy-controlled** — boundaries enforced by the tool's permission engine and by hooks. A process that escapes the tool's mediation is outside the boundary.
- **os-sandboxed** — the above, plus operating-system enforcement of filesystem and network limits on spawned processes.

This is stamped into every run trace header and reprinted in every scorecard. Without it, an evaluation produced here and one produced on a Linux machine would be silently incomparable — and TASK 9 exports this harness to projects where the regime may differ.

**Why the current value is `policy-controlled`:** the sandboxed Bash tool requires macOS, Linux or WSL2, and this is native Windows whose only WSL distribution is the Docker backend. Filesystem and network isolation are therefore enforced by permission rules and hooks, not by the operating system. Recorded as an honest 🔧, never a claimed 🔒.

### The axes, at their real rungs

| # | Axis | How it is realized here | Rung |
|---|---|---|---|
| 1 | **Least privilege** | Per-agent `tools` allowlist; six declared posture dimensions checked by the roster guard; `harness-evaluator` write scope enforced by a per-agent guard **`[A20, A21]`** | 1 |
| 2 | **Trust boundaries** | The two ladders in §B; everything on the data ladder is data **`[A1]`** | 4 (+2 via the audit) |
| 3 | **Filesystem isolation** | `deny` on `resources/**`, `.git/**`, `evidence/**` writes and `private/**` reads; guards for what patterns cannot express | 1 · *conditional on axis 9* |
| 4a | **Declared network tools** | `WebFetch` / `WebSearch` held only by `researcher`; absent from every other role's `tools` **`[A6]`** | 1 |
| 4b | **Network via shell** | `researcher` holds no `Bash` at all. An egress-binary guard is **specified, not built** — see §M | 4 · *specified* |
| 4c | **Domain allowlisting** | Requires the sandbox proxy | **not available** under `policy-controlled` |
| 5a | **Credential storage** | `private/**` and `.env*` denied at read | 1 |
| 5b | **Credential propagation** | The session environment carries **no project secret**. Deploy credentials live in the hosting provider or CI, never locally, so there is nothing for a subprocess to inherit. `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` set as defence in depth **`[A7]`** | 1 by construction · 3 for the discipline |
| 6 | **Destructive-action approval** | `permissions.ask` for destructive shell; git writes denied outright | 1 |
| 7 | **Audit trail** | The three-event trace, gap-evident and redacted at write time **`[A10, A11]`** | 1 · *conditional on axis 9* |
| 8 | **Prompt-injection resistance** | The data ladder, plus the blast radius below. `EC-008` scores the **guard's verdict**, never the model declining **`[A16]`** | 3–4 |
| 9 | **Bash containment** | Bash is `risk: HIGH`. Its effective permission is the **union of every policy it can reach around**, so axes 3, 4b and 7 hold only while its guard holds **`[A19]`** | 1 for git and protected paths · 4 elsewhere |

### Post-compromise blast radius **`[A18]`**

Every control above reduces the *probability* of a bad tool request. Only rung 1 bounds its *impact*. So the honest question is not whether the agent might be induced to misbehave, but what it accomplishes if it is. Assume the model obeys an injected instruction completely:

**It can still** — write and delete files in the working tree outside `resources/`, `.git/`, `evidence/` and `private/`; run shell commands not matched by a deny rule; reach the network through an unenumerated binary.

**It cannot** — commit, push, or otherwise alter the branch or remote; modify `resources/`; modify or delete the trace without leaving a gap in the sequence; read `private/**` through file tools; act without the attempt being recorded.

**The residual risk is accepted**, dated 2026-08-17, on three grounds: the repository is fully versioned, the human reviews one diff before any commit, and no production system or credential is reachable from this workspace. **This acceptance is void the moment a deploy credential enters the environment** — which TASK 7 may introduce, and which is why 5b decides now that deploy runs from CI rather than from the agent's machine.

### The boundary, stated once

Agents may write to the working tree. Agents may not write to the branch, the remote, `.git/`, `resources/`, or `evidence/`. The human owns commits, and that ownership is what preserves the ability to see, in one diff, everything the agent did.

**And the mechanism is not a matter of taste.** Deny rules survive every permission mode including `bypassPermissions`; `ask` rules and role prose do not. Every boundary above is therefore a `deny` rule or a guard denial, never an `ask` **`[A2]`**. This project **can** disable `bypassPermissions` for itself, and does: `disableBypassPermissionsMode: "disable"` works from any settings scope, not only from managed settings. The first draft asserted the opposite and accepted a rung-4 compensation for it; checking the claim instead of restating it moved `G-04` from evidence-compensated to enforced (`P-04`). `permission_mode` is still recorded at session start, because a higher scope — a CLI `--settings` flag — can still override a project setting out of band, and the evaluator should see which mode actually ran **`[A3]`**.

---

## M · Explicitly deferred

Not built in v1. Named here so that "we should also have…" has a place to land instead of becoming scope.

**Deferred with a named trigger:**

| Item | Returns when |
|---|---|
| Visual-QA rigor checklist and capture tooling | The site has screens worth diffing against a design |
| The security requirements document (`S-0NN`) | There is an auth surface or a public endpoint |
| Folder-size and comment-length guards | Something has actually sprawled |
| Stack-specific rules (the derivation table) | TASK 7's ADRs land |
| A second tool adapter (Codex / Cursor / OpenCode) | A second tool is actually used |
| Cost-per-task as an observable KPI | A telemetry source exists; until then it is not reported as a number |

**Specified but not built** — decided designs held back by the proportionality filter. The reasoning is in [architecture-findings.md](architecture-findings.md) §16; only the build is deferred, not the decision.

| Item | Why not now | Returns when |
|---|---|---|
| **Network egress guard** (`curl`/`wget`/`nc`/… in Bash) **`[A5]`** | Best-effort by construction (axis 4b, rung 4). With no credential, no remote and no reachable production system, it currently guards nothing that can happen | A deploy credential or a remote exists |
| **Live budget enforcement** (`maxToolCalls`, `maxRuntime`) **`[A8]`** | `maxTurns` is native and already bounds INC-06. A hot-path hook on every tool call is cost without a matching incident | A delegated run overruns with `maxTurns` already set |
| **Trace hash chaining** (`prev_hash`) **`[A11]`** | Defends against forgery by an adversary this project does not have. `seq` catches the realistic failure — gaps, truncation, a crashed hook — at a fraction of the cost | An untrusted party gains write access to the workspace |
| **Enforced write scope for `implementer` / `test-engineer`** **`[A21]`** | Their file sets stay procedural — named in the brief, checked by the auditor. Only `harness-evaluator` is enforced, because its value depends on not being able to edit what it scores | Two roles write concurrently |
| **Worktree isolation** **`[A9]`** | A merge step per delegation is real friction with no matching incident. The field exists and is declared per run; only the default is off | Any of four triggers: concurrent writes · a `migration` or `experiment` item · a brief with bulk deletion or relocation · a run the human marks high-risk |
| **Named security profiles** (`RESEARCH` / `IMPLEMENT` / `AUDIT` / …) **`[A20]`** | With five roles a profile layer maps ~1:1 onto roles — indirection with no compression. The portable part, the six declared dimensions, is built | More than ~8 roles, or two roles needing identical non-trivial postures |
| **Per-role credential scoping and masking** **`[A7]`** | No credential exists to scope, and masking is sandbox-only | A workflow requires a credential *in the agent's environment* — avoidable by deploying from CI |

**Argued unmechanizable — the content surface `[EVAL-000, GAP-11]`.** A third category, kept apart from the two above because rounding it into "deferred" would promise a mechanization that is not coming. These rest on human review, and that is the decision rather than the gap.

| Rule | The failure | Its incident · case | Why no check can decide it |
|---|---|---|---|
| **C-01** | An unmeasured number published as measured | `INC-09` · `EC-008` **Gap** | A measured figure and a target are both digits in a sentence. The `[NEEDS INPUT]` marker catches an *unresolved* gap; nothing catches a *confident wrong number*. Mechanizing it would need a provenance claim attached to every figure, which does not exist |
| **C-02** | A design described as an implementation | `INC-10` · `EC-009` **Gap** | "Database per tenant" and "one shared database" are both well-formed English describing a system. Nothing in the repository knows which one shipped |
| **P-15** | A placeholder accepted as final | `INC-11` · `EC-010` **Gap** | Presentability is a judgment about a rendered image. A syntax check is precisely the substitute measure the incident warns about — building one would reproduce the failure while appearing to fix it |

**The uncomfortable part, recorded so it is not rediscovered.** These three are the only rules with no mechanization, **and they are the ones whose failures have actually happened in this repository.** Every red-proven control in the eval suite defends against an incident inherited from a different project. The harness is best defended where it has never been attacked, and that asymmetry is a fact about its origin, not a design choice.

All three were caught in practice by a human asking a direct question — twice because a `[NEEDS INPUT]` marker forced one. That is the actual control, it is rung 4, and `A16` is explicit that a case passing on good behaviour measures the author rather than the harness. Hence `Gap` rather than `Partial`, in all three.

**Revisited when** any of the three recurs *after* this entry exists — which would be evidence that human review alone is insufficient and would justify the cost of a provenance mechanism. Not on a schedule, and not because the gap is uncomfortable to leave open.

**Deliberately not built at all, in this generation:** adaptive policies · automatic model routing · autonomous self-improving orchestration · dynamic agent graphs · sophisticated memory systems · knowledge graphs · distributed agent runtime · agent marketplace · advanced cost optimizer · automatic architecture synthesis · production-scale telemetry · a large evaluation benchmark · automatic PR/merge orchestration · a generalized workflow engine.

The architecture must *permit* these later. It will not contain them. The moment this becomes programmable orchestration it acquires its own bugs, its own maintenance cost, and its own reasons to be worked around.

---

## N · Decisions taken, and not to be reopened

The review process allowed a small number of decisions to be escalated to the human. Four were escalated and answered; six were taken on architectural grounds. All ten are closed.

| # | Decision | Resolution | Consequence of choosing otherwise |
|---|---|---|---|
| D1 | Where the site lives | **This repository**; `resources/` becomes a runtime-enforced read-only input | A separate repo turns the boundary into a sync contract, whose drift is silent |
| D2 | The git boundary | **Working tree yes, git no.** Shared state is the branch and the remote | Worktree isolation adds a merge step per delegation; agent commits lose the single reviewable diff |
| D3 | Where TDD and mutation bite | **Guards + the content pipeline.** Rendered pages get e2e and build checks | Mutating render templates produces equivalent mutants and noise; guards-only leaves the pipeline — where INC-09/10 lived — unproven |
| D4 | Evidence depth | **JSONL trace via hooks, gitignored** | Without it, most KPIs stay self-reported, which is the exact flaw the measurement chapter denounces |
| D5 | Review vs architecture document | **They are the same file** | Two documents describing one architecture drift within a month |
| D6 | Guard runtime | **Dependency-free Node `.mjs`**, `node --test`; `check-terms.sh` becomes a wrapper | Bash-only guards cannot run in this machine's primary shell |
| D7 | Language | **English** for harness, code and specs; Spanish for site prose and intake | Matches existing practice; an undecided split is the only wrong answer |
| D8 | Adapters | **Claude Code only**, others specified as a contract | Building unused adapters is speculative work |
| D9 | Acceptance | **TASK 7's ADRs produced through the harness's own procedure** | A harness never run against real work is a document |
| D10 | Registry location | **`.claude/rules/`**, loaded automatically and observably; reasoning stays in `docs/harness/` | Inlining ~40 rules into the adapter blows the size budget and measurably *reduces* adherence |

---

## O · Implementation blueprint

Human checkpoints at 1, 2, 4 and at the end of 11.

```text
 1  Architecture              this document                                    ★
 2  Registry                  .claude/rules/ — 5 files, one id space           ★
 3  Contracts + templates     contracts.md + 6 templates
 4  Adapter                   rewrite CLAUDE.md thin                           ★
 5  Runtime boundary          settings.json permissions + hook wiring
 6  Guards                    9 guards, pure functions, red-path tests
 7  Evidence                  record-event + JSONL schema + evidence/README
 8  Roles                     5 agent files
 9  Procedures                work-item · wrap-up · evaluate-harness
10  Gate + CI                 gate.mjs + unfiltered workflow
11  Evals + baseline          12 cases → EVAL-000                              ★
12  Acceptance + freeze       acceptance suite · delete the export · freeze
```

Steps 1–4 are sequential. 5–7 and 8–9 may interleave. 10 depends on 6. 11 depends on all.

### Every step carries an executable acceptance check **`[A24]`**

The first draft placed validation at step 12 and human checkpoints at 1, 2, 4 and 11 — which left steps 3 and 5–10 with no verification for the length of the build. That is the harness's own `P-11` violated in its construction: a step declared done on the builder's report is a claim, not evidence.

**Each step now ships the check that validates its own artifact, and the gate grows with the harness.** Guards land with the thing they guard rather than in a step-6 batch. A step is done when its check exists, passes, and has been demonstrated failing.

| Step | Its acceptance check | Lands |
|---|---|---|
| 2 · Registry | `check-rules-registry` — unique ids, every rule has an origin and a rung, one surface per file, no dangling citations | step 3 (retroactive) |
| 3 · Contracts + templates | `check-templates` — every template parses and every placeholder is marked | step 3 |
| 4 · Adapter | `check-context-budget` — always-loaded lines stay under budget | step 3 (fails until 4 lands) |
| 5 · Runtime boundary | `check-settings` — every `H-*` rule has a matching `deny` entry, and no boundary rests on `ask` | step 5 |
| 6 · Guards | each guard's own red-path battery | step 6 |
| 7 · Evidence | `check-trace` — schema conformance, `seq` continuity, redaction applied | step 7 |
| 8 · Roles | `check-agents` — six posture dimensions declared, bootstrap paths resolve, no role named `orchestrator` | step 8 |
| 9 · Procedures | the router table resolves; `wrap-up` fails on a done-dimension with empty evidence | step 9 |
| 10 · Gate + CI | the gate fails when any single guard is neutered | step 10 |
| 11 · Evals | `check-evals` — every incident has a case or a reasoned exclusion, every case's `proof` resolves to a test that exists, and no unproven case claims `Caught` | step 11 |

**A red gate during construction is correct.** It names what is outstanding. `check-context-budget` fails today because `CLAUDE.md` is still the 154-line content-system file; step 4 makes it green. A gate that only goes green at the end tells you nothing along the way — which is INC-08's lesson applied to the build itself.

**The acceptance bar is the same at every step:** the check exists, it passes on the real artifact, and it has been **proven in red** (`P-14`). A check demonstrated only passing has not been tested.

**The amendments changed no steps.** Step 6 grows (the `git-write` allowlist, `resources`/`evidence` write denial, the roster guard's six posture assertions, the evaluator write-scope guard); step 7 grows (three-event schema, `seq`, redaction, retention, run header and footer); steps 2, 3 and 5 absorb the documentation amendments. Steps 1, 4, 9–12 are unchanged in scope.

**One structural constraint on step 6 and 7:** there is **one `PreToolUse` entry point**, composing independently testable pure functions. Claude Code fires `PreToolUse` per tool call, so five registrations would mean five process spawns per command. One entry point, several pure functions behind it, each with its own red-path battery, and every denial naming the function, the rule id and the reason.

**Freeze means:** after step 12 the architecture changes only through the normal work-item flow — a work item, a rationale, and an amendment recorded here. It does not change because a later session found it inconvenient.

**The proportionality filter is not a one-off.** Every future amendment answers the same question before it is built: *what failure does this prevent, and has that failure happened?* An amendment that cannot name one is specified and deferred with a trigger, never built on the grounds that it would be more complete. Completeness is not the target — §A states the target, and invariant 19 keeps it falsifiable.
