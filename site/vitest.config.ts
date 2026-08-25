/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// The component tier. It exists for one reason the other two test tiers cannot serve: code
// that needs a DOM. The core's runner does not provide one, and driving a whole browser is
// the wrong instrument for a module that only wants document and localStorage.
//
// getViteConfig rather than a bare defineConfig, because it hands Vitest the project's
// resolved Vite config — so a test imports what the site imports, not a parallel graph.
export default getViteConfig({
  test: {
    // jsdom, not the default node environment: without a DOM every module in this tier
    // throws on its first document reference and the tier tests nothing.
    environment: 'jsdom',

    // EXPLICIT and DISJOINT from the core runner's scope. Node auto-discovers
    // **/*.test.{cjs,mjs,js} and Vitest defaults to **/*.{test,spec}.?(c|m)[jt]s?(x) — the
    // two overlap, and the extension alone cannot separate them. So the boundary is the
    // SUFFIX: .component.test.ts belongs to this runner, .test.mjs to the other one.
    // Nothing here is discovered.
    include: ['lib/**/*.component.test.ts'],

    // passWithNoTests is deliberately NOT set. A run that finds nothing must fail loudly:
    // with it on, renaming the suffix above would make every test in this tier vanish and
    // the suite stay green forever. The empty case is handled where it is visible — the
    // gate step skips itself with a stated reason — instead of by a silent pass here.
  },
});
