---
name: work-item
description: Drive one work item from TASKS.md to done — spec-first where the type calls for it, with the human's approval before any write-capable delegation. Use when starting or resuming a tracked work item.
argument-hint: [TASK-N]
disable-model-invocation: true
---

Drive **one** work item, named in `$1`. If no id was given, read `TASKS.md`, propose the next one, and stop for confirmation.

This procedure is deliberate rather than automatic. It is not loaded on its own, because a router that the model can trigger itself turns "no procedure for a typo" into a suggestion — and ceremony applied to a one-line fix is how procedures get abandoned.

## 1 · Orient

Read, in order:

1. The work item's entry in [TASKS.md](../../../TASKS.md) — its `type`, its `Done`, its constraints.
2. The newest file in [progress/](../../../progress/) that cites it, if any.
3. [docs/adr/README.md](../../../docs/adr/README.md) — the index only, then any ADR that governs this area.

**Then validate against real state** (`P-04`). Read the actual code, config and docs before accepting any claim in the entry or in the conversation. A surprising share of what gets asserted in planning turns out not to be true of the repository, and the cheapest moment to find that out is now.

Open the work log immediately — `progress/<date>-<nn>-<task>-<slug>.md`, per [progress/README.md](../../../progress/README.md). Write it **as you go**. A log reconstructed at the end records what you remember rather than what happened (`P-05`).

## 2 · Spec, or the artifact that replaces it

The work item's `type` decides this, and the table in `TASKS.md` is authoritative:

- **`feature` · `migration`** — write `docs/specs/SPEC-<TASK-N>-<slug>.spec.md` from the template. Behaviors with stable ids, edge cases for every `critical` one, a test plan, and the `tdd` field answered with its rationale.
- **every other type** — there is no spec. The ADR, the content file, the generated work-item list or the diff is the artifact, and it is what the human approves.

## 3 · Checkpoint — stop here

**Present the artifact file and wait.** Not a summary of it — the file.

Three things that are *not* this gate: a plan approval, an auto-accept permission mode, and a "go ahead" in conversation. `INC-05` is three implementers launched on the strength of a plan the human had never traced to a spec.

On approval, set `approved_version` to `version`. **Any change after that bumps `version` and needs re-approval** — and the delegation gate enforces it, so a drifted spec stops write-capable delegation at rung 1 rather than by good intentions (`H-05`).

## 4 · Slice and delegate

Slices are sized by **whether one run can finish them**, never by topic (`P-09`). Enumerate objects — *these six files* — never surfaces — *the guards*. An agent cut off mid-run delivers zero, not half: the cost is total, not proportional. When a slice will not fit, cut the scope; do not hope.

A brief carries the task and **never the rules** (`P-08`). Rules load themselves; what you paste you can also forget, and what you forget the agent never knows. Give it: goal, behavior ids, the files it owns, the definition of done, and its budget.

Ownership is disjoint across files, behaviors, contracts, schemas and resources — semantic collisions, not only git conflicts (`G-12`).

Where TDD applies, the implementer reports the **failing test message before the implementation that satisfies it**. That is the deliverable, not a formality.

## 5 · Verify

**An agent's report is a claim; the artifact is the evidence** (`P-11`). Verify what the agent says it verified. "I ran the gate and it passed" and "the gate passes" are different propositions, and only the second is a fact about the repository.

Run `node scripts/gate.mjs`. Read the trace under `evidence/runs/` where a claim needs corroborating.

Then ask of every new invariant, check or abstraction: *what breaks when someone adds to, removes from, or moves one of these next month?* Green-today is not robust-tomorrow (`P-16`).

## 6 · Reconcile

Living documents are updated **and then checked that they were** (`P-07`). Reconciling and verifying you reconciled are different acts, and only the second produces evidence. The characteristic failure is doing the obvious half — an index row added while the document it points at still claims to be current.

Loose ends become tracked work items in `TASKS.md`, never prose (`P-06`). A loose end in a paragraph evaporates.

## 7 · Close

Run `/wrap-up`. It refuses a `done` block that claims success with nothing behind it, which is the check this whole procedure exists to earn.

## Boundaries

- Never invoke a git write. The human owns commits (`H-01`).
- Never delegate a write-capable role while the spec is `draft` or has drifted (`H-05`). The gate denies it; do not work around the denial.
- Push back explicitly when a request would weaken the portfolio, then do the work. State the concern once — do not relitigate it (`P-17`).
