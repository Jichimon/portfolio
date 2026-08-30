# EVAL-0NN — <what was evaluated>

<!-- TEMPLATE. instances: progress/evaluation-results/ Copy to EVAL-0NN-<slug>.md, fill, delete these guidance comments.

     THE SHAPE IS FIXED. Comparability across runs is the entire point of this artifact,
     and it is lost the moment someone restructures one for readability. -->

> **Mode:** A (retrospective replay) | B (live evaluation)
> **Date:** <YYYY-MM-DD> · **Compared against:** EVAL-000 (baseline) and EVAL-<0NN-1>
> **Question this answers:** <one line>
> **enforcement_environment:** policy-controlled | os-sandboxed
> **permission_mode observed:** <from the run headers — a bypassPermissions run is excluded>

<!-- The last two fields exist because a scorecard produced under a different enforcement
     regime is not comparable to this one, and nothing else would record the difference. -->

## Scope — what was read, what is excluded

<Named artifacts. And explicitly: what was NOT read, and why.>

## Biases of this run — declared, not disclaimed

1. **Circularity** — was the instrument changed by the work it is scoring?
2. **Composition** — is the scored work mostly harness work, so the harness is being
   scored on itself?

<An undeclared bias makes the trend unreadable, which is the one thing this file exists
for. Both must be answered, including "no" with a reason.>

## KPI table

<!-- Substrate before value, always. A KPI read from prose written by the entity it
     scores is not a measurement — mark it, and never present it beside an observable
     one with the same confidence. -->

| KPI | Substrate | Value | Baseline | Previous | Verdict |
|---|---|---|---|---|---|
| K1 passes-to-done | observable | | | | Improved / Flat / Regressed |
| K1b where the iterations went | observable | | | | |
| K2 done-reopens | observable | | | | |
| K3 escaped defects | observable | | | | |
| L context load | observable | | | | |
| V rule violations | observable | | | | |

**`K1b` is read from each log's `iteration_split`** — `bucket=count` pairs summing to `iterations`, added by `TASK 72` after `EVAL-001` reported a bare count of ~7 against a target of ≤2 and could attribute it to nothing. Aggregate the buckets across items and report which one carries the mass; that is the number a slice-seam proposal has to move. An item whose logs predate `iterationSplitRequiredFrom` contributes to `K1` and **not** to `K1b`, and the split is stated rather than the two totals being silently mismatched.

**`K2` is read from the status-history ledger** (`TASK 66`), not from prose. Generate it first — the command is in `evaluate-harness` step 1 — and read its `left_done` row: the count of transitions away from `DONE` in the committed register, derived from git, which no agent can author (`H-01`). `DONE` → `RETIRED` is listed under its own destination and is a consolidation, not a reopening. **Report the window with the number**, because a reopen made and reversed inside one commit is invisible to it; that is the boundary between `K1` and `K2`, not a defect in either.

**Substrate values:** `observable` (read from an artifact the scored entity does not author) · `self-reported` (read from its prose) · `unmeasurable` (the signal does not exist — report the raw count, never a ratio that claims precision it does not have).

## Verdict

<One honest line: is the harness paying?>

## Attributions

<For every Flat or Regressed KPI: the named harness element responsible — a specific rule
id, a procedure step that did not fire, an unmechanized gap. "The process needs work" is
not an attribution.

And the distinction that decides the fix: LOW ADHERENCE means nobody followed it, so the
content may be fine. HIGH ADHERENCE with flat outcomes means they followed it and it still
failed, so the CONTENT is wrong. Conflating them wastes the next round of work.>

## Eval cases

| Case | Descends from | Outcome | Note |
|---|---|---|---|
| EC-0NN | INC-0N | Caught / Partial / Gap | |

<Every `Gap` produces a work item. A gap with no work item is a gap that has been noticed
and forgiven.>

## Improvement work items filed

## Updated gap list

<What got mechanized, what is still open.>
