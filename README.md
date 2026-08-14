# Portfolio — Case Studies (source of truth)

Sanitized, bilingual case studies. This directory is the content source for the future site.

## Conventions

- One file per case study per locale: `slug.en.md` / `slug.es.md`.
- Both locales share the same `slug` in frontmatter — that is the i18n join key.
- Never edit one locale without editing the other. Content parity is a hard rule.
- `[NEEDS INPUT]` marks a factual gap. Do not publish a file that still contains one.

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

Confidentiality rules for this content are binding and documented in `CLAUDE.md`
§3.1. Run `./scripts/check-terms.sh` before publishing anything.

## Index

| Slug | Type | Priority |
|---|---|---|
| `mobile-banking-platform` | Platform overview | Anchor page |
| `qr-collections-for-merchants` | Case study | 1 — strongest adoption metric |
| `otp-provider-decoupling` | Case study | 2 — strongest engineering judgment |
| `legacy-payment-data-migration` | Case study | 3 — strongest rigor / ownership |
| `multi-tenant-biometric-attendance` | Case study | 4 — strongest own diagrams |
