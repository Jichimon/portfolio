// TASK 15's own review target: Stryker lets a mutant be suppressed with `// Stryker disable`,
// and the reason after the `:` is optional to Stryker itself. This repository has hit
// "a suppression mechanism exists and nobody re-reads it" three times already, so this guard
// makes the reason MANDATORY — a `disable` comment with nothing after the colon (or no colon
// at all) is a finding.
//
// Unit tests exercise the pure function directly, against synthetic input (MS-001..004).
// The real-repository scan (MS-005) lives here rather than in the module, per the precedent
// `sources.test.mjs` sets: the scanned set is DERIVED from stryker.config.mjs's `mutate`
// globs via node:fs's globSync, never a hardcoded path list, so a module added to
// scripts/guards/lib/ next month is covered without anyone editing this file.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkStrykerSuppressions } from './mutation-suppressions.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const msgs = (f) => f.map((x) => x.message).join(' | ');
const file = (path, text) => [{ path, text }];

// --- MS-001..004: the pure function, against synthetic input --------------------------------

test('MS-001 RED: a disable comment with no ":" at all is a finding', () => {
  const f = checkStrykerSuppressions(file('a.mjs', '// Stryker disable next-line all'));
  assert.equal(f.length, 1);
  assert.equal(f[0].path, 'a.mjs');
  assert.equal(f[0].line, 1);
  assert.match(f[0].message, /no reason/i);
});

test('MS-002 RED: a disable comment with a colon but an empty reason is a finding', () => {
  const empty = checkStrykerSuppressions(file('a.mjs', '// Stryker disable next-line all:'));
  const whitespace = checkStrykerSuppressions(file('a.mjs', '// Stryker disable next-line all:   '));
  assert.equal(empty.length, 1, 'empty reason after ":" must be caught');
  assert.equal(whitespace.length, 1, 'whitespace-only reason after ":" must be caught');
  assert.match(empty[0].message, /no reason|empty/i);
});

test('MS-003: a disable comment with a real reason produces no finding', () => {
  const text = '// Stryker disable next-line EqualityOperator: the <= mutant is equivalent here, both branches return the same object';
  assert.deepEqual(checkStrykerSuppressions(file('a.mjs', text)), []);
});

test('MS-004: a restore comment never needs a reason, in any form', () => {
  assert.deepEqual(checkStrykerSuppressions(file('a.mjs', '// Stryker restore all')), []);
  assert.deepEqual(checkStrykerSuppressions(file('a.mjs', '// Stryker restore next-line all')), []);
  assert.deepEqual(checkStrykerSuppressions(file('a.mjs', '// Stryker restore all:')), []);
  assert.deepEqual(checkStrykerSuppressions(file('a.mjs', '// Stryker restore all: because we are done here')), []);
});

// --- MS-006: the comment DELIMITER is not part of Stryker's grammar -------------------------
//
// Found by the adversarial auditor, 2026-08-24, and it was a real hole rather than a nitpick.
// The first version of this guard required `//`. Stryker does not: instrumenter's
// directive-bookkeeper.js runs its directive regex against Babel's `comment.value`, for every
// leading comment node — and Babel strips the delimiters, so `// Stryker disable all` and
// `/* Stryker disable all */` reach that regex as the same string.
//
// The consequence was not cosmetic. An ignored mutant leaves the mutation score's DENOMINATOR,
// so one `/* Stryker disable all */` at the top of git-write.mjs (54%, the worst file) removes
// 73 survivors from the maths and the aggregate score RISES. A regression in the guard behind
// H-01 would have landed with the gate going greener and nothing anywhere firing.

test('MS-006 RED: a block-comment disable is a finding — Stryker honours it, so this must too', () => {
  const f = checkStrykerSuppressions(file('a.mjs', '/* Stryker disable all */'));
  assert.equal(f.length, 1, 'Stryker ignores every mutant in this file; the guard must see it');
  assert.match(f[0].message, /no reason/i);
});

test('MS-006: a block-comment disable WITH a reason is not a finding, same as the // form', () => {
  const text = '/* Stryker disable next-line EqualityOperator: both branches return the same object */';
  assert.deepEqual(checkStrykerSuppressions(file('a.mjs', text)), []);
});

test('MS-006: a block-comment restore is not a finding, same as the // form', () => {
  assert.deepEqual(checkStrykerSuppressions(file('a.mjs', '/* Stryker restore all */')), []);
});

test('MS-006: the delimiter does not change the reported line number', () => {
  const f = checkStrykerSuppressions(file('a.mjs', ['const x = 1;', '/* Stryker disable all */', 'const y = 2;'].join(String.fromCharCode(10))));
  assert.equal(f.length, 1);
  assert.equal(f[0].line, 2);
});

test('the line number reported is 1-indexed and points at the actual comment', () => {
  const f = checkStrykerSuppressions(file('a.mjs', 'const x = 1;\nconst y = 2;\n// Stryker disable next-line all\nconst z = 3;'));
  assert.equal(f.length, 1);
  assert.equal(f[0].line, 3);
});

test('multiple files and multiple findings are all reported, not just the first', () => {
  const files = [
    { path: 'a.mjs', text: '// Stryker disable next-line all' },
    { path: 'b.mjs', text: 'ok\n// Stryker disable all:  \nok' },
  ];
  const f = checkStrykerSuppressions(files);
  assert.equal(f.length, 2);
  assert.deepEqual(f.map((x) => x.path).sort(), ['a.mjs', 'b.mjs']);
});

test('a line with no Stryker comment at all is never a finding', () => {
  assert.deepEqual(checkStrykerSuppressions(file('a.mjs', '// just a regular comment\nconst x = 1;')), []);
});

// --- MS-005: the scanned set is derived from stryker.config.mjs, never hardcoded ------------

/**
 * Mirrors what stryker.config.mjs's `mutate` array actually declares: positive globs matched,
 * `!`-prefixed globs subtracted. No path list of our own — if this file listed
 * 'scripts/guards/lib/**' by hand instead of reading it from the config, that would be exactly
 * the drift MS-005 exists to prevent.
 */
async function derivedMutatedFiles() {
  const { default: config } = await import(pathToFileURL(join(ROOT, 'stryker.config.mjs')));
  const positive = config.mutate.filter((g) => !g.startsWith('!'));
  const negative = config.mutate.filter((g) => g.startsWith('!')).map((g) => g.slice(1));

  const included = new Set(globSync(positive, { cwd: ROOT }));
  const excluded = new Set(negative.length ? globSync(negative, { cwd: ROOT }) : []);

  return [...included]
    .filter((f) => !excluded.has(f))
    .map((f) => f.split('\\').join('/'));
}

test('MS-005: the derivation reads stryker.config.mjs rather than a hardcoded list', async () => {
  const files = await derivedMutatedFiles();
  // Proof the set is DERIVED, not a short hand-picked list: it contains a representative
  // sample of the real lib/ modules that exist today, none of which this test names as a
  // roster — they fall out of the glob.
  assert.ok(files.includes('scripts/guards/lib/content.mjs'));
  assert.ok(files.includes('scripts/guards/lib/sources.test.mjs') === false, 'the negation glob excludes *.test.mjs');
  assert.ok(files.length > 10, `expected a meaningful set of mutated files, got ${files.length}`);
});

// The assertion is on FINDINGS, not on suppressions: a reasoned `// Stryker disable ...: why`
// passes this deliberately. The name says reasonless rather than "zero suppression comments"
// because the day TASK 38 lands a legitimate one, a test named for the wrong property is a
// test somebody deletes instead of reading.
test('LIVENESS: the real repository carries zero REASONLESS suppressions today, so this scan is a clean pass', async () => {
  const relPaths = await derivedMutatedFiles();
  const files = relPaths.map((p) => ({ path: p, text: readFileSync(join(ROOT, p), 'utf8') }));
  const findings = checkStrykerSuppressions(files);
  assert.deepEqual(findings, [],
    `expected zero Stryker suppression comments in the repository today: ${msgs(findings)}`);
});

test('P-14: the real-repository scan would catch a planted reasonless suppression', () => {
  // Same predicate the liveness test above runs, proven against a deliberately bad input so
  // the liveness test passing is not read as "the scan never finds anything" (P-14) — a
  // check seen only to pass has not been tested.
  const files = [{ path: 'scripts/guards/lib/content.mjs', text: '// Stryker disable next-line all' }];
  const findings = checkStrykerSuppressions(files);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].path, 'scripts/guards/lib/content.mjs');
  assert.equal(findings[0].line, 1);
});


// --- The canary, and the config the whole ratchet rests on ----------------------------------

/**
 * MS-006's fix mirrors a regex that lives inside Stryker, in a `dist/` file that is not public
 * API. A minor version bump could change it and this guard would go quietly out of step —
 * which is the failure it exists to prevent, arriving through its own dependency. So the
 * mirror is asserted rather than trusted (P-16).
 */
test('CANARY: Stryker still parses directives from every comment node, delimiter-agnostically', () => {
  const src = readFileSync(
    join(ROOT, 'node_modules/@stryker-mutator/instrumenter/dist/src/transformers/directive-bookkeeper.js'),
    'utf8',
  );
  assert.match(src, /Stryker \(disable\|restore\)/,
    "Stryker's directive regex has moved or changed shape — re-read it and re-check MS-006");
  assert.match(src, /comment\.value/,
    'Stryker no longer parses directives out of comment.value; the delimiter-agnostic assumption behind MS-006 needs re-deriving');
});

/**
 * The ratchet is a number in a config file, and nothing else in the gate reads that file.
 * Raised by the adversarial auditor, 2026-08-24: lowering the threshold to 0, or adding one
 * negation glob, disables the mutation gate silently and no guard anywhere notices. These two
 * assertions do not make that impossible — someone can still edit the config and this file
 * together — but they make it two deliberate edits instead of one, and the second one says out
 * loud what it is for.
 */
const FLOOR = 74; // measured 2026-08-24; raised by TASK 38, never lowered

test('the mutation threshold may not be lowered below the floor this repository has reached', async () => {
  const { default: config } = await import(pathToFileURL(join(ROOT, 'stryker.config.mjs')));
  assert.ok(
    config.thresholds.break >= FLOOR,
    `break is ${config.thresholds.break}, below the ${FLOOR} measured on 2026-08-24. The threshold ratchets UP as survivors are killed; it does not come down. A genuine equivalent mutant is excluded at the mutant, with a reason`,
  );
});

test('the mutate globs exclude test files and nothing else — a dropped module cannot hide here', async () => {
  const { default: config } = await import(pathToFileURL(join(ROOT, 'stryker.config.mjs')));
  for (const g of config.mutate.filter((x) => x.startsWith('!'))) {
    assert.match(
      g, /\*\.test\.mjs$/,
      `${g} excludes something other than test files from mutation. Dropping a module from the mutate glob removes its survivors from the score AND from the suppression scan at once — and the worst-scoring file is exactly the one it would be tempting to drop`,
    );
  }
});
