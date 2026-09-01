// S-02 — only the gateway imports astro:content (ADR-008). TASK 109 split this out of the
// former monolithic site-structure.mjs; nothing here changed behavior.

import { inside, importsFrom } from './shared.mjs';

/**
 * S-02. One module family fetches content; everything downstream receives props.
 * The gateway is the only place allowed to know that Astro is what loaded them.
 */
export function checkGatewayBoundary(files, { gateway, core }) {
  return files
    .filter(
      (f) =>
        !inside(f.path, gateway) &&
        // The core has its own, stricter rule below. One violation, one finding:
        // reporting the same file twice teaches people to skim the output.
        !inside(f.path, core) &&
        importsFrom(f.text, 'astro:content'),
    )
    .map((f) => ({
      file: f.path,
      message:
        `${f.path} imports astro:content directly. Only ${gateway}/** may (S-02) — ` +
        `a page or component receives props, so a locale-join defect has one place to live rather than many`,
    }));
}
