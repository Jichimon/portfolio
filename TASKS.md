# TASKS

Backlog for the portfolio content system. Read `CLAUDE.md` first.

Status values: `TODO` · `IN PROGRESS` · `BLOCKED` · `DONE`
Update the status line when a task changes state, and log the session in `progress/`.

---

## TASK 0 — Case studies · `DONE`

5 slugs × 2 locales in `resources/case-studies/`. Sanitized. 4 `[NEEDS INPUT]`
markers outstanding, tracked in TASK 3.

---

## TASK 1 — Diagrams · `TODO`

Produce Mermaid source for every `:::diagram` tag declared in the case studies.
Output to `resources/diagrams/{id}.mmd`, one file per id.

| id | type | Source file |
|---|---|---|
| `platform-c4-context` | c4-context | mobile-banking-platform |
| `platform-auth-boundary` | c4-container | mobile-banking-platform |
| `qr-c4-container` | c4-container | qr-collections-for-merchants |
| `qr-permission-model` | flow | qr-collections-for-merchants |
| `otp-c4-before` | c4-container | otp-provider-decoupling |
| `otp-c4-after` | c4-container | otp-provider-decoupling |
| `otp-breakeven` | table | otp-provider-decoupling |
| `migration-phases` | flow | legacy-payment-data-migration |
| `attendance-c4-context` | c4-context | multi-tenant-biometric-attendance |
| `attendance-c4-container` | c4-container | multi-tenant-biometric-attendance |
| `attendance-c4-component` | c4-component | multi-tenant-biometric-attendance |

**Rules**
- The spec inside each `:::diagram` block is the requirement. Follow it.
- Labels are subject to the same confidentiality glossary as prose.
- Language-neutral labels where possible, so one asset serves both locales.
- `otp-c4-before` / `otp-c4-after` must use identical layout for side-by-side
  comparison.
- `otp-breakeven` is a cost-vs-volume chart, not C4. If Mermaid can't express it
  well, say so and propose an alternative rather than shipping something weak.
- The three `attendance-*` diagrams exist as PNGs from the original project. **Redraw
  sanitized** — vendor and company names removed. Do not reuse as-is.

**Acceptance**
- [ ] 11 `.mmd` files, all rendering without syntax errors
- [ ] `./scripts/check-terms.sh` passes
- [ ] Before/after pair visually comparable

---

## TASK 2 — Site copy · `TODO`

Create `resources/site/`, both locales for each file.

**`home.{en|es}.md`** — must answer in under 30 seconds: who is this, what does he
build, what systems, why trust him, where is the evidence, how to contact him. Lead
with the professional thesis. Include timezone and remote availability in the first
screen — an international hiring manager needs that immediately.

**`about.{en|es}.md`** — the narrative version of the thesis. The four-employer
through-line is the story. Currently studying Ingeniería Informática at UAGRM:
include, do not lead with it.

**`experience.{en|es}.md`** — condensed history that links out to case studies
rather than repeating them. Must not duplicate the CV.

**`contact.{en|es}.md`** — email, GitHub, LinkedIn. **No phone number. No references
section** — the CV's reference block contains third parties' personal phone numbers
and must never reach a public site.

**Acceptance**
- [ ] No generic filler sentences
- [ ] Every claim traceable to a case study or the CV
- [ ] Locale parity
- [ ] `./scripts/check-terms.sh` passes

---

## TASK 3 — Resolve `[NEEDS INPUT]` · `BLOCKED` (needs author)

Four markers block publication. `grep -rn "NEEDS INPUT" resources/`.
No agent can resolve these. When an answer arrives, update **both** locales and
delete the marker.

Highest value first:

1. **`otp-provider-decoupling`** — measured post-rollout P95 and actual monthly
   cost. Also confirm whether the rollout executed at all: the file is written as an
   approved decision with targets, and needs rewording if it shipped. Highest-value
   gap in the whole portfolio.
2. **`qr-collections-for-merchants`** — transaction volume, and share of delegates
   who were not previously bank customers. The 100k user figure alone reads as a
   vanity metric without one of these.
3. **`multi-tenant-biometric-attendance`** — tenant count at handover.

---

## TASK 4 — GitHub profile README · `TODO`

`resources/github/profile-README.md`. English only.

Often the first thing a technical interviewer opens. Same thesis, three-line
version, linking to the portfolio. Also audit the existing public repos and
recommend which to pin, archive or make private — a stale tutorial repo actively
undercuts senior positioning.

---

## TASK 5 — Website · `BLOCKED` (by tasks 1–4)

Planned stack: Harness with agents. When it starts, `resources/` is read-only input.

---

## Deliberately out of scope

- **Demo / reconstruction projects.** A repo built in a hurry looks junior and
  contradicts the positioning. The case studies are the evidence.
- **Technical articles.** Later, derived from these case studies. Not now.
- **Agent workflows, spec pipelines, eval harnesses.** Premature. Revisit once the
  content is published and there is something worth automating.
