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
| `run.header` | `SessionStart` · `SubagentStart` · **the writer, on a posture change** | `permission_mode`, `permission_mode_source` (`payload` \| `transcript` \| `unavailable`), `enforcement_environment`, `model`, `cwd`, `reason`, `isolation` |
| `tool.requested` | `PreToolUse` | `tool`, `tool_use_id`, `target` (redacted) |
| `policy.decision` | `PreToolUse` · `PermissionDenied` | `decision`, `source` (`guard` \| `permission`), and on a deny: `rule`, `guard`, `reason` |
| `tool.result` | `PostToolUse` · `PostToolUseFailure` | `ok`, `bytes` or `error_class`, `duration_ms` |
| `instructions.loaded` | `InstructionsLoaded` | `file_path`, `load_reason` |
| `run.footer` | `SessionEnd` · `SubagentStop` | `termination: { state, reason }` — always `COMPLETE`; see below |
| `run.cost` | `SessionEnd` · `SubagentStop`, alongside `run.footer` | `wall_ms`, `by_model` (per-model token counts) or `error_class` on a read failure — see below |

Every event also carries `ts`, `seq`, `run_id`, `agent`, and `parent_run_id` when delegated — plus `agent_resolution` on every event of a run whose `agent` could not be identified, never on one that could (see below).

### Three things the table cannot say in a cell

**A `run.header` is written more than once, and that is correct.** `SessionStart` and `SubagentStart` payloads **omit `permission_mode`** — every one of the first 118 headers ever written read the literal `"unknown"`, so `G-04`'s compensating record was a promise nothing kept. `PostToolUse` carries the real value, so the writer emits an extra header with `reason: "observed"` the first time it sees a real mode and again whenever it changes. A mid-session switch to `bypassPermissions` is therefore visible rather than assumed away. `check-trace` reads the vocabulary — `startup`, `delegated`, `observed` — from `guards.config.json`, and asserts **once per resume**: two headers in a file are a resume and are fine, two *adjacent* headers are one start recorded twice and are a finding. It deliberately does **not** assert that a file begins with a header, because real files do not and `H-03` puts them beyond anyone's reach to fix.

**`permission_mode` now has a second source, for the two events whose payload has none (`TASK 64`).** 137 of 196 headers on disk read `"unknown"` — every `startup` and `delegated` header, without exception; the 59 real values all came from the `observed` mechanism above, one layer later. Before falling back to `"unknown"`, the writer now also checks the run's own transcript (`transcript_path`, already read for `run.cost`) for the most recent `type: "user"` line carrying a `permissionMode` field — captured from a real payload, not assumed: a `SubagentStart`'s `transcript_path` points at the **same shared file** the orchestrator itself writes to, and `permissionMode` is stamped on a genuine freeform human turn but never on a tool-result "user" line and not on every human turn either — a slash command's synthetic wrapper turns carry none. Every header now carries `permission_mode_source` — `"payload"`, `"transcript"`, or `"unavailable"` — so a reader always knows which it got, and a value is never fabricated: absent both places, `permission_mode` stays the honest literal `"unknown"`. A `startup` header's transcript read can legitimately find nothing (a brand-new session has no prior turn), which is a correct "unavailable" rather than a defect.

**A known imprecision, stated rather than hidden:** the transcript value can be one turn stale. It updates only when a freeform human turn stamps a new one — a permission-mode change that happens through a UI action between turns (accepting an exit from plan mode, for instance) is invisible until the next such turn. This is the same class of imprecision `posturePatch`'s own `observed` header already carries one layer up — both read "the freshest known value," never "the value at this exact instant" — and it is why the field is `permission_mode`, read with `permission_mode_source` alongside it, rather than a claim of real-time accuracy.

**A missing `run.footer` is the signal; the `termination` block is not.** `SubagentStop` carries no stop reason, so the footer only ever reads `COMPLETE` with `objective_reported` or `other` — `FAILED` and `budget_exhausted` have never been written and cannot be. What distinguishes a run stopped by its budget is that it writes **no footer at all**, proven in red on 2026-08-27 by dispatching one role twice, once on a brief that fit its budget and once on one that could not. A missing footer means the run did not terminate normally; it does **not** identify the budget as the cause, and `G-06` names the standing counterexample. **`check-trace` now counts and enumerates this** (`TASK 64`), on every run, without ever failing on it — `H-03` forbids cleaning a single historical instance, and a permanently-red trace step has twice before been "fixed" by a human deleting evidence, which is exactly the failure the delivery-loss floor two paragraphs below was built to avoid repeating.

**The mirror case — a `run.footer` with no real start header — is a `SubagentStart` delivery loss, and the register had it wrong.** Ten trace files on disk are missing their start boundary entirely: seven carry `agent: ""` (from before the `unknown-role` fallback existed) and three carry `agent: "unknown-role"`. `EVAL-001` treated the second group as a *different, more benign* shape — "it has a header, so it is not `GAP-08`" — but checking against the real files (`P-04`) shows that header is `posturePatch`'s own `reason: "observed"` patch, written the moment `SubagentStop` first sees a real `permission_mode`, never a real `SubagentStart` header. Both groups are the identical defect: a `SubagentStart` that never reached the writer for that `agent_id`, discovered only because its `SubagentStop` later did. `check-trace` now classifies "has a header" correctly — a `reason: "observed"` header does not count as a start boundary, matching the same distinction `run.cost`'s own window boundary already draws — and counts and enumerates the resulting shape alongside the unterminated count above, symmetric to it and reported the same way, never failed, for the same `H-03` reason.

**A fallback that reads like real data is its own defect, separate from either shape above.** When `agent_type` is missing or blank, the writer has always substituted `"unknown-role"` — but nothing distinguished that substitution from a role genuinely named that. `runIdFor` now adds `agent_resolution: "missing_agent_type"` to every event of such a run, and *only* then: a resolved agent never carries the field, so its absence is itself the "this really did resolve" signal. This is a real, going-forward fix — unlike the two counts above, it changes what new runs write, not just what `check-trace` reports about old ones.

**Not every event the runtime produced reaches the trace, and the shortfall is measured rather than assumed.** A `tool.result` whose `tool.requested` was never written is a **delivery loss** — the `PreToolUse` hook did not record, so correlation is impossible for that call. `check-trace` counts them, prints the rate, and fails only above `maxRequestLossRate` in `guards.config.json`; every other kind of finding still fails hard. The separation exists because `H-03` means no agent can ever clear an orphan, and the alternative — a permanently red step — had twice been resolved by a human **deleting evidence**. The floor is a ratchet: the answer to a rising rate is finding the lost writes, never a larger number.

**A limit this does not paper over:** a *denied* call whose request write was lost would be invisible rather than misreported, and the floor neither causes nor worsens that. Every observed loss carries `ok: true`, and a denial produces no result at all, so the lost pair is equally absent with a floor or without one.

**`run.cost` reads the transcript, not the hook payload — the payload has no usage field.** Every hook receives `transcript_path`, and the transcript's `message.usage` carries `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens` and `thinking_tokens`, per assistant message, tagged with `model`. `SubagentStop`/`SessionEnd` sum that usage **since the previous such event** — the boundary is the most recent `run.header` in the run's own trace file whose `reason` is not `observed` (a mid-dispatch posture-change header is not a resume boundary and counting it as one would silently truncate the window), or the most recent `run.cost`, whichever is later. `wall_ms` is computed from the same boundary. Both `wall_ms: null` and an absent `by_model` key (never `by_model: {}`, which is a legitimate zero) mean the boundary or the transcript could not be read — an absence, not a crash and not a fabricated zero (`G-13`).

**The transcript writes one line per content block, not one per logical message — measured, not assumed.** A single assistant turn with `thinking` + `text` + `tool_use` content produces two or three separate transcript lines sharing one `message.id`, each carrying its own `usage` snapshot; `output_tokens` grows across those snapshots (one real message measured going from 4 to 298 across two lines, 1.5 seconds apart) while the cache fields stay constant. Summing every qualifying line independently — the first version of the extractor did exactly this — overcounts almost every field; on one real dispatch the average was 2.1 transcript lines per logical message, so the miscount was not an edge case. The fix deduplicates by `message.id`, keeping only the last occurrence in file order before summing, and does not key off `stop_reason`, which is inconsistently populated even on a message's own final block.

**`message.model` is trusted only against a known shape, never copied verbatim.** It is transcript text, and the transcript "holds everything that was said" (below) — an unvalidated copy would be a second, unaudited path for arbitrary text to reach the trace as an object key. A value matching `/^claude-[a-z0-9]+(-[a-z0-9.]+)*$/i` is kept; anything else buckets under the fixed sentinel `unknown-model`.

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

`scripts/guards/gate/check-trace.mjs`, in the gate. It validates schema conformance, `seq` continuity, correlation, deny attribution and redaction across every trace on disk — **and asserts the hooks are registered.** It also prints, and never fails on, two run-level counts (`TASK 64`): delegated runs with a header and no footer, and delegated runs with a footer and no real start header — both explained above, and both left as `H-03` leaves them, visible rather than clean.

That last clause is the one that matters. A checker that only read trace files would pass forever on a repository whose hooks were never wired, which is `INC-08` reproduced inside the subsystem built to prevent it. The event vocabulary and the required registrations both live in `guards.config.json`, so the check derives what it accepts rather than carrying its own copy.

**A fresh clone has no trace, and that is reported as a count rather than as a pass.**

## The coupling that will break first

The hook payload field names are a contract with the runtime, and the runtime owns both ends of it. They were **captured from real payloads, not transcribed from documentation** — the docs summarize `PostToolUse`'s output as `tool_result`, the runtime sends `tool_response`, and the first version of the writer recorded every result as zero bytes while looking perfectly healthy.

`eventsFor` is therefore a pure function in `scripts/guards/lib/evidence.mjs` with the captured payload shapes asserted in its tests, rather than inline in the hook script where nothing would notice it drifting.

**The same discipline governs the transcript, not only the hook payload (`TASK 64`).** `permissionMode`'s presence on a `type: "user"` line was verified against a real captured transcript before the `permission_mode`-from-transcript mechanism above was written — not assumed from what a "user message" sounds like it should carry. The runtime stamps it only on a genuine freeform human turn; a tool-result "user" line never carries it, and neither does a slash command's own synthetic wrapper turns. A future change to either of those shapes is exactly the kind of drift this section exists to catch, and `extractLastPermissionMode`'s captured-shape assumptions are asserted in `evidence.test.mjs` for the same reason `POST_TOOL_USE_KEYS` is.
