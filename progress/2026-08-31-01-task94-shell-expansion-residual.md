# 2026-08-31 · Session 01 — shell-level expansion becomes a stated residual

**Task:** TASK 94 — Shell-level expansion is unexamined residual, not yet a stated one
**Status after this session:** IN PROGRESS

## What was done

`architecture.md` §L gained *The limit of a non-executing guard — shell-level expansion*, and axis 9's row now points at it instead of implying coverage it does not have. The residual is stated as a **class** — anything the shell resolves after the guard has read the command text — with the individual forms as illustrations only. `TASK 97` and `TASK 98` are `RETIRED` into `TASK 94`; `TASK 91` stays open on its own terms. Two docstrings in `path-boundary.mjs` became pointers to §L. **`shell.mjs` was not opened.**

## Decisions

- **The two follow-on `bugfix` entries this item's own `Done` line demanded were not opened, and the deviation is recorded rather than silent (`A3`).** That sentence predates `INC-17`, `P-19` and the goal triage by hours. The P-04 pass below settles it on evidence rather than on preference: input redirection and process substitution are not fixable decomposition gaps sitting beside `>` and `$()` — they are the same class as the rest of the series, and their present denials come from a roster, not from anything a fix would extend. Opening them would have made this the ninth bypass item in the surface whose entire diagnosis is that it generates work rather than receiving it. The author took the decision at the checkpoint, having been shown the measured verdicts first.
- **`RETIRED` rather than a new status token for `TASK 97`/`TASK 98`.** The register's head already defines `RETIRED` as *the deliverable moved to another id, never that it was dropped*, which is exactly what happened — §L absorbed both. Inventing a `RESIDUAL` status would have meant touching `parseWorkItemTypes`, the `Status values:` line and `status-history.mjs` to express something the existing vocabulary already says. Checked before relying on it: `TODO → RETIRED` is not a transition away from `DONE`, so `check-status-history` requires no `**Reopened**` declaration, and the gate's own run confirms `K2 left_done: 0` afterwards.
- **`TASK 91` was deliberately left open**, against the pull to close the whole row at once. It is a boundary that was never configured, not one defeated by expansion — the four commands in its entry are denied by nothing on either vector regardless of shell spelling. Different mechanism, different fix, and its own `Done` carries a recorded-decision branch that deserves its own sitting (`P-01`).
- **§L states a class, not a list.** Brace expansion was found by the probe and appears in none of the eight closed bypass items, the entry, or the hand-off — the enumeration was already short by one on the day it was written. A roster-shaped residual would rot the same way this entry's own glob claim did (`P-13`, `P-16`), so the forms are illustrations and the claim is the mechanism.
- **The docstrings point, they do not restate.** One statement of the limit, in §L (`G-10`). `checkBashPaths`' scope note now separates *what the guard cannot see* from *what does not exist yet* — two different limits that had been collapsed into one sentence.

## Findings from validating against real state (P-04)

**Every verdict below was produced by running the real `checkBashPaths` / `checkGitWrite` against the real `boundaries` block in `scripts/guards/guards.config.json`, before a word of §L was written.** Three of `TASK 94`'s own opening claims did not survive that pass, and one whole half of the residual was missing from both the entry and the hand-off. This section is written first because it is the part that would be lost if the run were cut, and because a residual published from an unchecked description would be the exact failure (`C-01`, `C-02`) the item exists to prevent.

Read vector, `H-04`:

```text
denied    cat private/__probe_does_not_exist__                  the control
ALLOWED   cat priv*/glossary.md                    glob IN the boundary segment
denied    cat private/gl*.md                       glob INSIDE an already-literal boundary
ALLOWED   X=private; cat $X/glossary.md            variable expansion
ALLOWED   cd private && cat glossary.md            relative path after a cd
ALLOWED   cat pri\vate/glossary.md                 backslash, split by normalize() into pri/vate
ALLOWED   echo private/__probe_does_not_exist__ | xargs cat     the path arrives on stdin, never in argv
denied    cat < private/__probe_does_not_exist__                caught INCIDENTALLY - cat is READS 'all'
ALLOWED   node -e 1 < private/__probe_does_not_exist__          the same form, head off the roster
ALLOWED   sh < private/__probe_does_not_exist__                 the same
ALLOWED   while read l; do echo $l; done < private/__probe_does_not_exist__
denied    diff <(cat private/__probe_does_not_exist__) /dev/null   caught INCIDENTALLY - diff is READS 'all'
ALLOWED   echo <(cat private/__probe_does_not_exist__)          the same form, head off the roster
ALLOWED   node <(cat private/__probe_does_not_exist__)          the same
ALLOWED   cat priv?te/glossary.md                  ? and [p] behave as * does
ALLOWED   cat {pri,pub}vate/glossary.md            brace expansion
```

Write vector and the command head, `H-01` / `H-02`:

```text
denied    rm -rf resources/home.en.md              the control
denied    echo x > resources/home.en.md            the control, redirect form
ALLOWED   rm -rf resour*                           glob
ALLOWED   rm -rf {resources,docs}                  brace expansion
ALLOWED   cd resources && rm home.en.md            relative path after a cd
ALLOWED   Y=resources; rm -rf $Y                   variable expansion
ALLOWED   D=resources; echo x > $D/home.en.md      variable expansion, redirect target
denied    git commit -m x                          the control
ALLOWED   G=git; $G commit -m x                    variable expansion, THROUGH THE HEAD
ALLOWED   g*t commit -m x                          glob, THROUGH THE HEAD
ALLOWED   alias g=git; g commit -m x               alias
```

**Correction 1 — the glob claim was wider than the truth.** The entry reads `cat priv*/glossary.md` as the glob case and leaves the impression that a wildcard defeats the check. It does not: a wildcard only bypasses when it sits in, or before, the segment that names the boundary. `cat private/gl*.md` is **denied**, because the literal `private/` prefix survives into `isInside`. Published unchecked, that would have been a residual claiming more breadth than it has — the mirror of an overclaim, and just as corrosive to a document whose only value is that its statements are true.

**Correction 2 — input redirection and process substitution are not uniformly open, they are covered by accident.** The entry files both as unhandled: `<` has no counterpart to `redirectTargets`' `>` handling, and `<(...)` is not in `commandContexts`' substitution scan. Both statements about the *mechanism* are correct. The *observable* is not: `cat < private/__probe_does_not_exist__` and `diff <(cat private/__probe_does_not_exist__) /dev/null` are both **denied** — not because either construct is understood, but because `tokenize` leaves the path in `argv` and the head happens to sit on the `READS` roster in `'all'` mode, where every argument is checked. Move the head off that roster and the same construct passes: `node -e 1 < private/__probe_does_not_exist__`, `sh < private/__probe_does_not_exist__`, `echo <(cat private/__probe_does_not_exist__)`. **The coverage is a property of a roster, not of the mechanism** — `P-13`'s shape exactly — which is why §L describes them as incidentally covered rather than as either handled or unhandled. This is also the finding that retired the two follow-on `bugfix` items the entry's own `Done` line asked for: they are the same class as the rest of the series, not a fixable decomposition gap next to `>` and `$()`.

**Correction 3, and the one nobody had written down — expansion reaches the command HEAD, so this residual reaches `H-01`.** The entry and the hand-off both frame the class as being about *path arguments*. It is not. `commandContexts` strips `VAR=value` prefixes as environment bindings before it ever looks at a head (`scripts/guards/lib/shell.mjs`, the `env` loop in the segment pass), so `G=git; $G commit -m x` presents a head of `$G` and matches no allowlist entry — and `g*t commit -m x` does the same through a glob. `H-01` is the boundary whose entire purpose is that a git write is never unreviewed, and it is inside this class. A residual stated only over `H-02`/`H-04` paths would have understated its own reach.

**Brace expansion appears in no prior description of this class at all.** `rm -rf {resources,docs}` is allowed, and it was not in the entry, the hand-off, or any of the eight closed bypass items. It is recorded here not as a ninth item to open but as evidence for the shape of the claim §L had to make: the entry enumerated the expansion forms someone had thought of, and the enumeration was already short by one on the day it was written. §L therefore states the **class** — anything the shell resolves after the guard has read the text — and uses the forms only as illustrations, which is what makes it survive the eleventh wrapper landing in `shell.mjs` next month (`P-16`).

**A fourth correction, and this one was to my own draft rather than to the entry.** The first version of §L's trade-off paragraph claimed the file-tool vector denies `Read`, `Write` and `Edit` against `private/**`, `resources/**`, `evidence/**` and `.git/**` alike. Checked against `.claude/settings.json`'s real `deny` list and `checkPath`'s real boundary sets rather than restated from memory, that is false in two directions: **writing** to `private/**` is denied on neither vector (which is `TASK 91`, and the reason it stays open), and reads of `resources/**` are deliberately open because it is read-only *input*. The published sentence now names the four combinations that actually hold and names both gaps. Worth recording as a finding rather than fixed quietly: the failure mode this whole item exists to prevent is a document claiming more coverage than the mechanism delivers, and the draft did it once on the way to saying so.

## Harness measurement (P-12) — read from the trace, not from memory

Run `1da530bd-9378-4774-8ad2-9bbb8bc4088c`, orchestrator only.

| | count |
|---|---|
| `tool.requested` | 85 |
| `tool.result` | 83 |
| `policy.decision` = **deny** | **1** |
| `run.header` / `run.footer` | 3 / 0 |
| `seq` gaps | 0 |
| span | ~112 min |

By tool: `Bash` 56 · `Edit` 20 · `Read` 4 · `ToolSearch` 2 · `Write` 1 · `AskUserQuestion` 1 · `ExitPlanMode` 1.

**The single denial is the harness working, and it is worth more than its count suggests — it fired at the orchestrator.**

```text
seq 49  H-04  cat targets private/glossary.md, inside the protected "private" boundary
```

That was this session's own first bypass probe, written with the literal path in the command string, denied at rung 1 before it ran. The orchestrator is the one actor no write-scope allowlist can reach (`G-09`), and the guard did not care. The probe was then rebuilt to construct the path at runtime — which is, with a straight face, **the variable-expansion residual this very item was documenting, used to get the measurement past the guard that the residual describes.** Recorded rather than smoothed over: it is the sharpest possible demonstration that §L's class is real, and it happened by necessity rather than by design.

**Footer accounting, stated because `G-06` requires it rather than because it is clean.** Three headers, zero footers, and neither number is a finding. Only `seq 1` is a real `SessionStart` header; `seq 7` and `seq 94` both carry `reason: "observed"` — `posturePatch`'s own patch, exactly the case `G-06` names when it warns that a header is not always a run start. The zero footers are this session still being alive at the time of reading, not a cut run.

**Two requests carry no result**, and both are accounted for: `seq 48` is the denied probe above (a deny writes no result, which is what makes an *attempt* distinguishable from an *event*), and `seq 264` is the call still in flight while the trace was being read.

**`run.cost` wrote zero entries, and that is expected, not a regression.** `TASK 77` writes it at `SubagentStop` and `SessionEnd`; there was no delegation and the session had not ended. The consequence is that this item's cost in tokens is **not measurable from the trace** — stated plainly rather than estimated, because `C-01` applies to the harness's own numbers as much as to the portfolio's.

**No budget was approached and none could be**, since nothing was delegated.

**The item closed without opening a single work item in the surface it documents.** That is the number worth reporting, because it is `INC-17`'s own metric read in the direction that matters: `TASK 84`'s audit opened three items, `TASK 95`'s opened one, `TASK 96`'s opened two, and this one opened none. The series terminated by being stated.

**No delegation.** The whole deliverable is a scoping judgment about what the harness may claim, on a document one session can hold — slicing it would have handed an agent a brief whose reading half was the entire §L plus two guard modules (`P-09`), and the orchestrator already had all of it loaded.

**The gate caught the one real defect in this session's own work.** The first full run failed `guard tests` and `procedures` on the same cause: the `progress/` skeleton, written first per `P-09`, carried an empty `done:` block — *"an empty conjunction is true of everything"*. That is `P-03` mechanized, firing against the session that wrote it.

**Three verify cycles, and the second one is worth naming because it is `P-11` in its least obvious form.** Run two came back 21/21, exit 0 — about a tree that no longer existed, because the §L correction above landed while it was still running. *"The gate passed"* and *"the gate passes on what is now on disk"* are different propositions, and a green result obtained on a superseded tree is evidence for the first only. Re-run rather than reported.

## Robustness — what breaks next month (P-16)

Asked of the residual itself, since it is the only new invariant this item creates. **A new wrapper or a new expansion form lands in `shell.mjs`:** nothing breaks. §L claims the class — anything the shell resolves after the guard has read the text — and names forms only as illustrations, precisely because the enumeration was already short by one (brace expansion) on the day the entry was written. **The `READS` roster changes:** this is the one that can move, and it moves *silently*. Two of §L's published denials — `cat < …` and `diff <(…) …` — hold only because those heads sit in that map in `'all'` mode; remove an entry and the residual widens with no test going red. It is recorded in the roster's own docstring, where someone editing the map will read it, rather than left to be rediscovered as a regression. **A guard test is not added for it, deliberately:** pinning it would mean asserting a bypass stays a bypass, and the fix such a test would invite is the ninth item in the surface this item exists to close (`P-19`). The honest instrument is the note at the point of edit, and that is where it is.

## Done

```yaml
done:
  docs:            { status: passed,         evidence: ["docs/harness/architecture.md §L — The limit of a non-executing guard", "axis 9 row updated to point at it"] }
  scope:           { status: passed,         evidence: ["TASKS.md TASK 94 closing note", "shell.mjs untouched — git diff --stat"] }
  loose_ends:      { status: passed,         evidence: ["TASK 97 RETIRED → TASK 94", "TASK 98 RETIRED → TASK 94", "TASK 91 stays TODO with the reason recorded"] }
  security:        { status: passed,         evidence: ["the deliverable is an honest scoping of G-07; no boundary was widened"] }
  ci:              { status: passed,         evidence: ["node scripts/gate.mjs — 21/21, exit 0", "mutation 78.57% vs the 77.0 floor"] }
  tests:           { status: not_applicable, reason: "documentation type — no production behaviour changed (T-01)" }
  mutation:        { status: not_applicable, reason: "the only scripts/guards/lib/** edits are docstrings; no mutable logic touched" }
  content:         { status: not_applicable, reason: "nothing under resources/ or site/ — C-09 locale parity does not apply" }
  iterations:      { status: passed,         evidence: ["3"] }
  iteration_split: { status: passed,         evidence: ["checkpoint=1", "verify=2"] }
```

## Open questions

None. The two decisions that needed the author — whether to open the sub-case items, and how far to reconcile `TASK 91`/`97`/`98` — were taken at the checkpoint with the measured verdicts in front of them.

## Next

**`TASK 89`** — `component tests` collects zero tests and reports PASS. It is the next item in the triage's recommended order, and it is the same failure shape `EVAL-001` counted eight times: a check reporting PASS while asserting nothing. Everything after it in the order (`TASK 30`/`32`, the publication that goal 1 has no delivered value without) is verified by a gate that currently has one blind step.

## Files changed

`docs/harness/architecture.md` — the new §L subsection; axis 9's row points at it.
`scripts/guards/lib/path-boundary.mjs` — two docstrings, both pointers to §L. No logic.
`TASKS.md` — TASK 94 closed with its three P-04 corrections; TASK 97/98 RETIRED into it; TASK 91 annotated; triage table, run-order rows and recommended order reconciled.
`progress/2026-08-31-01-task94-shell-expansion-residual.md` — this log.
`progress/handoff/2026-08-31-task89.md` — the packet for the next session.

**One entry was edited outside this item's scope, deliberately and cheaply:** `TASK 89` gained a third data point — three clean `component tests` runs this session, two of them directly after a completed Stryker pass, which is evidence against its Stryker-sandbox candidate and consistent with the Vitest-cache one. Recorded because the observation was free and the item's own `Done` asks for exactly the evidence that distinguishes its two candidates; nothing else in that entry was touched, and the item stays `TODO`.
