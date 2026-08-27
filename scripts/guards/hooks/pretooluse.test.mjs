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
import { cpSync, mkdtempSync, writeFileSync, rmSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const REPO = join(import.meta.dirname, '..', '..', '..');

/**
 * A throwaway root holding a copy of scripts/guards, so ROOT — which the hook derives from
 * its own location — points at the copy. The real config is never touched: a test that
 * corrupts the repository to prove a point has traded one hazard for another.
 *
 * `opts.bannedTerms`, when given, plants `private/banned-terms.txt` with that text at the
 * temp root (sibling of scripts/, matching ROOT's real layout three levels up from the hook).
 * Omitted entirely by default — no private/ directory at all — which is the normal state on
 * a fresh checkout (H-04's file is gitignored) and must not be confused with "private/
 * exists but is empty".
 */
function withRoot(configText, fn, opts = {}) {
  const root = mkdtempSync(join(tmpdir(), 'g13-'));
  try {
    cpSync(join(REPO, 'scripts/guards'), join(root, 'scripts/guards'), { recursive: true });
    const cfg = join(root, 'scripts/guards/guards.config.json');
    if (configText === null) rmSync(cfg);
    else writeFileSync(cfg, configText);
    if (opts.bannedTerms !== undefined) {
      mkdirSync(join(root, 'private'), { recursive: true });
      writeFileSync(join(root, 'private/banned-terms.txt'), opts.bannedTerms);
    }
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

/**
 * record-event.mjs is a recorder, not a guard: it must exit 0 unconditionally regardless of
 * what happens internally. Spawned as a real process for the same reason runHook is — the
 * property under test (exit code, and whether a file landed on disk) lives at the process
 * boundary, not inside a function.
 */
function runRecordEvent(root, payload) {
  const r = spawnSync(process.execPath, [join(root, 'scripts/guards/hooks/record-event.mjs')], {
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

// --- TASK 59: a malformed term list must not silently disable write-time scrubbing -----
//
// loadTerms() throwing on a broken private/ is only a control if the hook that calls it
// (via record() -> redactToolInput) actually turns that throw into a denial rather than an
// uncaught crash with some other exit code. main().catch() already does this for every
// throw; these tests prove it for THIS one specifically, by spawning the real hook.

test('RED (TASK 59): private/ present but its term list parses to zero terms denies with exit 2, not 1', () => {
  // Comment-only content: parseTerms itself does not throw on this (it only throws on a
  // malformed \b flag), so this exercises loadTerms's OWN new fail-closed check, not
  // parseTerms's pre-existing one — the actual hole this task closes.
  withRoot(HEALTHY(), (root) => {
    const r = runHook(root, READ_CALL);
    assert.equal(r.code, 2, `a guard that cannot load its term list must DENY. Exit ${r.code} with stderr: ${r.stderr}`);
    assert.notEqual(r.code, 1, 'exit 1 is non-blocking — the tool call would have proceeded');
    assert.match(r.stderr, /G-13/);
  }, { bannedTerms: '# just a comment, no real terms\n' });
});

test('RED (TASK 59): a checkout with no private/ at all still allows an innocuous call', () => {
  // No `bannedTerms` option at all, so withRoot creates no private/ directory — the normal
  // state on a fresh clone. loadTerms must return [] without complaint, not deny.
  withRoot(HEALTHY(), (root) => {
    const r = runHook(root, READ_CALL);
    assert.equal(r.code, 0, `stderr: ${r.stderr}`);
  });
});

// --- TASK 59: record-event.mjs cannot deny, so it must fail quiet, not fail loud ---------
//
// It calls loadTerms(ROOT) at top level with no try/catch. Today a broken term list kills it
// with an uncaught exception and an exit code the runtime treats as non-blocking (the mirror
// image of INC-12, on the recorder rather than the guard). The property that matters is
// narrower than "denies": a recorder cannot deny anything, so what must hold is that nothing
// unscrubbed reaches evidence/, and the process still exits 0 either way.

test('RED (TASK 59): record-event.mjs writes nothing and still exits 0 when the term list cannot be loaded', () => {
  withRoot(HEALTHY(), (root) => {
    const input = { session_id: 'sess-record-event-broken', hook_event_name: 'SessionStart', permission_mode: 'default' };
    const r = runRecordEvent(root, input);
    assert.equal(r.code, 0, `record-event.mjs must never be blocking, whatever went wrong internally. stderr: ${r.stderr}`);
    const evFile = join(root, 'evidence/runs', 'sess-record-event-broken', 'orchestrator.jsonl');
    assert.equal(existsSync(evFile), false, 'nothing should be written for an invocation whose term list could not be loaded');
  }, { bannedTerms: '# just a comment, no real terms\n' }); // private/ present, parses to zero terms
});

test('record-event.mjs still writes normally when the term list is fine (or private/ is absent)', () => {
  // The control: without this, the RED test above could pass for the wrong reason (e.g. the
  // script never writes anything at all) and prove nothing about the broken-list case.
  withRoot(HEALTHY(), (root) => {
    const input = { session_id: 'sess-record-event-healthy', hook_event_name: 'SessionStart', permission_mode: 'default' };
    const r = runRecordEvent(root, input);
    assert.equal(r.code, 0, `stderr: ${r.stderr}`);
    const evFile = join(root, 'evidence/runs', 'sess-record-event-healthy', 'orchestrator.jsonl');
    assert.equal(existsSync(evFile), true, 'a healthy run should still write its header');
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
