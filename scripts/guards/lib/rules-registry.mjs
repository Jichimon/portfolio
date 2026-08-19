// Pure validation of the rules registry in .claude/rules/.
// Property-based, never a roster (P-13): nothing here names a surface, a file or a
// rule id. Every expectation is derived from the artifacts themselves, so a sixth
// rule file is checked instead of waved through.

/** A rule is defined either as a table row or as a section heading. */
const ROW = /^\|\s*\*\*([A-Z])-(\d{2})\*\*\s*\|(.*)$/;
const HEADING = /^#{2,3}\s+([A-Z])-(\d{2})\s*[·:-]/;

/** Citations look like `P-04` — backticked, so prose mentioning a range is not a citation. */
const CITATION = /`([A-Z]-\d{2})`/g;

/** Rung is the first digit in the rung cell; "3 · rung 1 for the delegation half" -> 3. */
function primaryRung(cell) {
  const m = String(cell).match(/[1-4]/);
  return m ? Number(m[0]) : null;
}

function splitRow(rest) {
  // rest is everything after the id cell's closing pipe.
  return rest.split('|').map((c) => c.trim());
}

/**
 * Parse one rule file into its definitions.
 * Table form expects: | id | rule | rung | origin | [enforced by]
 */
export function parseRuleFile(path, text) {
  const defs = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const row = line.match(ROW);
    if (row) {
      const cells = splitRow(row[3]);
      defs.push({
        id: `${row[1]}-${row[2]}`,
        surface: row[1],
        file: path,
        line: i + 1,
        form: 'row',
        rule: cells[0] ?? '',
        rung: primaryRung(cells[1] ?? ''),
        origin: (cells[2] ?? '').trim(),
      });
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      // A heading-form rule carries its body below it, so origin and rung are not in
      // cells. They are satisfied by the section existing and being non-empty.
      const body = lines.slice(i + 1, i + 40).join('\n').trim();
      defs.push({
        id: `${heading[1]}-${heading[2]}`,
        surface: heading[1],
        file: path,
        line: i + 1,
        form: 'heading',
        rule: line.replace(/^#+\s*/, ''),
        rung: null,
        origin: body.length > 0 ? 'section body' : '',
      });
    }
  }
  return defs;
}

/** Every backticked `X-NN` in a body of text, deduplicated. */
export function parseCitations(text) {
  const out = new Set();
  for (const m of text.matchAll(CITATION)) out.add(m[1]);
  return out;
}

/**
 * @param {{path:string,text:string}[]} ruleFiles   files under .claude/rules/
 * @param {{path:string,text:string}[]} citingFiles anything that may cite a rule
 * @param {{retiredRuleIds?:string[]}} config
 * @returns {{id:string,file:string,line:number|null,message:string}[]} findings, empty = pass
 */
export function validateRegistry(ruleFiles, citingFiles = [], config = {}) {
  const findings = [];
  const retired = new Set(config.retiredRuleIds ?? []);
  const defs = ruleFiles.flatMap((f) => parseRuleFile(f.path, f.text));

  if (defs.length === 0) {
    findings.push({ id: '-', file: '-', line: null, message: 'no rules found — the registry parsed to nothing' });
    return findings;
  }

  // G-10: ids are unique across the whole registry, not per file.
  const byId = new Map();
  for (const d of defs) {
    if (byId.has(d.id)) {
      const first = byId.get(d.id);
      findings.push({
        id: d.id, file: d.file, line: d.line,
        message: `duplicate id — also defined at ${first.file}:${first.line}`,
      });
    } else byId.set(d.id, d);
  }

  // G-10: a retired id is never reused.
  for (const d of defs) {
    if (retired.has(d.id)) {
      findings.push({ id: d.id, file: d.file, line: d.line, message: 'retired id reused — retired ids leave a visible gap' });
    }
  }

  // Every rule has an origin. A rule with no origin is ceremony.
  for (const d of defs) {
    if (!d.origin) {
      findings.push({ id: d.id, file: d.file, line: d.line, message: 'missing origin' });
    }
  }

  // Table-form rules declare a rung, and it is one the enforcement ladder defines.
  for (const d of defs) {
    if (d.form === 'row' && (d.rung === null || d.rung < 1 || d.rung > 4)) {
      findings.push({ id: d.id, file: d.file, line: d.line, message: 'missing or out-of-range rung (expected 1-4)' });
    }
  }

  // One surface per file, one file per surface. Derived, not declared.
  const surfacesByFile = new Map();
  for (const d of defs) {
    if (!surfacesByFile.has(d.file)) surfacesByFile.set(d.file, new Set());
    surfacesByFile.get(d.file).add(d.surface);
  }
  const fileBySurface = new Map();
  for (const [file, surfaces] of surfacesByFile) {
    if (surfaces.size > 1) {
      findings.push({ id: '-', file, line: null, message: `file mixes surfaces: ${[...surfaces].sort().join(', ')}` });
    }
    for (const s of surfaces) {
      if (fileBySurface.has(s)) {
        findings.push({ id: '-', file, line: null, message: `surface ${s}- is split across ${fileBySurface.get(s)} and this file` });
      } else fileBySurface.set(s, file);
    }
  }

  // The law of the split: the adapter holds pointers, never rule bodies. Reusing the
  // same parser is the point — if CLAUDE.md parses as defining a rule, it is holding a
  // rule body, whatever the author intended. This is the decay mode the architecture
  // calls most common, because the adapter is the file everyone edits.
  for (const f of citingFiles) {
    if (!config.adapter || !f.path.endsWith(config.adapter)) continue;
    for (const d of parseRuleFile(f.path, f.text)) {
      findings.push({
        id: d.id, file: f.path, line: d.line,
        message: 'the adapter defines a rule — move the body to .claude/rules/ and leave a pointer',
      });
    }
  }

  // Every citation resolves. A dangling citation is a rule someone thinks exists.
  const known = new Set(defs.map((d) => d.id));
  for (const f of citingFiles) {
    for (const cited of parseCitations(f.text)) {
      if (!known.has(cited) && !retired.has(cited)) {
        findings.push({ id: cited, file: f.path, line: null, message: 'dangling citation — no such rule' });
      }
    }
  }

  return findings;
}
