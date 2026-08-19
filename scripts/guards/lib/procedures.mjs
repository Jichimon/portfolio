// Step 9's acceptance check: the router resolves, and a `done` block cannot claim success
// with nothing behind it.
//
// Two failures, both of which have already happened in this repository's lineage:
//
//   the router names a procedure nobody wrote   — the rules instruct you to run something
//     that is not there, so the instruction quietly means nothing. INC-08 in the process
//     layer, and the reason a roster of "known procedures" is exactly the wrong shape here.
//
//   a done-dimension reads `passed` with no evidence   — INC-01's residue. "Done" meant four
//     different things because nothing forced each dimension to say which artifact backed it.
//     This is the mechanized half of P-03 and A22, and it is what closes the Evidence
//     Contract's outstanding gap.

/**
 * Procedure names from the router's ACTION column, in the router SECTION only.
 *
 * Both narrowings were earned by a failure. Scanning the whole file swept the P-* rules
 * table, whose rule column is full of backticked words — `version`, `status` — so the guard
 * demanded skills by those names. Scanning both columns of the router would sweep the
 * work-item TYPES in the situation column and demand a skill called `feature`.
 *
 * A guard that invents requirements gets deleted, so it is scoped twice.
 */
export function parseRouter(rulesText) {
  const section = rulesText.split(/^##\s+/m).find((s) => /^The router/i.test(s));
  if (!section) return [];
  const names = new Set();
  for (const line of section.split(/\r?\n/)) {
    if (!/^\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1);
    if (cells.length < 2) continue;
    const action = cells[1];
    // The situation column carries work-item TYPES in backticks — `feature`, `content`.
    // Sweeping both columns would demand a skill named `feature` and get the guard deleted.
    for (const m of action.matchAll(/`([a-z][a-z0-9-]+)`/g)) names.add(m[1]);
  }
  return [...names];
}

/** @param {(name:string)=>boolean} skillExists */
export function validateRouter(names, skillExists) {
  if (names.length === 0) {
    return [{ message: 'the router names no procedure — either the table moved or the parser no longer matches it, and in both cases nothing is being checked' }];
  }
  return names
    .filter((n) => !skillExists(n))
    .map((n) => ({ message: `the router routes to \`${n}\`, but .claude/skills/${n}/SKILL.md does not exist — the rules instruct a procedure nobody wrote` }));
}

/** A progress log's date, from its filename. Null when the file is not a dated log. */
export function logDate(filename) {
  const m = filename.match(/^(\d{4}-\d{2}-\d{2})-/);
  return m ? m[1] : null;
}

export const DONE_STATUSES = ['passed', 'failed', 'blocked', 'partial', 'not_applicable'];

/**
 * The `done:` block out of a fenced yaml section. Returns null when there is none, which is
 * a different fact from an empty one and is treated differently by the caller.
 */
export function parseDoneBlock(text) {
  const fence = text.match(/```ya?ml\r?\n([\s\S]*?)```/g);
  if (!fence) return null;
  const block = fence.map((f) => f.replace(/```ya?ml\r?\n|```/g, '')).find((b) => /^done:/m.test(b));
  if (!block) return null;

  const out = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^\s{2,}([a-z_]+):\s*\{(.*)\}\s*,?\s*$/);
    if (!m) continue;
    const [, name, body] = m;
    const status = body.match(/status:\s*([a-z_]+)/)?.[1] ?? '';
    const evidenceRaw = body.match(/evidence:\s*\[(.*?)\]/)?.[1];
    const reason = body.match(/reason:\s*(?:"([^"]*)"|'([^']*)'|([^,}]+))/);
    out[name] = {
      status,
      evidence: evidenceRaw === undefined ? null
        : evidenceRaw.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean),
      reason: (reason?.[1] ?? reason?.[2] ?? reason?.[3] ?? '').trim(),
    };
  }
  return out;
}

/**
 * The rule that makes a done block worth writing.
 *
 * `passed` is the only status that requires evidence, because it is the only one that makes a
 * positive claim. `not_applicable` requires a reason instead — declaring a dimension out loud
 * is the point, and silence reads as coverage (P-03). `blocked` and `failed` are legitimate
 * outcomes and need either.
 *
 * Not mechanized, and said so rather than implied: whether an evidence entry is a POINTER or
 * a sentence. "gate-run exit:0" and "we ran the gate and it was fine" are both non-empty, and
 * only a reader can tell them apart. That half stays review-time.
 */
export function validateDone(block, label = '') {
  const at = label ? `${label}: ` : '';
  const findings = [];
  const names = Object.keys(block ?? {});

  if (names.length === 0) {
    return [{ message: `${at}the done block declares no dimension — an empty conjunction is true of everything` }];
  }

  for (const name of names) {
    const d = block[name];

    if (!DONE_STATUSES.includes(d.status)) {
      findings.push({ message: `${at}\`${name}\` has status "${d.status || '(none)'}", which is outside the vocabulary (${DONE_STATUSES.join(' | ')})` });
      continue;
    }

    if (d.status === 'passed' && !(d.evidence?.length)) {
      findings.push({ message: `${at}\`${name}\` reads \`passed\` with no evidence. A dimension that claims success and points at nothing is a claim, not a result (P-03, P-11)` });
    }

    if (d.status === 'not_applicable' && !d.reason) {
      findings.push({ message: `${at}\`${name}\` reads \`not_applicable\` with no reason. An inapplicable dimension is declared out loud, because silence reads as coverage (P-03)` });
    }

    if ((d.status === 'blocked' || d.status === 'failed' || d.status === 'partial')
        && !(d.evidence?.length) && !d.reason) {
      findings.push({ message: `${at}\`${name}\` reads \`${d.status}\` with neither evidence nor a reason — the outcome is legitimate, saying nothing about it is not` });
    }
  }

  return findings;
}
