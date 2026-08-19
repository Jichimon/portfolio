---
paths:
  - "scripts/**"
  - "site/**"
  - "**/*.test.*"
  - "**/*.spec.*"
---

# Testing rules

The `T-*` surface. Path-scoped: these load when working on the guards, the site, or any test file — the only places they apply. Every other surface would carry them as noise.

## Where TDD and mutation actually bite

`D3` scoped both deliberately. Mutating render templates produces equivalent mutants and noise; parsing, joining and validating is real logic a mutant can break — and it is exactly where `INC-09` and `INC-10` lived.

```text
TDD + MUTATION      scripts/guards/**          the guards, incl. red paths
                    site/lib/content/**        frontmatter parsing, the i18n slug join,
                                               :::diagram resolution, locale parity,
                                               term checking
E2E + BUILD         rendered pages             both locales, links, metadata
```

## TDD is policy by work-item type, not a universal invariant

| type | TDD | Form |
|---|---|---|
| `harness` (guards) | **required** | red → green → refactor, including the red-path battery |
| `feature` touching the mutation-covered surface | **required** | red → green → refactor |
| `bugfix` in that surface | **required** | the failing test must **reproduce the bug** before the fix. A bugfix with no reproducing test is not done |
| `migration` | **required** where it touches that surface | as above |
| `refactor` | **not applicable** | tests must exist and pass before *and* after. Adding a test is not what makes it a refactor |
| `content` · `research` · `planning` · `documentation` · `configuration` | **not applicable** | declared out loud, per `P-03` |

Stated as a universal rule it would be disbelieved on its first content item — and `content` is the type of every completed work item in this repository to date. One disbelieved rule discredits the registry.

## The rules

| id | rule | rung | origin |
|---|---|---|---|
| **T-01** | **TDD by work-item type**, per the table above. The universal part is narrower and survives: **no production behavior in the mutation-covered surface ships without a test that fails before it.** | 4 · 2 where the mutation gate covers it | A23 · D3 |
| **T-02** | **A test that would still pass with the system under test disabled is not that kind of test.** If an "end-to-end" test passes with the server off, it is not an end-to-end test. | 4 | **INC-02** · fifteen "e2e" tests mocked every HTTP call and stalled the realtime handshake. They passed. They proved nothing |
| **T-03** | **The mutation gate covers the surfaces above, and a surviving mutant is a finding** — not a statistic to average away. A surviving mutant is *observable proof* that a test proves nothing, which is the mechanized answer to `T-02`. | 2 | INC-02 · D3 |
| **T-04** | **Every guard ships with a red-path battery** exercising each bypass its author can think of, and the battery must fail when the guard is neutered. | 2 | INC-07 · `P-14` |
| **T-05** | **Risk-based, not coverage-based.** Few things tested, those exhaustively. A test earns its place where a bug is both likely and costly. A coverage percentage is a number about the suite, not about the risk. | 4 | existing practice |
| **T-06** | **A flake is a finding.** Do not retry until green and move on. Intermittent means a real race, a real timing assumption, or a real ordering bug. | 4 | INC-02 |
| **T-07** | **Assert what the user observes**, not what the implementation happens to do. A test coupled to internals passes through the refactor that breaks the feature. | 4 | existing practice |
| **T-08** | **Test placement is fixed by kind:** unit and component tests colocated with the code; end-to-end tests in one dedicated directory. Not negotiable per-author. | 4 | existing practice |
| **T-09** | **The gate is one command and is CI parity.** It **delegates** to sub-gates rather than re-listing their steps — otherwise a step added to a sub-gate is silently absent from the gate, and the local run verifies less than CI does. | 2 | INC-08 |
| **T-10** | **A green local gate is not evidence that CI fired.** Read the real run result from the provider. | 4 | **INC-08** · two path-filtered workflows meant a repo-root guard ran in CI exactly zero times, invisibly |

## Stack-dependent rows — deliberately blank until TASK 7

The test runner, the mutation tool, its surviving-mutant threshold, the e2e runner and the gate's sub-gate commands are decided by TASK 7's ADRs and written here afterwards.

| Question the stack must answer | Answer |
|---|---|
| Unit test runner and invocation | |
| Mutation tool, threshold, and the `_threshold_rationale` if it differs from the tool's default | |
| E2E runner, and what "real" means for this stack (real browser, real build, real filesystem) | |
| The gate's sub-gate commands | |
| Integration test strategy, if any | |

**A blank row is a legitimate answer.** Filling one speculatively produces a rule nobody believes in, and `C-01`'s logic applies to rules as much as to metrics: a missing answer is fine, an invented one is not.
