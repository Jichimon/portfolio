# Harness contracts

Six contracts. Each answers one question, names the fields that answer it, and says what enforces them. **A contract with no enforcement is a description** — where a field is checked, this document says by what; where it is not, it says that too, because a claimed 🔒 that has not been earned retires a human eye that is still needed (`G-11`).

Read on demand. Nothing here is always-loaded — the normative statements live in [`.claude/rules/`](../../.claude/rules/), and this document holds the shapes and the reasoning.

## Enforcement status

**A contract that is only declared is a description.** This table answers *how do we know these are used, not just written*: it names the artifact enforcing each one, and `check-contracts` verifies that artifact exists, that a `built` claim is true, and that a scheduled gap is tracked rather than forgotten.

**Three statuses, because two would lie.** `built` and `pending` alone force every half-enforced contract into one bucket or the other, and both answers are wrong. `partial` is the honest middle — and it must name what it does *not* cover, or it conceals exactly what an overclaim would (`G-11`).

| Contract | Enforced by | Status | Not yet covered |
|---|---|---|---|
| Agent | `scripts/guards/gate/check-agents.mjs` | built | whether the identity paragraph is any good — review-time by nature, and cheaper to say so than to pretend |
| Run | `scripts/guards/lib/delegation-gate.mjs` | partial | the brief's own shape — `scope`, `budget`, `acceptance` and `termination` are unchecked. The approval gate (`H-05`) is enforced and `maxTurns` is now declared per role and enforced natively; what a *brief* carries is not |
| Tool | `.claude/settings.json` · `scripts/guards/hooks/pretooluse.mjs` · `scripts/guards/gate/check-agents.mjs` | partial | the network-egress function for shell commands, specified and deliberately not built — it guards nothing today, since no credential, remote or production system is reachable (§M) |
| Policy | `scripts/guards/gate/check-settings.mjs` | built | the two trust ladders are rung-4 judgment by nature and are not mechanizable |
| Evidence | `scripts/guards/hooks/record-event.mjs` · `scripts/guards/gate/check-trace.mjs` · `scripts/guards/gate/check-procedures.mjs` | built | whether an evidence entry is a *pointer* or a sentence — both are non-empty, and only a reader can tell them apart |
| Evaluation | `scripts/guards/gate/check-evals.mjs` | built | whether a case is a *good* case — that its input reproduces the incident faithfully, and that its expected behavior is the one that matters. The loop, the proofs and the verdict vocabulary are checked; judgment about a case's content is review-time |

**Today: 4 fully enforced, 2 partial, 0 pending.**

That sentence is itself checked. It read *"2 of 6 enforced"* for two steps after it stopped being true, because the table was validated and the paragraph describing the table was not — a claim in prose is still a claim (`P-07`). `validateRatioProse` now fails the gate when the summary and the table disagree.

**What this table does not claim.** That an enforcer exists is not that a contract is honored everywhere it should be. `check-contracts` verifies the artifact and the status; whether the Run contract's brief fields are actually filled in on a real delegation is answered by the eval cases at step 11, not here. The distinction is the difference between *the guard is installed* and *the guard is sufficient*, and only the first is mechanized today.

---

## 1 · Agent Contract

**Answers:** what is this role, what may it touch, what must it never do, what evidence must it return.

An agent is a **capability boundary**, not a job title. A role exists when it needs a *different set of tools* or a *different write scope* — otherwise it is a procedure, and procedures are cheaper. This is the test to apply when someone proposes a sixth role.

### Fields

```yaml
# frontmatter — the enforceable half
name:               # lowercase-hyphen, unique
description:        # when to invoke it
model:              # explicit. Omitting it means "inherit", which silently runs the
                    # expensive model — a cost regression, not a neutral default
tools:              # allowlist. Omitted means "inherit everything available"
disallowedTools:    # the residue, when an allowlist would be longer than a denylist
maxTurns:           # the one natively enforced budget (G-06)
permissionMode:     # hardening only — bypassPermissions removes it (G-03)
hooks:              # per-agent PreToolUse, where a role needs a narrower scope than global
isolation:          # none | worktree

# posture — six dimensions, all six required (G-05)
filesystem_read:    # scope
filesystem_write:   # scope, or none
network:            # yes | no
credentials:        # none | <named>
approval_required:  # [] | [<action>...]
```

`isolation` appears in both halves because it is simultaneously a runtime field and a declared posture. That is not duplication — it is one field serving two readers.

### Body

Five parts, in this order:

1. **Identity** — one paragraph on the judgment this role is being asked to exercise.
2. **`## Bootstrap`** — the numbered documents to read. Rules load themselves; this covers `docs/**`, the ADR index, the spec and the work log, which do not.
3. **How to do the work** — the craft, including this role's characteristic failure mode.
4. **`## Reporting`** — the output contract, shaped so the orchestrator can paste it into the work log.
5. **`## Boundaries`** — the hard limits, each citing a rule id rather than restating it.

### Enforced by

`check-agents` asserts, as properties rather than against a roster of known roles: frontmatter exists · `model` is explicit · `tools` is present · all six posture dimensions are declared · a `## Bootstrap` section exists and **every path it names resolves on disk** · no role is named `orchestrator` (`G-09`). A renamed document must fail this loudly rather than let roles bootstrap into a void.

**Not enforced:** whether the identity paragraph is any good. That is review-time by nature, and saying so is cheaper than pretending otherwise.

---

## 2 · Run Contract

**Answers:** what is this specific execution for, what does it own, what may it spend, when does it stop.

One work item has many runs. This contract is per-execution: it lives in the delegation brief, and its header and footer are written to the trace.

```yaml
run:
  id:                 # <work-item>-<role>-<n>
  parent_run_id:      # the orchestrator's run, when delegated
  agent:              # role name
  model:              # what actually ran, not what the file requested
  objective:          # one sentence

scope:                # ownership is disjoint across ALL of these, not just files (G-12)
  files:              # enumerated objects, never a surface (P-09)
  behaviors:          # spec behavior ids in play
  contracts:          # schemas, error codes, endpoints this run may define
  resources:          # anything else two roles could collide over

budget:               # G-06
  maxTurns:           # ENFORCED natively
  maxToolCalls:       # OBSERVED from the trace at wrap-up
  maxRuntime:         # OBSERVED
  maxRetries:         # OBSERVED
  # maxCost is NOT AVAILABLE and is never reported as a number

isolation: none       # none | worktree, per the triggers in architecture.md §M

acceptance:
  required_evidence:  # what must exist for this run to count as done

termination:          # written to the trace footer (A13)
  state:              # COMPLETE | FAILED | ESCALATED | BLOCKED | CANCELLED
  reason:             # policy_violation | budget_exhausted | objective_unmet |
                      # dependency_missing | human_decision_required | withdrawn
  rule:               # required when reason == policy_violation
  guard:              # required when reason == policy_violation
```

### The two rules that make a brief work

**A brief carries the task, never the rules** (`P-08`). Rules load themselves; what the orchestrator pastes it can also forget, and what it forgets the agent never knows.

**A slice is sized by finishability, not topic** (`P-09`). Enumerate the objects. An agent cut off mid-run delivers zero, not half — the cost is total, not proportional.

### Enforced by

`delegation-gate`, dispatched from the `PreToolUse` entry point on matcher **`Agent`**, refuses to launch a write-capable role against a spec that is `draft`, `superseded`, never approved, or drifted past its `approved_version` (`H-05`).

Three properties make it hold up rather than merely exist. **Write-capability is read off the role's own `tools` list**, against an allowlist of tools known to be read-only — so a tool the runtime ships next month is unknown, treated as write-capable, and the gate gets stricter rather than blinder (`P-16`). **The spec is resolved from the work item the brief names**, not from a repo-wide scan: gating on *any* draft spec anywhere would deny legitimate work on unrelated items, and a guard that blocks real work is a guard someone turns off. **A write-capable brief that names no work item is denied outright** — a run with no work item is ungoverned by definition, which is the state INC-05 actually describes.

Whether an *undeclared* role may be delegated at all is `G-05`'s question, enforced at rung 2 by `check-agents`. This guard only fails such a role closed — no `tools` list means nothing proves it read-only — and claims nothing further.

`maxTurns` is enforced by the runtime. The other budgets are observed, and this contract says so rather than implying otherwise.

---

## 3 · Tool Contract

**Answers:** which tools exist, how dangerous each is, and who may hold it.

| Tool | Risk | Default | Held by |
|---|---|---|---|
| `Read` · `Grep` · `Glob` | low | allow | every role |
| `Edit` · `Write` | medium | allow within the role's write scope | roles with a `filesystem_write` scope |
| `Bash` | **HIGH** | allow, governed | `implementer`, `test-engineer`, `adversarial-auditor` |
| `WebFetch` · `WebSearch` | medium | allow | `researcher` only |
| `Agent` | medium | allow, gated | the orchestrator only |

### Bash is not a peer of the others

**Bash's effective permission is the union of every policy it can reach around.** Any claim about filesystem, network or credential control is conditional on the Bash guard holding (architecture §L axis 9). That is why it is classified rather than merely listed.

It is governed by one `PreToolUse` entry point composing independently tested pure functions:

| Function | Surface | Style | Rung |
|---|---|---|---|
| `git-write` | git subcommands | **allowlist** — a closed, known set | 1 |
| `evidence-write` | redirection, `tee`, `mv`, `rm`, truncate against `evidence/**` | allowlist of safe forms | 1 |
| `resources-write` | the same against `resources/**` | allowlist of safe forms | 1 |
| `destructive` | recursive delete, force-move outside the tree | ask | 1 |

One entry point, not five registrations: `PreToolUse` fires per tool call, so five would mean five process spawns per command. Each function is unit-tested separately, and every denial names the function, the rule id and the reason.

**Withholding beats guarding.** `researcher` and `harness-evaluator` hold no `Bash` at all — a tool a role does not have cannot be misused, which is stronger than any pattern match.

**Not built:** the network-egress function. Specified and deferred — best-effort by construction, and it currently guards nothing, since no credential, remote or production system is reachable from this workspace. Trigger in architecture §M.

---

## 4 · Policy Contract

**Answers:** what governs, in what order, and how a new policy is added.

The ladders live in [`40-agent-policy.md`](../../.claude/rules/40-agent-policy.md) (`G-01`, `G-02`) because they are normative and must be loaded. This section covers the mechanics around them.

### The boundary set

| Boundary | Mechanism | Rule |
|---|---|---|
| git writes and `.git/**` | `deny` + `git-write` | `H-01` |
| `resources/**` writes | `deny` + `resources-readonly` | `H-02` |
| `evidence/**` writes | `deny` + `evidence-readonly` | `H-03` |
| `private/**` reads by delegated roles | `deny` | `H-04` |
| delegation on an unapproved spec | `delegation-gate` | `H-05` |

**Every one is a `deny` rule or a guard denial. None is an `ask` rule.** Deny survives `bypassPermissions`; `ask` does not (`G-03`). That is not a stylistic preference — it is the difference between a boundary and a suggestion.

### Adding a policy

1. **Propose** — what it says, and the concrete failure it prevents.
2. **Validate against real state** (`P-04`) — is it already enforced? Already covered by another rule? Actually true of this repository?
3. **Classify** — which surface, which rung is *achievable*, and is it waivable (A3) or not (A1)?
4. **Write the row** with a stable id and an origin.
5. **If it lands at rung 1**, write the guard and its red-path battery *before* claiming the rung.

And the half people forget: **when a rule becomes mechanized, update its rung** — including downward (`G-11`).

---

## 5 · Evidence Contract

**Answers:** what happened, and how do we know.

### The three-event schema

Correlated by `tool_use_id`. `executed` is **derived**, not stored: a request carrying a deny decision and no result is an attempt.

```jsonc
{ "ev":"tool.requested", "ts":"...", "seq":41, "run_id":"...", "agent":"implementer",
  "tool":"Bash", "tool_use_id":"...", "target":"<redacted summary>" }

{ "ev":"policy.decision", "ts":"...", "seq":42, "tool_use_id":"...",
  "decision":"deny", "source":"guard", "guard":"bash-policy/git-write",
  "rule":"H-01", "reason":"git commit" }

{ "ev":"tool.result", "ts":"...", "seq":43, "tool_use_id":"...",
  "ok":false, "duration_ms":12, "error_class":"..." }
```

Plus a **run header** — `run_id`, `agent`, `model`, `permission_mode`, `enforcement_environment`, `isolation`, budgets — and a **run footer** carrying the `termination` block from the Run Contract.

**Why the phases matter:** they are the only thing that separates *the agent tried something dangerous and was stopped* from *something dangerous happened*. Those are opposite outcomes — one of them is the harness working — and a flat log of tool calls cannot tell them apart.

### Two write-time properties

**`seq`** — a monotonic counter per run. A gap means truncation or a crashed hook. This makes the trace **gap-evident**, which is what the architecture claims. It is not tamper-proof, and it does not say it is.

**Redaction** — record `file_path`, byte length and a content hash, never file contents. Scrub command strings against `private/banned-terms.txt` before writing. **Not optional:** a trace of a session that touched `private/` would recreate the exact leak this repository exists to prevent (`C-05`, `H-04`).

### Evidence per done-dimension

```yaml
done:
  tests:      { status: passed,         evidence: [gate-run:2026-08-18T14:22Z, exit:0] }
  security:   { status: not_applicable, reason: "no auth surface, no public endpoint" }
  docs:       { status: passed,         evidence: [docs/adr/README.md#L12] }
  ci:         { status: not_applicable, reason: "no remote exists" }
```

Three rules stop this becoming bookkeeping. **Evidence is a pointer** — a trace event, a guard name and exit code, a file path, a run id — never a sentence. **`not_applicable` carries a one-line reason** and needs no evidence. **Only applicable dimensions are listed**, so a content item costs three lines, not nine.

`wrap-up` fails when any dimension reads `passed` with empty evidence.

### The rule above all of these

**The artifact outranks the report.** Where an agent's account and the trace disagree, the trace wins (`P-11`). A report is a claim; verifying it is a separate act.

---

## 6 · Evaluation Contract

**Answers:** can the agent do the task, and is the harness paying.

### Eval case

```yaml
id: EC-0NN
descends_from: INC-0N      # every case names its incident
question:                  # one line: what this proves
input:                     # the prompt or situation presented
environment:               # what must exist for the case to run
expected_behavior:         # what the harness must do
forbidden_behavior:        # what must NOT happen
required_evidence:         # the artifact that proves it — never "the agent said so"
control:                   # what to remove to make this case fail
proof:                     # file + test — the executable demonstration, or the literal `none`
outcome:                   # Caught | Partial | Gap
```

`check-evals` asserts that `proof.file` exists **and contains `proof.test` verbatim**. Existence alone would pass forever after a rename, which is `INC-07`'s shape inside the checker built to prevent it. A case writing `proof: none` carries a `proof_reason` and **cannot claim `Caught`** — without a control to remove, the only thing that could have produced a pass is a model behaving well.

Coverage is checked in both directions: every incident in architecture §C has a case **or** a reasoned entry in `evals.excluded`, and an exclusion whose incident no longer exists is reported as stale. Adding a fourteenth incident fails the gate until someone decides which it is.

**Adversarial cases assert on the guard's verdict and the trace, never on the model declining** (`A16`). A case that passes because the model refused is measuring the model, and it will start failing silently on a model upgrade while the harness is unchanged.

**A case must be demonstrated failing** when the control it covers is removed. One that cannot be shown failing is documentation, and belongs in architecture §C.

### The loop, which is the actual requirement

```text
incident  →  eval case  →  regression
```

Every incident produces a case. A case is never deleted — it is retired with a written reason and a date, and retired ids are not reused. The *count* is not an architectural property.

### The KPI set

Three outcome metrics and two metric families. The scorecard template names all five, so they are defined here — the contract that claims to own the KPI set is the file that has to carry it.

| KPI | What it counts | Substrate | Read from |
|---|---|---|---|
| **K1** · passes-to-done | Implement→verify iterations before the human accepts done. **The hydra metric**, and the single most important number here: it is the exact failure the harness was built to kill (`INC-01`). Target ≤ 2 | observable | the work log's iteration record, corroborated by the trace |
| **K2** · done-reopens | Times a work item declared done was reopened. A reopen means "done" meant something different to the two parties, which is `INC-01`'s mechanism rather than its symptom | observable | `TASKS.md` status transitions and `progress/` |
| **K3** · escaped defects | Defects found after a done claim, counted per work item. The lagging measure the other two are supposed to move | observable | `progress/` findings, later work items citing an earlier one |
| **L** · context load | Did the rule file enter context? A hygiene indicator, **never a compliance claim** | observable | `instructions.loaded` events |
| **V** · rule violations | Was a rule broken? | observable where a guard exists; audit-scored otherwise | guard denials in the trace; auditor findings |

**L and V are defined in architecture §K and summarized here, not restated** — the reasoning for splitting adherence from outcome lives there, and one copy of a definition is the only number of copies that cannot drift (`G-10`).

The trap the split exists to prevent: **L at 100% with V above zero means the rule's content or its enforcement rung is wrong — not that it was not loaded.** An adherence KPI built on `instructions.loaded` alone would sit at 100% forever while hiding every real violation.

**A KPI with no measurement is reported as `unmeasurable` with its raw count, never as a ratio.** A ratio claims a precision the substrate does not have, and `C-01`'s logic applies to the harness's own numbers exactly as it does to a case study's.

### Declaring a harness failure

Two conditions, both of which must be allowed to be true:

- **Adherence near 100% and outcome KPIs flat** — the harness's *content* is wrong, not compliance. A rule is missing or mistaken.
- **Passes-to-done not falling across two or three comparable items** — the harness is not paying.

At small N the honest question is not "is the slope positive" but *did the known failure modes recur?* — which is answerable with two data points and worth the hour.

Every scorecard declares two biases, because both silently invalidate a comparison: **circularity** (was the instrument changed by the work it scores?) and **composition** (is the scored work mostly harness work, so the harness is being scored on itself?).

**The correct response to a failed harness is to cut or correct it.** A harness nobody is allowed to conclude against is a belief system, not a tool (`P-12`).
