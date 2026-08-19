#!/usr/bin/env node
// Thin CLI over lib/rules-registry.mjs. All logic is in the library so it is
// testable without running the gate (INC-07: a guard you can only test by
// triggering the thing that calls it is a guard nobody tests).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { validateRegistry } from '../lib/rules-registry.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const config = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8')).rulesRegistry;

const read = (abs) => ({ path: relative(ROOT, abs).split(sep).join('/'), text: readFileSync(abs, 'utf8') });

function mdFilesUnder(abs, acc = []) {
  for (const name of readdirSync(abs)) {
    const p = join(abs, name);
    if (statSync(p).isDirectory()) mdFilesUnder(p, acc);
    else if (name.endsWith('.md')) acc.push(p);
  }
  return acc;
}

const ruleDir = join(ROOT, config.ruleDir);
const ruleFiles = mdFilesUnder(ruleDir).map(read);

// Anything that may cite a rule. Derived from the config's globs, resolved simply:
// a directory contributes its .md files, a file contributes itself.
const citing = [];
for (const g of config.citingGlobs) {
  const base = join(ROOT, g.replace(/\/\*\*\/\*\.md$/, '').replace(/\/\*\.md$/, ''));
  try {
    if (statSync(base).isDirectory()) citing.push(...mdFilesUnder(base).map(read));
    else citing.push(read(base));
  } catch { /* a configured path that does not exist yet is not an error */ }
}

const findings = validateRegistry(ruleFiles, citing, config);

if (findings.length === 0) {
  console.log(`PASS  check-rules-registry  ${ruleFiles.length} files, ${ruleFiles.length ? '' : ''}registry consistent`);
  process.exit(0);
}

console.error(`FAIL  check-rules-registry  ${findings.length} finding(s)`);
for (const f of findings) {
  const at = f.line ? `${f.file}:${f.line}` : f.file;
  console.error(`  ${f.id.padEnd(6)}  ${at}  ${f.message}`);
}
process.exit(1);
