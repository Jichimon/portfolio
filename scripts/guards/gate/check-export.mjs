#!/usr/bin/env node
// Thin CLI over lib/export-parity.mjs.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateExportParity } from '../lib/export-parity.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8')).export;

const read = (abs) => ({ path: relative(ROOT, abs).split(sep).join('/'), text: readFileSync(abs, 'utf8') });

/** Every markdown file under the export root — the file set is the directory, never a list. */
function markdownUnder(abs, acc = []) {
  if (!existsSync(abs)) return acc;
  for (const name of readdirSync(abs)) {
    const p = join(abs, name);
    if (statSync(p).isDirectory()) markdownUnder(p, acc);
    else if (name.endsWith('.md')) acc.push(p);
  }
  return acc;
}

const root = join(ROOT, cfg.root);

// The export root existing at all is part of the property: TASK 9's deliverable is these
// documents, and a check that silently passes on their absence would report the item done.
if (!existsSync(root)) {
  console.error(`FAIL  check-export  the export root ${cfg.root} does not exist`);
  process.exit(1);
}

const files = markdownUnder(root).map(read);
const findings = validateExportParity(files, cfg);

if (findings.length === 0) {
  const carriers = files.filter((f) => f.text.includes(cfg.beginMarker)).length;
  console.log(`PASS  check-export  ${carriers} bootstrap(s), one shared core, ${files.length} file(s) scanned`);
  process.exit(0);
}
console.error(`FAIL  check-export  ${findings.length} finding(s)`);
for (const f of findings) console.error(`  ${f.file}  ${f.message}`);
process.exit(1);
