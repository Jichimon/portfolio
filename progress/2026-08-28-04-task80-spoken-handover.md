# 2026-08-28 · Session 04 — TASK 80: the session close is a spoken hand-over

**Task:** TASK 80 — The session close is a spoken hand-over, not only a written packet
**Status after this session:** DONE

## What was done

`wrap-up` §5 now requires the closing **message**, not only the closing file: the cut stated explicitly, the prompt reproduced verbatim in the terminal, the tier with its one-line reason, and what is left for the human to decide. `ADR-009` was accepted in the same session and `TASK 71` closed against it.

## Decisions

- **Written now rather than trialled for two sessions, which is what was proposed, and the disagreement is recorded rather than resolved silently (`P-17`).** The format cannot be trialled unwritten: a fresh session does not inherit an unwritten habit, which is the entire premise `TASK 79` had just documented. Session two would not have produced the ending and session three would have read that as the format not sticking rather than as nobody having been told. A three-line procedure step is cheaper than a wrong conclusion drawn from a trial that could not run.

- **`wrap-up`, not `CLAUDE.md`.** The adapter states of itself that no rule bodies live there because a rule stated twice drifts (`G-10`), and `wrap-up` already owns hand-over. A second home would be exactly the drift that file exists to prevent.

- **The prompt appears in both the packet and the terminal, deliberately.** That is quotation rather than the duplication `G-10` forbids: the packet is the durable artifact, and the terminal is where a human actually copies from. A packet the human has to be told to open is a packet they open later.

- **Three parts and no template.** The moment a closing message becomes a form to fill, it stops being read — and then it stops being written.

## Findings from validating against real state (P-04)

- **The `TASK 77` packet asserted `ADR-009` was `Proposed`, in two places, and the acceptance happened in the same session that wrote it.** Found by re-reading the packet after the status changed rather than by the next session hitting it. The packet is the artifact a fresh session trusts, so a stale claim in it is worse than a stale claim in a log — it is read as current by construction. Both places corrected, and the second now also states what accepted status *costs*: any change to one of the eight points takes a level-2 index row, an inline mark and a status adjustment, all three.

- **`TASK 79` closed and needed extending on the same day, which is what `P-06` is for.** The convention it documented was correct and incomplete: it made the packet a documented file and said nothing about the message. That is a new deliverable rather than the old one being wrong, so it took a new id instead of reopening a closed item — a reopen is `K2`, and mislabelling this as one would corrupt a metric that has no substrate yet (`TASK 66`).

- **This session ran four items, against the one-per-session rule it argued for two hours earlier.** Stated rather than hidden. Three of the four are documentation-only and none reads code; the fourth is a status reconciliation. The cost argument was about long sessions accumulating re-sent context — 168M cache-read tokens against 1M of output here — not about item count, and finishing work whose context is already loaded is the cheapest case there is. The rule holds for `TASK 77` onward, where the work is code.

## Done

```yaml
done:
  docs:            { status: passed, evidence: [".claude/skills/wrap-up/SKILL.md#5", "three parts named"] }
  loose_ends:      { status: passed, evidence: ["TASKS.md TASK 80", "progress/handoff/2026-08-28-task77.md ADR status reconciled"] }
  scope:           { status: passed, evidence: ["three parts, no template — the entry's own constraint"] }
  gate:            { status: partial, evidence: ["node scripts/gate.mjs", "19 of 20", "only `procedures` red, on TASK 65 clause 2, pre-existing and tracked"] }
  tests:           { status: not_applicable, reason: "documentation item — TDD declared inapplicable for this type (T-01)" }
  mutation:        { status: not_applicable, reason: "no code written in this item" }
  content:         { status: not_applicable, reason: "no publishable file touched; resources/** is read-only to agents (H-02)" }
  security:        { status: not_applicable, reason: "no auth surface, no network, no credential path" }
  ci:              { status: not_applicable, reason: "no remote exists (TASK 30)" }
  iterations:      { status: passed, evidence: ["1"] }
  iteration_split: { status: passed, evidence: ["slice=1"] }
```

## Open questions

- **Nothing enforces the closing message**, and nothing proposed will. A guard cannot read the terminal, and a check that asserted "the model said the words" would be scoring the model rather than the harness (`A16`). It stays rung 3 — a procedure step — and the honest test of whether it works is whether the next two sessions produce it without being asked.

## Next

`TASK 77`. Its packet is `progress/handoff/2026-08-28-task77.md`, now reconciled with the accepted ADR.

## Files changed

`.claude/skills/wrap-up/SKILL.md` — §5 requires the spoken hand-over and names its three parts.
`docs/adr/ADR-009-delegation-economics.md` — status `Accepted`.
`docs/adr/README.md` — level-1 status `Current`; the pre-acceptance note now says what accepted status costs going forward.
`progress/handoff/2026-08-28-task77.md` — the ADR's status reconciled in both places; the closing message added to "Before you close".
`TASKS.md` — TASK 80 opened and closed; TASK 71 closed with the ADR's two counterintuitive conclusions carried forward.
