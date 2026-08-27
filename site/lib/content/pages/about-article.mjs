function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function readAboutMasthead(frontmatter, sourceName) {
  if (!isNonEmptyString(frontmatter.h1)) {
    throw new Error(`about masthead requires a non-empty h1, missing or empty in "${sourceName}"`);
  }
  const masthead = {
    h1: frontmatter.h1,
    since: frontmatter.since,
    readsAs: frontmatter.reads_as,
  };
  if (isNonEmptyString(frontmatter.lead)) {
    masthead.lead = frontmatter.lead;
  }
  return masthead;
}

const BREAK_PHOTO_SLOT = 'break';

function buildPhotoFigure(photo, availableAssetNames, sourceName) {
  if (!availableAssetNames.has(photo.file)) {
    throw new Error(`photo "${photo.file}" declared in "${sourceName}" has no matching asset on disk`);
  }
  const figure = { file: photo.file, alt: photo.alt };
  if (isNonEmptyString(photo.caption)) {
    figure.caption = photo.caption;
  }
  return figure;
}

export function readPhotoFigures(frontmatter, availableAssetNames, sourceName) {
  const photos = frontmatter.photos ?? [];
  const pair = [];
  const result = { pair };
  for (const photo of photos) {
    const figure = buildPhotoFigure(photo, availableAssetNames, sourceName);
    if (photo.slot === BREAK_PHOTO_SLOT) {
      result.break = figure;
    } else {
      pair.push(figure);
    }
  }
  return result;
}
