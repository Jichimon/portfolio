#!/usr/bin/env node
// Thin CLI over lib/contracts.mjs.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContracts, validateRatioProse } from '../lib/contracts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DOC = 'docs/harness/contracts.md';

const text = readFileSync(join(ROOT, DOC), 'utf8');
const r = validateContracts(text, (p) => existsSync(join(ROOT, p)));
r.findings.push(...validateRatioProse(text, r.counts));

const LABEL = { built: 'ENFORCED', partial: 'PARTIAL ', pending: 'pending ' };
const bucket = (row) => (/partial/i.test(row.status) ? 'partial'
  : /built/i.test(row.status) || !/step/i.test(row.status) ? 'built' : 'pending');

console.log(`      contracts: ${r.counts.built} fully enforced, ${r.counts.partial} partial, ${r.counts.pending} pending (of ${r.rows.length})`);
for (const row of r.rows) {
  const b = bucket(row);
  const gap = b === 'partial' ? ` — uncovered: ${row.uncovered.slice(0, 60)}` : '';
  console.log(`        ${LABEL[b]}  ${row.contract.padEnd(11)} ${row.status}${gap}`);
}

if (r.findings.length === 0) {
  console.log('PASS  check-contracts');
  process.exit(0);
}
console.error('FAIL  check-contracts');
for (const f of r.findings) console.error(`  ${f.contract}  ${f.message}`);
process.exit(1);
