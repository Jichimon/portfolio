import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRuleFile, parseCitations, validateRegistry } from './rules-registry.mjs';

const f = (path, text) => ({ path, text });

// A minimal well-formed registry: two surfaces, two files.
const GOOD = [
  f('00.md', `| id | rule | rung | origin |\n|---|---|---|---|\n| **H-01** | never touch git | 1 | D2 |\n`),
  f('10.md', `| id | rule | rung | origin |\n|---|---|---|---|\n| **P-01** | one deliverable | 3 | INC-01 |\n| **P-02** | spec first | 3 | INC-05 |\n`),
];

test('green path: a well-formed registry produces no findings', () => {
  assert.deepEqual(validateRegistry(GOOD, [], {}), []);
});

// --- red paths. Each must FAIL, or the guard is protecting nothing. ---

test('RED: duplicate id across files is caught', () => {
  const bad = [...GOOD, f('20.md', `| **P-01** | a clashing rule | 4 | somewhere |\n`)];
  const found = validateRegistry(bad, [], {});
  assert.ok(found.some((x) => x.id === 'P-01' && /duplicate id/.test(x.message)), 'expected a duplicate-id finding');
});

test('RED: a rule with no origin is caught', () => {
  const bad = [f('00.md', `| **H-01** | never touch git | 1 |  |\n`)];
  const found = validateRegistry(bad, [], {});
  assert.ok(found.some((x) => /missing origin/.test(x.message)), 'expected a missing-origin finding');
});

test('RED: a missing rung is caught', () => {
  const bad = [f('00.md', `| **H-01** | never touch git |  | D2 |\n`)];
  assert.ok(validateRegistry(bad, [], {}).some((x) => /rung/.test(x.message)));
});

test('RED: an out-of-range rung is caught', () => {
  const bad = [f('00.md', `| **H-01** | never touch git | 9 | D2 |\n`)];
  assert.ok(validateRegistry(bad, [], {}).some((x) => /rung/.test(x.message)));
});

test('RED: a file mixing two surfaces is caught', () => {
  const bad = [f('00.md', `| **H-01** | a | 1 | D2 |\n| **P-99** | b | 3 | D2 |\n`)];
  assert.ok(validateRegistry(bad, [], {}).some((x) => /mixes surfaces/.test(x.message)));
});

test('RED: one surface split across two files is caught', () => {
  const bad = [
    f('10.md', `| **P-01** | a | 3 | INC-01 |\n`),
    f('11.md', `| **P-02** | b | 3 | INC-05 |\n`),
  ];
  assert.ok(validateRegistry(bad, [], {}).some((x) => /split across/.test(x.message)));
});

test('RED: a dangling citation is caught', () => {
  const citing = [f('doc.md', 'This follows `P-77`, which does not exist.')];
  assert.ok(validateRegistry(GOOD, citing, {}).some((x) => x.id === 'P-77' && /dangling/.test(x.message)));
});

test('RED: reusing a retired id is caught', () => {
  const found = validateRegistry(GOOD, [], { retiredRuleIds: ['P-02'] });
  assert.ok(found.some((x) => x.id === 'P-02' && /retired/.test(x.message)));
});

test('RED: an empty registry fails rather than passing vacuously', () => {
  // INC-07's shape: a check that finds nothing must not report success.
  assert.ok(validateRegistry([f('empty.md', '# nothing here\n')], [], {}).length > 0);
});

// --- regression guards for bugs already found by hand ---

test('heading-form rules are recognized as definitions', () => {
  // The first manual pass reported G-01/G-02 as dangling because only table rows counted.
  const files = [f('40.md', `## G-01 · The authority ladder\n\nA1 non-negotiable policy.\n`)];
  const defs = parseRuleFile('40.md', files[0].text);
  assert.equal(defs.length, 1);
  assert.equal(defs[0].id, 'G-01');
  assert.equal(defs[0].form, 'heading');
  assert.deepEqual(validateRegistry(files, [f('x.md', 'see `G-01`')], {}), []);
});

test('an empty heading-form section is treated as missing its origin', () => {
  const files = [f('40.md', `## G-01 · The authority ladder\n`)];
  assert.ok(validateRegistry(files, [], {}).some((x) => /missing origin/.test(x.message)));
});

test('RED: a rule body in the adapter is caught', () => {
  // The most common decay mode: the adapter is the file everyone edits, so rule bodies
  // migrate back into it one convenience at a time. Reusing the registry parser means
  // the check cannot disagree with what counts as a rule definition.
  const adapter = f('CLAUDE.md', '# CLAUDE.md\n\n| **H-09** | never do the thing | 1 | because |\n');
  const found = validateRegistry(GOOD, [adapter], { adapter: 'CLAUDE.md' });
  assert.ok(found.some((x) => /the adapter defines a rule/.test(x.message)), 'expected an adapter finding');
});

test('the adapter may cite rules freely — pointers are the whole point', () => {
  const adapter = f('CLAUDE.md', '# CLAUDE.md\n\nThe boundary is `H-01`; see `.claude/rules/`.\n');
  assert.deepEqual(validateRegistry(GOOD, [adapter], { adapter: 'CLAUDE.md' }), []);
});

test('citations must be backticked, so prose ranges are not read as citations', () => {
  // "INC-01…INC-11" and "rules P-01 to P-16" are prose, not claims that each id exists.
  assert.equal(parseCitations('rules P-01 to P-16 and A-99').size, 0);
  assert.deepEqual([...parseCitations('see `P-04` and `C-01`')], ['P-04', 'C-01']);
});
