// Always-loaded context is a scarce, shared resource: every line costs on every
// session, and long instruction files measurably reduce adherence. This guard makes
// that budget observable instead of a number someone remembers to watch.
//
// Property-based (P-13): nothing here names a file. "Always loaded" is DERIVED —
// a rule file without `paths:` frontmatter loads at launch, one with it does not.

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

/** A rules file is always-loaded unless its frontmatter scopes it with `paths:`. */
export function isAlwaysLoaded(text) {
  const fm = text.match(FRONTMATTER);
  if (!fm) return true;
  return !/^\s*paths\s*:/m.test(fm[1]);
}

/** Lines are a proxy for context cost — coarse, but stable and trivially checkable. */
export function countLines(text) {
  return text.split(/\r?\n/).length;
}

/**
 * @param {{path:string,text:string,adapter?:boolean}[]} files  CLAUDE.md + .claude/rules/*.md
 * @param {{maxLines:number}} budget
 */
export function checkBudget(files, budget) {
  const loaded = files.filter((f) => f.adapter || isAlwaysLoaded(f.text));
  const breakdown = loaded
    .map((f) => ({ path: f.path, lines: countLines(f.text) }))
    .sort((a, b) => b.lines - a.lines);
  const total = breakdown.reduce((n, f) => n + f.lines, 0);
  const deferred = files
    .filter((f) => !f.adapter && !isAlwaysLoaded(f.text))
    .map((f) => ({ path: f.path, lines: countLines(f.text) }));

  const findings = [];
  if (total > budget.maxLines) {
    findings.push({
      message: `always-loaded context is ${total} lines, over the ${budget.maxLines}-line budget by ${total - budget.maxLines}`,
      largest: breakdown[0],
    });
  }
  return { total, budget: budget.maxLines, breakdown, deferred, findings };
}
