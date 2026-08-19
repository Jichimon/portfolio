#!/usr/bin/env node
// C-09 and C-14's enforcer, built in step 12 after the acceptance run found both rules
// claiming "rung 2 · in the gate" with no guard behind either. A false lock retires a human
// eye that is still needed, so the claim was either to be built or corrected — and this is
// the surface where every one of this repository's own native incidents happened.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, checkParity, checkFrontmatter, validateExemptions } from '../lib/content.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8')).content;

function walk(abs, acc = []) {
  if (!existsSync(abs)) return acc;
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    const p = join(abs, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.md')) acc.push(p);
  }
  return acc;
}

const files = (cfg.roots ?? []).flatMap((r) => walk(join(ROOT, r))).map((abs) => ({
  path: relative(ROOT, abs).split(sep).join('/'),
  frontmatter: parseFrontmatter(readFileSync(abs, 'utf8')),
}));

// A silent zero is the failure mode this whole harness keeps rediscovering (INC-08): a check
// that walked nothing looks exactly like a check that passed.
if (files.length === 0) {
  console.error(`FAIL  check-content  no content found under ${(cfg.roots ?? []).join(', ')} — the checks below would pass vacuously`);
  process.exit(1);
}

const findings = [
  ...validateExemptions(files, cfg),
  ...checkParity(files, cfg),
  ...checkFrontmatter(files, cfg),
];

const pairs = new Set(files.filter((f) => /\.[a-z]{2}\.md$/.test(f.path)).map((f) => f.path.replace(/\.[a-z]{2}\.md$/, '')));
const exempt = (cfg.noFrontmatter ?? []).length;

console.log(`      ${files.length} content file(s) · ${pairs.size} locale pair(s) across ${(cfg.locales ?? []).join('/')} · ${exempt} reasoned exemption(s)`);

if (findings.length === 0) {
  console.log('PASS  check-content');
  process.exit(0);
}
console.error(`FAIL  check-content  ${findings.length} finding(s)`);
for (const f of findings) console.error(`  ${f.file}  ${f.message}`);
process.exit(1);
