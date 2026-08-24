import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTerms, isExcluded, isBinary, scanText, formatFinding, blankOpaqueValues } from './terms.mjs';

const TERMS = parseTerms('# a comment\n\nAcmeCore\n  Vault-Prod  \n\n# trailing comment\nledger_tx\n');
const EXCL = [{ path: '.git' }, { path: 'node_modules' }, { path: 'private' }, { path: 'evidence/runs' }];

test('parseTerms skips comments and blanks, trims, and keeps the source line number', () => {
  assert.deepEqual(TERMS, [
    { term: 'AcmeCore', line: 3 },
    { term: 'Vault-Prod', line: 4 },
    { term: 'ledger_tx', line: 7 },
  ]);
});

test('the term index is the line in banned-terms.txt, so a human can look it up', () => {
  // Not a sequence number: deleting a term must not silently renumber the others in a
  // report someone is reading side by side with the file.
  assert.equal(TERMS[2].line, 7);
});

// --- the gap this port exists to close --------------------------------------

test('RED: a term in docs/ is found — the exact gap the hardcoded path roster left open', () => {
  // check-terms.sh scanned resources, progress, README, CLAUDE.md and TASKS.md. Every
  // other path in the repository, docs/ included, was unguarded and silently so (P-13).
  assert.equal(isExcluded('docs/harness/architecture.md', EXCL), false);
  assert.equal(isExcluded('.claude/rules/20-content.md', EXCL), false);
  assert.equal(isExcluded('scripts/gate.mjs', EXCL), false);
  assert.equal(isExcluded('some/file/nobody/thought/of.md', EXCL), false);
});

test('the four excluded paths are excluded, including nested files', () => {
  for (const p of ['.git/config', 'node_modules/x/index.js', 'private/glossary.md', 'evidence/runs/r1/trace.jsonl']) {
    assert.equal(isExcluded(p, EXCL), true, `${p} should be excluded`);
  }
});

test('RED: exclusion is segment-aware — privateer/ is not private/', () => {
  assert.equal(isExcluded('privateer/notes.md', EXCL), false);
  assert.equal(isExcluded('evidence/README.md', EXCL), false, 'only evidence/runs is excluded, not all of evidence');
});

test('RED: a Windows-separator path is still matched against the exclusions', () => {
  assert.equal(isExcluded('private\\glossary.md', EXCL), true);
});

// --- matching ---------------------------------------------------------------

test('a term is found case-insensitively, and the line number is 1-based', () => {
  const hits = scanText('clean line\nwe migrated ACMECORE last year\n', TERMS);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 2);
  assert.equal(hits[0].term.term, 'AcmeCore');
});

test('a clean file produces no hits', () => {
  assert.deepEqual(scanText('nothing to see\njust prose\n', TERMS), []);
});

test('every occurrence is reported, not only the first', () => {
  assert.equal(scanText('AcmeCore\nfine\nledger_tx and AcmeCore\n', TERMS).length, 3);
});

test('substring matches count — a false positive is noise, a false negative is a leak', () => {
  assert.equal(scanText('the AcmeCoreService class\n', TERMS).length, 1);
});

// --- H-04: the report must not become the leak ------------------------------

test('RED: the finding masks the term instead of printing it', () => {
  // check-terms.sh printed `LEAK: '<term>'` and the full matched line. Run by an agent,
  // that copies the confidentiality mapping straight into the transcript — the exact thing
  // private/ exists to prevent (H-04). The location is what the human needs; the term is not.
  const out = formatFinding('docs/x.md', scanText('we ran AcmeCore in prod\n', TERMS)[0]);
  assert.ok(!out.includes('AcmeCore'), `the term leaked into the report: ${out}`);
  assert.match(out, /docs\/x\.md:1/);
  assert.match(out, /banned-terms\.txt:3/);
  assert.match(out, /█{8}/, 'the mask should preserve the term length so the spot is visible');
});

test('the masked line keeps the surrounding context, which is what makes it actionable', () => {
  const out = formatFinding('docs/x.md', scanText('we ran AcmeCore in prod\n', TERMS)[0]);
  assert.match(out, /we ran .* in prod/);
});

test('RED: two different terms on one line are both masked', () => {
  const hits = scanText('AcmeCore talks to ledger_tx\n', TERMS);
  const out = hits.map((h) => formatFinding('f.md', h)).join('\n');
  assert.ok(!out.includes('AcmeCore') && !out.includes('ledger_tx'), out);
});

// --- binary safety ----------------------------------------------------------

test('a NUL byte marks a file as binary and it is skipped', () => {
  // The first version of this test used the PNG magic number alone, which contains no NUL
  // and is therefore text by this heuristic AND by grep -I. The test was wrong, not the
  // guard; the byte that matters is 0x00, so the sample now carries one.
  assert.equal(isBinary(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x00])), true);
  assert.equal(isBinary(Buffer.from([0x89, 0x50, 0x4e, 0x47])), false);
  assert.equal(isBinary(Buffer.from('plain text, even with émojis 🎯')), false);
});

// ── Opaque generated values (INC-15's family, found 2026-08-24 in a lockfile) ────
// A sha512 integrity hash is base64 of a digest: every 4-character sequence is
// reachable by chance, so a short banned term appears in one eventually. Two did,
// in site/package-lock.json, and failed the gate on a true string match carrying
// zero confidentiality risk. Fixed by field name, never by a "looks opaque" guess.

test('RED: a term inside an opaque field value is not a finding', () => {
  const line = '      "integrity": "sha512-vLNsecretF2Uwc8AufkNXPmB4Vli==",';
  const hits = scanText(line, [{ term: 'secret', line: 24 }], { opaqueFields: ['integrity'] });
  assert.deepEqual(hits, []);
});

test('RED: the same term in a NON-opaque field on the same line is still caught', () => {
  const line = '      "resolved": "https://r.example/secret/-/x.tgz", "integrity": "sha512-secretAA==",';
  const hits = scanText(line, [{ term: 'secret', line: 24 }], { opaqueFields: ['integrity'] });
  assert.equal(hits.length, 1);
});

test('RED: a field not on the opaque list is scanned exactly as before', () => {
  const line = '      "name": "secret-internal-thing",';
  const hits = scanText(line, [{ term: 'secret', line: 24 }], { opaqueFields: ['integrity'] });
  assert.equal(hits.length, 1);
});

test('RED: with no opaque fields configured, nothing is skipped', () => {
  // The exclusion must be opt-in from config. A default that blanks something is a
  // default that blinds a repository nobody configured (INC-07).
  const line = '      "integrity": "sha512-secretAA==",';
  assert.equal(scanText(line, [{ term: 'secret', line: 24 }]).length, 1);
});

test('blanking preserves column positions, so a finding still points at the right place', () => {
  const line = '"integrity": "sha512-AA==", "name": "secret"';
  const hits = scanText(line, [{ term: 'secret', line: 24 }], { opaqueFields: ['integrity'] });
  assert.equal(hits[0].column, line.indexOf('secret') + 1);
});

test('an opaque field name is matched as a whole key, not as a substring of one', () => {
  const line = '      "integrity_note": "secret",';
  const hits = scanText(line, [{ term: 'secret', line: 24 }], { opaqueFields: ['integrity'] });
  assert.equal(hits.length, 1);
});

test('blankOpaqueValues blanks nothing when handed no fields', () => {
  // Its own default matters independently of scanText's: an exported function that
  // blanks by default is one a future caller silently blinds itself with.
  const line = '"integrity": "sha512-secretAA=="';
  assert.equal(blankOpaqueValues(line), line);
});

test('the finding context is the REAL line, not the blanked one', () => {
  // Blanking exists to stop a false match, never to hide the line from the human who
  // has to act on it. A finding showing an empty integrity value would be unreadable.
  const line = '"integrity": "sha512-AA==", "name": "secret"';
  const hits = scanText(line, [{ term: 'secret', line: 24 }], { opaqueFields: ['integrity'] });
  assert.match(hits[0].context, /sha512-AA==/);
});
