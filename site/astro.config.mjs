import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import { satteri } from '@astrojs/markdown-satteri';
import { createDiagramDirectivePlugin } from './lib/content/diagrams/diagram-directive.mjs';
import { createHeadingIdsPlugin } from './lib/content/articles/toc.mjs';
import { createArticleSectionsPlugin } from './lib/content/articles/article-sections.mjs';

// compat maps React imports onto Preact, so an island is written as plain React.
export default defineConfig({
  output: 'static',
  integrations: [preact({ compat: true })],
  markdown: {
    // The article pipeline is declared once, here, and never per component or per
    // article. `directive` turns on the `:::name{...}` block syntax the diagram tags
    // are written in. Every plugin below transforms an already-parsed document and
    // none of them parses anything itself, which is what keeps the parsing decisions
    // in the core where the unit tests and the mutation runner can reach them.
    processor: satteri({
      features: { directive: true },
      // The heading-id plugin is registered as a FACTORY, not as an instance: it
      // remembers which ids it has handed out so a repeated heading gets a suffix,
      // and one shared instance would carry the first article's ids into the second
      // — every later article's `Context` would come out as `context-2`. A factory is
      // called once per document, which is the scope that memory belongs to.
      mdastPlugins: [
        createDiagramDirectivePlugin(),
        () => createHeadingIdsPlugin(),
        createArticleSectionsPlugin(),
      ],
    }),
  },
});
