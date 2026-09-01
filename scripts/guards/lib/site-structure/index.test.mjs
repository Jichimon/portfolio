import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSite } from './index.mjs';

// checkSite composes all eight S-* checkers (TASK 109 split each into its own module,
// each with its own test file beside it — this file tests only the composition itself:
// does checkSite wire every property in, and does it count what it scanned).

const CFG = { maxFilesPerDir: 6, maxFilesPerPackageRoot: 10, gateway: 'site/src/gateway', core: 'site/lib' };

const filled = (path, text) => ({ path, text });

test('checkSite composes the file-cap, gateway-boundary and framework-free properties and counts what it scanned', () => {
  const r = checkSite(
    [
      filled('site/src/gateway/pages.ts', "import { getCollection } from 'astro:content';"),
      filled('site/src/pages/index.astro', 'const x = 1;'),
    ],
    CFG,
  );
  assert.deepEqual(r.findings, []);
  assert.equal(r.scanned, 2);
  assert.equal(r.dirs, 2);
});

test('RED: checkSite surfaces a finding from every property, not only the first', () => {
  const over = Array.from({ length: 7 }, (_, i) => filled(`site/src/components/c${i}.astro`, ''));
  const r = checkSite(
    [
      ...over,
      filled('site/src/pages/index.astro', "import { getCollection } from 'astro:content';"),
      filled('site/lib/content/parse.mjs', "import { z } from 'astro:content';"),
    ],
    CFG,
  );
  assert.equal(r.findings.length, 3);
});

test('one violation, one finding: a core file importing astro:content is reported once', () => {
  // It breaks two rules at once. Reporting it twice teaches people to skim the output,
  // and the core's own rule is the stricter and more specific of the two.
  const r = checkSite([{ path: 'site/lib/content/parse.mjs', text: "import { z } from 'astro:content';" }], CFG);
  assert.equal(r.findings.length, 1);
  assert.match(r.findings[0].message, /framework-free/);
});

// ── S-08 alongside the others ─────────────────────────────────────────────────

const REF = {
  externalDocumentReferences: ['docs/', '.claude/', 'resources/', 'progress/', 'scripts/', 'TASKS.md', 'CLAUDE.md'],
  recordIdPattern: String.raw`\b(?:ADR|INC|EC|EVAL|SPEC)-\d+\b|\bTASK[\s-]\d+\b|\b[HPCTGS]-\d{2}\b`,
};

test('checkSite runs the comment check alongside the other properties', () => {
  const r = checkSite([filled('site/lib/x.mjs', '// see docs/adr/README.md')], { ...CFG, ...REF });
  assert.equal(r.findings.length, 1);
});

// ── CONTENT-006 alongside the others ──────────────────────────────────────────

const ROUTE_CFG = { routeDeclarationSites: [], contentSlugs: ['otp-provider-decoupling'], locales: ['en', 'es'] };

test('checkSite composes the route-literal check alongside the others', () => {
  const r = checkSite(
    [filled('site/src/pages/index.astro', "const href = '/case-studies/otp-provider-decoupling';")],
    { ...CFG, ...ROUTE_CFG },
  );
  assert.equal(r.findings.length, 1);
  assert.match(r.findings[0].message, /otp-provider-decoupling/);
});

// ── S-05 alongside the others ──────────────────────────────────────────────────

const TOKENS_PATH = 'site/src/styles/tokens.css';
const TOKEN_CFG = { tokenStylesheet: TOKENS_PATH };

test('checkSite composes the token check alongside the others', () => {
  const r = checkSite(
    [
      filled(TOKENS_PATH, ':root {\n  --color-bg: #f8f7f4;\n}'),
      filled('site/src/components/Card.astro', '<style>.card { color: #123456; }</style>'),
    ],
    { ...CFG, ...TOKEN_CFG },
  );
  assert.equal(r.findings.length, 1);
  assert.match(r.findings[0].message, /#123456/);
});

// ── S-01 alongside the others ──────────────────────────────────────────────────

const STRINGS_CFG = {
  gateway: 'site/src/gateway',
  humanReadableAttributes: ['aria-label', 'alt', 'title', 'placeholder'],
};

test('checkSite composes the visible-string check alongside the others', () => {
  const r = checkSite([filled('site/src/components/A.astro', '---\n---\n<div>Senior Software Engineer</div>')], {
    ...CFG,
    ...STRINGS_CFG,
  });
  assert.equal(r.findings.length, 1);
  assert.match(r.findings[0].message, /Senior Software Engineer/);
});
