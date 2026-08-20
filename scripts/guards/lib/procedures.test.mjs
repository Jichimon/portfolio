import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseRouter, validateRouter, logDate, parseDoneBlock, validateDone,
  validateIterationsRequired, validateIterationsEvidence,
} from './procedures.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');

// --- the router -------------------------------------------------------------

const ROUTER = `## The router — when a procedure applies

| Situation | Do this |
|---|---|
| A work item typed \`feature\` or \`migration\` | \`work-item\` — it needs a spec |
| Finishing up | \`wrap-up\` |
| A typo | **No procedure.** Just do it |
`;

test('the router names procedures from the action column only', () => {
  // `feature` and `migration` are work-item TYPES in the situation column. A parser that
  // swept both columns would demand a skill called `feature` and be deleted the same day.
  assert.deepEqual(parseRouter(ROUTER).sort(), ['work-item', 'wrap-up']);
});

test('a row routing to no procedure contributes nothing', () => {
  assert.equal(parseRouter(ROUTER.replace('| Finishing up | `wrap-up` |', '')).includes('wrap-up'), false);
});

test('RED: tables outside the router section are not swept', () => {
  // The P-* rules table's rule column is full of backticked words — `version`, `status`,
  // `draft`. Scanning the whole file made the guard demand skills by those names.
  const withRules = '## The rules' + String.fromCharCode(10, 10) +
    '| id | rule |' + String.fromCharCode(10) + '|---|---|' + String.fromCharCode(10) +
    '| P-02 | a change bumps `version` and needs re-approval |' + String.fromCharCode(10, 10) + ROUTER;
  assert.deepEqual(parseRouter(withRules).sort(), ['work-item', 'wrap-up']);
});

test('green path: a router whose procedures all exist resolves', () => {
  assert.deepEqual(validateRouter(['work-item', 'wrap-up'], (n) => true), []);
});

test('RED: a router naming a procedure that does not exist is caught', () => {
  // INC-08's shape in the process layer: the rules tell you to run something that is not
  // there, so the instruction silently means nothing.
  const f = validateRouter(['work-item', 'reconcile'], (n) => n === 'work-item');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /reconcile/);
});

test('RED: a router that names no procedure at all is caught', () => {
  assert.ok(validateRouter([], () => true).some((x) => /no procedure/i.test(x.message)));
});

// --- done blocks ------------------------------------------------------------

const LOG = `# A log

\`\`\`yaml
done:
  tests:      { status: passed, evidence: ["node --test", "247 pass 0 fail"] }
  ci:         { status: not_applicable, reason: "no remote exists" }
  docs:       { status: passed, evidence: ["TASKS.md step 9"] }
\`\`\`
`;

test('a done block parses into dimensions with status, evidence and reason', () => {
  const b = parseDoneBlock(LOG);
  assert.deepEqual(Object.keys(b), ['tests', 'ci', 'docs']);
  assert.equal(b.tests.status, 'passed');
  assert.equal(b.tests.evidence.length, 2);
  assert.equal(b.ci.reason, 'no remote exists');
});

test('a log with no done block parses to null, which is a different fact from an empty one', () => {
  assert.equal(parseDoneBlock('# just prose\n'), null);
});

test('green path: a well-formed done block produces no findings', () => {
  assert.deepEqual(validateDone(parseDoneBlock(LOG), 'log.md'), []);
});

test('RED: `passed` with an empty evidence list is caught — the whole point of the check', () => {
  // P-03 / A22. This is the one failure the wrap-up procedure exists to make impossible:
  // a dimension asserting success with nothing behind it reads as coverage and is a claim.
  const b = parseDoneBlock(LOG.replace('evidence: ["node --test", "247 pass 0 fail"]', 'evidence: []'));
  const f = validateDone(b, 'log.md');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /tests/);
  assert.match(f[0].message, /evidence/);
});

test('RED: `passed` with no evidence key at all is caught', () => {
  const b = parseDoneBlock(LOG.replace(', evidence: ["node --test", "247 pass 0 fail"]', ''));
  assert.ok(validateDone(b, 'log.md').some((x) => /tests/.test(x.message)));
});

test('RED: `not_applicable` with no reason is caught', () => {
  // A dimension declared out loud is the point; silence reads as coverage.
  const b = parseDoneBlock(LOG.replace(', reason: "no remote exists"', ''));
  assert.ok(validateDone(b, 'log.md').some((x) => /ci/.test(x.message) && /reason/.test(x.message)));
});

test('RED: a status outside the vocabulary is caught', () => {
  const b = parseDoneBlock(LOG.replace('status: passed, evidence:', 'status: mostly_fine, evidence:'));
  assert.ok(validateDone(b, 'log.md').some((x) => /mostly_fine/.test(x.message)));
});

test('`blocked` and `failed` are legitimate, and each needs evidence or a reason', () => {
  const ok = parseDoneBlock(LOG.replace('status: passed, evidence: ["node --test", "247 pass 0 fail"]',
    'status: blocked, reason: "waiting on a decision"'));
  assert.deepEqual(validateDone(ok, 'log.md'), []);

  const bare = parseDoneBlock(LOG.replace('status: passed, evidence: ["node --test", "247 pass 0 fail"]', 'status: failed'));
  assert.ok(validateDone(bare, 'log.md').some((x) => /tests/.test(x.message)));
});

test('RED: an empty done block is caught rather than passing vacuously', () => {
  assert.ok(validateDone({}, 'log.md').some((x) => /no dimension/i.test(x.message)));
});

// --- when a log is required to carry one ------------------------------------

test('the log date comes from the filename', () => {
  assert.equal(logDate('2026-08-18-04-task5-step8-roles.md'), '2026-08-18');
  assert.equal(logDate('README.md'), null);
});

test('a log predating the convention is not retroactively required to carry a block', () => {
  // Demanding one would force either inventing evidence for finished work, or an exclusion
  // roster. Both are worse than a dated threshold with a written reason.
  assert.ok(logDate('2026-08-15-01-task2-intake.md') < '2026-08-18');
});

// --- iterations (K1) ---------------------------------------------------------

const LOG_K1 = `# A log

\`\`\`yaml
done:
  tests:      { status: passed, evidence: ["node --test", "247 pass 0 fail"] }
  iterations: { status: passed, evidence: ["2"] }
\`\`\`
`;

test('RED: a dated done block missing `iterations` is caught', () => {
  const b = parseDoneBlock(LOG_K1.replace('  iterations: { status: passed, evidence: ["2"] }\n', ''));
  const f = validateIterationsRequired(b, '2026-08-19', '2026-08-19', 'log.md');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /iterations/);
});

test('green path: a done block carrying `iterations` passes', () => {
  const b = parseDoneBlock(LOG_K1);
  assert.deepEqual(validateIterationsRequired(b, '2026-08-19', '2026-08-19', 'log.md'), []);
});

test('a log predating the cutoff is not required to carry iterations', () => {
  // Same precedent as doneBlockRequiredFrom: a NEW log cannot slip through, an old one is
  // not retroactively demanded to carry a dimension nobody told it to when it was written.
  const b = parseDoneBlock(LOG_K1.replace('  iterations: { status: passed, evidence: ["2"] }\n', ''));
  assert.deepEqual(validateIterationsRequired(b, '2026-08-15', '2026-08-19', 'log.md'), []);
});

test('RED: `iterations` evidence that is not a bare integer is caught', () => {
  const b = parseDoneBlock(LOG_K1.replace('evidence: ["2"]', 'evidence: ["two passes"]'));
  const f = validateIterationsEvidence(b, 'log.md');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /iterations/);
});

test('green path: `iterations: { status: passed, evidence: ["2"] }` passes', () => {
  const b = parseDoneBlock(LOG_K1);
  assert.deepEqual(validateIterationsEvidence(b, 'log.md'), []);
});

test('iterations status not_applicable with a reason is legitimate', () => {
  const b = parseDoneBlock(LOG_K1.replace('status: passed, evidence: ["2"]',
    'status: not_applicable, reason: "documentation-only closure, no implement/verify cycle"'));
  assert.deepEqual(validateIterationsEvidence(b, 'log.md'), []);
});

// --- liveness ---------------------------------------------------------------

test('LIVENESS: the real router resolves to real skills on disk', () => {
  const names = parseRouter(readFileSync(join(ROOT, '.claude/rules/10-process.md'), 'utf8'));
  assert.ok(names.length >= 2, `the router named ${names.length} procedures`);
  assert.deepEqual(validateRouter(names, (n) => existsSync(join(ROOT, '.claude/skills', n, 'SKILL.md'))), []);
});

test('LIVENESS: every real done block in progress/ validates', () => {
  // Dated logs only. progress/README.md carries the TEMPLATE, whose `<dimension>` placeholders
  // are not dimensions — validating it would fail on the document that defines the convention.
  // The filter is a property (a log is a dated file), not a roster of files to skip.
  const dir = join(ROOT, 'progress');
  let checked = 0;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.md') && logDate(n))) {
    const block = parseDoneBlock(readFileSync(join(dir, f), 'utf8'));
    if (!block) continue;
    checked++;
    assert.deepEqual(validateDone(block, f), [], f);
  }
  assert.ok(checked >= 4, `expected at least 4 done blocks, validated ${checked}`);
});

test('LIVENESS: every skill named in the router has a Bootstrap-equivalent and is user-invocable', () => {
  const names = parseRouter(readFileSync(join(ROOT, '.claude/rules/10-process.md'), 'utf8'));
  for (const n of names) {
    const text = readFileSync(join(ROOT, '.claude/skills', n, 'SKILL.md'), 'utf8');
    assert.match(text, /^---[\s\S]*?name:\s*\S+/m, `${n}: no name in frontmatter`);
    assert.match(text, /^---[\s\S]*?description:\s*\S+/m, `${n}: no description`);
  }
});

test('LIVENESS: work-item/SKILL.md\'s Close step mentions capturing iterations', () => {
  const text = readFileSync(join(ROOT, '.claude/skills/work-item/SKILL.md'), 'utf8');
  const closeStep = text.split(/^## 7 · Close/m)[1] ?? '';
  assert.match(closeStep, /iterations/i, 'Close step does not mention iterations');
  assert.match(closeStep, /implement.*verify|verify.*implement/i, 'Close step does not name the implement/verify cycle');
});
