# Content conventions

The rules for `resources/**` — the content source of truth for the site. Moved here from
`README.md` on 2026-09-01 (`TASK 101`), when the root README became the repository's public
front page and stopped being the right place for a contributor-facing convention doc.

## Conventions

- One file per case study per locale: `slug.en.md` / `slug.es.md`.
- Both locales share the same `slug` in frontmatter — that is the i18n join key.
- Never edit one locale without editing the other. Content parity is a hard rule (`C-09`).
- `[NEEDS INPUT]` marks a factual gap. Do not publish a file that still contains one (`C-01`).

## Diagram tags

Diagrams are declared inline with a directive block. The site build resolves `id`
to `/diagrams/{id}.svg`. The body of the block is a spec for whoever draws it.

```
:::diagram{id="otp-c4-after" type="c4-container"}
Caption shown under the image.
Spec: what the diagram must show.
:::
```

`type` values in use: `c4-context`, `c4-container`, `c4-component`, `sequence`,
`flow`, `table` (rendered comparison).

## Confidentiality

Confidentiality rules for this content are binding and documented in
`.claude/rules/20-content.md` (`C-05`, `C-06`). Run `node scripts/guards/gate/check-terms.mjs`
before publishing anything — or `node scripts/gate.mjs`, which runs it as one of its steps. (The confidentiality step is `fast`-tier, so the bare command runs it; a count is deliberately not written here, because a number about a growing thing goes stale on its own.)

## Index

| Slug | Type | Priority |
|---|---|---|
| `mobile-banking-platform` | Platform overview | Anchor page |
| `qr-collections-for-merchants` | Case study | 1 — strongest adoption metric |
| `otp-provider-decoupling` | Case study | 2 — strongest engineering judgment |
| `legacy-payment-data-migration` | Case study | 3 — strongest rigor / ownership |
| `multi-tenant-biometric-attendance` | Case study | 4 — strongest own diagrams |
