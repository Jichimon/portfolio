# CLAUDE.md — portfolio

Adapter. Project identity, layout, commands and pointers. **No rule bodies live here** — a rule stated twice is a rule that drifts (`G-10`). The rules load themselves from `.claude/rules/`.

## What this is

The content source of truth for a Senior Software Engineer portfolio, plus the harness that will build the site from it. Everything publishable is Markdown, bilingual (English + Spanish), sanitized.

**Author:** Luis Octavio Antelo Mansilla — backend engineer / solution architect, ~5 years, most recently Senior Software Engineer at NICE (through June 2026). Cochabamba, Bolivia (GMT-4, full overlap with US business hours). Open to remote, or hybrid/relocation depending on the role.

**Target roles:** Senior Software Engineer · Senior Backend Engineer · Solution Architect — remote, international, English-speaking.

**The thesis every page reinforces:**

> Connecting legacy critical systems to modern services in regulated environments.

Oracle EBS ↔ satellite integrations, on-premise core banking ↔ cloud microservices, legacy PHP ↔ .NET on AWS. Four employers, one recurring problem. That is the differentiator, and diluting it into generic "backend / distributed systems" positioning is the one framing mistake that costs the most.

## Layout

```text
CLAUDE.md              this file — pointers only
TASKS.md               the Work Item register · authoritative for work-item state
.claude/rules/         THE RULES · auto-loaded every session
.claude/agents/        role files          (step 8)
.claude/skills/        procedures          (step 9)
docs/harness/          architecture · contracts · procedures · metrics
docs/adr/              decisions — README.md is the mandatory entry point
docs/specs/            behavior specs, for feature and migration items
progress/              one log per work item · evaluations/ holds scorecards
evaluation-cases/                 executable eval cases
evidence/              runtime trace — hooks only, gitignored
resources/             FROZEN — published content, read-only input
scripts/               gate.mjs, the guards, and status-history.mjs (K2's corpus)
private/               NEVER COMMITTED
```

## Commands

| Command | What it protects |
|---|---|
| `node scripts/gate.mjs` | everything below, in one command. Run before declaring anything done |
| `node --test "scripts/guards/**/*.test.mjs"` | the guards themselves — a guard nobody tested is a guard nobody can trust |
| `./scripts/check-terms.sh` | confidentiality |

## Start here

1. **`TASKS.md`** — what to do next, in order.
2. **The newest file in `progress/`** — what the last session decided and why.
3. **`docs/harness/architecture.md`** — why the harness is shaped this way. Read once, then on demand.

## Where knowledge lives

| Looking for | Go to |
|---|---|
| A rule, or its id | `.claude/rules/` — already in your context |
| Why the harness is built this way | `docs/harness/architecture.md` |
| Contract shapes and what enforces them | `docs/harness/contracts.md` |
| What the runtime trace records, and what it deliberately does not | `docs/harness/evidence.md` |
| A past architectural decision | `docs/adr/README.md` **first**, then the ADR |
| Content conventions and diagram tags | `README.md` |
| What a past session decided | `progress/` |

## The boundary

Agents write to the working tree. Agents never write to git, `resources/`, `evidence/` or `private/`, and never delegate on an unapproved spec. Five hard rules, all enforced at rung 1: `.claude/rules/00-hard-rules.md`.

The human owns commits. That is what preserves the ability to see, in one diff, everything an agent did.
