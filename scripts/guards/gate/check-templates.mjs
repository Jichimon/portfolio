#!/usr/bin/env node
// Thin CLI over lib/templates.mjs.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTemplates, isTemplate } from '../lib/templates.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8')).templates;

const read = (abs) => ({ path: relative(ROOT, abs).split(sep).join('/'), text: readFileSync(abs, 'utf8') });

function walk(abs, acc = []) {
  if (!existsSync(abs)) return acc;
  for (const name of readdirSync(abs)) {
    const p = join(abs, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = cfg.searchRoots
  .flatMap((r) => walk(join(ROOT, r)))
  .map(read)
  .filter((f) => isTemplate(f.path));

const findings = validateTemplates(files, cfg);

if (findings.length === 0) {
  console.log(`PASS  check-templates  ${files.length} template(s)`);
  process.exit(0);
}
console.error(`FAIL  check-templates  ${findings.length} finding(s)`);
for (const f of findings) console.error(`  ${f.file}  ${f.message}`);
process.exit(1);
