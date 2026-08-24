# 2026-08-24 · Session 04 — Astro skeleton and the two root commands

**Task:** TASK 21 — Astro skeleton and the two root commands
**Status after this session:** DONE

## What was done

`site/` exists and builds. `npm start` from the repository root produces the static output and serves it; `npm test` is a thin alias to the gate. Both spikes ran and both are deleted: the Preact island hydrated in the author's browser, and the glob loader read `../resources/site` from outside the project root. The site ships **zero bytes of JavaScript** — no `<script>`, no asset reference in the built page.

Six behaviours, `SKEL-001` through `SKEL-006`, all closed. Two delegated slices, both first-pass clean.

## Decisions

- **The orchestrator installed the dependencies; the implementer wrote the code.** `implementer` declares `network: no` in its role file, and `npm install` is a network act. Nothing enforces that declaration today — the network-egress guard is on the deferred list — so delegating the install would have made the posture declaration false while everything still appeared to work. `G-05`'s six dimensions are worth what they describe, and a declared boundary that the harness itself steps over is worse than one it never claimed. The install and the version reading stayed with the orchestrator.
- **Two slices, not one.** `implementer` carries `maxTurns: 30`, and an agent cut off mid-run delivers zero rather than half (`P-09`, `INC-06`). Slice one was the base — config, tsconfig, one page. Slice two was the two spikes, which are the risky half. Each delivered something complete on its own.
- **Hand-written `package.json` files rather than `npm create astro`.** The scaffolder is interactive and emits a starter tree — extra pages, components and assets — that `S-03` would immediately have findings about and that would all have to be deleted. Writing four lines of config was less work than removing a template.
- **The island stayed alive for the author's click.** No browser exists in this repository until the fidelity-harness item installs Playwright, and `S-07` says nothing is installed before the item that needs it. The honest closure for `SKEL-004` was therefore a human in a real browser, not markup inspected by an agent. The implementer reported the `astro-island` element and its chunks and said plainly it had **not** confirmed hydration; the author clicked, the counter incremented, and that is what closed the behaviour.

## Findings from validating against real state (P-04)

- **The load-bearing assumption holds.** `glob({ pattern: '*.en.md', base: '../resources/site' })` loaded 4 entries during `astro build`, and the built HTML carried a real frontmatter value from `resources/site/about.en.md`. `ADR-008`'s fallback ladder is not entered. It stays written down, because the documentation still does not promise this and a future major could remove it without breaking a documented promise — which is now the only trigger for rung two.
- **The researcher's Astro version was four patch releases stale** by the time it was installed: `7.2.1` from a search summary against `7.2.5` measured from disk. Harmless here, and exactly why `C-01` does not let a searched number be published as a measured one. All five installed versions are now recorded in `ADR-008`.
- **The first `npm install` in this repository's history broke the gate**, in a way nobody would have predicted: two `sha512` integrity hashes in the lockfile contained a banned term by chance, failing `confidentiality` **and** `guard tests`. Fixed as `TASK 37`, scoped to the digest field rather than to the file.
- **`check-site` had a hole, found before an agent hit it.** Astro requires the collection definition at `src/content.config.ts` and requires it to import `astro:content`, which `S-02` would have denied. The boundary is now declared as a **set** of paths rather than one prefix. Four tests, and the rule text reconciled to match. The implementer then hit the boundary anyway, from a page, and fixed its own tree rather than arguing with the guard — which is the guard doing its job on its first real encounter.
- **Registering the Preact integration emits its runtime into `dist/_astro/` even with zero islands.** The built page references none of it, so a visitor downloads nothing. Recorded in `ADR-008` because it looks like a defect and is not: it is the direct consequence of `ADR-007`'s decision to prove the integration before the first island needs it.
- **`check-docs` reported the `content.config.ts` exemption as stale** while the spike existed, then cleared itself when the spike was deleted. The exemption's own written reason predicted exactly that. No config churn was needed, and the sequencing — delete the spike, then run the gate — was the whole fix.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["full guard suite 423/423, up from 390 across this session's three guard changes", "check-site PASS against the real tree — 5 files across 2 directories", "no test runner ships inside site/ and none was added (S-07); the manual:: rows in the spec are the verification path until Playwright arrives with the fidelity-harness item"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 14 of 15 steps PASS", "site structure moved from SKIP to PASS, which is SKEL-005", "confidentiality and guard tests recovered after TASK 37"], reason: "evidence trace fails on 2 findings, both 'tool.result has no matching tool.requested' in THIS session's own trace. That is TASK 12's known writer defect, and H-03 forbids every agent from touching evidence/ by any vector. Named rather than claimed green — the same call TASK 31 made on the same step" }
  security:   { status: passed, evidence: ["the implementer holds network: no and was given no network work; the install stayed with the orchestrator", "resources/** untouched — git status clean for that tree after both slices (H-02)", "no git write (H-01)", "site/node_modules, site/dist and site/.astro excluded from scans and from git before the first install, not after"] }
  docs:       { status: passed, evidence: ["ADR-008 sub-decision 6 carries the five installed versions, read from disk", "ADR-008 sub-decision 3 carries the spike result and states explicitly that it is a confirmation, not an amendment — the decision said prove it, and it was proven", ".claude/rules/50-implementation.md S-02 reconciled to the set-valued boundary"] }
  content:    { status: not_applicable, reason: "nothing in resources/** touched. The loader spike read four files and wrote nothing" }
  mutation:   { status: not_applicable, reason: "no code in site/lib/content/** exists yet — this item is configuration and wiring, exactly as the spec's tdd_rationale declared. The three guard changes made this session carry their own batteries, in TASK 34, TASK 35 and TASK 37" }
  ci:         { status: not_applicable, reason: "no remote exists, so no CI run can be read (T-10). The deploy workflow belongs to a later item and no deploy configuration was written here" }
  scope:      { status: passed, evidence: ["one deliverable: the local path proven end to end", "both spikes deleted; the final tree is 4 files at site/ plus one page", "no wrangler config, no tokens, no component, no content layer — each named against its owning item in the spec's out_of_scope"] }
  iterations: { status: passed, evidence: ["2"] }
```

`iterations: 2` — one delegated slice returning for verification, then the second. Neither came back with a defect in the delivered work; the second slice self-corrected a guard denial inside its own owned files, which is the guard working rather than an iteration against the author.

## Open questions

None for this item. One thing it inherits and cannot fix: `check-trace` will keep failing until `TASK 12` lands, and every item closing after this one will have to make the same `partial` call on the same step. That is a real tax on the honesty of every future done block, and it argues for pulling `TASK 12` forward.

## Next

`TASK 15` — the mutation gate wired into `gate.mjs`. It runs before any real site code lands so that `site/lib/content/**` is covered by the Stryker config's glob the moment the content-layer item writes it, rather than retrofitted. Three hand-run batteries this session — 12, 12 and 7 mutants — are three arguments that the by-hand convention has outgrown itself.

## Files changed

`package.json` — new, at the repository root. Two scripts, no dependencies.
`site/package.json` — new. Five dependencies, four scripts.
`site/package-lock.json` — new, committed for `npm ci` in CI.
`site/astro.config.mjs` — new. Static output, no adapter, Preact with `compat`.
`site/tsconfig.json` — new. Extends Astro's strict base.
`site/src/pages/index.astro` — new. One page that says nothing.
`scripts/guards/lib/site-structure.mjs` — the gateway boundary became a set.
`scripts/guards/lib/site-structure.test.mjs` — 4 tests for it.
`scripts/guards/guards.config.json` — the gateway set; three `site/` exclusions.
`.gitignore` — the three generated `site/` trees.
`docs/adr/ADR-008-site-implementation-architecture.md` — installed versions, the spike result.
`.claude/rules/50-implementation.md` — S-02 reconciled.
`TASKS.md` — TASK 21 closed; stale ordering markers on TASK 15, TASK 21 and TASK 34 corrected.

**Deleted, as the spec required:** `site/src/components/SpikeCounter.tsx`, `site/src/pages/spike.astro`, `site/src/content.config.ts`.
