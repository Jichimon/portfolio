# 2026-08-30 · Session 07 — `env -S` packs a whole command into one argument

**Task:** TASK 96 — `env -S` / `--split-string` packs a whole command into one argument, so `env` is a flag-wrapper nobody classified as one
**Status after this session:** DONE

## What was done

`env` sat only in `DIRECT_WRAPPERS`, whose model is "every remaining token is its own command word." `env -S "git commit -m x"` breaks that model: `-S` takes **one** string that `env` itself field-splits. The offered suffix was the single token `['git commit -m x']`, whose `basename` is the whole string — not `git`, not any `WRITES`/`READS` head — so it matched no boundary at all. `splitStringArgs(argv)` now collects every packed string and `wrapperContexts` recurses `commandContexts` on each.

## Decisions

- **The branch lives in `wrapperContexts`, not in the `DIRECT_WRAPPERS` block.** That is what makes it fire when `env` arrives as another wrapper's suffix — `sudo env -S "git commit -m x"` — for free, and a test asserts it rather than leaving it to reasoning.
- **The long option is matched by PREFIX, not by exact spelling.** This was the first fix's bug, below.
- **`env -uS "…"` stays allowed, deliberately.** `-u` consumes the `S` as the variable name to unset, so env execs a program literally named `git commit -m x` — verified under coreutils 8.32, alongside `-CS` and `-0uS`. Denying it would over-deny a command that cannot run. `ENV_VALUE_OPTS` stops the cluster scan at `u` and `C`, which `env --help` confirms are the only value-taking short options besides `S`. A test pins this so it is not later "fixed" into an over-deny.

## Findings from validating against real state (P-04)

- **The first fix was wrong, and a second scoped audit caught it — the third consecutive item in this surface where that happened** (`TASK 92`, `TASK 93`, now this). It matched `--split-string` exactly. GNU `getopt_long` accepts unambiguous abbreviations, and `split-string` is env's **only** long option beginning with `s` — the others are ignore-environment, null, unset, chdir, block-signal, default-signal, ignore-signal, list-signal-handling, debug, help, version. So `env --s "git commit -m x"` escaped all four boundaries while `env -S "…"` was correctly denied. Independently re-verified before being accepted: `--s`, `--sp`, `--spl`, `--split-str`, `--split-strin` all execute, in both `=value` and separate-value forms.
- **The pattern across three items is worth naming.** Each fix was correct about the mechanism it targeted and wrong about the *edges* of the grammar it was matching — a comment word-boundary, an `eval --`, an option abbreviation. The audit is not catching sloppiness; it is catching the assumption that a grammar is what you would have designed rather than what the tool accepts. Reading the real tool's `--help` output would have caught this one in a minute.

## Evidence

Before: `env -S`, `--split-string=`, glued `-S"…"`, bundled `-vS`, and later every abbreviation — all `{"allowed":true}` on both checkers, all executing under GNU coreutils 8.32.
After: every spelling denied; `env --unset=FOO git status`, `env --u "git push"`, `env -- git status` and `env -uS "…"` still allowed.

- **Twelve mutants survived in this item's own code on the first gate run, and `T-03` calls that a finding rather than a statistic.** Three tests killed ten of them, and each came from asking what the mutant would actually let through: `env -CS "…"` stays allowed (pins the `C` in `ENV_VALUE_OPTS`, which a `StringLiteral` mutant would otherwise delete unnoticed); `env aS "git push"` stays allowed (pins that the cluster scan only looks at real option tokens — three separate mutants made it scan every token); and no env command lacking a split-string option may invent a context head absent from the command. That last one matters because `commandContexts(undefined)` does **not** return empty — it returns a context whose head is the literal string `"undefined"`, so a collector pushing a value it does not have is observable.
- **The remaining two are equivalent, checked rather than assumed, and suppressed at the mutant with the reason written there.** Dropping the length test changes only the single token `-`, whose cluster loop starts at `j = 1` and iterates zero times; running one index past the end reads `tok[tok.length]`, which is `undefined` for a string and matches neither `ENV_VALUE_OPTS` nor `'S'`. Final: **78.57%**, zero survivors in this item's code.

## Done

```yaml
done:
  tests:           { status: passed, evidence: ["node --test scripts/guards/lib/{shell,git-write,path-boundary}.test.mjs — 255 pass, 0 fail"] }
  mutation:        { status: passed, evidence: ["gate.mjs step 2 — 78.57% against the 77.0 floor, 0 survivors in this item's code"] }
  security:        { status: passed, evidence: ["H-01/H-02/H-03/H-04 red battery over 6 spellings; 10 tests red before their fix (7 for the packed forms, 3 for the abbreviations), all green after"] }
  docs:            { status: passed, evidence: ["progress/2026-08-30-07-task96-env-split-string.md", "TASKS.md TASK 96"] }
  loose_ends:      { status: passed, evidence: ["TASKS.md — TASK 97, TASK 98 opened from this item's audit"] }
  scope:           { status: passed, evidence: ["scripts/guards/lib/shell.mjs + 3 colocated test files"] }
  ci:              { status: not_applicable, reason: "no CI provider configured for this repository yet" }
  content:         { status: not_applicable, reason: "no publishable content touched — guard internals only" }
  iterations:      { status: passed, evidence: ["2"] }
  iteration_split: { status: passed, evidence: ["verify=2"] }
```

## Open questions

None. `TASK 97` needs a real POSIX sudo to confirm its grammar before it can be fixed rather than documented — recorded in that entry, not here.

## Next

`TASK 98` — `powershell -EncodedCommand`, the one of the two new loose ends that is confirmed executing. `TASK 97` is blocked on an environment this machine does not have; `TASK 94` remains the standing documentation item.

## Files changed

`scripts/guards/lib/shell.mjs` — `SPLIT_STRING_WRAPPERS`, `ENV_VALUE_OPTS`, `longSplitStringValue`, `splitStringArgs`, and the branch in `wrapperContexts`.
`scripts/guards/lib/shell.test.mjs` — 7 decomposition tests: every spelling, abbreviations, the `-uS` grammar, recursive payloads, and the invented-context guard.
`scripts/guards/lib/git-write.test.mjs` — 8 tests, `H-01` across all spellings, the `-uS`/`-CS` grammar cases, and non-regression.
`scripts/guards/lib/path-boundary.test.mjs` — 4 tests, `H-02`/`H-03`/`H-04` plus an over-deny check.
