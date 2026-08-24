import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// compat maps React imports onto Preact, so an island is written as plain React.
export default defineConfig({
  output: 'static',
  integrations: [preact({ compat: true })],
});
