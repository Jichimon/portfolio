import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkVisibleStringLiteralsComeFromTheGateway } from './visible-strings.mjs';

const filled = (path, text) => ({ path, text });

// ── S-01 · every visible string comes from the gateway ───────────────────────
// A .astro file outside the gateway may hand a prop or a gateway value to a text
// node or a human-readable attribute, but it may not DECLARE the string itself —
// as a literal in the markup, or as a local frontmatter constant wearing an
// identifier's name. humanReadableAttributes is config, never a list in the
// check itself (P-13): the last test in this section proves that by changing it.

const STRINGS_CFG = {
  gateway: 'site/src/gateway',
  humanReadableAttributes: ['aria-label', 'alt', 'title', 'placeholder'],
};

test('RED: a literal in a text node is a finding', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [filled('site/src/components/rail/Rail.astro', '---\n---\n<div class="site-rail__role">Senior Software Engineer</div>')],
    STRINGS_CFG,
  );
  assert.equal(r.length, 1);
  assert.match(r[0].message, /Senior Software Engineer/);
  assert.equal(r[0].file, 'site/src/components/rail/Rail.astro');
});

test('the same string rendered from an expression is not a finding', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [
      filled(
        'site/src/components/rail/Rail.astro',
        '---\nconst { role } = Astro.props;\n---\n<div class="site-rail__role">{role}</div>',
      ),
    ],
    STRINGS_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: a literal in each of the four human-readable attributes is a finding', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [
      filled('site/src/components/A.astro', '---\n---\n<button aria-label="Language" />'),
      filled('site/src/components/B.astro', '---\n---\n<img alt="A portrait of the author" />'),
      filled('site/src/components/C.astro', '---\n---\n<span title="Copied to clipboard" />'),
      filled('site/src/components/D.astro', '---\n---\n<input placeholder="Search the site" />'),
    ],
    STRINGS_CFG,
  );
  assert.equal(r.length, 4);
  assert.deepEqual(
    r.map((f) => f.value).sort(),
    ['A portrait of the author', 'Copied to clipboard', 'Language', 'Search the site'].sort(),
  );
});

test('an attribute whose value is an expression is not a finding', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [
      filled(
        'site/src/components/rail/LanguageSwitcher.astro',
        '---\nconst { groupLabel } = Astro.props;\n---\n<div role="group" aria-label={groupLabel} />',
      ),
    ],
    STRINGS_CFG,
  );
  assert.deepEqual(r, []);
});

test('punctuation only, and an HTML entity, are not findings', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [
      filled('site/src/components/rail/LanguageSwitcher.astro', '---\n---\n<span aria-hidden="true">/</span>'),
      filled('site/src/components/Footer.astro', '---\n---\n<span>&middot;</span>'),
    ],
    STRINGS_CFG,
  );
  assert.deepEqual(r, []);
});

test('a literal inside a <style> block is not a finding', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [filled('site/src/components/Card.astro', "---\n---\n<div />\n<style>.card::before { content: 'Read more'; }</style>")],
    STRINGS_CFG,
  );
  assert.deepEqual(r, []);
});

test('a literal inside the frontmatter fence, never rendered, is not a finding', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [filled('site/src/components/Unused.astro', "---\nconst UNUSED_NAME = 'Never Rendered';\n---\n<div />")],
    STRINGS_CFG,
  );
  assert.deepEqual(r, []);
});

test('the same literal inside the gateway is not a finding', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [filled('site/src/gateway/Debug.astro', '---\n---\n<div class="debug">Senior Software Engineer</div>')],
    STRINGS_CFG,
  );
  assert.deepEqual(r, []);
});

test('a non-.astro file is out of scope entirely, even one full of letters', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [filled('site/src/gateway/content-queries.ts', "const GREETING = 'Hello there, this has letters too';")],
    STRINGS_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: a bare identifier bound in frontmatter to a quoted literal is a finding when rendered — the wordmark case', () => {
  // This is the mechanism SHELL-008 exists to catch: a value relocated one line
  // up into a named constant is still a literal, and "it is an expression" alone
  // cannot excuse it. Modelled directly on site/src/components/rail/Rail.astro.
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [
      filled(
        'site/src/components/rail/Rail.astro',
        "---\nconst SITE_IDENTITY_NAME = 'Luis Antelo';\n---\n" +
          '<div class="site-rail__wordmark"><a href={homeHref}>{SITE_IDENTITY_NAME}</a></div>',
      ),
    ],
    STRINGS_CFG,
  );
  assert.equal(r.length, 1);
  assert.match(r[0].message, /Luis Antelo/);
});

test('a computed member expression drawing on a frontmatter object is not a finding — a locale code is data', () => {
  // LOCALE_CODE[lang] is not a bare identifier, so it is left alone even though
  // LOCALE_CODE itself is declared in frontmatter and its values carry letters.
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [
      filled(
        'site/src/components/rail/LanguageSwitcher.astro',
        "---\nconst LOCALE_CODE = { en: 'EN', es: 'ES' };\nconst lang = 'en';\n---\n" +
          '<span>{LOCALE_CODE[lang]}</span>',
      ),
    ],
    STRINGS_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: a string literal spelled directly inside the braces is a finding too, with one fewer step of indirection', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [filled('site/src/components/A.astro', "---\n---\n<div>{'Senior Software Engineer'}</div>")],
    STRINGS_CFG,
  );
  assert.equal(r.length, 1);
  assert.match(r[0].message, /Senior Software Engineer/);
});

test('the attribute set is derived from config, not hardcoded — an attribute outside it does not fire until config adds it', () => {
  const fixture = [filled('site/src/components/A.astro', '---\n---\n<div data-tooltip="Click to expand" />')];

  const notYetTracked = checkVisibleStringLiteralsComeFromTheGateway(fixture, STRINGS_CFG);
  assert.deepEqual(notYetTracked, []);

  const nowTracked = checkVisibleStringLiteralsComeFromTheGateway(fixture, {
    ...STRINGS_CFG,
    humanReadableAttributes: [...STRINGS_CFG.humanReadableAttributes, 'data-tooltip'],
  });
  assert.equal(nowTracked.length, 1);
  assert.match(nowTracked[0].message, /Click to expand/);
});

test('humanReadableAttributes absent from cfg means the property was not asked for — a quiet pass, not a false one', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [filled('site/src/components/A.astro', '---\n---\n<div>Senior Software Engineer</div>')],
    { gateway: 'site/src/gateway' },
  );
  assert.deepEqual(r, []);
});

test('RED: gateway missing while humanReadableAttributes is present denies rather than scanning the gateway itself', () => {
  assert.throws(
    () =>
      checkVisibleStringLiteralsComeFromTheGateway(
        [filled('site/src/components/A.astro', '---\n---\n<div>Senior Software Engineer</div>')],
        { humanReadableAttributes: STRINGS_CFG.humanReadableAttributes },
      ),
    /gateway/,
  );
});
