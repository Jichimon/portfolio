# Hard rules — the non-negotiable boundaries

These are the **A1 tier**: no in-session instruction moves them, because the runtime does not offer that option. They are changed only by editing this file or `settings.json` out of band, which is itself a reviewable event.

Every one is enforced at **rung 1** — a `deny` rule or a `PreToolUse` guard denial. That is not a coincidence: a boundary that cannot be denied at rung 1 is not a hard rule, it is a strong preference, and it belongs in one of the other files.

| id | rule | rung | origin | enforced by |
|---|---|---|---|---|
| **H-01** | **Agents never invoke a git write and never write into `.git/`.** No commit, push, branch, tag, merge, reset, rebase or stash. Work is left uncommitted for the human. Reads pass — history, diff and blame are needed. | 1 | D2 · the human's ability to see everything the agent did in one diff is the last line of defence, and a well-meaning commit destroys it | `deny` + `git-write` guard (allowlist over subcommands) |
| **H-02** | **`resources/**` is read-only input.** No agent writes, moves or deletes published content. | 1 | D1 · it is the content source of truth, and TASK 5 is not a content task | `deny` + `resources-readonly` guard |
| **H-03** | **`evidence/**` is written by hooks only.** No agent writes there by any vector — file tools, redirection, `tee`, `mv`, `rm` or truncation. Reads are open. | 1 | A11 · a trace the scored entity can edit has the same substrate problem as a self-report | `deny` + `evidence-readonly` guard |
| **H-04** | **`private/**` is never read by a delegated role, and its contents are never copied into any file outside it.** | 1 | existing practice · `private/glossary.md` is binding and the mapping it holds is the whole sanitization decision | `deny` on read for delegated roles |
| **H-05** | **No write-capable delegation while a spec is `draft`, or while an `active` spec's `version` has moved past its `approved_version`.** Write-capability is read off the role's own `tools` list, never a roster. | 1 | INC-05 · three implementers were once delegated on a plan approval, against a spec version nobody had signed off | `delegation-gate` guard on `PreToolUse` matcher `Agent` |

## Why these five and no more

The list is short on purpose. Each entry costs a guard, and a guard costs a red-path battery (`P-14`). A rule that lands here without being deniable at rung 1 would be claiming an enforcement level it has not earned — and a false 🔒 is worse than an honest 🔧, because it retires a human eye that is still needed.

Everything else that matters lives in [10-process](10-process.md), [20-content](20-content.md), [30-testing](30-testing.md), [40-agent-policy](40-agent-policy.md) or [50-implementation](50-implementation.md), at the rung it actually reaches.

## The registry

One id space across six files. **No id appears in two files.** Ids never change once published, and a retired id is never reused — `progress/` and the specs cite them.

| Surface | File | Loaded | Owns |
|---|---|---|---|
| `H-*` Hard boundaries | `00-hard-rules.md` | always | rung-1 boundaries |
| `P-*` Process | [10-process.md](10-process.md) | always | how work flows |
| `C-*` Content | [20-content.md](20-content.md) | always | confidentiality, factual integrity, locale parity |
| `T-*` Testing | [30-testing.md](30-testing.md) | on `paths:` match | TDD, mutation, e2e, guard testing |
| `G-*` Governance | [40-agent-policy.md](40-agent-policy.md) | always | trust ladders, permissions, budgets, registry meta-rules |
| `S-*` Implementation | [50-implementation.md](50-implementation.md) | on `paths:` match | the site tree, the content gateway, class naming, the file cap |

Rule origins are the incidents in `docs/harness/architecture.md` §C (`INC-01`…`INC-11`), the locked decisions in §N (`D1`…`D10`), the amendments (`A1`…`A23`), or **existing practice** — which is a real origin, and the one that makes a rule describe reality rather than aspiration.

**A rule with no origin is ceremony and does not belong here.** Ceremony teaches people the registry contains things that do not matter, and that is contagious.

### Two definition forms

A rule is defined either as a **table row** (`| **P-04** | … |`) or as a **section heading** (`## G-01 · …`) when it needs a block rather than a line — the two trust ladders are the only current case. `check-rules-registry` must recognize both, or it will report every ladder as a dangling citation. Noted because the first manual pass did exactly that.

### Incidents without a rule

`INC-03` (dev ≠ prod; seven missing elements survived two visual reviews) has **no rule yet**, deliberately. Its remedy is the visual-QA rigor checklist, deferred until the site has screens worth diffing — see `docs/harness/architecture.md` §M. Recorded here so the gap reads as a decision rather than an oversight, and so `EVAL-000` scores it as a known `Gap` rather than discovering it.

