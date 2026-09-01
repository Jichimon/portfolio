import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkColourAndBreakpointLiteralsAreDeclaredOnce } from './design-tokens.mjs';

const filled = (path, text) => ({ path, text });

// ── S-05 · colour and breakpoint literals have one declaration site ──────────
// The token stylesheet is a FILE among the ones handed in, never a name the check
// knows by heart. The sanctioned breakpoint set is DERIVED from it: a custom
// property whose whole value is a bare pixel length (P-13) — which is exactly the
// three --breakpoint-* declarations today and needs no edit for a fourth.

const TOKENS_PATH = 'site/src/styles/tokens.css';
const TOKENS_FIXTURE = [
  ':root {',
  '  --color-bg: #f8f7f4;',
  '  --color-ink-muted: rgba(20, 20, 15, 0.64);',
  '  --color-accent: oklch(42% 0.15 15);',
  '  --breakpoint-medium: 1180px;',
  '  --breakpoint-narrow: 820px;',
  '  --breakpoint-compact: 560px;',
  '  --type-display-l: 500 42px var(--font-display);', // NOT a bare width — shorthand, must not be sanctioned
  '}',
].join('\n');
const TOKEN_CFG = { tokenStylesheet: TOKENS_PATH };
const withTokens = (...extra) => [filled(TOKENS_PATH, TOKENS_FIXTURE), ...extra];

test('RED: a hex colour literal in a component is a finding', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Card.astro', '<style>.card { color: #123456; }</style>')),
    TOKEN_CFG,
  );
  assert.equal(r.length, 1);
  assert.match(r[0].message, /#123456/);
  assert.equal(r[0].file, 'site/src/components/Card.astro');
});

test('the same hex colour literal inside the token stylesheet is not a finding', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(withTokens(), TOKEN_CFG);
  assert.deepEqual(r, []);
});

test('a var(--color-*) reference produces no finding', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Card.astro', '<style>.card { color: var(--color-ink); }</style>')),
    TOKEN_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: rgba(), hsl() and oklch() literals outside the token stylesheet are each a finding', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(
      filled('site/src/components/A.astro', '<style>.a { color: rgba(0,0,0,.5); }</style>'),
      filled('site/src/components/B.astro', '<style>.b { color: hsl(10 50% 50%); }</style>'),
      filled('site/src/components/C.astro', '<style>.c { color: oklch(50% 0.1 10); }</style>'),
    ),
    TOKEN_CFG,
  );
  assert.equal(r.length, 3);
});

test('a colour-looking hex value inside a comment is prose, not a declaration', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Card.astro', '<style>/* was #123456 before the redesign */ .card { color: var(--color-ink); }</style>')),
    TOKEN_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: an SVG fill naming a hex literal is a finding; naming var(--accent) is not', () => {
  const hex = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Icon.astro', '<svg><path fill="#14140F" /></svg>')),
    TOKEN_CFG,
  );
  assert.equal(hex.length, 1);
  const tokenised = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Icon.astro', '<svg><path fill="var(--color-accent)" /></svg>')),
    TOKEN_CFG,
  );
  assert.deepEqual(tokenised, []);
});

test('RED: every offending file is reported, not only the first', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(
      filled('site/src/components/A.astro', '<style>.a { color: #111111; }</style>'),
      filled('site/src/components/B.astro', '<style>.b { color: #222222; }</style>'),
    ),
    TOKEN_CFG,
  );
  assert.equal(r.length, 2);
});

// ── the breakpoint half ───────────────────────────────────────────────────────

test('a sanctioned breakpoint inside @media produces no finding', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Rail.astro', '<style>@media (max-width: 820px) { .rail { display: none; } }</style>')),
    TOKEN_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: a fourth, unsanctioned breakpoint inside @media is a finding', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Rail.astro', '<style>@media (max-width: 700px) { .rail { display: none; } }</style>')),
    TOKEN_CFG,
  );
  assert.equal(r.length, 1);
  assert.match(r[0].message, /700px/);
});

test('a max-width CSS PROPERTY outside @media is a content-width cap, not a finding', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Footer.astro', '<style>.footer__note { max-width: 1032px; }</style>')),
    TOKEN_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: a max-width property inside an @media BODY is still not the condition, and is not a finding', () => {
  // Only the parenthesised condition between @media and the opening { is in scope.
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(
      filled(
        'site/src/components/Footer.astro',
        '<style>@media (max-width: 820px) { .footer__note { max-width: 400px; } }</style>',
      ),
    ),
    TOKEN_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: the sanctioned set is DERIVED — adding a fourth token clears a width with no config or guard edit', () => {
  const before = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Rail.astro', '<style>@media (max-width: 1440px) { .rail { display: none; } }</style>')),
    TOKEN_CFG,
  );
  assert.equal(before.length, 1);

  const grownTokens = TOKENS_FIXTURE.replace('}', '  --breakpoint-huge: 1440px;\n}');
  const after = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    [
      filled(TOKENS_PATH, grownTokens),
      filled('site/src/components/Rail.astro', '<style>@media (max-width: 1440px) { .rail { display: none; } }</style>'),
    ],
    TOKEN_CFG,
  );
  assert.deepEqual(after, []);
});

test('RED: the token stylesheet missing from the scanned files denies rather than passing quietly', () => {
  assert.throws(
    () => checkColourAndBreakpointLiteralsAreDeclaredOnce([filled('site/src/components/A.astro', '')], TOKEN_CFG),
    /tokens\.css/,
  );
});

// ── the newline/backtick fix (TASK 109) ───────────────────────────────────────

test('RED: a multi-line template literal no longer desyncs the scanner into leaking a hidden comment as a false finding', () => {
  // Before the fix, withCommentsBlanked closed ANY quote at the next newline,
  // template literals included. A multi-line backtick string containing a //-shaped
  // run of characters then got misread: the internal `//` opened a phantom line
  // comment (closed at the next \n, same bug), and when the literal's REAL closing
  // backtick was finally reached, state was already back to 'code' — so that
  // backtick was read as OPENING a new (phantom) quote instead of closing the real
  // one. A real `/* ... */` comment placed right after — on the SAME line, so no
  // further newline resets the phantom state first — then landed inside that
  // phantom quote, where comment-opener detection never runs: its text was copied
  // through VERBATIM instead of being blanked, so a colour literal mentioned only
  // in the comment's prose leaked into a real finding. Reverting the one-line fix
  // (`quote !== '\`'`) reproduces exactly that: this test goes from 0 findings to 1.
  const text = [
    '---',
    'const greeting = `',
    'line one',
    '// fake, not a real comment',
    'line two`; /* was #123456 before the redesign */',
    '---',
    '<style>.a { color: var(--color-ink); }</style>',
  ].join('\n');
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Weird.astro', text)),
    TOKEN_CFG,
  );
  assert.deepEqual(r, [], 'a colour literal mentioned only inside a real comment must not become a finding');
});
