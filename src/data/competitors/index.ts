// Auto-export index for competitor data.
//
// New competitor: drop a `src/data/competitors/<slug>.ts` file that
// `export default`s a `CompetitorData` value. It is picked up automatically
// by `import.meta.glob` (Vite client bundle only).
//
// IMPORTANT: This module is for the Vite client bundle. Node scripts
// (prerender, sitemap generator) must scan the filesystem directly —
// see M5 for `scripts/seo-routes-scanner.mjs`.

import type { CompetitorData } from './types';

const modules = import.meta.glob<{ default: CompetitorData }>('./*.ts', {
  eager: true,
  import: 'default',
});

// Filter out non-data modules (types.ts, index.ts) and any module whose
// default export does not look like a CompetitorData (e.g., utility files).
const entries: Array<[string, CompetitorData]> = [];
for (const [path, mod] of Object.entries(modules)) {
  if (path.endsWith('/index.ts') || path.endsWith('/types.ts')) continue;
  // import: 'default' makes `mod` the value itself (or undefined for files
  // that lack a default export). Skip files that don't expose one.
  const data = mod as unknown as CompetitorData | undefined;
  if (!data || typeof data !== 'object' || typeof data.slug !== 'string') continue;
  entries.push([data.slug, data]);
}

export const COMPETITORS: Record<string, CompetitorData> = Object.fromEntries(entries);

export const COMPETITOR_SLUGS: string[] = Object.keys(COMPETITORS).sort();

export type { CompetitorData } from './types';
