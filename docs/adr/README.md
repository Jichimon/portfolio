# ADR index — mandatory entry point

**Read this before any ADR.** An ADR is almost never refuted wholesale; it is amended point by point. Consulting one without this index risks applying a decision a later point already overturned — which is a defect, not a style issue. Citing a refuted decision is itself a finding (`P-07`).

TASK 7 writes the founding set: site stack, hosting and deploy, i18n strategy, content pipeline, testing toolchain, publication. **6 of 6 accepted — TASK 7 closed 2026-08-19.**

## Level 1 — status of each ADR

**States:** `Current` · `Current-with-amendments` (still standing, some points amended — see level 2) · `Superseded by ADR-<NNN>` (refuted in full).

| ADR | Title | Date | Status |
|---|---|---|---|
| [ADR-001](ADR-001-site-stack.md) | Site stack — Astro, static output | 2026-08-19 | `Current` |
| [ADR-002](ADR-002-content-pipeline.md) | Content pipeline — frontmatter validation and diagram resolution | 2026-08-19 | `Current` |
| [ADR-003](ADR-003-i18n-strategy.md) | i18n strategy — unprefixed English, `/es/` Spanish | 2026-08-19 | `Current` |
| [ADR-004](ADR-004-hosting-deploy.md) | Hosting and deploy — Cloudflare Workers, static assets | 2026-08-19 | `Current` |
| [ADR-005](ADR-005-publication.md) | Publication — public GitHub remote, now, whole repository | 2026-08-19 | `Current` |
| [ADR-006](ADR-006-testing-toolchain.md) | Testing toolchain — `node:test`, Stryker (`tap-runner`), Playwright | 2026-08-19 | `Current` |

## Level 2 — amendments, point by point

An amended point does **not** invalidate the whole ADR — only that point.

| Verb | Meaning | Marked inline in the ADR? |
|---|---|---|
| ↪️ **Extended** | Still valid; another document expands it | No — the point stands as written |
| ✏️ **Amended** | Changed in part; its old form no longer applies | Yes |
| ⛔ **Refuted** | No longer in effect (the rest of the ADR stands) | Yes |
| 🔁 **Superseded** | The entire ADR was replaced | Yes |

| ADR · § | What the point said | Verb | Superseded by | Date |
|---|---|---|---|---|
| — | *none yet* | — | — | — |

## How to keep this alive

**Three parts, all load-bearing.** When amending or refuting a point: add the level-2 row (so the amendment is findable), adjust the level-1 status (so a reader knows to look), and add the **inline annotation at the exact paragraph** of the affected ADR (so someone reading it top to bottom cannot miss it).

The characteristic failure is doing the first and skipping the other two. That is why `P-07` requires re-reading after reconciling: *reconciling and checking you reconciled are different acts, and only the second produces evidence.*

At wrap-up, audit that no point refuted during the work was left unmarked.
