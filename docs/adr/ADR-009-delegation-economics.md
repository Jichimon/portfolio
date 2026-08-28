# ADR-009: Delegation economics — when not to delegate, what a brief carries, who assembles the context, and what a run costs

**Status:** Accepted
**Date:** 2026-08-28 · sub-decision 8 added the same day, before acceptance · **accepted 2026-08-28**
**Context:** The harness has no recorded answer to *when not to delegate*, so every dispatch is a judgment made fresh and none of them is reviewable. `TASK 70` produced the first cost report over the trace, and `EVAL-001` produced the complaint it has to answer: agents burn their budgets searching, slices lose their seams, and runs die and report success anyway. This ADR turns those measurements into policy, and records each thing that was measured and turned out to contradict the hypothesis it was meant to confirm — including one of this ADR's own first-draft claims, in sub-decision 8.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **A · No policy — keep delegating on judgment** | Zero cost to adopt. Nothing to keep current | Every dispatch is unreviewable, and the failures `EVAL-001` counted keep recurring with nobody able to say which of them was avoidable |
| **B · A token break-even threshold** — delegate above N tokens absorbed | One number, easy to apply | **The number does not exist.** See "the figure that was dropped" below. Worse, it points at the wrong cost: our dominant loss is not token overhead, it is runs that deliver nothing |
| **C · A termination-based rule** — delegate only what can be shown to fit the role's budget, assemble context deterministically, and require a bounded report | Rests on figures this repository actually holds; the failing quantity (a run that does not finish) is the one the trace already records | Needs a script written before the first delegation of a corpus, which is slower on the first use and only pays from the second. The rule is a judgment aided by a number, not a threshold that decides for you |
| **D · A summarizer role on a cheap tier** in front of the expensive ones | Intuitive: compress before the expensive model reads | Loses to the incumbent on every axis measured. See sub-decision 4 |

## Decision

**We choose C**, expressed as eight sub-decisions — the work item named seven, and **8** was added before acceptance when the author asked where each cost is captured and stored, a question sub-decision 7 named a metric without answering.

---

### 1 · When NOT to delegate

**Do not delegate work whose slice cannot be shown to fit the role's budget.** The binding constraint here is not token price, it is **termination**: a run cut mid-flight delivers zero, not half, so its cost is total rather than proportional (`P-09`). The observable proxy already exists — the footer rate, since a run that terminates normally writes a `run.footer` and one that does not writes none (`G-06`).

Measured across this repository's dispatches:

| Role | Footers | Rate |
|---|---|---|
| `Explore` | 5/5 | 100% |
| `researcher` | 8/10 | 80% |
| `harness-evaluator` | 4/7 | 57% |
| `adversarial-auditor` | 3/5 | 60% |
| `implementer` | 21/48 | **44%** |
| `test-engineer` | 0/3 | **0%** |

**The two write-capable roles are the two unreliable ones.** At a 44% footer rate, an `implementer` dispatch has an expected cost of roughly twice its nominal cost before it has delivered anything — and that dwarfs any tier price ratio in sub-decision 6, where the widest gap between adjacent tiers is 2.5×.

**Three concrete refusals follow, and they are the operative form of this decision:**

- **Do not delegate a slice sized by a surface.** *"The guards"* is a surface; *"these six files"* is a slice (`P-09`). This applies to an audit brief exactly as it applies to an implementation brief, and the audit case is the one that gets forgotten because a cut auditor returns *some* findings, which read as the audit rather than as a fragment of one.
- **Do not delegate a read the orchestrator already holds.** The agent re-reads what is already in context and pays for it twice.
- **Do not delegate work that must be interrupted safely.** Order a brief so that nothing which must not be cut is scheduled last, because the cut lands on whatever is last.

**Delegation is worth it in the opposite shape:** a large corpus the orchestrator would otherwise have to hold, whose deliverable distils to a bounded artifact. Our own dispatches read 0.18–0.45 MB of tool results against a 4,588-byte median brief — a 39×–98× ratio of bytes absorbed to bytes spent briefing. That ratio is favourable, which is a **finding against the hypothesis this item was opened on**: `TASK 71`'s entry proposed that several of our delegations were plausibly below break-even, and by the only ratio we can compute, they are not. The waste is in the cut runs, not in the arithmetic.

#### The figure that was dropped

`TASK 71`'s entry cited *"external cost math puts the break-even where a worker absorbs ~500k+ tokens."* A dedicated search found **no source for that figure**, and the closest published figures differ from it by more than an order of magnitude in both directions. **It is withdrawn rather than quietly restated** — `C-01` applies to the harness's own numbers exactly as it applies to a case study's.

What is sourced, and what it does and does not say:

> "agents typically use about 4× more tokens than chat interactions, and multi-agent systems use about 15× more tokens than chats"
> — Anthropic Engineering, [*How we built our multi-agent research system*](https://www.anthropic.com/engineering/multi-agent-research-system), published 2025-06-13, retrieved 2026-08-28. **Vendor-authored.**

That is an **architecture-level multiplier**, not a per-dispatch break-even, and it is the only figure Anthropic states as a company. **We treat it as still standing without having re-verified it**, which is an assumption and is stated as one: no newer restatement was found. The same post gives the qualitative condition — *"multi-agent systems require tasks where the value of the task is high enough to pay for the increased performance"* — and names coding as a poor fit relative to research, because it has *"fewer truly parallelizable tasks."*

Below that tier of evidence, published break-even estimates vary by an order of magnitude with task shape (one third-party blog's own arithmetic lands near ~20k tokens absorbed; an Anthropic employee's informal experiments reported orchestration winning on one task mix and adding a 60% markup for no benefit on an easier one). **That spread is the finding.** A single threshold copied from any of them would be a number about somebody else's workload.

### 2 · The brief contract

Every brief carries five sections, and nothing else is required of it:

1. **Objective** — the question or deliverable, stated so the agent can tell when it is finished.
2. **Inputs, as extracts, by path** — see sub-decision 3.
3. **Output format** — the shape the report must arrive in.
4. **Boundaries** — what this run owns and what it must not touch.
5. **Definition of done** — the checkable condition.

**A brief carries the task and never the rules** (`P-08`). Rules load themselves; what you paste you can also forget, and what you forget the agent never knows.

**The inputs section is the one that decides whether the run finishes**, and this was measured rather than reasoned. Nine slices of equal size, all owning two files: briefed to read sibling modules, **2 of 4 were cut**; briefed with a pre-written extract and forbidden to open the source, **0 of 3 were cut**; briefed to go read three spec files and derive the rest, **1 of 1 was cut** at roughly 100k tokens having produced nothing at all. *"Read this document and find X"* and *"here is X"* look identical when you write them and differ by an order of magnitude when they run.

### 3 · Deterministic assembly is policy, not a preference

**The context assembler is a script.** When a delegated run needs a corpus, a deterministic script reads it, writes an extract to disk, and the brief hands over the path. Neither the orchestrator nor the agent ever holds the corpus.

This was measured twice on 2026-08-27: 104 trace files and 96 work logs became two extract files, and `harness-evaluator` then finished its scoring in roughly 37 of its 60 turns. The extraction cost **zero model tokens** and its output is byte-reproducible, so a second run over the same corpus is diffable against the first.

**This is also the answer to the instinct it displaces.** *"The orchestrator should gather all the context and assemble it"* points at the actor that already carries **4.42 MB across 2,453 tool calls — more than every delegated role combined (1.66 MB)** — and whose context has to survive the whole session. The orchestrator is the most expensive actor in the harness and the one `G-09` denies a role file; adding assembly to it is the opposite of the fix.

### 4 · The numeric gate a summarizer role must pass before it exists

**A summarizer or context-compactor role is not built.** To exist it must beat the incumbent, and the incumbent is a script at **zero model tokens, byte-reproducible output, and an auditable diff**. No model tier can beat zero on cost, so the only ground a summarizer could win on is prose a script cannot parse — a case that has not arisen here.

Two independent supports, and the second is new:

- Both extracts built on 2026-08-27 were scripts, and both worked.
- **Anthropic's own published material does not do this either.** Its context-engineering guidance describes compaction as passing the history to *the model* to summarize its own conversation — the same model, not a cheaper tier in front of an expensive one — and the official cookbook's worked example uses a single fixed model throughout compaction, tool-result clearing and memory, with no cascading step. Sources: [*Effective context engineering for AI agents*](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) and the [Claude Cookbook's context-engineering page](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools), both vendor-authored, retrieved 2026-08-28. The tier-cascade idea appears only in independent secondary commentary, and there as a trade-off rather than a recommendation.

**Recorded so it is not re-proposed each session.** `budget-probe` remains the one role deliberately on a small footprint, and it is a probe rather than a worker.

### 5 · What a delegated run must return

**A bounded report is part of the deliverable, not a courtesy.** A run that lands its artifacts and returns no account has delivered half — `TASK 55` found this the hard way, when the artifacts arrived and the reports were the casualty.

**And a `completed` notification is not that report** (`P-18`). Before a delegated run is treated as finished, its `run.footer` is read from the trace: a run that terminates normally writes one, a run that was cut writes none. When what came back is a fragment rather than an account, the run is **resumed** — never taken over. Taking over a live run puts the orchestrator and the agent in the same file in the same minute (`INC-16`), and the orchestrator is the one actor no write-scope allowlist can reach (`G-09`).

**What the footer's absence does not say:** that a budget caused it. A crash, a kill and a hook that never fired look identical (`G-06`).

### 6 · Model tier per role, and the orchestrator's own tier

**The current allocation stands, and this sub-decision records that it was checked rather than assumed:** `implementer`, `test-engineer` and `researcher` on Sonnet; `adversarial-auditor` and `harness-evaluator` on Opus; the orchestrator on Opus.

Published tier guidance, vendor-authored, retrieved 2026-08-28 from Anthropic's pricing and model-overview pages: *"Choose Haiku for simple tasks, Sonnet for most production workloads, and Opus for the most complex reasoning."* Our split lines up with that on its face — judgment-and-adversarial work on Opus, production work on Sonnet.

**The ratios matter more than the prices**, because the decision is which role runs where rather than what a month costs. Each tier is a clean multiple of the next, so the ratios are unlikely to drift even if the dollar figures are revised: **Haiku → Sonnet 2× · Sonnet → Opus 2.5× · Haiku → Opus 5× · Sonnet → Fable 5×**, on input and output alike.

**Set against sub-decision 1, this is the smaller lever and should be treated as one.** The widest adjacent-tier gap is 2.5×; `implementer`'s 44% footer rate is worth about 2.3× on its own, and it is paid on runs that produced nothing. Moving a role down a tier to save 2.5× on a run that does not finish saves 2.5× of nothing.

**The orchestrator's tier is prose policy verified from the trace, and that asymmetry is deliberate.** `G-09` denies the orchestrator a role file, because a subagent cannot ask the human and so a role named `orchestrator` would define a role structurally incapable of running the checkpoint. Writing a role file to hold a `model:` field would quietly relocate the checkpoint somewhere it cannot happen. A fake field is worse than an honest gap, and this paragraph exists so that nobody "fixes" it.

### 7 · The headline metric: cost per completed item

**`K1` stops being the headline and becomes a factor of it.** The headline is **cost per completed work item**, which captures both of the author's stated complaints — agents cost too much, and they take too long — in one number that hooks the agent cannot edit already write.

Its three factors, all observable:

| Factor | Substrate |
|---|---|
| Iterations to done, and **where they went** | `iterations` + `iteration_split` in the work log (`TASK 72`) |
| Result bytes and wall-clock per dispatch | `bytes` and `duration_ms` on every `tool.result` (`TASK 70`) |
| Runs that delivered nothing | `run.footer` presence per dispatch (`G-06`) |

**One limit travels with the `bytes` column, and it is about that column only:** `bytes` measures tool **results** — not the prompt, not the re-sent conversation history, not model output. It is a proxy for marginal context inflow and is **never tokens billed**. `WebFetch` records ~78 bytes per result and `WebSearch` ~154, so `researcher` reads as nearly free and **no break-even may be computed for it from this column**.

**That limit is about `bytes`, not about tokens, and the first draft of this ADR blurred the two.** Tokens are measurable; sub-decision 8 says how.

### 8 · The cost ledger — how each cost is captured, and where it lives

Sub-decision 7 names the metric. This one says how it is produced, per unit, so that "cost per completed item" is something you compute rather than something this ADR asserts.

**What the substrate actually holds today**, checked rather than assumed:

| Unit | wall-clock | result bytes | tokens |
|---|---|---|---|
| tool call | `duration_ms` on `tool.result` | `bytes` on `tool.result` | — |
| **dispatch** (one slice's run) | derivable from the segment's first and last `ts` | summed over the segment | `run.cost`, below |
| the brief itself | — | **already recorded** — `target.bytes` on the parent's `Agent` request | — |
| session | derivable | summed | `run.cost`, below |
| **work item** | — | — | via the declared join, below |

#### Tokens: read from the transcript, written to the trace, as integers only

Hook payloads carry no usage field. But every hook receives **`transcript_path`**, and the transcript's `message.usage` carries `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens` and `thinking_tokens` — **per assistant message, tagged with its `model`**. Measured on this repository's own transcripts on 2026-08-28: one session totals 1,062,469 output and 168,464,001 cache-read tokens, and an earlier session carries `claude-opus-5` and `claude-sonnet-5` in one file, so per-model attribution already works.

So a hook at `SubagentStop` and `SessionEnd` sums that usage since the previous such event and writes **one** event:

```jsonc
{"ev":"run.cost","run_id":"…","agent":"researcher","wall_ms":194254,
 "by_model":{"claude-sonnet-5":{"in":1828,"out":12040,"cache_create":43619,"cache_read":21353}}}
```

Four properties, each load-bearing:

- **Integers only — never a string from the transcript.** The transcript holds everything that was said, including anything read near `private/`. This trace deliberately records *what was attempted, decided and happened*, never *what was said*, and extracting only named numeric fields is what keeps that true. It is the constraint the red battery exists for, not a style preference.
- **Written by a hook**, so `H-03` holds and the scored entity cannot edit its own cost — the same substrate argument as `A11`.
- **Stored in the trace rather than recomputed from the transcript on demand.** Transcripts are ephemeral: a subagent's own transcript file was already empty when checked hours later. The trace is not. Reading the transcript at report time was considered and rejected for that reason alone.
- **Per dispatch and per session — never per turn.** A slice *is* a dispatch, so per-dispatch is the slice granularity. A per-turn split is the taxonomy `TASK 72` already declined for `iteration_split`, for the same reason.

#### The work-item join is declared, not inferred — and the ADR says which

`run.header` carries `run_id`, `parent_run_id`, `agent` and `reason`, and **no work-item id**. The parent's `Agent` request carries a `tool_use_id`; the child's run id is built from `agent_id`; the two are different values and no parent `tool_use_id` reaches `SubagentStart`. **A hook cannot know which work item is being worked on**, and inventing a heuristic that guesses would be worse than an honest declaration.

So the work log's `done:` block carries a `cost:` dimension naming the session and dispatch run ids the item consumed, and `check-procedures` verifies that each one **resolves to a real run** in `evidence/runs/`. That is a **self-reported pointer into an observable artifact** — weaker than pure observation, stronger than prose, and it is the only mechanism available. Its weakness is stated here rather than discovered by whoever reads the first number.

#### What stays unmeasurable, said out loud

- **A per-turn cost split.** `message.usage` is per assistant message; mapping messages to the harness's own notion of a turn is a second inference, and no decision currently needs it.
- **The orchestrator's own context re-send, separated from its work.** It sits inside `cache_read`, which is the dominant term by two orders of magnitude, and nothing distinguishes "re-sent because the session is long" from "read because the task needed it".
- **A cost in currency.** Prices are published and the ratios are in sub-decision 6, but the harness reports tokens and does not multiply them out. A dollar figure would go stale silently; a token count does not.

## Consequences

- **We gain:** a delegation refused for a stated reason rather than by mood; an assembler that is a script, so the corpus never enters a context window at all; and a headline metric read from a substrate the scored entity does not author.
- **We accept losing:** deterministic assembly means writing a script before the first delegation of a corpus — slower on the first use, and it only pays from the second. Sub-decision 1 is a judgment aided by a number rather than a threshold that decides for you, so two people can still disagree about a marginal dispatch; a threshold would have removed that disagreement by inventing a number, which is the trade we refused. And withdrawing the ~500k figure leaves this ADR with **no external break-even at all** — the honest state, and a less satisfying one than the entry expected.
- **This creates a dependency on:** the trace continuing to record `bytes` and `duration_ms` per `tool.result`, which is `PostToolUse` — the hook the harness-economy milestone declined to cut for exactly this reason. Cutting it to save ~6% latency would delete the instrument and keep the problem. **And, new with sub-decision 8, on the transcript's `message.usage` shape**, which is a runtime detail this project does not control: if it changes, the extractor records an absence and the token column goes quiet rather than wrong.

## Review trigger

Any one of:

- **`implementer`'s footer rate rises above 40 of 48**, or any delegated role's falls below the orchestrator's own. Sub-decision 1 rests entirely on that column, and it is the number that would refute it.
- **A prose corpus appears that no script can parse.** That is the one remaining slot for the summarizer role sub-decision 4 declines.
- **Anthropic publishes a per-dispatch break-even, or restates the 4×/15× multiplier.** The withdrawn figure's slot is left open on purpose.
- **A hook payload gains a usage field**, making sub-decision 8's transcript read unnecessary. The read exists because the payload has none; the day it does, the extractor is deleted rather than kept alongside.
- **`cache_read` stops dominating**, or the runtime starts separating re-send from work. Sub-decision 8 declares that split unmeasurable on today's substrate, and it is the largest term in the number.

> **Trigger fired before this ADR was accepted, and replaced rather than deleted.** The draft carried *"the trace gains a token count — `bytes` is a proxy adopted because nothing better exists."* Checking that assumption is what produced sub-decision 8: tokens were already available, one directory over, and the ADR had been about to record their absence as a fact. The two triggers above are the ones that have **not** fired.
