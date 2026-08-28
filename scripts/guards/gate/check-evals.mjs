#!/usr/bin/env node
// Step 11's acceptance check (A24), and the Evaluation contract's enforcer — the last of
// the six to be built.
//
// Thin CLI over lib/evals.mjs. Everything decided here is decided there, where it is tested;
// this file reads the disk and formats the verdict.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCase, parseIncidentIds, validateCases, requiredFieldsFrom } from '../lib/evals.mjs';
import { parseWorkItemStatuses } from '../lib/delegation-gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8')).evals;

const abs = (p) => join(ROOT, p);
const io = { exists: (p) => existsSync(abs(p)), read: (p) => readFileSync(abs(p), 'utf8') };

const dir = abs(cfg.caseDir);
const files = existsSync(dir)
  ? readdirSync(dir).filter((n) => /^EC-\d+.*\.ya?ml$/.test(n)).sort()
  : [];

const cases = files.map((name) => ({
  path: `${cfg.caseDir}/${name}`,
  data: parseCase(readFileSync(join(dir, name), 'utf8')),
}));

const incidents = parseIncidentIds(readFileSync(abs(cfg.architecture), 'utf8'));
const requiredFields = requiredFieldsFrom(readFileSync(abs(cfg.template), 'utf8'), cfg.filledLater ?? []);

// A silent zero is the failure this whole subsystem exists to prevent (INC-08): a suite that
// covers nothing looks exactly like a suite that passes. The incident set is read from §C, so
// an empty one means the architecture document moved or its heading changed.
if (incidents.size === 0) {
  console.error(`FAIL  check-evals  no incidents found in ${cfg.architecture} §C — the coverage check would pass vacuously`);
  process.exit(1);
}

// The register's own status per work item, so a stale proof_reason (TASK 65) is caught
// rather than trusted forever. An unparseable register is a finding, never a crash (G-13) —
// the same pattern check-procedures.mjs already uses for parseWorkItemTypes.
let workItemStatuses = new Map();
const preFindings = [];
try {
  workItemStatuses = parseWorkItemStatuses(readFileSync(join(ROOT, 'TASKS.md'), 'utf8'));
} catch (e) {
  preFindings.push({ file: 'TASKS.md', message: `the register head no longer parses, so no work-item status can be resolved and no stale proof_reason can be checked — ${e.message}` });
}

const findings = [...preFindings, ...validateCases(cases, incidents, { ...cfg, requiredFields }, io, workItemStatuses)];

const scored = cases.filter((c) => (c.data.outcome ?? '').trim());
const proven = cases.filter((c) => typeof c.data.proof === 'object');
const tally = scored.reduce((a, c) => ({ ...a, [c.data.outcome]: (a[c.data.outcome] ?? 0) + 1 }), {});

console.log(
  `      ${cases.length} case(s) covering ${incidents.size} incident(s), ` +
  `${cfg.excluded?.length ?? 0} excluded with a reason · ${proven.length} executable, ` +
  `${cases.length - proven.length} unproven (capped at Partial)`,
);
if (scored.length) {
  console.log(`      verdicts: ${Object.entries(tally).map(([k, v]) => `${v} ${k}`).join(' · ')} (${cases.length - scored.length} unscored)`);
}

if (findings.length === 0) {
  console.log(`PASS  check-evals  ${cases.length} case(s), ${requiredFields.length} required field(s) derived from the template`);
  process.exit(0);
}
console.error(`FAIL  check-evals  ${findings.length} finding(s)`);
for (const f of findings) console.error(`  ${f.file}  ${f.message}`);
process.exit(1);
