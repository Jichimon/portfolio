// TASK 66's red battery. Every assertion here was written before the function it names, and
// every one has been shown failing with that function's clause removed (T-04, P-14).
//
// The fixtures are revision arrays and a fake git runner, never a real git: a unit test that
// shells out measures the repository's history rather than this module's logic, and a
// shelling function nobody can test is a function whose mutants nobody can kill. The real
// spawnSync lives in the two CLIs; the real corpus is asserted by the gate step, which prints
// its counts on every run.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  deriveTransitions,
  leftDone,
  byDestination,
  parseReopenDeclarations,
  validateReopenDeclarations,
  renderLedger,
  readRevisions,
  UNCOMMITTED,
} from './status-history.mjs';
import { isGeneratedArtifact } from './procedures.mjs';
import { markdownShapeFindings } from './markdown-shape.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');

const HEAD = 'Status values: `TODO` · `IN PROGRESS` · `BLOCKED` · `DONE` · `RETIRED`\n\n';

/** One revision of the register, from a list of `id · type · status` triples. */
const rev = (date, label, ...headings) => ({
  date,
  label,
  text: HEAD + headings.map((h) => `## ${h}\n\nbody\n`).join('\n'),
});

// --- deriveTransitions ------------------------------------------------------

test('a status that changes between two revisions is one dated transition', () => {
  const { transitions } = deriveTransitions([
    rev('2026-08-01', 'aaaaaaa', 'TASK 1 — Thing · `harness` · `TODO`'),
    rev('2026-08-02', 'bbbbbbb', 'TASK 1 — Thing · `harness` · `DONE`'),
  ]);
  assert.deepEqual(transitions, [
    { date: '2026-08-02', label: 'bbbbbbb', id: 'TASK-1', from: 'TODO', to: 'DONE' },
  ]);
});

test('an item appearing for the first time is not a transition', () => {
  // Otherwise every new work item reads as a change from nothing, and the count is the
  // register's size rather than its movement.
  const { transitions } = deriveTransitions([
    rev('2026-08-01', 'a', 'TASK 1 — Thing · `harness` · `TODO`'),
    rev('2026-08-02', 'b', 'TASK 1 — Thing · `harness` · `TODO`', 'TASK 2 — Other · `harness` · `TODO`'),
  ]);
  assert.deepEqual(transitions, []);
});

test('a status unchanged across three revisions produces nothing', () => {
  const { transitions } = deriveTransitions([
    rev('2026-08-01', 'a', 'TASK 1 — Thing · `harness` · `DONE`'),
    rev('2026-08-02', 'b', 'TASK 1 — Thing · `harness` · `DONE`'),
    rev('2026-08-03', 'c', 'TASK 1 — Thing · `harness` · `DONE`'),
  ]);
  assert.deepEqual(transitions, []);
});

test('RED: a revision that will not parse is reported, not silently skipped', () => {
  // C-01's logic applied to the harness's own numbers: a blind window that reads as "no
  // transitions" is a wrong measurement, and a wrong one is worse than a missing one.
  const { transitions, unparseable } = deriveTransitions([
    { date: '2026-08-01', label: 'a', text: '## TASK 1 — Thing · `harness` · `TODO`\n' }, // no head
    rev('2026-08-02', 'b', 'TASK 1 — Thing · `harness` · `DONE`'),
  ]);
  assert.equal(unparseable.length, 1, 'the headless revision must be reported');
  assert.equal(unparseable[0].label, 'a');
  assert.match(unparseable[0].reason, /vocabulary/i);
  assert.deepEqual(transitions, [], 'and it must not invent a transition out of a gap');
});

test('RED: an unparseable revision in the middle does not lose the transition around it', () => {
  // The diff continues from the last revision that DID parse. Dropping the span would hide a
  // real change behind an unrelated parse failure.
  const { transitions } = deriveTransitions([
    rev('2026-08-01', 'a', 'TASK 1 — Thing · `harness` · `TODO`'),
    { date: '2026-08-02', label: 'b', text: 'no head, no headings' },
    rev('2026-08-03', 'c', 'TASK 1 — Thing · `harness` · `DONE`'),
  ]);
  assert.equal(transitions.length, 1);
  assert.equal(transitions[0].date, '2026-08-03', 'attributed to the revision that proves it');
});

test('RED: an item that disappears from the register is reported', () => {
  // Ids are stable and never reused, and a RETIRED entry stays in place. A DONE item deleted
  // outright would erase its own K2 edge, so the derivation names it rather than shrugging.
  const { vanished } = deriveTransitions([
    rev('2026-08-01', 'a', 'TASK 1 — Thing · `harness` · `DONE`', 'TASK 2 — Other · `harness` · `TODO`'),
    rev('2026-08-02', 'b', 'TASK 2 — Other · `harness` · `TODO`'),
  ]);
  assert.deepEqual(vanished, [{ date: '2026-08-02', label: 'b', id: 'TASK-1', from: 'DONE' }]);
});

test('the pre-type-table heading shape derives transitions (the six earliest revisions)', () => {
  // The shape that threw before TASK 66 split the two vocabularies: statuses, no type span.
  const { transitions, unparseable } = deriveTransitions([
    { date: '2026-08-13', label: 'a', text: HEAD + '## TASK 0 — Case studies · `TODO`\n' },
    { date: '2026-08-14', label: 'b', text: HEAD + '## TASK 0 — Case studies · `DONE`\n' },
  ]);
  assert.deepEqual(unparseable, []);
  assert.equal(transitions.length, 1);
  assert.equal(transitions[0].to, 'DONE');
});

// --- leftDone: the K2 set ---------------------------------------------------

test('leftDone selects transitions away from DONE and nothing else', () => {
  const t = [
    { date: '2026-08-02', label: 'b', id: 'TASK-1', from: 'TODO', to: 'DONE' },
    { date: '2026-08-03', label: 'c', id: 'TASK-2', from: 'DONE', to: 'TODO' },
    { date: '2026-08-04', label: 'd', id: 'TASK-3', from: 'TODO', to: 'RETIRED' },
  ];
  assert.deepEqual(leftDone(t).map((x) => x.id), ['TASK-2']);
});

test('RED: TODO -> DONE is not a reopen', () => {
  // The direction is the whole metric. Counting closes as reopens would report the
  // register's throughput as its failure rate.
  assert.deepEqual(leftDone([{ date: '2026-08-02', label: 'b', id: 'TASK-1', from: 'TODO', to: 'DONE' }]), []);
});

test('RED: DONE -> RETIRED is counted under its own destination, not folded into reopens', () => {
  // RETIRED means the deliverable moved to another id, never that it was dropped. Summing it
  // with DONE -> TODO would report a consolidation as a failure of "done".
  const t = [
    { date: '2026-08-03', label: 'c', id: 'TASK-2', from: 'DONE', to: 'TODO' },
    { date: '2026-08-04', label: 'd', id: 'TASK-3', from: 'DONE', to: 'RETIRED' },
  ];
  const by = byDestination(leftDone(t));
  assert.deepEqual([...by.keys()].sort(), ['RETIRED', 'TODO']);
  assert.equal(by.get('TODO').length, 1);
  assert.equal(by.get('RETIRED').length, 1);
});

// --- the declaration line ---------------------------------------------------

const REOPENED = (date) => `**Reopened ${date}** — was \`DONE\` since 2026-08-20. Done meant the guard shipped; the author meant it was proven in red.`;

test('parseReopenDeclarations reads the line inside the item it belongs to', () => {
  const md = `${HEAD}## TASK 1 — Thing · \`harness\` · \`TODO\`

${REOPENED('2026-08-29')}

body

## TASK 2 — Other · \`harness\` · \`DONE\`

body
`;
  const d = parseReopenDeclarations(md);
  assert.deepEqual(d.get('TASK-1'), ['2026-08-29']);
  assert.equal(d.get('TASK-2'), undefined);
});

test('RED: a declaration in the following item is not credited to the previous one', () => {
  // Section boundaries, not proximity. A scan that took the nearest preceding heading would
  // let one item's declaration silence another item's missing one.
  const md = `${HEAD}## TASK 1 — Thing · \`harness\` · \`TODO\`

body

## TASK 2 — Other · \`harness\` · \`TODO\`

${REOPENED('2026-08-29')}
`;
  const d = parseReopenDeclarations(md);
  assert.equal(d.get('TASK-1'), undefined);
  assert.deepEqual(d.get('TASK-2'), ['2026-08-29']);
});

// --- validateReopenDeclarations: both directions ----------------------------

const SINCE = '2026-08-29';
const reopenOf = (id, date) => ({ date, label: 'x', id, from: 'DONE', to: 'TODO' });

test('RED: a derived reopen with no declaration is a finding', () => {
  // This is the item's central claim. Git says WHAT changed; only the line says why "done"
  // meant two different things, and without this the line is a convention nobody checks.
  const f = validateReopenDeclarations([reopenOf('TASK-1', '2026-08-30')], new Map(), SINCE);
  assert.equal(f.length, 1);
  assert.match(f[0].message, /TASK-1/);
  // The DIRECTION has to be in the assertion, not just the id. Both branches name the item and
  // the convention, so matching on those alone let the forward clause be deleted while the
  // backward one produced a finding that read plausibly and said the opposite thing.
  assert.match(f[0].message, /left `DONE` 1 time/);
});

test('a derived reopen with a declaration is clean', () => {
  const f = validateReopenDeclarations(
    [reopenOf('TASK-1', '2026-08-30')],
    new Map([['TASK-1', ['2026-08-30']]]),
    SINCE,
  );
  assert.deepEqual(f, []);
});

test('RED: a declaration naming a reopen the history does not show is a finding', () => {
  // The self-staling direction check-docs' ignore list already uses: an entry whose target
  // stops existing announces itself, so the list shrinks on its own instead of rotting.
  const f = validateReopenDeclarations([], new Map([['TASK-9', ['2026-08-30']]]), SINCE);
  assert.equal(f.length, 1);
  assert.match(f[0].message, /TASK-9/);
  assert.match(f[0].message, /history shows it leaving `DONE` 0 time/);
});

test('RED: two derived reopens with one declaration is still a finding', () => {
  // Counted, not merely present. One line cannot account for two separate disagreements
  // about what done meant, and "the item has a line somewhere" is the check that would let it.
  const f = validateReopenDeclarations(
    [reopenOf('TASK-1', '2026-08-30'), reopenOf('TASK-1', '2026-09-02')],
    new Map([['TASK-1', ['2026-08-30']]]),
    SINCE,
  );
  assert.equal(f.length, 1);
  assert.match(f[0].message, /left `DONE` 2 time\(s\) since .* and carries 1 /);
});

test('RED: a reopen before the threshold is not retroactively demanded', () => {
  // The same dated-threshold mechanism as doneBlockRequiredFrom, reused rather than
  // duplicated: a NEW reopen cannot slip through, and history is not asked to carry a line
  // nobody had been told to write.
  const f = validateReopenDeclarations([reopenOf('TASK-1', '2026-08-01')], new Map(), SINCE);
  assert.deepEqual(f, []);
});

test('RED: a declaration before the threshold is not reported as orphaned', () => {
  // The mirror of the row above. Judging one side of the window and not the other turns the
  // threshold itself into a source of false findings.
  const f = validateReopenDeclarations([], new Map([['TASK-1', ['2026-08-01']]]), SINCE);
  assert.deepEqual(f, []);
});

// --- the ledger -------------------------------------------------------------

const LEDGER = {
  command: 'node scripts/status-history.mjs',
  revisions: 2,
  window: { from: '2026-08-01', to: '2026-08-03' },
  transitions: [
    { date: '2026-08-02', label: 'bbbbbbb', id: 'TASK-1', from: 'TODO', to: 'DONE' },
    { date: '2026-08-03', label: 'ccccccc', id: 'TASK-2', from: 'DONE', to: 'TODO' },
  ],
  unparseable: [],
  vanished: [],
};

test('the ledger carries both markers a generated progress/ artifact must declare', () => {
  // procedures.mjs already refuses a dated progress/ file with no `done:` block unless it
  // declares itself generated. The renderer satisfies that guard rather than being exempted
  // from it — an exclusion roster is the shape INC-07 fired on.
  assert.equal(isGeneratedArtifact(renderLedger(LEDGER)), true);
});

test('RED: the ledger states every transition as one greppable, interpretation-free line', () => {
  const text = renderLedger(LEDGER);
  assert.match(text, /2026-08-02 · TASK-1 · TODO → DONE/);
  assert.match(text, /2026-08-03 · TASK-2 · DONE → TODO/);
});

test('RED: the ledger reports the K2 count even when it is zero', () => {
  // The number a scorecard reads has to be present as a number. An empty section reads as
  // "not measured", which is exactly the state EVAL-001 had to report.
  const text = renderLedger({ ...LEDGER, transitions: [LEDGER.transitions[0]] });
  assert.match(text, /left_done[^\n]*\b0\b/);
});

test('RED: the ledger declares an unparseable revision instead of dropping it', () => {
  const text = renderLedger({ ...LEDGER, unparseable: [{ date: '2026-08-01', label: 'aaaaaaa', reason: 'no vocabulary' }] });
  assert.match(text, /aaaaaaa/);
  assert.match(text, /unparseable/i);
});

// --- liveness ---------------------------------------------------------------

test('LIVENESS: the real register still yields the declaration convention it documents', () => {
  // The convention is documented in TASKS.md's head. If the wording there and the parser here
  // ever diverge, the guard silently stops finding declarations and every reopen reads as
  // undeclared — loud here rather than at the moment someone actually reopens something.
  const tasks = readFileSync(join(ROOT, 'TASKS.md'), 'utf8');
  assert.match(tasks, /\*\*Reopened <date>\*\*/,
    "TASKS.md's head must document the `**Reopened <date>**` line this parser reads");
  assert.doesNotThrow(() => parseReopenDeclarations(tasks));
});

// --- readRevisions: the one impure function, with its runner injected -------

const fakeGit = (revs) => (args) => {
  if (args[0] === 'log') {
    return { status: 0, stdout: `${revs.map((r) => `${r.sha}\t${r.date}`).join('\n')}\n` };
  }
  const sha = args[1].split(':')[0];
  const found = revs.find((r) => r.sha === sha);
  return found ? { status: 0, stdout: found.text } : { status: 1, stdout: '' };
};

const R = [
  { sha: 'aaaaaaaaaa', date: '2026-08-01', text: HEAD + '## TASK 1 — Thing · `harness` · `TODO`\n' },
  { sha: 'bbbbbbbbbb', date: '2026-08-02', text: HEAD + '## TASK 1 — Thing · `harness` · `DONE`\n' },
  { sha: 'cccccccccc', date: '2026-08-03', text: HEAD + '## TASK 1 — Thing · `harness` · `TODO`\n' },
];

test('readRevisions appends the working tree as an explicitly uncommitted revision', () => {
  const { revisions } = readRevisions({ git: fakeGit(R), workingTree: R[2].text });
  assert.equal(revisions.length, 4);
  assert.equal(revisions.at(-1).label, '(uncommitted)',
    'a status flipped but not yet committed is real, and how much weight it carries has to be visible');
});

test('RED: `since` keeps the revision BEFORE the window, or the first day loses its diff', () => {
  // A transition is a diff. Slicing to `date >= since` alone leaves the first in-window
  // revision with nothing to differ from, and every change made that day vanishes silently.
  const { revisions } = readRevisions({ git: fakeGit(R), workingTree: R[2].text, since: '2026-08-03' });
  const { transitions } = deriveTransitions(revisions);
  assert.deepEqual(transitions.map((t) => `${t.date} ${t.from}->${t.to}`), ['2026-08-03 DONE->TODO']);
});

test('RED: a failing git is a throw, never a report of zero transitions (G-13)', () => {
  const dead = () => ({ status: 128, stdout: '' });
  assert.throws(() => readRevisions({ git: dead, workingTree: '' }), /G-13/);
});

test('RED: an uncommitted reopen is demanded now, not at the commit after it', () => {
  // `'('` sorts below `'2'`, so leaving this to string ordering would drop a working-tree
  // reopen out of the window by accident of ASCII and say nothing (P-16). And the moment to
  // write why done meant two things is the moment the status changes — the line then lands in
  // the same edit, so the committed history already satisfies the check and nothing oscillates.
  const f = validateReopenDeclarations(
    [{ date: UNCOMMITTED, label: UNCOMMITTED, id: 'TASK-1', from: 'DONE', to: 'TODO' }],
    new Map(),
    SINCE,
  );
  assert.equal(f.length, 1);
  assert.match(f[0].message, /TASK-1/);
  assert.match(f[0].message, /left `DONE` 1 time/);
});

// --- P-16: what breaks when the register's own vocabulary moves? -------------
// Asked at verify rather than assumed, and the answer was not "nothing". `RETIRED` was added
// to `Status values:` once already. Remove a token that entries still use and every one of
// them stops classifying at once — which read as forty work items DISAPPEARING from the
// register, a cause that points at the wrong thing entirely.

test('RED: a heading that survives with an unreadable status is unclassified, not vanished', () => {
  const { vanished, unclassified } = deriveTransitions([
    rev('2026-08-01', 'a', 'TASK 1 — Thing · `harness` · `BLOCKED`'),
    // The same entry, after `BLOCKED` is dropped from the register's Status values line.
    {
      date: '2026-08-02',
      label: 'b',
      text: 'Status values: `TODO` · `DONE`\n\n## TASK 1 — Thing · `harness` · `BLOCKED`\n',
    },
  ]);
  assert.deepEqual(vanished, [], 'the heading is still there — nothing was deleted');
  assert.deepEqual(unclassified, [{ date: '2026-08-02', label: 'b', id: 'TASK-1', from: 'BLOCKED' }]);
});

test('an entry deleted outright is still reported as vanished, not as unclassified', () => {
  const { vanished, unclassified } = deriveTransitions([
    rev('2026-08-01', 'a', 'TASK 1 — Thing · `harness` · `DONE`', 'TASK 2 — Other · `harness` · `TODO`'),
    rev('2026-08-02', 'b', 'TASK 2 — Other · `harness` · `TODO`'),
  ]);
  assert.equal(vanished.length, 1);
  assert.deepEqual(unclassified, []);
});

// --- the ledger's STRUCTURE, which is what a reader acts on ------------------
// The first mutation run left 34 structural mutants alive in `renderLedger` — the section
// guards, the by-destination loop, the empty-case branch. Each one is a section silently
// disappearing from the corpus an evaluation reads, which is exactly the "reported PASS while
// verifying nothing" shape `EVAL-001` traced eight escaped defects to. Prose is a different
// matter and is suppressed at the mutant with a reason (`D3`); structure is asserted here.

const LEDGER_FULL = {
  ...LEDGER,
  transitions: [
    ...LEDGER.transitions,
    { date: '2026-08-04', label: 'ddddddd', id: 'TASK-3', from: 'DONE', to: 'RETIRED' },
  ],
  unparseable: [{ date: '2026-08-01', label: 'eeeeeee', reason: 'no status vocabulary' }],
  vanished: [{ date: '2026-08-05', label: 'fffffff', id: 'TASK-4', from: 'DONE' }],
  unclassified: [{ date: '2026-08-06', label: 'ggggggg', id: 'TASK-5', from: 'BLOCKED' }],
};

test('RED: every destination gets its own summary row, sorted', () => {
  const text = renderLedger(LEDGER_FULL);
  assert.match(text, /\| — `DONE` → `RETIRED` \| 1 \|/);
  assert.match(text, /\| — `DONE` → `TODO` \| 1 \|/);
  assert.ok(text.indexOf('→ `RETIRED`') < text.indexOf('→ `TODO`'), 'destinations are sorted, so two runs of the same corpus read the same');
});

test('RED: the summary counts every dimension the corpus can carry', () => {
  const text = renderLedger(LEDGER_FULL);
  assert.match(text, /read \(committed \+ the working tree\) \| 2 \|/);
  assert.match(text, /\| — unparseable \| 1 \|/);
  assert.match(text, /\| window \| 2026-08-01 → 2026-08-03 \|/);
  assert.match(text, /\| transitions \| 3 \|/);
  assert.match(text, /left_done[^|]*\| 2 \|/);
  assert.match(text, /vanished from the register \| 1 \|/);
  assert.match(text, /stopped being readable \| 1 \|/);
});

test('RED: each of the three exception sections appears when it has content', () => {
  const text = renderLedger(LEDGER_FULL);
  assert.match(text, /## Unparseable revisions[\s\S]*eeeeeee[\s\S]*no status vocabulary/);
  assert.match(text, /## Items whose status stopped being readable[\s\S]*TASK-5[\s\S]*BLOCKED/);
  assert.match(text, /## Items that disappeared from the register[\s\S]*TASK-4[\s\S]*ggggggg|## Items that disappeared from the register[\s\S]*TASK-4/);
});

test('RED: and each is ABSENT when it has none — an empty section reads as a measurement', () => {
  const text = renderLedger(LEDGER);
  assert.doesNotMatch(text, /## Unparseable revisions/);
  assert.doesNotMatch(text, /## Items whose status stopped being readable/);
  assert.doesNotMatch(text, /## Items that disappeared from the register/);
});

test('RED: an empty transition list says so rather than printing an empty list', () => {
  const text = renderLedger({ ...LEDGER, transitions: [] });
  assert.match(text, /## Every transition\n\n_None in this window\._/);
  assert.doesNotMatch(text, /^- `/m);
});

test('RED: the reproduce command is the one that was run, verbatim', () => {
  const text = renderLedger({ ...LEDGER, command: 'node scripts/status-history.mjs --since 2026-08-01' });
  assert.match(text, /```\nnode scripts\/status-history\.mjs --since 2026-08-01\n```/);
});

// --- the ledger's SHAPE, which is the half nothing was asserting -------------
// TASK 88. The assertions above match content with `[\s\S]*` and never ask whether the
// artifact is well-formed, so 27 mutants deleting a `push` of a blank line or a prose sentence
// survived — reading as equivalent mutants when none of them is one. A blank line in Markdown
// is not prose, it is SYNTAX: drop the one between a paragraph and a table and the table stops
// rendering, and the ledger's reader is `harness-evaluator`, which reads it as a Markdown
// document.
//
// This is the shape half of the decision `TASK 88` exists to make: a render template's
// SENTENCES are noise, suppressed at the mutant with a written reason; its SHAPE is structure,
// asserted here. No assertion below quotes a sentence, so the ledger's prose stays free to
// change without touching a test.

test('RED: the ledger is a well-formed Markdown document, in both its branches', () => {
  // Both fixtures, because the three exception sections are section GUARDS: a shape checked
  // only on the branch that emits them says nothing about the branch that does not.
  assert.deepEqual(markdownShapeFindings(renderLedger(LEDGER_FULL)), [],
    'every section present — headings, the summary table, four lists and the fenced command');
  assert.deepEqual(markdownShapeFindings(renderLedger(LEDGER)), [],
    'no exception sections — the branch where three `if` blocks emit nothing at all');
});

test('RED: and on the empty-window branch, where the transition list is a sentence', () => {
  assert.deepEqual(markdownShapeFindings(renderLedger({ ...LEDGER, transitions: [] })), []);
});

// --- the git call itself, which nothing was asserting ------------------------
// Found by the mutation run, not by reading: every string in the argv array survived. A
// dropped `--reverse` silently reverses the direction of every transition, and a changed
// `--format` silently empties the dates. Both would produce a ledger that looks right.

test('RED: the log call asks for what the derivation actually depends on', () => {
  const calls = [];
  const spy = (args) => { calls.push(args); return fakeGit(R)(args); };
  readRevisions({ git: spy, workingTree: '' });

  const log = calls[0];
  assert.deepEqual(log, ['log', '--reverse', '--format=%H%x09%ad', '--date=short', '--', 'TASKS.md'],
    'oldest-first, sha TAB short-date, and scoped to the register — a diff read in the wrong order inverts every transition');
});

test('RED: each revision is read at its own sha, by path', () => {
  const calls = [];
  const spy = (args) => { calls.push(args); return fakeGit(R)(args); };
  readRevisions({ git: spy, workingTree: '' });
  assert.deepEqual(calls.slice(1), R.map((r) => ['show', `${r.sha}:TASKS.md`]));
});

test('RED: a revision git cannot read is a throw, not a silently shorter window (G-13)', () => {
  const halfDead = (args) => (args[0] === 'log' ? fakeGit(R)(args) : { status: 128, stdout: '' });
  assert.throws(() => readRevisions({ git: halfDead, workingTree: '' }), /G-13/);
});

// --- the small gaps the mutation run named ----------------------------------

test('RED: two transitions to the same destination accumulate, they do not overwrite', () => {
  const by = byDestination([
    { date: '2026-08-03', label: 'c', id: 'TASK-2', from: 'DONE', to: 'TODO' },
    { date: '2026-08-04', label: 'd', id: 'TASK-3', from: 'DONE', to: 'TODO' },
  ]);
  assert.equal(by.get('TODO').length, 2, 'resetting the bucket per item would report 1 reopen where there are 2');
});

test('RED: a declaration under a non-item heading belongs to no work item', () => {
  // `## Run order` and the register's other prose sections sit between entries. Without the
  // reset, everything under them is credited to whichever item came last.
  const md = `${HEAD}## TASK 1 — Thing · \`harness\` · \`TODO\`

body

## Run order

${REOPENED('2026-08-29')}
`;
  assert.equal(parseReopenDeclarations(md).size, 0);
});

test('RED: the declaration line needs a real ISO date, not any date-shaped text', () => {
  // A future evaluator reads these without interpreting prose, which is the same reason
  // `iterations` must be a bare integer.
  const md = `${HEAD}## TASK 1 — Thing · \`harness\` · \`TODO\`

**Reopened yesterday** — was \`DONE\`. No.

**Reopened 2026-8-9** — was \`DONE\`. Also no.
`;
  assert.equal(parseReopenDeclarations(md).get('TASK-1'), undefined);
});

// --- TASK 88 · the survivors outside renderLedger ---------------------------
// Fourteen mutants the first run left alive in this file's real logic, each killed below by
// the case that distinguishes it. They were not in TASK 88's entry — the entry named only the
// render template — but its `Done` says the file carries no surviving mutant a reader would
// have to re-triage, and these are exactly that. Found by reading the mutation report rather
// than the entry (P-04).

test('RED: `**Reopened <date>**` counts only at the start of a line', () => {
  // The mutant drops the regex's `^` anchor. A sentence that MENTIONS a reopening then
  // registers as a declaration of one, and an item could discharge its obligation by talking
  // about it — which is the opposite of what the convention asks for.
  const md = `${HEAD}## TASK 1 — Thing · \`harness\` · \`TODO\`

See **Reopened 2026-08-29** in the log above for context.
`;
  assert.equal(parseReopenDeclarations(md).get('TASK-1'), undefined);
});

test('RED: two declarations under one item accumulate — the second does not replace the first', () => {
  // The mutant turns `if (!out.has(current))` into an unconditional reset, so an item that
  // reopened twice reads as having declared once. `validateReopenDeclarations` COUNTS, so a
  // silently truncated list is a false finding against an item that did the right thing.
  const md = `${HEAD}## TASK 1 — Thing · \`harness\` · \`TODO\`

${REOPENED('2026-08-29')}

${REOPENED('2026-08-30')}
`;
  assert.deepEqual(parseReopenDeclarations(md).get('TASK-1'), ['2026-08-29', '2026-08-30']);
});

test('RED: the window includes its own boundary date, on both sides', () => {
  // The mutant relaxes `>= since` to `> since`. A reopen made ON the day the threshold names
  // would fall out of the window in silence, and a threshold whose first day is not covered is
  // a threshold nobody can reason about.
  const onTheDay = [{ date: SINCE, label: 'x', id: 'TASK-1', from: 'DONE', to: 'TODO' }];
  assert.equal(validateReopenDeclarations(onTheDay, new Map(), SINCE).length, 1,
    'a derived reopen dated exactly `since` is in window and needs its declaration');
  assert.equal(validateReopenDeclarations([], new Map([['TASK-1', [SINCE]]]), SINCE).length, 1,
    'and a declaration dated exactly `since` is judged too — one side only would make the threshold itself a source of false findings');
});

test('RED: findings come back in a stable id order, so two runs of one corpus read the same', () => {
  // The mutant drops `.sort()`. Map iteration order would then follow whichever id happened to
  // be seen first, and a diff of two ledger runs would show movement that is not there.
  const list = [
    { date: SINCE, label: 'x', id: 'TASK-9', from: 'DONE', to: 'TODO' },
    { date: SINCE, label: 'y', id: 'TASK-2', from: 'DONE', to: 'TODO' },
  ];
  const ids = validateReopenDeclarations(list, new Map(), SINCE).map((f) => f.message.match(/TASK-\d+/)[0]);
  assert.deepEqual(ids, ['TASK-2', 'TASK-9']);
});

// `readRevisions` splits git's output behind TWO defenses — `.trim()` and `.filter(Boolean)` —
// and they need one test each. **Found by neutering, not by reading:** a single test with both
// leading and trailing padding killed NEITHER mutant, because each defense fully compensates
// for the other's absence on that input. So each test below carries the input that isolates
// one of them, and a phantom revision is fatal either way: its sha is not a sha, and the very
// next `git show <sha>:TASKS.md` throws G-13 on output git itself produced.

const withLog = (stdout) => (args) => (args[0] === 'log' ? { status: 0, stdout } : fakeGit(R)(args));
const LOG_LINES = R.map((r) => `${r.sha}\t${r.date}`);

test('RED: trailing whitespace in git output is not an extra revision (`.trim()`)', () => {
  // Whitespace-only, not empty — `.filter(Boolean)` keeps `'   '` because it is truthy, so
  // this is the input on which `.trim()` is the only thing standing.
  const { revisions, walked } = readRevisions({ git: withLog(`${LOG_LINES.join('\n')}\n   `), workingTree: R[2].text });
  assert.equal(walked, 3);
  assert.equal(revisions.length, 4, 'three commits plus the working tree — no phantom fourth');
});

test('RED: an empty line inside git output is not an extra revision (`.filter(Boolean)`)', () => {
  // In the middle, where `.trim()` cannot reach it — the input on which `.filter(Boolean)` is
  // the only thing standing.
  const { revisions, walked } = readRevisions({ git: withLog(`${LOG_LINES[0]}\n\n${LOG_LINES.slice(1).join('\n')}\n`), workingTree: R[2].text });
  assert.equal(walked, 3);
  assert.equal(revisions.length, 4, 'three commits plus the working tree — no phantom fourth');
});

test('RED: the revision label is the seven-character short sha, not the whole one', () => {
  // The mutant returns the full sha. The ledger prints the label on every line, so this is
  // forty characters of noise per row in the corpus an evaluation reads.
  const { revisions } = readRevisions({ git: fakeGit(R), workingTree: R[2].text });
  assert.deepEqual(revisions.slice(0, 3).map((r) => r.label), ['aaaaaaa', 'bbbbbbb', 'ccccccc']);
});

test('RED: a `since` newer than every revision keeps exactly the last one', () => {
  // The branch with NO coverage at all before this test, and three mutants live in it:
  // `first < 0` -> false, `all.slice(-1)` -> `all`, and `-1` -> `+1`. Keeping the last
  // revision is what lets an uncommitted change still be diffed against something; keeping
  // all of them silently ignores `since`, and `slice(1)` drops the oldest instead of the
  // newest, which is the wrong end.
  const { revisions, scoped } = readRevisions({ git: fakeGit(R), workingTree: R[2].text, since: '2026-09-01' });
  assert.equal(scoped, 1);
  assert.deepEqual(revisions.map((r) => r.label), ['ccccccc', '(uncommitted)']);
});

test('RED: a `since` at or before the first revision keeps all of them', () => {
  // The mutant relaxes `first < 0` to `first <= 0`: when the earliest revision is already in
  // window, `first` is 0, and the mutant takes the newer-than-everything branch instead —
  // reporting one revision where the whole history was asked for.
  const { revisions, scoped } = readRevisions({ git: fakeGit(R), workingTree: R[2].text, since: '2026-08-01' });
  assert.equal(scoped, 3);
  assert.deepEqual(revisions.map((r) => r.label), ['aaaaaaa', 'bbbbbbb', 'ccccccc', '(uncommitted)']);
});
