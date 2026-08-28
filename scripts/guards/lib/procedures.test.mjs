import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseRouter, validateRouter, logDate, parseDoneBlock, validateDone,
  validateIterationsRequired, validateIterationsEvidence,
  procedureReturnPoints, specProducingTypes, iterationBuckets, workItemIdFromLog,
  validateIterationSplitRequired, validateIterationSplit,
} from './procedures.mjs';
import { parseWorkItemTypes } from './delegation-gate.mjs';

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

// --- iteration attribution (TASK 72) ----------------------------------------
//
// K1 says an item took nine passes. It does not say whether those passes were the author
// rejecting an artifact, a slice coming back for rework, or the gate sending the code back —
// and every proposal about slice seams is a guess until it does.
//
// The vocabulary is DERIVED from two live artifacts, never written here (`P-13`): the
// procedure's own steps, and the register's own type table. A hardcoded bucket list is the
// exact shape `INC-07` fired on.

const SKILL_FIXTURE = `# work-item

## 1 · Orient
## 2 · Spec, or the artifact that replaces it
## 3 · Checkpoint — stop here
## 4 · Slice and delegate
## 5 · Verify
## 6 · Reconcile
## 7 · Close
## Boundaries
`;

const TYPES_FIXTURE = `# TASKS

| type | Produces a spec? | The artifact the human approves |
|---|---|---|
| \`content\` | No | the content file |
| \`feature\` · \`migration\` | **Yes** | \`docs/specs/SPEC-TASK-N-*.spec.md\` |
| \`harness\` | No | the architecture document |
`;

test('the buckets are the procedure own return points — not its first step, not its last', () => {
  // Nothing returns to Orient: it is the entry. A return to Close means the item was not
  // done, which K2 counts as a reopen — a different metric with a different substrate.
  const pts = procedureReturnPoints(SKILL_FIXTURE).map((p) => p.slug);
  assert.deepEqual(pts, ['spec', 'checkpoint', 'slice', 'verify', 'reconcile']);
});

test('a procedure that grows a step grows a bucket, without the guard being edited', () => {
  const grown = SKILL_FIXTURE.replace('## 7 · Close', '## 7 · Rehearse\n## 8 · Close');
  assert.ok(procedureReturnPoints(grown).map((p) => p.slug).includes('rehearse'));
});

test('G-13: a procedure whose headings no longer parse throws rather than yielding no buckets', () => {
  // An empty vocabulary would accept every bucket name, so the check would pass while
  // asserting nothing. That is INC-07 exactly, and a guard that cannot evaluate must deny.
  assert.throws(() => procedureReturnPoints('# work-item\n\nno numbered steps here\n'), /return point/i);
});

test('spec-producing types are read off the register own table, both types in one row', () => {
  const s = specProducingTypes(TYPES_FIXTURE);
  assert.ok(s.has('feature') && s.has('migration'));
  assert.ok(!s.has('content') && !s.has('harness'));
});

test('G-13: a register with no type table throws rather than reporting nothing produces a spec', () => {
  // Returning an empty set would silently strip the spec bucket from EVERY type, which reads
  // as a pass and is a lie about six of them.
  assert.throws(() => specProducingTypes('# TASKS\n\nnothing here\n'), /type table/i);
});

test('a type that produces no spec cannot attribute an iteration to the spec step', () => {
  const b = iterationBuckets(SKILL_FIXTURE, TYPES_FIXTURE, 'harness');
  assert.deepEqual(b, ['checkpoint', 'slice', 'verify', 'reconcile']);
});

test('a type that produces a spec keeps it', () => {
  assert.ok(iterationBuckets(SKILL_FIXTURE, TYPES_FIXTURE, 'feature').includes('spec'));
});

test('G-13: an unresolvable work-item type throws rather than picking a default vocabulary', () => {
  assert.throws(() => iterationBuckets(SKILL_FIXTURE, TYPES_FIXTURE, ''), /type/i);
});

test('the work item id comes from the log filename, which the naming convention already mandates', () => {
  assert.equal(workItemIdFromLog('2026-08-28-01-task72-iteration-attribution.md'), 'TASK-72');
  assert.equal(workItemIdFromLog('2026-08-27-12-eval001-trace-index.md'), null);
});

const LOG_SPLIT = `# A log

\`\`\`yaml
done:
  iterations:      { status: passed, evidence: ["3"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1", "verify=2"] }
\`\`\`
`;
const BUCKETS = ['checkpoint', 'slice', 'verify', 'reconcile'];

test('green path: a split whose buckets are legal and whose counts sum to `iterations` passes', () => {
  assert.deepEqual(validateIterationSplit(parseDoneBlock(LOG_SPLIT), BUCKETS, 'log.md'), []);
});

test('RED: a dated done block with `iterations: passed` and no split is caught', () => {
  const b = parseDoneBlock(LOG_SPLIT.replace(/\n  iteration_split:.*/, ''));
  const f = validateIterationSplitRequired(b, '2026-08-28', '2026-08-28', 'log.md');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /iteration_split/);
});

test('a log predating the cutoff is not retroactively required to carry a split', () => {
  const b = parseDoneBlock(LOG_SPLIT.replace(/\n  iteration_split:.*/, ''));
  assert.deepEqual(validateIterationSplitRequired(b, '2026-08-19', '2026-08-28', 'log.md'), []);
});

test('`iterations: not_applicable` needs no split — there are no cycles to attribute', () => {
  const b = parseDoneBlock(LOG_SPLIT
    .replace('iterations:      { status: passed, evidence: ["3"] }',
      'iterations:      { status: not_applicable, reason: "documentation-only closure" }')
    .replace(/\n  iteration_split:.*/, ''));
  assert.deepEqual(validateIterationSplitRequired(b, '2026-08-28', '2026-08-28', 'log.md'), []);
});

test('RED: a bucket outside the derived vocabulary is caught, and the message names the legal set', () => {
  const b = parseDoneBlock(LOG_SPLIT.replace('"checkpoint=1"', '"meetings=1"'));
  const f = validateIterationSplit(b, BUCKETS, 'log.md');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /meetings/);
  assert.match(f[0].message, /checkpoint/, 'a rejection that does not say what IS legal costs a second round trip');
});

test('RED: `spec` is rejected for a type that never had one', () => {
  // The whole point of deriving the vocabulary from the type: this is the bucket a
  // `content` item cannot honestly have used, and a hardcoded list would accept it.
  const b = parseDoneBlock(LOG_SPLIT.replace('"checkpoint=1"', '"spec=1"'));
  assert.equal(validateIterationSplit(b, BUCKETS, 'log.md').length, 1);
});

test('RED: an entry that is not `bucket=count` is caught', () => {
  const b = parseDoneBlock(LOG_SPLIT.replace('"checkpoint=1"', '"one checkpoint round"'));
  const f = validateIterationSplit(b, BUCKETS, 'log.md');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /bucket=count|one checkpoint round/);
});

test('RED: counts that do not sum to `iterations` are caught — the two numbers must agree', () => {
  // Without this the split is decorative: it can say anything and still "pass".
  const b = parseDoneBlock(LOG_SPLIT.replace('evidence: ["3"]', 'evidence: ["9"]'));
  const f = validateIterationSplit(b, BUCKETS, 'log.md');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /9/);
  assert.match(f[0].message, /3/);
});

test('RED: the same bucket twice is caught rather than summed', () => {
  // "verify=1, verify=1" summing to 2 would pass the arithmetic and hide a typo.
  const b = parseDoneBlock(LOG_SPLIT.replace('"checkpoint=1", "verify=2"', '"verify=1", "verify=2"'));
  const f = validateIterationSplit(b, BUCKETS, 'log.md');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /verify/);
});

test('a zero-iteration item declares a split of zero rather than omitting it', () => {
  const b = parseDoneBlock(LOG_SPLIT
    .replace('evidence: ["3"]', 'evidence: ["0"]')
    .replace('"checkpoint=1", "verify=2"', '"verify=0"'));
  assert.deepEqual(validateIterationSplit(b, BUCKETS, 'log.md'), []);
});

test('a split reading not_applicable with a reason is validateDone business, not this check', () => {
  const b = parseDoneBlock(LOG_SPLIT.replace(
    'iteration_split: { status: passed, evidence: ["checkpoint=1", "verify=2"] }',
    'iteration_split: { status: not_applicable, reason: "closed inside another item" }'));
  assert.deepEqual(validateIterationSplit(b, BUCKETS, 'log.md'), []);
});

test('the extended shape does not weaken the rule the whole block exists for (P-03, A22)', () => {
  // A22: a dimension claiming success with nothing behind it is still caught. Adding a
  // dimension must not become a way to dilute the conjunction.
  const b = parseDoneBlock(LOG_SPLIT.replace('evidence: ["checkpoint=1", "verify=2"]', 'evidence: []'));
  const f = validateDone(b, 'log.md');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /iteration_split/);
});

// --- liveness ---------------------------------------------------------------

test('LIVENESS: the real procedure and the real register yield a usable vocabulary', () => {
  const skill = readFileSync(join(ROOT, '.claude/skills/work-item/SKILL.md'), 'utf8');
  const tasks = readFileSync(join(ROOT, 'TASKS.md'), 'utf8');
  const forHarness = iterationBuckets(skill, tasks, 'harness');
  const forFeature = iterationBuckets(skill, tasks, 'feature');
  assert.ok(forHarness.length >= 3, `derived only ${forHarness.length} buckets from the real files`);
  assert.ok(!forHarness.includes('spec'), '`harness` produces no spec, so it cannot have a spec iteration');
  assert.ok(forFeature.includes('spec'), '`feature` does produce a spec');
  assert.ok(!forHarness.includes('orient') && !forHarness.includes('close'));
});

test('LIVENESS: every real split in progress/ validates against its own item type', () => {
  const skill = readFileSync(join(ROOT, '.claude/skills/work-item/SKILL.md'), 'utf8');
  const tasks = readFileSync(join(ROOT, 'TASKS.md'), 'utf8');
  const types = parseWorkItemTypes(tasks);
  const dir = join(ROOT, 'progress');
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.md') && logDate(n))) {
    const block = parseDoneBlock(readFileSync(join(dir, f), 'utf8'));
    if (!block?.iteration_split) continue;
    const id = workItemIdFromLog(f);
    assert.ok(id, `${f}: carries a split but its filename names no work item`);
    const type = types.get(id);
    assert.ok(type, `${f}: ${id} is not in the register, so its vocabulary cannot be derived (G-13)`);
    assert.deepEqual(validateIterationSplit(block, iterationBuckets(skill, tasks, type), f), [], f);
  }
});

test('LIVENESS: work-item/SKILL.md Close step tells the author how to attribute the count', () => {
  const text = readFileSync(join(ROOT, '.claude/skills/work-item/SKILL.md'), 'utf8');
  const closeStep = text.split(/^## 7 · Close/m)[1] ?? '';
  assert.match(closeStep, /iteration_split/, 'Close step does not name the field the gate requires');
});
