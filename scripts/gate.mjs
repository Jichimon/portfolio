#!/usr/bin/env node
// The one-command gate. It DELEGATES to sub-gates rather than re-listing their steps
// (T-09): a step added to a sub-gate must not be silently absent here, or the local
// run quietly verifies less than CI does.
//
// Fails loudly and names EVERY failing step (V-01 / INC-08). A step that did nothing
// says so — a silent no-op is indistinguishable from success.

import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import { runGate, formatSummary } from './guards/lib/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Each step names what it protects, so a failure reads as a broken guarantee
 * rather than a broken command.
 */
const STEPS = [
  {
    name: 'guard tests',
    protects: 'a guard nobody tested is a guard nobody can trust (P-14, T-04)',
    cmd: ['node', '--test', 'scripts/guards/**/*.test.mjs'],
    // Node's runner takes a directory; if none exist yet the step declares itself skipped.
    skipIf: () => !existsSync(join(ROOT, 'scripts/guards/lib')),
  },
  {
    name: 'mutation',
    protects: 'a surviving mutant is observable proof that a test proves nothing (T-03, D3)',
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
    dependsOn: 'guard tests',
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
    cmd: ['node', 'scripts/guards/gate/check-rules-registry.mjs'],
  },
  {
    name: 'confidentiality',
    protects: 'no banned term reaches a publishable file (C-05)',
    cmd: ['node', 'scripts/guards/gate/check-terms.mjs'],
  },
  {
    name: 'templates',
    protects: 'the fields the delegation gate reads still exist in the spec template (H-05)',
    cmd: ['node', 'scripts/guards/gate/check-templates.mjs'],
  },
  {
    name: 'runtime boundary',
    protects: 'every hard rule has a deny rule behind it, and no boundary rests on ask (G-03)',
    cmd: ['node', 'scripts/guards/gate/check-settings.mjs'],
  },
  {
    name: 'contracts',
    protects: 'a declared contract names a real enforcer, and cannot claim to be built when it is not',
    cmd: ['node', 'scripts/guards/gate/check-contracts.mjs'],
  },
  {
    name: 'agent roster',
    protects: 'least privilege by allowlist: six posture dimensions, live bootstrap paths, withheld tools (G-05, G-09)',
    cmd: ['node', 'scripts/guards/gate/check-agents.mjs'],
  },
  {
    name: 'procedures',
    protects: 'the router resolves, and no done-dimension claims passed with nothing behind it (P-03, A22)',
    cmd: ['node', 'scripts/guards/gate/check-procedures.mjs'],
  },
  {
    name: 'evidence trace',
    protects: 'the trace conforms, seq stays dense, redaction held, and the hooks are wired (A11, INC-08)',
    cmd: ['node', 'scripts/guards/gate/check-trace.mjs'],
  },
  {
    name: 'living docs + CI',
    protects: 'no document points at a file that does not exist, and CI carries no path filter (P-07, INC-08)',
    cmd: ['node', 'scripts/guards/gate/check-docs.mjs'],
  },
  {
    name: 'context budget',
    protects: 'always-loaded instructions stay small enough to be followed (D10)',
    cmd: ['node', 'scripts/guards/gate/check-context-budget.mjs'],
  },
  {
    name: 'content',
    protects: 'locale parity and the frontmatter shape each type requires (C-09, C-14)',
    cmd: ['node', 'scripts/guards/gate/check-content.mjs'],
  },
  {
    name: 'design canvas',
    protects: 'the design canvas stays internally consistent and in sync with its specification (P-13)',
    cmd: ['node', 'docs/design/canvas/verify.mjs'],
  },
  {
    name: 'site structure',
    protects: 'the file cap, the gateway boundary and the framework-free core (S-02, S-03, ADR-008)',
    cmd: ['node', 'scripts/guards/gate/check-site.mjs'],
    // Until the skeleton item lands there is no tree to shape. A PASS here would be
    // a guard reporting coverage it does not have (P-03).
    skipIf: () => !existsSync(join(ROOT, 'site')),
    skipNote: 'site/ does not exist yet',
  },  {
    name: 'eval suite',
    protects: 'every incident has a case, every case a resolvable proof, and no unproven case claims Caught (A15, A16)',
    cmd: ['node', 'scripts/guards/gate/check-evals.mjs'],
  },
];

// The run loop lives in guards/lib/gate.mjs so it can be tested without spawning
// sixteen processes. This file owns the step list and the reporting, nothing else.
const { results, failures, exitCode } = runGate(STEPS, (step) => {
  const [bin, ...args] = step.cmd;
  const exe = bin === 'node' ? process.execPath : bin;
  return spawnSync(exe, args, { cwd: ROOT, stdio: 'inherit' }).status ?? 1;
});

console.log('\n' + '-'.repeat(60));
for (const line of formatSummary(results)) console.log(line);
console.log('-'.repeat(60));

const skipped = results.filter((r) => r.status === 'SKIP');
if (skipped.length) console.log(`\n${skipped.length} step(s) skipped — declared, not silent.`);

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

console.log('\nGATE PASSED');
