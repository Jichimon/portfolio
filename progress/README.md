# progress/

One log per working session. Written **at the end of every session**, before the
context is lost.

## Why

Sessions are short and context does not carry over. The next session needs to know
what was decided and why — not just what changed, which git already tells you.

**A log that only lists modified files is noise.** The value is in the decisions,
the rejected alternatives, and the open questions.

## Naming

`YYYY-MM-DD-NN-short-slug.md` — e.g. `2026-08-14-01-diagrams-otp-pair.md`.
`NN` disambiguates multiple sessions in one day.

## Template

```markdown
# YYYY-MM-DD · Session NN — <title>

**Task:** TASK N — <name>
**Status after this session:** TODO | IN PROGRESS | BLOCKED | DONE

## What was done
Two or three lines. Not a file list.

## Decisions
- **<Decision>** — why, and what was rejected. One bullet each.
  Only decisions that would be expensive to revisit. Skip trivia.

## Findings from validating against real state (P-04)
What the work assumed that turned out not to be true. Usually the most
valuable section, and the one people skip. Omit only if nothing surprised you.

## Done
```yaml
done:
  <dimension>: { status: passed,         evidence: [<pointer>] }
  <dimension>: { status: not_applicable, reason: "<one line>" }
```

## Open questions
- Anything needing the author's input. Cross-reference TASK 3 if it's a
  `[NEEDS INPUT]` marker.

## Next
The single most useful thing to do next, and why it's that one.

## Files changed
`path/to/file` — one-line reason.
```

## The done block

Applicable dimensions only. A `content` item is three lines; listing all nine
would be ceremony. Shape and rules: `docs/harness/contracts.md` §5.

**Evidence is a pointer** — a trace event, a guard name and exit code, a file
path, a run id. Never a sentence. `not_applicable` carries a one-line reason and
needs no evidence. `wrap-up` fails on any dimension reading `passed` with empty
evidence.

Dimensions in use: `tests` · `mutation` · `ci` · `security` · `docs` ·
`loose_ends` · `scope` · `content` · `iterations` · `iteration_split`.

**`iterations` and `iteration_split` travel together.** The first is a bare
integer; the second says where those cycles went, as `bucket=count` pairs that
must sum to it. The buckets are derived from the `work-item` procedure's own
steps and narrowed by the item's `type` — `check-procedures` prints the legal
set when it rejects one, so there is nothing to memorize.

```yaml
iterations:      { status: passed, evidence: ["3"] }
iteration_split: { status: passed, evidence: ["checkpoint=1", "verify=2"] }
```

## `handoff/` — the packet that starts the next session

`progress/handoff/` holds documents written **by the session that is ending, for
the one that has not started.** The convention existed and worked for three
files before anything described it; this section is that description (`TASK 79`).

**Two different kinds live here, and conflating them is the mistake to avoid.**

- A **session hand-off** carries context to a fresh session — `2026-08-27-task27.md`,
  `2026-08-27-eval001.md`. This is the shape below.
- An **author packet** carries drafted content to the human to apply to
  `resources/**`, which no agent may write (`H-02`) — `2026-08-26-task26-content.md`.
  It is a different document with a different reader, and it has no fixed shape.

### When to write a session hand-off

Whenever the next work item will begin in a **fresh session** — which is the
normal case, because a long session re-sends its whole context on every turn and
that cost grows with its length. Write it **last**, as the closing act, while the
context that makes it cheap is still loaded.

This is `P-09`'s reading half applied to a session rather than an agent: a fresh
session is economically a delegated agent with a cold context. `P-09` measured
0 of 3 slices cut when handed a pre-written extract, against 2 of 4 when sent to
go and read. **A packet that says "read `TASKS.md` and work it out" has handed
over an unbounded read; one that hands over the extract has not.**

### Shape — four required sections, derived from the two that exist

`YYYY-MM-DD-<task>.md`, and any section beyond these four is optional because a
section appearing in one of two packets is not yet a convention.

1. **`# Hand-off — TASK N: <goal>`**, then one line naming the session that wrote
   it and stating that the packet is a **claim, not ground truth** — the next
   session validates it against the repository before acting (`P-04`, `P-11`).
2. **`## The goal, in one sentence`** — what the next session produces. If it
   needs two sentences, it is two work items (`P-01`).
3. **`## How to start`** — a fenced block holding the **prompt to paste, verbatim**.
   This is the centre of the packet. Without it the next session opens by
   deciding what to do instead of doing it. Name the procedure if one applies,
   and say if it is `disable-model-invocation` and must be typed by a human.
4. **`## Boundaries`** — what this session must not do, restated because they are
   easy to forget mid-run.

Sections the existing packets add where they earn it, none of them required:
*why this item and not another* · *why now* · *what to read, in order* · *what
already exists, so it is not rebuilt* · *the traps* — the failure that will
otherwise be rediscovered the expensive way, which is usually the most valuable
part · *the slices* · *what is out of scope for this hand-off*.

**A packet is not a work log.** The log records what happened; the packet is
what the next session needs. They are written in the same session and neither
substitutes for the other.

## Rules

- Decisions section is mandatory. If a session made no decisions worth recording,
  say so explicitly rather than padding it.
- Never write anything from `private/glossary.md` into a log. Logs are committed.
- Update the status line in `TASKS.md` in the same session.
- **A log is authoritative for nothing** (`P-11`). It records reasoning and
  decisions; where it disagrees with the trace, the trace wins. `TASKS.md` owns
  work-item state.
