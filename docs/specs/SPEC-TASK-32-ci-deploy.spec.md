# SPEC-TASK-32: CI deploy pipeline — GitHub Actions to Cloudflare Workers

```yaml
spec_id: SPEC-TASK-32
title: CI deploy pipeline, GitHub Actions to Cloudflare Workers
status: active
version: 1.0
date: 2026-09-01
approved_version: 1.0
work_item: TASK-32
intent: "Make a push to main the only path by which the site reaches the internet, and make the deploy prove it landed whole rather than merely report that a command exited 0."

tdd: required
tdd_rationale:
reproduces:

governed_by:
  - ADR-001
  - ADR-004
  - ADR-006
  - ADR-008
related_docs:
  - .github/workflows/ci.yml
  - scripts/guards/lib/ci.mjs
  - site/lib/content/routes/route-set.mjs
  - site/tests/e2e/routes.smoke.spec.ts

behaviors:
  - id: DEPLOY-001
    given: "the one CI workflow carries a gate job, and the repository's guards, docs, badge and register all name that workflow by its filename"
    when: "the file is renamed harness.yml to ci.yml and its name field to ci"
    then: "check-docs validates the workflow at its new path, ci.test.mjs's three LIVENESS assertions resolve, and no living document still points at the old filename"
    priority: critical
    status: implemented
    edge_cases:
      - "check-docs's WORKFLOW constant still naming the old path fails loudly rather than skipping the workflow half of the check"
      - "a dated log under progress/ citing the old path is correct history and is NOT rewritten - check-docs excludes dated logs by property"
      - "TASK 111's Done cites a gh workflow run command carrying the old filename, which stops working - a living reference, corrected"
      - "the README badge URL and label both carry the name; changing one and not the other leaves a badge pointing at a workflow that does not exist"
    tests:
      - "ci.test::LIVENESS: the real workflow exists and validates"
      - "ci.test::LIVENESS: the workflow runs the same command a human runs locally"
      - "gate::check-docs"

  - id: DEPLOY-002
    given: "site/ builds to dist/ as static output with no adapter, and no wrangler configuration exists in the repository"
    when: "site/wrangler.jsonc declares an assets-only Worker with directory ./dist"
    then: "a wrangler deploy dry run from site/ resolves the config and the asset directory without a credential, and the file declares no main entrypoint"
    priority: critical
    status: implemented
    edge_cases:
      - "not_found_handling 404-page serves the single bilingual 404.html; there is deliberately no es/404.html, so a miss under /es/ resolving to the root 404 is the design and not a locale-parity defect"
      - "site/ root goes 6 files to 7 against S-03's package-root cap of 10 - within the cap, whose rationale already names this file"
      - "adding wrangler to site/ devDependencies grows package-lock.json, which is the surface TASK 45's banned-term collision appeared on - check-terms runs immediately after the install, not at the end"
      - "the $schema path resolves only because wrangler is installed locally; without the install it dangles"
    tests:
      - "gate::site structure"
      - "gate::confidentiality"
      - "manual::wrangler deploy dry run from site/"

  - id: DEPLOY-003
    given: "the gate job passes on a push to main, and CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID exist as repository secrets"
    when: "the workflow runs"
    then: "a deploy job with needs gate builds site/ and ships dist/ to Cloudflare Workers, and no other trigger deploys anything"
    priority: critical
    status: partial
    edge_cases:
      - "a pull_request run, a schedule run and a workflow_dispatch run all reach the gate job and none of them deploy"
      - "a push to a branch other than main does not deploy"
      - "a red gate job leaves the deploy job unrun - needs gate is the mechanism, never an if condition reading the gate's own outcome"
      - "two pushes in quick succession deploy in order; cancel-in-progress false is what stops the later one leaving the site on whichever finished last"
      - "the deploy job builds explicitly rather than consuming an artifact from the gate job, whose dist/ exists only as a side effect of e2e smoke's globalSetup"
      - "the workflow text must not contain an npm test or node --test invocation - ci.test.mjs fails it, because CI re-listing a gate step means a step added to the gate is silently absent from CI"
    tests:
      - "ci.test::LIVENESS: the workflow runs the same command a human runs locally"
      - "gate::check-docs"
      - "provider::gh run view reports gate and deploy both green on the push's own run"

  - id: DEPLOY-004
    given: "a deployed base URL and the route set the content collection derives"
    when: "the verifier runs against that URL"
    then: "every derived route is requested and any route not answering 200 with an HTML content type is reported by name, exiting non-zero"
    priority: critical
    status: implemented
    edge_cases:
      - "an empty route set is a finding, not an all-green pass - TASK 39's shape, a check that ran nothing must not report success"
      - "a route answering 200 with a non-HTML content type is a finding: the host answering with something is not the same as the page being there"
      - "an unreachable host is a finding, never a vacuous pass"
      - "a missing or empty PROD_BASE_URL is a finding, not a skip - this variable is set by the job that just deployed, so its absence is a defect in the workflow"
      - "propagation is handled by ONE bounded readiness wait on the index route before the set is checked, never a per-route retry, which would mask a real 404 as a slow one (T-06)"
    tests:
      - "deploy-verify.test::RED: a route answering 404 is reported by name"
      - "deploy-verify.test::RED: a 200 with a non-HTML content type is a finding"
      - "deploy-verify.test::RED: an unreachable host is a finding rather than a pass"
      - "deploy-verify.test::RED: an empty route set is a finding, not all-green"
      - "deploy-verify.test::green path: every route answering 200 text/html yields no findings"

  - id: DEPLOY-005
    given: "routes.smoke.spec.ts derives the route set through two frontmatter-reading helpers local to that file"
    when: "the verifier needs the same route set"
    then: "the helpers move into site/lib/content/routes/ and both consumers import them, so one derivation feeds both and the e2e suite still passes unchanged"
    priority: critical
    status: implemented
    edge_cases:
      - "site/lib/** is framework-free (S-06); the moved helpers may import node:fs and yaml but nothing from site/src/**"
      - "this is a refactor under T-01: the e2e suite passes before AND after, and adding a test is not what makes it one"
      - "the moved module enters the mutation-covered surface, so it needs killers of its own rather than riding on the e2e suite, which Stryker's tap runner never sees"
    tests:
      - "routes.smoke::every derived route is served"
      - "route-source.test::reads a locale-suffixed markdown pair and excludes the named stem"

  - id: DEPLOY-006
    given: "TASK 27's prod leg reads its base URL from an environment variable and reports a named skip while that variable is unset"
    when: "the deploy job publishes the live URL"
    then: "the variable is named PROD_BASE_URL, is declared in exactly one place - the deploy step's own deployment-url output - and the account subdomain appears in no file in the repository"
    priority: normal
    status: implemented
    edge_cases:
      - "hardcoding the workers.dev hostname would be a second declaration site AND would put the account subdomain in a public repository"
    tests:
      - "gate::confidentiality"

constraints:
  - "CI is the only deploy path, from the first deploy. No manual wrangler deploy is run, ever - a manual path that keeps working is a path nobody notices the automated one breaking behind."
  - "The gate runs before the deploy, and runs ONCE. needs gate is how that constraint is met; the deploy job does not re-run the gate."
  - "No Cloudflare credential enters the session environment (G-08). An agent writes the workflow; the author supplies the secrets, already created."
  - "Astro, static output, no adapter (ADR-001, ADR-004). wrangler deploy serves dist/ as static assets."
  - "One workflow file. The deploy is a job, not a second .yml - check-docs validates the workflow by name, and a second file would carry no guard at all (INC-08 through a filename)."
  - "The verifier is not a gate step. gate.mjs is untouched: a gate requiring a network and a live deployment is a gate that fails offline, against T-09's one-command parity."
  - "Routes are derived from the content collection, never listed. A verifier enumerating routes differently from the e2e suite verifies something else (criterion 4)."
  - "H-01 holds throughout: the rename is a filesystem move, never a git subcommand, and nothing here commits."

out_of_scope:
  - "PR preview deployments. The item's own constraint is a push to main and nothing else that ships it at all. Cloudflare's version-upload preview URLs are a future item with its own trigger."
  - "The custom domain - TASK 28, blocked on the domain existing. Until then the workers.dev address is the published one."
  - "TASK 27's prod fidelity comparison. This item publishes PROD_BASE_URL and stops there; the comparison is TASK 27's prod leg."
  - "An automated rollback. The wrangler rollback command is one line and no failure has asked for automation yet."
  - "Widening ci.mjs to validate every workflow on disk. It would be the right shape for a second workflow file, and this item deliberately does not create one - the guard stays as narrow as the tree it guards."
```

## Intent

The site builds, passes twenty gate steps and serves seventeen routes on localhost, and nobody outside this machine can see any of it. This spec makes a push to `main` the single path by which it reaches the internet — no manual `wrangler deploy` first, because a manual path that keeps working is the reason nobody notices when the automated one breaks.

The second half is what separates this from a deploy that merely exits 0. `INC-03` is this repository's own record of a build that looked fine and was not, and `TASK 39` is its record of a step reporting `PASS` having run nothing. A deploy step's exit code says a command succeeded; it does not say the site is there. So the deploy publishes its own URL and a verifier walks every route the content collection derives, against that URL, and fails the run naming anything that is not a 200.

## Behaviors

### DEPLOY-001 — the one workflow is renamed to `ci.yml` · `critical` · `implemented`

- **Given** the guards, docs, badge and register name the workflow by filename **When** it is renamed **Then** every living reference resolves and no dated log is rewritten.
- **Edge cases:** the `WORKFLOW` constant · dated logs left alone · the register's now-broken dispatch command · the badge's URL *and* label.
- **Governed by:** ADR-006
- **Tests:** `ci.test` LIVENESS ×2, `gate::check-docs`

### DEPLOY-002 — `site/wrangler.jsonc` declares an assets-only Worker · `critical` · `implemented`

- **Given** static output with no adapter **When** the config declares `assets.directory` of `./dist` and no `main` **Then** a dry run resolves it without a credential.
- **Edge cases:** the single bilingual 404 · the package-root file cap · the lockfile's term-collision surface · the `$schema` path.
- **Governed by:** ADR-001, ADR-004
- **Tests:** `gate::site structure`, `gate::confidentiality`, manual dry run

### DEPLOY-003 — a `deploy` job, gated on the gate · `critical` · `partial`

- **Given** a green gate on a push to `main` **When** the workflow runs **Then** `dist/` ships to Cloudflare, and no other trigger deploys.
- **Edge cases:** PR, schedule and dispatch runs deploy nothing · non-`main` pushes deploy nothing · a red gate leaves the job unrun · ordered concurrency · an explicit build rather than an artifact · the workflow text staying free of a gate-step re-listing.
- **Governed by:** ADR-004
- **Tests:** `ci.test` LIVENESS, `gate::check-docs`, the provider's own run

### DEPLOY-004 — every derived route answers 200 at the deployed URL · `critical` · `implemented`

- **Given** a base URL and the derived route set **When** the verifier runs **Then** anything not 200/HTML is named and the run fails.
- **Edge cases:** the empty route set · a 200 that is not HTML · an unreachable host · an unset `PROD_BASE_URL` · one bounded readiness wait, never a per-route retry.
- **Governed by:** ADR-006
- **Tests:** the six `deploy-verify.test` rows below

### DEPLOY-005 — one route derivation, two consumers · `critical` · `implemented`

- **Given** the e2e suite's local frontmatter helpers **When** the verifier needs the same routes **Then** the helpers move into the framework-free core and both import them.
- **Edge cases:** `S-06`'s import boundary · a `refactor` under `T-01`, green before and after · the moved module needs its own killers, because Stryker's tap runner never sees the e2e suite.
- **Governed by:** ADR-008 (S-06)
- **Tests:** `routes.smoke`, `route-source.test`

### DEPLOY-006 — `PROD_BASE_URL`, declared once · `normal` · `implemented`

- **Given** TASK 27's prod leg waiting on a variable **When** the deploy publishes **Then** the name is `PROD_BASE_URL`, sourced from the deploy step's output, and no hostname is written into a file.
- **Edge cases:** hardcoding the hostname would be both a second declaration site and an account subdomain in a public repository.
- **Governed by:** ADR-004
- **Tests:** `gate::confidentiality`

## Constraints and invariants

See the `constraints` block above. The two most often lost in implementation: **the gate runs once**, and **the verifier is not a gate step**.

## Out of scope

See the `out_of_scope` block. Each entry names the item that owns it, or states that nothing does.

## Test plan

`tdd: required` — `scripts/guards/lib/deploy-verify.mjs` and the moved `site/lib/content/routes/` module both land in the mutation-covered surface (`T-01`, `D3`). This table is an inventory worked through one behavior at a time, not a batch written red up front.

| Test (file::name) | Type | Scenario covered | Behavior(s) | Status |
|---|---|---|---|---|
| `deploy-verify.test::green path: every route answering 200 text/html yields no findings` | unit | the happy path, with a stub fetch | DEPLOY-004 | green |
| `deploy-verify.test::RED: a route answering 404 is reported by name` | unit | one route missing from the deployment | DEPLOY-004 | green |
| `deploy-verify.test::RED: a 200 with a non-HTML content type is a finding` | unit | the host answers, the page is not there | DEPLOY-004 | green |
| `deploy-verify.test::RED: an unreachable host is a finding rather than a pass` | unit | fetch rejects | DEPLOY-004 | green |
| `deploy-verify.test::RED: an empty route set is a finding, not all-green` | unit | TASK 39's shape | DEPLOY-004 | green |
| `deploy-verify.test::RED: a missing PROD_BASE_URL is a finding, not a skip` | unit | the workflow failed to set it | DEPLOY-004 | green |
| `route-source.test::reads a locale-suffixed markdown pair` | unit | the moved helper, on a fixture | DEPLOY-005 | green |
| `route-source.test::excludes the named stem from the page loader` | unit | the `ui` exclusion the loaders declare | DEPLOY-005 | green |
| `route-source.test::throws naming the file when frontmatter is absent` | unit | the helper's own failure mode | DEPLOY-005 | green |
| `routes.smoke::every derived route is served` | e2e | the refactor changed nothing | DEPLOY-005 | green (must stay) |
| `ci.test::LIVENESS: the real workflow exists and validates` | unit | the rename landed everywhere | DEPLOY-001, DEPLOY-003 | green (must stay) |
| `ci.test::LIVENESS: the workflow runs the same command a human runs locally` | unit | CI does not re-list gate steps | DEPLOY-001, DEPLOY-003 | green (must stay) |
| `gate::check-docs` | integration | no living document points at a path that does not resolve | DEPLOY-001 | green (must stay) |
| `gate::site structure` | integration | the file cap, with `wrangler.jsonc` added | DEPLOY-002 | green (must stay) |
| `gate::confidentiality` | integration | the grown lockfile and the new files carry no banned term | DEPLOY-002, DEPLOY-006 | green (must stay) |
| manual::a `wrangler deploy` dry run from `site/` | integration | the config resolves without a credential | DEPLOY-002 | green — 153 files read from dist/ |
| provider::`gh run view` on the push's own run | e2e | `gate` and `deploy` both green, read from GitHub | DEPLOY-003 | **planned — needs the push** |
| provider::a trivial commit reaches the live URL with no local command | e2e | the item's first Done clause, verified by doing it | DEPLOY-003 | **planned — needs the push** |
| red path::a route the deployment does not serve | e2e | the verifier fails when it should (P-14) | DEPLOY-004 | green — against a real `wrangler dev` |

**Coverage gaps:**

- **The deploy job's `if:` condition is not unit-testable.** No guard here parses workflow job conditions, and building one for a single expression would be a work item with its own red-path battery (`T-04`). It is verified by observation instead: the first PR run and the first nightly run after this lands must both show `deploy` skipped. Owner: this item's verification table, not a future guard.
- **The deploy action's `deployment-url` output is trusted, not asserted.** If it ever changes shape, `PROD_BASE_URL` arrives empty — which `deploy-verify` reports as a finding rather than a pass, so the failure is loud. That is the mitigation; there is no test of the action itself.
- **No test asserts the deployed bytes equal the built bytes.** `wrangler deploy` is trusted to upload what it is pointed at. The verifier checks the routes are there, not that each is byte-identical to `dist/`. Owner: `TASK 27`'s prod leg, which diffs rendering rather than bytes.

## Traceability

| Behavior | Priority | Status | Test(s) | Test written first? | ADR |
|---|---|---|---|---|---|
| DEPLOY-001 | critical | implemented | `ci.test` ×2, `gate::check-docs` | n/a — rename, tests pre-exist | ADR-006 |
| DEPLOY-002 | critical | implemented | `gate::site structure`, dry run | n/a — configuration | ADR-001, ADR-004 |
| DEPLOY-003 | critical | partial | `ci.test`, provider run | n/a — workflow | ADR-004 |
| DEPLOY-004 | critical | implemented | 6 × `deploy-verify.test` | **yes, required** | ADR-006 |
| DEPLOY-005 | critical | implemented | 3 × `route-source.test`, `routes.smoke` | **yes, required** | ADR-008 |
| DEPLOY-006 | normal | implemented | `gate::confidentiality` | n/a — a naming decision | ADR-004 |

**Three of six behaviors are `n/a` for test-first, and that is declared rather than silent** (`P-03`). `T-01` scopes TDD to production behavior in the mutation-covered surface: a workflow file, a JSON config and a variable name are none of them, and their proof is the guards that already exist plus the provider's own run. The two behaviors that *do* land code in `scripts/guards/lib/**` and `site/lib/**` carry the requirement, and the trace's monotonic `seq` is what makes the claim checkable rather than self-reported.

## Drift log

| Date | What diverged | Spec or code corrected | Note |
|---|---|---|---|
| 2026-09-01 | The register's Deliverable named a second workflow file; the decision taken with the author is one workflow with a `deploy` job | register corrected | Written before the spec, so the spec never described the two-file shape |
| 2026-09-01 | The register's third `Done` clause required `TASK 27`'s prod comparison, which does not exist and could not be built inside this item | register corrected, clause moved to `TASK 27` | `P-01` — one item's done cannot be another item's deliverable |
| 2026-09-01 | The plan drafted for this item specified a git-subcommand rename | plan corrected before any tool ran | `H-01` is rung 1: agents invoke no git write. A filesystem move produces the same rename in the diff |
| 2026-09-01 | Two `deploy-verify` tests asserted the exact SEQUENCE of requested paths; `/` is legitimately requested twice, once by the readiness probe and once by the walk | tests corrected, code untouched | The reds were the tests being wrong, not the implementation. Now asserted as a distinct set, so the assertion is not coupled to the readiness attempt count |
| 2026-09-01 | `S-08` violations in three comments this session wrote inside `site/**` — work-item ids, the citation direction that rule inverts | code corrected | Two caught by `check-site`; the third, in `site/wrangler.jsonc`, was NOT, because `.jsonc` is outside its scanned extensions. Fixed anyway and recorded as a stated residual in the register |
| 2026-09-01 | This spec's own `related_docs` pointed at `harness.yml` — the path DEPLOY-001 renames | spec corrected, **no `version` bump** | A stale pointer, not a behavior, constraint or test. Nothing the delegation gate reads changed, and `approved_version` still matches. Recorded rather than done silently, because an unrecorded deviation reads identically to a violation later (`G-01`, A3) |
