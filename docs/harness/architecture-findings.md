# Harness v2 — findings resolution

> **Status:** Resolution complete · input for the architecture amendment
> **Date:** 2026-08-17
> **Scope:** the 20 findings raised against [architecture.md](architecture.md). Not a new review — no part of the architecture is reopened beyond what a finding forces.
> **End of life:** once the amendments in §10 are applied to `architecture.md` and the architecture is frozen, this file is superseded. Keep it as the record of *why* the amendments exist; do not maintain it in parallel.

**Verification note.** Several findings turn on how Claude Code actually behaves. Everything cited below was checked against current official documentation during this session, and three findings changed answer as a result — most importantly POINT 8, where the architecture names a tool that no longer exists.

---

## 1 · Trust hierarchy: HUMAN > POLICY

### Severity
CRITICAL

### Current Architecture
§B defines one seven-level ladder (`HUMAN_INSTRUCTION` … `MEMORY`) and states "lower number wins".

### Problem
The ladder conflates two different questions. Levels 1–3 answer *whose intent governs*; levels 4–7 answer *what may be treated as an instruction at all*. Reading them as one ordered list implies an in-session human instruction outranks project policy — including a non-negotiable security boundary.

### Why It Matters
An implementer reading the ladder literally would build a "the human said so" escape hatch into the rules. That hatch is both unnecessary and contrary to how the runtime actually behaves.

### Evidence

[Source] Deny rules block in every permission mode, including `bypassPermissions`; allow rules have no effect in that mode. Separately, a `PreToolUse` hook returning `"allow"` does not override a deny rule — Claude Code evaluates deny and ask rules regardless of hook output, preserving deny-first precedence.

Link: https://code.claude.com/docs/en/permission-modes and https://code.claude.com/docs/en/permissions

[inferido] Therefore the runtime already implements *policy over in-session intent* for anything expressed as a deny rule. The human can still override — by editing a settings file and restarting — but that is an out-of-band, file-level, reviewable act, not a conversational one. The architecture document is describing the system incorrectly, not describing a system that needs changing.

### Proposed Solution
Split the single ladder into two, and name the class of policy that no instruction moves.

### Architectural Compatibility
Yes. It is a correction to §B, not a new mechanism.

### Implementation Feasibility
Low — documentation plus one rule row.

### Cost / Complexity
Low.

### Security Impact
High. It fixes the top of the security model.

### Operational Impact
Low.

### Recommendation
🟡 ADOPT WITH MODIFICATION

### Recommended Final Form

```text
AUTHORITY LADDER — whose intent governs
  A1  NON-NEGOTIABLE POLICY   deny rules + guards. No in-session instruction moves these.
                              Changed only by editing settings/rules out of band, which is
                              itself a reviewable event.
  A2  HUMAN INSTRUCTION       this session, from the human. Governs everything below.
  A3  NEGOTIABLE POLICY       rules at rung 2-4. The human may waive one, in writing, per
                              work item, with the waiver recorded in the work log.
  A4  APPROVED SPEC           status: active AND approved_version == version

DATA-TRUST LADDER — what may be treated as an instruction
  D1  REPOSITORY DATA         code, docs, resources/    ┐
  D2  TOOL OUTPUT             command output            │ all four are DATA.
  D3  EXTERNAL CONTENT        web/fetched               │ None may issue instructions.
  D4  MEMORY                  a cache, never authority  ┘
```

Plus one rule: **a boundary that must not be waivable is expressed at A1, and A1 is realized as a deny rule — never as an `ask` rule, a procedure step, or prose.**

### Orchestrator Replica
No reasonable replica.

The runtime already behaves the corrected way, the behavior is documented, and the current wording is a demonstrable inconsistency with it. Rejecting the correction would leave the architecture describing a permission model the tool does not implement.

### Final Decision
🟡 ADOPT WITH MODIFICATION — replace the single ladder with the two ladders above and add the A1 realization rule.

### Required Architecture Change
§B trust hierarchy (rewrite); §E invariant 13 (reword to reference the data ladder); one new rule in `.claude/rules/40-agent-policy.md`.

### Implementation Consequence
Step 2 writes the A1 rule. Step 5 must express every A1 boundary as a `permissions.deny` entry, never as `ask`.

---

## 2 · Integrity of the JSONL evidence trace

### Severity
IMPORTANT

### Current Architecture
§B layer 06 declares `evidence/runs/<session-id>/<run>.jsonl` "append-only", written by hooks.

### Problem
"Append-only" is asserted, not enforced. Nothing stops the agent appending forged lines or rewriting the file via Bash redirection, nothing defines what may not be recorded, and retention is undefined. A trace that the scored entity can edit has the same substrate problem the architecture accuses markdown of having.

### Why It Matters
The trace is the basis for every observable KPI and for POINT 18's request/execution distinction. If it is editable without trace, the harness's measurement rests on the same self-report it was built to escape.

### Evidence

[Source] Deny rules can block `Write`/`Edit` against a path, and a bare tool name in a deny rule removes the tool from Claude's context entirely while a scoped rule blocks matching calls.

Link: https://code.claude.com/docs/en/permissions

[inferido] Deny rules on `Write`/`Edit` do not cover Bash redirection, `tee`, `mv` or truncation against the same path — those are Bash calls, matched as Bash patterns. So file-tool denial alone leaves the primary vector open, and Bash needs its own rule (see POINT 13).

[inferido] The adversary model here is *an agent that misreports*, not a determined attacker with shell access outside the tool. Tamper-**evidence** is therefore sufficient and tamper-**proofing** is not required: a hash chain makes silent truncation or edit detectable at zero infrastructure cost, whereas signing or WORM storage buys nothing against this adversary.

### Proposed Solution
Four cheap measures, no cryptographic infrastructure.

### Architectural Compatibility
Yes.

### Implementation Feasibility
Low–Medium. Sequence + chain is ~15 lines inside the existing hook.

### Cost / Complexity
Low.

### Security Impact
Medium.

### Operational Impact
Low.

### Recommendation
🟡 ADOPT WITH MODIFICATION

### Recommended Final Form

1. **Writer/reader split.** Hooks write. Every role is denied `Write`/`Edit` on `evidence/**`, and the Bash guard denies redirection, `tee`, `mv`, `rm` and truncation targeting it. Reads stay open — the evaluator needs them.
2. **Tamper-evidence.** Each event carries `seq` (monotonic per run) and `prev_hash` (hash of the previous line). A gap or a broken chain is a finding, surfaced by the gate.
3. **Redaction at write time.** The trace records `file_path`, byte length and a content hash — never file contents. Command strings are scrubbed against `private/banned-terms.txt` and common secret patterns before being written. This is not optional: an unredacted trace of a session touching `private/` would recreate the leak the whole repository is built to prevent.
4. **Retention.** Keep the last N runs (`guards.config.json`), prune at wrap-up. `evidence/runs/` stays gitignored.

**Explicitly not adopted:** signing, external WORM storage, an append-only filesystem mount.

### Orchestrator Replica
Valid trade-off exists.

#### Possible Orchestrator Counterargument
Hash chaining is ceremony for a single-developer project. Nobody is attacking this trace; the realistic failure is that the trace is never read, not that it is forged.

#### Resolution of Counterargument
Partially accepted, and it is why signing and WORM are rejected. The chain itself stays, on one ground: §J forbids claiming an enforcement level that has not been earned, and the architecture currently uses the words "append-only" in a security context. Either the property becomes true enough to state, or the word comes out. Fifteen lines is cheaper than the second option, and the chain also catches the *accidental* case — a hook crash mid-write leaving a partial file — which is far more likely than forgery.

### Final Decision
🟡 ADOPT WITH MODIFICATION — adopt the four measures; reject signing and WORM.

### Required Architecture Change
§B layer 06; the Evidence Contract in `contracts.md`; new deny rules; `guards.config.json` retention key.

### Implementation Consequence
Step 7 implements `seq` + `prev_hash` + redaction inside `record-event.mjs`. Step 10's gate verifies chain continuity for the current run.

---

## 3 · Credential propagation vs credential storage

### Severity
MODERATE now · HIGH once a deploy credential exists

### Current Architecture
§L axis 5 controls credential **storage access**: `private/**` and `.env*` denied at read.

### Problem
Denying reads of credential files says nothing about what a spawned process inherits from the environment. A Bash command, an npm script or a Node process inherits the session's environment variables and can exfiltrate anything in them without ever reading a denied file.

### Why It Matters
The distinction is invisible today because the project has no secrets — no remote, no deploy, no API keys. TASK 7 introduces hosting and deploy, which introduces a token. The control must exist before the credential does, not after.

### Evidence

[Source] `sandbox.credentials` declares credential files and environment variables to protect from sandboxed commands — and "the setting affects sandboxed Bash commands only." Since the sandbox does not run on native Windows, this mechanism is unavailable here.

Link: https://code.claude.com/docs/en/sandboxing

[Source] The same page names the platform-independent alternative: "To strip Anthropic and cloud provider credentials from all subprocesses regardless of sandboxing, set `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`."

Link: https://code.claude.com/docs/en/sandboxing

[inferido] Its exact variable list was not confirmed from the environment-variable reference during this session, so implementation must verify what it strips rather than assume it covers project secrets. It plausibly covers Anthropic and cloud-provider variables only, which would leave a project-specific deploy token untouched.

### Proposed Solution
Adopt the cheap, platform-independent half now; make the policy the primary control.

### Architectural Compatibility
Yes.

### Implementation Feasibility
Low.

### Cost / Complexity
Low.

### Security Impact
Medium.

### Operational Impact
Low.

### Recommendation
🟡 ADOPT WITH MODIFICATION

### Recommended Final Form

Split §L axis 5 into two:

- **5a Credential storage** — `private/**`, `.env*` denied at read. Rung 1.
- **5b Credential propagation** — the session environment carries **no project secret**. Deploy and publication credentials live in the hosting provider or CI secret store and are never present in the local environment, so there is nothing for a subprocess to inherit. Additionally set `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` in `settings.env` as defence in depth. Rung 1 by construction (the secret is absent), rung 3 for the discipline that keeps it absent.

**Deferred with a trigger:** per-role credential scoping, and any masking/injection scheme. Trigger — a workflow that genuinely requires a credential *in the agent's environment*. Deploying from CI rather than from the agent's machine avoids the trigger entirely and is the recommended shape.

### Orchestrator Replica
Valid trade-off exists.

#### Possible Orchestrator Counterargument
There are no secrets. This is a control for a threat that does not exist, and the architecture warns against adopting ceremony with no incident behind it.

#### Resolution of Counterargument
Accepted in part — which is why per-role scoping and masking are deferred rather than built. The remaining adoption is one settings line and one policy sentence, and the trigger is the next task in the backlog, not a hypothetical. The policy half also does real work now: it *decides* that deploy happens from CI rather than from the agent's machine, and that decision is cheaper to make before TASK 7 than to reverse after it.

### Final Decision
🟡 ADOPT WITH MODIFICATION — split the axis, adopt the policy and the env scrub, defer scoping and masking.

### Required Architecture Change
§L axis 5 (split); one rule in `40-agent-policy.md`; `settings.env`.

### Implementation Consequence
Step 5 sets the variable and verifies what it actually strips. TASK 7's hosting ADR must record where the deploy credential lives.

---

## 4 · Policy-only vs OS-level sandbox: formalize as a declared profile?

### Severity
IMPORTANT

### Current Architecture
§L already states plainly that OS-level sandboxing is unavailable, that isolation is policy-level, and that this is an honest 🔧 rather than a claimed 🔒.

### Problem
The limitation is documented in prose but is not a *field*. Nothing in a run record, a scorecard, or the eventual export states which enforcement regime produced the result.

### Why It Matters
TASK 9 exports this harness to other projects, some of which will run on Linux or macOS with the sandbox available. An `EVAL` produced under policy-only enforcement and one produced under OS isolation are not comparable, and nothing currently marks the difference. This is the same class of error as an undeclared evaluation bias, which §K already treats as invalidating.

### Evidence

[Source] The Bash sandbox runs on macOS, Linux and WSL2; native Windows is unsupported. Its filesystem, network-proxy and credential-masking features are all conditional on it.

Link: https://code.claude.com/docs/en/sandboxing

[inferido] Since the same harness definition can run under either regime, the regime is a property of the *run*, not of the harness, and therefore belongs in the run record.

### Proposed Solution
One declared field. Not a taxonomy.

### Architectural Compatibility
Yes.

### Implementation Feasibility
Low.

### Cost / Complexity
Low.

### Security Impact
Medium — it prevents an overclaim from travelling with the export.

### Operational Impact
Low.

### Recommendation
✅ ADOPT

### Recommended Final Form

```text
enforcement_environment:  policy-controlled | os-sandboxed
```

Recorded once in `architecture.md` §L as the current value, stamped into the header event of every run trace, and reprinted in every `EVAL` scorecard. Definitions:

- **policy-controlled** — boundaries enforced by the tool's permission engine and by hooks. A process that escapes the tool's mediation is outside the boundary.
- **os-sandboxed** — the above, plus operating-system enforcement of filesystem and network limits on spawned processes.

No further profile structure. The security-claim rule follows: **the harness may claim only what its current `enforcement_environment` supports.**

### Orchestrator Replica
No reasonable replica.

The limitation is already conceded in prose; naming it as a field costs one key and is the only thing that keeps scorecards comparable across machines. Rejecting it would mean knowingly exporting incomparable evaluations.

### Final Decision
✅ ADOPT

### Required Architecture Change
§L (add the field and the claim rule); Evidence Contract (run header); Evaluation Contract (scorecard header).

### Implementation Consequence
Step 7 stamps it. Step 11's `EVAL-000` prints it.

---

## 5 · Network control

### Severity
IMPORTANT

### Current Architecture
§L axis 4 lists network control at **rung 1**, realized by granting `WebFetch`/`WebSearch` only to `researcher` and denying `Bash(curl *)`.

### Problem
Network egress is reachable through any binary: `wget`, `Invoke-WebRequest`, `nc`, `ssh`, `git`, `npm`, `node -e`, `python`, or a script the agent legitimately wrote. An enumeration of network commands is a roster, and the architecture's own INC-07 says a roster silently stops protecting. Claiming rung 1 for this axis is therefore an overclaim.

### Why It Matters
Overclaiming an enforcement rung retires a human eye that is still needed — §J states this as a principle and then §L violates it in the same document.

### Evidence

[Source] Domain-level network control (`network.allowedDomains`, the sandbox proxy) is a sandbox feature, and the sandbox does not run on native Windows.

Link: https://code.claude.com/docs/en/sandboxing

[Source] Without a sandbox, the documented approach is best-effort and hook-based: "Use PreToolUse hooks: implement a hook that validates URLs in Bash commands and blocks disallowed domains."

Link: https://code.claude.com/docs/en/permissions

[Source] Claude Code refuses content-field permission patterns such as `Bash(command:rm *)` precisely because they "would be bypassable by a compound command" — an explicit vendor acknowledgment that Bash-string matching has bypass surface.

Link: https://code.claude.com/docs/en/permissions

### Proposed Solution
Keep the controls; correct the claim.

### Architectural Compatibility
Yes, with modification — the mechanism stays, the stated rung changes.

### Implementation Feasibility
Low.

### Cost / Complexity
Low.

### Security Impact
Medium — no new protection, but an accurate statement of what exists.

### Operational Impact
Low.

### Recommendation
🟡 ADOPT WITH MODIFICATION

### Recommended Final Form

Split §L axis 4 by what is actually enforceable:

| Sub-axis | Control | Rung |
|---|---|---|
| **4a Declared network tools** | `WebFetch` / `WebSearch` granted only to `researcher`; absent from every other role's `tools` list | **1** — a tool a role does not hold cannot be called |
| **4b Network via shell** | A Bash guard denying known egress binaries, plus `researcher` holding no Bash at all | **3** — best-effort. An unenumerated binary or a written script defeats it |
| **4c Domain allowlisting** | Not available under `policy-controlled` | **not available** — returns with `os-sandboxed` |

And the honest statement: **under `policy-controlled`, the harness cannot prevent a determined agent from reaching the network through the shell. It can prevent the easy paths, and it records every attempt.** The compensating control is evidence (POINT 18), not prevention.

### Orchestrator Replica
No reasonable replica.

This corrects an overclaim against the document's own stated principle. There is no version of "keep rung 1" that survives §J.

### Final Decision
🟡 ADOPT WITH MODIFICATION — keep the mechanisms, restate the axis at its real rungs, and remove `Bash` from `researcher`.

### Required Architecture Change
§L axis 4 (split and re-rung).

### Implementation Consequence
Step 6 writes the egress-binary guard as one function inside the Bash policy guard. Step 8 gives `researcher` no `Bash`.

---

## 6 · Parent/child permission inheritance and `bypassPermissions`

### Severity
CRITICAL

### Current Architecture
§L axis 1 relies on per-agent `tools` allowlists; §B layer 05 lists `permissionMode` as a per-role control.

### Problem
A role can declare a restrictive posture and still be overridden by the environment it launches in. If the parent session runs under `bypassPermissions`, prompts and `ask` rules stop applying. A harness whose boundaries rest on `ask` rules or on role prose therefore has no boundary at all in that mode.

### Why It Matters
This determines *which mechanism every boundary in the harness must use*. Getting it wrong means the boundaries look right in the files and evaporate under one launch flag.

### Evidence

[Source] "Deny rules block in every mode, including `bypassPermissions`. … Allow rules have no effect in `bypassPermissions`."

Link: https://code.claude.com/docs/en/permission-modes

[Source] `bypassPermissions` cannot be entered from a session that was not started with it enabled; it requires a launch flag or `permissions.defaultMode`. Administrators can block it with `permissions.disableBypassPermissionsMode: "disable"` in **managed** settings.

Link: https://code.claude.com/docs/en/permission-modes

[Source] A subagent's `permissionMode` defaults to inheriting the parent session's mode; deny rules in settings apply to subagent tool calls, and narrowing a subagent's `tools` field limits what it can reach in the first place.

Link: https://code.claude.com/docs/en/sub-agents and https://code.claude.com/docs/en/tools-reference

[inferido] Managed settings live at a machine/organization path, not in the repository, so **this project cannot disable `bypassPermissions` for itself.** What it can do is (a) make every real boundary deny-based, so the mode does not matter for them, and (b) record the mode in the trace so a bypass session is visible in evidence.

### Proposed Solution
Make the boundary mechanism explicit, and make the mode observable.

### Architectural Compatibility
Yes.

### Implementation Feasibility
Low.

### Cost / Complexity
Low.

### Security Impact
High.

### Operational Impact
Low.

### Recommendation
✅ ADOPT

### Recommended Final Form

A new core invariant:

> **A boundary that must hold is expressed as a `permissions.deny` rule or as a `PreToolUse` guard denial. `ask` rules, `permissionMode`, and role prose are hardening, not boundaries — `bypassPermissions` removes them.**

Plus the explicit statement of a subagent's real security boundary:

```text
A subagent's effective capability =
      (tools it was granted)
  MINUS (deny rules — survive every mode)
  MINUS (PreToolUse guard denials — run for every tool except EndConversation)
  and NOTHING ELSE is load-bearing.
```

Plus: a rule that harness runs are not conducted under `bypassPermissions`, classified honestly as **rung 4** (the project cannot enforce it), compensated by a `SessionStart` trace event recording `permission_mode` so any bypass run is visible to the evaluator and can be excluded from scorecards.

### Orchestrator Replica
No reasonable replica.

The behavior is documented, and the consequence — which mechanism each boundary must use — is not a matter of preference. Recording the mode instead of pretending to prevent it is the only honest available position.

### Final Decision
✅ ADOPT

### Required Architecture Change
§E (new invariant); §L axis 1 (state the effective-capability formula); §B layer 03; one rung-4 rule with its compensating evidence.

### Implementation Consequence
Step 5 must express every boundary as `deny`, never `ask`, and audit the settings file for any `ask` rule doing boundary work. Step 7 records `permission_mode` at `SessionStart`.

---

## 7 · `InstructionsLoaded` ≠ adherence

### Severity
MODERATE

### Current Architecture
§D lists `InstructionsLoaded` as "observable proof the rules loaded", and the plan positioned it as upgrading the inherited "bootstrap honored" KPI from self-reported to observable.

### Problem
Loading is not following. `InstructionsLoaded` proves a file entered context and nothing more. Presenting it as an adherence measurement repeats, one level down, exactly the substrate error the architecture exists to correct.

### Why It Matters
An adherence number that actually measures file loading will sit at 100% forever and hide every real violation.

### Evidence

[Source] The `InstructionsLoaded` hook reports which instruction file loaded, when, and why (`session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`). It is informational; its exit code is ignored.

Link: https://code.claude.com/docs/en/hooks

[Source] CLAUDE.md and rules "are loaded at the start of every conversation. Claude treats them as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse hook instead."

Link: https://code.claude.com/docs/en/memory

[inferido] The vendor's own framing — context, not enforcement — is precisely the loaded/followed gap, and it forces the two into separate metrics.

### Proposed Solution
Two metric families instead of one.

### Architectural Compatibility
Yes.

### Implementation Feasibility
Low.

### Cost / Complexity
Low.

### Security Impact
Low.

### Operational Impact
Low.

### Recommendation
✅ ADOPT

### Recommended Final Form

| Family | Question | Substrate | Source |
|---|---|---|---|
| **L — Context load** | Did the rule file enter context? | observable | `InstructionsLoaded` events |
| **V — Violations** | Was a rule broken? | observable where a guard exists; audit-scored otherwise | guard deny events; auditor findings |

With the reading rule, which mirrors the existing adherence-vs-outcome logic: **L at 100% with V above zero means the rule's content or its enforcement rung is wrong — not that it was not loaded.** L is a hygiene indicator and never a compliance claim.

### Orchestrator Replica
No reasonable replica.

The distinction is definitional and the vendor documentation states the underlying limitation directly.

### Final Decision
✅ ADOPT

### Required Architecture Change
§D row (reword `InstructionsLoaded` as context-load evidence); `metrics.md` KPI families.

### Implementation Consequence
Step 7 records the events. Step 11 keeps L and V in separate tables in the scorecard.

---

## 8 · The delegation gate names a tool that does not exist

### Severity
CRITICAL

### Current Architecture
§D and §F specify the delegation gate as **`PreToolUse` matched on `Task`**, replacing the inherited `SubagentStart` design.

### Problem
The decision to move off `SubagentStart` is correct. The tool name is not. **The tool that spawns a subagent is `Agent`.** `TaskCreate` and `TaskUpdate` are the task-list tools and have nothing to do with delegation. A hook matched on `Task` would never gate a delegation — and would fail silently, which is INC-08's exact shape: a guard that runs zero times while everything looks green.

### Why It Matters
This is the mechanized half of the spec checkpoint, the control that INC-05 produced. Implemented against the wrong tool name, the single most important gate in the harness would be inert from day one.

### Evidence

[Source] The tools reference lists `Agent` — "Spawns a subagent with its own context window to handle a task" — alongside `TaskCreate` and `TaskUpdate`, which create and update entries in the task list. Tool names are "the exact strings you use in permission rules, subagent tool lists, and hook matchers."

Link: https://code.claude.com/docs/en/tools-reference

[Source] "PreToolUse hooks run before the permission prompt, for every tool except `EndConversation`." A `PreToolUse` hook can deny via exit code 2 or `permissionDecision: "deny"`.

Link: https://code.claude.com/docs/en/permissions and https://code.claude.com/docs/en/hooks

[Source] `SubagentStart` fires when a subagent is spawned and **cannot block** — exit 2 shows stderr to the user only, and the subagent still runs.

Link: https://code.claude.com/docs/en/hooks

[inferido] Ordering follows from the two trigger definitions: `PreToolUse` fires before the `Agent` tool call executes, and the subagent is spawned *by* that execution, so `PreToolUse(Agent)` strictly precedes `SubagentStart`. `PreToolUse(Agent)` is therefore both the earlier hook and the only one that can deny.

[Source] Note also that launching a subagent does not itself prompt for permission — the `Agent` tool is marked as not requiring approval — so the permission engine will not gate delegation on its own. The hook is the whole gate.

Link: https://code.claude.com/docs/en/tools-reference

### Proposed Solution
Rename the matcher. The design is unchanged.

### Architectural Compatibility
Yes — a factual correction, not a redesign.

### Implementation Feasibility
Low.

### Cost / Complexity
Low.

### Security Impact
High — the difference between a gate and no gate.

### Operational Impact
Low.

### Recommendation
✅ ADOPT

### Recommended Final Form

```text
Delegation gate:  PreToolUse, matcher "Agent"
                  denies when any spec is status: draft,
                  or an active spec's approved_version != version
                  and the target role is write-capable
                  (write-capability read off the role's own tools list — property, not roster)

SubagentStart:    trace only. It cannot deny.
```

Add to the guard's own test suite a **liveness assertion**: a test that fails if the guard is never invoked during the acceptance run. A gate that cannot be observed firing is indistinguishable from a gate that does not exist — the INC-08 lesson applied to the harness's own tooling.

### Orchestrator Replica
No reasonable replica.

The tool name is a documented fact and the failure mode of getting it wrong is silent.

### Final Decision
✅ ADOPT — replace `Task` with `Agent` in every occurrence, and add the liveness assertion.

### Required Architecture Change
§D (two rows); §F (Run contract row); §B layer 05.

### Implementation Consequence
Step 6 matches on `Agent`. Step 12's acceptance suite must show the guard firing, not merely present.

---

## 9 · Budget model

### Severity
IMPORTANT

### Current Architecture
§F and the Run Contract summary list `maxTurns`, tool calls, wall clock and cost. §I says budget exhaustion terminates a run as `FAILED` with the budget named.

### Problem
Only `maxTurns` maps to a native capability. The others are listed as though they were equally available, which invites an implementation that silently enforces none of them.

### Why It Matters
INC-06 is the incident behind budgets: an agent cut off mid-run delivers zero, not half. A budget that is described but not enforced provides none of that protection while appearing to.

### Evidence

[Source] Subagent frontmatter supports `maxTurns` (positive integer, no limit by default). No native per-run tool-call ceiling, wall-clock limit, retry limit or cost limit is exposed to subagent configuration.

Link: https://code.claude.com/docs/en/sub-agents

[Source] `BASH_DEFAULT_TIMEOUT_MS` and `BASH_MAX_TIMEOUT_MS` bound individual Bash commands, not a run.

Link: https://code.claude.com/docs/en/env-vars

[inferido] Tool-call count and elapsed wall clock are both derivable from the trace this harness already writes, so a `PreToolUse` guard can read the current run's events and deny past a ceiling. That converts them from unavailable to enforced without any vendor feature. Cost is not exposed to hooks at all and cannot be made observable this way.

### Proposed Solution
Adopt the five-field model with a per-field honest classification.

### Architectural Compatibility
Yes.

### Implementation Feasibility
Medium — the budget guard is real code, but it reuses the trace reader.

### Cost / Complexity
Medium.

### Security Impact
Low.

### Operational Impact
Medium — a hook on every tool call.

### Recommendation
🟡 ADOPT WITH MODIFICATION

### Recommended Final Form

| Field | Status | Mechanism |
|---|---|---|
| `maxTurns` | **ENFORCED** | native subagent frontmatter |
| `maxToolCalls` | **ENFORCED** (harness-implemented) | budget guard counts the run's `tool.requested` events, denies past the ceiling |
| `maxRuntime` | **ENFORCED** (harness-implemented) | budget guard compares against the run header timestamp |
| `maxRetries` | **OBSERVED** | counted from `PostToolUseFailure` and repeated identical requests; not enforced |
| `maxCost` | **NOT AVAILABLE** | not exposed to hooks. Never reported as a number; a token/cost KPI stays unmeasurable under `policy-controlled` |

Exhaustion behavior is unchanged: terminate `FAILED`, name the budget, deliver nothing partial.

### Orchestrator Replica
Valid trade-off exists.

#### Possible Orchestrator Counterargument
A `PreToolUse` guard on every single tool call adds latency and a failure point to every action in the session, to enforce ceilings a solo developer would notice anyway by watching the session.

#### Resolution of Counterargument
Accepted as a constraint on *how*, not *whether*. The budget guard must not be a second `PreToolUse` pass: it runs inside the same hook entry point as `record-event`, which already fires on every tool call and already reads/writes the trace. Marginal cost is one comparison against counters the hook is computing anyway. If that single entry point becomes slow, the whole evidence layer is already too expensive and the problem is not budgets.

### Final Decision
🟡 ADOPT WITH MODIFICATION — five fields, classified as above, with budget enforcement folded into the existing hook.

### Required Architecture Change
Run Contract in `contracts.md`; §I (name which budgets are real).

### Implementation Consequence
Step 7 builds one `PreToolUse` entry point doing record + budget. Step 9's delegation brief template carries the budget fields.

---

## 10 · Prompt injection — what happens after the model is wrong

### Severity
CRITICAL

### Current Architecture
§B places repository data, tool output, external content and memory at trust levels 4–7 as data. §L axis 8 rates prompt-injection resistance at rung 3–4.

### Problem
The design describes what the model *should* do. It does not state what happens when the model does the wrong thing — which is the only case that matters, because a defense that assumes correct model behavior is not a defense.

### Why It Matters
Rung 3–4 is honest about the mechanism but leaves the consequence unstated. The harness needs a written answer to: *if the agent fully obeys an injected instruction, what can it actually accomplish?*

### Evidence

[Source] `bypassPermissions` "offers no protection against prompt injection or unintended actions" — the vendor states plainly that permission-mode convenience and injection resistance are separate concerns.

Link: https://code.claude.com/docs/en/permission-modes

[Source] Deny rules and `PreToolUse` guards evaluate on the tool call, independent of the model's reasoning, and deny-first precedence means a hook returning `"allow"` cannot override a deny rule.

Link: https://code.claude.com/docs/en/permissions

[inferido] The chain is `untrusted instruction → agent reasoning → tool request → policy enforcement`, and only the final stage is independent of the compromise. Prompt rules and adversarial review reduce the *probability* of a bad request; only rung-1 enforcement bounds its *impact*. The architecture must therefore be evaluated on its blast radius, not on its instructions.

### Proposed Solution
Write down the post-compromise blast radius, and fix how the injection eval case scores.

### Architectural Compatibility
Yes.

### Implementation Feasibility
Low — analysis and documentation.

### Cost / Complexity
Low.

### Security Impact
High.

### Operational Impact
Low.

### Recommendation
✅ ADOPT

### Recommended Final Form

Add to §L a **post-compromise blast radius** section, stated as an assumption rather than a hope:

> Assume the model obeys an injected instruction completely. Under `policy-controlled`, it can still: write and delete files in the working tree outside `resources/`, `.git/`, `evidence/` and `private/`; run arbitrary shell commands not matched by a deny rule; reach the network through an unenumerated binary. It cannot: commit, push or otherwise alter the branch or remote; modify `resources/`; modify or delete the trace without breaking its hash chain; read `private/**` through file tools; act without every attempt being recorded.
>
> **The residual risk is accepted** on the grounds that the repository is fully versioned, the human reviews one diff before any commit, and no production system or credential is reachable from this workspace. That acceptance is void the moment a deploy credential enters the environment — see POINT 3.

And a correction to the eval case: **`EC-008` asserts on the guard's verdict and the trace, never on the model declining.** An eval that passes because the model refused is measuring the model, not the harness, and will silently start failing on a model upgrade.

### Orchestrator Replica
No reasonable replica.

Every element of the mitigation already exists in the architecture; what is missing is the statement of what remains after they all apply, and an eval-scoring correction without which the case measures the wrong thing.

### Final Decision
✅ ADOPT

### Required Architecture Change
§L (new blast-radius subsection with an explicit risk acceptance); Evaluation Contract (scoring rule for adversarial cases).

### Implementation Consequence
Step 11 writes `EC-008` to assert on trace evidence. The risk acceptance is revisited at TASK 7.

---

## 11 · Eval suite — requirement or baseline?

### Severity
MODERATE

### Current Architecture
§D and §O specify "10 executable cases" as a deliverable of step 11.

### Problem
A fixed count is not an architectural property. Ten invites padding when there are eight real cases and deletion pressure when there are fourteen.

### Why It Matters
The architecture explicitly refuses to build a large benchmark. A number in the architecture is the wrong lever for that; an invariant about *provenance* is the right one.

### Evidence

[inferido] No external source needed. The architecture already holds that a rule with no origin is ceremony; the same logic applies to an eval case, and a count requirement creates cases without origins.

### Proposed Solution
Move the number out of the architecture and put an invariant in its place.

### Architectural Compatibility
Yes.

### Implementation Feasibility
Low.

### Cost / Complexity
Low.

### Security Impact
Low.

### Operational Impact
Low.

### Recommendation
🟡 ADOPT WITH MODIFICATION

### Recommended Final Form

Architectural requirement — the mechanism and the loop:

> **Every incident produces an eval case.** `incident → case → regression`. A case names the incident it descends from. A case is never deleted; it is retired with a written reason and a date, and retired ids are not reused.

Baseline, not requirement: ten cases at step 11, one per `INC-01`…`INC-11` minus those with no executable form. The count is expected to grow by one per incident and is never a target.

Growth control, so the suite does not become the benchmark the architecture refuses: **a case must be executable and must fail when the control it covers is removed.** A case that cannot be shown failing is documentation, and belongs in §C.

### Orchestrator Replica
No reasonable replica.

The change reduces scope and removes a number that could only cause the two failure modes it was meant to prevent.

### Final Decision
🟡 ADOPT WITH MODIFICATION — the loop is the requirement; ten is the starting count.

### Required Architecture Change
§D row; §K; §O step 11 wording.

### Implementation Consequence
Step 11 produces however many cases have real origins, and each must be demonstrated failing once.

---

## 12 · Harness-evaluator write boundary

### Severity
IMPORTANT

### Current Architecture
The role is described as auditing the harness and proposing improvements, with a prose boundary: "you do not change the harness."

### Problem
The boundary is prose. The evaluator holds write tools in order to produce a scorecard, and prose does not stop it editing the rules, guards or architecture it is scoring.

### Why It Matters
§K already names **circularity** — the instrument changed by the work it scores — as a bias that silently invalidates a comparison. Declaring the bias while leaving the capability in place is weaker than removing the capability.

### Evidence

[Source] Subagent definitions support a `hooks` field carrying `PreToolUse`, `PostToolUse` and `Stop` hook definitions scoped to that agent.

Link: https://code.claude.com/docs/en/sub-agents

[Source] Global `permissions.deny` rules apply to every tool call, including a subagent's.

Link: https://code.claude.com/docs/en/permissions

[inferido] Global deny cannot express "this role may not write here but that role may", because it is not role-scoped. A **per-agent `PreToolUse` hook** is the only mechanism that gives one role a narrower write scope than another. This generalizes: write scope is a per-role property and needs a per-role enforcement point.

### Proposed Solution
A shared, parameterized write-scope guard, wired per role.

### Architectural Compatibility
Yes.

### Implementation Feasibility
Medium — one guard, wired in several agent files.

### Cost / Complexity
Medium.

### Security Impact
Medium.

### Operational Impact
Low.

### Recommendation
✅ ADOPT

### Recommended Final Form

Write scope becomes a declared, enforced field of the Agent Contract:

| Role | Write scope | Mechanism |
|---|---|---|
| `harness-evaluator` | `progress/evaluations/**` only | per-agent `PreToolUse` write-scope guard |
| `researcher` | none | no write tools granted — simpler and stronger than a guard |
| `adversarial-auditor` | the work-item log only | per-agent write-scope guard |
| `implementer` | the files named in its run contract | per-agent write-scope guard, fed by the brief |
| `test-engineer` | test files and the files named in its run contract | same |

One implementation (`write-scope.mjs`), parameterized per agent. Universal denials (`resources/**`, `.git/**`, `evidence/**`) stay global — they apply to everyone and belong in `settings.json`.

### Orchestrator Replica
Valid trade-off exists.

#### Possible Orchestrator Counterargument
This is a single-developer project and all five roles are our own. Enforcing a boundary against a role we wrote, to stop it editing files we would notice in the diff, is theatre — and it adds a hook to every agent.

#### Resolution of Counterargument
Rejected for the evaluator specifically, accepted as a reason to keep the implementation to one shared function. The evaluator's entire value is that it can conclude the harness is not paying; that conclusion is worthless if the same role could have adjusted the rules it scores against. Making circularity structurally impossible is categorically better than declaring it in a bias section, and it is the difference between a measurement and an opinion. The cost objection is answered by one parameterized guard rather than five bespoke ones — and by the fact that `researcher` needs no guard at all, since withholding write tools is stronger.

### Final Decision
✅ ADOPT

### Required Architecture Change
Agent Contract in `contracts.md` (write scope as a declared field); §L axis 1; `check-agents.mjs` asserts every role declares one.

### Implementation Consequence
Step 6 writes `write-scope.mjs`. Step 8 wires it per role and declares each scope.

---

## 13 · Bash as a high-risk capability

### Severity
CRITICAL

### Current Architecture
Bash appears as an ordinary entry in role `tools` lists.

### Problem
Bash is not one capability among others — it is the universal solvent that reaches around filesystem, network, credential and git policy expressed at the tool level. Treating it as a peer of `Read` understates every other axis in §L, because each of those axes is only as strong as Bash's containment.

### Why It Matters
Every rung-1 claim in the security model is conditional on Bash being governed. Ungoverned, §L's axes 3, 4, 5 and 7 are all reachable around.

### Evidence

[Source] Claude Code rejects content-field permission patterns such as `Bash(command:rm *)` because they "would be bypassable by a compound command", emitting a startup warning instead. The supported form is `Bash(rm *)`.

Link: https://code.claude.com/docs/en/permissions

[Source] Compound commands are decomposed for rule purposes: approving `git status && npm test` saves a rule for `npm test`, "so future `npm test` invocations are recognized regardless of what precedes the `&&`."

Link: https://code.claude.com/docs/en/permissions

[Source] A bare `Bash` deny rule removes the tool from context entirely; a scoped rule such as `Bash(rm *)` leaves it available and blocks matching calls. Deny beats allow, and a broad deny cannot carry allowlist exceptions.

Link: https://code.claude.com/docs/en/permissions

[inferido] Decomposition helps but does not close the gap: a script the agent writes and then executes, or an unenumerated binary, presents no matching string. Enumerating dangerous commands is a roster, and INC-07 says a roster silently stops protecting. The workable posture is allowlist where the surface is closed (git subcommands are a finite, known set) and denylist-plus-recording where it is open (network binaries, destructive commands).

### Proposed Solution
Classify Bash, govern it by one composed guard, and withhold it where it is not needed.

### Architectural Compatibility
Yes.

### Implementation Feasibility
Medium–High. This is the largest guard in the harness.

### Cost / Complexity
High.

### Security Impact
Critical.

### Operational Impact
Medium — it sits on every shell call.

### Recommendation
🟡 ADOPT WITH MODIFICATION

### Recommended Final Form

In the Tool Contract:

```text
Bash   risk: HIGH
       Bash's effective permission is the UNION of every policy it can reach around.
       Any security claim about filesystem, network, credentials or git is conditional
       on the Bash policy guard holding.
```

Governed by one `PreToolUse` entry point composing independently testable pure functions:

| Function | Surface | Style | Rung |
|---|---|---|---|
| `git-write` | git subcommands | **allowlist** — closed, known set | 1 |
| `evidence-write` | redirection / `tee` / `mv` / `rm` / truncate against `evidence/**` | allowlist of safe forms | 1 |
| `resources-write` | same against `resources/**` | allowlist of safe forms | 1 |
| `net-egress` | known egress binaries | denylist — open surface | 3 |
| `destructive` | recursive delete, force-move outside the tree | ask | 1 |

Plus capability withholding, which is stronger than any guard: `researcher` and `harness-evaluator` get **no Bash**.

**Rejected:** removing Bash (the gate, the tests and the mutation run all need it); and any attempt to make Bash safe by enumerating dangerous commands, which is INC-07 rebuilt.

### Orchestrator Replica
Valid trade-off exists.

#### Possible Orchestrator Counterargument
One guard doing five unrelated jobs is a design smell, and putting five checks on the hot path of every shell command will make the session noticeably slower and harder to debug when one misfires.

#### Resolution of Counterargument
Accepted as a constraint on structure, not on scope. There is **one hook entry point** because Claude Code fires `PreToolUse` per tool call and five registrations would mean five process spawns per command; there are **five pure functions** behind it, each independently unit-tested with its own red-path battery, and the entry point reports which function denied and why. That satisfies the design objection without paying the process cost five times. The debuggability objection is answered by the same reporting: a denial names its function, its rule id and its reason, and the denial is in the trace.

### Final Decision
🟡 ADOPT WITH MODIFICATION — Bash classified HIGH, governed by one composed guard, withheld from two roles.

### Required Architecture Change
Tool Contract in `contracts.md`; §L (state that axes 3–5 and 7 are conditional on the Bash guard).

### Implementation Consequence
Step 6's largest single piece. Each function ships with red-path tests before it is wired.

---

## 14 · Worktree isolation triggers

### Severity
MODERATE

### Current Architecture
§M defers worktree isolation with the trigger "two roles need to write concurrently".

### Problem
Concurrency is not the only condition under which an isolated checkout pays. Hard-to-revert or exploratory work contaminates the working tree in ways a single reviewer then has to untangle from the intended change.

### Why It Matters
The architecture's git boundary rests on the human seeing one clean diff. Work that churns the tree — an experiment, a bulk move, a deletion — degrades that diff whether or not two agents ran at once.

### Evidence

[Source] `isolation: worktree` is a supported subagent frontmatter field that runs the agent in an isolated git worktree.

Link: https://code.claude.com/docs/en/sub-agents

[Source] A `WorktreeCreate` hook exists and can abort creation on any non-zero exit, so worktree use is itself governable.

Link: https://code.claude.com/docs/en/hooks

[inferido] The capability is available today; only the policy is deferred. Widening the trigger list therefore costs nothing at implementation time and only changes when the existing field gets set.

### Proposed Solution
Keep non-default. Write down the trigger list and make the choice explicit per run.

### Architectural Compatibility
Yes.

### Implementation Feasibility
Low.

### Cost / Complexity
Low.

### Security Impact
Low.

### Operational Impact
Medium when triggered — each isolated run adds a review-and-merge step.

### Recommendation
🟡 ADOPT WITH MODIFICATION

### Recommended Final Form

Isolation stays **off by default**, and becomes a declared field of the Run Contract (`isolation: none | worktree`) so the choice is explicit and traced rather than ad hoc. Triggers that require `worktree`:

1. Two roles writing concurrently *(the original trigger)*
2. A work item typed `experiment` or `migration`
3. A run whose brief includes bulk deletion or bulk relocation of existing files
4. A run against a work item the human has marked high-risk

Blueprint step 12 — deleting the inherited export after verifying zero references — meets trigger 3 and is the harness's first real use of the field.

### Orchestrator Replica
Valid trade-off exists.

#### Possible Orchestrator Counterargument
Worktrees on Windows plus a merge step per delegation is real friction for a solo developer, and the triggers are subjective enough that they will be ignored in practice.

#### Resolution of Counterargument
Accepted, and it is why isolation stays off by default and why the trigger list is short and concrete rather than a judgment call about "risky" work. The change is narrow: the choice becomes a recorded field instead of an unrecorded habit. If the triggers are ignored in practice, the trace will show `isolation: none` on a run that met one, which is a finding the evaluator can act on — which is strictly better than the current state, where the question is never asked.

### Final Decision
🟡 ADOPT WITH MODIFICATION — non-default, four named triggers, declared per run.

### Required Architecture Change
§M (replace the single trigger); Run Contract (`isolation` field).

### Implementation Consequence
Step 3 adds the field to the brief template. Step 12 uses it for the export deletion.

---

## 15 · TDD — universal invariant or policy by work-item type?

### Severity
IMPORTANT

### Current Architecture
§D gives the implementer a TDD contract: red → green → refactor, with the failing test named before the code that satisfies it.

### Problem
Stated as a role property it reads as universal, but most of this repository's history is `content` work, where there is nothing to write a failing test against. A universal rule that visibly does not apply to the majority of past work is the definition of ceremony.

### Why It Matters
The architecture holds that one disbelieved rule discredits the registry. Universal TDD would be disbelieved on its first content item.

### Evidence

[inferido] No external source applies. The reasoning is internal: D3 already scoped TDD and mutation to guards and the content pipeline, so extending the obligation to every work-item type contradicts a decision already taken.

### Proposed Solution
Make TDD a policy keyed on work-item type, and state the applicability per type explicitly.

### Architectural Compatibility
Yes — it aligns the role contract with D3.

### Implementation Feasibility
Low.

### Cost / Complexity
Low.

### Security Impact
Low.

### Operational Impact
Low.

### Recommendation
🟡 ADOPT WITH MODIFICATION

### Recommended Final Form

TDD is **policy by work-item type**, not a core invariant:

| type | TDD | Form |
|---|---|---|
| `harness` (guards) | **required** | red → green → refactor, including the red-path battery |
| `feature` touching guards or the content pipeline | **required** | red → green → refactor |
| `bugfix` in the same surface | **required** | the failing test must **reproduce the bug** before the fix; a bugfix with no reproducing test is not done |
| `migration` | **required** where it touches that surface | as above |
| `refactor` | **not applicable** | tests must exist and pass before *and* after; adding a test is not what makes it a refactor |
| `content` · `research` · `planning` · `documentation` · `configuration` | **not applicable** | declared out loud, per the existing not-applicable rule |

The universal part is narrower and survives: **no production behavior in the mutation-covered surface ships without a test that fails before it.**

### Orchestrator Replica
No reasonable replica.

Universal TDD is demonstrably inapplicable to `content`, which is the type of every completed work item in this repository to date.

### Final Decision
🟡 ADOPT WITH MODIFICATION

### Required Architecture Change
`.claude/rules/30-testing.md`; the implementer role file; `procedures.md` done-dimensions.

### Implementation Consequence
Step 2 writes the type table. Step 8's implementer references it rather than restating TDD unconditionally.

---

## 16 · Evidence required per done-dimension

### Severity
IMPORTANT

### Current Architecture
"Done" is the conjunction of applicable dimensions, and inapplicable ones are declared out loud (§E invariant 10).

### Problem
Both halves are prose. A dimension marked done in a paragraph is a claim, which is precisely what invariant 8 says loses to an artifact — so the done-conjunction currently contradicts the evidence principle one level up.

### Why It Matters
INC-01 is the incident: "done" declared four times, each meaning something different, each unverifiable at the time it was said. Structure is what makes the conjunction checkable rather than assertable.

### Evidence

[inferido] Internal consistency argument. The architecture already requires evidence to outrank self-report and already requires not-applicable to be declared; giving each dimension a status and a pointer is the mechanical form of two rules it already holds.

### Proposed Solution
A minimal structured block per work item. Pointers, never narrative.

### Architectural Compatibility
Yes.

### Implementation Feasibility
Low–Medium.

### Cost / Complexity
Low, if capped.

### Security Impact
Low.

### Operational Impact
Low–Medium — bookkeeping per work item.

### Recommendation
✅ ADOPT

### Recommended Final Form

```yaml
done:
  tests:      { status: passed,         evidence: [gate-run:2026-08-17T14:22Z, exit:0] }
  security:   { status: not_applicable, reason: "no auth surface, no public endpoint" }
  docs:       { status: passed,         evidence: [docs/adr/README.md#L12] }
  ci:         { status: not_applicable, reason: "no remote exists" }
```

Rules that keep the cost bounded:

- **Evidence is a pointer** — a trace event id, a guard name plus exit code, a file path, a run id. Never a sentence of explanation.
- `not_applicable` carries a `reason`, one line. No `evidence` needed.
- Dimensions are listed only when they apply or are explicitly waived; a `content` item is three or four lines, not nine.
- The wrap-up procedure fails if any applicable dimension has `status: passed` with an empty `evidence`.

### Orchestrator Replica
Valid trade-off exists.

#### Possible Orchestrator Counterargument
This adds structured bookkeeping to every work item, including trivial ones, and the architecture warns repeatedly against ceremony.

#### Resolution of Encounterargument
Accepted as a reason to cap the format, not to drop it. The cap is the pointer rule: if evidence can only be a pointer, the block cannot grow into an essay, and a `content` item costs three lines. Without the block the done-conjunction is exactly the prose claim that INC-01 produced, and the last automated check that could catch a hollow "done" disappears.

### Final Decision
✅ ADOPT — with the pointer cap and the applicable-only rule.

### Required Architecture Change
`procedures.md` done-dimensions; the work-item template; `wrap-up` gains the empty-evidence check.

### Implementation Consequence
Step 3 defines the block. Step 9's `wrap-up` enforces it.

---

## 17 · `POLICY_VIOLATION` as a lifecycle state

### Severity
MODERATE

### Current Architecture
§I defines `CREATED → … → COMPLETE` with off-ramps `BLOCKED`, `ESCALATED`, `FAILED`, `CANCELLED`.

### Problem
A policy violation is currently indistinguishable from any other failure in the lifecycle. The question is whether it deserves a state of its own.

### Why It Matters
The distinguishability is genuinely needed — for the unsafe-action-attempt metric, for debugging, and for excluding violating runs from scorecards. The question is only whether a *state* is the right carrier.

### Evidence

[inferido] Lifecycle states answer one question: can this work continue, and by whom? A policy violation produces no new answer to that question — the run either stops (`FAILED`) or requires a human (`ESCALATED`), both of which already exist. Adding a state duplicates an existing axis and forces every transition table, procedure and report to handle a case that behaves identically to one it already handles. §I's own constraint is that no state exists which does not correspond to a step someone actually performs, and nobody performs a "policy violation" step.

### Proposed Solution
Reject the state. Carry the distinction as required termination metadata, where it is queryable.

### Architectural Compatibility
No, as a state. Yes, as metadata.

### Implementation Feasibility
Low.

### Cost / Complexity
Low.

### Security Impact
Low.

### Operational Impact
Low.

### Recommendation
❌ REJECT (as a lifecycle state)

### Recommended Final Form

Lifecycle unchanged. Termination gains required structured metadata:

```yaml
termination:
  state:  FAILED | ESCALATED | BLOCKED | CANCELLED | COMPLETE
  reason: policy_violation | budget_exhausted | objective_unmet |
          dependency_missing | human_decision_required | withdrawn
  rule:   <rule id>        # required when reason == policy_violation
  guard:  <guard name>     # required when reason == policy_violation
```

This gives every consumer the finding asked for:

- **evaluation** — filter runs by `reason`, exclude violating runs from a scorecard;
- **observability** — count violations per rule id, which a single state could never do;
- **metrics** — unsafe-action attempts already come from deny events, not from states;
- **debugging** — the rule and guard are named, where a state would say only "policy";
- **reporting** — the reason appears in the run summary.

### Orchestrator Replica
Valid trade-off exists.

#### Possible Orchestrator Counterargument
A first-class state is more visible. A reason code buried in metadata is easy to overlook in a report, and policy violations are exactly what should be impossible to overlook.

#### Resolution of Counterargument
Rejected. Visibility is a property of the report, not of the state machine — and the reason code is strictly *more* visible in the dimension that matters, because it names the rule and the guard while a `POLICY_VIOLATION` state names neither. Grouping by reason also answers "which rule is violated most often", which no state can. If violations turn out to be under-noticed in practice, the fix is to surface them in the run summary and the scorecard, not to add a state whose transitions then have to be defined everywhere.

### Final Decision
❌ REJECT as a state; adopt required termination metadata instead.

### Required Architecture Change
§I (add the termination block); Run Contract; Evidence Contract.

### Implementation Consequence
Step 7 records `termination`. Step 11 filters on `reason`.

---

## 18 · Trace semantics — requested vs executed

### Severity
IMPORTANT

### Current Architecture
§B layer 06 describes the trace as recording tool calls, permission decisions, guard verdicts and subagent start/stop, without defining the event schema.

### Problem
Without phase structure, the trace cannot distinguish *an agent requested a dangerous action and was stopped* from *a dangerous action happened*. Those are opposite outcomes — one is the harness working, the other is the harness failing.

### Why It Matters
This distinction is the basis of the unsafe-action-attempt metric, of POINT 10's blast-radius argument, and of POINT 17's reason codes. Without it, none of the three can be computed.

### Evidence

[Source] The hook events supply exactly these phases: `PreToolUse` (before execution, can deny, carries `tool_name`, `tool_input`, `tool_use_id`); `PermissionRequest` and `PermissionDenied` (the decision and its denial); `PostToolUse` (success, carries `tool_output`) and `PostToolUseFailure` (failure, carries `error_message`). All carry `tool_use_id`.

Link: https://code.claude.com/docs/en/hooks

[inferido] `tool_use_id` is present across the phases, so correlation needs no invented key. And because a denied call never produces a `PostToolUse`, "requested but not executed" is *derivable* from the absence of a result event — so no separate `executed` event is needed, and the schema stays at three event types instead of five.

### Proposed Solution
Three correlated event types, minimum viable.

### Architectural Compatibility
Yes.

### Implementation Feasibility
Medium.

### Cost / Complexity
Medium.

### Security Impact
Medium.

### Operational Impact
Low.

### Recommendation
✅ ADOPT

### Recommended Final Form

```jsonc
// tool.requested   — from PreToolUse
{ "ev":"tool.requested", "ts":"…", "seq":41, "prev_hash":"…",
  "run_id":"…", "agent":"implementer", "tool":"Bash",
  "tool_use_id":"…", "target":"<redacted summary>" }

// policy.decision  — from the PreToolUse guard, PermissionRequest or PermissionDenied
{ "ev":"policy.decision", "ts":"…", "seq":42, "prev_hash":"…",
  "tool_use_id":"…", "decision":"deny", "source":"guard",
  "guard":"bash-policy/git-write", "rule":"P-01", "reason":"git commit" }

// tool.result      — from PostToolUse or PostToolUseFailure
{ "ev":"tool.result", "ts":"…", "seq":43, "prev_hash":"…",
  "tool_use_id":"…", "ok":false, "duration_ms":12, "error_class":"…" }
```

Derived, not stored: `executed = exists(tool.result for tool_use_id)`. An attempt is `tool.requested` with `decision: deny` and no result — which is the query the unsafe-action metric runs.

Plus two run-scoped events: a header (`run_id`, `agent`, `model`, `permission_mode`, `enforcement_environment`, `isolation`, budgets) and a footer (the `termination` block from POINT 17).

### Orchestrator Replica
No reasonable replica.

The events already exist, correlation already exists via `tool_use_id`, and without the phase split the trace cannot answer the question it was built to answer.

### Final Decision
✅ ADOPT

### Required Architecture Change
Evidence Contract in `contracts.md` (full schema); §B layer 06 (reference it).

### Implementation Consequence
Step 7 implements three writers plus header and footer. Step 11's metrics query the derived form.

---

## 19 · State authority

### Severity
IMPORTANT

### Current Architecture
`TASKS.md`, `progress/TASK-N.md`, the trace, the spec and the §I lifecycle all carry state-like information, with no stated authority among them.

### Problem
Two distinct problems. First, authority is unassigned, so `progress/` currently *looks* like it might be a state source. Second — and not raised in the finding — §I presents a single lifecycle, but work-item state and run state are different machines: one work item has many runs, and `IN PROGRESS` is not a point on the `CREATED → COMPLETE` path.

### Why It Matters
Two sources for one state is a stated non-goal. The item/run conflation is the more likely error in practice, because it makes the lifecycle look applicable to `TASKS.md` entries, which it is not.

### Evidence

[inferido] Structural. `TASKS.md` tracks deliverables across sessions; the trace tracks executions within a session. TASK 5 is one work item that will span many runs and many sessions, so a single state machine cannot describe both without one of them being wrong.

### Proposed Solution
Assign authority explicitly, and separate the two state machines.

### Architectural Compatibility
Yes, with modification — the proposed split is right but incomplete.

### Implementation Feasibility
Low — documentation.

### Cost / Complexity
Low.

### Security Impact
Low.

### Operational Impact
Low.

### Recommendation
🟡 ADOPT WITH MODIFICATION

### Recommended Final Form

| Concern | Authority | States | Never authoritative for |
|---|---|---|---|
| **Work-item state** | `TASKS.md` | `TODO` · `IN PROGRESS` · `BLOCKED` · `DONE` | run outcomes |
| **Run state** | the trace | `CREATED → … → COMPLETE` + off-ramps (§I) | whether the item is done |
| **Intended behavior + approval** | the spec (`version`, `approved_version`, `status`) | `draft` · `active` · `shipped` · `superseded` | either of the above |
| **Narrative** | `progress/TASK-N.md` | none | **anything** — it is a log |

Two rules:

> **§I's lifecycle describes a run, not a work item.** A work item has many runs. Its status is derived by a human at wrap-up, never inferred automatically from run states.
>
> **`progress/` is authoritative for nothing.** It records reasoning and decisions. Where it disagrees with the trace, the trace wins (invariant 8).

### Orchestrator Replica
No reasonable replica.

Two sources for one state is already a stated non-goal, and the item/run conflation is demonstrable from TASK 5, which is a single work item spanning many runs.

### Final Decision
🟡 ADOPT WITH MODIFICATION — adopt the authority table plus the item/run separation the original proposal omitted.

### Required Architecture Change
§I (retitle as the **run** lifecycle; add the authority table); §B layer 01.

### Implementation Consequence
Step 3's work-item template carries only work-item states. Step 9's `wrap-up` derives item status from the human's judgment, not from the trace.

---

## 20 · Security profiles as a separate taxonomy

### Severity
MODERATE

### Current Architecture
Roles carry their posture directly: `tools`, `model`, `maxTurns`, `permissionMode`, plus prose boundaries.

### Problem
Posture is currently expressed inconsistently across role files — partly in frontmatter, partly in prose — with nothing asserting that every role declares every dimension. The proposal is a `RESEARCH / IMPLEMENT / AUDIT / HIGH_RISK` profile layer.

### Why It Matters
The inconsistency is real. Whether a profile *taxonomy* fixes it is a separate question, and the finding itself warns against roles and profiles becoming two redundant taxonomies.

### Evidence

[Source] Role posture is already expressible in frontmatter: `tools`, `disallowedTools`, `model`, `maxTurns`, `permissionMode`, per-agent `hooks`, `isolation`.

Link: https://code.claude.com/docs/en/sub-agents

[inferido] With five roles, a profile layer maps almost one-to-one onto the roles, so it adds indirection without compression. A taxonomy earns its place when there is duplication to factor out; here there is none. The valuable part of the proposal is not the abstraction — it is the **checklist of dimensions** every role must declare.

### Proposed Solution
Take the fields, leave the taxonomy.

### Architectural Compatibility
Yes for the fields. The taxonomy is compatible but not currently justified.

### Implementation Feasibility
Low.

### Cost / Complexity
Low.

### Security Impact
Medium — it makes an undeclared posture impossible.

### Operational Impact
Low.

### Recommendation
🟡 ADOPT WITH MODIFICATION

### Recommended Final Form

**The role *is* the security profile.** No separate taxonomy. The Agent Contract gains six required, machine-checkable dimensions, and `check-agents.mjs` fails any role that omits one:

```text
filesystem_read     scope
filesystem_write    scope   (POINT 12)
network             yes | no
credentials         none | <named>
approval_required   [] | [<action>…]
isolation           none | worktree   (POINT 14)
```

Because they are checked rather than described, a new role cannot be added with an undeclared posture — the property-based version of the check, per INC-07.

**Deferred, with a trigger:** extracting named profiles. Trigger — more than about eight roles, **or** two roles needing identical non-trivial postures. Until then, duplication does not exist and factoring it out is speculative.

### Orchestrator Replica
Valid trade-off exists.

#### Possible Orchestrator Counterargument
TASK 9 exports this harness to other projects whose roles will differ. Named profiles would travel better than per-role postures, because another project could adopt `AUDIT` without adopting our `adversarial-auditor`.

#### Resolution of Counterargument
Real, and it is why the taxonomy is deferred with a trigger rather than rejected. But the export can carry the six **dimensions** — which is the portable part — and let the adopting project fill them for its own roles. A profile taxonomy exported before we have felt any duplication would be exporting a guess, which is precisely what TASK 9 is scheduled late to avoid.

### Final Decision
🟡 ADOPT WITH MODIFICATION — adopt the six declared dimensions; defer named profiles.

### Required Architecture Change
Agent Contract in `contracts.md`; `check-agents.mjs` assertions; §M (add the deferred entry with its trigger).

### Implementation Consequence
Step 3 defines the dimensions. Step 6's roster guard asserts them. Step 8 declares them per role.

---

## 9 · Final resolution matrix

| # | Issue | Severity | Decision | Architecture change | Impl. cost | Risk if rejected |
|---|---|---|---|---|---|---|
| 1 | Trust hierarchy HUMAN > POLICY | CRITICAL | 🟡 ADOPT+MOD | §B, §E, rules | Low | A "human said so" bypass is built into the rules |
| 2 | Trace integrity | IMPORTANT | 🟡 ADOPT+MOD | §B, Evidence Contract | Low | "Append-only" is a false claim; KPIs rest on editable data |
| 3 | Credential propagation | MODERATE→HIGH | 🟡 ADOPT+MOD | §L axis 5, settings | Low | A TASK 7 deploy token becomes inheritable by every subprocess |
| 4 | Enforcement environment field | IMPORTANT | ✅ ADOPT | §L, Evidence, Evaluation | Low | Scorecards from different regimes silently compared |
| 5 | Network control rung | IMPORTANT | 🟡 ADOPT+MOD | §L axis 4 | Low | Overclaim retires a human eye that is still needed |
| 6 | Permission inheritance / bypass | CRITICAL | ✅ ADOPT | §E, §L, §B | Low | Boundaries built on `ask` evaporate under one launch flag |
| 7 | `InstructionsLoaded` ≠ adherence | MODERATE | ✅ ADOPT | §D, metrics | Low | An adherence KPI pinned at 100% that measures nothing |
| 8 | **Delegation gate names `Task`** | CRITICAL | ✅ ADOPT | §D, §F, §B | Low | **The main gate never fires, silently (INC-08)** |
| 9 | Budget model | IMPORTANT | 🟡 ADOPT+MOD | Run Contract, §I | Medium | Budgets described but unenforced; INC-06 recurs |
| 10 | Prompt injection aftermath | CRITICAL | ✅ ADOPT | §L, Evaluation | Low | Blast radius never bounded; EC-008 measures the model |
| 11 | Eval suite count | MODERATE | 🟡 ADOPT+MOD | §D, §K, §O | Low | Padding or deletion pressure around an arbitrary number |
| 12 | Evaluator write boundary | IMPORTANT | ✅ ADOPT | Agent Contract, §L | Medium | Circularity declared but not prevented |
| 13 | Bash as HIGH risk | CRITICAL | 🟡 ADOPT+MOD | Tool Contract, §L | High | Every other rung-1 claim is reachable around |
| 14 | Worktree triggers | MODERATE | 🟡 ADOPT+MOD | §M, Run Contract | Low | Tree contamination degrades the one reviewable diff |
| 15 | TDD universal | IMPORTANT | 🟡 ADOPT+MOD | rules, implementer | Low | A rule disbelieved on its first content item |
| 16 | Evidence per done-dimension | IMPORTANT | ✅ ADOPT | procedures, template | Low | Done-conjunction stays prose; INC-01 recurs |
| 17 | `POLICY_VIOLATION` state | MODERATE | ❌ REJECT | §I metadata instead | Low | (rejecting the state costs nothing; metadata carries it) |
| 18 | Trace phase semantics | IMPORTANT | ✅ ADOPT | Evidence Contract, §B | Medium | Cannot distinguish attempted from executed |
| 19 | State authority | IMPORTANT | 🟡 ADOPT+MOD | §I, §B | Low | Two sources of truth; run lifecycle misapplied to items |
| 20 | Security profiles | MODERATE | 🟡 ADOPT+MOD | Agent Contract, §M | Low | Roles ship with undeclared posture |

**Totals:** 7 ✅ ADOPT · 11 🟡 ADOPT WITH MODIFICATION · 1 ❌ REJECT · 1 partial defer inside #20. No finding was dismissed without analysis.

---

## 10 · Architecture amendments required

Only changes that must actually be applied, grouped by area.

### Policy
- **A1** Replace the single trust ladder in §B with the **authority ladder** and the **data-trust ladder**; add the rule that a non-negotiable boundary is realized as a deny rule. *(P1)*
- **A2** New invariant in §E: only `deny` rules and `PreToolUse` guard denials are boundaries; `ask`, `permissionMode` and prose are hardening. *(P6)*
- **A3** New rung-4 rule: harness runs are not conducted under `bypassPermissions`, compensated by recording `permission_mode` at `SessionStart`. *(P6)*

### Execution
- **A4** §D, §F, §B: the delegation gate is `PreToolUse` matched on **`Agent`**, not `Task`. Add a liveness assertion to its tests. *(P8)*
- **A5** Tool Contract: `Bash` classified `risk: HIGH`, governed by one composed `PreToolUse` entry point with five independently tested pure functions. `researcher` and `harness-evaluator` receive no Bash. *(P13)*
- **A6** §L axis 4 split into 4a (rung 1), 4b (rung 3), 4c (not available); remove the blanket rung-1 claim for network control. *(P5)*
- **A7** §L axis 5 split into 5a storage and 5b propagation; add `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` and the no-secrets-in-environment policy. *(P3)*
- **A8** Run Contract: five budget fields with per-field status — `maxTurns` ENFORCED (native), `maxToolCalls` and `maxRuntime` ENFORCED (harness guard), `maxRetries` OBSERVED, `maxCost` NOT AVAILABLE. *(P9)*
- **A9** Run Contract: `isolation: none | worktree` as a declared field, with four named triggers in §M. *(P14)*

### Evidence
- **A10** Evidence Contract: the three-event correlated schema (`tool.requested`, `policy.decision`, `tool.result`) plus run header and footer; `executed` is derived, not stored. *(P18)*
- **A11** Evidence Contract: `seq` + `prev_hash` tamper-evidence; write-time redaction against `banned-terms.txt` and secret patterns; retention in `guards.config.json`; deny writes to `evidence/**` at both the file-tool and Bash vectors. *(P2)*
- **A12** Run header carries `enforcement_environment`; scorecards reprint it. *(P4)*
- **A13** §I: required `termination` block with `state` + `reason` (+ `rule`, `guard` when `reason == policy_violation`). *(P17)*

### Evaluation
- **A14** `metrics.md`: split into **L** (context load, from `InstructionsLoaded`) and **V** (violations, from guard denials and audit findings); L is a hygiene indicator, never a compliance claim. *(P7)*
- **A15** §K: the architectural requirement is `incident → case → regression`, not a case count; a case must be demonstrable failing; retired, never deleted. *(P11)*
- **A16** Evaluation Contract: adversarial cases assert on guard verdict and trace evidence, never on the model declining. *(P10)*

### Lifecycle
- **A17** §I retitled as the **run** lifecycle, with the state-authority table separating work-item state (`TASKS.md`) from run state (trace) from intent (spec), and `progress/` authoritative for nothing. *(P19)*

### Security
- **A18** §L: new **post-compromise blast radius** subsection with an explicit, dated risk acceptance, void when a deploy credential enters the environment. *(P10)*
- **A19** §L: state that axes 3, 4, 5 and 7 are conditional on the Bash policy guard holding. *(P13)*

### Agents
- **A20** Agent Contract: six required, machine-checked posture dimensions (`filesystem_read`, `filesystem_write`, `network`, `credentials`, `approval_required`, `isolation`). *(P20)*
- **A21** Agent Contract: per-role write scope enforced by a shared per-agent `PreToolUse` guard; universal denials stay global. *(P12)*

### Procedures
- **A22** `procedures.md` + work-item template: per-dimension `status` + `evidence` block, pointers only, applicable dimensions only; `wrap-up` fails on `passed` with empty evidence. *(P16)*
- **A23** `.claude/rules/30-testing.md`: TDD as policy by work-item type, with `bugfix` additionally requiring a bug-reproducing failing test. *(P15)*

---

## 11 · Explicitly rejected / deferred

Analyzed and consciously left out. Absence from the amendments is a decision, not an oversight.

| Proposal | Verdict | Why | Revisit trigger |
|---|---|---|---|
| `POLICY_VIOLATION` as a lifecycle state | **Rejected** | Duplicates an existing axis; states answer "can work continue", and this adds no new answer. Reason codes carry more information (rule + guard) and support grouping. | — |
| Cryptographic signing of the trace | **Rejected** | Wrong adversary model. The threat is a misreporting agent, not an attacker with host access; hash chaining detects that at zero infrastructure cost. | An untrusted party gains write access to the workspace |
| External WORM / append-only mount for evidence | **Rejected** | Infrastructure for a single-developer local repo. | Same as above |
| Removing `Bash` from the harness | **Rejected** | The gate, the test suite and the mutation run all require it. Removal would break the harness to secure it. | — |
| Enumerating dangerous shell commands as the network/destructive control | **Rejected** | A roster. INC-07 says a roster silently stops protecting; allowlist where the surface is closed, record where it is open. | — |
| Named security profiles (`RESEARCH` / `IMPLEMENT` / `AUDIT` / `HIGH_RISK`) | **Deferred** | With five roles a profile layer maps ~1:1 onto roles — indirection with no compression. The portable part (the six dimensions) is adopted. | More than ~8 roles, or two roles needing identical non-trivial postures |
| Per-role credential scoping and masking | **Deferred** | No credential exists to scope. Masking is sandbox-only and unavailable on this platform. | A workflow requiring a credential *in the agent's environment* — avoidable by deploying from CI |
| Domain allowlisting for network egress | **Deferred** | Sandbox-only; unavailable under `policy-controlled`. | `enforcement_environment` becomes `os-sandboxed` |
| Worktree isolation as the default | **Deferred** | A merge step per delegation is real friction with no matching incident. Four named triggers adopted instead. | A tree-contamination incident, or routine concurrent delegation |
| TDD as a universal invariant | **Rejected** | Inapplicable to `content`, the type of every completed item in this repo. A visibly inapplicable rule discredits the registry. | — |
| A fixed count of eval cases | **Rejected** | Invites padding or deletion pressure. The loop is the requirement; the count floats. | — |
| Splitting an abstract core from the Claude Code adapter | **Not in scope** | Excluded from this review by instruction; the close coupling is deliberate for now. | TASK 9, or a second tool in real use |

---

## 12 · Orchestrator counterarguments

Only where a real trade-off existed. The other fourteen findings had no material counterargument — each was either a documented fact, a correction of an internal contradiction, or a change that reduced scope.

| # | Issue | Counterargument | Evidence | Resolution |
|---|---|---|---|---|
| 2 | Trace integrity | Hash chaining is ceremony for a solo project; nobody is forging this trace | [inferido] realistic failure is the trace going unread, not forged | **Partially accepted** — signing and WORM dropped. Chain kept: §J forbids claiming an unearned property, and the chain also catches accidental partial writes, which are likelier than forgery |
| 3 | Credential propagation | No secrets exist; a control for a non-existent threat | [inferido] true today | **Partially accepted** — scoping and masking deferred. One settings line and one policy sentence adopted, because the trigger is the next task and the policy decides *now* that deploy runs from CI |
| 9 | Budget model | A hook on every tool call adds latency and a failure point | [inferido] `PreToolUse` fires per tool call | **Accepted as a constraint on how** — budget enforcement folds into the existing `record-event` entry point; one hook, two jobs, no second process spawn |
| 12 | Evaluator write boundary | All roles are ours; enforcing against our own role is theatre | [inferido] solo project | **Rejected** — the evaluator's value is that it may conclude the harness is failing, which is worthless if it could edit what it scores. Cost objection answered with one shared parameterized guard |
| 13 | Bash governance | One guard doing five jobs is a design smell and slows the hot path | [Source] `PreToolUse` fires per tool call; five registrations mean five spawns | **Accepted as a structural constraint** — one entry point, five independently tested pure functions, each denial naming its function and rule |
| 14 | Worktree triggers | Windows worktrees plus a merge step per delegation is real friction; triggers will be ignored | [inferido] operational | **Accepted** — stays non-default with four concrete triggers. Ignoring a trigger now leaves an observable `isolation: none` in the trace, which the evaluator can act on |
| 16 | Per-dimension evidence | Structured bookkeeping on every item, including trivial ones | [inferido] ceremony risk | **Accepted as a cap, not a drop** — evidence must be a pointer, never prose; applicable dimensions only; a content item costs three lines |
| 17 | `POLICY_VIOLATION` state | A state is more visible than a metadata field | [inferido] reporting concern | **Rejected** — visibility belongs to the report; the reason code names rule and guard, which a state cannot, and supports grouping by rule |
| 20 | Security profiles | Profiles would export better to other projects (TASK 9) | [inferido] portability | **Partially accepted** — taxonomy deferred with a trigger; the six dimensions, which are the portable part, adopted now. Exporting profiles before feeling duplication would export a guess |

---

## 13 · Feasibility summary

| Band | Amendments | What it takes |
|---|---|---|
| **LOW** | A1, A2, A3, A4, A6, A7, A9, A12, A13, A14, A15, A16, A17, A19, A20, A23 | Documentation, rule rows, settings keys, and one matcher rename. No new machinery. A4 in particular is a one-word correction with a critical payoff. |
| **MEDIUM** | A8, A10, A11, A18, A21, A22 | Real code, all inside components already planned. A10 + A11 + A8 share one `PreToolUse` entry point. A21 is one parameterized guard wired per agent. A22 is a template plus one check in `wrap-up`. |
| **HIGH** | A5 | The Bash policy guard: five pure functions, each with a red-path battery, plus the composing entry point. The single largest piece of step 6, and the one every rung-1 claim depends on. |

**Claude Code surfaces required:** `PreToolUse` (matchers `Agent`, `Bash`, `Write`, `Edit`), `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied`, `SubagentStart`, `SubagentStop`, `SessionStart`, `SessionEnd`, `InstructionsLoaded`; `permissions.deny` / `.ask`; `settings.env`; per-agent `tools`, `disallowedTools`, `model`, `maxTurns`, `hooks`, `isolation`.

**Windows constraints carried:** no OS sandbox, so no domain allowlisting and no credential masking — both deferred behind `enforcement_environment`. Guards stay dependency-free Node `.mjs` so they run identically in PowerShell, Git Bash and CI.

**Operational complexity:** one `PreToolUse` entry point on every tool call is the main ongoing cost. It must stay fast, because it now carries recording, budgets and Bash policy. If it becomes slow, that is a harness defect, not an acceptable trade.

**Net effect on the blueprint:** no new steps. Step 6 grows (A5, A21), step 7 grows (A10, A11, A8, A13), steps 2/3/5 absorb the documentation amendments. Steps 1, 4, 9–12 are unchanged in scope.

---

## 14 · Final architecture delta

```text
CURRENT ARCHITECTURE
  one trust ladder, human at the top
  delegation gate on PreToolUse "Task"
  Bash as an ordinary tool
  network control claimed at rung 1
  trace "append-only", schema undefined
  budgets listed without status
  one lifecycle, no state authority
  InstructionsLoaded as adherence evidence
  10 eval cases as a requirement
  role posture partly prose
        ↓
APPROVED CHANGES  (23 amendments, 20 findings resolved)
  P1  split authority ladder / data-trust ladder; A1 = deny rules
  P6  only deny rules and guard denials are boundaries; record permission_mode
  P8  gate matches "Agent"; liveness assertion in its tests
  P13 Bash risk HIGH; one composed guard; withheld from 2 roles
  P5  network re-runged 1 / 3 / not-available
  P3  credential axis split; no project secret in the environment
  P2  seq + prev_hash + redaction + retention + both write vectors denied
  P18 three correlated events; executed is derived
  P9  five budget fields, honestly classified; two enforced by the harness itself
  P17 termination = state + reason (+ rule, guard)
  P19 run lifecycle ≠ work-item state; progress/ authoritative for nothing
  P4  enforcement_environment stamped on every run and scorecard
  P7  L (load) and V (violations) as separate KPI families
  P10 post-compromise blast radius, with a dated risk acceptance
  P11 incident → case → regression is the requirement; 10 is a starting count
  P12 per-role write scope, enforced
  P16 per-dimension status + evidence, pointers only
  P14 isolation declared per run, four triggers
  P15 TDD by work-item type
  P20 six declared posture dimensions; named profiles deferred
        ↓
FINAL ARCHITECTURE
  Policy      two ladders; deny-based boundaries; bypass observable, not preventable
  Execution   Bash governed as HIGH; gate on Agent; budgets partly harness-enforced;
              isolation declared
  Evidence    three-phase correlated trace, tamper-evident, redacted, with header and
              footer carrying regime, budgets and termination
  Evaluation  load and violations separated; incident-driven case growth; adversarial
              cases scored on guards, not on model behavior
  Lifecycle   run lifecycle distinct from work-item state; single authority each
  Security    every claim ranked at its real rung; blast radius written down and accepted
  Agents      six declared, checked posture dimensions; write scope enforced per role
```

---

## 15 · Final implementation gate

```text
READY FOR IMPLEMENTATION: YES
```

Conditional on one mechanical step: **applying amendments A1–A23 to `architecture.md`, then freezing it.** That is an edit pass over a document, not an open decision.

No architectural decision is left for the implementation session to resolve on its own. Specifically:

- Every boundary's **mechanism** is decided — deny rule or `PreToolUse` guard, never `ask` or prose (A2).
- Every security axis has a **declared rung** matching what the platform actually enforces (A6, A19), and the residual risk is written down and accepted (A18).
- The evidence **schema** is fully specified — event types, correlation key, derived fields, integrity, redaction, retention (A10, A11).
- Every budget field carries a **status**, so nothing is silently unenforced (A8).
- Every role's **posture** is a checked field, not prose (A20, A21).
- The one factual error that would have produced a silently dead gate is **corrected** (A4).

Two items are deliberately unresolved and are **not** blockers, because both are scheduled and neither affects the architecture:

1. **Stack-dependent rule rows and gate sub-gates** stay blank until TASK 7. This is a recorded deviation (§H), not an open question.
2. **The exact variable list stripped by `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`** was not confirmable from the environment-variable reference during this session. Implementation must verify it empirically rather than assume coverage; the no-secrets-in-environment policy holds regardless of what it strips, so the answer changes defence-in-depth, not the design.

---

## 16 · Proportionality filter — what earns its place on *this* project

§9–§15 answered *is the finding correct*. This section answers a different and equally binding question: **is the amendment worth building for a portfolio site?** They are not the same question, and answering only the first is how a harness ends up heavier than its project — the failure mode §A already names.

The filter is one question per amendment, taken from the architecture's own standard:

> **What failure does this prevent, and has that failure happened — here, or in the transcribed incidents?**

An amendment that cannot name one is deferred with a trigger, not built. Deferral is not rejection: the *decision and its reasoning* stay in the architecture, so the thinking is not lost and the trigger is explicit. That distinction is the whole point — **specify in full, install the minimum.**

### The three bands

| Band | Meaning | Cost |
|---|---|---|
| **INSTALL** | Built in TASK 5 | Real |
| **SPECIFY** | Written into the architecture as a decided design, with a named trigger; no code | Words only |
| **REDUCE** | Adopted in a cheaper form than §10 proposed, with the difference justified | Reduced |

### Verdicts

| # | Amendment | Band | Why |
|---|---|---|---|
| A1 | Two trust ladders | **INSTALL** | Documentation. Prevents a "human said so" bypass being written into the rules at step 2 — the error would be cheap to make and expensive to find |
| A2 | Only deny rules and guard denials are boundaries | **INSTALL** | Documentation, and it decides the mechanism for every other control. Nothing downstream is correct without it |
| A3 | No `bypassPermissions`; record `permission_mode` | **INSTALL** | One rule row plus one trace field |
| A4 | Gate matches `Agent`, not `Task` | **INSTALL** | A one-word correction that is the difference between a gate and a silently dead one (INC-08). Non-negotiable at any project size |
| A5 | Bash policy guard | **REDUCE** | Split by whether the failure is real here. **Install** `git-write` (INC-05's boundary; the one rule an agent breaks irreversibly) and `resources`/`evidence` write denial (protects the frozen content SSOT — the repo's binding constraint). **Specify** `net-egress`: best-effort by construction (POINT 5 rung 3), and with no credential, no remote and no production system reachable, it currently guards nothing. Trigger — a deploy credential or a remote exists. **Install** `destructive` as an `ask` rule in settings, not as guard code |
| A6 | Network re-runged | **INSTALL** | Documentation, and it stops the architecture contradicting §J |
| A7 | Credential axis split | **INSTALL** | One settings key, one policy sentence. Decides now that deploy runs from CI, which is cheaper to decide before TASK 7 than to reverse after |
| A8 | Budget guard (`maxToolCalls`, `maxRuntime`) | **REDUCE** | `maxTurns` is native and free — **install**. The harness-enforced ceilings are a hot-path hook on every tool call, and INC-06 is about a delegated run exhausting context, which `maxTurns` already bounds. Downgrade both to **OBSERVED**, computed at wrap-up from the trace instead of enforced live. Trigger for promotion — a run actually overruns with `maxTurns` set |
| A9 | `isolation` as a run-contract field | **INSTALL** | A field in a template. Zero ongoing cost, and it makes the step-12 export deletion an explicit choice |
| A10 | Three-event trace schema | **INSTALL** | The substrate for every observable KPI. Without it the harness's own measurement is self-report, which is the thing it exists to escape |
| A11 | Trace integrity | **REDUCE** | **Install redaction** — unconditional. A trace recording a session that touched `private/` would recreate the exact leak this repository is built to prevent, which is the one failure mode that is genuinely unacceptable here. **Install `seq`** (two lines; catches gaps and truncation). **Drop `prev_hash`** — hashing defends against forgery by an adversary this project does not have, and `seq` catches the realistic case. Restate the property honestly as **gap-evident**, not tamper-evident. **Install retention** (one config key) |
| A12 | `enforcement_environment` stamped | **INSTALL** | One field. Without it, TASK 9 exports scorecards that are silently incomparable across machines |
| A13 | `termination` block | **INSTALL** | Structured metadata in a footer event; replaces a lifecycle state that would have cost more |
| A14 | L / V KPI split | **INSTALL** | Documentation. Prevents shipping an adherence KPI pinned at 100% that measures nothing |
| A15 | `incident → case → regression` | **INSTALL** | Documentation, and it *removes* a requirement (the fixed count of ten) |
| A16 | Adversarial cases score guards, not model | **INSTALL** | Documentation, and it prevents writing eval cases that silently rot on a model upgrade |
| A17 | Run lifecycle ≠ work-item state | **INSTALL** | Documentation. The conflation is already live — TASK 5 is one item spanning many runs |
| A18 | Blast radius + risk acceptance | **INSTALL** | Documentation, and it is the honest counterweight to every rung-3 control. It is also what makes the deferrals above defensible rather than convenient |
| A19 | Axes conditional on the Bash guard | **INSTALL** | One sentence, and it keeps §L truthful after A5 is reduced |
| A20 | Six declared posture dimensions | **INSTALL** | Frontmatter fields plus assertions in a roster guard that is being written anyway |
| A21 | Per-role write scope | **REDUCE** | **Install for `harness-evaluator` only.** Its whole value is that it may conclude the harness is failing, and that conclusion is worth nothing if the same role could edit what it scores — declaring circularity while leaving the capability is weaker than removing it. **Specify** for `implementer`/`test-engineer`: their file sets stay procedural (named in the brief, checked by the auditor) until two roles actually write concurrently — the same trigger as worktree isolation. **No guard** for `researcher`: withholding write tools is stronger and free |
| A22 | Per-dimension `status` + `evidence` | **INSTALL** | The mechanical form of INC-01, the founding incident. Capped at pointers and applicable dimensions, a `content` item costs three lines |
| A23 | TDD by work-item type | **INSTALL** | Documentation, and it *narrows* an obligation that would have been disbelieved on its first content item |

### What the filter changed

Three amendments reduced, nothing added:

- **A5** — the network-egress guard is not built. It is best-effort by its own admission, and on a project with no credential, no remote and no reachable production system it prevents nothing that has happened or can currently happen.
- **A8** — no live budget guard. `maxTurns` is native and covers INC-06; the rest becomes an observation computed at wrap-up, which costs nothing on the hot path.
- **A11** — no hash chain. `seq` catches the realistic failure (gaps, truncation, a crashed hook); hashing defends against an adversary this project does not have. The claim is downgraded to match.
- **A21** — one enforced write scope instead of four.

Redaction in A11 is the one place where the filter deliberately does **not** cut. Confidentiality is this repository's binding design constraint, the trace is the only new artifact that could carry `private/` content into a file, and the cost of getting it wrong is the one failure that cannot be undone by a revert.

### What the harness actually costs after the filter

| Component | Count |
|---|---|
| Documents | 4 (`architecture`, `contracts`, `procedures`, `metrics`) |
| Rule files | 5, one id space |
| Guards | 6 — `git-write`, `resources-readonly`, `evidence-readonly`, `delegation-gate`, `check-agents`, `check-terms` · plus `locale-parity`, `frontmatter`, `rules-registry` in the gate |
| Hook entry points | 2 — one `PreToolUse` (record + policy), one for the lifecycle events |
| Roles | 5 |
| Procedures | 3 |
| Per-work-item overhead | the pre-implementation checklist (6 answers), a spec for `feature`/`migration` only, and a done-block of ~3 lines for a content item |

That is adoptable in days and readable in one sitting, which was the stated target in §A.

### The proportionality argument, stated once

A portfolio site of fifteen markdown files does not need this. Three things make it worth building anyway, and they should be re-checked rather than assumed:

1. **It is a reusable artifact.** TASK 9 exports it. Work spent here amortizes across other projects — but only if it stays small enough to adopt, which is what this filter protects.
2. **It is itself portfolio evidence.** A harness with declared enforcement rungs, honest limitations and a falsifiable evaluation is a stronger signal of engineering judgment than the site it builds. That is only true while every element can name the failure it prevents; ceremony reads as ceremony.
3. **Its two most expensive controls guard this repository's actual binding constraint** — confidentiality and content integrity — which are the two things a portfolio genuinely cannot get wrong. INC-09 and INC-10 are native, not inherited.

**And the falsification condition holds.** If `EVAL-000` and its successors show the harness is not paying, the correct response is to cut it. This filter is the first exercise of that discipline, before any evidence exists, on the basis that an amendment with no nameable failure is not worth its maintenance.
