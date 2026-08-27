import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import { satteri } from '@astrojs/markdown-satteri';
import { createDiagramDirectivePlugin } from './lib/content/diagrams/diagram-directive.mjs';
import { createHeadingIdsPlugin } from './lib/content/articles/toc.mjs';
import { createArticleSectionsPlugin } from './lib/content/articles/article-sections.mjs';
import { createAboutBodyPlugin } from './lib/content/pages/about-body.mjs';
import { collectInputs, fingerprintOf, staleCacheDirs } from './lib/build/pipeline-fingerprint.mjs';

// The markdown pipeline's output is cached, and the cache keys on the MARKDOWN — so a
// change to a plugin below does not invalidate it and the build reuses HTML produced by
// the previous version of this code. Measured, not assumed: with the caption plugin
// deliberately neutered, a warm build emitted zero defects and a cold build emitted ten.
//
// So the cache is keyed on the pipeline's own inputs as well. A plugin change lands on a
// fresh directory by construction; nothing is cleared, so an unchanged pipeline still
// builds warm.
const pipelineInputs = [
  ...collectInputs(fileURLToPath(new URL('./lib', import.meta.url))).map((input) => ({
    ...input,
    path: `lib/${input.path}`,
  })),
  { path: 'astro.config.mjs', content: readFileSync(fileURLToPath(import.meta.url), 'utf8') },
  // The lockfile too: a plugin's own code is a pipeline input, and a version bump
  // changes what the pipeline does without touching a line of this package's source.
  { path: 'package-lock.json', content: readFileSync(fileURLToPath(new URL('./package-lock.json', import.meta.url)), 'utf8') },
];
const pipelineKey = fingerprintOf(pipelineInputs);

const modulesDir = fileURLToPath(new URL('./node_modules', import.meta.url));
const cacheDirFor = (prefix) => `./node_modules/${prefix}${pipelineKey}`;

// Garbage collection, never invalidation: a key whose directory is missing builds slow
// once, never wrong. Best-effort on purpose — a failure here must not fail a build.
try {
  for (const stale of staleCacheDirs(readdirSync(modulesDir), {
    prefixes: ['.astro-', '.vite-'],
    keep: pipelineKey,
  })) {
    rmSync(`${modulesDir}/${stale}`, { recursive: true, force: true });
  }
} catch {
  // nothing to prune, or the directory is busy; the next build tries again
}

// compat maps React imports onto Preact, so an island is written as plain React.
export default defineConfig({
  output: 'static',
  cacheDir: cacheDirFor('.astro-'),
  vite: { cacheDir: cacheDirFor('.vite-') },
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
        createAboutBodyPlugin(),
      ],
    }),
  },
});
