import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractCore, validateExportParity } from './export-parity.mjs';

const BEGIN = '<!-- CORE BEGIN -->';
const END = '<!-- CORE END -->';
const CONFIG = { beginMarker: BEGIN, endMarker: END, minFiles: 2 };

const CORE = '\n\n# The rules\n\nH-01 · the human owns commits.\n\n';
const doc = (path, core = CORE, prelude = '# Tool A\n', appendix = '\n## Install\n') =>
  ({ path, text: `${prelude}${BEGIN}${core}${END}${appendix}` });

const messages = (findings) => findings.map((f) => f.message).join(' | ');

test('green path: two documents sharing one core pass', () => {
  assert.deepEqual(validateExportParity([doc('a.md'), doc('b.md')], CONFIG), []);
});

test('green path: the tool-specific halves are free to differ, and that is the point', () => {
  const a = doc('a.md', CORE, '# Claude Code\n', '\n## Install — hooks\n');
  const b = doc('b.md', CORE, '# OpenCode\n', '\n## Install — plugins\n');
  assert.deepEqual(validateExportParity([a, b], CONFIG), []);
});

test('green path: a file carrying no markers is not a bootstrap and needs no exemption', () => {
  const index = { path: 'README.md', text: '# The export\n\nTwo documents live here.\n' };
  assert.deepEqual(validateExportParity([doc('a.md'), doc('b.md'), index], CONFIG), []);
});

test('the file set is derived, so a third bootstrap is covered by existing', () => {
  const findings = validateExportParity([doc('a.md'), doc('b.md'), doc('c.md', CORE + 'x')], CONFIG);
  assert.equal(findings.length, 1);
  assert.match(findings[0].file, /c\.md/);
});

// --- red paths ---

test('RED: a core differing by ONE byte is caught, and the finding locates it', () => {
  // The whole reason this guard exists. An amendment applied to one document and not the
  // other is invisible in review — both files are 1,300 lines and both look right.
  const drifted = doc('b.md', CORE.replace('the human owns commits', 'the human owns commits.'));
  const findings = validateExportParity([doc('a.md'), drifted], CONFIG);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /differs from a\.md at byte \d+ \(line \d+\)/);
});

test('RED: trailing whitespace inside the core is a difference, not a nicety', () => {
  const findings = validateExportParity([doc('a.md'), doc('b.md', CORE + ' ')], CONFIG);
  assert.equal(findings.length, 1);
  assert.match(messages(findings), /differs from/);
});

test('RED: a begin marker with no end marker is caught', () => {
  const truncated = { path: 'b.md', text: `# Tool B\n${BEGIN}${CORE}\n## Install\n` };
  const findings = validateExportParity([doc('a.md'), truncated], CONFIG);
  assert.match(messages(findings), /begin marker with no end marker/);
});

test('RED: an end marker with no begin marker is caught, rather than read as "not a bootstrap"', () => {
  // The quiet one: without this branch the file contributes no core, the count drops to one,
  // and a one-document parity check can never fail.
  const orphan = { path: 'b.md', text: `# Tool B\n${CORE}${END}\n## Install\n` };
  const findings = validateExportParity([doc('a.md'), orphan], CONFIG);
  assert.match(messages(findings), /end marker with no begin marker/);
});

test('RED: two marker pairs in one document are caught', () => {
  const twice = { path: 'b.md', text: `${BEGIN}${CORE}${END}\nmiddle\n${BEGIN}${CORE}${END}\n` };
  const findings = validateExportParity([doc('a.md'), twice], CONFIG);
  assert.match(messages(findings), /2 begin markers/);
});

test('RED: one begin marker with TWO end markers is caught, and contributes no core', () => {
  // Not the same document as the pair above: there the begin branch fires first and returns,
  // so this shape reached the end-marker branch in no test at all and the branch was alive.
  const twoEnds = { path: 'b.md', text: `${BEGIN}${CORE}${END}\ntail\n${END}\n` };
  const findings = validateExportParity([doc('a.md'), twoEnds], CONFIG);
  assert.match(messages(findings), /2 end markers/);
  // The early return matters as much as the message: a malformed document must contribute
  // nothing, or a half-read core gets compared as though it were one.
  assert.equal(extractCore(twoEnds, BEGIN, END).core, null);
});

test('RED: markers in the wrong order are caught', () => {
  const inverted = { path: 'b.md', text: `${END}${CORE}${BEGIN}\n` };
  const findings = validateExportParity([doc('a.md'), inverted], CONFIG);
  assert.match(messages(findings), /closes the shared core before it opens it/);
});

test('RED: an empty core is caught — two empty cores agree about nothing', () => {
  const empty = { path: 'b.md', text: `# Tool B\n${BEGIN}\n\n${END}\n` };
  const findings = validateExportParity([doc('a.md'), empty], CONFIG);
  assert.match(messages(findings), /empty shared core/);
});

test('RED: one bootstrap alone fails — a parity check over one document can never fail', () => {
  const findings = validateExportParity([doc('a.md')], CONFIG);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /at least 2/);
  // The finding is attributed to the directory, not to a file: no single document is at
  // fault when the fault is that there is only one of them.
  assert.equal(findings[0].file, 'docs/harness/export');
});

test('RED: an empty export directory fails rather than passing vacuously', () => {
  const findings = validateExportParity([], CONFIG);
  assert.match(messages(findings), /0 document\(s\) carry a shared core/);
});

// --- the offset is asserted EXACTLY, never as a shape ---
//
// A pattern like "at byte <digits>" passes for every integer, including the ones a broken
// scan produces. That is T-02 one level down: an assertion that survives the computation
// being wrong is not an assertion about the computation. The mutation run found it — the
// whole scan loop was alive behind the loose pattern in the one-byte test above, which
// reported a rising score while proving nothing about the number it prints.

test('the reported offset is the real first difference, in bytes and in lines', () => {
  const a = 'line one\nline two\nAAA tail\n';
  const b = 'line one\nline two\nBBB tail\n';
  const findings = validateExportParity([doc('a.md', a), doc('b.md', b)], CONFIG);
  assert.equal(findings.length, 1);
  // Two 8-character lines and their newlines are 18 bytes; the first difference is the next.
  assert.match(findings[0].message, /at byte 18 \(line 3\)/);
  assert.match(findings[0].message, /has "AAA tail/);
  assert.match(findings[0].message, /this file has "BBB tail/);
});

test('a difference in the FIRST byte reports offset 0, not a scan that never ran', () => {
  const findings = validateExportParity([doc('a.md', 'Xrest\n'), doc('b.md', 'Yrest\n')], CONFIG);
  assert.match(messages(findings), /at byte 0 \(line 1\)/);
});

test('a difference in the LAST byte reports the last offset, not the first', () => {
  const findings = validateExportParity([doc('a.md', 'same tailX'), doc('b.md', 'same tailY')], CONFIG);
  assert.match(messages(findings), /at byte 9 \(line 1\)/);
});

test('one core being a strict prefix of the other reports the point they diverge', () => {
  // The shape a truncated copy-paste produces, and the one where the scan runs to the end of
  // the shorter string rather than to a differing character.
  const findings = validateExportParity([doc('a.md', 'shared'), doc('b.md', 'shared plus more')], CONFIG);
  assert.match(messages(findings), /at byte 6 \(line 1\)/);
});

test('every drifted document is reported, each against the same reference', () => {
  const findings = validateExportParity(
    [doc('a.md', 'core'), doc('b.md', 'cork'), doc('c.md', 'corn')],
    CONFIG,
  );
  assert.equal(findings.length, 2);
  assert.ok(findings.every((f) => f.message.includes('differs from a.md')));
});

// --- G-13: a guard that cannot evaluate must not report a pass ---

test('G-13: missing configuration throws rather than comparing nothing', () => {
  assert.throws(() => validateExportParity([doc('a.md'), doc('b.md')], undefined), /unconfigured/);
  assert.throws(() => validateExportParity([doc('a.md')], { beginMarker: BEGIN, endMarker: END }), /unconfigured/);
  assert.throws(() => validateExportParity([doc('a.md')], { beginMarker: BEGIN, minFiles: 2 }), /unconfigured/);
});

test('G-13: identical begin and end markers throw — no document could delimit a core', () => {
  assert.throws(
    () => validateExportParity([doc('a.md')], { beginMarker: BEGIN, endMarker: BEGIN, minFiles: 2 }),
    /the same string/,
  );
});

// --- extractCore, directly ---

test('extractCore returns the bytes between the markers, exclusive of them', () => {
  const { core, findings } = extractCore(doc('a.md'), BEGIN, END);
  assert.deepEqual(findings, []);
  assert.equal(core, CORE);
});

test('extractCore reports no core and no finding for a file that is not a bootstrap', () => {
  const { core, findings } = extractCore({ path: 'README.md', text: '# Index\n' }, BEGIN, END);
  assert.equal(core, null);
  assert.deepEqual(findings, []);
});
