import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readAboutMasthead, readPhotoFigures } from './about-article.mjs';

test('readAboutMasthead omits an empty lead', () => {
  const frontmatter = {
    h1: "I'd rather design the system than run the room it lives in.",
    lead: '',
    since: '2021 in software',
    reads_as: 'INTJ-A',
  };

  const masthead = readAboutMasthead(frontmatter, 'about.en.md');

  assert.equal(Object.hasOwn(masthead, 'lead'), false);
});

test('readAboutMasthead carries a non-empty lead', () => {
  const frontmatter = {
    h1: "I'd rather design the system than run the room it lives in.",
    lead: 'Backend engineer and solution architect connecting legacy systems to modern services.',
    since: '2021 in software',
    reads_as: 'INTJ-A',
  };

  const masthead = readAboutMasthead(frontmatter, 'about.en.md');

  assert.equal(Object.hasOwn(masthead, 'lead'), true);
  assert.equal(masthead.lead, 'Backend engineer and solution architect connecting legacy systems to modern services.');
});

test('readAboutMasthead omits an absent lead', () => {
  const frontmatter = {
    h1: "I'd rather design the system than run the room it lives in.",
    since: '2021 in software',
    reads_as: 'INTJ-A',
  };

  const masthead = readAboutMasthead(frontmatter, 'about.en.md');

  assert.equal(Object.hasOwn(masthead, 'lead'), false);
});

test('readAboutMasthead throws naming the file when h1 is missing', () => {
  const frontmatter = {
    since: '2021 in software',
    reads_as: 'INTJ-A',
  };

  assert.throws(() => readAboutMasthead(frontmatter, 'about.en.md'), /about\.en\.md/);
});

test('readAboutMasthead throws naming the file when h1 is empty', () => {
  const frontmatter = {
    h1: '',
    since: '2021 in software',
    reads_as: 'INTJ-A',
  };

  assert.throws(() => readAboutMasthead(frontmatter, 'about.en.md'), /about\.en\.md/);
});

test('readPhotoFigures omits an empty caption', () => {
  const frontmatter = {
    photos: [
      {
        file: 'bolivia-landscape.jpeg',
        slot: 'pair',
        alt: 'Walking out along a spit of land toward a lake in the Bolivian highlands.',
        caption: '',
      },
    ],
  };
  const availableAssetNames = new Set(['bolivia-landscape.jpeg']);

  const { pair } = readPhotoFigures(frontmatter, availableAssetNames, 'about.en.md');

  assert.equal(Object.hasOwn(pair[0], 'caption'), false);
});

test('readPhotoFigures separates the break photo from the pair', () => {
  const frontmatter = {
    photos: [
      {
        file: 'Huayna-Potosi-landscape.jpg',
        slot: 'break',
        alt: 'Huayna Potosí seen from the altiplano.',
        caption: 'Huayna Potosí, 6,088 m.',
      },
      {
        file: 'me-profile.jpeg',
        slot: 'pair',
        alt: 'Luis Antelo, looking at the camera.',
        caption: 'Cochabamba.',
      },
      {
        file: 'bolivia-landscape.jpeg',
        slot: 'pair',
        alt: 'Walking out along a spit of land toward a lake in the Bolivian highlands.',
        caption: '',
      },
    ],
  };
  const availableAssetNames = new Set(['Huayna-Potosi-landscape.jpg', 'me-profile.jpeg', 'bolivia-landscape.jpeg']);

  const figures = readPhotoFigures(frontmatter, availableAssetNames, 'about.en.md');

  assert.equal(Object.hasOwn(figures, 'break'), true);
  assert.equal(figures.break.file, 'Huayna-Potosi-landscape.jpg');
  assert.equal(figures.pair.length, 2);
  assert.deepEqual(figures.pair.map((figure) => figure.file), ['me-profile.jpeg', 'bolivia-landscape.jpeg']);
});

test('readPhotoFigures returns an empty pair and no break key when photos is absent', () => {
  const frontmatter = {};
  const availableAssetNames = new Set();

  const figures = readPhotoFigures(frontmatter, availableAssetNames, 'about.en.md');

  assert.deepEqual(figures, { pair: [] });
  assert.equal(Object.hasOwn(figures, 'break'), false);
});

test('readPhotoFigures throws naming a file that has no asset', () => {
  const frontmatter = {
    photos: [
      {
        file: 'missing-photo.jpg',
        slot: 'pair',
        alt: 'A photo that does not exist on disk.',
        caption: '',
      },
    ],
  };
  const availableAssetNames = new Set(['me-profile.jpeg']);

  assert.throws(
    () => readPhotoFigures(frontmatter, availableAssetNames, 'about.en.md'),
    /missing-photo\.jpg/,
  );
  assert.throws(
    () => readPhotoFigures(frontmatter, availableAssetNames, 'about.en.md'),
    /about\.en\.md/,
  );
});

test('readPhotoFigures keeps the declared order within the pair', () => {
  const frontmatter = {
    photos: [
      {
        file: 'bolivia-landscape.jpeg',
        slot: 'pair',
        alt: 'Walking out along a spit of land toward a lake in the Bolivian highlands.',
        caption: '',
      },
      {
        file: 'me-profile.jpeg',
        slot: 'pair',
        alt: 'Luis Antelo, looking at the camera.',
        caption: 'Cochabamba.',
      },
    ],
  };
  const availableAssetNames = new Set(['bolivia-landscape.jpeg', 'me-profile.jpeg']);

  const { pair } = readPhotoFigures(frontmatter, availableAssetNames, 'about.en.md');

  assert.deepEqual(pair.map((figure) => figure.file), ['bolivia-landscape.jpeg', 'me-profile.jpeg']);
});

// The absence assertions above cannot distinguish a working guard from a field that is
// never carried at all, and none of them exercises the trim — a caption of three spaces
// is unwritten copy, not a caption.
test('readAboutMasthead carries since and reads_as verbatim', () => {
  const masthead = readAboutMasthead(
    { h1: 'A headline', since: '2021 in software', reads_as: 'INTJ-A' },
    'about.en.md',
  );
  assert.equal(masthead.since, '2021 in software');
  assert.equal(masthead.readsAs, 'INTJ-A');
});

test('readAboutMasthead treats a whitespace-only lead as unwritten', () => {
  const masthead = readAboutMasthead({ h1: 'A headline', lead: '   ' }, 'about.en.md');
  assert.equal(Object.hasOwn(masthead, 'lead'), false);
});

test('readAboutMasthead throws on a whitespace-only h1', () => {
  assert.throws(() => readAboutMasthead({ h1: '  ' }, 'about.en.md'), /about\.en\.md/);
});

test('readPhotoFigures carries a non-empty caption verbatim', () => {
  const frontmatter = {
    photos: [{ file: 'a.jpg', slot: 'pair', alt: 'Alt text', caption: 'A caption' }],
  };
  const { pair } = readPhotoFigures(frontmatter, new Set(['a.jpg']), 'about.en.md');
  assert.equal(Object.hasOwn(pair[0], 'caption'), true);
  assert.equal(pair[0].caption, 'A caption');
  assert.equal(pair[0].alt, 'Alt text');
  assert.equal(pair[0].file, 'a.jpg');
});

test('readPhotoFigures treats a whitespace-only caption as unwritten', () => {
  const frontmatter = { photos: [{ file: 'a.jpg', slot: 'pair', alt: 'Alt', caption: '  ' }] };
  const { pair } = readPhotoFigures(frontmatter, new Set(['a.jpg']), 'about.en.md');
  assert.equal(Object.hasOwn(pair[0], 'caption'), false);
});

