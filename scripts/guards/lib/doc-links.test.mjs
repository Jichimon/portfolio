import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRefs, validateRefs } from './doc-links.mjs';

const exists = (p) => ['CLAUDE.md', 'docs/harness/contracts.md', 'scripts/gate.mjs'].includes(p);
const IGNORE = [{ ref: 'docs/harness-rules.md', reason: 'named to say it moved' }];

// --- what counts as a path claim --------------------------------------------

test('markdown links and backticked paths are both collected', () => {
  const refs = extractRefs('See [the contracts](docs/harness/contracts.md) and `scripts/gate.mjs`.');
  assert.deepEqual(refs.sort(), ['docs/harness/contracts.md', 'scripts/gate.mjs']);
});

test('a link anchor is dropped before resolution', () => {
  assert.deepEqual(extractRefs('[x](docs/harness/contracts.md#section)'), ['docs/harness/contracts.md']);
});

test('external links are not path claims', () => {
  assert.deepEqual(extractRefs('[docs](https://example.com/a.md) and [mail](mailto:a@b.com)'), []);
});

test('a backticked word that is not a path is ignored', () => {
  // `H-01`, `feature`, `passed` — the registry and the rules are full of these.
  assert.deepEqual(extractRefs('The rule `H-01` applies when `status` is `passed`.'), []);
});

test('RED: placeholders are not path claims', () => {
  // A template citing `EC-0NN.yaml` is describing a shape, not pointing at a file. Treating
  // these as claims makes the guard demand files nobody meant to promise.
  for (const p of ['`EC-0NN.yaml`', '`SPEC-TASK-N-slug.spec.md`', '`<date>-<nn>.md`',
                   '`progress/YYYY-MM-DD-NN.md`', '`resources/**/*.md`', '`slug.{en|es}.md`']) {
    assert.deepEqual(extractRefs(p), [], p);
  }
});

// --- resolution -------------------------------------------------------------

test('green path: references that resolve produce no findings', () => {
  const f = validateRefs([{ file: 'a.md', refs: ['CLAUDE.md', 'scripts/gate.mjs'] }], exists, []);
  assert.deepEqual(f, []);
});

test('RED: a reference to a document that was never written is caught', () => {
  // The finding this guard exists for: architecture.md cited `procedures.md` and
  // `metrics.md` thirteen times, and neither had ever existed.
  const f = validateRefs([{ file: 'docs/harness/architecture.md', refs: ['docs/harness/procedures.md'] }], exists, []);
  assert.equal(f.length, 1);
  assert.match(f[0].message, /procedures\.md/);
  assert.match(f[0].message, /architecture\.md/);
});

test('RED: a reference that was correct before a rename is caught', () => {
  assert.equal(validateRefs([{ file: 'a.md', refs: ['progress/evaluations/EVAL-000.md'] }], exists, []).length, 1);
});

test('an ignored reference is skipped, and the reason travels with it', () => {
  assert.deepEqual(validateRefs([{ file: 'a.md', refs: ['docs/harness-rules.md'] }], exists, IGNORE), []);
});

test('RED: an ignore entry with no reason is itself a finding', () => {
  // Same rule as every other calibrated exception in this harness: a reasonless entry is an
  // exemption nobody can review, and it is how an ignore list becomes a place to hide things.
  const f = validateRefs([{ file: 'a.md', refs: [] }], exists, [{ ref: 'x.md' }]);
  assert.ok(f.some((x) => /reason/.test(x.message)));
});

test('RED: an ignore entry for a reference that now resolves is stale and is reported', () => {
  // The list must shrink on its own. An entry kept after the file appeared silently exempts
  // a path that no longer needs it — and would hide the NEXT time it goes missing.
  const f = validateRefs([{ file: 'a.md', refs: ['CLAUDE.md'] }], exists,
    [{ ref: 'CLAUDE.md', reason: 'was missing once' }]);
  assert.ok(f.some((x) => /stale|resolves/i.test(x.message)), JSON.stringify(f));
});

test('the same missing reference in three files is reported three times, with each file named', () => {
  const docs = ['a.md', 'b.md', 'c.md'].map((file) => ({ file, refs: ['docs/harness/metrics.md'] }));
  assert.equal(validateRefs(docs, exists, []).length, 3);
});

// --- machine-local references (TASK 112) -------------------------------------------------
//
// CI reached this guard for the first time on 2026-09-01, after the hang that had been
// stopping the gate at step 5 was fixed, and reported eleven findings: living documents
// citing `private/**`, `reports/**` and `resources/site/intake.md`. All four files exist on
// the author's machine, all four are gitignored on purpose, and none can ever reach a runner.
// The citations are correct — `H-04`'s own rule row names `private/glossary.md` — so what had
// to change is the question the guard asks.

test('RED: a missing reference the repository deliberately excludes is reported, not failed', () => {
  const docs = [{ file: 'TASKS.md', refs: ['private/glossary.md'] }];
  const findings = validateRefs(docs, () => false, [], (ref) => ref.startsWith('private/'));

  assert.equal(findings.length, 1);
  assert.equal(findings[0].info, true, 'a machine-local reference must not be a hard finding');
  assert.match(findings[0].message, /private\/glossary\.md/);
  assert.match(findings[0].message, /deliberately excludes/);
});

test('RED: a missing reference the repository does NOT exclude is still a hard finding', () => {
  // The half that matters most: this guard exists because architecture.md cited two files
  // thirteen times that had never been written. Excusing machine-local paths must not excuse
  // that, and this is the assertion that would fail if the predicate were ever widened.
  const docs = [{ file: 'TASKS.md', refs: ['docs/harness/never-written.md'] }];
  const findings = validateRefs(docs, () => false, [], () => false);

  assert.equal(findings.length, 1);
  assert.notEqual(findings[0].info, true);
  assert.match(findings[0].message, /has stopped being true/);
});

test('a machine-local reference that DOES resolve is not reported at all', () => {
  // On the machine that holds `private/`, the file is there and the question never arises.
  // The predicate is consulted only after resolution has already failed.
  const docs = [{ file: 'TASKS.md', refs: ['private/glossary.md'] }];
  assert.deepEqual(validateRefs(docs, () => true, [], () => true), []);
});

test('the reasoned ignore list still wins before the machine-local question is asked', () => {
  const docs = [{ file: 'TASKS.md', refs: ['.github/workflows/deploy.yml'] }];
  const ignore = [{ ref: '.github/workflows/deploy.yml', reason: "TASK 32's deliverable" }];
  assert.deepEqual(validateRefs(docs, () => false, ignore, () => true), []);
});

test('RED: with no predicate supplied, every missing reference stays a hard finding', () => {
  // The default is the old behaviour, exactly. A caller that forgets to pass the oracle gets
  // a stricter guard, never a blinder one.
  const docs = [{ file: 'TASKS.md', refs: ['private/glossary.md'] }];
  const findings = validateRefs(docs, () => false);
  assert.equal(findings.length, 1);
  assert.notEqual(findings[0].info, true);
});
