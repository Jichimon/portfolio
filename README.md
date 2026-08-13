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
:::diagram{id="otp-c4-container-after" type="c4-container"}
Caption shown under the image.
Spec: what the diagram must show.
:::
```

`type` values in use: `c4-context`, `c4-container`, `c4-component`, `sequence`,
`flow`, `table` (rendered comparison).

## Confidentiality glossary

Applied consistently across all files. Never reintroduce the left column.

| Internal | Public wording |
|---|---|
| BancoSol / AppSol | a regulated bank in Latin America / the mobile banking platform |
| BanTotal, BTServices, AppSolCore | the on-premise core banking system |
| api-util-auth, PartyAuthentication | identity gateway service / credentials service |
| Transmit Security, INCODE, SEGIP | a commercial identity provider, a liveness-detection vendor, the national identity registry |
| Twilio Verify / Twilio WhatsApp | a third-party OTP-as-a-service provider / a messaging provider |
| bsol-*, sqs-bsol-*, transfer-publish-consumer | (never named) |
| Absolute vendor contract costs | ratios only ("~70% reduction") |
| Exact record counts, exact user counts | orders of magnitude, unless already public |

**Never published:** database schemas of authentication or financial systems, table
and field names, encryption details, queue names, vendor contract pricing,
unreleased product roadmap.

## Index

| Slug | Type | Priority |
|---|---|---|
| `mobile-banking-platform` | Platform overview | Anchor page |
| `qr-collections-for-merchants` | Case study | 1 — strongest adoption metric |
| `otp-provider-decoupling` | Case study | 2 — strongest engineering judgment |
| `legacy-payment-data-migration` | Case study | 3 — strongest rigor / ownership |
| `multi-tenant-biometric-attendance` | Case study | 4 — strongest own diagrams |
