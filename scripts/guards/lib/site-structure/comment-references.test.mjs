import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCommentsCarryNoExternalReference } from './comment-references.mjs';

const filled = (path, text) => ({ path, text });

// ── S-08 · a comment carries no reference to a document outside site/ ────────

const REF = {
  externalDocumentReferences: ['docs/', '.claude/', 'resources/', 'progress/', 'scripts/', 'TASKS.md', 'CLAUDE.md'],
  recordIdPattern: String.raw`\b(?:ADR|INC|EC|EVAL|SPEC)-\d+\b|\bTASK[\s-]\d+\b|\b[HPCTGS]-\d{2}\b`,
};

test('a source file with no comments produces no finding', () => {
  const r = checkCommentsCarryNoExternalReference([filled('site/lib/nav/items.mjs', 'export const items = [];')], REF);
  assert.deepEqual(r, []);
});

test('a comment that explains the code and nothing else is fine', () => {
  const text = '// Resolved before first paint, so the theme never flashes.\nexport const theme = 1;';
  assert.deepEqual(checkCommentsCarryNoExternalReference([filled('site/src/behaviour/theme.ts', text)], REF), []);
});

test('RED: a line comment naming an external directory is a finding', () => {
  const r = checkCommentsCarryNoExternalReference(
    [filled('site/lib/content/pages.mjs', '// See docs/adr/ADR-002-content-pipeline.md\nexport const x = 1;')],
    REF,
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].file, 'site/lib/content/pages.mjs');
  assert.equal(r[0].line, 1);
});

test('RED: a block comment naming a rule id is a finding', () => {
  const r = checkCommentsCarryNoExternalReference(
    [filled('site/src/gateway/pages.ts', '/* Only the gateway may import this (S-02). */\nexport const x = 1;')],
    REF,
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].reference, 'S-02');
});

test('RED: an HTML comment in an .astro file is scanned too', () => {
  const r = checkCommentsCarryNoExternalReference(
    [filled('site/src/pages/index.astro', '<main></main>\n<!-- tracked in TASKS.md -->')],
    REF,
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].line, 2);
});

test('RED: a work item id in a comment is a finding', () => {
  const r = checkCommentsCarryNoExternalReference(
    [filled('site/lib/i18n/urls.mjs', '// Testimonials arrive with TASK 19.\nexport const x = 1;')],
    REF,
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].reference, 'TASK 19');
});

test('a URL inside a string literal is data, not a comment (TASK 10)', () => {
  // The guard that fires on quoted text is the guard people route around. A path
  // living in a real string is the code doing its job, not a documentation pointer.
  const text = `export const base = '../resources/site';\nexport const url = "https://example.com/docs/x";`;
  assert.deepEqual(checkCommentsCarryNoExternalReference([filled('site/src/content.config.ts', text)], REF), []);
});

test('a bare URL in a comment does not trip the scanner on its own scheme', () => {
  const text = '// Astro renders this at build: https://astro.build\nexport const x = 1;';
  assert.deepEqual(checkCommentsCarryNoExternalReference([filled('site/lib/content/x.mjs', text)], REF), []);
});

test("site/'s own tree may be named in a comment", () => {
  const text = '// Mirrors the shape site/lib/content already returns.\nexport const x = 1;';
  assert.deepEqual(checkCommentsCarryNoExternalReference([filled('site/src/gateway/pages.ts', text)], REF), []);
});

test('RED: every offending comment is reported, not only the first', () => {
  const text = '// docs/adr/README.md\nconst a = 1;\n// progress/ has the log\nconst b = 2;';
  const r = checkCommentsCarryNoExternalReference([filled('site/lib/content/x.mjs', text)], REF);
  assert.deepEqual(r.map((f) => f.line), [1, 3]);
});

test('RED: a reference on the third line of a block comment reports that line', () => {
  const text = '/*\n * Fine.\n * Decided in ADR-008.\n */\nexport const x = 1;';
  const r = checkCommentsCarryNoExternalReference([filled('site/lib/nav/items.mjs', text)], REF);
  assert.equal(r.length, 1);
  assert.equal(r[0].line, 3);
});

test('the reference set comes from the caller, never hardcoded', () => {
  const text = '// resources/site holds the copy.\nexport const x = 1;';
  assert.equal(checkCommentsCarryNoExternalReference([filled('site/lib/x.mjs', text)], REF).length, 1);
  assert.deepEqual(
    checkCommentsCarryNoExternalReference([filled('site/lib/x.mjs', text)], { ...REF, externalDocumentReferences: [] }),
    [],
  );
});

// ── S-08 · the scanner's quote and comment boundaries, as observable outcomes ──

const scan = (text) => checkCommentsCarryNoExternalReference([filled('site/lib/x.mjs', text)], REF);

test('a reference inside a template literal is data, not a comment', () => {
  assert.deepEqual(scan('const url = `https://example.com/docs/y`;'), []);
});

test('an escaped quote does not end the string early, so the real comment after it is still scanned', () => {
  // Without escape handling the string closes at the escaped quote, the rest of the
  // line re-opens one, and the genuine comment is never seen.
  const r = scan("const s = 'it\\'s fine'; // see docs/adr");
  assert.equal(r.length, 1);
  assert.equal(r[0].reference, 'docs/');
});

test('a block comment that closes leaves the rest of the line as code', () => {
  assert.deepEqual(scan('/* fine */ const p = docs/x;'), []);
});

test('an HTML comment that closes leaves the rest of the line as markup', () => {
  assert.deepEqual(scan('<!-- fine --> docs/x'), []);
});

test('a URL scheme is not a comment opener', () => {
  assert.deepEqual(scan('Visit https://example.com/docs/page for more'), []);
});

test('an unterminated quote ends at the newline rather than swallowing the file', () => {
  // An apostrophe in .astro template prose must not blind the scanner for the rest
  // of the file. Recovery at the newline is what bounds the damage to one line.
  const r = scan("const s = 'oops;\n// see docs/adr");
  assert.equal(r.length, 1);
  assert.equal(r[0].line, 2);
});

test('a line comment ends at the newline, so the next line is code again', () => {
  assert.deepEqual(scan('// a note\nconst p = docs/x;'), []);
});

test('a block comment spans lines until it closes', () => {
  const r = scan('/* one\n * two docs/x\n */\nconst p = 1;');
  assert.equal(r.length, 1);
  assert.equal(r[0].line, 2);
});

test('the finding names the file, the line and what it matched, and cites the rule', () => {
  const r = scan('// see docs/adr/README.md');
  assert.match(r[0].message, /site\/lib\/x\.mjs:1/);
  assert.match(r[0].message, /S-08/);
  assert.match(r[0].message, /check-docs/);
});

test('a bare // inside a single-quoted string never opens a comment', () => {
  assert.deepEqual(scan("const p = 'a//docs/b';"), []);
});

test('a bare // inside a double-quoted string never opens a comment', () => {
  assert.deepEqual(scan('const p = "a//docs/b";'), []);
});

test('a bare // inside a template literal never opens a comment', () => {
  assert.deepEqual(scan('const p = `a//docs/b`;'), []);
});

// ── the newline/backtick fix (TASK 109) ───────────────────────────────────────

test('RED: a multi-line template literal no longer desyncs the scanner into missing a real trailing comment', () => {
  // Same bug as design-tokens.mjs's withCommentsBlanked, found by diffing the two
  // hand-rolled copies against each other while splitting this file into modules.
  // Before the fix, a backtick-quoted string closed at its first internal newline;
  // a `//`-shaped run inside it then opened a phantom line comment (closed at the
  // next \n, same bug), and by the time the literal's REAL closing backtick was
  // reached, state was already 'code' — so that backtick was read as OPENING a new
  // (phantom) quote rather than closing the real one. A real trailing `//` comment
  // placed right after — on the SAME line, so no further newline resets the
  // phantom state first — then landed inside that phantom quote, where comment-
  // opener detection never runs and nothing is ever kept into byLine: the
  // reference was silently missed. Reverting the fix (`quote !== '\`'` in
  // comment-references.mjs) reproduces exactly that: this test goes from 1
  // finding to 0.
  const text = [
    'const greeting = `',
    'line one',
    '// fake, not a real comment',
    'line two`; // see docs/adr/README.md',
  ].join('\n');
  const r = scan(text);
  assert.equal(r.length, 1, 'the real trailing comment must still be scanned and its reference found');
  assert.equal(r[0].reference, 'docs/');
});
