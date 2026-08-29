// TASK 63's battery. Relocated out of docs/design/canvas/verify.mjs, which carried ZERO
// test coverage — it sat outside both the guard-test glob and Stryker's mutate glob, so a
// test written beside it ran under nothing. The first five checks (slice C1) derive what
// they assert from the artifact itself (P-13); the remaining four (slice C2, below) hardcode
// literals specific to the CURRENT design version — CSS breakpoints, chrome class names, a
// copy-counting vocabulary — so those four take their literals from a config fixture instead
// of the real guards.config.json, proving the check reads config rather than a hardcoded
// value.
//
// Fixtures are small, in-memory strings/objects — never the real src/ files — so the
// battery is fast and independent of the actual design content (P-14).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stripComments,
  checkRegistration,
  checkDerivedScreens,
  checkAnchors,
  checkLocaleHygiene,
  checkSpecAgreement,
  checkResponsiveContract,
  checkPageChrome,
  checkGrowingCounts,
  checkSwitcherCurrentLocale,
} from './canvas.mjs';

const msgs = (fails) => fails.join(' | ');

// --- stripComments -------------------------------------------------------------------

test('stripComments removes an HTML comment block, including its content', () => {
  assert.equal(stripComments('before<!-- hidden text -->after'), 'before after');
});

test('stripComments removes a multi-line comment block', () => {
  assert.equal(stripComments('a<!--\n  line one\n  line two\n-->b'), 'a b');
});

test('stripComments leaves text with no comments unchanged', () => {
  assert.equal(stripComments('<p>plain text</p>'), '<p>plain text</p>');
});

// --- section 1: registration is bidirectional -----------------------------------------

test('green: a file registered in both canvas.json and local-preview.mjs passes', () => {
  const files = ['Main.dc.html'];
  const artboards = [{ file: 'Main.dc.html', page: 'screens' }];
  const preview = 'artboards = [{ file: "Main.dc.html" }]';
  assert.deepEqual(checkRegistration(files, artboards, preview), []);
});

test('RED: a file in src/ but registered nowhere is caught in both directions', () => {
  const fails = checkRegistration(['Orphan.dc.html'], [], '');
  assert.match(msgs(fails), /Orphan\.dc\.html: in src\/ but not in canvas\.json/);
  assert.match(msgs(fails), /Orphan\.dc\.html: in src\/ but not in local-preview\.mjs/);
});

test('RED: canvas.json names a file that does not exist in src/', () => {
  const fails = checkRegistration([], [{ file: 'Ghost.dc.html', page: 'screens' }], '"Ghost.dc.html"');
  assert.match(msgs(fails), /Ghost\.dc\.html: in canvas\.json but not in src\//);
});

// --- section 2c: a derived screen must match derive()'s current output -----------------

test('green: the checked-in copy matches what derive() produces', () => {
  const derived = { 'HomeES.dc.html': '<p>hola</p>' };
  const actual = { 'HomeES.dc.html': '<p>hola</p>' };
  assert.deepEqual(checkDerivedScreens(derived, actual), []);
});

test('RED: a hand-edited derived screen has drifted from derive.mjs output', () => {
  const derived = { 'HomeES.dc.html': '<p>hola</p>' };
  const actual = { 'HomeES.dc.html': '<p>hola editado a mano</p>' };
  const fails = checkDerivedScreens(derived, actual);
  assert.match(msgs(fails), /HomeES\.dc\.html: differs from derive\.mjs output — run: node docs\/design\/canvas\/derive\.mjs/);
});

// --- section 3: every in-page anchor resolves -------------------------------------------

test('green: every href="#id" points at an id in the same file', () => {
  const s = '<section id="work">Work</section><a href="#work">Go to work</a>';
  assert.deepEqual(checkAnchors({ 'Main.dc.html': s }), []);
});

test('RED: a dangling anchor is caught — the real defect class (four home tiles linking to #experience, which does not exist on home)', () => {
  const s = '<section id="work">Work</section><a class="tile" href="#experience">Case study</a>';
  const fails = checkAnchors({ 'Main.dc.html': s });
  assert.match(msgs(fails), /Main\.dc\.html: href="#experience" points at no id in this file/);
});

test('a commented-out section containing a dangling anchor reference does not trip the check', () => {
  const s = '<section id="work"></section><!-- <a class="tile" href="#experience">Case study</a> -->';
  assert.deepEqual(checkAnchors({ 'Main.dc.html': s }), []);
});

// --- section 4: locale hygiene ------------------------------------------------------------

const SWITCHER = '<div class="lang"><a href="/" hreflang="en" lang="en">EN</a><span class="cur" lang="es" aria-current="true">ES</span></div>';

test('green: an ES screen links only within /es/, plus the switcher\'s own EN target', () => {
  const s = `<div class="wordmark"><a href="/es/">Luis Antelo</a></div><a href="/es/about">About</a>${SWITCHER}`;
  assert.deepEqual(checkLocaleHygiene({ 'HomeES.dc.html': s }), []);
});

test('RED: the real defect — the Spanish home\'s wordmark still points at the English home', () => {
  const s = `<div class="wordmark"><a href="/">Luis Antelo</a></div>${SWITCHER}`;
  const fails = checkLocaleHygiene({ 'HomeES.dc.html': s });
  assert.equal(fails.length, 1);
  assert.match(fails[0], /HomeES\.dc\.html: links to \/, which is the English route/);
});

test('RED: any other unprefixed route on an ES screen is caught, not only the wordmark', () => {
  const s = `<a href="/experience">Experience</a>${SWITCHER}`;
  const fails = checkLocaleHygiene({ 'HomeES.dc.html': s });
  assert.match(msgs(fails), /HomeES\.dc\.html: links to \/experience, which is the English route/);
});

// --- section 7: src/ and the design brief agree on the artboard set, both directions ------

test('green: every src/ file is named in the brief and vice versa', () => {
  const spec = 'The home screen is Main.dc.html, described here.';
  assert.deepEqual(checkSpecAgreement(['Main.dc.html'], spec), []);
});

test('RED: a file exists in src/ but the design brief never names it', () => {
  const fails = checkSpecAgreement(['Orphan.dc.html'], 'Only Main.dc.html is described here.');
  assert.match(msgs(fails), /Orphan\.dc\.html: exists in src\/ but the design specification never names it/);
});

test('RED: the design brief names a screen that no longer exists in src/', () => {
  const fails = checkSpecAgreement([], 'Ghost.dc.html used to be described here.');
  assert.match(msgs(fails), /the design specification names Ghost\.dc\.html, which does not exist in src\//);
});

test('a filename mentioned only inside a brief comment is not counted as named', () => {
  const spec = '<!-- Real.dc.html was retired --> nothing else mentions it.';
  const fails = checkSpecAgreement(['Real.dc.html'], spec);
  assert.match(msgs(fails), /Real\.dc\.html: exists in src\/ but the design specification never names it/);
});

// --- section 2: the responsive contract and the theme, on every live screen --------------
// A small fixture config with values that differ from the real guards.config.json's
// canvas.breakpoints (1180/820) — proving the check reads the number it is handed, not a
// number written into canvas.mjs itself.

const RESPONSIVE_CFG = {
  breakpoints: { medium: 999, narrow: 555 },
  themeAttr: 'data-theme="{{mode}}"',
  fixedWidthFloorPattern: 'min-width:\\s*\\d+px',
};

const liveScreen = (style, body = '') =>
  `<html><head><style>${style}</style></head><body ${body ? '' : 'data-theme="{{mode}}"'}>${body}</body></html>`;

test('green: a screen declaring both breakpoints, the theme attribute and no width floor passes', () => {
  const s = '<html><head><style>@media (max-width: 999px){} @media (max-width: 555px){}</style></head>' +
    '<body data-theme="{{mode}}"></body></html>';
  assert.deepEqual(checkResponsiveContract({ 'Main.dc.html': s }, RESPONSIVE_CFG), []);
});

test('RED: a screen missing the medium breakpoint fails, naming the config location', () => {
  const s = '<html><head><style>@media (max-width: 555px){}</style></head><body data-theme="{{mode}}"></body></html>';
  const fails = checkResponsiveContract({ 'Main.dc.html': s }, RESPONSIVE_CFG);
  assert.match(msgs(fails), /Main\.dc\.html: no medium breakpoint "@media \(max-width: 999px\)" — declared at scripts\/guards\/guards\.config\.json → canvas\.breakpoints\.medium/);
});

test('RED: a screen missing the narrow breakpoint fails, naming the config location', () => {
  const s = '<html><head><style>@media (max-width: 999px){}</style></head><body data-theme="{{mode}}"></body></html>';
  const fails = checkResponsiveContract({ 'Main.dc.html': s }, RESPONSIVE_CFG);
  assert.match(msgs(fails), /Main\.dc\.html: no narrow breakpoint "@media \(max-width: 555px\)" — declared at scripts\/guards\/guards\.config\.json → canvas\.breakpoints\.narrow/);
});

test('RED: a fixed width floor inside <style> fails, naming the config location', () => {
  const s = '<html><head><style>@media (max-width: 999px){} @media (max-width: 555px){} .x{min-width: 400px;}</style></head>' +
    '<body data-theme="{{mode}}"></body></html>';
  const fails = checkResponsiveContract({ 'Main.dc.html': s }, RESPONSIVE_CFG);
  assert.match(msgs(fails), /Main\.dc\.html: a fixed width floor is back .* declared at scripts\/guards\/guards\.config\.json → canvas\.fixedWidthFloorPattern/);
});

test('RED: a screen not wired to the theme attribute fails, naming the config location', () => {
  const s = '<html><head><style>@media (max-width: 999px){} @media (max-width: 555px){}</style></head><body></body></html>';
  const fails = checkResponsiveContract({ 'Main.dc.html': s }, RESPONSIVE_CFG);
  assert.match(msgs(fails), /Main\.dc\.html: theme not wired.*declared at scripts\/guards\/guards\.config\.json → canvas\.themeAttr/);
});

test('a media query present only inside an HTML comment does not satisfy the check', () => {
  const s = '<html><head><style>@media (max-width: 555px){}<!-- @media (max-width: 999px){} --></style></head>' +
    '<body data-theme="{{mode}}"></body></html>';
  const fails = checkResponsiveContract({ 'Main.dc.html': s }, RESPONSIVE_CFG);
  assert.match(msgs(fails), /Main\.dc\.html: no medium breakpoint/);
});

// --- section 2b: chrome, on pages only ----------------------------------------------------

const CHROME_CFG = {
  chrome: {
    langSwitcherClass: 'switcher',
    railStaticSelectorPattern: '\\.aside\\s*\\{[^}]*position:\\s*static',
  },
};

test('green: a page with the switcher class and a collapsing rail passes', () => {
  const s = '<div class="switcher">EN | ES</div><style>.aside { display: flex; position: static; }</style>';
  assert.deepEqual(checkPageChrome({ 'Main.dc.html': s }, CHROME_CFG), []);
});

test('RED: a page missing the language switcher class fails, naming the config location', () => {
  const s = '<style>.aside { position: static; }</style>';
  const fails = checkPageChrome({ 'Main.dc.html': s }, CHROME_CFG);
  assert.match(msgs(fails), /Main\.dc\.html: no language switcher in the rail.*declared at scripts\/guards\/guards\.config\.json → canvas\.chrome\.langSwitcherClass/);
});

test('RED: a page whose rail does not collapse at narrow fails, naming the config location', () => {
  const s = '<div class="switcher">EN | ES</div><style>.aside { display: flex; }</style>';
  const fails = checkPageChrome({ 'Main.dc.html': s }, CHROME_CFG);
  assert.match(msgs(fails), /Main\.dc\.html: rail does not collapse at narrow.*declared at scripts\/guards\/guards\.config\.json → canvas\.chrome\.railStaticSelectorPattern/);
});

test('a switcher class present only inside an HTML comment does not satisfy the check', () => {
  const s = '<!-- <div class="switcher">EN | ES</div> --><style>.aside { position: static; }</style>';
  const fails = checkPageChrome({ 'Main.dc.html': s }, CHROME_CFG);
  assert.match(msgs(fails), /Main\.dc\.html: no language switcher in the rail/);
});

// --- section 5: no visible copy states how many of a growing thing there are -------------

const GROWS_CFG = {
  growsVocabulary: ['case stud', 'deep dive', 'employer', 'testimonial', 'technolog'],
  countsVocabulary: ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
  yearExclusionPattern: '\\b\\d{4}\\b',
};

const withCopy = (sentence) => `<body><p>${sentence}</p></body>`;

test('green: a GROWS sentence with no count word passes', () => {
  const s = withCopy('Several case studies document this recurring problem.');
  assert.deepEqual(checkGrowingCounts({ 'Main.dc.html': s }, GROWS_CFG), []);
});

test('RED: a GROWS sentence naming a count is caught, naming the config location', () => {
  const s = withCopy('Five case studies document this recurring problem.');
  const fails = checkGrowingCounts({ 'Main.dc.html': s }, GROWS_CFG);
  assert.match(msgs(fails), /Main\.dc\.html: copy counts a growing thing — "Five" in "Five case studies document this recurring problem\."/);
  assert.match(msgs(fails), /declared at scripts\/guards\/guards\.config\.json → canvas\.growsVocabulary \/ canvas\.countsVocabulary/);
});

test('RED: the count is caught even with several words between it and the GROWS noun (sentence-scoped, not proximity-scoped)', () => {
  const s = withCopy('Three specific problems within it are documented as separate case studies.');
  const fails = checkGrowingCounts({ 'Main.dc.html': s }, GROWS_CFG);
  assert.match(msgs(fails), /Main\.dc\.html: copy counts a growing thing — "Three"/);
});

test('hard-won exclusion: "one" is not in countsVocabulary, so a rhetorical "one" does not false-positive', () => {
  const s = withCopy('One recurring problem shows up at every employer in this case study.');
  assert.deepEqual(checkGrowingCounts({ 'Main.dc.html': s }, GROWS_CFG), []);
});

test('hard-won exclusion: a four-digit year next to a GROWS word is not read as a count', () => {
  const s = withCopy('Since 2024 the employer roster has grown.');
  assert.deepEqual(checkGrowingCounts({ 'Main.dc.html': s }, GROWS_CFG), []);
});

test('a GROWS+count sentence hidden inside an HTML comment does not trip the check', () => {
  const s = withCopy('Visible copy is fine.') + '<!-- Five case studies document this. -->';
  assert.deepEqual(checkGrowingCounts({ 'Main.dc.html': s }, GROWS_CFG), []);
});

// --- section 6: the switcher's target is this page in the other language -----------------

const SWITCHER_CFG = {
  chrome: {
    langSwitcherClass: 'switcher',
    currentLocaleClass: 'active',
  },
  switcherExcluded: ['NotFound.dc.html'],
};

test('green: a page whose switcher block marks the current locale passes', () => {
  const s = '<div class="switcher"><a href="/">EN</a><span class="active">ES</span></div>';
  assert.deepEqual(checkSwitcherCurrentLocale({ 'HomeES.dc.html': s }, SWITCHER_CFG), []);
});

test('RED: a page with no switcher block at all fails, naming the config location', () => {
  const s = '<p>no switcher here</p>';
  const fails = checkSwitcherCurrentLocale({ 'HomeES.dc.html': s }, SWITCHER_CFG);
  assert.match(msgs(fails), /HomeES\.dc\.html: language switcher block not found.*declared at scripts\/guards\/guards\.config\.json → canvas\.chrome\.langSwitcherClass/);
});

test('RED: a switcher block with no current-locale marker fails, naming the config location', () => {
  const s = '<div class="switcher"><a href="/">EN</a><span>ES</span></div>';
  const fails = checkSwitcherCurrentLocale({ 'HomeES.dc.html': s }, SWITCHER_CFG);
  assert.match(msgs(fails), /HomeES\.dc\.html: no current locale marked in the switcher.*declared at scripts\/guards\/guards\.config\.json → canvas\.chrome\.currentLocaleClass/);
});

test('a page named in canvasCfg.switcherExcluded is skipped entirely, even with no switcher block', () => {
  const s = '<p>designed to have no current locale</p>';
  assert.deepEqual(checkSwitcherCurrentLocale({ 'NotFound.dc.html': s }, SWITCHER_CFG), []);
});
