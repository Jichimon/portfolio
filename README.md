# Luis Octavio Antelo Mansilla — Portfolio

A Senior Software Engineer portfolio: bilingual, sanitized case studies, built by an Astro
site, developed under an agent harness whose guards are enforced rather than asserted.

> Connecting legacy critical systems to modern services in regulated environments.

Oracle EBS ↔ satellite integrations, on-premise core banking ↔ cloud microservices, legacy
PHP ↔ .NET on AWS. Four employers, one recurring problem — that thesis is the differentiator
every page in `resources/` is written to reinforce.

## What's public here, and why

Two things live in this repository, deliberately shown together:

1. **The content** — `resources/**`, rendered by the Astro site in `site/`. The case studies.
2. **The harness that built it** — the rules, the guards, the gate, the decision trail in
   `docs/adr/` and `progress/`.

The second is not a second thesis bolted onto the first. It is evidence for the same one:
the discipline the case studies claim — spec-first work, boundaries that are enforced instead
of asserted, honest scoping of what a control does and does not cover — applied here, where a
reader can audit it directly instead of taking the case studies' word for it.

## Layout

```text
CLAUDE.md          project identity, layout, commands and pointers — start here
TASKS.md           the work-item register, authoritative for what is done and what is not
.claude/rules/      the rule registry — six files, one id space, every rule has an origin
docs/adr/           accepted architectural decisions — docs/adr/README.md is the index
docs/harness/       why the harness is shaped this way, and what it does and does not enforce
resources/          the content source of truth — case studies, bilingual, sanitized
site/               the Astro project that builds resources/ into pages
scripts/gate.mjs     the one command that runs every guard
```

## The harness, briefly

- **A rule registry**, not a style guide: six files under `.claude/rules/`, one id space
  across them, and every rule names its origin — an incident, a decided design, or existing
  practice. A rule with no origin is deleted rather than kept.
- **Five hard rules**, enforced at the level a permission engine cannot be talked out of: a
  `deny` rule or a `PreToolUse` guard denial, never a prompt an agent could be argued past.
  Among them — no agent commits or pushes to git, `resources/**` is read-only to every agent,
  and the runtime trace is written by hooks only, never by the thing it is scoring.
- **One gate, twenty-two steps, two profiles** (`node scripts/gate.mjs`) — type checking,
  three test tiers, a mutation-coverage floor, and seventeen structural guards over the
  rules, the content, the agent roster and the CI workflow itself. Every step names the
  guarantee it protects and the test that proves it fails on a planted defect of its own
  kind, not just that it runs. Each also declares a **tier** and a **time bound**: the bare
  command runs the fast profile on every push, `--profile full` adds the mutation run and
  the visual-capture matrix nightly, and a step that exceeds its bound fails naming the
  bound rather than consuming the run. A deferred step is printed by name, with the profile
  that runs it, and the headline carries the profile — a gate that verified less has to say
  so out loud, or it is not a gate.
- **A mutation gate**, not a coverage percentage: Stryker Mutator over the parsing, joining
  and validating code, ratcheted upward as it is measured rather than set once from a hand
  count. The floor holds at 77% today and has moved eight times since it was first measured.
- **A redacted, write-time trace** — every guarded run is recorded by a hook the agent cannot
  edit, with content hashed rather than stored and banned terms scrubbed before the line is
  written, never after.

**Scoped honestly, not oversold.** This harness runs under `enforcement-environment:
policy-controlled` — its boundaries are enforced by the permission engine and by hooks, not by
an OS-level sandbox. The confidentiality check that keeps a term list out of published content
runs only on a machine that holds the mapping, by design (`private/` is gitignored and never
reaches CI) — the harness says so out loud rather than quietly skipping it.

## Running it

```bash
npm ci               # root — the guard suite and the mutation runner
npm ci --prefix site  # the Astro project
npm test              # node scripts/gate.mjs — the fast profile, what CI runs on a push
npm run test:full     # adds the mutation run and the visual-capture matrix
npm start              # production build, served on localhost
```

Node 24 or later. `npm test` is a thin alias — it never re-lists the gate's steps, so a step
added to the gate cannot go silently unrun.

## Confidentiality

`private/` holds the mapping between real and sanitized names and is never committed — the
guard suite checks this on every run, against the actual git history rather than trusting
`.gitignore`. What that mapping protects, and what it does not, is documented in
`.claude/rules/20-content.md`.

## Pointers

- [`CLAUDE.md`](CLAUDE.md) — start here.
- [`TASKS.md`](TASKS.md) — the work-item register.
- [`docs/adr/README.md`](docs/adr/README.md) — accepted decisions, indexed.
- [`docs/harness/architecture.md`](docs/harness/architecture.md) — why the harness is shaped
  this way.
- [`docs/content-conventions.md`](docs/content-conventions.md) — how `resources/**` is written.
- [`progress/`](progress/) — one log per work item, written as the work happened.
