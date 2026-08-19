// G-05 · the roster guard. Least privilege by allowlist, asserted as a property.
//
// It checks the things a role file can get wrong SILENTLY:
//
//   an omitted `model`        inherits, which silently runs the expensive model — a cost
//                             regression wearing the clothes of a neutral default.
//   an omitted `tools`        inherits everything available, which is the opposite of an
//                             allowlist and looks identical in a diff.
//   a missing posture line    reads as coverage. Silence is the failure mode P-03 names.
//   a bootstrap path that
//   no longer resolves        the role reads nothing and says nothing — INC-04, where an
//                             agent produced code violating rules it had never seen.
//
// Property-based (P-13): nothing here names a known role. The dimensions come from a list,
// the sections from a list, and role six is validated exactly like role one.

const REQUIRED_FRONTMATTER = [
  ['name', 'a role with no name cannot be delegated to'],
  ['description', 'the orchestrator selects a role by its description'],
  ['model', 'omitting it means inherit, which silently runs the expensive model (a cost regression, not a neutral default)'],
  ['tools', 'omitting it means inherit everything available — the opposite of an allowlist'],
  ['maxTurns', 'the only natively enforced budget (G-06); without it a runaway run has no stop'],
];

export const POSTURE_DIMENSIONS = [
  'filesystem_read', 'filesystem_write', 'network', 'credentials', 'approval_required', 'isolation',
];

const REQUIRED_SECTIONS = [
  ['Bootstrap', 'rules load themselves, but docs/** does not — without this the role starts blind (P-08)'],
  ['Reporting', 'the output contract; without it the orchestrator cannot paste a report into the work log'],
  ['Boundaries', 'the hard limits, each citing a rule id rather than restating it'],
];

/** Flat `key: value` frontmatter plus which `##` sections exist. */
export function parseRole(text, file = '') {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out = { file, sections: [], raw: text };
  for (const line of (fm?.[1] ?? '').split(/\r?\n/)) {
    const m = line.match(/^([a-z_][A-Za-z0-9_]*):(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  for (const m of text.matchAll(/^##\s+(.+?)\s*$/gm)) out.sections.push(m[1]);
  return out;
}

/**
 * Documents named in the Bootstrap section, from markdown links and backticked paths.
 *
 * Scoped to that section on purpose: Boundaries cites rule ids in backticks, and a collector
 * that swept the whole file would demand a file named `H-01` and be switched off within a day.
 * A guard that blocks legitimate work does not survive to catch the real thing.
 */
export function bootstrapPaths(text) {
  const section = text.split(/^##\s+/m).find((s) => /^Bootstrap/i.test(s));
  if (!section) return [];
  const found = new Set();
  for (const m of section.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) found.add(m[1]);
  for (const m of section.matchAll(/`([^`]+)`/g)) found.add(m[1]);
  return [...found]
    .map((p) => p.replace(/^\.{1,2}\//, '').replace(/^(\.\.\/)+/, '').split('#')[0].trim())
    .filter((p) => /[/.]/.test(p) && !/^[A-Z]-\d+$/.test(p));
}

/** @param {(p:string)=>boolean} exists  injected so this stays pure and testable */
export function validateRole(text, file, exists) {
  const findings = [];
  const at = file;

  if (!/^---\r?\n/.test(text)) {
    return [{ file, message: `${at}: no frontmatter — nothing about this role is declared or checkable` }];
  }

  const role = parseRole(text, file);

  for (const [key, why] of REQUIRED_FRONTMATTER) {
    if (!role[key]) findings.push({ file, message: `${at}: missing \`${key}\` — ${why}` });
  }

  for (const dim of POSTURE_DIMENSIONS) {
    if (role[dim] === undefined || role[dim] === '') {
      findings.push({ file, message: `${at}: posture dimension \`${dim}\` is not declared (G-05). An undeclared dimension reads as covered` });
    }
  }

  // A posture line has to be true, not merely present. Bash's effective permission is the
  // union of every policy it can reach around (Tool Contract §3), so `filesystem_write: none`
  // beside a shell declares a boundary the role does not have — a false lock sitting in the
  // one file whose whole job is to declare the truth about a role's capabilities.
  if (/^none\.?$/i.test((role.filesystem_write ?? '').trim()) && /\b(Bash|PowerShell)\b/.test(role.tools ?? '')) {
    findings.push({ file, message: `${at}: declares \`filesystem_write: none\` while holding a shell. A shell is a write vector, so the declaration is false — either withhold the shell or describe the scope honestly` });
  }

  for (const [section, why] of REQUIRED_SECTIONS) {
    if (!role.sections.some((s) => s.toLowerCase().startsWith(section.toLowerCase()))) {
      findings.push({ file, message: `${at}: no \`## ${section}\` section — ${why}` });
    }
  }

  // The delegation gate resolves a role by FILENAME and reads its write-capability from the
  // tools inside. If the two disagree it reads one role's permissions under another's name.
  const expected = file.replace(/\.md$/, '');
  if (role.name && expected && role.name !== expected) {
    findings.push({ file, message: `${at}: declares name "${role.name}" but the filename says "${expected}" — the delegation gate resolves by filename, so the two must agree` });
  }

  const paths = bootstrapPaths(text);
  if (role.sections.some((s) => /^Bootstrap/i.test(s)) && paths.length === 0) {
    findings.push({ file, message: `${at}: the Bootstrap section names no document. "Read what seems relevant" is not a bootstrap` });
  }
  for (const p of paths) {
    if (!exists(p)) {
      findings.push({ file, message: `${at}: Bootstrap names \`${p}\`, which does not exist — the role would bootstrap into a void and say nothing about it (INC-04)` });
    }
  }

  return findings;
}

/** Rules that are about the roster as a whole rather than any one file. */
export function validateRoster(roles) {
  const findings = [];

  if (roles.length === 0) {
    return [{ file: '-', message: 'no role files found — the roster guard would pass vacuously, which is worse than failing' }];
  }

  // G-09: a subagent cannot ask the human, so it structurally cannot run the checkpoint.
  // A role file with this name would define a role incapable of its single most important
  // duty, and would quietly relocate the checkpoint somewhere it cannot happen.
  for (const r of roles.filter((r) => /^orchestrator$/i.test(r.name ?? ''))) {
    findings.push({ file: r.file, message: 'a role named `orchestrator` is refused (G-09): the orchestrator is the main session and cannot be a subagent, because only it can ask the human' });
  }

  const seen = new Map();
  for (const r of roles) {
    if (!r.name) continue;
    if (seen.has(r.name)) {
      findings.push({ file: r.file, message: `duplicate role name "${r.name}", also declared in ${seen.get(r.name)}` });
    }
    seen.set(r.name, r.file);
  }

  return findings;
}
