# 2026-08-28 · Session 03 — TASK 79: the hand-off packet becomes a documented convention

**Task:** TASK 79 — The hand-off packet becomes a documented convention
**Status after this session:** DONE

## What was done

`progress/README.md` gains a `handoff/` section describing the packet's shape and when one is written; `wrap-up` §5 names the directory and requires a packet whenever the next work item will start in a fresh session. The shape is derived from the packets that already exist, not invented.

## Decisions

- **The convention is described, not designed (`C-02`).** Three packets existed and two of them worked; this item writes down what they do. Inventing a shape would have produced a document that contradicts the artifacts it claims to govern — the failure mode `C-14` was corrected for, where a rule named thirteen frontmatter keys that no file carried.

- **Four sections required, everything else optional, and the cut is arithmetic rather than taste.** A section appearing in one of the two session packets is not yet a convention. Required: the title-plus-disclaimer, the goal in one sentence, the ready-to-paste prompt, and the boundaries. Optional and listed so they are reachable: why this item, why now, what to read in order, what already exists, the traps, the slices, what is out of scope.

- **The prompt is declared the centre of the packet.** Without one the next session opens by deciding what to do rather than doing it, which is the cost the packet exists to remove.

- **Written into `progress/README.md` rather than a new template file.** That document already carries the work-log template; a second location for "the shape of a document in `progress/`" is one more thing to keep in sync (`G-10`).

## Findings from validating against real state (P-04)

- **The directory holds two different kinds of document, and the plan had assumed one.** `2026-08-27-task27.md` and `2026-08-27-eval001.md` hand context to a fresh session. `2026-08-26-task26-content.md` hands drafted content to the **author**, to apply to `resources/**` under `H-02` — a different reader, a different purpose, and a section structure (`## 1.1 — resources/site/ui.en.md`, per file) that shares nothing with the other two. Writing one shape over both would have produced a convention fitting neither. Both kinds are now named and only the session hand-off is given a shape.

- **The convention had no reachable pointer at all.** Grepping `progress/README.md`, every file in `.claude/rules/`, every `SKILL.md` and `docs/harness/` for "handoff" returned nothing. Three packets, zero references — the directory was found by listing `progress/`. `P-10` says knowledge lands in the repository or it does not exist; this was the weaker case where it landed in the repository and was still unreachable.

- **The most valuable section in the existing packets is the one no template would have thought to require.** `2026-08-27-eval001.md` spends a paragraph on a single trap: citing a bare `TASK 22`–`TASK 26` anywhere in a delegation brief triggers `H-05`'s approved-spec check, because `extractWorkItems` scans the whole brief text. Two real denials came from it. That is exactly the knowledge that costs a run to rediscover and two minutes to write down, and it is why "the traps" is listed first among the optional sections.

## Done

```yaml
done:
  docs:            { status: passed, evidence: ["progress/README.md handoff section", ".claude/skills/wrap-up/SKILL.md#5"] }
  derivation:      { status: passed, evidence: ["shape taken from 2026-08-27-task27.md and 2026-08-27-eval001.md", "sections in 1 of 2 declared optional"] }
  loose_ends:      { status: passed, evidence: ["TASKS.md TASK 79", "the two document kinds named"] }
  scope:           { status: passed, evidence: ["no new directory, no template file — the entry's own constraint"] }
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

- **Nothing enforces that a packet exists when one is needed**, and no check is proposed. A guard would have to know whether the next item starts in a fresh session, which is a fact about the human's intent rather than about the repository. It stays rung 3 — a procedure step in `wrap-up` — and that is stated rather than left to look like an oversight (`G-11`).

## Next

`TASK 77`. Its packet is `progress/handoff/2026-08-28-task77.md`, which is the first one written under this convention.

## Files changed

`progress/README.md` — the `handoff/` section: the two document kinds, when to write one, and the four required sections.
`.claude/skills/wrap-up/SKILL.md` — §5 requires the packet and says why it is written last.
`progress/handoff/2026-08-28-task77.md` — the packet for the next session.
`TASKS.md` — TASK 79 opened and closed; TASK 77 and TASK 78 opened; the run order gains all three.
