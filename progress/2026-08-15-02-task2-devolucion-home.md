# 2026-08-15 · Session 02 — TASK 2 devolución + home draft

**Task:** TASK 2 — Site copy
**Status after this session:** IN PROGRESS

## What was done

Read the author's completed `resources/site/intake.md` and delivered the Etapa 2
devolución: one real contradiction (title positioning), a handful of ambiguities,
and two GitHub due-diligence flags. The author resolved all of it across a short
back-and-forth. Applied the one fix that affected `home.md` (the stale `CLAUDE.md`
author line), then drafted `resources/site/home.en.md` and `home.es.md` — Etapa 3,
stopping there per the author's staged process.

## Decisions

- **Kept "Senior Software Engineer" at full weight in home's identity line;
  moved the role-flexibility signal to its own line instead of hedging the
  title itself.** Why: it's the author's real, current job title, and
  `CLAUDE.md`'s own target-role list already includes it — shrinking it would
  work against the page's own goal. Rejected: the author's initial instinct
  (title "more chico", as a secondary claim) — flagged directly as weakening
  positioning, per the author's own request to be told when that happens; the
  author agreed after seeing the reasoning.
- **Corrected `CLAUDE.md`'s author line** to "most recently ... at NICE ...
  open to remote or hybrid/relocation," dropping any "actively searching"
  language. Why: the author's own read — job-search status is too perishable
  for a portfolio — and `TASKS.md`'s actual requirement (timezone + remote
  availability) is satisfied by modality alone, no status needed. Rejected:
  stating an explicit search status.
- **`home.md` names only NICE; the other three employers stay generic**,
  matching the existing case-study wording. Why: re-checked what `home.md`
  actually needs (thesis, evidence, current role, contact) against what's
  still blocked in `private/banned-terms.txt` — none of the blocked names are
  required for this file. Rejected: waiting to draft home until
  `private/banned-terms.txt` is updated — unnecessary; that update is only
  needed for `about.md`/`experience.md`.
- **Site pages get a minimal frontmatter** (`slug`, `lang`, `type: page`,
  `title`, `confidentiality`) rather than the full case-study schema from
  `CLAUDE.md` §4. Why: fields like `role`, `period`, `stack[]` describe a
  project, not a page — forcing them onto `home.md` would mean empty/N-A
  values. Rejected: reusing the case-study schema verbatim for consistency's
  sake alone.
- **The EU/US data-protection detail from the intake got re-attributed to
  NICE, not the bank**, and will be framed as operational awareness from a
  globally-distributed platform's customer base, not a formal compliance
  credential — matches what the author actually described, avoids overclaiming.

## Open questions

- ~~The `private/banned-terms.txt` / `private/glossary.md` diff proposed
  earlier this session is still awaiting the author's go-ahead.~~ **Resolved
  later in this same session** — author approved, diff applied (see Files
  changed). `./scripts/check-terms.sh` now passes clean at the repo level,
  including `resources/site/intake.md`. `about.md`/`experience.md` are no
  longer blocked on this.
- GitHub due diligence from the previous session (the bank-related repo, the
  hardcoded API key in `control_asistencia`) is still unresolved — on the
  author's side, not blocking further TASK 2 writing.
- The author asked whether `about.md`/`experience.md`/`contact.md` are part of
  TASK 2 — confirmed yes, per `TASKS.md`'s own scope (8 files total). Still
  waiting on explicit sign-off on `home.md`'s content itself (only the
  banned-terms mechanics were confirmed so far) before starting them, since
  the original plan for TASK 2 has home set the tone for the rest.

## Next

Get the author's explicit read on `home.en.md`/`home.es.md` (not just the
terms-list fix) before drafting `about.md`, `experience.md` and `contact.md` —
per the author's own process, home was meant to set the tone first.

## Files changed

`CLAUDE.md` — author line corrected (no longer says "currently at NICE").
`resources/site/home.en.md` — new; Etapa 3 draft.
`resources/site/home.es.md` — new; Etapa 3 draft.
`TASKS.md` — TASK 2 status note updated to reflect home drafted.
`private/banned-terms.txt` — removed the bank's short name and the two
pre-bank employers' names (employer identity no longer redacted; internal
system/product names untouched).
`private/glossary.md` — matching removal from the mapping table, plus a dated
note under "Judgement call" explaining why.
`progress/2026-08-15-02-task2-devolucion-home.md` — this log.
