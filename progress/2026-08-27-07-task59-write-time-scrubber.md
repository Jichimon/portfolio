# 2026-08-27 · Session 07 — write-time scrubber fails closed on a malformed term list

**Task:** TASK 59 — a malformed term list silently disabled write-time scrubbing
**Status after this session:** IN PROGRESS

## What was done
`loadTerms` in `scripts/guards/hooks/trace-writer.mjs` now discriminates on whether `private/`
exists: absent means `[]` is correct (nothing to protect), present-but-broken (missing,
empty, or unparseable term list) throws. `pretooluse.mjs` already turns any throw into a
`G-13` exit-2 denial through its `main().catch`; that was proven, not assumed, by spawning
the real hook against a temp root. `record-event.mjs` cannot deny (it must always exit 0),
so its call to `loadTerms` is now wrapped so a failure is reported quietly and nothing
unscrubbed is written.

## Decisions
- **Keyed the module-level `cachedTerms` cache by `root` (a `Map`) rather than exposing a
  reset function.** The four `loadTerms` cases needed to run against different roots in one
  test file, and a bare reset would still let a second call with the *same* root return a
  stale allow/throw from a previous test if a future test reused a root string. Keying by
  root is strictly more correct for the underlying latent bug this task's brief called out
  (module cache never varied by root) and costs one `Map` instead of a global reset hook.
- **`record-event.mjs`'s wrapping** catches only the `loadTerms` call, not the whole file, so
  a failure there degrades to `terms = []` for that one process and the file still calls
  `record(...)` and exits 0 — recording is a measurement and must never stop, but this means
  a broken term list makes the *recorder* fail open (mask nothing) for that single invocation.
  This is deliberate and stated in the brief itself ("record-event.mjs ... exits 0
  unconditionally on purpose") — the required property is "nothing unscrubbed is written",
  which is met by not writing that invocation's events at all rather than by writing them
  unmasked. See Files changed for exactly what happens.

## Findings from validating against real state (P-04)
- `pretooluse.mjs`'s `main().catch()` already converts any throw — including one from
  `loadTerms` via `redactToolInput`/`record` — into the `G-13` exit-2 path. This was already
  true before this task; the task was to prove it with a new red test, not to build it.
- The existing `pretooluse.test.mjs` `withRoot` helper only ever copies `scripts/guards`
  into the temp root, never `private/`. Extending it to also plant/omit `private/` at the
  temp root's top level (sibling of `scripts/`) was needed, since `ROOT` is derived three
  levels up from the hook's own file location.

## Done
```yaml
done:
  tests: { status: passed, evidence: ["node --test scripts/guards/hooks/trace-writer.test.mjs", "node --test scripts/guards/hooks/pretooluse.test.mjs"] }
  scope: { status: passed, evidence: ["files changed limited to the four named in the brief"] }
  loose_ends: { status: passed, evidence: ["see Loose ends section below"] }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions
- None.

## Next
Nothing further scoped for this task. A loose end below could become its own work item if desired.

## Files changed
`scripts/guards/hooks/trace-writer.mjs` — `loadTerms` now fails closed when `private/` exists but its term list is missing, empty, or unparseable; cache keyed by root.
`scripts/guards/hooks/trace-writer.test.mjs` — four new tests for `loadTerms`'s cases.
`scripts/guards/hooks/pretooluse.test.mjs` — two new tests proving the real hook denies (exit 2) on a malformed list and still allows with no `private/`.
`scripts/guards/hooks/record-event.mjs` — `loadTerms` call wrapped so a failure is quiet, the file still exits 0, and nothing is written for that invocation.
