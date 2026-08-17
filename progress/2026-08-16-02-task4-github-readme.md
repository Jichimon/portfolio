# 2026-08-16 · Session 02 — TASK 4, GitHub profile README + repo audit

**Task:** TASK 4 — GitHub profile README
**Status after this session:** DONE

## What was done
Wrote `resources/github/profile-README.md` (English only, per spec) and audited
all 18 public repos on `github.com/Jichimon` via `gh repo list`/`gh api`,
producing pin/archive/private recommendations below. Recommend-only, per the
author — no `gh` mutations run in this session. Follow-up in the same session:
author shared their CV PDF and asked the Stack line be sourced from it — pulled
in the real breadth (Node.js/Nest.js, PostgreSQL, MongoDB, Elasticsearch,
RabbitMQ, React, Flutter, agentic/LLM tooling) that the first draft undersold,
cross-checked against what the case studies' own `stack[]` frontmatter already
publishes so nothing is a new, unverified claim. Also aligned the title to
"Senior Software Engineer" to match both the CV's own summary line and
`home.en.md`. Deliberately left off the CV's real name for the NICE platform (the
rest of the portfolio keeps it generic — "an enterprise CX platform" — and
that name is itself on `private/banned-terms.txt`), soft skills, and the phone
number / references block (banned outright, per `CLAUDE.md` §3.1).

## Decisions
- **README links only email + LinkedIn, no "portfolio" link.** The site
  doesn't exist yet (TASK 5 blocked) and this content repo has no GitHub
  remote — nothing real to link to. Revisit when TASK 5 ships. Rejected
  linking into this repo's raw markdown, since that would require deciding
  right now whether to make this content repo public — a bigger question the
  author previously deferred (see intake.md C6) and didn't want to reopen here.
- **`control_asistencia` → make private.** Confirmed with the author this
  session: it has a hardcoded API key (expired 2021-07, per the author's
  earlier note in intake.md C6) and names a commercial SDK the matching
  case study intentionally omits. Not fixed in this session (recommend-only)
  — the author will flip visibility themselves.
- **Repo audit lives in this log, not a new file under `resources/github/`.**
  TASKS.md only names the README as the deliverable; the audit is advisory,
  not publishable content. Follows the precedent of other in-session decision
  records (e.g. `2026-08-15-07-task3-needs-input.md`).
- **Consolidated four overlapping OpenTK/graphics repos into one recommended
  story.** `Initial_Graphic_Project` (2023-04), `OpenTK_Project` (2023-04-29),
  `MyFirstGameEngine` (2024-03-23) and `open_tk_unit` (2024-08-28) are the
  same coursework/hobby thread across ~18 months. Recommended keeping
  `MyFirstGameEngine` (renamed, with a real README) as the one public face and
  archiving the other three, rather than pinning or cleaning up all four —
  the author asked (intake.md I3) for the OpenTK exploration to show up
  without the profile looking cluttered with tutorial repos.

## Repo audit — full recommendations

**Keep public, clean up before pinning**
| Repo | Pushed | Why |
|---|---|---|
| *(the .NET/Tempo observability NuGet repo, most recently pushed public repo)* | 2025-06 | Real, relevant — but README is just a title. Author already confirmed (intake.md C6) it's fine to stay public: a POC with no private info. Flagging for awareness only: its repo/namespace name uses a prefix `private/glossary.md` still lists as never-published outside `private/` — not reopening that decision (which was about GitHub visibility, not about writing the name into this log), just noting the inconsistency exists and not repeating the name here. Recommend writing a real README before treating it as a pin. |
| `MyFirstGameEngine` | 2024-03 | Strongest of the four OpenTK/graphics repos (see Decisions). Recommend renaming off "MyFirst" (reads junior) and writing a real README, then pinning. |

**Make private**
| Repo | Why |
|---|---|
| `control_asistencia` | Hardcoded expired API key; names a vendor the case study omits. Author decision this session. |
| `TechTest-BackEnd` | Interview take-home, not representative project work; no description, easy to mistake for something else. |

**Archive** (read-only + badge, keeps history, signals "old learning exercise" without deleting anything)
| Repo | Why |
|---|---|
| `chain-of-responsability-design-pattern` | Single design-pattern class demo. |
| `DesktopAbstractFactoryExample` | Same. |
| `Initial_Graphic_Project` | Superseded by `MyFirstGameEngine` in the consolidated OpenTK story. |
| `OpenTK_Project` | Same. |
| `open_tk_unit` | Same. |
| `FirstNodeJSProject` | University coursework, no description, "First…" naming reads as tutorial. |
| `MyFirstChatbot` | Same category. |
| `Tarea_Topicos` | Literally named "homework" — clearest case for archiving. |
| `e-tickets_frontend` | University coursework frontend. |

**No action needed:** `mone-store`, `queue-saas`, `nuestras-finanzas` are already
private and are current personal/freelance work in progress — out of scope for
this audit.

## Open questions
- Whether/when to push this content repo (`portfolio`) publicly, and under
  what name — still open from intake.md C6, needed before the README's
  "portfolio" link can point anywhere real. Not urgent until TASK 5.
- The actual GitHub changes above (visibility, archive, rename) are the
  author's to make — nothing executed in this session.

## Next
TASK 5 (website) is still blocked pending the author's own execution of this
session's repo-audit recommendations being optional, not blocking — TASK 5's
real blockers were tasks 1–4, all now DONE. Otherwise, TASK 6 (hand-authored
diagrams) is the only other open backlog item, and it's explicitly "one at a
time, as needed," not urgent.

## Files changed
`resources/github/profile-README.md` — new, TASK 4 deliverable.
`TASKS.md` — TASK 4 status flipped to DONE.
`progress/2026-08-16-02-task4-github-readme.md` — this log.
