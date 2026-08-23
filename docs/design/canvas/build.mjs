#!/usr/bin/env node
// Expands `<style data-fonts="id1,id2,...">` markers in src/*.dc.html into real
// `@font-face` rules with inline base64 woff2, writing the result to build/src/
// for seed-canvas.mjs to consume. Source files stay human-readable in git;
// the ~150KB/artboard of base64 lives only in the generated build output.
//
// Font family registry: id -> { family, file, weightAxis }
// weightAxis: true for variable fonts (font-weight: 100 900 in @font-face,
// consumer picks a weight in that range), false for static single-weight files.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(here, ".fonts");
const srcDir = join(here, "src");
const outDir = join(here, "build", "src");

// id -> Fontsource path segment under https://cdn.jsdelivr.net/fontsource/fonts/
const SOURCE = {
  "newsreader-vf-normal.woff2": "newsreader:vf@latest/latin-wght-normal.woff2",
  "ibm-plex-sans-vf-normal.woff2": "ibm-plex-sans:vf@latest/latin-wght-normal.woff2",
  "ibm-plex-mono-400.woff2": "ibm-plex-mono@latest/latin-400-normal.woff2",
  "ibm-plex-mono-500.woff2": "ibm-plex-mono@latest/latin-500-normal.woff2",
  "space-grotesk-vf-normal.woff2": "space-grotesk:vf@latest/latin-wght-normal.woff2",
  "literata-vf-normal.woff2": "literata:vf@latest/latin-wght-normal.woff2",
  "source-serif-4-vf-normal.woff2": "source-serif-4:vf@latest/latin-wght-normal.woff2",
};

const REGISTRY = {
  "newsreader": { family: "Newsreader", file: "newsreader-vf-normal.woff2", variable: true, weight: "200 800" },
  "ibm-plex-sans": { family: "IBM Plex Sans", file: "ibm-plex-sans-vf-normal.woff2", variable: true, weight: "100 700" },
  "ibm-plex-mono-400": { family: "IBM Plex Mono", file: "ibm-plex-mono-400.woff2", variable: false, weight: "400" },
  "ibm-plex-mono-500": { family: "IBM Plex Mono", file: "ibm-plex-mono-500.woff2", variable: false, weight: "500" },
  "space-grotesk": { family: "Space Grotesk", file: "space-grotesk-vf-normal.woff2", variable: true, weight: "300 700" },
  "literata": { family: "Literata", file: "literata-vf-normal.woff2", variable: true, weight: "200 900" },
  "source-serif-4": { family: "Source Serif 4", file: "source-serif-4-vf-normal.woff2", variable: true, weight: "200 900" },
};

async function ensureCached(file) {
  const path = join(fontsDir, file);
  if (existsSync(path)) return path;
  const src = SOURCE[file];
  if (!src) throw new Error(`build.mjs: no download source registered for ${file}`);
  const url = `https://cdn.jsdelivr.net/fontsource/fonts/${src}`;
  console.log(`build.mjs: fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`build.mjs: failed to fetch ${url} — HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(fontsDir, { recursive: true });
  writeFileSync(path, buf);
  return path;
}

async function b64Font(id) {
  const entry = REGISTRY[id];
  if (!entry) throw new Error(`build.mjs: unknown font id "${id}" — add it to REGISTRY`);
  const path = await ensureCached(entry.file);
  const b64 = readFileSync(path).toString("base64");
  return `@font-face {
  font-family: "${entry.family}";
  src: url(data:font/woff2;base64,${b64}) format("woff2");
  font-weight: ${entry.weight};
  font-style: normal;
  font-display: swap;
}`;
}

async function expand(source) {
  const match = source.match(/<style data-fonts="([^"]+)"><\/style>/);
  if (!match) return source;
  const ids = match[1].split(",").map((s) => s.trim()).filter(Boolean);
  const rules = [];
  for (const id of ids) rules.push(await b64Font(id));
  return source.replace(match[0], `<style>\n${rules.join("\n")}\n</style>`);
}

mkdirSync(outDir, { recursive: true });

const entries = readdirSync(srcDir);
let count = 0;
for (const name of entries) {
  const srcPath = join(srcDir, name);
  if (name.endsWith(".dc.html")) {
    const source = readFileSync(srcPath, "utf8");
    const expanded = await expand(source);
    writeFileSync(join(outDir, name), expanded, "utf8");
    count++;
  } else if (name === "canvas.json") {
    writeFileSync(join(outDir, name), readFileSync(srcPath, "utf8"), "utf8");
  }
}

console.log(`build.mjs: expanded ${count} artboard(s) -> ${outDir}`);
