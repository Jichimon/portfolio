import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertEveryAssetIsReferenced } from './published-photos.mjs';

test('accepts a directory where every asset is referenced', () => {
  const assetNames = ['team-offsite.jpg', 'conference-talk.jpeg'];
  const photoEntriesByLocale = [
    [{ file: 'team-offsite.jpg' }, { file: 'conference-talk.jpeg' }],
  ];

  assert.doesNotThrow(() => assertEveryAssetIsReferenced(assetNames, photoEntriesByLocale));
});

test('throws naming the unreferenced file', () => {
  const assetNames = ['team-offsite.jpg', 'withheld-photo.jpg'];
  const photoEntriesByLocale = [[{ file: 'team-offsite.jpg' }]];

  assert.throws(
    () => assertEveryAssetIsReferenced(assetNames, photoEntriesByLocale),
    /withheld-photo\.jpg/,
  );
});

test('names every unreferenced file, not only the first', () => {
  const assetNames = ['withheld-one.jpg', 'team-offsite.jpg', 'withheld-two.jpg'];
  const photoEntriesByLocale = [[{ file: 'team-offsite.jpg' }]];

  assert.throws(
    () => assertEveryAssetIsReferenced(assetNames, photoEntriesByLocale),
    (error) => error.message.includes('withheld-one.jpg') && error.message.includes('withheld-two.jpg'),
  );
});

test('accepts an asset referenced by one locale only', () => {
  const assetNames = ['spanish-only-photo.jpg'];
  const photoEntriesByLocale = [
    [],
    [{ file: 'spanish-only-photo.jpg' }],
  ];

  assert.doesNotThrow(() => assertEveryAssetIsReferenced(assetNames, photoEntriesByLocale));
});

test('accepts an empty directory', () => {
  const assetNames = [];
  const photoEntriesByLocale = [[{ file: 'team-offsite.jpg' }], []];

  assert.doesNotThrow(() => assertEveryAssetIsReferenced(assetNames, photoEntriesByLocale));
});

test('throws when the content references nothing and the directory is not empty', () => {
  const assetNames = ['team-offsite.jpg'];
  const photoEntriesByLocale = [[], []];

  assert.throws(
    () => assertEveryAssetIsReferenced(assetNames, photoEntriesByLocale),
    /team-offsite\.jpg/,
  );
});

test('ignores a referenced name that has no matching asset', () => {
  const assetNames = ['team-offsite.jpg'];
  const photoEntriesByLocale = [[{ file: 'team-offsite.jpg' }, { file: 'never-uploaded.jpg' }]];

  assert.doesNotThrow(() => assertEveryAssetIsReferenced(assetNames, photoEntriesByLocale));
});

// A thrown error whose message names the files but not the problem leaves whoever hits
// it guessing which direction the check runs in.
test('the error explains what is wrong, not only which files', () => {
  assert.throws(
    () => assertEveryAssetIsReferenced(['stray.jpg'], [[]]),
    (error) => /not referenced/.test(error.message) && /stray\.jpg/.test(error.message),
  );
});

