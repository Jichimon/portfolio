// Step 5's acceptance check: the runtime boundary matches the rules that declare it.
//
// The failure this prevents: a hard rule declared at rung 1 in .claude/rules/ with no
// corresponding deny entry in settings.json. The rule would read as enforced, the gate
// would be green, and nothing would actually stop the action — a false 🔒, which the
// architecture rates worse than an honest 🔧 because it retires a human eye.
//
// Property-based (P-13): boundaries come from config, not from a list written here.

/** Every deny pattern that mentions a given path boundary. */
function denyPatternsFor(deny, boundary) {
  return deny.filter((p) => p.includes(`/${boundary}/`) || p.includes(`(./${boundary}`));
}

/**
 * @param {object} settings  parsed .claude/settings.json
 * @param {{write:string[],read:string[]}} boundaries
 * @param {{hookPath:string}} opts
 */
export function validateSettings(settings, boundaries, opts = {}) {
  const findings = [];
  const perms = settings.permissions ?? {};
  const deny = perms.deny ?? [];
  const ask = perms.ask ?? [];

  if (deny.length === 0) {
    findings.push({ message: 'no deny rules — deny is the only tier that survives bypassPermissions (G-03)' });
  }

  // Every write boundary needs a file-tool deny. The guard covers the shell vector,
  // but a hook is not guaranteed under every permission mode, so the declarative
  // layer must carry the boundary too.
  for (const b of boundaries.write ?? []) {
    const found = denyPatternsFor(deny, b);
    const hasWrite = found.some((p) => p.startsWith('Write('));
    const hasEdit = found.some((p) => p.startsWith('Edit('));
    if (!hasWrite || !hasEdit) {
      findings.push({
        boundary: b,
        message: `write boundary "${b}" is missing a ${!hasWrite ? 'Write' : 'Edit'}() deny rule — the rule would read as enforced while the file tools stay open`,
      });
    }
  }

  for (const b of boundaries.read ?? []) {
    if (!denyPatternsFor(deny, b).some((p) => p.startsWith('Read('))) {
      findings.push({ boundary: b, message: `read boundary "${b}" is missing a Read() deny rule` });
    }
  }

  // G-03: a boundary must never rest on `ask`. Ask is hardening; bypassPermissions
  // removes it. Anything in `ask` that names a protected boundary is miscategorized.
  const allBoundaries = [...(boundaries.write ?? []), ...(boundaries.read ?? [])];
  for (const pattern of ask) {
    const named = allBoundaries.find((b) => pattern.includes(b));
    if (named) {
      findings.push({
        boundary: named,
        message: `"${pattern}" puts boundary "${named}" on an ask rule — ask is hardening, not a boundary (G-03)`,
      });
    }
  }

  // The wiring must point at a hook that exists, or the shell vector is uncovered
  // while settings.json claims otherwise.
  const hooks = settings.hooks?.PreToolUse ?? [];
  const commands = hooks.flatMap((h) => (h.hooks ?? []).map((x) => x.command ?? ''));
  if (commands.length === 0) {
    findings.push({ message: 'no PreToolUse hook wired — the shell vector has no coverage' });
  } else if (opts.hookPath && !commands.some((c) => c.includes(opts.hookPath))) {
    findings.push({ message: `PreToolUse does not invoke ${opts.hookPath}` });
  }
  if (opts.hookExists === false) {
    findings.push({ message: `PreToolUse points at ${opts.hookPath}, which does not exist on disk` });
  }

  // Every guard in this harness rides on hooks, and one line in a USER settings file turns
  // them all off. The docs are explicit that the project file wins: "a disableAllHooks: false
  // in a project's .claude/settings.json overrides a true in your user settings." Pinning it
  // false is therefore a real boundary; leaving it absent is a silent single point of failure.
  if (settings.disableAllHooks === undefined) {
    findings.push({ message: 'disableAllHooks is not pinned — set it to false so a user-level `true` cannot silently disable every guard' });
  } else if (settings.disableAllHooks !== false) {
    findings.push({ message: 'disableAllHooks is not false — every hook-enforced boundary in this harness is off' });
  }

  // G-04, at rung 1 rather than rung 4: bypassPermissions strips `ask` rules and the
  // permission prompt, leaving deny rules and hooks as the whole boundary set. Refusing the
  // mode outright keeps the harness in the posture its evidence assumes.
  if (perms.disableBypassPermissionsMode !== 'disable') {
    findings.push({ message: 'permissions.disableBypassPermissionsMode is not "disable" — the mode this harness declares it does not run under is still reachable' });
  }

  // A matcher naming a tool that does not exist gates nothing and says nothing (INC-08).
  // The delegation gate was specified on `Task` before anyone checked; `Agent` is the tool.
  //
  // `*` covers everything, and is what this project uses: a matcher listing only the tools
  // the guard dispatches on leaves every OTHER tool unrecorded, so the trace grows results
  // with no matching request. WebFetch did exactly that before this was widened.
  const entries = hooks.map((h) => h.matcher);
  const coversAll = entries.some((m) => m === '*' || m === '' || m === undefined);
  if (!coversAll) {
    const matchers = entries.join('|');
    for (const tool of opts.requiredMatchers ?? []) {
      if (!new RegExp(`(^|\|)${tool}(\||$)`).test(matchers)) {
        findings.push({ message: `PreToolUse matcher does not include \`${tool}\`, so the guard that dispatches on it never runs` });
      }
    }
  }

  return findings;
}
