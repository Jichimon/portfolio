// SKEL-006 spike — throwaway. Proves (or disproves) that a glob loader's `base`
// can point outside the project root, at ../resources/site. No schema, no
// validation — just the loader. Removed once the result is recorded.
import { defineCollection, getCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const spike = defineCollection({
  loader: glob({ pattern: '*.en.md', base: '../resources/site' }),
});

export const collections = { spike };

// S-02: only the gateway imports astro:content. This file is part of the gateway
// by construction (Astro requires the collection definition here), so the spike
// route calls this helper instead of importing astro:content directly.
export const getSpikeEntries = () => getCollection('spike');
