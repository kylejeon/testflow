// Auto-export index for vs-matrix data.
//
// New matchup: drop a `src/data/vs-matrix/<a>-vs-<b>.ts` file that
// `export default`s a `VsMatrixData` value (with `a` and `b` slugs in
// alphabetical order). It is picked up automatically by `import.meta.glob`
// (Vite client bundle only).
//
// IMPORTANT: This module is for the Vite client bundle. Node scripts
// (prerender, sitemap generator) must scan the filesystem directly.
//
// Mirrors the pattern in src/data/competitors/index.ts.

import type { VsMatrixData } from '../competitors/types';

const modules = import.meta.glob<{ default?: VsMatrixData }>('./*.ts', {
  eager: true,
});

const entries: Array<[string, VsMatrixData]> = [];
for (const [path, mod] of Object.entries(modules)) {
  if (path.endsWith('/index.ts')) continue;
  const data = mod?.default;
  if (!data || typeof data !== 'object' || typeof data.slug !== 'string') continue;
  entries.push([data.slug, data]);
}

export const VS_MATRIX: Record<string, VsMatrixData> = Object.fromEntries(entries);

export const VS_MATRIX_SLUGS: string[] = Object.keys(VS_MATRIX).sort();

export type { VsMatrixData } from '../competitors/types';
