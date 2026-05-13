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

// Eager glob without `import: 'default'` — Rollup statically resolves the
// glob and the previous `import: 'default'` form bailed on `types.ts`
// (which has no default export). With the module-wrapper form we just
// optional-chain through `.default` and skip non-data files at runtime.
const modules = import.meta.glob<{ default?: CompetitorData }>('./*.ts', {
  eager: true,
});

const entries: Array<[string, CompetitorData]> = [];
for (const [path, mod] of Object.entries(modules)) {
  if (path.endsWith('/index.ts') || path.endsWith('/types.ts')) continue;
  const data = mod?.default;
  if (!data || typeof data !== 'object' || typeof data.slug !== 'string') continue;
  entries.push([data.slug, data]);
}

export const COMPETITORS: Record<string, CompetitorData> = Object.fromEntries(entries);

export const COMPETITOR_SLUGS: string[] = Object.keys(COMPETITORS).sort();

export type { CompetitorData } from './types';
