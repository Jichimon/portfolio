import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// Static output, no adapter (ADR-001, ADR-004). Preact is registered with compat
// enabled because the next slice (SKEL-004) needs it present.
export default defineConfig({
  output: 'static',
  integrations: [preact({ compat: true })],
});
