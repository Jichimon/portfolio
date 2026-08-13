# CLAUDE.md — Portfolio Content System

Persistent context. Read before any task.

**Companion files — read the relevant one before starting work:**
- `TASKS.md` — the backlog. What to do next, in order.
- `progress/` — session logs. Read the most recent before resuming work.
- `private/glossary.md` — confidentiality mapping. **Binding.** Never committed.

---

## 1. What this repository is

The **content source of truth** for a Senior Software Engineer portfolio site.
It is not the website. The website is a later, separate concern.

Everything here is Markdown, bilingual (English + Spanish), sanitized for
publication. The site build (planned: Harness + agents) will consume these files.

**Author:** Luis Octavio Antelo Mansilla — backend engineer / solution architect,
~5 years, currently at NICE, based in Cochabamba, Bolivia (GMT-4, full overlap with
US business hours).

**Professional thesis — the single idea every page must reinforce:**

> Connecting legacy critical systems to modern services in regulated environments.

Oracle EBS ↔ satellite integrations, on-premise core banking ↔ cloud microservices,
legacy PHP ↔ .NET on AWS. Four employers, one recurring problem. This is the
differentiator. Do not dilute it into generic "backend / distributed systems"
positioning.

**Target roles:** Senior Software Engineer, Senior Backend Engineer, Solution
Architect — remote, international, English-speaking.

---

## 2. Repository layout

```
/
├── CLAUDE.md                    ← this file
├── TASKS.md                     ← backlog
├── .gitignore
├── progress/                    ← one log per session
│   └── README.md                ← logging convention + template
├── private/                     ← NEVER COMMITTED
│   ├── glossary.md              ← real name → public wording mapping
│   └── banned-terms.txt         ← input for the pre-publish check
├── scripts/
│   └── check-terms.sh           ← greps publishable content for leaks
└── resources/
    ├── case-studies/            ← DONE (10 files, 5 slugs × 2 locales)
    ├── diagrams/                ← TASK 1
    ├── site/                    ← TASK 2
    └── github/                  ← TASK 4
```

---

## 3. Non-negotiable rules

### 3.1 Confidentiality

Most of this experience comes from a regulated bank. `private/glossary.md` is
binding. Never write the left column of that table into any file outside `private/`.

**Never publish, in any file, under any framing:**

- Database schemas, table names or field names of authentication or financial systems
- Encryption details, queue names, internal service names, repository names
- Vendor contract pricing in absolute terms (ratios and percentages are fine)
- Named security vendors (identity providers, liveness detection, fraud tooling)
- Unreleased product roadmap or internal business strategy
- Personal contact details of third parties (references, colleagues)

If a task would require breaking one of these to be useful, **stop and say so**
rather than finding a workaround. Confidentiality is a design constraint of this
portfolio, not an obstacle to route around.

Run `./scripts/check-terms.sh` before declaring any content task complete.

### 3.2 Never invent facts

No fabricated metrics, dates, team sizes, volumes or outcomes. If a number is
needed and not available, write:

```
[NEEDS INPUT] <specific question>. Why it matters: <one line>.
```

Do not fill gaps with plausible estimates. A missing number is fine; a wrong one is
disqualifying in an interview.

### 3.3 Content principles

- **Evidence over adjectives.** No "passionate about technology", "results-driven",
  "problem solver". Show decisions, trade-offs, constraints and outcomes instead.
- **Trade-offs are always stated in both directions.** Every decision costs
  something. Naming the cost is the seniority signal.
- **Every case study ends with "What I would do differently"** and it must contain
  a real, specific, self-critical item — not a humblebrag.
- **English at B2–C1 register.** Plain and direct. Flat technical English reads more
  senior than ornate English. Simple past for completed work, consistently.
- **Locale parity is a hard rule.** Never modify one locale without modifying the
  other in the same change. The Spanish is not a translation artifact — it is
  first-class content and should read as natively written.

### 3.4 Scope discipline

Limited time. Prefer three excellent artifacts over ten adequate ones. Say so if a
request would dilute quality. **Do not start building the website** until the
content backlog is closed.

---

## 4. File conventions

**Naming:** `slug.{en|es}.md`. Both locales share the same `slug` in frontmatter —
that is the i18n join key.

**Frontmatter:** existing case studies define the schema. Keep it consistent:
`slug`, `lang`, `type`, `title`, `subtitle`, `role`, `context`, `period`,
`outcome`, `stack[]`, `skills[]`, `featured`, `confidentiality`.

**Diagram tags:** declared inline; the site build resolves `id` to
`/diagrams/{id}.svg`.

```
:::diagram{id="otp-c4-after" type="c4-container"}
Caption shown under the image.
Spec: what the diagram must show.
:::
```

`type` values in use: `c4-context`, `c4-container`, `c4-component`, `sequence`,
`flow`, `table`. Both locales declare the same `id` — one asset serves both
languages; only caption and spec text differ.

---

## 5. Working style

- Read `TASKS.md` and the latest file in `progress/` before starting.
- Ask before assuming a fact about the author's experience.
- When several approaches are valid, present the trade-off and recommend one.
- Push back explicitly when a request would weaken the portfolio.
- Prefer editing existing files over creating new ones.
- **Every session ends by writing a log to `progress/`.** See `progress/README.md`.
