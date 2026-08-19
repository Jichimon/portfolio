// The eval suite's own guard, tested the way it asks its cases to be tested.
//
// The failure this prevents is one level up from a bad case: a suite that LOOKS like a
// regression net while quietly covering nothing. Every property here is one that, if it
// silently stopped holding, would leave the suite green and empty — a case pointing at an
// incident nobody transcribed, an incident nobody wrote a case for, a proof naming a test
// that was renamed a month ago.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCase, parseIncidentIds, validateCases, requiredFieldsFrom } from './evals.mjs';

// --- requiredFieldsFrom ----------------------------------------------------------------

test('requiredFieldsFrom derives the required set from the template, minus a reasoned few', () => {
  const tpl = 'id: EC-0NN\ndescends_from: INC-0N\nquestion: "x"\noutcome:\nnotes: |\n  y\nretired:';
  assert.deepEqual(
    requiredFieldsFrom(tpl, [{ field: 'outcome', reason: 'filled when run' }, { field: 'notes', reason: 'ditto' }, { field: 'retired', reason: 'ditto' }]),
    ['descends_from', 'question'],
  );
});

test('RED: a field added to the template becomes required without touching the config', () => {
  // The direction that matters. An inclusion list has to be updated by whoever adds a field —
  // the one moment they are thinking about something else — and forgetting makes the guard
  // blinder. Subtracting makes forgetting merely noisier.
  const before = requiredFieldsFrom('id: EC-0NN\ndescends_from: INC-0N', []);
  const after = requiredFieldsFrom('id: EC-0NN\ndescends_from: INC-0N\nblast_radius: "new"', []);
  assert.equal(before.includes('blast_radius'), false);
  assert.equal(after.includes('blast_radius'), true);
});

// --- parseCase ------------------------------------------------------------------------

test('parseCase reads scalars, lists, block scalars and the nested proof map', () => {
  const c = parseCase([
    'id: EC-001',
    'descends_from: INC-01',
    'question: "what this proves"',
    'input: |',
    '  line one',
    '  line two',
    'environment:',
    '  - "a precondition"',
    '  - "another"',
    'proof:',
    '  file: scripts/guards/lib/x.test.mjs',
    '  test: "the test name"',
    'outcome: Caught',
  ].join('\n'));

  assert.equal(c.id, 'EC-001');
  assert.equal(c.descends_from, 'INC-01');
  assert.equal(c.question, 'what this proves');
  assert.equal(c.input, 'line one\nline two');
  assert.deepEqual(c.environment, ['a precondition', 'another']);
  assert.deepEqual(c.proof, { file: 'scripts/guards/lib/x.test.mjs', test: 'the test name' });
  assert.equal(c.outcome, 'Caught');
});

test('parseCase distinguishes an absent key from an empty one', () => {
  // `outcome:` with nothing after it is the template's unfilled state, and it must not read
  // as the string "undefined" or as a missing key — the first would fail the vocabulary
  // check, the second would hide an unfilled case.
  const c = parseCase('id: EC-001\noutcome:\nretired:');
  assert.equal(c.outcome, '');
  assert.equal(c.retired, '');
  assert.equal('notes' in c, false);
});

test('parseCase does not treat a # inside a quoted value as a comment', () => {
  const c = parseCase('question: "the C# case"   # a real comment');
  assert.equal(c.question, 'the C# case');
});

test('parseCase keeps a block scalar that contains a colon or a dash', () => {
  // Block scalars carry prose: an input prompt is exactly where a colon shows up, and a
  // parser that re-tokenized the body would silently truncate the case's whole point.
  const c = parseCase('input: |\n  Note: do it\n  - not a list item\nid: EC-002');
  assert.equal(c.input, 'Note: do it\n- not a list item');
  assert.equal(c.id, 'EC-002');
});

test('parseCase reads proof: none as a scalar, not a map', () => {
  const c = parseCase('id: EC-008\nproof: none\nproof_reason: "rung 4, no guard exists"');
  assert.equal(c.proof, 'none');
  assert.equal(c.proof_reason, 'rung 4, no guard exists');
});

// --- parseIncidentIds -----------------------------------------------------------------

test('parseIncidentIds pulls every incident from the architecture tables', () => {
  const doc = [
    '## B · Something', '| **INC-99** | not in section C |',
    '## C · Origins — the incidents behind the rules',
    'prose mentioning INC-01 inline should not matter',
    '| **INC-01** | The seven-pass hydra. | spec-first |',
    '| **INC-02** | The tests that tested nothing. | the test role |',
    '## D · Decision matrix',
    '| **INC-77** | after the section ended |',
  ].join('\n');
  assert.deepEqual([...parseIncidentIds(doc)].sort(), ['INC-01', 'INC-02']);
});

test('RED: parseIncidentIds is scoped to section C, so it cannot drift into a roster', () => {
  // P-13. If this read the whole document it would pick up every citation in every rule
  // table, and the coverage check would then demand cases for ids that are not incidents.
  const ids = parseIncidentIds('## C · Origins\n| **INC-05** | x | y |\n## L · Security\n| **INC-06** | x |');
  assert.deepEqual([...ids], ['INC-05']);
});

// --- the five properties ---------------------------------------------------------------

const INCIDENTS = new Set(['INC-01', 'INC-02', 'INC-03']);
const CFG = {
  outcomes: ['Caught', 'Partial', 'Gap'],
  requiredFields: ['descends_from', 'question', 'expected_behavior', 'forbidden_behavior', 'required_evidence'],
  excluded: [{ incident: 'INC-03', reason: 'no executable form until screens exist' }],
};

const OK_FIELDS = {
  question: 'q',
  expected_behavior: ['e'],
  forbidden_behavior: ['f'],
  required_evidence: ['r'],
};
const caseFile = (id, over = {}) => ({
  path: `evaluation-cases/${id}-slug.yaml`,
  data: { id, descends_from: 'INC-01', ...OK_FIELDS, proof: { file: 't.test.mjs', test: 'a name' }, ...over },
});
const IO = { exists: (p) => p === 't.test.mjs', read: () => "test('a name', () => {});" };

const run = (cases, cfg = CFG, io = IO) => validateCases(cases, INCIDENTS, cfg, io);
const msgs = (f) => f.map((x) => x.message).join(' | ');

test('a well-formed suite covering every incident passes', () => {
  const cases = [caseFile('EC-001'), caseFile('EC-002', { descends_from: 'INC-02' })];
  assert.deepEqual(run(cases), []);
});

test('RED property 1: a missing required field is a finding', () => {
  const c = caseFile('EC-001');
  delete c.data.required_evidence;
  assert.match(msgs(run([c, caseFile('EC-002', { descends_from: 'INC-02' })])), /required_evidence/);
});

test('RED property 1: an id that disagrees with its filename is a finding', () => {
  const c = caseFile('EC-001');
  c.path = 'evaluation-cases/EC-009-slug.yaml';
  assert.match(msgs(run([c, caseFile('EC-002', { descends_from: 'INC-02' })])), /filename/i);
});

test('RED property 1: a duplicate id is a finding', () => {
  const a = caseFile('EC-001');
  const b = caseFile('EC-001', { descends_from: 'INC-02' });
  b.path = 'evaluation-cases/EC-001-other.yaml';
  assert.match(msgs(run([a, b])), /duplicate/i);
});

test('RED property 1: an outcome outside the vocabulary is a finding', () => {
  const cases = [caseFile('EC-001', { outcome: 'Mostly' }), caseFile('EC-002', { descends_from: 'INC-02' })];
  assert.match(msgs(run(cases)), /Mostly/);
});

test('RED property 2: descends_from naming an incident that does not exist is a finding', () => {
  const cases = [caseFile('EC-001', { descends_from: 'INC-42' }), caseFile('EC-002', { descends_from: 'INC-02' })];
  const f = run(cases);
  assert.match(msgs(f), /INC-42/);
  // and the incident it left uncovered is reported too, rather than the one error masking it
  assert.match(msgs(f), /INC-01/);
});

test('RED property 3: an incident with neither a case nor an exclusion is a finding', () => {
  assert.match(msgs(run([caseFile('EC-001')])), /INC-02/);
});

test('RED property 3: a reasonless exclusion is a finding', () => {
  const cfg = { ...CFG, excluded: [{ incident: 'INC-03' }, { incident: 'INC-02', reason: '' }] };
  const f = msgs(run([caseFile('EC-001')], cfg));
  assert.match(f, /INC-03/);
  assert.match(f, /reason/i);
});

test('RED property 3: excluding an incident that does not exist is a finding', () => {
  // The stale half. An exclusion outliving its incident is the same shape as check-docs
  // reporting a resolved ignore entry: a kept exemption hides the next real gap.
  const cfg = { ...CFG, excluded: [...CFG.excluded, { incident: 'INC-88', reason: 'gone' }] };
  const cases = [caseFile('EC-001'), caseFile('EC-002', { descends_from: 'INC-02' })];
  assert.match(msgs(run(cases, cfg)), /INC-88/);
});

test('RED property 4: a proof file that does not exist is a finding', () => {
  const cases = [caseFile('EC-001', { proof: { file: 'gone.test.mjs', test: 'a name' } }),
                 caseFile('EC-002', { descends_from: 'INC-02' })];
  assert.match(msgs(run(cases)), /gone\.test\.mjs/);
});

test('RED property 4: a proof naming a test the file does not contain is a finding', () => {
  // The one that matters most. Checking only that the FILE exists passes forever after a
  // test is renamed — INC-07's shape inside the checker itself.
  const cases = [caseFile('EC-001', { proof: { file: 't.test.mjs', test: 'a name that was renamed' } }),
                 caseFile('EC-002', { descends_from: 'INC-02' })];
  assert.match(msgs(run(cases)), /renamed/);
});

test('RED property 4: a proof missing file or test is a finding', () => {
  const cases = [caseFile('EC-001', { proof: { file: 't.test.mjs' } }),
                 caseFile('EC-002', { descends_from: 'INC-02' })];
  assert.match(msgs(run(cases)), /test/);
});

test('RED property 5: proof: none without a reason is a finding', () => {
  const cases = [caseFile('EC-001', { proof: 'none' }), caseFile('EC-002', { descends_from: 'INC-02' })];
  assert.match(msgs(run(cases)), /reason/i);
});

test('RED property 5: an unproven case may not claim Caught', () => {
  // A16 mechanized. Without an executable demonstration the only thing that could have
  // produced a pass is a model behaving well, and that is a measurement of the model.
  const cases = [caseFile('EC-001', { proof: 'none', proof_reason: 'rung 4', outcome: 'Caught' }),
                 caseFile('EC-002', { descends_from: 'INC-02' })];
  assert.match(msgs(run(cases)), /Caught/);
});

test('an unproven case may claim Partial or Gap', () => {
  for (const outcome of ['Partial', 'Gap', '']) {
    const cases = [caseFile('EC-001', { proof: 'none', proof_reason: 'rung 4', outcome }),
                   caseFile('EC-002', { descends_from: 'INC-02' })];
    assert.deepEqual(run(cases), [], `outcome ${outcome || '(empty)'} must be allowed`);
  }
});

test('a retired case still counts as covering its incident, and must carry a date and reason', () => {
  // A case is never deleted (G-10). But retiring one silently would reopen the coverage hole
  // it was written to close, so the retirement itself is what has to be legible.
  const cases = [caseFile('EC-001'), caseFile('EC-002', { descends_from: 'INC-02', retired: 'no longer useful' })];
  assert.match(msgs(run(cases)), /retired/i);

  const dated = [caseFile('EC-001'), caseFile('EC-002', { descends_from: 'INC-02', retired: '2026-08-18 — superseded by EC-014' })];
  assert.deepEqual(run(dated), []);
});
