import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRouteLiteralsAreDerived } from './route-literals.mjs';

const filled = (path, text) => ({ path, text });

// ── CONTENT-006 · a route literal naming a real slug lives only in its declaration site ──
// The slug set is DERIVED from disk by the CLI (P-13) and handed in here as plain data —
// this function reads nothing and knows no slug by name, which is what lets it be tested
// against an invented slug set instead of the real one.

const ROUTE_CFG = { routeDeclarationSites: [], contentSlugs: ['otp-provider-decoupling'], locales: ['en', 'es'] };

test('RED: a route literal naming a real slug in a page is a finding', () => {
  const r = checkRouteLiteralsAreDerived(
    [filled('site/src/pages/case-study.astro', "const href = '/case-studies/otp-provider-decoupling';")],
    ROUTE_CFG,
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].file, 'site/src/pages/case-study.astro');
  assert.equal(r[0].line, 1);
  assert.match(r[0].message, /otp-provider-decoupling/);
});

test('RED: the same literal in a test file is a finding too — a test hardcoding the route set is the same defect', () => {
  const r = checkRouteLiteralsAreDerived(
    [filled('site/src/pages/case-study.test.mjs', "assert.equal(href, '/case-studies/otp-provider-decoupling');")],
    ROUTE_CFG,
  );
  assert.equal(r.length, 1);
});

test('the same literal inside a declared route-declaration site produces no finding', () => {
  const cfg = { ...ROUTE_CFG, routeDeclarationSites: ['site/lib/content/routes'] };
  const r = checkRouteLiteralsAreDerived(
    [filled('site/lib/content/routes/route-set.mjs', "const path = '/case-studies/otp-provider-decoupling';")],
    cfg,
  );
  assert.deepEqual(r, []);
});

test('a bare slug with no leading slash is not path-shaped and is not a finding', () => {
  // site/src/gateway/content-queries.ts legitimately holds ['home', 'about', 'experience']
  // as the declared page structure — slugs, not routes.
  const r = checkRouteLiteralsAreDerived(
    [filled('site/src/gateway/content-queries.ts', "const ROUTED_PAGE_SLUGS = ['otp-provider-decoupling'];")],
    ROUTE_CFG,
  );
  assert.deepEqual(r, []);
});

test('a path literal naming a slug the content does not have is a test fixture, not a finding', () => {
  const r = checkRouteLiteralsAreDerived(
    [filled('site/lib/content/routes/route-set.test.mjs', "assert.equal(path, '/case-studies/sample-migration-story');")],
    ROUTE_CFG,
  );
  assert.deepEqual(r, []);
});

test('a template literal built from an interpolated slug is the derivation doing its job, not a finding', () => {
  // contentSlugs deliberately includes 'case-studies' — the static prefix — so a
  // check that failed to notice the ${} interpolation and treated the whole thing
  // as a static literal would still find something to flag. Only the exemption
  // stops it, which is what this proves rather than assumes.
  const cfg = { ...ROUTE_CFG, contentSlugs: ['case-studies', 'otp-provider-decoupling'] };
  const r = checkRouteLiteralsAreDerived(
    [filled('site/lib/content/routes/route-set.mjs', 'const path = `/case-studies/${slug}`;')],
    cfg,
  );
  assert.deepEqual(r, []);
});

test('a locale prefix segment on its own is not a slug, even if it were also a content slug', () => {
  // 'es' is structurally a locale prefix in leading position, never a slug reference,
  // regardless of what the derived slug set happens to contain. Proven with 'es' IN
  // contentSlugs so the assertion is meaningful rather than trivially true.
  const cfg = { ...ROUTE_CFG, contentSlugs: ['es', 'otp-provider-decoupling'] };
  const r = checkRouteLiteralsAreDerived([filled('site/src/pages/index.astro', "const p = '/es';")], cfg);
  assert.deepEqual(r, []);
});

test('the locale prefix is stripped before matching, so a prefixed real route still fires', () => {
  const r = checkRouteLiteralsAreDerived(
    [filled('site/src/pages/index.astro', "const href = '/es/case-studies/otp-provider-decoupling';")],
    ROUTE_CFG,
  );
  assert.equal(r.length, 1);
});

test('a literal inside a comment is prose, not a route (S-08 sibling problem)', () => {
  const r = checkRouteLiteralsAreDerived(
    [filled('site/src/pages/index.astro', "// see '/case-studies/otp-provider-decoupling' for the old shape\nconst x = 1;")],
    ROUTE_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: derives from whatever slug set it is given — no roster is hardcoded in the check itself', () => {
  // The check treats contentSlugs as opaque input data. The real derivation reads the
  // filenames under resources/ and runs in the CLI (check-site.mjs); this proves the
  // half that lives here — a sixth case study needs no edit to this file — by growing
  // the slug set between two calls with zero change to checkRouteLiteralsAreDerived.
  const file = filled('site/src/pages/index.astro', "const href = '/case-studies/newly-added-case-study';");
  const beforeItsSlugExisted = checkRouteLiteralsAreDerived([file], { ...ROUTE_CFG, contentSlugs: ['otp-provider-decoupling'] });
  assert.deepEqual(beforeItsSlugExisted, []);

  const afterItsSlugExisted = checkRouteLiteralsAreDerived(
    [file],
    { ...ROUTE_CFG, contentSlugs: ['otp-provider-decoupling', 'newly-added-case-study'] },
  );
  assert.equal(afterItsSlugExisted.length, 1);
  assert.match(afterItsSlugExisted[0].message, /newly-added-case-study/);
});
