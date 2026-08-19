#!/usr/bin/env node
// Thin CLI over lib/context-budget.mjs.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkBudget } from '../lib/context-budget.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8')).contextBudget;

const read = (abs, adapter = false) => ({
  path: relative(ROOT, abs).split(sep).join('/'),
  text: readFileSync(abs, 'utf8'),
  adapter,
});

const files = [];
const adapter = join(ROOT, cfg.adapter);
if (existsSync(adapter)) files.push(read(adapter, true));

const ruleDir = join(ROOT, cfg.ruleDir);
if (existsSync(ruleDir)) {
  for (const name of readdirSync(ruleDir)) {
    if (name.endsWith('.md')) files.push(read(join(ruleDir, name)));
  }
}

const r = checkBudget(files, cfg);

console.log(`      always-loaded: ${r.total} / ${r.budget} lines`);
for (const f of r.breakdown) console.log(`        ${String(f.lines).padStart(4)}  ${f.path}`);
for (const f of r.deferred) console.log(`        ${String(f.lines).padStart(4)}  ${f.path}  (path-scoped, not counted)`);

if (r.findings.length === 0) {
  console.log('PASS  check-context-budget');
  process.exit(0);
}
console.error('FAIL  check-context-budget');
for (const f of r.findings) {
  console.error(`  ${f.message}`);
  console.error(`  largest contributor: ${f.largest.path} (${f.largest.lines} lines)`);
}
process.exit(1);
