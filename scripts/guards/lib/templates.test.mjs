import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTemplate, validateTemplates } from './templates.mjs';

const f = (path, text) => ({ path, text });

const goodSpec = f('docs/specs/SPEC-TEMPLATE.md', `# SPEC-<TASK-N>
<!-- TEMPLATE. instances: docs/specs/ -->
\`\`\`yaml
status: draft
version: 1.0
approved_version:
\`\`\`
`);

const CONFIG = {
  requiredFields: [{
    file: 'SPEC-TEMPLATE.md',
    fields: [
      { name: 'status', reason: 'the delegation gate reads it' },
      { name: 'version', reason: 'drift detection compares it' },
      { name: 'approved_version', reason: 'the gate compares it to version' },
    ],
  }],
};

test('green path: a well-formed template set passes', () => {
  assert.deepEqual(validateTemplates([goodSpec], CONFIG), []);
});

// --- discovery is by property, not by list ---

test('templates are discovered by filename, in any directory', () => {
  assert.equal(isTemplate('docs/specs/SPEC-TEMPLATE.md'), true);
  assert.equal(isTemplate('evaluation-cases/EC-TEMPLATE.yaml'), true);
  assert.equal(isTemplate('docs/templates/WORK-ITEM-TEMPLATE.md'), true);
  assert.equal(isTemplate('docs/harness/architecture.md'), false);
  assert.equal(isTemplate('docs/adr/ADR-0001-hosting.md'), false);
});

// --- red paths ---

test('RED: dropping a gate-critical field is caught, with the reason', () => {
  // This is the check that matters: the gate reads approved_version, so removing it
  // from the template silently disarms H-05 for every spec written afterwards.
  const broken = f('docs/specs/SPEC-TEMPLATE.md', `# SPEC-<TASK-N>
<!-- TEMPLATE. instances: docs/specs/ -->
\`\`\`yaml
status: draft
version: 1.0
\`\`\`
`);
  const found = validateTemplates([broken], CONFIG);
  assert.equal(found.length, 1);
  assert.match(found[0].message, /approved_version/);
  assert.match(found[0].message, /the gate compares it to version/);
});

test('RED: a required field with no recorded reason is caught', () => {
  const cfg = { requiredFields: [{ file: 'SPEC-TEMPLATE.md', fields: [{ name: 'status' }] }] };
  assert.ok(validateTemplates([goodSpec], cfg).some((x) => /no reason recorded/.test(x.message)));
});

test('RED: a missing required template is caught', () => {
  const other = f('docs/adr/ADR-TEMPLATE.md', '# ADR-<NNN>\n<!-- TEMPLATE -->\n');
  assert.ok(validateTemplates([other], CONFIG).some((x) => /required template is missing/.test(x.message)));
});

test('RED: a template with no placeholder is caught', () => {
  const flat = f('docs/adr/ADR-TEMPLATE.md', '# ADR\n<!-- TEMPLATE -->\nAll decided already.\n');
  assert.ok(validateTemplates([flat], {}).some((x) => /no <placeholder>/.test(x.message)));
});

test('RED: [NEEDS INPUT] inside a template is caught', () => {
  const bad = f('docs/adr/ADR-TEMPLATE.md', '# ADR-<NNN>\n<!-- TEMPLATE -->\n[NEEDS INPUT] which host?\n');
  assert.ok(validateTemplates([bad], {}).some((x) => /NEEDS INPUT/.test(x.message)));
});

test('RED: a template that never says it is one is caught', () => {
  const bad = f('docs/adr/ADR-TEMPLATE.md', '# ADR-<NNN>\n\nStatus: Accepted\n');
  assert.ok(validateTemplates([bad], {}).some((x) => /does not declare itself/.test(x.message)));
});

test('RED: a template separated from its instances is caught', () => {
  // The real defect this exists for: a docs/templates/ directory collecting templates
  // whose instances land in TASKS.md and progress/. The template ends up nowhere near
  // the thing it generates, and the directory becomes where odd artifacts go to be
  // forgotten.
  const orphan = f('docs/templates/WORK-ITEM-TEMPLATE.md', '# TEMPLATE <slug>\n<!-- instances: progress/ -->\n');
  const found = validateTemplates([orphan], {});
  assert.ok(found.some((x) => /separated from its instances/.test(x.message)), 'expected a separation finding');
});

test('RED: a template that does not declare instances at all is caught', () => {
  const silent = f('docs/specs/SPEC-TEMPLATE.md', '# TEMPLATE <slug>\nno declaration here\n');
  assert.ok(validateTemplates([silent], {}).some((x) => /does not declare `instances:`/.test(x.message)));
});

test('a template whose instances land in its own directory passes', () => {
  const ok = f('evaluation-cases/EC-TEMPLATE.yaml', '# TEMPLATE <slug>\n# instances: evaluation-cases/\nid: EC-0NN\n');
  assert.deepEqual(validateTemplates([ok], {}), []);
});

test('RED: discovering zero templates fails rather than passing vacuously', () => {
  // INC-07 again: a guard that protects an empty set must say so, not report success.
  assert.ok(validateTemplates([f('docs/harness/architecture.md', '# arch\n')], {}).length > 0);
});

test('fields are read from frontmatter as well as fenced yaml', () => {
  const fm = f('x/EC-TEMPLATE.yaml', '---\nid: EC-0NN\n---\n# TEMPLATE <slug>\n# instances: x/\n');
  const cfg = { requiredFields: [{ file: 'EC-TEMPLATE.yaml', fields: [{ name: 'id', reason: 'case identity' }] }] };
  assert.deepEqual(validateTemplates([fm], cfg), []);
});

test('a bare .yaml template is its own schema', () => {
  // Regression: the first version only looked at frontmatter and fenced yaml blocks,
  // so it reported every field of a plain .yaml template as missing — three false
  // positives against a template that was correct. Found by running the guard, not by
  // reading it (P-14: a guard seen only to pass has not been tested).
  const y = f('evaluation-cases/EC-TEMPLATE.yaml', '# TEMPLATE <slug>\n# instances: evaluation-cases/\nid: EC-0NN\ndescends_from: INC-0N\n');
  const cfg = { requiredFields: [{ file: 'EC-TEMPLATE.yaml', fields: [{ name: 'descends_from', reason: 'origin' }] }] };
  assert.deepEqual(validateTemplates([y], cfg), []);
});

test('RED: a .md template still requires its schema in frontmatter or a fenced block', () => {
  // The .yaml shortcut must not leak into markdown, or prose mentioning "status:" in a
  // sentence would satisfy a coupling check.
  const md = f('docs/specs/SPEC-TEMPLATE.md', '# SPEC <slug>\n<!-- TEMPLATE -->\nThe status: field matters.\n');
  const cfg = { requiredFields: [{ file: 'SPEC-TEMPLATE.md', fields: [{ name: 'status', reason: 'gate reads it' }] }] };
  assert.ok(validateTemplates([md], cfg).some((x) => /missing field "status"/.test(x.message)));
});
