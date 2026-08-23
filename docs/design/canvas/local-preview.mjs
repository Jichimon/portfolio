#!/usr/bin/env node
// Builds a small, self-contained static HTML page from build/src/*.dc.html — no editor
// payload, no claude.ai auth, opens directly via file://. Fallback for when the published
// Artifact link doesn't resolve in the viewer's browser. Strips the {{handlebars}} the
// Design Components runtime would normally resolve and wires a plain vanilla-JS theme
// toggle in their place, so the light/dark switch still works in a plain browser tab.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "build", "src");
const outPath = process.argv[2];
if (!outPath) {
  console.error("usage: node local-preview.mjs <output-path.html>");
  process.exit(1);
}

const BOARDS = [
  { file: "Main.dc.html", title: "Home (accepted direction)", theme: "light" },
  { file: "CaseStudyDetail.dc.html", title: "Case study — otp-provider-decoupling", theme: "light" },
  { file: "CaseStudiesIndex.dc.html", title: "Case studies index", theme: "light" },
  { file: "PlatformPage.dc.html", title: "Platform anchor — mobile-banking-platform", theme: "light" },
  { file: "About.dc.html", title: "About", theme: "light" },
  { file: "Experience.dc.html", title: "Experience", theme: "light" },
  { file: "HomeES.dc.html", title: "Home — es (length stress test)", theme: "light" },
  { file: "NotFound.dc.html", title: "404 — bilingual", theme: "light" },
  { file: "Components.dc.html", title: "Component sheet", theme: "light" },
  { file: "HomeMobile.dc.html", title: "Home — 390 (frozen phone frame)", theme: "light" },
  { file: "CaseStudyMobile.dc.html", title: "Case study — 390 (frozen phone frame)", theme: "light" },
  { file: "DirectionB.dc.html", title: "[history] B · Estratos y falla (not chosen)", theme: "light" },
  { file: "DirectionC.dc.html", title: "[history] C · Todo pasa por acá (not chosen)", theme: "light" },
  { file: "DirectionCDark.dc.html", title: "[history] C — dark (not chosen)", theme: "dark" },
  { file: "MobileSeam.dc.html", title: "[history] mobile seam test — superseded", theme: "light" },
];

function extractBoard(source, defaultTheme, slug) {
  const styleMatches = [...source.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]);
  const boardMatch = source.match(/<div class="board"[\s\S]*?<\/div>\s*<\/x-dc>/);
  if (!boardMatch) throw new Error("could not find .board div");
  let board = boardMatch[0].replace(/<\/x-dc>\s*$/, "");
  board = board
    .replace(/data-theme="\{\{theme\}\}"/, `data-theme="${defaultTheme}"`)
    .replace(/onClick="\{\{toggleTheme\}\}"/g, `onclick="toggleTheme(this)"`)
    .replace(/aria-pressed="\{\{isDark\}\}"/g, `aria-pressed="${defaultTheme === "dark"}"`)
    .replace(/\{\{themeLabel\}\}/g, `<span class="theme-label">${defaultTheme === "light" ? "Dark mode" : "Light mode"}</span>`);

  // Each artboard is its own document in the real canvas, so section ids collide only
  // here, where all of them share one page — `#context` exists on two boards and a TOC
  // click would jump to whichever came first. Namespace ids and their in-page anchors
  // per board. `href="#"` placeholders are left alone: they point at nothing on purpose.
  board = board
    .replace(/ id="([^"]+)"/g, ` id="${slug}-$1"`)
    .replace(/ href="#([^"]+)"/g, ` href="#${slug}-$1"`);

  return { styles: styleMatches.join("\n"), board };
}

const sections = BOARDS.map(({ file, title, theme }) => {
  const path = join(srcDir, file);
  if (!existsSync(path)) throw new Error(`local-preview.mjs: missing ${path} — run build.mjs first`);
  const source = readFileSync(path, "utf8");
  const { styles, board } = extractBoard(source, theme, file.replace(/\.dc\.html$/, "").toLowerCase());
  return `
<section class="frame">
  <div class="frame-head">
    <h2>${title}</h2>
    <div class="widths" role="group" aria-label="Preview width">
      <button data-w="390">390</button><button data-w="768">768</button><button data-w="1024">1024</button><button data-w="1440">1440</button><button data-w="0" class="on">fit</button>
    </div>
  </div>
  <div class="scaler">
    ${styles}
    ${board}
  </div>
</section>`;
}).join("\n");

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Portfolio Site Design — local preview</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { margin: 0; padding: 0; background: #0c0c0a; color: #eee; font-family: -apple-system, sans-serif; }
  .page-header { padding: 28px 32px; border-bottom: 1px solid #333; }
  .page-header h1 { font-size: 15px; font-weight: 600; margin: 0 0 4px; }
  .page-header p { font-size: 12.5px; color: #999; margin: 0; max-width: 720px; line-height: 1.6; }
  .frame { padding: 32px; border-bottom: 1px solid #262626; }
  .frame h2 { font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; color: #999; margin: 0; font-family: monospace; }
  .frame-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin: 0 0 16px; }
  .widths { display: flex; gap: 4px; }
  .widths button { font-family: monospace; font-size: 11px; color: #999; background: #1a1a17; border: 1px solid #333; border-radius: 3px; padding: 4px 9px; cursor: pointer; }
  .widths button:hover { color: #eee; border-color: #555; }
  .widths button.on { color: #0c0c0a; background: #d8d5cb; border-color: #d8d5cb; }
  .scaler { border: 1px solid #333; border-radius: 4px; overflow: auto; max-height: 80vh; }
  /* A fixed pixel width here is what makes the media queries fire: the board is width:100%,
     so constraining the scroller IS constraining the viewport the design responds to.
     'fit' releases it back to the window. */
  .scaler[style*="width"] { margin: 0 auto; }
  .theme-label { margin-left: 2px; }
</style>
</head>
<body>
<div class="page-header">
  <h1>Portfolio site design — pass 0 v2 (local preview)</h1>
  <p>Static fallback, no claude.ai account needed — opened directly from disk. Each theme toggle (the switch in the nav) is live, the scroll-spy in the rail runs, and the <strong>width buttons above each screen</strong> constrain it to 390 / 768 / 1024 / 1440 so the responsive states are testable here rather than described. Regenerate after any src/ edit: <code>node docs/design/canvas/build.mjs &amp;&amp; node docs/design/canvas/local-preview.mjs</code>.</p>
</div>
${sections}
<script>
function toggleTheme(btn) {
  var board = btn.closest('.board');
  var dark = board.getAttribute('data-theme') === 'dark';
  board.setAttribute('data-theme', dark ? 'light' : 'dark');
  var label = btn.querySelector('.theme-label');
  if (label) label.textContent = dark ? 'Dark mode' : 'Light mode';
  btn.setAttribute('aria-pressed', String(!dark));
}
document.addEventListener('click', function (e) {
  var b = e.target.closest ? e.target.closest('.widths button') : null;
  if (!b) return;
  var group = b.parentElement;
  var scaler = group.closest('.frame').querySelector('.scaler');
  var w = Number(b.getAttribute('data-w'));
  scaler.style.width = w ? w + 'px' : '';
  Array.prototype.forEach.call(group.children, function (x) { x.classList.toggle('on', x === b); });
});
</script>
</body>
</html>
`;

writeFileSync(outPath, page, "utf8");
console.log(`local-preview.mjs: wrote ${outPath} (${(page.length / 1024).toFixed(0)} KB)`);
