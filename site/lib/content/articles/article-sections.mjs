import { extractDeepDives } from '../entries/deep-dives.mjs';

// The article body's own structure: which of its sections get a treatment other than
// prose, and where each one starts and ends. Every rule here is positional or
// structural and none of them reads a heading's text — the two locales write different
// headings for the same section, so a text-keyed rule would style the English page and
// silently miss the Spanish one.

const SECTION_HEADING_DEPTH = 2;

// An em dash, optionally preceded by the space markdown leaves after the bold run.
const DEFINITION_SEPARATOR_PATTERN = /^\s*—\s*/;

function isSectionHeading(node) {
  return node?.type === 'heading' && node.depth === SECTION_HEADING_DEPTH;
}

function inlineChildrenOfListItem(item) {
  if (item?.type !== 'listItem') return null;
  const [firstBlock] = item.children ?? [];
  if (firstBlock?.type !== 'paragraph') return null;
  return firstBlock.children ?? [];
}

/**
 * A list is a definition list when EVERY one of its items opens with a bold run
 * followed by an em dash. That property is locale-independent and checkable, which
 * the alternatives — a heading text, or a position in the body — are not. A list where
 * only some items match is left alone: half a grid is worse than a plain list.
 */
export function isBoldLeadDefinitionList(listNode) {
  const items = listNode?.children ?? [];
  if (items.length === 0) return false;
  return items.every((item) => {
    const inline = inlineChildrenOfListItem(item);
    if (!inline || inline.length < 2) return false;
    const [lead, afterLead] = inline;
    return (
      lead?.type === 'strong' && afterLead?.type === 'text' && DEFINITION_SEPARATOR_PATTERN.test(afterLead.value ?? '')
    );
  });
}

/** Index of the heading that opens the body's last section, or -1 when it has none. */
export function findLastSectionStart(children) {
  for (let index = children.length - 1; index >= 0; index -= 1) {
    if (isSectionHeading(children[index])) return index;
  }
  return -1;
}

function withSeparatorDropped(inlineChildren) {
  const [first, ...rest] = inlineChildren;
  if (first?.type !== 'text') return inlineChildren;
  return [{ ...first, value: first.value.replace(DEFINITION_SEPARATOR_PATTERN, '') }, ...rest];
}

function elementNode(type, hName, className, children) {
  return { type, data: { hName, hProperties: { className: [className] } }, children };
}

/**
 * The definition list, rebuilt as the grid the platform artboard draws: a name over a
 * description rather than a bullet with a dash in the middle. The inline children are
 * carried across untouched apart from the separator, so emphasis and links inside a
 * description survive.
 */
export function buildServicesGridNode(listNode) {
  const items = listNode.children.map((item) => {
    const inline = inlineChildrenOfListItem(item);
    const [lead, ...afterLead] = inline;
    return elementNode('serviceGridItem', 'div', 'service-grid__item', [
      elementNode('serviceGridName', 'div', 'service-grid__name', lead.children),
      elementNode('serviceGridDescription', 'div', 'service-grid__description', withSeparatorDropped(afterLead)),
    ]);
  });
  return elementNode('serviceGrid', 'div', 'service-grid', items);
}

const PLATFORM_TYPE = 'platform';
const CRITIQUE_BLOCK_OPEN = '<div class="article-critique">';
const CRITIQUE_BLOCK_CLOSE = '</div>';

// Raw HTML rather than a wrapper node, because the block has to surround a RANGE of
// siblings — a heading and everything after it — and a wrapper can only take one node.
const rawHtml = (value) => ({ raw: value, mdxExpressions: false });

/**
 * Runs once per document, after the body is parsed, and does the three structural
 * things in the one order that works:
 *
 *   1. lift the deep-dives section out, so it is not rendered twice — once as the grid
 *      the template builds from these slugs, and once as the plain list underneath;
 *   2. rebuild a platform's definition list as the services grid;
 *   3. wrap what is now the last section, which is the self-critique on both types and
 *      both locales precisely BECAUSE step 1 already removed what used to follow it.
 *
 * Reversing 1 and 3 wraps the deep dives instead, which is why the order is stated
 * here rather than left to be inferred from the sequence of calls.
 */
export function createArticleSectionsPlugin() {
  return {
    name: 'article-sections',
    after(root, ctx) {
      const { slugs, body } = extractDeepDives(root.children);
      ctx.data.astro.frontmatter.deepDiveSlugs = slugs;

      for (const node of root.children) {
        if (!body.includes(node)) ctx.removeNode(node);
      }

      if (ctx.data.astro.frontmatter.type === PLATFORM_TYPE) {
        for (const node of body) {
          if (node.type === 'list' && isBoldLeadDefinitionList(node)) {
            ctx.replaceNode(node, buildServicesGridNode(node));
          }
        }
      }

      const lastSectionStart = findLastSectionStart(body);
      if (lastSectionStart === -1) return;
      ctx.insertBefore(body[lastSectionStart], rawHtml(CRITIQUE_BLOCK_OPEN));
      ctx.insertAfter(body[body.length - 1], rawHtml(CRITIQUE_BLOCK_CLOSE));
    },
  };
}
