import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateWorkflow } from './ci.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const OPTS = { gateCommand: 'node scripts/gate.mjs' };

const good = `name: harness
on:
  push:
  pull_request:
  workflow_dispatch:
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: node scripts/gate.mjs
`;

test('green path: an unfiltered workflow that runs the gate passes', () => {
  assert.deepEqual(validateWorkflow(good, OPTS), []);
});

// --- INC-08, the incident this file exists for ------------------------------

test('RED: a paths filter is caught — this is INC-08 exactly', () => {
  // Two path-filtered workflows meant a repo-root guard ran in CI exactly ZERO times since
  // it was written, and nobody could tell, because the local gate was green. The filter is
  // the defect: a gate that protects the repository must run for every change to it.
  const s = good.replace('  push:\n', "  push:\n    paths:\n      - 'src/**'\n");
  const f = validateWorkflow(s, OPTS);
  assert.equal(f.length, 1);
  assert.match(f[0].message, /paths/);
});

test('RED: paths-ignore is the same defect wearing the other name', () => {
  const s = good.replace('  push:\n', "  push:\n    paths-ignore:\n      - '**.md'\n");
  assert.ok(validateWorkflow(s, OPTS).some((x) => /paths-ignore/.test(x.message)));
});

test('RED: a workflow that never invokes the gate is caught', () => {
  const s = good.replace('      - run: node scripts/gate.mjs\n', '      - run: npm test\n');
  assert.ok(validateWorkflow(s, OPTS).some((x) => /gate/.test(x.message)));
});

test('RED: a workflow that does not run on push is caught', () => {
  const s = good.replace('  push:\n', '');
  assert.ok(validateWorkflow(s, OPTS).some((x) => /push/.test(x.message)));
});

test('RED: a workflow with no pull_request trigger is caught', () => {
  const s = good.replace('  pull_request:\n', '');
  assert.ok(validateWorkflow(s, OPTS).some((x) => /pull_request/.test(x.message)));
});

test('RED: a workflow pinned to a Node older than the one the guards need is caught', () => {
  // The guards use node:test and modern syntax. A CI on 18 fails in a way that reads as a
  // guard defect rather than an environment one, which costs an hour every time.
  const s = good.replace("node-version: '24'", "node-version: '18'");
  assert.ok(validateWorkflow(s, { ...OPTS, minNode: 24 }).some((x) => /node/i.test(x.message)));
});

test('RED: a workflow that pins no Node version at all is caught', () => {
  const s = good.replace("        with:\n          node-version: '24'\n", '');
  assert.ok(validateWorkflow(s, { ...OPTS, minNode: 24 }).some((x) => /node/i.test(x.message)));
});

test('an empty workflow file fails rather than passing vacuously', () => {
  assert.ok(validateWorkflow('', OPTS).length > 0);
});

// --- liveness ---------------------------------------------------------------

test('LIVENESS: the real workflow exists and validates', () => {
  const p = join(ROOT, '.github/workflows/harness.yml');
  assert.ok(existsSync(p), '.github/workflows/harness.yml does not exist');
  assert.deepEqual(validateWorkflow(readFileSync(p, 'utf8'), { gateCommand: 'node scripts/gate.mjs', minNode: 24 }), []);
});

test('LIVENESS: the workflow runs the same command a human runs locally', () => {
  // T-09: the gate is one command and is CI parity. A CI that runs a different set of steps
  // means the local run verifies less than CI does, and nobody notices until CI is red.
  const text = readFileSync(join(ROOT, '.github/workflows/harness.yml'), 'utf8');
  assert.match(text, /node scripts\/gate\.mjs/);
  assert.equal(/npm (run )?test|node --test/.test(text), false,
    'CI re-lists a step the gate already delegates to — a step added to the gate would then be absent from CI');
});
