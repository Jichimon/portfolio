import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnforcementTable, validateContracts, validateRatioProse } from './contracts.mjs';

const table = (rows) => `# Harness contracts

## Enforcement status

| Contract | Enforced by | Status |
|---|---|---|
${rows}

## 1 · Agent Contract
`;

const nothingExists = () => false;
const everythingExists = () => true;

test('the table parses into contracts, enforcers and status', () => {
  const rows = parseEnforcementTable(table('| Agent | `a/check-agents.mjs` | step 8 |'));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].contract, 'Agent');
  assert.deepEqual(rows[0].enforcers, ['a/check-agents.mjs']);
  assert.equal(rows[0].status, 'step 8');
});

test('green path: a scheduled contract whose enforcer is absent is a tracked gap, not a failure', () => {
  // The whole point: an honest "not yet, step 8" must not fail the gate, or the gate
  // would be red for the entire build and nobody would read it.
  const r = validateContracts(table('| Agent | `a/check-agents.mjs` | step 8 |'), nothingExists);
  assert.deepEqual(r.findings, []);
  assert.equal(r.enforced, 0);
});

test('green path: a built contract whose enforcer exists counts as enforced', () => {
  const r = validateContracts(table('| Agent | `a/check-agents.mjs` | built |'), everythingExists);
  assert.deepEqual(r.findings, []);
  assert.equal(r.enforced, 1);
});

// --- red paths ---

test('RED: claiming built while the enforcer is missing is caught', () => {
  // This is the check that matters. A contract may be pending; it may not LIE.
  const r = validateContracts(table('| Agent | `a/check-agents.mjs` | built |'), nothingExists);
  assert.ok(r.findings.some((x) => /claims built, but the enforcer does not exist/.test(x.message)));
});

test('RED: a contract naming no enforcing artifact is caught', () => {
  const r = validateContracts(table('| Agent | none yet | step 8 |'), nothingExists);
  assert.ok(r.findings.some((x) => /names no enforcing artifact/.test(x.message)));
});

test('RED: neither built nor scheduled is an untracked gap', () => {
  const r = validateContracts(table('| Agent | `a/check-agents.mjs` | someday |'), nothingExists);
  assert.ok(r.findings.some((x) => /untracked gap/.test(x.message)));
});

test('RED: a stale claim is caught when the enforcer lands but the status is not updated', () => {
  // G-11's forgotten half: when a rule becomes mechanized, update its rung. Same here.
  const r = validateContracts(table('| Agent | `a/check-agents.mjs` | step 8 |'), everythingExists);
  assert.ok(r.findings.some((x) => /update the claim/.test(x.message)));
});

test('RED: a missing enforcement table fails rather than passing vacuously', () => {
  const r = validateContracts('# Harness contracts\n\n## 1 · Agent Contract\n', nothingExists);
  assert.ok(r.findings.some((x) => /no enforcement table/.test(x.message)));
});

test('a contract with several enforcers counts only when all of them exist', () => {
  const row = '| Tool | `.claude/settings.json` and `g/bash-policy.mjs` | built |';
  const onlyOne = (p) => p === '.claude/settings.json';
  const r = validateContracts(table(row), onlyOne);
  assert.equal(r.enforced, 0);
  assert.ok(r.findings.some((x) => /bash-policy\.mjs/.test(x.message)));
});

// --- partial enforcement, and the prose that summarizes it ------------------
// Prompted by a real staleness: the table listed four existing enforcers while the paragraph
// under it still read "2 of 6 enforced ... the Run row still reads step 6". The table was
// checked; the sentence ABOUT the table was not, so the document contradicted itself for two
// steps and the gate stayed green. A claim in prose is still a claim.

const four = (p) => ['b.mjs', 'c.mjs'].includes(p);
const rows4 = [
  '| Agent | `a.mjs` | step 8 | the whole contract |',
  '| Run | `b.mjs` | partial | brief shape |',
  '| Policy | `c.mjs` | built | — |',
].join(String.fromCharCode(10));

const table4 = (rows) => '## Enforcement status' + String.fromCharCode(10, 10) +
  '| Contract | Enforced by | Status | Not yet covered |' + String.fromCharCode(10) +
  '|---|---|---|---|' + String.fromCharCode(10) + rows + String.fromCharCode(10);

test('a partial row counts as partial — neither enforced nor pending', () => {
  const { counts } = validateContracts(table4(rows4), four);
  assert.deepEqual(counts, { built: 1, partial: 1, pending: 1 });
});

test('green path: a partial row naming its gap produces no finding', () => {
  assert.deepEqual(validateContracts(table4(rows4), four).findings, []);
});

test('RED: a partial row that does not say what is uncovered is caught', () => {
  // Partial without a named gap is "built" with extra words — it hides the same thing.
  const rows = rows4.replace('| Run | `b.mjs` | partial | brief shape |', '| Run | `b.mjs` | partial | |');
  assert.ok(validateContracts(table4(rows), four).findings.some((f) => /uncovered/i.test(f.message)));
});

test('RED: a partial row whose enforcer does not exist is caught', () => {
  const rows = rows4.replace('`b.mjs`', '`gone.mjs`');
  assert.ok(validateContracts(table4(rows), four).findings.some((f) => /does not exist/.test(f.message)));
});

const COUNTS = { built: 1, partial: 3, pending: 2 };

test('green path: prose matching the counts passes', () => {
  assert.deepEqual(validateRatioProse('**Today: 1 fully enforced, 3 partial, 2 pending.**', COUNTS), []);
});

test('RED: prose that disagrees with the table is caught, with both numbers named', () => {
  const f = validateRatioProse('**Today: 4 fully enforced, 0 partial, 2 pending.**', COUNTS);
  assert.equal(f.length, 1);
  assert.match(f[0].message, /4/);
  assert.match(f[0].message, /1/);
});

test('RED: a document with no ratio sentence is caught — deleting it must not be a way out', () => {
  assert.ok(validateRatioProse('the contracts are all fine, trust me', COUNTS)
    .some((x) => /no ratio/i.test(x.message)));
});
