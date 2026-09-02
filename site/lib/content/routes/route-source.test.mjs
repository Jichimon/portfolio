import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readFrontmatterEntry, readLocalizedMarkdownEntries, readPageEntries } from './route-source.mjs';

// A real directory rather than a mocked fs: these two functions exist to read the content
// tree, and a test that stubs the reading proves the parsing and nothing else. The tree is
// tiny, so the cost is a few milliseconds.
function withContentDir(files, run) {
  const dir = mkdtempSync(join(tmpdir(), 'route-source-'));
  try {
    for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const page = (slug, lang, type = 'page') =>
  `---\nslug: ${slug}\nlang: ${lang}\ntype: ${type}\ntitle: A title\nconfidentiality: public\n---\n\nBody.\n`;

test('reads a locale-suffixed markdown pair', () => {
  withContentDir({ 'about.en.md': page('about', 'en'), 'about.es.md': page('about', 'es') }, (dir) => {
    const entries = readLocalizedMarkdownEntries(dir);
    assert.equal(entries.length, 2);
    assert.deepEqual(
      entries.map((e) => `${e.data.slug}.${e.data.lang}`).sort(),
      ['about.en', 'about.es'],
    );
  });
});

test('ignores a file whose name carries no locale suffix', () => {
  // The loaders match `<stem>.<lang>.md` and nothing else. A README or a draft dropped in
  // the content directory must not become a route.
  withContentDir({ 'about.en.md': page('about', 'en'), 'notes.md': page('notes', 'en') }, (dir) => {
    assert.deepEqual(readLocalizedMarkdownEntries(dir).map((e) => e.data.slug), ['about']);
  });
});

test('excludes the named stem from the page loader', () => {
  // content.config.ts declares two loaders over the same directory and excludes the
  // interface-strings file from the page one by name. A verifier that forgot this would
  // demand a /ui route that does not and must not exist.
  withContentDir(
    { 'home.en.md': page('home', 'en'), 'ui.en.md': page('ui', 'en'), 'ui.es.md': page('ui', 'es') },
    (dir) => {
      assert.deepEqual(readLocalizedMarkdownEntries(dir, 'ui').map((e) => e.data.slug), ['home']);
    },
  );
});

test('a filename with anything after the .md is ignored', () => {
  // The matcher is anchored at BOTH ends. Without the trailing anchor an editor backup or a
  // merge artefact — `about.en.md.bak`, `about.en.md.orig` — becomes a route the site does
  // not serve, and the verifier then fails a perfectly good deploy. Found by mutation: the
  // unanchored form survived, because nothing in the tree happens to be named that way.
  withContentDir(
    { 'about.en.md': page('about', 'en'), 'about.en.md.bak': page('about', 'en') },
    (dir) => {
      assert.deepEqual(readLocalizedMarkdownEntries(dir).map((e) => e.data.slug), ['about']);
    },
  );
});

test('a body containing --- is not mistaken for frontmatter', () => {
  // The frontmatter matcher is anchored at the START of the file. Unanchored, a horizontal
  // rule or a fenced block in the prose of a file that HAS no frontmatter would parse as one,
  // and the entry would carry whatever happened to sit between two dashes.
  const strayRule = ['Some prose.', '', '---', 'not: frontmatter', '---', '', 'More.', ''].join('\n');
  withContentDir({ 'broken.en.md': strayRule }, (dir) => {
    assert.throws(() => readLocalizedMarkdownEntries(dir), /broken\.en\.md/);
  });
});

test('an exclude stem that matches nothing removes nothing', () => {
  withContentDir({ 'home.en.md': page('home', 'en') }, (dir) => {
    assert.equal(readLocalizedMarkdownEntries(dir, 'nothing-by-this-name').length, 1);
  });
});

test('throws naming the file when frontmatter is absent', () => {
  // Loudly, with the path in the message. A file with no frontmatter silently yielding an
  // entry with undefined slug and lang is how a route disappears from the set without
  // anything reporting it. The collection hit exactly this once, at the loader level.
  withContentDir({ 'broken.en.md': 'No frontmatter here.\n' }, (dir) => {
    assert.throws(() => readLocalizedMarkdownEntries(dir), /broken\.en\.md/);
  });
});

test('reads frontmatter written with CRLF line endings', () => {
  // This repository is developed on Windows and its CI runs on Linux. A frontmatter matcher
  // anchored on \n alone reads every file on one of them and no file on the other.
  withContentDir({ 'home.en.md': '---\r\nslug: home\r\nlang: en\r\n---\r\n\r\nBody.\r\n' }, (dir) => {
    assert.equal(readFrontmatterEntry(join(dir, 'home.en.md')).data.slug, 'home');
  });
});

test('an empty content directory yields no entries rather than throwing', () => {
  // The caller decides whether zero routes is a defect; this function only reports what is
  // on disk. deploy-verify.mjs is the one that treats an empty set as a finding.
  withContentDir({}, (dir) => {
    assert.deepEqual(readLocalizedMarkdownEntries(dir), []);
  });
});

// The page loader's exclusion was a stem roster carrying one name, `ui`. A second data file
// in the same directory made it wrong without making it fail, which is the failure a roster
// always has: item two is waved through. These pin the property instead.
test('readPageEntries keeps every entry declaring type page', () => {
  withContentDir(
    { 'home.en.md': page('home', 'en'), 'about.en.md': page('about', 'en') },
    (dir) => {
      assert.deepEqual(readPageEntries(dir).map((e) => e.data.slug).sort(), ['about', 'home']);
    },
  );
});

test('readPageEntries drops the interface-strings file without being told its name', () => {
  withContentDir(
    { 'home.en.md': page('home', 'en'), 'ui.en.md': page('ui', 'en', 'ui') },
    (dir) => {
      assert.deepEqual(readPageEntries(dir).map((e) => e.data.slug), ['home']);
    },
  );
});

test('readPageEntries drops a data file whose type nobody has seen before', () => {
  withContentDir(
    { 'home.en.md': page('home', 'en'), 'testimonials.en.md': page('testimonials', 'en', 'testimonials') },
    (dir) => {
      assert.deepEqual(readPageEntries(dir).map((e) => e.data.slug), ['home']);
    },
  );
});

test('readPageEntries returns nothing when the directory holds no page at all', () => {
  withContentDir({ 'ui.en.md': page('ui', 'en', 'ui') }, (dir) => {
    assert.deepEqual(readPageEntries(dir), []);
  });
});
