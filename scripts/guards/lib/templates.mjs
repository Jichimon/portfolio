// Validates the document templates.
//
// The valuable check here is not "does the template look tidy". It is the COUPLING:
// the delegation gate (H-05) reads three fields out of a spec's frontmatter. If someone
// edits the spec template and drops one, the gate silently stops gating — INC-08's
// shape, in the harness's most important guard. This makes that coupling loud.
//
// Property-based (P-13): templates are DISCOVERED by filename, never listed.

/** A template is any file whose basename contains TEMPLATE. Discovered, not enumerated. */
export function isTemplate(path) {
  return /(^|[/\\])[^/\\]*TEMPLATE[^/\\]*\.(md|ya?ml)$/i.test(path);
}

/** Placeholders use one convention repo-wide: <angle-brackets>. */
const PLACEHOLDER = /<[a-z][^<>\n]{0,60}>/i;

/**
 * Where a template carries its schema. A .yaml template IS its schema; a markdown one
 * carries it in frontmatter or a fenced yaml block. Missing this distinction made the
 * first version of this guard report three false positives against a valid template.
 */
function schemaText(text, path = '') {
  if (/\.ya?ml$/i.test(path)) return text;
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fenced = [...text.matchAll(/```ya?ml\r?\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');
  return [fm ? fm[1] : '', fenced].join('\n');
}

/**
 * @param {{path:string,text:string}[]} files      every candidate file
 * @param {{requiredFields:{file:string,fields:{name:string,reason:string}[]}[]}} config
 * @returns {{file:string,message:string}[]} findings, empty = pass
 */
export function validateTemplates(files, config = {}) {
  const findings = [];
  const templates = files.filter((f) => isTemplate(f.path));

  if (templates.length === 0) {
    // INC-07: a check that finds nothing must not report success.
    findings.push({ file: '-', message: 'no templates discovered — the check would pass vacuously' });
    return findings;
  }

  for (const t of templates) {
    if (!PLACEHOLDER.test(t.text)) {
      findings.push({ file: t.path, message: 'no <placeholder> found — a template with nothing to fill is an example, not a template' });
    }

    // A template lives with its instances. Declaring where they land makes that
    // checkable instead of a convention someone remembers. The failure this catches:
    // a `templates/` directory that collects templates whose instances land elsewhere,
    // separating each template from the thing it generates.
    const decl = t.text.match(/instances:\s*([^\s*]+)/);
    if (!decl) {
      findings.push({ file: t.path, message: 'does not declare `instances:` — a template must say where the files it generates live' });
    } else {
      const declared = decl[1].replace(/\/$/, '');
      const dir = t.path.replace(/\/[^/]*$/, '');
      if (declared !== dir) {
        findings.push({
          file: t.path,
          message: `separated from its instances: declares instances in "${declared}" but lives in "${dir}"`,
        });
      }
    }
    if (/\[NEEDS INPUT\]/.test(t.text)) {
      findings.push({ file: t.path, message: '[NEEDS INPUT] belongs in real content, never in a template (C-01)' });
    }
    if (!/TEMPLATE/.test(t.text)) {
      findings.push({ file: t.path, message: 'does not declare itself a template in its body — a copy could be mistaken for real content' });
    }
  }

  // The coupling checks. Each required field carries a written reason, because a
  // reasonless requirement is the kind nobody dares delete and nobody can justify.
  for (const req of config.requiredFields ?? []) {
    const t = templates.find((f) => f.path.endsWith(req.file));
    if (!t) {
      findings.push({ file: req.file, message: 'required template is missing' });
      continue;
    }
    const schema = schemaText(t.text, t.path);
    for (const field of req.fields) {
      if (!field.reason) {
        findings.push({ file: req.file, message: `required field "${field.name}" has no reason recorded` });
        continue;
      }
      const present = new RegExp(`^\\s*${field.name}\\s*:`, 'm').test(schema);
      if (!present) {
        findings.push({ file: req.file, message: `missing field "${field.name}" — ${field.reason}` });
      }
    }
  }

  return findings;
}
