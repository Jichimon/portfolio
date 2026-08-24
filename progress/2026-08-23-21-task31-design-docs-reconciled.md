# 2026-08-23 · Session 21 — TASK 31: the design documentation reconciled with what was built

**Task:** `TASK 31` — Reconcile the brief and the decision docs with what was built · `content`
**Status after this session:** IN PROGRESS

## What the author asked for

> *"Vamos con task 31, quisiera que definás muy bien las cosas porque para la ejecución será sonnet… asi que arma todo el contexto posible y plasmalo bien en el plan… Se hicieron muchas correcciones hasta tener un diseño presentable… asi que todo esto tiene que quedar plasmado en el brief… hay muchos puntos importantes"*

Two requirements, and the second is the one that shapes the work: the execution is delegated to `sonnet`, so **the plan carries the findings and the agent does the writing**. Fifteen review rounds of design history live in `progress/`; an agent asked to re-derive them from the logs spends its whole budget on archaeology and delivers nothing (`P-09`).

So the correction ledger — seventeen rows, each a statement the brief makes that the artboards contradict — was assembled during planning and pasted into the delegation brief. The agent's job is writing, not discovery.

## Three decisions taken with the author before writing

| Question | Decision | Why it changed the work |
|---|---|---|
| Does the brief stay a prompt? | **No — it becomes the design specification of record** | The file still says *"Paste the section below into Claude Design"*. That job finished on 2026-08-23. The register calls it *"the input artifact every implementation item reads"*, and those are two different documents. The prompt framing moves to a History section |
| What is in scope? | **All design documentation, and the logs as its evidence base** | The brief, both decision docs, the canvas README, `canvas.json`'s annotations, and the stale claims in `TASK 8`'s own entry |
| Where does the property check live? | **`verify.mjs`, made portable, wired into `gate.mjs`** | Otherwise it is a check that exists and does not check — `INC-08`'s shape — and it breaks the day the deploy item runs CI on Linux |

**On "and the logs":** progress logs are `P-05` records of what happened and are **never rewritten** — a reconciled log records what someone wishes had happened. They are in scope as the *source*: every correction in the spec cites the log that owns it, which is `TASK 31`'s own constraint (*"the reasoning trail in `progress/` is the evidence and should be cited, not restated"*), and the spec's History section is what makes fifteen logs navigable.

## Six findings from validating against real state before planning (`P-04`)

Every one of these changed what the plan could say:

1. **There are two decision docs, not three.** `TASK 31`'s own entry says *"the three decision docs"*. `docs/design/decisions/` holds two; the third document in that class is `docs/design/canvas/README.md`. The entry is corrected as part of this item.
2. **The component sheet has fifteen groups, not fourteen.** `TASK 8`'s status line says fourteen — session 18 added the logo slot after that sentence was written and the count was never revisited.
3. **`verify.mjs` is not a gate step.** `gate.mjs` runs thirteen steps and the canvas verifier is not among them, so its eight properties run only when someone re-seeds the canvas by hand — which, now that the design is frozen, may be never.
4. **`verify.mjs` hardcodes `c:/dev/projects/portfolio/...` twice** (lines 18 and 22). A gate step carrying a Windows absolute path fails on the first CI run.
5. **There is a fourth breakpoint.** `Main.dc.html` carries `@media` at 1180, **820 and 560**. The documented contract says "three states". The 560px rule is a refinement, not a fourth state — but a document that omits it contradicts the file it describes.
6. **`content` is not in `specRequiredFor`.** `guards.config.json` lists `["feature","migration"]`, so `H-05` permits a write-capable delegation for this item with no spec — it needs only the item id in the brief and the entry present in the register.

## The finding this session did not go looking for: what `H-05` actually reads

The first delegation of slice A was **denied at rung 1**:

```text
DENIED by H-05 (delegation-gate): TASK-22 is typed `feature`, which produces a
spec, and no spec file names it as its work_item.
```

The brief was for `TASK 31`. It was denied over an item it merely **mentioned** — one sentence read *"the document `TASK 22`–`TASK 26` read"*, naming two `feature`-typed items purely as downstream context.

`extractWorkItems` scans the **entire brief text** for `/\bTASK[\s-]?(\d+)\b/gi` and treats every hit as an item being delegated against. There is no declared field distinguishing *the item I am working on* from *an item I am referring to*.

**The guard is right to fail closed**, and this is not a defect to route around. Deriving the item set from the brief rather than from a field the orchestrator fills in is `P-13`'s shape — a declared field would be a roster, and an orchestrator that forgot to fill it would get a silently ungoverned run. The cost is that a brief cannot name a `feature`-typed item in passing, which is a real constraint on how briefs are written and was not written down anywhere.

**The fix applied here:** downstream `feature` items are named descriptively in delegation briefs — *"the page implementation items"*, *"the content-layer item"* — and the brief carries an explicit instruction listing the ids that must not appear literally. Ids for `content`, `research`, `harness` and `maintenance` items are safe, because those types are not in `specRequiredFor`.

**This belongs in the register**, not only in this log (`P-06`) — it is a constraint every future delegation brief has to satisfy, and the second rung-1 denial in this project to teach something about how the harness actually behaves rather than how it was assumed to behave.

## Execution

Three sequential delegations to `implementer` on **sonnet**, ownership disjoint (`G-12`), sliced by object rather than surface (`P-09`):

| Slice | Files | Status |
|---|---|---|
| **A** | `docs/design/claude-design-brief.md` — the specification | **done** |
| **C** | `verify.mjs` — portability + the bidirectional check · `gate.mjs` — the step | delegated |
| **B** | both decision docs · canvas `README.md` · `canvas.json` · `TASKS.md` | pending |

**B and C were swapped after A landed.** B has to document the property count and the gate step that C creates, and documenting what exists beats documenting what was intended (`P-11`). Recorded because the approved plan said A→B→C.

## Slice A — the specification, and the error it found in the plan

The file stopped being a Claude Design prompt and became the design of record: twelve sections, 326 lines, all seventeen ledger rows answered, all fifteen artboards named.

**Verified by the orchestrator rather than accepted from the report** (`P-11`): `git status` shows only that file touched; `grep` over the specification returns exactly the fifteen `.dc.html` filenames on disk, matching in both directions; `check-docs` PASS (49 living docs, 152 refs resolved) and `check-terms` PASS (33 terms × 228 files) on an independent run.

**The finding that matters is that the agent corrected the plan.** The brief's "content still missing" table — written by the orchestrator during planning — described About's three photographs as *"portrait 4:5, panorama 21:9, square 1:1"*. The agent checked `About.dc.html` instead of trusting the ledger and found `photo-pano` at `aspect-ratio: 21/9` and **two** `photo-tall` at `4/5`. There is no 1:1 square anywhere in the source.

The orchestrator had taken that detail from `canvas.json`'s `note-pass2-reading` annotation without opening the artboard — the exact `P-04` failure the rule exists for, committed while writing a plan whose whole purpose was to spare the agent from doing archaeology. The instruction *"the artboards are pixel truth; where a document and a screen disagree, the screen wins"* is what caught it, which is an argument for stating that in every brief rather than assuming it.

The stale `canvas.json` annotation is now a slice-B correction. The specification carries a note saying the annotation is stale rather than silently diverging from it.

## Slice C — the check, and what it cost to prove

`verify.mjs` lost both absolute Windows paths, gained a ninth property, and became a gate step named `design canvas`. `gate.mjs` delegates to it rather than re-listing its checks (`T-09`), so a tenth property added next month reaches the gate without anyone editing `gate.mjs`.

The new property, derived from both artifacts and from no roster (`P-13`):

- every `*.dc.html` in `src/` is named by the design specification
- every `*.dc.html` the specification names exists in `src/`

**The report arrived as a single line — "378 tests, all passing" — with none of the four red/green transcripts the brief made the deliverable.** So the red paths were re-run by the orchestrator rather than accepted (`P-11`, `P-14`):

```text
RED 1 — remove NotFound.dc.html from the specification
FAIL
  NotFound.dc.html: exists in src/ but the design specification never names it
exit=1

RED 2 — specification names a screen that does not exist
FAIL
  the design specification names Ghost.dc.html, which does not exist in src/
exit=1
```

Both restored to `exit=0`, the specification byte-identical afterwards (`cmp -s` → YES). Guard suite 378/378. The check is real in both directions.

**The reporting gap is the finding here, not the code.** A thin report is not a failed run, but "I proved it in red" and "here is the transcript of it failing" are different propositions and only the second is evidence. The brief asked for the transcripts explicitly and got a summary, which is exactly the substrate problem `INC-02` names — and the reason `P-11` says verify the artifact.

## The second denial, and why the finding could not be quoted

Slice B's first brief was **denied at rung 1 as well** — and this one is worth keeping.

The brief was for `TASK 31`. It was denied because it **quoted the text of the first denial**, and that error message contains the id of the `feature`-typed item that caused it. `/\bTASK[\s-]?(\d+)\b/gi` matches inside a quoted error exactly as it matches in prose.

**The finding cannot be transmitted by quoting it.** Writing down *why* a delegation was denied reproduces the denial. It has to be paraphrased — which is a genuinely surprising property of a text-scanning guard, and precisely the kind of thing that is cheap to record now and expensive to rediscover.

Neither denial is a defect. A guard that reads the brief rather than a field the orchestrator fills in cannot be quietly bypassed by an orchestrator who forgets the field, and that is the trade this harness took on purpose. The constraint it creates is now going into the register's execution model through slice B, because a rule that lives only in a session transcript is invisible to the next session (`P-10`).

## Slice B — four files delivered, the fifth cut short

The two decision docs, the canvas README and `canvas.json` landed well:

- **`2026-08-20-hero-direction.md`** — the "What carries forward unchanged" bullet no longer claims the ~230° cyan accent survived, which the same document's revisions section had contradicted two screens further down. A section titled *unchanged* disagreeing with a section titled *revisions* is worse than either alone. The blur is recorded as settling at 11px rather than the 6px first landed on, and the three-rejection history of the seam marker is now in the doc rather than only in the logs.
- **`2026-08-22-site-structure.md`** — gained the language switcher as chrome on every page and the 404 as a live destination that keeps its rail.
- **`canvas/README.md`** — Playwright re-attributed from `TASK 15` to `TASK 27`, "eight properties" → nine, the gate step recorded, and the "What's next" section rewritten to say *nothing, for this canvas* instead of listing three shipped items as pending.
- **`canvas.json`** — page title, the two stale annotations, and the **1:1 photo error** corrected to match `About.dc.html`. JSON re-parses; `verify.mjs` PASS.

**`TASKS.md` was not touched — the run stopped before reaching it.** The report ended mid-sentence, which is `P-09`'s shape: a slice sized to five files finished four. Four-fifths delivered is better than the zero `P-09` warns about, but the item was not done and the report did not say so — the orchestrator found it by checking the file rather than by being told (`P-11`).

**Finished by the orchestrator rather than re-delegated**, deliberately: the register is the orchestrator's own instrument, session 20 set that precedent, and one of the five corrections is a harness fact discovered in this session that no agent had the context to write. Re-spinning an agent for five string edits costs more than it buys.

The five register corrections: fifteen component groups not fourteen · `verify.mjs`'s nine properties and its gate step · eleven **live** artboards *including* the sheet, plus four history boards, replacing a phrasing that read as twelve · the preserved pass-1 note marked **superseded** instead of leaving a present-tense "remain" that is false · and `TASK 31`'s own deliverable line, which said "the three decision docs" when there are two, now naming the four documents it actually reconciles and saying that the item it describes is what counted them.

## A defect the orchestrator introduced and caught

Writing the execution-model paragraph, a backslash-escaping layer between the shell heredoc and the file turned `\b` into **literal `0x08` backspace characters** — two of them, invisible in every editor and in `git diff`, sitting inside the register.

Found by scanning for control characters rather than by reading, and repaired by building the backslash with `chr(92)` so no escape sequence existed to be eaten. Worth recording because **nothing in the gate would have caught it**: `check-docs` resolves paths, `check-terms` scans for banned strings, and neither has an opinion about control characters in prose. It was found because a `SyntaxWarning` about an invalid escape sequence made the write suspicious.

## Verification

| Step | Result |
|---|---|
| guard tests | 378/378 PASS |
| `check-rules-registry` · `check-terms` · `check-templates` · `check-settings` | PASS |
| `check-contracts` · `check-agents` · `check-docs` · `check-context-budget` | PASS |
| `check-content` · `check-evals` · `check-procedures` | PASS |
| `design canvas` (`verify.mjs`) | PASS — 15 artboards · 10 pages + 1 document · 9 properties |
| `canvas.json` parses | yes |
| control characters in `TASKS.md` | none |
| `node scripts/gate.mjs` | **FAILS at step 9, `check-trace`** — pre-existing, `TASK 12` owns it, `H-03` blocks every agent from `evidence/` |

The new `design canvas` step sits after `check-trace`, so it does **not** run in a full gate invocation until `TASK 34` lands. That is `TASK 34`'s finding, already tracked, and the reason every step above was run individually.

```yaml
done:
  docs:       { status: passed, evidence: ["docs/design/claude-design-brief.md — rewritten as the design specification of record: 12 sections, 326 lines, 17 corrections answered, all 15 artboards named", "both decision docs reconciled; canvas README and canvas.json corrected; TASKS.md: 5 corrections plus the H-05 brief constraint added to the execution model"] }
  content:    { status: passed, evidence: ["check-terms PASS — 33 terms x 228 files", "nothing in resources/** touched; H-02 holds", "C-01: the +10% Spanish delta is reported with its n=37; no other figure invented"] }
  gate:       { status: partial, evidence: ["11 of 11 guard steps PASS individually", "design canvas PASS", "guard tests 378/378", "node scripts/gate.mjs FAILS at step 9 check-trace"], reason: "check-trace fails on TASK 12's pre-existing correlation gap, which H-03 forbids any agent from fixing. Every other step was run individually for that reason" }
  tests:      { status: passed, evidence: ["verify.mjs check 9 proven in RED by the orchestrator in both directions: removing NotFound.dc.html from the specification -> FAIL + exit 1; naming Ghost.dc.html -> FAIL + exit 1; both restored to exit 0, specification byte-identical (cmp -s)", "guard suite 378/378 unchanged after the gate.mjs edit"], reason: "T-01: TDD applies to slice C (scripts/** is the mutation-covered surface) and not to slices A and B, which are content" }
  scope:      { status: passed, evidence: ["one deliverable: the design documentation matches what was built, and a check now fails when it stops matching", "8 files changed, ownership disjoint across three slices (G-12)", "no artboard edited, no progress log rewritten, no git write (H-01)"] }
  loose_ends: { status: passed, evidence: ["the H-05 brief-naming constraint landed in the register's execution model rather than staying in this log (P-06)", "the canvas.json 1:1 photo error was corrected at its source, and the specification note that flagged it now reads as resolved", "the design canvas step not running behind check-trace is named here and owned by TASK 34"] }
  mutation:   { status: not_applicable, reason: "no code in site/lib/content/** exists yet; the gate.mjs and verify.mjs edits are gate wiring, covered by the 378-test guard suite and by the red-path proof above" }
  security:   { status: not_applicable, reason: "no boundary, guard verdict or permission changed. verify.mjs became a gate step, which adds a check rather than relaxing one" }
  iterations: { status: passed, evidence: ["3"] }
```

`iterations: 3` — two rung-1 denials that were the guard working correctly, and one slice that stopped four files into five. None was a defect in the delivered work.

## Next

`TASK 33` — `ADR-007` for the component model and the dated amendment to `ADR-006` for the component test tier. It is `research`, needs no spec, and every `feature` spec below it cites both in `governed_by`.
