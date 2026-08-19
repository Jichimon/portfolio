// C-09 and C-14's battery. Both rules claimed rung 2 with no guard behind them until step
// 12's acceptance run found the false claim, so these tests are the first evidence either
// rule has ever had.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { localeOf, pairKey, parseFrontmatter, checkParity, checkFrontmatter, validateExemptions } from './content.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const CFG = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8')).content;

const fm = (o) => ({ keys: Object.keys(o), values: o });
const page = (path, o) => ({ path, frontmatter: o ? fm(o) : null });
const msgs = (f) => f.map((x) => x.message).join(' | ');

// --- parsing -----------------------------------------------------------------------------

test('localeOf and pairKey split a filename into its join key and locale', () => {
  assert.equal(localeOf('resources/site/home.en.md'), 'en');
  assert.equal(localeOf('resources/site/home.es.md'), 'es');
  assert.equal(localeOf('resources/github/profile-README.md'), null);
  assert.equal(pairKey('resources/site/home.en.md'), 'resources/site/home');
  assert.equal(pairKey('resources/site/home.md'), 'resources/site/home');
});

test('parseFrontmatter returns null when there is none, which differs from empty', () => {
  assert.equal(parseFrontmatter('# just a heading\n'), null);
  assert.deepEqual(parseFrontmatter('---\nslug: x\n---\nbody').keys, ['slug']);
});

test('parseFrontmatter unquotes scalars and keeps key order', () => {
  const p = parseFrontmatter('---\nslug: home\ntitle: "A quoted title"\nlang: en\n---\n');
  assert.deepEqual(p.keys, ['slug', 'title', 'lang']);
  assert.equal(p.values.title, 'A quoted title');
});

// --- C-09 parity -------------------------------------------------------------------------

test('green path: a complete pair passes', () => {
  const files = [page('a/home.en.md', { slug: 'home' }), page('a/home.es.md', { slug: 'home' })];
  assert.deepEqual(checkParity(files, CFG), []);
});

test('RED: an English page with no Spanish counterpart is caught', () => {
  const f = checkParity([page('a/home.en.md', { slug: 'home' })], CFG);
  assert.match(msgs(f), /no es counterpart/);
});

test('RED: a Spanish page with no English counterpart is caught — both directions', () => {
  const f = checkParity([page('a/home.es.md', { slug: 'home' })], CFG);
  assert.match(msgs(f), /no en counterpart/);
});

test('RED: a pair whose locales declare DIFFERENT slugs is caught', () => {
  // Worse than a missing counterpart: it looks correct in a directory listing, and the slug
  // is the join key, so the pair silently cannot be joined.
  const files = [page('a/home.en.md', { slug: 'home' }), page('a/home.es.md', { slug: 'inicio' })];
  assert.match(msgs(checkParity(files, CFG)), /different slugs/);
});

test('a file with no locale suffix claims no locale and is not paired', () => {
  assert.deepEqual(checkParity([page('a/profile-README.md', { slug: 'x' })], CFG), []);
});

test('RED: parity is checked as a property of the pair, not as a count', () => {
  // Two English and two Spanish files that pair with nothing would satisfy any count-based
  // check, which is why this one keys on the pair.
  const files = [page('a/one.en.md', {}), page('a/two.en.md', {}), page('b/three.es.md', {}), page('b/four.es.md', {})];
  assert.equal(checkParity(files, CFG).length, 4);
});

// --- C-14 frontmatter --------------------------------------------------------------------

const UNIVERSAL = { slug: 'x', lang: 'en', type: 'page', title: 't', confidentiality: 'sanitized' };

test('green path: a page carrying the universal keys passes', () => {
  assert.deepEqual(checkFrontmatter([page('a/x.en.md', UNIVERSAL)], CFG), []);
});

test('RED: a missing universal key is caught', () => {
  const { confidentiality, ...rest } = UNIVERSAL;
  assert.match(msgs(checkFrontmatter([page('a/x.en.md', rest)], CFG)), /confidentiality/);
});

test('RED: required keys are keyed on the declared type, so a case-study needs more', () => {
  // The defect in C-14 as originally written: one flat list, applied to every file, matching
  // no file in the repository. A page needs five keys; a case-study needs twelve.
  const f = checkFrontmatter([page('a/x.en.md', { ...UNIVERSAL, type: 'case-study' })], CFG);
  assert.match(msgs(f), /case-study.*requires/);
  assert.match(msgs(f), /stack/);
});

test('RED: an unknown type is reported rather than waved through', () => {
  const f = checkFrontmatter([page('a/x.en.md', { ...UNIVERSAL, type: 'zine' })], CFG);
  assert.match(msgs(f), /no required-key set/);
});

test('RED: lang disagreeing with the filename is caught', () => {
  const f = checkFrontmatter([page('a/x.es.md', { ...UNIVERSAL, slug: 'x', lang: 'en' })], CFG);
  assert.match(msgs(f), /filename says \.es\.md/);
});

test('RED: a slug disagreeing with the filename is caught', () => {
  const f = checkFrontmatter([page('a/home.en.md', { ...UNIVERSAL, slug: 'inicio' })], CFG);
  assert.match(msgs(f), /disagrees with the filename/);
});

test('RED: a file with no frontmatter is caught unless exempted with a reason', () => {
  assert.match(msgs(checkFrontmatter([page('a/x.en.md', null)], CFG)), /no frontmatter/);
});

test('RED: a reasonless exemption is itself a finding', () => {
  const cfg = { noFrontmatter: [{ path: 'a/x.md' }] };
  assert.match(msgs(validateExemptions([page('a/x.md', null)], cfg)), /no reason recorded/);
});

test('RED: an exemption whose file no longer exists is reported stale', () => {
  const cfg = { noFrontmatter: [{ path: 'gone.md', reason: 'r' }] };
  assert.match(msgs(validateExemptions([], cfg)), /stale exemption/);
});

test('exemption validity is judged against the whole tree, not a caller subset', () => {
  // The defect this split fixed: folding these checks into checkFrontmatter made every
  // fixture-sized call report the real config's exemptions as stale, because a two-file
  // fixture contains neither of them. A check whose verdict depends on how much of the
  // world the caller happened to pass is a check that will be wrong somewhere.
  assert.deepEqual(checkFrontmatter([page('a/x.en.md', UNIVERSAL)], CFG), []);
});

// --- liveness: the real content ------------------------------------------------------------

function realFiles() {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md')) {
        const rel = p.slice(ROOT.length + 1).split('\\').join('/');
        out.push({ path: rel, frontmatter: parseFrontmatter(readFileSync(p, 'utf8')) });
      }
    }
  };
  walk(join(ROOT, 'resources'));
  return out;
}

test('LIVENESS: the real published content satisfies both rules', () => {
  const files = realFiles();
  assert.ok(files.length > 15, `expected the real content, found ${files.length} files`);
  assert.deepEqual(checkParity(files, CFG), []);
  assert.deepEqual(checkFrontmatter(files, CFG), []);
});

test('LIVENESS: the required-key sets describe content that actually exists', () => {
  // C-14 named `outcome` as required for everything; two case studies do not carry it, and
  // resources/ is read-only. A rule that no file satisfies is a rule that gets disbelieved,
  // so this asserts every configured key is present in at least one real file of that type.
  const files = realFiles().filter((f) => f.frontmatter);
  for (const [type, keys] of Object.entries(CFG.byType ?? {})) {
    const ofType = files.filter((f) => f.frontmatter.values.type === type);
    assert.ok(ofType.length > 0, `type "${type}" is configured but no file declares it`);
    for (const k of keys) {
      assert.ok(ofType.some((f) => f.frontmatter.keys.includes(k)),
        `type "${type}" requires "${k}", which no real file of that type carries`);
    }
  }
});
