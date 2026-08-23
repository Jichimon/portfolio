# 2026-08-20 · Session 01 — Design brief for the site's screens

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS

## What was done

Produced `docs/design/claude-design-brief.md`, the input artifact for the design/UX work item `TASK 8` is required to generate. It carries the screen inventory, the visual direction, the stack constraints the design cannot violate, and the site's real copy — written to be pasted into Claude Design without any surrounding prompt.

`TASK 8`'s own deliverable — the new `TASK N` entries in `TASKS.md` — is **not** written yet. This session produced a prerequisite, not the item.

## Decisions

- **Editorial-technical direction, chosen by the author over two alternatives.** A swiss/engineering-document register (visible grid, mono, hairlines) and a terminal/dev-tool register (dark, mono, green accent) were both presented and rejected. The terminal look was rejected specifically as *the* most common developer-portfolio aesthetic — it would read as a template, against `ADR-001`'s stated goal of "no generated-site tells". This is expensive to revisit because everything downstream — the diagram visual language in `TASK 6`, the component set, the type scale — hangs off it.
- **All four optional screen groups are in scope:** case-studies index, platform anchor page, system states (bilingual 404 + language switcher open), and a component sheet. Desktop **and** mobile artboards for each. Mobile was not deferred because the 11 diagrams are wide `LR` flowcharts with long multi-line labels — how they behave at narrow width is the real layout risk, not a detail to settle in implementation.
- **Personality stays confined to About and stays typographic.** No photographs, no sport iconography, no personality graphics anywhere. About gets a different *treatment* (wider measure, more air at the close), never a different visual identity.
- **The design specifies the diagrams' visual language, rather than inheriting it.** `TASK 6` is blocked by `TASK 8`, and this is what that dependency is for. Stated as a deliverable in the brief instead of left open.
- **Dark mode is handed to the design as an explicit decision with its cost named**, not assumed. The 11 placeholder SVGs hardcode light fills; supporting dark multiplies `TASK 6`'s scope. The brief asks for a recommended position, not a toggle.
- **The brief is not duplicated into a separate paste-ready file.** Two copies of the same text drift (`G-10`'s reasoning). The header is repo context; the prompt runs from the `# Portfolio site — design brief` heading to the end, extracted on demand with `awk '/^# Portfolio site/{f=1} f'` — **by marker, not by line number** (`P-16`: the first version cited line 15 and broke the moment the header grew).

## Findings from validating against real state (P-04)

- **No case-studies index page exists, in content or in links.** All 9 slugs are linked directly; nothing anywhere points at `/case-studies`. A nav carrying "Case studies" needs a destination, so the index is a screen designed from scratch rather than one derived from content.
- **`mobile-banking-platform` is `type: platform` but lives under the `/case-studies/` URL space**, and is the parent of three of the four case studies via its `## Deep dives` section. It is not a peer. The index must express that hierarchy rather than showing five identical cards.
- **The block vocabulary is far narrower than assumed.** Across all nine content pages: zero tables, zero code blocks, zero blockquotes, zero images other than diagrams. The entire site is h2/h3, unordered bullets, one numbered list, `**bold**` lead-ins acting as h4s, single-word italics, inline links, and diagram figures. Designing components beyond that set would be designing for content that does not exist.
- **`outcome` is not always a number.** `otp-provider-decoupling` carries a long, qualified, honest outcome about a target never reached. A metadata treatment that truncates or assumes a short numeric value would defeat `INC-09`'s remedy.
- **The homepage's fourth metric bullet has no case study and no link.** A card or bullet treatment that assumes every metric is clickable would break on it.
- **`H-02` denies `sed` on `resources/**` even for reading**, because the guard classifies `sed` as write-capable. `grep` and the `Read` tool pass. Worth knowing before a session wastes turns on it.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["docs/design/claude-design-brief.md", "progress/2026-08-20-01-task8-design-brief.md"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 184 files"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs — exit 0, 13 steps green"] }
  scope:      { status: passed, evidence: ["one artifact: the design brief; TASK 8's backlog deliberately not started"] }
  loose_ends: { status: passed, evidence: ["Open questions below; TASK 8 remains IN PROGRESS in TASKS.md"] }
  tests:      { status: not_applicable, reason: "no executable surface changed" }
  mutation:   { status: not_applicable, reason: "no executable surface changed" }
  security:   { status: not_applicable, reason: "no boundary, guard or permission touched" }
  iterations: { status: passed, evidence: ["1", "brief written once; the four author answers arrived before drafting, so no rework"] }
```

## Open questions

- **Does the author's account have Claude Design's visual editing enabled?** If it does, the published Artifact allows click-to-select, a properties panel, inline text editing and Save-as-version. If it does not, the result is a view-and-export (PNG/PDF) preview and every refinement has to go back through the model in chat. Undetermined until the first canvas is published — check it on open, and record the answer here.
- **Does `TASK 8`'s backlog need the visual direction settled first?** Deliberately left open. The argument for waiting: implementation items sized against a design that does not exist are guesses (`P-09` — enumerate objects, not surfaces). The argument against: `TASK 6` and the `INC-03` visual-QA item can be written now.

## Next

**Start a new session for the design pass.** This one has spent its budget on the content inventory and deposited the result in the brief; the artboards are large (`otp-provider-decoupling` alone is 1,300 words plus three 17–36 KB SVGs) and want a clean budget. The brief is self-sufficient by construction (`P-08`) — a fresh session reads it and is equipped.

Run it in **two passes**, not one:

1. **Pass one — screens 1–4 only** (home, case-study detail using `otp-provider-decoupling`, case-studies index, platform anchor page), desktop and mobile. Append to the pasted brief: *"For this first pass, design only screens 1–4."* These four carry the direction; the rest are variations on what they establish.
2. **Pass two** — screens 5–9 (about, experience, contact, system states, component sheet), once type pairing, palette and the metadata treatment are settled.

Seventeen artboards in one shot risks seventeen mediocre screens instead of four good ones.

## Files changed

`docs/design/claude-design-brief.md` — new. The design brief; the prompt is the `# Portfolio site — design brief` heading onward, and a "How to run this" section carries the two-pass plan.
`progress/2026-08-20-01-task8-design-brief.md` — this log.
`TASKS.md` — TASK 8 status line moved to IN PROGRESS with a pointer to the brief.
