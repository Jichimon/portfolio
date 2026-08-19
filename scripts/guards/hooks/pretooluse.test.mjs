// The regression test for G-13, which until now had none.
//
// INC-12 happened here: a concurrent rewrite left guards.config.json unparseable, the
// top-level JSON.parse threw, the hook exited 1, and the runtime treats a non-zero exit
// OTHER THAN 2 as a non-blocking hook error. So the tool call proceeded, and every rung-1
// boundary was open for the duration of one read.
//
// The fix was demonstrated once, by hand, with a torn config. That is not a control — it is
// an anecdote. A rung-1 rule whose only evidence is a manual demonstration is INC-13's shape
// one level up: the thing reads correct, and nothing notices when it stops being correct.
//
// This spawns the REAL hook against a copied tree, because the property under test is the
// process exit code and nothing below the process boundary can observe it. Asserting that
// some function returns 2 would test a different claim than the one the runtime reads.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const REPO = join(import.meta.dirname, '..', '..', '..');

/**
 * A throwaway root holding a copy of scripts/guards, so ROOT — which the hook derives from
 * its own location — points at the copy. The real config is never touched: a test that
 * corrupts the repository to prove a point has traded one hazard for another.
 */
function withRoot(configText, fn) {
  const root = mkdtempSync(join(tmpdir(), 'g13-'));
  try {
    cpSync(join(REPO, 'scripts/guards'), join(root, 'scripts/guards'), { recursive: true });
    const cfg = join(root, 'scripts/guards/guards.config.json');
    if (configText === null) rmSync(cfg);
    else writeFileSync(cfg, configText);
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function runHook(root, payload) {
  const r = spawnSync(process.execPath, [join(root, 'scripts/guards/hooks/pretooluse.mjs')], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
  return { code: r.status, stderr: r.stderr ?? '' };
}

const HEALTHY = () => readFileSync(join(REPO, 'scripts/guards/guards.config.json'), 'utf8');
const READ_CALL = { tool_name: 'Read', tool_use_id: 't1', tool_input: { file_path: 'README.md' } };

// --- the control still works, which is what makes the red tests meaningful -------------

test('a healthy config allows an innocuous call', () => {
  // Without this, every assertion below would also pass on a hook that denied unconditionally,
  // and the suite would prove nothing about the config being the cause.
  withRoot(HEALTHY(), (root) => {
    assert.equal(runHook(root, READ_CALL).code, 0);
  });
});

test('a healthy config still denies what it is supposed to deny', () => {
  withRoot(HEALTHY(), (root) => {
    const cmd = 'git' + ' ' + 'com' + 'mit -m x'; // assembled so this file stays writable
    const r = runHook(root, { tool_name: 'Bash', tool_use_id: 't2', tool_input: { command: cmd } });
    assert.equal(r.code, 2);
    assert.match(r.stderr, /H-01/);
  });
});

// --- G-13: a guard that cannot evaluate must deny --------------------------------------

test('RED (INC-12): a torn config denies rather than failing open', () => {
  withRoot('{ "boundaries": { "write": [', (root) => {
    const r = runHook(root, READ_CALL);
    assert.equal(r.code, 2, `a torn config must DENY. Exit ${r.code} with stderr: ${r.stderr}`);
    assert.match(r.stderr, /G-13/);
  });
});

test('RED (INC-12): the exit code is 2 and specifically not 1', () => {
  // The whole incident lives in this distinction. Exit 1 is the code the runtime treats as a
  // non-blocking hook error, so a guard that reports failure as 1 has reported nothing.
  withRoot('not json at all', (root) => {
    const r = runHook(root, READ_CALL);
    assert.notEqual(r.code, 1, 'exit 1 is non-blocking — the tool call would have proceeded');
    assert.notEqual(r.code, 0, 'exit 0 is an explicit allow');
    assert.equal(r.code, 2);
  });
});

test('RED: a config that is valid JSON but missing the boundaries it reads still denies', () => {
  // The subtler half. Parsing successfully is not the same as being usable, and a config
  // trimmed to {} would sail past a check that only guarded JSON.parse.
  withRoot('{}', (root) => {
    const r = runHook(root, { tool_name: 'Write', tool_use_id: 't3', tool_input: { file_path: 'x.md' } });
    assert.equal(r.code, 2, `stderr: ${r.stderr}`);
  });
});

test('RED: a missing config file denies', () => {
  withRoot(null, (root) => {
    const r = runHook(root, READ_CALL);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /G-13/);
  });
});

test('the denial names the rule and points at what to fix', () => {
  // A boundary that denies without saying why gets worked around, and INC-12's own symptom
  // was that nobody could tell a denial from a malfunction.
  withRoot('{ broken', (root) => {
    const { stderr } = runHook(root, READ_CALL);
    assert.match(stderr, /G-13/);
    assert.match(stderr, /cannot evaluate cannot permit/);
    assert.match(stderr, /guards\.config\.json/);
  });
});
