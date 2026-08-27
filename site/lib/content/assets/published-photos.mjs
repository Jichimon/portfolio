// Pure function over already-collected data: the caller lists the source
// directory and gathers each locale's photo entries, and hands both in.
// Every filename present in that directory is treated as a publication
// boundary — anything unreferenced would still ship at a guessable URL, so
// the check runs in the direction "asset -> reference", never the reverse.

function collectReferencedFileNames(photoEntriesByLocale) {
  const referencedFileNames = new Set();

  for (const photoEntries of photoEntriesByLocale) {
    for (const { file } of photoEntries) {
      referencedFileNames.add(file);
    }
  }

  return referencedFileNames;
}

export function assertEveryAssetIsReferenced(assetNames, photoEntriesByLocale) {
  const referencedFileNames = collectReferencedFileNames(photoEntriesByLocale);
  const unreferencedAssetNames = [...assetNames].filter((assetName) => !referencedFileNames.has(assetName));

  if (unreferencedAssetNames.length > 0) {
    throw new Error(`asset(s) not referenced by any locale: ${unreferencedAssetNames.join(', ')}`);
  }
}
