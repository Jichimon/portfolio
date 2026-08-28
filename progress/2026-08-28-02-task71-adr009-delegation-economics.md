# 2026-08-28 · Session 02 — TASK 71: ADR-009, delegation economics

**Task:** TASK 71 — `ADR-009`: delegation economics and the brief contract
**Status after this session:** DONE — `ADR-009` accepted by the author 2026-08-28, status `Current`, eight sub-decisions

## What was done

`docs/adr/ADR-009-delegation-economics.md`, settling the seven questions the work item names, each on a measured number or an explicit statement that no number exists. Registered in the ADR index at level 1 while `Proposed`, following `ADR-008`'s precedent. External evidence gathered by one `researcher` dispatch, whose `run.footer` was read from the trace before any of it was used.

**An eighth sub-decision was added the same day, before acceptance**, after the author read the draft and asked where the cost of each slice and each trace is captured and stored. Decision 7 named a metric and did not answer that. Checking it produced a finding against this ADR's own first draft — see below.

## Decisions

- **The break-even rule is termination-based, not token-based.** The binding constraint measured here is not price, it is runs that deliver nothing: a cut run costs its full price for zero output. `implementer` writes a footer on 21 of 48 dispatches and `test-engineer` on 0 of 3, so an `implementer` dispatch carries roughly a 2.3× expected-cost multiplier before delivering anything — against a widest adjacent-tier price ratio of 2.5×. **Tier selection is therefore the smaller lever**, and the ADR says so rather than leading with it, which is the opposite of where the discussion naturally goes.

- **The ~500k-token break-even figure is withdrawn rather than restated.** See the findings below. The ADR leaves the slot **empty and named** — one of its review triggers is Anthropic publishing a per-dispatch break-even — instead of substituting the nearest available number, which would have been a figure about somebody else's workload wearing ours.

- **The summarizer role stays unbuilt, now with a second independent support.** The incumbent is a script at zero model tokens with byte-reproducible output; no tier beats zero. New: Anthropic's own published material does not cascade tiers either — its context-engineering guidance has *the same* model compact its own history, and the official cookbook's worked example uses one fixed model throughout. The tier-cascade idea appears only in secondary commentary, and there as a trade-off.

- **The orchestrator's tier is prose policy, and the ADR argues for the gap rather than apologising for it.** `G-09` denies the orchestrator a role file because a subagent cannot ask the human, so a role named `orchestrator` would be structurally incapable of the checkpoint. A role file created to hold a `model:` field would relocate the checkpoint somewhere it cannot happen. The paragraph exists so nobody "fixes" this by symmetry.

- **No level-2 index row.** `ADR-009` opens ground none of the eight covered and cites `ADR-006` and `ADR-008` rather than reopening them, which is the work item's own constraint. Adding an amendment row for a decision that amends nothing would make the level-2 table less trustworthy, not more.

## Findings from validating against real state (P-04)

- **The figure this work item was opened on does not exist.** The entry read *"external cost math puts the break-even where a worker absorbs ~500k+ tokens."* A dedicated search found no source for it. The two closest published estimates differ from it by more than an order of magnitude **in both directions** — one third-party blog's own arithmetic lands near ~20k tokens absorbed, and a separate figure near 0.37M turns out to be a task's total reading requirement rather than a break-even at all. The register entry has been corrected in place rather than silently rewritten: an unsourced number in `TASKS.md` is the same defect as an unmeasured number in a case study (`C-01`).

- **The hypothesis the figure supported is contradicted by our own data.** The entry inferred that *"several of our delegations are plausibly below break-even."* By the only ratio we can compute — 4,588 bytes of brief against 0.18–0.45 MB of tool results absorbed — our dispatches run 39× to 98× favourable. The waste `EVAL-001` complained about is real and it is somewhere else: in the runs that do not finish.

- **The one figure Anthropic states as a company is architecture-level, not per-dispatch**, and it is over a year old relative to today with no restatement found: *"agents typically use about 4× more tokens than chat interactions, and multi-agent systems use about 15× more tokens than chats"* (published 2025-06-13, vendor-authored). The ADR treats it as still standing **and says that this is an assumption** rather than something re-verified.

- **The published evidence below Anthropic's own post is thin, and the ADR states that rather than smoothing it.** One third-party blog with an unstated methodology, and one Anthropic employee's informal experiments cited secondhand — which reported orchestration winning on one task mix and adding a 60% markup for no benefit on an easier one. That contradiction across task shapes is itself the finding, and it is the reason a single copied threshold would have been wrong.

- **The tier price ratios are clean multiples**, which matters more than the absolute prices for a decision about which role runs where: Haiku → Sonnet 2×, Sonnet → Opus 2.5×, Haiku → Opus 5×, Sonnet → Fable 5×, on input and output alike. A ratio built from clean multiples survives a revision of the dollar figures.

- **The ADR's own first draft recorded a capability as absent that exists.** Decision 7 said `bytes` is *"a proxy for marginal context inflow and never tokens billed"* — true of that column — and its review trigger read *"the trace gains a token count: `bytes` is a proxy adopted because nothing better exists."* Checking that assumption instead of shipping it: **hook payloads carry no usage field, but every hook receives `transcript_path`, and the transcript carries `message.usage` per assistant message, tagged with its model.** Measured: 1,062,469 output and 168,464,001 cache-read tokens in this session; an earlier session carries two model tiers in one file. The trigger had fired before the ADR was accepted, and it is replaced rather than deleted so the sequence stays visible. `C-02` cuts both ways — describing a capability you do not have as built is one failure, and recording one you do have as absent is the other.

- **`G-06` and decision 7 were saying different things and being read as one.** *"`maxCost` is not available"* is true of the **budget control**; *"never tokens billed"* is true of the **`bytes` column**. Neither is about whether tokens can be measured, and together they had been functioning as if they were. `TASK 77` splits the claim (`G-11`).

- **`cache_read` is the dominant cost term by two orders of magnitude** — 168M against 1M of output in this session, roughly 184k of context re-sent per message. That is the measured argument for one work item per session, and it is why this session stops after the documentation items rather than starting `TASK 77`.

- **`P-18` paid on its first deliberate use.** The `researcher` run's footer was read from the trace before its report was used: `COMPLETE / objective_reported`, seq 60 of 60 events with no gaps, zero denials, 19 tool uses against a 25-turn budget. That is what makes the report an account rather than a fragment, and it is a different proposition from the `completed` notification that announced it.

## Done

```yaml
done:
  artifact:        { status: passed,  evidence: ["docs/adr/ADR-009-delegation-economics.md", "7 sub-decisions, template shape"] }
  sourcing:        { status: passed,  evidence: ["every external claim carries publisher + date retrieved", "one figure withdrawn as unsourced"] }
  delegation:      { status: passed,  evidence: ["evidence/runs/21861e1c-.../researcher-a91ac79721ecaf936.jsonl", "run.footer COMPLETE/objective_reported, seq 60/60, 0 denials"] }
  docs:            { status: passed,  evidence: ["docs/adr/README.md level-1 row", "TASKS.md TASK 71 corrected"] }
  checkpoint:      { status: passed,  evidence: ["ADR-009 accepted by the author 2026-08-28", "docs/adr/README.md level-1 status: Current"] }
  gate:            { status: partial, evidence: ["node scripts/gate.mjs", "19 of 20", "only `procedures` red, on TASK 65 clause 2, pre-existing and tracked"] }
  content:         { status: not_applicable, reason: "no publishable file touched; resources/** is read-only to agents (H-02)" }
  security:        { status: not_applicable, reason: "no auth surface, no credential path; the researcher holds no shell" }
  tests:           { status: not_applicable, reason: "research item — no code written; TDD is declared inapplicable for this type (T-01)" }
  mutation:        { status: not_applicable, reason: "no code written in this item" }
  ci:              { status: not_applicable, reason: "no remote exists (TASK 30)" }
  iterations:      { status: passed,  evidence: ["1"] }
  iteration_split: { status: passed,  evidence: ["slice=1"] }
```

## Open questions

- ~~**Does the author accept `ADR-009` as written?**~~ **Answered 2026-08-28: accepted**, after the eighth sub-decision was added. The question that actually came back was not sub-decision 6 as predicted, but a gap in 7: *where does the cost of each slice and each trace live?* — which 7 named a metric without answering. Recording the wrong prediction rather than deleting it, because what a reviewer actually asks is more useful than what you expected them to.
- **Lance Martin's "Parameter Golf" results were reachable only through a third-party citation.** No number from them is quoted in the ADR. If a future amendment wants one, the primary post has to be located first.

## Next

`TASK 77` — `run.cost`, inserted ahead of the fix phase. It is the instrument the fix-phase items are measured with, and the transcripts it reads are ephemeral, so running the fix phase first loses that data permanently. `progress/handoff/2026-08-28-task77.md` is its packet. `TASK 65` follows.

## Files changed

`docs/adr/ADR-009-delegation-economics.md` — new; the artifact this item produces.
`docs/adr/README.md` — level-1 row, and the paragraph recording that the ninth ADR is the first about the harness rather than the site.
`TASKS.md` — TASK 71 to `IN PROGRESS`; the unsourced break-even figure withdrawn in place with its reason; the eighth sub-decision recorded against an entry that asked for seven; `TASK 77`, `TASK 78` and `TASK 79` opened and placed in the run order.
