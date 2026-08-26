const SPEC_LINE_PATTERN = /^Spec:/;

export function extractDiagramCaption(body) {
  const lines = body.split('\n');
  const specLineIndex = lines.findIndex((line) => SPEC_LINE_PATTERN.test(line));
  const captionLines = specLineIndex === -1 ? lines : lines.slice(0, specLineIndex);
  return captionLines.join(' ').trim();
}

const DIAGRAM_DIRECTIVE_NAME = 'diagram';

export function createDiagramDirectivePlugin() {
  return {
    name: 'diagram-directive',
    containerDirective(node, ctx) {
      if (node.name !== DIAGRAM_DIRECTIVE_NAME) {
        return;
      }
      const { id, type } = node.attributes;
      const caption = extractDiagramCaption(ctx.textContent(node));

      const children = [
        {
          type: 'diagramImage',
          data: { hName: 'img', hProperties: { src: `/diagrams/${id}.svg`, alt: caption } },
          children: [],
        },
      ];

      if (caption) {
        children.push({
          type: 'diagramCaption',
          data: { hName: 'figcaption' },
          children: [{ type: 'text', value: caption }],
        });
      }

      ctx.replaceNode(node, {
        type: 'diagramFigure',
        data: { hName: 'figure', hProperties: { className: ['article-figure'], 'data-diagram-type': type } },
        children,
      });
    },
  };
}
