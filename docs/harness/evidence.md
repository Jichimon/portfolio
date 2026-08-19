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
| `run.header` | `SessionStart` · `SubagentStart` | `permission_mode`, `enforcement_environment`, `model`, `cwd`, `reason`, `isolation` |
| `tool.requested` | `PreToolUse` | `tool`, `tool_use_id`, `target` (redacted) |
| `policy.decision` | `PreToolUse` · `PermissionDenied` | `decision`, `source` (`guard` \| `permission`), and on a deny: `rule`, `guard`, `reason` |
| `tool.result` | `PostToolUse` · `PostToolUseFailure` | `ok`, `bytes` or `error_class`, `duration_ms` |
| `instructions.loaded` | `InstructionsLoaded` | `file_path`, `load_reason` |
| `run.footer` | `SessionEnd` · `SubagentStop` | `termination: { state, reason }` |

Every event also carries `ts`, `seq`, `run_id`, `agent`, and `parent_run_id` when delegated.

**Run identity needs no coordination.** The orchestrator run *is* the session; a delegated run is `<session>:<agent_id>` with the session as its parent. Two processes that never talk to each other therefore agree on who is running, and a subagent's events stay correlated to the run that spawned it.

## Two write-time properties

**`seq` is dense.** A monotonic counter per run, so a gap means truncation or a crashed hook and a duplicate means two writers raced. Both are visible to `check-trace`. Concurrent hooks are serialized through an atomic `mkdir` lock, because a counter that silently duplicates under concurrency would falsify the one property it exists to provide.

It is **gap-evident, not tamper-proof**, and says so. Hash chaining is specified and deliberately not built — it defends against an adversary this project does not have, and `seq` catches the realistic failure at a fraction of the cost (`A11`).

**Redaction happens before the write, not after.** Paths, byte lengths and content hashes — never file contents, never tool output, never error messages. Every string is scrubbed against `private/banned-terms.txt` on the way in.

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
