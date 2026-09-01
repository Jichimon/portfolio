// S-03 — no directory under site/ holds maxFilesPerDir or more files (ADR-008). TASK 109
// split this out of the former monolithic site-structure.mjs; nothing here changed behavior.

/**
 * A directory's own files. Subdirectories are separate directories, not members.
 * Exported because checkSite's own `dirs` count reuses this rather than re-deriving it.
 */
export function byDirectory(files) {
  const dirs = new Map();
  for (const { path } of files) {
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '.';
    dirs.set(dir, (dirs.get(dir) ?? 0) + 1);
  }
  return dirs;
}

/**
 * A directory holding package.json is the root of a package. DERIVED from the same
 * file list the cap reads, so a package created next month is recognised with no edit
 * here and no roster anywhere (P-13).
 */
function packageRoots(files) {
  const roots = new Set();
  for (const { path } of files) {
    if (!path.endsWith('package.json')) continue;
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '.';
    if (`${dir === '.' ? '' : `${dir}/`}package.json` === path) roots.add(dir);
  }
  return roots;
}

/**
 * S-03, in two calibrations. Both come from config, never from a literal here — each
 * number is calibrated in guards.config.json alongside its written reason.
 *
 * The split is not a raised cap wearing a disguise. The ordinary cap governs directories
 * somebody ORGANISED, and its remedy is to split by context. The root of a package is not
 * one of those: npm fixes package.json and its lockfile there, and a tool that resolves its
 * config from the project root fixes that too, so its members share an external requirement
 * rather than a context and the remedy the rule asks for is unavailable to them.
 */
export function checkFileCap(files, { maxFilesPerDir, maxFilesPerPackageRoot }) {
  const roots = packageRoots(files);
  const findings = [];
  for (const [dir, count] of byDirectory(files)) {
    const isPackageRoot = roots.has(dir);
    // G-13: a package root with no calibration configured is a guard that cannot
    // evaluate. Reading undefined as "no limit" would exempt every package root
    // silently, which is the failure this whole surface exists to refuse.
    if (isPackageRoot && typeof maxFilesPerPackageRoot !== 'number') {
      throw new Error(`${dir} is a package root and no maxFilesPerPackageRoot is configured`);
    }
    const cap = isPackageRoot ? maxFilesPerPackageRoot : maxFilesPerDir;
    if (count < cap + 1) continue;
    findings.push({
      dir,
      count,
      message: isPackageRoot
        ? `${dir} is a package root and holds ${count} files. Its cap is ${cap} (S-03). ` +
          `Above it the answer is not a higher number: it is a file that does not have to sit at a package root`
        : `${dir} holds ${count} files. At ${cap + 1} the directory is split into ` +
          `context-named subfolders (S-03). A subfolder that only absorbs the overflow is a finding, not a fix`,
    });
  }
  return findings.sort((a, b) => a.dir.localeCompare(b.dir));
}
