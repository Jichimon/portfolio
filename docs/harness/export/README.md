# The harness export

`TASK 9`'s deliverable. Two self-contained documents that install this harness on another project — one per agent tool, because the control plane is the half that cannot be written once for both.

| Document | For |
|---|---|
| `HARNESS-BOOTSTRAP.claude-code.md` | Claude Code — rules directory, skills, agents, settings deny rules plus a pre-tool hook |
| `HARNESS-BOOTSTRAP.opencode.md` | OpenCode — instructions array, commands, agents, permission map plus a blocking plugin |

Each is `prelude + shared core + installation appendix`. **Everything between the two `SHARED CORE` markers is byte-identical in both files**, and `check-export` in the gate fails when it stops being. The tool-specific halves are the prelude — how that tool loads the harness, and what it cannot enforce — and the appendix, which is the concrete install.

## What travels, and what does not

The core carries the twenty-two invariants, the rung ladder, both trust ladders, the registry model, all eighteen incidents transcribed, the `H`/`P`/`G`/`C`/`T`/`S` rules with their bodies, the work-item model, the three procedures in full, the done block, the log and hand-off conventions, the decision-record model, the agent and run contracts, the control plane, the evidence trace, the evaluation layer, the gate, guard design, and the seven-step installation flow with its retrofit variant.

**Ids are not renumbered.** A rule that did not travel leaves a visible gap with its reason — the portfolio content surface (`C-08`…`C-10`, `C-12`…`C-15`) and two web implementation rules (`S-01`, `S-05`). Renumbering would break every citation in `progress/` here and in the target projects' future logs (`G-10`).

The export's own §21 states every omission with its reason, so nobody spends an afternoon looking for something that was left out on purpose.

## Maintaining them

**Edit one core, then copy the block to the other, then run the gate.** The check is what makes that safe: it derives its file set from this directory rather than from a list, so a third bootstrap is covered by existing.

```bash
node scripts/guards/gate/check-export.mjs
```

There is deliberately **no generator**. Two committed files that a check keeps identical was chosen over a build step whose output nobody reads, and the trade-off is stated in `TASK 9`'s log: a generator is cleaner and is more machinery to maintain than the property is worth at two files.

## Status

**v1, and the documents say so on their own first screen.** They were written from a harness that had driven roughly 120 work items and been scored twice — but had never been *measured* on a codebase it did not build. `TASK 100` is that measurement: the two installations these documents describe. What comes back amends them with an origin that is real rather than assumed (`C-02`).
