# 2026-08-14 · Session 01 — TASK 1: 11 diagrams as Mermaid source

**Task:** TASK 1 — Diagrams
**Status after this session:** DONE (with a known limitation carried into new TASK 6)

## What was done

Produced all 11 `.mmd` files in `resources/diagrams/`. Planned in two stages as the
author asked: a table of Mermaid-type decisions + a label convention first, then
generation starting with the `otp-c4-before`/`otp-c4-after` pair (chosen to set the
visual standard), then the remaining 9 once that pair was approved. `otp-c4-before`
and `otp-c4-after` went through three review rounds — a real production reference the
author shared (an internal ADR and two architecture screenshots, both containing real
vendor/service/table names and costs) surfaced a missing edge, a wrong shape (cylinder
used for a queue instead of a store), and two rounds of Mermaid autolayout producing
confusing edge routing. `platform-auth-boundary` got one more correction after
generation: the "credentials store" was wrong — the low-volume path is a service
(Identity Gateway, the BIAN vendor-adapter), not a database. `check-terms.sh` was run
after every batch and stayed clean throughout.

## Decisions

- **Flowchart-styled-as-C4 instead of Mermaid's native `C4Context`/`C4Container`
  syntax, for all 8 `c4-*` ids.** Confirmed with the author before generating anything.
  Native C4 is layout-uncontrollable (pure dagre autolayout, no manual positioning)
  and has weaker renderer support (e.g. GitHub does not render it) — both directly
  worked against the requirement that `otp-c4-before`/`after` be visually comparable.
  Cost: not semantically "real" C4, just C4-styled boxes.
- **`otp-breakeven` as a Mermaid `block-beta` grid, not a data-driven chart.** The spec
  asked for a log-scale cost curve; Mermaid's `xychart-beta` has no log axis and no way
  to mark a point on a curve, and the only real cost figures available are banned from
  publication (glossary: vendor costs are ratios-only). A chart with invented-looking
  precision would have been worse than an honest qualitative grid. Cost, flagged to the
  author but not separately resolved: `block-beta` is itself a "beta" Mermaid feature,
  same compatibility risk class as the native C4 syntax that was rejected for the same
  reason elsewhere in this task.
- **`qr-permission-model` kept as `type="flow"`** (two parallel subgraphs, Owner vs.
  Delegate, allow/deny-colored nodes) rather than reclassified to `type="table"`. The
  spec literally describes a matrix, but Mermaid has no native grid-table diagram type,
  and this approximation stayed inside the declared type without the author asking for
  a change to `TASKS.md`'s table.
- **Simplified the real `attendance-*` topology rather than reproducing it.** The
  author's screenshots show three distinct real systems on the HR-integration side and
  a separate iOS/Android split; the published case study text only ever says "the
  third-party HR system" and "mobile app," singular. Collapsed to match what the prose
  already supports, rather than add real, identifiable complexity the narrative doesn't
  explain. Flagged to the author as reversible if they want the fuller picture shown.
- **Closed TASK 1 with the layout problem unresolved, on the author's explicit call.**
  Three review rounds fixed specific bugs (missing edges, wrong shapes, some crossing)
  but never reached diagrams the author considers presentable — Mermaid's dagre
  autolayout has no manual positioning, which is the actual gap, not a syntax mistake
  fixable with more iteration. The author decided the 11 files are good enough to
  unblock downstream work now, and opened TASK 6 to hand-author real replacements
  later, one at a time, once the site exists and each diagram is actually needed on a
  page. Recorded as a known limitation in TASK 1 rather than pretending the acceptance
  checklist's "visually comparable" line was met.

## Open questions

None blocking. Two items the author may want to revisit later, not urgent:
- Whether to show the fuller real topology on `qr-permission-model`'s sibling
  `attendance-*` diagrams and `platform-auth-boundary`-adjacent systems, or keep the
  current simplification (see Decisions above).
- `otp-breakeven`'s `block-beta` compatibility risk — no action needed unless the
  eventual site build's Mermaid renderer turns out not to support it, at which point
  TASK 6 covers the replacement anyway.

## Next

TASK 6 is intentionally not "next" — it is blocked by TASK 5 (the website) and closes
incrementally, per diagram, on the author's own schedule. The actual next open item in
the backlog is TASK 2 (site copy) or TASK 3 (the `[NEEDS INPUT]` markers, author-only).

## Files changed

`resources/diagrams/*.mmd` — 11 new files (TASK 1's full deliverable).
`TASKS.md` — TASK 1 marked `DONE` with a Known Limitations section and an honest
acceptance checklist (one item left unchecked, referenced forward); added TASK 6.
`private/glossary.md`, `private/banned-terms.txt` — read only, not modified; the
banned-terms list already covered nearly every real term surfaced by the reference
material the author shared this session, which is why `check-terms.sh` stayed green
throughout without needing new entries.
