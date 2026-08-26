// Pure functions over already-read data: the caller does the readdir and the
// readFile, and hands the results in. That keeps this module testable with
// inline fixtures instead of files on disk.

// A directive line always starts at column 0 and looks like
// :::diagram{id="platform-c4-context" type="c4-context"}. The attribute order
// is not fixed, so id is pulled out of the whole brace body rather than
// assumed to be first.
const DIRECTIVE_LINE_PATTERN = /^:::diagram\{([^}]*)\}$/gm;
const ID_ATTRIBUTE_PATTERN = /\bid="([^"]*)"/;

function extractDirectiveId(attributeBody) {
  const match = ID_ATTRIBUTE_PATTERN.exec(attributeBody);
  return match ? match[1] : null;
}

export function collectReferencedDiagramIds(bodies) {
  const seenIds = new Set();
  const orderedIds = [];

  for (const body of bodies) {
    for (const directiveMatch of body.matchAll(DIRECTIVE_LINE_PATTERN)) {
      const id = extractDirectiveId(directiveMatch[1]);
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        orderedIds.push(id);
      }
    }
  }

  return orderedIds;
}

export function resolveDiagramAssets(referencedIds, availableSvgIds) {
  const missingIds = referencedIds.filter((id) => !availableSvgIds.has(id));

  if (missingIds.length > 0) {
    throw new Error(`no .svg exists for diagram id(s): ${missingIds.join(', ')}`);
  }

  return referencedIds;
}
