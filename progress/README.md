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
`loose_ends` · `scope` · `content`.

## Rules

- Decisions section is mandatory. If a session made no decisions worth recording,
  say so explicitly rather than padding it.
- Never write anything from `private/glossary.md` into a log. Logs are committed.
- Update the status line in `TASKS.md` in the same session.
- **A log is authoritative for nothing** (`P-11`). It records reasoning and
  decisions; where it disagrees with the trace, the trace wins. `TASKS.md` owns
  work-item state.
