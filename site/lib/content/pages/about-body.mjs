// The About page body's own structure: which markdown devices carry a treatment other
// than prose, and where each one sits. Every rule here is positional or structural and
// none of them reads a heading's or a paragraph's text — the two locales write different
// prose for the same structure, and a text-keyed rule would style the English page and
// silently miss the Spanish one.

const PAGE_FRONTMATTER_TYPE = 'page';

const PROSE_PART_CLASS = 'about-article__prose-part';
const PULL_CLASS = 'about-article__pull';
const DROP_CLASS = 'about-article__drop';

// Raw HTML rather than a wrapper node, because the opening tag has to sit before the
// body's first child and the closing tag after its last — a wrapper node can only
// enclose children it is given up front, not a range picked out after the fact.
const rawHtml = (value) => ({ raw: value, mdxExpressions: false });
const openProsePart = () => rawHtml(`<div class="${PROSE_PART_CLASS}">`);
const closeProsePart = () => rawHtml('</div>');

function elementNode(type, hName, className, children) {
  return { type, data: { hName, hProperties: { className: [className] } }, children };
}

/** Index of the body's thematic break, or -1 when it has none. Throws on a second. */
export function findThematicBreakIndex(children) {
  const indices = [];
  children.forEach((node, index) => {
    if (node.type === 'thematicBreak') indices.push(index);
  });
  if (indices.length > 1) {
    throw new Error(`about-body: expected at most one thematicBreak, found ${indices.length}`);
  }
  return indices.length === 1 ? indices[0] : -1;
}

/** The body's single blockquote, or null when it has none. Throws on a second. */
export function findSingleBlockquote(children) {
  const quotes = children.filter((node) => node.type === 'blockquote');
  if (quotes.length > 1) {
    throw new Error(`about-body: expected at most one blockquote, found ${quotes.length}`);
  }
  return quotes[0] ?? null;
}

/** True when the body's first block is a paragraph — the only shape that earns the drop treatment. */
export function isFirstBlockAParagraph(children) {
  return children[0]?.type === 'paragraph';
}

/**
 * A blockquote's own inline content, the way the pull line needs it: the blockquote node
 * itself only holds block children, so when markdown gave it a single paragraph — the
 * shape the author writes — that paragraph's inline children are what carries emphasis
 * and links across. A blockquote of any other shape is carried across as-is.
 */
function inlineChildrenOfBlockquote(blockquote) {
  const [firstBlock] = blockquote.children ?? [];
  return firstBlock?.type === 'paragraph' ? firstBlock.children ?? [] : blockquote.children ?? [];
}

/** The blockquote, rebuilt as a paragraph carrying the pull-line class. */
export function buildPullQuoteNode(blockquote) {
  return elementNode('aboutPullQuote', 'p', PULL_CLASS, inlineChildrenOfBlockquote(blockquote));
}

/** The first paragraph, rebuilt carrying the drop-cap class, its own children untouched. */
export function buildDropParagraphNode(paragraph) {
  return elementNode('aboutDropParagraph', 'p', DROP_CLASS, paragraph.children ?? []);
}

function applyProseSplit(children, ctx) {
  const breakIndex = findThematicBreakIndex(children);
  const firstNode = children[0];
  const lastNode = children[children.length - 1];

  if (breakIndex === -1) {
    ctx.insertBefore(firstNode, openProsePart());
    ctx.insertAfter(lastNode, closeProsePart());
    return;
  }

  const breakNode = children[breakIndex];
  ctx.insertBefore(firstNode, openProsePart());
  ctx.insertBefore(breakNode, closeProsePart());
  ctx.insertAfter(breakNode, openProsePart());
  ctx.removeNode(breakNode);
  ctx.insertAfter(lastNode, closeProsePart());
}

function applyPullLine(children, ctx) {
  const blockquote = findSingleBlockquote(children);
  if (!blockquote) return;
  ctx.replaceNode(blockquote, buildPullQuoteNode(blockquote));
}

function applyDropParagraph(children, ctx) {
  if (!isFirstBlockAParagraph(children)) return;
  const [firstParagraph] = children;
  ctx.replaceNode(firstParagraph, buildDropParagraphNode(firstParagraph));
}

/**
 * Runs once per document, after the body is parsed. Scoped to the About page alone —
 * every other page type has no thematic break and no blockquote, which makes the three
 * rules below no-ops there, but the guard is stated rather than relied upon.
 */
export function createAboutBodyPlugin() {
  return {
    name: 'about-body',
    after(root, ctx) {
      if (ctx.data.astro.frontmatter.type !== PAGE_FRONTMATTER_TYPE) return;
      const children = root.children ?? [];
      if (children.length === 0) return;

      applyProseSplit(children, ctx);
      applyPullLine(children, ctx);
      applyDropParagraph(children, ctx);
    },
  };
}
