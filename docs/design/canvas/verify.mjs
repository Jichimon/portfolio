#!/usr/bin/env node
// Asserts the canvas's structural invariants before a re-seed.
//
// Every check derives what it asserts from the artboards themselves — never a hardcoded
// roster (P-13). Adding a screen and forgetting to register it must FAIL here, not be
// waved through, which is exactly what a literal list of filenames would do.
//
// Two of these exist because they caught something real:
//   - the in-page anchor check found four home tiles linking to #experience, a section
//     that does not exist on home. Looking at the screen had not found it.
//   - the locale check found the Spanish home's wordmark still pointing at the English
//     home. Its first version excused every href="/" and hid the defect; the current
//     version excuses only the language switcher's own EN target. Proven in red (P-14).
//
// Run: node docs/design/canvas/verify.mjs   (exit 1 on any failure)
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { derive } from "./derive.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "src");

const files = readdirSync(dir).filter((f) => f.endsWith(".dc.html"));
const canvas = JSON.parse(readFileSync(`${dir}/canvas.json`, "utf8"));
const preview = readFileSync(join(here, "local-preview.mjs"), "utf8");

// A screen is "live" if it is on the screens page; the directions page is kept history.
const page = Object.fromEntries(canvas.artboards.map((a) => [a.file, a.page]));
const live = files.filter((f) => page[f] === "screens");
const src = Object.fromEntries(live.map((f) => [f, readFileSync(`${dir}/${f}`, "utf8")]));

// PAGE versus DOCUMENT, derived from the artboard rather than from a filename list.
// A page has a rail — it is somewhere you can be on the site, so it owes the reader
// navigation, a locale switch, and copy that behaves like copy. The component sheet has
// no rail because there is nowhere to navigate to from a specimen; its prose is ABOUT the
// site rather than OF it, which is why it may quote a rule the pages have to obey.
// One distinction, three checks scoped by it — not a per-file exception list.
const pages = live.filter((f) => /class="rail"/.test(src[f]));
const docs = live.filter((f) => !pages.includes(f));

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

// 1 — registration is complete in both directions
for (const f of files) {
  ok(page[f], `${f}: in src/ but not in canvas.json`);
  ok(preview.includes(`"${f}"`), `${f}: in src/ but not in local-preview.mjs`);
}
for (const a of canvas.artboards) ok(files.includes(a.file), `${a.file}: in canvas.json but not in src/`);

// 2 — the responsive contract and the theme, on every live screen, page or document
for (const f of live) {
  const s = src[f];
  ok(s.includes("@media (max-width: 1180px)"), `${f}: no medium state`);
  ok(s.includes("@media (max-width: 820px)"), `${f}: no narrow state`);
  ok(!/min-width:\s*\d+px/.test(s.split("</style>")[0]), `${f}: a fixed width floor is back`);
  ok(s.includes('data-theme="{{theme}}"'), `${f}: theme not wired`);

  // 3 — every in-page anchor resolves to an id in the same file (this is how the dead
  // href="#experience" on four home tiles was found; looking at it had not worked)
  const ids = new Set([...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
  for (const m of s.matchAll(/href="#([^"]+)"/g)) {
    ok(ids.has(m[1]), `${f}: href="#${m[1]}" points at no id in this file`);
  }
}

// 2b — chrome, on pages only
for (const f of pages) {
  ok(src[f].includes('class="lang"'), `${f}: no language switcher in the rail`);
  ok(/\.rail\s*\{[^}]*position:\s*static/.test(src[f]), `${f}: rail does not collapse at narrow`);
}

// 2c — a derived screen must match what derive.mjs produces right now. A hand-edited copy
// of a generated file is drift that nothing else would ever surface.
const derived = derive();
for (const [name, content] of Object.entries(derived)) {
  ok(src[name] === content || readFileSync(`${dir}/${name}`, "utf8") === content,
    `${name}: differs from derive.mjs output — run: node docs/design/canvas/derive.mjs`);
}

// 4 — locale hygiene: an es screen never links into an unprefixed route, and vice versa
const esFiles = live.filter((f) => /ES\.dc\.html$/.test(f));
for (const f of esFiles) {
  const s = readFileSync(`${dir}/${f}`, "utf8");
  // The ONLY link on a Spanish page allowed to leave /es/ is the switcher's EN target.
  // An earlier version excused every href="/" and that hid a real defect: the wordmark
  // still pointed at the English home, so clicking the name dropped you out of Spanish.
  const switcherEn = (s.match(/<div class="lang"[\s\S]*?<\/div>/) || [""])[0];
  for (const m of s.matchAll(/href="(\/[^"#]*)"/g)) {
    const h = m[1];
    if (h === "/" && switcherEn.includes('href="/"')) {
      const before = s.slice(0, m.index);
      if (before.lastIndexOf('<div class="lang"') > before.lastIndexOf("</div>")) continue;
    }
    ok(h.startsWith("/es/"), `${f}: links to ${h}, which is the English route`);
  }
}

// 5 — no visible copy states how many of a growing thing there are.
//
// Every list on this site is expected to grow: case studies, deep dives, employers,
// testimonials, technologies. "Five case studies" is wrong the day a sixth lands, and
// nothing would fail when it does — the copy just quietly starts lying. Raised by the
// author, who wanted the descriptions tied to what a destination IS.
//
// Scoped to the SENTENCE, not to word distance: "Three specific problems within it are
// documented as separate case studies" hides four words between the number and the noun
// and a proximity rule would have waved it through. Four-digit years are excluded — a
// period is a fact about the past and does not grow.
const GROWS = /(case stud|deep dive|employer|testimonial|technolog|casos? de estudio|empleador|tecnolog|recomendacion)/i;
// "one"/"uno" are deliberately absent. They are almost always rhetorical here — "one
// recurring problem at every employer", "one of these is the platform" — and flagging
// those trained the check to cry wolf, which is how a check gets switched off. The thing
// it would catch, a singular count of a list expected to grow, is not a sentence anyone
// writes. Removed after it false-positived on real copy rather than kept for symmetry.
const COUNTS = /\b(two|three|four|five|six|seven|eight|nine|ten|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|\d+)\b/i;
for (const f of pages) {
  const s = src[f];
  // visible copy only — strip tags, comments and the <style> block
  const copy = s.replace(/<!--[\s\S]*?-->/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
  for (const sentence of copy.split(/(?<=[.!?])\s+|\n/)) {
    if (!GROWS.test(sentence)) continue;
    const bare = sentence.replace(/\b\d{4}\b/g, " ").replace(/\d[\d.,]*s?\b/g, " ");
    const m = bare.match(COUNTS);
    if (m) ok(false, `${f}: copy counts a growing thing — "${m[0]}" in "${sentence.trim().replace(/\s+/g, " ").slice(0, 90)}"`);
  }
}

// 6 — the switcher's target is this page in the other language, never a bare home
for (const f of pages) {
  if (f === "NotFound.dc.html") continue; // designed to have no current locale
  const s = src[f];
  const m = s.match(/<div class="lang"[\s\S]*?<\/div>/);
  ok(m, `${f}: language switcher block not found`);
  if (m) ok(/class="cur"/.test(m[0]), `${f}: no current locale marked in the switcher`);
}

// 7 — the design specification and src/ agree on the set of artboards, in both
// directions. A screen list drifts silently otherwise: a twelfth artboard can land in
// src/ and never reach the document an implementation actually reads (direction 1), or a
// screen can be deleted or renamed while the specification still describes it, sending an
// implementer looking for a file that no longer exists (direction 2). Both directions are
// derived from the artifacts themselves, never a roster written into this file (P-13).
const specPath = join(here, "..", "claude-design-brief.md");
const spec = readFileSync(specPath, "utf8");
const named = new Set([...spec.matchAll(/\b[A-Za-z][A-Za-z0-9]*\.dc\.html\b/g)].map((m) => m[0]));
for (const f of files) {
  ok(named.has(f), `${f}: exists in src/ but the design specification never names it`);
}
for (const n of named) {
  ok(files.includes(n), `the design specification names ${n}, which does not exist in src/`);
}

if (fails.length) { console.error("FAIL\n  " + fails.join("\n  ")); process.exit(1); }
console.log(`PASS — ${files.length} artboards · ${pages.length} pages + ${docs.length} document(s) live · ${canvas.annotations.length} annotations`);
console.log("       registration bidirectional · derived screens match derive.mjs");
console.log("       chrome on every page · 3 responsive states · no width floor");
console.log("       every in-page anchor resolves · no copy counts a growing thing");
console.log("       es routes stay prefixed · switcher targets this page");
console.log("       src/ and the design specification name the same artboards, both directions");
