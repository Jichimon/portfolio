# 2026-08-31 · Session 02 — `TASK 89`: the `component tests` flake, and the recursive delete behind it

**Task:** TASK 89 — The `component tests` step fails at module evaluation, with zero tests collected
**Status after this session:** IN PROGRESS

## What was done

_(written as the session goes — `P-05`)_

Phase A: reproduce the condition deterministically and identify which of the two candidate mechanisms is doing the deleting.

## Decisions

_(pending)_

## Findings from validating against real state (P-04)

### Before running anything — three findings from reading the real tree

1. **What the `TypeError` means, exactly.** `@vitest/runner` holds a module-scoped mutable binding `runner`, assigned by `clearCollectorContext(file, currentRunner)` immediately before each test module is imported. `describe()` dereferences it: `runner.config.sequence` (`site/node_modules/@vitest/runner/dist/chunk-artifact.js:1643`) and `runner.config.testTimeout` (`:1734`). So `Cannot read properties of undefined (reading 'config')` at a `describe(...)` line means one thing: **the `@vitest/runner` instance evaluating the test file is not the one the collector context was set on** — a torn or re-evaluated module graph, not a defect in `theme.mjs` or `scroll-spy.mjs`.

2. **The `Re-optimizing dependencies…` line is not a note — it is the announcement of a recursive delete.** It is emitted from exactly one site, `loadCachedDepOptimizationMetadata` (`site/node_modules/vite/dist/node/chunks/node.js:32164`), and eleven lines later the same function runs `await fsp.rm(depsCacheDir, { recursive: true, force: true })` (`:32172`). The condition is a `configHash` mismatch, and `getConfigHash` (`:32684`) folds in `process.env.NODE_ENV || config.mode`, `config.resolve`, `config.plugins.map(p => p.name)` and `optimizeDeps.include/exclude`. That is the missing link between "re-optimizing" and "zero tests collected".

3. **There is a second recursive delete, and it is ours.** `site/astro.config.mjs:20-46` computes a `pipelineKey` over every file under `site/lib/**` plus `astro.config.mjs` plus `package-lock.json`, then — as a side effect of the config module being *loaded*, in any process — `rmSync(recursive, force)`s every `node_modules/.astro-*` / `.vite-*` directory whose suffix is not the current key. `site/vitest.config.ts` wraps `getViteConfig()`, which loads that file, so **every `vitest run` executes this sweep.** It landed in `c6c72a4` on 2026-08-27; the component tier had existed since 2026-08-25 with no reported failure, and the first captured reproduction is 2026-08-29.

### On-disk state before Phase A

| Directory | mtime | Note |
|---|---|---|
| `site/node_modules/.vite/deps` | 2026-08-27 13:51 | orphan — predates the keyed `cacheDir`, and the sweep's `.vite-` prefix cannot match `.vite` |
| `site/node_modules/.astro` | 2026-08-27 13:51 | same |
| `site/node_modules/.astro-02baf670` | 2026-08-28 00:25 | current key |
| `site/node_modules/.vite-02baf670/deps` | 2026-08-30 00:31 | current key, `configHash d431e7ce`, Astro-shaped contents |
| `site/node_modules/.vite-02baf670/vitest/da39a3ee…` | 2026-08-27 14:05 | **empty** — Vitest's own nested `cacheDir`, from `VitestOptimizer` |

The empty nested directory is evidence **against** candidate A1 (a shared deps directory) under the current configuration: `VitestOptimizer` re-points `cacheDir` to `<cacheDir>/vitest/<sha1(label)>` (`site/node_modules/vitest/dist/chunks/cli-api.CnMVyzaz.js:607`, `:10092`), and Vitest disables the optimizer by default (`resolveOptimizerConfig`, `:10098` — `noDiscovery: true, include: []`). Checked first for exactly that reason.

**Candidate 2 from the register (Stryker's sandbox) is down-ranked a second time, independently of the third data point:** the tap runner drives `node --test` over `site/lib/**` and `scripts/guards/**`, and nothing in either surface imports `astro.config.mjs`.

## Done

_(pending)_

## Open questions

_(pending)_

## Next

_(pending)_

## Files changed

_(pending)_
