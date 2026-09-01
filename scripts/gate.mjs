#!/usr/bin/env node
// The one-command gate. It DELEGATES to sub-gates rather than re-listing their steps
// (T-09): a step added to a sub-gate must not be silently absent here, or the local
// run quietly verifies less than CI does.
//
// Fails loudly and names EVERY failing step (V-01 / INC-08). A step that did nothing
// says so — a silent no-op is indistinguishable from success.

import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync, readdirSync } from 'node:fs';

import { runGate, formatSummary } from './guards/lib/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Does any file under `dir` end with `suffix`? A step whose runner is handed a glob cannot
 * use existsSync — the glob is not a path — and "the directory exists" is a different
 * question from "there is anything in it to run".
 */
function holdsFileEndingWith(dir, suffix) {
  const absolute = join(ROOT, dir);
  if (!existsSync(absolute)) return false;
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (holdsFileEndingWith(join(dir, entry.name), suffix)) return true;
    } else if (entry.name.endsWith(suffix)) {
      return true;
    }
  }
  return false;
}

/**
 * Each step names what it protects, so a failure reads as a broken guarantee
 * rather than a broken command.
 */
export const STEPS = [
  {
    name: 'guard tests',
    protects: 'a guard nobody tested is a guard nobody can trust (P-14, T-04)',
    // A step whose runner exits 0 having silently run zero tests must not report PASS
    // (TASK 39) — this is that mechanism's own red proof, generic to every node:test step.
    redProof: { file: 'scripts/guards/lib/gate.test.mjs', test: 'RED: a step whose command exits 0 but ran zero tests does not report PASS' },
    cmd: ['node', '--test', 'scripts/guards/**/*.test.mjs'],
    // Node's runner takes a directory; if none exist yet the step declares itself skipped.
    skipIf: () => !existsSync(join(ROOT, 'scripts/guards/lib')),
    // TASK 63 found this step had no skipNote to go with its skipIf — an undeclared skip is
    // the exact silent-pass shape this item exists to close, and gate-steps.mjs's validator
    // now enforces the pairing on every step, this one included.
    skipNote: 'scripts/guards/lib does not exist yet',
  },
  {
    name: 'site core tests',
    protects: 'the site core has a runner, not only a Stryker glob (ADR-006, T-03) — and S-06 scopes the whole of site/lib/**, so the runner does too (TASK 42)',
    // Same zero-tests-ran mechanism as 'guard tests' above — one node:test runner, one proof.
    redProof: { file: 'scripts/guards/lib/gate.test.mjs', test: 'RED: a step whose command exits 0 but ran zero tests does not report PASS' },
    cmd: ['node', '--test', 'site/lib/**/*.test.mjs'],
    // A checkout without the core yet declares the gap out loud rather than
    // passing on nothing (P-03) — same shape as the 'site structure' step below.
    skipIf: () => !existsSync(join(ROOT, 'site/lib')),
    skipNote: 'site/lib does not exist yet',
  },
  {
    name: 'component tests',
    protects: 'the DOM-requiring behaviour modules — scroll-spy tracking, theme persistence — are asserted on what the user observes, in a real DOM (ADR-006 amendment, T-07)',
    // countTestsRun only recognized node:test's summary until TASK 63 widened it — this proves
    // Vitest's own real zero-tests summary is now caught the same way.
    // The proof file's own test name is a single-quoted string with an escaped apostrophe
    // (Vitest\'s) — redProof.test is matched against the file's raw SOURCE TEXT (io.read().
    // includes(...)), not an evaluated JS string, so the literal backslash has to be here too.
    redProof: { file: 'scripts/guards/lib/gate.test.mjs', test: "RED: a step whose stdout is Vitest\\'s real zero-tests summary does not report PASS" },
    // The npx form is what ADR-006 names and what a human types. gate.mjs resolves the binary
    // directly for the same reason the mutation step does: spawnSync has no shell, and npx is
    // a .cmd shim on Windows, so spawnSync('npx', ...) returns ENOENT and reads as a plain FAIL.
    cmd: [process.execPath, join(ROOT, 'site/node_modules/vitest/vitest.mjs'), 'run'],
    cwd: join(ROOT, 'site'),
    // The tier is installed before the modules that need it, deliberately — a test tier
    // installed inside the feature item that uses it is a tier whose own red path never gets
    // proven. Until a module lands, the step declares the gap out loud rather than passing on
    // nothing (P-03). passWithNoTests is deliberately off in vitest.config.ts, so this skip is
    // the ONLY thing standing between an empty tier and a loud failure — which is the right
    // way round: renaming the suffix makes the gate fail, not go quietly green.
    skipIf: () => !holdsFileEndingWith('site', '.component.test.ts'),
    skipNote: 'no .component.test.ts exists yet — the behaviour modules arrive with the layout shell',
  },
  {
    name: 'type check',
    protects: 'a type error cannot reach a closed work item because nobody remembered a command (T-09, G-11)',
    // Proves OUR wiring, not Astro's own type detection (TASK 63): the eight escaped defects
    // this item closes were all drifted binary paths, wrong cwds and permanently-true skipIfs
    // — never a vendor tool failing to find a real type error. Re-proving that astro check
    // finds type errors would test a vendor, at real cost (~15s) on every gate run.
    redProof: { file: 'scripts/guards/lib/gate-steps.test.mjs', test: 'RED: a cmd entry that looks like a resolved .mjs path but does not exist is a finding' },
    // Astro's own bin through node, for the reason the steps around this one already carry:
    // spawnSync has no shell and npx is a .cmd shim on Windows.
    //
    // NOT redundant with the build, checked rather than assumed: with a planted type error
    // `astro build` exited 0 and built all 17 pages, while `astro check` exited 1 naming it.
    // The build does not type-check, so this step doubles nothing.
    cmd: [process.execPath, join(ROOT, 'site/node_modules/astro/bin/astro.mjs'), 'check'],
    cwd: join(ROOT, 'site'),
    // Runs BEFORE the e2e tier deliberately: a type error should not cost three browser
    // engines. No dependsOn, though — a type error does not break the build, so marking
    // e2e BLOCKED on it would assert a causality that does not exist.
    //
    // Hints do not fail it, and that is the tool's own default rather than a setting here:
    // the tree reports 20 hints and 0 errors at exit 0. A step that fires on advisory
    // output is a step people learn to ignore.
    //
    // Both halves of the toolchain, not just the binary: `astro check` is a thin front end
    // over @astrojs/check, and without it the command prompts to install rather than
    // checking. A step that can prompt is a step that can hang (P-03).
    skipIf: () =>
      !existsSync(join(ROOT, 'site/node_modules/astro/bin/astro.mjs')) ||
      !existsSync(join(ROOT, 'site/node_modules/@astrojs/check')),
    skipNote: 'astro or @astrojs/check is not installed — run npm install in site/',
  },
  {
    name: 'e2e smoke',
    protects: 'every route the collection derives is actually served, and a route that is not yet built says so out loud instead of 404ing in production (T-02, INC-03)',
    // Playwright's real list-reporter summary is now recognized the same way Vitest's is —
    // an all-skipped run (the shape that genuinely exits 0 with nothing verified in this
    // project's config) does not report PASS.
    // Same raw-source-text nuance as 'component tests' above — the file's test name escapes
    // its apostrophe (Playwright\'s), so the backslash is part of the literal match target.
    redProof: { file: 'scripts/guards/lib/gate.test.mjs', test: "RED: a step whose stdout is Playwright\\'s real zero-tests summary does not report PASS" },
    // Playwright's own bin through node, for the reason the two steps around this one
    // already carry: spawnSync has no shell and npx is a .cmd shim on Windows.
    cmd: [process.execPath, join(ROOT, 'site/node_modules/@playwright/test/cli.js'), 'test'],
    cwd: join(ROOT, 'site'),
    // The suite builds and serves dist/ itself, so this step is the production build's
    // only automated verification. It declares the gap out loud rather than passing on
    // nothing when the suite is absent (P-03) — same shape as the two steps above.
    skipIf: () => !existsSync(join(ROOT, 'site/tests/e2e')),
    skipNote: 'site/tests/e2e does not exist yet',
  },
  {
    name: 'mutation',
    protects: 'a surviving mutant is observable proof that a test proves nothing (T-03, D3)',
    // This step's own historical failure was exactly a drifted binary path (the npx .cmd-shim
    // substitution documented below) — the same class gate-steps.mjs's cmd-existence check
    // catches structurally, ahead of the next one.
    redProof: { file: 'scripts/guards/lib/gate-steps.test.mjs', test: 'RED: a cmd entry that looks like a resolved .mjs path but does not exist is a finding' },
    // Stryker's own bin through node, NOT `npx stryker run`. ADR-006 names the npx form and
    // that is still the command to type by hand — but spawnSync has no shell, and on Windows
    // `npx` is a .cmd shim, so spawnSync('npx', ...) returns { status: null, error: ENOENT }.
    // gate.mjs's `?? 1` then turns that into an ordinary FAIL. Measured 2026-08-24: the step
    // reported FAIL in six seconds while `npx stryker run` in the same tree passed at 74.54.
    // A gate step that fails because it never ran is worse than one that fails loudly, so
    // every step here resolves a real file rather than a shim.
    cmd: ['node', 'node_modules/@stryker-mutator/core/bin/stryker.js', 'run'],
    // dependsOn's first real user. TASK 34 built the mechanism and closed with zero, having
    // checked all fourteen steps and found none that consumes a predecessor's output.
    //
    // DERIVED, not assumed (P-13). Measured 2026-08-24 against a deliberately red suite:
    // Stryker does NOT report garbage — it exits 1 in seconds with `ConfigError: There were
    // failed tests in the initial test run.` So this is not protecting Stryker from bad input.
    // It is about the REPORT: without it, one broken guard test produces two failures, and the
    // second one tells you a mutant survived, which is not what happened. BLOCKED names the
    // root cause once.
    //
    // Both test tiers, not just the guards — the gate has two node:test steps and Stryker's
    // initial run covers both surfaces (scripts/guards/lib/** and site/lib/**). A broken
    // 'site core tests' step dies inside Stryker's initial run exactly like a broken
    // 'guard tests' step does, so naming only one root cause left the other unblocked and
    // reporting the same misleading "mutant survived" (TASK 39).
    dependsOn: ['guard tests', 'site core tests'],
    // A fresh clone has no root node_modules, and without this `npx` would go to the network
    // and download Stryker mid-gate. The cost is a step that can vanish quietly, which is
    // INC-08's shape — so CI installs at the root and the summary prints every skip out loud.
    // The BINARY, not the package directory: an interrupted install leaves the directory
    // present and bin/stryker.js absent, and existsSync on the directory would then report a
    // tool that is not there. Same path the cmd above resolves, so the check cannot drift.
    skipIf: () => !existsSync(join(ROOT, 'node_modules/@stryker-mutator/core/bin/stryker.js')),
    skipNote: 'stryker not installed — run npm install at the repository root',
  },
  {
    name: 'rules registry',
    protects: 'unique ids, every rule has an origin and a rung, no dangling citations (G-10)',
    redProof: { file: 'scripts/guards/lib/rules-registry.test.mjs', test: 'RED: duplicate id across files is caught' },
    cmd: ['node', 'scripts/guards/gate/check-rules-registry.mjs'],
  },
  {
    name: 'confidentiality',
    protects: 'no banned term reaches a publishable file (C-05)',
    redProof: { file: 'scripts/guards/lib/terms.test.mjs', test: 'RED: a term in docs/ is found — the exact gap the hardcoded path roster left open' },
    cmd: ['node', 'scripts/guards/gate/check-terms.mjs'],
    // H-04: private/ is gitignored by design — the mapping never reaches a CI runner, and
    // must not. TASK 106: this step declares the gap out loud (P-03) rather than the checkout
    // pretending to be a pass or the checker forced to fail on a runner that was never meant
    // to hold this file. gate.mjs's own summary prints this skip by name, and CI's own gate
    // step treats a run whose ONLY skip is this one as accepted — every other check still ran.
    skipIf: () => !existsSync(join(ROOT, 'private/banned-terms.txt')),
    skipNote: 'private/banned-terms.txt is absent — the confidentiality check runs where the mapping lives (H-04), never on a runner',
  },
  {
    name: 'templates',
    protects: 'the fields the delegation gate reads still exist in the spec template (H-05)',
    redProof: { file: 'scripts/guards/lib/templates.test.mjs', test: 'RED: dropping a gate-critical field is caught, with the reason' },
    cmd: ['node', 'scripts/guards/gate/check-templates.mjs'],
  },
  {
    name: 'runtime boundary',
    protects: 'every hard rule has a deny rule behind it, and no boundary rests on ask (G-03)',
    redProof: { file: 'scripts/guards/lib/settings.test.mjs', test: 'RED: a write boundary with no Write() deny is caught' },
    cmd: ['node', 'scripts/guards/gate/check-settings.mjs'],
  },
  {
    name: 'contracts',
    protects: 'a declared contract names a real enforcer, and cannot claim to be built when it is not',
    redProof: { file: 'scripts/guards/lib/contracts.test.mjs', test: 'RED: claiming built while the enforcer is missing is caught' },
    cmd: ['node', 'scripts/guards/gate/check-contracts.mjs'],
  },
  {
    name: 'agent roster',
    protects: 'least privilege by allowlist: six posture dimensions, live bootstrap paths, withheld tools (G-05, G-09)',
    redProof: { file: 'scripts/guards/lib/agents.test.mjs', test: 'RED: a role with no frontmatter is caught' },
    cmd: ['node', 'scripts/guards/gate/check-agents.mjs'],
  },
  {
    name: 'procedures',
    protects: 'the router resolves, and no done-dimension claims passed with nothing behind it (P-03, A22)',
    redProof: { file: 'scripts/guards/lib/procedures.test.mjs', test: 'RED: tables outside the router section are not swept' },
    cmd: ['node', 'scripts/guards/gate/check-procedures.mjs'],
  },
  {
    name: 'evidence trace',
    protects: 'the trace conforms, seq stays dense, redaction held, and the hooks are wired (A11, INC-08)',
    redProof: { file: 'scripts/guards/lib/evidence.test.mjs', test: 'RED: an empty or whitespace-only agent_type is treated as absent, not as a name' },
    cmd: ['node', 'scripts/guards/gate/check-trace.mjs'],
  },
  {
    name: 'living docs + CI',
    protects: 'no document points at a file that does not exist, and CI carries no path filter (P-07, INC-08)',
    redProof: { file: 'scripts/guards/lib/doc-links.test.mjs', test: 'RED: placeholders are not path claims' },
    cmd: ['node', 'scripts/guards/gate/check-docs.mjs'],
  },
  {
    name: 'context budget',
    protects: 'always-loaded instructions stay small enough to be followed (D10)',
    redProof: { file: 'scripts/guards/lib/context-budget.test.mjs', test: 'RED: over budget is caught and names the largest contributor' },
    cmd: ['node', 'scripts/guards/gate/check-context-budget.mjs'],
  },
  {
    name: 'content',
    protects: 'locale parity and the frontmatter shape each type requires (C-09, C-14)',
    redProof: { file: 'scripts/guards/lib/content.test.mjs', test: 'RED: an English page with no Spanish counterpart is caught' },
    cmd: ['node', 'scripts/guards/gate/check-content.mjs'],
  },
  {
    name: 'design canvas',
    protects: 'the design canvas stays internally consistent and in sync with its specification (P-13)',
    // Same raw-source-text nuance again — canvas.test.mjs escapes its apostrophe (home\'s).
    redProof: { file: 'scripts/guards/lib/canvas.test.mjs', test: "RED: the real defect — the Spanish home\\'s wordmark still points at the English home" },
    cmd: ['node', 'docs/design/canvas/verify.mjs'],
  },
  {
    name: 'site structure',
    protects: 'the file cap, the gateway boundary and the framework-free core (S-02, S-03, ADR-008)',
    redProof: { file: 'scripts/guards/lib/site-structure.test.mjs', test: 'RED: a directory at seven files is a finding' },
    cmd: ['node', 'scripts/guards/gate/check-site.mjs'],
    // Until the skeleton item lands there is no tree to shape. A PASS here would be
    // a guard reporting coverage it does not have (P-03).
    skipIf: () => !existsSync(join(ROOT, 'site')),
    skipNote: 'site/ does not exist yet',
  },  {
    name: 'eval suite',
    protects: 'every incident has a case, every case a resolvable proof, and no unproven case claims Caught (A15, A16)',
    redProof: { file: 'scripts/guards/lib/evals.test.mjs', test: 'RED: a field added to the template becomes required without touching the config' },
    cmd: ['node', 'scripts/guards/gate/check-evals.mjs'],
  },
  {
    name: 'status history',
    protects: 'K2 has a substrate: a work item leaving `DONE` carries the reason it did, checked against a history no agent can author (TASK 66, H-01)',
    redProof: { file: 'scripts/guards/lib/status-history.test.mjs', test: 'RED: a derived reopen with no declaration is a finding' },
    cmd: ['node', 'scripts/guards/gate/check-status-history.mjs'],
  },
];

// The run loop lives in guards/lib/gate.mjs so it can be tested without spawning
// sixteen processes. This file owns the step list and the reporting, nothing else.
//
// Everything below runs only when this file is executed directly (`node scripts/gate.mjs`),
// never when it is imported — gate-steps.test.mjs imports STEPS as data, and a module whose
// import alone spawns every step and calls process.exit is untestable (TASK 63). Compared as
// URLs, not raw paths: `import.meta.url` is a `file://` URL and `process.argv[1]` is a plain
// OS path, and on Windows those two spellings of the same file never string-match each other.
const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

function main() {
  const { results, failures, incomplete, exitCode } = runGate(STEPS, (step) => {
    const [bin, ...args] = step.cmd;
    const exe = bin === 'node' ? process.execPath : bin;
    // A step may declare its own working directory. Almost none do — the gate reads the
    // repository from the root — but a package-scoped runner has to start inside its package
    // to resolve its own config, and passing that as a flag would be a second way to say the
    // same thing. ROOT stays the default, so nothing that does not ask is affected.
    //
    // stdout is captured rather than inherited so `runGate` can derive liveness from a test
    // runner's own summary line (TASK 39) — a step that exits 0 having run zero tests must
    // not report PASS. stderr still streams straight to the terminal, so a hung or noisy step
    // is still visible live; the captured stdout is written out below, once the step is done.
    const result = spawnSync(exe, args, { cwd: step.cwd ?? ROOT, stdio: ['inherit', 'pipe', 'inherit'], encoding: 'utf8' });
    if (result.stdout) process.stdout.write(result.stdout);
    return { code: result.status ?? 1, stdout: result.stdout ?? '' };
  });

  console.log('\n' + '-'.repeat(60));
  for (const line of formatSummary(results)) console.log(line);
  console.log('-'.repeat(60));

  if (incomplete.length) console.log(`\n${incomplete.length} step(s) skipped — declared, not silent.`);

  if (failures.length) {
    // Reporting every step is not the same as burying the failure: the summary above
    // is scannable, and this block is the thing you cannot scroll past.
    console.error(`\nGATE FAILED — ${failures.length} of ${results.length} step(s) did not pass:`);
    for (const { step, status, note } of failures) {
      console.error(`\n  ${status}  ${step.name}${note ? ` (${note})` : ''}`);
      console.error(`    protects: ${step.protects}`);
    }
    process.exit(exitCode);
  }

  if (incomplete.length) {
    // Nothing FAILED, but a SKIP is not a PASS either — the step's check never ran,
    // so "GATE PASSED" here would be exactly the false-green TASK 39 exists to close.
    // A distinct headline and a distinct exit code (2) let a human — and CI — tell
    // "broken" apart from "incomplete" without reading the summary above.
    console.error(`\nGATE INCOMPLETE — ${incomplete.length} of ${results.length} step(s) did not run:`);
    for (const { step, note } of incomplete) {
      console.error(`\n  SKIP  ${step.name}${note ? ` (${note})` : ''}`);
      console.error(`    protects: ${step.protects}`);
    }
    process.exit(exitCode);
  }

  console.log('\nGATE PASSED');
}

if (isMain) main();
