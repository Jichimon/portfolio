# 2026-08-24 · Session 03 — `check-terms` false-positives on generated opaque values

**Task:** TASK 37 — `check-terms` false-positives on generated opaque values
**Status after this session:** DONE

## What was done

`scanText` gained an opt-in `opaqueFields` option; values of fields named in it are blanked before matching and only for matching. `guards.config.json` names one field, `integrity`, with its reason. Six tests written red, seven hand-applied mutants, seven killed after two survived the first pass.

## Decisions

- **Scoped to the field, not to the file.** Excluding `site/package-lock.json` wholesale was the cheap fix and had direct precedent in the config's existing base64 exclusion. Rejected: a lockfile can carry a private registry URL naming an internal system, and catching exactly that is why `C-05` scans everything minus exclusions. The digest field is the part that is opaque; the rest of the line is authored-ish and stays covered.
- **By field name, never by shape.** A "looks like a hash" heuristic would widen itself silently as new formats appear, which is how an exclusion becomes a blindfold. `TASK 18` reached the same conclusion for the trace, independently, and this fix deliberately matches its shape.
- **Empty by default, in both places.** `scanText`'s option and `blankOpaqueValues`' own parameter both default to blanking nothing. A scanner that blanks by default blinds a repository nobody configured (`INC-07`).
- **The printed context stays the real line.** Blanking exists to stop a false match, not to hide the line from the human who has to act on it. A finding showing an empty `integrity` value would be unreadable.
- **No new incident id.** `INC-15` already describes this failure family — an opaque, machine-generated token containing a banned term by chance. Minting `INC-16` would oblige an eval case under `check-evals` for a defect the existing incident covers, and `C-05`'s origin does not change.

## Findings from validating against real state (P-04)

- **The first `npm install` in this repository's history found it.** Two `sha512` values out of a 265-package tree collided. The rate is not a curiosity: base64 of a digest makes every short sequence reachable, so this was going to happen on the first lockfile and would have happened again on every dependency bump.
- **The failure was not one gate step but two.** `confidentiality` failed, and so did `guard tests` — because the scanner's own liveness test asserts the real repository is clean. A single false positive in generated content took down the step that proves the guards work.
- **Two mutants survived the first battery**, and both were real gaps rather than equivalent mutants: nothing tested `blankOpaqueValues`' own default parameter independently of its caller, and nothing asserted that a finding's printed context is the unblanked line. Both are now covered. That is twice in one day a surviving mutant has found something review did not (`T-03`).

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["scripts/guards/lib/terms.test.mjs — 22 tests, up from 14; 6 written red before the fix, 2 more added to kill survivors", "the reproducing test is 'a term inside an opaque field value is not a finding', which failed before the change (T-01: a bugfix with no reproducing test is not done)"] }
  mutation:   { status: passed, evidence: ["7 hand-applied mutants over scripts/guards/lib/terms.mjs, 7 killed", "2 SURVIVED the first run — blankOpaqueValues' own default, and the printed context using the blanked line — both covered, then killed"] }
  gate:       { status: passed, evidence: ["check-terms PASS — 33 terms x 247 files, whole repo minus 9 exclusions", "the two failing steps, confidentiality and guard tests, both green again"] }
  security:   { status: passed, evidence: ["the exclusion is opt-in and empty by default in both the option and the function's own parameter", "scoped to one named field, so package names and resolved URLs in the same lockfile stay scanned", "private/banned-terms.txt was never read (H-04) — the finding cites a line number, which is all the fix needed"] }
  docs:       { status: passed, evidence: ["TASKS.md — TASK 37 opened and closed, with the INC-15 kinship and the reason no new incident id was minted", "guards.config.json — terms.opaqueFields carries its rationale, as every calibrated number in that file must"] }
  content:    { status: not_applicable, reason: "nothing in resources/** touched (H-02). The false positive was in a generated lockfile" }
  ci:         { status: not_applicable, reason: "no remote exists, so no CI run can be read (T-10)" }
  scope:      { status: passed, evidence: ["one deliverable: a banned term inside a generated digest no longer fails the gate, and one outside it still does", "TASK 18's half of the same family deliberately untouched — that is the trace, and H-03 keeps every agent out of evidence/"] }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions

None. If a second opaque field turns up — a `resolved` hash, a build fingerprint — it is one config line with a written reason, which is the shape this fix was built to accept.

## Next

Back to the skeleton item, which surfaced this. Its remaining open behaviour is the author's browser click on the Preact island.

## Files changed

`scripts/guards/lib/terms.mjs` — `blankOpaqueValues` added; `scanText` takes an options object.
`scripts/guards/lib/terms.test.mjs` — 8 new tests.
`scripts/guards/gate/check-terms.mjs` — reads the config once and threads the option through.
`scripts/guards/guards.config.json` — `terms.opaqueFields` with its rationale.
`TASKS.md` — TASK 37, opened and closed.
