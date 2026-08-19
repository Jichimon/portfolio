# 2026-08-18 · Session 07 — TASK 10: guard precision

**Task:** TASK 10 — Guard precision follow-ups
**Status:** DONE. TASK 5 remains IN PROGRESS (steps 1–10 done, step 11 next).

## What was done

Both defects the human approved fixing. Tests 290 → 312, gate still eleven steps green.

## The false positive: quoting semantics, not a softer rule

It fired **eight times in two days**, the eighth while writing the test that fixes it. Once it aborted a patch mid-run and the failure was easy to miss, because a denied `Bash` call looks the same whether the command was dangerous or merely described one.

Two causes, both from scanning the raw string:

- **`substitutions()` read inside quotes.** Prose citing a command in backticks was extracted as something to run. Writing a document *about* the git boundary tripped the git boundary.
- **`splitSegments()` broke heredoc bodies on newlines** and tokenized each line as a command. A heredoc rewriting a file is data, not a command list.

**The fix is exact shell semantics, and the direction matters both ways.** Single-quoted spans and `<<'EOF'` bodies are literal, so they are stripped. Double-quoted spans and `<<EOF` bodies still expand `$( )` and backticks, so they are kept — treating those as data would have traded a false positive for a real bypass, which is the worse trade.

**Redirects needed more than stripping.** These two are opposites and a regex cannot tell them apart:

```
echo 'x > evidence/t'     the operator is INSIDE quotes — text about a redirect
echo x > 'evidence/t'     the operator is outside, the TARGET is quoted — a real redirect
```

Blanking every quoted span fixes the first and breaks the second. So `redirectTargets` tracks quote state and lets the **operator** decide, while the target keeps its content. `checkBashPaths` now reads redirects and mutators off the decomposed command rather than the raw string, which gets heredoc and substitution handling for free.

**Proof it works:** the exact command shape that failed eight times — a heredoc rewriting a document, citing a git write and a recursive delete in prose, and containing a redirect into `evidence/` inside a quoted string — now runs. Every bypass test still denies: backticks outside quotes, `$( )` inside double quotes, an expanding heredoc, `sh -c`, and a quoted redirect target.

**6/6 mutants caught** across the two libraries: heredoc stripping disabled, single-quote blanking disabled, literal heredocs treated as expanding, quote state ignored, target quotes not unwrapped, append form dropped.

## The rule: G-13, and the incident behind it

**`INC-12`** is transcribed in `architecture.md` §C before the rule cites it, because a rule with no origin is deleted rather than kept (`G-10`): a torn `guards.config.json` made the `PreToolUse` hook exit 1, the runtime treats that as a **non-blocking** error, and every rung-1 boundary was open for the duration of one read. The only symptom was two `tool.result` events with no matching `tool.requested`.

**`G-13` — a guard that cannot evaluate must deny.** Rung 1. Any internal failure exits 2 with the reason named. A boundary that disappears when its own machinery stumbles was never a boundary. The cost is that a broken config denies everything until a human fixes it: loud, correct and recoverable, against a failure that was silent and total. The hook's handler now cites `G-13` rather than borrowing `G-03`.

**`INC-13`** is transcribed too, and deliberately gets **no new rule**: `P-14` and `T-04` already require a guard to be proven in red, and this is the evidence they were right. Twice a guard shipped with a regex that could never match — a `\b` that became 0x08, a `\1` that became 0x01, both mangled by the shell tooling used to write them. A control byte renders invisibly in `grep`, in an editor and in line output, so the source read correctly in four separate inspections.

## Findings from validating against real state (P-04)

- **A test passed for the wrong reason, and only mutation exposed it.** The first heredoc tests passed while the heredoc regex was broken by a mangled backreference, because their content also sat inside single quotes — so `blankSingleQuoted` was doing the work and the heredoc path was asleep. That is `T-02`'s failure exactly. Replaced with tests nothing else can satisfy, then mutation-tested.

- **The control-byte scan failed on its first real run, against the paragraph describing control bytes.** Writing `\b` and `\1` into the `INC-13` text mangled them the same way. The check works, the tooling is genuinely this fragile, and the incident is now documented by an artifact that had to survive the defect it documents.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test scripts/guards/**/*.test.mjs", "312 pass 0 fail", "6/6 quoting mutants caught"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs", "exit:0, 11 steps green"] }
  bugfix:     { status: passed, evidence: ["8 tests reproducing the false positive, red before the fix", "the real 8-times-failing command shape now runs"] }
  docs:       { status: passed, evidence: ["architecture.md §C INC-12 and INC-13", "40-agent-policy.md G-13", "TASKS.md TASK 10 DONE"] }
  security:   { status: passed, evidence: ["G-13 proven in red with a torn config: exit 2", "every bypass test still denies after the loosening"] }
  content:    { status: passed, evidence: ["check-terms.mjs", "exit:0"] }
  ci:         { status: not_applicable, reason: "no remote exists" }
```

## Next

**Step 11 — evals and the `EVAL-000` baseline.** Ten cases replaying `INC-01`…`INC-13`, then the baseline scored from the trace. This is a **human checkpoint** on the gap list.

Two cases now have origins that did not exist when the ten were first sketched: `INC-12` (a guard that fails open must be caught) and `INC-13` (a guard that cannot fire must be caught). Both are testable — the first by tearing a config, the second by the source scan — and both belong in the suite.

## Files changed

`scripts/guards/lib/shell.mjs` — `stripDataRegions` and `redirectTargets`; `commandContexts` scans the right region for each purpose.
`scripts/guards/lib/path-boundary.mjs` — redirects read off the decomposed command.
`scripts/guards/lib/git-write.test.mjs` — 13 tests: the false positives, and every bypass that must still deny.
`scripts/guards/lib/path-boundary.test.mjs` — 8 tests, same split.
`scripts/guards/lib/sources.test.mjs` — new; the permanent control-byte scan.
`scripts/guards/hooks/pretooluse.mjs` — the fail-closed handler cites `G-13`.
`.claude/rules/40-agent-policy.md` — `G-13`.
`docs/harness/architecture.md` — `INC-12`, `INC-13`, and the derivation row.
`TASKS.md` — TASK 10 `DONE` with what closed it.
