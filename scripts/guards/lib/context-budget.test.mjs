import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAlwaysLoaded, countLines, checkBudget } from './context-budget.mjs';

const withPaths = '---\npaths:\n  - "src/**"\n---\n\n# scoped\n';
const noFrontmatter = '# always\n\nbody\n';
const otherFrontmatter = '---\ntitle: x\n---\n\n# always\n';

test('a file with paths: frontmatter is not always-loaded', () => {
  assert.equal(isAlwaysLoaded(withPaths), false);
});

test('a file with no frontmatter is always-loaded', () => {
  assert.equal(isAlwaysLoaded(noFrontmatter), true);
});

test('frontmatter without paths: is still always-loaded', () => {
  // The discriminator is `paths:`, not the presence of frontmatter.
  assert.equal(isAlwaysLoaded(otherFrontmatter), true);
});

test('green path: under budget produces no findings', () => {
  const r = checkBudget([{ path: 'a.md', text: 'x\ny\n' }], { maxLines: 10 });
  assert.deepEqual(r.findings, []);
  assert.equal(r.total, 3);
});

test('RED: over budget is caught and names the largest contributor', () => {
  const files = [
    { path: 'big.md', text: 'x\n'.repeat(50) },
    { path: 'small.md', text: 'y\n'.repeat(5) },
  ];
  const r = checkBudget(files, { maxLines: 20 });
  assert.equal(r.findings.length, 1);
  assert.match(r.findings[0].message, /over the 20-line budget/);
  assert.equal(r.findings[0].largest.path, 'big.md');
});

test('RED: a path-scoped file must NOT count toward the budget', () => {
  // The whole point of path-scoping is to buy budget back. If it still counted,
  // scoping would be pure ceremony.
  const files = [
    { path: 'scoped.md', text: withPaths + 'z\n'.repeat(100) },
    { path: 'loaded.md', text: 'y\n'.repeat(5) },
  ];
  const r = checkBudget(files, { maxLines: 20 });
  assert.deepEqual(r.findings, []);
  assert.equal(r.deferred.length, 1);
  assert.equal(r.deferred[0].path, 'scoped.md');
});

test('the adapter counts even though it has no frontmatter convention', () => {
  const r = checkBudget([{ path: 'CLAUDE.md', text: 'a\n'.repeat(30), adapter: true }], { maxLines: 10 });
  assert.equal(r.findings.length, 1);
});
