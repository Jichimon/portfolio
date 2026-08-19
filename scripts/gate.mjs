#!/usr/bin/env node
// The one-command gate. It DELEGATES to sub-gates rather than re-listing their steps
// (T-09): a step added to a sub-gate must not be silently absent here, or the local
// run quietly verifies less than CI does.
//
// Fails loudly and names the failing step (V-01 / INC-08). A step that did nothing
// says so — a silent no-op is indistinguishable from success.

import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

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
    name: 'eval suite',
    protects: 'every incident has a case, every case a resolvable proof, and no unproven case claims Caught (A15, A16)',
    cmd: ['node', 'scripts/guards/gate/check-evals.mjs'],
  },
];

let failed = null;
const results = [];

for (const step of STEPS) {
  if (step.skipIf?.()) {
    results.push({ step, status: 'SKIP', note: 'target does not exist yet' });
    continue;
  }
  const [bin, ...args] = step.cmd;
  const exe = bin === 'node' ? process.execPath : bin;
  const r = spawnSync(exe, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) {
    results.push({ step, status: 'FAIL' });
    failed = step;
    break; // fail fast
  }
  results.push({ step, status: 'PASS' });
}

console.log('\n' + '-'.repeat(60));
for (const { step, status, note } of results) {
  console.log(`  ${status.padEnd(5)} ${step.name}${note ? `  (${note})` : ''}`);
}
console.log('-'.repeat(60));

if (failed) {
  console.error(`\nGATE FAILED at: ${failed.name}`);
  console.error(`  protects: ${failed.protects}`);
  process.exit(1);
}

const skipped = results.filter((r) => r.status === 'SKIP');
if (skipped.length) console.log(`\n${skipped.length} step(s) skipped — declared, not silent.`);
console.log('\nGATE PASSED');
