# 2026-08-27 · Session 10 — TASK 54: a green gate measuring HTML the current code did not produce

**Task:** TASK 54 — A green gate can be measuring HTML the current code did not produce
**Status after this session:** DONE

## What was done

The build's output cache is now **keyed on the pipeline's own inputs** rather than cleared. `astro.config.mjs` fingerprints the core, itself and the lockfile, and derives `cacheDir` and `vite.cacheDir` from that fingerprint. The defect was reproduced first, then closed, then proven closed by the same neutering that fooled `TASK 25` — with a warm cache present.

## Decisions

- **Key the cache, do not clear it.** The item's `Done` allowed either. Keying wins on both axes measured here: it costs nothing in steady state, and it covers **every** build path — the gate, the e2e suite and a human typing `npm run build` — where clearing only covers the build that does the clearing.
- **Pruning superseded cache directories is garbage collection, never invalidation.** Correctness does not depend on the deletion succeeding: a build whose keyed directory is missing is slow once, never wrong. That is the whole difference from clearing, and it is why the pruning is wrapped in a `try` that swallows failure. `staleCacheDirs` is scoped by the prefixes this module itself mints, so Astro's unsuffixed defaults — and Vitest's own cache, which lives inside `node_modules/.vite` — are never candidates. Asserted in both directions.
- **The lockfile is a pipeline input.** A plugin's version changes what the pipeline does without touching a line of this package's source. Folding it in means an `npm install` legitimately busts the cache, which is correct rather than annoying.
- **An empty input set throws** (`G-13` shape). A fingerprint over nothing is a constant, and a constant key restores exactly the defect this module closes — every build landing on the same cache forever.
- **`INC-03` gains no rule, and that is the decision.** The mechanism is now structural: the build cannot silently reuse stale HTML, because the key is a function of the code. A rule saying *the build must reflect the code* would be prose nothing can check, and `architecture.md` §M already records the deliberate absence of a visual-QA rule for this incident. The honest form is the mechanism plus the ADR extension, which is what shipped.

## Findings from validating against real state (P-04)

- **The defect reproduced exactly, and the reproduction is the sharpest artifact here.** Diagram-caption plugin neutered so it stops dropping the private `Spec:` half. **Warm cache: 0 files carried the leak. Cold cache, same code: 10.** Same command, opposite answers, no warning in either. This is what a green gate looks like when it is measuring the previous version of the code.
- **The cost of the blunt option was much worse than the item's reference.** The item cited ~2.5s cold against ~1.3s warm on 12 pages. Measured here on 17: **cold 15.01s, warm 2.91s** (Astro's own figure; 19.55s against 7.17s wall). Clearing on every gate run would have charged roughly twelve seconds per run for a defect that occurs only when the pipeline changes.
- **Steady-state cost of the chosen fix is nil.** Unchanged pipeline after the change: **2.56s**, against 2.91s warm before it. The cost is paid only on the build that follows a pipeline change — which is the build that must not be cheap.
- **`vite.cacheDir` from user config does win.** `create-vite.js` hardcodes `node_modules/.vite`, which would have sunk this approach — but the user config is merged *after* that default, so it overrides. Read in the source and then confirmed on disk: both `.astro-<key>` and `.vite-<key>` appeared, and the unsuffixed defaults stopped being written to.
- **The e2e suite's red run failed on the right assertion, in all three engines.** 12 failures, every one `no drawing-spec text reaches the page`, across chromium, firefox and webkit. Restored: **309 passed, 0 failed.**
- **The mutation glob needed no edit.** `site/lib/**/*.mjs` already covers the new module — the derived glob doing what it was written to do.

## Done
```yaml
done:
  tests: { status: passed, evidence: ["node --test site/lib/**/*.test.mjs — 228 pass, 0 fail", "16 new cases in pipeline-fingerprint.test.mjs, red before the module existed", "vitest run — 15 pass"] }
  mutation: { status: passed, evidence: ["site/lib/**/*.mjs covers site/lib/build/ with no glob edit; scored by the gate's mutation step"] }
  tests_e2e: { status: passed, evidence: ["npx playwright test — 309 passed, 0 failed after restore", "red path: 12 failed on the neutered pipeline with a WARM cache"] }
  docs: { status: passed, evidence: ["check-docs exit 0", "check-site exit 0", "ADR-002 extended and docs/adr/README.md reconciled in the same change (P-07)"] }
  scope: { status: passed, evidence: ["3 files: pipeline-fingerprint.mjs, pipeline-fingerprint.test.mjs, astro.config.mjs — plus ADR-002 and its index"] }
  loose_ends: { status: passed, evidence: ["see Open questions"] }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions

- **The fingerprint's known limit, recorded rather than left to be discovered.** It covers the core, `astro.config.mjs` and the lockfile. A pipeline input placed elsewhere — a plugin imported from the Astro side rather than the core — would not move the key on later edits, though *adding* the import moves it once, since the config file is itself an input. The core is where the pipeline lives by rule, so the limit is bounded by that rule rather than by luck. Not a work item unless the rule changes.

## Next

TASK 48 — `astro check` as a gate step, whose first act is to reproduce the bug it fixes.

## Files changed

`site/lib/build/pipeline-fingerprint.mjs` — `fingerprintOf`, `collectInputs`, `staleCacheDirs`.
`site/lib/build/pipeline-fingerprint.test.mjs` — 16 cases.
`site/astro.config.mjs` — the key, the derived cache directories, the best-effort prune.
`docs/adr/ADR-002-content-pipeline.md` — extended with the caching decision and its measurements.
`docs/adr/README.md` — the ADR-002 row's date and a superseded-points row.
