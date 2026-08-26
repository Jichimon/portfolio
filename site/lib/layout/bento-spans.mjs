// How many columns each tile of a bento row occupies.
//
// A tile's base span is a fact about the tile — the platform anchor is simply
// bigger — but whether the last tile leaves a hole is a fact about the grid, and
// it changes every time a case study is added or removed. The artboard resolves it
// by hand: its third deep dive carries a `tile-wide` class because, with five case
// studies at three columns, that is the one that would otherwise sit alone beside
// two empty cells. Copying the class across would freeze a layout that is only
// correct for exactly today's five, and a sixth case study would reopen the hole
// with nothing to announce it — the page would simply look wrong.
//
// So the rule is derived instead: the last tile grows to whatever its row has left.
// At five entries it reproduces the artboard exactly; at any other count it closes
// the gap rather than reproducing a decision that no longer applies.

export function fillLastRow(baseSpans, columns) {
  if (!Number.isInteger(columns) || columns < 1) {
    throw new Error(`a bento needs at least one column, received ${columns}`);
  }

  // A span wider than the grid would silently overflow the row it sits in, so it is
  // capped here rather than handed to CSS to resolve.
  const spans = baseSpans.map((span) => Math.min(span, columns));
  if (spans.length === 0) return spans;

  const columnsUsedBeforeLast = spans
    .slice(0, -1)
    .reduce((total, span) => total + span, 0);

  spans[spans.length - 1] = columns - (columnsUsedBeforeLast % columns);
  return spans;
}
