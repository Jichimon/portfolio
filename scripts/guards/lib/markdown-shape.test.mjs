// TASK 88's red battery. Every assertion here was written before the module it names, and
// every rule below is shown failing on a document that breaks it (T-04, P-14).
//
// WHY THIS EXISTS. `renderLedger` builds a Markdown document out of `L.push(...)` calls, and
// the mutation run left 27 of those pushes alive: every one a blank line or a prose sentence.
// They read as equivalent mutants and they are not. A blank line in Markdown is not prose —
// it is SYNTAX. Drop the blank between a paragraph and a table and the table stops rendering;
// drop the delimiter row and there is no table at all. The ledger's reader is
// `harness-evaluator`, which reads it as a Markdown document, so a malformed ledger is a real
// defect that survived only because every existing assertion matches content with `[\s\S]*`
// and nothing asserted that the artifact is WELL-FORMED.
//
// D3 gains the distinction this item exists to make: a render template's SENTENCES are noise,
// suppressed at the mutant with a written reason; its SHAPE is structure, asserted here. No
// rule below quotes a sentence, so the ledger's prose stays free to change without touching a
// test.
//
// THE ASSUMPTION, stated rather than discovered later: this checks a GENERATED artifact, where
// every block-level element is emitted as one line. That is what makes "two adjacent paragraph
// lines are two blocks" a legitimate rule here and a wrong one for hand-written prose, which
// soft-wraps. A hand-written document is not what this module is for.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownShapeFindings } from './markdown-shape.mjs';

const FENCE = '```';

/** A document, written as its lines. The trailing empty string is the blank line closing it. */
const doc = (...lines) => `${lines.join('\n')}\n`;

const rules = (text) => markdownShapeFindings(text).map((f) => f.rule);

const WELL_FORMED = doc(
  '# Title',
  '',
  '**A paragraph.**',
  '',
  FENCE,
  'a fenced line',
  FENCE,
  '',
  '## A section',
  '',
  '| | count |',
  '|---|---|',
  '| rows | 2 |',
  '',
  '- one item',
  '- another item',
  '',
);

test('a well-formed generated document yields no findings', () => {
  assert.deepEqual(markdownShapeFindings(WELL_FORMED), []);
});

// --- R1 · the document opens with an H1 -------------------------------------
// Kills the heading push, and the `const L = []` -> `['Stryker was here']` mutant, which
// prepends a line ahead of the heading.

test('RED: a document that opens with a paragraph instead of an H1 is a finding', () => {
  assert.deepEqual(rules(doc('**A paragraph.**', '', '## A section', '', 'body', '')), ['document-opens-with-h1']);
});

test('RED: a document that opens with a blank line is a finding', () => {
  assert.ok(rules(doc('', '# Title', '', 'body', '')).includes('document-opens-with-h1'));
});

test('RED: a stray value ahead of the heading is a finding', () => {
  // The exact shape Stryker's ArrayDeclaration mutant produces on `const L = []`.
  assert.ok(rules(doc('Stryker was here', '# Title', '', 'body', '')).includes('document-opens-with-h1'));
});

// --- R2 · exactly one blank line between blocks -----------------------------
// The workhorse. Every deleted blank-line push leaves two blocks touching; every deleted push
// of a whole block leaves two blank lines where one belongs.

test('RED: two blocks with no blank line between them is a finding', () => {
  assert.deepEqual(rules(doc('# Title', '', '**A paragraph.**', '## A section', '', 'body', '')), ['block-separation']);
});

test('RED: two adjacent paragraph lines are two blocks, not one soft-wrapped block', () => {
  assert.deepEqual(rules(doc('# Title', '', 'first', 'second', '')), ['block-separation']);
});

test('RED: two blank lines between blocks is the same finding — a deleted block leaves one', () => {
  assert.deepEqual(rules(doc('# Title', '', 'a paragraph', '', '', '## A section', '', 'body', '')), ['block-separation']);
});

test('RED: a heading touching the block above it is a finding', () => {
  assert.deepEqual(rules(doc('# Title', 'body', '')), ['block-separation']);
});

test('RED: a fence touching the block above it is a finding', () => {
  assert.deepEqual(rules(doc('# Title', '', 'a paragraph', FENCE, 'x', FENCE, '')), ['block-separation']);
});

test('consecutive table rows are ONE block, and consecutive list items are ONE block', () => {
  // The false positive that would make this module unusable: a table has no blank lines
  // inside it, and neither does a list.
  assert.deepEqual(markdownShapeFindings(WELL_FORMED), []);
  assert.deepEqual(markdownShapeFindings(doc('# T', '', '- a', '- b', '- c', '')), []);
});

test('a blank line inside a fence separates nothing — fenced content is literal', () => {
  assert.deepEqual(markdownShapeFindings(doc('# T', '', FENCE, 'a', '', 'b', FENCE, '')), []);
});

test('a heading-shaped line inside a fence is not a heading', () => {
  assert.deepEqual(markdownShapeFindings(doc('# T', '', FENCE, '# not a heading', FENCE, '')), []);
});

// --- R3 · a table carries a header row and a delimiter row ------------------
// Kills the header-row and delimiter-row pushes. Without either, the summary renders as
// literal pipes and the numbers a scorecard reads stop being a table.

test('RED: a table whose FIRST row is the delimiter is a finding', () => {
  assert.deepEqual(rules(doc('# T', '', '|---|---|', '| rows | 2 |', '')), ['table-delimiter-first']);
});

test('RED: a table whose SECOND row is not a delimiter is a finding', () => {
  assert.deepEqual(rules(doc('# T', '', '| | count |', '| rows | 2 |', '')), ['table-missing-delimiter']);
});

test('RED: a one-row table is a finding — a header with nothing under it is not a table', () => {
  assert.deepEqual(rules(doc('# T', '', '| | count |', '')), ['table-single-row']);
});

test('a delimiter row is recognised with or without alignment colons and padding', () => {
  assert.deepEqual(markdownShapeFindings(doc('# T', '', '| a | b |', '| :--- | ---: |', '| 1 | 2 |', '')), []);
});

// --- R4 · the document closes with exactly one blank line -------------------
// Kills the final blank-line push. Stated as ONE BLANK LINE, not one newline: the renderer
// legitimately ends with a blank line, and an assertion written the other way would fail on
// correct output — which is how a shape check becomes the thing people delete.

test('RED: a document with no closing blank line is a finding', () => {
  assert.deepEqual(rules('# Title\n\nbody\n'), ['document-ends-with-one-blank']);
});

test('RED: a document with two closing blank lines is a finding', () => {
  assert.ok(rules('# Title\n\nbody\n\n\n').includes('document-ends-with-one-blank'));
});

test('RED: a document not ending in a newline at all is a finding', () => {
  assert.ok(rules('# Title\n\nbody').includes('document-ends-with-one-blank'));
});

// --- R5 · a fence that never closes ----------------------------------------
// G-13's shape at the level of a checker: a document this module cannot parse must produce a
// finding, never a pass. An unterminated fence swallows the rest of the file, so every rule
// after it would silently assert nothing.

test('RED: an unterminated fence is a finding rather than a silent pass', () => {
  assert.ok(rules(doc('# T', '', FENCE, 'a', '')).includes('unterminated-fence'));
});

test('RED: an unterminated fence does not let the rules after it report clean', () => {
  const f = markdownShapeFindings('# T\n\n' + FENCE + '\nbody');
  assert.ok(f.length > 0);
  assert.ok(f.some((x) => x.rule === 'unterminated-fence'));
});

// --- the findings themselves ------------------------------------------------

test('every finding carries a 1-based line number and a message naming what is wrong', () => {
  const [f] = markdownShapeFindings(doc('# Title', '', 'a paragraph', '## A section', '', 'body', ''));
  assert.equal(f.line, 4, 'the line the reader has to open — the heading that touches the paragraph above it');
  assert.equal(typeof f.message, 'string');
  assert.ok(f.message.length > 0);
});

test('an empty document is a finding, not a pass', () => {
  // The degenerate input a renderer produces when every push is gone. Reporting "well-formed"
  // for it would make this module agree that nothing is fine.
  assert.ok(markdownShapeFindings('').length > 0);
});

// --- the classifiers, one test per thing each regex actually decides --------
// Added after this module's OWN first mutation run left 41 mutants alive in it (TASK 88). A
// checker that enters the mutation-covered surface untested is the defect it was built to
// find, one level up. Each test below names the input that separates one regex from its
// mutant — the anchors, the whitespace classes, and the digit class.

test('a whitespace-only line is blank, not a paragraph', () => {
  // Without `.trim()`, three spaces are truthy content: three blocks where there is one.
  assert.deepEqual(markdownShapeFindings(doc('# T', '', 'a', '   ', 'b', '')), []);
});

test('a fence is recognised only at the start of a line, and through indentation', () => {
  assert.deepEqual(markdownShapeFindings(doc('# T', '', `use ${FENCE} inline`, '')), [],
    'a sentence that mentions a fence does not open one — without the anchor it would, and swallow the file');
  assert.deepEqual(markdownShapeFindings(doc('# T', '', `  ${FENCE}`, '  indented', `  ${FENCE}`, '')), [],
    'an indented fence is still a fence');
});

test('a table row is recognised only at the start of a line, and through indentation', () => {
  assert.deepEqual(markdownShapeFindings(doc('# T', '', 'a | b', '')), [],
    'a sentence containing a pipe is not a table row');
  assert.deepEqual(markdownShapeFindings(doc('# T', '', '  | a | b |', '  |---|---|', '')), [],
    'an indented table is still a table');
});

test('a list item is recognised only at the start of a line, and through indentation', () => {
  assert.deepEqual(rules(doc('# T', '', 'a - b', 'c - d', '')), ['block-separation'],
    'sentences containing a dash are two paragraphs, not one list — without the anchor they would merge into one block and the missing blank line would go unreported');
  assert.deepEqual(markdownShapeFindings(doc('# T', '', '- a', '  - nested', '')), [],
    'a nested list item continues the list rather than starting a new block');
});

test('an ordered list item takes any number of digits, and only digits', () => {
  assert.deepEqual(markdownShapeFindings(doc('# T', '', '9. nine', '10. ten', '')), [],
    'two-digit ordinals continue the list — with a single-digit class the tenth item starts a new block');
  assert.deepEqual(rules(doc('# T', '', 'a. one', 'b. two', '')), ['block-separation'],
    'letters before the dot are prose, not an ordered list');
});

test('a delimiter row is the WHOLE line, from its first pipe to its last', () => {
  assert.deepEqual(rules(doc('# T', '', '| a | --- |', '| b | c |', '')), ['table-missing-delimiter'],
    'a header whose last cell happens to hold dashes is not a delimiter row — without the start anchor it would be, and the table would read as headerless');
  assert.deepEqual(rules(doc('# T', '', '| a | b |', '| --- | --- | oops', '')), ['table-missing-delimiter'],
    'and content after the last pipe disqualifies it — without the end anchor this would pass as a delimiter');
});

test('a delimiter row tolerates the whitespace a renderer may put around it', () => {
  assert.deepEqual(markdownShapeFindings(doc('# T', '', '  | a | b |', '  |---|---|  ', '')), []);
});

// --- block extent: a run ends where it stops matching ----------------------
// The loop-bound mutants: `&&` -> `||` runs a table or a list to the end of the file, which
// silently swallows every block after it and every finding those blocks would have produced.

test('RED: a table ends where its rows end — it does not swallow the rest of the document', () => {
  assert.deepEqual(rules(doc('# T', '', '| a | b |', '|---|---|', '', '| c |', '')), ['table-single-row'],
    'the second table is a separate block and is judged on its own');
});

test('RED: a list ends where its items end — it does not swallow the rest of the document', () => {
  assert.deepEqual(rules(doc('# T', '', '- a', '', '| c |', '')), ['table-single-row'],
    'the table after the list is still seen as a table');
});

test('a header and a delimiter with no body rows is a complete table', () => {
  // Kills the off-by-one that would report a two-row table as a single-row one. An empty
  // section of the ledger renders exactly this shape.
  assert.deepEqual(markdownShapeFindings(doc('# T', '', '| a | b |', '|---|---|', '')), []);
});

// --- what a finding tells the reader ----------------------------------------

test('every rule reports the line the reader has to open', () => {
  const at = (text, rule) => markdownShapeFindings(text).find((f) => f.rule === rule).line;
  assert.equal(at(doc('# T', '', FENCE, 'a', ''), 'unterminated-fence'), 3, 'the fence that opens, not the end of the file');
  assert.equal(at(doc('para', '', 'body', ''), 'document-opens-with-h1'), 1);
  assert.equal(at(doc('# T', 'body', ''), 'block-separation'), 2, 'the lower of the two blocks that run together');
  assert.equal(at(doc('# T', '', '| | count |', ''), 'table-single-row'), 3, 'the table, not the document');
  assert.equal(at('# T\n\nbody\n', 'document-ends-with-one-blank'), 3, 'the last line, which is the one that is wrong');
});

test('every finding carries a non-empty message, for every rule this module can report', () => {
  // A finding with a line number and no message hands the reader a location and no defect.
  // Asserted across every rule at once so a new rule cannot arrive without one.
  const broken = [
    doc('# T', '', FENCE, 'a', ''),
    doc('para', '', 'body', ''),
    doc('# T', 'body', ''),
    doc('# T', '', '| | count |', ''),
    doc('# T', '', '|---|---|', '| a | b |', ''),
    doc('# T', '', '| a | b |', '| c | d |', ''),
    '# T\n\nbody\n',
  ];
  const found = broken.flatMap((t) => markdownShapeFindings(t));
  for (const f of found) {
    assert.equal(typeof f.message, 'string', `${f.rule} must carry a message`);
    assert.ok(f.message.trim().length > 0, `${f.rule} must carry a NON-EMPTY message`);
    assert.ok(Number.isInteger(f.line) && f.line >= 1, `${f.rule} must carry a real line number`);
  }
  assert.deepEqual([...new Set(found.map((f) => f.rule))].sort(), [
    'block-separation',
    'document-ends-with-one-blank',
    'document-opens-with-h1',
    'table-delimiter-first',
    'table-missing-delimiter',
    'table-single-row',
    'unterminated-fence',
  ], 'every rule this module can report is exercised above — a new one cannot arrive untested');
});

test('RED: an H1 is the START of the first line, not something mentioned in it', () => {
  // Without the anchor, a first line that merely contains a hash passes as a title.
  assert.ok(rules(doc('see # this', '', 'body', '')).includes('document-opens-with-h1'));
});

test('a table that runs to the end of the file ends there, without looking past it', () => {
  // The branch where the run is terminated by the end of the document rather than by a blank
  // line. Reported as NO COVERAGE by this module's own mutation run — the shape of defect the
  // module exists to catch, found in the module itself.
  assert.deepEqual(rules('# T\n\n| a | b |\n|---|---|'), ['document-ends-with-one-blank'],
    'the table itself is well-formed; only the missing closing blank line is wrong');
});
