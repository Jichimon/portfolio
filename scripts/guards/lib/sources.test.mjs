// A regression guard for a defect in the SOURCES themselves, not in what they check.
//
// Twice now, a guard shipped with a regex that could never match, because a word-boundary
// `\b` and a backreference `\1` arrived on disk as literal 0x08 and 0x01 bytes. Both times
// the code read correctly in every inspection — grep, the editor and line printing all render
// a control byte invisibly — and both times the accompanying red test was the only thing that
// noticed. Once, the test passed anyway for an unrelated reason, and the guard was asleep for
// several minutes without anyone knowing.
//
// This is INC-07's shape arriving through the tooling used to WRITE guards, which is why it
// gets a permanent check rather than more care.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const SCANNED = ['scripts', '.claude', 'docs', 'evaluation-cases', 'CLAUDE.md', 'TASKS.md', 'README.md'];

/** Tab, newline and carriage return are legitimate. Everything else below 0x20 is not. */
const isStray = (b) => b < 9 || b === 11 || b === 12 || (b >= 14 && b <= 31);

function walk(abs, out = []) {
  if (statSync(abs).isFile()) { out.push(abs); return out; }
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    walk(join(abs, e.name), out);
  }
  return out;
}

test('no source file carries a stray control byte', () => {
  const offenders = [];
  let scanned = 0;

  for (const root of SCANNED) {
    for (const file of walk(join(ROOT, root))) {
      if (!/\.(mjs|js|md|json|ya?ml|sh|txt)$/.test(file)) continue;
      scanned++;
      const buf = readFileSync(file);
      for (let i = 0; i < buf.length; i++) {
        if (!isStray(buf[i])) continue;
        const near = buf.subarray(Math.max(0, i - 50), i + 15).toString('utf8').replace(/\n/g, ' ');
        offenders.push(`${relative(ROOT, file)} byte 0x${buf[i].toString(16).padStart(2, '0')} at ${i}: …${near}…`);
        break;
      }
    }
  }

  assert.ok(scanned > 40, `expected to scan a meaningful number of files, scanned ${scanned}`);
  assert.deepEqual(offenders, [],
    `a control byte in source is almost always a mangled escape — a \\b or \\1 that became 0x08 or 0x01, ` +
    `leaving a regex that reads correctly and can never match:\n  ${offenders.join('\n  ')}`);
});

test('the check would catch a planted control byte', () => {
  // P-14: a guard seen only to pass has not been tested. This asserts the predicate itself,
  // since the test above is expected to find nothing on a healthy tree and would look
  // identical if `isStray` were broken.
  assert.equal(isStray(0x08), true, 'backspace — what a mangled \\b becomes');
  assert.equal(isStray(0x01), true, 'SOH — what a mangled \\1 becomes');
  assert.equal(isStray(0x00), true);
  for (const ok of [0x09, 0x0a, 0x0d, 0x20, 0x41]) {
    assert.equal(isStray(ok), false, `0x${ok.toString(16)} is legitimate`);
  }
});
