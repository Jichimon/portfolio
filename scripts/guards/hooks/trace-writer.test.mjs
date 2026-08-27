// TASK 12 slice 5 — the writer's half of the observed posture header. The pure decision lives
// in evidence.mjs's posturePatch and is tested there; this asserts that `record` actually
// wires it in, using the file text it already reads for `nextSeq` rather than reading twice,
// and that it never adds a second header for an unchanged mode.
//
// Every fixture lives under a temporary directory of this test's own making — node:os's
// tmpdir plus a unique subdirectory, cleaned up afterwards. Never evidence/, which H-03 denies
// by every vector.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { record, loadTerms } from './trace-writer.mjs';

const withTmpRoot = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'trace-writer-test-'));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};

/** Read every line in the one file record() writes for an orchestrator run, as parsed events. */
function readEvents(root, sessionId) {
  const file = join(root, 'evidence/runs', sessionId, 'orchestrator.jsonl');
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

test('RED: a PostToolUse-shaped payload with a real permission_mode writes an observed header', () => {
  withTmpRoot((root) => {
    const input = {
      session_id: 'sess-1', hook_event_name: 'PostToolUse', permission_mode: 'default',
      tool_use_id: 't1', tool_name: 'Bash',
    };
    record(root, input, [{ ev: 'tool.result', tool_use_id: 't1', tool: 'Bash', ok: true }]);

    const events = readEvents(root, 'sess-1');
    const headers = events.filter((e) => e.ev === 'run.header');
    assert.equal(headers.length, 1, 'exactly one observed header should be written');
    assert.equal(headers[0].reason, 'observed');
    assert.equal(headers[0].permission_mode, 'default');
    // Stamped by the same code path as every other event.
    assert.ok(headers[0].seq >= 1);
    assert.ok(headers[0].ts);
    assert.equal(headers[0].run_id, 'sess-1');
  });
});

test('a second identical call adds no second header', () => {
  withTmpRoot((root) => {
    const input = {
      session_id: 'sess-2', hook_event_name: 'PostToolUse', permission_mode: 'default',
      tool_use_id: 't1', tool_name: 'Bash',
    };
    record(root, input, [{ ev: 'tool.result', tool_use_id: 't1', tool: 'Bash', ok: true }]);
    record(root, { ...input, tool_use_id: 't2' }, [{ ev: 'tool.result', tool_use_id: 't2', tool: 'Bash', ok: true }]);

    const events = readEvents(root, 'sess-2');
    const headers = events.filter((e) => e.ev === 'run.header');
    assert.equal(headers.length, 1, 'the mode did not change, so nothing new should be observed');
  });
});

test('a mode change between calls writes a second observed header', () => {
  withTmpRoot((root) => {
    const base = { session_id: 'sess-3', hook_event_name: 'PostToolUse', tool_name: 'Bash' };
    record(root, { ...base, permission_mode: 'default', tool_use_id: 't1' },
      [{ ev: 'tool.result', tool_use_id: 't1', tool: 'Bash', ok: true }]);
    record(root, { ...base, permission_mode: 'bypassPermissions', tool_use_id: 't2' },
      [{ ev: 'tool.result', tool_use_id: 't2', tool: 'Bash', ok: true }]);

    const events = readEvents(root, 'sess-3');
    const headers = events.filter((e) => e.ev === 'run.header');
    assert.equal(headers.length, 2);
    assert.equal(headers[1].permission_mode, 'bypassPermissions');
    assert.equal(headers[1].reason, 'observed');
  });
});

test('a real permission_mode alongside events that already begin with a run.header adds no second one', () => {
  withTmpRoot((root) => {
    // Belt and braces on the adjacency rule: even if a caller's own events already start
    // with a run.header (as SessionStart's do), record() must not also prepend one.
    const input = { session_id: 'sess-4', hook_event_name: 'SessionStart', permission_mode: 'default' };
    record(root, input, [{ ev: 'run.header', permission_mode: 'default', reason: 'startup' }]);

    const events = readEvents(root, 'sess-4');
    const headers = events.filter((e) => e.ev === 'run.header');
    assert.equal(headers.length, 1, 'only the caller-supplied header should be written');
    assert.equal(headers[0].reason, 'startup');
  });
});

test('record never throws when permission_mode is absent, as SessionStart payloads send it', () => {
  withTmpRoot((root) => {
    const input = { session_id: 'sess-5', hook_event_name: 'SessionStart' };
    assert.doesNotThrow(() => {
      record(root, input, [{ ev: 'run.header', permission_mode: 'unknown', reason: 'startup' }]);
    });
    const events = readEvents(root, 'sess-5');
    assert.equal(events.filter((e) => e.ev === 'run.header').length, 1);
  });
});

// --- TASK 59: loadTerms must not silently protect nothing ------------------------------
//
// A missing list is silently an empty list today, and an empty list means mask() blanks
// nothing — redaction becomes a no-op with nothing anywhere saying so. private/ absent is
// a normal state (gitignored, never committed) and must stay [] without complaint; private/
// present with a broken list is the hole, and must fail loud (G-13) instead.

test('loadTerms: private/ absent returns [] without throwing', () => {
  withTmpRoot((root) => {
    assert.doesNotThrow(() => {
      const terms = loadTerms(root);
      assert.deepEqual(terms, []);
    });
  });
});

test('RED: loadTerms throws when private/ exists but banned-terms.txt is absent', () => {
  withTmpRoot((root) => {
    mkdirSync(join(root, 'private'), { recursive: true });
    assert.throws(() => loadTerms(root), /banned-terms\.txt/i);
  });
});

test('RED: loadTerms throws when the list exists but parses to zero terms', () => {
  withTmpRoot((root) => {
    mkdirSync(join(root, 'private'), { recursive: true });
    writeFileSync(join(root, 'private/banned-terms.txt'), '# just a comment\n\n');
    assert.throws(() => loadTerms(root), /no terms|empty/i);
  });
});

test('RED: loadTerms throws when a line carries only one of the two \\b markers', () => {
  withTmpRoot((root) => {
    mkdirSync(join(root, 'private'), { recursive: true });
    writeFileSync(join(root, 'private/banned-terms.txt'), '\\b SomeTerm\n');
    assert.throws(() => loadTerms(root), /malformed/i);
  });
});
