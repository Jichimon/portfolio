# 2026-08-13 · Session 01 — README sanitization and diagram id naming rule

**Task:** Setup — repository hygiene. No numbered task changed state.
**Status after this session:** DONE

## What was done

Removed the confidentiality glossary table and the "Never published" paragraph from
the root `README.md`; that content lives in `private/glossary.md` and was being
published verbatim by the one file most likely to be read first. Renamed the three
diagram ids in the biometric attendance case study to `attendance-c4-{context,
container,component}` after the terms check flagged them, and wrote the naming rule
that prevents a repeat into `CLAUDE.md` §4. `./scripts/check-terms.sh` now exits 0.

## Decisions

- **Renamed the flagged diagram ids instead of adding an exception to
  `private/banned-terms.txt`** — the check was right and the content was wrong. The
  id is not an internal label: the site build resolves it to `/diagrams/{id}.svg`, so
  it ships as a public URL, which is exactly the kind of place a leaked name survives
  longest and is hardest to retract. An exception would also have cost more than the
  rename over time: the banned-terms list is only useful while it can be read as an
  unconditional statement of what must never appear, and every carve-out turns a
  mechanical check into a judgement call for whoever runs it next. The rename's real
  cost, stated: it required editing published-content files under a narrow authorized
  exception, and any external reference to the old ids breaks — acceptable only
  because no diagram assets exist yet (TASK 1 is unstarted).
- **`README.md` points to `CLAUDE.md` §3.1 rather than restating the rules** — the
  duplication is how the leak happened. One binding source, referenced from
  elsewhere.

## Open questions

None outstanding.

- *(Raised and resolved in this session.)* The `:::diagram` example in `README.md`
  used an id that no case study declares, while `CLAUDE.md` and the TASK 1 table used
  the real one. The README is a spec, so the example now matches the declared id.

## Next

TASK 1 — the 11 `.mmd` files. Its acceptance list includes a passing terms check,
which was failing before today for a reason unrelated to the diagrams themselves;
that blocker is gone, and the id table in `TASKS.md` is now accurate to the source
files, so the task can be picked up as written.

## Files changed

`README.md` — removed the glossary table and "Never published" section; left the repo
description, conventions, `:::diagram` spec and case-study index. Corrected the id in
the `:::diagram` example to the one actually declared.
`resources/case-studies/multi-tenant-biometric-attendance.en.md` — three `id=`
attributes only.
`resources/case-studies/multi-tenant-biometric-attendance.es.md` — same, locale parity.
`TASKS.md` — TASK 1 id table and the redraw rule updated to the new ids.
`CLAUDE.md` — added the diagram id naming rule to §4.
