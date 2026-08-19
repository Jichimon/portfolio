# 2026-08-17 · Session 01 — TASK 5, harness architecture + findings resolution

**Task:** TASK 5 — AI Agent Development Harness v2
**Status after this session:** IN PROGRESS (step 1 of 12 done, awaiting approval)

## What was done

Restructured TASK 5 from "Website" into the harness, and split the rest of the site work into TASKS 7/8/9. Wrote `docs/harness/architecture.md` (step 1 of the blueprint), then resolved 20 findings raised against it in `docs/harness/architecture-findings.md`, applied a proportionality filter to the resulting 23 amendments, and folded the survivors back into the architecture. Verified every Claude Code mechanism the design depends on against current official docs rather than assuming — which changed several answers and caught one error that would have been fatal.

## Decisions

- **The registry lives in `.claude/rules/`, not inside `CLAUDE.md` and not in `docs/`.** The author's concern was whether rules in a separate file are actually read. Verified: rule files without `paths:` frontmatter load at launch with the same priority as `CLAUDE.md`, and subagents inherit the whole CLAUDE.md hierarchy plus project rules. The load is provable two ways — `/context` and the `InstructionsLoaded` hook. Rejected inlining into `CLAUDE.md`: the docs put the adherence budget at ~200 lines, so ~40 rule rows would make the rules *less* followed, not more. The deeper point that settled it: the docs state plainly that rules are context, not enforcement — so anything that must hold gets a `PreToolUse` guard regardless of where the prose lives, and file placement becomes a legibility question rather than a security one.
- **Work Item = `TASKS.md` entry, keeping `TASK N` ids.** Rejected renumbering to `WI-0NN`: every file in `progress/` cites the existing ids, and the registry's own law is that published ids never change. Entries gain `type` and `done`. The spec is a separate artifact and only `feature`/`migration` items get one — content, research and planning items do not, which is most of this repo's history.
- **The delegation gate matches `Agent`, not `Task`.** The tool that spawns a subagent is `Agent`; `TaskCreate`/`TaskUpdate` are task-list tools. The first draft said `Task`, inherited from an older tool generation. A hook matched on `Task` would have gated nothing and failed silently — INC-08's exact shape, in the harness's single most important guard. Caught only by checking the tools reference instead of trusting the source document.
- **Boundaries are `deny` rules or guard denials — never `ask` rules or role prose.** Verified: deny rules block in every permission mode including `bypassPermissions`; allow rules have no effect there; a `PreToolUse` hook returning `allow` cannot override a deny rule. This project *cannot* disable `bypassPermissions` for itself (managed settings are machine-level), so instead it records `permission_mode` at session start, making a bypass run visible and excludable from scorecards. This decided the mechanism for every other control in the harness.
- **The trust hierarchy was wrong and became two ladders.** The single ladder with `HUMAN_INSTRUCTION` on top implied an in-session instruction could override a security boundary. Split into an authority ladder (non-negotiable policy above human instruction above negotiable policy above approved spec) and a data-trust ladder (repository, tool output, external content, memory — all data, never instruction). The runtime already behaved the corrected way; the document was describing the system incorrectly.
- **Proportionality filter applied before building anything.** The findings resolution adopted 18 of 20 findings, which was too generous for a portfolio site. Ran every amendment through one question — *what failure does this prevent, and has that failure happened, here or in the transcribed incidents?* — and cut four: no network-egress guard (guards nothing with no credential, no remote, no reachable production system), no live budget enforcement (`maxTurns` is native and already bounds INC-06), no trace hash chaining (`seq` catches the realistic failure; hashing defends against an adversary this project does not have), and one enforced write scope instead of four. Deliberately did **not** cut trace redaction: confidentiality is this repo's binding constraint and a trace carrying `private/` content is the one failure a revert cannot undo.
- **Deferred ≠ rejected.** Each cut is written into the architecture as a decided design with a named trigger, so the reasoning survives and the trigger is explicit. "Specify in full, install the minimum."
- **`POLICY_VIOLATION` rejected as a lifecycle state.** States answer *can this work continue*, and a violation adds no new answer — it terminates `FAILED` or `ESCALATED`, both of which exist. Structured termination metadata carries strictly more (`reason`, `rule`, `guard`) and supports grouping by rule, which no state could.

## Open questions

- **Step 1 is a checkpoint and is not yet approved.** `docs/harness/architecture.md` §A–§O needs a read before step 2 (the rules registry) starts, since step 2 is where the `C-*` rows become enforceable.
- **`CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`'s exact variable list** could not be confirmed from the environment-variable reference. Implementation must verify empirically rather than assume it covers a project secret. Not a blocker — the no-secrets-in-the-environment policy holds regardless.
- **Publication of this repo** (remote, visibility) is still open from the TASK 4 audit and is now formally a TASK 7 decision. Until it resolves, the CI done-dimension is `not applicable — no remote`, and the workflow file will be written inert.

## Known gap found

`scripts/check-terms.sh` scans a hardcoded roster of five paths and does **not** cover `docs/` — so everything written this session was outside the confidentiality gate. Scanned manually against `banned-terms.txt` (clean), and the guard passes on its own scope. This is INC-07's failure shape in this repository's own tooling: a roster that silently stops protecting whatever nobody added to it. The step-6 port inverts it to scan-everything-except-an-exclusion-list. Logged in TASK 5.

## Next

Approval of step 1, then step 2 — the rules registry in `.claude/rules/`, five files sharing one id space, each row carrying an origin (`INC-01`…`INC-11`) and its enforcement rung. That is the other human checkpoint before the mechanical steps begin, and it is where the four native `C-*` content rules get written from INC-09/INC-10.

## Files changed

`docs/harness/architecture.md` — new, blueprint step 1; then amended with A1–A21.
`docs/harness/architecture-findings.md` — new; 20 findings resolved, 23 amendments, proportionality filter in §16. Superseded once the architecture is frozen.
`TASKS.md` — TASK 5 redefined as the harness with a 12-step tracker; TASKS 7/8/9 added; TASKS 0–4 typed `content`; TASK 6 re-pointed at TASK 8; out-of-scope entry amended rather than silently contradicted.
`progress/2026-08-17-01-task5-harness-architecture.md` — this log.
