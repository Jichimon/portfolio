# 2026-08-19 · Session 04 — TASK 7, decision 1: Site stack (ADR-001)

**Task:** TASK 7 — Founding ADRs (decision 1 of 6)
**Status after this session:** TASK 7 `IN PROGRESS`, 1/6 accepted. ADR-001 `Accepted`.

## What was done

One `researcher` pass scoped to decision 1 (generator/framework, rendering model, backend-needed-or-not), then a second scoped follow-up after the author asked whether Astro forces a choice between plain HTML/CSS/JS and React. Wrote `docs/adr/ADR-001-site-stack.md` from both reports, presented at checkpoint, author approved after the follow-up was folded in. Updated `docs/adr/README.md`'s level-1 table and `TASKS.md`'s TASK 7 entry.

## Decisions

- **We choose: Astro, static output.** Only surviving candidate (of Astro/Eleventy/Hugo/SvelteKit) with no functional gap against the frozen content's actual `:::diagram{id="..." type="..."}` directive syntax — confirmed `remark-directive` parses it directly. Rejected primarily: Hugo (fastest and simplest to operate, but no native mechanism parses the directive — its render hooks cover 7 fixed element types, none a generic attributed container).
- **No backend needed anywhere in current scope** — folded into this decision per TASK 7's own framing. `contact.md` has no submission handler by design, no user accounts, content edited by hand between sessions. Static output settles it.
- **React and plain HTML/CSS/JS are not exclusive** — added as an explicit addendum to ADR-001 after the author's follow-up question, sourced directly from Astro's own docs (islands, `client:*` directives, official framework integrations, native View Transitions). Which specific UI gets a framework island is deferred to TASK 8 (site work breakdown) — a design decision, not a stack decision.
- **Eliminated:** Next.js (i18n and static export are mutually exclusive per Next's own docs), Jekyll (directive syntax mismatch + a second language toolchain), Zola (no plugin system at all, so the directive can't be parsed in-framework), VitePress/Docusaurus (both read as documentation sites by default, not portfolios — a named judgment call).

## Findings from validating against real state (P-04)

- Confirmed directly from `resources/`, not from the brief: frontmatter's 5 universal + type-dependent keys, and the exact `:::diagram{...}` directive syntax at `mobile-banking-platform.en.md:41-46`.
- `contact.en.md` read directly to confirm no form/submission handler exists — grounds the "no backend needed" finding in repository data (D1), not inference.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["docs/adr/ADR-001-site-stack.md, Accepted", "docs/adr/README.md level-1 table updated", "TASKS.md TASK 7 entry updated"] }
  content:    { status: not_applicable, reason: "no resources/ writes in this item" }
  iterations: { status: passed, evidence: ["1"] }
```

One implement→verify cycle to acceptance: the ADR draft plus one author-requested addendum (component authoring / React question), folded in before a single approval — no rejection round.

## Open questions

None for this decision. Five remain for TASK 7 (decisions 2–6).

## Next

TASK 7 decision 2: content pipeline.

## Files changed

`docs/adr/ADR-001-site-stack.md` — new, `Accepted`.
`docs/adr/README.md` — level-1 table, ADR-001 row.
`TASKS.md` — TASK 7 → `IN PROGRESS`, decision 1 marked resolved.
`progress/2026-08-19-04-task7-adr001-site-stack.md` — this file, new.
