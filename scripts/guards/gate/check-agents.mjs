#!/usr/bin/env node
// Step 8's acceptance check (G-05, G-09). Thin CLI over lib/agents.mjs.
//
// It also asserts the two couplings that make the roster more than documentation: every role
// with a configured write scope has a role file, and the tool contract's withholdings hold.
// A role file is only a capability boundary if something reads it.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRole, validateRole, validateRoster } from '../lib/agents.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DIR = '.claude/agents';

const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8'));
const findings = [];

const dir = join(ROOT, DIR);
if (!existsSync(dir)) {
  console.error(`FAIL  check-agents  ${DIR} does not exist — no role is declared, so no delegation is governed`);
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
const roles = [];

for (const file of files) {
  const text = readFileSync(join(dir, file), 'utf8');
  roles.push(parseRole(text, file));
  findings.push(...validateRole(text, file, (p) => existsSync(join(ROOT, p))));
}
findings.push(...validateRoster(roles));

// A role named in roleWriteScopes with no file would be a scope enforced against nobody —
// the guard would run forever and never match, which is the INC-08 shape again.
for (const role of Object.keys(cfg.roleWriteScopes ?? {})) {
  if (!roles.some((r) => r.name === role)) {
    findings.push({ file: '-', message: `guards.config.json enforces a write scope for "${role}", but no role file declares that name — the scope guards nobody` });
  }
}

// The Tool Contract's withholdings are the strongest control in the roster: a tool a role
// does not hold cannot be misused. Asserted here so a later edit that "just adds Bash for
// convenience" fails loudly instead of quietly retiring the boundary.
const WITHHELD = {
  researcher: { deny: ['Bash', 'PowerShell'], why: 'network access beside a shell is not a boundary (§L axis 4b)' },
  'harness-evaluator': { deny: ['Bash', 'PowerShell'], why: 'its value depends on not being able to reach what it scores' },
  'adversarial-auditor': { deny: ['Write', 'Edit'], why: 'an auditor that can fix what it finds starts fixing instead of finding' },
};
for (const [name, rule] of Object.entries(WITHHELD)) {
  const role = roles.find((r) => r.name === name);
  if (!role) continue;
  const held = rule.deny.filter((t) => new RegExp(`\\b${t}\\b`).test(role.tools ?? ''));
  if (held.length) {
    findings.push({ file: role.file, message: `${name} holds ${held.join(', ')} — withheld on purpose: ${rule.why}` });
  }
}

// Network tools belong to researcher alone (§L axis 4a), derived from the roster rather than
// asserted against a list of expected holders.
for (const role of roles) {
  const net = ['WebFetch', 'WebSearch'].filter((t) => (role.tools ?? '').includes(t));
  if (net.length && role.name !== 'researcher') {
    findings.push({ file: role.file, message: `${role.name} holds ${net.join(', ')} — network tools are held by researcher only (§L axis 4a)` });
  }
}

console.log(`      ${roles.length} role(s): ${roles.map((r) => r.name ?? '?').join(', ')}`);
console.log(`      ${Object.keys(cfg.roleWriteScopes ?? {}).length} enforced write scope(s); the rest are procedural and checked by the auditor (A21)`);

if (findings.length === 0) {
  console.log('PASS  check-agents');
  process.exit(0);
}
console.error(`FAIL  check-agents  ${findings.length} finding(s)`);
for (const f of findings) console.error(`  ${f.message}`);
process.exit(1);
