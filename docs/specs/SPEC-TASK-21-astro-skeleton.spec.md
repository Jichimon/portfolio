# SPEC-TASK-21: Astro skeleton and the two root commands

```yaml
spec_id: SPEC-TASK-21
title: Astro skeleton and the two root commands
status: active
version: 1.0
date: 2026-08-24
approved_version: 1.0
work_item: TASK-21
intent: "Prove the local path end to end — build, serve, hydrate, and read content from outside the project root — before anything is built on top of it."

tdd: not_applicable
tdd_rationale: >
  No behaviour here lands in the mutation-covered surface. site/lib/content/** does not
  exist yet and this item does not create it: what ships is configuration, wiring and two
  npm scripts. T-01's universal half — no production behaviour in the mutation-covered
  surface ships without a test that fails before it — is not engaged, and saying so out
  loud is P-03 rather than a silence that reads as coverage. The item is still not done
  until the gate is green, and check-site begins asserting this tree the moment it exists.

governed_by:
  - ADR-001
  - ADR-004
  - ADR-007
  - ADR-008
related_docs:
  - TASKS.md
  - .claude/rules/50-implementation.md
  - docs/adr/README.md

behaviors:
  - id: SKEL-001
    given: "a clean checkout with dependencies installed"
    when: "`npm start` is run from the repository root"
    then: "the site is built with `astro build` and the production output in `site/dist/` is served on localhost, reachable in a browser"
    priority: critical
    status: planned
    edge_cases:
      - "the dev server is NOT what this command runs — INC-03 was a defect invisible in a dev build"
      - "run from the repository root, not from inside site/"
      - "a failed build must fail the command rather than serving a stale dist/"
    tests:
      - "manual::npm-start-serves-built-output"

  - id: SKEL-002
    given: "the root package.json"
    when: "`npm test` is run from the repository root"
    then: "`node scripts/gate.mjs` runs and its exit code is the command's exit code"
    priority: critical
    status: planned
    edge_cases:
      - "the alias must not re-list any gate step (T-09) — a step added to gate.mjs appears without editing package.json"
      - "a failing gate must make `npm test` exit non-zero"
    tests:
      - "manual::npm-test-is-the-gate"

  - id: SKEL-003
    given: "the Astro config in site/"
    when: "the site is built"
    then: "output is static, no adapter is configured, and exactly one route is emitted as HTML"
    priority: critical
    status: planned
    edge_cases:
      - "no wrangler config, no deploy config — that belongs to the deploy item"
      - "the page carries no design, no content and no component; it says nothing on purpose"
    tests:
      - "manual::build-emits-one-static-route"

  - id: SKEL-004
    given: "@astrojs/preact configured with compat enabled"
    when: "a throwaway island is rendered with a client directive and interacted with in a browser"
    then: "the island hydrates and responds, proving the path works before the first real island needs it"
    priority: critical
    status: planned
    edge_cases:
      - "hydration is confirmed in a browser, never inferred from the presence of a script tag"
      - "the island and its route are REMOVED once proven — the island count at the milestone is zero (ADR-007)"
    tests:
      - "manual::preact-island-hydrates-then-removed"

  - id: SKEL-005
    given: "the tree this item creates"
    when: "`node scripts/guards/gate/check-site.mjs` runs"
    then: "it reports PASS rather than SKIP, and every directory, the gateway boundary and the framework-free core hold"
    priority: critical
    status: planned
    edge_cases:
      - "no directory reaches seven files, from the first commit (S-03)"
      - "nothing outside site/src/gateway/** imports astro:content (S-02)"
      - "site/lib/** imports no Astro and nothing from site/src/** (S-06)"
    tests:
      - "scripts/guards/lib/site-structure.test.mjs (already green) + check-site against the real tree"

  - id: SKEL-006
    given: "resources/ is a sibling of site/, not a child"
    when: "a throwaway collection is defined with a glob loader whose `base` points outside the project root"
    then: "at least one real entry from resources/ loads during the build, and the observed result — pass or fail — is recorded verbatim in the work log"
    priority: critical
    status: planned
    edge_cases:
      - "if it FAILS, that is a successful outcome for this behaviour: the finding is recorded and ADR-008's fallback ladder is entered by the content-layer item"
      - "the spike is REMOVED once its result is recorded — this item ships no content layer"
      - "the evidence is the build's own output, never 'it should work'"
    tests:
      - "manual::glob-base-outside-project-root"

constraints:
  - "npm test is a thin alias, never a second list of steps (T-09)"
  - "npm start is the production build, never the dev server (INC-03)"
  - "Astro ^7, static output, no adapter (ADR-001, ADR-004); Preact per ADR-007"
  - "No version number is written into any document until it has been installed and read (C-01, ADR-008 sub-decision 6)"
  - "The root package.json carries the two commands and no dependencies (S-07)"
  - "No deploy configuration of any kind (that is the deploy item)"
  - "resources/** is read-only (H-02): the spike reads it and nothing writes back"

out_of_scope:
  - "The content layer — collections, schema, the locale join. Owned by the content-layer item"
  - "Tokens, the layout shell, the rail, any component. Owned by the layout-shell item"
  - "wrangler.jsonc and the CI workflow. Owned by the deploy item"
  - "Stylelint, Vitest, Stryker, Playwright — each arrives with the item that needs it (S-07)"
```

## Intent

This is the first line of site code in a repository that has none, and the two commands every later item is judged by. It deliberately builds one page that says nothing: the deliverable is not a page, it is a proven path from `npm start` to a served production artifact, and a proven answer to the one assumption nothing else in the backlog can proceed without.

Two things are spiked and then deleted: a Preact island, because `ADR-007` wants the hydration path known to work at the moment the first real island is written rather than debugged then; and a content loader reading `../resources/`, because `ADR-008` sub-decision 3 records that no vendor documentation says it can. Finding out here costs an afternoon. Finding out inside the content layer costs the content layer.

## Behaviors

### SKEL-001 — `npm start` serves the production build · `critical` · `planned`

- **Given** a clean checkout with dependencies installed **When** `npm start` runs from the repository root **Then** `astro build` runs and `site/dist/` is served on localhost.
- **Edge cases:** never the dev server; run from the root, not from inside `site/`; a failed build fails the command rather than serving a stale `dist/`.
- **Governed by:** ADR-001, ADR-004
- **Tests:** the built output opened in a browser, and the URL reported in the work log.

### SKEL-002 — `npm test` is the gate, and nothing else · `critical` · `planned`

- **Given** the root `package.json` **When** `npm test` runs **Then** `node scripts/gate.mjs` runs and its exit code passes through.
- **Edge cases:** no gate step is re-listed in `package.json`; a red gate makes `npm test` exit non-zero.
- **Governed by:** T-09
- **Tests:** the command's output compared against the gate's own, and its exit code read.

### SKEL-003 — one static route, no adapter · `critical` · `planned`

- **Given** the Astro config in `site/` **When** the site builds **Then** output is static, no adapter is configured, one route is emitted.
- **Edge cases:** no deploy configuration; the page carries no design, content or component.
- **Governed by:** ADR-001, ADR-004

### SKEL-004 — Preact hydrates, then leaves · `critical` · `planned`

- **Given** `@astrojs/preact` with `compat` **When** a throwaway island is rendered with a client directive and interacted with **Then** it hydrates and responds.
- **Edge cases:** confirmed in a browser, not inferred from markup; removed once proven.
- **Governed by:** ADR-007

### SKEL-005 — the tree holds its own shape from the first commit · `critical` · `planned`

- **Given** the tree this item creates **When** `check-site` runs **Then** it reports PASS rather than SKIP.
- **Edge cases:** the file cap, the gateway boundary and the framework-free core all hold.
- **Governed by:** ADR-008, S-02, S-03, S-06

### SKEL-006 — the loader spike · `critical` · `planned`

- **Given** `resources/` is a sibling of `site/` **When** a throwaway collection loads it through a glob loader with `base` pointing outside the project root **Then** a real entry loads and the observed result is recorded verbatim.
- **Edge cases:** a failure is a successful outcome for this behaviour — it is recorded and the fallback ladder is entered by the content-layer item; the spike is removed; the evidence is the build's own output.
- **Governed by:** ADR-008 sub-decision 3

## Constraints and invariants

- `npm test` delegates; it never re-lists (`T-09`).
- `npm start` is the production artifact (`INC-03`).
- No dependency is installed before the item that needs it, and no version is written down before it is installed and read (`S-07`, `C-01`).
- `resources/**` is read-only (`H-02`). No git write (`H-01`).

## Out of scope

The content layer, tokens and the shell, any page, deploy configuration, and the four toolchains that arrive with later items. Each is named against its owning item in the frontmatter block above, so nobody invents coverage here.

## Test plan

`tdd: not_applicable` — this table is a verification inventory, not a red-first inventory. Every row is checked against the artifact, never against a report (`P-11`).

| Test (file::name) | Type | Scenario covered | Behavior(s) | Status |
|---|---|---|---|---|
| `manual::npm-start-serves-built-output` | e2e | `npm start` from root builds and serves `dist/`; the route returns 200 in a browser | SKEL-001 | planned |
| `manual::npm-start-is-not-the-dev-server` | e2e | the served bytes come from the build, not from a dev server | SKEL-001 | planned |
| `manual::npm-test-is-the-gate` | e2e | `npm test` output matches `node scripts/gate.mjs`; exit code passes through | SKEL-002 | planned |
| `manual::npm-test-fails-when-the-gate-fails` | e2e | a deliberately broken gate step makes `npm test` exit non-zero | SKEL-002 | planned |
| `manual::build-emits-one-static-route` | e2e | `dist/` contains one HTML route; no adapter in the config | SKEL-003 | planned |
| `manual::preact-island-hydrates-then-removed` | e2e | the island responds to interaction in a browser; the island and its route are gone afterwards | SKEL-004 | planned |
| `scripts/guards/gate/check-site.mjs` | integration | the created tree reports PASS, not SKIP | SKEL-005 | planned |
| `scripts/guards/lib/site-structure.test.mjs` | unit | the three properties, 21 tests, 12/12 mutants | SKEL-005 | green |
| `manual::glob-base-outside-project-root` | e2e | a real `resources/` entry loads during the build, or the failure is recorded verbatim | SKEL-006 | planned |

**Coverage gaps:** none claimed. The `manual::` rows are browser and command-line verification because there is no test runner in `site/` yet and this item does not add one — Playwright arrives with the fidelity-harness item, which is where these become automated. Recorded as a gap with a named owner rather than as coverage.

## Traceability

| Behavior | Priority | Status | Test(s) | Test written first? | ADR |
|---|---|---|---|---|---|
| SKEL-001 | critical | planned | `manual::npm-start-serves-built-output`, `manual::npm-start-is-not-the-dev-server` | n/a — `tdd: not_applicable` | ADR-001, ADR-004 |
| SKEL-002 | critical | planned | `manual::npm-test-is-the-gate`, `manual::npm-test-fails-when-the-gate-fails` | n/a | — (T-09) |
| SKEL-003 | critical | planned | `manual::build-emits-one-static-route` | n/a | ADR-001, ADR-004 |
| SKEL-004 | critical | planned | `manual::preact-island-hydrates-then-removed` | n/a | ADR-007 |
| SKEL-005 | critical | planned | `check-site`, `site-structure.test.mjs` | yes — the guard's tests were written red before the guard, in the architecture item | ADR-008 |
| SKEL-006 | critical | planned | `manual::glob-base-outside-project-root` | n/a | ADR-008 |

## Drift log

| Date | What diverged | Spec or code corrected | Note |
|---|---|---|---|
| | | | |
