# 2026-08-18 · Session 08 — TASK 5, step 11: the eval suite and the EVAL-000 baseline

**Task:** TASK 5 — AI Agent Development Harness v2
**Status after this session:** IN PROGRESS (steps 1–11 built). **Human checkpoint open on the gap list. Step 12 next.**

## What was done

Thirteen executable eval cases, the Evaluation contract's enforcer, and three repairs that step 11 turned up before it could produce an honest scorecard. Tests 312 → 350, gate eleven steps → twelve. And the step found two rung-1 defects that none of the eleven had.

## The suite is thirteen, not ten, and the count was already decided

Architecture §K settled it before this session: *"Ten is the starting count, one per transcribed incident that has an executable form; it is a baseline, never a target."* Thirteen incidents are now transcribed. `INC-03` (dev ≠ prod) has no executable form until the site has screens — its remedy is deferred in §M — so it sits in `evals.excluded` **with a written reason**, never silently absent. The blueprint's "10 cases" line and the §K paragraph were corrected in the same change (`P-07`), because a count stated in three places drifts in two of them.

## Three repairs step 11 forced, each found by validating against real state (`P-04`)

- **K1, K2 and K3 were defined nowhere in the repository.** `EVAL-TEMPLATE.md` requires that KPI table; the only definitions lived in the inherited harness export, the file step 12 deletes. L and V *are* defined in architecture §K — K1–K3 never were. `EVAL-000` would have filled a table of undefined metrics, and step 12 would then have removed the only place a reader could learn what they meant. Transcribed into `contracts.md` §6, which already claimed to own the KPI set: the contract completing a promise it had made, not a new home.

- **`G-13`'s fail-closed handler had no test.** The code shipped in TASK 10 and the log records it *"proven in red with a torn config"* — a manual demonstration. Nothing permanent. A rung-1 rule whose only evidence is an anecdote is `INC-13`'s shape one level up: it reads correct, and nothing notices when it stops being. The `proof:` field is what exposed it — `EC-011` could not name an executable demonstration, and that absence was the finding. Now seven tests spawning the real hook against a copied tree, asserting **exit 2** specifically and not exit 1, which is the non-blocking code the whole incident turns on.

- **Two living documents claimed a filename that has never existed.** Architecture §B and §F said `evidence/runs/<run-id>/trace.jsonl`; the hooks write `<session-id>/<run>.jsonl`. `check-docs` cannot catch it — the string carries a `<run-id>` placeholder, and `doc-links.mjs` correctly excludes placeholders rather than demanding files nobody promised. Corrected, and aligned to `evidence.md`'s vocabulary rather than inventing a third: the schema document is the authority on its own filenames.

## The guard: five properties, and the one that does the work

`check-evals` derives everything from artifacts, never a roster (`P-13`):

1. **Shape** — required fields, id matching filename, uniqueness, outcome vocabulary.
2. **Origin resolves** — `descends_from` names an incident that exists in architecture §C, parsed from §C and scoped to it. A whole-document scan would pick up every rule-table citation and then demand cases for things that are not incidents.
3. **Coverage, both directions** — every §C incident has a case *or* a reasoned exclusion, and an exclusion outliving its incident is reported stale. Incident fourteen fails the gate until someone decides which it is.
4. **Proof resolves** — `proof.file` exists **and contains `proof.test` verbatim**. Existence alone would pass forever after a rename, which is `INC-07`'s shape inside the checker built to prevent it.
5. **An unproven case cannot claim `Caught`** — `A16` mechanized at the scorecard. Without a control to remove, the only thing that could have produced a pass is a model behaving well that day.

**The required-field set is derived from `EC-TEMPLATE.yaml` minus four reasoned exceptions, not listed beside it.** An inclusion list has to be updated by whoever adds a template field — the one moment they are thinking about something else — and a forgotten entry makes the guard blinder. Subtracting makes a forgotten entry merely noisier, which is the direction every exclusion list here points.

**13/13 mutants caught** against the real artifacts, not fixtures: a dangling `descends_from`, a deleted case, a renamed proof test, a missing proof file, an unproven case claiming `Caught`, a dropped reason, an invented verdict, a removed required field, an emptied one, a reasonless exclusion, a stale exclusion, a duplicate id, and the §C heading moving so the incident set reads empty.

**Two of those mutants survived on the first run, and both were my mutations being invalid rather than the guard being blind.** Blanking a `proof_reason` left the rest of the sentence behind, and replacing a list header with `[]_x` produced a non-empty scalar. Worth recording because a survivor is normally the interesting result, and here twice it meant the test of the test was wrong — which is `T-02` arriving one level further up than usual.

## `INC-14` — the guard that denied everything, found by an agent doing the work

**The delegation found two rung-1 defects that thirteen guards, 350 tests and twelve gate steps had not.**

`harness-evaluator` was denied at rung 1 writing the scorecard it exists to produce, **inside its own declared scope**. `checkRoleScope` prefix-tested the repository-relative scope `progress/evaluation-results` against the payload path, and `Write` always sends an **absolute** path, which cannot start with a relative prefix. The only enforced per-role write scope in the harness was refusing **100% of authorized writes**, while its denial text asserted a path was "outside" a directory it was plainly inside.

Its red-path battery was green — eleven tests, every one of them relative, and the production payload never is. **The red paths were exercised; the green path was never tested against a real payload shape.** That is the same lesson as the `tool_response` field name in step 7, and the third member of `INC-12`/`INC-13`'s family: a control that reads correctly, tests green, and does not do what it says. Three instances is a pattern.

**Probing the shared resolver exposed a worse sibling.** `repoRelative` compared the root prefix case-sensitively, so a path arriving as `C:` against a root recorded as `c:` failed to relativize, matched no boundary, and **`H-02` and `H-03` failed open** — the boundaries protecting published content and the trace itself. Confirmed by direct probe before fixing, not inferred. The agent's fix-sketch pointed at it; nothing in the suite did.

Both fixed, both proven in red: mutating `checkRoleScope` back to a raw prefix test fails four tests; removing the case fold fails the drive-letter test alone. `INC-14` is transcribed in §C, `EC-013` covers it, and the resolver is shared so the fix reaches every path guard at once.

**`EC-013` is also the only end-to-end demonstration the harness has of a boundary that both permits and refuses correctly** — denied three times, diagnosed, fixed, then re-verified with an allow-to-scope and a deny-to-`docs/`, every state in the trace.

## Other findings

- **`INC-06` reproduced itself, live, in the run that was supposed to score it.** The first delegation spent its entire `maxTurns: 20` budget on 38 read-only calls and was cut off before writing. The trace: 38 requests, 38 allows, zero denials, zero writes. It was not blocked; it ran out. `EC-005` is the case about exactly this. The role's budget was the defect, not the agent — raised 20 → 60, now a measured number with the measurement recorded beside it. **Resumptions inherit the original spawn's budget**, so raising it only takes effect on a fresh spawn; that cost two more stalled attempts to learn.
- **`INC-13`, fourth occurrence — in a test about path handling.** The one source file this session written through a heredoc rather than a file tool had its doubled backslashes eaten, leaving `\d` and `\p`: JS escapes that collapse to plain letters, so the "path" under test was `C:devprojects…` and the test failed against a correct fix. Rewritten with `String.fromCharCode(92)`, the workaround the codebase had already adopted for this reason.
- **`check-docs` caught my own prose.** `EC-013` described a case-variant path that reads like a path claim and is not one. Fixed at the source rather than by growing the ignore list — the step-10 lesson held.
- **The self-cleaning ignore list worked as designed.** The exemption for `check-evals.mjs` "landing at blueprint step 11" would have been reported stale the moment the file existed, so it removed itself as part of the step that closed it.
- **My own verification probe polluted the trace**, creating `evidence/runs/unknown/` with no header and a reused `tool_use_id`. The evaluator caught it, cited it for `EC-013`, and refused to score it as a run. `GAP-07`.

## EVAL-000 — 5 Caught · 5 Partial · 3 Gap, across 13 cases

Produced by `harness-evaluator` into `progress/evaluation-results/EVAL-000-baseline.md`. Marked **baseline, not evaluation**; both biases declared total.

**The verdict, in its own words:** *the harness cannot yet be shown to be paying.* K1 — the metric it was built to move — is `unmeasurable` with raw 0, and has **two** independent holes: no work item has completed under it, and no procedure step captures an iteration count, so K1 stays unmeasurable even after the first one does.

**The most uncomfortable finding is an inversion.** The eight red-proven controls defend against incidents **inherited from a different project**. The three unmechanized ones — `C-01`, `C-02`, `P-15` — are precisely the failure modes that have actually happened *here* (`INC-09`, `INC-10`, `INC-11`). The harness is best defended where it has never been attacked.

**13 gaps filed** as work items with checkable dones. `GAP-06` is human-only: `H-03` correctly denies every vector an agent could use to remove the mangled fixture directories, so until a human deletes them every future scorecard must re-declare the same exclusion.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test scripts/guards/**/*.test.mjs", "350 pass 0 fail", "13/13 check-evals mutants caught", "2/2 G-13 mutants caught"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs", "exit:0, 12 steps green"] }
  docs:       { status: passed, evidence: ["contracts.md §6 KPI set + Evaluation row built", "architecture §K/§O counts corrected", "trace path aligned to evidence.md"] }
  security:   { status: passed, evidence: ["G-13 regression test: real hook, torn/empty/missing config, exit 2 not 1", "no boundary changed"] }
  content:    { status: passed, evidence: ["check-terms.mjs", "exit:0"] }
  ci:         { status: not_applicable, reason: "no remote exists — T-10 forbids reading a green local gate as evidence CI fired" }
```

## Files changed

`evaluation-cases/EC-001…EC-013*.yaml` — thirteen cases, ten with a resolvable proof, three declared unproven with reasons.
`evaluation-cases/EC-TEMPLATE.yaml` — `control` and `proof` added.
`scripts/guards/lib/evals.mjs` + `evals.test.mjs` — new; 25 tests.
`scripts/guards/gate/check-evals.mjs` — new; the twelfth gate step.
`scripts/guards/hooks/pretooluse.test.mjs` — new; `G-13`'s missing regression test, 7 tests.
`scripts/guards/lib/delegation-gate.mjs` — `stripComment` and `unquote` exported rather than duplicated.
`scripts/guards/guards.config.json` — the `evals` block; the resolved `check-evals` doc exemption removed.
`scripts/gate.mjs` — the twelfth step.
`docs/harness/contracts.md` — the KPI set; Evaluation row `built`; ratio prose 4/2/0; the case shape gains `control` and `proof`.
`docs/harness/architecture.md` — §K count and baseline wording, §O step 11 row and its acceptance check, trace path.
`docs/harness/architecture-findings.md` — trace path.
