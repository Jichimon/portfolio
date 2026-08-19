# 2026-08-18 · Session 02 — TASK 5, step 6 closed and the two open questions answered

**Task:** TASK 5 — AI Agent Development Harness v2
**Status after this session:** IN PROGRESS (steps 1–6 done, step 7 next)

## What was done

Closed step 6 — the `delegation-gate` and the `check-terms` port — and settled the two open questions the previous session left for step 12. Answering them was not bookkeeping: one of them turned out to be a **factual error in a rule**, and correcting it moved `G-04` from rung 4 to rung 1.

Tests went 96 → 153, the gate stayed green at seven steps, and contracts went from 2/6 enforced to 3/6.

## The two open questions, answered against the documentation

**Do `PreToolUse` hooks run under `bypassPermissions`? Yes.** The mechanism matters more than the answer: *"When Claude Code makes a tool call, PreToolUse hooks run before the permission prompt, for every tool except `EndConversation`,"* and *"A hook that exits with code 2 stops the tool call before permission rules are evaluated."* Hooks are not part of the prompting layer at all, so a mode that skips prompts cannot remove them. Deny rules are equally explicit: *"Deny rules block in every mode, including `bypassPermissions`. Allow rules have no effect in `bypassPermissions`."* `G-03` was right in substance and imprecise in wording — it said *"everything else is removed by it"*, which read as though hooks were removed too, contradicting its own first sentence. Reworded.

**Does `settings.json` take effect in the session that writes it? Yes.** *"Claude Code watches your settings files and reloads them when they change, so edits to most keys apply to the running session without a restart. This includes `permissions`, `hooks`."* The previous session's caveat is retired.

**And one thing nobody asked, which was the session's most valuable find.** `G-04` read: *"This project cannot enforce that — disabling the mode requires machine-level managed settings."* **That is false.** *"`disableBypassPermissionsMode` is typically placed in managed settings to enforce organizational policy, but it works from any scope."* One line in `.claude/settings.json` enforces the rule the harness had settled for merely declaring. This is `P-04` paying for itself — the claim had been asserted in a planning conversation and carried into a rule without anyone checking it.

## Decisions

- **The delegation gate resolves the spec from the work item the brief names**, not from a repo-wide scan. `contracts.md` said it would deny *"while any spec is `draft`"*; implementing that literally would deny work on TASK 7 because an unrelated TASK 12 spec was being drafted. A guard that blocks legitimate work is a guard someone turns off, so the contract prose was corrected to match the narrower, correct rule.
- **A write-capable brief that names no work item is denied outright.** A run with no work item is ungoverned by definition, which is the state `INC-05` actually describes — the plan approval was ungoverned, not merely unapproved.
- **Write-capability is decided by an allowlist of read-only tools, never a roster of write tools.** The direction is the whole point: a tool the runtime ships next month is unknown, so it is treated as write-capable and the gate gets *stricter*. A write-tool roster would wave the new tool through silently — `INC-07`'s shape.
- **An undeclared role fails closed but is not banned here.** No role file means no `tools` list, so nothing proves it read-only and `H-05` gates it. Whether an undeclared role may be delegated at all is `G-05`'s question at rung 2, and this guard claims nothing about it. Two rules, two rungs, no overclaim.
- **`check-terms` findings mask the term and cite `banned-terms.txt:<line>`.** The shell version printed `LEAK: '<term>'` and the full matched line. Run by an agent — which is how the gate runs — that copies the confidentiality mapping into the transcript, the guard becoming the leak it exists to prevent (`H-04`). The location is what a human needs to act; the term is not.
- **The `--root` fixture flag.** Proving the terms scan in red needs a file containing a banned term, and planting a real one would put it in the transcript and the diff. The flag lets the guard's own tests build a fixture repository with fixture terms. A fixture run prints `FIXTURE ROOT, git checks skipped`, so it can never be misread as a real confidentiality pass.
- **The `PreToolUse` matcher is validated against the hook's own dispatch.** `check-settings` parses `tool === '...'` out of `pretooluse.mjs` and asserts the matcher names every one. Add a branch, and the matcher is required to carry it — no roster, and `A4`'s liveness assertion becomes structural rather than a one-time check.

## Findings from validating against real state (P-04)

- **`G-04` asserted something untrue about the tool.** Documented above. Rung 4 → rung 1; `architecture.md` §L corrected in the same change; `check-settings` now asserts it so the claim cannot drift back.
- **`disableAllHooks` is a single point of failure nobody had noticed.** Every guard in this harness rides on hooks, and one line in a *user* settings file switches them all off. Project settings win — *"a `disableAllHooks: false` in a project's `.claude/settings.json` overrides a `true` in your user settings"* — so it is now pinned `false` and checked. The residual is `--settings '{"disableAllHooks": true}'` at launch, which outranks project settings; that is an out-of-band human act at the same level as editing the settings file, and it is recorded rather than papered over.
- **The masking test caught a real leak in the masker.** `formatFinding` masked *its own* term, so a line containing two different banned terms printed the second one in the clear. Masking now happens at scan time against every term, and an unmasked context never exists on the returned object at all. Found by the test, not by reading it.
- **Two parser bugs, both found by tests rather than review.** `parseYamlish` returned quoted values with the quotes attached; `parseRoleTools` read the closing `---` of a frontmatter block as a list item named `--`, because `-` was not required to be followed by whitespace.
- **One test was wrong, not the guard — again.** The binary-detection test used the PNG magic number alone, which contains no NUL byte and is therefore text by this heuristic *and* by `grep -I`. Corrected to carry a NUL, with the reasoning left in the test.
- **`check-contracts` fired on its own path claim.** The Run contract's enforcer was listed as `hooks/delegation-gate.mjs`; the guard is a pure function in `lib/`, dispatched from the single hook entry point. Corrected to the real path, and the row moved to `built`.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test scripts/guards/**/*.test.mjs", "153 pass 0 fail"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs", "exit:0, 7 steps green"] }
  content:    { status: passed, evidence: ["check-terms.mjs", "33 terms × 95 files, exit:0"] }
  docs:       { status: passed, evidence: ["contracts.md Run row + prose", "40-agent-policy G-03/G-04", "architecture.md §L + invariant 21", "TASKS.md step 6"] }
  ci:         { status: not_applicable, reason: "no remote exists" }
  security:   { status: passed, evidence: ["bypassPermissions disabled at project scope", "disableAllHooks pinned false", "both proven in red against the real settings file"] }
```

## Open questions

None outstanding from step 6. Two were closed this session; neither replacement question emerged.

One item is **recorded, not open**: `--settings '{"disableAllHooks": true}'` and a CLI-scope settings override outrank project settings. Nothing at project scope can prevent that, and no claim in the harness says otherwise. It belongs in `architecture.md` §L's residual list when step 12 freezes the security claims.

## Next

**Step 7 — Evidence.** The three-event trace (`tool.requested` → `policy.decision` → `tool.result`), the monotonic `seq`, redaction against `banned-terms.txt` at write time, `retainRuns: 50`, and `record-event.mjs` on the hook events. `evidence/**` is `H-03`: written by hooks only, and the guard denying every other vector already exists and is tested.

Step 7 opens a subsystem that shares little with step 6, so it is a clean compaction boundary.

## Files changed

`scripts/guards/lib/delegation-gate.mjs` + tests — new; `H-05`, 29 tests including an end-to-end fixture that flips a spec draft → approved → drifted.
`scripts/guards/lib/terms.mjs` + tests — new; matching, exclusion and masking, 14 tests.
`scripts/guards/gate/check-terms.mjs` + tests — new; the walk and its red-path battery, 10 tests.
`scripts/check-terms.sh` — reduced to a thin wrapper over the Node port (`D6`).
`scripts/gate.mjs` — step 3 now calls the port instead of bash.
`scripts/guards/lib/settings.mjs` + tests — three new assertions: `disableAllHooks`, `disableBypassPermissionsMode`, and matcher coverage derived from the hook's dispatch.
`scripts/guards/gate/check-settings.mjs` — derives `requiredMatchers` from `pretooluse.mjs`.
`scripts/guards/guards.config.json` — the `delegation` block, every entry carrying a reason.
`.claude/settings.json` — `disableAllHooks: false`, `disableBypassPermissionsMode: "disable"`.
`.claude/rules/40-agent-policy.md` — `G-03` reworded, `G-04` corrected and re-rung.
`docs/harness/architecture.md` — §L corrected, invariant 21 sharpened.
`docs/harness/contracts.md` — Run row `built`, enforcer path corrected, gate prose rewritten to the rule actually implemented.
`TASKS.md` — step 6 closed; the known gap marked closed with what replaced it.
