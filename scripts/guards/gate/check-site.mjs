#!/usr/bin/env node
// Thin CLI over lib/site-structure.mjs. Walks site/, minus the config's exclusions,
// and hands every file to the property checks (ADR-008, rules S-02 and S-03).

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSite } from '../lib/site-structure.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8')).site;

const repoPath = (abs) => relative(ROOT, abs).split(sep).join('/');

/** Only source text can carry an import; everything else counts toward the cap and nothing more. */
const isSource = (name) => cfg.sourceExtensions.includes(extname(name));

function walk(abs, out = []) {
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (cfg.exclusions.includes(entry.name)) continue;
    const child = join(abs, entry.name);
    if (entry.isDirectory()) walk(child, out);
    else out.push({ path: repoPath(child), text: isSource(entry.name) ? readFileSync(child, 'utf8') : '' });
  }
  return out;
}

const siteRoot = join(ROOT, cfg.root);
if (!existsSync(siteRoot)) {
  // Declared, never silent (P-03). gate.mjs also skips this step, so the two agree.
  console.log(`      ${cfg.root}/ does not exist yet — nothing to check`);
  console.log('SKIP  check-site');
  process.exit(0);
}

const r = checkSite(walk(siteRoot), cfg);

console.log(
  `      ${r.scanned} file(s) across ${r.dirs} director(ies) · cap ${cfg.maxFilesPerDir} · gateway ${cfg.gateway} · core ${cfg.core}`,
);

if (r.findings.length === 0) {
  console.log('PASS  check-site');
  process.exit(0);
}
console.error(`FAIL  check-site  ${r.findings.length} finding(s)`);
for (const f of r.findings) console.error(`  ${f.message}`);
process.exit(1);
