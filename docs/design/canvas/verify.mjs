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
// All seven sections are relocated to scripts/guards/lib/canvas.mjs (`TASK 63`, slice C1 then
// C2), which is where they are unit-tested — this file carried zero test coverage of any
// kind, sitting outside both the guard-test glob and Stryker's mutate glob. Sections 2, 2b, 5
// and 6 (slice C2) hardcode literals specific to the current design version (CSS breakpoints,
// class names, a copy-counting vocabulary); those literals now live in
// scripts/guards/guards.config.json's `canvas` key, read below and passed into each check, so
// a redesign edits that config instead of this file or the guard. This file still does every
// readFileSync/readdirSync/JSON.parse; the relocated functions never touch disk.
//
// Run: node docs/design/canvas/verify.mjs   (exit 1 on any failure)
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { derive } from "./derive.mjs";
import {
  checkRegistration,
  checkDerivedScreens,
  checkAnchors,
  checkLocaleHygiene,
  checkSpecAgreement,
  checkResponsiveContract,
  checkPageChrome,
  checkGrowingCounts,
  checkSwitcherCurrentLocale,
} from "../../../scripts/guards/lib/canvas.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "src");
const guardsConfigPath = join(here, "..", "..", "..", "scripts", "guards", "guards.config.json");
const canvasCfg = JSON.parse(readFileSync(guardsConfigPath, "utf8")).canvas;

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

// 1 — registration is complete in both directions (scripts/guards/lib/canvas.mjs)
fails.push(...checkRegistration(files, canvas.artboards, preview));

// 2 — the responsive contract and the theme, on every live screen, page or document
// (scripts/guards/lib/canvas.mjs — literals from guards.config.json's canvas key)
fails.push(...checkResponsiveContract(src, canvasCfg));

// 3 — every in-page anchor resolves to an id in the same file (this is how the dead
// href="#experience" on four home tiles was found; looking at it had not worked)
// (scripts/guards/lib/canvas.mjs)
fails.push(...checkAnchors(src));

// 2b — chrome, on pages only
// (scripts/guards/lib/canvas.mjs — literals from guards.config.json's canvas key)
const pageSrc = Object.fromEntries(pages.map((f) => [f, src[f]]));
fails.push(...checkPageChrome(pageSrc, canvasCfg));

// 2c — a derived screen must match what derive.mjs produces right now. A hand-edited copy
// of a generated file is drift that nothing else would ever surface.
// (scripts/guards/lib/canvas.mjs)
const derived = derive();
const derivedActual = Object.fromEntries(
  Object.keys(derived).map((name) => [name, name in src ? src[name] : readFileSync(`${dir}/${name}`, "utf8")]),
);
fails.push(...checkDerivedScreens(derived, derivedActual));

// 4 — locale hygiene: an es screen never links into an unprefixed route, and vice versa
// (scripts/guards/lib/canvas.mjs)
const esFiles = Object.fromEntries(live.filter((f) => /ES\.dc\.html$/.test(f)).map((f) => [f, src[f]]));
fails.push(...checkLocaleHygiene(esFiles));

// 5 — no visible copy states how many of a growing thing there are.
//
// Every list on this site is expected to grow: case studies, deep dives, employers,
// testimonials, technologies. "Five case studies" is wrong the day a sixth lands, and
// nothing would fail when it does — the copy just quietly starts lying. Raised by the
// author, who wanted the descriptions tied to what a destination IS. Scoped to the SENTENCE,
// not to word distance, and two hard-won exclusions (four-digit years; "one"/"uno") are
// preserved — see guards.config.json's canvas._vocabularyNote and _yearExclusionPatternNote
// for why. (scripts/guards/lib/canvas.mjs — vocabulary from guards.config.json's canvas key)
fails.push(...checkGrowingCounts(pageSrc, canvasCfg));

// 6 — the switcher's target is this page in the other language, never a bare home
// (scripts/guards/lib/canvas.mjs — literals from guards.config.json's canvas key)
fails.push(...checkSwitcherCurrentLocale(pageSrc, canvasCfg));

// 7 — the design specification and src/ agree on the set of artboards, in both
// directions. A screen list drifts silently otherwise: a twelfth artboard can land in
// src/ and never reach the document an implementation actually reads (direction 1), or a
// screen can be deleted or renamed while the specification still describes it, sending an
// implementer looking for a file that no longer exists (direction 2). Both directions are
// derived from the artifacts themselves, never a roster written into this file (P-13).
// (scripts/guards/lib/canvas.mjs)
const specPath = join(here, "..", "claude-design-brief.md");
const spec = readFileSync(specPath, "utf8");
fails.push(...checkSpecAgreement(files, spec));

if (fails.length) { console.error("FAIL\n  " + fails.join("\n  ")); process.exit(1); }
console.log(`PASS — ${files.length} artboards · ${pages.length} pages + ${docs.length} document(s) live · ${canvas.annotations.length} annotations`);
console.log("       registration bidirectional · derived screens match derive.mjs");
console.log("       chrome on every page · 3 responsive states · no width floor");
console.log("       every in-page anchor resolves · no copy counts a growing thing");
console.log("       es routes stay prefixed · switcher targets this page");
console.log("       src/ and the design specification name the same artboards, both directions");
