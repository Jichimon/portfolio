# 2026-08-31 · Session 02 — `TASK 89`: the `component tests` flake, and the recursive delete behind it

**Task:** TASK 89 — The `component tests` step fails at module evaluation, with zero tests collected
**Status after this session:** `TASK 89` stays `TODO` — reported `partial`. `TASK 103`, opened out of it, is `DONE`.

## What was done

Refuted both of `TASK 89`'s recorded candidate mechanisms, named its symptom precisely, and showed the log line the entry built its causal story on is very likely the *next gate step's* first line rather than Vitest's last. **The flake itself was not reproduced** across six controlled runs, so the item is reported `partial` and stays open. One real ordering hazard found on the way — a config garbage-collecting a build cache in every process that loads it — was fixed red-first and shipped as `TASK 103`.

## Decisions

- **`TASK 89` reported `partial`, not `done`.** Its `Done` asks for a named mechanism and a fix addressing it. There is no named mechanism, and closing on six clean runs is the standard `TASK 85`'s entry already set and refused. What the session *can* claim — two candidates eliminated, the symptom named, the adjacency explained — is written into the register so the next attempt starts from a smaller space.
- **The sweep fix is a separate work item and is not allowed to borrow `TASK 89`'s authority.** It is a real defect on its own evidence and was fixed on that evidence. Presenting it as this flake's cure would be `C-02` — describing what was designed rather than what was shown.
- **The guard's property is about the file, not the line.** *A config may not reach a mutating fs API at all* needs no scope analysis, cannot be walked around with a top-level IIFE, and reads as one sentence. Brace-depth parsing was considered and declined: it is more code, and a top-level IIFE defeats it.
- **The read-only API list is inverted.** Naming the mutating calls would be a roster that a new Node API silently escapes (`P-13`); naming the read-only ones makes the unknown a finding by default. Proven with `cpSync`, which no line of the guard mentions.
- **The collector was scoped, not deleted.** `astro:build:start` fires for the one consumer that populates these directories, and `getViteConfig()` provably never reaches it — it runs `runHookConfigSetup` and `runHookConfigDone` and stops. Removing the keying instead would have restored the cache-poisoning defect it was built to close.

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

### Phase A, first round — candidate A1 is dead, and it was killed empirically

Run on the real tree, 2026-08-31. Every cache directory the site can mint was snapshotted before and after each step.

| Shape | `component tests` | `.vite-02baf670/deps` after |
|---|---|---|
| `vitest run` (cold session) | 15/15 pass | untouched, `configHash d431e7ce` |
| `vitest run` again, immediately | 15/15 pass | untouched |
| `astro check` | exit 0, 20 hints | untouched |
| `astro build` | exit 0, 17 pages | untouched |
| **`configHash` planted as `deadbeef`, then `vitest run`** | 15/15 pass | **still `deadbeef`** — no re-optimization, no delete |

The planted-mismatch run is the decisive one. If Vitest read that directory it would have logged `Re-optimizing dependencies because vite config has changed` and `rm -rf`'d it, per `node.js:32164-32175`. It did neither. A full sweep of the tree confirms it: `find site/node_modules node_modules -name _metadata.json -path '*deps*'` returns **exactly two** files, both Astro-shaped, and **Vitest has no dependency-optimizer cache anywhere in the repository** — `resolveOptimizerConfig` disables it (`noDiscovery: true, include: []`) and `VitestOptimizer` re-points `cacheDir` to `<cacheDir>/vitest/<sha1(label)>`, which holds no `deps` directory at all.

**So `A1` — "Vitest and Astro share a dependency-cache directory and invalidate each other" — is false on this tree.** It was the reading the hand-off's candidate 1 most naturally suggests, and it does not survive contact.

### What that leaves, and one thing the register did not have

Both suites fail on their **first** `describe` — `scroll-spy.component.test.ts:39` and `theme.component.test.ts:36` are each the first `describe` in their file. So the collector binding is already unset when collection begins; this is systemic and immediate, not something that develops partway through a file.

Combined with finding 1 above, the proximate mechanism is **two live instances of `@vitest/runner`**: the copy the test file's `import { describe } from 'vitest'` resolves to is not the copy `clearCollectorContext` assigned `runner` on. That is what a torn or duplicated module graph produces, and it is a sharper statement than "the pre-bundling cache was invalidated during collection".

Astro's `createVite` builds `optimizeDeps.include/exclude` and `ssr.noExternal` from `crawlFrameworkPkgs`, a **disk crawl** of `node_modules` memoized per `${root}:${isBuild}` (`site/node_modules/astro/dist/core/create-vite.js:74-105`). Those two lists are also two of the four inputs `getConfigHash` folds. So the config Vitest resolves through `getViteConfig()` is derived from a filesystem crawl rather than from a literal — which is the kind of input that can differ between two runs of the same command.

### Phase A, second round — the documented reproducing shape did not reproduce

`node scripts/gate.mjs` run twice, the second starting seconds after the first exited — repro #2's exact shape. **Both passed `component tests` 2 files / 15 tests.** Gate 1: 20 of 21, mutation 78.57%; the single failure is `procedures`, and it is this log lacking its `done` block while the session is still open. So the register gains a **fourth data point, negative**, alongside `TASK 94`'s three.

### The forensic finding — the resolved Vite config oscillates, and the filesystem recorded it

`site/node_modules/.vite-02baf670/` has a child `vitest/da39a3ee…` dated **2026-08-27 14:05**, proving the parent directory has existed continuously since then. Its sibling `deps/` is dated **2026-08-30 00:31** — the day of reproduction #2. So `deps` **alone** was removed and rebuilt inside a parent that was never removed, which is not our `rmSync` sweep (that takes the whole `.vite-<key>` directory) but Vite's own `fsp.rm(depsCacheDir)` — the line that prints `Re-optimizing dependencies because vite config has changed`.

And the rebuild is **byte-identical in all four hashes** to the copy left behind at `node_modules/.vite/deps` on 2026-08-27:

```text
hash 72d82139 · configHash d431e7ce · lockfileHash b3e41d0f · browserHash 12c7a485
```

An invalidation followed by a rebuild to the *same* hash means the config did not change — **it oscillated away and back**. Some consumer of `.vite-<key>/deps` resolves a different `configHash` than the others, and they take turns evicting each other. `getConfigHash` folds in `process.env.NODE_ENV || config.mode`, and Astro's own consumers do not agree on it: a build runs at `production`, a check and a preview at `development`.

**This is the first hard evidence that a re-optimization really did happen on a day the flake fired**, and it was read off the filesystem rather than inferred. What it does **not** yet establish is that the eviction is what breaks Vitest — Vitest has no cache in that directory to lose. That gap is the next thing to close, and it is the difference between a mechanism and an adjacency.

### The output boundary — the log line may never have been Vitest's

`scripts/gate.mjs:298` runs every step with `stdio: ['inherit', 'pipe', 'inherit']`: **stderr streams live, stdout is captured and flushed only once the step is done.** So in a real gate log, the line immediately after Vitest's summary block is the **first line of the next step**, not Vitest's own last word. Verified against today's passing run — the Vitest block is followed with no separator by `type check`'s `[content] Syncing content` / `[types] Generated` / `[check] Getting diagnostics…`.

That is precisely the slot `[vite] Re-optimizing dependencies because vite config has changed` occupies in both captured reproductions. And `astro check` is a credible emitter: it resolves at `mode: development`, while `astro build` — the e2e step, later in the same gate run — resolves at `production`, and `process.env.NODE_ENV || config.mode` is one of the four inputs to `getConfigHash`. Two Astro consumers sharing one `deps` directory and disagreeing on mode evict each other on every gate run after the first, which matches repro #2 (*second invocation*) and repro #1 (*fourth consecutive run*) **without Vitest being involved at all**.

If that holds, the register's candidate 1 is not narrowed but **refuted**: it read an adjacency as a causality, which is `P-04`'s exact shape.

### Stryker's sandboxes symlink the real `site/node_modules`

Read off a live mutation run: `.stryker-tmp/sandbox-*/site/node_modules` is a **symlink to `/c/dev/projects/portfolio/site/node_modules`**, and each sandbox carries its own copy of `site/astro.config.mjs` (3925 bytes — the current one, sweep included) over a **mutated** `site/lib`.

So a sandbox process that loaded that config would compute a different `pipelineKey` and `rmSync` the **real** `.vite-<key>` / `.astro-<key>` through the symlink. **Nothing does today** — `grep -rln 'astro/config' site/lib/` is empty and the tap runner only drives `node --test` — so this is a latent hazard, stated rather than fixed, not a reproduction.

Noted in passing and **not opened as a work item** (`P-19`): `.stryker-tmp` is never cleaned. It holds **15 sandboxes totalling 581 MB**, the oldest dated 2026-08-24 and still carrying the 287-byte pre-fingerprint `astro.config.mjs`.

### Phase A, final round — nobody re-optimizes on this tree, and the sweep is real

**Consumer attribution.** Each consumer run in turn against the live `.vite-02baf670/deps`, watching its mtime, its `configHash` and its own output:

| consumer | exit | `deps` mtime before → after | `Re-optimizing` lines |
|---|---|---|---|
| `astro build` | 0 | unchanged | 0 |
| `astro check` | 0 | unchanged | 0 |
| `vitest run` | 0 | unchanged | 0 |
| `astro preview` | 0 | unchanged | 0 |

**No consumer in this repository re-optimizes.** `configHash` stayed `d431e7ce` throughout and the directory was never rewritten. `.vite-<key>/deps` is a fossil: every consumer reads it, finds the hash consistent, and skips. So the condition that produced the log line on 2026-08-29 and 2026-08-30 **cannot currently be recreated by any invocation shape**, which is why none of them reproduces the failure either.

**The sweep hazard, on the other hand, is real and needs no race to show it.** Two directories planted in the *real* `site/node_modules`, then a plain `vitest run`:

```text
planted:  site/node_modules/.vite-fakekey/deps/_marker
          site/node_modules/.astro-fakekey/_marker
vitest exit=0
after:    BOTH DELETED
```

**Running the component test tier deletes directories inside `site/node_modules`.** Not a race, not a hypothesis — on demand, every time. `site/vitest.config.ts` wraps `getViteConfig()`, which loads `site/astro.config.mjs`, whose module body runs an unconditional `rmSync(recursive, force)` sweep. A test runner has no business garbage-collecting a build cache, and every process that loads that config does it — including, through the sandbox's `site/node_modules` symlink, anything Stryker ever runs there.

### Where Phase A leaves the item

**Six consecutive clean `component tests` runs** today: two standalone, two inside full gate runs (the second starting seconds after the first exited — repro #2's exact shape), plus the two probe runs. Zero `Re-optimizing` lines and zero `TypeError`s across both gate logs.

**The flake was not reproduced, and per `TASK 85`'s own precedent six clean runs do not close it.** What Phase A did produce:

- **Candidate 1 as written is refuted**, not narrowed — Vitest owns no dependency cache in this repository, and the log line's position in the gate output is the slot the *next step's* first line occupies.
- **Candidate 2 is refuted twice over** — the third data point, plus the fact that nothing in a Stryker sandbox loads the Astro config.
- **The proximate symptom is named precisely** — two live `@vitest/runner` instances, not a cache invalidation.
- **A separate, real ordering hazard was found and demonstrated deterministically** — the config-load sweep above. It is *not* established as this flake's mechanism, and saying otherwise would be `C-02`.

## Phase C/D — what was fixed, and what it is honestly claimed to be

The author's call at the Phase B checkpoint: fix the sweep as a defect on its own terms, red-first, and report `TASK 89` itself as `partial`.

**The defect, stated without borrowing `TASK 89`'s authority.** `site/astro.config.mjs` swept stale cache directories from its **module body**, so the sweep ran in every process that loaded the config — `astro build`, but equally `astro check`, `astro preview`, `vitest run` through `getViteConfig()`, and anything inside a Stryker sandbox, whose `site/node_modules` is a symlink to the real one. A test runner garbage-collecting a build cache is an ordering hazard nobody asked for, and it is **demonstrated, not argued**.

### Red before green, both halves

**The reproducing red is the guard firing on the real file**, which is as close to the defect as a test can sit:

```text
FAIL  check-site  1 finding(s)
  site/astro.config.mjs imports rmSync from the filesystem module. A config file is loaded
  by every consumer of it — a build, a check, a preview, a test runner, a mutation sandbox
  — so anything it can do, all of them do. Move the action behind a hook the caller chooses to run
```

**And the behavioural red is the demonstration itself**, run before and after the change with nothing else altered:

```text
before:  planted .vite-fakekey + .astro-fakekey → `vitest run` → BOTH DELETED
after:   planted .vite-fakekey + .astro-fakekey → `vitest run` → both survive
         planted .vite-fakekey + .astro-fakekey → `astro build` → both collected
```

The last line matters as much as the first: the collector still collects. It is scoped, not removed.

### The change

- **`site/lib/build/pipeline-fingerprint.mjs`** gains `sweepStaleCacheDirs(modulesDir, { prefixes, keep }, io)` — the *action*, with `readdir`/`remove` injected, beside `staleCacheDirs`, which was already the *decision*. Best-effort in both directions: an unreadable directory collects nothing, and one directory another process holds open does not stop the rest. Five tests, four of them `RED:`.
- **`site/astro.config.mjs`** no longer imports `rmSync`. The sweep moved into an inline integration hook on **`astro:build:start`**, which `getViteConfig()` provably never fires — it runs `runHookConfigSetup` and `runHookConfigDone` and nothing else. The two cache prefixes are now declared once and used three times instead of being written out at each of the three sites, so the collector cannot fall behind a directory somebody mints.
- **`scripts/guards/lib/site-structure.mjs`** gains `checkConfigsDeclareRatherThanAct`, wired into `checkSite`. The property is about the **file**, not the line — a config may not reach a mutating filesystem API at all — which needs no brace counting and cannot be walked around with a top-level IIFE. The API list is **inverted**: it names the read-only calls, so an API nobody thought of is a finding by default (`P-13`). A namespace or default import is a finding on `G-13`'s logic — nobody can see statically what `fs.*` reaches for.

### Proven in red, not merely seen green (`P-14`)

Four neuterings of the new check, each restored afterwards:

| neutering | result |
|---|---|
| the check reports nothing | **4 fail** |
| the allowlist read as a denylist | **4 fail** |
| a namespace import waved through | **1 fail** |
| no file treated as a config | **4 fail** |
| restored | **105 pass, 0 fail** |

`S-08` earned its place on the way through: the first draft cited the work-item id in comments **inside `site/`**, and `check-site` failed on all three. The citation runs the other way — this log points at the code.

## Done

```yaml
done:
  tests:           { status: passed,         evidence: ["scripts/guards/lib/site-structure.test.mjs — 107 pass, 9 new, 7 of them RED:", "site/lib/build/pipeline-fingerprint.test.mjs — 235 pass in the suite, 7 new", "neutering: check-silenced 4 fail · allowlist-inverted 4 fail · namespace-waved 1 fail · no-file-is-config 4 fail · restored 105 pass (P-14)", "behavioural red/green: vitest run BOTH DELETED -> both survive; astro build still collects"] }
  mutation:        { status: passed,         evidence: ["node scripts/gate.mjs mutation step — 78.57% vs the 77.0 floor, unmoved from the pre-change score", "two survivors in the new code read rather than suppressed: the default io and the aliased import, both now tested"] }
  ci:              { status: passed,         evidence: ["node scripts/gate.mjs — 21/21, real exit 0, on the tree as delivered", "a FIFTH run then hit TASK 89's own flake on component tests — the open item, not a regression from this change: identical historical signature, and nothing in that tier was touched"] }
  docs:            { status: passed,         evidence: ["TASKS.md TASK 103 — new entry", "TASKS.md TASK 89 — partial outcome, both candidates refuted", "TASKS.md goal-triage note corrected: TASK 39 already closed the silent-pass class"] }
  scope:           { status: passed,         evidence: ["TASK 89 left TODO rather than closed", "shell.mjs and path-boundary.mjs untouched — git diff --stat"] }
  loose_ends:      { status: passed,         evidence: ["TASK 89 stays open with its candidate space narrowed", "TASK 76 object list widened — two case studies found diverged, recorded in the register", "the Stryker sandbox symlink hazard recorded as latent, not opened (P-19)", ".stryker-tmp accumulation recorded, not opened (P-19)"] }
  security:        { status: passed,         evidence: ["a guard was added and none weakened; check-site gained an assertion"] }
  content:         { status: not_applicable, reason: "nothing under resources/ — C-09 locale parity does not apply" }
  iterations:      { status: passed,         evidence: ["3"] }
  iteration_split: { status: passed,         evidence: ["checkpoint=1", "verify=2"] }
```

## The flake fired during wrap-up — and the timestamps settle the adjacency

**`node scripts/gate.mjs`, run a fifth time at 12:05 on 2026-08-31, failed `component tests` with the exact historical signature.** Nothing in the tier had changed since the four clean runs; the only edits between gate 4 and gate 5 were to `TASKS.md` and `progress/`.

```text
 FAIL  src/behaviour/scroll-spy.component.test.ts
TypeError: Cannot read properties of undefined (reading 'config')
 > src/behaviour/scroll-spy.component.test.ts:39:1
     39| describe('initScrollSpy', () => {
 FAIL  src/behaviour/theme.component.test.ts
TypeError: Cannot read properties of undefined (reading 'config')
 > src/behaviour/theme.component.test.ts:36:1
     36| describe('resolve', () => {

 RUN  v4.1.11 C:/dev/projects/portfolio/site
 > src/behaviour/theme.component.test.ts (0 test)
 > src/behaviour/scroll-spy.component.test.ts (0 test)
 Test Files  2 failed (2)
      Tests  no tests
   Start at  12:05:20
   Duration  2.16s (transform 554ms, setup 0ms, import 0ms, tests 0ms, environment 3.00s)

12:05:27 [vite] Re-optimizing dependencies because vite config has changed
12:05:28 [content] Syncing content
12:05:28 [content] Synced content
12:05:28 [types] Generated 1.63s
12:05:28 [check] Getting diagnostics for Astro files in ...\site...
```

### The register's candidate 1 is now refuted by the clock, not by inference

Vitest **started at 12:05:20 and ran for 2.16 s**, so it was finished by ~12:05:22. The `Re-optimizing` line is stamped **12:05:27** — *five seconds after Vitest exited* — and it is followed immediately by `[content] Syncing content`, `[types] Generated` and `[check] Getting diagnostics`, which are unmistakably `astro check`'s output. **The line belongs to the `type check` step.**

Corroborated on disk rather than only in the log: `site/node_modules/.vite-f96b5135/deps` carries mtime **12:05:27**, to the second, and its `configHash` is now `59ece002`. That directory was rewritten by `astro check` at exactly the moment the line was printed — the Astro-consumer ping-pong predicted from `getConfigHash` folding in `process.env.NODE_ENV || config.mode`, with `astro build` (the previous gate run's e2e step) resolving at `production` and `astro check` at `development`.

**So the causal story the entry was built on is dead: the cache invalidation happens after the failure, in a different process.** Five seconds and one process boundary. This is what `P-04` is for.

### What the reproduction adds

- **`import 0ms`, `tests 0ms`, `transform 554ms`.** The modules were transformed and then never really imported. Collection produced nothing at all — consistent with the first `describe` throwing on an `@vitest/runner` instance whose `runner` binding was never assigned.
- **Vitest still owns no dependency cache.** `.vite-f96b5135/vitest/da39a3ee.../` holds one file, `results.json`, and no `deps` directory — checked at the moment of the failure.
- **Re-run alone immediately after: 15/15 pass**, reproducing the register's own observation — though in **20.86 s** against a normal 1.5-2 s, because everything had to be transformed cold.

### What is still not known

**Why the module graph tears.** That is the whole of `TASK 89` now, and it is one question rather than two candidates. The reproduction came on a fifth consecutive full gate run over a tree whose component tier had not changed, which is a much better starting position than this session had.

## Harness measurement (`P-12`)

Read from `evidence/runs/6f4944a9-…/orchestrator.jsonl`, not from memory.

- **123 `tool.requested` · 123 `policy.decision` · 0 `deny`.** Zero unsafe-action attempts. Nothing this session tried to cross a boundary.
- **`seq` monotonic to 382 with no gaps** — the trace is not truncated.
- **No delegation.** Zero subagents dispatched, so `G-06`'s observed budgets have nothing to report beyond the orchestrator; the item was sized to one session and stayed there (`P-09`).
- Wall window 14:04:56Z → 16:07:50Z, ≈2h03m, dominated by five full gate runs.

**The harness paid twice this session, both times against this session's own work**, which is the direction that counts:

- `check-site`'s `S-08` caught the first draft citing a work-item id in comments **inside `site/`** — three findings, all mine, none of which a human reviewer would reliably have spotted in a diff.
- The **mutation run** caught two real coverage gaps in code written minutes earlier: the default `io` object — the one production actually runs with — was never exercised because every test injected a double, and an `as`-aliased import was untested. Both were read and closed rather than suppressed, and the score returned to 78.57.

**No harness regression observed, so no work item opened** (`P-12` permits finding it not paying; this run does not).

## Open questions

- **What produces two `@vitest/runner` instances?** That is all `TASK 89` still is. It **did** reproduce, on the fifth gate run of the day after six clean ones, so the condition exists on this machine and is simply rare.
- **Is `TASK 89` worth keeping open at all?** Put to the author, and the reproduction cuts both ways: it is real and it blocks a green gate roughly one run in seven, which argues for doing it — and it is still 15 tests in a tier that fails loudly rather than passing silently, while publication is what Goal 1 is waiting on. `P-19` says that judgement belongs to a person.

## Next

**`TASK 30`/`TASK 32` — publication.** It is the next item in the recommended order and the one holding all of Goal 1's undelivered value: 71 items closed and nobody can see any of it. `TASK 89` was the last thing making the instrument that verifies publication uncertain, and after today the instrument is 21/21 with the one defect anybody could demonstrate now fixed.

## Files changed

`site/astro.config.mjs` — the sweep moved out of the module body into an `astro:build:start` hook; the two cache prefixes declared once instead of at three sites.
`site/lib/build/pipeline-fingerprint.mjs` — `sweepStaleCacheDirs`, the action beside the decision, with `readdir`/`remove` injected.
`site/lib/build/pipeline-fingerprint.test.mjs` — 7 tests, including the default `io` that production actually runs with.
`scripts/guards/lib/site-structure.mjs` — `checkConfigsDeclareRatherThanAct`, wired into `checkSite`.
`scripts/guards/lib/site-structure.test.mjs` — 9 tests, 7 of them red paths.
`scripts/guards/guards.config.json` — `configFileMarker` and the inverted `readOnlyFsApis` list, with the rationale.
`TASKS.md` — `TASK 103` opened and closed; `TASK 89`'s outcome; the goal-triage note corrected; `TASK 76`'s object list widened by the two case studies found diverged in the working tree.
`progress/handoff/2026-08-31-task76.md` — the packet for the next session.
