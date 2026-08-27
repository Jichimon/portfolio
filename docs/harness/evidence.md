# The evidence trace

The observable substrate. Every claim the harness makes about itself is read from here rather than from prose written by the thing being scored — that is layer 06 in [architecture.md](architecture.md), and `P-11` is the rule it exists to serve.

**Where it lives.** `evidence/runs/<session-id>/<run>.jsonl`, gitignored. This document is committed; the trace is not. It is machine-written operational output — it would dirty every diff, and this repository may yet be published.

**Who writes it.** Hooks, only. `H-03` denies every other vector at rung 1: file tools by a deny rule, shell by the `path-boundary` guard. That is not decoration. A trace the scored entity can edit has exactly the substrate problem as a self-report, and the whole subsystem would be theatre.

## The three events

```text
tool.requested   →   policy.decision   →   tool.result
(PreToolUse)         (guard or engine)     (PostToolUse | PostToolUseFailure)
```

Correlated by `tool_use_id`. **`executed` is derived, never stored:** a request carrying a `deny` decision and no result is an *attempt*.

That distinction is the reason the schema has phases at all. *The agent tried something dangerous and was stopped* and *something dangerous happened* are opposite outcomes — one of them is the harness working — and a flat log of tool calls cannot tell them apart. The unsafe-action metric counts attempts; a harness that could not count them would be measuring nothing.

| Event | Written by | Carries |
|---|---|---|
| `run.header` | `SessionStart` · `SubagentStart` · **the writer, on a posture change** | `permission_mode`, `enforcement_environment`, `model`, `cwd`, `reason`, `isolation` |
| `tool.requested` | `PreToolUse` | `tool`, `tool_use_id`, `target` (redacted) |
| `policy.decision` | `PreToolUse` · `PermissionDenied` | `decision`, `source` (`guard` \| `permission`), and on a deny: `rule`, `guard`, `reason` |
| `tool.result` | `PostToolUse` · `PostToolUseFailure` | `ok`, `bytes` or `error_class`, `duration_ms` |
| `instructions.loaded` | `InstructionsLoaded` | `file_path`, `load_reason` |
| `run.footer` | `SessionEnd` · `SubagentStop` | `termination: { state, reason }` — always `COMPLETE`; see below |

Every event also carries `ts`, `seq`, `run_id`, `agent`, and `parent_run_id` when delegated.

### Three things the table cannot say in a cell

**A `run.header` is written more than once, and that is correct.** `SessionStart` and `SubagentStart` payloads **omit `permission_mode`** — every one of the first 118 headers ever written read the literal `"unknown"`, so `G-04`'s compensating record was a promise nothing kept. `PostToolUse` carries the real value, so the writer emits an extra header with `reason: "observed"` the first time it sees a real mode and again whenever it changes. A mid-session switch to `bypassPermissions` is therefore visible rather than assumed away. `check-trace` reads the vocabulary — `startup`, `delegated`, `observed` — from `guards.config.json`, and asserts **once per resume**: two headers in a file are a resume and are fine, two *adjacent* headers are one start recorded twice and are a finding. It deliberately does **not** assert that a file begins with a header, because real files do not and `H-03` puts them beyond anyone's reach to fix.

**A missing `run.footer` is the signal; the `termination` block is not.** `SubagentStop` carries no stop reason, so the footer only ever reads `COMPLETE` with `objective_reported` or `other` — `FAILED` and `budget_exhausted` have never been written and cannot be. What distinguishes a run stopped by its budget is that it writes **no footer at all**, proven in red on 2026-08-27 by dispatching one role twice, once on a brief that fit its budget and once on one that could not. A missing footer means the run did not terminate normally; it does **not** identify the budget as the cause, and `G-06` names the standing counterexample.

**Not every event the runtime produced reaches the trace, and the shortfall is measured rather than assumed.** A `tool.result` whose `tool.requested` was never written is a **delivery loss** — the `PreToolUse` hook did not record, so correlation is impossible for that call. `check-trace` counts them, prints the rate, and fails only above `maxRequestLossRate` in `guards.config.json`; every other kind of finding still fails hard. The separation exists because `H-03` means no agent can ever clear an orphan, and the alternative — a permanently red step — had twice been resolved by a human **deleting evidence**. The floor is a ratchet: the answer to a rising rate is finding the lost writes, never a larger number.

**A limit this does not paper over:** a *denied* call whose request write was lost would be invisible rather than misreported, and the floor neither causes nor worsens that. Every observed loss carries `ok: true`, and a denial produces no result at all, so the lost pair is equally absent with a floor or without one.

**Run identity needs no coordination.** The orchestrator run *is* the session; a delegated run is `<session>:<agent_id>` with the session as its parent. Two processes that never talk to each other therefore agree on who is running, and a subagent's events stay correlated to the run that spawned it.

## Two write-time properties

**`seq` is dense.** A monotonic counter per run, so a gap means truncation or a crashed hook and a duplicate means two writers raced. Both are visible to `check-trace`. Concurrent hooks are serialized through an atomic `mkdir` lock, because a counter that silently duplicates under concurrency would falsify the one property it exists to provide.

It is **gap-evident, not tamper-proof**, and says so. Hash chaining is specified and deliberately not built — it defends against an adversary this project does not have, and `seq` catches the realistic failure at a fraction of the cost (`A11`).

**Redaction happens before the write, not after.** Paths, byte lengths and content hashes — never file contents, never tool output, never error messages. Every string is scrubbed against `private/banned-terms.txt` on the way in.

**And redaction is only ever as good as the term list parsed at write time.** `redactToolInput` scrubs through the same `mask()` that `check-terms` uses, so a malformed term list disables the scrubber as silently as it disables the check — which happened, and put a banned term on disk in a file no agent may remove (`TASK 59`). On the reading side, `check-trace` scans the **whole file** on purpose, to catch a leak by a route nobody wrote a redactor for; the only exclusions are the values of `tool_use_id`, `run_id` and `parent_run_id`, blanked **by field name** from `guards.config.json` and never by a looks-like-an-id heuristic that would widen itself over time (`INC-15`).

Two decisions inside that are worth stating, because both are the non-obvious half:

- **Paths are scrubbed too**, not just commands. A path is as publishable as a command, and a repository full of internal system names would leak through the field nobody thought about.
- **A tool nobody wrote a redactor for records its keys and nothing else.** Unknown fails closed. The alternative — passing an unfamiliar input through — makes the trace leak on the first tool the runtime ships.

A trace of a session that touched `private/` would recreate the exact leak this repository exists to prevent, so redaction is not a setting (`C-05`, `H-04`).

## What is not recorded, on purpose

Tool output, file contents, error messages, and prompt text. The trace answers *what was attempted, what was decided, and what happened* — not *what was said*. For anything finer, the transcript exists and is the human's to read.

## Checked by

`scripts/guards/gate/check-trace.mjs`, in the gate. It validates schema conformance, `seq` continuity, correlation, deny attribution and redaction across every trace on disk — **and asserts the hooks are registered.**

That last clause is the one that matters. A checker that only read trace files would pass forever on a repository whose hooks were never wired, which is `INC-08` reproduced inside the subsystem built to prevent it. The event vocabulary and the required registrations both live in `guards.config.json`, so the check derives what it accepts rather than carrying its own copy.

**A fresh clone has no trace, and that is reported as a count rather than as a pass.**

## The coupling that will break first

The hook payload field names are a contract with the runtime, and the runtime owns both ends of it. They were **captured from real payloads, not transcribed from documentation** — the docs summarize `PostToolUse`'s output as `tool_result`, the runtime sends `tool_response`, and the first version of the writer recorded every result as zero bytes while looking perfectly healthy.

`eventsFor` is therefore a pure function in `scripts/guards/lib/evidence.mjs` with the captured payload shapes asserted in its tests, rather than inline in the hook script where nothing would notice it drifting.
