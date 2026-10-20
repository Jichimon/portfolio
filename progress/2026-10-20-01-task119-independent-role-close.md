# 2026-10-20 · Session 01 — TASK 119: the application verified, the artboards caught up

**Task:** TASK 119 — Independent role and hero thesis
**Status after this session:** DONE — `node scripts/gate.mjs --profile full` GATE PASSED, 22 of 22, over the final tree; the register entry is closed and the commit is the author's.

## What was done

- **Verified the author's application of the packet** (`resources/**` is his under `H-02`): the fifth role sits first in `roles[]` in both locales, with the project names left out of the bullets (his call — the systems are described, the names are not relevant to a visitor), `C#` added to the stack, and the thesis kept as it stands (candidate A — `home.{en,es}.md` needed no edit).
- **The four artboards that carry employer entries gained the fifth one**: the card in `Main.dc.html` (no logo slot — the designed fallback, not a gap), the Spanish card through a new `derive.mjs` substitution entry (`HomeES`), the phone frame through the mirror regeneration (`HomeMobile`), and the first entry with the "most recent" badge moved onto it in `Experience.dc.html`. `derive.mjs` rewrote both derived files — 58 substitutions, 0 leftovers — and `verify.mjs` passes whole.
- **Cleaned the working records on the author's instruction**: the competitor's name and the queue product's repository name are out of the register entry, the 2026-10-19 session log and the author packet. The packet now records the application rather than carrying the draft. The exact strings for the pending edits travelled in the session's closing message only, so no name the author removed from the site re-entered the repository through its own records.
- **The author applied the three verified lines** (English queue-bullet parity, and the scoped real-estate bullet in both locales), created the work branch, and confirmed the branch protection live — read back from the provider: PR required, admins included, check `gate` required. The full gate then ran over the final tree and TASK 119 closed. **TASK 121 and TASK 122 — the hero call to action and the visit counter the author approved in this cycle's plan — are opened in the register so the next sessions inherit them as work items, not as a conversation** (`P-06`).

## Findings from validating against real state (P-04)

- **The English queue bullet still carries a phrase the Spanish one dropped.** Comparing the two applied files line by line found the parity gap (`C-09`): the author removed the competitor mention from the Spanish bullet and left it in the English one. The correction is a one-line edit, his, quoted in the closing message.
- **The real estate bullet describes a build that has not started.** The author confirmed the engagement has no code yet — the bullet must say what is scoped, not what is being built (`C-02`). Also a one-line edit, his, both locales, quoted in the closing message.
- **The logo-less card assertions ran for real for the first time.** `e2e smoke` moved from 99 passed + 4 skipped to **103 passed + 0 skipped**: the four `withoutLogo` tests that had been iterating zero roles since they were written got a real role to chew, and passed.
- **Everything else moved by itself.** Five cards per home in declared order, each deep-linking to its own anchor; the anchor deriving from the company name without collision; the badge on the first entry; no card overflowing its cell at any of the three widths — zero edits under `site/`, which is the acceptance criterion this item was opened on.

## Decisions

- **The two pending edit strings live in the closing message, not in committed files** — the author asked for the competitor's and any non-relevant names out of the records; quoting them in a committed packet would put them right back.
- **The artboard entries mirror the applied content**, including the name-less bullets and no competitor mention — the canvas is downstream of the content, and it shows no name the site does not show.

## Done

```yaml
done:
  content:    { status: passed, evidence: ["experience.{en,es}.md carry the fifth role: the author's application plus the three verified lines — the EN queue bullet's parity with its ES twin, and the scoped real-estate bullet in both locales"] }
  tests:      { status: passed, evidence: ["node scripts/gate.mjs --profile full — GATE PASSED, 22/22 over the final tree", "e2e smoke 103 passed 0 skipped — the four logo-less card assertions ran for real and passed", "node docs/design/canvas/verify.mjs — PASS; derive.mjs — 58 substitutions, 0 leftovers"] }
  mutation:   { status: passed, evidence: ["full-profile mutation PASS; nothing under the mutated core changed, incremental over unchanged surfaces"] }
  docs:       { status: passed, evidence: ["TASKS.md — TASK 119 closed with the close paragraph; TASK 121 and TASK 122 opened; the working records carry no competitor or product name"] }
  scope:      { status: passed, evidence: ["the four artboards carry the fifth employer entry, HomeES/HomeMobile regenerated by the tool; zero edits under site/"] }
  ci:         { status: not_applicable, reason: "H-01 — nothing pushed this session; the PR run is the author's merge step, against branch protection verified live from the provider" }
  security:   { status: not_applicable, reason: "content and design-canvas files only; no site code, no input surface" }
  loose_ends: { status: passed, evidence: ["none open — the hero CTA and the visit counter are opened as TASK 121 and TASK 122 rather than left in prose"] }
  iterations:      { status: passed, evidence: ["3"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1", "verify=2"] }
```

## Open questions

- None. The item is closed; what remains is the author's git half.

## Next

The author commits on `task/119-independent-role`, pushes, opens the PR — the gate runs on the PR under the new branch protection — and merges. The deploy runs on merge and nothing else.

## Files changed

- `docs/design/canvas/src/Main.dc.html` — the fifth employer card, first in the row, no logo slot.
- `docs/design/canvas/derive.mjs` — the Spanish substitution entry for the new card.
- `docs/design/canvas/src/HomeES.dc.html`, `HomeMobile.dc.html` — regenerated from the source, by the tool.
- `docs/design/canvas/src/Experience.dc.html` — the fifth entry first, the "most recent" badge moved onto it.
- `TASKS.md` — TASK 119 closed; TASK 121 and TASK 122 opened; the competitor's name out of the TASK 119 entry.
- `progress/2026-10-19-01-task119-independent-role.md` — the queue product's repository name out; the remaining author calls handed to this session.
- `progress/handoff/2026-10-19-task119-content.md` — the packet now records the application and the remaining lines.
- `progress/2026-10-20-01-task119-independent-role-close.md` — this log.