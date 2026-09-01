// The site's shape, as properties rather than as prose (ADR-008). TASK 109 split the former
// monolithic site-structure.mjs into one module per rule — this file is what composes them
// back into the single `checkSite` the gate step calls, and re-exports every individual
// checker so a caller that wants just one (as every *.test.mjs beside these modules does)
// does not need to know which file it moved to.

import { checkFileCap, byDirectory } from './file-cap.mjs';
import { checkGatewayBoundary } from './gateway-boundary.mjs';
import { checkCoreIsFrameworkFree } from './framework-free.mjs';
import { checkRouteLiteralsAreDerived } from './route-literals.mjs';
import { checkColourAndBreakpointLiteralsAreDeclaredOnce } from './design-tokens.mjs';
import { checkVisibleStringLiteralsComeFromTheGateway } from './visible-strings.mjs';
import { checkConfigsDeclareRatherThanAct } from './config-declarative.mjs';
import { checkCommentsCarryNoExternalReference } from './comment-references.mjs';

export {
  checkFileCap,
  checkGatewayBoundary,
  checkCoreIsFrameworkFree,
  checkRouteLiteralsAreDerived,
  checkColourAndBreakpointLiteralsAreDeclaredOnce,
  checkVisibleStringLiteralsComeFromTheGateway,
  checkConfigsDeclareRatherThanAct,
  checkCommentsCarryNoExternalReference,
};

/** @param {{path:string,text:string}[]} files  every file under site/, minus the config's exclusions */
export function checkSite(files, cfg) {
  return {
    scanned: files.length,
    dirs: byDirectory(files).size,
    findings: [
      ...checkFileCap(files, cfg),
      ...checkGatewayBoundary(files, cfg),
      ...checkCoreIsFrameworkFree(files, cfg),
      ...checkCommentsCarryNoExternalReference(files, cfg),
      ...checkRouteLiteralsAreDerived(files, cfg),
      ...checkColourAndBreakpointLiteralsAreDeclaredOnce(files, cfg),
      ...checkVisibleStringLiteralsComeFromTheGateway(files, cfg),
      ...checkConfigsDeclareRatherThanAct(files, cfg),
    ],
  };
}
