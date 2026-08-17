# TASKS

Backlog for the portfolio content system. Read `CLAUDE.md` first.

Status values: `TODO` · `IN PROGRESS` · `BLOCKED` · `DONE`
Update the status line when a task changes state, and log the session in `progress/`.

---

## TASK 0 — Case studies · `DONE`

5 slugs × 2 locales in `resources/case-studies/`. Sanitized. 4 `[NEEDS INPUT]`
markers outstanding, tracked in TASK 3.

---

## TASK 1 — Diagrams · `DONE`

Produce Mermaid source for every `:::diagram` tag declared in the case studies.
Output to `resources/diagrams/{id}.mmd`, one file per id. 11/11 exist.

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

**Known limitations**
- Mermaid's automatic layout (dagre) produced confusing edge routing on the branchier
  diagrams — sink nodes sharing a rank with unrelated terminal nodes, edges that read as
  passing through the wrong node, connectors that visually disappear behind subgraph
  boundaries. Several review rounds with the author narrowed this (`curve: linear`,
  explicit `direction`, nested subgraphs pairing each service with its own store) but
  never reached hand-authored quality. These 11 files are good enough to unblock this
  task and everything downstream — not the final visual asset. Replacement tracked in
  TASK 6.
- `otp-breakeven` uses `block-beta`, a Mermaid diagram type still marked "beta" —
  renderer support is less universal than `flowchart`. Same caveat, same fix path.

**Acceptance**
- [x] 11 `.mmd` files, all rendering without syntax errors *(per the author's manual
  checks in mermaid.live during review; not independently re-run against every file in
  its final form)*
- [x] `./scripts/check-terms.sh` passes
- [ ] Before/after pair visually comparable — not achieved to the author's satisfaction;
  see Known limitations above and TASK 6.

---

## TASK 2 — Site copy · `DONE`

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
- [x] No generic filler sentences
- [x] Every claim traceable to a case study, the CV, or the author directly
  (intake answers) — the last category came up mostly in `about.md`/
  `experience.md`, where facts existed nowhere else yet.
- [x] Locale parity — verified per file, most recently a full side-by-side
  read of `home.en/es.md`.
- [x] `./scripts/check-terms.sh` passes

---

## TASK 3 — Resolve `[NEEDS INPUT]` · `DONE`

All four markers resolved with the author, 2026-08-15. `grep -rn "NEEDS INPUT"
resources/` now returns nothing.

1. **`otp-provider-decoupling`** — the rollout never completed: the plan was
   approved and execution began, but the author left the bank before the OTP flow
   was actually cut over to the in-house service. There is no measured P95 or real
   monthly cost, and there will not be one. Reworded `Result` (both locales) and the
   frontmatter `outcome` to present the ~70% figure and the latency numbers as the
   plan's targets, not achieved outcomes — plus a closing note explaining why no
   measured numbers exist. This corrected an overstatement that had also leaked into
   `home.{en,es}.md` and `about.{en,es}.md` (both reworded in the same pass, since
   they cited the OTP result as a completed fact).
2. **`qr-collections-for-merchants`** — ~8 transactions/second through delegated
   collections, ~15% of delegates were not previous bank customers, reached with no
   formal marketing plan. Added as two new `Result` bullets, both locales.
3. **`multi-tenant-biometric-attendance`** — 14 tenants at handover, ~30% reduction
   in HR administrative workload. **Also surfaced a bigger correction while asking:**
   the case study described the isolation model as "database per tenant," but the
   real implementation was a single tenant-shared database for all 14 tenants, with
   a dedicated-per-tenant opt-in path designed but never built. Rewrote the
   "Database" section, the two related "What I would do differently" bullets, the
   `attendance-c4-container` diagram spec, and the two already-generated `.mmd`
   files (`attendance-c4-container.mmd`, `attendance-c4-component.mmd`) to match
   reality — both locales.

`Avícola Sofía` (the holding's real name, confirmed during this session) was added
to `private/glossary.md`. It stays named in `home`/`about`/`experience` per the
2026-08-15 employer-naming policy already in the glossary, and stays generic
("an agro-industrial holding") in the case study and diagrams, unchanged from
before.

---

## TASK 4 — GitHub profile README · `DONE`

`resources/github/profile-README.md` written, 2026-08-16. English only, per spec.

No live site to link yet (TASK 5 still blocked at the time, and this content
repo has no GitHub remote), so the README's call to action is email + LinkedIn
only — revisit once TASK 5 ships and there's a real portfolio URL.

Audited all 18 public repos on `github.com/Jichimon`. Recommend-only, per the
author — pin/archive/private recommendations and full rationale are in
`progress/2026-08-16-02-task4-github-readme.md`, not executed against GitHub
in this session. Two decisions made with the author during the audit:
`control_asistencia` → make private (hardcoded expired API key, names a
vendor the matching case study omits); the four overlapping OpenTK/graphics
repos → consolidate the public story around `MyFirstGameEngine`, archive the
other three.

---

## TASK 5 — Website · `BLOCKED` (by tasks 1–4)

Planned stack: Harness with agents. When it starts, `resources/` is read-only input.

---

## TASK 6 — Replace Mermaid diagrams with hand-authored assets · `TODO` (blocked by TASK 5)

The 11 `.mmd` files from TASK 1 are placeholders, not the final assets. Mermaid's
autolayout could not produce diagrams the author considers presentable — see TASK 1's
Known limitations. Once the site exists and a given diagram is actually needed on a
page, the author will hand-author its replacement (e.g. Structurizr or another
manually-laid-out tool), **one at a time, as needed — not as a batch.** Keep the
existing `id`s; only the asset behind `/diagrams/{id}.svg` changes, so nothing in the
case study markdown needs to change when a diagram is replaced.

**Acceptance**
- [ ] No blanket acceptance — closes incrementally, per id, as each is replaced.

---

## Deliberately out of scope

- **Demo / reconstruction projects.** A repo built in a hurry looks junior and
  contradicts the positioning. The case studies are the evidence.
- **Technical articles.** Later, derived from these case studies. Not now.
- **Agent workflows, spec pipelines, eval harnesses.** Premature. Revisit once the
  content is published and there is something worth automating.
