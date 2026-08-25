import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localizeInternalHref } from './internal-link-localizer.mjs';

test('prefixes an internal href for the non-default locale', () => {
  assert.equal(localizeInternalHref('/case-studies/sample-invented-slug', 'es'), '/es/case-studies/sample-invented-slug');
});

test('returns the href unchanged for the default locale', () => {
  assert.equal(localizeInternalHref('/case-studies/sample-invented-slug', 'en'), '/case-studies/sample-invented-slug');
});

test('does not double-prefix an already-localized href', () => {
  assert.equal(localizeInternalHref('/es/case-studies/sample-invented-slug', 'es'), '/es/case-studies/sample-invented-slug');
});

test('leaves a fragment, an external URL and a mailto untouched', () => {
  assert.equal(localizeInternalHref('#work', 'es'), '#work');
  assert.equal(localizeInternalHref('http://example.com/x', 'es'), 'http://example.com/x');
  assert.equal(localizeInternalHref('https://example.com/x', 'es'), 'https://example.com/x');
  assert.equal(localizeInternalHref('//example.com/x', 'es'), '//example.com/x');
  assert.equal(localizeInternalHref('mailto:someone@example.com', 'es'), 'mailto:someone@example.com');
});

test('prefixes the root href for the non-default locale', () => {
  assert.equal(localizeInternalHref('/', 'es'), '/es/');
});
