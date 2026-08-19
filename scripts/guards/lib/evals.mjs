// The Evaluation contract's enforcer (contracts.md §6), and the last of the six.
//
// What it protects is the loop, not the cases:
//
//     incident  →  eval case  →  regression
//
// A suite can rot in three directions and stay green in all of them. A case can point at an
// incident nobody transcribed. An incident can arrive with no case, which is how a regression
// net develops a hole exactly where the newest failure lives. And a proof can name a test
// that was renamed last month, which leaves the case looking executable while demonstrating
// nothing. Every check below is derived from an artifact — architecture §C for the incident
// set, the test file for the proof — because a roster is what INC-07 was.
//
// The fifth property is the one that keeps the suite honest rather than merely tidy: a case
// with no executable demonstration may not claim `Caught`. Without a control to remove, the
// only thing that could have produced a pass is a model behaving well that day, and that is
// a measurement of the model (A16).

import { stripComment, unquote } from './delegation-gate.mjs';

const KEY = /^([a-z_][a-z0-9_]*):(.*)$/i;
const INDENTED = /^(\s+)(.*)$/;

/**
 * A small YAML subset: scalars, `|` block scalars, `- ` sequences, and one level of nested
 * map. That is the whole eval-case shape, and a real YAML dependency would be a dependency
 * added for it (D6).
 *
 * An absent key and an empty one are kept distinct. `outcome:` with nothing after it is the
 * template's unfilled state; reading that as missing would hide an unscored case, and reading
 * it as a value would fail the vocabulary check on every fresh case.
 */
export function parseCase(text) {
  const lines = String(text).split(/\r?\n/);
  const out = {};

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(KEY);
    if (!m) continue;
    const key = m[1];
    const inline = stripComment(m[2]).trim();

    if (inline === '|' || inline === '|-') {
      const body = [];
      let indent = null;
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (next.trim() === '') { body.push(''); i++; continue; }
        const ind = next.match(INDENTED);
        if (!ind) break;
        // Block scalars carry prose. Nothing inside is re-tokenized, or an input prompt
        // containing a colon would be truncated at the case's most important line.
        indent ??= ind[1].length;
        body.push(next.slice(indent));
        i++;
      }
      while (body.length && body[body.length - 1] === '') body.pop();
      out[key] = body.join('\n');
      continue;
    }

    if (inline !== '') { out[key] = unquote(inline); continue; }

    // An empty inline value means a list, a nested map, or genuinely nothing.
    const list = [];
    const map = {};
    let j = i;
    while (j + 1 < lines.length) {
      const next = lines[j + 1];
      if (next.trim() === '') { j++; continue; }
      const ind = next.match(INDENTED);
      if (!ind) break;
      const item = ind[2].match(/^-\s+(.*)$/);
      if (item) { list.push(unquote(stripComment(item[1]).trim())); j++; continue; }
      const sub = ind[2].match(KEY);
      if (sub) { map[sub[1]] = unquote(stripComment(sub[2]).trim()); j++; continue; }
      break;
    }
    if (list.length) { out[key] = list; i = j; continue; }
    if (Object.keys(map).length) { out[key] = map; i = j; continue; }
    out[key] = '';
  }

  return out;
}

/**
 * The incident id set, read from architecture §C and nowhere else.
 *
 * Scoped to that section deliberately: the ids are cited across every rule table in the
 * registry, so a whole-document scan would return citations as if they were incidents and
 * the coverage check would then demand cases for things that are not incidents.
 */
export function parseIncidentIds(architectureText) {
  const sections = String(architectureText).split(/^##\s+/m);
  const origins = sections.find((s) => /^C\s/.test(s));
  const ids = new Set();
  if (!origins) return ids;
  for (const line of origins.split(/\r?\n/)) {
    const m = line.match(/^\|\s*\*\*(INC-\d+)\*\*\s*\|/);
    if (m) ids.add(m[1]);
  }
  return ids;
}

/**
 * The required-field set, derived from the template rather than listed beside it.
 *
 * An inclusion list would have to be updated by whoever adds a field, which is the one moment
 * they are thinking about something else — and a forgotten entry makes the guard blinder.
 * Subtracting instead means a new template field is required by default, and every field that
 * is NOT required is visible, with a written reason (P-13).
 */
export function requiredFieldsFrom(templateText, filledLater = []) {
  const optional = new Set(filledLater.map((e) => (typeof e === 'string' ? e : e.field)));
  return Object.keys(parseCase(templateText)).filter((k) => k !== 'id' && !optional.has(k));
}

const asList = (v) => (Array.isArray(v) ? v : v === undefined || v === '' ? [] : [v]);

/**
 * @param {{path:string,data:object}[]} cases
 * @param {Set<string>} incidentIds     from parseIncidentIds
 * @param {object} config               guards.config.json .evals
 * @param {{exists:(p:string)=>boolean, read:(p:string)=>string}} io  injected, so this stays pure
 */
export function validateCases(cases, incidentIds, config, io) {
  const findings = [];
  const at = (path, message) => findings.push({ file: path, message });
  const outcomes = config.outcomes ?? ['Caught', 'Partial', 'Gap'];
  const required = config.requiredFields ?? [];
  const excluded = config.excluded ?? [];

  const seen = new Map();
  const covered = new Set();

  for (const { path, data } of cases) {
    const id = data.id ?? '';
    const base = path.split('/').pop() ?? path;

    // 1 · shape
    if (!id) at(path, 'no id');
    else if (!base.startsWith(id)) {
      at(path, `declares id ${id} but the filename says ${base} — the id is a public reference, and two names for one case is how a citation goes stale`);
    }
    if (id && seen.has(id)) at(path, `duplicate id ${id}, also in ${seen.get(id)} — ids are never reused (G-10)`);
    else if (id) seen.set(id, path);

    for (const field of required) {
      if (asList(data[field]).length === 0) {
        at(path, `${field} is missing or empty — it is a field the guard reads, so an empty one disarms a check silently`);
      }
    }

    const outcome = (data.outcome ?? '').trim();
    if (outcome && !outcomes.includes(outcome)) {
      at(path, `outcome "${outcome}" is outside the vocabulary ${outcomes.join(' / ')} — an invented verdict is unreadable in a trend`);
    }

    const retired = (data.retired ?? '').trim();
    if (retired && !/\d{4}-\d{2}-\d{2}/.test(retired)) {
      at(path, `retired without a date: "${retired}". A retirement is a decision, and an undated one cannot be read later (G-10)`);
    }

    // 2 · the origin resolves
    const inc = (data.descends_from ?? '').trim();
    if (!inc) at(path, 'descends_from is empty — a case with no incident is one nobody can justify keeping');
    else if (!incidentIds.has(inc)) {
      at(path, `descends_from names ${inc}, which is not an incident in architecture.md §C`);
    } else {
      covered.add(inc);
    }

    // 4 · the proof resolves, and 5 · an unproven case may not claim Caught
    const proof = data.proof;
    const unproven = proof === 'none' || proof === '' || proof === undefined;

    if (unproven) {
      if (!(data.proof_reason ?? '').trim()) {
        at(path, 'proof: none without a proof_reason. A case that cannot be demonstrated failing is documentation, and it has to say so out loud rather than by omission');
      }
      if (outcome === 'Caught') {
        at(path, 'claims Caught with no executable proof. Without a control to remove, the only thing that could have produced a pass is the model behaving well, and that measures the model rather than the harness (A16)');
      }
    } else if (typeof proof !== 'object') {
      at(path, `proof must be a map with file and test, or the literal none — got "${proof}"`);
    } else {
      const { file, test: name } = proof;
      if (!file) at(path, 'proof names no file');
      if (!name) at(path, 'proof names no test');
      if (file && !io.exists(file)) {
        at(path, `proof file does not exist: ${file}`);
      } else if (file && name && !io.read(file).includes(name)) {
        // Existence alone would pass forever against a renamed test — INC-07's shape
        // inside the checker that exists to prevent it.
        at(path, `proof file ${file} contains no test named "${name}" — the demonstration this case claims does not run`);
      }
    }
  }

  // 3 · coverage, both directions
  const excludedIds = new Set();
  for (const entry of excluded) {
    const inc = (entry.incident ?? '').trim();
    if (!inc) {
      findings.push({ file: 'guards.config.json', message: 'an evals.excluded entry names no incident' });
      continue;
    }
    excludedIds.add(inc);
    if (!(entry.reason ?? '').trim()) {
      findings.push({ file: 'guards.config.json', message: `${inc} is excluded with no reason. Every calibrated exception in this harness carries one, or the next reader cannot tell a decision from an oversight` });
    }
    if (!incidentIds.has(inc)) {
      findings.push({ file: 'guards.config.json', message: `${inc} is excluded but is not an incident in §C — a stale exemption hides the next real gap` });
    }
    if (covered.has(inc)) {
      findings.push({ file: 'guards.config.json', message: `${inc} is excluded but a case covers it — remove the exemption rather than keeping both claims` });
    }
  }

  for (const inc of incidentIds) {
    if (covered.has(inc) || excludedIds.has(inc)) continue;
    findings.push({
      file: 'evaluation-cases/',
      message: `${inc} has no eval case and no recorded exclusion. Every incident produces a case, or the loop it belongs to has a hole exactly where the newest failure lives`,
    });
  }

  return findings;
}
