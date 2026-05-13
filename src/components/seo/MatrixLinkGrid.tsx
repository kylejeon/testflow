/**
 * MatrixLinkGrid — Cross-comparison link grid for the /compare index page.
 *
 * Design spec §1.4.3 + §2.3:
 *   - 15 vs-matrix tiles linking to /compare/{a}-vs-{b}
 *   - Layout: 1-col (sm) → 2-col (md) → 3-col (lg)
 *   - Each tile shows aName, "vs", bName with a chevron arrow
 */

import { Link } from 'react-router-dom';

export interface MatrixLink {
  /** Already-canonicalized slug like "practitest-vs-testrail" (alphabetical). */
  slug: string;
  /** Display name for the alphabetically-first competitor. */
  aName: string;
  /** Display name for the alphabetically-second competitor. */
  bName: string;
}

export interface MatrixLinkGridProps {
  matchups: MatrixLink[];
}

export default function MatrixLinkGrid({ matchups }: MatrixLinkGridProps) {
  if (!matchups || matchups.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {matchups.map((m) => (
        <Link
          key={m.slug}
          to={`/compare/${m.slug}`}
          className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-indigo-200 hover:shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <span>{m.aName}</span>
            <span className="text-xs text-gray-400">vs</span>
            <span>{m.bName}</span>
          </span>
          <i className="ri-arrow-right-s-line text-indigo-500 text-base" aria-hidden="true"></i>
        </Link>
      ))}
    </div>
  );
}
